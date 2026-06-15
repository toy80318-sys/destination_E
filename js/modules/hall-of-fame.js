// ═══════════════════════════════════════════════════════════════════
// DESTINATION EARTH — 명예의 전당 (ACT4/ACT5 기록 + 글로벌 랭킹) 모듈
//   · game.js 에서 분할 (2026-06-12, 사용자 요청: 긴 코드 분할)
//   · 모든 최상위 선언을 window.* 로 노출해 기존 호출처(전역 참조) 호환
// ═══════════════════════════════════════════════════════════════════
(function(){
if(typeof window==='undefined')return;
if(window._HALL_OF_FAME_LOADED)return;
window._HALL_OF_FAME_LOADED=true;

// ── 명예의 전당 — ACT4/ACT5 클리어 시 기록 ────────────────────────
function _recordHallOfFameEntry(act, label){
  if(!G.hallOfFame)G.hallOfFame=[];
  // 동일 act 중복 방지 (이미 같은 게임에서 같은 액트 클리어 기록 있으면 스킵)
  const _gid=G._gameStartedAt||0;
  if(G.hallOfFame.some(h=>h.gid===_gid&&h.act===act))return;
  const now=Date.now();
  const elapsedMs=_gid?(now-_gid):0;
  const _pad=n=>String(n).padStart(2,'0');
  const _hh=Math.floor(elapsedMs/3600000);
  const _mm=Math.floor((elapsedMs%3600000)/60000);
  const _ss=Math.floor((elapsedMs%60000)/1000);
  const playTime=_hh>0?I18N.t('hof.timeHrMin',{h:_hh,m:_pad(_mm)}):I18N.t('hof.timeMinSec',{m:_mm,s:_pad(_ss)});
  const d=new Date(now);
  const dateStr=`${d.getFullYear()}-${_pad(d.getMonth()+1)}-${_pad(d.getDate())}`;
  const entry={
    gid:_gid,
    act,
    label:label||I18N.t('hof.actClear',{act}),
    name:G.profile?.name||I18N.t('hof.commander'),
    company:G.profile?.company||'',
    gender:G.profile?.gender||'',
    turn:G.turn||0,
    credits:G.credits||0,
    reputation:G.reputation||0,
    heroes:(G.heroes||[]).length,
    difficulty:G.difficulty||'normal',
    playTime,
    playedAt:now,
    date:dateStr
  };
  G.hallOfFame.push(entry);
  // 상한 50개 (오래된 것부터 제거)
  if(G.hallOfFame.length>50)G.hallOfFame.splice(0,G.hallOfFame.length-50);
  try{saveGame(true);}catch(e){}
  // 글로벌 명예의 전당(Firestore) 업로드 — ACT4·ACT5 만 (사용자 명세)
  if(act>=4){
    try{
      if(window.CloudSave&&typeof CloudSave.uploadHallOfFame==='function'){
        CloudSave.uploadHallOfFame(entry).then(r=>{
          if(r&&r.ok&&!r.skipped)try{notify(I18N.t('notify.hofRegistered'),'gold');}catch(_){}
          if(r&&r.error)console.warn('[HoF] global upload failed',r.error);
        }).catch(e=>console.warn('[HoF] upload err',e));
      }
    }catch(e){console.warn('[HoF] upload caught',e);}
  }
}
try{if(typeof window!=='undefined')window._recordHallOfFameEntry=_recordHallOfFameEntry;}catch(e){}

// 현재 진행 중인 게임의 실시간 기록 1건 생성 (ACT4/5 클리어 전에도 "내 기록"에 노출)
//   _recordHallOfFameEntry와 동일 포맷 + _live 플래그. 저장하지 않고 표시 전용.
function _hofCurrentRunEntry(){
  const _gid=G._gameStartedAt||0;
  if(!_gid)return null;  // 게임 시작 전(타이틀)에는 진행 기록 없음
  const now=Date.now();
  const elapsedMs=now-_gid;
  const _pad=n=>String(n).padStart(2,'0');
  const _hh=Math.floor(elapsedMs/3600000);
  const _mm=Math.floor((elapsedMs%3600000)/60000);
  const _ss=Math.floor((elapsedMs%60000)/1000);
  const playTime=_hh>0?I18N.t('hof.timeHrMin',{h:_hh,m:_pad(_mm)}):I18N.t('hof.timeMinSec',{m:_mm,s:_pad(_ss)});
  const d=new Date(now);
  const dateStr=`${d.getFullYear()}-${_pad(d.getMonth()+1)}-${_pad(d.getDate())}`;
  return {
    gid:_gid,
    act:G.act||1,
    name:G.profile?.name||I18N.t('hof.commander'),
    company:G.profile?.company||'',
    gender:G.profile?.gender||'',
    turn:G.turn||0,
    credits:G.credits||0,
    reputation:G.reputation||0,
    heroes:(G.heroes||[]).length,
    difficulty:G.difficulty||'normal',
    playTime,
    playedAt:now,
    date:dateStr,
    _live:true
  };
}
try{if(typeof window!=='undefined')window._hofCurrentRunEntry=_hofCurrentRunEntry;}catch(e){}

let _hofTab='mine';  // 'global' | 'mine' — 기본은 내 기록(실제 플레이 기록 즉시 노출)
function _hofRowsHtml(list,diffLabel){
  if(!list.length)return `<div style="color:var(--dim);text-align:center;padding:24px">${I18N.t('hof.empty')}</div>`;
  return list.map(h=>{
    const actCol=h._live?'#66ff99':h.act>=5?'#cc66ff':h.act>=4?'#ffd700':'var(--cyan)';
    const actLbl=(h._live?`ACT ${h.act}`:(h.act>=5?I18N.t('hof.act5Label'):h.act>=4?I18N.t('hof.act4Label'):`ACT ${h.act}`))
      +(h._live?` <span style="color:#66ff99;font-size:10px;border:1px solid #66ff99;border-radius:3px;padding:0 5px;margin-left:4px">${I18N.t('hof.inProgress')}</span>`:'');
    const _ver=window._GAME_VER?'?v='+window._GAME_VER:'';
    return `<div style="border:1px solid var(--bdr);border-radius:8px;padding:10px 12px;margin-bottom:8px;background:rgba(0,0,0,.2);display:flex;gap:12px;align-items:flex-start">
      <img src="img/ui/HN01.png${_ver}" alt="HN" style="width:56px;height:56px;object-fit:contain;flex-shrink:0;filter:drop-shadow(0 0 8px ${actCol});align-self:center" onerror="this.style.display='none'">
      <div style="flex:1;min-width:0">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <div style="color:${actCol};font-size:13px;font-weight:bold;letter-spacing:1px">${actLbl}</div>
          <div style="color:var(--dim);font-size:11px">${h.date||''}</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;font-size:12px;line-height:1.7">
          <div>👤 <b style="color:var(--yellow)">${h.name||I18N.t('hof.unnamed')}</b></div>
          <div>🏢 ${h.company||'-'}</div>
          <div>${I18N.t('ui.playTimeLabel')} <b style="color:var(--cyan)">${h.playTime||'-'}</b></div>
          <div>${I18N.t('ui.turnsLabel')} <b style="color:var(--cyan)">${(h.turn||0).toLocaleString()}</b></div>
          <div>${I18N.t('ui.creditsHeldLabel')} <b style="color:var(--gold)">₡${(h.credits||0).toLocaleString()}</b></div>
          <div>${I18N.t('ui.repHeldLabel')} <b style="color:var(--gold)">${(h.reputation||0).toLocaleString()}</b></div>
          <div>${I18N.t('ui.heroesHeldLabel')} <b>${h.heroes||0}/8</b></div>
          <div>${I18N.t('ui.diffLabelInline')} <b>${diffLabel[h.difficulty]||h.difficulty||'-'}</b></div>
        </div>
      </div>
    </div>`;
  }).join('');
}
function _renderHofTab(tab){
  const diffLabel={easy:I18N.t('difficulty.easy'),normal:I18N.t('difficulty.normal'),hard:I18N.t('difficulty.hard'),extreme:I18N.t('difficulty.extreme')};
  const body=document.getElementById('hof-body');if(!body)return;
  if(tab==='mine'){
    const hall=G.hallOfFame||[];
    const sorted=[...hall].sort((a,b)=>(b.playedAt||0)-(a.playedAt||0));
    // 진행 중인 게임의 실시간 기록을 맨 위에 노출 → 클리어 전에도 실제 플레이 기록이 보임
    const live=_hofCurrentRunEntry();
    const rows=live?[live,...sorted]:sorted;
    body.innerHTML=_hofRowsHtml(rows,diffLabel);
    return;
  }
  // global — 비동기 로드 (재시도 가능)
  body.innerHTML='<div style="text-align:center;color:var(--dim);padding:24px">'+I18N.t('hof.globalLoading')+'</div>';
  if(!window.CloudSave||!CloudSave.listHallOfFame){
    body.innerHTML=`<div style="color:var(--red);text-align:center;padding:24px">
      ${I18N.t('ui.cloudModuleNotLoaded')}<br>
      <div style="color:var(--dim);font-size:12px;margin-top:8px">${I18N.t('ui.firebaseBlockedMsg')}</div>
      <button onclick="_renderHofTab('global')" style="margin-top:12px;padding:6px 14px;border:1px solid var(--cyan);background:rgba(0,243,255,.12);color:var(--cyan);border-radius:6px;cursor:pointer">${I18N.t('ui.tryAgain')}</button>
    </div>`;
    return;
  }
  CloudSave.listHallOfFame({limit:100}).then(r=>{
    if(r.error){
      body.innerHTML=`<div style="color:var(--red);text-align:center;padding:24px">
        ${I18N.t('ui.lookupFail',{err:r.error})}
        <div style="color:var(--dim);font-size:11px;margin-top:8px">${I18N.t('ui.checkAuthOrNetwork')}</div>
        <button onclick="_renderHofTab('global')" style="margin-top:12px;padding:6px 14px;border:1px solid var(--cyan);background:rgba(0,243,255,.12);color:var(--cyan);border-radius:6px;cursor:pointer">${I18N.t('ui.tryAgain')}</button>
      </div>`;
      return;
    }
    body.innerHTML=_hofRowsHtml(r.items||[],diffLabel);
  }).catch(e=>{
    body.innerHTML=`<div style="color:var(--red);text-align:center;padding:24px">
      ${I18N.t('ui.lookupFail',{err:e.message})}
      <button onclick="_renderHofTab('global')" style="margin-top:12px;padding:6px 14px;border:1px solid var(--cyan);background:rgba(0,243,255,.12);color:var(--cyan);border-radius:6px;cursor:pointer">${I18N.t('ui.tryAgain')}</button>
    </div>`;
  });
}
try{if(typeof window!=='undefined')window._renderHofTab=_renderHofTab;}catch(e){}
function switchHofTab(t){
  _hofTab=t;
  // 탭 버튼 활성 상태 갱신
  ['global','mine'].forEach(k=>{
    const b=document.getElementById('hof-tab-'+k);
    if(!b)return;
    const on=k===t;
    b.style.borderColor=on?'var(--cyan)':'var(--bdr)';
    b.style.background=on?'rgba(0,243,255,.12)':'transparent';
    b.style.color=on?'var(--cyan)':'var(--dim)';
  });
  _renderHofTab(t);
}
try{if(typeof window!=='undefined')window.switchHofTab=switchHofTab;}catch(e){}
function showHallOfFame(){
  const html=`<div style="padding:2px 0">
    <div style="display:flex;gap:6px;margin-bottom:10px">
      <button id="hof-tab-global" onclick="switchHofTab('global')" style="padding:6px 14px;font-size:13px;border-radius:6px;border:1px solid var(--bdr);background:transparent;color:var(--dim);cursor:pointer;font-family:inherit">${I18N.t('ui.hofGlobal')}</button>
      <button id="hof-tab-mine" onclick="switchHofTab('mine')" style="padding:6px 14px;font-size:13px;border-radius:6px;border:1px solid var(--cyan);background:rgba(0,243,255,.12);color:var(--cyan);cursor:pointer;font-family:inherit">${I18N.t('ui.hofMine')}</button>
    </div>
    <div id="hof-body" style="max-height:60vh;overflow-y:auto"><div style="text-align:center;color:var(--dim);padding:24px">${I18N.t('ui.loadingDot')}</div></div>
  </div>`;
  openModal(I18N.t('modal.hallOfFame'),html,[{txt:I18N.t('btn.close'),fn:closeModal,cls:'btn-sm'}],{wide:true});
  // 모달 표시 후 내 기록 탭 자동 로드 (실제 플레이 기록을 바로 노출 — 글로벌은 클라우드 의존)
  _hofTab='mine';
  setTimeout(()=>_renderHofTab('mine'),50);
}
// 사용자 보고 2026-06-09: 타이틀 화면 명예의 전당 버튼 미작동 — 명시적 window 노출 + 폴백
try{if(typeof window!=='undefined'){
  window.showHallOfFame=showHallOfFame;
  window.exitFromTitle=typeof exitFromTitle==='function'?exitFromTitle:window.exitFromTitle;
  window.showExitModal=typeof showExitModal==='function'?showExitModal:window.showExitModal;
}}catch(e){}


// ─── 전역 노출 (자동 생성) ─────────────────────────────────────
try{window._recordHallOfFameEntry=_recordHallOfFameEntry;}catch(e){}
try{window._hofTab=_hofTab;}catch(e){}
try{window._hofRowsHtml=_hofRowsHtml;}catch(e){}
try{window._renderHofTab=_renderHofTab;}catch(e){}
try{window.switchHofTab=switchHofTab;}catch(e){}
try{window.showHallOfFame=showHallOfFame;}catch(e){}
console.log('[hall-of-fame] Loaded — 6 decls exposed');
})();
