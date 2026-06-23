// ═══════════════════════════════════════════════════════════════════
// DESTINATION EARTH — PNG 이미지 경로 시스템 (함선/행성/크루/파츠 이미지 헬퍼) 모듈
//   · game.js 에서 분할 (2026-06-12, 사용자 요청: 긴 코드 분할)
//   · 모든 최상위 선언을 window.* 로 노출해 기존 호출처(전역 참조) 호환
// ═══════════════════════════════════════════════════════════════════
(function(){
if(typeof window==='undefined')return;
if(window._PNG_IMAGE_LOADED)return;
window._PNG_IMAGE_LOADED=true;

// ═══ PNG IMAGE SYSTEM ═══════════════════════════════════════════
// PNG 로드 실패시 이모지 폴백 헬퍼
// ── 로어 툴팁 텍스트 (아이템/함선/특산물/재료) ─────────────────────────
// ── LORE_TEXT: I18N 기반 자동 조회 (도감 묘사) ───────────────────────
// 키는 'part_W01' / 'ship_S05' / 'comm_G13' / 'mat_R02' 형태.
// 실제 ko/en 텍스트는 i18n_dict.js의 lore.<key> 엔트리에서 관리.
const LORE_TEXT=new Proxy({}, {
  get(_, key){
    if(typeof key!=='string')return '';
    return (typeof I18N!=='undefined')?I18N.t('lore.'+key):'';
  }
});

// ── 로어 툴팁 표시/숨김 함수 ─────────────────────────────────────────
function showLoreTip(key,evt){
  var lore=LORE_TEXT[key];
  if(!lore)return;
  var tip=document.getElementById('de-tooltip');
  if(!tip)return;
  tip.textContent=lore;
  tip.style.display='block';
  _posLoreTip(evt);
}
function _posLoreTip(evt){
  var tip=document.getElementById('de-tooltip');
  if(!tip||tip.style.display==='none')return;
  // 뷰포트 좌표를 스테이지 좌표로 변환 (transform:scale 보정)
  var stage=document.getElementById('game-stage');
  var sr=stage?stage.getBoundingClientRect():{left:0,top:0,right:window.innerWidth,bottom:window.innerHeight};
  var s=window._gsScale||1;
  var stageW=(sr.right-sr.left)/s, stageH=(sr.bottom-sr.top)/s;
  var sx=(evt.clientX-sr.left)/s, sy=(evt.clientY-sr.top)/s;
  tip.style.left=(sx+16)+'px';
  tip.style.top=(sy+16)+'px';
  // 측정 후 스테이지 경계 안으로 보정 — 단순 플립이 아니라 상·하·좌·우 모두 클램프해
  // 우측 끝 파츠에서 툴팁이 화면 밖으로 나가거나 꼭대기 위로 튀는 문제 방지
  requestAnimationFrame(function(){
    var r=tip.getBoundingClientRect();
    var tw=r.width/s, th=r.height/s;   // 스테이지 좌표계 기준 툴팁 크기
    var left=sx+16, top=sy+16;
    if(left+tw>stageW-8)left=sx-tw-12;  // 우측 넘침 → 커서 왼쪽으로
    if(top+th>stageH-8)top=sy-th-12;    // 하단 넘침 → 커서 위쪽으로
    left=clamp(left,8,stageW-tw-8);  // 좌/우 경계 클램프
    top=clamp(top,8,stageH-th-8);    // 상/하 경계 클램프
    tip.style.left=left+'px';
    tip.style.top=top+'px';
  });
}
function hideLoreTip(){
  var tip=document.getElementById('de-tooltip');
  if(tip)tip.style.display='none';
}

function imgOrEmoji(src,fallback,w,h,style,loreKey){
  w=w||80;h=h||80;
  // 사용자 요청 2026-06-14: w/h 가 문자열(CSS 값/var)이면 그대로 사용 — UI 튜너 토큰 연동
  var _wcss=(typeof w==='number')?w+'px':w;
  var _hcss=(typeof h==='number')?h+'px':h;
  var _fbFs=(typeof h==='number')?Math.round(h*0.5):24;
  // 캐시 버스터: src에 ?v= 없으면 _GAME_VER 자동 추가 (Firebase/CDN 캐시 우회)
  if(src&&typeof src==='string'&&src.indexOf('?v=')<0&&typeof window!=='undefined'&&window._GAME_VER&&!/^(https?:|data:|blob:)/i.test(src)){
    src=src+'?v='+encodeURIComponent(window._GAME_VER);
  }
  var tipAttr=loreKey?(' onmouseover="showLoreTip(\''+loreKey+'\',event)" onmouseout="hideLoreTip()"'):'';
  // 사용자 요청 2026-06-09: img/ships/H/ 폴더 우선 라우팅 시 onerror 폴백 추가.
  //   src 가 'img/ships/H/X.png' 형태면 onerror 시 'img/ships/X.png' 로 자동 폴백.
  var _fbSrc='';
  if(src && typeof src==='string'){
    var _hdMatch=src.match(/^img\/ships\/H\/([^/?]+\.png)(\?.*)?$/);
    if(_hdMatch){
      _fbSrc='img/ships/'+_hdMatch[1]+(_hdMatch[2]||'');
    }
  }
  var _onerror=_fbSrc
    ? "if(!this.dataset.fb){this.dataset.fb='1';this.src='"+_fbSrc.replace(/'/g,"\\'")+"';}else{this.style.display='none';}"
    : "this.style.display='none'";
  // 이미지가 로드되면 폴백 이모지(.fb)를 즉시 감추고, 로드 실패 시 이미지를 숨겨 폴백을 노출
  // (투명 PNG여도 이모지가 비치지 않도록 onload에서 fb를 display:none 처리)
  return `<div style="width:${_wcss};height:${_hcss};flex-shrink:0;position:relative;display:flex;align-items:center;justify-content:center;${style||''}"${tipAttr}>
    <div class="fb" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:${_fbFs}px;pointer-events:none">${fallback}</div>
    <img src="${src}" alt="" style="position:relative;width:100%;height:100%;object-fit:contain;z-index:1"
      onload="var fb=this.parentNode.querySelector('.fb');if(fb)fb.style.display='none';"
      onerror="${_onerror}">
  </div>`;
}
// 함선 → 도감 로어 키 (LORE_TEXT의 ship_<카탈로그id>).
// fleet 함선은 id 끝에 timestamp가 붙으므로 catalogId/catId 우선, 없으면 trailing _숫자 제거.
function shipLoreKey(ship){
  if(!ship)return null;
  if(ship.catalogId)return 'ship_'+ship.catalogId;
  if(ship.catId)return 'ship_'+ship.catId;
  const sid=String(ship.id||'');
  // 'CHIX_S_BUY_1700000000000' → 'CHIX_S_BUY' / 'S01_main' → 'S01' / 'CAP_123_456' → null
  if(sid.startsWith('CAP_')||sid.startsWith('DBR_')||sid.startsWith('BOSS')||sid.startsWith('HIDDEN_'))return null;
  return 'ship_'+sid.replace(/_(?:\d+|main)$/,'');
}
// 실재하는 함선 이미지(basename) 화이트리스트 — 잘못된 catId로 인한 404→UFO 이모지 폴백 방지.
// (img/ships/*.png 기준. 추가 시 여기도 갱신할 것)
window._SHIP_IMG_SET=window._SHIP_IMG_SET||new Set([
  'S00','S01','S02','S03','S04','S05','S06','S07','S08','S09','S10',
  'M01','M02','M03','M04','M05','M06','M07','M08','M09','M10',
  'H01','H02','H03','H04','H05','H06','H07','H08','H09','H10','H11','H12','H13','H14',
  'LGD01','LGD02','LGD03','LGD01_SP',
  'F01_S','F01_M','F01_L','F02_S','F02_M','F02_L','F03_S','F03_M','F03_L',
  'F04_S','F04_M','F04_L','F05_S','F05_M','F05_L','F06_S','F06_M','F06_L','F07_S','F07_M','F07_L',
  'CHIX_S','CHIX_M','CHIX_L','DBRP_S','DBRP_M','DBRP_L','PIRATE_S','PIRATE_M','PIRATE_L',
  'Boss','Default'
]);
// 함선 표시명 현재 언어로 재조회 — KO/EN 혼재 방지
//   · catalogId/catId/id 우선순위로 'ship.{id}.nm' i18n 키 조회
//   · 카탈로그 외 함선(나포·잔해·해적 등)이나 사용자 커스텀 함선명은 ship.nm 폴백
//   · 사용처: 함선 카드/명단/전투 라벨 등 표시 시점에 한 번 더 호출 → 언어 전환 후에도 일관성
function shipDisplayNm(s){
  if(!s)return '';
  try{
    if(s._nmKey&&I18N&&typeof I18N.has==='function'&&I18N.has(s._nmKey)){
      return I18N.t(s._nmKey,s._nmKeyParams||{});
    }
    const _id=String(s.catalogId||s.catId||(s.id||'').replace(/_(craft|quest|reward|recovered)_.+$/,'')||'').toUpperCase();
    if(_id){
      const _k='ship.'+_id+'.nm';
      if(I18N&&typeof I18N.has==='function'&&I18N.has(_k))return I18N.t(_k);
    }
  }catch(e){}
  return s.nm||'';
}
try{if(typeof window!=='undefined')window.shipDisplayNm=shipDisplayNm;}catch(e){}
// 상품/재료 표시명 현재 언어로 재조회 — KO/EN 혼재 방지
//   · c.id로 'commodity.{id}.nm' i18n 키 조회 (G01~G30, R01~R08 등)
//   · 사용처: 화물창/상점/제작 모달의 상품 카드
function commDisplayNm(c){
  if(!c)return '';
  try{
    const _id=String(c.id||'').toUpperCase();
    if(_id){
      const _k='commodity.'+_id+'.nm';
      if(I18N&&typeof I18N.has==='function'&&I18N.has(_k))return I18N.t(_k);
    }
  }catch(e){}
  return c.nm||'';
}
try{if(typeof window!=='undefined')window.commDisplayNm=commDisplayNm;}catch(e){}
// 파츠 표시명 현재 언어로 재조회 — KO/EN 혼재 방지
//   · p.id로 'part.{id}.nm' i18n 키 조회
function partDisplayNm(p){
  if(!p)return '';
  try{
    const _id=String(p.id||'').toUpperCase();
    if(_id){
      const _k='part.'+_id+'.nm';
      if(I18N&&typeof I18N.has==='function'&&I18N.has(_k))return I18N.t(_k);
      // 특수창고(SC) 파츠는 cargo.{id}.nm 키 사용 — 현재 언어로 정상 표시. 사용자 보고 2026-06-14
      const _kc='cargo.'+_id+'.nm';
      if(I18N&&typeof I18N.has==='function'&&I18N.has(_kc))return I18N.t(_kc);
    }
  }catch(e){}
  return p.nm||'';
}
// 전설/신화 함선·파츠의 제작 재료 표기 문자열 (설명에 추가). 사용자 요청 2026-06-14
function craftMatsText(id){
  try{
    if(typeof CRAFT_RECIPES==='undefined')return '';
    const rec=CRAFT_RECIPES.find(r=>r.id===id);
    if(!rec||!rec.mats||!rec.mats.length)return '';
    const parts=rec.mats.map(function(m){
      const c=(typeof COMMODITIES!=='undefined')?COMMODITIES.find(x=>x.id===m.id):null;
      const nm=(c&&typeof commDisplayNm==='function')?commDisplayNm(c):m.id;
      return (c&&c.ic?c.ic:'')+nm+'×'+m.qty;
    });
    return parts.join(', ');
  }catch(e){return '';}
}
try{if(typeof window!=='undefined')window.partDisplayNm=partDisplayNm;}catch(e){}
try{if(typeof window!=='undefined')window.craftMatsText=craftMatsText;}catch(e){}
// 크루 표시명 현재 언어로 재조회 — KO/EN 혼재 방지
//   · 영웅(H01~H08): hero.{id}.nm 키 조회
//   · 퀘스트 전설 크루(QL01~QL05): quest.crew.{id}.nm 키 조회
//   · 일반 NPC 크루: c.nm 폴백 (i18n 키 없음)
function crewDisplayNm(c){
  if(!c)return '';
  try{
    // 1순위: 명시적 _nmKey (NPC_POOL/QL 모집 시 부여) → 표시 시점 언어로 재조회
    if(c._nmKey&&I18N&&typeof I18N.has==='function'&&I18N.has(c._nmKey))return I18N.t(c._nmKey);
    const cid=String(c.id||'');
    if(I18N&&typeof I18N.has==='function'){
      // 영웅: H0X
      if(/^H0\d$/.test(cid)&&I18N.has('hero.'+cid+'.nm'))return I18N.t('hero.'+cid+'.nm');
      // 퀘스트 전설 크루: 모집 시 id가 QL0X_g<timestamp>_<pull> 형태로 바뀌므로 prefix 매칭
      //   사용자 보고 (2026-06-06): 한글판에서 전설 크루 이름이 영어로 표시되던 원인
      const _qlMatch=cid.match(/^(QL0\d)(?:_|$)/);
      if(_qlMatch&&I18N.has('quest.crew.'+_qlMatch[1]+'.nm'))return I18N.t('quest.crew.'+_qlMatch[1]+'.nm');
    }
  }catch(e){}
  return c.nm||'';
}
try{if(typeof window!=='undefined')window.crewDisplayNm=crewDisplayNm;}catch(e){}
// catId/catalogId/id → 실재 함선 이미지 basename 정규화 (해당 없으면 null).
// CHIX_1·CHIX_PATROL·CAP_*·DBR_* 등 비표준 식별자도 팩션·티어로 보정한다.
function _resolveShipImgBase(raw,tier){
  if(raw==null)return null;
  const S=window._SHIP_IMG_SET;
  const sz={'소형':'S','중형':'M','대형':'L','전설기함':'L','신화':'L'}[tier]||'S';
  let c=String(raw).replace(/_BUY$/i,'');
  if(S.has(c))return c;
  const c2=c.replace(/(?:_\d{3,}|_main)$/i,''); // 인스턴스 timestamp 접미사 제거 후 재시도
  if(S.has(c2))return c2;
  const fm=c.match(/^(F0[1-7])_([SMLsml])/);    // 문명권 함선 앞 두 토큰 보존
  if(fm){const b=fm[1].toUpperCase()+'_'+fm[2].toUpperCase();if(S.has(b))return b;}
  if(/^CHIX/i.test(c)&&S.has('CHIX_'+sz))return 'CHIX_'+sz;        // 치크스 계열
  if(/^DBRP?/i.test(c)&&S.has('DBRP_'+sz))return 'DBRP_'+sz;       // 잔해 계열
  if(/^PIRATE/i.test(c)&&S.has('PIRATE_'+sz))return 'PIRATE_'+sz;  // 해적 계열
  return null;
}
function shipImgSrc(ship){
  // 모바일 LOD 자동 적용 — 마지막에 _mobileLod() 거쳐 반환
  const _wrap=(s)=>(typeof window!=='undefined'&&window._mobileLod)?window._mobileLod(s):s;
  const _r=_shipImgSrcRaw(ship);
  // 사용자 요청 2026-06-09: HD 폴더(img/ships/H/) 우선 활용
  //   · 데스크탑/PC: HD 시도 (5~8MB 고해상도 신규 자산)
  //   · 모바일: 기존 m/ LOD 사용 (HD 미적용 — 대역폭/메모리 보호)
  //   · onerror 시 자동 폴백을 위해 raw 경로를 dataset 으로 보존
  if(typeof window!=='undefined' && window.IS_MOBILE){
    // 모바일은 기존 경로 그대로 (m/ 자동 폴백)
    return _wrap(_r);
  }
  // HD 우선 시도 — _r 이 'img/ships/X.png?v=Y' 형태일 때 'img/ships/H/X.png?v=Y' 로 변환
  if(_r && typeof _r==='string'){
    const _hd=_r.replace(/^img\/ships\/([^/?]+\.png)(\?|$)/, 'img/ships/H/$1$2');
    if(_hd!==_r){
      // HD 경로 + onerror 폴백은 호출 측 imgOrEmoji onerror 체인에서 처리되므로,
      // 여기서는 HD 경로만 반환. 만약 HD 파일이 없다면 imgOrEmoji 의 onerror 가
      // 원본 _r 경로로 폴백하도록 별도 dataset 도움이 필요. → window._SHIPS_H_FB 등록.
      try{
        if(!window._SHIPS_H_FB)window._SHIPS_H_FB={};
        window._SHIPS_H_FB[_hd]=_r;  // HD → 원본 매핑
      }catch(e){}
      return _wrap(_hd);
    }
  }
  return _wrap(_r);
}
function _shipImgSrcRaw(ship){
  const sid=ship.id||'';
  const nm=(ship.nm||'').toLowerCase();
  // 캐시 버스터: Firebase hosting 이 png 24h 캐시 → 이미지 갱신 시 _GAME_VER 변경으로 강제 새로고침
  const _ver=(typeof window!=='undefined'&&window._GAME_VER)?('?v='+encodeURIComponent(window._GAME_VER)):'';
  // 디스트로이 스타(히든 유니크) — 볼티움(P09) 행성 이미지를 함선 이미지로 사용. img/planets/ 경로라 HD(img/ships/H/) 라우팅 자동 우회. 사용자 요청 2026-06-22.
  // ※ 스킨(_skinCatId) 적용 시엔 P09 기본을 건너뛰고 아래 스킨 분기로 떨어진다(스킨 우선). 버그수정 2026-06-24.
  if(!ship._skinCatId&&((ship.catalogId||ship.catId||ship.id||'').toString().toUpperCase().indexOf('DESTROYER_STAR')>-1||ship._destroyerStar))return 'img/planets/P09.png'+_ver;
  // 스킨(홀로그램) 외관 우선 — 능력치는 그대로, 이미지만 다른 함선의 것을 사용
  if(ship._skinCatId){
    const _sk=String(ship._skinCatId).toUpperCase();
    // URSA → Boss.png 별칭 매핑 (실제 파일명이 다름)
    if(_sk==='URSA'||_sk==='BOSS')return 'img/ships/Boss.png'+_ver;
    if(_sk==='BLACKFALCON'||_sk==='VOIDFALCON'||_sk==='HIDDEN_FALCON')return 'img/ships/S10.png'+_ver;
    return 'img/ships/'+ship._skinCatId+'.png'+_ver;
  }
  // 치크스 함선은 티어별 이미지(CHIX_S/M/L)만 존재 → 티어 접미사 자동 부여
  const _chixByTier=()=>'img/ships/CHIX_'+({'소형':'S','중형':'M','대형':'L','전설기함':'L','신화':'L'}[ship.tier]||'S')+'.png'+_ver;
  // 0) 우르사 메이저 보스 본체/나포 — 항상 Boss.png 우선
  //    ※ catalogId='URSA' 또는 id가 'BOSS_URSA'/'URSA'/'BOSS'/'BOSS_MAIN'으로 시작하는 경우만
  //    ※ 카탈로그 H12(우르사 파쇄기)는 catalogId='URSA'가 아니므로 자동 제외 → H12.png 사용
  if((ship.catalogId||'').toUpperCase()==='URSA'
     ||sid.startsWith('BOSS_URSA')||sid==='URSA'||sid==='BOSS'||sid==='BOSS_MAIN')
    return 'img/ships/Boss.png'+_ver;
  // 0-2) 블랙팔콘 / 보이드 팔콘 / 검은 팔콘(보이드 시험 보상) — 모두 S10.png 공용
  if((ship.catalogId||'').toUpperCase()==='BLACKFALCON'
     ||(ship.catalogId||'').toUpperCase()==='VOID_FALCON'
     ||(ship.catalogId||'').toUpperCase()==='HIDDEN_FALCON'
     ||sid.startsWith('CAP_BLACKFALCON')||sid.startsWith('CAP_VOIDFALCON')
     ||sid.startsWith('VOID_FALCON')||sid.startsWith('BLACKFALCON')
     ||sid.startsWith('HIDDEN_FALCON')
     ||ship._isVoidFalconCaptured||ship._isHiddenFalcon
     ||(ship.catId==='S10'&&(nm.includes('팔콘')||nm.includes('블랙')||nm.includes('falcon')||nm.includes('black')))
     ||nm.includes('블랙팔콘')||nm.includes('검은 팔콘')||nm.includes('다크팔콘')
     ||nm.includes('black falcon')||nm.includes('dark falcon')||nm.includes('blackfalcon'))
    return 'img/ships/S10.png'+_ver;
  // 1) 명시적 catalogId / catId → 실재 파일로 정규화.
  //    CHIX_S_BUY('_BUY' 접미사), CHIX_1/CHIX_PATROL(비표준 적 식별자), F0X 인스턴스 등을
  //    _resolveShipImgBase 가 흡수해 항상 존재하는 basename 으로 매핑한다. 매핑 실패 시
  //    아래 이름 기반/기본 폴백으로 진행해 UFO 이모지(404)를 방지한다.
  if(ship.catalogId){
    if(/^CHIX$/i.test(ship.catalogId))return _chixByTier();
    const _b=_resolveShipImgBase(ship.catalogId,ship.tier);
    if(_b)return 'img/ships/'+_b+'.png'+_ver;
  }
  if(ship.catId){
    if(/^CHIX$/i.test(ship.catId))return _chixByTier();
    const _b=_resolveShipImgBase(ship.catId,ship.tier);
    if(_b)return 'img/ships/'+_b+'.png'+_ver;
  }
  // 2) 나포(CAP_)·회수(DBR_) 등 인스턴스 함선 + 팩션명 함선 — 이름으로 팩션 추정 후 티어별 이미지.
  //    catId가 없거나(구세이브) 카탈로그 이미지를 직접 못 찾는 경우까지 흡수해 UFO 폴백 방지.
  //    치크스→CHIX, 잔해→DBRP, 해적→PIRATE, 그 외 CAP_→PIRATE, DBR_→DBRP.
  {
    const faction=nm.includes('치크스')||nm.includes('chix')||nm.includes('chiks')?'CHIX':
                  nm.includes('잔해')||nm.includes('dbrp')||nm.includes('salvage')||nm.includes('debris')||nm.includes('recovered')||nm.includes('회수')?'DBRP':
                  nm.includes('해적')||nm.includes('pirate')||nm.includes('raider')||nm.includes('약탈')?'PIRATE':
                  sid.startsWith('CAP_')?'PIRATE':
                  sid.startsWith('DBR_')?'DBRP':null;
    if(faction){
      const sz={'소형':'S','중형':'M','대형':'L','전설기함':'L','신화':'L'}[ship.tier]||'S';
      return 'img/ships/'+faction+'_'+sz+'.png'+_ver;
    }
  }
  // 3) id 기반 정규화 (CHIX_*, F0X_*, 일반 카탈로그 id의 인스턴스 접미사 제거)
  if(/^CHIX_/i.test(sid)||/^CHIX$/i.test(sid))return _chixByTier();
  const _bid=_resolveShipImgBase(sid,ship.tier);
  if(_bid)return 'img/ships/'+_bid+'.png'+_ver;
  // 4) 최종 폴백: 존재가 보장된 Default.png (어떤 경우에도 UFO 이모지 대신 함선 실루엣 표시)
  return 'img/ships/Default.png'+_ver;
}
// 행성 아이콘(원형 PNG): P31은 해방 후 P31_free.png 시도 (없으면 onerror로 P31.png fallback)
function planetImgSrc(pid){
  // P31_free.png는 옵션 파일 — 없으면 기본 P31.png 사용 (이미지가 추가되면 자동으로 활성)
  // imgOrEmoji/직접 <img>가 onerror 폴백을 처리하지만, 누락 파일에 대한 사전 차단도 한다
  const _v=(typeof window!=='undefined'&&window._GAME_VER)?('?v='+encodeURIComponent(window._GAME_VER)):'';
  if(pid==='P31'&&typeof _isEarthFree==='function'&&_isEarthFree()){
    if(typeof window!=='undefined'){
      if(window._P31_FREE_AVAIL===true)return 'img/planets/P31_free.png'+_v;
      if(window._P31_FREE_AVAIL===undefined){
        // 한 번만 존재 여부 검사 (HEAD 대신 Image 객체로 비동기 검증)
        window._P31_FREE_AVAIL=false;
        const _t=new Image();
        _t.onload=()=>{window._P31_FREE_AVAIL=true;};
        _t.onerror=()=>{window._P31_FREE_AVAIL=false;};
        _t.src='img/planets/P31_free.png'+_v;
      }
    }
  }
  return `img/planets/${pid||'P01'}.png`+_v;
}
// 행성 배경 이미지 경로 — P31(지구)은 해방 후 _free 변형 자동 사용 (해당 파일 없으면 기본으로 fallback)
// 파일 형식: P01-P30 = .jpg, P31(봉쇄) = .png, P31_free = .jpg
// 해방 판정: _earthLiberated || ACT>=4 || 우르사 나포함 보유 (어느 하나라도 충족)
function _isEarthFree(){
  if(!G)return false;
  if(G._earthLiberated)return true;
  if((G.act||0)>=4)return true;
  const _has=(arr)=>(arr||[]).some(s=>s&&s.id&&s.id.startsWith('BOSS_URSA'));
  if(_has(G.fleet)||_has(G.reserveFleet))return true;
  return false;
}
// 보스 트리거 게이트 전용 — _isEarthFree보다 엄격. _earthLiberated만 true이고 실제 격파 증거가 없으면
// (구버전 세이브 손상·치트 흔적 등) 보스를 다시 트리거하여 "지구 입장했는데 보스가 안 뜨는" 버그 차단.
// 인정 증거: BOSS_URSA 나포함 보유 OR 엔딩 시청 이력(_endingShown).
function _isUrsaDefeated(){
  if(!G)return false;
  const _has=(arr)=>(arr||[]).some(s=>s&&s.id&&s.id.startsWith('BOSS_URSA'));
  if(_has(G.fleet)||_has(G.reserveFleet))return true;
  if(G._endingShown)return true;
  return false;
}
function planetBgSrc(pid){
  const _ver=(typeof window!=='undefined'&&window._GAME_VER)?('?v='+encodeURIComponent(window._GAME_VER)):'';
  // 게임 시작 첫 화면: P01 오프닝 배경(P00.jpg) — 첫 턴 진행 전까지만. 이후 본래 배경(P01.jpg).
  if(pid==='P01'&&typeof G!=='undefined'&&G&&(G.turn||0)===0&&!G._introBgDone){
    const _is='img/bg/P00.jpg'+_ver;
    return (typeof window!=='undefined'&&window._mobileLod)?window._mobileLod(_is):_is;
  }
  const _src=(pid==='P31')
    ?(_isEarthFree()?'img/bg/P31_free.jpg':'img/bg/P31.png')+_ver
    :'img/bg/'+(pid||'P01')+'.jpg'+_ver;
  return (typeof window!=='undefined'&&window._mobileLod)?window._mobileLod(_src):_src;
}
// onerror 폴백 — .jpg가 없으면 .png 시도, 그것도 없으면 기본 배경
function planetBgFallback(pid){
  const _ver=(typeof window!=='undefined'&&window._GAME_VER)?('?v='+encodeURIComponent(window._GAME_VER)):'';
  const _src='img/bg/'+(pid||'P01')+'.png'+_ver;
  return (typeof window!=='undefined'&&window._mobileLod)?window._mobileLod(_src):_src;
}
function partImgSrc(partId){
  const _ver=(typeof window!=='undefined'&&window._GAME_VER)?('?v='+encodeURIComponent(window._GAME_VER)):'';
  const _src=`img/parts/${partId||'generic'}.png`+_ver;
  return (typeof window!=='undefined'&&window._mobileLod)?window._mobileLod(_src):_src;
}
// 사용자 요청 2026-06-09: 해적 전투 이벤트 시 combat_FF01~FF08 이미지 추가 활용
//   · 기존 행성 팩션별(combat_F01~F07) 이미지 외에 해적 전용 변주 7종(FF06 누락)
//   · 50% 확률로 해적 전용 이미지 사용 → 시각적 다양성 + "해적" 식별성 강화
const _PIRATE_FF_POOL=['FF01','FF02','FF03','FF04','FF05','FF07','FF08'];
function pirateCombatImg(pd){
  const _ver=(typeof window!=='undefined'&&window._GAME_VER)?('?v='+encodeURIComponent(window._GAME_VER)):'';
  // 50% 확률로 해적 전용 풀에서 랜덤 선택
  if(Math.random()<0.5){
    const _ff=_PIRATE_FF_POOL[Math.floor(Math.random()*_PIRATE_FF_POOL.length)];
    return 'img/quests/combat_'+_ff+'.png'+_ver;
  }
  // 그 외 50% — 행성 팩션 기반 (기존 동작)
  const _pf=(/^F0[1-7]$/.test(pd?.f||''))?pd.f:'F01';
  return 'img/quests/combat_'+_pf+'.png'+_ver;
}
try{if(typeof window!=='undefined')window.pirateCombatImg=pirateCombatImg;}catch(e){}

// 사용자 요청 2026-06-09: 설계도 보상 이미지 표준화
//   · 함선 설계도 (LGD01~LGD03 등) → img/ui/BP01.png
//   · 그 외(파츠 설계도: RB10, MW01, ML06, SW01 등) → img/ui/BP02.png
function bpImgSrc(bpId,explicitType){
  const _ver=(typeof window!=='undefined'&&window._GAME_VER)?('?v='+encodeURIComponent(window._GAME_VER)):'';
  // explicitType 우선 ('ship' / 'part')
  if(explicitType==='ship')return 'img/ui/BP01.png'+_ver;
  if(explicitType==='part')return 'img/ui/BP02.png'+_ver;
  // bpId prefix 로 자동 분류 — LGD = 신화 함선
  if(typeof bpId==='string'&&/^LGD\d/.test(bpId))return 'img/ui/BP01.png'+_ver;
  // 그 외 모두 파츠 설계도
  return 'img/ui/BP02.png'+_ver;
}
try{if(typeof window!=='undefined')window.bpImgSrc=bpImgSrc;}catch(e){}
function crewImgSrc(c){
  const _gameVer=(typeof window!=='undefined'&&window._GAME_VER)?('?v='+encodeURIComponent(window._GAME_VER)):'';
  if(!c)return`img/quests/explore_F01.png`+_gameVer;
  // 전설 영웅(8인)은 전용 초상(hero01~08) 사용 — 크루 배치 목록 등에서 캐릭터 이미지 정상 표시
  const _isHero=c.isHero||(c.id&&typeof HEROES!=='undefined'&&HEROES[c.id]);
  if(_isHero){
    // 1순위: 영웅 ID 기반 매핑 — 언어 무관 (EN/KO 모두 동일하게 hero01~08.png)
    //   c.id 또는 c._heroRoll(가챠 결과) 어느 쪽이든 매칭
    const _hid=c.id||c._heroRoll;
    let _h=(_hid&&typeof HERO_PORTRAITS_BY_ID!=='undefined'&&HERO_PORTRAITS_BY_ID[_hid])||null;
    // 2순위: 한국어 이름 기반 (KO 모드 호환). EN 모드에선 c.nm가 영문이라 매칭 실패해도 위에서 처리됨.
    if(!_h&&c.nm&&typeof CHAR_PORTRAITS!=='undefined')_h=CHAR_PORTRAITS[c.nm]||null;
    if(_h){const _hv=_h+_gameVer;return (typeof window!=='undefined'&&window._mobileLod)?window._mobileLod(_hv):_hv;}
  }
  // 일반 크루 초상: 퀘스트 의뢰 이미지 임시 매핑(_crewQuestImg)으로 통일 — 명단·가챠 영입·함선 배치 모두 동일
  const _srcRaw=(typeof _crewQuestImg==='function')?_crewQuestImg(c):`img/crew/${c.cl||'Merch'}_m.png`;
  const _src=(_srcRaw&&_srcRaw.indexOf('?v=')<0)?(_srcRaw+_gameVer):_srcRaw;
  return (typeof window!=='undefined'&&window._mobileLod)?window._mobileLod(_src):_src;
}
function commImgSrc(cid){
  const _ver=(typeof window!=='undefined'&&window._GAME_VER)?('?v='+encodeURIComponent(window._GAME_VER)):'';
  const _src=`img/commodities/${cid||'generic'}.png`+_ver;
  return (typeof window!=='undefined'&&window._mobileLod)?window._mobileLod(_src):_src;
}
// ── mkThumb (기존 호환) ──────────────────────────────────────────
function mkThumb(emoji,bg,size){
  bg=bg||'#0d1a2a';size=size||76;
  const fs=Math.round(size*.44);
  return `<div style="width:${size}px;height:${size}px;background:${bg};border:1px solid var(--bdr);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:${fs}px;flex-shrink:0;overflow:hidden">${emoji}</div>`;
}
// 카테고리별 이미지 이모지
const CAT_EMOJI={weapon:'⚔️',shield:'🛡️',armor:'🪖',engine:'⚡'};
const TIER_EMOJI={소형:'🛸',중형:'🚀',대형:'🛕',신화:'✦',전설기함:'🏮'};
const FACTION_EMOJI={SF:'🌀',UN:'🌍',MA:'☄️',VX:'💀'};
// 적 전투력 배율: easy -20%, normal 기준, hard +20%, extreme +50%
function getDiffMult(){return{easy:0.25,normal:1.0,hard:1.2,extreme:1.5}[G.difficulty]||1.0;}
// 보상 배율: easy +10%, normal 기준, hard -10%, extreme -20%
function getDiffRewardMult(){return{easy:1.1,normal:1.0,hard:0.9,extreme:0.8}[G.difficulty]||1.0;}
// 통합 보상 배율 (레벨 × 난이도)
function getTotalRewardMult(){return Math.round(getRewardMult()*getDiffRewardMult()*10)/10;}
// 극악 난이도: 적 함선 수 3배 (200% 더 많음)
function getDiffCountMult(){return G.difficulty==='extreme'?3.0:G.difficulty==='hard'?1.3:G.difficulty==='easy'?0.8:1.0;}
// ── 플레이어 내부 레벨 (1~100) ─────────────────────────────────
// 자본 40점 + 함대 25점 + 행성 20점 + 영웅 10점 + 크루 5점 = 100점
function calcPlayerLevel(){
  const creditScore =Math.min(400,Math.floor(G.credits/75000));         // ₡0→0, ₡30M→400
  const fleetScore  =Math.min(250,Math.max(0,(G.fleet.length-1)*30));   // 1척→0, 9척→240
  const planetScore =Math.min(200,Object.values(G.planets).filter(p=>p.owned).length*40); // 5개→200
  const heroScore   =Math.min(100,G.heroes.length*12.5);                // 8명→100
  const crewScore   =Math.min(50, Math.floor(G.crew.length/3)*10);      // 15명→50
  return clamp(Math.round(creditScore+fleetScore+planetScore+heroScore+crewScore),1,1000);
}
// 레벨 기반 적 강화 배율: 플레이어 전투력 상승에 비례해 적 ATK·HP 증가.
// sqrt 곡선(체감 감소): 초반은 선형과 유사, 후반에 폭주 방지
//   lv1→×1.00, lv100→×1.31, lv300→×1.55, lv500→×1.71, lv700→×1.84,
//   lv1000→×2.00 (기존 ×4.00 대비 50%), lv2000→×2.41
// — 사용자 피드백: 링7(전투력 1000+)에서 적이 너무 강해 50%로 완화
function getLevelMult(){
  const lv=calcPlayerLevel();
  return 1.0 + Math.sqrt(Math.max(0,lv-1)/1000);
}
// ── 적 함선 스펙 미리보기 HTML 생성 (전투 직전 모달용) ────────────────────
function _formatEnemyPreview(enemies,opts){
  if(!enemies||!enemies.length)return'';
  opts=opts||{};
  // 동일 스탯끼리 그룹화 (HP/ATT/INT/TEC + tier)
  const groups={};
  enemies.forEach(e=>{
    const k=`${e.tier||'-'}|${e.maxHP||e.HP||0}|${e.maxSH||0}|${e.ATT||0}|${e.INT||0}|${e.TEC||0}`;
    if(!groups[k])groups[k]={tier:e.tier||'-',hp:e.maxHP||e.HP||0,sh:e.maxSH||0,atk:e.ATT||0,intl:e.INT||0,tec:e.TEC||0,nms:[],cnt:0};
    groups[k].cnt++;
    if(!groups[k].nms.includes(e.nm))groups[k].nms.push(e.nm);
  });
  const _plv=calcPlayerLevel();
  const fp=calcFleetAvgPower();
  const rows=Object.values(groups).map(g=>{
    const lbl=g.cnt>1?`${g.nms[0]} ×${g.cnt}`:g.nms[0]||g.tier;
    const hpRatio=fp.hp>0?(g.hp/fp.hp):1;
    const atkRatio=fp.atk>0?(g.atk/fp.atk):1;
    const hpCol=hpRatio>=1.2?'var(--red)':hpRatio>=0.85?'var(--yellow)':'var(--green)';
    const atkCol=atkRatio>=1.2?'var(--red)':atkRatio>=0.85?'var(--yellow)':'var(--green)';
    return`<tr style="border-top:1px solid rgba(255,255,255,.05)">
      <td style="padding:4px 6px;color:var(--txt);font-size:12px">${lbl}<div style="font-size:10px;color:var(--dim)">${I18N.tier(g.tier)}</div></td>
      <td style="padding:4px 6px;font-size:12px;color:${hpCol};text-align:right">${g.hp.toLocaleString()}<span style="color:var(--dim)">/${g.sh.toLocaleString()}</span></td>
      <td style="padding:4px 6px;font-size:12px;color:${atkCol};text-align:right">${g.atk}</td>
      <td style="padding:4px 6px;font-size:12px;color:var(--purple);text-align:right">${g.intl}</td>
      <td style="padding:4px 6px;font-size:12px;color:var(--cyan);text-align:right">${g.tec}</td>
    </tr>`;
  }).join('');
  const total=enemies.length;
  const totHP=enemies.reduce((s,e)=>s+(e.maxHP||e.HP||0),0);
  const totATK=enemies.reduce((s,e)=>s+(e.ATT||0),0);
  return`<div style="background:rgba(255,60,60,.06);border:1px solid rgba(255,60,60,.3);border-radius:8px;padding:8px 10px;margin-bottom:10px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <div style="color:var(--red);font-size:13px;font-weight:bold">${I18N.t('ui.enemyFleetSpec',{n:total})}</div>
      <div style="font-size:11px;color:var(--dim)">${I18N.t('ui.commanderPowerLine',{plv:_plv,mult:getLevelMult().toFixed(2)})}</div>
    </div>
    <table style="width:100%;border-collapse:collapse;font-family:'Malgun Gothic','맑은 고딕','Courier New',monospace">
      <thead><tr style="color:var(--dim);font-size:10px;text-align:left">
        <th style="padding:2px 6px;font-weight:normal">${I18N.t('ui.shipType')}</th>
        <th style="padding:2px 6px;font-weight:normal;text-align:right">HP/SH</th>
        <th style="padding:2px 6px;font-weight:normal;text-align:right">ATT</th>
        <th style="padding:2px 6px;font-weight:normal;text-align:right">INT</th>
        <th style="padding:2px 6px;font-weight:normal;text-align:right">TEC</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="margin-top:6px;padding-top:5px;border-top:1px dashed rgba(255,255,255,.08);display:flex;justify-content:space-between;font-size:11px;color:var(--dim)">
      <span>${I18N.t('ui.totalHP')}<span style="color:var(--yellow)">${totHP.toLocaleString()}</span></span>
      <span>${I18N.t('ui.totalAtt',{n:`<span style="color:var(--red)">${totATK.toLocaleString()}</span>`})}</span>
      <span>${I18N.t('ui.fleetAvg',{hp:`<span style="color:var(--cyan)">${fp.hp}</span>`,att:fp.atk})}</span>
    </div>
  </div>`;
}
// 초반 약화 배율: 플레이어 전투력이 낮을 때 모든 적대 세력(치크스·해적·적대 행성) 스탯 감소.
// Lv≤100: ×0.70 (반드시 30% 약화), Lv100~150: 선형 복귀, Lv≥150: ×1.00.
// 보스/히든전(isBoss)은 적용 안 함.
function getEarlyGameMult(){
  const lv=calcPlayerLevel();
  if(lv<=100)return 0.70;
  if(lv>=150)return 1.0;
  return 0.70 + (lv-100)/50*0.30;
}
// 플레이어 함대 평균 전투력 (ATK·HP) — 적 스탯 비례 조정용
function calcFleetAvgPower(){
  if(!G.fleet||!G.fleet.length)return{atk:18,hp:120,sh:50};
  let totalATK=0,totalHP=0,totalSH=0;
  G.fleet.forEach(s=>{
    const st=getShipStats(s);
    totalATK+=(st.ATT||18);
    totalHP+=(st.HP||120);
    totalSH+=(st.maxSH||0);
  });
  const n=G.fleet.length;
  return{atk:Math.max(10,Math.round(totalATK/n)),hp:Math.max(80,Math.round(totalHP/n)),sh:Math.max(20,Math.round(totalSH/n))};
}
// 함대 전체 합산 전투력 (보스 스케일링용) — HP/SH/ATT/DEF 모두 포함
function calcFleetTotalPower(){
  let atk=0,hp=0,sh=0,def=0;
  (G.fleet||[]).forEach(s=>{
    const st=getShipStats(s);
    atk+=(+st.ATT||0);
    hp+=(+st.HP||0);
    sh+=(+st.maxSH||0);
    def+=(+st.DEF||0);
  });
  return{atk,hp,sh,def};
}
// 레벨 기반 보상 배율: lv1→×1.0, lv100→×5.0 (선형)
function getRewardMult(){const plv=calcPlayerLevel();return Math.round((1.0+(plv-1)/999*49)*10)/10;}// Lv1=×1.0 ~ Lv1000=×50.0
// 레벨 등급 라벨
function getLevelRank(lv){
  if(lv>=900)return{lb:I18N.t('rank.legendary'),col:'#ff4444'};
  if(lv>=700)return{lb:I18N.t('rank.hero'),col:'var(--purple)'};
  if(lv>=500)return{lb:I18N.t('rank.elite'),col:'var(--gold)'};
  if(lv>=300)return{lb:I18N.t('rank.veteran'),col:'var(--cyan)'};
  if(lv>=150)return{lb:I18N.t('rank.apprentice'),col:'var(--green)'};
  return{lb:I18N.t('rank.rookie'),col:'var(--dim)'};
}
// 명성 등급: 0단계(무명)~7단계(은하의 구원자)
function getRepRank(rep){
  if(rep>=8000)return{lb:I18N.t('rep.savior'),col:'#ff44ff',next:9999,ic:'🌌'};
  if(rep>=5000)return{lb:I18N.t('rep.galaxyLegend'),col:'#ff4444',next:8000,ic:'🔥'};
  if(rep>=3000)return{lb:I18N.t('rep.admiral'),col:'var(--purple)',next:5000,ic:'⚜️'};
  if(rep>=1500)return{lb:I18N.t('rep.legend'),col:'var(--gold)',next:3000,ic:'🌟'};
  if(rep>=700) return{lb:I18N.t('rep.warrior'),col:'var(--cyan)',next:1500,ic:'⚔️'};
  if(rep>=250) return{lb:I18N.t('rep.navigator'),col:'var(--green)',next:700,ic:'🧭'};
  if(rep>=50)  return{lb:I18N.t('rep.newcomer'),col:'#aaaaaa',next:250,ic:'🚀'};
  return{lb:I18N.t('rep.nameless'),col:'var(--dim)',next:50,ic:'❓'};
}
function startGame(){
  const nm=document.getElementById('ft-nm').value.trim(),co=document.getElementById('ft-co').value.trim(),sh=document.getElementById('ft-sh').value.trim();
  const emailEl=document.getElementById('ft-email');
  const email=emailEl?emailEl.value.trim():'';
  const err=document.getElementById('ft-er');
  if(!nm){err.textContent=I18N.t('startErr.noCmdName');return;}
  // 이메일 입력 시 형식 검증 + 클라우드 등록
  if(email){
    if(!window.CloudSave||!CloudSave._validEmail||!CloudSave._validEmail(email)){
      err.textContent=I18N.t('startErr.badEmail');return;
    }
    G.profile.email=email.toLowerCase().trim();
    try{CloudSave.setEmail(email);}catch(e){}
  }
  G.profile.name=nm;G.profile.company=co||I18N.t('ui.companyDefault');G.profile.ship=sh||I18N.t('ui.shipDefault');
  // 명예의 전당 — 플레이 시간 기록용
  if(!G._gameStartedAt)G._gameStartedAt=Date.now();
  // 사용자 보고 (2026-06-06): 새 게임 시 _activeSlot 미설정 → 언어 전환 등에서 저장 실패.
  //   슬롯 1을 기본으로 할당. 이후 사용자가 다른 슬롯에 저장하면 그것으로 갱신.
  G._activeSlot=1;
  err.textContent='';initGame();
  // 사용자 요청 2026-06-07: 게임 시작 백구 멘트 프롤로그 제거
  // → FTUE 직후 바로 허브 진입. showHub()의 spawnPhasedQuests가 p1_ch01a("100년의 잠") 컷씬을 자동 재생함
  showHub();
  // 사용자 요청 2026-06-09: 게임 시작 즉시 컷씬 — RAF 의존 없이 직접 호출
  //   showHub 내부 RAF spawn 이 어떤 이유로 실패해도 여기서 한 번 더 보장.
  //   spawnPhasedQuests 내부 dedup 으로 중복 트리거 안전.
  try{
    if(typeof spawnPhasedQuests==='function'){
      spawnPhasedQuests(G.currentPlanet||'P01');
    }
  }catch(e){console.warn('[startGame] direct spawn fail:',e);}
  // 사용자 보고 2026-06-09: 자동 컷씬이 안 나옴 — 추가 안전망 (200ms~5000ms 3번 재시도)
  //   STORY_SCENES_PC 가 늦게 로드되거나 첫 트리거가 실패한 경우 다시 시도.
  //   _phasedIntroSeen 이미 마킹돼 있으면 spawnPhasedQuests 내부에서 skip 됨.
  [400,1500,3000].forEach(function(delay){
    setTimeout(function(){
      try{
        if(window.G && !window.G._phasedIntroSeen?.['intro_'+(G.currentPlanet||'P01')]
           && typeof spawnPhasedQuests==='function'){
          console.log('[startGame] retry spawnPhasedQuests at',delay,'ms');
          spawnPhasedQuests(G.currentPlanet||'P01');
        }
      }catch(e){console.warn('[startGame] retry fail:',e);}
    },delay);
  });
}

// 타이틀 → 📧 이메일로 게임 불러오기 모달
function showEmailLoadModal(){
  const savedEmail=(window.CloudSave&&CloudSave.getEmail)?CloudSave.getEmail():'';
  const html=`<div style="padding:8px 4px">
    <div style="display:flex;gap:12px;align-items:flex-start;padding:14px;background:var(--card);border:1px solid #66ddff;border-radius:10px;margin-bottom:14px">
      <img src="${_baekguSrcByMood('default')+(window._GAME_VER?'?v='+encodeURIComponent(window._GAME_VER):'')}" alt="${I18N.t('alt.baekgu')}" style="width:48px;height:48px;border-radius:50%;flex-shrink:0;object-fit:cover;background:rgba(0,0,0,.3);border:1.5px solid #66ddff" onerror="this.outerHTML='<div style=\\'font-size:32px;flex-shrink:0\\'>🐕</div>'">
      <div style="color:var(--yellow);font-size:14px;line-height:1.7;word-break:keep-all">
        <div style="color:#66ddff;font-size:11px;font-weight:bold;margin-bottom:3px;letter-spacing:1px">${I18N.t('speaker.baekgu')}</div>
        ${I18N.t('emailLoad.baekguHint')}
      </div>
    </div>
    <div style="margin-bottom:10px">
      <div style="color:var(--dim);font-size:12px;margin-bottom:5px">${I18N.t('ui.emailInputLabel')}</div>
      <input class="inp" id="email-load-input" placeholder="example@email.com" value="${savedEmail}" maxlength="60" type="email" style="font-size:14px" autofocus>
    </div>
    <div id="email-load-err" style="color:var(--red);font-size:12px;min-height:16px;margin-bottom:8px"></div>
    <div id="email-load-ok" style="color:var(--green);font-size:12px;min-height:16px;margin-bottom:8px"></div>
    <div style="font-size:11px;color:var(--dim);line-height:1.6">
      ${I18N.t('ui.emailLoadHint1')}<br>
      ${I18N.t('ui.emailLoadHint2')}
    </div>
  </div>`;
  openModal(I18N.t('modal.loadByEmail'),html,[
    {txt:I18N.t('btn.loadByEmail'),cls:'btn-cyan',fn:async()=>{
      const inp=document.getElementById('email-load-input');
      const err=document.getElementById('email-load-err');
      const ok=document.getElementById('email-load-ok');
      const em=(inp&&inp.value||'').trim();
      err.textContent='';ok.textContent='';
      if(!em){err.textContent=I18N.t('err.emailRequired');return;}
      if(!window.CloudSave){err.textContent=I18N.t('err.cloudNotReady');return;}
      if(!CloudSave._validEmail(em)){err.textContent=I18N.t('err.emailInvalid');return;}
      ok.textContent=I18N.t('msg.loading');
      try{
        const r=await CloudSave.loadByEmail(em);
        if(r.error){
          if(r.empty){
            err.textContent=I18N.t('err.noEmailSave');
            ok.textContent='';
          } else {
            err.textContent=I18N.t('err.errorPrefix')+r.error;ok.textContent='';
          }
          return;
        }
        ok.textContent=I18N.t('ui.importedRestore',{n:r.imported});
        setTimeout(()=>{closeModal();showLoadSlots();},800);
      }catch(e){err.textContent=I18N.t('err.networkPrefix')+e.message;ok.textContent='';}
    }},
    {txt:I18N.t('ui.cancel'),cls:'btn-sm',fn:closeModal}
  ]);
}
try{if(typeof window!=='undefined')window.showEmailLoadModal=showEmailLoadModal;}catch(e){}
function getPrologues(){
  const nm=G.profile.name||I18N.t('hof.commander');
  const co=G.profile.company||I18N.t('ui.companyName');
  const ship=G.profile.ship||I18N.t('ftue.defaultShip');
  return [
    {sp:'시스템',tx:I18N.t('prologue.l1',{nm})},
    {sp:'백구',tx:I18N.t('prologue.l2')},
    {sp:'백구',tx:I18N.t('prologue.l3')},
    {sp:'백구',tx:I18N.t('prologue.l4',{co,nm})},
    {sp:'백구',tx:I18N.t('prologue.l5',{nm,ship})},
    {sp:'시스템',tx:I18N.t('prologue.l6',{nm,co})}
  ];
}
let pIdx=0;
function startPrologue(){pIdx=0;renderPrologue();}
function renderPrologue(){
  const pl=getPrologues();
  const l=pl[pIdx];
  const box=document.getElementById('pr-lines');
  const isBaekgu=(l.sp=='백구'||l.sp=='Baekgu');
  // 화자에 따라 캐릭터 이미지 표시/숨김
  const charDiv=document.getElementById('pr-char');
  if(charDiv)charDiv.style.opacity=isBaekgu?'1':'0.25';
  // 화자 레이블: 백구는 이미지 + 이름, 시스템은 아이콘
  const spHTML=isBaekgu
    ?`<div style="display:inline-flex;align-items:center;gap:7px;margin-bottom:6px">
        <img src="${_baekguSrcByMood('default')+(window._GAME_VER?'?v='+encodeURIComponent(window._GAME_VER):'')}" alt="${I18N.t('alt.baekgu')}"
          style="width:30px;height:30px;object-fit:contain;border-radius:50%;background:var(--panel);border:1px solid var(--cyan)"
          onerror="this.style.display='none'">
        <span style="color:var(--cyan);font-size:13px;font-weight:bold">${I18N.t('speaker.baekgu')}</span>
      </div>`
    :`<div style="color:var(--muted);font-size:12px;letter-spacing:2px;margin-bottom:6px">${I18N.t('prologue.systemLabel')}</div>`;
  box.innerHTML=spHTML+`<div style="color:var(--yellow);font-size:17px;line-height:1.9;word-break:keep-all;overflow-wrap:break-word;padding:0 8px">${l.tx}</div>`;
  const btn=document.getElementById('pr-btn');
  btn.style.display='inline-block';
  btn.textContent=pIdx<pl.length-1?I18N.t('ui.continueArrow'):I18N.t('ui.toHub');
}
function nextPrologue(){const pl=getPrologues();if(pIdx<pl.length-1){pIdx++;renderPrologue();}else showHub();}


// ─── 전역 노출 (자동 생성) ─────────────────────────────────────
try{window.LORE_TEXT=LORE_TEXT;}catch(e){}
try{window.showLoreTip=showLoreTip;}catch(e){}
try{window._posLoreTip=_posLoreTip;}catch(e){}
try{window.hideLoreTip=hideLoreTip;}catch(e){}
try{window.imgOrEmoji=imgOrEmoji;}catch(e){}
try{window.shipLoreKey=shipLoreKey;}catch(e){}
try{window.shipDisplayNm=shipDisplayNm;}catch(e){}
try{window.commDisplayNm=commDisplayNm;}catch(e){}
try{window.partDisplayNm=partDisplayNm;}catch(e){}
try{window.crewDisplayNm=crewDisplayNm;}catch(e){}
try{window._resolveShipImgBase=_resolveShipImgBase;}catch(e){}
try{window.shipImgSrc=shipImgSrc;}catch(e){}
try{window._shipImgSrcRaw=_shipImgSrcRaw;}catch(e){}
try{window.planetImgSrc=planetImgSrc;}catch(e){}
try{window._isEarthFree=_isEarthFree;}catch(e){}
try{window._isUrsaDefeated=_isUrsaDefeated;}catch(e){}
try{window.planetBgSrc=planetBgSrc;}catch(e){}
try{window.planetBgFallback=planetBgFallback;}catch(e){}
try{window.partImgSrc=partImgSrc;}catch(e){}
try{window._PIRATE_FF_POOL=_PIRATE_FF_POOL;}catch(e){}
try{window.pirateCombatImg=pirateCombatImg;}catch(e){}
try{window.bpImgSrc=bpImgSrc;}catch(e){}
try{window.crewImgSrc=crewImgSrc;}catch(e){}
try{window.commImgSrc=commImgSrc;}catch(e){}
try{window.mkThumb=mkThumb;}catch(e){}
try{window.CAT_EMOJI=CAT_EMOJI;}catch(e){}
try{window.TIER_EMOJI=TIER_EMOJI;}catch(e){}
try{window.FACTION_EMOJI=FACTION_EMOJI;}catch(e){}
try{window.getDiffMult=getDiffMult;}catch(e){}
try{window.getDiffRewardMult=getDiffRewardMult;}catch(e){}
try{window.getTotalRewardMult=getTotalRewardMult;}catch(e){}
try{window.getDiffCountMult=getDiffCountMult;}catch(e){}
try{window.calcPlayerLevel=calcPlayerLevel;}catch(e){}
try{window.getLevelMult=getLevelMult;}catch(e){}
try{window._formatEnemyPreview=_formatEnemyPreview;}catch(e){}
try{window.getEarlyGameMult=getEarlyGameMult;}catch(e){}
try{window.calcFleetAvgPower=calcFleetAvgPower;}catch(e){}
try{window.calcFleetTotalPower=calcFleetTotalPower;}catch(e){}
try{window.getRewardMult=getRewardMult;}catch(e){}
try{window.getLevelRank=getLevelRank;}catch(e){}
try{window.getRepRank=getRepRank;}catch(e){}
try{window.startGame=startGame;}catch(e){}
try{window.showEmailLoadModal=showEmailLoadModal;}catch(e){}
try{window.getPrologues=getPrologues;}catch(e){}
try{window.pIdx=pIdx;}catch(e){}
try{window.startPrologue=startPrologue;}catch(e){}
try{window.renderPrologue=renderPrologue;}catch(e){}
try{window.nextPrologue=nextPrologue;}catch(e){}
console.log('[png-image] Loaded — 48 decls exposed');
})();
