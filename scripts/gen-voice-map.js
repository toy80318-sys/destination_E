// 보이스 매핑 생성기 — voice_map_<char>.csv → js/data/voice-map.js
//   window.VOICE_MAP = { baekgu:{<정규화 텍스트>:'baekgu_001', ...}, commander:{...}, yisunsin:{...} }
//   정규화(_vnorm)는 AudioMgr.playVoice 의 런타임 정규화와 반드시 동일해야 함.
//   사용법: node scripts/gen-voice-map.js
const fs=require('fs'), path=require('path');
const ROOT=path.join(__dirname,'..');
const VOICE_DIR=path.join(ROOT,'01_GDD','voice');

// 런타임과 동일한 정규화 (combat.js _vnorm 과 1:1 일치 유지)
function _vnorm(t){
  if(!t)return '';
  return String(t)
    .replace(/\([^)]*\)/g,'')                                  // (지문) 제거
    .replace(/\{[^}]*\}/g,function(m){var k=m.slice(1,-1).toLowerCase();return (k==='commander'||k==='사령관')?'사령관':k==='함선'?'함선':k==='회사'?'회사':'';})
    .replace(/[^가-힣a-zA-Z0-9]/g,'')                  // 한글/영숫자만
    .toLowerCase();
}
// 따옴표 포함 CSV 한 줄 파싱
function parseCsvLine(line){
  const out=[]; let cur='', q=false;
  for(let i=0;i<line.length;i++){
    const c=line[i];
    if(q){ if(c==='"'){ if(line[i+1]==='"'){cur+='"';i++;} else q=false; } else cur+=c; }
    else { if(c==='"')q=true; else if(c===','){out.push(cur);cur='';} else cur+=c; }
  }
  out.push(cur); return out;
}
const CHARS=[
  {key:'baekgu',    csv:'voice_map_baekgu.csv'},
  {key:'commander', csv:'voice_map_commander.csv'},
  {key:'yisunsin',  csv:'voice_map_yisunsin.csv'},
];
const MAP={};
let total=0, dups=0;
CHARS.forEach(c=>{
  const p=path.join(VOICE_DIR,c.csv);
  if(!fs.existsSync(p)){ console.warn('[skip] '+c.csv+' 없음'); return; }
  const raw=fs.readFileSync(p,'utf8').replace(/^﻿/,'');
  const lines=raw.split(/\r?\n/).filter(Boolean);
  const m={};
  for(let i=1;i<lines.length;i++){ // 0=헤더
    const cols=parseCsvLine(lines[i]);
    const clipFile=(cols[0]||'').trim();          // baekgu_001.mp3
    const text=(cols[2]||'').trim();
    if(!clipFile||!text)continue;
    const clip=clipFile.replace(/\.mp3$/i,'');
    const norm=_vnorm(text);
    if(!norm)continue;
    if(m[norm]&&m[norm]!==clip)dups++;
    m[norm]=clip;
    total++;
  }
  MAP[c.key]=m;
  console.log('['+c.key+'] '+Object.keys(m).length+' 항목');
});
const out='// 자동 생성 — scripts/gen-voice-map.js (편집 금지). voice_map_<char>.csv 기반 대사↔클립 매핑.\n'
  +'// 정규화 텍스트 → 클립 basename(.mp3 제외). AudioMgr.playVoice 가 런타임에 동일 정규화로 조회.\n'
  +'window.VOICE_MAP='+JSON.stringify(MAP)+';\n';
const dest=path.join(ROOT,'js','data','voice-map.js');
fs.writeFileSync(dest,out,'utf8');
console.log('생성: js/data/voice-map.js (총 '+total+'행, 중복키 '+dups+')');
