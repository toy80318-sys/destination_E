#!/usr/bin/env node
// 퀘스트 desc/text 안의 중복된 특산물/재료/행성 이름 정리
// 사용자 보고 2026-06-09: 코드 치환 부작용으로 "고철 프레임 고철 프레임" 같은 중복 발생

const fs = require('fs');
const path = require('path');

// 중복될 수 있는 한글 이름 목록 (이전 코드 치환 결과)
const NAMES = [
  '고철 프레임', '에너지 코어', '오리온 위스키', '아우레우스 금괴',
  '수퍼비아 중력수정', 'LHS 크리스탈', '분열 배터리', '메카니카 광학 렌즈',
  '중수소 배터리', '크리그 무기 원석', '크리그 혈철석', '강습 스파이크',
  '저항군 군수품', '전통 발효주', '지구 철광석', '치크스 변이 포자',
  '치크스 결정 파편', '난중일기 영인본', '보이드 에센스', '보이드 시간 파편',
  '별빛 나침반', '수퍼비아 귀족 향수', '아우레우스 태양 화폐', '아우레우스 정보 칩',
  '메카니카 자동화 부품', '크리그 전투 자극제', '치크스 뇌수액', '지구 빈티지 씨앗',
  '보이드 공간 수정', '균열 지도 원석',
  '보이드 에너지 파편', '치크스 결정석', '아우레우스 태양핵', '크리그 마그마 코어',
  '메카니카 양자칩', '저항군 반물질', '수퍼비아 중력자', '은하 혼돈 결정',
  '프록시마 b', '바나드 프라임', '로스 128-b', '티가든 금융 b', '넥서스 프라임',
  'LHS 1140-b', '글리제 667Cc', 'TRAPPIST-1e', 'TRAPPIST-1f', '케플러-62f',
  '기가-넷 허브', 'Kepler-22b', 'Kepler-442b', '타르타로스', '아레스-III',
  'TOI-700 d', '케플러-452b', '우르사-알파', '오미크론-퍼세이', '타이탄-X',
  '지하 방공호', '화성 저항군', '달 정거장', '유로파', '타이탄 기지',
  '글리제 581g 균열', '캅테인 b 균열', '오리온 균열', '제타 레티쿨리', '지구',
  '거북선', '워덴클리프', '렐러티비티',
];

const targets = [
  'js/data/phase1_quests.js',
  'js/data/phase2_quests.js',
  'js/data/phase3_quests.js',
  'js/data/phase4_quests.js',
  'js/data/phase5_quests.js',
  'js/data/phase6_quests.js',
];

console.log('═══ 중복 이름 정리 ═══\n');
let totalChanged = 0;
targets.forEach(f => {
  if (!fs.existsSync(f)) return;
  let src = fs.readFileSync(f, 'utf8');
  let count = 0;
  NAMES.forEach(name => {
    // 동일 이름이 한 줄에 인접해 나오는 경우 (예: "A A")
    // 공백 + 동일 이름 + (공백 없이) 한 번 더 → 한 번으로 축약
    const re = new RegExp('(' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')\\s+\\1', 'g');
    const before = src;
    src = src.replace(re, '$1');
    if (src !== before) {
      const matches = before.match(re) || [];
      count += matches.length;
    }
  });
  if (count > 0) {
    fs.writeFileSync(f, src);
    console.log('  ✓', f, '· 정리:', count, '곳');
    totalChanged += count;
  } else {
    console.log('  -', f, '(변경 없음)');
  }
});
console.log('\n═══ 완료 — 총', totalChanged, '곳 정리 ═══');
