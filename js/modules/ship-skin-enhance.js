// ═══════════════════════════════════════════════════════════════════
// DESTINATION EARTH — 함선 정비 탭 (스킨·강화·편대·수리·매각) 모듈
//   · game.js 에서 분할 (2026-06-13, 사용자 요청: 긴 코드 분할)
//   · 모든 최상위 선언 window.* 노출 · 내부 상태 let → window 속성 전환(onclick 호환)
// ═══════════════════════════════════════════════════════════════════
(function(){
if(typeof window==='undefined')return;
if(window._SHIP_SKIN_ENHANCE_LOADED)return;
window._SHIP_SKIN_ENHANCE_LOADED=true;

// ═══ 함선 스킨 탭 — 외관(홀로그램) 만 변경, 능력치는 그대로 ═══
window._selectedSkinShipIdx=window._selectedSkinShipIdx!==undefined?window._selectedSkinShipIdx:null;
function renderShipSkinTab(body){
  if(!body)return;
  const pd=PLANET_DEF.find(p=>p.id===G.currentPlanet);
  const subNav=`<div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap">
    ${[{k:'parts',lb:I18N.t('garage.shipMaint')},{k:'cargo',lb:I18N.t('garage.cargo')},{k:'formation',lb:I18N.t('garage.formation')},{k:'skin',lb:I18N.t('garage.shipSkin')},{k:'enhance',lb:I18N.t('garage.shipEnhance')}].map(t=>{
      const act=(t.k===_garageSubTab);
      return`<button onclick="_garageSubTab='${t.k}';rerenderTab(renderGarageTab)" style="padding:5px 14px;border:1px solid ${act?'var(--cyan)':'var(--bdr)'};background:${act?'rgba(0,243,255,.12)':'transparent'};color:${act?'var(--cyan)':'var(--dim)'};border-radius:6px;cursor:pointer;font-size:12px;font-weight:${act?'bold':'normal'}">${t.lb}</button>`;
    }).join('')}
  </div>`;
  if(window._selectedSkinShipIdx==null||!G.fleet[window._selectedSkinShipIdx])window._selectedSkinShipIdx=G.fleet.length?0:null;
  const sel=window._selectedSkinShipIdx!=null?G.fleet[window._selectedSkinShipIdx]:null;
  // 좌측: 내 함선 목록
  const fleetList=G.fleet.map((s,i)=>{
    const sel2=i===window._selectedSkinShipIdx;
    const isFlag=i===0;
    const fc=s.tier==='신화'?'#cc66ff':s.tier==='대형'?'#d4af37':s.tier==='중형'?'#00f3ff':'#88ccff';
    return `<div onclick="window._selectedSkinShipIdx=${i};rerenderTab(renderGarageTab)" style="background:${sel2?'rgba(0,243,255,.14)':'var(--card)'};border:1.5px solid ${sel2?'var(--cyan)':fc+'55'};border-radius:8px;padding:8px;cursor:pointer;display:flex;flex-direction:column;gap:6px;align-items:center;margin-bottom:6px;width:100%">
      <div style="width:100%;aspect-ratio:1/1;border-radius:12px;flex-shrink:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;overflow:hidden">${imgOrEmoji(shipImgSrc(s),'🛸',273,273,'object-fit:contain;max-width:100%;max-height:100%')}</div>
      <div style="width:100%;text-align:center">
        <div style="font-size:13px;color:${sel2?'var(--cyan)':fc};font-weight:bold;word-break:keep-all;line-height:1.3">${isFlag?'⭐ ':''}${shipDisplayName(s)}</div>
        <div style="font-size:11px;color:var(--dim);margin-top:2px;word-break:keep-all">${I18N.tier(s.tier)}${s._skinCatId?` · ✨ ${s._skinCatId}`:''}</div>
      </div>
    </div>`;
  }).join('');
  // 우측: 스킨 선택 갤러리 — 도감에서 발견한 함선만 (사용자 요청)
  const _discIds=(typeof getDiscoveredShipIds==='function')?getDiscoveredShipIds():new Set();
  // 현재 함선 자신의 catalogId/id 도 항상 포함 (원본 복귀를 위해)
  const _selfCat=sel?(sel.catalogId||(sel.id||'').replace(/(?:_\d+|_main)$/,'')):'';
  if(_selfCat)_discIds.add(_selfCat);
  const _skinPool=(typeof SHIP_CATALOG!=='undefined'?SHIP_CATALOG:[]).filter(s=>{
    if(['BOSS','BLACKFALCON','VOID_FALCON','HIDDEN_FALCON'].includes(s.id))return false;
    return _discIds.has(s.id);
  });
  const _curSkin=sel?(sel._skinCatId||(sel.id||'').replace(/(?:_\d+|_main)$/,'')):'';
  const gallery=sel?_skinPool.map(sk=>{
    const skinPrice=Math.max(100,Math.floor((sk.price||0)*0.10));
    const isCur=sk.id===_curSkin;
    const tc=sk.tier==='신화'?'#cc66ff':sk.tier==='대형'?'#d4af37':sk.tier==='중형'?'#00f3ff':'#88ccff';
    const canBuy=G.credits>=skinPrice&&!isCur;
    // shipImgSrc 를 통해 boss(URSA→Boss.png), CHIX_S_BUY→CHIX_S.png 등 별칭 처리
    const _imgUrl=shipImgSrc({...sk,id:sk.id,catalogId:sk.catalogId||sk.id,catId:sk.catalogId||sk.id});
    return `<div style="background:${isCur?'rgba(0,243,255,.16)':'var(--card)'};border:1.5px solid ${isCur?'var(--cyan)':tc+'66'};border-radius:8px;padding:8px;display:flex;flex-direction:column;align-items:center;gap:4px;min-height:160px">
      <div style="width:80px;height:80px;border-radius:50%;overflow:hidden;background:rgba(0,0,0,.3);border:1px solid ${tc}66">${imgOrEmoji(_imgUrl,'🛸',80,80,'object-fit:cover;width:100%;height:100%')}</div>
      <div style="font-size:11px;font-weight:bold;color:${tc};text-align:center;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%">${shipDisplayNm(sk)}</div>
      <div style="font-size:10px;color:var(--dim)">[${I18N.tier(sk.tier)}]</div>
      ${isCur
        ? `<div style="font-size:11px;color:var(--cyan);font-weight:bold;margin-top:auto">${I18N.t('ui.currentAppearance')}</div>`
        : `<button class="btn btn-sm btn-gold" style="font-size:11px;padding:4px 8px;margin-top:auto;width:100%" onclick="applyShipSkin(${window._selectedSkinShipIdx},'${sk.id}')" ${canBuy?'':'disabled'}>${I18N.t('ui.applySkin',{p:skinPrice.toLocaleString()})}</button>`}
    </div>`;
  }).join(''):`<div style="grid-column:1/-1;color:var(--dim);text-align:center;padding:30px">${I18N.t('ui.selectShipLeft')}</div>`;
  // 스킨 제거(원본 복귀) 옵션
  const removeBtn=(sel&&sel._skinCatId)?`<div style="margin-bottom:10px"><button class="btn btn-sm" style="border-color:var(--red);color:var(--red);font-size:12px;padding:5px 14px" onclick="removeShipSkin(${window._selectedSkinShipIdx})">${I18N.t('ui.removeSkinBtn')}</button></div>`:'';
  body.innerHTML=`<div class="hub-scroll">
    ${hubBanner('garage','🔧',I18N.t('ui.shipMaintenance'),pd?.f)}
    <div class="hub-t">${I18N.t('hub.shipSkinT')} — ${pd?pd.nm:''}</div>
    <div style="display:flex;gap:10px;align-items:flex-start">${window._garageSideNav('skin')}<div style="flex:1;min-width:0">
    <div style="background:rgba(204,102,255,.08);border:1px solid rgba(204,102,255,.35);border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:12px;color:var(--txt);line-height:1.7">
      🐕 <b style="color:#cc88ff">${I18N.t('speaker.baekgu')}</b>: ${I18N.t('ui.skinExplain',{shield:I18N.t('ui.hologramShield')})}
    </div>
    ${removeBtn}
    <div style="display:grid;grid-template-columns:216px 1fr;gap:14px;padding-bottom:240px">
      <div data-scroll-id="skin-fleet" style="background:rgba(5,10,26,.5);border:1px solid var(--bdr);border-radius:8px;padding:10px;max-height:60vh;overflow-y:auto;scrollbar-width:thin">
        <div style="font-size:13px;font-weight:bold;color:var(--cyan);margin-bottom:8px">${I18N.t('ui.myFleetLabel')} (${G.fleet.length})</div>
        ${fleetList||`<div style="color:var(--dim);text-align:center;padding:20px">${I18N.t('ui.noShips')}</div>`}
      </div>
      <div data-scroll-id="skin-gallery" style="background:rgba(5,10,26,.4);border:1px solid var(--bdr);border-radius:8px;padding:10px;max-height:60vh;overflow-y:auto;scrollbar-width:thin">
        <div style="font-size:13px;font-weight:bold;color:var(--gold);margin-bottom:8px">${I18N.t('ship.skinGallery',{label:sel?I18N.t('ship.skinChange',{nm:shipDisplayNm(sel)}):I18N.t('ship.skinSelectFirst')})}</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px">${gallery}</div>
      </div>
    </div>
  </div></div></div>`;
}
function applyShipSkin(shipIdx, skinId){
  const s=G.fleet[shipIdx];
  if(!s){notify(I18N.t('notify.shipNone'),'err');return;}
  const sk=(SHIP_CATALOG||[]).find(x=>x.id===skinId);
  if(!sk){notify(I18N.t('notify.skinNone'),'err');return;}
  const price=Math.max(100,Math.floor((sk.price||0)*0.10));
  if(G.credits<price){notify(I18N.t('notify.needCreditsShort',{cost:price.toLocaleString()}),'err');return;}
  G.credits-=price;
  // catalogId 가 있으면 그것을, 없으면 id 를 사용 (URSA, CHIX_S 등의 별칭 처리)
  s._skinCatId=sk.catalogId||skinId;
  notify(I18N.t('notify.skinApplied',{nm:shipDisplayNm(s),skin:shipDisplayNm(sk),cr:price.toLocaleString()}),'gold');
  try{baekgu(I18N.t('baekgu.skinApplied',{nm:shipDisplayNm(s),skin:shipDisplayNm(sk)}));}catch(e){}
  updateHUD();saveGame(true);rerenderTab(renderGarageTab);
}
function removeShipSkin(shipIdx){
  const s=G.fleet[shipIdx];if(!s||!s._skinCatId)return;
  delete s._skinCatId;
  notify(I18N.t('notify.skinRemoved',{nm:shipDisplayNm(s)}),'ok');
  try{baekgu(I18N.t('baekgu.skinRemoved',{nm:shipDisplayNm(s)}));}catch(e){}
  saveGame(true);rerenderTab(renderGarageTab);
}
try{if(typeof window!=='undefined'){window.applyShipSkin=applyShipSkin;window.removeShipSkin=removeShipSkin;}}catch(e){}

// ═══ 함선 강화 탭 — 능력치 강화 시스템 (사용자 명세) ═══
//   · 비용: 100k × 1.2^현재강화레벨, 재료 4종 (각 1개)
//   · 성공: 능력치 +5% (누적 최대 +50% @ +10)
//   · 7강까지 안전, 8강 실패=−2 / 9강 실패=−3 / 10강 실패=−5 후퇴
window._selectedEnhanceShipIdx=window._selectedEnhanceShipIdx!==undefined?window._selectedEnhanceShipIdx:null;
function _enhanceCost(curLv,ship){
  // 사용자 명세: 함선 가격의 5%부터, 강화 1단계마다 1.3배 증가
  // 가격이 0(나포 함선·이벤트 보상 등)이면 SHIP_CATALOG 의 동일 카탈로그 가격 폴백
  let _basePrice=Number(ship&&ship.price)||0;
  if(_basePrice<=0&&ship){
    const _cid=ship.catalogId||(ship.id||'').replace(/(?:_\d+|_main)$/,'');
    const _def=(typeof SHIP_CATALOG!=='undefined'?SHIP_CATALOG:[]).find(x=>x.id===_cid);
    if(_def&&_def.price>0)_basePrice=_def.price;
  }
  if(_basePrice<=0)_basePrice=2000000;  // 폴백: 200만 (price 정보 없을 때)
  return Math.max(1000,Math.round(_basePrice*0.05*Math.pow(1.3,curLv)));
}
function _enhanceSuccessRate(curLv){
  // curLv 에서 curLv+1 로 강화 시도 시 성공률
  const t=curLv+1;
  if(t<=5)return 1.00;
  if(t===6)return 0.80;
  if(t===7)return 0.60;
  if(t===8)return 0.50;
  if(t===9)return 0.40;
  if(t===10)return 0.30;
  return 0;
}
function _enhanceFailRegress(targetLv){
  if(targetLv===8)return 2;
  if(targetLv===9)return 3;
  if(targetLv===10)return 5;
  return 0;
}
function _enhanceMatsFor(ship,curLv){
  // ship.id 시드로 결정론적 4종 선택 — 사용자가 미리 준비 가능
  const allMats=(typeof COMMODITIES!=='undefined'?COMMODITIES:[]).filter(c=>c.material).map(c=>c.id);
  if(allMats.length<4)return allMats.slice();
  const baseSeed=stringToSeed(ship.id)+(curLv+1)*13;
  const picks=[];const used=new Set();
  for(let i=0;i<4;i++){
    let idx=((baseSeed+i*7)%allMats.length+allMats.length)%allMats.length;
    while(used.has(idx))idx=(idx+1)%allMats.length;
    used.add(idx);picks.push(allMats[idx]);
  }
  return picks;
}
function renderShipEnhanceTab(body){
  if(!body)return;
  const pd=PLANET_DEF.find(p=>p.id===G.currentPlanet);
  const subNav=`<div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap">
    ${[{k:'parts',lb:I18N.t('garage.shipMaint')},{k:'cargo',lb:I18N.t('garage.cargo')},{k:'formation',lb:I18N.t('garage.formation')},{k:'skin',lb:I18N.t('garage.shipSkin')},{k:'enhance',lb:I18N.t('garage.shipEnhance')}].map(t=>{
      const act=(t.k===_garageSubTab);
      return`<button onclick="_garageSubTab='${t.k}';rerenderTab(renderGarageTab)" style="padding:5px 14px;border:1px solid ${act?'var(--cyan)':'var(--bdr)'};background:${act?'rgba(0,243,255,.12)':'transparent'};color:${act?'var(--cyan)':'var(--dim)'};border-radius:6px;cursor:pointer;font-size:12px;font-weight:${act?'bold':'normal'}">${t.lb}</button>`;
    }).join('')}
  </div>`;
  if(window._selectedEnhanceShipIdx==null||!G.fleet[window._selectedEnhanceShipIdx])window._selectedEnhanceShipIdx=G.fleet.length?0:null;
  const sel=window._selectedEnhanceShipIdx!=null?G.fleet[window._selectedEnhanceShipIdx]:null;
  // 좌측: 함선 목록
  const fleetList=G.fleet.map((s,i)=>{
    const sel2=i===window._selectedEnhanceShipIdx;
    const isFlag=i===0;
    const fc=s.tier==='신화'?'#cc66ff':s.tier==='대형'?'#d4af37':s.tier==='중형'?'#00f3ff':'#88ccff';
    const lv=s._enhanceLv||0;
    return `<div onclick="window._selectedEnhanceShipIdx=${i};rerenderTab(renderGarageTab)" style="background:${sel2?'rgba(0,243,255,.14)':'var(--card)'};border:1.5px solid ${sel2?'var(--cyan)':fc+'55'};border-radius:8px;padding:8px;cursor:pointer;display:flex;flex-direction:column;gap:6px;align-items:center;margin-bottom:6px;width:100%">
      <div style="width:100%;aspect-ratio:1/1;border-radius:12px;flex-shrink:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;overflow:hidden">${imgOrEmoji(shipImgSrc(s),'🛸',273,273,'object-fit:contain;max-width:100%;max-height:100%')}</div>
      <div style="width:100%;text-align:center">
        <div style="font-size:13px;color:${sel2?'var(--cyan)':fc};font-weight:bold;word-break:keep-all;line-height:1.3">${isFlag?'⭐ ':''}${shipDisplayName(s)}</div>
        <div style="font-size:11px;color:var(--dim);margin-top:2px;word-break:keep-all">${I18N.tier(s.tier)}${lv>0?` · <span style="color:#ffd700">+${lv} (+${lv*5}%)</span>`:''}</div>
      </div>
    </div>`;
  }).join('');
  // 우측: 강화 패널
  let rightPanel='';
  if(!sel){
    rightPanel=`<div style="color:var(--dim);text-align:center;padding:30px">${I18N.t('ui.selectShipLeft')}</div>`;
  } else {
    const curLv=sel._enhanceLv||0;
    const isMax=curLv>=10;
    if(isMax){
      rightPanel=`<div style="background:rgba(255,215,0,.12);border:2px solid var(--gold);border-radius:10px;padding:24px;text-align:center">
        <div style="font-size:48px;margin-bottom:8px">🌟</div>
        <div style="color:var(--gold);font-size:20px;font-weight:bold">${I18N.t('ui.maxEnhanceDone')}</div>
        <div style="color:var(--cyan);font-size:14px;margin-top:6px">${I18N.t('ui.statPlus50Active')}</div>
      </div>`;
    } else {
      const nextLv=curLv+1;
      const cost=_enhanceCost(curLv,sel);
      const succ=_enhanceSuccessRate(curLv);
      const regress=_enhanceFailRegress(nextLv);
      const mats=_enhanceMatsFor(sel,curLv);
      const matInfos=mats.map(m=>{
        const c=COMMODITIES.find(x=>x.id===m);
        const have=(G.materials&&G.materials[m])||0;
        return {id:m,nm:c?.nm||m,ic:c?.ic||'💎',have};
      });
      const matsOk=matInfos.every(m=>m.have>=1);
      const creditsOk=(G.credits||0)>=cost;
      const canEnhance=matsOk&&creditsOk;
      const succColor=succ>=1?'var(--green)':succ>=0.6?'#ffd700':succ>=0.4?'#ff8800':'var(--red)';
      rightPanel=`<div style="background:rgba(0,0,0,.3);border:1px solid var(--bdr);border-radius:10px;padding:14px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
          <div style="width:202px;height:202px;border-radius:14px;overflow:hidden;flex-shrink:0">${imgOrEmoji(shipImgSrc(sel),'🛸',202,202,'object-fit:cover;width:100%;height:100%')}</div>
          <div style="flex:1">
            <div style="font-size:15px;font-weight:bold;color:var(--cyan)">${(typeof shipDisplayNm==='function'?shipDisplayNm(sel):sel.nm)}</div>
            <div style="font-size:12px;color:var(--dim)">${I18N.t('ui.curEnhanceLine',{cur:curLv,curPct:curLv*5,next:nextLv,nextPct:nextLv*5})}</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">
          <div style="background:rgba(255,215,0,.06);border:1px solid rgba(255,215,0,.3);border-radius:6px;padding:10px">
            <div style="font-size:11px;color:var(--dim);margin-bottom:3px">${I18N.t('ui.enhanceCostLabel')}</div>
            <div style="font-size:14px;font-weight:bold;color:${creditsOk?'var(--gold)':'var(--red)'}">₡${cost.toLocaleString()}</div>
            ${!creditsOk?`<div style="font-size:10px;color:var(--red);margin-top:3px">${I18N.t('ui.notEnoughCreditsShort')}</div>`:''}
          </div>
          <div style="background:rgba(0,243,255,.05);border:1px solid rgba(0,243,255,.3);border-radius:6px;padding:10px">
            <div style="font-size:11px;color:var(--dim);margin-bottom:3px">${I18N.t('ui.enhanceSuccessProb')}</div>
            <div style="font-size:14px;font-weight:bold;color:${succColor}">${(succ*100).toFixed(0)}%</div>
            ${regress>0?`<div style="font-size:10px;color:var(--red);margin-top:3px">${I18N.t('ui.failRegress',{n:regress,cur:Math.max(0,curLv-regress)})}</div>`:`<div style="font-size:10px;color:var(--green);margin-top:3px">${I18N.t('ui.noRetreatOnFail')}</div>`}
          </div>
        </div>
        <div style="background:rgba(139,0,255,.05);border:1px solid rgba(139,0,255,.3);border-radius:6px;padding:10px;margin-bottom:14px">
          <div style="font-size:12px;color:#cc88ff;font-weight:bold;margin-bottom:6px">${I18N.t('ui.enhanceMatsLabel')}</div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">
            ${matInfos.map(m=>`<div style="background:${m.have>=1?'rgba(80,200,120,.12)':'rgba(255,60,60,.12)'};border:1px solid ${m.have>=1?'var(--green)':'var(--red)'};border-radius:5px;padding:6px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:3px">
              <div style="width:48px;height:48px;border-radius:6px;overflow:hidden;background:rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center">${imgOrEmoji(commImgSrc(m.id),m.ic,44,44,'object-fit:cover;width:100%;height:100%','mat_'+m.id)}</div>
              <div style="font-size:10px;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%">${commDisplayNm(m)}</div>
              <div style="font-size:10px;color:${m.have>=1?'var(--green)':'var(--red)'};font-weight:bold">${m.have}/1</div>
            </div>`).join('')}
          </div>
        </div>
        <button class="btn btn-gold" style="width:100%;font-size:14px;padding:10px" onclick="doShipEnhance(${window._selectedEnhanceShipIdx})" ${canEnhance?'':'disabled'}>${canEnhance?I18N.t('enhance.tryLv',{lv:nextLv}):(creditsOk?I18N.t('enhance.lackMaterial'):I18N.t('enhance.lackCredits'))}</button>
      </div>`;
    }
  }
  body.innerHTML=`<div class="hub-scroll">
    ${hubBanner('garage','🔧',I18N.t('ui.shipMaintenance'),pd?.f)}
    <div class="hub-t">${I18N.t('hub.shipEnhanceT')} — ${pd?pd.nm:''}</div>
    <div style="display:flex;gap:10px;align-items:flex-start">${window._garageSideNav('enhance')}<div style="flex:1;min-width:0">
    <div style="background:rgba(255,215,0,.06);border:1px solid rgba(255,215,0,.3);border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:12px;color:var(--txt);line-height:1.7">
      🐕 <b style="color:#ffd700">${I18N.t('speaker.baekgu')}</b>: ${I18N.t('ui.enhanceExplain')}
    </div>
    <div style="display:grid;grid-template-columns:216px 1fr;gap:14px;padding-bottom:240px">
      <div data-scroll-id="enh-fleet" style="background:rgba(5,10,26,.5);border:1px solid var(--bdr);border-radius:8px;padding:10px;max-height:60vh;overflow-y:auto;scrollbar-width:thin">
        <div style="font-size:13px;font-weight:bold;color:var(--cyan);margin-bottom:8px">${I18N.t('ui.myFleetLabel')} (${G.fleet.length})</div>
        ${fleetList||`<div style="color:var(--dim);text-align:center;padding:20px">${I18N.t('ui.noShips')}</div>`}
      </div>
      <div data-scroll-id="enh-panel">${rightPanel}</div>
    </div>
  </div></div></div>`;
}
function doShipEnhance(shipIdx){
  const s=G.fleet[shipIdx];if(!s){notify(I18N.t('notify.shipNone'),'err');return;}
  const curLv=s._enhanceLv||0;
  if(curLv>=10){notify(I18N.t('notify.alreadyMaxEnhance'),'warn');return;}
  const nextLv=curLv+1;
  const cost=_enhanceCost(curLv,s);
  if((G.credits||0)<cost){notify(I18N.t('notify.needCreditsAmt',{cost:cost.toLocaleString()}),'err');return;}
  // 강화 시도 효과음 (사용자 요청)
  try{AudioMgr.playSfx('UI_click',{vol:0.5,cooldown:30});}catch(e){}
  try{AudioMgr.playSfx('gacha_pull',{vol:0.6,cooldown:0});}catch(e){}
  const mats=_enhanceMatsFor(s,curLv);
  if(!G.materials)G.materials={};
  for(const m of mats){
    if((G.materials[m]||0)<1){const c=COMMODITIES.find(x=>x.id===m);notify(I18N.t('notify.needMaterial',{nm:(c?commDisplayNm(c):'')||m}),'err');return;}
  }
  // 자원 소모
  G.credits-=cost;
  mats.forEach(m=>consumeMaterialQty(m,1));  // bugfix 2026-06-12: 화물 슬롯 동시 차감 (유령 수량 방지)
  // 성공 판정
  const succRate=_enhanceSuccessRate(curLv);
  const success=Math.random()<succRate;
  if(success){
    s._enhanceLv=nextLv;
    // 사용자 요청 (2026-06-06): 강화 알림에 함선 등급 표시 (한/영 공통 prefix)
    const _enhTierShort=I18N.tier(s.tier||'소형');
    notify(I18N.t('notify.enhanceSuccess',{nm:`[${_enhTierShort}] ${shipDisplayNm(s)}`,lv:nextLv,pct:nextLv*5}),'gold');
    try{baekgu(I18N.t('baekgu.enhanceCongrats',{nm:`[${_enhTierShort}] ${shipDisplayNm(s)}`,lv:nextLv,pct:nextLv*5}));}catch(e){}
    // 사용자 요청: 강화 성공 시 항상 폭죽 + 축하 효과음
    try{_fireFireworks();}catch(e){}
    try{AudioMgr.playSfx('coin',{vol:0.9,cooldown:0});}catch(e){}
    setTimeout(()=>{try{AudioMgr.playSfx('notify',{vol:0.9,cooldown:0});}catch(e){}},300);
    // 화면 중앙 축하 토스트 (3초 후 자동 페이드)
    try{
      const host=document.getElementById('game-stage')||document.body;
      const banner=document.createElement('div');
      banner.style.cssText='position:absolute;left:50%;top:38%;transform:translate(-50%,-50%) scale(.6);opacity:0;background:linear-gradient(135deg,rgba(255,215,0,.95),rgba(255,100,200,.92));color:#1a0c00;font-size:34px;font-weight:bold;letter-spacing:4px;padding:18px 36px;border-radius:14px;border:3px solid #fff;box-shadow:0 8px 40px rgba(255,215,0,.7),0 0 80px rgba(255,200,255,.5);z-index:99970;pointer-events:none;text-shadow:0 2px 6px rgba(0,0,0,.3);transition:transform .35s cubic-bezier(.34,1.56,.64,1), opacity .35s ease;text-align:center;font-family:Malgun Gothic,sans-serif;white-space:nowrap';
      // 사용자 요청 (2026-06-06): 강화 성공 배너에 함선 등급 표시
      const _enhTier=I18N.tier(s.tier||'소형');
      const _enhTierCol={'신화':'#cc66ff','전설기함':'#d4af37','대형':'#ffd700','중형':'#66ddff','소형':'#88ccff'}[s.tier]||'#88ccff';
      banner.innerHTML=I18N.t('ui.enhanceSuccess',{lv:nextLv})+`<div style="font-size:13px;letter-spacing:2px;margin-top:8px"><span style="border:1px solid ${_enhTierCol};color:${_enhTierCol};border-radius:4px;padding:1px 8px;background:rgba(0,0,0,.25)">${_enhTier}</span></div><div style="font-size:16px;letter-spacing:2px;margin-top:6px;font-weight:normal">${I18N.t('ui.enhanceSubline',{nm:shipDisplayNm(s),pct:nextLv*5})}</div>`;
      host.appendChild(banner);
      requestAnimationFrame(()=>{banner.style.opacity='1';banner.style.transform='translate(-50%,-50%) scale(1)';});
      setTimeout(()=>{banner.style.opacity='0';banner.style.transform='translate(-50%,-50%) scale(1.2)';setTimeout(()=>{try{banner.remove();}catch(_e){}},400);},2400);
    }catch(_e){}
  } else {
    const regress=_enhanceFailRegress(nextLv);
    const newLv=Math.max(0,curLv-regress);
    s._enhanceLv=newLv;
    const _enhTierShort2=I18N.tier(s.tier||'소형');
    const _nmWithTier=`[${_enhTierShort2}] ${shipDisplayNm(s)}`;
    if(regress>0){
      notify(I18N.t('notify.enhanceFailRegress',{nm:_nmWithTier,lv:nextLv,regress,newLv}),'err');
      try{baekgu(I18N.t('baekgu.enhanceFailRegress',{nm:_nmWithTier,regress,newLv}));}catch(e){}
    } else {
      notify(I18N.t('notify.enhanceFailNoRegress',{nm:_nmWithTier,lv:nextLv}),'err');
      try{baekgu(I18N.t('baekgu.enhanceFailSimple'));}catch(e){}
    }
  }
  updateHUD();saveGame(true);rerenderTab(renderGarageTab);
}
try{if(typeof window!=='undefined'){window.doShipEnhance=doShipEnhance;}}catch(e){}

// ── 편대 편성: 16슬롯 그리드에 함선 배치 ─────────────────────────
const FLEET_FORMATION_SLOTS=48; // 6열×8행 (사용자 요청 2026-06-16)
const FLEET_FORMATION_ROWS=8;   // 1열당 8칸
window._formationSelectedSlot=window._formationSelectedSlot!==undefined?window._formationSelectedSlot:null;
window._formationSelectedShip=window._formationSelectedShip!==undefined?window._formationSelectedShip:null;
function _getFormation(){
  if(!G.fleetFormation||typeof G.fleetFormation!=='object')G.fleetFormation={};
  return G.fleetFormation;
}
function _slotToColRow(slot){
  // 6열×8행, slot = col*8+row (slot 0=col0/row0, slot 8=col1/row0)
  return{col:Math.floor(slot/8),row:slot%8};
}
function getFormationShipForSlot(slot){
  const f=_getFormation();
  for(const sid in f){if(f[sid]===slot){return G.fleet.find(s=>s.id===sid)||null;}}
  return null;
}
function assignFormationSlot(slot,shipId){
  const f=_getFormation();
  // 같은 슬롯에 다른 함선이 있으면 비우기
  for(const sid in f){if(f[sid]===slot)delete f[sid];}
  // 이 함선의 기존 슬롯 비우기
  if(f[shipId]!==undefined)delete f[shipId];
  f[shipId]=slot;
  saveGame(true);
}
function clearFormationSlot(slot){
  const f=_getFormation();
  for(const sid in f){if(f[sid]===slot)delete f[sid];}
  saveGame(true);
}
function clearAllFormation(){
  G.fleetFormation={};
  window._formationSelectedSlot=null;window._formationSelectedShip=null;
  saveGame(true);
  notify(I18N.t('notify.fleetFormationReset'),'ok');
  rerenderTab(renderGarageTab);
}
// 체력·방어력·실드 높은 함선은 앞열, 공격력 높은(=내구 낮은) 함선은 뒤열로 자동 배치.
//   6열×8행(slot=col*8+row, slot 0~7=col0=최전방). 영웅 해금 없이 기본 사용 가능 (사용자 요청 2026-06-16).
function autoArrangeFormation(){
  if(!G.fleet||G.fleet.length===0){notify(I18N.t('notify.fleetEmpty'),'warn');return;}
  // 함선 방어력 점수 계산 (HP + DEF*10 + maxSH*1.5 + armorTier*30 + shieldTier*15)
  function _defScore(s){
    const st=(typeof getShipStats==='function')?getShipStats(s):{};
    const hp=(s.maxHP||0)+(st.hpBonus||0);
    const def=(s.DEF||0)+(st.DEF||0);
    const sh=(s.maxSH||0)+(st.shBonus||0);
    return hp + def*10 + sh*1.5;
  }
  // 정렬: 방어 점수 높은 순 (기함 예외 없음 — 사용자 명세 "앞=방어, 뒤=공격" 그대로 반영).
  //   내구 높은 함선이 앞열, 내구 낮은(보통 고공격) 함선이 뒤열로 자연 배치된다.
  const sorted=[...G.fleet].map((s,i)=>({s,i,score:_defScore(s)})).sort((a,b)=>b.score-a.score);
  // 6열×8행 = 48슬롯. slot=col*8+row → slot 0~7 = col0(최전방, 전투 시 우선 피격).
  // 방어 점수 내림차순으로 앞 슬롯부터 채움 → 앞열=탱커, 뒤열=내구 낮은 공격함 자동 배치.
  G.fleetFormation={};
  sorted.forEach((entry,idx)=>{
    if(idx>=FLEET_FORMATION_SLOTS)return;  // 16척 초과 무시
    G.fleetFormation[entry.s.id]=idx;
  });
  window._formationSelectedSlot=null;window._formationSelectedShip=null;
  saveGame(true);
  notify(I18N.t('notify.autoFormation',{n:Math.min(sorted.length,FLEET_FORMATION_SLOTS)}),'ok');
  rerenderTab(renderGarageTab);
}
// ── 함대 대형 프리셋 (사용자 요청 2026-06-16) ──────────────────────────
// 포메이션 해금: 이순신(H01)·넬슨(H05)·광개토(H03) 중 1명 이상 보유 시
function _formationUnlocked(){
  const h=G.heroes||[];
  return h.includes('H01')||h.includes('H05')||h.includes('H03');
}
// 6열(0=전방)×8행(0~7) 그리드의 [col,row] 셀 목록(우선순위 순, 첫 셀=기함). slot=col*8+row
const FORMATION_PRESETS={
  arrow:  [[0,3],[0,4],[1,2],[1,5],[2,1],[2,6],[3,0],[3,7],[2,3],[2,4],[3,3],[3,4],[1,3],[1,4],[2,2],[2,5]],
  crane:  [[0,0],[0,7],[0,1],[0,6],[1,1],[1,6],[1,2],[1,5],[2,2],[2,5],[2,3],[2,4],[3,3],[3,4],[4,3],[4,4]],
  square: [[0,2],[0,3],[0,4],[0,5],[1,2],[1,3],[1,4],[1,5],[2,2],[2,3],[2,4],[2,5],[3,2],[3,3],[3,4],[3,5]],
  diamond:[[0,3],[0,4],[1,2],[1,5],[2,1],[2,6],[3,1],[3,6],[4,2],[4,5],[5,3],[5,4],[2,3],[2,4],[3,3],[3,4]]
};
function applyFormationPreset(name){
  if(!_formationUnlocked()){notify(I18N.t('formation.lockHint'),'warn');return;}
  if(!G.fleet||G.fleet.length===0){notify(I18N.t('notify.fleetEmpty'),'warn');return;}
  const cells=FORMATION_PRESETS[name];
  if(!cells)return;
  function _score(s){const st=(typeof getShipStats==='function')?getShipStats(s):{};return (s.maxHP||0)+((s.DEF||0)+(st.DEF||0))*10+(s.maxSH||0)*1.5;}
  // 기함 항상 첫 번째 → 나머지는 방어 점수 높은 순으로 셀 배정
  const sorted=[...G.fleet].map((s,i)=>({s,i,sc:_score(s)})).sort((a,b)=>{if(a.i===0)return -1;if(b.i===0)return 1;return b.sc-a.sc;});
  G.fleetFormation={};
  sorted.forEach((e,idx)=>{
    if(idx>=cells.length)return;
    const c=cells[idx];
    G.fleetFormation[e.s.id]=c[0]*8+c[1];
  });
  window._formationSelectedSlot=null;window._formationSelectedShip=null;
  saveGame(true);
  notify(I18N.t('notify.formationApplied',{nm:I18N.t('formation.'+name)}),'ok');
  rerenderTab(renderGarageTab);
}
try{if(typeof window!=='undefined'){window._formationUnlocked=_formationUnlocked;window.applyFormationPreset=applyFormationPreset;}}catch(e){}
// ── 편대 저장 슬롯 3개 (사용자 요청 2026-06-16) — 내 편대 구성 저장/불러오기. 불러올 때 신규 함선 자동 충원 ──
function saveFormationSlot(i){
  if(!G.fleetFormation||!Object.keys(G.fleetFormation).length){notify(I18N.t('formation.saveNothing'),'warn');return;}
  if(!Array.isArray(G.fleetFormationSaves))G.fleetFormationSaves=[null,null,null];
  G.fleetFormationSaves[i]=Object.assign({},G.fleetFormation);
  saveGame(true);
  notify(I18N.t('formation.saveDone',{n:i+1}),'ok');
  rerenderTab(renderGarageTab);
}
function loadFormationSlot(i){
  const saved=(Array.isArray(G.fleetFormationSaves)?G.fleetFormationSaves[i]:null);
  if(!saved||!Object.keys(saved).length){notify(I18N.t('formation.saveEmpty'),'warn');return;}
  if(!G.fleet||!G.fleet.length){notify(I18N.t('notify.fleetEmpty'),'warn');return;}
  const fleetIds=new Set(G.fleet.map(function(s){return s.id;}));
  const used=new Set(), result={};
  // 1) 저장된 배치 중 현재 보유 함선만 적용
  Object.keys(saved).forEach(function(sid){
    if(!fleetIds.has(sid))return;
    const sl=saved[sid];
    if(typeof sl==='number'&&sl>=0&&sl<FLEET_FORMATION_SLOTS&&!used.has(sl)){result[sid]=sl;used.add(sl);}
  });
  // 2) 미배치 함선(신규 등)을 방어 점수 높은 순으로 빈 슬롯(앞열 우선)에 자동 충원
  function _sc(s){const st=(typeof getShipStats==='function')?getShipStats(s):{};return (s.maxHP||0)+((s.DEF||0)+(st.DEF||0))*10+(s.maxSH||0)*1.5;}
  const placed=new Set(Object.keys(result));
  const remaining=G.fleet.filter(function(s){return !placed.has(s.id);}).sort(function(a,b){return _sc(b)-_sc(a);});
  let sl=0;
  remaining.forEach(function(s){ while(sl<FLEET_FORMATION_SLOTS&&used.has(sl))sl++; if(sl<FLEET_FORMATION_SLOTS){result[s.id]=sl;used.add(sl);sl++;} });
  G.fleetFormation=result;
  window._formationSelectedSlot=null;window._formationSelectedShip=null;
  saveGame(true);
  notify(I18N.t('formation.saveLoaded',{n:i+1}),'ok');
  rerenderTab(renderGarageTab);
}
try{if(typeof window!=='undefined'){window.saveFormationSlot=saveFormationSlot;window.loadFormationSlot=loadFormationSlot;}}catch(e){}
function onFormationSlotClick(slot){
  AudioMgr.playSfx('UI_click',{cooldown:60});
  // 1) 함선 카드를 먼저 선택해둔 상태 → 그 함선을 슬롯에 배치 (대상 슬롯에 다른 함선이 있으면 자동 배치로 밀려남)
  if(window._formationSelectedShip){
    assignFormationSlot(slot,window._formationSelectedShip);
    window._formationSelectedShip=null;window._formationSelectedSlot=null;
    rerenderTab(renderGarageTab);
    return;
  }
  // 2) 이전에 슬롯을 선택해둔 상태 → 같은 슬롯 재클릭=비우기, 다른 슬롯 클릭=이동/스왑
  if(window._formationSelectedSlot!==null){
    if(window._formationSelectedSlot===slot){
      // 같은 슬롯 재클릭: 함선 있으면 비우기, 없으면 선택 해제
      const occ=getFormationShipForSlot(slot);
      if(occ)clearFormationSlot(slot);
      window._formationSelectedSlot=null;
      rerenderTab(renderGarageTab);
      return;
    }
    const srcShip=getFormationShipForSlot(window._formationSelectedSlot);
    const dstShip=getFormationShipForSlot(slot);
    if(srcShip){
      // 소스에 함선이 있음 → 이동 또는 스왑
      const f=_getFormation();
      if(dstShip){
        // 두 슬롯 모두 점유 → 스왑
        f[srcShip.id]=slot;
        f[dstShip.id]=window._formationSelectedSlot;
        notify(I18N.t('notify.shipSwap',{a:shipDisplayNm(srcShip),b:shipDisplayNm(dstShip)}),'ok');
      } else {
        // 이동
        f[srcShip.id]=slot;
        notify(I18N.t('notify.shipMoved',{nm:shipDisplayNm(srcShip),col:Math.floor(slot/8)+1,row:slot%8+1}),'ok');
      }
      saveGame(true);
      window._formationSelectedSlot=null;
    } else {
      // 소스가 빈 슬롯이었다면 선택을 새 슬롯으로 이동 (조작 편의)
      window._formationSelectedSlot=slot;
    }
    rerenderTab(renderGarageTab);
    return;
  }
  // 3) 첫 클릭: 슬롯 선택
  window._formationSelectedSlot=slot;
  rerenderTab(renderGarageTab);
}
function onFormationShipClick(shipId){
  AudioMgr.playSfx('UI_click',{cooldown:60});
  if(window._formationSelectedSlot!==null){
    assignFormationSlot(window._formationSelectedSlot,shipId);
    window._formationSelectedSlot=null;window._formationSelectedShip=null;
  } else {
    window._formationSelectedShip=(window._formationSelectedShip===shipId?null:shipId);
  }
  rerenderTab(renderGarageTab);
}
function renderFleetFormationTab(body){
  G._garageMode=true;
  const pd=PLANET_DEF.find(p=>p.id===G.currentPlanet);
  // 정비소 서브탭: 함선 정비 + 화물 관리 + 편대 편성 (3개 통합)
  const _isMaintain=_garageSubTab!=='formation'&&_garageSubTab!=='cargo';
  const subNav=`<div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap">
    ${[{k:'parts',lb:I18N.t('garage.shipMaint')},{k:'cargo',lb:I18N.t('garage.cargo')},{k:'formation',lb:I18N.t('garage.formation')},{k:'skin',lb:I18N.t('garage.shipSkin')},{k:'enhance',lb:I18N.t('garage.shipEnhance')}].map(t=>{
      const act=(t.k===_garageSubTab||(t.k==='parts'&&_isMaintain));
      return`<button onclick="_garageSubTab='${t.k}';rerenderTab(renderGarageTab)" style="padding:5px 14px;border:1px solid ${act?'var(--cyan)':'var(--bdr)'};background:${act?'rgba(0,243,255,.12)':'transparent'};color:${act?'var(--cyan)':'var(--dim)'};border-radius:6px;cursor:pointer;font-size:12px;font-weight:${act?'bold':'normal'}">${t.lb}</button>`;
    }).join('')}
  </div>`;
  const assignedShipIds=new Set(Object.keys(_getFormation()));
  // 시각 배치: 왼쪽=4열(뒤) → 오른쪽=1열(앞). 1열이 오른쪽 끝의 적 함대와 맞닿게 표시.
  const _CELL=70;  // 사용자 요청 2026-06-16: 편대 칸 1.2배 확대 (58→70)
  const colLabelTexts=[I18N.t('combat.col6'),I18N.t('combat.col5'),I18N.t('combat.col4'),I18N.t('combat.col3'),I18N.t('combat.col2'),I18N.t('combat.col1')];
  const colLabels=`<div style="display:grid;grid-template-columns:auto repeat(6,${_CELL}px);gap:5px;margin-bottom:5px;font-size:10px;font-weight:bold;text-align:center;width:fit-content;margin-left:auto;margin-right:auto">
    <div style="font-size:9px;color:var(--dim);align-self:end">${I18N.t('ui.frontBackHint')}</div>
    ${colLabelTexts.map((l,i)=>`<div style="color:${i===5?'var(--red)':i===0?'rgba(255,200,0,.7)':'var(--gold)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${l}</div>`).join('')}
  </div>`;
  const rowLabels=[];for(let _r=0;_r<8;_r++)rowLabels.push(I18N.t('combat.row',{n:_r+1}));
  let gridWithLabels=colLabels+`<div style="display:grid;grid-template-columns:auto repeat(6,${_CELL}px);gap:5px;width:fit-content;margin:0 auto">`;
  for(let row=0;row<8;row++){
    gridWithLabels+=`<div style="display:flex;align-items:center;justify-content:center;color:var(--dim);font-size:10px">${rowLabels[row]}</div>`;
    for(let visCol=0;visCol<6;visCol++){
      // 시각 컬럼 visCol=0 → 6열(논리 col=5, 뒤), visCol=5 → 1열(논리 col=0, 앞)
      const logicalCol=5-visCol;
      const slot=logicalCol*8+row;
      const ship=getFormationShipForSlot(slot);
      const isFlagshipHere=ship&&G.fleet[0]&&ship.id===G.fleet[0].id;
      const sel=window._formationSelectedSlot===slot;
      const isFront=logicalCol===0;
      const slotBg=ship?'rgba(0,243,255,.10)':isFront?'rgba(255,80,80,.07)':'rgba(255,255,255,.03)';
      const slotBdr=sel?'var(--gold)':ship?'var(--cyan)':isFront?'rgba(255,80,80,.4)':'var(--bdr)';
      const slotGlow=sel?'box-shadow:0 0 14px rgba(255,215,0,.6);':isFront?'box-shadow:0 0 6px rgba(255,80,80,.2);':'';
      let content;
      if(ship){
        const st=getShipStats(ship);
        const hpP=clamp(Math.round(ship.hp/Math.max(1,st.HP||ship.maxHP)*100),0,100);
        const hpCol=hpP>60?'var(--green)':hpP>30?'var(--yellow)':'var(--red)';
        // 칸이 절반 크기라 이미지+기함표시+HP%만 간결하게
        content=`<div style="position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center">
          ${imgOrEmoji(shipImgSrc(ship),'🛸',46,46,'border-radius:4px;object-fit:contain',shipLoreKey(ship))}
          ${isFlagshipHere?'<div style="position:absolute;top:-2px;left:-1px;font-size:11px;line-height:1">⭐</div>':''}
          <div style="position:absolute;bottom:-2px;right:0;font-size:8px;font-weight:bold;color:${hpCol};text-shadow:0 0 3px #000,0 0 3px #000">${hpP}%</div>
        </div>`;
      } else {
        content=`<div style="font-size:16px;color:${isFront?'rgba(255,80,80,.5)':'rgba(255,255,255,.22)'};display:flex;align-items:center;justify-content:center;width:100%;height:100%">+</div>`;
      }
      gridWithLabels+=`<div onclick="onFormationSlotClick(${slot})" title="${I18N.t('ui.gridSlot',{col:logicalCol+1,row:row+1})}" style="background:${slotBg};border:1px solid ${slotBdr};border-radius:6px;padding:3px;display:flex;align-items:center;justify-content:center;cursor:pointer;${slotGlow};transition:all .12s;aspect-ratio:1/1;overflow:hidden;box-sizing:border-box" onmouseover="this.style.transform='scale(1.08)'" onmouseout="this.style.transform=''">${content}</div>`;
    }
  }
  gridWithLabels+='</div>';
  // 적 측 표시 — 1열 바로 옆에 위치하여 "1열이 가장 먼저 적과 교전" 의미를 시각화
  const enemySide=`<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(255,60,60,.06);border:1px dashed rgba(255,60,60,.3);border-radius:8px;padding:8px;min-width:90px"><div style="font-size:34px">☠️</div><div style="font-size:11px;color:var(--red);font-weight:bold;margin-top:4px">${I18N.t('ui.enemyFleet')}</div><div style="font-size:10px;color:var(--red);margin-top:4px;line-height:1.4">⬅ 1열이<br>${I18N.t('ui.firstEngagement')}</div></div>`;
  // 함선 리스트 (편성 가능한 함선)
  const shipCards=G.fleet.map((s,i)=>{
    const slot=_getFormation()[s.id];
    const slotLbl=typeof slot==='number'?I18N.t('ui.gridSlot',{col:Math.floor(slot/8)+1,row:slot%8+1}):'자동';
    const sel=window._formationSelectedShip===s.id;
    const isFlagship=i===0;
    const bgCol=sel?'rgba(255,215,0,.15)':typeof slot==='number'?'rgba(0,243,255,.06)':'var(--card)';
    const bdrCol=sel?'var(--gold)':typeof slot==='number'?'var(--cyan)':'var(--bdr)';
    return`<div onclick="onFormationShipClick('${s.id}')" style="background:${bgCol};border:1px solid ${bdrCol};border-radius:8px;padding:8px;cursor:pointer;display:flex;flex-direction:column;gap:6px;align-items:center;width:273px;transition:all .15s" onmouseover="this.style.transform='translateY(-3px)'" onmouseout="this.style.transform=''">
      <div style="width:191px;height:191px;flex-shrink:0;background:rgba(0,0,0,.4);border-radius:8px;display:flex;align-items:center;justify-content:center">${imgOrEmoji(shipImgSrc(s),'🛸',191,191,'object-fit:contain;max-width:100%;max-height:100%',shipLoreKey(s))}</div>
      <div style="width:100%;text-align:center">
        <div style="font-size:13px;font-weight:bold;color:${isFlagship?'var(--cyan)':'var(--txt)'};word-break:keep-all;line-height:1.3">${isFlagship?'⭐ ':''}${shipDisplayName(s)}</div>
        ${(()=>{
          const st=getShipStats(s);
          const dHp=st.HP-(s.maxHP||0),dDef=st.DEF-(s.DEF||0);
          const hpDelta=dHp>0?`<span style="color:var(--green)">+${dHp}</span>`:'';
          const defDelta=dDef>0?`<span style="color:var(--green)">+${dDef}</span>`:'';
          return `<div style="font-size:11px;color:var(--dim);margin-top:2px;word-break:keep-all">${I18N.tier(s.tier)} · HP <span style="color:var(--txt);font-weight:bold">${st.HP}</span>${hpDelta} · DEF <span style="color:var(--txt);font-weight:bold">${st.DEF}</span>${defDelta}</div>`;
        })()}
        <div style="font-size:11px;color:${typeof slot==='number'?'var(--cyan)':'var(--dim)'};margin-top:2px">📍 ${slotLbl}</div>
      </div>
    </div>`;
  }).join('');
  const hint=window._formationSelectedSlot!==null
    ? (()=>{
        const _selOcc=getFormationShipForSlot(window._formationSelectedSlot);
        const _selLbl=I18N.t('ui.gridSlot',{col:Math.floor(window._formationSelectedSlot/8)+1,row:window._formationSelectedSlot%8+1});
        const _info=_selOcc
          ? I18N.t('ui.slotSelectedHint',{nm:`<b>${shipDisplayNm(_selOcc)}</b>`,lbl:_selLbl})
          : I18N.t('ui.emptySlotSelected',{lbl:_selLbl});
        return `<div style="background:rgba(255,215,0,.1);border:1px solid var(--gold);border-radius:6px;padding:8px;text-align:center;color:var(--gold);font-size:12px">${_info}</div>`;
      })()
    : window._formationSelectedShip
    ? `<div style="background:rgba(255,215,0,.1);border:1px solid var(--gold);border-radius:6px;padding:8px;text-align:center;color:var(--gold);font-size:12px">${I18N.t('ui.shipSelectedHint')}</div>`
    : `<div style="background:rgba(0,243,255,.04);border:1px solid rgba(0,243,255,.2);border-radius:6px;padding:8px;text-align:center;color:var(--dim);font-size:12px">${I18N.t('ui.slotSwapHint')}</div>`;
  const _declineCap=!!G.declineCapture;
  const summary=`<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;background:rgba(0,243,255,.04);border:1px solid rgba(0,243,255,.2);border-radius:8px;padding:10px 14px;margin-bottom:10px">
    <span style="font-size:14px;font-weight:bold;color:var(--cyan)">${I18N.t('ui.formationHeader')}</span>
    <span style="font-size:12px;color:var(--dim)">${I18N.t('ui.formationHint')}</span>
    <span style="font-size:12px;color:var(--dim);margin-left:auto">${I18N.t('ui.manualPlace',{n:assignedShipIds.size,total:G.fleet.length})}</span>
    <button class="btn btn-sm" onclick="toggleDeclineCapture()" style="font-size:11px;padding:4px 10px;${_declineCap?'border-color:var(--gold);color:var(--gold);background:rgba(212,175,55,.12)':'border-color:var(--cyan);color:var(--cyan);background:rgba(0,243,255,.10)'}" title="ON(나포매각): 나포 대상 함선을 즉시 매각하여 크레딧 획득 · OFF(나포허용): 정상 나포 시도">${_declineCap?I18N.t('ui.captureSell'):I18N.t('ui.captureAllow')}</button>
    <button class="btn btn-sm btn-red" style="font-size:11px;padding:4px 10px" onclick="clearAllFormation()">${I18N.t('ui.resetBtn')}</button>
  </div>`;
  // ── 기본 자동배치 버튼 — 대형 프리셋 줄 가장 우측에 배치 (사용자 요청 2026-06-16) ──
  //   앞열=체력·방어력 높은 함선, 뒤열=공격력 높은(내구 낮은) 함선
  const _autoBtn=`<button class="btn btn-sm" onclick="autoArrangeFormation()" title="${I18N.t('formation.autoArrangeHint')}" style="font-size:11px;padding:4px 14px;border-color:var(--cyan);color:var(--cyan);background:rgba(0,243,255,.12);font-weight:bold;white-space:nowrap">🛡️ ${I18N.t('formation.autoArrange')}</button>`;
  // ── 대형 자동 배치 프리셋 바 (영웅 해금) ──
  const _fUnlocked=_formationUnlocked();
  const _presetDefs=[['arrow','formation.arrow'],['crane','formation.crane'],['square','formation.square'],['diamond','formation.diamond']];
  const _presetBar=`<div style="display:flex;gap:8px;align-items:center;flex-wrap:nowrap;flex-shrink:0;background:rgba(255,215,0,.04);border:1px solid ${_fUnlocked?'rgba(255,215,0,.3)':'rgba(255,255,255,.12)'};border-radius:8px;padding:8px 14px;margin-bottom:10px">
    <span style="font-size:13px;font-weight:bold;color:${_fUnlocked?'var(--gold)':'var(--dim)'}">⚔️ ${I18N.t('formation.presetHeader')}</span>
    ${_presetDefs.map(d=>`<button class="btn btn-sm" onclick="applyFormationPreset('${d[0]}')" ${_fUnlocked?'':'disabled'} style="font-size:11px;padding:4px 12px;border-color:${_fUnlocked?'var(--gold)':'var(--bdr)'};color:${_fUnlocked?'var(--gold)':'var(--dim)'};background:${_fUnlocked?'rgba(255,215,0,.10)':'transparent'};${_fUnlocked?'':'opacity:.55;cursor:not-allowed'}">${I18N.t(d[1])}</button>`).join('')}
    ${_autoBtn}
    ${_fUnlocked?'':`<span style="font-size:11px;color:var(--dim)">${I18N.t('formation.lockHint')}</span>`}
  </div>`;
  // ── 편대 저장 슬롯 3개 (사용자 요청 2026-06-16): 내 편대 구성 저장/불러오기 (불러올 때 신규 함선 자동 충원) ──
  const _saves=(Array.isArray(G.fleetFormationSaves)?G.fleetFormationSaves:[null,null,null]);
  const _saveBar=`<div style="display:flex;gap:8px;align-items:center;flex-wrap:nowrap;flex-shrink:0;background:rgba(120,200,255,.05);border:1px solid rgba(120,200,255,.28);border-radius:8px;padding:8px 14px;margin-bottom:10px">
    <span style="font-size:13px;font-weight:bold;color:#8cf">💾 ${I18N.t('formation.savesHeader')}</span>
    ${[0,1,2].map(function(i){
      const filled=_saves[i]&&Object.keys(_saves[i]).length;
      return `<div style="display:flex;gap:3px;align-items:center;border:1px solid ${filled?'rgba(120,200,255,.45)':'var(--bdr)'};border-radius:6px;padding:2px 5px">
        <span style="font-size:11px;font-weight:bold;color:${filled?'#8cf':'var(--dim)'};padding:0 2px">${I18N.t('formation.slotN',{n:i+1})}</span>
        <button class="btn btn-sm" onclick="saveFormationSlot(${i})" style="font-size:10px;padding:3px 9px" title="${I18N.t('formation.saveCurrentTitle')}">${I18N.t('formation.saveBtn')}</button>
        <button class="btn btn-sm" onclick="loadFormationSlot(${i})" ${filled?'':'disabled'} style="font-size:10px;padding:3px 9px;${filled?'border-color:#8cf;color:#8cf':'opacity:.5;cursor:not-allowed'}" title="${I18N.t('formation.loadTitle')}">${I18N.t('formation.loadBtn')}</button>
      </div>`;
    }).join('')}
  </div>`;
  body.innerHTML=`<div class="hub-scroll">
    ${hubBanner('garage','🔧',I18N.t('ui.shipMaintenance'),pd?.f)}
    <div class="hub-t">${I18N.t('hub.shipGarageT')} — ${pd?pd.nm:''}</div>
    <div style="display:flex;gap:10px;align-items:flex-start">${window._garageSideNav('formation')}<div style="flex:1;min-width:0">
    ${summary}
    <div style="display:flex;gap:10px;align-items:flex-start;flex-wrap:nowrap;overflow-x:auto">${_presetBar}${_saveBar}</div>
    ${hint}
    <div style="display:grid;grid-template-columns:224px 1fr;gap:14px;margin-top:10px;align-items:flex-start">
      <div style="background:rgba(5,10,26,.5);border:1px solid var(--bdr);border-radius:8px;padding:10px;max-height:85vh;overflow-y:auto;scrollbar-width:thin;scrollbar-color:rgba(0,243,255,.3) transparent" data-scroll-id="formation-ships">
        <div style="font-size:13px;font-weight:bold;color:var(--cyan);margin-bottom:8px;position:sticky;top:0;background:rgba(5,10,26,.95);padding:2px 0;z-index:1">${I18N.t('ui.ownedShipsHeader',{n:G.fleet.length})}</div>
        <div style="display:flex;flex-direction:column;gap:6px">${shipCards}</div>
      </div>
      <div>
        <div style="display:flex;gap:10px;align-items:stretch">
          <div style="flex:1">${gridWithLabels}</div>
          ${enemySide}
        </div>
        <div style="margin-top:8px;font-size:11px;color:var(--dim);text-align:center">${I18N.t('ui.frontLineHint')}</div>
      </div>
    </div>
  </div></div></div>`;
  G._garageMode=false;
}

function repairAllShips(){
  const totalCost=G.fleet.reduce((sum,s)=>sum+repairCost(s)+shRepairCost(s),0);
  if(totalCost===0){notify(I18N.t('notify.allShipsRepaired'),'warn');return;}
  if(G.credits<totalCost){notify(I18N.t('notify.needCreditsCost',{cost:totalCost.toLocaleString()}),'err');return;}
  G.credits-=totalCost;
  let repaired=0;
  G.fleet.forEach(s=>{
    const b=getPartBonus(s);const eH=s.maxHP+(b.hp||0),eS=s.maxSH+(b.sh||0);
    if(s.hp<eH||s.sh<eS){s.hp=eH;s.sh=eS;repaired++;}
  });
  // 시나리오 탐사 퀘 연동 2026-06-11: 수리 완료(repair 태그) 진행
  try{if(typeof bumpStoryQuestProgress==='function')bumpStoryQuestProgress('repair',1,G.currentPlanet);}catch(e){}
  updateHUD();notify(I18N.t('notify.fleetRepaired',{n:repaired,cr:totalCost.toLocaleString()}),'gold');
  rerenderShipOrGarage();saveGame(true);
}
function repairShip(idx,type){
  const s=G.fleet[idx];if(!s)return;
  const b=getPartBonus(s);
  const cost=type==='hp'?repairCost(s):shRepairCost(s);
  if(cost===0){notify(I18N.t('notify.alreadyMaxed'),'warn');return;}
  if(G.credits<cost){notify(I18N.t('notify.needCreditsCost',{cost:cost.toLocaleString()}),'err');return;}
  G.credits-=cost;
  if(type==='hp')s.hp=s.maxHP+(b.hp||0);
  else s.sh=s.maxSH+(b.sh||0);
  // 시나리오 탐사 퀘 연동 2026-06-11: 수리 완료(repair 태그) 진행
  try{if(typeof bumpStoryQuestProgress==='function')bumpStoryQuestProgress('repair',1,G.currentPlanet);}catch(e){}
  updateHUD();notify(I18N.t('notify.shipRepairDone',{nm:shipDisplayNm(s),cr:cost.toLocaleString()}),'ok');rerenderShipOrGarage();saveGame(true);
}
// 모달 내 수리 — 수리 후 상세 팝업 재오픈
function repairShipModal(idx,type){
  const s=G.fleet[idx];if(!s)return;
  const b=getPartBonus(s);
  const cost=type==='hp'?repairCost(s):shRepairCost(s);
  if(cost===0){notify(I18N.t('notify.alreadyMaxed'),'warn');showShipDetailModal(idx);return;}
  if(G.credits<cost){notify(I18N.t('notify.needCreditsCost',{cost:cost.toLocaleString()}),'err');showShipDetailModal(idx);return;}
  G.credits-=cost;
  if(type==='hp')s.hp=s.maxHP+(b.hp||0);
  else s.sh=s.maxSH+(b.sh||0);
  try{if(typeof bumpStoryQuestProgress==='function')bumpStoryQuestProgress('repair',1,G.currentPlanet);}catch(e){}  // 시나리오 repair 퀘 연동
  updateHUD();notify(I18N.t('notify.shipRepairDone',{nm:shipDisplayNm(s),cr:cost.toLocaleString()}),'ok');
  saveGame(true);showShipDetailModal(idx);
}
function repairShipFullModal(idx){
  const s=G.fleet[idx];if(!s)return;
  const b=getPartBonus(s);
  const cost=repairCost(s)+shRepairCost(s);
  if(cost===0){notify(I18N.t('notify.alreadyFullyRepaired'),'warn');showShipDetailModal(idx);return;}
  if(G.credits<cost){notify(I18N.t('notify.needCreditsCost',{cost:cost.toLocaleString()}),'err');showShipDetailModal(idx);return;}
  G.credits-=cost;
  s.hp=s.maxHP+(b.hp||0);if(s.maxSH>0||(b.sh||0)>0)s.sh=s.maxSH+(b.sh||0);
  try{if(typeof bumpStoryQuestProgress==='function')bumpStoryQuestProgress('repair',1,G.currentPlanet);}catch(e){}  // 시나리오 repair 퀘 연동
  updateHUD();notify(I18N.t('notify.shipFullRepair',{nm:shipDisplayNm(s),cr:cost.toLocaleString()}),'gold');
  saveGame(true);showShipDetailModal(idx);
}
// ─── 자동 파츠 장착 클러스터 → js/modules/auto-equip.js 로 분할 (Phase A2, 2026-06-10) ───
//   자동 배치 (파츠 × 기함중심/평균배분) 전체 클러스터 (autoEquipParts*, _smartAutoEquip*, 헬퍼들)
//   13개 함수 window 전역 노출되어 기존 호출처 (HTML onclick, game.js) 무변경 동작
// 크루 슬롯 점유 셀 수 (렌더의 SLOT_MAP2와 동일: N/R=1 · H=2 · L/S=4)
// getMaxCrew(s)는 '셀' 용량을 반환하므로 배치도 헤드카운트가 아닌 셀 비용으로 계산해야
// 함선실 그리드에 실제로 모두 표시된다 (헤드카운트 기준이면 과다 배치되어 빈칸으로 보임).
const _CREW_SLOT_COST={N:1,R:1,H:2,L:4,S:4};
function _crewSlotCost(c){return _CREW_SLOT_COST[c&&c.rarity]||1;}
function autoAssignCrewFlagship(){
  if(!G.fleet.length){notify(I18N.t('notify.noShip'),'err');return;}
  _collectAllCrewToPool();
  const crew=_sortedCrewByPower();
  let ci=0;
  for(let si=0;si<G.fleet.length&&ci<crew.length;si++){
    const s=G.fleet[si];const cap=_shipCrewCap(s);if(!s.crewIds)s.crewIds=[];
    let used=0;
    // 셀 용량이 가득 차거나 남은 셀에 다음 크루가 안 들어갈 때까지 채움
    while(ci<crew.length&&used+_crewSlotCost(crew[ci])<=cap){
      used+=_crewSlotCost(crew[ci]);s.crewIds.push(crew[ci].id);ci++;
    }
  }
  notify(I18N.t('notify.crewAutoFlagship'),'gold');
  rerenderShipOrGarage();saveGame(true);
}
function autoAssignCrewEven(){
  if(!G.fleet.length){notify(I18N.t('notify.noShip'),'err');return;}
  _collectAllCrewToPool();
  const crew=_sortedCrewByPower();
  const used=G.fleet.map(()=>0);
  let ci=0;
  while(ci<crew.length){
    let placed=false;
    for(let si=0;si<G.fleet.length&&ci<crew.length;si++){
      const s=G.fleet[si];const cap=_shipCrewCap(s);if(!s.crewIds)s.crewIds=[];
      const cst=_crewSlotCost(crew[ci]);
      if(used[si]+cst<=cap){
        used[si]+=cst;s.crewIds.push(crew[ci].id);ci++;placed=true;
      }
    }
    if(!placed)break;
  }
  notify(I18N.t('notify.crewAutoEvenly'),'gold');
  rerenderShipOrGarage();saveGame(true);
}
// attachPart의 silent 버전 (개별 notify/저장 안 함)
function attachPartSilent(shipIdx,partId){
  const s=G.fleet[shipIdx];if(!s)return;
  const inv=G.inventory.find(i=>i.id===partId);if(!inv||inv.qty<=0)return;
  const _stBef=getShipStats(s);
  if(!s.parts)s.parts=[];s.parts.push(partId);
  inv.qty--;if(inv.qty===0)G.inventory.splice(G.inventory.indexOf(inv),1);
  _syncShipCapacity(s,_stBef);
}

// 모달 내 파츠 장착 — 장착 후 상세 팝업 재오픈
function pickPartModal(shipIdx){
  const s=G.fleet[shipIdx];if(!s)return;
  const inv=G.inventory.filter(i=>i.qty>0&&PARTS.find(p=>p.id===i.id));
  if(inv.length===0){notify(I18N.t('notify.noEquippableParts'),'warn');showShipDetailModal(shipIdx);return;}
  const catColM={weapon:'var(--red)',missile:'#ff8844',shield:'var(--blue)',armor:'var(--gold)',engine:'var(--cyan)'};
  const catIcM={weapon:'⚔️',missile:'🚀',shield:'🛡️',armor:'🛡',engine:'⚡'};
  let html2='';
  inv.forEach(i=>{
    const p=PARTS.find(x=>x.id===i.id);if(!p)return;
    const cc=catColM[p.cat]||'var(--dim)';
    const ic=catIcM[p.cat]||'⚙️';
    const st=p.cat==='weapon'?`ATT+${p.ATT}${p.wtype?' ['+p.wtype+']':''}`:p.cat==='shield'?I18N.t('ui.shdShield',{int:p.INT,maxSH:p.maxSH}):p.cat==='armor'?`HP+${p.HP}${p.DEF?' DEF+'+p.DEF:''}`:`ENG+${p.TEC}`;
    const gs=getPartGridSize(p);
    const sizeLabel=gs.cols===2&&gs.rows===2?'[2×2]':gs.cols===2?'[2×1]':'[1×1]';
    html2+=`<button onclick="attachPart(${shipIdx},'${i.id}');showShipDetailModal(${shipIdx})" style="display:flex;align-items:center;gap:10px;width:100%;background:rgba(0,0,0,.4);border:1px solid ${cc};border-radius:8px;padding:8px 10px;cursor:pointer;margin-bottom:6px;text-align:left" onmouseover="this.style.background='rgba(255,255,255,.06)'" onmouseout="this.style.background='rgba(0,0,0,.4)'">`
      +imgOrEmoji(`img/parts/${p.id}.png`,ic,36,36,'border-radius:5px;flex-shrink:0')
      +`<div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:bold;color:${cc}">${partDisplayNm(p)}<span style="font-size:11px;margin-left:5px;opacity:.7">${sizeLabel}</span></div>`
      +`<div style="font-size:12px;color:var(--dim)">T${p.tier} · ${st}</div></div>`
      +`<span style="font-size:12px;color:var(--green);flex-shrink:0">×${i.qty}</span>`
      +'</button>';
  });
  openModal(I18N.t('modal.partsMount',{nm:shipDisplayNm(s)}),`<div style="max-height:340px;overflow-y:auto">${html2}</div>`,[{txt:I18N.t('ui.backArrow'),fn:()=>showShipDetailModal(shipIdx),cls:'btn-sm'}]);
}
// 모달 내 크루 배치 — 배치 후 상세 팝업 재오픈
function pickCrewModal(shipIdx){
  const s=G.fleet[shipIdx];if(!s)return;
  const maxC=getMaxCrew(s);
  if((s.crewIds||[]).length>=maxC){notify(I18N.t('notify.shipFullCount',{n:maxC}),'err');showShipDetailModal(shipIdx);return;}
  const allCrew=[...G.crew,...(G.heroes||[]).map(hid=>Object.assign({},HEROES[hid],{id:hid,rarity:'S',isHero:true}))];
  if(allCrew.length===0){notify(I18N.t('notify.noCrew'),'warn');showShipDetailModal(shipIdx);return;}
  const RC3={N:'#888',R:'var(--blue)',H:'var(--purple)',L:'var(--gold)',S:'#ff6ec7'};
  const RORD3={L:0,H:1,R:2,N:3};
  const sorted3=[...allCrew].sort((a,b)=>(RORD3[a.rarity]??4)-(RORD3[b.rarity]??4));
  let html3='';
  sorted3.forEach(c=>{
    const col=c.isHero?'var(--gold)':RC3[c.rarity]||'#888';
    const imgSrc3=crewImgSrc(c);
    const onThis=(s.crewIds||[]).includes(c.id);
    const curShip=onThis?null:G.fleet.find(sh=>(sh.crewIds||[]).includes(c.id));
    const cb2=CREW_BONUS_TABLE[c.cl]||{att:3,int2:3,tec:3};
    const m2=RARITY_MULT[c.rarity]||1;
    const bn=[cb2.att?'ATT+'+Math.round(cb2.att*m2):'',cb2.int2?'SHD+'+Math.round(cb2.int2*m2):'',cb2.tec?'ENG+'+Math.round(cb2.tec*m2):''].filter(Boolean).join(' ');
    const lbl=onThis?I18N.t('ui.aboardLabel'):curShip?I18N.t('hud.currentShip',{nm:shipDisplayNm(curShip)}):'';
    html3+=`<button ${onThis?'disabled':''} onclick="${onThis?'':(`assignCrewById(${shipIdx},'${c.id}');showShipDetailModal(${shipIdx})`)}" style="display:flex;align-items:center;gap:7px;width:100%;background:rgba(0,0,0,.4);border:1px solid ${onThis?'rgba(255,255,255,.15)':col};border-radius:8px;padding:7px 8px;cursor:${onThis?'default':'pointer'};text-align:left;opacity:${onThis?.5:1}" ${onThis?'':`onmouseover="this.style.background='rgba(255,255,255,.06)'" onmouseout="this.style.background='rgba(0,0,0,.4)'"`}>`
      +imgOrEmoji(imgSrc3,c.ic||'🧑',36,36,`border-radius:50%;flex-shrink:0;border:1px solid ${col}`)
      +`<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:bold;color:${col}">${c.isHero?'⭐ ':''}${crewDisplayNm(c)}</div>`
      +`<div style="font-size:11px;color:var(--dim)">${c.cl||''}${bn?' · '+bn:''}</div>`
      +(lbl?`<div style="font-size:11px;color:var(--gold)">${lbl}</div>`:'')
      +'</div>'
      +'</button>';
  });
  openModal(I18N.t('modal.crewAssignTitle',{nm:shipDisplayNm(s),now:(s.crewIds||[]).length,max:maxC}),
    `<div style="max-height:380px;overflow-y:auto"><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">${html3}</div></div>`,
    [{txt:I18N.t('btn.goBack'),fn:()=>showShipDetailModal(shipIdx),cls:'btn-sm'}]);
}
// 모달 내 크루 해제
function unassignCrewModal(shipIdx,crewSlotIdx){
  const s=G.fleet[shipIdx];if(!s||!s.crewIds)return;
  if(crewSlotIdx<0||crewSlotIdx>=s.crewIds.length){notify(I18N.t('notify.invalidCrewSlot'),'err');return;}
  const cid=s.crewIds[crewSlotIdx];const c=G.crew.find(x=>x.id===cid)||(G.heroes||[]).map(h=>({...HEROES[h],id:h,rarity:'S'})).find(x=>x.id===cid);
  s.crewIds.splice(crewSlotIdx,1);
  notify(I18N.t('notify.crewDisembark',{nm:(c?crewDisplayNm(c):'')||I18N.t('ui.crewShort')}),'ok');
  saveGame(true);showShipDetailModal(shipIdx);
}
// 함선의 모든 크루 일괄 하선
function unassignAllCrew(shipIdx){
  const s=G.fleet[shipIdx];if(!s||!s.crewIds||s.crewIds.length===0)return;
  const n=s.crewIds.length;
  s.crewIds=[];
  notify(I18N.t('notify.allCrewDisembark',{n}),'ok');
  saveGame(true);rerenderShipOrGarage();
}
// 함선의 모든 파츠 일괄 해제 → 인벤토리로 회수
function unassignAllParts(shipIdx){
  const s=G.fleet[shipIdx];if(!s||!s.parts||s.parts.length===0)return;
  const _stBef=getShipStats(s);
  const n=s.parts.length;
  s.parts.forEach(pid=>addToInventory(pid));
  s.parts=[];
  // HP/SH 클램프 (장갑/실드 파츠 제거 후 최대치 감소 반영) — undefined 방지 폴백
  const _stAft=getShipStats(s);
  s.hp=Math.min(s.hp||0,_stAft.HP);
  s.sh=Math.min(s.sh||0,_stAft.maxSH);
  notify(I18N.t('notify.partsAllUnequip',{nm:shipDisplayNm(s),n}),'ok');
  saveGame(true);rerenderShipOrGarage();
}
function repairShipFull(idx){
  const s=G.fleet[idx];if(!s)return;
  const b=getPartBonus(s);
  const cost=repairCost(s)+shRepairCost(s);
  if(cost===0){notify(I18N.t('notify.alreadyFullyRepaired'),'warn');return;}
  if(G.credits<cost){notify(I18N.t('notify.needCreditsCost',{cost:cost.toLocaleString()}),'err');return;}
  G.credits-=cost;
  s.hp=s.maxHP+(b.hp||0);
  if(s.maxSH>0||(b.sh||0)>0)s.sh=s.maxSH+(b.sh||0);
  updateHUD();notify(I18N.t('notify.shipFullRepair',{nm:shipDisplayNm(s),cr:cost.toLocaleString()}),'gold');rerenderShipOrGarage();saveGame(true);
}
function assignCrew(shipIdx){
  const s=G.fleet[shipIdx];
  if(!s){notify(I18N.t('notify.shipNotFound'),'err');return;}
  if(!s.crewIds)s.crewIds=[];
  const sel=document.getElementById('crew-sel-'+shipIdx);
  if(!sel){notify(I18N.t('notify.crewSelectNotShown'),'err');return;}
  if(!sel.value||sel.value===''){notify(I18N.t('notify.selectCrewToBoard'),'warn');return;}
  const cid=sel.value;
  // 이미 이 함선에 탑승 중
  if(s.crewIds.includes(cid)){notify(I18N.t('notify.alreadyAboard'),'warn');return;}
  // 최대 탑승 인원 체크 (10명)
  const _maxC=getMaxCrew(s);if(s.crewIds.length>=_maxC){notify(I18N.t('notify.maxCrewReached',{max:_maxC,cur:s.crewIds.length}),'err');return;}
  // 다른 함선에서 자동 이전
  G.fleet.forEach(sh=>{if(sh!==s&&sh.crewIds){const i=sh.crewIds.indexOf(cid);if(i>=0){sh.crewIds.splice(i,1);}}});
  const _stBefAC=getShipStats(s);
  s.crewIds.push(cid);
  _syncShipCapacity(s,_stBefAC);
  const allPeople=[...G.crew,...G.heroes.map(h=>({...HEROES[h],id:h,rarity:'S',isHero:true}))];
  const c=allPeople.find(x=>x.id===cid);
  notify(I18N.t('notify.crewBoardDone',{ic:c?.ic||'🧑',nm:(c?crewDisplayNm(c):'')||I18N.t('ui.crewShort'),ship:shipDisplayNm(s)}),'ok');
  baekgu(I18N.t('baekgu.crewBoardedShip',{nm:(c?crewDisplayNm(c):'')||I18N.t('ui.crewShort'),ship:shipDisplayNm(s)}));
  rerenderShipOrGarage();saveGame(true);
}
// 이미지 카드 클릭으로 직접 크루 탑승 (ID 기반)
function assignCrewById(shipIdx,cid){
  const s=G.fleet[shipIdx];
  if(!s){notify(I18N.t('notify.shipNotFound'),'err');return;}
  if(!s.crewIds)s.crewIds=[];
  if(s.crewIds.includes(cid)){notify(I18N.t('notify.alreadyAboard'),'warn');return;}
  const _maxC=getMaxCrew(s);
  if(s.crewIds.length>=_maxC){notify(I18N.t('notify.shipFullShort',{max:_maxC,cur:s.crewIds.length}),'err');return;}
  // 다른 함선에서 자동 이전
  G.fleet.forEach(sh=>{if(sh!==s&&sh.crewIds){const i=sh.crewIds.indexOf(cid);if(i>=0){sh.crewIds.splice(i,1);}}});
  const _stBefACB=getShipStats(s);
  s.crewIds.push(cid);
  _syncShipCapacity(s,_stBefACB);
  const allPeople=[...G.crew,...G.heroes.map(h=>({...HEROES[h],id:h,rarity:'S',isHero:true}))];
  const c=allPeople.find(x=>x.id===cid);
  notify(I18N.t('notify.crewBoard',{ic:c?.ic||'🧑',nm:(c?crewDisplayNm(c):'')||I18N.t('ui.crewShort'),ship:shipDisplayNm(s)}),'ok');
  rerenderShipOrGarage();saveGame(true);
}
function unassignCrew(shipIdx,crewSlotIdx){
  const s=G.fleet[shipIdx];if(!s||!s.crewIds)return;
  const cid=s.crewIds[crewSlotIdx];const c=G.crew.find(x=>x.id===cid)||G.heroes.map(h=>({...HEROES[h],id:h,rarity:'S'})).find(x=>x.id===cid);
  s.crewIds.splice(crewSlotIdx,1);
  notify(I18N.t('notify.crewDisembark',{nm:(c?crewDisplayNm(c):'')||I18N.t('ui.crewShort')}),'ok');
  rerenderShipOrGarage();saveGame(true);
}
function pickPartForSlot(shipIdx){
  const s=G.fleet[shipIdx];if(!s)return;
  const inv=G.inventory.filter(i=>i.qty>0&&PARTS.find(p=>p.id===i.id));
  if(inv.length===0){notify(I18N.t('notify.noEquippableParts'),'warn');return;}
  const catColM={weapon:'var(--red)',shield:'var(--blue)',armor:'var(--gold)',engine:'var(--cyan)'};
  const catIcM={weapon:'⚔️',shield:'🛡️',armor:'🛡',engine:'⚡'};
  let html2='';
  inv.forEach(i=>{
    const p=PARTS.find(x=>x.id===i.id);if(!p)return;
    const cc=catColM[p.cat]||'var(--dim)';
    const ic=catIcM[p.cat]||'⚙️';
    const st=p.cat==='weapon'?`ATT+${p.ATT}${p.wtype?' ['+p.wtype+']':''}`:p.cat==='shield'?I18N.t('ui.shdShield',{int:p.INT,maxSH:p.maxSH}):p.cat==='armor'?`HP+${p.HP}${p.DEF?' DEF+'+p.DEF:''}`:`ENG+${p.TEC}`;
    const gs=getPartGridSize(p);
    const sizeLabel=gs.cols===2&&gs.rows===2?'[2×2]':gs.cols===2?'[2×1]':'[1×1]';
    // 제작 등급 배지 (사용자 요청)
    const _gradeBadge=i.crafted&&i.qualityLabel?`<span style="display:inline-block;margin-left:6px;font-size:10px;padding:1px 6px;border-radius:3px;background:rgba(255,215,0,.15);color:#ffd700;border:1px solid rgba(255,215,0,.5);font-weight:bold">${i.qualityLabel}${i.quality?' ×'+(+i.quality).toFixed(2):''}</span>`:'';
    html2+=`<button onclick="attachPart(${shipIdx},'${i.id}');closeModal()" style="display:flex;align-items:center;gap:10px;width:100%;background:rgba(0,0,0,.4);border:1px solid ${cc};border-radius:8px;padding:8px 10px;cursor:pointer;margin-bottom:6px;text-align:left" onmouseover="this.style.background='rgba(255,255,255,.06)'" onmouseout="this.style.background='rgba(0,0,0,.4)'">`
      +imgOrEmoji(`img/parts/${p.id}.png`,ic,36,36,'border-radius:5px;flex-shrink:0')
      +`<div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:bold;color:${cc}">${partDisplayNm(p)}<span style="font-size:11px;margin-left:5px;opacity:.7">${sizeLabel}</span>${_gradeBadge}</div>`
      +`<div style="font-size:12px;color:var(--dim)">T${p.tier} · ${st}</div></div>`
      +`<span style="font-size:12px;color:var(--green);flex-shrink:0">×${i.qty}</span>`
      +'</button>';
  });
  openModal(I18N.t('modal.partsMount',{nm:shipDisplayNm(s)}),`<div style="max-height:340px;overflow-y:auto">${html2}</div>`,[{txt:I18N.t('ui.exitX'),fn:closeModal,cls:'btn-sm'}]);
}
window._crewPickSort=window._crewPickSort!==undefined?window._crewPickSort:'rarity'; // rarity | cl | name
function pickCrewForSlot(shipIdx){
  const s=G.fleet[shipIdx];if(!s)return;
  const maxC=getMaxCrew(s);
  if((s.crewIds||[]).length>=maxC){notify(I18N.t('notify.shipFullCount',{n:maxC}),'err');return;}
  const allCrew=[...G.crew,...G.heroes.map(hid=>Object.assign({},HEROES[hid],{id:hid,rarity:'S',isHero:true}))];
  if(allCrew.length===0){notify(I18N.t('notify.noCrew'),'warn');return;}
  const RC3={N:'#888',R:'var(--blue)',H:'var(--purple)',L:'var(--gold)',S:'#ff6ec7'};
  const RORD3={L:0,H:1,R:2,N:3};
  // 등급별/클래스/이름 정렬
  const sorted3=[...allCrew];
  if(window._crewPickSort==='rarity') sorted3.sort((a,b)=>(RORD3[a.rarity]??4)-(RORD3[b.rarity]??4));
  else if(window._crewPickSort==='cl') sorted3.sort((a,b)=>(a.cl||'').localeCompare(b.cl||''));
  else if(window._crewPickSort==='name') sorted3.sort((a,b)=>(a.nm||'').localeCompare(b.nm||''));

  function _sortBtn3(key,label){
    const act=window._crewPickSort===key;
    return `<button onclick="window._crewPickSort='${key}';pickCrewForSlot(${shipIdx})" style="padding:3px 10px;border:1px solid ${act?'var(--cyan)':'rgba(255,255,255,.2)'};background:${act?'rgba(0,243,255,.12)':'transparent'};color:${act?'var(--cyan)':'rgba(255,255,255,.5)'};cursor:pointer;border-radius:4px;font-size:11px;font-family:Courier New,monospace">${label}</button>`;
  }
  const sortBar3=`<div style="display:flex;gap:5px;margin-bottom:10px;align-items:center">
    <span style="font-size:11px;color:var(--dim)">${I18N.t('ui.sortPrefix')}</span>
    ${_sortBtn3('rarity',I18N.t('ui.sortByRarity'))}${_sortBtn3('cl',I18N.t('ui.sortByClass'))}${_sortBtn3('name',I18N.t('ui.sortByName'))}
  </div>`;

  let html3='';
  sorted3.forEach(c=>{
    const col=c.isHero?'var(--gold)':RC3[c.rarity]||'#888';
    const imgSrc3=crewImgSrc(c);
    const onThis=(s.crewIds||[]).includes(c.id);
    const curShip=onThis?null:G.fleet.find(sh=>(sh.crewIds||[]).includes(c.id));
    const cb2=CREW_BONUS_TABLE[c.cl]||{att:3,int2:3,tec:3};
    const m2=RARITY_MULT[c.rarity]||1;
    const bn=[cb2.att?'ATT+'+Math.round(cb2.att*m2):'',cb2.int2?'SHD+'+Math.round(cb2.int2*m2):'',cb2.tec?'ENG+'+Math.round(cb2.tec*m2):''].filter(Boolean).join(' ');
    const lbl=onThis?I18N.t('ui.alreadyAboardLabel'):curShip?I18N.t('hud.currentShip',{nm:shipDisplayNm(curShip)}):'';
    html3+=`<button ${onThis?'disabled':''} onclick="${onThis?'':(`assignCrewById(${shipIdx},'${c.id}');closeModal()`)}" style="display:flex;align-items:center;gap:7px;width:100%;min-width:0;background:rgba(0,0,0,.4);border:1px solid ${onThis?'rgba(255,255,255,.15)':col};border-radius:8px;padding:7px 8px;cursor:${onThis?'default':'pointer'};text-align:left;opacity:${onThis?.5:1}" ${onThis?'':`onmouseover="this.style.background='rgba(255,255,255,.06)'" onmouseout="this.style.background='rgba(0,0,0,.4)'"`}>`
      +imgOrEmoji(imgSrc3,c.ic||'🧑',36,36,`border-radius:50%;flex-shrink:0;border:1px solid ${col}`)
      +`<div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:bold;color:${col}">${c.isHero?'⭐ ':''}${crewDisplayNm(c)}</div>`
      +`<div style="font-size:12px;color:var(--dim)">${c.cl||''}${bn?' · '+bn:''}</div>`
      +(lbl?`<div style="font-size:11px;color:var(--gold)">${lbl}</div>`:'')
      +'</div>'
      +'</button>';
  });
  openModal(I18N.t('modal.crewAssignTitle',{nm:shipDisplayNm(s),now:(s.crewIds||[]).length,max:maxC}),
    `<div>${sortBar3}<div style="max-height:380px;overflow-y:auto"><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">${html3}</div></div></div>`,
    [{txt:I18N.t('btn.exitX'),fn:closeModal,cls:'btn-sm'}]);
}

function getShipSellPrice(ship){
  // 카탈로그 매칭: catalogId/catId 우선, 없으면 id에서 _craft·인스턴스 접미사 제거
  //   (버그픽스: 제작 함선 id 'LGD01_craft_123' 가 매칭 실패해 신화함 매각가가 최저로 떨어지던 문제)
  const _strip=String(ship.id||'').replace(/_craft/g,'').replace(/(?:_\d+|_main)$/,'');
  const catalogId=ship.catalogId||ship.catId||_strip;
  const def=SHIP_CATALOG.find(s=>s.id===catalogId)||SHIP_CATALOG.find(s=>s.id===_strip)||SHIP_CATALOG.find(s=>s.catalogId===catalogId);
  const basePrice=def?def.price:(ship.tier==='신화'?20000000:ship.tier==='전설기함'?3000000:ship.tier==='대형'?200000:ship.tier==='중형'?50000:10000);
  const sellRatio={easy:0.85,normal:0.80,hard:0.75,extreme:0.70}[G.difficulty]||0.80;
  const tierBase={소형:5,중형:10,대형:20}[ship.tier]||5;
  const cargoUpgrade=Math.max(0,(ship.cargoSlots||tierBase)-tierBase);
  const cargoRefund=Math.floor(cargoUpgrade/2*5000*0.4);
  // 마르코 폴로 영웅 보유 시 판매가 +10%
  const marcoMult=(G&&G.heroes&&G.heroes.includes('H08'))?1.20:1.0;
  // 함선 강화 레벨 보너스 — 레벨당 +10% (사용자 요청, 0~10 단계 × 5% 능력치 보너스 기반 ×2)
  const enhanceLv=clamp(ship._enhanceLv||0,0,10);
  const enhanceMult=1+enhanceLv*0.10;
  const baseTotal=Math.floor(basePrice*sellRatio*marcoMult*enhanceMult)+cargoRefund;
  return {total:baseTotal, base:Math.floor(basePrice*sellRatio*marcoMult*enhanceMult), cargoRefund, ratio:Math.round(sellRatio*100), marco:marcoMult>1, enhanceLv, enhanceMult};
}
function confirmSellShip(idx){
  if(G.fleet.length<=1){notify(I18N.t('notify.onlyOneShipNoSell'),'err');return;}
  const s=G.fleet[idx];if(!s)return;
  const sp=getShipSellPrice(s);
  const partsCount=(s.parts||[]).length;
  const crewCount=(s.crewIds||[]).length;
  const msg=`<div style="text-align:center;padding:8px">
    <div style="margin-bottom:8px;display:flex;justify-content:center">${imgOrEmoji(shipImgSrc(s),'🛸',160,160,'border-radius:14px;background:rgba(0,0,0,.5);object-fit:contain',shipLoreKey(s))}</div>
    <div style="font-size:19px;font-weight:bold;margin-bottom:12px">${(typeof shipDisplayNm==="function"?shipDisplayNm(s):s.nm)}</div>
    <div style="background:var(--card);border-radius:8px;padding:12px;font-size:14px;line-height:2;text-align:left">
      <div>${I18N.t('ui.sellPriceRatio',{cr:sp.total.toLocaleString(),pct:sp.ratio,marco:sp.marco?' <span style="color:var(--gold);font-size:12px">🧭+10%</span>':''})}</div>
      <div style="color:var(--dim);font-size:13px">${I18N.t('ship.basePrice',{base:sp.base.toLocaleString()})}${sp.cargoRefund>0?I18N.t('ship.cargoRefund',{cargo:sp.cargoRefund.toLocaleString()}):''}</div>
      ${partsCount>0?`<div style="color:var(--cyan);margin-top:4px">${I18N.t('ui.partsAutoReturn',{n:partsCount})}</div>`:''}
      ${crewCount>0?`<div style="color:var(--yellow);margin-top:2px">${I18N.t('ui.crewAutoDisem',{n:crewCount})}</div>`:''}
    </div>
    <div style="color:var(--red);font-size:13px;margin-top:10px">${I18N.t('ui.shipDataDeleted')}</div>
  </div>`;
  openModal(I18N.t('modal.confirmShipSale'),msg,[
    {txt:I18N.t('ui.sellGetTotal',{p:sp.total.toLocaleString()}),fn:()=>{closeModal();sellShip(idx);},cls:'btn-red'},
    {txt:I18N.t('btn.cancel'),fn:closeModal,cls:'btn-sm'}
  ]);
}
function sellShip(idx){
  if(G.fleet.length<=1){notify(I18N.t('notify.onlyOneShip'),'err');return;}
  const s=G.fleet[idx];if(!s)return;
  // 함선 매각 취소용 깊은 복사 (파츠 분리·크루 하선 직전 상태)
  const _undoShip=JSON.parse(JSON.stringify(s));
  // 파츠 자동 분리 → 인벤토리 반환
  (s.parts||[]).forEach(pid=>addToInventory(pid));
  s.parts=[];
  // 창고 확장 파츠 자동 분리 → 인벤토리 반환 (사용자 요청)
  const _cargoBack=_detachAllCargoExt(s);
  // 크루 자동 하선
  s.crewIds=[];
  // 판매가 계산
  const sp=getShipSellPrice(s);
  G.credits+=sp.total;
  // 기함 판매시 다음 함선이 기함으로
  G.fleet.splice(idx,1);
  if(idx===0&&G.fleet.length>0){/* index 0 제거 → 자동으로 다음 함선이 기함 */}
  // 임시창 → 선발 자동 승급 (16척 미만 시)
  _promoteReserveIfRoom();
  // 화물·재료 정합성 보정 — 함선 판매 후 cargoSlots 합이 줄어도 재료가 누락되지 않게 G.materials 기반 슬롯 복구
  try{_validateCargoIntegrity();}catch(e){console.warn('cargo validate(sellShip) failed',e);}
  try{_recordSell({type:'ship',ship:_undoShip,credits:sp.total,label:shipDisplayNm(s)});}catch(e){}
  updateHUD();
  notify(I18N.t('notify.shipSoldFull',{nm:shipDisplayNm(s),cr:sp.total.toLocaleString(),cargo:_cargoBack>0?I18N.t('notify.cargoRecoveredN',{n:_cargoBack}):''}),'gold');
  baekgu(I18N.t('baekgu.shipSoldCash',{nm:shipDisplayNm(s),cr:sp.total.toLocaleString()}));
  rerenderShipOrGarage();saveGame(true);
}
function renameShip(idx){
  const s=G.fleet[idx];if(!s)return;
  openModal(I18N.t('modal.renameShip'),
    `<div style="padding:8px">
      <div style="color:var(--dim);font-size:14px;margin-bottom:12px">${I18N.t('ui.curName',{nm:(typeof shipDisplayNm==='function'?shipDisplayNm(s):s.nm)})}</div>
      <input class="inp" id="rename-inp" maxlength="20" placeholder="${I18N.t('ui.renamePlaceholder')}" value="${(typeof shipDisplayNm==="function"?shipDisplayNm(s):s.nm)}"
        style="width:100%;margin-bottom:4px"
        onkeydown="if(event.key==='Enter')confirmRenameShip(${idx})">
      <div style="color:var(--muted);font-size:12px;margin-top:6px">${I18N.t('ui.renameAllowed')}</div>
    </div>`,
    [{txt:I18N.t('btn.confirmChange'),fn:()=>confirmRenameShip(idx),cls:'btn-gold'},{txt:I18N.t('btn.cancel'),fn:closeModal,cls:'btn-sm'}]
  );
  setTimeout(()=>{const el=document.getElementById('rename-inp');if(el){el.focus();el.select();}},100);
}
function confirmRenameShip(idx){
  const s=G.fleet[idx];if(!s)return;
  const inp=document.getElementById('rename-inp');
  if(!inp)return;
  const newName=inp.value.trim();
  if(!newName){notify(I18N.t('notify.enterName'),'warn');return;}
  if(newName.length>20){notify(I18N.t('notify.nameMax20'),'err');return;}
  const oldName=s.nm;
  s.nm=newName;
  closeModal();
  notify(`✏️ ${oldName} → ${newName}`,'ok');
  baekgu(I18N.t('baekgu.shipRenamed',{nm:newName}));
  rerenderShipOrGarage();saveGame(true);
}
function setFlagship(idx){
  if(idx===0){notify(I18N.t('notify.alreadyFlagship'),'err');return;}
  const tmp=G.fleet[0];G.fleet[0]=G.fleet[idx];G.fleet[idx]=tmp;
  const fnm=(G.fleet[0]?shipDisplayNm(G.fleet[0]):'')||I18N.t('ui.flagship');notify(I18N.t('notify.flagshipSet',{nm:fnm}),'gold');
  baekgu(I18N.t('baekgu.flagshipChanged',{nm:fnm}));
  rerenderShipOrGarage();saveGame(true);
}
function getCargoUpgradePrice(ship){
  const tierBase={소형:5,중형:10,대형:20,전설기함:30,신화:40}[ship.tier]||5;
  const upgCount=Math.max(0,Math.floor(((ship.cargoSlots||tierBase)-tierBase)/2));
  return Math.round(5000*Math.pow(1.5,upgCount)/100)*100; // 100단위 올림
}
// 팝업에서 창고 업그레이드 — 모달 닫지 않고 팝업 새로고침
function upgradeCargoSlotFromModal(shipIdx){
  upgradeCargoSlot(shipIdx, true);
}
function upgradeCargoSlot(shipIdx, fromModal){
  const s=G.fleet[shipIdx];if(!s)return;
  // cargoSlots 누락 시 티어 기본값으로 초기화 (구버전 세이브/캡쳐 함선 대응)
  if(typeof s.cargoSlots!=='number'||s.cargoSlots<=0){
    s.cargoSlots=({소형:5,중형:10,대형:20,전설기함:30,신화:40})[s.tier]||5;
  }
  const cur=s.cargoSlots;
  if(cur>=100){
    // 최대 100칸 경고창
    const warnModal=document.createElement('div');
    warnModal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:center;justify-content:center';
    warnModal.innerHTML=`<div style="background:#0a1628;border:2px solid var(--red);border-radius:14px;padding:28px 32px;max-width:360px;text-align:center;box-shadow:0 0 40px rgba(255,60,60,.4)">
      <div style="font-size:44px;margin-bottom:10px">🚫</div>
      <div style="color:var(--red);font-size:18px;font-weight:bold;margin-bottom:8px">${I18N.t('ui.cargoMaxReached')}</div>
      <div style="color:var(--dim);font-size:14px;line-height:1.7;margin-bottom:18px">
        ${I18N.t('ui.cargoBayReachedMax',{nm:shipDisplayNm(s)})}<br>
        ${I18N.t('ui.cannotExpandMore')}
      </div>
      <button class="btn btn-sm btn-red" style="padding:8px 28px;font-size:14px" onclick="this.closest('[style*=fixed]').remove()">${I18N.t('ui.confirm')}</button>
    </div>`;
    document.body.appendChild(warnModal);
    return;
  }
  if(cur+2>100){notify(I18N.t('notify.cargoMax80',{add:100-cur}),'err');return;}
  const cost=getCargoUpgradePrice(s);
  if(G.credits<cost){notify(I18N.t('notify.needCreditsCost',{cost:cost.toLocaleString()}),'err');return;}
  G.credits-=cost;s.cargoSlots=Math.min(100,cur+2);
  updateHUD();notify(I18N.t('notify.holdExpanded',{nm:shipDisplayNm(s),n:s.cargoSlots,cr:cost.toLocaleString()}),'ok');
  baekgu(I18N.t('baekgu.holdExpanded',{nm:shipDisplayNm(s),n:s.cargoSlots,note:s.cargoSlots>=100?I18N.t('baekgu.holdMaxReached'):I18N.t('baekgu.holdNextExpensive')}));
  if(fromModal){showShipDetailModal(shipIdx);}else{rerenderShipOrGarage();}
  saveGame(true);
}
function buyCargoExtPart(id){
  const ci=SPECIAL_CARGO_PARTS.find(c=>c.id===id);if(!ci)return;
  const stock=G.shopStock[G.currentPlanet];
  if(!stock||!stock['scargo_'+id]||stock['scargo_'+id]<=0){notify(I18N.t('notify.outOfStock'),'err');return;}
  if(G.credits<ci.price){notify(I18N.t('notify.needCreditsCost',{cost:ci.price.toLocaleString()}),'err');return;}
  // 즉시 적용 → 인벤토리 적립으로 변경. 정비소 파츠창의 「창고 확장 전용 슬롯」에 함선별로 장착.
  G.credits-=ci.price;
  stock['scargo_'+id]--;
  addToInventory(id,1);
  updateHUD();
  notify(I18N.t('notify.holdPartBought',{nm:partDisplayNm(ci)||ci.nm}),'gold');
  baekgu(I18N.t('baekgu.holdPartBought',{nm:partDisplayNm(ci)||ci.nm,bonus:ci.cargoBonus}));
  rerenderShipOrGarage();saveGame(true);
}
// ── 창고 확장 전용 슬롯 (함선당 최대 8칸) — 장착/해제/선택 ─────────────────
const CARGO_EXT_MAX=4;
function _shipCargoExt(s){if(!s.cargoExtParts)s.cargoExtParts=[];return s.cargoExtParts;}
function equipCargoExt(shipIdx,partId){
  const s=G.fleet[shipIdx];if(!s)return;
  const sc=SPECIAL_CARGO_PARTS.find(c=>c.id===partId);if(!sc){notify(I18N.t('notify.holdExpDefMissing'),'err');return;}
  const inv=(G.inventory||[]).find(i=>i.id===partId&&i.qty>0);
  if(!inv){notify(I18N.t('notify.noHoldExpansion'),'err');return;}
  const ext=_shipCargoExt(s);
  if(ext.length>=CARGO_EXT_MAX){notify(I18N.t('notify.holdExpFull',{max:CARGO_EXT_MAX}),'err');return;}
  inv.qty--;if(inv.qty<=0)G.inventory=G.inventory.filter(i=>i!==inv);
  ext.push(partId);
  s.cargoSlots=(s.cargoSlots||4)+sc.cargoBonus;
  closeModal();
  notify(I18N.t('notify.holdPartEquipped',{nm:shipDisplayNm(s),part:partDisplayNm(sc)||sc.nm,bonus:sc.cargoBonus,n:s.cargoSlots}),'gold');
  updateHUD();rerenderShipOrGarage();saveGame(true);
}
function unequipCargoExt(shipIdx,slotIdx){
  const s=G.fleet[shipIdx];if(!s)return;
  const ext=_shipCargoExt(s);
  const partId=ext[slotIdx];if(!partId)return;
  const sc=SPECIAL_CARGO_PARTS.find(c=>c.id===partId);
  ext.splice(slotIdx,1);
  if(sc)s.cargoSlots=Math.max((({소형:5,중형:10,대형:20,전설기함:30,신화:40})[s.tier]||4),(s.cargoSlots||4)-sc.cargoBonus);
  addToInventory(partId,1);
  notify(I18N.t('notify.holdPartUnequip',{nm:sc?(partDisplayNm(sc)||sc.nm):I18N.t('ui.cargoExp')}),'ok');
  updateHUD();rerenderShipOrGarage();saveGame(true);
}
function pickCargoExtForSlot(shipIdx){
  const s=G.fleet[shipIdx];if(!s)return;
  const owned=(G.inventory||[]).filter(i=>i.qty>0&&SPECIAL_CARGO_PARTS.find(c=>c.id===i.id));
  if(owned.length===0){
    openModal(I18N.t('modal.noHoldExpansion'),`<div style="padding:12px;font-size:13px;color:var(--dim);line-height:1.8">${I18N.t('ui.noHoldExpOwned')}<br>${I18N.t('ui.noHoldExpHelp')}</div>`,[{txt:I18N.t('btn.close'),fn:closeModal,cls:'btn-sm'}]);
    return;
  }
  const cards=owned.map(iv=>{
    const sc=SPECIAL_CARGO_PARTS.find(c=>c.id===iv.id);
    const col=sc.rarity==='mythic'?'#ff88ff':sc.rarity==='legend'?'var(--gold)':sc.rarity==='epic'?'#c080ff':'var(--cyan)';
    return `<div onclick="equipCargoExt(${shipIdx},'${iv.id}')" style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--card);border:1px solid ${col}66;border-radius:8px;cursor:pointer" onmouseover="this.style.background='rgba(212,175,55,.1)'" onmouseout="this.style.background='var(--card)'">
      ${imgOrEmoji('img/parts/'+iv.id+'.png',sc.ic||'📦',44,44,'border-radius:6px;background:rgba(0,0,0,.4);object-fit:contain;flex-shrink:0','part_'+iv.id)}
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:bold;color:${col}">${partDisplayNm(sc)||sc.nm}</div>
        <div style="font-size:11px;color:var(--green)">${I18N.t('ui.cargoBonusOwn',{n:sc.cargoBonus,q:iv.qty})}</div>
      </div>
      <span style="font-size:12px;color:var(--gold);font-weight:bold">${I18N.t('ui.equipArrowChip')}</span>
    </div>`;
  }).join('');
  const ext=_shipCargoExt(s);
  openModal(I18N.t('modal.holdExpSlot',{nm:shipDisplayNm(s),now:ext.length,max:CARGO_EXT_MAX}),
    `<div style="padding:6px 4px;display:flex;flex-direction:column;gap:6px;max-height:60vh;overflow-y:auto">${cards}</div>`,
    [{txt:I18N.t('btn.close'),fn:closeModal,cls:'btn-sm'}]);
}
function buyShip(shipId){
  const def=SHIP_CATALOG.find(s=>s.id===shipId);if(!def)return;
  // 사용자 요청 2026-06-09: 같은 함선 최대 8대 — 함대 다양성 강제 + 백구 안내
  const _sameCnt=_countSameShip(def.catalogId||def.id);
  if(_sameCnt>=SAME_SHIP_CAP){
    const _nm=shipDisplayNm(def)||def.nm;
    notify(I18N.t('notify.sameShipMax',{nm:_nm,max:SAME_SHIP_CAP}),'err');
    baekgu(I18N.t('baekgu.sameShipMax',{nm:_nm,max:SAME_SHIP_CAP}));
    return;
  }
  const stock=G.shopStock[G.currentPlanet];
  if(!stock||!stock['ship_'+shipId]||stock['ship_'+shipId]<=0){notify(I18N.t('notify.outOfStock'),'err');return;}
  // 함선 등급별 전투력 구매 잠금
  const _plv=calcPlayerLevel();
  if(def.tier==='중형'&&_plv<200){notify(I18N.t('notify.shipMediumLocked',{plv:_plv}),'err');return;}
  if(def.tier==='대형'&&_plv<400){notify(I18N.t('notify.shipLargeLocked',{plv:_plv}),'err');return;}
  if((def.tier==='전설기함'||def.tier==='신화')&&_plv<600){notify(I18N.t('notify.shipLegendLocked',{plv:_plv}),'err');return;}
  const shipFinalPrice=G.heroes.includes('H01')?Math.floor(def.price*0.85):def.price;
  if(G.credits<shipFinalPrice){notify(I18N.t('notify.needCreditsCost',{cost:shipFinalPrice.toLocaleString()}),'err');return;}
  G.credits-=shipFinalPrice;stock['ship_'+shipId]--;
  const slotsByTier={소형:4,중형:8,대형:12,전설기함:16,신화:20};
  const _initCargo=(typeof def.cargoStart==='number')?def.cargoStart:(slotsByTier[def.tier]||5);
  addShipToFleet({id:def.id+'_'+Date.now(),catalogId:def.catalogId||def.id,nm:def.nm,tier:def.tier,maxHP:def.maxHP,hp:def.maxHP,maxSH:def.maxSH,sh:def.maxSH,ATT:def.ATT,INT:def.INT,TEC:def.TEC,HP:def.maxHP,LOY:80,parts:[],crewIds:[],cargoSlots:_initCargo});
  updateHUD();baekgu(I18N.t('baekgu.shipBought',{nm:shipDisplayNm(def)||def.nm}));notify(I18N.t('notify.shipBought',{nm:shipDisplayNm(def)||def.nm}),'gold');rerenderShipOrGarage();saveGame(true);
}
function buyPart(partId){
  const p=PARTS.find(x=>x.id===partId);if(!p)return;
  const stock=G.shopStock[G.currentPlanet];
  if(!stock||!stock['part_'+partId]||stock['part_'+partId]<=0){notify(I18N.t('notify.outOfStock'),'err');return;}
  const partFinalPr=G.heroes.includes('H01')?Math.floor(p.price*0.85):p.price;
  if(G.credits<partFinalPr){notify(I18N.t('notify.notEnoughCredits'),'err');return;}
  G.credits-=partFinalPr;stock['part_'+partId]--;addToInventory(partId);
  updateHUD();notify(I18N.t('notify.partBought',{nm:partDisplayNm(p)||p.nm}),'gold');rerenderShipOrGarage();saveGame(true);
}
function attachPart(shipIdx,partId){
  const s=G.fleet[shipIdx];if(!s)return;
  const inv=G.inventory.find(i=>i.id===partId);if(!inv||inv.qty<=0){notify(I18N.t('notify.noOwnedParts'),'err');return;}
  // 시나리오 탐사 퀘 연동 2026-06-11: 파츠 장착 성공 시(검증 통과 후) install/tuning 태그 진행
  try{if(typeof bumpStoryQuestProgress==='function')bumpStoryQuestProgress('install',1,G.currentPlanet);}catch(e){}
  const _stBef=getShipStats(s);
  if(!s.parts)s.parts=[];
  if(!s._partsQuality)s._partsQuality=[];
  // 동일 함선 내 _partsQuality 와 s.parts 길이 정렬 유지
  while(s._partsQuality.length<s.parts.length)s._partsQuality.push(null);
  s.parts.push(partId);
  // 제작 등급 정보 보존 (있으면 함선 슬롯에 부착, 없으면 null)
  s._partsQuality.push(inv.crafted?{q:+inv.quality||1,lbl:inv.qualityLabel||''}:null);
  inv.qty--;if(inv.qty===0)G.inventory.splice(G.inventory.indexOf(inv),1);
  _syncShipCapacity(s,_stBef);
  const p=PARTS.find(x=>x.id===partId);
  notify(I18N.t('notify.partEquipped',{nm:(p?partDisplayNm(p):'')||p?.nm||I18N.t('ui.partFallback')}),'ok');
  // 워프 엔진(블링크/타키온/테슬라) 전 함선 장착 완료 알림
  const _isWarp=WARP_ENGINE_IDS.includes(partId);
  if(_isWarp&&hasBlinkOnAll()){
    notify(I18N.t('notify.warpAllShipsDone'),'gold');
    baekgu(I18N.t('baekgu.warpAllInstalled'));
  } else if(_isWarp){
    const lacking=G.fleet.filter(sh=>!(sh.parts||[]).some(pid=>WARP_ENGINE_IDS.includes(pid))).length;
    baekgu(I18N.t('baekgu.warpEquipProgress',{nm:(p?partDisplayNm(p):'')||p?.nm||'Warp Engine',done:G.fleet.length-lacking,total:G.fleet.length}));
  }
  rerenderShipOrGarage();saveGame(true);
}
function detachPart(shipIdx){
  const s=G.fleet[shipIdx];if(!s||!s.parts||s.parts.length===0){notify(I18N.t('notify.noEquippedParts'),'err');return;}
  const pid=s.parts.pop();const p=partById(pid);
  {const _stA=getShipStats(s);s.hp=Math.min(s.hp||0,_stA.HP);s.sh=Math.min(s.sh||0,_stA.maxSH);}
  addToInventory(pid);notify(I18N.t('notify.partUnequipToInv',{nm:(p?partDisplayNm(p):'')||p?.nm||I18N.t('ui.partFallback')}),'ok');rerenderShipOrGarage();saveGame(true);
}
// 특정 인덱스의 파츠 탈착 (파츠 버튼 클릭 시 호출)
function detachPartAt(shipIdx,partIdx){
  const s=G.fleet[shipIdx];if(!s||!s.parts||s.parts.length===0){notify(I18N.t('notify.noEquippedParts'),'err');return;}
  if(partIdx<0||partIdx>=s.parts.length)return;
  const _stBef2=getShipStats(s);
  const pid=s.parts.splice(partIdx,1)[0];
  // 제작 등급 데이터도 동일 인덱스에서 제거, 인벤토리에 별도 crafted 엔트리로 복원
  let _qData=null;
  if(s._partsQuality&&s._partsQuality.length>partIdx){_qData=s._partsQuality.splice(partIdx,1)[0];}
  const p=partById(pid);
  {const _stA=getShipStats(s);s.hp=Math.min(s.hp||0,_stA.HP);s.sh=Math.min(s.sh||0,_stA.maxSH);}
  if(_qData&&_qData.lbl){
    if(!G.inventory)G.inventory=[];
    G.inventory.push({id:pid,qty:1,quality:_qData.q,qualityLabel:_qData.lbl,crafted:true});
  } else {
    addToInventory(pid);
  }
  notify(I18N.t('notify.partUnequipDone',{nm:(p?partDisplayNm(p):'')||p?.nm||I18N.t('ui.partFallback')}),'ok');
  rerenderShipOrGarage();saveGame(true);
}


// ─── 전역 노출 (자동 생성) ─────────────────────────────────────
try{window.renderShipSkinTab=renderShipSkinTab;}catch(e){}
try{window.applyShipSkin=applyShipSkin;}catch(e){}
try{window.removeShipSkin=removeShipSkin;}catch(e){}
try{window._enhanceCost=_enhanceCost;}catch(e){}
try{window._enhanceSuccessRate=_enhanceSuccessRate;}catch(e){}
try{window._enhanceFailRegress=_enhanceFailRegress;}catch(e){}
try{window._enhanceMatsFor=_enhanceMatsFor;}catch(e){}
try{window.renderShipEnhanceTab=renderShipEnhanceTab;}catch(e){}
try{window.doShipEnhance=doShipEnhance;}catch(e){}
try{window.FLEET_FORMATION_SLOTS=FLEET_FORMATION_SLOTS;}catch(e){}
try{window._getFormation=_getFormation;}catch(e){}
try{window._slotToColRow=_slotToColRow;}catch(e){}
try{window.getFormationShipForSlot=getFormationShipForSlot;}catch(e){}
try{window.assignFormationSlot=assignFormationSlot;}catch(e){}
try{window.clearFormationSlot=clearFormationSlot;}catch(e){}
try{window.clearAllFormation=clearAllFormation;}catch(e){}
try{window.autoArrangeFormation=autoArrangeFormation;}catch(e){}
try{window.onFormationSlotClick=onFormationSlotClick;}catch(e){}
try{window.onFormationShipClick=onFormationShipClick;}catch(e){}
try{window.renderFleetFormationTab=renderFleetFormationTab;}catch(e){}
try{window.repairAllShips=repairAllShips;}catch(e){}
try{window.repairShip=repairShip;}catch(e){}
try{window.repairShipModal=repairShipModal;}catch(e){}
try{window.repairShipFullModal=repairShipFullModal;}catch(e){}
try{window.autoAssignCrewFlagship=autoAssignCrewFlagship;}catch(e){}
try{window.autoAssignCrewEven=autoAssignCrewEven;}catch(e){}
try{window.attachPartSilent=attachPartSilent;}catch(e){}
try{window.pickPartModal=pickPartModal;}catch(e){}
try{window.pickCrewModal=pickCrewModal;}catch(e){}
try{window.unassignCrewModal=unassignCrewModal;}catch(e){}
try{window.unassignAllCrew=unassignAllCrew;}catch(e){}
try{window.unassignAllParts=unassignAllParts;}catch(e){}
try{window.repairShipFull=repairShipFull;}catch(e){}
try{window.assignCrew=assignCrew;}catch(e){}
try{window.assignCrewById=assignCrewById;}catch(e){}
try{window.unassignCrew=unassignCrew;}catch(e){}
try{window.pickPartForSlot=pickPartForSlot;}catch(e){}
try{window.pickCrewForSlot=pickCrewForSlot;}catch(e){}
try{window.getShipSellPrice=getShipSellPrice;}catch(e){}
try{window.confirmSellShip=confirmSellShip;}catch(e){}
try{window.sellShip=sellShip;}catch(e){}
try{window.renameShip=renameShip;}catch(e){}
try{window.confirmRenameShip=confirmRenameShip;}catch(e){}
try{window.setFlagship=setFlagship;}catch(e){}
try{window.getCargoUpgradePrice=getCargoUpgradePrice;}catch(e){}
try{window.upgradeCargoSlotFromModal=upgradeCargoSlotFromModal;}catch(e){}
try{window.upgradeCargoSlot=upgradeCargoSlot;}catch(e){}
try{window.buyCargoExtPart=buyCargoExtPart;}catch(e){}
try{window.CARGO_EXT_MAX=CARGO_EXT_MAX;}catch(e){}
try{window._shipCargoExt=_shipCargoExt;}catch(e){}
try{window.equipCargoExt=equipCargoExt;}catch(e){}
try{window.unequipCargoExt=unequipCargoExt;}catch(e){}
try{window.pickCargoExtForSlot=pickCargoExtForSlot;}catch(e){}
try{window.buyShip=buyShip;}catch(e){}
try{window.buyPart=buyPart;}catch(e){}
try{window.attachPart=attachPart;}catch(e){}
try{window.detachPart=detachPart;}catch(e){}
try{window.detachPartAt=detachPartAt;}catch(e){}
console.log('[ship-skin-enhance] Loaded — 63 decls exposed');
})();
