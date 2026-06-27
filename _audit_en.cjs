const fs=require('fs');
global.window={}; eval(fs.readFileSync('js/data/voice-manifest.js','utf8'));
const M=window.VOICE_MANIFEST||{};
let withEn=0, noEn=0;
let noEnButFileExists=[];   // clip_en 비었지만 voice_en 파일은 존재 → 연동만 하면 됨
let noEnNoFile=[];          // clip_en 비고 EN 파일도 없음 → EN 녹음 필요
for(const vid in M){
  const e=M[vid];
  if(e.clip_en){ withEn++; continue; }
  noEn++;
  // KO clip 경로 → voice_en 경로 추정
  const ko=e.clip||'';
  const enGuess=ko.replace('/voice/','/voice_en/');
  if(enGuess && fs.existsSync(enGuess)) noEnButFileExists.push(vid+'→'+enGuess.split('/').slice(-2).join('/'));
  else noEnNoFile.push(vid+' ('+(ko.split('/').slice(-2).join('/')||'?')+')');
}
console.log('=== clip_en 커버리지 ===');
console.log('clip_en 있음: '+withEn);
console.log('clip_en 없음: '+noEn);
console.log('  ├ EN 파일 존재(연동만 하면 됨): '+noEnButFileExists.length);
console.log('  └ EN 파일도 없음(녹음 필요): '+noEnNoFile.length);
console.log('');
console.log('--- [연동 누락] clip_en 비었지만 voice_en 파일 존재 (처음 40) ---');
noEnButFileExists.slice(0,40).forEach(x=>console.log('  '+x));
console.log('');
console.log('--- [EN 파일 없음] (처음 40) ---');
noEnNoFile.slice(0,40).forEach(x=>console.log('  '+x));
