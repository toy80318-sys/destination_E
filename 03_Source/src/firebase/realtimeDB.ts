/**
 * DESTINATION EARTH — Firebase Realtime DB (경매 시스템)
 * 실시간 경매 입찰, 스나이핑 방지, 에스크로 관리 (GDD v6.0 §16.3, §22)
 */

import {
  ref,
  set,
  get,
  update,
  onValue,
  off,
  serverTimestamp,
  runTransaction,
} from 'firebase/database';
import { rtdb } from './config';
import { validateAuctionBid, checkSniping } from '../utils/economyEngine';

// ─── 경매 데이터 타입 ─────────────────────────────────────────────────────
export interface AuctionData {
  planetId: string;
  planetName: string;
  currentBid: number;
  currentBidder: string;
  currentBidderName: string;
  endTime: number; // Unix timestamp (ms)
  escrowMap: Record<string, number>; // userId: 에스크로 금액
  isActive: boolean;
  startBid: number;
}

export interface BidResult {
  success: boolean;
  message: string;
  newEndTime?: number;
  newBid?: number;
}

// ─── 경매 구독 (실시간 리스너) ───────────────────────────────────────────
export function subscribeToAuction(
  planetId: string,
  callback: (data: AuctionData | null) => void
): () => void {
  const auctionRef = ref(rtdb, `auctions/${planetId}`);
  const unsubscribe = onValue(auctionRef, (snap) => {
    callback(snap.exists() ? (snap.val() as AuctionData) : null);
  });

  // 구독 해제 함수 반환
  return () => off(auctionRef, 'value', unsubscribe);
}

// ─── 경매 입찰 (원자적 트랜잭션) ─────────────────────────────────────────
export async function placeBid(
  planetId: string,
  userId: string,
  userName: string,
  bidAmount: number,
  playerCredits: number
): Promise<BidResult> {
  const auctionRef = ref(rtdb, `auctions/${planetId}`);

  return await runTransaction(auctionRef, (currentData: AuctionData | null) => {
    if (!currentData || !currentData.isActive) {
      return; // 트랜잭션 취소
    }

    const now = Date.now();
    if (now > currentData.endTime) {
      return; // 경매 종료
    }

    // 입찰 검증
    const escrowBalance = currentData.escrowMap?.[userId] || 0;
    const validation = validateAuctionBid(
      bidAmount,
      currentData.currentBid,
      playerCredits,
      escrowBalance
    );

    if (!validation.valid) {
      return; // 유효하지 않은 입찰
    }

    // 스나이핑 방지 (마감 10초 이내 → +30초 연장)
    const newEndTime = checkSniping(
      new Date(currentData.endTime),
      new Date(now),
      30
    ).getTime();

    // 이전 입찰자 에스크로 환불
    const newEscrowMap = { ...currentData.escrowMap };
    const previousBidder = currentData.currentBidder;
    if (previousBidder && previousBidder !== userId) {
      // 이전 입찰자 에스크로 해제 (Firestore에서 크레딧 복원은 Cloud Functions 처리)
      delete newEscrowMap[previousBidder];
    }

    // 새 입찰자 에스크로 잠금
    newEscrowMap[userId] = bidAmount;

    return {
      ...currentData,
      currentBid: bidAmount,
      currentBidder: userId,
      currentBidderName: userName,
      endTime: newEndTime,
      escrowMap: newEscrowMap,
    };
  }).then((result) => {
    if (result.committed && result.snapshot.exists()) {
      const data = result.snapshot.val() as AuctionData;
      return {
        success: true,
        message: `입찰 성공! ${bidAmount.toLocaleString()}₡`,
        newEndTime: data.endTime,
        newBid: data.currentBid,
      };
    }
    return { success: false, message: '입찰 실패 (다른 입찰자가 선점)' };
  }).catch((error) => {
    console.error('입찰 트랜잭션 오류:', error);
    return { success: false, message: '네트워크 오류' };
  });
}

// ─── 경매 생성 (Cloud Functions에서 주로 호출) ──────────────────────────
export async function createAuction(
  planetId: string,
  planetName: string,
  startBid: number,
  durationMs: number = 5 * 60 * 1000 // 기본 5분
): Promise<void> {
  const auctionRef = ref(rtdb, `auctions/${planetId}`);
  const endTime = Date.now() + durationMs;

  await set(auctionRef, {
    planetId,
    planetName,
    currentBid: startBid,
    currentBidder: '',
    currentBidderName: '',
    endTime,
    escrowMap: {},
    isActive: true,
    startBid,
    createdAt: serverTimestamp(),
  });
}

// ─── 경매 현재 상태 조회 (1회성) ─────────────────────────────────────────
export async function getAuctionData(
  planetId: string
): Promise<AuctionData | null> {
  const auctionRef = ref(rtdb, `auctions/${planetId}`);
  const snap = await get(auctionRef);
  return snap.exists() ? (snap.val() as AuctionData) : null;
}
