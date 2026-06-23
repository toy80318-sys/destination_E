// 리치 포맷 보이스 매니페스트 생성기 (SSOT = 01_GDD/voice/voice_manifest.csv)
//   → js/data/voice-manifest.js : window.VOICE_MANIFEST[num] = {clip,clip_f?,clip_en,clip_en_f?,lang}
//     + window.VOICE_BYTEXT[norm(text)] = 동일 entry
//   ⚠ 구 scripts/gen-voice-manifest.js 는 drift(VOICE_TEXT2NUM, clip_en 없음) — 사용 금지. 이 스크립트가 정본.
//   norm() 은 js/modules/voice-player.js 의 norm() 과 1:1 동일.
//   사용법: node scripts/gen-voice-manifest-rich.js
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const CSV = path.join(ROOT, '01_GDD', 'voice', 'voice_manifest.csv');

function parseCsvLine(line) {
  const out = []; let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else { if (c === '"') q = true; else if (c === ',') { out.push(cur); cur = ''; } else cur += c; }
  }
  out.push(cur); return out;
}

// voice-player.js norm() 과 반드시 동일
function norm(t) {
  t = (t || '').replace(/\{\s*(사령관|commander)\s*\}/gi, '사령관');
  t = t.replace(/[\(\[\{][^\)\]\}]*[\)\]\}]/g, '');   // 지문/잔여 토큰 제거
  return t.replace(/[^가-힣A-Za-z0-9]/g, '');
}

const raw = fs.readFileSync(CSV, 'utf8').replace(/^﻿/, '');
const lines = raw.split(/\r?\n/).filter(function (l) { return l.length > 0; });

const MAN = {}, BYTEXT = {};
let n = 0, dup = 0, badPath = 0, byN = 0, byDup = 0, byEmpty = 0;
// 컬럼 고정: num,char,slug,clip,clip_f,clip_en,clip_en_f,lang,text (9열)
for (let i = 1; i < lines.length; i++) {
  const c = parseCsvLine(lines[i]);
  if (c.length < 9) { console.warn('컬럼부족(' + c.length + ')행 스킵: ' + lines[i].slice(0, 60)); continue; }
  const num = (c[0] || '').trim();
  const clip = (c[3] || '').trim();
  const clip_f = (c[4] || '').trim();
  const clip_en = (c[5] || '').trim();
  const clip_en_f = (c[6] || '').trim();
  const lang = (c[7] || 'ko').trim();
  const text = (c[8] || '');   // text 는 trim 하지 않음(원문 보존; norm 이 정규화)
  if (!num || !clip) continue;
  if (MAN[num]) dup++;
  if (clip.indexOf('02_Assets/audio/voice/') !== 0) badPath++;
  const entry = { clip: clip };
  if (clip_f) entry.clip_f = clip_f;
  if (clip_en) entry.clip_en = clip_en;
  if (clip_en_f) entry.clip_en_f = clip_en_f;
  entry.lang = lang;
  MAN[num] = entry;
  n++;
  // bytext: norm(text) → 동일 entry
  const k = norm(text);
  if (!k || k.length < 2) { byEmpty++; continue; }
  if (BYTEXT[k]) byDup++;   // 후자 우선(기존 빌드 동작 유지)
  BYTEXT[k] = entry;
  byN++;
}

const out = '// 자동생성 — KO남=clip,KO여=clip_f,EN남=clip_en,EN여=clip_en_f. bytext=지문/토큰 제거 정규화\n'
  + 'window.VOICE_MANIFEST = ' + JSON.stringify(MAN) + ';\n'
  + 'window.VOICE_BYTEXT = ' + JSON.stringify(BYTEXT) + ';\n';
fs.writeFileSync(path.join(ROOT, 'js', 'data', 'voice-manifest.js'), out, 'utf8');
console.log('생성: voice-manifest.js (리치) — manifest ' + n + '개(중복 ' + dup + ', 비표준경로 ' + badPath + ') · bytext ' + byN + '개(키중복 ' + byDup + ', 빈텍스트 ' + byEmpty + ')');
