// ═══════════════════════════════════════════════════════════════════
// DESTINATION EARTH — 피드백 전송 모달 모듈
//   · game.js 에서 분할 (2026-06-12, 사용자 요청: 긴 코드 분할)
//   · 모든 최상위 선언을 window.* 로 노출해 기존 호출처(전역 참조) 호환
// ═══════════════════════════════════════════════════════════════════
(function(){
if(typeof window==='undefined')return;
if(window._FEEDBACK_LOADED)return;
window._FEEDBACK_LOADED=true;

// ── 피드백 ──────────────────────────────────────────────────────
function showFeedback(){
  // 마지막으로 입력한 아이디 복원
  let _lastId='';
  try{_lastId=localStorage.getItem('de_feedback_id')||'';}catch(e){}
  const html=`<div style="padding:6px 4px">
    <div style="text-align:center;margin-bottom:10px">
      <div style="font-size:30px;margin-bottom:6px">📬</div>
      <div style="font-size:13px;color:var(--dim);line-height:1.6">${I18N.t('ui.feedbackHelpsImprove')}<br>${I18N.t('ui.feedbackFree')}</div>
    </div>
    <div style="margin-bottom:10px">
      <label style="display:block;font-size:12px;color:var(--cyan);font-weight:bold;margin-bottom:4px">${I18N.t('ui.fbIdLabel')} <span style="color:var(--dim);font-weight:normal">${I18N.t('ui.fbIdOptional')}</span></label>
      <input id="fb-id" type="text" maxlength="60" value="${_lastId.replace(/"/g,'&quot;')}" placeholder="${I18N.t('ui.fbIdPlaceholder')}"
        style="width:100%;padding:7px 9px;background:rgba(255,255,255,.06);border:1px solid rgba(0,243,255,.3);border-radius:6px;color:var(--txt);font-family:inherit;font-size:13px;outline:none;box-sizing:border-box"
        onfocus="this.style.borderColor='var(--cyan)'" onblur="this.style.borderColor='rgba(0,243,255,.3)'">
    </div>
    <div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px">
        <label style="font-size:12px;color:var(--cyan);font-weight:bold">${I18N.t('ui.fbBodyLabel')}</label>
        <span id="fb-count" style="font-size:11px;color:var(--dim)">0 / 500</span>
      </div>
      <textarea id="fb-msg" maxlength="500" rows="7"
        placeholder="${I18N.t('ui.fbBodyPlaceholder')}"
        oninput="document.getElementById('fb-count').textContent=this.value.length+' / 500';document.getElementById('fb-count').style.color=this.value.length>=480?'var(--red)':this.value.length>=400?'var(--yellow)':'var(--dim)'"
        style="width:100%;padding:8px 10px;background:rgba(255,255,255,.06);border:1px solid rgba(0,243,255,.3);border-radius:6px;color:var(--txt);font-family:inherit;font-size:13px;line-height:1.6;outline:none;resize:vertical;min-height:120px;box-sizing:border-box"
        onfocus="this.style.borderColor='var(--cyan)'" onblur="this.style.borderColor='rgba(0,243,255,.3)'"></textarea>
    </div>
    <div style="background:rgba(255,255,255,.04);border-radius:6px;padding:8px 10px;font-size:11px;color:var(--dim);line-height:1.6">
      ${I18N.t('ui.fbHelpHtml')}
    </div>
  </div>`;
  openModal(I18N.t('modal.feedback'),html,[
    {txt:I18N.t('feedback.copyBtn'),fn:_copyFeedback,cls:'btn-sm'},
    {txt:I18N.t('feedback.sendBtn'),fn:_sendFeedback,cls:'btn-gold'},
    {txt:I18N.t('btn.close'),fn:closeModal,cls:'btn-sm'}
  ],{wide:true});
}
function _gatherFeedback(){
  const id=(document.getElementById('fb-id')?.value||'').trim().slice(0,60);
  const msg=(document.getElementById('fb-msg')?.value||'').trim().slice(0,500);
  return{id,msg};
}
function _saveFeedbackLocal(id,msg){
  try{
    if(id)localStorage.setItem('de_feedback_id',id);
    const log=JSON.parse(localStorage.getItem('de_feedback_log')||'[]');
    log.push({id,msg,ts:new Date().toISOString(),ver:window._GAME_VER||'',turn:G?.turn||0});
    // 최대 20건 보관
    while(log.length>20)log.shift();
    localStorage.setItem('de_feedback_log',JSON.stringify(log));
  }catch(e){}
}
async function _sendFeedback(){
  const{id,msg}=_gatherFeedback();
  if(!msg){notify(I18N.t('notify.enterContent'),'err');return;}
  _saveFeedbackLocal(id,msg);
  notify(I18N.t('notify.feedbackSending'),'ok');
  let sent=false;
  // 1차: Firestore 전송 (실제 개발자에게 전달)
  if(window.CloudSave){
    try{
      const r=await CloudSave.sendFeedback(id,msg,{ver:window._GAME_VER||'1.1',turn:G?.turn||0});
      if(r&&r.ok){sent=true;notify(I18N.t('notify.feedbackSent'),'gold');}
    }catch(e){}
  }
  // 2차 폴백: mailto (Firestore 실패시)
  if(!sent){
    const subject=I18N.t('ui.feedbackSubject',{from:id?I18N.t('ui.feedbackSubjFromId',{id}):''});
    const body=I18N.t('ui.feedbackBody',{id:id||I18N.t('ui.notEntered'),ver:window._GAME_VER||'1.1',turn:G?.turn||0,msg});
    const url='mailto:toy80318@gmail.com?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
    try{window.location.href=url;}catch(e){}
    notify(I18N.t('notify.feedbackMailFallback'),'warn');
  }
  closeModal();
}
function _copyFeedback(){
  const{id,msg}=_gatherFeedback();
  if(!msg){notify(I18N.t('notify.enterContent'),'err');return;}
  _saveFeedbackLocal(id,msg);
  const text=I18N.t('ui.feedbackTemplate',{id:id||I18N.t('ui.notEntered'),ver:window._GAME_VER||'1.1',turn:G?.turn||0,msg});
  try{
    navigator.clipboard.writeText(text).then(()=>{
      notify(I18N.t('notify.clipboardCopiedToEmail'),'ok');
    }).catch(()=>{
      // 폴백: 수동 복사 안내
      notify(I18N.t('notify.copyFailed'),'warn');
    });
  }catch(e){
    notify(I18N.t('notify.copyFailed'),'warn');
  }
}


// ─── 전역 노출 (자동 생성) ─────────────────────────────────────
try{window.showFeedback=showFeedback;}catch(e){}
try{window._gatherFeedback=_gatherFeedback;}catch(e){}
try{window._saveFeedbackLocal=_saveFeedbackLocal;}catch(e){}
try{window._sendFeedback=_sendFeedback;}catch(e){}
try{window._copyFeedback=_copyFeedback;}catch(e){}
console.log('[feedback] Loaded — 5 decls exposed');
})();
