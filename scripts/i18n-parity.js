#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════
// i18n 로케일 정합성 검사 — i18n/<lang>.js 파일들의 키 집합이 일치하는지 검증.
//   per-locale 구조의 약점(키를 한 언어에만 추가)을 잡아냄.
//   · 각 로케일에 누락된 키 보고
//   · 값이 키와 동일(미번역 추정)한 항목 보고
// 사용: node scripts/i18n-parity.js
// 종료코드: 누락 키가 있으면 1 (CI 게이트용)
// ═══════════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'i18n');
if (!fs.existsSync(DIR)) { console.error('[i18n-parity] i18n/ 폴더 없음'); process.exit(1); }

const files = fs.readdirSync(DIR).filter(f => /\.js$/.test(f));
if (!files.length) { console.error('[i18n-parity] 로케일 파일 없음'); process.exit(1); }

// 각 파일 로드 → registerLocale 캡처
const locales = {}; // lang → {key:val}
const sb = {};
sb.window = sb; sb.console = { log(){}, warn(){}, error(){} };
sb.I18N = { registerLocale(lang, d){ locales[lang] = Object.assign(locales[lang]||{}, d); }, register(){}, };
vm.createContext(sb);
for (const f of files) {
  try { vm.runInContext(fs.readFileSync(path.join(DIR, f), 'utf8'), sb, f); }
  catch (e) { console.error('[load-fail] ' + f + ' — ' + e.message.split('\n')[0]); }
}

const langs = Object.keys(locales);
console.log('로케일: ' + langs.join(', ') + ' (' + langs.length + '개)');

// 전체 키 합집합
const allKeys = new Set();
langs.forEach(l => Object.keys(locales[l]).forEach(k => allKeys.add(k)));
console.log('전체 고유 키: ' + allKeys.size);

let totalMissing = 0;
langs.forEach(l => {
  const have = new Set(Object.keys(locales[l]));
  const missing = [...allKeys].filter(k => !have.has(k));
  // 값이 키와 같음(미번역 추정)
  const untrans = Object.keys(locales[l]).filter(k => locales[l][k] === k);
  console.log('\n[' + l + '] 키 ' + have.size + ' / 누락 ' + missing.length + ' / 미번역(값=키) ' + untrans.length);
  if (missing.length) { totalMissing += missing.length; console.log('  누락: ' + missing.slice(0, 20).join(', ') + (missing.length > 20 ? ' …+' + (missing.length - 20) : '')); }
  if (untrans.length) console.log('  미번역: ' + untrans.slice(0, 10).join(', ') + (untrans.length > 10 ? ' …+' + (untrans.length - 10) : ''));
});

console.log('\n' + (totalMissing === 0 ? '✅ 모든 로케일 키 일치' : '⚠️ 누락 키 합계: ' + totalMissing));
process.exit(totalMissing === 0 ? 0 : 1);
