// ═══════════════════════════════════════════════════════════════════
// DESTINATION EARTH — 정비소 함선 탭 렌더 모듈 (Phase B1)
//   · game.js 에서 분할 (2026-06-10, 사용자 요청: 긴 파일 분할)
//   · renderShipTab — 정비소 메인 탭 (편대·임시창·파츠·크루 4개 서브탭 포함)
//
// 공개 함수 (window.* 노출):
//   · renderShipTab(body) — hubTab("ship") 진입 시 호출되는 렌더 함수
//     - rerenderTab(renderShipTab) 패턴으로 game.js 내부에서도 호출됨
//
// 의존 글로벌 (window.*):
//   · G, PARTS, SHIP_CATALOG, PLANET_DEF, HEROES, COMMODITIES, CREW_CATALOG
//   · I18N, _GAME_VER
//   · shipDisplayNm, shipImgSrc, imgOrEmoji, partImgSrc, partDisplayNm
//   · crewImgSrc, crewDisplayNm, commDisplayNm, planetImgSrc
//   · notify, baekgu, saveGame, rerenderTab, hubTab, openModal, closeModal
//   · showShipDetailModal, getShipPartsGridRows, attachPartSilent
//   · autoEquipPartsFlagship, autoEquipPartsEven (HTML onclick)
//   · _shipTab (현재 서브탭 상태, game.js 전역 변수 — window 노출 필요)
// ═══════════════════════════════════════════════════════════════════
(function(){
if(typeof window==='undefined')return;
if(window._RENDER_SHIP_TAB_LOADED)return;
window._RENDER_SHIP_TAB_LOADED=true;

// ── 정비소 좌측 세로 탭 사이드바 (5개 탭 공통, 사용자 요청 2026-06-16) ──
//   상단 가로 탭(subNav) → 좌측 세로열로 이동. window 노출(타 IIFE 모듈에서 호출).
function _garageSideNav(activeKey){
  const tabs=[{k:'parts',lb:I18N.t('garage.shipMaint')},{k:'cargo',lb:I18N.t('garage.cargo')},{k:'formation',lb:I18N.t('garage.formation')},{k:'skin',lb:I18N.t('garage.shipSkin')},{k:'enhance',lb:I18N.t('garage.shipEnhance')}];
  return '<div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0;width:108px">'+
    tabs.map(function(t){var act=(t.k===activeKey);
      return '<button onclick="_garageSubTab=\''+t.k+'\';rerenderTab(renderGarageTab)" style="padding:9px 10px;border:1px solid '+(act?'var(--cyan)':'var(--bdr)')+';background:'+(act?'rgba(0,243,255,.12)':'transparent')+';color:'+(act?'var(--cyan)':'var(--dim)')+';border-radius:6px;cursor:pointer;font-size:12px;font-weight:'+(act?'bold':'normal')+';text-align:left;white-space:nowrap;line-height:1.2">'+t.lb+'</button>';
    }).join('')+
  '</div>';
}
// 좌측 사이드바 + (선택)액션 세로열 + 본문 을 flex row 로 감싸는 래퍼.
function _garageWrap(activeKey, actionColHtml, contentHtml){
  return '<div style="display:flex;gap:10px;align-items:flex-start">'+
    _garageSideNav(activeKey)+
    (actionColHtml?('<div style="display:flex;flex-direction:column;gap:5px;flex-shrink:0;width:132px">'+actionColHtml+'</div>'):'')+
    '<div style="flex:1;min-width:0">'+contentHtml+'</div>'+
  '</div>';
}
try{if(typeof window!=='undefined'){window._garageSideNav=_garageSideNav;window._garageWrap=_garageWrap;}}catch(e){}

function renderShipTab(body){
  if(!body)return;
  const pd=PLANET_DEF.find(p=>p.id===G.currentPlanet);
  // 치크스(적대) 행성도 경매로 합병 + 총독권 최대 투자(commerce 10) 시 거래소 개방 (사용자 요청)
  const _maxInvestHere=!!(pd&&G.planets[pd.id]&&G.planets[pd.id].owned&&(G.planets[pd.id].commerce||0)>=10);
  const isHostile=!!(pd?.hostile)&&!_maxInvestHere;
  const isVoidPlanet=pd?.void===true;
  const iSunsin=G.heroes.includes('H01');
  const plvForShip=calcPlayerLevel();
  const heroLock=false;
  generateShopStock(G.currentPlanet);
  const stock=G.shopStock[G.currentPlanet]||{};
  // 거래소를 연 행성의 입고 함선은 "발견" 처리 (실제로 본 함선 → 도감 노출)
  try{Object.keys(stock).forEach(k=>{if(k.indexOf('ship_')===0&&typeof _markShipDiscovered==='function'){const _id=k.slice(5);if(_id!=='URSA'&&_id!=='BLACKFALCON')_markShipDiscovered({catalogId:_id,id:_id});}});}catch(e){}
  const availShips=SHIP_CATALOG.filter(s=>stock['ship_'+s.id]>0&&s.tier!=='전설기함'&&s.tier!=='신화');
  const availParts=PARTS.filter(p=>stock['part_'+p.id]>0);

  // 서브탭 버튼 HTML
  function subBtn(key,label,active){
    return `<button onclick="switchShipTab('${key}')" style="padding:7px 18px;border:1px solid ${active?'var(--cyan)':'var(--bdr)'};background:${active?'rgba(0,243,255,.1)':'transparent'};color:${active?'var(--cyan)':'var(--dim)'};cursor:pointer;border-radius:6px;font-family:Courier New,monospace;font-size:14px;transition:all .2s">${label}</button>`;
  }

  const subNav=G._garageMode?'':`<div style="display:flex;gap:8px;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--bdr)">
    ${subBtn('buy',I18N.t('ship.buyTab'),_shipTab==='buy')}
    ${subBtn('parts',I18N.t('ship.partsTab'),_shipTab==='parts')}
  </div>`;

  // ── 후보 함선(임시창) 섹션 — fleet/buy 양 분기에서 공유 ──
  // 사용자 요청: 거래소에서도 후보 함선 매각 가능
  let _reserveSectionHtml='';
  if((G.reserveFleet||[]).length>0){
    const _reserveCardsAll=G.reserveFleet.map((rs,ri)=>{
      const fc=rs.tier==='신화'?'#cc66ff':rs.tier==='전설기함'?'#d4af37':rs.tier==='대형'?'#d4af37':rs.tier==='중형'?'#00f3ff':'#88ccff';
      const tierIc={신화:'✦',전설기함:'⚑',대형:'🌟',중형:'🚀',소형:'🛸'}[rs.tier]||'🛸';
      const imgS=shipImgSrc(rs);
      const _isGarage=G._garageMode;
      return `<div style="background:var(--card);border:1px dashed ${fc};border-radius:8px;padding:10px;display:flex;gap:12px;align-items:center;margin-bottom:8px">
        <div style="width:80px;height:80px;flex-shrink:0;background:rgba(0,0,0,.4);border-radius:6px;display:flex;align-items:center;justify-content:center;overflow:hidden">${imgOrEmoji(imgS,tierIc,76,76,'border-radius:5px;object-fit:contain',shipLoreKey(rs))}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:14px;font-weight:bold;color:${fc}">${tierIc} ${shipDisplayNm(rs)} <span style="font-size:11px;color:var(--dim);font-weight:normal">[${I18N.tier(rs.tier)}]</span></div>
          <div style="font-size:11px;color:var(--dim);margin-top:2px">HP ${(rs.maxHP||0).toLocaleString()} · SH ${(rs.maxSH||0).toLocaleString()} · ATT ${rs.ATT||rs.atk||0}</div>
          ${rs.qualityLabel?`<div style="font-size:11px;color:${fc};margin-top:2px">${rs.qualityLabel} (×${(rs.quality||1).toFixed(2)})</div>`:''}
        </div>
        <div style="display:flex;flex-direction:column;gap:4px">
          ${_isGarage?`${G.fleet.length<16?`<button class="btn btn-sm" style="font-size:10px;padding:3px 8px;border-color:var(--green);color:var(--green);background:rgba(46,204,113,.12);font-weight:bold" onclick="promoteReserveShip(${ri})" title="${I18N.t('ui.promoteTitle')}">${I18N.t('ui.promoteToActive',{n:G.fleet.length})}</button>`:`<span style="font-size:10px;color:var(--dim);text-align:center;padding:2px">${I18N.t('ship.reserveFull')}</span>`}
          <select id="resvSwap_${ri}" style="background:rgba(0,0,0,.5);color:var(--txt);border:1px solid var(--bdr);border-radius:4px;padding:3px 6px;font-size:11px;font-family:inherit">
            <option value="">${I18N.t('ui.selectShipToSwap')}</option>
            ${G.fleet.map((af,ai)=>`<option value="${ai}">${ai===0?'⭐ ':''}[${I18N.tier(af.tier)}] ${shipDisplayNm(af)}</option>`).join('')}
          </select>
          <button class="btn btn-sm btn-gold" style="font-size:10px;padding:3px 8px" onclick="swapReserveShip(${ri})">${I18N.t('ship.swapWithActive')}</button>`:''}
          <button class="btn btn-sm btn-gold" style="font-size:10px;padding:3px 8px" onclick="discardReserveShip(${ri})" title="${I18N.t('ship.sellTitle')}">${I18N.t('ship.sellLabel')}</button>
        </div>
      </div>`;
    }).join('');
    _reserveSectionHtml=`<div style="margin-top:14px;padding-top:12px;border-top:2px dashed rgba(255,255,255,.15)">
      <div style="font-size:13px;font-weight:bold;color:var(--cyan);margin-bottom:4px">${I18N.t('ship.reserveTitle',{n:G.reserveFleet.length})}</div>
      <div style="font-size:10px;color:var(--dim);margin-bottom:8px">${G._garageMode?I18N.t('ship.reserveDescGarage'):I18N.t('ship.reserveDescShop')}</div>
      ${_reserveCardsAll}
    </div>`;
  }
  // ── 내 편대 ──────────────────────────────────────────────────────
  let content='';
  let autoArrangeCol='';   // #1: 정비소 좌측 액션열용 자동배치 4버튼 (garage 모드에서만 채움)
  if(_shipTab==='fleet'){
    // 정렬
    function fleetSortBtn(key,label){
      const act=_fleetSort===key;
      return `<button onclick="_fleetSort='${key}';rerenderShipOrGarage()" style="padding:4px 12px;border:1px solid ${act?'var(--cyan)':'var(--bdr)'};background:${act?'rgba(0,243,255,.12)':'transparent'};color:${act?'var(--cyan)':'var(--dim)'};cursor:pointer;border-radius:4px;font-size:12px;font-family:Courier New,monospace">${label}</button>`;
    }
    const sortedFleet=[...G.fleet.map((s,i)=>({...s,_origIdx:i}))];
    // #2: 정렬 버튼 전체 삭제 — 내구도(HP) 기준 고정 정렬 (사용자 요청 2026-06-16)
    sortedFleet.sort((a,b)=>{const ba=getPartBonus(a),bb=getPartBonus(b);return(b.maxHP+bb.hp)-(a.maxHP+ba.hp);});
    // 사용자 요청: 정렬 결과와 관계없이 기함(_origIdx===0)은 항상 최상단 고정
    {
      const _flagIdx=sortedFleet.findIndex(s=>s._origIdx===0);
      if(_flagIdx>0){
        const _flag=sortedFleet.splice(_flagIdx,1)[0];
        sortedFleet.unshift(_flag);
      }
    }

    // 전체 수리 비용 계산
    const totalRepairCost=G.fleet.reduce((sum,s)=>sum+repairCost(s)+shRepairCost(s),0);
    // 수리 가능 여부: 실제 수리 비용이 0보다 클 때만 (파츠 추가로 max만 늘어난 경우는 제외)
    const anyDamaged=G.fleet.some(s=>(repairCost(s)+shRepairCost(s))>0);
    // 정비소 서브탭 버튼 (정비소 모드에서만)
    // 정비 모드 서브탭: 함선 정비(파츠+크루+화물 통합) + 편대 편성 두 가지만
    // 정비 서브탭: parts(파츠+크루) / cargo(화물칸 전용) / formation(편대)
    const _isMaintain=_garageSubTab!=='formation'&&_garageSubTab!=='cargo';
    const garageSubNav=G._garageMode?`<div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap">
      ${[{k:'parts',lb:I18N.t('garage.shipMaint')},{k:'cargo',lb:I18N.t('garage.cargo')},{k:'formation',lb:I18N.t('garage.formation')},{k:'skin',lb:I18N.t('garage.shipSkin')},{k:'enhance',lb:I18N.t('garage.shipEnhance')}].map(function(t){const act=(t.k===_garageSubTab||(t.k==='parts'&&_isMaintain));return'<button onclick="_garageSubTab=\''+t.k+'\';rerenderTab(renderGarageTab)" style="padding:5px 14px;border:1px solid '+(act?'var(--cyan)':'var(--bdr)')+';background:'+(act?'rgba(0,243,255,.12)':'transparent')+';color:'+(act?'var(--cyan)':'var(--dim)')+';border-radius:6px;cursor:pointer;font-size:12px;font-weight:'+(act?'bold':'normal')+'">'+t.lb+'</button>';}).join('')}
    </div>`:'';
    const sortBar=`<!-- 좌(📊 종합 능력치) · 중(🔧 전체 수리) · 우(나포허용/매각) 3열 -->
    <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;align-items:stretch">
    ${(()=>{
      const tot={hp:0,maxHp:0,sh:0,maxSh:0,att:0,int:0,tec:0,def:0};
      G.fleet.forEach(sh=>{
        const st=getShipStats(sh);
        tot.hp+=sh.hp||0;tot.maxHp+=st.HP||0;
        tot.sh+=sh.sh||0;tot.maxSh+=st.maxSH||0;
        tot.att+=st.ATT||0;tot.int+=st.INT||0;tot.tec+=st.TEC||0;tot.def+=st.DEF||0;
      });
      const hpPct=tot.maxHp>0?Math.round(tot.hp/tot.maxHp*100):0;
      const shPct=tot.maxSh>0?Math.round(tot.sh/tot.maxSh*100):0;
      // 셀 1줄 고정 (사용자 요청): grid 6열 + 작은 폰트 + 최소 너비 제거 + 텍스트 줄바꿈 차단
      const cell=(lbl,val,col)=>`<div style="display:flex;flex-direction:column;align-items:center;gap:1px;padding:4px 4px;background:rgba(0,0,0,.3);border-radius:5px;min-width:0;overflow:hidden"><span style="font-size:9px;color:var(--dim);font-weight:bold;white-space:nowrap">${lbl}</span><span style="font-size:12px;font-weight:bold;color:${col};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:100%;text-align:center" title="${val}">${val}</span></div>`;
      return `<div style="flex:2.4;min-width:360px;background:rgba(212,175,55,.06);border:1px solid rgba(212,175,55,.3);border-radius:8px;padding:10px 12px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">
          <span style="font-size:14px;font-weight:bold;color:var(--gold)">${I18N.t('ui.fleetTotalStats')}</span>
          <span style="font-size:11px;color:var(--cyan);margin-left:auto">${I18N.t('ui.fleetCountAlt',{n:G.fleet.length})}</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:4px;align-items:stretch">
          ${cell('❤️ HP',`${tot.hp.toLocaleString()}/${tot.maxHp.toLocaleString()}`,hpPct>60?'var(--green)':hpPct>30?'#f39c12':'var(--red)')}
          ${cell('🛡️ SH',`${tot.sh.toLocaleString()}/${tot.maxSh.toLocaleString()}`,shPct>60?'var(--blue)':shPct>30?'#88aaff':'var(--dim)')}
          ${cell('⚔️ ATT',tot.att.toLocaleString(),'var(--red)')}
          ${cell('🛡 SHD',tot.int.toLocaleString(),'var(--blue)')}
          ${cell('⚙️ ENG',tot.tec.toLocaleString(),'var(--cyan)')}
          ${cell('🔰 DEF',tot.def.toLocaleString(),'var(--gold)')}
        </div>
      </div>`;
    })()}
    <div style="flex:0.5;min-width:120px;background:rgba(0,255,100,.05);border:1px solid rgba(46,204,113,.25);border-radius:8px;padding:6px 8px;display:flex;flex-direction:column;justify-content:center;gap:3px">
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
        <span style="font-size:11px;font-weight:bold;color:var(--green)">${I18N.t('ui.fullRepairHeader')}</span>
        <span style="font-size:10px;color:var(--dim);margin-left:auto">${anyDamaged?'<b style="color:var(--gold)">₡'+totalRepairCost.toLocaleString()+'</b>':'<span style="color:var(--green)">'+I18N.t('ship.optimal')+'</span>'}</span>
      </div>
      ${G.heroes&&G.heroes.includes('H02')?`<div style="font-size:9px;color:#9ee7ff;text-align:center;line-height:1.1">${I18N.t('ship.equipNeedsParts')}</div>`:''}
      ${anyDamaged?'<button class="btn btn-gold" style="font-size:10px;padding:3px 6px;width:100%;min-height:0;letter-spacing:0" onclick="repairAllShips()" '+( G.credits>=totalRepairCost?'':'disabled')+`>${I18N.t('ui.completeRepair')}</button>`:`<div style="font-size:10px;color:var(--green);text-align:center">${I18N.t('ui.repairUnneeded')}</div>`}
    </div>
    ${(()=>{
      // 사용자 요청: 단일 토글 버튼 — 클릭 시 나포허용 ↔ 나포매각 전환
      const _dc=!!G.declineCapture;
      const _lbl=_dc?I18N.t('ui.captureSell'):I18N.t('ui.captureAllow');
      const _next=_dc?I18N.t('ui.captureAllow'):I18N.t('ui.captureSell');
      const _col=_dc?'var(--gold)':'var(--cyan)';
      const _bg=_dc?'rgba(212,175,55,.18)':'rgba(0,243,255,.18)';
      const _bd=_dc?'rgba(212,175,55,.55)':'rgba(0,243,255,.45)';
      return `<div style="flex:0.7;min-width:140px;background:rgba(0,0,0,.25);border:1px solid var(--bdr);border-radius:8px;padding:8px 10px;display:flex;flex-direction:column;justify-content:center;gap:6px">
        <div style="font-size:13px;font-weight:bold;color:${_col}">${I18N.t('ui.capturePolicyTitle')}</div>
        <button class="btn btn-sm" onclick="toggleDeclineCapture()" style="font-size:12px;padding:6px 10px;border:1.5px solid ${_bd};color:${_col};background:${_bg};width:100%" title="${I18N.t('ui.clickToToggle',{next:_next})}">${_lbl}</button>
      </div>`;
    })()}
    </div>  <!-- /3열 컨테이너 -->`;
    // #1: 자동배치 4버튼 묶음 → 좌측 사이드바 오른쪽 세로 액션열. 2×2 그리드로 세로폭 50% 압축.
    autoArrangeCol=`<div style="font-size:10px;font-weight:bold;color:var(--cyan);text-align:center;line-height:1.2">${I18N.t('ui.autoArrangeHeader')}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
        <button class="btn btn-sm" style="border-color:var(--gold);color:var(--gold);font-size:9px;padding:4px 2px;white-space:normal;line-height:1.15" onclick="autoEquipPartsFlagship()">${I18N.t('ui.partsBtnLabel')}<br>${I18N.t('ui.flagshipCentered')}</button>
        <button class="btn btn-sm" style="border-color:var(--green);color:var(--green);font-size:9px;padding:4px 2px;white-space:normal;line-height:1.15" onclick="autoEquipPartsEven()">${I18N.t('ui.partsBtnLabel')}<br>${I18N.t('ui.evenDistribution')}</button>
        <button class="btn btn-sm" style="border-color:var(--gold);color:var(--gold);font-size:9px;padding:4px 2px;white-space:normal;line-height:1.15" onclick="autoAssignCrewFlagship()">${I18N.t('ui.crewBtnLabel')}<br>${I18N.t('ui.flagshipCentered')}</button>
        <button class="btn btn-sm" style="border-color:var(--green);color:var(--green);font-size:9px;padding:4px 2px;white-space:normal;line-height:1.15" onclick="autoAssignCrewEven()">${I18N.t('ui.crewBtnLabel')}<br>${I18N.t('ui.evenDistribution')}</button>
      </div>`;

    const cats=[{k:'weapon',lb:'⚔️',col:'var(--red)',nm:I18N.t('cat.weapon')},{k:'shield',lb:'🛡️',col:'var(--blue)',nm:I18N.t('cat.shield')},{k:'armor',lb:'🛡',col:'var(--gold)',nm:I18N.t('cat.armor')},{k:'engine',lb:'⚡',col:'var(--cyan)',nm:I18N.t('cat.engine')}];

    content = sortBar + sortedFleet.map(s=>{
      const idx=s._origIdx; // 실제 fleet 인덱스 (버튼 onclick용)
      const _stP=getShipStats(s);const _eHpP=Math.max(1,_stP.HP||s.maxHP),_eSPp=Math.max(1,_stP.maxSH||s.maxSH);
      const hpP=clamp(Math.round(s.hp/_eHpP*100),0,100),shP=(_stP.maxSH||s.maxSH)>0?clamp(Math.round(s.sh/_eSPp*100),0,100):0;
      const rc=repairCost(s),sc=shRepairCost(s),bonus=getPartBonus(s),crewBonus=getCrewBonus(s);
      const hpC=hpP>60?'var(--green)':hpP>30?'#f39c12':'var(--red)';
      const totalATT=(s.ATT||0)+bonus.att+crewBonus.att,totalINT=(s.INT||0)+bonus.int2+crewBonus.int2,totalTEC=(s.TEC||0)+bonus.tec+crewBonus.tec;
      const tierCol=s.tier==='신화'?'var(--purple)':s.tier==='대형'?'var(--gold)':s.tier==='중형'?'var(--blue)':'var(--dim)';
      const isFlagship=idx===0;
      // 함선 이미지 (나포 함선은 shipImgSrc가 팩션 자동 감지)
      const imgSrc=shipImgSrc(s);
      const tierEmoji={소형:'🛸',중형:'🚀',대형:'🌟',신화:'✦'}[s.tier]||'🛸';

      // ─── RPG 그리드 계산 ───
      const maxCrew=getMaxCrew(s);
      // 크루 그리드: 모든 함선 2열로 고정 → 세로로 길게 (화면 폭 절약)
      // 함선실: 4열로 확장 (좌측 2열 추가) → 8~16칸 함선실 표시 가능
      const crewCols=4;
      const PART_COLS=getShipPartsGridCols(s.tier);
      const PART_ROWS=getShipPartsGridRows(s);
      const partsLayout=layoutPartsGrid(s.parts||[],PART_COLS,PART_ROWS);
      const CELL_SZ=51;

      // 크루 색상 헬퍼

      // ── 크루 그리드 (슬롯 기반: N/R=1칸 H=2칸 L/S=4칸) ─────────────────
      const _RC2={N:'#888',R:'var(--blue)',H:'var(--purple)',L:'var(--gold)',S:'#ff6ec7'};
      const _crewCol=function(c){return c&&c.isHero?'#ff6ec7':_RC2[c&&c.rarity]||'#888';};
      const SLOT_MAP2={N:1,R:1,H:2,L:4,S:4};
      const _allPG=[...G.crew,...(G.heroes||[]).map(function(h){return Object.assign({},HEROES[h],{id:h,isHero:true,rarity:'S'});})];

      // physSlots[i] = cid | 'skip' | null
      const physSlots=Array(maxCrew).fill(null);
      const _skip=new Set();

      (s.crewIds||[]).forEach(function(cid2){
        const _c2=_allPG.find(function(x){return x.id===cid2;});
        const cost2=SLOT_MAP2[_c2&&_c2.rarity]||1;
        if(cost2===1){
          for(var i=0;i<maxCrew;i++){if(!_skip.has(i)&&physSlots[i]===null){physSlots[i]=cid2;break;}}
        }else if(cost2===2){
          // 같은 행 연속 2칸
          outer2:for(var r2=0;r2<2;r2++){
            for(var c2=0;c2<crewCols-1;c2++){
              var p2=r2*crewCols+c2;
              if(!_skip.has(p2)&&!_skip.has(p2+1)&&physSlots[p2]===null&&physSlots[p2+1]===null){
                physSlots[p2]=cid2;_skip.add(p2+1);physSlots[p2+1]='skip';break outer2;
              }
            }
          }
        }else{
          // 2×2 블록 (4칸) — col 0 or (crewCols-2) 에서 시작
          outer4:for(var c4=0;c4<=crewCols-2;c4+=2){
            var ps=[c4,c4+1,c4+crewCols,c4+crewCols+1];
            if(ps.every(function(p){return!_skip.has(p)&&physSlots[p]===null;})){
              physSlots[c4]=cid2;
              ps.slice(1).forEach(function(p){_skip.add(p);physSlots[p]='skip';});
              break outer4;
            }
          }
        }
      });

      const crewGrid=Array.from({length:maxCrew},function(_sl,ci){
        if(physSlots[ci]==='skip')return '';
        const cid=physSlots[ci];
        if(cid){
          const c=_allPG.find(function(x){return x.id===cid;});
          if(!c)return '<div style="width:'+CELL_SZ+'px;height:'+CELL_SZ+'px;border:1px dashed rgba(255,0,0,.4);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--red)">?</div>';
          const cost=SLOT_MAP2[c.rarity]||1;
          const _col=_crewCol(c);
          const _imgS=crewImgSrc(c);
          const _nm=c.nm.length>4?c.nm.slice(0,3)+'…':c.nm;
          const _cb2=CREW_BONUS_TABLE[c.cl]||{att:3,int2:3,tec:3};
          const _m2=RARITY_MULT[c.rarity]||1;
          const _bn=[_cb2.att?'ATT+'+Math.round(_cb2.att*_m2):'',_cb2.int2?'SHD+'+Math.round(_cb2.int2*_m2):'',_cb2.tec?'ENG+'+Math.round(_cb2.tec*_m2):'',(_cb2.def||0)>0?'DEF+'+Math.round((_cb2.def||0)*_m2):''].filter(Boolean).join(' ');
          const _rarNm=I18N.rarity(c.rarity)||'';
          const _tip=c.nm+' ['+_rarNm+' '+(c.cl||'')+']\n'+_bn+(c.isHero?' ⭐':'')+'\n'+I18N.t('ship.slotOccupy',{n:cost})+'\n'+I18N.t('ship.clickDisembark');
          var _csz,_hSz,_igsz,_cspan;
          if(cost===4){_csz=CELL_SZ*2+4;_hSz=_csz;_igsz=72;_cspan=';grid-column:span 2;grid-row:span 2';}
          else if(cost===2){_csz=CELL_SZ*2+4;_hSz=CELL_SZ;_igsz=60;_cspan=';grid-column:span 2';}
          else{_csz=CELL_SZ;_hSz=CELL_SZ;_igsz=34;_cspan='';}
          return '<div style="display:flex;flex-direction:column;align-items:center;gap:1px;flex-shrink:0'+_cspan+'">'
            +'<button onclick="unassignCrewById(\''+cid+'\')" title="'+_tip+'" style="background:rgba(0,0,0,.5);border:2px solid '+_col+';border-radius:6px;padding:1px;cursor:pointer;position:relative;width:'+_csz+'px;height:'+_hSz+'px;display:flex;align-items:center;justify-content:center" onmouseover="this.style.borderWidth=\'3px\'" onmouseout="this.style.borderWidth=\'2px\'">'
            +imgOrEmoji(_imgS,c.ic||'🧑',_igsz,_igsz,'border-radius:50%;pointer-events:none;border:1px solid '+_col)
            +'<span style="position:absolute;top:-4px;right:-4px;background:var(--red);color:white;font-size:8px;border-radius:50%;width:12px;height:12px;display:flex;align-items:center;justify-content:center;pointer-events:none">✕</span>'
            +(c.isHero?'<span style="position:absolute;bottom:-4px;left:-4px;font-size:11px;pointer-events:none">⭐</span>':'')
            +'<span style="position:absolute;top:-4px;left:-4px;background:'+_col+';color:#000;font-size:8px;border-radius:3px;padding:0 2px;pointer-events:none">'+I18N.t('ship.slotCells',{n:cost})+'</span>'
            +'</button>'
            +'<span style="font-size:8px;color:'+_col+';text-align:center;max-width:'+_csz+'px;line-height:1;overflow:hidden;white-space:nowrap">'+_nm+'</span>'
            +'</div>';
        }else{
          return '<div style="display:flex;flex-direction:column;align-items:center;gap:1px;flex-shrink:0">'
            +'<button onclick="pickCrewForSlot('+idx+')" title="'+I18N.t('ui.crewAssignBtn')+'" style="background:rgba(0,243,255,.03);border:1px dashed rgba(0,243,255,.2);border-radius:6px;cursor:pointer;width:'+CELL_SZ+'px;height:'+CELL_SZ+'px;display:flex;align-items:center;justify-content:center;color:rgba(0,243,255,.3);font-size:24px;line-height:1" onmouseover="this.style.background=\'rgba(0,243,255,.08)\'" onmouseout="this.style.background=\'rgba(0,243,255,.03)\'">+</button>'
            +'<span style="font-size:8px;color:rgba(255,255,255,.18);text-align:center;max-width:51px;line-height:1">'+I18N.t('ui.emptySlot')+'</span>'
            +'</div>';
        }
      }).join('');

            // 파츠 그리드 셀 HTML 생성
      const _pCells=partsLayout.map(function(cell){
        if(cell.pid!==null){
          const p2=cell.p;
          const _cc2={weapon:'var(--red)',shield:'var(--blue)',armor:'var(--gold)',engine:'var(--cyan)'}[p2.cat]||'var(--dim)';
          const _ci2={weapon:'⚔️',shield:'🛡️',armor:'🛡',engine:'⚡'}[p2.cat]||'⚙️';
          const _rb2=p2.rarity==='mythic'?'#ff88ff':p2.rarity==='set'?'var(--cyan)':_cc2;
          const _is2x2=(cell.spanC>=2&&cell.spanR>=2);
          const _is2x1=(cell.spanC>=2&&cell.spanR<2);
          // 1×1 셀(51px)에 더 큰 이미지(40px) — 기존 22px는 너무 작아서 식별 어려움
          const _isz=_is2x2?94:_is2x1?72:42;
          const _st2=p2.cat==='weapon'?'ATT+'+p2.ATT+(p2.wtype?' ['+p2.wtype+']':''):p2.cat==='shield'?'SHD+'+p2.INT+' SH+'+p2.maxSH:p2.cat==='armor'?'HP+'+p2.HP+(p2.DEF?' DEF+'+p2.DEF:''):'ENG+'+p2.TEC;
          const _p2Nm=partDisplayNm(p2)||p2.nm;
          const _tp2=_p2Nm+' [T'+p2.tier+(p2.rarity==='mythic'?I18N.t('ship.partMythicTag'):p2.rarity==='set'?I18N.t('ship.partSetTag'):'')+']\n'+p2.desc+'\n'+_st2+(cell.forced?I18N.t('ship.partForced'):'')+'\n'+I18N.t('ship.clickDetach');
          // 파츠 이름 — 셀 내부 상단에 absolute 로 띄움 (사용자 요청: 이미지 위로)
          const _nmW=cell.spanC*CELL_SZ+3*(cell.spanC-1)-6;
          const _nmLabel=(_is2x2||_is2x1)?('<span style="position:absolute;left:2px;right:2px;top:2px;background:rgba(0,0,0,.75);font-size:9px;color:'+_cc2+';pointer-events:none;text-align:center;line-height:1.1;padding:1px 2px;border-radius:3px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;max-width:'+_nmW+'px;z-index:2">'+_p2Nm.slice(0,_is2x2?11:8)+'</span>'):'';
          return '<button onclick="detachPartAt('+idx+','+cell.pi+')" title="'+_tp2+'" style="grid-column:'+(cell.c+1)+'/span '+cell.spanC+';grid-row:'+(cell.r+1)+'/span '+cell.spanR+';background:rgba(0,0,0,.65);border:1px solid '+_rb2+';border-radius:5px;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding:2px;position:relative;overflow:hidden" onmouseover="this.style.borderWidth=\'2px\'" onmouseout="this.style.borderWidth=\'1px\'">'
            +imgOrEmoji(partImgSrc(p2.id),_ci2,_isz,_isz,'pointer-events:none;object-fit:contain;max-width:100%;max-height:100%')
            +_nmLabel
            +'<span style="position:absolute;top:-4px;right:-4px;background:var(--red);color:white;font-size:8px;border-radius:50%;width:11px;height:11px;display:flex;align-items:center;justify-content:center;pointer-events:none">✕</span>'
            +'</button>';
        }else{
          return '<button onclick="pickPartForSlot('+idx+`)" title="${I18N.t('title.partEquip')}" style="grid-column:`+(cell.c+1)+';grid-row:'+(cell.r+1)+';background:rgba(255,255,255,.02);border:1px dashed rgba(255,255,255,.1);border-radius:5px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.18);font-size:17px" onmouseover="this.style.background=\'rgba(255,255,255,.05)\'" onmouseout="this.style.background=\'rgba(255,255,255,.02)\'">+</button>';
        }
      }).join('');
      const partsGridHtml='<div style="display:grid;grid-template-columns:repeat('+PART_COLS+','+CELL_SZ+'px);grid-template-rows:repeat('+PART_ROWS+','+CELL_SZ+'px);gap:3px">'+_pCells+'</div>';


      return `<div style="background:var(--card);border:2px solid ${isFlagship?'var(--cyan)':'var(--bdr)'};border-radius:12px;margin-bottom:14px;overflow:visible">

        <!-- ── 헤더 ── -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px 8px;border-bottom:1px solid var(--bdr)">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:17px;font-weight:bold;color:${isFlagship?'var(--cyan)':'#ccd6f6'}">${(typeof shipDisplayNm==="function"?shipDisplayNm(s):s.nm)}</span>
            ${isFlagship?`<span style="font-size:11px;color:var(--cyan);border:1px solid var(--cyan);border-radius:3px;padding:1px 5px">${I18N.t('ship.flagshipChip')}</span>`:''}
            <span style="font-size:11px;color:${tierCol};border:1px solid ${tierCol};border-radius:3px;padding:1px 5px">${I18N.tier(s.tier)}</span>
          </div>
          <span style="font-size:13px;font-weight:bold;color:${hpC}">HP ${hpP}%${shP>0?' | '+I18N.t('ui.shieldShort')+' '+shP+'%':''}</span>
        </div>

        <!-- ── 본문: 정비소=2열(정보+서브탭) / 거래소=4열 ── -->
        ${G._garageMode?(()=>{
          // ── 정비소 모드: 좌=함선정보, 우=서브탭 내용 ──────────────────
          const _cargoData=(()=>{
            const slots=Math.min(s.cargoSlots||4,100);
            let cargoOffset=0;
            for(let fi=0;fi<G.fleet.length;fi++){if(G.fleet[fi].id===s.id)break;cargoOffset+=G.fleet[fi].cargoSlots||4;}
            const cargoFlat=[];
            G.cargo.forEach(function(c){const imgSrcC=commImgSrc(c.id);const _dnm=commDisplayNm(c);for(let q=0;q<(c.qty||1);q++){cargoFlat.push({nm:_dnm,ic:c.ic||'📦',img:imgSrcC,price:c.buyPrice,id:c.id});}});
            const myCargo=cargoFlat.slice(cargoOffset,cargoOffset+slots);
            // 화물 그리드: 슬롯 수에 따라 동적 행/셀 사이즈 조정 (100칸까지 화면에 들어가게)
            // 8칸 이하: 4행, 9~24칸: 6행, 25~48칸: 7행, 49~100칸: 8행
            const _cgRows=slots<=8?4:slots<=24?6:slots<=48?7:8;
            // 셀 사이즈도 크기에 따라 살짝 줄임 (전체 폭 ~360px 이내 유지)
            const _cgCell=slots<=24?40:slots<=48?36:32;
            let grid='<div style="display:grid;grid-template-rows:repeat('+_cgRows+','+_cgCell+'px);grid-auto-flow:column;grid-auto-columns:'+_cgCell+'px;gap:3px">';
            const _innerSz=_cgCell-4;
            for(let i=0;i<slots;i++){
              if(i<myCargo.length){const ci=myCargo[i];grid+='<div style="width:'+_cgCell+'px;height:'+_cgCell+'px;border-radius:4px;background:rgba(0,243,255,.15);border:1px solid rgba(0,243,255,.4);display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative" title="'+ci.nm+'\n'+I18N.t('shop.buyPriceTooltip',{cr:ci.price.toLocaleString()})+'"><img src="'+ci.img+'" style="width:'+_innerSz+'px;height:'+_innerSz+'px;object-fit:cover;border-radius:2px" onerror="this.style.display=\'none\';this.nextSibling.style.display=\'flex\'"><span style="font-size:'+(_cgCell>=36?16:13)+'px;display:none;width:100%;height:100%;align-items:center;justify-content:center">'+ci.ic+'</span></div>';}
              else{const isMax=(slots>=100);grid+='<div '+''+' style="width:'+_cgCell+'px;height:'+_cgCell+'px;border-radius:4px;background:rgba(255,255,255,.03);border:1px dashed rgba(255,255,255,.12);'+''+'" title="'+(isMax?I18N.t('ui.cargoMaxTooltip'):I18N.t('ui.emptyCargoCell'))+'"></div>';}
            }
            grid+='</div>';
            let btn;
            if(slots<100){const cp=getCargoUpgradePrice(s);btn='';}
            else{btn='<span style="font-size:11px;color:var(--cyan)">'+I18N.t('ship.cargoMaxFull')+'</span>';}
            return {grid,btn};
          })();
          // 통합 정비: 파츠장비 + 함선실 + 화물칸 3개 그리드를 좌→우로 한 줄에 표시
          const _maxExtraRows=getMaxExtraPartsRows(s.tier);
          const _curExtra=+s.partsRowsExtra||0;
          // 카탈로그 override 가 있으면 그 값을 base로 사용
          const _baseRows=getShipPartsGridRows(s)-_curExtra;
          const _maxTotalRows=_baseRows+_maxExtraRows;
          const _atMax=_curExtra>=_maxExtraRows;
          const _upgPrice=_atMax?0:getPartsUpgradePrice(s);
          const _upgBtn=_atMax
            ? `<span style="font-size:11px;color:var(--cyan)">${I18N.t('ui.maxRowsCount',{n:_maxTotalRows})}</span>`
            : `<button class="btn btn-sm" style="border-color:var(--cyan);color:var(--cyan);font-size:11px;padding:3px 8px" onclick="upgradePartsRow(${idx})" ${G.credits>=_upgPrice?'':'disabled'}>${I18N.t('ui.rowPlus1',{cost:_upgPrice.toLocaleString(),n:PART_ROWS,max:_maxTotalRows})}</button>`;
          // 컬럼 공통: flex 세로 배치 + spacer 로 액션 버튼을 하단에 고정 → 3컬럼 액션 버튼 높이 정렬
          // 파츠↔함선실 간격 20% 축소 (10→6, 양쪽 합산 20→12)
          // 파츠 그리드 실제 너비 계산 (CELL_SZ=51 + gap=3) → 신화(8열)/대형(6열) 함선이 함선실과 겹치지 않게 min-width 보장
          const _CELL_SZ=51, _CELL_GAP=3;
          const _partsGridW=PART_COLS*_CELL_SZ+(PART_COLS-1)*_CELL_GAP+12; // 12=padding 여유
          // ── 창고 확장 전용 슬롯 (파츠 그리드 오른쪽 세로 1열, 최대 CARGO_EXT_MAX 칸) ──
          //   기존 세이브가 7칸 보유 중이면 그대로 표시 (해제만 가능, 신규 장착은 6칸까지)
          const _cext=(s.cargoExtParts||[]);
          const _cextSlotN=Math.max(CARGO_EXT_MAX,_cext.length);
          let _cextCells='';
          for(let _ce=0;_ce<_cextSlotN;_ce++){
            const _cpid=_cext[_ce];
            if(_cpid){
              const _csc=SPECIAL_CARGO_PARTS.find(c=>c.id===_cpid);
              const _cb=_csc?_csc.cargoBonus:0;
              _cextCells+='<button onclick="unequipCargoExt('+idx+','+_ce+')" title="'+((_csc?(partDisplayNm(_csc)||_csc.nm):_cpid))+' '+I18N.t('ship.cargoExtTip',{n:_cb})+'" style="width:46px;height:46px;background:rgba(212,175,55,.12);border:1px solid var(--gold);border-radius:5px;cursor:pointer;display:flex;align-items:center;justify-content:center;position:relative;padding:2px">'
                +imgOrEmoji('img/parts/'+_cpid+'.png',(_csc&&_csc.ic)||'📦',38,38,'pointer-events:none;object-fit:contain;max-width:100%;max-height:100%','part_'+_cpid)
                +'<span style="position:absolute;bottom:-3px;right:-2px;font-size:8px;color:#fff;background:var(--gold);border-radius:3px;padding:0 2px;font-weight:bold">+'+_cb+'</span>'
                +'</button>';
            } else {
              _cextCells+='<button onclick="pickCargoExtForSlot('+idx+')" title="'+I18N.t('title.holdExpEquip')+'" style="width:46px;height:46px;background:rgba(212,175,55,.04);border:1px dashed rgba(212,175,55,.3);border-radius:5px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:rgba(212,175,55,.45);font-size:16px" onmouseover="this.style.background=\'rgba(212,175,55,.1)\'" onmouseout="this.style.background=\'rgba(212,175,55,.04)\'">+</button>';
            }
          }
          const _cargoExtCol=`<div style="flex-shrink:0;display:flex;flex-direction:column;gap:3px;padding-left:8px">
            <div style="font-size:9px;color:var(--gold);text-align:center;margin-bottom:1px;white-space:nowrap">${I18N.t('ui.cargoStorageHeader',{n:_cext.length,max:CARGO_EXT_MAX})}</div>
            ${_cextCells}
          </div>`;
          const _partsCol=`<div style="flex:1;min-width:${_partsGridW}px;padding-right:6px;border-right:1px solid rgba(255,255,255,.07);display:flex;flex-direction:column;overflow:hidden">
            <div style="font-size:10px;color:var(--dim);margin-bottom:6px;flex-shrink:0">⚙️ <b style="color:var(--gold)">${I18N.t('ui.partsEquip')}</b> ${(s.parts||[]).length}개 · ${PART_ROWS}×${PART_COLS} 슬롯 <span style="opacity:.45;font-size:9px">${I18N.t('ui.hintClickDetach')}</span></div>
            <div style="flex-shrink:0;overflow-x:auto;max-width:100%;display:flex;align-items:flex-start">${partsGridHtml}${_cargoExtCol}</div>
            <div style="flex:1;min-height:8px"></div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;flex-shrink:0">
              <button class="btn btn-sm" style="border-color:var(--gold);color:var(--gold);font-size:11px;padding:3px 8px" onclick="pickPartForSlot(${idx})">${I18N.t('ui.partsEquipPlus')}</button>
              ${(s.parts||[]).length>0?`<button class="btn btn-sm" style="border-color:#f88;color:#f88;font-size:11px;padding:3px 8px;white-space:nowrap" onclick="unassignAllParts(${idx})" title="${I18N.t('title.unequipAllToInv')}">${I18N.t('ui.unequipAllBtn')}</button>`:''}
              ${_upgBtn}
            </div>
          </div>`;
          // 함선실: 파츠 그리드와 동일한 크기/간격 (gap:3, 51px cell, 4열 × 4행 = 최대 16칸)
          // 관련 정보(크루수, 보너스)는 박스 헤더에 표시
          const _crewBonusInfo=(()=>{
            try{
              const cb=getCrewBonus(s);
              const parts=[];
              if(cb.att)parts.push('ATT+'+cb.att);
              if(cb.int2)parts.push('SHD+'+cb.int2);
              if(cb.tec)parts.push('ENG+'+cb.tec);
              return parts.length?`<span style="color:var(--green);font-size:10px">${parts.join(' · ')}</span>`:'';
            }catch(e){return'';}
          })();
          const _crewRows=Math.ceil(maxCrew/crewCols);
          const _crewExtCnt=Math.floor(((+s.crewMaxExtra)||0)/CREW_EXT_PER);
          const _crewExtCanBuy=_crewExtCnt<CREW_EXT_MAX_BUYS;
          const _crewExtPrice=_crewExtCanBuy?getCrewMaxUpgradePrice(s):0;
          const _crewExtBtn=_crewExtCanBuy
            ? `<button class="btn btn-sm" style="border-color:var(--gold);color:var(--gold);font-size:11px;padding:3px 8px;white-space:nowrap" onclick="upgradeCrewMax(${idx})" title="${I18N.t('ship.crewRoomExpand',{per:CREW_EXT_PER,left:CREW_EXT_MAX_BUYS-_crewExtCnt,short:G.credits<_crewExtPrice?I18N.t('ship.shortCreditsPrefix'):''})}" ${G.credits>=_crewExtPrice?'':'disabled'}>👥+${CREW_EXT_PER} ₡${_crewExtPrice.toLocaleString()}</button>`
            : `<span style="font-size:10px;color:var(--cyan);padding:3px 6px;border:1px solid rgba(0,243,255,.3);border-radius:4px">${I18N.t('hud.shipBayMax')}</span>`;
          const _crewCol=`<div style="flex:1;min-width:0;padding:0 3px 0 6px;display:flex;flex-direction:column">
            <div style="font-size:10px;color:var(--dim);margin-bottom:6px;flex-shrink:0;display:flex;align-items:center;gap:6px;flex-wrap:wrap">
              <span>👥 <b style="color:var(--green)">${I18N.t('ui.shipQuartersCrew')}</b> ${(s.crewIds||[]).length}/${maxCrew}명${(+s.crewMaxExtra)?` <span style="color:var(--gold);font-size:9px">${I18N.t('ui.crewExtSuffix',{n:+s.crewMaxExtra})}</span>`:''}</span>
              ${_crewBonusInfo}
              <span style="opacity:.45;font-size:9px">${I18N.t('ui.hintClickDisembark')}</span>
            </div>
            <div style="display:grid;grid-template-columns:repeat(${crewCols},51px);grid-template-rows:repeat(${_crewRows},51px);gap:3px;flex-shrink:0">${crewGrid}</div>
            <div style="flex:1;min-height:8px"></div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;flex-shrink:0;justify-content:flex-start;align-self:flex-start;max-width:100%">
              <button class="btn btn-sm" style="border-color:var(--green);color:var(--green);font-size:11px;padding:3px 8px;white-space:nowrap" onclick="pickCrewForSlot(${idx})">${I18N.t('ui.crewAssignPlus')}</button>
              ${_crewExtBtn}
              ${(s.crewIds||[]).length>0?`<button class="btn btn-sm" style="border-color:#f88;color:#f88;font-size:11px;padding:3px 8px;white-space:nowrap" onclick="unassignAllCrew(${idx})">${I18N.t('ui.crewAllOff')}</button>`:''}
            </div>
          </div>`;
          // 화물칸: margin-left 제거 (overlap 방지), padding-left 최소화
          // 버튼은 우측 정렬로 함선실 버튼과 충돌 회피
          const _cargoCol=`<div style="flex:1;min-width:0;padding-left:8px;margin-left:-10%;border-left:1px solid rgba(255,255,255,.07);display:flex;flex-direction:column">
            <div style="font-size:10px;color:var(--dim);margin-bottom:6px;flex-shrink:0">📦 <b style="color:var(--cyan)">${I18N.t('ui.cargoBayShort')}</b> ${s.cargoSlots||4}/100칸 <span style="opacity:.45;font-size:9px">${I18N.t('ui.hintEmptyExpand')}</span></div>
            <div style="flex-shrink:0">${_cargoData.grid}</div>
            <div style="flex:1;min-height:8px"></div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;flex-shrink:0;justify-content:flex-end;align-self:flex-end">${_cargoData.btn}</div>
          </div>`;
          // 정비 서브탭일 때만 파츠+크루 표시 (화물칸은 별도 탭으로 분리하여 DOM 부하 절감)
          const _subRight=`<div style="display:flex;gap:0;flex:1;min-width:0;align-items:stretch">${_partsCol}${_crewCol}</div>`;
          return `<div style="display:flex;gap:0;min-height:200px">
            <div style="width:208px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;padding:10px 8px;border-right:1px solid var(--bdr);background:rgba(5,10,26,.6);gap:5px">
              <div style="width:184px;height:160px;display:flex;align-items:center;justify-content:center;border-radius:8px;background:rgba(0,243,255,.04);border:1px solid rgba(0,243,255,.12)">${imgOrEmoji(imgSrc,tierEmoji,160,160,'border-radius:6px;object-fit:contain',shipLoreKey(s))}</div>
              <span style="font-size:10px;color:${tierCol};font-weight:bold">${I18N.tier(s.tier)}${I18N.t('tier.classSuffix')}${(s._enhanceLv||0)>0?`<span style="color:#ffd700">+${s._enhanceLv} (+${s._enhanceLv*5}%)</span> · `:''}LOY:${s.LOY||80}</span>
              <div style="width:100%;padding:0 2px">
                <div style="display:flex;align-items:center;gap:4px;margin-bottom:3px"><span style="font-size:9px;color:var(--dim);width:14px">HP</span><div class="bar-bg" style="flex:1;height:4px"><div class="bar-fi" style="width:${hpP}%;background:${hpC};height:4px"></div></div><span style="font-size:9px;color:var(--dim)">${hpP}%</span></div>
                ${s.maxSH>0?`<div style="display:flex;align-items:center;gap:4px"><span style="font-size:9px;color:var(--dim);width:14px">SH</span><div class="bar-bg" style="flex:1;height:4px"><div class="bar-fi" style="width:${shP}%;background:var(--blue);height:4px"></div></div><span style="font-size:9px;color:var(--dim)">${shP}%</span></div>`:''}
              </div>
              <div style="width:100%;display:grid;grid-template-columns:1fr 1fr;gap:2px 4px;padding:0 2px">
                <span style="font-size:10px;color:var(--red);white-space:nowrap">⚔ ${totalATT}</span>
                <span style="font-size:10px;color:var(--blue);white-space:nowrap">🛡 ${totalINT}</span>
                <span style="font-size:10px;color:var(--cyan);white-space:nowrap">⚙ ${totalTEC}</span>
                <span style="font-size:10px;color:var(--dim);white-space:nowrap">${I18N.t('ui.cargoSlots',{n:s.cargoSlots||4})}</span>
              </div>
            </div>
            <div style="flex:1;padding:10px 12px;overflow:visible">${_subRight}</div>
          </div>`;
        })():`<div style="display:flex;gap:0;min-height:230px;overflow:visible">
          <!-- Col 1: 함선 이미지 + 정보 — 사용자 요청 2026-06-09: 좌측 폭 +30% (165→215) -->
          <div style="width:215px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;padding:10px 8px;border-right:1px solid var(--bdr);background:rgba(5,10,26,.6);gap:5px" title="${(s.desc||'').replace(/"/g,'&quot;')}&#10;HP:${s.maxHP} SH:${s.maxSH}&#10;ATT:${s.ATT} SHD:${s.INT} ENG:${s.TEC}">
            <div style="width:190px;height:170px;display:flex;align-items:center;justify-content:center;border-radius:10px;background:rgba(0,243,255,.04);border:1px solid rgba(0,243,255,.12)">${imgOrEmoji(imgSrc,tierEmoji,170,170,'border-radius:8px;object-fit:contain',shipLoreKey(s))}</div>
            <span style="font-size:10px;color:${tierCol};font-weight:bold">${I18N.tier(s.tier)}${I18N.t('tier.classSuffix')}${(s._enhanceLv||0)>0?`<span style="color:#ffd700">+${s._enhanceLv} (+${s._enhanceLv*5}%)</span> · `:''}${(s.LOY||80)<=10?'⚠️':(s.LOY||80)>=100?'✨':''}LOY:${s.LOY||80}</span>
            <div style="width:100%;padding:0 2px">
              <div style="display:flex;align-items:center;gap:4px;margin-bottom:3px"><span style="font-size:9px;color:var(--dim);width:14px">HP</span><div class="bar-bg" style="flex:1;height:4px"><div class="bar-fi" style="width:${hpP}%;background:${hpC};height:4px"></div></div><span style="font-size:9px;color:var(--dim)">${hpP}%</span></div>
              ${s.maxSH>0?`<div style="display:flex;align-items:center;gap:4px"><span style="font-size:9px;color:var(--dim);width:14px">SH</span><div class="bar-bg" style="flex:1;height:4px"><div class="bar-fi" style="width:${shP}%;background:var(--blue);height:4px"></div></div><span style="font-size:9px;color:var(--dim)">${shP}%</span></div>`:''}
            </div>
            <div style="width:100%;display:grid;grid-template-columns:1fr 1fr;gap:3px 6px;padding:0 2px">
              <span style="font-size:10px;color:var(--red);white-space:nowrap">⚔ ATT ${totalATT}</span>
              <span style="font-size:10px;color:var(--blue);white-space:nowrap">🛡 SHD ${totalINT}</span>
              <span style="font-size:10px;color:var(--cyan);white-space:nowrap">⚙ ENG ${totalTEC}</span>
              <span style="font-size:10px;color:#ffb86c;white-space:nowrap" title="${I18N.t('ui.rangeHint')}">🎯 ${I18N.t('ui.rangeShort')} ${(window.shipCombatRange?window.shipCombatRange(s):3)}</span>
              <span style="font-size:10px;color:var(--gold);white-space:nowrap">🔰 DEF ${getShipStats(s).DEF||0}</span>
              <span style="font-size:10px;color:#f88;white-space:nowrap">❤ HP ${(s.maxHP+bonus.hp).toLocaleString()}</span>
              <span style="font-size:10px;color:var(--dim);white-space:nowrap">${I18N.t('ui.cargoSlots',{n:s.cargoSlots||4})}</span>
            </div>
          </div>
          <!-- Col 2: Parts 그리드 -->
          <div style="flex-shrink:0;padding:8px 10px;border-right:1px solid var(--bdr)">
            <div style="font-size:10px;color:var(--dim);margin-bottom:5px">⚙️ <b style="color:var(--gold)">${I18N.t('ui.partsEquip')}</b> ${(s.parts||[]).length}개 <span style="opacity:.45;font-size:9px">${I18N.t('ui.hintClickDetach')}</span></div>
            ${partsGridHtml}
          </div>
          <!-- Col 3: Crew 그리드 -->
          <div style="flex-shrink:0;padding:8px 10px;border-right:1px solid var(--bdr)">
            <div style="font-size:10px;color:var(--dim);margin-bottom:5px">👥 <b style="color:var(--green)">${I18N.t('ui.crewAssignBtn')}</b> ${(s.crewIds||[]).length}/${maxCrew}명 <span style="opacity:.45;font-size:9px">${I18N.t('ui.hintClickAssign')}</span></div>
            <div style="display:grid;grid-template-columns:repeat(${crewCols},51px);gap:4px">${crewGrid}</div>
          </div>
          <!-- Col 4: Cargo 그리드 -->
          <div style="flex:1;padding:8px 10px;min-width:196px;">
            <div style="font-size:10px;color:var(--dim);margin-bottom:5px">📦 <b style="color:var(--cyan)">${I18N.t('ui.cargoBayShort')}</b> ${s.cargoSlots||4}칸 / 최대100칸 <span style="opacity:.45;font-size:9px">${I18N.t('ui.hintEmptyExpand')}</span></div>
            ${(()=>{const slots=Math.min(s.cargoSlots||4,100);let cargoOffset=0;for(let fi=0;fi<G.fleet.length;fi++){if(G.fleet[fi].id===s.id)break;cargoOffset+=G.fleet[fi].cargoSlots||4;}const cargoFlat=[];G.cargo.forEach(function(c){const imgSrcC=commImgSrc(c.id);const _dnm=commDisplayNm(c);for(let q=0;q<(c.qty||1);q++){cargoFlat.push({nm:_dnm,ic:c.ic||'📦',img:imgSrcC,price:c.buyPrice,id:c.id});}});const myCargo=cargoFlat.slice(cargoOffset,cargoOffset+slots);let h='<div style="display:grid;grid-template-rows:repeat(5,42px);grid-auto-flow:column;grid-auto-columns:42px;gap:3px;">';for(let i=0;i<slots;i++){if(i<myCargo.length){const ci=myCargo[i];h+='<div style="width:42px;height:42px;border-radius:4px;background:rgba(0,243,255,.15);border:1px solid rgba(0,243,255,.4);display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative" title="'+ci.nm+'\n구매가: ₡'+ci.price.toLocaleString()+'"><img src="'+ci.img+'" style="width:38px;height:38px;object-fit:cover;border-radius:2px" onerror="this.style.display=\'none\';this.nextSibling.style.display=\'flex\'"><span style="font-size:18px;display:none;width:100%;height:100%;align-items:center;justify-content:center">'+ci.ic+'</span></div>';}else{const isMax=(slots>=100);h+='<div '+''+' style="width:42px;height:42px;border-radius:4px;background:rgba(255,255,255,.03);border:1px dashed rgba(255,255,255,.12);'+''+'" title="'+(isMax?I18N.t('ui.cargoMaxTooltip'):I18N.t('ui.emptyCargoCell'))+'"></div>';}}h+='</div>';return h;})()}
          </div>
        </div>`}

        <!-- ── 하단 액션 버튼 바 ── -->
        <div style="border-top:1px solid var(--bdr);padding:10px 14px;display:flex;flex-direction:column;gap:8px;background:rgba(5,10,26,.4)">

          <!-- 수리 버튼 -->
          <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
            <span style="font-size:11px;color:var(--dim);min-width:32px">${I18N.t('ui.repairLabel')}</span>
            ${rc>0?`<button class="btn btn-sm btn-green" style="font-size:11px;padding:3px 8px" onclick="repairShip(${idx},'hp')" ${G.credits>=rc?'':`disabled title="${I18N.t('title.notEnoughCredits')}"`}>🔧 HP ₡${rc.toLocaleString()}</button>`:`<span style="font-size:11px;color:var(--green)">${I18N.t('ui.hpMaxBadge')}</span>`}
            ${sc>0?`<button class="btn btn-sm" style="border-color:var(--blue);color:var(--blue);font-size:11px;padding:3px 8px" onclick="repairShip(${idx},'sh')" ${G.credits>=sc?'':`disabled title="${I18N.t('title.notEnoughCredits')}"`}>${I18N.t('ui.shieldRepairShortBtn',{cost:sc.toLocaleString()})}</button>`:''}
            ${(rc+sc)>0?`<button class="btn btn-sm btn-gold" style="font-size:11px;padding:3px 8px" onclick="repairShipFull(${idx})" ${G.credits>=(rc+sc)?'':`disabled title="${I18N.t('title.notEnoughCredits')}"`}>${I18N.t('ui.fullRepairShortBtn',{cost:(rc+sc).toLocaleString()})}</button>`:''}
          </div>

          <!-- 함선 관리 버튼 -->
          <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
            ${(()=>{if((s.cargoSlots||5)>=100)return'<span style="font-size:11px;color:var(--cyan)">'+I18N.t('ship.cargoMaxShort')+'</span>';const cp=getCargoUpgradePrice(s);return'';})()}
            <span style="color:var(--bdr);margin:0 2px">|</span>
            ${!isFlagship?`<button class="btn btn-sm btn-gold" style="font-size:11px;padding:3px 8px" onclick="setFlagship(${idx})">${I18N.t('ui.flagshipSetGoldBtn')}</button>`:`<span style="font-size:11px;color:var(--cyan)">${I18N.t('ui.flagshipCurrentBadge')}</span>`}
            <button class="btn btn-sm" style="font-size:11px;padding:3px 8px;border-color:var(--cyan);color:var(--cyan)" onclick="renameShip(${idx})">${I18N.t('ui.renameShipBtn')}</button>
            ${G.fleet.length>1?`<button class="btn btn-sm btn-red" style="font-size:11px;padding:3px 8px" onclick="confirmSellShip(${idx})">${I18N.t('ui.sellShipBtn')}</button>`:`<span style="font-size:11px;color:var(--dim)">${I18N.t('ui.minOneShip')}</span>`}
          </div>

        </div>
      </div>`;
    }).join('');

    // 임시창 후보 함선 섹션 — 함수 상단에서 빌드된 _reserveSectionHtml 사용 (정비소 모드만 content에 추가)
    if(G._garageMode)content+=_reserveSectionHtml;

  // ── 함선 구매 ──────────────────────────────────────────────────────
  }else if(_shipTab==='buy'){
    const fleetFull=G.fleet.length>=16;
    // 좌측: 나의 함선 카드 리스트 — 정렬 토글 적용 (기함 고정 최상단)
    const _tierColMy={'신화':'var(--purple)','전설기함':'#d4af37','대형':'var(--gold)','중형':'var(--blue)','소형':'var(--dim)'};
    const _MY_TIER_ORDER={'소형':0,'중형':1,'대형':2,'전설기함':3,'신화':4};
    const _myDirMul=_myShipSortDir==='desc'?-1:1;
    const _flagshipShip=G.fleet[0];
    const _restFleet=G.fleet.slice(1).map((s,j)=>({s,origIdx:j+1}));
    if(_myShipSort==='tier'){
      _restFleet.sort((a,b)=>((_MY_TIER_ORDER[a.s.tier]??9)-(_MY_TIER_ORDER[b.s.tier]??9))*_myDirMul||((a.s.price||0)-(b.s.price||0)));
    } else {
      _restFleet.sort((a,b)=>{const ap=getShipSellPrice(a.s).total||a.s.price||0;const bp=getShipSellPrice(b.s).total||b.s.price||0;return (ap-bp)*_myDirMul;});
    }
    const _orderedFleet=_flagshipShip?[{s:_flagshipShip,origIdx:0},..._restFleet]:_restFleet;
    const myFleetCards=_orderedFleet.map(({s,origIdx:i})=>{
      const sp=getShipSellPrice(s);
      const tc=_tierColMy[s.tier]||'var(--dim)';
      const _stC=getShipStats(s);
      const _eMxH=Math.max(1,_stC.HP||s.maxHP),_eMxS=Math.max(1,_stC.maxSH||s.maxSH);
      const hpP=clamp(Math.round(s.hp/_eMxH*100),0,100);
      const shP=(_stC.maxSH||s.maxSH)>0?clamp(Math.round(s.sh/_eMxS*100),0,100):0;
      const st=getShipStats(s);
      const isFlagship=i===0;
      const canSell=G.fleet.length>1;
      const cardBdr=s.tier==='신화'?'rgba(204,102,255,.5)':s.tier==='전설기함'?'rgba(212,175,55,.5)':s.tier==='대형'?'rgba(212,175,55,.3)':isFlagship?'var(--cyan)':'var(--bdr)';
      const cardBg=s.tier==='신화'?'rgba(139,0,255,.05)':s.tier==='전설기함'?'rgba(212,175,55,.04)':'var(--card)';
      // 거래소 함선 카드와 동일한 구조: 좌 정보(flex:1) + 우 이미지(110×110)
      return '<div style="background:'+cardBg+';border:1px solid '+cardBdr+';border-radius:10px;padding:10px;display:flex;flex-direction:row;gap:8px;align-items:stretch">'+
        // ── 왼쪽: 정보 ──
        '<div style="flex:1;display:flex;flex-direction:column;gap:5px;min-width:0">'+
          // 이름 + 티어 배지
          '<div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap">'+
            '<span style="font-size:12px;font-weight:bold;color:'+(isFlagship?'var(--cyan)':tc)+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="'+(shipDisplayNm(s)||s.nm)+'">'+(isFlagship?'⭐ ':'')+shipDisplayName(s)+'</span>'+
            '<span style="font-size:9px;color:'+tc+';background:rgba(0,0,0,.6);border:1px solid '+tc+';border-radius:3px;padding:1px 4px;flex-shrink:0">'+I18N.tier(s.tier)+'</span>'+
          '</div>'+
          // 상태
          '<div style="font-size:10px;color:var(--green)">HP '+hpP+'%'+(shP>0?I18N.t('ship.shieldPercent',{p:shP}):'')+'</div>'+
          // 스탯 (HP, SH, ATT, INT, TEC, DEF) — 거래소와 동일 grid 2열
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1px 4px;font-size:10px">'+
            '<span style="color:#f88">❤ '+st.HP.toLocaleString()+'</span>'+
            '<span style="color:#8af">🛡 '+(st.maxSH||0).toLocaleString()+'</span>'+
            '<span style="color:#fa8">⚔ '+(st.ATT||0)+'</span>'+
            '<span style="color:#af8">🔮 '+(st.INT||0)+'</span>'+
            '<span style="color:#8ff">⚙ '+(st.TEC||0)+'</span>'+
            '<span style="color:var(--gold)">🔰 '+(st.DEF||0)+'</span>'+
          '</div>'+
          '<div style="font-size:10px;color:var(--dim)">'+I18N.t('ship.cargoCrewSummary',{c:s.cargoSlots||4,n:(s.crewIds||[]).length,max:getMaxCrew(s)})+'</div>'+
          // 가격 + 버튼
          '<div style="margin-top:auto;border-top:1px solid rgba(255,255,255,.07);padding-top:5px;display:flex;align-items:center;justify-content:space-between;gap:4px">'+
            '<div>'+
              `<div style="color:var(--dim);font-size:9px">${I18N.t('ui.sellPriceShort')}</div>`+
              '<div style="color:var(--gold);font-size:12px;font-weight:bold">₡'+sp.total.toLocaleString()+'</div>'+
            '</div>'+
            '<button class="btn btn-sm btn-red" style="padding:3px 10px;font-size:11px;'+(canSell?'':'opacity:.4')+'" onclick="confirmSellShip('+i+')" '+(canSell?'':'disabled')+'>'+I18N.t('ui.sell')+'</button>'+
          '</div>'+
        '</div>'+
        // ── 오른쪽: 이미지 ── 사용자 요청 2026-06-09 (재): 5탭 좌측 이미지 1.5배 (330 → 495), object-fit:contain 으로 잘림 방지
        '<div style="flex-shrink:0;display:flex;align-items:center;justify-content:center">'+
          imgOrEmoji(shipImgSrc(s),TIER_EMOJI[s.tier]||'🛸',G._garageMode?495:165,G._garageMode?495:165,'border-radius:10px;background:rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.08);object-fit:contain',shipLoreKey(s))+
        '</div>'+
      '</div>';
    }).join('');
    const myFleetHTML=`<div style="background:rgba(0,243,255,.04);border:1px solid rgba(0,243,255,.2);border-radius:8px;padding:10px 12px;height:100%;display:flex;flex-direction:column;min-height:0">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-shrink:0">
        <div style="font-size:13px;font-weight:bold;color:var(--cyan)">${I18N.t('ui.myShipsHeader',{n:G.fleet.length})}</div>
        <div style="font-size:11px;color:var(--dim)">${I18N.t('ui.sellEqualsInstant')}</div>
      </div>
      <div style="display:flex;gap:6px;align-items:center;margin-bottom:8px;flex-shrink:0">
        <span style="font-size:11px;color:var(--dim)">${I18N.t('ui.sortPrefix')}</span>
        <button onclick="_setMyShipSort('price')" title="${_myShipSort==='price'?I18N.t('ui.clickToReverse'):I18N.t('ui.sortByPrice')}" style="padding:4px 12px;border:1px solid ${_myShipSort==='price'?'var(--cyan)':'var(--bdr)'};background:${_myShipSort==='price'?'rgba(0,243,255,.12)':'transparent'};color:${_myShipSort==='price'?'var(--cyan)':'var(--dim)'};cursor:pointer;border-radius:4px;font-size:11px;font-family:Courier New,monospace">${I18N.t('ui.sortPriceBtn',{arrow:_myShipSort==='price'?(_myShipSortDir==='asc'?' ↑':' ↓'):''})}</button>
        <button onclick="_setMyShipSort('tier')" title="${_myShipSort==='tier'?I18N.t('ui.clickToReverse'):I18N.t('ui.sortByTier')}" style="padding:4px 12px;border:1px solid ${_myShipSort==='tier'?'var(--cyan)':'var(--bdr)'};background:${_myShipSort==='tier'?'rgba(0,243,255,.12)':'transparent'};color:${_myShipSort==='tier'?'var(--cyan)':'var(--dim)'};cursor:pointer;border-radius:4px;font-size:11px;font-family:Courier New,monospace">${I18N.t('ui.sortTierBtn',{arrow:_myShipSort==='tier'?(_myShipSortDir==='asc'?' ↑':' ↓'):''})}</button>
        <span style="font-size:10px;color:var(--muted);margin-left:auto">${I18N.t('ui.flagshipFixed')}</span>
      </div>
      <div data-scroll-id="ship-fleet" style="flex:1;overflow-y:auto;min-height:0;scrollbar-width:thin;scrollbar-color:rgba(0,243,255,.2) transparent">
        ${G.fleet.length>0
          ? `<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px">${myFleetCards}</div>`
          : `<div style="color:var(--dim);font-size:12px;text-align:center;padding:14px">${I18N.t('ui.noOwnedShips')}</div>`}
        ${_reserveSectionHtml}
      </div>
    </div>`;
    const voidHintBuy=!isVoidPlanet?`<div style="background:rgba(139,0,255,.07);border:1px solid rgba(139,0,255,.3);border-radius:8px;padding:10px 14px;margin-bottom:12px;font-size:12px;color:var(--dim)">${I18N.t('ship.buyConditionTitle')}<span style="color:var(--cyan)">${I18N.t('ship.buyCondMid')}</span> / <span style="color:var(--gold)">${I18N.t('ship.buyCondLarge')}</span> / <span style="color:var(--purple)">${I18N.t('ship.buyCondLegendMythic')}</span></div>`:'';
    const _mythicHint=plvForShip>=600?'':`<div style="background:rgba(204,102,255,.07);border:1px solid rgba(204,102,255,.3);border-radius:8px;padding:10px 14px;margin-bottom:12px;font-size:12px;color:var(--dim)">${I18N.t('ship.mythicLockTitle')}<span style="color:var(--purple);font-weight:bold">${I18N.t('ship.mythicLockBody')}</span><span style="color:var(--cyan)">${I18N.t('ship.mythicLockReq')}</span>${I18N.t('ship.mythicLockSuffix',{plv:plvForShip})}</div>`;
    if(isHostile){
      content=`<div style="background:var(--card);border:1px dashed var(--red);border-radius:8px;padding:20px;text-align:center">
        <div style="font-size:38px;margin-bottom:8px">⚠️</div>
        <div style="color:var(--red);font-size:16px">${I18N.t('ui.chixHostileNoShipBuy')}</div>
        <div style="color:var(--dim);font-size:13px;margin-top:6px">${I18N.t('ui.goToSafePlanet')}</div>
      </div>`;
    } else if(availShips.length===0){
      content=`<div style="color:var(--dim);font-size:14px;text-align:center;padding:20px">${I18N.t('ui.noShipsAtPlanet')}</div>`;
    } else {
      // 사용자 요청: 정렬 토글 — 가격(기본) 또는 등급, 클릭 시 ASC↔DESC 방향 전환
      const _BUY_TIER_ORDER={'소형':0,'중형':1,'대형':2,'전설기함':3,'신화':4};
      const _dirMul=_shopShipSortDir==='desc'?-1:1;
      const sortedAvailShips=[...availShips].sort((a,b)=>{
        if(_shopShipSort==='tier'){
          return ((_BUY_TIER_ORDER[a.tier]??9)-(_BUY_TIER_ORDER[b.tier]??9))*_dirMul||((a.price||0)-(b.price||0));
        }
        return ((a.price||0)-(b.price||0))*_dirMul;
      });
      // 정렬 토글 버튼 바 (활성 키 옆에 ↑↓ 방향 표시)
      const _arrow=_shopShipSortDir==='asc'?'↑':'↓';
      const _shopSortBar=`<div style="display:flex;gap:6px;align-items:center;margin-bottom:10px">
        <span style="font-size:11px;color:var(--dim)">${I18N.t('ui.sortPrefix')}</span>
        <button onclick="_setShopShipSort('price')" title="${_shopShipSort==='price'?I18N.t('ui.clickToReverse'):I18N.t('ui.sortByPrice')}" style="padding:4px 12px;border:1px solid ${_shopShipSort==='price'?'var(--cyan)':'var(--bdr)'};background:${_shopShipSort==='price'?'rgba(0,243,255,.12)':'transparent'};color:${_shopShipSort==='price'?'var(--cyan)':'var(--dim)'};cursor:pointer;border-radius:4px;font-size:11px;font-family:Courier New,monospace">${I18N.t('ui.sortPriceBtn',{arrow:_shopShipSort==='price'?' '+_arrow:''})}</button>
        <button onclick="_setShopShipSort('tier')" title="${_shopShipSort==='tier'?I18N.t('ui.clickToReverse'):I18N.t('ui.sortByTier')}" style="padding:4px 12px;border:1px solid ${_shopShipSort==='tier'?'var(--cyan)':'var(--bdr)'};background:${_shopShipSort==='tier'?'rgba(0,243,255,.12)':'transparent'};color:${_shopShipSort==='tier'?'var(--cyan)':'var(--dim)'};cursor:pointer;border-radius:4px;font-size:11px;font-family:Courier New,monospace">${I18N.t('ui.sortTierBtn',{arrow:_shopShipSort==='tier'?' '+_arrow:''})}</button>
        <span style="font-size:10px;color:var(--muted);margin-left:auto">${I18N.t('ui.stockShipsCount',{n:sortedAvailShips.length})}</span>
      </div>`;
      const _fleetFullNote=fleetFull?`<div style="background:rgba(255,200,0,.08);border:1px solid rgba(255,200,0,.45);border-radius:8px;padding:8px 12px;margin-bottom:10px;font-size:12px;color:var(--yellow);line-height:1.6">${I18N.t('ui.reserveStorageNote')}</div>`:'';
      content=_fleetFullNote+voidHintBuy+_mythicHint+_shopSortBar+(function(){
        // 거래소 함선 (우측 컬럼용) — 2열 그리드
        var _curPlv2=calcPlayerLevel();
        var allSorted=sortedAvailShips;
        if(!allSorted.length)return`<div style="color:var(--dim);font-size:14px;padding:20px;text-align:center">${I18N.t('ui.noShipsInStock')}</div>`;

        var tierLabel={'소형':'소형','중형':'중형','대형':'대형','전설기함':'전설기함','신화':'신화'};
        var tierCol={'신화':'var(--purple)','전설기함':'#d4af37','대형':'var(--gold)','중형':'var(--blue)','소형':'var(--dim)'};

        // bugfix 2026-06-11: minmax(0,1fr) — 내용(긴 금액 등)과 무관하게 모든 카드 동일 폭 강제
        return '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:14px">'+
          allSorted.map(function(s){
            var tc=tierCol[s.tier]||'var(--dim)';
            var actualPrice=iSunsin?Math.floor(s.price*0.85):s.price;
            var qty=stock['ship_'+s.id]||0,canBuy=G.credits>=actualPrice&&qty>0;
            var maxCrew=getMaxCrew(s);
            var tierReqLv=s.tier==='중형'?200:s.tier==='대형'?400:(s.tier==='전설기함'||s.tier==='신화')?600:0;
            var lvLock=tierReqLv>0&&_curPlv2<tierReqLv;
            // 요구 전투력 도달 20 이전이면 이미지·정보 어둡게 처리
            var farLocked=tierReqLv>0&&_curPlv2<tierReqLv-20;
            var _lockMsg2=s.tier==='중형'?I18N.t('ship.lockMidPow'):s.tier==='대형'?I18N.t('ship.lockLargePow'):I18N.t('ship.lockMythicPow');
            var canBuyFinal=canBuy&&!lvLock;
            var cardBdr=s.tier==='신화'?'rgba(204,102,255,.5)':s.tier==='전설기함'?'rgba(212,175,55,.5)':s.tier==='대형'?'rgba(212,175,55,.3)':'var(--bdr)';
            var cardBg=s.tier==='신화'?'rgba(139,0,255,.05)':s.tier==='전설기함'?'rgba(212,175,55,.04)':'var(--card)';
            var cargoCnt=(typeof s.cargoStart==='number')?s.cargoStart:(s.tier==='소형'?4:s.tier==='중형'?8:s.tier==='대형'?12:s.tier==='전설기함'?16:20);
            return '<div style="background:'+cardBg+';border:1px solid '+cardBdr+';border-radius:10px;padding:10px;display:flex;flex-direction:row;gap:8px;align-items:stretch'+(farLocked?';filter:brightness(.35) grayscale(.6);opacity:.7':'')+'">'+
              // ── 왼쪽: 정보 ──
              '<div style="flex:1;display:flex;flex-direction:column;gap:5px;min-width:0">'+
                // 이름 + 티어 배지
                '<div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap">'+
                  '<span style="font-size:12px;font-weight:bold;color:'+tc+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="'+shipDisplayNm(s)+'">'+shipDisplayNm(s)+'</span>'+
                  '<span style="font-size:9px;color:'+tc+';background:rgba(0,0,0,.6);border:1px solid '+tc+';border-radius:3px;padding:1px 4px;flex-shrink:0">'+I18N.tier(s.tier)+'</span>'+
                '</div>'+
                // 재고 상태
                (lvLock
                  ?'<div style="font-size:10px;color:var(--purple);background:rgba(139,0,255,.1);border:1px solid rgba(139,0,255,.3);border-radius:4px;padding:2px 5px">🔒 '+_lockMsg2+'</div>'
                  :(qty>0
                    ?'<div style="font-size:10px;color:var(--cyan)">'+I18N.t('ship.stockN',{n:qty})+'</div>'
                    :`<div style="font-size:10px;color:var(--red)">${I18N.t('ui.outOfStock')}</div>`))+
                // 스탯
                (lvLock?'':
                  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1px 4px;font-size:10px">'+
                    '<span style="color:#f88">❤ '+s.maxHP.toLocaleString()+'</span>'+
                    '<span style="color:#8af">🛡 '+s.maxSH.toLocaleString()+'</span>'+
                    '<span style="color:#fa8">⚔ '+s.ATT+'</span>'+
                    '<span style="color:#af8">🔮 '+s.INT+'</span>'+
                    '<span style="color:#8ff">⚙ '+s.TEC+'</span>'+
                    '<span style="color:var(--dim)">'+I18N.t('ship.cargoCells',{n:cargoCnt})+'</span>'+
                  '</div>'+
                  '<div style="font-size:10px;color:var(--dim)">'+I18N.t('ui.crewMaxN',{n:maxCrew})+'</div>')+
                // 가격 + 버튼
                // bugfix 2026-06-11: 금액이 길어도 버튼이 세로로 길어지지 않게 — 가격은 축소(ellipsis), 버튼은 nowrap+축소금지
                '<div style="margin-top:auto;border-top:1px solid rgba(255,255,255,.07);padding-top:5px;display:flex;align-items:center;justify-content:space-between;gap:4px;min-width:0">'+
                  '<div style="min-width:0;overflow:hidden">'+
                    (iSunsin?'<div style="color:var(--dim);font-size:9px;text-decoration:line-through;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">₡'+s.price.toLocaleString()+'</div>':'')+
                    '<div style="color:var(--gold);font-size:12px;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="₡'+actualPrice.toLocaleString()+'">₡'+actualPrice.toLocaleString()+'</div>'+
                  '</div>'+
                  (lvLock
                    ?'<span style="font-size:10px;color:var(--purple)">🔒</span>'
                    :'<button class="btn btn-gold" style="padding:3px 8px;font-size:11px;white-space:nowrap;flex-shrink:0;'+(canBuyFinal?'':'opacity:.5')+'" onclick="buyShip(\''+s.id+'\')" '+(canBuyFinal?'':'disabled')+'>'+(qty===0?I18N.t('ui.outOfStock'):G.credits<actualPrice?I18N.t('ui.noCreditsShort'):I18N.t('ui.buy'))+'</button>')+
                '</div>'+
              '</div>'+
              // ── 오른쪽: 이미지 ──
              '<div style="flex-shrink:0;display:flex;align-items:center;justify-content:center">'+
                imgOrEmoji(shipImgSrc(s),TIER_EMOJI[s.tier]||'🛸',165,165,'border-radius:10px;background:rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.08);object-fit:contain',shipLoreKey(s))+
              '</div>'+
            '</div>';
          }).join('')+'</div>';
      })();
    }
    // 좌(나의 함선) / 우(거래소 함선) 분할 (정비소 모드는 기존 그대로)
    if(!G._garageMode){
      content=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:start">
        <div>${myFleetHTML}</div>
        <div>
          <div style="font-size:13px;font-weight:bold;color:var(--gold);margin-bottom:8px">${I18N.t('ui.shopShipsHeader')}</div>
          ${content}
        </div>
      </div>`;
    }

  // ── 파츠 구매 ─────────────────────────────────────────────────────
  }else{
    if(isHostile){
      content=`<div style="background:var(--card);border:1px dashed var(--red);border-radius:8px;padding:20px;text-align:center"><div style="color:var(--red)">${I18N.t('ui.hostileCantBuy')}</div></div>`;
    } else if(availParts.length===0){
      content=`<div style="color:var(--dim);font-size:14px;text-align:center;padding:20px">${I18N.t('ui.noPartsStock')}</div>`;
    } else {
      // 정렬 함수 (티어/가격 오름/내림/이름)
      const _applyPartSort=(arr)=>{
        const a=[...arr];
        if(_partSort==='priceAsc')a.sort((x,y)=>(x.price||0)-(y.price||0));
        else if(_partSort==='priceDesc')a.sort((x,y)=>(y.price||0)-(x.price||0));
        else if(_partSort==='nm')a.sort((x,y)=>(x.nm||'').localeCompare(y.nm||''));
        else a.sort((x,y)=>(x.tier||0)-(y.tier||0));  // tier (기본)
        return a;
      };
      // 정렬 버튼 UI
      const _sortBtn=(key,lbl)=>{const act=_partSort===key;return `<button onclick="_partSort='${key}';rerenderShipOrGarage()" style="padding:4px 10px;border:1px solid ${act?'var(--cyan)':'var(--bdr)'};background:${act?'rgba(0,243,255,.12)':'transparent'};color:${act?'var(--cyan)':'var(--dim)'};border-radius:5px;cursor:pointer;font-size:11px;font-family:inherit">${lbl}${act?' ✓':''}</button>`;};
      const _sortBar=`<div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;flex-wrap:wrap;padding:6px 10px;background:rgba(0,0,0,.25);border-radius:6px">
        <span style="font-size:11px;color:var(--dim);font-weight:bold">${I18N.t('ui.sortShip')}</span>
        ${_sortBtn('tier',I18N.t('ui.sortByTierEmoji'))}
        ${_sortBtn('priceAsc',I18N.t('ship.sortPriceAsc'))}
        ${_sortBtn('priceDesc',I18N.t('ship.sortPriceDesc'))}
        ${_sortBtn('nm',I18N.t('ui.sortByName'))}
      </div>`;
      content=_sortBar+['weapon','missile_inject','shield','armor','engine'].map(cat=>{
        if(cat==='missile_inject'){
          const _mi=_applyPartSort(PARTS.filter(p=>p.wtype==='missile'&&(stock['part_'+p.id]||0)>0&&!p.quest&&p.rarity!=='legend'&&p.rarity!=='mythic'));
          if(_mi.length===0)return'';
          const _mm=_mi.map(p=>{
            const qty=stock['part_'+p.id]||0;
            const fp=iSunsin?Math.floor(p.price*0.85):p.price;
            const canBuy=G.credits>=fp&&qty>0;
            const nmCol=p.rarity==='mythic'?'#ff88ff':p.rarity==='set'?'#c080ff':p.tier>=15?'var(--gold)':p.tier>=11?'#ffa040':p.tier>=6?'var(--cyan)':'var(--txt)';
            const bdrCol=p.rarity==='mythic'?'rgba(255,136,255,.5)':p.rarity==='set'?'rgba(192,128,255,.5)':'var(--bdr)';
            return `<div style="background:var(--card);border:1px solid ${bdrCol};border-radius:10px;padding:10px;display:flex;flex-direction:row;gap:8px;align-items:stretch">
              <div style="flex:1;display:flex;flex-direction:column;gap:5px;min-width:0">
                <div style="font-size:12px;font-weight:bold;color:${nmCol};line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:break-all">${partDisplayNm(p)}</div>
                <div style="display:flex;gap:4px">
                  <span style="font-size:10px;color:var(--red);border:1px solid var(--red);border-radius:3px;padding:0 4px">T${p.tier}</span>
                  <span style="color:var(--dim);font-size:10px">${I18N.t('ui.stockPrefix')}${qty}</span>
                </div>
                <div style="font-size:11px;color:var(--red);font-weight:bold">🚀 ATT +${p.ATT}</div>
                <div style="font-size:10px;color:var(--dim);flex:1">${p.desc.slice(0,55)}${p.desc.length>55?'…':''}</div>
                <div style="border-top:1px solid rgba(255,255,255,.06);padding-top:6px;display:flex;align-items:center">
                  ${iSunsin?`<span style="color:var(--dim);font-size:10px;text-decoration:line-through">₡${p.price.toLocaleString()}</span>`:''}
                  <span style="color:var(--gold);font-size:14px;font-weight:bold">₡${fp.toLocaleString()}</span>
                  <button class="btn btn-gold" style="padding:4px 10px;font-size:11px;margin-left:auto;${!canBuy?'opacity:.5':''}" onclick="buyPart('${p.id}')" ${canBuy?'':'disabled'}>${qty===0?I18N.t('ui.noStock'):G.credits<fp?I18N.t('ui.noCredits'):I18N.t('ui.buy')}</button>
                </div>
              </div>
              <div style="flex-shrink:0;display:flex;align-items:center;justify-content:center">
                ${imgOrEmoji('img/parts/'+p.id+'.png','🚀',120,120,'border-radius:8px;background:rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.08)','part_'+p.id)}
              </div>
            </div>`;
          }).join('');
          return `<div style="margin-bottom:14px"><div style="font-size:13px;color:var(--red);font-weight:bold;margin-bottom:8px;letter-spacing:1px">${I18N.t('ui.missilesSection',{n:_mi.length})}</div><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px">${_mm}</div></div>`;
        }
        const catParts=_applyPartSort(PARTS.filter(p=>p.cat===cat&&(cat!=='weapon'||(p.wtype==='laser'||!p.wtype))&&(stock['part_'+p.id]||0)>0&&p.rarity!=='legend'&&p.rarity!=='mythic'&&p.rarity!=='set'));
        if(catParts.length===0)return'';
        const catNm={weapon:I18N.t('ui.partCatLaser'),shield:I18N.t('ui.partCatShield'),armor:I18N.t('ui.partCatArmor'),engine:I18N.t('ui.partCatEngine')}[cat];
        const catCol={weapon:'var(--red)',shield:'var(--blue)',armor:'var(--gold)',engine:'var(--cyan)'}[cat];
        const catIc={weapon:'⚔️',shield:'🛡️',armor:'🛡',engine:'⚡'}[cat]||'⚙️';
        return `<div style="margin-bottom:14px">
          <div style="font-size:13px;color:${catCol};font-weight:bold;margin-bottom:8px;letter-spacing:1px">${catNm}</div>
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px">${catParts.map(p=>{
            const qty=stock['part_'+p.id]||0;
            const partFinalPrice=iSunsin?Math.floor(p.price*0.85):p.price;
            const canBuy=G.credits>=partFinalPrice&&qty>0;
            const nmCol=p.rarity==='mythic'?'#ff88ff':p.rarity==='set'?'#c080ff':p.tier>=15?'var(--gold)':p.tier>=11?'#ffa040':p.tier>=6?'var(--cyan)':'var(--txt)';
            const bdrCol=p.rarity==='mythic'?'rgba(255,136,255,.5)':p.rarity==='set'?'rgba(192,128,255,.5)':'var(--bdr)';
            const rarBadge=p.rarity==='mythic'?`<span style="font-size:10px;color:#ff88ff;border:1px solid #ff88ff;border-radius:3px;padding:0 4px">${I18N.t('ui.mythicBadge')}</span>`:p.rarity==='set'?`<span style="font-size:10px;color:#c080ff;border:1px solid #c080ff;border-radius:3px;padding:0 4px">${I18N.t('ui.setBadge')}</span>`:'';
            const statLine=cat==='weapon'?`⚔ ATT +${p.ATT}${p.wtype?' ['+p.wtype+']':''}`:cat==='shield'?`🛡 SHD +${p.INT} SH+${p.maxSH}`:cat==='armor'?`❤ HP +${p.HP}${p.DEF?' DEF+'+p.DEF:''}`:cat==='engine'?`⚙ ENG +${p.TEC}`:'';
            return `<div style="background:var(--card);border:1px solid ${bdrCol};border-radius:10px;padding:10px;display:flex;flex-direction:row;gap:8px;align-items:stretch">
              <div style="flex:1;display:flex;flex-direction:column;gap:5px;min-width:0">
                <div style="display:flex;align-items:flex-start;gap:4px;flex-wrap:wrap">
                  <span style="font-size:12px;font-weight:bold;color:${nmCol};line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:break-all;flex:1;min-width:0">${partDisplayNm(p)}</span>${rarBadge}
                </div>
                <div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap">
                  <span style="font-size:10px;color:${catCol};border:1px solid ${catCol};border-radius:3px;padding:0 4px">T${p.tier}</span>
                  <span style="color:var(--dim);font-size:10px">${I18N.t('ui.stockPrefix')}${qty}</span>
                </div>
                <div style="font-size:11px;color:${catCol};font-weight:bold">${statLine}</div>
                <div style="font-size:10px;color:var(--dim);line-height:1.4;flex:1">${p.desc.slice(0,60)}${p.desc.length>60?'…':''}</div>
                <div style="padding-top:6px;border-top:1px solid rgba(255,255,255,.06);display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                  ${iSunsin?`<span style="color:var(--dim);font-size:10px;text-decoration:line-through">₡${p.price.toLocaleString()}</span>`:''}
                  <span style="color:var(--gold);font-size:14px;font-weight:bold">₡${partFinalPrice.toLocaleString()}</span>
                  <button class="btn btn-gold" style="padding:4px 10px;font-size:11px;margin-left:auto;${!canBuy?'opacity:.5':''}" onclick="buyPart('${p.id}')" ${canBuy?'':'disabled'}>${qty===0?I18N.t('ui.noStock'):G.credits<partFinalPrice?I18N.t('ui.noCredits'):I18N.t('ui.buy')}</button>
                </div>
              </div>
              <div style="flex-shrink:0;display:flex;align-items:center;justify-content:center">
                ${imgOrEmoji('img/parts/'+p.id+'.png',catIc,120,120,'border-radius:8px;background:rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.08)','part_'+p.id)}
              </div>
            </div>`;
          }).join('')}</div>
        </div>`;
      }).join('');

      // ── 미사일 섹션은 위 map 루프에서 처리됨 ──

      // ── 특수 창고 섹션 ─────────────────────────────────────────────
      const scAvail=SPECIAL_CARGO_PARTS.filter(p=>(stock['scargo_'+p.id]||0)>0&&!p.quest);
      if(scAvail.length>0){
        const mSC=scAvail.map(p=>{
          const qty=stock['scargo_'+p.id]||0;
          const fp=p.price;
          const canBuy=G.credits>=fp&&qty>0;
          const nmCol=p.rarity==='mythic'?'#ff88ff':p.rarity==='legend'?'var(--gold)':p.rarity==='hero'?'var(--purple)':p.tier>=6?'var(--cyan)':'var(--txt)';
          const bdrCol=p.rarity==='mythic'?'rgba(255,136,255,.5)':p.rarity==='legend'?'rgba(212,175,55,.4)':'var(--bdr)';
          return `<div style="background:var(--card);border:1px solid ${bdrCol};border-radius:10px;padding:10px;display:flex;flex-direction:column;gap:5px">
            <div style="display:flex;align-items:center;gap:8px">
              ${imgOrEmoji('img/parts/'+p.id+'.png',p.ic||'📦',44,44,'border-radius:6px;background:rgba(0,0,0,.4);object-fit:contain;flex-shrink:0','part_'+p.id)}
              <div style="flex:1;font-size:12px;font-weight:bold;color:${nmCol};min-width:0">${partDisplayNm(p)}</div>
            </div>
            <div style="display:flex;gap:4px">
              <span style="font-size:10px;color:var(--cyan);border:1px solid var(--cyan);border-radius:3px;padding:0 4px">T${p.tier}</span>
              <span style="font-size:10px;color:var(--green);font-weight:bold">${I18N.t('ui.cargoBonusBadge',{n:p.cargoBonus})}</span>
              <span style="color:var(--dim);font-size:10px">${I18N.t('ui.stockPrefix')}${qty}</span>
            </div>
            <div style="font-size:10px;color:var(--dim)">${p.desc}</div>
            <div style="border-top:1px solid rgba(255,255,255,.06);padding-top:6px;display:flex;align-items:center">
              <span style="color:var(--gold);font-size:13px;font-weight:bold">₡${fp.toLocaleString()}</span>
              <button class="btn btn-gold" style="padding:4px 10px;font-size:11px;margin-left:auto;${!canBuy?'opacity:.5':''}" onclick="buyCargoExtPart('${p.id}')" ${canBuy?'':'disabled'}>${qty===0?I18N.t('ui.noStock'):G.credits<fp?I18N.t('ui.noCredits'):I18N.t('ui.buy')}</button>
            </div>
          </div>`;
        }).join('');
        content+=`<div style="margin-bottom:14px;border-top:1px solid var(--bdr);padding-top:12px">
          <div style="font-size:13px;color:var(--cyan);font-weight:bold;margin-bottom:8px">${I18N.t('ui.cargoExpHeader')}</div>
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px">${mSC}</div>
        </div>`;
      }
    }
  }

  // 보유 파츠 매각 섹션 (parts 탭에만 표시)
  let invPartsSection='';
  if(_shipTab==='parts'&&!G._garageMode){
    const hasMarcoInv=G.heroes&&G.heroes.includes('H08');
    // 특수창고(SC) 파츠도 일반 파츠처럼 나의 파츠에 표시. 사용자 요청 2026-06-14
    const _findInvP=id=>PARTS.find(p=>p.id===id)||(typeof SPECIAL_CARGO_PARTS!=='undefined'?SPECIAL_CARGO_PARTS.find(c=>c.id===id):null);
    let invParts=G.inventory.filter(i=>i.qty>0&&_findInvP(i.id));
    // 보유 파츠 정렬 (사용자 선택)
    const _rarPri={mythic:0,set:1,legend:2,L:2,hero:3,H:3,R:4,N:5};
    invParts=[...invParts].sort((a,b)=>{
      const pa=_findInvP(a.id)||{},pb=_findInvP(b.id)||{};
      if(_invPartSort==='priceAsc')return (pa.price||0)-(pb.price||0);
      if(_invPartSort==='priceDesc')return (pb.price||0)-(pa.price||0);
      if(_invPartSort==='nm')return (pa.nm||'').localeCompare(pb.nm||'');
      if(_invPartSort==='rarity'){
        const ra=_rarPri[pa.rarity]??(pa.tier>=15?2:pa.tier>=11?3:pa.tier>=6?4:5);
        const rb=_rarPri[pb.rarity]??(pb.tier>=15?2:pb.tier>=11?3:pb.tier>=6?4:5);
        if(ra!==rb)return ra-rb;
        return (pb.tier||0)-(pa.tier||0);
      }
      // 기본 tier 내림차순
      return (pb.tier||0)-(pa.tier||0);
    });
    if(invParts.length>0){
      const marcoNote=hasMarcoInv?'<span style="color:var(--gold);font-size:11px;margin-left:6px">🧭+10%</span>':'';
      const rarityLabel=p2=>{if(p2.rarity==='mythic')return'<span style="color:#ff88ff;font-size:11px;border:1px solid #ff88ff;border-radius:3px;padding:1px 4px;margin-left:4px">'+I18N.t('ui.mythicBadge')+'</span>';if(p2.rarity==='set')return'<span style="color:var(--gold);font-size:11px;border:1px solid var(--gold);border-radius:3px;padding:1px 4px;margin-left:4px">'+I18N.t('ui.setBadge')+'</span>';return'';};
      const rows=invParts.map(i=>{
        const p2=_findInvP(i.id);if(!p2)return'';
        const marcoM=hasMarcoInv?1.10:1.0;
        const baseP=p2.price>0?p2.price:200000;
        const sv=Math.floor(Math.floor(baseP*0.5)*marcoM);
        const catEmoji={weapon:'⚔️',shield:'🛡️',armor:'🛡',engine:'⚡',cargo_ext:'📦'}[p2.cat]||'⚙️';
        const catCol={weapon:'var(--red)',shield:'var(--blue)',armor:'var(--gold)',engine:'var(--cyan)',cargo_ext:'#66ff99'}[p2.cat]||'var(--dim)';
        const nmCol=p2.rarity==='mythic'?'#ff88ff':p2.rarity==='set'?'#c080ff':p2.tier>=15?'var(--gold)':p2.tier>=11?'#ffa040':p2.tier>=6?'var(--cyan)':'var(--txt)';
        const bdrCol=p2.rarity==='mythic'?'rgba(255,136,255,.5)':p2.rarity==='set'?'rgba(192,128,255,.5)':'var(--bdr)';
        const rarBadge=p2.rarity==='mythic'?`<span style="font-size:10px;color:#ff88ff;border:1px solid #ff88ff;border-radius:3px;padding:0 4px">${I18N.t('ui.mythicBadge')}</span>`:p2.rarity==='set'?`<span style="font-size:10px;color:#c080ff;border:1px solid #c080ff;border-radius:3px;padding:0 4px">${I18N.t('ui.setBadge')}</span>`:'';
        const statLine=p2.cat==='weapon'?`⚔ ATT +${p2.ATT}${p2.wtype?' ['+p2.wtype+']':''}`:p2.cat==='shield'?`🛡 SHD +${p2.INT} SH+${p2.maxSH}`:p2.cat==='armor'?`❤ HP +${p2.HP}${p2.DEF?' DEF+'+p2.DEF:''}`:p2.cat==='engine'?`⚙ ENG +${p2.TEC}`:p2.cat==='cargo_ext'?`📦 +${p2.cargoBonus} ${I18N.t('ui.cargoSlotUnit')||'화물칸'}`:'';
        const btnId='sell-inv-'+i.id;
        return `<div style="background:var(--card);border:1px solid ${bdrCol};border-radius:10px;padding:10px;display:flex;flex-direction:row;gap:8px;align-items:stretch">
          <div style="flex:1;display:flex;flex-direction:column;gap:5px;min-width:0">
            <div style="display:flex;align-items:flex-start;gap:4px;flex-wrap:wrap">
              <span style="font-size:12px;font-weight:bold;color:${nmCol};line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:break-all;flex:1;min-width:0">${partDisplayNm(p2)}</span>${rarBadge}
            </div>
            <div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap">
              <span style="font-size:10px;color:${catCol};border:1px solid ${catCol};border-radius:3px;padding:0 4px">T${p2.tier}</span>
              <span style="color:var(--dim);font-size:10px">${I18N.t('ui.heldQtyTimes',{n:i.qty})}</span>
            </div>
            <div style="font-size:11px;color:${catCol};font-weight:bold">${statLine}</div>
            <div style="font-size:10px;color:var(--dim);line-height:1.4;flex:1">${p2.desc.slice(0,60)}${p2.desc.length>60?'…':''}</div>
            <div style="padding-top:6px;border-top:1px solid rgba(255,255,255,.06);display:flex;align-items:center;gap:6px;flex-wrap:wrap">
              <span style="color:var(--gold);font-size:14px;font-weight:bold">₡${sv.toLocaleString()}</span>
              <button class="btn btn-sm btn-gold" style="font-size:11px;padding:4px 10px;margin-left:auto" id="${btnId}" onclick="sellPartFromInventory('${i.id}')">${I18N.t('ui.partSell')}</button>
            </div>
          </div>
          <div style="flex-shrink:0;display:flex;align-items:center;justify-content:center">
            ${imgOrEmoji('img/parts/'+p2.id+'.png',catEmoji,120,120,'border-radius:8px;background:rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.08)','part_'+p2.id)}
          </div>
        </div>`;
      }).join('');
      // 일괄 매각 가능 총액 미리 계산 (전설/신화/세트 제외 — 일반/희귀/영웅만)
      const _bulkSellable=invParts.filter(i=>{const p=PARTS.find(x=>x.id===i.id);return p&&!['legend','mythic','set','hero'].includes(p.rarity);});
      const _bulkTotal=_bulkSellable.reduce((s,i)=>{const p=PARTS.find(x=>x.id===i.id);if(!p)return s;const v=Math.floor((p.price||0)*0.5*(hasMarcoInv?1.1:1));return s+v*i.qty;},0);
      const _bulkQty=_bulkSellable.reduce((s,i)=>s+i.qty,0);
      // 보유 파츠 정렬 버튼
      const _invSortBtn=(key,lbl)=>{const act=_invPartSort===key;return `<button onclick="_invPartSort='${key}';rerenderShipOrGarage()" style="padding:3px 8px;border:1px solid ${act?'var(--cyan)':'var(--bdr)'};background:${act?'rgba(0,243,255,.12)':'transparent'};color:${act?'var(--cyan)':'var(--dim)'};border-radius:4px;cursor:pointer;font-size:10px;font-family:inherit">${lbl}${act?' ✓':''}</button>`;};
      const _invSortBar=`<div style="display:flex;align-items:center;gap:4px;margin-bottom:8px;flex-shrink:0;flex-wrap:wrap;padding:5px 8px;background:rgba(0,0,0,.25);border-radius:6px">
        <span style="font-size:10px;color:var(--dim);font-weight:bold">🔃</span>
        ${_invSortBtn('rarity',I18N.t('inv.sortRarity'))}
        ${_invSortBtn('tier',I18N.t('inv.sortTier'))}
        ${_invSortBtn('priceAsc',I18N.t('inv.sortPriceAsc'))}
        ${_invSortBtn('priceDesc',I18N.t('inv.sortPriceDesc'))}
        ${_invSortBtn('nm',I18N.t('ui.sortByName'))}
      </div>`;
      invPartsSection=`<div style="background:rgba(0,243,255,.04);border:1px solid rgba(0,243,255,.2);border-radius:8px;padding:10px 12px;height:100%;display:flex;flex-direction:column;min-height:0">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;flex-shrink:0;flex-wrap:wrap">
          <span style="font-size:13px;font-weight:bold;color:var(--cyan)">${I18N.t('ui.myPartsHeader')}${marcoNote}</span>
          ${_bulkQty>0?`<button class="btn btn-sm btn-gold" style="font-size:11px;padding:3px 10px;margin-left:auto" onclick="sellAllPartsBulk()" title="${I18N.t('ui.bulkSellTitle')}">${I18N.t('ui.bulkSellBtn',{n:_bulkQty,cr:_bulkTotal.toLocaleString()})}</button>`:''}
        </div>
        ${_invSortBar}
        <div style="flex:1;overflow-y:auto;display:grid;grid-template-columns:repeat(2,1fr);gap:8px;align-content:start;scrollbar-width:thin;scrollbar-color:rgba(0,243,255,.2) transparent">${rows}</div>
      </div>`;
    } else {
      invPartsSection=`<div style="background:rgba(0,243,255,.04);border:1px solid rgba(0,243,255,.2);border-radius:8px;padding:10px 12px;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--dim);font-size:12px">${I18N.t('ui.noPartsOwned')}</div>`;
    }
  }

  // 파츠 탭 (거래소 모드): 좌(나의 파츠) / 우(거래소 파츠) 2분할
  let mainHTML;
  if(_shipTab==='parts'&&!G._garageMode){
    mainHTML=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:start">
      <div>${invPartsSection||`<div style="background:rgba(0,243,255,.04);border:1px solid rgba(0,243,255,.2);border-radius:8px;padding:14px;color:var(--dim);font-size:12px;text-align:center">${I18N.t('ui.noPartsOwned')}</div>`}</div>
      <div>
        <div style="font-size:13px;font-weight:bold;color:var(--gold);margin-bottom:8px">${I18N.t('ui.shopPartsHeader')}</div>
        ${content}
      </div>
    </div>`;
  } else {
    mainHTML=content+(G._garageMode?'':invPartsSection);
  }
  body.innerHTML=`<div class="hub-scroll">
    ${G._garageMode?hubBanner('garage','🔧',I18N.t('ui.shipMaintenance'),pd?.f):hubBanner('ship','🛸',I18N.t('hub.bannerShipTrade'),pd?.f)}
    <div class="hub-t">${G._garageMode?I18N.t('hub.shipGarageT'):I18N.t('hub.shipTradeT')} — ${pd?.nm||''}</div>
    ${subNav}
    ${G._garageMode?`<div style="display:flex;gap:10px;align-items:flex-start">${window._garageSideNav('parts')}<div style="display:flex;flex-direction:column;gap:5px;flex-shrink:0;width:132px">${autoArrangeCol}</div><div style="flex:1;min-width:0">${mainHTML}</div></div>`:mainHTML}
  </div>`;
}

window.renderShipTab=renderShipTab;
console.log('[render-ship-tab] Loaded — renderShipTab exposed');
})();
