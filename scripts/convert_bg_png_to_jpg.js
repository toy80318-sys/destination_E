// img/bg/*.png → img/bg/*.jpg (overwrite old jpg) at 1600×900 mozjpeg q85
// 사용자가 새 PNG 배경을 업로드했을 때 1회 실행하여 jpg 교체 + 원본 png 제거
const sharp=require('sharp');
const fs=require('fs');
const path=require('path');
const DIR='img/bg';
const W=1600,H=900;
(async()=>{
  const pngs=fs.readdirSync(DIR).filter(f=>/^P\d+\.png$/i.test(f)&&f!=='P31.png');
  let bBefore=0,bAfter=0,n=0;
  for(const f of pngs){
    const pPng=path.join(DIR,f);
    const pJpg=path.join(DIR,f.replace(/\.png$/i,'.jpg'));
    const before=fs.statSync(pPng).size;
    bBefore+=before;
    try{
      const buf=await sharp(pPng)
        .resize(W,H,{fit:'cover',position:'center'})
        .jpeg({quality:85,mozjpeg:true,progressive:true})
        .toBuffer();
      fs.writeFileSync(pJpg,buf);
      const after=fs.statSync(pJpg).size;
      bAfter+=after;
      n++;
      fs.unlinkSync(pPng);  // 변환 성공 후 원본 png 제거
    }catch(e){
      console.log('ERR '+pPng+': '+e.message);
      bAfter+=before;
    }
  }
  const mb=b=>(b/1024/1024).toFixed(2);
  console.log(DIR+': converted='+n+' before='+mb(bBefore)+'MB after='+mb(bAfter)+'MB saved='+mb(bBefore-bAfter)+'MB');
})();
