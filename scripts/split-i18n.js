#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════
// i18n 분리 마이그레이션 — js/data/i18n_dict.js({key:{ko,en}})
//   → i18n/ko.js · i18n/en.js (각 I18N.registerLocale('<lang>', {key:value}))
// 글로벌 표준: 로케일별 평면 사전. 언어 추가 = 파일 1개.
// 라운드트립 검증 포함(생성물이 원본과 키·값 100% 일치해야 PASS).
// 사용: node scripts/split-i18n.js          (생성 + 검증)
//       node scripts/split-i18n.js --check   (검증만, 파일 미생성)
// ═══════════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const CHECK_ONLY = process.argv.includes('--check');

// ── 1) 원본 i18n_dict.js 평가 → 병합 사전 캡처 ──
function loadDict(){
  const DICT = Object.create(null);
  const sb = {};
  sb.window = sb;
  sb.I18N = { register(d){ if(d) for(const k in d) DICT[k]=d[k]; }, registerLocale(){}, t(k){return k;}, getLang(){return 'ko';} };
  sb.console = console;
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(ROOT,'js/data/i18n_dict.js'),'utf8'), sb, 'i18n_dict.js');
  return DICT;
}

const DICT = loadDict();
const keys = Object.keys(DICT);
console.log('원본 키: ' + keys.length);

// ── 2) 로케일별 평면 사전 구성 ──
const locales = { ko:{}, en:{} };
let missKo=0, missEn=0;
for(const k of keys){
  const e = DICT[k] || {};
  if(e.ko!=null) locales.ko[k]=e.ko; else missKo++;
  if(e.en!=null) locales.en[k]=e.en; else missEn++;
}
console.log('ko 값: '+Object.keys(locales.ko).length+' (누락 '+missKo+') | en 값: '+Object.keys(locales.en).length+' (누락 '+missEn+')');

// ── 3) 로케일 파일 텍스트 생성 (키 1개/줄, JSON.stringify로 정확한 이스케이프) ──
function buildFile(lang){
  const obj = locales[lang];
  const body = Object.keys(obj).map(k => '  '+JSON.stringify(k)+': '+JSON.stringify(obj[k])).join(',\n');
  return '// DESTINATION EARTH — i18n locale: '+lang+'  (자동 생성: scripts/split-i18n.js)\n'
       + '// 언어 추가 시: 이 파일을 복사해 i18n/<lang>.js 로 만들고 값만 번역 → index.html 에 <script> 추가.\n'
       + '(function(){ if(!window.I18N||!I18N.registerLocale){ console.error("[i18n] registerLocale 미지원"); return; }\n'
       + 'I18N.registerLocale('+JSON.stringify(lang)+', {\n'+body+'\n});\n})();\n';
}

// ── 4) 라운드트립 검증: 생성 파일을 로드해 재구성 → 원본과 비교 ──
function roundTrip(koText, enText){
  const RB = Object.create(null);
  const sb = {};
  sb.window = sb;
  sb.console = console;
  sb.I18N = { registerLocale(lang,d){ for(const k in d){ if(!RB[k])RB[k]={}; RB[k][lang]=d[k]; } }, register(){}, };
  vm.createContext(sb);
  vm.runInContext(koText, sb, 'ko.js');
  vm.runInContext(enText, sb, 'en.js');
  // 비교
  let diff=0; const samples=[];
  for(const k of keys){
    const o=DICT[k]||{}, r=RB[k]||{};
    if((o.ko??null)!==(r.ko??null)){ diff++; if(samples.length<8)samples.push('ko '+k); }
    if((o.en??null)!==(r.en??null)){ diff++; if(samples.length<8)samples.push('en '+k); }
  }
  // 역방향: 생성물에만 있는 키
  for(const k of Object.keys(RB)){ if(!DICT[k]){ diff++; if(samples.length<8)samples.push('extra '+k); } }
  return { diff, samples, rbKeys:Object.keys(RB).length };
}

const koText = buildFile('ko');
const enText = buildFile('en');
const rt = roundTrip(koText, enText);
console.log('라운드트립 차이: '+rt.diff+(rt.diff?(' ⚠️ 샘플: '+rt.samples.join(', ')):' ✅ 원본과 100% 일치'));

if(rt.diff>0){ console.error('[FAIL] 라운드트립 불일치 — 파일 생성 중단'); process.exit(1); }

if(CHECK_ONLY){ console.log('(--check: 검증만 수행, 파일 미생성)'); process.exit(0); }

// ── 5) 파일 쓰기 ──
const outDir = path.join(ROOT,'i18n');
if(!fs.existsSync(outDir)) fs.mkdirSync(outDir, {recursive:true});
fs.writeFileSync(path.join(outDir,'ko.js'), koText);
fs.writeFileSync(path.join(outDir,'en.js'), enText);
console.log('✅ 생성: i18n/ko.js, i18n/en.js');
