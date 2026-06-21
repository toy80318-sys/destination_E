// 보이스 매니페스트 생성기 (SSOT = 01_GDD/voice/voice_manifest.csv)
//   → js/data/voice-manifest.js : window.VOICE_MANIFEST[num] = {slug, clip, lang}
//   지시서 음성연동 §2. 대사 식별은 num(문자열) 기준. 정적 <script> 로드용 window 전역.
//   사용법: node scripts/gen-voice-manifest.js
const fs=require('fs'), path=require('path');
const ROOT=path.join(__dirname,'..');
const CSV=path.join(ROOT,'01_GDD','voice','voice_manifest.csv');
function parseCsvLine(line){
  const out=[]; let cur='', q=false;
  for(let i=0;i<line.length;i++){
    const c=line[i];
    if(q){ if(c==='"'){ if(line[i+1]==='"'){cur+='"';i++;} else q=false; } else cur+=c; }
    else { if(c==='"')q=true; else if(c===','){out.push(cur);cur='';} else cur+=c; }
  }
  out.push(cur); return out;
}
// §7 미확정/구버전 — 음성 자동연결 제외(자막만): 마르코 301(텍스트 불칸 vs 구버전 음성 볼칸, 재녹음 대기)
const EXCLUDE_NUM=new Set(['301']);
// 런타임 텍스트 정규화 (voice-player._vnorm 과 동일)
function _vnorm(t){ if(!t)return '';
  return String(t).replace(/\([^)]*\)/g,'')
    .replace(/\{[^}]*\}/g,function(m){var k=m.slice(1,-1).toLowerCase();return (k==='commander'||k==='사령관')?'사령관':k==='함선'?'함선':k==='회사'?'회사':'';})
    .replace(/[^가-힣a-zA-Z0-9]/g,'').toLowerCase(); }
const raw=fs.readFileSync(CSV,'utf8').replace(/^﻿/,'');
const lines=raw.split(/\r?\n/).filter(Boolean);
const MAN={}, T2N={};
let n=0, dup=0, badPath=0, t2nN=0, t2nDup=0, excl=0;
// 컬럼: num,char,slug,clip,clip_f[,clip_en],lang,text — clip_en 유무로 행마다 컬럼수가 달라
// → lang=뒤에서 2번째, text=마지막으로 고정 파싱(clip_f=4 고정).
for(let i=1;i<lines.length;i++){
  const c=parseCsvLine(lines[i]);
  if(c.length<6)continue;
  const num=(c[0]||'').trim(), slug=(c[2]||'').trim(), clip=(c[3]||'').trim(), clip_f=(c[4]||'').trim();
  const lang=(c[c.length-2]||'ko').trim(), text=(c[c.length-1]||'').trim();
  if(!num||!clip)continue;
  if(MAN[num])dup++;
  if(clip.indexOf('02_Assets/audio/voice/')!==0)badPath++;   // 빌드 경로 검증
  MAN[num]= clip_f ? {slug, clip, clip_f, lang} : {slug, clip, lang};   // clip_f=여성 사령관 변형
  n++;
  // 텍스트→num 맵 (slug별) — vid 미주입 대사를 자막 원문으로 자동 매칭
  if(EXCLUDE_NUM.has(num)){ excl++; continue; }
  const norm=_vnorm(text);
  if(slug&&norm){ if(!T2N[slug])T2N[slug]={}; if(T2N[slug][norm]&&T2N[slug][norm]!==num)t2nDup++; T2N[slug][norm]=num; t2nN++; }
}
const out='// 자동 생성 — scripts/gen-voice-manifest.js (편집 금지). SSOT: 01_GDD/voice/voice_manifest.csv\n'
  +'// VOICE_MANIFEST[num]={slug,clip,clip_f?,lang}(clip_f=여성 사령관) · VOICE_TEXT2NUM[slug][정규화텍스트]=num\n'
  +'window.VOICE_MANIFEST='+JSON.stringify(MAN)+';\n'
  +'window.VOICE_TEXT2NUM='+JSON.stringify(T2N)+';\n';
fs.writeFileSync(path.join(ROOT,'js','data','voice-manifest.js'),out,'utf8');
console.log('생성: voice-manifest.js — manifest '+n+'개(중복 '+dup+', 비표준경로 '+badPath+') · text2num '+t2nN+'개(중복 '+t2nDup+', 제외 '+excl+')');
