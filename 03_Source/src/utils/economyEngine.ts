/**
 * DESTINATION EARTH — Economy Engine
 * 무역·부동산·가차 경제 시스템 (GDD v6.0 §16)
 */

import { calculateTradeMargin } from './galaxyGenerator';

// ─── 세금 정산 (GDD §16.3) ─────────────────────────────────────────────
export function calculateTaxIncome(
  baseTax: number,
  commerceLevel: number, // 0~10
  governorLOY: number    // 0~100
): number {
  const income =
    baseTax *
    (1 + commerceLevel * 0.15) *
    (1 + governorLOY / 100);
  return Math.floor(income);
}

// ─── 인프라 업그레이드 비용 (GDD §16.3 지수 함수) ────────────────────────
export function calculateBuildCost(
  baseTierCost: number,
  level: number,
  actNumber: number // 1~3
): number {
  const cost =
    baseTierCost * Math.pow(2.15, level - 1) * (1 + actNumber / 2);
  return Math.floor(cost);
}

/*
 * 레벨별 비용 (baseTierCost=10,000 기준, ACT 1):
 * Lv1: 10,000₡  / Lv5: 213,800₡ / Lv8: 2,126,000₡ / Lv10: 32,000,000₡
 */

// ─── 가차 리롤 비용 (GDD §16.4) ─────────────────────────────────────────
export function calculateGachaRerollCost(rerollCount: number): number {
  return Math.floor(1000 * Math.pow(1.2, rerollCount));
}

// ─── 무역 수익 계산 ──────────────────────────────────────────────────────
export function calculateTradeProfit(
  commodity: Commodity,
  buyPlanet: PlanetRef,
  sellPlanet: PlanetRef,
  quantity: number
): TradeResult {
  const margin = calculateTradeMargin(
    buyPlanet.ring,
    buyPlanet.angle,
    sellPlanet.ring,
    sellPlanet.angle
  );

  const sellPrice = Math.min(
    Math.floor(commodity.baseBuyPrice * margin),
    commodity.maxSellPrice
  );

  const totalCost = commodity.baseBuyPrice * quantity;
  const totalRevenue = sellPrice * quantity;
  const profit = totalRevenue - totalCost;

  return {
    buyPrice: commodity.baseBuyPrice,
    sellPrice,
    margin,
    totalCost,
    totalRevenue,
    profit,
    quantity,
  };
}

// ─── 경매 입찰 검증 (GDD §16.3) ─────────────────────────────────────────
export function validateAuctionBid(
  bidAmount: number,
  currentBid: number,
  playerCredits: number,
  escrowBalance: number
): AuctionBidResult {
  if (bidAmount <= currentBid) {
    return { valid: false, reason: '현재 입찰가보다 낮거나 같습니다' };
  }

  const availableCredits = playerCredits + escrowBalance;
  if (bidAmount > availableCredits) {
    return { valid: false, reason: '크레딧이 부족합니다' };
  }

  const minBidIncrement = Math.floor(currentBid * 0.05) || 1000;
  if (bidAmount < currentBid + minBidIncrement) {
    return {
      valid: false,
      reason: `최소 ${minBidIncrement.toLocaleString()}₡ 이상 올려야 합니다`,
    };
  }

  return { valid: true, escrowLock: bidAmount };
}

// ─── 스나이핑 방지 (GDD §16.3) ──────────────────────────────────────────
export function checkSniping(
  currentEndTime: Date,
  bidTime: Date,
  extensionSeconds: number = 30
): Date {
  const remainingMs = currentEndTime.getTime() - bidTime.getTime();
  const tenSecondsMs = 10 * 1000;

  if (remainingMs <= tenSecondsMs) {
    // 마감 10초 이내 입찰 → +30초 자동 연장
    return new Date(currentEndTime.getTime() + extensionSeconds * 1000);
  }

  return currentEndTime; // 연장 없음
}

// ─── 가차 등급 결정 (GDD §11.3) ─────────────────────────────────────────
export interface GachaConfig {
  Normal: number;
  Rare: number;
  Hero: number;
  Legendary: number;
}

const DEFAULT_GACHA_RATES: GachaConfig = {
  Normal: 0.700,
  Rare: 0.240,
  Hero: 0.055,
  Legendary: 0.005,
};

export function drawGachaRarity(
  pityCount: number,
  config: GachaConfig = DEFAULT_GACHA_RATES
): 'Normal' | 'Rare' | 'Hero' | 'Legendary' {
  // 80회 천장 (Pity)
  if (pityCount >= 80) return 'Legendary';

  const roll = Math.random();
  let cumulative = 0;

  if ((cumulative += config.Legendary) > roll) return 'Legendary';
  if ((cumulative += config.Hero) > roll) return 'Hero';
  if ((cumulative += config.Rare) > roll) return 'Rare';
  return 'Normal';
}

// ─── 슬롯 5 보장 (GDD §11.3) ────────────────────────────────────────────
export function isSlot5GuaranteedDraw(slotIndex: number): boolean {
  return slotIndex === 4; // 0-indexed, 5번째 슬롯
}

export function drawSlot5(pityCount: number): 'Hero' | 'Legendary' {
  // 슬롯 5는 영웅 이상 확정
  if (pityCount >= 80) return 'Legendary';
  return Math.random() < 0.1 ? 'Legendary' : 'Hero'; // 10% Legendary in slot 5
}

// ─── LOY 탈영 패널티 (GDD §12) ─────────────────────────────────────────
export function checkLoyaltyDefection(
  crew: { id: string; LOY: number; name: string }[],
  isKoreanFactionMajority: boolean,
  hasYiSunsin: boolean
): { defected: string[]; embezzled: number } {
  // 지구 저항군 시너지: 탈영 완전 무력화
  if (isKoreanFactionMajority && hasYiSunsin) {
    return { defected: [], embezzled: 0 };
  }

  const defected: string[] = [];
  let embezzled = 0;

  crew.forEach((member) => {
    if (member.LOY <= 20) {
      // LOY 20 미만: 탈영 + 자금 횡령 이벤트
      if (Math.random() < 0.3) {
        defected.push(member.id);
        embezzled += Math.floor(Math.random() * 50000 + 10000);
      }
    }
  });

  return { defected, embezzled };
}

// ─── 타입 정의 ──────────────────────────────────────────────────────────
export interface Commodity {
  id: string;
  name: string;
  baseBuyPrice: number;
  maxSellPrice: number;
  originFaction: string;
  isSellable: boolean;
}

export interface PlanetRef {
  id: string;
  ring: number;
  angle: number;
  faction: string;
}

export interface TradeResult {
  buyPrice: number;
  sellPrice: number;
  margin: number;
  totalCost: number;
  totalRevenue: number;
  profit: number;
  quantity: number;
}

export interface AuctionBidResult {
  valid: boolean;
  reason?: string;
  escrowLock?: number;
}
