// ══════════════════════════════════════════════════════════════════
// CODEX (탐색 도감) 모듈 — game.js에서 분할 (2026-06-08, v1.0.0-beta.88)
//   · 함선/파츠/영웅/행성/특산물/문명 도감 + 발견 마킹 (_markShipDiscovered 등)
//   · 모듈 내부 상태: _codexTab (현재 탭)
// 의존: window.G, window.I18N, window.PLANET_DEF, window.HEROES, window.SHIP_CATALOG,
//       window.PARTS, window.COMMODITIES, window.FACTIONS, window.openModal,
//       window.closeModal, window.rerenderTab, window.imgOrEmoji, window.shipImgSrc,
//       window.partImgSrc, window.commImgSrc, window.planetImgSrc, window._GAME_VER
// ══════════════════════════════════════════════════════════════════
(function(){
  if(typeof window==='undefined')return;
  // ═══ CODEX (탐색 도감) ══════════════════════════════════════════════
  // 발견된 함선 ID 세트 — "실제로 본 함선"만 인정 (사용자 요청)
  //   = 보유(편대/임시창) + 방문한 행성 상점에 입고됐던(=눈으로 본) 함선.
  //   ※ 이전 로직은 방문한 링의 전체 티어를 일괄 해금해, 본 적 없는 함선까지 노출되는 문제가 있었음.
  // 한 함선이 도감에서 "발견" 처리하는 카탈로그 id 목록 (인스턴스/별칭 변형 포함)
  function _shipDiscoveryIds(ship){
    if(!ship)return[];
    const out=[];
    const sid=String(ship.id||'').replace(/(?:_\d+|_main)$/,'');
    [sid,ship.catalogId,ship.catId].forEach(v=>{if(v)out.push(v);});
    try{(SHIP_CATALOG||[]).forEach(s=>{
      if(s.id===sid||s.id===ship.catalogId||s.id===ship.catId||(ship.catalogId&&s.catalogId===ship.catalogId)||(sid&&s.catalogId===sid))out.push(s.id);
    });}catch(e){}
    return out;
  }
  // 함선 획득 시 영구 발견 기록 (보유했다 처분해도 도감에는 남음)
  function _markShipDiscovered(ship){
    if(!ship||typeof G==='undefined'||!G)return;
    if(!G.discoveredShips)G.discoveredShips=[];
    _shipDiscoveryIds(ship).forEach(id=>{if(id&&G.discoveredShips.indexOf(id)<0)G.discoveredShips.push(id);});
  }
  // 발견된 함선 id 세트 — "실제로 본·보유한 함선"만 노출 (사용자 요청 2026-06-07 재확정)
  //   포함:
  //     1) 현재 보유 (G.fleet + G.reserveFleet)
  //     2) 영구 발견 기록 (G.discoveredShips) — 상점에서 본 함선·과거 보유 함선
  //   미포함:
  //     · 미발견 신화·전설·대형 함선 (자동 노출 차단)
  //     · 보스 전용함(URSA·BLACKFALCON)도 나포 전까지 비노출
  function getDiscoveredShipIds(){
    const seen=new Set();
    // 1) 현재 보유 함선
    [...(G.fleet||[]),...(G.reserveFleet||[])].forEach(s=>{
      if(s)_shipDiscoveryIds(s).forEach(id=>seen.add(id));
    });
    // 2) 영구 발견 기록 (상점에서 본 함선·과거 보유)
    (G.discoveredShips||[]).forEach(id=>seen.add(id));
    return seen;
  }
  function getDiscoveredCommIds(){
    const seen=new Set();
    // 방문한 행성의 shopStock에서 발견된 특산물
    Object.values(G.shopStock||{}).forEach(stock=>{
      COMMODITIES.forEach(c=>{if((stock[c.id]||0)>0)seen.add(c.id);});
    });
    // 보유 화물
    (G.cargo||[]).forEach(item=>seen.add(item.id));
    return seen;
  }
  let _codexTab='ship';
  function showCodexPlanetModal(pid){
    const p=PLANET_DEF.find(x=>x.id===pid);if(!p)return;
    const l=PLANET_LORE[pid]||{};
    const factionCol={F01:'var(--cyan)',F02:'var(--gold)',F03:'var(--green)',F04:'var(--red)',F05:'#ff4444',F06:'#88ccff',F07:'var(--purple)'};
    const factionNm={F01:I18N.t('faction.F01.nm'),F02:I18N.t('faction.F02.nm'),F03:I18N.t('faction.F03.nm'),F04:I18N.t('faction.F04.nm'),F05:I18N.t('faction.F05.nm'),F06:I18N.t('faction.F06.nm'),F07:I18N.t('faction.F07.nm')};
    const fc=factionCol[p.f]||'var(--dim)';
    const fn=factionNm[p.f]||p.f;
    const isCurrent=p.id===G.currentPlanet;
    const isOwned=G.planets[pid]&&G.planets[pid].owned;
    const tax=calcTaxFor(pid);
    function row(ic,label,val){return`<div style="display:flex;gap:8px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06)"><span style="font-size:16px;flex-shrink:0">${ic}</span><div><div style="font-size:11px;color:var(--dim);margin-bottom:2px">${label}</div><div style="font-size:13px;color:var(--txt);line-height:1.5">${val}</div></div></div>`;}
    const html=`<div style="padding:4px 0">
      <div style="display:flex;gap:12px;align-items:center;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid var(--bdr)">
        <div style="width:64px;height:64px;border-radius:50%;overflow:hidden;flex-shrink:0;border:2px solid ${fc}">
          <img src="${planetImgSrc(p.id)}" style="width:100%;height:100%;object-fit:cover" onerror="this.parentNode.innerHTML='<div style=font-size:30px;display:flex;align-items:center;justify-content:center;height:100%>🪐</div>'">
        </div>
        <div>
          <div style="font-size:17px;font-weight:bold;color:${fc}">${p.nm}${isCurrent?` <span style="font-size:11px;color:var(--cyan)">${I18N.t('tip.current')}</span>`:''}</div>
          <div style="font-size:12px;color:var(--dim);margin-top:2px">${I18N.t('ui.planetRing',{fn,ring:p.ring})}</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">
            ${p.hostile?`<span style="font-size:11px;color:var(--red);border:1px solid var(--red);border-radius:3px;padding:1px 6px">${I18N.t('ui.hostile')}</span>`:''}
            ${p.void?`<span style="font-size:11px;color:var(--purple);border:1px solid var(--purple);border-radius:3px;padding:1px 6px">${I18N.t('codex.voidChip')}</span>`:''}
            ${isOwned?`<span style="font-size:11px;color:var(--gold);border:1px solid var(--gold);border-radius:3px;padding:1px 6px">${I18N.t('hud.ownedTax',{tax:tax.toLocaleString()})}</span>`:''}
            ${p.hero?`<span style="font-size:11px;color:var(--purple);border:1px solid var(--purple);border-radius:3px;padding:1px 6px">${I18N.t('hud.heroBadge')}</span>`:''}
          </div>
        </div>
      </div>
      ${row('🌌',I18N.t('codex.loc'),l.loc||I18N.t('ui.noInfo'))}
      ${row('🏛️',I18N.t('codex.civ'),l.civ||I18N.t('ui.noInfo'))}
      ${row('🌍',I18N.t('codex.feat'),l.feat||I18N.t('ui.noInfo'))}
      ${row('⚠️',I18N.t('codex.warn'),`<span style="color:#ffaa44">${l.warn||I18N.t('hud.noSpecialRisk')}</span>`)}
      ${row('💰',I18N.t('codex.benefit'),`<span style="color:var(--gold)">${l.benefit||I18N.t('ui.noInfo')}</span>`)}
      ${row('💬',I18N.t('ui.opinion'),`<span style="color:var(--cyan);font-style:italic">${l.op||'...'}</span>`)}
    </div>`;
    openModal('🪐 '+p.nm,html,[{txt:I18N.t('btn.close'),fn:closeModal,cls:'btn-sm'}],{wide:true});
  }
  function showCodexHeroModal(hid){
    const h=HEROES[hid];if(!h)return;
    const l=HERO_LORE[hid]||{};
    const have=G.heroes.includes(hid);
    const aboard=G.fleet.find(s=>(s.crewIds||[]).includes(hid));
    const clCol={Pilot:'var(--cyan)',Eng:'var(--green)',Merch:'var(--gold)'}[h.cl]||'var(--dim)';
    const clNm={Pilot:I18N.t('class.pilot'),Eng:I18N.t('class.eng'),Merch:I18N.t('class.merch')}[h.cl]||h.cl;
    function row(ic,label,val){return`<div style="display:flex;gap:8px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06)"><span style="font-size:16px;flex-shrink:0">${ic}</span><div><div style="font-size:11px;color:var(--dim);margin-bottom:2px">${label}</div><div style="font-size:13px;color:var(--txt);line-height:1.5">${val}</div></div></div>`;}
    const foundPlanet=PLANET_DEF.find(p=>p.hero===hid);
    const foundPlanetNm=foundPlanet?foundPlanet.nm:I18N.t('ui.unknown');
    const html=`<div style="padding:4px 0">
      <div style="display:flex;gap:12px;align-items:center;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid var(--bdr)">
        ${_heroPortrait({...h,id:hid},64,'var(--gold)')}
        <div>
          <div style="font-size:17px;font-weight:bold;color:var(--gold)">${(I18N&&I18N.has&&I18N.has('hero.'+hid+'.nm'))?I18N.t('hero.'+hid+'.nm'):h.nm}</div>
          <div style="font-size:12px;color:${clCol};margin-top:2px">${clNm} · LOY:${h.LOY}</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;font-size:11px;color:var(--dim)">
            <span style="color:var(--red)">⚔️ ATT:${h.ATT}</span>
            <span style="color:var(--blue)">🛡 INT:${h.INT}</span>
            <span style="color:var(--gold)">🔰 DEF:${h.DEF}</span>
            <span style="color:#f88">❤️ HP:${h.HP}</span>
          </div>
          <div style="margin-top:4px;display:flex;gap:6px;flex-wrap:wrap">
            <span style="font-size:11px;color:var(--purple);border:1px solid var(--purple);border-radius:3px;padding:1px 6px">⚡ ${h.sk}</span>
            ${have?`<span style="font-size:11px;color:var(--green);border:1px solid var(--green);border-radius:3px;padding:1px 6px">${I18N.t('hud.recruited')}</span>`:''}
            ${aboard?`<span style="font-size:11px;color:var(--cyan);border:1px solid var(--cyan);border-radius:3px;padding:1px 6px">🛸 ${shipDisplayNm(aboard)}</span>`:''}
          </div>
        </div>
      </div>
      ${row('📜',I18N.t('ui.nameOrigin'),l.origin||I18N.t('ui.noInfo'))}
      ${row('📍',I18N.t('ui.foundPlanet'),`${l.found||foundPlanetNm}`)}
      ${row('⚔️',I18N.t('ui.statAbil'),l.stats||`ATT:${h.ATT} INT:${h.INT} DEF:${h.DEF} HP:${h.HP}`)}
      ${row('🎭',I18N.t('ui.prosCons'),l.char||I18N.t('ui.noInfo'))}
      ${row('💬',I18N.t('ui.opinion'),`<span style="color:var(--cyan);font-style:italic">${l.op||'...'}</span>`)}
    </div>`;
    openModal('⭐ '+((I18N&&I18N.has&&I18N.has('hero.'+hid+'.nm'))?I18N.t('hero.'+hid+'.nm'):h.nm),html,[{txt:I18N.t('btn.close'),fn:closeModal,cls:'btn-sm'}],{wide:true});
  }
  // 도감 — 특수 인물(백구·우르사·블랙팔콘) 상세 모달
  function showCodexSpecialCharModal(cid){
    const c=(typeof SPECIAL_CHARS!=='undefined')?SPECIAL_CHARS.find(x=>x.id===cid):null;
    if(!c)return;
    const col=c.id==='NPC_BAEKGU'?'#9ee7ff':c.id==='NPC_URSA'?'#ff66cc':c.id==='NPC_BLACKFALCON'?'#cc66ff':'var(--gold)';
    function row(ic,label,val){return`<div style="display:flex;gap:8px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06)"><span style="font-size:16px;flex-shrink:0">${ic}</span><div><div style="font-size:11px;color:var(--dim);margin-bottom:2px">${label}</div><div style="font-size:13px;color:var(--txt);line-height:1.6;word-break:keep-all">${val}</div></div></div>`;}
    const _cImg=c.img?(c.img+((window._GAME_VER&&c.img.indexOf('?v=')<0)?('?v='+encodeURIComponent(window._GAME_VER)):'')):null;
    const imgHtml=_cImg?`<img src="${_cImg}" alt="${c.nm}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;border:2px solid ${col};background:rgba(0,0,0,.3);box-shadow:0 0 12px ${col}66;flex-shrink:0" onerror="this.outerHTML='<div style=\\'width:64px;height:64px;border-radius:50%;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-size:36px;border:2px solid ${col};flex-shrink:0\\'>${c.ic}</div>'">`:`<div style="width:64px;height:64px;border-radius:50%;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-size:36px;border:2px solid ${col};flex-shrink:0">${c.ic}</div>`;
    const html=`<div style="padding:4px 0">
      <div style="display:flex;gap:12px;align-items:center;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid ${col}44">
        ${imgHtml}
        <div>
          <div style="font-size:17px;font-weight:bold;color:${col}">${c.ic} ${c.nm}</div>
          <div style="font-size:12px;color:var(--dim);margin-top:3px">${c.role||''}</div>
        </div>
      </div>
      ${row('📍',I18N.t('ui.foundPlanet'),c.found||'-')}
      ${row('⚔️',I18N.t('ui.statAbil'),c.stats||'-')}
      ${row('✨',I18N.t('ui.pros'),`<span style="color:rgba(180,255,200,.95)">${c.pros||'-'}</span>`)}
      ${row('⚠️',I18N.t('ui.cons'),`<span style="color:rgba(255,200,160,.95)">${c.cons||'-'}</span>`)}
      ${row('🎭',I18N.t('ui.personality'),c.personality||'-')}
      ${c.creator?row('🛠️',I18N.t('ui.creator'),c.creator):''}
      ${row('💬',I18N.t('ui.opinion'),`<span style="color:var(--cyan);font-style:italic">${c.quip||'...'}</span>`)}
    </div>`;
    openModal(c.ic+' '+c.nm,html,[{txt:I18N.t('btn.close'),fn:closeModal,cls:'btn-sm'}],{wide:true});
  }
  try{if(typeof window!=='undefined')window.showCodexSpecialCharModal=showCodexSpecialCharModal;}catch(e){}

  // 도감 — 스토리 NPC(컷씬 조연) 상세 모달
  function showCodexStoryNpcModal(id){
    const c=(typeof STORY_NPCS!=='undefined')?STORY_NPCS.find(x=>x.id===id):null;
    if(!c)return;
    const col=c.color||'var(--cyan)';
    function row(ic,label,val){return`<div style="display:flex;gap:8px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06)"><span style="font-size:16px;flex-shrink:0">${ic}</span><div><div style="font-size:11px;color:var(--dim);margin-bottom:2px">${label}</div><div style="font-size:13px;color:var(--txt);line-height:1.6;word-break:keep-all">${val}</div></div></div>`;}
    const _cImg=c.img?(c.img+((window._GAME_VER&&c.img.indexOf('?v=')<0)?('?v='+encodeURIComponent(window._GAME_VER)):'')):null;
    const imgHtml=_cImg?`<img src="${_cImg}" alt="${c.nm}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;border:2px solid ${col};background:rgba(0,0,0,.3);box-shadow:0 0 12px ${col}66;flex-shrink:0" onerror="this.outerHTML='<div style=\\'width:64px;height:64px;border-radius:50%;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-size:36px;border:2px solid ${col};flex-shrink:0\\'>${c.ic}</div>'">`:`<div style="width:64px;height:64px;border-radius:50%;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-size:36px;border:2px solid ${col};flex-shrink:0">${c.ic}</div>`;
    const html=`<div style="padding:4px 0">
      <div style="display:flex;gap:12px;align-items:center;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid ${col}44">
        ${imgHtml}
        <div><div style="font-size:17px;font-weight:bold;color:${col}">${c.ic} ${c.nm}</div>
        <div style="font-size:12px;color:var(--dim);margin-top:3px">${c.role||''}</div></div>
      </div>
      ${row('📖',I18N.t('part.rowDesc'),c.desc||'-')}
    </div>`;
    openModal(c.ic+' '+c.nm,html,[{txt:I18N.t('btn.close'),fn:closeModal,cls:'btn-sm'}],{wide:true});
  }
  try{if(typeof window!=='undefined')window.showCodexStoryNpcModal=showCodexStoryNpcModal;}catch(e){}

  // 사령관(주인공) 상세 모달 — 단계별 이미지 + 명성·전투력·진행 통계
  function showCodexCommanderModal(){
    const _stage=(typeof _commanderStage==='function')?_commanderStage():0;
    const _stageLb=[I18N.t('ui.rankCivilianFull'),I18N.t('ui.rankCaptainFull'),I18N.t('ui.rankAdmiralFull'),I18N.t('ui.rankGrandFull')][_stage]||I18N.t('ui.rankCivilian');
    const _stageCol=['#9ee7ff','#66ddff','#ffcc00','#ff66ff'][_stage]||'#9ee7ff';
    const _img=(typeof _commanderPortraitSrc==='function')?_commanderPortraitSrc():'img/chars/commander_m0.png';
    const _nm=G.profile?.name||I18N.t('ui.commander');
    const _co=G.profile?.company||I18N.t('ui.companyDefault');
    const _ship=G.fleet&&G.fleet[0]?(shipDisplayNm(G.fleet[0])||G.fleet[0].nm):I18N.t('ui.shipDefault');
    const _g=(G.profile?.gender==='female')?I18N.t('ui.gender.female'):I18N.t('ui.gender.male');
    const _rep=G.reputation||0;
    const _plv=(typeof calcPlayerLevel==='function')?calcPlayerLevel():1;
    const _act=G.act||1;
    const _heroes=(G.heroes||[]).length;
    const _fleet=(G.fleet||[]).length;
    const _credits=G.credits||0;
    const _ownedPl=Object.values(G.planets||{}).filter(p=>p&&p.owned).length;
    // min-width:0 + word-break 로 긴 한글 문장이 모달 밖으로 넘쳐 잘리지 않게 하고,
    // padding-right 로 오른쪽 안전 여백(세이프 공간) 확보
    function row(ic,lb,v){return`<div style="display:flex;gap:10px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.06)"><span style="font-size:15px;flex-shrink:0">${ic}</span><div style="flex:1;min-width:0;padding-right:10px"><div style="font-size:11px;color:var(--dim);margin-bottom:2px">${lb}</div><div style="font-size:13px;color:var(--txt);line-height:1.6;word-break:keep-all;overflow-wrap:break-word">${v}</div></div></div>`;}
    // 다음 단계 진입 조건
    const _nextHints=[
      I18N.t('ui.nextHint.0'),
      I18N.t('ui.nextHint.1'),
      I18N.t('ui.nextHint.2'),
      I18N.t('ui.nextHint.3')
    ];
    const _nextHint=_nextHints[_stage]||_nextHints[_stage-1];
    // ── 인물 소개 · 배경 스토리 (대제독 주인공) ──
    const _intro=I18N.t('ui.commanderBio',{co:_co});
    const _story=I18N.t('story.intro',{nm:_nm,co:_co});
    const _rankStory=[
      I18N.t('ui.rankStory.0'),
      I18N.t('ui.rankStory.1'),
      I18N.t('ui.rankStory.2'),
      I18N.t('ui.rankStory.3')
    ][_stage]||'';
    const html=`<div style="padding:4px 8px">
      <div style="display:flex;gap:14px;align-items:center;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid var(--bdr)">
        <div style="width:108px;height:108px;border-radius:50%;overflow:hidden;flex-shrink:0;border:3px solid ${_stageCol};background:rgba(0,0,0,.4);box-shadow:0 0 18px ${_stageCol}66">
          <img src="${_img}" alt="${_nm}" style="width:100%;height:100%;object-fit:cover" onerror="this.outerHTML='<div style=\\'width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:60px\\'>👤</div>'">
        </div>
        <div style="flex:1">
          <div style="font-size:20px;font-weight:bold;color:${_stageCol}">🎖️ ${_nm}</div>
          <div style="font-size:13px;color:${_stageCol};opacity:.85;margin-top:3px">${_stageLb}</div>
          <div style="font-size:12px;color:var(--dim);margin-top:2px">${_co} · ${_g}</div>
        </div>
      </div>
      ${row('🪪',I18N.t('ui.bio'),_intro)}
      ${row('📖',I18N.t('ui.background'),`<span style="line-height:1.7">${_story}</span>`)}
      ${_rankStory?row('🎖️',I18N.t('ui.currentRank'),`<span style="color:${_stageCol};font-style:italic">${_rankStory}</span>`):''}
      ${row('🎯',I18N.t('ui.progressStage'),`<span style="color:${_stageCol};font-weight:bold">${_stageLb}</span> ${I18N.t('ui.stageProgress',{stage:_stage}).split(') ')[1]}`)}
      ${row(`<img src="img/ui/HN01.png${window._GAME_VER?'?v='+window._GAME_VER:''}" alt="HN" style="width:18px;height:18px;object-fit:contain;vertical-align:middle" onerror="this.outerHTML='⭐'">`,I18N.t('ui.fame'),`${_rep.toLocaleString()}`)}
      ${row('⚔️',I18N.t('ui.combatPower'),`${_plv}`)}
      ${row('🌌',I18N.t('ui.actProgress'),I18N.t('ui.actLabel',{act:_act})+' '+(G._earthLiberated?I18N.t('ui.earthLib'):'')+(G._falconDefeated?I18N.t('ui.falconDefeat'):''))}
      ${row('⚔',I18N.t('ui.legendHeroesShort'),I18N.t('ui.heroesJoinedN',{n:_heroes}))}
      ${row('🛸',I18N.t('ui.fleet'),I18N.t('chatbot.fleetShip',{n:_fleet,ship:_ship}))}
      ${row('🪐',I18N.t('ui.ownedPlanets'),I18N.t('ui.ownedPlanetsN',{n:_ownedPl}))}
      ${row('💰',I18N.t('ui.fieldCredits'),`₡${_credits.toLocaleString()}`)}
      ${row('⏭️',I18N.t('ui.nextStageCond'),`<span style="color:#ffcc66">${_nextHint}</span>`)}
    </div>`;
    openModal(I18N.t('modal.commanderProfile',{nm:_nm}),html,[{txt:I18N.t('btn.close'),fn:closeModal,cls:'btn-gold'}],{wide:true});
  }
  try{if(typeof window!=='undefined')window.showCodexCommanderModal=showCodexCommanderModal;}catch(e){}
  
  // 도감 — 함선 상세 모달 (행성·영웅과 동일한 구조)
  function showCodexPartModal(partId){
    let p=(typeof partById==='function'?partById(partId):(PARTS.find(x=>x.id===partId)));
    // 특수창고(SC) 파츠 상세도 표시 — SPECIAL_CARGO_PARTS 폴백. 사용자 요청 2026-06-14
    if(!p&&typeof SPECIAL_CARGO_PARTS!=='undefined')p=SPECIAL_CARGO_PARTS.find(c=>c.id===partId);
    if(!p)return;
    const rarCol=p.rarity==='mythic'?'#ff88ff':p.rarity==='set'?'#c080ff':p.tier>=15?'var(--gold)':p.tier>=11?'#ffa040':p.tier>=6?'var(--cyan)':'var(--txt)';
    const rarIc=p.rarity==='mythic'?'✦':p.rarity==='set'?'◈':p.tier>=15?'⚡':'•';
    const catIc={weapon:p.wtype==='missile'?'🚀':'⚔️',shield:'🛡️',armor:typeof p.repairRate==='number'&&p.repairRate>0?'🤖':'🛡',engine:'⚡'}[p.cat]||'⚙️';
    const lore=LORE_TEXT['part_'+p.id]||I18N.t('ui.noInfo');
    const lines=String(lore).split('\n');
    const sec=(ic,fallback)=>{const ln=lines.find(l=>l.startsWith(ic));return ln?ln.replace(ic,'').trim():fallback;};
    const maker=sec('🔨',I18N.t('ui.noInfo'));
    const origin=sec('📜',I18N.t('ui.noInfo'));
    const power=sec('⚔️',I18N.t('ui.noInfo'));
    const op=sec('💬','...');
    // 보유 여부
    const inv=(G.inventory||[]).find(i=>i.id===p.id);
    const eqQty=(G.fleet||[]).flatMap(s=>s.parts||[]).filter(pid=>pid===p.id).length;
    const qty=(inv?.qty||0)+eqQty;
    // 스탯 라인 (헤더 옆 짧은 요약)
    const statText=p.cat==='weapon'?`ATT +${p.ATT}${p.wtype?' ['+p.wtype+']':''}`:
                  p.cat==='shield'?I18N.t('ui.intShieldRegen',{int:p.INT,maxSH:p.maxSH})+(p.shieldRegen?I18N.t('ui.shieldStatRegenSuffix',{pct:(p.shieldRegen*100).toFixed(0)}):''):
                  p.cat==='armor'?I18N.t('ui.armorStats',{hp:p.HP})+(p.DEF?I18N.t('ui.defSuffix',{n:p.DEF}):'')+(p.repairRate?I18N.t('ui.repairSuffix',{pct:(p.repairRate*100).toFixed(0)}):'')+(p.laserHealHP?I18N.t('ui.laserHealHPSuffix',{pct:(p.laserHealHP*100).toFixed(0)}):'')+(p.laserHealSH?I18N.t('ui.laserHealSHSuffix',{pct:(p.laserHealSH*100).toFixed(0)}):''):
                  p.cat==='engine'?`TEC +${p.TEC}`:'';
    // 효과 리스트 — 능력치 + 모든 패시브를 줄 단위로 정리
    const _effItems=[];
    if(p.cat==='weapon'){
      _effItems.push(I18N.t('ui.atkPlus',{n:p.ATT||0}));
      if(p.wtype==='missile')_effItems.push(I18N.t('part.missileLine'));
      else if(p.wtype==='laser'||!p.wtype)_effItems.push(I18N.t('part.laserLine'));
    }
    if(p.cat==='shield'){
      if(p.INT)_effItems.push(I18N.t('ui.shieldIntPlus',{n:p.INT}));
      if(p.maxSH)_effItems.push(I18N.t('ui.maxShield',{n:p.maxSH.toLocaleString()}));
      if(p.shieldRegen)_effItems.push(I18N.t('ui.shieldRegenTurn',{pct:(p.shieldRegen*100).toFixed(0)}));
      if(p.reflect)_effItems.push(I18N.t('ui.reflectDmg',{pct:(p.reflect*100).toFixed(0)}));
    }
    if(p.cat==='armor'){
      if(p.HP)_effItems.push(I18N.t('ui.maxHPPlus',{hp:p.HP.toLocaleString()}));
      if(p.DEF)_effItems.push(I18N.t('ui.defPlus',{n:p.DEF}));
      if(p.repairRate)_effItems.push(I18N.t('ui.hpRepairTurn',{pct:(p.repairRate*100).toFixed(0)}));
      if(p.laserHealHP)_effItems.push(I18N.t('ui.laserLifeHP',{pct:(p.laserHealHP*100).toFixed(0)}));
      if(p.laserHealSH)_effItems.push(I18N.t('ui.laserLifeSH',{pct:(p.laserHealSH*100).toFixed(0)}));
      if(p.revive)_effItems.push(I18N.t('ui.reviveOnce',{pct:(p.revive*100).toFixed(0)}));
    }
    if(p.cat==='engine'){
      if(p.TEC)_effItems.push(I18N.t('ui.tecBonus',{n:p.TEC}));
    }
    if(p.rarity==='set')_effItems.push(I18N.t('part.setEffect'));
    if(p.rarity==='mythic')_effItems.push(I18N.t('part.mythicGrade'));
    if(p.rarity==='legend')_effItems.push(I18N.t('part.legendGrade'));
    const effectsHtml=_effItems.length?_effItems.map(e=>`<div style="font-size:12px;color:var(--txt);line-height:1.6;padding:2px 0">• ${e}</div>`).join(''):I18N.t('ui.noExtraEffect');
    function row(ic,label,val){return`<div style="display:flex;gap:8px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06)"><span style="font-size:16px;flex-shrink:0">${ic}</span><div><div style="font-size:11px;color:var(--dim);margin-bottom:2px">${label}</div><div style="font-size:13px;color:var(--txt);line-height:1.5">${val}</div></div></div>`;}
    const html=`<div style="padding:4px 0">
      <div style="display:flex;gap:12px;align-items:center;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid var(--bdr)">
        <div style="width:96px;height:96px;border-radius:50%;overflow:hidden;flex-shrink:0;border:2px solid ${rarCol};background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center">
          ${imgOrEmoji(partImgSrc(p.id),catIc,92,92,'object-fit:contain')}
        </div>
        <div>
          <div style="font-size:18px;font-weight:bold;color:${rarCol}">${rarIc} ${partDisplayNm(p)}</div>
          <div style="font-size:12px;color:var(--dim);margin-top:2px">T${p.tier} ${p.cat==='weapon'?I18N.t('part.kindWeapon'):p.cat==='shield'?I18N.t('part.kindShield'):p.cat==='armor'?(typeof p.repairRate==='number'&&p.repairRate>0?I18N.t('part.kindRepairDrone'):I18N.t('part.kindArmor')):p.cat==='engine'?I18N.t('part.kindEngine'):''} · ${p.price?'₡'+p.price.toLocaleString():I18N.t('part.shopNoSell')}</div>
          <div style="font-size:12px;color:${rarCol};margin-top:4px;font-weight:bold">${statText}</div>
          ${qty>0?`<span style="display:inline-block;margin-top:6px;font-size:11px;color:var(--green);border:1px solid var(--green);border-radius:3px;padding:1px 6px">${I18N.t('ui.heldInInv',{qty,inv:inv?.qty||0,eq:eqQty})}</span>`:`<span style="display:inline-block;margin-top:6px;font-size:11px;color:var(--dim);border:1px solid var(--dim);border-radius:3px;padding:1px 6px">${I18N.t('ui.notOwned')}</span>`}
        </div>
      </div>
      ${row('⚡',I18N.t('part.rowEffects'),effectsHtml)}
      ${row('📖',I18N.t('part.rowDesc'),p.desc||'-')}
      ${(typeof craftMatsText==='function'&&(p.rarity==='legend'||p.rarity==='mythic'||p.rarity==='set')&&craftMatsText(p.id))?row('🔧',I18N.t('part.rowCraftMats'),craftMatsText(p.id)):''}
      ${row('🔨',I18N.t('part.rowMakerLore'),maker)}
      ${row('📜',I18N.t('ui.nameOrigin'),origin)}
      ${row('⚔️',I18N.t('part.rowCombatPerf'),power)}
      ${row('💬',I18N.t('part.rowOneLine'),op)}
    </div>`;
    openModal('⚙️ '+partDisplayNm(p),html,[{txt:I18N.t('btn.confirm'),fn:closeModal,cls:'btn-gold'}],{wide:true});
  }
  function showCodexShipModal(shipId){
    const s=SHIP_CATALOG.find(x=>x.id===shipId);if(!s)return;
    const tierCol={'소형':'var(--cyan)','중형':'var(--blue)','대형':'var(--gold)','전설기함':'#ff66ff','신화':'#cc66ff'};
    const fc=tierCol[s.tier]||'var(--dim)';
    const tierIc={신화:'✦',전설기함:'⚑',대형:'🌟',중형:'🚀',소형:'🛸'}[s.tier]||'🛸';
    const lore=LORE_TEXT['ship_'+(s.catalogId||s.id)]||LORE_TEXT['ship_'+s.id]||I18N.t('ui.noInfo');
    // 줄별 (🔨/📜/⚔️/💬) 분리
    const lines=String(lore).split('\n');
    const sec=(ic,fallback)=>{const ln=lines.find(l=>l.startsWith(ic));return ln?ln.replace(ic,'').trim():fallback;};
    const maker=sec('🔨',I18N.t('ui.noInfo'));
    const origin=sec('📜',I18N.t('ui.noInfo'));
    const power=sec('⚔️',`ATT:${s.ATT} INT:${s.INT} TEC:${s.TEC} · HP:${s.maxHP} SH:${s.maxSH}`);
    const op=sec('💬','...');
    const owned=G.fleet.some(f=>(f.catalogId||f.id||'').replace(/_(?:\d+|main)$/,'')===s.id);
    function row(ic,label,val){return`<div style="display:flex;gap:8px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06)"><span style="font-size:16px;flex-shrink:0">${ic}</span><div><div style="font-size:11px;color:var(--dim);margin-bottom:2px">${label}</div><div style="font-size:13px;color:var(--txt);line-height:1.5">${val}</div></div></div>`;}
    const html=`<div style="padding:4px 0">
      <div style="display:flex;gap:12px;align-items:center;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid var(--bdr)">
        <div style="width:96px;height:96px;border-radius:12px;overflow:hidden;flex-shrink:0;border:2px solid ${fc};background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center">
          ${imgOrEmoji(shipImgSrc(s),tierIc,92,92,'object-fit:contain')}
        </div>
        <div>
          <div style="font-size:18px;font-weight:bold;color:${fc}">${tierIc} ${(typeof shipDisplayNm==="function"?shipDisplayNm(s):s.nm)}</div>
          <div style="font-size:12px;color:var(--dim);margin-top:2px">${I18N.tier(s.tier)} · ₡${(s.price||0).toLocaleString()}</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;font-size:11px">
            <span style="color:var(--red)">⚔️ ATT:${s.ATT}</span>
            <span style="color:var(--blue)">🛡 SHD:${s.INT}</span>
            <span style="color:var(--cyan)">⚡ ENG:${s.TEC}</span>
            <span style="color:#f88">❤️ HP:${(s.maxHP||0).toLocaleString()}</span>
            <span style="color:#66ddff">🛡 SH:${(s.maxSH||0).toLocaleString()}</span>
          </div>
          ${owned?`<span style="display:inline-block;margin-top:6px;font-size:11px;color:var(--green);border:1px solid var(--green);border-radius:3px;padding:1px 6px">${I18N.t('ui.ownedBadge')}</span>`:''}
        </div>
      </div>
      ${(()=>{
        // 함선 효과 — 함선별 특수 슬롯/캐퍼시티 + desc 의 효과 문장 정리
        const ef=[];
        if(s.partsRows)ef.push(I18N.t('ui.partsRowsBase',{n:s.partsRows*2}));
        if(s.partsRowsExtra)ef.push(I18N.t('ui.partsRowsExt',{n:s.partsRowsExtra*((typeof getShipPartsGridRows==='function')?getShipPartsGridRows(s):6)}));
        if(s.crewMax)ef.push(I18N.t('ui.crewMaxShipSpec',{n:s.crewMax}));
        if(s.cargoStart)ef.push(I18N.t('ui.cargoStartSpec',{n:s.cargoStart}));
        if(s.cargoSlots)ef.push(I18N.t('ui.cargoSlotsSpec',{n:s.cargoSlots}));
        if(s.tier==='신화')ef.push(I18N.t('tier.mythicShipLine'));
        else if(s.tier==='전설기함')ef.push(I18N.t('tier.flagshipLine'));
        // desc 문장 그대로 추가 (각 함선의 고유 효과 설명)
        if(s.desc)ef.push('📝 '+s.desc);
        // 전설/신화 함선 제작 재료 (레시피 보유 함선만). 사용자 요청 2026-06-14
        if(typeof craftMatsText==='function'){var _cmShip=craftMatsText(s.id);if(_cmShip)ef.push('🔧 '+I18N.t('part.rowCraftMats')+': '+_cmShip);}
        const efHtml=ef.length?ef.map(e=>`<div style="font-size:12px;color:var(--txt);line-height:1.6;padding:2px 0">• ${e}</div>`).join(''):I18N.t('ui.noExtraEffect');
        return row('✨',I18N.t('part.rowShipEffects'),efHtml);
      })()}
      ${row('🔨',I18N.t('part.rowMakerLore'),maker)}
      ${row('📜',I18N.t('ui.nameOrigin'),origin)}
      ${row('⚔️',I18N.t('part.rowProsCons'),power)}
      ${row('💬',I18N.t('ui.opinion'),`<span style="color:var(--cyan);font-style:italic">${op}</span>`)}
    </div>`;
    openModal('🛸 '+(shipDisplayNm(s)||s.nm),html,[{txt:I18N.t('btn.close'),fn:closeModal,cls:'btn-sm'}],{wide:true});
  }
  function switchCodexTab(t){_codexTab=t;rerenderTab(renderCodexTab);}

  // ─── 운항기록 (Voyage Log) — 사용자 요청 2026-06-12 ─────────────────
  //   스토리 진행(퀘스트 완료·대화기록 시청)에 따라 점진적으로 해금되는 이야기 연대기.
  //   해금 조건: 컷씬 = G._scenesSeen['scene_'+id] / 퀘스트 = status done|claimed
  function _voyCutCard(sid,title,CUT,seen,counter){
    counter.total++;
    const unlocked=!!seen['scene_'+sid];
    if(!unlocked)return `<div style="background:rgba(80,80,80,.08);border:1px dashed rgba(255,255,255,.12);border-radius:8px;padding:8px 12px;margin-bottom:6px;font-size:12px;color:#777">${I18N.t('voyage.locked')}</div>`;
    counter.unlocked++;
    const lines=(CUT&&CUT[sid])||[];
    const _sub=window._subTokens||function(s){return s;};
    const preview=lines.slice(0,2).map(l=>{const _tx=_sub(String(l.text||''));return `<div style="font-size:12px;color:var(--txt);line-height:1.6;word-break:keep-all"><span style="color:${l.color||'var(--cyan)'};font-weight:bold">${_sub(l.name||'')}</span> "${_tx.slice(0,80)}${_tx.length>80?'…':''}"</div>`;}).join('');
    const replayBtn=(window.STORY_SCENES_PC&&typeof window.STORY_SCENES_PC.forceReplayScene==='function')
      ?`<button onclick="window.STORY_SCENES_PC.forceReplayScene('${sid}')" style="margin-top:5px;padding:3px 12px;border:1px solid var(--gold);border-radius:5px;background:rgba(255,215,0,.1);color:var(--gold);cursor:pointer;font-size:11px;font-family:inherit">${I18N.t('voyage.replay')}</button>`:'';
    return `<div style="background:rgba(0,243,255,.05);border:1px solid rgba(0,243,255,.25);border-radius:8px;padding:10px 12px;margin-bottom:6px">
      <div style="font-size:13px;font-weight:bold;color:var(--cyan);margin-bottom:5px">💬 ${title}</div>
      ${preview}
      ${replayBtn}
    </div>`;
  }
  function _baekguMini(){
    const _v=(window._GAME_VER)?('?v='+encodeURIComponent(window._GAME_VER)):'';
    return `<img src="img/chars/baekgu1.png${_v}" alt="" style="width:30px;height:30px;border-radius:50%;object-fit:cover;border:1.5px solid var(--cyan);flex-shrink:0" onerror="this.outerHTML='<span style=&quot;font-size:22px&quot;>🐕</span>'">`;
  }
  function _buildVoyageLogHTML(){
    const seen=(G&&G._scenesSeen)||{};
    const lang=(typeof I18N!=='undefined'&&I18N.getLang)?I18N.getLang():'ko';
    let html=`<div style="background:var(--card);border-radius:8px;padding:10px 14px;margin-bottom:14px;display:flex;gap:12px;align-items:center">
      <div style="font-size:28px">🧭</div>
      <div><div style="font-size:14px;color:var(--txt);font-weight:bold">${I18N.t('voyage.header')}</div>
      <div style="font-size:12px;color:var(--dim)">${I18N.t('voyage.headerDesc')}</div></div>
    </div>`;
    for(let ph=1;ph<=6;ph++){
      const Q=window['PHASE'+ph+'_QUESTS'];
      const INTRO=window['PHASE'+ph+'_PLANET_INTROS']||{};
      const _cutKo=window['PHASE'+ph+'_CUTSCENES_KO']||{};
      const _cutEn=window['PHASE'+ph+'_CUTSCENES_EN']||{};
      // 영문판: EN 컷씬 우선 + KO 폴백 (도감 연대기 대화기록을 현재 언어로 표시)
      const CUT=(lang==='en')?Object.assign({},_cutKo,_cutEn):_cutKo;
      if(!Q)continue;
      const counter={unlocked:0,total:0};
      let body='';
      Object.keys(Q).forEach(pid=>{
        const pdef=(typeof PLANET_DEF!=='undefined')&&PLANET_DEF.find(p=>p.id===pid);
        const pnm=pdef?pdef.nm:pid;
        if(INTRO[pid])body+=_voyCutCard(INTRO[pid],I18N.t('voyage.introEntry',{planet:pnm}),CUT,seen,counter);
        (Q[pid]||[]).forEach(tq=>{
          const qnm=(tq.nm&&(tq.nm[lang]||tq.nm.ko))||tq.id;
          // 퀘스트 완료 항목
          counter.total++;
          const liveQ=((G.quests||{})[pid]||[]).find(x=>x.id===tq.id);
          const _claimedRec=!!(G._storyQuestsClaimed&&G._storyQuestsClaimed[tq.id]);
          // 기존 세이브 호환: 보상 플래그가 모두 세팅됐으면 완료로 간주 (G._storyFlags는 영구 보존)
          const _flagsDone=Array.isArray(tq.rewardFlags)&&tq.rewardFlags.length>0&&tq.rewardFlags.every(f=>G._storyFlags&&G._storyFlags[f]);
          const qDone=_claimedRec||_flagsDone||!!(liveQ&&(liveQ.status==='done'||liveQ.status==='claimed'));
          if(qDone){
            counter.unlocked++;
            const qd=(tq.desc&&(tq.desc[lang]||tq.desc.ko))||'';
            body+=`<div style="background:rgba(255,215,0,.05);border:1px solid rgba(255,215,0,.25);border-radius:8px;padding:10px 12px;margin-bottom:6px">
              <div style="font-size:13px;font-weight:bold;color:var(--gold)">✦ ${qnm} <span style="font-size:10px;color:var(--green);font-weight:normal">${I18N.t('voyage.questDone')}</span></div>
              ${qd?`<div style="font-size:12px;color:var(--dim);line-height:1.6;margin-top:4px;word-break:keep-all">${String(qd).split('\n')[0].slice(0,120)}</div>`:''}
            </div>`;
          } else {
            body+=`<div style="background:rgba(80,80,80,.08);border:1px dashed rgba(255,255,255,.12);border-radius:8px;padding:8px 12px;margin-bottom:6px;font-size:12px;color:#777">${I18N.t('voyage.locked')}</div>`;
          }
          if(tq.cutscene_pre)body+=_voyCutCard(tq.cutscene_pre,I18N.t('voyage.preEntry',{quest:qnm}),CUT,seen,counter);
          if(tq.cutscene_post)body+=_voyCutCard(tq.cutscene_post,I18N.t('voyage.postEntry',{quest:qnm}),CUT,seen,counter);
        });
      });
      const phCol=['#88ccff','#66ffcc','#ffd700','#ff8844','#cc66ff','#ff66aa'][ph-1]||'var(--cyan)';
      // ── 백구의 항해 일지 (우측 패널) ──
      // 사용자 요청 2026-06-15: 페이즈1은 기본 해금, 그 외 페이즈는 대화씬 30% 이상 해금 시 일지 공개
      const _diaryReady=(ph===1) || (counter.total>0 && (counter.unlocked/counter.total)>=0.30);
      const _diary=(window.BAEKGU_DIARY&&window.BAEKGU_DIARY[ph])||null;
      let diaryPanel='';
      if(_diary){
        const _dt=(_diary.title&&(_diary.title[lang]||_diary.title.ko))||'';
        const _shipNm=(G.profile&&G.profile.ship)||I18N.t('ui.shipDefault');
        const _coNm=(G.profile&&G.profile.company)||I18N.t('ui.companyDefault');
        const _sub=function(txt){return window._subTokens?window._subTokens(txt||''):((txt||'').split('{함선}').join(_shipNm).split('{ship}').join(_shipNm).split('{회사}').join(_coNm).split('{company}').join(_coNm));};
        if(_diaryReady){
          // 페이즈당 4개 단위 entries 렌더 (사용자 요청 2026-06-16). 구버전(단일 ko/en) 폴백 유지.
          const _entries=(_diary.entries&&_diary.entries.length)?_diary.entries:[{t:_diary.title,ko:_diary.ko,en:_diary.en}];
          const _entHtml=_entries.map(function(e){
            const _et=(e.t&&(e.t[lang]||e.t.ko))||'';
            const _ex=_sub(e[lang]||e.ko||'').replace(/</g,'&lt;');
            return `<div style="margin-bottom:10px;padding-bottom:10px;border-bottom:1px dashed ${phCol}33">
              ${_et?`<div style="font-size:12px;font-weight:bold;color:${phCol};margin-bottom:4px">${_et}</div>`:''}
              <div style="font-size:13px;line-height:1.9;color:#e8eef5;white-space:pre-wrap;word-break:keep-all;font-style:italic">${_ex}</div>
            </div>`;
          }).join('');
          diaryPanel=`<div style="background:linear-gradient(160deg,rgba(255,215,0,.06),rgba(0,243,255,.04));border:1px solid ${phCol}66;border-radius:10px;padding:14px 16px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">${_baekguMini()}<div style="font-size:13px;font-weight:bold;color:${phCol}">🐕 ${I18N.t('voyage.diaryTitle')} — ${_dt}</div></div>
            ${_entHtml}
          </div>`;
        } else {
          diaryPanel=`<div style="background:rgba(80,80,80,.06);border:1px dashed ${phCol}44;border-radius:10px;padding:14px 16px;text-align:center">
            <div style="font-size:30px;opacity:.5;margin-bottom:6px">🔒🐕</div>
            <div style="font-size:12px;color:var(--dim);line-height:1.7">${I18N.t('voyage.diaryLocked',{n:counter.unlocked,total:counter.total})}</div>
          </div>`;
        }
      }
      html+=`<details open style="margin-bottom:12px;background:rgba(5,10,26,.4);border:1px solid var(--bdr);border-radius:10px;padding:10px 14px">
        <summary style="cursor:pointer;font-size:14px;font-weight:bold;color:${phCol};letter-spacing:1px">${I18N.t('voyage.phaseLabel',{n:ph})} <span style="font-size:11px;color:var(--dim);font-weight:normal">${I18N.t('voyage.progress',{n:counter.unlocked,total:counter.total})}</span>${_diaryReady?` <span style="font-size:10px;color:var(--gold)">📖 ${I18N.t('voyage.diaryReady')}</span>`:''}</summary>
        <div style="margin-top:10px;display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:start">
          <div>${body||`<div style="font-size:12px;color:var(--dim)">${I18N.t('voyage.emptyPhase')}</div>`}</div>
          <div>${diaryPanel}</div>
        </div>
      </details>`;
    }
    return html;
  }
  function renderCodexTab(body){
    if(!body)return;
    const tabs=[['ship',I18N.t('codex.tab.ship')],['parts',I18N.t('codex.tab.parts')],['heroes',I18N.t('codex.tab.heroes')],['planets',I18N.t('codex.tab.planets')],['comms',I18N.t('codex.tab.comms')],['civ',I18N.t('codex.tab.civ')],['sys',I18N.t('codex.tab.sys')],['voyage',I18N.t('codex.tab.voyage')],['clog',I18N.t('codex.tab.clog')]];
    const subNav=`<div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap">
      ${tabs.map(([t,lbl])=>`<button onclick="switchCodexTab('${t}')" style="padding:6px 14px;font-size:13px;border-radius:6px;border:1px solid ${_codexTab===t?'var(--cyan)':'var(--bdr)'};background:${_codexTab===t?'rgba(0,243,255,.12)':'transparent'};color:${_codexTab===t?'var(--cyan)':'var(--dim)'};cursor:pointer;font-family:inherit">${lbl}</button>`).join('')}
    </div>`;
    let content='';
  
    if(_codexTab==='ship'){
      const ownedIds=new Set(G.fleet.filter(s=>!(s.id||'').startsWith('CAP_')).map(s=>s.id.replace(/(?:_\d+|_main)$/,'')));
      const capturedShips=G.fleet.filter(s=>(s.id||'').startsWith('CAP_'));
      const discoveredIds=getDiscoveredShipIds();
      const tierCol={'소형':'var(--cyan)','중형':'var(--blue)','대형':'var(--gold)','전설기함':'#ff66ff','신화':'#cc66ff'};
      const CODEX_TIER_ORDER=['신화','전설기함','대형','중형','소형'];
      const grouped={소형:[],중형:[],대형:[],전설기함:[],신화:[]};
      SHIP_CATALOG.forEach(s=>{if(grouped[s.tier])grouped[s.tier].push(s);});
      const sections=CODEX_TIER_ORDER.map(tier=>{
        const ships=grouped[tier]||[];
        if(!ships.length)return'';
        const owned=ships.filter(s=>ownedIds.has(s.id)).length;
        // 미발견 함선은 카드 자체를 노출하지 않음 (사용자 요청) — 발견한 함선만 그리드에 표시
        const seenShips=ships.filter(s=>discoveredIds.has(s.id));
        const discovered=seenShips.length;
        const cards=seenShips.map(s=>{const have=ownedIds.has(s.id);
          const badge=have?`<div style="font-size:10px;color:var(--green);margin-top:2px">${I18N.t('ui.ownedBadge')}</div>`:`<div style="font-size:10px;color:var(--cyan);margin-top:2px">${I18N.t('ui.discoveredBadge')}</div>`;
          const _bdr=have?(tierCol[tier]||'var(--bdr)'):'rgba(0,243,255,.3)';
          return'<div onclick="showCodexShipModal(\''+s.id+'\')" style="cursor:pointer;background:var(--card);border:1px solid '+_bdr+';border-radius:8px;padding:8px;text-align:center;min-height:148px">'
            +'<div style="width:78px;height:78px;border-radius:50%;overflow:hidden;margin:0 auto 6px">'+imgOrEmoji(shipImgSrc(s),s.ic||'🛸',78,78,'','ship_'+s.id)+'</div>'
            +'<div style="font-size:12px;font-weight:bold;color:var(--txt);line-height:1.2">'+(shipDisplayNm(s)||s.nm)+'</div>'
            +'<div style="font-size:10px;color:var(--dim);margin-top:2px">₡'+s.price.toLocaleString()+'</div>'
            +badge
            +'</div>';
        }).join('');
        const gridBody=discovered>0?cards:`<div style="grid-column:1/-1;font-size:12px;color:var(--dim);padding:10px 4px">${I18N.t('ui.noShipsFoundTier',{tier})}</div>`;
        return`<div style="margin-bottom:16px">
          <div style="font-size:13px;color:${tierCol[tier]||'var(--dim)'};font-weight:bold;margin-bottom:8px;letter-spacing:1px">${I18N.tier(tier)} <span style="color:var(--dim);font-size:11px">${I18N.t('ui.tierDiscoverOwn',{disc:discovered,total:ships.length,own:owned})}</span></div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px">
            ${gridBody}
          </div>
        </div>`;
      }).join('');
      const capSection=capturedShips.length>0?`<div style="margin-bottom:16px;border-top:1px solid var(--bdr);padding-top:14px">
        <div style="font-size:13px;color:#ff8844;font-weight:bold;margin-bottom:8px;letter-spacing:1px">${I18N.t('ui.capturedShipsHeader')} <span style="color:var(--dim);font-size:11px">${I18N.t('ui.shipsCountUnit',{n:capturedShips.length})}</span></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px">
          ${capturedShips.map(s=>`<div style="background:var(--card);border:1px solid rgba(255,136,68,.4);border-radius:8px;padding:8px;text-align:center;min-height:148px">
            <div style="width:78px;height:78px;border-radius:50%;overflow:hidden;margin:0 auto 6px">${imgOrEmoji(shipImgSrc(s),TIER_EMOJI[s.tier]||'🛸',78,78,'')}</div>
            <div style="font-size:12px;font-weight:bold;color:var(--txt);line-height:1.2">${(typeof shipDisplayNm==="function"?shipDisplayNm(s):s.nm)}</div>
            <div style="font-size:10px;color:var(--dim);margin-top:2px">${I18N.tier(s.tier)}</div>
            <div style="font-size:10px;margin-top:2px;color:#ff8844">${I18N.t('ui.capturedBadge')}</div>
          </div>`).join('')}
        </div>
      </div>`:'';
      const totalOwned=ownedIds.size;const totalSeen=discoveredIds.size;const totalShips=SHIP_CATALOG.length;
      content=`<div style="background:var(--card);border-radius:8px;padding:10px;margin-bottom:12px;display:flex;gap:12px;align-items:center">
        <div style="font-size:29px">🛸</div>
        <div><div style="font-size:14px;color:var(--txt);font-weight:bold">${I18N.t('ui.shipCodex')}</div>
        <div style="font-size:12px;color:var(--dim)">${I18N.t('ui.discoveredOwned',{disc:`<span style="color:var(--cyan)">${totalSeen}</span>`,own:`<span style="color:var(--green)">${totalOwned}</span>`,total:totalShips})}</div></div>
        <div style="margin-left:auto;text-align:right"><div style="font-size:13px;color:var(--dim)">${I18N.t('ui.completion')}</div>
        <div style="font-size:17px;color:var(--gold);font-weight:bold">${Math.round(totalSeen/totalShips*100)}%</div></div>
      </div>${sections}${capSection}`;
    }
    else if(_codexTab==='parts'){
      const inv=G.inventory||[];
      // 인벤토리 + 함선에 장착된 파츠 모두 '보유'로 처리
      // 특수창고(SC) 파츠는 함선의 cargoExtParts(창고 확장 슬롯)에 장착되므로 s.parts 외에 그것도 포함. 사용자 보고 2026-06-14
      const _equippedIds=new Set((G.fleet||[]).flatMap(s=>[...(s.parts||[]),...(s.cargoExtParts||[])]));
      const haveSet=new Set([...inv.filter(i=>i.qty>0).map(i=>i.id),..._equippedIds]);
      // 섹션 정의: 무기 레이저/미사일 분리, 장갑/수리드론 분리
      // 특수창고(SC) 파츠도 도감에 일반 파츠와 동일 구조로 포함. 사용자 요청 2026-06-14
      const _CODEXP=(typeof SPECIAL_CARGO_PARTS!=='undefined')?PARTS.concat(SPECIAL_CARGO_PARTS):PARTS;
      const sections=[
        {key:'laser',  nm:I18N.t('part.filterLaser'),col:'var(--red)',  filter:p=>p.cat==='weapon'&&(p.wtype==='laser'||!p.wtype)},
        {key:'missile',nm:I18N.t('part.filterMissile'),col:'#ff8844',     filter:p=>p.cat==='weapon'&&p.wtype==='missile'},
        {key:'shield', nm:I18N.t('ui.partCatShield'),      col:'var(--blue)', filter:p=>p.cat==='shield'},
        {key:'armor',  nm:I18N.t('part.filterArmor'),       col:'var(--gold)', filter:p=>p.cat==='armor'&&!(typeof p.repairRate==='number'&&p.repairRate>0)},
        {key:'drone',  nm:I18N.t('part.filterDrone'),  col:'#66ff99',     filter:p=>p.cat==='armor'&&typeof p.repairRate==='number'&&p.repairRate>0},
        {key:'engine', nm:I18N.t('part.filterEngine'),       col:'var(--cyan)', filter:p=>p.cat==='engine'},
        {key:'cargo',  nm:(I18N.t('part.filterCargo')||'📦 특수창고'), col:'#66ff99', filter:p=>p.cat==='cargo_ext'}
      ];
      const rarCol=p=>p.rarity==='mythic'?'#ff88ff':p.rarity==='set'?'#c080ff':p.tier>=15?'var(--gold)':p.tier>=11?'#ffa040':p.tier>=6?'var(--cyan)':'var(--txt)';
      const rarBdr=p=>p.rarity==='mythic'?'rgba(255,136,255,.6)':p.rarity==='set'?'rgba(192,128,255,.6)':p.tier>=15?'rgba(255,215,0,.5)':p.tier>=11?'rgba(255,160,64,.4)':p.tier>=6?'rgba(0,243,255,.3)':'var(--bdr)';
      const statTxt=p=>p.cat==='weapon'?`ATT+${p.ATT}`:p.cat==='shield'?`INT+${p.INT}`:p.cat==='armor'?`HP+${p.HP}`:p.cat==='cargo_ext'?`📦+${p.cargoBonus}`:p.cat==='engine'?`TEC+${p.TEC}`:`TEC+${p.TEC||0}`;
      const totalHave=PARTS.filter(p=>haveSet.has(p.id)).length;
      content=`<div style="background:var(--card);border-radius:8px;padding:10px;margin-bottom:12px;display:flex;gap:12px;align-items:center">
        <div style="font-size:29px">⚙️</div>
        <div><div style="font-size:14px;color:var(--txt);font-weight:bold">${I18N.t('ui.partsCodex')}</div>
        <div style="font-size:12px;color:var(--dim)">${I18N.t('ui.ownedParts',{have:totalHave,total:PARTS.length})}</div></div>
        <div style="margin-left:auto;text-align:right"><div style="font-size:13px;color:var(--dim)">${I18N.t('ui.completion')}</div>
        <div style="font-size:17px;color:var(--gold);font-weight:bold">${Math.round(totalHave/PARTS.length*100)}%</div></div>
      </div>
      <!-- 사용자 요청 2026-06-09: 파츠 도감 상단에 6종 카테고리 실제 게임 기능 설명 패널 -->
      <div style="background:linear-gradient(135deg,rgba(0,243,255,.05),rgba(204,102,255,.05));border:1px solid rgba(0,243,255,.25);border-radius:10px;padding:12px;margin-bottom:14px">
        <div style="font-size:13px;color:var(--cyan);font-weight:bold;margin-bottom:10px;letter-spacing:1px">${I18N.t('partsGuide.header')}</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:10px;font-size:12px;color:var(--txt);line-height:1.55">
          <div style="background:rgba(255,59,59,.06);border-left:3px solid var(--red);padding:8px 10px;border-radius:4px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px"><img src="${partImgSrc('W01')}" alt="" style="width:var(--ui-part-guide-img,48px);height:var(--ui-part-guide-img,48px);object-fit:contain;flex-shrink:0;border-radius:5px;background:rgba(0,0,0,.25)" onerror="this.outerHTML='<span style=&quot;font-size:30px&quot;>⚔️</span>'"><span style="color:var(--red);font-weight:bold">${I18N.t('partsGuide.laserT')}</span></div>
            <div>${I18N.t('partsGuide.laserD')}</div>
          </div>
          <div style="background:rgba(255,136,68,.06);border-left:3px solid #ff8844;padding:8px 10px;border-radius:4px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px"><img src="${partImgSrc('ML01')}" alt="" style="width:var(--ui-part-guide-img,48px);height:var(--ui-part-guide-img,48px);object-fit:contain;flex-shrink:0;border-radius:5px;background:rgba(0,0,0,.25)" onerror="this.outerHTML='<span style=&quot;font-size:30px&quot;>🚀</span>'"><span style="color:#ff8844;font-weight:bold">${I18N.t('partsGuide.missileT')}</span></div>
            <div>${I18N.t('partsGuide.missileD')}</div>
          </div>
          <div style="background:rgba(0,150,255,.06);border-left:3px solid var(--blue);padding:8px 10px;border-radius:4px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px"><img src="${partImgSrc('S01')}" alt="" style="width:var(--ui-part-guide-img,48px);height:var(--ui-part-guide-img,48px);object-fit:contain;flex-shrink:0;border-radius:5px;background:rgba(0,0,0,.25)" onerror="this.outerHTML='<span style=&quot;font-size:30px&quot;>🛡️</span>'"><span style="color:var(--blue);font-weight:bold">${I18N.t('partsGuide.shieldT')}</span></div>
            <div>${I18N.t('partsGuide.shieldD')}</div>
          </div>
          <div style="background:rgba(212,175,55,.06);border-left:3px solid var(--gold);padding:8px 10px;border-radius:4px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px"><img src="${partImgSrc('A01')}" alt="" style="width:var(--ui-part-guide-img,48px);height:var(--ui-part-guide-img,48px);object-fit:contain;flex-shrink:0;border-radius:5px;background:rgba(0,0,0,.25)" onerror="this.outerHTML='<span style=&quot;font-size:30px&quot;>🛡</span>'"><span style="color:var(--gold);font-weight:bold">${I18N.t('partsGuide.armorT')}</span></div>
            <div>${I18N.t('partsGuide.armorD')}</div>
          </div>
          <div style="background:rgba(0,243,255,.06);border-left:3px solid var(--cyan);padding:8px 10px;border-radius:4px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px"><img src="${partImgSrc('E01')}" alt="" style="width:var(--ui-part-guide-img,48px);height:var(--ui-part-guide-img,48px);object-fit:contain;flex-shrink:0;border-radius:5px;background:rgba(0,0,0,.25)" onerror="this.outerHTML='<span style=&quot;font-size:30px&quot;>⚡</span>'"><span style="color:var(--cyan);font-weight:bold">${I18N.t('partsGuide.engineT')}</span></div>
            <div>${I18N.t('partsGuide.engineD')}</div>
            <div style="margin-top:6px;font-size:11px;line-height:1.5">${I18N.t('partsGuide.engineMove')}</div>
          </div>
          <div style="background:rgba(102,255,153,.06);border-left:3px solid #66ff99;padding:8px 10px;border-radius:4px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px"><img src="${partImgSrc('SC01')}" alt="" style="width:var(--ui-part-guide-img,48px);height:var(--ui-part-guide-img,48px);object-fit:contain;flex-shrink:0;border-radius:5px;background:rgba(0,0,0,.25)" onerror="this.outerHTML='<span style=&quot;font-size:30px&quot;>📦</span>'"><span style="color:#66ff99;font-weight:bold">${I18N.t('partsGuide.scT')}</span></div>
            <div>${I18N.t('partsGuide.scD')}</div>
          </div>
        </div>
      </div>
      ${sections.map(sec=>{
        const ps=_CODEXP.filter(sec.filter);const hv=ps.filter(p=>haveSet.has(p.id)).length;
        if(!ps.length)return'';
        return`<div style="margin-bottom:16px">
          <div style="font-size:13px;color:${sec.col};font-weight:bold;margin-bottom:8px;letter-spacing:1px">${sec.nm} <span style="color:var(--dim);font-size:11px">${hv}/${ps.length}</span></div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px">
            ${ps.map(p=>{const have=haveSet.has(p.id);
              const cat=p.cat;
              const _invQty=inv.find(i=>i.id===p.id)?.qty||0;
              const _eqQty=(G.fleet||[]).flatMap(s=>s.parts||[]).filter(pid=>pid===p.id).length;
              const qty=_invQty+_eqQty;
              const rarityBadge=have?(p.rarity==='mythic'?I18N.t('part.badgeMythic'):p.rarity==='set'?I18N.t('part.badgeSet'):''):'';
              // 미발견 파츠: 이름·스탯·이미지 모두 숨김 (사용자 요청: 물음표 처리)
              const _imgHtml=have
                ? imgOrEmoji(partImgSrc(p.id),sec.key==='laser'?'⚔️':sec.key==='missile'?'🚀':cat==='shield'?'🛡️':cat==='armor'?'🛡':cat==='cargo_ext'?'📦':'⚡',78,78,'','part_'+p.id)
                : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:44px;color:var(--dim);background:rgba(0,0,0,.4)">❔</div>';
              const _clickAttr=have?'cursor:pointer':'';
              const _onclick=have?`onclick="showCodexPartModal('${p.id}')" title="${I18N.t('ui.codexClickDetail')}"`:'';
              return`<div style="background:var(--card);border:1px solid ${have?rarBdr(p):'var(--bdr)'};border-radius:8px;padding:8px;text-align:center;opacity:${have?1:.55};position:relative;min-height:148px">
                <div style="width:78px;height:78px;border-radius:50%;overflow:hidden;margin:0 auto 6px;${_clickAttr}" ${_onclick}>${_imgHtml}</div>
                <div style="font-size:12px;font-weight:bold;color:${have?rarCol(p):'var(--dim)'};line-height:1.2;word-break:keep-all">${have?partDisplayNm(p):'???'}</div>
                <div style="font-size:10px;color:var(--dim);margin-top:2px">${have?('T'+p.tier+' · '+statTxt(p)):I18N.t('ui.statusUndiscovered')}</div>
                ${rarityBadge}
                <div style="font-size:10px;margin-top:2px">${have?`<span style="color:var(--green)">✅ ×${qty}</span>`:`<span style="color:var(--dim)">${I18N.t('ui.notOwned')}</span>`}</div>
              </div>`;
            }).join('')}
          </div>
        </div>`;
      }).join('')}`;
    }
    else if(_codexTab==='heroes'){
      const heroList=Object.entries(HEROES);
      const recruited=heroList.filter(([id])=>G.heroes.includes(id)).length;
      const _specials=(typeof SPECIAL_CHARS!=='undefined')?SPECIAL_CHARS:[];
      // 스토리 NPC(컷씬 조연) — 시청한 컷씬에 등장한 char 를 모아 해금 판정
      const _storyNpcs=(typeof STORY_NPCS!=='undefined')?STORY_NPCS:[];
      const _seenSc=(G&&G._scenesSeen)||{};
      const _metChars=new Set();
      for(let _ph=1;_ph<=6;_ph++){
        const _CUTm=window['PHASE'+_ph+'_CUTSCENES_KO']||{};
        Object.keys(_CUTm).forEach(sid=>{ if(_seenSc['scene_'+sid]){ (_CUTm[sid]||[]).forEach(l=>{ if(l&&l.char)_metChars.add(l.char); }); } });
      }
      const _metNpcCount=_storyNpcs.filter(c=>_metChars.has(c.id)).length;
      const _storyNpcCard=(c)=>{
        const met=_metChars.has(c.id);
        const col=c.color||'#88ddff';
        const oc=met?`onclick="showCodexStoryNpcModal('${c.id}')"`:'';
        const hover=met?'onmouseover="this.style.opacity=\'.85\'" onmouseout="this.style.opacity=\'1\'"':'';
        const _cImg=(met&&c.img)?(c.img+((window._GAME_VER&&c.img.indexOf('?v=')<0)?('?v='+encodeURIComponent(window._GAME_VER)):'')):null;
        const imgHtml=_cImg?`<img src="${_cImg}" alt="${c.nm}" style="width:78px;height:78px;border-radius:50%;object-fit:cover;border:2px solid ${col};background:rgba(0,0,0,.3);box-shadow:0 0 12px ${col}66" onerror="this.outerHTML='<div style=\\'width:78px;height:78px;border-radius:50%;background:rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;font-size:48px;border:2px solid ${col}\\'>${c.ic}</div>'">`:`<div style="width:78px;height:78px;border-radius:50%;background:rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;font-size:48px;border:2px solid var(--bdr)">❔</div>`;
        return `<div ${oc} ${hover} style="background:var(--card);border:1px solid ${met?col:'var(--bdr)'};border-radius:8px;padding:8px;text-align:center;opacity:${met?1:.4};min-height:148px;${met?'cursor:pointer':''}">
          <div style="margin:0 auto 6px;display:flex;justify-content:center">${imgHtml}</div>
          <div style="font-size:12px;font-weight:bold;color:${met?col:'var(--dim)'};line-height:1.2">${met?c.nm:'???'}</div>
          <div style="font-size:10px;color:${col};margin-top:2px;opacity:.8">${met?c.role:I18N.t('ui.statusUndiscovered')}</div>
        </div>`;
      };
      // 특수 인물 카드 (백구·우르사·블랙팔콘) — 영웅 카드와 같은 폼팩터, 보스 격파 여부에 따라 표시
      const _specialCard=(c)=>{
        const isBaekgu=c.id==='NPC_BAEKGU';
        const isUrsa=c.id==='NPC_URSA';
        const isFalcon=c.id==='NPC_BLACKFALCON';
        const unlocked=isBaekgu||(isUrsa&&G._earthLiberated)||(isFalcon&&G._falconDefeated);
        const col=isBaekgu?'#9ee7ff':isUrsa?'#ff66cc':isFalcon?'#cc66ff':'var(--gold)';
        const oc=unlocked?`onclick="showCodexSpecialCharModal('${c.id}')"`:'';
        const hover=unlocked?'onmouseover="this.style.opacity=\'.85\'" onmouseout="this.style.opacity=\'1\'"':'';
        const _cImg=(unlocked&&c.img)?(c.img+((window._GAME_VER&&c.img.indexOf('?v=')<0)?('?v='+encodeURIComponent(window._GAME_VER)):'')):null;
        const imgHtml=_cImg?`<img src="${_cImg}" alt="${c.nm}" style="width:78px;height:78px;border-radius:50%;object-fit:cover;border:2px solid ${col};background:rgba(0,0,0,.3);box-shadow:0 0 12px ${col}66" onerror="this.outerHTML='<div style=\\'width:78px;height:78px;border-radius:50%;background:rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;font-size:48px;border:2px solid ${col}\\'>${c.ic}</div>'">`:`<div style="width:78px;height:78px;border-radius:50%;background:rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;font-size:48px;border:2px solid var(--bdr)">❔</div>`;
        return `<div ${oc} ${hover} style="background:var(--card);border:1px solid ${unlocked?col:'var(--bdr)'};border-radius:8px;padding:8px;text-align:center;opacity:${unlocked?1:.4};min-height:148px;${unlocked?'cursor:pointer':''}">
          <div style="margin:0 auto 6px;display:flex;justify-content:center">${imgHtml}</div>
          <div style="font-size:12px;font-weight:bold;color:${unlocked?col:'var(--dim)'};line-height:1.2">${unlocked?c.nm:'???'}</div>
          <div style="font-size:10px;color:${col};margin-top:2px;opacity:.8">${unlocked?c.role.split('·')[0].trim():I18N.t('ui.statusUndiscovered')}</div>
        </div>`;
      };
      // 사령관(주인공) 카드 — 항상 1로 포함, 단계별 이미지 노출
      const _cmdStage=(typeof _commanderStage==='function')?_commanderStage():0;
      const _cmdStageLb=[I18N.t('ui.rankCivilian'),I18N.t('ui.rankCaptain'),I18N.t('ui.rankAdmiral'),I18N.t('ui.rankGrandAdmiral')][_cmdStage]||I18N.t('ui.rankCivilian');
      const _cmdStageCol=['#9ee7ff','#66ddff','#ffcc00','#ff66ff'][_cmdStage]||'#9ee7ff';
      const _cmdImg=(typeof _commanderPortraitSrc==='function')?_commanderPortraitSrc():'img/chars/commander_m0.png';
      const _cmdName=G.profile?.name||I18N.t('ui.commander');
      const _cmdCo=G.profile?.company||I18N.t('ui.companyDefault');
      const _cmdShip=G.fleet&&G.fleet[0]?(shipDisplayNm(G.fleet[0])||G.fleet[0].nm):I18N.t('ui.shipDefault');
      const _cmdRep=G.reputation||0;
      const _cmdPlv=(typeof calcPlayerLevel==='function')?calcPlayerLevel():1;
      const totalChars=1+heroList.length+_specials.length+_storyNpcs.length;
      const totalUnlocked=1+recruited+_specials.filter(c=>c.id==='NPC_BAEKGU'||(c.id==='NPC_URSA'&&G._earthLiberated)||(c.id==='NPC_BLACKFALCON'&&G._falconDefeated)).length+_metNpcCount;
      content=`<div style="background:var(--card);border-radius:8px;padding:10px;margin-bottom:12px;display:flex;gap:12px;align-items:center">
        <img src="img/ui/HN01.png${window._GAME_VER?'?v='+window._GAME_VER:''}" alt="HN" style="width:36px;height:36px;object-fit:contain;filter:drop-shadow(0 0 4px rgba(255,215,0,.6))" onerror="this.outerHTML='<div style=\\'font-size:29px\\'>⭐</div>'">
        <div><div style="font-size:14px;color:var(--txt);font-weight:bold">${I18N.t('ui.heroCodex')}</div>
        <div style="font-size:12px;color:var(--dim)">${I18N.t('ui.discoveredHero',{n:`<span style="color:var(--cyan)">${totalUnlocked}</span>`,total:totalChars})}</div></div>
        <div style="margin-left:auto;text-align:right"><div style="font-size:13px;color:var(--dim)">${I18N.t('ui.completion')}</div>
        <div style="font-size:17px;color:var(--gold);font-weight:bold">${Math.round(totalUnlocked/totalChars*100)}%</div></div>
      </div>
      <!-- Commander (protagonist) — auto-rank by reputation / combat power -->
      <div style="font-size:13px;color:${_cmdStageCol};font-weight:bold;margin-bottom:8px;letter-spacing:1px">${I18N.t('ui.commanderCodexLabel')} <span style="color:var(--dim);font-size:11px">${_cmdStageLb}</span></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;margin-bottom:16px">
        <div onclick="showCodexCommanderModal()" onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'" style="background:var(--card);border:1.5px solid ${_cmdStageCol};border-radius:8px;padding:8px;text-align:center;cursor:pointer;min-height:148px;box-shadow:0 0 12px ${_cmdStageCol}33">
          <div style="margin:0 auto 6px;display:flex;justify-content:center">
            <img src="${_cmdImg}" alt="${_cmdName}" style="width:78px;height:78px;border-radius:50%;object-fit:cover;border:2px solid ${_cmdStageCol};background:rgba(0,0,0,.3);box-shadow:0 0 8px ${_cmdStageCol}66" onerror="this.outerHTML='<div style=\\'width:78px;height:78px;border-radius:50%;background:rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;font-size:48px;border:2px solid ${_cmdStageCol}\\'>👤</div>'">
          </div>
          <div style="font-size:12px;font-weight:bold;color:${_cmdStageCol};line-height:1.2">${_cmdName}</div>
          <div style="font-size:10px;color:${_cmdStageCol};margin-top:2px;opacity:.8">${_cmdStageLb}</div>
          <div style="font-size:10px;color:var(--dim);margin-top:2px"><img src="img/ui/HN01.png${window._GAME_VER?'?v='+window._GAME_VER:''}" alt="HN" style="width:12px;height:12px;object-fit:contain;vertical-align:middle" onerror="this.outerHTML='⭐'">${_cmdRep} · ⚔${_cmdPlv}</div>
        </div>
      </div>
      <!-- 전설 영웅 8인 -->
      <div style="font-size:13px;color:var(--gold);font-weight:bold;margin-bottom:8px;letter-spacing:1px">${I18N.t('ui.legendHeroesLabel')} <span style="color:var(--dim);font-size:11px">${recruited}/${heroList.length}</span></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;margin-bottom:16px">
        ${heroList.map(([id,h])=>{const have=G.heroes.includes(id);const aboard=G.fleet.find(s=>(s.crewIds||[]).includes(id));
          const cl=have?'cursor:pointer':'';
          const oc=have?`onclick="showCodexHeroModal('${id}')"` :'';
          const hover=have?'onmouseover="this.style.opacity=\'.8\'" onmouseout="this.style.opacity=\'1\'"':'';
          return`<div ${oc} ${hover} style="background:var(--card);border:1px solid ${have?'var(--gold)':'var(--bdr)'};border-radius:8px;padding:8px;text-align:center;opacity:${have?1:.4};min-height:148px;${cl}">
            <div style="margin:0 auto 6px;display:flex;justify-content:center">${have?_heroPortrait({...h,id},78,'var(--gold)'):`<div style="width:78px;height:78px;border-radius:50%;background:rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;font-size:48px;border:2px solid var(--bdr);flex-shrink:0">❔</div>`}</div>
            <div style="font-size:12px;font-weight:bold;color:${have?'var(--gold)':'var(--dim)'};line-height:1.2">${have?((I18N&&I18N.has&&I18N.has('hero.'+id+'.nm'))?I18N.t('hero.'+id+'.nm'):h.nm):'???'}</div>
            <div style="font-size:10px;color:var(--purple);margin-top:2px">${have?((I18N&&I18N.has&&I18N.has('hero.'+id+'.sk'))?I18N.t('hero.'+id+'.sk'):h.sk):I18N.t('ui.notRecruited')}</div>
            ${have?`<div style="font-size:10px;color:${aboard?'var(--cyan)':'var(--dim)'};margin-top:2px">🛸 ${aboard?shipDisplayNm(aboard):I18N.t('ui.notAboard')}</div>`:''}
          </div>`;
        }).join('')}
      </div>
      <!-- 특수 인물 (AI·보스·히든) -->
      <div style="font-size:13px;color:#cc66ff;font-weight:bold;margin-bottom:8px;letter-spacing:1px">${I18N.t('ui.specialCharsLabel')} <span style="color:var(--dim);font-size:11px">${I18N.t('ui.specialCharsSub')}</span></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px">
        ${_specials.map(_specialCard).join('')}
      </div>
      <!-- 스토리 인물 (컷씬 조연) -->
      ${_storyNpcs.length?`<div style="font-size:13px;color:#88ddff;font-weight:bold;margin:16px 0 8px;letter-spacing:1px">${I18N.t('codex.storyNpcLabel')} <span style="color:var(--dim);font-size:11px">${_metNpcCount}/${_storyNpcs.length}</span></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px">
        ${_storyNpcs.map(_storyNpcCard).join('')}
      </div>`:''}`;
    }

    else if(_codexTab==='planets'){
      // 버그픽스: G.planets 는 게임 시작 시 모든 행성으로 초기화되므로 Object.keys 로 "방문" 판정 불가.
      //  → fog!=='L' (실제 탐험·인접 노출) 인 행성만 visited 로 처리. 모든 행성이 공개되던 문제 해결.
      const visitedPlanets=new Set();
      Object.entries(G.planets||{}).forEach(([pid,st])=>{
        if(st&&st.fog&&st.fog!=='L')visitedPlanets.add(pid);
      });
      const factionCol={F01:'var(--cyan)',F02:'var(--gold)',F03:'var(--green)',F04:'var(--red)',F05:'#ff4444',F06:'#88ccff',F07:'var(--purple)'};
      const factionNm={F01:I18N.t('faction.F01.nm'),F02:I18N.t('faction.F02.nm'),F03:I18N.t('faction.F03.nm'),F04:I18N.t('faction.F04.nm'),F05:I18N.t('faction.F05.nm'),F06:I18N.t('faction.F06.nm'),F07:I18N.t('faction.F07.nm')};
      const totalVisited=PLANET_DEF.filter(p=>visitedPlanets.has(p.id)).length;
      const planetCards=PLANET_DEF.map(p=>{
        const visited=visitedPlanets.has(p.id);
        const fc=factionCol[p.f]||'var(--dim)';
        const fn=factionNm[p.f]||p.f;
        const isCurrent=p.id===G.currentPlanet;
        const filt=visited?'':'filter:grayscale(.9);opacity:.35';
        // P31 해방 후 P31_free.png 시도 (없으면 P31.png로 fallback)
        const _planetSrc=planetImgSrc(p.id);
        const _planetFb=`img/planets/${p.id}.png`;
        const _onErr=(_planetSrc!==_planetFb)?`if(this.src.indexOf('_free')>0){this.src='${_planetFb}';}else{this.remove();}`:`this.remove();`;
        const imgEl=visited?('<img src="'+_planetSrc+'" style="width:100%;height:100%;object-fit:cover" onerror="'+_onErr+'">'):'<span style="font-size:22px;display:flex;align-items:center;justify-content:center;height:100%">❔</span>';
        const badge=isCurrent?I18N.t('codex.planetCurrent'):visited?I18N.t('codex.planetVisited'):'';
        const clickable=visited?'cursor:pointer;':'';
        const onclick=visited?'onclick="showCodexPlanetModal(\''+p.id+'\')"':'';
        // 우상단 ID 배지 (방문 여부와 무관하게 항상 노출 — 사용자 식별용)
        const idBadge='<div style="position:absolute;top:4px;right:6px;font-size:9px;color:rgba(180,200,220,.55);font-family:Courier New,monospace;letter-spacing:.5px;pointer-events:none">'+p.id+'</div>';
        return '<div '+onclick+' style="position:relative;background:var(--card);border:1px solid '+(isCurrent?'var(--cyan)':visited?fc:'var(--bdr)')+';border-radius:8px;padding:8px;text-align:center;min-height:148px;'+filt+clickable+'" '+(visited?'onmouseover="this.style.opacity=\'.8\'" onmouseout="this.style.opacity=\'1\'"':'')+'>'
          +idBadge
          +'<div style="width:78px;height:78px;border-radius:50%;overflow:hidden;margin:0 auto 6px">'+imgEl+'</div>'
          +'<div style="font-size:12px;font-weight:bold;color:'+(visited?'var(--txt)':'var(--dim)')+';line-height:1.2">'+( visited?p.nm:'???')+'</div>'
          +'<div style="font-size:10px;color:'+fc+';margin-top:2px">'+(visited?fn:'')+'</div>'
          +'<div style="font-size:10px;color:var(--dim);margin-top:1px">'+(visited?I18N.t('codex.ringPrefix',{n:p.ring}):'')+'</div>'
          +badge
          +'</div>';
      }).join('');
      content='<div style="background:var(--card);border-radius:8px;padding:10px;margin-bottom:12px;display:flex;gap:12px;align-items:center">'
        +'<div style="font-size:29px">🪐</div>'
        +`<div><div style="font-size:14px;color:var(--txt);font-weight:bold">${I18N.t('ui.planetCodex')}</div>`
        +`<div style="font-size:12px;color:var(--dim)">${I18N.t('ui.visitedPlanets',{visited:totalVisited,total:PLANET_DEF.length})}</div></div>`
        +`<div style="margin-left:auto;text-align:right"><div style="font-size:13px;color:var(--dim)">${I18N.t('ui.explorationRate')}</div>`
        +'<div style="font-size:17px;color:var(--gold);font-weight:bold">'+Math.round(totalVisited/PLANET_DEF.length*100)+'%</div></div></div>'
        +'<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px">'+planetCards+'</div>';
    }
    else if(_codexTab==='comms'){
      const discoveredComms=getDiscoveredCommIds();
      const totalDisc=COMMODITIES.filter(c=>discoveredComms.has(c.id)).length;
      const matComms=COMMODITIES.filter(c=>c.material);
      const normalComms=COMMODITIES.filter(c=>!c.material);
      function commSection(label,list){
        if(!list.length)return'';
        const discCount=list.filter(c=>discoveredComms.has(c.id)).length;
        const cards=list.map(c=>{
          const seen=discoveredComms.has(c.id);
          const bdr=seen?'rgba(0,243,255,.3)':'var(--bdr)';
          const nc=seen?'var(--txt)':'var(--dim)';
          // 미발견 특산물도 디자인(이미지) 숨김 — 함선·파츠와 일관성
          const imgHtml=seen
            ? imgOrEmoji(commImgSrc(c.id),c.ic||'💎',78,78,'',(c.material?'mat_':'comm_')+c.id)
            : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:44px;color:var(--dim);background:rgba(0,0,0,.45);border-radius:50%">❔</div>';
          return '<div style="background:var(--card);border:1px solid '+bdr+';border-radius:8px;padding:8px;text-align:center;min-height:148px'+(seen?'':';opacity:.55')+'">'
            +'<div style="width:78px;height:78px;border-radius:50%;overflow:hidden;margin:0 auto 6px">'+imgHtml+'</div>'
            +'<div style="font-size:12px;font-weight:bold;color:'+nc+';line-height:1.2">'+(seen?commDisplayNm(c):'???')+'</div>'
            +(seen?'<div style="font-size:10px;color:var(--gold);margin-top:2px">₡'+c.buy.toLocaleString()+'</div>':`<div style="font-size:10px;color:var(--dim);margin-top:2px">${I18N.t('ui.undiscoveredShort')}</div>`)
            +'<div style="font-size:10px;color:'+(seen?'var(--green)':'var(--dim)')+';margin-top:2px">'+(seen?I18N.t('codex.commDiscovered'):'')+'</div>'
            +'</div>';
        }).join('');
        return '<div style="margin-bottom:16px">'
          +'<div style="font-size:13px;color:var(--cyan);font-weight:bold;margin-bottom:8px">'+I18N.t('codex.commHeader',{label,n:discCount,total:list.length})+'</div>'
          +'<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px">'+cards+'</div>'
          +'</div>';
      }
      content='<div style="background:var(--card);border-radius:8px;padding:10px;margin-bottom:12px;display:flex;gap:12px;align-items:center">'
        +'<div style="font-size:29px">💎</div>'
        +'<div><div style="font-size:14px;color:var(--txt);font-weight:bold">'+I18N.t('codex.commIndexTitle')+'</div>'
        +'<div style="font-size:12px;color:var(--dim)">'+I18N.t('ui.discoveredComm',{n:`<span style="color:var(--cyan)">${totalDisc}</span>`,total:COMMODITIES.length})+'</div></div>'
        +`<div style="margin-left:auto;text-align:right"><div style="font-size:13px;color:var(--dim)">${I18N.t('ui.collectionRate')}</div>`
        +'<div style="font-size:17px;color:var(--gold);font-weight:bold">'+Math.round(totalDisc/COMMODITIES.length*100)+'%</div></div></div>'
        +commSection(I18N.t('codex.commSectionGoods'),normalComms)
        +commSection(I18N.t('codex.commSectionMats'),matComms);
    }
    else if(_codexTab==='civ'){
      // 문명 도감 — 해당 팩션 행성을 1개라도 방문(fog!=='L')해야 해금 (사용자 요청: 미발견은 ???)
      const F_ORDER=['F01','F02','F03','F04','F05','F06','F07'];
      const _facDiscovered=fid=>PLANET_DEF.some(p=>p.f===fid&&G.planets[p.id]&&G.planets[p.id].fog!=='L');
      function _repPlanetName(pid){const pd=PLANET_DEF.find(p=>p.id===pid);return pd?`${pid} ${pd.nm}`:pid;}
      function _facCard(fid){
        const f=FACTION[fid]||{};
        const l=(typeof FACTION_LORE!=='undefined')?FACTION_LORE[fid]:null;
        if(!l)return '';
        const col=f.col||'#888';
        const disc=_facDiscovered(fid);
        if(!disc){
          // 미발견 문명 — 카드 골격만 노출, 모든 정보를 ??? 처리
          return `<div style="background:rgba(0,0,0,.3);border:1px dashed var(--bdr);border-radius:10px;padding:14px 16px;margin-bottom:14px;opacity:.55">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid var(--bdr)">
              <div style="width:84px;height:84px;border-radius:50%;flex-shrink:0;border:2px solid var(--bdr);background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;font-size:48px;color:var(--dim)">❔</div>
              <div style="flex:1;min-width:0">
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
                  <span style="font-size:22px;color:var(--dim)">❔</span>
                  <span style="font-size:18px;font-weight:bold;color:var(--dim);letter-spacing:1px">${I18N.t('ui.civUnknown')}</span>
                </div>
                <div style="font-size:11px;color:var(--dim)">${I18N.t('codex.repPlanetUndisc')}</div>
              </div>
            </div>
            <div style="font-size:12px;color:var(--dim);text-align:center;padding:10px 0">${I18N.t('ui.civVisitToUnlock')}</div>
          </div>`;
        }
        const repName=_repPlanetName(l.rep);
        const planetImg=planetImgSrc(l.rep);
        return `<div style="background:rgba(0,0,0,.3);border:1px solid ${col}55;border-radius:10px;padding:14px 16px;margin-bottom:14px;box-shadow:0 2px 12px ${col}22">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid ${col}44">
            <div style="width:84px;height:84px;border-radius:50%;overflow:hidden;flex-shrink:0;border:2px solid ${col};box-shadow:0 0 16px ${col}66;background:radial-gradient(circle at center, ${col}33, #000);position:relative">
              <img src="${planetImg}" alt="${repName}" style="width:100%;height:100%;object-fit:cover;display:block" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
              <div style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:44px">${l.icon||'🪐'}</div>
            </div>
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
                <span style="font-size:22px">${l.icon||'🪐'}</span>
                <span style="font-size:18px;font-weight:bold;color:${col};letter-spacing:1px">${f.nm||fid}</span>
              </div>
              <div style="font-size:11px;color:var(--dim)">${I18N.t('codex.repPlanetLabel',{col,nm:repName})}</div>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:auto 1fr;gap:6px 12px;font-size:12.5px;line-height:1.7;color:var(--txt)">
            <div style="color:${col};font-weight:bold;white-space:nowrap">${I18N.t('ui.civStart')}</div><div>${l.start||'-'}</div>
            <div style="color:${col};font-weight:bold;white-space:nowrap">${I18N.t('ui.civEnv')}</div><div style="word-break:keep-all">${l.env||'-'}</div>
            <div style="color:${col};font-weight:bold;white-space:nowrap">${I18N.t('ui.civTraits')}</div><div style="word-break:keep-all">${l.traits||'-'}</div>
            <div style="color:#ffaa66;font-weight:bold;white-space:nowrap">${I18N.t('ui.warning')}</div><div style="color:rgba(255,200,160,.9);word-break:keep-all">${l.warn||'-'}</div>
            <div style="color:${col};font-weight:bold;white-space:nowrap">${I18N.t('ui.civLook')}</div><div style="word-break:keep-all">${l.look||'-'}</div>
          </div>
          <div style="margin-top:10px;padding:8px 12px;background:rgba(255,215,0,.06);border-left:3px solid var(--gold);border-radius:4px;font-size:12px;line-height:1.7;color:#ffe;font-style:italic;word-break:keep-all">
            💬 ${l.quip||'-'}
          </div>
        </div>`;
      }
      const cards=F_ORDER.map(_facCard).join('');
      const _discCount=F_ORDER.filter(_facDiscovered).length;
      content=`<div style="background:var(--card);border-radius:8px;padding:10px;margin-bottom:14px;display:flex;gap:12px;align-items:center">
        <div style="font-size:29px">🌌</div>
        <div><div style="font-size:14px;color:var(--txt);font-weight:bold">${I18N.t('ui.civCodex')}</div>
        <div style="font-size:12px;color:var(--dim)">${I18N.t('ui.discoveredCiv',{n:`<span style="color:var(--cyan)">${_discCount}</span>`,total:F_ORDER.length})}</div></div>
        <div style="margin-left:auto;text-align:right"><div style="font-size:13px;color:var(--dim)">${I18N.t('ui.explorationRate')}</div>
        <div style="font-size:17px;color:var(--gold);font-weight:bold">${Math.round(_discCount/F_ORDER.length*100)}%</div></div>
      </div>${cards}`;
    }
    else if(_codexTab==='sys'){
      // 은하계 시스템 생존 필수지식 — 12개 시스템 가이드
      if(typeof SYSTEM_GUIDE==='undefined'){
        content=`<div style="color:var(--dim);padding:24px;text-align:center">${I18N.t('ui.systemDataNotLoaded')}</div>`;
      } else {
        const _sysCard=(s)=>`<div style="background:rgba(0,0,0,.3);border:1px solid rgba(0,243,255,.25);border-radius:10px;padding:14px 16px;margin-bottom:14px;box-shadow:0 2px 12px rgba(0,243,255,.08)">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid rgba(0,243,255,.2)">
            <!-- 좌측 84×84 원형 시스템 배경 이미지 — 문명 카드와 동일 구조 -->
            <div style="width:84px;height:84px;border-radius:50%;overflow:hidden;flex-shrink:0;border:2px solid var(--cyan);box-shadow:0 0 16px rgba(0,243,255,.4);background:radial-gradient(circle at center, rgba(0,243,255,.2), #000);position:relative">
              <img src="${s.img||''}" alt="${s.name}" style="width:100%;height:100%;object-fit:cover;display:block" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
              <div style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:44px">${s.icon||'📘'}</div>
            </div>
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
                <span style="font-size:22px">${s.icon||'📘'}</span>
                <span style="font-size:17px;font-weight:bold;color:var(--cyan);letter-spacing:1px">${s.name}</span>
              </div>
              <div style="font-size:11px;color:var(--dim)">${s.location||''}</div>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:auto 1fr;gap:6px 12px;font-size:12.5px;line-height:1.7;color:var(--txt)">
            <div style="color:var(--cyan);font-weight:bold;white-space:nowrap">${I18N.t('ui.sysDesc')}</div><div style="word-break:keep-all">${s.desc||'-'}</div>
            <div style="color:var(--cyan);font-weight:bold;white-space:nowrap">${I18N.t('ui.sysOperator')}</div><div style="word-break:keep-all">${s.operator||'-'}</div>
            <div style="color:var(--green);font-weight:bold;white-space:nowrap">${I18N.t('ui.sysUnlock')}</div><div style="color:rgba(180,255,200,.95);word-break:keep-all">${s.unlock||'-'}</div>
            <div style="color:var(--cyan);font-weight:bold;white-space:nowrap">${I18N.t('ui.sysFeatures')}</div><div style="word-break:keep-all">${s.features||'-'}</div>
            <div style="color:#ffaa66;font-weight:bold;white-space:nowrap">${I18N.t('ui.warning')}</div><div style="color:rgba(255,200,160,.9);word-break:keep-all">${s.warn||'-'}</div>
          </div>
          <div style="margin-top:10px;padding:8px 12px;background:rgba(255,215,0,.06);border-left:3px solid var(--gold);border-radius:4px;font-size:12px;line-height:1.7;color:#ffe;font-style:italic;word-break:keep-all">
            💬 ${s.quip||'-'}
          </div>
        </div>`;
        const cards=SYSTEM_GUIDE.map(_sysCard).join('');
        content=`<div style="background:var(--card);border-radius:8px;padding:10px;margin-bottom:14px;display:flex;gap:12px;align-items:center">
          <div style="font-size:29px">📚</div>
          <div><div style="font-size:14px;color:var(--txt);font-weight:bold">${I18N.t('ui.essentialSurvival')}</div>
          <div style="font-size:12px;color:var(--dim)">${I18N.t('ui.sysFooter')}</div></div>
        </div>${cards}`;
      }
    }
    else if(_codexTab==='voyage'){
      content=_buildVoyageLogHTML();
    }
    else if(_codexTab==='clog'){
      content=(typeof window._combatLogContentHTML==='function')?window._combatLogContentHTML():'';
    }

    body.innerHTML=`<div class="hub-scroll">
      ${hubBanner('codex','📖',I18N.t('codex.tabLabel'))}
      <div class="hub-t">${I18N.t('hub.exploreCodex')}</div>
      ${subNav}
      ${content}
    </div>`;
  }
  

  // ─── 전역 노출 ─────────────────────────────────────────────
  window._markShipDiscovered=_markShipDiscovered;
  window.getDiscoveredShipIds=getDiscoveredShipIds;
  window.getDiscoveredCommIds=getDiscoveredCommIds;
  window.showCodexPlanetModal=showCodexPlanetModal;
  window.showCodexHeroModal=showCodexHeroModal;
  window.showCodexSpecialCharModal=showCodexSpecialCharModal;
  window.showCodexCommanderModal=showCodexCommanderModal;
  window.showCodexPartModal=showCodexPartModal;
  window.showCodexShipModal=showCodexShipModal;
  window.switchCodexTab=switchCodexTab;
  window.renderCodexTab=renderCodexTab;
  console.log('[codex] module loaded');
})();
