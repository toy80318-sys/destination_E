// ═══════════════════════════════════════════════════════════════════
// DESTINATION EARTH — 세이브 슬롯 시스템 (저장/불러오기/백업 복구/슬롯 UI) 모듈
//   · game.js 에서 분할 (2026-06-12, 사용자 요청: 긴 코드 분할)
//   · 모든 최상위 선언을 window.* 로 노출해 기존 호출처(전역 참조) 호환
// ═══════════════════════════════════════════════════════════════════
(function(){
if(typeof window==='undefined')return;
if(window._SAVE_SLOTS_LOADED)return;
window._SAVE_SLOTS_LOADED=true;

// ── 저장 / 불러오기 ──────────────────────────────────────────────
const SAVE_KEY='de_save';
// ══════════════════════════════════════════════════════════════════
// 10슬롯 저장/불러오기 시스템 (클라우드 동기화 지원)
// ══════════════════════════════════════════════════════════════════
const SAVE_SLOTS=8;
function _slotKey(n){return n===0?'de_save':'de_save_s'+n;}  // 슬롯0 = 레거시 키 호환

// 특정 슬롯 정보 읽기
function _getSlotInfo(n){
  try{
    const raw=localStorage.getItem(_slotKey(n));
    if(!raw)return null;
    const info=JSON.parse(raw);
    if(info&&(info.turn!==undefined||info.fleet))return info;
  }catch(e){}
  return null;
}

// 슬롯에 저장 (로컬 + 클라우드)
// 탭 전환/닫기/리프레시 시 자동 저장 (사이트 끊김 / 새로고침에도 데이터 보호)
(function _registerAutoSaveHandlers(){
  if(typeof document==='undefined')return;
  let lastAutoSave=0;
  function _safeAutoSave(){
    if(!window.G||!G.profile||!G.profile.name)return;  // 게임 시작 전이면 스킵
    const now=Date.now();
    if(now-lastAutoSave<2000)return;  // 2초 쓰로틀
    lastAutoSave=now;
    try{saveGame(true);}catch(e){}
  }
  // 탭 숨김 (다른 탭으로 이동 / 모바일 백그라운드)
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')_safeAutoSave();});
  // 페이지 닫기 / 새로고침 / 다른 URL 이동
  window.addEventListener('beforeunload',_safeAutoSave);
  // 모바일 페이지 freeze (iOS Safari, Android Chrome)
  window.addEventListener('pagehide',_safeAutoSave);
  // 네트워크 복구 시 클라우드 재동기화
  window.addEventListener('online',()=>{
    try{if(window.CloudSave&&CloudSave.pushAll)CloudSave.pushAll();}catch(e){}
  });
})();

// ── 저장 디바운스 — silent 호출이 짧은 시간에 다발될 때 누적 블로킹 방지 ──
// 사용자 트리거(silent=false)는 즉시 실행. 자동 저장(silent=true)은 800ms 디바운스.
// 큰 G의 JSON.stringify는 100~500ms 동기 블로킹이라 매 액션마다 호출 시 멈춤 원인.
let _saveDebounceTimer=null;
let _saveDebouncePendingSlot=null;
// 사용자 보고 (2026-06-06): 언어 전환 시 즉시 동기 저장이 필요해 window에 노출
function _saveGameImmediate(silent,slotN){
  // 활성 슬롯 추적: loadGame에서 G._activeSlot에 슬롯 번호 저장 → saveGame은 그 슬롯에 저장
  // (기존 버그: slotN 미지정 시 무조건 슬롯1에 덮어써 다른 슬롯에서 플레이 중인 데이터가 슬롯1로 이동)
  const n=(slotN!=null)?slotN:(typeof G==='object'&&G&&G._activeSlot!=null?G._activeSlot:1);
  // 안전장치: G.profile.name이 비어있으면(타이틀 화면 등) 저장 차단 — 빈 데이터로 슬롯 덮어쓰기 방지
  if(!silent&&(!G||!G.profile||!G.profile.name)){
    // 명시적 호출인데 G가 비어있으면 차단하지 말고 진행 (사용자 의도 존중)
  } else if(silent&&(!G||!G.profile||!G.profile.name)){
    // 자동 저장이면 빈 G를 슬롯에 덮어쓰는 것 차단
    return;
  }
  try{
    // 1) 사이즈 폭증 방지: 전투 기록 마지막 100건만 유지 (이전: 무제한)
    if(G.combatHistory&&G.combatHistory.length>100){
      G.combatHistory=G.combatHistory.slice(-100);
    }
    // 2) 스냅샷 직렬화 (순환참조 방지)
    const snap=JSON.parse(JSON.stringify(G));
    snap._ver=2;snap._saved=Date.now();snap._slotN=n;
    const payload=JSON.stringify(snap);
    // 3) 자동 백업: 저장 전에 기존 데이터를 백업 슬롯(_bk)에 복사 (롤백 가능)
    try{
      const prev=localStorage.getItem(_slotKey(n));
      if(prev&&prev.length>100)localStorage.setItem(_slotKey(n)+'_bk',prev);
    }catch(_){}
    // 4) 메인 저장
    localStorage.setItem(_slotKey(n),payload);
    // 4-1) PC(Electron) 빌드: 파일시스템 백업 (localStorage 손상/quota 대비)
    try{
      if(window.desktopAPI&&typeof window.desktopAPI.saveSlot==='function'){
        window.desktopAPI.saveSlot(_slotKey(n).replace(/[^a-zA-Z0-9_-]/g,'_'),payload).catch(()=>{});
      }
    }catch(_){}
    // 5) 사이즈 경고 (4MB 초과 시)
    if(payload.length>4*1024*1024&&!silent){
      notify(I18N.t('notify.saveSizeWarn',{mb:(payload.length/1024/1024).toFixed(1)}),'warn');
    }
    // 6) 클라우드 업로드 (디바운스 1초)
    try{if(window.CloudSave)CloudSave.upload(n,snap);}catch(e){if(!silent)console.warn('cloud upload error',e);}
    // 이메일 등록 시 이메일 슬롯에도 동시 업로드 (간편 클라우드) — 실패하면 notify로 알림
    try{
      if(window.CloudSave&&CloudSave.getEmail&&CloudSave.getEmail()){
        CloudSave.uploadByEmail(n,snap).then(r=>{
          if(r&&r.error&&!silent){
            // PERMISSION_DENIED는 인증 미완료 가능성 — 가벼운 안내
            const msg=r.error.includes('PERMISSION')||r.error.includes('permission')?
              I18N.t('cloud.syncDelayed'):
              I18N.t('cloud.syncError',{err:r.error.slice(0,60)});
            notify(msg,'warn');
          }
        }).catch(()=>{});
      }
    }catch(e){if(!silent)console.warn('email upload error',e);}
    if(!silent)notify(I18N.t('notify.saveSlotDone',{n,kb:Math.round(payload.length/1024)}),'ok');
  }catch(e){
    // 저장 실패 — quota 초과 등. 백업에서 복구 시도
    console.error('[saveGame] failed',e);
    if(!silent)notify(I18N.t('notify.saveFailRecover',{err:e.message}),'err');
    // QuotaExceededError 처리: 다른 슬롯의 불필요한 데이터 정리
    if(e.name==='QuotaExceededError'||(''+e.message).includes('quota')){
      try{
        // 다른 백업 슬롯 정리
        for(let i=0;i<=8;i++){
          try{localStorage.removeItem(_slotKey(i)+'_bk');}catch(_){}
        }
        // 재시도
        const snap2=JSON.parse(JSON.stringify(G));
        snap2._ver=2;snap2._saved=Date.now();snap2._slotN=n;
        localStorage.setItem(_slotKey(n),JSON.stringify(snap2));
        if(!silent)notify(I18N.t('notify.backupSaveOk'),'ok');
      }catch(e2){
        if(!silent)notify(I18N.t('notify.saveRetryFail',{err:e2.message}),'err');
      }
    }
  }
}
// 공개 진입점 — silent 호출은 800ms 디바운스, 사용자 트리거는 즉시 실행
// _saveGameImmediate를 window에 노출 — 언어 전환 시 즉시 저장에 사용 (i18n.js setLang)
try{if(typeof window!=='undefined')window._saveGameImmediate=_saveGameImmediate;}catch(e){}
function saveGame(silent,slotN){
  if(!silent){
    // 사용자 트리거: 대기 중인 디바운스 취소 + 즉시 실행 (피드백 보장)
    if(_saveDebounceTimer){clearTimeout(_saveDebounceTimer);_saveDebounceTimer=null;_saveDebouncePendingSlot=null;}
    _saveGameImmediate(false,slotN);
    return;
  }
  // 자동 저장: 디바운스 — 짧은 시간 다발 호출이 끝나면 1번만 실행
  _saveDebouncePendingSlot=slotN;
  if(_saveDebounceTimer)clearTimeout(_saveDebounceTimer);
  _saveDebounceTimer=setTimeout(()=>{
    const _sl=_saveDebouncePendingSlot;
    _saveDebounceTimer=null;_saveDebouncePendingSlot=null;
    try{_saveGameImmediate(true,_sl);}catch(e){console.warn('[saveGame debounced]',e);}
  },800);
}
// 페이지 언로드/탭 전환 시 대기 중인 자동저장 플러시 — 데이터 손실 방지
try{
  if(typeof window!=='undefined'){
    window.addEventListener('beforeunload',()=>{
      if(_saveDebounceTimer){clearTimeout(_saveDebounceTimer);_saveDebounceTimer=null;
        try{_saveGameImmediate(true,_saveDebouncePendingSlot);}catch(e){}
        _saveDebouncePendingSlot=null;
      }
    });
    window.addEventListener('visibilitychange',()=>{
      if(document.visibilityState==='hidden'&&_saveDebounceTimer){
        clearTimeout(_saveDebounceTimer);_saveDebounceTimer=null;
        try{_saveGameImmediate(true,_saveDebouncePendingSlot);}catch(e){}
        _saveDebouncePendingSlot=null;
      }
    });
  }
}catch(e){}

// 자동 복구: 현재 슬롯이 손상되었거나 비었다면 백업에서 복원
function _tryRecoverSlot(n){
  try{
    const raw=localStorage.getItem(_slotKey(n));
    if(raw&&raw.length>100){
      try{JSON.parse(raw);return false;}catch(_){}  // 정상 → 복구 불필요
    }
    const bk=localStorage.getItem(_slotKey(n)+'_bk');
    if(!bk||bk.length<100)return false;
    JSON.parse(bk);  // 백업 검증
    localStorage.setItem(_slotKey(n),bk);
    console.log('[saveGame] recovered slot',n,'from backup');
    return true;
  }catch(e){console.warn('[saveGame] recover failed',e);return false;}
}

// 슬롯에서 불러오기
function loadGame(slotN){
  const n=(slotN!=null)?slotN:1;
  try{
    // 슬롯 n 우선, 없으면 레거시 슬롯0 시도
    let snap=_getSlotInfo(n);
    if(!snap&&n===1)snap=_getSlotInfo(0); // 레거시 호환
    // 없으면 백업 슬롯에서 자동 복구 시도
    if(!snap){
      if(_tryRecoverSlot(n)){snap=_getSlotInfo(n);if(snap)notify(I18N.t('notify.slotRecovered',{n}),'gold');}
      else if(n===1&&_tryRecoverSlot(0)){snap=_getSlotInfo(0);if(snap)notify(I18N.t('notify.legacySlotRecovered'),'gold');}
    }
    if(!snap){notify(I18N.t('notify.slotNoData',{n}),'err');return false;}
    Object.assign(G,snap);
    G._activeSlot=n;  // 활성 슬롯 추적 — 이후 saveGame은 이 슬롯에 저장
    // 필수 필드 보완
    if(!G.mapPositions||!Object.keys(G.mapPositions).length){G.mapPositions=generateGalaxy(1000);G.mapConns=buildConnections(G.mapPositions);}
    // 항로(mapConns) 누락 보정 — 이게 없으면 모든 이동이 차단됨 (구버전 세이브 호환)
    if(!G.mapConns||!Array.isArray(G.mapConns)||G.mapConns.length===0){G.mapConns=buildConnections(G.mapPositions);}
    if(!G.shopStock)G.shopStock={};
    if(!G.blueprints)G.blueprints={};
    if(!G.reputation)G.reputation=0;
    if(!G.hallOfFame)G.hallOfFame=[];
    if(G.difficulty===undefined)G.difficulty='normal';
    if(!G.heroes)G.heroes=[];
    if(!G.crew)G.crew=[];
    // 사용자 보고 (2026-06-06): 기존 세이브에 nm이 모집 시점 언어로 굳어져 한/영 혼재.
    //   NPC_POOL 항목별 _nmKey 도입 후 — 기존 G.crew는 _nmKey가 비어있음.
    //   nm(현재값)을 ko/en 양쪽 i18n 사전에서 역방향 매칭해 _nmKey를 backfill.
    try{
      if(typeof NPC_POOL!=='undefined'&&Array.isArray(NPC_POOL)&&I18N&&typeof I18N.getEntry==='function'){
        const _kRev={};
        NPC_POOL.forEach(np=>{
          if(!np._nmKey)return;
          const ent=I18N.getEntry(np._nmKey);
          if(!ent)return;
          if(ent.ko)_kRev[ent.ko]=np._nmKey;
          if(ent.en)_kRev[ent.en]=np._nmKey;
        });
        G.crew.forEach(c=>{
          if(c&&!c._nmKey&&c.nm&&_kRev[c.nm])c._nmKey=_kRev[c.nm];
        });
      }
    }catch(e){console.warn('[crew _nmKey backfill]',e);}
    if(!G.planets||!Object.keys(G.planets).length)G.planets={};
    // 화물·재료 정합성 — 구버전 세이브 호환 + 직렬화 시 어긋난 카운터 자동 보정
    try{_validateCargoIntegrity();}catch(e){console.warn('cargo validate(load) failed',e);}
    // 불러오기 후 함선 HP 보정 + 블랙팔콘 신화급 슬롯 마이그레이션
    if(G.fleet&&G.fleet.length){
      G.fleet.forEach(s=>{
        // 기존에 나포된 블랙팔콘(대형 tier로 저장된 경우) → 신화급으로 승급
        if(s&&s._isVoidFalconCaptured&&s.tier!=='신화'){
          s.tier='신화';
          delete s.partsRowsExtra;
          s.cargoSlots=80;
        }
        const st=getShipStats(s);
        if(!s.hp||s.hp<=0)s.hp=st.HP;
        if(!s.maxHP||s.maxHP<=0)s.maxHP=st.HP;
        if(s.sh===undefined||s.sh===null)s.sh=st.maxSH;
        if(!s.maxSH)s.maxSH=st.maxSH;
      });
    }
    return true;
  }catch(e){notify(I18N.t('notify.loadFailErr',{err:e.message}),'err');return false;}
}

// 슬롯 카드 HTML 생성 (저장/불러오기 공용)
function _renderSlotCard(n,mode){
  // 슬롯 1은 레거시(de_save) 도 체크
  let info=_getSlotInfo(n);
  if(!info&&n===1)info=_getSlotInfo(0);
  let dateStr='',hasData=false;
  let flagship=null,flagImgHtml='',flagName='',planetName='';
  if(info){
    hasData=true;
    try{dateStr=new Date(info._saved).toLocaleString('ko-KR');}catch(e){dateStr='';}
    // 기함 이미지
    if(info.fleet&&info.fleet.length>0){
      flagship=info.fleet[0];
      const src=shipImgSrc(flagship);
      const tierIc={신화:'✦',전설기함:'⚑',대형:'🌟',중형:'🚀',소형:'🛸'}[flagship.tier]||'🛸';
      flagImgHtml=imgOrEmoji(src,tierIc,48,48,'border-radius:6px;background:rgba(0,0,0,.6);object-fit:contain;flex-shrink:0');
      flagName=flagship.nm||I18N.t('slot.shipDefault');
    } else {
      flagImgHtml=`<div style="width:48px;height:48px;border-radius:6px;background:rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0">🛸</div>`;
      flagName=I18N.t('slot.shipNone');
    }
    // 현재 행성 이름
    if(info.currentPlanet){
      const pd2=(typeof PLANET_DEF!=='undefined'?PLANET_DEF:[]).find(p=>p.id===info.currentPlanet);
      planetName=pd2?pd2.nm:info.currentPlanet;
    }
  }
  const slotEmoji=n===1?'🥇':n===2?'🥈':n===3?'🥉':'💾';
  const cardBg=hasData?'rgba(0,243,255,.06)':'rgba(255,255,255,.03)';
  const cardBorder=hasData?'1px solid rgba(0,243,255,.3)':'1px dashed rgba(255,255,255,.1)';
  let actionBtn='';
  if(mode==='save'){
    actionBtn=`<button class="btn btn-sm ${hasData?'btn-red':''}" style="flex-shrink:0;padding:3px 10px;font-size:12px"
      onclick="saveGame(false,${n});showSaveSlots()">
      ${hasData?I18N.t('slot.overwrite'):I18N.t('slot.save')}
    </button>`;
  } else {
    if(hasData){
      actionBtn=`<button class="btn btn-sm btn-gold" style="flex-shrink:0;padding:3px 10px;font-size:12px"
        onclick="(function(){try{if(loadGame(${n})){try{closeModal();}catch(e){}try{showHub();}catch(e){console.error('[load] showHub failed',e);notify(I18N.t('slot.hubFail')+': '+e.message,'err');}try{notify(I18N.t('slot.loadComplete',{n:${n}}),'ok');}catch(e){}}}catch(e){console.error('[load] click handler',e);notify(I18N.t('slot.loadFail')+': '+e.message,'err');}})()">
        ${I18N.t('slot.load')}
      </button>`;
    } else {
      actionBtn=`<button class="btn btn-sm" disabled style="flex-shrink:0;padding:3px 10px;font-size:12px;opacity:.35">${I18N.t('slot.empty')}</button>`;
    }
  }
  if(!hasData){
    return `<div style="background:${cardBg};border:${cardBorder};border-radius:8px;padding:7px 11px;margin-bottom:5px;display:flex;align-items:center;gap:10px">
      <div style="font-size:20px;flex-shrink:0">${slotEmoji}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:bold;font-size:13px;margin-bottom:2px;color:var(--txt)">${I18N.t('slot.label',{n})}</div>
        <div style="color:var(--dim);font-size:12px">${I18N.t('slot.emptyDash')}</div>
      </div>
      ${actionBtn}
    </div>`;
  }
  // ACT 정보 (1~5) — ACT별 색상·라벨
  const _act=info.act||1;
  const _actLabel={1:I18N.t('slot.act1'),2:I18N.t('slot.act2'),3:I18N.t('slot.act3'),4:I18N.t('slot.act4'),5:I18N.t('slot.act5')}[_act]||('ACT '+_act);
  const _actColor={1:'#88ccff',2:'#66ddff',3:'#ffcc66',4:'#ff88cc',5:'#ff66ff'}[_act]||'#66ddff';
  const _rep=info.reputation||0;
  const _heroCnt=(info.heroes||[]).length;
  const _ownedCnt=(info.ownedPlanets||[]).length;
  return `<div style="background:${cardBg};border:${cardBorder};border-radius:8px;padding:7px 11px;margin-bottom:5px;display:flex;align-items:center;gap:10px">
    <div style="font-size:18px;flex-shrink:0;align-self:flex-start;margin-top:2px">${slotEmoji}</div>
    ${flagImgHtml}
    <div style="flex:1;min-width:0">
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:2px">
        <div style="font-weight:bold;font-size:13px;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;min-width:0">⚑ ${flagName}</div>
        <span style="background:${_actColor}22;color:${_actColor};border:1px solid ${_actColor}66;border-radius:4px;padding:1px 7px;font-size:10px;font-weight:bold;letter-spacing:1px;flex-shrink:0">${_actLabel}</span>
      </div>
      <div style="font-size:12px;color:var(--cyan);margin-bottom:1px">
        TURN ${info.turn||0} &nbsp;|&nbsp; ₡${Number(info.credits||0).toLocaleString()} &nbsp;|&nbsp; ${I18N.t('slot.shipsCount',{n:(info.fleet||[]).length})} &nbsp;|&nbsp; ⭐ ${_rep}
        ${planetName?`&nbsp;|&nbsp; 📍 ${planetName}`:''}
      </div>
      <div style="color:var(--dim);font-size:11px">${dateStr} · ${I18N.t('slot.heroesCount',{n:_heroCnt})} · ${I18N.t('slot.domainsCount',{n:_ownedCnt})}</div>
    </div>
    ${actionBtn}
  </div>`;
}

// 저장 슬롯 모달
function showSaveSlots(){
  let cards='';
  for(let i=1;i<=SAVE_SLOTS;i++)cards+=_renderSlotCard(i,'save');
  const html=`<div style="padding:4px 0">${cards}</div>`;
  openModal(I18N.t('modal.saveGame'),html,[{txt:I18N.t('btn.close'),fn:closeModal,cls:'btn-sm'}],{wide:true,compactSave:true});
}

// 불러오기 슬롯 모달
function showLoadSlots(){
  let cards='';
  for(let i=1;i<=SAVE_SLOTS;i++)cards+=_renderSlotCard(i,'load');
  const html=`<div style="padding:4px 0">${cards}</div>`;
  openModal(I18N.t('modal.loadGame'),html,[{txt:I18N.t('btn.close'),fn:closeModal,cls:'btn-sm'}],{wide:true,compactSave:true});
}

// 레거시 호환용 (타이틀 이어하기 버튼)
function _getSaveInfo(){
  // 슬롯1 우선, 없으면 레거시
  const s1=_getSlotInfo(1)||_getSlotInfo(0);
  if(s1)return{info:s1,key:_slotKey(1)};
  return{info:null,key:null};
}

// ── 타이틀 난이도 버튼 ─────────────────────────────────────────
window._titleDiff=window._titleDiff||'normal';
function titleSetDiff(d){
  window._titleDiff=d;
  syncDiffButtons(d);
}
function syncDiffButtons(d){
  ['easy','normal','hard','extreme'].forEach(k=>{
    const btn=document.getElementById('tdf-'+k);
    if(!btn)return;
    const active=k===d;
    btn.style.opacity=active?'1':'0.5';
    btn.style.boxShadow=active?'0 0 8px var(--cyan)':'none';
    btn.style.transform=active?'scale(1.08)':'scale(1)';
  });
}

// ── 크레딧 화면 ─────────────────────────────────────────────────
function showCredits(){
  // 영화 엔딩 스타일 — 아래에서 위로 스크롤하는 전체 화면 크레딧
  const overlay=document.createElement('div');
  overlay.id='_credits-roll-overlay';
  overlay.style.cssText=[
    'position:fixed','left:0','top:0','right:0','bottom:0','width:100vw','height:100vh',
    'background:#000','z-index:99998','opacity:0','transition:opacity 1.5s ease-in',
    'display:flex','align-items:flex-start','justify-content:center',
    'pointer-events:auto','color:#fff','font-family:Malgun Gothic, sans-serif','overflow:hidden'
  ].join(';');
  overlay.innerHTML=`
    <style>
      @keyframes _credRoll{from{transform:translateY(100vh)}to{transform:translateY(-200%)}}
      @keyframes _credShim{0%{background-position:0% 50%}100%{background-position:200% 50%}}
      @keyframes _credStars{from{background-position:0 0}to{background-position:-2000px 0}}
    </style>
    <!-- 별 배경 -->
    <div style="position:absolute;inset:0;background:radial-gradient(2px 2px at 18% 32%,#fff,transparent),radial-gradient(1px 1px at 62% 68%,#fff,transparent),radial-gradient(1px 1px at 80% 12%,#fff,transparent),radial-gradient(2px 2px at 28% 82%,#fff,transparent),radial-gradient(1px 1px at 88% 48%,#fff,transparent);background-size:200px 200px;opacity:.35;animation:_credStars 60s linear infinite"></div>
    <!-- 크레딧 롤 -->
    <div id="_credits-roll" style="position:relative;width:100%;max-width:720px;text-align:center;padding:30px 20px;animation:_credRoll 75s linear forwards;color:#fff">
      <div style="height:30vh"></div>

      <div style="font-size:42px;letter-spacing:12px;margin-bottom:12px;background:linear-gradient(90deg,#ffd700,#66ffff,#ff66cc,#ffd700);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;background-size:200% 100%;animation:_credShim 4s linear infinite">DESTINATION EARTH</div>
      <div style="font-size:14px;color:#aaa;letter-spacing:8px;margin-bottom:80px">${I18N.t('credits.subtitle')}</div>

      <!-- 기획 / 개발 -->
      <div style="color:#ffd700;font-size:14px;letter-spacing:6px;margin-bottom:8px">${I18N.t('credits.plan')}</div>
      <div style="font-size:20px;color:#fff;margin-bottom:50px">${I18N.t('ui.toyLee')}</div>

      <div style="color:#ffd700;font-size:14px;letter-spacing:6px;margin-bottom:8px">${I18N.t('credits.dev')}</div>
      <div style="font-size:17px;line-height:2;margin-bottom:50px">Toy Lee<br>Claude (Anthropic)</div>

      <!-- 그래픽 / 사운드 -->
      <div style="color:#66ddff;font-size:14px;letter-spacing:6px;margin-bottom:8px">${I18N.t('credits.graphics')}</div>
      <div style="font-size:17px;line-height:2;margin-bottom:50px">${I18N.t('ui.leeGyubin')}<br>Toy Lee<br>Gemini · Claude<br>Midjourney · 나노바나나</div>

      <div style="color:#66ddff;font-size:14px;letter-spacing:6px;margin-bottom:8px">${I18N.t('credits.sound')}</div>
      <div style="font-size:17px;line-height:2;margin-bottom:60px">Toy Lee<br>Gemini · SUNO AI</div>

      <!-- 등장 인물 -->
      <div style="color:#ff99ff;font-size:14px;letter-spacing:6px;margin-bottom:14px">${I18N.t('credits.cast')}</div>
      <div style="font-size:16px;line-height:2.1;margin-bottom:60px;color:#dde">
        🐕 <b style="color:#9ee7ff">${I18N.t('speaker.baekgu')}</b> — ${I18N.t('credits.baekguDesc')}<br>
        ${I18N.t('credits.baekguCreator')}
      </div>

      <div style="color:#ffd700;font-size:14px;letter-spacing:6px;margin-bottom:14px">${I18N.t('credits.heroes')}</div>
      <div style="font-size:16px;line-height:2.1;margin-bottom:60px">
        ${I18N.t('ui.creditEndingHeroes1')}<br>
        ${I18N.t('ui.creditEndingHeroes2')}<br>
        ${I18N.t('ui.creditEndingHeroes3')}<br>
        ${I18N.t('ui.creditEndingHeroes4')}<br>
        ${I18N.t('ui.creditEndingHeroes5')}<br>
        ${I18N.t('ui.creditEndingHeroes6')}<br>
        ${I18N.t('ui.creditEndingHeroes7')}<br>
        ${I18N.t('ui.creditEndingHeroes8')}
      </div>

      <div style="color:#cc66ff;font-size:14px;letter-spacing:6px;margin-bottom:14px">${I18N.t('credits.enemies')}</div>
      <div style="font-size:16px;line-height:2.1;margin-bottom:60px">
        💀 ${I18N.t('speaker.ursaMajor')} — ${I18N.t('credits.ursaDesc')}<br>
        🌑 ${I18N.t('speaker.blackfalcon')} — ${I18N.t('credits.blackfalconDesc')}
      </div>

      <!-- Special thanks -->
      <div style="color:#ffd700;font-size:14px;letter-spacing:6px;margin-bottom:14px">Special Thanks</div>
      <div style="font-size:16px;line-height:2;margin-bottom:14px">
        ${I18N.t('credits.specialThanksCompany')}
      </div>
      <div style="font-size:13px;line-height:1.9;color:#bbb;margin-bottom:80px;font-style:italic">
        ${I18N.t('credits.testerThanks')}
      </div>

      <!-- 면책 -->
      <div style="font-size:12px;color:#888;line-height:1.8;padding:0 20px;margin-bottom:60px;word-break:keep-all">
        ${I18N.t('title.disclaimer')}
      </div>

      <div style="font-size:14px;color:#666;letter-spacing:6px;margin-bottom:8px">${I18N.t('credits.toHumanity')}</div>
      <div style="font-size:26px;color:#fff;letter-spacing:8px;margin-bottom:80px">${I18N.t('ui.thankYou')}</div>

      <div style="font-size:13px;color:#444;letter-spacing:4px">— THE END —</div>
      <div style="height:30vh"></div>
    </div>
    <button id="_credits-close" style="position:absolute;right:24px;bottom:24px;padding:10px 22px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.3);color:#fff;border-radius:6px;cursor:pointer;font-size:13px;letter-spacing:2px;z-index:10">${I18N.t('credits.closeArrow')}</button>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(()=>{overlay.style.opacity='1';});
  const _close=()=>{
    overlay.style.transition='opacity 1.2s ease-out';
    overlay.style.opacity='0';
    setTimeout(()=>{try{overlay.remove();}catch(e){}},1300);
  };
  overlay.querySelector('#_credits-close').onclick=_close;
  // 75초 후 자동 종료
  setTimeout(_close,77000);
  return;  // 기존 모달 사용 안 함
  // ── (구버전 모달 — 사용 안 함, 참고용) ──
}


// ─── 전역 노출 (자동 생성) ─────────────────────────────────────
try{window.SAVE_KEY=SAVE_KEY;}catch(e){}
try{window.SAVE_SLOTS=SAVE_SLOTS;}catch(e){}
try{window._slotKey=_slotKey;}catch(e){}
try{window._getSlotInfo=_getSlotInfo;}catch(e){}
try{window._saveDebounceTimer=_saveDebounceTimer;}catch(e){}
try{window._saveDebouncePendingSlot=_saveDebouncePendingSlot;}catch(e){}
try{window._saveGameImmediate=_saveGameImmediate;}catch(e){}
try{window.saveGame=saveGame;}catch(e){}
try{window._tryRecoverSlot=_tryRecoverSlot;}catch(e){}
try{window.loadGame=loadGame;}catch(e){}
try{window._renderSlotCard=_renderSlotCard;}catch(e){}
try{window.showSaveSlots=showSaveSlots;}catch(e){}
try{window.showLoadSlots=showLoadSlots;}catch(e){}
try{window._getSaveInfo=_getSaveInfo;}catch(e){}
try{window.titleSetDiff=titleSetDiff;}catch(e){}
try{window.syncDiffButtons=syncDiffButtons;}catch(e){}
try{window.showCredits=showCredits;}catch(e){}
console.log('[save-slots] Loaded — 18 decls exposed');
})();
