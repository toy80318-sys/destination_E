// ══════════════════════════════════════════════════════════════════
// DESTINATION EARTH — 아이젠클로 중간보스 전투 (페스작센 P16)
//   · 사용자 요청 2026-06-17: 시나리오 퀘스트 수락 → 신규 대면 컷신 → 전투.
//   · 함대: 크리그 소형/중형/대형 + 대형 1척 = 아이젠클로 기함(2배 크기,
//     플레이어 함대 평균 HP·방어 ×10, 공격 ×5).
//   의존 글로벌: G, getShipStats, calcFleetAvgPower, startPirateRaid,
//     STORY_SCENES_PC, notify, I18N, saveGame, rerenderTab, renderQuestTab
// ══════════════════════════════════════════════════════════════════
(function(){
  if(typeof window==='undefined')return;
  if(window._EISENKLAU_MIDBOSS_LOADED)return; window._EISENKLAU_MIDBOSS_LOADED=true;

  function _avgDef(){
    let d=0,n=0; (G.fleet||[]).forEach(function(s){ try{ const st=getShipStats(s); d+=(st.DEF||0); n++; }catch(e){} });
    return (n&&d>0)?Math.round(d/n):20;   // 함대 DEF 합이 0이면 기본값 20 (방어 10배 = 최소 200 보장)
  }
  // 크리그 함대 + 아이젠클로 기함 생성
  function buildEisenklauFleet(){
    const fp=(typeof calcFleetAvgPower==='function')?calcFleetAvgPower():{atk:200,hp:5000,sh:1000};
    const ad=_avgDef();
    const enemies=[];
    function mk(id,key,nm,tier,mul,fc,armor,shield){
      const hp=Math.max(800,Math.round(fp.hp*mul));
      const att=Math.max(20,Math.round(fp.atk*mul));
      return {id:id,nm:nm,_nmKey:key,tier:tier,isEnemy:true,
        hp:hp,maxHP:hp,HP:hp,sh:Math.round(hp*0.4),maxSH:Math.round(hp*0.4),
        ATT:att,INT:Math.round(att*0.6),TEC:Math.round(att*0.5),DEF:Math.round(ad*0.7),
        LOY:0,shieldTier:shield,armorTier:armor,_formationCol:fc};
    }
    // 1열 크리그 소형 5 · 2열 중형 3 · 3열 일반 대형 1
    for(var i=0;i<5;i++) enemies.push(mk('KRIEG_S'+i,'enemy.kriegSmall', I18N.t('enemy.kriegSmall'),  '소형', 0.30, 0, 4, 5));
    for(var j=0;j<3;j++) enemies.push(mk('KRIEG_M'+j,'enemy.kriegMedium',I18N.t('enemy.kriegMedium'),'중형', 0.48, 1, 6, 7));
    enemies.push(mk('KRIEG_L0','enemy.kriegLarge',I18N.t('enemy.kriegLarge'),'대형', 0.65, 2, 8, 9));
    // 4열(최후방) 아이젠클로 기함 — 플레이어 함대 평균 대비 HP·방어 ×10, ATT ×5, 크기 2배.
    //   (낮은 하한선은 디제너릿 케이스 방지용 — 정상 플레이에선 ×10/×5 가 그대로 적용)
    const bhp=Math.max(5000,Math.round(fp.hp*10));
    const batt=Math.max(300,Math.round(fp.atk*5));
    const bdef=Math.max(100,Math.round(ad*10));
    enemies.push({id:'EISENKLAU_BOSS',nm:I18N.t('enemy.eisenklauFlagship'),_nmKey:'enemy.eisenklauFlagship',
      tier:'대형',isEnemy:true,
      hp:bhp,maxHP:bhp,HP:bhp,sh:Math.round(bhp*0.5),maxSH:Math.round(bhp*0.5),
      ATT:batt,INT:Math.round(batt*0.6),TEC:Math.round(batt*0.5),DEF:bdef,
      LOY:0,shieldTier:15,armorTier:15,_formationCol:3,_eisenklauBoss:true});
    return enemies;
  }

  // 수락된 퀘스트(q)를 받아: 신규 대면 컷신 → 전투. 전투 승리 시 퀘스트 'done'.
  function startEisenklauMidBoss(q){
    const _qid=q&&q.id, _qpid=(q&&q.planetId)||G.currentPlanet;
    function _enterCombat(){
      const raid={
        nm:I18N.t('enemy.eisenklauFleet'),_nmKey:'enemy.eisenklauFleet',
        _enemies:buildEisenklauFleet(),
        _shakedownDone:true,            // 통행료 시비 팝업 스킵 (중간보스 직행)
        _midBoss:'eisenklau',
        _onWin:function(){
          try{
            const arr=(G.quests&&G.quests[_qpid])||[];
            const lq=arr.find(function(x){return x&&x.id===_qid;});
            if(lq && lq.status==='active'){ lq.status='done'; lq.progress=lq.required||1; }
            if(typeof saveGame==='function')saveGame(true);
          }catch(e){}
        },
        _onLose:function(){
          // 패배 시 퀘스트를 available 로 되돌려 재수락(재도전) 가능하게.
          try{
            const arr=(G.quests&&G.quests[_qpid])||[];
            const lq=arr.find(function(x){return x&&x.id===_qid;});
            if(lq && lq.status==='active') lq.status='available';
            if(typeof saveGame==='function')saveGame(true);
          }catch(e){}
        }
      };
      var go=function(){ try{ startPirateRaid(raid); }catch(e){ console.error('[eisenklau] combat entry',e); try{notify('전투 진입 오류: '+e.message,'err');}catch(_){} } };
      if(typeof window._safeCombatEntry==='function') window._safeCombatEntry(go,'eisenklauMidBoss'); else go();
    }
    // 신규 대면 컷신 → onDone → 전투
    if(window.STORY_SCENES_PC && typeof window.STORY_SCENES_PC.triggerScene==='function'){
      window.STORY_SCENES_PC.triggerScene('p4_eisenklau', _enterCombat);
    } else {
      _enterCombat();
    }
  }
  window.buildEisenklauFleet=buildEisenklauFleet;
  window.startEisenklauMidBoss=startEisenklauMidBoss;
})();
