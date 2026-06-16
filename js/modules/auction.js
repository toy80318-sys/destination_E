// ══════════════════════════════════════════════════════════════════
// AUCTION 모듈 — game.js에서 분할 (2026-06-08, v1.0.0-beta.88)
//   · 행성 경매 — 입찰/즉시 구매/명성 기반 최대 보유 행성 수
// 의존: window.G, window.I18N, window.PLANET_DEF, window.updateHUD,
//       window.openModal, window.closeModal, window.notify, window.baekgu,
//       window.saveGame, window.rerenderTab, window._GAME_VER
// ══════════════════════════════════════════════════════════════════
(function(){
  if(typeof window==='undefined')return;
  // ═══ AUCTION ═════════════════════════════════════════════════════
  // 행성 보유 한도: 기본 1 + 명성 10당 +1 (다른 제한 없음)
  function _maxOwnedPlanets(){return 1+Math.floor((G.reputation||0)/10);}
  function _auctBidsLeft(){
    if((G.auctionBidTurn||-1)!==G.turn){G.auctionBids=0;G.auctionBidTurn=G.turn;}
    return Math.max(0,2-(G.auctionBids||0));
  }
  function _hasAllMythicParts(){
    // 인벤토리에 있거나 함선에 장착된 경우 모두 체크
    return QUEST_MYTHIC_PARTS.every(pid=>
      (G.inventory||[]).some(i=>i.id===pid&&i.qty>0)||
      (G.fleet||[]).some(sh=>(sh.parts||[]).includes(pid))
    );
  }
  function _hasLegendaryFlagship(){
    // 신화 함선 보유 시 해금 (LGD01·02·03 또는 신화 등급 함선 어떤 것이든)
    return (G.fleet||[]).some(sh=>sh.tier==='신화'||sh.tier==='전설기함');
  }
  // ── 행성 경매 가격 계산 ──────────────────────────────────────────────
  //   사용자 요청 (2026-06):
  //     • 즉시구매가(instBid) = 종전 대비 1.5배 인상
  //     • 최저입찰가(minBid)  = 즉시구매가 × 0.3 (70% 더 저렴 — 최저가부터 입찰 가능)
  //   행성 유형별 배율
  //     • 일반:   tax × 8 × auctDiff × disc × 0.8 × 1   → 즉시구매 ×1.3×1.5 → 최저 ×0.3
  //     • 적대:   동일 베이스 × 2.5
  //     • 보이드: 동일 베이스 × 5 (즉시구매 ×1.4×1.5)
  function _calcAuctionPrices(p,auctDiff,gwanggaetoDisc){
    const mult=p.void?5:p.hostile?2.5:1;
    const instPremium=(p.void?1.4:1.3)*1.5;  // ×1.5 — 사용자 요청
    const baseRef=Math.floor(p.tax*8*auctDiff*gwanggaetoDisc*0.8*mult);
    const instBid=Math.floor(baseRef*instPremium);
    const minBid =Math.floor(instBid*0.3);   // 30% — 사용자 요청 (70% 할인 최저 입찰)
    return {minBid,instBid};
  }
  function renderAuctionView(body){
    const auctDiff={easy:1.05,normal:1.15,hard:1.22,extreme:1.30}[G.difficulty]||1.15;
    const gwanggaetoDisc=G.heroes.includes('H03')?0.70:1.0; // 광개토대왕: 경매가 30% 할인
    const bidsLeft=_auctBidsLeft();
    const _ownedCnt2=Object.values(G.planets).filter(p=>p.owned).length;
    const _maxPlanets2=_maxOwnedPlanets();
    const _planetsAtLimit=_ownedCnt2>=_maxPlanets2;
    const avail=PLANET_DEF.filter(p=>{const st=G.planets[p.id];return st&&st.fog==='A'&&!st.owned&&!p.hostile&&!p.void&&p.id!==G.currentPlanet;});
    const wonNames=new Set((G.combatHistory||[]).filter(c=>c.win).map(c=>c.planet));
    // 적대 행성(치크스 등) 경매 조건 완화:
    //   • 탐험됨(fog A/S) — 인접 행성 방문으로 위치 파악된 적대 행성은 모두 경매 가능
    //   • OR 전투 승리 기록 있음 (기존 호환)
    //   • OR hostile_cleared (전략 합병)
    //   • OR ACT 4 진입
    // ※ 미탐험(fog L) 행성은 여전히 경매 노출 안 됨
    const hostileAvail=PLANET_DEF.filter(p=>{
      const st=G.planets[p.id];
      if(!st||!p.hostile||p.void||st.owned)return false;
      const discovered=st.fog==='A'||st.fog==='S';
      const cleared=!!st.hostile_cleared;
      const won=wonNames.has(p.nm);
      return discovered||cleared||won||G.act>=4;
    });
    // 보이드 행성 경매 — 사용자 요청 (don.png 참고): 조건 완화
    //   기존: 신화 파츠 4종 모두 + 전설기함 둘 다 필요 (너무 엄격해 게임 후반에도 불가능)
    //   변경: 탐험된 보이드 행성(fog A/S)이면 항상 경매 가능
    //         · 신화 파츠/전설기함 보유 시 약간 할인 (canBuyVoid 플래그는 가격 조정용 유지)
    //         · 가격은 voidCard에서 ×5 배율 유지 → 가격으로 진입장벽 균형
    const canBuyVoid=_hasAllMythicParts()&&_hasLegendaryFlagship();
    const voidAvail=PLANET_DEF.filter(p=>{
      const st=G.planets[p.id];
      if(!st||!p.void||st.owned)return false;
      return st.fog==='A'||st.fog==='S';   // 탐험된 보이드 행성만 노출
    });
    function normalCard(p){
      const f=FACTION[p.f];
      const {minBid:startBid,instBid}=_calcAuctionPrices(p,auctDiff,gwanggaetoDisc);
      const roi=Math.round(startBid/p.tax);
      const dis=(bidsLeft<=0||_planetsAtLimit)?'disabled':'';
      return `<div class="pl-item" style="flex-direction:row;align-items:stretch;overflow:hidden;padding:0;min-height:130px">
        <!-- 좌측: 정보 + 버튼 -->
        <div style="flex:1;padding:12px;display:flex;flex-direction:column;justify-content:space-between;gap:6px;min-width:0">
          <div>
            <div style="font-size:16px;font-weight:bold">${p.nm}</div>
            <div style="font-size:12px;color:${f.col};margin-top:2px">${I18N.t('ui.fleetSegBadge',{nm:f.nm,ring:p.ring})}</div>
            <div style="font-size:12px;color:var(--dim);margin-top:3px">${I18N.t('ui.taxRoi',{tax:p.tax.toLocaleString(),roi})}</div>
            <div style="font-size:12px;margin-top:3px">${I18N.t('ui.startingPrice')} <span style="color:var(--cyan)">₡${startBid.toLocaleString()}</span> ${I18N.t('ui.instantPrefix')}<span style="color:var(--gold)">₡${instBid.toLocaleString()}</span></div>
          </div>
          <div style="display:flex;gap:5px;align-items:center;flex-wrap:wrap">
            <button class="btn btn-sm btn-gold" onclick="doBid('${p.id}',${instBid},true)" ${G.credits>=instBid&&bidsLeft>0&&!_planetsAtLimit?'':'disabled'} title="100% 낙찰 확정" style="white-space:nowrap;font-size:11px;padding:4px 8px">${I18N.t('ui.instantWin')}<br>₡${instBid.toLocaleString()}</button>
            <button class="btn btn-sm" style="border-color:var(--cyan);color:var(--cyan);white-space:nowrap;font-size:11px;padding:4px 8px" onclick="customBid('${p.id}',${startBid})" ${G.credits>=startBid&&bidsLeft>0&&!_planetsAtLimit?'':'disabled'}>${I18N.t('ui.directBidProb')}</button>
            <input class="inp" type="number" id="bid-${p.id}" placeholder="${I18N.t('ui.bidMinPlaceholder',{n:startBid.toLocaleString()})}" min="${startBid}" style="width:80px;height:28px;font-size:11px">
          </div>
        </div>
        <!-- 우측: 행성 이미지 꽉채움 -->
        <div style="width:110px;flex-shrink:0;overflow:hidden;background:#050a1a">
          <img src="${planetImgSrc(p.id)}" style="width:100%;height:100%;object-fit:cover;opacity:.85"
            onerror="this.style.display='none'">
        </div>
      </div>`;
    }
    function hostileCard(p){
      const f=FACTION[p.f];
      const {minBid:startBid,instBid}=_calcAuctionPrices(p,auctDiff,gwanggaetoDisc);
      const roi=Math.round(startBid/p.tax);
      const dis=(bidsLeft<=0||_planetsAtLimit)?'disabled':'';
      return `<div class="pl-item" style="flex-direction:row;align-items:stretch;overflow:hidden;padding:0;border-color:#8b00ff88;background:rgba(139,0,255,.06);min-height:130px">
        <!-- 좌측: 정보 + 버튼 -->
        <div style="flex:1;padding:12px;display:flex;flex-direction:column;justify-content:space-between;gap:6px;min-width:0">
          <div>
            <div style="font-size:16px;font-weight:bold;color:#cc66ff">${p.nm} <span style="font-size:11px;background:#8b00ff33;border:1px solid #8b00ff66;padding:1px 5px;border-radius:6px">${I18N.t('ui.mergeBadge')}</span></div>
            <div style="font-size:12px;color:${f.col};margin-top:2px">${I18N.t('ui.factionFleetSeg',{nm:f.nm,ring:p.ring})}</div>
            <div style="font-size:12px;color:var(--dim);margin-top:3px">${I18N.t('ui.taxRoi',{tax:p.tax.toLocaleString(),roi})}</div>
            <div style="font-size:12px;margin-top:3px">${I18N.t('ui.startingPrice')} <span style="color:#cc66ff">₡${startBid.toLocaleString()}</span> ${I18N.t('ui.instantPrefix')}<span style="color:var(--gold)">₡${instBid.toLocaleString()}</span></div>
            <div style="font-size:11px;color:#cc66ff;margin-top:2px">${I18N.t('ui.mergedSafeVisit')}</div>
          </div>
          <div style="display:flex;gap:5px;align-items:center;flex-wrap:wrap">
            <button class="btn btn-sm" style="border-color:#8b00ff;color:#cc66ff;background:rgba(139,0,255,.12);white-space:nowrap;font-size:11px;padding:4px 8px" onclick="doBid('${p.id}',${instBid},true)" ${G.credits>=instBid&&bidsLeft>0&&!_planetsAtLimit?'':'disabled'}>${I18N.t('ui.instantMerge')}<br>₡${instBid.toLocaleString()}</button>
            <button class="btn btn-sm" style="border-color:#8b00ff;color:#cc66ff;white-space:nowrap;font-size:11px;padding:4px 8px" onclick="customBid('${p.id}',${startBid})" ${G.credits>=startBid&&bidsLeft>0&&!_planetsAtLimit?'':'disabled'}>${I18N.t('ui.directBidProb')}</button>
            <input class="inp" type="number" id="bid-${p.id}" placeholder="${I18N.t('ui.bidMinPlaceholder',{n:startBid.toLocaleString()})}" min="${startBid}" style="width:80px;height:28px;font-size:11px">
          </div>
        </div>
        <!-- 우측: 행성 이미지 꽉채움 -->
        <div style="width:110px;flex-shrink:0;overflow:hidden;background:#0a0518">
          <img src="${planetImgSrc(p.id)}" style="width:100%;height:100%;object-fit:cover;opacity:.8"
            onerror="this.style.display='none'">
        </div>
      </div>`;
    }
    // 보이드 카드 (치크스 2배 세금, 5배 배율 투자)
    function voidCard(p){
      // 보이드: 치크스(25000)의 2배 세율(50000) × 5배 배율 입찰 (치크스 2.5× → 보이드 5×)
      //  · 사용자 요청 (2026-06): 즉시구매 ×1.5, 최저입찰 = 즉시구매 ×0.3 (_calcAuctionPrices 일괄 처리)
      const {minBid:startBid,instBid}=_calcAuctionPrices(p,auctDiff,gwanggaetoDisc);
      const roi=Math.round(startBid/p.tax);
      return `<div class="pl-item" style="flex-direction:row;align-items:stretch;overflow:hidden;padding:0;border-color:rgba(0,243,255,.5);background:rgba(0,243,255,.05);min-height:130px">
        <div style="flex:1;padding:12px;display:flex;flex-direction:column;justify-content:space-between;gap:6px;min-width:0">
          <div>
            <div style="font-size:16px;font-weight:bold;color:var(--cyan)">${p.nm} <span style="font-size:11px;background:rgba(0,243,255,.12);border:1px solid rgba(0,243,255,.4);padding:1px 5px;border-radius:6px">${I18N.t('ui.fissureZoneChip')}</span></div>
            <div style="font-size:12px;color:var(--cyan);margin-top:2px">${I18N.t('ui.voidRingFissure',{n:p.ring})}</div>
            <div style="font-size:12px;color:var(--dim);margin-top:3px">${I18N.t('ui.taxAndROI',{tax:p.tax.toLocaleString(),roi})}</div>
            <div style="font-size:12px;margin-top:3px">${I18N.t('ui.startingPrice')} <span style="color:var(--cyan)">₡${startBid.toLocaleString()}</span> ${I18N.t('ui.instantPrefix')}<span style="color:var(--gold)">₡${instBid.toLocaleString()}</span></div>
            <div style="font-size:11px;color:rgba(0,243,255,.6);margin-top:2px">${canBuyVoid?I18N.t('ui.voidPremiumDiscountAvail'):I18N.t('ui.voidExploredAuction')}</div>
          </div>
          <div style="display:flex;gap:5px;align-items:center;flex-wrap:wrap">
            <button class="btn btn-sm" style="border-color:var(--cyan);color:var(--cyan);background:rgba(0,243,255,.12);white-space:nowrap;font-size:11px;padding:4px 8px" onclick="doBid('${p.id}',${instBid},true)" ${G.credits>=instBid&&bidsLeft>0&&!_planetsAtLimit?'':'disabled'}>${I18N.t('ui.instantWin')}<br>₡${instBid.toLocaleString()}</button>
            <button class="btn btn-sm" style="border-color:rgba(0,243,255,.5);color:var(--cyan);white-space:nowrap;font-size:11px;padding:4px 8px" onclick="customBid('${p.id}',${startBid})" ${G.credits>=startBid&&bidsLeft>0&&!_planetsAtLimit?'':'disabled'}>${I18N.t('ui.directBidProb')}</button>
            <input class="inp" type="number" id="bid-${p.id}" placeholder="${I18N.t('ui.bidMinPlaceholder',{n:startBid.toLocaleString()})}" min="${startBid}" style="width:90px;height:28px;font-size:11px">
          </div>
        </div>
        <div style="width:110px;flex-shrink:0;overflow:hidden;background:#050a1a">
          <img src="${planetImgSrc(p.id)}" style="width:100%;height:100%;object-fit:cover;opacity:.75" onerror="this.style.display='none'">
        </div>
      </div>`;
    }
    const noNormal=avail.length===0,noHostile=hostileAvail.length===0,noVoid=voidAvail.length===0;
    // 신화 파츠 보유 현황 표시
    const mythicStatus=QUEST_MYTHIC_PARTS.map(pid=>{
      const p=partById(pid);
      const has=(G.inventory||[]).some(i=>i.id===pid&&i.qty>0)||(G.fleet||[]).some(sh=>(sh.parts||[]).includes(pid));
      const _pn=(p?partDisplayNm(p):'')||p?.nm||pid;
      return `<span style="color:${has?'var(--green)':'var(--dim)'}">■${_pn.replace(I18N.t('codex.mythicSuffix'),'').replace(I18N.t('codex.mythicSuffix2'),'')}</span>`;
    }).join('&nbsp;');
    const hasFlag=_hasLegendaryFlagship();
    // 좌측: 내 보유 행성 카드 리스트
    const ownedList=PLANET_DEF.filter(p=>G.planets[p.id]?.owned);
    const ownedCardHtml=ownedList.length===0
      ? `<div style="background:var(--card);border:1px dashed var(--bdr);border-radius:8px;padding:24px;text-align:center;color:var(--dim);font-size:13px">${I18N.t('ui.noOwnedPlanets')}<br><span style="font-size:11px">${I18N.t('ui.bidFromRight')}</span></div>`
      : ownedList.map(p=>{
          const st=G.planets[p.id],f=FACTION[p.f],lv=st.commerce||0;
          const tax=calcTaxFor(p.id),investCost=Math.floor(_planetBaseTax(p)*7.2*Math.pow(1.548,lv)*(1+G.act/2)*0.56);
          const pBg=p.hostile?'#1a0505':p.void?'#0a0518':'#0a1828';
          return `<div style="background:var(--card);border:1px solid var(--gold);border-radius:10px;overflow:hidden;display:flex;flex-direction:row;min-height:110px">
            <div style="width:80px;flex-shrink:0;overflow:hidden;background:${pBg}">
              <img src="${planetImgSrc(p.id)}" style="width:100%;height:100%;object-fit:cover;opacity:.9" onerror="this.style.display='none'">
            </div>
            <div style="flex:8;padding:8px 10px;display:flex;flex-direction:column;gap:3px;min-width:0">
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                <span style="font-size:13px;font-weight:bold;color:var(--gold);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.nm}</span>
                <span style="font-size:9px;color:${f.col};border:1px solid ${f.col};border-radius:3px;padding:0 4px">${f.nm}</span>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:11px"><span style="color:var(--dim)">${I18N.t('ui.commerceLv')}</span><span style="color:var(--gold);font-weight:bold">${lv}/10</span></div>
              <div style="height:4px;background:var(--panel);border-radius:2px;overflow:hidden"><div style="width:${lv*10}%;height:100%;background:linear-gradient(90deg,var(--gold),#ffaa00)"></div></div>
              <div style="font-size:11px;color:var(--green);font-weight:bold;margin-top:auto">${I18N.t('ui.taxPerTurnLine',{cr:tax.toLocaleString()})}</div>
            </div>
            <!-- #6: 투자 버튼 → 카드 우측 8:2 지점 직사각형(full-height) (사용자 요청 2026-06-16) -->
            ${lv<10
              ? `<button class="btn btn-gold" style="flex:2;flex-shrink:0;border-radius:0;border:0;border-left:1px solid var(--gold);font-size:10px;padding:4px;white-space:normal;line-height:1.3;display:flex;align-items:center;justify-content:center;text-align:center" onclick="investPlanet('${p.id}')" ${G.credits>=investCost?'':'disabled'}>${I18N.t('ui.invest',{lv:lv+1,cost:investCost.toLocaleString()})}</button>`
              : `<div style="flex:2;flex-shrink:0;border-left:1px solid var(--gold);display:flex;align-items:center;justify-content:center;font-size:10px;color:var(--gold);text-align:center;padding:4px">${I18N.t('ui.maxLevel')}</div>`}
          </div>`;
        }).join('');
    const totalTax=ownedList.reduce((s,p)=>s+calcTaxFor(p.id),0);
    const ownedPanel=`<div style="display:flex;flex-direction:column;height:100%;min-height:0">
      <div style="background:rgba(212,175,55,.06);border:1px solid rgba(212,175,55,.3);border-radius:8px;padding:8px 10px;margin-bottom:10px;flex-shrink:0">
        <div style="font-size:13px;font-weight:bold;color:var(--gold);margin-bottom:3px">${I18N.t('ui.myOwnedPlanets',{n:ownedList.length,max:_maxPlanets2})}</div>
        <div style="font-size:11px;color:var(--green)">${I18N.t('ui.totalTaxIncome',{n:totalTax.toLocaleString()})}</div>
      </div>
      <div data-scroll-id="auct-owned" style="flex:1;overflow-y:auto;min-height:0;display:grid;grid-template-columns:1fr;align-content:start;gap:8px;padding-right:4px;scrollbar-width:thin;scrollbar-color:rgba(212,175,55,.3) transparent">${ownedCardHtml}</div>
    </div>`;
    // 우측: 입찰 중 행성 (기존 카드들)
    const biddingHtml=`<div style="display:flex;flex-direction:column;height:100%;min-height:0">
      <div style="background:rgba(212,175,55,.07);border:1px solid rgba(212,175,55,.25);border-radius:6px;padding:8px 10px;font-size:11px;color:var(--dim);margin-bottom:10px;line-height:1.6;flex-shrink:0">
        ${I18N.t('ui.auctionHintLine1',{inst:I18N.t('ui.instantWin'),dir:I18N.t('ui.directBidShort')})}<br>
        ${I18N.t('ui.auctionHintLine2',{diff:{easy:I18N.t('ui.diffEasyPlus'),normal:I18N.t('ui.diffNormalPlus'),hard:I18N.t('ui.diffHardPlus'),extreme:I18N.t('ui.diffExtremePlus')}[G.difficulty]||I18N.t('ui.diffNormalPlus')})}
      </div>
      ${G.heroes.includes('H03')?`<div style="background:rgba(255,215,0,.06);border:1px solid rgba(255,215,0,.25);border-radius:6px;padding:6px 10px;font-size:11px;color:var(--gold);margin-bottom:8px;flex-shrink:0">${I18N.t('ui.gwanggaetoEffect')}</div>`:''}
      ${bidsLeft<=0?`<div style="background:rgba(255,60,60,.07);border:1px solid rgba(255,60,60,.3);border-radius:6px;padding:8px;text-align:center;color:var(--red);font-size:12px;margin-bottom:8px;flex-shrink:0">${I18N.t('ui.bidsExhausted')}</div>`:''}
      ${_planetsAtLimit?`<div style="background:rgba(255,165,0,.07);border:1px solid rgba(255,165,0,.3);border-radius:6px;padding:8px;text-align:center;color:var(--yellow);font-size:12px;margin-bottom:8px;flex-shrink:0">${I18N.t('ui.planetCapReached',{n:_ownedCnt2,max:_maxPlanets2})}</div>`:''}
      <div data-scroll-id="auct-bid" style="flex:1;overflow-y:auto;min-height:0;padding-right:4px;scrollbar-width:thin;scrollbar-color:rgba(0,243,255,.2) transparent">
        ${noNormal&&noHostile?`<div style="background:var(--card);border:1px dashed var(--bdr);border-radius:8px;padding:24px;text-align:center;color:var(--dim)">${I18N.t('ui.noAuctionPlanets')}<br><span style="font-size:13px">${I18N.t('ui.exploreThenChix')}</span></div>`:''}
        ${noNormal?'':`<div style="font-size:13px;font-weight:bold;color:var(--gold);margin-bottom:8px">${I18N.t('ui.regionGeneral')}</div><div style="display:grid;grid-template-columns:1fr;gap:8px;margin-bottom:14px">`+avail.map(normalCard).join('')+`</div>`}
        ${noHostile?`<div style="background:rgba(139,0,255,.04);border:1px dashed #8b00ff44;border-radius:8px;padding:12px;text-align:center;color:#8b00ff88;font-size:12px;margin-bottom:14px">${I18N.t('ui.cheeksAnnexHint')}</div>`:
          `<div style="font-size:13px;font-weight:bold;color:#cc66ff;margin-bottom:8px">${I18N.t('ui.regionCheeksMerger')}</div><div style="display:grid;grid-template-columns:1fr;gap:8px;margin-bottom:14px">`+hostileAvail.map(hostileCard).join('')+`</div>`}
        ${canBuyVoid&&!noVoid
          ?`<div style="font-size:13px;font-weight:bold;color:var(--cyan);margin-bottom:8px">${I18N.t('ui.regionVoidRift')}</div><div style="display:grid;grid-template-columns:1fr;gap:8px">`+voidAvail.map(voidCard).join('')+`</div>`
          :canBuyVoid&&noVoid
            ?`<div style="background:rgba(0,243,255,.04);border:1px dashed rgba(0,243,255,.25);border-radius:6px;padding:10px;text-align:center;color:var(--cyan);font-size:12px">${I18N.t('ui.voidAuctionDone')}</div>`
            :`<div style="background:rgba(0,243,255,.04);border:1px dashed rgba(0,243,255,.2);border-radius:6px;padding:10px;font-size:12px;color:var(--dim)">
              <div style="color:var(--cyan);font-weight:bold;margin-bottom:4px">${I18N.t('ui.voidRiftLocked')}</div>
              <div style="margin-bottom:4px">${I18N.t('ui.mythicPartsAndFlag')}</div>
              <div style="font-size:11px;line-height:1.6">${mythicStatus}</div>
              <div style="font-size:11px;margin-top:3px;color:${hasFlag?'var(--green)':'var(--dim)'}">${I18N.t('codex.hasFlagshipMyth',{check:hasFlag?'✅':'⬜'})}</div>
            </div>`
        }
      </div>
    </div>`;
    body.innerHTML=`<div style="display:flex;flex-direction:column;height:100%;overflow:hidden">
      ${hubBanner('auction','🏛️',I18N.t('ui.planetAuction'),PLANET_DEF.find(p=>p.id===G.currentPlanet)?.f)}
      <div style="padding:8px 14px 4px;flex-shrink:0">
        <div class="hub-t" style="margin:0">${I18N.t('hub.planetAuctionT')} <span style="font-size:12px;font-weight:normal;color:${bidsLeft>0?'var(--cyan)':'var(--red)'}">${I18N.t('ui.bidsAndOwn',{bids:bidsLeft})}</span>&nbsp;&nbsp;<span style="font-size:12px;font-weight:normal;color:${_planetsAtLimit?'var(--red)':'var(--dim)'}">${I18N.t('ui.planetCount',{now:_ownedCnt2,max:_maxPlanets2})}</span></div>
      </div>
      <!-- 좌우 분할 -->
      <div style="flex:1;display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:8px 14px 14px;min-height:0;overflow:hidden">
        <div style="display:flex;flex-direction:column;min-height:0;border-right:1px solid rgba(255,255,255,.07);padding-right:14px">${ownedPanel}</div>
        <div style="display:flex;flex-direction:column;min-height:0">${biddingHtml}</div>
      </div>
    </div>`;
  }
  function doBid(pid,amount,instant=false){
    const pd=PLANET_DEF.find(p=>p.id===pid);
    if(G.credits<amount){notify(I18N.t('notify.notEnoughCredits'),'err');return;}
    const _ownedCnt=Object.values(G.planets).filter(p=>p.owned).length;
    const _maxPlanets=_maxOwnedPlanets();
    if(_ownedCnt>=_maxPlanets){notify(I18N.t('notify.planetLimitOver',{now:_ownedCnt,max:_maxPlanets,rep:_maxPlanets*20}),'err');return;}
    // 시나리오 탐사 퀘 연동 2026-06-11: 경매 입찰 참여(auction 태그) 진행 — 낙찰/유찰 무관 참여로 인정
    try{if(typeof window.bumpStoryQuestProgress==='function')window.bumpStoryQuestProgress('auction',1,G.currentPlanet);}catch(e){}
    if(!instant){
      // 직접입찰 (사용자 요청 2026-06): 0~2명의 경쟁 입찰자가 [minBid, instPrice] 범위에서 무작위 입찰.
      //   • 경쟁자 0명 → 무조건 낙찰 (최저가 구매 가능)
      //   • 경쟁자 1~2명 → 플레이어 입찰액 > 모든 경쟁자 최고가일 때 낙찰
      //   • 패배 시 수수료 10%만 차감 (기존 동일)
      const _auctDiff={easy:1.05,normal:1.15,hard:1.22,extreme:1.30}[G.difficulty]||1.15;
      const _gd=G.heroes.includes('H03')?0.70:1.0;
      const {minBid,instBid:instPrice}=_calcAuctionPrices(pd,_auctDiff,_gd);
      const numComp=Math.floor(Math.random()*3); // 0, 1, 또는 2
      let maxCompBid=0;
      for(let i=0;i<numComp;i++){
        const cb=minBid+Math.random()*Math.max(0,instPrice-minBid);
        if(cb>maxCompBid)maxCompBid=cb;
      }
      if(amount<=maxCompBid){
        G.credits-=Math.floor(amount*0.1); // 수수료 10% 차감
        if(!G.auctionBids)G.auctionBids=0;if((G.auctionBidTurn||-1)!==G.turn){G.auctionBids=0;G.auctionBidTurn=G.turn;}G.auctionBids++;
        notify(I18N.t('notify.auctionLost',{nm:pd.nm,comp:numComp,top:Math.ceil(maxCompBid).toLocaleString(),fee:Math.floor(amount*0.1).toLocaleString(),remain:Math.max(0,2-G.auctionBids)}),'err');
        baekgu(I18N.t('baekgu.auctionLost'));
        updateHUD();rerenderTab(renderAuctionView);return;
      }
      // 낙찰 — 경쟁자 정보는 아래 baekgu에서 안내 (auctionWon notify는 win path 끝에서 일괄 발화)
      window._lastBidComp={n:numComp,top:Math.ceil(maxCompBid)};
    }
    if(!G.auctionBids)G.auctionBids=0;if((G.auctionBidTurn||-1)!==G.turn){G.auctionBids=0;G.auctionBidTurn=G.turn;}
    G.credits-=amount;G.planets[pid].owned=true;G.planets[pid].commerce=1;G.auctionBids++;
    // 직접입찰 + 낙찰 시 — 경쟁자 정보 부가 안내 (alone / over)
    const _lbc=window._lastBidComp; window._lastBidComp=null;
    if(pd.hostile){G.planets[pid].hostile_cleared=true;notify(I18N.t('notify.chixMerged',{nm:pd.nm}),'pur');baekgu(I18N.t('baekgu.chixMerged',{nm:pd.nm}));}
    else{
      if(_lbc){
        notify(I18N.t(_lbc.n===0?'notify.auctionWonAlone':'notify.auctionWonOver',{nm:pd.nm,comp:_lbc.n,top:_lbc.top.toLocaleString()}),'gold');
      } else {
        notify(I18N.t('notify.auctionWon',{nm:pd.nm}),'gold');
      }
      baekgu(I18N.t('baekgu.auctionTax',{nm:pd.nm,tax:calcTaxFor(pid).toLocaleString()}));
    }
    // 사용자 요청 (2026-06-06): 경매 낙찰 시 폭죽 + 중앙 팝업 (2초 후 자동 해제)
    try{_showAuctionWinPopup(pd,_lbc,amount);}catch(e){console.warn('[auction popup]',e);}
    updateHUD();saveGame(true);
    // 낙찰 후 경매 화면 그대로 유지 — 페이지 이동 없이 현재 탭 새로고침
    if(typeof rerenderTab==='function'&&typeof renderAuctionView==='function'){
      rerenderTab(renderAuctionView);
    }
  }
  function customBid(pid,minBid){
    const v=parseInt(document.getElementById('bid-'+pid)?.value);
    if(!v||v<minBid){notify(I18N.t('notify.minBid',{cost:minBid.toLocaleString()}),'err');return;}
    if(G.credits<v){notify(I18N.t('notify.notEnoughCredits'),'err');return;}doBid(pid,v,false);
  }
  

  // ─── 전역 노출 ─────────────────────────────────────────────
  window.renderAuctionView=renderAuctionView;
  window.doBid=doBid;
  window.customBid=customBid;
  window._maxOwnedPlanets=_maxOwnedPlanets;
  window._auctBidsLeft=_auctBidsLeft;
  window._hasAllMythicParts=_hasAllMythicParts;
  window._hasLegendaryFlagship=_hasLegendaryFlagship;
  window._calcAuctionPrices=_calcAuctionPrices;
  console.log('[auction] module loaded');
})();
