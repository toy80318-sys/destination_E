/**
 * DESTINATION EARTH — 메인 타이틀 페이지 (Next.js App Router)
 * GDD v6.0 §19 기반 게임 진입점
 */

'use client';

import { useEffect, useState } from 'react';
import { useGameStore, GameStateEnum } from '../store/gameStore';
import AgeGate from '../components/AgeGate';
import FTUECustomize from '../components/FTUECustomize';
import HubUI from '../components/HubUI';

export default function HomePage() {
  const { currentScreen, setScreen } = useGameStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 초기 로딩 (에셋 사전 체크)
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <main className="w-full h-screen overflow-hidden bg-[#050a1a]">
      {currentScreen === GameStateEnum.TITLE && <TitleScreen />}
      {currentScreen === GameStateEnum.AGE_GATE && <AgeGate />}
      {currentScreen === GameStateEnum.FTUE_CUSTOMIZE && <FTUECustomize />}
      {currentScreen === GameStateEnum.STATION_HUB && <HubUI />}
      {(currentScreen === GameStateEnum.STARMAP_NAV ||
        currentScreen === GameStateEnum.COMBAT_SESSION) && (
        <GameCanvas />
      )}
    </main>
  );
}

// ─── 로딩 화면 ──────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-[#050a1a] flex flex-col items-center justify-center">
      <div className="text-[#00f3ff] text-4xl font-mono font-bold mb-4 animate-pulse">
        🐕 BIG PICTURE SPACE
      </div>
      <div className="text-[#deff9a] text-lg font-mono mb-8">
        DESTINATION EARTH
      </div>
      <div className="w-64 h-1 bg-[#1a2a3a] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#00f3ff] rounded-full animate-[loading_1.5s_ease-in-out]"
          style={{ animation: 'expand 1.5s ease-in-out forwards' }}
        />
      </div>
      <div className="text-[#446677] text-sm font-mono mt-4">
        백구 AI 시스템 초기화 중...
      </div>
    </div>
  );
}

// ─── 타이틀 화면 ──────────────────────────────────────────────────────
function TitleScreen() {
  const setScreen = useGameStore((s) => s.setScreen);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{
        background: 'radial-gradient(ellipse at center, #0a1628 0%, #050a1a 100%)',
      }}
    >
      {/* 별 배경 (CSS) */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: Math.random() * 2 + 1 + 'px',
              height: Math.random() * 2 + 1 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              opacity: Math.random() * 0.7 + 0.3,
            }}
          />
        ))}
      </div>

      {/* 타이틀 UI */}
      <div className="relative z-10 text-center">
        <div className="text-[#00f3ff] text-6xl mb-2 animate-pulse">🌌</div>
        <h1 className="text-[#deff9a] text-5xl font-bold font-mono tracking-widest mb-2">
          DESTINATION
        </h1>
        <h1 className="text-[#ffffff] text-5xl font-bold font-mono tracking-widest mb-8">
          EARTH
        </h1>

        <p className="text-[#446677] text-sm font-mono mb-2">
          빅 픽처 스페이스 | 우주 자본주의 RPG
        </p>
        <p className="text-[#334455] text-xs font-mono mb-12">
          "내가 폐지 주워서 이만큼 상단 세워놨으니, 지구 구하러 가자."
        </p>

        <button
          onClick={() => setScreen(GameStateEnum.AGE_GATE)}
          className="px-12 py-4 text-lg font-mono font-bold tracking-widest
            bg-transparent border-2 border-[#00f3ff] text-[#00f3ff]
            hover:bg-[#00f3ff] hover:text-[#050a1a]
            transition-all duration-300 rounded"
        >
          🚀 게임 시작
        </button>

        <div className="mt-4 flex gap-4 justify-center">
          <button className="text-[#446677] text-sm font-mono hover:text-[#888] transition">
            설정
          </button>
          <button className="text-[#446677] text-sm font-mono hover:text-[#888] transition">
            명예의 전당
          </button>
          <button className="text-[#446677] text-sm font-mono hover:text-[#888] transition">
            v1.0.0
          </button>
        </div>
      </div>

      {/* 법적 고지 */}
      <div className="absolute bottom-4 text-[#2a3a4a] text-xs font-mono text-center">
        ©2026 BIG PICTURE SPACE | 이용등급: 12세 이상 | 가차 확률 공시: 설정 &gt; 확률 정보
      </div>
    </div>
  );
}

// ─── 게임 캔버스 (Phaser 3 마운트) ─────────────────────────────────────
function GameCanvas() {
  useEffect(() => {
    let game: any;

    const initPhaser = async () => {
      const Phaser = (await import('phaser')).default;
      const { StarMapScene } = await import('../scenes/StarMapScene');
      const { CombatScene } = await import('../scenes/CombatScene');

      game = new Phaser.Game({
        type: Phaser.AUTO,
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: '#050a1a',
        parent: 'game-canvas-container',
        scene: [StarMapScene, CombatScene],
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        physics: {
          default: 'arcade',
          arcade: { debug: false },
        },
      });
    };

    initPhaser();

    return () => {
      game?.destroy(true);
    };
  }, []);

  return (
    <div id="game-canvas-container" className="w-full h-full" />
  );
}
