// ═══════════════════════════════════════════════════════════════════
// DESTINATION EARTH — 매각 취소(되돌리기) 시스템 모듈
//   · game.js 에서 분할 (2026-06-13, 사용자 요청: 긴 코드 분할)
//   · 모든 최상위 선언 window.* 노출 · 내부 상태 let → window 속성 전환(onclick 호환)
// ═══════════════════════════════════════════════════════════════════
(function(){
if(typeof window==='undefined')return;
if(window._SELL_UNDO_LOADED)return;
window._SELL_UNDO_LOADED=true;

// ─── 매각 취소(되돌리기) 시스템 ──────────────────────────────────
// 사용자가 실수로 함선/파츠/화물을 매각했을 때 마지막 1건을 동일 금액으로 즉시 환원.
// window._lastSell에 저장 (세이브에 포함 안 됨, 60초 후 자동 만료)
// 호출 흐름: sellPart/sellShip/sellAllPartsBulk 등 → _recordSell → showUndoSellToast
function _recordSell(entry){
  if(!entry||!entry.credits)return;
  entry.ts=Date.now();
  window._lastSell=entry;
  // 기존 만료 타이머 정리
  if(window._undoSellExpireTimer){clearTimeout(window._undoSellExpireTimer);}
  window._undoSellExpireTimer=setTimeout(()=>{window._lastSell=null;_renderUndoSellToast();},60000);
  _renderUndoSellToast();
}
function _renderUndoSellToast(){
  let el=document.getElementById('undo-sell-toast');
  const ls=window._lastSell;
  if(!ls){if(el)el.remove();return;}
  if(!el){
    el=document.createElement('div');
    el.id='undo-sell-toast';
    el.style.cssText='position:fixed;bottom:88px;right:20px;z-index:5000;background:rgba(40,20,60,.92);border:1.5px solid var(--gold);border-radius:8px;padding:10px 14px;color:var(--yellow);font-size:13px;box-shadow:0 6px 22px rgba(0,0,0,.5);display:flex;align-items:center;gap:10px;backdrop-filter:blur(4px);animation:pulse 2.5s infinite';
    document.body.appendChild(el);
  }
  const _isBuy=ls.type==='buyCargoSnap';
  const _verb=_isBuy?I18N.t('ui.buy'):I18N.t('ui.sell');
  const _refund=_isBuy?I18N.t('sell.refund'):I18N.t('sell.return');
  el.innerHTML=`<span>${I18N.t('undo.justNow',{verb:_verb})}: <b style="color:#fff">${ls.label||''}</b></span>
    <button onclick="undoLastSell()" style="padding:5px 12px;border:1.5px solid var(--gold);background:rgba(255,215,0,.18);color:var(--gold);border-radius:5px;cursor:pointer;font-size:12px;font-weight:bold;letter-spacing:1px">${I18N.t('undo.cancelLine',{verb:_verb,cr:ls.credits.toLocaleString(),refund:_refund})}</button>
    <button onclick="window._lastSell=null;_renderUndoSellToast()" style="padding:3px 7px;border:1px solid rgba(255,255,255,.2);background:transparent;color:var(--dim);border-radius:4px;cursor:pointer;font-size:11px" title="${I18N.t('title.closeNotification')}">✕</button>`;
}
function undoLastSell(){
  const ls=window._lastSell;
  if(!ls){notify(I18N.t('notify.noTradesToUndo'),'warn');return;}
  // 매각 취소는 크레딧 차감 필요 — 구매 취소(buyCargoSnap)는 크레딧 환불이므로 사전 검사 불필요
  if(ls.type!=='buyCargoSnap'&&G.credits<ls.credits){
    notify(I18N.t('notify.needCreditsRefund',{cost:ls.credits.toLocaleString()}),'err');
    return;
  }
  try{
    if(ls.type==='part'){
      addToInventory(ls.partId);
      G.credits-=ls.credits;
      notify(I18N.t('notify.cancelSale',{label:ls.label,cr:ls.credits.toLocaleString()}),'ok');
    } else if(ls.type==='bulkPart'){
      (ls.parts||[]).forEach(p=>{for(let i=0;i<p.qty;i++)addToInventory(p.id);});
      G.credits-=ls.credits;
      notify(I18N.t('notify.cancelBulkPartsSale',{cr:ls.credits.toLocaleString()}),'ok');
    } else if(ls.type==='ship'){
      // 함선 복원: G.fleet에 다시 push (16척 한도 시 reserve로 자동)
      const _r=addShipToFleet(ls.ship);
      G.credits-=ls.credits;
      const _where=_r&&_r.added==='reserve'?I18N.t('sell.toReserve'):'';
      notify(I18N.t('notify.cancelSaleWhere',{label:ls.label,cr:ls.credits.toLocaleString(),where:_where}),'ok');
    } else if(ls.type==='cargoSnap'){
      // 화물 스냅샷 복원 (G.cargo 전체 깊은 복사 복원)
      G.cargo=JSON.parse(JSON.stringify(ls.cargoSnap));
      G.credits-=ls.credits;
      notify(I18N.t('notify.cancelSale',{label:ls.label,cr:ls.credits.toLocaleString()}),'ok');
    } else if(ls.type==='buyCargoSnap'){
      // 구매 취소: cargo·stock 원복 + 차감된 크레딧 환불
      G.cargo=JSON.parse(JSON.stringify(ls.cargoSnap));
      G.credits=(G.credits||0)+ls.credits;
      if(ls.planetId&&ls.stockKey&&G.shopStock[ls.planetId]){
        G.shopStock[ls.planetId][ls.stockKey]=(G.shopStock[ls.planetId][ls.stockKey]||0)+1;
      }
      notify(I18N.t('notify.cancelBuyRefund',{label:ls.label,cr:ls.credits.toLocaleString()}),'ok');
    } else {
      notify(I18N.t('notify.unknownSellKind'),'warn');return;
    }
    window._lastSell=null;
    if(window._undoSellExpireTimer){clearTimeout(window._undoSellExpireTimer);window._undoSellExpireTimer=null;}
    _renderUndoSellToast();
    updateHUD();
    // 현재 탭에 따라 적절한 화면 갱신 — garage/ship/trade/cargo 등 모두 커버
    try{
      const ct=G._currentHubTab;
      if(ct==='trade'&&typeof renderTradeTab==='function')rerenderTab(renderTradeTab);
      else if(ct==='cargo'&&typeof renderCargoOnlyTab==='function')rerenderTab(renderCargoOnlyTab);
      else if(ct==='garage'||ct==='ship'||ct==='craft')rerenderShipOrGarage();
      else rerenderShipOrGarage();  // 폴백
    }catch(e){}
    saveGame(true);
  }catch(e){
    console.error('undoLastSell failed',e);
    notify(I18N.t('notify.cancelSaleFail',{err:e.message}),'err');
  }
}
try{if(typeof window!=='undefined'){window.undoLastSell=undoLastSell;window._renderUndoSellToast=_renderUndoSellToast;}}catch(e){}

function sellPartFromInventory(partId){
  const p=PARTS.find(x=>x.id===partId);if(!p)return;
  const inv=G.inventory.find(i=>i.id===partId);
  if(!inv||inv.qty<=0){notify(I18N.t('notify.noOwnedParts'),'err');return;}
  const marcoMult=(G&&G.heroes&&G.heroes.includes('H08'))?1.20:1.0;
  const baseVal=Math.floor(p.price*0.5);
  const sellVal=Math.floor(baseVal*marcoMult);
  const marcoNote=marcoMult>1?' (🧭+10%)':'';
  openModal(I18N.t('modal.partsSale'),
    `<div style="text-align:center;padding:10px">
      <div style="font-size:34px;margin-bottom:6px">${{weapon:'⚔️',shield:'🛡️',armor:'🛡',engine:'⚡'}[p.cat]||'⚙️'}</div>
      <div style="font-size:18px;font-weight:bold;margin-bottom:8px">${partDisplayNm(p)}</div>
      <div style="font-size:16px;color:var(--gold)">${I18N.t('ui.sellPrice',{cr:sellVal.toLocaleString(),marco:marcoNote})}</div>
      <div style="font-size:12px;color:var(--dim);margin-top:4px">${I18N.t('ui.buy50Percent',{marco:marcoMult>1?' × 1.1':''})}</div>
    </div>`,
    [{txt:I18N.t('ui.sellVal',{p:sellVal.toLocaleString()}),fn:()=>{
      inv.qty--;if(inv.qty<=0)G.inventory.splice(G.inventory.indexOf(inv),1);
      G.credits+=sellVal;
      try{_recordSell({type:'part',partId:p.id,credits:sellVal,label:partDisplayNm(p)||p.nm});}catch(e){}
      updateHUD();notify(I18N.t('notify.partSold',{nm:partDisplayNm(p)||p.nm,cr:sellVal.toLocaleString()}),'gold');
      closeModal();rerenderShipOrGarage();saveGame(true);
    },cls:'btn-gold'},{txt:I18N.t('btn.cancel'),fn:closeModal,cls:'btn-sm'}]
  );
}
function switchShipTab(tab){_shipTab=tab;rerenderTab(renderShipTab);}
// 선발 편대가 16척 미만이면 임시창 최상단 함선을 자동으로 선발로 승급
// 함선이 G.fleet에서 제거되는 모든 경로 (판매·폐기·교체·격침 등)에서 호출
// 함선의 창고 확장 파츠 일괄 분리 → 인벤토리 반환 + cargoSlots 복원 (판매·교체 공용)
function _detachAllCargoExt(s){
  if(!s||!s.cargoExtParts||!s.cargoExtParts.length)return 0;
  const tierBase=({소형:5,중형:10,대형:20,전설기함:30,신화:40})[s.tier]||4;
  const parts=[...s.cargoExtParts];
  s.cargoExtParts=[];
  let detached=0;
  parts.forEach(pid=>{
    const sc=(typeof SPECIAL_CARGO_PARTS!=='undefined'?SPECIAL_CARGO_PARTS:[]).find(c=>c.id===pid);
    if(sc){
      s.cargoSlots=Math.max(tierBase,(s.cargoSlots||tierBase)-(sc.cargoBonus||0));
      try{addToInventory(pid,1);}catch(e){}
      detached++;
    }
  });
  return detached;
}
function _promoteReserveIfRoom(){
  if(!G.reserveFleet||G.reserveFleet.length===0)return 0;
  const CAP=16;
  let promoted=0;
  while(G.fleet.length<CAP&&G.reserveFleet.length>0){
    const ship=G.reserveFleet.shift();  // 최상단(인덱스 0) 함선
    G.fleet.push(ship);
    promoted++;
  }
  if(promoted>0){
    notify(I18N.t('notify.reservePromoted',{n:promoted,now:G.fleet.length,max:CAP}),'ok');
  }
  return promoted;
}

// 함선 신규 획득 통합 처리: 선발 16척까지 채우고, 초과분은 임시창에 보관.
// 임시창이 8척을 넘으면 최하위 함선 매각 여부를 물어본다.
// 반환: {added:'fleet'|'reserve', overflowPrompted:bool}
// 사용자 요청 2026-06-09: 같은 함선은 최대 8대까지만 보유 가능
//   · catalogId 기준 (소형 S01, 신화 LGD01 등 카탈로그 단위)
//   · BOSS_URSA 같은 특수 함선은 catalogId 가 다르거나 일회성이라 자연스럽게 무관
//   · 선발(fleet) + 임시창(reserveFleet) 통합 카운트
const SAME_SHIP_CAP = 8;
function _countSameShip(catalogId){
  if(!catalogId)return 0;
  const _cid=String(catalogId).toUpperCase();
  const _match=s=>{
    const _sc=String(s.catalogId||s.catId||s.id||'').toUpperCase();
    if(_sc===_cid)return true;
    // 제작 함선 'LGD01_craft_xxx' 같은 패턴도 catalogId 매치로 카운트
    return _sc.startsWith(_cid+'_');
  };
  let n=0;
  (G.fleet||[]).forEach(s=>{if(_match(s))n++;});
  (G.reserveFleet||[]).forEach(s=>{if(_match(s))n++;});
  return n;
}
try{if(typeof window!=='undefined'){window._countSameShip=_countSameShip;window.SAME_SHIP_CAP=SAME_SHIP_CAP;}}catch(e){}

function addShipToFleet(ship){
  if(!ship)return{added:null};
  if(!G.fleet)G.fleet=[];
  if(!G.reserveFleet)G.reserveFleet=[];
  try{_markShipDiscovered(ship);}catch(e){}  // 도감 영구 발견 기록
  const FLEET_CAP=16, RESERVE_CAP=8;
  let added;
  if(G.fleet.length<FLEET_CAP){
    G.fleet.push(ship);added='fleet';
  } else {
    G.reserveFleet.push(ship);added='reserve';
    notify(I18N.t('notify.shipToReserve',{max:FLEET_CAP,nm:shipDisplayNm(ship),now:G.reserveFleet.length,cap:RESERVE_CAP}),'warn');
  }
  // 임시창 초과 시 최하위 함선 매각 프롬프트
  if(G.reserveFleet.length>RESERVE_CAP){
    _promptSellLowestReserve();
  }
  return{added};
}

// 임시창이 8척을 넘었을 때: 임시창+선발 통합에서 최하위(매각가 최저) 함선을 골라 매각 여부 묻기
function _promptSellLowestReserve(){
  if(typeof getShipSellPrice!=='function')return;
  const candidates=[];
  (G.reserveFleet||[]).forEach((s,i)=>candidates.push({s,i,from:'reserve'}));
  // 선발은 기함(idx 0) 제외하고 후보로
  (G.fleet||[]).forEach((s,i)=>{if(i>0)candidates.push({s,i,from:'fleet'});});
  if(!candidates.length)return;
  const _tierRank={'신화':5,'전설기함':4,'대형':3,'중형':2,'소형':1};
  // 최하위 = 티어 낮고 매각가 낮은 함선
  candidates.sort((a,b)=>{
    const ta=_tierRank[a.s.tier]||0,tb=_tierRank[b.s.tier]||0;
    if(ta!==tb)return ta-tb;
    const pa=getShipSellPrice(a.s).total,pb=getShipSellPrice(b.s).total;
    return pa-pb;
  });
  const c=candidates[0];
  const price=getShipSellPrice(c.s).total;
  const fromLabel=c.from==='reserve'?I18N.t('ship.fromReserve'):I18N.t('ship.fromActive');
  openModal(I18N.t('modal.overflowSellLowest'),
    `<div style="text-align:center;padding:10px;font-size:13px;line-height:1.7">
      ${I18N.t('ui.reserveOver8')}<br>
      ${I18N.t('ui.lowestShipPick',{nm:shipDisplayNm(c.s),tier:I18N.tier(c.s.tier),from:fromLabel})}<br>
      ${I18N.t('ui.sellAtPriceQ',{p:price.toLocaleString()})}
      <div style="font-size:11px;color:var(--dim);margin-top:8px">${I18N.t('ui.cancelKeepsReserve')}</div>
    </div>`,
    [
      {txt:I18N.t('ui.sellAt',{p:price.toLocaleString()}),cls:'btn-gold',fn:()=>{
        if(c.from==='reserve'){G.reserveFleet.splice(c.i,1);}
        else{G.fleet.splice(c.i,1);_promoteReserveIfRoom();}
        G.credits=(G.credits||0)+price;
        notify(I18N.t('notify.shipSoldSimple',{nm:shipDisplayNm(c.s),cr:price.toLocaleString()}),'gold');
        closeModal();saveGame(true);
        if(typeof rerenderShipOrGarage==='function')rerenderShipOrGarage();
      }},
      {txt:I18N.t('ui.cancel'),fn:closeModal}
    ]);
}

// 전투 승리 시 적함 나포 허용/거절 토글
// 거절 ON: 나포 대상 함선을 즉시 매각하여 크레딧 획득
function toggleDeclineCapture(){
  G.declineCapture=!G.declineCapture;
  notify(G.declineCapture?I18N.t('notify.captureToggleOn'):I18N.t('notify.captureToggleOff'),'ok');
  saveGame(true);
  rerenderTab(renderGarageTab);
}

// 임시창 함선 ↔ 선발 편대 함선 교체
// 후보 함선 → 선발 편대로 즉시 승급 (선발 < 16척일 때)
function promoteReserveShip(reserveIdx){
  if(!G.reserveFleet||!G.reserveFleet[reserveIdx]){notify(I18N.t('notify.noTempShip'),'err');return;}
  if(G.fleet.length>=16){notify(I18N.t('notify.activeFleetFull'),'err');return;}
  const ship=G.reserveFleet.splice(reserveIdx,1)[0];
  G.fleet.push(ship);
  notify(I18N.t('notify.shipJoinActive',{nm:shipDisplayNm(ship),now:G.fleet.length}),'gold');
  baekgu(I18N.t('baekgu.shipReadyForBattle',{nm:shipDisplayNm(ship)}));
  saveGame(true);rerenderShipOrGarage();
}

function swapReserveShip(reserveIdx){
  if(!G.reserveFleet||!G.reserveFleet[reserveIdx]){notify(I18N.t('notify.noTempShip'),'err');return;}
  const sel=document.getElementById('resvSwap_'+reserveIdx);
  const fleetIdx=parseInt(sel?.value);
  if(isNaN(fleetIdx)||fleetIdx<0||fleetIdx>=G.fleet.length){notify(I18N.t('notify.selectStarterSwap'),'warn');return;}
  // 기함 교체 시 경고
  if(fleetIdx===0){
    if(!confirm(I18N.t('ship.flagshipMoveConfirm')))return;
  }
  const reserveShip=G.reserveFleet[reserveIdx];
  const activeShip=G.fleet[fleetIdx];
  // ── 교체 전: 선발 함선의 파츠/크루/창고확장 자동 해제 → 인벤토리/크루풀로 반환 ──
  let _partsReturned=0,_crewReturned=0,_cargoReturned=0;
  if(activeShip.parts&&activeShip.parts.length>0){
    activeShip.parts.forEach(pid=>{addToInventory(pid);_partsReturned++;});
    activeShip.parts=[];
  }
  if(activeShip.crewIds&&activeShip.crewIds.length>0){
    _crewReturned=activeShip.crewIds.length;
    activeShip.crewIds=[];  // 크루는 G.crew/G.heroes에 이미 있으므로 ID만 비우면 자동 해제됨
  }
  // 창고 확장 파츠 자동 분리 (사용자 요청)
  _cargoReturned=_detachAllCargoExt(activeShip);
  // HP/SH 클램프 (스탯 변화 반영)
  const _st=getShipStats(activeShip);
  activeShip.hp=Math.min(activeShip.hp,_st.HP);
  activeShip.sh=Math.min(activeShip.sh||0,_st.maxSH);
  // 교체 (파츠/크루 비어있는 상태로 임시창行)
  G.fleet[fleetIdx]=reserveShip;
  G.reserveFleet[reserveIdx]=activeShip;
  // 화물·재료 정합성 보정 — 함선 교체 후 cargoSlots 합이 바뀌면서 화물 표시가
  // 위치 기반으로 재배치돼 뒤엉켜 보일 수 있음. 데이터 자체는 G.cargo에 그대로 있으나
  // 0-qty 잔존·동일 id 슬롯·material 카운터 불일치를 한 번 정리.
  try{_validateCargoIntegrity();}catch(e){console.warn('cargo validate failed',e);}
  const _msg=I18N.t('ui.swapToReserve',{active:activeShip.nm,p:_partsReturned,c:_crewReturned,cargo:_cargoReturned>0?I18N.t('ui.cargoReturned',{n:_cargoReturned}):'',reserve:reserveShip.nm});
  notify(_msg,'gold');
  baekgu(I18N.t('baekgu.reserveSwapSortie',{rs:reserveShip.nm,ac:activeShip.nm}));
  saveGame(true);
  rerenderShipOrGarage();
}
// 임시창 함선 폐기 → 정비소 매각 (크레딧 환급 + 파츠/크루 회수)
function discardReserveShip(reserveIdx){
  if(!G.reserveFleet||!G.reserveFleet[reserveIdx])return;
  const ship=G.reserveFleet[reserveIdx];
  // 매각가 계산: 카탈로그 정가의 80% × 품질 배율 × 강화 보너스 (사용자 요청)
  const cid=String(ship.catalogId||ship.id||'').replace(/(?:_\d+|_main)$/,'');
  const def=(typeof SHIP_CATALOG!=='undefined')?SHIP_CATALOG.find(d=>d.id===cid):null;
  const basePrice=def?.price||({소형:5000,중형:35000,대형:260000,전설기함:1200000,신화:25000000})[ship.tier]||10000;
  const qualityMul=ship.quality||1.0;
  // 강화 레벨 — 레벨당 +10% 매각가 보너스 (0~10)
  const _enhLv=Math.max(0,Math.min(10,ship._enhanceLv||0));
  const _enhMul=1+_enhLv*0.10;
  const sellPrice=Math.round(basePrice*0.8*qualityMul*_enhMul);
  // 장착 파츠 → 인벤토리 회수
  let returnedParts=0;
  if(ship.parts&&ship.parts.length>0){
    if(!G.inventory)G.inventory=[];
    ship.parts.forEach(pid=>{
      const inv=G.inventory.find(i=>i.id===pid);
      if(inv)inv.qty++;else G.inventory.push({id:pid,qty:1});
      returnedParts++;
    });
  }
  // 창고 확장 파츠 자동 분리 (사용자 요청)
  const returnedCargo=_detachAllCargoExt(ship);
  const returnedCrew=(ship.crewIds||[]).length;
  // 중앙 정렬 확인 모달 (브라우저 confirm 대신)
  const qLabel=qualityMul!==1?I18N.t('ui.qualityMult',{mul:qualityMul.toFixed(2)}):'';
  const enhLabel=_enhLv>0?I18N.t('ui.enhanceMul',{lv:_enhLv,mul:_enhMul.toFixed(1)}):'';
  openModal(I18N.t('modal.candidateShipSale'),
    `<div style="padding:14px;text-align:center">
      <div style="font-size:38px;margin-bottom:8px">💰</div>
      <div style="font-size:15px;color:var(--yellow);margin-bottom:8px"><b>${shipDisplayNm(ship)}</b></div>
      <div style="font-size:13px;color:var(--dim);line-height:1.9;margin-bottom:10px">
        ${I18N.t('ui.sellPriceLine',{cr:sellPrice.toLocaleString()})}<br>
        <span style="color:var(--muted);font-size:11px">${I18N.t('ui.sellPctNote',{tail:qLabel+''+enhLabel})}</span>
      </div>
      <div style="background:rgba(0,243,255,.06);border:1px solid rgba(0,243,255,.25);border-radius:6px;padding:8px 12px;font-size:12px;color:var(--cyan);line-height:1.7">
        ${I18N.t('ui.partsCrewReturn',{parts:returnedParts,crew:returnedCrew})}${returnedCargo>0?I18N.t('ui.cargoReturned',{n:`<b>${returnedCargo}</b>`}):''}<br>
        <span style="font-size:10px;color:var(--dim)">${I18N.t('ui.partsCargoToInv')}</span>
      </div>
    </div>`,
    [
      {txt:I18N.t('ship.confirmSell'),fn:()=>{
        closeModal();
        // 매각 취소용 깊은 복사 (파츠 회수 전 상태로 복원)
        const _undoShip=JSON.parse(JSON.stringify(ship));
        G.credits+=sellPrice;
        G.reserveFleet.splice(reserveIdx,1);
        try{_recordSell({type:'ship',ship:_undoShip,credits:sellPrice,label:I18N.t('ship.sellCandidate',{nm:shipDisplayNm(ship)})});}catch(e){}
        notify(I18N.t('notify.shipSoldRecovered',{nm:shipDisplayNm(ship),cr:sellPrice.toLocaleString(),parts:returnedParts,crew:returnedCrew,cargo:returnedCargo>0?I18N.t('notify.fleetCargoRecovered',{n:returnedCargo}):''}),'gold');
        baekgu(I18N.t('baekgu.shipSoldAtGarage',{nm:shipDisplayNm(ship),cr:sellPrice.toLocaleString()}));
        updateHUD();saveGame(true);
        rerenderShipOrGarage();
      },cls:'btn-gold'},
      {txt:I18N.t('btn.cancel'),fn:closeModal,cls:'btn-sm'}
    ]
  );
}

function rerenderShipOrGarage(){
  var b=document.getElementById('hub-body');if(!b)return;
  if(G._currentHubTab==='garage')rerenderTab(renderGarageTab);
  else rerenderTab(renderShipTab);
}
// ── 화물 전용 탭 (📦 화물 관리) — DOM 부하 분산을 위한 분리 ──────
function renderCargoOnlyTab(body){
  if(!body)return;
  G._garageMode=true;
  const pd=PLANET_DEF.find(p=>p.id===G.currentPlanet);
  const subNav=`<div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap">
    ${[{k:'parts',lb:I18N.t('garage.shipMaint')},{k:'cargo',lb:I18N.t('garage.cargo')},{k:'formation',lb:I18N.t('garage.formation')},{k:'skin',lb:I18N.t('garage.shipSkin')},{k:'enhance',lb:I18N.t('garage.shipEnhance')}].map(t=>{
      const act=(t.k===_garageSubTab);
      return`<button onclick="_garageSubTab='${t.k}';rerenderTab(renderGarageTab)" style="padding:5px 14px;border:1px solid ${act?'var(--cyan)':'var(--bdr)'};background:${act?'rgba(0,243,255,.12)':'transparent'};color:${act?'var(--cyan)':'var(--dim)'};border-radius:6px;cursor:pointer;font-size:12px;font-weight:${act?'bold':'normal'}">${t.lb}</button>`;
    }).join('')}
  </div>`;
  // 전체 화물 통계
  const totalSlots=G.fleet.reduce((s,sh)=>s+(sh.cargoSlots||4),0);
  const usedSlots=G.cargo.reduce((s,c)=>s+(c.qty||0),0);
  const totalValue=G.cargo.reduce((s,c)=>s+((c.buyPrice||0)*(c.qty||0)),0);
  // 각 함선 화물칸 카드 (간소화)
  const shipCards=G.fleet.map((s,idx)=>{
    const slots=Math.min(s.cargoSlots||4,100);
    let cargoOffset=0;
    for(let fi=0;fi<G.fleet.length;fi++){if(G.fleet[fi].id===s.id)break;cargoOffset+=G.fleet[fi].cargoSlots||4;}
    const cargoFlat=[];
    G.cargo.forEach(c=>{const imgSrc=commImgSrc(c.id);const _dnm=commDisplayNm(c);for(let q=0;q<(c.qty||1);q++)cargoFlat.push({nm:_dnm,ic:c.ic||'📦',img:imgSrc,price:c.buyPrice,id:c.id});});
    const myCargo=cargoFlat.slice(cargoOffset,cargoOffset+slots);
    const _cgRows=slots<=8?4:slots<=24?6:slots<=48?7:8;
    const _cgCell=slots<=24?40:slots<=48?36:32;
    let grid='<div style="display:grid;grid-template-rows:repeat('+_cgRows+','+_cgCell+'px);grid-auto-flow:column;grid-auto-columns:'+_cgCell+'px;gap:3px">';
    const _inner=_cgCell-4;
    for(let i=0;i<slots;i++){
      if(i<myCargo.length){const ci=myCargo[i];grid+='<div style="width:'+_cgCell+'px;height:'+_cgCell+'px;border-radius:4px;background:rgba(0,243,255,.15);border:1px solid rgba(0,243,255,.4);display:flex;align-items:center;justify-content:center;overflow:hidden" title="'+ci.nm+'"><img src="'+ci.img+'" style="width:'+_inner+'px;height:'+_inner+'px;object-fit:cover;border-radius:2px" onerror="this.style.display=\'none\';this.nextSibling.style.display=\'flex\'"><span style="font-size:'+(_cgCell>=36?16:13)+'px;display:none;width:100%;height:100%;align-items:center;justify-content:center">'+ci.ic+'</span></div>';}
      else{const isMax=(slots>=100);grid+='<div '+''+' style="width:'+_cgCell+'px;height:'+_cgCell+'px;border-radius:4px;background:rgba(255,255,255,.03);border:1px dashed rgba(255,255,255,.12);'+''+'" title="'+(isMax?I18N.t('ui.cargoMaxTooltip'):I18N.t('ui.emptyCargoCell'))+'"></div>';}
    }
    grid+='</div>';
    const fc=s.tier==='신화'?'#cc66ff':s.tier==='대형'?'#d4af37':s.tier==='중형'?'#00f3ff':'#88ccff';
    const tierIc={신화:'✦',전설기함:'⚑',대형:'🌟',중형:'🚀',소형:'🛸'}[s.tier]||'🛸';
    let btn;
    if(slots<100){const cp=getCargoUpgradePrice(s);btn='';}
    else btn='<span style="font-size:11px;color:var(--cyan)">'+I18N.t('ship.cargoMaxAlt')+'</span>';
    return `<div style="background:var(--card);border:1px solid ${fc};border-radius:8px;padding:10px 12px;margin-bottom:10px;display:flex;gap:14px;align-items:flex-start">
      <div style="width:273px;flex-shrink:0;text-align:center">
        ${imgOrEmoji(shipImgSrc(s),tierIc,273,273,'border-radius:8px;background:rgba(0,0,0,.5);border:1px solid '+fc+'66;object-fit:contain;max-width:100%',shipLoreKey(s))}
        <div style="font-size:11px;color:${fc};font-weight:bold;margin-top:4px;word-break:keep-all">${I18N.tier(s.tier)}</div>
      </div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">
          <span style="font-size:14px;font-weight:bold;color:var(--txt)">${idx===0?'⭐ ':''}${shipDisplayName(s)}</span>
          <span style="font-size:11px;color:var(--cyan)">📦 ${s.cargoSlots||4} / 100${I18N.t('unit.slot')}</span>
          ${btn}
        </div>
        ${grid}
      </div>
    </div>`;
  }).join('');
  // 전체 함대 창고 확장 비용 합계 + 가능 여부 (사용자 요청: 상단 일괄 버튼)
  const _allUpgradeCost=G.fleet.reduce((s,sh)=>s+((sh.cargoSlots||4)<100?getCargoUpgradePrice(sh):0),0);
  const _anyExpandable=G.fleet.some(sh=>(sh.cargoSlots||4)<100);
  body.innerHTML=`<div class="hub-scroll">
    ${hubBanner('garage','🔧',I18N.t('ui.shipMaintenance'),pd?.f)}
    <div class="hub-t">${I18N.t('hub.shipGarageT')} — ${pd?pd.nm:''}</div>
    ${subNav}
    <!-- 사용자 요청: 상단 단축 액션 3종 — 전체확장 | 창고구매(거래소 파츠탭) | 창고제작(제작소) -->
    <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;align-items:stretch">
      <div style="flex:2;min-width:240px;background:rgba(0,255,140,.05);border:1px solid rgba(46,204,113,.3);border-radius:8px;padding:10px 14px;display:flex;flex-direction:column;justify-content:center;gap:6px">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span style="font-size:13px;font-weight:bold;color:var(--green)">${I18N.t('ui.allFleetExpandHeader')}</span>
          <span style="font-size:11px;color:var(--dim);margin-left:auto">${_anyExpandable?I18N.t('ship.upgradeAllInfo',{cost:_allUpgradeCost.toLocaleString()}):I18N.t('ship.allShipsMaxCargo')}</span>
        </div>
        ${_anyExpandable?`<button class="btn btn-gold" style="font-size:12px;padding:5px 10px;width:100%" onclick="upgradeAllCargo()" ${G.credits>=_allUpgradeCost?'':'disabled'}>${I18N.t('ui.expandAllBtn',{cr:_allUpgradeCost.toLocaleString()})}</button>`:`<div style="font-size:11px;color:var(--cyan);text-align:center">${I18N.t('ui.holdExpUnneeded')}</div>`}
      </div>
      <button class="btn btn-sm" style="flex:1;min-width:160px;font-size:12px;padding:10px 12px;border-color:var(--cyan);color:var(--cyan);background:rgba(0,243,255,.08);display:flex;flex-direction:column;justify-content:center;gap:4px;line-height:1.4" onclick="(function(){_shipTab='parts';try{rerenderTab(renderShipTab);}catch(e){}hubTab('ship');})()">
        ${I18N.t('ui.cargoBuyTitle')}<br><span style="font-size:10px;color:var(--dim);font-weight:normal">${I18N.t('ui.cargoBuySub')}</span>
      </button>
      <button class="btn btn-sm" style="flex:1;min-width:160px;font-size:12px;padding:10px 12px;border-color:var(--purple);color:#cc88ff;background:rgba(139,0,255,.08);display:flex;flex-direction:column;justify-content:center;gap:4px;line-height:1.4" onclick="hubTab('craft')">
        ${I18N.t('ui.craftHoldShortcut')}<br><span style="font-size:10px;color:var(--dim);font-weight:normal">${I18N.t('ui.goToShipWorkshop')}</span>
      </button>
    </div>
    <div style="background:rgba(0,243,255,.04);border:1px solid rgba(0,243,255,.25);border-radius:8px;padding:10px 14px;margin-bottom:12px;display:flex;gap:18px;flex-wrap:wrap">
      <span style="font-size:13px;color:var(--cyan)"><b>${I18N.t('ui.totalOwned')}</b> ${usedSlots}/${totalSlots}칸</span>
      <span style="font-size:13px;color:var(--gold)"><b>${I18N.t('ui.totalValue')}</b> ₡${totalValue.toLocaleString()}</span>
      <span style="font-size:12px;color:var(--dim);margin-left:auto">${I18N.t('ui.cargoPerShipHelp')}</span>
    </div>
    ${shipCards||`<div style="text-align:center;color:var(--dim);padding:30px">${I18N.t('ui.noShips')}</div>`}
  </div>`;
  G._garageMode=false;
}
// 전체 함대 화물칸 일괄 +2 확장 (모든 함선 < 100칸 대상)
function upgradeAllCargo(){
  if(!Array.isArray(G.fleet))return;
  const targets=G.fleet.map((s,i)=>({s,i})).filter(x=>(x.s.cargoSlots||4)<100);
  if(targets.length===0){notify(I18N.t('notify.allShipsHoldsMax'),'warn');return;}
  const total=targets.reduce((s,x)=>s+getCargoUpgradePrice(x.s),0);
  if((G.credits||0)<total){notify(I18N.t('notify.needCreditsTotal',{cost:total.toLocaleString()}),'err');return;}
  G.credits-=total;
  targets.forEach(x=>{x.s.cargoSlots=Math.min(100,(x.s.cargoSlots||4)+2);});
  notify(I18N.t('notify.holdExpandedN',{n:targets.length,cr:total.toLocaleString()}),'gold');
  updateHUD();saveGame(true);
  try{rerenderTab(renderGarageTab);}catch(e){}
}
try{if(typeof window!=='undefined')window.upgradeAllCargo=upgradeAllCargo;}catch(e){}

function renderGarageTab(body){
  if(!body)return;
  if(_garageSubTab==='formation'){
    renderFleetFormationTab(body);
    return;
  }
  if(_garageSubTab==='cargo'){
    renderCargoOnlyTab(body);
    return;
  }
  if(_garageSubTab==='skin'){
    renderShipSkinTab(body);
    return;
  }
  if(_garageSubTab==='enhance'){
    renderShipEnhanceTab(body);
    return;
  }
  G._garageMode=true;
  var _pt=_shipTab;
  _shipTab='fleet';
  renderShipTab(body);
  _shipTab=_pt;
  G._garageMode=false;
}


// ─── 전역 노출 (자동 생성) ─────────────────────────────────────
try{window._recordSell=_recordSell;}catch(e){}
try{window._renderUndoSellToast=_renderUndoSellToast;}catch(e){}
try{window.undoLastSell=undoLastSell;}catch(e){}
try{window.sellPartFromInventory=sellPartFromInventory;}catch(e){}
try{window.switchShipTab=switchShipTab;}catch(e){}
try{window._detachAllCargoExt=_detachAllCargoExt;}catch(e){}
try{window._promoteReserveIfRoom=_promoteReserveIfRoom;}catch(e){}
try{window.SAME_SHIP_CAP=SAME_SHIP_CAP;}catch(e){}
try{window._countSameShip=_countSameShip;}catch(e){}
try{window.addShipToFleet=addShipToFleet;}catch(e){}
try{window._promptSellLowestReserve=_promptSellLowestReserve;}catch(e){}
try{window.toggleDeclineCapture=toggleDeclineCapture;}catch(e){}
try{window.promoteReserveShip=promoteReserveShip;}catch(e){}
try{window.swapReserveShip=swapReserveShip;}catch(e){}
try{window.discardReserveShip=discardReserveShip;}catch(e){}
try{window.rerenderShipOrGarage=rerenderShipOrGarage;}catch(e){}
try{window.renderCargoOnlyTab=renderCargoOnlyTab;}catch(e){}
try{window.upgradeAllCargo=upgradeAllCargo;}catch(e){}
try{window.renderGarageTab=renderGarageTab;}catch(e){}
console.log('[sell-undo] Loaded — 19 decls exposed');
})();
