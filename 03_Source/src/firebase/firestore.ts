/**
 * DESTINATION EARTH — Firestore 게임 데이터 서비스
 * 플레이어 세이브, 클라우드 동기화 (GDD v6.0 §22.2)
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore';
import { db } from './config';
import type { GameState } from '../store/gameStore';

// ─── Firestore 컬렉션 경로 ───────────────────────────────────────────────
const USERS_COL = 'users';
const GAME_STATES_COL = 'gameStates';
const LEADERBOARD_COL = 'leaderboard';

// ─── 유저 프로필 저장 ─────────────────────────────────────────────────────
export async function saveUserProfile(
  userId: string,
  profile: {
    displayName: string;
    gender: 'male' | 'female';
    companyName: string;
    shipName: string;
    isMinor: boolean;
  }
): Promise<void> {
  const userRef = doc(db, USERS_COL, userId);
  await setDoc(
    userRef,
    {
      ...profile,
      monthlySpend: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

// ─── 유저 프로필 조회 ─────────────────────────────────────────────────────
export async function getUserProfile(userId: string) {
  const userRef = doc(db, USERS_COL, userId);
  const snap = await getDoc(userRef);
  return snap.exists() ? snap.data() : null;
}

// ─── 게임 상태 저장 (AES-GCM 암호화 적용 예정) ──────────────────────────
export async function saveGameState(
  userId: string,
  state: Partial<GameState>
): Promise<void> {
  const stateRef = doc(db, GAME_STATES_COL, userId);

  // 저장 버전 증가 및 타임스탬프 추가
  const saveData = {
    ...state,
    saveVersion: (state.saveVersion || 0) + 1,
    updatedAt: serverTimestamp(),
  };

  await setDoc(stateRef, saveData, { merge: true });
}

// ─── 게임 상태 로드 ───────────────────────────────────────────────────────
export async function loadGameState(userId: string): Promise<GameState | null> {
  const stateRef = doc(db, GAME_STATES_COL, userId);
  const snap = await getDoc(stateRef);
  return snap.exists() ? (snap.data() as GameState) : null;
}

// ─── 리더보드 조회 ────────────────────────────────────────────────────────
export async function getLeaderboard(season: string, topN: number = 100) {
  const col = collection(db, LEADERBOARD_COL, season, 'scores');
  const q = query(col, orderBy('score', 'desc'), limit(topN));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── 월 지출 업데이트 (미성년자 한도 체크용) ──────────────────────────────
export async function updateMonthlySpend(
  userId: string,
  amount: number
): Promise<{ allowed: boolean; totalSpend: number }> {
  const userRef = doc(db, USERS_COL, userId);
  const snap = await getDoc(userRef);

  if (!snap.exists()) return { allowed: false, totalSpend: 0 };

  const data = snap.data();
  const isMinor: boolean = data.isMinor || false;
  const currentSpend: number = data.monthlySpend || 0;
  const MINOR_MONTHLY_CAP = 70000; // GDD §21.1 — 70,000원

  if (isMinor && currentSpend + amount > MINOR_MONTHLY_CAP) {
    return { allowed: false, totalSpend: currentSpend };
  }

  await updateDoc(userRef, {
    monthlySpend: currentSpend + amount,
    updatedAt: serverTimestamp(),
  });

  return { allowed: true, totalSpend: currentSpend + amount };
}

// ─── 로컬 백업 (오프라인 대비) ────────────────────────────────────────────
const SAVE_KEY = 'de_save_v1';

export function saveToLocal(state: Partial<GameState>): void {
  try {
    const json = JSON.stringify(state);
    // TODO: AES-GCM 256bit 암호화 적용
    localStorage.setItem(SAVE_KEY, json);
  } catch (e) {
    console.error('로컬 저장 실패:', e);
  }
}

export function loadFromLocal(): Partial<GameState> | null {
  try {
    const json = localStorage.getItem(SAVE_KEY);
    if (!json) return null;
    // TODO: AES-GCM 256bit 복호화 적용
    return JSON.parse(json) as Partial<GameState>;
  } catch (e) {
    console.error('로컬 로드 실패:', e);
    return null;
  }
}

// ─── 충돌 해결 (Server-wins 정책) ───────────────────────────────────────
export async function mergeWithServerState(
  userId: string,
  localState: Partial<GameState>
): Promise<GameState | null> {
  const serverState = await loadGameState(userId);

  if (!serverState) {
    // 서버에 없으면 로컬 상태로 서버 초기화
    await saveGameState(userId, localState);
    return localState as GameState;
  }

  // Server-wins: 서버 버전이 더 높으면 서버 상태 우선
  const serverVersion = serverState.saveVersion || 0;
  const localVersion = (localState.saveVersion || 0);

  if (serverVersion >= localVersion) {
    return serverState; // 서버 상태 사용
  }

  // 로컬이 더 최신이면 서버에 업로드
  await saveGameState(userId, localState);
  return localState as GameState;
}
