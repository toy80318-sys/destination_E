#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════
// i18n 누수 스캐너 — 렌더 코드에 하드코딩된 한글(표시용) 문자열 검출
//   목적: 영문판에서 한글이 새는 곳을 자동으로 찾아 i18n 키화 누락을 방지.
//   사용: node scripts/i18n-scan.js            (요약)
//         node scripts/i18n-scan.js --all      (전체 라인 출력)
//
// 분류:
//   [UI ] return/HTML/라벨 맥락의 한글 문자열 → 표시 누수 가능성 높음 (우선 수정)
//   [TOAST] notify(...) 안의 한글 → 사용자 토스트 (수정 대상)
//   제외: 주석, console.*, i18n_dict.js, 데이터 파일({ko,en} 정의), 한글 enum/로직 토큰
// ═══════════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ALL = process.argv.includes('--all');

// 스캔 대상: 렌더/로직 코드 (데이터 사전 제외)
const TARGETS = [
  'game.js',
  'js/cheat-menu.js', 'js/cloudsave.js', 'js/desktop-bridge.js', 'js/story-quest-engine.js', 'js/story-scenes-pc.js',
];
// js/modules 전체 (개발 전용 도구 제외)
const DEV_ONLY = new Set(['ui-tuner.js', 'dev-menu.js', 'cheat-menu.js']);
const MODDIR = path.join(ROOT, 'js/modules');
if (fs.existsSync(MODDIR)) fs.readdirSync(MODDIR).filter(f => f.endsWith('.js') && !DEV_ONLY.has(f)).forEach(f => TARGETS.push('js/modules/' + f));

// 한글 enum/로직 토큰 — 데이터 비교용이라 번역하면 안 됨 (제외)
const ENUM_WHITELIST = new Set([
  '소형','중형','대형','신화','전설기함','전설','일반','고급','희귀','영웅','세트','스토리',
  '백구','사령관','시스템','남성','여성','남','여',
]);

const HANGUL = /[가-힣]/;
// 따옴표 문자열 리터럴 추출 (', ", `)
const STR_RE = /'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;

let totalUI = 0, totalToast = 0, filesWithHits = 0;
const report = [];

for (const rel of TARGETS) {
  const fp = path.join(ROOT, rel);
  if (!fs.existsSync(fp)) continue;
  const lines = fs.readFileSync(fp, 'utf8').split('\n');
  const hits = [];
  lines.forEach((ln, i) => {
    const trimmed = ln.trim();
    // 주석/콘솔 제외
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
    if (/console\.(log|warn|error|info)/.test(ln)) return;
    if (/\b_log\s*\(/.test(ln)) return; // cloudsave 내부 로거
    // {ko: '...', en: '...'} 데이터 정의 라인 제외 (정상적인 이중언어 데이터)
    if (/\bko\s*:\s*['"`]/.test(ln) && /\ben\s*:\s*['"`]/.test(ln)) return;
    // 언어 분기 라인 제외 — 한글은 isEn?'en':'ko' 의 ko측 (이미 처리됨)
    if (/isEn|_en\b|_enDL|_enSB|getLang|_curLang|===\s*['"]en['"]|['"]en['"]\s*===|lang\s*===|\?\s*['"]/.test(ln) && /['"`]/.test(ln)) {
      // 단, 명백한 분기 신호가 있을 때만 제외 (en 리터럴/isEn/getLang/lang=== 존재)
      if (/isEn|_en\b|_enDL|_enSB|getLang|_curLang|['"]en['"]|lang\s*===/.test(ln)) return;
    }
    // 컷신/대화 씬 데이터 라인 제외 (char/color/text 구조 = *_KO 데이터, EN 짝 존재)
    if (/\bchar\s*:/.test(ln) && /\btext\s*:/.test(ln)) return;
    if (/\bname\s*:\s*['"][^'"]*['"]\s*,\s*color\s*:/.test(ln)) return;
    // 로직 매칭 라인 제외 (한글+영문 동시 매칭이라 정상) — includes/indexOf/toLowerCase/nmLow
    if (/\.(includes|indexOf|startsWith|endsWith)\s*\(|toLowerCase\s*\(|\bnmLow\b/.test(ln)) return;
    // I18N.t(...) || '한글' 폴백 패턴 제외 (키 있으면 영문, 폴백은 안전망)
    if (/I18N\.t\([^)]*\)\s*\|\|/.test(ln)) return;
    // 폰트명 (Malgun Gothic / 맑은 고딕) 제외
    if (/Malgun Gothic|맑은 고딕|돋움|굴림/.test(ln)) return;
    // 초기 프로필 기본값 (FTUE 에서 덮어씀) 제외
    if (/\bprofile\s*:\s*\{/.test(ln)) return;
    // 키워드/별칭 배열 라인 제외 (한글 토큰 3개 이상 + HTML 태그 없음 = 매칭용 배열, 표시 아님)
    {
      const kq = (ln.match(/'[^']*[가-힣][^']*'|"[^"]*[가-힣][^"]*"/g) || []).length;
      if (kq >= 3 && ln.indexOf('<') < 0) return;
    }

    let m;
    STR_RE.lastIndex = 0;
    while ((m = STR_RE.exec(ln))) {
      const s = m[1] != null ? m[1] : (m[2] != null ? m[2] : m[3]);
      if (!s || !HANGUL.test(s)) continue;
      if (ENUM_WHITELIST.has(s.trim())) continue;
      // 이 매치 직전에 I18N.t( 가 있으면 (한글이 키일 리 없지만 안전) 제외
      const before = ln.slice(0, m.index);
      if (/I18N\.t\(\s*$/.test(before)) continue;
      const isToast = /notify\s*\(/.test(ln);
      hits.push({ line: i + 1, toast: isToast, text: s.slice(0, 70) });
      if (isToast) totalToast++; else totalUI++;
    }
  });
  if (hits.length) {
    filesWithHits++;
    report.push({ rel, hits });
  }
}

console.log('═══ i18n 누수 스캔 결과 ═══');
console.log(`대상 파일: ${TARGETS.length} | 누수 검출 파일: ${filesWithHits}`);
console.log(`[UI] 표시용 한글: ${totalUI} | [TOAST] notify 한글: ${totalToast}\n`);

report.sort((a, b) => b.hits.length - a.hits.length);
for (const { rel, hits } of report) {
  console.log(`── ${rel}  (${hits.length})`);
  const show = ALL ? hits : hits.slice(0, 12);
  for (const h of show) {
    console.log(`   ${rel}:${h.line}  ${h.toast ? '[TOAST]' : '[UI ]'}  ${h.text}`);
  }
  if (!ALL && hits.length > 12) console.log(`   … +${hits.length - 12} more (run with --all)`);
}
console.log('\n(제외: 주석·console.*·{ko,en} 데이터·한글 enum 토큰 / 데이터 사전은 비대상)');
