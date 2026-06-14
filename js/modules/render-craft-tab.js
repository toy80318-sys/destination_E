// ═══════════════════════════════════════════════════════════════════
// DESTINATION EARTH — 제작 시스템 모듈 (Phase B2)
//   · game.js 에서 분할 (2026-06-10, 사용자 요청: 긴 파일 분할)
//
// 공개 함수 (window.* 노출):
//   · renderCraftTab(body)         — 제작 탭 메인 렌더 (hubTab("craft"))
//   · doCraft(recipeId)            — 제작 실행 (HTML onclick)
//   · notifyBlueprint(bpId,bpNm,t) — 설계도 획득 알림 (toast)
//   · selectCraftRecipe / selectCraftMat — 레시피·재료 선택 (HTML onclick)
//   · openCraftSlot / setCraftSlot / removeCraftSlot — 슬롯 조작 (HTML onclick)
//   · showMatSlotTip / hideMatSlotTip / showBpTip / hideBpTip — 툴팁
//   · _showCraftResultToast / _showCraftCountdown — 결과 토스트·카운트다운
//
// 의존 글로벌 (window.*):
//   · G, CRAFT_RECIPES, CRAFT_MATERIALS, PARTS, SHIP_CATALOG
//   · I18N, _GAME_VER
//   · notify, baekgu, saveGame, rerenderTab, openModal, closeModal
//   · partImgSrc, partDisplayNm, shipImgSrc, shipDisplayNm, bpImgSrc
//   · _fireFireworks, addShipToFleet
// ═══════════════════════════════════════════════════════════════════
(function(){
if(typeof window==='undefined')return;
if(window._RENDER_CRAFT_TAB_LOADED)return;
window._RENDER_CRAFT_TAB_LOADED=true;

function notifyBlueprint(bpId,bpName,type='gold'){
  const container=document.getElementById('notif');
  if(!container){try{notify('📜 '+(bpName||bpId),type);}catch(e){}return;}
  const el=document.createElement('div');
  el.className=`ni${type==='ok'?' ok':type==='err'?' err':type==='gold'?' gold':type==='pur'?' pur':''}`;
  el.style.cssText='display:flex;align-items:center;gap:10px;padding:8px 12px';
  const _img=bpImgSrc(bpId);
  const _isShip=typeof bpId==='string'&&/^LGD\d/.test(bpId);
  const _label=(_isShip?'📜 함선 설계도':'📜 파츠 설계도');
  el.innerHTML='<img src="'+_img+'" alt="BP" style="width:36px;height:36px;object-fit:contain;flex-shrink:0;filter:drop-shadow(0 0 6px rgba(0,243,255,.6))" onerror="this.style.display=\'none\'">'
    +'<div style="display:flex;flex-direction:column;gap:2px;min-width:0"><div style="font-size:11px;color:rgba(255,255,255,.7)">'+_label+'</div>'
    +'<div style="font-size:13px;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+(bpName||bpId||'')+'</div></div>';
  container.appendChild(el);
  while(container.children.length>10)container.removeChild(container.firstChild);
  setTimeout(()=>{el.style.opacity='0';setTimeout(()=>el.remove(),400);},3600);
}
try{if(typeof window!=='undefined')window.notifyBlueprint=notifyBlueprint;}catch(e){}

function selectCraftRecipe(id){
  G._craftSelected=(G._craftSelected===id)?null:id;
  rerenderTab(renderCraftTab);
}
function selectCraftMat(matId){
  const recs=CRAFT_RECIPES.filter(r=>r.mats.some(m=>m.id===matId));
  if(recs.length===0)return;
  const alreadySelected=G._craftSelected&&recs.find(r=>r.id===G._craftSelected);
  if(!alreadySelected)G._craftSelected=recs[0].id;
  rerenderTab(renderCraftTab);
}
function doCraft(recipeId){
  const rec=CRAFT_RECIPES.find(r=>r.id===recipeId);
  if(!rec){notify(I18N.t('notify.noRecipe'),'err');return;}
  if(!G.materials)G.materials={};
  if(!G.blueprints)G.blueprints={};

  if(!G.blueprints[rec.id]){notify(I18N.t('notify.noBlueprint'),'err');return;}
  const _isTierDiscount=['legend','mythic','flagship'].includes(rec.tier);
  for(const m of rec.mats){
    const needQty=_isTierDiscount?Math.max(1,Math.floor(m.qty/2)):m.qty;
    if((G.materials[m.id]||0)<needQty){
      const comm=COMMODITIES.find(c=>c.id===m.id);
      const _disc=_isTierDiscount?I18N.t('craft.legendDiscount'):'';
      notify(I18N.t('notify.needMaterialQty',{nm:(comm?commDisplayNm(comm):'')||m.id,have:G.materials[m.id]||0,need:needQty,extra:_disc}),'err');return;
    }
  }
  if(rec.heroReq&&!(G.heroes||[]).includes(rec.heroReq)){
    const _hKey='hero.'+rec.heroReq+'.nm';
    const _heroNm=(I18N&&I18N.has&&I18N.has(_hKey))?I18N.t(_hKey):(HEROES[rec.heroReq]?.nm||rec.heroReq);
    notify(I18N.t('notify.heroNeeded',{nm:_heroNm}),'err');return;
  }

  const btn=document.getElementById('craftBtn');
  if(btn){btn.disabled=true;btn.innerHTML=I18N.t('craft.crafting');}

  // 전설 이상 등급: 재료 소모량 절반
  const _tierDiscount=['legend','mythic','flagship'].includes(rec.tier);
  for(const m of rec.mats){
    const consume=_tierDiscount?Math.max(1,Math.floor(m.qty/2)):m.qty;
    // bugfix 2026-06-12: 재료 소비 시 화물 슬롯도 동시 차감 (한쪽만 차감하면 정합성 보정이 유령 수량 부활)
    if(typeof consumeMaterialQty==='function')consumeMaterialQty(m.id,consume);
    else G.materials[m.id]=Math.max(0,(G.materials[m.id]||0)-consume);
  }

  const grid=document.getElementById('craftMatGrid');
  // 사용자 요청: 제작 지연(2초) 제거 → 즉시 결과 표시
  baekgu(I18N.t('baekgu.craftingInProgress'));

  (()=>{
    if(grid){grid.style.animation='';grid.style.filter='';grid.style.pointerEvents='';}
    // 사용자 요청 (2026-06-06): 함선 제작 시 누적 카운터 기반 "상급 이상" 확률 +0.1%/10회 보너스.
    //   카운터는 모든 제작(파츠/창고/함선)에서 누적되며 함선 제작 품질 롤에만 보너스 적용.
    if(G.craftCount==null)G.craftCount=0;
    G.craftCount++;
    const _shipBonus=(rec.type==='ship')?_shipCraftSuperiorBonus():0;
    const q=rollCraftQuality(_shipBonus);
    const mult=q.mult;
    // 마스터작(최고 등급) 발생 시 폭죽 연출 (사용자 요청)
    if(mult>=1.30)try{_fireFireworks();}catch(_e){}
    let resultHtml='';

    if(rec.type==='part'){
      if(!G.inventory)G.inventory=[];
      G.inventory.push({id:rec.id,qty:1,quality:mult,qualityLabel:q.label,crafted:true});
      const p=PARTS.find(x=>x.id===rec.id);
      resultHtml=`<div style="font-size:16px;color:var(--dim);margin-bottom:8px">${(p?partDisplayNm(p):rec.nm)||rec.nm}</div>
        <div style="font-size:36px;font-weight:bold;color:${q.col};margin:8px 0">${q.label}</div>
        <div style="font-size:16px;color:${q.col}">${I18N.t('ui.statMultLine',{m:mult.toFixed(2)})}</div>
        <div style="font-size:12px;color:var(--dim);margin-top:8px">${I18N.t('ui.equipFromInventory')}</div>`;
      const _recDispNm=(p?partDisplayNm(p):'')||rec.nm;
      notify(I18N.t('notify.craftComplete',{nm:_recDispNm,label:q.label}),'gold');
      baekgu(mult>=1.1?I18N.t('baekgu.craftJackpot',{label:q.label,pct:Math.round((mult-1)*100)}):mult<1.0?I18N.t('baekgu.craftPoor',{label:q.label}):I18N.t('baekgu.craftDone',{nm:_recDispNm,label:q.label}));
    } else if(rec.type==='cargo'){
      const scDef=SPECIAL_CARGO_PARTS.find(c=>c.id===rec.id);
      if(!scDef){notify(I18N.t('notify.holdDefMissing'),'err');return;}
      // 일괄 적용 → 인벤토리 적립. 정비소 파츠창의 창고 확장 슬롯에 함선별 장착.
      addToInventory(rec.id,1);
      resultHtml=`<div style="font-size:16px;color:var(--dim);margin-bottom:8px">${partDisplayNm(scDef)||scDef.nm}</div>
        <div style="font-size:36px;font-weight:bold;color:#d4af37;margin:8px 0">📦</div>
        <div style="font-size:18px;font-weight:bold;color:#d4af37">${I18N.t('ui.holdExpCraftDone')}</div>
        <div style="font-size:13px;color:var(--dim);margin-top:6px">${I18N.t('ui.cargoBonusKept',{n:scDef.cargoBonus})}</div>
        <div style="font-size:12px;color:var(--cyan);margin-top:6px">${I18N.t('ui.cargoExpEquipHint')}</div>`;
      notify(I18N.t('notify.holdPartCrafted',{nm:partDisplayNm(scDef)||scDef.nm}),'gold');
      baekgu(I18N.t('baekgu.holdPartCrafted',{nm:partDisplayNm(scDef)||scDef.nm,bonus:scDef.cargoBonus}));
    } else {
      const def=SHIP_CATALOG.find(s=>s.id===rec.id);
      if(!def){notify(I18N.t('notify.shipDataError'),'err');return;}
      // 사용자 요청 2026-06-09: 함선 제작도 같은 함선 8대 캡 적용
      const _sameCntC=_countSameShip(rec.id);
      if(_sameCntC>=SAME_SHIP_CAP){
        const _nmC=shipDisplayNm(def)||def.nm;
        notify(I18N.t('notify.sameShipMax',{nm:_nmC,max:SAME_SHIP_CAP}),'err');
        baekgu(I18N.t('baekgu.sameShipMax',{nm:_nmC,max:SAME_SHIP_CAP}));
        // 제작 재료 환불 — 이미 차감된 재료 복원
        for(const m of rec.mats){
          const refund=_tierDiscount?Math.max(1,Math.floor(m.qty/2)):m.qty;
          G.materials[m.id]=(G.materials[m.id]||0)+refund;
        }
        const btn2=document.getElementById('craftBtn');
        if(btn2){btn2.disabled=false;btn2.innerHTML=I18N.t('craft.craftRec',{nm:_nmC});}
        return;
      }
      const newShip={
        id:rec.id+'_craft_'+Date.now(),
        catalogId:rec.id,
        nm:def.nm+(mult>=1.1?' ★':mult<1.0?' ▽':''),
        tier:def.tier,
        maxHP:Math.round(def.maxHP*mult),hp:Math.round(def.maxHP*mult),
        maxSH:Math.round((def.maxSH||0)*mult),sh:Math.round((def.maxSH||0)*mult),
        ATT:Math.round((def.ATT||def.atk||100)*mult),
        INT:Math.round((def.INT||50)*mult),
        TEC:Math.round((def.TEC||50)*mult),
        HP:Math.round(def.maxHP*mult),LOY:def.LOY||80,DEF:def.DEF||0,
        // 화물칸: 카탈로그 정의의 cargoStart 우선, 없으면 티어 기본값 (4 폴백 버그 수정)
        cargoSlots:(typeof def.cargoStart==='number'?def.cargoStart:({소형:5,중형:10,대형:20,전설기함:30,신화:40})[def.tier]||10),
        parts:[],crewIds:[],
        crafted:true,quality:mult,qualityLabel:q.label
      };
      const _addRes=addShipToFleet(newShip);
      const _addedToReserve=(_addRes&&_addRes.added==='reserve');
      // 사용자 요청 (2026-06-06): 제작 결과 함선 등급(tier) 표시 추가
      const _tierLbl=I18N.tier(newShip.tier||def.tier||'소형');
      const _tierCol={'신화':'var(--purple)','전설기함':'#d4af37','대형':'var(--gold)','중형':'var(--blue)','소형':'var(--cyan)'}[newShip.tier||def.tier]||'var(--cyan)';
      resultHtml=`<div style="font-size:16px;color:var(--dim);margin-bottom:4px">${shipDisplayNm(def)||def.nm}</div>
        <div style="font-size:13px;color:${_tierCol};margin-bottom:6px;letter-spacing:1.5px"><span style="border:1px solid ${_tierCol};border-radius:4px;padding:1px 8px">${_tierLbl}</span></div>
        <div style="font-size:36px;font-weight:bold;color:${q.col};margin:8px 0">${q.label}</div>
        <div style="font-size:16px;color:${q.col}">${I18N.t('ui.perfMultLine',{m:mult.toFixed(2)})}</div>
        ${_addedToReserve?`<div style="font-size:13px;color:var(--cyan);margin-top:6px">${I18N.t('craft.reserveStored')}</div>`:''}
        <div style="font-size:13px;color:var(--dim);margin-top:4px">HP:${newShip.maxHP} | ATT:${newShip.ATT||newShip.atk||0}</div>
        <div style="font-size:12px;color:var(--dim);margin-top:8px">${I18N.t('ui.shipAddedToFleet')}</div>`;
      // 사용자 요청 (2026-06-06): 제작 알림에도 함선 등급 prefix
      const _nbTier=I18N.tier(newShip.tier||def.tier||'소형');
      const _nbNm=`[${_nbTier}] ${shipDisplayNm(newShip)||newShip.nm}`;
      const _defNm=`[${_nbTier}] ${shipDisplayNm(def)||def.nm}`;
      notify(I18N.t('notify.shipBuilt',{nm:_nbNm,label:q.label}),'gold');
      baekgu(mult>=1.1?I18N.t('baekgu.shipCraftJackpot',{label:q.label}):I18N.t('baekgu.shipCraftDone',{nm:_defNm,label:q.label}));
    }

    // 제작 완료 팝업 — 해당 파츠/함선 이미지 표시 (사용자 요청)
    let _cImg='',_cFb='⚗️';
    if(rec.type==='part'){
      _cImg=(typeof partImgSrc==='function')?partImgSrc(rec.id):'img/parts/'+rec.id+'.png';
      const _pp=PARTS.find(x=>x.id===rec.id);
      _cFb=_pp&&_pp.cat==='weapon'?'⚔️':_pp&&_pp.cat==='shield'?'🛡️':_pp&&_pp.cat==='armor'?'🛡':_pp&&_pp.cat==='engine'?'⚡':'⚙️';
    } else if(rec.type==='ship'){
      const _sd=SHIP_CATALOG.find(x=>x.id===rec.id);
      _cImg=(typeof shipImgSrc==='function')?shipImgSrc({id:rec.id,catalogId:rec.id,tier:_sd?_sd.tier:'대형'}):'img/ships/'+rec.id+'.png';
      _cFb='🚀';
    } else if(rec.type==='cargo'){_cImg='img/parts/'+rec.id+'.png'+((typeof window!=='undefined'&&window._GAME_VER)?('?v='+encodeURIComponent(window._GAME_VER)):'');_cFb='📦';}
    const _cImgHtml=_cImg
      ? imgOrEmoji(_cImg,_cFb,128,128,'border-radius:12px;background:rgba(0,0,0,.45);border:1px solid '+(q.col||'#ffd700')+'66;object-fit:contain',rec.type==='ship'?'ship_'+rec.id:'part_'+rec.id)
      : '<div style="font-size:60px">'+_cFb+'</div>';
    // 사용자 요청: 모달 대신 우측 토스트 — 3초 자동 사라짐 + 모달 차단 없음으로 연속 제작 가능
    _showCraftResultToast(`<div style="text-align:center">
      <div style="font-size:12px;color:var(--gold);font-weight:bold;letter-spacing:2px;margin-bottom:6px">${I18N.t('modal.craftComplete')}</div>
      <div style="display:flex;justify-content:center;margin-bottom:8px">${_cImgHtml}</div>
      ${resultHtml}
      ${mult>=1.1?`<div style="margin-top:8px;padding:4px 10px;background:rgba(255,136,0,.1);border:1px solid #ff8800;border-radius:6px;font-size:12px;color:#ff8800">${I18N.t('craft.luckMasterpiece')}</div>`:''}
      ${mult<1.0?`<div style="margin-top:8px;font-size:11px;color:var(--dim)">${I18N.t('ui.retryForBetterQuality')}</div>`:''}
    </div>`,q.col||'#ffd700');
    // 저장 및 탭 재렌더는 즉시 — 모달 닫기 대기 없음
    saveGame(true);
    try{if(typeof rerenderTab==='function'&&typeof renderCraftTab==='function')rerenderTab(renderCraftTab);}catch(e){}
  })();
}

// 제작 결과 우측 토스트 — 3초 후 자동 사라짐, 연속 제작 가능. 여러 개 stack 가능.
//   · 사용자 요청: 최신 제작 결과가 항상 상단에 표시되고, 이전 카드는 아래로 밀려나도록 처리 (prepend)
function _showCraftResultToast(innerHTML,color){
  try{
    let host=document.getElementById('craft-result-toast-host');
    if(!host){
      host=document.createElement('div');
      host.id='craft-result-toast-host';
      host.style.cssText='position:fixed;top:60px;right:14px;z-index:9999;display:flex;flex-direction:column;gap:10px;pointer-events:none;max-width:340px';
      document.body.appendChild(host);
    }
    const card=document.createElement('div');
    card.style.cssText=`background:rgba(8,12,24,.94);border:2px solid ${color||'#ffd700'};border-radius:12px;padding:14px 16px;box-shadow:0 4px 22px rgba(0,0,0,.55), 0 0 18px ${color||'#ffd700'}44;opacity:0;transform:translateX(40px);transition:opacity .35s ease, transform .35s ease, margin-top .3s ease;backdrop-filter:blur(6px);pointer-events:auto;color:var(--txt);font-size:13px;line-height:1.45`;
    card.innerHTML=innerHTML;
    // 사용자 요청: 최신 카드를 상단에 — prepend로 추가, 기존 카드는 아래로 밀려남
    if(host.firstChild)host.insertBefore(card,host.firstChild);
    else host.appendChild(card);
    // 진입 애니메이션
    requestAnimationFrame(()=>{card.style.opacity='1';card.style.transform='translateX(0)';});
    // 호스트 최대 6개로 제한 — 그 이상은 가장 오래된 카드(맨 아래) 제거
    while(host.children.length>6)host.removeChild(host.lastChild);
    // 3초 후 fade-out → 0.4초 후 DOM 제거
    setTimeout(()=>{
      card.style.opacity='0';card.style.transform='translateX(40px)';
      setTimeout(()=>{try{card.remove();}catch(e){}},420);
    },3000);
  }catch(e){console.warn('[craft toast]',e);}
}
try{if(typeof window!=='undefined')window._showCraftResultToast=_showCraftResultToast;}catch(e){}
// 제작 카운트다운 — 화면 가운데 3·2·1 큰 숫자 (사용자 요청)
function _showCraftCountdown(totalMs){
  totalMs=totalMs||2000;
  const host=document.getElementById('game-stage')||document.body;
  const ov=document.createElement('div');
  ov.style.cssText='position:absolute;left:0;top:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:99950;font-family:Malgun Gothic,sans-serif';
  ov.innerHTML='<div id="_craftCnt" style="font-size:160px;font-weight:bold;color:#ffd700;text-shadow:0 0 24px rgba(255,215,0,.8),0 6px 18px rgba(0,0,0,.7);transition:transform .15s ease, opacity .15s ease;transform:scale(.6);opacity:0">3</div>';
  host.appendChild(ov);
  const el=ov.querySelector('#_craftCnt');
  const _per=Math.floor(totalMs/3);
  const _seq=['3','2','1'];
  let _i=0;
  const _tick=()=>{
    if(_i>=_seq.length){try{ov.remove();}catch(e){}return;}
    el.textContent=_seq[_i];
    el.style.transform='scale(.6)';el.style.opacity='0';
    requestAnimationFrame(()=>{
      el.style.transform='scale(1)';el.style.opacity='1';
    });
    setTimeout(()=>{
      el.style.transform='scale(1.4)';el.style.opacity='0';
    },_per-100);
    _i++;
    setTimeout(_tick,_per);
  };
  _tick();
}
try{if(typeof window!=='undefined')window._showCraftCountdown=_showCraftCountdown;}catch(e){}

function renderCraftTab(body){
  const pd=PLANET_DEF.find(p=>p.id===G.currentPlanet);
  if(!G.materials)G.materials={};
  if(!G.blueprints)G.blueprints={};
  // 창고 확장(전설 SC04·신화 SC05) 설계도는 산업 도면으로 기본 보유 처리 →
  // 제작 잠금은 희귀 재료(R0x) 보유량으로만 게이트 (행성 설계도 드롭 불필요)
  ['SC04','SC05'].forEach(id=>{if(!G.blueprints[id])G.blueprints[id]=true;});

  const MAT_INFO=COMMODITIES.filter(c=>c.material);
  const ALL_RECS=CRAFT_RECIPES;
  const selRec=G._craftSelected?ALL_RECS.find(r=>r.id===G._craftSelected):null;

  // ── 재료 슬롯 선택 모달 ──────────────────────────────────────────────
  // craftSlots: G._craftSlots = [{matId, qty}] 최대 12슬롯 (4행×3열)
  if(!G._craftSlots||G._craftSlots.length!==4)G._craftSlots=Array(4).fill(null);

  // ── 설계도 카드 (좌측 패널용) ─────────────────────────────────────────
  function bpCard(rec){
    const hasBp=G.blueprints[rec.id];
    const sel=G._craftSelected===rec.id;
    const tierCol=rec.tier==='flagship'?'#ff8800':rec.tier==='mythic'?'#cc66ff':rec.tier==='legend'?'#d4af37':'var(--cyan)';
    const matTip=rec.mats.map(m=>{const c=COMMODITIES.find(x=>x.id===m.id);return`${c?.ic||'💎'}${(c?commDisplayNm(c):'')||m.id}×${m.qty}`;}).join('  ');
    return`<div
      onclick="selectCraftRecipe('${rec.id}')"
      class="bp-card"
      data-tip="${matTip}"
      style="
        display:flex;align-items:center;gap:7px;padding:7px 9px;margin-bottom:4px;
        background:${sel?'rgba(212,175,55,.15)':hasBp?'rgba(255,255,255,.04)':'rgba(0,0,0,.25)'};
        border:1px solid ${sel?tierCol:hasBp?tierCol+'66':'rgba(255,255,255,.08)'};
        border-radius:8px;cursor:pointer;transition:all .15s;position:relative;
        opacity:${hasBp?'1':'0.38'};
        ${!hasBp?'filter:grayscale(0.6)':''}
      "
      onmouseover="showBpTip(this)" onmouseout="hideBpTip()"
    >
      ${hasBp
        ? `<img src="${rec.type==='ship'?'img/ui/BP01.png':'img/ui/BP02.png'}${window._GAME_VER?'?v='+window._GAME_VER:''}" alt="BP" style="width:24px;height:24px;object-fit:contain;flex-shrink:0;filter:drop-shadow(0 0 4px rgba(0,243,255,.5))" onerror="this.outerHTML='<span style=&quot;font-size:19px&quot;>📜</span>'">`
        : `<span style="font-size:19px">🔒</span>`}
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:bold;color:${hasBp?tierCol:'var(--muted)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${(rec.type==='ship'?(shipDisplayNm(SHIP_CATALOG.find(s=>s.id===rec.id))||rec.nm):(partDisplayNm(PARTS.find(p=>p.id===rec.id)||SPECIAL_CARGO_PARTS.find(c=>c.id===rec.id)||{})||rec.nm))}</div>
        <div style="font-size:10px;color:var(--dim);margin-top:1px">${I18N.t('ui.matKinds',{n:rec.mats.length})}</div>
      </div>
      ${sel?`<span style="color:${tierCol};font-size:13px">▶</span>`:''}
    </div>`;
  }

  const legendParts=ALL_RECS.filter(r=>r.type==='part'&&r.tier==='legend');
  const mythicParts=ALL_RECS.filter(r=>r.type==='part'&&r.tier==='mythic');
  const legendShips=ALL_RECS.filter(r=>r.type==='ship'&&r.tier==='legend');
  const mythicShips=ALL_RECS.filter(r=>r.type==='ship'&&r.tier==='mythic');
  const flagships  =ALL_RECS.filter(r=>r.type==='ship'&&r.tier==='flagship');
  const legendCargo=ALL_RECS.filter(r=>r.type==='cargo'&&r.tier==='legend');
  const mythicCargo=ALL_RECS.filter(r=>r.type==='cargo'&&r.tier==='mythic');

  // ── 재료 격자 (4행×3열 = 12슬롯) ─────────────────────────────────────
  // 보유 재료 목록 (수량 > 0)
  const ownedMats=MAT_INFO.filter(m=>(G.materials[m.id]||0)>0);
  // 슬롯에 필요량 강조
  function slotNeeded(matId){
    if(!selRec)return 0;
    return (selRec.mats.find(x=>x.id===matId)||{qty:0}).qty;
  }
  // 재료 슬롯: 4칸 중앙 정렬, 이미지 96×96 (1.5배 확대)
  const matGridHtml=`<div id="craftMatGrid" style="
    display:flex;justify-content:center;gap:16px;
    padding:16px;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.08);
    border-radius:10px;transition:filter .3s
  ">${Array(4).fill(0).map((_,i)=>{
    const slotData=G._craftSlots[i];
    const mat=slotData?MAT_INFO.find(m=>m.id===slotData.matId):null;
    const have=mat?(G.materials[mat.id]||0):0;
    const needed=mat?slotNeeded(mat.id):0;
    const ok=mat&&needed>0&&have>=needed;
    const partial=mat&&needed>0&&have>0&&have<needed;
    const hasItem=!!mat;
    const matImgSrc=mat?commImgSrc(mat.id):'';
    return`<div onclick="openCraftSlot(${i})" ${mat?'data-matid="'+mat.id+'"':''} onmouseover="showMatSlotTip(this,event)" onmouseout="hideMatSlotTip()" style="
      width:150px;height:165px;display:flex;flex-direction:column;align-items:center;justify-content:center;
      background:${hasItem?'rgba(255,255,255,.07)':'rgba(255,255,255,.02)'};
      border:2px ${hasItem?'solid':'dashed'} ${ok?'var(--cyan)':partial?'#ffd700':hasItem?'rgba(255,255,255,.25)':'rgba(255,255,255,.1)'};
      border-radius:12px;cursor:pointer;padding:8px;position:relative;transition:all .2s
    " onmouseover="this.style.borderColor='var(--cyan)'" onmouseout="this.style.borderColor='${ok?'var(--cyan)':partial?'#ffd700':hasItem?'rgba(255,255,255,.25)':'rgba(255,255,255,.1)'}'">\n      ${hasItem?`
        ${imgOrEmoji(matImgSrc,mat.ic||'💎',96,96,'border-radius:8px;margin-bottom:6px',mat?'mat_'+mat.id:'')}
        <div style="font-size:13px;color:var(--txt);text-align:center;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:1.3;font-weight:bold">${commDisplayNm(mat)}</div>
        <div style="font-size:15px;font-weight:bold;color:${ok?'var(--cyan)':partial?'#ffd700':'var(--red)'};margin-top:2px">${have}${needed>0?'/'+needed:''}</div>
        <div style="position:absolute;top:4px;right:7px;font-size:14px;color:var(--dim);cursor:pointer" onclick="event.stopPropagation();removeCraftSlot(${i})">✕</div>
      `:`<div style="font-size:48px;color:rgba(255,255,255,.15)">+</div>`}
    </div>`;
  }).join('')}</div>`;

  // ── 제작 버튼 영역 ─────────────────────────────────────────────────────
  let canCraft=false,craftBtnTxt=I18N.t('craft.selectRecipe'),craftBtnDis=true;
  if(selRec){
    const hasBp=G.blueprints[selRec.id];
    const _recTierDisc=['legend','mythic','flagship'].includes(selRec.tier);
    const matOk=selRec.mats.every(m=>(G.materials[m.id]||0)>=(_recTierDisc?Math.max(1,Math.floor(m.qty/2)):m.qty));
    const heroOk=!selRec.heroReq||(G.heroes&&G.heroes.includes(selRec.heroReq));
    if(!hasBp){craftBtnTxt=I18N.t('craft.lockNoBp');}
    else if(!heroOk){const _hKey='hero.'+selRec.heroReq+'.nm';const _heroNm=(I18N&&I18N.has&&I18N.has(_hKey))?I18N.t(_hKey):(HEROES[selRec.heroReq]?.nm||selRec.heroReq);craftBtnTxt=I18N.t('ui.heroRequired',{nm:_heroNm});}
    else if(!matOk){craftBtnTxt=I18N.t('craft.lockNoMat');}
    else{const _selDisp=selRec.type==='ship'?(shipDisplayNm(SHIP_CATALOG.find(s=>s.id===selRec.id))||selRec.nm):(partDisplayNm(PARTS.find(p=>p.id===selRec.id)||SPECIAL_CARGO_PARTS.find(c=>c.id===selRec.id)||{})||selRec.nm);canCraft=true;craftBtnTxt=I18N.t('craft.craftRec',{nm:_selDisp});craftBtnDis=false;}
  }

  // 선택된 레시피 재료 상태 요약
  let matStatusHtml='';
  if(selRec){
    const hasBp=G.blueprints[selRec.id];
    const tierCol=selRec.tier==='flagship'?'#ff8800':selRec.tier==='mythic'?'#cc66ff':selRec.tier==='legend'?'#d4af37':'var(--cyan)';
    matStatusHtml=`<div style="background:rgba(0,0,0,.3);border:1px solid ${tierCol}44;border-radius:8px;padding:6px 10px;margin-bottom:8px">
      <div style="font-size:13px;font-weight:bold;color:${tierCol};margin-bottom:5px">${I18N.t('ui.bpRecipe',{nm:(selRec.type==='ship'?(shipDisplayNm(SHIP_CATALOG.find(s=>s.id===selRec.id))||selRec.nm):(partDisplayNm(PARTS.find(p=>p.id===selRec.id)||SPECIAL_CARGO_PARTS.find(c=>c.id===selRec.id)||{})||selRec.nm))})}</div>
      <div style="display:flex;flex-wrap:wrap;gap:5px">
        ${selRec.mats.map(m=>{
          const c=COMMODITIES.find(x=>x.id===m.id);
          const have=G.materials[m.id]||0;
          const _tdDisc=['legend','mythic','flagship'].includes(selRec.tier);
          const _needShow=_tdDisc?Math.max(1,Math.floor(m.qty/2)):m.qty;
          const ok=have>=_needShow;
          const hasMP=G.heroes&&G.heroes.includes('H08');
          const fac=c?.f||null;
          const allPl=fac?PLANET_DEF.filter(p=>p.f===fac):[];
          const expPl=allPl.filter(p=>G.planets[p.id]?.fog==='A').map(p=>p.nm);
          const allPn=allPl.map(p=>p.nm);
          let plHtml='';
          if(hasMP){
            plHtml=expPl.length>0
              ?`<div style="font-size:9px;color:#7df;margin-top:1px">🧭 ${expPl.slice(0,3).join(', ')}${expPl.length>3?'…':''}</div>`
              :`<div style="font-size:9px;color:var(--dim);margin-top:1px">${I18N.t('ui.noPlanetsDiscovered')}</div>`;
          } else if(allPn.length>0){
            plHtml=`<div style="font-size:9px;color:var(--dim);margin-top:1px">📍 ${allPn.slice(0,2).join(', ')}${allPn.length>2?'…':''}</div>`;
          }
          return`<div style="display:flex;flex-direction:column;align-items:flex-start;gap:1px;padding:3px 7px;background:${ok?'rgba(0,243,255,.1)':'rgba(255,60,60,.1)'};border:1px solid ${ok?'rgba(0,243,255,.3)':'rgba(255,60,60,.3)'};border-radius:5px">
            <div style="display:flex;align-items:center;gap:4px;font-size:11px">
              <img src="${commImgSrc(m.id)}" alt="" style="width:22px;height:22px;border-radius:4px;object-fit:contain;background:rgba(0,0,0,.3)" onerror="this.outerHTML='<span>${c?.ic||'💎'}</span>'">
              <span style="color:var(--dim)">${(c?commDisplayNm(c):'')||m.id}</span>
              <span style="font-weight:bold;color:${ok?'var(--cyan)':'var(--red)'}">${have}/${_needShow}${_tdDisc?'<span style=\"color:#d4af37;font-size:9px\">(50%↓)</span>':''}</span>
            </div>
            ${plHtml}
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }

  body.innerHTML=`
  <!-- 재료 툴팁 팝업 -->
  <div id="bp-tip" style="position:fixed;z-index:999;background:rgba(5,12,26,.97);border:1px solid var(--cyan);border-radius:8px;padding:8px 12px;font-size:12px;color:var(--txt);pointer-events:none;display:none;max-width:220px;line-height:1.7;white-space:pre-wrap"></div>
  <div style="display:flex;flex-direction:column;height:100%;overflow:hidden">
  <div style="padding:4px 10px;flex-shrink:0;background:rgba(0,243,255,.05);border-bottom:1px solid rgba(0,243,255,.15);display:flex;align-items:center;gap:8px"><span style="font-size:15px">⚗️</span><span style="color:var(--cyan);font-size:13px;font-weight:bold">${I18N.t('ui.shipWorkshop')}</span>${pd?'<span style="font-size:11px;color:var(--dim)">— '+pd.nm+'</span>':''}</div>
  <div style="display:flex;flex:1;overflow:hidden">

    <!-- ◀ 좌측: 설계도 목록 (240px 고정) -->
    <div data-scroll-id="craft-bpl" style="width:260px;flex-shrink:0;overflow-y:auto;border-right:1px solid rgba(0,243,255,.12);padding:10px 12px;display:flex;flex-direction:column;gap:0">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px"><img src="img/ui/BP02.png${window._GAME_VER?'?v='+window._GAME_VER:''}" alt="BP" style="width:20px;height:20px;object-fit:contain;filter:drop-shadow(0 0 4px rgba(0,243,255,.5))" onerror="this.style.display='none'"><div style="font-size:13px;font-weight:bold;color:var(--cyan);letter-spacing:.5px">${I18N.t('ui.blueprintListHeader')}</div></div>
      <div style="font-size:10px;color:var(--dim);margin-bottom:8px;line-height:1.5">${I18N.t('ui.acquiredBpHighlighted')}<br>${I18N.t('ui.hoverForMaterials')}</div>

      <div style="font-size:10px;color:#d4af37;margin:2px 0 4px;font-weight:bold;letter-spacing:.5px">${I18N.t('ui.legendPartsBadge')}</div>
      ${legendParts.map(bpCard).join('')}

      <div style="font-size:10px;color:#cc66ff;margin:8px 0 4px;font-weight:bold;letter-spacing:.5px">${I18N.t('ui.mythicPartsBadge')}</div>
      ${mythicParts.map(bpCard).join('')}

      <div style="font-size:10px;color:#d4af37;margin:8px 0 4px;font-weight:bold;letter-spacing:.5px">${I18N.t('ui.legendShipsBadge')}</div>
      ${legendShips.map(bpCard).join('')}

      <div style="font-size:10px;color:#cc66ff;margin:8px 0 4px;font-weight:bold;letter-spacing:.5px">${I18N.t('ui.mythicShipsBadge')}</div>
      ${mythicShips.map(bpCard).join('')}

      ${legendCargo.length>0?`<div style="font-size:10px;color:#d4af37;margin:8px 0 4px;font-weight:bold;letter-spacing:.5px">${I18N.t('ui.legendCargoBadge')}</div>
      ${legendCargo.map(bpCard).join('')}`:''}

      ${mythicCargo.length>0?`<div style="font-size:10px;color:#cc66ff;margin:8px 0 4px;font-weight:bold;letter-spacing:.5px">${I18N.t('ui.mythicCargoBadge')}</div>
      ${mythicCargo.map(bpCard).join('')}`:''}

      <div style="margin-top:auto;padding-top:12px;font-size:11px;color:var(--dim);line-height:1.6">
        ${I18N.t('ui.bpDropHint1')}<br>${I18N.t('ui.bpDropHint2')}<br>
        ${I18N.t('ui.bpDropHint3')}
      </div>
    </div>

    <!-- ◆ 중앙: 선택 설계도 상세 (이미지+정보+스토리) — 설계도 목록 바로 우측 칸 -->
    <div data-scroll-id="craft-detail" style="width:300px;flex-shrink:0;overflow-y:auto;border-right:1px solid rgba(0,243,255,.12);padding:12px 14px">
      ${(()=>{
        if(!selRec)return `<div style="background:rgba(255,255,255,.03);border:1px dashed var(--bdr);border-radius:8px;padding:22px 12px;text-align:center;color:var(--dim);font-size:12px;margin-top:16px;line-height:1.8">⚗️<br><br>${I18N.t('ui.selectBpFromLeft')}<br>${I18N.t('ui.pleaseSelect')}</div>`;
        const _tierColor=selRec.tier==='mythic'?'#cc66ff':selRec.tier==='flagship'?'#ff8800':selRec.tier==='legend'?'#d4af37':'var(--cyan)';
        const _tierLabel=selRec.tier==='mythic'?I18N.t('tier.mythicShort'):selRec.tier==='flagship'?I18N.t('tier.flagshipShort'):selRec.tier==='legend'?I18N.t('tier.legendShort'):I18N.t('tier.normalShort');
        // 제작 대상 이미지 + 폴백 + 로어키
        let _pvImg='',_pvFb='⚗️',_loreKey=null;
        if(selRec.type==='part'){
          const _pp=(typeof PARTS!=='undefined'?PARTS:[]).find(x=>x.id===selRec.id);
          _pvImg=(typeof partImgSrc==='function')?partImgSrc(selRec.id):'img/parts/'+selRec.id+'.png';
          _pvFb=_pp&&_pp.cat==='weapon'?'⚔️':_pp&&_pp.cat==='shield'?'🛡️':_pp&&_pp.cat==='armor'?'🛡':_pp&&_pp.cat==='engine'?'⚡':'⚙️';
          _loreKey='part_'+selRec.id;
        } else if(selRec.type==='ship'){
          const _ss=(typeof SHIP_CATALOG!=='undefined'?SHIP_CATALOG:[]).find(x=>x.id===selRec.id);
          _pvImg=(typeof shipImgSrc==='function')?shipImgSrc({id:selRec.id,catalogId:selRec.id,tier:_ss?_ss.tier:'대형'}):'img/ships/'+selRec.id+'.png';
          _pvFb='🚀';_loreKey='ship_'+selRec.id;
        } else if(selRec.type==='cargo'){
          const _scp=(typeof SPECIAL_CARGO_PARTS!=='undefined'?SPECIAL_CARGO_PARTS:[]).find(c=>c.id===selRec.id);
          _pvImg='img/parts/'+selRec.id+'.png'+((typeof window!=='undefined'&&window._GAME_VER)?('?v='+encodeURIComponent(window._GAME_VER)):'');_pvFb=(_scp&&_scp.ic)||'📦';_loreKey='part_'+selRec.id;
        }
        const _imgHtml=_pvImg?imgOrEmoji(_pvImg,_pvFb,150,150,'border-radius:12px;background:rgba(0,0,0,.45);border:1px solid '+_tierColor+'66',_loreKey):'';
        // 스탯 행 빌더
        const _rowsHtml=(rows)=>rows.map(r=>`<div style="display:flex;justify-content:space-between;font-size:12px;padding:2px 0"><span style="color:var(--dim)">${r[0]}</span><span style="color:var(--cyan);font-weight:bold">${r[1]}</span></div>`).join('');
        let _statHtml='';
        if(selRec.type==='cargo'){
          const sc=(typeof SPECIAL_CARGO_PARTS!=='undefined'?SPECIAL_CARGO_PARTS:[]).find(c=>c.id===selRec.id);
          const bonus=sc?.cargoBonus||0;
          _statHtml=`<div style="font-size:12px;color:var(--txt);line-height:1.8">${I18N.t('ui.cargoBonus',{n:bonus})}<br><span style="font-size:11px;color:var(--dim)">${I18N.t('ui.cargoBonusHint')}</span></div>`;
        } else if(selRec.type==='part'){
          const p=(typeof PARTS!=='undefined'?PARTS:[]).find(x=>x.id===selRec.id);
          if(p){
            const rows=[];
            if(p.cat==='weapon')rows.push([I18N.t('ui.sortByAtt'),'+'+p.ATT+(p.wtype?' ['+p.wtype+']':'')]);
            if(p.cat==='shield'){rows.push([I18N.t('partStat.shieldInt'),'+'+p.INT]);if(p.maxSH)rows.push([I18N.t('partStat.maxSH'),'+'+p.maxSH]);}
            if(p.cat==='armor'){if(p.HP)rows.push([I18N.t('partStat.armorHP'),'+'+p.HP]);if(p.DEF)rows.push([I18N.t('partStat.def'),'+'+p.DEF]);}
            if(p.cat==='engine')rows.push([I18N.t('partStat.engTec'),'+'+p.TEC]);
            rows.push([I18N.t('partStat.tier'),String(p.tier||'?')]);
            _statHtml=_rowsHtml(rows);
          }
        } else if(selRec.type==='ship'){
          const sd=(typeof SHIP_CATALOG!=='undefined'?SHIP_CATALOG:[]).find(x=>x.id===selRec.id);
          if(sd)_statHtml=_rowsHtml([[I18N.t('shipStat.tier'),I18N.tier(sd.tier)],[I18N.t('shipStat.hp'),(sd.maxHP||0).toLocaleString()],[I18N.t('shipStat.sh'),(sd.maxSH||0).toLocaleString()],[I18N.t('shipStat.att'),String(sd.ATT||0)],[I18N.t('shipStat.int'),String(sd.INT||0)],[I18N.t('shipStat.tec'),String(sd.TEC||0)]]);
        }
        const _heroReqHtml=selRec.heroReq?(()=>{const _hKey='hero.'+selRec.heroReq+'.nm';const _hNm=(I18N&&I18N.has&&I18N.has(_hKey))?I18N.t(_hKey):(HEROES[selRec.heroReq]?.nm||selRec.heroReq);return `<div style="font-size:11px;color:var(--purple);margin-top:6px">${I18N.t('ui.heroRecruitNeeded',{nm:_hNm})}</div>`;})():'';
        // 스토리/설명 — 스탯 아래에 노출 (사용자 요청)
        const _lore=(_loreKey&&typeof LORE_TEXT!=='undefined'&&LORE_TEXT[_loreKey])||'';
        const _storyHtml=_lore?`<div style="margin-top:10px;border-top:1px solid ${_tierColor}33;padding-top:8px">
          <div style="font-size:11px;color:${_tierColor};font-weight:bold;margin-bottom:4px;letter-spacing:.5px">${I18N.t('ui.bpStoryHeader')}</div>
          <div style="font-size:11px;color:var(--txt);line-height:1.7;white-space:pre-wrap;word-break:keep-all">${_lore}</div>
        </div>`:`<div style="margin-top:10px;font-size:11px;color:var(--dim)">${I18N.t('ui.noDescriptionInfo')}</div>`;
        return `
          <!-- 제작 버튼 (파츠/함선 이미지 위쪽) -->
          <div style="text-align:center;margin-bottom:10px">
            <button class="btn btn-gold" id="craftBtn" onclick="doCraft('${selRec.id||''}')"
              ${craftBtnDis?'disabled':''} style="font-size:13px;padding:8px 16px;letter-spacing:.5px;font-weight:bold;width:100%">
              ${craftBtnTxt}
            </button>
            <div style="font-size:9px;color:var(--dim);margin-top:4px;line-height:1.5">${I18N.t('ui.craftQualityRates')}</div>
            ${selRec.type==='ship'?(()=>{const _b=_shipCraftSuperiorBonus();const _cnt=(G&&G.craftCount)||0;return `<div style="font-size:10px;color:${_b>0?'var(--gold)':'var(--dim)'};margin-top:3px;line-height:1.5">${I18N.t('craft.superiorBonusLine',{cnt:_cnt,pct:(_b*100).toFixed(1)})}</div>`;})():''}
          </div>
          <div style="text-align:center;margin-bottom:10px">${_imgHtml}</div>
          <div style="text-align:center;margin-bottom:8px">
            <div style="font-size:11px;color:${_tierColor};font-weight:bold;letter-spacing:1px">${_tierLabel}</div>
            <div style="font-size:16px;font-weight:bold;color:var(--txt);margin-top:2px">${(selRec&&selRec.type==='ship'?(shipDisplayNm(SHIP_CATALOG.find(s=>s.id===selRec.id))||selRec.nm):(selRec&&(selRec.type==='part'||selRec.type==='cargo')?(partDisplayNm(PARTS.find(p=>p.id===selRec.id)||SPECIAL_CARGO_PARTS.find(c=>c.id===selRec.id)||{})||selRec.nm):selRec.nm))}</div>
          </div>
          <div style="background:rgba(0,0,0,.25);border:1px solid ${_tierColor}44;border-radius:8px;padding:8px 12px">
            <div style="font-size:11px;color:${_tierColor};font-weight:bold;margin-bottom:4px;letter-spacing:.5px">${I18N.t('ui.bpStatsHeader')}</div>
            ${_statHtml||I18N.t('ui.noStatInfo')}
            ${_heroReqHtml}
          </div>
          ${_storyHtml}
        `;
      })()}
    </div>

    <!-- ▶ 우측: 재료 그리드 -->
    <div data-scroll-id="craft-right" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;padding:12px 14px">

      <div style="font-size:14px;font-weight:bold;color:var(--cyan);margin-bottom:2px">${I18N.t('ui.shipFactoryTitle')}</div>
      <div style="font-size:12px;color:var(--dim);margin-bottom:8px">${I18N.t('ui.craftFlowHint')}</div>

      <!-- 재료 상태 -->
      ${matStatusHtml}

      <!-- 재료 그리드 (12슬롯 4행×3열) -->
      <div style="font-size:11px;color:var(--dim);margin-bottom:4px">${I18N.t('ui.matSlotsHint')}</div>
      ${matGridHtml}

      <!-- 보유 재료 요약 -->
      <div style="margin-top:8px;font-size:13px;color:var(--dim);display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <span>${I18N.t('ui.heldMaterials')}</span>
        ${ownedMats.length>0?ownedMats.map(m=>`<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;background:rgba(255,255,255,.04);border-radius:5px"><img src="${commImgSrc(m.id)}" alt="" style="width:22px;height:22px;border-radius:4px;vertical-align:middle;object-fit:contain" onerror="this.outerHTML='${m.ic||'💎'}'"><span style="color:var(--txt);font-size:12px">${commDisplayNm(m)}</span><span style="color:var(--cyan);font-size:12px;font-weight:bold">×${G.materials[m.id]}</span></span>`).join(''):I18N.t('craft.noneBuyAtShop')}
      </div>

    </div>

  </div></div>`;
}

// 설계도 툴팁 표시
function showMatSlotTip(el,ev){
  const matId=el.getAttribute('data-matid');
  if(!matId)return;
  const c=COMMODITIES.find(x=>x.id===matId);
  if(!c)return;
  const fac=c.f||null;
  const tip=document.getElementById('bp-tip');
  if(!tip)return;
  let lines=[`${c.ic||'💎'} ${commDisplayNm(c)}`];
  if(fac){
    const allPl=PLANET_DEF.filter(p=>p.f===fac);
    const _allHeroIds=Object.keys(HEROES);
    const _hasAllHeroes=_allHeroIds.every(h=>(G.heroes||[]).includes(h));
    const explored=allPl.filter(p=>G.planets[p.id]?.fog==='A');
    if(_hasAllHeroes){
      lines.push(explored.length>0?I18N.t('ui.availableTargetsTitle')+'\n  '+explored.map(p=>p.nm).join('\n  '):'🧭 발견된 행성 없음');
    } else {
      lines.push(I18N.t('craft.factionLine',{fac}));
      if(allPl.length>0) lines.push(`  (${allPl.slice(0,3).map(p=>p.nm).join(', ')}${allPl.length>3?'…':''})`);
      lines.push(I18N.t('craft.heroLocReveal'));
    }
  }
  lines.push(I18N.t('ui.materialOwned',{n:G.materials[matId]||0}));
  if(c.buy>0) lines.push(I18N.t('ui.buyPriceCR',{p:c.buy.toLocaleString()}));
  tip.textContent=lines.join('\n');
  tip.style.display='block';
  // 스테이지 transform:scale 보정
  const stage=document.getElementById('game-stage');
  const sr=stage?stage.getBoundingClientRect():{left:0,top:0};
  const s=window._gsScale||1;
  const sx=(ev.clientX-sr.left)/s, sy=(ev.clientY-sr.top)/s;
  const mw=(typeof STAGE_W!=='undefined'?STAGE_W:window.innerWidth);
  const x=Math.min(sx+12,mw-240);
  const y=Math.max(sy-10,4);
  tip.style.left=x+'px';
  tip.style.top=y+'px';
}
function hideMatSlotTip(){
  const tip=document.getElementById('bp-tip');
  if(tip)tip.style.display='none';
}
function showBpTip(el){
  const tip=document.getElementById('bp-tip');if(!tip)return;
  const txt=el.getAttribute('data-tip');
  if(!txt)return;
  tip.textContent=I18N.t('craft.matsRequired')+txt.replace(/\s{2,}/g,'\n');
  tip.style.display='block';
  const r=el.getBoundingClientRect();
  tip.style.left=(r.right+6)+'px';
  tip.style.top=Math.max(10,r.top-10)+'px';
}
function hideBpTip(){const t=document.getElementById('bp-tip');if(t)t.style.display='none';}

// 슬롯 클릭 → 재료 선택 모달
function openCraftSlot(idx){
  if(!G._craftSlots)G._craftSlots=Array(4).fill(null);
  const MAT_INFO=COMMODITIES.filter(c=>c.material);
  const ownedMats=MAT_INFO.filter(m=>(G.materials[m.id]||0)>0);
  const selRec=G._craftSelected?CRAFT_RECIPES.find(r=>r.id===G._craftSelected):null;
  // 추천 재료 (선택된 레시피 재료 우선 표시)
  const recommended=selRec?selRec.mats.map(m=>m.id):[];
  const sortedMats=[
    ...MAT_INFO.filter(m=>recommended.includes(m.id)),
    ...MAT_INFO.filter(m=>!recommended.includes(m.id))
  ];
  const rowsHtml=sortedMats.map(m=>{
    const have=G.materials[m.id]||0;
    const needed=selRec?(selRec.mats.find(x=>x.id===m.id)||{qty:0}).qty:0;
    const isRec=recommended.includes(m.id);
    return`<div onclick="setCraftSlot(${idx},'${m.id}')" style="
      display:flex;align-items:center;gap:10px;padding:8px 12px;margin-bottom:4px;
      background:${isRec?'rgba(212,175,55,.08)':'var(--card)'};
      border:1px solid ${isRec?'rgba(212,175,55,.35)':'var(--bdr)'};border-radius:7px;cursor:pointer;
      ${have===0?'opacity:.45':''}
    " onmouseover="this.style.borderColor='var(--cyan)'" onmouseout="this.style.borderColor='${isRec?'rgba(212,175,55,.35)':'var(--bdr)'}'">
      ${imgOrEmoji(commImgSrc(m.id),m.ic||'💎',40,40,'border-radius:6px;background:rgba(0,0,0,.3);flex-shrink:0')}
      <div style="flex:1">
        <div style="font-size:14px;color:var(--txt)">${commDisplayNm(m)}${isRec?` <span style="font-size:11px;color:#d4af37">${I18N.t('ui.matsRequired')}</span>`:''}</div>
        <div style="font-size:12px;color:var(--dim)">${m.desc||''}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:14px;font-weight:bold;color:${have>0?'var(--cyan)':'var(--dim)'}">${I18N.t('ui.bpHaveQty',{n:have})}</div>
        ${needed>0?`<div style="font-size:11px;color:${have>=needed?'var(--green)':'var(--red)'}">${I18N.t('ui.neededN',{n:needed})}</div>`:''}
      </div>
    </div>`;
  }).join('');
  openModal(I18N.t('modal.selectMaterial'),
    `<div style="max-height:400px;overflow-y:auto;padding-right:4px">${rowsHtml}</div>
     <div style="margin-top:8px;font-size:12px;color:var(--dim)">${I18N.t('ui.bpMatTip')}</div>`,
    [{txt:I18N.t('btn.cancel'),fn:closeModal,cls:'btn-sm'}]
  );
}
function setCraftSlot(idx,matId){
  if(!G._craftSlots)G._craftSlots=Array(4).fill(null);
  G._craftSlots[idx]={matId};
  closeModal();rerenderTab(renderCraftTab);
}
function removeCraftSlot(idx){
  if(!G._craftSlots)G._craftSlots=Array(4).fill(null);
  G._craftSlots[idx]=null;
  rerenderTab(renderCraftTab);
}

// window 전역 노출
window.notifyBlueprint=notifyBlueprint;
window.selectCraftRecipe=selectCraftRecipe;
window.selectCraftMat=selectCraftMat;
window.doCraft=doCraft;
window._showCraftResultToast=_showCraftResultToast;
window._showCraftCountdown=_showCraftCountdown;
window.renderCraftTab=renderCraftTab;
window.showMatSlotTip=showMatSlotTip;
window.hideMatSlotTip=hideMatSlotTip;
window.showBpTip=showBpTip;
window.hideBpTip=hideBpTip;
window.openCraftSlot=openCraftSlot;
window.setCraftSlot=setCraftSlot;
window.removeCraftSlot=removeCraftSlot;
console.log('[render-craft-tab] Loaded — 14 functions exposed');
})();
