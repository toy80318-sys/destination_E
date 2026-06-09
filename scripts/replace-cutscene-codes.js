#!/usr/bin/env node
// 컷씬 텍스트의 코드를 실제 이름으로 일괄 치환
// 적용 대상: js/data/phase1~6_quests.js, js/story-scenes-pc.js
// 치환 대상 필드: text: '...' / nm: '...' / desc: '...'
//
// 사용자 요청 2026-06-09: 컷씬에서 R04, P08 같은 코드 대신 실제 이름 사용

const fs = require('fs');
const path = require('path');

// ─── 매핑 테이블 (실제 데이터에서 추출한 이름) ──────────────────────
const NAME_MAP = {
  // 행성 (PLANET)
  P01: '프록시마 b', P02: '센타우리 에코 c', P03: '바나드 프라임', P04: '로스 128-b',
  P05: '티가든 금융 b', P06: '넥서스 프라임', P07: 'LHS 1140-b', P08: '글리제 667Cc',
  P09: 'TRAPPIST-1e', P10: 'TRAPPIST-1f', P11: '케플러-62f', P12: '기가-넷 허브',
  P13: 'Kepler-22b', P14: 'Kepler-442b', P15: '타르타로스', P16: '아레스-III',
  P17: 'TOI-700 d', P18: '케플러-452b', P19: '우르사-알파', P20: '오미크론-퍼세이',
  P21: '타이탄-X', P22: '지하 방공호', P23: '화성 저항군', P24: '달 정거장',
  P25: '유로파', P26: '타이탄 기지', P27: '글리제 581g 균열', P28: '캅테인 b 균열',
  P29: '오리온 균열', P30: '제타 레티쿨리', P31: '지구',

  // 특산물 G##
  G01: '고철 프레임', G02: '에너지 코어', G03: '오리온 위스키', G04: '아우레우스 금괴',
  G05: '수퍼비아 중력수정', G06: 'LHS 크리스탈', G07: '분열 배터리',
  G08: '메카니카 광학 렌즈', G09: '중수소 배터리', G10: '크리그 무기 원석',
  G11: '크리그 혈철석', G12: '강습 스파이크', G13: '저항군 군수품',
  G14: '전통 발효주', G15: '지구 철광석', G16: '치크스 변이 포자',
  G17: '치크스 결정 파편', G18: '난중일기 영인본', G19: '보이드 에센스',
  G20: '보이드 시간 파편', G21: '별빛 나침반', G22: '수퍼비아 귀족 향수',
  G23: '아우레우스 태양 화폐', G24: '아우레우스 정보 칩', G25: '메카니카 자동화 부품',
  G26: '크리그 전투 자극제', G27: '치크스 뇌수액', G28: '지구 빈티지 씨앗',
  G29: '보이드 공간 수정', G30: '균열 지도 원석',

  // 제작 재료 R##
  R01: '보이드 에너지 파편', R02: '치크스 결정석', R03: '아우레우스 태양핵',
  R04: '크리그 마그마 코어', R05: '메카니카 양자칩', R06: '저항군 반물질',
  R07: '수퍼비아 중력자', R08: '은하 혼돈 결정',

  // 팩션 (참고용)
  F01: '수퍼비아', F02: '아우레우스', F03: '메카니카', F04: '크리그',
  F05: '치크스', F06: '저항군', F07: '보이드',

  // 영웅 (이름 그대로 두는 게 자연스러우니 SKIP — 아래 EXCLUDE 참고)

  // 신화 함선 — 거북선/렐러티비티/워덴클리프 (이미 본문에 한글 이름 같이 나오는 경우 많음)
  LGD01: '거북선', LGD02: '워덴클리프', LGD03: '렐러티비티',
};

// 코드 형태가 식별자/변수 등으로 쓰이는 경우는 제외 (영웅 ID, 함선 ID 등)
// → 본문 안의 코드만 치환하므로, 따옴표 안 텍스트 필드만 대상
const EXCLUDE_PATTERNS = [
  /^id:/, /^npcKey:/, /^char:/, /^heroId:/, /^catalogId:/,
  /^href=/, /^src=/, /^type=/, // HTML 속성
];

// 필드 안에서 코드만 골라 매핑
const CODE_RE = /\b(P0[0-9]|P1[0-9]|P2[0-9]|P3[0-9]|G[0-2][0-9]|G3[0]|R0[1-9]|R10|LGD0[1-3]|F0[1-7])\b/g;

function replaceInText(text) {
  return text.replace(CODE_RE, (m) => {
    const name = NAME_MAP[m];
    if (!name) return m;
    // 코드와 한글 이름이 이미 함께 있으면 그대로 두기 (e.g. "G01 고철 프레임")
    // 단순 치환만 — 중복 방지는 별도
    return name;
  });
}

// 텍스트 필드를 안전하게 찾아 치환
// 대상: text:'...' / text:"..." / nm:'...' / desc:'...' / text:{ko:'...',en:'...'}
function processFile(filepath) {
  let src = fs.readFileSync(filepath, 'utf8');
  let count = 0;

  // text:'...' (single-line quoted string)
  src = src.replace(/(text:\s*['"`])((?:[^'"`\\]|\\.)*)(['"`])/g, (m, p1, body, p3) => {
    const replaced = replaceInText(body);
    if (replaced !== body) count++;
    return p1 + replaced + p3;
  });
  // ko: '...' / en: '...' (i18n object inside text/desc/nm)
  src = src.replace(/((?:ko|en):\s*['"`])((?:[^'"`\\]|\\.)*)(['"`])/g, (m, p1, body, p3) => {
    const replaced = replaceInText(body);
    if (replaced !== body) count++;
    return p1 + replaced + p3;
  });
  // desc:'...' / nm:'...' (simple form, when not i18n object)
  // 위에서 이미 처리됨

  return { src, count };
}

const targets = [
  'js/data/phase1_quests.js',
  'js/data/phase2_quests.js',
  'js/data/phase3_quests.js',
  'js/data/phase4_quests.js',
  'js/data/phase5_quests.js',
  'js/data/phase6_quests.js',
  'js/story-scenes-pc.js',
];

console.log('[replace] 대상 파일:', targets.length);
let totalChanges = 0;
targets.forEach(f => {
  if (!fs.existsSync(f)) { console.log('  ✗', f, '(없음)'); return; }
  const { src, count } = processFile(f);
  if (count > 0) {
    fs.writeFileSync(f, src);
    console.log('  ✓', f, '· 치환:', count, '개');
    totalChanges += count;
  } else {
    console.log('  -', f, '(변경 없음)');
  }
});
console.log('[replace] 완료 — 총', totalChanges, '곳 치환');
