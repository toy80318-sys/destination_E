/**
 * DESTINATION EARTH — 허브 UI (안전 정거장)
 * GDD v6.0 §19 기반 React 허브 화면
 */

'use client';

import { useState } from 'react';
import { useGameStore, GameStateEnum } from '../store/gameStore';

export default function HubUI() {
  const {
    profile,
    credits,
    voidEssence,
    voidCrystal,
    crew,
    recruitedHeroes,
    fleet,
    turn,
    act,
    currentPlanetId,
    setScreen,
  } = useGameStore();

  const [activeTab, setActiveTab] = useState<'main' | 'fleet' | 'crew' | 'map'>('main');

  return (
    <div className="fixed inset-0 bg-[#0d1117] text-white font-mono overflow-hidden flex flex-col">
      {/* 상단 HUD 바 */}
      <header className="flex items-center justify-between px-4 py-2 bg-[#050a1a] border-b border-[#1a2a3a]">
        <div className="flex items-center gap-3">
          <span className="text-[#00f3ff] text-sm">🐕 백구</span>
          <span className="text-[#446677] text-xs">AI 기계 진돗개</span>
          <span className="text-[#deff9a] text-sm font-bold">{profile.companyName}</span>
        </div>

        {/* 재화 표시 */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <span className="text-[#d4af37]">₡</span>
            <span className="text-white">{credits.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[#00f3ff]">VE</span>
            <span className="text-white">{voidEssence.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[#8b00ff]">VC</span>
            <span className="text-white">{voidCrystal}</span>
          </div>
        </div>

        <div className="text-xs text-[#446677]">
          ACT {act} | TURN {turn} | {currentPlanetId}
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 사이드바 탭 */}
        <nav className="w-16 bg-[#050a1a] border-r border-[#1a2a3a] flex flex-col items-center py-4 gap-4">
          {[
            { id: 'main', icon: '🏠', label: '허브' },
            { id: 'map', icon: '🗺️', label: '맵' },
            { id: 'fleet', icon: '🛸', label: '함선' },
            { id: 'crew', icon: '👥', label: '크루' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex flex-col items-center gap-1 p-2 rounded transition-all
                ${activeTab === tab.id
                  ? 'bg-[#00f3ff20] text-[#00f3ff]'
                  : 'text-[#446677] hover:text-[#888]'
                }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-xs">{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* 컨텐츠 영역 */}
        <main className="flex-1 overflow-auto p-6">
          {activeTab === 'main' && <MainHubContent />}
          {activeTab === 'map' && <MapContent setScreen={setScreen} />}
          {activeTab === 'fleet' && <FleetContent />}
          {activeTab === 'crew' && <CrewContent />}
        </main>

        {/* 백구 대화창 */}
        <aside className="w-72 bg-[#050a1a] border-l border-[#1a2a3a] p-4 flex flex-col">
          <BaekguChat />
        </aside>
      </div>
    </div>
  );
}

// ─── 메인 허브 컨텐츠 ─────────────────────────────────────────────────
function MainHubContent() {
  const { profile, turn } = useGameStore();

  const menuItems = [
    { icon: '🛒', label: '특산물 무역', color: '#d4af37', action: '무역 시스템' },
    { icon: '🏛️', label: '행성 경매', color: '#00f3ff', action: '경매 시스템' },
    { icon: '🎰', label: '주점 가차', color: '#8b00ff', action: '가차 시스템' },
    { icon: '🔧', label: '함선 정비창', color: '#7ecbce', action: '정비창' },
    { icon: '💎', label: 'VC 상점', color: '#ff6b00', action: 'VC 상점' },
    { icon: '📊', label: '명예의 전당', color: '#deff9a', action: '랭킹' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[#deff9a] text-2xl font-bold mb-1">
          안전 정거장 허브
        </h1>
        <p className="text-[#446677] text-sm">
          사령관 {profile.name} | {profile.companyName}
        </p>
      </div>

      {/* 빠른 접근 메뉴 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {menuItems.map((item) => (
          <button
            key={item.action}
            className="bg-[#0d1a2a] border border-[#1a3a5a] rounded-lg p-4
              hover:border-[#00f3ff] transition-colors text-left"
            onClick={() => console.log(item.action)}
          >
            <div className="text-3xl mb-2">{item.icon}</div>
            <div className="text-sm" style={{ color: item.color }}>
              {item.label}
            </div>
          </button>
        ))}
      </div>

      {/* 퀵 스탯 */}
      <div className="bg-[#0d1a2a] border border-[#1a3a5a] rounded-lg p-4">
        <h3 className="text-[#aaccdd] text-sm mb-3">현황 요약</h3>
        <div className="grid grid-cols-4 gap-3 text-center">
          <div>
            <div className="text-[#deff9a] text-lg font-bold">
              {useGameStore.getState().fleet.length}
            </div>
            <div className="text-[#446677] text-xs">보유 함선</div>
          </div>
          <div>
            <div className="text-[#deff9a] text-lg font-bold">
              {useGameStore.getState().crew.length}
            </div>
            <div className="text-[#446677] text-xs">크루 수</div>
          </div>
          <div>
            <div className="text-[#deff9a] text-lg font-bold">
              {useGameStore.getState().recruitedHeroes.length}
            </div>
            <div className="text-[#446677] text-xs">영웅 수</div>
          </div>
          <div>
            <div className="text-[#deff9a] text-lg font-bold">
              {Object.values(useGameStore.getState().planets).filter(p => p.ownedByPlayer).length}
            </div>
            <div className="text-[#446677] text-xs">보유 행성</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 맵 이동 컨텐츠 ──────────────────────────────────────────────────
function MapContent({ setScreen }: { setScreen: (s: GameStateEnum) => void }) {
  return (
    <div>
      <h2 className="text-[#deff9a] text-xl font-bold mb-4">🗺️ 스타맵</h2>
      <div className="bg-[#0d1a2a] border border-[#1a3a5a] rounded-lg p-8 text-center">
        <p className="text-[#446677] mb-4">Galaxy Seed 1000 — 30개 행성 오각형 격자</p>
        <button
          onClick={() => setScreen(GameStateEnum.STARMAP_NAV)}
          className="px-8 py-3 bg-[#00f3ff] text-[#050a1a] font-bold rounded
            hover:bg-[#00d4dd] transition-colors"
        >
          🌌 스타맵 열기
        </button>
      </div>
    </div>
  );
}

// ─── 함선 컨텐츠 ─────────────────────────────────────────────────────
function FleetContent() {
  const { fleet } = useGameStore();

  return (
    <div>
      <h2 className="text-[#deff9a] text-xl font-bold mb-4">🛸 함선 편대</h2>
      <div className="grid grid-cols-2 gap-4">
        {fleet.map((ship) => (
          <div
            key={ship.id}
            className="bg-[#0d1a2a] border border-[#1a3a5a] rounded-lg p-4"
          >
            <div className="text-white font-bold">{ship.name}</div>
            <div className="text-[#446677] text-xs mb-2">{ship.tier.toUpperCase()}</div>
            <div className="flex gap-2 text-xs">
              <div>
                <div className="text-[#2ecc71]">HP</div>
                <div>{ship.currentHP}/{ship.hp}</div>
              </div>
              <div>
                <div className="text-[#4a90d9]">실드</div>
                <div>{ship.currentINT}</div>
              </div>
            </div>
          </div>
        ))}
        {fleet.length === 0 && (
          <p className="text-[#446677]">함선이 없습니다.</p>
        )}
      </div>
    </div>
  );
}

// ─── 크루 컨텐츠 ─────────────────────────────────────────────────────
function CrewContent() {
  const { crew } = useGameStore();

  const rarityColors: Record<string, string> = {
    Normal: '#666',
    Rare: '#4a90d9',
    Hero: '#8b00ff',
    Legendary: '#d4af37',
  };

  return (
    <div>
      <h2 className="text-[#deff9a] text-xl font-bold mb-4">
        👥 크루 ({crew.length}/16명 배치 가능)
      </h2>
      <div className="grid grid-cols-3 gap-3">
        {crew.map((member) => (
          <div
            key={member.id}
            className="bg-[#0d1a2a] rounded-lg p-3"
            style={{
              border: `1px solid ${rarityColors[member.rarity] || '#333'}`,
            }}
          >
            <div className="text-white text-sm font-bold">{member.name}</div>
            <div className="text-xs" style={{ color: rarityColors[member.rarity] }}>
              {member.rarity}
            </div>
            <div className="text-[#446677] text-xs">{member.class}</div>
          </div>
        ))}
        {crew.length === 0 && (
          <p className="text-[#446677] col-span-3">
            행성 주점에서 가차로 동료를 모집하세요!
          </p>
        )}
      </div>
    </div>
  );
}

// ─── 백구 대화창 ─────────────────────────────────────────────────────
function BaekguChat() {
  const { profile, credits, turn } = useGameStore();
  const [inputText, setInputText] = useState('');

  const getContextualLine = () => {
    if (credits < 10000) return "크레딧이 부족해. 무역 루트 다시 계산해야겠는데.";
    if (turn === 0) return "자, 이제 시작이야. 빅 픽처 스페이스 출범이다.";
    return `${profile.name} 사령관, 다음 목표를 설정해. 이 속도면 지구 구하는 데 한참 걸려.`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* 백구 프로필 */}
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[#1a2a3a]">
        <div className="w-12 h-12 bg-[#1a2a3a] rounded-full flex items-center justify-center text-2xl border border-[#00f3ff]">
          🐕
        </div>
        <div>
          <div className="text-[#00f3ff] text-sm font-bold">백구</div>
          <div className="text-[#446677] text-xs">AI 기계 진돗개 • 온라인</div>
        </div>
      </div>

      {/* 대화 영역 */}
      <div className="flex-1 overflow-auto mb-4 space-y-3">
        <div className="bg-[#0d1a2a] rounded-lg p-3">
          <div className="text-[#deff9a] text-sm">{getContextualLine()}</div>
        </div>
      </div>

      {/* 입력창 */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="백구에게 질문..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="flex-1 bg-[#1a2a3a] border border-[#2a4a6a] text-white
            rounded px-3 py-2 text-xs focus:outline-none focus:border-[#00f3ff]"
        />
        <button className="px-3 py-2 bg-[#00f3ff20] border border-[#00f3ff] rounded text-[#00f3ff] text-xs">
          ▶
        </button>
      </div>
    </div>
  );
}
