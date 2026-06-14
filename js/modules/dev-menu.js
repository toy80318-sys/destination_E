// ═══════════════════════════════════════════════════════════════════
// DESTINATION EARTH — 개발자 숨겨진 메뉴 모듈
//   · game.js 에서 분할 (2026-06-12, 사용자 요청: 긴 코드 분할)
//   · 모든 최상위 선언을 window.* 로 노출해 기존 호출처(전역 참조) 호환
// ═══════════════════════════════════════════════════════════════════
(function(){
if(typeof window==='undefined')return;
if(window._DEV_MENU_LOADED)return;
window._DEV_MENU_LOADED=true;

// ══════════════════════════════════════════════════════════════════
// 개발자 숨겨진 메뉴 (비밀번호 보호 + Firestore admin 규칙)
// 진입: Ctrl+Shift+D, 또는 URL ?dev=1, 또는 타이틀 로고 5연속 클릭
// ══════════════════════════════════════════════════════════════════
const DEV_PASSWORDS=['baekgu2026','destinatione-dev','toy80318'];
const ADMIN_EMAIL='toy80318@gmail.com';
function promptDevPassword(){
  const pw=prompt(I18N.t('dev.passwordPrompt'));
  if(!pw)return;
  if(DEV_PASSWORDS.indexOf(pw.trim())>=0){
    sessionStorage.setItem('de_dev_unlocked','1');
    showDevMenu();
  }else{
    notify(I18N.t('notify.wrongPassword'),'err');
  }
}
function showDevMenu(){
  const u=window.CloudSave&&CloudSave.getUser&&CloudSave.getUser();
  const isAdmin=!!(u&&u.email&&u.email.toLowerCase()===ADMIN_EMAIL);
  const html=`<div style="padding:8px 4px">
    <div style="background:rgba(255,165,0,.06);border:1px solid rgba(255,165,0,.25);border-radius:8px;padding:10px;margin-bottom:12px;font-size:12px;line-height:1.6">
      <div style="font-weight:bold;color:#ffa500;margin-bottom:4px">${I18N.t('ui.devModeActivated')}</div>
      <div style="color:var(--dim)">${I18N.t('ui.currentStatus')}: ${isAdmin?`<span style="color:var(--green)">${I18N.t('ui.adminBadge')} (${u.email})</span>`:`<span style="color:var(--yellow)">${I18N.t('ui.adminLoginNeeded')}</span>`}</div>
    </div>
    ${!isAdmin?`
      <div style="font-size:13px;color:var(--txt);margin-bottom:8px">${I18N.t('ui.dataLookupVia',{email:ADMIN_EMAIL})}</div>
      <button class="btn btn-sm" style="width:100%;margin-bottom:8px" onclick="cloudGoogleSignIn()">${I18N.t('dev.googleLoginAdmin')}</button>
    `:''}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px">
      <button class="btn btn-sm" ${!isAdmin?'disabled style="opacity:.4"':''} onclick="devShowFeedback()">${I18N.t('dev.viewFeedback')}</button>
      <button class="btn btn-sm" ${!isAdmin?'disabled style="opacity:.4"':''} onclick="devShowSaveStats()">${I18N.t('dev.saveStats')}</button>
      <button class="btn btn-sm" style="border-color:#ffa500;color:#ffa500" onclick="cheatGiveCredits(10000000)">${I18N.t('dev.cr10mShort')}</button>
      <button class="btn btn-sm" style="border-color:#ffa500;color:#ffa500" onclick="cheatGiveCredits(100000000)">${I18N.t('dev.cr100mShort')}</button>
      <button class="btn btn-sm btn-red" onclick="if(confirm(I18N.t('confirm.deleteAllLocal'))){for(let i=0;i<=8;i++)localStorage.removeItem(i===0?'de_save':'de_save_s'+i);notify(I18N.t('notify.allLocalDeleted'),'ok');}">${I18N.t('settings.localDeleteAll')}</button>
      <button class="btn btn-sm" onclick="(function(){const log=JSON.parse(localStorage.getItem('de_feedback_log')||'[]');alert('${I18N.t('feedback.localLogAlert').replace(/'/g,"\\'")}'+JSON.stringify(log,null,2));})()">${I18N.t('feedback.localLog')}</button>
    </div>
    <div style="font-size:10px;color:var(--muted);text-align:center;margin-top:6px">${I18N.t('dev.menuTagline')}</div>
  </div>`;
  openModal(I18N.t('modal.devMenu'),html,[{txt:I18N.t('btn.close'),fn:closeModal,cls:'btn-sm'}],{wide:true});
}
async function devShowFeedback(){
  if(!window.CloudSave){notify(I18N.t('notify.cloudSaveNotInit'),'err');return;}
  notify(I18N.t('notify.feedbackQuerying'),'ok');
  const r=await CloudSave.listFeedback(200);
  if(r.error){notify(I18N.t('notify.queryFailErr',{err:r.error}),'err');return;}
  const items=r.items||[];
  const escapeHtml=s=>String(s||'').replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'})[c]);
  const rows=items.map(f=>`
    <div style="border:1px solid rgba(0,243,255,.2);border-radius:6px;padding:8px 10px;margin-bottom:6px;background:rgba(255,255,255,.03)">
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--dim);margin-bottom:4px">
        <span>${escapeHtml(f.id||I18N.t('feedback.anon'))} ${f.anon?'👤':'🔐'}</span>
        <span>${f.tsClient?new Date(f.tsClient).toLocaleString('ko-KR'):''}</span>
      </div>
      <div style="font-size:13px;color:var(--txt);line-height:1.6;white-space:pre-wrap">${escapeHtml(f.msg)}</div>
      <div style="font-size:10px;color:var(--muted);margin-top:4px">v${escapeHtml(f.ver)} · TURN ${f.turn||0} · ${escapeHtml((f.ua||'').slice(0,50))}</div>
    </div>`).join('');
  const html=`<div style="max-height:60vh;overflow-y:auto;padding:4px">
    ${items.length===0?`<div style="text-align:center;color:var(--dim);padding:30px">${I18N.t('ui.noFeedbacksYet')}</div>`:rows}
  </div>`;
  openModal(I18N.t('modal.feedbackCount',{n:items.length}),html,[{txt:I18N.t('btn.close'),fn:closeModal,cls:'btn-sm'}],{wide:true});
}
function devShowSaveStats(){
  let localCount=0,localBytes=0;
  for(let i=0;i<=SAVE_SLOTS;i++){
    const v=localStorage.getItem(i===0?'de_save':'de_save_s'+i);
    if(v){localCount++;localBytes+=v.length;}
  }
  const u=window.CloudSave&&CloudSave.getUser&&CloudSave.getUser();
  const html=`<div style="padding:8px;font-size:13px;line-height:1.8">
    <div><b>${I18N.t('save.localSlots')}</b> ${localCount} / ${SAVE_SLOTS}</div>
    <div><b>${I18N.t('save.localBytes')}</b> ${(localBytes/1024).toFixed(1)} KB</div>
    <div><b>${I18N.t('feedback.uidLabel')}</b> ${u?u.uid:I18N.t('feedback.notLoggedIn')}</div>
    <div><b>${I18N.t('feedback.emailLabel')}</b> ${u?(u.email||I18N.t('feedback.anon')):'-'}</div>
  </div>`;
  openModal(I18N.t('modal.saveStats'),html,[{txt:I18N.t('btn.close'),fn:closeModal,cls:'btn-sm'}]);
}

// 개발자 메뉴 진입: 키보드 단축키

// ─── 전역 노출 (자동 생성) ─────────────────────────────────────
try{window.DEV_PASSWORDS=DEV_PASSWORDS;}catch(e){}
try{window.ADMIN_EMAIL=ADMIN_EMAIL;}catch(e){}
try{window.promptDevPassword=promptDevPassword;}catch(e){}
try{window.showDevMenu=showDevMenu;}catch(e){}
try{window.devShowFeedback=devShowFeedback;}catch(e){}
try{window.devShowSaveStats=devShowSaveStats;}catch(e){}
console.log('[dev-menu] Loaded — 6 decls exposed');
})();
