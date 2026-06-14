// ═══════════════════════════════════════════════════════════════════
// DESTINATION EARTH — 충성도(LOY) 시스템 (크루 충성도 틱·위생·반란 이벤트) 모듈
//   · game.js 에서 분할 (2026-06-12, 사용자 요청: 긴 코드 분할)
//   · 모든 최상위 선언을 window.* 로 노출해 기존 호출처(전역 참조) 호환
// ═══════════════════════════════════════════════════════════════════
(function(){
if(typeof window==='undefined')return;
if(window._LOYALTY_LOADED)return;
window._LOYALTY_LOADED=true;

// ═══ 충성도(LOY) 시스템 ══════════════════════════════════════════
// 탑승 크루 최고 등급 반환
function getTopCrewRarity(ship){
  if(!ship.crewIds||ship.crewIds.length===0)return null;
  const allPeople=[...(G.crew||[]),...(G.heroes||[]).map(h=>Object.assign({},HEROES[h],{id:h,rarity:'S',isHero:true}))];
  const rarOrd={S:0,L:1,H:2,R:3,N:4};
  let best=null;
  ship.crewIds.forEach(function(cid){
    const c=allPeople.find(function(x){return x.id===cid;});
    if(c&&(best===null||(rarOrd[c.rarity]??5)<(rarOrd[best]??5)))best=c.rarity;
  });
  return best;
}
// 충성도 하락 — 크루 없는 함선 매 턴 -3
function tickLoyalty(){
  if(!G.fleet)return;
  G.fleet.forEach(function(s,idx){
    const hasCrew=s.crewIds&&s.crewIds.length>0;
    if(!hasCrew){
      const prevLoy=s.LOY||80;
      s.LOY=Math.max(1,prevLoy-3);
      if(s.LOY<=10&&s.LOY!==prevLoy){
        notify(I18N.t('notify.loyaltyAtRisk',{nm:shipDisplayNm(s),loy:s.LOY}),'err');
        baekgu(I18N.t('baekgu.loyaltyWarn',{nm:shipDisplayNm(s),loy:s.LOY}));
      }
    }
  });
}
// 충성도 증가 — 이동/전투 시 탑승 크루 등급별 증가
function boostLoyalty(reason){
  if(!G.fleet)return;
  const RARITY_LOY_BOOST={R:1,H:3,L:10,S:20};
  G.fleet.forEach(function(s){
    const topRar=getTopCrewRarity(s);
    if(!topRar)return;
    const boost=RARITY_LOY_BOOST[topRar]||0;
    if(boost===0)return;
    const prevLoy=s.LOY||80;
    if(prevLoy>=100)return;
    const newLoy=Math.min(100,prevLoy+boost);
    s.LOY=newLoy;
    // LOY 100 달성 시 능력치 +10% 부여
    if(newLoy===100&&prevLoy<100){
      if(!s._loyBonusApplied){
        s.ATT=Math.round((s.ATT||20)*1.1);
        s.INT=Math.round((s.INT||20)*1.1);
        s.TEC=Math.round((s.TEC||20)*1.1);
        s.maxHP=Math.round((s.maxHP||1000)*1.1);
        s.hp=Math.min(s.hp||s.maxHP,s.maxHP);
        s._loyBonusApplied=true;
        notify(I18N.t('notify.loyaltyMax',{nm:shipDisplayNm(s)}),'gold');
        baekgu(I18N.t('baekgu.loyaltyMaxStrong',{nm:shipDisplayNm(s)}));
      }
    }
  });
}
// 충성도 붕괴 체크 — LOY≤10 + HP≤50% 시 나포 위험
function checkLoyaltyCapture(){
  if(!G.fleet||G.fleet.length<=1)return;
  const toRemove=[];
  G.fleet.forEach(function(s,idx){
    if(idx===0)return; // 기함은 제외
    const loy=s.LOY||80;
    const hpRatio=(s.hp||0)/(s.maxHP||1);
    if(loy<=10&&hpRatio<=0.5){
      // 나포 확률: 매 턴 15%
      if(Math.random()<0.15){
        toRemove.push(idx);
        notify(I18N.t('notify.loyaltyCollapse',{nm:shipDisplayNm(s),loy,hp:Math.round(hpRatio*100)}),'err');
        baekgu(I18N.t('baekgu.loyaltyDefected',{nm:shipDisplayNm(s)}));
        // 전투 기록에 나포 사건 남기기
        if(!G.combatHistory)G.combatHistory=[];
        const pd2=PLANET_DEF.find(function(p){return p.id===G.currentPlanet;});
        G.combatHistory.push({win:false,planet:pd2?pd2.nm:I18N.t('ui.unknownPlanet'),planetId:G.currentPlanet,turn:0,earned:0,gameTurn:G.turn,loyCapture:true,shipNm:s.nm});
      }
    }
  });
  // 역순 삭제 (인덱스 밀림 방지)
  toRemove.reverse().forEach(function(idx){G.fleet.splice(idx,1);});
  if(toRemove.length>0){
    // 임시창 → 선발 자동 승급
    if(typeof _promoteReserveIfRoom==='function')_promoteReserveIfRoom();
    updateHUD();if(G._currentHubTab==='ship'||G._currentHubTab==='garage')rerenderShipOrGarage();
  }
}

// ── 턴 종료 쿨다운 (기본 3분, 8인 핵심 영웅 1명당 -10초, 최소 30초) ──────
const TURN_COOLDOWN_BASE_MS = 3 * 60 * 1000;
const TURN_COOLDOWN_MIN_MS = 30 * 1000;
function _turnCooldownMs(){
  // H01~H08 중 보유한 영웅 수만큼 -10초
  const heroCount=(G.heroes||[]).filter(h=>/^H0[1-8]$/.test(h)).length;
  const reduction=heroCount*10*1000;
  return Math.max(TURN_COOLDOWN_MIN_MS,TURN_COOLDOWN_BASE_MS-reduction);
}
let _lastTurnTime = 0;
let _turnCooldownTimer = null;

function tryNextTurn(){
  const now = Date.now();
  const cdMs = _turnCooldownMs();
  const elapsed = now - _lastTurnTime;
  if(_lastTurnTime > 0 && elapsed < cdMs){
    const remaining = Math.ceil((cdMs - elapsed) / 1000);
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    notify(I18N.t('notify.turnEndCountdown',{m,s}),'err');
    return;
  }
  _lastTurnTime = now;
  doNextTurn();
  _startTurnCooldownUI();
}

function _startTurnCooldownUI(){
  const btn = document.getElementById('btn-next-turn');
  const lbl = document.getElementById('btn-next-turn-label');
  if(!btn || !lbl) return;
  btn.disabled = true;
  btn.style.opacity = '0.5';
  if(_turnCooldownTimer) clearInterval(_turnCooldownTimer);
  _turnCooldownTimer = setInterval(function(){
    const cdMs = _turnCooldownMs();
    const elapsed = Date.now() - _lastTurnTime;
    const remaining = Math.max(0, Math.ceil((cdMs - elapsed) / 1000));
    if(remaining <= 0){
      clearInterval(_turnCooldownTimer);
      _turnCooldownTimer = null;
      if(lbl) lbl.textContent = I18N.t('menu.endTurn');
      if(btn){ btn.disabled = false; btn.style.opacity = '1'; }
      return;
    }
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    if(lbl) lbl.textContent = I18N.t('ui.turnEndTimer',{m,s:s<10?'0'+s:s});
  }, 1000);
}

// 매 턴 종료 자동 수리: armor 파츠의 repairRate(HP%) + shield 파츠의 shieldRegen(maxSH%)
function tickAutoRepair(){
  if(!G.fleet||G.fleet.length===0)return;
  let _totalHpHealed=0,_totalShHealed=0;
  G.fleet.forEach(s=>{
    if(!s.parts||s.parts.length===0)return;
    const st=getShipStats(s);
    let hpRate=0,shRate=0;
    s.parts.forEach(pid=>{
      const p=partById(pid);if(!p)return;
      if(p.repairRate)hpRate+=p.repairRate;
      if(p.shieldRegen)shRate+=p.shieldRegen;
    });
    if(hpRate>0&&s.hp<st.HP){
      const heal=Math.ceil(st.HP*hpRate);
      const before=s.hp;
      s.hp=Math.min(st.HP,s.hp+heal);
      _totalHpHealed+=(s.hp-before);
    }
    if(shRate>0&&s.sh<st.maxSH){
      const heal=Math.ceil(st.maxSH*shRate);
      const before=s.sh||0;
      s.sh=Math.min(st.maxSH,(s.sh||0)+heal);
      _totalShHealed+=(s.sh-before);
    }
  });
  // 레기온(H02) 편대 지원 — 함대에 H02 함선이 있으면 모든 아군 HP +1.5%/척 회복 (최대 15%)
  //   ※ desc "아군 회복+15%" 의 실제 구현 (사용자 명세)
  const _legionCount=(G.fleet||[]).filter(s=>{
    const cid=(s.catalogId||(s.id||'').replace(/(?:_\d+|_main)$/,'')).toUpperCase();
    return cid==='H02';
  }).length;
  if(_legionCount>0){
    const _legionRate=Math.min(0.15, 0.015*_legionCount);
    let _legionHealed=0;
    G.fleet.forEach(s=>{
      const st=getShipStats(s);
      if(s.hp<st.HP){
        const heal=Math.ceil(st.HP*_legionRate);
        const before=s.hp;
        s.hp=Math.min(st.HP,s.hp+heal);
        _legionHealed+=(s.hp-before);
      }
    });
    if(_legionHealed>0){
      notify(I18N.t('notify.legionSupport',{n:_legionCount,hp:_legionHealed.toLocaleString(),pct:(_legionRate*100).toFixed(1)}),'ok');
    }
  }
  if(_totalHpHealed>0||_totalShHealed>0){
    const parts=[];
    if(_totalHpHealed>0)parts.push(`HP +${_totalHpHealed.toLocaleString()}`);
    if(_totalShHealed>0)parts.push(`SH +${_totalShHealed.toLocaleString()}`);
    notify(I18N.t('notify.autoRepair',{parts:parts.join(' · ')}),'ok');
  }
}

// ACT 자동 전환 — 매 턴 증가 시 호출 (doNextTurn / travelTo 양쪽에서 사용)
//   마일스톤 기반: turn>=20 && act<2 → 2, turn>=40 && act<3 → 3, turn>=60 && act<4 → 4
//   직전 % 20 방식은 이동·전투로 마일스톤을 건너뛰면 영영 트리거 안 되던 버그가 있어 마일스톤 방식으로 변경
function _checkActAdvance(){
  // ACT 4(지구 해방)는 우르사 메이저 격파로만 도달 — 턴 기반 자동전환은 ACT 3까지로 제한
  // (버그픽스: 턴 60 자동 ACT4 → 보스 건너뛰고 지구 도달하던 문제)
  const tier=[{turn:20,act:2},{turn:40,act:3}];
  for(const t of tier){
    if(G.turn>=t.turn && G.act<t.act){
      G.act=t.act;
      setTimeout(()=>showActTransition(G.act),900);
      break;
    }
  }
}
try{if(typeof window!=='undefined')window._checkActAdvance=_checkActAdvance;}catch(e){}

// ── 게임 전체 메모리 위생 (사용자 보고 2026-06-06): 장시간 플레이 시 누적 슬로다운 ──
// 매 N턴마다 호출 — 누적 배열·캐시·DOM 트림. 전투 중에는 스킵 (전투 종료 후 별도 정리).
let _lastHygieneTurn=0;
function _periodicMemoryHygiene(){
  try{
    if(typeof combatState!=='undefined'&&combatState&&!combatState.done)return;
    if(G.turn-_lastHygieneTurn<10)return;
    _lastHygieneTurn=G.turn;
    // 전투 기록 강제 트림 (push 시점에 100 캡이 있지만 안전망)
    if(Array.isArray(G.combatHistory)&&G.combatHistory.length>100){
      G.combatHistory.splice(0,G.combatHistory.length-100);
    }
    // 명예의 전당 기록은 ACT당 최신 50개만 유지
    if(Array.isArray(G.hallOfFame)&&G.hallOfFame.length>50){
      G.hallOfFame.splice(0,G.hallOfFame.length-50);
    }
    // 알림 컨테이너 잔재 노드 (떠나는 DOM 강제 정리)
    try{
      const c=document.getElementById('notifications');
      if(c){while(c.children.length>5)c.removeChild(c.firstChild);}
    }catch(e){}
    // 백구 메시지 컨테이너 잔재
    try{
      const m=document.getElementById('bk-msgs');
      if(m){while(m.children.length>6)m.removeChild(m.firstChild);}
    }catch(e){}
    // 전투 잔존 이펙트/위치 — 비전투 시 무조건 비움
    try{if(typeof _cbEffects!=='undefined')_cbEffects.length=0;}catch(e){}
    try{if(typeof _unitPos!=='undefined'){for(const k in _unitPos)delete _unitPos[k];}}catch(e){}
    // 전투 이미지 캐시 — 비전투 시 절반 트림 (LRU 가장 오래된 절반 제거)
    try{
      if(typeof _cbImgCacheMap!=='undefined'&&_cbImgCacheMap.size>20){
        const _drop=_cbImgCacheMap.size-20;
        const _it=_cbImgCacheMap.keys();
        for(let i=0;i<_drop;i++){const _k=_it.next().value;if(_k===undefined)break;_cbImgCacheMap.delete(_k);}
      }
    }catch(e){}
    // 충돌 해소 풀
    try{if(window._resolvedPool)window._resolvedPool.length=0;}catch(e){}
    // 전투 배경 캔버스 — 다음 전투 진입 시 재생성
    try{if(typeof _cbBgCache!=='undefined')_cbBgCache=null;}catch(e){}
  }catch(e){console.warn('[memHygiene]',e);}
}
try{if(typeof window!=='undefined')window._periodicMemoryHygiene=_periodicMemoryHygiene;}catch(e){}

function doNextTurn(){
  G.turn++;
  // 턴 종료 — 현재 행성 허브 해금 진행도 +1 (퀘스트·잔해탐색·해적격파와 동일 카운트)
  try{addHubProgress(G.currentPlanet);}catch(e){}
  // ACT 자동 전환: 턴 20→ACT2, 턴 40→ACT3, 턴 60→ACT4 (보스 격파 후 후일담)
  _checkActAdvance();
  G.stayTurns=(G.stayTurns||0)+1;
  tickGatherQuests();  // ← 채취 퀘스트 진행
  try{tickStoryQuests();}catch(e){console.warn('[storyQuest] tick fail',e);}
  tickQuestSpawn();    // ← 현재 행성에 2~4개 신규 의뢰 게시 (최대 8개)
  tickAutoRepair();    // ← 자동 수리 로봇 + 전설/신화 실드 자가 복구
  tickLoyalty();       // ← 충성도 하락 (크루 없는 함선)
  checkLoyaltyCapture(); // ← 충성도 붕괴 나포 체크
  const tax=calcTurnTax();G.credits+=tax;
  // 사용자 요청 (2026-06-06): 행성 세금 징수 시 설계도 드롭 확률
  //   기본 5%, 투자 레벨 1당 +3%p 누적 (Lv0 5% / Lv5 20% / Lv10 35%).
  //   미보유 + BLUEPRINT_MAP 매핑이 있는 행성만 대상.
  try{
    if(!G.blueprints)G.blueprints={};
    PLANET_DEF.forEach(pd=>{
      const st=G.planets[pd.id]; if(!st||!st.owned)return;
      const bpId=(typeof BLUEPRINT_MAP!=='undefined')?BLUEPRINT_MAP[pd.id]:null;
      if(!bpId||G.blueprints[bpId])return;
      const rate=0.05+0.03*(st.commerce||0);
      if(Math.random()<rate){
        G.blueprints[bpId]=true;
        const rec=(typeof CRAFT_RECIPES!=='undefined')?CRAFT_RECIPES.find(r=>r.id===bpId):null;
        const _bpNm=(rec?partDisplayNm(rec):'')||rec?.nm||bpId;
        try{notifyBlueprint(bpId,_bpNm,'gold');}catch(e){notify(I18N.t('notify.bpAcquired',{nm:_bpNm}),'gold');}
        baekgu(I18N.t('baekgu.blueprintDrop',{nm:_bpNm}));
      }
    });
  }catch(e){console.warn('[tax-bp drop]',e);}
  // 보이드 균열 P29: 5턴마다 전설 파츠 분출
  if(G.turn%5===0&&G.planets['P29']?.fog!=='L'){
    const lParts=PARTS.filter(p=>p.tier>=12);
    if(lParts.length){const p=lParts[Math.floor(Math.random()*lParts.length)];addToInventory(p.id,1);notify(I18N.t('notify.voidRiftDrop',{nm:partDisplayNm(p)||p.nm}),'pur');}
  }
  updateHUD();
  if(tax>0)notify(I18N.t('notify.taxIncomeTurn',{turn:G.turn,tax:tax.toLocaleString()}),'gold');
  else notify(`⏭️ TURN ${G.turn}`);
  // ── 행성 Lv10 특산 아이템 보상 (10% 확률) ────────────────────
  const _lv10planets=PLANET_DEF.filter(pd2=>{const st2=G.planets[pd2.id];return st2&&st2.owned&&(st2.commerce||0)>=10;});
  _lv10planets.forEach(pd2=>{
    if(Math.random()<0.10){
      // 팩션별 최고급 파츠 선택
      const _fid=pd2.f;
      // 신화급 → 세트 순으로 시도
      const _mythPool=(typeof QUEST_MYTHIC_PARTS!=='undefined'?QUEST_MYTHIC_PARTS:[]);
      const _setPool=(typeof QUEST_SET_PARTS!=='undefined'?QUEST_SET_PARTS:[]);
      const _partPool=[..._mythPool,..._setPool];
      if(_partPool.length>0){
        const _pid=_partPool[Math.floor(Math.random()*_partPool.length)];
        const _p=(typeof PARTS!=='undefined'?PARTS:[]).find(x=>x.id===_pid);
        if(!G.inventory)G.inventory=[];
        const _inv=G.inventory.find(i=>i.id===_pid);
        if(_inv)_inv.qty++;else G.inventory.push({id:_pid,nm:_p?_p.nm:_pid,qty:1});
        notify(I18N.t('notify.planetLv10Reward',{nm:pd2.nm,item:_p?(partDisplayNm(_p)||_p.nm):_pid}),'gold');
        baekgu(I18N.t('baekgu.planetMaxReward',{nm:pd2.nm,item:_p?(partDisplayNm(_p)||_p.nm):_pid}));
      }
    }
  });
  if(G.credits<5000)randomBaekgu('low_credits');
  // ── 해적 세력 강화 알림 ────────────────────────────────────────
  if(G.credits<3000)baekgu(I18N.t('baekgu.lowCredits'));
  if(G.turn===15) {notify(I18N.t('notify.pirateLv1'),'err');baekgu(I18N.t('baekgu.pirateStrengthened'));}
  if(G.turn===30) {notify(I18N.t('notify.pirateLv2'),'err');baekgu(I18N.t('baekgu.pirateStronger'));}
  if(G.turn===45) {notify(I18N.t('notify.pirateLv3'),'err');baekgu(I18N.t('baekgu.pirateMax'));}
  // ── 체류 이벤트 ─────────────────────────────────────────────
  const pd=PLANET_DEF.find(p=>p.id===G.currentPlanet);
  if(G.stayTurns===2&&!pd?.hostile){
    // 2턴째: 백구 경고
    setTimeout(()=>{
      baekgu(I18N.t('baekgu.stayWarning'));
      notify(I18N.t('notify.pirateStayWarn'),'err');
    },400);
  }
  // ── 적 행성 2턴 체류: 치크스 함대 50% 출몰 ───────────────
  if(pd?.hostile&&G.stayTurns>=2&&G.turn-(G.lastChixTurn||-999)>1){
    if(Math.random()<0.50){
      setTimeout(()=>triggerChixFleet(pd),700);
      return;
    }
  }
  // ── 모든 행성 50% 확률 해적 조우 (직전 턴 쿨다운, P31 제외) ──────────
  // P31(지구)는 해방된 안착지 — 체류 해적 조우 금지 (사용자 요청 2026-06-03)
  if(!pd?.hostile&&G.currentPlanet!=='P31'&&G.turn-(G.lastPirateTurn||-999)>1){
    if(Math.random()<0.50){
      if(G.stayTurns>=3){
        setTimeout(()=>triggerPirateRaid(pd),600);
      } else {
        setTimeout(()=>triggerEarlyPirate(pd),600);
        return;
      }
    }
  }
  // ── 제작 재료 턴 종료 재입고 ─────────────────────────────────
  (function(){
    const _pid=G.currentPlanet;
    const _st=G.shopStock[_pid];
    if(!_st)return;
    const _mats=COMMODITIES.filter(c=>c.material);
    const _depleted=_mats.filter(m=>(_st[m.id]||0)===0);
    if(_depleted.length===0)return; // 소진 없으면 스킵
    const _allDepleted=_depleted.length===_mats.length;
    if(_allDepleted){
      // 전부 소진: 팩션 재료 보장 + 랜덤 재입고
      const _pd2=PLANET_DEF.find(p=>p.id===_pid);
      const _fac2=_pd2?.f;
      if(_fac2&&FACTION_MATS[_fac2]){
        const _fmId=FACTION_MATS[_fac2];
        _st[_fmId]=Math.floor(Math.random()*8)+4;
      }
      const _seed2=_pid.split('').reduce((a,c)=>a+c.charCodeAt(0),0)+G.turn;
      _mats.forEach((mat,i)=>{if((_st[mat.id]||0)===0&&((_seed2+i*3)%3)===0)_st[mat.id]=Math.floor(Math.random()*10)+4;});
      notify(I18N.t('notify.matsFullRestock'),'ok');
    } else {
      // 일부 소진: 소진 재료 중 60% 확률로 재입고
      let restocked=false;
      _depleted.forEach(mat=>{
        if(Math.random()<0.6){_st[mat.id]=Math.floor(Math.random()*8)+4;restocked=true;}
      });
      if(restocked)notify(I18N.t('notify.matsPartialRestock'),'ok');
    }
  })();
  // 주기적 메모리 위생 (10턴마다, 비전투 시) — 누적 슬로다운 방지
  try{_periodicMemoryHygiene();}catch(e){}
  saveGame(true);hubTab('main');
}

// ─── 전역 노출 (자동 생성) ─────────────────────────────────────
try{window.getTopCrewRarity=getTopCrewRarity;}catch(e){}
try{window.tickLoyalty=tickLoyalty;}catch(e){}
try{window.boostLoyalty=boostLoyalty;}catch(e){}
try{window.checkLoyaltyCapture=checkLoyaltyCapture;}catch(e){}
try{window.TURN_COOLDOWN_BASE_MS=TURN_COOLDOWN_BASE_MS;}catch(e){}
try{window.TURN_COOLDOWN_MIN_MS=TURN_COOLDOWN_MIN_MS;}catch(e){}
try{window._turnCooldownMs=_turnCooldownMs;}catch(e){}
try{window._lastTurnTime=_lastTurnTime;}catch(e){}
try{window._turnCooldownTimer=_turnCooldownTimer;}catch(e){}
try{window.tryNextTurn=tryNextTurn;}catch(e){}
try{window._startTurnCooldownUI=_startTurnCooldownUI;}catch(e){}
try{window.tickAutoRepair=tickAutoRepair;}catch(e){}
try{window._checkActAdvance=_checkActAdvance;}catch(e){}
try{window._lastHygieneTurn=_lastHygieneTurn;}catch(e){}
try{window._periodicMemoryHygiene=_periodicMemoryHygiene;}catch(e){}
try{window.doNextTurn=doNextTurn;}catch(e){}
console.log('[loyalty] Loaded — 16 decls exposed');
})();
