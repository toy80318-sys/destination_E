/**
 * DESTINATION EARTH — FTUE 사령관 커스터마이징
 * GDD v6.0 §1.3 플레이어 초기 설정 변수 입력
 */

'use client';

import { useState } from 'react';
import { useGameStore, GameStateEnum } from '../store/gameStore';

export default function FTUECustomize() {
  const { setScreen, initNewGame, generateMap, isMinor } = useGameStore();

  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('빅 픽처 스페이스');
  const [shipName, setShipName] = useState('머스탱');
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1: 기본정보, 2: 백구 브리핑

  // 백구 대사
  const baekguLines = [
    "양자 전송 패킷 수신 완료... 어라, 깨어났네?",
    "위장 상단 원장 개설해야 하니까 데이터 패드에 타이핑해.",
    "내가 100년 동안 폐지 주워서 이 상단 세워놨다. 반갑다.",
  ];

  const [baekguIndex, setBaekguIndex] = useState(0);

  const handleStart = () => {
    if (!name.trim()) {
      setError('사령관명을 입력해 주세요.');
      return;
    }
    if (name.length > 12) {
      setError('이름은 12자 이하로 입력해 주세요.');
      return;
    }
    if (!companyName.trim()) {
      setError('상단명을 입력해 주세요.');
      return;
    }

    // 게임 초기화
    initNewGame(
      { name: name.trim(), gender, companyName: companyName.trim(), shipName: shipName.trim() || '머스탱' },
      'local_user', // Firebase Auth 연동 전 임시 ID
      isMinor
    );

    generateMap();
    setScreen(GameStateEnum.PROLOGUE_VIDEO);
  };

  return (
    <div className="fixed inset-0 bg-[#050a1a] flex flex-col items-center justify-center">
      {/* 배경 별 */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white opacity-50"
            style={{
              width: '1px',
              height: '1px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-lg px-4">
        {/* 백구 브리핑 박스 */}
        <div className="bg-[#0d1a2a] border border-[#00f3ff] rounded-lg p-4 mb-6 flex gap-3">
          <div className="text-4xl flex-shrink-0">🐕</div>
          <div>
            <div className="text-[#00f3ff] text-xs font-mono mb-1">백구 (AI 진돗개)</div>
            <div className="text-[#deff9a] text-sm font-mono">
              {baekguLines[baekguIndex]}
            </div>
            {baekguIndex < baekguLines.length - 1 && (
              <button
                onClick={() => setBaekguIndex((i) => i + 1)}
                className="text-[#446677] text-xs font-mono mt-1 hover:text-[#00f3ff]"
              >
                계속 ▶
              </button>
            )}
          </div>
        </div>

        {/* 커스터마이징 폼 */}
        <div className="bg-[#0d1a2a] border border-[#1a3a5a] rounded-lg p-6">
          <h2 className="text-[#deff9a] text-xl font-bold font-mono mb-6 text-center">
            사령관 등록
          </h2>

          {/* 성별 선택 */}
          <div className="mb-4">
            <label className="block text-[#aaccdd] text-sm font-mono mb-2">
              성별
            </label>
            <div className="flex gap-3">
              {(['male', 'female'] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setGender(g)}
                  className={`flex-1 py-2 rounded font-mono text-sm transition-all
                    ${gender === g
                      ? 'bg-[#00f3ff] text-[#050a1a] font-bold'
                      : 'bg-[#1a2a3a] text-[#446677] border border-[#2a4a6a] hover:border-[#00f3ff]'
                    }`}
                >
                  {g === 'male' ? '👨 남성' : '👩 여성'}
                </button>
              ))}
            </div>
          </div>

          {/* 사령관명 */}
          <div className="mb-4">
            <label className="block text-[#aaccdd] text-sm font-mono mb-2">
              사령관명 *
            </label>
            <input
              type="text"
              placeholder="사령관의 이름을 입력하세요"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={12}
              className="w-full bg-[#1a2a3a] border border-[#2a4a6a] text-white
                rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#00f3ff]"
            />
          </div>

          {/* 상단명 */}
          <div className="mb-4">
            <label className="block text-[#aaccdd] text-sm font-mono mb-2">
              무역 상단명 *
            </label>
            <input
              type="text"
              placeholder="빅 픽처 스페이스"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              maxLength={20}
              className="w-full bg-[#1a2a3a] border border-[#2a4a6a] text-white
                rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#00f3ff]"
            />
          </div>

          {/* 함선명 */}
          <div className="mb-6">
            <label className="block text-[#aaccdd] text-sm font-mono mb-2">
              초기 함선명
            </label>
            <input
              type="text"
              placeholder="머스탱"
              value={shipName}
              onChange={(e) => setShipName(e.target.value)}
              maxLength={16}
              className="w-full bg-[#1a2a3a] border border-[#2a4a6a] text-white
                rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#00f3ff]"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm font-mono mb-4">{error}</p>
          )}

          {/* 초기 자산 표시 */}
          <div className="bg-[#0a1520] rounded p-3 mb-4 font-mono text-sm">
            <div className="text-[#446677] mb-1">💰 초기 자산 (백구 100년 작업)</div>
            <div className="text-[#deff9a]">₡ 50,000 크레딧</div>
            <div className="text-[#aaccdd]">🛸 S01 머스탱 (초기 함선)</div>
          </div>

          <button
            onClick={handleStart}
            className="w-full py-4 bg-[#00f3ff] text-[#050a1a] font-bold font-mono
              text-lg rounded hover:bg-[#00d4dd] transition-colors"
          >
            🚀 출발! 지구를 구하러 가자
          </button>
        </div>

        {/* 미성년자 안내 */}
        {isMinor && (
          <div className="mt-4 bg-[#1a1a00] border border-[#4a4a00] rounded p-3
            text-[#aaaa00] text-xs font-mono">
            ⚠️ 미성년자 계정: 월 지출 한도 70,000원 / 새벽 0~6시 이용 제한
          </div>
        )}
      </div>
    </div>
  );
}
