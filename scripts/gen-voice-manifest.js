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
const raw=fs.readFileSync(CSV,'utf8').replace(/^﻿/,'');
const lines=raw.split(/\r?\n/).filter(Boolean);
const MAN={};
let n=0, dup=0, badPath=0;
for(let i=1;i<lines.length;i++){ // 0=헤더 (num,char,slug,clip,lang,text)
  const c=parseCsvLine(lines[i]);
  const num=(c[0]||'').trim(), slug=(c[2]||'').trim(), clip=(c[3]||'').trim(), lang=(c[4]||'ko').trim();
  if(!num||!clip)continue;
  if(MAN[num])dup++;
  // 빌드 경로 검증: clip 은 02_Assets/audio/voice/ 하위여야 함
  if(clip.indexOf('02_Assets/audio/voice/')!==0)badPath++;
  MAN[num]={slug, clip, lang};
  n++;
}
const out='// 자동 생성 — scripts/gen-voice-manifest.js (편집 금지). SSOT: 01_GDD/voice/voice_manifest.csv\n'
  +'// 대사번호(num) → {slug, clip(02_Assets 상대경로), lang}. voice-player.playVoice(num) 가 조회.\n'
  +'window.VOICE_MANIFEST='+JSON.stringify(MAN)+';\n';
fs.writeFileSync(path.join(ROOT,'js','data','voice-manifest.js'),out,'utf8');
console.log('생성: js/data/voice-manifest.js — '+n+'개 (중복 num '+dup+', 비표준 경로 '+badPath+')');
