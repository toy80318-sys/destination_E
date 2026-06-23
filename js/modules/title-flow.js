// ═══ TITLE / AGE / FTUE — game.js 에서 분리 (C7, 2026-06-23, 긴 코드 분할) ═══
//   타이틀/연령게이트/성별·난이도 선택 흐름. 전부 onclick(런타임) 호출이라
//   game.js 직후 로드로 충분(호출 시점엔 save-slots.js/settings-backup.js도 로드 완료).
//   잔류 의존 전역(다른 파일): show, AudioMgr, I18N, G, openModal, closeModal, notify,
//     saveGame, _baekguIcon, showSettingsModal(settings-backup.js),
//     syncDiffButtons·_titleDiff(window, save-slots.js — bare 참조는 window 프로퍼티라 동작),
//     window.desktopAPI(Electron). 경계 상태(combatState 등) 미참조.

// 사용자 보고 2026-06-09: 새 게임 버튼 안 됨 — goAgeGate 함수가 정의되지 않아
// onclick="goAgeGate()" 가 무반응. 함수 복구.
function goAgeGate(){
  try{
    // 연령 게이트 화면으로 이동 (s-agegate). checkAge 가 통과 시 s-ftue 로 진행.
    if(typeof show==='function')show('s-agegate');
    else if(typeof document!=='undefined'){
      // 폴백: show() 가 아직 정의 안 된 극한 상황 — 직접 클래스 조작
      document.querySelectorAll('.scr.on').forEach(function(el){el.classList.remove('on');});
      var t=document.getElementById('s-agegate'); if(t)t.classList.add('on');
    }
  }catch(e){
    console.error('[goAgeGate] failed:',e);
    try{notify('연령 확인 화면 진입 실패: '+e.message,'err');}catch(_){}
  }
}
try{if(typeof window!=='undefined')window.goAgeGate=goAgeGate;}catch(e){}
function showExitModal(){
  openModal(I18N.t('modal.exitGame'),
    `<div style="text-align:center;padding:12px">
      <div style="margin-bottom:12px">${_baekguIcon(58)}</div>
      <div style="color:var(--yellow);font-size:18px;font-weight:bold;margin-bottom:8px">${I18N.t('ui.confirmExit')}</div>
      <div style="color:var(--dim);font-size:14px;line-height:1.8">
        ${I18N.t('ui.currentTurnLine',{turn:G.turn})}<br>
        ${I18N.t('ui.heldCreditsLine',{cr:G.credits.toLocaleString()})}<br>
        <span style="color:var(--muted);font-size:12px">${I18N.t('ui.saveBeforeExitTip')}</span>
      </div>
    </div>`,
    [
      {txt:I18N.t('btn.saveAndExit'),fn:()=>{saveGame(false);setTimeout(()=>{try{window.close();}catch(e){}showTitle();closeModal();},400);},cls:'btn-gold'},
      {txt:I18N.t('btn.exitWithoutSave'),fn:()=>{try{window.close();}catch(e){}showTitle();closeModal();},cls:'btn-red'},
      {txt:I18N.t('btn.cancel'),fn:closeModal,cls:'btn-sm'}
    ]
  );
}
function showTitle(){show('s-title');try{AudioMgr.playBgm('Title');}catch(e){}}
// 타이틀 화면 종료 — Electron 은 앱 종료, 웹은 창 닫기 시도 후 안내
function exitFromTitle(){
  const isEn=(window.I18N&&window.I18N.getLang&&window.I18N.getLang()==='en');
  const _t=isEn?{
    title:'Exit Game',
    msg:'Exit Destination Earth?',
    confirm:'Exit',
    cancel:'Cancel',
    closeHint:'You can safely close this browser tab.'
  }:{
    title:'게임 종료',
    msg:'데스티네이션 어스를 종료하시겠습니까?',
    confirm:'종료',
    cancel:'취소',
    closeHint:'브라우저 탭을 직접 닫아 주세요.'
  };
  openModal(_t.title,
    `<div style="text-align:center;padding:14px 4px;font-size:15px;color:var(--txt);line-height:1.7">${_t.msg}</div>`,
    [
      {txt:_t.confirm,cls:'btn-red',fn:()=>{
        closeModal();
        // Electron PC 빌드 — 앱 종료
        if(window.desktopAPI&&typeof window.desktopAPI.quit==='function'){
          try{window.desktopAPI.quit();return;}catch(e){}
        }
        // 일반 브라우저 — window.close 시도 (script로 열린 창만 닫힘)
        try{window.close();}catch(e){}
        // 닫히지 않으면 안내
        setTimeout(()=>{
          if(!window.closed){
            try{notify(_t.closeHint,'warn');}catch(e){}
          }
        },200);
      }},
      {txt:_t.cancel,cls:'btn-sm',fn:closeModal}
    ]);
}
function checkAge(){
  const y=parseInt(document.getElementById('ag-y').value),m=parseInt(document.getElementById('ag-m').value),d=parseInt(document.getElementById('ag-d').value);
  const err=document.getElementById('ag-err');
  if(!y||!m||!d||y<1900||y>2015){err.textContent=I18N.t('agegate.invalidDate');return;}
  const birth=new Date(y,m-1,d),now=new Date();let age=now.getFullYear()-birth.getFullYear();
  if(now.getMonth()<birth.getMonth()||(now.getMonth()===birth.getMonth()&&now.getDate()<birth.getDate()))age--;
  if(age<12){err.textContent=I18N.t('agegate.under12');return;}
  if(age<18)G.isMinor=true;err.textContent='';syncDiffButtons(_titleDiff);setDifficulty(_titleDiff);show('s-ftue');
}
function setGender(g){
  G.profile.gender=g;
  document.getElementById('gb-m').style.borderColor=g==='male'?'var(--cyan)':'var(--bdr)';
  document.getElementById('gb-m').style.color=g==='male'?'var(--cyan)':'var(--dim)';
  document.getElementById('gb-f').style.borderColor=g==='female'?'var(--cyan)':'var(--bdr)';
  document.getElementById('gb-f').style.color=g==='female'?'var(--cyan)':'var(--dim)';
  // 사용자 요청 2026-06-12: 선택한 성별의 사령관 이미지 강조 (비선택 쪽은 흐리게)
  try{
    const _mi=document.getElementById('gb-m-img'),_fi=document.getElementById('gb-f-img');
    if(_mi){_mi.style.borderColor=g==='male'?'var(--cyan)':'var(--bdr)';_mi.style.opacity=g==='male'?'1':'.55';_mi.style.filter=g==='male'?'none':'grayscale(.4)';}
    if(_fi){_fi.style.borderColor=g==='female'?'var(--cyan)':'var(--bdr)';_fi.style.opacity=g==='female'?'1':'.55';_fi.style.filter=g==='female'?'none':'grayscale(.4)';}
  }catch(e){}
}
const DIFF_LIST=['easy','normal','hard','extreme'];
const DIFF_COLORS={easy:'var(--cyan)',normal:'var(--yellow)',hard:'#ff8c42',extreme:'var(--red)'};
function setDifficulty(d){
  G.difficulty=d;
  DIFF_LIST.forEach(k=>{
    const btn=document.getElementById('df-'+k);if(!btn)return;
    const active=k===d;
    btn.style.borderColor=active?DIFF_COLORS[d]:'var(--bdr)';
    btn.style.background=active?`rgba(${d==='easy'?'0,243,255':d==='normal'?'222,255,154':d==='hard'?'255,140,66':'255,59,59'},.1)`:'transparent';
    btn.style.color=active?DIFF_COLORS[d]:'var(--dim)';
  });
}
// 설정 모달에서 난이도 변경 (인라인 onclick은 const G에 직접 접근 불가 → 전역 함수로 위임)
function changeDifficultyFromSettings(d){
  G.difficulty=d;
  const lbl={easy:I18N.t('difficulty.easy'),normal:I18N.t('difficulty.normal'),hard:I18N.t('difficulty.hard'),extreme:I18N.t('difficulty.extreme')}[d]||d;
  notify(I18N.t('notify.difficultyChanged',{lbl}),'ok');
  saveGame(true);
  // 설정 모달 다시 렌더 (활성 표시 갱신)
  showSettingsModal();
}
// 난이도 배율: easy=0.9, normal=1.0, hard=1.1, extreme=1.2 (HP+ATK 모두)

// ─── onclick(index.html) 참조용 전역 export (C7 분리, 2026-06-23) ───────────────
try{if(typeof window!=='undefined'){
  window.goAgeGate=goAgeGate;
  window.showExitModal=showExitModal;
  window.showTitle=showTitle;
  window.exitFromTitle=exitFromTitle;
  window.checkAge=checkAge;
  window.setGender=setGender;
  window.setDifficulty=setDifficulty;
  window.changeDifficultyFromSettings=changeDifficultyFromSettings;
  window.DIFF_LIST=DIFF_LIST;
  window.DIFF_COLORS=DIFF_COLORS;
}}catch(e){}
