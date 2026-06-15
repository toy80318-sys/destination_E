// ═══════════════════════════════════════════════════════════════════
// DESTINATION EARTH — 치트 메뉴 모듈
//   · 비밀번호 보호된 디버그/테스트용 자원 지급
//   · 노출: cheatGiveCredits, cheatGiveResource, cheatGiveAllMega,
//           cheatMaxAll, cheatUnlockVoid, cheatGrantMythicSet, replayEnding
//
// 의존 글로벌: G, I18N, PLANET_DEF, updateHUD, saveGame, notify, baekgu,
//             openModal, closeModal, partById, showEndingCredits, AudioMgr
// ═══════════════════════════════════════════════════════════════════
(function(){
if(typeof window==='undefined') return;
if(window._CHEAT_MENU_LOADED) return;
window._CHEAT_MENU_LOADED=true;

const CHEAT_PASSWORD='de';

// 인게임 모달로 비밀번호 입력 받기 (브라우저 prompt 차단 우회)
function _cheatUnlock(onOk){
  if(sessionStorage.getItem('de_cheat_unlocked')==='1'){
    if(typeof onOk==='function')onOk();
    return true;
  }
  openModal(I18N.t('modal.cheatLock'),
    `<div style="padding:14px;text-align:center">
      <div style="font-size:40px;margin-bottom:8px">🔐</div>
      <div style="font-size:14px;color:var(--yellow);margin-bottom:10px">${I18N.t('ui.enterCheatPassword')}</div>
      <input type="password" id="_cheat-pw" placeholder="${I18N.t('placeholder.password')}" autofocus
        style="width:80%;padding:10px;font-size:16px;background:rgba(0,0,0,.5);border:1px solid var(--cyan);color:#fff;border-radius:6px;text-align:center;font-family:inherit"
        onkeydown="if(event.key==='Enter')document.getElementById('_cheat-ok').click()">
    </div>`,
    [
      {txt:I18N.t('cheat.confirmBtn'),id:'_cheat-ok',fn:()=>{
        const v=(document.getElementById('_cheat-pw')||{}).value||'';
        if(v.trim()===CHEAT_PASSWORD){
          sessionStorage.setItem('de_cheat_unlocked','1');
          closeModal();
          notify(I18N.t('notify.cheatUnlocked'),'gold');
          if(typeof onOk==='function')setTimeout(onOk,200);
        } else {
          notify(I18N.t('notify.wrongPassword'),'err');
        }
      },cls:'btn-gold'},
      {txt:I18N.t('btn.cancel'),fn:closeModal,cls:'btn-sm'}
    ]
  );
  return false;
}

function _doGiveCredits(amt){
  if(!G||!G.profile){notify(I18N.t('notify.startGameFirstLong'),'err');return;}
  G.credits=(G.credits||0)+amt;updateHUD();saveGame(true);
  notify(I18N.t('notify.cheatCredits',{amt:amt.toLocaleString(),total:G.credits.toLocaleString()}),'gold');
}
function cheatGiveCredits(amt){
  amt=Number(amt)||0;if(amt<=0)return;
  _cheatUnlock(()=>_doGiveCredits(amt));
}

function _doGiveResource(type,amt){
  if(!G||!G.profile){notify(I18N.t('notify.startGameFirst'),'err');return;}
  if(type==='rep'){G.reputation=(G.reputation||0)+amt;notify(I18N.t('notify.cheatRep',{amt,total:G.reputation}),'gold');}
  else if(type==='vc'){G.voidCrystal=(G.voidCrystal||0)+amt;notify(I18N.t('notify.cheatVc',{amt,total:G.voidCrystal}),'pur');}
  else if(type==='ve'){G.voidEssence=(G.voidEssence||0)+amt;notify(I18N.t('notify.cheatVe',{amt,total:G.voidEssence}),'gold');}
  updateHUD();saveGame(true);
}
function cheatGiveResource(type,amt){
  amt=Number(amt)||0;if(amt<=0)return;
  _cheatUnlock(()=>_doGiveResource(type,amt));
}

function _doMega(){
  if(!G||!G.profile){notify(I18N.t('notify.startGameFirst'),'err');return;}
  G.credits=(G.credits||0)+100000000;
  G.reputation=(G.reputation||0)+200;
  G.voidCrystal=(G.voidCrystal||0)+50;
  G.voidEssence=(G.voidEssence||0)+1000;
  updateHUD();saveGame(true);
  notify(I18N.t('notify.megaCharge'),'gold');
  if(typeof baekgu==='function')baekgu(I18N.t('baekgu.megaChargeDone',{nm:G.profile?.name||I18N.t('hof.commander')}));
}
function cheatGiveAllMega(){_cheatUnlock(_doMega);}

function _doMaxAll(){
  if(!G||!G.profile){notify(I18N.t('notify.startGameFirst'),'err');return;}
  G.credits=999999999;
  G.reputation=Math.max(G.reputation||0,999);
  G.voidCrystal=Math.max(G.voidCrystal||0,99);
  G.voidEssence=Math.max(G.voidEssence||0,99999);
  G.heroes=G.heroes||[];
  ['H01','H02','H03','H04','H05','H06','H07','H08'].forEach(h=>{if(!G.heroes.includes(h))G.heroes.push(h);});
  G._earthLiberated=true;
  G.act=Math.max(G.act||1,4);
  (PLANET_DEF||[]).forEach(p=>{if(!G.planets[p.id])G.planets[p.id]={fog:'A',owned:false,commerce:0};else G.planets[p.id].fog='A';});
  updateHUD();saveGame(true);
  notify(I18N.t('notify.megaChargeFull'),'gold');
  if(typeof baekgu==='function')baekgu(I18N.t('baekgu.maxCheatApplied',{nm:G.profile?.name||I18N.t('hof.commander')}));
}
function cheatMaxAll(){_cheatUnlock(_doMaxAll);}

// 엔딩 크레딧 수동 재생
function replayEnding(){
  if(!G){notify(I18N.t('notify.startGameFirst'),'err');return;}
  if(typeof showEndingCredits!=='function'){notify(I18N.t('notify.endingFnMissing'),'err');return;}
  G._endingShown=false;
  G.currentPlanet='P31';
  if(!G.planets)G.planets={};
  if(!G.planets['P31'])G.planets['P31']={fog:'A',owned:false,commerce:0};
  else G.planets['P31'].fog='A';
  try{AudioMgr.playBgm('P31');}catch(e){}
  showEndingCredits(()=>{notify(I18N.t('notify.endingWatched'),'gold');});
}

// 보이드 퀘스트 즉시 해금
function _doUnlockVoid(){
  if(!G||!G.profile){notify(I18N.t('notify.startGameFirst'),'err');return;}
  G._earthLiberated=true;
  G._falconDefeated=false;
  G._voidFalconDefeated=false;
  G.act=Math.max(G.act||1,4);
  (PLANET_DEF||[]).forEach(p=>{
    if(p.void){
      if(!G.planets[p.id])G.planets[p.id]={fog:'A',owned:false,commerce:0};
      else G.planets[p.id].fog='A';
    }
  });
  if(G.quests&&G.quests['P30']){
    G.quests['P30']=G.quests['P30'].filter(q=>q.id!=='q_void_boss');
  }
  if((G.voidCrystal||0)<5)G.voidCrystal=5;
  updateHUD();saveGame(true);
  notify(I18N.t('notify.voidPhaseUnlockedShort'),'pur');
  if(typeof baekgu==='function')baekgu(I18N.t('baekgu.voidPhaseUnlocked'));
}
function cheatUnlockVoid(){_cheatUnlock(_doUnlockVoid);}

// 신화 파츠 풀세트 지급
function _doGrantMythicSet(){
  if(!G||!G.profile){notify(I18N.t('notify.startGameFirst'),'err');return;}
  if(!G.inventory)G.inventory=[];
  if(!G.blueprints)G.blueprints={};
  const grantedParts=['MW01','MS01','MA01','ME01','RB10'];
  const grantedNames=[];
  grantedParts.forEach(pid=>{
    const _def=partById(pid);
    const inv=G.inventory.find(i=>i.id===pid);
    if(inv)inv.qty++;else G.inventory.push({id:pid,qty:1});
    grantedNames.push(_def?_def.nm:pid);
  });
  const bpAdded=[];
  if(!G.blueprints.LGD03){G.blueprints.LGD03=true;bpAdded.push(I18N.t('reward.bpName.LGD03'));}
  if(!G.blueprints.RB10){G.blueprints.RB10=true;bpAdded.push(I18N.t('reward.bpName.RB10'));}
  updateHUD();saveGame(true);
  notify(I18N.t('notify.mythicFullSetGrant',{n:grantedNames.length,bp:bpAdded.length}),'pur');
  if(typeof baekgu==='function')baekgu(I18N.t('baekgu.mythicSetGranted',{names:grantedNames.join(', ')})+(bpAdded.length?I18N.t('baekgu.bpAdded',{names:bpAdded.join(', ')}):''));
}
function cheatGrantMythicSet(){_cheatUnlock(_doGrantMythicSet);}

// 글로벌 노출 (기존 HTML onclick 호출처 호환)
window.cheatGiveCredits=cheatGiveCredits;
window.cheatGiveResource=cheatGiveResource;
window.cheatGiveAllMega=cheatGiveAllMega;
window.cheatMaxAll=cheatMaxAll;
window.cheatUnlockVoid=cheatUnlockVoid;
window.cheatGrantMythicSet=cheatGrantMythicSet;
window.replayEnding=replayEnding;
window._cheatUnlock=_cheatUnlock;

console.log('[cheat-menu] Loaded — 7 cheat functions');
})();
