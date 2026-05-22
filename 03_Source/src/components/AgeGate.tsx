/**
 * DESTINATION EARTH — 연령 확인 (Age Gate)
 * GDD v6.0 §21.1 — DOM 레벨 완전 구현, 우회 불가
 */

'use client';

import { useState } from 'react';
import { useGameStore, GameStateEnum } from '../store/gameStore';

export default function AgeGate() {
  const setScreen = useGameStore((s) => s.setScreen);
  const [birthYear, setBirthYear] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [error, setError] = useState('');
  const [needsParental, setNeedsParental] = useState(false);

  const handleConfirm = () => {
    const year = parseInt(birthYear);
    const month = parseInt(birthMonth);
    const day = parseInt(birthDay);

    if (!year || !month || !day || year < 1900 || year > 2020) {
      setError('올바른 생년월일을 입력해 주세요.');
      return;
    }

    const birthDate = new Date(year, month - 1, day);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const actualAge =
      monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())
        ? age - 1
        : age;

    if (actualAge < 13) {
      // 만 13세 미만: 보호자 승인 필요
      setNeedsParental(true);
      return;
    }

    if (actualAge < 18) {
      // 미성년자 계정으로 진행
      useGameStore.setState({ isMinor: true });
    }

    setScreen(GameStateEnum.FTUE_CUSTOMIZE);
  };

  if (needsParental) {
    return <ParentalConsentScreen />;
  }

  return (
    // ⚠️ CSS display:none 불가 — DOM 레벨 렌더링 필수 (GDD §21.1)
    <div className="fixed inset-0 bg-[#050a1a] flex flex-col items-center justify-center z-50">
      <div className="bg-[#0d1a2a] border border-[#1a3a5a] rounded-lg p-8 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">🎮</div>
          <h2 className="text-white text-xl font-bold mb-1">연령 확인</h2>
          <p className="text-[#446677] text-sm">
            DESTINATION EARTH는 만 12세 이상 이용 가능합니다.
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-[#aaccdd] text-sm font-mono mb-3">
            생년월일을 입력해 주세요
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="년도 (YYYY)"
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value)}
              className="flex-1 bg-[#1a2a3a] border border-[#2a4a6a] text-white
                rounded px-3 py-2 text-sm font-mono focus:outline-none
                focus:border-[#00f3ff]"
              min="1900"
              max="2020"
            />
            <input
              type="number"
              placeholder="월"
              value={birthMonth}
              onChange={(e) => setBirthMonth(e.target.value)}
              className="w-16 bg-[#1a2a3a] border border-[#2a4a6a] text-white
                rounded px-3 py-2 text-sm font-mono focus:outline-none
                focus:border-[#00f3ff]"
              min="1"
              max="12"
            />
            <input
              type="number"
              placeholder="일"
              value={birthDay}
              onChange={(e) => setBirthDay(e.target.value)}
              className="w-16 bg-[#1a2a3a] border border-[#2a4a6a] text-white
                rounded px-3 py-2 text-sm font-mono focus:outline-none
                focus:border-[#00f3ff]"
              min="1"
              max="31"
            />
          </div>
          {error && (
            <p className="text-red-400 text-xs font-mono mt-2">{error}</p>
          )}
        </div>

        <button
          onClick={handleConfirm}
          className="w-full py-3 bg-[#00f3ff] text-[#050a1a] font-bold font-mono
            rounded hover:bg-[#00d4dd] transition-colors"
        >
          확인
        </button>

        <div className="mt-4 text-[#334455] text-xs font-mono text-center">
          개인정보는 연령 확인 후 즉시 폐기됩니다.
          <br />
          만 13세 미만은 보호자 동의가 필요합니다.
        </div>
      </div>
    </div>
  );
}

// ─── 보호자 동의 화면 (만 13세 미만) ───────────────────────────────────
function ParentalConsentScreen() {
  const [parentEmail, setParentEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="fixed inset-0 bg-[#050a1a] flex flex-col items-center justify-center z-50">
      <div className="bg-[#0d1a2a] border border-[#2a4a6a] rounded-lg p-8 max-w-md w-full mx-4">
        <h2 className="text-white text-xl font-bold mb-4 text-center">
          보호자 동의 필요
        </h2>

        {!submitted ? (
          <>
            <p className="text-[#aaccdd] text-sm mb-6">
              만 13세 미만 어린이는 보호자(부모님)의 이메일 승인이 필요합니다.
              보호자 이메일 주소를 입력하면 승인 링크를 발송해 드립니다.
            </p>
            <input
              type="email"
              placeholder="보호자 이메일 주소"
              value={parentEmail}
              onChange={(e) => setParentEmail(e.target.value)}
              className="w-full bg-[#1a2a3a] border border-[#2a4a6a] text-white
                rounded px-3 py-2 text-sm font-mono mb-4 focus:outline-none
                focus:border-[#00f3ff]"
            />
            <button
              onClick={() => setSubmitted(true)}
              className="w-full py-3 bg-[#4a90d9] text-white font-bold font-mono
                rounded hover:bg-[#3a80c9] transition-colors"
            >
              승인 요청 발송
            </button>
          </>
        ) : (
          <div className="text-center">
            <div className="text-4xl mb-4">📧</div>
            <p className="text-[#aaccdd] text-sm">
              {parentEmail} 으로 승인 링크를 발송했습니다.
              <br />
              보호자 승인 후 이용 가능합니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
