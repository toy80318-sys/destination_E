/**
 * DESTINATION EARTH — Zustand 전역 게임 상태
 * GDD v6.0 §19 GameState Enum 기반
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { generateGalaxyMap, type GalaxyMap } from '../utils/galaxyGenerator';

// ─── GameState Enum (GDD v6.0 §19.1) ────────────────────────────────────
export enum GameStateEnum {
  TITLE            = 'TITLE',
  AGE_GATE         = 'AGE_GATE',
  FTUE_CUSTOMIZE   = 'FTUE_CUSTOMIZE',
  PROLOGUE_VIDEO   = 'PROLOGUE_VIDEO',
  STATION_HUB      = 'STATION_HUB',
  STARMAP_NAV      = 'STARMAP_NAV',
  PLANET_ARRIVAL   = 'PLANET_ARRIVAL',
  PUB_GACHA        = 'PUB_GACHA',
  AUCTION          = 'AUCTION',
  SHIPYARD         = 'SHIPYARD',
  COMBAT_SESSION   = 'COMBAT_SESSION',
  RESOLUTION_BONUS = 'RESOLUTION_BONUS',
  GAME_OVER        = 'GAME_OVER',
  ENDING           = 'ENDING',
  HALL_OF_FAME     = 'HALL_OF_FAME',
}

// ─── 타입 정의 ──────────────────────────────────────────────────────────
export interface CommanderProfile {
  name: string;
  gender: 'male' | 'female';
  companyName: string;
  shipName: string;
}

export interface Ship {
  id: string;
  name: string;
  tier: 'small' | 'medium' | 'heavy' | 'legendary';
  hp: number;
  currentHP: number;
  currentINT: number;
  components: string[];  // 컴포넌트 ID 배열
  captainId?: string;
  engineerId?: string;
}

export interface CrewMember {
  id: string;
  name: string;
  class: 'Pilot' | 'Engineer' | 'Merchant';
  rarity: 'Normal' | 'Rare' | 'Hero' | 'Legendary';
  stats: { DEX: number; INT: number; TEC: number; HP: number; LOY: number };
  faction: string;
  isHero: boolean;
  heroId?: string;
  assignedShipId?: string;
  assignedPlanetId?: string;
}

export interface Inventory {
  components: string[];    // 컴포넌트 ID 배열
  commodities: Record<string, number>; // { G01: 5, G03: 2 }
  maxCapacity: number;
}

export interface Planet {
  id: string;
  ownedByPlayer: boolean;
  commerceLevel: number; // 0~10
  governorId?: string;
  fogState: 'Locked' | 'Scouted' | 'Active';
}

export interface GameState {
  // 메타
  currentScreen: GameStateEnum;
  saveVersion: number;
  isNewGame: boolean;
  act: number; // 1~3
  turn: number;

  // 플레이어 정보
  userId: string;
  profile: CommanderProfile;
  isMinor: boolean;

  // 재화 (GDD §16.1)
  credits: number;
  voidEssence: number;
  voidCrystal: number;

  // 함선
  fleet: Ship[];
  mainFlagshipId: string;

  // 크루
  crew: CrewMember[];
  recruitedHeroes: string[]; // Hero ID 배열

  // 행성
  planets: Record<string, Planet>; // 행성 상태

  // 갤럭시 맵
  galaxyMap: GalaxyMap | null;
  currentPlanetId: string;

  // 인벤토리
  inventory: Inventory;

  // 가차 카운터 (Pity)
  gachaPityCount: number;

  // 전투 관련
  combatActive: boolean;
  combatTurn: number;

  // 명예의 전당
  hallOfFameScore: number;
  endingAchieved: 'none' | 'A' | 'B';
}

// ─── Zustand 스토어 ──────────────────────────────────────────────────────
interface GameActions {
  // 화면 전환
  setScreen: (screen: GameStateEnum) => void;

  // 게임 초기화
  initNewGame: (profile: CommanderProfile, userId: string, isMinor: boolean) => void;

  // 갤럭시 맵 생성
  generateMap: () => void;

  // 재화 관리
  addCredits: (amount: number) => void;
  spendCredits: (amount: number) => boolean;
  addVoidEssence: (amount: number) => void;
  addVoidCrystal: (amount: number) => void;
  spendVoidCrystal: (amount: number) => boolean;

  // 행성 관리
  revealPlanet: (planetId: string, state: 'Scouted' | 'Active') => void;
  visitPlanet: (planetId: string) => void;
  ownPlanet: (planetId: string, governorId?: string) => void;
  upgradePlanetCommerce: (planetId: string) => void;

  // 크루 관리
  addCrewMember: (member: CrewMember) => void;
  removeCrewMember: (memberId: string) => void;
  recruitHero: (heroId: string) => void;

  // 가차
  incrementPity: () => void;
  resetPity: () => void;

  // 턴 진행
  nextTurn: () => void;

  // 전멸 처리
  triggerWipeout: (hasEinstein: boolean) => void;

  // 상태 복원 (Firestore 로드)
  restoreState: (savedState: Partial<GameState>) => void;

  // 점수 계산
  calculateFinalScore: () => number;
}

const INITIAL_STATE: GameState = {
  currentScreen: GameStateEnum.TITLE,
  saveVersion: 0,
  isNewGame: true,
  act: 1,
  turn: 0,
  userId: '',
  profile: { name: '', gender: 'male', companyName: '빅 픽처 스페이스', shipName: '머스탱' },
  isMinor: false,
  credits: 50000, // 백구가 100년 동안 모은 초기 자금
  voidEssence: 0,
  voidCrystal: 0,
  fleet: [
    {
      id: 'S01_flagship',
      name: '머스탱',
      tier: 'small',
      hp: 100,
      currentHP: 100,
      currentINT: 0,
      components: [],
    },
  ],
  mainFlagshipId: 'S01_flagship',
  crew: [],
  recruitedHeroes: [],
  planets: {},
  galaxyMap: null,
  currentPlanetId: 'P01',
  inventory: {
    components: [],
    commodities: {},
    maxCapacity: 20,
  },
  gachaPityCount: 0,
  combatActive: false,
  combatTurn: 0,
  hallOfFameScore: 0,
  endingAchieved: 'none',
};

export const useGameStore = create<GameState & GameActions>()(
  devtools(
    (set, get) => ({
      ...INITIAL_STATE,

      setScreen: (screen) => set({ currentScreen: screen }),

      initNewGame: (profile, userId, isMinor) => {
        set({
          ...INITIAL_STATE,
          profile,
          userId,
          isMinor,
          isNewGame: true,
          planets: {
            P01: { id: 'P01', ownedByPlayer: false, commerceLevel: 0, fogState: 'Active' },
            P02: { id: 'P02', ownedByPlayer: false, commerceLevel: 0, fogState: 'Scouted' },
            P03: { id: 'P03', ownedByPlayer: false, commerceLevel: 0, fogState: 'Scouted' },
            P04: { id: 'P04', ownedByPlayer: false, commerceLevel: 0, fogState: 'Scouted' },
          },
        });
      },

      generateMap: () => {
        const galaxyMap = generateGalaxyMap(1000);
        set({ galaxyMap });
      },

      addCredits: (amount) =>
        set((state) => ({ credits: state.credits + amount })),

      spendCredits: (amount) => {
        const { credits } = get();
        if (credits < amount) return false;
        set({ credits: credits - amount });
        return true;
      },

      addVoidEssence: (amount) =>
        set((state) => ({ voidEssence: state.voidEssence + amount })),

      addVoidCrystal: (amount) =>
        set((state) => ({ voidCrystal: state.voidCrystal + amount })),

      spendVoidCrystal: (amount) => {
        const { voidCrystal } = get();
        if (voidCrystal < amount) return false;
        set({ voidCrystal: voidCrystal - amount });
        return true;
      },

      revealPlanet: (planetId, state) =>
        set((prev) => ({
          planets: {
            ...prev.planets,
            [planetId]: {
              ...(prev.planets[planetId] || { id: planetId, ownedByPlayer: false, commerceLevel: 0 }),
              fogState: state,
            },
          },
        })),

      visitPlanet: (planetId) => {
        set((prev) => ({
          currentPlanetId: planetId,
          planets: {
            ...prev.planets,
            [planetId]: {
              ...(prev.planets[planetId] || { id: planetId, ownedByPlayer: false, commerceLevel: 0 }),
              fogState: 'Active',
            },
          },
        }));
      },

      ownPlanet: (planetId, governorId) =>
        set((prev) => ({
          planets: {
            ...prev.planets,
            [planetId]: {
              ...(prev.planets[planetId] || { id: planetId, ownedByPlayer: false, commerceLevel: 0 }),
              ownedByPlayer: true,
              governorId,
              fogState: 'Active',
            },
          },
        })),

      upgradePlanetCommerce: (planetId) =>
        set((prev) => ({
          planets: {
            ...prev.planets,
            [planetId]: {
              ...prev.planets[planetId],
              commerceLevel: Math.min(10, (prev.planets[planetId]?.commerceLevel || 0) + 1),
            },
          },
        })),

      addCrewMember: (member) =>
        set((state) => ({ crew: [...state.crew, member] })),

      removeCrewMember: (memberId) =>
        set((state) => ({ crew: state.crew.filter((c) => c.id !== memberId) })),

      recruitHero: (heroId) =>
        set((state) => ({
          recruitedHeroes: [...state.recruitedHeroes, heroId],
        })),

      incrementPity: () =>
        set((state) => ({ gachaPityCount: state.gachaPityCount + 1 })),

      resetPity: () => set({ gachaPityCount: 0 }),

      nextTurn: () =>
        set((state) => ({
          turn: state.turn + 1,
          act: state.turn > 0 && state.turn % 30 === 0
            ? Math.min(3, state.act + 1)
            : state.act,
        })),

      triggerWipeout: (hasEinstein) => {
        const { credits, fleet, mainFlagshipId } = get();

        if (hasEinstein) {
          // 방주 프로토콜: 자산 손실 0%
          set({ currentScreen: GameStateEnum.STATION_HUB });
          return;
        }

        // 일반 전멸: 크레딧 50% + 기함 제외 함선 제거
        const creditsLost = Math.floor(credits * 0.5);
        const remainingFleet = fleet.filter((s) => s.id === mainFlagshipId);

        set({
          credits: credits - creditsLost,
          fleet: remainingFleet,
          inventory: { components: [], commodities: {}, maxCapacity: 20 },
          currentScreen: GameStateEnum.GAME_OVER,
          currentPlanetId: 'P01', // 수퍼비아 안전 정거장 리스폰
        });
      },

      restoreState: (savedState) => set({ ...savedState }),

      calculateFinalScore: () => {
        const { credits, planets, recruitedHeroes, crew } = get();
        const ownedPlanets = Object.values(planets).filter((p) => p.ownedByPlayer).length;
        const crewDocsUnlocked = crew.length / 141;

        const score =
          Math.floor(credits / 1000) +
          ownedPlanets * 50000 +
          recruitedHeroes.length * 100000 +
          Math.floor(crewDocsUnlocked * 100) * 2500;

        return score;
      },
    }),
    { name: 'destination-earth-game-store' }
  )
);
