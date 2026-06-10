// ──────────────────────────────────────────────────────────────────────
// img/ships/H/*.png (1024×1024 HD 원본) 기준으로 root + m/ 다른 사이즈 일괄 교체
//   · root img/ships/*.png   ← 400×400 max, palette PNG (전투 캔버스용)
//   · img/ships/m/*.png      ← 128×128 max, palette PNG (모바일 LOD)
//   · 사용자 요청 2026-06-10: "H 기준 교체 진행"
// ──────────────────────────────────────────────────────────────────────
const sharp=require('sharp');
const fs=require('fs');
const path=require('path');

const H_DIR='img/ships/H';
const ROOT_DIR='img/ships';
const M_DIR='img/ships/m';

const ROOT_SIZE=400;
const M_SIZE=128;

async function processOne(file){
  const src=path.join(H_DIR,file);
  const rootDst=path.join(ROOT_DIR,file);
  const mDst=path.join(M_DIR,file);
  const srcSize=fs.statSync(src).size;
  // root
  const rootBuf=await sharp(src)
    .resize(ROOT_SIZE,ROOT_SIZE,{fit:'inside',withoutEnlargement:true})
    .png({palette:true,quality:90,compressionLevel:9,effort:8})
    .toBuffer();
  fs.writeFileSync(rootDst,rootBuf);
  // mobile LOD
  const mBuf=await sharp(src)
    .resize(M_SIZE,M_SIZE,{fit:'inside',withoutEnlargement:true})
    .png({palette:true,quality:80,compressionLevel:9})
    .toBuffer();
  fs.writeFileSync(mDst,mBuf);
  return {file,srcSize,rootSize:rootBuf.length,mSize:mBuf.length};
}

(async()=>{
  if(!fs.existsSync(H_DIR)){console.error('H_DIR 없음:',H_DIR);process.exit(1);}
  if(!fs.existsSync(M_DIR))fs.mkdirSync(M_DIR,{recursive:true});
  const files=fs.readdirSync(H_DIR).filter(f=>/\.png$/i.test(f));
  console.log('처리 대상: '+files.length+'개');
  let tSrc=0,tRoot=0,tM=0,done=0,fail=0;
  for(const f of files){
    try{
      const r=await processOne(f);
      tSrc+=r.srcSize;tRoot+=r.rootSize;tM+=r.mSize;
      done++;
      if(done%10===0)console.log('  진행: '+done+'/'+files.length);
    }catch(e){
      console.warn('FAIL '+f+': '+e.message);
      fail++;
    }
  }
  const mb=b=>(b/1024/1024).toFixed(2);
  console.log('---');
  console.log('완료: '+done+'/'+files.length+' (실패 '+fail+')');
  console.log('합계 — H/(원본) '+mb(tSrc)+'MB → root '+mb(tRoot)+'MB + m/ '+mb(tM)+'MB');
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
