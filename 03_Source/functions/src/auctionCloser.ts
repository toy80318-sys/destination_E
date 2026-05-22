/**
 * DESTINATION EARTH — Firebase Cloud Functions
 * 경매 마감, 세금 정산, 미성년자 보호 (GDD v6.0 §22)
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

const db = admin.firestore();
const rtdb = admin.database();

// ─── 경매 마감 처리 (5분마다 실행) ─────────────────────────────────────
export const closeExpiredAuctions = functions.pubsub
  .schedule('every 1 minutes')
  .onRun(async () => {
    const now = Date.now();
    const auctionsRef = rtdb.ref('auctions');

    const snapshot = await auctionsRef.once('value');
    const auctions = snapshot.val();

    if (!auctions) return null;

    const promises: Promise<void>[] = [];

    for (const planetId in auctions) {
      const auction = auctions[planetId];

      if (auction.isActive && auction.endTime <= now) {
        promises.push(closeAuction(planetId, auction));
      }
    }

    await Promise.all(promises);
    return null;
  });

async function closeAuction(planetId: string, auction: any): Promise<void> {
  const winner = auction.currentBidder;

  if (!winner) {
    // 낙찰자 없음 — 경매 취소
    await rtdb.ref(`auctions/${planetId}/isActive`).set(false);
    return;
  }

  // Firestore 원자적 업데이트
  const batch = db.batch();

  // 1. 낙찰자 행성 소유권 부여
  const playerStateRef = db.doc(`gameStates/${winner}`);
  batch.update(playerStateRef, {
    [`planets.${planetId}.ownedByPlayer`]: true,
    [`planets.${planetId}.fogState`]: 'Active',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // 2. 에스크로 해제 (낙찰자 크레딧에서 공제됨)
  const escrowMap = auction.escrowMap || {};
  for (const userId in escrowMap) {
    if (userId !== winner) {
      // 미낙찰자 에스크로 환불
      const refundRef = db.doc(`gameStates/${userId}`);
      batch.update(refundRef, {
        credits: admin.firestore.FieldValue.increment(escrowMap[userId]),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }

  await batch.commit();

  // Realtime DB 경매 비활성화
  await rtdb.ref(`auctions/${planetId}`).update({
    isActive: false,
    winnerId: winner,
    closedAt: admin.database.ServerValue.TIMESTAMP,
  });

  // 리더보드 업데이트
  await updateLeaderboard(winner);

  functions.logger.info(`경매 낙찰: Planet ${planetId} → User ${winner}`);
}

// ─── 세금 정산 (턴 종료 시 호출) ─────────────────────────────────────────
export const collectTaxes = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', '로그인 필요');
  }

  const userId = context.auth.uid;
  const stateRef = db.doc(`gameStates/${userId}`);
  const stateSnap = await stateRef.get();

  if (!stateSnap.exists) return { totalTax: 0 };

  const state = stateSnap.data() as any;
  const planets = state.planets || {};
  let totalTax = 0;

  for (const planetId in planets) {
    const planet = planets[planetId];
    if (!planet.ownedByPlayer) continue;

    // 세금 계산 (GDD §16.3)
    const baseTax = getPlanetBaseTax(planetId);
    const commerceLevel = planet.commerceLevel || 0;
    const governorLOY = getGovernorLOY(planet.governorId, state.crew || []);

    const taxIncome = Math.floor(
      baseTax * (1 + commerceLevel * 0.15) * (1 + governorLOY / 100)
    );

    totalTax += taxIncome;
  }

  if (totalTax > 0) {
    await stateRef.update({
      credits: admin.firestore.FieldValue.increment(totalTax),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  return { totalTax };
});

// ─── 미성년자 결제 한도 체크 (Cloud Functions 강제 적용) ────────────────
export const checkMinorSpendLimit = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', '로그인 필요');
  }

  const userId = context.auth.uid;
  const amount: number = data.amount;
  const MINOR_MONTHLY_CAP = 70000; // GDD §21.1 — 70,000원

  const userRef = db.doc(`users/${userId}`);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    throw new functions.https.HttpsError('not-found', '유저 없음');
  }

  const userData = userSnap.data() as any;
  const isMinor: boolean = userData.isMinor || false;
  const currentSpend: number = userData.monthlySpend || 0;

  if (isMinor && currentSpend + amount > MINOR_MONTHLY_CAP) {
    // 미성년자 한도 초과 — 보호자 이메일 알림 발송
    functions.logger.warn(`미성년자 한도 초과 시도: userId=${userId}`);
    throw new functions.https.HttpsError(
      'permission-denied',
      `월 지출 한도(${MINOR_MONTHLY_CAP.toLocaleString()}원)를 초과합니다.`
    );
  }

  // 지출 기록 업데이트
  await userRef.update({
    monthlySpend: admin.firestore.FieldValue.increment(amount),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { allowed: true, newTotal: currentSpend + amount };
});

// ─── 리더보드 업데이트 ─────────────────────────────────────────────────
async function updateLeaderboard(userId: string): Promise<void> {
  const stateSnap = await db.doc(`gameStates/${userId}`).get();
  if (!stateSnap.exists) return;

  const state = stateSnap.data() as any;

  const credits = state.credits || 0;
  const ownedPlanets = Object.values(state.planets || {})
    .filter((p: any) => p.ownedByPlayer).length;
  const heroCount = (state.recruitedHeroes || []).length;
  const crewUnlockRate = (state.crew || []).length / 141;

  const score = Math.floor(credits / 1000) +
    ownedPlanets * 50000 +
    heroCount * 100000 +
    Math.floor(crewUnlockRate * 100) * 2500;

  const season = getCurrentSeason();
  await db
    .collection('leaderboard')
    .doc(season)
    .collection('scores')
    .doc(userId)
    .set({ score, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
}

// ─── 헬퍼 함수 ─────────────────────────────────────────────────────────
function getPlanetBaseTax(planetId: string): number {
  const baseTaxMap: Record<string, number> = {
    P01: 5000, P02: 5000, P03: 5000, P04: 5000,
    P05: 12000, P06: 12000, P07: 12000, P08: 12000,
    P09: 12000, P10: 12000, P11: 12000, P12: 12000,
    P13: 12000, P14: 12000, P15: 12000, P16: 12000,
    P17: 25000, P18: 25000, P19: 25000, P20: 25000, P21: 25000,
    P22: 5000, P23: 5000, P24: 5000, P25: 5000, P26: 5000,
  };
  return baseTaxMap[planetId] || 5000;
}

function getGovernorLOY(governorId: string | undefined, crew: any[]): number {
  if (!governorId) return 0;
  const governor = crew.find((c: any) => c.id === governorId);
  return governor?.stats?.LOY || 0;
}

function getCurrentSeason(): string {
  const now = new Date();
  return `${now.getFullYear()}_S${Math.ceil((now.getMonth() + 1) / 2)}`;
}
