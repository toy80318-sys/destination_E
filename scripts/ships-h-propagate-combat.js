// ──────────────────────────────────────────────────────────────────────
// img/ships/H/*.png (1024×1024 HD) 기준으로 전투 화면용 폴더도 일괄 교체
//   · img/combat/ships/*.png       — 400×400 max (아군·일반 함선)
//   · img/combat/ships/m/*.png     — 128×128 max (모바일 LOD)
//   · img/combat/enemies/*.png     — 400×400 max (적함 — 일부 함선만)
//   · img/combat/enemies/m/*.png   — 128×128 max (모바일 LOD)
//
// 사용자 요청 2026-06-10: "전투 화면에서도 새로운 함선 이미지가 나오도록"
// ──────────────────────────────────────────────────────────────────────
const sharp=require('sharp');
const fs=require('fs');
const path=require('path');

const H_DIR='img/ships/H';
const ROOT_SIZE=400;
const M_SIZE=128;

async function processOne(src, dst, size){
  if(!fs.existsSync(src))return null;
  const buf=await sharp(src)
    .resize(size,size,{fit:'inside',withoutEnlargement:true})
    .png({palette:true,quality: size>=300?90:80, compressionLevel:9, effort: size>=300?8:6})
    .toBuffer();
  fs.writeFileSync(dst,buf);
  return buf.length;
}

async function processDir(targetDir, mDir, isEnemies){
  if(!fs.existsSync(targetDir))fs.mkdirSync(targetDir,{recursive:true});
  if(!fs.existsSync(mDir))fs.mkdirSync(mDir,{recursive:true});
  // 적함 폴더는 기존 파일 목록만 처리 (READMEs 등 보존)
  const existingFiles=fs.readdirSync(targetDir).filter(f=>/\.png$/i.test(f));
  let done=0, fail=0, tRoot=0, tM=0;
  for(const f of existingFiles){
    const src=path.join(H_DIR,f);
    if(!fs.existsSync(src)){
      console.log('  H/ 미존재 → 스킵: '+f);
      continue;
    }
    try{
      const rootDst=path.join(targetDir,f);
      const mDst=path.join(mDir,f);
      const rootSize=await processOne(src, rootDst, ROOT_SIZE);
      const mSize=await processOne(src, mDst, M_SIZE);
      tRoot+=rootSize||0;
      tM+=mSize||0;
      done++;
    }catch(e){
      console.warn('  FAIL '+f+': '+e.message);
      fail++;
    }
  }
  return {done, fail, total:existingFiles.length, tRoot, tM};
}

(async()=>{
  if(!fs.existsSync(H_DIR)){console.error('H_DIR 없음:',H_DIR);process.exit(1);}
  console.log('=== img/combat/ships/ 처리 ===');
  const r1=await processDir('img/combat/ships','img/combat/ships/m',false);
  console.log('  '+r1.done+'/'+r1.total+' 처리 (실패 '+r1.fail+')');
  console.log('  root '+(r1.tRoot/1024/1024).toFixed(2)+'MB + m/ '+(r1.tM/1024/1024).toFixed(2)+'MB');

  console.log('=== img/combat/enemies/ 처리 ===');
  const r2=await processDir('img/combat/enemies','img/combat/enemies/m',true);
  console.log('  '+r2.done+'/'+r2.total+' 처리 (실패 '+r2.fail+')');
  console.log('  root '+(r2.tRoot/1024/1024).toFixed(2)+'MB + m/ '+(r2.tM/1024/1024).toFixed(2)+'MB');
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
