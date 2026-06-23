// ═══ ECONOMY — game.js 에서 분리 (C4, 2026-06-23, 긴 코드 분할) ═══
//   game.js 직후(전역 로드)에서 로드. 전역 함수이므로 호출부 변경 불필요.
//   game.js 잔류 의존 전역: G, I18N, PLANET_DEF, PARTS, COMMODITIES, clamp,
//     calcFleetAvgPower, getDiffMult, getLevelMult, getEarlyGameMult, getDiffCountMult,
//     updateHUD, baekgu, notify, saveGame, openModal, closeModal, hubTab, setHubNav,
//     getShipStats, combatState(선언은 game.js, 여기선 할당/참조만),
//     renderCombatView, initCombatCanvas, addCombatLog, runCombatTurn, sfxAlert, AudioMgr,
//     calcPlayerLevel, _enemyTierBoost, pirateCombatImg, _commanderPortraitSrc,
//     _hostileVsHeader, _formatEnemyPreview, _baekguIcon, _showShakedownPopup
//   이 모듈이 노출하는 전역(타 모듈 참조): window.X=X 로 명시 export (파일 하단·인라인)

// 투자비·세금 산정용 기준 tax. 지구(P31)는 보이드 행성 tax의 1.2배로 책정 (사용자 요청).
function _planetBaseTax(pd){
  if(!pd)return 0;
  if(pd.id==='P31'){
    const _voidTax=Math.max(0,...PLANET_DEF.filter(p=>p.void).map(p=>p.tax||0));
    return Math.round((_voidTax||50000)*1.2);
  }
  return pd.tax||0;
}
function calcTaxFor(pid){const pd=PLANET_DEF.find(p=>p.id===pid),st=G.planets[pid];if(!pd||!st||!st.owned)return 0;const aurBonus=pd.f==='F02'?1.25:1.0;/* 행성 세금 (사용자 요청 2026-06-06):
  · 기준치 ×1.5 (현재보다 1.5배 인상)
  · 투자 레벨당 최초금액에서 +20% 선형 누적 (Lv0→1.0, Lv1→1.2, Lv2→1.4, ... Lv10→3.0)
  · 종전: Math.pow(1.3, commerce) 복리 → 누적증가 직관성을 위해 선형(1+0.2×lv)로 전환 */
  const lv=st.commerce||0;
  return Math.floor(_planetBaseTax(pd)*(1+0.2*lv)*1.8*aurBonus*1.5);}
function calcTurnTax(){return PLANET_DEF.reduce((s,p)=>s+calcTaxFor(p.id),0);}
function getPirateTurnMult(){
  // 15턴마다 1.5배, 최대 3배
  const stages=Math.floor(G.turn/15);
  return Math.min(3.0, Math.pow(1.5, stages));
}
function getPirateAppMult(){
  // 누적 등장 횟수마다 1.3배 강화, 최대 4배
  return Math.min(4.0, Math.pow(1.3, G.pirateAppearances||0));
}
// ACT 전환 스토리 팝업 — 사용자 요청 2026-06-07: 페이즈 1~6 컷씬 시스템으로 일원화하면서 ACT 팝업 제거
// G.act 상태값은 _checkActAdvance 에서 계속 갱신 (게임 진행 마일스톤 로직 호환). 팝업 표시만 스킵.
function showActTransition(newAct){ /* no-op: ACT 1~5 팝업 제거 */ }
// ── 충성도(LOY) 시스템 (크루 충성도 틱·위생·반란 이벤트) → js/modules/loyalty.js 로 분할 (2026-06-12, 사용자 요청: 긴 코드 분할)

// ── 적군 스탯 밸런스 캡 ────────────────────────────────────────────
// 해적/잔해해적/치크스(보스 제외) 능력치를 아군 함대 평균의 50~70% 범위로 제한
// 게임 후반 누적 강화로 너무 어려워지는 문제 방지
// 사용자 요청: 적군 능력치를 우리 함대 평균 대비 더 약하게 — 최대 40%로 제한.
// 이전 0.50~0.70 → 0.20~0.40 (per-ship). 4~8척 함대 적이면 총 0.8~3.2 ship-equivalent.
// 적 전투력 클램프 — 플레이어 함대 평균 HP/ATT 대비 비율 (사용자 요청: 95% 유지)
const ENEMY_POWER_MIN=0.90;
const ENEMY_POWER_MAX=0.95;
function clampEnemyStats(eHP,eATK,eINT,eTEC,fp){
  fp=fp||calcFleetAvgPower();
  const fpHP=Math.max(1,fp.hp||1),fpATK=Math.max(1,fp.atk||1);
  const maxHP=Math.round(fpHP*ENEMY_POWER_MAX),minHP=Math.round(fpHP*ENEMY_POWER_MIN);
  const maxATK=Math.round(fpATK*ENEMY_POWER_MAX),minATK=Math.round(fpATK*ENEMY_POWER_MIN);
  // 클램프 (최소값보다 작으면 올리고, 최대값보다 크면 깎음)
  const cHP=Math.max(minHP,Math.min(eHP,maxHP));
  const cATK=Math.max(minATK,Math.min(eATK,maxATK));
  // INT/TEC도 ATK와 동일 비율로 스케일링
  const atkRatio=eATK>0?cATK/eATK:1;
  return {eHP:cHP,eATK:cATK,eINT:Math.round((eINT||0)*atkRatio),eTEC:Math.round((eTEC||0)*atkRatio)};
}

// 이동 중 랜덤 해적 조우
function calcTravelPirateChance(pd){
  const ring=pd?.ring||2;
  const baseChance=[0,10,15,22,30,38,45,50][Math.min(7,ring)];
  const diffMult={easy:0.7,normal:1.0,hard:1.3,extreme:1.6}[G.difficulty]||1.0;
  return Math.min(50,Math.round(baseChance*diffMult));
}
function triggerTravelPirate(pd){
  G.lastPirateTurn=G.turn;
  const ring=pd?.ring||2;
  const dm=getDiffMult(),lm=getLevelMult(),ptm=getPirateTurnMult(),egm=getEarlyGameMult();
  const eCount=Math.min(Math.max(2,G.fleet.length),Math.round(4*getDiffCountMult()));
  const fp=calcFleetAvgPower();
  const tpMult=(0.55+(ring-1)*0.07)*dm*ptm*egm;
  const _rawHP=Math.round(fp.hp*tpMult),_rawATK=Math.round(fp.atk*tpMult);
  const _rawINT=Math.round(fp.atk*tpMult*0.6),_rawTEC=Math.round(fp.atk*tpMult*0.65);
  const _c=clampEnemyStats(_rawHP,_rawATK,_rawINT,_rawTEC,fp);
  const eHP=_c.eHP,eATK=_c.eATK,eINT=_c.eINT,eTEC=_c.eTEC;
  const raidDef={
    id:'TRAVEL_PIRATE',nm:I18N.t('pirate.routeName'),ring:ring,f:'PIRATE',hostile:true,tax:0,
    _enemies:Array.from({length:eCount},(_,i)=>({
      id:`TP${i}`,nm:I18N.t('ui.routePiratePrefix',{nm:I18N.t('ui.routePirateNames').split('|')[i%4]}),tier:i%4===3?'중형':'소형',isEnemy:true,
      hp:eHP,maxHP:eHP,sh:Math.floor(eHP*.25),maxSH:Math.floor(eHP*.25),
      ATT:eATK,INT:eINT,TEC:eTEC,HP:eHP,LOY:0,parts:[],crewIds:[]
    }))
  };
  const chance=calcTravelPirateChance(pd);
  // 사용자 요청 2026-06-07 (2차): 인물 이미지 추가 2배 확대 (96 → 192px)
  // 행성 팩션 기반 combat NPC 이미지 사용. PIRATE 폴백은 F01.
  const _pFac=(/^F0[1-7]$/.test(pd?.f||''))?pd.f:'F01';
  const _ver=(window._GAME_VER)?('?v='+encodeURIComponent(window._GAME_VER)):'';
  const _warriorSrc='img/quests/combat_'+_pFac+'.png'+_ver;
  const _commanderSrc=(typeof _commanderPortraitSrc==='function')?_commanderPortraitSrc():('img/chars/commander_m1.png'+_ver);
  openModal(I18N.t('modal.routePirate'),
    _hostileVsHeader({enemyImg:_warriorSrc,enemyName:I18N.t('pirate.routeName'),enemyFallback:'☠️'})
    +`<div style="text-align:center;padding:0 6px 8px">
      <div style="color:var(--red);font-size:18px;font-weight:bold;margin-bottom:4px">${I18N.t('pirate.routeEncounter',{nm:pd?.nm||''})}</div>
      <div style="color:var(--dim);font-size:12px;line-height:1.7">
        ${I18N.t('pirate.routeAmbushBy',{n:eCount})}<br>
        <span style="color:var(--muted);font-size:11px">${I18N.t('pirate.encounterChance',{pct:chance,ring,diff:({easy:I18N.t('difficulty.easy'),normal:I18N.t('difficulty.normal'),hard:I18N.t('difficulty.hard'),extreme:I18N.t('difficulty.extreme')})[G.difficulty]||I18N.t('difficulty.normal')})}</span>
      </div>
    </div>
    ${_formatEnemyPreview(raidDef._enemies)}
    <div style="text-align:center;font-size:12px;color:var(--yellow);margin-top:6px">${I18N.t('pirate.winLoot')}</div>
    <div style="text-align:center;font-size:12px;color:var(--cyan);margin-top:4px">${_baekguIcon(18)} ${I18N.t('ui.baekguShort')}: "${I18N.t('pirate.baekguRoute')}"</div>`,
    [{txt:I18N.t('ui.fight'),fn:()=>{closeModal();_safeCombatEntry(function(){startPirateRaid(raidDef);},"startPirateRaid");},cls:'btn-red'},
     {txt:I18N.t('ui.flee'),fn:()=>{closeModal();escapeTravelPirate();},cls:'btn-sm'}]
  );
}
function escapeTravelPirate(){
  const penalty=Math.floor(G.credits*0.03);
  G.credits=Math.max(100,G.credits-penalty);
  changeReputation(-2);
  updateHUD();
  notify(I18N.t('notify.fleeSuccess',{cr:penalty.toLocaleString()}),'err');
  baekgu(I18N.t('baekgu.barelyEscaped'));
  saveGame(true);
}
function triggerEarlyPirate(pd){
  // 턴 3+ 해적 등장 — 누적 등장횟수마다 1.5배 강화 (최대 5회)
  if(!G.pirateAppearances)G.pirateAppearances=0;
  G.pirateAppearances=Math.min(G.pirateAppearances+1,5);
  G.lastPirateTurn=G.turn;
  const appMult=getPirateAppMult();
  const ring=pd?.ring||1;
  const dm=getDiffMult(),lm=getLevelMult(),ptm=getPirateTurnMult(),egm=getEarlyGameMult();
  // 플레이어 함대 수 & 누적 등장 횟수 기반, 최소 2척
  const eCount=Math.min(Math.max(2,Math.floor(G.fleet.length*0.8)+Math.floor(G.pirateAppearances/2)),Math.round(4*getDiffCountMult()));
  const fp2=calcFleetAvgPower();
  // 사용자 요청: 비정상적으로 강한 해적 50% 약화
  const epMult=(0.45+(ring-1)*0.06)*dm*ptm*appMult*egm*0.5;
  const _rHP=Math.round(fp2.hp*epMult);
  const _rATK=Math.round(fp2.atk*epMult);
  const _rINT=Math.round(fp2.atk*epMult*0.55);
  const _rTEC=Math.round(fp2.atk*epMult*0.60);
  const _c2=clampEnemyStats(_rHP,_rATK,_rINT,_rTEC,fp2);
  const eHP=_c2.eHP,eATK=_c2.eATK,eINT=_c2.eINT,eTEC=_c2.eTEC;
  const raidDef={
    id:'PIRATE_RAID',nm:I18N.t('pirate.earlyName'),ring:ring,f:'PIRATE',hostile:true,tax:0,
    _enemies:Array.from({length:eCount},(_,i)=>({
      id:'EP'+i,nm:I18N.t('pirate.namePrefix')+[I18N.t('pirate.scout'),I18N.t('pirate.smallFighter'),I18N.t('pirate.raider')][i%3],tier:'소형',isEnemy:true,
      hp:eHP,maxHP:eHP,sh:Math.floor(eHP*.15),maxSH:Math.floor(eHP*.15),
      ATT:eATK,INT:eINT,TEC:eTEC,HP:eHP,LOY:0,parts:[],crewIds:[]
    }))
  };
  openModal(I18N.t('modal.pirateAppear'),
    (function(){
      // 사용자 요청 2026-06-09: 해적 전용 이미지 풀(FF01~FF08) 추가 활용
      const _pImg=pirateCombatImg(pd);
      return _hostileVsHeader({enemyImg:_pImg,enemyName:I18N.t('pirate.earlyAppear',{nm:pd?.nm||''}),enemyFallback:'☠️'});
    })()
    +`<div style="text-align:center;padding:0 6px 6px">
      <div style="color:var(--dim);font-size:12px;line-height:1.7">
        ${I18N.t('pirate.earlyMsg',{turn:G.turn})}<br>
        ${I18N.t('pirate.approachingN',{n:eCount})}
      </div>
      <div style="margin-top:4px;color:var(--yellow);font-size:11px">${I18N.t('pirate.cumulativeWarn',{n:G.pirateAppearances,mult:getPirateAppMult().toFixed(2)})}</div>
    </div>
    ${_formatEnemyPreview(raidDef._enemies)}
    <div style="text-align:center;font-size:12px;color:var(--yellow);margin-top:6px">${I18N.t('pirate.winCredits')}</div>
    <div style="text-align:center;font-size:12px;color:var(--cyan);margin-top:4px">${_baekguIcon(18)} ${I18N.t('ui.baekguShort')}: "${G.pirateAppearances>=5?I18N.t('pirate.bk5'):G.pirateAppearances>=3?I18N.t('pirate.bk3'):I18N.t('pirate.bk0')}"</div>`,
    [{txt:I18N.t('ui.fight'),fn:()=>{closeModal();_safeCombatEntry(function(){startPirateRaid(raidDef);},"startPirateRaid");},cls:'btn-red'},
     {txt:I18N.t('ui.flee'),fn:()=>{closeModal();const p=Math.floor(G.credits*0.03);G.credits=Math.max(100,G.credits-p);changeReputation(-2);updateHUD();notify(I18N.t('notify.fleeWithCr',{cr:p.toLocaleString()}),'err');saveGame(true);hubTab('main');},cls:'btn-sm'}]
  );
  saveGame(true);
}
// ── 치크스 함대 출몰 (적 행성 체류 이벤트) ─────────────────────
function triggerChixFleet(pd){
  if(!G.chixWaves)G.chixWaves=0;
  G.lastChixTurn=G.turn;
  // 누적 출몰 횟수 (최대 5회)
  const wave=Math.min(G.chixWaves,4); // 0~4 → 1~5회차
  G.chixWaves=Math.min(G.chixWaves+1,5);

  const dm=getDiffMult(),lm=getLevelMult(),egm=getEarlyGameMult();
  const ring=pd?.ring||1;
  // 함선 수: 기본 3척, 출몰 횟수마다 20% 증가 (최대 8척)
  const baseCount=3;
  const countMult=Math.pow(1.20,wave);
  const eCount=Math.min(12,Math.round(baseCount*countMult*getDiffCountMult()));
  // 전투력: 플레이어 함대 비례 + 파도마다 20% 강화 (치크스는 적대 세력)
  // 체력 밸런스 조정: 보스를 제외한 치크스 함선 HP/실드 -50% + 50~70% 캡
  const CHIX_HP_MULT=0.5;
  const fp4=calcFleetAvgPower();
  const chixBase=(0.70+(ring-1)*0.06);   // ring1=0.70 ~ ring5=0.94
  const powerMult=Math.pow(1.20,wave)*dm*egm;
  const _rChHP=Math.round(fp4.hp*chixBase*powerMult*CHIX_HP_MULT);
  const _rChATK=Math.round(fp4.atk*chixBase*powerMult);
  const _rChINT=Math.round(fp4.atk*chixBase*powerMult*0.65);
  const _rChTEC=Math.round(fp4.atk*chixBase*powerMult*0.70);
  const _c3=clampEnemyStats(_rChHP,_rChATK,_rChINT,_rChTEC,fp4);
  const eHP=_c3.eHP,eATK=_c3.eATK,eINT=_c3.eINT,eTEC=_c3.eTEC;

  const shipNames=[I18N.t('chix.battleship'),I18N.t('chix.cruiser'),I18N.t('chix.destroyer'),I18N.t('chix.gunship'),I18N.t('chix.carrier'),I18N.t('chix.assaultShip')];
  const enemies=Array.from({length:eCount},(_,i)=>({
    id:`CHIX_W${wave}_${i}`,
    nm:I18N.t('ui.cheeksShipPrefix',{nm:shipNames[i%shipNames.length]}),
    tier:_enemyTierBoost(i===0&&wave>=3?'대형':i<2&&wave>=2?'중형':'소형'),
    isEnemy:true,
    maxHP:Math.round(eHP*(i===0?1.4:1.0)),hp:Math.round(eHP*(i===0?1.4:1.0)),
    maxSH:Math.round(eHP*(i===0?0.6:0.35)),sh:Math.round(eHP*(i===0?0.6:0.35)),
    ATT:Math.round(eATK*(i===0?1.3:1.0)),INT:Math.round(eINT*(i===0?1.2:1.0)),
    TEC:Math.round(eTEC),HP:eHP,LOY:0,parts:[],crewIds:[]
  }));

  const waveLbl=[I18N.t('ui.wave1'),I18N.t('ui.wave2'),I18N.t('ui.wave3'),I18N.t('ui.wave4'),I18N.t('ui.wave5Final')][wave];
  const waveCol=wave>=4?'var(--red)':wave>=2?'var(--purple)':'#cc88ff';

  openModal(I18N.t('modal.chixFleetWave',{wave:waveLbl}),
    (function(){
      const _verC=(window._GAME_VER)?('?v='+encodeURIComponent(window._GAME_VER)):'';
      const _cImg='img/quests/combat_F05.png'+_verC;
      return _hostileVsHeader({enemyImg:_cImg,enemyName:I18N.t('chix.appearLabel',{wave:waveLbl,mult:Math.pow(1.20,wave).toFixed(2),now:G.chixWaves}),enemyFallback:'👾'});
    })()
    +`<div style="background:rgba(139,0,255,.08);border:1px solid #8b00ff66;border-radius:10px;padding:10px 12px;margin-bottom:10px">
      ${wave>=4?`<div style="color:var(--red);font-size:12px;font-weight:bold">${I18N.t('chix.finalLastChance')}</div>`:''}
    </div>
    ${_formatEnemyPreview(enemies)}
    <div style="font-size:12px;color:var(--dim);line-height:1.7">
      ${_baekguIcon(18)} ${I18N.t('ui.baekguShort')}: "${wave>=4?I18N.t('chix.bkFinal'):wave>=2?I18N.t('chix.bkMid'):I18N.t('chix.bkEarly')}"
    </div>`,
    [{txt:I18N.t('chix.fightBtn',{n:eCount}),fn:()=>{
      closeModal();
      const raidDef={...pd,_enemies:enemies,_chixWave:wave};
      startChixFleetCombat(raidDef);
    },cls:'btn-red'},
     {txt:I18N.t('ui.flee'),fn:()=>{
      closeModal();
      const loss=Math.floor(G.credits*0.03);
      G.credits=Math.max(100,G.credits-loss);
      G.stayTurns=0;changeReputation(-2);updateHUD();
      notify(I18N.t('notify.chixFleetFlee',{cr:loss.toLocaleString()}),'err');
      baekgu(I18N.t('baekgu.escapedJustNow'));
      saveGame(true);hubTab('main');
    },cls:'btn-sm'}]);
}

function startChixFleetCombat(raidDef){
  const players=G.fleet.map(s=>{const st=getShipStats(s);const _wpn=PARTS.find(p=>p.cat==='weapon'&&(s.parts||[]).includes(p.id));const _wrar=_wpn?(_wpn.rarity||''):'';const _shp=PARTS.find(p=>p.cat==='shield'&&(s.parts||[]).includes(p.id));const _shTier=_shp?(_shp.tier||0):0;const _arp=PARTS.find(p=>p.cat==='armor'&&(s.parts||[]).includes(p.id));const _arTier=_arp?(_arp.tier||0):0;return{...s,isEnemy:false,hp:Math.max(1,s.hp||st.HP),maxHP:st.HP,sh:(s.sh!=null?s.sh:st.maxSH),maxSH:st.maxSH,ATT:st.ATT,INT:st.INT,TEC:st.TEC,DEF:st.DEF||0,wtype:_wpn?(_wpn.wtype||'laser'):'laser',wpnTier:_wpn?(_wpn.tier||1):1,wpnRarity:_wrar,shieldTier:_shTier,armorTier:_arTier,tier:s.tier||'소형'};});
  const wave=raidDef._chixWave||0;
  combatState={players,enemies:raidDef._enemies,turn:0,done:false,log:[],planetDef:raidDef,isBoss:false,isPirate:false,_isChixFleet:true,_chixWave:wave,_planetId:G.currentPlanet};
  renderCombatView(document.getElementById('hub-body'));
  setHubNav('combat');updateHUD();sfxAlert();try{AudioMgr.playBgm(wave>=4?'boss':'combat');}catch(e){}
  requestAnimationFrame(()=>{
    initCombatCanvas();
    const waveLbl=[I18N.t('ui.wave1'),I18N.t('ui.wave2'),I18N.t('ui.wave3'),I18N.t('ui.wave4'),I18N.t('ui.wave5Final')][wave];
    const t=document.getElementById('cb-title');if(t)t.textContent=I18N.t('combat.titleChixWave',{wave:waveLbl,nm:raidDef.nm});
    setTimeout(()=>{addCombatLog(I18N.t('combat.chixFleetAppear',{wave:waveLbl,n:raidDef._enemies.length}),'');runCombatTurn();},400);
  });
}

function triggerPirateRaid(pd){
  G.lastPirateTurn=G.turn;
  const ring=pd?.ring||2;
  const dm=getDiffMult(),lm=getLevelMult(),ptm=getPirateTurnMult(),egm=getEarlyGameMult();
  const turnShipMult=Math.pow(1.2,Math.floor(G.turn/3));
  const eCount=Math.min(15,Math.round((2+Math.floor(ring/2))*turnShipMult*getDiffCountMult()));
  const fp3=calcFleetAvgPower();
  const prMult=(0.65+(ring-1)*0.08)*dm*ptm*egm;
  const _rawHP=Math.round(fp3.hp*prMult),_rawATK=Math.round(fp3.atk*prMult);
  const _rawINT=Math.round(fp3.atk*prMult*0.60),_rawTEC=Math.round(fp3.atk*prMult*0.65);
  const _cp=clampEnemyStats(_rawHP,_rawATK,_rawINT,_rawTEC,fp3);
  const eHP=_cp.eHP,eATK=_cp.eATK,eINT=_cp.eINT,eTEC=_cp.eTEC;
  // 가짜 planetDef를 만들어 startCombat 호출
  const raidDef={
    id:'PIRATE_RAID',nm:I18N.t('pirate.raidName'),ring:ring,f:'PIRATE',hostile:true,tax:0,
    _enemies:Array.from({length:eCount},(_,i)=>({
      id:`P${i}`,nm:I18N.t('ui.piratePrefix',{nm:I18N.t('ui.pirateShipNames').split('|')[i%5]}),tier:_enemyTierBoost(['소형','중형','소형','대형','소형'][i%5]),isEnemy:true,
      hp:eHP,maxHP:eHP,sh:Math.floor(eHP*.2),maxSH:Math.floor(eHP*.2),
      ATT:eATK,INT:eINT,TEC:eTEC,HP:eHP,LOY:0,parts:[],crewIds:[]
    }))
  };
  // 모달로 경고 먼저
  openModal(I18N.t('modal.pirateRaid'),
    (function(){
      // 사용자 요청 2026-06-09: 해적 전용 이미지 풀(FF01~FF08) 추가 활용
      const _prImg=pirateCombatImg(pd);
      return _hostileVsHeader({enemyImg:_prImg,enemyName:I18N.t('pirate.raidName'),enemyFallback:'☠️'});
    })()
    +`<div style="text-align:center;padding:0 6px 6px">
      <div style="color:var(--red);font-size:17px;font-weight:bold;margin-bottom:6px">${I18N.t('ui.pirateRaidHere',{nm:pd?.nm||''})}</div>
      <div style="color:var(--dim);font-size:13px;line-height:1.7">
        ${I18N.t('ui.pirateStayLeak',{n:G.stayTurns})}<br>
        <span style="color:var(--yellow)">${I18N.t('ui.winLootLoseCr')}</span>
      </div>
    </div>
    ${_formatEnemyPreview(raidDef._enemies)}
    <div style="font-size:12px;color:var(--cyan);text-align:center">${_baekguIcon(18)} ${I18N.t('ui.baekguShort')}: "${I18N.t('baekgu.pirateWarn')}"</div>`,
    [{txt:I18N.t('ui.startBattle'),fn:()=>{
        closeModal();
        // 사용자 보고 2026-06-09: 전투 진입 안 됨 — 컷씬 오버레이 잔존 시 강제 정리 + 함수 존재 가드
        try{ var _ov=document.getElementById('story-scene-overlay'); if(_ov)_ov.remove(); }catch(e){}
        if(typeof startPirateRaid!=='function'){console.error('[combat] startPirateRaid 미정의');notify(I18N.t('err.combatInitFail')||'전투 시스템 로드 실패','err');return;}
        try{ startPirateRaid(raidDef); }catch(e){console.error('[combat] startPirateRaid threw',e);notify('전투 진입 오류: '+e.message,'err');}
     },cls:'btn-red'},
     {txt:I18N.t('ui.flee'),fn:()=>{closeModal();escapePirateRaid();},cls:'btn-sm'}]
  );
  saveGame(true);
}
// 사용자 보고 2026-06-09: 전투 진입 실패 공통 처리
//   · 모달 클릭 핸들러에서 사용 — 함수 미정의/throw 시 명확한 에러 + 다음 시도 차단
//   · 컷씬 오버레이 잔존 시 강제 정리
function _safeCombatEntry(fn,name){
  try{
    if(typeof window!=='undefined'){
      var _ov=document.getElementById('story-scene-overlay');
      if(_ov)_ov.remove();
    }
    if(typeof fn!=='function'){
      console.error('[combat] '+(name||'entry')+' 미정의');
      notify('전투 시스템 함수 미로드: '+(name||'entry')+' — 페이지 새로고침 후 재시도','err');
      return;
    }
    fn();
  }catch(e){
    console.error('[combat] '+(name||'entry')+' threw:',e);
    notify('전투 진입 오류 ('+(name||'entry')+'): '+e.message,'err');
  }
}
try{if(typeof window!=='undefined')window._safeCombatEntry=_safeCombatEntry;}catch(e){}

function startPirateRaid(raidDef){
  // 해적/적대 만남 시 통행료 시비 팝업 (사용자 요청) — raidDef 세션당 1회만
  // 사용자 보고 2026-06-09: 전투 메세지 뜬 이후 전투가 안 시작되는 경우
  //   · 원인: _showShakedownPopup 이 throw 하거나 undefined 면 _shakedownDone 만
  //     true 로 마킹되고 콜백 미발화 → 전투 영구 미진입
  //   · 수정: 팝업 호출을 try/catch 로 보호 + 실패 시 즉시 전투로 진행
  if(raidDef&&!raidDef._shakedownDone){
    raidDef._shakedownDone=true;
    if(typeof _showShakedownPopup==='function'){
      try{
        _showShakedownPopup(raidDef,()=>startPirateRaid(raidDef));
        return;
      }catch(e){
        console.warn('[combat] shakedown popup failed — proceeding to combat:',e);
        // fall through to actual combat
      }
    } else {
      console.warn('[combat] _showShakedownPopup 미정의 — 시비 단계 스킵');
    }
  }
  // 사용자 보고 2026-06-09: 전투 진입 단계 전체를 try/catch 로 보호
  try{
    const players=G.fleet.map(s=>{const st=getShipStats(s);const _wpn=PARTS.find(p=>p.cat==='weapon'&&(s.parts||[]).includes(p.id));const _wrar=_wpn?(_wpn.rarity||''):'';const _shp=PARTS.find(p=>p.cat==='shield'&&(s.parts||[]).includes(p.id));const _shTier=_shp?(_shp.tier||0):0;const _arp=PARTS.find(p=>p.cat==='armor'&&(s.parts||[]).includes(p.id));const _arTier=_arp?(_arp.tier||0):0;return{...s,isEnemy:false,hp:Math.max(1,s.hp||st.HP),maxHP:st.HP,sh:(s.sh!=null?s.sh:st.maxSH),maxSH:st.maxSH,ATT:st.ATT,INT:st.INT,TEC:st.TEC,DEF:st.DEF||0,wtype:_wpn?(_wpn.wtype||'laser'):'laser',wpnTier:_wpn?(_wpn.tier||1):1,wpnRarity:_wrar,shieldTier:_shTier,armorTier:_arTier,tier:s.tier||'소형'};});
    combatState={players,enemies:raidDef._enemies,turn:0,done:false,log:[],planetDef:raidDef,isBoss:false,isPirate:true,_planetId:G.currentPlanet};
    renderCombatView(document.getElementById('hub-body'));
    setHubNav('combat');updateHUD();sfxAlert();try{AudioMgr.playBgm('combat');}catch(e){}
    const _plv=calcPlayerLevel(),_plm=getLevelMult();
    requestAnimationFrame(()=>{
      try{
        initCombatCanvas();
        const t=document.getElementById('cb-title');if(t)t.textContent=I18N.t('combat.title.pirateRaid');
        setTimeout(function(){
          if(combatState&&!combatState.done){
            try{
              addCombatLog(I18N.t('combat.pirateRaidStat',{plv:_plv,mult:_plm.toFixed(2)}),'');
              runCombatTurn();
            }catch(e){
              console.error('[combat] first turn failed:',e);
              notify('전투 첫 턴 오류: '+e.message,'err');
            }
          }
        },800);
      }catch(e){
        console.error('[combat] canvas init failed:',e);
        notify('전투 화면 초기화 오류: '+e.message,'err');
      }
    });
  }catch(e){
    console.error('[combat] startPirateRaid fatal:',e);
    notify('전투 진입 실패: '+e.message+' (페이지 새로고침 후 재시도)','err');
    // 실패 시 raidDef._shakedownDone 리셋하지 않음 — 재시도 시 같은 경로 반복 방지
    combatState=null;
  }
}
function escapePirateRaid(){
  const penalty=Math.floor(G.credits*0.03);
  G.credits=Math.max(0,G.credits-penalty);
  G.stayTurns=0;
  changeReputation(-2);
  updateHUD();
  notify(I18N.t('notify.fleeSuccess',{cr:penalty.toLocaleString()}),'err');
  baekgu(I18N.t('baekgu.fled'));
  try{saveGame(true);}catch(e){}  // 페널티 상태 영속화 (이전 누락: 새로고침 시 차감 분실)
  hubTab('main');
}
function changeReputation(delta){if(!G.reputation)G.reputation=0;G.reputation=clamp(G.reputation+delta,0,9999);updateHUD();}
// 기존 세이브 데이터: 동일 ID 화물 슬롯 통합 (평균 구매가)
function mergeCargoById(){
  if(!G.cargo||G.cargo.length===0)return;
  const merged=[];
  G.cargo.forEach(slot=>{
    const ex=merged.find(m=>m.id===slot.id&&!!m.material===!!slot.material);
    if(ex){
      ex.buyPrice=Math.round((ex.buyPrice*ex.qty+slot.buyPrice*slot.qty)/(ex.qty+slot.qty));
      ex.qty+=slot.qty;
      if(ex.buyPlanetId!==slot.buyPlanetId)ex.buyPlanetId='mixed';
      if(ex.buyFaction!==slot.buyFaction)ex.buyFaction='mixed';
    } else {
      merged.push({...slot});
    }
  });
  G.cargo=merged;
}
// ─── 화물·재료 정합성 검증 (함선 교체·로드 시 자동 호출) ──────────
// 1) 동일 id+material 슬롯 통합 (mergeCargoById 호출)
// 2) 0 이하 qty 슬롯 제거
// 3) G.materials 카운터를 G.cargo의 material 슬롯 qty와 일치시킴
//    (저장 직렬화/직접 수정 등으로 두 출처가 어긋나면 수정)
// 4) nm 필드 누락 시 COMMODITIES에서 자동 보완
function _validateCargoIntegrity(){
  if(!G.cargo)G.cargo=[];
  if(!G.materials)G.materials={};
  // 1) 슬롯 통합
  mergeCargoById();
  // 2) 0 이하 qty 슬롯 제거
  G.cargo=G.cargo.filter(s=>s&&s.qty>0);
  // 3) material 슬롯 qty를 G.materials 카운터의 단일 출처로 — 더 큰 값 채택
  //    (재료는 화물칸·재료창고 두 곳에서 카운트되므로 어긋나면 큰 쪽을 유지)
  const matCargoSums={};
  G.cargo.forEach(s=>{if(s.material)matCargoSums[s.id]=(matCargoSums[s.id]||0)+s.qty;});
  Object.keys(matCargoSums).forEach(id=>{
    const cargoQty=matCargoSums[id];
    const matQty=G.materials[id]||0;
    const trueQty=Math.max(cargoQty,matQty);
    G.materials[id]=trueQty;
    // cargo의 해당 material 슬롯들의 qty 합이 trueQty가 되도록 조정 (단일 슬롯로 통합되어 있음 — mergeCargoById 후)
    const slot=G.cargo.find(s=>s.id===id&&s.material);
    if(slot&&slot.qty!==trueQty)slot.qty=trueQty;
  });
  // 3b) G.materials 에 있는데 G.cargo 에 슬롯이 없는 재료 → 신규 슬롯 추가 (화물칸 가득 차 있던 동안 매입한 재료 복구)
  //     함선 교체 등으로 화물칸 여유 생겼을 때 자동으로 거래소에 노출·판매 가능해짐 (사용자 보고 픽스)
  if(typeof COMMODITIES!=='undefined'){
    Object.keys(G.materials||{}).forEach(id=>{
      const matQty=G.materials[id]||0;
      if(matQty<=0)return;
      const existingSlot=G.cargo.find(s=>s.id===id&&s.material);
      if(existingSlot){
        if(existingSlot.qty!==matQty)existingSlot.qty=matQty;
        // 사용자 보고 (2026-06-06): 기존 슬롯의 buyPrice 가 0이면 COMMODITIES 정가로 복원
        //   → sellComm에서 폴백 가격이 정상 계산되어 매각 차단 해소
        const _commFix=COMMODITIES.find(c=>c.id===id);
        if(_commFix&&(!existingSlot.buyPrice||existingSlot.buyPrice<=0))existingSlot.buyPrice=_commFix.buy||0;
        return;
      }
      const comm=COMMODITIES.find(c=>c.id===id);
      if(!comm)return;
      G.cargo.push({id:id,nm:comm.nm,qty:matQty,buyPrice:comm.buy||0,buyPlanetId:'unknown',material:true});
    });
  }
  // 4) nm 필드 누락 보완 + material 플래그 복원
  //    사용자 보고 (2026-06-06): 함선 교체 후 일부 재료의 material 플래그가 손실되어
  //    매각 분기가 잘못 타는 현상 — COMMODITIES 정의 기준으로 material 플래그 강제 복원.
  if(typeof COMMODITIES!=='undefined'){
    G.cargo.forEach(s=>{
      const c=COMMODITIES.find(x=>x.id===s.id);
      if(c){
        if(!s.nm)s.nm=c.nm;
        // material 플래그는 COMMODITIES 정의를 단일 진실로 신뢰
        if(c.material&&!s.material)s.material=true;
      }
    });
  }
}
try{if(typeof window!=='undefined')window._validateCargoIntegrity=_validateCargoIntegrity;}catch(e){}
// bugfix 2026-06-12: 재료 소비 단일 진입점 — G.materials 카운터와 G.cargo 슬롯을 함께 차감.
//   한쪽만 차감하면 _validateCargoIntegrity 의 max() 보정이 "유령 수량"을 부활시켜
//   표시 보유량과 실제 사용 가능량이 어긋나던 문제(사용자 보고: 함선 판매/교체 후 재료 숫자 불일치) 해결.
function consumeMaterialQty(id,n){
  n=n||1;
  if(!G.materials)G.materials={};
  G.materials[id]=Math.max(0,(G.materials[id]||0)-n);
  const _slot=(G.cargo||[]).find(s=>s.id===id&&s.material);
  if(_slot){
    _slot.qty=Math.max(0,_slot.qty-n);
    if(_slot.qty===0)G.cargo.splice(G.cargo.indexOf(_slot),1);
  }
}
try{if(typeof window!=='undefined')window.consumeMaterialQty=consumeMaterialQty;}catch(e){}
function calcSellPrice(cargoItem,sellPlanetId){
  const comm=COMMODITIES.find(c=>c.id===cargoItem.id);
  const marcoMult=(G&&G.heroes&&G.heroes.includes('H08'))?1.20:1.0;
  // 전리품(해적·치크스·적대 전투에서 획득): 평균가에 매각 (사용자 요청 — 너무 비싸게 팔리던 문제 완화)
  if(cargoItem.loot&&comm){
    const _buy=comm.buy||0;
    const _max=comm.maxSell||_buy;
    return Math.floor(((_buy+_max)/2)*marcoMult);
  }
  // 영입 재료(특수 비-재료, 예: 난중일기 영인본 G18): maxSell 최대가로 매각 — UI 가격 표시 일관성
  if(comm&&comm.special&&!comm.material){
    return Math.floor((comm.maxSell||comm.buy||0)*marcoMult);
  }
  // 제작 재료: maxSell:0이므로 구매가의 70% 고정 반환
  if(comm?.material){
    return Math.floor((comm.buy||cargoItem.buyPrice||0)*0.7*marcoMult);
  }
  // 동일 행성 환불 판매: 구매가의 80% 고정 (실수 구매 취소 용도, 차익 거래 방지)
  if(cargoItem.buyPlanetId&&cargoItem.buyPlanetId===sellPlanetId){
    return Math.floor((cargoItem.buyPrice||0)*0.8);
  }
  const sp=PLANET_DEF.find(p=>p.id===sellPlanetId);
  // 혼합 원산지(평균구매가 통합 슬롯): 이종문명 4.2× 기준 적용
  if(!cargoItem.buyPlanetId||cargoItem.buyPlanetId==='mixed'){
    if(!comm||!sp)return cargoItem.buyPrice;
    const base=Math.floor(cargoItem.buyPrice*4.2);
    const maxSellAdj=marcoMult>1?Math.floor(comm.maxSell*marcoMult):comm.maxSell;
    return Math.min(Math.floor(base*marcoMult),maxSellAdj);
  }
  const bp=PLANET_DEF.find(p=>p.id===cargoItem.buyPlanetId);
  if(!bp||!sp||!comm)return cargoItem.buyPrice;
  // ── 거리 보너스: 매입↔판매 행성이 멀수록 추가 수익 (사용자 요청) ──
  //   링(반지름)·각도를 좌표로 변환해 실제 은하 거리 계산 → 최대 +60%.
  const _toXY=(p)=>{const r=(p.ring||0),a=(p.ang||0)*Math.PI/180;return [r*Math.cos(a),r*Math.sin(a)];};
  const _A=_toXY(bp),_B=_toXY(sp);
  const _dist=Math.hypot(_A[0]-_B[0],_A[1]-_B[1]);
  const _distMul=1+Math.min(0.6,_dist*0.06);   // 멀수록 최대 +60%
  let base;
  if(bp.f===sp.f){
    // 동일 문명: 낮은 기본 마진 + 거리 비례
    base=Math.floor(cargoItem.buyPrice*1.05*_distMul);
  } else {
    // 이종 문명 보너스(4~5×) 유지 + 거리 비례 추가
    const dR=Math.abs(bp.ring-sp.ring)+.1*Math.min(Math.abs(bp.ang-sp.ang),360-Math.abs(bp.ang-sp.ang));
    const margin=dR<=2?4.0:dR>=4?5.0:4.0+(dR-2)/2;
    base=Math.floor(cargoItem.buyPrice*margin*_distMul);
  }
  // 상한도 거리 비례로 함께 상향 → 거리 보너스가 maxSell 에 막히지 않게
  const maxSellAdjusted=(marcoMult>1?Math.floor(comm.maxSell*marcoMult):comm.maxSell);
  return Math.min(Math.floor(base*marcoMult),Math.floor(maxSellAdjusted*_distMul));
}
function addToInventory(partId,qty=1){
  const ex=G.inventory.find(i=>i.id===partId);if(ex)ex.qty+=qty;else G.inventory.push({id:partId,qty});
}

// ─── 타 모듈 참조용 전역 export (C4 분리, 2026-06-23) ───────────────────────────
// 위 함수들은 전역 function 선언이라 bare 호출은 그대로 동작하지만,
// window.X 참조 모듈(및 일관성)을 위해 명시 export. (_safeCombatEntry/_validateCargoIntegrity/
// consumeMaterialQty 는 위에서 이미 export 됨)
try{if(typeof window!=='undefined'){
  window._planetBaseTax=_planetBaseTax;
  window.calcTaxFor=calcTaxFor;
  window.calcTurnTax=calcTurnTax;
  window.getPirateTurnMult=getPirateTurnMult;
  window.getPirateAppMult=getPirateAppMult;
  window.showActTransition=showActTransition;
  window.clampEnemyStats=clampEnemyStats;
  window.calcTravelPirateChance=calcTravelPirateChance;
  window.triggerTravelPirate=triggerTravelPirate;
  window.escapeTravelPirate=escapeTravelPirate;
  window.triggerEarlyPirate=triggerEarlyPirate;
  window.triggerChixFleet=triggerChixFleet;
  window.startChixFleetCombat=startChixFleetCombat;
  window.triggerPirateRaid=triggerPirateRaid;
  window.startPirateRaid=startPirateRaid;
  window.escapePirateRaid=escapePirateRaid;
  window.changeReputation=changeReputation;
  window.mergeCargoById=mergeCargoById;
  window.calcSellPrice=calcSellPrice;
  window.addToInventory=addToInventory;
}}catch(e){}
