// ═══════════════════════════════════════════════════════════════════
// COMBAT — game.js 에서 분리 (C1, 2026-06-14, 사용자 요청: 긴 코드 분할)
// 전투 엔진: 적 함대 생성 · 전투 화면/캔버스 렌더 · 턴 루프 · 영웅 스킬 ·
//            보스전(우르사/블랙팔콘/보이드) · 블랙홀 최종전 · 보스 에필로그
// 의존(game.js 잔류 전역): combatState(let), getShipStats, shipDisplayName,
//   getHeroPassiveBonus, 역할 시스템(SHIP_ROLE_DEF/MUL, _getShipRole, _shipRoleMul),
//   G, I18N, AudioMgr, RARITY_COLOR(window, report-popup.js 제공) 등
// 로드 위치: index.html 에서 game.js 직후 (전투는 사용자 트리거 시 호출되므로 안전)
// ═══════════════════════════════════════════════════════════════════

// ── 함선 사거리(RNG) — 전투에서 '앞열 기준 상대 종심' 도달 거리 (사용자 요청 2026-06-16) ──
//   공격자 종심 + 타겟 종심 의 합이 이 값 이내인 적만 타격 가능. 최전열(종심 0)은 항상 사거리 내라
//   사거리에 의한 전체 소강(stalemate)은 발생하지 않음 — 앞열이 죽으면 다음 열이 최전열이 되어 자동 재교전.
//   기본 3 · 레이저 +1 · 미사일 +2(희귀도 보너스 최대 +2) · 고기동(TEC≥400) +1  → 3~7 분포
function shipCombatRange(s){
  if(!s)return 3;
  let missile=0,laser=0,bestRank=0;
  const rar={mythic:2,set:1,legend:1,epic:1};
  const parts=(s.parts)||[];
  for(let i=0;i<parts.length;i++){
    const pp=(typeof partById==='function')?partById(parts[i]):null;
    if(!pp||pp.cat!=='weapon')continue;
    if(pp.wtype==='missile'){missile++;const rk=rar[pp.rarity]||0;if(rk>bestRank)bestRank=rk;}
    else laser++;
  }
  let r=3;
  if(missile>0)r+=2+bestRank;
  else if(laser>0)r+=1;
  if((+s.TEC||0)>=400)r+=1;
  return r;
}
if(typeof window!=='undefined')window.shipCombatRange=shipCombatRange;

// 적대 행성 적 함대 생성 (startCombat과 브리핑에서 공용)
// 적함 등급 30% 확률로 한 단계 상위 (사용자 요청: 대형 함선 비중 30% 증가)
//   소형 → 중형, 중형 → 대형 으로 상향 (대형은 그대로 유지, 확률은 누적이 아닌 단일 롤)
function _enemyTierBoost(base){
  if(Math.random()<0.30){
    if(base==='소형')return '중형';
    if(base==='중형')return '대형';
  }
  return base;
}
function _buildHostilePlanetEnemies(planetDef){
  const dm=getDiffMult(),danger=planetDef.ring||2,egm=getEarlyGameMult();
  const plv=calcPlayerLevel();
  const baseEC=clamp(G.fleet.length,2,6);
  const eCount=planetDef.hostile?Math.min(12,Math.round(baseEC*1.2*getDiffCountMult())):Math.min(8,Math.round(baseEC*getDiffCountMult()));
  const fp=calcFleetAvgPower();
  // 사용자 요청: 적대 행성 적함을 우리 함대 평균 대비 ring1=20% ~ ring6=40% 수준으로 (이전 34~50%).
  // 그리고 clampEnemyStats(0.20~0.40)로 한 번 더 안전망.
  const dangerMult=(0.20+(danger-1)*0.04);   // ring1=0.20, ring2=0.24, ..., ring6=0.40
  const _rawHP=Math.round(fp.hp*dangerMult*dm*egm);
  const _rawATK=Math.round(fp.atk*dangerMult*dm*egm);
  const _rawINT=Math.round(fp.atk*dangerMult*0.65*dm*egm);
  const _rawTEC=Math.round(fp.atk*dangerMult*0.70*dm*egm);
  const _clamped=clampEnemyStats(_rawHP,_rawATK,_rawINT,_rawTEC,fp);
  const eHP=_clamped.eHP,eATK=_clamped.eATK,eINT=_clamped.eINT,eTEC=_clamped.eTEC;
  const tierFn=(i)=>_enemyTierBoost(i===0&&plv>=60?'대형':i<2&&plv>=30?'중형':'소형');
  return Array.from({length:eCount},(_,i)=>({
    id:`E${i}`,nm:I18N.t('ui.cheeksShipFmt',{nm:I18N.t('ui.cheeksShipNames').split('|')[i%6]}),
    tier:tierFn(i),isEnemy:true,
    hp:Math.round(eHP*(i===0?1.3:1.0)),maxHP:Math.round(eHP*(i===0?1.3:1.0)),
    sh:Math.floor(eHP*(i===0?0.5:0.35)),maxSH:Math.floor(eHP*(i===0?0.5:0.35)),
    ATT:Math.round(eATK*(i===0?1.2:1.0)),INT:Math.round(eINT*(i===0?1.1:1.0)),
    TEC:eTEC,HP:eHP,LOY:50,parts:[],
    shieldTier:Math.min(20,Math.max(1,danger*3)),armorTier:Math.min(20,Math.max(1,danger*2))
  }));
}

// 적대 행성 진입 시 — 적 스펙 브리핑 팝업 → 전투 시작
function showHostilePlanetBriefing(planetDef){
  const enemies=_buildHostilePlanetEnemies(planetDef);
  planetDef._previewEnemies=enemies;
  const fp=calcFleetAvgPower();
  const totEnemyAtk=enemies.reduce((s,e)=>s+(e.ATT||0),0);
  const totFleetAtk=(G.fleet||[]).reduce((s,e)=>s+(getShipStats(e).ATT||0),0);
  const advisor=totFleetAtk>=totEnemyAtk*1.2?{c:'var(--green)',t:I18N.t('advisor.advantage'),lvl:'win'}
                :totFleetAtk>=totEnemyAtk*0.8?{c:'var(--yellow)',t:I18N.t('advisor.even'),lvl:'mid'}
                :{c:'var(--red)',t:I18N.t('advisor.disadvantage'),lvl:'lose'};
  // 사용자 요청 2026-06-07: 적대 대치 팝업 통일 — _hostileVsHeader 헬퍼 사용 (192px 캐릭터, 16px VS, ⚠ 제거)
  const _hFac=(/^F0[1-7]$/.test(planetDef?.f||''))?planetDef.f:'F05';
  const _hVer=(window._GAME_VER)?('?v='+encodeURIComponent(window._GAME_VER)):'';
  const _enemySrc='img/quests/combat_'+_hFac+'.png'+_hVer;
  openModal(I18N.t('modal.hostilePlanetEntry',{nm:planetDef.nm}),
    _hostileVsHeader({enemyImg:_enemySrc,enemyName:planetDef.nm,enemyFallback:'⚠️'})
    +`<div style="text-align:center;padding:0 6px 6px">
      <div style="color:var(--red);font-size:18px;font-weight:bold;margin-bottom:4px">${I18N.t('ui.enemyFleetDetected',{nm:planetDef.nm})}</div>
      <div style="color:var(--dim);font-size:12px;line-height:1.7">
        ${I18N.t('ui.briefingRingDiff',{ring:planetDef.ring||2,diff:({easy:I18N.t('difficulty.easy'),normal:I18N.t('difficulty.normal'),hard:I18N.t('difficulty.hard'),extreme:I18N.t('difficulty.extreme')})[G.difficulty]||I18N.t('difficulty.normal')})}<br>
        <span style="color:${advisor.c};font-weight:bold">${I18N.t('ui.powerAssessment',{t:advisor.t})}</span>
      </div>
    </div>
    ${_formatEnemyPreview(enemies)}
    <div style="text-align:center;font-size:12px;color:var(--yellow);margin-top:6px">${I18N.t('ui.winConquerLoseCr')}</div>
    <div style="text-align:center;font-size:12px;color:var(--cyan);margin-top:4px">${_baekguIcon(18)} ${I18N.t('ui.baekguShort')}: "${I18N.t('advisor.bkPreCombat')}${advisor.lvl==='win'?I18N.t('advisor.bkPush'):advisor.lvl==='mid'?I18N.t('advisor.bkCareful'):I18N.t('advisor.bkComeLater')}"</div>`,
    [
      {txt:I18N.t('ui.startBattle'),fn:()=>{closeModal();_safeCombatEntry(function(){startCombat(planetDef);},"startCombat");},cls:'btn-red'},
      {txt:I18N.t('btn.retreatOther'),fn:()=>{closeModal();notify(I18N.t('notify.retreatOther'),'warn');baekgu(I18N.t('baekgu.retreatedStep'));},cls:'btn-sm'}
    ],{wide:true}
  );
}

// 전투 직전 적 두목 시비/통행료 요구 — js/modules/shakedown-popup.js 로 분할됨 (2026-06-08)
//   · 통행료 = (ring×4000+3000) + (아군 함대 자산 합계 × 1%)
//   · window._showShakedownPopup, window._SHAKEDOWN_NPCS 노출
// 일반 구매가능 함선 풀 (S/M/H, 가격>0, 전설/보스 제외)
function _normalShipPool(){
  return (typeof SHIP_CATALOG!=='undefined'?SHIP_CATALOG:[]).filter(s=>
    (s.price||0)>0 && (s.tier==='소형'||s.tier==='중형'||s.tier==='대형') &&
    !/^LGD/.test(s.id) && s.id!=='URSA' && s.id!=='BLACKFALCON'
  );
}
// 적 함대의 약 50%를 일반 구매가능 함선으로 외형 치환 (전투 스탯은 그대로 → 밸런스 불변)
function _mixInNormalShips(enemies){
  if(!Array.isArray(enemies)||!enemies.length)return;
  const pool=_normalShipPool();
  if(!pool.length)return;
  enemies.forEach(u=>{
    if(!u||u.voidBoss||u.id==='BOSS_MAIN'||u._ursaBoss||(u.nm||'').toLowerCase().includes('우르사')||(u.nm||'').toLowerCase().includes('ursa'))return;
    if(Math.random()>=0.5)return;  // ~50%
    const sameTier=pool.filter(s=>s.tier===(u.tier||'소형'));
    const arr=sameTier.length?sameTier:pool;
    const def=arr[Math.floor(Math.random()*arr.length)];
    if(!def)return;
    u.catId=def.id; u.catalogId=def.id; u.tier=def.tier;
    u.nm=I18N.t('enemy.prefix')+def.nm;
    u._useCatalogImg=true;  // _combatShipImgSrc 가 카탈로그 함선 이미지로 표시
    try{if(typeof _markShipDiscovered==='function')_markShipDiscovered({catalogId:def.id,id:def.id});}catch(e){}  // 전투에서 마주친 함선 발견 처리
  });
}
function startCombat(planetDef){
  const isBoss=planetDef.id==='BOSS';
  // 전투 직전 통행료 시비 이벤트 (보스 제외, 항상 노출, 세션당 1회) — 사용자 요청
  // 사용자 보고 2026-06-09: 팝업 실패 시 전투 영구 미진입 — 안전망 추가
  if(!isBoss && planetDef && !planetDef._shakedownDone){
    planetDef._shakedownDone=true;
    if(typeof _showShakedownPopup==='function'){
      try{
        _showShakedownPopup(planetDef,()=>startCombat(planetDef));
        return;
      }catch(e){
        console.warn('[combat] shakedown(startCombat) failed — proceeding:',e);
      }
    } else {
      console.warn('[combat] _showShakedownPopup 미정의 — startCombat 시비 단계 스킵');
    }
  }
  let enemies;
  if(isBoss){
    // 우르사 메이저 본체: 우리 함대 합산 전투력의 ~270% (현재 3배 강화)
    // baseline도 3배 강화: HP 10M→30M, ATT 6k→18k, SH 300k→900k
    // 함대 총 내구도(HP+SH) 기준으로 보스 HP 결정 → 강한 함대일수록 보스도 비례 강화
    const _fp=calcFleetTotalPower();
    const _BASE_HP=BOSS.maxHP*3;          // 30,000,000
    const _BASE_ATT=Math.round(BOSS.ATT*3); // 18,000
    const _BASE_SH=BOSS.maxSH*3;           // 900,000
    const _playerDur=_fp.hp+_fp.sh;
    // 사용자 요청 누적: 보스 본체 HP ×100 → 추가 ×10 (호위 전멸 후 본격 2페이즈용)
    let _scaleHP=Math.max(_BASE_HP,Math.round(_playerDur*2.7));
    _scaleHP=_scaleHP*100*10*3;  // 사용자 요청 2026-06-15: 보스 본체 체력 추가 ×3
    const _scaleATT=Math.max(_BASE_ATT,Math.round(_fp.atk*2.7));    // ATT는 기존 유지(2페이즈 진입 시 ×3)
    const _scaleSH=Math.max(_BASE_SH,Math.round(_fp.sh*2.7));       // SH는 기존 유지
    // ── 진형(열): 0=치크스 소형 / 1=치크스 중형 / 2=친위대(대형) / 3=우르사 본체(최후방) ──
    // 보스는 array 0번 유지(기존 enemies[0] 참조 호환). 시각 배치는 _formationCol 로 결정.
    // 호위 전멸 전까지 _invincible=true → 타겟 불가(무적) + 최후 공격 대상.
    enemies=[{...BOSS,id:'BOSS_MAIN',isEnemy:true,
      hp:_scaleHP,maxHP:_scaleHP,HP:_scaleHP,
      sh:_scaleSH,maxSH:_scaleSH,
      ATT:_scaleATT,
      phase:1,_phaseAnn:0,shieldTier:20,armorTier:15,
      _formationCol:3,_ursaBoss:true,_invincible:true}];
    // 3열: 친위대 15척(대형) — HP ×10
    if(typeof BOSS_ESCORT!=='undefined'){
      BOSS_ESCORT.forEach(esc=>{
        const _eHP=(esc.maxHP||esc.HP||1)*10;
        enemies.push({...esc,hp:_eHP,maxHP:_eHP,HP:_eHP,shieldTier:10,armorTier:8,_formationCol:2});
      });
    }
    // 1열: 치크스 소형 정찰대 8척
    for(let i=0;i<8;i++){const _h=8000;
      enemies.push({id:'CHIX_S_BOSS_'+i,nm:'치크스 정찰기',_nmKey:'enemy.chiksScout',tier:'소형',isEnemy:true,
        hp:_h,maxHP:_h,HP:_h,sh:2000,maxSH:2000,ATT:300,INT:60,TEC:45,LOY:0,
        shieldTier:4,armorTier:3,_formationCol:0});}
    // 2열: 치크스 중형 순양함 6척
    for(let i=0;i<6;i++){const _h=25000;
      enemies.push({id:'CHIX_M_BOSS_'+i,nm:'치크스 순양함',_nmKey:'enemy.chiksCruiser',tier:'중형',isEnemy:true,
        hp:_h,maxHP:_h,HP:_h,sh:6000,maxSH:6000,ATT:600,INT:120,TEC:70,LOY:0,
        shieldTier:7,armorTier:5,_formationCol:1});}
  } else if(planetDef._previewEnemies){
    // 브리핑에서 미리 생성한 적 함대 재사용 (능력치 일관성 보장)
    enemies=planetDef._previewEnemies;
    delete planetDef._previewEnemies;
  } else {
    enemies=_buildHostilePlanetEnemies(planetDef);
  }
  const players=G.fleet.map(s=>{const st=getShipStats(s);const _wpn=PARTS.find(p=>p.cat==='weapon'&&(s.parts||[]).includes(p.id));const _wt=_wpn?(_wpn.tier||1):1;const _wtype=_wpn?(_wpn.wtype||'laser'):'laser';const _wrar=_wpn?(_wpn.rarity||''):'';const _shp=PARTS.find(p=>p.cat==='shield'&&(s.parts||[]).includes(p.id));const _shTier=_shp?(_shp.tier||0):0;const _arp=PARTS.find(p=>p.cat==='armor'&&(s.parts||[]).includes(p.id));const _arTier=_arp?(_arp.tier||0):0;return{...s,isEnemy:false,hp:s.hp,maxHP:st.HP,sh:s.sh,maxSH:st.maxSH,ATT:st.ATT,INT:st.INT,TEC:st.TEC,DEF:st.DEF||0,wtype:_wtype,wpnTier:_wt,wpnRarity:_wrar,shieldTier:_shTier,armorTier:_arTier};});
  combatState={players,enemies,turn:0,done:false,log:[],planetDef,isBoss,_rndSeed:Date.now()%9999,_entranceT:0,_entranceDone:false,_planetId:G.currentPlanet};
  // 우르사 최종전: 4열 진형 + 거대 보스가 한 화면에 들어오도록 기본 줌 축소(플레이어가 휠로 조절 가능)
  if(isBoss)cbZoom=0.4;
  renderCombatView(document.getElementById('hub-body'));
  setHubNav('combat');updateHUD();
  _cbEffects=[];_unitPos={};if(_cbAnimReq){cancelAnimationFrame(_cbAnimReq);_cbAnimReq=null;}
  combatState._sunsinUsed=false;
  // 함선 즉시 등장 (애니메이션 없음)
  combatState._entranceT=1;combatState._entranceDone=true;
  sfxAlert();try{AudioMgr.playBgm(isBoss?'boss':'combat');}catch(e){}
  _preloadCombatImages();requestAnimationFrame(()=>{initCombatCanvas();const t=document.getElementById('cb-title');if(t)t.textContent=I18N.t('combat.titleBoss',{bossTitle:isBoss?I18N.t('combat.title.bossUrsa'):I18N.t('combat.title.default'),nm:planetDef.nm});_cbStartAnimLoop();_updateCombatFleetStats();setTimeout(runCombatTurn,600);});
}
// 전투 중 도망가기 — 확인 모달 → fleeCombat 실행
function confirmFleeCombat(){
  if(!combatState||combatState.done)return;
  // 보스급 전투는 도망 불가 (스토리 진행상 후퇴 의미 없음)
  if(combatState.isBoss||combatState.isVoidBoss){
    notify(I18N.t('notify.cannotFleeBoss'),'err');
    return;
  }
  const _pen=Math.floor(G.credits*0.03);
  openModal(I18N.t('modal.flee'),
    `<div style="padding:6px 4px">
       <div style="color:var(--yellow);font-size:14px;line-height:1.7;margin-bottom:10px">${I18N.t('ui.fleeWithoutDamage')}</div>
       <div style="background:rgba(255,40,40,.08);border:1px solid rgba(255,80,80,.4);border-radius:6px;padding:10px 12px;font-size:13px;line-height:1.9;color:#ff9999">
         ${I18N.t('ui.fleeRetreatPen',{cr:_pen.toLocaleString()})}<br>
         ${I18N.t('ui.fleeRepPen')}<br>
         ${I18N.t('ui.fleeNoReward')}
       </div>
     </div>`,
    [
      {txt:I18N.t('cb.flee'),fn:()=>{closeModal();fleeCombat();},cls:'btn-red'},
      {txt:I18N.t('ui.keepFighting'),fn:closeModal,cls:'btn-sm'}
    ]);
}
function fleeCombat(){
  if(!combatState||combatState.done)return;
  combatState.done=true;
  // 잔여 SFX/이펙트 정리
  try{AudioMgr.stopAllSfx();}catch(e){}
  try{_cbEffects=[];if(_cbAnimReq){cancelAnimationFrame(_cbAnimReq);_cbAnimReq=null;}}catch(e){}
  // 도주 페널티 — 엔진(TEC) 합산이 높을수록 손실 완화 (사용자 명세)
  //   TEC 0   → 페널티 100% (3% 크레딧, 명성 -2)
  //   TEC 500 → 페널티 67%   (~2% / 명성 -1)
  //   TEC 1500+ → 페널티 30% (캡 — 0.9% / 명성 0~-1)
  const _flTec=(combatState.players||G.fleet||[]).reduce((s,u)=>s+(u.TEC||0),0);
  const _penMul=Math.max(0.30, 1 - Math.min(0.70, _flTec/2200));
  const _pen=Math.floor(G.credits*0.03*_penMul);
  const _repLoss=Math.max(1, Math.round(2*_penMul));
  G.credits=Math.max(100,G.credits-_pen);
  try{changeReputation(-_repLoss);}catch(e){}
  const _tecNote=_penMul<0.95?I18N.t('ui.engineAdvDiscount',{pct:Math.round((1-_penMul)*100)}):'';
  addCombatLog(I18N.t('combat.fleeWithPenalty',{pen:_pen.toLocaleString(),rep:_repLoss,tec:_tecNote}),'err');
  notify(I18N.t('notify.fleeAlt',{cr:_pen.toLocaleString(),rep:_repLoss,tec:_tecNote}),'err');
  try{baekgu(I18N.t('baekgu.fledStronger'));}catch(e){}
  // 아군 함대 HP 동기화 (전투 중 데미지 보존)
  try{G.fleet.forEach(s=>{const cs=combatState.players.find(p=>p.id===s.id);if(cs){s.hp=Math.max(1,cs.hp);if(cs.sh!=null)s.sh=cs.sh;}});}catch(e){}
  // 전투 기록 저장 (패배 처리)
  if(!G.combatHistory)G.combatHistory=[];
  const _pdef=combatState.planetDef&&combatState.planetDef.nm?combatState.planetDef:(PLANET_DEF.find(p=>p.id===G.currentPlanet)||{});
  G.combatHistory.push({
    win:false,fled:true,
    pid:G.currentPlanet,planetId:G.currentPlanet,
    planet:_pdef.nm||I18N.t('ui.unknownPlanet'),
    turn:combatState.turn,
    earned:-_pen,
    gameTurn:G.turn
  });
  updateHUD();saveGame(true);
  // 1.2초 후 허브로 복귀 (이펙트 페이드 시간)
  setTimeout(()=>{
    combatState=null;
    try{_cbCacheClear();}catch(e){}
    _cbEffects=[];_unitPos={};
    if(_cbAnimReq){cancelAnimationFrame(_cbAnimReq);_cbAnimReq=null;}
    try{updateGatherBtn();}catch(e){}
    try{AudioMgr.playBgm(_planetBgmName(G.currentPlanet));}catch(e){}
    if(typeof hubTab==='function')hubTab('main');
  },1200);
}
try{if(typeof window!=='undefined'){window.confirmFleeCombat=confirmFleeCombat;window.fleeCombat=fleeCombat;}}catch(e){}

function renderCombatView(body){
  body.classList.add('cv');
  document.body.classList.add('combat-mode');  // 알림(notif) 위치 조정용
  body.innerHTML=`<div id="cb-hdr" style="min-height:42px;background:rgba(13,26,42,.97);border-bottom:1px solid var(--bdr);display:flex;align-items:center;justify-content:space-between;padding:4px 10px;flex-shrink:0;gap:8px;white-space:nowrap;overflow:hidden">
    <div id="cb-title" style="color:var(--yellow);font-weight:bold;font-size:13px;flex-shrink:1;min-width:0;overflow:hidden;text-overflow:ellipsis">${I18N.t('combat.title.default')}</div>
    <div id="cb-turn" style="color:var(--cyan);font-size:11px;flex-shrink:0">TURN 0</div>
    <div id="cb-status" style="color:var(--dim);font-size:11px;flex-shrink:1;min-width:0;overflow:hidden;text-overflow:ellipsis">${I18N.t('combat.statusPreparing')}</div>
  </div>
  <!-- 함대 전술 충전 게이지 (사용자 요청 2026-06-17) — 다음 전술로 넘어갈 때 상단에 게이지 충전 모션 -->
  <div id="cb-tactic-gauge" style="display:none;background:rgba(8,16,28,.95);border-bottom:1px solid var(--bdr);padding:3px 12px;flex-shrink:0">
    <div style="display:flex;align-items:center;gap:8px">
      <span id="cb-tg-label" style="font-size:10px;color:var(--gold);white-space:nowrap;flex-shrink:0;font-weight:bold"></span>
      <div style="flex:1;height:9px;background:rgba(0,0,0,.5);border-radius:5px;overflow:hidden;border:1px solid rgba(255,215,0,.35)">
        <div id="cb-tg-fill" style="height:100%;width:0%;background:linear-gradient(90deg,#ff8833,#ffd700);border-radius:5px;box-shadow:0 0 8px rgba(255,200,80,.6)"></div>
      </div>
    </div>
  </div>
  <!-- 사용자 요청: 함대 전술 버튼은 헤더 바로 하단 1행에 정렬 표시 -->
  <div id="cb-tactics" style="background:rgba(8,16,28,.92);border-bottom:1px solid var(--bdr);padding:4px 10px;flex-shrink:0;display:flex;align-items:center;gap:6px;flex-wrap:nowrap;overflow-x:auto;min-height:42px"></div>
  <div id="cb-fleet-stats" style="background:rgba(8,16,28,.96);border-bottom:1px solid var(--bdr);padding:6px 14px;flex-shrink:0;display:grid;grid-template-columns:1fr 1fr;gap:14px;font-size:11px;font-family:Courier New,monospace">
    <div id="cb-fleet-pl" style="color:var(--cyan)">${I18N.t('combat.alliesMeasuring')}</div>
    <div id="cb-fleet-en" style="color:#ff8888;text-align:right">${I18N.t('combat.enemyMeasuring')}</div>
  </div>
  <div id="cb-arena" style="flex:1;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;background:#050a1a">
    <canvas id="cb-cv" style="transform:perspective(1500px) rotateX(13deg);transform-origin:center 54%"></canvas>
    <!-- 전투 상황 로그 — 우측 세로 팝업 컬럼 (사용자 요청: 하단 스트립 → 우측 페이드 팝업) -->
    <div id="cb-log" class="cb-log" style="position:absolute;right:10px;top:10px;bottom:10px;width:174px;display:flex;flex-direction:column-reverse;gap:4px;pointer-events:none;z-index:8;overflow:hidden"></div>
  </div>`;
}
let cbCtx,cbCV,cbZoom=1.0,cbOffX=0,cbOffY=0,cbPan=false,cbPanLx=0,cbPanLy=0;
function initCombatCanvas(){
  cbCV=document.getElementById('cb-cv');if(!cbCV)return;
  const arena=document.getElementById('cb-arena');
  const aw=arena?arena.clientWidth:800,ah=arena?arena.clientHeight:400;
  cbCV.width=Math.max(aw,400);cbCV.height=Math.max(ah,300);
  cbCtx=cbCV.getContext('2d');
  cbZoom=1.0;cbOffX=0;cbOffY=0;
  // 마우스 휠: 줌
  cbCV.onwheel=e=>{e.preventDefault();cbZoom=clamp(cbZoom+(e.deltaY<0?.12:-.12),0.3,4);drawCombatFrame();};
  // 좌클릭 드래그: 이동
  cbCV.onmousedown=e=>{if(e.button===0){cbPan=true;cbPanLx=e.clientX;cbPanLy=e.clientY;}};
  cbCV.onmousemove=e=>{if(!cbPan)return;cbOffX+=e.clientX-cbPanLx;cbOffY+=e.clientY-cbPanLy;cbPanLx=e.clientX;cbPanLy=e.clientY;drawCombatFrame();};
  cbCV.onmouseup=e=>{if(e.button===0)cbPan=false;};
  cbCV.onmouseleave=()=>{cbPan=false;};
  cbCV.oncontextmenu=e=>e.preventDefault();
  // 터치 리스너 — addEventListener는 중복 추가되므로 element에 한 번만 attach (data-touch-init 가드)
  // ※ renderCombatView가 매번 cb-cv를 새로 만들지만, 같은 노드를 재사용하는 경로(resumeCombat 등)에서는
  //    가드 없이 그대로 두면 매 호출마다 touchstart/move/end 리스너가 누적되어 RAM/이벤트 폭주를 유발.
  if(cbCV.dataset.touchInit!=='1'){
  cbCV.dataset.touchInit='1';
  // 터치: 핀치 줌 + 이동
  let cbTouches=[];
  cbCV.addEventListener('touchstart',e=>{e.preventDefault();cbTouches=[...e.touches];},{passive:false});
  cbCV.addEventListener('touchmove',e=>{
    e.preventDefault();
    if(e.touches.length===1&&cbTouches.length>=1){
      cbOffX+=e.touches[0].clientX-cbTouches[0].clientX;cbOffY+=e.touches[0].clientY-cbTouches[0].clientY;
      drawCombatFrame();
    } else if(e.touches.length===2&&cbTouches.length>=2){
      const d0=Math.hypot(cbTouches[0].clientX-cbTouches[1].clientX,cbTouches[0].clientY-cbTouches[1].clientY);
      const d1=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
      if(d0>0)cbZoom=clamp(cbZoom*(d1/d0),0.3,4);drawCombatFrame();
    }
    cbTouches=[...e.touches];
  },{passive:false});
  cbCV.addEventListener('touchend',e=>{cbTouches=[];},{passive:false});
  }
  // 전투 헤더에 줌 버튼 추가
  const hdr=document.getElementById('cb-hdr');
  if(hdr&&!document.getElementById('cb-zoom-btns')){
    const btns=document.createElement('div');btns.id='cb-zoom-btns';
    btns.style.cssText='display:flex;gap:3px;align-items:center;flex-shrink:0';
    // 사용자 요청: 상단 -, + 줌 버튼 삭제. 시점 리셋(⌂) 만 유지. 줌은 휠·핀치로 계속 가능.
    btns.innerHTML=`<span style="font-size:10px;color:var(--muted);white-space:nowrap">${I18N.t('combat.controlsHint')}</span>
      <button class="btn btn-sm" onclick="cbZoom=1;cbOffX=0;cbOffY=0;drawCombatFrame()" style="padding:3px 11px;font-size:16px;min-height:34px" title="${I18N.t('map.resetView')}">⌂</button>
      <button id="cb-flee-btn" onclick="confirmFleeCombat()" title="${I18N.t('combat.fleeTooltip')}"
        style="background:rgba(231,76,60,.18);border:1.5px solid rgba(255,80,80,.6);color:#ff9999;font-family:inherit;font-size:13px;font-weight:bold;padding:8px 18px;border-radius:6px;cursor:pointer;letter-spacing:2px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.3)">${I18N.t('combat.flee')}</button>`;
    hdr.insertBefore(btns,hdr.children[1]);
  // 일점사 전술 버튼 — H01(이순신) OR H05(넬슨) 영입 시 표시 (사용자 요청: 넬슨 단독도 OK)
  //   · 부착 위치: cb-tactics (헤더 하단 1행) — 사용자 요청
  if((G.heroes.includes('H01')||G.heroes.includes('H05'))&&!document.getElementById('cb-sunsin-btn')){
    const _tac=document.getElementById('cb-tactics')||hdr;
    const sbtn=document.createElement('button');sbtn.id='cb-sunsin-btn';
    sbtn.className='btn btn-sm';
    sbtn.style.cssText='padding:5px 14px;font-size:14px;min-height:34px;min-width:130px;letter-spacing:.3px;border-color:var(--red);color:var(--red);background:rgba(255,60,60,.08);animation:pulse 2s infinite;white-space:nowrap;flex-shrink:0';
    sbtn.textContent=I18N.t('combat.focusFire');
    const _by=G.heroes.includes('H01')?((typeof HEROES!=='undefined'&&HEROES.H01?.nm)||I18N.t('hero.fallbackH01')):((typeof HEROES!=='undefined'&&HEROES.H05?.nm)||I18N.t('hero.fallbackH05'));
    sbtn.title=I18N.t('combat.focusFireTip',{by:_by});
    sbtn.onclick=activateSunsinFocus;
    _tac.appendChild(sbtn);
  }
  }
  // 탭 전환 후 복귀 시 — 이미 활성화/사용된 스킬 버튼 상태 복원
  try{_restoreCombatSkillButtons();}catch(e){console.warn('skill button restore failed',e);}
  drawCombatFrame();
}

// ── 다른 탭 갔다 와도 일점사/학익진/시간차공격 등 후속 스킬 버튼 상태 복원 ──
// 원인: 일점사 사용 → 5초 setTimeout → _showHaikjinButton 호출 시점에 cb-hdr이 없어
//      (다른 탭 화면) 버튼 생성이 silent fail 됨. 복귀해도 setTimeout이 이미 소진됐기 때문에
//      학익진 버튼이 영영 안 나타남. _xxxReady 플래그를 보고 재생성.
function _restoreCombatSkillButtons(){
  if(!combatState||combatState.done)return;
  // 일점사: 항상 initCombatCanvas에서 추가됨 — 사용 흔적만 반영해 비활성화
  const sbtn=document.getElementById('cb-sunsin-btn');
  if(sbtn&&combatState._sunsinUsed)sbtn.disabled=true;
  // 학익진/시간차공격/테슬라/제네시스/데스티네이션 — ready 또는 used 시 재생성
  if(combatState._haikjinReady||combatState._haikjinUsed){try{_showHaikjinButton();}catch(e){}}
  if(combatState._einsteinReady||combatState._einsteinUsed){try{_showEinsteinButton();}catch(e){}}
  if(combatState._teslaReady||combatState._teslaUsed){try{_showTeslaButton();}catch(e){}}
  if(combatState._genesisReady||combatState._genesisUsed){try{_showGenesisButton();}catch(e){}}
  if(combatState._destinationReady||combatState._destinationUsed){try{_showDestinationButton();}catch(e){}}
  // 이미 사용된 버튼은 비활성화 표시
  [['haikjin','_haikjinUsed'],['einstein','_einsteinUsed'],['tesla','_teslaUsed'],['genesis','_genesisUsed'],['destination','_destinationUsed']].forEach(([k,flag])=>{
    const btn=document.getElementById('cb-'+k+'-btn');
    if(btn&&combatState[flag])btn.disabled=true;
  });
}
// ── 전투 이미지 캐시 (PNG 교체 구조) ──────────────────────────────
// PNG 파일 위치: img/combat/ships/{catalogId}.png  (플레이어 함선)
//                img/combat/enemies/{enemyType}.png (적 함선)
// PNG 없으면 벡터 폴백으로 자동 전환
// 전투 이미지 캐시: LRU 상한으로 메모리 누수 방지 (장시간 플레이 시 다운 예방)
const _CB_IMG_CACHE_MAX=60;  // 사용자 다운 재보고 (2026-06-06): 80 → 60 (-25% 추가)
const _cbImgCacheMap=new Map();   // 실제 LRU 순서 보존용
const _cbImgCache=new Proxy({},{   // 기존 코드 호환 (cache[src] 형태로 접근)
  get(_,k){return _cbImgCacheMap.get(k);},
  set(_,k,v){_cbImgCacheMap.delete(k);_cbImgCacheMap.set(k,v);_cbCacheEvict();return true;},
  has(_,k){return _cbImgCacheMap.has(k);},
  deleteProperty(_,k){return _cbImgCacheMap.delete(k);},
  ownKeys(){return [..._cbImgCacheMap.keys()];},
  getOwnPropertyDescriptor(_,k){return _cbImgCacheMap.has(k)?{enumerable:true,configurable:true,value:_cbImgCacheMap.get(k)}:undefined;}
});
function _cbCacheEvict(){
  while(_cbImgCacheMap.size>_CB_IMG_CACHE_MAX){
    const oldest=_cbImgCacheMap.keys().next().value;
    if(oldest===undefined)break;
    _cbImgCacheMap.delete(oldest);
  }
}
function _cbCacheClear(){_cbImgCacheMap.clear();}
// 전투 함선 이미지 경로 계산 — _drawShipUnit과 preload가 공유.
// case-insensitive 탐지 + 이름 기반 보강으로 catalogId 누락/대소문자 다양성에도 견고.
function _combatShipImgSrc(u){
  const _r=_combatShipImgSrcRaw(u);
  const _lod=(typeof window!=='undefined'&&window._mobileLod)?window._mobileLod(_r):_r;
  // bugfix 2026-06-11: 전투 화면에도 신규 HD 함선 이미지 적용 —
  //   허브(shipImgSrc)는 img/ships/H/ HD를 쓰지만 전투는 구버전 img/combat/ships/ 만 사용하던 문제.
  //   데스크탑: img/combat/ships/X.png → img/ships/H/X.png 우선, 실패 시 _COMBAT_H_FB 매핑으로
  //   _drawShipUnit 에서 원본 경로 폴백. 모바일은 기존 LOD(m/) 유지.
  if(typeof window!=='undefined'&&!window.IS_MOBILE&&typeof _r==='string'){
    // ① 전투 전용 스프라이트(img/combat/ships/X.png) → HD(img/ships/H/X.png)
    let _hd=_r.replace(/^img\/combat\/ships\/([^/?]+\.png)(\?|$)/,'img/ships/H/$1$2');
    // ② 팔콘(S10)·거북선특수(LGD01_SP) 등 img/ships/X.png 를 직접 반환하는 케이스도
    //    허브(shipImgSrc)와 동일하게 HD 폴더를 쓰도록 변환 — 전투/정비소 이미지 일관성
    //    (사용자 보고 2026-06-16: 팔콘 스카우트가 전투 화면과 정비소에서 다르게 보임)
    if(_hd===_r)_hd=_r.replace(/^img\/ships\/([^/?]+\.png)(\?|$)/,'img/ships/H/$1$2');
    if(_hd!==_r){
      try{
        if(!window._COMBAT_H_FB)window._COMBAT_H_FB={};
        window._COMBAT_H_FB[_hd]=_lod;
      }catch(e){}
      return _hd;
    }
  }
  return _lod;
}
function _combatShipImgSrcRaw(u){
  const _TIER={'소형':'S','중형':'M','대형':'L','전설기함':'L','신화':'L'};
  const _tierKey=t=>_TIER[t||'소형']||'S';
  // 캐시 버스터 — Firebase png 24h 캐시 우회 (H12 등 함선 이미지 교체 시 즉시 반영)
  const _ver=(typeof window!=='undefined'&&window._GAME_VER)?('?v='+encodeURIComponent(window._GAME_VER)):'';
  // 스킨(홀로그램) — 전투 화면에서도 외관만 변경
  if(!u.isEnemy && u._skinCatId){
    const _sk=String(u._skinCatId).toUpperCase();
    if(_sk==='URSA'||_sk==='BOSS')return 'img/combat/ships/Boss.png'+_ver;
    if(_sk==='BLACKFALCON'||_sk==='VOIDFALCON'||_sk==='HIDDEN_FALCON')return 'img/ships/S10.png'+_ver;
    return 'img/combat/ships/'+u._skinCatId+'.png'+_ver;
  }
  const isEnemy=!!u.isEnemy;
  const sid=String(u.id||'');
  const nmLow=String(u.nm||'').toLowerCase();
  const catId=sid.replace(/(?:_\d+|_main)$/,'').toUpperCase();
  // 이름 기반 팩션 추정 (catalogId/id 누락 대비)
  const isChixName=nmLow.includes('치크스')||nmLow.includes('chix')||nmLow.includes('chiks');
  const isPirateName=nmLow.includes('해적')||nmLow.includes('pirate')||nmLow.includes('raider')||nmLow.includes('약탈');
  const isDbrpName=nmLow.includes('잔해')||nmLow.includes('dbrp')||nmLow.includes('salvage')||nmLow.includes('debris')||nmLow.includes('recovered')||nmLow.includes('회수');
  // ── 블랙팔콘 / 보이드 팔콘 / 히든 팔콘(보이드 시험 보상) 공통 — 적/아군 무관하게 S10.png ──
  // catalogId 변형: BLACKFALCON / VOID_FALCON / HIDDEN_FALCON / FALCON
  // (catalogId의 '_' 이후가 잘려 'HIDDEN'/'VOID'가 되는 경우까지 포함)
  const _isFalcon=(()=>{
    const _cidRawUp=String(u.catalogId||u.catId||u.id||'').toUpperCase();
    if(/BLACKFALCON|VOIDFALCON|VOID_FALCON|HIDDEN_FALCON|^FALCON/.test(_cidRawUp))return true;
    if(catId==='HIDDEN'||catId==='VOID'||catId==='FALCON'||catId==='BLACKFALCON'||catId==='VOIDFALCON')return true;
    if(sid.startsWith('HIDDEN_FALCON')||sid.startsWith('CAP_BLACKFALCON')||sid.startsWith('CAP_VOIDFALCON')||sid.startsWith('BLACKFALCON')||sid.startsWith('VOID_FALCON'))return true;
    if(u._isHiddenFalcon||u._isVoidFalconCaptured||u.voidBoss)return true;
    if(nmLow.includes('팔콘')||nmLow.includes('블랙')||nmLow.includes('검은 팔콘')||nmLow.includes('다크팔콘')||nmLow.includes('falcon')||nmLow.includes('black falcon')||nmLow.includes('dark falcon')||nmLow.includes('blackfalcon'))return true;
    return false;
  })();
  if(_isFalcon)return 'img/ships/S10.png'+_ver;
  if(isEnemy){
    // 사용자 보고 2026-06-07 (재발): 우르사 알파(P19) 진입 시 우르사 메이저 보스 함선 등장
    // → 단순 '우르사' substring 매칭 제거. BOSS_* id, catalogId='URSA', 또는 정확히 '우르사 메이저'/'ursa major' 이름만 보스로 인정.
    //   (P19 행성 우르사-알파에 있는 일반 치크스 함선이 어떤 경로로든 nm에 '우르사'를 포함하면 오인식되던 문제 차단)
    const isBoss=catId.startsWith('BOSS_')||catId==='BOSS'||catId==='URSA'
                 ||sid.startsWith('BOSS_URSA')||sid==='BOSS_MAIN'
                 ||nmLow.includes('우르사 메이저')||nmLow.includes('ursa major');
    if(isBoss)return 'img/combat/enemies/Boss.png'+_ver;
    // 적 함대에 섞인 「일반 구매가능 함선」 — 카탈로그 함선 이미지로 표시
    if(u._useCatalogImg&&(u.catId||u.catalogId)){
      const _cc=String(u.catalogId||u.catId).replace(/(?:_\d+|_main)$/,'');
      const _n=(typeof _resolveShipImgBase==='function')?_resolveShipImgBase(_cc,u.tier):_cc;
      if(_n){if(_n==='S10')return 'img/ships/S10.png'+_ver;if(_n==='Default')return 'img/combat/ships/S01.png'+_ver;return 'img/combat/ships/'+_n+'.png'+_ver;}
    }
    const base=catId.startsWith('CHIX')||/^E\d/.test(catId)||isChixName?'CHIX':
               isDbrpName?'DBRP':'PIRATE';
    return 'img/combat/enemies/'+base+'_'+_tierKey(u.tier)+'.png'+_ver;
  }
  const cid=String(u.catalogId||u.catId||u.id||'').replace(/(?:_\d+|_main)$/,'').toUpperCase();
  // 특수 거북선 — 전투에서도 단일 이미지(img/ships/LGD01_SP.png) 사용 (별도 combat 에셋 없음)
  if(cid==='LGD01_SP'||u._turtleSpecial)return 'img/ships/LGD01_SP.png'+_ver;
  if(cid==='URSA'||sid.startsWith('BOSS_URSA')||cid==='BOSS'||sid==='BOSS_MAIN')return 'img/combat/ships/Boss.png'+_ver;
  // 나포 함선 (CAP_<ts>_<rand>) — id에 timestamp가 붙어 cid가 'CAP'과 정확히 일치하지 않으므로 prefix로 감지
  if(sid.startsWith('CAP_')||cid==='CAP'||cid.startsWith('CAP_')){
    const _capFac=isChixName?'CHIX':isDbrpName?'DBRP':'PIRATE';
    return 'img/combat/ships/'+_capFac+'_'+_tierKey(u.tier)+'.png'+_ver;
  }
  if(cid==='CHIX'||cid.startsWith('CHIX')||isChixName){
    return 'img/combat/ships/CHIX_'+_tierKey(u.tier)+'.png'+_ver;
  }
  const cidRaw=String(u.catalogId||u.catId||u.id||'').replace(/(?:_\d+|_main)$/,'');
  // 비표준 id 까지 실재 파일로 정규화 — 전투 화면 함선 이미지 누락(빈칸) 방지.
  // S10/Default 는 combat 폴더에 없으므로 ships 폴더(또는 S01)로 대체.
  const _cn=(typeof _resolveShipImgBase==='function')?_resolveShipImgBase(cidRaw,u.tier):null;
  if(_cn){
    if(_cn==='S10')return 'img/ships/S10.png'+_ver;
    if(_cn==='Default')return 'img/combat/ships/S01.png'+_ver;
    return 'img/combat/ships/'+_cn+'.png'+_ver;
  }
  return 'img/combat/ships/'+(cidRaw||'S01')+'.png'+_ver;
}
// 전투 시작 전 이미지 프리로드 (초기 렌더링에 PNG 즉시 표시)
function _preloadCombatImages(){
  // 로드 완료 시 캔버스 갱신 (이미지 로드 후 벡터→PNG로 전환)
  let _pendingRedraws=0;
  const _onImgLoad=()=>{_pendingRedraws++;if(_pendingRedraws===1)setTimeout(()=>{_pendingRedraws=0;if(typeof drawCombatFrame==='function')drawCombatFrame();},80);};
  const factions=['CHIX','PIRATE','DBRP'];const sizes=['S','M','L'];
  // 적 측: 모든 팩션+사이즈 + 보스 (모바일은 m/ 사본 자동 로드)
  const _lod=(s)=>(typeof window!=='undefined'&&window._mobileLod)?window._mobileLod(s):s;
  factions.forEach(f=>sizes.forEach(s=>_loadCombatImg(_lod('img/combat/enemies/'+f+'_'+s+'.png'),_onImgLoad)));
  _loadCombatImg(_lod('img/combat/enemies/Boss.png'),_onImgLoad);
  // 플레이어 함선: 실제 draw 경로와 동일한 helper로 경로 산출하여 정확히 일치하는 파일을 프리로드
  if(G&&G.fleet){
    const _seen=new Set();
    G.fleet.forEach(sh=>{
      const src=_combatShipImgSrc({...sh,isEnemy:false});
      if(src&&!_seen.has(src)){_seen.add(src);_loadCombatImg(src,_onImgLoad);}
    });
  }
}
// 맵 이미지 캐시 — LRU 36개 캡 (다운 재보고 2026-06-06 후 48→36)
const _MAP_IMG_CACHE_MAX=36;
const _mapImgCacheMap=new Map();
const _mapImgCache=new Proxy({},{
  get(_,k){return _mapImgCacheMap.get(k);},
  set(_,k,v){_mapImgCacheMap.delete(k);_mapImgCacheMap.set(k,v);
    while(_mapImgCacheMap.size>_MAP_IMG_CACHE_MAX){
      const oldest=_mapImgCacheMap.keys().next().value;if(oldest===undefined)break;
      _mapImgCacheMap.delete(oldest);
    }
    return true;
  },
  has(_,k){return _mapImgCacheMap.has(k);},
  deleteProperty(_,k){return _mapImgCacheMap.delete(k);}
});
function _loadMapImg(src,onLoad){
  if(_mapImgCacheMap.has(src)) return _mapImgCacheMap.get(src);
  const img=new Image();
  img.onload=()=>{_mapImgCache[src]=img;if(onLoad)onLoad();};
  img.onerror=()=>{_mapImgCache[src]=null;};
  img.src=src;
  _mapImgCache[src]=img;
  return img;
}
function _loadCombatImg(src,onLoad){
  if(_cbImgCache[src]==='ERR') return null;
  if(_cbImgCache[src]) return _cbImgCache[src];
  const img=new Image();
  img.onload=()=>{_cbImgCache[src]=img;if(onLoad)onLoad();};
  img.onerror=()=>{_cbImgCache[src]='ERR';}; // ERR sentinel — prevents infinite retry
  img.src=src;
  _cbImgCache[src]=img; // store pending Image (check .complete to know if loaded)
  return img;
}

// 함선 등급에 따른 표시 크기 (소형→전설 시각적 차이를 크게)
function _shipDrawSize(u){
  const tier=u.tier||(u.isEnemy?'소형':'소형');
  // 특수 거북선 — 신화 기본(246×152)의 2배 크기로 전투 표시 (사용자 요청)
  if((u.catalogId||u.catId||u.id||'').toString().toUpperCase().indexOf('LGD01_SP')>-1||u._turtleSpecial)
    return{w:492,h:304,bar:528,label:18,gap:1100};
  // 아군 대형 이상 함선(대형/전설기함/신화) 10% 확대 (배치 간격은 그대로)
  // 소형 기준: 중형 ×1.5, 대형/전설기함 ×2 → 전체 ×0.8
  if(tier==='신화') return{w:246,h:152,bar:264,label:15,gap:640};
  if(tier==='전설기함') return{w:229,h:136,bar:240,label:14,gap:600};
  if(tier==='대형'||u.id==='BOSS_MAIN') return{w:158,h:97,bar:176,label:12,gap:480};
  if(tier==='중형') return{w:86,h:53,bar:112,label:11,gap:300};
  return{w:54,h:33,bar:70,label:10,gap:210};
}
// 적 함선 크기 — 아군과 동일 비율 적용
function _enemySize(u){
  const nm=(u.nm||'').toLowerCase(),tier=u.tier||'소형';
  // 우르사 메이저 보스 본체 — 사용자 요청 2026-06-07: 50% 축소 (1512×918 → 756×459)
  //   + 매칭 강화: BOSS_MAIN id 또는 _ursaBoss 플래그 또는 정확히 '우르사 메이저'/'ursa major' 이름만.
  //   (P19 우르사-알파 행성의 일반 함선이 우르사 보스 크기로 그려지던 문제 차단)
  if(u.id==='BOSS_MAIN'||u._ursaBoss||nm.includes('우르사 메이저')||nm.includes('ursa major'))
    return{w:756,h:459,bar:300,label:18,gap:1200};
  {
    const _idUp=String(u.catalogId||u.catId||u.id||'').toUpperCase();
    if(/BLACKFALCON|VOID_?FALCON|HIDDEN_FALCON/.test(_idUp)||u.voidBoss||u._isHiddenFalcon
       ||nm.includes('블랙팔콘')||nm.includes('블랙 팔콘')||nm.includes('black falcon')||nm.includes('blackfalcon'))
      return{w:448,h:276,bar:300,label:17,gap:900};
  }
  // 아이젠클로 중간보스 기함 — 일반 대형(144×88)의 2배 크기. 사용자 요청 2026-06-17.
  if(u._eisenklauBoss||nm.includes('아이젠클로 기함')||nm.includes('eisenklau flagship')) return{w:288,h:176,bar:264,label:14,gap:900};
  // 일반 해적 모선
  if(nm.includes('모선')||nm.includes('mothership')||nm.includes('carrier')) return{w:252,h:153,bar:324,label:16,gap:700};
  if(tier==='신화') return{w:224,h:138,bar:264,label:15,gap:640};
  if(tier==='전설기함') return{w:208,h:124,bar:240,label:14,gap:600};
  if(tier==='대형') return{w:144,h:88,bar:176,label:12,gap:480};
  if(tier==='중형'||nm.includes('포함')||nm.includes('순양함')||nm.includes('전투함')||nm.includes('구축함')||nm.includes('gunship')||nm.includes('cruiser')||nm.includes('battleship')||nm.includes('destroyer')||nm.includes('assault')) return{w:86,h:53,bar:112,label:11,gap:300};
  return{w:54,h:33,bar:70,label:10,gap:210};
}

// 벡터 함선 그리기 — 플레이어는 오른쪽 방향(→), 적은 왼쪽 방향(←)
function _drawShipVector(ctx,x,y,sz,isEnemy,col,alpha){
  const w=sz.w,h=sz.h;
  ctx.globalAlpha=alpha;
  // 기체 그라데이션
  const grd=isEnemy?
    ctx.createLinearGradient(x+w,y-h,x-w,y+h):
    ctx.createLinearGradient(x-w,y-h,x+w,y+h);
  grd.addColorStop(0,col);grd.addColorStop(1,'rgba(0,0,0,.4)');
  ctx.fillStyle=grd;
  ctx.beginPath();
  if(!isEnemy){
    // 플레이어: 오른쪽 향함 (노즈 → 오른쪽)
    ctx.moveTo(x+w,y);           // 노즈 (우)
    ctx.lineTo(x-w*.4,y-h);      // 상단 날개
    ctx.lineTo(x-w*.6,y-h*.3);   // 상단 엔진
    ctx.lineTo(x-w,y);           // 후미 중앙
    ctx.lineTo(x-w*.6,y+h*.3);   // 하단 엔진
    ctx.lineTo(x-w*.4,y+h);      // 하단 날개
  } else {
    // 적: 왼쪽 향함 (노즈 → 왼쪽)
    ctx.moveTo(x-w,y);           // 노즈 (좌)
    ctx.lineTo(x+w*.4,y-h);      // 상단 날개
    ctx.lineTo(x+w*.6,y-h*.3);   // 상단 엔진
    ctx.lineTo(x+w,y);           // 후미 중앙
    ctx.lineTo(x+w*.6,y+h*.3);   // 하단 엔진
    ctx.lineTo(x+w*.4,y+h);      // 하단 날개
  }
  ctx.closePath();ctx.fill();
  // 외곽선
  ctx.strokeStyle=isEnemy?'#cc00ff':'#00f3ff';
  ctx.lineWidth=1.5;ctx.stroke();
  // 엔진 글로우 (후미)
  const ex=isEnemy?x+w*.9:x-w*.9;
  const glow=ctx.createRadialGradient(ex,y,1,ex,y,h*.8);
  glow.addColorStop(0,isEnemy?'rgba(200,0,255,.5)':'rgba(0,243,255,.5)');
  glow.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=glow;ctx.beginPath();ctx.arc(ex,y,h*.8,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=1;
}

// PNG 있으면 PNG, 없으면 벡터 폴백
function _drawShipUnit(ctx,u,x,y,sz){
  const alpha=u.hp>0?1:.22;
  const isEnemy=u.isEnemy;
  let imgSrc=_combatShipImgSrc(u);
  const dsz=isEnemy?_enemySize(u):_shipDrawSize(u);
  const col=isEnemy?'#cc44ff':'#00ccff';
  let cached=_cbImgCache[imgSrc];
  // bugfix 2026-06-11: HD 경로 로드 실패(ERR) 시 원본 combat 경로로 폴백
  if(cached==='ERR'&&typeof window!=='undefined'&&window._COMBAT_H_FB&&window._COMBAT_H_FB[imgSrc]){
    imgSrc=window._COMBAT_H_FB[imgSrc];
    cached=_cbImgCache[imgSrc];
  }
  // ── 함선 방향: 가장 가까운 적/아군(공격 대상) 방향을 바라보도록 회전 ──
  //  · 아군 → 가장 가까운 적 좌표 / 적 → 가장 가까운 아군 좌표
  //  · 부드러운 회전 보간(turnSpeed=0.02) → 사용자 요청 "회전 5배 느림"
  //  · 기본 함선 이미지/벡터는 우측(노즈)을 향함. 적은 atan2 + π로 미러 대체
  let _targetAngle=isEnemy?Math.PI:0;  // 기본 방향
  try{
    if(combatState){
      const others=isEnemy?(combatState.players||[]):(combatState.enemies||[]);
      let minD=Infinity,tx=null,ty=null;
      for(let i=0;i<others.length;i++){
        const o=others[i];if(!o||(o.hp||0)<=0)continue;
        const pos=_unitPos&&_unitPos[o.id||('X'+i)];if(!pos)continue;
        const dx=pos.x-x,dy=pos.y-y,d=dx*dx+dy*dy;
        if(d<minD){minD=d;tx=pos.x;ty=pos.y;}
      }
      if(tx!=null)_targetAngle=Math.atan2(ty-y,tx-x);
    }
  }catch(e){}
  // 회전 보간: 최단 경로 + 5배 느린 turnSpeed
  if(u._drawAngle==null)u._drawAngle=_targetAngle;
  let _da=_targetAngle-u._drawAngle;
  while(_da>Math.PI)_da-=Math.PI*2;
  while(_da<-Math.PI)_da+=Math.PI*2;
  u._drawAngle+=_da*0.0004;  // 사용자 요청: 10배 빠르게 (0.00004→0.0004)
  if(cached&&cached!=='ERR'&&cached.complete&&cached.naturalWidth>0){
    ctx.save();
    ctx.globalAlpha=alpha;
    // 자연 비율 유지: 높이 기준으로 스케일, 최대 너비 dsz.w*2.8 제한
    const nat=cached.naturalWidth/Math.max(1,cached.naturalHeight);
    const dh=dsz.h*2;
    const dw=Math.min(dsz.w*2.8, dh*nat);
    // 사용자 요청 (2026-06-06): 적 함선이 회전 시 상하 뒤집혀 표시되는 현상 완전 차단.
    //   접근: 회전 보간을 제거하고, 적은 항상 X축 미러로 좌측을 향함(노즈 좌측), 아군은 미러 없이 우측 향함.
    //   ※ 단순 미러는 ship sprite의 "위/아래"를 절대 뒤집지 않으므로 상하 반전 현상이 원천 차단된다.
    ctx.translate(x,y);
    if(isEnemy){
      ctx.scale(-1,1);  // 좌측 향하게 수평 미러만 적용 — 회전 없음
    }
    ctx.drawImage(cached,-dw/2,-dh/2,dw,dh);
    ctx.restore();
  } else {
    _drawShipVector(ctx,x,y,dsz,isEnemy,col,alpha,u._drawAngle);
    if(!cached)_loadCombatImg(imgSrc,function(){if(typeof drawCombatFrame==='function')drawCombatFrame();});
  }
  // 쉴드 오라: SH>0이고 살아있는 함선만. SH%에 따라 강도 조절 + 미세 펄스.
  // 사용자 요청: 투명도 20% 낮춤(곱 0.8) + 입체감 — 3중 그라데이션(외곽 글로우 → 본체 → 빛반사 하이라이트)
  if(u.hp>0&&(u.sh||0)>0&&(u.maxSH||0)>0){
    const shR=clamp((u.sh||0)/(u.maxSH||1),0.1,1);
    const pulse=0.85+0.15*Math.sin(Date.now()*0.005);
    const rx=dsz.w*1.12, ry=dsz.h*1.07;
    const A=0.8;  // 전체 알파 곱 (사용자 요청 ×0.8 — 투명도 20% 더 낮춤)
    ctx.save();
    ctx.translate(x,y);
    // ① 외곽 글로우 (가장 옅은 청록빛 후광 — 입체 1층)
    const gOuter=ctx.createRadialGradient(0,0,rx*0.4,0,0,rx*1.25);
    gOuter.addColorStop(0,'rgba(102,221,255,0)');
    gOuter.addColorStop(0.55,'rgba(102,221,255,0.10)');
    gOuter.addColorStop(1,'rgba(102,221,255,0)');
    ctx.globalAlpha=0.20*shR*pulse*A;
    ctx.fillStyle=gOuter;
    ctx.shadowColor='#66ddff';ctx.shadowBlur=18;
    ctx.beginPath();ctx.ellipse(0,0,rx*1.18,ry*1.18,0,0,Math.PI*2);ctx.fill();
    // ② 본체 — 라디얼 그라데이션 (중심 짙음 → 외곽 fade)
    const gBody=ctx.createRadialGradient(-rx*0.25,-ry*0.3,rx*0.15,0,0,rx);
    gBody.addColorStop(0,'rgba(180,235,255,0.45)');     // 좌상단 하이라이트
    gBody.addColorStop(0.45,'rgba(102,221,255,0.20)');
    gBody.addColorStop(1,'rgba(60,170,230,0.05)');
    ctx.globalAlpha=0.16*shR*pulse*A;
    ctx.fillStyle=gBody;
    ctx.shadowBlur=8;
    ctx.beginPath();ctx.ellipse(0,0,rx,ry,0,0,Math.PI*2);ctx.fill();
    // ③ 외곽 라인 (실드 가장자리 헥사 느낌 — 약간 진하게)
    ctx.globalAlpha=0.55*shR*pulse*A;
    ctx.strokeStyle='#9ee7ff';
    ctx.lineWidth=1.6;
    ctx.shadowBlur=10;
    ctx.beginPath();ctx.ellipse(0,0,rx,ry,0,0,Math.PI*2);ctx.stroke();
    // ④ 좌상단 빛반사 호 (입체감 — 작은 흰빛 아크)
    ctx.globalAlpha=0.42*shR*pulse*A;
    ctx.strokeStyle='rgba(220,245,255,0.9)';
    ctx.lineWidth=1.2;
    ctx.shadowBlur=4;
    ctx.beginPath();
    ctx.ellipse(0,0,rx*0.94,ry*0.92,0,Math.PI*1.05,Math.PI*1.55);
    ctx.stroke();
    ctx.restore();
  }
}
// ═══ 누락 함수 복구 패치 ════════════════════════════════════════════

// ── 전투 상태 변수 ────────────────────────────────────────────────
let _cbEffects=[];  // [{type,...}] beam / exp / shard / shockwave / muzzle
let _unitPos={};    // {unitId: {x,y}}
let _cbAnimReq=null;

// 전투 중이거나 이펙트가 살아있는 동안 60fps 루프로 캔버스 재그리기.
// (쉴드 오라 펄스 + 이펙트 페이드를 위해 전투 중에는 계속 돌림.)
function _cbStartAnimLoop(){
  // 기존 루프 정합성 검증 — 캔버스가 DOM에서 분리되었으면 stale 루프이므로 강제 재시작
  if(_cbAnimReq){
    if(cbCV&&document.body.contains(cbCV))return;  // 기존 루프 유효 — 그대로 둠
    try{cancelAnimationFrame(_cbAnimReq);}catch(e){}
    _cbAnimReq=null;
  }
  // 30fps 다운샘플링 — 이펙트가 적을 때 매 프레임이 아니라 격프레임으로 그려 CPU 절약
  // 이펙트가 50개 미만이고 모든 이펙트가 페이드 단계(life<maxLife/2)일 때만 적용.
  // 다이내믹한 폭발·번개가 살아 있을 땐 60fps 유지 → 시각 품질 보존.
  let _skipToggle=false;
  const tick=()=>{
    if(!cbCtx||!cbCV){_cbAnimReq=null;return;}
    const _effs=_cbEffects||[];
    const _calm=_effs.length<50&&_effs.every(e=>!e||(e.life||0)<((e.maxLife||1)/2));
    if(_calm){
      _skipToggle=!_skipToggle;
      if(_skipToggle){_cbAnimReq=requestAnimationFrame(tick);return;}
    }
    drawCombatFrame();
    if((combatState&&!combatState.done)||(_cbEffects||[]).length>0){
      _cbAnimReq=requestAnimationFrame(tick);
    } else {
      _cbAnimReq=null;
    }
  };
  _cbAnimReq=requestAnimationFrame(tick);
}

// 빔 한 발 + 피격 + (필요 시) 격침 폭발/파편
// delay: 발사 시작까지 대기 프레임 수 (순차 발사용)
// wasShielded: 피격 시점에 타겟의 쉴드가 살아있었는지 (true면 헥사 임팩트)
// 데미지 텍스트 — 피격 시 함선 위로 떠오르는 숫자
//   사용자 요청 (2026-06-06 갱신):
//     · 폰트 ×2 (16 → 32px), 투명도 90%로 가독성 강화
//     · 데미지: 빨강 #ff3333 / 회복: 파랑 #3399ff (_cbAddHealText)
//     · 0.2s(12프레임) 동안 아래→위로 페이드인·피크·페이드아웃
function _cbAddDmgText(pos,rawDmg,shDmg,delay){
  if(!pos||!(rawDmg>0))return;
  _cbEffects.push({
    type:'dmgText',
    x:pos.x,
    y:pos.y-28,
    txt:'-'+Math.round(rawDmg),
    col:'#ff3333',                  // 피해: 빨강 (쉴드/HP 구분 없이 통일)
    life:12,maxLife:12,
    delay:Math.max(0,delay||0)
  });
}
// 회복 텍스트 — 아군 자가수리/흡혈 등 HP·실드 회복 시 함선 위로 +N 표시
function _cbAddHealText(pos,healAmt,delay){
  if(!pos||!(healAmt>0))return;
  _cbEffects.push({
    type:'dmgText',                 // 동일 이펙트 타입 재사용 (렌더 로직 공유)
    x:pos.x,
    y:pos.y-28,
    txt:'+'+Math.round(healAmt),
    col:'#3399ff',                  // 회복: 파랑
    life:12,maxLife:12,
    delay:Math.max(0,delay||0)
  });
}
function _cbAddBeamAndHit(a1,a2,beamCol,isDead,delay,wasShielded){
  delay=delay||0;
  // 클로저로 현재 combatState 캡처 — 전투 종료 후엔 SFX 발화 안 함
  const _cs=combatState;
  const _sfxOk=()=>_cs&&!_cs.done;
  // 발사 사운드 (delay 프레임 후, 1프레임≈16ms)
  setTimeout(()=>{if(!_sfxOk())return;try{AudioMgr.playSfx('laser_fire',{vol:0.55,cooldown:40});}catch(e){}},delay*16);
  // 피격 사운드: 빔 도달 시점(delay+3프레임), 쉴드 vs 폭발
  const hitMs=(delay+3)*16;
  if(wasShielded){setTimeout(()=>{if(!_sfxOk())return;try{AudioMgr.playSfx('shield_hit',{vol:0.55,cooldown:40});}catch(e){}},hitMs);}
  if(isDead){setTimeout(()=>{if(!_sfxOk())return;try{AudioMgr.playSfx('explosion',{vol:0.75,cooldown:80});}catch(e){}},(delay+5)*16);}
  // 아군 레이저 두께 배율 — 특수공격 단계마다 ×1.5씩 누적
  // 일점사 ×1.5, 학익진 ×2.25, 시간차 ×3.38, 테슬라 ×5.06, 제네시스 ×7.59, 데스티네이션 ×11.39
  // ※ 아군 색상: 평시 #00f3ff (청록), 데스티네이션 발동 시 #ff44ff (핑크/퍼플)
  const _isPlayerBeam=combatState&&(beamCol==='#00f3ff'||beamCol==='#ff44ff');
  let thickMul=1;
  if(_isPlayerBeam){
    if(combatState._sunsinUsed)     thickMul*=1.5;
    if(combatState._haikjinUsed)    thickMul*=1.5;
    if(combatState._einsteinUsed)   thickMul*=1.5;
    if(combatState._teslaUsed)      thickMul*=1.5;
    if(combatState._genesisUsed)    thickMul*=1.5;
    if(combatState._destinationUsed)thickMul*=1.5;
  }
  // 1) 머즐 플래시 (두께 배율에 맞춰 플래시도 확장)
  _cbEffects.push({type:'muzzle',x:a1.x,y:a1.y,col:beamCol,r:8*Math.min(4,Math.sqrt(thickMul)),life:8,maxLife:8,delay:delay});
  // 2) 레이저 빔 — 테슬라 초공간 발동 이후 아군 공격은 번개(lightning)로 시각화
  const _useLightning=combatState&&combatState._teslaUsed&&_isPlayerBeam;
  if(_useLightning){
    // 번개: 지그재그 코어 + 양 옆 가지(fork) 분기
    _cbEffects.push({type:'lightning',x1:a1.x,y1:a1.y,x2:a2.x,y2:a2.y,col:beamCol,life:14,maxLife:14,delay:delay,thickMul:thickMul,seed:Math.random()*9999});
  } else {
    _cbEffects.push({type:'beam',x1:a1.x,y1:a1.y,x2:a2.x,y2:a2.y,col:beamCol,life:18,maxLife:18,delay:delay,thickMul:thickMul});
  }
  // 3) 쉴드 피격 헥사 플래시 (쉴드가 살아있을 때만)
  if(wasShielded){
    _cbEffects.push({type:'shieldHit',x:a2.x,y:a2.y,col:'#66ddff',r:26,life:16,maxLife:16,delay:delay+3});
  }
  // 4) 선체 피격 폭발 (쉴드가 뚫렸을 때 강도↑)
  const expCol=isDead?'#ff3300':(wasShielded?'#ffaa66':'#ff7755');
  const expR=isDead?28:(wasShielded?12:18);
  _cbEffects.push({type:'exp',x:a2.x,y:a2.y,col:expCol,r:expR,life:isDead?36:24,maxLife:isDead?36:24,delay:delay+4});
  if(isDead){
    _cbEffects.push({type:'shockwave',x:a2.x,y:a2.y,col:'#ffaa44',r:50,life:30,maxLife:30,delay:delay+4});
    _cbEffects.push({type:'exp',x:a2.x,y:a2.y,col:'#ffffff',r:14,life:14,maxLife:14,delay:delay+4});
    for(let i=0;i<10;i++){
      const ang=(Math.PI*2*i)/10 + Math.random()*0.3;
      _cbEffects.push({type:'shard',x:a2.x,y:a2.y,vx:Math.cos(ang)*3.8,vy:Math.sin(ang)*3.8,col:'#ffcc66',life:42,maxLife:42,delay:delay+4});
    }
  }
  _cbStartAnimLoop();
}

// 미사일 살보 (최대 13발). 각 미사일은 곡선 궤적으로 날아가 타겟에서 폭발.
// count: 1~13, 자동으로 클램프됨
function _cbAddMissileSalvo(a1,a2,salvoCol,isDead,count,baseDelay,wasShielded,sizeMul){
  // 사용자 명세: 기본 1발, 전설·신화 미사일은 최대 4발까지 다양한 곡선으로 발사
  count=clamp(count|0,1,4);
  baseDelay=baseDelay||0;
  sizeMul=Math.max(1,sizeMul||1);
  // 클로저로 현재 combatState 캡처 — 전투 종료 후엔 SFX 발화 안 함
  const _cs=combatState;
  const _sfxOk=()=>_cs&&!_cs.done;
  // 살보 발사 사운드 (한 번)
  setTimeout(()=>{if(!_sfxOk())return;try{AudioMgr.playSfx('missile',{vol:0.6,cooldown:60});}catch(e){}},baseDelay*16);
  // 미사일은 약 60프레임에 걸쳐 도달 → 살보의 마지막이 도착하는 시점에 충돌 sfx
  const lastImpactMs=(baseDelay + (count-1)*3 + 50)*16;
  if(wasShielded){setTimeout(()=>{if(!_sfxOk())return;try{AudioMgr.playSfx('shield_hit',{vol:0.6,cooldown:80});}catch(e){}},lastImpactMs);}
  if(isDead){setTimeout(()=>{if(!_sfxOk())return;try{AudioMgr.playSfx('explosion',{vol:0.8,cooldown:80});}catch(e){}},lastImpactMs+50);}
  for(let i=0;i<count;i++){
    const stagger=baseDelay + i*4; // 미사일 사이 4프레임 (살짝 더 분명한 발사 텀)
    // 다양한 곡선 (사용자 요청) — 부채꼴 + 위/아래 교차 호 + 약간 랜덤 지터
    const spread=(i-(count-1)/2)*22;  // 직전 8 → 22 (3배 더 넓게 퍼짐)
    const _archDir=(i%2===0)?-1:1;     // 짝수 미사일은 위 호, 홀수는 아래 호 — 시각적 다양성
    const _archBase=70+i*10;            // 미사일마다 호 높이 다르게
    const _jx=(Math.random()-0.5)*16;   // 가로 지터 ±8
    const _jy=(Math.random()-0.5)*20;   // 세로 지터 ±10
    const midx=(a1.x+a2.x)/2 + spread + _jx;
    const midy=(a1.y+a2.y)/2 + _archDir*(_archBase+Math.abs(spread)*0.3) + _jy;
    const isLast=(i===count-1);
    _cbEffects.push({type:'muzzle',x:a1.x,y:a1.y,col:salvoCol,r:6*sizeMul,life:6,maxLife:6,delay:stagger});
    _cbEffects.push({
      type:'missile', x1:a1.x,y1:a1.y, x2:a2.x,y2:a2.y, ctrlx:midx,ctrly:midy,
      t:0, speed:0.045, col:salvoCol, life:60, maxLife:60, delay:stagger,
      isLastInSalvo:isLast, isDead:isDead, wasShielded:wasShielded, sizeMul:sizeMul
    });
  }
  _cbStartAnimLoop();
}

// ── 전투 로그 ────────────────────────────────────────────────────
function addCombatLog(msg,cls){
  if(!combatState)return;
  combatState.log.push({msg,cls});
  if(combatState.log.length>200)combatState.log.splice(0,combatState.log.length-200);
  const el=document.getElementById('cb-log');
  if(!el)return;
  // ── 팝업 카드 ─────────────────────────────────────────────
  //  · 우측 세로 컬럼에 새 항목이 위에서 등장 → 5초 후 페이드 → 자동 제거
  //  · column-reverse 컨테이너 + appendChild → 시각적으로 항상 상단 등장
  const card=document.createElement('div');
  const _bg=cls==='err'?'rgba(255,60,60,.18)':cls==='ok'?'rgba(80,200,120,.18)':cls==='gold'?'rgba(255,215,0,.18)':cls==='warn'?'rgba(255,165,0,.18)':'rgba(40,55,80,.85)';
  const _bd=cls==='err'?'#ff6b6b':cls==='ok'?'#51cf66':cls==='gold'?'#ffd43b':cls==='warn'?'#ffa726':'rgba(0,243,255,.35)';
  const _fg=cls==='err'?'#ffb3b3':cls==='ok'?'#a8e6b6':cls==='gold'?'#ffe082':cls==='warn'?'#ffcc80':'#dee2e6';
  card.style.cssText=`background:${_bg};border-left:2px solid ${_bd};color:${_fg};font-size:9px;line-height:1.4;padding:5px 7px;border-radius:4px;word-break:keep-all;backdrop-filter:blur(2px);box-shadow:0 2px 6px rgba(0,0,0,.4);opacity:0;transform:translateX(20px);transition:opacity .25s ease, transform .25s ease;pointer-events:auto;flex-shrink:0`;
  card.textContent=msg;
  el.appendChild(card);
  // slide-in
  requestAnimationFrame(()=>{card.style.opacity='1';card.style.transform='translateX(0)';});
  // DOM 노드 12개 캡 (가장 오래된 부터 제거)
  while(el.children.length>12){el.removeChild(el.firstChild);}
  // 5초 후 자동 페이드아웃 → 제거
  setTimeout(()=>{
    if(!card.parentNode)return;
    card.style.opacity='0';
    card.style.transform='translateX(20px)';
    setTimeout(()=>{if(card.parentNode)card.parentNode.removeChild(card);},300);
  },5000);
}

// ── 오디오 매니저 (BGM + SFX) ────────────────────────────────────
window.AudioMgr=(function(){
  const SFX_BASE='02_Assets/audio/sfx/';
  const BGM_BASE='02_Assets/audio/bgm/';
  let masterVol=0.7,bgmVol=0.6,sfxVol=0.8;
  let bgmOff=false,sfxOff=false; // 개별 끄기 토글
  try{
    const s=JSON.parse(localStorage.getItem('de_audio_settings')||'{}');
    if(typeof s.master==='number')masterVol=s.master;
    if(typeof s.bgm==='number')bgmVol=s.bgm;
    if(typeof s.sfx==='number')sfxVol=s.sfx;
    if(typeof s.bgmOff==='boolean')bgmOff=s.bgmOff;
    if(typeof s.sfxOff==='boolean')sfxOff=s.sfxOff;
    // 구버전 호환: muted 플래그가 있으면 BGM/SFX 모두 켜기
    if(typeof s.muted==='boolean'&&s.muted){bgmOff=true;sfxOff=true;}
  }catch(e){}
  function save(){try{localStorage.setItem('de_audio_settings',JSON.stringify({master:masterVol,bgm:bgmVol,sfx:sfxVol,bgmOff,sfxOff}));}catch(e){}}
  let curBgmName=null,curBgmAudio=null,userInteracted=false,pendingBgm=null;
  const _INTERACT_EVENTS=['click','keydown','touchstart','pointerdown'];
  function _onInteract(){
    if(userInteracted)return;
    userInteracted=true;
    // 첫 상호작용 후 4개 리스너 즉시 해제 (장시간 플레이 시 document 리스너 누적 방지)
    _INTERACT_EVENTS.forEach(ev=>{
      try{document.removeEventListener(ev,_onInteract,{capture:true});}catch(e){}
    });
    if(pendingBgm){playBgm(pendingBgm);pendingBgm=null;}
    else if(curBgmAudio&&curBgmAudio.paused&&!bgmOff)curBgmAudio.play().catch(()=>{});
  }
  _INTERACT_EVENTS.forEach(ev=>{
    document.addEventListener(ev,_onInteract,{capture:true,passive:true});
  });
  function _bgmTargetVol(){return bgmOff?0:masterVol*bgmVol;}
  function playBgm(name){
    if(!name){stopBgm();return;}
    if(bgmOff){
      // BGM 꺼진 상태: 곡 이름만 기억해 두고 재생하지 않음
      if(curBgmAudio){try{curBgmAudio.pause();curBgmAudio.src='';}catch(e){}curBgmAudio=null;}
      curBgmName=name;return;
    }
    if(!userInteracted){pendingBgm=name;curBgmName=name;return;}
    if(curBgmName===name&&curBgmAudio&&!curBgmAudio.paused)return;
    // 이전 BGM은 즉시 무음화 + 정지 후 새 BGM 시작 → 행성 BGM과 전투 BGM이 겹치지 않음
    if(curBgmAudio){
      const old=curBgmAudio;
      try{old.volume=0;old.pause();old.src='';}catch(e){}
    }
    curBgmAudio=null;
    curBgmName=name;
    // BGM 캐시 버스터: 게임 버전과 함께 fetch — Firebase mp3 캐시(24h)가 옛 버전 잡고 있을 때 강제 갱신
    const _bgmVer=(typeof window!=='undefined'&&window._GAME_VER)?window._GAME_VER:'';
    const a=new Audio(BGM_BASE+name+'.mp3'+(_bgmVer?'?v='+encodeURIComponent(_bgmVer):''));
    a.loop=true;a.volume=0;
    curBgmAudio=a;
    a.play().then(()=>{
      let st=0;const target=_bgmTargetVol();
      const fadeIn=setInterval(()=>{st++;if(!curBgmAudio||curBgmAudio!==a){clearInterval(fadeIn);return;}a.volume=Math.min(target,target*(st/8));if(st>=8)clearInterval(fadeIn);},40);
    }).catch(e=>{console.warn('[BGM] play failed',name,e.message);});
  }
  function stopBgm(){if(curBgmAudio){try{curBgmAudio.pause();curBgmAudio.src='';}catch(e){}}curBgmAudio=null;curBgmName=null;pendingBgm=null;}
  const sfxCooldown={};
  const _activeSfx=new Set();  // 재생 중 인스턴스 추적 (stopAllSfx 용)
  // ── SFX Audio 풀링 (메모리 누수 방지) ──────────────────────────────
  //   사용자 보고: 전투 도중 RAM 폭증 → Chrome 'Aw, Snap!' 크래시.
  //   원인: 매 playSfx 호출마다 new Audio() 생성 → mp3 디코드 파이프라인이
  //         GC보다 빨리 적재되어 렌더러 프로세스 OOM.
  //   대책: 8개짜리 인스턴스 풀을 미리 만들어 재사용 (LRU 라운드로빈).
  //         같은 src 재할당 시 Chrome은 디코드 결과를 캐시하여 추가 메모리 사용 0.
  const _MAX_SFX_POOL=6;  // 다운 재보고 (2026-06-06) 후 8→6
  const _sfxPool=new Array(_MAX_SFX_POOL).fill(null).map(()=>{const a=new Audio();a.preload='none';return a;});
  let _sfxIdx=0;
  function playSfx(name,opts){
    opts=opts||{};
    if(sfxOff||masterVol<=0||sfxVol<=0)return;
    if(!userInteracted)return;
    const cd=opts.cooldown||0;
    if(cd>0){const now=performance.now();if(sfxCooldown[name]&&now-sfxCooldown[name]<cd)return;sfxCooldown[name]=now;}
    try{
      const _sfxVer=(typeof window!=='undefined'&&window._GAME_VER)?window._GAME_VER:'';
      const a=_sfxPool[_sfxIdx];
      _sfxIdx=(_sfxIdx+1)%_MAX_SFX_POOL;
      try{a.pause();}catch(e){}
      a.src=SFX_BASE+name+'.mp3'+(_sfxVer?'?v='+encodeURIComponent(_sfxVer):'');
      a.currentTime=0;
      a.volume=Math.min(1,(opts.vol||1)*masterVol*sfxVol);
      _activeSfx.add(a);
      a.play().catch(()=>{_activeSfx.delete(a);});
    }catch(e){}
  }
  // 진행 중인 모든 SFX 즉시 정지 (전투 종료 / 엔딩 진입 시 호출)
  function stopAllSfx(){
    _activeSfx.forEach(a=>{try{a.pause();a.src='';}catch(e){}});
    _activeSfx.clear();
  }
  function setMaster(v){masterVol=clamp(+v||0,0,1);if(curBgmAudio)curBgmAudio.volume=_bgmTargetVol();save();}
  function setBgmVol(v){bgmVol=clamp(+v||0,0,1);if(curBgmAudio)curBgmAudio.volume=_bgmTargetVol();save();}
  function setSfxVol(v){sfxVol=clamp(+v||0,0,1);save();}
  function setBgmOff(off){
    bgmOff=!!off;save();
    if(bgmOff){
      // 끄기: 즉시 정지
      if(curBgmAudio){try{curBgmAudio.pause();}catch(e){}}
    } else {
      // 켜기: 마지막 BGM 곡 재생
      if(curBgmName){
        const name=curBgmName;
        if(curBgmAudio&&curBgmAudio.src&&curBgmAudio.src.indexOf(name)>=0){
          curBgmAudio.volume=_bgmTargetVol();
          curBgmAudio.play().catch(()=>{});
        } else {
          // 새로 재생
          curBgmName=null; // playBgm이 변화 감지하도록
          playBgm(name);
        }
      }
    }
  }
  function setSfxOff(off){sfxOff=!!off;save();}
  // 구버전 호환
  function setMuted(m){setBgmOff(m);setSfxOff(m);}
  return{
    playBgm,stopBgm,playSfx,stopAllSfx,setMaster,setBgmVol,setSfxVol,setBgmOff,setSfxOff,setMuted,
    get curBgm(){return curBgmName;},
    get master(){return masterVol;},get bgm(){return bgmVol;},get sfx(){return sfxVol;},
    get bgmOff(){return bgmOff;},get sfxOff(){return sfxOff;},
    get muted(){return bgmOff&&sfxOff;}
  };
})();

// 행성 BGM: P0X.mp3 가 있으면 해당 곡, 없으면 hub.mp3
function _planetBgmName(pid){
  // P17(TOI-700d, 치크스) 전용 BGM 파일이 누락 → 같은 치크스 팩션 행성 P18 BGM 으로 폴백
  //  (이전 'hub' 폴백은 치크스 분위기와 맞지 않아 변경 — 사용자 보고)
  if(pid==='P17')return 'P18';
  if(/^P\d+$/.test(pid||''))return pid;
  return 'hub';
}

// 사운드 알림 (전투 진입/긴급 알림)
function sfxAlert(){AudioMgr.playSfx('notify',{cooldown:300});}

// ══════════════════════════════════════════════════════════════════
// 획득 보고 팝업 — js/modules/report-popup.js 로 분할됨 (2026-06-08)
//   · 모듈에서 window.showAcquisitionReport 와 window.RARITY_COLOR 노출
//   · 여기서는 호환성용 로컬 별칭만 유지 (다른 함수가 RARITY_COLOR 직접 참조)
// ══════════════════════════════════════════════════════════════════
const RARITY_COLOR=window.RARITY_COLOR||{N:'#888',R:'var(--blue)',H:'var(--purple)',L:'var(--gold)',S:'#ff6ec7',legend:'var(--gold)',mythic:'#ff88ff',set:'#c080ff',hero:'var(--purple)'};
// 퀘스트 보상 수령
function sfxCoin(){AudioMgr.playSfx('coin');}

// ── 전투 프레임 렌더링 ────────────────────────────────────────────
// 전투 배경(그라데이션 + 80 별) 오프스크린 캐시 — 매 프레임 재생성 대신 1회 그리고 drawImage 만
//  · key: W×H×seed — 화면 크기/배틀 변경 시 자동 무효화
//  · 별 좌표가 seed 기반 결정론이라 시각적 동일 (사용자가 차이를 알 수 없음)
let _cbBgCache=null;
function _ensureCombatBg(W,H,seed){
  const key=W+'x'+H+'_'+seed;
  if(_cbBgCache&&_cbBgCache.key===key)return _cbBgCache.cv;
  const oc=document.createElement('canvas');oc.width=W;oc.height=H;
  const oct=oc.getContext('2d');
  const bg=oct.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,'#050a1a');bg.addColorStop(1,'#0a1428');
  oct.fillStyle=bg;oct.fillRect(0,0,W,H);
  for(let i=0;i<80;i++){
    const sx=((seed*i*137+i*31)%W);const sy=((seed*i*97+i*53)%H);
    const sr=((i%5)*0.3+0.2);const sa=(0.3+(i%7)*0.1);
    oct.globalAlpha=sa;oct.fillStyle='#ffffff';
    oct.beginPath();oct.arc(sx,sy,sr,0,Math.PI*2);oct.fill();
  }
  oct.globalAlpha=1;
  _cbBgCache={key,cv:oc};
  return oc;
}
function drawCombatFrame(){
  if(!cbCtx||!cbCV||!combatState)return;
  const W=cbCV.width,H=cbCV.height;
  const z=cbZoom,ox=cbOffX,oy=cbOffY;
  // 배경 — 캐시된 오프스크린 캔버스를 한 번에 drawImage
  const seed=combatState._rndSeed||1234;
  cbCtx.drawImage(_ensureCombatBg(W,H,seed),0,0);

  cbCtx.save();
  cbCtx.translate(W/2+ox,H/2+oy);cbCtx.scale(z,z);

  const pl=combatState.players||[];
  const en=combatState.enemies||[];
  // ── 직사각형 함대 배치 (편대) ──
  // 함대를 rows×cols 격자에 정렬. 셀 간격은 함선 크기에 비례(로컬 좌표) →
  // ctx.scale(z) 에 의해 자연스럽게 줌과 함께 간격도 확대된다.
  function _fleetLayout(units,isEnemy,W,H,z){
    if(!units.length)return[];
    const sizes=units.map(u=>isEnemy?_enemySize(u):_shipDrawSize(u));
    // 보스 본 함은 호위함보다 ~3배 크지만 셀 간격은 호위함 기준으로 계산해야 격자가 너무 벌어지지 않음.
    // (보스는 자기 셀보다 시각적으로 크게 그려져 호위함을 약간 가리며 압도감 연출)
    const nonBossSizes=units.map((u,i)=>({u,s:sizes[i]})).filter(({u})=>{const _nm=(u.nm||'').toLowerCase();return !(isEnemy&&(u.id==='BOSS_MAIN'||_nm.includes('우르사')||_nm.includes('ursa')));});
    const baseSizes=nonBossSizes.length?nonBossSizes.map(x=>x.s):sizes;
    const maxW=Math.max(...baseSizes.map(s=>s.w));
    const maxH=Math.max(...baseSizes.map(s=>s.h));
    const n=units.length;
    // ── 사용자 요청: 적 함대 진형 랜덤 변형 (구형/삼각형) — 아군 향한 화살표 방향 삼각형 ──
    //  · 전투당 1회 결정 (combatState._enemyFormation), 진형은 유지하되 위치만 lerp로 이동
    //  · circle: 원형 클러스터 (방어형)  /  triangle: 아군 방향 화살촉 (공격형)
    if(isEnemy&&!units.some(u=>typeof u._formationCol==='number')&&!units.some(u=>u._isBlackHoleFleet)){
      if(!combatState._enemyFormation){
        combatState._enemyFormation=Math.random()<0.5?'circle':'triangle';
      }
      const formation=combatState._enemyFormation;
      const cellW=maxW*1.5, cellH=maxH*1.55;
      // 적 함대 중심점 — 화면 우측 60% 부근
      const cxA=W*0.30, cyA=0;
      const out=new Array(n);
      if(formation==='circle'){
        // 구형 — 동심원 클러스터 (반경 = sqrt(n)*cellH 기준, 균등 각도 분배)
        const R0=Math.max(cellH*1.5,Math.sqrt(n)*cellH*0.9);
        units.forEach((u,i)=>{
          if(n===1){out[i]={x:cxA,y:cyA};return;}
          const ang=(i+0.5)*(Math.PI*2/n)-Math.PI*0.5;
          // 내·외 2층 분포: 짝수 인덱스 외층, 홀수 내층
          const r=(i%2===0)?R0:R0*0.55;
          out[i]={x:cxA+r*Math.cos(ang)*0.7,y:cyA+r*Math.sin(ang)};
          u._frontRank=Math.floor(i/Math.max(1,n/3));  // 앞·중·뒤 그룹
        });
      } else {
        // 삼각형 — 아군 향한 화살촉(◀): 정점이 좌측(-X), 후방이 우측
        //   행 r 마다 (r+1)대씩 → 1, 2, 3, 4… 늘어남
        //   r=0(정점/선봉)이 -X로 가장 멀리, r 커질수록 +X 후방
        let rowI=0,remaining=n,rowsList=[];
        while(remaining>0){rowI++;const take=Math.min(rowI,remaining);rowsList.push(take);remaining-=take;}
        let idx=0;
        rowsList.forEach((cnt,r)=>{
          const colH=(cnt-1)*cellH;
          for(let c=0;c<cnt;c++){
            out[idx]={x:cxA-cellW*1.2+r*cellW*0.9,y:c*cellH-colH/2};
            units[idx]._frontRank=r;  // r=0이 가장 앞(선봉)
            idx++;
          }
        });
      }
      return out;
    }
    // ── 우르사 최종전 진형: _formationCol(0~3)로 열 고정 (소형/중형/친위대/보스) ──
    if(isEnemy&&units.some(u=>typeof u._formationCol==='number')){
      const COLS=4;
      const byCol=[[],[],[],[]];
      units.forEach((u,i)=>{const c=clamp(u._formationCol||0,0,3);byCol[c].push(i);});
      const cw=maxW*1.5, ch=maxH*1.55;
      const xA=W*0.18;
      const out=new Array(n);
      for(let c=0;c<COLS;c++){
        const arr=byCol[c];
        const colH=(arr.length-1)*ch;
        arr.forEach((ui,ri)=>{
          units[ui]._frontRank=c;       // 앞열(소형 c=0)일수록 우선 타겟 / 보스(c=3)는 최후
          units[ui]._fleetCols=COLS;
          units[ui]._fleetCol=c;
          out[ui]={x:xA + c*cw, y:ri*ch - colH/2};
        });
      }
      return out;
    }
    function _seedRng(seed){let s=seed>>>0||1;return()=>{s=(s*1664525+1013904223)>>>0;return s/0x100000000;};}
    function _tankiness(u){
      return (+u.maxHP||+u.hp||1)+(+u.DEF||0)*8+(+u.maxSH||0)*0.6+(+u.armorTier||0)*30+(+u.shieldTier||0)*15;
    }
    // 사용자 매뉴얼 편성: 6열×8행 그리드 사용 (사용자 요청 2026-06-16, slot=col*8+row)
    const manual=!isEnemy?(G&&G.fleetFormation):null;
    const hasManual=manual&&typeof manual==='object'&&Object.keys(manual).length>0;
    // 블랙홀 미러 함대(5척 신화) — 1열 5행으로 좁게 보이지 않도록 가로 펼침 모드
    const _isWideFleet=isEnemy&&units.some(u=>u&&u._isBlackHoleFleet);
    let cols,rows;
    if(hasManual){cols=6;rows=8;}
    else if(_isWideFleet){
      // 가로 펼침: 최대 4열, 행은 필요한 만큼 (5척 → 4열 2행)
      cols=clamp(n,1,4);
      rows=Math.ceil(n/cols);
    }
    else{
      // 1열·2열을 먼저 가득 채우도록 컬럼당 최대 5행을 기본값으로 사용
      // n ≤5: 1열 / n 6-10: 2열 / n 11-15: 3열 / n 16-20: 4열
      const _maxRowsPerCol=5;
      cols=clamp(Math.ceil(n/_maxRowsPerCol),1,4);
      rows=Math.ceil(n/cols);
    }
    // 함선 간격: 겹침 방지를 위해 충분한 여유 확보 (이전 적군 cellW 1.12는 jitter와 결합 시 겹침 유발)
    const cellW=maxW*(isEnemy?1.45:1.7),cellH=maxH*(isEnemy?1.5:1.7);
    // 앵커는 로컬 좌표(=ctx.scale(z) 적용 전). /z 보정을 제거해 줌과 함께 함대 거리도 확대/축소된다.
    // 적군은 화면을 벗어나지 않도록 약간 가깝게 배치 (0.22)
    const _xAnchorMag=W*0.22;
    const totalH=(rows-1)*cellH;
    const totalSlots=cols*rows;
    let slotForIdx;
    if(hasManual){
      slotForIdx=new Array(n).fill(-1);
      const taken=new Set();
      units.forEach((u,i)=>{
        const sl=manual[u.id];
        if(typeof sl==='number'&&sl>=0&&sl<totalSlots&&!taken.has(sl)){slotForIdx[i]=sl;taken.add(sl);}
      });
      // 미배치 함선은 빈 슬롯에 탱크 순으로 자동 채움 (앞열 우선)
      const remainingIdx=units.map((u,i)=>i).filter(i=>slotForIdx[i]<0)
        .sort((a,b)=>_tankiness(units[b])-_tankiness(units[a]));
      let s=0;
      remainingIdx.forEach(i=>{while(s<totalSlots&&taken.has(s))s++;if(s<totalSlots){slotForIdx[i]=s;taken.add(s);s++;}});
    } else {
      const rank=units.map((u,i)=>({i,t:_tankiness(u)})).sort((a,b)=>b.t-a.t).map(x=>x.i);
      slotForIdx=new Array(n);
      rank.forEach((unitIdx,slotIdx)=>{slotForIdx[unitIdx]=slotIdx;});
      // 보스 본 함은 뒤쪽 중앙 슬롯에 강제 배치 — 적 함대의 가장 뒤쪽 가운데
      // 대상: 우르사 메이저(BOSS_MAIN) + 보이드 보스 기함(voidBoss + '팔콘 스카우트 (기함)')
      // 가로 펼침 모드: 블랙팔콘 신화기함도 포함
      if(isEnemy){
        const bossIdx=units.findIndex(u=>{const _nm=(u.nm||'').toLowerCase();return u.id==='BOSS_MAIN'||_nm.includes('우르사')||_nm.includes('ursa')||(u.voidBoss&&(_nm.includes('기함')||_nm.includes('flagship')))||u.id==='VOID_FALCON_1'||(u._isBlackHoleFleet&&(u.catalogId==='BLACKFALCON'||_nm.includes('블랙팔콘')||_nm.includes('black falcon')||_nm.includes('blackfalcon')));});
        if(bossIdx>=0){
          // row-first(가로 펼침): 뒤쪽(row=rows-1) 중앙 cols 위치
          // col-first(기본): 마지막 컬럼 중앙
          const bossSlot=_isWideFleet
            ? Math.min(n-1,(rows-1)*cols+Math.floor((cols-1)/2))
            : (cols-1)*rows+Math.floor((rows-1)/2);
          const curBossSlot=slotForIdx[bossIdx];
          if(curBossSlot!==bossSlot){
            // 보스 슬롯을 차지하고 있던 함선과 교환
            const swapIdx=slotForIdx.findIndex((s,i)=>s===bossSlot&&i!==bossIdx);
            if(swapIdx>=0)slotForIdx[swapIdx]=curBossSlot;
            slotForIdx[bossIdx]=bossSlot;
          }
        }
      }
    }
    // ── 최전열 전멸 시 함대가 안쪽으로 가까워지도록(사거리 소강 방지 시각화) ──
    //   살아있는 최전열 컬럼만큼 앵커를 중앙 쪽으로 이동. 양측이 모두 이동하면 두 함대가 좁혀진다.
    let _minAliveSlotCol=99;
    for(let i=0;i<n;i++){
      if(units[i]&&units[i].hp>0){
        const sl=slotForIdx[i];
        if(sl>=0){const sc=_isWideFleet?(sl%cols):Math.floor(sl/rows);if(sc<_minAliveSlotCol)_minAliveSlotCol=sc;}
      }
    }
    if(_minAliveSlotCol===99)_minAliveSlotCol=0;
    const xAnchor=(isEnemy?+1:-1)*Math.max(W*0.085,_xAnchorMag-_minAliveSlotCol*cellW*0.55);
    // 점유된 행 기준으로 수직 중앙 정렬 — 빈 행까지 포함해 totalH/2로 중앙을 잡으면
    //   (특히 수동 6×8 격자에서 상단 행만 사용 시) 함선이 캔버스 위로 잘리는 문제 발생.
    //   사용자 보고 2026-06-16: "전투 모드 좌측 상단 화면 잘림". 실제 사용 행만으로 중앙을 잡는다.
    let _occMinRow=Infinity,_occMaxRow=-Infinity;
    for(let _k=0;_k<n;_k++){
      const _sl=slotForIdx[_k]; if(_sl<0)continue;
      const _sr=_isWideFleet?Math.floor(_sl/cols):(_sl%rows);
      if(_sr<_occMinRow)_occMinRow=_sr; if(_sr>_occMaxRow)_occMaxRow=_sr;
    }
    if(_occMinRow===Infinity){_occMinRow=0;_occMaxRow=0;}
    const _rowMid=(_occMinRow+_occMaxRow)/2;
    return units.map((u,i)=>{
      const slot=slotForIdx[i];
      if(slot<0){u._frontRank=99;u._fleetCol=99;return{x:xAnchor,y:0};}
      // 가로 펼침 모드는 row-first 매핑: slotCol=slot%cols, slotRow=floor(slot/cols)
      const slotCol=_isWideFleet?(slot%cols):Math.floor(slot/rows);
      const slotRow=_isWideFleet?Math.floor(slot/cols):(slot%rows);
      u._frontRank=slot;
      u._fleetCols=cols;
      u._fleetCol=slotCol;    // 사거리(종심) 계산용 — 열 인덱스(0=최전열)
      const xLocal=xAnchor + (isEnemy?+1:-1)*slotCol*cellW;
      const yLocal=(slotRow-_rowMid)*cellH;   // 점유 행 중앙 정렬 (상단 잘림 방지)
      const idStr=String(u.id||('U'+i));
      let seed=0;for(let k=0;k<idStr.length;k++)seed=(seed*131+idStr.charCodeAt(k))>>>0;
      const rng=_seedRng(seed);
      // jitter는 셀 여유 안에서만 (셀 마진 절반 이내) — 겹침 방지
      const jx=(rng()-0.5)*cellW*0.06;
      const jy=(rng()-0.5)*cellH*0.08;
      return{x:xLocal+jx,y:yLocal+jy};
    });
  }
  const pPos=_fleetLayout(pl,false,W,H,z);
  const ePos=_fleetLayout(en,true,W,H,z);

  // 플레이어 함선
  //   ── 사용자 요청 10배 빠르게 ──
  //   · 학익진 활성: T=0.00016 (0.000016→0.00016)
  //   · 일반 위치 변경: T=0.0008 (0.00008→0.0008)
  const _hjOn=!!(combatState._haikjinFormation);
  // 사용자 요청 (2026-06-06): 진형 이동 중 함선이 완벽 겹침 방지 — 최대 70% 겹침까지만 허용.
  //   각 함선 페어에 대해 중심간 거리 < (각 함선 폭+높이 평균) × 0.3 이면 둘을 외측으로 살짝 밀어냄.
  //   여러 패스를 실행해 다중 충돌도 점진적으로 해소.
  // ※ 매 프레임 60fps × 20척 객체 생성 부담 줄이기 위해 모듈 스코프 풀(_resolvedPool)을 재사용.
  if(!window._resolvedPool)window._resolvedPool=[];
  const _resolved=window._resolvedPool;
  _resolved.length=0;  // 비우되 배열 자체는 보존 → GC 압박 감소
  function _resolveOverlap(){
    for(let _it=0;_it<3;_it++){
      let moved=false;
      for(let a=0;a<_resolved.length;a++){
        for(let b=a+1;b<_resolved.length;b++){
          const A=_resolved[a],B=_resolved[b];
          // 자기 자신 또는 같은 객체 스킵
          const minDx=(A.w+B.w)*0.5*0.30;  // 최소 X 간격 (70% 겹침 허용)
          const minDy=(A.h+B.h)*0.5*0.30;
          const dx=B.x-A.x, dy=B.y-A.y;
          const adx=Math.abs(dx), ady=Math.abs(dy);
          if(adx<minDx && ady<minDy){
            // 더 작은 축 방향으로 밀어내기 (간섭이 적은 방향)
            const pushX=(minDx-adx)*0.5*Math.sign(dx||0.5);
            const pushY=(minDy-ady)*0.5*Math.sign(dy||0.5);
            if(Math.abs(pushX)<Math.abs(pushY)){
              A.x-=pushX; B.x+=pushX;
            } else {
              A.y-=pushY; B.y+=pushY;
            }
            moved=true;
          }
        }
      }
      if(!moved)break;
    }
  }
  pl.forEach((u,i)=>{
    let{x,y}=pPos[i];
    // 위치 lerp 보간 (학익진/일반 무관 모두 부드러운 이동)
    if(u._curX==null){u._curX=x;u._curY=y;}
    if(_hjOn&&u._haikjinTargetX!=null){
      // 학익진 진형 수렴(이동) 속도 — 사용자 요청 2026-06-17: 일반 이동(0.0008)의 50% 속도로 천천히 수렴.
      const T=0.0004;
      u._curX+=(u._haikjinTargetX-u._curX)*T;
      u._curY+=(u._haikjinTargetY-u._curY)*T;
    } else {
      const T=0.0008;  // 일반 이동 — 사용자 요청 10배 빠르게 (0.00008→0.0008)
      u._curX+=(x-u._curX)*T;
      u._curY+=(y-u._curY)*T;
    }
    const sz=_shipDrawSize(u);
    _resolved.push({u,x:u._curX,y:u._curY,w:sz.w*2,h:sz.h*2,isEnemy:false,sz});
  });
  // 적 함선 — 사용자 요청: 동일 10배 빠르게 (회전은 _drawShipUnit에서 처리)
  //   · 적도 아군 향해 회전 — _drawShipUnit이 isEnemy 분기로 가장 가까운 아군 좌표를 타겟으로 atan2 사용
  en.forEach((u,i)=>{
    let{x,y}=ePos[i];
    if(u._curX==null){u._curX=x;u._curY=y;}
    const T=0.0008;  // 0.00008→0.0008
    u._curX+=(x-u._curX)*T;
    u._curY+=(y-u._curY)*T;
    const sz=_enemySize(u);
    _resolved.push({u,x:u._curX,y:u._curY,w:sz.w*2,h:sz.h*2,isEnemy:true,sz});
  });
  // 충돌 해소 — 70% 겹침 한계 강제
  _resolveOverlap();
  // 해소된 위치를 함선에 반영(_curX/_curY로 다음 프레임에도 기억) + 렌더
  _resolved.forEach((r,_idx)=>{
    r.u._curX=r.x; r.u._curY=r.y;
    _unitPos[r.u.id||((r.isEnemy?'E':'P')+_idx)]={x:r.x,y:r.y};
    _drawShipUnit(cbCtx,r.u,r.x,r.y,null);
    _drawHealthBar(cbCtx,r.u,r.x,r.y,r.sz,r.isEnemy);
  });
  // 이펙트 렌더링
  // 타입: beam(레이저 빔) / exp(폭발) / shockwave(충격파 링) / shard(파편)
  //        muzzle(발사 섬광) / missile(곡선 궤적 미사일) / shieldHit(헥사 임팩트)
  // ★ 미사일→폭발 변환 시 filter 콜백 내부에서 새 이펙트가 발생 — _newEffs로 수집해 손실 방지
  const _newEffs=[];
  // ★ 이펙트 다수일 때 shadowBlur 자동 비활성화 — Canvas GPU 가속 무력화 방지
  //   사용자 보고 (2026-06-06): 전투 진행 중 느려지는 현상 — heavyMode 임계 100으로 하향
  //   shadowBlur 가 가장 큰 성능 hog 임. 100 이상이면 즉시 shadowBlur OFF로 fps 보호.
  const _heavyMode=(_cbEffects||[]).length>100;
  if(_heavyMode){
    try{Object.defineProperty(cbCtx,'shadowBlur',{value:0,writable:true,configurable:true});}catch(e){}
  }
  _cbEffects=(_cbEffects||[]).filter(ef=>{
    // 발사 대기 (순차/스태거)
    if(ef.delay&&ef.delay>0){ef.delay--;return true;}
    // 미사일은 t 기반 진행 — life와 별개로 t>=1이면 즉시 폭발로 변환
    if(ef.type==='missile'){
      ef.t+=ef.speed;
      cbCtx.save();
      const _msz=ef.sizeMul||1;
      if(ef.t<1){
        // 2차 Bezier로 위치 계산
        const T=ef.t,U=1-T;
        const px=U*U*ef.x1+2*U*T*ef.ctrlx+T*T*ef.x2;
        const py=U*U*ef.y1+2*U*T*ef.ctrly+T*T*ef.y2;
        const Tp=Math.max(0,T-0.12),Up=1-Tp;
        const ppx=Up*Up*ef.x1+2*Up*Tp*ef.ctrlx+Tp*Tp*ef.x2;
        const ppy=Up*Up*ef.y1+2*Up*Tp*ef.ctrly+Tp*Tp*ef.y2;
        // 꼬리 (연료 분사) — 크기 배율 적용
        cbCtx.strokeStyle=ef.col;cbCtx.lineWidth=3*_msz;
        cbCtx.shadowColor=ef.col;cbCtx.shadowBlur=10*Math.min(3,Math.sqrt(_msz));
        cbCtx.lineCap='round';
        cbCtx.beginPath();cbCtx.moveTo(ppx,ppy);cbCtx.lineTo(px,py);cbCtx.stroke();
        // 머리 (흰 코어) — 크기 배율 적용
        cbCtx.shadowBlur=0;
        cbCtx.fillStyle='#ffffff';
        cbCtx.beginPath();cbCtx.arc(px,py,2.8*_msz,0,Math.PI*2);cbCtx.fill();
        cbCtx.restore();
        return true;
      } else {
        // 타겟 도달 — 폭발 트리거 (크기 배율 적용). _newEffs로 수집 (filter 중 push 손실 방지)
        const ec=ef.isDead?'#ff3300':(ef.wasShielded?'#ffaa66':'#ff7755');
        const er=(ef.isDead?26:(ef.wasShielded?12:18))*_msz;
        _newEffs.push({type:'exp',x:ef.x2,y:ef.y2,col:ec,r:er,life:ef.isDead?36:22,maxLife:ef.isDead?36:22});
        if(ef.wasShielded){
          _newEffs.push({type:'shieldHit',x:ef.x2,y:ef.y2,col:'#66ddff',r:22,life:14,maxLife:14});
        }
        if(ef.isLastInSalvo&&ef.isDead){
          _newEffs.push({type:'shockwave',x:ef.x2,y:ef.y2,col:'#ffaa44',r:50,life:30,maxLife:30});
          _newEffs.push({type:'exp',x:ef.x2,y:ef.y2,col:'#ffffff',r:14,life:14,maxLife:14});
          for(let i=0;i<10;i++){
            const ang=(Math.PI*2*i)/10+Math.random()*0.3;
            _newEffs.push({type:'shard',x:ef.x2,y:ef.y2,vx:Math.cos(ang)*3.8,vy:Math.sin(ang)*3.8,col:'#ffcc66',life:42,maxLife:42});
          }
        }
        cbCtx.restore();
        return false;
      }
    }
    ef.life--;
    const a=Math.max(0,ef.life/ef.maxLife);   // 1 → 0 페이드
    const t=1-a;                              // 0 → 1 진행도
    cbCtx.save();
    if(ef.type==='beam'){
      const tm=ef.thickMul||1;
      // 외곽 글로우 (두께 확장)
      cbCtx.globalAlpha=Math.min(1,a*0.9);
      cbCtx.strokeStyle=ef.col;
      cbCtx.lineWidth=6*a*tm;
      cbCtx.shadowColor=ef.col;
      cbCtx.shadowBlur=20*a*Math.min(3,Math.sqrt(tm));
      cbCtx.lineCap='round';
      cbCtx.beginPath();cbCtx.moveTo(ef.x1,ef.y1);cbCtx.lineTo(ef.x2,ef.y2);cbCtx.stroke();
      // 중심 흰 코어 (두께 확장)
      cbCtx.globalAlpha=Math.min(1,a);
      cbCtx.strokeStyle='#ffffff';
      cbCtx.lineWidth=2*a*tm;
      cbCtx.shadowBlur=0;
      cbCtx.beginPath();cbCtx.moveTo(ef.x1,ef.y1);cbCtx.lineTo(ef.x2,ef.y2);cbCtx.stroke();
    } else if(ef.type==='lightning'){
      // 번개(테슬라 초공간) — 지그재그 + 양옆 가지(fork). 매 프레임 미세 흔들림
      const tm=ef.thickMul||1;
      const seed=ef.seed||1;
      const dx=ef.x2-ef.x1, dy=ef.y2-ef.y1;
      const dist=Math.hypot(dx,dy)||1;
      const nx=-dy/dist, ny=dx/dist;  // 수직 단위벡터 (offset 방향)
      // 지그재그 메인 경로 — 8세그먼트, 각 마디마다 흔들림
      const segs=8;
      const pts=[];
      for(let i=0;i<=segs;i++){
        const t=i/segs;
        const px=ef.x1+dx*t, py=ef.y1+dy*t;
        // 중간 마디는 좌우로 흔들림. 양 끝은 고정
        const wobble=(i===0||i===segs)?0:(Math.sin(seed+i*7.3+a*9)*16);
        pts.push({x:px+nx*wobble, y:py+ny*wobble});
      }
      // 1) 외곽 글로우 (두꺼운 푸른 빛)
      cbCtx.globalAlpha=Math.min(1,a*0.85);
      cbCtx.strokeStyle='#66ddff';
      cbCtx.lineWidth=8*a*tm;
      cbCtx.shadowColor='#66ddff';
      cbCtx.shadowBlur=24*a*Math.min(3,Math.sqrt(tm));
      cbCtx.lineCap='round';
      cbCtx.lineJoin='round';
      cbCtx.beginPath();
      cbCtx.moveTo(pts[0].x,pts[0].y);
      for(let i=1;i<pts.length;i++)cbCtx.lineTo(pts[i].x,pts[i].y);
      cbCtx.stroke();
      // 2) 중심 흰 코어
      cbCtx.globalAlpha=Math.min(1,a);
      cbCtx.strokeStyle='#ffffff';
      cbCtx.lineWidth=2.5*a*tm;
      cbCtx.shadowBlur=0;
      cbCtx.beginPath();
      cbCtx.moveTo(pts[0].x,pts[0].y);
      for(let i=1;i<pts.length;i++)cbCtx.lineTo(pts[i].x,pts[i].y);
      cbCtx.stroke();
      // 3) 가지(fork) — 메인 경로의 각 마디에서 짧은 곁가지 분기 (확률 50%)
      cbCtx.globalAlpha=Math.min(1,a*0.7);
      cbCtx.strokeStyle='#aaeeff';
      cbCtx.lineWidth=Math.max(1,3*a*Math.sqrt(tm));
      cbCtx.shadowColor='#66ddff';
      cbCtx.shadowBlur=12*a;
      for(let i=1;i<segs;i++){
        const r=((seed+i*131)%100)/100;
        if(r<0.5)continue;
        const side=(i%2===0)?1:-1;
        const branchLen=20+(((seed+i*53)%100)/100)*30;
        const bx=pts[i].x + nx*side*branchLen + (Math.random()-0.5)*8;
        const by=pts[i].y + ny*side*branchLen + (Math.random()-0.5)*8;
        cbCtx.beginPath();
        cbCtx.moveTo(pts[i].x,pts[i].y);
        cbCtx.lineTo(bx,by);
        cbCtx.stroke();
      }
      // 4) 시작점/끝점 강한 펄스 (전기 방전 효과)
      cbCtx.shadowBlur=0;
      cbCtx.globalAlpha=Math.min(1,a*0.9);
      cbCtx.fillStyle='#ffffff';
      cbCtx.beginPath();cbCtx.arc(pts[0].x,pts[0].y, 6*Math.sqrt(tm), 0,Math.PI*2);cbCtx.fill();
      cbCtx.fillStyle='#aaeeff';
      cbCtx.beginPath();cbCtx.arc(pts[segs].x,pts[segs].y, 7*Math.sqrt(tm), 0,Math.PI*2);cbCtx.fill();
    } else if(ef.type==='muzzle'){
      // 발사 시 머즐 플래시 — 십자 별 형태
      cbCtx.globalAlpha=Math.min(1,a);
      cbCtx.shadowColor=ef.col;cbCtx.shadowBlur=22*a;
      cbCtx.fillStyle=ef.col;
      cbCtx.beginPath();cbCtx.arc(ef.x,ef.y,ef.r*(1+t*0.3),0,Math.PI*2);cbCtx.fill();
      cbCtx.fillStyle='#ffffff';
      cbCtx.globalAlpha=Math.min(1,a*0.9);
      cbCtx.beginPath();cbCtx.arc(ef.x,ef.y,ef.r*0.5*a,0,Math.PI*2);cbCtx.fill();
    } else if(ef.type==='shockwave'){
      // 충격파 링 — 시간이 갈수록 확장하고 얇아짐
      const radius=ef.r*(0.3+t*1.8);
      cbCtx.globalAlpha=Math.min(1,a*0.85);
      cbCtx.strokeStyle=ef.col;
      cbCtx.lineWidth=Math.max(0.5,4*a);
      cbCtx.shadowColor=ef.col;cbCtx.shadowBlur=18*a;
      cbCtx.beginPath();cbCtx.arc(ef.x,ef.y,radius,0,Math.PI*2);cbCtx.stroke();
    } else if(ef.type==='shard'){
      // 파편 — 방향(vx,vy)으로 날아가며 점점 작아짐
      ef.x+=ef.vx;ef.y+=ef.vy;
      ef.vx*=0.96;ef.vy*=0.96;
      cbCtx.globalAlpha=Math.min(1,a);
      cbCtx.fillStyle=ef.col;
      cbCtx.shadowColor=ef.col;cbCtx.shadowBlur=8*a;
      cbCtx.beginPath();cbCtx.arc(ef.x,ef.y,2.5*a,0,Math.PI*2);cbCtx.fill();
    } else if(ef.type==='dmgText'){
      // 데미지 텍스트 — 사용자 요청 (2026-06-06 갱신):
      //   · 폰트 크기 ×2: 16 → 32px
      //   · 투명도 피크 90% (가독성 강화 — 종전 50%)
      //   · alpha 곡선: 0 → 0.9 → 0 (sin(t·π)) — 등장→피크→소멸
      //   · y 위치: 베이스에서 24px 위로 천천히 부유
      const rise=24*t;
      const alpha=0.9*Math.sin(t*Math.PI);
      if(alpha>0.001){
        cbCtx.globalAlpha=Math.min(0.9,Math.max(0,alpha));
        cbCtx.font='bold 32px "Courier New", monospace';
        cbCtx.textAlign='center';
        cbCtx.textBaseline='bottom';
        cbCtx.shadowColor='rgba(0,0,0,.9)';
        cbCtx.shadowBlur=6;
        cbCtx.fillStyle=ef.col||'#ff3333';
        cbCtx.fillText(ef.txt||'', ef.x, ef.y - rise);
      }
    } else if(ef.type==='shieldHit'){
      // 쉴드 피격 — 헥사곤 임팩트 + 짧은 광점
      // 사용자 요청: 전체 쉴드 투명도 ×0.8 (20% 감소)
      const radius=ef.r*(0.9+t*0.4);
      cbCtx.globalAlpha=Math.min(1,a*0.95*0.8);
      cbCtx.strokeStyle=ef.col;
      cbCtx.lineWidth=Math.max(1,3*a);
      cbCtx.shadowColor=ef.col;cbCtx.shadowBlur=14*a;
      cbCtx.beginPath();
      for(let i=0;i<6;i++){
        const ang=(Math.PI*2*i)/6;
        const px=ef.x+Math.cos(ang)*radius;
        const py=ef.y+Math.sin(ang)*radius;
        if(i===0)cbCtx.moveTo(px,py); else cbCtx.lineTo(px,py);
      }
      cbCtx.closePath();cbCtx.stroke();
      // 중심 광점
      cbCtx.globalAlpha=Math.min(1,a);
      cbCtx.fillStyle='#ffffff';
      cbCtx.shadowBlur=0;
      cbCtx.beginPath();cbCtx.arc(ef.x,ef.y,2.5*a,0,Math.PI*2);cbCtx.fill();
    } else {
      // 폭발: 외부 링이 진행에 따라 커지며 페이드
      const radius=ef.r*(0.4+t*1.6);
      cbCtx.globalAlpha=Math.min(1,a*1.1);
      cbCtx.shadowColor=ef.col;cbCtx.shadowBlur=24*a;
      cbCtx.fillStyle=ef.col;
      cbCtx.beginPath();cbCtx.arc(ef.x,ef.y,radius,0,Math.PI*2);cbCtx.fill();
      // 내부 밝은 코어 (초반에만)
      if(a>0.55){
        cbCtx.globalAlpha=Math.min(1,a*0.9);
        cbCtx.fillStyle='rgba(255,255,255,0.9)';
        cbCtx.shadowBlur=0;
        cbCtx.beginPath();cbCtx.arc(ef.x,ef.y,radius*0.45,0,Math.PI*2);cbCtx.fill();
      }
    }
    cbCtx.restore();
    return ef.life>0;
  });
  // 미사일→폭발 등 filter 콜백 내부에서 발생한 신규 이펙트 합치기
  if(_newEffs.length)_cbEffects.push(..._newEffs);
  // 사용자 보고 (2026-06-06): 전투가 길어지면 미사일·레이저가 사라지는 현상.
  //   종전: _cbEffects.splice(0, ...) → 가장 오래된 effect 무차별 컷
  //   문제: missile(life:60), beam(life:18) 같이 "시각적으로 진행 중"인 effect가
  //         muzzle(life:8), shieldHit(life:16) 같은 짧은 effect와 함께 큐 앞쪽에 있으면
  //         같이 컷되어 발사체가 사라지는 시각적 버그 발생.
  //   수정: 상한 120 → 200 으로 증가 + 컷 대상을 "짧은 effect 우선"으로 스마트 선택.
  //         lifeRatio (life/maxLife) > 0.66 (수명 1/3 이내 발사체)는 보호.
  const _EF_CAP=200;
  if(_cbEffects.length>_EF_CAP){
    const _excess=_cbEffects.length-_EF_CAP;
    // 후보 인덱스: 보호 대상이 아닌 effect (수명 2/3 이상 지나거나 짧은 muzzle/shieldHit 류)
    const _victims=[];
    for(let _i=0;_i<_cbEffects.length&&_victims.length<_excess;_i++){
      const _ef=_cbEffects[_i]; if(!_ef)continue;
      const _r=(_ef.life||0)/(_ef.maxLife||1);
      const _isProjectile=_ef.type==='missile'||_ef.type==='beam'||_ef.type==='lightning';
      // 보호: 발사체 + 수명 1/3 이내 (도달 전) — 미사일이 화면 가운데 사라지지 않게
      if(_isProjectile&&_r>0.66)continue;
      _victims.push(_i);
    }
    // 뒤에서부터 splice → 인덱스 안정
    for(let _i=_victims.length-1;_i>=0;_i--)_cbEffects.splice(_victims[_i],1);
    // 그래도 초과 시 (모두 발사체 보호 중) — 가장 오래된 발사체부터 컷
    if(_cbEffects.length>_EF_CAP){_cbEffects.splice(0,_cbEffects.length-_EF_CAP);}
  }
  // heavyMode shadowBlur 오버라이드 해제 — prototype의 shadowBlur 다시 사용
  if(_heavyMode){try{delete cbCtx.shadowBlur;}catch(e){}}
  cbCtx.restore();
  // TURN 표시
  const tEl=document.getElementById('cb-turn');
  if(tEl)tEl.textContent='TURN '+(combatState.turn||0);
}

function _drawHealthBar(ctx,u,x,y,sz,isEnemy){
  const bw=sz.bar||60,bh=6,by=y-sz.h-16;
  const bx=x-bw/2;
  // 보이드의 창 충전 게이지 (아군 + MMV01 장착함 한정)
  if(!isEnemy && u.parts && u.parts.includes('MMV01')){
    const _r=u._voidSpearReadyAt||0;
    const _now=Date.now();
    const _total=u._voidSpearTotal||10000;
    // 잔여 시간 → 진행률
    const _rem=Math.max(0,(_r-_now));
    const _prog=clamp(1-(_rem/_total),0,1);
    const gby=by-10;
    ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(bx,gby,bw,4);
    // 그라데이션 보라/핑크 + 충전 완료 시 깜빡임
    const _ready=_rem<=0;
    const _flash=_ready?(0.5+0.5*Math.sin(_now*0.012)):1;
    ctx.fillStyle=_ready?`rgba(255,${Math.round(80+100*_flash)},255,1)`:'#cc66ff';
    ctx.fillRect(bx,gby,bw*_prog,4);
    ctx.strokeStyle='rgba(204,102,255,.7)';ctx.lineWidth=0.5;ctx.strokeRect(bx,gby,bw,4);
    if(_ready){
      ctx.fillStyle='#ff88ff';ctx.font='bold 9px sans-serif';ctx.textAlign='center';
      ctx.fillText(I18N.t('cb.voidSpearReady'),x,gby-2);
    }
  }
  // HP 바
  ctx.fillStyle='rgba(0,0,0,.5)';ctx.fillRect(bx,by,bw,bh);
  const hpR=clamp(u.hp/Math.max(1,u.maxHP),0,1);
  ctx.fillStyle=hpR>0.5?'#51cf66':hpR>0.25?'#ffd43b':'#ff6b6b';
  ctx.fillRect(bx,by,bw*hpR,bh);
  ctx.strokeStyle='rgba(255,255,255,.2)';ctx.lineWidth=0.5;ctx.strokeRect(bx,by,bw,bh);
  // SH 바
  if((u.maxSH||0)>0){
    const shy=by+bh+2;const shR=clamp((u.sh||0)/Math.max(1,u.maxSH),0,1);
    ctx.fillStyle='rgba(0,0,0,.5)';ctx.fillRect(bx,shy,bw,4);
    ctx.fillStyle='#339af0';ctx.fillRect(bx,shy,bw*shR,4);
    ctx.strokeStyle='rgba(255,255,255,.2)';ctx.lineWidth=0.5;ctx.strokeRect(bx,shy,bw,4);
  }
  // 이름 라벨
  ctx.fillStyle=u.hp<=0?'rgba(150,150,150,.6)':'rgba(220,220,255,.85)';
  ctx.font=`${sz.label||10}px sans-serif`;
  ctx.textAlign='center';
  ctx.fillText(((typeof shipDisplayNm==='function'?shipDisplayNm(u):u.nm)||'').substring(0,10),x,by-3);
  // ── HP / SH 수치 표기 (함선 아래쪽) ─────────────────────────────
  const _fmt=v=>v>=10000?Math.round(v/100)/10+'k':v>=1000?Math.round(v/100)/10+'k':String(Math.max(0,Math.round(v)));
  const _hpTxt=`HP ${_fmt(u.hp)}/${_fmt(u.maxHP)}`;
  const _shTxt=(u.maxSH||0)>0?`SH ${_fmt(u.sh||0)}/${_fmt(u.maxSH||0)}`:'';
  const ny=by+bh+((u.maxSH||0)>0?12:8);
  ctx.font=`${Math.max(9,(sz.label||10)-1)}px Courier New,monospace`;
  ctx.textBaseline='top';
  // HP 텍스트
  ctx.fillStyle=u.hp<=0?'rgba(150,150,150,.5)':(hpR>0.5?'rgba(180,255,200,.95)':hpR>0.25?'rgba(255,220,120,.95)':'rgba(255,140,140,.95)');
  ctx.fillText(_hpTxt,x,ny);
  if(_shTxt){
    ctx.fillStyle='rgba(150,220,255,.9)';
    ctx.fillText(_shTxt,x,ny+10);
  }
  ctx.textBaseline='alphabetic';
}

// 전투 화면 상단 함대 합산 스탯 표시 (아군/적군 ATT·HP·SH·DEF 합산)
function _updateCombatFleetStats(){
  if(!combatState)return;
  const fmt=v=>v>=1000000?Math.round(v/100000)/10+'M':v>=1000?Math.round(v/100)/10+'k':String(Math.round(v));
  function agg(arr){
    let att=0,hp=0,maxHp=0,sh=0,maxSh=0,def=0,alive=0;
    arr.forEach(u=>{
      const _alive=u.hp>0;
      if(_alive)alive++;
      att+=_alive?(+u.ATT||0):0;       // 살아있는 함선만 ATT 합산
      hp+=Math.max(0,u.hp||0);
      maxHp+=Math.max(0,u.maxHP||0);
      sh+=Math.max(0,u.sh||0);
      maxSh+=Math.max(0,u.maxSH||0);
      def+=_alive?(+u.DEF||0):0;
    });
    return{att,hp,maxHp,sh,maxSh,def,alive,total:arr.length};
  }
  const pa=agg(combatState.players||[]);
  const ea=agg(combatState.enemies||[]);
  const plEl=document.getElementById('cb-fleet-pl');
  const enEl=document.getElementById('cb-fleet-en');
  if(plEl)plEl.innerHTML=I18N.t('ui.allyFleetLine',{alive:pa.alive,total:pa.total,att:fmt(pa.att),hp:fmt(pa.hp),maxhp:fmt(pa.maxHp),sh:fmt(pa.sh),maxsh:fmt(pa.maxSh),def:fmt(pa.def)});
  if(enEl)enEl.innerHTML=I18N.t('ui.enemyFleetLine',{alive:ea.alive,total:ea.total,att:fmt(ea.att),hp:fmt(ea.hp),maxhp:fmt(ea.maxHp),sh:fmt(ea.sh),maxsh:fmt(ea.maxSh),def:fmt(ea.def)});
}

// ── 전투 1턴 처리 ─────────────────────────────────────────────────
function _txPos(pos){
  // _unitPos 가 이미 로컬 좌표(ctx.scale 적용 전)로 저장되므로 그대로 사용
  return{x:pos.x, y:pos.y};
}
function runCombatTurn(){
  if(!combatState||combatState.done){drawCombatFrame();return;}
  // ── 재진입 가드 — 페이즈 팝업 콜백 + setTimeout 체인이 중첩되는 경우 차단 ──
  // 동일 턴 중복 실행 시 적/아군 상태가 두 번 변동되어 시각 스터터·계산 오류 유발
  if(combatState._turnInProgress)return;
  combatState._turnInProgress=true;
  // 적 함대 ~50% 일반 함선 혼합 (보스/히든전 제외, 전투당 1회 — 첫 렌더 전에 처리)
  if(!combatState._mixed){
    combatState._mixed=true;
    if(!combatState.isBoss&&!combatState.isVoidBoss&&typeof _mixInNormalShips==='function'){
      try{_mixInNormalShips(combatState.enemies);}catch(e){console.warn('[mix]',e.message);}
    }
  }
  // 장기 전투 보너스용 타이머 — 첫 턴 시 시각 캡처 (모든 전투 시작점을 통일하기 위해 여기서 단일 처리)
  if(!combatState._combatStartedAt)combatState._combatStartedAt=Date.now();
  // _unitPos 사전 채우기: 이펙트 좌표 참조 전 반드시 호출
  drawCombatFrame();
  combatState.turn++;
  const pl=combatState.players.filter(u=>u.hp>0);
  const en=combatState.enemies.filter(u=>u.hp>0);
  if(!pl.length||!en.length){combatState._turnInProgress=false;_finishCombat();return;}

  // ── 우르사 최종전: 호위(치크스·친위대) 전멸 → 2페이즈 전환 ──
  //   보스 무적 해제 + 대사 팝업 + 본체 공격력 ×3
  if(combatState.isBoss && !combatState._ursaPhase2){
    const _boss=combatState.enemies.find(e=>e._ursaBoss||e.id==='BOSS_MAIN');
    const _escAlive=combatState.enemies.some(e=>e!==_boss && (e.hp||0)>0);
    if(_boss && (_boss.hp||0)>0 && !_escAlive){
      combatState._ursaPhase2=true;
      _boss._invincible=false;
      _boss.phase=Math.max(2,_boss.phase||1);
      if(_boss._origATT_p1==null)_boss._origATT_p1=_boss.ATT;
      _boss.ATT=Math.round((_boss.ATT||1)*3);   // 2페이즈 공격력 ×3
      addCombatLog(I18N.t('combat.ursaPhase2'),'err');
      drawCombatFrame();
      if(typeof _showUrsaPhase2Popup==='function'){
        // 팝업 콜백에서 runCombatTurn 재호출 — 현재 호출 종료로 가드 해제 필요
        combatState._turnInProgress=false;
        _showUrsaPhase2Popup(()=>{try{runCombatTurn();}catch(e){}});
        return;  // 팝업 확인 후 전투 재개
      }
    }
  }

  // ── 블랙팔콘 히든전: 호위(보이드 함대+부대) 전멸 → 본체 무적 해제 + 파장 + 대사 ──
  if(combatState.isVoidBoss && !combatState._voidPhase2){
    const _vb=combatState.enemies.find(e=>e.voidBoss)||combatState.enemies[0];
    const _escAlive=combatState.enemies.some(e=>e!==_vb&&(e.hp||0)>0);
    if(_vb&&(_vb.hp||0)>0&&!_escAlive){
      combatState._voidPhase2=true;
      _vb._invincible=false;
      addCombatLog(I18N.t('combat.blackfalconPhase2'),'err');
      // 파장(shockwave) 이펙트 — 본체 위치에서 다중 충격파
      try{const bp=_unitPos[_vb.id];if(bp&&typeof _txPos==='function'){const t=_txPos(bp);for(let k=0;k<4;k++)_cbEffects.push({type:'shockwave',x:t.x,y:t.y,col:'#cc66ff',r:180+k*90,life:70,maxLife:70,delay:k*7});}}catch(e){}
      try{_cbStartAnimLoop&&_cbStartAnimLoop();}catch(e){}
      drawCombatFrame();
      if(typeof _showBlackfalconPhase2Popup==='function'){
        combatState._turnInProgress=false;
        _showBlackfalconPhase2Popup(()=>{try{runCombatTurn();}catch(e){}});
        return;
      }
    }
  }

  let log=[];
  const W=cbCV?cbCV.width:400, ox=cbOffX, oy=cbOffY;

  // ── 같은 함대에서 살아있는 최전열(최소 _fleetCol) — 상대 종심 계산 기준 ──
  function _minAliveCol(units){
    let m=99;
    for(let i=0;i<units.length;i++){const u=units[i];if(u&&u.hp>0){const c=(typeof u._fleetCol==='number')?u._fleetCol:0;if(c<m)m=c;}}
    return m===99?0:m;
  }
  // ── 사거리 필터: 비보스 함대전에서 공격자·타겟의 '앞열 기준 상대 종심' 합이 사거리 이내인 적만 후보로 ──
  //   최전열은 종심 0 → 항상 사거리 내(전체 소강 방지). 앞열이 죽으면 다음 열이 최전열이 되어 자동으로 교전.
  function _rangeFilter(candidates,attacker,attackerFleet){
    if(!attacker||!attackerFleet)return candidates;
    if(combatState.isBoss||combatState.isVoidBoss)return candidates;  // 보스전은 별도 타겟 규칙 — 사거리 미적용
    const range=shipCombatRange(attacker);
    const attMin=_minAliveCol(attackerFleet),tgtMin=_minAliveCol(candidates);
    const attDepth=Math.max(0,((typeof attacker._fleetCol==='number')?attacker._fleetCol:0)-attMin);
    return candidates.filter(c=>{
      const cd=Math.max(0,((typeof c._fleetCol==='number')?c._fleetCol:0)-tgtMin);
      return (attDepth+cd)<=range;
    });
  }
  // ── 앞쪽(낮은 _frontRank) 함선 우선 타겟팅: 가중치 = (n - rank). 70% 확률로 가중 적용, 30%는 균등 무작위 ──
  //   attacker/attackerFleet 전달 시 사거리 필터 적용 → 사거리 밖이면 null(공격 스킵)
  function _pickFrontBiased(candidates,attacker,attackerFleet){
    if(!candidates||!candidates.length)return null;
    if(candidates.length===1)return candidates[0];
    let pool=_rangeFilter(candidates,attacker,attackerFleet);
    if(!pool.length)return null;          // 사거리 밖 — 공격 스킵
    if(pool.length===1)return pool[0];
    if(Math.random()<0.30)return pool[Math.floor(Math.random()*pool.length)];
    const ranks=pool.map(c=>typeof c._frontRank==='number'?c._frontRank:99);
    const maxR=Math.max(...ranks);
    const weights=ranks.map(r=>(maxR-r+1)*(maxR-r+1)); // 제곱 가중치로 앞쪽 강조
    const total=weights.reduce((a,b)=>a+b,0);
    let r=Math.random()*total;
    for(let i=0;i<pool.length;i++){r-=weights[i];if(r<=0)return pool[i];}
    return pool[pool.length-1];
  }

  // ── 발사 스태거: 각 공격자가 시간 차로 발사하도록 delay 누적 ──
  // 레이저는 14프레임/회, 미사일은 18프레임/회 간격 (살보가 좀 길어서 더 여유)
  let _fireDelay=0;
  // 플레이어 함선의 미사일/레이저 파츠 수 (살보 크기 + 무기 선택 결정용)
  const _weaponCountsFor=(ship)=>{
    if(!ship||!ship.parts)return {missile:0,laser:0,missileBestRarity:''};
    let missile=0,laser=0,missileBestRarity='';
    const _rarityRank={'mythic':3,'set':2,'legend':2};  // set=legend 동급 취급
    let _bestR=0;
    ship.parts.forEach(pid=>{
      const p=partById(pid);
      if(!p||p.cat!=='weapon')return;
      if(p.wtype==='missile'){
        missile++;
        const r=_rarityRank[p.rarity]||0;
        if(r>_bestR){_bestR=r;missileBestRarity=p.rarity;}
      }
      else laser++;
    });
    return {missile,laser,missileBestRarity};
  };

  // ─── 사격 속도(TEC) — 높은 함선이 먼저 발사 ────────────────
  //   렐러티비티(LGD03) 효과: 항상 최우선 턴 오더 — TEC 와 무관하게 맨 앞 (사용자 명세)
  const _isRelativ=(u)=>{const c=String(u.catalogId||u.catId||u.id||'').replace(/(?:_\d+|_main)$/,'').toUpperCase();return c==='LGD03';};
  pl.sort((a,b)=>{
    const aR=_isRelativ(a)?1:0, bR=_isRelativ(b)?1:0;
    if(aR!==bR)return bR-aR; // 렐러티비티 우선
    return (b.TEC||0)-(a.TEC||0);
  });
  en.sort((a,b)=>(b.TEC||0)-(a.TEC||0));
  // ─── 워덴클리프(LGD02) 효과: 매 턴 적 함선 1척 무기 슬롯 비활성화 (이번 턴 ATT ×0.5)
  //   해당 적의 _wardClyffeDebuffTurn 으로 1턴만 작동, 다음 턴 자동 복구
  {
    const _hasWarden=pl.some(p=>String(p.catalogId||p.catId||p.id||'').replace(/(?:_\d+|_main)$/,'').toUpperCase()==='LGD02');
    // 이전 턴 디버프 자동 복구
    en.forEach(e=>{if(e._wardClyffeDebuffTurn!=null&&e._wardClyffeDebuffTurn<combatState.turn&&e._origATT_LGD2!=null){e.ATT=e._origATT_LGD2;delete e._origATT_LGD2;delete e._wardClyffeDebuffTurn;}});
    if(_hasWarden){
      const _eligible=en.filter(e=>e.hp>0&&!e._wardClyffeDebuffTurn);
      if(_eligible.length>0){
        const _tgt=_eligible[Math.floor(Math.random()*_eligible.length)];
        _tgt._origATT_LGD2=_tgt.ATT;
        _tgt.ATT=Math.max(1,Math.round((_tgt.ATT||1)*0.5));
        _tgt._wardClyffeDebuffTurn=combatState.turn;
        addCombatLog(I18N.t('combat.wardenclyffe',{nm:shipDisplayNm(_tgt)||I18N.t('combat.enemyLabel')}),'gold');
      }
    }
  }
  // ─── 선제공격(이니셔티브) — turn 1, 함대 합산 TEC 비교 ─────
  //   우위 측 (상대의 1.2배 이상) 은 이번 턴 ATT +20% 보너스
  if(combatState.turn===1 && !combatState._initChecked){
    combatState._initChecked=true;
    const _plTec=pl.reduce((s,u)=>s+(u.TEC||0),0);
    const _enTec=en.reduce((s,u)=>s+(u.TEC||0),0);
    if(_plTec >= _enTec*1.2 && _plTec>0){
      pl.forEach(p=>{if(!p._origATT)p._origATT=p.ATT; p.ATT=Math.round(p.ATT*1.2);});
      addCombatLog(I18N.t('combat.firstStrikeAlly',{pl:_plTec,en:_enTec}),'gold');
    } else if(_enTec >= _plTec*1.2 && _enTec>0){
      en.forEach(e=>{e.ATT=Math.round((e.ATT||1)*1.2);});
      addCombatLog(I18N.t('combat.firstStrikeEnemy',{en:_enTec,pl:_plTec}),'err');
    }
  }
  // ── 일점사(집중사격) 타겟 승계 — 이전 타겟 격침 시 다음 가장 앞쪽 적으로 자동 전환 ──
  // 사용자 명세(2026-06-03): 일점사 발동 후 전 함선은 같은 적 1척에 집중사격, 격침되면 다음 앞열로 승계
  if(combatState._focusTargetId){
    const _cur=combatState.enemies.find(e=>e.id===combatState._focusTargetId);
    if(!_cur||(_cur.hp||0)<=0){
      // 다음 후보: 살아있고 무적/보스 제외, 가장 앞열
      const _next=combatState.enemies.filter(e=>(e.hp||0)>0&&!e._invincible)
        .sort((a,b)=>{
          const ar=(typeof a._frontRank==='number')?a._frontRank:99;
          const br=(typeof b._frontRank==='number')?b._frontRank:99;
          return ar-br;
        })[0];
      combatState._focusTargetId=_next?_next.id:null;
      if(_next)addCombatLog(I18N.t('combat.focusTargetSwitch',{nm:shipDisplayNm(_next)}),'gold');
    }
  }

  // 플레이어 공격
  pl.forEach(p=>{
    let aliveEn=en.filter(e=>e.hp>0);
    if(!aliveEn.length)return;
    if(combatState.isVoidBoss){
      const nonBoss=aliveEn.filter(e=>!e.voidBoss);
      if(nonBoss.length>0)aliveEn=nonBoss;
    }
    // 우르사 최종전: 호위(치크스·친위대) 전멸 전까지 보스 무적 — 타겟에서 제외(=최후 공격)
    if(combatState.isBoss){
      const nonBoss=aliveEn.filter(e=>!(e._ursaBoss||e._invincible||e.id==='BOSS_MAIN'));
      if(nonBoss.length>0)aliveEn=nonBoss;
    }
    // ── 일점사 집중사격: focusTarget이 살아있고 후보군에 포함되면 그 1척만 타겟 ──
    if(combatState._focusTargetId){
      const _ft=aliveEn.find(e=>e.id===combatState._focusTargetId);
      if(_ft)aliveEn=[_ft];
    }
    // ─── 보이드의 창 (MMV01) — 첫 발사 10초, 이후 30초 쿨다운 + 발사 직전 1초 파티클 충전 (사용자 명세) ───
    if(p.parts&&p.parts.includes('MMV01')){
      const _now=Date.now();
      if(!p._voidSpearReadyAt){p._voidSpearReadyAt=_now+10000;p._voidSpearTotal=10000;}  // 첫 충전 10초
      let _shouldFireSpear=false;
      if(_now>=p._voidSpearReadyAt){
        if(!p._voidSpearCharging){
          // 충전 시작 — 1초간 파티클 수렴 이펙트 (외곽 → 함선 중심)
          p._voidSpearCharging=true;
          p._voidSpearChargeFireAt=_now+1000;
          const _ap=_unitPos[p.id];
          if(_ap){
            const _a1=_txPos(_ap);
            // 외곽 → 중심으로 수렴하는 파티클 60개 (60프레임에 분산)
            for(let _i=0;_i<60;_i++){
              const _ang=Math.random()*Math.PI*2;
              const _r=70+Math.random()*40;
              const _sx=_a1.x+Math.cos(_ang)*_r, _sy=_a1.y+Math.sin(_ang)*_r;
              const _spd=2.0+Math.random()*1.5;
              const _col=(_i%3===0)?'#ff3322':(_i%3===1)?'#ff8844':'#ffcc66';
              _cbEffects.push({type:'shard',x:_sx,y:_sy,vx:-Math.cos(_ang)*_spd,vy:-Math.sin(_ang)*_spd,col:_col,life:35+Math.random()*10,maxLife:45,delay:Math.floor(_i*0.8)});
            }
            // 중심부 펄스 — 보이드 코어 발광 (점차 커지는 링 6개)
            for(let _i=0;_i<6;_i++){
              _cbEffects.push({type:'exp',x:_a1.x,y:_a1.y,col:'#ff2200',r:24+_i*6,life:38,maxLife:38,delay:_i*9});
            }
            try{_cbStartAnimLoop();}catch(_e){}
            try{AudioMgr.playSfx('gacha_pull',{vol:0.4});}catch(e){}
            addCombatLog(I18N.t('combat.voidSpearCharging',{nm:shipDisplayNm(p)||I18N.t('combat.allyLabel')}),'gold');
          }
        } else if(_now>=p._voidSpearChargeFireAt){
          // 충전 완료 — 발사
          p._voidSpearCharging=false;
          p._voidSpearChargeFireAt=0;
          _shouldFireSpear=true;
        }
        // else: 충전 진행 중 — 이번 틱은 발사 보류
      }
      if(_shouldFireSpear){
        // 밸런스 — HP 가 가장 낮은 적부터 격추 (사용자 명세)
        const tgt=[...aliveEn].sort((a,b)=>(a.hp||0)-(b.hp||0))[0];
        if(tgt){
          const ap=_unitPos[p.id], ep=_unitPos[tgt.id];
          // 데미지: 무조건 즉사 (DEF·SHD 완전 관통)
          tgt.sh=0; tgt.hp=0;
          const gs=G.fleet.find(s=>s.id===p.id);  // (참조용 — 데미지는 enemy 상태에만)
          log.push(`💥 ${shipDisplayNm(p)||I18N.t('ui.allyShort')} ▶ ${I18N.t('combat.voidSpearLaunch')} ${shipDisplayNm(tgt)||I18N.t('ui.enemyShort')} ${I18N.t('combat.instantKill')} ✦`);
          addCombatLog(I18N.t('combat.voidSpearFired',{nm:shipDisplayNm(p)||I18N.t('combat.allyLabel'),tgt:shipDisplayNm(tgt)||I18N.t('combat.enemyLabel')}),'gold');
          if(ap&&ep){
            const a1=_txPos(ap), a2=_txPos(ep);
            // 충전 글로우 (붉은색)
            for(let i=0;i<6;i++){
              _cbEffects.push({type:'exp',x:a1.x,y:a1.y,col:'#ff3322',r:14+i*3,life:30,maxLife:30,delay:_fireDelay+i});
            }
            _cbEffects.push({type:'muzzle',x:a1.x,y:a1.y,col:'#ff2200',r:38,life:22,maxLife:22,delay:_fireDelay+6});
            // ── 붉은색 전기 광선 3개 (수직 오프셋 + 시간차) ──
            const _ang=Math.atan2(a2.y-a1.y,a2.x-a1.x)+Math.PI/2;
            const _px=Math.cos(_ang), _py=Math.sin(_ang);
            for(let b=0;b<3;b++){
              const _off=(b-1)*16;            // -16 / 0 / +16
              const ex=a2.x+_px*_off, ey=a2.y+_py*_off;
              _cbEffects.push({type:'lightning',x1:a1.x,y1:a1.y,x2:ex,y2:ey,col:'#ff2a2a',life:38,maxLife:38,delay:_fireDelay+8+b*3,thickMul:3.4,seed:Math.random()*9999});
              _cbEffects.push({type:'lightning',x1:a1.x,y1:a1.y,x2:ex,y2:ey,col:'#ffd0d0',life:38,maxLife:38,delay:_fireDelay+10+b*3,thickMul:1.7,seed:Math.random()*9999});
            }
            // ── 피격: 파티클(shard) 발산 + 거대 폭발 + 충격파 → 함선 소멸 ──
            for(let s=0;s<28;s++){
              const _a=Math.random()*Math.PI*2, _spd=3+Math.random()*8;
              _cbEffects.push({type:'shard',x:a2.x,y:a2.y,vx:Math.cos(_a)*_spd,vy:Math.sin(_a)*_spd,col:(s%2?'#ff4422':'#ffcc33'),life:42+Math.random()*30,maxLife:72,delay:_fireDelay+16});
            }
            _cbEffects.push({type:'shockwave',x:a2.x,y:a2.y,col:'#ff3322',r:170,life:58,maxLife:58,delay:_fireDelay+16});
            _cbEffects.push({type:'exp',x:a2.x,y:a2.y,col:'#ff2200',r:140,life:66,maxLife:66,delay:_fireDelay+18});
            _cbEffects.push({type:'exp',x:a2.x,y:a2.y,col:'#ffaa00',r:95,life:50,maxLife:50,delay:_fireDelay+20});
            _cbEffects.push({type:'exp',x:a2.x,y:a2.y,col:'#ffffff',r:58,life:36,maxLife:36,delay:_fireDelay+22});
            try{_cbStartAnimLoop();}catch(_e){}
            _fireDelay+=30;
          }
          try{AudioMgr.playSfx('gacha_pull',{vol:1.0});}catch(e){}
          setTimeout(()=>{try{AudioMgr.playSfx('explosion',{vol:0.9});}catch(e){}},200);
          // 쿨다운 재시작 (이후 발사는 30초 고정)
          p._voidSpearReadyAt=_now+30000;
          p._voidSpearTotal=30000;
          // 적군이 비었으면 추가 공격 스킵
          aliveEn=en.filter(e=>e.hp>0);
          if(!aliveEn.length)return;
        }
      }
    }
    const target=_pickFrontBiased(aliveEn,p,pl);
    if(!target)return;   // 사거리 밖 — 이번 턴 이 함선은 공격 스킵(앞열 정리되면 자동 교전)
    const rawDmg=Math.max(1,Math.round((+p.ATT||1)-Math.floor((target.armorTier||0)*1.5)));
    const shDmg=Math.min(target.sh||0,rawDmg);
    const hpDmg=rawDmg-shDmg;
    const wasShielded=(target.sh||0)>0;
    target.sh=Math.max(0,(target.sh||0)-shDmg);
    target.hp=Math.max(0,(target.hp||target.maxHP)-hpDmg);
    const isDead=target.hp<=0;
    // 무기 선택: 장착된 파츠 수 비율로 가중치 랜덤. 미사일·레이저 둘 다 없으면 레이저 폴백
    const _wc=_weaponCountsFor(p);
    const _mcnt=_wc.missile,_lcnt=_wc.laser;
    let usesMissile=false;
    if(_mcnt>0&&_lcnt===0)usesMissile=true;                 // 미사일만 있음
    else if(_lcnt>0&&_mcnt===0)usesMissile=false;           // 레이저만 있음
    else if(_mcnt>0&&_lcnt>0){
      // 둘 다 있으면 파츠 수 비율로 가중치 랜덤
      const total=_mcnt+_lcnt;
      usesMissile=Math.random()<(_mcnt/total);
    } // 둘 다 없으면 레이저 폴백(usesMissile=false 유지)
    // ── 흡혈 로봇 파츠: 레이저 발사 시 입힌 피해의 N%만큼 HP/실드 회복 ──
    let _healHP=0,_healSH=0;
    if(!usesMissile&&rawDmg>0){
      const gs=G.fleet.find(s=>s.id===p.id);
      const parts=(gs?.parts)||p.parts||[];
      let _rateHP=0,_rateSH=0;
      parts.forEach(pid=>{
        const pp=partById(pid);
        if(!pp)return;
        if(pp.laserHealHP)_rateHP+=pp.laserHealHP;
        if(pp.laserHealSH)_rateSH+=pp.laserHealSH;
      });
      if(_rateHP>0||_rateSH>0){
        _healHP=Math.round(rawDmg*_rateHP);
        _healSH=Math.round(rawDmg*_rateSH);
        if(_healHP>0){
          const before=p.hp;
          p.hp=Math.min(p.maxHP||p.hp,p.hp+_healHP);
          _healHP=p.hp-before;
          if(gs)gs.hp=p.hp;
        }
        if(_healSH>0){
          const before=p.sh||0;
          p.sh=Math.min(p.maxSH||0,(p.sh||0)+_healSH);
          _healSH=(p.sh||0)-before;
          if(gs)gs.sh=p.sh;
        }
      }
    }
    const _healLog=(_healHP>0||_healSH>0)?` 🩸+HP${_healHP}${_healSH>0?'/SH'+_healSH:''}`:'';
    log.push(`${usesMissile?'🚀':'⚡'} ${shipDisplayNm(p)||I18N.t('ui.allyShort')} → ${shipDisplayNm(target)||I18N.t('ui.enemyShort')}: ${I18N.t('ui.combatLogDmg',{shDmg,hpDmg})}`+(isDead?' '+I18N.t('ui.killedSuffix'):'')+_healLog);
    const ap=_unitPos[p.id||('P'+0)], ep=_unitPos[target.id];
    if(ap&&ep){
      const a1=_txPos(ap), a2=_txPos(ep);
      // 흡혈 회복 시 발사 함선 위로 파란 +N 표시 (사용자 요청 2026-06-06)
      if(_healHP+_healSH>0) _cbAddHealText(a1, _healHP+_healSH, _fireDelay+5);
      if(usesMissile){
        // 사용자 명세: 기본 1발, 전설(set/legend)·신화(mythic) 미사일 장착 시 최대 4발
        const _bestR=_wc.missileBestRarity;
        const _isHighRarity=(_bestR==='mythic'||_bestR==='set'||_bestR==='legend');
        const mcnt=_isHighRarity?Math.min(4,Math.max(2,_mcnt)):1;
        // 전술 단계마다 미사일 크기 ×1.1 누적 + 시간차공격부터 주황→붉은색으로 색 변화
        let _mSize=1, _mCol='#ffcc66';
        if(combatState._sunsinUsed)      _mSize*=1.1;
        if(combatState._haikjinUsed)     _mSize*=1.1;
        if(combatState._einsteinUsed){   _mSize*=1.1; _mCol='#ff9933';}
        if(combatState._teslaUsed){      _mSize*=1.1; _mCol='#ff8822';}
        if(combatState._genesisUsed){    _mSize*=1.1; _mCol='#ff6633';}
        if(combatState._destinationUsed){_mSize*=1.1; _mCol='#ff3333';}
        _cbAddMissileSalvo(a1,a2,_mCol,isDead,mcnt,_fireDelay,wasShielded,_mSize);
        _cbAddDmgText(a2,rawDmg,shDmg,_fireDelay+50);  // 미사일 도달 시점에 데미지 표시
        _fireDelay+=18+mcnt*2;
      } else {
        // 데스티네이션 어스 발동 시 레이저 색상 → 핑크/퍼플 (무지개급 피니셔)
        const _laserCol=combatState._destinationUsed?'#ff44ff':'#00f3ff';
        _cbAddBeamAndHit(a1,a2,_laserCol,isDead,_fireDelay,wasShielded);
        _cbAddDmgText(a2,rawDmg,shDmg,_fireDelay+4);   // 빔 도달 시점에 데미지 표시
        _fireDelay+=14;
      }
    }
  });
  // 플레이어 사격 끝난 뒤 약간 쉬고 적 사격 시작
  _fireDelay+=10;

  // ─── 보이드 히든 보스: 페이즈별 특수 행동 ──────────────────────
  // 50% HP 이하: 차원 절단광선 → 기함을 제외한 함선 1척 즉시 소멸
  // 10% HP 이하: 작별 통신 + 함선 사라짐 (보스 측 자진 철수)
  let _skipNormalEnemyAttack=false;
  if(combatState.isVoidBoss){
    const boss=combatState.enemies[0];
    if(boss){
      // 트리거: 전체 적 함대 합산 HP 10% 이하 = 거의 괴멸 직전
      const _totalCurHP=combatState.enemies.reduce((s,e)=>s+Math.max(0,e.hp||0),0);
      const _totalMaxHP=combatState.enemies.reduce((s,e)=>s+(e.maxHP||1),0);
      const fleetHpPct=_totalMaxHP>0?_totalCurHP/_totalMaxHP:0;
      const bossHpPct=Math.max(0,boss.hp)/(boss.maxHP||1);
      // 버그픽스: 일점사로 flagship(보스) 즉시 격침 시 boss.hp<=0 단독 조건이
      // OR로 묶여 있어 호위함 15척이 멀쩡한데도 자진 철수가 발동되던 문제 해결.
      // 보스 단독 생존 의도를 살리려면 "다른 적이 모두 죽었을 때"만 트리거.
      const _aliveEnemies=combatState.enemies.filter(e=>e.hp>0).length;
      if((fleetHpPct<=0.10||(boss.hp<=0&&_aliveEnemies<=0))&&!combatState._voidRetreated){
        combatState._voidRetreated=true;
        // ★ 승리 확정 — 자가복구 로직이 outro 중간에 퀘스트를 'available' 로 되돌리지 않게
        //   격파 플래그를 outro 진입 전에 미리 셋. 모달 도중 어떻게 빠져나가도 잠금 유지.
        //   퀘스트 status 는 'active' 그대로 두고, outro 마지막 '보상 수령' 클릭 시 'claimed' 로.
        //   (제너릭 completeQuest 가 끼어들어 보이드 보상을 가로채지 않게 'done' 으로 바꾸지 않음)
        G._voidFalconDefeated=true;
        G._falconDefeated=true;
        // 남은 모든 적함 함께 어둠 속으로 사라짐
        combatState.enemies.forEach(e=>{e.hp=0;e.sh=0;});
        addCombatLog(I18N.t('combat.blackfalconRetreatLog'),'gold');
        drawCombatFrame();
        combatState.done=true;  // 일반 finishCombat 흐름 차단
        try{AudioMgr.playBgm(_planetBgmName(G.currentPlanet));}catch(e){}
        setTimeout(()=>showVoidBossOutro(),1200);
        return;
      }
      // 50% 페이즈 — 차원 절단광선 (보스 생존 + 함대 50% 이하 시)
      if(boss.hp>0&&(bossHpPct<=0.50||fleetHpPct<=0.50)){
        if(!combatState._voidSuperLaserAnnounced){
          combatState._voidSuperLaserAnnounced=true;
          addCombatLog(I18N.t('combat.dimRayCharging'),'err');
        }
        // 비기함(G.fleet[0] 이외) 중 살아있는 첫 함선을 소멸
        const flagshipId=(G.fleet[0]||{}).id;
        const victims=pl.filter(p=>p.id!==flagshipId&&p.hp>0);
        if(victims.length>0){
          const v=victims[0];
          // 차원 절단광선 시각효과 (보스 → 희생 함선 굵은 보라 빔)
          const ap=_unitPos[boss.id],ep=_unitPos[v.id];
          if(ap&&ep){
            try{_cbAddBeamAndHit(_txPos(ap),_txPos(ep),'#cc44ff',true,_fireDelay,false);}catch(e){}
            _fireDelay+=20;
          }
          v.hp=0;v.sh=0;
          const gs=G.fleet.find(s=>s.id===v.id);
          if(gs){gs.hp=0;gs.sh=0;}
          addCombatLog(I18N.t('combat.dimRayFired',{nm:shipDisplayNm(v)}),'err');
        }
        _skipNormalEnemyAttack=true;  // 평시 ATT 공격 생략 (이 페이즈는 절단광선만)
      }
    }
  }

  // 적 공격
  if(!_skipNormalEnemyAttack)en.filter(e=>e.hp>0).forEach(e=>{
    const alivePl=pl.filter(p=>p.hp>0);
    if(!alivePl.length)return;
    const target=_pickFrontBiased(alivePl,e,en);
    if(!target)return;   // 사거리 밖 — 이번 턴 이 적함은 공격 스킵
    // ─── 회피(TEC 기반) ─────────────────────────────────────────
    //   사용자 명세: 엔진(TEC) 수치가 높을수록 회피율 상승
    //   공식: evade = min(0.40, TEC / 2500)  → TEC 0=0% / 250=10% / 500=20% / 1000=40% (캡)
    //   대응 적 TEC 가 더 높으면 회피 확률이 깎임 (상쇄 0~70%)
    const _tTEC=Math.max(0,target.TEC||0), _eTEC=Math.max(0,e.TEC||0);
    let _evChance=Math.min(0.40, _tTEC/2500);
    if(_eTEC>0)_evChance*=Math.max(0.30, 1 - Math.min(0.70, _eTEC/(_tTEC+1)*0.4));
    if(_evChance>0 && Math.random()<_evChance){
      log.push(`🌀 ${shipDisplayNm(target)||I18N.t('ui.allyShort')} ${I18N.t('combat.dodged')} (${shipDisplayNm(e)||I18N.t('ui.enemyShort')} ${I18N.t('combat.attackVoid')} · TEC ${_tTEC})`);
      const _ep=_unitPos[target.id];
      if(_ep){const a=_txPos(_ep);_cbEffects.push({type:'exp',x:a.x,y:a.y,col:'#66ddff',r:18,life:14,maxLife:14,delay:_fireDelay});try{_cbStartAnimLoop();}catch(_e){}}
      _fireDelay+=8;
      return; // 데미지 적용 스킵
    }
    const armorRed=Math.floor((target.armorTier||0)*1.5);
    const rawDmg=Math.max(1,Math.round((+e.ATT||1)-armorRed));
    const shDmg=Math.min(target.sh||0,rawDmg);
    const hpDmg=rawDmg-shDmg;
    const wasShielded=(target.sh||0)>0;
    target.sh=Math.max(0,(target.sh||0)-shDmg);
    target.hp=Math.max(0,target.hp-hpDmg);
    const gs=G.fleet.find(s=>s.id===target.id);
    if(gs){gs.hp=target.hp;gs.sh=target.sh;}
    const isDead=target.hp<=0;
    // ─── 보이드 적함: 테슬라식 번개 + 미사일 무작위 ───
    const _isVoidEnemy=combatState.isVoidBoss||e.voidBoss||(e.nm||'').toLowerCase().includes('팔콘')||(e.nm||'').toLowerCase().includes('falcon');
    let _atkKind='beam';  // 'beam' | 'lightning' | 'missile'
    if(_isVoidEnemy){
      const r=Math.random();
      _atkKind=r<0.45?'lightning':r<0.90?'missile':'beam';
    }
    const _iconMap={beam:'💥',lightning:'⚡',missile:'🚀'};
    log.push(`${_iconMap[_atkKind]} ${shipDisplayNm(e)||I18N.t('ui.enemyShort')} → ${shipDisplayNm(target)||I18N.t('ui.allyShort')}: ${I18N.t('ui.combatLogDmg',{shDmg,hpDmg})}`+(isDead?' '+I18N.t('ui.killedSuffix'):''));
    const ap=_unitPos[e.id], ep=_unitPos[target.id];
    if(ap&&ep){
      const a1=_txPos(ap),a2=_txPos(ep);
      if(_atkKind==='lightning'){
        // 보이드 번개: 보라 코어 + 자가 가지 (테슬라 시각 효과 재활용)
        _cbEffects.push({type:'muzzle',x:a1.x,y:a1.y,col:'#cc66ff',r:10,life:8,maxLife:8,delay:_fireDelay});
        _cbEffects.push({type:'lightning',x1:a1.x,y1:a1.y,x2:a2.x,y2:a2.y,col:'#cc66ff',life:16,maxLife:16,delay:_fireDelay,thickMul:1.4,seed:Math.random()*9999});
        if(wasShielded)_cbEffects.push({type:'shieldHit',x:a2.x,y:a2.y,col:'#cc66ff',r:30,life:18,maxLife:18,delay:_fireDelay+4});
        _cbEffects.push({type:'exp',x:a2.x,y:a2.y,col:isDead?'#ff3300':'#cc66ff',r:isDead?32:18,life:isDead?36:24,maxLife:isDead?36:24,delay:_fireDelay+5});
        _cbAddDmgText(a2,rawDmg,shDmg,_fireDelay+5);  // 번개 도달 시점에 데미지 표시
        try{_cbStartAnimLoop();}catch(_e){}
        _fireDelay+=15;
      } else if(_atkKind==='missile'){
        // 사용자 요청: 한번에 여러 발 발사 시스템 제거 → 1발만
        _cbAddMissileSalvo(a1,a2,'#cc66ff',isDead,1,_fireDelay,wasShielded,1.2);
        _cbAddDmgText(a2,rawDmg,shDmg,_fireDelay+50);  // 미사일 도달 시점에 데미지 표시
        _fireDelay+=22;
      } else {
        _cbAddBeamAndHit(a1,a2,_isVoidEnemy?'#cc66ff':'#cc44ff',isDead,_fireDelay,wasShielded);
        _cbAddDmgText(a2,rawDmg,shDmg,_fireDelay+4);   // 빔 도달 시점에 데미지 표시
        _fireDelay+=14;
      }
    }
  });
  log.forEach(m=>addCombatLog(m,''));

  const stillAliveEn=combatState.enemies.filter(u=>u.hp>0).length;
  const stillAlivePl=combatState.players.filter(u=>u.hp>0).length;
  drawCombatFrame();
  const stEl=document.getElementById('cb-status');
  if(stEl)stEl.textContent=I18N.t('ui.combatStatus',{ally:stillAlivePl,allyMax:combatState.players.length,enemy:stillAliveEn,enemyMax:combatState.enemies.length});
  _updateCombatFleetStats();
  // 모든 사격이 시각적으로 끝날 때까지 대기 (마지막 이펙트 페이드 포함 ~60프레임 여유)
  // 사용자 요청 (2026-06-06): 학익진 이후 전술 사용마다 함선 속도 +10% 누적.
  //   _tacticSpeedMul 로 턴 사이 대기 시간을 단축 → 다음 턴이 빠르게 도래.
  const _tspd=Math.max(1,(combatState&&combatState._tacticSpeedMul)||1);
  const turnMs=Math.round(Math.min(3000,Math.max(700,(_fireDelay+60)*16))/_tspd);
  if(!stillAliveEn||!stillAlivePl){
    setTimeout(function(){if(combatState&&!combatState.done)_finishCombat();},Math.max(900,turnMs));
  } else {
    // 최대 50턴 제한 (무한 루프 방지)
    if(combatState.turn>=50){
      addCombatLog(I18N.t('combat.over50TurnsForced'),'gold');
      combatState.enemies.forEach(e=>{e.hp=0;});
      setTimeout(function(){if(combatState&&!combatState.done)_finishCombat();},900);
    } else {
      setTimeout(runCombatTurn,turnMs);
    }
  }
  // 턴 마무리 — 재진입 가드 해제 (다음 turn 진행 허용)
  if(combatState)combatState._turnInProgress=false;
}

function _finishCombat(){
  if(!combatState)return;
  combatState.done=true;
  // 전투 종료 — 진행 중인 SFX·잔여 이펙트·애니메이션 즉시 정리
  // (예약된 setTimeout SFX는 클로저로 combatState.done 체크해서 자동 차단)
  try{AudioMgr.stopAllSfx();}catch(e){}
  try{_cbEffects=[];if(typeof _cbAnimReq!=='undefined'&&_cbAnimReq){cancelAnimationFrame(_cbAnimReq);_cbAnimReq=null;}}catch(e){}
  // 사용자 보고 (2026-06-06): 장기간 플레이 중 RAM 폭증·다운 — 전투 종료마다
  //   배경 캔버스(~1-2MB)와 이미지 캐시 절반을 즉시 해제해 GC 압박 완화.
  try{_cbBgCache=null;}catch(e){}
  try{
    if(typeof _cbImgCacheMap!=='undefined'&&_cbImgCacheMap.size>_CB_IMG_CACHE_MAX/2){
      const _toDrop=_cbImgCacheMap.size-Math.floor(_CB_IMG_CACHE_MAX/2);
      const _iter=_cbImgCacheMap.keys();
      for(let i=0;i<_toDrop;i++){const _k=_iter.next().value;if(_k===undefined)break;_cbImgCacheMap.delete(_k);}
    }
  }catch(e){}
  // 충돌 해소 풀 청소 — 전투 종료 후 stale 객체 보존 방지
  try{if(window._resolvedPool)window._resolvedPool.length=0;}catch(e){}
  // 함선 _curX/_curY 보존 → 다음 전투 시작점에서 깜빡임 발생할 수 있어 정리
  //   사용자 보고 (2026-06-06): 전투 누적 시 미사일·레이저가 사라지는 현상.
  //   원인: 휘발성 필드(학익진 target/_origATT 등)가 이전 전투 데이터로 남아
  //         후속 전투의 위치 계산/공격력 산정 등에 잔존 영향.
  //   대책: 전투 종료 시 모든 휘발성 필드 일괄 삭제 + combatState 자체도 null로 강제 해제 (참조 보존 방지)
  try{
    [...(combatState.players||[]),...(combatState.enemies||[])].forEach(u=>{
      if(!u)return;
      delete u._curX;delete u._curY;delete u._drawAngle;delete u._frontRank;
      // 학익진 진형 휘발성 필드
      delete u._haikjinTargetX;delete u._haikjinTargetY;delete u._isHaikjinTank;
      // 공격력 원본/누적 보너스 필드
      delete u._origATT;
      // 보스 무적·각성 페이즈 플래그
      delete u._invincible;delete u._awakened;
      // 보이드 창 충전 타임스탬프 등 일시적 상태
      delete u._voidSpearReadyAt;delete u._voidSpearTotal;
    });
  }catch(e){}
  // 충돌 해소 풀 청소 (위에서도 1회 했지만 안전망)
  try{if(window._resolvedPool)window._resolvedPool.length=0;}catch(e){}
  const win=combatState.enemies.filter(u=>u.hp>0).length===0;
  const pid=combatState._planetId||G.currentPlanet;
  const pd=combatState.planetDef||{};
  // ★ 보이드 보스(블랙팔콘) — 승리 시 일반 승리 흐름 절대 금지, 무조건 outro 보상 경로로
  //   · player turn 즉시격파(일점사) 든 enemy turn 트리거(line 13992)든 모두 여기서 종착
  //   · _voidRetreated 가 이미 true 라도 generic win 으로 빠지지 않게 반드시 return
  if(win&&combatState.isVoidBoss){
    if(!combatState._voidRetreated){
      // 최초 진입: 격파 플래그 셋 + outro 예약
      combatState._voidRetreated=true;
      G._voidFalconDefeated=true;
      G._falconDefeated=true;
      addCombatLog(I18N.t('combat.blackfalconRetreat'),'gold');
      G.fleet.forEach(s=>{const cs=combatState.players.find(p=>p.id===s.id);if(cs){s.hp=Math.max(1,cs.hp);if(cs.sh!=null)s.sh=cs.sh;}});
      try{AudioMgr.playBgm(_planetBgmName(G.currentPlanet));}catch(e){}
      saveGame(true);
      setTimeout(()=>{
        try{showVoidBossOutro();}catch(e){console.warn('void boss outro failed',e);}
      },1000);
    }
    // 이미 outro 가 다른 경로(line 13992)에서 예약되어 있어도 generic 보상 흐름은 무조건 차단
    return;
  }
  if(win&&combatState._isBlackHoleFinal){
    // 방어 코드: 0턴 자동 승리(적이 등장도 못함) 차단 — 최소 1턴 진행해야 보상 인정
    if((combatState.turn||0)<1){
      console.warn('[BlackHole] auto-win on turn 0 detected — ignoring (likely a regen/state bug). enemies count:',combatState.enemies?.length);
      addCombatLog(I18N.t('combat.noEnemyFleetInvalid'),'warn');
      notify(I18N.t('notify.blackHoleInvalid'),'err');
      try{setTimeout(()=>{combatState=null;hubTab('map');},800);}catch(e){}
      return;
    }
    addCombatLog(I18N.t('combat.blackHoleLionDefeat'),'gold');
    notify(I18N.t('notify.blackHoleClear'),'gold');
    G.fleet.forEach(s=>{const cs=combatState.players.find(p=>p.id===s.id);if(cs){s.hp=Math.max(1,cs.hp);if(cs.sh!=null)s.sh=cs.sh;}});
    try{_grantBlackHoleRewardsSilent();}catch(e){console.warn(e);}
    G._act5Complete=true;
    G._finalEndingShown=false;
    // 🌌 명예의 전당 기록 — ACT 5 (블랙홀의 심연)
    try{_recordHallOfFameEntry(5,I18N.t('hof.act5'));}catch(e){console.warn('HoF act5',e);}
    saveGame(true);
    setTimeout(()=>{
      combatState=null;
      try{_cbCacheClear();}catch(e){}
      _cbEffects=[];_unitPos={};
      if(_cbAnimReq){cancelAnimationFrame(_cbAnimReq);_cbAnimReq=null;}
      try{showFinalEndingCredits();}catch(e){console.warn(e);}
    },2500);
    return;
  }
  let earned=0;
  if(win){
    addCombatLog(I18N.t('combat.victory'),'ok');
    // raidDef 승리 콜백 (아이젠클로 중간보스 등 — 승리 시 퀘스트 완료 처리). 사용자 요청 2026-06-17.
    try{ if(combatState.planetDef && typeof combatState.planetDef._onWin==='function'){ combatState.planetDef._onWin(); combatState.planetDef._onWin=null; } }catch(e){}
    // bugfix 2026-06-11 v2: 시나리오 전투 퀘 정밀 연동 — 전투 종류(우르사 보스/치크스/일반)별 매칭
    try{
      if(typeof bumpStoryQuestProgress==='function'){
        const _sqKills=(combatState.enemies||[]).filter(u=>u&&u.hp<=0).length||1;
        const _isUrsa=!!combatState.isBoss||(combatState.enemies||[]).some(u=>u&&(String(u.id||'').indexOf('BOSS')===0||/우르사 메이저|ursa major/i.test(String(u.nm||''))));
        const _isChix=(combatState.enemies||[]).some(u=>u&&(/^(CHIX|E\d)/.test(String(u.catalogId||u.catId||u.id||''))||/치크스|chix|cygnus/i.test(String(u.nm||''))));
        bumpStoryQuestProgress(_isUrsa?'combat_ursa':_isChix?'combat_chix':'combat_generic',_sqKills,pid);
      }
    }catch(e){}
    if(pd.hostile&&!combatState.isBoss){G.planets[pid]=G.planets[pid]||{};G.planets[pid].hostile_cleared=true;}
    // 호레이쇼 넬슨(H05) 보유 시 전투 보상 +20%
    const _nelsonBonus=(G.heroes||[]).includes('H05')?1.2:1.0;
    // 장기 전투 보너스: 1분 경과마다 +5%, 최대 +100% (2배) — 20분 = 캡
    const _elapsedMs=combatState._combatStartedAt?(Date.now()-combatState._combatStartedAt):0;
    const _elapsedMin=Math.floor(_elapsedMs/60000);
    const _timeBonus=1+Math.min(1.0,_elapsedMin*0.05);
    // 잔해 합류(_debrisJoinCount>0) 시 보상 ×3 (사용자 명세)
    const _joinBonus=(combatState._debrisJoinCount||0)>0?3:1;
    earned=Math.round((1000+G.turn*50)*getDiffMult()*_nelsonBonus*_timeBonus*_joinBonus);
    G.credits+=earned;
    addCombatLog(I18N.t('combat.rewardCr',{cr:earned.toLocaleString(),join:_joinBonus>1?I18N.t('combat.debrisBonus',{n:_joinBonus}):''}),'gold');
    if(_elapsedMin>=1){
      const _bonusPct=Math.round((_timeBonus-1)*100);
      addCombatLog(I18N.t('combat.longBattleBonus',{pct:_bonusPct,min:_elapsedMin}),'gold');
    }
    // 모든 비-보스 전투 승리 시 허브 진행도 +1 (해적/치크스/적대행성/잔해해적 모두 카운트)
    let _kindLbl=I18N.t('ui.enemyForce');
    let _repGained=0;
    if(!combatState.isBoss){
      if(combatState.isPirate||combatState._isChixFleet){
        if(!G.pirateKills)G.pirateKills=0;
        G.pirateKills++;
        changeReputation(1);_repGained=1;
      }
      addHubProgress(pid);
      _kindLbl=combatState._isChixFleet?I18N.t('cb.kindChix'):combatState.isPirate?I18N.t('cb.kindPirate'):I18N.t('cb.kindEnemy');
      addCombatLog(I18N.t('combat.hubProgress',{kind:_kindLbl,now:getPlanetHubProgress(pid),max:getPlanetHubThreshold(pid)}),'gold');
      // ── 전리품 특산물 드롭 — 사용자 요청 2026-06-09: 명성(1~1000) 기반 비례 ──
      //   · 명성 1     → 종 1 / 개 10~15  (저명성 신참 사령관)
      //   · 명성 500   → 종 3 / 개 45~58
      //   · 명성 1000+ → 종 5 / 개 80~100 (전설급 사령관)
      //   · 화물칸이 가득 차면 가능한 만큼만 적재 후 알림
      try{
        const _rep=clamp(G.reputation||1,1,1000);
        const _t=(_rep-1)/999;  // 0(명성1) ~ 1(명성1000)
        // 잔해 합류 시 전리품 수량도 3배 (사용자 명세 — 보상 3배)
        const _lootMul=(combatState._debrisJoinCount||0)>0?3:1;
        const _kinds=clamp(Math.round(1+_t*4),1,5);
        // 명성 1 → 10~15개 / 명성 1000 → 80~100개 (선형 보간)
        const _qtyMin=Math.round((10+_t*70)*_lootMul);
        const _qtyMax=Math.round((15+_t*85)*_lootMul);
        const _plv=(typeof calcPlayerLevel==='function')?calcPlayerLevel():1;  // notify 용 라벨 유지
        const _facId=pd&&pd.f;
        // 보상 풀: 행성 팩션 특산물 우선 + 일반 풀 — 재료(material)는 제외 (일반 G* 만)
        const _pool=(typeof COMMODITIES!=='undefined'?COMMODITIES:[]).filter(c=>c&&!c.material);
        const _facPool=_pool.filter(c=>c.f===_facId);
        const _restPool=_pool.filter(c=>c.f!==_facId);
        // 시드 셔플 후 facPool 먼저 _kinds 만큼 선택
        const _shuffle=arr=>{const a=arr.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
        const _picks=[..._shuffle(_facPool),..._shuffle(_restPool)].slice(0,_kinds);
        if(_picks.length>0){
          const _maxCargo=(typeof getCargoMax==='function')?getCargoMax():999999;
          if(!Array.isArray(G.cargo))G.cargo=[];
          const _curCargo=()=>G.cargo.reduce((s,c)=>s+(c.qty||0),0);
          const _gotten=[];
          _picks.forEach(c=>{
            const _wantQty=_qtyMin+Math.floor(Math.random()*(_qtyMax-_qtyMin+1));
            const _room=Math.max(0,_maxCargo-_curCargo());
            const _giveQty=Math.min(_wantQty,_room);
            if(_giveQty<=0)return;
            // 전리품 슬롯 — loot:true 표식 → calcSellPrice 가 maxSell 가격으로 판매 처리
            //  · 매입 가격이 없으므로 일반 가격 공식(차익=판매-매입)이 의미 없음
            //  · 사용자 명세: 어디서 팔든 최대가에 매각
            const _slot=G.cargo.find(x=>x.id===c.id&&x.loot===true);
            if(_slot){_slot.qty+=_giveQty;}
            else{G.cargo.push({id:c.id,nm:c.nm,qty:_giveQty,buyPrice:0,buyPlanetId:null,buyFaction:_facId,loot:true});}
            _gotten.push(`${c.ic||'📦'} ${commDisplayNm(c)}×${_giveQty}`);
          });
          if(_gotten.length>0){
            addCombatLog(I18N.t('combat.loot',{items:_gotten.join(' · ')}),'gold');
            notify(I18N.t('notify.lootCount',{n:_gotten.length,rep:_rep,lv:_plv}),'ok');
          } else if(_picks.length>0){
            addCombatLog(I18N.t('combat.lootFullCargo'),'warn');
          }
        }
      }catch(e){console.warn('combat loot drop failed',e);}
    }
    if(combatState.isBoss){
      addCombatLog(I18N.t('combat.ursaDefeatedClear'),'gold');
      notify(I18N.t('notify.finalBossCleared'),'gold');
      // ── 최종 보스 보상: 1천만 크레딧 + 우르사 메이저 함선 + 신화 파츠 4종 ──
      const _bossBonusCr=10000000;
      G.credits+=_bossBonusCr;
      addCombatLog(I18N.t('combat.bossBonus',{cr:_bossBonusCr.toLocaleString()}),'gold');
      // 우르사 메이저 함선 강제 획득
      if(!G.fleet)G.fleet=[];
      const _ursaShip={
        id:'BOSS_URSA_CAP_'+Date.now(),
        nm:I18N.t('enemy.ursaPrefix'),
        tier:'신화',
        // 사용자 요청 2026-06-15: 보상 노획 우르사 메이저 함선 체력 50% (10M → 5M)
        maxHP:5000000,hp:5000000,maxSH:300000,sh:300000,
        // 사용자 요청 (2026-06-06): BOSS.ATT 6,000 → 30,000 (×5)에 맞춰 노획함 보상도 동기화
        ATT:30000,INT:600,TEC:280,HP:5000000,DEF:200,LOY:80,
        parts:['MW01','MS01','MA01','ME01'],crewIds:[],cargoSlots:40,
        catalogId:'URSA',crafted:false
      };
      // 활성 편대 한도 체크 (최대 16척) — 초과 시 임시창, 임시창 8척 초과 시 매각 프롬프트
      const _ursaAdd=addShipToFleet(_ursaShip);
      if(_ursaAdd.added==='reserve')addCombatLog(I18N.t('combat.ursaToReserve'),'gold');
      else addCombatLog(I18N.t('combat.ursaJoined'),'gold');
      // 신화 파츠 4종 모두 인벤토리에 추가
      if(!G.inventory)G.inventory=[];
      ['MW01','MS01','MA01','ME01'].forEach(pid=>{
        const inv=G.inventory.find(i=>i.id===pid);
        if(inv)inv.qty++;else G.inventory.push({id:pid,qty:1});
      });
      addCombatLog(I18N.t('combat.mythicPartSet'),'gold');
      // 추가 신화 설계도 보너스: 영혼 흡수 매트릭스(RB10), 렐러티비티(LGD03)
      // 보스 격파 시 미보유 설계도를 자동 지급 (드롭률에 의존하지 않음)
      if(!G.blueprints)G.blueprints={};
      const _bossBlueprints=['RB10','LGD03'];
      const _grantedBp=[];
      _bossBlueprints.forEach(bp=>{
        if(!G.blueprints[bp]){G.blueprints[bp]=true;_grantedBp.push(bp);}
      });
      if(_grantedBp.length>0){
        const _bpNames=_grantedBp.map(bp=>{
          const r=(typeof CRAFT_RECIPES!=='undefined')&&CRAFT_RECIPES.find(x=>x.id===bp);
          return r?r.nm:bp;
        }).join('·');
        addCombatLog(I18N.t('combat.mythicBp',{n:_grantedBp.length,names:_bpNames}),'gold');
        // 사용자 요청 2026-06-09: 보스 보상 설계도도 BP01/BP02 이미지 알림
        _grantedBp.forEach(bp=>{
          const r=(typeof CRAFT_RECIPES!=='undefined')&&CRAFT_RECIPES.find(x=>x.id===bp);
          try{notifyBlueprint(bp,r?r.nm:bp,'gold');}catch(e){}
        });
      }
    }
    else{notify(I18N.t('notify.battleWin'),'ok');}
    // ── 🏴 적함 나포 처리 (보스 제외) ──────────────────────────────
    // 사용자 요청 2026-06-09: 나포 확률 50% 감소 (기존 28%→14%, 팩션 보너스 ÷100→÷200, 상한 55%→27.5%)
    // 편대편성 "나포 거절" 토글이 켜져 있으면 나포 대신 즉시 매각하여 크레딧 획득
    const _capturedShips=[];
    let _autoSoldRevenue=0,_autoSoldCount=0;
    if(!combatState.isBoss){
      const _capBase=0.14;
      const _facBonus=(getFactionPassive().captureBns||0)/200;
      const _capRate=Math.min(0.275,_capBase+_facBonus);
      const _decline=!!G.declineCapture;
      combatState.enemies.forEach(e=>{
        if(e.hp>0)return;  // 살아남은 적은 못 나포
        if(Math.random()>=_capRate)return;
        // 적 함선 데이터 → CAP_ 함선 변환
        const cap={
          id:'CAP_'+Date.now()+'_'+Math.floor(Math.random()*9999),
          nm:I18N.t('enemy.capturedPrefix',{nm:(e.nm||I18N.t('enemy.captured'))}),
          tier:e.tier||'소형',
          maxHP:Math.max(50,Math.floor((e.maxHP||100)*0.7)),
          hp:Math.max(50,Math.floor((e.maxHP||100)*0.4)),
          maxSH:Math.max(0,Math.floor((e.maxSH||0)*0.6)),
          sh:0,
          ATT:Math.floor((e.ATT||0)*0.8),
          INT:Math.floor((e.INT||0)*0.8),
          TEC:Math.floor((e.TEC||0)*0.8),
          HP:Math.max(50,Math.floor((e.maxHP||100)*0.7)),
          LOY:35,parts:[],crewIds:[],cargoSlots:5
        };
        if(_decline){
          // 나포 거절: 즉시 매각하여 크레딧으로 환산
          const sp=getShipSellPrice(cap);
          _autoSoldRevenue+=sp.total;_autoSoldCount++;
        } else {
          // 편대/임시창 통합 슬롯이 모두 가득 차면 나포 포기
          if((G.fleet||[]).length>=16 && ((G.reserveFleet||[]).length)>=8)return;
          addShipToFleet(cap);
          _capturedShips.push(cap);
        }
      });
      if(_capturedShips.length>0){
        addCombatLog(I18N.t('combat.shipsCaptured',{n:_capturedShips.length}),'gold');
        notify(I18N.t('notify.shipsCapturedShort',{n:_capturedShips.length}),'gold');
      }
      if(_autoSoldCount>0){
        G.credits=(G.credits||0)+_autoSoldRevenue;
        addCombatLog(I18N.t('combat.captureRejected',{n:_autoSoldCount,cr:_autoSoldRevenue.toLocaleString()}),'gold');
        notify(I18N.t('notify.captureRefusedSold',{n:_autoSoldCount,cr:_autoSoldRevenue.toLocaleString()}),'gold');
      }
    }
    // 🎉 승리 효과음 + 획득 보고 팝업
    try{AudioMgr.playSfx('notify',{vol:0.8,cooldown:60});}catch(e){}
    try{AudioMgr.playSfx('coin',{vol:0.7,cooldown:200});}catch(e){}
    // 로컬 캡쳐 (setTimeout 내에서도 안전하게) — combatState는 1800ms 후 null이 되므로 미리 스냅샷
    const _isBossWin=!!combatState.isBoss;
    const _enemyCountSnap=(combatState.enemies||[]).length;
    const _debrisCombatSnap=(combatState._debrisJoinCount||0)>0||combatState.planetDef?.id==='DEBRIS_PIRATE'||!!combatState.planetDef?._isDebris;
    const _chixFleetSnap=!!combatState._isChixFleet;
    const _firstEnemySnap=(combatState.enemies||[])[0]||null;
    // 보고 팝업 구성 (보스/일반 공통)
    const _buildReport=()=>{
      const items=[];
      // 사용자 요청 2026-06-07: 보고 아이콘 → 실제 이미지로 교체
      //   · 크레딧 항목: img/ui/credit.png
      //   · 격파 적함: 해적선 이미지 (img/combat/enemies/PIRATE_M.png 등)
      //   · 행성 허브 진행도: 행성 이미지 (planetImgSrc)
      const _ver=(window._GAME_VER)?('?v='+encodeURIComponent(window._GAME_VER)):'';
      // 크레딧 — credit.png 아이콘
      items.push({ic:'💰',img:'img/ui/credit.png'+_ver,nm:I18N.t('report.creditsNm'),type:I18N.t('report.creditsType'),color:'var(--gold)',stats:`+₡${earned.toLocaleString()}`,desc:I18N.t('ui.combatRewardDesc',{mul:getDiffMult().toFixed(2)})});
      // 명성 — HN01.png 메달 아이콘 (사용자 요청 2026-06-08)
      if(_repGained>0)items.push({ic:'⭐',img:'img/ui/HN01.png'+_ver,nm:I18N.t('report.repNm'),type:I18N.t('report.repType'),color:'var(--cyan)',stats:I18N.t('ui.repGained',{gained:_repGained,cur:G.reputation}),desc:I18N.t('report.repDesc')});
      const enemyCount=_enemyCountSnap;
      // 격파 적함 — 첫 번째 적 함선의 실제 이미지를 우선 사용 (배저스카우트·치크스·잔해해적 등)
      // 사용자 요청 2026-06-07: 좌측 이미지는 반드시 함선 실제 이미지로 (아이콘 금지)
      const _isDebrisCombat=_debrisCombatSnap;
      const _firstEnemy=_firstEnemySnap;
      const _enemyImg=(_firstEnemy && typeof shipImgSrc==='function')
        ? shipImgSrc(_firstEnemy)
        : (_isDebrisCombat?('img/combat/enemies/DBRP_M.png'+_ver)
            :_chixFleetSnap?('img/combat/enemies/CHIX_M.png'+_ver)
            :('img/combat/enemies/PIRATE_M.png'+_ver));
      items.push({ic:'☠️',img:_enemyImg,nm:I18N.t('report.enemyKilled'),type:_kindLbl,color:'var(--red)',stats:I18N.t('report.enemyDestN',{n:enemyCount}),desc:I18N.t('report.enemyDesc')});
      // 나포 함선 — 각 함선의 실제 이미지 (shipImgSrc로 팩션·등급 자동 라우팅)
      _capturedShips.forEach(s=>{
        const _sImg=(typeof shipImgSrc==='function')?shipImgSrc(s):null;
        items.push({ic:'🏴',img:_sImg,nm:(typeof shipDisplayNm==='function'?shipDisplayNm(s):s.nm),type:I18N.t('ship.capturedLabel',{tier:I18N.tier(s.tier)}),color:'#ff8844',stats:I18N.t('ui.attHpLoyalty',{att:s.ATT,hp:s.maxHP}),desc:I18N.t('report.captureDesc')});
      });
      if(_autoSoldCount>0){
        items.push({ic:'💰',img:'img/ui/credit.png'+_ver,nm:I18N.t('ui.captureDeclinedSold',{n:_autoSoldCount}),type:I18N.t('report.autoSoldType'),color:'var(--gold)',stats:`+₡${_autoSoldRevenue.toLocaleString()}`,desc:I18N.t('report.autoSoldDesc')});
      }
      if(!_isBossWin){
        const hp=getPlanetHubProgress(pid),thr=_getHubThr(pid);
        // 행성 허브 진행도 — 현재 행성 이미지
        const _planetImg=(typeof planetImgSrc==='function')?planetImgSrc(pid):null;
        items.push({ic:'🏛️',img:_planetImg,nm:I18N.t('report.planetHubProg'),type:I18N.t('report.unlockProg'),color:'var(--cyan)',stats:`${hp}/${thr.s3}`,desc:I18N.t('report.unlockDesc')});
      }
      // 보스 전용: 신화 파츠 4종 + 보너스 크레딧 + 우르사 함선 (이미지 추가 — 보상 시각화)
      if(_isBossWin){
        items.push({ic:'💰',img:'img/ui/credit.png'+_ver,nm:I18N.t('report.bossBonus'),type:I18N.t('report.creditsType'),color:'var(--gold)',stats:`+₡10,000,000`,desc:I18N.t('report.bossBonusDesc')});
        // 우르사 메이저 보상 카드 — 실제 격파한 보스와 동일 이미지(enemies/Boss.png)로 통일 (사용자 보고 2026-06-15)
        items.push({ic:'🏴',img:'img/combat/enemies/Boss.png'+_ver,nm:I18N.t('ship.URSA.nm'),type:I18N.t('report.ursaType'),color:'#ff66cc',stats:I18N.t('ui.ursaSpec'),desc:I18N.t('report.ursaDesc')});
        items.push({ic:'⚔️',img:partImgSrc('MW01'),nm:I18N.t('reward.hermeticGunNm'),type:I18N.t('reward.partWeaponType'),color:'#ff66cc',stats:'ATT +320',desc:I18N.t('reward.hermeticDesc'),rarity:'mythic'});
        items.push({ic:'🛡️',img:partImgSrc('MS01'),nm:I18N.t('reward.kronosShieldNm'),type:I18N.t('reward.partShieldType'),color:'#ff66cc',stats:'INT +280 · '+I18N.t('ui.shieldShort')+' +8000',desc:I18N.t('reward.kronosDesc'),rarity:'mythic'});
        items.push({ic:'🪖',img:partImgSrc('MA01'),nm:I18N.t('reward.adamanArmorNm'),type:I18N.t('reward.partArmorType'),color:'#ff66cc',stats:'HP +12000 · DEF +120',desc:I18N.t('reward.adamanDesc'),rarity:'mythic'});
        items.push({ic:'⚙️',img:partImgSrc('ME01'),nm:I18N.t('reward.tachyonDriveNm'),type:I18N.t('reward.partEngineType'),color:'#ff66cc',stats:'TEC +320',desc:I18N.t('reward.tachyonDesc'),rarity:'mythic'});
        // 추가 신화 설계도 (미보유 시에만 보상 표시)
        if(G.blueprints&&G.blueprints.RB10){
          items.push({ic:'📜',img:partImgSrc('RB10'),nm:I18N.t('reward.soulMatrixBp'),type:I18N.t('reward.soulMatrixBpType'),color:'#cc66ff',stats:I18N.t('reward.armorShort'),desc:I18N.t('reward.soulMatrixBpDesc'),rarity:'mythic'});
        }
        if(G.blueprints&&G.blueprints.LGD03){
          items.push({ic:'📜',img:'img/ships/LGD03.png'+_ver,nm:I18N.t('reward.relativityBp'),type:I18N.t('reward.relativityBpType'),color:'#cc66ff',stats:I18N.t('reward.largeMythicFs'),desc:I18N.t('reward.relativityBpDesc'),rarity:'mythic'});
        }
      }
      return items;
    };
    if(_isBossWin){
      // ── 보스 격파: 격정적 에필로그 → 특별 셀레브레이션 → 보상 보고 (지구 해방 엔딩) ──
      // 1) ACT 4로 승격 + 지구 해방 플래그 (P31 배경이 P31_free.jpg로 자동 전환)
      if(G.act<4)G.act=4;
      G._earthLiberated=true;
      // 🏆 명예의 전당 기록 — ACT 4 (지구 해방)
      try{_recordHallOfFameEntry(4,I18N.t('hof.act4'));}catch(e){console.warn('HoF act4',e);}
      // 2) 함선을 지구(P31)로 즉시 이동 — 엔딩 직후 안착 위치
      //    P31은 일반 행성처럼 경매·세금·투자 가능. 이미지/BGM은 우선 P22 자산 사용(추후 교체).
      G.currentPlanet='P31';
      if(!G.planets)G.planets={};
      if(!G.planets['P31']){G.planets['P31']={fog:'A',owned:false,commerce:0};}
      else{G.planets['P31'].fog='A';}
      // 3) 보스 BGM → 지구(P31) 테마 = 엔딩 BGM 으로 전환
      try{AudioMgr.playBgm('P31');}catch(e){}
      // 4) 1800ms 정리 타이머가 BGM/탭을 덮어쓰지 않도록 플래그
      combatState._bossEndingActive=true;
      saveGame(true);
      setTimeout(()=>showBossVictoryEpilogue(()=>{
        showBossCelebration(()=>{
          showAcquisitionReport({
            title:I18N.t('ending.finalReportTitle'),
            subtitle:I18N.t('hud.ursaDefeated',{turn:G.turn}),
            items:_buildReport(),
            color:'#ffd700',
            sfx:null,
            bossfight:true,
            imgScale:0.5,  // 사용자 요청 2026-06-15: 보상 이미지 절반 크기 (일반 전투 보고와 동일)
            acqLine:(typeof window._acqFlavorLine==='function')?window._acqFlavorLine('bossReward',I18N.t('ship.URSA.nm'),'mythic'):'',
            congrats:I18N.t('ending.finalCongrats'),
            // 보상 확인 후 — 어두운 화면 + 영웅/주인공 대사 + 엔딩 크레딧 → 보이드 페이즈
            onClose:()=>{
              showEndingCredits(()=>{
                G._earthLiberated=true;
                saveGame(true);
                // 엔딩 크레딧 후 — 보이드 페이즈로 자연스럽게 전환
                baekgu(I18N.t('baekgu.earthFreeNewEra',{nm:G.profile?.name||I18N.t('hof.commander')}));
              });
            }
          });
        });
      }),600);
    } else {
      setTimeout(()=>{
        // 획득 경로 몰입 멘트 — 나포함선이 있으면 적 유형별, 없으면 일반 전리품
        const _hasCap=_capturedShips.length>0;
        const _acqCtx=_hasCap?(_chixFleetSnap?'chixWarehouse':_debrisCombatSnap?'salvage':'pirateDrop'):'combatGeneric';
        const _acqNm=_hasCap?((typeof shipDisplayNm==='function'?shipDisplayNm(_capturedShips[0]):'')||_capturedShips[0].nm):'';
        const _acqRar=_hasCap?(_capturedShips[0].tier||''):'';
        // 해적 격파 후 상인 구출 보상 — 치크스/잔해 아닌 해적전 25% 확률 (보고 확인 후 등장)
        const _merchant=(!_chixFleetSnap&&!_debrisCombatSnap&&Math.random()<0.25)?_rollMerchantRescue(pd):null;
        showAcquisitionReport({title:I18N.t('report.victoryTitle'),subtitle:I18N.t('ui.areaTurn',{nm:pd.nm||I18N.t('ui.unknownArea'),turn:G.turn}),items:_buildReport(),color:'var(--gold)',sfx:null,imgScale:0.5,acqLine:(typeof window._acqFlavorLine==='function')?window._acqFlavorLine(_acqCtx,_acqNm,_acqRar):'',congrats:_capturedShips.length>0?I18N.t('report.allWinCaptured',{n:_capturedShips.length}):I18N.t('report.allWin'),onClose:_merchant?(()=>{try{_showMerchantRescue(_merchant);}catch(e){}}):undefined});
      },900);
    }
    checkQuestCombatDone();
  } else {
    addCombatLog(I18N.t('combat.defeat'),'err');
    const penalty=Math.floor(G.credits*0.1);
    G.credits=Math.max(100,G.credits-penalty);
    earned=-penalty;
    addCombatLog(I18N.t('combat.creditsPenalty',{pen:penalty.toLocaleString()}),'err');
    notify(I18N.t('notify.battleLoseCr'),'err');
    // 보이드 보스(블랙팔콘) 패배 시: 퀘스트를 available 로 되돌려 재도전 허용
    //  · q.status='active' 인 채 멈춰 있으면 퀘스트 탭에서 '수락' 버튼이 사라져 재도전 불가
    if(combatState&&combatState.isVoidBoss&&combatState._questRef){
      combatState._questRef.status='available';
      addCombatLog(I18N.t('combat.blackfalconQuestReset'),'warn');
      notify(I18N.t('notify.blackfalconRetryQuest'),'warn');
    }
    // 미드보스(아이젠클로 등) 패배 시 재도전 콜백 — raidDef._onLose. 사용자 요청 2026-06-17.
    try{ if(combatState&&combatState.planetDef&&typeof combatState.planetDef._onLose==='function'){ combatState.planetDef._onLose(); combatState.planetDef._onLose=null; } }catch(e){}
  }
  // 전투 기록 저장 (렌더링이 참조하는 필드 모두 포함)
  if(!G.combatHistory)G.combatHistory=[];
  const _pdef=pd&&pd.nm?pd:(PLANET_DEF.find(p=>p.id===pid)||{});
  G.combatHistory.push({
    win,pid,planetId:pid,
    planet:_pdef.nm||I18N.t('ui.unknownPlanet'),
    turn:combatState.turn,
    earned,
    gameTurn:G.turn
  });
  G.fleet.forEach(s=>{const cs=combatState.players.find(p=>p.id===s.id);if(cs){s.hp=Math.max(1,cs.hp);}});
  updateHUD();saveGame(true);
  // 퀘스트 전투 완료 시 퀘스트 탭으로 이동, 그 외 메인으로
  const _hasQDone=(G.quests[G.currentPlanet]||[]).some(function(q){return q.status==='done';});
  // 보스 승리 엔딩이 활성화된 경우, 1800ms 정리 타이머는 BGM/탭 덮어쓰기를 스킵.
  // showEndingCredits 이후 자체적으로 P22(지구) 안착·BGM 유지하도록 한다.
  const _bossEnding=!!(combatState&&combatState._bossEndingActive);
  setTimeout(()=>{
    combatState=null;
    // 전투 종료 시 메모리 정리: 이미지 캐시(보스 1전투 후 다시 안 씀)와 잔류 이펙트/위치 비우기
    try{_cbCacheClear();}catch(e){}
    _cbEffects=[];_unitPos={};
    if(_cbAnimReq){cancelAnimationFrame(_cbAnimReq);_cbAnimReq=null;}
    // 잔해 탐색 버튼을 다시 "탐색" 모드로 복귀
    try{updateGatherBtn();}catch(e){}
    if(_bossEnding){
      // 보스 엔딩 진행 중: 행성 BGM/허브탭 전환을 showEndingCredits에 위임
      return;
    }
    try{AudioMgr.playBgm(_planetBgmName(G.currentPlanet));}catch(e){}
    hubTab(_hasQDone?'quest':'main');
  },1800);
}

// ── 해적 격파 후 상인 구출 보상 (사용자 요청 2026-06-16) ─────────────
//   해적 함대(치크스/잔해 제외) 격파 시 일정 확률로 구출된 상인이 사례(특산물/파츠/사례금) 지급
function _rollMerchantRescue(pd){
  try{
    const _fac=(pd&&/^F0[1-7]$/.test(pd.f||''))?pd.f:'F01';
    const _act=G.act||1;
    const thanksIdx=1+((Math.random()*3)|0);
    const roll=Math.random();
    if(roll<0.25){ const amount=Math.floor((6000+Math.random()*9000)*(1+_act*0.5)); return {type:'credits',amount,fac:_fac,thanksIdx}; }
    if(roll<0.40 && typeof PARTS!=='undefined'){
      const pool=PARTS.filter(p=>p&&p.id&&p.cat&&!p.rarity&&(p.tier||0)<=8);
      if(pool.length){ const p=pool[(Math.random()*pool.length)|0]; return {type:'part',id:p.id,nm:(typeof partDisplayNm==='function'?partDisplayNm(p):'')||p.nm,fac:_fac,thanksIdx}; }
    }
    if(typeof COMMODITIES!=='undefined'){
      const goods=COMMODITIES.filter(c=>c&&c.id&&((c.buy||0)>0||c.material));
      if(goods.length){ const c=goods[(Math.random()*goods.length)|0]; const qty=2+((Math.random()*3)|0); return {type:'commodity',id:c.id,nm:(typeof commDisplayNm==='function'?commDisplayNm(c):'')||c.nm,ic:c.ic||'📦',qty,fac:_fac,thanksIdx}; }
    }
    return {type:'credits',amount:10000,fac:_fac,thanksIdx};
  }catch(e){return null;}
}
function _grantMerchantReward(d){
  try{
    if(d.type==='commodity'){
      if(!Array.isArray(G.cargo))G.cargo=[];
      const slot=G.cargo.find(x=>x.id===d.id&&x.loot===true);
      if(slot)slot.qty+=d.qty; else G.cargo.push({id:d.id,nm:d.nm,qty:d.qty,buyPrice:0,buyPlanetId:null,buyFaction:d.fac,loot:true});
    } else if(d.type==='credits'){ G.credits=(G.credits||0)+(d.amount||0); }
    else if(d.type==='part'){ if(!G.inventory)G.inventory=[]; const inv=G.inventory.find(i=>i.id===d.id); if(inv)inv.qty++; else G.inventory.push({id:d.id,qty:1}); }
    notify(I18N.t('merchant.received'),'gold');
    try{updateHUD();saveGame(true);}catch(e){}
  }catch(e){console.warn('[merchant grant]',e);}
}
function _showMerchantRescue(d){
  if(!d)return;
  try{
    const _ver=(window._GAME_VER)?('?v='+encodeURIComponent(window._GAME_VER)):'';
    const _img='img/quests/delivery_'+(d.fac||'F01')+'.png'+_ver;
    let _rewardLine='';
    if(d.type==='commodity')_rewardLine=(d.ic||'📦')+' '+I18N.t('merchant.rewardCommodity',{nm:d.nm,n:d.qty});
    else if(d.type==='credits')_rewardLine='💰 '+I18N.t('merchant.rewardCredits',{n:(d.amount||0).toLocaleString()});
    else if(d.type==='part')_rewardLine='✦ '+I18N.t('merchant.rewardPart',{nm:d.nm});
    const html=`<div style="text-align:center;padding:14px">
      ${imgOrEmoji(_img,'🧑‍🚀',120,120,'border-radius:12px;object-fit:cover;border:2px solid var(--gold);box-shadow:0 0 16px rgba(212,175,55,.5);margin:0 auto 10px')}
      <div style="color:var(--gold);font-size:16px;font-weight:bold;margin-bottom:8px">${I18N.t('merchant.title')}</div>
      <div style="color:#ffe9b0;font-size:14px;line-height:1.7;font-style:italic;background:rgba(212,175,55,.06);border-left:3px solid var(--gold);border-radius:6px;padding:10px 14px;margin-bottom:10px;word-break:keep-all">"${I18N.t('merchant.thanks'+d.thanksIdx)}"</div>
      <div style="color:var(--green);font-size:15px;font-weight:bold">🎁 ${_rewardLine}</div>
    </div>`;
    openModal(I18N.t('merchant.title'),html,[{txt:I18N.t('merchant.btnReceive'),fn:()=>{_grantMerchantReward(d);closeModal();},cls:'btn-gold'}],{});
    try{AudioMgr.playSfx('coin',{vol:0.8,cooldown:0});}catch(e){}
  }catch(e){console.warn('[merchant modal]',e);}
}
// ── 함대 전술 충전 게이지 — 다음 전술로 넘어갈 때(5초 충전) 전투화면 상단 게이지 충전 모션 ──
//   (사용자 요청 2026-06-17) 일점사→학익진→시간차→테슬라→제네시스→데스티네이션 전환마다 호출.
function _startTacticGauge(label,durMs){
  durMs=durMs||5000;
  try{
    const g=document.getElementById('cb-tactic-gauge');
    const fill=document.getElementById('cb-tg-fill');
    const lbl=document.getElementById('cb-tg-label');
    if(!g||!fill)return;
    // 이전 'ready 라벨' 타이머 정리 — 더블클릭/연속클릭 시 stale 타이머가 라벨/표시를 흔들지 않게.
    if(combatState)clearTimeout(combatState._tacticGaugeTimer);
    if(lbl)lbl.textContent='⚡ '+I18N.t('combat.tacticCharging')+' → '+label;
    g.style.display='block';   // 한 번 표시되면 전투 내내 유지 — 자동 숨김 제거 (사용자 요청 2026-06-17: 여러 번 클릭해도 게이지 바가 사라지지 않게)
    fill.style.transition='none';
    fill.style.width='0%';
    void fill.offsetWidth;  // reflow → transition 재시작 보장
    fill.style.transition='width '+durMs+'ms linear';
    requestAnimationFrame(()=>{const f=document.getElementById('cb-tg-fill');if(f)f.style.width='100%';});
    const _t=setTimeout(()=>{
      const l2=document.getElementById('cb-tg-label');
      if(l2)l2.textContent='✅ '+I18N.t('combat.tacticReady')+' — '+label;
      // 게이지는 숨기지 않고 그대로 둠 — 다음 전술 사용 시 새 충전 사이클로 갱신.
    },durMs);
    if(combatState)combatState._tacticGaugeTimer=_t;
  }catch(e){console.warn('[tactic gauge]',e);}
}
// ── 이순신 일점사 전술 ──────────────────────────────────────────
// 발동 효과: ① 가장 앞쪽 적 1척을 집중사격 타겟으로 지정 — 아군 전 함선이 그 1척을 집중 공격
//           ② 남은 전투 내내 아군 공격력 ×2
//           ③ 집중 타겟이 격침되면 자동으로 다음 가장 앞쪽 적으로 타겟 승계
// 일점사 후 5초 뒤 → 학익진 버튼 활성화 (아군 ATT ×3 추가 강화)
// ※ 사용자 요청(2026-06-03): 즉시 격침 → 실제 집중사격 시도로 변경
function activateSunsinFocus(){
  if(!combatState||combatState._sunsinUsed||combatState.done)return;
  // ★ 전술 화자 초상: 일점사 → 호레이쇼 넬슨 (H05)
  try{_showTacticPortrait('img/chars/hero05.png',12000);}catch(e){}
  // 가장 앞쪽(낮은 _frontRank — 진형 앞열 우선) 적 1척을 집중 타겟으로 — 보스/무적은 제외
  const _candidates=combatState.enemies.filter(e=>e.hp>0&&!e._invincible);
  if(!_candidates.length)return;
  const target=_candidates.slice().sort((a,b)=>{
    const ar=(typeof a._frontRank==='number')?a._frontRank:99;
    const br=(typeof b._frontRank==='number')?b._frontRank:99;
    return ar-br;
  })[0];
  if(!target)return;
  combatState._sunsinUsed=true;
  combatState._playerAttMult=2;  // 남은 전투 동안 아군 ATT ×2
  combatState._focusTargetId=target.id;  // ★ 집중사격 타겟 — runCombatTurn에서 참조
  // 이미 활성화된 함선들의 ATT 즉시 갱신 (combatState.players의 캐시된 ATT를 2배로)
  if(combatState.players){
    combatState.players.forEach(p=>{
      if(!p._origATT)p._origATT=p.ATT;
      p.ATT=Math.round(p._origATT*2);
    });
  }
  addCombatLog(I18N.t('combat.focusFireLog',{nm:shipDisplayNm(target)}),'gold');
  notify(I18N.t('notify.focusFireShort'),'gold');
  baekgu(I18N.t('baekgu.focusFireOn',{nm:target.nm}));
  const sbtn=document.getElementById('cb-sunsin-btn');
  if(sbtn)sbtn.disabled=true;
  drawCombatFrame();
  const stillAliveEn=combatState.enemies.filter(u=>u.hp>0).length;
  if(!stillAliveEn){setTimeout(_finishCombat,600);return;}
  // ── 5초 후 학익진 버튼 활성화 (사용자 명세: 넬슨 H05 + 이순신 H01 둘 다 필요) ──
  const _h=G.heroes||[];
  if(!(_h.includes('H01')&&_h.includes('H05')))return;
  combatState._haikjinPending=true;
  try{_startTacticGauge(I18N.t('ult.crane'),5000);}catch(e){}
  setTimeout(()=>{
    if(!combatState||combatState.done||!combatState._haikjinPending||combatState._haikjinUsed)return;
    _showHaikjinButton();
    addCombatLog(I18N.t('combat.haikjinReady'),'gold');
    notify(I18N.t('notify.haikjinReadyShort'),'gold');
  },5000);
}

// 학익진 버튼 생성 (일점사 발동 5초 후)
function _showHaikjinButton(){
  // Ready 플래그 — 탭 전환 후 복귀 시 _restoreSkillButtons가 이 플래그 보고 재생성
  if(combatState)combatState._haikjinReady=true;
  if(document.getElementById('cb-haikjin-btn'))return;
  const hdr=document.getElementById('cb-tactics')||document.getElementById('cb-hdr');
  if(!hdr)return;
  const hbtn=document.createElement('button');
  hbtn.id='cb-haikjin-btn';
  hbtn.className='btn btn-sm';
  hbtn.style.cssText='padding:5px 14px;font-size:14px;min-height:34px;min-width:130px;letter-spacing:.3px;border-color:var(--gold);color:var(--gold);background:rgba(255,215,0,.12);animation:pulse 1.4s infinite;margin-left:3px;white-space:nowrap;flex-shrink:0';
  hbtn.textContent=I18N.t('ult.crane');
  hbtn.title=I18N.t('ult.craneTip');
  hbtn.onclick=activateHaikjin;
  hdr.appendChild(hbtn);
}

// 학익진 포위 진형 셋업 — 아군 함대를 적군 주변 원형으로 배치
//   · 가장 방어력 높은 아군 1대 → 적 정면(앞쪽 중앙) 탱커 슬롯
//   · 나머지 아군은 적군을 둘러싸는 시계 분산 배치
//   · 좌표는 _haikjinTarget(x,y)에 저장하고 drawCombatFrame이 lerp 보간 (천천히 이동)
function _setupHaikjinFormation(){
  if(!combatState||!combatState.players||!combatState.enemies)return;
  const pl=combatState.players.filter(p=>(p.hp||0)>0);
  const en=combatState.enemies.filter(e=>(e.hp||0)>0);
  if(pl.length===0||en.length===0)return;
  combatState._haikjinFormation=true;
  combatState._haikjinT0=performance.now();
  // ── 편대편성 '학익진(crane)' 프리셋과 동일한 진형으로 배치 (사용자 요청 2026-06-17) ──
  //   crane: 6열(0=전방)×8행 그리드의 [col,row] 셀 목록(우선순위 순, 첫 셀=기함).
  //   좌표는 _haikjinTarget(x,y)에 저장 → drawCombatFrame이 lerp 보간(현재의 50% 속도)으로 천천히 수렴.
  const CRANE=(typeof window!=='undefined'&&window.FORMATION_PRESETS&&window.FORMATION_PRESETS.crane)
    ||[[0,0],[0,7],[0,1],[0,6],[1,1],[1,6],[1,2],[1,5],[2,2],[2,5],[2,3],[2,4],[3,3],[3,4],[4,3],[4,4]];
  // 적군 중심/분산 — _unitPos는 drawCombatFrame이 매 프레임 갱신(=_curX/_curY와 동일 로컬 좌표계)
  const _up=_unitPos||{};
  const _eposx=en.map(u=>_up[u.id]?_up[u.id].x:0);
  const _eposy=en.map(u=>_up[u.id]?_up[u.id].y:0);
  const cxE=_eposx.reduce((a,b)=>a+b,0)/Math.max(1,en.length);
  const cyE=_eposy.reduce((a,b)=>a+b,0)/Math.max(1,en.length);
  const spread=Math.max(...en.map(u=>{const p=_up[u.id]||{};return Math.hypot((p.x||0)-cxE,(p.y||0)-cyE);}),120);
  // 셀 간격 — 플레이어 함선 크기 기준 (일반 편대 배치 ×1.7과 유사)
  const pSizes=pl.map(p=>(typeof _shipDrawSize==='function')?_shipDrawSize(p):{w:60,h:40});
  const cellW=Math.max(40,...pSizes.map(s=>s.w))*1.6;
  const cellH=Math.max(28,...pSizes.map(s=>s.h))*1.6;
  // 크레인 진형 앵커: 전방열(col 0)=적 정면 좌측, col 증가 시 후방(좌측)으로 / 8행 세로 중앙(=3.5) 정렬
  const frontX=cxE-spread-cellW*0.8;
  const rowMid=3.5;  // 8행 그리드 중앙
  // 방어 점수 (체력+실드+방어력×10 + 장갑/실드 tier) — 편대편성 프리셋과 동일한 배정 우선순위
  function _defScore(u){
    return (+u.maxHP||+u.hp||1)+(+u.maxSH||0)+(+u.DEF||0)*10+(+u.armorTier||0)*25+(+u.shieldTier||0)*15;
  }
  // 배정 순서 — 기함(첫 함선) 우선, 나머지는 방어 점수 높은 순 (applyFormationPreset과 동일)
  const _flagId=(typeof G!=='undefined'&&G.fleet&&G.fleet[0])?G.fleet[0].id:null;
  const ordered=pl.slice().sort((a,b)=>{
    if(a.id===_flagId)return -1; if(b.id===_flagId)return 1;
    return _defScore(b)-_defScore(a);
  });
  ordered.forEach((p,idx)=>{
    const cell=CRANE[idx]; if(!cell)return;   // 16척(프리셋 셀 수) 초과분은 진형 미지정 → 일반 배치 유지
    p._haikjinTargetX=frontX-cell[0]*cellW;          // col 0=전방(적 가까이), col↑=후방
    p._haikjinTargetY=cyE+(cell[1]-rowMid)*cellH;    // row 0=위, row 7=아래 (중앙 정렬)
  });
}

// 학익진 전술 — 아군 ATT ×3 (일점사 ×2 위에 덮어쓰기, 즉 원본 대비 ×3)
function activateHaikjin(){
  if(!combatState||combatState._haikjinUsed||combatState.done)return;
  // ★ 전술 화자 초상: 학익진 → 이순신 (H01)
  try{_showTacticPortrait('img/chars/hero01.png',12000);}catch(e){}
  combatState._haikjinUsed=true;
  combatState._playerAttMult=3;
  // 사용자 요청 (2026-06-06): 학익진부터 전술 사용마다 함선 속도 +10% 누적
  combatState._tacticSpeedMul=(combatState._tacticSpeedMul||1)+0.10;
  if(combatState.players){
    combatState.players.forEach(p=>{
      if(!p._origATT)p._origATT=p.ATT;
      p.ATT=Math.round(p._origATT*3);
    });
  }
  // 사용자 요청: 학익진 발동 시 아군 함대가 적군을 둘러싸는 원형 포위 진형으로 천천히 이동
  //  · 방어력(DEF+장갑+실드 기반) 가장 높은 아군 1대는 적군 정면(앞쪽)에 배치 — 탱커 역할
  //  · 나머지 아군은 적군 주변에 균등 분산 배치 (시계방향 ARC)
  //  · drawCombatFrame이 매 프레임 sx/sy를 target으로 lerp 보간해 천천히 이동
  try{_setupHaikjinFormation();}catch(e){console.warn('[Haikjin formation]',e);}
  addCombatLog(I18N.t('combat.haikjinActivate'),'gold');
  // 누적 속도 +N% 안내 (사용자 요청 2026-06-06)
  try{addCombatLog(I18N.t('combat.tacticSpeedBoost',{pct:Math.round(((combatState._tacticSpeedMul||1)-1)*100)}),'gold');}catch(e){}
  notify(I18N.t('notify.haikjinActivateShort'),'gold');
  baekgu(I18N.t('baekgu.haikjin'));
  const hbtn=document.getElementById('cb-haikjin-btn');
  if(hbtn)hbtn.disabled=true;
  drawCombatFrame();
  // ── 학익진 5초 후 → 아인슈타인 시간차공격 버튼 활성화 (사용자 명세: 넬슨+이순신+아인슈타인) ──
  const _h2=G.heroes||[];
  if(!(_h2.includes('H01')&&_h2.includes('H05')&&_h2.includes('H06')))return;
  combatState._einsteinPending=true;
  try{_startTacticGauge(I18N.t('ult.einstein'),5000);}catch(e){}
  setTimeout(()=>{
    if(!combatState||combatState.done||!combatState._einsteinPending||combatState._einsteinUsed)return;
    _showEinsteinButton();
    addCombatLog(I18N.t('combat.einsteinReady'),'gold');
    notify(I18N.t('notify.einsteinReadyShort'),'gold');
  },5000);
}

// 아인슈타인 시간차공격 버튼 생성 (학익진 발동 30초 후)
function _showEinsteinButton(){
  if(combatState)combatState._einsteinReady=true;
  if(document.getElementById('cb-einstein-btn'))return;
  const hdr=document.getElementById('cb-tactics')||document.getElementById('cb-hdr');
  if(!hdr)return;
  const ebtn=document.createElement('button');
  ebtn.id='cb-einstein-btn';
  ebtn.className='btn btn-sm';
  ebtn.style.cssText='padding:5px 14px;font-size:14px;min-height:34px;min-width:130px;letter-spacing:.3px;border-color:#cc66ff;color:#cc66ff;background:rgba(204,102,255,.12);animation:pulse 1.2s infinite;margin-left:3px;white-space:nowrap;flex-shrink:0';
  ebtn.textContent=I18N.t('ult.einstein');
  ebtn.title=I18N.t('ult.einsteinTip');
  ebtn.onclick=activateEinsteinTimeAttack;
  hdr.appendChild(ebtn);
}

// 아인슈타인 시간차공격 — 아군 ATT ×4
function activateEinsteinTimeAttack(){
  if(!combatState||combatState._einsteinUsed||combatState.done)return;
  // ★ 전술 화자 초상: 시간차공격 → 아인슈타인 (H06)
  try{_showTacticPortrait('img/chars/hero06.png',12000);}catch(e){}
  combatState._einsteinUsed=true;
  combatState._playerAttMult=4;
  combatState._tacticSpeedMul=(combatState._tacticSpeedMul||1)+0.10;  // +10% 누적 (학익진 이후 전술)
  if(combatState.players){
    combatState.players.forEach(p=>{
      if(!p._origATT)p._origATT=p.ATT;
      p.ATT=Math.round(p._origATT*4);
    });
  }
  addCombatLog(I18N.t('combat.einsteinActivate'),'gold');
  try{addCombatLog(I18N.t('combat.tacticSpeedBoost',{pct:Math.round(((combatState._tacticSpeedMul||1)-1)*100)}),'gold');}catch(e){}
  notify(I18N.t('notify.einsteinActivateShort'),'gold');
  baekgu(I18N.t('baekgu.einsteinRelativity'));
  const ebtn=document.getElementById('cb-einstein-btn');
  if(ebtn)ebtn.disabled=true;
  drawCombatFrame();
  // ── 시간차공격 5초 후 → 테슬라 초공간 버튼 활성화 (사용자 명세: 넬슨+이순신+아인슈타인+테슬라) ──
  const _h3=G.heroes||[];
  if(!(_h3.includes('H01')&&_h3.includes('H05')&&_h3.includes('H06')&&_h3.includes('H07')))return;
  combatState._teslaPending=true;
  try{_startTacticGauge(I18N.t('ult.tesla'),5000);}catch(e){}
  setTimeout(()=>{
    if(!combatState||combatState.done||!combatState._teslaPending||combatState._teslaUsed)return;
    _showTeslaButton();
    addCombatLog(I18N.t('combat.teslaReady'),'gold');
    notify(I18N.t('notify.teslaReady'),'gold');
  },5000);
}

// 테슬라 초공간 버튼 생성 (시간차공격 발동 5초 후)
function _showTeslaButton(){
  if(combatState)combatState._teslaReady=true;
  if(document.getElementById('cb-tesla-btn'))return;
  const hdr=document.getElementById('cb-tactics')||document.getElementById('cb-hdr');
  if(!hdr)return;
  const tbtn=document.createElement('button');
  tbtn.id='cb-tesla-btn';
  tbtn.className='btn btn-sm';
  tbtn.style.cssText='padding:5px 14px;font-size:14px;min-height:34px;min-width:130px;letter-spacing:.3px;border-color:#66ffff;color:#66ffff;background:rgba(0,255,255,.12);animation:pulse 1s infinite;margin-left:3px;text-shadow:0 0 6px rgba(0,255,255,.6);white-space:nowrap;flex-shrink:0';
  tbtn.textContent=I18N.t('ult.tesla');
  tbtn.title=I18N.t('ult.teslaTip');
  tbtn.onclick=activateTeslaHyperspace;
  hdr.appendChild(tbtn);
}

// 테슬라 초공간 — 아군 ATT ×5
function activateTeslaHyperspace(){
  if(!combatState||combatState._teslaUsed||combatState.done)return;
  // ★ 전술 화자 초상: 테슬라 초공간 → 니콜라 테슬라 (H07)
  try{_showTacticPortrait('img/chars/hero07.png',12000);}catch(e){}
  combatState._teslaUsed=true;
  combatState._playerAttMult=5;
  combatState._tacticSpeedMul=(combatState._tacticSpeedMul||1)+0.10;  // +10% 누적 (학익진 이후 전술)
  if(combatState.players){
    combatState.players.forEach(p=>{
      if(!p._origATT)p._origATT=p.ATT;
      p.ATT=Math.round(p._origATT*5);
    });
  }
  addCombatLog(I18N.t('combat.teslaActivate'),'gold');
  try{addCombatLog(I18N.t('combat.tacticSpeedBoost',{pct:Math.round(((combatState._tacticSpeedMul||1)-1)*100)}),'gold');}catch(e){}
  notify(I18N.t('notify.teslaActivateShort'),'gold');
  baekgu(I18N.t('baekgu.teslaHyperspace'));
  // 발동 순간 전기장 플래시 — 모든 아군 함선 위치에 번개 폭발
  if(combatState.players&&_unitPos){
    let _flashDelay=0;
    combatState.players.forEach(p=>{
      if(p.hp<=0)return;
      const pos=_unitPos[p.id];
      if(!pos)return;
      const a=_txPos(pos);
      _cbEffects.push({type:'exp',x:a.x,y:a.y,col:'#66ddff',r:30,life:24,maxLife:24,delay:_flashDelay});
      _cbEffects.push({type:'shockwave',x:a.x,y:a.y,col:'#aaeeff',r:60,life:30,maxLife:30,delay:_flashDelay});
      _flashDelay+=2;
    });
    _cbStartAnimLoop();
  }
  const tbtn=document.getElementById('cb-tesla-btn');
  if(tbtn)tbtn.disabled=true;
  drawCombatFrame();
  // ── 테슬라 5초 후 → 제네시스 임펙트 버튼 활성화 (사용자 명세: 넬슨+이순신+아인슈타인+테슬라+광개토) ──
  const _h4=G.heroes||[];
  if(!(_h4.includes('H01')&&_h4.includes('H03')&&_h4.includes('H05')&&_h4.includes('H06')&&_h4.includes('H07')))return;
  combatState._genesisPending=true;
  try{_startTacticGauge(I18N.t('ult.genesis'),5000);}catch(e){}
  setTimeout(()=>{
    if(!combatState||combatState.done||!combatState._genesisPending||combatState._genesisUsed)return;
    _showGenesisButton();
    addCombatLog(I18N.t('combat.genesisReady',{n:G.heroes.length}),'gold');
    notify(I18N.t('notify.genesisReadyShort'),'gold');
  },5000);
}

// 제네시스 임펙트 버튼 생성 (테슬라 발동 5초 후)
function _showGenesisButton(){
  if(combatState)combatState._genesisReady=true;
  if(document.getElementById('cb-genesis-btn'))return;
  const hdr=document.getElementById('cb-tactics')||document.getElementById('cb-hdr');
  if(!hdr)return;
  const gbtn=document.createElement('button');
  gbtn.id='cb-genesis-btn';
  gbtn.className='btn btn-sm';
  gbtn.style.cssText='padding:5px 14px;font-size:14px;min-height:34px;min-width:130px;letter-spacing:.3px;border-color:#ff66cc;color:#ff66cc;background:rgba(255,102,204,.15);animation:pulse .9s infinite;margin-left:3px;text-shadow:0 0 8px rgba(255,102,204,.7);white-space:nowrap;flex-shrink:0';
  gbtn.textContent=I18N.t('ult.genesis');
  gbtn.title=I18N.t('ult.genesisTip');
  gbtn.onclick=activateGenesisImpact;
  hdr.appendChild(gbtn);
}

// 제네시스 임펙트 — 아군 ATT ×6
function activateGenesisImpact(){
  if(!combatState||combatState._genesisUsed||combatState.done)return;
  // ★ 전술 화자 초상: 제네시스 임펙트 → 광개토대왕 (H03)
  try{_showTacticPortrait('img/chars/hero03.png',12000);}catch(e){}
  combatState._genesisUsed=true;
  combatState._playerAttMult=6;
  combatState._tacticSpeedMul=(combatState._tacticSpeedMul||1)+0.10;  // +10% 누적 (학익진 이후 전술)
  if(combatState.players){
    combatState.players.forEach(p=>{
      if(!p._origATT)p._origATT=p.ATT;
      p.ATT=Math.round(p._origATT*6);
    });
  }
  addCombatLog(I18N.t('combat.genesisActivate'),'gold');
  try{addCombatLog(I18N.t('combat.tacticSpeedBoost',{pct:Math.round(((combatState._tacticSpeedMul||1)-1)*100)}),'gold');}catch(e){}
  notify(I18N.t('notify.genesisActivateShort'),'gold');
  baekgu(I18N.t('baekgu.genesisImpact'));
  const gbtn=document.getElementById('cb-genesis-btn');
  if(gbtn)gbtn.disabled=true;
  drawCombatFrame();
  // ── 제네시스 5초 후 → 데스티네이션 어스 버튼 활성화 (ATT ×10) ──
  // 영웅 8명 모두 영입 시에만 활성화
  if(!G.heroes||G.heroes.length<8)return;
  combatState._destinationPending=true;
  try{_startTacticGauge(I18N.t('ult.destEarth'),5000);}catch(e){}
  setTimeout(()=>{
    if(!combatState||combatState.done||!combatState._destinationPending||combatState._destinationUsed)return;
    _showDestinationButton();
    addCombatLog(I18N.t('combat.destinationReady'),'gold');
    notify(I18N.t('notify.destinationReadyShort'),'gold');
  },5000);
}

// 데스티네이션 어스 버튼 생성 (제네시스 발동 5초 후)
function _showDestinationButton(){
  if(combatState)combatState._destinationReady=true;
  if(document.getElementById('cb-destination-btn'))return;
  const hdr=document.getElementById('cb-tactics')||document.getElementById('cb-hdr');
  if(!hdr)return;
  const dbtn=document.createElement('button');
  dbtn.id='cb-destination-btn';
  dbtn.className='btn btn-sm';
  dbtn.style.cssText='padding:3px 15px;font-size:17px;min-height:34px;border:2px solid #ffd700;color:#ffd700;background:linear-gradient(135deg,rgba(255,215,0,.18),rgba(255,100,200,.18),rgba(102,255,255,.18));animation:pulse .7s infinite;margin-left:3px;text-shadow:0 0 10px gold;font-weight:bold;white-space:nowrap;flex-shrink:0';
  dbtn.textContent=I18N.t('ult.destEarth');
  dbtn.title=I18N.t('ult.destEarthTip');
  dbtn.onclick=activateDestinationEarth;
  hdr.appendChild(dbtn);
}

// 데스티네이션 어스 — 아군 ATT ×10 (콤보 최종)
function activateDestinationEarth(){
  if(!combatState||combatState._destinationUsed||combatState.done)return;
  // ★ 전술 화자 초상: 데스티네이션 어스 → 주인공 (성별 기반 commander_m/f.png, 없으면 자동 폴백)
  try{_showTacticPortrait(_commanderPortraitSrc(),14000);}catch(e){}
  combatState._destinationUsed=true;
  combatState._playerAttMult=10;
  combatState._tacticSpeedMul=(combatState._tacticSpeedMul||1)+0.10;  // +10% 누적 (학익진 이후 전술)
  if(combatState.players){
    combatState.players.forEach(p=>{
      if(!p._origATT)p._origATT=p.ATT;
      p.ATT=Math.round(p._origATT*10);
    });
  }
  addCombatLog(I18N.t('combat.destinationActivate'),'gold');
  try{addCombatLog(I18N.t('combat.tacticSpeedBoost',{pct:Math.round(((combatState._tacticSpeedMul||1)-1)*100)}),'gold');}catch(e){}
  notify(I18N.t('notify.destinationActivateShort'),'gold');
  baekgu(I18N.t('baekgu.destinationEarth'));
  const dbtn=document.getElementById('cb-destination-btn');
  if(dbtn)dbtn.disabled=true;
  drawCombatFrame();
}

// ── 세이브 슬롯 시스템 (저장/불러오기/백업 복구/슬롯 UI) → js/modules/save-slots.js 로 분할 (2026-06-12, 사용자 요청: 긴 코드 분할)

// ── 명예의 전당 (ACT4/ACT5 기록 + 글로벌 랭킹) → js/modules/hall-of-fame.js 로 분할 (2026-06-12, 사용자 요청: 긴 코드 분할)

// ── 피드백 전송 모달 → js/modules/feedback.js 로 분할 (2026-06-12, 사용자 요청: 긴 코드 분할)

// ── 설정 모달 + 오프라인 백업 → js/modules/settings-backup.js 로 분할 (2026-06-12, 사용자 요청: 긴 코드 분할)
//   showSettingsModal / _saveFilename / exportSaveFile / exportAllSavesFile / importSaveFile / copySaveToClipboard

// ── 클라우드 세이브 UI 핸들러 ──────────────────────────────────────
function _cloudStatusText(){
  try{
    const cs=window.CloudSave;
    if(!cs)return I18N.t('cloud.notLoaded');
    const u=cs.getUser&&cs.getUser();
    const d=cs.diag&&cs.diag();
    let main='';
    if(!u){
      if(d&&!d.firebaseLoaded)main=I18N.t('cloud.sdkNotLoaded');
      else if(d&&d.firebaseLoaded&&!d.ready)main=I18N.t('cloud.initializing');
      else main=I18N.t('cloud.localOnly');
    } else if(u.isAnonymous){
      main=I18N.t('cloud.anonymous',{uid:u.uid.slice(0,8)});
    } else {
      main=I18N.t('cloud.signedIn',{who:(u.email||u.displayName||I18N.t('cloud.loggedIn'))});
    }
    // 진단 추가
    let diagLine='';
    if(d){
      const upMs=d.lastUploadAt?I18N.t('cloud.upMsAgo',{n:Math.round((Date.now()-d.lastUploadAt)/1000)}):I18N.t('cloud.upNone');
      diagLine+=`<div style="font-size:11px;color:var(--muted);margin-top:4px">${I18N.t('ui.uploadStats',{n:d.uploadCount||0,ts:upMs})}`;
      if(d.queueSize>0)diagLine+=I18N.t('ui.queueWaiting',{n:d.queueSize});
      if(d.lastUploadError)diagLine+=`<br><span style="color:var(--red)">${I18N.t('ui.lastUploadError',{msg:d.lastUploadError.slice(0,80)})}</span>`;
      diagLine+='</div>';
    }
    return main+diagLine;
  }catch(e){return I18N.t('cloud.errorPrefix',{err:e.message});}
}
async function cloudGoogleSignIn(){
  if(!window.CloudSave){notify(I18N.t('notify.cloudModuleNotLoaded'),'err');return;}
  notify(I18N.t('notify.googleLoginOpen'),'ok');
  const r=await CloudSave.signInGoogle();
  if(r.error)notify(I18N.t('notify.loginFailErr',{err:r.error}),'err');
  else{notify(I18N.t('notify.googleConnectOk'),'gold');showSettingsModal();}
}
async function cloudPushAll(){
  if(!window.CloudSave){notify(I18N.t('notify.cloudModuleNotLoaded'),'err');return;}
  // 모듈 초기화 안 됐으면 강제 재시도
  const d=CloudSave.diag&&CloudSave.diag();
  if(!d||!d.user){
    notify(I18N.t('notify.cloudInitTrying'),'warn');
    try{await CloudSave.init();await new Promise(r=>setTimeout(r,1500));}catch(e){}
  }
  const u=CloudSave.getUser&&CloudSave.getUser();
  if(!u){
    notify(I18N.t('notify.cloudLoginFail'),'err');
    return;
  }
  const r=await CloudSave.pushAll();
  if(r.error)notify(I18N.t('notify.uploadFail',{err:r.error}),'err');
  else notify(I18N.t('notify.uploadDone',{n:r.pushed,uid:u.uid.slice(0,8)}),'gold');
  setTimeout(()=>showSettingsModal(),500);  // 상태 갱신
}
async function cloudPullAll(){
  if(!window.CloudSave){notify(I18N.t('notify.cloudModuleNotLoaded'),'err');return;}
  const r=await CloudSave.pullAll();
  notify(I18N.t('notify.downloadDone',{n:r.pulled||0}),'ok');
}
async function cloudSignOut(){
  if(!window.CloudSave)return;
  await CloudSave.signOut();
  notify(I18N.t('notify.logoutAnon'),'ok');
  showSettingsModal();
}

// ── 보스 진입 / 보이드 창 ────────────────────────────────────────
// 강제 보스 재도전 — 조건/크리스탈 무시하고 우르사 메이저 보스전 즉시 시작
// (지구 접근 시 보스 미출현 버그 복구용 + 격파 후 재도전용)
function forceUrsaBoss(){
  openModal(I18N.t('modal.ursaForcedFight'),
    `<div style="text-align:center;padding:14px">
      <div style="font-size:46px;margin-bottom:8px">☠️</div>
      <div style="color:var(--red);font-weight:bold;font-size:16px;margin-bottom:8px">${I18N.t('ui.forcedUrsa')}</div>
      <div style="color:var(--dim);font-size:13px;line-height:1.8">${I18N.t('ui.forceUrsaBossHelp')}<br>${I18N.t('ui.noVcConsumed')}</div>
    </div>`,
    [{txt:I18N.t('btn.startCombat'),fn:()=>{closeModal();try{if(typeof showUrsaMajorIntro==='function')showUrsaMajorIntro();else startCombat({id:'BOSS',nm:I18N.t('ursa.bossName'),ring:5});}catch(e){notify(I18N.t('notify.bossStartErr',{err:e.message}),'err');}},cls:'btn-red'},
     {txt:I18N.t('btn.cancel'),fn:closeModal,cls:'btn-sm'}]);
}
try{if(typeof window!=='undefined')window.forceUrsaBoss=forceUrsaBoss;}catch(e){}
function tryBossEntry(){
  // 사용자 요청 2026-06-09: 전투 중 보스전 진입도 차단 (이중 안전망)
  if(window.combatState&&!window.combatState.done){
    try{notify(I18N.t('notify.combatTravelBlocked')||'⚔️ 전투 중에는 보스전에 진입할 수 없습니다.','err');}catch(e){}
    return;
  }
  // 첫 도전 판정 — 실제 격파 흔적(BOSS_URSA 나포함 OR 엔딩 시청)이 없으면 "첫 도전"으로 간주.
  //   _earthLiberated 만 켜져 있고 격파 흔적이 없는 손상 상태(B2 후속)에서도 보스가 정상 트리거되도록 보장.
  const _isFirst=!_isUrsaDefeated();
  // ── 사용자 요청: 지구 해방 보스전 입장 시 거북선(LGD01) 신화 함선 1대 필수 보유 ──
  //   catalogId/catId/id 어느 쪽이든 'LGD01'을 포함하면 거북선으로 인정 (제작 함선 id 'LGD01_craft_xxx' 포함)
  const _hasTurtleShip=(G.fleet||[]).some(s=>{
    const _cid=String(s.catalogId||s.catId||s.id||'').toUpperCase();
    return _cid==='LGD01'||_cid.startsWith('LGD01_')||_cid.startsWith('LGD01-');
  });
  if(!_hasTurtleShip){
    notify(I18N.t('notify.needTurtleShip'),'err');
    openModal(I18N.t('modal.bossEntryBlocked'),
      `<div style="text-align:center;padding:14px">
        <div style="font-size:46px;margin-bottom:8px">🛡️</div>
        <div style="color:var(--yellow);font-weight:bold;font-size:16px;margin-bottom:8px">${I18N.t('ui.needTurtleShipTitle')}</div>
        <div style="color:var(--dim);font-size:13px;line-height:1.8;word-break:keep-all">${I18N.t('ui.needTurtleShipDesc')}</div>
      </div>`,
      [{txt:I18N.t('btn.confirm'),fn:closeModal,cls:'btn-gold'}]);
    return;
  }
  // 첫 도전이 아니라면 (재도전) 보이드 크리스탈 필요
  if(!_isFirst&&(!G.voidCrystal||G.voidCrystal<=0)){
    notify(I18N.t('notify.noVoidCrystal'),'err');return;
  }
  const _hint=_isFirst
    ?`<div style="color:#ffd700;font-weight:bold;margin-bottom:6px">${I18N.t('ui.firstEarthEntry')}</div><div style="color:var(--dim);margin-bottom:12px">${I18N.t('ui.firstBossFree')}<br>${I18N.t('ui.winLiftsBlockade')}</div>`
    :`<div style="color:var(--dim);margin-bottom:12px">${I18N.t('ui.finalBossIntro')}<br>${I18N.t('ui.winClearsGame')}</div><div style="font-size:13px;color:var(--yellow)">${I18N.t('ui.crystalsOwnedFull',{n:G.voidCrystal||0})}</div>`;
  openModal(I18N.t('modal.ursaFinalFight'),
    `<div style="text-align:center;padding:12px">
      <div style="font-size:48px;margin-bottom:8px">🌀</div>
      <div style="color:var(--red);font-weight:bold;margin-bottom:8px">${I18N.t('ui.extremeDangerWarn')}</div>
      ${_hint}
    </div>`,
    [{txt:I18N.t('ursa.fightEnter'),fn:()=>{if(!_isFirst)G.voidCrystal--;closeModal();showUrsaMajorIntro();},cls:'btn-red'},
     {txt:I18N.t('btn.cancel'),fn:closeModal,cls:'btn-sm'}]);
}
// 우르사 메이저 보스 대사 인트로 — 페이즈 6 컷씬(p6_ch13b)으로 전면 교체 (사용자 요청 2026-06-07)
// 기존 8단계 보스 대사는 phase6_quests.js / PHASE6_CUTSCENES_KO.p6_ch13b 로 이관.
// 페이즈 6 컷씬 미로드 환경(이전 세이브 등)을 위해 8단계 폴백 로직 유지.
function showUrsaMajorIntro(){
  try{AudioMgr.playBgm('boss');}catch(e){}
  // 페이즈 6 컷씬 우선 — STORY_SCENES_PC 가 있고 p6_ch13b 가 로드돼 있으면 그것으로 재생
  if(window.STORY_SCENES_PC && typeof window.STORY_SCENES_PC.triggerScene==='function'
     && window.PHASE6_CUTSCENES_KO && window.PHASE6_CUTSCENES_KO['p6_ch13b']){
    window.STORY_SCENES_PC.forceReplayScene
      ? window.STORY_SCENES_PC.forceReplayScene('p6_ch13b')
      : window.STORY_SCENES_PC.triggerScene('p6_ch13b', ()=>{
          try{startCombat({id:'BOSS',nm:I18N.t('ursa.bossName'),ring:5});}catch(e){notify(I18N.t('notify.bossStartErr',{err:e.message}),'err');}
        });
    // STORY_SCENES_PC triggerScene 은 onDone 콜백을 지원 — 컷씬 종료 후 자동 전투 진입
    // forceReplayScene 은 onDone 없으므로, 폴백으로 4초 후 전투 진입
    if(window.STORY_SCENES_PC.forceReplayScene){
      setTimeout(()=>{
        try{startCombat({id:'BOSS',nm:I18N.t('ursa.bossName'),ring:5});}catch(e){notify(I18N.t('notify.bossStartErr',{err:e.message}),'err');}
      }, 4000);
    }
    return;
  }
  // ── 폴백 (페이즈 6 미로드 환경): 기존 8단계 i18n 대사 ──
  const cmdName=G.profile?.name||I18N.t('ui.commander');
  const _bossEnemies=[];
  if(typeof BOSS!=='undefined')_bossEnemies.push({...BOSS,id:'BOSS_MAIN',isEnemy:true,nm:BOSS.nm,tier:BOSS.tier,maxHP:BOSS.maxHP,maxSH:BOSS.maxSH,ATT:BOSS.ATT,INT:BOSS.INT,TEC:BOSS.TEC});
  if(typeof BOSS_ESCORT!=='undefined')BOSS_ESCORT.forEach(e=>_bossEnemies.push({...e}));
  const _bossSpecHTML=(typeof _formatEnemyPreview==='function')?_formatEnemyPreview(_bossEnemies):'';
  const _spUrsa=I18N.t('speaker.ursaMajor');
  const _spBk=I18N.t('speaker.baekgu');
  const lines=[
    {sp:I18N.t('actTrans.2.sysSp'),tx:I18N.t('ursa.intro.sys1')},
    {sp:_spUrsa,tx:I18N.t('ursa.intro.ursa1')},
    {sp:_spUrsa,tx:I18N.t('ursa.intro.ursa2')},
    {sp:cmdName,tx:I18N.t('ursa.intro.cmd1')},
    {sp:_spUrsa,tx:I18N.t('ursa.intro.ursa3')},
    {sp:_spUrsa,tx:I18N.t('ursa.intro.ursa4')},
    {sp:_spBk,tx:I18N.t('ursa.intro.bk')},
    {sp:cmdName,tx:I18N.t('ursa.intro.cmd2')}
  ];
  let _idx=0;
  function _renderLine(){
    const l=lines[_idx];
    const _isUrsa2=(l.sp==='우르사 메이저'||l.sp==='Ursa Major');
    const _isSys2=(l.sp==='시스템'||l.sp==='System');
    const _isBk2=(l.sp==='백구'||l.sp==='Baekgu');
    const spColor=_isUrsa2?'#ff3366':_isSys2?'var(--cyan)':_isBk2?'var(--cyan)':'var(--gold)';
    const spIc=_isUrsa2?'☠️':_isSys2?'⚡':_isBk2?'🐕':'⚑';
    const portrait=charPortraitHTML(l.sp,spIc,192,spColor);
    const isFinal=_idx===lines.length-1;
    openModal(I18N.t('modal.ursaFinalShowdown'),
      `<div style="padding:14px;min-height:220px">
        <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;justify-content:center;margin-bottom:14px;padding:14px;background:linear-gradient(135deg,rgba(255,30,80,.08),rgba(20,5,5,.7));border:1px solid rgba(255,80,80,.45);border-radius:10px;box-shadow:0 0 18px rgba(255,40,40,.2)">
          ${portrait}
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;color:${spColor};font-weight:bold;margin-bottom:6px;letter-spacing:1px;word-break:keep-all;overflow-wrap:break-word">${l.sp}</div>
            <div style="font-size:17px;color:var(--yellow);line-height:1.8;word-break:keep-all;overflow-wrap:break-word;hyphens:none">"${l.tx}"</div>
          </div>
        </div>
        ${isFinal?_bossSpecHTML:''}
        <div style="text-align:center;font-size:11px;color:var(--dim)">${_idx+1} / ${lines.length}</div>
      </div>`,
      [
        _idx<lines.length-1
          ? {txt:I18N.t('ui.continueArrow'),fn:()=>{_idx++;_renderLine();},cls:'btn-red'}
          : {txt:I18N.t('ursa.startFinalBattle'),fn:()=>{closeModal();_safeCombatEntry(function(){startCombat({id:"BOSS",nm:I18N.t("ursa.bossName"),ring:5});},"startCombat(BOSS)");},cls:'btn-red'},
        {txt:I18N.t('ursa.later'),fn:()=>{closeModal();G.voidCrystal++;notify(I18N.t('notify.voidCrystalRefund'),'warn');},cls:'btn-sm'}
      ],
      {bossfight:true}
    );
  }
  _renderLine();
}

// ─── 우르사 메이저 2페이즈 진입 팝업 (호위 전멸 → 본체 각성) ───
function _showUrsaPhase2Popup(onClose){
  const _line=I18N.t('ursa.phase2Line');
  // 사용자 요청 (2026-06-06): 영문판에서 화자명 한글 잔재 제거 — i18n speaker 라우팅 (CHAR_PORTRAITS에 EN alias 있음)
  const portrait=(typeof charPortraitHTML==='function')?charPortraitHTML(I18N.t('speaker.ursaMajor'),'☠️',216,'#ff3366'):'';
  openModal(I18N.t('modal.ursaPhase2'),
    `<div style="padding:14px;min-height:160px">
      <div style="display:flex;gap:26px;align-items:center;flex-wrap:wrap;justify-content:center;padding:16px;background:linear-gradient(135deg,rgba(255,30,80,.1),rgba(20,5,5,.88));border:1.5px solid rgba(255,80,80,.6);border-radius:12px;box-shadow:0 0 26px rgba(255,40,40,.4)">
        ${portrait}
        <div style="flex:1;min-width:200px">
          <div style="font-size:14px;color:#ff3366;font-weight:bold;margin-bottom:8px;letter-spacing:2px">${I18N.t('ursa.bossNameStory')}</div>
          <div style="font-size:19px;color:var(--yellow);line-height:1.85;word-break:keep-all;text-shadow:0 0 8px rgba(255,60,60,.45)">"${_line}"</div>
          <div style="font-size:12px;color:#ff9999;margin-top:10px">${I18N.t('ui.ursaShieldDown')}</div>
        </div>
      </div>
    </div>`,
    [{txt:I18N.t('ui.keepFighting'),fn:()=>{closeModal();if(typeof onClose==='function')onClose();},cls:'btn-red'}],
    {bossfight:true}
  );
}
// ─── 블랙팔콘 히든전: 호위 전멸 → 본체 각성 팝업 ───
function _showBlackfalconPhase2Popup(onClose){
  const _line=I18N.t('falcon.afterUrsa');
  // 사용자 요청 (2026-06-06): 영문판 화자명 한글 잔재 제거 — i18n 라우팅
  const portrait=(typeof charPortraitHTML==='function')?charPortraitHTML(I18N.t('speaker.blackfalcon'),'🌑',216,'#cc66ff'):'';
  openModal(I18N.t('modal.blackfalconAwaken'),
    `<div style="padding:14px;min-height:160px">
      <div style="display:flex;gap:26px;align-items:center;flex-wrap:wrap;justify-content:center;padding:16px;background:linear-gradient(135deg,rgba(120,0,180,.18),rgba(8,2,18,.92));border:1.5px solid rgba(204,102,255,.6);border-radius:12px;box-shadow:0 0 26px rgba(204,102,255,.4)">
        ${portrait}
        <div style="flex:1;min-width:200px">
          <div style="font-size:14px;color:#cc66ff;font-weight:bold;margin-bottom:8px;letter-spacing:2px">${I18N.t('falcon.bossNameStory')}</div>
          <div style="font-size:19px;color:#e0c0ff;line-height:1.85;word-break:keep-all;text-shadow:0 0 8px rgba(204,102,255,.5)">"${_line}"</div>
          <div style="font-size:12px;color:#e0b8ff;margin-top:10px">${I18N.t('ui.falconCoreOpen')}</div>
        </div>
      </div>
    </div>`,
    [{txt:I18N.t('ui.keepFighting'),fn:()=>{closeModal();if(typeof onClose==='function')onClose();},cls:'btn-red'}],
    {bossfight:true}
  );
}
// ─── 보스 격파 에필로그 — 지구 해방 엔딩 (격정적 대사 → onDone 콜백) ─
// 우르사 메이저 단말마 → 백구·주인공 격정 대사 → 지구 해방 선언으로 완벽 마무리
// ※ 보이드/추가 컨텐츠 언급 제거 — 우르사 메이저 격파가 진정한 엔딩
function showBossVictoryEpilogue(onDone){
  const cmdName=G.profile?.name||I18N.t('ui.commander');
  // 사용자 요청 (2026-06-06): 영문판 화자명 한글 잔재 제거 — i18n 라우팅
  const _spUrsa=I18N.t('speaker.ursaMajor');
  const _spBk=I18N.t('speaker.baekgu');
  const _spSys=I18N.t('actTrans.2.sysSp');
  const _raw=[
    {sp:_spUrsa,tx:I18N.t('ursa.outro.1')},
    {sp:_spUrsa,tx:I18N.t('ursa.outro.2')},
    {sp:_spUrsa,tx:I18N.t('ursa.outro.3')},
    {sp:_spSys,tx:I18N.t('ursa.outro.sys1')},
    {sp:_spBk,tx:I18N.t('ui.victoryLine1',{nm:cmdName})},
    {sp:_spBk,tx:I18N.t('ursa.outro.bk')},
    {sp:_spSys,tx:I18N.t('ursa.outro.sys2')},
    {sp:cmdName,tx:I18N.t('ursa.outro.cmd1')},
    {sp:cmdName,tx:I18N.t('ursa.outro.cmd2')},
    {sp:_spBk,tx:I18N.t('ui.victoryLine2',{nm:cmdName})},
    {sp:cmdName,tx:I18N.t('ursa.outro.cmd3')},
    {sp:_spSys,tx:I18N.t('ursa.outro.sys3')}
  ];
  // 사용자 요청 2026-06-17: 에필로그 팝업(openModal) → 풀스크린 컷신(STORY_SCENES_PC)으로 변경.
  //   화자별 char(초상)·color 매핑 — 우르사='ursa', 시스템='system', 백구='baekgu1', 사령관='commander'.
  const scenes=_raw.map(function(l){
    let _char,_color;
    if(l.sp===_spUrsa){_char='ursa';_color='#ff3366';}
    else if(l.sp===_spSys){_char='system';_color='#66ffcc';}
    else if(l.sp===_spBk){_char='baekgu1';_color='#66ddff';}
    else {_char='commander';_color='#00f3ff';}
    return {char:_char,name:l.sp,color:_color,text:l.tx};
  });
  if(window.STORY_SCENES_PC&&typeof window.STORY_SCENES_PC.showCharDialog==='function'){
    window.STORY_SCENES_PC.showCharDialog({scenes:scenes,onDone:function(){if(typeof onDone==='function')onDone();}});
  } else {
    // 폴백: 컷신 시스템 미로드 시에도 진행 보장
    if(typeof onDone==='function')onDone();
  }
}

// ─── 보스 격파 특별 셀레브레이션 팝업 (지구 해방 선언) ──────────
function showBossCelebration(onDone){
  const cmdName=G.profile?.name||I18N.t('ui.commander');
  const co=G.profile?.company||I18N.t('profile.companyGalactic');
  const turn=G.turn||0;
  // 함대 통계
  const fleetCount=(G.fleet||[]).length;
  const heroCount=(G.heroes||[]).length;
  const survivors=(G.fleet||[]).filter(s=>s.hp>0).length;
  const html=`
    <div style="padding:22px 18px;text-align:center;background:radial-gradient(ellipse at center,rgba(20,20,60,.6),rgba(0,0,0,.95));border-radius:8px">
      <img src="${(typeof planetImgSrc==='function')?planetImgSrc('P31'):'img/planets/P31.png'}" alt="" style="width:92px;height:92px;border-radius:50%;object-fit:cover;margin-bottom:8px;animation:pulse 1.4s infinite;box-shadow:0 0 30px gold,0 0 60px rgba(255,215,0,.45);border:2px solid rgba(255,215,0,.6);display:inline-block" onerror="this.replaceWith(Object.assign(document.createElement('div'),{textContent:'🌍',style:'font-size:64px;margin-bottom:8px;animation:pulse 1.4s infinite;text-shadow:0 0 30px gold,0 0 60px gold'}))">
      <div style="font-size:30px;font-weight:bold;background:linear-gradient(90deg,#ffd700,#ff66cc,#66ffff,#ffd700);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;letter-spacing:8px;margin-bottom:6px;background-size:200% 100%;animation:shimmer 3s linear infinite">${I18N.t('ui.earthFreedom')}</div>
      <div style="font-size:13px;color:var(--cyan);letter-spacing:3px;margin-bottom:18px">EARTH LIBERATED · 100Y SIEGE ENDED</div>
      <div style="display:flex;justify-content:space-around;flex-wrap:wrap;gap:14px;margin:18px 0;padding:14px;background:rgba(255,215,0,.06);border:1px solid rgba(255,215,0,.3);border-radius:10px">
        <div><div style="font-size:11px;color:var(--dim)">${I18N.t('ui.turnsRequired')}</div><div style="font-size:22px;color:var(--gold);font-weight:bold">${turn}</div></div>
        <div><div style="font-size:11px;color:var(--dim)">${I18N.t('ui.shipsAlive')}</div><div style="font-size:22px;color:#66ff99;font-weight:bold">${survivors}/${fleetCount}</div></div>
        <div><div style="font-size:11px;color:var(--dim)">${I18N.t('ui.recruitedHeroes2')}</div><div style="font-size:22px;color:#ff99ff;font-weight:bold">${heroCount}</div></div>
        <div><div style="font-size:11px;color:var(--dim)">${I18N.t('ui.gainedCredits')}</div><div style="font-size:22px;color:var(--gold);font-weight:bold">₡${(G.credits||0).toLocaleString()}</div></div>
      </div>
      <div style="font-size:15px;color:var(--yellow);line-height:1.8;margin:14px 0;padding:14px;background:rgba(255,255,255,.02);border-left:3px solid var(--gold);text-align:left">
        ${I18N.t('ui.endingFleetText',{co,nm:cmdName})}<br><br>
        ${I18N.t('ui.endingLine1')}<br>
        ${I18N.t('ui.endingLine2')}<br><br>
        <span style="color:#ffd700;font-weight:bold">${I18N.t('ui.endingDedication',{nm:cmdName})}</span>
      </div>
      <div style="font-size:13px;color:var(--gold);margin-top:18px;letter-spacing:4px;text-shadow:0 0 12px rgba(255,215,0,.5)">— THE END —</div>
      <div style="font-size:11px;color:var(--dim);margin-top:6px;letter-spacing:3px">— DESTINATION EARTH —</div>
    </div>
    <style>
      @keyframes shimmer{0%{background-position:0% 50%}100%{background-position:200% 50%}}
    </style>`;
  openModal(I18N.t('modal.victoryDeclaration'),html,
    [{txt:I18N.t('outro.reportConfirm'),fn:()=>{closeModal();if(typeof onDone==='function')onDone();},cls:'btn-gold'}],
    {bossfight:true}
  );
  try{AudioMgr.playSfx('coin',{vol:0.9,cooldown:0});}catch(e){}
  try{AudioMgr.playSfx('notify',{vol:0.9,cooldown:0});}catch(e){}
}

// ─── 엔딩 크레딧 시퀀스 → js/modules/ending-credits.js 로 분할 (Phase A1, 2026-06-10) ───
//   showEndingCredits / showFinalEndingCredits 둘 다 window 전역에 노출됨

// 보이드의 창 (MMV01) 인벤토리 지급 + (기함 빈 슬롯 있으면) 즉시 장착
function _grantVoidSpear(){
  if(!G.inventory)G.inventory=[];
  // 사용자 보고 2026-06-15: 보스 보상에서 보이드의 창(MMV01)을 이미 받은 경우
  //   기존 "중복 방지" 가드가 보이드의 심연 보상 지급을 막아 실제로 못 받던 문제.
  //   → 이 보상은 1회성(!_voidSpearObtained 게이트)이므로 항상 1개 지급한다.
  const inv=G.inventory.find(i=>i.id==='MMV01');
  if(inv)inv.qty=(inv.qty||0)+1; else G.inventory.push({id:'MMV01',qty:1});
  // 기함(0번)에 빈 무기 슬롯이 있고 아직 미장착이면 자동 장착, 아니면 인벤토리 보관
  const flag=G.fleet&&G.fleet[0];
  if(flag&&!(flag.parts||[]).includes('MMV01')){
    flag.parts=flag.parts||[];
    // 파츠 슬롯 = 행 수 × 2 (대형 보통 6슬롯, partsRows=4 면 8, partsRows=5 면 10)
    const _rows=(typeof getShipPartsGridRows==='function')?getShipPartsGridRows(flag):3;
    const _maxSlots=_rows*2;
    if(flag.parts.length<_maxSlots){
      flag.parts.push('MMV01');
      // 인벤토리에서 1개 차감 (장착했으므로)
      const _idx=G.inventory.findIndex(i=>i.id==='MMV01'&&i.qty>0);
      if(_idx>=0){G.inventory[_idx].qty--;if(G.inventory[_idx].qty<=0)G.inventory.splice(_idx,1);}
      notify(I18N.t('notify.voidSpearAutoEquip'),'gold');
    }else{
      notify(I18N.t('notify.voidSpearInvFlagshipFull'),'gold');
    }
  }else{
    // 기함에 이미 장착돼 있어도 인벤토리에 1개 지급됨
    notify(I18N.t('notify.voidSpearInv'),'gold');
  }
  G._voidSpearObtained=true;
  try{saveGame(true);}catch(e){}
}

// ─── ACT 5 종료: 보이드의 심연 → 흰 화면 → 엔딩 음악 → 최종 크레딧 ───
function _enterBlackHoleFinalTest(){
  // ACT 5 진입 + 엔딩 음악
  G.act=Math.max(G.act||1,5);
  // 엔딩 진입 — 전투 잔여 SFX·이펙트 완전 종료
  try{if(typeof combatState!=='undefined'&&combatState)combatState.done=true;}catch(e){}
  try{AudioMgr.stopAllSfx();}catch(e){}
  try{if(typeof _cbEffects!=='undefined')_cbEffects=[];}catch(e){}
  try{AudioMgr.playBgm('end');}catch(e){}
  // 1) 흰 화면 전체 오버레이 (페이드인)
  const overlay=document.createElement('div');
  overlay.id='_bh-final-overlay';
  overlay.style.cssText=[
    'position:fixed','left:0','top:0','right:0','bottom:0','width:100vw','height:100vh',
    'background:radial-gradient(circle at center, #ffffff 0%, #ffeecc 60%, #ffd88a 100%)',
    'z-index:99999','opacity:0','transition:opacity 2.5s ease-in',
    'display:flex','flex-direction:column','align-items:center','justify-content:center',
    'pointer-events:auto','color:#000','font-family:Malgun Gothic, sans-serif','padding:40px',
    'animation:_bhWhitePulse 4s ease-in-out infinite'
  ].join(';');
  overlay.innerHTML=`
    <style>
      @keyframes _bhWhitePulse{
        0%,100%{filter:brightness(1.0)}
        50%{filter:brightness(1.15)}
      }
      @keyframes _bhFadeUp{
        from{opacity:0;transform:translateY(20px)}
        to{opacity:1;transform:translateY(0)}
      }
    </style>
    <div id="_bh-final-content" style="opacity:0;transition:opacity 2s ease-in;max-width:820px;text-align:center">
      <div style="font-size:13px;color:#888;letter-spacing:8px;margin-bottom:22px;text-transform:uppercase">${I18N.t('ui.act5DashSubtitle')}</div>
      <div style="font-size:36px;font-weight:bold;color:#1a1a1a;margin-bottom:36px;letter-spacing:4px;text-shadow:0 0 24px rgba(255,255,255,.8)">${I18N.t('ui.lastMessage')}</div>
      <div id="_bh-final-msg" style="font-size:24px;color:#1a1a1a;line-height:2.2;background:rgba(255,255,255,.7);padding:36px 40px;border-radius:12px;border:2px solid rgba(255,200,100,.5);margin-bottom:28px;word-break:keep-all;font-weight:500;letter-spacing:0.5px;box-shadow:0 8px 32px rgba(255,180,80,.3)"></div>
      <div id="_bh-final-btn-wrap" style="opacity:0;transition:opacity 1s ease-in;margin-top:30px"></div>
    </div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(()=>{overlay.style.opacity='1';});
  // 메시지 타이핑 효과 — 사용자 명세 텍스트
  const _msgFull=I18N.t('bh.finalMsg');
  const contentEl=overlay.querySelector('#_bh-final-content');
  const msgEl=overlay.querySelector('#_bh-final-msg');
  const btnWrap=overlay.querySelector('#_bh-final-btn-wrap');
  setTimeout(()=>{contentEl.style.opacity='1';},2200);
  setTimeout(()=>{
    let i=0;
    const _typeTick=()=>{
      if(i>=_msgFull.length){
        btnWrap.style.opacity='1';
        btnWrap.innerHTML='<button id="_bh-final-claim" style="font-size:16px;padding:14px 32px;background:linear-gradient(135deg,#1a1a1a,#3a0030);color:#fff;border:2px solid rgba(200,100,255,.5);border-radius:8px;cursor:pointer;letter-spacing:4px;box-shadow:0 4px 16px rgba(180,0,255,.4);transition:all .3s" onmouseover="this.style.background=\'linear-gradient(135deg,#000,#4a0040)\';this.style.transform=\'translateY(-2px)\'" onmouseout="this.style.background=\'linear-gradient(135deg,#1a1a1a,#3a0030)\';this.style.transform=\'translateY(0)\'">'+I18N.t('bh.finalBattleBtn')+'</button>';
        const claimBtn=overlay.querySelector('#_bh-final-claim');
        claimBtn.onclick=()=>{
          overlay.style.transition='opacity 2.5s ease-out';
          overlay.style.opacity='0';
          setTimeout(()=>{
            try{overlay.remove();}catch(e){}
            // ★ 변경: 보상·엔딩으로 바로 가지 않고 블랙홀 보이드 함대 전투 진입
            try{startBlackHoleFleetCombat();}catch(e){console.warn(e);}
          },2700);
        };
        return;
      }
      msgEl.innerHTML=_msgFull.substring(0,++i).replace(/\n/g,'<br>');
      setTimeout(_typeTick,55);
    };
    _typeTick();
  },4000);
}
// ─── 블랙홀 보이드 함대 전투 (ACT 5 최종전) ──────────────────────────
// 흐름: _enterBlackHoleFinalTest 메시지 → "마지막 전투" 클릭 → 이 함수 호출 →
//       전투 → 승리 시 _finishCombat에서 _isBlackHoleFinal 플래그 감지 →
//       _grantBlackHoleRewardsSilent + showFinalEndingCredits
// 능력치: 아군 함대 총합의 ×15 (히든 보이드 보스 ×10보다 강한 최종 보스 페이즈)
function startBlackHoleFleetCombat(){
  // 보이드의 창(MMV01) 자동 지급 — 최종 블랙홀 결전에서 활용 (사용자 명세, 누락 보정)
  try{
    if(!G.inventory)G.inventory=[];
    const _hasSpear=G.inventory.find(i=>i.id==='MMV01'&&i.qty>0)
                  ||(G.fleet||[]).some(s=>(s.parts||[]).includes('MMV01'));
    if(!_hasSpear){
      G.inventory.push({id:'MMV01',qty:1});
      notify(I18N.t('notify.voidSpearAutoInv'),'gold');
      try{baekgu(I18N.t('baekgu.voidSpearGranted'));}catch(e){}
    }
  }catch(e){}
  const pd={id:'P-BLACKHOLE',nm:I18N.t('bh.planetName'),ring:7,void:true,f:'F07'};
  // ── 사용자 명세: 16척 보이드 심연 함대 (사용자 요청 — 함대 풀 구성)
  //    거북선×3 / 워덴클리프×3 / 렐러티비티×3 / 우르사메이저×2 / 블랙팔콘×2 / 대형 H10·H11·H12 각 1
  //    능력치는 카탈로그와 동일, HP만 "우리 함대 총 HP의 2배"가 되도록 비례 스케일
  const _hNm=id=>{const c=(typeof SHIP_CATALOG!=='undefined')&&SHIP_CATALOG.find(s=>s.id===id);return (c&&(typeof shipDisplayNm==='function'?shipDisplayNm(c):c.nm))||id;};
  const _mkN=(n,fn)=>Array.from({length:n},(_,k)=>fn(k+1));
  const _fleetSpec=[
    ..._mkN(4,k=>({catId:'URSA',nm:(k===1?I18N.t('enemy.ursaMythic'):I18N.t('enemy.ursaMythic2')+' '+k),baseHP:1000000,SH:120000,ATT:580,INT:340,TEC:220,DEF:120,armorTier:60,shieldTier:50})),
    ..._mkN(4,k=>({catId:'BLACKFALCON',nm:(k===1?I18N.t('enemy.blackfalconMythic'):I18N.t('enemy.blackfalconMythic2')+' '+k),baseHP:9700000,SH:300000,ATT:32000,INT:1200,TEC:560,DEF:200,armorTier:80,shieldTier:60})),
    ..._mkN(4,k=>({catId:'LGD03',nm:I18N.t('enemy.lgd03')+(k>1?' '+k:''),baseHP:245000,SH:90000,ATT:306,INT:295,TEC:255,DEF:80,armorTier:40,shieldTier:40})),
    ..._mkN(4,k=>({catId:'LGD01',nm:I18N.t('enemy.lgd01')+(k>1?' '+k:''),baseHP:260000,SH:65000,ATT:245,INT:235,TEC:210,DEF:80,armorTier:40,shieldTier:40})),
    ...['H01','H03','H05','H07','H09','H10','H11','H12'].map(hid=>({
      catId:hid,tier:'대형',
      nm:(hid==='H10'?I18N.t('enemy.leviathan'):hid==='H11'?I18N.t('enemy.armada'):hid==='H12'?I18N.t('enemy.ursaCrusher'):_hNm(hid)),
      baseHP:hid==='H12'?75000:hid==='H10'?45000:40000,
      SH:hid==='H12'?25000:20000,
      ATT:hid==='H12'?120:100,INT:110,TEC:95,DEF:50,armorTier:30,shieldTier:32
    }))
  ];
  // 우리 함대 총 HP의 2배 = 적 총 HP 목표치. 5척 카탈로그 비율대로 분배
  const _fp=(typeof calcFleetTotalPower==='function')?calcFleetTotalPower():{hp:0,atk:0,sh:0};
  const _playerTotalHP=Math.max(50000,_fp.hp||0);  // 최소 5만 (저레벨 안전장치)
  const _targetTotalEnemyHP=_playerTotalHP*2;
  const _totalCatHP=_fleetSpec.reduce((s,sp)=>s+sp.baseHP,0);
  const _scale=_targetTotalEnemyHP/_totalCatHP;
  const enemies=_fleetSpec.map((sp,i)=>{
    const _hp=Math.max(1000,Math.round(sp.baseHP*_scale));
    const isFlagship=(sp.catId==='BLACKFALCON');  // 블랙팔콘이 기함(보스)
    return {
      id:`BH_${sp.catId}_${Date.now()+i}`,
      catalogId:sp.catId,
      catId:sp.catId,
      nm:sp.nm,
      tier:sp.tier||'신화',
      isEnemy:true,
      voidBoss:isFlagship,
      hp:_hp,maxHP:_hp,HP:_hp,
      sh:sp.SH,maxSH:sp.SH,
      ATT:sp.ATT,INT:sp.INT,TEC:sp.TEC,
      DEF:sp.DEF,
      armorTier:sp.armorTier,shieldTier:sp.shieldTier,
      LOY:0,parts:[],crewIds:[],
      _isBlackHoleFleet:true
    };
  });
  const players=G.fleet.map(s=>{
    const st=getShipStats(s);
    const _wpn=PARTS.find(p=>p.cat==='weapon'&&(s.parts||[]).includes(p.id));
    const _wt=_wpn?(_wpn.tier||1):1;
    const _wtype=_wpn?(_wpn.wtype||'laser'):'laser';
    const _wrar=_wpn?(_wpn.rarity||''):'';
    const _shp=PARTS.find(p=>p.cat==='shield'&&(s.parts||[]).includes(p.id));
    const _shTier=_shp?(_shp.tier||0):0;
    const _arp=PARTS.find(p=>p.cat==='armor'&&(s.parts||[]).includes(p.id));
    const _arTier=_arp?(_arp.tier||0):0;
    return{...s,isEnemy:false,hp:s.hp,maxHP:st.HP,sh:s.sh,maxSH:st.maxSH,ATT:st.ATT,INT:st.INT,TEC:st.TEC,DEF:st.DEF||0,wtype:_wtype,wpnTier:_wt,wpnRarity:_wrar,shieldTier:_shTier,armorTier:_arTier};
  });
  combatState={players,enemies,turn:0,done:false,log:[],planetDef:pd,
               isBoss:false,isVoidBoss:false,_isBlackHoleFinal:true,
               _rndSeed:Date.now()%9999,_entranceT:1,_entranceDone:true,
               _planetId:G.currentPlanet};
  renderCombatView(document.getElementById('hub-body'));
  setHubNav('combat');updateHUD();
  _cbEffects=[];_unitPos={};
  if(_cbAnimReq){cancelAnimationFrame(_cbAnimReq);_cbAnimReq=null;}
  combatState._sunsinUsed=false;
  sfxAlert();try{AudioMgr.playBgm('boss');}catch(e){}
  _preloadCombatImages();
  requestAnimationFrame(()=>{
    initCombatCanvas();
    const t=document.getElementById('cb-title');
    if(t)t.textContent=I18N.t('bh.combatTitle');
    addCombatLog(I18N.t('combat.legendFleetAppears'),'err');
    addCombatLog(I18N.t('combat.legendFleetHpHint'),'gold');
    try{baekgu(I18N.t('baekgu.mirrorFleetAwoken'));}catch(e){}
    setTimeout(runCombatTurn,800);
  });
}
try{if(typeof window!=='undefined')window.startBlackHoleFleetCombat=startBlackHoleFleetCombat;}catch(e){}

// 보상 즉시 지급 (모달 없이) — 엔딩 시퀀스로 바로 진입
function _grantBlackHoleRewardsSilent(){
  // 검은 팔콘 + 신화 파츠 5점 지급
  const lgd3=SHIP_CATALOG.find(s=>s.id==='LGD03')||{maxHP:245000,maxSH:90000,ATT:306,INT:295,TEC:255};
  const _mul=1.5;
  const hiddenShip={
    id:'HIDDEN_FALCON_'+Date.now(),
    catalogId:'HIDDEN_FALCON',
    nm:I18N.t('bh.blackFalconReward'),
    tier:'소형',
    maxHP:Math.round(lgd3.maxHP*_mul),hp:Math.round(lgd3.maxHP*_mul),
    maxSH:Math.round(lgd3.maxSH*_mul),sh:Math.round(lgd3.maxSH*_mul),
    ATT:Math.round(lgd3.ATT*_mul),INT:Math.round(lgd3.INT*_mul),TEC:Math.round(lgd3.TEC*_mul),
    HP:Math.round(lgd3.maxHP*_mul),DEF:150,LOY:80,
    parts:[],crewIds:[],cargoSlots:5,
    crafted:false,_isHiddenFalcon:true
  };
  try{addShipToFleet(hiddenShip);}catch(e){}
  if(!G.inventory)G.inventory=[];
  ['MW01','MS01','MA01','ME01','RB10'].forEach(pid=>{
    const inv=G.inventory.find(i=>i.id===pid);
    if(inv)inv.qty++;else G.inventory.push({id:pid,qty:1});
  });
  G._finalTestComplete=true;
}
