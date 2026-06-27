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

  // 이휘소(H09) 9번째 전설 영웅 합류 + 획득 팝업
  function _hv(){ return window._GAME_VER?('?v='+encodeURIComponent(window._GAME_VER)):''; }
  function showHero09Popup(){
    if(typeof openModal!=='function')return;
    const v=_hv(), nm=I18N.t('hero.H09.nm'), sk=I18N.t('hero.H09.sk');
    const html='<div style="text-align:center;padding:6px 4px">'
      +'<div style="font-size:13px;color:var(--gold);letter-spacing:2px;margin-bottom:10px;font-weight:bold">'+I18N.t('hero.newLegendBanner')+'</div>'
      +'<img src="img/chars/H/hero09.png'+v+'" onerror="this.onerror=null;this.src=\'img/chars/hero09.png'+v+'\'" style="width:200px;height:200px;border-radius:14px;object-fit:cover;border:2px solid var(--gold);box-shadow:0 0 28px rgba(255,215,0,.45);background:rgba(0,0,0,.4)">'
      +'<div style="font-size:23px;font-weight:bold;color:#ffe;margin-top:12px">🔬 '+nm+'</div>'
      +'<div style="font-size:13px;color:var(--cyan);margin-top:4px">'+sk+'</div>'
      +'<div style="font-size:12px;color:var(--dim);margin-top:10px;line-height:1.6;max-width:340px;margin-left:auto;margin-right:auto;word-break:keep-all">'+I18N.t('hero.H09.found')+'</div>'
      +'</div>';
    openModal(I18N.t('hero.acqTitle'), html, [{txt:I18N.t('btn.close'),fn:closeModal,cls:'btn-gold'}]);
    try{ if(typeof _showFireworks==='function')_showFireworks(); }catch(e){}
    try{ if(typeof sfxCoin==='function')sfxCoin(); }catch(e){}
  }
  function grantHero09(){
    if(!Array.isArray(G.heroes))G.heroes=[];
    if(G.heroes.indexOf('H09')<0){
      G.heroes.push('H09');
      try{ if(typeof updateHUD==='function')updateHUD(); }catch(e){}
      try{ notify(I18N.t('notify.heroRecruitedIc',{ic:(HEROES.H09&&HEROES.H09.ic)||'🔬',nm:I18N.t('hero.H09.nm')}),'pur'); }catch(e){}
      try{ if(typeof baekgu==='function')baekgu(I18N.t('baekgu.heroJoined',{nm:I18N.t('hero.H09.nm')})); }catch(e){}
      // Doc#5: 합류 컷신(p4_leehwiso_join) 강제 재생 → 종료 시 영웅 획득 카드. 실패 시 카드만.
      try{
        var S=window.STORY_SCENES_PC;
        if(S&&typeof S.triggerScene==='function'){
          if(G._scenesSeen) delete G._scenesSeen['scene_p4_leehwiso_join'];
          S.triggerScene('p4_leehwiso_join', showHero09Popup);
        } else { showHero09Popup(); }
      }catch(e){ showHero09Popup(); }
    }
  }

  // 수락된 퀘스트(q)를 받아: 신규 대면 컷신 → 전투. 전투 승리 시 퀘스트 'done' + 이휘소 영입.
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
            grantHero09();   // 이휘소(H09) 9번째 전설 영웅 합류 + 획득 팝업
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
    // 신규 대면 컷신 → onDone → 전투.
    //   컷신이 게이트/프롤로그/중복 등으로 차단되면 triggerScene 이 onDone 없이 return →
    //   전투가 영영 시작되지 않던 문제(사용자 보고: 중간보스전 미진행 2026-06-28).
    //   → 안전망: onDone 이 안 와도 전투는 반드시 진입(컷신 시청 중이면 대기).
    var _entered=false;
    function _enterOnce(){ if(_entered)return; _entered=true; _enterCombat(); }
    if(window.STORY_SCENES_PC && typeof window.STORY_SCENES_PC.triggerScene==='function'){
      window.STORY_SCENES_PC.triggerScene('p4_eisenklau', _enterOnce);
      setTimeout(function(){
        if(_entered) return;                                       // 컷신 정상 완료(onDone)
        if(document.getElementById('story-scene-overlay')) return; // 아직 컷신 시청 중 → 대기
        _enterOnce();                                              // 컷신 차단됨 → 전투 강제 진입
      }, 1600);
    } else {
      _enterOnce();
    }
  }
  window.buildEisenklauFleet=buildEisenklauFleet;
  window.startEisenklauMidBoss=startEisenklauMidBoss;
})();
