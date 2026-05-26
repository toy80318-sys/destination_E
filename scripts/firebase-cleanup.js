#!/usr/bin/env node
// ──────────────────────────────────────────────────────────────────────
// Firebase Hosting 자동 정리 — 옛 release를 자동으로 제거해 storage quota 방지
//
// 동작:
//   1) gcloud로 fresh access token 발급
//   2) Hosting Versions REST API로 site의 모든 버전 조회
//   3) 최신 N개(기본 5)만 남기고 FINALIZED 상태의 옛 버전을 삭제
//   4) 현재 LIVE 버전은 보호
//
// 사용:
//   node scripts/firebase-cleanup.js          # 5개 유지 (기본)
//   node scripts/firebase-cleanup.js 3        # 3개만 유지
// ──────────────────────────────────────────────────────────────────────

const {execSync}=require('child_process');
const https=require('https');

const SITE_ID='cgstation-d8178';
const KEEP_COUNT=parseInt(process.argv[2]||'5',10);

function getToken(){
  return execSync('gcloud auth application-default print-access-token',{encoding:'utf8'}).trim();
}

function apiCall(method,path,token){
  return new Promise((resolve,reject)=>{
    const req=https.request({
      hostname:'firebasehosting.googleapis.com',
      path, method,
      headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'}
    },res=>{
      let body='';
      res.on('data',c=>body+=c);
      res.on('end',()=>{
        if(res.statusCode>=200&&res.statusCode<300){
          try{resolve(body?JSON.parse(body):{});}catch(e){resolve({raw:body});}
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });
    req.on('error',reject);
    req.end();
  });
}

(async()=>{
  console.log(`[firebase-cleanup] site=${SITE_ID} keep=${KEEP_COUNT}`);
  const token=getToken();

  // 1) 현재 LIVE 버전 조회 (release 정보)
  let liveVersionName=null;
  try{
    const r=await apiCall('GET',`/v1beta1/sites/${SITE_ID}/releases?pageSize=1`,token);
    if(r.releases&&r.releases[0]&&r.releases[0].version){
      liveVersionName=r.releases[0].version.name;
      console.log('[live]',liveVersionName);
    }
  }catch(e){console.warn('[warn] live 조회 실패',e.message);}

  // 2) 모든 버전 조회 (pagination 처리)
  let versions=[],pageToken='';
  while(true){
    const path=`/v1beta1/sites/${SITE_ID}/versions?pageSize=100${pageToken?'&pageToken='+pageToken:''}`;
    const r=await apiCall('GET',path,token);
    if(r.versions)versions=versions.concat(r.versions);
    if(!r.nextPageToken)break;
    pageToken=r.nextPageToken;
  }
  console.log(`[found] ${versions.length} versions`);

  // 3) FINALIZED 상태만 + createTime 내림차순 정렬
  const candidates=versions
    .filter(v=>v.status==='FINALIZED')
    .filter(v=>v.name!==liveVersionName)  // LIVE 보호
    .sort((a,b)=>new Date(b.createTime)-new Date(a.createTime));

  const toDelete=candidates.slice(KEEP_COUNT);
  console.log(`[plan] keep latest ${KEEP_COUNT}, delete ${toDelete.length} (live protected)`);

  // 4) 옛 버전 삭제 (병렬 5개씩)
  let done=0,fail=0;
  for(let i=0;i<toDelete.length;i+=5){
    const batch=toDelete.slice(i,i+5);
    await Promise.all(batch.map(async v=>{
      try{
        await apiCall('DELETE','/v1beta1/'+v.name,token);
        done++;
      }catch(e){
        fail++;
        console.warn('[del-fail]',v.name.split('/').pop(),e.message.slice(0,80));
      }
    }));
    if(done%20===0&&done>0)console.log(`[progress] ${done}/${toDelete.length}`);
  }
  console.log(`[done] deleted ${done}, failed ${fail}`);
})().catch(e=>{console.error('[fatal]',e.message);process.exit(1);});
