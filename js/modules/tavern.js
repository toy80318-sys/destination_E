// ══════════════════════════════════════════════════════════════════
// TAVERN (주점/가챠/블랙마켓/미스테리박스) 모듈 — game.js에서 분할 (2026-06-08, v1.0.0-beta.88)
//   · 행성주점 — 크루 가챠 + 미스테리박스 (4티어 함선/파츠/설계도)
//   · 블랙마켓 자와 (검은 함선 보이드 보상)
//   · 전설 크루 등장 시 폭죽 + 보상 카드 팝업
// 의존: window.G, window.I18N, window.PLANET_DEF, window.HEROES, window.SHIP_CATALOG,
//       window.PARTS, window.COMMODITIES, window.CRAFT_RECIPES, window.openModal,
//       window.closeModal, window.notify, window.baekgu, window.saveGame, window.updateHUD,
//       window.rerenderTab, window.showAcquisitionReport, window.imgOrEmoji, window.shipImgSrc,
//       window.partImgSrc, window.crewImgSrc, window.AudioMgr, window._GAME_VER,
//       window._fireFireworks, window.getMaxCrewCount, window.dismissLowestCrew, window.RARITY_MULT
// ══════════════════════════════════════════════════════════════════
(function(){
  if(typeof window==='undefined')return;
  // ═══ 주점 (가챠 + 블랙마켓 자와 미스테리박스) ════════════════════════════
  //   ※ 화물 브로커 의뢰는 행성 제독 탭에서 통합 관리 (사용자 명세)
  //   ※ 블랙마켓 자와는 30% 행성에 랜덤 등장, 매 턴 위치 변경 (사용자 명세)
  function _blackMarketZawaPlanets(){
    const allIds=(typeof PLANET_DEF!=='undefined'?PLANET_DEF:[]).map(p=>p.id);
    if(allIds.length===0)return [];
    const targetCount=Math.max(1,Math.round(allIds.length*0.3));
    const turnSeed=((G&&G.turn||0)*9973+(G&&G.act||0)*100003)|0;
    const scored=allIds.map(id=>{
      let h=turnSeed;
      for(let i=0;i<id.length;i++)h=Math.imul(h^id.charCodeAt(i),16777619);
      return {id,r:mulberry32(h>>>0)()};
    });
    scored.sort((a,b)=>a.r-b.r);
    return scored.slice(0,targetCount).map(s=>s.id);
  }
  function _isBlackMarketZawaHere(pid){return _blackMarketZawaPlanets().includes(pid);}
  
  // 블랙마켓 자와 — 미스테리박스 3단계 (사용자 요청)
  // I (저확률): ₡100,000 — 소·중형 함선, 일반/희귀 파츠 위주
  // II (중확률): ₡500,000 + VC×1 — 영웅/전설 파츠, 설계도 일부 가능
  // III (고확률): ₡1,000,000 + VC×3 — 전설 이상 파츠/함선/설계도 보장 풀
  // VE/VC 사용량 절반 적용 (사용자 요청, 2026-05-30)
  // VC 1→0 (영웅 박스에서 VC 요구 제거), VE 50→25 / 200→100
  const MYSTERY_BOX_TIERS={
    0:{cr:50000,  vc:0, ve:0,   label:I18N.t('mbox.label0'), rank:I18N.t('mbox.rank.common'), col:'#aaaaaa', bg:'rgba(120,120,140,.14)', bdr:'rgba(180,180,200,.45)'},
    1:{cr:100000, vc:0, ve:25,  label:I18N.t('mbox.label1'), rank:I18N.t('mbox.rank.rare'), col:'#88ccff', bg:'rgba(60,160,255,.14)',  bdr:'rgba(100,200,255,.5)'},
    2:{cr:500000, vc:0, ve:100, label:I18N.t('mbox.label2'), rank:I18N.t('mbox.rank.hero'), col:'#cc88ff', bg:'rgba(160,80,255,.16)',  bdr:'rgba(200,120,255,.55)'},
    3:{cr:2500000, vc:0, ve:300, label:I18N.t('mbox.label3'), rank:I18N.t('mbox.rank.hero5'), col:'#ffae4d', bg:'rgba(255,150,50,.16)', bdr:'rgba(255,180,90,.6)', x5:true}
  };
  
  // 전설급 이상 판정 (폭죽 트리거 — 사용자 요청)
  function _isLegendOrAbove(result){
    if(!result)return false;
    if(result.type==='bp'){
      const t=result.rec&&result.rec.tier;
      return t==='legend'||t==='mythic'||t==='flagship';
    }
    if(result.type==='part'){
      const p=result.p;if(!p)return false;
      if(p.rarity==='legend'||p.rarity==='set'||p.rarity==='mythic')return true;
      if((p.tier||0)>=11)return true;
      return false;
    }
    if(result.type==='ship'){
      return result.s&&(result.s.tier==='전설기함'||result.s.tier==='신화');
    }
    return false;
  }
  
  // 폭죽 이펙트 — 전설급 이상 보상 획득 시 (사용자 요청)
  function _showFireworks(){
    const overlay=document.createElement('div');
    overlay.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:99999;overflow:hidden';
    document.body.appendChild(overlay);
    const colors=['#ffd700','#ff3366','#33ddff','#cc66ff','#88ff88','#ffaa00','#ff66bb'];
    // 5번 연속 폭발
    for(let burst=0;burst<5;burst++){
      setTimeout(()=>{
        const cx=window.innerWidth*(0.2+Math.random()*0.6);
        const cy=window.innerHeight*(0.15+Math.random()*0.4);
        const baseCol=colors[Math.floor(Math.random()*colors.length)];
        const particleCount=28;
        for(let i=0;i<particleCount;i++){
          const angle=(Math.PI*2*i)/particleCount+Math.random()*0.3;
          const distance=90+Math.random()*100;
          const sz=4+Math.random()*4;
          const p=document.createElement('div');
          p.style.cssText='position:absolute;left:'+cx+'px;top:'+cy+'px;width:'+sz+'px;height:'+sz+'px;border-radius:50%;background:'+baseCol+';box-shadow:0 0 14px '+baseCol+',0 0 28px '+baseCol+';transition:transform 1.4s cubic-bezier(.18,.72,.32,1),opacity 1.4s ease-out;opacity:1';
          overlay.appendChild(p);
          requestAnimationFrame(()=>{
            p.style.transform='translate('+Math.cos(angle)*distance+'px,'+(Math.sin(angle)*distance+80)+'px) scale(.4)';
            p.style.opacity='0';
          });
        }
        // 중심 섬광
        const flash=document.createElement('div');
        flash.style.cssText='position:absolute;left:'+(cx-30)+'px;top:'+(cy-30)+'px;width:60px;height:60px;border-radius:50%;background:radial-gradient(circle,#fff 0%,'+baseCol+' 40%,transparent 70%);opacity:.95;transition:opacity .5s ease-out';
        overlay.appendChild(flash);
        requestAnimationFrame(()=>{flash.style.opacity='0';});
      },burst*220);
    }
    setTimeout(()=>{try{overlay.remove();}catch(e){}},3000);
    try{AudioMgr.playSfx('gacha_pull',{vol:0.7});}catch(e){}
  }
  
  // 경매 낙찰 팝업 — 사용자 요청 (2026-06-06): 폭죽 + 중앙 팝업, 2초 후 자동 해제
  function _showAuctionWinPopup(pd,lbc,amount){
    if(!pd)return;
    // 폭죽 이펙트 (재사용)
    try{_showFireworks();}catch(e){}
    // 중앙 팝업 — 2초 후 페이드아웃 + 제거
    const pop=document.createElement('div');
    pop.style.cssText='position:fixed;left:50%;top:42%;transform:translate(-50%,-50%) scale(.85);z-index:99980;background:linear-gradient(135deg,rgba(20,30,55,.96),rgba(40,30,70,.96));border:2px solid var(--gold);border-radius:14px;padding:22px 36px;text-align:center;box-shadow:0 12px 50px rgba(255,215,0,.45),0 0 80px rgba(255,150,0,.3);min-width:300px;max-width:480px;opacity:0;transition:opacity .35s ease, transform .35s cubic-bezier(.34,1.56,.64,1);font-family:inherit;pointer-events:none';
    const fac=FACTION&&FACTION[pd.f]; const facCol=fac?fac.col:'var(--gold)';
    const headerKey=pd.hostile?'ui.mergeAcquired':(lbc&&lbc.n===0?'auction.popup.alone':lbc?'auction.popup.over':'auction.popup.normal');
    const headerTxt=(typeof I18N!=='undefined'&&I18N.has&&I18N.has(headerKey))?I18N.t(headerKey,lbc?{comp:lbc.n}:{}):'🏛️ 낙찰!';
    pop.innerHTML=`<div style="font-size:38px;line-height:1">🎉</div>
      <div style="font-size:20px;font-weight:bold;color:var(--gold);letter-spacing:2px;margin:8px 0 4px">${headerTxt}</div>
      <div style="font-size:17px;font-weight:bold;color:#fff;margin-bottom:6px">${pd.nm}</div>
      ${fac?`<div style="font-size:11px;color:${facCol};letter-spacing:1px">${fac.nm}</div>`:''}
      <div style="font-size:13px;color:var(--cyan);margin-top:10px">${(typeof I18N!=='undefined'?I18N.t('ui.paid',{n:(amount||0).toLocaleString()}):'지불 ₡'+(amount||0).toLocaleString())}</div>`;
    document.body.appendChild(pop);
    requestAnimationFrame(()=>{pop.style.opacity='1';pop.style.transform='translate(-50%,-50%) scale(1)';});
    // 2초 후 사라짐 — 페이드아웃 후 DOM 제거
    setTimeout(()=>{
      pop.style.opacity='0';
      pop.style.transform='translate(-50%,-50%) scale(.92)';
      setTimeout(()=>{try{pop.remove();}catch(e){}},380);
    },2000);
  }
  
  // 보상명 표시 (해적 매복 결과창용)
  function _mysteryRewardName(result){
    if(!result)return I18N.t('ui.fallbackReward');
    if(result.type==='bp'){const _r=result.rec;const _nm=_r?((_r.type==='ship'?(shipDisplayNm(SHIP_CATALOG.find(s=>s.id===_r.id))||_r.nm):(partDisplayNm(PARTS.find(p=>p.id===_r.id)||SPECIAL_CARGO_PARTS.find(c=>c.id===_r.id)||{})||_r.nm))):'';return I18N.t('gacha.bpLabel',{nm:_nm});}
    if(result.type==='part')return I18N.t('gacha.partLabel',{nm:(result.p?partDisplayNm(result.p):'')||result.p?.nm||''});
    if(result.type==='ship')return I18N.t('gacha.shipLabel',{nm:(result.s?shipDisplayNm(result.s):'')||result.s?.nm||''});
    return I18N.t('ui.fallbackReward');
  }
  // 해적 매복 시 방금 받은 보상 회수
  function _revokeMysteryBoxReward(result){
    if(!result)return;
    if(result.type==='bp'&&result.rec){
      delete G.blueprints[result.rec.id];
    } else if(result.type==='part'&&result.p){
      const inv=(G.inventory||[]).find(i=>i.id===result.p.id);
      if(inv){if(inv.qty>1)inv.qty--; else G.inventory.splice(G.inventory.indexOf(inv),1);}
    } else if(result.type==='ship'&&result.s){
      // _spawnShipReward에서 생성한 함선 id 패턴 (id+'_bm_'+timestamp)으로 매칭
      const _marker=result.s.id+'_bm_';
      const _flt=s=>!String(s.id||'').startsWith(_marker);
      G.fleet=(G.fleet||[]).filter(_flt);
      if(G.reserveFleet)G.reserveFleet=G.reserveFleet.filter(_flt);
    }
  }
  // 5% 확률 해적 매복 — 패배 시 방금 받은 보상 회수 (사용자 요청)
  function _maybeBlackMarketAmbush(result,tier){
    if(Math.random()>0.05)return;
    const _plv=(typeof calcPlayerLevel==='function')?calcPlayerLevel():1;
    // 박스 등급이 높을수록 해적 강도도 강화
    const _ambushBase={0:25,1:60,2:120}[tier]||50;
    const _ambushPower=_ambushBase+Math.floor(Math.random()*60);
    const _winChance=_plv/(_plv+_ambushPower);
    const _won=Math.random()<_winChance;
    setTimeout(()=>{
      if(_won){
        notify(I18N.t('notify.ambushRepelled'),'gold');
        openModal(I18N.t('modal.pirateAmbushWin'),
          `<div style="padding:18px;text-align:center">
            <div style="font-size:46px">⚔️</div>
            <div style="color:var(--green);font-size:18px;font-weight:bold;margin-top:6px">${I18N.t('ui.ambushWin')}</div>
            <div style="color:var(--txt);font-size:13px;margin-top:4px">${I18N.t('ui.rewardSafe')}</div>
            <div style="color:var(--dim);font-size:11px;margin-top:8px">${I18N.t('ui.ambushStats',{plv:_plv,ambush:_ambushPower,pct:Math.round(_winChance*100)})}</div>
          </div>`,
          [{txt:I18N.t('btn.confirm'),fn:()=>{closeModal();saveGame(true);rerenderTab(renderTavernView);},cls:'btn-gold'}]);
      } else {
        _revokeMysteryBoxReward(result);
        notify(I18N.t('notify.piratesStoleReward'),'err');
        openModal(I18N.t('modal.pirateAmbushLose'),
          `<div style="padding:18px;text-align:center">
            <div style="font-size:46px">💀</div>
            <div style="color:var(--red);font-size:18px;font-weight:bold;margin-top:6px">${I18N.t('ui.ambushLose')}</div>
            <div style="color:var(--txt);font-size:13px;margin-top:4px">${I18N.t('ui.piratesTookAfter',{nm:_mysteryRewardName(result),lost:I18N.t('ui.piratesTookIt')})}</div>
            <div style="color:var(--dim);font-size:11px;margin-top:8px">${I18N.t('ui.ambushStats',{plv:_plv,ambush:_ambushPower,pct:Math.round(_winChance*100)})}</div>
          </div>`,
          [{txt:I18N.t('btn.confirm'),fn:()=>{closeModal();saveGame(true);rerenderTab(renderTavernView);},cls:'btn-sm'}]);
      }
    },500);
  }
  // 함선 보상 헬퍼 — 함대 만석이면 임시창고로
  function _spawnShipReward(s){
    if(!G.reserveFleet)G.reserveFleet=[];
    const _ns={
      id:s.id+'_bm_'+Date.now(),catalogId:s.id,nm:s.nm,tier:s.tier,
      hp:s.maxHP,maxHP:s.maxHP,sh:s.maxSH,maxSH:s.maxSH,
      ATT:s.ATT,INT:s.INT,TEC:s.TEC,parts:[],crewIds:[]
    };
    const _toRes=(G.fleet||[]).length>=16;
    if(_toRes)G.reserveFleet.push(_ns); else G.fleet.push(_ns);
    return {type:'ship',s:s,toReserve:_toRes};
  }
  
  // 인벤토리 파츠 추가
  function _addPartToInventory(p){
    const _inv=G.inventory.find(i=>i.id===p.id);
    if(_inv)_inv.qty++; else G.inventory.push({id:p.id,nm:p.nm,qty:1});
  }
  
  // 박스별 가중치 — 모든 박스에서 일반~신화까지 등장 가능, 확률만 차이 (사용자 요청)
  // ⚠️ 전설급 이상(L/set/mythic/전설기함/신화)는 사용자 요청으로 절반 조정 (2026-05-30)
  // 📜 설계도 확률 +3%p 인상 (사용자 요청, 2026-05-30)
  const MYSTERY_BOX_LOOT={
    0:{ // 일반 박스: 매우 저급 위주 (신규)
      cat:{bp:0.05, part:0.60, ship:0.35},
      bpTier:{legend:0.95, mythic:0.05},
      partRarW:{N:60, R:25, H:10, L:2, set:0.5, mythic:0.15},
      shipTierW:{'소형':70,'중형':25,'대형':4,'전설기함':0.5,'신화':0.1}
    },
    1:{ // 희귀 박스: 저급 위주
      cat:{bp:0.08, part:0.55, ship:0.37},
      bpTier:{legend:0.85, mythic:0.15},
      partRarW:{N:40, R:30, H:20, L:4, set:0.75, mythic:0.25},
      shipTierW:{'소형':50,'중형':35,'대형':12,'전설기함':1,'신화':0.5}
    },
    2:{ // 영웅 박스: 중급 위주
      cat:{bp:0.18, part:0.50, ship:0.32},
      bpTier:{legend:0.70, mythic:0.30},
      partRarW:{N:10, R:25, H:35, L:10, set:3.5, mythic:1.5},
      shipTierW:{'소형':15,'중형':35,'대형':30,'전설기함':7,'신화':3}
    }
  };
  MYSTERY_BOX_LOOT[3]=MYSTERY_BOX_LOOT[2];  // 영웅 ×5 — 영웅 풀 5회 사용 (사용자 요청 2026-06-16)
  function _weightedPick(weightMap){
    const entries=Object.entries(weightMap);
    const total=entries.reduce((s,[,w])=>s+w,0);
    if(total<=0)return null;
    let r=Math.random()*total;
    for(const [k,w] of entries){if((r-=w)<=0)return k;}
    return entries[entries.length-1][0];
  }
  function _partRarityKey(p){
    if(!p)return 'N';
    if(p.rarity==='mythic'||(p.tier||0)>=15)return 'mythic';
    if(p.rarity==='set')return 'set';
    if(p.rarity==='legend'||p.rarity==='L'||(p.tier||0)>=11)return 'L';
    if(p.rarity==='hero'||p.rarity==='H'||(p.tier||0)>=6)return 'H';
    if(p.rarity==='R')return 'R';
    return 'N';
  }
  function _pickPartByRarity(rarKey){
    const _all=(typeof PARTS!=='undefined'?PARTS:[]).filter(p=>!p.quest);
    const _pool=_all.filter(p=>_partRarityKey(p)===rarKey);
    if(_pool.length>0)return _pool[Math.floor(Math.random()*_pool.length)];
    // 폴백: 한 단계 낮춰 다시 시도
    const fallbackOrder=['N','R','H','L','set','mythic'];
    const idx=fallbackOrder.indexOf(rarKey);
    for(let i=idx-1;i>=0;i--){const fb=_all.filter(p=>_partRarityKey(p)===fallbackOrder[i]);if(fb.length>0)return fb[Math.floor(Math.random()*fb.length)];}
    for(let i=idx+1;i<fallbackOrder.length;i++){const fb=_all.filter(p=>_partRarityKey(p)===fallbackOrder[i]);if(fb.length>0)return fb[Math.floor(Math.random()*fb.length)];}
    return _all[0]||null;
  }
  function _pickShipByTier(shipTier){
    const _all=(typeof SHIP_CATALOG!=='undefined'?SHIP_CATALOG:[]).filter(s=>s.id!=='URSA'&&s.id!=='BLACKFALCON');
    const _pool=_all.filter(s=>s.tier===shipTier);
    if(_pool.length>0)return _pool[Math.floor(Math.random()*_pool.length)];
    // 폴백: 인접 등급
    const order=['소형','중형','대형','전설기함','신화'];
    const idx=order.indexOf(shipTier);
    for(let i=idx-1;i>=0;i--){const fb=_all.filter(s=>s.tier===order[i]);if(fb.length>0)return fb[Math.floor(Math.random()*fb.length)];}
    for(let i=idx+1;i<order.length;i++){const fb=_all.filter(s=>s.tier===order[i]);if(fb.length>0)return fb[Math.floor(Math.random()*fb.length)];}
    return _all[0]||null;
  }
  function _pickBpByTier(bpTierKey){
    const _all=(typeof CRAFT_RECIPES!=='undefined'?CRAFT_RECIPES:[]).filter(r=>!G.blueprints[r.id]);
    if(_all.length===0)return null;
    let _pool=_all.filter(r=>r.tier===bpTierKey);
    if(_pool.length===0){
      // 폴백: 미보유 중 무작위
      _pool=_all;
    }
    return _pool[Math.floor(Math.random()*_pool.length)];
  }
  
  // 미스테리박스 1회 뽑기 — 카테고리(설계도/파츠/함선)→등급 가중→인벤토리 반영. result 반환.
  function _pullMysteryOnce(loot){
    let result=null;
    const _catR=Math.random();
    let cat='ship';
    if(_catR<loot.cat.bp)cat='bp';
    else if(_catR<loot.cat.bp+loot.cat.part)cat='part';
    if(cat==='bp'){
      const bpTier=_weightedPick(loot.bpTier);
      const _bp=_pickBpByTier(bpTier);
      if(_bp){if(!G.blueprints)G.blueprints={};G.blueprints[_bp.id]=true;result={type:'bp',rec:_bp};}
      else cat='part';
    }
    if(!result&&cat==='part'){
      const rar=_weightedPick(loot.partRarW);
      const _p=_pickPartByRarity(rar);
      if(_p){_addPartToInventory(_p);result={type:'part',p:_p};}
    }
    if(!result){
      const st=_weightedPick(loot.shipTierW);
      const _s=_pickShipByTier(st);
      if(_s)result=_spawnShipReward(_s);
    }
    return result;
  }
  // showAcquisitionReport 카드용 변환 (영웅×5 묶음 보상)
  function _boxRewardItem(result){
    if(!result)return null;
    if(result.type==='bp'){
      const _r=result.rec;
      const _nm=(_r.type==='ship'?(shipDisplayNm(SHIP_CATALOG.find(s=>s.id===_r.id))||_r.nm):(partDisplayNm(PARTS.find(p=>p.id===_r.id)||SPECIAL_CARGO_PARTS.find(c=>c.id===_r.id)||{})||_r.nm));
      const _img=(typeof window.bpImgSrc==='function')?window.bpImgSrc(_r.id,_r.type==='ship'?'ship':'part'):(_r.type==='ship'?'img/ui/BP01.png':'img/ui/BP02.png');
      return {ic:'📜',nm:_nm,type:I18N.t('ui.bpAcquired'),rarity:_r.tier||'legend',img:_img};
    }
    if(result.type==='part'){
      return {ic:'⚙️',nm:partDisplayNm(result.p)||result.p.nm,type:I18N.t('ui.partAcquired'),rarity:result.p.rarity||'N',img:(typeof partImgSrc==='function')?partImgSrc(result.p.id):('img/parts/'+result.p.id+'.png')};
    }
    if(result.type==='ship'){
      return {ic:'🚀',nm:shipDisplayNm(result.s)||result.s.nm,type:I18N.tier(result.s.tier),rarity:result.s.tier,img:(typeof shipImgSrc==='function')?shipImgSrc({id:result.s.id,catalogId:result.s.id,tier:result.s.tier}):('img/ships/'+result.s.id+'.png')};
    }
    return null;
  }
  function openMysteryBox(tier){
    tier=tier||1;
    const cfg=MYSTERY_BOX_TIERS[tier];
    if(!cfg){notify(I18N.t('notify.invalidBoxTier'),'err');return;}
    if(!G||(G.credits||0)<cfg.cr){notify(I18N.t('notify.needCreditsCost',{cost:cfg.cr.toLocaleString()}),'err');return;}
    if(cfg.vc>0&&(G.voidCrystal||0)<cfg.vc){notify(I18N.t('notify.needVoidCrystal',{n:cfg.vc}),'err');return;}
    if(cfg.ve>0&&(G.voidEssence||0)<cfg.ve){notify(I18N.t('notify.needVoidEssence',{n:cfg.ve.toLocaleString()}),'err');return;}
    const pid=G.currentPlanet;
    if(!_isBlackMarketZawaHere(pid)){notify(I18N.t('notify.noBlackmarketHere'),'err');return;}
    // ── 실제 소모 (크레딧/VC/VE) — 사용자 요청 반영 ─────────────────
    G.credits=Math.max(0,(G.credits||0)-cfg.cr);
    if(cfg.vc>0)G.voidCrystal=Math.max(0,(G.voidCrystal||0)-cfg.vc);
    if(cfg.ve>0)G.voidEssence=Math.max(0,(G.voidEssence||0)-cfg.ve);
    if(typeof updateHUD==='function')updateHUD();
    // 즉시 저장 — 보상 처리 도중 새로고침에도 소모 반영 유지
    try{saveGame(true);}catch(e){}
    if(!G.blueprints)G.blueprints={};
    if(!G.inventory)G.inventory=[];
    // 영웅 ×5 (tier 3): 영웅 풀 5회 뽑아 묶음 보상 → showAcquisitionReport (사용자 요청 2026-06-16)
    if(cfg.x5){
      const _heroLoot=MYSTERY_BOX_LOOT[2];
      const _items=[]; let _anyFanfare=false, _lastInfo=null;
      for(let i=0;i<5;i++){
        const r=_pullMysteryOnce(_heroLoot);
        if(_isLegendOrAbove(r))_anyFanfare=true;
        const it=_boxRewardItem(r); if(it){_items.push(it); _lastInfo=it;}
      }
      if(_lastInfo){G._lastTavernBoxReward={type:'box5',nm:_lastInfo.nm,boxTier:tier,img:_lastInfo.img,ic:_lastInfo.ic};}
      try{
        if(typeof window.showAcquisitionReport==='function'){
          window.showAcquisitionReport({title:I18N.t('gacha.titlePrefix')+cfg.label,subtitle:I18N.t('mbox.x5Sub'),items:_items,color:cfg.col,rewardWide:true,onClose:function(){try{_maybeBlackMarketAmbush(null,tier);}catch(e){} saveGame(true); rerenderTab(renderTavernView);}});
        }
      }catch(e){}
      if(_anyFanfare)_showFireworks();
      saveGame(true);
      return;
    }
    const loot=MYSTERY_BOX_LOOT[tier];
    let result=_pullMysteryOnce(loot);

    // 결과 모달
    const _isFanfare=_isLegendOrAbove(result);
    let _title=I18N.t('gacha.titlePrefix')+cfg.label+(_isFanfare?I18N.t('gacha.fanfareSuffix'):'');
    let _bodyHtml='';
    if(!result){
      _bodyHtml=`<div style="padding:18px;text-align:center;color:var(--dim);font-size:13px">${I18N.t('ui.boxWasEmpty')}</div>`;
    } else if(result.type==='bp'){
      const _col=result.rec.tier==='mythic'?'#cc66ff':result.rec.tier==='flagship'?'#ff8800':'#d4af37';
      // 사용자 요청 2026-06-09: 미스테리박스 설계도 보상 팝업 이미지를 설계도 자체(BP01/BP02)로 교체
      //   · 함선 설계도 (LGD*) → img/ui/BP01.png
      //   · 파츠/창고 설계도 → img/ui/BP02.png
      //   · bpImgSrc 헬퍼 사용 (game.js 정의, 자동 분류)
      const _bpImgSrc=(typeof window.bpImgSrc==='function')
        ? window.bpImgSrc(result.rec.id, result.rec.type==='ship'?'ship':'part')
        : (result.rec.type==='ship'?'img/ui/BP01.png':'img/ui/BP02.png')+((typeof window!=='undefined'&&window._GAME_VER)?('?v='+encodeURIComponent(window._GAME_VER)):'');
      const _bpRecDispNm=(result.rec.type==='ship'?(shipDisplayNm(SHIP_CATALOG.find(s=>s.id===result.rec.id))||result.rec.nm):(partDisplayNm(PARTS.find(p=>p.id===result.rec.id)||SPECIAL_CARGO_PARTS.find(c=>c.id===result.rec.id)||{})||result.rec.nm));
      const _bpImgHtml=`<img src="${_bpImgSrc}" alt="${_bpRecDispNm}" style="width:120px;height:120px;object-fit:contain;border-radius:12px;background:rgba(0,0,0,.45);border:2px solid ${_col};box-shadow:0 0 22px ${_col}88;filter:drop-shadow(0 0 8px ${_col})" onerror="this.outerHTML='<div style=\\'font-size:64px\\'>📜</div>'">`;
      _bodyHtml=`<div style="padding:18px;text-align:center">
        <div style="margin-bottom:10px;display:flex;justify-content:center">${_bpImgHtml}</div>
        <div style="font-size:11px;color:var(--gold);letter-spacing:3px;margin-bottom:2px">📜 BLUEPRINT</div>
        <div style="color:${_col};font-size:20px;font-weight:bold;margin-top:6px">${I18N.t('ui.bpAcquired')}</div>
        <div style="color:var(--txt);font-size:14px;margin-top:4px">${_bpRecDispNm}</div>
        <div style="color:var(--dim);font-size:11px;margin-top:6px">${I18N.t('ui.canCraftHere')}</div>
      </div>`;
      notify(I18N.t('notify.bpAcquiredFromBox',{nm:_bpRecDispNm}),'gold');
    } else if(result.type==='part'){
      const _rc=result.p.rarity;
      const _pcol=_rc==='mythic'?'#cc66ff':_rc==='set'?'#33ddff':_rc==='legend'||_rc==='L'?'#d4af37':'var(--cyan)';
      const _pImgSrc=(typeof partImgSrc==='function')?partImgSrc(result.p.id):'img/parts/'+result.p.id+'.png';
      const _pImgHtml=`<img src="${_pImgSrc}" alt="${partDisplayNm(result.p)||result.p.nm}" style="width:120px;height:120px;object-fit:contain;border-radius:12px;background:rgba(0,0,0,.45);border:2px solid ${_pcol};box-shadow:0 0 22px ${_pcol}88;filter:drop-shadow(0 0 8px ${_pcol})" onerror="this.outerHTML='<div style=\\'font-size:64px\\'>⚙️</div>'">`;
      _bodyHtml=`<div style="padding:18px;text-align:center">
        <div style="margin-bottom:10px;display:flex;justify-content:center">${_pImgHtml}</div>
        <div style="font-size:11px;color:${_pcol};letter-spacing:3px;margin-bottom:2px">⚙️ PART</div>
        <div style="color:${_pcol};font-size:20px;font-weight:bold;margin-top:6px">${I18N.t('ui.partAcquired')}</div>
        <div style="color:var(--txt);font-size:14px;margin-top:4px">${partDisplayNm(result.p)||result.p.nm}</div>
        <div style="color:var(--dim);font-size:11px;margin-top:6px">${I18N.t('ui.addedToInventoryHint')}</div>
      </div>`;
      notify(I18N.t('notify.partAcquiredFromBox',{nm:partDisplayNm(result.p)||result.p.nm}),'gold');
    } else if(result.type==='ship'){
      const _scol=result.s.tier==='신화'?'#cc66ff':result.s.tier==='전설기함'?'#ff8800':'var(--green)';
      const _sImgSrc=(typeof shipImgSrc==='function')?shipImgSrc({id:result.s.id,catalogId:result.s.id,tier:result.s.tier}):'img/ships/'+result.s.id+'.png';
      const _sImgHtml=`<img src="${_sImgSrc}" alt="${shipDisplayNm(result.s)||result.s.nm}" style="width:160px;height:120px;object-fit:contain;border-radius:12px;background:rgba(0,0,0,.45);border:2px solid ${_scol};box-shadow:0 0 22px ${_scol}88;filter:drop-shadow(0 0 8px ${_scol})" onerror="this.outerHTML='<div style=\\'font-size:64px\\'>🚀</div>'">`;
      _bodyHtml=`<div style="padding:18px;text-align:center">
        <div style="margin-bottom:10px;display:flex;justify-content:center">${_sImgHtml}</div>
        <div style="font-size:11px;color:${_scol};letter-spacing:3px;margin-bottom:2px">🚀 SHIP · ${I18N.tier(result.s.tier)}</div>
        <div style="color:${_scol};font-size:20px;font-weight:bold;margin-top:6px">${I18N.t('ui.shipAcquired')}</div>
        <div style="color:var(--txt);font-size:14px;margin-top:4px">${shipDisplayNm(result.s)||result.s.nm}</div>
        <div style="color:var(--dim);font-size:11px;margin-top:6px">${result.toReserve?I18N.t('gacha.reserveSlot'):I18N.t('gacha.joinedFleet')}</div>
      </div>`;
      notify(I18N.t('notify.shipAcquiredFromBox',{nm:shipDisplayNm(result.s)||result.s.nm}),'gold');
    }
    // 최근 박스 보상 저장 — 우측 상단 카드용 (단일 + 최근 5장 목록)
    // 사용자 요청 2026-06-09: 박스 보상 카드 아이콘도 실제 이미지로 (설계도=BP01/BP02 자동 분류)
    if(result){
      let _rwInfo=null;
      if(result.type==='bp'){
        const _r=result.rec;
        const _bpNm=(_r.type==='ship'?(shipDisplayNm(SHIP_CATALOG.find(s=>s.id===_r.id))||_r.nm):(partDisplayNm(PARTS.find(p=>p.id===_r.id)||SPECIAL_CARGO_PARTS.find(c=>c.id===_r.id)||{})||_r.nm));
        const _bpCardImg=(typeof window.bpImgSrc==='function')
          ? window.bpImgSrc(_r.id, _r.type==='ship'?'ship':'part')
          : (_r.type==='ship'?'img/ui/BP01.png':'img/ui/BP02.png');
        _rwInfo={type:'bp',nm:_bpNm,id:_r.id,tier:_r.tier||'legend',boxTier:tier,img:_bpCardImg,ic:'📜'};
      } else if(result.type==='part'){
        _rwInfo={type:'part',nm:partDisplayNm(result.p)||result.p.nm,id:result.p.id,rarity:result.p.rarity||'N',boxTier:tier,img:(typeof partImgSrc==='function')?partImgSrc(result.p.id):('img/parts/'+result.p.id+'.png'),ic:'⚙️'};
      } else if(result.type==='ship'){
        _rwInfo={type:'ship',nm:shipDisplayNm(result.s)||result.s.nm,id:result.s.id,tier:result.s.tier,boxTier:tier,img:(typeof shipImgSrc==='function')?shipImgSrc({id:result.s.id,catalogId:result.s.id,tier:result.s.tier}):('img/ships/'+result.s.id+'.png'),ic:'🚀'};
      }
      if(_rwInfo){
        G._lastTavernBoxReward=_rwInfo;
        const _prev=G._lastTavernBoxRewardList||[];
        G._lastTavernBoxRewardList=[_rwInfo,..._prev].slice(0,5);
      }
    }
    openModal(_title,_bodyHtml,[{txt:I18N.t('btn.close'),fn:()=>{
      closeModal();
      // 5% 확률 해적 매복 — 패배 시 보상 회수
      _maybeBlackMarketAmbush(result,tier);
      saveGame(true);
      rerenderTab(renderTavernView);
    },cls:'btn-gold'}]);
    if(_isFanfare){_showFireworks();}
    saveGame(true);
  }
  
  function renderTavernView(body){
    const pd=PLANET_DEF.find(p=>p.id===G.currentPlanet);
    body.classList.add('cv');
    const vc=G.voidCrystal,cr=G.credits;
    const hasNelson=G.heroes.includes('H05');
    // 사용자 요청 (2026-06-06): Nelson 보유 시 전설 확률 = 3% + 1%×영웅수
    const _heroAcqCnt2=(G.heroes||[]).filter(h=>/^H0[1-8]$/.test(h)).length;
    const legRate=hasNelson?((3+_heroAcqCnt2).toFixed(0)+'%'):'0.5%';
    // 블랙마켓 자와 — 미스테리박스 (30% 행성 랜덤, 매 턴 위치 변경)
    const pid=G.currentPlanet;
    generateQuests(pid);
    const ve=G.voidEssence||0;
    const _bmHere=_isBlackMarketZawaHere(pid);
    function _bmBtn(tier){
      const cfg=MYSTERY_BOX_TIERS[tier];
      const aff=(cr>=cfg.cr)&&((G.voidCrystal||0)>=cfg.vc)&&((G.voidEssence||0)>=cfg.ve);
      const _ic={0:'🪙',1:'📦',2:'🎁'}[tier]||'🎁';
      // 박스 등급별 NPC 타입 — 일반:gather / 희귀:explore / 영웅:combat (수상한 거물)
      const _bmNpcType={0:'gather',1:'explore',2:'combat'}[tier]||'gather';
      // 등급별 상위 보상 확률 요약
      const loot=MYSTERY_BOX_LOOT[tier];
      const _legendPct=Math.round((loot.partRarW.L+loot.partRarW.set+loot.partRarW.mythic)/(loot.partRarW.N+loot.partRarW.R+loot.partRarW.H+loot.partRarW.L+loot.partRarW.set+loot.partRarW.mythic)*100);
      return `<div style="background:${cfg.bg};border:1.5px solid ${aff?cfg.bdr:'rgba(80,80,80,.4)'};border-radius:8px;padding:6px 10px;display:flex;align-items:center;gap:8px;flex-shrink:0;min-width:0;overflow:hidden;${aff?'':'opacity:.6'}">
        ${_npcImg(_bmNpcType,cfg.col,104)}
        <div style="flex:1;min-width:0">
          <div style="color:${cfg.col};font-size:12px;font-weight:bold;line-height:1.45">${_ic} ${cfg.label}</div>
          <div style="color:var(--dim);font-size:9px;line-height:1.3">${I18N.t('ui.lootCategoryPct',{bp:Math.round(loot.cat.bp*100),part:Math.round(loot.cat.part*100),ship:Math.round(loot.cat.ship*100),legend:_legendPct})}</div>
        </div>
        <div style="text-align:right;flex-shrink:0;font-size:10px">
          <div style="color:${cr>=cfg.cr?cfg.col:'#ff8888'};font-weight:bold">₡${cfg.cr.toLocaleString()}</div>
          ${cfg.vc>0?`<div style="color:${G.voidCrystal>=cfg.vc?'#cc88ff':'#ff8888'}">VC×${cfg.vc}</div>`:''}
          ${cfg.ve>0?`<div style="color:${G.voidEssence>=cfg.ve?'#88ddff':'#ff8888'}">VE ${cfg.ve.toLocaleString()}</div>`:''}
        </div>
        <button class="btn" onclick="openMysteryBox(${tier})" ${aff?'':'disabled'} style="font-size:11px;padding:5px 12px;background:${aff?'rgba(255,200,80,.15)':'rgba(50,50,50,.3)'};border-color:${aff?cfg.col:'var(--bdr)'};color:${aff?cfg.col:'var(--dim)'};font-weight:bold;flex-shrink:0;align-self:stretch">${I18N.t('ui.openBox')}</button>
      </div>`;
    }
    // 제작 재료 1:3 맞교환 카드 (사용자 요청 2026-06-17) — 미스테리박스 하단.
    //   받을 재료 1개 + 줄 재료 3개(슬롯) → 1:3 교환. 우측 '교환' 버튼.
    function _materialBarterCard(){
      const _mats=(typeof COMMODITIES!=='undefined')?COMMODITIES.filter(c=>c.material):[];
      if(!_mats.length)return '';
      const _nm=c=>(typeof commDisplayNm==='function'?commDisplayNm(c):c.nm)||c.id;
      const recvOpts=_mats.map(c=>`<option value="${c.id}">${_nm(c)}</option>`).join('');
      const owned=_mats.filter(c=>(G.materials&&G.materials[c.id]||0)>0);
      const giveOpts='<option value="">—</option>'+owned.map(c=>`<option value="${c.id}">${_nm(c)} ×${G.materials[c.id]}</option>`).join('');
      const _selSty='font-size:10px;padding:3px 4px;background:rgba(0,0,0,.55);color:var(--txt);border:1px solid rgba(255,200,80,.35);border-radius:4px;max-width:46%';
      return `<div style="margin-top:8px;background:rgba(255,200,80,.06);border:1.5px solid rgba(255,200,80,.35);border-radius:8px;padding:8px 10px;display:flex;align-items:center;gap:8px;flex-shrink:0">
        <div style="flex:1;min-width:0">
          <div style="color:#ffcc66;font-size:12px;font-weight:bold;line-height:1.4">${I18N.t('bm.barterTitle')}</div>
          <div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin-top:5px">
            <span style="font-size:10px;color:var(--dim)">${I18N.t('bm.barterRecv')}</span>
            <select id="bm-ex-recv" style="${_selSty}">${recvOpts}</select>
            <span style="font-size:10px;color:var(--dim);margin-left:4px">${I18N.t('bm.barterGive')}</span>
            <select id="bm-ex-give0" style="${_selSty}">${giveOpts}</select>
            <select id="bm-ex-give1" style="${_selSty}">${giveOpts}</select>
            <select id="bm-ex-give2" style="${_selSty}">${giveOpts}</select>
          </div>
        </div>
        <button class="btn" onclick="exchangeMaterials()" style="font-size:11px;padding:5px 12px;background:rgba(255,200,80,.15);border-color:#ffcc66;color:#ffcc66;font-weight:bold;flex-shrink:0;align-self:stretch">${I18N.t('bm.barterBtn')}</button>
      </div>`;
    }
    // (구버전 blackMarketHtml 변수는 _bmBtn(3) 참조 오류로 제거 — 현재는 본문 innerHTML 에서 _bmBtn(0/1/2)을 인라인 호출)
    // P30 보이드 보스 소문 (모든 보이드 행성 보유 시 백구가 귀띔) — 격파/진행 상태별 메시지
    const voidBossRumorHtml=(()=>{
      if(!(pid==='P30'&&_allVoidOwned()))return '';
      if(G._voidFalconDefeated){
        return `<div style="background:rgba(0,100,40,.13);border:1px solid rgba(0,255,140,.35);border-radius:8px;padding:10px 12px;margin-top:10px">
          <div style="display:flex;align-items:center;gap:7px;margin-bottom:6px">
            ${_baekguIcon(20)}
            <div><div style="color:var(--green);font-size:12px;font-weight:bold">${I18N.t('ui.baekguDefeatedTag')}</div></div>
          </div>
          <div style="font-size:12px;color:rgba(180,255,200,.9);line-height:1.6">
            ${I18N.t('ui.baekguAfterFalconDefeat')}
          </div>
        </div>`;
      }
      const q=(G.quests?.['P30']||[]).find(q=>q.id==='q_void_boss');
      const _statusLbl=!q?I18N.t('quest.notYetAppeared'):
        q.status==='available'?I18N.t('quest.adminAvail'):
        q.status==='active'?I18N.t('quest.adminActive'):
        q.status==='done'?I18N.t('quest.adminDone'):
        `<span style="color:var(--dim)">${I18N.t('ui.completedQuest')}</span>`;
      return `<div style="background:rgba(80,0,120,.13);border:1px solid rgba(180,0,255,.35);border-radius:8px;padding:10px 12px;margin-top:10px">
        <div style="display:flex;align-items:center;gap:7px;margin-bottom:6px">
          ${_baekguIcon(20)}
          <div>
            <div style="color:var(--purple);font-size:12px;font-weight:bold">${I18N.t('ui.baekguSecretTag')}</div>
            <div style="color:var(--dim);font-size:10px">${I18N.t('ui.baekguTavernCorner')}</div>
          </div>
        </div>
        <div style="font-size:12px;color:rgba(220,180,255,.9);line-height:1.6">
          ${I18N.t('ui.voidBossRumorLine1')}<br>
          ${I18N.t('ui.voidBossRumorLine2')}<br>
          ${I18N.t('ui.unknownAppearedCode',{thing:I18N.t('ui.oneBlackSmall')})}<br>
          ${I18N.t('ui.blackfalconNickname',{call:I18N.t('ui.callMeThat')})}<br>
          ${I18N.t('ui.targetUnknownLine')}<br>
          ${I18N.t('ui.zetaPlazaOnly',{place:I18N.t('ui.zetaPlaza')})}
        </div>
        <div style="margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,.08);font-size:12px">${_statusLbl}</div>
      </div>`;
    })();
    // 행성 팩션 NPC 이미지 — 각 버튼 좌측 배치 (퀘스트 인물 사용)
    // 사용자 요청 2026-06-07: 44→132 (3배). 주점·블랙마켓 양쪽에 동시 적용됨.
    const _npcFac=(/^F0[1-7]$/.test(pd?.f||''))?pd.f:'F01';
    function _npcImg(type,col,size){
      size=size||132;
      const _src='img/quests/'+type+'_'+_npcFac+'.png'+((window._GAME_VER)?('?v='+encodeURIComponent(window._GAME_VER)):'');
      return `<div style="width:${size}px;height:${size}px;border-radius:10px;background:rgba(0,0,0,.45);border:2px solid ${col}99;display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;box-shadow:0 0 16px ${col}33">
        <img src="${_src}" alt="" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none'">
      </div>`;
    }
    // 가차 버튼 — NPC 이미지 + 정보 + 비용 + 영입 (컴팩트 사용자 요청)
    function _gachaBtn(opts){
      // 사용자 요청 2026-06-07: veCost 파라미터 지원 (VE 기반 모집)
      // 사용자 요청 2026-06-16: 크레딧+VE 동시 비용 시 둘 다 충분해야 활성화
      const _affCr=opts.cost>0?(cr>=opts.cost):true;
      const _affVe=opts.veCost>0?((G.voidEssence||0)>=opts.veCost):true;
      const _affVc=opts.vcCost>0?((G.voidCrystal||0)>=opts.vcCost):true;
      const aff=(opts.cost>0||opts.veCost>0||opts.vcCost>0)?(_affCr&&_affVe&&_affVc):true;
      return `<div style="background:${opts.bg};border:1.5px solid ${aff?opts.bdr:'rgba(80,80,80,.4)'};border-radius:8px;padding:6px 10px;display:flex;align-items:center;gap:8px;flex-shrink:0;min-width:0;overflow:hidden;${aff?'':'opacity:.6'}">
        ${_npcImg(opts.npcType||'delivery',opts.col,104)}
        <div style="flex:1;min-width:0">
          <div style="color:${opts.col};font-size:12px;font-weight:bold;line-height:1.45">${opts.icon} ${opts.label}</div>
          ${opts.sub?`<div style="color:var(--dim);font-size:9px;line-height:1.3;margin-top:2px">${opts.sub}</div>`:''}
        </div>
        <div style="text-align:right;flex-shrink:0;font-size:10px">
          ${opts.cost>0?`<div style="color:${cr>=opts.cost?opts.col:'#ff8888'};font-weight:bold">₡${opts.cost.toLocaleString()}</div>`:''}
          ${opts.veCost>0?`<div style="color:${(G.voidEssence||0)>=opts.veCost?'#99ffcc':'#ff8888'};font-weight:bold">VE ${opts.veCost}</div>`:''}
          ${opts.vcCost>0?`<div style="color:${(G.voidCrystal||0)>=opts.vcCost?'#cc88ff':'#ff8888'};font-weight:bold">VC×${opts.vcCost}</div>`:''}
        </div>
        <button class="btn" onclick="${opts.onClick}" ${aff?'':'disabled'} style="font-size:11px;padding:5px 12px;background:${aff?'rgba(255,200,80,.15)':'rgba(50,50,50,.3)'};border-color:${aff?opts.col:'var(--bdr)'};color:${aff?opts.col:'var(--dim)'};font-weight:bold;flex-shrink:0;align-self:stretch">${I18N.t('ui.recruit')}</button>
      </div>`;
    }
    // 미니 카드 — 5장 가로 행 (사용자 요청)
    // 사용자 요청 2026-06-07: 인물 이미지 36→72 (2배 확대)
    function _miniCard(opts){
      const _col=opts.color||'var(--cyan)';
      return `<div style="flex:1;min-width:0;background:rgba(0,0,0,.4);border:1.5px solid ${_col};border-radius:8px;padding:6px;display:flex;flex-direction:column;align-items:center;gap:5px;box-shadow:0 0 8px ${_col}33">
        <div style="width:72px;height:72px;border-radius:8px;background:rgba(0,0,0,.5);border:1px solid ${_col}55;display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden">
          ${opts.img?`<img src="${opts.img}" alt="" style="max-width:100%;max-height:100%;object-fit:contain;border-radius:6px" onerror="this.outerHTML='<span style=&quot;font-size:36px&quot;>${opts.ic||'?'}</span>'">`:`<span style="font-size:36px">${opts.ic||'?'}</span>`}
        </div>
        <div style="color:${_col};font-size:10px;font-weight:bold;line-height:1.15;width:100%;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${opts.name}</div>
      </div>`;
    }
    function _miniEmpty(){
      return `<div style="flex:1;min-width:0;background:rgba(0,0,0,.2);border:1px dashed rgba(255,255,255,.1);border-radius:8px;padding:6px;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100px">
        <span style="font-size:22px;color:rgba(255,255,255,.15)">·</span>
      </div>`;
    }
    // 5장 카드 행 — flex로 가로 분포
    function _miniRow(items){
      const cards=[];
      for(let i=0;i<5;i++){
        cards.push(items[i]?_miniCard(items[i]):_miniEmpty());
      }
      return `<div style="display:flex;gap:4px;flex-shrink:0">${cards.join('')}</div>`;
    }
    // 최근 영입 크루 카드 (5장 가로 행)
    const _RC2={N:'var(--muted)',R:'var(--blue)',H:'var(--purple)',L:'var(--gold)',S:'#ff6ec7'};
    const _lcList=(G._lastTavernCrewList||[]).map(c=>{
      // KO/EN 혼재 방지: c.id가 영웅 ID(H01~H08)면 현재 언어의 HEROES[id].nm을 사용 (저장 당시 언어 무시)
      const _curNm=(c.id&&typeof HEROES!=='undefined'&&HEROES[c.id]&&HEROES[c.id].nm)||c.nm;
      return {img:c.img,ic:c.ic||'🧑',name:_curNm+(c.isHero?' ⭐':''),color:_RC2[c.rarity]||'var(--cyan)'};
    });
    const leftResultHtml=_miniRow(_lcList);
    // 최근 박스 보상 카드 (5장 가로 행)
    const _lbList=(G._lastTavernBoxRewardList||[]).map(rw=>{
      let _col='var(--cyan)';
      if(rw.type==='bp'){
        _col=rw.tier==='mythic'?'#cc66ff':rw.tier==='flagship'?'#ff8800':'#d4af37';
      } else if(rw.type==='part'){
        _col=rw.rarity==='mythic'?'#cc66ff':rw.rarity==='set'?'#33ddff':(rw.rarity==='legend'||rw.rarity==='L')?'#d4af37':(rw.rarity==='hero'||rw.rarity==='H')?'var(--purple)':rw.rarity==='R'?'var(--blue)':'var(--muted)';
      } else if(rw.type==='ship'){
        _col=rw.tier==='신화'?'#cc66ff':rw.tier==='전설기함'?'#ff8800':rw.tier==='대형'?'var(--gold)':rw.tier==='중형'?'var(--cyan)':'var(--muted)';
      }
      return {img:rw.img,ic:rw.ic||'?',name:rw.nm,color:_col};
    });
    const rightResultHtml=_miniRow(_lbList);
    // 인벤토리 파츠 개수 합계
    const _partInvCount=(G.inventory||[]).filter(i=>i.qty>0&&(typeof PARTS!=='undefined'?PARTS:[]).find(p=>p.id===i.id)).reduce((s,i)=>s+i.qty,0);
    // 인벤토리 창고 확장 파츠 개수 합계
    const _cargoInvCount=(G.inventory||[]).filter(i=>i.qty>0&&(typeof SPECIAL_CARGO_PARTS!=='undefined'?SPECIAL_CARGO_PARTS:[]).find(c=>c.id===i.id)).reduce((s,i)=>s+i.qty,0);
    // 보유 설계도 개수
    const _bpCount=Object.keys(G.blueprints||{}).filter(k=>G.blueprints[k]).length;
    body.innerHTML=`
    <div class="gc-panel" style="flex-direction:column;overflow:hidden;height:100%">
      <!-- 메인: 좌(크루 영입) / 우(블랙마켓 자와) 분할 -->
      <div style="display:flex;flex-direction:row;flex:1;min-height:0;overflow:hidden">
        <!-- LEFT: 크루 영입 -->
        <div style="flex:1;display:flex;flex-direction:column;border-right:1px solid rgba(0,243,255,.2);overflow:hidden;min-width:0;background:rgba(212,175,55,.03)">
          <!-- 헤더 -->
          <div style="padding:8px 12px;border-bottom:1px solid rgba(212,175,55,.2);flex-shrink:0;background:rgba(5,10,22,.6)">
            <div style="color:var(--gold);font-size:13px;font-weight:bold">${I18N.t('ui.tavernRecruitTitle',{nm:pd?.nm||''})}</div>
            <div style="color:var(--dim);font-size:10px;margin-top:1px">${I18N.t('ui.crewSortHint')}</div>
          </div>
          <!-- 본문 — 카드 행 → 위쪽 spacer → 버튼 → 아래쪽 spacer (버튼 중간 배치) -->
          <div style="flex:1;overflow-y:auto;padding:10px 12px;display:flex;flex-direction:column;min-height:0">
            <!-- 최근 영입 카드 5장 (상단) -->
            ${leftResultHtml}
            <div style="flex:1;min-height:14px"></div>
            <!-- 가차 버튼 (4종 — 2x2 그리드, VC×5 → VE 기반 2종 교체) (사용자 요청 2026-06-07) -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
              ${_gachaBtn({icon:'💰',label:I18N.t('gacha.btnRecruit500'),sub:I18N.t('gacha.btnRecruit500Sub'),cost:500,onClick:"doGacha(1,true,500,'N')",bg:'rgba(0,243,255,.08)',bdr:'var(--cyan)',col:'var(--cyan)',npcType:'delivery'})}
              ${_gachaBtn({icon:'💎',label:I18N.t('gacha.btnRecruit2k'),sub:I18N.t('gacha.btnRecruit2kSub'),cost:2000,onClick:"doGacha(1,true,2000,'R')",bg:'rgba(30,100,255,.12)',bdr:'#4499ff',col:'#88ccff',npcType:'explore'})}
              ${_gachaBtn({icon:'💜',label:I18N.t('gacha.btnRecruitVE5'),sub:'',cost:10000,veCost:5,onClick:"doGacha(5,true,10000,'R',5)",bg:'rgba(102,255,200,.10)',bdr:'#66ddaa',col:'#99ffcc',npcType:'gather'})}
              ${_gachaBtn({icon:'✨',label:I18N.t('gacha.btnRecruitVE20'),sub:'',cost:50000,veCost:20,onClick:"doGacha(5,true,50000,'H',20)",bg:'rgba(255,200,80,.12)',bdr:'#ffcc66',col:'#ffd700',npcType:'combat'})}
            </div>
            <div style="flex:1;min-height:14px"></div>
          </div>
          <!-- 하단 정보 바 -->
          <div style="padding:8px 12px;background:rgba(0,0,0,.35);border-top:1px solid rgba(212,175,55,.2);flex-shrink:0;font-size:10px;color:var(--dim);line-height:1.6">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">
              <span>${I18N.t('ui.ceilingCounter')}</span>
              <span style="color:${G.gachaPity>=60?'var(--gold)':'var(--muted)'};font-weight:bold">${G.gachaPity}/80</span>
            </div>
            <div style="height:4px;background:var(--panel);border-radius:2px;overflow:hidden;margin-bottom:5px"><div style="height:100%;width:${Math.round(G.gachaPity/80*100)}%;background:${G.gachaPity>=60?'var(--gold)':'var(--cyan)'};border-radius:2px;transition:width .3s"></div></div>
            <div style="font-size:10px;color:var(--muted);line-height:1.65">${I18N.t('gacha.legendRateStat',{rate:legRate})}${hasNelson?I18N.t('gacha.nelsonBonus'):I18N.t('gacha.pityOnly')}</div>
            <div style="margin-top:4px;padding-top:4px;border-top:1px solid rgba(255,255,255,.06);display:flex;justify-content:space-between;gap:6px;font-size:10px">
              <span>${I18N.t('ui.crewHave',{n:G.crew.length})}</span>
              <span>💎 VC <span style="color:#cc88ff;font-weight:bold">${vc}</span></span>
              <span>₡<span style="color:var(--gold);font-weight:bold">${cr.toLocaleString()}</span></span>
            </div>
          </div>
        </div>
        <!-- RIGHT: 블랙마켓 자와 -->
        <div style="flex:1;display:flex;flex-direction:column;background:rgba(255,80,150,.04);overflow:hidden;min-width:0">
          <!-- 헤더 -->
          <div style="padding:8px 12px;border-bottom:1px solid rgba(255,80,150,.3);flex-shrink:0;background:rgba(5,10,22,.6);display:flex;align-items:center;gap:10px">
            <div style="flex:1;min-width:0">
              <div style="color:#ff66bb;font-size:13px;font-weight:bold">${I18N.t('ui.blackmarketZawaTitle')}</div>
              <div style="color:var(--dim);font-size:10px;margin-top:1px">${I18N.t('ui.gachaTierBoostHint')}</div>
            </div>
            ${_bmHere?`<div style="text-align:right;flex-shrink:0;font-size:11px;line-height:1.4;white-space:nowrap"><span style="color:#ff66bb;font-weight:bold">${I18N.t('plaza.zawaHere',{nm:pd?.nm||I18N.t('qcard.dest')})}</span> · <span style="color:var(--dim);font-size:10px">${I18N.t('ui.fadesNextTurn')}</span></div>`:''}
          </div>
          <!-- 본문 — 좌측과 동일 구조: 카드 행 → spacer → 버튼 → spacer -->
          <div style="flex:1;overflow-y:auto;padding:10px 12px;display:flex;flex-direction:column;min-height:0">
            <!-- 최근 박스 보상 카드 5장 (상단) -->
            ${rightResultHtml}
            <div style="flex:1;min-height:14px"></div>
            ${_bmHere
              ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
                  ${_bmBtn(0)}${_bmBtn(1)}${_bmBtn(2)}${_bmBtn(3)}
                </div>
                ${_materialBarterCard()}`
              : `<div style="background:rgba(20,20,30,.35);border:1px dashed rgba(255,255,255,.12);border-radius:10px;padding:14px;text-align:center">
                  <div style="font-size:30px;opacity:.4;margin-bottom:6px">🎁</div>
                  <div style="color:var(--dim);font-size:12px;line-height:1.6">${I18N.t('ui.noBlackmarketHerePlanet')}<br><span style="font-size:11px;opacity:.7">매 턴 30% 행성에 랜덤 등장<br>${I18N.t('ui.exploreOtherPlanets')}</span></div>
                </div>`}
            <div style="flex:1;min-height:14px"></div>
          </div>
          <!-- 하단 정보 바 — 좌측과 동일 스타일 -->
          <div style="padding:8px 12px;background:rgba(0,0,0,.35);border-top:1px solid rgba(255,80,150,.3);flex-shrink:0;font-size:10px;color:var(--dim);line-height:1.6">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">
              <span>${I18N.t('ui.boxRewardStats')}</span>
              <span style="color:#ff66bb;font-weight:bold">${_bmHere?I18N.t('plaza.zawaActive'):I18N.t('plaza.zawaInactive')}</span>
            </div>
            <div style="font-size:10px;color:var(--muted);line-height:1.65">${I18N.t('ui.invSummary',{p:_partInvCount,c:_cargoInvCount,b:_bpCount})}</div>
            <div style="margin-top:4px;padding-top:4px;border-top:1px solid rgba(255,255,255,.06);display:flex;justify-content:space-between;gap:6px;font-size:10px">
              <span>⚛️ VE <span style="color:#88ddff;font-weight:bold">${ve.toLocaleString()}</span></span>
              <span>💎 VC <span style="color:#cc88ff;font-weight:bold">${vc}</span></span>
              <span>₡<span style="color:var(--gold);font-weight:bold">${cr.toLocaleString()}</span></span>
            </div>
          </div>
        </div>
      </div>
      <!-- 보이드 보스 루머 (하단 풀폭) -->
      ${voidBossRumorHtml?`<div style="padding:0 12px 10px 12px;flex-shrink:0">${voidBossRumorHtml}</div>`:''}
      <!-- 가챠 결과 표시용 hidden body (renderGachaCards 참조) -->
      <div id="gc-result-body" style="display:none"></div>
    </div>`;
  }
  
  function renderGachaView(body){renderTavernView(body);}
  
  function renderGachaCards(results){
    const c=document.getElementById('gc-result-body');if(!c)return;
    const rarityCol={N:'var(--dim)',R:'var(--blue)',H:'var(--purple)',L:'var(--gold)',S:'#ff6ec7'};
    const CREW_BONUS={Pilot:{att:8,int2:2,tec:4},Eng:{att:2,int2:5,tec:8},Merch:{att:3,int2:7,tec:4}};
    // 결과 없으면 빈 상태 복원 (가챠 안 했을 때)
    if(!results||results.length===0){
      c.innerHTML=`<div class="gc-empty"><div style="font-size:30px;margin-bottom:4px">🎲</div><div>${I18N.t('ui.startGacha')}</div></div>`;
      return;
    }
    // 컴팩트 카드 — 1행 8명, 왼쪽에서부터 영입 순서대로
    c.innerHTML=results.map((r,i)=>{
      const rKey='r'+r.rarity;
      const rnm=I18N.rarity(r.rarity)||'';
      const rcol=rarityCol[r.rarity]||'var(--dim)';
      const cb=CREW_BONUS[r.cl]||{att:3,int2:3,tec:3};
      const m=RARITY_MULT[r.rarity]||1;
      const bonusTxt=['att','int2','tec'].filter(k=>cb[k]>0).map(k=>`${k.replace('int2','SHD').replace('att','ATT').replace('tec','ENG').replace('def','DEF')}+${Math.round(cb[k]*m)}`).join(' ');
      const gen=(r.ic||'👩').includes('👩')||r.nm?.endsWith('a')?'f':'m';
      const safeName=(r.nm||I18N.t('ui.unnamed')).replace(/"/g,'&quot;');
      const titleAttr=`${safeName} · ${r.cl||'-'} · ${rnm}${bonusTxt?' · '+bonusTxt:''}`;
      return `<div class="gc-char ${rKey}" style="animation-delay:${i*0.08}s" title="${titleAttr}">
        <div style="position:relative">
          ${imgOrEmoji(crewImgSrc(r),r.ic||'🧑',48,48,'border-radius:50%;border:2px solid '+rcol+';background:var(--panel)')}
        </div>
        <div style="color:${rcol};font-size:12px;font-weight:bold;line-height:1.15;width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0 2px">${safeName}</div>
        <div style="font-size:10px;color:var(--dim);line-height:1.1">${r.cl||''}</div>
        <div style="font-size:9px;font-weight:bold;color:#000;background:${rcol};border-radius:3px;padding:1px 4px;letter-spacing:.5px">${rnm}</div>
      </div>`;
    }).join('');
    c.scrollTop=0;
    // 최근 영입 크루 저장 — 좌측 상단 카드용 (최대 5장, 새로 영입한 것이 가장 앞)
    try {
      const _newList=results.map(r=>({id:r.id||r._heroRoll||'',nm:r.nm,ic:r.ic||'🧑',cl:r.cl||'',rarity:r.rarity||'N',isHero:!!r.isHero,img:crewImgSrc(r)}));
      const _prev=G._lastTavernCrewList||[];
      G._lastTavernCrewList=[..._newList,..._prev].slice(0,5);
      // 호환성 — 단일 _lastTavernCrew도 갱신 (가장 높은 등급 1명)
      const _rarOrder={S:0,L:1,H:2,R:3,N:4};
      const _sorted=[...results].sort((a,b)=>(_rarOrder[a.rarity]||9)-(_rarOrder[b.rarity]||9));
      const _top=_sorted[0];
      if(_top){
        G._lastTavernCrew={id:_top.id||_top._heroRoll||'',nm:_top.nm,ic:_top.ic||'🧑',cl:_top.cl||'',rarity:_top.rarity||'N',isHero:!!_top.isHero,img:crewImgSrc(_top)};
      }
    } catch(e){}
    // 헤더 크레딧 업데이트
    const hdr=c.closest('.gc-result')?.querySelector('.gc-result-hdr div:last-child');
    if(hdr)hdr.textContent=I18N.t('chatbot.crewStatus',{n:G.crew.length,vc:G.voidCrystal,cr:G.credits.toLocaleString()});
    // 주점 패널이 활성 상태라면 상단 결과 카드 갱신을 위해 재렌더 (지연: 가챠 애니메이션 후)
    try{
      if(G._currentHubTab==='tavern'&&typeof rerenderTab==='function'&&typeof renderTavernView==='function'){
        setTimeout(()=>{try{rerenderTab(renderTavernView);}catch(e){}},700);
      }
    }catch(e){}
  }
  
  // ═══ AUCTION — js/modules/auction.js 로 분할됨 (2026-06-08, v1.0.0-beta.88) ═══
  //   · 286줄, 8개 함수 (renderAuctionView, doBid, customBid 등)
  
  // ═══ CODEX — js/modules/codex.js 로 분할됨 (2026-06-08, v1.0.0-beta.88) ═══
  //   · 727줄, 12개 함수 (renderCodexTab, showCodex*Modal, _markShipDiscovered 등)
  

  // 제작 재료 1:3 맞교환 — 줄 재료 3개 소비 → 받을 재료 1개 획득 (사용자 요청 2026-06-17)
  function exchangeMaterials(){
    try{
      const recv=document.getElementById('bm-ex-recv');
      const g0=document.getElementById('bm-ex-give0'),g1=document.getElementById('bm-ex-give1'),g2=document.getElementById('bm-ex-give2');
      if(!recv||!g0||!g1||!g2)return;
      const recvId=recv.value;
      const gives=[g0.value,g1.value,g2.value].filter(Boolean);
      if(!recvId||gives.length<3){notify(I18N.t('bm.barterPick'),'warn');return;}
      // 줄 재료 수량 집계 후 보유량 검증 (중복 선택 포함)
      const need={};gives.forEach(id=>{need[id]=(need[id]||0)+1;});
      for(const id in need){ if(((G.materials&&G.materials[id])||0)<need[id]){notify(I18N.t('bm.barterShort'),'err');return;} }
      // 3개 소비 → 1개 획득
      gives.forEach(id=>{ if(typeof consumeMaterialQty==='function')consumeMaterialQty(id,1); });
      if(!G.materials)G.materials={};
      G.materials[recvId]=(G.materials[recvId]||0)+1;
      if(typeof _validateCargoIntegrity==='function')_validateCargoIntegrity();
      try{saveGame(true);}catch(e){}
      try{updateHUD();}catch(e){}
      const _comm=(typeof COMMODITIES!=='undefined')?COMMODITIES.find(c=>c.id===recvId):null;
      const _nm=(_comm&&typeof commDisplayNm==='function')?commDisplayNm(_comm):(recvId);
      notify(I18N.t('bm.barterDone',{nm:_nm}),'ok');
      try{if(typeof AudioMgr!=='undefined')AudioMgr.playSfx('UI_click',{cooldown:0});}catch(e){}
      rerenderTab(renderTavernView);
    }catch(e){console.warn('[barter]',e);}
  }
  try{if(typeof window!=='undefined')window.exchangeMaterials=exchangeMaterials;}catch(e){}

  // ─── 전역 노출 ─────────────────────────────────────────────
  window.renderTavernView=renderTavernView;
  window.renderGachaView=renderGachaView;
  window.renderGachaCards=renderGachaCards;
  window.openMysteryBox=openMysteryBox;
  window._showAuctionWinPopup=_showAuctionWinPopup;
  console.log('[tavern] module loaded');
})();
