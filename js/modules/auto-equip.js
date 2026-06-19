// ═══════════════════════════════════════════════════════════════════
// DESTINATION EARTH — 자동 파츠 장착 모듈 (Phase A2)
//   · game.js 에서 분할 (2026-06-10, 사용자 요청: 긴 파일 분할)
//   · 자동 배치 (파츠 × 기함중심/평균배분) 전체 클러스터
//
// 공개 함수 (window.* 노출):
//   · autoEquipPartsFlagship()  — HTML onclick (정비소 탭 "기함 중심" 버튼)
//   · autoEquipPartsEven()      — HTML onclick (정비소 탭 "균등 분배" 버튼)
//   · _pickQuestMythicPart()    — 퀘 보상 신화 파츠 선정 (game.js 의 보상 분배에서 사용)
//   · _smartAutoEquip*          — 4개 변형 (V2, EvenV3, base, Even)
//   · _collectAllPartsToPool    — 풀 수집 헬퍼 (다른 모듈에서도 잠재적 참조 가능)
//
// 의존 글로벌 (window.*):
//   · G, PARTS, SHIP_CATALOG, SPECIAL_CARGO_PARTS, WARP_ENGINE_IDS, CARGO_EXT_MAX
//   · I18N, notify, baekgu, saveGame, rerenderTab, renderShipTab
//   · shipDisplayNm, getShipPartsGridRows, attachPartSilent
// ═══════════════════════════════════════════════════════════════════
(function(){
if(typeof window==='undefined')return;
if(window._AUTO_EQUIP_LOADED)return;
window._AUTO_EQUIP_LOADED=true;

// ── 자동 배치 (파츠/크루 × 기함중심/평균배분) ───────────────────────
// 공통: 모든 함선에서 파츠/크루를 회수해 풀로 모음
function _collectAllPartsToPool(){
  if(!G.inventory)G.inventory=[];
  G.fleet.forEach(s=>{
    if(!s.parts)return;
    s.parts.forEach(pid=>addToInventory(pid));
    s.parts=[];
    // HP/SH 보정 (스탯 변화 반영) — undefined 방지 폴백
    const st=getShipStats(s);
    s.hp=Math.min(s.hp||0,st.HP);
    s.sh=Math.min(s.sh||0,st.maxSH);
  });
}
function _collectAllCrewToPool(){
  G.fleet.forEach(s=>{ s.crewIds=[]; });
}
// 강한 순으로 파츠 정렬 (티어→희귀도→스탯)
function _sortedPartsByPower(){
  const inv=(G.inventory||[]).filter(i=>i.qty>0&&PARTS.find(p=>p.id===i.id));
  // 인벤토리 풀에서 개별 단위로 펼치기 (qty개씩)
  const flat=[];
  inv.forEach(i=>{
    const p=PARTS.find(x=>x.id===i.id);if(!p)return;
    for(let k=0;k<i.qty;k++)flat.push(p);
  });
  // 등급(rarity)/티어 우선 정렬
  const rarPri={mythic:0,set:1,L:2,H:3,R:4,N:5};
  flat.sort((a,b)=>{
    const ra=rarPri[a.rarity]??(a.tier>=15?0:a.tier>=11?2:a.tier>=6?3:5);
    const rb=rarPri[b.rarity]??(b.tier>=15?0:b.tier>=11?2:b.tier>=6?3:5);
    if(ra!==rb)return ra-rb;
    if(a.tier!==b.tier)return (b.tier||0)-(a.tier||0);
    return ((b.ATT||0)+(b.HP||0)+(b.INT||0)+(b.TEC||0))-((a.ATT||0)+(a.HP||0)+(a.INT||0)+(a.TEC||0));
  });
  return flat;
}
function _sortedCrewByPower(){
  const all=[...(G.crew||[]),...(G.heroes||[]).map(hid=>Object.assign({},HEROES[hid],{id:hid,rarity:'S',isHero:true}))];
  const rarPri={S:0,L:1,H:2,R:3,N:4};
  all.sort((a,b)=>(rarPri[a.rarity]??5)-(rarPri[b.rarity]??5));
  return all;
}
// 함선이 받을 수 있는 파츠 슬롯 총수 — UI 그리드와 동일하게 (rows × cols) 계산
// ※ partsRowsExtra(확장 행) 자동 포함
function _shipPartCap(s){
  if(!s)return 4;
  const rows=(typeof getShipPartsGridRows==='function')?getShipPartsGridRows(s):2;
  const cols=(typeof getShipPartsGridCols==='function')?getShipPartsGridCols(s):2;  // 확장 열 포함
  return Math.max(1,rows*cols);
}
function _shipCrewCap(s){return getMaxCrew(s);}

// ── 스마트 자동 배치 알고리즘 ─────────────────────────────────────
//   1단계: 세트(set) 파츠는 같은 함선에 묶어서 배치 (세트 효과 활성)
//   2단계: 워프 엔진(E15/ME01/SE01)은 함선당 1개씩만 부여
//   3단계: 각 함선에 카테고리별(레이저/미사일/실드/장갑/엔진) 최강 1개씩 부여
//   4단계: 나머지 파츠를 기함 중심 또는 평균 배분
function _smartAutoEquip(flagshipPriority){
  if(!G.fleet.length){notify(I18N.t('notify.noShip'),'err');return;}
  _collectAllPartsToPool();
  // 파츠 분류 함수 (수리 로봇은 별도 카테고리로 분리)
  function classify(p){
    if(WARP_ENGINE_IDS.includes(p.id))return 'warp';
    if(p.cat==='weapon')return p.wtype==='missile'?'missile':'laser';
    // 수리 드론(repairRate 보유 armor)은 별도 'repair' 카테고리
    if(p.cat==='armor'&&typeof p.repairRate==='number'&&p.repairRate>0)return 'repair';
    return p.cat;
  }
  // 강한 순 정렬
  const rarPri={mythic:0,set:1,legend:2,L:2,hero:3,H:3,R:4,N:5};
  const sortByPower=arr=>arr.sort((a,b)=>{
    const ra=rarPri[a.rarity]??(a.tier>=15?2:a.tier>=11?3:a.tier>=6?4:5);
    const rb=rarPri[b.rarity]??(b.tier>=15?2:b.tier>=11?3:b.tier>=6?4:5);
    if(ra!==rb)return ra-rb;
    if(a.tier!==b.tier)return (b.tier||0)-(a.tier||0);
    return ((b.ATT||0)+(b.HP||0)+(b.INT||0)+(b.TEC||0))-((a.ATT||0)+(a.HP||0)+(a.INT||0)+(a.TEC||0));
  });
  // 인벤토리 펼치기
  const flat=[];
  (G.inventory||[]).forEach(i=>{
    const p=PARTS.find(x=>x.id===i.id);if(!p||i.qty<=0)return;
    for(let k=0;k<i.qty;k++)flat.push(p);
  });
  // 카테고리별 풀 (수리 드론 별도)
  const pools={laser:[],missile:[],shield:[],armor:[],engine:[],warp:[],repair:[]};
  flat.forEach(p=>{const cat=classify(p);if(pools[cat])pools[cat].push(p);});
  Object.keys(pools).forEach(k=>sortByPower(pools[k]));
  // 세트 그룹화 (setId별)
  const setGroups={};
  flat.forEach(p=>{
    if(p.rarity==='set'&&p.setId){
      if(!setGroups[p.setId])setGroups[p.setId]=[];
      setGroups[p.setId].push(p);
    }
  });
  // 함선 정렬 (기함 우선이면 0부터, 아니면 그대로)
  const shipOrder=G.fleet.map((_,i)=>i);
  // 파츠 ID를 카테고리별 풀에서 제거하는 헬퍼
  function _removeFromPool(partId){
    for(const k in pools){
      const idx=pools[k].findIndex(x=>x.id===partId);
      if(idx>=0){pools[k].splice(idx,1);return;}
    }
  }
  // 1️⃣ 세트 파츠 그룹 함선 배정 (한 세트 = 한 함선)
  let _setAssigned=0;
  Object.keys(setGroups).forEach(setId=>{
    const setParts=setGroups[setId];
    if(setParts.length===0)return;
    // 적합한 함선 찾기 (슬롯 충분, 기함 우선)
    let targetSi=-1;
    for(const si of shipOrder){
      const s=G.fleet[si];const cap=_shipPartCap(s);const used=(s.parts?.length||0);
      if(cap-used>=setParts.length){targetSi=si;break;}
    }
    if(targetSi>=0){
      setParts.forEach(p=>{
        const inv=G.inventory.find(i=>i.id===p.id&&i.qty>0);
        if(inv){attachPartSilent(targetSi,p.id);_removeFromPool(p.id);_setAssigned++;}
      });
    }
  });
  // 2️⃣ 워프 엔진 분배 (함선당 1개)
  let _warpAssigned=0;
  for(const si of shipOrder){
    if(pools.warp.length===0)break;
    const s=G.fleet[si];const cap=_shipPartCap(s);
    if((s.parts?.length||0)>=cap)continue;
    const hasWarp=(s.parts||[]).some(pid=>WARP_ENGINE_IDS.includes(pid));
    if(hasWarp)continue;
    const wp=pools.warp.shift();
    const inv=G.inventory.find(i=>i.id===wp.id&&i.qty>0);
    if(inv){attachPartSilent(si,wp.id);_warpAssigned++;}
  }
  // 남은 워프 엔진은 일반 엔진 풀로 흡수
  if(pools.warp.length>0){pools.engine.push(...pools.warp);pools.warp=[];sortByPower(pools.engine);}
  // 3️⃣ 6가지 핵심 카테고리: 각 함선에 최강 1개씩 부여
  //    레이저 / 미사일 / 실드 / 장갑 / 엔진 / 수리드론
  const categories=['laser','missile','shield','armor','engine','repair'];
  let _coreAssigned=0;
  for(const cat of categories){
    for(const si of shipOrder){
      if(pools[cat].length===0)break;
      const s=G.fleet[si];const cap=_shipPartCap(s);
      if((s.parts?.length||0)>=cap)continue;
      // 이미 이 카테고리 파츠 보유 시 스킵
      const hasCat=(s.parts||[]).some(pid=>{
        const p=partById(pid);
        return p&&classify(p)===cat;
      });
      if(hasCat)continue;
      const part=pools[cat].shift();
      const inv=G.inventory.find(i=>i.id===part.id&&i.qty>0);
      if(inv){attachPartSilent(si,part.id);_coreAssigned++;}
    }
  }
  // 4️⃣ 나머지 모든 파츠를 모아 빈 슬롯 빈틈없이 채움
  //    (수리 로봇 잔여 + 일반 파츠 잔여 합산, 성능 순 정렬)
  const remaining=[
    ...pools.laser,...pools.missile,...pools.shield,
    ...pools.armor,...pools.engine,...pools.repair
  ];
  sortByPower(remaining);
  let _extraAssigned=0;

  // 빈 슬롯 합산 = 전체 함선의 잔여 capacity
  const _totalFreeSlots=()=>shipOrder.reduce((s,si)=>{
    const sh=G.fleet[si];return s+Math.max(0,_shipPartCap(sh)-(sh.parts?.length||0));
  },0);

  if(flagshipPriority){
    // 기함부터 가득 채우기 — 성능 우선 순서로 모든 슬롯 메움
    let pi=0;
    for(const si of shipOrder){
      if(pi>=remaining.length)break;
      const s=G.fleet[si];const cap=_shipPartCap(s);
      while((s.parts?.length||0)<cap&&pi<remaining.length){
        const p=remaining[pi];
        const inv=G.inventory.find(i=>i.id===p.id&&i.qty>0);
        if(inv){attachPartSilent(si,p.id);_extraAssigned++;}
        pi++;
      }
    }
  } else {
    // 라운드 로빈
    let pi=0;
    while(pi<remaining.length){
      let placed=false;
      for(const si of shipOrder){
        if(pi>=remaining.length)break;
        const s=G.fleet[si];const cap=_shipPartCap(s);
        if((s.parts?.length||0)<cap){
          const p=remaining[pi];
          const inv=G.inventory.find(i=>i.id===p.id&&i.qty>0);
          if(inv){attachPartSilent(si,p.id);_extraAssigned++;}
          pi++;placed=true;
        }
      }
      if(!placed)break;
    }
  }

  // 5️⃣ 마지막 빈틈 메움 — 인벤토리에 남은 어떤 파츠든 빈 슬롯에 자동 투입
  //    (강한 파츠가 부족할 때 약한 파츠라도 채워서 빈 슬롯 최소화)
  let _fillerAssigned=0;
  if(_totalFreeSlots()>0){
    // 인벤토리에서 남은 모든 파츠 모음 (성능 순으로)
    const flatLeft=[];
    (G.inventory||[]).forEach(i=>{
      const pp=PARTS.find(x=>x.id===i.id);if(!pp||i.qty<=0)return;
      for(let k=0;k<i.qty;k++)flatLeft.push(pp);
    });
    sortByPower(flatLeft);
    if(flagshipPriority){
      let pi=0;
      for(const si of shipOrder){
        if(pi>=flatLeft.length)break;
        const s=G.fleet[si];const cap=_shipPartCap(s);
        while((s.parts?.length||0)<cap&&pi<flatLeft.length){
          const p=flatLeft[pi];
          const inv=G.inventory.find(i=>i.id===p.id&&i.qty>0);
          if(inv){attachPartSilent(si,p.id);_fillerAssigned++;}
          pi++;
        }
      }
    } else {
      let pi=0;
      while(pi<flatLeft.length){
        let placed=false;
        for(const si of shipOrder){
          if(pi>=flatLeft.length)break;
          const s=G.fleet[si];const cap=_shipPartCap(s);
          if((s.parts?.length||0)<cap){
            const p=flatLeft[pi];
            const inv=G.inventory.find(i=>i.id===p.id&&i.qty>0);
            if(inv){attachPartSilent(si,p.id);_fillerAssigned++;}
            pi++;placed=true;
          }
        }
        if(!placed)break;
      }
    }
  }

  return {set:_setAssigned,warp:_warpAssigned,core:_coreAssigned,extra:_extraAssigned+_fillerAssigned};
}

// ─── 창고 확장 아이템 균등 분배 (사용자 요청) ─────────────────────────
//   ① 모든 함선에 1개씩 균등 부여 (인덱스 0=기함부터)
//   ② 잔여분은 기함부터 차례로 추가 분배 (라운드 로빈, 인덱스 0→N)
//   각 함선 최대 CARGO_EXT_MAX(4)개. cargoBonus 만큼 cargoSlots 자동 증가.
function _distributeCargoExtParts(){
  if(!G||!G.fleet||!G.fleet.length)return 0;
  if(!G.inventory)G.inventory=[];
  if(typeof SPECIAL_CARGO_PARTS==='undefined')return 0;
  const _CARGO_EXT_MAX=(typeof CARGO_EXT_MAX!=='undefined')?CARGO_EXT_MAX:6;
  function _firstCargoInv(){
    return (G.inventory||[]).find(i=>i.qty>0&&SPECIAL_CARGO_PARTS.find(c=>c.id===i.id));
  }
  function _attachOne(s){
    if(!s.cargoExtParts)s.cargoExtParts=[];
    if(s.cargoExtParts.length>=_CARGO_EXT_MAX)return false;
    const inv=_firstCargoInv();
    if(!inv)return false;
    const sc=SPECIAL_CARGO_PARTS.find(c=>c.id===inv.id);
    inv.qty--; if(inv.qty<=0)G.inventory=G.inventory.filter(i=>i!==inv);
    s.cargoExtParts.push(inv.id);
    s.cargoSlots=clampCargoSlots(s.cargoSlots,sc?sc.cargoBonus:0);
    return true;
  }
  // ⓪ 기존 장착 창고 파츠 전량 회수 → 인벤토리 풀링 (균등 재분배 위해)
  //    (회수하지 않으면 이미 불균등하게 장착된 창고 파츠가 재분배되지 않음)
  if(typeof _detachAllCargoExt==='function'){
    for(const s of G.fleet){try{_detachAllCargoExt(s);}catch(_e){}}
  }
  let added=0;
  // ① 1차: 함선마다 1개씩 (인덱스 0=기함부터)
  for(const s of G.fleet){if(_attachOne(s))added++;}
  // ② 2차: 남은 인벤토리를 기함부터 차례로 추가 분배 (라운드 로빈)
  for(let round=0;round<50;round++){
    if(!_firstCargoInv())break;
    let placed=false;
    for(let si=0;si<G.fleet.length;si++){
      if(_attachOne(G.fleet[si])){added++;placed=true;}
    }
    if(!placed)break;
  }
  return added;
}
// ─── STEP 13: 최종 강제 분배 — 모든 함선에 1개씩, 남으면 최대 5회까지 반복 (사용자 요청) ───
//   • 함선당 동일 partId 중복 여부 무관 (캡 무시)
//   • 매 패스: 기함(0)부터 끝(n-1) 까지 각 함선에 1개씩 부여
//   • 인벤토리에 잔여가 있으면 같은 순서로 반복 (최대 5회 패스)
//   • 함선마다 인벤토리에서 가치(등급→티어→스탯) 가장 높고 슬롯에 맞는 파츠 선택
//   • 창고 확장 아이템(SPECIAL_CARGO_PARTS)은 STEP 12에서 처리되므로 제외
function _forcePushRemainingParts(){
  if(!G||!G.fleet||!G.fleet.length)return 0;
  if(!G.inventory)G.inventory=[];
  function _partArea(p){const g=getPartGridSize(p);return g.cols*g.rows;}
  function _cellsTotal(s){return getShipPartsGridRows(s)*getShipPartsGridCols(s.tier);}
  function _cellsUsed(s){let u=0;(s.parts||[]).forEach(pid=>{const p=partById(pid);if(p)u+=_partArea(p);});return u;}
  function _slotsLeft(s){return _cellsTotal(s)-_cellsUsed(s);}
  function _canFit(s,p){return _slotsLeft(s)>=_partArea(p);}
  const rarPri={mythic:0,set:1,legend:2,L:2,hero:3,H:3,R:4,N:5};
  function _isCargoExt(id){return (typeof SPECIAL_CARGO_PARTS!=='undefined'?SPECIAL_CARGO_PARTS:[]).find(c=>c.id===id);}
  function _pickInvForShip(s){
    // 가치 내림차순 정렬된 인벤토리에서 fitting 가능한 첫 파츠
    const sorted=(G.inventory||[]).filter(i=>i.qty>0&&partById(i.id)&&!_isCargoExt(i.id))
      .map(i=>({inv:i,p:partById(i.id)}))
      .sort((a,b)=>{
        const ra=rarPri[a.p.rarity]??(a.p.tier>=15?2:a.p.tier>=11?3:a.p.tier>=6?4:5);
        const rb=rarPri[b.p.rarity]??(b.p.tier>=15?2:b.p.tier>=11?3:b.p.tier>=6?4:5);
        if(ra!==rb)return ra-rb;
        if(a.p.tier!==b.p.tier)return (b.p.tier||0)-(a.p.tier||0);
        return ((b.p.ATT||0)+(b.p.HP||0)+(b.p.INT||0)+(b.p.TEC||0))-((a.p.ATT||0)+(a.p.HP||0)+(a.p.INT||0)+(a.p.TEC||0));
      });
    for(const item of sorted){
      if(_canFit(s,item.p))return item.p.id;
    }
    return null;
  }
  let added=0;
  // 최대 5회 패스: 기함부터 차례로 각 함선에 1개씩 (잔여 인벤토리 소진까지 / 함선 슬롯 만석까지)
  for(let pass=0;pass<5;pass++){
    let placedAny=false;
    for(let si=0;si<G.fleet.length;si++){
      const s=G.fleet[si];
      const pid=_pickInvForShip(s);
      if(!pid)continue;
      attachPartSilent(si,pid);
      added++;placedAny=true;
    }
    if(!placedAny)break;  // 이번 패스에서 한 척도 못 받았으면 (슬롯 만석 or 인벤토리 비음) 조기 종료
  }
  return added;
}
// ─── STEP 9 (최종): 함선당 동일 partId 1개로 강제 ─────────────────────
//   ① 각 함선에서 동일 partId 중복분(2개째부터) → 인벤토리 반환
//   ② 회수된 파츠를 해당 partId 미보유 함선의 빈 슬롯에 재배분 (least-filled 우선)
function _finalizeUniqueParts(){
  if(!G||!G.fleet||!G.fleet.length)return{removed:0,redistributed:0};
  if(!G.inventory)G.inventory=[];
  function _partArea(p){const g=getPartGridSize(p);return g.cols*g.rows;}
  function _cellsTotal(s){return getShipPartsGridRows(s)*getShipPartsGridCols(s.tier);}
  function _cellsUsed(s){let u=0;(s.parts||[]).forEach(pid=>{const p=partById(pid);if(p)u+=_partArea(p);});return u;}
  function _slotsLeft(s){return _cellsTotal(s)-_cellsUsed(s);}
  function _canFit(s,p){return _slotsLeft(s)>=_partArea(p);}
  function _hasPartId(s,id){return (s.parts||[]).includes(id);}
  // ① 중복분 회수
  let removed=0;
  G.fleet.forEach(s=>{
    if(!s.parts)return;
    const seen=new Set();const keep=[];
    s.parts.forEach(pid=>{if(seen.has(pid)){addToInventory(pid);removed++;}else{seen.add(pid);keep.push(pid);}});
    s.parts=keep;
    const st=getShipStats(s);
    s.hp=Math.min(s.hp||0,st.HP);
    s.sh=Math.min(s.sh||0,st.maxSH);
  });
  // ② 미보유 함선에 재배분 — least-filled 우선, cap=1 (해당 partId 미보유 함선만)
  let redistributed=0;
  for(let round=0;round<50;round++){
    let placed=false;
    const order=G.fleet.map((_,i)=>i).sort((a,b)=>_cellsUsed(G.fleet[a])-_cellsUsed(G.fleet[b])||a-b);
    for(const si of order){
      const s=G.fleet[si];
      if(_slotsLeft(s)<=0)continue;
      let pickedId=null;
      // 인벤토리에서 이 함선이 보유하지 않은 첫 fitting 파츠
      for(const inv of (G.inventory||[])){
        if(inv.qty<=0)continue;
        const p=partById(inv.id);
        if(!p)continue;
        if(_hasPartId(s,p.id))continue;
        if(!_canFit(s,p))continue;
        pickedId=p.id;break;
      }
      if(!pickedId)continue;
      attachPartSilent(si,pickedId);
      redistributed++;placed=true;
    }
    if(!placed)break;
  }
  return{removed,redistributed};
}
// ─── STEP 10: 평균배분 추가 보충 ─────────────────────────────────────────
//   가장 적은(셀 사용량 최소) 함선부터 1개씩 추가 분배.
//   해당 partId를 이미 보유한 함선엔 분배하지 않음 (no duplicates per ship).
//   인벤토리 정렬: 등급(mythic>set>L>H>R>N) → 티어(↓) → 합산 스탯(↓) — 가치 큰 파츠 우선.
function _redistributeLeastFilledByValue(){
  if(!G||!G.fleet||!G.fleet.length)return 0;
  if(!G.inventory)G.inventory=[];
  function _partArea(p){const g=getPartGridSize(p);return g.cols*g.rows;}
  function _cellsTotal(s){return getShipPartsGridRows(s)*getShipPartsGridCols(s.tier);}
  function _cellsUsed(s){let u=0;(s.parts||[]).forEach(pid=>{const p=partById(pid);if(p)u+=_partArea(p);});return u;}
  function _slotsLeft(s){return _cellsTotal(s)-_cellsUsed(s);}
  function _canFit(s,p){return _slotsLeft(s)>=_partArea(p);}
  function _hasPartId(s,id){return (s.parts||[]).includes(id);}
  const rarPri={mythic:0,set:1,legend:2,L:2,hero:3,H:3,R:4,N:5};
  function _valueSort(a,b){
    const ra=rarPri[a.p.rarity]??(a.p.tier>=15?2:a.p.tier>=11?3:a.p.tier>=6?4:5);
    const rb=rarPri[b.p.rarity]??(b.p.tier>=15?2:b.p.tier>=11?3:b.p.tier>=6?4:5);
    if(ra!==rb)return ra-rb;
    if(a.p.tier!==b.p.tier)return (b.p.tier||0)-(a.p.tier||0);
    return ((b.p.ATT||0)+(b.p.HP||0)+(b.p.INT||0)+(b.p.TEC||0))-((a.p.ATT||0)+(a.p.HP||0)+(a.p.INT||0)+(a.p.TEC||0));
  }
  let added=0;
  for(let round=0;round<50;round++){
    let placed=false;
    // 가치 내림차순 인벤토리 목록
    const sorted=(G.inventory||[]).filter(i=>i.qty>0).map(i=>{const p=partById(i.id);return p?{p,id:i.id}:null;}).filter(Boolean).sort(_valueSort);
    if(sorted.length===0)break;
    // 함선: 셀 사용량 최소부터
    const order=G.fleet.map((_,i)=>i).sort((a,b)=>_cellsUsed(G.fleet[a])-_cellsUsed(G.fleet[b])||a-b);
    for(const si of order){
      const s=G.fleet[si];
      if(_slotsLeft(s)<=0)continue;
      let pickedId=null;
      for(const item of sorted){
        const inv=G.inventory.find(i=>i.id===item.id&&i.qty>0);
        if(!inv)continue;
        if(_hasPartId(s,item.p.id))continue;
        if(!_canFit(s,item.p))continue;
        pickedId=item.p.id;break;
      }
      if(!pickedId)continue;
      attachPartSilent(si,pickedId);
      added++;placed=true;
    }
    if(!placed)break;
  }
  return added;
}
// ═══════════════════════════════════════════════════════════════════
// 파츠 기함중심 자동배치 (사용자 지정 알고리즘 2026-06-15)
//   1) 기함을 모든 파츠 타입(실드·장갑·엔진·레이저·미사일) + 창고로 완전 충전
//   2) 나머지 함선에 전설+ 엔진 1개씩 순차 배치
//   3) 실드·엔진·레이저·미사일·장갑·엔진·창고를 모든 함선에 1개씩 고루 분배
//   4) 세트 아이템은 같은 함선에 모음 → 이후 남는 파츠를 고루 분배(같은 id 중복 금지)
//   5) 그래도 남는 파츠는 각 함선에 라운드로빈 1개씩 (id당 최대 2개)
//   ※ '평균배분(even)' 버튼은 변경 없음 — 이 함수만 해당.
// ═══════════════════════════════════════════════════════════════════
function autoEquipPartsFlagship(){
  if(!G.fleet||!G.fleet.length){notify(I18N.t('notify.noShip'),'err');return;}
  if(!G.inventory)G.inventory=[];
  // 시작: 모든 장착 파츠·창고 회수 → 인벤토리 (깨끗한 상태에서 재배치)
  _collectAllPartsToPool();
  if(typeof _detachAllCargoExt==='function'){ for(const s of G.fleet){ try{_detachAllCargoExt(s);}catch(_e){} } }

  const CARGO_MAX=(typeof CARGO_EXT_MAX!=='undefined')?CARGO_EXT_MAX:6;
  const SCARGO=(typeof SPECIAL_CARGO_PARTS!=='undefined')?SPECIAL_CARGO_PARTS:[];
  const isCargo=id=>!!SCARGO.find(c=>c.id===id);
  const classify=p=>{
    if(WARP_ENGINE_IDS.includes(p.id))return 'engine';
    if(p.cat==='weapon')return p.wtype==='missile'?'missile':'laser';
    if(p.cat==='armor'&&typeof p.repairRate==='number'&&p.repairRate>0)return 'repair';
    return p.cat; // shield / armor / engine
  };
  const area=p=>{const g=getPartGridSize(p);return g.cols*g.rows;};
  const cellsTotal=s=>getShipPartsGridRows(s)*getShipPartsGridCols(s);  // 확장 열 포함
  const cellsUsed=s=>{let u=0;(s.parts||[]).forEach(pid=>{const p=partById(pid);if(p)u+=area(p);});return u;};
  const slotsLeft=s=>cellsTotal(s)-cellsUsed(s);
  const canFit=(s,p)=>slotsLeft(s)>=area(p);
  const countId=(s,id)=>(s.parts||[]).filter(x=>x===id).length;
  const rarPri={mythic:0,set:1,legend:2,L:2,hero:3,H:3,R:4,N:5};
  const rarOf=p=>rarPri[p.rarity]??(p.tier>=15?2:p.tier>=11?3:p.tier>=6?4:5);
  const isLegPlus=p=>!!p&&(p.rarity==='legend'||p.rarity==='set'||p.rarity==='mythic'||p.tier>=15);
  // 강함 비교 (등급→tier→스탯)
  const stronger=(a,b)=>{const ra=rarOf(a),rb=rarOf(b);if(ra!==rb)return ra<rb;if((a.tier||0)!==(b.tier||0))return (a.tier||0)>(b.tier||0);return ((a.ATT||0)+(a.HP||0)+(a.INT||0)+(a.TEC||0))>((b.ATT||0)+(b.HP||0)+(b.INT||0)+(b.TEC||0));};
  // 면적 우선 비교 (테트리스 패킹 — 빈틈 채울 때)
  const biggerThenStronger=(a,b)=>{const aa=area(a),ab=area(b);if(aa!==ab)return aa>ab;return stronger(a,b);};
  const attach=(si,id)=>{const inv=G.inventory.find(i=>i.id===id&&i.qty>0);if(!inv)return false;attachPartSilent(si,id);return true;};
  // 인벤토리에서 조건에 맞는 최적 파츠 1개 선택 (비-창고)
  function bestPart(s,filter,cmp,dupCap){
    let best=null;
    for(const i of (G.inventory||[])){
      if(i.qty<=0||isCargo(i.id))continue;
      const p=PARTS.find(x=>x.id===i.id);if(!p)continue;
      if(!canFit(s,p))continue;
      if(dupCap!=null&&countId(s,p.id)>=dupCap)continue;
      if(filter&&!filter(p))continue;
      if(!best||cmp(p,best))best=p;
    }
    return best;
  }
  // 창고 1개 장착 (해당 함선 cargoExtParts ≤ CARGO_MAX)
  function attachCargoOne(s){
    if(!s.cargoExtParts)s.cargoExtParts=[];
    if(s.cargoExtParts.length>=CARGO_MAX)return false;
    const inv=(G.inventory||[]).find(i=>i.qty>0&&isCargo(i.id));if(!inv)return false;
    const sc=SCARGO.find(c=>c.id===inv.id);
    inv.qty--; if(inv.qty<=0)G.inventory=G.inventory.filter(x=>x!==inv);
    s.cargoExtParts.push(sc?sc.id:inv.id);
    s.cargoSlots=clampCargoSlots(s.cargoSlots,sc?sc.cargoBonus:0);
    return true;
  }

  const flag=G.fleet[0];
  const allShips=G.fleet.map((_,i)=>i);
  const otherShips=allShips.slice(1);
  const leastFilled=()=>allShips.slice().sort((a,b)=>cellsUsed(G.fleet[a])-cellsUsed(G.fleet[b]));
  let nParts=0,nCargo=0;

  // 세트 파츠는 STEP 0에서 묶어 먼저 배치하므로 STEP 1~3 개별 배치에서 제외 (세트 분리 방지)
  const noSet=pp=>pp.rarity!=='set';

  // ── STEP 0: 세트 아이템을 같은 함선에 묶어 배치 (기함 우선) — 기함 충전 전에 공간 확보 ──
  const setGroups={};
  for(const i of (G.inventory||[])){
    if(i.qty<=0)continue; const p=PARTS.find(x=>x.id===i.id);
    if(p&&p.rarity==='set'&&p.setId){ (setGroups[p.setId]=setGroups[p.setId]||[]).push(p); }
  }
  Object.keys(setGroups).forEach(sid=>{
    const parts=setGroups[sid]; const need=parts.reduce((a,p)=>a+area(p),0);
    // 기함(0) 우선 → 그다음 가장 적게 찬 함선 (세트는 한 함선에 모음)
    const order=[0,...leastFilled().filter(si=>si!==0)];
    let target=-1;
    for(const si of order){ if(slotsLeft(G.fleet[si])>=need){target=si;break;} }
    if(target<0)return; // 묶음이 들어갈 함선이 없으면 보류 → STEP 4 개별 폴백
    parts.forEach(p=>{ if(canFit(G.fleet[target],p)&&attach(target,p.id))nParts++; });
  });

  // ── STEP 1: 기함 완전 충전 (모든 타입 + 창고) ──
  for(const cat of ['shield','armor','engine','laser','missile','repair']){
    const p=bestPart(flag,pp=>noSet(pp)&&classify(pp)===cat,stronger,2);
    if(p&&attach(0,p.id))nParts++;
  }
  let g=0;
  while(slotsLeft(flag)>0 && g++<800){
    const p=bestPart(flag,noSet,biggerThenStronger,2); // id당 최대 2개
    if(!p||!attach(0,p.id))break; nParts++;
  }
  while(attachCargoOne(flag))nCargo++; // 기함 창고 슬롯(최대 4) 가득

  // ── STEP 2: 나머지 함선에 전설+ 엔진 1개씩 ──
  for(const si of otherShips){
    const s=G.fleet[si]; if(slotsLeft(s)<=0)continue;
    const p=bestPart(s,pp=>noSet(pp)&&classify(pp)==='engine'&&isLegPlus(pp),stronger,2);
    if(p&&attach(si,p.id))nParts++;
  }

  // ── STEP 3: 코어 6종 + 창고를 모든 함선에 1개씩 고루 (engine 2회) ──
  for(const cat of ['shield','engine','laser','missile','armor','engine']){
    for(const si of allShips){
      const s=G.fleet[si]; if(slotsLeft(s)<=0)continue;
      const p=bestPart(s,pp=>noSet(pp)&&classify(pp)===cat,stronger,2);
      if(p&&attach(si,p.id))nParts++;
    }
  }
  for(const si of allShips){ if(attachCargoOne(G.fleet[si]))nCargo++; } // 함선당 창고 1개씩

  // ── STEP 4: 남는 파츠 고루 — 같은 id 2개 이상 겹치지 않게 (id당 함선별 최대 1) ──
  //   (세트는 STEP 0에서 묶어 배치 완료; 공간이 없어 보류된 세트 파츠는 여기서 개별 폴백)
  g=0;
  while(g++<2000){
    let placed=false;
    for(const si of leastFilled()){
      const s=G.fleet[si]; if(slotsLeft(s)<=0)continue;
      const p=bestPart(s,null,biggerThenStronger,1);
      if(p&&attach(si,p.id)){nParts++;placed=true;}
    }
    if(!placed)break;
  }

  // ── STEP 5: 그래도 남으면 라운드로빈 1개씩 (id당 최대 2) ──
  g=0;
  while(g++<2000){
    let placed=false;
    for(const si of leastFilled()){
      const s=G.fleet[si]; if(slotsLeft(s)<=0)continue;
      const p=bestPart(s,null,biggerThenStronger,2);
      if(p&&attach(si,p.id)){nParts++;placed=true;}
    }
    if(!placed)break;
  }
  // 남은 창고 라운드로빈
  g=0;
  while(g++<200){ let placed=false; for(const si of allShips){ if(attachCargoOne(G.fleet[si])){nCargo++;placed=true;} } if(!placed)break; }

  notify(I18N.t('notify.autoFlagshipV2',{n:nParts,c:nCargo}),'gold');
  rerenderShipOrGarage();saveGame(true);
  try{ if(typeof window.completeTuningQuests==='function')window.completeTuningQuests(); }catch(_e){}
}
// ─── STEP 11: 2×2 파츠 균등 분배 (cap=2 허용) ─────────────────────────
//   인벤토리 잔여 2×2 파츠(mythic/set/tier≥15)를 2×2 보유 수가 가장 적은 함선부터 1개씩.
//   ⚠️ 이 단계부터는 동일 partId 중복 2개까지 허용 (cap=2). 단 3개째는 차단.
function _redistribute2x2Fair(){
  if(!G||!G.fleet||!G.fleet.length)return 0;
  if(!G.inventory)G.inventory=[];
  function _gs(p){return getPartGridSize(p);}
  function _is2x2(p){const g=_gs(p);return g.cols===2&&g.rows===2;}
  function _partArea(p){const g=_gs(p);return g.cols*g.rows;}
  function _cellsTotal(s){return getShipPartsGridRows(s)*getShipPartsGridCols(s.tier);}
  function _cellsUsed(s){let u=0;(s.parts||[]).forEach(pid=>{const p=partById(pid);if(p)u+=_partArea(p);});return u;}
  function _slotsLeft(s){return _cellsTotal(s)-_cellsUsed(s);}
  function _canFit2x2(s){return _slotsLeft(s)>=4;}
  function _count2x2(s){return (s.parts||[]).filter(pid=>{const p=partById(pid);return p&&_is2x2(p);}).length;}
  function _countPartId(s,id){return (s.parts||[]).filter(pid=>pid===id).length;}
  const rarPri={mythic:0,set:1,legend:2,L:2,hero:3,H:3,R:4,N:5};
  function _valueSort(a,b){
    const ra=rarPri[a.p.rarity]??(a.p.tier>=15?2:a.p.tier>=11?3:a.p.tier>=6?4:5);
    const rb=rarPri[b.p.rarity]??(b.p.tier>=15?2:b.p.tier>=11?3:b.p.tier>=6?4:5);
    if(ra!==rb)return ra-rb;
    if(a.p.tier!==b.p.tier)return (b.p.tier||0)-(a.p.tier||0);
    return ((b.p.ATT||0)+(b.p.HP||0)+(b.p.INT||0)+(b.p.TEC||0))-((a.p.ATT||0)+(a.p.HP||0)+(a.p.INT||0)+(a.p.TEC||0));
  }
  let added=0;
  for(let round=0;round<50;round++){
    let placed=false;
    const inv2x2=(G.inventory||[]).filter(i=>i.qty>0).map(i=>{const p=partById(i.id);return p&&_is2x2(p)?{p,id:i.id}:null;}).filter(Boolean).sort(_valueSort);
    if(inv2x2.length===0)break;
    // 함선 정렬: 2×2 보유수 적은 순 → 셀 사용량 적은 순 → 인덱스 순
    const order=G.fleet.map((_,i)=>i).sort((a,b)=>{
      const c2a=_count2x2(G.fleet[a]),c2b=_count2x2(G.fleet[b]);
      if(c2a!==c2b)return c2a-c2b;
      const ua=_cellsUsed(G.fleet[a]),ub=_cellsUsed(G.fleet[b]);
      if(ua!==ub)return ua-ub;
      return a-b;
    });
    for(const si of order){
      const s=G.fleet[si];
      if(!_canFit2x2(s))continue;
      let pickedId=null;
      for(const item of inv2x2){
        const inv=G.inventory.find(i=>i.id===item.id&&i.qty>0);
        if(!inv)continue;
        // cap=2 허용 (3개째 차단)
        if(_countPartId(s,item.p.id)>=2)continue;
        pickedId=item.p.id;break;
      }
      if(!pickedId)continue;
      attachPartSilent(si,pickedId);
      added++;placed=true;
    }
    if(!placed)break;
  }
  return added;
}
// ─── 신화 파츠 풀 weighted pick — MMB01(이휘소 방정식 미사일) +5%p ─────────
//   기본 균등(20%) → MMB01 25% / 나머지 4종 18.75%씩
//   QUEST_MYTHIC_PARTS 가 없거나 MMB01 미포함이면 균등 fallback
function _pickQuestMythicPart(){
  if(typeof QUEST_MYTHIC_PARTS==='undefined'||!QUEST_MYTHIC_PARTS||!QUEST_MYTHIC_PARTS.length)return null;
  const _hasM=QUEST_MYTHIC_PARTS.includes('MMB01');
  if(_hasM&&Math.random()<0.25)return 'MMB01';
  const _others=QUEST_MYTHIC_PARTS.filter(p=>p!=='MMB01');
  const _pool=_others.length>0?_others:QUEST_MYTHIC_PARTS;
  return _pool[Math.floor(Math.random()*_pool.length)];
}
function autoEquipPartsEven(){
  const r=_smartAutoEquipEvenV3();if(!r)return;
  // STEP 9 (최종): 함선당 동일 partId 1개 강제
  const r9=_finalizeUniqueParts();
  // STEP 10: 추가 보충 — least-filled 1개씩, 동일 partId 미보유 함선 한정 (가치 우선)
  const r10=_redistributeLeastFilledByValue();
  // STEP 11: 2×2 파츠 균등 분배 — 2×2 보유수 적은 함선부터 1개씩 (cap=2 허용)
  const r11=_redistribute2x2Fair();
  // STEP 12: 창고 확장 아이템 — 함선마다 1개씩 → 기함부터 잔여분 추가 분배
  const r12=_distributeCargoExtParts();
  // STEP 13: 최종 강제 — 인벤토리 잔여 partId 1개씩, 남으면 1번 더 (캡 무시, 사용자 요청)
  const r13=_forcePushRemainingParts();
  const _uniq=(r9.removed||r9.redistributed)?I18N.t('ui.dedupResult',{removed:r9.removed,redistributed:r9.redistributed}):'';
  const _top=r10>0?I18N.t('gacha.extraSupply',{n:r10}):'';
  const _big=r11>0?I18N.t('gacha.bigSupply',{n:r11}):'';
  const _cargo=r12>0?I18N.t('gacha.cargo',{n:r12}):'';
  const _force=r13>0?I18N.t('gacha.forceDeploy',{n:r13}):'';
  notify(I18N.t('notify.autoEvenly',{warp:r.warp,core3:r.core3,setBundle:r.setBundle,round:r.round,repair:r.repair,small:r.small,uniq:_uniq,top:_top,big:_big,cargo:_cargo,force:_force}),'gold');
  rerenderShipOrGarage();saveGame(true);
  try{ if(typeof window.completeTuningQuests==='function')window.completeTuningQuests(); }catch(_e){}
}
// ─── 평균 배분 V3 — 사용자 명세 ────────────────────────────────────────
// STEP 1: 워프엔진(블링크/타키온/테슬라 등) 각 함선 1개씩
// STEP 2: 신화/전설 무기·실드·장갑 각 함선 1개씩 (세트 제외 — 다음 단계에서 처리)
// STEP 3: 세트 아이템 → 같은 setId 부속을 한 함선에 묶음 (혹은 이미 그 세트 보유 함선)
// STEP 4: 남은 신화/전설 라운드로빈 — 첫 함선부터 끝 함선까지 1개씩,
//         더 남았다면 다른 종류로 다시 한 라운드
// STEP 5: 수리로봇/수리장갑 각 함선 1개씩
// STEP 6: 남은 작은 아이템 1개씩, 같은 함선 중복 배치 최소화
function _smartAutoEquipEvenV3(){
  if(!G.fleet||!G.fleet.length){notify(I18N.t('notify.noShip'),'err');return null;}
  _collectAllPartsToPool();
  function classify(p){
    if(WARP_ENGINE_IDS.includes(p.id))return 'warp';
    if(p.cat==='weapon')return p.wtype==='missile'?'missile':'laser';
    if(p.cat==='armor'&&typeof p.repairRate==='number'&&p.repairRate>0)return 'repair';
    return p.cat;
  }
  function partArea(p){const g=getPartGridSize(p);return g.cols*g.rows;}
  const rarPri={mythic:0,set:1,legend:2,L:2,hero:3,H:3,R:4,N:5};
  function rarOf(p){return rarPri[p.rarity]??(p.tier>=15?2:p.tier>=11?3:p.tier>=6?4:5);}
  function isMythLeg(p){return p&&(p.rarity==='mythic'||p.rarity==='legend'||p.tier>=15);}
  const sortByPower=arr=>arr.sort((a,b)=>{
    const aa=partArea(a),ab=partArea(b);
    if(aa!==ab)return ab-aa;
    const ra=rarOf(a),rb=rarOf(b);
    if(ra!==rb)return ra-rb;
    if(a.tier!==b.tier)return (b.tier||0)-(a.tier||0);
    return ((b.ATT||0)+(b.HP||0)+(b.INT||0)+(b.TEC||0))-((a.ATT||0)+(a.HP||0)+(a.INT||0)+(a.TEC||0));
  });
  const flat=[];
  (G.inventory||[]).forEach(i=>{const p=PARTS.find(x=>x.id===i.id);if(!p||i.qty<=0)return;for(let k=0;k<i.qty;k++)flat.push(p);});
  const pools={laser:[],missile:[],shield:[],armor:[],engine:[],warp:[],repair:[]};
  flat.forEach(p=>{const c=classify(p);if(pools[c])pools[c].push(p);});
  Object.keys(pools).forEach(k=>sortByPower(pools[k]));
  // 세트 그룹 — rarity:'set' & setId 보유한 파츠를 setId별로 묶음
  const setGroups={};
  flat.forEach(p=>{if(p.rarity==='set'&&p.setId){if(!setGroups[p.setId])setGroups[p.setId]=[];setGroups[p.setId].push(p);}});
  function _cellsTotal(s){return getShipPartsGridRows(s)*getShipPartsGridCols(s.tier);}
  function _cellsUsed(s){let u=0;(s.parts||[]).forEach(pid=>{const p=partById(pid);if(p)u+=partArea(p);});return u;}
  function _slotsLeft(s){return _cellsTotal(s)-_cellsUsed(s);}
  function _canFit(s,p){return _slotsLeft(s)>=partArea(p);}
  function _hasCat(s,cat){return (s.parts||[]).some(pid=>{const p=partById(pid);return p&&classify(p)===cat;});}
  function _hasPartId(s,id){return (s.parts||[]).includes(id);}
  // 규칙 7: 함선당 동일 partId 최대 2개 (3개 이상 배치 금지)
  function _countPartId(s,id){return (s.parts||[]).filter(pid=>pid===id).length;}
  function _underDupCap(s,id){return _countPartId(s,id)<2;}
  function _attach(si,partId){const inv=G.inventory.find(i=>i.id===partId&&i.qty>0);if(!inv)return false;if(!_underDupCap(G.fleet[si],partId))return false;attachPartSilent(si,partId);return true;}
  function _removeFromPool(partId){for(const k in pools){const idx=pools[k].findIndex(x=>x.id===partId);if(idx>=0){pools[k].splice(idx,1);return;}}}
  const _allShips=()=>G.fleet.map((_,i)=>i);
  function _shipsByLeastFilled(){return G.fleet.map((_,i)=>i).sort((a,b)=>{const ua=_cellsUsed(G.fleet[a]);const ub=_cellsUsed(G.fleet[b]);if(ua!==ub)return ua-ub;return a-b;});}
  function _pickFitting(arr,s){for(let i=0;i<arr.length;i++){if(_canFit(s,arr[i])&&_underDupCap(s,arr[i].id))return i;}return -1;}
  function _pickFittingMythLeg(arr,s){for(let i=0;i<arr.length;i++){if(isMythLeg(arr[i])&&_canFit(s,arr[i])&&_underDupCap(s,arr[i].id))return i;}return -1;}
  // 세트 setId가 이미 함선에 1개 이상 있는지
  function _shipHasSetId(s,setId){return (s.parts||[]).some(pid=>{const p=partById(pid);return p&&p.rarity==='set'&&p.setId===setId;});}

  let _stepWarp=0,_stepCore3=0,_stepSetBundle=0,_stepRound=0,_stepRepair=0,_stepSmall=0;

  // ═════ STEP 1: 워프엔진 — 각 함선 1개씩 (Adaptive Least-Filled — CRR welfare-first) ═════
  for(const si of _shipsByLeastFilled()){
    if(pools.warp.length===0)break;
    const s=G.fleet[si];
    if(_slotsLeft(s)<=0)continue;
    if((s.parts||[]).some(pid=>WARP_ENGINE_IDS.includes(pid)))continue;
    const idx=_pickFitting(pools.warp,s);if(idx<0)continue;
    const wp=pools.warp.splice(idx,1)[0];
    if(_attach(si,wp.id))_stepWarp++;
  }
  // 남은 워프엔진은 일반 엔진 풀로 흡수
  if(pools.warp.length>0){pools.engine.push(...pools.warp);pools.warp=[];sortByPower(pools.engine);}

  // ═════ STEP 2: 신화/전설 무기·실드·장갑 — 각 함선 1개씩 (Adaptive Least-Filled) ═════
  for(const cat of ['laser','shield','armor']){
    for(const si of _shipsByLeastFilled()){
      if(pools[cat].length===0)break;
      const s=G.fleet[si];
      if(_slotsLeft(s)<=0)continue;
      if(_hasCat(s,cat))continue;
      // 세트 제외 — 신화/전설만
      let idx=-1;
      for(let i=0;i<pools[cat].length;i++){
        const p=pools[cat][i];
        if(p.rarity==='set')continue;
        if(!isMythLeg(p))continue;
        if(_canFit(s,p)&&_underDupCap(s,p.id)){idx=i;break;}
      }
      if(idx<0)continue;
      const part=pools[cat].splice(idx,1)[0];
      if(_attach(si,part.id))_stepCore3++;
    }
  }

  // ═════ STEP 3: 세트 아이템 — 같은 setId 한 함선에 묶음 ═════
  Object.keys(setGroups).forEach(setId=>{
    const setParts=setGroups[setId].filter(p=>G.inventory.find(i=>i.id===p.id&&i.qty>0));
    if(setParts.length<2)return;
    // 이미 같은 setId 보유한 함선 우선, 없으면 빈 자리 가장 많은 함선
    let targetSi=-1;
    for(const si of _allShips()){if(_shipHasSetId(G.fleet[si],setId)){targetSi=si;break;}}
    if(targetSi<0){
      const totalArea=setParts.reduce((s,p)=>s+partArea(p),0);
      const order=_allShips().sort((a,b)=>_slotsLeft(G.fleet[b])-_slotsLeft(G.fleet[a]));
      for(const si of order){if(_slotsLeft(G.fleet[si])>=totalArea){targetSi=si;break;}}
    }
    if(targetSi<0)return;
    setParts.forEach(p=>{if(_canFit(G.fleet[targetSi],p)&&_underDupCap(G.fleet[targetSi],p.id)&&_attach(targetSi,p.id)){_removeFromPool(p.id);_stepSetBundle++;}});
  });

  // ═════ STEP 4: 남은 신화/전설 — Snake Draft (NBA/NFL 드래프트 표준, EF1 강화) ═════
  //   짝수 라운드: ship[0]→[1]→[2]→...   홀수 라운드: [n-1]→...→[0]
  //   → "1번 함선만 매 라운드 first pick" 편향 제거
  for(let round=0;round<6;round++){
    let placedThisRound=false;
    const baseOrder=_allShips();
    const snakeOrder=(round%2===0)?baseOrder:baseOrder.slice().reverse();
    for(const cat of ['engine','laser','shield','armor','missile','repair']){
      for(const si of snakeOrder){
        if(pools[cat].length===0)break;
        const s=G.fleet[si];
        if(_slotsLeft(s)<=0)continue;
        const idx=_pickFittingMythLeg(pools[cat],s);
        if(idx<0)continue;
        const part=pools[cat].splice(idx,1)[0];
        if(_attach(si,part.id)){_stepRound++;placedThisRound=true;}
      }
    }
    if(!placedThisRound)break;
  }

  // ═════ STEP 5: 수리로봇/수리장갑 — 각 함선 1개씩 (Adaptive Least-Filled) ═════
  for(const si of _shipsByLeastFilled()){
    if(pools.repair.length===0)break;
    const s=G.fleet[si];
    if(_slotsLeft(s)<=0)continue;
    if(_hasCat(s,'repair'))continue;
    const idx=_pickFitting(pools.repair,s);if(idx<0)continue;
    const part=pools.repair.splice(idx,1)[0];
    if(_attach(si,part.id))_stepRepair++;
  }

  // ═════ STEP 6: 작은 아이템 — 1개씩, 같은 partId 중복 배치 최소화 (Adaptive Least-Filled) ═════
  // 남은 모든 풀을 한 배열로 모으고, 함선마다 "아직 그 partId가 없는" 것을 우선 선택
  for(let round=0;round<50;round++){
    let placed=false;
    const remaining=[];
    ['engine','laser','shield','armor','missile','repair'].forEach(c=>{pools[c].forEach(p=>remaining.push({p,cat:c}));});
    if(remaining.length===0)break;
    remaining.sort((a,b)=>{
      const aa=partArea(a.p),bb=partArea(b.p);
      if(aa!==bb)return bb-aa;
      return rarOf(a.p)-rarOf(b.p);
    });
    for(const si of _shipsByLeastFilled()){
      const s=G.fleet[si];
      if(_slotsLeft(s)<=0)continue;
      // ① 함선에 같은 partId가 없는 것 우선 (중복 최소화) — 규칙 7 cap도 체크
      let pickedCi=-1;
      for(let ci=0;ci<remaining.length;ci++){
        if(!_canFit(s,remaining[ci].p))continue;
        if(!_underDupCap(s,remaining[ci].p.id))continue;
        if(!_hasPartId(s,remaining[ci].p.id)){pickedCi=ci;break;}
      }
      // ② 그래도 없으면 fitting + 캡 OK 첫 번째
      if(pickedCi<0){for(let ci=0;ci<remaining.length;ci++){if(_canFit(s,remaining[ci].p)&&_underDupCap(s,remaining[ci].p.id)){pickedCi=ci;break;}}}
      if(pickedCi<0)continue;
      const cand=remaining[pickedCi];
      remaining.splice(pickedCi,1);
      const pidx=pools[cand.cat].findIndex(x=>x.id===cand.p.id);
      if(pidx>=0)pools[cand.cat].splice(pidx,1);
      if(_attach(si,cand.p.id)){_stepSmall++;placed=true;}
    }
    if(!placed)break;
  }

  // ═════ STEP 7: (제약) 함선당 동일 partId 최대 2개 — _attach 가 강제 ═════
  // ═════ STEP 8: 남은 모든 장비 — 1개씩 균등 분배 (가장 적게 장착된 함선 우선) ═════
  let _stepFinal=0;
  for(let round=0;round<50;round++){
    let placed=false;
    const leftovers=[];
    ['engine','laser','shield','armor','missile','repair'].forEach(c=>{
      pools[c].forEach(p=>leftovers.push({p,cat:c}));
    });
    if(leftovers.length===0)break;
    leftovers.sort((a,b)=>{const aa=partArea(a.p),bb=partArea(b.p);if(aa!==bb)return bb-aa;return rarOf(a.p)-rarOf(b.p);});
    const order=_shipsByLeastFilled();
    for(const si of order){
      const s=G.fleet[si];
      if(_slotsLeft(s)<=0)continue;
      let pickedCi=-1;
      for(let ci=0;ci<leftovers.length;ci++){
        if(_canFit(s,leftovers[ci].p)&&_underDupCap(s,leftovers[ci].p.id)){pickedCi=ci;break;}
      }
      if(pickedCi<0)continue;
      const cand=leftovers[pickedCi];
      leftovers.splice(pickedCi,1);
      const pidx=pools[cand.cat].findIndex(x=>x.id===cand.p.id);
      if(pidx>=0)pools[cand.cat].splice(pidx,1);
      if(_attach(si,cand.p.id)){_stepFinal++;placed=true;}
    }
    if(!placed)break;
  }

  return{warp:_stepWarp,core3:_stepCore3,setBundle:_stepSetBundle,round:_stepRound,repair:_stepRepair,small:_stepSmall+_stepFinal};
}

// ─────────────────────────────────────────────────────────────────
// 통합 자동 배치 V4 — 사용자 요청 사양 (양 모드 공용)
// 1️⃣ 블링크엔진+ (워프 E15/ME01/SE01) 모든 함선에 1개씩 균등 분배
// 2️⃣ 세트 파츠 묶음 — 한 함선에 모음 (세트 보너스 활성)
// 3️⃣ 신화/전설 등급 레이저·실드·장갑 — 모든 함선에 1개씩 (라운드 1)
// 4️⃣ 추가 라운드: 신화/전설 엔진·레이저·실드·장갑 + 수리드론·미사일 각 1개씩
// 5️⃣ 2x2 빈자리에 잔여 신화/전설 파츠, 그 외 작은 빈틈에 하위 등급 파츠, 마지막은 미사일
// 모드:
//   • flagship: 기함부터 우선 → 나머지 함대 순서대로
//   • even: 매 단계 가장 적게 장착된 함선 우선
// ─────────────────────────────────────────────────────────────────
function _smartAutoEquipV2(mode){
  if(!G.fleet||!G.fleet.length){notify(I18N.t('notify.noShip'),'err');return;}
  _collectAllPartsToPool();

  function classify(p){
    if(WARP_ENGINE_IDS.includes(p.id))return 'warp';
    if(p.cat==='weapon')return p.wtype==='missile'?'missile':'laser';
    if(p.cat==='armor'&&typeof p.repairRate==='number'&&p.repairRate>0)return 'repair';
    return p.cat;
  }
  function partArea(p){const g=getPartGridSize(p);return g.cols*g.rows;}
  const rarPri={mythic:0,set:1,legend:2,L:2,hero:3,H:3,R:4,N:5};
  function rarOf(p){return rarPri[p.rarity]??(p.tier>=15?2:p.tier>=11?3:p.tier>=6?4:5);}
  const sortByPower=arr=>arr.sort((a,b)=>{
    // 1) 면적 큰 순 (테트리스 효율)  2) 등급 높은 순  3) tier  4) 합산 스탯
    const aa=partArea(a),ab=partArea(b);
    if(aa!==ab)return ab-aa;
    const ra=rarOf(a),rb=rarOf(b);
    if(ra!==rb)return ra-rb;
    if(a.tier!==b.tier)return (b.tier||0)-(a.tier||0);
    return ((b.ATT||0)+(b.HP||0)+(b.INT||0)+(b.TEC||0))-((a.ATT||0)+(a.HP||0)+(a.INT||0)+(a.TEC||0));
  });

  const flat=[];
  (G.inventory||[]).forEach(i=>{
    const p=PARTS.find(x=>x.id===i.id);if(!p||i.qty<=0)return;
    for(let k=0;k<i.qty;k++)flat.push(p);
  });
  const pools={laser:[],missile:[],shield:[],armor:[],engine:[],warp:[],repair:[]};
  flat.forEach(p=>{const cat=classify(p);if(pools[cat])pools[cat].push(p);});
  Object.keys(pools).forEach(k=>sortByPower(pools[k]));
  const setGroups={};
  flat.forEach(p=>{
    if(p.rarity==='set'&&p.setId){
      if(!setGroups[p.setId])setGroups[p.setId]=[];
      setGroups[p.setId].push(p);
    }
  });

  // ── 실제 셀(area) 기반 잔여 슬롯 계산 — 테트리스 패킹 정확도 ──
  function _cellsTotal(s){
    return getShipPartsGridRows(s)*getShipPartsGridCols(s);  // 확장 열 포함
  }
  function _cellsUsed(s){
    let used=0;
    (s.parts||[]).forEach(pid=>{
      const p=partById(pid);if(!p)return;
      used+=partArea(p);
    });
    return used;
  }
  function _slotsLeft(s){return _cellsTotal(s)-_cellsUsed(s);}
  function _canFit(s,p){return _slotsLeft(s)>=partArea(p);}
  function _hasCat(s,cat){
    return (s.parts||[]).some(pid=>{
      const p=partById(pid);
      return p&&classify(p)===cat;
    });
  }
  // 규칙 7: 함선당 동일 partId 최대 2개 (3개 이상 배치 금지)
  function _countPartId(s,id){return (s.parts||[]).filter(pid=>pid===id).length;}
  function _underDupCap(s,id){return _countPartId(s,id)<2;}
  function _attach(si,partId){
    const inv=G.inventory.find(i=>i.id===partId&&i.qty>0);
    if(!inv)return false;
    if(!_underDupCap(G.fleet[si],partId))return false;
    attachPartSilent(si,partId);
    return true;
  }
  function _removeFromPool(partId){
    for(const k in pools){
      const idx=pools[k].findIndex(x=>x.id===partId);
      if(idx>=0){pools[k].splice(idx,1);return;}
    }
  }
  // 가장 적게 장착된 함선 우선 (셀 사용량 기준)
  function _shipsByLeastFilled(){
    return G.fleet.map((_,i)=>i).sort((a,b)=>{
      const ua=_cellsUsed(G.fleet[a]);
      const ub=_cellsUsed(G.fleet[b]);
      if(ua!==ub)return ua-ub;
      return a-b;
    });
  }
  function _allShips(){return G.fleet.map((_,i)=>i);}

  // 모드별 함선 순서: flagship=원래 순서(기함 우선), even=가장 적게 장착된 순
  function shipsFor(){return mode==='flagship'?_allShips():_shipsByLeastFilled();}

  let _stepWarp=0,_stepCoreML=0,_stepRound2=0,_stepDM=0,_stepFill=0;

  function _pickFitting(arr,s){
    for(let i=0;i<arr.length;i++){if(_canFit(s,arr[i])&&_underDupCap(s,arr[i].id))return i;}
    return -1;
  }
  // 신화 또는 전설 등급 여부
  function isMythOrLeg(p){
    if(!p)return false;
    if(p.rarity==='mythic'||p.rarity==='set'||p.rarity==='legend')return true;
    if(p.tier>=15)return true;
    return false;
  }
  // 풀에서 신화/전설만 골라 첫 fitting 인덱스 반환 (규칙 7 cap 포함)
  function _pickFittingMythLeg(arr,s){
    for(let i=0;i<arr.length;i++){if(isMythOrLeg(arr[i])&&_canFit(s,arr[i])&&_underDupCap(s,arr[i].id))return i;}
    return -1;
  }

  // 모드별 카테고리 1라운드 배포 (각 함선 1개씩, mythic/legend만 또는 전체)
  function _distOneRound(cat,opts){
    opts=opts||{};
    const order=shipsFor();
    for(const si of order){
      if(pools[cat].length===0)break;
      const s=G.fleet[si];
      if(_slotsLeft(s)<=0)continue;
      if(opts.skipIfHas&&_hasCat(s,cat))continue;
      let idx;
      if(opts.mythLegOnly)idx=_pickFittingMythLeg(pools[cat],s);
      else idx=_pickFitting(pools[cat],s);
      if(idx<0)continue;
      const part=pools[cat].splice(idx,1)[0];
      if(_attach(si,part.id))opts.counter&&opts.counter();
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 1: 블링크엔진+ (워프 E15/ME01/SE01) — 모든 함선에 1개씩 균등 분배
  // ═══════════════════════════════════════════════════════════════
  {
    const order=shipsFor();
    for(const si of order){
      if(pools.warp.length===0)break;
      const s=G.fleet[si];
      if(_slotsLeft(s)<=0)continue;
      const hasWarp=(s.parts||[]).some(pid=>WARP_ENGINE_IDS.includes(pid));
      if(hasWarp)continue;
      const idx=_pickFitting(pools.warp,s);
      if(idx<0)continue;
      const wp=pools.warp.splice(idx,1)[0];
      if(_attach(si,wp.id))_stepWarp++;
    }
    // 남은 워프 엔진은 일반 엔진 풀로 흡수 (다음 단계에서 사용 가능)
    if(pools.warp.length>0){pools.engine.push(...pools.warp);pools.warp=[];sortByPower(pools.engine);}
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 2: 세트 파츠 묶음 — 한 함선에 모음 (세트 보너스 활성)
  // ═══════════════════════════════════════════════════════════════
  Object.keys(setGroups).forEach(setId=>{
    const setParts=setGroups[setId];
    if(setParts.length===0)return;
    const live=setParts.filter(p=>G.inventory.find(i=>i.id===p.id&&i.qty>0));
    if(live.length<2)return;  // 세트 효과는 2개 이상부터
    const totalArea=live.reduce((s,p)=>s+partArea(p),0);
    const order=mode==='flagship'?_allShips():_shipsByLeastFilled();
    let targetSi=-1;
    for(const si of order){
      const s=G.fleet[si];
      if(_slotsLeft(s)>=totalArea){targetSi=si;break;}
    }
    if(targetSi<0)return;
    live.forEach(p=>{
      if(!_canFit(G.fleet[targetSi],p))return;
      if(!_underDupCap(G.fleet[targetSi],p.id))return;
      if(_attach(targetSi,p.id)){_removeFromPool(p.id);_stepDM++;}
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // STEP 3: 신화/전설 등급 레이저·실드·장갑 — 모든 함선에 1개씩 (1라운드)
  // ═══════════════════════════════════════════════════════════════
  const mlCoreThree=['laser','shield','armor'];
  for(const cat of mlCoreThree){
    _distOneRound(cat,{mythLegOnly:true,skipIfHas:true,counter:()=>_stepCoreML++});
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 3: 추가 라운드 — 신화/전설 엔진·레이저·실드·장갑 각 1개씩,
  //         그 다음 수리드론·미사일 각 1개씩
  // ═══════════════════════════════════════════════════════════════
  // 3-1) 한번 더 신화/전설 4종 1개씩 (이미 1개 있는 함선엔 같은 카테고리 추가됨)
  const mlCoreFour=['engine','laser','shield','armor'];
  for(const cat of mlCoreFour){
    const order=shipsFor();
    for(const si of order){
      if(pools[cat].length===0)break;
      const s=G.fleet[si];
      if(_slotsLeft(s)<=0)continue;
      const idx=_pickFittingMythLeg(pools[cat],s);
      if(idx<0)continue;
      const part=pools[cat].splice(idx,1)[0];
      if(_attach(si,part.id))_stepRound2++;
    }
  }
  // 3-2) 수리드론 1개씩
  _distOneRound('repair',{skipIfHas:true,counter:()=>_stepDM++});
  // 3-3) 미사일 1개씩 — 등급 무관, 가장 강한 것부터
  _distOneRound('missile',{skipIfHas:true,counter:()=>_stepDM++});

  // ═══════════════════════════════════════════════════════════════
  // STEP 4: 2x2 빈자리에 잔여 신화/전설, 그 외 빈틈에 하위 등급
  // ═══════════════════════════════════════════════════════════════
  // 4-1) 신화/전설 잔여를 큰 함선 2x2 자리에 (면적 큰 순)
  for(let round=0;round<50;round++){
    let placed=false;
    // 신화/전설만 모음, 면적 4 우선
    const big=[];
    ['laser','shield','armor','engine','repair','missile'].forEach(c=>{
      pools[c].forEach(p=>{if(isMythOrLeg(p))big.push({p,cat:c});});
    });
    if(big.length===0)break;
    big.sort((a,b)=>{
      const aa=partArea(a.p),bb=partArea(b.p);
      if(aa!==bb)return bb-aa;
      const ra=rarOf(a.p),rb=rarOf(b.p);
      return ra-rb;
    });
    const order=shipsFor();
    for(const si of order){
      const s=G.fleet[si];
      if(_slotsLeft(s)<=0)continue;
      let pickedCi=-1;
      for(let ci=0;ci<big.length;ci++){
        if(_canFit(s,big[ci].p)&&_underDupCap(s,big[ci].p.id)){pickedCi=ci;break;}
      }
      if(pickedCi<0)continue;
      const cand=big[pickedCi];
      big.splice(pickedCi,1);
      const pidx=pools[cand.cat].findIndex(x=>x.id===cand.p.id);
      if(pidx>=0)pools[cand.cat].splice(pidx,1);
      if(_attach(si,cand.p.id)){_stepFill++;placed=true;}
    }
    if(!placed)break;
  }
  // 4-2) 하위 등급 (영웅/희귀/일반) 잔여로 작은 빈틈 메움 — 미사일 마지막
  for(let round=0;round<50;round++){
    let placed=false;
    // 미사일 제외 — 미사일은 4-3에서 마지막
    const small=[];
    ['laser','shield','armor','engine','repair'].forEach(c=>{
      pools[c].forEach(p=>small.push({p,cat:c}));
    });
    if(small.length===0)break;
    // 면적 큰 순 → 등급 높은 순
    small.sort((a,b)=>{
      const aa=partArea(a.p),bb=partArea(b.p);
      if(aa!==bb)return bb-aa;
      const ra=rarOf(a.p),rb=rarOf(b.p);
      return ra-rb;
    });
    const order=shipsFor();
    for(const si of order){
      const s=G.fleet[si];
      if(_slotsLeft(s)<=0)continue;
      let pickedCi=-1;
      for(let ci=0;ci<small.length;ci++){
        if(_canFit(s,small[ci].p)&&_underDupCap(s,small[ci].p.id)){pickedCi=ci;break;}
      }
      if(pickedCi<0)continue;
      const cand=small[pickedCi];
      small.splice(pickedCi,1);
      const pidx=pools[cand.cat].findIndex(x=>x.id===cand.p.id);
      if(pidx>=0)pools[cand.cat].splice(pidx,1);
      if(_attach(si,cand.p.id)){_stepFill++;placed=true;}
    }
    if(!placed)break;
  }
  // 4-3) 마지막 — 미사일로 1x1/2x1 빈틈 메움
  sortByPower(pools.missile);
  for(let round=0;round<50;round++){
    let placed=false;
    if(pools.missile.length===0)break;
    const order=mode==='flagship'?_allShips():_shipsByLeastFilled();
    for(const si of order){
      if(pools.missile.length===0)break;
      const s=G.fleet[si];
      if(_slotsLeft(s)<=0)continue;
      const idx=_pickFitting(pools.missile,s);
      if(idx<0)continue;
      const m=pools.missile.splice(idx,1)[0];
      if(_attach(si,m.id)){_stepFill++;placed=true;}
    }
    if(!placed)break;
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 7: (제약) 함선당 동일 partId 최대 2개 — _attach 가 강제
  // STEP 8: 남은 모든 장비 — 1개씩 균등 분배 (least-filled 우선)
  // ═══════════════════════════════════════════════════════════════
  for(let round=0;round<50;round++){
    let placed=false;
    const leftovers=[];
    ['laser','shield','armor','engine','repair','missile'].forEach(c=>{
      pools[c].forEach(p=>leftovers.push({p,cat:c}));
    });
    if(leftovers.length===0)break;
    leftovers.sort((a,b)=>{const aa=partArea(a.p),bb=partArea(b.p);if(aa!==bb)return bb-aa;return rarOf(a.p)-rarOf(b.p);});
    // 균등 분배 — 항상 least-filled 우선 (flagship 모드여도 잔여는 균등 처리)
    const order=_shipsByLeastFilled();
    for(const si of order){
      const s=G.fleet[si];
      if(_slotsLeft(s)<=0)continue;
      let pickedCi=-1;
      for(let ci=0;ci<leftovers.length;ci++){
        if(_canFit(s,leftovers[ci].p)&&_underDupCap(s,leftovers[ci].p.id)){pickedCi=ci;break;}
      }
      if(pickedCi<0)continue;
      const cand=leftovers[pickedCi];
      leftovers.splice(pickedCi,1);
      const pidx=pools[cand.cat].findIndex(x=>x.id===cand.p.id);
      if(pidx>=0)pools[cand.cat].splice(pidx,1);
      if(_attach(si,cand.p.id)){_stepFill++;placed=true;}
    }
    if(!placed)break;
  }

  return {core4:_stepCoreML,set:0,small:_stepWarp,extra:_stepRound2+_stepDM,missile:_stepFill};
}

// ── 평균 분배 전용 자동 배치 알고리즘 (신규 사양) ─────────────────
//   ① 함선별로 레이저/장갑/실드/엔진 1개씩 (rarity: 신화→전설→영웅→희귀 순)
//   ② 세트 파츠 한 함선에 최대한 묶음
//   ③ 함선별 미사일 1 + 수리드론 1 (작은 파츠)
//   ④ 남은 슬롯에 다시 레이저/장갑/실드/엔진 순환 라운드 (평균 분배)
//   ⑤ 마지막 — 남은 작은 파츠로 빈 슬롯 메움
function _smartAutoEquipEven(){
  if(!G.fleet||!G.fleet.length){notify(I18N.t('notify.noShip'),'err');return;}
  _collectAllPartsToPool();
  function classify(p){
    if(WARP_ENGINE_IDS.includes(p.id))return 'warp';
    if(p.cat==='weapon')return p.wtype==='missile'?'missile':'laser';
    if(p.cat==='armor'&&typeof p.repairRate==='number'&&p.repairRate>0)return 'repair';
    return p.cat;
  }
  // 정렬: 신화(mythic)→전설(legend/set)→영웅(hero)→희귀(R)→일반(N) 순, 같은 등급 내 tier 높은 순, 합산 스탯 높은 순
  const rarPri={mythic:0,set:1,legend:2,L:2,hero:3,H:3,R:4,N:5};
  const sortByPower=arr=>arr.sort((a,b)=>{
    const ra=rarPri[a.rarity]??(a.tier>=15?2:a.tier>=11?3:a.tier>=6?4:5);
    const rb=rarPri[b.rarity]??(b.tier>=15?2:b.tier>=11?3:b.tier>=6?4:5);
    if(ra!==rb)return ra-rb;
    if(a.tier!==b.tier)return (b.tier||0)-(a.tier||0);
    return ((b.ATT||0)+(b.HP||0)+(b.INT||0)+(b.TEC||0))-((a.ATT||0)+(a.HP||0)+(a.INT||0)+(a.TEC||0));
  });
  // 인벤토리 펼침
  const flat=[];
  (G.inventory||[]).forEach(i=>{
    const p=PARTS.find(x=>x.id===i.id);if(!p||i.qty<=0)return;
    for(let k=0;k<i.qty;k++)flat.push(p);
  });
  // 카테고리별 풀 (정렬됨)
  const pools={laser:[],missile:[],shield:[],armor:[],engine:[],warp:[],repair:[]};
  flat.forEach(p=>{const cat=classify(p);if(pools[cat])pools[cat].push(p);});
  Object.keys(pools).forEach(k=>sortByPower(pools[k]));
  // 세트 그룹
  const setGroups={};
  flat.forEach(p=>{
    if(p.rarity==='set'&&p.setId){
      if(!setGroups[p.setId])setGroups[p.setId]=[];
      setGroups[p.setId].push(p);
    }
  });
  const shipOrder=G.fleet.map((_,i)=>i);
  function _slotsLeft(s){return _shipPartCap(s)-((s.parts||[]).length);}
  function _hasCat(s,cat){
    return (s.parts||[]).some(pid=>{
      const p=partById(pid);
      return p&&classify(p)===cat;
    });
  }
  function _attach(si,partId){
    const inv=G.inventory.find(i=>i.id===partId&&i.qty>0);
    if(!inv)return false;
    attachPartSilent(si,partId);
    return true;
  }
  function _removeFromPool(partId){
    for(const k in pools){
      const idx=pools[k].findIndex(x=>x.id===partId);
      if(idx>=0){pools[k].splice(idx,1);return;}
    }
  }
  let _coreFour=0,_setAssigned=0,_small=0,_rounds=0,_filler=0;

  // STEP 1: 각 함선에 레이저/장갑/실드/엔진 1개씩 (가장 강한 것부터)
  const coreFour=['laser','armor','shield','engine'];
  for(const cat of coreFour){
    for(const si of shipOrder){
      if(pools[cat].length===0)break;
      const s=G.fleet[si];
      if(_slotsLeft(s)<=0)continue;
      if(_hasCat(s,cat))continue;
      const part=pools[cat].shift();
      if(_attach(si,part.id))_coreFour++;
    }
  }

  // STEP 2: 세트 파츠 — 한 함선에 최대한 묶음 (기함 우선, 슬롯 여유 큰 함선 차선)
  Object.keys(setGroups).forEach(setId=>{
    const setParts=setGroups[setId];
    if(setParts.length===0)return;
    // 적합 함선: 기함부터, 슬롯 여유 충분한 곳
    let targetSi=-1;
    for(const si of shipOrder){
      const s=G.fleet[si];
      if(_slotsLeft(s)>=setParts.length){targetSi=si;break;}
    }
    if(targetSi<0)return;
    setParts.forEach(p=>{
      if(_attach(targetSi,p.id)){_removeFromPool(p.id);_setAssigned++;}
    });
  });

  // STEP 3: 함선별 미사일 1 + 수리드론 1 (작은 파츠)
  const smallCats=['missile','repair'];
  for(const cat of smallCats){
    for(const si of shipOrder){
      if(pools[cat].length===0)break;
      const s=G.fleet[si];
      if(_slotsLeft(s)<=0)continue;
      if(_hasCat(s,cat))continue;
      const part=pools[cat].shift();
      if(_attach(si,part.id))_small++;
    }
  }

  // STEP 3.5: 워프 엔진 (E15/ME01/SE01) — 함선당 1개 (있을 때만)
  for(const si of shipOrder){
    if(pools.warp.length===0)break;
    const s=G.fleet[si];
    if(_slotsLeft(s)<=0)continue;
    const hasWarp=(s.parts||[]).some(pid=>WARP_ENGINE_IDS.includes(pid));
    if(hasWarp)continue;
    const wp=pools.warp.shift();
    if(_attach(si,wp.id))_small++;
  }
  // 남은 워프는 엔진 풀로 흡수
  if(pools.warp.length>0){pools.engine.push(...pools.warp);pools.warp=[];sortByPower(pools.engine);}

  // STEP 4: 6-카테고리 라운드 로빈 — 매 라운드 시작 시 가장 적게 장착된 함선을 우선
  // 각 라운드: 6 카테고리(laser/armor/shield/engine/missile/repair) × 각 함선당 최대 1개
  // 같은 카테고리가 한 함선에 과적되지 않도록 — 라운드마다 1개씩만 추가
  const allCats=['laser','armor','shield','engine','missile','repair'];
  for(let r=0;r<20;r++){
    // 매 라운드 시작 시 함선 정렬: 현재 장착 수 적은 함선 → 많은 함선 (균등 분배 보장)
    const ordByLeast=[...shipOrder].sort((a,b)=>{
      const pa=(G.fleet[a].parts||[]).length;
      const pb=(G.fleet[b].parts||[]).length;
      if(pa!==pb)return pa-pb;
      return a-b;  // 동률이면 기존 순서 유지
    });
    let placedThisRound=false;
    for(const cat of allCats){
      for(const si of ordByLeast){
        if(pools[cat].length===0)continue;
        const s=G.fleet[si];
        if(_slotsLeft(s)<=0)continue;
        const part=pools[cat].shift();
        if(_attach(si,part.id)){_rounds++;placedThisRound=true;}
      }
    }
    if(!placedThisRound)break;
  }

  // STEP 5: 마지막 — 어떤 카테고리든 남은 파츠로 빈 슬롯 메움 (라운드 로빈)
  // 작은 파츠(미사일/드론)를 우선으로 + 약한 파츠도 빈 슬롯 0까지 메움
  const allLeftover=[
    ...pools.missile,...pools.repair,
    ...pools.laser,...pools.shield,...pools.armor,...pools.engine
  ];
  // 라운드 로빈으로 부족 함선 우선 분배
  while(allLeftover.length>0){
    let placedThisRound=false;
    const ordByLeast=[...shipOrder].sort((a,b)=>{
      const pa=(G.fleet[a].parts||[]).length;
      const pb=(G.fleet[b].parts||[]).length;
      return pa-pb;
    });
    for(const si of ordByLeast){
      if(allLeftover.length===0)break;
      const s=G.fleet[si];
      if(_slotsLeft(s)<=0)continue;
      const p=allLeftover.shift();
      if(_attach(si,p.id)){_filler++;placedThisRound=true;}
    }
    if(!placedThisRound)break;
  }

  return {coreFour:_coreFour,set:_setAssigned,small:_small,rounds:_rounds,filler:_filler};
}

// window 전역 노출 (game.js / HTML onclick 호환)
window.autoEquipPartsFlagship=autoEquipPartsFlagship;
window.autoEquipPartsEven=autoEquipPartsEven;
window._pickQuestMythicPart=_pickQuestMythicPart;
window._smartAutoEquip=_smartAutoEquip;
window._smartAutoEquipV2=_smartAutoEquipV2;
window._smartAutoEquipEven=_smartAutoEquipEven;
window._smartAutoEquipEvenV3=_smartAutoEquipEvenV3;
window._collectAllPartsToPool=_collectAllPartsToPool;
window._distributeCargoExtParts=_distributeCargoExtParts;
window._forcePushRemainingParts=_forcePushRemainingParts;
window._finalizeUniqueParts=_finalizeUniqueParts;
window._redistributeLeastFilledByValue=_redistributeLeastFilledByValue;
window._redistribute2x2Fair=_redistribute2x2Fair;
// bugfix 2026-06-11: 크루 자동배치 헬퍼 3종 미노출 — game.js의 autoAssignCrewEven/Flagship(정비소 크루 균등분배·기함중심 버튼)이
//   ReferenceError(_collectAllCrewToPool is not defined)로 항상 실패하던 문제 수정
window._collectAllCrewToPool=_collectAllCrewToPool;
window._sortedCrewByPower=_sortedCrewByPower;
window._shipCrewCap=_shipCrewCap;
console.log('[auto-equip] Loaded — 16 functions exposed');
})();
