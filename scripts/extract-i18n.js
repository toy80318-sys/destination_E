#!/usr/bin/env node
// DESTINATION EARTH — i18n 자동 추출기
// game.js + js/data/*.js 안의 한국어 포함 문자열을 모두 추출하여 JSON으로 출력.
//
// 출력:
//   scripts/i18n_extracted.json — 전체 추출 결과 (위치·텍스트·타입)
//   scripts/i18n_unique.json    — 중복 제거된 unique 텍스트 목록 (번역 대상)
//
// 실행: node scripts/extract-i18n.js
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FILES = [
  'game.js',
  'js/data/factions.js',
  'js/data/planets.js',
  'js/data/heroes.js',
  'js/data/commodities.js',
  'js/data/parts.js',
  'js/data/quests.js',
  'js/data/cargo.js',
  'js/data/crafting.js',
  'js/data/ships.js'
];

// 한글 음절(가-힣) 또는 자모 포함 여부
const KOREAN_RE = /[ㄱ-힝가-힣]/;

// 컨텍스트 추정 — 텍스트가 어느 도메인에 속하는지 (라벨링 용)
function guessDomain(file, line, text) {
  if (file !== 'game.js') {
    if (file.includes('factions')) return 'faction';
    if (file.includes('planets'))  return 'planet';
    if (file.includes('heroes'))   return 'hero';
    if (file.includes('commodities')) return 'commodity';
    if (file.includes('parts'))    return 'part';
    if (file.includes('quests'))   return 'quest';
    if (file.includes('cargo'))    return 'cargo';
    if (file.includes('crafting')) return 'craft';
    if (file.includes('ships'))    return 'ship';
    return 'data';
  }
  // game.js의 line 기반 휴리스틱은 부정확 — 일단 generic
  if (/⚔️|🏪|🚀|🌐|💀|☠️|😊/.test(text)) return 'menu';
  if (text.length > 80) return 'longtext';
  if (text.length < 6) return 'short';
  return 'ui';
}

function extractFromFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf-8');
  const results = [];
  const fileRel = path.relative(ROOT, filePath);

  // 1) 단일 라인 문자열: 'str' "str" 안의 한글 포함 — 가장 견고하게 잡힘
  const lines = code.split('\n');
  lines.forEach((line, idx) => {
    // single quote
    let re = /'((?:\\.|[^'\\])*)'/g;
    let m;
    while ((m = re.exec(line)) !== null) {
      if (m[1].length > 0 && KOREAN_RE.test(m[1])) {
        results.push({ file: fileRel, line: idx + 1, col: m.index + 1, type: 'single', text: m[1] });
      }
    }
    // double quote
    re = /"((?:\\.|[^"\\])*)"/g;
    while ((m = re.exec(line)) !== null) {
      if (m[1].length > 0 && KOREAN_RE.test(m[1])) {
        results.push({ file: fileRel, line: idx + 1, col: m.index + 1, type: 'double', text: m[1] });
      }
    }
  });

  // 2) 백틱 템플릿 (multiline 가능)
  //    백틱 사이 ${...} 안에 또 백틱이 들어가는 중첩은 단순 추출에선 처리 X (희귀)
  const backRe = /`((?:\\.|\$\{[^}]*\}|[^`\\])*)`/g;
  let bm;
  while ((bm = backRe.exec(code)) !== null) {
    if (bm[1].length > 0 && KOREAN_RE.test(bm[1])) {
      // line 번호 계산
      const before = code.slice(0, bm.index);
      const lineNo = (before.match(/\n/g) || []).length + 1;
      results.push({ file: fileRel, line: lineNo, col: 0, type: 'template', text: bm[1] });
    }
  }

  // domain 추정
  results.forEach(r => { r.domain = guessDomain(r.file, r.line, r.text); });
  return results;
}

// ── 추출 실행 ───────────────────────────────────────────────────────
const all = [];
FILES.forEach(rel => {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) { console.warn('[skip]', rel); return; }
  const items = extractFromFile(full);
  console.log(`[${rel}] ${items.length} 한국어 문자열 추출`);
  all.push(...items);
});

// 중복 제거 — text 기준
const seen = new Map();
all.forEach(r => {
  if (!seen.has(r.text)) seen.set(r.text, { text: r.text, count: 1, sample: r, domains: new Set([r.domain]) });
  else {
    const v = seen.get(r.text);
    v.count++;
    v.domains.add(r.domain);
  }
});
const unique = [...seen.values()].map(v => ({
  text: v.text,
  count: v.count,
  domains: [...v.domains],
  file: v.sample.file,
  line: v.sample.line,
  type: v.sample.type
}));

// 도메인별 분포
const domainCount = {};
unique.forEach(u => u.domains.forEach(d => domainCount[d] = (domainCount[d] || 0) + 1));

// 길이별 분포
const lengthBuckets = { '1-5': 0, '6-20': 0, '21-50': 0, '51-100': 0, '100+': 0 };
unique.forEach(u => {
  const L = u.text.length;
  if (L <= 5) lengthBuckets['1-5']++;
  else if (L <= 20) lengthBuckets['6-20']++;
  else if (L <= 50) lengthBuckets['21-50']++;
  else if (L <= 100) lengthBuckets['51-100']++;
  else lengthBuckets['100+']++;
});

// ── 출력 ────────────────────────────────────────────────────────────
const outDir = path.join(__dirname);
fs.writeFileSync(path.join(outDir, 'i18n_extracted.json'), JSON.stringify({
  total_occurrences: all.length,
  unique_count: unique.length,
  files_scanned: FILES.length,
  generated_at: new Date().toISOString(),
  items: all
}, null, 2));

fs.writeFileSync(path.join(outDir, 'i18n_unique.json'), JSON.stringify({
  total_occurrences: all.length,
  unique_count: unique.length,
  domain_distribution: domainCount,
  length_distribution: lengthBuckets,
  generated_at: new Date().toISOString(),
  items: unique.sort((a, b) => b.count - a.count)
}, null, 2));

console.log('');
console.log('─── 요약 ────────────────────────────────────────');
console.log(`전체 등장:    ${all.length} 회`);
console.log(`unique 텍스트: ${unique.length} 개`);
console.log('도메인:', JSON.stringify(domainCount));
console.log('길이 분포:', JSON.stringify(lengthBuckets));
console.log('');
console.log('결과 파일:');
console.log('  scripts/i18n_extracted.json (전체 등장 + 위치)');
console.log('  scripts/i18n_unique.json    (중복 제거 + 통계)');
