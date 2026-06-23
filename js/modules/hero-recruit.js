// ═══ HERO RECRUIT — game.js 에서 분리 (C6, 2026-06-23, 긴 코드 분할) ═══
//   전설 영웅 8인 영입/탑승/하선/전원수집 보상/장영실 효과.
//   전역 function 이라 호출부 변경 불필요(onclick·디스패치 모두 이름 호출).
//   game.js 직후(views-misc.js 인근) 로드. 잔류 의존 전역(game.js 등):
//     HEROES, I18N, G, PLANET_DEF, openModal, closeModal, notify, baekgu,
//     getMaxCrew, getShipStats, _syncShipCapacity, shipDisplayNm, rerenderShipOrGarage,
//     saveGame, updateHUD, sfxCoin, changeReputation, _heroPortrait, window.STORY_SCENES_PC.
//   combatState/getShipStats 등 경계 앵커는 참조만(이동 안 함).

// 8인의 핵심 영웅 등장 시 자동 영입 — 모달은 축하용이며 어떤 버튼을 눌러도 영입은 유지된다.
// (H01 이순신만 난중일기 G18 필요 — 풀 단계에서 제외하므로 여기엔 도달하지 않는다)
// 전설 영웅 첫 만남 멘트 (영입 연출용)
const HERO_GREETING={
  get H01(){return I18N.t('heroGreet.H01');},
  get H02(){return I18N.t('heroGreet.H02');},
  get H03(){return I18N.t('heroGreet.H03');},
  get H04(){return I18N.t('heroGreet.H04');},
  get H05(){return I18N.t('heroGreet.H05');},
  get H06(){return I18N.t('heroGreet.H06');},
  get H07(){return I18N.t('heroGreet.H07');},
  get H08(){return I18N.t('heroGreet.H08');}
};
function showHeroRecruit(heroId){
  // HEROES 데이터 미로드 시 안전 종료
  if(typeof HEROES==='undefined')return;
  const h=HEROES[heroId];if(!h)return;
  // ★ 시나리오 컷씬 즉시 트리거 — 어느 경로든 영입 모달 호출 시 컷씬 보장 (사용자 요청)
  if(window.STORY_SCENES_PC && typeof window.STORY_SCENES_PC.triggerHeroRecruitScene==='function'){
    try{ window.STORY_SCENES_PC.triggerHeroRecruitScene(heroId); }
    catch(e){console.warn('[STORY] showHeroRecruit trigger fail',e);}
  } else {
    console.warn('[STORY] STORY_SCENES_PC not loaded — cutscene skipped for', heroId);
  }
  // 1) 먼저 영입 확정 (notify + baekgu + saveGame 포함). 실패해도 본 함수는 정보용으로 계속 진행.
  const _already=(G.heroes||[]).includes(heroId);
  if(!_already){try{recruitHero(heroId);}catch(e){console.warn('[hero] auto-recruit',e.message);}}
  const _ok=(G.heroes||[]).includes(heroId);
  const _greet=HERO_GREETING[heroId]||'';
  // 2) 축하 모달 — 닫기 버튼 1개만, 영입 결과에 영향 없음
  //    인물 이미지 3배 확대(96→288) + 첫 만남 멘트 (사용자 요청)
  openModal(I18N.t('modal.legendHeroJoined',{ic:h.ic}),
    `<div style="text-align:center;padding:8px">
      <div style="display:flex;justify-content:center;margin-bottom:10px;filter:drop-shadow(0 0 28px gold)">${_heroPortrait({...h,id:heroId},288,'var(--gold)')}</div>
      <div style="color:var(--gold);font-size:24px;font-weight:bold;margin-bottom:4px">${(I18N&&I18N.has&&I18N.has('hero.'+heroId+'.nm'))?I18N.t('hero.'+heroId+'.nm'):h.nm}</div>
      <div style="font-size:12px;color:var(--cyan);letter-spacing:2px;margin-bottom:10px">${_ok?I18N.t('ui.recruitCompleteDesc'):I18N.t('ui.recruitFailedCond')}</div>
      ${_greet?`<div style="background:rgba(255,215,0,.06);border:1px solid rgba(255,215,0,.35);border-radius:10px;padding:12px 16px;margin-bottom:10px;font-size:16px;line-height:1.8;color:var(--yellow);font-style:italic;word-break:keep-all">"${_greet}"</div>`:''}
      <div style="background:var(--card);border-radius:8px;padding:12px;font-size:13px;line-height:2">
        ATT:${h.ATT} INT:${h.INT} DEF:${h.DEF} HP:${h.HP}<br>${I18N.t('ui.specialSign')}: <span style="color:var(--purple)">${(I18N&&I18N.has&&I18N.has('hero.'+heroId+'.sk'))?I18N.t('hero.'+heroId+'.sk'):h.sk}</span>
      </div>
    </div>`,
    [{txt:I18N.t('ui.confirm'),fn:closeModal,cls:'btn-gold'}]);
}
function boardHeroToShip(hid){
  const sel=document.getElementById('hero-ship-'+hid);
  // 함선이 1개이면 자동 선택
  if(sel&&sel.value===''&&G.fleet.length===1)sel.value='0';
  if(!sel||sel.value===''){notify(I18N.t('notify.selectBoardShip'),'warn');return;}
  const shipIdx=parseInt(sel.value);
  const s=G.fleet[shipIdx];if(!s)return;
  // 이미 다른 함선 탑승 중이면 자동 이전 (먼저 빼고 체크)
  G.fleet.forEach(sh=>{if(sh!==s&&sh.crewIds){const i=sh.crewIds.indexOf(hid);if(i>=0)sh.crewIds.splice(i,1);}});
  if((s.crewIds||[]).length>=getMaxCrew(s)){notify(I18N.t('notify.shipFullDisembarkFirst'),'err');return;}
  if(!s.crewIds)s.crewIds=[];
  const _stBefH=getShipStats(s);
  s.crewIds.push(hid);
  _syncShipCapacity(s,_stBefH);
  const _hKey='hero.'+hid+'.nm';
  const _hNm=(I18N&&I18N.has&&I18N.has(_hKey))?I18N.t(_hKey):(HEROES[hid]?.nm||'');
  notify(I18N.t('notify.heroBoarded',{nm:_hNm,ship:shipDisplayNm(s)}),'gold');
  baekgu(I18N.t('baekgu.heroBoarded',{nm:_hNm}));
  rerenderShipOrGarage();saveGame(true);
}
function unassignHero(hid){
  G.fleet.forEach(sh=>{
    if(!sh.crewIds)return;
    const idx=sh.crewIds.indexOf(hid);
    if(idx>=0){sh.crewIds.splice(idx,1);const _hKey='hero.'+hid+'.nm';const _hNm=(I18N&&I18N.has&&I18N.has(_hKey))?I18N.t(_hKey):(HEROES[hid]?.nm||'');notify(I18N.t('notify.heroDisembark',{nm:_hNm}),'ok');}
  });
  rerenderShipOrGarage();saveGame(true);
}
// 전설 영웅 8인 전원 수집 완료 — 1회성 마일스톤 보상 (사용자 요청 2026-06-15)
//   지급액은 후반 마일스톤 기준 기본값 — 밸런스 조정 시 이 상수만 변경.
function _grantAllHeroesReward(){
  try{
    if(!G||!Array.isArray(G.heroes)||G.heroes.length<8)return;
    if(G._allHeroesRewarded)return;
    G._allHeroesRewarded=true;
    const _cr=1000000,_vc=5,_ve=1000,_rep=10;
    G.credits=(G.credits||0)+_cr;
    G.voidCrystal=(G.voidCrystal||0)+_vc;
    G.voidEssence=(G.voidEssence||0)+_ve;
    if(typeof changeReputation==='function')changeReputation(_rep); else G.reputation=(G.reputation||0)+_rep;
    try{updateHUD();}catch(e){}
    try{if(typeof sfxCoin==='function')sfxCoin();}catch(e){}
    try{notify(I18N.t('notify.allHeroesReward',{cr:_cr.toLocaleString(),vc:_vc,ve:_ve,rep:_rep}),'gold');}catch(e){}
    try{baekgu(I18N.t('baekgu.allHeroesReward'));}catch(e){}
    try{saveGame(true);}catch(e){}
  }catch(e){console.warn('[allHeroesReward]',e);}
}
window._grantAllHeroesReward=_grantAllHeroesReward;

function recruitHero(heroId){if(G.heroes.includes(heroId)){closeModal();return;}
  // H01 이순신: 난중일기 영인본(G18) 인벤토리 확인
  if(heroId==='H01'){
    const has=G.inventory&&G.inventory.find(i=>i.id==='G18'&&i.qty>0);
    if(!has){
      notify(I18N.t('notify.needNanjungIlgi'),'err');
      closeModal();return;
    }
    // 소모
    const inv=G.inventory.find(i=>i.id==='G18');inv.qty--;
    notify(I18N.t('notify.nanjungSubmitted'),'ok');
  }
  G.heroes.push(heroId);closeModal();{const _hKey='hero.'+heroId+'.nm';const _hNm=(I18N&&I18N.has&&I18N.has(_hKey))?I18N.t(_hKey):(HEROES[heroId]?.nm||'');notify(I18N.t('notify.heroRecruitedIc',{ic:HEROES[heroId]?.ic,nm:_hNm}),'pur');baekgu(I18N.t('baekgu.heroJoined',{nm:_hNm}));}
  // 장영실: 모든 행성 안개 제거
  if(heroId==='H02'){applyJangYeongsilEffect();notify(I18N.t('notify.jangYeongsilEffect'),'gold');}
  try{_grantAllHeroesReward();}catch(e){}
  saveGame(true);
  // PC 전용: 영입 직후 시나리오 첫만남 컷씬 재생 (이미 본 장면은 자동 스킵)
  if(window.STORY_SCENES_PC && typeof window.STORY_SCENES_PC.triggerHeroRecruitScene==='function'){
    setTimeout(function(){ window.STORY_SCENES_PC.triggerHeroRecruitScene(heroId); }, 400);
  }
}
function applyJangYeongsilEffect(){
  if(!G.heroes.includes('H02'))return;
  PLANET_DEF.forEach(p=>{if(G.planets[p.id]&&G.planets[p.id].fog==='L')G.planets[p.id].fog='S';});
}

// ─── 타 모듈/onclick 참조용 전역 export (C6 분리, 2026-06-23) ───────────────
try{if(typeof window!=='undefined'){
  window.HERO_GREETING=HERO_GREETING;
  window.showHeroRecruit=showHeroRecruit;
  window.boardHeroToShip=boardHeroToShip;
  window.unassignHero=unassignHero;
  window.recruitHero=recruitHero;
  window.applyJangYeongsilEffect=applyJangYeongsilEffect;
}}catch(e){}
