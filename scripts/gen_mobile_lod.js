// 모바일 LOD 이미지 생성 — 함선/캐릭터/파츠/UI 작은 사본 (128px 또는 96px)
// 출력: img/<dir>/m/<file> (예: img/ships/m/F01_S.png) — 원본의 ~30% 크기, 모바일 전용 사용
const sharp=require('sharp');
const fs=require('fs');
const path=require('path');

// 대상 디렉토리 + 모바일 목표 크기
const TARGETS=[
  {dir:'img/ships',      size:128, max:80},   // 함선 — 128×128 (전투 캔버스에서 작게 표시)
  {dir:'img/chars',      size:160, max:120},  // 캐릭터 초상 — 160×160
  {dir:'img/parts',      size:96,  max:48},   // 파츠 — 96×96
  {dir:'img/combat/ships', size:128, max:80}, // 전투 함선
  {dir:'img/combat/enemies', size:128, max:80}, // 적함
  {dir:'img/quests',     size:160, max:96},   // 퀘스트 아이콘
  {dir:'img/commodities',size:96,  max:48},   // 특산물
];

async function processDir({dir,size,max}){
  if(!fs.existsSync(dir))return null;
  const out=path.join(dir,'m');
  fs.mkdirSync(out,{recursive:true});
  const files=fs.readdirSync(dir).filter(f=>/\.(png|jpe?g)$/i.test(f));
  let bBefore=0,bAfter=0,n=0;
  for(const f of files){
    const sp=path.join(dir,f);
    const dp=path.join(out,f);
    const stat=fs.statSync(sp);
    bBefore+=stat.size;
    // 이미 매우 작은 파일은 그대로 복사 (재최적화 손실 방지)
    if(stat.size<5000){fs.copyFileSync(sp,dp);bAfter+=fs.statSync(dp).size;continue;}
    try{
      const isJpg=/\.jpe?g$/i.test(f);
      let p=sharp(sp).resize(size,size,{fit:'inside',withoutEnlargement:true});
      const buf=isJpg
        ? await p.jpeg({quality:78,mozjpeg:true,progressive:true}).toBuffer()
        : await p.png({palette:true,quality:80,compressionLevel:9}).toBuffer();
      fs.writeFileSync(dp,buf);
      bAfter+=fs.statSync(dp).size;
      n++;
    }catch(e){console.log('ERR '+sp+': '+e.message);}
  }
  return {dir,n,before:bBefore,after:bAfter,files:files.length};
}

(async()=>{
  const results=[];
  for(const t of TARGETS){
    const r=await processDir(t);
    if(r)results.push(r);
  }
  const mb=b=>(b/1024/1024).toFixed(2);
  let tB=0,tA=0;
  results.forEach(r=>{tB+=r.before;tA+=r.after;console.log(r.dir+' → '+r.dir+'/m  ('+r.n+'/'+r.files+' files): '+mb(r.before)+'MB → '+mb(r.after)+'MB');});
  console.log('=== TOTAL: '+mb(tB)+'MB → '+mb(tA)+'MB (saved '+mb(tB-tA)+'MB / -'+Math.round((1-tA/tB)*100)+'%) ===');
})();
