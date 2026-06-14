// ═══════════════════════════════════════════════════════════════════
// DESTINATION EARTH — 거래 시스템 모듈 (Phase B3)
//   · game.js 에서 분할 (2026-06-10, 사용자 요청: 긴 파일 분할)
//
// 공개 함수 (window.* 노출):
//   · renderTradeTab(body)         — 거래 탭 메인 렌더 (hubTab("trade"))
//   · buyComm(id, _silent)         — 특산물 1개 구매
//   · buyComm5(id) / buyCommN(id) / buyCommMax(id) — 5/N/최대 구매
//   · sellComm(idx, qty)           — 화물 판매
//   · generateShopStock(planetId)  — 행성별 상점 재고 생성·갱신
//   · _restockMissingParts / _restockCommodities — 재고 보충 헬퍼
//
// 의존 글로벌 (window.*):
//   · G, COMMODITIES, PARTS, PLANET_DEF, HEROES, FACTION
//   · I18N, _GAME_VER
//   · notify, baekgu, saveGame, rerenderTab, openModal, closeModal
//   · calcSellPrice, getCargoMax, getRewardMult, calcPlayerLevel
//   · commDisplayNm, partDisplayNm, commImgSrc, partImgSrc, imgOrEmoji
//   · updateHUD, addCargoOrInventory, planetImgSrc, planetBgSrc
// ═══════════════════════════════════════════════════════════════════
(function(){
if(typeof window==='undefined')return;
if(window._RENDER_TRADE_TAB_LOADED)return;
window._RENDER_TRADE_TAB_LOADED=true;

function generateShopStock(planetId){
  // ── 기존 재고: 보충 주기 체크 ─────────────────────────────────
  if(G.shopStock[planetId]){
    const _st=G.shopStock[planetId];
    const _last=_st._lastRestockTurn;
    const _elapsed=(typeof _last==='number')?(G.turn-_last):SHOP_RESTOCK_TURNS;
    if(_elapsed<SHOP_RESTOCK_TURNS){
      // 구버전 저장데이터: 제작 재료가 없을 경우 즉시 패치
      const _allMats=COMMODITIES.filter(c=>c.material);
      const _hasMats=_allMats.some(c=>(_st[c.id]||0)>0);
      if(!_hasMats){
        const _pd2=PLANET_DEF.find(p=>p.id===planetId);const _fac2=_pd2?.f;
        if(_fac2&&FACTION_MATS[_fac2]){
          const _fmId=FACTION_MATS[_fac2];
          if(!_st[_fmId])_st[_fmId]=Math.floor(Math.random()*8)+4;
          if(_fac2==='F07'&&!_st['R08'])_st['R08']=Math.floor(Math.random()*4)+2;
        }
        const _seed=stringToSeed(planetId);
        _allMats.forEach((mat,i)=>{if(!_st[mat.id]&&((_seed+i)%3)===0)_st[mat.id]=Math.floor(Math.random()*10)+4;});
      }
      // 신규 추가 파츠(예: RB06~RB08 수리 로봇 등)는 즉시 보충 (4턴 대기 없이)
      _restockMissingParts(_st,planetId);
      // 문명권 전용 함선(F0X_S/M/L · CHIX_*_BUY 등)도 즉시 보충 — 기존 세이브 호환
      _restockMissingShips(_st,planetId);
      return;
    }
    // 보충 주기 도래 — 특산물/재료 + 신규 파츠 + 함선 보충
    _restockCommodities(_st,planetId);
    _restockMissingParts(_st,planetId);
    _restockMissingShips(_st,planetId);
    _st._lastRestockTurn=G.turn;
    return;
  }
  // ── 최초 생성 ────────────────────────────────────────────────
  const stock={};
  stock._lastRestockTurn=G.turn;
  const pd=PLANET_DEF.find(p=>p.id===planetId);
  const fac=pd?.f;
  // 해당 문명권 특산물 + 주변 특산물
  const available=COMMODITIES.filter(c=>c.f===fac||Math.random()<0.4);
  available.forEach(c=>{
    if(c.material){
      // 희귀 제작 재료: 4~13개 공급 (기존 2배)
      stock[c.id]=Math.floor(Math.random()*10)+4;
    } else {
      // 특산물 재고: 명성에 비례하여 최소 20개 ~ 최대 500개
      // 명성 0 → ~20개, 명성 500+ → ~500개. 가격 비싼 물품은 약간 감소
      const _stockRep=G.reputation||0;
      const repScale=clamp(_stockRep/500,0.04,1.0);  // 0.04~1.0
      const priceRatio=c.buy/15000;  // 0~1 (가격 비율)
      const priceAdjust=1-priceRatio*0.55;  // 저가 1.0, 고가 0.45
      const maxQty=clamp(Math.floor(500*repScale*priceAdjust),20,500);
      const minQty=Math.max(20,Math.floor(maxQty*0.45));
      stock[c.id]=minQty+Math.floor(Math.random()*(maxQty-minQty+1));
    }
  });
  // 팩션 고유 제작 재료는 항상 소량 보장 판매
  if(fac&&FACTION_MATS[fac]){
    const fMatId=FACTION_MATS[fac];
    if(!stock[fMatId])stock[fMatId]=Math.floor(Math.random()*8)+4;
    // F07 보이드는 R08(은하혼돈결정)도 추가
    if(fac==='F07'&&!stock['R08'])stock['R08']=Math.floor(Math.random()*4)+2;
  }
  // ── 명성/전투력 기반 추가 제작 재료 3종 판매 ──────────────────────────────
  // 명성(reputation) + 함대 전투력(ATT 합산)으로 등급 결정
  {
    const rep=G.reputation||0;
    const combatPwr=G.fleet.reduce((s,sh)=>s+(sh.ATT||0)+(sh.INT||0),0);
    const score=rep+Math.floor(combatPwr/10);
    // 3종 선정: 팩션 재료 + 인접 재료 2종
    const allMats=COMMODITIES.filter(c=>c.material);
    // 재료 풀 시드: planetId 해시
    const seed=stringToSeed(planetId);
    function seededPick(arr,n,offset){
      const res=[];const used=new Set();
      for(let i=0;i<n&&res.length<arr.length;i++){
        const idx=((seed*137+offset+i*31)%arr.length+arr.length)%arr.length;
        let j=idx;while(used.has(j)){j=(j+1)%arr.length;}
        used.add(j);res.push(arr[j]);
      }
      return res;
    }
    const picks=seededPick(allMats,3,0);
    // 수량: score 기반, 4~60개 범위 (기존 2배)
    const baseQty=clamp(4+Math.floor(score/4),4,60);
    picks.forEach((mat,i)=>{
      const q=clamp(baseQty-i*6+Math.floor(Math.random()*10),4,60);
      if(!stock[mat.id]||stock[mat.id]<q)stock[mat.id]=q;
    });
  }

  // 파츠 상점 재고 (행성 링에 따라 티어 결정)
  const ring=pd?.ring||2;
  const tierMax=Math.min(15,ring*3+Math.floor((G.reputation||0)/3));
  const availParts=PARTS.filter(p=>p.tier<=tierMax&&p.tier<15&&!p.quest); // quest:true 및 전설급(tier≥15) 상점 미출시
  availParts.forEach(p=>{
    const qtyBase=p.price<10000?Math.floor(Math.random()*8+3):Math.floor(Math.random()*3+1);
    stock['part_'+p.id]=qtyBase;
  });
  // 함선 상점 (중형 이상은 링 3+부터)
  if(ring>=2){
    const hasSunsin=G&&G.heroes&&G.heroes.includes('H01');
    const plvForShip=calcPlayerLevel();
    const isVoidPlanet=pd?.void===true;
    // 치크스(적대) 행성 1개 이상 보유 시 → 노획 치크스 함선 라인업 해금
    const _ownsChix=PLANET_DEF.some(p=>p.hostile&&!p.void&&G.planets[p.id]?.owned);
    const _planetCiv=pd?.f;
    // 모든 중형/일반 대형 함선은 항상 입고 — 전투력/명성 조건은 구매 시점에 검사
    // (단, 특수 quest/전설 LGD·H1x·신화·CHIX_*_BUY/F0X_S/M/L 등은 기존 해금 조건 유지)
    // 현재 행성 총독권을 최대치(commerce 10)까지 투자했는가 → 치크스 함선 해금 (사용자 요청)
    const _maxInvestHere=!!(G.planets[planetId]&&G.planets[planetId].owned&&(G.planets[planetId].commerce||0)>=10);
    const availShips=SHIP_CATALOG.filter(s=>{
      // 문명권 전용 함선 (civ 필드) — 해당 문명 행성에서만 구매 가능
      if(s.civ){
        // 치크스(F05): ① F05 행성 + 적대 행성 보유, 또는 ② 현재 행성 총독권 최대 투자(Lv10)
        if(s.civ==='F05'){
          if(_maxInvestHere)return true;
          return _planetCiv==='F05'&&_ownsChix;
        }
        if(s.civ!==_planetCiv)return false;
        return true;
      }
      // 보스 전용 함선(우르사·블랙팔콘, 가격 0)은 상점에 절대 입고하지 않음 → 도감 노출/구매 차단
      if(s.id==='URSA'||s.id==='BLACKFALCON'||(s.price||0)<=0)return false;
      return (
        (s.tier==='소형')||
        (s.tier==='중형')||
        (s.tier==='대형'&&!s.id.startsWith('H1')&&!s.id.startsWith('LGD'))||
        (s.tier==='대형'&&(s.id==='H10'||s.id==='H11')&&isVoidPlanet&&plvForShip>=400)||
        (s.tier==='대형'&&s.id==='H12'&&isVoidPlanet&&plvForShip>=400)||
        (s.tier==='신화'&&plvForShip>=600)
      );
    });
    availShips.forEach(s=>{stock['ship_'+s.id]=Math.floor(Math.random()*2+1);});
  }
  // 창고 확장 아이템 (문명별, 해당 팩션 + 인근 랜덤)
  const availCargo=CARGO_ITEMS.filter(function(ci){
    if(ci.quest)return false;
    return ci.faction===fac||Math.random()<0.2;
  });
  availCargo.forEach(function(ci){
    stock['cargo_'+ci.id]=Math.floor(Math.random()*2)+1;
  });
  // ── 미사일 파츠 상점 재고 (등급별) ─────────────────────────────────
  const missileparts=PARTS.filter(p=>p.wtype==='missile'&&!p.quest&&p.tier<=tierMax);
  missileparts.forEach(p=>{
    const qty=p.rarity==='legend'?1:p.tier>=10?2:Math.floor(Math.random()*3+1);
    if(!stock['part_'+p.id])stock['part_'+p.id]=qty;
  });
  // ── 특수 창고 파츠 상점 재고 (등급별) — 사용자 요청: 재고 2배 ─────────
  //   legend/mythic: 1 → 2 (고정 2개)
  //   기타: 1~2 → 2~4 (Math.floor(Math.random()*3+2) → 2/3/4 균등)
  const scargoParts=SPECIAL_CARGO_PARTS.filter(p=>!p.quest&&p.tier<=tierMax);
  scargoParts.forEach(p=>{
    stock['scargo_'+p.id]=p.rarity==='legend'||p.rarity==='mythic'?2:Math.floor(Math.random()*3+2);
  });
  G.shopStock[planetId]=stock;
}

// 파츠 재고에 빠진 항목(신규 추가 파츠 등) 보충 — 기존 재고는 유지
function _restockMissingParts(stock,planetId){
  const pd=PLANET_DEF.find(p=>p.id===planetId);
  const ring=pd?.ring||2;
  const tierMax=Math.min(15,ring*3+Math.floor((G.reputation||0)/3));
  const availParts=PARTS.filter(p=>p.tier<=tierMax&&p.tier<15&&!p.quest);
  availParts.forEach(p=>{
    if((stock['part_'+p.id]||0)>0)return;  // 기존 재고가 있으면 건드리지 않음
    const qtyBase=p.price<10000?Math.floor(Math.random()*8+3):Math.floor(Math.random()*3+1);
    stock['part_'+p.id]=qtyBase;
  });
  // 미사일 파츠도 빠진 항목 보충
  const missileparts=PARTS.filter(p=>p.wtype==='missile'&&!p.quest&&p.tier<=tierMax);
  missileparts.forEach(p=>{
    if((stock['part_'+p.id]||0)>0)return;
    const qty=p.rarity==='legend'?1:p.tier>=10?2:Math.floor(Math.random()*3+1);
    stock['part_'+p.id]=qty;
  });
  // 특수 창고 확장 파츠 보충 — 재고 소진 시 자동 재공급 (사용자 요청: 2배 스톡)
  if(typeof SPECIAL_CARGO_PARTS!=='undefined'){
    const scargoP=SPECIAL_CARGO_PARTS.filter(p=>!p.quest&&p.tier<=tierMax);
    scargoP.forEach(p=>{
      if((stock['scargo_'+p.id]||0)>0)return;
      stock['scargo_'+p.id]=p.rarity==='legend'||p.rarity==='mythic'?2:Math.floor(Math.random()*3+2);
    });
  }
}

// 문명권 전용 함선(civ 필드)은 해당 문명 행성에서 반드시 1척 이상 재고 보장
// 일반 함선도 재고가 0이면 1로 보충 (기존 세이브에서 신규 함선이 표시 안 되는 문제 해결)
function _restockMissingShips(stock,planetId){
  const pd=PLANET_DEF.find(p=>p.id===planetId);
  if(!pd)return;
  const ring=pd.ring||2;
  if(ring<2)return;
  const plvForShip=(typeof calcPlayerLevel==='function')?calcPlayerLevel():1;
  const isVoidPlanet=pd.void===true;
  const _ownsChix=PLANET_DEF.some(p=>p.hostile&&!p.void&&G.planets[p.id]?.owned);
  const _planetCiv=pd.f;
  // 현재 행성 총독권 최대 투자(commerce 10) → 치크스 함선 해금 (사용자 요청)
  const _maxInvestHere=!!(G.planets[planetId]&&G.planets[planetId].owned&&(G.planets[planetId].commerce||0)>=10);
  SHIP_CATALOG.forEach(s=>{
    // 문명권 전용 함선: 일치하는 행성에서 항상 1척 이상 보장
    if(s.civ){
      if(s.civ==='F05'){
        // 치크스: F05 행성+적대보유, 또는 현재 행성 총독권 최대 투자
        if(!(_maxInvestHere||(_planetCiv==='F05'&&_ownsChix)))return;
        if((stock['ship_'+s.id]||0)<1)stock['ship_'+s.id]=1;
        return;
      }
      if(s.civ!==_planetCiv)return;
      if((stock['ship_'+s.id]||0)<1)stock['ship_'+s.id]=1;
      return;
    }
    // 보스 전용 함선(우르사·블랙팔콘, 가격 0)은 입고 금지
    if(s.id==='URSA'||s.id==='BLACKFALCON'||(s.price||0)<=0)return;
    // 일반 함선: 기존 입고 규칙 그대로, 재고 0이면 1 보충
    const allow=(
      (s.tier==='소형')||
      (s.tier==='중형')||
      (s.tier==='대형'&&!s.id.startsWith('H1')&&!s.id.startsWith('LGD'))||
      (s.tier==='대형'&&(s.id==='H10'||s.id==='H11')&&isVoidPlanet&&plvForShip>=400)||
      (s.tier==='대형'&&s.id==='H12'&&isVoidPlanet&&plvForShip>=400)||
      (s.tier==='신화'&&plvForShip>=600)
    );
    if(!allow)return;
    if((stock['ship_'+s.id]||0)<1)stock['ship_'+s.id]=1;
  });
}

// 특산물·재료만 보충 (파츠/함선/창고 재고는 건드리지 않음)
// - 행성 팩션 특산물은 항상 보장 (확률 100%)
// - 다른 팩션 특산물은 50% 확률로 보충
// - 기존 재고가 보충량보다 많으면 유지 (덮어쓰지 않음)
function _restockCommodities(stock,planetId){
  const pd=PLANET_DEF.find(p=>p.id===planetId);
  const fac=pd?.f;
  COMMODITIES.forEach(c=>{
    if(c.material){
      // 제작 재료: 4~13개 (기존이 더 많으면 유지)
      const refill=Math.floor(Math.random()*10)+4;
      if((stock[c.id]||0)<refill)stock[c.id]=refill;
      return;
    }
    // 일반 특산물: 같은 팩션은 무조건, 다른 팩션은 50% 확률
    const isLocalFac=(c.f===fac);
    if(!isLocalFac&&Math.random()>=0.5){
      // 다른 팩션 특산물 중 일부만 신선 입고. 기존 재고는 유지
      return;
    }
    const _rep=G.reputation||0;
    const repScale=clamp(_rep/500,0.04,1.0);
    const priceRatio=c.buy/15000;
    const priceAdjust=1-priceRatio*0.55;
    const maxQty=clamp(Math.floor(500*repScale*priceAdjust),20,500);
    const minQty=Math.max(20,Math.floor(maxQty*0.45));
    const refill=minQty+Math.floor(Math.random()*(maxQty-minQty+1));
    // 기존 재고가 보충량보다 적은 경우만 보충 (더 많으면 유지)
    if((stock[c.id]||0)<refill)stock[c.id]=refill;
  });
  // 팩션 고유 제작 재료는 항상 소량 보장
  if(fac&&FACTION_MATS[fac]){
    const fMatId=FACTION_MATS[fac];
    const refill=Math.floor(Math.random()*8)+4;
    if((stock[fMatId]||0)<refill)stock[fMatId]=refill;
    if(fac==='F07'){
      const r8=Math.floor(Math.random()*4)+2;
      if((stock['R08']||0)<r8)stock['R08']=r8;
    }
  }
}

// ═══ INIT GAME ════════════════════════════════════════════════════

function renderTradeTab(body){
  if(!body)return;
  const pd=PLANET_DEF.find(p=>p.id===G.currentPlanet);
  const fac=pd?FACTION[pd.f]:null;
  generateShopStock(G.currentPlanet);
  const stock=G.shopStock[G.currentPlanet]||{};
  const totalQty=getTotalCargoQty(),MAX=getCargoMax();

  // 인벤토리 특수 아이템 판매 패널 — 사용자 명세: 난중일기 영인본(G18) 한정, qty>=2 일 때만 노출
  const _invSellList=(G.inventory||[]).filter(i=>i.id==='G18'&&i.qty>=2);
  const invSellHTML=_invSellList.length>0?`<div style="background:rgba(255,215,0,.06);border:1px solid rgba(255,215,0,.3);border-radius:8px;padding:10px;margin-bottom:14px">
    <div style="color:var(--gold);font-size:13px;font-weight:bold;margin-bottom:6px">${I18N.t('ui.recruitMatSellHeader')}</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
    ${_invSellList.map(i=>{
      const c=COMMODITIES.find(cc=>cc.id===i.id);
      const marcoMult=(G.heroes&&G.heroes.includes('H08'))?1.20:1.0;
      const unit=Math.floor((c.maxSell||c.buy||0)*marcoMult);
      // 사용자 요청 (2026-06-06 갱신): 단일 버튼이 qty-1 일괄 매각. 1개는 항상 강제 보존.
      const _sellQty=Math.max(0,i.qty-1);
      const _totalCr=_sellQty*unit;
      return `<div style="background:var(--card);border:1px solid rgba(255,215,0,.35);border-radius:8px;padding:8px 10px;display:flex;flex-direction:column;gap:5px">
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:20px">${c.ic||'📜'}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;color:var(--yellow);font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${commDisplayNm(c)}</div>
            <div style="font-size:10px;color:var(--dim)">${I18N.t('ui.ownedQtyPrice',{qty:i.qty,price:unit.toLocaleString()})}</div>
          </div>
        </div>
        <div style="display:flex;gap:4px">
          <button class="btn btn-sm btn-gold" style="flex:1;font-size:11px;padding:4px 6px;white-space:nowrap" onclick="sellInventoryItem('${c.id}',${_sellQty})" ${_sellQty<=0?'disabled':''}>${I18N.t('ui.sellKeepOne',{n:_sellQty,cr:_totalCr.toLocaleString()})}</button>
        </div>
      </div>`;
    }).join('')}
    </div>
  </div>`:'';
  // 화물 카드 렌더러 (특산물·재료 공용)
  const _renderCargoCard=(slot,idx)=>{
    const sp=calcSellPrice(slot,G.currentPlanet),profitPer=sp-slot.buyPrice,profit=profitPer*slot.qty,pC=profit>0?'var(--green)':profit===0?'var(--dim)':'var(--red)';
    const isMixed=!slot.buyPlanetId||slot.buyPlanetId==='mixed';
    const samePlanet=!isMixed&&slot.buyPlanetId===G.currentPlanet;
    const sameFaction=!isMixed&&!samePlanet&&PLANET_DEF.find(p=>p.id===slot.buyPlanetId)?.f===pd?.f;
    const slotComm=COMMODITIES.find(c=>c.id===slot.id);const slotIc=slotComm?.ic||(slotComm?.material?'💎':'📦');
    const bdrCol=samePlanet?'rgba(255,255,255,.1)':sameFaction?'rgba(0,243,255,.35)':profit>0?'rgba(46,204,113,.35)':profit<0?'rgba(255,80,80,.3)':'var(--bdr)';
    const avgNote=isMixed?`<div style="font-size:10px;color:var(--muted)">${I18N.t('ui.avgBuyPrice',{p:slot.buyPrice.toLocaleString()})}</div>`:'';
    const priceLabel=samePlanet
      ?`<div style="font-size:12px;color:var(--yellow);font-weight:bold">${I18N.t('ui.refundPerUnit',{p:sp.toLocaleString()})}</div>
        <div style="font-size:10px;color:var(--dim)">${I18N.t('ui.samePlanetRefundPct')}</div>`
      :`<div style="font-size:13px;color:${pC};font-weight:bold">${I18N.t('ui.perUnitPrice',{p:sp.toLocaleString()})}</div>
        <div style="font-size:10px;color:${pC}">${profit>=0?'+':''}₡${profit.toLocaleString()}</div>
        ${avgNote}`;
    const canSellMore=slot.qty>1;
    // 사용자 요청 2026-06-07: 이미지 2배 (52→104, 컨테이너 70→140), 카드 min-height 126→200
    return `<div style="background:var(--card);border:1px solid ${bdrCol};border-radius:10px;display:flex;flex-direction:row;overflow:hidden;transition:border-color .2s;min-height:200px">
      <div style="background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;padding:10px;position:relative;width:140px;flex-shrink:0;align-self:stretch">
        ${imgOrEmoji(commImgSrc(slot.id),slotIc,104,104,'border-radius:8px;object-fit:cover','comm_'+slot.id)}
        <span style="position:absolute;bottom:4px;left:0;right:0;text-align:center;background:rgba(0,243,255,.25);color:var(--cyan);font-size:11px;padding:2px 0;font-weight:bold">×${slot.qty}</span>
      </div>
      <div style="flex:1;display:flex;flex-direction:column;min-width:0;padding:7px 9px;justify-content:space-between">
        <div>
          <div style="font-size:13px;font-weight:bold;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${commDisplayNm(slot)}">${commDisplayNm(slot)}</div>
          ${priceLabel}
        </div>
        <div style="display:flex;gap:3px;align-items:center;margin-top:4px">
          <button class="btn btn-sm ${samePlanet?'':'btn-gold'}" style="flex:1;font-size:10px;padding:3px 2px;white-space:nowrap${samePlanet?';border-color:var(--yellow);color:var(--yellow)':''}" onclick="sellComm(${idx},1)" title="${samePlanet?I18N.t('shop.refundSamePlanet'):I18N.t('shop.sellAct')}">${samePlanet?I18N.t('shop.refundOne'):I18N.t('shop.sellOne')}</button>
          ${canSellMore?`<button class="btn btn-sm ${samePlanet?'':'btn-gold'}" style="flex:1;font-size:10px;padding:3px 2px;white-space:nowrap${samePlanet?';border-color:var(--yellow);color:var(--yellow)':''}" onclick="sellComm(${idx},${slot.qty})">${samePlanet?I18N.t('ui.sellAllRefund'):I18N.t('ui.sellAllShort')}</button>`:''}
        </div>
      </div>
    </div>`;
  };
  // 사용자 요청: 특산물 / 제작 재료를 위·아래로 분리
  const _withIdx=G.cargo.map((s,i)=>({s,i}));
  const _normalCargo=_withIdx.filter(x=>!x.s.material);
  const _matCargo=_withIdx.filter(x=>x.s.material);
  const _normalHTML=_normalCargo.length>0?`<div style="background:var(--card);border:1px solid var(--bdr);border-radius:8px;padding:10px;margin-bottom:10px">
    <div style="color:var(--cyan);font-size:13px;font-weight:bold;margin-bottom:8px">${I18N.t('shop.cargoOwnedTitle')} <span style="color:var(--dim);font-size:11px;font-weight:normal">${I18N.t('shop.cargoOwnedHint')}</span></div>
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px">${_normalCargo.map(x=>_renderCargoCard(x.s,x.i)).join('')}</div>
  </div>`:'';
  const _matHTML=_matCargo.length>0?`<div style="background:rgba(204,102,255,.05);border:1px solid rgba(204,102,255,.3);border-radius:8px;padding:10px;margin-bottom:10px">
    <div style="color:#cc88ff;font-size:13px;font-weight:bold;margin-bottom:8px">${I18N.t('shop.matOwnedTitle')} <span style="color:var(--dim);font-size:11px;font-weight:normal">${I18N.t('shop.matOwnedHint')}</span></div>
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px">${_matCargo.map(x=>_renderCargoCard(x.s,x.i)).join('')}</div>
  </div>`:'';
  const cargoHTML=(G.cargo.length>0)?(_normalHTML+_matHTML):`<div style="background:var(--card);border:1px dashed var(--bdr);border-radius:8px;padding:14px;margin-bottom:14px;text-align:center;color:var(--dim);font-size:14px">${I18N.t('ui.cargoEmpty')}</div>`;

  const availComm=COMMODITIES.filter(c=>stock[c.id]>0);
  // 사용자 요청 (2026-06-06): 상점 상단에 "높은 금액 순서" 정렬 버튼.
  // 사용자 요청 (2026-06-07): 기본 정렬을 가격 내림차순으로 변경 → 비싼 특산물 우선 노출
  //   _shopSortMode = 'priceDesc' (기본) | 'default' (입고 순)
  const _sortMode=window._shopSortMode||'priceDesc';
  const _byPriceDesc=(a,b)=>(b.buy||0)-(a.buy||0);
  let availNormal=availComm.filter(c=>!c.material);
  let availMat=availComm.filter(c=>c.material);
  if(_sortMode==='priceDesc'){availNormal=availNormal.slice().sort(_byPriceDesc);availMat=availMat.slice().sort(_byPriceDesc);}
  const hasMarco=G.heroes.includes('H08');
  const marcoBonus=hasMarco?`<span style="color:var(--gold);font-size:12px;margin-left:8px">${I18N.t('shop.marcoApplied')}</span>`:'';
  body.innerHTML=`<div style="display:flex;flex-direction:column;height:100%;overflow:hidden">
    ${hubBanner('trade','🏬',I18N.t('shop.planetShop'),pd?.f)}
    <!-- 상단 고정 헤더 -->
    <div style="padding:12px 16px 8px;border-bottom:1px solid rgba(255,255,255,.07);flex-shrink:0">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px">
        <div style="font-size:18px;font-weight:bold;color:var(--cyan);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${I18N.t('shop.galaxyShopHeader',{nm:pd?.nm||''})}</div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <div style="display:flex;align-items:center;gap:6px">
            <span style="color:${totalQty>=MAX?'var(--red)':'var(--dim)'};font-size:13px;font-weight:${totalQty>=MAX?'bold':'normal'}">📦 ${totalQty}/${MAX}</span>
            <div style="width:80px;height:6px;background:rgba(255,255,255,.1);border-radius:3px;overflow:hidden">
              <div style="height:100%;width:${Math.min(100,Math.round(totalQty/Math.max(1,MAX)*100))}%;background:${totalQty>=MAX?'var(--red)':totalQty/MAX>0.8?'var(--yellow)':'var(--green)'};border-radius:3px;transition:width .3s"></div>
            </div>
            ${totalQty>=MAX?`<span style="color:var(--red);font-size:12px;font-weight:bold;animation:pulse 1s infinite">${I18N.t('shop.cargoFull')}</span>`:''}
          </div>
          <button class="btn btn-sm btn-gold" style="font-size:11px;padding:2px 10px" onclick="buyAllComm()">${I18N.t('ui.buyAllShop')}</button>
          <button class="btn btn-sm" style="font-size:11px;padding:2px 8px" onclick="hubTab('ship')">${I18N.t('ui.cargoExpandShortcut')}</button>
        </div>
      </div>
      ${marcoBonus}
    </div>
    <!-- 좌우 분할: 왼쪽=보유 화물, 오른쪽=구매 가능 특산물+제작 재료 -->
    <div style="flex:1;display:flex;flex-direction:row;min-height:0;overflow:hidden">
    <!-- 왼쪽: 보유 화물 -->
    <div data-scroll-id="trade-cargo" style="flex:1;overflow-y:auto;min-height:0;padding:10px 10px 16px 16px;border-right:1px solid rgba(255,255,255,.07);scrollbar-width:thin;scrollbar-color:rgba(0,243,255,.2) transparent">
      ${invSellHTML}
      ${cargoHTML}
    </div>
    <!-- 오른쪽: 구매 가능 특산물 + 제작 재료 -->
    <div data-scroll-id="trade-buy" style="flex:1;overflow-y:auto;min-height:0;padding:10px 14px 16px 10px;scrollbar-width:thin;scrollbar-color:rgba(0,243,255,.2) transparent">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;gap:8px;flex-wrap:wrap">
        <div style="color:var(--cyan);font-size:13px;font-weight:bold;flex:1;min-width:0">${I18N.t('ui.buyableCommHeader')} <span style="color:var(--dim);font-weight:normal;font-size:12px">${I18N.t('tip.outOfStockNoRestock')}</span></div>
        <button onclick="window._shopSortMode=(window._shopSortMode==='priceDesc'?'default':'priceDesc');rerenderTab(renderTradeTab);" style="padding:3px 10px;border:1px solid ${_sortMode==='priceDesc'?'var(--gold)':'var(--bdr)'};background:${_sortMode==='priceDesc'?'rgba(255,215,0,.12)':'transparent'};color:${_sortMode==='priceDesc'?'var(--gold)':'var(--dim)'};cursor:pointer;border-radius:4px;font-size:11px;font-family:Courier New,monospace;flex-shrink:0" title="${I18N.t('ui.sortByPrice')}">${I18N.t('shop.sortPriceDesc')}${_sortMode==='priceDesc'?' ↓':''}</button>
        ${(()=>{const matAvail=availComm.filter(c=>c.material);if(!matAvail.length)return'';return`<span style="background:rgba(212,175,55,.1);border:1px solid rgba(212,175,55,.3);border-radius:5px;padding:2px 8px;font-size:11px;color:var(--gold)">${I18N.t('ui.craftMatsIncluded')}</span>`;})()}
      </div>
      ${availComm.length===0
        ?`<div style="color:var(--dim);font-size:14px;text-align:center;padding:30px 0">${I18N.t('ui.stockGoneMoveOn')}</div>`
        :(()=>{
          // ── 일반 특산물 그리드 ──
          const _commPlv=calcPlayerLevel(),_commRep=G.reputation||0;
          const normalCards=availNormal.map(c=>{
            const qty=stock[c.id]||0;
            const _pLock=(c.buy>=10000&&(_commPlv<60||_commRep<100))||(c.buy>=5000&&(_commPlv<30||_commRep<50));
            const canBuy=G.credits>=c.buy&&totalQty<MAX&&qty>0&&!_pLock;
            const _lockBadge=_pLock?`<div style="font-size:10px;color:var(--purple);font-weight:bold;margin-top:1px">🔒 ${c.buy>=10000?I18N.t('ui.lockPowerHigh'):I18N.t('ui.lockPowerMid')}</div>`:'';
            const isOrigin=c.f===pd?.f;
            const marcoBadge=hasMarco?`<div style="font-size:10px;color:var(--gold);margin-top:2px">${I18N.t('ui.maxSellPrice',{p:Math.floor(c.maxSell*1.1).toLocaleString()})}</div>`:`<div style="font-size:10px;color:var(--dim);margin-top:2px">${I18N.t('ui.maxSellRaw',{p:(c.maxSell||0).toLocaleString()})}</div>`;
            // 사용자 요청 2026-06-07: 이미지 2배 + min-height 확대
            return`<div style="
              background:var(--card);
              border:1px solid ${isOrigin?'rgba(0,243,255,.4)':'var(--bdr)'};
              border-radius:10px;display:flex;flex-direction:row;overflow:hidden;
              transition:border-color .2s;
              min-height:200px;
              ${canBuy?'':'opacity:.55'}
            " onmouseover="this.style.borderColor='${isOrigin?'rgba(0,243,255,.7)':'rgba(0,243,255,.3)'}'" onmouseout="this.style.borderColor='${isOrigin?'rgba(0,243,255,.4)':'var(--bdr)'}'">
              <!-- 이미지 영역 (좌측) — 104×104 (2배) -->
              <div style="background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;padding:10px;position:relative;width:140px;flex-shrink:0;align-self:stretch">
                ${imgOrEmoji(commImgSrc(c.id),c.ic||'📦',104,104,'border-radius:8px;object-fit:cover','comm_'+c.id)}
                ${isOrigin?`<span style="position:absolute;bottom:4px;left:0;right:0;text-align:center;background:rgba(0,243,255,.25);color:var(--cyan);font-size:11px;padding:2px 0;font-weight:bold">${I18N.t('ui.origin')}</span>`:''}
              </div>
              <!-- 정보+버튼 영역 (우측) -->
              <div style="flex:1;display:flex;flex-direction:column;min-width:0;padding:7px 9px;justify-content:space-between">
                <div>
                  <div style="font-size:13px;font-weight:bold;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${commDisplayNm(c)}</div>
                  <div style="font-size:13px;font-weight:bold;color:var(--gold)">₡${c.buy.toLocaleString()}</div>
                  ${_lockBadge}
                  ${marcoBadge}
                  <div style="font-size:10px;color:var(--dim)">${I18N.t('ui.stockQty',{n:qty})}</div>
                </div>
                <div style="display:flex;flex-direction:column;gap:3px;margin-top:4px">
                  <div style="display:flex;gap:3px;align-items:center">
                    <input id="qty_${c.id}" type="number" min="1" max="${qty}" value="1"
                      style="width:40px;padding:2px 3px;background:rgba(255,255,255,.08);border:1px solid rgba(0,243,255,.25);border-radius:4px;color:var(--txt);font-size:11px;text-align:center"
                      ${canBuy?'':'disabled'}>
                    <button class="btn btn-sm btn-green" onclick="buyCommN('${c.id}')" ${canBuy?'':'disabled'}
                      style="flex:1;font-size:11px;padding:3px 6px">${I18N.t('ui.buy')}</button>
                  </div>
                  <button class="btn btn-sm btn-gold" onclick="buyCommMax('${c.id}')" ${canBuy?'':'disabled'}
                    style="font-size:11px;padding:3px 6px;width:100%" title="${I18N.t('ui.allBuyTipCargo')}">${I18N.t('ui.allBuy')}</button>
                </div>
              </div>
            </div>`;
          }).join('');

          // ── 제작 재료 그리드 (특산물 카드와 동일한 가로형 레이아웃) ──
          // 사용자 요청: 헤더와 카드 그리드를 분리해 각각 3열 고정 정렬되도록 처리
          const matHeader=availMat.length===0?'':
            `<div style="color:var(--gold);font-size:12px;font-weight:bold;margin:14px 0 8px">${I18N.t('ui.craftMatsHeader')} <span style="font-weight:normal;color:var(--dim)">${I18N.t('tip.heldInMaterialPanel')}</span></div>`;
          const matCards=availMat.length===0?'':
            availMat.map(c=>{
              const qty=stock[c.id]||0;
              const have=(G.materials&&G.materials[c.id])||0;
              // 제작 재료는 전투력 100·명성 100 이상 필요 (가격 무관 통합 잠금)
              const _matLockBasic=(_commPlv<100||_commRep<100);
              const _matLockHigh=(c.buy>=10000&&(_commPlv<60||_commRep<100))||(c.buy>=5000&&(_commPlv<30||_commRep<50));
              const _matLock=_matLockBasic||_matLockHigh;
              const canBuyMat=G.credits>=c.buy&&qty>0&&!_matLock;
              const _matLockBadge=_matLock?`<div style="font-size:10px;color:var(--purple);font-weight:bold;margin-top:1px">🔒 ${_matLockBasic?I18N.t('ui.matsBasic'):c.buy>=10000?I18N.t('ui.lockPowerHigh'):I18N.t('ui.lockPowerMid')}</div>`:'';
              // 사용자 요청 2026-06-07: 이미지 2배 + min-height 확대
              return`<div style="
                background:rgba(212,175,55,.04);
                border:1px solid ${canBuyMat?'rgba(212,175,55,.4)':'rgba(212,175,55,.15)'};
                border-radius:10px;display:flex;flex-direction:row;overflow:hidden;
                transition:border-color .2s;
                min-height:200px;
                ${canBuyMat?'':'opacity:.5'}
              " onmouseover="this.style.borderColor='rgba(212,175,55,.8)'" onmouseout="this.style.borderColor='${canBuyMat?'rgba(212,175,55,.4)':'rgba(212,175,55,.15)'}'">
                <!-- 이미지 영역 (좌측) — 104×104 (2배) -->
                <div style="background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;padding:10px;position:relative;width:140px;flex-shrink:0;align-self:stretch">
                  ${imgOrEmoji(commImgSrc(c.id),c.ic||'💎',104,104,'border-radius:8px;object-fit:cover','mat_'+c.id)}
                  <span style="position:absolute;bottom:4px;left:0;right:0;text-align:center;background:rgba(212,175,55,.25);color:var(--gold);font-size:11px;padding:2px 0;font-weight:bold">${I18N.t('ui.matsBadge')}</span>
                </div>
                <!-- 정보+버튼 영역 (우측) -->
                <div style="flex:1;display:flex;flex-direction:column;min-width:0;padding:7px 9px;justify-content:space-between">
                  <div>
                    <div style="font-size:13px;font-weight:bold;color:var(--gold);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${commDisplayNm(c)}</div>
                    <div style="font-size:13px;font-weight:bold;color:var(--gold)">₡${c.buy.toLocaleString()}</div>
                    ${_matLockBadge}
                    <div style="font-size:10px;color:var(--dim);margin-top:2px">${I18N.t('ui.ownedQty',{qty:have})}</div>
                    <div style="font-size:10px;color:var(--dim)">${I18N.t('ui.stockQty',{n:qty})}</div>
                  </div>
                  <div style="display:flex;flex-direction:column;gap:3px;margin-top:4px">
                    <div style="display:flex;gap:3px;align-items:center">
                      <input id="qty_${c.id}" type="number" min="1" max="${qty}" value="1"
                        style="width:40px;padding:2px 3px;background:rgba(255,255,255,.08);border:1px solid rgba(212,175,55,.3);border-radius:4px;color:var(--txt);font-size:11px;text-align:center"
                        ${canBuyMat?'':'disabled'}>
                      <button class="btn btn-sm" onclick="buyCommN('${c.id}')" ${canBuyMat?'':'disabled'}
                        style="flex:1;font-size:11px;padding:3px 6px;border-color:var(--gold);color:var(--gold)">${I18N.t('ui.buy')}</button>
                    </div>
                    <button class="btn btn-sm" onclick="buyCommMax('${c.id}')" ${canBuyMat?'':'disabled'}
                      style="font-size:11px;padding:3px 6px;width:100%;border-color:var(--gold);color:var(--gold);background:rgba(212,175,55,.08)" title="${I18N.t('ui.allBuyTipNoCargo')}">${I18N.t('ui.allBuy')}</button>
                  </div>
                </div>
              </div>`;
            }).join('');

          // 사용자 요청 2026-06-07: 1행 2열로 변경 (이미지 2배 적용에 맞춰)
          return`<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px">${normalCards}</div>
            ${matHeader}
            ${matCards?`<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px">${matCards}</div>`:''}`;
        })()
      }
    </div>
    </div>
  </div>`;
}

function buyComm(id,_silent=false){
  const comm=COMMODITIES.find(c=>c.id===id);if(!comm)return;
  // 전투력/명성 기반 고가 특산물 구매 제한
  const _bplv=calcPlayerLevel(),_brep=G.reputation||0;
  // 제작 재료는 전투력 100·명성 100 이상 필요
  if(comm.material&&(_bplv<100||_brep<100)){notify(I18N.t('notify.materialLockedPlrep',{plv:_bplv,rep:_brep}),'err');return;}
  if(comm.buy>=10000&&(_bplv<60||_brep<100)){notify(I18N.t('notify.commodity10kLocked',{plv:_bplv,rep:_brep}),'err');return;}
  if(comm.buy>=5000&&(_bplv<30||_brep<50)){notify(I18N.t('notify.commodity5kLocked',{plv:_bplv,rep:_brep}),'err');return;}
  const stock=G.shopStock[G.currentPlanet];if(!stock||!stock[id]||stock[id]<=0){notify(I18N.t('notify.outOfStock'),'err');return;}
  if(G.credits<comm.buy){notify(I18N.t('notify.notEnoughCredits'),'err');return;}
  // special 아이템: material=재료창, 나머지=인벤토리 (화물창 미사용)
  if(comm.special){
    G.credits-=comm.buy;stock[id]--;
    if(comm.material){
      if(!G.materials)G.materials={};
      G.materials[id]=(G.materials[id]||0)+1;
      // bugfix 2026-06-14: 재료창(G.materials)을 단일 진실로 — 화물 슬롯 수량을 항상 G.materials[id]와 일치.
      //   (기존: 화물칸이 가득 차면 G.materials만 증가하고 cargo 슬롯 미증가 → 제작탭(G.materials)과
      //    거래탭(cargo 슬롯) 표시 갯수 불일치 버그. _validateCargoIntegrity 와 동일하게 슬롯 동기화.)
      const _mEx=G.cargo.find(s=>s.id===id&&s.material);
      if(_mEx){
        _mEx.buyPrice=Math.round((_mEx.buyPrice*_mEx.qty+comm.buy)/(_mEx.qty+1));
        _mEx.buyPlanetId=_mEx.buyPlanetId===G.currentPlanet?G.currentPlanet:'mixed';
        _mEx.qty=G.materials[id];
        if(!_mEx.nm)_mEx.nm=comm.nm;
        if(!_mEx.material)_mEx.material=true;
      } else G.cargo.push({id,nm:comm.nm,qty:G.materials[id],buyPrice:comm.buy,buyPlanetId:G.currentPlanet,buyFaction:PLANET_DEF.find(p=>p.id===G.currentPlanet)?.f,material:true});
      updateHUD();if(!_silent){notify(I18N.t('notify.gotMaterial',{ic:comm.ic||'💎',nm:commDisplayNm(comm),qty:G.materials[id]}),'gold');rerenderTab(renderTradeTab);}
    } else {
      if(!G.inventory)G.inventory=[];
      const inv=G.inventory.find(i=>i.id===id);
      if(inv)inv.qty++;else G.inventory.push({id,nm:comm.nm,qty:1});
      updateHUD();if(!_silent){notify(I18N.t('notify.gotHeroMaterial',{nm:commDisplayNm(comm)}),'gold');rerenderTab(renderTradeTab);}
    }
    // 사용자 보고 2026-06-07 (정직 검증): R-시리즈 material 구매 시도 시나리오 퀘 즉시 평가 누락 버그 수정
    try{if(typeof tickStoryQuests==='function')tickStoryQuests();}catch(e){}
    saveGame(true);return;
  }
  const totalQty=getTotalCargoQty();
  const cargoMax=getCargoMax();
  if(totalQty>=cargoMax){notify(I18N.t('notify.cargoFullN',{n:totalQty,max:cargoMax}),'err');return;}
  // 구매 취소(undo)용 스냅샷 — cargo + stock + 차감된 크레딧 (사용자 요청: 구매 취소 시 이전 상태로)
  const _undoSnap=!_silent?{
    type:'buyCargoSnap',
    cargoSnap:JSON.parse(JSON.stringify(G.cargo)),
    stockKey:id,
    planetId:G.currentPlanet,
    credits:comm.buy,
    label:`${comm.ic||'📦'} ${commDisplayNm(comm)}`
  }:null;
  G.credits-=comm.buy;stock[id]--;
  const ex=G.cargo.find(s=>s.id===id);
  if(ex){
    ex.buyPrice=Math.round((ex.buyPrice*ex.qty+comm.buy)/(ex.qty+1));
    ex.buyPlanetId=ex.buyPlanetId===G.currentPlanet?G.currentPlanet:'mixed';
    ex.buyFaction=ex.buyFaction===PLANET_DEF.find(p=>p.id===G.currentPlanet)?.f?ex.buyFaction:'mixed';
    ex.qty++;
  } else {
    G.cargo.push({id,nm:comm.nm,qty:1,buyPrice:comm.buy,buyPlanetId:G.currentPlanet,buyFaction:PLANET_DEF.find(p=>p.id===G.currentPlanet)?.f});
  }
  // 사용자 보고 2026-06-07: 시나리오 퀘 자원 즉시 반영 (퀘 탭 안 들어가도 완료 처리)
  try{if(typeof tickStoryQuests==='function')tickStoryQuests();}catch(e){}
  if(!_silent)saveGame(true);
  if(_undoSnap)try{_recordSell(_undoSnap);}catch(e){}
  updateHUD();if(!_silent){notify(I18N.t('notify.commBuyProgress',{nm:commDisplayNm(comm),n:totalQty+1,max:cargoMax}),'ok');rerenderTab(renderTradeTab);}
}
function buyCargoItem(id){
  const ci=CARGO_ITEMS.find(function(c){return c.id===id;});
  if(!ci){notify(I18N.t('notify.noItemInfo'),'err');return;}
  if(ci.quest){notify(I18N.t('notify.questRewardItem'),'err');return;}
  const stock=G.shopStock[G.currentPlanet];
  if(!stock||!stock['cargo_'+id]||stock['cargo_'+id]<=0){notify(I18N.t('notify.outOfStock'),'err');return;}
  if(G.credits<ci.price){notify(I18N.t('notify.needCreditsCost',{cost:ci.price.toLocaleString()}),'err');return;}
  // 인벤토리 슬롯 체크 (hero/legend는 2칸)
  const invSlotUsed=(G.inventory||[]).reduce(function(s,iv){
    const p=PARTS.find(function(p){return p.id===iv.id;});
    const cc=CARGO_ITEMS.find(function(c){return c.id===iv.id;});
    const sz=cc?cc.size:(p&&(p.rarity==='hero'||p.rarity==='legend'||p.rarity==='mythic')?2:1);
    return s+sz*(iv.qty||1);
  },0);
  const invSlotMax=30;
  if(invSlotUsed+ci.size>invSlotMax){notify(I18N.t('notify.invSpaceLow'),'err');return;}
  G.credits-=ci.price;
  stock['cargo_'+id]--;
  const ex=G.inventory.find(function(i){return i.id===ci.id;});
  if(ex)ex.qty++;
  else G.inventory.push({id:ci.id,qty:1});
  updateHUD();
  notify(I18N.t('notify.partsBuy',{ic:ci.ic,nm:partDisplayNm(ci)||ci.nm,slots:ci.slots}),'ok');
  if(G._currentHubTab==='ship'||G._currentHubTab==='garage')rerenderShipOrGarage();
  saveGame(true);
}
function buyComm5(id){let bought=0;for(let i=0;i<5;i++){const total=getTotalCargoQty();if(total>=getCargoMax()||!G.shopStock[G.currentPlanet]?.[id]||G.shopStock[G.currentPlanet][id]<=0||G.credits<(COMMODITIES.find(c=>c.id===id)?.buy||0))break;buyComm(id,true);bought++;}if(bought>0){const comm=COMMODITIES.find(c=>c.id===id);notify(I18N.t('notify.commBulk',{nm:(comm?commDisplayNm(comm):'')||id,n:bought}),'ok');rerenderTab(renderTradeTab);saveGame(true);}}
function buyCommN(id){
  const inp=document.getElementById('qty_'+id);
  const n=Math.max(1,parseInt(inp?.value)||1);
  let bought=0;
  for(let i=0;i<n;i++){
    const total=getTotalCargoQty();
    const stock=G.shopStock[G.currentPlanet];
    const comm=COMMODITIES.find(c=>c.id===id);
    if(!comm)break;
    if(total>=getCargoMax()&&!comm.material){notify(I18N.t('notify.cargoFull'),'err');break;}
    if(!stock?.[id]||stock[id]<=0){notify(I18N.t('notify.outOfStockShort'),'err');break;}
    if(G.credits<comm.buy){notify(I18N.t('notify.notEnoughCredits'),'err');break;}
    buyComm(id,true);bought++;
  }
  if(bought>0){const comm=COMMODITIES.find(c=>c.id===id);notify(I18N.t('notify.commBulk',{nm:(comm?commDisplayNm(comm):'')||id,n:bought}),'ok');rerenderTab(renderTradeTab);saveGame(true);}
}
// 단일 특산물 전체구매 — 해당 행성의 재고/크레딧/화물칸 한도까지 한 번에 구매
function buyCommMax(id){
  const stock=G.shopStock[G.currentPlanet];
  const comm=COMMODITIES.find(c=>c.id===id);
  if(!comm||!stock?.[id]||stock[id]<=0){notify(I18N.t('notify.outOfStock'),'err');return;}
  let bought=0,blockedReason='';
  while(true){
    if(!stock[id]||stock[id]<=0){blockedReason=blockedReason||I18N.t('shop.outOfStock');break;}
    if(G.credits<comm.buy){blockedReason=blockedReason||I18N.t('shop.shortCredits');break;}
    const total=getTotalCargoQty();
    if(!comm.material&&total>=getCargoMax()){blockedReason=blockedReason||I18N.t('shop.cargoFullReason');break;}
    buyComm(id,true);bought++;
    if(bought>=1000)break;  // 안전장치 (무한루프 방지)
  }
  if(bought>0){
    const totalCost=bought*comm.buy;
    notify(I18N.t('notify.commBulkBuy',{nm:commDisplayNm(comm),n:bought,cost:totalCost.toLocaleString(),reason:blockedReason?' · '+blockedReason:''}),'ok');
    rerenderTab(renderTradeTab);saveGame(true);
  } else {
    notify(I18N.t('notify.buyBlocked',{reason:blockedReason}),'err');
  }
}
function buyAllComm(){
  // 현재 행성 모든 특산물 일괄 구매 (최대 화물칸/크레딧 한도)
  const stock=G.shopStock[G.currentPlanet];
  if(!stock)return;
  let total=0;
  COMMODITIES.filter(c=>stock[c.id]>0).forEach(c=>{
    let bought=0;
    let prevStock=stock[c.id]||0,prevCredits=G.credits;
    while(bought<1000){  // 안전 카운터 (잠금 상품/예상치 못한 케이스 대비 무한루프 방지)
      const cur=getTotalCargoQty();
      if(!c.material&&cur>=getCargoMax())break;
      if(!stock[c.id]||stock[c.id]<=0)break;
      if(G.credits<c.buy)break;
      buyComm(c.id,true);
      // buyComm이 잠금/실패로 stock/credits 변동 없으면 break (무한루프 차단)
      if(stock[c.id]===prevStock&&G.credits===prevCredits)break;
      prevStock=stock[c.id];prevCredits=G.credits;
      bought++;
    }
    total+=bought;
  });
  if(total>0){notify(I18N.t('notify.commBulkTotal',{n:total}),'ok');rerenderTab(renderTradeTab);saveGame(true);}
  else notify(I18N.t('notify.noCommToBuy'),'err');
}
// 인벤토리 특수 아이템(난중일기 영인본 등) 판매 — 영입 보존용 1개는 항상 잔존 (사용자 명세)
function sellInventoryItem(id, qty){
  if(!G.inventory)G.inventory=[];
  const inv=G.inventory.find(i=>i.id===id);
  if(!inv||inv.qty<=0){notify(I18N.t('notify.noOwnedQty'),'err');return;}
  if(inv.qty<=1){notify(I18N.t('notify.keepLastMaterial'),'warn');return;}
  const sellable=Math.min(Math.max(1,qty|0),inv.qty-1);
  if(sellable<=0){notify(I18N.t('notify.noSellableQty'),'warn');return;}
  const comm=COMMODITIES.find(c=>c.id===id);
  if(!comm){notify(I18N.t('notify.unknownItem'),'err');return;}
  // 가격: maxSell (영입 재료 가치 — 최대가) × 마르코폴로 보너스
  const marcoMult=(G.heroes&&G.heroes.includes('H08'))?1.20:1.0;
  const unitPrice=Math.floor((comm.maxSell||comm.buy||0)*marcoMult);
  const total=unitPrice*sellable;
  inv.qty-=sellable;
  G.credits=(G.credits||0)+total;
  notify(I18N.t('notify.commSellWithReserve',{nm:commDisplayNm(comm),n:sellable,cr:total.toLocaleString(),keep:inv.qty}),'gold');
  try{updateHUD();saveGame(true);rerenderTab(renderTradeTab);}catch(e){}
}
try{if(typeof window!=='undefined')window.sellInventoryItem=sellInventoryItem;}catch(e){}

function sellComm(idx,qty){
  const slot=G.cargo[idx];if(!slot||slot.qty<qty)return;
  const commDef=COMMODITIES.find(c=>c.id===slot.id);
  if(commDef?.special){
    if(commDef.material){
      // 재료 판매가:
      //  ① 매입한 행성: 매입가 × 0.8 (환불)
      //  ② 다른 행성(어디든): 구매가 × 3.0 (3배 차익)
      //  사용자 보고 (2026-06-06): 함선 교체 후 buyPrice 누락·buyPlanetId='unknown'
      //  으로 sellPriceRaw가 0이 되어 매각이 차단되는 현상. 폴백 강화.
      const _atSame=slot.buyPlanetId===G.currentPlanet;
      let sellPriceRaw, _label;
      if(_atSame){
        sellPriceRaw=Math.floor((slot.buyPrice||commDef.buy||0)*0.8);
        _label=I18N.t('shop.refundLabel');
      } else {
        sellPriceRaw=Math.floor((commDef.buy||slot.buyPrice||0)*3.0);
        _label=I18N.t('shop.otherPlanetPremium');
      }
      // 폴백: 위 두 공식 모두 0이면 calcSellPrice의 재료 70% 공식으로 최소 보장
      if(!sellPriceRaw){
        sellPriceRaw=Math.floor((commDef.buy||slot.buyPrice||0)*0.7);
        if(!sellPriceRaw){notify(I18N.t('notify.materialCantSell'),'err');return;}
      }
      const sellQty=qty||1;
      if(G.materials&&G.materials[slot.id]){G.materials[slot.id]=Math.max(0,(G.materials[slot.id]||0)-sellQty);}
      slot.qty-=sellQty;if(slot.qty<=0)G.cargo.splice(idx,1);
      G.credits+=sellPriceRaw*sellQty;
      updateHUD();notify(I18N.t('notify.materialSold',{nm:commDisplayNm(commDef),n:sellQty,cr:(sellPriceRaw*sellQty).toLocaleString(),label:_label}),'gold');
      rerenderTab(renderTradeTab);saveGame(true);return;
    }
    // 사용자 요청: 영입 재료(난중일기 영인본 G18 등 special, !material) — 1개 보존 후 판매 허용
    //  · cargo + inventory 합산 보유량이 1 초과일 때만, 초과분만큼 매각
    //  · 가격: comm.maxSell × 마르코폴로 보너스
    const _invQty=sumQtyById(G.inventory,slot.id);
    const _cargoQty=sumQtyById(G.cargo,slot.id);
    const _total=_invQty+_cargoQty;
    if(_total<=1){notify(I18N.t('notify.keepLastMaterial'),'warn');return;}
    const _sellable=Math.min(qty||1,_total-1,slot.qty);
    if(_sellable<=0){notify(I18N.t('notify.noSellableQtyKeep'),'warn');return;}
    const _marcoMult=(G.heroes&&G.heroes.includes('H08'))?1.20:1.0;
    const _unit=Math.floor((commDef.maxSell||commDef.buy||0)*_marcoMult);
    const _gain=_unit*_sellable;
    slot.qty-=_sellable;if(slot.qty<=0)G.cargo.splice(idx,1);
    G.credits=(G.credits||0)+_gain;
    notify(I18N.t('notify.sellPartial',{nm:commDisplayNm(commDef),n:_sellable,cr:_gain.toLocaleString(),rem:_total-_sellable}),'gold');
    updateHUD();rerenderTab(renderTradeTab);saveGame(true);return;
  }
  const sp=calcSellPrice(slot,G.currentPlanet),profit=(sp-slot.buyPrice)*qty;
  // 매각 취소용 카고 스냅샷 (슬롯 변경 직전)
  const _cargoSnap=JSON.parse(JSON.stringify(G.cargo));
  const _commLabel=I18N.t('shop.commQtyLabel',{nm:commDef?commDisplayNm(commDef):slot.id,qty});
  G.credits+=sp*qty;slot.qty-=qty;if(slot.qty===0)G.cargo.splice(idx,1);
  try{_recordSell({type:'cargoSnap',cargoSnap:_cargoSnap,credits:sp*qty,label:_commLabel});}catch(e){}
  // 상점 거래 수익 10만 이상 시 명성 +1 (상거래 평판 보상)
  let _repBonusMsg='';
  if(profit>=100000){
    changeReputation(1);
    _repBonusMsg=I18N.t('shop.bulkBonus');
  }
  updateHUD();notify(profit>0?I18N.t('notify.sellWithProfit',{total:(sp*qty).toLocaleString(),profit:profit.toLocaleString(),bonus:_repBonusMsg}):I18N.t('notify.sellNoProfit',{total:(sp*qty).toLocaleString()}),'gold');
  rerenderTab(renderTradeTab);saveGame(true);
}

// window 전역 노출
window.generateShopStock=generateShopStock;
window._restockMissingParts=_restockMissingParts;
window._restockCommodities=_restockCommodities;
window.renderTradeTab=renderTradeTab;
window.buyComm=buyComm;
window.buyComm5=buyComm5;
window.buyCommN=buyCommN;
window.buyCommMax=buyCommMax;
window.sellComm=sellComm;
window.buyAllComm=buyAllComm;  // bugfix 2026-06-11: onclick="buyAllComm()" referenced but not exposed (ReferenceError, dead button)
console.log('[render-trade-tab] Loaded — 10 functions exposed');
})();
