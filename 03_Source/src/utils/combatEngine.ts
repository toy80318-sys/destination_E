/**
 * DESTINATION EARTH — Combat Engine
 * 16v16 턴제 전투 공식 구현 (GDD v6.0 §15)
 */

export interface CombatUnit {
  id: string;
  name: string;
  isPlayer: boolean;
  stats: {
    DEX: number;
    INT: number;
    TEC: number;
    HP: number;
    LOY: number;
  };
  currentHP: number;
  currentINT: number; // 실드
  weapons: ComponentStats[];
  armors: ComponentStats[];
  shields: ComponentStats[];
  captain?: CrewStats;
  faction?: string;
}

export interface ComponentStats {
  id: string;
  category: 'weapon' | 'shield' | 'armor' | 'engine' | 'utility';
  statValue: number;
  tier: number;
  adjacentBonus?: number;
  criticalBonus?: number;
}

export interface CrewStats {
  id: string;
  class: 'Pilot' | 'Engineer' | 'Merchant';
  DEX: number;
  INT: number;
  TEC: number;
  HP: number;
  LOY: number;
}

export interface CombatResult {
  winner: 'player' | 'enemy' | 'draw';
  turnsElapsed: number;
  capturedUnits: string[];
  creditsEarned: number;
  assetsLost: boolean; // 전멸 여부
  log: CombatLogEntry[];
}

export interface CombatLogEntry {
  turn: number;
  attacker: string;
  target: string;
  damage: number;
  isCritical: boolean;
  isCapture?: boolean;
  message: string;
}

// ─── 턴 우선순위 계산 (GDD §15.2) ────────────────────────────────────────
export function calculateTurnPriority(unit: CombatUnit): number {
  const captainTECBonus = unit.captain ? unit.captain.TEC * 0.1 : 0;
  const randomFactor = Math.random() * 0.05;
  return unit.stats.TEC * (1 + randomFactor) + captainTECBonus;
}

// ─── 명중/회피 판정 (GDD §15.2) ─────────────────────────────────────────
export function calculateHitChance(
  attackerDEX: number,
  defenderTEC: number
): number {
  return Math.max(5, Math.min(100, 85 + (attackerDEX - defenderTEC) * 0.5));
}

// ─── 치명타 확률 (GDD §15.2) ────────────────────────────────────────────
export function calculateCriticalChance(
  attackerDEX: number,
  defenderTEC: number,
  weaponCritBonus: number = 0,
  isKriegFaction: boolean = false
): number {
  const base = Math.max(
    1,
    Math.min(50, 5 + (attackerDEX - defenderTEC) * 0.2 + weaponCritBonus)
  );
  return base;
}

// ─── 최종 피해 계산 (GDD §15.2) ─────────────────────────────────────────
export function calculateFinalDamage(
  rawDEXDamage: number,
  isCritical: boolean,
  isKriegFaction: boolean,
  armorFlatReduction: number,
  armorEfficiencyReduction: number
): number {
  let critMultiplier = 1.0;
  if (isCritical) {
    critMultiplier = isKriegFaction ? 1.8 : 1.5; // GDD §15.2 크리그 패시브
  }

  const damage =
    (rawDEXDamage * critMultiplier - armorFlatReduction) *
    (1 - armorEfficiencyReduction);

  return Math.max(1, Math.floor(damage)); // 최소 피해 1 보장
}

// ─── 나포 확률 계산 (GDD §15.3) ─────────────────────────────────────────
export function calculateCaptureChance(
  commanderLOY: number,
  attackerDEX: number,
  targetCurrentHP: number,
  captureDroneLevel: 0 | 1 | 2 = 0
): number {
  const droneBonus = captureDroneLevel === 2 ? 15 : 0;
  const chance =
    (commanderLOY / 100) *
      (30 + (attackerDEX - targetCurrentHP) * 0.3) +
    droneBonus;
  return Math.max(0, Math.min(95, chance));
}

// ─── 나포 가능 여부 체크 (GDD §15.3) ────────────────────────────────────
export function canCapture(target: CombatUnit): boolean {
  return target.currentINT === 0 && target.currentHP <= target.stats.HP * 0.3;
}

// ─── 인접 시너지 (Grid Link — GDD §14.1) ─────────────────────────────────
export function calculateGridLinkBonus(
  unit: CombatUnit,
  isMechanicaFaction: boolean
): { dexBonus: number; armorBonus: number } {
  // 무기(W) 인접 시 DEX +15%
  const weaponCount = unit.weapons.length;
  let dexBonus = weaponCount >= 2 ? 0.15 : 0;

  // 장갑(A) 3개 덩어리 시 방어 감쇄 1.2배
  const armorCount = unit.armors.length;
  let armorBonus = armorCount >= 3 ? 1.2 : 1.0;

  // 메카니카 패시브: +15% 복리 오버클럭
  if (isMechanicaFaction) {
    dexBonus = dexBonus > 0 ? dexBonus * 1.15 : dexBonus;
    armorBonus = armorBonus > 1 ? armorBonus * 1.15 : armorBonus;
  }

  return { dexBonus, armorBonus };
}

// ─── 턴 오더 정렬 (TEC 기반) ─────────────────────────────────────────────
export function sortByTurnOrder(
  allUnits: CombatUnit[]
): Array<{ unit: CombatUnit; priority: number }> {
  return allUnits
    .filter((u) => u.currentHP > 0)
    .map((unit) => ({ unit, priority: calculateTurnPriority(unit) }))
    .sort((a, b) => b.priority - a.priority);
}

// ─── 전투 한 턴 실행 ─────────────────────────────────────────────────────
export function executeTurn(
  attacker: CombatUnit,
  target: CombatUnit,
  turn: number,
  commanderLOY: number
): CombatLogEntry {
  // 명중 판정
  const hitChance = calculateHitChance(attacker.stats.DEX, target.stats.TEC);
  const hitRoll = Math.random() * 100;

  if (hitRoll > hitChance) {
    return {
      turn,
      attacker: attacker.name,
      target: target.name,
      damage: 0,
      isCritical: false,
      message: `${attacker.name} → ${target.name}: 빗나감 (명중률 ${hitChance.toFixed(1)}%)`,
    };
  }

  // 치명타 판정
  const critChance = calculateCriticalChance(
    attacker.stats.DEX,
    target.stats.TEC,
    attacker.weapons.reduce((sum, w) => sum + (w.criticalBonus || 0), 0),
    attacker.faction === 'F04'
  );
  const isCritical = Math.random() * 100 < critChance;

  // 기본 DEX 대미지 (무기 스탯 합산)
  const weaponDEX = attacker.weapons.reduce(
    (sum, w) => sum + w.statValue,
    attacker.stats.DEX
  );

  // 인접 시너지 적용
  const { dexBonus } = calculateGridLinkBonus(
    attacker,
    attacker.faction === 'F03'
  );
  const rawDamage = weaponDEX * (1 + dexBonus);

  // 장갑 감쇄 계산
  const armorFlat = target.armors.reduce((sum, a) => sum + a.statValue * 0.1, 0);
  const armorEff = Math.min(0.8, target.armors.length * 0.05);
  const { armorBonus } = calculateGridLinkBonus(
    target,
    target.faction === 'F03'
  );

  const finalDamage = calculateFinalDamage(
    rawDamage,
    isCritical,
    attacker.faction === 'F04',
    armorFlat / armorBonus,
    armorEff
  );

  // 실드 우선 피해 처리
  let actualDamage = finalDamage;
  if (target.currentINT > 0) {
    if (target.currentINT >= finalDamage) {
      target.currentINT -= finalDamage;
      actualDamage = 0;
    } else {
      actualDamage = finalDamage - target.currentINT;
      target.currentINT = 0;
    }
  }

  target.currentHP = Math.max(0, target.currentHP - actualDamage);

  // 나포 시도
  let isCapture = false;
  if (canCapture(target)) {
    const captureChance = calculateCaptureChance(
      commanderLOY,
      attacker.stats.DEX,
      target.currentHP
    );
    isCapture = Math.random() * 100 < captureChance;
    if (isCapture) {
      target.currentHP = 0; // 나포 완료 처리
    }
  }

  const msg = isCapture
    ? `✅ ${attacker.name} → ${target.name}: 나포 성공!`
    : isCritical
    ? `💥 ${attacker.name} → ${target.name}: 치명타 ${finalDamage} 피해 (현재 HP: ${target.currentHP})`
    : `⚔️ ${attacker.name} → ${target.name}: ${finalDamage} 피해 (HP: ${target.currentHP})`;

  return {
    turn,
    attacker: attacker.name,
    target: target.name,
    damage: finalDamage,
    isCritical,
    isCapture,
    message: msg,
  };
}

// ─── 전멸 패널티 계산 (GDD §15.4) ───────────────────────────────────────
export function calculateWipeoutPenalty(
  currentCredits: number,
  hasEinsteinAlive: boolean
): { creditsLost: number; assetsLost: boolean } {
  if (hasEinsteinAlive) {
    // 방주 프로토콜: 아인슈타인 생존 시 자산 손실 0%
    return { creditsLost: 0, assetsLost: false };
  }

  // 기본 전멸 패널티: 크레딧 50% 손실
  const creditsLost = Math.floor(currentCredits * 0.5);
  return { creditsLost, assetsLost: true };
}
