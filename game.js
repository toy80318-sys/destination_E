
// ═══ DESTINATION EARTH v1.1 ════════════════════════════════════
// 빌드: 2026-05-20 | 파일 버전 확인용
window._GAME_VER='1.1';
let _lastDismissedCrew=null; // 되돌리기용 마지막 내보낸 크루
// 전역 미처리 오류 캐처 — 화면 멈춤 방지
window.onerror=function(msg,src,line,col,err){
  console.error('[GLOBAL ERROR]',msg,'at line',line,err);
  try{notify('[오류] '+msg.substring(0,60),'err');}catch(e){}
  return false; // 기본 오류 동작 유지
};
window.addEventListener('unhandledrejection',function(e){
  console.error('[PROMISE ERROR]',e.reason);
});
// ═══ DATA ═══════════════════════════════════════════════════════
// 데이터 정의는 도메인별로 분리되어 js/data/ 폴더에 있습니다.
// index.html이 game.js보다 먼저 다음 파일들을 로드하므로
// FACTION, PLANET_DEF, HEROES 등은 그대로 전역으로 접근 가능합니다.
//
//   js/data/factions.js   — FACTION, FACTION_MATS
//   js/data/planets.js    — PLANET_DEF, PLANET_LORE
//   js/data/heroes.js     — HEROES, HERO_LORE, NPC_POOL
//   js/data/commodities.js — COMMODITIES (G/R)
//   js/data/parts.js      — PARTS
//   js/data/quests.js     — QUEST_LEGEND_CREW, QUEST_MYTHIC_PARTS, QUEST_SET_PARTS
//   js/data/cargo.js      — CARGO_ITEMS, SPECIAL_CARGO_PARTS
//   js/data/crafting.js   — CRAFT_RECIPES, BLUEPRINT_MAP
//   js/data/ships.js      — SHIP_CATALOG, BOSS

// ═══ GAME STATE ══════════════════════════════════════════════════
const G={
  profile:{name:'',gender:'male',company:'빅 픽처 스페이스',ship:'머스탱'},
  isMinor:false,
  difficulty:'normal', // easy | normal | hard | extreme
  credits:50000,voidEssence:0,voidCrystal:3,
  materials:{},
  turn:0,act:1,currentPlanet:'P01',stayTurns:0,loan:0,
  planets:{},
  fleet:[],
  crew:[],heroes:[],
  cargo:[],
  inventory:[],  // 보유 파츠 [{partId, qty}]
  quests:{},     // {planetId: [quest,...]}
  combatHistory:[],
  gachaPity:0,
  mapPositions:{},mapConns:null,
  mapZoom:0.85,mapSelected:null,
  shopStock:{},  // {planetId: {commId: qty, ...}}
};

// ═══ PRNG & MAP ══════════════════════════════════════════════════
function mulberry32(seed){return function(){seed|=0;seed=(seed+0x6d2b79f5)|0;let t=Math.imul(seed^(seed>>>15),1|seed);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};}

function generateGalaxy(seed=1000){
  // 오각형 링 그리드: 링 r → 반지름 r×UNIT
  // 행성 간격 1~1.5 UNIT (결정론적 지터로 랜덤 변동)
  const UNIT=90; // 기본 단위 거리 (px)
  const BASE=-Math.PI/2;
  const PENTA=5;

  function ringPoints(r){
    if(r===0)return[{x:0,y:0,ang:0}];
    const R=r*UNIT;
    const pts=[];
    for(let k=0;k<PENTA;k++){
      const a0=BASE+k*2*Math.PI/PENTA;
      const a1=BASE+(k+1)*2*Math.PI/PENTA;
      const x0=R*Math.cos(a0),y0=R*Math.sin(a0);
      const x1=R*Math.cos(a1),y1=R*Math.sin(a1);
      pts.push({x:x0,y:y0,ang:((Math.atan2(y0,x0)*180/Math.PI)+360)%360});
      for(let j=1;j<r;j++){
        const t=j/r;
        const xi=x0+(x1-x0)*t,yi=y0+(y1-y0)*t;
        pts.push({x:xi,y:yi,ang:((Math.atan2(yi,xi)*180/Math.PI)+360)%360});
      }
    }
    return pts;
  }

  const pos={};
  const usedKey=new Set();
  const byRing={};
  PLANET_DEF.forEach(p=>{const r=typeof p.ring==='number'?p.ring:3;if(!byRing[r])byRing[r]=[];byRing[r].push(p);});

  Object.entries(byRing).forEach(([r,planets])=>{
    const ri=parseInt(r);
    const candidates=ringPoints(ri);
    const sorted=[...planets].sort((a,b)=>((a.ang%360+360)%360)-((b.ang%360+360)%360));
    sorted.forEach(p=>{
      const targetAng=((p.ang%360)+360)%360;
      let best=null,bestScore=Infinity,bestKey='';
      candidates.forEach((pt,i)=>{
        const key=ri+'_'+i;
        if(usedKey.has(key))return;
        let diff=Math.abs(pt.ang-targetAng);if(diff>180)diff=360-diff;
        if(diff<bestScore){bestScore=diff;best=pt;bestKey=key;}
      });
      if(best){usedKey.add(bestKey);pos[p.id]={x:best.x,y:best.y};}
      else{
        const fb=candidates.find((_,i)=>!usedKey.has(ri+'_'+i));
        if(fb){const fbi=candidates.indexOf(fb);usedKey.add(ri+'_'+fbi);pos[p.id]={x:fb.x,y:fb.y};}
        else{pos[p.id]={x:0,y:0};}
      }
    });
  });

  // 결정론적 지터 — 행성별 고유 오프셋
  // 기본 간격 ≈ UNIT(90px), 지터 ±0~0.25UNIT → 실효 간격 0.75~1.25 UNIT
  // 링 내부 변 간격 ≈ 1.17 UNIT, 지터 후 → 0.92~1.42 UNIT (1~1.5 범위 충족)
  Object.keys(pos).forEach(pid=>{
    if(pid==='P01')return;
    const h=pid.split('').reduce((a,c)=>a+c.charCodeAt(0),0);
    // 각 행성마다 독립 지터 방향 + 크기 (UNIT*0.1 ~ UNIT*0.25)
    const jAmt=UNIT*(0.10+((h*137)%100)/400); // 0.10~0.35 UNIT 범위 → 유효 간격 변동
    pos[pid]={
      x:pos[pid].x+Math.sin(h*1.7+h%7)*jAmt,
      y:pos[pid].y+Math.cos(h*2.3+h%5)*jAmt
    };
  });
  return pos;
}

function buildConnections(positions){
  // ── 경로 설정 ──────────────────────────────────────────────────
  // UNIT=90px 기준, 최대 연결 거리 = 2 UNIT = 180px
  // 행성당 1~4개 경로, 최소 1개 반드시 보장
  const UNIT=90;
  const MAX_DIST=UNIT*2.0;  // 이동 가능 최대 반경: 2 UNIT
  const MAX_CONN=4;          // 행성당 최대 경로
  const MIN_CONN=1;          // 행성당 최소 경로 (반드시 1개)

  const added=new Set(),conns=[];
  const connCount={};
  PLANET_DEF.forEach(p=>{connCount[p.id]=0;});

  function addC(a,b){
    if(!positions[a]||!positions[b]||a===b)return false;
    const k=a<b?`${a}|${b}`:`${b}|${a}`;
    if(added.has(k))return false;
    added.add(k);
    const pa=positions[a],pb=positions[b];
    conns.push({a,b,d:Math.hypot(pa.x-pb.x,pa.y-pb.y)});
    connCount[a]=(connCount[a]||0)+1;
    connCount[b]=(connCount[b]||0)+1;
    return true;
  }

  const ids=PLANET_DEF.map(p=>p.id);

  // 1단계: 가장 가까운 행성 우선 연결 (MAX_DIST 이내, 1~4개)
  // 행성 ID 해시로 연결 개수 결정 (결정론적, 1~4 균등 분포)
  ids.forEach(id=>{
    const pa=positions[id];if(!pa)return;
    const h=id.split('').reduce((s,c)=>s+c.charCodeAt(0),0);
    const maxConn=1+((h*31+17)%MAX_CONN); // 1~4 결정론적

    ids
      .filter(o=>o!==id&&positions[o])
      .map(o=>({id:o,d:Math.hypot(positions[o].x-pa.x,positions[o].y-pa.y)}))
      .filter(n=>n.d<=MAX_DIST)          // 거리 제한: 2 UNIT 이내만
      .sort((a,b)=>a.d-b.d)
      .slice(0,maxConn)
      .forEach(n=>addC(id,n.id));
  });

  // 2단계: 연결 없는 행성 → 거리 무관 가장 가까운 1개 강제 연결 (최소 1개 보장)
  ids.forEach(id=>{
    if((connCount[id]||0)>=MIN_CONN)return;
    const pa=positions[id];if(!pa)return;
    const nearest=ids
      .filter(o=>o!==id&&positions[o])
      .map(o=>({id:o,d:Math.hypot(positions[o].x-pa.x,positions[o].y-pa.y)}))
      .sort((a,b)=>a.d-b.d)[0];
    if(nearest)addC(id,nearest.id);
  });

  // 3단계: 보이드 행성 — 인근 비보이드 행성 1~2개 특별 연결 (거리 제한 완화)
  PLANET_DEF.filter(p=>p.void).forEach(vp=>{
    const vpa=positions[vp.id];if(!vpa)return;
    PLANET_DEF.filter(p=>!p.void&&positions[p.id])
      .map(p=>({id:p.id,d:Math.hypot(positions[p.id].x-vpa.x,positions[p.id].y-vpa.y)}))
      .sort((a,b)=>a.d-b.d)
      .slice(0,2)
      .forEach(n=>addC(vp.id,n.id));
  });

  return conns;
}

// ═══ SHOP STOCK (상점 재고 - 행성 방문 시 생성 + 주기적 보충) ═══════════
// 특산물·재료 재고는 SHOP_RESTOCK_TURNS 턴마다 자동 보충 (파츠/함선 재고는 유지)
const SHOP_RESTOCK_TURNS=4;
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
        const _seed=planetId.split('').reduce((a,c)=>a+c.charCodeAt(0),0);
        _allMats.forEach((mat,i)=>{if(!_st[mat.id]&&((_seed+i)%3)===0)_st[mat.id]=Math.floor(Math.random()*10)+4;});
      }
      // 신규 추가 파츠(예: RB06~RB08 수리 로봇 등)는 즉시 보충 (4턴 대기 없이)
      _restockMissingParts(_st,planetId);
      return;
    }
    // 보충 주기 도래 — 특산물/재료 + 신규 파츠 보충
    _restockCommodities(_st,planetId);
    _restockMissingParts(_st,planetId);
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
      const repScale=Math.max(0.04,Math.min(1.0,_stockRep/500));  // 0.04~1.0
      const priceRatio=c.buy/15000;  // 0~1 (가격 비율)
      const priceAdjust=1-priceRatio*0.55;  // 저가 1.0, 고가 0.45
      const maxQty=Math.max(20,Math.min(500,Math.floor(500*repScale*priceAdjust)));
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
    const seed=planetId.split('').reduce((a,c)=>a+c.charCodeAt(0),0);
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
    const baseQty=Math.max(4,Math.min(60,4+Math.floor(score/4)));
    picks.forEach((mat,i)=>{
      const q=Math.max(4,Math.min(60,baseQty-i*6+Math.floor(Math.random()*10)));
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
    // 모든 중형/일반 대형 함선은 항상 입고 — 전투력/명성 조건은 구매 시점에 검사
    // (단, 특수 quest/전설 LGD·H1x·신화·CHIX_*_BUY 등은 기존 해금 조건 유지)
    const availShips=SHIP_CATALOG.filter(s=>{
      // 치크스 노획 함선 — 치크스 행성 보유 시에만
      if(s.id&&s.id.startsWith('CHIX_'))return _ownsChix;
      return (
        (s.tier==='소형'&&!s.id.startsWith('CHIX_'))||
        (s.tier==='중형'&&!s.id.startsWith('CHIX_'))||
        (s.tier==='대형'&&!s.id.startsWith('H1')&&!s.id.startsWith('LGD')&&!s.id.startsWith('CHIX_'))||
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
  // ── 특수 창고 파츠 상점 재고 (등급별) ─────────────────────────────
  const scargoParts=SPECIAL_CARGO_PARTS.filter(p=>!p.quest&&p.tier<=tierMax);
  scargoParts.forEach(p=>{
    stock['scargo_'+p.id]=p.rarity==='legend'||p.rarity==='mythic'?1:Math.floor(Math.random()*2+1);
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
    const repScale=Math.max(0.04,Math.min(1.0,_rep/500));
    const priceRatio=c.buy/15000;
    const priceAdjust=1-priceRatio*0.55;
    const maxQty=Math.max(20,Math.min(500,Math.floor(500*repScale*priceAdjust)));
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
function initGame(){
  G.planets={};
  PLANET_DEF.forEach(p=>{G.planets[p.id]={fog:p.unlock?(p.start?'A':'S'):'L',owned:false,commerce:0};});
  G.fleet=[{id:'S01_main',nm:G.profile.ship||'머스탱',tier:'소형',maxHP:100,hp:100,maxSH:50,sh:50,ATT:20,INT:15,TEC:18,HP:100,LOY:80,parts:[],crewIds:[],cargoSlots:4}];
  G.crew=[];G.heroes=[];G.cargo=[];G.inventory=[];G.materials={};G.blueprints={};G.combatHistory=[];G.quests={};G.loan=0;G.reputation=0;G.pirateKills=0;G.pirateAppearances=0;G.lastPirateTurn=-999;G.auctionBids=0;G.auctionBidTurn=-1;G.chixWaves=0;G.lastChixTurn=-999;G.hallOfFame=G.hallOfFame||[];
  G.turn=0;G.act=1;G.currentPlanet='P01';G.gachaPity=0;G.stayTurns=0;
  G.credits=50000;G.voidEssence=0;G.voidCrystal=3;
  G.shopStock={};
  G.mapPositions=generateGalaxy(1000);G.mapConns=buildConnections(G.mapPositions);
  generateShopStock('P01');
  // 시작 행성 P01(프록시마b): 함선도크(1회)·행성광장(2회) 이미 해금 상태로 시작
  G.planets['P01'].hubProg=2;
}

// ═══ SCREENS ════════════════════════════════════════════════════
const SCREENS=['s-loading','s-title','s-agegate','s-ftue','s-prologue','s-hub'];
function toggleBaekgu(){/* 항상 표시 — 토글 비활성화 */}

// 함대 바 갱신 (모든 허브 탭에서 하단 바에 함대 카드 표시)
function updateFleetBar(){
  const el=document.getElementById('bk-fleet');if(!el)return;
  if(!G||!G.fleet||!G.fleet.length){el.innerHTML='<span style="color:var(--dim);font-size:12px">함선 없음</span>';return;}
  const cards=G.fleet.map((s,i)=>{
    const st=getShipStats(s);
    const hpPct=Math.max(0,Math.min(100,Math.round(s.hp/Math.max(1,st.HP)*100)));
    const shPct=Math.max(0,Math.min(100,Math.round((s.sh||0)/Math.max(1,st.maxSH)*100)));
    const fc=s.tier==='신화'?'#cc66ff':s.tier==='대형'?'#d4af37':s.tier==='중형'?'#00f3ff':'#88ccff';
    const tierIc=s.tier==='신화'?'✦':s.tier==='대형'?'🌟':s.tier==='중형'?'🚀':'🛸';
    const isFlagship=(i===0);
    const _att=st.ATT||0;
    const _int=st.INT||0;
    const _tec=st.TEC||0;
    return`<div onclick="showShipDetailModal(${i})" style="background:rgba(0,243,255,.05);border:1px solid ${fc}${isFlagship?'99':'44'};border-radius:8px;padding:5px 7px;cursor:pointer;display:flex;flex-direction:column;gap:3px;transition:border-color .2s;height:78px;box-sizing:border-box;min-width:0" onmouseover="this.style.borderColor='${fc}'" onmouseout="this.style.borderColor='${fc}${isFlagship?'99':'44'}'">
      <div style="display:flex;align-items:center;gap:6px;flex:1;min-height:0">
        ${imgOrEmoji(shipImgSrc(s),tierIc,44,44,'border-radius:5px;background:rgba(0,0,0,.5);flex-shrink:0',shipLoreKey(s))}
        <div style="min-width:0;flex:1;overflow:hidden">
          <div style="color:${fc};font-size:11px;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${isFlagship?'⚑ ':''}${s.nm||'함선'}</div>
          <div style="color:var(--muted);font-size:10px">${s.tier}</div>
          <div style="display:flex;gap:5px">
            <span style="font-size:9px;color:var(--red)">ATT ${_att}</span>
            <span style="font-size:9px;color:var(--cyan)">ENG ${_tec}</span>
          </div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:3px">
        <span style="font-size:9px;color:var(--dim);width:18px">HP</span>
        <div style="flex:1;height:3px;background:rgba(0,255,100,.12);border-radius:2px">
          <div style="height:100%;width:${hpPct}%;background:${hpPct>50?'var(--green)':hpPct>25?'var(--yellow)':'var(--red)'};border-radius:2px;transition:width .3s"></div>
        </div>
        <span style="font-size:9px;color:var(--dim);width:22px;text-align:right">${hpPct}%</span>
      </div>
      ${st.maxSH>0?`<div style="display:flex;align-items:center;gap:3px"><span style="font-size:9px;color:var(--dim);width:18px">SH</span><div style="flex:1;height:3px;background:rgba(0,150,255,.12);border-radius:2px"><div style="height:100%;width:${shPct}%;background:var(--cyan);border-radius:2px;transition:width .3s"></div></div><span style="font-size:9px;color:var(--dim);width:22px;text-align:right">${shPct}%</span></div>`:''}
    </div>`;
  }).join('');
  el.innerHTML=cards;
}
function showShipDetailModal(idx){
  const s=G.fleet[idx];if(!s)return;
  const bonus=getPartBonus(s);const crewBonus=getCrewBonus(s);
  const hpMax=s.maxHP+(bonus.hp||0);const shMax=s.maxSH+(bonus.sh||0);
  const hpP=Math.max(0,Math.round(s.hp/hpMax*100));
  const shP=shMax>0?Math.max(0,Math.round((s.sh||0)/shMax*100)):0;
  const hpC=hpP>60?'var(--green)':hpP>30?'#f39c12':'var(--red)';
  const rc=repairCost(s),sc=shRepairCost(s);
  const fc=s.tier==='신화'?'#cc66ff':s.tier==='대형'?'#d4af37':s.tier==='중형'?'#00f3ff':'#88ccff';
  const isFlagship=idx===0;
  const tierIc={신화:'✦',전설기함:'⚑',대형:'🌟',중형:'🚀',소형:'🛸'}[s.tier]||'🛸';
  // 크루
  const crewIds=s.crewIds||[];
  const RC2={N:'#888',R:'var(--blue)',H:'var(--purple)',L:'var(--gold)',S:'#ff6ec7'};
  const crewHtml=crewIds.length>0?crewIds.map(cid=>{
    const c=G.crew.find(x=>x.id===cid)||G.heroes.map(h=>({...HEROES[h],id:h,rarity:'S'})).find(x=>x.id===cid);
    if(!c)return'';
    return`<div style="display:flex;align-items:center;gap:5px;padding:3px 6px;background:rgba(0,0,0,.4);border-radius:4px;border:1px solid rgba(255,255,255,.08);min-width:0">
      <span style="font-size:16px;flex-shrink:0">${c.ic||'🧑'}</span>
      <div style="min-width:0"><div style="font-size:11px;color:${RC2[c.rarity]||'#888'};font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.nm}</div><div style="font-size:9px;color:var(--dim)">${c.cl}</div></div>
    </div>`;
  }).join(''):'<div style="color:var(--dim);font-size:12px;grid-column:span 2">탑승 크루 없음</div>';
  // 파츠
  const parts=s.parts||[];
  const catIcMap={weapon:'⚔️',missile:'🚀',shield:'🛡️',armor:'🛡',engine:'⚡'};
  const catColMap={weapon:'var(--red)',missile:'#ff8844',shield:'var(--blue)',armor:'var(--gold)',engine:'var(--cyan)'};
  const partsHtml=parts.length>0?parts.map(pid2=>{
    const p2=PARTS.find(x=>x.id===pid2);if(!p2)return'';
    const ci=catIcMap[p2.cat]||'⚙️';const cc=catColMap[p2.cat]||'var(--dim)';
    return`<div style="display:flex;align-items:center;gap:4px;padding:3px 6px;background:rgba(0,0,0,.4);border-radius:4px;border:1px solid rgba(255,255,255,.08);min-width:0">
      <span style="font-size:14px;flex-shrink:0">${ci}</span>
      <div style="font-size:11px;color:${cc};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p2.nm}</div>
    </div>`;
  }).join(''):'<div style="color:var(--dim);font-size:12px;grid-column:span 2">장착 파츠 없음</div>';
  const ATT=(s.ATT||0)+(bonus.att||0)+(crewBonus.att||0);
  const INT2=(s.INT||0)+(bonus.int2||0)+(crewBonus.int2||0);
  const TEC=(s.TEC||0)+(bonus.tec||0)+(crewBonus.tec||0);
  const cargoSlots=s.cargoSlots||4;
  const cargoUpPrice=cargoSlots<80?getCargoUpgradePrice(s):0;
  const groupStyle='background:rgba(0,0,0,.22);border:1px solid var(--bdr);border-radius:8px;padding:9px 11px';
  const groupTitleStyle='font-size:11px;color:var(--dim);font-weight:bold;letter-spacing:.5px;text-transform:uppercase;margin-bottom:7px;display:flex;align-items:center;gap:5px';
  const btnRowStyle='display:flex;gap:6px;flex-wrap:wrap;align-items:center';
  const modalContent=`<div style="padding:14px;min-width:380px;max-width:620px">
    <!-- 헤더: 이미지 + 정보 -->
    <div style="display:flex;gap:16px;margin-bottom:14px;align-items:flex-start">
      ${imgOrEmoji(shipImgSrc(s),tierIc,144,144,'border-radius:10px;background:rgba(0,0,0,.6);flex-shrink:0;border:1px solid '+fc+'66',shipLoreKey(s))}
      <div style="flex:1;min-width:0">
        <div style="font-size:19px;font-weight:bold;color:${fc};margin-bottom:2px">${isFlagship?'⚑ 기함 ':''}${s.nm}</div>
        <div style="font-size:12px;color:var(--dim);margin-bottom:10px">${s.tier}</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;font-size:13px;margin-bottom:10px">
          <span style="color:var(--red)">⚔️ ATT ${ATT}</span>
          <span style="color:var(--blue)">🔮 INT ${INT2}</span>
          <span style="color:var(--cyan)">⚡ ENG ${TEC}</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
          <span style="font-size:11px;color:var(--dim);min-width:28px">HP</span>
          <div style="flex:1;height:7px;background:rgba(0,255,100,.12);border-radius:4px">
            <div style="height:100%;width:${hpP}%;background:${hpC};border-radius:4px;transition:width .3s"></div>
          </div>
          <span style="font-size:11px;color:var(--dim)">${s.hp}/${hpMax} (${hpP}%)</span>
        </div>
        ${shMax>0?`<div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:11px;color:var(--dim);min-width:28px">SHD</span>
          <div style="flex:1;height:7px;background:rgba(0,150,255,.12);border-radius:4px">
            <div style="height:100%;width:${shP}%;background:var(--cyan);border-radius:4px;transition:width .3s"></div>
          </div>
          <span style="font-size:11px;color:var(--dim)">${s.sh||0}/${shMax} (${shP}%)</span>
        </div>`:''}
      </div>
    </div>

    <!-- 크루 / 파츠 정보 -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
      <div>
        <div style="font-size:13px;color:var(--cyan);font-weight:bold;margin-bottom:6px">👥 크루 (${crewIds.length}/${getMaxCrew(s)})</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">${crewHtml}</div>
      </div>
      <div>
        <div style="font-size:13px;color:var(--gold);font-weight:bold;margin-bottom:6px">⚙️ 장착 파츠 (${parts.length})</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">${partsHtml}</div>
      </div>
    </div>

    <!-- 액션 패널: 3 그룹 (장비 / 함선 / 수리) -->
    <div style="display:flex;flex-direction:column;gap:8px">
      <div style="${groupStyle}">
        <div style="${groupTitleStyle}"><span>⚙️</span><span>장비</span></div>
        <div style="${btnRowStyle}">
          <button class="btn btn-sm" style="border-color:var(--gold);color:var(--gold)" onclick="pickPartModal(${idx})">⚙️ 파츠 장착</button>
          <button class="btn btn-sm" style="border-color:var(--cyan);color:var(--cyan)" onclick="pickCrewModal(${idx})">👥 크루 배치</button>
          ${crewIds.length>0?`<button class="btn btn-sm" style="border-color:#f88;color:#f88" onclick="unassignCrewModal(${idx},0)">👤 크루 해제</button>`:''}
        </div>
      </div>
      <div style="${groupStyle}">
        <div style="${groupTitleStyle}"><span>🚀</span><span>함선</span></div>
        <div style="${btnRowStyle}">
          ${cargoSlots>=80
            ? `<span style="font-size:12px;color:var(--cyan);padding:5px 9px;border:1px solid rgba(0,243,255,.3);border-radius:5px">📦 창고 최대 80칸</span>`
            : `<button class="btn btn-sm" style="border-color:var(--purple);color:var(--purple)" onclick="upgradeCargoSlotFromModal(${idx})" ${G.credits>=cargoUpPrice?'':'disabled'}>📦 창고 +2칸 (${cargoSlots}/80) ₡${cargoUpPrice.toLocaleString()}</button>`}
          ${isFlagship
            ? `<span style="font-size:12px;color:var(--gold);padding:5px 9px;border:1px solid rgba(212,175,55,.4);border-radius:5px">⚑ 현재 기함</span>`
            : `<button class="btn btn-sm" style="border-color:var(--gold);color:var(--gold);font-weight:bold;background:rgba(212,175,55,.12)" onclick="setAsFlagship(${idx})">⚑ 기함 설정</button>`}
        </div>
      </div>
      <div style="${groupStyle}">
        <div style="${groupTitleStyle}"><span>🔧</span><span>수리</span><span style="margin-left:auto;font-size:10px;color:var(--muted);text-transform:none;letter-spacing:0;font-weight:normal">보유 ₡${G.credits.toLocaleString()}</span></div>
        <div style="${btnRowStyle}">
          ${rc>0
            ? `<button class="btn btn-sm btn-green" onclick="repairShipModal(${idx},'hp')" ${G.credits>=rc?'':'disabled'}>🔧 HP 수리 ₡${rc.toLocaleString()}</button>`
            : `<span style="font-size:12px;color:var(--green);padding:5px 9px;border:1px solid rgba(46,204,113,.3);border-radius:5px">✅ HP 최대</span>`}
          ${shMax>0&&(s.sh||0)<shMax&&sc>0
            ? `<button class="btn btn-sm" style="border-color:var(--blue);color:var(--blue)" onclick="repairShipModal(${idx},'sh')" ${G.credits>=sc?'':'disabled'}>🛡️ 실드 수리 ₡${sc.toLocaleString()}</button>`
            : (shMax>0?`<span style="font-size:12px;color:var(--cyan);padding:5px 9px;border:1px solid rgba(0,243,255,.3);border-radius:5px">✅ 실드 최대</span>`:'')}
          ${(rc+sc)>0
            ? `<button class="btn btn-sm btn-gold" onclick="repairShipFullModal(${idx})" ${G.credits>=(rc+sc)?'':'disabled'}>⚡ 완전수리 ₡${(rc+sc).toLocaleString()}</button>`
            : ''}
          <button class="btn btn-sm" onclick="closeModal();hubTab('garage')" style="margin-left:auto;opacity:.7">🔧 정비소</button>
        </div>
      </div>
    </div>
  </div>`;
  openModal(`${isFlagship?'⚑ ':tierIc+' '}${s.nm}`,modalContent,[{txt:'닫기',fn:closeModal,cls:'btn-sm'}]);
}

// ─── 기함 설정 ────────────────────────────────────────────────
function setAsFlagship(idx){
  if(idx===0||idx>=G.fleet.length)return;
  const tmp=G.fleet[idx];
  G.fleet.splice(idx,1);
  G.fleet.unshift(tmp);
  updateHUD();updateFleetBar();
  notify(`⚑ ${tmp.nm} 이(가) 기함으로 설정되었습니다!`,'gold');
  baekgu(`${tmp.nm} 기함 승격. 전투 시 중앙에 배치돼.`);
  saveGame(true);
  showShipDetailModal(0); // 기함 위치(0)로 팝업 갱신
}
// ─── 백구 패널 드래그/리사이즈 ───────────────────────────────
(function(){
  const STORE_KEY='bk_panel_state';
  let floating=false,dragging=false,resizing=false;
  // show()에서 floating 상태를 클로저 변수와 동기화하기 위해 외부 접근 허용
  window._bkSetFloating=function(v){floating=v;};
  let dragOX=0,dragOY=0,resOX=0,resOY=0,resW=0,resH=0;
  function getDlg(){return document.getElementById('bkdialog');}
  function saveState(){
    const d=getDlg();if(!d||!floating)return;
    const r=d.getBoundingClientRect();
    localStorage.setItem(STORE_KEY,JSON.stringify({floating,left:d.style.left,top:d.style.top,width:d.style.width,height:d.style.height}));
  }
  // 분리 모드는 UI 깨짐 문제로 제거됨. 호환을 위해 빈 함수 유지.
  window.bkToggleFloat=function(){/* deprecated — UI 깨짐 방지 */};
  // 새 토글: 백구 창 높이 축소/확대 (작게/원래대로)
  window.bkToggleCollapse=function(){
    const d=getDlg();if(!d)return;
    const collapsed=d.classList.toggle('bk-collapsed');
    try{localStorage.setItem('de_bk_collapsed',collapsed?'1':'0');}catch(e){}
  };
  // 드래그 (토글바 mousedown)
  document.addEventListener('mousedown',function(e){
    const bar=document.getElementById('bk-toggle-bar');
    if(!bar||!floating)return;
    if(!bar.contains(e.target)||e.target.closest('button')||e.target.id==='bk-pin-btn'||e.target.id==='bk-chevron')return;
    const d=getDlg();if(!d)return;
    dragging=true;
    const r=d.getBoundingClientRect();
    dragOX=e.clientX-r.left;dragOY=e.clientY-r.top;
    e.preventDefault();
  });
  // 리사이즈 (우하단 핸들)
  document.addEventListener('mousedown',function(e){
    if(!floating)return;
    const rh=document.getElementById('bk-resize-handle');
    if(!rh||!rh.contains(e.target))return;
    const d=getDlg();if(!d)return;
    resizing=true;
    const r=d.getBoundingClientRect();
    const s=window._gsScale||1;
    resOX=e.clientX;resOY=e.clientY;resW=r.width/s;resH=r.height/s;
    e.preventDefault();e.stopPropagation();
  });
  document.addEventListener('mousemove',function(e){
    const d=getDlg();if(!d)return;
    // 스테이지 transform:scale 보정 — 마우스 이동을 스테이지 좌표계로 변환
    const s=window._gsScale||1;
    if(dragging){
      const nx=(e.clientX-dragOX)/s,ny=(e.clientY-dragOY)/s;
      const mw=(typeof STAGE_W!=='undefined'?STAGE_W:window.innerWidth);
      const mh=(typeof STAGE_H!=='undefined'?STAGE_H:window.innerHeight);
      const r=d.getBoundingClientRect();
      const rw=r.width/s,rh=r.height/s;
      d.style.left=Math.max(0,Math.min(nx,mw-rw))+'px';
      d.style.top=Math.max(0,Math.min(ny,mh-36))+'px';
    }
    if(resizing){
      const nw=Math.max(280,resW+(e.clientX-resOX)/s);
      const nh=Math.max(80,resH+(e.clientY-resOY)/s);
      d.style.width=nw+'px';d.style.height=nh+'px';
    }
  });
  document.addEventListener('mouseup',function(){
    if(dragging||resizing)saveState();
    dragging=false;resizing=false;
  });
  // 분리 모드 저장 상태 강제 정리 (이전 분리 상태로 켜진 사용자 보호)
  try{
    const saved=JSON.parse(localStorage.getItem(STORE_KEY)||'{}');
    if(saved.floating){
      // 옛 floating 상태 클리어
      localStorage.removeItem(STORE_KEY);
    }
  }catch(e){}
  // collapse 상태 복원
  try{
    const collapsed=localStorage.getItem('de_bk_collapsed')==='1';
    if(collapsed){
      document.addEventListener('DOMContentLoaded',function(){
        const d=getDlg();if(d)d.classList.add('bk-collapsed');
      });
    }
  }catch(e){}
})();
function show(id){SCREENS.forEach(s=>document.getElementById(s)?.classList.remove('on'));document.getElementById(id)?.classList.add('on');document.getElementById('hud').classList.toggle('on',id==='s-hub');
  // 백구 패널: 허브 화면에서만 표시
  const bkEl=document.getElementById('bkdialog');
  if(bkEl){
    if(id==='s-hub'){
      // 허브 진입 시 float 상태 해제 + 정상 위치 복원 (문서 흐름 방식)
      bkEl.classList.remove('bk-floating');
      bkEl.style.position='';bkEl.style.left='';bkEl.style.top='';
      bkEl.style.right='';bkEl.style.bottom='';
      bkEl.style.width='';bkEl.style.height='';bkEl.style.maxHeight='';
      bkEl.style.display='flex';
      window._bkFloating=false;
      if(typeof window._bkSetFloating==='function')window._bkSetFloating(false);
      updateFleetBar();
    } else {
      bkEl.style.display='none';
    }
  }
}

// ═══ STAGE FIT ═══════════════════════════════════════════════
// 1536x864 기본 사이즈 — 뷰포트에 맞춰 비례 축소·확대 (letterbox)
// 모바일 세로 화면(아임웹 iframe 등)에서는 자동으로 90도 회전하여 가로 표시
const STAGE_W=1536,STAGE_H=864;
window._gsScale=1;
window._gsRotated=false;
// 디스플레이 모드 — auto(뷰포트 자동) / fhd(1920×1080 캡) / qhd(2560×1440 캡) / mobile(모바일 강제)
window._displayMode='auto';
try{const _dm=localStorage.getItem('de_display_mode');if(_dm)window._displayMode=_dm;}catch(e){}
function setDisplayMode(mode){
  if(!['auto','fhd','qhd','mobile'].includes(mode))mode='auto';
  window._displayMode=mode;
  try{localStorage.setItem('de_display_mode',mode);}catch(e){}
  fitGameStage();
}
try{if(typeof window!=='undefined')window.setDisplayMode=setDisplayMode;}catch(e){}
function fitGameStage(){
  const vw=window.innerWidth,vh=window.innerHeight;
  const mode=window._displayMode||'auto';
  // 모바일 모드: 강제 세로 회전 (사용자 기기 방향 무관)
  // 그 외: 뷰포트 세로가 더 크면 자동 회전 (이전 동작 유지)
  const isPortrait=mode==='mobile'?true:(vh>vw);
  const stage=document.getElementById('game-stage');
  if(!stage){window.addEventListener('DOMContentLoaded',fitGameStage,{once:true});return;}
  // 디스플레이 모드별 최대 스케일 — 1920/2560 폭 캡 (실제 렌더 픽셀 제한)
  // 1536 base width × cap_scale = 목표 max 폭
  let maxScale=Infinity;
  if(mode==='fhd')maxScale=1920/STAGE_W;       // ≈ 1.25 (1920×1080)
  else if(mode==='qhd')maxScale=2560/STAGE_W;  // ≈ 1.67 (2560×1440)
  // auto/mobile은 캡 없음
  if(isPortrait){
    const sx=vh/STAGE_W;
    const sy=vw/STAGE_H;
    let s=Math.min(sx,sy);
    if(mode==='fhd'||mode==='qhd')s=Math.min(s,maxScale);
    window._gsScale=s;
    window._gsRotated=true;
    document.documentElement.style.setProperty('--gs',s);
    stage.style.transform=`translate(-50%,-50%) rotate(90deg) scale(${s})`;
    stage.style.transformOrigin='center center';
    stage.style.position='absolute';
    stage.style.left='50%';
    stage.style.top='50%';
    document.body.style.overflow='hidden';
  } else {
    const sx=vw/STAGE_W;
    const sy=vh/STAGE_H;
    let s=Math.min(sx,sy);
    if(mode==='fhd'||mode==='qhd')s=Math.min(s,maxScale);
    window._gsScale=s;
    window._gsRotated=false;
    document.documentElement.style.setProperty('--gs',s);
    stage.style.transform=`scale(${s})`;
    stage.style.transformOrigin='center center';
    stage.style.position='';
    stage.style.left='';
    stage.style.top='';
  }
}
fitGameStage();
window.addEventListener('resize',fitGameStage);
window.addEventListener('orientationchange',()=>setTimeout(fitGameStage,200));

// ═══ STARS ════════════════════════════════════════════════════
(function(){
  const cv=document.getElementById('star-bg'),ctx=cv.getContext('2d');
  const stars=[];function resize(){cv.width=STAGE_W;cv.height=STAGE_H;}resize();window.addEventListener('resize',resize);
  for(let i=0;i<180;i++)stars.push({x:Math.random(),y:Math.random(),r:Math.random()*1.4+.3,a:Math.random(),spd:Math.random()*.005+.001,ph:Math.random()*Math.PI*2});
  function draw(t){ctx.clearRect(0,0,cv.width,cv.height);stars.forEach(s=>{const a=s.a*(.4+.6*Math.abs(Math.sin(t*s.spd+s.ph)));ctx.fillStyle=`rgba(255,255,255,${a})`;ctx.beginPath();ctx.arc(s.x*cv.width,s.y*cv.height,s.r,0,Math.PI*2);ctx.fill();});requestAnimationFrame(draw);}
  requestAnimationFrame(draw);
})();

// ═══ HUD ════════════════════════════════════════════════════
// 진행 중인 전투로 복귀
function resumeCombat(){
  if(!combatState||combatState.done){notify('진행 중인 전투가 없습니다','warn');_updateResumeBtn();return;}
  // hubTab('combat')에는 렌더 분기가 없으므로 직접 renderCombatView 호출
  G._currentHubTab='combat';
  const body=document.getElementById('hub-body');
  if(!body){notify('허브 미초기화 — 잠시 후 다시 시도하세요','err');return;}
  try{
    renderCombatView(body);
    if(typeof setHubNav==='function')setHubNav('combat');
    // 캔버스 재초기화 + 애니메이션 재시작
    requestAnimationFrame(()=>{
      try{
        if(typeof initCombatCanvas==='function')initCombatCanvas();
        // 마지막 적/아군 위치/HP를 즉시 그려서 빈 화면 방지
        if(typeof drawCombatFrame==='function')drawCombatFrame();
        if(typeof _cbStartAnimLoop==='function')_cbStartAnimLoop();
        // BGM 재생
        try{AudioMgr.playBgm(combatState.isBoss?'boss':'combat');}catch(e){}
      }catch(e){console.error('combat resume failed',e);}
    });
    notify('⚔️ 전투 화면으로 복귀','ok');
  }catch(e){
    console.error('resumeCombat failed',e);
    notify('전투 복귀 실패: '+e.message,'err');
  }
  _updateResumeBtn();
}
// 전투 복귀 버튼 표시/숨김 — HUD 우측 상단
function _updateResumeBtn(){
  const btn=document.getElementById('h-resume-combat');
  if(!btn)return;
  const hasActiveCombat=combatState&&!combatState.done;
  const onCombatTab=G._currentHubTab==='combat';
  btn.style.display=(hasActiveCombat&&!onCombatTab)?'inline-block':'none';
}
function updateHUD(){updateGatherBtn();_updateResumeBtn();
  const pd=PLANET_DEF.find(p=>p.id===G.currentPlanet);
  document.getElementById('h-co').textContent=G.profile.company;
  const _cmdEl=document.getElementById('hub-cmd');if(_cmdEl)_cmdEl.textContent=G.profile.name||'사령관';
  document.getElementById('h-pl').textContent=`| ${pd?.nm||G.currentPlanet}`;
  document.getElementById('h-cr').textContent=G.credits.toLocaleString();
  document.getElementById('h-ve').textContent=G.voidEssence.toLocaleString();
  document.getElementById('h-vc').textContent=G.voidCrystal;
  const _repEl=document.getElementById('h-rep');if(_repEl)_repEl.textContent=(G.reputation||0).toLocaleString();
  const _repRk=getRepRank(G.reputation||0),_repRkEl=document.getElementById('h-rep-rank');
  if(_repRkEl){_repRkEl.textContent=_repRk.ic+' '+_repRk.lb;_repRkEl.style.color=_repRk.col;_repRkEl.style.borderColor=_repRk.col;}
  document.getElementById('h-act').textContent=G.act;
  document.getElementById('h-tn').textContent=G.turn;
  const _lv=calcPlayerLevel(),_rank=getLevelRank(_lv);
  const lvEl=document.getElementById('h-lv'),rkEl=document.getElementById('h-lv-rank');
  if(lvEl){lvEl.textContent='전투력 '+_lv;lvEl.style.color=_rank.col;}
  if(rkEl){rkEl.textContent=_rank.lb;rkEl.style.color=_rank.col;}
  const sbCr=document.getElementById('sb-cr'),sbVe=document.getElementById('sb-ve'),sbVc=document.getElementById('sb-vc');
  if(sbCr)sbCr.textContent=G.credits.toLocaleString();
  if(sbVe)sbVe.textContent=G.voidEssence.toLocaleString();
  if(sbVc)sbVc.textContent=G.voidCrystal;
  const pl=document.getElementById('hub-planet-lbl');if(pl)pl.textContent=pd?.nm||G.currentPlanet;
  // 행성 배경 이미지 교체
  const hubBg=document.getElementById('hub-planet-bg');
  if(hubBg){
    const _bgSrc=planetBgSrc(G.currentPlanet);
    const targetBg='url('+_bgSrc+')';
    const targetOp=(G._currentHubTab==='main')?'1.0':'.0';
    // 키: 행성ID + 해방여부 (P31 해방 시 이미지 교체를 즉시 반영)
    const _key=G.currentPlanet+(G.currentPlanet==='P31'&&_isEarthFree()?'#free':'');
    if(hubBg._loadedPlanet!==_key){
      hubBg._loadedPlanet=null;
      const bgImg=new Image();
      bgImg.onload=function(){
        hubBg.style.backgroundImage=targetBg;
        hubBg._loadedPlanet=_key;
        hubBg.style.opacity=targetOp;
      };
      bgImg.onerror=function(){
        // .jpg 실패 시 .png fallback
        const _fbSrc=planetBgFallback(G.currentPlanet);
        if(_bgSrc!==_fbSrc){
          const fb=new Image();
          fb.onload=function(){hubBg.style.backgroundImage='url('+_fbSrc+')';hubBg._loadedPlanet=_key;hubBg.style.opacity=targetOp;};
          fb.onerror=function(){hubBg.style.backgroundImage='none';hubBg._loadedPlanet=_key;};
          fb.src=_fbSrc;
        }else{
          hubBg.style.backgroundImage='none';
          hubBg._loadedPlanet=_key;
        }
      };
      bgImg.src=_bgSrc;
    } else {
      hubBg.style.opacity=targetOp;
    }
  }
}

// ═══ NOTIFY ════════════════════════════════════════════════════
function notify(msg,type='info'){
  const el=document.createElement('div');el.className=`ni${type==='ok'?' ok':type==='err'?' err':type==='gold'?' gold':type==='pur'?' pur':''}`;
  el.textContent=msg;document.getElementById('notif').appendChild(el);
  setTimeout(()=>{el.style.opacity='0';setTimeout(()=>el.remove(),400);},2800);
}
// ─── 캐릭터 초상 매핑 (대사 인트로/팝업 공통) ──────────────────
// 화자 이름 → 이미지 경로. 새 인물 추가 시 img/chars/<file>.png 넣고 여기에 한 줄 추가.
const CHAR_PORTRAITS={
  '백구':'img/chars/baekgu.png',
  '팔콘 스카우트':'img/chars/Void_Hiden.png',
  '⚠️ 통신 수신 ⚠️':'img/chars/Void_Hiden.png'
  // 예: '우르사 메이저':'img/chars/ursa.png',
  // 예: '이순신':'img/chars/sunsin.png',
};
// 인라인 백구 아이콘 — 이모지 자리에 작은 이미지 노출. 로드 실패 시 🐕 폴백.
function _baekguIcon(size){
  size=size||20;
  return `<img src="img/chars/baekgu.png" alt="백구" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;vertical-align:middle;background:rgba(0,0,0,.3)" onerror="this.outerHTML='<span style=&quot;font-size:${Math.round(size*0.9)}px;line-height:1&quot;>🐕</span>'">`;
}
const _CHAR_PORTRAITS_DUMMY={ // 아래는 더이상 사용 안 함 (위에서 닫힘) — 호환용 빈 객체

  // 예: '광개토대왕':'img/chars/gwanggaeto.png'
};
// 화자용 초상 HTML 반환 (이미지가 매핑되어 있으면 <img>, 아니면 폴백 이모지)
function charPortraitHTML(speaker, fallbackEmoji, size, borderColor){
  size=size||54;
  borderColor=borderColor||'var(--cyan)';
  const src=CHAR_PORTRAITS[speaker];
  if(src){
    return `<img src="${src}" alt="${speaker}" style="width:${size}px;height:${size}px;object-fit:cover;border-radius:50%;background:var(--panel);border:2px solid ${borderColor};flex-shrink:0;box-shadow:0 0 12px ${borderColor}66" onerror="this.outerHTML='<div style=\\'font-size:${Math.round(size*0.85)}px;flex-shrink:0\\'>${fallbackEmoji||'⚑'}</div>'">`;
  }
  return `<div style="font-size:${Math.round(size*0.85)}px;flex-shrink:0;width:${size}px;text-align:center">${fallbackEmoji||'⚑'}</div>`;
}
function baekgu(text){
  const msgs=document.getElementById('bk-msgs');
  if(!msgs)return;
  const el=document.createElement('div');
  el.className='bk-msg';
  const now=new Date();
  const ts=now.getHours().toString().padStart(2,'0')+':'+now.getMinutes().toString().padStart(2,'0');
  el.innerHTML=`<span style="color:var(--muted);font-size:11px;margin-right:4px">${ts}</span>${text}`;
  msgs.appendChild(el);
  while(msgs.children.length>10)msgs.removeChild(msgs.firstChild);
  msgs.scrollTop=msgs.scrollHeight;
}
function askBaekgu(){
  const inp=document.getElementById('bk-ask-input');
  if(!inp)return;
  const q=(inp.value||'').trim();
  if(!q){baekgu('응? 뭔가 물어봐야 대답하지.');inp.focus();return;}
  // 유저 질문 표시
  const msgs=document.getElementById('bk-msgs');
  if(msgs){
    const now=new Date();const ts=now.getHours().toString().padStart(2,'0')+':'+now.getMinutes().toString().padStart(2,'0');
    const qEl=document.createElement('div');qEl.className='bk-msg';
    qEl.innerHTML=`<span style="color:var(--muted);font-size:11px;margin-right:4px">${ts}</span><span style="color:rgba(200,220,255,.7)">📡 ${q}</span>`;
    msgs.appendChild(qEl);while(msgs.children.length>12)msgs.removeChild(msgs.firstChild);msgs.scrollTop=msgs.scrollHeight;
  }
  inp.value='';
  // 키워드 매칭 힌트
  const Q=q.toLowerCase();
  const KW=[
    // 크레딧/돈
    {k:['크레딧','돈','자금','수입','벌','earn'],r:()=>`크레딧은 ① 특산물 무역(싸게 사서 비싸게 팔기) ② 퀘스트 보상 ③ 해적 퇴치 ④ 행성 소유 세금 순으로 효율 좋아. 퀘스트/해적 보상은 명성 높을수록 배율 올라가.`},
    // 무역
    {k:['무역','특산물','상품','거래','trade'],r:()=>`행성마다 팩션 특산물이 달라. 전투력·명성 조건 충족해야 고급 특산물 구매 가능해. 싸게 사서 다른 행성에서 팔면 돼. 화물칸 늘리면 한번에 더 많이 실어.`},
    // 함선
    {k:['함선','배','ship','거래소','중형','대형','전설기함'],r:()=>`함선 거래소: 중형=전투력 200+, 대형=전투력 400+, 전설·신화=전투력 600+ 필요. 정비소에서 수리·파츠·크루 배치 가능. 도크 메뉴 1번이 정비소야.`},
    // 파츠/장착
    {k:['파츠','part','무기','실드','장갑','엔진','장착','업그레이드'],r:()=>`함선 도크 → 정비소에서 파츠 장착. 레이져(ATT)·미사일(ATT)·실드(INT/SH)·장갑(HP)·엔진(TEC) 순으로 구매 가능. 레이져는 쉴드에, 미사일은 장갑에 약해.`},
    // 크루/동료
    {k:['크루','동료','영입','가챠','뽑기','crew'],r:()=>`크루는 주점 가챠로 뽑거나 퀘스트 클리어 시 전설 동료 합류. 정비소에서 탑승시키면 ATT·INT·TEC 상승. 기본 24명 + 전설·스토리 크루 1명당 +4 / 영웅 등급 1명당 +2. 현재 한도: ${getMaxCrewCount()}명.`},
    // 영웅
    {k:['영웅','hero','특수','스킬','능력'],r:()=>{const hc=(G.heroes||[]).length;return`영웅 ${hc}/8명 보유. 퀘스트 완료 시 10% 확률로 이순신·장영실·광개토·가가린·넬슨·아인슈타인·테슬라·마르코 중 미보유 영웅 영입 이벤트 발생. 영웅마다 고유 스킬 있어.`;}},
    // 행성 허브 잠금
    {k:['잠금','허브','개방','시설','unlock'],r:()=>{const pid=G.currentPlanet,prog=getPlanetHubProgress(pid),thr=getPlanetHubThreshold(pid);const unlocked=isPlanetHubUnlocked(pid);return`현재 행성 허브 진행: ${prog}/${thr}${unlocked?' ✅ 해금 완료':''}. 모든 행성 10회 해금 필요. 해금 전 해적 100% 출현, 보상 50% 감소. 해금 후 정상 보상 복구.`;}},
    // 행성/탐험
    {k:['행성','탐험','지도','경로','항로','fog','안개','어둠'],r:()=>`은하 지도에서 인접 행성으로만 이동 가능해. 이동 시 50% 확률로 해적 조우. 3턴 이상 체류하면 해적 기습 발생. 전투력 높여서 여행해.`},
    // 퀘스트
    {k:['퀘스트','임무','quest','수락','보상'],r:()=>`퀘스트 완료 시 크레딧+설계도+영웅(10%)+전설 동료 보상. 퀘스트/해적 퇴치 누적으로 허브 시설 개방돼. 보상 크레딧은 명성 배율 적용.`},
    // 설계도/제작
    {k:['설계도','제작','craft','만들기','전설 아이템','신화 아이템','제작소'],r:()=>`퀘스트 클리어 시 5% 확률로 설계도 드랍. 도크 → 제작소에서 특산물 재료 소모해 전설/신화 함선·파츠 제작 가능. 전설 창고 확장 파츠도 링4+ 행성 퀘스트 3% 확률.`},
    // 보이드
    {k:['보이드','void','에센스','균열','7링'],r:()=>`보이드 에센스(VE)는 7링 균열지대(P27~P30) 탐험 보상. VE 1000마다 경매 추가 낙찰 1개. 보이드 허브는 퀘스트/해적 10회 달성 필요. 전설기함도 판매해.`},
    // 치크스/전투
    {k:['치크스','chix','적','전투','combat','싸움'],r:()=>`치크스(보라색 적대 행성) 격파 시 크레딧+명성 획득. 나포 확률 있어 — 적 HP 50% 이하에서 23% 이하 확률. 함선 파츠·크루 충분히 갖춰야 이겨.`},
    // 보스/최종전
    {k:['보스','boss','우르사','최종','지구','해방'],r:()=>{const hc=(G.heroes||[]).length,fc=G.fleet.length,cr=G.credits;return`최종전 조건: 치크스 행성 5개 격파 + 영웅 6명(현재 ${hc}) + 함선 6척(현재 ${fc}) + ₡50만(현재 ₡${cr.toLocaleString()}). 조건 맞으면 은하 지도에서 🌍 지구 클릭!`;}},
    // 경매/행성 구매
    {k:['경매','행성 구매','부동산','auction','소유','세금'],r:()=>{const rep=G.reputation||0,max=1+Math.floor(rep/10);return`행성 프론트 → 경매에서 행성 구매 가능. 소유하면 매 턴 세금 수입. 최대 소유 ${max}개 (명성 ${rep}). 명성 10당 +1개 추가.`;}},
    // 저장/불러오기
    {k:['저장','세이브','save','불러오기','load','슬롯'],r:()=>`상단 메뉴 또는 설정에서 슬롯 1~3 저장/불러오기. 자동저장은 주요 이벤트마다 실행돼.`},
    // 블링크 엔진
    {k:['블링크','blink','순간이동','워프'],r:()=>`블링크 엔진(E15)을 전체 함선에 장착하면 은하 어디든 순간이동 가능. 도크 → 정비소 → 파츠 → 엔진 탭에서 구매.`},
    // 명성/평판
    {k:['명성','평판','reputation','랭크','레벨'],r:()=>{const lv=calcPlayerLevel(),rep=G.reputation||0;return`현재 레벨 ${lv}, 명성 ${rep} (상단 HUD ⭐ 표시). 퀘스트·해적 퇴치 시 +1, 전투 패배 시 -2. 명성 높을수록 가챠 확률·퀘스트 보상 배율 상승.`;}},
    // 해적
    {k:['해적','pirate','약탈','항로','조우'],r:()=>`모든 행성 이동 시 50% 확률로 해적 조우! 해적 퇴치하면 크레딧+명성+1. 퇴치 누적으로 행성 허브도 개방돼. 전투력 충분히 키우고 이동해.`},
    // 나포
    {k:['나포','포획','capture','적 함선'],r:()=>`적 HP 50% 이하에서 나포 가능 — 기본 확률 최대 23%. 나포 성공 시 적 함선 획득. 크리그(F04) 행성에서 +3% 보너스.`},
    // 힌트/도움
    {k:['힌트','help','도움','뭐','어떻게','모르겠','어디'],r:()=>getBaekguStoryHint()},
  ];
  const pd=PLANET_DEF.find(p=>p.id===G.currentPlanet);
  // 현재 행성 관련 질문
  if(Q.includes('여기')||Q.includes('이 행성')||Q.includes('현재')||Q.includes('지금')){
    const fac=pd?FACTION[pd.f]:null;
    setTimeout(()=>baekgu(`지금 위치: ${pd?.nm||'?'} (${fac?.nm||'?'} 팩션, 링 ${pd?.ring||'?'}). 행성 광장에서 퀘스트·상점·주점 이용 가능.`),300);
    return;
  }
  let found=false;
  for(const entry of KW){
    if(entry.k.some(k=>Q.includes(k))){
      const ans=typeof entry.r==='function'?entry.r():entry.r;
      setTimeout(()=>baekgu(ans),300);
      found=true;break;
    }
  }
  if(!found){
    const fallbacks=[
      `"${q}"? 그건 나도 잘 모르겠는데. 더 구체적으로 물어봐. 예: '크레딧 버는 법', '영웅 영입', '보스 조건'`,
      `${q}... 음. 은하계 경로 탐험하면 대부분 해결돼. 아니면 퀘스트 수락해봐.`,
      `좋은 질문인데 나도 애매해. '제작', '크루', '함선', '영웅' 같은 단어로 다시 물어봐.`
    ];
    setTimeout(()=>baekgu(fallbacks[Math.floor(Math.random()*fallbacks.length)]),300);
  }
}
function randomBaekgu(key){
  const m={travel:["이동 완료. 다음 목표 정해.","워프 성공."],combat_win:["이겼어. 당연한 거 아닌가.","크레딧 벌었다."],combat_lose:["졌어. 다시 해.","포기하면 안 돼."],gacha_hero:["영웅 등급! 쓸만하겠는데."],gacha_legend:["전설 등급이다!"],low_credits:["크레딧 부족해. 무역해."]};
  const arr=m[key];if(arr)baekgu(arr[Math.floor(Math.random()*arr.length)]);
}
// 순간이동 가능 엔진(블링크 E15 / 신화 타키온 ME01 / 세트 테슬라 SE01) 전체 장착 여부
// 각 함선마다 셋 중 하나라도 장착돼 있으면 인정 (상위 엔진은 블링크 대체)
const WARP_ENGINE_IDS=['E15','ME01','SE01'];
function hasBlinkOnAll(){
  if(!G.fleet||G.fleet.length===0)return false;
  return G.fleet.every(s=>(s.parts||[]).some(pid=>WARP_ENGINE_IDS.includes(pid)));
}
// 스토리 진행 힌트 — 게임 상태 기반 맥락형
function getBaekguStoryHint(){
  const plv=calcPlayerLevel();
  const ownedCount=Object.values(G.planets).filter(p=>p.owned).length;
  const heroCount=G.heroes.length;
  const fleetSize=G.fleet.length;
  const blink=hasBlinkOnAll();
  const chix=G.chixWaves||0;
  const rep=G.reputation||0;
  // 최우선 1: 워프 엔진 미완성 유도 (소소한 미흡 안내)
  if(fleetSize>1&&!blink){
    const lacking=G.fleet.filter(s=>!(s.parts||[]).some(pid=>WARP_ENGINE_IDS.includes(pid))).length;
    return `📍 다음 할 일: 워프 엔진을 ${lacking}척에 더 장착하면 은하 어디든 순간이동! (블링크 ₡750k 또는 타키온/테슬라 퀘스트 보상)`;
  }
  // ACT 1 힌트 (조건: 20턴 안에 ACT 2 진입)
  if(G.act===1){
    if(heroCount===0)return '📍 다음 할 일: 첫 영웅 영입! 행성을 탐험하고 퀘스트 클리어 — 30% 확률로 전설 영웅 등장.';
    if(fleetSize<3)return '📍 다음 할 일: 함선 3척 이상으로! 함선 도크 → 거래소에서 중형함 구매 (M01 그리핀 ₡35k).';
    if(G.credits<50000)return '📍 다음 할 일: 크레딧 모으기! 행성 상점에서 특산물 무역 또는 퀘스트 수락 (₡200k 목표).';
    if(ownedCount===0)return '📍 다음 할 일: 행성 1개 낙찰! 행성 프론트 → 경매에서 매입 → 턴마다 세금 ₡들어옴.';
    return `🎯 ACT 1 목표 → ACT 2 (20턴 도달): 영웅 1명+ · 함선 3척+ · ₡50k+ · 행성 1개+ | 현재 ${G.turn}/20턴, 전투력 ${plv}`;
  }
  // ACT 2 힌트 (조건: 40턴 안에 ACT 3 진입)
  if(G.act===2){
    if(heroCount<4)return `📍 다음 할 일: 영웅 4명 영입! 현재 ${heroCount}/4명. 행성마다 1명씩 숨어있음 (행성당 최대 2명, 명성 100+ 시 가챠도).`;
    if(chix===0)return '📍 다음 할 일: 치크스(보라색 1링) 행성 첫 접근! TOI-700d·케플러-452b·우르사-알파 중 하나로 이동.';
    if(ownedCount<3)return `📍 다음 할 일: 행성 3개 소유! 현재 ${ownedCount}개. 세금 자동 수입으로 자금 안정화.`;
    if(rep<100)return `📍 다음 할 일: 명성 100+! 현재 ${rep}. 퀘스트/해적 격파/대량 거래로 누적 → 전설 설계도 해금.`;
    if(chix>=5)return `📍 다음 할 일: ACT 3까지 ${40-G.turn}턴! 치크스 ${chix}회 격파 — 영웅 6명·함대 6척·₡50만 갖춰.`;
    return `🎯 ACT 2 목표 → ACT 3 (40턴 도달): 치크스 5회+ 격파 · 영웅 6명+ · 행성 3개+ · 명성 100+ | 현재 ${G.turn}/40턴`;
  }
  // ACT 3 힌트 (조건: 60턴 자동 ACT 4 또는 우르사 메이저 격파)
  if(G.act===3){
    const cheeksCleared=(G.combatHistory||[]).filter(c=>c.win&&(c.planet.includes('치크스')||c.planet.includes('TOI')||c.planet.includes('케플러-452')||c.planet.includes('우르사-알파')||c.planet.includes('오미크론')||c.planet.includes('타이탄-X'))).length;
    if(heroCount<8){const m=8-heroCount;return `📍 다음 할 일: 영웅 ${heroCount}/8명 — ${m}명 더 영입! 행성당 최대 2명 + 가챠 전설의 30%.`;}
    if(cheeksCleared===0)return `📍 다음 할 일: 치크스 적대 행성 1개라도 격파! (TOI-700d, 케플러-452b 등 보라색 1링)`;
    if(cheeksCleared<5)return `📍 다음 할 일: 치크스 ${cheeksCleared}/5개 격파! ${5-cheeksCleared}개 더 처리 → 최종전 자격.`;
    if(fleetSize<6)return `📍 다음 할 일: 함대 ${fleetSize}/6척! 거래소·제작소에서 중·대형 함선 추가.`;
    if(G.credits<500000)return `📍 다음 할 일: ₡${G.credits.toLocaleString()} → ₡500,000 모으기! 거래/세금/퀘스트.`;
    if(!G.voidCrystal||G.voidCrystal<1)return `📍 다음 할 일: 보이드 크리스탈 확보! 7링 균열지대(P27~P30) 탐험 → 보스전 진입 재료.`;
    return `🎯 최종전 준비 완료! 은하 지도에서 🌍 지구 클릭 → 우르사 메이저 격파 → ACT 4 해방기 시작!`;
  }
  // ACT 4 힌트 (엔드게임)
  if(G.act>=4){
    if(ownedCount<20)return `📍 다음 할 일: 행성 ${ownedCount}/30 정복! 명성 ${rep} → ${Math.max(0,30-rep%10)}만 더 모으면 +1 보유 한도.`;
    const _ursaCap=G.fleet.some(s=>s.id&&s.id.startsWith('BOSS_URSA'))||G.reserveFleet?.some(s=>s.id&&s.id.startsWith('BOSS_URSA'));
    if(!_ursaCap)return `📍 다음 할 일: 우르사 메이저 함선 획득! 지구 클릭으로 보스전 재도전 (이미 클리어해도 보너스).`;
    if(heroCount<8)return `📍 다음 할 일: 영웅 ${heroCount}/8 컴플릿! 마지막 영웅 영입으로 턴 쿨다운 -80초.`;
    return `🌟 ACT 4 엔드게임! 자유 항해 — 보이드 7링 균열 완전 정복 · 신화 함선 컴플릿 · 명성 500+ 도전!`;
  }
  return '📍 은하계 경로에서 미탐험 행성 찾아봐. 모든 행성 30개가 다 발견 대기 중!';
}
function openModal(title,bodyHTML,buttons=[],opts={}){
  document.getElementById('modal-t').textContent=title;
  document.getElementById('modal-b').innerHTML=bodyHTML;
  const btns=document.getElementById('modal-btns');btns.innerHTML='';
  buttons.forEach(b=>{const el=document.createElement('button');el.className=`btn btn-sm ${b.cls||''}`;el.textContent=b.txt;el.onclick=b.fn;btns.appendChild(el);});
  const mbox=document.querySelector('#modal-bg .modal');
  if(mbox){
    mbox.classList.toggle('modal-wide',!!opts.wide);
    mbox.classList.toggle('modal-report',!!opts.report);
  }
  const mbg=document.getElementById('modal-bg');
  const wasOpen=mbg.classList.contains('on');
  mbg.classList.add('on');
  if(!wasOpen)try{AudioMgr.playSfx('UI_open',{cooldown:120});}catch(e){}
}
function closeModal(){
  const mbg=document.getElementById('modal-bg');
  const wasOpen=mbg.classList.contains('on');
  mbg.classList.remove('on');
  if(wasOpen)try{AudioMgr.playSfx('ui_close',{cooldown:120});}catch(e){}
}

// ═══ LOADING ════════════════════════════════════════════════════
function runLoading(){
  const fill=document.getElementById('ld-fill'),msg=document.getElementById('ld-msg');
  const msgs=['은하 지도 생성 중...','백구 AI 초기화 중...','우주 데이터 로드 중...','전투 시스템 준비 중...','완료!'];
  let i=0;const iv=setInterval(()=>{i++;fill.style.width=(i*20)+'%';msg.textContent=msgs[Math.min(i-1,msgs.length-1)];
    if(i>=5){clearInterval(iv);setTimeout(()=>{showTitle();if(localStorage.getItem('de_save'))notify('💾 저장 데이터 있음. 이어하기 가능.','ok');},400);}},400);
}

// ═══ TITLE / AGE / FTUE ═══════════════════════════════════════
function showExitModal(){
  openModal('🚪 게임 종료',
    `<div style="text-align:center;padding:12px">
      <div style="margin-bottom:12px">${_baekguIcon(58)}</div>
      <div style="color:var(--yellow);font-size:18px;font-weight:bold;margin-bottom:8px">정말 종료하시겠습니까?</div>
      <div style="color:var(--dim);font-size:14px;line-height:1.8">
        현재 진행 상황 TURN ${G.turn}<br>
        보유 크레딧 ₡${G.credits.toLocaleString()}<br>
        <span style="color:var(--muted);font-size:12px">※ 저장 후 종료를 권장합니다</span>
      </div>
    </div>`,
    [
      {txt:'💾 저장 후 종료',fn:()=>{saveGame(false);setTimeout(()=>{try{window.close();}catch(e){}showTitle();closeModal();},400);},cls:'btn-gold'},
      {txt:'🚪 저장 없이 종료',fn:()=>{try{window.close();}catch(e){}showTitle();closeModal();},cls:'btn-red'},
      {txt:'취소',fn:closeModal,cls:'btn-sm'}
    ]
  );
}
function showTitle(){show('s-title');try{AudioMgr.playBgm('Title');}catch(e){}}
function goAgeGate(){show('s-agegate');}
function checkAge(){
  const y=parseInt(document.getElementById('ag-y').value),m=parseInt(document.getElementById('ag-m').value),d=parseInt(document.getElementById('ag-d').value);
  const err=document.getElementById('ag-err');
  if(!y||!m||!d||y<1900||y>2015){err.textContent='올바른 생년월일을 입력해 주세요.';return;}
  const birth=new Date(y,m-1,d),now=new Date();let age=now.getFullYear()-birth.getFullYear();
  if(now.getMonth()<birth.getMonth()||(now.getMonth()===birth.getMonth()&&now.getDate()<birth.getDate()))age--;
  if(age<12){err.textContent='만 12세 이상만 이용 가능합니다.';return;}
  if(age<18)G.isMinor=true;err.textContent='';syncDiffButtons(_titleDiff);setDifficulty(_titleDiff);show('s-ftue');
}
function setGender(g){
  G.profile.gender=g;
  document.getElementById('gb-m').style.borderColor=g==='male'?'var(--cyan)':'var(--bdr)';
  document.getElementById('gb-m').style.color=g==='male'?'var(--cyan)':'var(--dim)';
  document.getElementById('gb-f').style.borderColor=g==='female'?'var(--cyan)':'var(--bdr)';
  document.getElementById('gb-f').style.color=g==='female'?'var(--cyan)':'var(--dim)';
}
const DIFF_LIST=['easy','normal','hard','extreme'];
const DIFF_COLORS={easy:'var(--cyan)',normal:'var(--yellow)',hard:'#ff8c42',extreme:'var(--red)'};
function setDifficulty(d){
  G.difficulty=d;
  DIFF_LIST.forEach(k=>{
    const btn=document.getElementById('df-'+k);if(!btn)return;
    const active=k===d;
    btn.style.borderColor=active?DIFF_COLORS[d]:'var(--bdr)';
    btn.style.background=active?`rgba(${d==='easy'?'0,243,255':d==='normal'?'222,255,154':d==='hard'?'255,140,66':'255,59,59'},.1)`:'transparent';
    btn.style.color=active?DIFF_COLORS[d]:'var(--dim)';
  });
}
// 설정 모달에서 난이도 변경 (인라인 onclick은 const G에 직접 접근 불가 → 전역 함수로 위임)
function changeDifficultyFromSettings(d){
  G.difficulty=d;
  const lbl={easy:'😊 쉬움',normal:'⚔️ 보통',hard:'💀 어려움',extreme:'☠️ 극악'}[d]||d;
  notify('🎮 난이도 변경: '+lbl,'ok');
  saveGame(true);
  // 설정 모달 다시 렌더 (활성 표시 갱신)
  showSettingsModal();
}
// 난이도 배율: easy=0.9, normal=1.0, hard=1.1, extreme=1.2 (HP+ATK 모두)

// ─── 이미지 썸네일 헬퍼 ─────────────────────────────────────────────
// ═══ SCROLL-SAFE RERENDER ════════════════════════════════════════
// 탭 재렌더 시 스크롤 위치 유지 헬퍼
function rerenderTab(renderFn){
  const body=document.getElementById('hub-body');
  if(!body)return;
  const scrollEl=body.querySelector('.hub-scroll');
  const scrollTop=scrollEl?scrollEl.scrollTop:0;
  // 다중 스크롤 컨테이너 위치 저장 (data-scroll-id 또는 .hub-scroll)
  const saved={};
  body.querySelectorAll('[data-scroll-id]').forEach(el=>{
    const k=el.getAttribute('data-scroll-id');
    if(k)saved[k]=el.scrollTop;
  });
  renderFn(body);
  // 두 번의 rAF 후 복원 — 첫 rAF 직후엔 새 DOM의 scrollHeight가 아직 0일 수 있어 clamp 됨
  function _restore(){
    const newScroll=body.querySelector('.hub-scroll');
    if(newScroll)newScroll.scrollTop=scrollTop;
    body.querySelectorAll('[data-scroll-id]').forEach(el=>{
      const k=el.getAttribute('data-scroll-id');
      if(k&&saved[k]!=null)el.scrollTop=saved[k];
    });
  }
  requestAnimationFrame(()=>{_restore();requestAnimationFrame(_restore);});
}
// ═══ PNG IMAGE SYSTEM ═══════════════════════════════════════════
// PNG 로드 실패시 이모지 폴백 헬퍼
// ── 로어 툴팁 텍스트 (아이템/함선/특산물/재료) ─────────────────────────
const LORE_TEXT={
  // ── 레이저 무기 파츠 ──
  'part_W01':'🔨 정약용이 공구상에서 산 부품으로 하룻밤 만에 조립. "쏘면 되지 않냐"고 했다. 실제로 쐈다.\n📜 이름 유래: 개척 시대 표준 레이저포. 단순해서 오히려 우주 어디서든 현지 수리가 가능하다.\n⚔️ 강점: 저렴하고 범용. 단점: 화력이 빈약해 적을 화나게만 할 수 있다.\n💬 첫 무기로 이걸 선택했다면 당신은 효율주의자다. 또는 크레딧이 없는 것이다.',
  'part_W03':'🔨 파스파토크가 수퍼비아 귀족 연회에서 와인을 엎지르다 영감을 받았다. "에너지를 압축하면 어때?"\n📜 이름 유래: 펄스 캐논. 자기장으로 에너지 밀도를 3배 높인다. 지구 저항군 표준 지급품이었다.\n⚔️ 강점: 화력 대비 가격 우수. 단점: 냉각 시간이 있어 연사 불가.\n💬 와인을 쏟은 덕에 우주 최고의 표준 캐논이 탄생했다. 귀족들이 알면 와인을 더 쏟을 것이다.',
  'part_W05':'🔨 제리다지리가 경쟁적으로 광역 무기를 만들겠다고 선언. 플라즈마 구체 세 발을 동시에 발사하는 구조를 하룻밤에 완성.\n📜 이름 유래: 트리플 플라즈마. 세 발의 구체가 부채꼴로 퍼진다. 밀집 편대 전멸에 최적이다.\n⚔️ 강점: 광역 화력 폭발. 단점: 에너지 소비가 커 연속 발사가 부담스럽다.\n💬 적이 몰려오면 이걸 쓰면 된다. 흩어지면 의미없으니 적들에게 뭉쳐달라고 먼저 부탁해야 한다.',
  'part_W08':'🔨 마사무네가 로봇 팔 때문에 도면 잉크를 흘려 이온 빔 설계도를 망쳤다. 그냥 제출했는데 승인됐다.\n📜 이름 유래: 이온 캐논. 이온 빔으로 적 실드를 순간 교란한다. 방어막 돌파 전문 병기다.\n⚔️ 강점: 실드 무력화. 단점: 숙련된 포수가 아니면 조준이 어렵다.\n💬 실드를 박살내고 싶다면 이것. 근데 조준이 어려워서 박사 수준의 포수가 필요하다.',
  'part_W12':'🔨 알렉스틸이 크레딧을 전부 잃고 분노 상태에서 "한 발로 끝내는 무기"를 목표로 설계.\n📜 이름 유래: 에너지 스파이크. 초경도 에너지 스파이크로 선체를 외과수술처럼 꿰뚫는다.\n⚔️ 강점: 관통 데미지 최상. 단점: 명중률이 낮아 빗나가면 허망하다.\n💬 한 발이 명중하면 게임이 끝난다. 빗나가면 당신의 게임이 끝날 수도 있다.',
  'part_W15':'🔨 뷀란트가 전설의 화포 도면을 보이드 상인에게서 사서 10년간 연구. 완성 직후 "드디어"라고 했다.\n📜 이름 유래: 천공의 철퇴. 에너지가 통과하는 곳에는 어떤 방어막도 남지 않는다.\n⚔️ 강점: 실드+장갑 관통 동시. 단점: 충전 시간이 길다. 그 사이 당신이 먼저 죽을 수 있다.\n💬 10년의 연구 결과. 발사하면 방어막이고 장갑이고 전부 사라진다. 충전 중엔 기도해야 한다.',
  // ── 실드 파츠 ──
  'part_S01':'🔨 정약용이 "없는 것보다는 낫겠지"라는 생각으로 만든 방어막. 실제로 없는 것보다 훨씬 낫다.\n📜 이름 유래: 마이크로 실드. 최소 에너지로 작동하는 기본 방어막. 초보 항법사 필수 장비.\n⚔️ 강점: 전력 소비 극소. 단점: 방어력이 낮아 함선을 살짝 지켜줄 뿐이다.\n💬 우주 모험의 첫 번째 방어막. 있으면 안심, 없으면 불안. 가격이 싸니까 일단 달자.',
  'part_S03':'🔨 최무선이 플라즈마 실험 중 자기 함선을 태울 뻔하고 황급히 방어막 설계. 용접 흔적이 증거다.\n📜 이름 유래: 플라즈마 실드. 다층 플라즈마로 충격을 분산한다. 저항군 표준 장비.\n⚔️ 강점: 방어력 대비 가격 우수. 단점: 용접이 많아서 가끔 에너지가 새기도 한다.\n💬 용접 흔적이 100개가 넘는다. 그게 단점이기도 하고 장점이기도 하다. 어쨌든 버텼으니까.',
  'part_S06':'🔨 파스파토크가 수퍼비아 연구소에서 차원 물리학을 연구하다 "방어막에 쓰면 어때?"라며 방향을 틀었다.\n📜 이름 유래: 포스 필드. 다차원 에너지 필드로 외부 충격을 여러 방향으로 분산시킨다.\n⚔️ 강점: 피해 분산 최상. 단점: 유지 비용이 중간 등급 치고는 높은 편.\n💬 중형급 최고의 방어막. 공격이 닿아도 선체가 흔들리지 않는다. 밥값은 한다.',
  'part_S10':'🔨 제리다지리가 술 한 잔 마시고 "확률로 공격을 무효화하면 어때?"라며 양자역학 논문을 찢어 설계도 대신 썼다.\n📜 이름 유래: 양자 배리어. 양자 파동으로 물질을 확률적으로 분산시킨다. 명중 판정을 무효화하기도 한다.\n⚔️ 강점: 확률적 명중 무효화. 단점: 확률이라 항상 막아주는 건 아니다.\n💬 공격이 "확률적으로" 빗나간다. 행운이 좋은 날은 무적이고, 나쁜 날은 그냥 비싼 장식이다.',
  'part_S15':'🔨 마사무네가 에너지 반사 실험을 하다 자기 실험실을 날려버린 뒤 "이게 방어막이 되겠구나"라고 깨달았다.\n📜 이름 유래: 리플렉션 실드. 에너지 공격을 완전 흡수해 반대편으로 돌려보낸다는 전설의 방패.\n⚔️ 강점: 에너지 공격 반사. 단점: 물리 공격에는 덜 효과적이다.\n💬 실험실을 날린 덕에 전설급 방어막이 탄생했다. 실물을 본 자가 드물다. 마사무네도 두 번 볼까봐 무섭다고 한다.',
  // ── 장갑 파츠 ──
  'part_A01':'🔨 알렉스틸이 야시장에서 합금 자투리를 모아 하룻밤에 제작. "이 정도면 싸고 쓸만하지"\n📜 이름 유래: 기본 장갑판. 탄소복합재와 기초 합금을 압축 성형. 맨 선체보단 훨씬 낫다.\n⚔️ 강점: 저렴함. 단점: 중간급 공격에 두꺼운 종이처럼 찢어질 수 있다.\n💬 없는 것보다 낫다는 말이 딱 맞다. 대신 야시장 물건이니 보증서는 기대하지 말자.',
  'part_A04':'🔨 뷀란트가 전장 데이터를 분석해 "평균적으로 다 버티는 장갑"을 설계. 3년 후 우주 베스트셀러가 됐다.\n📜 이름 유래: 티타늄 합금 장갑. 티타늄-니오브 합금 표준 전투 장갑. 수급이 가장 쉽다.\n⚔️ 강점: 균형 방어, 범용성. 단점: 두드러지는 특성이 없다.\n💬 가장 많이 팔리는 장갑이 가장 좋은 장갑이라는 설이 있다. 뷀란트는 그 설을 증명했다.',
  'part_A08':'🔨 최무선이 초중성자별 탐사 임무 중 파편을 채집해 직접 두드려 만들었다. "이거 엄청 단단하네"\n📜 이름 유래: 중성자별 장갑. 초중성자별 소재를 가공해 만든 고밀도 장갑. 무게 대비 방어력 최상.\n⚔️ 강점: 무게 대비 방어력 극상. 단점: 가공 비용이 비싸다.\n💬 중성자별 파편으로 만든 장갑. 채집할 때 최무선은 살아남았다. 함선도 그래야 한다.',
  'part_A12':'🔨 정약용이 보이드 상인에게서 위상 공간 논문을 샀다. 읽다가 졸렸는데 꿈에서 장갑 설계가 완성됐다.\n📜 이름 유래: 위상 장갑. 위상 공간 왜곡으로 물리 충격을 다른 좌표로 전이시킨다. 이론상 관통 불가.\n⚔️ 강점: 피해 전이. 단점: 이론상 관통 불가지만 실제로는 가끔 뚫린다.\n💬 꿈에서 나온 설계가 전설급 장갑이 됐다. 정약용도 자기 꿈이 맞는지 아직 반신반의한다.',
  'part_A15':'🔨 파스파토크가 40년간의 소재 연구 끝에 완성. "이걸 마지막 작품으로 하겠다"고 선언했다.\n📜 이름 유래: 절대 장갑. 방어의 경지에 도달한 소재. 이 장갑 앞에서 적들은 공격을 포기한다.\n⚔️ 강점: 방어력 전 등급 최상. 단점: 가격이 신화급. 그리고 무겁다.\n💬 40년의 결정체. 이걸 달면 함선이 아니라 요새다. 적들이 공격을 포기한다는 게 사실이다.',
  // ── 엔진 파츠 ──
  'part_E01':'🔨 제리다지리가 학교 교재를 그대로 따라 만든 첫 번째 엔진. 교수가 감동해서 특허를 내줬다.\n📜 이름 유래: 이온 드라이브. 1세대 이온 가속 추진기. 신뢰성 1위, 속도는 꼴찌에 가깝다.\n⚔️ 강점: 고장이 거의 없다. 단점: 빠르게 가고 싶다면 포기해야 한다.\n💬 교재 그대로 만들었는데 전설이 됐다. 신뢰성은 최고. 빠르기는... 기대하지 말자.',
  'part_E04':'🔨 마사무네가 폐기된 플라즈마 발전기를 분해하다 "배기를 다시 쓰면 되겠네"라고 재활용 아이디어를 떠올렸다.\n📜 이름 유래: 플라즈마 드라이브. 플라즈마 배기를 재활용해 추력을 높인다. 메카니카 표준 엔진.\n⚔️ 강점: 연비 우수, 추력 안정. 단점: 배기 재활용 특성상 최고 속도 제한이 있다.\n💬 폐기물로 만든 엔진이 표준이 됐다. 환경을 생각하는 우주인들이 가장 좋아한다.',
  'part_E08':'🔨 알렉스틸이 크레딧을 잃고 도망치다 영감을 받았다. "짧은 거리를 순간적으로 뛰어넘으면 어때?"\n📜 이름 유래: 퀀텀 점프. 양자 터널링 추진으로 단거리 도약이 가능한 엔진. 도망 전문.\n⚔️ 강점: 단거리 점프. 단점: 장거리 이동에는 적합하지 않다.\n💬 도망치다 탄생한 엔진. 알렉스틸은 도망에 성공했고 그 덕에 우리 모두가 혜택을 받는다.',
  'part_E12':'🔨 뷀란트가 시공간 곡률 논문을 읽다가 커피를 쏟았다. 젖은 논문이 하이퍼드라이브 설계의 핵심이 됐다.\n📜 이름 유래: 하이퍼드라이브. 시공간 곡률을 이용한 하이퍼점프 엔진. 별과 별 사이를 순식간에 이동.\n⚔️ 강점: 장거리 이동 최적화. 단점: 점화 에너지 소비가 매우 크다.\n💬 커피를 쏟아서 완성된 하이퍼드라이브. 뷀란트는 지금도 커피를 논문에 의도적으로 흘린다.',
  'part_E15':'🔨 최무선이 보이드 공간에서 조난 중 "공간을 접으면 되지 않나"라는 생각으로 조난 중에 설계했다.\n📜 이름 유래: 폴드 드라이브. 공간 자체를 접어 순간이동. 물리 법칙이 깨진 자리만 남긴다.\n⚔️ 강점: 공간 도약, 이동 후 스텔스. 단점: 기술이 불안정해 가끔 엉뚱한 곳에 도착한다.\n💬 조난 중에 설계한 엔진. 최무선은 조난에서 탈출했다. 이 엔진 덕분인지는 본인도 모른다.',
  // ── 미사일 무기 파츠 ──
  'part_ML01':'🔨 이강호 박사가 지구 저항군 게릴라 부대 요청으로 개발. "싸고 은밀하게 터지는 걸 원한다"고 했다.\n📜 이름 유래: 열추적 미사일. 경량 열추적 유도. 저항군 게릴라 표준 장비. 은밀하게 작동한다.\n⚔️ 강점: 저렴하고 열원이 있으면 반드시 명중. 단점: 강력한 냉각 시스템을 가진 적엔 무용.\n💬 싸고 잘 맞는다. 이강호 박사가 원하는 게 이것이었다. 적도 원하지 않았으면 좋겠다.',
  'part_ML02':'🔨 파스파토크가 크리그 화산에서 마그마 코어 에너지를 연구하다 "탄두에 봉인하면 어때?"라는 아이디어.\n📜 이름 유래: 마그마 미사일. 크리그 화산 마그마 코어 에너지를 탄두에 봉인. 폭발 온도 태양 이상.\n⚔️ 강점: 폭발 위력 최상. 단점: 탄두가 불안정해 취급 부주의 시 발사자도 위험하다.\n💬 태양보다 뜨거운 폭발. 적이 녹기 전에 파스파토크도 조심해야 한다. 현장에서 멀리 있어야 한다.',
  'part_ML03':'🔨 제리다지리가 보이드 반물질 실험을 하다 "이걸로 미사일을 만들면 거리 관계없이 맞히겠네"라고 했다.\n📜 이름 유래: 보이드 추적 미사일. 반물질로 공간을 왜곡해 목표를 추적. 거리 무관 명중.\n⚔️ 강점: 거리 관계없이 명중. 단점: 비용이 크다. 반물질이 싸지 않다.\n💬 우주 끝에서 발사해도 맞는다. 적이 어디 있는지만 알면 된다. 보이드에서 뭔가 잘못된 거지만 잘 된 거다.',
  'part_ML04':'🔨 소피아 모렐이 중력 연구 중 "집속하면 엔진을 봉인할 수 있을 것 같아"라며 군사용으로 전환했다.\n📜 이름 유래: 중력 집속탄. 명중 후 적 엔진 출력을 일시 봉쇄한다. 도망을 막는 병기.\n⚔️ 강점: 적 기동 봉쇄. 단점: 봉쇄 지속 시간이 짧아 후속 공격이 빠르게 이뤄져야 한다.\n💬 도망치려는 적에게 최고다. 모렛룥이 연구 목적을 물으면 "학문적 탐구"라고 한다.',
  'part_ML05':'🔨 드미트리가 AI가 자기보다 포격 실력이 낫다는 걸 알고 분노해서 "AI 미사일 만들어버리겠어"라고 선언.\n📜 이름 유래: AI 자율유도 미사일. 회피 패턴을 실시간 학습해 어떤 함선도 따라잡는다.\n⚔️ 강점: 자율 학습 명중. 단점: AI 오작동 시 엉뚱한 곳을 공격할 수 있다.\n💬 인간 포수보다 AI가 더 잘 맞힌다. 드미트리는 화가 났지만 결과적으로 최고의 무기를 만들었다.',
  'part_ML06':'🔨 마사무네가 아우레우스 태양핵 관측 중 "이걸 발사하면 어떨까"라는 과학자답지 않은 생각을 했다.\n📜 이름 유래: 태양핵 작살. 장갑 관통은 물론 방어막까지 무시하는 전설급 병기.\n⚔️ 강점: 실드+장갑 동시 무시. 단점: 태양핵 연료가 귀해 발사 횟수 제한.\n💬 태양핵이 작살이 됐다. 마사무네는 논문 대신 이걸 발표해서 과학계에서 쫓겨날 뻔했다.',
  'part_ML07':'🔨 정약용이 치크스 결정석 파편을 잔뜩 모아 "한꺼번에 터지면 되겠지"라는 단순한 발상으로 개발.\n📜 이름 유래: 결정석 파쇄탄. 한 발이 터지면 3칸 범위가 동시에 불바다가 된다.\n⚔️ 강점: 광역 폭발. 단점: 결정석 수급이 어려워 충전이 느리다.\n💬 단순함의 승리. 정약용은 복잡한 이론 대신 결정석을 많이 쓰는 방법을 선택했다. 훌륭한 결정이다.',
  'part_MMB01':'🔨 이휘소 박사의 입자물리 방정식이 병기 연구소에 유출돼 실체화된 신화 병기. 본인은 모르고 있었다.\n📜 이름 유래: 마이크로 머터리얼 버스터. 방어막과 장갑을 모두 관통하는 입자 분해 병기.\n⚔️ 강점: 방어막+장갑 동시 관통. 단점: 충전 시간이 매우 길고 발사음이 무섭다.\n💬 이휘소 박사는 이게 병기가 된 걸 알고 화를 냈다. 그런데 본인도 가지고 싶어 한다는 소문이 있다.',
  'part_SMIS01':'🔨 광개토대왕 봉화 체계를 현대 자율유도 레이더에 접목한 세트 병기. 개발자는 역사학자였다.\n📜 이름 유래: 봉화 세트 미사일. 광개토대왕 전술 체계 기반. 세트 완성 시 화력 비약 상승.\n⚔️ 강점: 세트 완성 시 화력 폭발. 단점: 단독 사용 시 능력이 절반이다.\n💬 역사학자가 개발한 병기. "고구려가 현대에 있었으면..."이라는 상상이 현실이 됐다.',
  'part_SARM01':'🔨 고구려 철갑 공법을 우주공학으로 재현. 야금 전문가와 항법사가 함께 3년간 연구했다.\n📜 이름 유래: 세트 장갑 선체. 광개토대왕 세트의 절반. 포화에도 자동 회피 기동 수행.\n⚔️ 강점: 세트 완성 시 회피+방어 동시. 단점: 단독은 평범하다.\n💬 고구려 철갑이 우주에 왔다. 이순신 세트와 다른 분위기. 광개토대왕 느낌이 물씬 풍긴다.',
  // ── 신화 파츠 ──
  'part_MW01':'🔨 알렉스틸이 헤르메스 고대 문서를 해독하다 "이게 설계도였어?"라고 외치고 바로 제작에 들어갔다.\n📜 이름 유래: 헤르메스의 신포. 에너지가 끊이지 않고 흘러나오는 신화 병기. 방아쇠를 당기면 멈추지 않는다.\n⚔️ 강점: 지속 화력 최상. 단점: 제어가 어렵다. 너무 잘 나온다는 게 문제다.\n💬 고대 문서가 설계도였다. 알렉스틸은 고고학자에서 무기 개발자로 직업을 바꿨다.',
  'part_MS01':'🔨 뷀란트가 크로노스 전설을 연구하다 "시간을 멈추는 방어막이 있다면?"이라는 물음에서 시작됐다.\n📜 이름 유래: 크로노스의 방벽. 피격 에너지의 일부를 반사하는 전설의 방어막. 시간이 멈춘 것처럼.\n⚔️ 강점: 피격 에너지 반사. 단점: 완전히 막지는 못한다. 크로노스도 완벽하지 않았다.\n💬 전설을 연구하면 전설이 된다. 뷀란트는 이 방어막 덕분에 본인이 전설이 됐다.',
  'part_MA01':'🔨 최무선이 아다만타이트 소재 탐사 중 더 단단한 물질을 발견. "이걸로 장갑을 만들겠다"고 그 자리에서 결심.\n📜 이름 유래: 신화 장갑. 아다만타이트보다 단단한 소재로 만든 선체. 치명적 공격도 절반으로 상쇄.\n⚔️ 강점: 방어력 전 파츠 중 최강. 단점: 소재가 너무 희귀해서 구하기 거의 불가능.\n💬 아다만타이트보다 단단한 게 있었다. 최무선도 몰랐다. 이제 모두가 안다.',
  'part_ME01':'🔨 파스파토크가 타키온 입자 연구 논문을 쓰다가 "연료로 쓰면 어떨까"라며 논문을 접고 엔진 설계를 시작했다.\n📜 이름 유래: 타키온 드라이브. 타키온 입자를 직접 연료로 쓰는 신화 엔진. 이동 직후 공격력 폭발.\n⚔️ 강점: 이동 후 공격력 극대화. 단점: 타키온 연료 수급이 거의 불가능.\n💬 논문 대신 엔진을 만들었다. 파스파토크는 노벨상을 못 받았지만 이 엔진으로 충분히 위로받는다.',
  // ── 세트 파츠 ──
  'part_SW01':'🔨 나대용이 거북선 설계 원리를 연구해 우주 전장에 맞게 재현. "거북선이 우주에서도 통한다"\n📜 이름 유래: 거북선 함포. 이순신 세트의 공격 파츠. 세트 완성 시 압도적 화력이 활성화된다.\n⚔️ 강점: 세트 완성 시 화력 비약. 단점: 거북선 개념이라 근거리 전투에 더 적합.\n💬 박물관 몰래 스케치가 우주 최강 세트 무기가 됐다. 이순신 장군이 기뻐할지 화낼지는 모르겠다.',
  'part_SA01':'🔨 제리다지리가 거북선 등갑판 구조를 분석해 우주 장갑으로 재현. 3D 스캔 없이 눈대중으로 했다.\n📜 이름 유래: 거북선 등갑 장갑. 이순신 세트의 방어 파츠. 세트 완성 시 전술이 완전히 달라진다.\n⚔️ 강점: 세트 완성 시 방어+회피 동시 활성화. 단점: 단독 착용 시 평범.\n💬 눈대중으로 만든 장갑이 세트 핵심이 됐다. 제리다지리의 눈이 3D 스캐너보다 정확하다.',
  'part_SE01':'🔨 마사무네가 테슬라의 무선 전력 전송 논문을 읽고 "엔진에 적용해야겠다"며 하룻밤에 설계했다.\n📜 이름 유래: 테슬라 엔진. 테슬라의 무선 전력 전송 원리를 엔진에 구현. 세트 완성 시 전자기 방어 활성화.\n⚔️ 강점: 세트 완성 시 전자기 방어. 단점: 단독 사용 시 전기 에너지 낭비가 있다.\n💬 테슬라가 알았다면 특허를 주장했을 것이다. 마사무네는 "영감만 빌렸다"고 주장한다.',
  'part_SS01':'🔨 알렉스틸이 테슬라 자기장 이론을 방어막에 적용하기 위해 물리학 교수와 1년간 협업. 교수가 공로를 빼앗으려 했다.\n📜 이름 유래: 테슬라 실드. 테슬라의 자기장 이론을 방어막으로 구현. 세트 완성 시 전자기 방어력 극대화.\n⚔️ 강점: 세트 완성 시 전자기 방어 극대화. 단점: 교수가 공로를 일부 가져갔다.\n💬 교수와 싸워서 만든 방어막. 알렉스틸은 억울하지만 세트가 최강이라 참고 있다.',
  // ── 자동 수리 로봇 파츠 ──
  'part_RB01':'🔨 메카니카 견습공 미하일이 처음 만든 정비 드론. "그냥 작은 거 하나 띄워두자"는 단순 발상이었다.\n📜 이름 유래: 정비 드론. 함체 외벽을 따라다니며 작은 균열을 메운다. 1세대 수리 자동화의 시작.\n⚔️ 강점: 저렴, 어디서나 수리. 단점: 회복량이 작아 큰 피해엔 무력하다.\n💬 첫 자동 수리 장비. 작아도 있는 게 없는 것보단 훨씬 낫다.',
  'part_RB02':'🔨 드미트리가 견습공 드론을 보고 "더 크게 만들어 봐"라며 한 단계 키운 모델. 직원이 8개월 만에 완성.\n📜 이름 유래: 수리 봇. 인간형 다관절 정비 로봇. 함내 어디든 직접 접근해 수리한다.\n⚔️ 강점: 안정적 회복량. 단점: 부피가 커서 소형 함선엔 무리.\n💬 보급형 수리 봇. 중형 이상의 함선이라면 한 대쯤 두는 게 상식이다.',
  'part_RB03':'🔨 메카니카 정비 전설 아르센이 자기 손이 닿지 않는 곳까지 수리하고 싶어 직접 설계. 영웅급 인증을 받았다.\n📜 이름 유래: 자동 정비기. 함체 전반을 스스로 진단·수리한다. 함장이 잠든 사이에도 일한다.\n⚔️ 강점: 회복 속도 우수. 단점: 가격이 갑자기 뛴다.\n💬 영웅급은 다르다. 켜두면 함선이 알아서 새것처럼 돌아온다.',
  'part_RB04':'🔨 메카니카 정비 군단 600명을 압축해 한 박스에 담는다는 발상으로 제작. 정약용이 보고 "이건 군대다"라고 했다.\n📜 이름 유래: 수리 군단. 수백 개의 마이크로 봇이 동시에 작업. 전설급 자동 복원의 결정체.\n⚔️ 강점: 매 턴 maxHP 10% 회복. 단점: 가격이 일반 함선 한 척 값.\n💬 함선이 부서지는 속도보다 빨리 고친다. 적은 자기가 헛수고하는 걸 알게 된다.',
  'part_RB05':'🔨 이휘소 박사의 자가 복구 이론이 또 유출돼 신화급 장비로 실체화. 본인은 또 모르고 있었다.\n📜 이름 유래: 자가 복구 매트릭스. 함체 분자 자체가 재배열되며 복원된다. 격침되어도 한 번 살아 돌아온다.\n⚔️ 강점: 회복 + 1회 부활. 단점: 신화급, 퀘스트 보상 전용.\n💬 격침을 거부하는 장비. 이휘소 박사가 알면 또 화낼 것이다. 그래도 살려준다는데.',
  'part_RB06':'🔨 보이드 출신 정비공 라시드가 적 함선 잔열을 회수하면 어떨까 실험. 첫 시제품이 자기 함선을 회복시켰다.\n📜 이름 유래: 흡혈 정비 드론. 적이 받은 에너지 잔열을 회수해 아군 함체로 환원. 정비공 사이에선 "거머리"라 불린다.\n⚔️ 강점: 회복 + 흡혈 동시. 단점: 흡혈량이 초급 수준.\n💬 적을 때리면 내가 회복한다. 라시드는 이 구조에 만족했고 더 강한 버전을 의뢰받았다.',
  'part_RB07':'🔨 라시드가 거머리 드론의 성공으로 한 단계 위 모델 의뢰를 받았다. "실드도 흡수하게 해줘"\n📜 이름 유래: 적응형 회복 봇. HP뿐 아니라 실드까지 동시에 회수한다. 함체가 적의 공격을 양분으로 삼는다.\n⚔️ 강점: HP+실드 흡혈. 단점: 회복량은 여전히 중급선.\n💬 실드와 장갑을 동시에 회복한다. 적은 어디를 때려도 손해다. 좋은 거다.',
  'part_RB08':'🔨 라시드와 드미트리가 협업해 만든 영웅급 흡혈 정비기. 듀얼 코어로 처리 속도를 두 배로 끌어올렸다.\n📜 이름 유래: 듀얼 코어 정비 시스템. 두 개의 코어가 따로 회복과 흡혈을 담당한다. 영웅급 자동 정비의 표준.\n⚔️ 강점: 흡혈 효율 영웅급. 단점: 코어 두 개라 가격도 두 배.\n💬 두 개의 코어가 동시에 함선을 살린다. 라시드는 "이게 진짜"라고 자랑한다.',
  'part_RB09':'🔨 라시드가 보이드 균열에서 영혼이라 부르는 에너지의 정체를 추정하고 폭격 코어와 결합. 전설로 등재됐다.\n📜 이름 유래: 흡혈 폭격 코어. 적의 폭발 잔향을 흡수해 함체를 복원. 전설급 흡혈 수리의 최종형.\n⚔️ 강점: 광역 흡혈 전설급. 단점: 상점 미판매, 설계도 제작 전용.\n💬 적이 폭발할수록 내가 단단해진다. 라시드는 이게 정상이라고 우긴다. 우리도 그렇게 믿기로 했다.',
  'part_RB10':'🔨 라시드가 마지막 작품으로 보이드 영혼 에너지를 직접 매트릭스화. 본인은 시운전 직후 행방불명됐다.\n📜 이름 유래: 영혼 흡수 매트릭스. 격침의 개념조차 무력화하는 신화 장비. 함선이 죽음을 거부한다.\n⚔️ 강점: 신화급 회복+흡혈+부활 50%. 단점: 사용자가 가끔 자기 정체성을 의심하게 된다.\n💬 격침되어도 절반 체력으로 부활. 라시드의 행방은 모르지만 그가 남긴 매트릭스가 우리를 살린다.',
  // ── 특수 창고 파츠 ──
  'part_SC01':'🔨 정약용이 군용 컨테이너 규격서를 그대로 따라 만들었다. "표준이면 다 호환되니까"\n📜 이름 유래: 소형 창고. 표준 규격 소형 군용 컨테이너. 착탈이 쉬워 초보 상인 첫 선택.\n⚔️ 강점: 범용 호환, 저렴. 단점: 용량이 작다. 화물을 많이 실으려면 여러 개 달아야 한다.\n💬 규격서 따라 만들었는데 베스트셀러가 됐다. 정약용의 성공 비결은 표준을 지키는 것이다.',
  'part_SC02':'🔨 최무선이 여러 도크를 돌아다니다 "교체가 빠르면 돈이 된다"는 걸 깨닫고 모듈식으로 설계했다.\n📜 이름 유래: 모듈 창고. 조립식 모듈 형태의 표준 창고. 도크 어디서든 교체 가능.\n⚔️ 강점: 교체 속도 최고, 범용. 단점: 모듈 특성상 기밀성이 약간 떨어진다.\n💬 도크 순례 끝에 나온 창고. 어디서든 바꿀 수 있다는 게 무기다. 최무선은 도크를 좋아한다.',
  'part_SC03':'🔨 파스파토크가 취약 화물 운송 의뢰 중 화물이 깨지는 걸 보고 분노해서 진동 흡수 구조를 설계했다.\n📜 이름 유래: 진동 흡수 창고. 파손 없이 화물을 보관하는 물류 박스. 취약 화물 전문.\n⚔️ 강점: 충격 흡수 최상. 단점: 기본 창고보다 크고 무겁다.\n💬 화물이 깨지는 걸 두 번 보지 않으려고 만들었다. 파스파토크는 소중한 화물에 진심이다.',
  'part_SC04':'🔨 제리다지리가 분자 압축 이론을 창고에 적용. "안에 더 많이 넣으면 효율이 올라간다"\n📜 이름 유래: 압축 창고. 분자 압축 기술로 보이는 것보다 훨씬 많은 화물을 수납한다.\n⚔️ 강점: 부피 대비 수납 용량 최상. 단점: 압축 해제 시 화물이 튀어나와 위험할 수 있다.\n💬 겉보기보다 훨씬 많이 들어간다. 기계음이 들리면 압축 중이다. 이때 문을 열면 안 된다.',
  'part_SC05':'🔨 마사무네가 중력장 재배열 실험 중 "화물에 쓰면 되겠다"며 연구 방향을 틀었다. 논문 대신 창고를 팔았다.\n📜 이름 유래: 중력 집속 창고. 중력장 재배열로 화물을 집속. 무중력 공간에서도 화물이 제자리.\n⚔️ 강점: 무중력에서도 안정적. 단점: 중력장 유지에 에너지가 필요하다.\n💬 논문 포기하고 창고를 만들었다. 마사무네는 학계를 잃었지만 돈을 얻었다. 나쁘지 않다.',
  'part_SC06':'🔨 알렉스틸이 보이드 차원 접기 연구를 상업화하기로 결심. "이론만 있으면 뭐하냐"\n📜 이름 유래: 포켓 차원 창고. 보이드 차원 접기 기술 응용. 내부는 외부와 다른 물리 법칙.\n⚔️ 강점: 용량이 이론상 무한. 단점: 내부 접근이 까다롭고 화물이 가끔 사라진다.\n💬 이론을 상업화한 결과. 화물이 가끔 사라지는데 보이드 어딘가에 있을 거라고 알렉스틸은 말한다.',
  'part_SC07':'🔨 이휘소 박사의 양자 중첩 이론이 창고 설계에 유출됐다. 이번에도 본인은 몰랐다.\n📜 이름 유래: 양자 중첩 창고. 이휘소 박사 이론 적용. 화물이 동시에 두 상태로 존재할 수 있다.\n⚔️ 강점: 이론적으로 용량 2배. 단점: 화물 위치가 불확정이라 꺼낼 때 어디 있는지 모른다.\n💬 이휘소 박사 이론이 또 유출됐다. 화물이 두 상태로 존재한다는 건 꺼낼 때 도박이라는 의미다.',
  'part_SC08':'🔨 뷀란트가 광자 파동 연구를 창고에 적용. "빛이 통과하면 차원이 열리지 않을까?"\n📜 이름 유래: 광자 차원 창고. 광자 파동으로 차원을 확장. 빛이 통과하는 곳이면 어디든 창고를 열 수 있다.\n⚔️ 강점: 차원 확장 용량. 단점: 빛이 없으면 창고가 닫힌다. 어두운 곳에서 조심해야 한다.\n💬 빛이 없으면 창고가 닫힌다. 어두운 우주에서 창고를 열려면 손전등이 필요하다.',
  'part_SC09':'🔨 최무선이 초공간 접기 이론을 실용화. "화물을 매트릭스로 정리하면 더 많이 넣지"\n📜 이름 유래: 초공간 매트릭스 창고. 초공간을 접어 화물 매트릭스 구성. 화물 목록 보면 머리가 어지럽다.\n⚔️ 강점: 용량 극대화. 단점: 화물 목록 UI가 복잡해서 찾는 데 시간이 걸린다.\n💬 화물 목록을 보면 정말 머리가 어지럽다. 최무선은 자신이 만들었음에도 목록을 못 외운다.',
  'part_SC10':'🔨 파스파토크가 70년 연구의 마지막 작품으로 시공간 압축 창고를 완성. "우주 전체를 담을 수 있다"고 썼다.\n📜 이름 유래: 시공간 압축 창고. 시공간을 직접 압축. 설계자는 우주 전체를 담을 수 있다는 메모를 남겼다.\n⚔️ 강점: 용량 신화급, 모든 화물 보관 가능. 단점: 작동 원리를 이해하는 사람이 파스파토크 한 명뿐이다.\n💬 우주 전체를 담는다는 메모. 파스파토크는 과장이 없는 성격이다. 아마 진짜인 것 같다.',
  // ── 함선 소형 (제작자: 보스크 바스크, 조르던, 프레드릭 채프먼, 올로리톨리) ──
  'ship_S01':'🔨 조르던이 술김에 하룻밤 만에 설계. "이름은 나중에 붙이지"라고 했다가 그냥 머스탱이 됐다.\n📜 이름 유래: 지구의 말 이름. 빠르고 야생적이라는 뜻인데 사실 그냥 취중 낙서에서 나왔다.\n⚔️ 강점: 가볍고 저렴. 단점: 튼튼하지 않다. 초보자용으로 딱이다.\n💬 수많은 영웅의 첫 함선. 고철이지만 이 안에서 전설이 시작됐다.',
  'ship_S02':'🔨 보스크 바스크가 경쟁사 함선을 훔쳐보다 영감을 받아 제작. "이건 정찰이야, 복사가 아니야"라고 했다.\n📜 이름 유래: 팔콘(매). 빠르게 낚아채는 형태에서.\n⚔️ 강점: 감지 능력 최상. 단점: 전투력이 낮아 도망가는 게 최고 전술.\n💬 적보다 먼저 보고 먼저 도망친다. 생존율 1위 전략.',
  'ship_S03':'🔨 프레드릭 채프먼이 자신이 탈출하는 법을 몰라서 만든 함선. "일단 빠르면 다 된다"\n📜 이름 유래: 나이트호크. 밤에 기습하는 매의 이미지.\n⚔️ 강점: 최고 속도. 단점: 체력이 종이장. 맞으면 반쪽.\n💬 가속 성능이 최우선. 목표물에 닿기 전에 방아쇠를 당기면 이미 늦다.',
  'ship_S04':'🔨 올로리톨리가 아내와 싸우고 홧김에 안테나를 12개 달아버렸다. "많을수록 좋잖아"\n📜 이름 유래: 이글(독수리). 날카로운 눈으로 모든 걸 본다는 뜻.\n⚔️ 강점: 광역 탐지 1위. 단점: 안테나 무게로 속도 감소.\n💬 전장에서 가장 먼저 적을 발견한다. 대신 적도 안테나를 먼저 보고 웃는다.',
  'ship_S05':'🔨 보스크 바스크가 걸작을 만들겠다는 일념으로 3년간 설계. 보이드 기술을 몰래 연구해 스텔스 적용.\n📜 이름 유래: 스피릿(영혼). 보이지 않는 존재처럼.\n⚔️ 강점: 스텔스 3턴. 단점: 비싸고 수리가 어렵다.\n💬 보이드 출신 용병들이 가장 좋아하는 함선. 근데 왜 이름이 영혼인지는 아무도 설명 못 한다.',
  'ship_S06':'🔨 조르던이 크레딧을 주식으로 날리고 충격을 받아 만든 함선. "한 방에 끝내야 해"\n📜 이름 유래: 스트라이커(강타). 첫 타격에 전부를 거는 개념.\n⚔️ 강점: 선제 공격 화력 폭발. 단점: 2번째 공격 기회가 없을 수 있다.\n💬 기습 성공 시 적이 반격할 여유를 주지 않는다. 실패하면... 좀 처참하다.',
  'ship_S07':'🔨 프레드릭 채프먼이 재미로 만들었다가 가장 잘 팔린 함선. "이걸 팔면 돈이 된다고?"\n📜 이름 유래: 레이더(기습대). 빠르게 스쳐 지나가는 공격 방식.\n⚔️ 강점: 이동+공격 동시 수행. 단점: 집중 교전에는 약하다.\n💬 우주 저격수들의 최애 기체. 적이 알아차리면 이미 지나간 뒤다.',
  'ship_S08':'🔨 올로리톨리가 로봇과 다퉈서 혼자 밤새 만든 함선. "로봇이 못 만들면 내가 만들지"\n📜 이름 유래: 팬텀(유령). 존재하는지조차 모르게 접근한다.\n⚔️ 강점: 스텔스+요격 통합. 단점: 다용도라 특화 함선에 밀린다.\n💬 스텔스와 요격을 동시에. 적이 알아채는 순간 이미 전투는 끝나있다.',
  // ── 함선 중형 ──
  'ship_M01':'🔨 보스크 바스크가 표준을 만들기 위해 경쟁적으로 제작. "중형의 교과서가 될 것이다"\n📜 이름 유래: 타이탄(거인). 중형 함선의 기준점.\n⚔️ 강점: 완벽한 균형. 단점: 두드러지는 게 없다. 그게 장점이기도 하다.\n💬 무역부터 전투까지 뭐든 된다. 재능이 없는 게 최고의 재능.',
  'ship_M02':'🔨 조르던이 전투 데이터 보다가 영감을 받아 설계. "근거리면 무조건 이겨야지"\n📜 이름 유래: 워호크(전쟁매). 근접 전투 특화 형태.\n⚔️ 강점: 근접 화력 폭발. 단점: 원거리에서는 제 실력 반도 못 낸다.\n💬 접근하는 순간 상대방은 화력의 홍수를 맞이한다.',
  'ship_M03':'🔨 프레드릭 채프먼이 충격을 받아 "가장 튼튼한 것"을 목표로 제작. 동생 함선보다 두껍게.\n📜 이름 유래: 불워크(방어벽). 어떤 공격도 버틴다는 의미.\n⚔️ 강점: 장갑+균형 스탯. 단점: 기동성이 평범하다.\n💬 어떤 전황에서도 팀의 주축. 화려하지 않지만 사라지지도 않는다.',
  'ship_M04':'🔨 올로리톨리가 지구의 검은색 음료수를 먹다가 "독이 서서히 퍼지네"라며 영감을 받아 설계.\n📜 이름 유래: 베놈(독). 천천히 적을 갉아먹는 개념.\n⚔️ 강점: 독 상태이상. 단점: 독 속성 면역 적에는 무력화.\n💬 한 번 걸리면 전투 내내 체력이 갉아먹힌다. 커피에서 영감이 나올 줄 누가 알았겠어.',
  'ship_M05':'🔨 보스크 바스크가 상인 조합 의뢰로 제작. 화물칸 최대화가 목표였다.\n📜 이름 유래: 메르칸트(상인). 무역선의 정석.\n⚔️ 강점: 화물칸 최대. 단점: 전투 능력 평범. 도망은 잘 간다.\n💬 상인들이 가장 사랑하는 함선. 은하계 구석구석을 누비는 유일한 이유는 화물칸 때문이다.',
  'ship_M06':'🔨 조르던이 자신의 작품을 경쟁사가 모방한 것에 화가 나서 완전히 다른 개념으로 제작.\n📜 이름 유래: 스펙터(유령). 레이더에 잡히지 않는 함선.\n⚔️ 강점: 탐지 회피 최상. 단점: 발각되면 전투력이 부족하다.\n💬 존재 자체가 소문인 유령 함선. 목격자들은 "있었나?" 라고 한다.',
  'ship_M07':'🔨 프레드릭 채프먼이 현상금 사냥꾼에게 쫓기다가 영감을 받아 만들었다. "이걸 잡는 함선이 있으면 어떨까"\n📜 이름 유래: 헌터(사냥꾼). 나포 전문.\n⚔️ 강점: 나포 확률 향상. 단점: 일반 전투에서는 평범하다.\n💬 현상금 사냥꾼들의 애용품. 한 번 조준한 먹잇감은 반드시 잡아 온다.',
  'ship_M08':'🔨 올로리톨리가 충돌을 전술로 삼겠다고 주장. 동료들이 말렸지만 그냥 만들었다.\n📜 이름 유래: 배틀크루저(전투순양함). 충돌 전술 전문.\n⚔️ 강점: 체공 시 충격 데미지 폭발. 단점: 선체가 빨리 망가진다.\n💬 전면 충돌을 전술로 삼는다. 이를 말린 사람들은 지금도 후회 중이다.',
  'ship_M09':'🔨 보스크 바스크가 술김에 번개 무기를 함선에 통째로 달았다. 효과가 좋아서 그냥 출시.\n📜 이름 유래: 썬더볼트(번개). 광역 전기 공격.\n⚔️ 강점: 연쇄 번개 광역. 단점: 에너지 소비가 크다.\n💬 전장의 폭풍이라는 별명. 번개가 치는 곳에는 적이 한꺼번에 쓰러진다.',
  'ship_M10':'🔨 조르던이 지구의 검은색 음료수 과잉 섭취 후 "영웅들을 지원해야 해"라는 깨달음으로 제작.\n📜 이름 유래: 커맨더(지휘관). 팀 전체 버프 전문.\n⚔️ 강점: 영웅 탑승 시 능력치 폭발. 단점: 혼자선 무력.\n💬 팀 전체 잠재력을 극대화. 영웅과 함께라면 전설이 된다.',
  // ── 함선 대형 ──
  'ship_H01':'🔨 프레드릭 채프먼이 아내와 싸우고 "내 편 드는 함선"을 만들었다. 크루 충성도가 핵심 개념.\n📜 이름 유래: 발라르크(수호자). 함께 싸우는 동료.\n⚔️ 강점: 크루 충성도 상승, 중장갑. 단점: 화력이 평균.\n💬 오랜 항해에도 승무원들이 지치지 않는다. 아내와의 화해 결과물이 이렇게 훌륭하다.',
  'ship_H02':'🔨 올로리톨리가 팀원들을 돕고 싶어서 설계. "나만 살면 뭐해"\n📜 이름 유래: 파라딘(성기사). 아군을 지원하는 개념.\n⚔️ 강점: 전투 중 아군 회복. 단점: 공격력 낮다.\n💬 편대 전체를 지원하는 함선. 장기전에서 진가를 발휘한다.',
  'ship_H03':'🔨 보스크 바스크가 방어 최강을 목표로 제작. "두꺼우면 이긴다"\n📜 이름 유래: 배스천(요새). 어떤 공격도 막아낸다.\n⚔️ 강점: 20% 피해 감쇄. 단점: 느리다. 매우.\n💬 역사상 가장 두꺼운 장갑. 20% 피해 감쇄가 전투의 흐름을 바꾼다.',
  'ship_H04':'🔨 조르던이 "포가 많으면 강하다"는 철학으로 설계. 크리티컬 시스템은 술김에 추가했다.\n📜 이름 유래: 아드레날린. 무기가 많을수록 흥분하는 시스템.\n⚔️ 강점: 무기 4기 이상 시 크리티컬 폭발. 단점: 파츠 슬롯이 무기로 가득 차야 한다.\n💬 포문이 많을수록 강하다. 포문 개수만큼의 이야기가 있다.',
  'ship_H05':'🔨 프레드릭 채프먼이 경쟁적으로 원거리 최강을 만들었다. "멀리서 때리면 이긴다"\n📜 이름 유래: 스나이퍼(저격수). 원거리 특화.\n⚔️ 강점: 사거리 최장, 원거리 명중. 단점: 근거리에선 약하다.\n💬 사거리 끝에서도 명중시킨다. 너무 멀어서 적이 화도 못 낸다.',
  'ship_H06':'🔨 올로리톨리가 미지의 공간에 대한 두려움을 이겨내고자 설계.\n📜 이름 유래: 보이저(항해자). 탐험의 정신.\n⚔️ 강점: 신규 행성 발견 확률 최고. 단점: 전투 능력 평범.\n💬 미지의 공간을 탐험하기 위해 태어난 함선. 무서운 곳에 먼저 들어간다.',
  'ship_H07':'🔨 보스크 바스크가 걸작을 목표로 10년 설계. "모든 능력이 균형 잡혀야 진짜 강하다"\n📜 이름 유래: 타이탄 마크II. 완전체 버전.\n⚔️ 강점: 공격·방어·기동 균형. 단점: 특화 함선에 비해 각 분야 1위는 아니다.\n💬 어떤 전황에서도 승리를 가져올 수 있다. 걸작이라는 말이 아깝지 않다.',
  'ship_H08':'🔨 조르던이 번개 기술에 집착해 중형보다 더 큰 버전을 만들었다.\n📜 이름 유래: 스톰브링어(폭풍 유발자). 연쇄 번개.\n⚔️ 강점: 복수 적 연쇄 번개. 단점: 에너지 소비 매우 크다.\n💬 전장 전체가 번개 속에 잠긴다. 폭풍을 가져온다는 게 과장이 아니다.',
  'ship_H09':'🔨 프레드릭 채프먼이 후배에게 지기 싫어 만든 고속 순양함.\n📜 이름 유래: 레이피어(날렵한 검). 빠르고 정확.\n⚔️ 강점: 추가 턴 오더. 단점: 장갑이 얇다. 빠른 대신.\n💬 고속 기동으로 적보다 한 발 빠르다. 빠름이 곧 생존이다.',
  'ship_H10':'🔨 올로리톨리가 마지막 걸작을 만들겠다는 일념으로 설계. "이것이 내 최후의 함선이다"\n📜 이름 유래: 레비아탄(괴물). 은하계 최강.\n⚔️ 강점: 최강 화력. 단점: 너무 비싸서 소유만으로 파산 가능.\n💬 레비아탄처럼 바다를 지배하는 존재. 전설이 됐다.',
  'ship_H11':'🔨 보스크 바스크가 실드 기술에 영감을 받아 대형함 전체를 방어막으로 감쌌다.\n📜 이름 유래: 아르마다(함대). 모두를 지킨다.\n⚔️ 강점: 함대 전체 실드 20% 강화. 단점: 공격력 낮다.\n💬 아르마다가 있으면 어떤 포화도 버틴다. 방어의 철학.',
  'ship_H12':'🔨 조르던이 보이드 보스를 상상하며 설계. "저걸 잡으려면 이게 필요하다"\n📜 이름 유래: 네메시스(복수자). 보스 사냥 전문.\n⚔️ 강점: 실드 관통 10만 피해. 단점: 일반 전투에서는 과잉 설계.\n💬 보이드 보스를 위해 태어난 함선. 그 목적 하나만으로 존재한다.',
  // ── 함선 신화 ──
  'ship_LGD01':'🔨 이순신 장군의 전술 철학을 나대용이 평생 연구 끝에 우주에 재현. "거북선이 우주에 있었다면"\n📜 이름 유래: 거북선. 지구 역사 최강의 전함을 우주에.\n⚔️ 강점: 팀 전체 강화. 단점: 없다. 신화니까.\n💬 탑승한 순간 함대 전체가 전설이 된다. 이순신이 있다면 이 함선을 탔을 것이다.',
  'ship_LGD02':'🔨 올로리톨리가 테슬라의 기록을 60년 연구 끝에 함선에 적용. "전자기가 모든 것을 제압한다"\n📜 이름 유래: 워덴클리프. 테슬라의 무선 에너지 전송 프로젝트.\n⚔️ 강점: 매 턴 적 시스템 무력화. 단점: 가격이 신화급.\n💬 매 턴 적 시스템 하나가 꺼진다. 테슬라가 살아있었다면 우주에서 이걸 탔을 것이다.',
  'ship_LGD03':'🔨 보스크 바스크가 아인슈타인 이론을 적용해 항법 시스템을 재설계. "시간을 지배하면 이긴다"\n📜 이름 유래: 리라(상대성). 상대성이론 적용 항법.\n⚔️ 강점: 모든 상황에서 선제 행동. 단점: 매우 비싸다.\n💬 모든 상황에서 가장 먼저 행동할 권리를 갖는다. 시간을 지배하면 전쟁도 지배한다.',
  'ship_URSA':'🔨 치크스 친위대 신경공학자 부족이 50년에 걸쳐 살아있는 함체를 키워냈다. 설계자는 함선이 아니라 "유기체"라고 불렀다.\n📜 이름 유래: 우르사 메이저(큰곰자리). 지구 봉쇄 함대의 기함. 이름만으로 인류를 떨게 했다.\n⚔️ 강점: 신화 풀셋(MW01·MS01·MA01·ME01) 기본 장착, 신화급 화력+내구. 단점: 격파 후 나포해야만 손에 들어온다. 충성도가 0이라 길들이기까지 시간이 걸린다.\n💬 인류 멸망의 상징이 인류 함대의 일원이 됐다. 함체 안에서 가끔 들리는 신음 같은 진동은 무시하는 게 정신 건강에 좋다.',
  // ── 치크스 노획 함선 (적군 디자인 역공학) ──
  'ship_CHIX_S_BUY':'🔨 노획된 치크스 정찰기를 메카니카 기술자들이 6개월에 걸쳐 역공학. 생체회로 70%는 그대로, 인터페이스만 인간형으로 교체.\n📜 이름 유래: 치크스 정찰기(노획). 원어 발음은 인간 성대로 재현 불가 — 그래서 그냥 "노획"이라 부른다.\n⚔️ 강점: INT 자가 회복 +10%/턴 — 실드가 끊임없이 재생. 단점: 충성도 60으로 낮음. 가끔 조종간이 멋대로 움직인다.\n💬 함선이 살아 숨쉰다. 도색을 하니 어디선가 항의의 진동이 올라온다. 그래도 잘 싸운다.',
  'ship_CHIX_M_BUY':'🔨 치크스 중형 순양함을 통째로 끌고 와 무기 시스템만 인간형 포탑으로 교체. 외피는 생체 갑각 그대로.\n📜 이름 유래: 치크스 순양함(노획). 갑각이 햇빛에 반짝이면 마치 거대한 갑충이 우주를 헤엄치는 모습이다.\n⚔️ 강점: 치크스 함대 상대 ATT +25% — 동족을 가장 잘 안다. 단점: 외피가 살아있어 수리비가 두 배.\n💬 적의 함선이 적의 약점을 가르쳐준다. 가장 잔인한 무기다. 외피에 상처가 나면 진짜로 아파하는 것 같다.',
  'ship_CHIX_L_BUY':'🔨 우르사 전초기지에서 단 1척만 노획된 모선. 분석 후 인간 함대용으로 개조됐지만, 핵심 신경망은 손대지 못했다.\n📜 이름 유래: 치크스 모선(노획). 진짜 이름은 "큰 어미"라는 뜻이라고 한다 — 통신 해독팀이 그렇게 추정만 한다.\n⚔️ 강점: 전투 시작 시 적 1척 마비(1턴) — 신경 펄스 무기 잔존 효과. 단점: 가격이 미친 수준. 가끔 혼자 침묵한다.\n💬 적의 모선을 끌고 다닌다. 가장 큰 도발이다. 함선 안에서 가끔 들리는 진동은 무시하기로 했다.',
  // ── 제작 재료 R01-R08 ──
  'mat_R01':'보이드 균열 행성의 에너지 파편.\n채취 시 방호복 없이 접근하면 즉시 사망한다.',
  'mat_R02':'치크스 전쟁 행성에서 전투 충격파에 의해 탄생하는 희귀 결정석.\n자체 에너지를 내뿜는다.',
  'mat_R03':'아우레우스 태양 핵에서 추출한 초고온 에너지.\n반응로에 주입하면 항성급 출력이 가능하다.',
  'mat_R04':'크리그 화산 지각의 마그마 코어.\n극도의 열과 압력을 가두고 있어 잘못 다루면 폭발한다.',
  'mat_R05':'메카니카 공화국의 초정밀 나노 양자칩.\n단 하나로 함선 컴퓨터 전체를 교체할 수 있다.',
  'mat_R06':'지구 저항군 비밀 연구소에서 생산한 반물질.\n1그램이 핵폭탄 수백 개의 에너지를 품고 있다.',
  'mat_R07':'수퍼비아 중력 이상 지대에서 채취되는 중력자 결정.\n이것을 품은 곳에서는 공간이 미묘하게 휜다.',
  'mat_R08':'은하 균열 최심부의 궁극 결정체.\n현재까지 발견된 물질 중 가장 높은 에너지 밀도를 가진다.',
  // ── 일반 특산물 G01-G30 (4점 정보: 발견지·제작자·용도·한마디) ──
  'comm_G01':'📍 수퍼비아 프록시마 b 외곽 폐채굴장 수거\n🔨 귀족 하인들이 마지못해 분리·수거 작업\n🛠️ 저급 함선 수리재, 건축 자재로 범용 사용\n💬 귀한 게 없다는 걸 귀하게 여기는 상품. 싸지만 팔면 된다.',
  'comm_G02':'📍 수퍼비아 센타우리 에코 c 중력 압축 발전소\n🔨 귀족 엔지니어 소피아 모렐 설계 수동 추출 공정\n🛠️ 함선 보조 동력, 방어막 충전, 의료기기 전력원\n💬 비싸지 않은데 왜 자꾸 없는 건지. 수요가 공급을 항상 이긴다.',
  'comm_G03':'📍 수퍼비아 바나드 프라임 귀족 증류소\n🔨 마스터 조 핀튼이 소행성 광천수로만 20년 숙성\n🛠️ 귀족 사교 자리 필수품. 뇌물 효과 탁월. 외교 선물 1위\n💬 마셔도 좋고 팔아도 좋다. 다만 팔 때 손이 다 떨린다.',
  'comm_G04':'📍 아우레우스 티가든 금융 b 자동화 금광에서 제련\n🔨 은하계 표준 금속. 자동화 제련소 24시간 생산\n🛠️ 통화 기준재, 함선 부품 도금 원료. 어디서나 통용\n💬 금보다 금이라는 상징에 돈을 내는 게 금융 문명 방식. 심오하다.',
  'comm_G05':'📍 수퍼비아 링2 소행성대 중력 이상 지점 자연 형성\n🔨 전문 광부 클란이 무중력 보호복 착용 후 채취\n🛠️ 실드 강화재, 중력포 탄심 원료. 희귀성으로 고가\n💬 생긴 건 예쁜데 집어 들면 손가락이 으스러진다. 물리 법칙은 공평하다.',
  'comm_G06':'📍 아우레우스 LHS 1140-b 행성 지하 결정층\n🔨 아우레우스 광산 로봇 특수 공정. 세공에만 3개월\n🛠️ 에너지 렌즈 재료, 레이저 무기 핵심 소재. 순도가 가격\n💬 비싸게 팔리는 유일한 돌멩이. 지질학자들이 왜 우울한지 알겠다.',
  'comm_G07':'📍 메카니카 TRAPPIST-1e 핵분열 발전 단지\n🔨 엔지니어 드미트리가 설계한 안전 격리 배터리\n🛠️ 중형 함선 보조 동력, 무기 충전 팩으로 범용 사용\n💬 분열이라는 이름이 불안하지만 설명서엔 "이 정도는 괜찮음"이라 써있다.',
  'comm_G08':'📍 메카니카 기가-넷 허브 정밀 광학 공장\n🔨 로봇 장인 아르센이 나노미터 단위로 직접 연마\n🛠️ 레이저 무기 집속 장치, 탐색 시스템 센서 핵심 부품\n💬 이걸 맨눈으로 본 순간 내 각막이 열화됐다. 그래도 팔면 된다.',
  'comm_G09':'📍 메카니카 케플러-62f 중수소 추출 기지\n🔨 로봇 기사단 이반이 정밀 추출 공정 감독\n🛠️ 고출력 함포, 대형 실드 발생기 전력 공급원\n💬 분열 배터리보다 비싸지만 터질 확률이 반으로 줄었다는 게 장점.',
  'comm_G10':'📍 크리그 Kepler-22b 화산 지각층 심부\n🔨 크리그 전쟁 광부 부대가 맨손 굴착 방식으로 채굴\n🛠️ 총기류 탄환 원료, 장갑 강화 소재. 기본재 중 최고 강도\n💬 파는 게 아니라 빼앗아 오는 게 크리그 방식인데 정가표는 있다.',
  'comm_G11':'📍 크리그 타르타로스 전투 폐허 지층\n🔨 크리그 채굴 전사들이 전투 중 채굴 (실제로 그렇다)\n🛠️ 최고급 무기 손잡이 재료, 장갑 합금 원료. 빛이 붉게 반사됨\n💬 피가 굳어 만들어진 광석이라는 소문이 있다. 부정하지 않겠다.',
  'comm_G12':'📍 크리그 아레스-III 전투 공학 시설\n🔨 크리그 무기 장인 조르본이 전투 데이터 기반으로 설계\n🛠️ 함선 충격 무기 탄두, 대형 장갑 관통 전용 스파이크\n💬 이름이 "스파이크"인데 매끄럽다. 크리그식 유머인지 진심인지 모르겠다.',
  'comm_G13':'📍 지구 저항군 지하 방공호 보급창\n🔨 박 상사가 재고 정리 겸 비밀 루트로 방출\n🛠️ 기본 전투 장비, 함선 비상 수리 부품 범용 사용\n💬 정식 규격이 없다. "일단 쓸 수 있으면 됐다"가 저항군 품질 기준.',
  'comm_G14':'📍 지구 저항군 유로파 기지 발효실 밀조\n🔨 병사 김하나가 지구 감자와 화성 물로 빚은 전통 막걸리\n🛠️ 사기 진작, 크루 피로 회복. 크리그와의 거래에서도 유효\n💬 알코올 도수를 물어보면 "그냥 마셔요"라고만 한다.',
  'comm_G15':'📍 지구 저항군 달 정거장 채굴단 확보\n🔨 이철호가 달 표면 채굴 임무 중 확보\n🛠️ 표준 함선 구조재, 방어 격벽 소재. 지구 출신 함선 필수\n💬 달에서 가져온 지구 광석. 운반비가 광석값보다 비싸다는 건 비밀.',
  'comm_G16':'📍 치크스 TOI-700 d 오염된 생물권 지대\n🔨 치크스 생체공학 수집단이 방호복 착용 후 위험 채취\n🛠️ 생물무기 원료, 희귀 치료제 기반 소재. 취급 주의 필수\n💬 연구 목적으로 샀는데 용기가 스스로 열렸다. 다음 구매자에게 행운을.',
  'comm_G17':'📍 치크스 케플러-452b 결정 지대 전투 후 수거\n🔨 치크스 전사 부족이 전쟁 중 자연 채집 방식으로 확보\n🛠️ 에너지 무기 공명기, 실드 교란 장치 핵심 소재\n💬 예쁜데 만지면 손이 저린다. 치크스가 왜 화나 있는지 이제 이해된다.',
  'comm_G18':'📍 지구 저항군 비밀 문서고 수호\n🔨 이순신 장군 원본 난중일기를 저항군이 전쟁 중 복제\n🛠️ 영웅 이순신(H01) 영입 필수 아이템. 일반 판매 불가\n💬 시공을 초월한 전략서. 이 일기를 읽은 함장들의 생존율이 높다고 기록됐다.',
  'comm_G19':'📍 보이드 글리제 581g 심층 균열\n🔨 보이드 존재들이 자발적으로(?) 분비·생성\n🛠️ 행성 경매 추가 슬롯, 신화급 제작 핵심 재료\n💬 보이드 존재의 체액인지 에너지인지 아무도 묻지 않는다. 비싸니까.',
  'comm_G20':'📍 보이드 오리온 균열 시간 왜곡 지점\n🔨 라시드 알타리크가 극한 조건 채취 장비로 분리 수거\n🛠️ 시공간 제어 장치 원료. 신화 함선 제작에 필수\n💬 들고 있으면 시간이 느리게 간다는 소문이 있다. 퇴근하기 싫을 때 유용할지도.',
  'comm_G21':'📍 보이드 캅테인 b 균열 항법 이상 지점 발견\n🔨 균열을 통해 표류하던 자율 항법 장치. 제조자 불명\n🛠️ 보이드 항로 내비게이션, 균열 지점 탐지 필수 장비\n💬 어딜 가리키는지 아무도 이해 못하지만 따라가면 도착한다. 그게 더 무섭다.',
  'comm_G22':'📍 수퍼비아 로스 128-b 향료 공장 비밀 제조\n🔨 귀족 조향사 그레이스가 소행성 꽃 500종 혼합 제작\n🛠️ 귀족 사교계, 외교 선물, 뒷거래 윤활유\n💬 냄새가 진해서 들어오면 다 알지만, 팔면 다들 모른 척한다.',
  'comm_G23':'📍 아우레우스 글리제 667Cc 태양 에너지 은행 발행\n🔨 피에르 발루 총재 설계 광자 기반 암호화폐\n🛠️ 초고가 거래 결제 수단, 보이드 물품 구매 유일 통화\n💬 돈을 사고파는 개념. 금융 행성답다. 그리고 나는 왜 가난한가.',
  'comm_G24':'📍 아우레우스 넥서스 프라임 데이터 허브\n🔨 아우레우스 데이터 상인 연합이 암호화 기록\n🛠️ 기밀 무역 정보, 항로 데이터 내장. 팩션 내 고급 정보원 필수품\n💬 내용물보다 암호가 더 비싸다. 나도 내 월급 기록을 암호화하고 싶다.',
  'comm_G25':'📍 메카니카 TRAPPIST-1f 조립 공장 대량 생산\n🔨 로봇 조립 라인이 24시간 무정지 가동\n🛠️ 함선 자동 수리 시스템, AI 제어 장치 핵심 부품\n💬 로봇이 만든 로봇 부품. 이 순환의 끝이 뭔지 아무도 모른다.',
  'comm_G26':'📍 크리그 Kepler-442b 생화학 연구소 합성\n🔨 크리그 군의관 바스타가 전투력 극대화 목적으로 개발\n🛠️ 크루 전투 능력 단기 강화. 과다 복용 시 부작용 주의\n💬 효과는 확실하다. 부작용 목록이 6페이지인 게 좀 걸릴 뿐.',
  'comm_G27':'📍 치크스 우르사-알파 생체 추출 시설\n🔨 치크스 신경공학 부족이 고통 없이(그들 기준) 채취\n🛠️ 고급 AI 학습 데이터, 신경 인터페이스 시스템 전도체\n💬 구매할 때 용기에 적힌 내용물 설명을 읽지 않는 걸 추천한다.',
  'comm_G28':'📍 지구 저항군 타이탄 기지 종자 보관고\n🔨 농업 담당 박지영이 지구 멸망 전 채취·냉동 보관한 씨앗\n🛠️ 우주 농업 개척, 바이오돔 조성 재료. 감성 가치가 경제 가치 초과\n💬 지구 최후의 사과 씨앗. 누가 심어도 자랄지는 모른다. 그래도 심어야 한다.',
  'comm_G29':'📍 보이드 제타 레티쿨리 균열 심층부 형성\n🔨 보이드 수호자 존재들이 공간 에너지를 집약시켜 생성\n🛠️ 차원 포켓 구조체, 창고 확장 모듈 핵심 원료\n💬 만지면 손이 어딘가 균열로 들어가는 것 같기도 하다. 조심히 다루자.',
  'comm_G30':'📍 보이드 균열지대 전 행성 표면 산발적 발굴\n🔨 자동화 탐색 드론이 균열 좌표를 찾을 때만 발견\n🛠️ 은하 항로 확장 데이터 내장. 팔기엔 너무 아깝고 쓰기엔 어렵다\n💬 이 안에 지도가 있다는데, 읽은 사람이 없다. 읽은 사람은 돌아오지 않았다.',
  // ── 창고 확장 아이템 CH01-CH10 ──
  'comm_CH01':'지구 저항군 보급 작전용 군용 컨테이너.\n내부에 인류 최후의 희망이 담겼다는 낙서가 남아 있다.',
  'comm_CH02':'메카니카 표준 모듈형 화물칸.\n진동 흡수 설계 덕분에 정밀 기계 조립품도 안전하게 운반된다.',
  'comm_CH03':'크리그 전투원들의 군사 보급 박스.\n폭발물부터 식량까지 무엇이든 욱여넣을 수 있다.',
  'comm_CH04':'수퍼비아 귀족 함대의 고급 중력 압축 화물 시스템.\n일반 창고보다 훨씬 효율적이다.',
  'comm_CH05':'치크스 생체공학으로 배양된 유기 저장 낭.\n살아 있는 세포막이 화물을 감싸 형태를 변형한다.',
  'comm_CH06':'아우레우스 상인 연합의 황금 금고 모듈.\n귀중품 보관을 위한 장거리 무역 상인 필수품이다.',
  'comm_CH07':'보이드 차원 접기 기술로 만든 포켓 공간.\n외부 크기와 무관하게 거대한 화물을 수납한다.',
  'comm_CH08':'이휘소 박사 설계의 양자 중첩 기반 압축 창고.\n이론적으로 무한 용량이 가능한 전설적 희귀품이다.',
  'comm_CH09':'광개토 함대 기함급 통합 화물창 시스템.\n함대 전체 보급을 단독으로 담당할 수 있는 전설급이다.',
  'comm_CH10':'허블 망원경 잔해에서 발견된 고대 외계 기술.\n공간 왜곡으로 사실상 무한에 가까운 적재 공간을 생성한다.',
};

// ── 로어 툴팁 표시/숨김 함수 ─────────────────────────────────────────
function showLoreTip(key,evt){
  var lore=LORE_TEXT[key];
  if(!lore)return;
  var tip=document.getElementById('de-tooltip');
  if(!tip)return;
  tip.textContent=lore;
  tip.style.display='block';
  _posLoreTip(evt);
}
function _posLoreTip(evt){
  var tip=document.getElementById('de-tooltip');
  if(!tip||tip.style.display==='none')return;
  // 뷰포트 좌표를 스테이지 좌표로 변환 (transform:scale 보정)
  var stage=document.getElementById('game-stage');
  var sr=stage?stage.getBoundingClientRect():{left:0,top:0,right:window.innerWidth,bottom:window.innerHeight};
  var s=window._gsScale||1;
  var sx=(evt.clientX-sr.left)/s, sy=(evt.clientY-sr.top)/s;
  tip.style.left=(sx+16)+'px';
  tip.style.top=(sy+16)+'px';
  // 스테이지 경계 보정 (1536x864 기준)
  requestAnimationFrame(function(){
    var r=tip.getBoundingClientRect();
    if(r.right>sr.right-8)tip.style.left=(sx-r.width/s-12)+'px';
    if(r.bottom>sr.bottom-8)tip.style.top=(sy-r.height/s-12)+'px';
  });
}
function hideLoreTip(){
  var tip=document.getElementById('de-tooltip');
  if(tip)tip.style.display='none';
}

function imgOrEmoji(src,fallback,w,h,style,loreKey){
  w=w||80;h=h||80;
  var tipAttr=loreKey?(' onmouseover="showLoreTip(\''+loreKey+'\',event)" onmouseout="hideLoreTip()"'):'';
  // 이미지가 로드되면 폴백 이모지(.fb)를 즉시 감추고, 로드 실패 시 이미지를 숨겨 폴백을 노출
  // (투명 PNG여도 이모지가 비치지 않도록 onload에서 fb를 display:none 처리)
  return `<div style="width:${w}px;height:${h}px;flex-shrink:0;position:relative;display:flex;align-items:center;justify-content:center;${style||''}"${tipAttr}>
    <div class="fb" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:${Math.round(h*0.5)}px;pointer-events:none">${fallback}</div>
    <img src="${src}" alt="" style="position:relative;width:100%;height:100%;object-fit:contain;z-index:1"
      onload="var fb=this.parentNode.querySelector('.fb');if(fb)fb.style.display='none';"
      onerror="this.style.display='none'">
  </div>`;
}
// 함선 → 도감 로어 키 (LORE_TEXT의 ship_<카탈로그id>).
// fleet 함선은 id 끝에 timestamp가 붙으므로 catalogId/catId 우선, 없으면 trailing _숫자 제거.
function shipLoreKey(ship){
  if(!ship)return null;
  if(ship.catalogId)return 'ship_'+ship.catalogId;
  if(ship.catId)return 'ship_'+ship.catId;
  const sid=String(ship.id||'');
  // 'CHIX_S_BUY_1700000000000' → 'CHIX_S_BUY' / 'S01_main' → 'S01' / 'CAP_123_456' → null
  if(sid.startsWith('CAP_')||sid.startsWith('DBR_')||sid.startsWith('BOSS')||sid.startsWith('HIDDEN_'))return null;
  return 'ship_'+sid.replace(/_(?:\d+|main)$/,'');
}
function shipImgSrc(ship){
  const sid=ship.id||'';
  const nm=(ship.nm||'').toLowerCase();
  // 치크스 함선은 티어별 이미지(CHIX_S/M/L)만 존재 → 티어 접미사 자동 부여
  const _chixByTier=()=>'img/ships/CHIX_'+({'소형':'S','중형':'M','대형':'L','전설기함':'L','신화':'L'}[ship.tier]||'S')+'.png';
  // 0) 우르사 메이저 보스 본체/나포 — 항상 Boss.png 우선
  //    ※ catalogId='URSA' 또는 id가 'BOSS_URSA'/'URSA'/'BOSS'/'BOSS_MAIN'으로 시작하는 경우만
  //    ※ 카탈로그 H12(우르사 메이저 파쇄기)는 catalogId='URSA'가 아니므로 자동 제외 → H12.png 사용
  if((ship.catalogId||'').toUpperCase()==='URSA'
     ||sid.startsWith('BOSS_URSA')||sid==='URSA'||sid==='BOSS'||sid==='BOSS_MAIN')
    return 'img/ships/Boss.png';
  // 0-2) 보이드 팔콘 (나포/보스) — S10.png
  if((ship.catalogId||'').toUpperCase()==='VOID_FALCON'
     ||sid.startsWith('CAP_VOIDFALCON')||sid.startsWith('VOID_FALCON')
     ||ship._isVoidFalconCaptured
     ||(ship.catId==='S10'&&nm.includes('팔콘')))
    return 'img/ships/S10.png';
  // 1) 명시적 catalogId / catId — CHIX 계열은 티어 접미사 보정
  if(ship.catalogId){
    if(/^CHIX$/i.test(ship.catalogId))return _chixByTier();
    return 'img/ships/'+ship.catalogId+'.png';
  }
  if(ship.catId){
    if(/^CHIX$/i.test(ship.catId))return _chixByTier();
    return 'img/ships/'+ship.catId+'.png';
  }
  // 2) 나포 함선 (CAP_xxx): 이름/id로 팩션+티어 추정
  if(sid.startsWith('CAP_')){
    const faction=nm.includes('치크스')||nm.includes('chix')?'CHIX':
                  nm.includes('dbrp')?'DBRP':'PIRATE';
    const sz={'소형':'S','중형':'M','대형':'L','전설기함':'L'}[ship.tier]||'S';
    return 'img/ships/'+faction+'_'+sz+'.png';
  }
  // 3) CHIX 노획 함선 등 (id 예: CHIX_S_BUY_<ts>, CHIX_M_BUY_<ts>) — 티어로 접미사 결정
  if(/^CHIX_/i.test(sid)||/^CHIX$/i.test(sid))return _chixByTier();
  // 4) 일반 함선: id 앞부분
  const catId=sid.replace(/_.*$/,'')||'default';
  return 'img/ships/'+catId+'.png';
}
// 행성 아이콘(원형 PNG): P31은 해방 후 P31_free.png 시도 (없으면 onerror로 P31.png fallback)
function planetImgSrc(pid){
  if(pid==='P31'&&typeof _isEarthFree==='function'&&_isEarthFree())return 'img/planets/P31_free.png';
  return `img/planets/${pid||'P01'}.png`;
}
// 행성 배경 이미지 경로 — P31(지구)은 해방 후 _free 변형 자동 사용 (해당 파일 없으면 기본으로 fallback)
// 파일 형식: P01-P30 = .jpg, P31(봉쇄) = .png, P31_free = .jpg
// 해방 판정: _earthLiberated || ACT>=4 || 우르사 나포함 보유 (어느 하나라도 충족)
function _isEarthFree(){
  if(!G)return false;
  if(G._earthLiberated)return true;
  if((G.act||0)>=4)return true;
  const _has=(arr)=>(arr||[]).some(s=>s&&s.id&&s.id.startsWith('BOSS_URSA'));
  if(_has(G.fleet)||_has(G.reserveFleet))return true;
  return false;
}
function planetBgSrc(pid){
  if(pid==='P31'){
    return _isEarthFree()?'img/bg/P31_free.jpg':'img/bg/P31.png';
  }
  return 'img/bg/'+(pid||'P01')+'.jpg';
}
// onerror 폴백 — .jpg가 없으면 .png 시도, 그것도 없으면 기본 배경
function planetBgFallback(pid){
  return 'img/bg/'+(pid||'P01')+'.png';
}
function partImgSrc(partId){return `img/parts/${partId||'generic'}.png`;}
function crewImgSrc(c){
  if(!c)return`img/crew/generic.png`;
  const gen=(c.ic||'👩').includes('👩')||c.nm?.endsWith('a')?'f':'m';
  return `img/crew/${c.cl||'Merch'}_${gen}.png`;
}
function commImgSrc(cid){return `img/commodities/${cid||'generic'}.png`;}
function charImgSrc(name){return `img/chars/${name}.png`;}
// ── mkThumb (기존 호환) ──────────────────────────────────────────
function mkThumb(emoji,bg,size){
  bg=bg||'#0d1a2a';size=size||76;
  const fs=Math.round(size*.44);
  return `<div style="width:${size}px;height:${size}px;background:${bg};border:1px solid var(--bdr);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:${fs}px;flex-shrink:0;overflow:hidden">${emoji}</div>`;
}
// 카테고리별 이미지 이모지
const CAT_EMOJI={weapon:'⚔️',shield:'🛡️',armor:'🪖',engine:'⚡'};
const TIER_EMOJI={소형:'🛸',중형:'🚀',대형:'🛕',신화:'✦',전설기함:'🏮'};
const FACTION_EMOJI={SF:'🌀',UN:'🌍',MA:'☄️',VX:'💀'};
// 적 전투력 배율: easy -20%, normal 기준, hard +20%, extreme +50%
function getDiffMult(){return{easy:0.25,normal:1.0,hard:1.2,extreme:1.5}[G.difficulty]||1.0;}
// 보상 배율: easy +10%, normal 기준, hard -10%, extreme -20%
function getDiffRewardMult(){return{easy:1.1,normal:1.0,hard:0.9,extreme:0.8}[G.difficulty]||1.0;}
// 통합 보상 배율 (레벨 × 난이도)
function getTotalRewardMult(){return Math.round(getRewardMult()*getDiffRewardMult()*10)/10;}
// 극악 난이도: 적 함선 수 3배 (200% 더 많음)
function getDiffCountMult(){return G.difficulty==='extreme'?3.0:G.difficulty==='hard'?1.3:G.difficulty==='easy'?0.8:1.0;}
// ── 플레이어 내부 레벨 (1~100) ─────────────────────────────────
// 자본 40점 + 함대 25점 + 행성 20점 + 영웅 10점 + 크루 5점 = 100점
function calcPlayerLevel(){
  const creditScore =Math.min(400,Math.floor(G.credits/75000));         // ₡0→0, ₡30M→400
  const fleetScore  =Math.min(250,Math.max(0,(G.fleet.length-1)*30));   // 1척→0, 9척→240
  const planetScore =Math.min(200,Object.values(G.planets).filter(p=>p.owned).length*40); // 5개→200
  const heroScore   =Math.min(100,G.heroes.length*12.5);                // 8명→100
  const crewScore   =Math.min(50, Math.floor(G.crew.length/3)*10);      // 15명→50
  return Math.max(1,Math.min(1000,Math.round(creditScore+fleetScore+planetScore+heroScore+crewScore)));
}
// 레벨 기반 적 강화 배율: 플레이어 전투력 상승에 비례해 적 ATK·HP 증가.
// lv1→×1.00, lv100→×1.30, lv500→×2.50, lv1000→×4.00 (선형)
function getLevelMult(){return 1.0+((calcPlayerLevel()-1)*0.003);}
// ── 적 함선 스펙 미리보기 HTML 생성 (전투 직전 모달용) ────────────────────
function _formatEnemyPreview(enemies,opts){
  if(!enemies||!enemies.length)return'';
  opts=opts||{};
  // 동일 스탯끼리 그룹화 (HP/ATT/INT/TEC + tier)
  const groups={};
  enemies.forEach(e=>{
    const k=`${e.tier||'-'}|${e.maxHP||e.HP||0}|${e.maxSH||0}|${e.ATT||0}|${e.INT||0}|${e.TEC||0}`;
    if(!groups[k])groups[k]={tier:e.tier||'-',hp:e.maxHP||e.HP||0,sh:e.maxSH||0,atk:e.ATT||0,intl:e.INT||0,tec:e.TEC||0,nms:[],cnt:0};
    groups[k].cnt++;
    if(!groups[k].nms.includes(e.nm))groups[k].nms.push(e.nm);
  });
  const _plv=calcPlayerLevel();
  const fp=calcFleetAvgPower();
  const rows=Object.values(groups).map(g=>{
    const lbl=g.cnt>1?`${g.nms[0]} ×${g.cnt}`:g.nms[0]||g.tier;
    const hpRatio=fp.hp>0?(g.hp/fp.hp):1;
    const atkRatio=fp.atk>0?(g.atk/fp.atk):1;
    const hpCol=hpRatio>=1.2?'var(--red)':hpRatio>=0.85?'var(--yellow)':'var(--green)';
    const atkCol=atkRatio>=1.2?'var(--red)':atkRatio>=0.85?'var(--yellow)':'var(--green)';
    return`<tr style="border-top:1px solid rgba(255,255,255,.05)">
      <td style="padding:4px 6px;color:var(--txt);font-size:12px">${lbl}<div style="font-size:10px;color:var(--dim)">${g.tier}</div></td>
      <td style="padding:4px 6px;font-size:12px;color:${hpCol};text-align:right">${g.hp.toLocaleString()}<span style="color:var(--dim)">/${g.sh.toLocaleString()}</span></td>
      <td style="padding:4px 6px;font-size:12px;color:${atkCol};text-align:right">${g.atk}</td>
      <td style="padding:4px 6px;font-size:12px;color:var(--purple);text-align:right">${g.intl}</td>
      <td style="padding:4px 6px;font-size:12px;color:var(--cyan);text-align:right">${g.tec}</td>
    </tr>`;
  }).join('');
  const total=enemies.length;
  const totHP=enemies.reduce((s,e)=>s+(e.maxHP||e.HP||0),0);
  const totATK=enemies.reduce((s,e)=>s+(e.ATT||0),0);
  return`<div style="background:rgba(255,60,60,.06);border:1px solid rgba(255,60,60,.3);border-radius:8px;padding:8px 10px;margin-bottom:10px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <div style="color:var(--red);font-size:13px;font-weight:bold">🎯 적 함선 스펙 (${total}척)</div>
      <div style="font-size:11px;color:var(--dim)">사령관 전투력 <span style="color:var(--cyan)">${_plv}</span> · 강화 ×${getLevelMult().toFixed(2)}</div>
    </div>
    <table style="width:100%;border-collapse:collapse;font-family:'Malgun Gothic','맑은 고딕','Courier New',monospace">
      <thead><tr style="color:var(--dim);font-size:10px;text-align:left">
        <th style="padding:2px 6px;font-weight:normal">함종</th>
        <th style="padding:2px 6px;font-weight:normal;text-align:right">HP/SH</th>
        <th style="padding:2px 6px;font-weight:normal;text-align:right">ATT</th>
        <th style="padding:2px 6px;font-weight:normal;text-align:right">INT</th>
        <th style="padding:2px 6px;font-weight:normal;text-align:right">TEC</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="margin-top:6px;padding-top:5px;border-top:1px dashed rgba(255,255,255,.08);display:flex;justify-content:space-between;font-size:11px;color:var(--dim)">
      <span>총 HP: <span style="color:var(--yellow)">${totHP.toLocaleString()}</span></span>
      <span>총 ATT: <span style="color:var(--red)">${totATK.toLocaleString()}</span></span>
      <span>아군 평균: <span style="color:var(--cyan)">HP ${fp.hp} / ATT ${fp.atk}</span></span>
    </div>
  </div>`;
}
// 초반 약화 배율: 플레이어 전투력이 낮을 때 모든 적대 세력(치크스·해적·적대 행성) 스탯 감소.
// Lv≤100: ×0.70 (반드시 30% 약화), Lv100~150: 선형 복귀, Lv≥150: ×1.00.
// 보스/히든전(isBoss)은 적용 안 함.
function getEarlyGameMult(){
  const lv=calcPlayerLevel();
  if(lv<=100)return 0.70;
  if(lv>=150)return 1.0;
  return 0.70 + (lv-100)/50*0.30;
}
// 플레이어 함대 평균 전투력 (ATK·HP) — 적 스탯 비례 조정용
function calcFleetAvgPower(){
  if(!G.fleet||!G.fleet.length)return{atk:18,hp:120,sh:50};
  let totalATK=0,totalHP=0,totalSH=0;
  G.fleet.forEach(s=>{
    const st=getShipStats(s);
    totalATK+=(st.ATT||18);
    totalHP+=(st.HP||120);
    totalSH+=(st.maxSH||0);
  });
  const n=G.fleet.length;
  return{atk:Math.max(10,Math.round(totalATK/n)),hp:Math.max(80,Math.round(totalHP/n)),sh:Math.max(20,Math.round(totalSH/n))};
}
// 함대 전체 합산 전투력 (보스 스케일링용) — HP/SH/ATT/DEF 모두 포함
function calcFleetTotalPower(){
  let atk=0,hp=0,sh=0,def=0;
  (G.fleet||[]).forEach(s=>{
    const st=getShipStats(s);
    atk+=(+st.ATT||0);
    hp+=(+st.HP||0);
    sh+=(+st.maxSH||0);
    def+=(+st.DEF||0);
  });
  return{atk,hp,sh,def};
}
// 레벨 기반 보상 배율: lv1→×1.0, lv100→×5.0 (선형)
function getRewardMult(){const plv=calcPlayerLevel();return Math.round((1.0+(plv-1)/999*49)*10)/10;}// Lv1=×1.0 ~ Lv1000=×50.0
// 레벨 등급 라벨
function getLevelRank(lv){
  if(lv>=900)return{lb:'전설',col:'#ff4444'};
  if(lv>=700)return{lb:'영웅',col:'var(--purple)'};
  if(lv>=500)return{lb:'정예',col:'var(--gold)'};
  if(lv>=300)return{lb:'숙련',col:'var(--cyan)'};
  if(lv>=150)return{lb:'견습',col:'var(--green)'};
  return{lb:'신참',col:'var(--dim)'};
}
// 명성 등급: 0단계(무명)~7단계(은하의 구원자)
function getRepRank(rep){
  if(rep>=8000)return{lb:'은하의 구원자',col:'#ff44ff',next:9999,ic:'🌌'};
  if(rep>=5000)return{lb:'은하 전설',col:'#ff4444',next:8000,ic:'🔥'};
  if(rep>=3000)return{lb:'제독',col:'var(--purple)',next:5000,ic:'⚜️'};
  if(rep>=1500)return{lb:'전설',col:'var(--gold)',next:3000,ic:'🌟'};
  if(rep>=700) return{lb:'전사',col:'var(--cyan)',next:1500,ic:'⚔️'};
  if(rep>=250) return{lb:'항로사',col:'var(--green)',next:700,ic:'🧭'};
  if(rep>=50)  return{lb:'신인',col:'#aaaaaa',next:250,ic:'🚀'};
  return{lb:'무명',col:'var(--dim)',next:50,ic:'❓'};
}
function startGame(){
  const nm=document.getElementById('ft-nm').value.trim(),co=document.getElementById('ft-co').value.trim(),sh=document.getElementById('ft-sh').value.trim();
  const emailEl=document.getElementById('ft-email');
  const email=emailEl?emailEl.value.trim():'';
  const err=document.getElementById('ft-er');
  if(!nm){err.textContent='사령관명을 입력해 주세요.';return;}
  // 이메일 입력 시 형식 검증 + 클라우드 등록
  if(email){
    if(!window.CloudSave||!CloudSave._validEmail||!CloudSave._validEmail(email)){
      err.textContent='이메일 형식이 올바르지 않습니다 (예: name@example.com)';return;
    }
    G.profile.email=email.toLowerCase().trim();
    try{CloudSave.setEmail(email);}catch(e){}
  }
  G.profile.name=nm;G.profile.company=co||'빅 픽처 스페이스';G.profile.ship=sh||'머스탱';
  err.textContent='';initGame();show('s-prologue');startPrologue();
}

// 타이틀 → 📧 이메일로 게임 불러오기 모달
function showEmailLoadModal(){
  const savedEmail=(window.CloudSave&&CloudSave.getEmail)?CloudSave.getEmail():'';
  const html=`<div style="padding:8px 4px">
    <div style="display:flex;gap:12px;align-items:flex-start;padding:14px;background:var(--card);border:1px solid #66ddff;border-radius:10px;margin-bottom:14px">
      <img src="img/chars/baekgu.png" alt="백구" style="width:48px;height:48px;border-radius:50%;flex-shrink:0;object-fit:cover;background:rgba(0,0,0,.3);border:1.5px solid #66ddff" onerror="this.outerHTML='<div style=\\'font-size:32px;flex-shrink:0\\'>🐕</div>'">
      <div style="color:var(--yellow);font-size:14px;line-height:1.7;word-break:keep-all">
        <div style="color:#66ddff;font-size:11px;font-weight:bold;margin-bottom:3px;letter-spacing:1px">백구</div>
        예전에 등록한 이메일 적으면<br>옛 사령관 진행 상황 다 불러올게.<br>새 이메일이면 빈 상태로 시작이야.
      </div>
    </div>
    <div style="margin-bottom:10px">
      <div style="color:var(--dim);font-size:12px;margin-bottom:5px">📧 이메일 입력</div>
      <input class="inp" id="email-load-input" placeholder="example@email.com" value="${savedEmail}" maxlength="60" type="email" style="font-size:14px" autofocus>
    </div>
    <div id="email-load-err" style="color:var(--red);font-size:12px;min-height:16px;margin-bottom:8px"></div>
    <div id="email-load-ok" style="color:var(--green);font-size:12px;min-height:16px;margin-bottom:8px"></div>
    <div style="font-size:11px;color:var(--dim);line-height:1.6">
      💡 같은 이메일로 어디서든 진행 상황 불러오기 가능<br>
      ⚠️ 보안: 이메일만 알면 누구나 접근 가능 (간편 모드)
    </div>
  </div>`;
  openModal('📧 이메일로 게임 불러오기',html,[
    {txt:'🔍 불러오기',cls:'btn-cyan',fn:async()=>{
      const inp=document.getElementById('email-load-input');
      const err=document.getElementById('email-load-err');
      const ok=document.getElementById('email-load-ok');
      const em=(inp&&inp.value||'').trim();
      err.textContent='';ok.textContent='';
      if(!em){err.textContent='이메일을 입력하세요';return;}
      if(!window.CloudSave){err.textContent='클라우드 시스템 미초기화 — 잠시 후 다시 시도';return;}
      if(!CloudSave._validEmail(em)){err.textContent='이메일 형식이 올바르지 않습니다';return;}
      ok.textContent='⏳ 불러오는 중...';
      try{
        const r=await CloudSave.loadByEmail(em);
        if(r.error){
          if(r.empty){
            err.textContent='해당 이메일로 저장된 게임이 없습니다 — 새 게임으로 시작하세요';
            ok.textContent='';
          } else {
            err.textContent='오류: '+r.error;ok.textContent='';
          }
          return;
        }
        ok.textContent=`✅ ${r.imported}개 슬롯 복원 완료! 잠시 후 슬롯 목록 표시...`;
        setTimeout(()=>{closeModal();showLoadSlots();},800);
      }catch(e){err.textContent='네트워크 오류: '+e.message;ok.textContent='';}
    }},
    {txt:'✕ 취소',cls:'btn-sm',fn:closeModal}
  ]);
}
try{if(typeof window!=='undefined')window.showEmailLoadModal=showEmailLoadModal;}catch(e){}
function getPrologues(){
  const nm=G.profile.name||'사령관';
  const co=G.profile.company||'빅 픽처 스페이스';
  const ship=G.profile.ship||'머스탱';
  return [
    {sp:'시스템',tx:'양자 전송 패킷 수신 완료... '+nm+' 사령관 정신 동기화 99.8%...'},
    {sp:'백구',tx:'어라, 깨어났네? 100년을 기다렸는데 막상 깨어나니까 시시하다.'},
    {sp:'백구',tx:'내가 누구냐고? 백구. AI 진돗개. 100년째 폐지 주으면서 위장 상단 세워놨다.'},
    {sp:'백구',tx:co+' 총사령관 '+nm+'! 할 일은 하나야. 우주 무역·부동산·전투로 돈 벌고 지구 봉쇄한 우르사 메이저 박살내.'},
    {sp:'백구',tx:'내가 폐지 주워서 이만큼 세워놨으니, '+nm+'! 함선 '+ship+'에 올라타서 전설 영웅들 징발해서 지구 구하러 가자고!'},
    {sp:'시스템',tx:'P01 프록시마 b — '+nm+' 사령관 각성. '+co+' 허브 접속 중...'}
  ];
}
let pIdx=0;
function startPrologue(){pIdx=0;renderPrologue();}
function renderPrologue(){
  const pl=getPrologues();
  const l=pl[pIdx];
  const box=document.getElementById('pr-lines');
  const isBaekgu=l.sp==='백구';
  // 화자에 따라 캐릭터 이미지 표시/숨김
  const charDiv=document.getElementById('pr-char');
  if(charDiv)charDiv.style.opacity=isBaekgu?'1':'0.25';
  // 화자 레이블: 백구는 이미지 + 이름, 시스템은 아이콘
  const spHTML=isBaekgu
    ?`<div style="display:inline-flex;align-items:center;gap:7px;margin-bottom:6px">
        <img src="img/chars/baekgu.png" alt="백구"
          style="width:30px;height:30px;object-fit:contain;border-radius:50%;background:var(--panel);border:1px solid var(--cyan)"
          onerror="this.style.display='none'">
        <span style="color:var(--cyan);font-size:13px;font-weight:bold">백구</span>
      </div>`
    :`<div style="color:var(--muted);font-size:12px;letter-spacing:2px;margin-bottom:6px">⚡ 시스템</div>`;
  box.innerHTML=spHTML+`<div style="color:var(--yellow);font-size:17px;line-height:1.9;word-break:keep-all;overflow-wrap:break-word;padding:0 8px">${l.tx}</div>`;
  const btn=document.getElementById('pr-btn');
  btn.style.display='inline-block';
  btn.textContent=pIdx<pl.length-1?'계속 ▶':'허브로 →';
}
function nextPrologue(){const pl=getPrologues();if(pIdx<pl.length-1){pIdx++;renderPrologue();}else showHub();}

// ═══ HUB ════════════════════════════════════════════════════
function showHub(){
  show('s-hub');
  // 보스 격파 후 지구(P31) 행성 데이터 마이그레이션 — 옛 세이브에도 항상 P31이 접근 가능하도록.
  // 이 블록이 없으면 _earthLiberated만 있고 G.planets['P31']이 없어 항로/이동이 막힘.
  if(G&&G._earthLiberated){
    if(!G.planets)G.planets={};
    if(!G.planets['P31']){G.planets['P31']={fog:'A',owned:false,commerce:0};}
    else if(G.planets['P31'].fog==='L')G.planets['P31'].fog='A';
  }
  // 지도 위치/연결망에 P31이 없으면 재생성 — 옛 세이브 호환
  if(G&&typeof PLANET_DEF!=='undefined'){
    const _hasAllPlanets=PLANET_DEF.every(p=>G.mapPositions&&G.mapPositions[p.id]);
    if(!_hasAllPlanets){
      try{
        G.mapPositions=generateGalaxy(1000);
        G.mapConns=buildConnections(G.mapPositions);
      }catch(e){console.warn('[migration] map rebuild failed',e.message);}
    }
    // P31(지구)을 은하 중앙(0,0) 근방으로 강제 이동 — ring 6 클러스터(좌우 행성)의 자연 연결망을 보호.
    // buildConnections는 MAX_DIST 180px 이내 인접 행성만 후보로 보므로 P31이 멀어지면 다른 행성의 슬롯을 빼앗지 않음.
    // 그러면 P31은 어디와도 자동 연결되지 못하지만 — 2단계에서 "고립된 행성은 거리 무관 최근접 1개에 강제 연결"되어 1개 항로는 보장됨.
    // 추가로 보다 풍부한 진입로를 위해 ring 6 저항군 클러스터의 중심 행성 1~2개와 수동 연결을 추가한다.
    if(G.mapPositions&&G.mapPositions['P31']&&G.mapPositions['P24']){
      // P31을 ring6 클러스터 아래쪽 외곽(200px 아래)에 배치 — MAX_DIST(180)보다 멀어 기존 인접 행성 슬롯을 빼앗지 않음.
      // 은하 중앙(0,0)은 블랙홀과 겹치므로 회피. P24 기준 200px 아래 — 시각적으로 F06 저항군 클러스터와 가깝게.
      const _p24=G.mapPositions['P24'];
      const _newP31={x:_p24.x,y:_p24.y+200};
      const _cur=G.mapPositions['P31'];
      if(!_cur||Math.abs(_cur.x-_newP31.x)>1||Math.abs(_cur.y-_newP31.y)>1){
        G.mapPositions['P31']=_newP31;
        try{
          G.mapConns=buildConnections(G.mapPositions);
          // 수동 보강: P31 ↔ ring6 저항군 핵심 행성 (P22, P24, P26) 강제 연결 — 좌우 진입 보장
          const _earthLinks=['P22','P24','P26'];
          const _has=(a,b)=>G.mapConns.some(c=>(c.a===a&&c.b===b)||(c.a===b&&c.b===a));
          _earthLinks.forEach(pid=>{
            if(G.mapPositions[pid]&&!_has('P31',pid)){
              const pa=G.mapPositions['P31'],pb=G.mapPositions[pid];
              G.mapConns.push({a:'P31',b:pid,d:Math.hypot(pa.x-pb.x,pa.y-pb.y)});
            }
          });
        }catch(e){}
      }
    }
  }
  // 엔딩 재생 체크: 보스 격파(_earthLiberated) 후 엔딩 미시청 상태로 로드되면 자동 재생.
  // 한 번 시청 후 _endingShown=true로 차단. replayEnding() 글로벌로 수동 재생도 가능.
  const _shouldAutoEnding=!!(G&&G._earthLiberated&&!G._endingShown&&typeof showEndingCredits==='function');
  try{AudioMgr.playBgm(_shouldAutoEnding?'P31':_planetBgmName(G.currentPlanet));}catch(e){}
  if(_shouldAutoEnding){
    setTimeout(()=>{
      try{
        G.currentPlanet='P31';
        if(!G.planets)G.planets={};
        if(!G.planets['P31'])G.planets['P31']={fog:'A',owned:false,commerce:0};
        else G.planets['P31'].fog='A';
        showEndingCredits(()=>{});
      }catch(e){console.warn('[ending] auto-replay failed',e.message);}
    },800);
  }
  // 배경 이미지 즉시 프리로드 (깜빡임 방지)
  (function(){
    const hubBg=document.getElementById('hub-planet-bg');
    const _key=G.currentPlanet+(G.currentPlanet==='P31'&&_isEarthFree()?'#free':'');
    if(!hubBg||hubBg._loadedPlanet===_key)return;
    const src=planetBgSrc(G.currentPlanet);
    const pre=new Image();
    pre.onload=function(){
      hubBg.style.backgroundImage='url('+src+')';
      hubBg._loadedPlanet=_key;
      hubBg.style.opacity=(G._currentHubTab==='main')?'1.0':'.0';
    };
    pre.onerror=function(){
      // .jpg 실패 시 .png fallback
      const _fbSrc=planetBgFallback(G.currentPlanet);
      if(src!==_fbSrc){
        const fb=new Image();
        fb.onload=function(){hubBg.style.backgroundImage='url('+_fbSrc+')';hubBg._loadedPlanet=_key;hubBg.style.opacity=(G._currentHubTab==='main')?'1.0':'.0';};
        fb.onerror=function(){hubBg._loadedPlanet=_key;};
        fb.src=_fbSrc;
      }else{hubBg._loadedPlanet=_key;}
    };
    pre.src=src;
  })();
  updateHUD();
  const cmd=document.getElementById('hub-cmd');if(cmd)cmd.textContent=G.profile.name||'사령관';
  // 사이드바 폴더 기본 열기
  openFolder('captain');openFolder('dock');openFolder('plaza');openFolder('front');
  hubTab('main');
  // 초기 백구 인사
  const greets=['허브 접속 완료. 무역하든 전투하든 네 마음대로.',
    '빅 픽처 스페이스 허브. 크레딧 벌어야 지구 구한다.',
    '지구 봉쇄 해제까지 아직 멀었다. 열심히 해.',
    '돌아왔네. 퀘스트 확인해봐.'];
  setTimeout(()=>baekgu(greets[Math.floor(Math.random()*greets.length)]),500);
  // 주기적 조언 (45초 간격)
  if(showHub._tip)clearInterval(showHub._tip);
  const tips=['크레딧이 부족하면 특산물 무역이 제일 빨라.','해적 잡을수록 명성 올라가. 명성 높으면 가챠 확률도 오른다.','행성 경매로 땅 사두면 턴마다 세금 들어와.','동료 탑승시키면 함선 성능 올라가. 크루탭 확인해봐.','파츠 장착 안 된 함선은 전투력 낭비야.','보이드 에센스는 7링 균열지대에서 구할 수 있어.','영웅 영입하면 함선 성능 1.2배 올라가.','퀘스트 수락하면 추가 크레딧 벌 수 있어.'];
  showHub._tip=setInterval(()=>{
    if(!document.getElementById('s-hub')?.classList.contains('on'))return;
    // 스토리 진행 힌트 우선 — 80% 확률로 등장 (이전 50% → 80%로 증가, 다음 할 일 안내 강조)
    if(Math.random()<0.8){baekgu(getBaekguStoryHint());return;}
    baekgu(tips[Math.floor(Math.random()*tips.length)]);
  },25000);  // 25초 간격 (이전 45초 → 25초)
}
const ALL_TABS=['main','map','plaza','front','tavern','gacha','auction','clog','ship','crew','planets','trade','quest','combat','result'];
function setHubNav(tab){
  // Clear all active states
  document.querySelectorAll('.hn-btn,.hn-folder-btn').forEach(b=>b.classList.remove('on'));
  if(tab==='main'){const b=document.getElementById('hn-main');if(b)b.classList.add('on');return;}
  // Folder membership
  const captainTabs=['map','crew','clog','combat','result','codex'];
  const dockTabs=['ship','craft','garage'];
  const plazaTabs=['tavern','gacha','trade','quest','plaza'];
  const frontTabs=['auction','planets','front'];
  let folderId=null;
  if(dockTabs.includes(tab))folderId='dock';
  else if(plazaTabs.includes(tab))folderId='plaza';
  else if(frontTabs.includes(tab))folderId='front';
  else if(captainTabs.includes(tab))folderId='captain';
  if(folderId){
    openFolder(folderId);
    const folderBtn=document.querySelector('#folder-'+folderId+' .hn-folder-btn');
    if(folderBtn)folderBtn.classList.add('on');
    document.querySelectorAll('.hn-sub[data-tab="'+tab+'"]').forEach(b=>b.classList.add('on'));
  }
}
function toggleFolder(name){
  const items=document.getElementById('folder-items-'+name);
  const folder=document.getElementById('folder-'+name);
  if(!items||!folder)return;
  const opening=!items.classList.contains('open');
  items.classList.toggle('open');
  folder.classList.toggle('open-folder');
  // 버튼 색상도 토글
  const btn=folder.querySelector('.hn-folder-btn');
  if(btn)btn.classList.toggle('on',opening);
}
function openFolder(name){
  const items=document.getElementById('folder-items-'+name);
  const folder=document.getElementById('folder-'+name);
  if(!items||!folder)return;
  items.classList.add('open');
  folder.classList.add('open-folder');
  const btn=folder.querySelector('.hn-folder-btn');
  if(btn)btn.classList.add('on');
}
// ── 행성 허브 진행도 헬퍼 ─────────────────────────────────────
function getPlanetHubThreshold(pid){
  return 15; // 5회마다 광장→도크→프론트 순서 해금 (3단계 × 5)
}
// 행성 허브 단계: 0=전부잠금 1/2/3=각 단계 해금
// 단계가 해금하는 시설은 팩션별로 다름 — _getStageOrder() 참조
// 기본 순서: 광장 → 도크 → 프론트
// F01(수퍼비아)/F02(아우레우스)/F03(메카니카): 도크 → 광장 → 프론트
function _getStageOrder(pid){
  const pd=PLANET_DEF.find(p=>p.id===pid);
  const f=pd?.f;
  if(f==='F01'||f==='F02'||f==='F03')return['dock','plaza','front'];
  return['plaza','dock','front'];
}
// 카테고리(plaza/dock/front)가 해금되는 단계(1/2/3) 반환
function _getCategoryStage(pid,cat){
  return _getStageOrder(pid).indexOf(cat)+1;
}
function _getHubThr(pid){
  // 행성 팩션에 따라 단계별 임계값 결정
  // F01: 1/2/3회, F02·F03: 2/3/5회, 기타: 5/10/15회
  const pd=PLANET_DEF.find(p=>p.id===pid);
  const f=pd?.f;
  if(f==='F01')return{s1:1,s2:2,s3:3};
  if(f==='F02'||f==='F03')return{s1:2,s2:3,s3:5};
  return{s1:5,s2:10,s3:15};
}
function getPlanetHubStage(pid){
  const prog=getPlanetHubProgress(pid);
  const t=_getHubThr(pid);
  if(prog>=t.s3)return 3;
  if(prog>=t.s2)return 2;
  if(prog>=t.s1)return 1;
  return 0;
}
function getPlanetHubProgress(pid){
  if(!G.planets[pid])return 0;
  return G.planets[pid].hubProg||0;
}
function isPlanetHubUnlocked(pid){
  const t=_getHubThr(pid);
  return getPlanetHubProgress(pid)>=t.s3;
}
function addHubProgress(pid){
  if(!G.planets[pid])G.planets[pid]={};
  const prev=G.planets[pid].hubProg||0;
  G.planets[pid].hubProg=prev+1;
  const cur=G.planets[pid].hubProg;
  const pd=PLANET_DEF.find(p=>p.id===pid);
  const nm=pd?.nm||pid;
  const t=_getHubThr(pid);
  const order=_getStageOrder(pid);
  const unlockMsg={
    plaza:{n:'🔓 '+nm+' — 행성 광장 개방! (제독·주점·상점)',b:'광장이 열렸어. 제독 의뢰·주점 가챠·상점 무역 이용 가능해.'},
    dock :{n:'🔓 '+nm+' — 함선 도크 개방! (거래소·제작소·정비소)',b:'도크 시설이 열렸어. 함선 거래소·제작소·정비소 이용 가능해.'},
    front:{n:'🔓 '+nm+' — 행성 프론트 완전 개방! 모든 시설 이용 가능',b:'이 행성 완전 개방이야. 이제 전부 쓸 수 있어.'}
  };
  let stageIdx=-1;
  if(cur===t.s1)stageIdx=0;
  else if(cur===t.s2)stageIdx=1;
  else if(cur===t.s3)stageIdx=2;
  if(stageIdx>=0){
    const m=unlockMsg[order[stageIdx]];
    notify(m.n,'gold');
    baekgu(m.b);
  }
  updateHubLockButtons();
}
function updateHubLockButtons(){
  const pid=G.currentPlanet;
  const stage=getPlanetHubStage(pid);
  const prog=getPlanetHubProgress(pid);
  // 카테고리별 해금 단계는 팩션별 동적 (_getStageOrder)
  const t=_getHubThr(pid);
  const thrByStage={1:t.s1,2:t.s2,3:t.s3};
  ['dock','plaza','front'].forEach(folder=>{
    const btn=document.querySelector('#folder-'+folder+' .hn-folder-btn');
    if(!btn)return;
    const need=_getCategoryStage(pid,folder);
    const unlocked=stage>=need;
    const lbl=btn.querySelector('span:nth-child(2)');
    if(!lbl)return;
    if(!lbl.dataset.origText)lbl.dataset.origText=lbl.textContent.replace(/ 🔒.*$/,'');
    if(!unlocked){
      btn.style.opacity='0.45';
      lbl.textContent=lbl.dataset.origText+' 🔒 '+prog+'/'+thrByStage[need];
    } else {
      btn.style.opacity='';
      lbl.textContent=lbl.dataset.origText;
    }
  });
}
function hubTab(tab){
  // ── 행성 허브 단계별 잠금 체크 ────────────────────────────
  // quest·clog·map·main·combat·result·crew·codex 는 항상 허용
  const _alwaysOpen=['main','map','combat','result','clog','crew','codex','quest'];
  if(!_alwaysOpen.includes(tab)){
    const pid=G.currentPlanet;
    const stage=getPlanetHubStage(pid);
    const prog=getPlanetHubProgress(pid);
    // 카테고리별 단계는 팩션별 동적 (_getCategoryStage)
    const _plazaTabs=['tavern','gacha','trade','quest'];
    const _dockTabs=['ship','craft','garage'];
    const _frontTabs=['front','plaza','planets','auction'];
    let needed=0,stageName='',stageEmoji='🏗️';
    if(_plazaTabs.includes(tab)){needed=_getCategoryStage(pid,'plaza');stageName='행성 광장';stageEmoji='🏪';}
    else if(_dockTabs.includes(tab)){needed=_getCategoryStage(pid,'dock');stageName='함선 도크';stageEmoji='🚀';}
    else if(_frontTabs.includes(tab)){needed=_getCategoryStage(pid,'front');stageName='행성 프론트';stageEmoji='🌐';}
    if(needed>0&&stage<needed){
      const pd=PLANET_DEF.find(p=>p.id===pid);
      const _thr2=_getHubThr(pid);
      const nextGoal=needed===1?_thr2.s1:needed===2?_thr2.s2:_thr2.s3;
      G._currentHubTab='main';
      setHubNav('main');
      updateFleetBar();
      // 잠금 화면에서는 행성 배경 이미지를 어둡게 처리해 가독성 확보
      const hubBg=document.getElementById('hub-planet-bg');
      if(hubBg)hubBg.style.opacity='0.18';
      const body=document.getElementById('hub-body');
      body.classList.remove('cv');document.body.classList.remove('combat-mode');
      const _thr=_getHubThr(pid);
      // NPC 멘트 — tab과 행성에 따라 다른 위트있는 대사
      const npcInfo=_getLockedNpcDialog(tab,pid,pd);
      body.innerHTML=`<div style="display:flex;align-items:center;justify-content:center;height:100%;padding:24px;position:relative">
        <div style="background:rgba(5,10,22,.92);border:2px solid var(--red);border-radius:14px;padding:24px 28px;max-width:620px;width:100%;text-align:center;display:flex;flex-direction:column;gap:14px;backdrop-filter:blur(4px);box-shadow:0 10px 40px rgba(0,0,0,.7)">
          <div style="display:flex;align-items:center;gap:18px;text-align:left;background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:16px 18px">
            <div style="font-size:78px;line-height:1;flex-shrink:0;filter:drop-shadow(0 0 14px rgba(255,80,80,.3))">${npcInfo.ic}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:14px;color:var(--cyan);font-weight:bold;margin-bottom:6px">${npcInfo.title}</div>
              <div style="font-size:20px;color:var(--yellow);line-height:1.7;word-break:keep-all">"${npcInfo.line}"</div>
            </div>
          </div>
          <div style="font-size:17px;font-weight:bold;color:var(--red)">🔒 ${stageName} 잠금</div>
          <div style="color:var(--dim);font-size:14px;line-height:1.9">
            퀘스트 완료 또는 해적 격파 <b style="color:var(--gold)">${nextGoal}회</b> 달성 시 개방
            &nbsp;·&nbsp; <span style="color:var(--cyan)">현재 ${prog} / ${nextGoal}</span>
          </div>
          <div style="background:rgba(0,243,255,.06);border:1px solid rgba(0,243,255,.4);border-radius:8px;padding:10px 14px;font-size:13px;line-height:1.9;text-align:left">
            <div style="color:var(--yellow);font-weight:bold;margin-bottom:4px">📋 해금 단계</div>
            ${(()=>{const ord=_getStageOrder(pid);const lbl={plaza:'🏪 행성 광장 (제독·주점·상점)',dock:'🚀 함선 도크 (거래소·제작·정비)',front:'🌐 행성 프론트 (경매·현황)'};const thArr=[_thr.s1,_thr.s2,_thr.s3];return ord.map((cat,i)=>`<div style="color:${prog>=thArr[i]?'var(--green)':'var(--dim)'}">${prog>=thArr[i]?'✅':'⬜'} ${thArr[i]}회 → ${lbl[cat]}</div>`).join('');})()}
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">
            <button class="btn btn-sm btn-green" onclick="hubTab('quest')" ${stage>=1?'':'disabled style=\"opacity:.4\"'}>🎖️ 퀘스트 수락</button>
            <button class="btn btn-sm" style="border-color:var(--cyan);color:var(--cyan)" onclick="hubTab('main')">🏠 메인 허브로</button>
          </div>
        </div>
      </div>`;
      return;
    }
  }
  G._currentHubTab=tab;
  setHubNav(tab);
  // 함대 바 항상 갱신
  updateFleetBar();
  // update bg opacity instantly
  const hubBg=document.getElementById('hub-planet-bg');
  if(hubBg){
    hubBg.style.opacity=(tab==='main')?'1.0':'.0';
  }
  const body=document.getElementById('hub-body');
  if(!['map','combat','gacha','tavern'].includes(tab))body.classList.remove('cv');
  // combat-mode 클래스는 실제 전투 중일 때만 유지 (renderCombatView가 set)
  if(tab!=='combat')document.body.classList.remove('combat-mode');
  if(tab==='main')renderMain(body);
  else if(tab==='map'){applyJangYeongsilEffect();body.classList.add('cv');renderMapView(body);}
  else if(tab==='plaza')renderPlazaView(body);
  else if(tab==='front')renderFrontView(body);
  else if(tab==='tavern'||tab==='gacha')renderTavernView(body);
  else if(tab==='auction')renderAuctionView(body);
  else if(tab==='clog')renderCombatLog(body);
  else if(tab==='ship'){renderShipTab(body);}
  else if(tab==='crew')renderCrewTab(body);
  else if(tab==='planets')renderPlanetsTab(body);
  else if(tab==='trade')renderTradeTab(body);
  else if(tab==='quest')renderQuestTab(body);
  else if(tab==='codex')renderCodexTab(body);
  else if(tab==='craft')renderCraftTab(body);
  else if(tab==='garage'){renderGarageTab(body);}
}

// ═══ 허브 공간 배경 이미지 배너 ════════════════════════════════
function hubBanner(tabId,emoji,label,factionId){
  const genSrc='img/hub/'+tabId+'.png';
  // 팩션 폴더 우선 시도는 폴더가 없을 경우 onerror 폴백을 거치며 깜빡임 발생 → 기본 이미지만 사용
  // 팩션별 변형이 필요하면 명시적으로 img/hub/<faction>/<tab>.png 만든 후 코드에서 활성화
  const firstSrc=genSrc;
  // 시설 NPC 담당자 이미지: trade·quest·tavern·craft·ship·garage·auction 7종 한정
  const _NPC_TABS=['trade','quest','tavern','craft','ship','garage','auction'];
  const _hasNpc=_NPC_TABS.indexOf(tabId)>=0;
  const _pid=G&&G.currentPlanet;
  // 폴백 체인: planet → faction → generic
  const npcPlanetSrc=_hasNpc&&_pid?'img/hub_npc/'+tabId+'_'+_pid+'.png':'';
  const npcFactionSrc=_hasNpc&&factionId?'img/hub_npc/'+tabId+'_'+factionId+'.png':'';
  const npcGenSrc=_hasNpc?'img/hub_npc/'+tabId+'.png':'';
  const npcFirst=npcPlanetSrc||npcFactionSrc||npcGenSrc;
  const npcHtml=_hasNpc?(
    '<img src="'+npcFirst+'" data-fac="'+npcFactionSrc+'" data-gen="'+npcGenSrc+'" alt="" style="position:absolute;right:8px;bottom:0;height:104px;width:auto;max-width:140px;object-fit:contain;object-position:bottom right;z-index:2;filter:drop-shadow(-2px 0 8px rgba(0,0,0,.5));pointer-events:none" '+
    'onerror="var f=this.dataset.fac,g=this.dataset.gen;if(f&&!this.src.endsWith(f)){this.src=f}else if(g&&!this.src.endsWith(g)){this.src=g}else{this.style.display=\'none\'}">'
  ):'';
  const bannerH=_hasNpc?96:60;
  return '<div style="position:relative;width:100%;height:'+bannerH+'px;border-radius:8px;overflow:hidden;margin-bottom:8px;flex-shrink:0;background:rgba(5,10,22,.8)">'
    +'<img src="'+firstSrc+'" data-gen="'+genSrc+'" alt="'+label+'" style="width:100%;height:100%;object-fit:cover;display:block" onerror="var g=this.dataset.gen;if(this.src!==g&&this.src!==location.origin+\'/\'+g&&!this.src.endsWith(g)){this.src=g}else{this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'}">'
    +'<div style="display:none;position:absolute;inset:0;align-items:center;justify-content:center;flex-direction:column;gap:6px">'
    +'<div style="font-size:52px;opacity:.35">'+emoji+'</div>'
    +'<div style="color:rgba(0,243,255,.3);font-size:11px">'+(factionId?'img/hub/'+factionId+'/'+tabId+'.png':genSrc)+'</div>'
    +'</div>'
    +'<div style="position:absolute;inset:0;background:linear-gradient(0deg,rgba(5,10,22,.7) 0%,transparent 65%);pointer-events:none"></div>'
    +npcHtml
    +'</div>';
}

// ═══ MAIN HUB VIEW ═══════════════════════════════════════════
function renderMain(body){
  updateHubLockButtons();
  if(!body)return;
  const owned=Object.values(G.planets||{}).filter(p=>p.owned).length;
  const tax=calcTurnTax();const pd=PLANET_DEF.find(p=>p.id===G.currentPlanet)||PLANET_DEF[0];const fac=pd?FACTION[pd.f]:null;
  try{body.innerHTML=`
    <div style="display:flex;gap:8px;padding:8px 14px;background:rgba(13,26,42,.98);border-bottom:1px solid var(--bdr);flex-wrap:nowrap;overflow-x:auto;flex-shrink:0;scrollbar-width:none">
      <div class="ic"><span class="icl">위치</span><span class="icv" style="color:${fac?.col||'var(--cyan)'}">📍 ${pd?.nm||'?'}</span></div>
      <div class="ic"><span class="icl">함선</span><span class="icv">🛸 ${G.fleet.length}척</span></div>
      <div class="ic"><span class="icl">크루</span><span class="icv">👥 ${G.crew.length}명</span></div>
      <div class="ic"><span class="icl">행성</span><span class="icv">🌍 ${owned}개</span></div>
      <div class="ic"><span class="icl">영웅</span><span class="icv" style="color:var(--gold)">⚡ ${G.heroes.length}/8</span></div>
      <div class="ic"><span class="icl">턴세금</span><span class="icv" style="color:var(--green)">₡${tax.toLocaleString()}</span></div>
      <div class="ic"><span class="icl">ACT/TURN</span><span class="icv" style="color:var(--cyan)">${G.act}/${G.turn}</span></div>
      ${(()=>{const lv=calcPlayerLevel(),rk=getLevelRank(lv);return`<div class="ic"><span class="icl">레벨</span><span class="icv" style="color:${rk.col};font-weight:bold">Lv.${lv} <span style="font-size:12px">${rk.lb}</span></span></div>`;})()}
      ${(()=>{const rep=G.reputation||0,rr=getRepRank(rep);const next=rr.next;const pct=Math.min(100,next>0?Math.round(rep/next*100):100);return`<div class="ic" style="min-width:110px"><span class="icl">명성</span><span class="icv" style="color:${rr.col};font-weight:bold">${rr.ic} ${rr.lb}</span><div style="margin-top:2px;height:3px;background:rgba(255,255,255,.1);border-radius:2px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${rr.col};transition:width .4s"></div></div><div style="font-size:9px;color:var(--dim);text-align:right;margin-top:1px">${rep}${next<9999?' / '+next:''}</div></div>`;})()}
      ${(G.stayTurns||0)>=2?`<div class="ic"><span class="icl">체류</span><span class="icv" style="color:var(--red);font-weight:bold">${G.stayTurns}/3턴 ⚠️</span></div>`:(G.stayTurns||0)>0?`<div class="ic"><span class="icl">체류</span><span class="icv" style="color:var(--dim)">${G.stayTurns}/3턴</span></div>`:''}
    </div>
    <div style="flex:1;position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center">
      ${buildSceneHTML(pd,fac)}
      <div style="position:absolute;top:12px;left:50%;transform:translateX(-50%);background:rgba(13,26,42,.92);border:1px solid var(--cyan);border-radius:10px;padding:10px 18px;max-width:500px;text-align:center;pointer-events:none;z-index:20">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px">${imgOrEmoji('img/chars/baekgu.png','🐕',28,28,'border-radius:50%;background:var(--panel)')}<span style="color:var(--cyan);font-size:12px">백구</span></div>
        <div style="color:var(--yellow);font-size:14px;line-height:1.6">${getBaekguLine()}</div>
      </div>
    </div>
    <div style="background:rgba(13,26,42,.97);border-top:1px solid var(--bdr);flex-shrink:0">
      <div style="display:flex;align-items:center;gap:14px;padding:4px 16px;overflow-x:auto;height:36px;border-bottom:1px solid rgba(0,243,255,.1)">
        <span style="color:var(--dim);font-size:12px">📋</span>
        <span style="color:var(--txt);font-size:13px;white-space:nowrap">${G.turn===0?'게임 시작 — 왼쪽 패널에서 메뉴를 선택하세요':`TURN ${G.turn} | ${pd?.nm||''} 정박 중`}</span>
        ${G.heroes.length>0?`<span style="color:var(--gold);font-size:13px;white-space:nowrap">영웅: ${G.heroes.map(h=>HEROES[h]?.ic||'').join(' ')}</span>`:''}
        ${G._earthLiberated?`<button onclick="replayEnding()" style="padding:3px 10px;border:1px solid #cc66ff;border-radius:5px;background:rgba(204,102,255,.12);color:#cc66ff;cursor:pointer;font-size:12px;font-family:inherit;white-space:nowrap" title="우르사 격파 엔딩 영상을 다시 시청">🎬 엔딩 다시 보기</button>`:''}
        ${(()=>{
          if(!pd?.hostile)return'';
          const waves=G.chixWaves||0;const stay=G.stayTurns||0;
          const warnCol=waves>=4?'var(--red)':waves>=2?'#cc55ff':'#ff8844';
          const threat=waves>=5?'☠️최종':waves>=4?'🔴위급':waves>=3?'🟠경고':waves>=2?'🟡주의':'🟢안전';
          return`<span style="color:${warnCol};font-size:13px;white-space:nowrap;background:rgba(139,0,255,.12);border:1px solid rgba(139,0,255,.3);border-radius:4px;padding:2px 7px">🛸 치크스 ${threat} | 출몰 ${waves}/5회 | 체류 ${stay}턴${stay>=2?' ⚠️ 출몰 50%':''}</span>`;
        })()}
      </div>
      <!-- 함대 정보는 하단 바(#bk-fleet)에 항상 표시 -->
    </div>`;
  }catch(e_rm){console.error('[renderMain error]',e_rm);body.innerHTML='<div style="padding:20px;color:#f88">렌더링 오류: '+e_rm.message+'</div>';}
}
function getBaekguLine(){
  const lines=[`${G.profile.name||'사령관'}, 왼쪽 메뉴에서 원하는 거 골라.`,
    `보유 크레딧 ₡${G.credits.toLocaleString()}. ${G.credits<10000?'이거 부족해.':'은하계 경로 열어서 탐험해.'}`,
    `${G.heroes.length>0?`영웅 ${G.heroes.map(h=>HEROES[h]?.nm||'').join(', ')} 합류 중.`:'영웅 아직 없어. 행성 탐험해서 찾아.'}`,
    `크루 ${G.crew.length}명 보유. ${G.crew.length<5?'더 뽑아야 해.':'이 정도면 됐어.'}`,
    '함선 파츠 장착하면 전투력 올라. 상점에서 구매해.'];
  return lines[G.turn%lines.length];
}
function buildSceneSVG(pd,fac){
  // SVG 폴백 씬 (PNG 로드 실패시)
  const fc=fac?.col||'#00f3ff',pnm=pd?.nm||'?',snm=G.fleet[0]?.nm||'머스탱';
  const isHostile=!!pd?.hostile,isVoid=pd?.f==='F07';
  const pf=isHostile?'#3a0010':isVoid?'#001a2a':'#0d2a4a';
  const stars=Array.from({length:55},(_,i)=>`<circle cx="${(Math.sin(i*137.5+1)*450+450).toFixed(1)}" cy="${(Math.cos(i*97.3+2)*210+220).toFixed(1)}" r="${(0.4+Math.abs(Math.sin(i*23))*1.2).toFixed(1)}" fill="white" opacity="${(0.3+Math.abs(Math.sin(i*17))*0.6).toFixed(1)}"/>`).join('');
  return `<svg viewBox="0 0 900 440" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;position:absolute;top:0;left:0">
  <defs>
    <radialGradient id="sbg" cx="50%" cy="50%"><stop offset="0%" stop-color="#0d1a3a"/><stop offset="100%" stop-color="#050a1a"/></radialGradient>
    <radialGradient id="pglow" cx="50%" cy="40%"><stop offset="0%" stop-color="${pf}" stop-opacity="1"/><stop offset="100%" stop-color="${pf}" stop-opacity=".5"/></radialGradient>
    <filter id="gf"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <clipPath id="wclip"><ellipse cx="700" cy="200" rx="180" ry="160"/></clipPath>
  </defs>
  <rect width="900" height="440" fill="url(#sbg)"/>${stars}
  <!-- 창문 영역 -->
  <ellipse cx="700" cy="200" rx="185" ry="165" fill="#050a1a" stroke="${fc}" stroke-width="3" opacity=".8"/>
  <circle cx="700" cy="175" r="120" fill="url(#pglow)" clip-path="url(#wclip)" opacity=".9"/>
  <circle cx="700" cy="175" r="125" fill="none" stroke="${fc}" stroke-width="1" opacity=".4"/>
  <text x="700" y="310" text-anchor="middle" fill="${fc}" font-size="11" font-family="Malgun Gothic, 맑은 고딕, Courier New, monospace" opacity=".8">${pnm}</text>
  <!-- 창문 프레임 볼트 -->
  <circle cx="523" cy="145" r="5" fill="#2a4a6a" stroke="${fc}" stroke-width="1"/>
  <circle cx="877" cy="145" r="5" fill="#2a4a6a" stroke="${fc}" stroke-width="1"/>
  <circle cx="523" cy="255" r="5" fill="#2a4a6a" stroke="${fc}" stroke-width="1"/>
  <circle cx="877" cy="255" r="5" fill="#2a4a6a" stroke="${fc}" stroke-width="1"/>
  <!-- 정거장 내부 구조 -->
  <rect x="0" y="380" width="900" height="60" fill="#0a1520"/>
  <rect x="0" y="375" width="900" height="8" fill="#1a3a5a"/>
  <line x1="100" y1="375" x2="100" y2="440" stroke="#1a2a3a" stroke-width="2"/>
  <line x1="250" y1="375" x2="250" y2="440" stroke="#1a2a3a" stroke-width="2"/>
  <line x1="450" y1="375" x2="450" y2="440" stroke="#1a2a3a" stroke-width="2"/>
  <!-- 함선 SVG 폴백 -->
  <g transform="translate(180,280)">
    <ellipse cx="-40" cy="0" rx="18" ry="6" fill="#ff6600" opacity=".5"/>
    <polygon points="-55,14 70,0 -55,-14" fill="#1a3a5a" stroke="${fc}" stroke-width="1.5"/>
    <ellipse cx="38" cy="0" rx="20" ry="10" fill="#0a2a4a" stroke="${fc}" stroke-width="1"/>
    <text x="5" y="25" text-anchor="middle" fill="${fc}" font-size="10" font-family="Malgun Gothic, 맑은 고딕, Courier New, monospace">${snm}</text>
  </g>
  </svg>`;
}
function buildSceneHTML(pd,fac){
  const fc=fac?.col||'#00f3ff',pnm=pd?.nm||'?';
  const flagship=G.fleet[0];
  const shipSrc=flagship?shipImgSrc(flagship):'img/ships/S01.png';
  const shipEmoji=flagship?.tier==='신화'?'✦':flagship?.tier==='대형'?'🌟':flagship?.tier==='중형'?'🚀':'🛸';
  const planetSrc=planetImgSrc(pd?.id);
  const isHostile=!!pd?.hostile,isVoid=pd?.f==='F07';
  const planetBg=isHostile?'radial-gradient(circle, #3a0a0a, #1a0005)':isVoid?'radial-gradient(circle, #001a2a, #000510)':'radial-gradient(circle, #0a2a5a, #050a1a)';

  return `<div style="width:100%;height:100%;position:relative;overflow:hidden">
    <!-- 행성 배경 이미지 (전체 프레임) — P31 해방 후 _free 변형 자동 사용 + .jpg→.png fallback -->
    <img src="${planetBgSrc(pd?.id||'P01')}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.92;z-index:0"
      onerror="if(this.src.endsWith('.jpg')){this.src='img/bg/${pd?.id||'P01'}.png';}else{this.style.background='radial-gradient(ellipse at 40% 50%, #0d1a3a 0%, #050a1a 100%)';this.style.display='none';}">
    <div style="position:absolute;inset:0;background:linear-gradient(to right, rgba(5,10,26,.55) 0%, rgba(5,10,26,.1) 50%, rgba(5,10,26,.35) 100%);z-index:1"></div>

    <!-- 하단 갑판 -->
    <div style="position:absolute;bottom:0;left:0;right:0;height:10%;background:linear-gradient(to top,#0a1520,transparent)"></div>
    <div style="position:absolute;bottom:0;left:0;right:0;height:2px;background:linear-gradient(to right,transparent,${fc}50,transparent)"></div>
    <!-- 행성 이름 + 배지 (우측 하단) -->
    <div style="position:absolute;bottom:18px;right:20px;text-align:right;z-index:20;pointer-events:none">
      <div style="color:${fc};font-size:15px;font-family:'Malgun Gothic','맑은 고딕','Courier New',monospace;letter-spacing:2px;text-shadow:0 0 12px ${fc};opacity:.9">◈ ${pnm} ◈</div>
      ${isHostile?`<div style="color:#ff4444;font-size:12px;font-family:'Malgun Gothic','맑은 고딕','Courier New',monospace;letter-spacing:1px">⚠️ 적대 구역</div>`:''}
      ${isVoid?`<div style="color:#bb88ff;font-size:12px;font-family:'Malgun Gothic','맑은 고딕','Courier New',monospace;letter-spacing:1px">🟣 보이드 구역</div>`:''}
    </div>
  </div>`;
}

// ═══ ECONOMY ═════════════════════════════════════════════════════
function calcTaxFor(pid){const pd=PLANET_DEF.find(p=>p.id===pid),st=G.planets[pid];if(!pd||!st||!st.owned)return 0;const aurBonus=pd.f==='F02'?1.25:1.0;/* 행성 세금: 2배 기본 + 투자 레벨당 1.3배 복리 */return Math.floor(pd.tax*Math.pow(1.3,st.commerce||0)*1.8*aurBonus*1.0);}
function calcTurnTax(){return PLANET_DEF.reduce((s,p)=>s+calcTaxFor(p.id),0);}
function getPirateTurnMult(){
  // 15턴마다 1.5배, 최대 3배
  const stages=Math.floor(G.turn/15);
  return Math.min(3.0, Math.pow(1.5, stages));
}
function getPirateAppMult(){
  // 누적 등장 횟수마다 1.3배 강화, 최대 4배
  return Math.min(4.0, Math.pow(1.3, G.pirateAppearances||0));
}
// ACT 전환 스토리 팝업
function showActTransition(newAct){
  const NM=G.profile.name||'사령관';
  const stories={
    2:{
      title:'⚡ ACT 2 — 치크스 제국과의 전쟁',
      icon:'🌌',
      lines:[
        {sp:'시스템',tx:'ACT 2 개시. 치크스 제국의 봉쇄선이 은하계 전역으로 확장되고 있습니다.'},
        {sp:'백구',tx:`${NM}, 이제 1링 적대 행성들(보라색)이 열렸어. TOI-700d, 케플러-452b, 우르사-알파 — 거기서 싸워야 해.`},
        {sp:NM,tx:'영웅을 더 모으고 함선을 강화해야 해. 목표: 영웅 6명, 치크스 핵심 행성 5개 격파.'},
        {sp:'백구',tx:'보이드 에센스도 모아둬. 우르사 메이저 실드 깨려면 필요할 수도 있어. 가자!'},
      ]
    },
    3:{
      title:'🔴 ACT 3 — 최후의 결전',
      icon:'💀',
      lines:[
        {sp:'시스템',tx:'ACT 3 개시. 우르사 메이저 코어로의 접근 경로가 확인됐습니다. 최종 결전이 임박했습니다.'},
        {sp:'백구',tx:`${NM}, 드디어 이 순간이 왔어. 지구 봉쇄를 푸는 마지막 단계야.`},
        {sp:NM,tx:'우르사 메이저. 5페이즈 보스. 쉽지 않을 거야 — 하지만 우리한테는 영웅들이 있어.'},
        {sp:'백구',tx:'준비 완료되면 은하계 지도에서 🌍 지구를 클릭해. 치크스 5개·영웅 6명·함대 6척·₡50만 갖추면 최종전 진입 가능!'},
      ]
    },
    4:{
      title:'🌟 ACT 4 — 해방 이후',
      icon:'🌍',
      lines:[
        {sp:'시스템',tx:'ACT 4 개시. 지구 봉쇄 해제 후 100년이 지났습니다. 새로운 시대가 시작됩니다.'},
        {sp:'백구',tx:`${NM}, 우르사 메이저는 무너졌지만 우주는 여전히 위험해. 치크스 잔당과 보이드 균열도 정리해야 해.`},
        {sp:NM,tx:'영웅 8인 컴플릿, 신화 함선 컴플릿, 모든 행성 정복 — 진정한 은하 통일을 향해.'},
        {sp:'백구',tx:'엔드게임 컨텐츠: 행성 30개 모두 보유, 만렙 투자, 보이드 7링 완전 정복. 자유롭게 우주를 누벼!'},
      ]
    }
  };
  const s=stories[newAct];
  if(!s)return;
  let step=0;
  function showStep(){
    if(step>=s.lines.length){closeModal();notify(`🌟 ACT ${newAct} 시작!`,'gold');return;}
    const l=s.lines[step];
    const isLast=step===s.lines.length-1;
    openModal(s.title,
      `<div style="text-align:center;margin-bottom:14px;font-size:43px">${s.icon}</div>`+
      `<div style="background:rgba(0,0,0,.3);border-radius:8px;padding:12px 14px">`+
      `<div style="font-size:12px;color:var(--yellow);letter-spacing:2px;margin-bottom:6px;text-transform:uppercase">${l.sp}</div>`+
      `<div style="font-size:17px;line-height:1.9;color:#e8e8f0">${l.tx}</div></div>`+
      `<div style="font-size:12px;color:var(--dim);text-align:right;margin-top:8px">${step+1} / ${s.lines.length}</div>`,
      [{txt:isLast?'✅ 확인':'다음 ▶',fn:()=>{step++;showStep();},cls:isLast?'btn':'btn'}]
    );
  }
  showStep();
}
// ═══ 충성도(LOY) 시스템 ══════════════════════════════════════════
// 탑승 크루 최고 등급 반환
function getTopCrewRarity(ship){
  if(!ship.crewIds||ship.crewIds.length===0)return null;
  const allPeople=[...(G.crew||[]),...(G.heroes||[]).map(h=>Object.assign({},HEROES[h],{id:h,rarity:'S',isHero:true}))];
  const rarOrd={S:0,L:1,H:2,R:3,N:4};
  let best=null;
  ship.crewIds.forEach(function(cid){
    const c=allPeople.find(function(x){return x.id===cid;});
    if(c&&(best===null||(rarOrd[c.rarity]??5)<(rarOrd[best]??5)))best=c.rarity;
  });
  return best;
}
// 충성도 하락 — 크루 없는 함선 매 턴 -3
function tickLoyalty(){
  if(!G.fleet)return;
  G.fleet.forEach(function(s,idx){
    const hasCrew=s.crewIds&&s.crewIds.length>0;
    if(!hasCrew){
      const prevLoy=s.LOY||80;
      s.LOY=Math.max(1,prevLoy-3);
      if(s.LOY<=10&&s.LOY!==prevLoy){
        notify('⚠️ '+s.nm+' 충성도 위험! (LOY '+s.LOY+') — 크루를 탑승시키세요!','err');
        baekgu(s.nm+' 충성도 '+s.LOY+'야. 곧 이탈할 수도 있어. 빨리 크루 태워.');
      }
    }
  });
}
// 충성도 증가 — 이동/전투 시 탑승 크루 등급별 증가
function boostLoyalty(reason){
  if(!G.fleet)return;
  const RARITY_LOY_BOOST={R:1,H:3,L:10,S:20};
  G.fleet.forEach(function(s){
    const topRar=getTopCrewRarity(s);
    if(!topRar)return;
    const boost=RARITY_LOY_BOOST[topRar]||0;
    if(boost===0)return;
    const prevLoy=s.LOY||80;
    if(prevLoy>=100)return;
    const newLoy=Math.min(100,prevLoy+boost);
    s.LOY=newLoy;
    // LOY 100 달성 시 능력치 +10% 부여
    if(newLoy===100&&prevLoy<100){
      if(!s._loyBonusApplied){
        s.ATT=Math.round((s.ATT||20)*1.1);
        s.INT=Math.round((s.INT||20)*1.1);
        s.TEC=Math.round((s.TEC||20)*1.1);
        s.maxHP=Math.round((s.maxHP||1000)*1.1);
        s.hp=Math.min(s.hp||s.maxHP,s.maxHP);
        s._loyBonusApplied=true;
        notify('💖 '+s.nm+' 충성도 100! 전 스탯 +10% 영구 적용!','gold');
        baekgu(s.nm+' 충성도 만렙이야. 이제 한층 더 강해졌어!');
      }
    }
  });
}
// 충성도 붕괴 체크 — LOY≤10 + HP≤50% 시 나포 위험
function checkLoyaltyCapture(){
  if(!G.fleet||G.fleet.length<=1)return;
  const toRemove=[];
  G.fleet.forEach(function(s,idx){
    if(idx===0)return; // 기함은 제외
    const loy=s.LOY||80;
    const hpRatio=(s.hp||0)/(s.maxHP||1);
    if(loy<=10&&hpRatio<=0.5){
      // 나포 확률: 매 턴 15%
      if(Math.random()<0.15){
        toRemove.push(idx);
        notify('💔 [충성도 붕괴] '+s.nm+' — 적에게 나포되었습니다! (LOY '+loy+'%, HP '+Math.round(hpRatio*100)+'%)','err');
        baekgu(s.nm+' 충성도가 너무 낮아서 적에게 넘어갔어. 크루를 신경 써야 해.');
        // 전투 기록에 나포 사건 남기기
        if(!G.combatHistory)G.combatHistory=[];
        const pd2=PLANET_DEF.find(function(p){return p.id===G.currentPlanet;});
        G.combatHistory.push({win:false,planet:pd2?pd2.nm:'알 수 없음',planetId:G.currentPlanet,turn:0,earned:0,gameTurn:G.turn,loyCapture:true,shipNm:s.nm});
      }
    }
  });
  // 역순 삭제 (인덱스 밀림 방지)
  toRemove.reverse().forEach(function(idx){G.fleet.splice(idx,1);});
  if(toRemove.length>0){
    // 임시창 → 선발 자동 승급
    if(typeof _promoteReserveIfRoom==='function')_promoteReserveIfRoom();
    updateHUD();if(G._currentHubTab==='ship'||G._currentHubTab==='garage')rerenderShipOrGarage();
  }
}

// ── 턴 종료 쿨다운 (기본 3분, 8인 핵심 영웅 1명당 -10초, 최소 30초) ──────
const TURN_COOLDOWN_BASE_MS = 3 * 60 * 1000;
const TURN_COOLDOWN_MIN_MS = 30 * 1000;
function _turnCooldownMs(){
  // H01~H08 중 보유한 영웅 수만큼 -10초
  const heroCount=(G.heroes||[]).filter(h=>/^H0[1-8]$/.test(h)).length;
  const reduction=heroCount*10*1000;
  return Math.max(TURN_COOLDOWN_MIN_MS,TURN_COOLDOWN_BASE_MS-reduction);
}
let _lastTurnTime = 0;
let _turnCooldownTimer = null;

function tryNextTurn(){
  const now = Date.now();
  const cdMs = _turnCooldownMs();
  const elapsed = now - _lastTurnTime;
  if(_lastTurnTime > 0 && elapsed < cdMs){
    const remaining = Math.ceil((cdMs - elapsed) / 1000);
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    notify(`⏳ 턴 종료까지 ${m}분 ${s}초 남았습니다`, 'err');
    return;
  }
  _lastTurnTime = now;
  doNextTurn();
  _startTurnCooldownUI();
}

function _startTurnCooldownUI(){
  const btn = document.getElementById('btn-next-turn');
  const lbl = document.getElementById('btn-next-turn-label');
  if(!btn || !lbl) return;
  btn.disabled = true;
  btn.style.opacity = '0.5';
  if(_turnCooldownTimer) clearInterval(_turnCooldownTimer);
  _turnCooldownTimer = setInterval(function(){
    const cdMs = _turnCooldownMs();
    const elapsed = Date.now() - _lastTurnTime;
    const remaining = Math.max(0, Math.ceil((cdMs - elapsed) / 1000));
    if(remaining <= 0){
      clearInterval(_turnCooldownTimer);
      _turnCooldownTimer = null;
      if(lbl) lbl.textContent = '턴 종료';
      if(btn){ btn.disabled = false; btn.style.opacity = '1'; }
      return;
    }
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    if(lbl) lbl.textContent = `턴 종료 (${m}:${s < 10 ? '0'+s : s})`;
  }, 1000);
}

// 매 턴 종료 자동 수리: armor 파츠의 repairRate(HP%) + shield 파츠의 shieldRegen(maxSH%)
function tickAutoRepair(){
  if(!G.fleet||G.fleet.length===0)return;
  let _totalHpHealed=0,_totalShHealed=0;
  G.fleet.forEach(s=>{
    if(!s.parts||s.parts.length===0)return;
    const st=getShipStats(s);
    let hpRate=0,shRate=0;
    s.parts.forEach(pid=>{
      const p=partById(pid);if(!p)return;
      if(p.repairRate)hpRate+=p.repairRate;
      if(p.shieldRegen)shRate+=p.shieldRegen;
    });
    if(hpRate>0&&s.hp<st.HP){
      const heal=Math.ceil(st.HP*hpRate);
      const before=s.hp;
      s.hp=Math.min(st.HP,s.hp+heal);
      _totalHpHealed+=(s.hp-before);
    }
    if(shRate>0&&s.sh<st.maxSH){
      const heal=Math.ceil(st.maxSH*shRate);
      const before=s.sh||0;
      s.sh=Math.min(st.maxSH,(s.sh||0)+heal);
      _totalShHealed+=(s.sh-before);
    }
  });
  if(_totalHpHealed>0||_totalShHealed>0){
    const parts=[];
    if(_totalHpHealed>0)parts.push(`HP +${_totalHpHealed.toLocaleString()}`);
    if(_totalShHealed>0)parts.push(`SH +${_totalShHealed.toLocaleString()}`);
    notify(`🔧 자동 수리: ${parts.join(' · ')}`,'ok');
  }
}

function doNextTurn(){
  G.turn++;
  // ACT 자동 전환: 턴 20→ACT2, 턴 40→ACT3, 턴 60→ACT4 (보스 격파 후 후일담)
  if(G.turn%20===0&&G.act<4){
    const prevAct=G.act;
    G.act++;
    setTimeout(()=>showActTransition(G.act),900);
  }
  G.stayTurns=(G.stayTurns||0)+1;
  tickGatherQuests();  // ← 채취 퀘스트 진행
  tickQuestSpawn();    // ← 현재 행성에 2~4개 신규 의뢰 게시 (최대 8개)
  tickAutoRepair();    // ← 자동 수리 로봇 + 전설/신화 실드 자가 복구
  tickLoyalty();       // ← 충성도 하락 (크루 없는 함선)
  checkLoyaltyCapture(); // ← 충성도 붕괴 나포 체크
  const tax=calcTurnTax();G.credits+=tax;
  // 보이드 균열 P29: 5턴마다 전설 파츠 분출
  if(G.turn%5===0&&G.planets['P29']?.fog!=='L'){
    const lParts=PARTS.filter(p=>p.tier>=12);
    if(lParts.length){const p=lParts[Math.floor(Math.random()*lParts.length)];addToInventory(p.id,1);notify(`🌀 보이드 균열 P29에서 ${p.nm} 분출!`,'pur');}
  }
  updateHUD();
  if(tax>0)notify(`⏭️ TURN ${G.turn} | 세금 수입 ₡${tax.toLocaleString()}`,'gold');
  else notify(`⏭️ TURN ${G.turn}`);
  // ── 행성 Lv10 특산 아이템 보상 (10% 확률) ────────────────────
  const _lv10planets=PLANET_DEF.filter(pd2=>{const st2=G.planets[pd2.id];return st2&&st2.owned&&(st2.commerce||0)>=10;});
  _lv10planets.forEach(pd2=>{
    if(Math.random()<0.10){
      // 팩션별 최고급 파츠 선택
      const _fid=pd2.f;
      // 신화급 → 세트 순으로 시도
      const _mythPool=(typeof QUEST_MYTHIC_PARTS!=='undefined'?QUEST_MYTHIC_PARTS:[]);
      const _setPool=(typeof QUEST_SET_PARTS!=='undefined'?QUEST_SET_PARTS:[]);
      const _partPool=[..._mythPool,..._setPool];
      if(_partPool.length>0){
        const _pid=_partPool[Math.floor(Math.random()*_partPool.length)];
        const _p=(typeof PARTS!=='undefined'?PARTS:[]).find(x=>x.id===_pid);
        if(!G.inventory)G.inventory=[];
        const _inv=G.inventory.find(i=>i.id===_pid);
        if(_inv)_inv.qty++;else G.inventory.push({id:_pid,nm:_p?_p.nm:_pid,qty:1});
        notify(`🌟 ${pd2.nm} Lv10 보상: ${_p?_p.nm:_pid} 획득!`,'gold');
        baekgu(`${pd2.nm} 최고 레벨 보상! ${_p?_p.nm:_pid} 들어왔어.`);
      }
    }
  });
  if(G.credits<5000)randomBaekgu('low_credits');
  // ── 해적 세력 강화 알림 ────────────────────────────────────────
  if(G.credits<3000)baekgu('크레딧 거의 없어. 무역이나 퀘스트로 충전해.');
  if(G.turn===15) {notify('⚠️ 해적 세력 강화! 전투력 ×1.5','err');baekgu('해적들이 강해졌어. 조심해.');}
  if(G.turn===30) {notify('⚠️ 해적 세력 2단계 강화! 전투력 ×2.25','err');baekgu('해적이 더 강해졌다. 파츠 업그레이드해.');}
  if(G.turn===45) {notify('☠️ 해적 최강화! 전투력 ×3 (최대)','err');baekgu('해적 전투력 최대치. 최고 장비 갖춰.');}
  // ── 체류 이벤트 ─────────────────────────────────────────────
  const pd=PLANET_DEF.find(p=>p.id===G.currentPlanet);
  if(G.stayTurns===2&&!pd?.hostile){
    // 2턴째: 백구 경고
    setTimeout(()=>{
      baekgu('같은 자리에 너무 오래 있으면 해적들이 냄새 맡는다. 다음 턴엔 이동해.');
      notify('⚠️ 백구 경고: 3턴 체류시 해적 기습!','err');
    },400);
  }
  // ── 적 행성 2턴 체류: 치크스 함대 50% 출몰 ───────────────
  if(pd?.hostile&&G.stayTurns>=2&&G.turn-(G.lastChixTurn||-999)>1){
    if(Math.random()<0.50){
      setTimeout(()=>triggerChixFleet(pd),700);
      return;
    }
  }
  // ── 모든 행성 50% 확률 해적 조우 (직전 턴 쿨다운) ──────────
  if(!pd?.hostile&&G.turn-(G.lastPirateTurn||-999)>1){
    if(Math.random()<0.50){
      if(G.stayTurns>=3){
        setTimeout(()=>triggerPirateRaid(pd),600);
      } else {
        setTimeout(()=>triggerEarlyPirate(pd),600);
        return;
      }
    }
  }
  // ── 제작 재료 턴 종료 재입고 ─────────────────────────────────
  (function(){
    const _pid=G.currentPlanet;
    const _st=G.shopStock[_pid];
    if(!_st)return;
    const _mats=COMMODITIES.filter(c=>c.material);
    const _depleted=_mats.filter(m=>(_st[m.id]||0)===0);
    if(_depleted.length===0)return; // 소진 없으면 스킵
    const _allDepleted=_depleted.length===_mats.length;
    if(_allDepleted){
      // 전부 소진: 팩션 재료 보장 + 랜덤 재입고
      const _pd2=PLANET_DEF.find(p=>p.id===_pid);
      const _fac2=_pd2?.f;
      if(_fac2&&FACTION_MATS[_fac2]){
        const _fmId=FACTION_MATS[_fac2];
        _st[_fmId]=Math.floor(Math.random()*8)+4;
      }
      const _seed2=_pid.split('').reduce((a,c)=>a+c.charCodeAt(0),0)+G.turn;
      _mats.forEach((mat,i)=>{if((_st[mat.id]||0)===0&&((_seed2+i*3)%3)===0)_st[mat.id]=Math.floor(Math.random()*10)+4;});
      notify('🛒 제작 재료 재입고!','ok');
    } else {
      // 일부 소진: 소진 재료 중 60% 확률로 재입고
      let restocked=false;
      _depleted.forEach(mat=>{
        if(Math.random()<0.6){_st[mat.id]=Math.floor(Math.random()*8)+4;restocked=true;}
      });
      if(restocked)notify('🛒 제작 재료 일부 재입고!','ok');
    }
  })();
  saveGame(true);hubTab('main');
}
// ── 적군 스탯 밸런스 캡 ────────────────────────────────────────────
// 해적/잔해해적/치크스(보스 제외) 능력치를 아군 함대 평균의 50~70% 범위로 제한
// 게임 후반 누적 강화로 너무 어려워지는 문제 방지
// 사용자 요청: 적군 능력치를 우리 함대 평균 대비 더 약하게 — 최대 40%로 제한.
// 이전 0.50~0.70 → 0.20~0.40 (per-ship). 4~8척 함대 적이면 총 0.8~3.2 ship-equivalent.
// 적 전투력 클램프 — 플레이어 함대 평균 HP/ATT 대비 비율 (사용자 요청: 95% 유지)
const ENEMY_POWER_MIN=0.90;
const ENEMY_POWER_MAX=0.95;
function clampEnemyStats(eHP,eATK,eINT,eTEC,fp){
  fp=fp||calcFleetAvgPower();
  const fpHP=Math.max(1,fp.hp||1),fpATK=Math.max(1,fp.atk||1);
  const maxHP=Math.round(fpHP*ENEMY_POWER_MAX),minHP=Math.round(fpHP*ENEMY_POWER_MIN);
  const maxATK=Math.round(fpATK*ENEMY_POWER_MAX),minATK=Math.round(fpATK*ENEMY_POWER_MIN);
  // 클램프 (최소값보다 작으면 올리고, 최대값보다 크면 깎음)
  const cHP=Math.max(minHP,Math.min(eHP,maxHP));
  const cATK=Math.max(minATK,Math.min(eATK,maxATK));
  // INT/TEC도 ATK와 동일 비율로 스케일링
  const atkRatio=eATK>0?cATK/eATK:1;
  return {eHP:cHP,eATK:cATK,eINT:Math.round((eINT||0)*atkRatio),eTEC:Math.round((eTEC||0)*atkRatio)};
}

// 이동 중 랜덤 해적 조우
function calcTravelPirateChance(pd){
  const ring=pd?.ring||2;
  const baseChance=[0,10,15,22,30,38,45,50][Math.min(7,ring)];
  const diffMult={easy:0.7,normal:1.0,hard:1.3,extreme:1.6}[G.difficulty]||1.0;
  return Math.min(50,Math.round(baseChance*diffMult));
}
function triggerTravelPirate(pd){
  G.lastPirateTurn=G.turn;
  const ring=pd?.ring||2;
  const dm=getDiffMult(),lm=getLevelMult(),ptm=getPirateTurnMult(),egm=getEarlyGameMult();
  const eCount=Math.min(Math.max(2,G.fleet.length),Math.round(4*getDiffCountMult()));
  const fp=calcFleetAvgPower();
  const tpMult=(0.55+(ring-1)*0.07)*dm*ptm*egm;
  const _rawHP=Math.round(fp.hp*tpMult),_rawATK=Math.round(fp.atk*tpMult);
  const _rawINT=Math.round(fp.atk*tpMult*0.6),_rawTEC=Math.round(fp.atk*tpMult*0.65);
  const _c=clampEnemyStats(_rawHP,_rawATK,_rawINT,_rawTEC,fp);
  const eHP=_c.eHP,eATK=_c.eATK,eINT=_c.eINT,eTEC=_c.eTEC;
  const raidDef={
    id:'TRAVEL_PIRATE',nm:'항로 해적단',ring:ring,f:'PIRATE',hostile:true,tax:0,
    _enemies:Array.from({length:eCount},(_,i)=>({
      id:`TP${i}`,nm:`항로 해적 ${['강습정','요격기','약탈선','포함'][i%4]}`,tier:i%4===3?'중형':'소형',isEnemy:true,
      hp:eHP,maxHP:eHP,sh:Math.floor(eHP*.25),maxSH:Math.floor(eHP*.25),
      ATT:eATK,INT:eINT,TEC:eTEC,HP:eHP,LOY:0,parts:[],crewIds:[]
    }))
  };
  const chance=calcTravelPirateChance(pd);
  openModal('🏴‍☠️ 항로 해적 조우!',
    `<div style="text-align:center;padding:10px 6px 6px">
      <div style="font-size:48px;margin-bottom:4px">☠️</div>
      <div style="color:var(--red);font-size:18px;font-weight:bold;margin-bottom:4px">${pd?.nm||''} 항로 — 해적단 조우!</div>
      <div style="color:var(--dim);font-size:12px;line-height:1.7">
        이동 중 해적 ${eCount}척에게 기습당했습니다!<br>
        <span style="color:var(--muted);font-size:11px">조우 확률: ${chance}% (링${ring} · ${({easy:'쉬움',normal:'보통',hard:'어려움',extreme:'극악'})[G.difficulty]||'보통'})</span>
      </div>
    </div>
    ${_formatEnemyPreview(raidDef._enemies)}
    <div style="text-align:center;font-size:12px;color:var(--yellow);margin-top:6px">승리 시 약탈금 획득 | 도주 시 크레딧 -15%</div>
    <div style="text-align:center;font-size:12px;color:var(--cyan);margin-top:4px">${_baekguIcon(18)} 백구: "항로에 적이다! 적 스펙 보고 결정해!"</div>`,
    [{txt:'⚔️ 전투!',fn:()=>{closeModal();startPirateRaid(raidDef);},cls:'btn-red'},
     {txt:'🚀 도주 (-15%)',fn:()=>{closeModal();escapeTravelPirate();},cls:'btn-sm'}]
  );
}
function escapeTravelPirate(){
  const penalty=Math.floor(G.credits*0.15);
  G.credits=Math.max(100,G.credits-penalty);
  changeReputation(-2);
  updateHUD();
  notify(`🚀 도주 성공! 크레딧 -₡${penalty.toLocaleString()} / 명성 -2`,'err');
  baekgu('간신히 따돌렸어. 항로 주의해.');
  saveGame(true);
}
function triggerEarlyPirate(pd){
  // 턴 3+ 해적 등장 — 누적 등장횟수마다 1.5배 강화 (최대 5회)
  if(!G.pirateAppearances)G.pirateAppearances=0;
  G.pirateAppearances=Math.min(G.pirateAppearances+1,5);
  G.lastPirateTurn=G.turn;
  const appMult=getPirateAppMult();
  const ring=pd?.ring||1;
  const dm=getDiffMult(),lm=getLevelMult(),ptm=getPirateTurnMult(),egm=getEarlyGameMult();
  // 플레이어 함대 수 & 누적 등장 횟수 기반, 최소 2척
  const eCount=Math.min(Math.max(2,Math.floor(G.fleet.length*0.8)+Math.floor(G.pirateAppearances/2)),Math.round(4*getDiffCountMult()));
  const fp2=calcFleetAvgPower();
  // 사용자 요청: 비정상적으로 강한 해적 50% 약화
  const epMult=(0.45+(ring-1)*0.06)*dm*ptm*appMult*egm*0.5;
  const _rHP=Math.round(fp2.hp*epMult);
  const _rATK=Math.round(fp2.atk*epMult);
  const _rINT=Math.round(fp2.atk*epMult*0.55);
  const _rTEC=Math.round(fp2.atk*epMult*0.60);
  const _c2=clampEnemyStats(_rHP,_rATK,_rINT,_rTEC,fp2);
  const eHP=_c2.eHP,eATK=_c2.eATK,eINT=_c2.eINT,eTEC=_c2.eTEC;
  const raidDef={
    id:'PIRATE_RAID',nm:'초반 해적',ring:ring,f:'PIRATE',hostile:true,tax:0,
    _enemies:Array.from({length:eCount},(_,i)=>({
      id:'EP'+i,nm:'해적 '+['정찰기','소형 전투함','강습정'][i%3],tier:'소형',isEnemy:true,
      hp:eHP,maxHP:eHP,sh:Math.floor(eHP*.15),maxSH:Math.floor(eHP*.15),
      ATT:eATK,INT:eINT,TEC:eTEC,HP:eHP,LOY:0,parts:[],crewIds:[]
    }))
  };
  openModal('🏴‍☠️ 해적 출몰!',
    `<div style="text-align:center;padding:10px 6px 6px">
      <div style="font-size:48px;margin-bottom:4px">☠️</div>
      <div style="color:var(--red);font-size:18px;font-weight:bold;margin-bottom:4px">${pd?.nm||''} — 해적 출몰!</div>
      <div style="color:var(--dim);font-size:12px;line-height:1.7">
        TURN ${G.turn} — 이 구역에 해적이 나타났습니다!<br>
        해적 ${eCount}척이 접근 중!
      </div>
      <div style="margin-top:4px;color:var(--yellow);font-size:11px">⚠️ 누적 등장 ${G.pirateAppearances}회 | 강화 ×${getPirateAppMult().toFixed(2)}</div>
    </div>
    ${_formatEnemyPreview(raidDef._enemies)}
    <div style="text-align:center;font-size:12px;color:var(--yellow);margin-top:6px">승리 시 크레딧 획득 | 패배 시 손실</div>
    <div style="text-align:center;font-size:12px;color:var(--cyan);margin-top:4px">${_baekguIcon(18)} 백구: "${G.pirateAppearances>=5?'이제 최강 해적! 각오해!':G.pirateAppearances>=3?'점점 강해져! 조심해!':'해적이야! 스펙 확인해!'}"</div>`,
    [{txt:'⚔️ 전투!',fn:()=>{closeModal();startPirateRaid(raidDef);},cls:'btn-red'},
     {txt:'🚀 도주 (-10%)',fn:()=>{closeModal();const p=Math.floor(G.credits*0.1);G.credits=Math.max(100,G.credits-p);changeReputation(-2);updateHUD();notify('🚀 도주. ₡'+p.toLocaleString()+' 손실 / 명성 -2','err');saveGame(true);hubTab('main');},cls:'btn-sm'}]
  );
  saveGame(true);
}
// ── 치크스 함대 출몰 (적 행성 체류 이벤트) ─────────────────────
function triggerChixFleet(pd){
  if(!G.chixWaves)G.chixWaves=0;
  G.lastChixTurn=G.turn;
  // 누적 출몰 횟수 (최대 5회)
  const wave=Math.min(G.chixWaves,4); // 0~4 → 1~5회차
  G.chixWaves=Math.min(G.chixWaves+1,5);

  const dm=getDiffMult(),lm=getLevelMult(),egm=getEarlyGameMult();
  const ring=pd?.ring||1;
  // 함선 수: 기본 3척, 출몰 횟수마다 20% 증가 (최대 8척)
  const baseCount=3;
  const countMult=Math.pow(1.20,wave);
  const eCount=Math.min(12,Math.round(baseCount*countMult*getDiffCountMult()));
  // 전투력: 플레이어 함대 비례 + 파도마다 20% 강화 (치크스는 적대 세력)
  // 체력 밸런스 조정: 보스를 제외한 치크스 함선 HP/실드 -50% + 50~70% 캡
  const CHIX_HP_MULT=0.5;
  const fp4=calcFleetAvgPower();
  const chixBase=(0.70+(ring-1)*0.06);   // ring1=0.70 ~ ring5=0.94
  const powerMult=Math.pow(1.20,wave)*dm*egm;
  const _rChHP=Math.round(fp4.hp*chixBase*powerMult*CHIX_HP_MULT);
  const _rChATK=Math.round(fp4.atk*chixBase*powerMult);
  const _rChINT=Math.round(fp4.atk*chixBase*powerMult*0.65);
  const _rChTEC=Math.round(fp4.atk*chixBase*powerMult*0.70);
  const _c3=clampEnemyStats(_rChHP,_rChATK,_rChINT,_rChTEC,fp4);
  const eHP=_c3.eHP,eATK=_c3.eATK,eINT=_c3.eINT,eTEC=_c3.eTEC;

  const shipNames=['전투선','순양함','구축함','포함','모선','강습함'];
  const enemies=Array.from({length:eCount},(_,i)=>({
    id:`CHIX_W${wave}_${i}`,
    nm:`치크스 ${shipNames[i%shipNames.length]}`,
    tier:i===0&&wave>=3?'대형':i<2&&wave>=2?'중형':'소형',
    isEnemy:true,
    maxHP:Math.round(eHP*(i===0?1.4:1.0)),hp:Math.round(eHP*(i===0?1.4:1.0)),
    maxSH:Math.round(eHP*(i===0?0.6:0.35)),sh:Math.round(eHP*(i===0?0.6:0.35)),
    ATT:Math.round(eATK*(i===0?1.3:1.0)),INT:Math.round(eINT*(i===0?1.2:1.0)),
    TEC:Math.round(eTEC),HP:eHP,LOY:0,parts:[],crewIds:[]
  }));

  const waveLbl=['1차','2차','3차','4차','5차 최종'][wave];
  const waveCol=wave>=4?'var(--red)':wave>=2?'var(--purple)':'#cc88ff';

  openModal(`🛸 치크스 ${waveLbl} 함대 출몰!`,
    `<div style="background:rgba(139,0,255,.08);border:1px solid #8b00ff66;border-radius:10px;padding:10px 12px;margin-bottom:10px">
      <div style="color:${waveCol};font-size:15px;font-weight:bold;margin-bottom:5px">
        ${wave>=4?'☠️':'⚠️'} ${waveLbl} 출몰 — 전투력 ×${Math.pow(1.20,wave).toFixed(2)} · 출몰 ${G.chixWaves}/5
      </div>
      ${wave>=4?'<div style="color:var(--red);font-size:12px;font-weight:bold">⚠️ 최종 함대 — 이 전투가 마지막 기회!</div>':''}
    </div>
    ${_formatEnemyPreview(enemies)}
    <div style="font-size:12px;color:var(--dim);line-height:1.7">
      ${_baekguIcon(18)} 백구: "${wave>=4?'이게 마지막이야. 전멸시키자!':wave>=2?'점점 강해지고 있어. 조심해!':'치크스 함대 출현! 적 행성에서 오래 있으면 안 돼.'}"
    </div>`,
    [{txt:`⚔️ 전투 (${eCount}척)`,fn:()=>{
      closeModal();
      const raidDef={...pd,_enemies:enemies,_chixWave:wave};
      startChixFleetCombat(raidDef);
    },cls:'btn-red'},
     {txt:'🚀 도주 (-15%)',fn:()=>{
      closeModal();
      const loss=Math.floor(G.credits*0.15);
      G.credits=Math.max(100,G.credits-loss);
      G.stayTurns=0;changeReputation(-2);updateHUD();
      notify(`🚀 치크스 함대 도주! -₡${loss.toLocaleString()} / 명성 -2`,'err');
      baekgu('겨우 빠져나왔어. 빨리 이 구역 떠나자.');
      saveGame(true);hubTab('main');
    },cls:'btn-sm'}]);
}

function startChixFleetCombat(raidDef){
  const players=G.fleet.map(s=>{const st=getShipStats(s);const _wpn=PARTS.find(p=>p.cat==='weapon'&&(s.parts||[]).includes(p.id));const _wrar=_wpn?(_wpn.rarity||''):'';const _shp=PARTS.find(p=>p.cat==='shield'&&(s.parts||[]).includes(p.id));const _shTier=_shp?(_shp.tier||0):0;const _arp=PARTS.find(p=>p.cat==='armor'&&(s.parts||[]).includes(p.id));const _arTier=_arp?(_arp.tier||0):0;return{...s,isEnemy:false,hp:Math.max(1,s.hp||st.HP),maxHP:st.HP,sh:(s.sh!=null?s.sh:st.maxSH),maxSH:st.maxSH,ATT:st.ATT,INT:st.INT,TEC:st.TEC,DEF:st.DEF||0,wtype:_wpn?(_wpn.wtype||'laser'):'laser',wpnTier:_wpn?(_wpn.tier||1):1,wpnRarity:_wrar,shieldTier:_shTier,armorTier:_arTier,tier:s.tier||'소형'};});
  const wave=raidDef._chixWave||0;
  combatState={players,enemies:raidDef._enemies,turn:0,done:false,log:[],planetDef:raidDef,isBoss:false,isPirate:false,_isChixFleet:true,_chixWave:wave,_planetId:G.currentPlanet};
  renderCombatView(document.getElementById('hub-body'));
  setHubNav('combat');updateHUD();sfxAlert();try{AudioMgr.playBgm(wave>=4?'boss':'combat');}catch(e){}
  requestAnimationFrame(()=>{
    initCombatCanvas();
    const waveLbl=['1차','2차','3차','4차','5차 최종'][wave];
    const t=document.getElementById('cb-title');if(t)t.textContent=`⚔️ 치크스 ${waveLbl} 함대 — ${raidDef.nm}`;
    setTimeout(()=>{addCombatLog(`🛸 치크스 ${waveLbl} 함대 ${raidDef._enemies.length}척 출현!`,'');runCombatTurn();},400);
  });
}

function triggerPirateRaid(pd){
  G.lastPirateTurn=G.turn;
  const ring=pd?.ring||2;
  const dm=getDiffMult(),lm=getLevelMult(),ptm=getPirateTurnMult(),egm=getEarlyGameMult();
  const turnShipMult=Math.pow(1.2,Math.floor(G.turn/3));
  const eCount=Math.min(15,Math.round((2+Math.floor(ring/2))*turnShipMult*getDiffCountMult()));
  const fp3=calcFleetAvgPower();
  const prMult=(0.65+(ring-1)*0.08)*dm*ptm*egm;
  const _rawHP=Math.round(fp3.hp*prMult),_rawATK=Math.round(fp3.atk*prMult);
  const _rawINT=Math.round(fp3.atk*prMult*0.60),_rawTEC=Math.round(fp3.atk*prMult*0.65);
  const _cp=clampEnemyStats(_rawHP,_rawATK,_rawINT,_rawTEC,fp3);
  const eHP=_cp.eHP,eATK=_cp.eATK,eINT=_cp.eINT,eTEC=_cp.eTEC;
  // 가짜 planetDef를 만들어 startCombat 호출
  const raidDef={
    id:'PIRATE_RAID',nm:'해적단 기습',ring:ring,f:'PIRATE',hostile:true,tax:0,
    _enemies:Array.from({length:eCount},(_,i)=>({
      id:`P${i}`,nm:`해적 ${['약탈선','전투함','강습정','모선','지뢰선'][i%5]}`,tier:['소형','중형','소형','대형','소형'][i%5],isEnemy:true,
      hp:eHP,maxHP:eHP,sh:Math.floor(eHP*.2),maxSH:Math.floor(eHP*.2),
      ATT:eATK,INT:eINT,TEC:eTEC,HP:eHP,LOY:0,parts:[],crewIds:[]
    }))
  };
  // 모달로 경고 먼저
  openModal('💀 해적 기습!',
    `<div style="text-align:center;padding:6px 4px">
      <div style="font-size:42px;margin-bottom:6px">☠️</div>
      <div style="color:var(--red);font-size:17px;font-weight:bold;margin-bottom:6px">${pd?.nm||''} — 해적단 기습!</div>
      <div style="color:var(--dim);font-size:13px;line-height:1.7">
        같은 행성에 ${G.stayTurns}턴 체류 → 해적 정보 누출!<br>
        <span style="color:var(--yellow)">승리시 약탈금 획득 | 패배시 크레딧 손실</span>
      </div>
    </div>
    ${_formatEnemyPreview(raidDef._enemies)}
    <div style="font-size:12px;color:var(--cyan);text-align:center">${_baekguIcon(18)} 백구: "내가 경고했잖아. 싸워!"</div>`,
    [{txt:'⚔️ 전투 시작!',fn:()=>{closeModal();startPirateRaid(raidDef);},cls:'btn-red'},
     {txt:'🚀 도주 (크레딧 -20%)',fn:()=>{closeModal();escapePirateRaid();},cls:'btn-sm'}]
  );
  saveGame(true);
}
function startPirateRaid(raidDef){
  const players=G.fleet.map(s=>{const st=getShipStats(s);const _wpn=PARTS.find(p=>p.cat==='weapon'&&(s.parts||[]).includes(p.id));const _wrar=_wpn?(_wpn.rarity||''):'';const _shp=PARTS.find(p=>p.cat==='shield'&&(s.parts||[]).includes(p.id));const _shTier=_shp?(_shp.tier||0):0;const _arp=PARTS.find(p=>p.cat==='armor'&&(s.parts||[]).includes(p.id));const _arTier=_arp?(_arp.tier||0):0;return{...s,isEnemy:false,hp:Math.max(1,s.hp||st.HP),maxHP:st.HP,sh:(s.sh!=null?s.sh:st.maxSH),maxSH:st.maxSH,ATT:st.ATT,INT:st.INT,TEC:st.TEC,DEF:st.DEF||0,wtype:_wpn?(_wpn.wtype||'laser'):'laser',wpnTier:_wpn?(_wpn.tier||1):1,wpnRarity:_wrar,shieldTier:_shTier,armorTier:_arTier,tier:s.tier||'소형'};});
  combatState={players,enemies:raidDef._enemies,turn:0,done:false,log:[],planetDef:raidDef,isBoss:false,isPirate:true,_planetId:G.currentPlanet};
  renderCombatView(document.getElementById('hub-body'));
  setHubNav('combat');updateHUD();sfxAlert();try{AudioMgr.playBgm('combat');}catch(e){}
  const _plv=calcPlayerLevel(),_plm=getLevelMult();
  requestAnimationFrame(()=>{
    initCombatCanvas();
    const t=document.getElementById('cb-title');if(t)t.textContent='⚔️ 해적 기습!';
    setTimeout(function(){
      if(combatState&&!combatState.done){
        addCombatLog('🏴‍☠️ 해적 기습! 사령관 Lv.'+_plv+' | 적 강화 ×'+_plm.toFixed(2),'');
        runCombatTurn();
      }
    },800);
  });
}
function escapePirateRaid(){
  const penalty=Math.floor(G.credits*0.2);
  G.credits=Math.max(0,G.credits-penalty);
  G.stayTurns=0;
  changeReputation(-2);
  updateHUD();
  notify(`🚀 도주 성공! 크레딧 -₡${penalty.toLocaleString()} / 명성 -2`,'err');
  baekgu('도망쳤어. 다음엔 일찍 움직여.');
  hubTab('main');
}
function changeReputation(delta){if(!G.reputation)G.reputation=0;G.reputation=Math.max(0,Math.min(9999,G.reputation+delta));updateHUD();}
// 기존 세이브 데이터: 동일 ID 화물 슬롯 통합 (평균 구매가)
function mergeCargoById(){
  if(!G.cargo||G.cargo.length===0)return;
  const merged=[];
  G.cargo.forEach(slot=>{
    const ex=merged.find(m=>m.id===slot.id&&!!m.material===!!slot.material);
    if(ex){
      ex.buyPrice=Math.round((ex.buyPrice*ex.qty+slot.buyPrice*slot.qty)/(ex.qty+slot.qty));
      ex.qty+=slot.qty;
      if(ex.buyPlanetId!==slot.buyPlanetId)ex.buyPlanetId='mixed';
      if(ex.buyFaction!==slot.buyFaction)ex.buyFaction='mixed';
    } else {
      merged.push({...slot});
    }
  });
  G.cargo=merged;
}
function calcSellPrice(cargoItem,sellPlanetId){
  const comm=COMMODITIES.find(c=>c.id===cargoItem.id);
  const marcoMult=(G&&G.heroes&&G.heroes.includes('H08'))?1.20:1.0;
  // 제작 재료: maxSell:0이므로 구매가의 70% 고정 반환
  if(comm?.material){
    return Math.floor((comm.buy||cargoItem.buyPrice||0)*0.7*marcoMult);
  }
  // 동일 행성 환불 판매: 구매가의 80% 고정 (실수 구매 취소 용도, 차익 거래 방지)
  if(cargoItem.buyPlanetId&&cargoItem.buyPlanetId===sellPlanetId){
    return Math.floor((cargoItem.buyPrice||0)*0.8);
  }
  const sp=PLANET_DEF.find(p=>p.id===sellPlanetId);
  // 혼합 원산지(평균구매가 통합 슬롯): 이종문명 4.2× 기준 적용
  if(!cargoItem.buyPlanetId||cargoItem.buyPlanetId==='mixed'){
    if(!comm||!sp)return cargoItem.buyPrice;
    const base=Math.floor(cargoItem.buyPrice*4.2);
    const maxSellAdj=marcoMult>1?Math.floor(comm.maxSell*marcoMult):comm.maxSell;
    return Math.min(Math.floor(base*marcoMult),maxSellAdj);
  }
  const bp=PLANET_DEF.find(p=>p.id===cargoItem.buyPlanetId);
  if(!bp||!sp||!comm)return cargoItem.buyPrice;
  let base;
  if(bp.f===sp.f){
    const dist=Math.hypot((bp.x||0)-(sp.x||0),(bp.y||0)-(sp.y||0))||100;
    const intra=1.05+Math.min(0.20,dist/3000);
    base=Math.floor(cargoItem.buyPrice*intra);
  } else {
    const dR=Math.abs(bp.ring-sp.ring)+.1*Math.min(Math.abs(bp.ang-sp.ang),360-Math.abs(bp.ang-sp.ang));
    const margin=dR<=2?4.0:dR>=4?5.0:4.0+(dR-2)/2;
    base=Math.floor(cargoItem.buyPrice*margin);
  }
  const maxSellAdjusted=marcoMult>1?Math.floor(comm.maxSell*marcoMult):comm.maxSell;
  return Math.min(Math.floor(base*marcoMult),maxSellAdjusted);
}
function addToInventory(partId,qty=1){
  const ex=G.inventory.find(i=>i.id===partId);if(ex)ex.qty+=qty;else G.inventory.push({id:partId,qty});
}

// ═══ TRADE TAB ═══════════════════════════════════════════════════
function getCargoMax(){
  const shipSlots=G.fleet.reduce(function(s,sh){return s+(sh.cargoSlots||4);},0)||4;
  const itemSlots=(G.inventory||[]).reduce(function(s,inv){
    const ci=CARGO_ITEMS.find(function(c){return c.id===inv.id;});
    return s+(ci?ci.slots*inv.qty:0);
  },0);
  return shipSlots+itemSlots;
}
function renderTradeTab(body){
  if(!body)return;
  const pd=PLANET_DEF.find(p=>p.id===G.currentPlanet);
  const fac=pd?FACTION[pd.f]:null;
  generateShopStock(G.currentPlanet);
  const stock=G.shopStock[G.currentPlanet]||{};
  const totalQty=G.cargo.reduce((s,c)=>s+c.qty,0),MAX=getCargoMax();

  const cargoHTML=G.cargo.length>0?`<div style="background:var(--card);border:1px solid var(--bdr);border-radius:8px;padding:10px;margin-bottom:14px">
    <div style="color:var(--cyan);font-size:13px;font-weight:bold;margin-bottom:8px">🛢️ 보유 화물 — 현재 행성 판매가</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px">
    ${G.cargo.map((slot,idx)=>{
      const sp=calcSellPrice(slot,G.currentPlanet),profitPer=sp-slot.buyPrice,profit=profitPer*slot.qty,pC=profit>0?'var(--green)':profit===0?'var(--dim)':'var(--red)';
      const isMixed=!slot.buyPlanetId||slot.buyPlanetId==='mixed';
      const samePlanet=!isMixed&&slot.buyPlanetId===G.currentPlanet;
      const sameFaction=!isMixed&&!samePlanet&&PLANET_DEF.find(p=>p.id===slot.buyPlanetId)?.f===pd?.f;
      const slotComm=COMMODITIES.find(c=>c.id===slot.id);const slotIc=slotComm?.ic||(slotComm?.material?'💎':'📦');
      const bdrCol=samePlanet?'rgba(255,255,255,.1)':sameFaction?'rgba(0,243,255,.35)':profit>0?'rgba(46,204,113,.35)':profit<0?'rgba(255,80,80,.3)':'var(--bdr)';
      const avgNote=isMixed?`<div style="font-size:10px;color:var(--muted)">평균매입 ₡${slot.buyPrice.toLocaleString()}</div>`:'';
      const priceLabel=samePlanet
        ?`<div style="font-size:12px;color:var(--yellow);font-weight:bold">↩ 환불 ₡${sp.toLocaleString()}/개</div>
          <div style="font-size:10px;color:var(--dim)">동일 행성 (구매가의 80%)</div>`
        :`<div style="font-size:13px;color:${pC};font-weight:bold">₡${sp.toLocaleString()}/개</div>
          <div style="font-size:10px;color:${pC}">${profit>=0?'+':''}₡${profit.toLocaleString()}</div>
          ${avgNote}`;
      const canSellMore=slot.qty>1;
      return `<div style="
        background:var(--card);
        border:1px solid ${bdrCol};
        border-radius:10px;display:flex;flex-direction:row;overflow:hidden;
        transition:border-color .2s;
        min-height:126px;
      ">
        <!-- 이미지 영역 (좌측) -->
        <div style="background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;padding:8px;position:relative;width:70px;flex-shrink:0;align-self:stretch">
          ${imgOrEmoji('img/commodities/'+slot.id+'.png',slotIc,52,52,'border-radius:6px;object-fit:cover','comm_'+slot.id)}
          <span style="position:absolute;bottom:3px;left:0;right:0;text-align:center;background:rgba(0,243,255,.25);color:var(--cyan);font-size:9px;padding:1px 0">×${slot.qty}</span>
        </div>
        <!-- 정보+버튼 영역 (우측) -->
        <div style="flex:1;display:flex;flex-direction:column;min-width:0;padding:7px 9px;justify-content:space-between">
          <div>
            <div style="font-size:13px;font-weight:bold;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${slot.nm}">${slot.nm}</div>
            ${priceLabel}
          </div>
          <div style="display:flex;gap:3px;align-items:center;margin-top:4px">
            <button class="btn btn-sm ${samePlanet?'':'btn-gold'}" style="flex:1;font-size:10px;padding:3px 2px${samePlanet?';border-color:var(--yellow);color:var(--yellow)':''}" onclick="sellComm(${idx},1)" title="${samePlanet?'동일 행성 환불 — 구매가의 80%':'판매'}">${samePlanet?'환불 1':'1개'}</button>
            ${canSellMore?`<button class="btn btn-sm ${samePlanet?'':'btn-gold'}" style="flex:1;font-size:10px;padding:3px 2px${samePlanet?';border-color:var(--yellow);color:var(--yellow)':''}" onclick="sellComm(${idx},${slot.qty})">${samePlanet?'전량 환불':'전량'}</button>`:''}
          </div>
        </div>
      </div>`;
    }).join('')}
    </div>
  </div>`
  :`<div style="background:var(--card);border:1px dashed var(--bdr);border-radius:8px;padding:14px;margin-bottom:14px;text-align:center;color:var(--dim);font-size:14px">화물창 비어있음 — 특산물 구매 후 다른 문명권에서 판매하세요</div>`;

  const availComm=COMMODITIES.filter(c=>stock[c.id]>0);
  const availNormal=availComm.filter(c=>!c.material);
  const availMat=availComm.filter(c=>c.material);
  const hasMarco=G.heroes.includes('H08');
  const marcoBonus=hasMarco?'<span style="color:var(--gold);font-size:12px;margin-left:8px">🧭 마르코 폴로 +10% 적용</span>':'';
  body.innerHTML=`<div style="display:flex;flex-direction:column;height:100%;overflow:hidden">
    ${hubBanner('trade','🏬','행성 상점',pd?.f)}
    <!-- 상단 고정 헤더 -->
    <div style="padding:12px 16px 8px;border-bottom:1px solid rgba(255,255,255,.07);flex-shrink:0">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px">
        <div style="font-size:18px;font-weight:bold;color:var(--cyan);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">🪐 은하계 행성 상점 — ${pd?.nm||''}</div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <div style="display:flex;align-items:center;gap:6px">
            <span style="color:${totalQty>=MAX?'var(--red)':'var(--dim)'};font-size:13px;font-weight:${totalQty>=MAX?'bold':'normal'}">📦 ${totalQty}/${MAX}</span>
            <div style="width:80px;height:6px;background:rgba(255,255,255,.1);border-radius:3px;overflow:hidden">
              <div style="height:100%;width:${Math.min(100,Math.round(totalQty/Math.max(1,MAX)*100))}%;background:${totalQty>=MAX?'var(--red)':totalQty/MAX>0.8?'var(--yellow)':'var(--green)'};border-radius:3px;transition:width .3s"></div>
            </div>
            ${totalQty>=MAX?'<span style="color:var(--red);font-size:12px;font-weight:bold;animation:pulse 1s infinite">🚫 만석</span>':''}
          </div>
          <button class="btn btn-sm btn-gold" style="font-size:11px;padding:2px 10px" onclick="buyAllComm()">🛒 일괄 구매</button>
          <button class="btn btn-sm" style="font-size:11px;padding:2px 8px" onclick="hubTab('ship')">🛸 창고 확장↗</button>
        </div>
      </div>
      ${marcoBonus}
    </div>
    <!-- 좌우 분할: 왼쪽=보유 화물, 오른쪽=구매 가능 특산물+제작 재료 -->
    <div style="flex:1;display:flex;flex-direction:row;min-height:0;overflow:hidden">
    <!-- 왼쪽: 보유 화물 -->
    <div data-scroll-id="trade-cargo" style="flex:1;overflow-y:auto;min-height:0;padding:10px 10px 16px 16px;border-right:1px solid rgba(255,255,255,.07);scrollbar-width:thin;scrollbar-color:rgba(0,243,255,.2) transparent">
      ${cargoHTML}
    </div>
    <!-- 오른쪽: 구매 가능 특산물 + 제작 재료 -->
    <div data-scroll-id="trade-buy" style="flex:1;overflow-y:auto;min-height:0;padding:10px 14px 16px 10px;scrollbar-width:thin;scrollbar-color:rgba(0,243,255,.2) transparent">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div style="color:var(--cyan);font-size:13px;font-weight:bold">🛒 구매 가능 특산물 <span style="color:var(--dim);font-weight:normal;font-size:12px">(재고 소진 후 미보충)</span></div>
        ${(()=>{const matAvail=availComm.filter(c=>c.material);if(!matAvail.length)return'';return`<span style="background:rgba(212,175,55,.1);border:1px solid rgba(212,175,55,.3);border-radius:5px;padding:2px 8px;font-size:11px;color:var(--gold)">⚗️ 제작 재료 포함</span>`;})()}
      </div>
      ${availComm.length===0
        ?'<div style="color:var(--dim);font-size:14px;text-align:center;padding:30px 0">재고 소진. 다른 행성으로 이동하세요.</div>'
        :(()=>{
          // ── 일반 특산물 그리드 ──
          const _commPlv=calcPlayerLevel(),_commRep=G.reputation||0;
          const normalCards=availNormal.map(c=>{
            const qty=stock[c.id]||0;
            const _pLock=(c.buy>=10000&&(_commPlv<60||_commRep<100))||(c.buy>=5000&&(_commPlv<30||_commRep<50));
            const canBuy=G.credits>=c.buy&&totalQty<MAX&&qty>0&&!_pLock;
            const _lockBadge=_pLock?`<div style="font-size:10px;color:var(--purple);font-weight:bold;margin-top:1px">🔒 ${c.buy>=10000?'전투력60·명성100':'전투력30·명성50'}</div>`:'';
            const isOrigin=c.f===pd?.f;
            const marcoBadge=hasMarco?`<div style="font-size:10px;color:var(--gold);margin-top:2px">🧭 최대₡${Math.floor(c.maxSell*1.1).toLocaleString()}</div>`:`<div style="font-size:10px;color:var(--dim);margin-top:2px">최대₡${(c.maxSell||0).toLocaleString()}</div>`;
            return`<div style="
              background:var(--card);
              border:1px solid ${isOrigin?'rgba(0,243,255,.4)':'var(--bdr)'};
              border-radius:10px;display:flex;flex-direction:row;overflow:hidden;
              transition:border-color .2s;
              min-height:126px;
              ${canBuy?'':'opacity:.55'}
            " onmouseover="this.style.borderColor='${isOrigin?'rgba(0,243,255,.7)':'rgba(0,243,255,.3)'}'" onmouseout="this.style.borderColor='${isOrigin?'rgba(0,243,255,.4)':'var(--bdr)'}'">
              <!-- 이미지 영역 (좌측) -->
              <div style="background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;padding:8px;position:relative;width:70px;flex-shrink:0;align-self:stretch">
                ${imgOrEmoji('img/commodities/'+c.id+'.png',c.ic||'📦',52,52,'border-radius:6px;object-fit:cover','comm_'+c.id)}
                ${isOrigin?'<span style="position:absolute;bottom:3px;left:0;right:0;text-align:center;background:rgba(0,243,255,.25);color:var(--cyan);font-size:9px;padding:1px 0">원산지</span>':''}
              </div>
              <!-- 정보+버튼 영역 (우측) -->
              <div style="flex:1;display:flex;flex-direction:column;min-width:0;padding:7px 9px;justify-content:space-between">
                <div>
                  <div style="font-size:13px;font-weight:bold;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.nm}</div>
                  <div style="font-size:13px;font-weight:bold;color:var(--gold)">₡${c.buy.toLocaleString()}</div>
                  ${_lockBadge}
                  ${marcoBadge}
                  <div style="font-size:10px;color:var(--dim)">재고 ${qty}</div>
                </div>
                <div style="display:flex;flex-direction:column;gap:3px;margin-top:4px">
                  <div style="display:flex;gap:3px;align-items:center">
                    <input id="qty_${c.id}" type="number" min="1" max="${qty}" value="1"
                      style="width:40px;padding:2px 3px;background:rgba(255,255,255,.08);border:1px solid rgba(0,243,255,.25);border-radius:4px;color:var(--txt);font-size:11px;text-align:center"
                      ${canBuy?'':'disabled'}>
                    <button class="btn btn-sm btn-green" onclick="buyCommN('${c.id}')" ${canBuy?'':'disabled'}
                      style="flex:1;font-size:11px;padding:3px 6px">구매</button>
                  </div>
                  <button class="btn btn-sm btn-gold" onclick="buyCommMax('${c.id}')" ${canBuy?'':'disabled'}
                    style="font-size:11px;padding:3px 6px;width:100%" title="재고/크레딧/화물칸 한도까지 한번에 구매">🛒 전체</button>
                </div>
              </div>
            </div>`;
          }).join('');

          // ── 제작 재료 그리드 (특산물 카드와 동일한 가로형 레이아웃) ──
          const matCards=availMat.length===0?'':
            `<div style="color:var(--gold);font-size:12px;font-weight:bold;margin:14px 0 8px;grid-column:1/-1">⚗️ 제작 재료 <span style="font-weight:normal;color:var(--dim)">(재료창 보관)</span></div>`+
            availMat.map(c=>{
              const qty=stock[c.id]||0;
              const have=(G.materials&&G.materials[c.id])||0;
              // 제작 재료는 전투력 100·명성 100 이상 필요 (가격 무관 통합 잠금)
              const _matLockBasic=(_commPlv<100||_commRep<100);
              const _matLockHigh=(c.buy>=10000&&(_commPlv<60||_commRep<100))||(c.buy>=5000&&(_commPlv<30||_commRep<50));
              const _matLock=_matLockBasic||_matLockHigh;
              const canBuyMat=G.credits>=c.buy&&qty>0&&!_matLock;
              const _matLockBadge=_matLock?`<div style="font-size:10px;color:var(--purple);font-weight:bold;margin-top:1px">🔒 ${_matLockBasic?'전투력100·명성100':c.buy>=10000?'전투력60·명성100':'전투력30·명성50'}</div>`:'';
              return`<div style="
                background:rgba(212,175,55,.04);
                border:1px solid ${canBuyMat?'rgba(212,175,55,.4)':'rgba(212,175,55,.15)'};
                border-radius:10px;display:flex;flex-direction:row;overflow:hidden;
                transition:border-color .2s;
                min-height:126px;
                ${canBuyMat?'':'opacity:.5'}
              " onmouseover="this.style.borderColor='rgba(212,175,55,.8)'" onmouseout="this.style.borderColor='${canBuyMat?'rgba(212,175,55,.4)':'rgba(212,175,55,.15)'}'">
                <!-- 이미지 영역 (좌측) -->
                <div style="background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;padding:8px;position:relative;width:70px;flex-shrink:0;align-self:stretch">
                  ${imgOrEmoji('img/commodities/'+c.id+'.png',c.ic||'💎',52,52,'border-radius:6px;object-fit:cover','mat_'+c.id)}
                  <span style="position:absolute;bottom:3px;left:0;right:0;text-align:center;background:rgba(212,175,55,.25);color:var(--gold);font-size:9px;padding:1px 0">⚗️ 재료</span>
                </div>
                <!-- 정보+버튼 영역 (우측) -->
                <div style="flex:1;display:flex;flex-direction:column;min-width:0;padding:7px 9px;justify-content:space-between">
                  <div>
                    <div style="font-size:13px;font-weight:bold;color:var(--gold);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.nm}</div>
                    <div style="font-size:13px;font-weight:bold;color:var(--gold)">₡${c.buy.toLocaleString()}</div>
                    ${_matLockBadge}
                    <div style="font-size:10px;color:var(--dim);margin-top:2px">보유 <span style="color:var(--cyan);font-weight:bold">${have}개</span></div>
                    <div style="font-size:10px;color:var(--dim)">재고 ${qty}</div>
                  </div>
                  <div style="display:flex;flex-direction:column;gap:3px;margin-top:4px">
                    <div style="display:flex;gap:3px;align-items:center">
                      <input id="qty_${c.id}" type="number" min="1" max="${qty}" value="1"
                        style="width:40px;padding:2px 3px;background:rgba(255,255,255,.08);border:1px solid rgba(212,175,55,.3);border-radius:4px;color:var(--txt);font-size:11px;text-align:center"
                        ${canBuyMat?'':'disabled'}>
                      <button class="btn btn-sm" onclick="buyCommN('${c.id}')" ${canBuyMat?'':'disabled'}
                        style="flex:1;font-size:11px;padding:3px 6px;border-color:var(--gold);color:var(--gold)">구매</button>
                    </div>
                    <button class="btn btn-sm" onclick="buyCommMax('${c.id}')" ${canBuyMat?'':'disabled'}
                      style="font-size:11px;padding:3px 6px;width:100%;border-color:var(--gold);color:var(--gold);background:rgba(212,175,55,.08)" title="재고/크레딧 한도까지 한번에 구매">🛒 전체</button>
                  </div>
                </div>
              </div>`;
            }).join('');

          return`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px">
            ${normalCards}
            ${matCards}
          </div>`;
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
  if(comm.material&&(_bplv<100||_brep<100)){notify(`🔒 제작 재료는 전투력 100·명성 100 이상 필요 (현재 전투력 ${_bplv} / 명성 ${_brep})`,'err');return;}
  if(comm.buy>=10000&&(_bplv<60||_brep<100)){notify(`🔒 ₡10,000+ 특산물은 전투력 60·명성 100 이상 필요 (현재 전투력 ${_bplv} / 명성 ${_brep})`,'err');return;}
  if(comm.buy>=5000&&(_bplv<30||_brep<50)){notify(`🔒 ₡5,000+ 특산물은 전투력 30·명성 50 이상 필요 (현재 전투력 ${_bplv} / 명성 ${_brep})`,'err');return;}
  const stock=G.shopStock[G.currentPlanet];if(!stock||!stock[id]||stock[id]<=0){notify('재고 없음','err');return;}
  if(G.credits<comm.buy){notify('크레딧 부족','err');return;}
  // special 아이템: material=재료창, 나머지=인벤토리 (화물창 미사용)
  if(comm.special){
    G.credits-=comm.buy;stock[id]--;
    if(comm.material){
      if(!G.materials)G.materials={};
      G.materials[id]=(G.materials[id]||0)+1;
      // 화물칸에도 선적 (화물 용량 체크)
      const _mTotalQty=G.cargo.reduce((s,c)=>s+c.qty,0);
      const _mCargoMax=getCargoMax();
      if(_mTotalQty<_mCargoMax){
        const _mEx=G.cargo.find(s=>s.id===id);
        if(_mEx){
          _mEx.buyPrice=Math.round((_mEx.buyPrice*_mEx.qty+comm.buy)/(_mEx.qty+1));
          _mEx.buyPlanetId=_mEx.buyPlanetId===G.currentPlanet?G.currentPlanet:'mixed';
          _mEx.qty++;
        } else G.cargo.push({id,nm:comm.nm,qty:1,buyPrice:comm.buy,buyPlanetId:G.currentPlanet,buyFaction:PLANET_DEF.find(p=>p.id===G.currentPlanet)?.f,material:true});
      }
      updateHUD();if(!_silent){notify(`${comm.ic||'💎'} ${comm.nm} 획득! (제작 재료 ${G.materials[id]}개 — 화물칸 선적)`,'gold');rerenderTab(renderTradeTab);}
    } else {
      if(!G.inventory)G.inventory=[];
      const inv=G.inventory.find(i=>i.id===id);
      if(inv)inv.qty++;else G.inventory.push({id,nm:comm.nm,qty:1});
      updateHUD();if(!_silent){notify(`📜 ${comm.nm} 획득! (영웅 영입 재료)`,'gold');rerenderTab(renderTradeTab);}
    }
    saveGame(true);return;
  }
  const totalQty=G.cargo.reduce((s,c)=>s+c.qty,0);
  const cargoMax=getCargoMax();
  if(totalQty>=cargoMax){notify(`화물창 만석 (${totalQty}/${cargoMax}) — 함선 거래소에서 창고 확장`,'err');return;}
  G.credits-=comm.buy;stock[id]--;
  // ID 기준 통합: 동일 아이템은 행성 무관 합산, 가중평균 구매가
  const ex=G.cargo.find(s=>s.id===id);
  if(ex){
    ex.buyPrice=Math.round((ex.buyPrice*ex.qty+comm.buy)/(ex.qty+1));
    ex.buyPlanetId=ex.buyPlanetId===G.currentPlanet?G.currentPlanet:'mixed';
    ex.buyFaction=ex.buyFaction===PLANET_DEF.find(p=>p.id===G.currentPlanet)?.f?ex.buyFaction:'mixed';
    ex.qty++;
  } else {
    G.cargo.push({id,nm:comm.nm,qty:1,buyPrice:comm.buy,buyPlanetId:G.currentPlanet,buyFaction:PLANET_DEF.find(p=>p.id===G.currentPlanet)?.f});
  }
  if(!_silent)saveGame(true);
  updateHUD();if(!_silent){notify(`📦 ${comm.nm} 구매 (${totalQty+1}/${cargoMax})`,'ok');rerenderTab(renderTradeTab);}
}
function buyCargoItem(id){
  const ci=CARGO_ITEMS.find(function(c){return c.id===id;});
  if(!ci){notify('아이템 정보 없음','err');return;}
  if(ci.quest){notify('퀘스트 보상 전용 아이템','err');return;}
  const stock=G.shopStock[G.currentPlanet];
  if(!stock||!stock['cargo_'+id]||stock['cargo_'+id]<=0){notify('재고 없음','err');return;}
  if(G.credits<ci.price){notify(`크레딧 부족 (필요: ₡${ci.price.toLocaleString()})`, 'err');return;}
  // 인벤토리 슬롯 체크 (hero/legend는 2칸)
  const invSlotUsed=(G.inventory||[]).reduce(function(s,iv){
    const p=PARTS.find(function(p){return p.id===iv.id;});
    const cc=CARGO_ITEMS.find(function(c){return c.id===iv.id;});
    const sz=cc?cc.size:(p&&(p.rarity==='hero'||p.rarity==='legend'||p.rarity==='mythic')?2:1);
    return s+sz*(iv.qty||1);
  },0);
  const invSlotMax=30;
  if(invSlotUsed+ci.size>invSlotMax){notify('인벤토리 공간 부족','err');return;}
  G.credits-=ci.price;
  stock['cargo_'+id]--;
  const ex=G.inventory.find(function(i){return i.id===ci.id;});
  if(ex)ex.qty++;
  else G.inventory.push({id:ci.id,qty:1});
  updateHUD();
  notify(`${ci.ic} ${ci.nm} 구매 (+${ci.slots}칸)`, 'ok');
  if(G._currentHubTab==='ship'||G._currentHubTab==='garage')rerenderShipOrGarage();
  saveGame(true);
}
function buyComm5(id){let bought=0;for(let i=0;i<5;i++){const total=G.cargo.reduce((s,c)=>s+c.qty,0);if(total>=getCargoMax()||!G.shopStock[G.currentPlanet]?.[id]||G.shopStock[G.currentPlanet][id]<=0||G.credits<(COMMODITIES.find(c=>c.id===id)?.buy||0))break;buyComm(id,true);bought++;}if(bought>0){const comm=COMMODITIES.find(c=>c.id===id);notify(`📦 ${comm?.nm||id} ${bought}개 구매`,'ok');rerenderTab(renderTradeTab);saveGame(true);}}
function buyCommN(id){
  const inp=document.getElementById('qty_'+id);
  const n=Math.max(1,parseInt(inp?.value)||1);
  let bought=0;
  for(let i=0;i<n;i++){
    const total=G.cargo.reduce((s,c)=>s+c.qty,0);
    const stock=G.shopStock[G.currentPlanet];
    const comm=COMMODITIES.find(c=>c.id===id);
    if(!comm)break;
    if(total>=getCargoMax()&&!comm.material){notify('화물창 만석','err');break;}
    if(!stock?.[id]||stock[id]<=0){notify('재고 소진','err');break;}
    if(G.credits<comm.buy){notify('크레딧 부족','err');break;}
    buyComm(id,true);bought++;
  }
  if(bought>0){const comm=COMMODITIES.find(c=>c.id===id);notify(`📦 ${comm?.nm||id} ${bought}개 구매`,'ok');rerenderTab(renderTradeTab);saveGame(true);}
}
// 단일 특산물 전체구매 — 해당 행성의 재고/크레딧/화물칸 한도까지 한 번에 구매
function buyCommMax(id){
  const stock=G.shopStock[G.currentPlanet];
  const comm=COMMODITIES.find(c=>c.id===id);
  if(!comm||!stock?.[id]||stock[id]<=0){notify('재고 없음','err');return;}
  let bought=0,blockedReason='';
  while(true){
    if(!stock[id]||stock[id]<=0){blockedReason=blockedReason||'재고 소진';break;}
    if(G.credits<comm.buy){blockedReason=blockedReason||'크레딧 부족';break;}
    const total=G.cargo.reduce((s,c)=>s+c.qty,0);
    if(!comm.material&&total>=getCargoMax()){blockedReason=blockedReason||'화물창 만석';break;}
    buyComm(id,true);bought++;
    if(bought>=1000)break;  // 안전장치 (무한루프 방지)
  }
  if(bought>0){
    const totalCost=bought*comm.buy;
    notify(`🛒 ${comm.nm} ${bought}개 전체구매 완료 (-₡${totalCost.toLocaleString()})${blockedReason?' · '+blockedReason:''}`,'ok');
    rerenderTab(renderTradeTab);saveGame(true);
  } else {
    notify('구매 불가: '+blockedReason,'err');
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
      const cur=G.cargo.reduce((s,x)=>s+x.qty,0);
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
  if(total>0){notify(`🛒 총 ${total}개 일괄 구매 완료`,'ok');rerenderTab(renderTradeTab);saveGame(true);}
  else notify('구매 가능한 특산물이 없습니다','err');
}
function sellComm(idx,qty){
  const slot=G.cargo[idx];if(!slot||slot.qty<qty)return;
  const commDef=COMMODITIES.find(c=>c.id===slot.id);
  if(commDef?.special){
    if(commDef.material){
      // 재료 판매가:
      //  ① 매입한 행성: 매입가 × 0.8 (환불)
      //  ② 다른 행성(어디든): 구매가 × 3.0 (3배 차익)
      const _atSame=slot.buyPlanetId===G.currentPlanet;
      let sellPriceRaw, _label;
      if(_atSame){
        sellPriceRaw=Math.floor((slot.buyPrice||commDef.buy||0)*0.8);
        _label='환불 (매입가 ×0.8)';
      } else {
        sellPriceRaw=Math.floor((commDef.buy||0)*3.0);
        _label='타 행성 프리미엄 (구매가 ×3.0)';
      }
      if(!sellPriceRaw){notify('⚗️ 판매 불가 재료','err');return;}
      const sellQty=qty||1;
      if(G.materials&&G.materials[slot.id]){G.materials[slot.id]=Math.max(0,(G.materials[slot.id]||0)-sellQty);}
      slot.qty-=sellQty;if(slot.qty<=0)G.cargo.splice(idx,1);
      G.credits+=sellPriceRaw*sellQty;
      updateHUD();notify(`⚗️ ${commDef.nm} ${sellQty}개 판매 +₡${(sellPriceRaw*sellQty).toLocaleString()} (${_label})`,'gold');
      rerenderTab(renderTradeTab);saveGame(true);return;
    }
    notify('📜 이 아이템은 판매할 수 없습니다 (영웅 영입 재료)','err');return;
  }
  const sp=calcSellPrice(slot,G.currentPlanet),profit=(sp-slot.buyPrice)*qty;
  G.credits+=sp*qty;slot.qty-=qty;if(slot.qty===0)G.cargo.splice(idx,1);
  // 상점 거래 수익 10만 이상 시 명성 +1 (상거래 평판 보상)
  let _repBonusMsg='';
  if(profit>=100000){
    changeReputation(1);
    _repBonusMsg=' ⭐ 명성+1 (대량 거래)';
  }
  updateHUD();notify(profit>0?`💰 판매 ₡${(sp*qty).toLocaleString()} (+₡${profit.toLocaleString()})${_repBonusMsg}`:` 판매 ₡${(sp*qty).toLocaleString()}`,'gold');
  rerenderTab(renderTradeTab);saveGame(true);
}

// ═══ SHIP TAB (함선 구매/수리/파츠) ══════════════════════════════
function getFactionPassive(){
  // 현재 행성 문명권 패시브
  const pd=PLANET_DEF.find(p=>p.id===G.currentPlanet);
  const fac=pd?.f||'';
  return {
    repairDisc: fac==='F01'?0.85:1.0,      // 수퍼비아: 수리비 15% 할인
    taxMult:    fac==='F02'?1.25:1.0,       // 아우레우스: 세금 +25%
    captureBns: (fac==='F04'?15:0)+(G.heroes.includes('F04_passive')?0:0), // 크리그: 나포+15%
    dexBns:     fac==='F06'?1.20:1.0,       // 지구 저항군: ATT +20%
  };
}
function repairCost(s){
  const b=getPartBonus(s);
  const effMax=s.maxHP+(b.hp||0);
  const base=Math.floor((effMax-Math.min(s.hp,effMax))*(s.tier==='신화'?600:s.tier==='전설기함'?500:s.tier==='대형'?200:s.tier==='중형'?150:100));
  const raw=Math.floor(base*getFactionPassive().repairDisc);
  // 함선 구매 가격 초과 불가 — 카탈로그 없는 함선은 등급별 기본가 사용
  const shipDef=SHIP_CATALOG.find(x=>x.id===(s.id||'').replace(/_.*$/,''));
  const tierFallback=s.tier==='신화'?25000000:s.tier==='전설기함'?3000000:s.tier==='대형'?200000:s.tier==='중형'?50000:10000;
  const shipPrice=shipDef?shipDef.price:tierFallback;
  return Math.min(raw,Math.floor(shipPrice*0.8));
}
function shRepairCost(s){
  const b=getPartBonus(s);
  const effMax=s.maxSH+(b.sh||0);
  const rawSH=Math.floor((effMax-Math.min(s.sh,effMax))*80);
  // 실드 수리비 — 함선 가격의 20% 상한, 카탈로그 없는 함선도 등급별 기본가 적용
  const shipDef=SHIP_CATALOG.find(x=>x.id===(s.id||'').replace(/_.*$/,''));
  const tierFallback=s.tier==='신화'?25000000:s.tier==='전설기함'?3000000:s.tier==='대형'?200000:s.tier==='중형'?50000:10000;
  const shipPrice=shipDef?shipDef.price:tierFallback;
  return Math.min(rawSH,Math.floor(shipPrice*0.2));
}
function getPartBonus(ship){
  let att=0,int2=0,tec=0,def=0,hp=0,sh=0;
  (ship.parts||[]).forEach(pid=>{const p=partById(pid);if(!p)return;if(p.cat==='weapon')att+=p.ATT||0;if(p.cat==='shield'){int2+=p.INT||0;sh+=p.maxSH||0;}if(p.cat==='armor'){hp+=p.HP||0;def+=p.DEF||0;}if(p.cat==='engine')tec+=p.TEC||0;});
  return{att,int2,tec,def,hp,sh};
}
// 크루 클래스별 함선 보너스
const CREW_BONUS_TABLE={
  Pilot:{att:8,int2:0,tec:2,def:2,hp:0,sh:0},
  Eng:{att:0,int2:4,tec:8,def:4,hp:0,sh:200},
  Merch:{att:0,int2:0,tec:4,def:1,hp:0,sh:0},
  Mage:{att:2,int2:8,tec:4,def:3,hp:0,sh:300},
  Sniper:{att:10,int2:0,tec:3,def:1,hp:0,sh:0},
  Engineer:{att:1,int2:3,tec:10,def:6,hp:0,sh:0},
  Commander:{att:5,int2:5,tec:5,def:5,hp:0,sh:100}
};
const RARITY_MULT={N:1.0,R:2.0,H:4.0,L:8.0,S:16.0};
// 등급별 슬롯 점유 칸 수: N=1칸 R=1칸 H=2칸 L=4칸 S(스토리영웅)=4칸
const CREW_SLOT_COST={N:1,R:1,H:2,L:4,S:4};
function getCrewSlotCost(c){return CREW_SLOT_COST[(c&&c.rarity)||'N']||1;}
function getTotalSlotUsed(ship){
  const all=[...G.crew,...(G.heroes||[]).map(h=>Object.assign({},HEROES[h],{id:h,rarity:'S',isHero:true}))];
  return (ship.crewIds||[]).reduce(function(sum,cid){const c=all.find(function(x){return x.id===cid;});return sum+getCrewSlotCost(c);},0);
}
function getCrewBonus(ship){
  let att=0,int2=0,tec=0,def=0,hp=0,sh=0;
  (ship.crewIds||[]).forEach(cid=>{
    const c=G.crew.find(x=>x.id===cid)||G.heroes.map(h=>({...HEROES[h],id:h,rarity:'S'})).find(x=>x.id===cid);
    if(!c)return;
    const b=CREW_BONUS_TABLE[c.cl]||{att:3,int2:3,tec:3,def:2,hp:0,sh:0};
    const m=RARITY_MULT[c.rarity]||1.0;
    // STR→att(att), ATT→eng(tec), INT→shd(int2), DEF→def
    const strBonus=c.STR?Math.round(c.STR*0.05*m):0;
    const dexBonus=c.ATT?Math.round(c.ATT*0.05*m):0;
    const intBonus=c.INT?Math.round(c.INT*0.04*m):0;
    const defBonus=c.DEF?Math.round(c.DEF*0.04*m):0;
    att+=Math.round(b.att*m)+strBonus;
    int2+=Math.round(b.int2*m)+intBonus;
    tec+=Math.round(b.tec*m)+dexBonus;
    def+=Math.round((b.def||0)*m)+defBonus;
    hp+=Math.round(b.hp*m);sh+=Math.round(b.sh*m);
  });
  return{att,int2,tec,def,hp,sh};
}
// 파츠/크루 장착 후 HP·SH 용량 자동 동기화 (수리 버튼 오활성화 방지)
function _syncShipCapacity(s,stBefore){
  const stAfter=getShipStats(s);
  s.hp=Math.min(stAfter.HP,s.hp+Math.max(0,stAfter.HP-stBefore.HP));
  s.sh=Math.min(stAfter.maxSH,s.sh+Math.max(0,stAfter.maxSH-stBefore.maxSH));
}
function getMaxCrew(ship){
  if(!ship)return 8;
  // 티어 기본값:
  //  소형 8 · 중형 10 · 대형 16 · 전설기함 20 · 신화 20
  const t=ship.tier;
  const tierMin=t==='신화'?20:t==='전설기함'?20:t==='대형'?16:t==='중형'?10:8;
  // 인스턴스/카탈로그 override가 더 크면 사용, 아니면 티어 기본 (티어 기본이 최소 보장)
  let base=tierMin;
  if(typeof ship.crewMax==='number'&&ship.crewMax>tierMin)base=ship.crewMax;
  else{
    const cid=String(ship.catalogId||ship.catId||ship.id||'').replace(/_.*$/,'');
    const def=cid?SHIP_CATALOG.find(d=>d.id===cid):null;
    if(def&&typeof def.crewMax==='number'&&def.crewMax>tierMin)base=def.crewMax;
  }
  // 절대 상한: 20명
  return Math.min(20,base);
}
// 크루 명단 최대 보유 수: 기본 24명 + 전설/스토리 크루·영입 영웅 1명당 +4 + 영웅 등급 크루 1명당 +2
function getMaxCrewCount(){
  const BASE=24;
  const crew=G.crew||[];
  const heroes=G.heroes||[];
  const legendCnt=crew.filter(c=>c&&(c.rarity==='L'||c.rarity==='S')).length+heroes.length;
  const heroCnt=crew.filter(c=>c&&c.rarity==='H').length;
  return BASE+legendCnt*4+heroCnt*2;
}
// 함선 거래소 서브탭 상태
let _shipTab='buy'; // buy | parts
let _fleetSort='tier'; // tier | att | hp | name
let _garageSubTab='parts'; // parts | crew | cargo
let _partSort='tier'; // tier | priceAsc | priceDesc | nm — 파츠 구매 정렬
let _invPartSort='tier'; // tier | priceAsc | priceDesc | nm — 보유 파츠(매각) 정렬
function buildCrewManifest(s,idx){
  const ids=s.crewIds||[];
  if(ids.length===0)return'<div style="font-size:11px;color:var(--dim)">탑승 크루 없음</div>';
  const RC={N:'#888',R:'var(--blue)',H:'var(--purple)',L:'var(--gold)',S:'#ff6ec7'};
  const RN={N:'일반',R:'희귀',H:'영웅',L:'전설',S:'스토리'};
  const rows=ids.map((cid,ci)=>{
    const c=G.crew.find(x=>x.id===cid)||G.heroes.map(h=>({...HEROES[h],id:h,isHero:true,rarity:'S'})).find(x=>x.id===cid);
    if(!c)return'';
    const rc=RC[c.rarity]||'#888';
    const rnm=RN[c.rarity]||'';
    const cb2=CREW_BONUS_TABLE[c.cl]||{att:3,int2:3,tec:3};
    const m2=RARITY_MULT[c.rarity]||1;
    const slotCost2={N:1,R:1,H:2,L:4,S:4}[c.rarity]||1;
    const b2=[cb2.att?'ATT+'+Math.round(cb2.att*m2):'',cb2.int2?'SHD+'+Math.round(cb2.int2*m2):'',cb2.tec?'ENG+'+Math.round(cb2.tec*m2):''].filter(Boolean).join(' ');
    return '<div style="display:flex;align-items:center;gap:6px">'
      +'<span style="font-size:17px;flex-shrink:0">'+(c.ic||'🧑')+'</span>'
      +'<div style="flex:1;min-width:0">'
        +'<div style="font-size:12px;font-weight:bold;color:'+rc+';'+(c.rarity==="L"||c.isHero?'text-shadow:0 0 5px '+rc+'.6':'')+'">'+(c.isHero?'⭐ ':c.rarity==="L"?'✨ ':'')+c.nm+' <span style="font-size:11px;opacity:.7">['+rnm+']</span></div>'
        +'<div style="font-size:11px;color:var(--dim)">'+(c.cl||'')+( b2?' · '+b2:'')+'</div>'
      +'</div>'
      +'<button onclick="unassignCrew('+idx+','+ci+')" style="background:none;border:1px solid rgba(255,60,60,.3);border-radius:3px;color:var(--red);cursor:pointer;padding:1px 5px;font-size:11px;flex-shrink:0">하선</button>'
      +'</div>';
  }).filter(Boolean).join('');
  return '<div style="background:rgba(0,243,255,.04);border:1px solid rgba(0,243,255,.12);border-radius:6px;padding:7px 10px">'
    +'<div style="font-size:11px;color:var(--dim);margin-bottom:5px;letter-spacing:.5px">👥 탑승자 명단</div>'
    +'<div style="display:flex;flex-direction:column;gap:4px">'+rows+'</div>'
    +'</div>';
}
function getPartGridSize(p){
  if(!p)return{cols:1,rows:1};
  if(p.rarity==='mythic'||p.rarity==='set'||p.tier>=15)return{cols:2,rows:2};
  if(p.tier>=11)return{cols:2,rows:1};
  return{cols:1,rows:1};
}
function getBasePartsGridRows(tier){
  return tier==='신화'?6:tier==='전설기함'?5:tier==='대형'?4:tier==='중형'?3:2;
}
function getShipPartsGridCols(tier){
  // 소형=4, 중형=8(×2), 대형/전설기함=12(×3), 신화=16(×4)
  return tier==='신화'?8:tier==='전설기함'||tier==='대형'?6:tier==='중형'?4:2;
}
// 티어별 파츠 그리드 행 확장 한도
// 소형 3x · 중형 1.5x · 대형 1.2x · 전설기함·신화 1.1x — 행 단위 확장 환산
function getMaxExtraPartsRows(tier){
  if(tier==='소형')return 4;       // 2→6 행 (×3)
  if(tier==='중형')return 2;       // 3→5 행 (≈×1.67, 1.5x 상한 근사)
  if(tier==='대형')return 1;       // 4→5 행 (×1.25)
  if(tier==='전설기함')return 1;   // 5→6 행 (×1.2)
  if(tier==='신화')return 1;       // 6→7 행 (≈×1.17)
  return 0;
}
function getShipPartsGridRows(s){
  // 인자가 문자열(tier) 이면 기본값만 반환 (구버전 호환)
  if(typeof s==='string')return getBasePartsGridRows(s);
  if(!s)return 2;
  // 카탈로그 정의 또는 인스턴스의 partsRows 가 있으면 그 값을 기본 행 수로 사용
  let baseRows=getBasePartsGridRows(s.tier);
  if(typeof s.partsRows==='number')baseRows=s.partsRows;
  else {
    const cid=String(s.catalogId||s.catId||s.id||'').replace(/_.*$/,'');
    const def=cid?SHIP_CATALOG.find(d=>d.id===cid):null;
    if(def&&typeof def.partsRows==='number')baseRows=def.partsRows;
  }
  return baseRows+(+s.partsRowsExtra||0);
}
function getPartsUpgradePrice(s){
  if(!s)return 0;
  const tierBase={소형:8000,중형:20000,대형:60000,전설기함:150000,신화:300000}[s.tier]||10000;
  const cnt=+s.partsRowsExtra||0;
  return Math.round(tierBase*Math.pow(1.6,cnt)/100)*100;
}
function upgradePartsRow(shipIdx,fromModal){
  const s=G.fleet[shipIdx];if(!s)return;
  const cur=+s.partsRowsExtra||0;
  const maxExtra=getMaxExtraPartsRows(s.tier);
  if(cur>=maxExtra){
    // 실제 기본 행 수(카탈로그 override 포함) 계산
    const _baseRowsActual=getShipPartsGridRows(s)-cur;
    notify(`🔧 ${s.nm} 파츠 장비창 최대치(${_baseRowsActual+maxExtra}행) 도달`,'warn');
    return;
  }
  const cost=getPartsUpgradePrice(s);
  if(G.credits<cost){notify(`크레딧 부족 (필요: ₡${cost.toLocaleString()})`, 'err');return;}
  G.credits-=cost;
  s.partsRowsExtra=cur+1;
  const newRows=getShipPartsGridRows(s);
  const cols=getShipPartsGridCols(s.tier);
  updateHUD();
  notify(`🔧 ${s.nm} 파츠 장비창 확장 — ${newRows}행 × ${cols}열 = ${newRows*cols}슬롯 (-₡${cost.toLocaleString()})`,'gold');
  baekgu(`${s.nm} 파츠 슬롯 추가 완료. 더 강력하게 무장할 수 있어.`);
  saveGame(true);
  if(fromModal&&typeof showShipDetailModal==='function')showShipDetailModal(shipIdx);
  else rerenderShipOrGarage();
}
function layoutPartsGrid(partIds,COLS,ROWS){
  var grid=[];for(var _r=0;_r<ROWS;_r++){var row=[];for(var _c=0;_c<COLS;_c++)row.push(null);grid.push(row);}
  var result=[];
  function canPlace(r,c,sr,sc){if(r+sr>ROWS||c+sc>COLS)return false;for(var dr=0;dr<sr;dr++)for(var dc=0;dc<sc;dc++)if(grid[r+dr][c+dc]!==null)return false;return true;}
  function markGrid(r,c,sr,sc,key){for(var dr=0;dr<sr;dr++)for(var dc=0;dc<sc;dc++)grid[r+dr][c+dc]=key;}
  for(var pi=0;pi<partIds.length;pi++){
    var pid=partIds[pi];
    var p=null;for(var xi=0;xi<PARTS.length;xi++){if(PARTS[xi].id===pid){p=PARTS[xi];break;}}
    if(!p)continue;
    var gs=getPartGridSize(p);var sc=gs.cols;var sr=gs.rows;
    var done=false;
    outer1:for(var r=0;r<ROWS;r++)for(var c=0;c<COLS;c++){if(canPlace(r,c,sr,sc)){markGrid(r,c,sr,sc,String(pi));result.push({r:r,c:c,spanR:sr,spanC:sc,pid:pid,pi:pi,p:p});done=true;break outer1;}}
    if(!done){outer2:for(var r=0;r<ROWS;r++)for(var c=0;c<COLS;c++){if(canPlace(r,c,1,1)){markGrid(r,c,1,1,String(pi));result.push({r:r,c:c,spanR:1,spanC:1,pid:pid,pi:pi,p:p,forced:true});done=true;break outer2;}}}
  }
  for(var r=0;r<ROWS;r++)for(var c=0;c<COLS;c++)if(grid[r][c]===null)result.push({r:r,c:c,spanR:1,spanC:1,pid:null});
  return result;
}
function renderShipTab(body){
  if(!body)return;
  const pd=PLANET_DEF.find(p=>p.id===G.currentPlanet);
  const isHostile=pd?.hostile;
  const isVoidPlanet=pd?.void===true;
  const iSunsin=G.heroes.includes('H01');
  const plvForShip=calcPlayerLevel();
  const heroLock=false;
  generateShopStock(G.currentPlanet);
  const stock=G.shopStock[G.currentPlanet]||{};
  const availShips=SHIP_CATALOG.filter(s=>stock['ship_'+s.id]>0&&s.tier!=='전설기함'&&s.tier!=='신화');
  const availParts=PARTS.filter(p=>stock['part_'+p.id]>0);

  // 서브탭 버튼 HTML
  function subBtn(key,label,active){
    return `<button onclick="switchShipTab('${key}')" style="padding:7px 18px;border:1px solid ${active?'var(--cyan)':'var(--bdr)'};background:${active?'rgba(0,243,255,.1)':'transparent'};color:${active?'var(--cyan)':'var(--dim)'};cursor:pointer;border-radius:6px;font-family:Courier New,monospace;font-size:14px;transition:all .2s">${label}</button>`;
  }

  const subNav=G._garageMode?'':`<div style="display:flex;gap:8px;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--bdr)">
    ${subBtn('buy','💰 함선 구매',_shipTab==='buy')}
    ${subBtn('parts','⚙️ 파츠 구매',_shipTab==='parts')}
  </div>`;

  // ── 내 편대 ──────────────────────────────────────────────────────
  let content='';
  if(_shipTab==='fleet'){
    // 정렬
    function fleetSortBtn(key,label){
      const act=_fleetSort===key;
      return `<button onclick="_fleetSort='${key}';rerenderShipOrGarage()" style="padding:4px 12px;border:1px solid ${act?'var(--cyan)':'var(--bdr)'};background:${act?'rgba(0,243,255,.12)':'transparent'};color:${act?'var(--cyan)':'var(--dim)'};cursor:pointer;border-radius:4px;font-size:12px;font-family:Courier New,monospace">${label}</button>`;
    }
    const TIER_ORDER={'신화':0,'전설기함':1,'대형':2,'중형':3,'소형':4};
    const sortedFleet=[...G.fleet.map((s,i)=>({...s,_origIdx:i}))];
    if(_fleetSort==='tier') sortedFleet.sort((a,b)=>(TIER_ORDER[a.tier]??5)-(TIER_ORDER[b.tier]??5)||(a._origIdx-b._origIdx));
    else if(_fleetSort==='att') sortedFleet.sort((a,b)=>{const ba=getPartBonus(a),bb=getPartBonus(b),ca=getCrewBonus(a),cb2=getCrewBonus(b);return(b.ATT+bb.att+cb2.att)-(a.ATT+ba.att+ca.att);});
    else if(_fleetSort==='hp') sortedFleet.sort((a,b)=>{const ba=getPartBonus(a),bb=getPartBonus(b);return(b.maxHP+bb.hp)-(a.maxHP+ba.hp);});
    else if(_fleetSort==='name') sortedFleet.sort((a,b)=>(a.nm||'').localeCompare(b.nm||''));

    // 전체 수리 비용 계산
    const totalRepairCost=G.fleet.reduce((sum,s)=>sum+repairCost(s)+shRepairCost(s),0);
    // 수리 가능 여부: 실제 수리 비용이 0보다 클 때만 (파츠 추가로 max만 늘어난 경우는 제외)
    const anyDamaged=G.fleet.some(s=>(repairCost(s)+shRepairCost(s))>0);
    // 정비소 서브탭 버튼 (정비소 모드에서만)
    // 정비 모드 서브탭: 함선 정비(파츠+크루+화물 통합) + 편대 편성 두 가지만
    // 정비 서브탭: parts(파츠+크루) / cargo(화물칸 전용) / formation(편대)
    const _isMaintain=_garageSubTab!=='formation'&&_garageSubTab!=='cargo';
    const garageSubNav=G._garageMode?`<div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap">
      ${[{k:'parts',lb:'🔧 함선 정비'},{k:'cargo',lb:'📦 화물 관리'},{k:'formation',lb:'⚓ 편대 편성'}].map(function(t){const act=(t.k===_garageSubTab||(t.k==='parts'&&_isMaintain));return'<button onclick="_garageSubTab=\''+t.k+'\';rerenderTab(renderGarageTab)" style="padding:5px 14px;border:1px solid '+(act?'var(--cyan)':'var(--bdr)')+';background:'+(act?'rgba(0,243,255,.12)':'transparent')+';color:'+(act?'var(--cyan)':'var(--dim)')+';border-radius:6px;cursor:pointer;font-size:12px;font-weight:'+(act?'bold':'normal')+'">'+t.lb+'</button>';}).join('')}
    </div>`:'';
    const sortBar=garageSubNav+`<div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;flex-wrap:wrap">
      <span style="font-size:12px;color:var(--dim)">정렬:</span>
      ${fleetSortBtn('tier','🛕 등급')}${fleetSortBtn('att','⚔️ 공격력')}${fleetSortBtn('hp','❤️ 내구도')}${fleetSortBtn('name','🔤 이름')}
      <span style="font-size:12px;color:var(--dim);margin-left:auto">편대 ${G.fleet.length}척</span>
    </div>
    <div style="background:rgba(0,255,100,.05);border:1px solid rgba(46,204,113,.25);border-radius:8px;padding:10px 14px;margin-bottom:12px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <span style="font-size:14px;font-weight:bold;color:var(--green)">🔧 전체 함대 수리</span>
      <span style="font-size:13px;color:var(--dim)">${anyDamaged?'전체 비용: <b style="color:var(--gold)">₡'+totalRepairCost.toLocaleString()+'</b>':'<span style="color:var(--green)">✅ 전 함선 최적 상태</span>'}</span>
      ${anyDamaged?'<button class="btn btn-gold" style="font-size:13px;padding:5px 14px;margin-left:auto" onclick="repairAllShips()" '+( G.credits>=totalRepairCost?'':'disabled')+'>⚡ 전체 완전수리 ₡'+totalRepairCost.toLocaleString()+'</button>':''}
    </div>
    <!-- 📊 함대 전체 스탯 요약 (HP·SH·ATT·INT·TEC·DEF 합산) -->
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
      const cell=(lbl,val,col)=>`<div style="display:flex;flex-direction:column;align-items:center;gap:2px;padding:4px 10px;background:rgba(0,0,0,.3);border-radius:6px;min-width:74px"><span style="font-size:10px;color:var(--dim);font-weight:bold">${lbl}</span><span style="font-size:15px;font-weight:bold;color:${col}">${val}</span></div>`;
      return `<div style="background:rgba(212,175,55,.06);border:1px solid rgba(212,175,55,.3);border-radius:8px;padding:10px 12px;margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">
          <span style="font-size:14px;font-weight:bold;color:var(--gold)">📊 함대 종합 능력치</span>
          <span style="font-size:11px;color:var(--dim)">전투력 합산 (영웅 패시브·크루·파츠 포함)</span>
          <span style="font-size:11px;color:var(--cyan);margin-left:auto">함대 ${G.fleet.length}척</span>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:stretch">
          ${cell('❤️ HP',`${tot.hp.toLocaleString()}/${tot.maxHp.toLocaleString()}`,hpPct>60?'var(--green)':hpPct>30?'#f39c12':'var(--red)')}
          ${cell('🛡️ SH',`${tot.sh.toLocaleString()}/${tot.maxSh.toLocaleString()}`,shPct>60?'var(--blue)':shPct>30?'#88aaff':'var(--dim)')}
          ${cell('⚔️ ATT',tot.att.toLocaleString(),'var(--red)')}
          ${cell('🛡 SHD',tot.int.toLocaleString(),'var(--blue)')}
          ${cell('⚙️ ENG',tot.tec.toLocaleString(),'var(--cyan)')}
          ${cell('🔰 DEF',tot.def.toLocaleString(),'var(--gold)')}
        </div>
      </div>`;
    })()}
    <div style="background:rgba(0,243,255,.04);border:1px solid rgba(0,243,255,.25);border-radius:8px;padding:10px 14px;margin-bottom:12px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap">
        <span style="font-size:14px;font-weight:bold;color:var(--cyan)">⚡ 자동 배치</span>
        <span style="font-size:11px;color:var(--dim)">클릭 즉시 기존 배치 회수 후 재배치</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">
        <button class="btn btn-sm" style="border-color:var(--gold);color:var(--gold);font-size:11px;padding:6px 4px" onclick="autoEquipPartsFlagship()">🔧 파츠<br>기함중심</button>
        <button class="btn btn-sm" style="border-color:var(--green);color:var(--green);font-size:11px;padding:6px 4px" onclick="autoEquipPartsEven()">🔧 파츠<br>평균배분</button>
        <button class="btn btn-sm" style="border-color:var(--gold);color:var(--gold);font-size:11px;padding:6px 4px" onclick="autoAssignCrewFlagship()">👥 크루<br>기함중심</button>
        <button class="btn btn-sm" style="border-color:var(--green);color:var(--green);font-size:11px;padding:6px 4px" onclick="autoAssignCrewEven()">👥 크루<br>평균배분</button>
      </div>
    </div>`;

    const cats=[{k:'weapon',lb:'⚔️',col:'var(--red)',nm:'무기'},{k:'shield',lb:'🛡️',col:'var(--blue)',nm:'실드'},{k:'armor',lb:'🛡',col:'var(--gold)',nm:'장갑'},{k:'engine',lb:'⚡',col:'var(--cyan)',nm:'엔진'}];

    content = sortBar + sortedFleet.map(s=>{
      const idx=s._origIdx; // 실제 fleet 인덱스 (버튼 onclick용)
      const _stP=getShipStats(s);const _eHpP=Math.max(1,_stP.HP||s.maxHP),_eSPp=Math.max(1,_stP.maxSH||s.maxSH);
      const hpP=Math.max(0,Math.min(100,Math.round(s.hp/_eHpP*100))),shP=(_stP.maxSH||s.maxSH)>0?Math.max(0,Math.min(100,Math.round(s.sh/_eSPp*100))):0;
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
          const _rarNm={N:'일반',R:'희귀',H:'영웅',L:'전설',S:'스토리'}[c.rarity]||'';
          const _tip=c.nm+' ['+_rarNm+' '+(c.cl||'')+']\n'+_bn+(c.isHero?' ⭐':'')+'\n'+cost+'칸 점유\n▶ 클릭=하선';
          var _csz,_hSz,_igsz,_cspan;
          if(cost===4){_csz=CELL_SZ*2+4;_hSz=_csz;_igsz=72;_cspan=';grid-column:span 2;grid-row:span 2';}
          else if(cost===2){_csz=CELL_SZ*2+4;_hSz=CELL_SZ;_igsz=60;_cspan=';grid-column:span 2';}
          else{_csz=CELL_SZ;_hSz=CELL_SZ;_igsz=34;_cspan='';}
          return '<div style="display:flex;flex-direction:column;align-items:center;gap:1px;flex-shrink:0'+_cspan+'">'
            +'<button onclick="unassignCrewById(\''+cid+'\')" title="'+_tip+'" style="background:rgba(0,0,0,.5);border:2px solid '+_col+';border-radius:6px;padding:1px;cursor:pointer;position:relative;width:'+_csz+'px;height:'+_hSz+'px;display:flex;align-items:center;justify-content:center" onmouseover="this.style.borderWidth=\'3px\'" onmouseout="this.style.borderWidth=\'2px\'">'
            +imgOrEmoji(_imgS,c.ic||'🧑',_igsz,_igsz,'border-radius:50%;pointer-events:none;border:1px solid '+_col)
            +'<span style="position:absolute;top:-4px;right:-4px;background:var(--red);color:white;font-size:8px;border-radius:50%;width:12px;height:12px;display:flex;align-items:center;justify-content:center;pointer-events:none">✕</span>'
            +(c.isHero?'<span style="position:absolute;bottom:-4px;left:-4px;font-size:11px;pointer-events:none">⭐</span>':'')
            +'<span style="position:absolute;top:-4px;left:-4px;background:'+_col+';color:#000;font-size:8px;border-radius:3px;padding:0 2px;pointer-events:none">'+cost+'칸</span>'
            +'</button>'
            +'<span style="font-size:8px;color:'+_col+';text-align:center;max-width:'+_csz+'px;line-height:1;overflow:hidden;white-space:nowrap">'+_nm+'</span>'
            +'</div>';
        }else{
          return '<div style="display:flex;flex-direction:column;align-items:center;gap:1px;flex-shrink:0">'
            +'<button onclick="pickCrewForSlot('+idx+')" title="크루 배치" style="background:rgba(0,243,255,.03);border:1px dashed rgba(0,243,255,.2);border-radius:6px;cursor:pointer;width:'+CELL_SZ+'px;height:'+CELL_SZ+'px;display:flex;align-items:center;justify-content:center;color:rgba(0,243,255,.3);font-size:24px;line-height:1" onmouseover="this.style.background=\'rgba(0,243,255,.08)\'" onmouseout="this.style.background=\'rgba(0,243,255,.03)\'">+</button>'
            +'<span style="font-size:8px;color:rgba(255,255,255,.18);text-align:center;max-width:51px;line-height:1">빈슬롯</span>'
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
          const _tp2=p2.nm+' [T'+p2.tier+(p2.rarity==='mythic'?' ✦신화':p2.rarity==='set'?' ◈세트':'')+']\n'+p2.desc+'\n'+_st2+(cell.forced?' (초과배치)':'')+'\n▶ 클릭=탈착';
          const _nmLabel=(_is2x2||_is2x1)?('<span style="font-size:8px;color:'+_cc2+';pointer-events:none;text-align:center;line-height:1;max-width:'+(cell.spanC*CELL_SZ+3*(cell.spanC-1)-4)+'px;overflow:hidden;white-space:nowrap;display:block">'+p2.nm.slice(0,_is2x2?9:7)+'</span>'):'';
          return '<button onclick="detachPartAt('+idx+','+cell.pi+')" title="'+_tp2+'" style="grid-column:'+(cell.c+1)+'/span '+cell.spanC+';grid-row:'+(cell.r+1)+'/span '+cell.spanR+';background:rgba(0,0,0,.65);border:1px solid '+_rb2+';border-radius:5px;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding:2px;position:relative;overflow:hidden" onmouseover="this.style.borderWidth=\'2px\'" onmouseout="this.style.borderWidth=\'1px\'">'
            +imgOrEmoji('img/parts/'+p2.id+'.png',_ci2,_isz,_isz,'pointer-events:none;object-fit:contain;max-width:100%;max-height:100%')
            +_nmLabel
            +'<span style="position:absolute;top:-4px;right:-4px;background:var(--red);color:white;font-size:8px;border-radius:50%;width:11px;height:11px;display:flex;align-items:center;justify-content:center;pointer-events:none">✕</span>'
            +'</button>';
        }else{
          return '<button onclick="pickPartForSlot('+idx+')" title="파츠 장착" style="grid-column:'+(cell.c+1)+';grid-row:'+(cell.r+1)+';background:rgba(255,255,255,.02);border:1px dashed rgba(255,255,255,.1);border-radius:5px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.18);font-size:17px" onmouseover="this.style.background=\'rgba(255,255,255,.05)\'" onmouseout="this.style.background=\'rgba(255,255,255,.02)\'">+</button>';
        }
      }).join('');
      const partsGridHtml='<div style="display:grid;grid-template-columns:repeat('+PART_COLS+','+CELL_SZ+'px);grid-template-rows:repeat('+PART_ROWS+','+CELL_SZ+'px);gap:3px">'+_pCells+'</div>';


      return `<div style="background:var(--card);border:2px solid ${isFlagship?'var(--cyan)':'var(--bdr)'};border-radius:12px;margin-bottom:14px;overflow:visible">

        <!-- ── 헤더 ── -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px 8px;border-bottom:1px solid var(--bdr)">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:17px;font-weight:bold;color:${isFlagship?'var(--cyan)':'#ccd6f6'}">${s.nm}</span>
            ${isFlagship?'<span style="font-size:11px;color:var(--cyan);border:1px solid var(--cyan);border-radius:3px;padding:1px 5px">⭐기함</span>':''}
            <span style="font-size:11px;color:${tierCol};border:1px solid ${tierCol};border-radius:3px;padding:1px 5px">${s.tier}</span>
          </div>
          <span style="font-size:13px;font-weight:bold;color:${hpC}">HP ${hpP}%${shP>0?' | 실드 '+shP+'%':''}</span>
        </div>

        <!-- ── 본문: 정비소=2열(정보+서브탭) / 거래소=4열 ── -->
        ${G._garageMode?(()=>{
          // ── 정비소 모드: 좌=함선정보, 우=서브탭 내용 ──────────────────
          const _cargoData=(()=>{
            const slots=Math.min(s.cargoSlots||4,80);
            let cargoOffset=0;
            for(let fi=0;fi<G.fleet.length;fi++){if(G.fleet[fi].id===s.id)break;cargoOffset+=G.fleet[fi].cargoSlots||4;}
            const cargoFlat=[];
            G.cargo.forEach(function(c){const imgSrcC='img/commodities/'+c.id+'.png';for(let q=0;q<(c.qty||1);q++){cargoFlat.push({nm:c.nm,ic:c.ic||'📦',img:imgSrcC,price:c.buyPrice,id:c.id});}});
            const myCargo=cargoFlat.slice(cargoOffset,cargoOffset+slots);
            // 화물 그리드: 슬롯 수에 따라 동적 행/셀 사이즈 조정 (80칸까지 화면에 들어가게)
            // 8칸 이하: 4행, 9~24칸: 6행, 25~48칸: 7행, 49~80칸: 8행
            const _cgRows=slots<=8?4:slots<=24?6:slots<=48?7:8;
            // 셀 사이즈도 크기에 따라 살짝 줄임 (전체 폭 ~360px 이내 유지)
            const _cgCell=slots<=24?40:slots<=48?36:32;
            let grid='<div style="display:grid;grid-template-rows:repeat('+_cgRows+','+_cgCell+'px);grid-auto-flow:column;grid-auto-columns:'+_cgCell+'px;gap:3px">';
            const _innerSz=_cgCell-4;
            for(let i=0;i<slots;i++){
              if(i<myCargo.length){const ci=myCargo[i];grid+='<div style="width:'+_cgCell+'px;height:'+_cgCell+'px;border-radius:4px;background:rgba(0,243,255,.15);border:1px solid rgba(0,243,255,.4);display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative" title="'+ci.nm+'\n구매가: ₡'+ci.price.toLocaleString()+'"><img src="'+ci.img+'" style="width:'+_innerSz+'px;height:'+_innerSz+'px;object-fit:cover;border-radius:2px" onerror="this.style.display=\'none\';this.nextSibling.style.display=\'flex\'"><span style="font-size:'+(_cgCell>=36?16:13)+'px;display:none;width:100%;height:100%;align-items:center;justify-content:center">'+ci.ic+'</span></div>';}
              else{const isMax=(slots>=80);grid+='<div '+(isMax?'':'onclick="upgradeCargoSlot('+idx+')"')+' style="width:'+_cgCell+'px;height:'+_cgCell+'px;border-radius:4px;background:rgba(255,255,255,.03);border:1px dashed rgba(255,255,255,.12);'+(isMax?'':'cursor:pointer;')+'" title="'+(isMax?'화물칸 최대 (80칸)':'빈 화물칸 — 클릭하여 확장')+'"></div>';}
            }
            grid+='</div>';
            let btn;
            if(slots<80){const cp=getCargoUpgradePrice(s);btn=`<button class="btn btn-sm" style="border-color:var(--cyan);color:var(--cyan);font-size:11px;padding:3px 8px" onclick="upgradeCargoSlot(${idx})" ${G.credits>=cp?'':'disabled'}>📦 창고+2칸 ₡${cp.toLocaleString()} (${slots}/80)</button>`;}
            else{btn='<span style="font-size:11px;color:var(--cyan)">✅ 창고 최대 (80칸)</span>';}
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
            ? `<span style="font-size:11px;color:var(--cyan)">✅ 최대 (${_maxTotalRows}행)</span>`
            : `<button class="btn btn-sm" style="border-color:var(--cyan);color:var(--cyan);font-size:11px;padding:3px 8px" onclick="upgradePartsRow(${idx})" ${G.credits>=_upgPrice?'':'disabled'}>🔧 행+1 ₡${_upgPrice.toLocaleString()} (${PART_ROWS}/${_maxTotalRows})</button>`;
          // 컬럼 공통: flex 세로 배치 + spacer 로 액션 버튼을 하단에 고정 → 3컬럼 액션 버튼 높이 정렬
          // 파츠↔함선실 간격 20% 축소 (10→6, 양쪽 합산 20→12)
          // 파츠 그리드 실제 너비 계산 (CELL_SZ=51 + gap=3) → 신화(8열)/대형(6열) 함선이 함선실과 겹치지 않게 min-width 보장
          const _CELL_SZ=51, _CELL_GAP=3;
          const _partsGridW=PART_COLS*_CELL_SZ+(PART_COLS-1)*_CELL_GAP+12; // 12=padding 여유
          const _partsCol=`<div style="flex:1;min-width:${_partsGridW}px;padding-right:6px;border-right:1px solid rgba(255,255,255,.07);display:flex;flex-direction:column;overflow:hidden">
            <div style="font-size:10px;color:var(--dim);margin-bottom:6px;flex-shrink:0">⚙️ <b style="color:var(--gold)">파츠 장비</b> ${(s.parts||[]).length}개 · ${PART_ROWS}×${PART_COLS} 슬롯 <span style="opacity:.45;font-size:9px">클릭=탈착</span></div>
            <div style="flex-shrink:0;overflow-x:auto;max-width:100%">${partsGridHtml}</div>
            <div style="flex:1;min-height:8px"></div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;flex-shrink:0">
              <button class="btn btn-sm" style="border-color:var(--gold);color:var(--gold);font-size:11px;padding:3px 8px" onclick="pickPartForSlot(${idx})">+ 파츠 장착</button>
              ${(s.parts||[]).length>0?`<button class="btn btn-sm" style="border-color:#f88;color:#f88;font-size:11px;padding:3px 8px;white-space:nowrap" onclick="unassignAllParts(${idx})" title="장착된 모든 파츠를 인벤토리로 회수">⚙️ 전체 해제</button>`:''}
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
          const _crewCol=`<div style="flex:1;min-width:0;padding:0 3px 0 6px;display:flex;flex-direction:column">
            <div style="font-size:10px;color:var(--dim);margin-bottom:6px;flex-shrink:0;display:flex;align-items:center;gap:6px;flex-wrap:wrap">
              <span>👥 <b style="color:var(--green)">함선실(크루)</b> ${(s.crewIds||[]).length}/${maxCrew}명</span>
              ${_crewBonusInfo}
              <span style="opacity:.45;font-size:9px">클릭=하선</span>
            </div>
            <div style="display:grid;grid-template-columns:repeat(${crewCols},51px);grid-template-rows:repeat(${_crewRows},51px);gap:3px;flex-shrink:0">${crewGrid}</div>
            <div style="flex:1;min-height:8px"></div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;flex-shrink:0;justify-content:flex-start;align-self:flex-start;max-width:100%">
              <button class="btn btn-sm" style="border-color:var(--green);color:var(--green);font-size:11px;padding:3px 8px;white-space:nowrap" onclick="pickCrewForSlot(${idx})">+ 크루 배치</button>
              ${(s.crewIds||[]).length>0?`<button class="btn btn-sm" style="border-color:#f88;color:#f88;font-size:11px;padding:3px 8px;white-space:nowrap" onclick="unassignAllCrew(${idx})">👤 전원 하선</button>`:''}
            </div>
          </div>`;
          // 화물칸: margin-left 제거 (overlap 방지), padding-left 최소화
          // 버튼은 우측 정렬로 함선실 버튼과 충돌 회피
          const _cargoCol=`<div style="flex:1;min-width:0;padding-left:8px;margin-left:-10%;border-left:1px solid rgba(255,255,255,.07);display:flex;flex-direction:column">
            <div style="font-size:10px;color:var(--dim);margin-bottom:6px;flex-shrink:0">📦 <b style="color:var(--cyan)">화물칸</b> ${s.cargoSlots||4}/80칸 <span style="opacity:.45;font-size:9px">빈칸=확장</span></div>
            <div style="flex-shrink:0">${_cargoData.grid}</div>
            <div style="flex:1;min-height:8px"></div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;flex-shrink:0;justify-content:flex-end;align-self:flex-end">${_cargoData.btn}</div>
          </div>`;
          // 정비 서브탭일 때만 파츠+크루 표시 (화물칸은 별도 탭으로 분리하여 DOM 부하 절감)
          const _subRight=`<div style="display:flex;gap:0;flex:1;min-width:0;align-items:stretch">${_partsCol}${_crewCol}</div>`;
          return `<div style="display:flex;gap:0;min-height:160px">
            <div style="width:160px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;padding:10px 8px;border-right:1px solid var(--bdr);background:rgba(5,10,26,.6);gap:5px">
              <div style="width:130px;height:110px;display:flex;align-items:center;justify-content:center;border-radius:8px;background:rgba(0,243,255,.04);border:1px solid rgba(0,243,255,.12)">${imgOrEmoji(imgSrc,tierEmoji,108,108,'border-radius:6px;object-fit:contain',shipLoreKey(s))}</div>
              <span style="font-size:10px;color:${tierCol};font-weight:bold">${s.tier}급 LOY:${s.LOY||80}</span>
              <div style="width:100%;padding:0 2px">
                <div style="display:flex;align-items:center;gap:4px;margin-bottom:3px"><span style="font-size:9px;color:var(--dim);width:14px">HP</span><div class="bar-bg" style="flex:1;height:4px"><div class="bar-fi" style="width:${hpP}%;background:${hpC};height:4px"></div></div><span style="font-size:9px;color:var(--dim)">${hpP}%</span></div>
                ${s.maxSH>0?`<div style="display:flex;align-items:center;gap:4px"><span style="font-size:9px;color:var(--dim);width:14px">SH</span><div class="bar-bg" style="flex:1;height:4px"><div class="bar-fi" style="width:${shP}%;background:var(--blue);height:4px"></div></div><span style="font-size:9px;color:var(--dim)">${shP}%</span></div>`:''}
              </div>
              <div style="width:100%;display:grid;grid-template-columns:1fr 1fr;gap:2px 4px;padding:0 2px">
                <span style="font-size:10px;color:var(--red);white-space:nowrap">⚔ ${totalATT}</span>
                <span style="font-size:10px;color:var(--blue);white-space:nowrap">🛡 ${totalINT}</span>
                <span style="font-size:10px;color:var(--cyan);white-space:nowrap">⚙ ${totalTEC}</span>
                <span style="font-size:10px;color:var(--dim);white-space:nowrap">📦 ${s.cargoSlots||4}칸</span>
              </div>
            </div>
            <div style="flex:1;padding:10px 12px;overflow:visible">${_subRight}</div>
          </div>`;
        })():`<div style="display:flex;gap:0;min-height:180px;overflow:visible">
          <!-- Col 1: 함선 이미지 + 정보 -->
          <div style="width:165px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;padding:10px 8px;border-right:1px solid var(--bdr);background:rgba(5,10,26,.6);gap:5px" title="${(s.desc||'').replace(/"/g,'&quot;')}&#10;HP:${s.maxHP} SH:${s.maxSH}&#10;ATT:${s.ATT} SHD:${s.INT} ENG:${s.TEC}">
            <div style="width:140px;height:120px;display:flex;align-items:center;justify-content:center;border-radius:10px;background:rgba(0,243,255,.04);border:1px solid rgba(0,243,255,.12)">${imgOrEmoji(imgSrc,tierEmoji,120,120,'border-radius:8px;object-fit:contain',shipLoreKey(s))}</div>
            <span style="font-size:10px;color:${tierCol};font-weight:bold">${s.tier}급 ${(s.LOY||80)<=10?'⚠️':(s.LOY||80)>=100?'✨':''}LOY:${s.LOY||80}</span>
            <div style="width:100%;padding:0 2px">
              <div style="display:flex;align-items:center;gap:4px;margin-bottom:3px"><span style="font-size:9px;color:var(--dim);width:14px">HP</span><div class="bar-bg" style="flex:1;height:4px"><div class="bar-fi" style="width:${hpP}%;background:${hpC};height:4px"></div></div><span style="font-size:9px;color:var(--dim)">${hpP}%</span></div>
              ${s.maxSH>0?`<div style="display:flex;align-items:center;gap:4px"><span style="font-size:9px;color:var(--dim);width:14px">SH</span><div class="bar-bg" style="flex:1;height:4px"><div class="bar-fi" style="width:${shP}%;background:var(--blue);height:4px"></div></div><span style="font-size:9px;color:var(--dim)">${shP}%</span></div>`:''}
            </div>
            <div style="width:100%;display:grid;grid-template-columns:1fr 1fr;gap:3px 6px;padding:0 2px">
              <span style="font-size:10px;color:var(--red);white-space:nowrap">⚔ ATT ${totalATT}</span>
              <span style="font-size:10px;color:var(--blue);white-space:nowrap">🛡 SHD ${totalINT}</span>
              <span style="font-size:10px;color:var(--cyan);white-space:nowrap">⚙ ENG ${totalTEC}</span>
              <span style="font-size:10px;color:var(--gold);white-space:nowrap">🔰 DEF ${getShipStats(s).DEF||0}</span>
              <span style="font-size:10px;color:#f88;white-space:nowrap">❤ HP ${(s.maxHP+bonus.hp).toLocaleString()}</span>
              <span style="font-size:10px;color:var(--dim);white-space:nowrap">📦 ${s.cargoSlots||4}칸</span>
            </div>
          </div>
          <!-- Col 2: Parts 그리드 -->
          <div style="flex-shrink:0;padding:8px 10px;border-right:1px solid var(--bdr)">
            <div style="font-size:10px;color:var(--dim);margin-bottom:5px">⚙️ <b style="color:var(--gold)">파츠 장비</b> ${(s.parts||[]).length}개 <span style="opacity:.45;font-size:9px">클릭=탈착</span></div>
            ${partsGridHtml}
          </div>
          <!-- Col 3: Crew 그리드 -->
          <div style="flex-shrink:0;padding:8px 10px;border-right:1px solid var(--bdr)">
            <div style="font-size:10px;color:var(--dim);margin-bottom:5px">👥 <b style="color:var(--green)">크루 배치</b> ${(s.crewIds||[]).length}/${maxCrew}명 <span style="opacity:.45;font-size:9px">클릭=배치</span></div>
            <div style="display:grid;grid-template-columns:repeat(${crewCols},51px);gap:4px">${crewGrid}</div>
          </div>
          <!-- Col 4: Cargo 그리드 -->
          <div style="flex:1;padding:8px 10px;min-width:196px;">
            <div style="font-size:10px;color:var(--dim);margin-bottom:5px">📦 <b style="color:var(--cyan)">화물칸</b> ${s.cargoSlots||4}칸 / 최대80칸 <span style="opacity:.45;font-size:9px">빈칸=확장</span></div>
            ${(()=>{const slots=Math.min(s.cargoSlots||4,80);let cargoOffset=0;for(let fi=0;fi<G.fleet.length;fi++){if(G.fleet[fi].id===s.id)break;cargoOffset+=G.fleet[fi].cargoSlots||4;}const cargoFlat=[];G.cargo.forEach(function(c){const imgSrcC='img/commodities/'+c.id+'.png';for(let q=0;q<(c.qty||1);q++){cargoFlat.push({nm:c.nm,ic:c.ic||'📦',img:imgSrcC,price:c.buyPrice,id:c.id});}});const myCargo=cargoFlat.slice(cargoOffset,cargoOffset+slots);let h='<div style="display:grid;grid-template-rows:repeat(5,42px);grid-auto-flow:column;grid-auto-columns:42px;gap:3px;">';for(let i=0;i<slots;i++){if(i<myCargo.length){const ci=myCargo[i];h+='<div style="width:42px;height:42px;border-radius:4px;background:rgba(0,243,255,.15);border:1px solid rgba(0,243,255,.4);display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative" title="'+ci.nm+'\n구매가: ₡'+ci.price.toLocaleString()+'"><img src="'+ci.img+'" style="width:38px;height:38px;object-fit:cover;border-radius:2px" onerror="this.style.display=\'none\';this.nextSibling.style.display=\'flex\'"><span style="font-size:18px;display:none;width:100%;height:100%;align-items:center;justify-content:center">'+ci.ic+'</span></div>';}else{const isMax=(slots>=80);h+='<div '+(isMax?'':'onclick="upgradeCargoSlot('+idx+')"')+' style="width:42px;height:42px;border-radius:4px;background:rgba(255,255,255,.03);border:1px dashed rgba(255,255,255,.12);'+(isMax?'':'cursor:pointer;')+'" title="'+(isMax?'화물칸 최대 (80칸)':'빈 화물칸 — 클릭하여 확장')+'"></div>';}}h+='</div>';return h;})()}
          </div>
        </div>`}

        <!-- ── 하단 액션 버튼 바 ── -->
        <div style="border-top:1px solid var(--bdr);padding:10px 14px;display:flex;flex-direction:column;gap:8px;background:rgba(5,10,26,.4)">

          <!-- 수리 버튼 -->
          <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
            <span style="font-size:11px;color:var(--dim);min-width:32px">수리:</span>
            ${rc>0?`<button class="btn btn-sm btn-green" style="font-size:11px;padding:3px 8px" onclick="repairShip(${idx},'hp')" ${G.credits>=rc?'':'disabled title="크레딧 부족"'}>🔧 HP ₡${rc.toLocaleString()}</button>`:'<span style="font-size:11px;color:var(--green)">✅HP최대</span>'}
            ${sc>0?`<button class="btn btn-sm" style="border-color:var(--blue);color:var(--blue);font-size:11px;padding:3px 8px" onclick="repairShip(${idx},'sh')" ${G.credits>=sc?'':'disabled title="크레딧 부족"'}>🛡️실드 ₡${sc.toLocaleString()}</button>`:''}
            ${(rc+sc)>0?`<button class="btn btn-sm btn-gold" style="font-size:11px;padding:3px 8px" onclick="repairShipFull(${idx})" ${G.credits>=(rc+sc)?'':'disabled title="크레딧 부족"'}>⚡완전수리 ₡${(rc+sc).toLocaleString()}</button>`:''}
          </div>

          <!-- 함선 관리 버튼 -->
          <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
            ${(()=>{if((s.cargoSlots||5)>=80)return'<span style="font-size:11px;color:var(--cyan)">✅창고최대(80칸)</span>';const cp=getCargoUpgradePrice(s);return`<button class="btn btn-sm" style="border-color:var(--cyan);color:var(--cyan);font-size:11px;padding:3px 8px" onclick="upgradeCargoSlot(${idx})" ${G.credits>=cp?'':'disabled'}>📦 창고+2칸 ₡${cp.toLocaleString()} (${s.cargoSlots||5}/80)</button>`;})()}
            <span style="color:var(--bdr);margin:0 2px">|</span>
            ${!isFlagship?`<button class="btn btn-sm btn-gold" style="font-size:11px;padding:3px 8px" onclick="setFlagship(${idx})">⭐ 기함 설정</button>`:'<span style="font-size:11px;color:var(--cyan)">⭐ 현재 기함</span>'}
            <button class="btn btn-sm" style="font-size:11px;padding:3px 8px;border-color:var(--cyan);color:var(--cyan)" onclick="renameShip(${idx})">✏️ 이름 변경</button>
            ${G.fleet.length>1?`<button class="btn btn-sm btn-red" style="font-size:11px;padding:3px 8px" onclick="confirmSellShip(${idx})">🪙 판매</button>`:'<span style="font-size:11px;color:var(--dim)">최소 1척</span>'}
          </div>

        </div>
      </div>`;
    }).join('');

    // ── 📦 임시창 (활성 편대 10척 초과 시 보관된 함선) ──────────────
    if(G._garageMode&&(G.reserveFleet||[]).length>0){
      const _reserveCards=G.reserveFleet.map((rs,ri)=>{
        const fc=rs.tier==='신화'?'#cc66ff':rs.tier==='전설기함'?'#d4af37':rs.tier==='대형'?'#d4af37':rs.tier==='중형'?'#00f3ff':'#88ccff';
        const tierIc={신화:'✦',전설기함:'⚑',대형:'🌟',중형:'🚀',소형:'🛸'}[rs.tier]||'🛸';
        const imgS=shipImgSrc(rs);
        return `<div style="background:var(--card);border:1px dashed ${fc};border-radius:8px;padding:10px;display:flex;gap:12px;align-items:center;margin-bottom:8px">
          <div style="width:80px;height:80px;flex-shrink:0;background:rgba(0,0,0,.4);border-radius:6px;display:flex;align-items:center;justify-content:center;overflow:hidden">${imgOrEmoji(imgS,tierIc,76,76,'border-radius:5px;object-fit:contain',shipLoreKey(rs))}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:14px;font-weight:bold;color:${fc}">${tierIc} ${rs.nm} <span style="font-size:11px;color:var(--dim);font-weight:normal">[${rs.tier}]</span></div>
            <div style="font-size:11px;color:var(--dim);margin-top:2px">HP ${(rs.maxHP||0).toLocaleString()} · SH ${(rs.maxSH||0).toLocaleString()} · ATT ${rs.ATT||rs.atk||0}</div>
            ${rs.qualityLabel?`<div style="font-size:11px;color:${fc};margin-top:2px">${rs.qualityLabel} (×${(rs.quality||1).toFixed(2)})</div>`:''}
          </div>
          <div style="display:flex;flex-direction:column;gap:4px">
            ${G.fleet.length<16?`<button class="btn btn-sm" style="font-size:10px;padding:3px 8px;border-color:var(--green);color:var(--green);background:rgba(46,204,113,.12);font-weight:bold" onclick="promoteReserveShip(${ri})" title="선발 편대에 빈 자리 있음 → 즉시 승급">📈 선발로 올리기 (선발 ${G.fleet.length}/16)</button>`:'<span style="font-size:10px;color:var(--dim);text-align:center;padding:2px">선발 16척 가득</span>'}
            <select id="resvSwap_${ri}" style="background:rgba(0,0,0,.5);color:var(--txt);border:1px solid var(--bdr);border-radius:4px;padding:3px 6px;font-size:11px;font-family:inherit">
              <option value="">교체할 함선 선택...</option>
              ${G.fleet.map((af,ai)=>`<option value="${ai}">${ai===0?'⭐ ':''}[${af.tier}] ${af.nm}</option>`).join('')}
            </select>
            <button class="btn btn-sm btn-gold" style="font-size:10px;padding:3px 8px" onclick="swapReserveShip(${ri})">🔄 선발과 교체</button>
            <button class="btn btn-sm btn-gold" style="font-size:10px;padding:3px 8px" onclick="discardReserveShip(${ri})" title="정비소에 매각 — 정가 80% 환급 + 파츠/크루 회수">💰 매각</button>
          </div>
        </div>`;
      }).join('');
      content+=`<div style="margin-top:18px;padding-top:14px;border-top:2px dashed rgba(255,255,255,.15)">
        <div style="font-size:14px;font-weight:bold;color:var(--cyan);margin-bottom:4px">📦 임시 보관함 (${G.reserveFleet.length}척)</div>
        <div style="font-size:11px;color:var(--dim);margin-bottom:10px">활성 편대 10척 초과 시 자동 보관. 선발 함선과 교체 가능</div>
        ${_reserveCards}
      </div>`;
    }

  // ── 함선 구매 ──────────────────────────────────────────────────────
  }else if(_shipTab==='buy'){
    const fleetFull=G.fleet.length>=16;
    // 좌측: 나의 함선 카드 리스트
    const _tierColMy={'신화':'var(--purple)','전설기함':'#d4af37','대형':'var(--gold)','중형':'var(--blue)','소형':'var(--dim)'};
    const myFleetCards=G.fleet.map((s,i)=>{
      const sp=getShipSellPrice(s);
      const tc=_tierColMy[s.tier]||'var(--dim)';
      const _stC=getShipStats(s);
      const _eMxH=Math.max(1,_stC.HP||s.maxHP),_eMxS=Math.max(1,_stC.maxSH||s.maxSH);
      const hpP=Math.max(0,Math.min(100,Math.round(s.hp/_eMxH*100)));
      const shP=(_stC.maxSH||s.maxSH)>0?Math.max(0,Math.min(100,Math.round(s.sh/_eMxS*100))):0;
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
            '<span style="font-size:12px;font-weight:bold;color:'+(isFlagship?'var(--cyan)':tc)+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="'+s.nm+'">'+(isFlagship?'⭐ ':'')+s.nm+'</span>'+
            '<span style="font-size:9px;color:'+tc+';background:rgba(0,0,0,.6);border:1px solid '+tc+';border-radius:3px;padding:1px 4px;flex-shrink:0">'+s.tier+'</span>'+
          '</div>'+
          // 상태
          '<div style="font-size:10px;color:var(--green)">HP '+hpP+'%'+(shP>0?' · 실드 '+shP+'%':'')+'</div>'+
          // 스탯 (HP, SH, ATT, INT, TEC, DEF) — 거래소와 동일 grid 2열
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1px 4px;font-size:10px">'+
            '<span style="color:#f88">❤ '+st.HP.toLocaleString()+'</span>'+
            '<span style="color:#8af">🛡 '+(st.maxSH||0).toLocaleString()+'</span>'+
            '<span style="color:#fa8">⚔ '+(st.ATT||0)+'</span>'+
            '<span style="color:#af8">🔮 '+(st.INT||0)+'</span>'+
            '<span style="color:#8ff">⚙ '+(st.TEC||0)+'</span>'+
            '<span style="color:var(--gold)">🔰 '+(st.DEF||0)+'</span>'+
          '</div>'+
          '<div style="font-size:10px;color:var(--dim)">📦 '+(s.cargoSlots||4)+'칸 · 크루 '+(s.crewIds||[]).length+'/'+getMaxCrew(s)+'</div>'+
          // 가격 + 버튼
          '<div style="margin-top:auto;border-top:1px solid rgba(255,255,255,.07);padding-top:5px;display:flex;align-items:center;justify-content:space-between;gap:4px">'+
            '<div>'+
              '<div style="color:var(--dim);font-size:9px">매각가</div>'+
              '<div style="color:var(--gold);font-size:12px;font-weight:bold">₡'+sp.total.toLocaleString()+'</div>'+
            '</div>'+
            '<button class="btn btn-sm btn-red" style="padding:3px 10px;font-size:11px;'+(canSell?'':'opacity:.4')+'" onclick="confirmSellShip('+i+')" '+(canSell?'':'disabled')+'>판매</button>'+
          '</div>'+
        '</div>'+
        // ── 오른쪽: 이미지 ──
        '<div style="flex-shrink:0;display:flex;align-items:center;justify-content:center">'+
          imgOrEmoji(shipImgSrc(s),TIER_EMOJI[s.tier]||'🛸',110,110,'border-radius:8px;background:rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.08);object-fit:contain',shipLoreKey(s))+
        '</div>'+
      '</div>';
    }).join('');
    const myFleetHTML=`<div style="background:rgba(0,243,255,.04);border:1px solid rgba(0,243,255,.2);border-radius:8px;padding:10px 12px;height:100%;display:flex;flex-direction:column;min-height:0">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-shrink:0">
        <div style="font-size:13px;font-weight:bold;color:var(--cyan)">🛸 나의 함선 (${G.fleet.length}/16)</div>
        <div style="font-size:11px;color:var(--dim)">매각 = 즉시 판매</div>
      </div>
      <div data-scroll-id="ship-fleet" style="flex:1;overflow-y:auto;min-height:0;scrollbar-width:thin;scrollbar-color:rgba(0,243,255,.2) transparent">
        ${G.fleet.length>0
          ? `<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px">${myFleetCards}</div>`
          : '<div style="color:var(--dim);font-size:12px;text-align:center;padding:14px">보유 함선이 없습니다</div>'}
      </div>
    </div>`;
    const voidHintBuy=!isVoidPlanet?`<div style="background:rgba(139,0,255,.07);border:1px solid rgba(139,0,255,.3);border-radius:8px;padding:10px 14px;margin-bottom:12px;font-size:12px;color:var(--dim)">💡 구매 조건: <span style="color:var(--cyan)">중형 전투력 200+</span> / <span style="color:var(--gold)">대형 전투력 400+</span> / <span style="color:var(--purple)">전설·신화 전투력 600+</span></div>`:'';
    const _mythicHint=plvForShip>=600?'':`<div style="background:rgba(204,102,255,.07);border:1px solid rgba(204,102,255,.3);border-radius:8px;padding:10px 14px;margin-bottom:12px;font-size:12px;color:var(--dim)">🔒 <span style="color:var(--purple);font-weight:bold">신화·전설급 함선</span>은 <span style="color:var(--cyan)">전투력 600 이상</span> 구매 가능 (현재 ${plvForShip})</div>`;
    if(isHostile){
      content=`<div style="background:var(--card);border:1px dashed var(--red);border-radius:8px;padding:20px;text-align:center">
        <div style="font-size:38px;margin-bottom:8px">⚠️</div>
        <div style="color:var(--red);font-size:16px">치크스 적대구역 — 함선 구매 불가</div>
        <div style="color:var(--dim);font-size:13px;margin-top:6px">안전 행성으로 이동하세요</div>
      </div>`;
    } else if(fleetFull){
      content=`<div style="background:rgba(255,200,0,.06);border:2px solid rgba(255,200,0,.4);border-radius:10px;padding:20px;text-align:center">
        <div style="font-size:48px;margin-bottom:10px">🛸</div>
        <div style="color:var(--yellow);font-size:17px;font-weight:bold;margin-bottom:6px">편대 슬롯 만석 (16/16)</div>
        <div style="color:var(--dim);font-size:14px;line-height:1.8">현재 16척으로 편대가 가득 찼습니다.<br>기존 함선을 판매하면 슬롯이 확보됩니다.</div>
        <button class="btn btn-sm btn-gold" style="margin-top:12px" onclick="hubTab('garage')">🔧 함선 정비소 열기</button>
      </div>`;
    } else if(availShips.length===0){
      content=`<div style="color:var(--dim);font-size:14px;text-align:center;padding:20px">현재 행성에 입고된 함선이 없습니다.</div>`;
    } else {
      const BUY_TIER_ORDER={'신화':0,'전설기함':1,'대형':2,'중형':3,'소형':4};
      const sortedAvailShips=[...availShips].sort((a,b)=>(BUY_TIER_ORDER[a.tier]??5)-(BUY_TIER_ORDER[b.tier]??5)||(a.price-b.price));
      content=voidHintBuy+_mythicHint+(function(){
        // 거래소 함선 (우측 컬럼용) — 2열 그리드
        var _curPlv2=calcPlayerLevel();
        var allSorted=sortedAvailShips;
        if(!allSorted.length)return'<div style="color:var(--dim);font-size:14px;padding:20px;text-align:center">입고된 함선 없음</div>';

        var tierLabel={'소형':'소형','중형':'중형','대형':'대형','전설기함':'전설기함','신화':'신화'};
        var tierCol={'신화':'var(--purple)','전설기함':'#d4af37','대형':'var(--gold)','중형':'var(--blue)','소형':'var(--dim)'};

        return '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:14px">'+
          allSorted.map(function(s){
            var tc=tierCol[s.tier]||'var(--dim)';
            var actualPrice=iSunsin?Math.floor(s.price*0.85):s.price;
            var qty=stock['ship_'+s.id]||0,canBuy=G.credits>=actualPrice&&qty>0;
            var maxCrew=getMaxCrew(s);
            var tierReqLv=s.tier==='중형'?200:s.tier==='대형'?400:(s.tier==='전설기함'||s.tier==='신화')?600:0;
            var lvLock=tierReqLv>0&&_curPlv2<tierReqLv;
            // 요구 전투력 도달 20 이전이면 이미지·정보 어둡게 처리
            var farLocked=tierReqLv>0&&_curPlv2<tierReqLv-20;
            var _lockMsg2=s.tier==='중형'?'전투력200':s.tier==='대형'?'전투력400':'전투력600';
            var canBuyFinal=canBuy&&!lvLock;
            var cardBdr=s.tier==='신화'?'rgba(204,102,255,.5)':s.tier==='전설기함'?'rgba(212,175,55,.5)':s.tier==='대형'?'rgba(212,175,55,.3)':'var(--bdr)';
            var cardBg=s.tier==='신화'?'rgba(139,0,255,.05)':s.tier==='전설기함'?'rgba(212,175,55,.04)':'var(--card)';
            var cargoCnt=s.tier==='소형'?4:s.tier==='중형'?8:s.tier==='대형'?12:s.tier==='전설기함'?16:20;
            return '<div style="background:'+cardBg+';border:1px solid '+cardBdr+';border-radius:10px;padding:10px;display:flex;flex-direction:row;gap:8px;align-items:stretch'+(farLocked?';filter:brightness(.35) grayscale(.6);opacity:.7':'')+'">'+
              // ── 왼쪽: 정보 ──
              '<div style="flex:1;display:flex;flex-direction:column;gap:5px;min-width:0">'+
                // 이름 + 티어 배지
                '<div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap">'+
                  '<span style="font-size:12px;font-weight:bold;color:'+tc+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="'+s.nm+'">'+s.nm+'</span>'+
                  '<span style="font-size:9px;color:'+tc+';background:rgba(0,0,0,.6);border:1px solid '+tc+';border-radius:3px;padding:1px 4px;flex-shrink:0">'+s.tier+'</span>'+
                '</div>'+
                // 재고 상태
                (lvLock
                  ?'<div style="font-size:10px;color:var(--purple);background:rgba(139,0,255,.1);border:1px solid rgba(139,0,255,.3);border-radius:4px;padding:2px 5px">🔒 '+_lockMsg2+'</div>'
                  :(qty>0
                    ?'<div style="font-size:10px;color:var(--cyan)">재고 '+qty+'개</div>'
                    :'<div style="font-size:10px;color:var(--red)">재고없음</div>'))+
                // 스탯
                (lvLock?'':
                  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1px 4px;font-size:10px">'+
                    '<span style="color:#f88">❤ '+s.maxHP.toLocaleString()+'</span>'+
                    '<span style="color:#8af">🛡 '+s.maxSH.toLocaleString()+'</span>'+
                    '<span style="color:#fa8">⚔ '+s.ATT+'</span>'+
                    '<span style="color:#af8">🔮 '+s.INT+'</span>'+
                    '<span style="color:#8ff">⚙ '+s.TEC+'</span>'+
                    '<span style="color:var(--dim)">📦 '+cargoCnt+'칸</span>'+
                  '</div>'+
                  '<div style="font-size:10px;color:var(--dim)">크루 최대 <b style="color:var(--green)">'+maxCrew+'</b>명</div>')+
                // 가격 + 버튼
                '<div style="margin-top:auto;border-top:1px solid rgba(255,255,255,.07);padding-top:5px;display:flex;align-items:center;justify-content:space-between;gap:4px">'+
                  '<div>'+
                    (iSunsin?'<div style="color:var(--dim);font-size:9px;text-decoration:line-through">₡'+s.price.toLocaleString()+'</div>':'')+
                    '<div style="color:var(--gold);font-size:12px;font-weight:bold">₡'+actualPrice.toLocaleString()+'</div>'+
                  '</div>'+
                  (lvLock
                    ?'<span style="font-size:10px;color:var(--purple)">🔒</span>'
                    :'<button class="btn btn-gold" style="padding:3px 8px;font-size:11px;'+(canBuyFinal?'':'opacity:.5')+'" onclick="buyShip(\''+s.id+'\')" '+(canBuyFinal?'':'disabled')+'>'+(qty===0?'없음':G.credits<actualPrice?'₡부족':'구매')+'</button>')+
                '</div>'+
              '</div>'+
              // ── 오른쪽: 이미지 ──
              '<div style="flex-shrink:0;display:flex;align-items:center;justify-content:center">'+
                imgOrEmoji(shipImgSrc(s),TIER_EMOJI[s.tier]||'🛸',110,110,'border-radius:8px;background:rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.08);object-fit:contain',shipLoreKey(s))+
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
          <div style="font-size:13px;font-weight:bold;color:var(--gold);margin-bottom:8px">💰 거래소 함선</div>
          ${content}
        </div>
      </div>`;
    }

  // ── 파츠 구매 ─────────────────────────────────────────────────────
  }else{
    if(isHostile){
      content=`<div style="background:var(--card);border:1px dashed var(--red);border-radius:8px;padding:20px;text-align:center"><div style="color:var(--red)">적대구역 — 구매 불가</div></div>`;
    } else if(availParts.length===0){
      content=`<div style="color:var(--dim);font-size:14px;text-align:center;padding:20px">파츠 재고 없음</div>`;
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
        <span style="font-size:11px;color:var(--dim);font-weight:bold">🔃 정렬:</span>
        ${_sortBtn('tier','🛕 등급')}
        ${_sortBtn('priceAsc','💰 가격 ↑')}
        ${_sortBtn('priceDesc','💰 가격 ↓')}
        ${_sortBtn('nm','🔤 이름')}
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
                <div style="font-size:13px;font-weight:bold;color:${nmCol}">${p.nm}</div>
                <div style="display:flex;gap:4px">
                  <span style="font-size:10px;color:var(--red);border:1px solid var(--red);border-radius:3px;padding:0 4px">T${p.tier}</span>
                  <span style="color:var(--dim);font-size:10px">재고:${qty}</span>
                </div>
                <div style="font-size:11px;color:var(--red);font-weight:bold">🚀 ATT +${p.ATT}</div>
                <div style="font-size:10px;color:var(--dim);flex:1">${p.desc.slice(0,55)}${p.desc.length>55?'…':''}</div>
                <div style="border-top:1px solid rgba(255,255,255,.06);padding-top:6px;display:flex;align-items:center">
                  ${iSunsin?`<span style="color:var(--dim);font-size:10px;text-decoration:line-through">₡${p.price.toLocaleString()}</span>`:''}
                  <span style="color:var(--gold);font-size:14px;font-weight:bold">₡${fp.toLocaleString()}</span>
                  <button class="btn btn-gold" style="padding:4px 10px;font-size:11px;margin-left:auto;${!canBuy?'opacity:.5':''}" onclick="buyPart('${p.id}')" ${canBuy?'':'disabled'}>${qty===0?'재고없음':G.credits<fp?'자금부족':'구매'}</button>
                </div>
              </div>
              <div style="flex-shrink:0;display:flex;align-items:center;justify-content:center">
                ${imgOrEmoji('img/parts/'+p.id+'.png','🚀',120,120,'border-radius:8px;background:rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.08)','part_'+p.id)}
              </div>
            </div>`;
          }).join('');
          return `<div style="margin-bottom:14px"><div style="font-size:13px;color:var(--red);font-weight:bold;margin-bottom:8px;letter-spacing:1px">🚀 미사일 (${_mi.length}종)</div><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px">${_mm}</div></div>`;
        }
        const catParts=_applyPartSort(PARTS.filter(p=>p.cat===cat&&(cat!=='weapon'||(p.wtype==='laser'||!p.wtype))&&(stock['part_'+p.id]||0)>0&&p.rarity!=='legend'&&p.rarity!=='mythic'&&p.rarity!=='set'));
        if(catParts.length===0)return'';
        const catNm={weapon:'⚔️ 레이져',shield:'🛡️ 실드',armor:'🛡 장갑',engine:'⚡ 엔진'}[cat];
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
            const rarBadge=p.rarity==='mythic'?'<span style="font-size:10px;color:#ff88ff;border:1px solid #ff88ff;border-radius:3px;padding:0 4px">✦신화</span>':p.rarity==='set'?'<span style="font-size:10px;color:#c080ff;border:1px solid #c080ff;border-radius:3px;padding:0 4px">◈세트</span>':'';
            const statLine=cat==='weapon'?`⚔ ATT +${p.ATT}${p.wtype?' ['+p.wtype+']':''}`:cat==='shield'?`🛡 SHD +${p.INT} SH+${p.maxSH}`:cat==='armor'?`❤ HP +${p.HP}${p.DEF?' DEF+'+p.DEF:''}`:cat==='engine'?`⚙ ENG +${p.TEC}`:'';
            return `<div style="background:var(--card);border:1px solid ${bdrCol};border-radius:10px;padding:10px;display:flex;flex-direction:row;gap:8px;align-items:stretch">
              <div style="flex:1;display:flex;flex-direction:column;gap:5px;min-width:0">
                <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap">
                  <span style="font-size:13px;font-weight:bold;color:${nmCol};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%">${p.nm}</span>${rarBadge}
                </div>
                <div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap">
                  <span style="font-size:10px;color:${catCol};border:1px solid ${catCol};border-radius:3px;padding:0 4px">T${p.tier}</span>
                  <span style="color:var(--dim);font-size:10px">재고:${qty}</span>
                </div>
                <div style="font-size:11px;color:${catCol};font-weight:bold">${statLine}</div>
                <div style="font-size:10px;color:var(--dim);line-height:1.4;flex:1">${p.desc.slice(0,60)}${p.desc.length>60?'…':''}</div>
                <div style="padding-top:6px;border-top:1px solid rgba(255,255,255,.06);display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                  ${iSunsin?`<span style="color:var(--dim);font-size:10px;text-decoration:line-through">₡${p.price.toLocaleString()}</span>`:''}
                  <span style="color:var(--gold);font-size:14px;font-weight:bold">₡${partFinalPrice.toLocaleString()}</span>
                  <button class="btn btn-gold" style="padding:4px 10px;font-size:11px;margin-left:auto;${!canBuy?'opacity:.5':''}" onclick="buyPart('${p.id}')" ${canBuy?'':'disabled'}>${qty===0?'재고없음':G.credits<partFinalPrice?'자금부족':'구매'}</button>
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
            <div style="display:flex;align-items:center;gap:6px">
              <span style="font-size:22px">${p.ic||'📦'}</span>
              <div style="flex:1;font-size:12px;font-weight:bold;color:${nmCol}">${p.nm}</div>
            </div>
            <div style="display:flex;gap:4px">
              <span style="font-size:10px;color:var(--cyan);border:1px solid var(--cyan);border-radius:3px;padding:0 4px">T${p.tier}</span>
              <span style="font-size:10px;color:var(--green);font-weight:bold">📦 +${p.cargoBonus}칸</span>
              <span style="color:var(--dim);font-size:10px">재고:${qty}</span>
            </div>
            <div style="font-size:10px;color:var(--dim)">${p.desc}</div>
            <div style="border-top:1px solid rgba(255,255,255,.06);padding-top:6px;display:flex;align-items:center">
              <span style="color:var(--gold);font-size:13px;font-weight:bold">₡${fp.toLocaleString()}</span>
              <button class="btn btn-gold" style="padding:4px 10px;font-size:11px;margin-left:auto;${!canBuy?'opacity:.5':''}" onclick="buyCargoExtPart('${p.id}')" ${canBuy?'':'disabled'}>${qty===0?'재고없음':G.credits<fp?'자금부족':'구매(즉시적용)'}</button>
            </div>
          </div>`;
        }).join('');
        content+=`<div style="margin-bottom:14px;border-top:1px solid var(--bdr);padding-top:12px">
          <div style="font-size:13px;color:var(--cyan);font-weight:bold;margin-bottom:8px">📦 특수 창고 확장 (기함 즉시 적용)</div>
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px">${mSC}</div>
        </div>`;
      }
    }
  }

  // 보유 파츠 매각 섹션 (parts 탭에만 표시)
  let invPartsSection='';
  if(_shipTab==='parts'&&!G._garageMode){
    const hasMarcoInv=G.heroes&&G.heroes.includes('H08');
    let invParts=G.inventory.filter(i=>i.qty>0&&PARTS.find(p=>p.id===i.id));
    // 보유 파츠 정렬 (사용자 선택)
    const _rarPri={mythic:0,set:1,legend:2,L:2,hero:3,H:3,R:4,N:5};
    invParts=[...invParts].sort((a,b)=>{
      const pa=PARTS.find(x=>x.id===a.id)||{},pb=PARTS.find(x=>x.id===b.id)||{};
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
      const rarityLabel=p2=>{if(p2.rarity==='mythic')return'<span style="color:#ff88ff;font-size:11px;border:1px solid #ff88ff;border-radius:3px;padding:1px 4px;margin-left:4px">신화</span>';if(p2.rarity==='set')return'<span style="color:var(--gold);font-size:11px;border:1px solid var(--gold);border-radius:3px;padding:1px 4px;margin-left:4px">세트</span>';return'';};
      const rows=invParts.map(i=>{
        const p2=PARTS.find(x=>x.id===i.id);if(!p2)return'';
        const marcoM=hasMarcoInv?1.10:1.0;
        const baseP=p2.price>0?p2.price:200000;
        const sv=Math.floor(Math.floor(baseP*0.5)*marcoM);
        const catEmoji={weapon:'⚔️',shield:'🛡️',armor:'🛡',engine:'⚡'}[p2.cat]||'⚙️';
        const catCol={weapon:'var(--red)',shield:'var(--blue)',armor:'var(--gold)',engine:'var(--cyan)'}[p2.cat]||'var(--dim)';
        const nmCol=p2.rarity==='mythic'?'#ff88ff':p2.rarity==='set'?'#c080ff':p2.tier>=15?'var(--gold)':p2.tier>=11?'#ffa040':p2.tier>=6?'var(--cyan)':'var(--txt)';
        const bdrCol=p2.rarity==='mythic'?'rgba(255,136,255,.5)':p2.rarity==='set'?'rgba(192,128,255,.5)':'var(--bdr)';
        const rarBadge=p2.rarity==='mythic'?'<span style="font-size:10px;color:#ff88ff;border:1px solid #ff88ff;border-radius:3px;padding:0 4px">✦신화</span>':p2.rarity==='set'?'<span style="font-size:10px;color:#c080ff;border:1px solid #c080ff;border-radius:3px;padding:0 4px">◈세트</span>':'';
        const statLine=p2.cat==='weapon'?`⚔ ATT +${p2.ATT}${p2.wtype?' ['+p2.wtype+']':''}`:p2.cat==='shield'?`🛡 SHD +${p2.INT} SH+${p2.maxSH}`:p2.cat==='armor'?`❤ HP +${p2.HP}${p2.DEF?' DEF+'+p2.DEF:''}`:p2.cat==='engine'?`⚙ ENG +${p2.TEC}`:'';
        const btnId='sell-inv-'+i.id;
        return `<div style="background:var(--card);border:1px solid ${bdrCol};border-radius:10px;padding:10px;display:flex;flex-direction:row;gap:8px;align-items:stretch">
          <div style="flex:1;display:flex;flex-direction:column;gap:5px;min-width:0">
            <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap">
              <span style="font-size:13px;font-weight:bold;color:${nmCol};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%">${p2.nm}</span>${rarBadge}
            </div>
            <div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap">
              <span style="font-size:10px;color:${catCol};border:1px solid ${catCol};border-radius:3px;padding:0 4px">T${p2.tier}</span>
              <span style="color:var(--dim);font-size:10px">보유: ×${i.qty}</span>
            </div>
            <div style="font-size:11px;color:${catCol};font-weight:bold">${statLine}</div>
            <div style="font-size:10px;color:var(--dim);line-height:1.4;flex:1">${p2.desc.slice(0,60)}${p2.desc.length>60?'…':''}</div>
            <div style="padding-top:6px;border-top:1px solid rgba(255,255,255,.06);display:flex;align-items:center;gap:6px;flex-wrap:wrap">
              <span style="color:var(--gold);font-size:14px;font-weight:bold">₡${sv.toLocaleString()}</span>
              <button class="btn btn-sm btn-gold" style="font-size:11px;padding:4px 10px;margin-left:auto" id="${btnId}" onclick="sellPartFromInventory('${i.id}')">매각</button>
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
        ${_invSortBtn('rarity','✦ 등급')}
        ${_invSortBtn('tier','🛕 티어')}
        ${_invSortBtn('priceAsc','💰 가격↑')}
        ${_invSortBtn('priceDesc','💰 가격↓')}
        ${_invSortBtn('nm','🔤 이름')}
      </div>`;
      invPartsSection=`<div style="background:rgba(0,243,255,.04);border:1px solid rgba(0,243,255,.2);border-radius:8px;padding:10px 12px;height:100%;display:flex;flex-direction:column;min-height:0">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;flex-shrink:0;flex-wrap:wrap">
          <span style="font-size:13px;font-weight:bold;color:var(--cyan)">⚙️ 나의 파츠 (매각)${marcoNote}</span>
          ${_bulkQty>0?`<button class="btn btn-sm btn-gold" style="font-size:11px;padding:3px 10px;margin-left:auto" onclick="sellAllPartsBulk()" title="장착되지 않은 일반/희귀/영웅 파츠 일괄 매각 (전설/신화/세트 제외)">🛒 일괄 매각 ${_bulkQty}개 +₡${_bulkTotal.toLocaleString()}</button>`:''}
        </div>
        ${_invSortBar}
        <div style="flex:1;overflow-y:auto;display:grid;grid-template-columns:repeat(2,1fr);gap:8px;align-content:start;scrollbar-width:thin;scrollbar-color:rgba(0,243,255,.2) transparent">${rows}</div>
      </div>`;
    } else {
      invPartsSection=`<div style="background:rgba(0,243,255,.04);border:1px solid rgba(0,243,255,.2);border-radius:8px;padding:10px 12px;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--dim);font-size:12px">⚙️ 보유 파츠가 없습니다</div>`;
    }
  }

  // 파츠 탭 (거래소 모드): 좌(나의 파츠) / 우(거래소 파츠) 2분할
  let mainHTML;
  if(_shipTab==='parts'&&!G._garageMode){
    mainHTML=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:start">
      <div>${invPartsSection||'<div style="background:rgba(0,243,255,.04);border:1px solid rgba(0,243,255,.2);border-radius:8px;padding:14px;color:var(--dim);font-size:12px;text-align:center">⚙️ 보유 파츠가 없습니다</div>'}</div>
      <div>
        <div style="font-size:13px;font-weight:bold;color:var(--gold);margin-bottom:8px">🛒 거래소 파츠</div>
        ${content}
      </div>
    </div>`;
  } else {
    mainHTML=content+(G._garageMode?'':invPartsSection);
  }
  body.innerHTML=`<div class="hub-scroll">
    ${G._garageMode?hubBanner('garage','🔧','함선 정비소',pd?.f):hubBanner('ship','🛸','함선 거래소',pd?.f)}
    <div class="hub-t">${G._garageMode?'🔧 함선 정비소':'🛸 함선 거래소'} — ${pd?.nm||''}</div>
    ${subNav}
    ${mainHTML}
  </div>`;
}
// 인벤토리의 일반/희귀/영웅 파츠 일괄 매각 (전설/신화/세트 제외, 함선 장착 파츠는 인벤토리에 없음 → 자동 제외)
function sellAllPartsBulk(){
  if(!G.inventory||G.inventory.length===0){notify('보유 파츠가 없습니다','warn');return;}
  const hasMarco=G.heroes&&G.heroes.includes('H08');
  const _mul=hasMarco?1.1:1;
  const sellable=G.inventory.filter(i=>{
    if(i.qty<=0)return false;
    const p=PARTS.find(x=>x.id===i.id);
    if(!p)return false;
    return !['legend','mythic','set','hero'].includes(p.rarity);
  });
  if(sellable.length===0){notify('매각 가능한 일반/희귀/영웅 파츠가 없습니다','warn');return;}
  const totalQty=sellable.reduce((s,i)=>s+i.qty,0);
  const totalCr=sellable.reduce((s,i)=>{const p=PARTS.find(x=>x.id===i.id);return s+Math.floor((p.price||0)*0.5*_mul)*i.qty;},0);
  if(!confirm(`⚙️ 파츠 ${totalQty}개를 일괄 매각합니다.\n예상 수익: ₡${totalCr.toLocaleString()}${hasMarco?' (🧭 마르코+10%)':''}\n(전설/신화/세트 제외 · 장착 파츠 제외)\n진행할까요?`))return;
  // 매각 실행
  sellable.forEach(i=>{
    const p=PARTS.find(x=>x.id===i.id);if(!p)return;
    const unit=Math.floor((p.price||0)*0.5*_mul);
    G.credits+=unit*i.qty;
  });
  // 인벤토리에서 제거
  G.inventory=G.inventory.filter(i=>{
    if(i.qty<=0)return false;
    const p=PARTS.find(x=>x.id===i.id);
    if(!p)return false;
    return ['legend','mythic','set','hero'].includes(p.rarity);
  });
  updateHUD();
  notify(`🛒 파츠 ${totalQty}개 일괄 매각 +₡${totalCr.toLocaleString()}`,'gold');
  baekgu(`잡파츠 정리 완료. ${totalCr.toLocaleString()} 크레딧 들어왔어.`);
  saveGame(true);
  rerenderShipOrGarage();
}

function sellPartFromInventory(partId){
  const p=PARTS.find(x=>x.id===partId);if(!p)return;
  const inv=G.inventory.find(i=>i.id===partId);
  if(!inv||inv.qty<=0){notify('보유 파츠 없음','err');return;}
  const marcoMult=(G&&G.heroes&&G.heroes.includes('H08'))?1.20:1.0;
  const baseVal=Math.floor(p.price*0.5);
  const sellVal=Math.floor(baseVal*marcoMult);
  const marcoNote=marcoMult>1?' (🧭+10%)':'';
  openModal('⚙️ 파츠 매각',
    `<div style="text-align:center;padding:10px">
      <div style="font-size:34px;margin-bottom:6px">${{weapon:'⚔️',shield:'🛡️',armor:'🛡',engine:'⚡'}[p.cat]||'⚙️'}</div>
      <div style="font-size:18px;font-weight:bold;margin-bottom:8px">${p.nm}</div>
      <div style="font-size:16px;color:var(--gold)">매각가: ₡${sellVal.toLocaleString()}${marcoNote}</div>
      <div style="font-size:12px;color:var(--dim);margin-top:4px">구매가의 50%${marcoMult>1?' × 1.1':''}</div>
    </div>`,
    [{txt:`₡${sellVal.toLocaleString()} 받고 매각`,fn:()=>{
      inv.qty--;if(inv.qty<=0)G.inventory.splice(G.inventory.indexOf(inv),1);
      G.credits+=sellVal;
      updateHUD();notify(`⚙️ ${p.nm} 매각 +₡${sellVal.toLocaleString()}`,'gold');
      closeModal();rerenderShipOrGarage();saveGame(true);
    },cls:'btn-gold'},{txt:'취소',fn:closeModal,cls:'btn-sm'}]
  );
}
function switchShipTab(tab){_shipTab=tab;rerenderTab(renderShipTab);}
// 선발 편대가 16척 미만이면 임시창 최상단 함선을 자동으로 선발로 승급
// 함선이 G.fleet에서 제거되는 모든 경로 (판매·폐기·교체·격침 등)에서 호출
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
    notify(`📈 임시창 → 선발 자동 승급 ${promoted}척 (선발 ${G.fleet.length}/${CAP})`,'ok');
  }
  return promoted;
}

// 함선 신규 획득 통합 처리: 선발 16척까지 채우고, 초과분은 임시창에 보관.
// 임시창이 8척을 넘으면 최하위 함선 매각 여부를 물어본다.
// 반환: {added:'fleet'|'reserve', overflowPrompted:bool}
function addShipToFleet(ship){
  if(!ship)return{added:null};
  if(!G.fleet)G.fleet=[];
  if(!G.reserveFleet)G.reserveFleet=[];
  const FLEET_CAP=16, RESERVE_CAP=8;
  let added;
  if(G.fleet.length<FLEET_CAP){
    G.fleet.push(ship);added='fleet';
  } else {
    G.reserveFleet.push(ship);added='reserve';
    notify(`📦 선발 ${FLEET_CAP}척 가득 → ${ship.nm} 임시창 보관 (${G.reserveFleet.length}/${RESERVE_CAP})`,'warn');
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
  const fromLabel=c.from==='reserve'?'임시창':'선발';
  openModal('📦 임시창 초과 — 최하위 함선 매각?',
    `<div style="text-align:center;padding:10px;font-size:13px;line-height:1.7">
      임시 보관함이 8척을 초과했습니다.<br>
      최하위 함선 <b style="color:var(--yellow)">${c.s.nm}</b> (${c.s.tier}, ${fromLabel})를<br>
      <b style="color:var(--gold)">₡${price.toLocaleString()}</b>에 매각할까요?
      <div style="font-size:11px;color:var(--dim);margin-top:8px">취소하면 임시창에 그대로 둡니다 (정비소에서 직접 관리 가능).</div>
    </div>`,
    [
      {txt:`💰 매각 (₡${price.toLocaleString()})`,cls:'btn-gold',fn:()=>{
        if(c.from==='reserve'){G.reserveFleet.splice(c.i,1);}
        else{G.fleet.splice(c.i,1);_promoteReserveIfRoom();}
        G.credits=(G.credits||0)+price;
        notify(`💰 ${c.s.nm} 매각 ₡${price.toLocaleString()}`,'gold');
        closeModal();saveGame(true);
        if(typeof rerenderShipOrGarage==='function')rerenderShipOrGarage();
      }},
      {txt:'✕ 취소',fn:closeModal}
    ]);
}

// 전투 승리 시 적함 나포 허용/거절 토글
// 거절 ON: 나포 대상 함선을 즉시 매각하여 크레딧 획득
function toggleDeclineCapture(){
  G.declineCapture=!G.declineCapture;
  notify(G.declineCapture?'🚫 나포 거절 ON — 나포 함선 즉시 매각하여 크레딧 획득':'🏴 나포 허용 — 정상 나포 시도','ok');
  saveGame(true);
  rerenderTab(renderGarageTab);
}

// 임시창 함선 ↔ 선발 편대 함선 교체
// 후보 함선 → 선발 편대로 즉시 승급 (선발 < 16척일 때)
function promoteReserveShip(reserveIdx){
  if(!G.reserveFleet||!G.reserveFleet[reserveIdx]){notify('임시함선 없음','err');return;}
  if(G.fleet.length>=16){notify('선발 편대 가득 (16척). 교체 또는 판매 후 시도하세요','err');return;}
  const ship=G.reserveFleet.splice(reserveIdx,1)[0];
  G.fleet.push(ship);
  notify(`📈 ${ship.nm} → 선발 편대 합류 (선발 ${G.fleet.length}/16)`,'gold');
  baekgu(`${ship.nm} 출격 준비 완료. 즉시 전열에 투입.`);
  saveGame(true);rerenderShipOrGarage();
}

function swapReserveShip(reserveIdx){
  if(!G.reserveFleet||!G.reserveFleet[reserveIdx]){notify('임시함선 없음','err');return;}
  const sel=document.getElementById('resvSwap_'+reserveIdx);
  const fleetIdx=parseInt(sel?.value);
  if(isNaN(fleetIdx)||fleetIdx<0||fleetIdx>=G.fleet.length){notify('교체할 선발 함선을 선택하세요','warn');return;}
  // 기함 교체 시 경고
  if(fleetIdx===0){
    if(!confirm('⭐ 기함을 임시창으로 보내고 새 함선이 기함이 됩니다. 진행할까요?'))return;
  }
  const reserveShip=G.reserveFleet[reserveIdx];
  const activeShip=G.fleet[fleetIdx];
  // ── 교체 전: 선발 함선의 파츠/크루 자동 해제 → 인벤토리/크루풀로 반환 ──
  let _partsReturned=0,_crewReturned=0;
  if(activeShip.parts&&activeShip.parts.length>0){
    activeShip.parts.forEach(pid=>{addToInventory(pid);_partsReturned++;});
    activeShip.parts=[];
  }
  if(activeShip.crewIds&&activeShip.crewIds.length>0){
    _crewReturned=activeShip.crewIds.length;
    activeShip.crewIds=[];  // 크루는 G.crew/G.heroes에 이미 있으므로 ID만 비우면 자동 해제됨
  }
  // HP/SH 클램프 (스탯 변화 반영)
  const _st=getShipStats(activeShip);
  activeShip.hp=Math.min(activeShip.hp,_st.HP);
  activeShip.sh=Math.min(activeShip.sh||0,_st.maxSH);
  // 교체 (파츠/크루 비어있는 상태로 임시창行)
  G.fleet[fleetIdx]=reserveShip;
  G.reserveFleet[reserveIdx]=activeShip;
  const _msg=`🔄 ${activeShip.nm} → 임시창 (파츠 ${_partsReturned}개·크루 ${_crewReturned}명 자동 해제) · ${reserveShip.nm} → 선발`;
  notify(_msg,'gold');
  baekgu(`${reserveShip.nm} 출격! ${activeShip.nm} 파츠/크루는 자동 회수했어. 새 함선에 다시 배치해줘.`);
  saveGame(true);
  rerenderShipOrGarage();
}
// 임시창 함선 폐기 → 정비소 매각 (크레딧 환급 + 파츠/크루 회수)
function discardReserveShip(reserveIdx){
  if(!G.reserveFleet||!G.reserveFleet[reserveIdx])return;
  const ship=G.reserveFleet[reserveIdx];
  // 매각가 계산: 카탈로그 정가의 80% × 품질 배율
  const cid=String(ship.catalogId||ship.id||'').replace(/_.*$/,'');
  const def=(typeof SHIP_CATALOG!=='undefined')?SHIP_CATALOG.find(d=>d.id===cid):null;
  const basePrice=def?.price||({소형:5000,중형:35000,대형:260000,전설기함:1200000,신화:25000000})[ship.tier]||10000;
  const qualityMul=ship.quality||1.0;
  const sellPrice=Math.round(basePrice*0.8*qualityMul);
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
  const returnedCrew=(ship.crewIds||[]).length;
  // 중앙 정렬 확인 모달 (브라우저 confirm 대신)
  const qLabel=qualityMul!==1?` × 품질 ×${qualityMul.toFixed(2)}`:'';
  openModal('💰 후보 함선 매각',
    `<div style="padding:14px;text-align:center">
      <div style="font-size:38px;margin-bottom:8px">💰</div>
      <div style="font-size:15px;color:var(--yellow);margin-bottom:8px"><b>${ship.nm}</b></div>
      <div style="font-size:13px;color:var(--dim);line-height:1.9;margin-bottom:10px">
        매각가 <span style="color:var(--gold);font-size:16px;font-weight:bold">₡${sellPrice.toLocaleString()}</span><br>
        <span style="color:var(--muted);font-size:11px">(정가의 80%${qLabel})</span>
      </div>
      <div style="background:rgba(0,243,255,.06);border:1px solid rgba(0,243,255,.25);border-radius:6px;padding:8px 12px;font-size:12px;color:var(--cyan);line-height:1.7">
        🔧 회수: 파츠 <b>${returnedParts}</b>개 · 크루 <b>${returnedCrew}</b>명<br>
        <span style="font-size:10px;color:var(--dim)">파츠는 인벤토리, 크루는 크루 풀로 복귀</span>
      </div>
    </div>`,
    [
      {txt:'💰 매각 확정',fn:()=>{
        closeModal();
        G.credits+=sellPrice;
        G.reserveFleet.splice(reserveIdx,1);
        notify(`💰 ${ship.nm} 매각 +₡${sellPrice.toLocaleString()} (파츠 ${returnedParts} · 크루 ${returnedCrew} 회수)`,'gold');
        baekgu(`${ship.nm} 정비소에 ₡${sellPrice.toLocaleString()}에 매각했어. 파츠랑 크루는 잘 챙겨놨고.`);
        updateHUD();saveGame(true);
        rerenderShipOrGarage();
      },cls:'btn-gold'},
      {txt:'취소',fn:closeModal,cls:'btn-sm'}
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
    ${[{k:'parts',lb:'🔧 함선 정비'},{k:'cargo',lb:'📦 화물 관리'},{k:'formation',lb:'⚓ 편대 편성'}].map(t=>{
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
    const slots=Math.min(s.cargoSlots||4,80);
    let cargoOffset=0;
    for(let fi=0;fi<G.fleet.length;fi++){if(G.fleet[fi].id===s.id)break;cargoOffset+=G.fleet[fi].cargoSlots||4;}
    const cargoFlat=[];
    G.cargo.forEach(c=>{const imgSrc='img/commodities/'+c.id+'.png';for(let q=0;q<(c.qty||1);q++)cargoFlat.push({nm:c.nm,ic:c.ic||'📦',img:imgSrc,price:c.buyPrice,id:c.id});});
    const myCargo=cargoFlat.slice(cargoOffset,cargoOffset+slots);
    const _cgRows=slots<=8?4:slots<=24?6:slots<=48?7:8;
    const _cgCell=slots<=24?40:slots<=48?36:32;
    let grid='<div style="display:grid;grid-template-rows:repeat('+_cgRows+','+_cgCell+'px);grid-auto-flow:column;grid-auto-columns:'+_cgCell+'px;gap:3px">';
    const _inner=_cgCell-4;
    for(let i=0;i<slots;i++){
      if(i<myCargo.length){const ci=myCargo[i];grid+='<div style="width:'+_cgCell+'px;height:'+_cgCell+'px;border-radius:4px;background:rgba(0,243,255,.15);border:1px solid rgba(0,243,255,.4);display:flex;align-items:center;justify-content:center;overflow:hidden" title="'+ci.nm+'"><img src="'+ci.img+'" style="width:'+_inner+'px;height:'+_inner+'px;object-fit:cover;border-radius:2px" onerror="this.style.display=\'none\';this.nextSibling.style.display=\'flex\'"><span style="font-size:'+(_cgCell>=36?16:13)+'px;display:none;width:100%;height:100%;align-items:center;justify-content:center">'+ci.ic+'</span></div>';}
      else{const isMax=(slots>=80);grid+='<div '+(isMax?'':'onclick="upgradeCargoSlot('+idx+')"')+' style="width:'+_cgCell+'px;height:'+_cgCell+'px;border-radius:4px;background:rgba(255,255,255,.03);border:1px dashed rgba(255,255,255,.12);'+(isMax?'':'cursor:pointer;')+'" title="'+(isMax?'화물칸 최대 (80칸)':'빈 화물칸 — 클릭하여 확장')+'"></div>';}
    }
    grid+='</div>';
    const fc=s.tier==='신화'?'#cc66ff':s.tier==='대형'?'#d4af37':s.tier==='중형'?'#00f3ff':'#88ccff';
    const tierIc={신화:'✦',전설기함:'⚑',대형:'🌟',중형:'🚀',소형:'🛸'}[s.tier]||'🛸';
    let btn;
    if(slots<80){const cp=getCargoUpgradePrice(s);btn=`<button class="btn btn-sm" style="border-color:var(--cyan);color:var(--cyan);font-size:11px;padding:3px 10px" onclick="upgradeCargoSlot(${idx})" ${G.credits>=cp?'':'disabled'}>📦 창고+2칸 ₡${cp.toLocaleString()}</button>`;}
    else btn='<span style="font-size:11px;color:var(--cyan)">✅ 화물칸 최대 (80칸)</span>';
    return `<div style="background:var(--card);border:1px solid ${fc};border-radius:8px;padding:10px 12px;margin-bottom:10px;display:flex;gap:14px;align-items:flex-start">
      <div style="width:60px;flex-shrink:0;text-align:center">
        <div style="font-size:30px">${tierIc}</div>
        <div style="font-size:11px;color:${fc};font-weight:bold;margin-top:2px">${s.tier}</div>
      </div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">
          <span style="font-size:14px;font-weight:bold;color:var(--txt)">${idx===0?'⭐ ':''}${s.nm}</span>
          <span style="font-size:11px;color:var(--cyan)">📦 ${s.cargoSlots||4} / 80칸</span>
          ${btn}
        </div>
        ${grid}
      </div>
    </div>`;
  }).join('');
  body.innerHTML=`<div class="hub-scroll">
    ${hubBanner('garage','🔧','함선 정비소',pd?.f)}
    <div class="hub-t">🔧 함선 정비소 — ${pd?pd.nm:''}</div>
    ${subNav}
    <div style="background:rgba(0,243,255,.04);border:1px solid rgba(0,243,255,.25);border-radius:8px;padding:10px 14px;margin-bottom:12px;display:flex;gap:18px;flex-wrap:wrap">
      <span style="font-size:13px;color:var(--cyan)"><b>전체 보유</b> ${usedSlots}/${totalSlots}칸</span>
      <span style="font-size:13px;color:var(--gold)"><b>총 가치</b> ₡${totalValue.toLocaleString()}</span>
      <span style="font-size:12px;color:var(--dim);margin-left:auto">함선별 화물칸 관리 · 빈칸 클릭으로 확장</span>
    </div>
    ${shipCards||'<div style="text-align:center;color:var(--dim);padding:30px">함선이 없습니다</div>'}
  </div>`;
  G._garageMode=false;
}

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
  G._garageMode=true;
  var _pt=_shipTab;
  _shipTab='fleet';
  renderShipTab(body);
  _shipTab=_pt;
  G._garageMode=false;
}

// ── 편대 편성: 16슬롯 그리드에 함선 배치 ─────────────────────────
const FLEET_FORMATION_SLOTS=16; // 4×4
let _formationSelectedSlot=null;
let _formationSelectedShip=null;
function _getFormation(){
  if(!G.fleetFormation||typeof G.fleetFormation!=='object')G.fleetFormation={};
  return G.fleetFormation;
}
function _slotToColRow(slot){
  // 4열×4행, slot 0=col0(front)/row0, slot 1=col0/row1, ..., slot 4=col1/row0
  return{col:Math.floor(slot/4),row:slot%4};
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
  _formationSelectedSlot=null;_formationSelectedShip=null;
  saveGame(true);
  notify('편대 편성 초기화. 자동 배치(체력·방어 우선)로 복귀.','ok');
  rerenderTab(renderGarageTab);
}
// 방어력/체력/실드 높은 함선을 1열부터 자동 배치 (4열×4행, 슬롯 0~3=1열)
function autoArrangeFormation(){
  if(!G.fleet||G.fleet.length===0){notify('편대에 함선이 없습니다','warn');return;}
  // 함선 방어력 점수 계산 (HP + DEF*10 + maxSH*1.5 + armorTier*30 + shieldTier*15)
  function _defScore(s){
    const st=(typeof getShipStats==='function')?getShipStats(s):{};
    const hp=(s.maxHP||0)+(st.hpBonus||0);
    const def=(s.DEF||0)+(st.DEF||0);
    const sh=(s.maxSH||0)+(st.shBonus||0);
    return hp + def*10 + sh*1.5;
  }
  // 정렬: 방어력 높은 순 → 기함은 항상 최우선
  const sorted=[...G.fleet].map((s,i)=>({s,i,score:_defScore(s)})).sort((a,b)=>{
    if(a.i===0)return -1;  // 기함 항상 첫 번째
    if(b.i===0)return 1;
    return b.score-a.score;
  });
  // 4열×4행 = 16슬롯. col 0(slot 0~3)이 앞열(전투 시 우선 공격받음)
  // 앞열부터 채우기 위해 slot 0,1,2,3 (col 0) → 4,5,6,7 (col 1) → ...
  G.fleetFormation={};
  sorted.forEach((entry,idx)=>{
    if(idx>=FLEET_FORMATION_SLOTS)return;  // 16척 초과 무시
    G.fleetFormation[entry.s.id]=idx;
  });
  _formationSelectedSlot=null;_formationSelectedShip=null;
  saveGame(true);
  notify(`🛡️ 자동 배치 완료 — 방어력 높은 ${Math.min(sorted.length,FLEET_FORMATION_SLOTS)}척이 1열부터 배치됨`,'ok');
  rerenderTab(renderGarageTab);
}
function onFormationSlotClick(slot){
  AudioMgr.playSfx('UI_click',{cooldown:60});
  // 1) 함선 카드를 먼저 선택해둔 상태 → 그 함선을 슬롯에 배치 (대상 슬롯에 다른 함선이 있으면 자동 배치로 밀려남)
  if(_formationSelectedShip){
    assignFormationSlot(slot,_formationSelectedShip);
    _formationSelectedShip=null;_formationSelectedSlot=null;
    rerenderTab(renderGarageTab);
    return;
  }
  // 2) 이전에 슬롯을 선택해둔 상태 → 같은 슬롯 재클릭=비우기, 다른 슬롯 클릭=이동/스왑
  if(_formationSelectedSlot!==null){
    if(_formationSelectedSlot===slot){
      // 같은 슬롯 재클릭: 함선 있으면 비우기, 없으면 선택 해제
      const occ=getFormationShipForSlot(slot);
      if(occ)clearFormationSlot(slot);
      _formationSelectedSlot=null;
      rerenderTab(renderGarageTab);
      return;
    }
    const srcShip=getFormationShipForSlot(_formationSelectedSlot);
    const dstShip=getFormationShipForSlot(slot);
    if(srcShip){
      // 소스에 함선이 있음 → 이동 또는 스왑
      const f=_getFormation();
      if(dstShip){
        // 두 슬롯 모두 점유 → 스왑
        f[srcShip.id]=slot;
        f[dstShip.id]=_formationSelectedSlot;
        notify(`🔄 ${srcShip.nm} ↔ ${dstShip.nm} 위치 교환`,'ok');
      } else {
        // 이동
        f[srcShip.id]=slot;
        notify(`📍 ${srcShip.nm} 이동 (${Math.floor(slot/4)+1}열-${slot%4+1}행)`,'ok');
      }
      saveGame(true);
      _formationSelectedSlot=null;
    } else {
      // 소스가 빈 슬롯이었다면 선택을 새 슬롯으로 이동 (조작 편의)
      _formationSelectedSlot=slot;
    }
    rerenderTab(renderGarageTab);
    return;
  }
  // 3) 첫 클릭: 슬롯 선택
  _formationSelectedSlot=slot;
  rerenderTab(renderGarageTab);
}
function onFormationShipClick(shipId){
  AudioMgr.playSfx('UI_click',{cooldown:60});
  if(_formationSelectedSlot!==null){
    assignFormationSlot(_formationSelectedSlot,shipId);
    _formationSelectedSlot=null;_formationSelectedShip=null;
  } else {
    _formationSelectedShip=(_formationSelectedShip===shipId?null:shipId);
  }
  rerenderTab(renderGarageTab);
}
function renderFleetFormationTab(body){
  G._garageMode=true;
  const pd=PLANET_DEF.find(p=>p.id===G.currentPlanet);
  // 정비소 서브탭: 함선 정비 + 화물 관리 + 편대 편성 (3개 통합)
  const _isMaintain=_garageSubTab!=='formation'&&_garageSubTab!=='cargo';
  const subNav=`<div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap">
    ${[{k:'parts',lb:'🔧 함선 정비'},{k:'cargo',lb:'📦 화물 관리'},{k:'formation',lb:'⚓ 편대 편성'}].map(t=>{
      const act=(t.k===_garageSubTab||(t.k==='parts'&&_isMaintain));
      return`<button onclick="_garageSubTab='${t.k}';rerenderTab(renderGarageTab)" style="padding:5px 14px;border:1px solid ${act?'var(--cyan)':'var(--bdr)'};background:${act?'rgba(0,243,255,.12)':'transparent'};color:${act?'var(--cyan)':'var(--dim)'};border-radius:6px;cursor:pointer;font-size:12px;font-weight:${act?'bold':'normal'}">${t.lb}</button>`;
    }).join('')}
  </div>`;
  const assignedShipIds=new Set(Object.keys(_getFormation()));
  // 시각 배치: 왼쪽=4열(뒤) → 오른쪽=1열(앞). 1열이 오른쪽 끝의 적 함대와 맞닿게 표시.
  const colLabelTexts=['🛡️ 4열 (후방)','3열','2열','⚔️ 1열 (전방)'];
  const colLabels=`<div style="display:grid;grid-template-columns:auto repeat(4,1fr);gap:6px;margin-bottom:6px;font-size:11px;font-weight:bold;text-align:center">
    <div style="font-size:9px;color:var(--dim);align-self:end">⬅ 후방 / 전방 ➡</div>
    ${colLabelTexts.map((l,i)=>`<div style="color:${i===3?'var(--red)':i===0?'rgba(255,200,0,.7)':'var(--gold)'}">${l}</div>`).join('')}
  </div>`;
  const rowLabels=['행1','행2','행3','행4'];
  let gridWithLabels=colLabels+'<div style="display:grid;grid-template-columns:auto repeat(4,1fr);gap:6px">';
  for(let row=0;row<4;row++){
    gridWithLabels+=`<div style="display:flex;align-items:center;justify-content:center;color:var(--dim);font-size:11px">${rowLabels[row]}</div>`;
    for(let visCol=0;visCol<4;visCol++){
      // 시각 컬럼 visCol=0 → 4열(논리 col=3), visCol=3 → 1열(논리 col=0)
      const logicalCol=3-visCol;
      const slot=logicalCol*4+row;
      const ship=getFormationShipForSlot(slot);
      const isFlagshipHere=ship&&G.fleet[0]&&ship.id===G.fleet[0].id;
      const sel=_formationSelectedSlot===slot;
      const isFront=logicalCol===0;
      const slotBg=ship?'rgba(0,243,255,.10)':isFront?'rgba(255,80,80,.07)':'rgba(255,255,255,.03)';
      const slotBdr=sel?'var(--gold)':ship?'var(--cyan)':isFront?'rgba(255,80,80,.4)':'var(--bdr)';
      const slotGlow=sel?'box-shadow:0 0 18px rgba(255,215,0,.6);':isFront?'box-shadow:0 0 8px rgba(255,80,80,.2);':'';
      let content;
      if(ship){
        const st=getShipStats(ship);
        const hpP=Math.max(0,Math.min(100,Math.round(ship.hp/Math.max(1,st.HP||ship.maxHP)*100)));
        const hpCol=hpP>60?'var(--green)':hpP>30?'var(--yellow)':'var(--red)';
        content=`
          <div style="width:100%;display:flex;justify-content:center;flex-shrink:0">${imgOrEmoji(shipImgSrc(ship),'🛸',104,104,'border-radius:6px',shipLoreKey(ship))}</div>
          <div style="font-size:10px;color:var(--cyan);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:100%;text-align:center;flex-shrink:0">${isFlagshipHere?'⭐ ':''}${ship.nm}</div>
          <div style="font-size:9px;color:${hpCol};text-align:center;margin-top:2px">HP ${hpP}%</div>
          <div style="display:flex;justify-content:space-between;width:100%;font-size:9px;color:var(--dim);margin-top:auto;padding-top:3px;border-top:1px solid rgba(255,255,255,.08)">
            <span style="color:#f88">❤${st.HP}</span>
            <span style="color:var(--gold)">🔰${st.DEF}</span>
          </div>`;
      } else {
        content=`
          <div style="font-size:24px;color:${isFront?'rgba(255,80,80,.55)':'rgba(255,255,255,.25)'};text-align:center">+</div>
          <div style="font-size:9px;color:${isFront?'rgba(255,80,80,.7)':'var(--dim)'};margin-top:4px;text-align:center">${isFront?'⚔️ 최전선':'빈 슬롯'}</div>`;
      }
      // 정사각형 슬롯: aspect-ratio 1/1, 패딩·내부 flex 정렬
      gridWithLabels+=`<div onclick="onFormationSlotClick(${slot})" style="background:${slotBg};border:1px solid ${slotBdr};border-radius:8px;padding:5px;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;cursor:pointer;${slotGlow};transition:all .15s;aspect-ratio:1/1;overflow:hidden;box-sizing:border-box" onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform=''">${content}</div>`;
    }
  }
  gridWithLabels+='</div>';
  // 적 측 표시 — 1열 바로 옆에 위치하여 "1열이 가장 먼저 적과 교전" 의미를 시각화
  const enemySide=`<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(255,60,60,.06);border:1px dashed rgba(255,60,60,.3);border-radius:8px;padding:8px;min-width:90px"><div style="font-size:34px">☠️</div><div style="font-size:11px;color:var(--red);font-weight:bold;margin-top:4px">적 함대</div><div style="font-size:10px;color:var(--red);margin-top:4px;line-height:1.4">⬅ 1열이<br>가장 먼저 교전</div></div>`;
  // 함선 리스트 (편성 가능한 함선)
  const shipCards=G.fleet.map((s,i)=>{
    const slot=_getFormation()[s.id];
    const slotLbl=typeof slot==='number'?`${Math.floor(slot/4)+1}열-${slot%4+1}행`:'자동';
    const sel=_formationSelectedShip===s.id;
    const isFlagship=i===0;
    const bgCol=sel?'rgba(255,215,0,.15)':typeof slot==='number'?'rgba(0,243,255,.06)':'var(--card)';
    const bdrCol=sel?'var(--gold)':typeof slot==='number'?'var(--cyan)':'var(--bdr)';
    return`<div onclick="onFormationShipClick('${s.id}')" style="background:${bgCol};border:1px solid ${bdrCol};border-radius:8px;padding:8px;cursor:pointer;display:flex;gap:8px;align-items:center;transition:all .15s" onmouseover="this.style.transform='translateX(3px)'" onmouseout="this.style.transform=''">
      ${imgOrEmoji(shipImgSrc(s),'🛸',88,88,'border-radius:6px;flex-shrink:0',shipLoreKey(s))}
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:bold;color:${isFlagship?'var(--cyan)':'var(--txt)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${isFlagship?'⭐ ':''}${s.nm}</div>
        ${(()=>{
          const st=getShipStats(s);
          const dHp=st.HP-(s.maxHP||0),dDef=st.DEF-(s.DEF||0);
          const hpDelta=dHp>0?`<span style="color:var(--green)">+${dHp}</span>`:'';
          const defDelta=dDef>0?`<span style="color:var(--green)">+${dDef}</span>`:'';
          return `<div style="font-size:10px;color:var(--dim)">${s.tier} · HP <span style="color:var(--txt);font-weight:bold">${st.HP}</span>${hpDelta} · DEF <span style="color:var(--txt);font-weight:bold">${st.DEF}</span>${defDelta}</div>`;
        })()}
        <div style="font-size:10px;color:${typeof slot==='number'?'var(--cyan)':'var(--dim)'};margin-top:2px">📍 ${slotLbl}</div>
      </div>
    </div>`;
  }).join('');
  const hint=_formationSelectedSlot!==null
    ? (()=>{
        const _selOcc=getFormationShipForSlot(_formationSelectedSlot);
        const _selLbl=`${Math.floor(_formationSelectedSlot/4)+1}열-${_formationSelectedSlot%4+1}행`;
        const _info=_selOcc
          ? `📍 <b>${_selOcc.nm}</b> 선택됨 (${_selLbl}) — 다른 슬롯 클릭 시 이동/교환, 같은 슬롯 재클릭 시 해제`
          : `📍 빈 슬롯 선택됨 (${_selLbl}) — 배치할 함선을 클릭하거나 다른 슬롯으로 이동`;
        return `<div style="background:rgba(255,215,0,.1);border:1px solid var(--gold);border-radius:6px;padding:8px;text-align:center;color:var(--gold);font-size:12px">${_info}</div>`;
      })()
    : _formationSelectedShip
    ? `<div style="background:rgba(255,215,0,.1);border:1px solid var(--gold);border-radius:6px;padding:8px;text-align:center;color:var(--gold);font-size:12px">🛸 함선 선택됨 — 그리드에서 배치할 슬롯을 클릭하세요.</div>`
    : `<div style="background:rgba(0,243,255,.04);border:1px solid rgba(0,243,255,.2);border-radius:6px;padding:8px;text-align:center;color:var(--dim);font-size:12px">💡 슬롯을 클릭하면 함선을 다른 슬롯으로 <b>이동/교환</b> 할 수 있습니다. 함선 카드를 먼저 골라도 됩니다.</div>`;
  const _declineCap=!!G.declineCapture;
  const summary=`<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;background:rgba(0,243,255,.04);border:1px solid rgba(0,243,255,.2);border-radius:8px;padding:10px 14px;margin-bottom:10px">
    <span style="font-size:14px;font-weight:bold;color:var(--cyan)">⚓ 편대 편성</span>
    <span style="font-size:12px;color:var(--dim)">4열×4행 = 16슬롯. 앞열(1열)이 전투 시 우선 공격받습니다.</span>
    <span style="font-size:12px;color:var(--dim);margin-left:auto">수동 배치 ${assignedShipIds.size}/${G.fleet.length}척</span>
    <button class="btn btn-sm" onclick="toggleDeclineCapture()" style="font-size:11px;padding:4px 10px;${_declineCap?'border-color:var(--gold);color:var(--gold);background:rgba(212,175,55,.12)':'border-color:var(--dim);color:var(--dim)'}" title="ON: 나포 대상 함선을 즉시 매각하여 크레딧 획득 (편대 확장 방지) · OFF: 정상 나포 시도">${_declineCap?'🚫 나포→💰 자동매각':'🏴 나포 허용'}</button>
    <button class="btn btn-sm" style="border-color:var(--cyan);color:var(--cyan);font-size:11px;padding:4px 10px" onclick="autoArrangeFormation()" title="HP·DEF·SHD 높은 함선부터 1열(앞)에 배치">🛡️ 자동 배치 (방어순)</button>
    <button class="btn btn-sm btn-red" style="font-size:11px;padding:4px 10px" onclick="clearAllFormation()">↻ 초기화</button>
  </div>`;
  body.innerHTML=`<div class="hub-scroll">
    ${hubBanner('garage','🔧','함선 정비소',pd?.f)}
    <div class="hub-t">🔧 함선 정비소 — ${pd?pd.nm:''}</div>
    ${subNav}
    ${summary}
    ${hint}
    <div style="display:grid;grid-template-columns:320px 1fr;gap:14px;margin-top:10px;align-items:flex-start">
      <div style="background:rgba(5,10,26,.5);border:1px solid var(--bdr);border-radius:8px;padding:10px;max-height:85vh;overflow-y:auto;scrollbar-width:thin;scrollbar-color:rgba(0,243,255,.3) transparent" data-scroll-id="formation-ships">
        <div style="font-size:13px;font-weight:bold;color:var(--cyan);margin-bottom:8px;position:sticky;top:0;background:rgba(5,10,26,.95);padding:2px 0;z-index:1">🛸 보유 함선 (${G.fleet.length})</div>
        <div style="display:flex;flex-direction:column;gap:6px">${shipCards}</div>
      </div>
      <div>
        <div style="display:flex;gap:10px;align-items:stretch">
          <div style="flex:1">${gridWithLabels}</div>
          ${enemySide}
        </div>
        <div style="margin-top:8px;font-size:11px;color:var(--dim);text-align:center">➡ 오른쪽이 적과 가까운 <span style="color:var(--red);font-weight:bold">최전선(1열)</span>. 전투 시 약 70% 확률로 적이 앞열 함선을 먼저 공격합니다.</div>
      </div>
    </div>
  </div>`;
  G._garageMode=false;
}

function repairAllShips(){
  const totalCost=G.fleet.reduce((sum,s)=>sum+repairCost(s)+shRepairCost(s),0);
  if(totalCost===0){notify('모든 함선이 이미 완전 상태입니다','warn');return;}
  if(G.credits<totalCost){notify(`크레딧 부족 (필요: ₡${totalCost.toLocaleString()})`, 'err');return;}
  G.credits-=totalCost;
  let repaired=0;
  G.fleet.forEach(s=>{
    const b=getPartBonus(s);const eH=s.maxHP+(b.hp||0),eS=s.maxSH+(b.sh||0);
    if(s.hp<eH||s.sh<eS){s.hp=eH;s.sh=eS;repaired++;}
  });
  updateHUD();notify(`⚡ 함대 전체 수리 완료 — ${repaired}척 수리 (-₡${totalCost.toLocaleString()})`,'gold');
  rerenderShipOrGarage();saveGame(true);
}
function repairShip(idx,type){
  const s=G.fleet[idx];if(!s)return;
  const b=getPartBonus(s);
  const cost=type==='hp'?repairCost(s):shRepairCost(s);
  if(cost===0){notify('이미 최대 상태입니다','warn');return;}
  if(G.credits<cost){notify(`크레딧 부족 (필요: ₡${cost.toLocaleString()})`,'err');return;}
  G.credits-=cost;
  if(type==='hp')s.hp=s.maxHP+(b.hp||0);
  else s.sh=s.maxSH+(b.sh||0);
  updateHUD();notify(`🔧 ${s.nm} 수리 완료 (-₡${cost.toLocaleString()})`,'ok');rerenderShipOrGarage();saveGame(true);
}
// 모달 내 수리 — 수리 후 상세 팝업 재오픈
function repairShipModal(idx,type){
  const s=G.fleet[idx];if(!s)return;
  const b=getPartBonus(s);
  const cost=type==='hp'?repairCost(s):shRepairCost(s);
  if(cost===0){notify('이미 최대 상태입니다','warn');showShipDetailModal(idx);return;}
  if(G.credits<cost){notify(`크레딧 부족 (필요: ₡${cost.toLocaleString()})`,'err');showShipDetailModal(idx);return;}
  G.credits-=cost;
  if(type==='hp')s.hp=s.maxHP+(b.hp||0);
  else s.sh=s.maxSH+(b.sh||0);
  updateHUD();notify(`🔧 ${s.nm} 수리 완료 (-₡${cost.toLocaleString()})`,'ok');
  saveGame(true);showShipDetailModal(idx);
}
function repairShipFullModal(idx){
  const s=G.fleet[idx];if(!s)return;
  const b=getPartBonus(s);
  const cost=repairCost(s)+shRepairCost(s);
  if(cost===0){notify('이미 완전 수리 상태입니다','warn');showShipDetailModal(idx);return;}
  if(G.credits<cost){notify(`크레딧 부족 (필요: ₡${cost.toLocaleString()})`,'err');showShipDetailModal(idx);return;}
  G.credits-=cost;
  s.hp=s.maxHP+(b.hp||0);if(s.maxSH>0||(b.sh||0)>0)s.sh=s.maxSH+(b.sh||0);
  updateHUD();notify(`⚡ ${s.nm} 완전수리 (-₡${cost.toLocaleString()})`,'gold');
  saveGame(true);showShipDetailModal(idx);
}
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
  const cols=(typeof getShipPartsGridCols==='function')?getShipPartsGridCols(s.tier):2;
  return Math.max(1,rows*cols);
}
function _shipCrewCap(s){return getMaxCrew(s);}

// ── 스마트 자동 배치 알고리즘 ─────────────────────────────────────
//   1단계: 세트(set) 파츠는 같은 함선에 묶어서 배치 (세트 효과 활성)
//   2단계: 워프 엔진(E15/ME01/SE01)은 함선당 1개씩만 부여
//   3단계: 각 함선에 카테고리별(레이저/미사일/실드/장갑/엔진) 최강 1개씩 부여
//   4단계: 나머지 파츠를 기함 중심 또는 평균 배분
function _smartAutoEquip(flagshipPriority){
  if(!G.fleet.length){notify('함선이 없습니다','err');return;}
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

function autoEquipPartsFlagship(){
  // 기함 중심 모드: 2단계 처리
  //   1) 기함만 대상으로 V4 풀 실행 → 기함 빈틈 없이 완벽 채움
  //   2) 나머지 함대 대상으로 V4 평균 분배 실행 → 균등 배분
  if(!G.fleet||!G.fleet.length){notify('함선이 없습니다','err');return;}
  // 1단계: 기함 단독 처리 (G.fleet[0]만 임시로 단일 함대로 취급)
  const _origFleet=G.fleet;
  G.fleet=[_origFleet[0]];
  const r1=_smartAutoEquipV2('flagship');
  G.fleet=_origFleet;
  if(!r1)return;
  // 2단계: 나머지 함대 평균 분배 (G.fleet[1..] 만 임시로 노출)
  let r2={core4:0,set:0,small:0,extra:0,missile:0};
  if(_origFleet.length>1){
    G.fleet=_origFleet.slice(1);
    r2=_smartAutoEquipV2('even')||r2;
    G.fleet=_origFleet;
  }
  const total={
    core4:r1.core4+r2.core4,
    set:r1.set+r2.set,
    small:r1.small+r2.small,
    extra:r1.extra+r2.extra,
    missile:r1.missile+r2.missile
  };
  notify(`🔧 자동 배치 (기함 중심) — 기함완성+잔여균등 · 핵심4 ${total.core4} · 워프/드론 ${total.small} · 추가 ${total.extra} · 미사일 ${total.missile}`,'gold');
  rerenderShipOrGarage();saveGame(true);
}
function autoEquipPartsEven(){
  const r=_smartAutoEquipV2('even');if(!r)return;
  notify(`🔧 자동 배치 (평균 배분) — 핵심4 ${r.core4} · 세트 ${r.set} · 워프/드론 ${r.small} · 추가 ${r.extra} · 미사일 ${r.missile}`,'gold');
  rerenderShipOrGarage();saveGame(true);
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
  if(!G.fleet||!G.fleet.length){notify('함선이 없습니다','err');return;}
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
    return getShipPartsGridRows(s)*getShipPartsGridCols(s.tier);
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
    for(let i=0;i<arr.length;i++){if(_canFit(s,arr[i]))return i;}
    return -1;
  }
  // 신화 또는 전설 등급 여부
  function isMythOrLeg(p){
    if(!p)return false;
    if(p.rarity==='mythic'||p.rarity==='set'||p.rarity==='legend')return true;
    if(p.tier>=15)return true;
    return false;
  }
  // 풀에서 신화/전설만 골라 첫 fitting 인덱스 반환
  function _pickFittingMythLeg(arr,s){
    for(let i=0;i<arr.length;i++){if(isMythOrLeg(arr[i])&&_canFit(s,arr[i]))return i;}
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
        if(_canFit(s,big[ci].p)){pickedCi=ci;break;}
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
        if(_canFit(s,small[ci].p)){pickedCi=ci;break;}
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

  return {core4:_stepCoreML,set:0,small:_stepWarp,extra:_stepRound2+_stepDM,missile:_stepFill};
}

// ── 평균 분배 전용 자동 배치 알고리즘 (신규 사양) ─────────────────
//   ① 함선별로 레이저/장갑/실드/엔진 1개씩 (rarity: 신화→전설→영웅→희귀 순)
//   ② 세트 파츠 한 함선에 최대한 묶음
//   ③ 함선별 미사일 1 + 수리드론 1 (작은 파츠)
//   ④ 남은 슬롯에 다시 레이저/장갑/실드/엔진 순환 라운드 (평균 분배)
//   ⑤ 마지막 — 남은 작은 파츠로 빈 슬롯 메움
function _smartAutoEquipEven(){
  if(!G.fleet||!G.fleet.length){notify('함선이 없습니다','err');return;}
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
function autoAssignCrewFlagship(){
  if(!G.fleet.length){notify('함선이 없습니다','err');return;}
  _collectAllCrewToPool();
  const crew=_sortedCrewByPower();
  let ci=0;
  for(let si=0;si<G.fleet.length&&ci<crew.length;si++){
    const s=G.fleet[si];const cap=_shipCrewCap(s);if(!s.crewIds)s.crewIds=[];
    while(s.crewIds.length<cap&&ci<crew.length){
      s.crewIds.push(crew[ci].id);ci++;
    }
  }
  notify('👥 크루 자동 배치 (기함 중심) 완료','gold');
  rerenderShipOrGarage();saveGame(true);
}
function autoAssignCrewEven(){
  if(!G.fleet.length){notify('함선이 없습니다','err');return;}
  _collectAllCrewToPool();
  const crew=_sortedCrewByPower();
  let ci=0;
  while(ci<crew.length){
    let placed=false;
    for(let si=0;si<G.fleet.length&&ci<crew.length;si++){
      const s=G.fleet[si];const cap=_shipCrewCap(s);if(!s.crewIds)s.crewIds=[];
      if(s.crewIds.length<cap){
        s.crewIds.push(crew[ci].id);ci++;placed=true;
      }
    }
    if(!placed)break;
  }
  notify('👥 크루 자동 배치 (평균 배분) 완료','gold');
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
  if(inv.length===0){notify('인벤토리에 장착 가능한 파츠가 없습니다','warn');showShipDetailModal(shipIdx);return;}
  const catColM={weapon:'var(--red)',missile:'#ff8844',shield:'var(--blue)',armor:'var(--gold)',engine:'var(--cyan)'};
  const catIcM={weapon:'⚔️',missile:'🚀',shield:'🛡️',armor:'🛡',engine:'⚡'};
  let html2='';
  inv.forEach(i=>{
    const p=PARTS.find(x=>x.id===i.id);if(!p)return;
    const cc=catColM[p.cat]||'var(--dim)';
    const ic=catIcM[p.cat]||'⚙️';
    const st=p.cat==='weapon'?`ATT+${p.ATT}${p.wtype?' ['+p.wtype+']':''}`:p.cat==='shield'?`SHD+${p.INT} 실드+${p.maxSH}`:p.cat==='armor'?`HP+${p.HP}${p.DEF?' DEF+'+p.DEF:''}`:`ENG+${p.TEC}`;
    const gs=getPartGridSize(p);
    const sizeLabel=gs.cols===2&&gs.rows===2?'[2×2]':gs.cols===2?'[2×1]':'[1×1]';
    html2+=`<button onclick="attachPart(${shipIdx},'${i.id}');showShipDetailModal(${shipIdx})" style="display:flex;align-items:center;gap:10px;width:100%;background:rgba(0,0,0,.4);border:1px solid ${cc};border-radius:8px;padding:8px 10px;cursor:pointer;margin-bottom:6px;text-align:left" onmouseover="this.style.background='rgba(255,255,255,.06)'" onmouseout="this.style.background='rgba(0,0,0,.4)'">`
      +imgOrEmoji(`img/parts/${p.id}.png`,ic,36,36,'border-radius:5px;flex-shrink:0')
      +`<div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:bold;color:${cc}">${p.nm}<span style="font-size:11px;margin-left:5px;opacity:.7">${sizeLabel}</span></div>`
      +`<div style="font-size:12px;color:var(--dim)">T${p.tier} · ${st}</div></div>`
      +`<span style="font-size:12px;color:var(--green);flex-shrink:0">×${i.qty}</span>`
      +'</button>';
  });
  openModal(`⚙️ 파츠 장착 — ${s.nm}`,`<div style="max-height:340px;overflow-y:auto">${html2}</div>`,[{txt:'◀ 돌아가기',fn:()=>showShipDetailModal(shipIdx),cls:'btn-sm'}]);
}
// 모달 내 크루 배치 — 배치 후 상세 팝업 재오픈
function pickCrewModal(shipIdx){
  const s=G.fleet[shipIdx];if(!s)return;
  const maxC=getMaxCrew(s);
  if((s.crewIds||[]).length>=maxC){notify('만석입니다 ('+maxC+'명)','err');showShipDetailModal(shipIdx);return;}
  const allCrew=[...G.crew,...(G.heroes||[]).map(hid=>Object.assign({},HEROES[hid],{id:hid,rarity:'S',isHero:true}))];
  if(allCrew.length===0){notify('보유 크루가 없습니다 — 가챠로 영입하세요','warn');showShipDetailModal(shipIdx);return;}
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
    const lbl=onThis?'✅ 탑승 중':curShip?`📍 현재: ${curShip.nm}`:'';
    html3+=`<button ${onThis?'disabled':''} onclick="${onThis?'':(`assignCrewById(${shipIdx},'${c.id}');showShipDetailModal(${shipIdx})`)}" style="display:flex;align-items:center;gap:7px;width:100%;background:rgba(0,0,0,.4);border:1px solid ${onThis?'rgba(255,255,255,.15)':col};border-radius:8px;padding:7px 8px;cursor:${onThis?'default':'pointer'};text-align:left;opacity:${onThis?.5:1}" ${onThis?'':`onmouseover="this.style.background='rgba(255,255,255,.06)'" onmouseout="this.style.background='rgba(0,0,0,.4)'"`}>`
      +imgOrEmoji(imgSrc3,c.ic||'🧑',36,36,`border-radius:50%;flex-shrink:0;border:1px solid ${col}`)
      +`<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:bold;color:${col}">${c.isHero?'⭐ ':''}${c.nm}</div>`
      +`<div style="font-size:11px;color:var(--dim)">${c.cl||''}${bn?' · '+bn:''}</div>`
      +(lbl?`<div style="font-size:11px;color:var(--gold)">${lbl}</div>`:'')
      +'</div>'
      +'</button>';
  });
  openModal(`👥 크루 배치 — ${s.nm} (${(s.crewIds||[]).length}/${maxC}명)`,
    `<div style="max-height:380px;overflow-y:auto"><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">${html3}</div></div>`,
    [{txt:'◀ 돌아가기',fn:()=>showShipDetailModal(shipIdx),cls:'btn-sm'}]);
}
// 모달 내 크루 해제
function unassignCrewModal(shipIdx,crewSlotIdx){
  const s=G.fleet[shipIdx];if(!s||!s.crewIds)return;
  if(crewSlotIdx<0||crewSlotIdx>=s.crewIds.length){notify('잘못된 크루 위치','err');return;}
  const cid=s.crewIds[crewSlotIdx];const c=G.crew.find(x=>x.id===cid)||(G.heroes||[]).map(h=>({...HEROES[h],id:h,rarity:'S'})).find(x=>x.id===cid);
  s.crewIds.splice(crewSlotIdx,1);
  notify(`${c?.nm||'크루'} 하선`,'ok');
  saveGame(true);showShipDetailModal(shipIdx);
}
// 함선의 모든 크루 일괄 하선
function unassignAllCrew(shipIdx){
  const s=G.fleet[shipIdx];if(!s||!s.crewIds||s.crewIds.length===0)return;
  const n=s.crewIds.length;
  s.crewIds=[];
  notify(`${n}명 전원 하선 완료`,'ok');
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
  notify(`⚙️ ${s.nm} — 파츠 ${n}개 전체 해제 → 인벤토리 회수`,'ok');
  saveGame(true);rerenderShipOrGarage();
}
function repairShipFull(idx){
  const s=G.fleet[idx];if(!s)return;
  const b=getPartBonus(s);
  const cost=repairCost(s)+shRepairCost(s);
  if(cost===0){notify('이미 완전 수리 상태입니다','warn');return;}
  if(G.credits<cost){notify(`크레딧 부족 (필요: ₡${cost.toLocaleString()})`,'err');return;}
  G.credits-=cost;
  s.hp=s.maxHP+(b.hp||0);
  if(s.maxSH>0||(b.sh||0)>0)s.sh=s.maxSH+(b.sh||0);
  updateHUD();notify(`⚡ ${s.nm} 완전수리 (-₡${cost.toLocaleString()})`,'gold');rerenderShipOrGarage();saveGame(true);
}
function assignCrew(shipIdx){
  const s=G.fleet[shipIdx];
  if(!s){notify('함선을 찾을 수 없습니다','err');return;}
  if(!s.crewIds)s.crewIds=[];
  const sel=document.getElementById('crew-sel-'+shipIdx);
  if(!sel){notify('크루 선택 목록이 보이지 않습니다 — 탭을 새로고침하세요','err');return;}
  if(!sel.value||sel.value===''){notify('탑승시킬 크루/영웅을 선택하세요','warn');return;}
  const cid=sel.value;
  // 이미 이 함선에 탑승 중
  if(s.crewIds.includes(cid)){notify('이미 이 함선에 탑승 중입니다','warn');return;}
  // 최대 탑승 인원 체크 (10명)
  const _maxC=getMaxCrew(s);if(s.crewIds.length>=_maxC){notify(`이 함선은 최대 ${_maxC}명까지 탑승 가능합니다 (현재 ${s.crewIds.length}명)`,'err');return;}
  // 다른 함선에서 자동 이전
  G.fleet.forEach(sh=>{if(sh!==s&&sh.crewIds){const i=sh.crewIds.indexOf(cid);if(i>=0){sh.crewIds.splice(i,1);}}});
  const _stBefAC=getShipStats(s);
  s.crewIds.push(cid);
  _syncShipCapacity(s,_stBefAC);
  const allPeople=[...G.crew,...G.heroes.map(h=>({...HEROES[h],id:h,rarity:'S',isHero:true}))];
  const c=allPeople.find(x=>x.id===cid);
  notify(`${c?.ic||'🧑'} ${c?.nm||'크루'} → ${s.nm} 탑승 완료!`,'ok');
  baekgu(`${c?.nm||'크루'} ${s.nm}에 탑승. 함선 성능 올라갔어.`);
  rerenderShipOrGarage();saveGame(true);
}
// 이미지 카드 클릭으로 직접 크루 탑승 (ID 기반)
function assignCrewById(shipIdx,cid){
  const s=G.fleet[shipIdx];
  if(!s){notify('함선을 찾을 수 없습니다','err');return;}
  if(!s.crewIds)s.crewIds=[];
  if(s.crewIds.includes(cid)){notify('이미 이 함선에 탑승 중입니다','warn');return;}
  const _maxC=getMaxCrew(s);
  if(s.crewIds.length>=_maxC){notify(`만석 — 최대 ${_maxC}명 (현재 ${s.crewIds.length}명)`,'err');return;}
  // 다른 함선에서 자동 이전
  G.fleet.forEach(sh=>{if(sh!==s&&sh.crewIds){const i=sh.crewIds.indexOf(cid);if(i>=0){sh.crewIds.splice(i,1);}}});
  const _stBefACB=getShipStats(s);
  s.crewIds.push(cid);
  _syncShipCapacity(s,_stBefACB);
  const allPeople=[...G.crew,...G.heroes.map(h=>({...HEROES[h],id:h,rarity:'S',isHero:true}))];
  const c=allPeople.find(x=>x.id===cid);
  notify(`${c?.ic||'🧑'} ${c?.nm||'크루'} → ${s.nm} 탑승!`,'ok');
  rerenderShipOrGarage();saveGame(true);
}
function unassignCrew(shipIdx,crewSlotIdx){
  const s=G.fleet[shipIdx];if(!s||!s.crewIds)return;
  const cid=s.crewIds[crewSlotIdx];const c=G.crew.find(x=>x.id===cid)||G.heroes.map(h=>({...HEROES[h],id:h,rarity:'S'})).find(x=>x.id===cid);
  s.crewIds.splice(crewSlotIdx,1);
  notify(`${c?.nm||'크루'} 하선`,'ok');
  rerenderShipOrGarage();saveGame(true);
}
function pickPartForSlot(shipIdx){
  const s=G.fleet[shipIdx];if(!s)return;
  const inv=G.inventory.filter(i=>i.qty>0&&PARTS.find(p=>p.id===i.id));
  if(inv.length===0){notify('인벤토리에 장착 가능한 파츠가 없습니다','warn');return;}
  const catColM={weapon:'var(--red)',shield:'var(--blue)',armor:'var(--gold)',engine:'var(--cyan)'};
  const catIcM={weapon:'⚔️',shield:'🛡️',armor:'🛡',engine:'⚡'};
  let html2='';
  inv.forEach(i=>{
    const p=PARTS.find(x=>x.id===i.id);if(!p)return;
    const cc=catColM[p.cat]||'var(--dim)';
    const ic=catIcM[p.cat]||'⚙️';
    const st=p.cat==='weapon'?`ATT+${p.ATT}${p.wtype?' ['+p.wtype+']':''}`:p.cat==='shield'?`SHD+${p.INT} 실드+${p.maxSH}`:p.cat==='armor'?`HP+${p.HP}${p.DEF?' DEF+'+p.DEF:''}`:`ENG+${p.TEC}`;
    const gs=getPartGridSize(p);
    const sizeLabel=gs.cols===2&&gs.rows===2?'[2×2]':gs.cols===2?'[2×1]':'[1×1]';
    html2+=`<button onclick="attachPart(${shipIdx},'${i.id}');closeModal()" style="display:flex;align-items:center;gap:10px;width:100%;background:rgba(0,0,0,.4);border:1px solid ${cc};border-radius:8px;padding:8px 10px;cursor:pointer;margin-bottom:6px;text-align:left" onmouseover="this.style.background='rgba(255,255,255,.06)'" onmouseout="this.style.background='rgba(0,0,0,.4)'">`
      +imgOrEmoji(`img/parts/${p.id}.png`,ic,36,36,'border-radius:5px;flex-shrink:0')
      +`<div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:bold;color:${cc}">${p.nm}<span style="font-size:11px;margin-left:5px;opacity:.7">${sizeLabel}</span></div>`
      +`<div style="font-size:12px;color:var(--dim)">T${p.tier} · ${st}</div></div>`
      +`<span style="font-size:12px;color:var(--green);flex-shrink:0">×${i.qty}</span>`
      +'</button>';
  });
  openModal(`⚙️ 파츠 장착 — ${s.nm}`,`<div style="max-height:340px;overflow-y:auto">${html2}</div>`,[{txt:'✕ 나가기',fn:closeModal,cls:'btn-sm'}]);
}
let _crewPickSort='rarity'; // rarity | cl | name
function pickCrewForSlot(shipIdx){
  const s=G.fleet[shipIdx];if(!s)return;
  const maxC=getMaxCrew(s);
  if((s.crewIds||[]).length>=maxC){notify('만석입니다 ('+maxC+'명)','err');return;}
  const allCrew=[...G.crew,...G.heroes.map(hid=>Object.assign({},HEROES[hid],{id:hid,rarity:'S',isHero:true}))];
  if(allCrew.length===0){notify('보유 크루가 없습니다 — 가챠로 영입하세요','warn');return;}
  const RC3={N:'#888',R:'var(--blue)',H:'var(--purple)',L:'var(--gold)',S:'#ff6ec7'};
  const RORD3={L:0,H:1,R:2,N:3};
  // 등급별/클래스/이름 정렬
  const sorted3=[...allCrew];
  if(_crewPickSort==='rarity') sorted3.sort((a,b)=>(RORD3[a.rarity]??4)-(RORD3[b.rarity]??4));
  else if(_crewPickSort==='cl') sorted3.sort((a,b)=>(a.cl||'').localeCompare(b.cl||''));
  else if(_crewPickSort==='name') sorted3.sort((a,b)=>(a.nm||'').localeCompare(b.nm||''));

  function _sortBtn3(key,label){
    const act=_crewPickSort===key;
    return `<button onclick="_crewPickSort='${key}';pickCrewForSlot(${shipIdx})" style="padding:3px 10px;border:1px solid ${act?'var(--cyan)':'rgba(255,255,255,.2)'};background:${act?'rgba(0,243,255,.12)':'transparent'};color:${act?'var(--cyan)':'rgba(255,255,255,.5)'};cursor:pointer;border-radius:4px;font-size:11px;font-family:Courier New,monospace">${label}</button>`;
  }
  const sortBar3=`<div style="display:flex;gap:5px;margin-bottom:10px;align-items:center">
    <span style="font-size:11px;color:var(--dim)">정렬:</span>
    ${_sortBtn3('rarity','⭐ 등급')}${_sortBtn3('cl','🔧 클래스')}${_sortBtn3('name','🔤 이름')}
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
    const lbl=onThis?'✅ 이미 탑승 중':curShip?`📍 현재: ${curShip.nm}`:'';
    html3+=`<button ${onThis?'disabled':''} onclick="${onThis?'':(`assignCrewById(${shipIdx},'${c.id}');closeModal()`)}" style="display:flex;align-items:center;gap:7px;width:100%;min-width:0;background:rgba(0,0,0,.4);border:1px solid ${onThis?'rgba(255,255,255,.15)':col};border-radius:8px;padding:7px 8px;cursor:${onThis?'default':'pointer'};text-align:left;opacity:${onThis?.5:1}" ${onThis?'':`onmouseover="this.style.background='rgba(255,255,255,.06)'" onmouseout="this.style.background='rgba(0,0,0,.4)'"`}>`
      +imgOrEmoji(imgSrc3,c.ic||'🧑',36,36,`border-radius:50%;flex-shrink:0;border:1px solid ${col}`)
      +`<div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:bold;color:${col}">${c.isHero?'⭐ ':''}${c.nm}</div>`
      +`<div style="font-size:12px;color:var(--dim)">${c.cl||''}${bn?' · '+bn:''}</div>`
      +(lbl?`<div style="font-size:11px;color:var(--gold)">${lbl}</div>`:'')
      +'</div>'
      +'</button>';
  });
  openModal(`👥 크루 배치 — ${s.nm} (${(s.crewIds||[]).length}/${maxC}명)`,
    `<div>${sortBar3}<div style="max-height:380px;overflow-y:auto"><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">${html3}</div></div></div>`,
    [{txt:'✕ 나가기',fn:closeModal,cls:'btn-sm'}]);
}

function getShipSellPrice(ship){
  const catalogId=ship.id.replace(/_.*$/,'');
  const def=SHIP_CATALOG.find(s=>s.id===catalogId);
  const basePrice=def?def.price:(ship.tier==='전설기함'?3000000:ship.tier==='대형'?200000:ship.tier==='중형'?50000:10000);
  const sellRatio={easy:0.85,normal:0.80,hard:0.75,extreme:0.70}[G.difficulty]||0.80;
  const tierBase={소형:5,중형:10,대형:20}[ship.tier]||5;
  const cargoUpgrade=Math.max(0,(ship.cargoSlots||tierBase)-tierBase);
  const cargoRefund=Math.floor(cargoUpgrade/2*5000*0.4);
  // 마르코 폴로 영웅 보유 시 판매가 +10%
  const marcoMult=(G&&G.heroes&&G.heroes.includes('H08'))?1.20:1.0;
  const baseTotal=Math.floor(basePrice*sellRatio*marcoMult)+cargoRefund;
  return {total:baseTotal, base:Math.floor(basePrice*sellRatio*marcoMult), cargoRefund, ratio:Math.round(sellRatio*100), marco:marcoMult>1};
}
function confirmSellShip(idx){
  if(G.fleet.length<=1){notify('함선이 1척뿐입니다. 판매 불가','err');return;}
  const s=G.fleet[idx];if(!s)return;
  const sp=getShipSellPrice(s);
  const partsCount=(s.parts||[]).length;
  const crewCount=(s.crewIds||[]).length;
  const msg=`<div style="text-align:center;padding:8px">
    <div style="margin-bottom:8px;display:flex;justify-content:center">${imgOrEmoji(shipImgSrc(s),'🛸',80,80,'border-radius:10px;background:rgba(0,0,0,.5);object-fit:contain',shipLoreKey(s))}</div>
    <div style="font-size:19px;font-weight:bold;margin-bottom:12px">${s.nm}</div>
    <div style="background:var(--card);border-radius:8px;padding:12px;font-size:14px;line-height:2;text-align:left">
      <div>판매가: <span style="color:var(--gold);font-size:18px;font-weight:bold">₡${sp.total.toLocaleString()}</span> (구매가의 ${sp.ratio}%)${sp.marco?' <span style="color:var(--gold);font-size:12px">🧭+10%</span>':''}</div>
      <div style="color:var(--dim);font-size:13px">기본 ₡${sp.base.toLocaleString()}${sp.cargoRefund>0?' + 창고 환급 ₡'+sp.cargoRefund.toLocaleString():''}</div>
      ${partsCount>0?`<div style="color:var(--cyan);margin-top:4px">📦 장착 파츠 ${partsCount}개 → 자동 인벤토리 반환</div>`:''}
      ${crewCount>0?`<div style="color:var(--yellow);margin-top:2px">👥 탑승 크루 ${crewCount}명 → 자동 하선</div>`:''}
    </div>
    <div style="color:var(--red);font-size:13px;margin-top:10px">⚠️ 함선 데이터가 삭제됩니다</div>
  </div>`;
  openModal('함선 판매 확인',msg,[
    {txt:`₡${sp.total.toLocaleString()} 받고 판매`,fn:()=>{closeModal();sellShip(idx);},cls:'btn-red'},
    {txt:'취소',fn:closeModal,cls:'btn-sm'}
  ]);
}
function sellShip(idx){
  if(G.fleet.length<=1){notify('함선이 1척뿐입니다','err');return;}
  const s=G.fleet[idx];if(!s)return;
  // 파츠 자동 분리 → 인벤토리 반환
  (s.parts||[]).forEach(pid=>addToInventory(pid));
  s.parts=[];
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
  updateHUD();
  notify(`🪙 ${s.nm} 판매 완료 +₡${sp.total.toLocaleString()}`,'gold');
  baekgu(`${s.nm} 팔았어. ₡${sp.total.toLocaleString()} 들어왔다. 잘 썼네.`);
  rerenderShipOrGarage();saveGame(true);
}
function renameShip(idx){
  const s=G.fleet[idx];if(!s)return;
  openModal('✏️ 함선 이름 변경',
    `<div style="padding:8px">
      <div style="color:var(--dim);font-size:14px;margin-bottom:12px">현재 이름: <span style="color:var(--cyan)">${s.nm}</span></div>
      <input class="inp" id="rename-inp" maxlength="20" placeholder="새 함선명 입력 (최대 20자)" value="${s.nm}"
        style="width:100%;margin-bottom:4px"
        onkeydown="if(event.key==='Enter')confirmRenameShip(${idx})">
      <div style="color:var(--muted);font-size:12px;margin-top:6px">영문·한글·숫자·기호 최대 20자</div>
    </div>`,
    [{txt:'✅ 변경',fn:()=>confirmRenameShip(idx),cls:'btn-gold'},{txt:'취소',fn:closeModal,cls:'btn-sm'}]
  );
  setTimeout(()=>{const el=document.getElementById('rename-inp');if(el){el.focus();el.select();}},100);
}
function confirmRenameShip(idx){
  const s=G.fleet[idx];if(!s)return;
  const inp=document.getElementById('rename-inp');
  if(!inp)return;
  const newName=inp.value.trim();
  if(!newName){notify('이름을 입력하세요','warn');return;}
  if(newName.length>20){notify('최대 20자까지 입력 가능','err');return;}
  const oldName=s.nm;
  s.nm=newName;
  closeModal();
  notify(`✏️ ${oldName} → ${newName}`,'ok');
  baekgu(`${newName}으로 이름 바꿨어. 새 출발이네.`);
  rerenderShipOrGarage();saveGame(true);
}
function setFlagship(idx){
  if(idx===0){notify('이미 기함입니다','err');return;}
  const tmp=G.fleet[0];G.fleet[0]=G.fleet[idx];G.fleet[idx]=tmp;
  const fnm=G.fleet[0]?.nm||'기함';notify('⭐ '+fnm+' 기함으로 설정!','gold');
  baekgu(fnm+' 기함 변경. 주의해서 타.');
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
  if(cur>=80){
    // 최대 80칸 경고창
    const warnModal=document.createElement('div');
    warnModal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:center;justify-content:center';
    warnModal.innerHTML=`<div style="background:#0a1628;border:2px solid var(--red);border-radius:14px;padding:28px 32px;max-width:360px;text-align:center;box-shadow:0 0 40px rgba(255,60,60,.4)">
      <div style="font-size:44px;margin-bottom:10px">🚫</div>
      <div style="color:var(--red);font-size:18px;font-weight:bold;margin-bottom:8px">화물칸 최대 한도 도달</div>
      <div style="color:var(--dim);font-size:14px;line-height:1.7;margin-bottom:18px">
        <b style="color:var(--cyan)">${s.nm}</b>의 화물칸이<br>
        최대 한도 <b style="color:var(--gold)">80칸</b>에 도달했습니다.<br>
        더 이상 확장할 수 없습니다.
      </div>
      <button class="btn btn-sm btn-red" style="padding:8px 28px;font-size:14px" onclick="this.closest('[style*=fixed]').remove()">확인</button>
    </div>`;
    document.body.appendChild(warnModal);
    return;
  }
  if(cur+2>80){notify(`화물칸 최대 80칸 한도 — +${80-cur}칸만 추가 가능`,'err');return;}
  const cost=getCargoUpgradePrice(s);
  if(G.credits<cost){notify(`크레딧 부족 (필요: ₡${cost.toLocaleString()})`,'err');return;}
  G.credits-=cost;s.cargoSlots=Math.min(80,cur+2);
  updateHUD();notify(`📦 ${s.nm} 창고 확장! (${s.cargoSlots}칸) -₡${cost.toLocaleString()}`,'ok');
  baekgu(`${s.nm} 창고 ${s.cargoSlots}칸으로 확장. ${s.cargoSlots>=80?'이제 최대야!':'다음 확장은 더 비싸질 거야.'}`);
  if(fromModal){showShipDetailModal(shipIdx);}else{rerenderShipOrGarage();}
  saveGame(true);
}
function buyCargoExtPart(id){
  const ci=SPECIAL_CARGO_PARTS.find(c=>c.id===id);if(!ci)return;
  const stock=G.shopStock[G.currentPlanet];
  if(!stock||!stock['scargo_'+id]||stock['scargo_'+id]<=0){notify('재고 없음','err');return;}
  if(G.credits<ci.price){notify(`크레딧 부족 (필요: ₡${ci.price.toLocaleString()})`,'err');return;}
  const flagship=G.fleet[0];if(!flagship){notify('기함 없음','err');return;}
  const newSlots=Math.min((flagship.cargoSlots||4)+ci.cargoBonus,80);
  G.credits-=ci.price;
  flagship.cargoSlots=newSlots;
  stock['scargo_'+id]--;
  updateHUD();
  notify(`📦 ${ci.nm} 사용 → 기함 창고 ${newSlots}칸 (+${ci.cargoBonus}) -₡${ci.price.toLocaleString()}`,'gold');
  baekgu(`기함 창고를 ${newSlots}칸으로 확장했어. ${ci.rarity==='mythic'?'신화급이라 최강이야!':''}`);
  rerenderShipOrGarage();saveGame(true);
}
function buyShip(shipId){
  const def=SHIP_CATALOG.find(s=>s.id===shipId);if(!def)return;
  const stock=G.shopStock[G.currentPlanet];
  if(!stock||!stock['ship_'+shipId]||stock['ship_'+shipId]<=0){notify('재고 없음','err');return;}
  // 함선 등급별 전투력 구매 잠금
  const _plv=calcPlayerLevel();
  if(def.tier==='중형'&&_plv<200){notify('🔒 중형 함선은 전투력 200 이상 필요 (현재 '+_plv+')','err');return;}
  if(def.tier==='대형'&&_plv<400){notify('🔒 대형 함선은 전투력 400 이상 필요 (현재 '+_plv+')','err');return;}
  if((def.tier==='전설기함'||def.tier==='신화')&&_plv<600){notify('🔒 전설/신화 함선은 전투력 600 이상 필요 (현재 '+_plv+')','err');return;}
  const shipFinalPrice=G.heroes.includes('H01')?Math.floor(def.price*0.85):def.price;
  if(G.credits<shipFinalPrice){notify(`크레딧 부족 (필요: ₡${shipFinalPrice.toLocaleString()})`,'err');return;}
  G.credits-=shipFinalPrice;stock['ship_'+shipId]--;
  const slotsByTier={소형:4,중형:8,대형:12,전설기함:16,신화:20};
  const _initCargo=(typeof def.cargoStart==='number')?def.cargoStart:(slotsByTier[def.tier]||5);
  addShipToFleet({id:def.id+'_'+Date.now(),catalogId:def.catalogId||def.id,nm:def.nm,tier:def.tier,maxHP:def.maxHP,hp:def.maxHP,maxSH:def.maxSH,sh:def.maxSH,ATT:def.ATT,INT:def.INT,TEC:def.TEC,HP:def.maxHP,LOY:80,parts:[],crewIds:[],cargoSlots:_initCargo});
  updateHUD();baekgu(`${def.nm} 구매 완료.`);notify(`🛸 ${def.nm} 구매!`,'gold');rerenderShipOrGarage();saveGame(true);
}
function buyPart(partId){
  const p=PARTS.find(x=>x.id===partId);if(!p)return;
  const stock=G.shopStock[G.currentPlanet];
  if(!stock||!stock['part_'+partId]||stock['part_'+partId]<=0){notify('재고 없음','err');return;}
  const partFinalPr=G.heroes.includes('H01')?Math.floor(p.price*0.85):p.price;
  if(G.credits<partFinalPr){notify('크레딧 부족','err');return;}
  G.credits-=partFinalPr;stock['part_'+partId]--;addToInventory(partId);
  updateHUD();notify(`⚙️ ${p.nm} 구매!`,'gold');rerenderShipOrGarage();saveGame(true);
}
function attachPart(shipIdx,partId){
  const s=G.fleet[shipIdx];if(!s)return;
  const inv=G.inventory.find(i=>i.id===partId);if(!inv||inv.qty<=0){notify('보유 파츠 없음','err');return;}
  const _stBef=getShipStats(s);
  if(!s.parts)s.parts=[];s.parts.push(partId);inv.qty--;if(inv.qty===0)G.inventory.splice(G.inventory.indexOf(inv),1);
  _syncShipCapacity(s,_stBef);
  const p=PARTS.find(x=>x.id===partId);
  notify(`${p?.nm||'파츠'} 장착 완료`,'ok');
  // 워프 엔진(블링크/타키온/테슬라) 전 함선 장착 완료 알림
  const _isWarp=WARP_ENGINE_IDS.includes(partId);
  if(_isWarp&&hasBlinkOnAll()){
    notify('⚡ 전 함선 워프 엔진 장착 완료! 은하계 모든 행성으로 순간이동 가능!','gold');
    baekgu('전 함대 워프 엔진 장착 완료! 이제 은하계 어디든 순간이동할 수 있어. 은하계 경로 열어봐!');
  } else if(_isWarp){
    const lacking=G.fleet.filter(sh=>!(sh.parts||[]).some(pid=>WARP_ENGINE_IDS.includes(pid))).length;
    baekgu(`${p?.nm||'워프 엔진'} 장착! ${G.fleet.length-lacking}/${G.fleet.length}척 완료. 전 함선 장착하면 순간이동 가능해.`);
  }
  rerenderShipOrGarage();saveGame(true);
}
function detachPart(shipIdx){
  const s=G.fleet[shipIdx];if(!s||!s.parts||s.parts.length===0){notify('장착된 파츠 없음','err');return;}
  const pid=s.parts.pop();const p=partById(pid);
  {const _stA=getShipStats(s);s.hp=Math.min(s.hp||0,_stA.HP);s.sh=Math.min(s.sh||0,_stA.maxSH);}
  addToInventory(pid);notify(`${p?.nm||'파츠'} 탈착 → 인벤토리로`,'ok');rerenderShipOrGarage();saveGame(true);
}
// 특정 인덱스의 파츠 탈착 (파츠 버튼 클릭 시 호출)
function detachPartAt(shipIdx,partIdx){
  const s=G.fleet[shipIdx];if(!s||!s.parts||s.parts.length===0){notify('장착된 파츠 없음','err');return;}
  if(partIdx<0||partIdx>=s.parts.length)return;
  const _stBef2=getShipStats(s);
  const pid=s.parts.splice(partIdx,1)[0];
  const p=partById(pid);
  {const _stA=getShipStats(s);s.hp=Math.min(s.hp||0,_stA.HP);s.sh=Math.min(s.sh||0,_stA.maxSH);}
  addToInventory(pid);notify(`${p?.nm||'파츠'} 탈착 완료 — 인벤토리로 이동`,'ok');
  rerenderShipOrGarage();saveGame(true);
}

// ═══ CREW / PLANETS ═════════════════════════════════════════════
let _crewSort='rarity'; // rarity | name | cl
function renderCrewTab(body){
  if(!body)return;
  const RORDER={L:0,H:1,R:2,N:3};
  // 레거시 세이브 호환: id 없는 크루에 id 부여
  G.crew.forEach((c,i)=>{if(!c.id)c.id='gc_l'+Date.now()+'_'+i+'_'+Math.floor(Math.random()*9999);});
  let sorted=[...G.crew];
  if(_crewSort==='rarity') sorted.sort((a,b)=>(RORDER[a.rarity]??4)-(RORDER[b.rarity]??4));
  else if(_crewSort==='name') sorted.sort((a,b)=>(a.nm||'').localeCompare(b.nm||''));
  else if(_crewSort==='cl') sorted.sort((a,b)=>(a.cl||'').localeCompare(b.cl||''));

  function sortBtn(key,label){
    const active=_crewSort===key;
    return `<button onclick="_crewSort='${key}';rerenderTab(renderCrewTab)" style="padding:4px 12px;border:1px solid ${active?'var(--cyan)':'var(--bdr)'};background:${active?'rgba(0,243,255,.12)':'transparent'};color:${active?'var(--cyan)':'var(--dim)'};cursor:pointer;border-radius:4px;font-size:12px;font-family:Courier New,monospace">${label}</button>`;
  }

  body.innerHTML=`<div class="hub-scroll">${hubBanner('crew','👥','크루')}<div class="hub-t">👥 크루 (${G.crew.length}/${getMaxCrewCount()}명)
    <span style="font-size:12px;font-weight:normal;color:var(--dim);margin-left:8px">정렬:</span>
    ${sortBtn('rarity','⭐ 등급')}${sortBtn('cl','🔧 클래스')}${sortBtn('name','🔤 이름')}
    <button onclick="dismissLowestCrew(1)" style="margin-left:10px;padding:6px 16px;border:1px solid rgba(255,80,80,.6);background:rgba(255,40,40,.12);color:rgba(255,150,150,1);cursor:pointer;border-radius:5px;font-size:13px;font-family:Courier New,monospace;font-weight:bold" title="함선 탑승 중인 크루도 강제 하선 후 방출">🚪 최하위 1명</button>
    <button onclick="dismissLowestCrew(5)" style="margin-left:4px;padding:6px 16px;border:1px solid rgba(255,80,80,.6);background:rgba(255,40,40,.12);color:rgba(255,150,150,1);cursor:pointer;border-radius:5px;font-size:13px;font-family:Courier New,monospace;font-weight:bold" title="함선 탑승 중인 크루도 강제 하선 후 방출">🚪 최하위 5명</button>
    <button onclick="dismissLowestCrew(10)" style="margin-left:4px;padding:6px 16px;border:1px solid rgba(255,80,80,.7);background:rgba(255,40,40,.15);color:rgba(255,180,180,1);cursor:pointer;border-radius:5px;font-size:13px;font-family:Courier New,monospace;font-weight:bold" title="함선 탑승 중인 크루도 강제 하선 후 일괄 방출">🚪 최하위 10명</button>
    ${_lastDismissedCrew&&_lastDismissedCrew.crew&&_lastDismissedCrew.crew.length>0?`<button onclick="undoDismissCrew()" style="margin-left:10px;padding:6px 16px;border:1px solid rgba(0,243,255,.6);background:rgba(0,243,255,.12);color:var(--cyan);cursor:pointer;border-radius:5px;font-size:13px;font-family:Courier New,monospace;font-weight:bold;animation:pulse 1.5s infinite" title="${_lastDismissedCrew.crew.map(e=>e.data.nm).join(', ')}">↺ 되돌리기 (${_lastDismissedCrew.crew.length}명)</button>`:''}
  </div>
    ${sorted.length===0?'<div style="color:var(--dim);font-size:14px">주점 가차로 크루를 영입하세요!</div>'
    :`<div class="crew-grid">${sorted.map(c=>{
      const gen=(c.ic||'👩').includes('👩')||c.nm?.endsWith('a')?'f':'m';
      const assignedShip=G.fleet.find(sh=>(sh.crewIds||[]).includes(c.id));
      const rarityNm={N:'일반',R:'희귀',H:'영웅',L:'전설',S:'스토리'}[c.rarity]||c.rarity;
      const rarityCol={N:'var(--dim)',R:'var(--blue)',H:'var(--purple)',L:'var(--gold)',S:'#ff6ec7'}[c.rarity]||'var(--dim)';
      const cb=CREW_BONUS_TABLE[c.cl]||{att:3,int2:3,tec:3,hp:0,sh:0};
      const m=RARITY_MULT[c.rarity]||1;
      const bonusTxt=Object.entries(cb).filter(([,v])=>v>0).map(([k,v])=>`${k.replace('int2','SHD').replace('att','ATT').replace('tec','ENG').replace('def','DEF')}+${Math.round(v*m)}`).join(' ');
      return`<div class="crew-c" style="border:1px solid ${assignedShip?'rgba(0,243,255,.3)':'var(--bdr)'};position:relative">
        <div class="crew-av" style="position:relative;overflow:hidden;justify-content:center">${imgOrEmoji('img/crew/'+(c.cl||'Merch')+'_'+gen+'.png',c.ic||'🧑',64,64,'border-radius:50%;background:var(--panel);border:2px solid '+rarityCol)}</div>
        <div class="crew-nm" style="color:${rarityCol};${c.rarity==='L'?'text-shadow:0 0 6px rgba(212,175,55,.5);font-size:14px':''}" title="${c.nm}">${c.nm||'(이름없음)'}</div>
        <div class="crew-cl">${c.cl}</div>
        <div style="font-size:12px;color:${rarityCol};font-weight:bold">${rarityNm}</div>
        <div style="font-size:11px;color:var(--dim);margin-top:2px">${bonusTxt||'-'}</div>
        <div style="margin-top:4px">
          ${assignedShip?`<div style="font-size:11px;color:var(--cyan);margin-bottom:3px">🛸 ${assignedShip.nm}</div>`:''}
          <select id="cs_${c.id}" style="font-size:10px;background:var(--panel);border:1px solid ${assignedShip?'var(--cyan)':'var(--bdr)'};color:white;border-radius:3px;padding:1px;width:100%">
            ${G.fleet.length===1?'':`<option value="">-- 함선 선택 --</option>`}
            ${G.fleet.map((sh,si)=>`<option value="${si}" ${assignedShip===sh||(G.fleet.length===1&&si===0)?'selected':''}>[${sh.tier}] ${sh.nm} (${(sh.crewIds||[]).length}/${getMaxCrew(sh)})</option>`).join('')}
          </select>
          <div style="display:flex;gap:4px;margin-top:4px">
            <button class="btn btn-sm" style="font-size:11px;flex:1;padding:3px 4px;${assignedShip?'border-color:var(--cyan);color:var(--cyan)':''}" onclick="assignCrewFromCrewTab('${c.id}')">${assignedShip?'🔄 이동':'🛸 탑승'}</button>
            ${assignedShip?`<button style="font-size:11px;padding:3px 6px;border:1px solid var(--red);border-radius:4px;background:none;color:var(--red);cursor:pointer" onclick="unassignCrewById('${c.id}')">하선</button>`:''}
          </div>
          <button style="margin-top:3px;font-size:10px;padding:3px 0;width:100%;border:1px solid rgba(255,60,60,.5);border-radius:5px;background:rgba(255,40,40,.08);color:rgba(255,110,110,.9);cursor:pointer" onclick="_doDismissCrew('${c.id}')">🚪 내보내기</button>
        </div>
      </div>`;
    }).join('')}</div>`}
    ${G.heroes.length>0?`<div class="hub-t" style="margin-top:16px">⚡ 영입된 전설 영웅</div><div class="crew-grid">${G.heroes.map(h=>{
  const hd=HEROES[h];
  const aboard=G.fleet.find(sh=>(sh.crewIds||[]).includes(h));
  const freeShips=G.fleet.filter(sh=>!(sh.crewIds||[]).includes(h)&&(sh.crewIds||[]).length<getMaxCrew(sh));
  const _hrr=getRepRank(G.reputation||0);
  return`<div class="crew-c" style="border:1px solid var(--gold);padding:10px">
    <div class="crew-av">${hd.ic}</div>
    <div class="crew-nm" style="color:var(--gold)">${hd.nm}</div>
    <div class="crew-cl" style="color:var(--purple)">${hd.sk}</div>
    <div class="cr-L">전설 ×1.2</div>
    <div style="margin-top:4px;font-size:11px;color:${_hrr.col};border:1px solid ${_hrr.col};border-radius:8px;padding:1px 6px;display:inline-block">${_hrr.ic} 명성: ${_hrr.lb}</div>
    <div style="margin-top:4px">
      ${aboard?`<div style="font-size:11px;color:var(--cyan);margin-bottom:3px">🛸 ${aboard.nm} 탑승 중</div>`:''}
      <select id="hero-ship-${h}" style="background:var(--panel);border:1px solid var(--gold);color:var(--gold);border-radius:3px;padding:2px;font-size:11px;width:100%">
        <option value="">-- 탑승 함선 --</option>
        ${G.fleet.map((sh,si)=>`<option value="${si}" ${aboard===sh?'selected':''}>[${sh.tier}] ${sh.nm} (${(sh.crewIds||[]).length}/${getMaxCrew(sh)})</option>`).join('')}
      </select>
      <div style="display:flex;gap:3px;margin-top:3px">
        <button onclick="boardHeroToShip('${h}')" style="font-size:11px;flex:1;padding:2px 8px;border:1px solid var(--gold);border-radius:3px;background:rgba(212,175,55,.1);color:var(--gold);cursor:pointer">${aboard?'🔄 함선 변경':'⭐ 탑승'}</button>
        ${aboard?`<button onclick="unassignHero('${h}')" style="font-size:11px;padding:2px 6px;border:1px solid var(--red);border-radius:3px;background:none;color:var(--red);cursor:pointer">하선</button>`:''}
      </div>
    </div>
  </div>`;}).join('')}</div>`:''}
  </div>`;
}
function unassignCrewById(cid){
  G.fleet.forEach(sh=>{
    if(!sh.crewIds)return;
    const i=sh.crewIds.indexOf(cid);
    if(i>=0){
      sh.crewIds.splice(i,1);
      const c=G.crew.find(x=>x.id===cid);
      notify(`${c?.ic||'🧑'} ${c?.nm||'크루'} 하선`,'ok');
    }
  });
  rerenderShipOrGarage();saveGame(true);
}
// ── 크루 내보내기 확인 팝업 ──────────────────────────────────────
function confirmDismissCrew(cid){
  const c=G.crew.find(x=>x.id===cid);
  if(!c){notify('크루를 찾을 수 없습니다','err');return;}
  if(c.rarity==='L'||c.rarity==='H'){
    openModal(`${c.ic||'🧑'} ${c.nm} 내보내기`,
      `<div style="padding:12px;text-align:center">
        <div style="font-size:34px;margin-bottom:8px">${c.ic||'🧑'}</div>
        <div style="font-size:17px;font-weight:bold;margin-bottom:6px">${c.nm}</div>
        <div style="color:${c.rarity==='L'?'var(--gold)':'var(--purple)'};font-size:14px;margin-bottom:12px">
          ⚠️ ${c.rarity==='L'?'전설':'영웅'}급 크루입니다! 내보내면 복구할 수 없습니다.
        </div>
        <div style="font-size:13px;color:var(--dim)">정말 내보내시겠습니까?</div>
      </div>`,
      [{txt:'내보내기',fn:()=>{closeModal();_doDismissCrew(cid);},cls:'btn-red'},
       {txt:'취소',fn:closeModal,cls:'btn-sm'}]);
  } else {
    openModal(`크루 내보내기`,
      `<div style="padding:12px;text-align:center">
        <div style="font-size:34px;margin-bottom:8px">${c.ic||'🧑'}</div>
        <div style="font-size:16px;font-weight:bold;margin-bottom:10px">${c.nm} 내보내기</div>
        <div style="font-size:13px;color:var(--dim)">이 크루를 함대에서 내보내시겠습니까?</div>
      </div>`,
      [{txt:'내보내기',fn:()=>{closeModal();_doDismissCrew(cid);},cls:'btn-red'},
       {txt:'취소',fn:closeModal,cls:'btn-sm'}]);
  }
}
function _doDismissCrew(cid){
  // 먼저 하선 처리 (어느 함선에 탔는지 기억)
  let savedShipIdx=null;
  G.fleet.forEach((sh,si)=>{
    if(!sh.crewIds)return;
    const i=sh.crewIds.indexOf(cid);
    if(i>=0){sh.crewIds.splice(i,1);if(savedShipIdx===null)savedShipIdx=si;}
  });
  const idx=G.crew.findIndex(x=>x.id===cid);
  if(idx>=0){
    const c=G.crew[idx];
    // 되돌리기 저장 (통합 배열 포맷: crew: [{data, shipIdx, insertIdx}])
    _lastDismissedCrew={crew:[{data:JSON.parse(JSON.stringify(c)),shipIdx:savedShipIdx,insertIdx:idx}]};
    G.crew.splice(idx,1);
    notify(`${c.ic||'🧑'} ${c.nm} 내보냄 — 상단 되돌리기 버튼으로 복원 가능`,'ok');
  }
  rerenderTab(renderCrewTab);saveGame(true);
}
// 통합 되돌리기 — 단일/일괄 내보내기 모두 복원 (마지막 작업만)
function undoDismissCrew(){
  if(!_lastDismissedCrew||!_lastDismissedCrew.crew||_lastDismissedCrew.crew.length===0){
    notify('되돌릴 크루가 없습니다','err');return;
  }
  let restored=0,reseated=0;
  _lastDismissedCrew.crew.forEach(entry=>{
    if(!G.crew)G.crew=[];
    // 중복 ID 방지: 같은 ID 존재 시 새 ID 부여
    const dup=G.crew.find(x=>x.id===entry.data.id);
    const c=dup?{...entry.data,id:entry.data.id+'_r'+Date.now()+Math.floor(Math.random()*999)}:entry.data;
    // 원래 위치(insertIdx)에 가깝게 복원
    const idx=typeof entry.insertIdx==='number'?Math.min(entry.insertIdx,G.crew.length):G.crew.length;
    G.crew.splice(idx,0,c);
    restored++;
    // 원래 탑승했던 함선에 자동 복귀 (좌석 여유 + 중복 없음)
    if(entry.shipIdx!=null&&G.fleet[entry.shipIdx]){
      const sh=G.fleet[entry.shipIdx];
      if(!sh.crewIds)sh.crewIds=[];
      const cap=getMaxCrew(sh);
      if(sh.crewIds.length<cap&&!sh.crewIds.includes(c.id)){
        sh.crewIds.push(c.id);reseated++;
      }
    }
  });
  notify(`↺ 크루 ${restored}명 복원${reseated>0?` (${reseated}명 자동 탑승)`:''}`,'ok');
  _lastDismissedCrew=null;
  rerenderTab(renderCrewTab);saveGame(true);
}
// ── 시스템 메뉴 토글 ──────────────────────────────────────────────
function toggleSysMenu(){
  const menu=document.getElementById('sys-menu');
  const arrow=document.getElementById('sys-sec-arrow');
  if(!menu)return;
  const isOpen=menu.style.maxHeight&&menu.style.maxHeight!=='0px'&&menu.style.maxHeight!=='';
  menu.style.maxHeight=isOpen?'0px':'300px';
  if(arrow)arrow.textContent=isOpen?'▲':'▼';
}
// ── 주점 가챠 ─────────────────────────────────────────────────────
function doGacha(n,useCr,crCost,minRarity){
  if(!G.gachaPity)G.gachaPity=0;
  const _crCost=crCost||500;
  const cost_vc=useCr?0:n;
  const cost_cr=useCr?_crCost:0;
  if(useCr&&G.credits<cost_cr){notify('크레딧이 부족합니다','err');return;}
  if(!useCr&&G.voidCrystal<cost_vc){notify('보이드 크리스탈이 부족합니다','err');return;}
  if(useCr)G.credits-=cost_cr;else G.voidCrystal-=cost_vc;
  try{AudioMgr.playSfx('gacha_pull');}catch(e){}
  // 넬슨 영웅 보유 시 전설 확률 +10%
  const hasNelson=G.heroes&&G.heroes.includes('H05');
  const results=[];
  const CLASSES=['Pilot','Eng','Merch'];
  for(let pull=0;pull<n;pull++){
    G.gachaPity++;
    const pity=G.gachaPity;
    // 확률 계산: 전설(L), 영웅(H), 희귀(R), 일반(N)
    let pL=0.005+(hasNelson?0.1:0)+(pity>=80?1:pity>=60?(pity-60)/20*0.495:0);
    // minRarity 기반 확률 재조정
    const _minR=minRarity||'N';
    let pH=0.055,pR=0.24;
    if(_minR==='R'){// 희귀~전설: 일반 제거 → pR = 1-pL-pH
      pR=Math.max(0.4,1-pL-pH);pH=Math.min(pH,1-pL-pR);
    } else if(_minR==='H'){// 영웅~전설: 일반+희귀 제거 → pH = 1-pL
      pH=Math.max(0.55,1-pL);pR=0;
    } else if(_minR==='L'){// 전설 확정
      pL=1;pH=0;pR=0;
    }
    const roll=Math.random();
    let rarity;
    if(roll<pL){rarity='L';G.gachaPity=0;}
    else if(roll<pL+pH){rarity='H';}
    else if(roll<pL+pH+pR){rarity='R';}
    else{rarity=_minR==='N'?'N':'R';}
    // 크루 생성
    const statMul={N:1,R:1.5,H:2.5,L:4}[rarity];
    const cl=CLASSES[Math.floor(Math.random()*CLASSES.length)];
    let newCrew;
    if(rarity==='L'){
      // 전설 등급 — 30% 확률로 8인의 영웅(H01~H08) 중 미영입 영웅 등장
      // 단, 현재 행성당 영웅 최대 2명 제한 (행성별 카운터)
      // 70%는 기존 QUEST_LEGEND_CREW 풀에서 선정
      if(!G.planetHeroCount)G.planetHeroCount={};
      const _curPid=G.currentPlanet;
      const _phCountG=G.planetHeroCount[_curPid]||0;
      // H01 이순신은 난중일기 영인본(G18) 보유 시에만 풀 포함 — 없으면 다음 기회로 보존
      const _hasG18=!!(G.inventory&&G.inventory.find(i=>i.id==='G18'&&i.qty>0));
      const _unrecruitedHeroes=Object.keys(HEROES||{}).filter(hid=>!(G.heroes||[]).includes(hid)&&(hid!=='H01'||_hasG18));
      if(_unrecruitedHeroes.length>0&&_phCountG<2&&Math.random()<0.30){
        const _hid=_unrecruitedHeroes[Math.floor(Math.random()*_unrecruitedHeroes.length)];
        G.planetHeroCount[_curPid]=_phCountG+1;
        // 영웅은 G.heroes에 추가하므로 특수 플래그로 표시 (이후 모달 트리거)
        results.push({_heroRoll:_hid,nm:HEROES[_hid].nm,ic:HEROES[_hid].ic,rarity:'S',cl:HEROES[_hid].cl||'Pilot',isHero:true});
        continue;  // 일반 크루 처리 건너뜀
      }
      // 전설은 QUEST_LEGEND_CREW 풀에서
      const pool=(typeof QUEST_LEGEND_CREW!=='undefined'?QUEST_LEGEND_CREW:[]).filter(c=>!G.crew.find(x=>x.id===c.id));
      if(pool.length>0){
        const base=pool[Math.floor(Math.random()*pool.length)];
        newCrew={...base,id:base.id+'_g'+Date.now()+'_'+pull};
      }
    }
    if(!newCrew){
      // NPC_POOL에서 랜덤 선택 또는 생성
      const npcPool=typeof NPC_POOL!=='undefined'?NPC_POOL:[];
      const base=npcPool.length>0?npcPool[Math.floor(Math.random()*npcPool.length)]:{nm:'우주 방랑자',cl:'Pilot',ic:'🧑',f:'F01'};
      const baseDEX={Pilot:30,Eng:15,Merch:20}[cl]||20;
      const baseINT={Pilot:15,Eng:30,Merch:25}[cl]||20;
      const baseTEC={Pilot:20,Eng:30,Merch:15}[cl]||20;
      const baseSTR={Pilot:30,Eng:15,Merch:20,Sniper:40,Mage:15,Engineer:10,Commander:25}[cl]||20;
      const baseDEX2={Pilot:20,Eng:30,Merch:15,Sniper:10,Mage:20,Engineer:35,Commander:20}[cl]||20;
      const baseINT2={Pilot:15,Eng:30,Merch:25,Sniper:10,Mage:40,Engineer:25,Commander:20}[cl]||20;
      const baseDEF={Pilot:10,Eng:15,Merch:8,Sniper:5,Mage:20,Engineer:25,Commander:20}[cl]||10;
      newCrew={
        id:'gc_'+Date.now()+'_'+pull+'_'+Math.floor(Math.random()*9999),
        nm:base.nm,cl:cl,ic:base.ic||'🧑',f:base.f||'F01',
        rarity,
        STR:Math.round(baseSTR*statMul),ATT:Math.round(baseDEX2*statMul),
        INT:Math.round(baseINT2*statMul),DEF:Math.round(baseDEF*statMul),
        HP:Math.round(80*statMul),LOY:Math.round(60+Math.random()*40)
      };
    }
    if(!G.crew)G.crew=[];
    const _maxCrew=getMaxCrewCount();
    if(G.crew.length>=_maxCrew){
      // 신규 크루가 현재 최하위보다 등급이 높으면 교체 팝업 제안
      const RORDER={L:4,H:3,R:2,N:1};
      const newRank=RORDER[newCrew.rarity]||1;
      // 함선 탑승 여부 무관 — 모든 크루 중 최하위를 교체 후보로 선정 (탑승 중이라도 강제 교체)
      const assignedIds=new Set(G.fleet.flatMap(s=>s.crewIds||[]));
      const lowest=[...G.crew].sort((a,b)=>{
        const ra=RORDER[a.rarity]||1,rb=RORDER[b.rarity]||1;
        if(ra!==rb)return ra-rb;
        // 동등급이면 미배정 우선 (탑승 중인 크루는 후순위)
        return (assignedIds.has(a.id)?1:0)-(assignedIds.has(b.id)?1:0);
      })[0];
      const lowestRank=lowest?RORDER[lowest.rarity]||1:0;
      // 신규 크루가 최하위보다 등급이 더 높을 때만 교체 제안
      if(lowest&&newRank>lowestRank){
        results.push({...newCrew,_swapCandidate:true,_swapTarget:lowest});
      } else if(lowest){
        // 같은 등급이라도 탑승 중이 아닌 경우 교체 제안 (기존 동작 유지)
        if(!assignedIds.has(lowest.id)){
          results.push({...newCrew,_swapCandidate:true,_swapTarget:lowest});
        } else {
          notify(`크루 명단이 가득 찼습니다 (최대 ${_maxCrew}명) — 신규 크루가 더 우수하지 않음`,'err');
          results.push({...newCrew,_rejected:true});
        }
      } else {
        notify(`크루 명단이 가득 찼습니다 (최대 ${_maxCrew}명)`,'err');
        results.push({...newCrew,_rejected:true});
      }
      continue;
    }
    G.crew.push(newCrew);
    results.push(newCrew);
  }
  updateHUD();
  // 교체 후보 처리: 팝업 띄우기
  const swapCandidates=results.filter(r=>r._swapCandidate);
  if(swapCandidates.length>0){
    const sc=swapCandidates[0];
    const RARLBL={L:'전설',H:'영웅',R:'희귀',N:'일반',S:'스토리'};
    const RARCOL={L:'var(--gold)',H:'var(--purple)',R:'var(--blue)',N:'var(--dim)',S:'#ff6ec7'};
    const CREW_BONUS_LBL={Pilot:{att:8,int2:2,tec:4},Eng:{att:2,int2:5,tec:8},Merch:{att:3,int2:7,tec:4},Sniper:{att:10,int2:0,tec:3},Mage:{att:0,int2:10,tec:3},Engineer:{att:1,int2:3,tec:10},Commander:{att:5,int2:5,tec:5}};
    const tgt=sc._swapTarget;
    function _crewCard(c,roleColor,roleBg,roleLabel){
      const rar=c.rarity||'N';
      const rcol=RARCOL[rar]||'var(--dim)';
      const rlbl=RARLBL[rar]||rar;
      const cl=c.cl||'-';
      const mult=RARITY_MULT[rar]||1;
      const cb=CREW_BONUS_LBL[cl]||{att:3,int2:3,tec:3};
      const bonusTxt=['att','int2','tec'].filter(k=>cb[k]>0)
        .map(k=>`${k.replace('int2','SHD').replace('att','ATT').replace('tec','ENG')}+${Math.round(cb[k]*mult)}`).join(' · ');
      const gen=(c.ic||'👩').includes('👩')||(c.nm||'').endsWith('a')?'f':'m';
      const imgSrc='img/crew/'+(c.cl||'Merch')+'_'+gen+'.png';
      return `<div style="flex:1;min-width:0;padding:10px;background:${roleBg};border:1px solid ${roleColor};border-radius:8px;display:flex;flex-direction:column;gap:6px">
        <div style="display:flex;align-items:center;gap:8px">
          ${imgOrEmoji(imgSrc,c.ic||'🧑',56,56,'border-radius:50%;border:2px solid '+rcol+';background:var(--panel);flex-shrink:0')}
          <div style="flex:1;min-width:0">
            <div style="font-size:10px;color:${roleColor};font-weight:bold">${roleLabel}</div>
            <div style="font-size:14px;font-weight:bold;color:${rcol};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.nm||'(이름없음)'}</div>
            <div style="font-size:11px;color:var(--dim)">${cl} · <span style="color:${rcol};font-weight:bold">${rlbl}</span> 등급${c.f?' · '+c.f:''}</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 8px;font-size:11px;background:rgba(0,0,0,.25);padding:6px 8px;border-radius:5px">
          <span style="color:#f88">💪 STR ${c.STR||0}</span>
          <span style="color:#fa8">⚔ ATT ${c.ATT||0}</span>
          <span style="color:#af8">🔮 INT ${c.INT||0}</span>
          <span style="color:var(--gold)">🛡 DEF ${c.DEF||0}</span>
          <span style="color:#f99">❤ HP ${c.HP||0}</span>
          <span style="color:#9cf">💖 LOY ${c.LOY||0}</span>
        </div>
        <div style="font-size:11px;color:var(--cyan);background:rgba(0,243,255,.08);border:1px solid rgba(0,243,255,.2);border-radius:5px;padding:5px 8px">
          🚀 함선 보너스: <b>${bonusTxt||'없음'}</b>
        </div>
        ${c.desc?`<div style="font-size:11px;color:var(--dim);line-height:1.4">${c.desc}</div>`:''}
      </div>`;
    }
    openModal('🔄 고등급 크루 영입 제안',
      `<div style="padding:10px 4px">
        <div style="font-size:14px;font-weight:bold;margin-bottom:10px;color:var(--cyan);text-align:center">크루 명단이 꽉 찼습니다 — 교체 여부를 선택하세요</div>
        <div style="display:flex;gap:12px;align-items:stretch;margin-bottom:10px">
          ${_crewCard(tgt,'var(--red)','rgba(255,59,59,.08)','🚪 내보낼 크루')}
          <div style="display:flex;align-items:center;justify-content:center;font-size:26px;color:var(--gold);flex-shrink:0">➡️</div>
          ${_crewCard(sc,'var(--cyan)','rgba(0,243,255,.08)','✨ 영입 후보')}
        </div>
        <div style="font-size:12px;color:var(--dim);text-align:center;line-height:1.6">
          <b style="color:var(--red)">${tgt.nm}</b> 을 내보내고 <b style="color:var(--cyan)">${sc.nm}</b> 을 영입합니다.<br>
          📊 함선 보너스(클래스 × 등급)·기본 스탯·충성도를 비교해서 결정하세요.
        </div>
      </div>`,
      [{txt:'✅ 교체 영입',fn:()=>{
        closeModal();
        // 내보낼 크루 제거
        G.fleet.forEach(s=>{if(s.crewIds){const i=s.crewIds.indexOf(tgt.id);if(i>=0)s.crewIds.splice(i,1);}});
        const tidx=G.crew.findIndex(x=>x.id===tgt.id);
        if(tidx>=0)G.crew.splice(tidx,1);
        // 신규 크루 추가
        delete sc._swapCandidate;delete sc._swapTarget;
        G.crew.push(sc);
        notify(`🔄 ${tgt.nm} → ${sc.nm} 교체 영입!`,'gold');
        renderGachaCards(results.filter(r=>!r._swapCandidate&&!r._rejected));
        saveGame(true);
        baekgu(`${sc.nm} 합류! ${tgt.nm}은 하선했어.`);
      },cls:'btn-gold'},{txt:'❌ 거절',fn:()=>{
        closeModal();
        renderGachaCards(results.filter(r=>!r._swapCandidate&&!r._rejected));
        saveGame(true);
        baekgu('영입 거절. 현재 크루 유지.');
      },cls:'btn-sm'}],{wide:true});
  } else {
    renderGachaCards(results.filter(r=>!r._rejected&&!r._heroRoll));
    saveGame(true);
    baekgu(results.some(r=>r._heroRoll)?'전설 영웅 등장! 대박이야!':results.some(r=>r.rarity==='L')?'전설급이야! 대박!':results.some(r=>r.rarity==='H')?'영웅급 크루 영입!':'크루 영입 완료. 함선에 탑승시켜봐.');
  }
  // 🎉 8인의 전설 영웅 등장 시 — 가챠 결과 카드 표시 후 영입 모달 순차 호출
  const _heroRolls=results.filter(r=>r._heroRoll).map(r=>r._heroRoll);
  if(_heroRolls.length>0){
    try{
      AudioMgr.playSfx('gacha_pull',{vol:1.0,cooldown:50});
      setTimeout(()=>{try{AudioMgr.playSfx('notify',{vol:0.9,cooldown:60});}catch(e){}},250);
    }catch(e){}
    // 각 영웅마다 1초 간격으로 모달 호출 (수동 영입 결정)
    _heroRolls.forEach((hid,i)=>{
      setTimeout(()=>{try{showHeroRecruit(hid);}catch(e){console.error(e);}},900+i*500);
    });
    notify(`⭐ 전설 영웅 ${_heroRolls.length}명 등장!`,'gold');
  }
  // 🎉 영웅/전설/신화 크루 등장 시 축하 효과음 + 팝업
  const rareResults=results.filter(r=>!r._rejected&&!r._heroRoll&&(r.rarity==='L'||r.rarity==='H'||r.rarity==='S'));
  if(rareResults.length>0){
    // 효과음: 전설은 더 강조
    try{
      const hasLegend=rareResults.some(r=>r.rarity==='L'||r.rarity==='S');
      AudioMgr.playSfx(hasLegend?'gacha_pull':'notify',{vol:hasLegend?1.0:0.85,cooldown:50});
      setTimeout(()=>{try{AudioMgr.playSfx('notify',{vol:0.9,cooldown:60});}catch(e){}},200);
    }catch(e){}
    setTimeout(()=>{
      const _crewBonusLbl={Pilot:{att:8,int2:2,tec:4},Eng:{att:2,int2:5,tec:8},Merch:{att:3,int2:7,tec:4},Sniper:{att:10,int2:0,tec:3},Mage:{att:0,int2:10,tec:3},Engineer:{att:1,int2:3,tec:10},Commander:{att:5,int2:5,tec:5}};
      const items=rareResults.map(c=>{
        const cl=c.cl||'Merch';
        const mult=RARITY_MULT[c.rarity]||1;
        const cb=_crewBonusLbl[cl]||{att:3,int2:3,tec:3};
        const bonusTxt=['att','int2','tec'].filter(k=>cb[k]>0).map(k=>`${k.replace('int2','SHD').replace('att','ATT').replace('tec','ENG')}+${Math.round(cb[k]*mult)}`).join(' · ');
        const gen=(c.ic||'👩').includes('👩')||(c.nm||'').endsWith('a')?'f':'m';
        const imgSrc='img/crew/'+(c.cl||'Merch')+'_'+gen+'.png';
        return{ic:c.ic||'🧑',img:imgSrc,nm:c.nm,type:`${cl} · LOY ${c.LOY||80}`,rarity:c.rarity,stats:bonusTxt,desc:c.desc||c.sk||''};
      });
      const hasL=rareResults.some(r=>r.rarity==='L'||r.rarity==='S');
      showAcquisitionReport({
        title:hasL?'⭐ 전설급 크루 등장!':'⭐ 영웅급 크루 영입!',
        subtitle:'주점 가챠 결과',
        items,
        color:hasL?'var(--gold)':'var(--purple)',
        sfx:null,  // 이미 위에서 재생함
        congrats:hasL?'대박! 전설급 동료가 합류!':'영웅급 동료가 합류!'
      });
    },600);
  }
  // 전설 영웅(H01~H08) 가챠 출현 제거 — 지정 행성 퀘스트 보상에서만 5% 확률 등장
}
function dismissLowestCrew(n){
  const RORDER={L:0,H:1,R:2,N:3};
  // 함선 탑승 여부 무관 강제 정렬 (낮은 등급 우선, 동등급은 미배정 우선)
  const assignedIds=new Set(G.fleet.flatMap(s=>s.crewIds||[]));
  const candidates=[...G.crew].sort((a,b)=>{
    const ra=RORDER[a.rarity]??4,rb=RORDER[b.rarity]??4;
    if(ra!==rb)return rb-ra;
    return (assignedIds.has(a.id)?1:0)-(assignedIds.has(b.id)?1:0);
  });
  const targets=candidates.slice(0,n);
  if(targets.length===0){notify('내보낼 크루가 없습니다','warn');return;}
  const names=targets.map(c=>c.nm+(assignedIds.has(c.id)?'⚓':'')).join(', ');
  const rarSummary=[...targets.reduce((m,c)=>{m.set(c.rarity,(m.get(c.rarity)||0)+1);return m;},new Map())].map(([r,cnt])=>`${r}×${cnt}`).join(' / ');
  const assignedCount=targets.filter(c=>assignedIds.has(c.id)).length;
  const warningHtml=assignedCount>0
    ? `<div style="font-size:12px;color:var(--red);margin-top:6px;background:rgba(255,40,40,.08);border-left:3px solid var(--red);padding:6px 10px">⚠️ 함선 탑승 중 <b>${assignedCount}명 포함</b> — 강제 하선 후 방출됩니다</div>`
    : '';
  openModal('🚪 크루 강제 내보내기',
    `<div style="padding:12px">
      <div style="font-size:16px;font-weight:bold;margin-bottom:8px">최하위 ${targets.length}명을 내보냅니까?</div>
      <div style="font-size:13px;color:var(--dim);margin-bottom:6px">${rarSummary} | ⚓ = 탑승 중</div>
      <div style="font-size:12px;color:rgba(255,200,100,.8);max-height:120px;overflow-y:auto;line-height:1.6">${names}</div>
      ${warningHtml}
      <div style="font-size:11px;color:var(--cyan);margin-top:8px">💡 내보낸 후 <b>되돌리기</b> 버튼으로 복원 가능 (마지막 작업만)</div>
    </div>`,
    [{txt:`${targets.length}명 강제 내보내기`,fn:()=>{
      closeModal();
      // Undo 스냅샷: 통합 포맷 (단일 dismiss와 동일)
      const entries=targets.map(c=>{
        let shipIdx=null;
        G.fleet.forEach((s,si)=>{if(s.crewIds&&s.crewIds.includes(c.id))shipIdx=si;});
        const insertIdx=G.crew.findIndex(x=>x.id===c.id);
        return{data:JSON.parse(JSON.stringify(c)),shipIdx,insertIdx};
      });
      _lastDismissedCrew={crew:entries};
      // 함선에서 강제 하선 + 크루 명단에서 삭제
      targets.forEach(c=>{
        G.fleet.forEach(s=>{if(s.crewIds){const i=s.crewIds.indexOf(c.id);if(i>=0)s.crewIds.splice(i,1);}});
        const idx=G.crew.findIndex(x=>x.id===c.id);
        if(idx>=0)G.crew.splice(idx,1);
      });
      notify(`🚪 크루 ${targets.length}명 강제 내보냄 — 되돌리기 가능`,'ok');
      rerenderTab(renderCrewTab);saveGame(true);
    },cls:'btn-red'},{txt:'취소',fn:closeModal,cls:'btn-sm'}]);
}
function assignCrewFromCrewTab(cid){
  const sel=document.getElementById('cs_'+cid);
  // 함선이 1개이면 자동 선택 (idx 0)
  if(sel&&(sel.value===''||sel.options.length===1)&&G.fleet.length===1)sel.value='0';
  if(!sel||sel.value===''){notify('탑승할 함선을 먼저 선택하세요','warn');return;}
  const shipIdx=parseInt(sel.value);
  if(isNaN(shipIdx)){notify('함선 선택 오류','err');return;}
  const s=G.fleet[shipIdx];
  if(!s){notify('함선을 찾을 수 없습니다','err');return;}
  if(!s.crewIds)s.crewIds=[];
  // 이미 이 함선에 탑승 중
  if(s.crewIds.includes(cid)){notify('이미 이 함선에 탑승 중입니다','warn');return;}
  // 최대 탑승 인원 체크 (함선 티어별 상이)
  const _maxSlots=getMaxCrew(s);
  const _allP=[...G.crew,...(G.heroes||[]).map(h=>Object.assign({},HEROES[h],{id:h,rarity:'S',isHero:true}))];
  const _newC=_allP.find(x=>x.id===cid);
  const _newCost=getCrewSlotCost(_newC);
  const _usedSlots=getTotalSlotUsed(s);
  if(_usedSlots+_newCost>_maxSlots){notify(`${s.nm} 슬롯 부족 (${_usedSlots}+${_newCost}칸 > 최대 ${_maxSlots}칸)`,'err');return;}
  // 다른 함선에서 자동 이전
  G.fleet.forEach(sh=>{if(sh.crewIds){const i=sh.crewIds.indexOf(cid);if(i>=0)sh.crewIds.splice(i,1);}});
  const _stBefACT=getShipStats(s);
  s.crewIds.push(cid);
  _syncShipCapacity(s,_stBefACT);
  const allPeople=[...G.crew,...G.heroes.map(h=>({...HEROES[h],id:h,rarity:'S',isHero:true}))];
  const c=allPeople.find(x=>x.id===cid);
  notify(`${c?.ic||'🧑'} ${c?.nm||'크루'} → ${s.nm} 탑승 완료!`,'ok');
  baekgu(`${c?.nm||'크루'} ${s.nm}에 탑승. 함선 성능 올라갔어.`);
  rerenderTab(renderCrewTab);saveGame(true);
}
function renderPlanetsTab(body){
  if(!body)return;
  const list=PLANET_DEF.filter(p=>G.planets[p.id]?.fog!=='L');
  body.innerHTML=`<div class="hub-scroll">${hubBanner('route','🌌','은하계 경로')}<div class="hub-t">🌍 탐험한 행성</div>
    <div style="color:var(--dim);font-size:13px;margin-bottom:12px">💡 보유 행성에 투자 → 상업 레벨↑ → 턴당 세금 증가 (최대 Lv10)</div>
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px">${list.map(p=>{
      const st=G.planets[p.id],f=FACTION[p.f],lv=st.commerce||0;
      const tax=calcTaxFor(p.id),investCost=Math.floor(p.tax*7.2*Math.pow(1.548,lv)*(1+G.act/2)*0.56);
      const fEmoji=FACTION_EMOJI[p.f]||(p.void?'🌀':p.hostile?'💀':'🌐');
      const pBg=p.hostile?'#1a0505':p.void?'#0a0518':'#0a1828';
      return `<div style="background:var(--card);border:1px solid ${st.owned?'var(--gold)':'var(--bdr)'};border-radius:10px;overflow:hidden;display:flex;flex-direction:row;min-height:130px">
        <!-- 좌측: 행성 정보 + 투자 버튼 -->
        <div style="flex:1;padding:12px;display:flex;flex-direction:column;gap:5px;min-width:0">
          <div style="display:flex;align-items:center;gap:7px;margin-bottom:2px;flex-wrap:wrap">
            <div style="font-size:16px;font-weight:bold">${p.nm}</div>
            <span style="${st.fog==='S'?'color:var(--blue)':'color:var(--green)'};font-size:11px;border:1px solid;padding:1px 6px;border-radius:8px">${st.fog==='S'?'탐색됨':'방문중'}</span>
            ${st.owned?'<span style="color:var(--gold);font-size:11px;border:1px solid var(--gold);padding:1px 6px;border-radius:8px">🏠 보유</span>':''}
          </div>
          <div style="font-size:12px;color:${f.col}">${f.nm}${p.hostile?' | ⚠️적대':''}${p.void?' | 🌀균열':''} | 링${p.ring}</div>
          ${st.owned?`<div style="display:flex;flex-direction:column;gap:4px;margin-top:2px">
            <div style="display:flex;justify-content:space-between;font-size:12px"><span style="color:var(--dim)">상업 레벨</span><span style="color:var(--gold)">Lv${lv}/10</span></div>
            <div style="height:6px;background:var(--panel);border-radius:3px;overflow:hidden"><div style="width:${lv*10}%;height:100%;background:linear-gradient(90deg,var(--gold),#ffaa00);border-radius:3px"></div></div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              <span style="color:var(--green);font-size:13px">₡${tax.toLocaleString()}/턴</span>
              ${lv<10?`<button class="btn btn-sm btn-gold" style="font-size:11px;padding:3px 8px" onclick="investPlanet('${p.id}')" ${G.credits>=investCost?'':'disabled'}>투자 Lv${lv+1} (₡${investCost.toLocaleString()})</button>`:'<span style="color:var(--gold);font-size:11px">⭐최대레벨</span>'}
            </div>
          </div>`:
          `<div style="font-size:12px;color:var(--dim)">기본 세율: ₡${p.tax.toLocaleString()}/턴</div>`}
        </div>
        <!-- 우측: 행성 이미지 꽉채움 -->
        <div style="width:110px;flex-shrink:0;overflow:hidden;background:${pBg};position:relative">
          <img src="img/planets/${p.id}.png" style="width:100%;height:100%;object-fit:cover;opacity:.9"
            onerror="this.outerHTML='<div style=\'width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:44px\'>${fEmoji}</div>'" />
        </div>
      </div>`;
    }).join('')}</div>
  </div>`;
}
function investPlanet(pid){
  const pd=PLANET_DEF.find(p=>p.id===pid),st=G.planets[pid];if(!pd||!st||!st.owned)return;
  const lv=st.commerce||0;if(lv>=10){notify('최대 레벨','err');return;}
  // 화면에 표시된 비용과 정확히 동일한 공식 사용 (이전 버그: 2.15^lv*1.0 사용으로 큰 금액 차감됨)
  const cost=Math.floor(pd.tax*7.2*Math.pow(1.548,lv)*(1+G.act/2)*0.56);
  if(G.credits<cost){notify(`투자비용 ₡${cost.toLocaleString()} 부족`,'err');return;}
  G.credits-=cost;st.commerce=lv+1;
  updateHUD();notify(`📈 ${pd.nm} Lv${lv+1} 업그레이드! ₡${calcTaxFor(pid).toLocaleString()}/턴`,'gold');
  baekgu(`${pd.nm} 상업 레벨 ${lv+1}. 세금 ₡${calcTaxFor(pid).toLocaleString()} 들어온다.`);
  saveGame(true);
  // 현재 활성 탭에 맞춰 재렌더 (탭 강제 전환 방지)
  const _curTab=G._currentHubTab;
  if(_curTab==='auction'&&typeof renderAuctionView==='function')rerenderTab(renderAuctionView);
  else if(_curTab==='front'&&typeof renderFrontView==='function')rerenderTab(renderFrontView);
  else rerenderTab(renderPlanetsTab);
}

// ═══ QUEST SYSTEM ════════════════════════════════════════════════
const QUEST_TEMPLATES=[
  {type:'combat',ic:'⚔️',npc:'제독',npcIc:'🎖️',
   titles:['해적 함대 소탕','치크스 정찰대 격퇴','밀수선 차단','항로 순찰 지원'],
   descs:[
     '제독 로한: 이 항로에 해적단이 자리 잡았어. 우리 상선이 매일 털리고 있다네. 자네 함대로 쓸어버려 주게. 사례는 두둑이 챙겨두겠네.',
     '제독 로한: 치크스 정찰대 몇 척이 우리 영공에 들어왔다. 격퇴하고 잔해 보고만 해주면 보상은 약속하지. 무리하지 말게.',
     '제독 로한: 비밀 정보야. 밀수선 한 척이 곧 이 항로를 지난다. 차단해서 화물을 압수해주면 분담금을 후하게 쳐주지.',
     '제독 로한: 우리 순찰대가 손이 모자라네. 자네가 같이 한 바퀴 돌아주면 정식 보수는 챙겨주마. 어렵지 않은 일이야.'
   ]},
  {type:'delivery',ic:'📦',npc:'브로커',npcIc:'🕴️',
   titles:['긴급 화물 배달','기밀 문서 전달','의약품 이송','부품 조달'],
   descs:[
     '운송업자 마키: 시간이 없어요. 이 화물을 인접 행성에 그대로 갖다 주시면 됩니다. 운임은 두둑이 드릴 테니 빨리 부탁드려요.',
     '브로커 클라우드: 외교 채널이 막혔어. 자네라면 들키지 않게 문서를 전달할 수 있겠지. 누구한테도 말하지 말고, 그쪽 담당자에게 직접 건네주게.',
     '상인 케인: 내 의약품을 인접 행성으로 배달해줄 수 있겠나? 사례는 하겠네. 가는 동안 해적을 조심하게.',
     '공장장 마티아스: 생산 라인이 멈췄소. 부품 좀 인접 행성에서 가져다 주시면 그 자리에서 현금 박치기 하리다.'
   ]},
  {type:'gather',ic:'⛏️',npc:'브로커',npcIc:'🕴️',
   titles:['희귀 광물 채취','방사선 데이터 수집','잔해 탐색','물자 회수'],
   descs:[
     '광물상 라파엘: 인근 소행성대에 희귀 광물이 떴다는 정보야. 2턴 정도 캐오면 시세대로 사겠네. 욕심 부리지 말고 안전하게.',
     '연구원 헬렌: 항성풍 방사선 데이터가 필요해요. 2턴 정도 측정 장비 돌려주시면 자료비 깔끔하게 드릴게요. 측정 중에 해적 만나면 즉시 후퇴하세요.',
     '고철상 로건: 전투 잔해 구역에 갈 사람을 찾고 있소. 2턴 탐색에 챙겨오는 만큼 나누지. 살아서만 돌아오게.',
     '민병대장 호크: 치크스 잔해에 우리 물자가 남아 있소. 회수해 오면 사례하지. 2턴 정도 걸릴 거요 — 정찰대 마주칠 수도 있으니 조심하시오.'
   ]},
  {type:'explore',ic:'🔭',npc:'제독',npcIc:'🎖️',
   titles:['항로 탐색 임무','성계 측량 지원','미지 구역 탐사','위성 궤도 조사'],
   descs:[
     '제독 로한: 신항로 후보를 자네가 직접 둘러봐 주게. 좌측 [잔해 탐색] 버튼을 누르면 자네 함대가 출동하지. 발견하는 만큼 보고해 주게.',
     '항법사 클레어: 이 성계의 좌표 보정이 안 돼 있어요. [잔해 탐색] 버튼 두어 번이면 끝나니까 도와주세요. 보너스로 항법 데이터 사본 드릴게요.',
     '제독 로한: 기록이 비어 있는 구역이 있다. 자네가 가서 데이터를 채워 와. 위험하면 후퇴해도 좋다 — 자네 생환이 우선이야.',
     '관제관 시오: 위성 궤도 일부가 흔들린다고 보고가 들어왔어요. 한 바퀴 돌면서 어디가 문제인지 확인해 주실래요? 정밀 조사료 따로 챙겨드립니다.'
   ]},
  // 특산물 구매 의뢰 — 보상 = 시세 판매가의 2배
  {type:'buy',ic:'🛒',npc:'브로커',npcIc:'🕴️',
   titles:['특산물 매수 의뢰','진귀품 수집','대량 발주','거래 보조'],
   descs:[
     '거상 이장: 특산물 N개 구해 오시면 시세의 2배로 사들이겠소. 어디서 구해오든 상관없소.',
     '수집가 야마다: 진귀한 특산물 N개를 모아 주시오. 거래 기록 남기지 않고 2배 가격에 매입하겠소.',
     '도매상 에르마: 우리 거래소에 N개 납품해주시면 시세 2배로 결제합니다. 빠르게 부탁해요.',
     '브로커 클라우드: 의뢰자가 급해. 특산물 N개를 즉시 회수해서 가져와. 보상은 시세의 2배.'
   ]},
];
const VOID_BOSS_ID='FALCON_SCOUT_VOID';
// 능력치 = 렐러티비티(LGD03)의 3배
//   HP 245,000×3 = 735,000 / SH 90,000×3 = 270,000
//   ATT 306×3 = 918 / INT 295×3 = 885 / TEC 255×3 = 765
// 50% 페이즈부터 차원 절단광선으로 비기함 함선 1척씩 즉시 소멸 / 10% 페이즈에서 자진 철수
const VOID_BOSS={
  id:VOID_BOSS_ID,nm:'팔콘 스카우트',tier:'소형',isEnemy:true,
  hp:735000,maxHP:735000,sh:270000,maxSH:270000,
  ATT:918,INT:885,TEC:765,DEF:200,HP:735000,LOY:0,parts:[],
  voidBoss:true,catId:'S10',  // img/ships/S10.png (보이드 보스 전용 함선 이미지)
  shieldTier:18,armorTier:14,
  _lore:'침묵의 은하에서 온 자. 이름도, 고향도, 목적도 알 수 없다. 능력치는 렐러티비티의 3배.'
};
function _allVoidOwned(){
  return PLANET_DEF.filter(p=>p.void).every(p=>G.planets[p.id]?.owned);
}
// ── 퀘스트 시스템 설정 ────────────────────────────────────────────
// 행성당 동시 available 최대치 (제독+브로커 합산). 턴 종료시 2~4개씩 증가
const QUEST_MAX_AVAILABLE=8;
const QUEST_SPAWN_PER_TURN_MIN=2;
const QUEST_SPAWN_PER_TURN_MAX=4;

// 단일 퀘스트 생성 (제독 or 브로커 무작위 선택)
function _generateSingleQuest(pid,suffix){
  var pd=PLANET_DEF.find(function(p){return p.id===pid;});if(!pd)return null;
  var ring=pd.ring||1;
  var seed=pid.charCodeAt(0)*1000+G.act*997+G.turn*131+suffix*17+Math.floor(Math.random()*100000);
  var rng=mulberry32(seed);
  // 50% 제독 (explore 10% + combat 90%), 50% 브로커 (delivery/gather)
  var isAdmiral=rng()<0.5;
  var tmpl;
  if(isAdmiral){
    if(rng()<0.10){tmpl=QUEST_TEMPLATES.find(function(t){return t.type==='explore';});}
    if(!tmpl)tmpl=QUEST_TEMPLATES.find(function(t){return t.type==='combat';});
  } else {
    // 브로커: delivery/gather/buy 중 무작위 (buy 25% 가중)
    var brokerTmpl=QUEST_TEMPLATES.filter(function(t){return t.type==='delivery'||t.type==='gather'||t.type==='buy';});
    tmpl=brokerTmpl[Math.floor(rng()*brokerTmpl.length)];
  }
  if(!tmpl)return null;
  var ti=Math.floor(rng()*tmpl.titles.length);
  var cr=Math.round((1800+ring*700+Math.floor(rng()*800))/100)*100;
  var ve=Math.floor(rng()*ring*15)+5;
  var targetId=null;
  var requiredQty=tmpl.type==='gather'?2:1;
  var targetCommId=null,targetCommNm='',unitPrice=0;
  if(tmpl.type==='delivery'&&G.mapConns){
    var adj=G.mapConns.filter(function(c){return c.a===pid||c.b===pid;}).map(function(c){return c.a===pid?c.b:c.a;});
    if(adj.length>0)targetId=adj[Math.floor(rng()*adj.length)];
  } else if(tmpl.type==='buy'){
    // 특산물 구매 의뢰: 행성 팩션 특산물 중 랜덤 선택, 수량 3~20
    var avail=(typeof COMMODITIES!=='undefined'?COMMODITIES:[]).filter(c=>!c.special&&!c.material&&c.buy>0);
    if(avail.length===0)return null;
    var pickComm=avail[Math.floor(rng()*avail.length)];
    targetCommId=pickComm.id;
    targetCommNm=pickComm.nm;
    unitPrice=pickComm.maxSell||pickComm.buy*3;  // 시세(판매가) 기준
    requiredQty=3+Math.floor(rng()*18);  // 3~20
    cr=requiredQty*unitPrice*2;  // 보상 = 수량 × 시세 × 2
  }
  var nm=tmpl.titles[ti],desc=tmpl.descs[ti];
  if(tmpl.type==='buy'){
    // N → 실제 수량 치환, 보상가 정보 명시
    nm=tmpl.titles[ti]+' — '+targetCommNm+' '+requiredQty+'개';
    desc=desc.replace(/N개/g,requiredQty+'개 ('+targetCommNm+')')+'\n💰 보상 ₡'+cr.toLocaleString()+' (시세 ₡'+unitPrice.toLocaleString()+'×'+requiredQty+'×2배)';
  }
  return {
    id:'q_'+pid+'_a'+G.act+'_t'+G.turn+'_s'+suffix+'_'+Math.floor(Math.random()*9999),
    type:tmpl.type,ic:tmpl.ic,npc:tmpl.npc,npcIc:tmpl.npcIc,
    nm:nm,desc:desc,rewardCr:cr,rewardVe:ve,
    status:'available',targetId:targetId,progress:0,
    required:requiredQty,planetId:pid,
    targetCommId:targetCommId
  };
}

// 행성 도착 시 호출 — 신규 행성이면 초기 4개 시드. 기존 퀘스트는 보존
function generateQuests(pid){
  if(!G.quests[pid])G.quests[pid]=[];
  // 히든 보스 퀘스트: P30(제타 레티쿨리) 방문 시 — 지구 해방 이후에만 등장
  // ※ 우르사 메이저 격파(엔딩) 전에는 히든 보스 미공개
  // ※ 구버전 호환: 우르사 나포 함선 보유 OR ACT 4 진입 시 자동 _earthLiberated=true
  if(!G._earthLiberated){
    const _hasUrsaCap=(G.fleet||[]).some(s=>s.id&&s.id.startsWith('BOSS_URSA'))
                    ||(G.reserveFleet||[]).some(s=>s.id&&s.id.startsWith('BOSS_URSA'));
    if(_hasUrsaCap||G.act>=4){G._earthLiberated=true;}
  }
  // ※ 일반 퀘스트 생성보다 우선 처리 (early-return을 우회)
  if(pid==='P30'&&G._earthLiberated&&!G.quests[pid].some(q=>q.id==='q_void_boss')&&!G._voidFalconDefeated){
    G.quests[pid].unshift({
      id:'q_void_boss',type:'void_boss',ic:'🌑',npc:'???',npcIc:'🌑',
      nm:'[히든] 검은 함선의 경고 신호',
      desc:'제타 레티쿨리 상공에 정체불명의 검은색 소형 함선이 출현. 통신 신호가 잡혔지만 정체불명의 노이즈로 가득하다. 응답하면 어떤 사태가 벌어질지... (보상: 거대 크레딧 + 보이드 신호 + 함대 검증)',
      rewardCr:200000000,rewardVe:999,
      status:'available',targetId:null,progress:0,required:1,planetId:'P30'
    });
  }
  // 이미 available/active/done 퀘스트가 있으면 일반 퀘스트 추가 생성 안 함
  if(G.quests[pid].some(function(q){return q.status!=='claimed'&&q.id!=='q_void_boss';}))return;
  // 신규 행성 — 4개 초기 시드
  for(var i=0;i<4;i++){
    var q=_generateSingleQuest(pid,i);
    if(q)G.quests[pid].push(q);
  }
}
// 히든 보스 전투 진입 전 대사 팝업 → 확인 시 전투 모드 진입
// 호러 + 글리치 + 영웅 반응 + 위트있는 마무리
function showVoidBossIntro(questRef){
  const cmdName=G.profile?.name||'사령관';
  // 영입한 영웅 반응 자동 삽입 (있는 영웅만)
  const _hl=G.heroes||[];
  const heroLines=[];
  if(_hl.includes('H01'))heroLines.push({sp:'이순신',tx:'전열을 가다듬으십시오, 사령관. 적의 정체는 모르나, 함대의 진형부터 정비합시다.'});
  if(_hl.includes('H03'))heroLines.push({sp:'광개토대왕',tx:'정복의 기개로 맞서겠소. 보이드든 어둠이든, 두려움은 우리의 적이 아니오.'});
  if(_hl.includes('H06'))heroLines.push({sp:'아인슈타인',tx:'흥미롭군요... 이 신호의 주파수는 일반 공간을 넘어선다. 정말로 보이드의 존재일 가능성이 있어요.'});
  if(_hl.includes('H07'))heroLines.push({sp:'테슬라',tx:'전자기 간섭이 폭주합니다! 통신 회로가 망가질 수도 있으니 조심하십시오.'});
  if(_hl.includes('H04'))heroLines.push({sp:'유리 가가린',tx:'우주에 미지의 존재가 있다고 늘 말해왔지. 드디어 만나보는군.'});
  if(_hl.includes('H08'))heroLines.push({sp:'마르코 폴로',tx:'1000년 항해에서도 들어본 적 없는 신호다... 이건 새 대륙이야.'});
  // 영웅이 없으면 위트있는 폴백
  if(heroLines.length===0)heroLines.push({sp:cmdName,tx:'영웅도 없는데 검은 함선이라니. 백구야, 도망갈까?'});

  const lines=[
    // 1) 백구의 다급한 외침
    {sp:'백구',tx:`${cmdName}! 하늘 봐!! 검은색... 검은색 함선이야! 본 적도 없는 형태인데... 저게 도대체 뭐야?!`,fx:'baekgu'},
    // 2~5) 호러풍 글리치 통신
    {sp:'⚠️ 통신 수신 ⚠️',tx:'지지직...... 치직.. 츠츠츠..... 지직...',fx:'static'},
    {sp:'???',tx:'...... 들리는가? .... 들리는...가....',fx:'glitch'},
    {sp:'???',tx:'지직— 보이드 행성의 총독권을 가져간 존재들이....... 그러한 가치가... 있는지...',fx:'glitch'},
    {sp:'???',tx:'츠츠즉— ...... 시험해 보겠다.',fx:'glitch'},
    // 6) 백구의 놀란 반응
    {sp:'백구',tx:`헐... 헐!! 보이드 총독권을 우리가 가져간 걸 알고 있어?! 무슨... 무슨 존재야 도대체!!`,fx:'baekgu'},
    // 7~N) 영웅들의 반응 (영입한 영웅들만)
    ...heroLines,
    // 마지막 위트 있는 마무리들
    {sp:cmdName,tx:'좋다. 보이드든 뭐든 — 시험에 응하지. 우리는 100년 봉쇄를 깬 함대다.'},
    {sp:'백구',tx:'근데 솔직히 말해서, 저 통신 음성... 어디서 많이 들어본 것 같아. 호러 영화에서.'},
    {sp:cmdName,tx:'백구야, 분위기 좀 깨지 말아줘. 가뜩이나 무서운데.'},
    {sp:'백구',tx:`알았어 알았어. 자, 진지 모드 ON. 전 함대 — ${cmdName} 사령관의 지시를 기다린다!`}
  ];
  let _idx=0;
  function _renderLine(){
    const l=lines[_idx];
    const isVoid=l.sp==='???'||l.sp==='⚠️ 통신 수신 ⚠️';
    const isBaekgu=l.sp==='백구';
    const isCmd=l.sp===cmdName;
    const isHero=!isVoid&&!isBaekgu&&!isCmd;
    const spColor=isVoid?'#cc66ff':isBaekgu?'var(--cyan)':isHero?'#ffaa44':'var(--gold)';
    const spIc=isVoid?'🌑':isBaekgu?'🐕':isHero?'⚔️':'⚑';
    const portrait=charPortraitHTML(l.sp,spIc,72,spColor);
    // 호러 분위기: glitch/static 라인은 흑색 배경 + 글리치 흔들림 + 자주색 텍스트
    const bgGrad=isVoid
      ?'linear-gradient(135deg,rgba(60,0,90,.7),rgba(0,0,0,.95))'
      :isBaekgu
        ?'linear-gradient(135deg,rgba(0,180,200,.12),rgba(10,30,50,.7))'
        :isHero
          ?'linear-gradient(135deg,rgba(255,160,40,.1),rgba(40,20,5,.7))'
          :'linear-gradient(135deg,rgba(255,215,0,.08),rgba(20,15,5,.7))';
    const borderColor=isVoid?'rgba(204,102,255,.6)':isBaekgu?'rgba(0,243,255,.45)':isHero?'rgba(255,170,68,.45)':'rgba(255,215,0,.45)';
    const glowColor=isVoid?'rgba(204,102,255,.45)':isBaekgu?'rgba(0,243,255,.25)':isHero?'rgba(255,170,68,.2)':'rgba(255,215,0,.2)';
    const textColor=isVoid?'#e0c0ff':'var(--yellow)';
    const textShadow=isVoid?'0 0 8px rgba(200,100,255,.55),0 0 16px rgba(140,60,200,.3)':'0 1px 2px rgba(0,0,0,.5)';
    const glitchAnim=l.fx==='static'||l.fx==='glitch'?'animation:glitchShake .35s infinite':'';
    openModal('🌑 제타 레티쿨리 — 미지의 신호',
      `<div style="padding:14px;min-height:240px;background:${isVoid?'radial-gradient(circle at center,rgba(40,0,60,.4),rgba(0,0,0,.9))':'transparent'};border-radius:8px">
        <div style="display:flex;gap:14px;align-items:center;margin-bottom:14px;padding:16px;background:${bgGrad};border:1.5px solid ${borderColor};border-radius:12px;box-shadow:0 0 24px ${glowColor};${glitchAnim}">
          ${portrait}
          <div style="flex:1">
            <div style="font-size:13px;color:${spColor};font-weight:bold;margin-bottom:6px;letter-spacing:${isVoid?'3px':'1.5px'};${isVoid?'text-shadow:0 0 8px '+spColor:''}">${l.sp}</div>
            <div style="font-size:17px;color:${textColor};line-height:1.85;word-break:keep-all;text-shadow:${textShadow};${isVoid?'font-family:\'Courier New\',monospace':''}">"${l.tx}"</div>
          </div>
        </div>
        ${_idx===lines.length-1&&typeof _formatEnemyPreview==='function'?_formatEnemyPreview([{...VOID_BOSS}]):''}
        <div style="text-align:center;font-size:11px;color:var(--dim);letter-spacing:2px">${_idx+1} / ${lines.length}</div>
      </div>
      <style>
        @keyframes glitchShake{
          0%,100%{transform:translate(0,0)}
          25%{transform:translate(-1px,1px)}
          50%{transform:translate(1px,-1px)}
          75%{transform:translate(-1px,-1px)}
        }
      </style>`,
      [
        _idx<lines.length-1
          ? {txt:'계속 ▶',fn:()=>{_idx++;_renderLine();},cls:'btn-gold'}
          : {txt:'⚔️ 전투 시작!',fn:()=>{closeModal();startVoidBossCombat(questRef);},cls:'btn-red'},
        {txt:'나중에',fn:()=>{closeModal();questRef.status='available';saveGame(true);if(typeof rerenderTab==='function'&&typeof renderQuestTab==='function')rerenderTab(renderQuestTab);},cls:'btn-sm'}
      ],
      {wide:true}
    );
  }
  try{AudioMgr.playBgm('boss');}catch(e){}
  _renderLine();
}

// 히든 보스 격파/철수 시 — 작별 메시지 + 함대 복구 + 보상 수령
function showVoidBossOutro(){
  const cmdName=G.profile?.name||'사령관';
  const lines=[
    {sp:'⚠️ 통신 수신 ⚠️',tx:'지지직...... 츠츠..',fx:'static'},
    {sp:'팔콘 스카우트',tx:'음.. 우주에서 이렇게 강한 함대는 1000년만에 처음 만났군.. 좋다..'},
    {sp:'팔콘 스카우트',tx:'그대들의 목표를 지켜보겠다. 하지만 보이드 문명에 선을 넘지는 말길 바란다..'},
    {sp:'팔콘 스카우트',tx:'선물 하나를 하지.. 은하계 가운데로 가볼 수 있다면 내 마지막 시험을 통과할 것이다.'},
    {sp:'⚠️ 통신 수신 ⚠️',tx:'..... 메시지 전송 끝 .....',fx:'static'},
    {sp:'백구',tx:`${cmdName}, 검은 함선이 사라졌어! 그리고... 어? 우리 격침된 함선들이 다시 살아났어!`},
    {sp:cmdName,tx:'은하계 가운데... 블랙홀 말이로군. "마지막 시험"이라... 보이드 행성들을 모두 100% 투자해야 갈 수 있다는 뜻일까.'}
  ];
  let _idx=0;
  function _renderLine(){
    const l=lines[_idx];
    const isVoid=l.sp==='팔콘 스카우트'||l.sp==='⚠️ 통신 수신 ⚠️';
    const isBaekgu=l.sp==='백구';
    const spColor=isVoid?'#cc66ff':isBaekgu?'var(--cyan)':'var(--gold)';
    const spIc=isVoid?'🌑':isBaekgu?'🐕':'⚑';
    const portrait=charPortraitHTML(l.sp,spIc,72,spColor);
    const bgGrad=isVoid
      ?'linear-gradient(135deg,rgba(60,0,90,.7),rgba(0,0,0,.95))'
      :isBaekgu
        ?'linear-gradient(135deg,rgba(0,180,200,.12),rgba(10,30,50,.7))'
        :'linear-gradient(135deg,rgba(255,215,0,.08),rgba(20,15,5,.7))';
    const borderColor=isVoid?'rgba(204,102,255,.6)':isBaekgu?'rgba(0,243,255,.45)':'rgba(255,215,0,.45)';
    const glitchAnim=l.fx==='static'?'animation:glitchShake .35s infinite':'';
    openModal('🌑 검은 함선의 작별',
      `<div style="padding:14px;min-height:240px;background:${isVoid?'radial-gradient(circle at center,rgba(40,0,60,.4),rgba(0,0,0,.9))':'transparent'};border-radius:8px">
        <div style="display:flex;gap:14px;align-items:center;margin-bottom:14px;padding:16px;background:${bgGrad};border:1.5px solid ${borderColor};border-radius:12px;box-shadow:0 0 24px ${borderColor};${glitchAnim}">
          ${portrait}
          <div style="flex:1">
            <div style="font-size:13px;color:${spColor};font-weight:bold;margin-bottom:6px;letter-spacing:${isVoid?'3px':'1.5px'};${isVoid?'text-shadow:0 0 8px '+spColor:''}">${l.sp}</div>
            <div style="font-size:17px;color:${isVoid?'#e0c0ff':'var(--yellow)'};line-height:1.85;word-break:keep-all;${isVoid?'font-family:\'Courier New\',monospace':''}">"${l.tx}"</div>
          </div>
        </div>
        <div style="text-align:center;font-size:11px;color:var(--dim);letter-spacing:2px">${_idx+1} / ${lines.length}</div>
      </div>
      <style>@keyframes glitchShake{0%,100%{transform:translate(0,0)}25%{transform:translate(-1px,1px)}50%{transform:translate(1px,-1px)}75%{transform:translate(-1px,-1px)}}</style>`,
      [
        _idx<lines.length-1
          ? {txt:'계속 ▶',fn:()=>{_idx++;_renderLine();},cls:'btn-gold'}
          : {txt:'🎁 보상 수령 ▶',fn:()=>{closeModal();_grantVoidBossRewards();},cls:'btn-gold'}
      ]
    );
  }
  _renderLine();
}

// 보이드 보스 격파 보상 수령 + 함대 복구
function _grantVoidBossRewards(){
  G._voidFalconDefeated=true;
  G._falconDefeated=true;  // 블랙홀 잠금 해제 (맵 UI에서 사용)
  // 격침된 함선 모두 풀 회복 (보스의 "선물")
  (G.fleet||[]).forEach(s=>{
    if(s.hp<=0){
      s.hp=s.maxHP||1;
      s.sh=s.maxSH||0;
    }
  });
  // 퀘스트 보상 (크레딧) — 명성 티어 배율 적용 (VE>=40 → ×3 = 6억)
  let _questGrantedCr=0;
  if(combatState&&combatState._questRef){
    const q=combatState._questRef;
    const _mult=(typeof getQuestRepTierMult==='function')?getQuestRepTierMult(q):1;
    _questGrantedCr=Math.round((q.rewardCr||0)*_mult);
    G.credits+=_questGrantedCr;
    q.status='claimed';
    notify(`💰 [히든] ₡${_questGrantedCr.toLocaleString()} 크레딧 수령! (×${_mult} 명성 배율)`,'gold');
  }
  // ─── 보상 1: 팔콘 스카우트 강제 나포 (운 좋으면 2척) ───
  //    · 나포 거절 설정과 무관하게 무조건 편대에 추가 (히든 보상)
  //    · 능력치: 최소 우르사 메이저(BOSS)의 2배 보장 + 함대 합산 비례 스케일링
  const _URSA_HP=(typeof BOSS!=='undefined'?BOSS.maxHP:10000000)*2;     // = 20,000,000
  const _URSA_ATT=(typeof BOSS!=='undefined'?BOSS.ATT:6000)*2;          // = 12,000
  const _URSA_SH=(typeof BOSS!=='undefined'?BOSS.maxSH:300000)*2;       // = 600,000
  const _fp=(typeof calcFleetTotalPower==='function')?calcFleetTotalPower():{hp:0,atk:0,sh:0};
  // 우르사 2배 OR 함대 합산 비례 중 큰 값
  const _capHP=Math.max(_URSA_HP,Math.round((_fp.hp||0)*4));
  const _capATT=Math.max(_URSA_ATT,Math.round((_fp.atk||0)*2));
  const _capSH=Math.max(_URSA_SH,Math.round((_fp.sh||0)*2));
  const _lucky=Math.random()<0.30;  // 30% 확률로 2척
  const _capCount=_lucky?2:1;
  const _capturedShips=[];
  for(let i=0;i<_capCount;i++){
    const ship={
      id:'CAP_VOIDFALCON_'+Date.now()+'_'+i,
      catalogId:'VOID_FALCON',  // shipImgSrc에 보이드 팔콘 전용 분기 추가됨 → img/ships/S10.png 로드
      catId:'S10',
      nm:'🌑 팔콘 스카우트 (나포)'+(_capCount>1?` ${i+1}/${_capCount}`:''),
      tier:'대형',  // 대형 함선급 슬롯: 6 cols × 4 rows 기본
      partsRowsExtra:1,  // 대형 최대 확장 = +1 row → 6×5=30 파츠 슬롯
      maxHP:_capHP,hp:_capHP,
      maxSH:_capSH,sh:_capSH,
      ATT:_capATT,INT:Math.max(1200,VOID_BOSS.INT||885),  // 우르사 INT(600)의 2배 보장
      TEC:Math.max(560,VOID_BOSS.TEC||765),
      HP:_capHP,LOY:35,DEF:Math.max(400,VOID_BOSS.DEF||200),
      parts:[],crewIds:[],
      cargoSlots:80,  // 시작부터 80칸 화물칸 (보이드 차원 압축 — 신화급)
      _isVoidFalconCaptured:true
    };
    // 편대 거절 설정 무시 + 만석이어도 강제 합류 (히든 보상이라 일반 나포 규칙 미적용)
    G.fleet.push(ship);
    _capturedShips.push(ship);
  }
  // ─── 보상 2: 신화 설계도 다수 (LGD03, RB10) + 신화 파츠 인벤토리 ───
  if(!G.blueprints)G.blueprints={};
  if(!G.inventory)G.inventory=[];
  const bpGranted=[];
  if(!G.blueprints.LGD03){G.blueprints.LGD03=true;bpGranted.push('LGD03 렐러티비티');}
  if(!G.blueprints.RB10){G.blueprints.RB10=true;bpGranted.push('RB10 영혼 흡수 매트릭스');}
  if(!G.blueprints.LGD01){G.blueprints.LGD01=true;bpGranted.push('LGD01 거북선');}
  if(!G.blueprints.LGD02){G.blueprints.LGD02=true;bpGranted.push('LGD02 워덴클리프');}
  // 신화 파츠 5종 (보스/검은팔콘 보상과 동일)
  const mythicParts=['MW01','MS01','MA01','ME01','RB10'];
  const partsGranted=[];
  mythicParts.forEach(pid=>{
    const def=(typeof partById==='function')?partById(pid):(PARTS.find(p=>p.id===pid));
    const inv=G.inventory.find(i=>i.id===pid);
    if(inv)inv.qty++;else G.inventory.push({id:pid,qty:1});
    partsGranted.push(def?def.nm:pid);
  });
  // ─── 보상 3: 보이드 크리스탈(VC) 대량 ───
  const _vcGrant=100;  // 100개 (신화 가챠 100회 가능)
  G.voidCrystal=(G.voidCrystal||0)+_vcGrant;
  // VE도 추가 (보이드 에센스 — 보이드 행성 투자/뽑기 보조 자원)
  const _veGrant=5000;
  G.voidEssence=(G.voidEssence||0)+_veGrant;
  // ─── 알림 + 백구 대사 ───
  const _luckMsg=_lucky?' (🍀 행운! 2척)':'';
  notify(`🏴 팔콘 스카우트 ${_capCount}척 강제 나포!${_luckMsg}`,'pur');
  if(bpGranted.length>0)notify(`📜 신화 설계도 ${bpGranted.length}개 + 신화 파츠 ${mythicParts.length}종 획득!`,'gold');
  notify(`💎 VC +${_vcGrant} · ⚛️ VE +${_veGrant.toLocaleString()}`,'pur');
  baekgu(`검은 함선과의 만남 끝났어. 보이드가 선물로 팔콘 ${_capCount}척${_lucky?' (행운 2척!)':''}, 신화 설계도 ${bpGranted.length}장, 신화 파츠 5종, VC ${_vcGrant}개, VE ${_veGrant.toLocaleString()}을 남겼어. 보이드 행성 100% 투자하면 마지막 시험 열려!`);
  // ─── 획득 보고서 모달 ───
  if(typeof showAcquisitionReport==='function'){
    const items=[];
    // 나포 팔콘 — S10.png 함선 이미지
    _capturedShips.forEach(s=>{
      items.push({ic:'🏴',img:'img/ships/S10.png',nm:s.nm,type:'보이드 정찰함 (나포)',color:'#cc66ff',
        stats:`HP ${_capHP.toLocaleString()} · SH ${_capSH.toLocaleString()} · ATT ${_capATT}`,
        desc:'보이드의 작별 선물. 충성도 35로 시작 — 정비소에서 크루 배치 가능.',rarity:'mythic'});
    });
    // 설계도 — 해당 함선/파츠 이미지
    const _bpImgMap={
      'LGD03 렐러티비티':'img/ships/LGD03.png',
      'RB10 영혼 흡수 매트릭스':'img/parts/RB10.png',
      'LGD01 거북선':'img/ships/LGD01.png',
      'LGD02 워덴클리프':'img/ships/LGD02.png'
    };
    bpGranted.forEach(nm=>{
      items.push({ic:'📜',img:_bpImgMap[nm]||null,nm,type:'신화 설계도',color:'#ff66cc',stats:'제작 가능',desc:'제작소에서 신화급 함선/파츠를 제작할 수 있게 됩니다.',rarity:'mythic'});
    });
    // 신화 파츠 — 각 파츠 이미지 (mythicParts와 partsGranted는 같은 순서)
    partsGranted.forEach((nm,idx)=>{
      const pid=mythicParts[idx];
      items.push({ic:'✦',img:`img/parts/${pid}.png`,nm,type:'신화 파츠',color:'#ff88ff',stats:'+1 인벤토리',desc:'신화 등급 장비. 정비소에서 함선에 장착 가능.',rarity:'mythic'});
    });
    items.push({ic:'🌌',img:'img/commodities/G29.png',nm:'보이드 크리스탈 (VC)',type:'신화 자원',color:'#cc66ff',stats:`+${_vcGrant}개`,desc:'주점 신화 가챠/제작 핵심 재료. 100회 가챠 가능.',rarity:'mythic'});
    items.push({ic:'💜',img:'img/commodities/G19.png',nm:'보이드 에센스 (VE)',type:'균열 자원',color:'#99ffcc',stats:`+${_veGrant.toLocaleString()}`,desc:'보이드 행성 투자/세트 제작 보조 자원.'});
    if(_questGrantedCr>0){
      items.unshift({ic:'💰',img:'img/ui/credit.png',nm:'히든 의뢰 보상',type:'크레딧',color:'var(--gold)',stats:`+₡${_questGrantedCr.toLocaleString()}`,desc:'검은 함선의 약속 — 거대 크레딧 (명성 배율 적용).'});
    }
    showAcquisitionReport({
      title:'🌑 히든 보스 격파 — 보이드의 선물',
      subtitle:`팔콘 ${_capCount}척 나포${_lucky?' (행운!)':''} · 신화 설계도 ${bpGranted.length}장 · 신화 파츠 5종 · VC ${_vcGrant}`,
      items,color:'#cc66ff',sfx:null,
      congrats:'🌑 보이드의 인정! 1000년 만의 강자! 🌑'
    });
  }
  // 전투 화면 정리 → 허브 복귀
  combatState=null;
  try{AudioMgr.playBgm(_planetBgmName(G.currentPlanet));}catch(e){}
  setHubNav('main');hubTab('main');
  saveGame(true);
}

// 턴 종료마다 호출 — 현재 행성에 2~4개 신규 의뢰 게시 (최대 8개까지)
function tickQuestSpawn(){
  var pid=G.currentPlanet;if(!pid)return;
  if(!G.quests[pid])G.quests[pid]=[];
  var available=G.quests[pid].filter(function(q){return q.status==='available';}).length;
  if(available>=QUEST_MAX_AVAILABLE)return;
  var room=QUEST_MAX_AVAILABLE-available;
  var addCount=Math.min(room,QUEST_SPAWN_PER_TURN_MIN+Math.floor(Math.random()*(QUEST_SPAWN_PER_TURN_MAX-QUEST_SPAWN_PER_TURN_MIN+1)));
  var added=0,startIdx=G.quests[pid].length;
  for(var i=0;i<addCount;i++){
    var q=_generateSingleQuest(pid,startIdx+i);
    if(q){G.quests[pid].push(q);added++;}
  }
  if(added>0)notify('📋 신규 의뢰 '+added+'건 게시 ('+available+added+'/'+QUEST_MAX_AVAILABLE+')','ok');
}
function acceptQuest(pid,idx){
  generateQuests(pid);
  var q=G.quests[pid]&&G.quests[pid][idx];if(!q||q.status!=='available')return;
  // 명성 기반 고VE 퀘스트 수락 제한 (히든 퀘스트는 제외 — 보상 VE가 매우 크지만 의도된 콘텐츠)
  const _qrep=G.reputation||0;
  if(q.type!=='void_boss'){
    if(q.rewardVe>=40&&_qrep<200){notify(`🔒 VE ${q.rewardVe} 퀘스트는 명성 200 이상 필요 (현재 명성 ${_qrep})`,'err');return;}
    if(q.rewardVe>=30&&_qrep<100){notify(`🔒 VE ${q.rewardVe} 퀘스트는 명성 100 이상 필요 (현재 명성 ${_qrep})`,'err');return;}
  }
  const _fromTavern=G._currentHubTab==='tavern';
  // 히든 보스: 대사 팝업 → 전투 진입
  if(q.type==='void_boss'){
    q.status='active';
    saveGame(true);
    showVoidBossIntro(q);
    return;
  }
  q.status='active';
  if(q.type==='gather')notify('채취 의뢰 수락 — '+q.required+'턴 대기 후 완료','ok');
  else if(q.type==='explore')notify('🔭 탐색 임무 수락 — 탐색 버튼을 눌러 임무를 수행하세요','ok');
  else if(q.type==='delivery'){var tnm=(PLANET_DEF.find(function(p){return p.id===q.targetId;})||{nm:'인접 행성'}).nm;notify('배달 의뢰 수락 — '+tnm+'으로 이동하면 완료','ok');}
  else if(q.type==='buy'){const _cn=COMMODITIES.find(c=>c.id===q.targetCommId)?.nm||q.targetCommId;notify('🛒 매수 의뢰 수락 — '+_cn+' '+q.required+'개 화물칸에 갖춘 뒤 [보고]','ok');}
  else notify('전투 의뢰 수락 — 전투 승리 후 보고하세요','ok');
  saveGame(true);
  if(_fromTavern)rerenderTab(renderTavernView);
  else rerenderTab(renderQuestTab);
}
function startVoidBossCombat(questRef){
  const pd={id:'P30',nm:'팔콘 스카우트 — 제타 레티쿨리 상공',ring:5,void:true,f:'F07'};
  // ─── 보이드 함대 능력치 스케일링 (해적 알고리즘 응용 — per-ship 평균 비례) ───
  //   해적: clampEnemyStats(MIN 0.90 ~ MAX 0.95) — 적 1척 = 플레이어 평균 1척의 ~95%
  //   보이드: 더 강한 적이므로 per-ship 평균에 N배 적용
  //   · 호위 1척 = 플레이어 평균 함선 × 5 (5배 강함)
  //   · 보스 1척 = 플레이어 평균 함선 × 40 (40배 강함, 신화급)
  //   · 16척 총합 = 평균 × (15×5 + 40) = 평균 × 115
  //     예시 (플레이어 8척, 평균 HP 3M): 호위 15M, 보스 120M, 총 345M
  //   · armorTier 60 / shieldTier 60 / DEF 800 (보스) — 피해 감소 강화
  const VOID_FLEET_SIZE=16;
  const _fpAvg=(typeof calcFleetAvgPower==='function')?calcFleetAvgPower():{hp:100,atk:20,sh:50};
  const ESCORT_MULT=5;
  const FLAGSHIP_MULT=40;
  const _escortHP=Math.max(Math.round(VOID_BOSS.maxHP/8),Math.round((_fpAvg.hp||0)*ESCORT_MULT));
  const _escortATT=Math.max(Math.round(VOID_BOSS.ATT/8),Math.round((_fpAvg.atk||0)*ESCORT_MULT));
  const _escortSH=Math.max(Math.round(VOID_BOSS.maxSH/8),Math.round((_fpAvg.sh||0)*ESCORT_MULT));
  const _flagHP=Math.max(VOID_BOSS.maxHP,Math.round((_fpAvg.hp||0)*FLAGSHIP_MULT));
  const _flagATT=Math.max(VOID_BOSS.ATT,Math.round((_fpAvg.atk||0)*FLAGSHIP_MULT));
  const _flagSH=Math.max(VOID_BOSS.maxSH,Math.round((_fpAvg.sh||0)*FLAGSHIP_MULT));
  const enemies=Array.from({length:VOID_FLEET_SIZE},(_,i)=>{
    const isFlagship=(i===0);
    const _hp=isFlagship?_flagHP:_escortHP;
    const _att=isFlagship?_flagATT:_escortATT;
    const _sh=isFlagship?_flagSH:_escortSH;
    return {
      ...VOID_BOSS,
      id:`VOID_FALCON_${i+1}`,
      nm:isFlagship?'팔콘 스카우트 (기함 ✦)':`팔콘 스카우트 ${i+1}`,
      tier:isFlagship?'신화':'중형',
      isEnemy:true,
      hp:_hp,maxHP:_hp,HP:_hp,
      sh:_sh,maxSH:_sh,
      ATT:_att,
      DEF:isFlagship?800:300,  // 신화급 장갑
      armorTier:isFlagship?60:40,  // 피해 감소 강화
      shieldTier:isFlagship?60:40,
      voidBoss:isFlagship
    };
  });
  const players=G.fleet.map(s=>{const st=getShipStats(s);const _wpn=PARTS.find(p=>p.cat==='weapon'&&(s.parts||[]).includes(p.id));const _wt=_wpn?(_wpn.tier||1):1;const _wtype=_wpn?(_wpn.wtype||'laser'):'laser';const _wrar=_wpn?(_wpn.rarity||''):'';const _shp=PARTS.find(p=>p.cat==='shield'&&(s.parts||[]).includes(p.id));const _shTier=_shp?(_shp.tier||0):0;const _arp=PARTS.find(p=>p.cat==='armor'&&(s.parts||[]).includes(p.id));const _arTier=_arp?(_arp.tier||0):0;return{...s,isEnemy:false,hp:s.hp,maxHP:st.HP,sh:s.sh,maxSH:st.maxSH,ATT:st.ATT,INT:st.INT,TEC:st.TEC,DEF:st.DEF||0,wtype:_wtype,wpnTier:_wt,wpnRarity:_wrar,shieldTier:_shTier,armorTier:_arTier};});
  combatState={players,enemies,turn:0,done:false,log:[],planetDef:pd,isBoss:false,isVoidBoss:true,_questRef:questRef,_rndSeed:Date.now()%9999,_entranceT:0,_entranceDone:false,_planetId:'P30'};
  renderCombatView(document.getElementById('hub-body'));
  setHubNav('combat');updateHUD();
  _cbEffects=[];_unitPos={};if(_cbAnimReq){cancelAnimationFrame(_cbAnimReq);_cbAnimReq=null;}
  combatState._sunsinUsed=false;
  combatState._entranceT=1;combatState._entranceDone=true;
  sfxAlert();try{AudioMgr.playBgm('boss');}catch(e){}_preloadCombatImages();requestAnimationFrame(()=>{initCombatCanvas();const t=document.getElementById('cb-title');if(t)t.textContent='🌑 히든전 — 팔콘 스카우트';setTimeout(runCombatTurn,600);});
}
// 명성 티어별 퀘스트 보상 배율: VE>=40(명성200) ×3, VE>=30(명성100) ×2, 그 외 ×1
function getQuestRepTierMult(q){
  if(!q||typeof q.rewardVe!=='number')return 1;
  if(q.rewardVe>=40)return 3;
  if(q.rewardVe>=30)return 2;
  return 1;
}
function completeQuest(pid,idx){
  var q=G.quests[pid]&&G.quests[pid][idx];if(!q||q.status!=='done')return;
  const _fromTavern=G._currentHubTab==='tavern';
  q.status='claimed';try{sfxCoin();}catch(e){}
  const _rm=getTotalRewardMult(); // 레벨×난이도 통합 배율
  const _repMult=getQuestRepTierMult(q); // 명성 티어 배율 (VE≥40:×3, VE≥30:×2)
  // 허브 해금 전(hubProg<10): 보상 50% 감소 / 해금 후: 정상 보상
  const _hubUnlockedQ=isPlanetHubUnlocked(pid);
  const _rewardRate=_hubUnlockedQ?1.0:0.5;
  const _actualCr=Math.round(q.rewardCr*_rm*_rewardRate*_repMult);
  const _actualVe=q.rewardVe*_repMult;
  G.credits+=_actualCr;G.voidEssence+=_actualVe;
  // ── 보이드 크리스탈(VC) 드롭 — 보이드 행성(P27~P30) 퀘스트 완료 시 45% 확률 ──
  // (기존 30% 대비 50% 상향 — 사용자 요청에 따른 조정)
  const _vcPlanet=PLANET_DEF.find(p=>p.id===pid);
  if(_vcPlanet&&_vcPlanet.void){
    if(Math.random()<0.45){
      G.voidCrystal=(G.voidCrystal||0)+1;
      notify('💎 보이드 크리스탈 획득! +1 (보유 '+G.voidCrystal+')','pur');
      baekgu('보이드 크리스탈이야! 우르사 메이저 보스전 진입 재료. 이걸로 한 번 더 도전 가능!');
    }
  }
  // 행성 허브 진행도 추가
  addHubProgress(pid);
  updateHUD();
  // ── 특별 보상 추첨 ──────────────────────────────────────────────
  // 명성 100+ → 전설(set 파츠/legend 동료/legend 함선 설계도) 등장
  // 명성 200+ → 신화(mythic 파츠/mythic 함선 설계도) 등장
  const roll=Math.random();
  const rep=G.reputation||0;
  const _legendUnlocked=rep>=100;
  const _mythicUnlocked=rep>=200;
  // 퀘스트 VE 티어 보너스: VE>=40(명성200급) +10%, VE>=30(명성100급) +5%
  const _qveBonus=q.rewardVe>=40?0.10:q.rewardVe>=30?0.05:0;
  // 신화급 파츠 확률: 명성 200+에서만 활성. 최종값에서 -10%p 적용 (누적 -5%p 추가)
  const mythicRate=_mythicUnlocked?Math.max(0,Math.min(0.22,0.03+rep*0.005+_qveBonus)*0.5-0.10):0;
  // 세트(전설) 파츠 확률: 명성 100+에서만 활성. 최종값 -5%p 적용
  const setRate=_legendUnlocked?Math.max(0,Math.min(0.28,0.06+rep*0.005+_qveBonus)-0.05):0;
  // 전설 동료 확률: 명성 100+에서만 활성
  const legendRate=_legendUnlocked?Math.min(0.18,0.02+rep*0.003+_qveBonus)*0.5:0;

  let bonusMsg='';
  if(roll<legendRate){
    // 전설 동료 획득
    if(!G.crew)G.crew=[];
    const pool=QUEST_LEGEND_CREW.filter(c=>!G.crew.find(x=>x.id===c.id));
    if(pool.length>0){
      const lucky=pool[Math.floor(Math.random()*pool.length)];
      const newCrew={...lucky,id:lucky.id+'_'+Date.now()};
      if(G.crew.length>=getMaxCrewCount()){
        // 크루 가득 찬 경우: 교체 팝업 예약
        G._pendingQuestCrew=newCrew;
        bonusMsg=`<div style="margin-top:12px;background:rgba(255,215,0,.1);border:1px solid var(--gold);border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:26px">⭐ 전설급 동료 획득!</div>
          <div style="font-size:17px;font-weight:bold;color:var(--gold);margin-top:4px">${lucky.ic} ${lucky.nm}</div>
          <div style="font-size:12px;color:var(--dim);margin-top:3px">${lucky.desc}</div>
          <div style="font-size:12px;color:var(--red);font-weight:bold;margin-top:6px">⚠️ 크루 명단이 가득 찼습니다 — 확인 후 최하위 크루와 교체 여부를 선택하세요</div>
        </div>`;
        notify(`⭐ 전설 동료 ${lucky.nm} 획득! 크루 교체 필요`,'gold');
        baekgu(`${lucky.nm}가 합류하려 해! 전설급이야. 교체할 크루를 골라봐.`);
      } else {
        G.crew.push(newCrew);
        bonusMsg=`<div style="margin-top:12px;background:rgba(255,215,0,.1);border:1px solid var(--gold);border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:26px">⭐ 전설급 동료 획득!</div>
          <div style="font-size:17px;font-weight:bold;color:var(--gold);margin-top:4px">${lucky.ic} ${lucky.nm}</div>
          <div style="font-size:12px;color:var(--dim);margin-top:3px">${lucky.desc}</div>
          <div style="font-size:12px;color:var(--yellow);margin-top:3px">크루 명단에서 함선에 탑승시키세요</div>
        </div>`;
        notify(`⭐ 전설 동료 ${lucky.nm} 합류!`,'gold');
        baekgu(`${lucky.nm}가 합류했어! 전설급이야. 함선에 태워봐.`);
      }
    }
  } else if(roll<legendRate+mythicRate){
    // 신화급 파츠 획득
    const partId=QUEST_MYTHIC_PARTS[Math.floor(Math.random()*QUEST_MYTHIC_PARTS.length)];
    const p=PARTS.find(x=>x.id===partId);
    if(!G.inventory)G.inventory=[];
    const inv=G.inventory.find(i=>i.id===partId);
    if(inv)inv.qty++;else G.inventory.push({id:partId,nm:p.nm,qty:1});
    bonusMsg=`<div style="margin-top:12px;background:rgba(255,136,255,.1);border:1px solid #ff88ff;border-radius:8px;padding:10px;text-align:center">
      <div style="font-size:26px">✦ 신화급 파츠 획득!</div>
      <div style="font-size:17px;font-weight:bold;color:#ff88ff;margin-top:4px">${p?.nm||partId}</div>
      <div style="font-size:12px;color:var(--dim);margin-top:3px">${p?.desc||''}</div>
      <div style="font-size:12px;color:#ff88ff;margin-top:3px">함선 거래소 → 파츠 탭에서 장착하세요</div>
    </div>`;
    notify(`✦ 신화 파츠 ${p?.nm||partId} 획득!`,'pur');
    baekgu(`신화급 파츠야! ${p?.nm||partId}. 상점에서는 절대 못 사는 거야.`);
  } else if(roll<legendRate+mythicRate+setRate){
    // 세트 아이템 획득
    const partId=QUEST_SET_PARTS[Math.floor(Math.random()*QUEST_SET_PARTS.length)];
    const p=PARTS.find(x=>x.id===partId);
    if(!G.inventory)G.inventory=[];
    const inv=G.inventory.find(i=>i.id===partId);
    if(inv)inv.qty++;else G.inventory.push({id:partId,nm:p.nm,qty:1});
    // 세트 완성 확인
    const setId=p?.setId;
    const setComplete=setId&&PARTS.filter(sp=>sp.setId===setId).every(sp=>G.inventory.find(si=>si.id===sp.id&&si.qty>0)||G.fleet.some(sh=>(sh.parts||[]).includes(sp.id)));
    bonusMsg=`<div style="margin-top:12px;background:rgba(212,175,55,.1);border:1px solid var(--gold);border-radius:8px;padding:10px;text-align:center">
      <div style="font-size:26px">◈ 세트 아이템 획득!</div>
      <div style="font-size:17px;font-weight:bold;color:var(--gold);margin-top:4px">${p?.nm||partId}</div>
      <div style="font-size:12px;color:var(--dim);margin-top:3px">${p?.desc||''}</div>
      ${setComplete?'<div style="font-size:12px;color:var(--gold);margin-top:3px">🎉 세트 완성! 보너스 효과 활성화</div>':''}
    </div>`;
    notify(`◈ 세트 파츠 ${p?.nm||partId} 획득!`,'gold');
    baekgu(`세트 아이템이야! ${p?.nm}. 세트 완성하면 추가 보너스가 붙어.`);
  }

  // ── 설계도 드롭 (5%, 미보유 시에만, 특별 보상과 독립) ──────────────────
  // 설계도 명성 게이트 완화 (이전: 전설 100, 신화 200) → (신규: 전설 30, 신화 60)
  // 명성이 낮아도 행성 퀘스트를 충분히 수행하면 모든 설계도가 드롭 가능
  if(!G.blueprints)G.blueprints={};
  const _bpId=BLUEPRINT_MAP[pid];
  const _bpRecCheck=_bpId&&CRAFT_RECIPES.find(r=>r.id===_bpId);
  const _bpTier=_bpRecCheck?.tier;
  const _bpRepOK=
    _bpTier==='mythic'?(rep>=60):
    _bpTier==='legend'||_bpTier==='flagship'?(rep>=30):
    true;
  // 설계도 드롭 확률 (LGD03 15%, 그 외 12.5%)
  const _bpDropRate=(_bpId==='LGD03')?0.15:0.125;
  if(_bpId&&_bpRepOK&&!G.blueprints[_bpId]&&Math.random()<_bpDropRate){
    G.blueprints[_bpId]=true;
    const _bpRec=_bpRecCheck;
    const _bpTierCol=_bpRec?.tier==='mythic'?'#cc66ff':_bpRec?.tier==='flagship'?'#ff8800':'#d4af37';
    bonusMsg+=`<div style="margin-top:12px;background:rgba(212,175,55,.08);border:1px solid ${_bpTierCol};border-radius:8px;padding:10px;text-align:center">
      <div style="font-size:26px">📜 설계도 획득!</div>
      <div style="font-size:17px;font-weight:bold;color:${_bpTierCol};margin-top:4px">${_bpRec?.nm||_bpId}</div>
      <div style="font-size:12px;color:var(--dim);margin-top:3px">제작소에서 해당 아이템을 제작할 수 있습니다</div>
    </div>`;
    notify(`📜 설계도 획득: ${_bpRec?.nm||_bpId}`,'gold');
    baekgu(`설계도 드랍! ${_bpRec?.nm||_bpId} 설계도야. 재료 모아서 제작소에서 만들어봐!`);
  }
  // ── 전설 창고 확장 설계도 드롭 (링4+ 행성에서 3% 확률, 명성 100+) ──
  const _pd4=PLANET_DEF.find(p=>p.id===pid);
  if((_pd4?.ring||0)>=4 && _legendUnlocked){
    // 전설 창고 설계도 드롭 추가 +5% (SC08: 8% → 13%, SC09: 7% → 12%)
    const _cargoBps=[{id:'SC08',prob:0.13},{id:'SC09',prob:0.12}];
    for(const _cb of _cargoBps){
      if(!G.blueprints[_cb.id]&&Math.random()<_cb.prob){
        G.blueprints[_cb.id]=true;
        const _cbRec=CRAFT_RECIPES.find(r=>r.id===_cb.id);
        bonusMsg+=`<div style="margin-top:12px;background:rgba(212,175,55,.08);border:1px solid #d4af37;border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:26px">📦 창고 설계도 획득!</div>
          <div style="font-size:17px;font-weight:bold;color:#d4af37;margin-top:4px">${_cbRec?.nm||_cb.id}</div>
          <div style="font-size:12px;color:var(--dim);margin-top:3px">제작소에서 전설 창고 확장 파츠를 제작할 수 있습니다</div>
        </div>`;
        notify(`📦 창고 설계도: ${_cbRec?.nm||_cb.id}`,'gold');
        break;
      }
    }
  }

  // ── 전설 영웅 조우 (30%, 행성당 최대 2명, 1명당 1회) ──────────────
  // H01~H08은 각자 지정된 행성의 퀘스트 보상에서 30% 확률로 등장
  {const _hPd=PLANET_DEF.find(function(p){return p.id===pid;});
  const _hHId=_hPd&&_hPd.hero;
  if(!G.planetHeroCount)G.planetHeroCount={};
  const _phCount=G.planetHeroCount[pid]||0;
  // H01(이순신)은 난중일기 영인본(G18) 보유 시에만 등장 — 없으면 다음 기회로 보존
  const _hasG18Q=!!(G.inventory&&G.inventory.find(i=>i.id==='G18'&&i.qty>0));
  const _hReqOk=(_hHId!=='H01')||_hasG18Q;
  if(_hHId&&_hReqOk&&!(G.heroes||[]).includes(_hHId)&&_phCount<2&&Math.random()<0.30){
    G.planetHeroCount[pid]=_phCount+1;
    setTimeout(function(){showHeroRecruit(_hHId);},1400);
  }}
  changeReputation(1);
  const _repMultLbl=_repMult>1?` ⭐명성×${_repMult}`:'';
  const baseMsg='퀘스트 완료! +₡'+_actualCr.toLocaleString()+(_rm>1.05?' (×'+_rm.toFixed(1)+'배)':'')+_repMultLbl+(_actualVe>0?' +VE'+_actualVe:'')+' ⭐ 명성 '+(G.reputation)+'(+1)';
  notify(baseMsg,'gold');
  if(!bonusMsg)baekgu('퀘스트 보상 지급. '+_actualCr.toLocaleString()+' 크레딧'+(_rm>1.05?'. 레벨 보너스 ×'+_rm.toFixed(1)+'배!':'')+'.');

  if(bonusMsg){
    // 🎉 희귀 보상(설계도/전설/신화) 획득 시 효과음 + 강조
    try{
      const isMythic=/신화|mythic/i.test(bonusMsg);
      AudioMgr.playSfx(isMythic?'gacha_pull':'notify',{vol:isMythic?1.0:0.85,cooldown:50});
      setTimeout(()=>{try{AudioMgr.playSfx('coin',{vol:0.7,cooldown:200});}catch(e){}},250);
    }catch(e){}
    openModal('🎁 퀘스트 보상',
      `<div style="text-align:center;padding:8px">
        <div style="font-size:16px;color:var(--gold);margin-bottom:8px">${baseMsg}</div>
        ${bonusMsg}
      </div>`,
      [{txt:'확인',fn:()=>{
        closeModal();
        const _pend=G._pendingQuestCrew;
        delete G._pendingQuestCrew;
        saveGame(true);
        if(_pend){
          // 전설 동료 교체 팝업
          const _RORDER={L:4,H:3,R:2,N:1};
          const _assignedIds=new Set(G.fleet.flatMap(s=>s.crewIds||[]));
          const _lowest=[...G.crew].filter(c=>!_assignedIds.has(c.id)).sort((a,b)=>(_RORDER[a.rarity]||1)-(_RORDER[b.rarity]||1))[0];
          const _RARLBL={L:'전설',H:'영웅',R:'희귀',N:'일반'};
          if(_lowest){
            openModal('🔄 전설 동료 영입 제안',
              `<div style="padding:12px">
                <div style="font-size:15px;font-weight:bold;margin-bottom:10px;color:var(--gold)">⭐ 전설급 동료 영입 기회!</div>
                <div style="display:flex;gap:16px;align-items:center;justify-content:center;margin-bottom:12px">
                  <div style="text-align:center;padding:10px;background:rgba(255,59,59,.1);border:1px solid var(--red);border-radius:8px;min-width:100px">
                    <div style="font-size:26px">${_lowest.ic||'🧑'}</div>
                    <div style="font-size:13px;font-weight:bold;margin-top:4px">${_lowest.nm}</div>
                    <div style="font-size:11px;color:var(--dim)">${_RARLBL[_lowest.rarity]||_lowest.rarity} 등급</div>
                  </div>
                  <div style="font-size:22px;color:var(--dim)">→</div>
                  <div style="text-align:center;padding:10px;background:rgba(255,215,0,.1);border:1px solid var(--gold);border-radius:8px;min-width:100px">
                    <div style="font-size:26px">${_pend.ic||'🧑'}</div>
                    <div style="font-size:13px;font-weight:bold;margin-top:4px">${_pend.nm}</div>
                    <div style="font-size:11px;color:var(--gold)">전설 등급</div>
                  </div>
                </div>
                <div style="font-size:12px;color:var(--dim);text-align:center;margin-bottom:6px">${_pend.desc||''}</div>
                <div style="font-size:13px;color:var(--dim);text-align:center"><b style="color:var(--red)">${_lowest.nm}</b>을 내보내고<br><b style="color:var(--gold)">${_pend.nm}</b>을 영입하시겠습니까?</div>
              </div>`,
              [{txt:'✅ 교체 영입',fn:()=>{
                G.fleet.forEach(s=>{if(s.crewIds){const _i=s.crewIds.indexOf(_lowest.id);if(_i>=0)s.crewIds.splice(_i,1);}});
                const _ti=G.crew.findIndex(x=>x.id===_lowest.id);
                if(_ti>=0)G.crew.splice(_ti,1);
                G.crew.push(_pend);
                closeModal();
                notify(`🔄 ${_lowest.nm} → ${_pend.nm} 전설 동료 영입!`,'gold');
                baekgu(`${_pend.nm} 합류! ${_lowest.nm}은 하선했어.`);
                saveGame(true);
                if(_fromTavern)rerenderTab(renderTavernView);else rerenderTab(renderQuestTab);
              },cls:'btn-gold'},{txt:'❌ 거절',fn:()=>{
                closeModal();
                baekgu('전설 동료 영입 거절. 현재 크루 유지.');
                if(_fromTavern)rerenderTab(renderTavernView);else rerenderTab(renderQuestTab);
              },cls:'btn-sm'}]);
          } else {
            notify('크루 명단이 가득 찼고 배정 해제 가능한 크루가 없습니다.','err');
            if(_fromTavern)rerenderTab(renderTavernView);else rerenderTab(renderQuestTab);
          }
        } else {
          if(_fromTavern)rerenderTab(renderTavernView);else rerenderTab(renderQuestTab);
        }
      },cls:'btn-gold'}]
    );
  } else {
    saveGame(true);
    if(_fromTavern)rerenderTab(renderTavernView);
    else rerenderTab(renderQuestTab);
  }
}
function checkQuestCombatDone(){
  let completed=0;
  Object.keys(G.quests).forEach(function(pid){
    (G.quests[pid]||[]).forEach(function(q){
      if(q.type==='combat'&&q.status==='active'&&q.planetId===G.currentPlanet){
        q.progress=1;q.status='done';completed++;
      }
    });
  });
  if(completed>0){
    setTimeout(()=>{
      notify('🎖️ 전투 의뢰 완료! 제독 탭에서 보상을 수령하세요','gold');
      saveGame(true);
    },1200);
  }
}
// ── 좌측 탐색 버튼 표시/숨김 업데이트 ──────────────────────────
// 잔해 탐색은 항상 활성. 기본 10초 쿨다운 + 전설급 크루(또는 영웅) 1명당 1초 감소(최소 5초)
const GATHER_COOLDOWN_BASE_MS=10000;
const GATHER_COOLDOWN_MIN_MS=5000;
function _gatherCooldownMs(){
  // 전설(L) 크루 + 스토리(S) 영웅 합산
  const legendCrewCnt=(G.crew||[]).filter(c=>c&&(c.rarity==='L'||c.rarity==='S')).length;
  const heroCnt=(G.heroes||[]).length;
  const reduction=(legendCrewCnt+heroCnt)*1000;
  return Math.max(GATHER_COOLDOWN_MIN_MS,GATHER_COOLDOWN_BASE_MS-reduction);
}
function _gatherCooldownLeft(){
  const last=window._lastGatherTime||0;
  return Math.max(0,_gatherCooldownMs()-(Date.now()-last));
}
function updateGatherBtn(){
  const btn=document.getElementById('hn-gather-search');
  if(!btn)return;
  const pid=G.currentPlanet;
  const isCombatQ=(G.quests[pid]||[]).some(q=>q.status==='active'&&q.type==='combat'&&q.nm.includes('치크스'));
  const left=_gatherCooldownLeft();
  const onCooldown=left>0;
  if(onCooldown){
    btn.style.background='rgba(80,80,80,.15)';
    btn.style.borderColor='rgba(255,255,255,.12)';
    btn.style.color='#888';
    btn.style.opacity='.55';
    btn.style.cursor='default';
    btn.style.animation='none';
  } else {
    btn.style.background='rgba(0,255,140,.07)';
    btn.style.borderColor='rgba(0,255,140,.35)';
    btn.style.color='var(--green)';
    btn.style.opacity='1';
    btn.style.cursor='pointer';
    btn.style.animation='pulse 2.5s infinite';
  }
  const span=btn.querySelector('span:last-child');
  if(span){
    if(onCooldown)span.textContent=`잔해 탐색 ⏳${Math.ceil(left/1000)}s`;
    else span.textContent=isCombatQ?'정찰대 탐색':'잔해 탐색';
  }
  // 쿨다운 중이면 1초마다 갱신 예약
  if(onCooldown){
    if(!window._gatherCdTimer){
      window._gatherCdTimer=setInterval(()=>{
        if(_gatherCooldownLeft()<=0){clearInterval(window._gatherCdTimer);window._gatherCdTimer=null;}
        updateGatherBtn();
      },1000);
    }
  }
}

// ── 잔해/정찰대 탐색 실행 (항상 활성, 30초 쿨다운) ────────────
function doGatherSearch(){
  // 쿨다운 체크
  const _cdLeft=_gatherCooldownLeft();
  if(_cdLeft>0){
    notify(`⏳ 잔해 탐색 쿨다운 ${Math.ceil(_cdLeft/1000)}초 남음`,'warn');
    return;
  }
  window._lastGatherTime=Date.now();
  updateGatherBtn();
  // 잔해 탐색 횟수도 행성 허브 해금 진행도에 포함
  try{addHubProgress(G.currentPlanet);}catch(e){}
  // 배경 이미지 숨김 (글자 가독성)
  const _bg=document.getElementById('hub-planet-bg');
  if(_bg)_bg.style.opacity='0';
  const pid=G.currentPlanet;
  const pd=PLANET_DEF.find(p=>p.id===pid);
  const ring=pd?.ring||1;

  // 활성 퀘스트 판별 (있으면 보너스로 진행도 반영)
  const gatherQ=(G.quests[pid]||[]).find(q=>q.status==='active'&&(q.type==='gather'||q.type==='explore'));
  const combatQ=(G.quests[pid]||[]).find(q=>q.status==='active'&&q.type==='combat'&&q.nm.includes('치크스'));

  notify('🔭 탐색 중...','ok');
  baekgu('탐색 시작. 잔해 구역 접근 중.');

  // ── 1) 치크스 정찰대 탐색 (30% 조우) ─────────────────────
  if(combatQ){
    if(Math.random()<0.30){
      const dm=getDiffMult(),lm=getLevelMult(),ptm=Math.min(5,(G.pirateKills||0)/20+1),egm=getEarlyGameMult();
      // 치크스 정찰대 HP 50% 감소 + 50~70% 캡 (보스 제외 밸런스 조정)
      const _rcpHP=Math.round((150+ring*60)*dm*lm*egm*0.5),_rcpATK=Math.round((30+ring*8)*dm*lm*egm),_rcpINT=Math.round((20+ring*5)*dm*lm*egm),_rcpTEC=Math.round((15+ring*4)*dm*lm*egm);
      const _cChP=clampEnemyStats(_rcpHP,_rcpATK,_rcpINT,_rcpTEC,calcFleetAvgPower());
      const eHP=_cChP.eHP,eATK=_cChP.eATK,eINT=_cChP.eINT,eTEC=_cChP.eTEC;
      const chixFleet=[
        {id:'CHIX_1',nm:'치크스 정찰기',tier:'소형',isEnemy:true,maxHP:eHP,hp:eHP,maxSH:Math.floor(eHP*0.4),sh:Math.floor(eHP*0.4),ATT:eATK,INT:eINT,TEC:eTEC,HP:eHP,LOY:0,parts:[],crewIds:[]},
        {id:'CHIX_2',nm:'치크스 정찰기 B',tier:'소형',isEnemy:true,maxHP:Math.floor(eHP*.8),hp:Math.floor(eHP*.8),maxSH:Math.floor(eHP*0.3),sh:Math.floor(eHP*0.3),ATT:Math.floor(eATK*.9),INT:eINT,TEC:eTEC,HP:Math.floor(eHP*.8),LOY:0,parts:[],crewIds:[]}
      ];
      const raidDef={id:'CHIX_PATROL',nm:'치크스 정찰대',ring,f:'F05',hostile:true,tax:0,_enemies:chixFleet,_questPid:pid,_questId:combatQ.id};
      openModal('🛸 치크스 정찰대 발견!',
        `<div style="font-size:16px;margin-bottom:10px;color:var(--purple)">탐색 중 치크스 정찰대와 조우했습니다!</div>
         <div style="font-size:13px;color:var(--dim);line-height:1.8">적군: 치크스 정찰기 2척<br>격퇴하면 퀘스트 완료 처리됩니다.</div>`,
        [{txt:'⚔️ 전투!',fn:()=>{closeModal();startChixPatrolCombat(raidDef);},cls:'btn-red'},
         {txt:'🚀 도주',fn:()=>{closeModal();notify('치크스 정찰대 도주','warn');},cls:'btn-sm'}]);
    } else {
      notify('탐색 완료 — 정찰대 미발견. 다시 탐색하세요.','warn');
      baekgu('이번엔 없네. 다시 탐색해봐.');
    }
    return;
  }

  // ── 2) 잔해 탐색 퀘스트 ───────────────────────────────────
  const roll=Math.random();

  if(roll<0.30){
    // 30%: 해적선 출현 (50~70% 캡 적용)
    const dm=getDiffMult(),lm=getLevelMult(),egm=getEarlyGameMult();
    const _rdHP=Math.round((80+ring*30)*dm*lm*egm),_rdATK=Math.round((18+ring*5)*dm*lm*egm),_rdINT=Math.round((12+ring*3)*dm*lm*egm),_rdTEC=Math.round((8+ring*2)*dm*lm*egm);
    const _cDb=clampEnemyStats(_rdHP,_rdATK,_rdINT,_rdTEC,calcFleetAvgPower());
    const eHP=_cDb.eHP,eATK=_cDb.eATK,eINT=_cDb.eINT,eTEC=_cDb.eTEC;
    const pirateCount=1+Math.floor(ring/3);
    // 링별 티어: 1-4→소형, 5-6→중형, 7(보이드)→대형 리더+중형 호위
    const _dbrpTier=(idx)=>{
      if(ring>=7) return idx===0?'대형':'중형';
      if(ring>=5) return '중형';
      return '소형';
    };
    const _dbrpNm=(idx)=>{
      if(ring>=7) return idx===0?'잔해 약탈 모선':'잔해 중형 해적';
      if(ring>=5) return '잔해 중형 해적'+(pirateCount>1?` ${idx+1}`:'');
      return '잔해 해적'+(pirateCount>1?` ${idx+1}`:'');
    };
    const _dbrpHP=(idx)=>Math.round(eHP*(ring>=7&&idx===0?2.0:ring>=5&&idx===0?1.4:1.0));
    const enemies=Array.from({length:pirateCount},(_,i)=>({
      id:'DBRP_'+i,nm:_dbrpNm(i),tier:_dbrpTier(i),isEnemy:true,
      maxHP:_dbrpHP(i),hp:_dbrpHP(i),maxSH:Math.floor(_dbrpHP(i)*.3),sh:Math.floor(_dbrpHP(i)*.3),
      ATT:Math.round(eATK*(ring>=7&&i===0?1.5:1.0)),INT:Math.round(eINT*(ring>=7&&i===0?1.3:1.0)),
      TEC:eTEC,HP:_dbrpHP(i),LOY:0,parts:[],crewIds:[]
    }));
    const raidDef={id:'DEBRIS_PIRATE',nm:'잔해 구역 해적',ring,f:'PIRATE',hostile:true,tax:0,_enemies:enemies,_questPid:pid,_questId:gatherQ?gatherQ.id:null,_isDebris:true};
    openModal('🏴‍☠️ 잔해 구역 해적 출현!',
      `<div style="font-size:16px;margin-bottom:10px;color:var(--red)">탐색 중 해적선과 조우했습니다!</div>
       <div style="font-size:13px;color:var(--dim);line-height:1.8">적군: 잔해 해적 ${pirateCount}척<br>격파하면 탐색이 계속됩니다.</div>`,
      [{txt:'⚔️ 전투!',fn:()=>{closeModal();startDebrisPirateCombat(raidDef);},cls:'btn-red'},
       {txt:'🚀 도주 (탐색 중단)',fn:()=>{closeModal();notify('탐색 중단','warn');},cls:'btn-sm'}]);

  } else if(roll<0.40){
    // 10%: 아이템 또는 함선 획득 (전설급 포함)
    _grantDebrisReward(ring,gatherQ,pid);

  } else {
    // 60%: 잔해 발견 — 퀘스트 진행 또는 안내 메시지
    if(gatherQ){
      _progressGatherQuest(gatherQ,pid);
    } else {
      notify('🔭 탐색했지만 특별한 발견이 없었습니다','ok');
      baekgu('이번엔 별다른 게 없네. 다시 시도해봐.');
    }
  }
}

// 잔해 퀘스트 진행 처리
function _progressGatherQuest(q,pid){
  if(!q)return;
  q.progress=Math.min(q.required,(q.progress||0)+1);
  if(q.progress>=q.required){
    q.status='done';
    notify(`✅ ${q.nm} 완료! 퀘스트 탭에서 보상 수령`,'gold');
    baekgu('잔해 탐색 완료. 퀘스트 보상 받아.');
    updateGatherBtn();
  } else {
    notify(`🔭 잔해 발견 (${q.progress}/${q.required}) — 계속 탐색하세요`,'ok');
    baekgu('잔해 일부 발견. 계속 탐색해야 해.');
  }
  saveGame(true);
  // 퀘스트 완료 후 퀘스트 탭으로 이동 (보상 수령 유도)
  setTimeout(()=>hubTab('quest'),300);
}

// 잔해 탐색 아이템/함선 보상
function _grantDebrisReward(ring,q,pid){
  const rewardType=Math.random()<0.5?'item':'ship';
  if(rewardType==='item'){
    // 파츠 등급: ring에 비례, 전설(tier 12+) 확률 포함
    const maxTier=Math.min(15,ring*2+Math.floor(Math.random()*4));
    const pool=PARTS.filter(p=>p.tier<=maxTier);
    if(!pool.length){_progressGatherQuest(q,pid);return;}
    const p=pool[Math.floor(Math.random()*pool.length)];
    addToInventory(p.id,1);
    const isLegend=p.tier>=12;
    notify(`${isLegend?'🌟 전설':'✨'} 파츠 발견! ${p.nm} (Tier${p.tier}) 획득!`,isLegend?'pur':'gold');
    baekgu(`${p.nm} 발견! ${isLegend?'전설급이네. 대박이다.':'꽤 좋은 파츠야.'}`);
  } else {
    // 함선: ring 3+에서 중형, ring 5+에서 대형 가능
    const tierPool=ring>=5?['소형','소형','중형','중형','대형']:ring>=3?['소형','소형','중형']:['소형'];
    const tier=tierPool[Math.floor(Math.random()*tierPool.length)];
    const shipPool=SHIP_CATALOG.filter(s=>s.tier===tier);
    if(!shipPool.length){_progressGatherQuest(q,pid);return;}
    const def=shipPool[Math.floor(Math.random()*shipPool.length)];
    {
      const slotsByTier={소형:4,중형:8,대형:12,전설기함:16,신화:20};
      addShipToFleet({id:'DBR_'+Date.now(),catId:def.catId||def.id,nm:'회수 '+def.nm,tier:def.tier,maxHP:Math.floor(def.maxHP*.7),hp:Math.floor(def.maxHP*.5),maxSH:Math.floor(def.maxSH*.7),sh:0,ATT:def.ATT,INT:def.INT,TEC:def.TEC,HP:def.maxHP,LOY:55,parts:[],crewIds:[],cargoSlots:slotsByTier[def.tier]||5});
      notify(`🛸 잔해에서 ${def.tier} 함선 회수! ${def.nm}`, 'gold');
      baekgu(`${def.nm} 회수 완료. 함대에 추가됐어.`);
    }
  }
  // 퀘스트도 진행
  _progressGatherQuest(q,pid);
  saveGame(true);
}

// 잔해 해적 전투 시작
function startDebrisPirateCombat(raidDef){
  const players=G.fleet.map(s=>{const st=getShipStats(s);const _wpn=PARTS.find(p=>p.cat==='weapon'&&(s.parts||[]).includes(p.id));const _wrar=_wpn?(_wpn.rarity||''):'';const _shp=PARTS.find(p=>p.cat==='shield'&&(s.parts||[]).includes(p.id));const _shTier=_shp?(_shp.tier||0):0;const _arp=PARTS.find(p=>p.cat==='armor'&&(s.parts||[]).includes(p.id));const _arTier=_arp?(_arp.tier||0):0;return{...s,isEnemy:false,hp:Math.max(1,s.hp||st.HP),maxHP:st.HP,sh:(s.sh!=null?s.sh:st.maxSH),maxSH:st.maxSH,ATT:st.ATT,INT:st.INT,TEC:st.TEC,DEF:st.DEF||0,wtype:_wpn?(_wpn.wtype||'laser'):'laser',wpnTier:_wpn?(_wpn.tier||1):1,wpnRarity:_wrar,shieldTier:_shTier,armorTier:_arTier,tier:s.tier||'소형'};});
  combatState={players,enemies:raidDef._enemies,turn:0,done:false,log:[],planetDef:raidDef,isBoss:false,isPirate:true,_debrisQuestPid:raidDef._questPid,_debrisQuestId:raidDef._questId,_planetId:G.currentPlanet};
  renderCombatView(document.getElementById('hub-body'));
  setHubNav('combat');updateHUD();sfxAlert();
  try{AudioMgr.playBgm('combat');}catch(e){}
  requestAnimationFrame(()=>{
    initCombatCanvas();
    const t=document.getElementById('cb-title');if(t)t.textContent='⚔️ 잔해 해적 전투!';
    setTimeout(()=>{addCombatLog('🏴‍☠️ 잔해 구역 해적 출현!','');runCombatTurn();},400);
  });
}

// 치크스 정찰대 전투 시작
function startChixPatrolCombat(raidDef){
  const players=G.fleet.map(s=>{const st=getShipStats(s);const _wpn=PARTS.find(p=>p.cat==='weapon'&&(s.parts||[]).includes(p.id));const _wrar=_wpn?(_wpn.rarity||''):'';const _shp=PARTS.find(p=>p.cat==='shield'&&(s.parts||[]).includes(p.id));const _shTier=_shp?(_shp.tier||0):0;const _arp=PARTS.find(p=>p.cat==='armor'&&(s.parts||[]).includes(p.id));const _arTier=_arp?(_arp.tier||0):0;return{...s,isEnemy:false,hp:Math.max(1,s.hp||st.HP),maxHP:st.HP,sh:(s.sh!=null?s.sh:st.maxSH),maxSH:st.maxSH,ATT:st.ATT,INT:st.INT,TEC:st.TEC,DEF:st.DEF||0,wtype:_wpn?(_wpn.wtype||'laser'):'laser',wpnTier:_wpn?(_wpn.tier||1):1,wpnRarity:_wrar,shieldTier:_shTier,armorTier:_arTier,tier:s.tier||'소형'};});
  combatState={players,enemies:raidDef._enemies,turn:0,done:false,log:[],planetDef:raidDef,isBoss:false,isPirate:false,_chixQuestPid:raidDef._questPid,_chixQuestId:raidDef._questId,_planetId:G.currentPlanet};
  renderCombatView(document.getElementById('hub-body'));
  setHubNav('combat');updateHUD();sfxAlert();
  try{AudioMgr.playBgm('combat');}catch(e){}
  requestAnimationFrame(()=>{
    initCombatCanvas();
    const t=document.getElementById('cb-title');if(t)t.textContent='⚔️ 치크스 정찰대 격퇴!';
    setTimeout(()=>{addCombatLog('🛸 치크스 정찰대 출현!','');runCombatTurn();},400);
  });
}

function tickGatherQuests(){
  Object.keys(G.quests).forEach(function(pid){
    (G.quests[pid]||[]).forEach(function(q){
      if(q.type==='gather'&&q.status==='active'&&q.planetId===G.currentPlanet){
        q.progress=Math.min(q.required,(q.progress||0)+1);
        if(q.progress>=q.required){q.status='done';notify(q.nm+' 채취 완료! 퀘스트 탭에서 보상을 수령하세요','ok');}
      }
    });
  });
}
function checkDeliveryQuests(arrivedPid){
  Object.keys(G.quests).forEach(function(pid){
    (G.quests[pid]||[]).forEach(function(q){
      if(q.type==='delivery'&&q.status==='active'&&q.targetId===arrivedPid){
        q.status='done';notify('🚀 '+q.nm+' 배달 완료! 퀘스트 탭에서 보상을 수령하세요','ok');baekgu('목적지 도착. 퀘스트 탭에서 보상 받아.');
      }
    });
  });
}
function takeLoan(){
  if((G.loan||0)>=20000){notify('대출 한도 초과. 퀘스트로 자금을 마련하세요.','err');return;}
  var amt=5000;G.loan=(G.loan||0)+amt;G.credits+=amt;
  updateHUD();notify('백구 긴급 대출 '+amt.toLocaleString()+' (누적 '+G.loan.toLocaleString()+')','ok');
  baekgu('빌려줄게. 빨리 갚아.');
  saveGame(true);rerenderTab(renderQuestTab);
}
// ═══ 제작소 ═════════════════════════════════════════════════════════
function rollCraftQuality(){
  // 제작 품질 등급 (확률 동일, 배율만 조정)
  // 마스터작 +30% / 상급작 +15% / 보통 ±0% / 하급 -10% / 불량 -20%
  const r=Math.random();
  if(r<0.065)return{mult:1.30,label:'✨ 마스터작',col:'#ff8800'};
  if(r<0.18) return{mult:1.15,label:'⭐ 상급작',col:'#d4af37'};
  if(r<0.53) return{mult:1.00,label:'🔷 보통',col:'var(--cyan)'};
  if(r<0.765)return{mult:0.90,label:'▽ 하급',col:'var(--dim)'};
  return{mult:0.80,label:'💀 불량',col:'var(--red)'};
}
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
  if(!rec){notify('레시피 없음','err');return;}
  if(!G.materials)G.materials={};
  if(!G.blueprints)G.blueprints={};

  if(!G.blueprints[rec.id]){notify('📜 설계도 없음 — 퀘스트 완료 시 5% 드롭','err');return;}
  const _isTierDiscount=['legend','mythic','flagship'].includes(rec.tier);
  for(const m of rec.mats){
    const needQty=_isTierDiscount?Math.ceil(m.qty/2):m.qty;
    if((G.materials[m.id]||0)<needQty){
      const comm=COMMODITIES.find(c=>c.id===m.id);
      const _disc=_isTierDiscount?' (전설 등급 50% 할인 적용)':'';
      notify(`재료 부족: ${comm?.nm||m.id} (${G.materials[m.id]||0}/${needQty})${_disc}`,'err');return;
    }
  }
  if(rec.heroReq&&!(G.heroes||[]).includes(rec.heroReq)){
    notify(`${HEROES[rec.heroReq]?.nm||rec.heroReq} 영웅 필요`,'err');return;
  }

  const btn=document.getElementById('craftBtn');
  if(btn){btn.disabled=true;btn.innerHTML='⚗️ 제작 중...';}

  // 전설 이상 등급: 재료 소모량 절반
  const _tierDiscount=['legend','mythic','flagship'].includes(rec.tier);
  for(const m of rec.mats){
    const consume=_tierDiscount?Math.ceil(m.qty/2):m.qty;
    G.materials[m.id]=Math.max(0,(G.materials[m.id]||0)-consume);
  }

  const grid=document.getElementById('craftMatGrid');
  if(grid){grid.style.animation='craftFlash 0.5s ease-in-out infinite';grid.style.pointerEvents='none';}
  baekgu('제작 중이야... 잠깐만 기다려.');

  setTimeout(()=>{
    if(grid){grid.style.animation='';grid.style.filter='';grid.style.pointerEvents='';}
    const q=rollCraftQuality();
    const mult=q.mult;
    let resultHtml='';

    if(rec.type==='part'){
      if(!G.inventory)G.inventory=[];
      G.inventory.push({id:rec.id,qty:1,quality:mult,qualityLabel:q.label,crafted:true});
      const p=PARTS.find(x=>x.id===rec.id);
      resultHtml=`<div style="font-size:16px;color:var(--dim);margin-bottom:8px">${p?.nm||rec.nm}</div>
        <div style="font-size:36px;font-weight:bold;color:${q.col};margin:8px 0">${q.label}</div>
        <div style="font-size:16px;color:${q.col}">능력치 ×${mult.toFixed(2)}</div>
        <div style="font-size:12px;color:var(--dim);margin-top:8px">인벤토리에서 함선에 장착하세요</div>`;
      notify(`⚗️ ${rec.nm} ${q.label} 완성!`,'gold');
      baekgu(mult>=1.1?`대박! ${q.label}이야. 능력치 +${Math.round((mult-1)*100)}% 상승!`:mult<1.0?`아쉽지만 ${q.label}이 나왔어. 다시 도전해봐.`:`${rec.nm} 완성! ${q.label}.`);
    } else if(rec.type==='cargo'){
      const scDef=SPECIAL_CARGO_PARTS.find(c=>c.id===rec.id);
      if(!scDef){notify('창고 파츠 정의 없음','err');return;}
      if(!G.fleet||!G.fleet.length){notify('함선 없음 — 편대에 함선을 먼저 배치하세요','err');return;}
      // 전설 창고 확장: 모든 보유 함선의 cargoSlots를 +cargoBonus (최대 80)
      const _appliedShips=[];
      G.fleet.forEach(sh=>{
        if(!sh.cargoSlots)sh.cargoSlots=({소형:5,중형:10,대형:20,전설기함:30,신화:40})[sh.tier]||5;
        const _prev=sh.cargoSlots;
        sh.cargoSlots=Math.min(80,sh.cargoSlots+scDef.cargoBonus);
        const _added=sh.cargoSlots-_prev;
        if(_added>0)_appliedShips.push({nm:sh.nm,prev:_prev,now:sh.cargoSlots,added:_added});
      });
      const _totalAdded=_appliedShips.reduce((s,x)=>s+x.added,0);
      const _shipRows=_appliedShips.length?_appliedShips.map(x=>`<div style="font-size:11px;color:var(--cyan);text-align:left;padding:2px 0">⚑ ${x.nm}: ${x.prev} → <b style="color:#d4af37">${x.now}칸</b> (+${x.added})</div>`).join(''):'<div style="color:var(--dim);font-size:12px">모든 함선이 이미 최대 80칸</div>';
      resultHtml=`<div style="font-size:16px;color:var(--dim);margin-bottom:8px">${scDef.nm}</div>
        <div style="font-size:36px;font-weight:bold;color:#d4af37;margin:8px 0">📦</div>
        <div style="font-size:18px;font-weight:bold;color:#d4af37">전 함선 창고 +${scDef.cargoBonus}칸 확장!</div>
        <div style="font-size:13px;color:var(--dim);margin-top:6px">${G.fleet.length}척 함선에 일괄 적용 · 총 +${_totalAdded}칸</div>
        <div style="margin-top:10px;background:rgba(0,0,0,.3);border-radius:6px;padding:8px;max-height:160px;overflow-y:auto;text-align:left">${_shipRows}</div>`;
      notify(`📦 ${scDef.nm} 제작 완료! 전 함선 창고 +${scDef.cargoBonus}칸 (총 ${_totalAdded}칸)`,'gold');
      baekgu(`${scDef.nm} 제작 완료! ${G.fleet.length}척 모두 +${scDef.cargoBonus}칸 확장됐어.`);
    } else {
      const def=SHIP_CATALOG.find(s=>s.id===rec.id);
      if(!def){notify('함선 데이터 오류','err');return;}
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
      resultHtml=`<div style="font-size:16px;color:var(--dim);margin-bottom:8px">${def.nm}</div>
        <div style="font-size:36px;font-weight:bold;color:${q.col};margin:8px 0">${q.label}</div>
        <div style="font-size:16px;color:${q.col}">성능 ×${mult.toFixed(2)}</div>
        ${_addedToReserve?'<div style="font-size:13px;color:var(--cyan);margin-top:6px">📦 활성 편대 가득(16척) — 임시창에 보관 (정비소에서 교체 가능)</div>':''}
        <div style="font-size:13px;color:var(--dim);margin-top:4px">HP:${newShip.maxHP} | ATT:${newShip.ATT||newShip.atk||0}</div>
        <div style="font-size:12px;color:var(--dim);margin-top:8px">편대에 함선이 추가됐습니다</div>`;
      notify(`⚗️ ${newShip.nm} 건조! ${q.label}`,'gold');
      baekgu(mult>=1.1?`함선 완성! ${q.label}이야. 편대 확인해봐!`:`${def.nm} 완성. ${q.label}.`);
    }

    openModal('⚗️ 제작 완료!',
      `<div style="text-align:center;padding:16px">
        <div style="font-size:60px;margin-bottom:12px">⚗️</div>
        ${resultHtml}
        ${mult>=1.1?'<div style="margin-top:12px;padding:6px 12px;background:rgba(255,136,0,.1);border:1px solid #ff8800;border-radius:6px;font-size:13px;color:#ff8800">🎉 행운의 제작! 최상 품질입니다</div>':''}
        ${mult<1.0?'<div style="margin-top:12px;font-size:12px;color:var(--dim)">재료를 모아 재도전하면 더 좋은 품질이 나올 수 있어요</div>':''}
      </div>`,
      [{txt:'확인',fn:()=>{closeModal();saveGame(true);rerenderTab(renderCraftTab);},cls:'btn-gold'}]
    );
  },3000);
}

function renderCraftTab(body){
  const pd=PLANET_DEF.find(p=>p.id===G.currentPlanet);
  if(!G.materials)G.materials={};
  if(!G.blueprints)G.blueprints={};

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
    const matTip=rec.mats.map(m=>{const c=COMMODITIES.find(x=>x.id===m.id);return`${c?.ic||'💎'}${c?.nm||m.id}×${m.qty}`;}).join('  ');
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
      <span style="font-size:19px">${hasBp?'📜':'🔒'}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:bold;color:${hasBp?tierCol:'var(--muted)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${rec.nm}</div>
        <div style="font-size:10px;color:var(--dim);margin-top:1px">${rec.mats.length}종 재료</div>
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
    const matImgSrc=mat?'img/commodities/'+mat.id+'.png':'';
    return`<div onclick="openCraftSlot(${i})" ${mat?'data-matid="'+mat.id+'"':''} onmouseover="showMatSlotTip(this,event)" onmouseout="hideMatSlotTip()" style="
      width:150px;height:165px;display:flex;flex-direction:column;align-items:center;justify-content:center;
      background:${hasItem?'rgba(255,255,255,.07)':'rgba(255,255,255,.02)'};
      border:2px ${hasItem?'solid':'dashed'} ${ok?'var(--cyan)':partial?'#ffd700':hasItem?'rgba(255,255,255,.25)':'rgba(255,255,255,.1)'};
      border-radius:12px;cursor:pointer;padding:8px;position:relative;transition:all .2s
    " onmouseover="this.style.borderColor='var(--cyan)'" onmouseout="this.style.borderColor='${ok?'var(--cyan)':partial?'#ffd700':hasItem?'rgba(255,255,255,.25)':'rgba(255,255,255,.1)'}'">\n      ${hasItem?`
        ${imgOrEmoji(matImgSrc,mat.ic||'💎',96,96,'border-radius:8px;margin-bottom:6px',mat?'mat_'+mat.id:'')}
        <div style="font-size:13px;color:var(--txt);text-align:center;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:1.3;font-weight:bold">${mat.nm}</div>
        <div style="font-size:15px;font-weight:bold;color:${ok?'var(--cyan)':partial?'#ffd700':'var(--red)'};margin-top:2px">${have}${needed>0?'/'+needed:''}</div>
        <div style="position:absolute;top:4px;right:7px;font-size:14px;color:var(--dim);cursor:pointer" onclick="event.stopPropagation();removeCraftSlot(${i})">✕</div>
      `:`<div style="font-size:48px;color:rgba(255,255,255,.15)">+</div>`}
    </div>`;
  }).join('')}</div>`;

  // ── 제작 버튼 영역 ─────────────────────────────────────────────────────
  let canCraft=false,craftBtnTxt='레시피 선택 후 제작',craftBtnDis=true;
  if(selRec){
    const hasBp=G.blueprints[selRec.id];
    const _recTierDisc=['legend','mythic','flagship'].includes(selRec.tier);
    const matOk=selRec.mats.every(m=>(G.materials[m.id]||0)>=(_recTierDisc?Math.ceil(m.qty/2):m.qty));
    const heroOk=!selRec.heroReq||(G.heroes&&G.heroes.includes(selRec.heroReq));
    if(!hasBp){craftBtnTxt='🔒 설계도 없음';}
    else if(!heroOk){craftBtnTxt=`❌ 영웅 필요: ${HEROES[selRec.heroReq]?.nm||selRec.heroReq}`;}
    else if(!matOk){craftBtnTxt='🔒 재료 부족';}
    else{canCraft=true;craftBtnTxt=`⚗️ ${selRec.nm} 제작`;craftBtnDis=false;}
  }

  // 선택된 레시피 재료 상태 요약
  let matStatusHtml='';
  if(selRec){
    const hasBp=G.blueprints[selRec.id];
    const tierCol=selRec.tier==='flagship'?'#ff8800':selRec.tier==='mythic'?'#cc66ff':selRec.tier==='legend'?'#d4af37':'var(--cyan)';
    matStatusHtml=`<div style="background:rgba(0,0,0,.3);border:1px solid ${tierCol}44;border-radius:8px;padding:6px 10px;margin-bottom:8px">
      <div style="font-size:13px;font-weight:bold;color:${tierCol};margin-bottom:5px">📋 ${selRec.nm} — 재료 현황</div>
      <div style="display:flex;flex-wrap:wrap;gap:5px">
        ${selRec.mats.map(m=>{
          const c=COMMODITIES.find(x=>x.id===m.id);
          const have=G.materials[m.id]||0;
          const _tdDisc=['legend','mythic','flagship'].includes(selRec.tier);
          const _needShow=_tdDisc?Math.ceil(m.qty/2):m.qty;
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
              :`<div style="font-size:9px;color:var(--dim);margin-top:1px">🧭 발견된 행성 없음</div>`;
          } else if(allPn.length>0){
            plHtml=`<div style="font-size:9px;color:var(--dim);margin-top:1px">📍 ${allPn.slice(0,2).join(', ')}${allPn.length>2?'…':''}</div>`;
          }
          return`<div style="display:flex;flex-direction:column;align-items:flex-start;gap:1px;padding:3px 7px;background:${ok?'rgba(0,243,255,.1)':'rgba(255,60,60,.1)'};border:1px solid ${ok?'rgba(0,243,255,.3)':'rgba(255,60,60,.3)'};border-radius:5px">
            <div style="display:flex;align-items:center;gap:4px;font-size:11px">
              <img src="img/commodities/${m.id}.png" alt="" style="width:22px;height:22px;border-radius:4px;object-fit:contain;background:rgba(0,0,0,.3)" onerror="this.outerHTML='<span>${c?.ic||'💎'}</span>'">
              <span style="color:var(--dim)">${c?.nm||m.id}</span>
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
  <div style="padding:4px 10px;flex-shrink:0;background:rgba(0,243,255,.05);border-bottom:1px solid rgba(0,243,255,.15);display:flex;align-items:center;gap:8px"><span style="font-size:15px">⚗️</span><span style="color:var(--cyan);font-size:13px;font-weight:bold">함선 제작소</span>${pd?'<span style="font-size:11px;color:var(--dim)">— '+pd.nm+'</span>':''}</div>
  <div style="display:flex;flex:1;overflow:hidden">

    <!-- ◀ 좌측: 설계도 목록 (240px 고정) -->
    <div data-scroll-id="craft-bpl" style="width:260px;flex-shrink:0;overflow-y:auto;border-right:1px solid rgba(0,243,255,.12);padding:10px 12px;display:flex;flex-direction:column;gap:0">
      <div style="font-size:13px;font-weight:bold;color:var(--cyan);margin-bottom:8px;letter-spacing:.5px">📜 설계도 목록</div>
      <div style="font-size:10px;color:var(--dim);margin-bottom:8px;line-height:1.5">획득한 설계도만 밝게 표시됩니다.<br>마우스를 올리면 재료를 확인할 수 있어요.</div>

      <div style="font-size:10px;color:#d4af37;margin:2px 0 4px;font-weight:bold;letter-spacing:.5px">⚡ 전설 파츠</div>
      ${legendParts.map(bpCard).join('')}

      <div style="font-size:10px;color:#cc66ff;margin:8px 0 4px;font-weight:bold;letter-spacing:.5px">✦ 신화 파츠</div>
      ${mythicParts.map(bpCard).join('')}

      <div style="font-size:10px;color:#d4af37;margin:8px 0 4px;font-weight:bold;letter-spacing:.5px">🌟 전설 함선</div>
      ${legendShips.map(bpCard).join('')}

      <div style="font-size:10px;color:#cc66ff;margin:8px 0 4px;font-weight:bold;letter-spacing:.5px">✦ 신화 함선</div>
      ${mythicShips.map(bpCard).join('')}

      ${legendCargo.length>0?`<div style="font-size:10px;color:#d4af37;margin:8px 0 4px;font-weight:bold;letter-spacing:.5px">📦 전설 창고 확장</div>
      ${legendCargo.map(bpCard).join('')}`:''}

      <div style="margin-top:auto;padding-top:12px;font-size:11px;color:var(--dim);line-height:1.6">
        💡 퀘스트 클리어 시<br>5% 확률로 설계도 드랍<br>
        📦 링 4+ 행성 퀘스트: 전설 창고 설계도 드랍
      </div>
    </div>

    <!-- ▶ 우측: 재료 그리드 + 제작 -->
    <div data-scroll-id="craft-right" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;padding:12px 14px">

      <!-- ✦ 선택된 설계도 상세 정보 (전설 창고 등 효과 명시) -->
      ${(()=>{
        if(!selRec)return '<div style="background:rgba(255,255,255,.03);border:1px dashed var(--bdr);border-radius:8px;padding:12px;margin-bottom:10px;text-align:center;color:var(--dim);font-size:12px">좌측 설계도를 선택하세요</div>';
        const _tierColor=selRec.tier==='mythic'?'#cc66ff':selRec.tier==='flagship'?'#ff8800':'#d4af37';
        const _tierLabel=selRec.tier==='mythic'?'✦ 신화':selRec.tier==='flagship'?'⚑ 전설기함':selRec.tier==='legend'?'⚡ 전설':'🛠 일반';
        // 효과 설명
        let _effectHtml='';
        if(selRec.type==='cargo'){
          const sc=(typeof SPECIAL_CARGO_PARTS!=='undefined'?SPECIAL_CARGO_PARTS:[]).find(c=>c.id===selRec.id);
          const bonus=sc?.cargoBonus||0;
          const fleetN=(G.fleet||[]).length;
          const totalAdd=bonus*fleetN;
          _effectHtml=`
            <div style="background:rgba(212,175,55,.08);border:1px solid rgba(212,175,55,.4);border-radius:6px;padding:8px 12px;margin-top:6px">
              <div style="font-size:12px;color:#d4af37;font-weight:bold;margin-bottom:4px">📦 효과 — 전 함선 창고 일괄 확장</div>
              <div style="font-size:11px;color:var(--txt);line-height:1.7">
                · 함선 1척당 <b style="color:#d4af37">+${bonus}칸</b> 추가 (최대 80칸)<br>
                · 현재 편대 ${fleetN}척 → 총 <b style="color:var(--green)">+${totalAdd}칸</b> 일괄 추가<br>
                · 제작 1회 = 모든 함선 동시 확장 (기함만 적용 X)
              </div>
            </div>`;
        } else if(selRec.type==='part'){
          const p=(typeof PARTS!=='undefined'?PARTS:[]).find(x=>x.id===selRec.id);
          if(p){
            const _statTxt=p.cat==='weapon'?`ATT+${p.ATT}${p.wtype?' ['+p.wtype+']':''}`:p.cat==='shield'?`SHD+${p.INT} maxSH+${p.maxSH||0}`:p.cat==='armor'?`HP+${p.HP||0} DEF+${p.DEF||0}`:`ENG+${p.TEC||0}`;
            _effectHtml=`<div style="background:rgba(0,243,255,.05);border:1px solid rgba(0,243,255,.3);border-radius:6px;padding:8px 12px;margin-top:6px;font-size:12px;color:var(--cyan)">⚙️ ${_statTxt} · 티어 ${p.tier||'?'}</div>`;
          }
        } else if(selRec.type==='ship'){
          const sd=(typeof SHIP_CATALOG!=='undefined'?SHIP_CATALOG:[]).find(x=>x.id===selRec.id);
          if(sd){
            _effectHtml=`<div style="background:rgba(0,243,255,.05);border:1px solid rgba(0,243,255,.3);border-radius:6px;padding:8px 12px;margin-top:6px;font-size:12px;color:var(--cyan)">🚀 ${sd.tier} · HP ${sd.maxHP} · SH ${sd.maxSH||0} · ATT ${sd.ATT||0} · 가격 ₡${(sd.price||0).toLocaleString()}</div>`;
          }
        }
        // 영웅 조건
        const _heroReqHtml=selRec.heroReq?`<div style="font-size:11px;color:var(--purple);margin-top:4px">⭐ 영웅 ${HEROES[selRec.heroReq]?.nm||selRec.heroReq} 영입 필요</div>`:'';
        // 로어 설명
        const _lore=(typeof ITEM_LORE!=='undefined'?ITEM_LORE['part_'+selRec.id]:'')||'';
        const _loreHtml=_lore?`<div style="font-size:11px;color:var(--dim);margin-top:6px;line-height:1.6;white-space:pre-wrap;background:rgba(0,0,0,.25);padding:6px 9px;border-radius:5px">${_lore}</div>`:'';
        return `<div style="background:rgba(5,12,26,.85);border:1px solid ${_tierColor};border-radius:8px;padding:10px 12px;margin-bottom:10px;box-shadow:0 0 12px ${_tierColor}33">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            <span style="font-size:11px;color:${_tierColor};font-weight:bold;letter-spacing:1px">${_tierLabel}</span>
            <span style="font-size:15px;font-weight:bold;color:var(--txt)">${selRec.nm}</span>
          </div>
          ${_effectHtml}
          ${_heroReqHtml}
          ${_loreHtml}
        </div>`;
      })()}

      <!-- 제작 버튼 (상단 좌측) -->
      <div style="margin-bottom:10px">
        <button class="btn btn-gold" id="craftBtn" onclick="doCraft('${selRec?.id||''}')"
          ${craftBtnDis?'disabled':''} style="font-size:13px;padding:8px 16px;letter-spacing:.5px;font-weight:bold">
          ${craftBtnTxt}
        </button>
        <span style="font-size:11px;color:var(--dim);margin-left:8px">🎲 마스터+30%(6.5%) | 상급+15%(11.5%) | 보통(35%) | 하급-10%(23.5%) | 불량-20%(23.5%)</span>
      </div>

      <div style="font-size:14px;font-weight:bold;color:var(--cyan);margin-bottom:2px">⚗️ 함선 제작소</div>
      <div style="font-size:12px;color:var(--dim);margin-bottom:8px">좌측 설계도 선택 → 슬롯 클릭으로 재료 투입 → 제작 버튼</div>

      <!-- 재료 상태 -->
      ${matStatusHtml}

      <!-- 재료 그리드 (12슬롯 4행×3열) -->
      <div style="font-size:11px;color:var(--dim);margin-bottom:4px">📦 재료 슬롯 — 슬롯 클릭 시 재료 선택, [✕] 클릭 시 제거</div>
      ${matGridHtml}

      <!-- 보유 재료 요약 -->
      <div style="margin-top:8px;font-size:13px;color:var(--dim);display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <span>보유 재료:</span>
        ${ownedMats.length>0?ownedMats.map(m=>`<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;background:rgba(255,255,255,.04);border-radius:5px"><img src="img/commodities/${m.id}.png" alt="" style="width:22px;height:22px;border-radius:4px;vertical-align:middle;object-fit:contain" onerror="this.outerHTML='${m.ic||'💎'}'"><span style="color:var(--txt);font-size:12px">${m.nm}</span><span style="color:var(--cyan);font-size:12px;font-weight:bold">×${G.materials[m.id]}</span></span>`).join(''):'없음 — 행성 상점에서 구매하세요'}
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
  let lines=[`${c.ic||'💎'} ${c.nm}`];
  if(fac){
    const allPl=PLANET_DEF.filter(p=>p.f===fac);
    const _allHeroIds=Object.keys(HEROES);
    const _hasAllHeroes=_allHeroIds.every(h=>(G.heroes||[]).includes(h));
    const explored=allPl.filter(p=>G.planets[p.id]?.fog==='A');
    if(_hasAllHeroes){
      lines.push(explored.length>0?`🧭 구매 가능 행성:\n  ${explored.map(p=>p.nm).join('\n  ')}`:'🧭 발견된 행성 없음');
    } else {
      lines.push(`📍 팩션: ${fac}계열 행성`);
      if(allPl.length>0) lines.push(`  (${allPl.slice(0,3).map(p=>p.nm).join(', ')}${allPl.length>3?'…':''})`);
      lines.push('💡 모든 영웅 영입 시\n   행성 위치 정보 공개');
    }
  }
  lines.push(`보유: ${G.materials[matId]||0}개`);
  if(c.buy>0) lines.push(`구매가: ${c.buy.toLocaleString()} CR`);
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
  tip.textContent='📦 필요 재료:\n'+txt.replace(/\s{2,}/g,'\n');
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
      ${imgOrEmoji('img/commodities/'+m.id+'.png',m.ic||'💎',40,40,'border-radius:6px;background:rgba(0,0,0,.3);flex-shrink:0')}
      <div style="flex:1">
        <div style="font-size:14px;color:var(--txt)">${m.nm}${isRec?` <span style="font-size:11px;color:#d4af37">● 필요재료</span>`:''}</div>
        <div style="font-size:12px;color:var(--dim)">${m.desc||''}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:14px;font-weight:bold;color:${have>0?'var(--cyan)':'var(--dim)'}">${have}개 보유</div>
        ${needed>0?`<div style="font-size:11px;color:${have>=needed?'var(--green)':'var(--red)'}">필요 ${needed}개</div>`:''}
      </div>
    </div>`;
  }).join('');
  openModal('📦 재료 선택',
    `<div style="max-height:400px;overflow-y:auto;padding-right:4px">${rowsHtml}</div>
     <div style="margin-top:8px;font-size:12px;color:var(--dim)">💡 재료는 행성 상점에서 구매 가능합니다</div>`,
    [{txt:'취소',fn:closeModal,cls:'btn-sm'}]
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

// ── 통합 퀘스트 카드 ─────────────────────────────────────────────
// 제독 의뢰 / 브로커 의뢰 / 주점 의뢰 모두 동일한 카드 디자인을 공유.
// 퀘스트 종류별 + 문명권(팩션) 이미지:
//   1순위: img/quests/{type}_{factionId}.png  (예: combat_F01.png)
//   2순위: img/quests/{type}.png               (팩션 무관 generic)
//   3순위: type 이모지 폴백
function _questTypeImg(q){
  const t=q.type||'combat';
  const pd=PLANET_DEF.find(p=>p.id===q.planetId);
  const f=pd?.f;
  return f?'img/quests/'+t+'_'+f+'.png':'img/quests/'+t+'.png';
}
function _questTypeImgGeneric(q){
  return 'img/quests/'+(q.type||'combat')+'.png';
}
// 퀘스트 썸네일: 팩션별 → generic → 이모지 순으로 폴백
function _questThumbHtml(q,size){
  size=size||44;
  const facSrc=_questTypeImg(q);
  const genSrc=_questTypeImgGeneric(q);
  const fbEm=q.ic||'⚔️';
  return `<div style="width:${size}px;height:${size}px;flex-shrink:0;position:relative;display:flex;align-items:center;justify-content:center;border-radius:6px">
    <div class="fb" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:${Math.round(size*0.5)}px;pointer-events:none">${fbEm}</div>
    <img src="${facSrc}" data-step="0" data-gen="${genSrc}" alt="" loading="lazy" decoding="async" style="position:relative;width:100%;height:100%;object-fit:contain;z-index:1;border-radius:6px"
      onload="var fb=this.parentNode.querySelector('.fb');if(fb)fb.style.display='none';"
      onerror="if(this.dataset.step==='0'){this.dataset.step='1';this.src=this.dataset.gen;}else{this.style.display='none';var fb=this.parentNode.querySelector('.fb');if(fb)fb.style.display='flex';}">
  </div>`;
}
// 특산물 매수 의뢰 보고 — 화물칸에서 N개 차감 후 status='done' 처리
function submitBuyQuest(pid,idx){
  const q=G.quests[pid]&&G.quests[pid][idx];
  if(!q||q.status!=='active'||q.type!=='buy')return;
  const have=(G.cargo||[]).filter(c=>c.id===q.targetCommId).reduce((s,c)=>s+(c.qty||0),0);
  if(have<q.required){notify('보유 수량 부족: '+have+'/'+q.required,'err');return;}
  // 화물에서 N개 차감 (여러 슬롯 합산)
  let toRemove=q.required;
  for(let i=0;i<G.cargo.length&&toRemove>0;i++){
    const slot=G.cargo[i];
    if(slot.id!==q.targetCommId)continue;
    const take=Math.min(slot.qty,toRemove);
    slot.qty-=take;toRemove-=take;
  }
  G.cargo=G.cargo.filter(s=>s.qty>0);
  q.status='done';q.progress=q.required;
  const _cn=COMMODITIES.find(c=>c.id===q.targetCommId)?.nm||q.targetCommId;
  notify(`📦 ${_cn} ${q.required}개 납품 — 보상 수령 가능`,'gold');
  baekgu('매수 의뢰 보고 완료. 보상 받으러 가자.');
  saveGame(true);
  rerenderTab(renderQuestTab);
}

function _renderQuestCard(q,pid,qlist){
  const realIdx=qlist.indexOf(q);
  const stCfg={available:{bg:'var(--card)',bd:'var(--bdr)',col:'var(--dim)',lbl:'수락 가능'},active:{bg:'rgba(0,243,255,.05)',bd:'var(--cyan)',col:'var(--cyan)',lbl:'진행 중'},done:{bg:'rgba(46,204,113,.06)',bd:'var(--green)',col:'var(--green)',lbl:'보상 수령 가능'},claimed:{bg:'rgba(80,80,80,.1)',bd:'#444',col:'#555',lbl:'완료'}};
  let sc=stCfg[q.status]||stCfg.available;
  // 보이드 히든 퀘스트 — 퍼플 글로우 특별 카드
  const isVoidQuest=q.type==='void_boss';
  if(isVoidQuest){
    const _vLbl={available:'🌑 히든 — 응답 가능',active:'🌑 히든 — 응답 중',done:'🌑 히든 — 보상 가능',claimed:'🌑 히든 — 완료'}[q.status]||'🌑 히든';
    sc={
      bg:'linear-gradient(135deg,rgba(80,0,140,.20),rgba(15,0,30,.85))',
      bd:'#cc66ff',
      col:'#cc66ff',
      lbl:_vLbl
    };
  }
  let progHTML='';
  if(q.type==='gather'&&q.status==='active'){
    const pct=Math.round((q.progress/q.required)*100);
    progHTML='<div style="margin:5px 0"><div style="display:flex;justify-content:space-between;font-size:11px;color:var(--dim);margin-bottom:2px"><span>탐색 진행</span><span>'+q.progress+'/'+q.required+'</span></div><div style="height:4px;background:var(--panel);border-radius:3px;overflow:hidden"><div style="width:'+pct+'%;height:100%;background:var(--cyan);border-radius:3px;transition:width .3s"></div></div></div>';
  }
  if(q.type==='delivery'&&q.status==='active'){
    const tnm=(PLANET_DEF.find(function(p){return p.id===q.targetId;})||{nm:'목적지'}).nm;
    progHTML='<div style="font-size:11px;color:var(--cyan);margin:3px 0">→ '+tnm+' 이동 시 완료</div>';
  }
  if(q.type==='buy'&&q.status==='active'){
    const _have=(G.cargo||[]).filter(c=>c.id===q.targetCommId).reduce((s,c)=>s+(c.qty||0),0);
    const _cn=COMMODITIES.find(c=>c.id===q.targetCommId)?.nm||q.targetCommId;
    const _pct=Math.min(100,Math.round(_have/q.required*100));
    progHTML='<div style="margin:5px 0"><div style="display:flex;justify-content:space-between;font-size:11px;color:var(--dim);margin-bottom:2px"><span>🛒 '+_cn+' 보유</span><span>'+_have+'/'+q.required+'</span></div><div style="height:4px;background:var(--panel);border-radius:3px;overflow:hidden"><div style="width:'+_pct+'%;height:100%;background:#ff8844;border-radius:3px;transition:width .3s"></div></div></div>';
  }
  // ── 카드 액션 버튼: 클릭하기 좋게 2배 확대 + 카드 우측 하단 고정 ──
  // 공통 스타일 (font-size:18px, padding:8px 18px → 기존 대비 약 2배)
  const _BTN_STYLE='font-size:14px;padding:6px 14px;font-weight:bold;line-height:1.15;min-width:70px;border-radius:6px;letter-spacing:.4px';
  const buySubmitBtn=(q.type==='buy'&&q.status==='active')?(()=>{
    const _have=(G.cargo||[]).filter(c=>c.id===q.targetCommId).reduce((s,c)=>s+(c.qty||0),0);
    const _ok=_have>=q.required;
    return '<button class="btn" style="'+_BTN_STYLE+';background:rgba(255,136,68,'+(_ok?'.2':'.05')+');border:1px solid #ff8844;color:#ffaa66'+(_ok?';animation:pulse 1.5s infinite':';opacity:.5')+'" '+(_ok?'':'disabled')+' onclick="submitBuyQuest(\''+pid+'\','+realIdx+')">📦 보고</button>';
  })():'';
  const gatherSearchBtn=(q.type==='gather'&&q.status==='active')?'<button class="btn" style="'+_BTN_STYLE+';background:rgba(0,255,140,.12);border:1px solid rgba(0,255,140,.6);color:var(--green);animation:pulse 2s infinite" onclick="doGatherSearch()">🔭 탐색</button>':'';
  const combatSearchBtn=(q.type==='combat'&&q.status==='active'&&q.nm.includes('치크스'))?'<button class="btn" style="'+_BTN_STYLE+';background:rgba(139,0,255,.14);border:1px solid var(--purple);color:#cc88ff;animation:pulse 2s infinite" onclick="doGatherSearch()">🛸 정찰</button>':'';
  const _qrep=G.reputation||0;
  const _qveLock=(q.rewardVe>=40&&_qrep<200)||(q.rewardVe>=30&&_qrep<100);
  const _qlockMsg=q.rewardVe>=40?'명성 200+ (현재 '+_qrep+')':'명성 100+ (현재 '+_qrep+')';
  const _repMult=getQuestRepTierMult(q);
  const _shownCr=q.rewardCr*_repMult,_shownVe=q.rewardVe*_repMult;
  const _multBadge=_repMult>1?'<span style="font-size:11px;color:var(--gold);font-weight:bold">×'+_repMult+'</span>':'';
  let actionHTML='';
  if(q.status==='available'){
    actionHTML=_qveLock
      ? '<span style="font-size:13px;color:var(--purple)">🔒 '+_qlockMsg+'</span>'
      : '<button class="btn btn-green" style="'+_BTN_STYLE+'" onclick="acceptQuest(\''+pid+'\','+realIdx+')">✓ 수락</button>';
  } else if(q.status==='done'){
    actionHTML='<button class="btn btn-gold" style="'+_BTN_STYLE+'" onclick="completeQuest(\''+pid+'\','+realIdx+')">💰 보상 +₡'+_shownCr.toLocaleString()+'</button>';
  }
  actionHTML=gatherSearchBtn+combatSearchBtn+buySubmitBtn+actionHTML;
  // 종류별 색상 (이미지 폴백 배경)
  const typeCol=q.type==='combat'?'rgba(255,59,59,.12)':q.type==='delivery'?'rgba(0,243,255,.12)':q.type==='gather'?'rgba(0,255,140,.12)':q.type==='explore'?'rgba(212,175,55,.15)':'rgba(180,100,255,.15)';
  const typeBdr=q.type==='combat'?'rgba(255,80,80,.4)':q.type==='delivery'?'rgba(0,243,255,.4)':q.type==='gather'?'rgba(0,255,140,.4)':q.type==='explore'?'rgba(212,175,55,.4)':'rgba(180,100,255,.4)';
  const thumb='<div style="width:46px;height:46px;flex-shrink:0;background:'+typeCol+';border:1px solid '+typeBdr+';border-radius:8px;display:flex;align-items:center;justify-content:center;overflow:hidden">'
    +_questThumbHtml(q,44)
    +'</div>';
  // 보이드 히든 퀘스트 — 보라색 글로우 + 펄스 강조 (특별 카드)
  const _voidStyle=isVoidQuest
    ?';box-shadow:0 0 16px rgba(204,102,255,.45),inset 0 0 12px rgba(204,102,255,.08);animation:_voidPulse 2.4s ease-in-out infinite'
    :'';
  const _voidNmCol=isVoidQuest?'#e0b8ff':'';
  // 카드 본체: flex column 레이아웃 — 상단(썸네일+정보) + 하단(보상+버튼).
  // 하단은 flex space-between으로 좌측 보상과 우측 버튼이 같은 행에 배치되며 절대 겹치지 않음.
  // flex-wrap:wrap으로 좁은 카드에서는 버튼이 한 줄 아래로 떨어져 자동 분리 — 영역 보호.
  return '<div style="background:'+sc.bg+';border:1.5px solid '+sc.bd+';border-radius:8px;padding:8px 10px 10px 10px;display:flex;flex-direction:column;min-height:108px;position:relative;overflow:hidden'+_voidStyle+'">'
    // ── 상단: 썸네일 + 정보 ──
    +'<div style="display:flex;gap:8px;align-items:flex-start;flex:1;min-height:0">'
      +thumb
      +'<div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:3px">'
        +'<div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap"><span style="font-size:13px;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis'+(isVoidQuest?';color:'+_voidNmCol+';text-shadow:0 0 8px rgba(204,102,255,.6)':'')+'">'+q.nm+'</span><span style="font-size:10px;color:'+sc.col+';border:1px solid '+sc.bd+';border-radius:4px;padding:1px 5px;flex-shrink:0'+(isVoidQuest?';background:rgba(204,102,255,.15)':'')+'">'+sc.lbl+'</span></div>'
        +'<div style="font-size:11px;color:'+(isVoidQuest?'#d0a8e8':'var(--dim)')+';line-height:1.4">'+q.desc+'</div>'
        +progHTML
      +'</div>'
    +'</div>'
    // ── 하단: 보상(좌) + 액션 버튼(우) — flex space-between + 영역 보호 ──
    +'<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:8px;flex-wrap:wrap;row-gap:6px">'
      +'<div style="display:flex;align-items:center;gap:6px;flex-wrap:nowrap;flex-shrink:0">'
        +'<span style="font-size:13px;color:var(--gold);font-weight:bold;white-space:nowrap">+₡'+_shownCr.toLocaleString()+'</span>'
        +'<span style="font-size:13px;color:var(--cyan);font-weight:bold;white-space:nowrap">VE+'+_shownVe+'</span>'
        +_multBadge
      +'</div>'
      +'<div style="display:flex;align-items:center;gap:6px;flex-wrap:nowrap;flex-shrink:0;margin-left:auto">'
        +actionHTML
      +'</div>'
    +'</div>'
    +'</div>';
}

function renderQuestTab(body){
  if(!body)return;
  var pid=G.currentPlanet;generateQuests(pid);
  var qlist=G.quests[pid]||[];
  var pd=PLANET_DEF.find(function(p){return p.id===pid;});
  var canLoan=(G.credits||0)<300,alreadyMax=(G.loan||0)>=20000;
  var loanSection=canLoan?'<div style="background:rgba(255,59,59,.1);border:1px solid var(--red);border-radius:8px;padding:10px 12px;margin-bottom:10px"><div style="color:var(--red);font-size:14px;font-weight:bold;margin-bottom:4px">⚠️ 크레딧 부족 — 이동 불가</div><div style="color:var(--dim);font-size:12px;line-height:1.6;margin-bottom:6px">퀘스트 완료 또는 백구 긴급 대출 요청 (한도 20,000, 무이자) · 현재 대출: '+(G.loan||0).toLocaleString()+'</div>'+(alreadyMax?'<div style="color:var(--red);font-size:12px">대출 한도 초과. 퀘스트로 자금을 마련하세요.</div>':'<button class="btn btn-sm btn-red" onclick="takeLoan()">백구 긴급 대출 5,000 요청</button>')+'</div>':'';
  function qCard(q){return _renderQuestCard(q,pid,qlist);}
  // 좌측: 내 퀘스트 (active/done/claimed) — 제독+브로커 모두
  // 우측: 행성 퀘스트 (available) — 제독+브로커 모두
  const myQ=qlist.filter(function(q){return q.status!=='available';});
  const availQ=qlist.filter(function(q){return q.status==='available';});
  // 상태별 정렬: 보상수령가능(done) → 진행중(active) → 완료(claimed)
  const _stOrder={done:0,active:1,claimed:2,available:3};
  myQ.sort((a,b)=>(_stOrder[a.status]||9)-(_stOrder[b.status]||9));
  // 타입별 정렬: 제독 먼저
  availQ.sort((a,b)=>(a.npc==='제독'?0:1)-(b.npc==='제독'?0:1));
  // 히든 보스(void_boss)는 npc='???'라 제독/브로커 어디에도 안 잡힘 → 제독 섹션에 합쳐서 노출
  const myAdmiralQ=myQ.filter(q=>q.npc==='제독'||q.type==='void_boss');
  const myBrokerQ=myQ.filter(q=>q.npc==='브로커');
  const availAdmiralQ=availQ.filter(q=>q.npc==='제독'||q.type==='void_boss');
  const availBrokerQ=availQ.filter(q=>q.npc==='브로커');
  function _section(title,icon,color,bg,bdr,list,emptyMsg){
    if(!list.length)return`<div style="background:${bg};border:1px solid ${bdr};border-radius:8px;padding:10px 12px;margin-bottom:10px"><div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span style="font-size:22px">${icon}</span><div style="color:${color};font-size:14px;font-weight:bold">${title}</div></div><div style="color:var(--dim);font-size:12px;text-align:center;padding:10px">${emptyMsg}</div></div>`;
    return`<div style="background:${bg};border:1px solid ${bdr};border-radius:8px;padding:10px 12px;margin-bottom:10px"><div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span style="font-size:22px">${icon}</span><div><div style="color:${color};font-size:14px;font-weight:bold">${title}</div><div style="color:var(--dim);font-size:11px">${list.length}건</div></div></div><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px">${list.map(qCard).join('')}</div></div>`;
  }
  const leftHTML=
    _section('🎖️ 제독 의뢰 (진행 중/완료)','🎖️','var(--gold)','rgba(212,175,55,.05)','rgba(212,175,55,.25)',myAdmiralQ,'진행 중인 제독 의뢰가 없습니다.')+
    _section('🕴️ 브로커 의뢰 (진행 중/완료)','🕴️','var(--cyan)','rgba(0,243,255,.04)','rgba(0,243,255,.2)',myBrokerQ,'진행 중인 브로커 의뢰가 없습니다.');
  const rightHTML=
    _section('🎖️ 함대 제독 — 수락 가능','🎖️','var(--gold)','rgba(212,175,55,.05)','rgba(212,175,55,.25)',availAdmiralQ,'현재 수락 가능한 제독 의뢰가 없습니다.')+
    _section('🕴️ 브로커 — 수락 가능','🕴️','var(--cyan)','rgba(0,243,255,.04)','rgba(0,243,255,.2)',availBrokerQ,'현재 수락 가능한 브로커 의뢰가 없습니다.');
  body.innerHTML=`<div style="display:flex;flex-direction:column;height:100%;overflow:hidden">
    <!-- 헤더 -->
    <div style="padding:10px 14px 6px;border-bottom:1px solid rgba(255,255,255,.07);flex-shrink:0">
      <div style="font-size:17px;font-weight:bold;color:var(--gold)">🎖️ 퀘스트 — ${pd?pd.nm:''}</div>
      ${loanSection}
    </div>
    <!-- 좌우 분할 -->
    <div style="flex:1;display:flex;flex-direction:row;min-height:0;overflow:hidden">
      <!-- 왼쪽: 나의 퀘스트 -->
      <div data-scroll-id="quest-my" style="flex:1;overflow-y:auto;min-height:0;padding:10px 8px 16px 14px;border-right:1px solid rgba(255,255,255,.07);scrollbar-width:thin;scrollbar-color:rgba(0,243,255,.2) transparent">
        <div style="font-size:12px;color:var(--green);font-weight:bold;margin-bottom:8px;letter-spacing:.5px">📋 나의 퀘스트 (수락·진행·완료)</div>
        ${leftHTML}
      </div>
      <!-- 오른쪽: 행성 퀘스트 (수락 가능) -->
      <div data-scroll-id="quest-avail" style="flex:1;overflow-y:auto;min-height:0;padding:10px 14px 16px 8px;scrollbar-width:thin;scrollbar-color:rgba(0,243,255,.2) transparent">
        <div style="font-size:12px;color:var(--cyan);font-weight:bold;margin-bottom:8px;letter-spacing:.5px">🪐 행성 퀘스트 (수락 가능)</div>
        ${rightHTML}
      </div>
    </div>
  </div>`;
}

// ── 잠긴 메뉴 NPC 대사 (탭/행성별 위트 대사) ──────────────────────
function _getLockedNpcDialog(tab,pid,pd){
  const npcByTab={
    quest:    {ic:'🎖️', title:'제독',     base:'아직 자네를 들일 만큼 안전하지 못하네. 인근 해적부터 정리하고 다시 오게.'},
    trade:    {ic:'🪐', title:'상점 주인', base:'가게 문은 닫혔소. 치안이 어수선해서 좌판도 못 펴고 있다오.'},
    tavern:   {ic:'🍺', title:'주점 주인', base:'테이블 비울 시간도 없소이다. 외곽 정리되거든 또 들르시오.'},
    gacha:    {ic:'🍺', title:'주점 주인', base:'가챠 돌릴 손님 받기 전에 청소부터… 해적부터 좀 치워주시오.'},
    ship:     {ic:'🚀', title:'도크 매니저', base:'우리 격납고는 아직 안전구역이 아니야. 정리되면 환영하겠소.'},
    craft:    {ic:'🔧', title:'제작 장인', base:'화로에 불도 못 붙였어. 일단 인근부터 안전하게 만들어 주시오.'},
    garage:   {ic:'🔩', title:'정비공',   base:'공구함을 풀 분위기가 아니오. 문 밖이 시끄럽거든.'},
    planets:  {ic:'🌍', title:'행정관',   base:'행정 자료는 안정된 행성에만 공개됩니다. 좀 더 정리해 오시지요.'},
    auction:  {ic:'🏛️', title:'경매사',   base:'입찰자들이 무서워서 못 옵니다. 치안부터 챙겨주시면 단상 열겠습니다.'},
    front:    {ic:'🌐', title:'안내인',   base:'프론트는 아직 닫혀 있어요. 인근 위협을 먼저 처리해 주세요.'}
  };
  const npc=npcByTab[tab]||{ic:'👤',title:'담당자',base:'아직은 받아드릴 수 없습니다. 인근을 안전하게 정리해 주세요.'};
  // 행성별 위트 (행성 ID 마지막 글자/숫자로 결정론 분기)
  const flavors={
    'F01':'귀족의 응접실은 함부로 열리지 않소이다.',
    'F02':'금괴 한 닢이라도 가져오시지. 빈손은 못 들이오.',
    'F03':'로그 인증 실패. 해적 데이터 클리어 후 재인증 바람.',
    'F04':'전선 한가운데서 거래가 가당키나 하오? 적부터 치우게.',
    'F05':'사사삭… 치크스가 안 보이는 곳에서 다시 만나자고.',
    'F06':'지구 봉쇄 해제 임무 우선. 잡스런 일은 나중에 합시다.',
    'F07':'균열의 메아리가 들리는군… 조용해질 때까지 기다리오.'
  };
  const facLine=flavors[pd?.f]||npc.base;
  // 행성 이름으로 한 줄 더 위트 추가
  const planetWit=pd?.nm?`이곳 ${pd.nm}에서는 더더욱.`:'';
  return {
    ic: npc.ic,
    title: '— '+(pd?.nm||pid)+' '+npc.title,
    line: npc.base+' '+facLine+' '+planetWit
  };
}

// ═══ 행성 광장 ══════════════════════════════════════════════════
function renderPlazaView(body){
  body.classList.remove('cv');document.body.classList.remove('combat-mode');
  const pd=PLANET_DEF.find(p=>p.id===G.currentPlanet);
  const cards=[
    {tab:'tavern',ic:'🍺',nm:'행성 주점',desc:'크루 가챠 영입 · 브로커 의뢰',color:'var(--yellow)',bg:'rgba(212,175,55,.1)',bdr:'rgba(212,175,55,.3)'},
    {tab:'trade',ic:'🪐',nm:'행성 상점',desc:'특산물 무역 · 화물 매매',color:'var(--green)',bg:'rgba(0,255,140,.07)',bdr:'rgba(0,255,140,.25)'},
    {tab:'quest',ic:'🎖️',nm:'행성 제독',desc:'해적 소탕 · 함대 전투 임무',color:'var(--gold)',bg:'rgba(212,175,55,.07)',bdr:'rgba(212,175,55,.2)'},
  ];
  body.innerHTML=`<div class="hub-scroll">
${hubBanner('plaza','🏪','행성 광장',pd?.f)}
<div class="hub-t">🏪 행성 광장 — ${pd?pd.nm:''}</div>
<div style="color:var(--dim);font-size:13px;margin-bottom:20px;text-align:center">방문 중인 행성의 시설을 이용하세요</div>
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;max-width:520px;margin:0 auto">
${cards.map(c=>`<button onclick="hubTab('${c.tab}')" style="background:${c.bg};border:2px solid ${c.bdr};border-radius:14px;padding:22px 14px;cursor:pointer;text-align:center;transition:all .2s;display:flex;flex-direction:column;align-items:center;gap:8px;width:100%" onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 6px 20px rgba(0,0,0,.5)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
<div style="font-size:46px">${c.ic}</div>
<div style="color:${c.color};font-size:17px;font-weight:bold">${c.nm}</div>
<div style="color:var(--dim);font-size:12px;line-height:1.6">${c.desc}</div>
</button>`).join('')}
</div></div>`;
}

function renderFrontView(body){
  body.classList.remove('cv');document.body.classList.remove('combat-mode');
  const pd=PLANET_DEF.find(p=>p.id===G.currentPlanet);
  const cards=[
    {tab:'planets',ic:'🌍',nm:'행성 현황',desc:'점령 행성 · 세금 현황',color:'var(--green)',bg:'rgba(0,255,140,.07)',bdr:'rgba(0,255,140,.25)'},
    {tab:'auction',ic:'🏛️',nm:'행성 경매',desc:'부동산 입찰 · 행성 점령',color:'var(--gold)',bg:'rgba(212,175,55,.07)',bdr:'rgba(212,175,55,.2)'},
  ];
  body.innerHTML=`<div class="hub-scroll">
${hubBanner('front','🌍','행성 프론트',pd?.f)}
<div class="hub-t">🌍 행성 프론트 — ${pd?pd.nm:''}</div>
<div style="color:var(--dim);font-size:13px;margin-bottom:20px;text-align:center">행성 점령 현황을 확인하고 경매에 참가하세요</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;max-width:380px;margin:0 auto">
${cards.map(c=>`<button onclick="hubTab('${c.tab}')" style="background:${c.bg};border:2px solid ${c.bdr};border-radius:14px;padding:20px 10px;cursor:pointer;text-align:center;transition:all .2s;display:flex;flex-direction:column;align-items:center;gap:8px;width:100%" onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 6px 20px rgba(0,0,0,.5)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
<div style="font-size:38px">${c.ic}</div>
<div style="color:${c.color};font-size:14px;font-weight:bold">${c.nm}</div>
<div style="color:var(--dim);font-size:11px;line-height:1.5">${c.desc}</div>
</button>`).join('')}
</div></div>`;
}

// ═══ 주점 (가챠 + 브로커) ════════════════════════════════════════
function renderTavernView(body){
  const pd=PLANET_DEF.find(p=>p.id===G.currentPlanet);
  body.classList.add('cv');
  const vc=G.voidCrystal,cr=G.credits;
  const hasNelson=G.heroes.includes('H05');
  const legRate=hasNelson?'10.5%':'0.5%';
  // 브로커 퀘스트 HTML — 좌(나의 의뢰) / 우(행성 의뢰) 분할
  const pid=G.currentPlanet;
  generateQuests(pid);
  const qlist=G.quests[pid]||[];
  const brokerQ=qlist.filter(q=>q.npc==='브로커');
  function brokerCard(q){return _renderQuestCard(q,pid,qlist);}
  const myBrokers=brokerQ.filter(q=>q.status!=='available').sort((a,b)=>{const o={done:0,active:1,claimed:2};return (o[a.status]||9)-(o[b.status]||9);});
  const availBrokers=brokerQ.filter(q=>q.status==='available');
  const myBrokerHtml=myBrokers.length>0
    ? `<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px">${myBrokers.map(q=>brokerCard(q)).join('')}</div>`
    : `<div style="color:var(--dim);font-size:12px;padding:14px 6px;text-align:center">진행 중인 브로커 의뢰가 없습니다</div>`;
  const availBrokerHtml=availBrokers.length>0
    ? `<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px">${availBrokers.map(q=>brokerCard(q)).join('')}</div>`
    : `<div style="color:var(--dim);font-size:12px;padding:14px 6px;text-align:center">수락 가능한 의뢰가 없습니다 — 다른 행성 방문 후 재방문하세요</div>`;
  // P30 보이드 보스 소문 (모든 보이드 행성 보유 시 백구가 귀띔) — 격파/진행 상태별 메시지
  const voidBossRumorHtml=(()=>{
    if(!(pid==='P30'&&_allVoidOwned()))return '';
    if(G._voidFalconDefeated){
      return `<div style="background:rgba(0,100,40,.13);border:1px solid rgba(0,255,140,.35);border-radius:8px;padding:10px 12px;margin-top:10px">
        <div style="display:flex;align-items:center;gap:7px;margin-bottom:6px">
          <span style="font-size:20px">🐕</span>
          <div><div style="color:var(--green);font-size:12px;font-weight:bold">백구 — 격파 완료</div></div>
        </div>
        <div style="font-size:12px;color:rgba(180,255,200,.9);line-height:1.6">
          "그 검은 함선… 우리가 잡았잖아. 이젠 균열 너머가 조용해. 잠시는."
        </div>
      </div>`;
    }
    const q=(G.quests?.['P30']||[]).find(q=>q.id==='q_void_boss');
    const _statusLbl=!q?'아직 등장 안 함 — 광장 한 번 들어가면 즉시 게시돼.':
      q.status==='available'?'<span style="color:var(--gold)">▶ 제독 의뢰 — 수락 가능 (광장 → 퀘스트 탭)</span>':
      q.status==='active'?'<span style="color:var(--cyan)">⏳ 진행 중 — 광장 → 퀘스트 탭에서 확인</span>':
      q.status==='done'?'<span style="color:var(--green)">✅ 보상 수령 가능 — 광장 → 퀘스트 탭</span>':
      '<span style="color:var(--dim)">완료된 퀘스트</span>';
    return `<div style="background:rgba(80,0,120,.13);border:1px solid rgba(180,0,255,.35);border-radius:8px;padding:10px 12px;margin-top:10px">
      <div style="display:flex;align-items:center;gap:7px;margin-bottom:6px">
        <span style="font-size:20px">🐕</span>
        <div>
          <div style="color:var(--purple);font-size:12px;font-weight:bold">백구 — 극비 정보</div>
          <div style="color:var(--dim);font-size:10px">주점 구석에서 속삭인다…</div>
        </div>
      </div>
      <div style="font-size:12px;color:rgba(220,180,255,.9);line-height:1.6">
        "주인, 들어봐. 이 근방에서 이상한 신호 잡혔어.<br>
        보이드 균열지대 전부를 누가 사들였다는 소문 퍼지자마자…<br>
        <span style="color:var(--purple);font-weight:bold">검은 소형함 하나</span>가 나타났대. 아무 식별코드도 없이.<br>
        현지인들은 <span style="color:#ff66ff;font-weight:bold">팔콘 스카우트</span>라고 불러.<br>
        목적 불명. 무기 등급 불명. 출신 행성 불명.<br>
        ※ 의뢰는 <span style="color:#ff66ff;font-weight:bold">제타 레티쿨리(P30) 광장</span>에서만 접수 가능."
      </div>
      <div style="margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,.08);font-size:12px">${_statusLbl}</div>
    </div>`;
  })();
  body.innerHTML=`
  <div class="gc-panel" style="flex-direction:column;overflow:hidden">
    <div style="display:flex;align-items:center;gap:5px;padding:7px 10px;border-bottom:1px solid var(--bdr);flex-shrink:0;background:rgba(5,10,22,.97);flex-wrap:wrap">
      <button class="gc-action" style="flex:1;min-width:80px;padding:5px 4px;font-size:11px;background:rgba(0,243,255,.08);border-color:var(--cyan);color:var(--cyan)${cr<500?';opacity:.38;cursor:not-allowed':''}" ${cr>=500?'':'disabled'} onclick="doGacha(1,true,500,'N')">
        💰 ₡500<br><span style="font-size:10px;opacity:.8">일반~전설</span>
      </button>
      <button class="gc-action" style="flex:1;min-width:80px;padding:5px 4px;font-size:11px;background:rgba(30,100,255,.12);border-color:#4499ff;color:#88ccff${cr<2000?';opacity:.38;cursor:not-allowed':''}" ${cr>=2000?'':'disabled'} onclick="doGacha(1,true,2000,'R')">
        💎 ₡2,000<br><span style="font-size:10px;opacity:.8">희귀~전설</span>
      </button>
      <button class="gc-action" style="flex:1;min-width:80px;padding:5px 4px;font-size:11px;background:rgba(139,0,255,.14);border-color:var(--purple);color:#cc88ff${vc<5?';opacity:.38;cursor:not-allowed':''}" ${vc>=5?'':'disabled'} onclick="doGacha(5)">
        💜 VC×5<br><span style="font-size:10px;opacity:.8">영웅 집중</span>
      </button>
      <button class="gc-action" style="flex:1;min-width:80px;padding:5px 4px;font-size:11px;background:rgba(212,175,55,.14);border-color:var(--gold);color:var(--gold)${vc<1?';opacity:.38;cursor:not-allowed':''}" ${vc>=1?'':'disabled'} onclick="doGacha(1)">
        ✨ VC×1<br><span style="font-size:10px;opacity:.8">전설 도전</span>
      </button>
      <div style="display:flex;flex-direction:column;gap:2px;padding:0 4px;min-width:90px">
        <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--dim)"><span>천장</span><span style="color:${G.gachaPity>=60?'var(--gold)':'var(--muted)'}">${G.gachaPity}/80</span></div>
        <div style="height:4px;background:var(--panel);border-radius:2px;overflow:hidden"><div style="height:100%;width:${Math.round(G.gachaPity/80*100)}%;background:${G.gachaPity>=60?'var(--gold)':'var(--cyan)'};border-radius:2px;transition:width .3s"></div></div>
        <div style="font-size:10px;color:var(--dim);white-space:nowrap;margin-top:1px">VC <span style="color:var(--cyan)">${vc}</span> · ₡<span style="color:var(--gold)">${cr.toLocaleString()}</span> · 크루 <span style="color:var(--green)">${G.crew.length}명</span></div>
      </div>
      <div style="margin-left:auto;padding:5px 8px;background:rgba(255,255,255,.03);border-radius:6px;font-size:10px;color:var(--muted);line-height:1.75;text-align:center;border:1px solid rgba(255,255,255,.06);flex-shrink:0">
        <div style="color:var(--dim);font-size:10px;font-weight:bold;margin-bottom:1px">📊 확률</div>
        전설 <span style="color:var(--gold)">${legRate}</span> · 영웅 <span style="color:var(--purple)">5.5%</span><br>
        희귀 <span style="color:var(--blue)">24%</span> · 일반 <span style="color:#666">70%</span><br>
        <span style="font-size:9px">80회 천장${hasNelson?' · <span style="color:var(--gold)">🎖️+10%</span>':''}</span>
      </div>
    </div>
    <div class="gc-main" style="display:flex;flex-direction:column;flex:1;overflow:hidden">
      <div style="position:relative;min-height:140px;flex-shrink:0">
        <div class="gc-tavern-bg">
          <img src="${pd?.f?'img/hub/'+pd.f+'/tavern.png':'img/hub/tavern.png'}" data-gen="img/hub/tavern.png" data-loc="img/locations/tavern.png" alt="주점"
            onerror="var g=this.dataset.gen,l=this.dataset.loc;if(this.src!==g&&!this.src.endsWith(g)){this.src=g}else if(this.src!==l&&!this.src.endsWith(l)){this.src=l}else{this.style.display='none';this.nextElementSibling.style.display='flex'}">
          <div class="gc-tavern-bg-fallback">
            <div style="display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;gap:6px">
              <div style="font-size:60px;opacity:.4">🍺</div>
            </div>
          </div>
        </div>
        <div class="gc-tavern-overlay"></div>
        <div class="gc-result">
          <div class="gc-result-hdr">
            <div style="color:var(--yellow);font-size:14px;font-weight:bold">👥 영입된 크루</div>
            <div style="color:var(--dim);font-size:11px;margin-top:1px">${pd?.nm||''} 주점 — 뽑기로 동료를 영입하세요</div>
          </div>
          <div class="gc-result-body" id="gc-result-body">
            <div class="gc-empty">
              <div style="font-size:30px;margin-bottom:4px">🎲</div>
              <div>뽑기를 시작하세요</div>
            </div>
          </div>
        </div>
      </div>
      <div style="background:rgba(0,243,255,.04);border-top:1px solid rgba(0,243,255,.2);flex:1;overflow:hidden;display:flex;flex-direction:column;min-height:0">
        <div style="display:flex;align-items:center;gap:7px;padding:8px 12px 6px;flex-shrink:0">
          <span style="font-size:20px">🕴️</span>
          <div>
            <div style="color:var(--cyan);font-size:13px;font-weight:bold">화물 브로커</div>
            <div style="color:var(--dim);font-size:11px">배달 · 자원 채취 의뢰</div>
          </div>
        </div>
        <!-- 좌우 분할 -->
        <div style="flex:1;display:flex;flex-direction:row;min-height:0;overflow:hidden">
          <div data-scroll-id="tavern-my" style="flex:1;overflow-y:auto;min-height:0;padding:6px 8px 10px 12px;border-right:1px solid rgba(0,243,255,.15);scrollbar-width:thin;scrollbar-color:rgba(0,243,255,.2) transparent">
            <div style="font-size:11px;color:var(--green);font-weight:bold;margin-bottom:6px;letter-spacing:.5px">📋 나의 의뢰 (수락·진행·완료)</div>
            ${myBrokerHtml}
          </div>
          <div data-scroll-id="tavern-avail" style="flex:1;overflow-y:auto;min-height:0;padding:6px 12px 10px 8px;scrollbar-width:thin;scrollbar-color:rgba(0,243,255,.2) transparent">
            <div style="font-size:11px;color:var(--cyan);font-weight:bold;margin-bottom:6px;letter-spacing:.5px">🪐 행성 의뢰 (수락 가능)</div>
            ${availBrokerHtml}
          </div>
        </div>
        ${voidBossRumorHtml}
      </div>
    </div>
  </div>`;
}

function renderGachaView(body){renderTavernView(body);}

function renderGachaCards(results){
  const c=document.getElementById('gc-result-body');if(!c)return;
  const rarityNm={N:'일반',R:'희귀',H:'영웅',L:'전설',S:'스토리'};
  const rarityCol={N:'var(--dim)',R:'var(--blue)',H:'var(--purple)',L:'var(--gold)',S:'#ff6ec7'};
  const CREW_BONUS={Pilot:{att:8,int2:2,tec:4},Eng:{att:2,int2:5,tec:8},Merch:{att:3,int2:7,tec:4}};
  // 결과 없으면 빈 상태 복원 (가챠 안 했을 때)
  if(!results||results.length===0){
    c.innerHTML=`<div class="gc-empty"><div style="font-size:30px;margin-bottom:4px">🎲</div><div>뽑기를 시작하세요</div></div>`;
    return;
  }
  // 컴팩트 카드 — 1행 8명, 왼쪽에서부터 영입 순서대로
  c.innerHTML=results.map((r,i)=>{
    const rKey='r'+r.rarity;
    const rnm=rarityNm[r.rarity]||'';
    const rcol=rarityCol[r.rarity]||'var(--dim)';
    const cb=CREW_BONUS[r.cl]||{att:3,int2:3,tec:3};
    const m=RARITY_MULT[r.rarity]||1;
    const bonusTxt=['att','int2','tec'].filter(k=>cb[k]>0).map(k=>`${k.replace('int2','SHD').replace('att','ATT').replace('tec','ENG').replace('def','DEF')}+${Math.round(cb[k]*m)}`).join(' ');
    const gen=(r.ic||'👩').includes('👩')||r.nm?.endsWith('a')?'f':'m';
    const safeName=(r.nm||'(이름없음)').replace(/"/g,'&quot;');
    const titleAttr=`${safeName} · ${r.cl||'-'} · ${rnm}${bonusTxt?' · '+bonusTxt:''}`;
    return `<div class="gc-char ${rKey}" style="animation-delay:${i*0.08}s" title="${titleAttr}">
      <div style="position:relative">
        ${imgOrEmoji('img/crew/'+(r.cl||'Merch')+'_'+gen+'.png',r.ic||'🧑',48,48,'border-radius:50%;border:2px solid '+rcol+';background:var(--panel)')}
      </div>
      <div style="color:${rcol};font-size:12px;font-weight:bold;line-height:1.15;width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0 2px">${safeName}</div>
      <div style="font-size:10px;color:var(--dim);line-height:1.1">${r.cl||''}</div>
      <div style="font-size:9px;font-weight:bold;color:#000;background:${rcol};border-radius:3px;padding:1px 4px;letter-spacing:.5px">${rnm}</div>
    </div>`;
  }).join('');
  c.scrollTop=0;
  // 헤더 크레딧 업데이트
  const hdr=c.closest('.gc-result')?.querySelector('.gc-result-hdr div:last-child');
  if(hdr)hdr.textContent=`현재 크루 ${G.crew.length}명 | VC ${G.voidCrystal} | ₡${G.credits.toLocaleString()}`;
}

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
  // 보이드 행성: 신화 파츠 4종 + 전설기함 보유 시 경매 가능
  const canBuyVoid=_hasAllMythicParts()&&_hasLegendaryFlagship();
  const voidAvail=canBuyVoid?PLANET_DEF.filter(p=>{const st=G.planets[p.id];return p.void&&st&&!st.owned;}):[];
  function normalCard(p){
    const f=FACTION[p.f],startBid=Math.floor(p.tax*8*auctDiff*gwanggaetoDisc*0.8),instBid=Math.floor(startBid*1.3),roi=Math.round(startBid/p.tax);
    const dis=(bidsLeft<=0||_planetsAtLimit)?'disabled':'';
    return `<div class="pl-item" style="flex-direction:row;align-items:stretch;overflow:hidden;padding:0;min-height:130px">
      <!-- 좌측: 정보 + 버튼 -->
      <div style="flex:1;padding:12px;display:flex;flex-direction:column;justify-content:space-between;gap:6px;min-width:0">
        <div>
          <div style="font-size:16px;font-weight:bold">${p.nm}</div>
          <div style="font-size:12px;color:${f.col};margin-top:2px">${f.nm} | 링${p.ring}</div>
          <div style="font-size:12px;color:var(--dim);margin-top:3px">세율 ₡${p.tax.toLocaleString()}/턴 | 회수 ${roi}턴</div>
          <div style="font-size:12px;margin-top:3px">시작가 <span style="color:var(--cyan)">₡${startBid.toLocaleString()}</span> | 즉시 <span style="color:var(--gold)">₡${instBid.toLocaleString()}</span></div>
        </div>
        <div style="display:flex;gap:5px;align-items:center;flex-wrap:wrap">
          <button class="btn btn-sm btn-gold" onclick="doBid('${p.id}',${instBid},true)" ${G.credits>=instBid&&bidsLeft>0&&!_planetsAtLimit?'':'disabled'} title="100% 낙찰 확정" style="white-space:nowrap;font-size:11px;padding:4px 8px">즉시낙찰<br>₡${instBid.toLocaleString()}</button>
          <button class="btn btn-sm" style="border-color:var(--cyan);color:var(--cyan);white-space:nowrap;font-size:11px;padding:4px 8px" onclick="customBid('${p.id}',${startBid})" ${G.credits>=startBid&&bidsLeft>0&&!_planetsAtLimit?'':'disabled'}>직접입찰<br>확률입찰</button>
          <input class="inp" type="number" id="bid-${p.id}" placeholder="₡${startBid.toLocaleString()} 이상" min="${startBid}" style="width:80px;height:28px;font-size:11px">
        </div>
      </div>
      <!-- 우측: 행성 이미지 꽉채움 -->
      <div style="width:110px;flex-shrink:0;overflow:hidden;background:#050a1a">
        <img src="img/planets/${p.id}.png" style="width:100%;height:100%;object-fit:cover;opacity:.85"
          onerror="this.style.display='none'">
      </div>
    </div>`;
  }
  function hostileCard(p){
    const f=FACTION[p.f];
    const startBid=Math.floor(p.tax*8*auctDiff*2.5*gwanggaetoDisc*0.8);
    const instBid=Math.floor(startBid*1.3);
    const roi=Math.round(startBid/p.tax);
    const dis=(bidsLeft<=0||_planetsAtLimit)?'disabled':'';
    return `<div class="pl-item" style="flex-direction:row;align-items:stretch;overflow:hidden;padding:0;border-color:#8b00ff88;background:rgba(139,0,255,.06);min-height:130px">
      <!-- 좌측: 정보 + 버튼 -->
      <div style="flex:1;padding:12px;display:flex;flex-direction:column;justify-content:space-between;gap:6px;min-width:0">
        <div>
          <div style="font-size:16px;font-weight:bold;color:#cc66ff">${p.nm} <span style="font-size:11px;background:#8b00ff33;border:1px solid #8b00ff66;padding:1px 5px;border-radius:6px">⚔️ 합병</span></div>
          <div style="font-size:12px;color:${f.col};margin-top:2px">${f.nm} | 링${p.ring} | 전투 승리 ✅</div>
          <div style="font-size:12px;color:var(--dim);margin-top:3px">세율 ₡${p.tax.toLocaleString()}/턴 | 회수 ${roi}턴</div>
          <div style="font-size:12px;margin-top:3px">시작가 <span style="color:#cc66ff">₡${startBid.toLocaleString()}</span> | 즉시 <span style="color:var(--gold)">₡${instBid.toLocaleString()}</span></div>
          <div style="font-size:11px;color:#cc66ff;margin-top:2px">합병 후 전투 없이 방문 가능</div>
        </div>
        <div style="display:flex;gap:5px;align-items:center;flex-wrap:wrap">
          <button class="btn btn-sm" style="border-color:#8b00ff;color:#cc66ff;background:rgba(139,0,255,.12);white-space:nowrap;font-size:11px;padding:4px 8px" onclick="doBid('${p.id}',${instBid},true)" ${G.credits>=instBid&&bidsLeft>0&&!_planetsAtLimit?'':'disabled'}>즉시합병<br>₡${instBid.toLocaleString()}</button>
          <button class="btn btn-sm" style="border-color:#8b00ff;color:#cc66ff;white-space:nowrap;font-size:11px;padding:4px 8px" onclick="customBid('${p.id}',${startBid})" ${G.credits>=startBid&&bidsLeft>0&&!_planetsAtLimit?'':'disabled'}>직접입찰<br>확률입찰</button>
          <input class="inp" type="number" id="bid-${p.id}" placeholder="₡${startBid.toLocaleString()} 이상" min="${startBid}" style="width:80px;height:28px;font-size:11px">
        </div>
      </div>
      <!-- 우측: 행성 이미지 꽉채움 -->
      <div style="width:110px;flex-shrink:0;overflow:hidden;background:#0a0518">
        <img src="img/planets/${p.id}.png" style="width:100%;height:100%;object-fit:cover;opacity:.8"
          onerror="this.style.display='none'">
      </div>
    </div>`;
  }
  // 보이드 카드 (치크스 2배 세금, 5배 배율 투자)
  function voidCard(p){
    // 보이드: 치크스(25000)의 2배 세율(50000) × 5배 배율 입찰 (치크스 2.5× → 보이드 5×)
    const startBid=Math.floor(p.tax*8*auctDiff*5*gwanggaetoDisc*0.8);
    const instBid=Math.floor(startBid*1.4); // 보이드는 +40% 프리미엄
    const roi=Math.round(startBid/p.tax);
    return `<div class="pl-item" style="flex-direction:row;align-items:stretch;overflow:hidden;padding:0;border-color:rgba(0,243,255,.5);background:rgba(0,243,255,.05);min-height:130px">
      <div style="flex:1;padding:12px;display:flex;flex-direction:column;justify-content:space-between;gap:6px;min-width:0">
        <div>
          <div style="font-size:16px;font-weight:bold;color:var(--cyan)">${p.nm} <span style="font-size:11px;background:rgba(0,243,255,.12);border:1px solid rgba(0,243,255,.4);padding:1px 5px;border-radius:6px">🌌 균열지대</span></div>
          <div style="font-size:12px;color:var(--cyan);margin-top:2px">보이드 | 링${p.ring} | 균열 지대</div>
          <div style="font-size:12px;color:var(--dim);margin-top:3px">세율 <b style="color:var(--cyan)">₡${p.tax.toLocaleString()}/턴</b> — 치크스 2배 💰 | 회수 ${roi}턴</div>
          <div style="font-size:12px;margin-top:3px">시작가 <span style="color:var(--cyan)">₡${startBid.toLocaleString()}</span> | 즉시 <span style="color:var(--gold)">₡${instBid.toLocaleString()}</span></div>
          <div style="font-size:11px;color:rgba(0,243,255,.6);margin-top:2px">✦신화 파츠 4종 + 신화/전설기함 함선 보유 조건 충족</div>
        </div>
        <div style="display:flex;gap:5px;align-items:center;flex-wrap:wrap">
          <button class="btn btn-sm" style="border-color:var(--cyan);color:var(--cyan);background:rgba(0,243,255,.12);white-space:nowrap;font-size:11px;padding:4px 8px" onclick="doBid('${p.id}',${instBid},true)" ${G.credits>=instBid&&bidsLeft>0&&!_planetsAtLimit?'':'disabled'}>즉시낙찰<br>₡${instBid.toLocaleString()}</button>
          <button class="btn btn-sm" style="border-color:rgba(0,243,255,.5);color:var(--cyan);white-space:nowrap;font-size:11px;padding:4px 8px" onclick="customBid('${p.id}',${startBid})" ${G.credits>=startBid&&bidsLeft>0&&!_planetsAtLimit?'':'disabled'}>직접입찰<br>확률입찰</button>
          <input class="inp" type="number" id="bid-${p.id}" placeholder="₡${startBid.toLocaleString()} 이상" min="${startBid}" style="width:90px;height:28px;font-size:11px">
        </div>
      </div>
      <div style="width:110px;flex-shrink:0;overflow:hidden;background:#050a1a">
        <img src="img/planets/${p.id}.png" style="width:100%;height:100%;object-fit:cover;opacity:.75" onerror="this.style.display='none'">
      </div>
    </div>`;
  }
  const noNormal=avail.length===0,noHostile=hostileAvail.length===0,noVoid=voidAvail.length===0;
  // 신화 파츠 보유 현황 표시
  const mythicStatus=QUEST_MYTHIC_PARTS.map(pid=>{
    const p=partById(pid);
    const has=(G.inventory||[]).some(i=>i.id===pid&&i.qty>0)||(G.fleet||[]).some(sh=>(sh.parts||[]).includes(pid));
    return `<span style="color:${has?'var(--green)':'var(--dim)'}">■${p?.nm?.replace(' ✦신화','').replace(' ❖신화','')||pid}</span>`;
  }).join('&nbsp;');
  const hasFlag=_hasLegendaryFlagship();
  // 좌측: 내 보유 행성 카드 리스트
  const ownedList=PLANET_DEF.filter(p=>G.planets[p.id]?.owned);
  const ownedCardHtml=ownedList.length===0
    ? `<div style="background:var(--card);border:1px dashed var(--bdr);border-radius:8px;padding:24px;text-align:center;color:var(--dim);font-size:13px">보유 행성 없음<br><span style="font-size:11px">우측에서 행성을 낙찰하세요</span></div>`
    : ownedList.map(p=>{
        const st=G.planets[p.id],f=FACTION[p.f],lv=st.commerce||0;
        const tax=calcTaxFor(p.id),investCost=Math.floor(p.tax*7.2*Math.pow(1.548,lv)*(1+G.act/2)*0.56);
        const pBg=p.hostile?'#1a0505':p.void?'#0a0518':'#0a1828';
        return `<div style="background:var(--card);border:1px solid var(--gold);border-radius:10px;overflow:hidden;display:flex;flex-direction:row;min-height:110px">
          <div style="width:80px;flex-shrink:0;overflow:hidden;background:${pBg}">
            <img src="img/planets/${p.id}.png" style="width:100%;height:100%;object-fit:cover;opacity:.9" onerror="this.style.display='none'">
          </div>
          <div style="flex:1;padding:8px 10px;display:flex;flex-direction:column;gap:3px;min-width:0">
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
              <span style="font-size:13px;font-weight:bold;color:var(--gold);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.nm}</span>
              <span style="font-size:9px;color:${f.col};border:1px solid ${f.col};border-radius:3px;padding:0 4px">${f.nm}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:11px"><span style="color:var(--dim)">상업 Lv</span><span style="color:var(--gold);font-weight:bold">${lv}/10</span></div>
            <div style="height:4px;background:var(--panel);border-radius:2px;overflow:hidden"><div style="width:${lv*10}%;height:100%;background:linear-gradient(90deg,var(--gold),#ffaa00)"></div></div>
            <div style="font-size:11px;color:var(--green);font-weight:bold;margin-top:auto">💰 ₡${tax.toLocaleString()}/턴</div>
            ${lv<10?`<button class="btn btn-sm btn-gold" style="font-size:10px;padding:3px 6px;width:100%" onclick="investPlanet('${p.id}')" ${G.credits>=investCost?'':'disabled'}>📈 투자 Lv${lv+1} (₡${investCost.toLocaleString()})</button>`:'<span style="font-size:10px;color:var(--gold);text-align:center;padding:3px">⭐ 최대레벨</span>'}
          </div>
        </div>`;
      }).join('');
  const totalTax=ownedList.reduce((s,p)=>s+calcTaxFor(p.id),0);
  const ownedPanel=`<div style="display:flex;flex-direction:column;height:100%;min-height:0">
    <div style="background:rgba(212,175,55,.06);border:1px solid rgba(212,175,55,.3);border-radius:8px;padding:8px 10px;margin-bottom:10px;flex-shrink:0">
      <div style="font-size:13px;font-weight:bold;color:var(--gold);margin-bottom:3px">🏠 내 보유 행성 (${ownedList.length}/${_maxPlanets2})</div>
      <div style="font-size:11px;color:var(--green)">총 세금 수입: <b>₡${totalTax.toLocaleString()}/턴</b></div>
    </div>
    <div data-scroll-id="auct-owned" style="flex:1;overflow-y:auto;min-height:0;display:flex;flex-direction:column;gap:8px;padding-right:4px;scrollbar-width:thin;scrollbar-color:rgba(212,175,55,.3) transparent">${ownedCardHtml}</div>
  </div>`;
  // 우측: 입찰 중 행성 (기존 카드들)
  const biddingHtml=`<div style="display:flex;flex-direction:column;height:100%;min-height:0">
    <div style="background:rgba(212,175,55,.07);border:1px solid rgba(212,175,55,.25);border-radius:6px;padding:8px 10px;font-size:11px;color:var(--dim);margin-bottom:10px;line-height:1.6;flex-shrink:0">
      💡 <b style="color:var(--gold)">즉시낙찰</b> +30% 프리미엄 100% 확정 · <b style="color:var(--cyan)">직접입찰</b> 60~90% 확률<br>
      💡 난이도 ${{easy:'쉬움 +5%',normal:'보통 +15%',hard:'어려움 +22%',extreme:'극악 +30%'}[G.difficulty]||'보통 +15%'} · 턴당 2회 입찰
    </div>
    ${G.heroes.includes('H03')?`<div style="background:rgba(255,215,0,.06);border:1px solid rgba(255,215,0,.25);border-radius:6px;padding:6px 10px;font-size:11px;color:var(--gold);margin-bottom:8px;flex-shrink:0">👑 광개토대왕 효과: 경매가 30% 할인</div>`:''}
    ${bidsLeft<=0?`<div style="background:rgba(255,60,60,.07);border:1px solid rgba(255,60,60,.3);border-radius:6px;padding:8px;text-align:center;color:var(--red);font-size:12px;margin-bottom:8px;flex-shrink:0">이번 턴 입찰 소진</div>`:''}
    ${_planetsAtLimit?`<div style="background:rgba(255,165,0,.07);border:1px solid rgba(255,165,0,.3);border-radius:6px;padding:8px;text-align:center;color:var(--yellow);font-size:12px;margin-bottom:8px;flex-shrink:0">🔒 행성 한도 도달 (${_ownedCnt2}/${_maxPlanets2})</div>`:''}
    <div data-scroll-id="auct-bid" style="flex:1;overflow-y:auto;min-height:0;padding-right:4px;scrollbar-width:thin;scrollbar-color:rgba(0,243,255,.2) transparent">
      ${noNormal&&noHostile?`<div style="background:var(--card);border:1px dashed var(--bdr);border-radius:8px;padding:24px;text-align:center;color:var(--dim)">경매 가능한 행성 없음<br><span style="font-size:13px">은하 지도에서 탐험하고 치크스 행성을 공략하세요</span></div>`:''}
      ${noNormal?'':`<div style="font-size:13px;font-weight:bold;color:var(--gold);margin-bottom:8px">🌐 일반 행성</div><div style="display:grid;grid-template-columns:1fr;gap:8px;margin-bottom:14px">`+avail.map(normalCard).join('')+`</div>`}
      ${noHostile?`<div style="background:rgba(139,0,255,.04);border:1px dashed #8b00ff44;border-radius:8px;padding:12px;text-align:center;color:#8b00ff88;font-size:12px;margin-bottom:14px">⚔️ 치크스 행성 전투 승리 시 합병 가능</div>`:
        `<div style="font-size:13px;font-weight:bold;color:#cc66ff;margin-bottom:8px">💀 치크스 전략 합병</div><div style="display:grid;grid-template-columns:1fr;gap:8px;margin-bottom:14px">`+hostileAvail.map(hostileCard).join('')+`</div>`}
      ${canBuyVoid&&!noVoid
        ?`<div style="font-size:13px;font-weight:bold;color:var(--cyan);margin-bottom:8px">🌌 보이드 균열지대</div><div style="display:grid;grid-template-columns:1fr;gap:8px">`+voidAvail.map(voidCard).join('')+`</div>`
        :canBuyVoid&&noVoid
          ?`<div style="background:rgba(0,243,255,.04);border:1px dashed rgba(0,243,255,.25);border-radius:6px;padding:10px;text-align:center;color:var(--cyan);font-size:12px">🌌 모든 보이드 균열지대 낙찰 완료</div>`
          :`<div style="background:rgba(0,243,255,.04);border:1px dashed rgba(0,243,255,.2);border-radius:6px;padding:10px;font-size:12px;color:var(--dim)">
            <div style="color:var(--cyan);font-weight:bold;margin-bottom:4px">🌌 보이드 균열지대 — 잠금</div>
            <div style="margin-bottom:4px">신화 파츠 4종 + 전설기함 필요</div>
            <div style="font-size:11px;line-height:1.6">${mythicStatus}</div>
            <div style="font-size:11px;margin-top:3px;color:${hasFlag?'var(--green)':'var(--dim)'}">■ 신화/전설기함 함선 ${hasFlag?'✅':'⬜'}</div>
          </div>`
      }
    </div>
  </div>`;
  body.innerHTML=`<div style="display:flex;flex-direction:column;height:100%;overflow:hidden">
    ${hubBanner('auction','🏛️','행성 경매',PLANET_DEF.find(p=>p.id===G.currentPlanet)?.f)}
    <div style="padding:8px 14px 4px;flex-shrink:0">
      <div class="hub-t" style="margin:0">🏛️ 행성 경매 <span style="font-size:12px;font-weight:normal;color:${bidsLeft>0?'var(--cyan)':'var(--red)'}">입찰 ${bidsLeft}/2회</span>&nbsp;&nbsp;<span style="font-size:12px;font-weight:normal;color:${_planetsAtLimit?'var(--red)':'var(--dim)'}">| 소유 ${_ownedCnt2}/${_maxPlanets2}개</span></div>
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
  if(G.credits<amount){notify('크레딧 부족','err');return;}
  const _ownedCnt=Object.values(G.planets).filter(p=>p.owned).length;
  const _maxPlanets=_maxOwnedPlanets();
  if(_ownedCnt>=_maxPlanets){notify(`🔒 행성 보유 한도 초과 — 현재 ${_ownedCnt}/${_maxPlanets}개 (명성 ${(_maxPlanets)*20} 달성 시 +1 슬롯)`,'err');return;}
  if(!instant){
    // 직접입찰: 낙찰 확률 60~90% (입찰금액 / 즉시낙찰가 비율로 계산)
    const _auctDiff={easy:1.05,normal:1.15,hard:1.22,extreme:1.30}[G.difficulty]||1.15;
    // 보이드(균열지대) 5배, 치크스(적대) 2.5배, 일반 1배 배율 적용
    const _bidMult=pd.void?5:pd.hostile?2.5:1;
    const instPrice=Math.floor((pd.tax*8)*_auctDiff*_bidMult*1.3);
    const ratio=Math.min(1.0,amount/instPrice);
    const chance=Math.round(60+ratio*30); // 60%~90%
    if(Math.random()*100>chance){
      G.credits-=Math.floor(amount*0.1); // 수수료 10% 차감
      if(!G.auctionBids)G.auctionBids=0;if((G.auctionBidTurn||-1)!==G.turn){G.auctionBids=0;G.auctionBidTurn=G.turn;}G.auctionBids++;
      notify('🏛️ '+pd.nm+' 입찰 실패 ('+chance+'% 확률) — 수수료 ₡'+Math.floor(amount*0.1).toLocaleString()+' 차감 | 남은 입찰 '+(Math.max(0,2-G.auctionBids))+'회','err');
      baekgu('입찰 경쟁에서 졌어. 더 높게 써야 했는데.');
      updateHUD();rerenderTab(renderAuctionView);return;
    }
  }
  if(!G.auctionBids)G.auctionBids=0;if((G.auctionBidTurn||-1)!==G.turn){G.auctionBids=0;G.auctionBidTurn=G.turn;}
  G.credits-=amount;G.planets[pid].owned=true;G.planets[pid].commerce=1;G.auctionBids++;
  if(pd.hostile){G.planets[pid].hostile_cleared=true;notify('💀➜🏠 '+pd.nm+' 전략 합병! 안전 방문 가능.','pur');baekgu('치크스 '+pd.nm+' 합병 완료. 이제 우리 땅이야.');}
  else{notify('🏛️ '+pd.nm+' 낙찰!','gold');baekgu(pd.nm+' 낙찰. 세금 ₡'+calcTaxFor(pid).toLocaleString()+' 들어온다.');}
  updateHUD();saveGame(true);
  // 낙찰 후 경매 화면 그대로 유지 — 페이지 이동 없이 현재 탭 새로고침
  if(typeof rerenderTab==='function'&&typeof renderAuctionView==='function'){
    rerenderTab(renderAuctionView);
  }
}
function customBid(pid,minBid){
  const v=parseInt(document.getElementById('bid-'+pid)?.value);
  if(!v||v<minBid){notify(`최소 ₡${minBid.toLocaleString()}`,'err');return;}
  if(G.credits<v){notify('크레딧 부족','err');return;}doBid(pid,v,false);
}

// ═══ CODEX (탐색 도감) ══════════════════════════════════════════════
// 발견된 함선 ID 세트 (보유 + 방문 행성 기반)
function getDiscoveredShipIds(){
  const owned=new Set(G.fleet.map(s=>s.id.replace(/_.*$/,'')));
  // 방문한 행성 링 범위에 따라 함선 tier 잠금 해제
  const visitedPlanets=new Set(Object.keys(G.planets||{}));
  // 보이드 행성 방문 여부 (신화 함선 발견)
  const visitedVoid=Array.from(visitedPlanets).some(pid=>{const pd=PLANET_DEF.find(p=>p.id===pid);return pd?.void===true;});
  // 각 행성의 링 수준으로 발견 가능 티어 결정
  let maxRing=1;
  visitedPlanets.forEach(pid=>{const pd=PLANET_DEF.find(p=>p.id===pid);if(pd&&pd.ring>maxRing)maxRing=pd.ring;});
  const tierByRing=(ring)=>{if(visitedVoid||ring>=5)return['소형','중형','대형','전설기함','신화'];if(ring>=4)return['소형','중형','대형','전설기함'];if(ring>=2)return['소형','중형'];return['소형'];};
  const discoveredTiers=new Set(tierByRing(maxRing));
  const seen=new Set([...owned]);
  SHIP_CATALOG.forEach(s=>{if(discoveredTiers.has(s.tier))seen.add(s.id);});
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
  const factionNm={F01:'수퍼비아',F02:'아우레우스',F03:'메카니카',F04:'크리그',F05:'치크스',F06:'지구저항군',F07:'보이드'};
  const fc=factionCol[p.f]||'var(--dim)';
  const fn=factionNm[p.f]||p.f;
  const isCurrent=p.id===G.currentPlanet;
  const isOwned=G.planets[pid]&&G.planets[pid].owned;
  const tax=calcTaxFor(pid);
  function row(ic,label,val){return`<div style="display:flex;gap:8px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06)"><span style="font-size:16px;flex-shrink:0">${ic}</span><div><div style="font-size:11px;color:var(--dim);margin-bottom:2px">${label}</div><div style="font-size:13px;color:var(--txt);line-height:1.5">${val}</div></div></div>`;}
  const html=`<div style="padding:4px 0">
    <div style="display:flex;gap:12px;align-items:center;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid var(--bdr)">
      <div style="width:64px;height:64px;border-radius:50%;overflow:hidden;flex-shrink:0;border:2px solid ${fc}">
        <img src="img/planets/${p.id}.png" style="width:100%;height:100%;object-fit:cover" onerror="this.parentNode.innerHTML='<div style=font-size:30px;display:flex;align-items:center;justify-content:center;height:100%>🪐</div>'">
      </div>
      <div>
        <div style="font-size:17px;font-weight:bold;color:${fc}">${p.nm}${isCurrent?' <span style="font-size:11px;color:var(--cyan)">(현재)</span>':''}</div>
        <div style="font-size:12px;color:var(--dim);margin-top:2px">${fn} · 링 ${p.ring}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">
          ${p.hostile?'<span style="font-size:11px;color:var(--red);border:1px solid var(--red);border-radius:3px;padding:1px 6px">⚠️ 적대</span>':''}
          ${p.void?'<span style="font-size:11px;color:var(--purple);border:1px solid var(--purple);border-radius:3px;padding:1px 6px">💀 보이드</span>':''}
          ${isOwned?`<span style="font-size:11px;color:var(--gold);border:1px solid var(--gold);border-radius:3px;padding:1px 6px">🏛️ 소유 ₡${tax.toLocaleString()}/턴</span>`:''}
          ${p.hero?`<span style="font-size:11px;color:var(--purple);border:1px solid var(--purple);border-radius:3px;padding:1px 6px">⭐ 영웅</span>`:''}
        </div>
      </div>
    </div>
    ${row('🌌','은하계상 위치',l.loc||'정보 없음')}
    ${row('🏛️','문명권',l.civ||'정보 없음')}
    ${row('🌍','행성 특징',l.feat||'정보 없음')}
    ${row('⚠️','주의사항',`<span style="color:#ffaa44">${l.warn||'특별한 위험 없음'}</span>`)}
    ${row('💰','혜택',`<span style="color:var(--gold)">${l.benefit||'정보 없음'}</span>`)}
    ${row('💬','개인 의견',`<span style="color:var(--cyan);font-style:italic">${l.op||'...'}</span>`)}
  </div>`;
  openModal('🪐 '+p.nm,html,[{txt:'닫기',fn:closeModal,cls:'btn-sm'}],{wide:true});
}
function showCodexHeroModal(hid){
  const h=HEROES[hid];if(!h)return;
  const l=HERO_LORE[hid]||{};
  const have=G.heroes.includes(hid);
  const aboard=G.fleet.find(s=>(s.crewIds||[]).includes(hid));
  const clCol={Pilot:'var(--cyan)',Eng:'var(--green)',Merch:'var(--gold)'}[h.cl]||'var(--dim)';
  const clNm={Pilot:'파일럿',Eng:'엔지니어',Merch:'상인'}[h.cl]||h.cl;
  function row(ic,label,val){return`<div style="display:flex;gap:8px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06)"><span style="font-size:16px;flex-shrink:0">${ic}</span><div><div style="font-size:11px;color:var(--dim);margin-bottom:2px">${label}</div><div style="font-size:13px;color:var(--txt);line-height:1.5">${val}</div></div></div>`;}
  const foundPlanet=PLANET_DEF.find(p=>p.hero===hid);
  const foundPlanetNm=foundPlanet?foundPlanet.nm:'불명';
  const html=`<div style="padding:4px 0">
    <div style="display:flex;gap:12px;align-items:center;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid var(--bdr)">
      <div style="width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:38px;background:rgba(0,0,0,.5);border:2px solid var(--gold);flex-shrink:0">${h.ic}</div>
      <div>
        <div style="font-size:17px;font-weight:bold;color:var(--gold)">${h.nm}</div>
        <div style="font-size:12px;color:${clCol};margin-top:2px">${clNm} · LOY:${h.LOY}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;font-size:11px;color:var(--dim)">
          <span style="color:var(--red)">⚔️ ATT:${h.ATT}</span>
          <span style="color:var(--blue)">🛡 INT:${h.INT}</span>
          <span style="color:var(--gold)">🔰 DEF:${h.DEF}</span>
          <span style="color:#f88">❤️ HP:${h.HP}</span>
        </div>
        <div style="margin-top:4px;display:flex;gap:6px;flex-wrap:wrap">
          <span style="font-size:11px;color:var(--purple);border:1px solid var(--purple);border-radius:3px;padding:1px 6px">⚡ ${h.sk}</span>
          ${have?`<span style="font-size:11px;color:var(--green);border:1px solid var(--green);border-radius:3px;padding:1px 6px">✅ 영입됨</span>`:''}
          ${aboard?`<span style="font-size:11px;color:var(--cyan);border:1px solid var(--cyan);border-radius:3px;padding:1px 6px">🛸 ${aboard.nm}</span>`:''}
        </div>
      </div>
    </div>
    ${row('📜','이름의 유래',l.origin||'정보 없음')}
    ${row('📍','발견 행성',`${l.found||foundPlanetNm}`)}
    ${row('⚔️','능력치',l.stats||`ATT:${h.ATT} INT:${h.INT} DEF:${h.DEF} HP:${h.HP}`)}
    ${row('🎭','장단점 · 성격',l.char||'정보 없음')}
    ${row('💬','개인 의견',`<span style="color:var(--cyan);font-style:italic">${l.op||'...'}</span>`)}
  </div>`;
  openModal('⭐ '+h.nm,html,[{txt:'닫기',fn:closeModal,cls:'btn-sm'}],{wide:true});
}
// 도감 — 함선 상세 모달 (행성·영웅과 동일한 구조)
function showCodexPartModal(partId){
  const p=(typeof partById==='function'?partById(partId):(PARTS.find(x=>x.id===partId)));
  if(!p)return;
  const rarCol=p.rarity==='mythic'?'#ff88ff':p.rarity==='set'?'#c080ff':p.tier>=15?'var(--gold)':p.tier>=11?'#ffa040':p.tier>=6?'var(--cyan)':'var(--txt)';
  const rarIc=p.rarity==='mythic'?'✦':p.rarity==='set'?'◈':p.tier>=15?'⚡':'•';
  const catIc={weapon:p.wtype==='missile'?'🚀':'⚔️',shield:'🛡️',armor:typeof p.repairRate==='number'&&p.repairRate>0?'🤖':'🛡',engine:'⚡'}[p.cat]||'⚙️';
  const lore=LORE_TEXT['part_'+p.id]||'정보 없음';
  const lines=String(lore).split('\n');
  const sec=(ic,fallback)=>{const ln=lines.find(l=>l.startsWith(ic));return ln?ln.replace(ic,'').trim():fallback;};
  const maker=sec('🔨','정보 없음');
  const origin=sec('📜','정보 없음');
  const power=sec('⚔️','정보 없음');
  const op=sec('💬','...');
  // 보유 여부
  const inv=(G.inventory||[]).find(i=>i.id===p.id);
  const eqQty=(G.fleet||[]).flatMap(s=>s.parts||[]).filter(pid=>pid===p.id).length;
  const qty=(inv?.qty||0)+eqQty;
  // 스탯 라인
  const statText=p.cat==='weapon'?`ATT +${p.ATT}${p.wtype?' ['+p.wtype+']':''}`:
                p.cat==='shield'?`INT +${p.INT} · SH +${p.maxSH}${p.shieldRegen?' · 재생 '+(p.shieldRegen*100).toFixed(0)+'%/턴':''}`:
                p.cat==='armor'?`HP +${p.HP}${p.DEF?' · DEF +'+p.DEF:''}${p.repairRate?' · 수리 '+(p.repairRate*100).toFixed(0)+'%/턴':''}${p.laserHealHP?' · 흡혈 HP '+(p.laserHealHP*100).toFixed(0)+'%':''}${p.laserHealSH?' · 흡혈 SH '+(p.laserHealSH*100).toFixed(0)+'%':''}`:
                p.cat==='engine'?`TEC +${p.TEC}`:'';
  function row(ic,label,val){return`<div style="display:flex;gap:8px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06)"><span style="font-size:16px;flex-shrink:0">${ic}</span><div><div style="font-size:11px;color:var(--dim);margin-bottom:2px">${label}</div><div style="font-size:13px;color:var(--txt);line-height:1.5">${val}</div></div></div>`;}
  const html=`<div style="padding:4px 0">
    <div style="display:flex;gap:12px;align-items:center;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid var(--bdr)">
      <div style="width:96px;height:96px;border-radius:50%;overflow:hidden;flex-shrink:0;border:2px solid ${rarCol};background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center">
        ${imgOrEmoji('img/parts/'+p.id+'.png',catIc,92,92,'object-fit:contain')}
      </div>
      <div>
        <div style="font-size:18px;font-weight:bold;color:${rarCol}">${rarIc} ${p.nm}</div>
        <div style="font-size:12px;color:var(--dim);margin-top:2px">T${p.tier} ${p.cat==='weapon'?'무기':p.cat==='shield'?'실드':p.cat==='armor'?(typeof p.repairRate==='number'&&p.repairRate>0?'수리 드론':'장갑'):p.cat==='engine'?'엔진':''} · ${p.price?'₡'+p.price.toLocaleString():'상점 미판매'}</div>
        <div style="font-size:12px;color:${rarCol};margin-top:4px;font-weight:bold">${statText}</div>
        ${qty>0?`<span style="display:inline-block;margin-top:6px;font-size:11px;color:var(--green);border:1px solid var(--green);border-radius:3px;padding:1px 6px">✅ 보유 ${qty}개 (인벤 ${inv?.qty||0} + 장착 ${eqQty})</span>`:'<span style="display:inline-block;margin-top:6px;font-size:11px;color:var(--dim);border:1px solid var(--dim);border-radius:3px;padding:1px 6px">❔ 미보유</span>'}
      </div>
    </div>
    ${row('🔨','제작 일화',maker)}
    ${row('📜','이름의 유래',origin)}
    ${row('⚔️','전투 성능',power)}
    ${row('💬','한마디',op)}
  </div>`;
  openModal('⚙️ '+p.nm,html,[{txt:'확인',fn:closeModal,cls:'btn-gold'}],{wide:true});
}
function showCodexShipModal(shipId){
  const s=SHIP_CATALOG.find(x=>x.id===shipId);if(!s)return;
  const tierCol={'소형':'var(--cyan)','중형':'var(--blue)','대형':'var(--gold)','전설기함':'#ff66ff','신화':'#cc66ff'};
  const fc=tierCol[s.tier]||'var(--dim)';
  const tierIc={신화:'✦',전설기함:'⚑',대형:'🌟',중형:'🚀',소형:'🛸'}[s.tier]||'🛸';
  const lore=LORE_TEXT['ship_'+(s.catalogId||s.id)]||LORE_TEXT['ship_'+s.id]||'정보 없음';
  // 줄별 (🔨/📜/⚔️/💬) 분리
  const lines=String(lore).split('\n');
  const sec=(ic,fallback)=>{const ln=lines.find(l=>l.startsWith(ic));return ln?ln.replace(ic,'').trim():fallback;};
  const maker=sec('🔨','정보 없음');
  const origin=sec('📜','정보 없음');
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
        <div style="font-size:18px;font-weight:bold;color:${fc}">${tierIc} ${s.nm}</div>
        <div style="font-size:12px;color:var(--dim);margin-top:2px">${s.tier} · ₡${(s.price||0).toLocaleString()}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;font-size:11px">
          <span style="color:var(--red)">⚔️ ATT:${s.ATT}</span>
          <span style="color:var(--blue)">🛡 SHD:${s.INT}</span>
          <span style="color:var(--cyan)">⚡ ENG:${s.TEC}</span>
          <span style="color:#f88">❤️ HP:${(s.maxHP||0).toLocaleString()}</span>
          <span style="color:#66ddff">🛡 SH:${(s.maxSH||0).toLocaleString()}</span>
        </div>
        ${owned?`<span style="display:inline-block;margin-top:6px;font-size:11px;color:var(--green);border:1px solid var(--green);border-radius:3px;padding:1px 6px">✅ 보유중</span>`:''}
      </div>
    </div>
    ${row('🔨','제작 일화',maker)}
    ${row('📜','이름의 유래',origin)}
    ${row('⚔️','강점·약점',power)}
    ${row('📖','기본 설명',s.desc||'-')}
    ${row('💬','개인 의견',`<span style="color:var(--cyan);font-style:italic">${op}</span>`)}
  </div>`;
  openModal('🛸 '+s.nm,html,[{txt:'닫기',fn:closeModal,cls:'btn-sm'}],{wide:true});
}
function switchCodexTab(t){_codexTab=t;rerenderTab(renderCodexTab);}
function renderCodexTab(body){
  if(!body)return;
  const tabs=[['ship','🛸 함선'],['parts','⚙️ 파츠'],['heroes','⭐ 영웅'],['planets','🪐 행성'],['comms','💎 특산물']];
  const subNav=`<div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap">
    ${tabs.map(([t,lbl])=>`<button onclick="switchCodexTab('${t}')" style="padding:6px 14px;font-size:13px;border-radius:6px;border:1px solid ${_codexTab===t?'var(--cyan)':'var(--bdr)'};background:${_codexTab===t?'rgba(0,243,255,.12)':'transparent'};color:${_codexTab===t?'var(--cyan)':'var(--dim)'};cursor:pointer;font-family:inherit">${lbl}</button>`).join('')}
  </div>`;
  let content='';

  if(_codexTab==='ship'){
    const ownedIds=new Set(G.fleet.filter(s=>!(s.id||'').startsWith('CAP_')).map(s=>s.id.replace(/_.*$/,'')));
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
      const discovered=ships.filter(s=>discoveredIds.has(s.id)).length;
      return`<div style="margin-bottom:16px">
        <div style="font-size:13px;color:${tierCol[tier]||'var(--dim)'};font-weight:bold;margin-bottom:8px;letter-spacing:1px">${tier} <span style="color:var(--dim);font-size:11px">발견 ${discovered}/${ships.length} · 보유 ${owned}</span></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px">
          ${ships.map(s=>{const have=ownedIds.has(s.id);const seen=discoveredIds.has(s.id);
            const badge=have?'<div style="font-size:10px;color:var(--green);margin-top:2px">✅ 보유중</div>':seen?'<div style="font-size:10px;color:var(--cyan);margin-top:2px">🔍 발견</div>':'<div style="font-size:10px;color:var(--dim);margin-top:2px">❔ 미발견</div>';
            const _bdr=have?(tierCol[tier]||'var(--bdr)'):seen?'rgba(0,243,255,.3)':'var(--bdr)';
            const _filter=seen?'':'filter:grayscale(.9);opacity:.35';
            const _nc=have?'var(--txt)':seen?'var(--txt)':'var(--dim)';
            return'<div '+(seen?"onclick=\"showCodexShipModal('"+s.id+"')\" style=\"cursor:pointer;background:var(--card);border:1px solid "+_bdr+";border-radius:8px;padding:8px;text-align:center;min-height:148px;"+_filter+"\"":"style=\"background:var(--card);border:1px solid "+_bdr+";border-radius:8px;padding:8px;text-align:center;min-height:148px;"+_filter+"\"")+'>'
              +'<div style="width:78px;height:78px;border-radius:50%;overflow:hidden;margin:0 auto 6px">'+imgOrEmoji(shipImgSrc(s),s.ic||'🛸',78,78,'',(seen?'ship_'+s.id:''))+'</div>'
              +'<div style="font-size:12px;font-weight:bold;color:'+_nc+';line-height:1.2">'+(seen?s.nm:'???')+'</div>'
              +'<div style="font-size:10px;color:var(--dim);margin-top:2px">'+(seen?'₡'+s.price.toLocaleString():'')+'</div>'
              +badge
              +'</div>';
          }).join('')}
        </div>
      </div>`;
    }).join('');
    const capSection=capturedShips.length>0?`<div style="margin-bottom:16px;border-top:1px solid var(--bdr);padding-top:14px">
      <div style="font-size:13px;color:#ff8844;font-weight:bold;margin-bottom:8px;letter-spacing:1px">🏴 나포 함선 <span style="color:var(--dim);font-size:11px">${capturedShips.length}척</span></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px">
        ${capturedShips.map(s=>`<div style="background:var(--card);border:1px solid rgba(255,136,68,.4);border-radius:8px;padding:8px;text-align:center;min-height:148px">
          <div style="width:78px;height:78px;border-radius:50%;overflow:hidden;margin:0 auto 6px">${imgOrEmoji(shipImgSrc(s),TIER_EMOJI[s.tier]||'🛸',78,78,'')}</div>
          <div style="font-size:12px;font-weight:bold;color:var(--txt);line-height:1.2">${s.nm}</div>
          <div style="font-size:10px;color:var(--dim);margin-top:2px">${s.tier}</div>
          <div style="font-size:10px;margin-top:2px;color:#ff8844">🏴 나포</div>
        </div>`).join('')}
      </div>
    </div>`:'';
    const totalOwned=ownedIds.size;const totalSeen=discoveredIds.size;const totalShips=SHIP_CATALOG.length;
    content=`<div style="background:var(--card);border-radius:8px;padding:10px;margin-bottom:12px;display:flex;gap:12px;align-items:center">
      <div style="font-size:29px">🛸</div>
      <div><div style="font-size:14px;color:var(--txt);font-weight:bold">함선 도감</div>
      <div style="font-size:12px;color:var(--dim)">발견 <span style="color:var(--cyan)">${totalSeen}</span> · 보유 <span style="color:var(--green)">${totalOwned}</span> / 전체 ${totalShips}종</div></div>
      <div style="margin-left:auto;text-align:right"><div style="font-size:13px;color:var(--dim)">완성도</div>
      <div style="font-size:17px;color:var(--gold);font-weight:bold">${Math.round(totalSeen/totalShips*100)}%</div></div>
    </div>${sections}${capSection}`;
  }
  else if(_codexTab==='parts'){
    const inv=G.inventory||[];
    // 인벤토리 + 함선에 장착된 파츠 모두 '보유'로 처리
    const _equippedIds=new Set((G.fleet||[]).flatMap(s=>s.parts||[]));
    const haveSet=new Set([...inv.filter(i=>i.qty>0).map(i=>i.id),..._equippedIds]);
    // 섹션 정의: 무기 레이저/미사일 분리, 장갑/수리드론 분리
    const sections=[
      {key:'laser',  nm:'⚔️ 레이저 무기',col:'var(--red)',  filter:p=>p.cat==='weapon'&&(p.wtype==='laser'||!p.wtype)},
      {key:'missile',nm:'🚀 미사일 무기',col:'#ff8844',     filter:p=>p.cat==='weapon'&&p.wtype==='missile'},
      {key:'shield', nm:'🛡️ 실드',      col:'var(--blue)', filter:p=>p.cat==='shield'},
      {key:'armor',  nm:'🛡 장갑',       col:'var(--gold)', filter:p=>p.cat==='armor'&&!(typeof p.repairRate==='number'&&p.repairRate>0)},
      {key:'drone',  nm:'🤖 수리 드론',  col:'#66ff99',     filter:p=>p.cat==='armor'&&typeof p.repairRate==='number'&&p.repairRate>0},
      {key:'engine', nm:'⚡ 엔진',       col:'var(--cyan)', filter:p=>p.cat==='engine'}
    ];
    const rarCol=p=>p.rarity==='mythic'?'#ff88ff':p.rarity==='set'?'#c080ff':p.tier>=15?'var(--gold)':p.tier>=11?'#ffa040':p.tier>=6?'var(--cyan)':'var(--txt)';
    const rarBdr=p=>p.rarity==='mythic'?'rgba(255,136,255,.6)':p.rarity==='set'?'rgba(192,128,255,.6)':p.tier>=15?'rgba(255,215,0,.5)':p.tier>=11?'rgba(255,160,64,.4)':p.tier>=6?'rgba(0,243,255,.3)':'var(--bdr)';
    const statTxt=p=>p.cat==='weapon'?`ATT+${p.ATT}`:p.cat==='shield'?`INT+${p.INT}`:p.cat==='armor'?`HP+${p.HP}`:`TEC+${p.TEC}`;
    const totalHave=PARTS.filter(p=>haveSet.has(p.id)).length;
    content=`<div style="background:var(--card);border-radius:8px;padding:10px;margin-bottom:12px;display:flex;gap:12px;align-items:center">
      <div style="font-size:29px">⚙️</div>
      <div><div style="font-size:14px;color:var(--txt);font-weight:bold">파츠 도감</div>
      <div style="font-size:12px;color:var(--dim)">보유 <span style="color:var(--cyan)">${totalHave}</span> / 전체 ${PARTS.length}종</div></div>
      <div style="margin-left:auto;text-align:right"><div style="font-size:13px;color:var(--dim)">완성도</div>
      <div style="font-size:17px;color:var(--gold);font-weight:bold">${Math.round(totalHave/PARTS.length*100)}%</div></div>
    </div>
    ${sections.map(sec=>{
      const ps=PARTS.filter(sec.filter);const hv=ps.filter(p=>haveSet.has(p.id)).length;
      if(!ps.length)return'';
      return`<div style="margin-bottom:16px">
        <div style="font-size:13px;color:${sec.col};font-weight:bold;margin-bottom:8px;letter-spacing:1px">${sec.nm} <span style="color:var(--dim);font-size:11px">${hv}/${ps.length}</span></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px">
          ${ps.map(p=>{const have=haveSet.has(p.id);
            const cat=p.cat;
            const _invQty=inv.find(i=>i.id===p.id)?.qty||0;
            const _eqQty=(G.fleet||[]).flatMap(s=>s.parts||[]).filter(pid=>pid===p.id).length;
            const qty=_invQty+_eqQty;
            const rarityBadge=p.rarity==='mythic'?'<div style="font-size:10px;color:#ff88ff;margin-top:1px">✦ 신화</div>':p.rarity==='set'?'<div style="font-size:10px;color:#c080ff;margin-top:1px">◈ 세트</div>':'';
            return`<div style="background:var(--card);border:1px solid ${have?rarBdr(p):'var(--bdr)'};border-radius:8px;padding:8px;text-align:center;opacity:${have?1:.42};position:relative;min-height:148px">
              <div style="width:78px;height:78px;border-radius:50%;overflow:hidden;margin:0 auto 6px;cursor:pointer" onclick="showCodexPartModal('${p.id}')" title="클릭=상세 정보">${imgOrEmoji('img/parts/'+p.id+'.png',sec.key==='laser'?'⚔️':sec.key==='missile'?'🚀':cat==='shield'?'🛡️':cat==='armor'?'🛡':'⚡',78,78,'','part_'+p.id)}</div>
              <div style="font-size:12px;font-weight:bold;color:${rarCol(p)};line-height:1.2;word-break:keep-all">${p.nm}</div>
              <div style="font-size:10px;color:var(--dim);margin-top:2px">T${p.tier} · ${statTxt(p)}</div>
              ${rarityBadge}
              <div style="font-size:10px;margin-top:2px">${have?`<span style="color:var(--green)">✅ ×${qty}</span>`:`<span style="color:var(--dim)">❔ 미보유</span>`}</div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
    }).join('')}`;
  }
  else if(_codexTab==='heroes'){
    const heroList=Object.entries(HEROES);
    const recruited=heroList.filter(([id])=>G.heroes.includes(id)).length;
    content=`<div style="background:var(--card);border-radius:8px;padding:10px;margin-bottom:12px;display:flex;gap:12px;align-items:center">
      <div style="font-size:29px">⭐</div>
      <div><div style="font-size:14px;color:var(--txt);font-weight:bold">영웅 도감</div>
      <div style="font-size:12px;color:var(--dim)">영입 <span style="color:var(--cyan)">${recruited}</span> / 전체 ${heroList.length}명 · 영입한 영웅은 클릭=상세</div></div>
      <div style="margin-left:auto;text-align:right"><div style="font-size:13px;color:var(--dim)">완성도</div>
      <div style="font-size:17px;color:var(--gold);font-weight:bold">${Math.round(recruited/heroList.length*100)}%</div></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px">
      ${heroList.map(([id,h])=>{const have=G.heroes.includes(id);const aboard=G.fleet.find(s=>(s.crewIds||[]).includes(id));
        const cl=have?'cursor:pointer':'';
        const oc=have?`onclick="showCodexHeroModal('${id}')"` :'';
        const hover=have?'onmouseover="this.style.opacity=\'.8\'" onmouseout="this.style.opacity=\'1\'"':'';
        return`<div ${oc} ${hover} style="background:var(--card);border:1px solid ${have?'var(--gold)':'var(--bdr)'};border-radius:8px;padding:8px;text-align:center;opacity:${have?1:.4};min-height:148px;${cl}">
          <div style="width:78px;height:78px;border-radius:50%;overflow:hidden;margin:0 auto 6px;display:flex;align-items:center;justify-content:center;font-size:48px;background:rgba(0,0,0,.3)">${have?h.ic:'❔'}</div>
          <div style="font-size:12px;font-weight:bold;color:${have?'var(--gold)':'var(--dim)'};line-height:1.2">${have?h.nm:'???'}</div>
          <div style="font-size:10px;color:var(--purple);margin-top:2px">${have?h.sk:'미영입'}</div>
          ${have?`<div style="font-size:10px;color:${aboard?'var(--cyan)':'var(--dim)'};margin-top:2px">🛸 ${aboard?aboard.nm:'미탑승'}</div>`:''}
        </div>`;
      }).join('')}
    </div>`;
  }

  else if(_codexTab==='planets'){
    const visitedPlanets=new Set(Object.keys(G.planets||{}));
    const factionCol={F01:'var(--cyan)',F02:'var(--gold)',F03:'var(--green)',F04:'var(--red)',F05:'#ff4444',F06:'#88ccff',F07:'var(--purple)'};
    const factionNm={F01:'수퍼비아',F02:'아우레우스',F03:'메카니카',F04:'크리그',F05:'치크스',F06:'지구저항군',F07:'보이드'};
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
      const badge=isCurrent?'<div style="font-size:10px;color:var(--cyan);margin-top:2px">📍 현재</div>':visited?'<div style="font-size:10px;color:var(--green);margin-top:2px">✅ 방문</div>':'';
      const clickable=visited?'cursor:pointer;':'';
      const onclick=visited?'onclick="showCodexPlanetModal(\''+p.id+'\')"':'';
      // 우상단 ID 배지 (방문 여부와 무관하게 항상 노출 — 사용자 식별용)
      const idBadge='<div style="position:absolute;top:4px;right:6px;font-size:9px;color:rgba(180,200,220,.55);font-family:Courier New,monospace;letter-spacing:.5px;pointer-events:none">'+p.id+'</div>';
      return '<div '+onclick+' style="position:relative;background:var(--card);border:1px solid '+(isCurrent?'var(--cyan)':visited?fc:'var(--bdr)')+';border-radius:8px;padding:8px;text-align:center;min-height:148px;'+filt+clickable+'" '+(visited?'onmouseover="this.style.opacity=\'.8\'" onmouseout="this.style.opacity=\'1\'"':'')+'>'
        +idBadge
        +'<div style="width:78px;height:78px;border-radius:50%;overflow:hidden;margin:0 auto 6px">'+imgEl+'</div>'
        +'<div style="font-size:12px;font-weight:bold;color:'+(visited?'var(--txt)':'var(--dim)')+';line-height:1.2">'+( visited?p.nm:'???')+'</div>'
        +'<div style="font-size:10px;color:'+fc+';margin-top:2px">'+(visited?fn:'')+'</div>'
        +'<div style="font-size:10px;color:var(--dim);margin-top:1px">'+(visited?'링 '+p.ring:'')+'</div>'
        +badge
        +'</div>';
    }).join('');
    content='<div style="background:var(--card);border-radius:8px;padding:10px;margin-bottom:12px;display:flex;gap:12px;align-items:center">'
      +'<div style="font-size:29px">🪐</div>'
      +'<div><div style="font-size:14px;color:var(--txt);font-weight:bold">행성 도감</div>'
      +'<div style="font-size:12px;color:var(--dim)">방문 <span style="color:var(--cyan)">'+totalVisited+'</span> / 전체 '+PLANET_DEF.length+'개 · 클릭하면 상세 정보</div></div>'
      +'<div style="margin-left:auto;text-align:right"><div style="font-size:13px;color:var(--dim)">탐험도</div>'
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
        const filt=seen?'':'filter:grayscale(.9);opacity:.35';
        const nc=seen?'var(--txt)':'var(--dim)';
        return '<div style="background:var(--card);border:1px solid '+bdr+';border-radius:8px;padding:8px;text-align:center;min-height:148px;'+filt+'">'
          +'<div style="width:78px;height:78px;border-radius:50%;overflow:hidden;margin:0 auto 6px">'+imgOrEmoji('img/commodities/'+c.id+'.png',c.ic||'💎',78,78,'',(seen?(c.material?'mat_':'comm_')+c.id:''))+'</div>'
          +'<div style="font-size:12px;font-weight:bold;color:'+nc+';line-height:1.2">'+(seen?c.nm:'???')+'</div>'
          +(seen?'<div style="font-size:10px;color:var(--gold);margin-top:2px">₡'+c.buy.toLocaleString()+'</div>':'')
          +'<div style="font-size:10px;color:'+(seen?'var(--green)':'var(--dim)')+';margin-top:2px">'+(seen?'🔍 발견':'')+'</div>'
          +'</div>';
      }).join('');
      return '<div style="margin-bottom:16px">'
        +'<div style="font-size:13px;color:var(--cyan);font-weight:bold;margin-bottom:8px">'+label+' <span style="color:var(--dim);font-size:11px">발견 '+discCount+'/'+list.length+'</span></div>'
        +'<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px">'+cards+'</div>'
        +'</div>';
    }
    content='<div style="background:var(--card);border-radius:8px;padding:10px;margin-bottom:12px;display:flex;gap:12px;align-items:center">'
      +'<div style="font-size:29px">💎</div>'
      +'<div><div style="font-size:14px;color:var(--txt);font-weight:bold">특산물·재료 도감</div>'
      +'<div style="font-size:12px;color:var(--dim)">발견 <span style="color:var(--cyan)">'+totalDisc+'</span> / 전체 '+COMMODITIES.length+'종</div></div>'
      +'<div style="margin-left:auto;text-align:right"><div style="font-size:13px;color:var(--dim)">수집률</div>'
      +'<div style="font-size:17px;color:var(--gold);font-weight:bold">'+Math.round(totalDisc/COMMODITIES.length*100)+'%</div></div></div>'
      +commSection('🌟 특산물',normalComms)
      +commSection('⚗️ 제작 재료',matComms);
  }

  body.innerHTML=`<div class="hub-scroll">
    ${hubBanner('codex','📖','탐색 도감')}
    <div class="hub-t">📖 탐색 도감</div>
    ${subNav}
    ${content}
  </div>`;
}

// ═══ COMBAT LOG ══════════════════════════════════════════════════
function renderCombatLog(body){
  const logs=G.combatHistory||[];
  const flagship=G.fleet&&G.fleet[0];
  const flagImgSrc=flagship?shipImgSrc(flagship):null;
  const flagTierIc={소형:'🛸',중형:'🚀',대형:'🌟',전설기함:'🏮'}[flagship?.tier]||'🛸';
  body.innerHTML=`<div class="hub-scroll">${hubBanner('clog','📋','전투 기록')}<div class="hub-t">⚔️ 전투 기록</div>
    ${logs.length===0?'<div style="color:var(--dim);font-size:14px">전투 기록 없음</div>':
    `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">`+logs.slice().reverse().map(l=>{
      const pd=PLANET_DEF.find(p=>p.id===(l.planetId||l.pid))||PLANET_DEF.find(p=>p.nm===l.planet);
      const planetImgSrc=pd?`img/planets/${pd.id}.png`:'img/planets/P01.png';
      const pFaction=pd?FACTION[pd.f]:null;
      const _planetNm=l.planet||pd?.nm||'알 수 없음';
      const _earned=typeof l.earned==='number'?l.earned:0;
      const _gameTurn=l.gameTurn!=null?l.gameTurn:'?';
      const _turn=l.turn!=null?l.turn:0;
      return `<div style="background:var(--card);border:1px solid ${l.win?'rgba(46,204,113,.3)':'rgba(255,80,80,.25)'};border-radius:12px;overflow:hidden;display:flex;flex-direction:row;min-height:160px">
        <!-- 좌측: 전투 정보 -->
        <div style="flex:1;padding:12px 14px;display:flex;flex-direction:column;gap:6px;min-width:0">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
            <span class="badge ${l.win?'bd-gn':'bd-rd'}" style="font-size:12px">${l.win?'승':'패'}</span>
            <span style="font-size:14px;font-weight:bold;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_planetNm}</span>
            ${pFaction?`<span style="font-size:11px;color:${pFaction.col}">${pFaction.nm}${pd?.ring?' · 링'+pd.ring:''}</span>`:''}
          </div>
          <div style="font-size:15px;font-weight:bold;color:${l.win?'var(--green)':'var(--red)'}">${l.win?'🎉 승리':'💀 패배'}</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <span style="font-size:13px;color:var(--gold)">₡${_earned.toLocaleString()}</span>
            <span style="font-size:12px;color:var(--dim)">⏱${_turn}턴</span>
            <span style="font-size:12px;color:var(--muted)">T${_gameTurn}</span>
          </div>
          ${flagImgSrc?`<div style="display:flex;align-items:center;gap:6px;margin-top:auto;padding-top:6px;border-top:1px solid rgba(255,255,255,.07)">
            <img src="${flagImgSrc}" style="width:48px;height:32px;object-fit:contain;border-radius:4px;border:1px solid var(--bdr);background:rgba(0,0,0,.4)" onerror="this.style.display='none'">
            <span style="font-size:11px;color:var(--dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${flagship?.nm||''}</span>
          </div>`:''}
        </div>
        <!-- 우측: 행성 + 함선 이미지 -->
        <div style="width:150px;flex-shrink:0;display:flex;flex-direction:column;background:rgba(0,0,0,.4)">
          <div style="flex:3;overflow:hidden;min-height:0;position:relative;background:linear-gradient(135deg,#0d1f35,#050a16)">
            <img src="${planetImgSrc}" style="width:100%;height:100%;object-fit:cover;opacity:.9;position:absolute;inset:0" onerror="this.style.opacity='0'">
            ${pd?`<div style="position:absolute;bottom:4px;left:0;right:0;text-align:center;font-size:10px;color:rgba(255,255,255,.65);line-height:1;text-shadow:0 1px 3px #000">${pd.nm}</div>`:''}
          </div>
          ${flagImgSrc?`<div style="flex:2;overflow:hidden;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;border-top:1px solid rgba(255,255,255,.1);min-height:0;padding:4px">
            <img src="${flagImgSrc}" style="max-width:95%;max-height:95%;object-fit:contain" onerror="this.style.display='none'">
          </div>`:''}
        </div>
      </div>`;
    }).join('')+`</div>`}
  </div>`;
}

// ═══ HERO RECRUIT ════════════════════════════════════════════════
// 8인의 핵심 영웅 등장 시 자동 영입 — 모달은 축하용이며 어떤 버튼을 눌러도 영입은 유지된다.
// (H01 이순신만 난중일기 G18 필요 — 풀 단계에서 제외하므로 여기엔 도달하지 않는다)
function showHeroRecruit(heroId){
  const h=HEROES[heroId];if(!h)return;
  // 1) 먼저 영입 확정 (notify + baekgu + saveGame 포함). 실패해도 본 함수는 정보용으로 계속 진행.
  const _already=(G.heroes||[]).includes(heroId);
  if(!_already){try{recruitHero(heroId);}catch(e){console.warn('[hero] auto-recruit',e.message);}}
  const _ok=(G.heroes||[]).includes(heroId);
  // 2) 축하 모달 — 닫기 버튼 1개만, 영입 결과에 영향 없음
  openModal(`${h.ic} 전설 영웅 합류!`,
    `<div style="text-align:center;padding:8px">
      <div style="font-size:58px;margin-bottom:8px;text-shadow:0 0 24px gold">${h.ic}</div>
      <div style="color:var(--gold);font-size:22px;font-weight:bold;margin-bottom:4px">${h.nm}</div>
      <div style="font-size:12px;color:var(--cyan);letter-spacing:2px;margin-bottom:10px">${_ok?'✅ 영입 완료 — 자동으로 함대에 합류했습니다':'⚠️ 영입 조건 미달'}</div>
      <div style="background:var(--card);border-radius:8px;padding:12px;font-size:13px;line-height:2">
        ATT:${h.ATT} INT:${h.INT} DEF:${h.DEF} HP:${h.HP}<br>필살기: <span style="color:var(--purple)">${h.sk}</span>
      </div>
    </div>`,
    [{txt:'✅ 확인',fn:closeModal,cls:'btn-gold'}]);
}
function boardHeroToShip(hid){
  const sel=document.getElementById('hero-ship-'+hid);
  // 함선이 1개이면 자동 선택
  if(sel&&sel.value===''&&G.fleet.length===1)sel.value='0';
  if(!sel||sel.value===''){notify('탑승할 함선을 선택하세요','warn');return;}
  const shipIdx=parseInt(sel.value);
  const s=G.fleet[shipIdx];if(!s)return;
  // 이미 다른 함선 탑승 중이면 자동 이전 (먼저 빼고 체크)
  G.fleet.forEach(sh=>{if(sh!==s&&sh.crewIds){const i=sh.crewIds.indexOf(hid);if(i>=0)sh.crewIds.splice(i,1);}});
  if((s.crewIds||[]).length>=getMaxCrew(s)){notify('만석입니다 — 먼저 하선시키세요','err');return;}
  if(!s.crewIds)s.crewIds=[];
  const _stBefH=getShipStats(s);
  s.crewIds.push(hid);
  _syncShipCapacity(s,_stBefH);
  notify(`⭐ ${HEROES[hid]?.nm} → ${s.nm} 탑승! 전 스탯 ×1.2`,'gold');
  baekgu(`${HEROES[hid]?.nm} 탑승. 이제 그 함선 1.2배 강해졌어.`);
  rerenderShipOrGarage();saveGame(true);
}
function unassignHero(hid){
  G.fleet.forEach(sh=>{
    if(!sh.crewIds)return;
    const idx=sh.crewIds.indexOf(hid);
    if(idx>=0){sh.crewIds.splice(idx,1);notify(`⭐ ${HEROES[hid]?.nm} 하선`,'ok');}
  });
  rerenderShipOrGarage();saveGame(true);
}
function recruitHero(heroId){if(G.heroes.includes(heroId)){closeModal();return;}
  // H01 이순신: 난중일기 영인본(G18) 인벤토리 확인
  if(heroId==='H01'){
    const has=G.inventory&&G.inventory.find(i=>i.id==='G18'&&i.qty>0);
    if(!has){
      notify('⚔️ 이순신 영입에는 난중일기 영인본(G18)이 필요합니다! 지구 저항군 행성에서 구입하세요.','err');
      closeModal();return;
    }
    // 소모
    const inv=G.inventory.find(i=>i.id==='G18');inv.qty--;
    notify('📜 난중일기 영인본 제출 완료.','ok');
  }
  G.heroes.push(heroId);closeModal();notify(`${HEROES[heroId]?.ic} ${HEROES[heroId]?.nm} 영입!`,'pur');baekgu(`${HEROES[heroId]?.nm} 합류. 잘 써.`);
  // 장영실 대감: 모든 행성 안개 제거
  if(heroId==='H02'){applyJangYeongsilEffect();notify('⚙️ 장영실 효과: 은하계 전 행성 탐색 완료!','gold');}
  saveGame(true);
}
function applyJangYeongsilEffect(){
  if(!G.heroes.includes('H02'))return;
  PLANET_DEF.forEach(p=>{if(G.planets[p.id]&&G.planets[p.id].fog==='L')G.planets[p.id].fog='S';});
}

// ═══ STARMAP ═════════════════════════════════════════════════════
let mapCtx,mapCV,mapOffX=0,mapOffY=0;
let map3dRotX=0.35,map3dRotY=0.0,mapDragMode='pan';
function renderMapView(body){
  body.innerHTML=`<div style="height:48px;background:rgba(13,26,42,.97);border-bottom:1px solid var(--bdr);display:flex;align-items:center;gap:8px;padding:0 14px;flex-shrink:0">
    <span style="color:var(--yellow);font-weight:bold;font-size:16px">🗺️ 은하 지도</span>
    <span style="color:var(--dim);font-size:12px;flex:1" id="map-cost"></span>
    <button class="btn btn-sm" onclick="mapZoom(-0.15)">−</button>
    <button class="btn btn-sm" onclick="mapZoom(+0.15)">+</button>
    <span style="font-size:11px;color:var(--muted)">🖱️ 우클릭=회전 | 좌클릭=이동 | 휠=줌</span>
    <button class="btn btn-sm" onclick="resetMapView()" style="color:var(--dim)">⌂</button>
    <button class="btn btn-sm btn-gold" id="map-go" onclick="travelTo()" disabled>🚀 이동</button>
  </div>
  <div style="flex:1;position:relative;overflow:hidden;width:100%;min-height:0;height:0" id="map-wrap">
    <canvas id="map-cv" style="display:block;cursor:crosshair"></canvas>
    <div id="map-info" style="position:absolute;right:12px;top:10px;width:210px;background:rgba(13,26,42,.95);border:1px solid var(--bdr);border-radius:8px;padding:12px;font-size:13px;pointer-events:none">
      <div style="color:var(--cyan);margin-bottom:6px">📍 행성 정보</div>
      <div style="color:var(--dim)">행성을 클릭하세요</div>
    </div>
    <div id="map-float" style="display:none;position:absolute;pointer-events:auto;transform:translate(-50%,-100%);z-index:10">
      <div style="background:rgba(5,10,26,.97);border:1px solid var(--cyan);border-radius:8px;padding:8px 12px;text-align:center;white-space:nowrap;box-shadow:0 0 14px rgba(0,243,255,.3)">
        <div id="mf-nm" style="color:var(--yellow);font-size:14px;font-weight:bold;margin-bottom:4px"></div>
        <div id="mf-st" style="color:var(--dim);font-size:12px;margin-bottom:6px"></div>
        <button id="mf-go" class="btn btn-sm btn-gold" onclick="travelTo()" style="width:100%">🚀 이동</button>
      </div>
      <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:6px solid var(--cyan);margin:0 auto"></div>
    </div>
    <!-- 행성 호버 툴팁 (마우스오버 시 문화권/팩션 미리보기) -->
    <div id="map-hover" style="display:none;position:absolute;pointer-events:none;z-index:11;background:rgba(5,12,26,.96);border:1px solid var(--cyan);border-radius:6px;padding:6px 10px;font-size:12px;white-space:nowrap;box-shadow:0 2px 12px rgba(0,243,255,.25);transform:translate(-50%,calc(-100% - 14px))"></div>
  </div>`;
  G.mapSelected=null;
  // 레이아웃 완료 대기 후 캔버스 초기화 (다중 재시도)
  function tryInitMap(attempt){
    const cv=document.getElementById('map-cv');
    const wrap=document.getElementById('map-wrap');
    if(!cv||!wrap)return;
    const w=wrap.offsetWidth||wrap.getBoundingClientRect().width;
    const h=wrap.offsetHeight||wrap.getBoundingClientRect().height;
    if((w<10||h<10)&&attempt<8){
      setTimeout(()=>tryInitMap(attempt+1),80);
      return;
    }
    initMapCanvas();
    // 지도 열 때마다 현재 함선 위치(현 행성)를 화면 중앙으로 이동
    centerMapOnCurrentPlanet();
    renderMap();
  }
  setTimeout(()=>tryInitMap(0),30);
}
// 현재 행성(=함선 위치)을 캔버스 중앙으로 오게 하는 오프셋 계산
function centerMapOnCurrentPlanet(){
  if(!mapCV||!G.mapPositions)return;
  const pos=G.mapPositions[G.currentPlanet];
  if(!pos)return;
  const p3=rotate3D(pos.x,pos.y,0,map3dRotX,map3dRotY);
  const FOV=700;
  const scale=FOV/(FOV+p3.z*0.5)*(G.mapZoom||1);
  // screen = world*scale + (canvas/2 + offset). 중앙(canvas/2)에 두려면 offset = -world*scale
  mapOffX=-p3.x*scale;
  mapOffY=-p3.y*scale;
}
function showMap(){hubTab('map');}
function toggleMapDragMode(){
  mapDragMode=mapDragMode==='pan'?'rotate':'pan';
  const btn=document.getElementById('map-mode-btn');
  if(btn){btn.textContent=mapDragMode==='rotate'?'🔄 회전':'✋ 이동';btn.style.color=mapDragMode==='rotate'?'var(--cyan)':'var(--gold)';btn.style.borderColor=mapDragMode==='rotate'?'var(--cyan)':'var(--gold)';}
}
function initMapCanvas(){
  mapCV=document.getElementById('map-cv');if(!mapCV)return;
  const wrap=document.getElementById('map-wrap');
  const ww=wrap?(wrap.offsetWidth||wrap.clientWidth||wrap.getBoundingClientRect().width):800;
  const wh=wrap?(wrap.offsetHeight||wrap.clientHeight||wrap.getBoundingClientRect().height):600;
  const pw=Math.max(ww,300),ph=Math.max(wh,300);
  mapCV.width=pw;mapCV.height=ph;
  mapCV.style.width=pw+'px';mapCV.style.height=ph+'px'; // 명시적 픽셀 고정
  mapCtx=mapCV.getContext('2d');
  // ── 클릭/드래그 판정 강화: 시작 좌표 기준 누적 이동량 측정 + click 이벤트 폴백 ──
  let panDrag=false,rotateDrag=false,lx=0,ly=0,sx0=0,sy0=0,moved=false,mdownT=0;
  const CLICK_PX=8;   // 8px 이내면 클릭 (기존 3px → 8px)
  const CLICK_MS=400; // 400ms 이내면 클릭
  mapCV.oncontextmenu=e=>{e.preventDefault();}; // 우클릭 메뉴 방지
  mapCV.onmousedown=e=>{
    lx=e.clientX;ly=e.clientY;sx0=e.clientX;sy0=e.clientY;moved=false;mdownT=Date.now();
    if(e.button===0){panDrag=true;mapCV.style.cursor='grabbing';}
    else if(e.button===2){rotateDrag=true;mapCV.style.cursor='grabbing';}
  };
  mapCV.onmousemove=e=>{
    // 드래그 중이 아니면 호버 툴팁 처리
    if(!panDrag&&!rotateDrag){_updateMapHover(e);return;}
    const dx=e.clientX-lx,dy=e.clientY-ly;
    // 시작점 기준 누적 이동량으로 판정
    const totalDx=e.clientX-sx0,totalDy=e.clientY-sy0;
    if(Math.hypot(totalDx,totalDy)>CLICK_PX)moved=true;
    if(rotateDrag){
      map3dRotY+=dx*0.007;map3dRotX+=dy*0.007;
      map3dRotX=Math.max(-Math.PI/2,Math.min(Math.PI/2,map3dRotX));
    } else if(panDrag){
      mapOffX+=dx;mapOffY+=dy;
    }
    lx=e.clientX;ly=e.clientY;renderMap();
    // 드래그 중에는 툴팁 숨김
    _hideMapHover();
  };
  mapCV.onmouseup=e=>{
    if(e.button===0){
      const elapsed=Date.now()-mdownT;
      const wasClick=(!moved||elapsed<CLICK_MS)&&panDrag;
      panDrag=false;mapCV.style.cursor='crosshair';
      if(wasClick)onMapClick(e);
    } else if(e.button===2){rotateDrag=false;mapCV.style.cursor='crosshair';}
  };
  // 폴백: 일부 브라우저(특히 iframe 안)에서 mouseup이 안 잡힐 때 click 이벤트로도 처리
  mapCV.onclick=e=>{
    // mouseup에서 이미 처리됐으면 wasClick 흔적 없음 (재처리 방지)
    if(panDrag)return;
    const totalDx=e.clientX-sx0,totalDy=e.clientY-sy0;
    const elapsed=Date.now()-mdownT;
    if(Math.hypot(totalDx,totalDy)<=CLICK_PX*2&&elapsed<CLICK_MS*2){
      // 이미 처리됐는지 확인: mouseup에서 wasClick=true 였으면 onMapClick이 G.mapSelected를 바꿨을 것
      // 폴백은 안전하게 한 번 더 호출 (idempotent — 같은 결과)
      onMapClick(e);
    }
  };
  mapCV.onmouseleave=()=>{panDrag=false;rotateDrag=false;mapCV.style.cursor='crosshair';_hideMapHover();};
  mapCV.onwheel=e=>{e.preventDefault();G.mapZoom=Math.max(.25,Math.min(4,G.mapZoom+(e.deltaY>0?-.12:.12)));renderMap();};
  // touch events
  let touches=[],touchStartT=0;
  mapCV.addEventListener('touchstart',e=>{e.preventDefault();touches=[...e.touches];moved=false;touchStartT=Date.now();if(e.touches[0]){sx0=e.touches[0].clientX;sy0=e.touches[0].clientY;}},{passive:false});
  mapCV.addEventListener('touchmove',e=>{
    e.preventDefault();
    if(e.touches.length===1&&touches.length>=1){
      const dx=e.touches[0].clientX-touches[0].clientX,dy=e.touches[0].clientY-touches[0].clientY;
      const totalDx=e.touches[0].clientX-sx0,totalDy=e.touches[0].clientY-sy0;
      if(Math.hypot(totalDx,totalDy)>CLICK_PX)moved=true;
      mapOffX+=dx;mapOffY+=dy;
      renderMap();
    } else if(e.touches.length===2&&touches.length>=2){
      const d0=Math.hypot(touches[0].clientX-touches[1].clientX,touches[0].clientY-touches[1].clientY);
      const d1=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
      if(d0>0)G.mapZoom=Math.max(.25,Math.min(4,G.mapZoom*(d1/d0)));renderMap();
    }
    touches=[...e.touches];
  },{passive:false});
  mapCV.addEventListener('touchend',e=>{
    e.preventDefault();
    const elapsed=Date.now()-touchStartT;
    if((!moved||elapsed<CLICK_MS)&&e.changedTouches.length===1){onMapClick(e.changedTouches[0]);}
    touches=[];
  },{passive:false});
}
function mapZoom(d){G.mapZoom=Math.max(.25,Math.min(4,G.mapZoom+d));renderMap();}
function resetMapView(){mapOffX=0;mapOffY=0;G.mapZoom=1.0;map3dRotX=0.35;map3dRotY=0.0;renderMap();}
function getTx(){const s=G.mapZoom,tx=(mapCV?mapCV.width/2:400)+(mapOffX||0),ty=(mapCV?mapCV.height/2:300)+(mapOffY||0);return{s,tx,ty};}

// 3D projection
function rotate3D(x,y,z,rx,ry){
  const x1=x*Math.cos(ry)-z*Math.sin(ry),z1=x*Math.sin(ry)+z*Math.cos(ry);
  const y2=y*Math.cos(rx)-z1*Math.sin(rx),z2=y*Math.sin(rx)+z1*Math.cos(rx);
  return{x:x1,y:y2,z:z2};
}
function project3D(x,y,z){
  const FOV=700,cx=(mapCV?mapCV.width/2:400)+(mapOffX||0),cy=(mapCV?mapCV.height/2:300)+(mapOffY||0);
  const scale=FOV/(FOV+z*0.5)*G.mapZoom;
  return{sx:x*scale+cx,sy:y*scale+cy,scale};
}
function worldToScreen(wx,wy){
  const p3=rotate3D(wx,wy,0,map3dRotX,map3dRotY);
  return project3D(p3.x,p3.y,p3.z);
}
function toScr(wx,wy){const r=worldToScreen(wx,wy);return{x:r.sx,y:r.sy};}
function toWld(sx,sy){const cx=(mapCV?mapCV.width/2:400)+(mapOffX||0),cy=(mapCV?mapCV.height/2:300)+(mapOffY||0);return{x:(sx-cx)/G.mapZoom,y:(sy-cy)/G.mapZoom};}
function hexAlpha(hex,a){const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);return`rgba(${r},${g},${b},${a})`;}
function isConnected(a,b){if(!G.mapConns)return false;return G.mapConns.some(c=>(c.a===a&&c.b===b)||(c.a===b&&c.b===a));}
function isWithinHops(from,to,maxHops,visited){if(!visited)visited=new Set();if(from===to)return true;if(maxHops<=0)return false;visited.add(from);const nbrs=G.mapConns.filter(c=>c.a===from||c.b===from).map(c=>c.a===from?c.b:c.a);if(nbrs.includes(to))return true;if(maxHops<=1)return false;return nbrs.some(n=>!visited.has(n)&&isWithinHops(n,to,maxHops-1,visited));}
function hasLegendaryEngineOnAny(){return G.fleet.some(s=>(s.parts||[]).some(pid=>WARP_ENGINE_IDS.includes(pid)));}
function travelCost(f,t){const pa=G.mapPositions[f],pb=G.mapPositions[t];if(!pa||!pb)return 0;return Math.min(5000,Math.max(200,Math.floor(Math.hypot(pa.x-pb.x,pa.y-pb.y)*3.5)));}
function renderMap(){
  if(!mapCtx||!mapCV)return;
  const ctx=mapCtx,W=mapCV.width,H=mapCV.height;
  ctx.clearRect(0,0,W,H);
  // Starfield background
  ctx.fillStyle='#050a1a';ctx.fillRect(0,0,W,H);
  const rng2=mulberry32(42);
  for(let i=0;i<200;i++){const sx=rng2()*W,sy=rng2()*H,ss=rng2()*1.4+0.3,sa=rng2()*0.55+0.1;ctx.globalAlpha=sa;ctx.fillStyle='#ccd6f6';ctx.beginPath();ctx.arc(sx,sy,ss,0,Math.PI*2);ctx.fill();}
  ctx.globalAlpha=1;

  // Pentagon grid lines removed (클린 은하 지도)
  ctx.setLineDash([]);

  // Collect planets with 3D depth for back-to-front sorting
  const drawList=[];
  PLANET_DEF.forEach(p=>{
    const pos=G.mapPositions[p.id];if(!pos)return;
    const p3=rotate3D(pos.x,pos.y,0,map3dRotX,map3dRotY);
    const proj=project3D(p3.x,p3.y,p3.z);
    drawList.push({p,proj,z:p3.z});
  });
  drawList.sort((a,b)=>b.z-a.z);

  // Connections
  if(G.mapConns)G.mapConns.forEach(c=>{
    const pa=G.mapPositions[c.a],pb=G.mapPositions[c.b];if(!pa||!pb)return;
    if(G.planets[c.a]?.fog==='L'||G.planets[c.b]?.fog==='L')return;
    const sA=worldToScreen(pa.x,pa.y),sB=worldToScreen(pb.x,pb.y);
    const isAct=c.a===G.currentPlanet||c.b===G.currentPlanet;
    ctx.beginPath();ctx.moveTo(sA.sx,sA.sy);ctx.lineTo(sB.sx,sB.sy);
    if(isAct){
      ctx.strokeStyle='rgba(0,243,255,.7)';ctx.lineWidth=1.8;ctx.stroke();
    } else {
      ctx.setLineDash([4,6]);ctx.strokeStyle='rgba(0,243,255,.22)';ctx.lineWidth=0.9;ctx.stroke();ctx.setLineDash([]);
    }
  });

  // Planets back-to-front
  drawList.forEach(({p,proj})=>{
    const st=G.planets[p.id],fog=st?.fog||'L',fac=FACTION[p.f];
    const sp={x:proj.sx,y:proj.sy};
    const baseR=Math.max(3,4*G.mapZoom);
    const r=baseR*Math.max(0.5,Math.min(1.8,proj.scale/G.mapZoom));
    const isCur=p.id===G.currentPlanet,isSel=p.id===G.mapSelected;
    const alpha=fog==='L'?.1:fog==='S'?.5:1.0;
    const _mh=hasLegendaryEngineOnAny()?2:1;const isReach=fog!=='L'&&!isCur&&(hasBlinkOnAll()||isWithinHops(G.currentPlanet,p.id,_mh));

    if(isReach){ctx.globalAlpha=.16;ctx.fillStyle='#00f3ff';ctx.beginPath();ctx.arc(sp.x,sp.y,r*2.8,0,Math.PI*2);ctx.fill();}
    if(fog!=='L'){
      const grd=ctx.createRadialGradient(sp.x,sp.y,0,sp.x,sp.y,r*3);
      grd.addColorStop(0,hexAlpha(fac.col,.3*alpha));grd.addColorStop(1,hexAlpha(fac.col,0));
      ctx.globalAlpha=1;ctx.fillStyle=grd;ctx.beginPath();ctx.arc(sp.x,sp.y,r*3,0,Math.PI*2);ctx.fill();
    }
    // Planet image or sphere with 3D shading
    // P31(지구)는 잠금 상태(fog=L)에서도 항상 이미지 렌더 (지구는 항상 보여야 한다)
    if(fog!=='L'||p.id==='P31'){
      const pimgSrc='img/planets/'+p.id+'.png';
      const pImg=_loadMapImg(pimgSrc,()=>renderMap());
      if(pImg&&pImg.complete&&pImg.naturalWidth>0){
        ctx.save();ctx.globalAlpha=(p.id==='P31'&&fog==='L')?0.85:alpha;
        ctx.beginPath();ctx.arc(sp.x,sp.y,r,0,Math.PI*2);ctx.clip();
        ctx.drawImage(pImg,sp.x-r,sp.y-r,r*2,r*2);
        ctx.restore();
      } else {
        const sg=ctx.createRadialGradient(sp.x-r*.3,sp.y-r*.3,r*.05,sp.x,sp.y,r*1.1);
        sg.addColorStop(0,'rgba(255,255,255,0.55)');sg.addColorStop(0.45,fac.col);sg.addColorStop(1,'rgba(0,0,0,0.55)');
        ctx.globalAlpha=alpha;ctx.fillStyle=sg;
        ctx.beginPath();ctx.arc(sp.x,sp.y,r,0,Math.PI*2);ctx.fill();
      }
    } else {
      ctx.globalAlpha=alpha;ctx.fillStyle=fac.col;
      ctx.beginPath();ctx.arc(sp.x,sp.y,r,0,Math.PI*2);ctx.fill();
    }

    if(isCur||isSel||isReach){
      ctx.strokeStyle=isCur?'#deff9a':isSel?'#ffffff':'rgba(0,243,255,.7)';
      ctx.lineWidth=isCur?2.5:1.5;
      if(!isCur&&!isSel)ctx.setLineDash([3,3]);
      ctx.beginPath();ctx.arc(sp.x,sp.y,r+(isCur?5:3),0,Math.PI*2);ctx.stroke();
      ctx.setLineDash([]);
    }
    if(isCur){ctx.strokeStyle='rgba(222,255,154,.25)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(sp.x,sp.y,r+11,0,Math.PI*2);ctx.stroke();}
    // 기함 이미지 표시 (현재 위치 행성 우측)
    if(isCur&&G.fleet&&G.fleet.length>0){
      var _fsz=Math.max(18,r*3.2);
      var _fImgSrc=shipImgSrc(G.fleet[0]);
      var _fImg=_loadMapImg(_fImgSrc,function(){renderMap();});
      if(_fImg&&_fImg.complete&&_fImg.naturalWidth>0){
        ctx.save();ctx.globalAlpha=0.9;
        ctx.beginPath();ctx.arc(sp.x+r+_fsz/2+5,sp.y,_fsz/2,0,Math.PI*2);ctx.clip();
        ctx.drawImage(_fImg,sp.x+r+5,sp.y-_fsz/2,_fsz,_fsz);
        ctx.restore();ctx.globalAlpha=1;
      } else {
        ctx.globalAlpha=1;ctx.fillStyle='#deff9a';
        ctx.font=Math.max(10,r*2)+'px serif';
        ctx.textAlign='left';
        ctx.fillText('🛸',sp.x+r+6,sp.y+4);
      }
    }
    if(st?.owned){ctx.fillStyle='#deff9a';ctx.font=`${Math.max(7,9*G.mapZoom)}px serif`;ctx.textAlign='center';ctx.globalAlpha=1;ctx.fillText('🏠',sp.x,sp.y-r-4);}
    // 라벨: 일반 행성은 잠금 상태에선 미표시, P31(지구)는 잠금이어도 라벨 항상 표시
    if((fog!=='L'||p.id==='P31')&&G.mapZoom>.35){
      ctx.fillStyle=p.id==='P31'?'#6ecfff':fog==='A'?'#ccd6f6':'rgba(160,200,220,.55)';
      ctx.font=`${p.id==='P31'?'bold ':''}${Math.max(7,8*G.mapZoom)}px 'Malgun Gothic','맑은 고딕','Courier New'`;
      ctx.textAlign='center';ctx.globalAlpha=p.id==='P31'?1:alpha;
      ctx.fillText(p.nm,sp.x,sp.y+r+13);
    }
    ctx.globalAlpha=1;
  });

  // 지구 봉쇄 링 — 보스 격파 전에만 P31 주변에 빨간 점선 (장식용 중앙 지구 통합)
  // P31이 실제 지도 행성으로 PLANET_DEF에 있으므로 별도 구체 렌더링은 제거.
  if(G&&!G._earthLiberated&&G.mapPositions&&G.mapPositions['P31']){
    const _p31pos=G.mapPositions['P31'];
    const _p31_3d=rotate3D(_p31pos.x,_p31pos.y,0,map3dRotX,map3dRotY);
    const _p31p=project3D(_p31_3d.x,_p31_3d.y,_p31_3d.z);
    const _p31r=Math.max(8,12*G.mapZoom);
    ctx.strokeStyle='rgba(255,60,60,0.55)';ctx.lineWidth=1.4;ctx.setLineDash([4,5]);
    ctx.beginPath();ctx.arc(_p31p.sx,_p31p.sy,_p31r+10,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
  }
  // ── 거대 블랙홀 (은하 중앙) ────────────────────────────────────────
  {
    const bhWX=0,bhWY=0;
    const bh3d=rotate3D(bhWX,bhWY,0,map3dRotX,map3dRotY);
    const bp=project3D(bh3d.x,bh3d.y,bh3d.z);
    const br=Math.max(10,18*G.mapZoom);  // 2배 확대
    const _bhT=(Date.now()/1000)%360;
    // ── 외부 노란 광환 (황금빛 글로우) ──
    const bhg=ctx.createRadialGradient(bp.sx,bp.sy,br*0.5,bp.sx,bp.sy,br*9);
    bhg.addColorStop(0,'rgba(200,160,0,0.95)');
    bhg.addColorStop(0.12,'rgba(255,200,0,0.75)');
    bhg.addColorStop(0.28,'rgba(220,140,0,0.45)');
    bhg.addColorStop(0.5,'rgba(150,90,0,0.22)');
    bhg.addColorStop(0.75,'rgba(80,40,0,0.08)');
    bhg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.globalAlpha=1;ctx.fillStyle=bhg;
    ctx.beginPath();ctx.arc(bp.sx,bp.sy,br*9,0,Math.PI*2);ctx.fill();
    // ── 강착 원반 (어코어션 디스크, 황금빛 타원형 회전 링) ──
    ctx.save();
    ctx.translate(bp.sx,bp.sy);
    ctx.rotate(_bhT*0.4);
    ctx.scale(1,0.38);
    for(let ri=0;ri<3;ri++){
      const _rr=br*(1.8+ri*0.6);
      const _ra=0.65-ri*0.15;
      const _rc=['rgba(255,220,0,'+_ra+')','rgba(255,160,0,'+_ra+')','rgba(255,100,0,'+(_ra*0.7)+')'][ri];
      const dg=ctx.createLinearGradient(-_rr,0,_rr,0);
      dg.addColorStop(0,'transparent');dg.addColorStop(0.3,_rc);dg.addColorStop(0.5,_rc);dg.addColorStop(0.7,_rc);dg.addColorStop(1,'transparent');
      ctx.strokeStyle=dg;ctx.lineWidth=br*(0.28-ri*0.05);ctx.globalAlpha=0.9;
      ctx.beginPath();ctx.ellipse(0,0,_rr,_rr*0.18,0,0,Math.PI*2);ctx.stroke();
    }
    ctx.restore();
    // ── 이벤트 호라이즌 링 (황금빛 펄스) ──
    const _pulse=0.7+0.3*Math.sin(_bhT*3);
    ctx.strokeStyle=`rgba(255,210,0,${_pulse*0.95})`;ctx.lineWidth=3*G.mapZoom;ctx.setLineDash([]);
    ctx.globalAlpha=1;
    ctx.beginPath();ctx.arc(bp.sx,bp.sy,br*1.35,0,Math.PI*2);ctx.stroke();
    // 외부 희미한 황금 링
    ctx.strokeStyle=`rgba(200,140,0,${_pulse*0.4})`;ctx.lineWidth=1.5;ctx.setLineDash([4,3]);
    ctx.beginPath();ctx.arc(bp.sx,bp.sy,br*2.4,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
    // ── 블랙홀 이미지 or 검은 원 ──
    const bhImg=_loadMapImg('img/planets/blackhole.png',()=>renderMap());
    if(bhImg&&bhImg.complete&&bhImg.naturalWidth>0){
      ctx.save();ctx.globalAlpha=1;
      ctx.beginPath();ctx.arc(bp.sx,bp.sy,br,0,Math.PI*2);ctx.clip();
      ctx.drawImage(bhImg,bp.sx-br,bp.sy-br,br*2,br*2);ctx.restore();
    } else {
      // 검은 원 + 내부 미묘한 황금빛 코어
      const bhIn=ctx.createRadialGradient(bp.sx,bp.sy*0.97,0,bp.sx,bp.sy,br);
      bhIn.addColorStop(0,'rgba(20,10,0,1)');bhIn.addColorStop(0.5,'rgba(5,2,0,1)');bhIn.addColorStop(1,'rgba(0,0,0,1)');
      ctx.globalAlpha=1;ctx.fillStyle=bhIn;
      ctx.beginPath();ctx.arc(bp.sx,bp.sy,br,0,Math.PI*2);ctx.fill();
    }
    // ── 레이블 ──
    const _revealed=G._falconDefeated;
    ctx.globalAlpha=_revealed?1:0.55;
    const _bhFontSz=Math.max(9,10*G.mapZoom);
    if(_revealed){
      ctx.fillStyle='rgba(200,160,0,0.3)';ctx.fillRect(bp.sx-52,bp.sy+br+3,104,20);
    }
    ctx.fillStyle=_revealed?'#ffdd44':'rgba(200,140,0,0.8)';
    ctx.font=`bold ${_bhFontSz}px Courier New`;ctx.textAlign='center';
    ctx.fillText(_revealed?'◈ 보이드의 심연':'◈ ???',bp.sx,bp.sy+br+18);
    if(!_revealed){
      ctx.fillStyle='rgba(220,160,0,0.5)';ctx.font=`${Math.max(7,8*G.mapZoom)}px Courier New`;
      ctx.fillText('[잠김]',bp.sx,bp.sy+br+30);
    }
    ctx.globalAlpha=1;
    // ── 블랙홀 재렌더 애니메이션 ──
    if(!window._bhAnimRunning){
      window._bhAnimRunning=true;
      (function _bhTick(){
        if(document.getElementById('s-map')?.style.display!=='none'&&mapCtx){
          renderMap();window._bhAnimRunning=false;
        }else{
          setTimeout(_bhTick,120);
        }
      })();
      setTimeout(()=>{window._bhAnimRunning=false;},3000);
    }
  }

  // Mode hint
  ctx.fillStyle='rgba(100,180,255,.3)';ctx.font='9px Courier New';ctx.textAlign='left';
  ctx.fillText('[🖱️ 좌클릭→이동  우클릭→3D회전  휠→줌  행성클릭→선택]',8,H-8);
  refreshFloatBtn();
}
// 행성 호버 툴팁: 마우스 위치에서 가까운 행성 찾아 팩션/문화권 미리보기 표시
function _hideMapHover(){const el=document.getElementById('map-hover');if(el)el.style.display='none';}
function _updateMapHover(e){
  const el=document.getElementById('map-hover');
  if(!el||!mapCV||!G.mapPositions)return;
  const rect=mapCV.getBoundingClientRect();
  const rectW=rect.width||1,rectH=rect.height||1;
  const scaleX=mapCV.width/rectW,scaleY=mapCV.height/rectH;
  const cssX=(e.clientX||0)-rect.left,cssY=(e.clientY||0)-rect.top;
  const mx=cssX*scaleX,my=cssY*scaleY;
  // 가까운 행성 찾기 (클릭 hit-test와 동일 반지름)
  let closest=null,minD=Infinity;
  const cr=Math.max(28,26/G.mapZoom);
  PLANET_DEF.forEach(p=>{
    const pos=G.mapPositions[p.id];if(!pos)return;
    const sp=worldToScreen(pos.x,pos.y);
    const d=Math.hypot(sp.sx-mx,sp.sy-my);
    if(d<cr&&d<minD){minD=d;closest=p;}
  });
  if(!closest){_hideMapHover();return;}
  const st=G.planets[closest.id],fog=st?.fog||'L';
  const fac=FACTION[closest.f];
  const facCol=fac?.col||'var(--dim)';
  const facNm=fac?.nm||closest.f||'-';
  const factionLabels={
    F01:'🏛️ 수퍼비아 — 귀족·정치 중심 문명',
    F02:'💰 아우레우스 — 금융·자본 중심 문명',
    F03:'🤖 메카니카 — 기계·로봇 공화국',
    F04:'⚔️ 크리그 — 전사·군국주의 문명',
    F05:'🛸 치크스 — 적대 외계 군단',
    F06:'🌍 지구저항군 — 인류 봉쇄 해제 동맹',
    F07:'🌀 보이드 — 균열지대 미지 세력'
  };
  const facDetail=factionLabels[closest.f]||facNm;
  if(fog==='L'){
    // 미탐험: 잠금 표시
    el.innerHTML=`<div style="color:var(--dim);font-size:11px">🔒 미탐험 행성</div>
      <div style="color:var(--dim);font-size:10px;margin-top:2px">인접 행성 방문 후 해금</div>`;
  } else {
    const _hostile=closest.hostile?' <span style="color:var(--red)">⚠️</span>':'';
    const _void=closest.void?' <span style="color:var(--purple)">🌀</span>':'';
    el.innerHTML=`<div style="color:${facCol};font-size:13px;font-weight:bold">${closest.nm}${_hostile}${_void}</div>
      <div style="color:${facCol};font-size:11px;margin-top:2px">${facDetail}</div>
      <div style="color:var(--dim);font-size:10px;margin-top:1px">링 ${closest.ring} · 세율 ₡${closest.tax.toLocaleString()}/턴</div>`;
  }
  // 화면 좌표 (CSS 픽셀 기준)
  const sp=worldToScreen(G.mapPositions[closest.id].x,G.mapPositions[closest.id].y);
  el.style.left=(sp.sx/scaleX)+'px';
  el.style.top=(sp.sy/scaleY)+'px';
  el.style.display='block';
}

function onMapClick(e){
  const rect=mapCV?mapCV.getBoundingClientRect():{left:0,top:0,width:1,height:1};
  // CSS 픽셀 → canvas 내부 픽셀 변환 (게임 스테이지 transform:scale + canvas width/style.width 불일치 보정)
  const rectW=rect.width||1,rectH=rect.height||1;
  const scaleX=(mapCV?mapCV.width:rectW)/rectW;
  const scaleY=(mapCV?mapCV.height:rectH)/rectH;
  const cssX=(e.clientX!==undefined?e.clientX:e.pageX||0)-rect.left;
  const cssY=(e.clientY!==undefined?e.clientY:e.pageY||0)-rect.top;
  const mx=cssX*scaleX;
  const my=cssY*scaleY;
  // ── 블랙홀 클릭 hit-test ──────────────────────────────────────────
  {
    const _bh3d=rotate3D(0,0,0,map3dRotX,map3dRotY);
    const _bp=project3D(_bh3d.x,_bh3d.y,_bh3d.z);
    const _br=Math.max(10,18*G.mapZoom)*1.4;  // 2배 확대에 맞춘 hit-test
    const _bhDist=Math.hypot(_bp.sx-mx,_bp.sy-my);
    if(_bhDist<_br){
      // 보이드 행성 전체 Lv10 투자 여부 (마지막 시험 조건)
      const _voidPlanets=PLANET_DEF.filter(p=>p.void);
      const _voidOwnedAll=_voidPlanets.every(p=>G.planets[p.id]?.owned);
      const _voidMaxAll=_voidPlanets.every(p=>(G.planets[p.id]?.commerce||0)>=10);
      const _allVoid100=_voidOwnedAll&&_voidMaxAll;
      const _voidProgress=_voidPlanets.filter(p=>(G.planets[p.id]?.commerce||0)>=10).length;
      if(!G._falconDefeated){
        baekgu('저곳은... 블랙홀이야. 뭔가 있는 것 같지만 아직 접근할 수 없어. 팔콘 스카우트를 먼저 처치해야 해!');
        notify('🌑 [잠김] 팔콘 스카우트를 격파해야 진입 가능합니다','err');
      } else if(G._finalTestComplete){
        openModal('◈ 보이드의 심연',
          `<div style="text-align:center;padding:16px">
            <div style="font-size:48px;margin-bottom:10px">🌑</div>
            <div style="color:#cc44ff;font-size:18px;font-weight:bold;margin-bottom:8px">보이드의 심연 — 시험 통과</div>
            <div style="color:#fff;font-size:15px;line-height:2;background:#000;padding:12px 16px;border-radius:8px;border:1px solid #cc44ff">
              그대는 이미 마지막 시험을 통과하였다.<br>
              <span style="color:#cc44ff">검은 팔콘은 그대의 의지를 따른다.</span>
            </div>
          </div>`,
          [{txt:'돌아가기',fn:closeModal,cls:'btn-sm'}]);
      } else if(!G._voidSpearObtained){
        // 1차 보상: 보이드의 창 (기존 흐름)
        openModal('◈ 보이드의 심연',
          `<div style="text-align:center;padding:20px;background:linear-gradient(180deg,#0a0015,#1a0030);border-radius:10px;border:1px solid rgba(180,0,255,.4)">
            <div style="font-size:56px;margin-bottom:10px;animation:pulse 1.5s infinite">🌑</div>
            <div style="color:#dd66ff;font-size:19px;font-weight:bold;margin-bottom:10px;text-shadow:0 0 12px rgba(200,100,255,.6)">◈ 보이드의 심연</div>
            <div style="color:#e0d0ff;font-size:15px;line-height:2;background:rgba(0,0,0,.6);padding:14px 18px;border-radius:8px;border:1px solid rgba(180,0,255,.3);margin-bottom:12px">
              살아서 이곳을 나간 자는 아직 없다.<br>
              <span style="color:#cc44ff">... 그러나 당신은 달랐다.</span>
            </div>
            <div style="color:var(--gold);font-size:14px;background:rgba(212,175,55,.08);border:1px solid rgba(212,175,55,.3);border-radius:6px;padding:8px 14px;margin-bottom:8px">
              🔱 <b>보이드의 창</b> 획득 — 신화급 무기 1점
            </div>
            <div style="color:var(--cyan);font-size:11px;margin-top:8px">※ 모든 보이드 행성 Lv10 투자 시 — 마지막 시험 개방</div>
          </div>`,
          [{txt:'🔱 창을 가져가다',fn:()=>{closeModal();_grantVoidSpear();G._voidSpearObtained=true;saveGame(true);},cls:'btn-gold'},{txt:'돌아가기',fn:closeModal,cls:'btn-sm'}]);
      } else if(!_allVoid100){
        // 2차 조건: 보이드 100% 투자 아직 미달
        openModal('◈ 보이드의 심연 — 마지막 시험',
          `<div style="text-align:center;padding:20px;background:linear-gradient(180deg,#0a0015,#1a0030);border-radius:10px;border:1px solid rgba(180,0,255,.4)">
            <div style="font-size:56px;margin-bottom:10px">🌑</div>
            <div style="color:#dd66ff;font-size:18px;font-weight:bold;margin-bottom:10px">은하 가운데로 가는 문이 닫혀 있다</div>
            <div style="color:#e0d0ff;font-size:14px;line-height:2;background:rgba(0,0,0,.6);padding:12px 16px;border-radius:8px;border:1px solid rgba(180,0,255,.3);margin-bottom:12px">
              팔콘 스카우트의 메시지를 기억하는가?<br>
              <span style="color:#cc44ff">"은하 가운데로 가볼 수 있다면 마지막 시험을 통과할 것이다."</span>
            </div>
            <div style="color:var(--yellow);font-size:13px;background:rgba(255,215,0,.06);border:1px solid rgba(255,215,0,.3);border-radius:6px;padding:10px 14px;line-height:1.8">
              📍 조건: 보이드 행성(${_voidPlanets.length}개) 모두 Lv10 투자<br>
              <span style="color:var(--cyan);font-weight:bold">현재 진행: ${_voidProgress} / ${_voidPlanets.length}</span>
            </div>
          </div>`,
          [{txt:'돌아가기',fn:closeModal,cls:'btn-sm'}]);
      } else {
        // 3차: 마지막 시험 통과 — 흰 화면 → 메시지 → 보상
        closeModal();
        _enterBlackHoleFinalTest();
      }
      return;
    }
  }

  // (이전 장식용 지구 클릭 핸들러는 제거 — P31이 PLANET_DEF의 일반 행성으로 처리됨)
  // 보스 격파 전 P31 클릭 → tryBossEntry, 격파 후 → 일반 이동 (아래 PLANET_DEF.forEach에서 자동 처리)
  // 따라서 PLANET_DEF.forEach 결과로 P31이 closest로 선택되면 미리 처리:
  if(G&&!G._earthLiberated&&G.mapPositions&&G.mapPositions['P31']){
    const _p31w=G.mapPositions['P31'];
    const _p31_3d=rotate3D(_p31w.x,_p31w.y,0,map3dRotX,map3dRotY);
    const _p31p=project3D(_p31_3d.x,_p31_3d.y,_p31_3d.z);
    const _p31r=Math.max(8,12*G.mapZoom);
    if(Math.hypot(_p31p.sx-mx,_p31p.sy-my)<_p31r*2.5){
      baekgu('지구야... 우르사 메이저를 격파해야 봉쇄가 풀려. 치크스 행성 3개 이상 공략하면 최종전 진입 가능해!');
      tryBossEntry();
      return;
    }
  }
  // 3D hit-test: compare click to each planet's projected screen position
  let closest=null,minD=Infinity;const cr=Math.max(24,22/G.mapZoom);
  PLANET_DEF.forEach(p=>{
    const pos=G.mapPositions[p.id];if(!pos)return;
    const sp=worldToScreen(pos.x,pos.y);
    const d=Math.hypot(sp.sx-mx,sp.sy-my);
    if(d<cr&&d<minD){minD=d;closest=p;}
  });
  if(!closest){
    G.mapSelected=null;
    const fl=document.getElementById('map-float');if(fl)fl.style.display='none';
    const info=document.getElementById('map-info');if(info)info.innerHTML='<div style="color:var(--cyan);margin-bottom:6px">📍 행성 정보</div><div style="color:var(--dim)">행성을 클릭하세요</div>';
    renderMap();return;
  }
  const st=G.planets[closest.id],fog=st?.fog||'L';
  G.mapSelected=fog!=='L'?closest.id:null;updateMapInfo(closest,fog);renderMap();
}
function updateMapInfo(p,fog){
  const info=document.getElementById('map-info'),goBtn=document.getElementById('map-go'),costEl=document.getElementById('map-cost');
  const fac=FACTION[p.f],st=G.planets[p.id],isCur=p.id===G.currentPlanet;
  const blink=hasBlinkOnAll();
  const conn=blink||(fog!=='L'&&isWithinHops(G.currentPlanet,p.id,hasLegendaryEngineOnAny()?2:1));
  const cost=fog!=='L'?travelCost(G.currentPlanet,p.id):0;
  // 우측 상세 패널 업데이트
  if(info){
    if(fog==='L'){info.innerHTML=`<div style="color:var(--dim);font-size:13px">🔒 미탐험<br>인접 행성 방문 후 해금</div>`;}
    else{info.innerHTML=`<div style="color:${fac.col};font-size:14px;font-weight:bold;margin-bottom:6px">${p.nm}</div>
      <div style="font-size:12px;color:var(--dim);line-height:2"><span style="color:${fac.col}">${fac.nm}</span>${p.hostile?' <span style="color:var(--red)">⚠️적대</span>':''}${p.void?' <span style="color:var(--cyan)">🌀균열</span>':''}
      <br>세율: <span style="color:var(--gold)">₡${p.tax.toLocaleString()}/턴</span>
      ${st?.owned?`<br>🏠 보유 Lv${st.commerce}`:''}
      ${p.hero&&!G.heroes.includes(p.hero)?`<br><span style="color:var(--purple)">✨ 영웅 영입 가능</span>`:''}
      <br>${blink?`<span style="color:var(--cyan)">⚡ 블링크 순간이동 ₡${cost.toLocaleString()}</span>`:conn?`<span style="color:var(--green)">✅ 이동 ₡${cost.toLocaleString()}</span>`:isCur?`<span style="color:var(--yellow)">📍 현재 위치</span>`:`<span style="color:var(--red)">❌ 항로 없음</span>`}</div>`;}
  }
  if(goBtn){goBtn.disabled=isCur||!conn||fog==='L';}
  if(costEl)costEl.textContent=conn&&!isCur?`이동 비용 ₡${cost.toLocaleString()}${blink?' ⚡':''}`:isCur?'현재 위치':'';
  // 행성 위 floating 버튼 업데이트
  updateFloatBtn(p,fog,conn,isCur,cost);
}
function updateFloatBtn(p,fog,conn,isCur,cost){
  const fl=document.getElementById('map-float');if(!fl)return;
  if(!p||fog==='L'||isCur){fl.style.display='none';return;}
  const pos=G.mapPositions[p.id];if(!pos)return;
  const sp=worldToScreen(pos.x,pos.y);
  const r=Math.max(5,8*G.mapZoom);
  fl.style.left=sp.sx+'px';
  fl.style.top=(sp.sy-r-10)+'px';
  fl.style.display='block';
  const nm=document.getElementById('mf-nm');if(nm)nm.textContent=p.nm;
  const st2=document.getElementById('mf-st');
  const _blink=hasBlinkOnAll();
  if(st2){
    if(_blink)st2.innerHTML=`<span style="color:var(--cyan)">⚡ 블링크 순간이동 ₡${cost.toLocaleString()}</span>`;
    else if(conn)st2.innerHTML=`<span style="color:var(--green)">₡${cost.toLocaleString()} | 이동 가능</span>`;
    else st2.innerHTML=`<span style="color:var(--red)">항로 없음 — 블링크 엔진 장착 필요</span>`;
  }
  const mfgo=document.getElementById('mf-go');if(mfgo)mfgo.disabled=!conn&&!_blink;
}
// 맵 드래그/줌 후 floating 버튼 위치 갱신
function refreshFloatBtn(){
  if(!G.mapSelected)return;
  const p=PLANET_DEF.find(x=>x.id===G.mapSelected);if(!p)return;
  const st=G.planets[p.id],fog=st?.fog||'L',isCur=p.id===G.currentPlanet,cost=travelCost(G.currentPlanet,p.id);
  const conn=hasBlinkOnAll()||(fog!=='L'&&isConnected(G.currentPlanet,p.id));
  updateFloatBtn(p,fog,conn,isCur,cost);
}
function travelTo(){
  const pid=G.mapSelected;if(!pid||pid===G.currentPlanet)return;
  const pd=PLANET_DEF.find(p=>p.id===pid),cost=travelCost(G.currentPlanet,pid);
  const blink=hasBlinkOnAll();
  // 블링크 엔진 없을 때 연결 항로 체크
  if(!blink){const _maxHops=hasLegendaryEngineOnAny()?2:1;if(!isWithinHops(G.currentPlanet,pid,_maxHops)){notify('항로 없음. 인접 행성만 이동 가능 (전설엔진=2칸, 블링크=전체)','err');return;}}
  // 탐험되지 않은 행성은 블링크로도 이동 불가
  if(G.planets[pid]?.fog==='L'&&!blink){notify('미탐험 행성 — 먼저 인접 행성부터 방문하세요','err');return;}
  if(G.credits<cost){notify(`이동 비용 ₡${cost.toLocaleString()} 부족`,'err');return;}
  G.credits-=cost;G.currentPlanet=pid;G.planets[pid].fog='A';G.stayTurns=0;if(G.planets[pid].hubProg===undefined)G.planets[pid].hubProg=0;
  try{AudioMgr.playBgm(_planetBgmName(pid));}catch(e){}
  // 행성 이동 시 치크스 출몰 카운터 유지 (같은 치크스 구역 침투 지속 반영)
  if(!PLANET_DEF.find(p=>p.id===pid)?.hostile){G.chixWaves=0;G.lastChixTurn=-999;} // 안전 행성으로 이동 시 리셋
  // Fix16: 인접 행성 자동 탐색 제거 — 행성은 직접 방문해야만 해금
  // 인접 연결 행성만 fog='S'로 공개 (직접 방문 시에만 'A'로 변경)
  if(G.mapConns){G.mapConns.filter(c=>c.a===pid||c.b===pid).forEach(c=>{const nb=c.a===pid?c.b:c.a;if(G.planets[nb]&&G.planets[nb].fog==='L')G.planets[nb].fog='S';});}
  generateShopStock(pid);  // 처음 방문 시 상점 재고 생성
  G.turn++;updateHUD();renderMap();G.mapSelected=null;
  const goBtn=document.getElementById('map-go');if(goBtn)goBtn.disabled=true;
  const fl=document.getElementById('map-float');if(fl)fl.style.display='none';
  boostLoyalty('travel'); // ← 충성도 증가 (이동)
  randomBaekgu('travel');notify(`🚀 ${pd.nm} 도착`,'ok');
  if(pd.hostile&&!G.planets[pd.id]?.hostile_cleared){setTimeout(()=>showHostilePlanetBriefing(pd),800);return;}
  if(pd.hostile&&G.planets[pd.id]?.hostile_cleared){notify('🏠 '+pd.nm+' — 합병된 영토 도착','ok');}
  // 랜덤 해적 조우 (턴 3 이후, 비적대 행성)
  if(G.turn>2){
    // 허브 미해금 시 해적 조우 100% 보장 (해금 퀘스트 반드시 10회 진행)
    const _hubUnlocked=isPlanetHubUnlocked(pid);
    const chance=_hubUnlocked?calcTravelPirateChance(pd):100;
    if(Math.random()*100<chance){
      baekgu(_hubUnlocked?'항로에서 뭔가 잡혔어. 조심해.':'⚠️ 이 행성은 아직 해금되지 않았어. 해적을 퇴치해야 시설을 이용할 수 있어!');
      setTimeout(()=>triggerTravelPirate(pd),900);
      return;
    }
  }
  checkDeliveryQuests(pid);  // ← 배달 퀘스트 완료 체크
  // 영웅 자동 영입 제거 — H01~H08은 해당 행성의 퀘스트 완료 시 5% 확률로만 등장
  // 제작소 관련 백구 힌트 (행성 첫 방문 또는 20% 확률 재방문)
  if(Math.random()<0.20||!G.planets[pid]._craftHinted){
    if(!G.blueprints)G.blueprints={};
    const _bpId=BLUEPRINT_MAP[pid];
    const _bpRec=_bpId&&CRAFT_RECIPES.find(r=>r.id===_bpId);
    const _fMatId=FACTION_MATS[pd.f];
    const _fMat=_fMatId&&COMMODITIES.find(c=>c.id===_fMatId);
    const _hasBp=_bpId&&G.blueprints[_bpId];
    if(!G.planets[pid]._craftHinted&&_bpRec&&!_hasBp){
      // 첫 방문: 설계도 드롭 힌트
      setTimeout(()=>baekgu(`${pd.nm}에서 퀘스트 클리어하면 ${_bpRec.nm} 설계도가 5% 확률로 드랍돼. 도전해봐!`),1500);
      G.planets[pid]._craftHinted=true;
    } else if(_hasBp&&_fMat){
      // 설계도 보유 시 재료 힌트
      const have=G.materials[_fMatId]||0;
      const needed=(_bpRec?.mats||[]).find(m=>m.id===_fMatId)?.qty||0;
      if(needed>0&&have<needed){
        setTimeout(()=>baekgu(`${_fMat.nm} ${have}/${needed}개. 이 행성 상점에서 살 수 있어. ${_bpRec.nm} 제작에 필요해.`),1500);
      }
    } else if(_fMat&&(G.materials[_fMatId]||0)<5){
      setTimeout(()=>baekgu(`${pd.nm}은 ${_fMat.nm} 산지야. 상점에서 구할 수 있어. 제작소 재료로 쓰여.`),1500);
    }
  }

  // 지구 저항군 행성 도착 & 이순신 미영입 시 G18 힌트
  if(pd.f==='F06'&&!G.heroes.includes('H01')){
    const hasG18=(G.inventory||[]).find(i=>i.id==='G18'&&i.qty>0);
    if(!hasG18)setTimeout(()=>baekgu('이 구역은 지구 저항군 지역이야. 상점에서 난중일기 영인본 구입하면 이순신 영입 가능해.'),1200);
    else setTimeout(()=>baekgu('난중일기 있어. 이 행성에 이순신이 있으면 영입 가능해.'),1200);
  }
  // ── 보이드(F07) 행성 도착 — 지구 해방 후에만 미스터리한 신호 언급 ──
  // 우르사 메이저 격파 전엔 일반 균열 행성으로만 인식
  // 격파 후 보이드 행성 근처에 도착하면 백구가 검은 함선/통신 신호를 감지
  if(pd.f==='F07'&&G._earthLiberated&&!G._voidFalconDefeated){
    if(!G._voidHintShown)G._voidHintShown={};
    if(!G._voidHintShown[pd.id]){
      G._voidHintShown[pd.id]=true;
      const _hints={
        P27:'어라? 균열에서 이상한 신호가 잡혀. 신호 발원지는 더 깊은 곳… 제타 레티쿨리(P30)로 가야 할 것 같아. 거기서 광장 → 제독 의뢰를 봐.',
        P28:'정체불명의 잡음이 끼고 있어. 신호가 강해지는 방향은 제타 레티쿨리(P30) 쪽. 거기로 가서 광장 → 제독 의뢰 확인해.',
        P29:'균열 너머에 검은 그림자가 보여... 신호 끝점은 제타 레티쿨리(P30)야. 거기 도착하면 광장 → 제독 의뢰에 [히든] 퀘스트가 뜰 거야.',
        P30:'제타 레티쿨리... 여기야! 검은색 함선이 잡혔어! 통신 신호가 — 우리한테 직접 보내는 것 같아. 광장 → 제독 의뢰에 [히든] 의뢰 떴어. 확인해봐!'
      };
      const _msg=_hints[pd.id]||'균열에서 미지의 신호가 잡혀. 뭔가 있어.';
      setTimeout(()=>baekgu(_msg),1500);
    }
    // P30 도착 즉시 q_void_boss 퀘스트 생성 (광장 미진입 상태에서도 노출 보장)
    if(pd.id==='P30'&&typeof generateQuests==='function')generateQuests('P30');
  }
  saveGame(true);
}

// ═══ COMBAT ══════════════════════════════════════════════════════
let combatState=null;
// ── 영웅 전역 패시브 보너스 (영입한 영웅에 따라 함대 전체에 적용) ──────
function getHeroPassiveBonus(){
  const h=G.heroes||[];
  // H01 이순신: INT +25% (전술 강화)
  // H03 광개토대왕: ATT +15% (정복 의지)
  // H04 유리 가가린: 회피·실드 — maxSH +15%
  // H06 아인슈타인: INT +30%, ATT +10% (천재 통찰)
  // H07 테슬라: TEC +25% (전기 공학)
  // H08 마르코 폴로: HP +10% (장거리 항해 내구)
  const attMul=1+(h.includes('H03')?0.15:0)+(h.includes('H06')?0.10:0);
  const intMul=1+(h.includes('H01')?0.25:0)+(h.includes('H06')?0.30:0);
  const tecMul=1+(h.includes('H07')?0.25:0);
  const hpMul =1+(h.includes('H08')?0.10:0);
  const shMul =1+(h.includes('H04')?0.15:0);
  return{attMul,intMul,tecMul,hpMul,shMul};
}
function getShipStats(s){
  const b=getPartBonus(s);const cb=getCrewBonus(s);
  // 탑승 크루 최고 등급으로 함선 성능 배율 결정 (영웅H→1.1배, 전설L/스토리S→1.2배)
  const _RORD={N:0,R:1,H:2,L:3,S:4};
  let _topR='N';
  (s.crewIds||[]).forEach(cid=>{
    const _c=G.crew.find(x=>x.id===cid)||(G.heroes||[]).map(h=>({...HEROES[h],id:h,rarity:'S'})).find(x=>x.id===cid);
    if(_c&&(_RORD[_c.rarity]||0)>(_RORD[_topR]||0))_topR=_c.rarity;
  });
  const hm=_topR==='S'||_topR==='L'?1.2:_topR==='H'?1.1:1.0;
  // 아르마다(H11) 보유 시 함대 전체 실드 +20%
  const hasArmada=G.fleet&&G.fleet.some(sh=>sh.id&&(sh.id.startsWith('H11')||(sh.catalogId||sh.catId)==='H11'));
  const armadaMult=hasArmada?1.2:1.0;
  // 영웅 전역 패시브
  const _hp=getHeroPassiveBonus();
  return{
    ATT:Math.round(((+s.ATT||0)+b.att+cb.att)*hm*_hp.attMul),
    INT:Math.round(((+s.INT||0)+b.int2+cb.int2)*hm*_hp.intMul),
    TEC:Math.round(((+s.TEC||0)+b.tec+cb.tec)*hm*_hp.tecMul),
    DEF:Math.round(((+s.DEF||0)+b.def+cb.def)*hm),
    HP:Math.round(((+s.maxHP||100)+b.hp+cb.hp)*hm*_hp.hpMul),
    maxSH:Math.round(((+s.maxSH||0)+b.sh+cb.sh)*hm*armadaMult*_hp.shMul)
  };
}
// 적대 행성 적 함대 생성 (startCombat과 브리핑에서 공용)
function _buildHostilePlanetEnemies(planetDef){
  const dm=getDiffMult(),danger=planetDef.ring||2,egm=getEarlyGameMult();
  const plv=calcPlayerLevel();
  const baseEC=Math.max(2,Math.min(G.fleet.length,6));
  const eCount=planetDef.hostile?Math.min(12,Math.round(baseEC*1.2*getDiffCountMult())):Math.min(8,Math.round(baseEC*getDiffCountMult()));
  const fp=calcFleetAvgPower();
  // 사용자 요청: 적대 행성 적함을 우리 함대 평균 대비 ring1=20% ~ ring6=40% 수준으로 (이전 34~50%).
  // 그리고 clampEnemyStats(0.20~0.40)로 한 번 더 안전망.
  const dangerMult=(0.20+(danger-1)*0.04);   // ring1=0.20, ring2=0.24, ..., ring6=0.40
  const _rawHP=Math.round(fp.hp*dangerMult*dm*egm);
  const _rawATK=Math.round(fp.atk*dangerMult*dm*egm);
  const _rawINT=Math.round(fp.atk*dangerMult*0.65*dm*egm);
  const _rawTEC=Math.round(fp.atk*dangerMult*0.70*dm*egm);
  const _clamped=clampEnemyStats(_rawHP,_rawATK,_rawINT,_rawTEC,fp);
  const eHP=_clamped.eHP,eATK=_clamped.eATK,eINT=_clamped.eINT,eTEC=_clamped.eTEC;
  const tierFn=(i)=>i===0&&plv>=60?'대형':i<2&&plv>=30?'중형':'소형';
  return Array.from({length:eCount},(_,i)=>({
    id:`E${i}`,nm:`치크스 ${['전투선','순양함','구축함','포함','강습함','모선'][i%6]}`,
    tier:tierFn(i),isEnemy:true,
    hp:Math.round(eHP*(i===0?1.3:1.0)),maxHP:Math.round(eHP*(i===0?1.3:1.0)),
    sh:Math.floor(eHP*(i===0?0.5:0.35)),maxSH:Math.floor(eHP*(i===0?0.5:0.35)),
    ATT:Math.round(eATK*(i===0?1.2:1.0)),INT:Math.round(eINT*(i===0?1.1:1.0)),
    TEC:eTEC,HP:eHP,LOY:50,parts:[],
    shieldTier:Math.min(20,Math.max(1,danger*3)),armorTier:Math.min(20,Math.max(1,danger*2))
  }));
}

// 적대 행성 진입 시 — 적 스펙 브리핑 팝업 → 전투 시작
function showHostilePlanetBriefing(planetDef){
  const enemies=_buildHostilePlanetEnemies(planetDef);
  planetDef._previewEnemies=enemies;
  const fp=calcFleetAvgPower();
  const totEnemyAtk=enemies.reduce((s,e)=>s+(e.ATT||0),0);
  const totFleetAtk=(G.fleet||[]).reduce((s,e)=>s+(getShipStats(e).ATT||0),0);
  const advisor=totFleetAtk>=totEnemyAtk*1.2?{c:'var(--green)',t:'유리 — 전력 우세'}
                :totFleetAtk>=totEnemyAtk*0.8?{c:'var(--yellow)',t:'대등 — 신중한 전투 필요'}
                :{c:'var(--red)',t:'불리 — 영웅·파츠 보강 권장'};
  openModal(`☠️ 적대 행성 진입 — ${planetDef.nm}`,
    `<div style="text-align:center;padding:10px 6px 6px">
      <div style="font-size:42px;margin-bottom:4px">⚠️</div>
      <div style="color:var(--red);font-size:18px;font-weight:bold;margin-bottom:4px">${planetDef.nm} — 적군 함대 포착</div>
      <div style="color:var(--dim);font-size:12px;line-height:1.7">
        링 ${planetDef.ring||2} · ${({easy:'쉬움',normal:'보통',hard:'어려움',extreme:'극악'})[G.difficulty]||'보통'} 난이도<br>
        <span style="color:${advisor.c};font-weight:bold">⚖️ 전력 평가: ${advisor.t}</span>
      </div>
    </div>
    ${_formatEnemyPreview(enemies)}
    <div style="text-align:center;font-size:12px;color:var(--yellow);margin-top:6px">승리 시 행성 정복 + 약탈금 | 패배 시 크레딧 -10%</div>
    <div style="text-align:center;font-size:12px;color:var(--cyan);margin-top:4px">${_baekguIcon(18)} 백구: "스펙 확인했지? ${advisor.t.includes('유리')?'밀어붙여!':advisor.t.includes('대등')?'한 방 한 방 신중하게!':'더 강해진 다음에 와도 늦지 않아!'}"</div>`,
    [
      {txt:'⚔️ 전투 시작!',fn:()=>{closeModal();startCombat(planetDef);},cls:'btn-red'},
      {txt:'🚀 후퇴 (다른 행성으로)',fn:()=>{closeModal();notify('🚀 후퇴 — 다른 행성으로 이동해 주세요','warn');baekgu('한발 물러섰어. 충분히 강해진 후 다시 도전해도 돼.');},cls:'btn-sm'}
    ],{wide:true}
  );
}

function startCombat(planetDef){
  const isBoss=planetDef.id==='BOSS';
  let enemies;
  if(isBoss){
    // 우르사 메이저 본체: 우리 함대 합산 전투력의 ~270% (현재 3배 강화)
    // baseline도 3배 강화: HP 10M→30M, ATT 6k→18k, SH 300k→900k
    // 함대 총 내구도(HP+SH) 기준으로 보스 HP 결정 → 강한 함대일수록 보스도 비례 강화
    const _fp=calcFleetTotalPower();
    const _BASE_HP=BOSS.maxHP*3;          // 30,000,000
    const _BASE_ATT=Math.round(BOSS.ATT*3); // 18,000
    const _BASE_SH=BOSS.maxSH*3;           // 900,000
    const _playerDur=_fp.hp+_fp.sh;
    const _scaleHP=Math.max(_BASE_HP,Math.round(_playerDur*2.7));   // 함대 총 내구도의 2.7배 (이전 0.9 → 3배)
    const _scaleATT=Math.max(_BASE_ATT,Math.round(_fp.atk*2.7));    // 함대 총 ATT의 2.7배
    const _scaleSH=Math.max(_BASE_SH,Math.round(_fp.sh*2.7));       // 함대 총 SH의 2.7배
    enemies=[{...BOSS,id:'BOSS_MAIN',isEnemy:true,
      hp:_scaleHP,maxHP:_scaleHP,HP:_scaleHP,
      sh:_scaleSH,maxSH:_scaleSH,
      ATT:_scaleATT,
      phase:1,_phaseAnn:0,shieldTier:20,armorTier:15}];
    if(typeof BOSS_ESCORT!=='undefined'){
      BOSS_ESCORT.forEach(esc=>enemies.push({...esc,shieldTier:10,armorTier:8}));
    }
  } else if(planetDef._previewEnemies){
    // 브리핑에서 미리 생성한 적 함대 재사용 (능력치 일관성 보장)
    enemies=planetDef._previewEnemies;
    delete planetDef._previewEnemies;
  } else {
    enemies=_buildHostilePlanetEnemies(planetDef);
  }
  const players=G.fleet.map(s=>{const st=getShipStats(s);const _wpn=PARTS.find(p=>p.cat==='weapon'&&(s.parts||[]).includes(p.id));const _wt=_wpn?(_wpn.tier||1):1;const _wtype=_wpn?(_wpn.wtype||'laser'):'laser';const _wrar=_wpn?(_wpn.rarity||''):'';const _shp=PARTS.find(p=>p.cat==='shield'&&(s.parts||[]).includes(p.id));const _shTier=_shp?(_shp.tier||0):0;const _arp=PARTS.find(p=>p.cat==='armor'&&(s.parts||[]).includes(p.id));const _arTier=_arp?(_arp.tier||0):0;return{...s,isEnemy:false,hp:s.hp,maxHP:st.HP,sh:s.sh,maxSH:st.maxSH,ATT:st.ATT,INT:st.INT,TEC:st.TEC,DEF:st.DEF||0,wtype:_wtype,wpnTier:_wt,wpnRarity:_wrar,shieldTier:_shTier,armorTier:_arTier};});
  combatState={players,enemies,turn:0,done:false,log:[],planetDef,isBoss,_rndSeed:Date.now()%9999,_entranceT:0,_entranceDone:false,_planetId:G.currentPlanet};
  renderCombatView(document.getElementById('hub-body'));
  setHubNav('combat');updateHUD();
  _cbEffects=[];_unitPos={};if(_cbAnimReq){cancelAnimationFrame(_cbAnimReq);_cbAnimReq=null;}
  combatState._sunsinUsed=false;
  // 함선 즉시 등장 (애니메이션 없음)
  combatState._entranceT=1;combatState._entranceDone=true;
  sfxAlert();try{AudioMgr.playBgm(isBoss?'boss':'combat');}catch(e){}
  _preloadCombatImages();requestAnimationFrame(()=>{initCombatCanvas();const t=document.getElementById('cb-title');if(t)t.textContent=`⚔️ ${isBoss?'우르사 메이저 최종전!':'전투'} — ${planetDef.nm}`;_cbStartAnimLoop();_updateCombatFleetStats();setTimeout(runCombatTurn,600);});
}
function renderCombatView(body){
  body.classList.add('cv');
  document.body.classList.add('combat-mode');  // 알림(notif) 위치 조정용
  body.innerHTML=`<div id="cb-hdr" style="height:44px;background:rgba(13,26,42,.97);border-bottom:1px solid var(--bdr);display:flex;align-items:center;justify-content:space-between;padding:0 14px;flex-shrink:0">
    <div id="cb-title" style="color:var(--yellow);font-weight:bold;font-size:16px">⚔️ 전투</div>
    <div id="cb-turn" style="color:var(--cyan);font-size:14px">TURN 0</div>
    <div id="cb-status" style="color:var(--dim);font-size:13px">준비 중...</div>
  </div>
  <div id="cb-fleet-stats" style="background:rgba(8,16,28,.96);border-bottom:1px solid var(--bdr);padding:6px 14px;flex-shrink:0;display:grid;grid-template-columns:1fr 1fr;gap:14px;font-size:11px;font-family:Courier New,monospace">
    <div id="cb-fleet-pl" style="color:var(--cyan)">⚓ 아군: 측정 중...</div>
    <div id="cb-fleet-en" style="color:#ff8888;text-align:right">☠️ 적군: 측정 중...</div>
  </div>
  <div id="cb-arena" style="flex:1;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;background:#050a1a"><canvas id="cb-cv"></canvas></div>
  <div id="cb-log" class="cb-log" style="height:85px;background:rgba(13,26,42,.98);border-top:1px solid var(--bdr);padding:8px 14px;overflow-y:auto;flex-shrink:0;font-size:13px;line-height:1.7"></div>`;
}
let cbCtx,cbCV,cbZoom=1.0,cbOffX=0,cbOffY=0,cbPan=false,cbPanLx=0,cbPanLy=0;
function initCombatCanvas(){
  cbCV=document.getElementById('cb-cv');if(!cbCV)return;
  const arena=document.getElementById('cb-arena');
  const aw=arena?arena.clientWidth:800,ah=arena?arena.clientHeight:400;
  cbCV.width=Math.max(aw,400);cbCV.height=Math.max(ah,300);
  cbCtx=cbCV.getContext('2d');
  cbZoom=1.0;cbOffX=0;cbOffY=0;
  // 마우스 휠: 줌
  cbCV.onwheel=e=>{e.preventDefault();cbZoom=Math.max(0.3,Math.min(4,cbZoom+(e.deltaY<0?.12:-.12)));drawCombatFrame();};
  // 좌클릭 드래그: 이동
  cbCV.onmousedown=e=>{if(e.button===0){cbPan=true;cbPanLx=e.clientX;cbPanLy=e.clientY;}};
  cbCV.onmousemove=e=>{if(!cbPan)return;cbOffX+=e.clientX-cbPanLx;cbOffY+=e.clientY-cbPanLy;cbPanLx=e.clientX;cbPanLy=e.clientY;drawCombatFrame();};
  cbCV.onmouseup=e=>{if(e.button===0)cbPan=false;};
  cbCV.onmouseleave=()=>{cbPan=false;};
  cbCV.oncontextmenu=e=>e.preventDefault();
  // 터치: 핀치 줌 + 이동
  let cbTouches=[];
  cbCV.addEventListener('touchstart',e=>{e.preventDefault();cbTouches=[...e.touches];},{passive:false});
  cbCV.addEventListener('touchmove',e=>{
    e.preventDefault();
    if(e.touches.length===1&&cbTouches.length>=1){
      cbOffX+=e.touches[0].clientX-cbTouches[0].clientX;cbOffY+=e.touches[0].clientY-cbTouches[0].clientY;
      drawCombatFrame();
    } else if(e.touches.length===2&&cbTouches.length>=2){
      const d0=Math.hypot(cbTouches[0].clientX-cbTouches[1].clientX,cbTouches[0].clientY-cbTouches[1].clientY);
      const d1=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
      if(d0>0)cbZoom=Math.max(0.3,Math.min(4,cbZoom*(d1/d0)));drawCombatFrame();
    }
    cbTouches=[...e.touches];
  },{passive:false});
  cbCV.addEventListener('touchend',e=>{cbTouches=[];},{passive:false});
  // 전투 헤더에 줌 버튼 추가
  const hdr=document.getElementById('cb-hdr');
  if(hdr&&!document.getElementById('cb-zoom-btns')){
    const btns=document.createElement('div');btns.id='cb-zoom-btns';
    btns.style.cssText='display:flex;gap:4px;align-items:center';
    btns.innerHTML=`<span style="font-size:11px;color:var(--muted)">🖱️좌드래그=이동|휠=줌</span>
      <button class="btn btn-sm" onclick="cbZoom=Math.max(0.3,cbZoom-.15);drawCombatFrame()" style="padding:2px 7px;font-size:13px">−</button>
      <button class="btn btn-sm" onclick="cbZoom=1;cbOffX=0;cbOffY=0;drawCombatFrame()" style="padding:2px 7px;font-size:12px">⌂</button>
      <button class="btn btn-sm" onclick="cbZoom=Math.min(4,cbZoom+.15);drawCombatFrame()" style="padding:2px 7px;font-size:13px">+</button>`;
    hdr.insertBefore(btns,hdr.children[1]);
  // 이순신 일점사 전술 버튼 (H01 영입 시만 표시)
  if(G.heroes.includes('H01')&&!document.getElementById('cb-sunsin-btn')){
    const sbtn=document.createElement('button');sbtn.id='cb-sunsin-btn';
    sbtn.className='btn btn-sm';
    sbtn.style.cssText='padding:3px 10px;font-size:13px;border-color:var(--red);color:var(--red);background:rgba(255,60,60,.08);animation:pulse 2s infinite';
    sbtn.textContent='⚔️ 일점사';
    sbtn.title='이순신 제독 전술: 전 함대 화력 집중으로 적함 1척 즉시 격파 (전투 1회)';
    sbtn.onclick=activateSunsinFocus;
    hdr.appendChild(sbtn);
  }
  }
  drawCombatFrame();
}
// ── 전투 이미지 캐시 (PNG 교체 구조) ──────────────────────────────
// PNG 파일 위치: img/combat/ships/{catalogId}.png  (플레이어 함선)
//                img/combat/enemies/{enemyType}.png (적 함선)
// PNG 없으면 벡터 폴백으로 자동 전환
// 전투 이미지 캐시: LRU 상한으로 메모리 누수 방지 (장시간 플레이 시 다운 예방)
const _CB_IMG_CACHE_MAX=128;
const _cbImgCacheMap=new Map();   // 실제 LRU 순서 보존용
const _cbImgCache=new Proxy({},{   // 기존 코드 호환 (cache[src] 형태로 접근)
  get(_,k){return _cbImgCacheMap.get(k);},
  set(_,k,v){_cbImgCacheMap.delete(k);_cbImgCacheMap.set(k,v);_cbCacheEvict();return true;},
  has(_,k){return _cbImgCacheMap.has(k);},
  deleteProperty(_,k){return _cbImgCacheMap.delete(k);},
  ownKeys(){return [..._cbImgCacheMap.keys()];},
  getOwnPropertyDescriptor(_,k){return _cbImgCacheMap.has(k)?{enumerable:true,configurable:true,value:_cbImgCacheMap.get(k)}:undefined;}
});
function _cbCacheEvict(){
  while(_cbImgCacheMap.size>_CB_IMG_CACHE_MAX){
    const oldest=_cbImgCacheMap.keys().next().value;
    if(oldest===undefined)break;
    _cbImgCacheMap.delete(oldest);
  }
}
function _cbCacheClear(){_cbImgCacheMap.clear();}
// 전투 함선 이미지 경로 계산 — _drawShipUnit과 preload가 공유.
// case-insensitive 탐지 + 이름 기반 보강으로 catalogId 누락/대소문자 다양성에도 견고.
function _combatShipImgSrc(u){
  const _TIER={'소형':'S','중형':'M','대형':'L','전설기함':'L','신화':'L'};
  const _tierKey=t=>_TIER[t||'소형']||'S';
  const isEnemy=!!u.isEnemy;
  const sid=String(u.id||'');
  const nmLow=String(u.nm||'').toLowerCase();
  const catId=sid.replace(/_.*$/,'').toUpperCase();
  // 이름 기반 팩션 추정 (catalogId/id 누락 대비)
  const isChixName=nmLow.includes('치크스')||nmLow.includes('chix');
  const isPirateName=nmLow.includes('해적')||nmLow.includes('pirate');
  const isDbrpName=nmLow.includes('잔해')||nmLow.includes('dbrp');
  if(isEnemy){
    const isBoss=catId.startsWith('BOSS')||catId==='URSA'||nmLow.includes('우르사');
    if(isBoss)return 'img/combat/enemies/Boss.png';
    // 히든 보이드 보스 — 팔콘 스카우트 전용 이미지 (S10.png)
    if(u.voidBoss||catId.startsWith('VOID')||catId.startsWith('FALCON')||nmLow.includes('팔콘'))return 'img/ships/S10.png';
    const base=catId.startsWith('CHIX')||/^E\d/.test(catId)||isChixName?'CHIX':
               isDbrpName?'DBRP':'PIRATE';
    return 'img/combat/enemies/'+base+'_'+_tierKey(u.tier)+'.png';
  }
  // 플레이어: catalogId > catId > id (모두 대문자화)
  const cid=String(u.catalogId||u.catId||u.id||'').replace(/_.*$/,'').toUpperCase();
  // 보스 본체/나포
  if(cid==='URSA'||sid.startsWith('BOSS_URSA')||cid==='BOSS'||sid==='BOSS_MAIN')return 'img/combat/ships/Boss.png';
  // 나포 함선 (CAP_xxx)
  if(cid==='CAP'){
    const _capFac=isChixName?'CHIX':isDbrpName?'DBRP':'PIRATE';
    return 'img/combat/ships/'+_capFac+'_'+_tierKey(u.tier)+'.png';
  }
  // 히든 팔콘
  if(cid==='HIDDEN'||sid.startsWith('HIDDEN_FALCON')||u._isHiddenFalcon)return 'img/combat/ships/Boss.png';
  // 치크스 노획 함선 — catalogId='CHIX_S/M/L' → cid='CHIX', 또는 이름에 '치크스'
  if(cid==='CHIX'||cid.startsWith('CHIX')||isChixName){
    return 'img/combat/ships/CHIX_'+_tierKey(u.tier)+'.png';
  }
  // 일반 카탈로그 함선 — 원본 catalogId 그대로 (대문자 변환 전 값 우선)
  const cidRaw=String(u.catalogId||u.catId||u.id||'').replace(/_.*$/,'');
  return 'img/combat/ships/'+(cidRaw||'S01')+'.png';
}
// 전투 시작 전 이미지 프리로드 (초기 렌더링에 PNG 즉시 표시)
function _preloadCombatImages(){
  // 로드 완료 시 캔버스 갱신 (이미지 로드 후 벡터→PNG로 전환)
  let _pendingRedraws=0;
  const _onImgLoad=()=>{_pendingRedraws++;if(_pendingRedraws===1)setTimeout(()=>{_pendingRedraws=0;if(typeof drawCombatFrame==='function')drawCombatFrame();},80);};
  const factions=['CHIX','PIRATE','DBRP'];const sizes=['S','M','L'];
  // 적 측: 모든 팩션+사이즈 + 보스
  factions.forEach(f=>sizes.forEach(s=>_loadCombatImg('img/combat/enemies/'+f+'_'+s+'.png',_onImgLoad)));
  _loadCombatImg('img/combat/enemies/Boss.png',_onImgLoad);
  // 플레이어 함선: 실제 draw 경로와 동일한 helper로 경로 산출하여 정확히 일치하는 파일을 프리로드
  if(G&&G.fleet){
    const _seen=new Set();
    G.fleet.forEach(sh=>{
      const src=_combatShipImgSrc({...sh,isEnemy:false});
      if(src&&!_seen.has(src)){_seen.add(src);_loadCombatImg(src,_onImgLoad);}
    });
  }
}
const _mapImgCache={};
function _loadMapImg(src,onLoad){
  if(_mapImgCache[src]!==undefined) return _mapImgCache[src];
  const img=new Image();
  img.onload=()=>{_mapImgCache[src]=img;if(onLoad)onLoad();};
  img.onerror=()=>{_mapImgCache[src]=null;};
  img.src=src;
  _mapImgCache[src]=img;
  return img;
}
function _loadCombatImg(src,onLoad){
  if(_cbImgCache[src]==='ERR') return null;
  if(_cbImgCache[src]) return _cbImgCache[src];
  const img=new Image();
  img.onload=()=>{_cbImgCache[src]=img;if(onLoad)onLoad();};
  img.onerror=()=>{_cbImgCache[src]='ERR';}; // ERR sentinel — prevents infinite retry
  img.src=src;
  _cbImgCache[src]=img; // store pending Image (check .complete to know if loaded)
  return img;
}

// 함선 등급에 따른 표시 크기 (소형→전설 시각적 차이를 크게)
function _shipDrawSize(u){
  const tier=u.tier||(u.isEnemy?'소형':'소형');
  // 아군 대형 이상 함선(대형/전설기함/신화) 10% 확대 (배치 간격은 그대로)
  // 소형 기준: 중형 ×1.5, 대형/전설기함 ×2 → 전체 ×0.8
  if(tier==='신화') return{w:246,h:152,bar:264,label:15,gap:640};
  if(tier==='전설기함') return{w:229,h:136,bar:240,label:14,gap:600};
  if(tier==='대형'||u.id==='BOSS_MAIN') return{w:158,h:97,bar:176,label:12,gap:480};
  if(tier==='중형') return{w:86,h:53,bar:112,label:11,gap:300};
  return{w:54,h:33,bar:70,label:10,gap:210};
}
// 적 함선 크기 — 아군과 동일 비율 적용
function _enemySize(u){
  const nm=u.nm||'',tier=u.tier||'소형';
  // 우르사 메이저 보스 본체: 다른 적함의 약 3배 크기 (압도적 기함 연출)
  if(u.id==='BOSS_MAIN'||nm.includes('우르사')) return{w:756,h:459,bar:480,label:22,gap:2000};
  // 일반 해적 모선
  if(nm.includes('모선')) return{w:252,h:153,bar:324,label:16,gap:700};
  if(tier==='신화') return{w:224,h:138,bar:264,label:15,gap:640};
  if(tier==='전설기함') return{w:208,h:124,bar:240,label:14,gap:600};
  if(tier==='대형') return{w:144,h:88,bar:176,label:12,gap:480};
  if(tier==='중형'||nm.includes('포함')||nm.includes('순양함')||nm.includes('전투함')||nm.includes('구축함')) return{w:86,h:53,bar:112,label:11,gap:300};
  return{w:54,h:33,bar:70,label:10,gap:210};
}

// 벡터 함선 그리기 — 플레이어는 오른쪽 방향(→), 적은 왼쪽 방향(←)
function _drawShipVector(ctx,x,y,sz,isEnemy,col,alpha){
  const w=sz.w,h=sz.h;
  ctx.globalAlpha=alpha;
  // 기체 그라데이션
  const grd=isEnemy?
    ctx.createLinearGradient(x+w,y-h,x-w,y+h):
    ctx.createLinearGradient(x-w,y-h,x+w,y+h);
  grd.addColorStop(0,col);grd.addColorStop(1,'rgba(0,0,0,.4)');
  ctx.fillStyle=grd;
  ctx.beginPath();
  if(!isEnemy){
    // 플레이어: 오른쪽 향함 (노즈 → 오른쪽)
    ctx.moveTo(x+w,y);           // 노즈 (우)
    ctx.lineTo(x-w*.4,y-h);      // 상단 날개
    ctx.lineTo(x-w*.6,y-h*.3);   // 상단 엔진
    ctx.lineTo(x-w,y);           // 후미 중앙
    ctx.lineTo(x-w*.6,y+h*.3);   // 하단 엔진
    ctx.lineTo(x-w*.4,y+h);      // 하단 날개
  } else {
    // 적: 왼쪽 향함 (노즈 → 왼쪽)
    ctx.moveTo(x-w,y);           // 노즈 (좌)
    ctx.lineTo(x+w*.4,y-h);      // 상단 날개
    ctx.lineTo(x+w*.6,y-h*.3);   // 상단 엔진
    ctx.lineTo(x+w,y);           // 후미 중앙
    ctx.lineTo(x+w*.6,y+h*.3);   // 하단 엔진
    ctx.lineTo(x+w*.4,y+h);      // 하단 날개
  }
  ctx.closePath();ctx.fill();
  // 외곽선
  ctx.strokeStyle=isEnemy?'#cc00ff':'#00f3ff';
  ctx.lineWidth=1.5;ctx.stroke();
  // 엔진 글로우 (후미)
  const ex=isEnemy?x+w*.9:x-w*.9;
  const glow=ctx.createRadialGradient(ex,y,1,ex,y,h*.8);
  glow.addColorStop(0,isEnemy?'rgba(200,0,255,.5)':'rgba(0,243,255,.5)');
  glow.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=glow;ctx.beginPath();ctx.arc(ex,y,h*.8,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=1;
}

// PNG 있으면 PNG, 없으면 벡터 폴백
function _drawShipUnit(ctx,u,x,y,sz){
  const alpha=u.hp>0?1:.22;
  const isEnemy=u.isEnemy;
  const imgSrc=_combatShipImgSrc(u);
  const dsz=isEnemy?_enemySize(u):_shipDrawSize(u);
  const col=isEnemy?'#cc44ff':'#00ccff';
  const cached=_cbImgCache[imgSrc];
  if(cached&&cached!=='ERR'&&cached.complete&&cached.naturalWidth>0){
    ctx.save();
    ctx.globalAlpha=alpha;
    // 자연 비율 유지: 높이 기준으로 스케일, 최대 너비 dsz.w*2.8 제한
    const nat=cached.naturalWidth/Math.max(1,cached.naturalHeight);
    const dh=dsz.h*2;
    const dw=Math.min(dsz.w*2.8, dh*nat);
    if(isEnemy){
      // 적 함선: 수평 미러 (왼쪽을 향하게)
      ctx.translate(x,y);
      ctx.scale(-1,1);
      ctx.drawImage(cached,-dw/2,-dh/2,dw,dh);
    } else {
      ctx.drawImage(cached,x-dw/2,y-dh/2,dw,dh);
    }
    ctx.restore();
  } else {
    _drawShipVector(ctx,x,y,dsz,isEnemy,col,alpha);
    if(!cached)_loadCombatImg(imgSrc,function(){if(typeof drawCombatFrame==='function')drawCombatFrame();});
  }
  // 쉴드 오라: SH>0이고 살아있는 함선만. SH%에 따라 강도 조절 + 미세 펄스.
  // 함선 외곽선 살짝 바깥 (1.1/1.05) — 가시성 확보
  if(u.hp>0&&(u.sh||0)>0&&(u.maxSH||0)>0){
    const shR=Math.max(0.1,Math.min(1,(u.sh||0)/(u.maxSH||1)));
    const pulse=0.85+0.15*Math.sin(Date.now()*0.005);
    const rx=dsz.w*1.1, ry=dsz.h*1.05;
    ctx.save();
    ctx.translate(x,y);
    // 외곽 글로우 (보이도록 적당히 강하게)
    ctx.globalAlpha=0.18*shR*pulse;
    ctx.fillStyle='#66ddff';
    ctx.shadowColor='#66ddff';ctx.shadowBlur=14;
    ctx.beginPath();ctx.ellipse(0,0,rx*1.04,ry*1.04,0,0,Math.PI*2);ctx.fill();
    // 외곽 라인
    ctx.globalAlpha=0.55*shR*pulse;
    ctx.strokeStyle='#9ee7ff';
    ctx.lineWidth=1.6;
    ctx.shadowBlur=8;
    ctx.beginPath();ctx.ellipse(0,0,rx,ry,0,0,Math.PI*2);ctx.stroke();
    ctx.restore();
  }
}
// ═══ 누락 함수 복구 패치 ════════════════════════════════════════════

// ── 전투 상태 변수 ────────────────────────────────────────────────
let _cbEffects=[];  // [{type,...}] beam / exp / shard / shockwave / muzzle
let _unitPos={};    // {unitId: {x,y}}
let _cbAnimReq=null;

// 전투 중이거나 이펙트가 살아있는 동안 60fps 루프로 캔버스 재그리기.
// (쉴드 오라 펄스 + 이펙트 페이드를 위해 전투 중에는 계속 돌림.)
function _cbStartAnimLoop(){
  if(_cbAnimReq)return; // 이미 루프 중
  const tick=()=>{
    if(!cbCtx||!cbCV){_cbAnimReq=null;return;}
    drawCombatFrame();
    if((combatState&&!combatState.done)||(_cbEffects||[]).length>0){
      _cbAnimReq=requestAnimationFrame(tick);
    } else {
      _cbAnimReq=null;
    }
  };
  _cbAnimReq=requestAnimationFrame(tick);
}

// 빔 한 발 + 피격 + (필요 시) 격침 폭발/파편
// delay: 발사 시작까지 대기 프레임 수 (순차 발사용)
// wasShielded: 피격 시점에 타겟의 쉴드가 살아있었는지 (true면 헥사 임팩트)
function _cbAddBeamAndHit(a1,a2,beamCol,isDead,delay,wasShielded){
  delay=delay||0;
  // 발사 사운드 (delay 프레임 후, 1프레임≈16ms)
  setTimeout(()=>{try{AudioMgr.playSfx('laser_fire',{vol:0.55,cooldown:40});}catch(e){}},delay*16);
  // 피격 사운드: 빔 도달 시점(delay+3프레임), 쉴드 vs 폭발
  const hitMs=(delay+3)*16;
  if(wasShielded){setTimeout(()=>{try{AudioMgr.playSfx('shield_hit',{vol:0.55,cooldown:40});}catch(e){}},hitMs);}
  if(isDead){setTimeout(()=>{try{AudioMgr.playSfx('explosion',{vol:0.75,cooldown:80});}catch(e){}},(delay+5)*16);}
  // 아군 레이저 두께 배율 — 특수공격 단계마다 ×1.5씩 누적
  // 일점사 ×1.5, 학익진 ×2.25, 시간차 ×3.38, 테슬라 ×5.06, 제네시스 ×7.59, 데스티네이션 ×11.39
  // ※ 아군 색상: 평시 #00f3ff (청록), 데스티네이션 발동 시 #ff44ff (핑크/퍼플)
  const _isPlayerBeam=combatState&&(beamCol==='#00f3ff'||beamCol==='#ff44ff');
  let thickMul=1;
  if(_isPlayerBeam){
    if(combatState._sunsinUsed)     thickMul*=1.5;
    if(combatState._haikjinUsed)    thickMul*=1.5;
    if(combatState._einsteinUsed)   thickMul*=1.5;
    if(combatState._teslaUsed)      thickMul*=1.5;
    if(combatState._genesisUsed)    thickMul*=1.5;
    if(combatState._destinationUsed)thickMul*=1.5;
  }
  // 1) 머즐 플래시 (두께 배율에 맞춰 플래시도 확장)
  _cbEffects.push({type:'muzzle',x:a1.x,y:a1.y,col:beamCol,r:8*Math.min(4,Math.sqrt(thickMul)),life:8,maxLife:8,delay:delay});
  // 2) 레이저 빔 — 테슬라 초공간 발동 이후 아군 공격은 번개(lightning)로 시각화
  const _useLightning=combatState&&combatState._teslaUsed&&_isPlayerBeam;
  if(_useLightning){
    // 번개: 지그재그 코어 + 양 옆 가지(fork) 분기
    _cbEffects.push({type:'lightning',x1:a1.x,y1:a1.y,x2:a2.x,y2:a2.y,col:beamCol,life:14,maxLife:14,delay:delay,thickMul:thickMul,seed:Math.random()*9999});
  } else {
    _cbEffects.push({type:'beam',x1:a1.x,y1:a1.y,x2:a2.x,y2:a2.y,col:beamCol,life:18,maxLife:18,delay:delay,thickMul:thickMul});
  }
  // 3) 쉴드 피격 헥사 플래시 (쉴드가 살아있을 때만)
  if(wasShielded){
    _cbEffects.push({type:'shieldHit',x:a2.x,y:a2.y,col:'#66ddff',r:26,life:16,maxLife:16,delay:delay+3});
  }
  // 4) 선체 피격 폭발 (쉴드가 뚫렸을 때 강도↑)
  const expCol=isDead?'#ff3300':(wasShielded?'#ffaa66':'#ff7755');
  const expR=isDead?28:(wasShielded?12:18);
  _cbEffects.push({type:'exp',x:a2.x,y:a2.y,col:expCol,r:expR,life:isDead?36:24,maxLife:isDead?36:24,delay:delay+4});
  if(isDead){
    _cbEffects.push({type:'shockwave',x:a2.x,y:a2.y,col:'#ffaa44',r:50,life:30,maxLife:30,delay:delay+4});
    _cbEffects.push({type:'exp',x:a2.x,y:a2.y,col:'#ffffff',r:14,life:14,maxLife:14,delay:delay+4});
    for(let i=0;i<10;i++){
      const ang=(Math.PI*2*i)/10 + Math.random()*0.3;
      _cbEffects.push({type:'shard',x:a2.x,y:a2.y,vx:Math.cos(ang)*3.8,vy:Math.sin(ang)*3.8,col:'#ffcc66',life:42,maxLife:42,delay:delay+4});
    }
  }
  _cbStartAnimLoop();
}

// 미사일 살보 (최대 13발). 각 미사일은 곡선 궤적으로 날아가 타겟에서 폭발.
// count: 1~13, 자동으로 클램프됨
function _cbAddMissileSalvo(a1,a2,salvoCol,isDead,count,baseDelay,wasShielded,sizeMul){
  count=Math.max(1,Math.min(13,count|0));
  baseDelay=baseDelay||0;
  sizeMul=Math.max(1,sizeMul||1);
  // 살보 발사 사운드 (한 번)
  setTimeout(()=>{try{AudioMgr.playSfx('missile',{vol:0.6,cooldown:60});}catch(e){}},baseDelay*16);
  // 미사일은 약 60프레임에 걸쳐 도달 → 살보의 마지막이 도착하는 시점에 충돌 sfx
  const lastImpactMs=(baseDelay + (count-1)*3 + 50)*16;
  if(wasShielded){setTimeout(()=>{try{AudioMgr.playSfx('shield_hit',{vol:0.6,cooldown:80});}catch(e){}},lastImpactMs);}
  if(isDead){setTimeout(()=>{try{AudioMgr.playSfx('explosion',{vol:0.8,cooldown:80});}catch(e){}},lastImpactMs+50);}
  for(let i=0;i<count;i++){
    const stagger=baseDelay + i*3; // 미사일 사이 3프레임 간격
    // 약간씩 다른 곡률(미사일이 부채꼴로 퍼져 날아가게)
    const spread=(i-(count-1)/2)*8;
    const midx=(a1.x+a2.x)/2 + spread;
    const midy=(a1.y+a2.y)/2 - 60 - Math.abs(spread)*0.4; // 위로 호 형성
    const isLast=(i===count-1);
    // 발사 머즐 (크기 배율 적용)
    _cbEffects.push({type:'muzzle',x:a1.x,y:a1.y,col:salvoCol,r:6*sizeMul,life:6,maxLife:6,delay:stagger});
    // 미사일 본체 (크기 배율 sizeMul 적용)
    _cbEffects.push({
      type:'missile', x1:a1.x,y1:a1.y, x2:a2.x,y2:a2.y, ctrlx:midx,ctrly:midy,
      t:0, speed:0.045, col:salvoCol, life:60, maxLife:60, delay:stagger,
      isLastInSalvo:isLast, isDead:isDead, wasShielded:wasShielded, sizeMul:sizeMul
    });
  }
  _cbStartAnimLoop();
}

// ── 전투 로그 ────────────────────────────────────────────────────
function addCombatLog(msg,cls){
  if(!combatState)return;
  combatState.log.push({msg,cls});
  const el=document.getElementById('cb-log');
  if(!el)return;
  const div=document.createElement('div');
  div.style.cssText=cls==='err'?'color:#ff6b6b':cls==='ok'?'color:#51cf66':cls==='gold'?'color:#ffd43b':cls===''?'color:#adb5bd':'color:#dee2e6';
  div.textContent=msg;
  el.appendChild(div);
  el.scrollTop=el.scrollHeight;
}

// ── 오디오 매니저 (BGM + SFX) ────────────────────────────────────
window.AudioMgr=(function(){
  const SFX_BASE='02_Assets/audio/sfx/';
  const BGM_BASE='02_Assets/audio/bgm/';
  let masterVol=0.7,bgmVol=0.6,sfxVol=0.8;
  let bgmOff=false,sfxOff=false; // 개별 끄기 토글
  try{
    const s=JSON.parse(localStorage.getItem('de_audio_settings')||'{}');
    if(typeof s.master==='number')masterVol=s.master;
    if(typeof s.bgm==='number')bgmVol=s.bgm;
    if(typeof s.sfx==='number')sfxVol=s.sfx;
    if(typeof s.bgmOff==='boolean')bgmOff=s.bgmOff;
    if(typeof s.sfxOff==='boolean')sfxOff=s.sfxOff;
    // 구버전 호환: muted 플래그가 있으면 BGM/SFX 모두 켜기
    if(typeof s.muted==='boolean'&&s.muted){bgmOff=true;sfxOff=true;}
  }catch(e){}
  function save(){try{localStorage.setItem('de_audio_settings',JSON.stringify({master:masterVol,bgm:bgmVol,sfx:sfxVol,bgmOff,sfxOff}));}catch(e){}}
  let curBgmName=null,curBgmAudio=null,userInteracted=false,pendingBgm=null;
  function _onInteract(){
    if(userInteracted)return;
    userInteracted=true;
    if(pendingBgm){playBgm(pendingBgm);pendingBgm=null;}
    else if(curBgmAudio&&curBgmAudio.paused&&!bgmOff)curBgmAudio.play().catch(()=>{});
  }
  ['click','keydown','touchstart','pointerdown'].forEach(ev=>{
    document.addEventListener(ev,_onInteract,{capture:true,passive:true});
  });
  function _bgmTargetVol(){return bgmOff?0:masterVol*bgmVol;}
  function playBgm(name){
    if(!name){stopBgm();return;}
    if(bgmOff){
      // BGM 꺼진 상태: 곡 이름만 기억해 두고 재생하지 않음
      if(curBgmAudio){try{curBgmAudio.pause();curBgmAudio.src='';}catch(e){}curBgmAudio=null;}
      curBgmName=name;return;
    }
    if(!userInteracted){pendingBgm=name;curBgmName=name;return;}
    if(curBgmName===name&&curBgmAudio&&!curBgmAudio.paused)return;
    // 이전 BGM은 즉시 무음화 + 정지 후 새 BGM 시작 → 행성 BGM과 전투 BGM이 겹치지 않음
    if(curBgmAudio){
      const old=curBgmAudio;
      try{old.volume=0;old.pause();old.src='';}catch(e){}
    }
    curBgmAudio=null;
    curBgmName=name;
    // BGM 캐시 버스터: 게임 버전과 함께 fetch — Firebase mp3 캐시(24h)가 옛 버전 잡고 있을 때 강제 갱신
    const _bgmVer=(typeof window!=='undefined'&&window._GAME_VER)?window._GAME_VER:'';
    const a=new Audio(BGM_BASE+name+'.mp3'+(_bgmVer?'?v='+encodeURIComponent(_bgmVer):''));
    a.loop=true;a.volume=0;
    curBgmAudio=a;
    a.play().then(()=>{
      let st=0;const target=_bgmTargetVol();
      const fadeIn=setInterval(()=>{st++;if(!curBgmAudio||curBgmAudio!==a){clearInterval(fadeIn);return;}a.volume=Math.min(target,target*(st/8));if(st>=8)clearInterval(fadeIn);},40);
    }).catch(e=>{console.warn('[BGM] play failed',name,e.message);});
  }
  function stopBgm(){if(curBgmAudio){try{curBgmAudio.pause();curBgmAudio.src='';}catch(e){}}curBgmAudio=null;curBgmName=null;pendingBgm=null;}
  const sfxCooldown={};
  function playSfx(name,opts){
    opts=opts||{};
    if(sfxOff||masterVol<=0||sfxVol<=0)return;
    if(!userInteracted)return;
    const cd=opts.cooldown||0;
    if(cd>0){const now=performance.now();if(sfxCooldown[name]&&now-sfxCooldown[name]<cd)return;sfxCooldown[name]=now;}
    try{
      const a=new Audio(SFX_BASE+name+'.mp3');
      a.volume=Math.min(1,(opts.vol||1)*masterVol*sfxVol);
      a.play().catch(()=>{});
    }catch(e){}
  }
  function setMaster(v){masterVol=Math.max(0,Math.min(1,+v||0));if(curBgmAudio)curBgmAudio.volume=_bgmTargetVol();save();}
  function setBgmVol(v){bgmVol=Math.max(0,Math.min(1,+v||0));if(curBgmAudio)curBgmAudio.volume=_bgmTargetVol();save();}
  function setSfxVol(v){sfxVol=Math.max(0,Math.min(1,+v||0));save();}
  function setBgmOff(off){
    bgmOff=!!off;save();
    if(bgmOff){
      // 끄기: 즉시 정지
      if(curBgmAudio){try{curBgmAudio.pause();}catch(e){}}
    } else {
      // 켜기: 마지막 BGM 곡 재생
      if(curBgmName){
        const name=curBgmName;
        if(curBgmAudio&&curBgmAudio.src&&curBgmAudio.src.indexOf(name)>=0){
          curBgmAudio.volume=_bgmTargetVol();
          curBgmAudio.play().catch(()=>{});
        } else {
          // 새로 재생
          curBgmName=null; // playBgm이 변화 감지하도록
          playBgm(name);
        }
      }
    }
  }
  function setSfxOff(off){sfxOff=!!off;save();}
  // 구버전 호환
  function setMuted(m){setBgmOff(m);setSfxOff(m);}
  return{
    playBgm,stopBgm,playSfx,setMaster,setBgmVol,setSfxVol,setBgmOff,setSfxOff,setMuted,
    get curBgm(){return curBgmName;},
    get master(){return masterVol;},get bgm(){return bgmVol;},get sfx(){return sfxVol;},
    get bgmOff(){return bgmOff;},get sfxOff(){return sfxOff;},
    get muted(){return bgmOff&&sfxOff;}
  };
})();

// 행성 BGM: P0X.mp3 가 있으면 해당 곡, 없으면 hub.mp3
function _planetBgmName(pid){
  // P17은 파일이 누락되어 hub 폴백
  if(!pid||pid==='P17')return 'hub';
  if(/^P\d+$/.test(pid))return pid;
  return 'hub';
}

// 사운드 알림 (전투 진입/긴급 알림)
function sfxAlert(){AudioMgr.playSfx('notify',{cooldown:300});}

// ══════════════════════════════════════════════════════════════════
// 획득 보고 팝업 헬퍼 — 전투/가챠/퀘스트 공용
//   showAcquisitionReport({title, subtitle, items, color, sfx, congrats})
//   items: [{ic, nm, type, rarity, desc, color, badge}]
// ══════════════════════════════════════════════════════════════════
const RARITY_LABEL_KR={N:'일반',R:'희귀',H:'영웅',L:'전설',S:'스토리',legend:'전설',mythic:'신화',set:'세트',hero:'영웅'};
const RARITY_COLOR={N:'#888',R:'var(--blue)',H:'var(--purple)',L:'var(--gold)',S:'#ff6ec7',legend:'var(--gold)',mythic:'#ff88ff',set:'#c080ff',hero:'var(--purple)'};
function showAcquisitionReport(opts){
  opts=opts||{};
  const title=opts.title||'🎁 획득 보고';
  const subtitle=opts.subtitle||'';
  const items=opts.items||[];
  const headerColor=opts.color||'var(--gold)';
  const congrats=opts.congrats||'';
  // 효과음 (지정 안 하면 notify)
  try{AudioMgr.playSfx(opts.sfx||'notify',{cooldown:80});}catch(e){}
  const escapeHtml=s=>String(s||'').replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'})[c]);
  // 항목 수에 따른 컴팩트 모드: 5개 이상이면 더 빽빽하게, 2열 그리드 사용
  const _many=items.length>=5;
  const _icSz=_many?40:48;
  const _icFont=_many?22:28;
  const _padRow=_many?'5px 8px':'7px 9px';
  const _gapRow=_many?'8px':'10px';
  const _nmFs=_many?12:13;
  const _typeFs=_many?10:11;
  const _statsFs=_many?11:12;
  const _descFs=_many?10:11;
  const itemRows=items.map(it=>{
    const rc=it.color||RARITY_COLOR[it.rarity]||'var(--txt)';
    const rl=RARITY_LABEL_KR[it.rarity]||'';
    const badge=it.badge||(rl?`<span style="font-size:9px;color:${rc};border:1px solid ${rc};border-radius:3px;padding:0 5px;margin-left:5px">${rl}</span>`:'');
    const ic=it.ic||'📦';
    const imgHtml=it.img
      ? `<div style="width:${_icSz}px;height:${_icSz}px;border-radius:6px;border:1.5px solid ${rc};overflow:hidden;flex-shrink:0;background:rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center">${imgOrEmoji(it.img,ic,_icSz-4,_icSz-4,'object-fit:cover')}</div>`
      : `<div style="width:${_icSz}px;height:${_icSz}px;border-radius:6px;border:1.5px solid ${rc};display:flex;align-items:center;justify-content:center;font-size:${_icFont}px;flex-shrink:0;background:rgba(0,0,0,.3)">${ic}</div>`;
    return `<div style="display:flex;gap:${_gapRow};align-items:center;padding:${_padRow};background:rgba(255,255,255,.03);border:1px solid ${rc};border-radius:6px">
      ${imgHtml}
      <div style="flex:1;min-width:0;overflow:hidden">
        <div style="font-size:${_nmFs}px;font-weight:bold;color:${rc};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(it.nm)}${badge}</div>
        ${it.type?`<div style="font-size:${_typeFs}px;color:var(--dim);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(it.type)}</div>`:''}
        ${it.stats?`<div style="font-size:${_statsFs}px;color:var(--cyan);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(it.stats)}</div>`:''}
        ${it.desc?`<div style="font-size:${_descFs}px;color:var(--muted);margin-top:2px;line-height:1.35;display:-webkit-box;-webkit-line-clamp:${_many?2:3};-webkit-box-orient:vertical;overflow:hidden">${escapeHtml(it.desc)}</div>`:''}
      </div>
    </div>`;
  }).join('');
  const _gridStyle=_many?'display:grid;grid-template-columns:1fr 1fr;gap:6px':'display:flex;flex-direction:column;gap:6px';
  const congratsHtml=congrats?`<div style="margin-bottom:8px;padding:6px 12px;background:linear-gradient(90deg,rgba(255,215,0,.08),rgba(255,136,255,.08));border:1px solid ${headerColor};border-radius:6px;text-align:center;font-size:13px;color:${headerColor};font-weight:bold">🎉 ${escapeHtml(congrats)} 🎉</div>`:'';
  const subtitleHtml=subtitle?`<div style="text-align:center;font-size:12px;color:var(--dim);margin-bottom:6px">${escapeHtml(subtitle)}</div>`:'';
  const html=`<div style="padding:2px 2px">
    ${congratsHtml}
    ${subtitleHtml}
    ${itemRows?`<div style="${_gridStyle}">${itemRows}</div>`:'<div style="text-align:center;color:var(--dim);padding:18px">획득 항목 없음</div>'}
  </div>`;
  const _onClose=opts.onClose;
  openModal(title,html,[{txt:'확인',fn:()=>{closeModal();if(typeof _onClose==='function')_onClose();},cls:'btn-gold'}],{wide:true,report:true});
}
// 퀘스트 보상 수령
function sfxCoin(){AudioMgr.playSfx('coin');}

// ── 전투 프레임 렌더링 ────────────────────────────────────────────
function drawCombatFrame(){
  if(!cbCtx||!cbCV||!combatState)return;
  const W=cbCV.width,H=cbCV.height;
  const z=cbZoom,ox=cbOffX,oy=cbOffY;
  cbCtx.clearRect(0,0,W,H);
  // 배경
  const bg=cbCtx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,'#050a1a');bg.addColorStop(1,'#0a1428');
  cbCtx.fillStyle=bg;cbCtx.fillRect(0,0,W,H);
  // 별 배경
  cbCtx.save();
  const seed=combatState._rndSeed||1234;
  for(let i=0;i<80;i++){
    const sx=((seed*i*137+i*31)%W);const sy=((seed*i*97+i*53)%H);
    const sr=((i%5)*0.3+0.2);const sa=(0.3+(i%7)*0.1);
    cbCtx.globalAlpha=sa;cbCtx.fillStyle='#ffffff';
    cbCtx.beginPath();cbCtx.arc(sx,sy,sr,0,Math.PI*2);cbCtx.fill();
  }
  cbCtx.restore();

  cbCtx.save();
  cbCtx.translate(W/2+ox,H/2+oy);cbCtx.scale(z,z);

  const pl=combatState.players||[];
  const en=combatState.enemies||[];
  // ── 직사각형 함대 배치 (편대) ──
  // 함대를 rows×cols 격자에 정렬. 셀 간격은 함선 크기에 비례(로컬 좌표) →
  // ctx.scale(z) 에 의해 자연스럽게 줌과 함께 간격도 확대된다.
  function _fleetLayout(units,isEnemy,W,H,z){
    if(!units.length)return[];
    const sizes=units.map(u=>isEnemy?_enemySize(u):_shipDrawSize(u));
    // 보스 본 함은 호위함보다 ~3배 크지만 셀 간격은 호위함 기준으로 계산해야 격자가 너무 벌어지지 않음.
    // (보스는 자기 셀보다 시각적으로 크게 그려져 호위함을 약간 가리며 압도감 연출)
    const nonBossSizes=units.map((u,i)=>({u,s:sizes[i]})).filter(({u})=>!(isEnemy&&(u.id==='BOSS_MAIN'||(u.nm||'').includes('우르사'))));
    const baseSizes=nonBossSizes.length?nonBossSizes.map(x=>x.s):sizes;
    const maxW=Math.max(...baseSizes.map(s=>s.w));
    const maxH=Math.max(...baseSizes.map(s=>s.h));
    const n=units.length;
    function _seedRng(seed){let s=seed>>>0||1;return()=>{s=(s*1664525+1013904223)>>>0;return s/0x100000000;};}
    function _tankiness(u){
      return (+u.maxHP||+u.hp||1)+(+u.DEF||0)*8+(+u.maxSH||0)*0.6+(+u.armorTier||0)*30+(+u.shieldTier||0)*15;
    }
    // 사용자 매뉴얼 편성: 4×4 그리드 사용
    const manual=!isEnemy?(G&&G.fleetFormation):null;
    const hasManual=manual&&typeof manual==='object'&&Object.keys(manual).length>0;
    let cols,rows;
    if(hasManual){cols=4;rows=4;}
    else{
      // 1열·2열을 먼저 가득 채우도록 컬럼당 최대 5행을 기본값으로 사용
      // n ≤5: 1열 / n 6-10: 2열 / n 11-15: 3열 / n 16-20: 4열
      const _maxRowsPerCol=5;
      cols=Math.max(1,Math.min(4,Math.ceil(n/_maxRowsPerCol)));
      rows=Math.ceil(n/cols);
    }
    // 함선 간격: 겹침 방지를 위해 충분한 여유 확보 (이전 적군 cellW 1.12는 jitter와 결합 시 겹침 유발)
    const cellW=maxW*(isEnemy?1.45:1.7),cellH=maxH*(isEnemy?1.5:1.7);
    // 앵커는 로컬 좌표(=ctx.scale(z) 적용 전). /z 보정을 제거해 줌과 함께 함대 거리도 확대/축소된다.
    // 적군은 화면을 벗어나지 않도록 약간 가깝게 배치 (0.22)
    const xAnchor=(isEnemy?+1:-1)*W*0.22;
    const totalH=(rows-1)*cellH;
    const totalSlots=cols*rows;
    let slotForIdx;
    if(hasManual){
      slotForIdx=new Array(n).fill(-1);
      const taken=new Set();
      units.forEach((u,i)=>{
        const sl=manual[u.id];
        if(typeof sl==='number'&&sl>=0&&sl<totalSlots&&!taken.has(sl)){slotForIdx[i]=sl;taken.add(sl);}
      });
      // 미배치 함선은 빈 슬롯에 탱크 순으로 자동 채움 (앞열 우선)
      const remainingIdx=units.map((u,i)=>i).filter(i=>slotForIdx[i]<0)
        .sort((a,b)=>_tankiness(units[b])-_tankiness(units[a]));
      let s=0;
      remainingIdx.forEach(i=>{while(s<totalSlots&&taken.has(s))s++;if(s<totalSlots){slotForIdx[i]=s;taken.add(s);s++;}});
    } else {
      const rank=units.map((u,i)=>({i,t:_tankiness(u)})).sort((a,b)=>b.t-a.t).map(x=>x.i);
      slotForIdx=new Array(n);
      rank.forEach((unitIdx,slotIdx)=>{slotForIdx[unitIdx]=slotIdx;});
      // 보스 본 함은 뒤쪽 중앙 슬롯에 강제 배치 — 적 함대의 가장 뒤쪽 가운데
      // 대상: 우르사 메이저(BOSS_MAIN) + 보이드 보스 기함(voidBoss + '팔콘 스카우트 (기함)')
      if(isEnemy){
        const bossIdx=units.findIndex(u=>u.id==='BOSS_MAIN'||(u.nm||'').includes('우르사')||(u.voidBoss&&(u.nm||'').includes('기함'))||u.id==='VOID_FALCON_1');
        if(bossIdx>=0){
          const bossSlot=(cols-1)*rows+Math.floor((rows-1)/2);
          const curBossSlot=slotForIdx[bossIdx];
          if(curBossSlot!==bossSlot){
            // 보스 슬롯을 차지하고 있던 함선과 교환
            const swapIdx=slotForIdx.findIndex((s,i)=>s===bossSlot&&i!==bossIdx);
            if(swapIdx>=0)slotForIdx[swapIdx]=curBossSlot;
            slotForIdx[bossIdx]=bossSlot;
          }
        }
      }
    }
    return units.map((u,i)=>{
      const slot=slotForIdx[i];
      if(slot<0){u._frontRank=99;return{x:xAnchor,y:0};}
      const slotCol=Math.floor(slot/rows);
      const slotRow=slot%rows;
      u._frontRank=slot;
      u._fleetCols=cols;
      const xLocal=xAnchor + (isEnemy?+1:-1)*slotCol*cellW;
      const yLocal=slotRow*cellH - totalH/2;
      const idStr=String(u.id||('U'+i));
      let seed=0;for(let k=0;k<idStr.length;k++)seed=(seed*131+idStr.charCodeAt(k))>>>0;
      const rng=_seedRng(seed);
      // jitter는 셀 여유 안에서만 (셀 마진 절반 이내) — 겹침 방지
      const jx=(rng()-0.5)*cellW*0.06;
      const jy=(rng()-0.5)*cellH*0.08;
      return{x:xLocal+jx,y:yLocal+jy};
    });
  }
  const pPos=_fleetLayout(pl,false,W,H,z);
  const ePos=_fleetLayout(en,true,W,H,z);

  // 플레이어 함선
  pl.forEach((u,i)=>{
    const{x,y}=pPos[i];
    _unitPos[u.id||('P'+i)]={x:x,y:y};
    _drawShipUnit(cbCtx,u,x,y,null);
    _drawHealthBar(cbCtx,u,x,y,_shipDrawSize(u),false);
  });
  // 적 함선
  en.forEach((u,i)=>{
    const{x,y}=ePos[i];
    _unitPos[u.id||('E'+i)]={x:x,y:y};
    _drawShipUnit(cbCtx,u,x,y,null);
    _drawHealthBar(cbCtx,u,x,y,_enemySize(u),true);
  });
  // 이펙트 렌더링
  // 타입: beam(레이저 빔) / exp(폭발) / shockwave(충격파 링) / shard(파편)
  //        muzzle(발사 섬광) / missile(곡선 궤적 미사일) / shieldHit(헥사 임팩트)
  _cbEffects=(_cbEffects||[]).filter(ef=>{
    // 발사 대기 (순차/스태거)
    if(ef.delay&&ef.delay>0){ef.delay--;return true;}
    // 미사일은 t 기반 진행 — life와 별개로 t>=1이면 즉시 폭발로 변환
    if(ef.type==='missile'){
      ef.t+=ef.speed;
      cbCtx.save();
      const _msz=ef.sizeMul||1;
      if(ef.t<1){
        // 2차 Bezier로 위치 계산
        const T=ef.t,U=1-T;
        const px=U*U*ef.x1+2*U*T*ef.ctrlx+T*T*ef.x2;
        const py=U*U*ef.y1+2*U*T*ef.ctrly+T*T*ef.y2;
        const Tp=Math.max(0,T-0.12),Up=1-Tp;
        const ppx=Up*Up*ef.x1+2*Up*Tp*ef.ctrlx+Tp*Tp*ef.x2;
        const ppy=Up*Up*ef.y1+2*Up*Tp*ef.ctrly+Tp*Tp*ef.y2;
        // 꼬리 (연료 분사) — 크기 배율 적용
        cbCtx.strokeStyle=ef.col;cbCtx.lineWidth=3*_msz;
        cbCtx.shadowColor=ef.col;cbCtx.shadowBlur=10*Math.min(3,Math.sqrt(_msz));
        cbCtx.lineCap='round';
        cbCtx.beginPath();cbCtx.moveTo(ppx,ppy);cbCtx.lineTo(px,py);cbCtx.stroke();
        // 머리 (흰 코어) — 크기 배율 적용
        cbCtx.shadowBlur=0;
        cbCtx.fillStyle='#ffffff';
        cbCtx.beginPath();cbCtx.arc(px,py,2.8*_msz,0,Math.PI*2);cbCtx.fill();
        cbCtx.restore();
        return true;
      } else {
        // 타겟 도달 — 폭발 트리거 (크기 배율 적용)
        const ec=ef.isDead?'#ff3300':(ef.wasShielded?'#ffaa66':'#ff7755');
        const er=(ef.isDead?26:(ef.wasShielded?12:18))*_msz;
        _cbEffects.push({type:'exp',x:ef.x2,y:ef.y2,col:ec,r:er,life:ef.isDead?36:22,maxLife:ef.isDead?36:22});
        if(ef.wasShielded){
          _cbEffects.push({type:'shieldHit',x:ef.x2,y:ef.y2,col:'#66ddff',r:22,life:14,maxLife:14});
        }
        if(ef.isLastInSalvo&&ef.isDead){
          _cbEffects.push({type:'shockwave',x:ef.x2,y:ef.y2,col:'#ffaa44',r:50,life:30,maxLife:30});
          _cbEffects.push({type:'exp',x:ef.x2,y:ef.y2,col:'#ffffff',r:14,life:14,maxLife:14});
          for(let i=0;i<10;i++){
            const ang=(Math.PI*2*i)/10+Math.random()*0.3;
            _cbEffects.push({type:'shard',x:ef.x2,y:ef.y2,vx:Math.cos(ang)*3.8,vy:Math.sin(ang)*3.8,col:'#ffcc66',life:42,maxLife:42});
          }
        }
        cbCtx.restore();
        return false;
      }
    }
    ef.life--;
    const a=Math.max(0,ef.life/ef.maxLife);   // 1 → 0 페이드
    const t=1-a;                              // 0 → 1 진행도
    cbCtx.save();
    if(ef.type==='beam'){
      const tm=ef.thickMul||1;
      // 외곽 글로우 (두께 확장)
      cbCtx.globalAlpha=Math.min(1,a*0.9);
      cbCtx.strokeStyle=ef.col;
      cbCtx.lineWidth=6*a*tm;
      cbCtx.shadowColor=ef.col;
      cbCtx.shadowBlur=20*a*Math.min(3,Math.sqrt(tm));
      cbCtx.lineCap='round';
      cbCtx.beginPath();cbCtx.moveTo(ef.x1,ef.y1);cbCtx.lineTo(ef.x2,ef.y2);cbCtx.stroke();
      // 중심 흰 코어 (두께 확장)
      cbCtx.globalAlpha=Math.min(1,a);
      cbCtx.strokeStyle='#ffffff';
      cbCtx.lineWidth=2*a*tm;
      cbCtx.shadowBlur=0;
      cbCtx.beginPath();cbCtx.moveTo(ef.x1,ef.y1);cbCtx.lineTo(ef.x2,ef.y2);cbCtx.stroke();
    } else if(ef.type==='lightning'){
      // 번개(테슬라 초공간) — 지그재그 + 양옆 가지(fork). 매 프레임 미세 흔들림
      const tm=ef.thickMul||1;
      const seed=ef.seed||1;
      const dx=ef.x2-ef.x1, dy=ef.y2-ef.y1;
      const dist=Math.hypot(dx,dy)||1;
      const nx=-dy/dist, ny=dx/dist;  // 수직 단위벡터 (offset 방향)
      // 지그재그 메인 경로 — 8세그먼트, 각 마디마다 흔들림
      const segs=8;
      const pts=[];
      for(let i=0;i<=segs;i++){
        const t=i/segs;
        const px=ef.x1+dx*t, py=ef.y1+dy*t;
        // 중간 마디는 좌우로 흔들림. 양 끝은 고정
        const wobble=(i===0||i===segs)?0:(Math.sin(seed+i*7.3+a*9)*16);
        pts.push({x:px+nx*wobble, y:py+ny*wobble});
      }
      // 1) 외곽 글로우 (두꺼운 푸른 빛)
      cbCtx.globalAlpha=Math.min(1,a*0.85);
      cbCtx.strokeStyle='#66ddff';
      cbCtx.lineWidth=8*a*tm;
      cbCtx.shadowColor='#66ddff';
      cbCtx.shadowBlur=24*a*Math.min(3,Math.sqrt(tm));
      cbCtx.lineCap='round';
      cbCtx.lineJoin='round';
      cbCtx.beginPath();
      cbCtx.moveTo(pts[0].x,pts[0].y);
      for(let i=1;i<pts.length;i++)cbCtx.lineTo(pts[i].x,pts[i].y);
      cbCtx.stroke();
      // 2) 중심 흰 코어
      cbCtx.globalAlpha=Math.min(1,a);
      cbCtx.strokeStyle='#ffffff';
      cbCtx.lineWidth=2.5*a*tm;
      cbCtx.shadowBlur=0;
      cbCtx.beginPath();
      cbCtx.moveTo(pts[0].x,pts[0].y);
      for(let i=1;i<pts.length;i++)cbCtx.lineTo(pts[i].x,pts[i].y);
      cbCtx.stroke();
      // 3) 가지(fork) — 메인 경로의 각 마디에서 짧은 곁가지 분기 (확률 50%)
      cbCtx.globalAlpha=Math.min(1,a*0.7);
      cbCtx.strokeStyle='#aaeeff';
      cbCtx.lineWidth=Math.max(1,3*a*Math.sqrt(tm));
      cbCtx.shadowColor='#66ddff';
      cbCtx.shadowBlur=12*a;
      for(let i=1;i<segs;i++){
        const r=((seed+i*131)%100)/100;
        if(r<0.5)continue;
        const side=(i%2===0)?1:-1;
        const branchLen=20+(((seed+i*53)%100)/100)*30;
        const bx=pts[i].x + nx*side*branchLen + (Math.random()-0.5)*8;
        const by=pts[i].y + ny*side*branchLen + (Math.random()-0.5)*8;
        cbCtx.beginPath();
        cbCtx.moveTo(pts[i].x,pts[i].y);
        cbCtx.lineTo(bx,by);
        cbCtx.stroke();
      }
      // 4) 시작점/끝점 강한 펄스 (전기 방전 효과)
      cbCtx.shadowBlur=0;
      cbCtx.globalAlpha=Math.min(1,a*0.9);
      cbCtx.fillStyle='#ffffff';
      cbCtx.beginPath();cbCtx.arc(pts[0].x,pts[0].y, 6*Math.sqrt(tm), 0,Math.PI*2);cbCtx.fill();
      cbCtx.fillStyle='#aaeeff';
      cbCtx.beginPath();cbCtx.arc(pts[segs].x,pts[segs].y, 7*Math.sqrt(tm), 0,Math.PI*2);cbCtx.fill();
    } else if(ef.type==='muzzle'){
      // 발사 시 머즐 플래시 — 십자 별 형태
      cbCtx.globalAlpha=Math.min(1,a);
      cbCtx.shadowColor=ef.col;cbCtx.shadowBlur=22*a;
      cbCtx.fillStyle=ef.col;
      cbCtx.beginPath();cbCtx.arc(ef.x,ef.y,ef.r*(1+t*0.3),0,Math.PI*2);cbCtx.fill();
      cbCtx.fillStyle='#ffffff';
      cbCtx.globalAlpha=Math.min(1,a*0.9);
      cbCtx.beginPath();cbCtx.arc(ef.x,ef.y,ef.r*0.5*a,0,Math.PI*2);cbCtx.fill();
    } else if(ef.type==='shockwave'){
      // 충격파 링 — 시간이 갈수록 확장하고 얇아짐
      const radius=ef.r*(0.3+t*1.8);
      cbCtx.globalAlpha=Math.min(1,a*0.85);
      cbCtx.strokeStyle=ef.col;
      cbCtx.lineWidth=Math.max(0.5,4*a);
      cbCtx.shadowColor=ef.col;cbCtx.shadowBlur=18*a;
      cbCtx.beginPath();cbCtx.arc(ef.x,ef.y,radius,0,Math.PI*2);cbCtx.stroke();
    } else if(ef.type==='shard'){
      // 파편 — 방향(vx,vy)으로 날아가며 점점 작아짐
      ef.x+=ef.vx;ef.y+=ef.vy;
      ef.vx*=0.96;ef.vy*=0.96;
      cbCtx.globalAlpha=Math.min(1,a);
      cbCtx.fillStyle=ef.col;
      cbCtx.shadowColor=ef.col;cbCtx.shadowBlur=8*a;
      cbCtx.beginPath();cbCtx.arc(ef.x,ef.y,2.5*a,0,Math.PI*2);cbCtx.fill();
    } else if(ef.type==='shieldHit'){
      // 쉴드 피격 — 헥사곤 임팩트 + 짧은 광점
      const radius=ef.r*(0.9+t*0.4);
      cbCtx.globalAlpha=Math.min(1,a*0.95);
      cbCtx.strokeStyle=ef.col;
      cbCtx.lineWidth=Math.max(1,3*a);
      cbCtx.shadowColor=ef.col;cbCtx.shadowBlur=14*a;
      cbCtx.beginPath();
      for(let i=0;i<6;i++){
        const ang=(Math.PI*2*i)/6;
        const px=ef.x+Math.cos(ang)*radius;
        const py=ef.y+Math.sin(ang)*radius;
        if(i===0)cbCtx.moveTo(px,py); else cbCtx.lineTo(px,py);
      }
      cbCtx.closePath();cbCtx.stroke();
      // 중심 광점
      cbCtx.globalAlpha=Math.min(1,a);
      cbCtx.fillStyle='#ffffff';
      cbCtx.shadowBlur=0;
      cbCtx.beginPath();cbCtx.arc(ef.x,ef.y,2.5*a,0,Math.PI*2);cbCtx.fill();
    } else {
      // 폭발: 외부 링이 진행에 따라 커지며 페이드
      const radius=ef.r*(0.4+t*1.6);
      cbCtx.globalAlpha=Math.min(1,a*1.1);
      cbCtx.shadowColor=ef.col;cbCtx.shadowBlur=24*a;
      cbCtx.fillStyle=ef.col;
      cbCtx.beginPath();cbCtx.arc(ef.x,ef.y,radius,0,Math.PI*2);cbCtx.fill();
      // 내부 밝은 코어 (초반에만)
      if(a>0.55){
        cbCtx.globalAlpha=Math.min(1,a*0.9);
        cbCtx.fillStyle='rgba(255,255,255,0.9)';
        cbCtx.shadowBlur=0;
        cbCtx.beginPath();cbCtx.arc(ef.x,ef.y,radius*0.45,0,Math.PI*2);cbCtx.fill();
      }
    }
    cbCtx.restore();
    return ef.life>0;
  });
  cbCtx.restore();
  // TURN 표시
  const tEl=document.getElementById('cb-turn');
  if(tEl)tEl.textContent='TURN '+(combatState.turn||0);
}

function _drawHealthBar(ctx,u,x,y,sz,isEnemy){
  const bw=sz.bar||60,bh=6,by=y-sz.h-16;
  const bx=x-bw/2;
  // HP 바
  ctx.fillStyle='rgba(0,0,0,.5)';ctx.fillRect(bx,by,bw,bh);
  const hpR=Math.max(0,Math.min(1,u.hp/Math.max(1,u.maxHP)));
  ctx.fillStyle=hpR>0.5?'#51cf66':hpR>0.25?'#ffd43b':'#ff6b6b';
  ctx.fillRect(bx,by,bw*hpR,bh);
  ctx.strokeStyle='rgba(255,255,255,.2)';ctx.lineWidth=0.5;ctx.strokeRect(bx,by,bw,bh);
  // SH 바
  if((u.maxSH||0)>0){
    const shy=by+bh+2;const shR=Math.max(0,Math.min(1,(u.sh||0)/Math.max(1,u.maxSH)));
    ctx.fillStyle='rgba(0,0,0,.5)';ctx.fillRect(bx,shy,bw,4);
    ctx.fillStyle='#339af0';ctx.fillRect(bx,shy,bw*shR,4);
    ctx.strokeStyle='rgba(255,255,255,.2)';ctx.lineWidth=0.5;ctx.strokeRect(bx,shy,bw,4);
  }
  // 이름 라벨
  ctx.fillStyle=u.hp<=0?'rgba(150,150,150,.6)':'rgba(220,220,255,.85)';
  ctx.font=`${sz.label||10}px sans-serif`;
  ctx.textAlign='center';
  ctx.fillText((u.nm||'').substring(0,10),x,by-3);
  // ── HP / SH 수치 표기 (함선 아래쪽) ─────────────────────────────
  const _fmt=v=>v>=10000?Math.round(v/100)/10+'k':v>=1000?Math.round(v/100)/10+'k':String(Math.max(0,Math.round(v)));
  const _hpTxt=`HP ${_fmt(u.hp)}/${_fmt(u.maxHP)}`;
  const _shTxt=(u.maxSH||0)>0?`SH ${_fmt(u.sh||0)}/${_fmt(u.maxSH||0)}`:'';
  const ny=by+bh+((u.maxSH||0)>0?12:8);
  ctx.font=`${Math.max(9,(sz.label||10)-1)}px Courier New,monospace`;
  ctx.textBaseline='top';
  // HP 텍스트
  ctx.fillStyle=u.hp<=0?'rgba(150,150,150,.5)':(hpR>0.5?'rgba(180,255,200,.95)':hpR>0.25?'rgba(255,220,120,.95)':'rgba(255,140,140,.95)');
  ctx.fillText(_hpTxt,x,ny);
  if(_shTxt){
    ctx.fillStyle='rgba(150,220,255,.9)';
    ctx.fillText(_shTxt,x,ny+10);
  }
  ctx.textBaseline='alphabetic';
}

// 전투 화면 상단 함대 합산 스탯 표시 (아군/적군 ATT·HP·SH·DEF 합산)
function _updateCombatFleetStats(){
  if(!combatState)return;
  const fmt=v=>v>=1000000?Math.round(v/100000)/10+'M':v>=1000?Math.round(v/100)/10+'k':String(Math.round(v));
  function agg(arr){
    let att=0,hp=0,maxHp=0,sh=0,maxSh=0,def=0,alive=0;
    arr.forEach(u=>{
      const _alive=u.hp>0;
      if(_alive)alive++;
      att+=_alive?(+u.ATT||0):0;       // 살아있는 함선만 ATT 합산
      hp+=Math.max(0,u.hp||0);
      maxHp+=Math.max(0,u.maxHP||0);
      sh+=Math.max(0,u.sh||0);
      maxSh+=Math.max(0,u.maxSH||0);
      def+=_alive?(+u.DEF||0):0;
    });
    return{att,hp,maxHp,sh,maxSh,def,alive,total:arr.length};
  }
  const pa=agg(combatState.players||[]);
  const ea=agg(combatState.enemies||[]);
  const plEl=document.getElementById('cb-fleet-pl');
  const enEl=document.getElementById('cb-fleet-en');
  if(plEl)plEl.innerHTML=`⚓ <b>아군</b> ${pa.alive}/${pa.total}척 · ⚔ <b style="color:#ffb84d">ATT ${fmt(pa.att)}</b> · ❤ <b style="color:#51cf66">${fmt(pa.hp)}/${fmt(pa.maxHp)}</b> · 🛡 <b style="color:#66ddff">${fmt(pa.sh)}/${fmt(pa.maxSh)}</b> · DEF ${fmt(pa.def)}`;
  if(enEl)enEl.innerHTML=`☠️ <b>적군</b> ${ea.alive}/${ea.total}척 · ⚔ <b style="color:#ff8866">ATT ${fmt(ea.att)}</b> · ❤ <b style="color:#ff7d7d">${fmt(ea.hp)}/${fmt(ea.maxHp)}</b> · 🛡 <b style="color:#aaccff">${fmt(ea.sh)}/${fmt(ea.maxSh)}</b> · DEF ${fmt(ea.def)}`;
}

// ── 전투 1턴 처리 ─────────────────────────────────────────────────
function _txPos(pos){
  // _unitPos 가 이미 로컬 좌표(ctx.scale 적용 전)로 저장되므로 그대로 사용
  return{x:pos.x, y:pos.y};
}
function runCombatTurn(){
  if(!combatState||combatState.done){drawCombatFrame();return;}
  // _unitPos 사전 채우기: 이펙트 좌표 참조 전 반드시 호출
  drawCombatFrame();
  combatState.turn++;
  const pl=combatState.players.filter(u=>u.hp>0);
  const en=combatState.enemies.filter(u=>u.hp>0);
  if(!pl.length||!en.length){_finishCombat();return;}

  let log=[];
  const W=cbCV?cbCV.width:400, ox=cbOffX, oy=cbOffY;

  // ── 앞쪽(낮은 _frontRank) 함선 우선 타겟팅: 가중치 = (n - rank). 70% 확률로 가중 적용, 30%는 균등 무작위 ──
  function _pickFrontBiased(candidates){
    if(candidates.length<=1)return candidates[0];
    if(Math.random()<0.30)return candidates[Math.floor(Math.random()*candidates.length)];
    const ranks=candidates.map(c=>typeof c._frontRank==='number'?c._frontRank:99);
    const maxR=Math.max(...ranks);
    const weights=ranks.map(r=>(maxR-r+1)*(maxR-r+1)); // 제곱 가중치로 앞쪽 강조
    const total=weights.reduce((a,b)=>a+b,0);
    let r=Math.random()*total;
    for(let i=0;i<candidates.length;i++){r-=weights[i];if(r<=0)return candidates[i];}
    return candidates[candidates.length-1];
  }

  // ── 발사 스태거: 각 공격자가 시간 차로 발사하도록 delay 누적 ──
  // 레이저는 14프레임/회, 미사일은 18프레임/회 간격 (살보가 좀 길어서 더 여유)
  let _fireDelay=0;
  // 플레이어 함선의 미사일/레이저 파츠 수 (살보 크기 + 무기 선택 결정용)
  const _weaponCountsFor=(ship)=>{
    if(!ship||!ship.parts)return {missile:0,laser:0};
    let missile=0,laser=0;
    ship.parts.forEach(pid=>{
      const p=partById(pid);
      if(!p||p.cat!=='weapon')return;
      if(p.wtype==='missile')missile++;
      else laser++;  // wtype 미지정 또는 laser는 모두 레이저로 취급
    });
    return {missile,laser};
  };

  // 플레이어 공격
  pl.forEach(p=>{
    const aliveEn=en.filter(e=>e.hp>0);
    if(!aliveEn.length)return;
    const target=_pickFrontBiased(aliveEn);
    const rawDmg=Math.max(1,Math.round((+p.ATT||1)-Math.floor((target.armorTier||0)*1.5)));
    const shDmg=Math.min(target.sh||0,rawDmg);
    const hpDmg=rawDmg-shDmg;
    const wasShielded=(target.sh||0)>0;
    target.sh=Math.max(0,(target.sh||0)-shDmg);
    target.hp=Math.max(0,(target.hp||target.maxHP)-hpDmg);
    const isDead=target.hp<=0;
    // 무기 선택: 장착된 파츠 수 비율로 가중치 랜덤. 미사일·레이저 둘 다 없으면 레이저 폴백
    const _wc=_weaponCountsFor(p);
    const _mcnt=_wc.missile,_lcnt=_wc.laser;
    let usesMissile=false;
    if(_mcnt>0&&_lcnt===0)usesMissile=true;                 // 미사일만 있음
    else if(_lcnt>0&&_mcnt===0)usesMissile=false;           // 레이저만 있음
    else if(_mcnt>0&&_lcnt>0){
      // 둘 다 있으면 파츠 수 비율로 가중치 랜덤
      const total=_mcnt+_lcnt;
      usesMissile=Math.random()<(_mcnt/total);
    } // 둘 다 없으면 레이저 폴백(usesMissile=false 유지)
    // ── 흡혈 로봇 파츠: 레이저 발사 시 입힌 피해의 N%만큼 HP/실드 회복 ──
    let _healHP=0,_healSH=0;
    if(!usesMissile&&rawDmg>0){
      const gs=G.fleet.find(s=>s.id===p.id);
      const parts=(gs?.parts)||p.parts||[];
      let _rateHP=0,_rateSH=0;
      parts.forEach(pid=>{
        const pp=partById(pid);
        if(!pp)return;
        if(pp.laserHealHP)_rateHP+=pp.laserHealHP;
        if(pp.laserHealSH)_rateSH+=pp.laserHealSH;
      });
      if(_rateHP>0||_rateSH>0){
        _healHP=Math.round(rawDmg*_rateHP);
        _healSH=Math.round(rawDmg*_rateSH);
        if(_healHP>0){
          const before=p.hp;
          p.hp=Math.min(p.maxHP||p.hp,p.hp+_healHP);
          _healHP=p.hp-before;
          if(gs)gs.hp=p.hp;
        }
        if(_healSH>0){
          const before=p.sh||0;
          p.sh=Math.min(p.maxSH||0,(p.sh||0)+_healSH);
          _healSH=(p.sh||0)-before;
          if(gs)gs.sh=p.sh;
        }
      }
    }
    const _healLog=(_healHP>0||_healSH>0)?` 🩸+HP${_healHP}${_healSH>0?'/SH'+_healSH:''}`:'';
    log.push(`${usesMissile?'🚀':'⚡'} ${p.nm||'아군'} → ${target.nm||'적'}: 실드${shDmg} HP${hpDmg}`+(isDead?' 격침!':'')+_healLog);
    const ap=_unitPos[p.id||('P'+0)], ep=_unitPos[target.id];
    if(ap&&ep){
      const a1=_txPos(ap), a2=_txPos(ep);
      if(usesMissile){
        // 미사일 살보 크기: 1 part → 3, 2 → 5, 3 → 7, 4 → 9, 5 → 11, 6+ → 13
        const mcnt=Math.max(1,Math.min(13,1+_mcnt*2));
        // 전술 단계마다 미사일 크기 ×1.1 누적 + 시간차공격부터 주황→붉은색으로 색 변화
        // 일점사 ×1.1, 학익진 ×1.21, 시간차 ×1.33(주황), 테슬라 ×1.46, 제네시스 ×1.61(진주황), 데스티네이션 ×1.77(붉은)
        let _mSize=1, _mCol='#ffcc66';
        if(combatState._sunsinUsed)      _mSize*=1.1;
        if(combatState._haikjinUsed)     _mSize*=1.1;
        if(combatState._einsteinUsed){   _mSize*=1.1; _mCol='#ff9933';}  // 주황
        if(combatState._teslaUsed){      _mSize*=1.1; _mCol='#ff8822';}  // 더 진한 주황
        if(combatState._genesisUsed){    _mSize*=1.1; _mCol='#ff6633';}  // 적주황
        if(combatState._destinationUsed){_mSize*=1.1; _mCol='#ff3333';}  // 붉은
        _cbAddMissileSalvo(a1,a2,_mCol,isDead,mcnt,_fireDelay,wasShielded,_mSize);
        _fireDelay+=18+mcnt*2;
      } else {
        // 데스티네이션 어스 발동 시 레이저 색상 → 핑크/퍼플 (무지개급 피니셔)
        const _laserCol=combatState._destinationUsed?'#ff44ff':'#00f3ff';
        _cbAddBeamAndHit(a1,a2,_laserCol,isDead,_fireDelay,wasShielded);
        _fireDelay+=14;
      }
    }
  });
  // 플레이어 사격 끝난 뒤 약간 쉬고 적 사격 시작
  _fireDelay+=10;

  // ─── 보이드 히든 보스: 페이즈별 특수 행동 ──────────────────────
  // 50% HP 이하: 차원 절단광선 → 기함을 제외한 함선 1척 즉시 소멸
  // 10% HP 이하: 작별 통신 + 함선 사라짐 (보스 측 자진 철수)
  let _skipNormalEnemyAttack=false;
  if(combatState.isVoidBoss){
    const boss=combatState.enemies[0];
    if(boss){
      // 트리거: 전체 적 함대 합산 HP 10% 이하 = 거의 괴멸 직전
      const _totalCurHP=combatState.enemies.reduce((s,e)=>s+Math.max(0,e.hp||0),0);
      const _totalMaxHP=combatState.enemies.reduce((s,e)=>s+(e.maxHP||1),0);
      const fleetHpPct=_totalMaxHP>0?_totalCurHP/_totalMaxHP:0;
      const bossHpPct=Math.max(0,boss.hp)/(boss.maxHP||1);
      // 함대 합산 10% OR 보스 0% (보스가 단독으로 마지막에 살아 남았을 때)
      if((fleetHpPct<=0.10||boss.hp<=0)&&!combatState._voidRetreated){
        combatState._voidRetreated=true;
        // 남은 모든 적함 함께 어둠 속으로 사라짐
        combatState.enemies.forEach(e=>{e.hp=0;e.sh=0;});
        addCombatLog(`💬 [팔콘 스카우트] 통신 신호 수신... 보이드 함대가 어둠 속으로 사라진다...`,'gold');
        drawCombatFrame();
        combatState.done=true;  // 일반 finishCombat 흐름 차단
        try{AudioMgr.playBgm(_planetBgmName(G.currentPlanet));}catch(e){}
        setTimeout(()=>showVoidBossOutro(),1200);
        return;
      }
      // 50% 페이즈 — 차원 절단광선 (보스 생존 + 함대 50% 이하 시)
      if(boss.hp>0&&(bossHpPct<=0.50||fleetHpPct<=0.50)){
        if(!combatState._voidSuperLaserAnnounced){
          combatState._voidSuperLaserAnnounced=true;
          addCombatLog(`🌑 [팔콘 스카우트] 차원 절단광선 충전... 함대 비기함 함선이 위험합니다!`,'err');
        }
        // 비기함(G.fleet[0] 이외) 중 살아있는 첫 함선을 소멸
        const flagshipId=(G.fleet[0]||{}).id;
        const victims=pl.filter(p=>p.id!==flagshipId&&p.hp>0);
        if(victims.length>0){
          const v=victims[0];
          // 차원 절단광선 시각효과 (보스 → 희생 함선 굵은 보라 빔)
          const ap=_unitPos[boss.id],ep=_unitPos[v.id];
          if(ap&&ep){
            try{_cbAddBeamAndHit(_txPos(ap),_txPos(ep),'#cc44ff',true,_fireDelay,false);}catch(e){}
            _fireDelay+=20;
          }
          v.hp=0;v.sh=0;
          const gs=G.fleet.find(s=>s.id===v.id);
          if(gs){gs.hp=0;gs.sh=0;}
          addCombatLog(`🌑 차원 절단광선! ${v.nm} 함선이 보이드 균열에 흡수되었다...`,'err');
        }
        _skipNormalEnemyAttack=true;  // 평시 ATT 공격 생략 (이 페이즈는 절단광선만)
      }
    }
  }

  // 적 공격
  if(!_skipNormalEnemyAttack)en.filter(e=>e.hp>0).forEach(e=>{
    const alivePl=pl.filter(p=>p.hp>0);
    if(!alivePl.length)return;
    const target=_pickFrontBiased(alivePl);
    const armorRed=Math.floor((target.armorTier||0)*1.5);
    const rawDmg=Math.max(1,Math.round((+e.ATT||1)-armorRed));
    const shDmg=Math.min(target.sh||0,rawDmg);
    const hpDmg=rawDmg-shDmg;
    const wasShielded=(target.sh||0)>0;
    target.sh=Math.max(0,(target.sh||0)-shDmg);
    target.hp=Math.max(0,target.hp-hpDmg);
    // G.fleet 반영
    const gs=G.fleet.find(s=>s.id===target.id);
    if(gs){gs.hp=target.hp;gs.sh=target.sh;}
    const isDead=target.hp<=0;
    // ─── 보이드 적함: 테슬라식 번개 + 미사일 무작위 ───
    const _isVoidEnemy=combatState.isVoidBoss||e.voidBoss||(e.nm||'').includes('팔콘');
    let _atkKind='beam';  // 'beam' | 'lightning' | 'missile'
    if(_isVoidEnemy){
      const r=Math.random();
      _atkKind=r<0.45?'lightning':r<0.90?'missile':'beam';
    }
    const _iconMap={beam:'💥',lightning:'⚡',missile:'🚀'};
    log.push(`${_iconMap[_atkKind]} ${e.nm||'적'} → ${target.nm||'아군'}: 실드${shDmg} HP${hpDmg}`+(isDead?' 격파!':''));
    const ap=_unitPos[e.id], ep=_unitPos[target.id];
    if(ap&&ep){
      const a1=_txPos(ap),a2=_txPos(ep);
      if(_atkKind==='lightning'){
        // 보이드 번개: 보라 코어 + 자가 가지 (테슬라 시각 효과 재활용)
        _cbEffects.push({type:'muzzle',x:a1.x,y:a1.y,col:'#cc66ff',r:10,life:8,maxLife:8,delay:_fireDelay});
        _cbEffects.push({type:'lightning',x1:a1.x,y1:a1.y,x2:a2.x,y2:a2.y,col:'#cc66ff',life:16,maxLife:16,delay:_fireDelay,thickMul:1.4,seed:Math.random()*9999});
        if(wasShielded)_cbEffects.push({type:'shieldHit',x:a2.x,y:a2.y,col:'#cc66ff',r:30,life:18,maxLife:18,delay:_fireDelay+4});
        _cbEffects.push({type:'exp',x:a2.x,y:a2.y,col:isDead?'#ff3300':'#cc66ff',r:isDead?32:18,life:isDead?36:24,maxLife:isDead?36:24,delay:_fireDelay+5});
        try{_cbStartAnimLoop();}catch(_e){}
        _fireDelay+=15;
      } else if(_atkKind==='missile'){
        // 보이드 미사일: 5발 살보 (보라색)
        _cbAddMissileSalvo(a1,a2,'#cc66ff',isDead,5,_fireDelay,wasShielded,1.2);
        _fireDelay+=22;
      } else {
        _cbAddBeamAndHit(a1,a2,_isVoidEnemy?'#cc66ff':'#cc44ff',isDead,_fireDelay,wasShielded);
        _fireDelay+=14;
      }
    }
  });
  log.forEach(m=>addCombatLog(m,''));

  const stillAliveEn=combatState.enemies.filter(u=>u.hp>0).length;
  const stillAlivePl=combatState.players.filter(u=>u.hp>0).length;
  drawCombatFrame();
  const stEl=document.getElementById('cb-status');
  if(stEl)stEl.textContent=`아군 ${stillAlivePl}/${combatState.players.length} | 적 ${stillAliveEn}/${combatState.enemies.length}`;
  _updateCombatFleetStats();
  // 모든 사격이 시각적으로 끝날 때까지 대기 (마지막 이펙트 페이드 포함 ~60프레임 여유)
  const turnMs=Math.min(3000,Math.max(700,(_fireDelay+60)*16));
  if(!stillAliveEn||!stillAlivePl){
    setTimeout(function(){if(combatState&&!combatState.done)_finishCombat();},Math.max(900,turnMs));
  } else {
    // 최대 50턴 제한 (무한 루프 방지)
    if(combatState.turn>=50){
      addCombatLog('⏱️ 50턴 초과 — 강제 종료 (승리 처리)','gold');
      combatState.enemies.forEach(e=>{e.hp=0;});
      setTimeout(function(){if(combatState&&!combatState.done)_finishCombat();},900);
    } else {
      setTimeout(runCombatTurn,turnMs);
    }
  }
}

function _finishCombat(){
  if(!combatState)return;
  combatState.done=true;
  const win=combatState.enemies.filter(u=>u.hp>0).length===0;
  const pid=combatState._planetId||G.currentPlanet;
  const pd=combatState.planetDef||{};
  let earned=0;
  if(win){
    addCombatLog('🎉 전투 승리!','ok');
    if(pd.hostile&&!combatState.isBoss){G.planets[pid]=G.planets[pid]||{};G.planets[pid].hostile_cleared=true;}
    // 호레이쇼 넬슨(H05) 보유 시 전투 보상 +20%
    const _nelsonBonus=(G.heroes||[]).includes('H05')?1.2:1.0;
    earned=Math.round((1000+G.turn*50)*getDiffMult()*_nelsonBonus);
    G.credits+=earned;
    addCombatLog(`💰 보상 ₡${earned.toLocaleString()}`,'gold');
    // 모든 비-보스 전투 승리 시 허브 진행도 +1 (해적/치크스/적대행성/잔해해적 모두 카운트)
    let _kindLbl='⚔️ 적군';
    let _repGained=0;
    if(!combatState.isBoss){
      if(combatState.isPirate||combatState._isChixFleet){
        if(!G.pirateKills)G.pirateKills=0;
        G.pirateKills++;
        changeReputation(1);_repGained=1;
      }
      addHubProgress(pid);
      _kindLbl=combatState._isChixFleet?'🛸 치크스':combatState.isPirate?'🏴‍☠️ 해적':'⚔️ 적군';
      addCombatLog(`${_kindLbl} 격파! 허브 진행 ${getPlanetHubProgress(pid)}/15`,'gold');
    }
    if(combatState.isBoss){
      addCombatLog('🏆 우르사 메이저 제압! 게임 클리어!','gold');
      notify('🏆 최종 보스 격파! 게임 클리어!','gold');
      // ── 최종 보스 보상: 1천만 크레딧 + 우르사 메이저 함선 + 신화 파츠 4종 ──
      const _bossBonusCr=10000000;
      G.credits+=_bossBonusCr;
      addCombatLog(`💰 보스 격파 보너스 +₡${_bossBonusCr.toLocaleString()}`,'gold');
      // 우르사 메이저 함선 강제 획득
      if(!G.fleet)G.fleet=[];
      const _ursaShip={
        id:'BOSS_URSA_CAP_'+Date.now(),
        nm:'🏴 우르사 메이저 (나포)',
        tier:'신화',
        maxHP:10000000,hp:10000000,maxSH:300000,sh:300000,
        ATT:6000,INT:600,TEC:280,HP:10000000,DEF:200,LOY:80,
        parts:['MW01','MS01','MA01','ME01'],crewIds:[],cargoSlots:40,
        catalogId:'URSA',crafted:false
      };
      // 활성 편대 한도 체크 (최대 16척) — 초과 시 임시창, 임시창 8척 초과 시 매각 프롬프트
      const _ursaAdd=addShipToFleet(_ursaShip);
      if(_ursaAdd.added==='reserve')addCombatLog(`📦 우르사 메이저 함선 → 임시창 보관 (편대 가득)`,'gold');
      else addCombatLog(`⚑ 우르사 메이저 함선 편대 합류!`,'gold');
      // 신화 파츠 4종 모두 인벤토리에 추가
      if(!G.inventory)G.inventory=[];
      ['MW01','MS01','MA01','ME01'].forEach(pid=>{
        const inv=G.inventory.find(i=>i.id===pid);
        if(inv)inv.qty++;else G.inventory.push({id:pid,qty:1});
      });
      addCombatLog(`✦ 신화 파츠 4종 획득: 허메틱 포·크로노스 방벽·아다만 선체·타키온 드라이브`,'gold');
      // 추가 신화 설계도 보너스: 영혼 흡수 매트릭스(RB10), 렐러티비티(LGD03)
      // 보스 격파 시 미보유 설계도를 자동 지급 (드롭률에 의존하지 않음)
      if(!G.blueprints)G.blueprints={};
      const _bossBlueprints=['RB10','LGD03'];
      const _grantedBp=[];
      _bossBlueprints.forEach(bp=>{
        if(!G.blueprints[bp]){G.blueprints[bp]=true;_grantedBp.push(bp);}
      });
      if(_grantedBp.length>0){
        const _bpNames=_grantedBp.map(bp=>{
          const r=(typeof CRAFT_RECIPES!=='undefined')&&CRAFT_RECIPES.find(x=>x.id===bp);
          return r?r.nm:bp;
        }).join('·');
        addCombatLog(`📜 신화 설계도 ${_grantedBp.length}종 획득: ${_bpNames}`,'gold');
      }
    }
    else{notify('⚔️ 전투 승리!','ok');}
    // ── 🏴 적함 나포 처리 (보스 제외) ──────────────────────────────
    // 기본 28% (= 기존 23% + 5% 사용자 요청 보너스) + 크리그 행성 보너스
    // 편대편성 "나포 거절" 토글이 켜져 있으면 나포 대신 즉시 매각하여 크레딧 획득
    const _capturedShips=[];
    let _autoSoldRevenue=0,_autoSoldCount=0;
    if(!combatState.isBoss){
      const _capBase=0.28;
      const _facBonus=(getFactionPassive().captureBns||0)/100;
      const _capRate=Math.min(0.55,_capBase+_facBonus);
      const _decline=!!G.declineCapture;
      combatState.enemies.forEach(e=>{
        if(e.hp>0)return;  // 살아남은 적은 못 나포
        if(Math.random()>=_capRate)return;
        // 적 함선 데이터 → CAP_ 함선 변환
        const cap={
          id:'CAP_'+Date.now()+'_'+Math.floor(Math.random()*9999),
          nm:'🏴 '+(e.nm||'나포함선'),
          tier:e.tier||'소형',
          maxHP:Math.max(50,Math.floor((e.maxHP||100)*0.7)),
          hp:Math.max(50,Math.floor((e.maxHP||100)*0.4)),
          maxSH:Math.max(0,Math.floor((e.maxSH||0)*0.6)),
          sh:0,
          ATT:Math.floor((e.ATT||0)*0.8),
          INT:Math.floor((e.INT||0)*0.8),
          TEC:Math.floor((e.TEC||0)*0.8),
          HP:Math.max(50,Math.floor((e.maxHP||100)*0.7)),
          LOY:35,parts:[],crewIds:[],cargoSlots:5
        };
        if(_decline){
          // 나포 거절: 즉시 매각하여 크레딧으로 환산
          const sp=getShipSellPrice(cap);
          _autoSoldRevenue+=sp.total;_autoSoldCount++;
        } else {
          // 편대/임시창 통합 슬롯이 모두 가득 차면 나포 포기
          if((G.fleet||[]).length>=16 && ((G.reserveFleet||[]).length)>=8)return;
          addShipToFleet(cap);
          _capturedShips.push(cap);
        }
      });
      if(_capturedShips.length>0){
        addCombatLog(`🏴 적함 나포! ${_capturedShips.length}척 편대 합류 (LOY 35%)`,'gold');
        notify(`🏴 적함 ${_capturedShips.length}척 나포!`,'gold');
      }
      if(_autoSoldCount>0){
        G.credits=(G.credits||0)+_autoSoldRevenue;
        addCombatLog(`🚫 나포 거절 — 나포함선 ${_autoSoldCount}척 즉시 매각: +₡${_autoSoldRevenue.toLocaleString()}`,'gold');
        notify(`💰 나포 거절 → 매각 ${_autoSoldCount}척 +₡${_autoSoldRevenue.toLocaleString()}`,'gold');
      }
    }
    // 🎉 승리 효과음 + 획득 보고 팝업
    try{AudioMgr.playSfx('notify',{vol:0.8,cooldown:60});}catch(e){}
    try{AudioMgr.playSfx('coin',{vol:0.7,cooldown:200});}catch(e){}
    // 로컬 캡쳐 (setTimeout 내에서도 안전하게) — combatState는 1800ms 후 null이 되므로 미리 스냅샷
    const _isBossWin=!!combatState.isBoss;
    const _enemyCountSnap=(combatState.enemies||[]).length;
    // 보고 팝업 구성 (보스/일반 공통)
    const _buildReport=()=>{
      const items=[];
      items.push({ic:'💰',nm:'전투 보상 크레딧',type:'크레딧',color:'var(--gold)',stats:`+₡${earned.toLocaleString()}`,desc:`전투 후 약탈 자금 (보상 배율 ×${getDiffMult().toFixed(2)})`});
      if(_repGained>0)items.push({ic:'⭐',nm:'명성',type:'평판',color:'var(--cyan)',stats:`+${_repGained} (현재 ${G.reputation})`,desc:'해적/치크스 격파로 사령관 평판 상승'});
      const enemyCount=_enemyCountSnap;
      items.push({ic:'☠️',nm:'격파 적함',type:_kindLbl,color:'var(--red)',stats:`${enemyCount}척 전멸`,desc:'적 함대 전원 격파 완료'});
      _capturedShips.forEach(s=>{
        items.push({ic:'🏴',nm:s.nm,type:s.tier+'급 나포함선',color:'#ff8844',stats:`ATT+${s.ATT} HP+${s.maxHP} (충성도 35%)`,desc:'전투 중 무력화 후 편대 합류 — 정비소에서 크루 배치 및 충성도 관리 필요'});
      });
      if(_autoSoldCount>0){
        items.push({ic:'💰',nm:`나포 거절 — 자동 매각 ${_autoSoldCount}척`,type:'즉시 환금',color:'var(--gold)',stats:`+₡${_autoSoldRevenue.toLocaleString()}`,desc:'편대편성 「나포 거절」 ON 상태 → 나포 함선을 받지 않고 즉시 매각하여 크레딧으로 환산.'});
      }
      if(!_isBossWin){
        const hp=getPlanetHubProgress(pid),thr=_getHubThr(pid);
        items.push({ic:'🏛️',nm:'행성 허브 진행도',type:'해금 진행',color:'var(--cyan)',stats:`${hp}/${thr.s3}`,desc:'광장/도크/프론트 단계적 해금'});
      }
      // 보스 전용: 신화 파츠 4종 + 보너스 크레딧 + 우르사 함선
      if(_isBossWin){
        items.push({ic:'💰',nm:'보스 격파 보너스',type:'크레딧',color:'var(--gold)',stats:`+₡10,000,000`,desc:'지구 해방의 대가. 100년 봉쇄의 청산금.'});
        items.push({ic:'🏴',nm:'우르사 메이저 (나포)',type:'신화급 함선',color:'#ff66cc',stats:`HP 10,000,000 · ATT 6,000 · 신화 파츠 4종 풀세트`,desc:'적 기함을 노획하여 아군 함대에 편입. 압도적 화력의 함대 주력으로 활용 가능.'});
        items.push({ic:'⚔️',nm:'허메틱 포 ✦신화',type:'무기',color:'#ff66cc',stats:'ATT +320',desc:'우르사 메이저 주포 노획. 연속 공격 확률 +40%.',rarity:'mythic'});
        items.push({ic:'🛡️',nm:'크로노스 방벽 ✦신화',type:'실드',color:'#ff66cc',stats:'INT +280 · 실드 +8000',desc:'피격 반사 20% + 매 턴 maxSH 15% 자가 복구.',rarity:'mythic'});
        items.push({ic:'🪖',nm:'아다만 선체 ✦신화',type:'장갑',color:'#ff66cc',stats:'HP +12000 · DEF +120',desc:'치명타 피해 50% 감소.',rarity:'mythic'});
        items.push({ic:'⚙️',nm:'타키온 드라이브 ✦신화',type:'엔진',color:'#ff66cc',stats:'TEC +320',desc:'이동 후 ATT +50 (1턴). 모든 행성 즉시 이동 가능.',rarity:'mythic'});
        // 추가 신화 설계도 (미보유 시에만 보상 표시)
        if(G.blueprints&&G.blueprints.RB10){
          items.push({ic:'📜',nm:'영혼 흡수 매트릭스 설계도 ✦신화',type:'신화 설계도',color:'#cc66ff',stats:'장갑',desc:'제작소에서 영혼 흡수 매트릭스 신화 장갑을 제작 가능. 보스 격파 보너스로 자동 지급.',rarity:'mythic'});
        }
        if(G.blueprints&&G.blueprints.LGD03){
          items.push({ic:'📜',nm:'렐러티비티 설계도 ✦신화',type:'신화 함선 설계도',color:'#cc66ff',stats:'대형 신화 기함',desc:'제작소에서 렐러티비티 신화 함선을 제작 가능. 보스 격파 보너스로 자동 지급.',rarity:'mythic'});
        }
      }
      return items;
    };
    if(_isBossWin){
      // ── 보스 격파: 격정적 에필로그 → 특별 셀레브레이션 → 보상 보고 (지구 해방 엔딩) ──
      // 1) ACT 4로 승격 + 지구 해방 플래그 (P31 배경이 P31_free.jpg로 자동 전환)
      if(G.act<4)G.act=4;
      G._earthLiberated=true;
      // 2) 함선을 지구(P31)로 즉시 이동 — 엔딩 직후 안착 위치
      //    P31은 일반 행성처럼 경매·세금·투자 가능. 이미지/BGM은 우선 P22 자산 사용(추후 교체).
      G.currentPlanet='P31';
      if(!G.planets)G.planets={};
      if(!G.planets['P31']){G.planets['P31']={fog:'A',owned:false,commerce:0};}
      else{G.planets['P31'].fog='A';}
      // 3) 보스 BGM → 지구(P31) 테마 = 엔딩 BGM 으로 전환
      try{AudioMgr.playBgm('P31');}catch(e){}
      // 4) 1800ms 정리 타이머가 BGM/탭을 덮어쓰지 않도록 플래그
      combatState._bossEndingActive=true;
      saveGame(true);
      setTimeout(()=>showBossVictoryEpilogue(()=>{
        showBossCelebration(()=>{
          showAcquisitionReport({
            title:'🏆 최종 전투 승리 — 지구 해방 보고서',
            subtitle:`우르사 메이저 격파 — TURN ${G.turn} · 100년 봉쇄 종식`,
            items:_buildReport(),
            color:'#ffd700',
            sfx:null,
            congrats:'🌍 지구 해방! 100년 봉쇄 종식! 🌍',
            // 보상 확인 후 — 어두운 화면 + 영웅/주인공 대사 + 엔딩 크레딧 → 보이드 페이즈
            onClose:()=>{
              showEndingCredits(()=>{
                G._earthLiberated=true;
                saveGame(true);
                // 엔딩 크레딧 후 — 보이드 페이즈로 자연스럽게 전환
                baekgu(`${G.profile?.name||'사령관'}, 지구는 자유야. 이제부터는 새로운 시대 — 별들이 우리의 친구야. 자유롭게 항해해도 좋아.`);
              });
            }
          });
        });
      }),600);
    } else {
      setTimeout(()=>{
        showAcquisitionReport({title:'🏆 전투 승리 보고',subtitle:`${pd.nm||'알 수 없는 구역'} — TURN ${G.turn}`,items:_buildReport(),color:'var(--gold)',sfx:null,congrats:_capturedShips.length>0?'완승 + 적함 '+_capturedShips.length+'척 나포!':'완승!'});
      },900);
    }
    checkQuestCombatDone();
  } else {
    addCombatLog('💀 전투 패배...','err');
    const penalty=Math.floor(G.credits*0.1);
    G.credits=Math.max(100,G.credits-penalty);
    earned=-penalty;
    addCombatLog(`💸 크레딧 패널티 -₡${penalty.toLocaleString()}`,'err');
    notify('💀 전투 패배. 크레딧 -10%','err');
  }
  // 전투 기록 저장 (렌더링이 참조하는 필드 모두 포함)
  if(!G.combatHistory)G.combatHistory=[];
  const _pdef=pd&&pd.nm?pd:(PLANET_DEF.find(p=>p.id===pid)||{});
  G.combatHistory.push({
    win,pid,planetId:pid,
    planet:_pdef.nm||'알 수 없음',
    turn:combatState.turn,
    earned,
    gameTurn:G.turn
  });
  G.fleet.forEach(s=>{const cs=combatState.players.find(p=>p.id===s.id);if(cs){s.hp=Math.max(1,cs.hp);}});
  updateHUD();saveGame(true);
  // 퀘스트 전투 완료 시 퀘스트 탭으로 이동, 그 외 메인으로
  const _hasQDone=(G.quests[G.currentPlanet]||[]).some(function(q){return q.status==='done';});
  // 보스 승리 엔딩이 활성화된 경우, 1800ms 정리 타이머는 BGM/탭 덮어쓰기를 스킵.
  // showEndingCredits 이후 자체적으로 P22(지구) 안착·BGM 유지하도록 한다.
  const _bossEnding=!!(combatState&&combatState._bossEndingActive);
  setTimeout(()=>{
    combatState=null;
    // 전투 종료 시 메모리 정리: 이미지 캐시(보스 1전투 후 다시 안 씀)와 잔류 이펙트/위치 비우기
    try{_cbCacheClear();}catch(e){}
    _cbEffects=[];_unitPos={};
    if(_cbAnimReq){cancelAnimationFrame(_cbAnimReq);_cbAnimReq=null;}
    if(_bossEnding){
      // 보스 엔딩 진행 중: 행성 BGM/허브탭 전환을 showEndingCredits에 위임
      return;
    }
    try{AudioMgr.playBgm(_planetBgmName(G.currentPlanet));}catch(e){}
    hubTab(_hasQDone?'quest':'main');
  },1800);
}

// ── 이순신 일점사 전술 ──────────────────────────────────────────
// 발동 효과: ① 적 1척 즉시 격침 (선두) ② 남은 전투 내내 아군 공격력 ×2
// 일점사 후 30초 뒤 → 학익진 버튼 활성화 (아군 ATT ×3 추가 강화)
function activateSunsinFocus(){
  if(!combatState||combatState._sunsinUsed||combatState.done)return;
  const target=combatState.enemies.filter(e=>e.hp>0)[0];
  if(!target)return;
  combatState._sunsinUsed=true;
  combatState._playerAttMult=2;  // 남은 전투 동안 아군 ATT ×2
  // 이미 활성화된 함선들의 ATT 즉시 갱신 (combatState.players의 캐시된 ATT를 2배로)
  if(combatState.players){
    combatState.players.forEach(p=>{
      if(!p._origATT)p._origATT=p.ATT;
      p.ATT=Math.round(p._origATT*2);
    });
  }
  target.hp=0;target.sh=0;
  addCombatLog(`⚔️ 이순신 일점사! ${target.nm} 즉시 격침! 아군 함대 공격력 ×2 강화!`,'gold');
  notify('⚔️ 이순신 일점사! 아군 ATT ×2','gold');
  baekgu('와! 이순신 장군 일점사야! 적 선두 한 방에 보내버렸어. 함대 화력 두 배! 학익진 준비할 시간 10초!');
  const sbtn=document.getElementById('cb-sunsin-btn');
  if(sbtn)sbtn.disabled=true;
  drawCombatFrame();
  const stillAliveEn=combatState.enemies.filter(u=>u.hp>0).length;
  if(!stillAliveEn){setTimeout(_finishCombat,600);return;}
  // ── 10초 후 학익진 버튼 활성화 (ATT ×3 추가) ──────────────────
  combatState._haikjinPending=true;
  setTimeout(()=>{
    if(!combatState||combatState.done||!combatState._haikjinPending||combatState._haikjinUsed)return;
    _showHaikjinButton();
    addCombatLog(`🦅 진형 변환 가능! 학익진 버튼 활성화 — 클릭 시 아군 ATT ×3`,'gold');
    notify('🦅 학익진 진형 준비 완료!','gold');
  },10000);
}

// 학익진 버튼 생성 (일점사 발동 10초 후)
function _showHaikjinButton(){
  if(document.getElementById('cb-haikjin-btn'))return;
  const hdr=document.getElementById('cb-hdr');
  if(!hdr)return;
  const hbtn=document.createElement('button');
  hbtn.id='cb-haikjin-btn';
  hbtn.className='btn btn-sm';
  hbtn.style.cssText='padding:3px 10px;font-size:13px;border-color:var(--gold);color:var(--gold);background:rgba(255,215,0,.12);animation:pulse 1.4s infinite;margin-left:4px';
  hbtn.textContent='🦅 학익진';
  hbtn.title='이순신 학익진: 함대 진형 변환으로 공격력 ×3 (일점사 ×2와 별도 누적, 전투 1회)';
  hbtn.onclick=activateHaikjin;
  hdr.appendChild(hbtn);
}

// 학익진 전술 — 아군 ATT ×3 (일점사 ×2 위에 덮어쓰기, 즉 원본 대비 ×3)
function activateHaikjin(){
  if(!combatState||combatState._haikjinUsed||combatState.done)return;
  combatState._haikjinUsed=true;
  combatState._playerAttMult=3;
  if(combatState.players){
    combatState.players.forEach(p=>{
      if(!p._origATT)p._origATT=p.ATT;
      p.ATT=Math.round(p._origATT*3);
    });
  }
  addCombatLog(`🦅 학익진 전개! 아군 함대 공격력 ×3 강화! 전 함대, 적을 양익으로 포위하라!`,'gold');
  notify('🦅 학익진! 아군 ATT ×3','gold');
  baekgu('학익진이다! 함대가 양 날개로 포위! 적을 가운데로 몰아넣어. 화력 3배 폭격! 다음은 아인슈타인의 시간차공격이야!');
  const hbtn=document.getElementById('cb-haikjin-btn');
  if(hbtn)hbtn.disabled=true;
  drawCombatFrame();
  // ── 학익진 10초 후 → 아인슈타인 시간차공격 버튼 활성화 (ATT ×4) ──
  // H06(아인슈타인) 영입 시에만 활성화
  if(!G.heroes||!G.heroes.includes('H06'))return;
  combatState._einsteinPending=true;
  setTimeout(()=>{
    if(!combatState||combatState.done||!combatState._einsteinPending||combatState._einsteinUsed)return;
    _showEinsteinButton();
    addCombatLog(`⏳ 아인슈타인 시간차공격 준비 완료! 클릭 시 아군 ATT ×4`,'gold');
    notify('⏳ 아인슈타인 시간차공격 준비!','gold');
  },10000);
}

// 아인슈타인 시간차공격 버튼 생성 (학익진 발동 30초 후)
function _showEinsteinButton(){
  if(document.getElementById('cb-einstein-btn'))return;
  const hdr=document.getElementById('cb-hdr');
  if(!hdr)return;
  const ebtn=document.createElement('button');
  ebtn.id='cb-einstein-btn';
  ebtn.className='btn btn-sm';
  ebtn.style.cssText='padding:3px 10px;font-size:13px;border-color:#cc66ff;color:#cc66ff;background:rgba(204,102,255,.12);animation:pulse 1.2s infinite;margin-left:4px';
  ebtn.textContent='⏳ 시간차공격';
  ebtn.title='아인슈타인 시간차공격: 상대성 이론을 이용한 동시 다중 시간축 타격. 공격력 ×4 (전투 1회)';
  ebtn.onclick=activateEinsteinTimeAttack;
  hdr.appendChild(ebtn);
}

// 아인슈타인 시간차공격 — 아군 ATT ×4
function activateEinsteinTimeAttack(){
  if(!combatState||combatState._einsteinUsed||combatState.done)return;
  combatState._einsteinUsed=true;
  combatState._playerAttMult=4;
  if(combatState.players){
    combatState.players.forEach(p=>{
      if(!p._origATT)p._origATT=p.ATT;
      p.ATT=Math.round(p._origATT*4);
    });
  }
  addCombatLog(`⏳ 아인슈타인 시간차공격! 상대성 이론에 따라 다중 시간축 동시 타격! 아군 공격력 ×4!`,'gold');
  notify('⏳ 시간차공격! 아군 ATT ×4','gold');
  baekgu('아인슈타인의 상대성 이론! 시간축이 휘어진다! 적은 한 번 맞는데 우린 네 번 친다. 다음은 테슬라의 초공간 채널!');
  const ebtn=document.getElementById('cb-einstein-btn');
  if(ebtn)ebtn.disabled=true;
  drawCombatFrame();
  // ── 시간차공격 10초 후 → 테슬라 초공간 버튼 활성화 (ATT ×5) ──
  // H07(니콜라 테슬라) 영입 시에만 활성화
  if(!G.heroes||!G.heroes.includes('H07'))return;
  combatState._teslaPending=true;
  setTimeout(()=>{
    if(!combatState||combatState.done||!combatState._teslaPending||combatState._teslaUsed)return;
    _showTeslaButton();
    addCombatLog(`⚡ 테슬라 초공간 채널 형성 완료! 클릭 시 아군 ATT ×5`,'gold');
    notify('⚡ 테슬라 초공간 준비!','gold');
  },10000);
}

// 테슬라 초공간 버튼 생성 (시간차공격 발동 10초 후)
function _showTeslaButton(){
  if(document.getElementById('cb-tesla-btn'))return;
  const hdr=document.getElementById('cb-hdr');
  if(!hdr)return;
  const tbtn=document.createElement('button');
  tbtn.id='cb-tesla-btn';
  tbtn.className='btn btn-sm';
  tbtn.style.cssText='padding:3px 10px;font-size:13px;border-color:#66ffff;color:#66ffff;background:rgba(0,255,255,.12);animation:pulse 1s infinite;margin-left:4px;text-shadow:0 0 6px rgba(0,255,255,.6)';
  tbtn.textContent='⚡ 테슬라 초공간';
  tbtn.title='테슬라 초공간 채널링: 전자기 초공간 도관을 열어 광속 너머의 충격파 전송. 공격력 ×5 (전투 1회)';
  tbtn.onclick=activateTeslaHyperspace;
  hdr.appendChild(tbtn);
}

// 테슬라 초공간 — 아군 ATT ×5
function activateTeslaHyperspace(){
  if(!combatState||combatState._teslaUsed||combatState.done)return;
  combatState._teslaUsed=true;
  combatState._playerAttMult=5;
  if(combatState.players){
    combatState.players.forEach(p=>{
      if(!p._origATT)p._origATT=p.ATT;
      p.ATT=Math.round(p._origATT*5);
    });
  }
  addCombatLog(`⚡ 테슬라 초공간 채널 개방! 전자기 도관을 통한 광속 너머 번개 충격파! 아군 공격력 ×5!`,'gold');
  notify('⚡ 테슬라 초공간! 아군 ATT ×5 + 번개 충격파','gold');
  baekgu('테슬라의 전자기 초공간! 함선 무기가 번개로 변했어! 영웅 7명 있으면 다음은 제네시스 임펙트야. 폭딜의 시작!');
  // 발동 순간 전기장 플래시 — 모든 아군 함선 위치에 번개 폭발
  if(combatState.players&&_unitPos){
    let _flashDelay=0;
    combatState.players.forEach(p=>{
      if(p.hp<=0)return;
      const pos=_unitPos[p.id];
      if(!pos)return;
      const a=_txPos(pos);
      _cbEffects.push({type:'exp',x:a.x,y:a.y,col:'#66ddff',r:30,life:24,maxLife:24,delay:_flashDelay});
      _cbEffects.push({type:'shockwave',x:a.x,y:a.y,col:'#aaeeff',r:60,life:30,maxLife:30,delay:_flashDelay});
      _flashDelay+=2;
    });
    _cbStartAnimLoop();
  }
  const tbtn=document.getElementById('cb-tesla-btn');
  if(tbtn)tbtn.disabled=true;
  drawCombatFrame();
  // ── 테슬라 10초 후 → 제네시스 임펙트 버튼 활성화 (ATT ×6) ──
  // 영웅 7명 이상 영입 시에만 활성화
  if(!G.heroes||G.heroes.length<7)return;
  combatState._genesisPending=true;
  setTimeout(()=>{
    if(!combatState||combatState.done||!combatState._genesisPending||combatState._genesisUsed)return;
    _showGenesisButton();
    addCombatLog(`✦ 제네시스 임펙트 차원 정렬 완료! 영웅 ${G.heroes.length}명의 의지가 한 점에 모인다. 클릭 시 아군 ATT ×6`,'gold');
    notify('✦ 제네시스 임펙트 준비!','gold');
  },10000);
}

// 제네시스 임펙트 버튼 생성 (테슬라 발동 10초 후)
function _showGenesisButton(){
  if(document.getElementById('cb-genesis-btn'))return;
  const hdr=document.getElementById('cb-hdr');
  if(!hdr)return;
  const gbtn=document.createElement('button');
  gbtn.id='cb-genesis-btn';
  gbtn.className='btn btn-sm';
  gbtn.style.cssText='padding:3px 10px;font-size:13px;border-color:#ff66cc;color:#ff66cc;background:rgba(255,102,204,.15);animation:pulse .9s infinite;margin-left:4px;text-shadow:0 0 8px rgba(255,102,204,.7)';
  gbtn.textContent='✦ 제네시스 임펙트';
  gbtn.title='제네시스 임펙트: 창세의 일격. 공격력 ×6 (전투 1회)';
  gbtn.onclick=activateGenesisImpact;
  hdr.appendChild(gbtn);
}

// 제네시스 임펙트 — 아군 ATT ×6
function activateGenesisImpact(){
  if(!combatState||combatState._genesisUsed||combatState.done)return;
  combatState._genesisUsed=true;
  combatState._playerAttMult=6;
  if(combatState.players){
    combatState.players.forEach(p=>{
      if(!p._origATT)p._origATT=p.ATT;
      p.ATT=Math.round(p._origATT*6);
    });
  }
  addCombatLog(`✦ 제네시스 임펙트! 창세의 일격이 적함을 시공간에서 분리한다! 아군 공격력 ×6!`,'gold');
  notify('✦ 제네시스 임펙트! 아군 ATT ×6','gold');
  baekgu('제네시스 임펙트! 영웅 7명의 의지가 한 점에 모였어! 적은 시공간에서 사라진다. 다음은 진짜야 — 데스티네이션 어스!');
  const gbtn=document.getElementById('cb-genesis-btn');
  if(gbtn)gbtn.disabled=true;
  drawCombatFrame();
  // ── 제네시스 10초 후 → 데스티네이션 어스 버튼 활성화 (ATT ×10) ──
  // 영웅 8명 모두 영입 시에만 활성화
  if(!G.heroes||G.heroes.length<8)return;
  combatState._destinationPending=true;
  setTimeout(()=>{
    if(!combatState||combatState.done||!combatState._destinationPending||combatState._destinationUsed)return;
    _showDestinationButton();
    addCombatLog(`🌍 데스티네이션 어스 — 최종 강하! 영웅 8명 모두의 의지가 집결한다. 클릭 시 아군 ATT ×10`,'gold');
    notify('🌍 데스티네이션 어스 준비!','gold');
  },10000);
}

// 데스티네이션 어스 버튼 생성 (제네시스 발동 10초 후)
function _showDestinationButton(){
  if(document.getElementById('cb-destination-btn'))return;
  const hdr=document.getElementById('cb-hdr');
  if(!hdr)return;
  const dbtn=document.createElement('button');
  dbtn.id='cb-destination-btn';
  dbtn.className='btn btn-sm';
  dbtn.style.cssText='padding:4px 12px;font-size:13px;border:2px solid #ffd700;color:#ffd700;background:linear-gradient(135deg,rgba(255,215,0,.18),rgba(255,100,200,.18),rgba(102,255,255,.18));animation:pulse .7s infinite;margin-left:4px;text-shadow:0 0 10px gold;font-weight:bold';
  dbtn.textContent='🌍 데스티네이션 어스';
  dbtn.title='데스티네이션 어스: 인류의 운명을 건 최종 강하. 공격력 ×10 (전투 1회)';
  dbtn.onclick=activateDestinationEarth;
  hdr.appendChild(dbtn);
}

// 데스티네이션 어스 — 아군 ATT ×10 (콤보 최종)
function activateDestinationEarth(){
  if(!combatState||combatState._destinationUsed||combatState.done)return;
  combatState._destinationUsed=true;
  combatState._playerAttMult=10;
  if(combatState.players){
    combatState.players.forEach(p=>{
      if(!p._origATT)p._origATT=p.ATT;
      p.ATT=Math.round(p._origATT*10);
    });
  }
  addCombatLog(`🌍 데스티네이션 어스! 100년 봉쇄를 깨뜨린 인류의 의지 — 아군 공격력 ×10! 모든 화력을 쏟아부어라!`,'gold');
  notify('🌍 데스티네이션 어스! 아군 ATT ×10','gold');
  baekgu('데스티네이션 어스!! 8명 영웅의 의지 + 100년 봉쇄를 깬 인류의 분노! 화력 10배! 적은 사라진다 — 우주의 정의를 보여줘!');
  const dbtn=document.getElementById('cb-destination-btn');
  if(dbtn)dbtn.disabled=true;
  drawCombatFrame();
}

// ── 저장 / 불러오기 ──────────────────────────────────────────────
const SAVE_KEY='de_save';
// ══════════════════════════════════════════════════════════════════
// 10슬롯 저장/불러오기 시스템 (클라우드 동기화 지원)
// ══════════════════════════════════════════════════════════════════
const SAVE_SLOTS=8;
function _slotKey(n){return n===0?'de_save':'de_save_s'+n;}  // 슬롯0 = 레거시 키 호환

// 특정 슬롯 정보 읽기
function _getSlotInfo(n){
  try{
    const raw=localStorage.getItem(_slotKey(n));
    if(!raw)return null;
    const info=JSON.parse(raw);
    if(info&&(info.turn!==undefined||info.fleet))return info;
  }catch(e){}
  return null;
}

// 슬롯에 저장 (로컬 + 클라우드)
function saveGame(silent,slotN){
  const n=(slotN!=null)?slotN:1;
  try{
    // 1) 사이즈 폭증 방지: 전투 기록 마지막 100건만 유지 (이전: 무제한)
    if(G.combatHistory&&G.combatHistory.length>100){
      G.combatHistory=G.combatHistory.slice(-100);
    }
    // 2) 스냅샷 직렬화 (순환참조 방지)
    const snap=JSON.parse(JSON.stringify(G));
    snap._ver=2;snap._saved=Date.now();snap._slotN=n;
    const payload=JSON.stringify(snap);
    // 3) 자동 백업: 저장 전에 기존 데이터를 백업 슬롯(_bk)에 복사 (롤백 가능)
    try{
      const prev=localStorage.getItem(_slotKey(n));
      if(prev&&prev.length>100)localStorage.setItem(_slotKey(n)+'_bk',prev);
    }catch(_){}
    // 4) 메인 저장
    localStorage.setItem(_slotKey(n),payload);
    // 5) 사이즈 경고 (4MB 초과 시)
    if(payload.length>4*1024*1024&&!silent){
      notify('⚠️ 저장 크기 '+(payload.length/1024/1024).toFixed(1)+'MB — 일부 데이터 정리 권장','warn');
    }
    // 6) 클라우드 업로드 (디바운스 1초)
    try{if(window.CloudSave)CloudSave.upload(n,snap);}catch(e){}
    // 이메일 등록 시 이메일 슬롯에도 동시 업로드 (간편 클라우드)
    try{if(window.CloudSave&&CloudSave.getEmail&&CloudSave.getEmail())CloudSave.uploadByEmail(n,snap);}catch(e){}
    if(!silent)notify('💾 슬롯 '+n+' 저장 완료 ('+Math.round(payload.length/1024)+'KB)','ok');
  }catch(e){
    // 저장 실패 — quota 초과 등. 백업에서 복구 시도
    console.error('[saveGame] failed',e);
    if(!silent)notify('❌ 저장 실패: '+e.message+' — 자동 복구 시도','err');
    // QuotaExceededError 처리: 다른 슬롯의 불필요한 데이터 정리
    if(e.name==='QuotaExceededError'||(''+e.message).includes('quota')){
      try{
        // 다른 백업 슬롯 정리
        for(let i=0;i<=8;i++){
          try{localStorage.removeItem(_slotKey(i)+'_bk');}catch(_){}
        }
        // 재시도
        const snap2=JSON.parse(JSON.stringify(G));
        snap2._ver=2;snap2._saved=Date.now();snap2._slotN=n;
        localStorage.setItem(_slotKey(n),JSON.stringify(snap2));
        if(!silent)notify('✅ 백업 정리 후 저장 성공','ok');
      }catch(e2){
        if(!silent)notify('❌ 저장 재시도 실패: '+e2.message,'err');
      }
    }
  }
}

// 자동 복구: 현재 슬롯이 손상되었거나 비었다면 백업에서 복원
function _tryRecoverSlot(n){
  try{
    const raw=localStorage.getItem(_slotKey(n));
    if(raw&&raw.length>100){
      try{JSON.parse(raw);return false;}catch(_){}  // 정상 → 복구 불필요
    }
    const bk=localStorage.getItem(_slotKey(n)+'_bk');
    if(!bk||bk.length<100)return false;
    JSON.parse(bk);  // 백업 검증
    localStorage.setItem(_slotKey(n),bk);
    console.log('[saveGame] recovered slot',n,'from backup');
    return true;
  }catch(e){console.warn('[saveGame] recover failed',e);return false;}
}

// 슬롯에서 불러오기
function loadGame(slotN){
  const n=(slotN!=null)?slotN:1;
  try{
    // 슬롯 n 우선, 없으면 레거시 슬롯0 시도
    let snap=_getSlotInfo(n);
    if(!snap&&n===1)snap=_getSlotInfo(0); // 레거시 호환
    // 없으면 백업 슬롯에서 자동 복구 시도
    if(!snap){
      if(_tryRecoverSlot(n)){snap=_getSlotInfo(n);if(snap)notify('🔄 슬롯 '+n+' 백업에서 자동 복구됨','gold');}
      else if(n===1&&_tryRecoverSlot(0)){snap=_getSlotInfo(0);if(snap)notify('🔄 레거시 슬롯 백업 복구됨','gold');}
    }
    if(!snap){notify('슬롯 '+n+' 에 저장 데이터가 없습니다','err');return false;}
    Object.assign(G,snap);
    // 필수 필드 보완
    if(!G.mapPositions||!Object.keys(G.mapPositions).length){G.mapPositions=generateGalaxy(1000);G.mapConns=buildConnections(G.mapPositions);}
    // 항로(mapConns) 누락 보정 — 이게 없으면 모든 이동이 차단됨 (구버전 세이브 호환)
    if(!G.mapConns||!Array.isArray(G.mapConns)||G.mapConns.length===0){G.mapConns=buildConnections(G.mapPositions);}
    if(!G.shopStock)G.shopStock={};
    if(!G.blueprints)G.blueprints={};
    if(!G.reputation)G.reputation=0;
    if(!G.hallOfFame)G.hallOfFame=[];
    if(G.difficulty===undefined)G.difficulty='normal';
    if(!G.heroes)G.heroes=[];
    if(!G.crew)G.crew=[];
    if(!G.planets||!Object.keys(G.planets).length)G.planets={};
    // 불러오기 후 함선 HP 보정
    if(G.fleet&&G.fleet.length){
      G.fleet.forEach(s=>{
        const st=getShipStats(s);
        if(!s.hp||s.hp<=0)s.hp=st.HP;
        if(!s.maxHP||s.maxHP<=0)s.maxHP=st.HP;
        if(s.sh===undefined||s.sh===null)s.sh=st.maxSH;
        if(!s.maxSH)s.maxSH=st.maxSH;
      });
    }
    return true;
  }catch(e){notify('불러오기 실패: '+e.message,'err');return false;}
}

// 슬롯 카드 HTML 생성 (저장/불러오기 공용)
function _renderSlotCard(n,mode){
  // 슬롯 1은 레거시(de_save) 도 체크
  let info=_getSlotInfo(n);
  if(!info&&n===1)info=_getSlotInfo(0);
  let dateStr='',hasData=false;
  let flagship=null,flagImgHtml='',flagName='',planetName='';
  if(info){
    hasData=true;
    try{dateStr=new Date(info._saved).toLocaleString('ko-KR');}catch(e){dateStr='';}
    // 기함 이미지
    if(info.fleet&&info.fleet.length>0){
      flagship=info.fleet[0];
      const src=shipImgSrc(flagship);
      const tierIc={신화:'✦',전설기함:'⚑',대형:'🌟',중형:'🚀',소형:'🛸'}[flagship.tier]||'🛸';
      flagImgHtml=imgOrEmoji(src,tierIc,60,60,'border-radius:6px;background:rgba(0,0,0,.6);object-fit:contain;flex-shrink:0');
      flagName=flagship.nm||'함선';
    } else {
      flagImgHtml=`<div style="width:60px;height:60px;border-radius:6px;background:rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0">🛸</div>`;
      flagName='함선 없음';
    }
    // 현재 행성 이름
    if(info.currentPlanet){
      const pd2=(typeof PLANET_DEF!=='undefined'?PLANET_DEF:[]).find(p=>p.id===info.currentPlanet);
      planetName=pd2?pd2.nm:info.currentPlanet;
    }
  }
  const slotEmoji=n===1?'🥇':n===2?'🥈':n===3?'🥉':'💾';
  const cardBg=hasData?'rgba(0,243,255,.06)':'rgba(255,255,255,.03)';
  const cardBorder=hasData?'1px solid rgba(0,243,255,.3)':'1px dashed rgba(255,255,255,.1)';
  let actionBtn='';
  if(mode==='save'){
    actionBtn=`<button class="btn btn-sm ${hasData?'btn-red':''}" style="flex-shrink:0;padding:3px 10px;font-size:12px"
      onclick="saveGame(false,${n});showSaveSlots()">
      ${hasData?'덮어쓰기':'💾 저장'}
    </button>`;
  } else {
    if(hasData){
      actionBtn=`<button class="btn btn-sm btn-gold" style="flex-shrink:0;padding:3px 10px;font-size:12px"
        onclick="if(loadGame(${n})){showHub();notify('📂 슬롯 ${n} 불러오기 완료','ok');closeModal();}">
        📂 불러오기
      </button>`;
    } else {
      actionBtn=`<button class="btn btn-sm" disabled style="flex-shrink:0;padding:3px 10px;font-size:12px;opacity:.35">비어있음</button>`;
    }
  }
  if(!hasData){
    return `<div style="background:${cardBg};border:${cardBorder};border-radius:8px;padding:10px 12px;margin-bottom:8px;display:flex;align-items:center;gap:10px">
      <div style="font-size:20px;flex-shrink:0">${slotEmoji}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:bold;font-size:13px;margin-bottom:2px;color:var(--txt)">슬롯 ${n}</div>
        <div style="color:var(--dim);font-size:12px">— 비어있음 —</div>
      </div>
      ${actionBtn}
    </div>`;
  }
  return `<div style="background:${cardBg};border:${cardBorder};border-radius:8px;padding:10px 12px;margin-bottom:8px;display:flex;align-items:center;gap:10px">
    <div style="font-size:18px;flex-shrink:0;align-self:flex-start;margin-top:2px">${slotEmoji}</div>
    ${flagImgHtml}
    <div style="flex:1;min-width:0">
      <div style="font-weight:bold;font-size:13px;margin-bottom:2px;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">⚑ ${flagName}</div>
      <div style="font-size:12px;color:var(--cyan);margin-bottom:1px">
        TURN ${info.turn||0} &nbsp;|&nbsp; ₡${Number(info.credits||0).toLocaleString()} &nbsp;|&nbsp; 함선 ${(info.fleet||[]).length}척
        ${planetName?`&nbsp;|&nbsp; 📍 ${planetName}`:''}
      </div>
      <div style="color:var(--dim);font-size:11px">${dateStr}</div>
    </div>
    ${actionBtn}
  </div>`;
}

// 저장 슬롯 모달
function showSaveSlots(){
  let cards='';
  for(let i=1;i<=SAVE_SLOTS;i++)cards+=_renderSlotCard(i,'save');
  const html=`<div style="padding:4px 0">${cards}</div>`;
  openModal('💾 게임 저장',html,[{txt:'닫기',fn:closeModal,cls:'btn-sm'}],{wide:true});
}

// 불러오기 슬롯 모달
function showLoadSlots(){
  let cards='';
  for(let i=1;i<=SAVE_SLOTS;i++)cards+=_renderSlotCard(i,'load');
  const html=`<div style="padding:4px 0">${cards}</div>`;
  openModal('📂 게임 불러오기',html,[{txt:'닫기',fn:closeModal,cls:'btn-sm'}],{wide:true});
}

// 레거시 호환용 (타이틀 이어하기 버튼)
function _getSaveInfo(){
  // 슬롯1 우선, 없으면 레거시
  const s1=_getSlotInfo(1)||_getSlotInfo(0);
  if(s1)return{info:s1,key:_slotKey(1)};
  return{info:null,key:null};
}

// ── 타이틀 난이도 버튼 ─────────────────────────────────────────
let _titleDiff='normal';
function titleSetDiff(d){
  _titleDiff=d;
  syncDiffButtons(d);
}
function syncDiffButtons(d){
  ['easy','normal','hard','extreme'].forEach(k=>{
    const btn=document.getElementById('tdf-'+k);
    if(!btn)return;
    const active=k===d;
    btn.style.opacity=active?'1':'0.5';
    btn.style.boxShadow=active?'0 0 8px var(--cyan)':'none';
    btn.style.transform=active?'scale(1.08)':'scale(1)';
  });
}

// ── 크레딧 화면 ─────────────────────────────────────────────────
function showCredits(){
  const html=`<div style="text-align:center;line-height:2;padding:8px">
    <div style="font-size:22px;font-weight:bold;color:var(--yellow);margin-bottom:12px">🌌 데스티네이션 어스</div>
    <div style="color:var(--dim);margin-bottom:16px">Destination Earth v1.1</div>
    <div style="margin-bottom:8px"><b>기획</b><br>이완구 (TOY LEE)</div>
    <hr style="border-color:var(--bdr);margin:12px 0">
    <div style="margin-bottom:8px"><b>개발</b><br>Toy Lee · 클로드</div>
    <hr style="border-color:var(--bdr);margin:12px 0">
    <div style="margin-bottom:8px"><b>이미지</b><br>이규빈 · Toy Lee · 제미나이 · 클로드</div>
    <hr style="border-color:var(--bdr);margin:12px 0">
    <div style="margin-bottom:8px"><b>사운드</b><br>Toy Lee · 제미나이 · SUNO AI</div>
    <hr style="border-color:var(--bdr);margin:12px 0">
    <div style="color:var(--dim);font-size:13px">이 게임의 내용은 실제와 연관이 없음을 명확히 합니다.</div>
  </div>`;
  openModal('🎬 크레딧',html,[{txt:'닫기',fn:closeModal,cls:'btn-sm'}],{wide:true});
}

// ── 명예의 전당 ─────────────────────────────────────────────────
function showHallOfFame(){
  const hall=G.hallOfFame||[];
  const rows=hall.length?hall.slice(-10).reverse().map(h=>`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--bdr)"><span>${h.name||'무명'}</span><span style="color:var(--gold)">₡${(h.credits||0).toLocaleString()}</span><span style="color:var(--dim)">${h.date||''}</span></div>`).join(''):'<div style="color:var(--dim);text-align:center;padding:16px">아직 기록이 없습니다</div>';
  const html=`<div style="padding:4px 0">${rows}</div>`;
  openModal('🏆 명예의 전당',html,[{txt:'닫기',fn:closeModal,cls:'btn-sm'}],{wide:true});
}

// ── 피드백 ──────────────────────────────────────────────────────
function showFeedback(){
  // 마지막으로 입력한 아이디 복원
  let _lastId='';
  try{_lastId=localStorage.getItem('de_feedback_id')||'';}catch(e){}
  const html=`<div style="padding:6px 4px">
    <div style="text-align:center;margin-bottom:10px">
      <div style="font-size:30px;margin-bottom:6px">📬</div>
      <div style="font-size:13px;color:var(--dim);line-height:1.6">게임 개선에 도움이 됩니다.<br>의견이나 버그를 자유롭게 적어주세요.</div>
    </div>
    <div style="margin-bottom:10px">
      <label style="display:block;font-size:12px;color:var(--cyan);font-weight:bold;margin-bottom:4px">📛 아이디 / 연락처 <span style="color:var(--dim);font-weight:normal">(선택 — 이메일·디스코드 등)</span></label>
      <input id="fb-id" type="text" maxlength="60" value="${_lastId.replace(/"/g,'&quot;')}" placeholder="예: user@example.com"
        style="width:100%;padding:7px 9px;background:rgba(255,255,255,.06);border:1px solid rgba(0,243,255,.3);border-radius:6px;color:var(--txt);font-family:inherit;font-size:13px;outline:none;box-sizing:border-box"
        onfocus="this.style.borderColor='var(--cyan)'" onblur="this.style.borderColor='rgba(0,243,255,.3)'">
    </div>
    <div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px">
        <label style="font-size:12px;color:var(--cyan);font-weight:bold">✍️ 내용 (500자 이하)</label>
        <span id="fb-count" style="font-size:11px;color:var(--dim)">0 / 500</span>
      </div>
      <textarea id="fb-msg" maxlength="500" rows="7"
        placeholder="버그 제보 / 밸런스 의견 / 신규 기능 제안 등 자유롭게 적어주세요."
        oninput="document.getElementById('fb-count').textContent=this.value.length+' / 500';document.getElementById('fb-count').style.color=this.value.length>=480?'var(--red)':this.value.length>=400?'var(--yellow)':'var(--dim)'"
        style="width:100%;padding:8px 10px;background:rgba(255,255,255,.06);border:1px solid rgba(0,243,255,.3);border-radius:6px;color:var(--txt);font-family:inherit;font-size:13px;line-height:1.6;outline:none;resize:vertical;min-height:120px;box-sizing:border-box"
        onfocus="this.style.borderColor='var(--cyan)'" onblur="this.style.borderColor='rgba(0,243,255,.3)'"></textarea>
    </div>
    <div style="background:rgba(255,255,255,.04);border-radius:6px;padding:8px 10px;font-size:11px;color:var(--dim);line-height:1.6">
      💡 "메일 보내기" 버튼은 기본 메일 앱을 열어 작성한 내용을 미리 채워줍니다. 메일 앱이 없으면 "복사하기"로 클립보드에 복사한 뒤 <span style="color:var(--cyan);font-family:monospace">toy80318@gmail.com</span> 으로 보내주세요.
    </div>
  </div>`;
  openModal('📬 피드백',html,[
    {txt:'📋 복사하기',fn:_copyFeedback,cls:'btn-sm'},
    {txt:'📧 메일 보내기',fn:_sendFeedback,cls:'btn-gold'},
    {txt:'닫기',fn:closeModal,cls:'btn-sm'}
  ],{wide:true});
}
function _gatherFeedback(){
  const id=(document.getElementById('fb-id')?.value||'').trim().slice(0,60);
  const msg=(document.getElementById('fb-msg')?.value||'').trim().slice(0,500);
  return{id,msg};
}
function _saveFeedbackLocal(id,msg){
  try{
    if(id)localStorage.setItem('de_feedback_id',id);
    const log=JSON.parse(localStorage.getItem('de_feedback_log')||'[]');
    log.push({id,msg,ts:new Date().toISOString(),ver:window._GAME_VER||'',turn:G?.turn||0});
    // 최대 20건 보관
    while(log.length>20)log.shift();
    localStorage.setItem('de_feedback_log',JSON.stringify(log));
  }catch(e){}
}
async function _sendFeedback(){
  const{id,msg}=_gatherFeedback();
  if(!msg){notify('내용을 입력해주세요','err');return;}
  _saveFeedbackLocal(id,msg);
  notify('📡 피드백 전송 중...','ok');
  let sent=false;
  // 1차: Firestore 전송 (실제 개발자에게 전달)
  if(window.CloudSave){
    try{
      const r=await CloudSave.sendFeedback(id,msg,{ver:window._GAME_VER||'1.1',turn:G?.turn||0});
      if(r&&r.ok){sent=true;notify('✅ 피드백이 개발자에게 전송됐습니다. 감사합니다!','gold');}
    }catch(e){}
  }
  // 2차 폴백: mailto (Firestore 실패시)
  if(!sent){
    const subject=`[데스티네이션 어스] 피드백${id?' from '+id:''}`;
    const body=`아이디: ${id||'(미입력)'}\n버전: ${window._GAME_VER||'1.1'}\nTURN: ${G?.turn||0}\n\n${msg}`;
    const url='mailto:toy80318@gmail.com?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
    try{window.location.href=url;}catch(e){}
    notify('📧 메일 앱으로 전송합니다 (클라우드 전송 실패 폴백)','warn');
  }
  closeModal();
}
function _copyFeedback(){
  const{id,msg}=_gatherFeedback();
  if(!msg){notify('내용을 입력해주세요','err');return;}
  _saveFeedbackLocal(id,msg);
  const text=`[데스티네이션 어스 피드백]\n아이디: ${id||'(미입력)'}\n버전: ${window._GAME_VER||'1.1'}\nTURN: ${G?.turn||0}\n\n${msg}\n\n→ toy80318@gmail.com 으로 보내주세요`;
  try{
    navigator.clipboard.writeText(text).then(()=>{
      notify('📋 클립보드에 복사 완료! toy80318@gmail.com 으로 붙여넣어 보내주세요','ok');
    }).catch(()=>{
      // 폴백: 수동 복사 안내
      notify('자동 복사 실패 — 텍스트박스에서 직접 복사해주세요','warn');
    });
  }catch(e){
    notify('자동 복사 실패 — 텍스트박스에서 직접 복사해주세요','warn');
  }
}

// ── 설정 모달 ────────────────────────────────────────────────────
function showSettingsModal(){
  const _mPct=Math.round((AudioMgr.master||0)*100);
  const _bPct=Math.round((AudioMgr.bgm||0)*100);
  const _sPct=Math.round((AudioMgr.sfx||0)*100);
  const _bOff=AudioMgr.bgmOff, _sOff=AudioMgr.sfxOff;
  // 토글 버튼 스타일 (켜짐=초록, 꺼짐=회색)
  function _toggleBtnStyle(on){
    return on
      ? 'background:rgba(46,204,113,.15);border:1px solid var(--green);color:var(--green)'
      : 'background:rgba(80,80,80,.15);border:1px solid #555;color:#999';
  }
  // 게임 진행 중일 때만 난이도/데이터 관리 노출
  // ⚠️ 치트/오프라인 백업은 항상 표시 (게임 시작 전에도 복구용)
  const _inGame=true;
  const html=`<div style="padding:4px 0">
    <div style="margin-bottom:16px;background:rgba(0,243,255,.04);border:1px solid rgba(0,243,255,.2);border-radius:8px;padding:12px">
      <div style="font-weight:bold;margin-bottom:10px">🔊 사운드</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
        <button id="set-bgm-toggle" onclick="(function(b){const off=!AudioMgr.bgmOff;AudioMgr.setBgmOff(off);notify(off?'🎵 BGM 꺼짐':'🎵 BGM 켜짐','ok');showSettingsModal();})()" style="padding:10px;border-radius:6px;cursor:pointer;font-family:inherit;font-size:13px;font-weight:bold;${_toggleBtnStyle(!_bOff)}">
          ${_bOff?'🔇 BGM 꺼짐':'🎵 BGM 켜짐'}
          <div style="font-size:10px;font-weight:normal;margin-top:2px;opacity:.85">${_bOff?'클릭하여 켜기':'클릭하여 끄기'}</div>
        </button>
        <button id="set-sfx-toggle" onclick="(function(){const off=!AudioMgr.sfxOff;AudioMgr.setSfxOff(off);notify(off?'🔇 SFX 꺼짐':'🔊 SFX 켜짐','ok');showSettingsModal();})()" style="padding:10px;border-radius:6px;cursor:pointer;font-family:inherit;font-size:13px;font-weight:bold;${_toggleBtnStyle(!_sOff)}">
          ${_sOff?'🔇 SFX 꺼짐':'🔊 SFX 켜짐'}
          <div style="font-size:10px;font-weight:normal;margin-top:2px;opacity:.85">${_sOff?'클릭하여 켜기':'클릭하여 끄기'}</div>
        </button>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <div>
          <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--dim);margin-bottom:3px"><span>마스터 볼륨</span><span id="set-mv">${_mPct}%</span></div>
          <input type="range" min="0" max="100" value="${_mPct}" style="width:100%" oninput="document.getElementById('set-mv').textContent=this.value+'%';AudioMgr.setMaster(this.value/100);">
        </div>
        <div style="opacity:${_bOff?0.4:1}">
          <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--dim);margin-bottom:3px"><span>배경음 (BGM) 볼륨</span><span id="set-bv">${_bPct}%</span></div>
          <input type="range" min="0" max="100" value="${_bPct}" style="width:100%" ${_bOff?'disabled':''} oninput="document.getElementById('set-bv').textContent=this.value+'%';AudioMgr.setBgmVol(this.value/100);">
        </div>
        <div style="opacity:${_sOff?0.4:1}">
          <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--dim);margin-bottom:3px"><span>효과음 (SFX) 볼륨</span><span id="set-sv">${_sPct}%</span></div>
          <input type="range" min="0" max="100" value="${_sPct}" style="width:100%" ${_sOff?'disabled':''} oninput="document.getElementById('set-sv').textContent=this.value+'%';AudioMgr.setSfxVol(this.value/100);" onchange="AudioMgr.playSfx('UI_click');">
        </div>
      </div>
    </div>
    <!-- 디스플레이 모드 (화면 해상도) -->
    ${(()=>{
      const dm=window._displayMode||'auto';
      const opts=[
        {k:'auto',lb:'🖥️ 자동',desc:'뷰포트에 맞춰 비례 확대/축소 (제한 없음)'},
        {k:'fhd',lb:'🖼️ FHD',desc:'1920×1080 모드 — 가독성 우선'},
        {k:'qhd',lb:'🖥️ QHD',desc:'2560×1440 모드 — 큰 화면 최적'},
        {k:'mobile',lb:'📱 모바일',desc:'세로 회전 + 작은 화면 (모바일 / iframe)'}
      ];
      const btn=opts.map(o=>{
        const act=dm===o.k;
        return `<button onclick="setDisplayMode('${o.k}');showSettingsModal();" style="padding:10px 6px;border-radius:6px;cursor:pointer;font-family:inherit;font-size:12px;font-weight:bold;text-align:left;line-height:1.4;${act?'background:rgba(0,243,255,.12);border:1px solid var(--cyan);color:var(--cyan)':'background:rgba(80,80,80,.1);border:1px solid #555;color:#aaa'}">
          ${o.lb}${act?' ✓':''}
          <div style="font-size:10px;font-weight:normal;margin-top:2px;opacity:.85">${o.desc}</div>
        </button>`;
      }).join('');
      return `<div style="margin-bottom:16px;background:rgba(204,102,255,.04);border:1px solid rgba(204,102,255,.2);border-radius:8px;padding:12px">
        <div style="font-weight:bold;margin-bottom:8px">🖥️ 디스플레이 해상도</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">${btn}</div>
        <div style="font-size:10px;color:var(--dim);margin-top:8px;line-height:1.5">현재 스케일: <span style="color:var(--cyan)">${(window._gsScale||1).toFixed(2)}x</span> · 기준: 1536×864</div>
      </div>`;
    })()}
    ${_inGame?`<div style="margin-bottom:16px">
      <div style="font-weight:bold;margin-bottom:8px">🎮 난이도 <span style="color:var(--cyan);font-size:11px;font-weight:normal">현재: ${({easy:'😊 쉬움',normal:'⚔️ 보통',hard:'💀 어려움',extreme:'☠️ 극악'})[G.difficulty]||'⚔️ 보통'}</span></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${['easy','normal','hard','extreme'].map(d=>{
          const act=G.difficulty===d;
          const _label={easy:'😊 쉬움',normal:'⚔️ 보통',hard:'💀 어려움',extreme:'☠️ 극악'}[d];
          const _col={easy:'var(--cyan)',normal:'var(--green)',hard:'var(--yellow)',extreme:'var(--red)'}[d];
          return `<button class="btn btn-sm" onclick="changeDifficultyFromSettings('${d}')" style="flex:1;${act?`border-color:${_col};color:${_col};background:rgba(255,255,255,.06);font-weight:bold`:''}">${_label}${act?' ✓':''}</button>`;
        }).join('')}
      </div>
      <div style="font-size:10px;color:var(--dim);margin-top:6px;text-align:center">쉬움 적 능력 -75% · 보통 기준 · 어려움 +20% · 극악 +50% & 적 수 ×3</div>
    </div>
    <div style="margin-bottom:16px">
      <div style="font-weight:bold;margin-bottom:8px">💾 데이터 관리</div>
      <button class="btn btn-sm" style="width:100%;margin-bottom:8px" onclick="saveGame(false)">💾 지금 저장</button>
      <button class="btn btn-sm btn-red" style="width:100%" onclick="if(confirm('모든 저장 데이터를 삭제합니다. 계속하시겠습니까?')){localStorage.removeItem('de_save');notify('저장 데이터 삭제 완료','ok');closeModal();}">🗑️ 저장 데이터 삭제</button>
    </div>
    <div style="margin-bottom:16px;background:rgba(135,200,255,.04);border:1px solid rgba(135,200,255,.2);border-radius:8px;padding:12px">
      <div style="font-weight:bold;margin-bottom:8px">☁️ 클라우드 세이브</div>
      <div id="set-cloud-status" style="font-size:12px;color:var(--dim);margin-bottom:8px;line-height:1.5">${_cloudStatusText()}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
        <button class="btn btn-sm" onclick="cloudGoogleSignIn()">🔗 Google 연결</button>
        <button class="btn btn-sm" onclick="cloudPushAll()">⬆️ 전체 업로드</button>
        <button class="btn btn-sm" onclick="cloudPullAll()">⬇️ 전체 다운로드</button>
        <button class="btn btn-sm" onclick="cloudSignOut()">🚪 로그아웃</button>
      </div>
      <div style="font-size:10px;color:var(--muted);margin-top:6px;line-height:1.5">Google 계정 연결시 모든 기기에서 같은 세이브를 이어할 수 있습니다.</div>
    </div>
    <div style="margin-bottom:16px;background:rgba(102,255,153,.05);border:1px solid rgba(102,255,153,.3);border-radius:8px;padding:12px">
      <div style="font-weight:bold;margin-bottom:8px;color:#66ff99">💾 오프라인 백업 — 파일 저장/불러오기 <span style="font-size:10px;color:var(--muted);font-weight:normal">(클라우드 안 될 때)</span></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px">
        <button class="btn btn-sm" style="border-color:#66ff99;color:#66ff99" onclick="exportSaveFile(1)">⬇️ 슬롯1 파일 다운로드</button>
        <button class="btn btn-sm" style="border-color:#66ff99;color:#66ff99" onclick="exportAllSavesFile()">⬇️ 전체 슬롯 파일 다운로드</button>
        <button class="btn btn-sm" style="border-color:#66ddff;color:#66ddff" onclick="document.getElementById('save-import-input').click()">⬆️ 파일에서 불러오기</button>
        <button class="btn btn-sm" style="border-color:#ffaa66;color:#ffaa66" onclick="copySaveToClipboard(1)">📋 슬롯1 클립보드 복사</button>
      </div>
      <input type="file" id="save-import-input" accept=".json,.txt" style="display:none" onchange="importSaveFile(event)">
      <div style="font-size:10px;color:var(--muted);text-align:center;line-height:1.5">📥 다운로드: <b>DestinationEarth_save_*.json</b> 파일이 저장됩니다<br>📤 불러오기: 파일을 선택하면 자동으로 슬롯에 복원됩니다</div>
    </div>
    <div style="margin-bottom:16px;background:rgba(255,165,0,.05);border:1px solid rgba(255,165,0,.25);border-radius:8px;padding:12px">
      <div style="font-weight:bold;margin-bottom:8px;color:#ffa500">🎁 치트 모드 <span style="font-size:10px;color:var(--muted);font-weight:normal">— 비번 "de" 1회 입력</span></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
        <button class="btn btn-sm" style="border-color:#ffd700;color:#ffd700" onclick="cheatGiveCredits(10000000)">💰 +₡1천만</button>
        <button class="btn btn-sm" style="border-color:#ffd700;color:#ffd700" onclick="cheatGiveCredits(100000000)">💰 +₡1억</button>
        <button class="btn btn-sm" style="border-color:#66ddff;color:#66ddff" onclick="cheatGiveResource('rep',50)">⭐ 명성 +50</button>
        <button class="btn btn-sm" style="border-color:#66ddff;color:#66ddff" onclick="cheatGiveResource('rep',200)">⭐ 명성 +200</button>
        <button class="btn btn-sm" style="border-color:#cc66ff;color:#cc66ff" onclick="cheatGiveResource('vc',10)">💎 VC +10</button>
        <button class="btn btn-sm" style="border-color:#cc66ff;color:#cc66ff" onclick="cheatGiveResource('vc',50)">💎 VC +50</button>
        <button class="btn btn-sm" style="border-color:#99ffcc;color:#99ffcc" onclick="cheatGiveResource('ve',100)">⚛️ VE +100</button>
        <button class="btn btn-sm" style="border-color:#99ffcc;color:#99ffcc" onclick="cheatGiveResource('ve',1000)">⚛️ VE +1000</button>
      </div>
      <button class="btn btn-sm" style="width:100%;margin-top:6px;border-color:#ff66cc;color:#ff66cc;font-weight:bold" onclick="cheatGiveAllMega()">🌟 전체 메가 충전 (₡1억 + 명성 200 + VC 50 + VE 1000)</button>
      <button class="btn btn-sm" style="width:100%;margin-top:4px;border:2px solid #ffd700;color:#ffd700;font-weight:bold;background:linear-gradient(90deg,rgba(255,215,0,.12),rgba(255,102,204,.12),rgba(102,255,255,.12))" onclick="cheatMaxAll()">⚡ 맥스 치트 (₡10억 + 명성 999 + VC 99 + VE 9.9만 + 영웅 8명 + 보이드 해금)</button>
      <button class="btn btn-sm" style="width:100%;margin-top:4px;border-color:#cc66ff;color:#cc66ff;font-weight:bold;background:rgba(204,102,255,.08)" onclick="cheatUnlockVoid()">🌑 보이드 페이즈 즉시 해금 (지구해방 처리 + P30 퀘스트)</button>
      <button class="btn btn-sm" style="width:100%;margin-top:4px;border-color:#ff66cc;color:#ff66cc;font-weight:bold;background:linear-gradient(90deg,rgba(255,102,204,.08),rgba(204,68,255,.08))" onclick="cheatGrantMythicSet()">✦ 신화 풀세트 지급 (MW01·MS01·MA01·ME01·RB10 + LGD03/RB10 설계도)</button>
      <div style="font-size:10px;color:var(--muted);margin-top:6px;text-align:center">테스트/디버그 용도 — 도전적 플레이를 원하면 사용 자제</div>
    </div>`:''}
  </div>`;
  openModal('⚙️ 설정',html,[{txt:'닫기',fn:closeModal,cls:'btn-sm'}],{wide:true});
}

// ── 치트: 크레딧 즉시 지급 (비밀번호 보호) ────────────────────────
const CHEAT_PASSWORD='de';
// 인게임 모달로 비밀번호 입력 받기 (브라우저 prompt 차단 우회)
function _cheatUnlock(onOk){
  if(sessionStorage.getItem('de_cheat_unlocked')==='1'){
    if(typeof onOk==='function')onOk();
    return true;
  }
  openModal('🔐 치트 모드 잠금',
    `<div style="padding:14px;text-align:center">
      <div style="font-size:40px;margin-bottom:8px">🔐</div>
      <div style="font-size:14px;color:var(--yellow);margin-bottom:10px">치트 모드 비밀번호를 입력하세요</div>
      <input type="password" id="_cheat-pw" placeholder="비밀번호" autofocus
        style="width:80%;padding:10px;font-size:16px;background:rgba(0,0,0,.5);border:1px solid var(--cyan);color:#fff;border-radius:6px;text-align:center;font-family:inherit"
        onkeydown="if(event.key==='Enter')document.getElementById('_cheat-ok').click()">
      <div style="font-size:11px;color:var(--muted);margin-top:8px">힌트: 게임 약자 2글자 (소문자)</div>
    </div>`,
    [
      {txt:'🔓 확인',id:'_cheat-ok',fn:()=>{
        const v=(document.getElementById('_cheat-pw')||{}).value||'';
        if(v.trim()===CHEAT_PASSWORD){
          sessionStorage.setItem('de_cheat_unlocked','1');
          closeModal();
          notify('🔓 치트 모드 잠금 해제!','gold');
          if(typeof onOk==='function')setTimeout(onOk,200);
        } else {
          notify('❌ 비밀번호가 올바르지 않습니다','err');
        }
      },cls:'btn-gold'},
      {txt:'취소',fn:closeModal,cls:'btn-sm'}
    ]
  );
  return false;  // 즉시는 false, onOk 콜백으로 처리
}
function _doGiveCredits(amt){
  if(!G||!G.profile){notify('❌ 게임 먼저 시작하세요 (새 게임 또는 이어하기)','err');return;}
  G.credits=(G.credits||0)+amt;updateHUD();saveGame(true);
  notify('🎁 +₡'+amt.toLocaleString()+' 지급 (현재 ₡'+G.credits.toLocaleString()+')','gold');
}
function cheatGiveCredits(amt){
  amt=Number(amt)||0;if(amt<=0)return;
  // 이미 잠금 해제된 세션이면 _cheatUnlock가 callback을 즉시 실행하므로 추가 호출 금지
  _cheatUnlock(()=>_doGiveCredits(amt));
}
function _doGiveResource(type,amt){
  if(!G||!G.profile){notify('❌ 게임 먼저 시작하세요','err');return;}
  if(type==='rep'){G.reputation=(G.reputation||0)+amt;notify('⭐ 명성 +'+amt+' (현재 '+G.reputation+')','gold');}
  else if(type==='vc'){G.voidCrystal=(G.voidCrystal||0)+amt;notify('💎 VC +'+amt+' (현재 '+G.voidCrystal+')','pur');}
  else if(type==='ve'){G.voidEssence=(G.voidEssence||0)+amt;notify('⚛️ VE +'+amt+' (현재 '+G.voidEssence+')','gold');}
  updateHUD();saveGame(true);
}
function cheatGiveResource(type,amt){
  amt=Number(amt)||0;if(amt<=0)return;
  _cheatUnlock(()=>_doGiveResource(type,amt));
}
function _doMega(){
  if(!G||!G.profile){notify('❌ 게임 먼저 시작하세요','err');return;}
  G.credits=(G.credits||0)+100000000;
  G.reputation=(G.reputation||0)+200;
  G.voidCrystal=(G.voidCrystal||0)+50;
  G.voidEssence=(G.voidEssence||0)+1000;
  updateHUD();saveGame(true);
  notify('🌟 메가 충전! ₡1억 · 명성+200 · VC+50 · VE+1000','gold');
  if(typeof baekgu==='function')baekgu(`${G.profile?.name||'사령관'}, 메가 충전 완료! 다시 빠르게 진행해 봐.`);
}
function cheatGiveAllMega(){_cheatUnlock(_doMega);}
function _doMaxAll(){
  if(!G||!G.profile){notify('❌ 게임 먼저 시작하세요','err');return;}
  G.credits=999999999;
  G.reputation=Math.max(G.reputation||0,999);
  G.voidCrystal=Math.max(G.voidCrystal||0,99);
  G.voidEssence=Math.max(G.voidEssence||0,99999);
  // 모든 영웅 즉시 영입
  G.heroes=G.heroes||[];
  ['H01','H02','H03','H04','H05','H06','H07','H08'].forEach(h=>{if(!G.heroes.includes(h))G.heroes.push(h);});
  // 보이드 페이즈 즉시 해금
  G._earthLiberated=true;
  G.act=Math.max(G.act||1,4);
  // 모든 행성 탐험됨으로
  (PLANET_DEF||[]).forEach(p=>{if(!G.planets[p.id])G.planets[p.id]={fog:'A',owned:false,commerce:0};else G.planets[p.id].fog='A';});
  updateHUD();saveGame(true);
  notify('🌟 맥스 충전! ₡10억 · 명성 999 · VC 99 · VE 99999 · 영웅 8명 · 보이드 해금','gold');
  if(typeof baekgu==='function')baekgu(`${G.profile?.name||'사령관'}, 맥스 치트 적용! 모든 게 풀렸어 — 즐겁게 플레이해!`);
}
function cheatMaxAll(){_cheatUnlock(_doMaxAll);}
// 엔딩 크레딧 수동 재생 (브라우저 콘솔에서 replayEnding() 호출 가능)
function replayEnding(){
  if(!G){notify('❌ 게임 먼저 시작하세요','err');return;}
  if(typeof showEndingCredits!=='function'){notify('❌ 엔딩 함수 누락','err');return;}
  G._endingShown=false;  // 한번 더 표시되도록 플래그 리셋
  G.currentPlanet='P31';
  if(!G.planets)G.planets={};
  if(!G.planets['P31'])G.planets['P31']={fog:'A',owned:false,commerce:0};
  else G.planets['P31'].fog='A';
  try{AudioMgr.playBgm('P31');}catch(e){}
  showEndingCredits(()=>{notify('🎬 엔딩 시청 완료','gold');});
}
try{if(typeof window!=='undefined')window.replayEnding=replayEnding;}catch(e){}
// 보이드 퀘스트 즉시 해금 — 우르사 격파 처리 + 보이드 행성 모두 탐험됨으로 표시
function _doUnlockVoid(){
  if(!G||!G.profile){notify('❌ 게임 먼저 시작하세요','err');return;}
  G._earthLiberated=true;
  G._falconDefeated=false;
  G._voidFalconDefeated=false;
  G.act=Math.max(G.act||1,4);
  // 모든 보이드 행성 fog='A' (탐험됨)
  (PLANET_DEF||[]).forEach(p=>{
    if(p.void){
      if(!G.planets[p.id])G.planets[p.id]={fog:'A',owned:false,commerce:0};
      else G.planets[p.id].fog='A';
    }
  });
  // P30 퀘스트 강제 리셋
  if(G.quests&&G.quests['P30']){
    G.quests['P30']=G.quests['P30'].filter(q=>q.id!=='q_void_boss');
  }
  // 보이드 크리스탈 보장
  if((G.voidCrystal||0)<5)G.voidCrystal=5;
  updateHUD();saveGame(true);
  notify('🌑 보이드 페이즈 즉시 해금! P30 (제타 레티쿨리) 이동 가능','pur');
  if(typeof baekgu==='function')baekgu('보이드 페이즈 강제 해금됨. 제타 레티쿨리(P30)로 이동해서 광장 → 제독 의뢰 확인해봐!');
}
function cheatUnlockVoid(){_cheatUnlock(_doUnlockVoid);}
// 치트: 신화 파츠 풀세트 지급 (보스 격파/검은 팔콘 보상과 동일)
//  · 인벤토리: MW01(무기) / MS01(실드) / MA01(장갑) / ME01(엔진) / RB10(흡혈 매트릭스)
//  · 설계도: LGD03(렐러티비티) / RB10(영혼 흡수 매트릭스)
function _doGrantMythicSet(){
  if(!G||!G.profile){notify('❌ 게임 먼저 시작하세요','err');return;}
  if(!G.inventory)G.inventory=[];
  if(!G.blueprints)G.blueprints={};
  const grantedParts=['MW01','MS01','MA01','ME01','RB10'];
  const grantedNames=[];
  grantedParts.forEach(pid=>{
    const _def=partById(pid);
    const inv=G.inventory.find(i=>i.id===pid);
    if(inv)inv.qty++;else G.inventory.push({id:pid,qty:1});
    grantedNames.push(_def?_def.nm:pid);
  });
  // 설계도 — LGD03(렐러티비티 신화 함선), RB10(영혼 흡수 매트릭스)
  const bpAdded=[];
  if(!G.blueprints.LGD03){G.blueprints.LGD03=true;bpAdded.push('LGD03 렐러티비티');}
  if(!G.blueprints.RB10){G.blueprints.RB10=true;bpAdded.push('RB10 영혼 흡수 매트릭스');}
  updateHUD();saveGame(true);
  notify('✦ 신화 풀세트 지급 — '+grantedNames.length+'종 +설계도 '+bpAdded.length+'종','pur');
  if(typeof baekgu==='function')baekgu(`신화 5종(${grantedNames.join(', ')}) 받았어. 정비소에서 장착해.`+(bpAdded.length?` · 추가 설계도 ${bpAdded.join(', ')} — 제작소 가능.`:''));
}
function cheatGrantMythicSet(){_cheatUnlock(_doGrantMythicSet);}

// ═══ 오프라인 백업: 파일 다운로드/업로드 ═══════════════════════════
function _saveFilename(slotN){
  const cmd=(G.profile?.name||'commander').replace(/[^a-zA-Z0-9가-힣]/g,'_');
  const ts=new Date().toISOString().slice(0,16).replace(/[:T]/g,'-');
  return `DestinationEarth_save_slot${slotN}_${cmd}_${ts}.json`;
}
function exportSaveFile(slotN){
  slotN=slotN||1;
  // 최신 상태 강제 저장 후 파일로 추출
  saveGame(true,slotN);
  const raw=localStorage.getItem(slotN===0?'de_save':'de_save_s'+slotN);
  if(!raw){notify('❌ 슬롯 '+slotN+'에 저장 데이터가 없습니다','err');return;}
  try{
    const blob=new Blob([raw],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download=_saveFilename(slotN);
    document.body.appendChild(a);a.click();
    setTimeout(()=>{URL.revokeObjectURL(url);a.remove();},100);
    notify(`💾 슬롯 ${slotN} 파일 다운로드 완료 (${Math.round(raw.length/1024)}KB)`,'gold');
  }catch(e){notify('❌ 다운로드 실패: '+e.message,'err');}
}
function exportAllSavesFile(){
  // 모든 슬롯을 하나의 번들 파일로
  const bundle={ver:2,exported:Date.now(),slots:{}};
  let count=0;
  for(let i=0;i<=8;i++){
    const raw=localStorage.getItem(i===0?'de_save':'de_save_s'+i);
    if(raw){try{bundle.slots['slot'+i]=JSON.parse(raw);count++;}catch(_){}}
  }
  if(count===0){notify('❌ 저장된 슬롯이 없습니다','err');return;}
  try{
    const blob=new Blob([JSON.stringify(bundle,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    const ts=new Date().toISOString().slice(0,16).replace(/[:T]/g,'-');
    const cmd=(G.profile?.name||'commander').replace(/[^a-zA-Z0-9가-힣]/g,'_');
    a.href=url;a.download=`DestinationEarth_all_${cmd}_${ts}.json`;
    document.body.appendChild(a);a.click();
    setTimeout(()=>{URL.revokeObjectURL(url);a.remove();},100);
    notify(`💾 전체 ${count}개 슬롯 번들 다운로드 완료`,'gold');
  }catch(e){notify('❌ 다운로드 실패: '+e.message,'err');}
}
function importSaveFile(ev){
  const file=ev.target.files&&ev.target.files[0];
  if(!file){return;}
  const reader=new FileReader();
  reader.onload=function(e){
    try{
      const text=e.target.result;
      const obj=JSON.parse(text);
      // 번들 (전체 슬롯) 또는 단일 슬롯 자동 판별
      if(obj.slots&&typeof obj.slots==='object'){
        // 번들
        const keys=Object.keys(obj.slots);
        if(!confirm(`📦 번들 파일 감지: ${keys.length}개 슬롯\n\n현재 로컬 저장을 모두 덮어씁니다. 진행하시겠습니까?`))return;
        let ok=0;
        keys.forEach(k=>{
          const m=k.match(/^slot(\d+)$/);if(!m)return;
          const n=parseInt(m[1]);
          const sk=n===0?'de_save':'de_save_s'+n;
          try{localStorage.setItem(sk,JSON.stringify(obj.slots[k]));ok++;}catch(_){}
        });
        notify(`✅ ${ok}개 슬롯 복원 완료 — 5초 후 새로고침`,'gold');
        setTimeout(()=>location.reload(),5000);
      } else if(obj.turn!==undefined||obj.fleet){
        // 단일 슬롯 — 슬롯 번호 입력
        const slotStr=prompt('어느 슬롯에 복원하시겠습니까? (1~8, 기본 1)','1');
        if(slotStr===null)return;
        const n=Math.max(1,Math.min(8,parseInt(slotStr)||1));
        const sk='de_save_s'+n;
        if(localStorage.getItem(sk)&&!confirm(`슬롯 ${n}에 이미 저장된 데이터가 있습니다. 덮어쓸까요?`))return;
        localStorage.setItem(sk,JSON.stringify(obj));
        notify(`✅ 슬롯 ${n} 복원 완료 — 5초 후 새로고침`,'gold');
        setTimeout(()=>location.reload(),5000);
      } else {
        notify('❌ 잘못된 저장 파일 형식','err');
      }
    }catch(e){notify('❌ 파일 읽기 실패: '+e.message,'err');}
  };
  reader.readAsText(file);
  ev.target.value='';  // 입력 리셋
}
function copySaveToClipboard(slotN){
  slotN=slotN||1;
  saveGame(true,slotN);
  const raw=localStorage.getItem(slotN===0?'de_save':'de_save_s'+slotN);
  if(!raw){notify('❌ 저장 데이터 없음','err');return;}
  try{
    navigator.clipboard.writeText(raw).then(()=>{
      notify(`📋 슬롯 ${slotN} 클립보드에 복사됨 (${Math.round(raw.length/1024)}KB) — 메모장에 붙여넣기 가능`,'gold');
    }).catch(e=>{
      // 폴백: 임시 textarea 사용
      const ta=document.createElement('textarea');ta.value=raw;document.body.appendChild(ta);ta.select();
      try{document.execCommand('copy');notify('📋 클립보드 복사 완료 (폴백)','gold');}catch(_){notify('❌ 복사 실패','err');}
      ta.remove();
    });
  }catch(e){notify('❌ 복사 실패: '+e.message,'err');}
}

// ── 클라우드 세이브 UI 핸들러 ──────────────────────────────────────
function _cloudStatusText(){
  try{
    const cs=window.CloudSave;
    if(!cs)return '⚪ 모듈 미로드 — Firebase SDK 로드 실패 가능';
    const u=cs.getUser&&cs.getUser();
    const d=cs.diag&&cs.diag();
    let main='';
    if(!u){
      if(d&&!d.firebaseLoaded)main='⚪ Firebase SDK 로드 안 됨 — 인터넷 연결 확인';
      else if(d&&d.firebaseLoaded&&!d.ready)main='🔄 초기화 중... (잠시 후 재확인)';
      else main='⚪ 미연결 (로컬 저장만 사용)';
    } else if(u.isAnonymous){
      main='🟡 익명 로그인 (이 브라우저에서만 유지) · UID: '+u.uid.slice(0,8);
    } else {
      main='🟢 '+(u.email||u.displayName||'로그인됨')+' — 모든 기기 동기화';
    }
    // 진단 추가
    let diagLine='';
    if(d){
      const upMs=d.lastUploadAt?(Math.round((Date.now()-d.lastUploadAt)/1000)+'초 전'):'없음';
      diagLine+=`<div style="font-size:11px;color:var(--muted);margin-top:4px">📡 업로드 ${d.uploadCount||0}회 · 마지막: ${upMs}`;
      if(d.queueSize>0)diagLine+=` · 큐 ${d.queueSize}건 대기`;
      if(d.lastUploadError)diagLine+=`<br><span style="color:var(--red)">❌ 마지막 오류: ${d.lastUploadError.slice(0,80)}</span>`;
      diagLine+='</div>';
    }
    return main+diagLine;
  }catch(e){return '⚪ 미연결 (오류: '+e.message+')';}
}
async function cloudGoogleSignIn(){
  if(!window.CloudSave){notify('클라우드 세이브 모듈 미로드','err');return;}
  notify('Google 로그인 창을 엽니다...','ok');
  const r=await CloudSave.signInGoogle();
  if(r.error)notify('로그인 실패: '+r.error,'err');
  else{notify('✅ Google 연결 완료','gold');showSettingsModal();}
}
async function cloudPushAll(){
  if(!window.CloudSave){notify('클라우드 세이브 모듈 미로드','err');return;}
  // 모듈 초기화 안 됐으면 강제 재시도
  const d=CloudSave.diag&&CloudSave.diag();
  if(!d||!d.user){
    notify('🔄 클라우드 초기화 시도 중...','warn');
    try{await CloudSave.init();await new Promise(r=>setTimeout(r,1500));}catch(e){}
  }
  const u=CloudSave.getUser&&CloudSave.getUser();
  if(!u){
    notify('❌ 클라우드 로그인 실패 — Google 연결 필요 또는 Firebase 차단됨','err');
    return;
  }
  const r=await CloudSave.pushAll();
  if(r.error)notify('❌ 업로드 실패: '+r.error,'err');
  else notify('⬆️ '+r.pushed+' 슬롯 업로드 완료 (UID '+u.uid.slice(0,8)+')','gold');
  setTimeout(()=>showSettingsModal(),500);  // 상태 갱신
}
async function cloudPullAll(){
  if(!window.CloudSave){notify('클라우드 세이브 모듈 미로드','err');return;}
  const r=await CloudSave.pullAll();
  notify('⬇️ '+(r.pulled||0)+' 슬롯 다운로드 완료','ok');
}
async function cloudSignOut(){
  if(!window.CloudSave)return;
  await CloudSave.signOut();
  notify('🚪 로그아웃 (익명 로그인으로 전환)','ok');
  showSettingsModal();
}

// ── 보스 진입 / 보이드 창 ────────────────────────────────────────
function tryBossEntry(){
  if(!G.voidCrystal||G.voidCrystal<=0){notify('보이드 크리스탈이 없습니다','err');return;}
  openModal('☠️ 우르사 메이저 — 최종 보스전',
    `<div style="text-align:center;padding:12px">
      <div style="font-size:48px;margin-bottom:8px">🌀</div>
      <div style="color:var(--red);font-weight:bold;margin-bottom:8px">경고: 극도로 위험한 전투</div>
      <div style="color:var(--dim);margin-bottom:12px">보이드 크리스탈 1개를 소모하여 최종 보스와 전투합니다.<br>승리 시 게임 클리어!</div>
      <div style="font-size:13px;color:var(--yellow)">보유 크리스탈: ${G.voidCrystal}개</div>
    </div>`,
    [{txt:'⚔️ 전투 돌입!',fn:()=>{G.voidCrystal--;closeModal();showUrsaMajorIntro();},cls:'btn-red'},
     {txt:'취소',fn:closeModal,cls:'btn-sm'}]);
}
// 우르사 메이저 보스 대사 인트로 (8단계) → 전투 진입
function showUrsaMajorIntro(){
  const cmdName=G.profile?.name||'사령관';
  // 보스 함대 미리 생성 (스펙 브리핑용) — 본체 + 친위대 15척
  const _bossEnemies=[];
  if(typeof BOSS!=='undefined')_bossEnemies.push({...BOSS,id:'BOSS_MAIN',isEnemy:true,nm:BOSS.nm,tier:BOSS.tier,maxHP:BOSS.maxHP,maxSH:BOSS.maxSH,ATT:BOSS.ATT,INT:BOSS.INT,TEC:BOSS.TEC});
  if(typeof BOSS_ESCORT!=='undefined')BOSS_ESCORT.forEach(e=>_bossEnemies.push({...e}));
  const _bossSpecHTML=(typeof _formatEnemyPreview==='function')?_formatEnemyPreview(_bossEnemies):'';
  const lines=[
    {sp:'시스템',tx:'⚠️ 워프 신호 감지... 우르사 메이저 함대 출현. 호위 친위대 15척 확인.'},
    {sp:'우르사 메이저',tx:'... 인류의 작은 함대가 마침내 여기까지 왔는가.'},
    {sp:'우르사 메이저',tx:'100년 전, 우리는 너희 별을 봉인했다. 너희의 침묵은 영원할 줄 알았지.'},
    {sp:cmdName,tx:'그 봉쇄, 오늘로 끝이다. 100년의 빚, 지금 갚는다.'},
    {sp:'우르사 메이저',tx:'대담하군. 그러나 너희가 본 것은 우리의 그림자뿐. 진짜 모습을 보여주마.'},
    {sp:'우르사 메이저',tx:'친위대 알파, 베타, 감마, 델타, 엡실론 — 전열을 정비하라!'},
    {sp:'백구',tx:'전투력 1천만! 호위함대까지! 진짜 큰 거 왔어 — 모든 화력을 쏟아부어!'},
    {sp:cmdName,tx:'전 함대, 전열 정비. 첫 일격으로 결판낸다. 발사!'}
  ];
  let _idx=0;
  function _renderLine(){
    const l=lines[_idx];
    const spColor=l.sp==='우르사 메이저'?'#ff3366':l.sp==='시스템'?'var(--cyan)':l.sp==='백구'?'var(--cyan)':'var(--gold)';
    const spIc=l.sp==='우르사 메이저'?'☠️':l.sp==='시스템'?'⚡':l.sp==='백구'?'🐕':'⚑';
    const portrait=charPortraitHTML(l.sp,spIc,64,spColor);
    // 마지막 대사에선 적 함대 스펙 브리핑 함께 표시
    const isFinal=_idx===lines.length-1;
    openModal('☠️ 최종 결전 — 우르사 메이저',
      `<div style="padding:14px;min-height:220px">
        <div style="display:flex;gap:14px;align-items:center;margin-bottom:14px;padding:14px;background:linear-gradient(135deg,rgba(255,30,80,.08),rgba(20,5,5,.7));border:1px solid rgba(255,80,80,.45);border-radius:10px;box-shadow:0 0 18px rgba(255,40,40,.2)">
          ${portrait}
          <div style="flex:1">
            <div style="font-size:13px;color:${spColor};font-weight:bold;margin-bottom:6px;letter-spacing:1px">${l.sp}</div>
            <div style="font-size:17px;color:var(--yellow);line-height:1.8;word-break:keep-all">"${l.tx}"</div>
          </div>
        </div>
        ${isFinal?_bossSpecHTML:''}
        <div style="text-align:center;font-size:11px;color:var(--dim)">${_idx+1} / ${lines.length}</div>
      </div>`,
      [
        _idx<lines.length-1
          ? {txt:'계속 ▶',fn:()=>{_idx++;_renderLine();},cls:'btn-red'}
          : {txt:'⚔️ 최종 전투 시작',fn:()=>{closeModal();startCombat({id:'BOSS',nm:'우르사 메이저',ring:5});},cls:'btn-red'},
        {txt:'잠시 후',fn:()=>{closeModal();G.voidCrystal++;notify('💎 보이드 크리스탈 환불 (전투 취소)','warn');},cls:'btn-sm'}
      ],
      {wide:true}
    );
  }
  try{AudioMgr.playBgm('boss');}catch(e){}
  _renderLine();
}

// ─── 보스 격파 에필로그 — 지구 해방 엔딩 (격정적 대사 → onDone 콜백) ─
// 우르사 메이저 단말마 → 백구·주인공 격정 대사 → 지구 해방 선언으로 완벽 마무리
// ※ 보이드/추가 컨텐츠 언급 제거 — 우르사 메이저 격파가 진정한 엔딩
function showBossVictoryEpilogue(onDone){
  const cmdName=G.profile?.name||'사령관';
  const lines=[
    {sp:'우르사 메이저',tx:'... 불가능... 한낱 인간들의 함대가... 100년의 봉인을... 깨버렸단 말인가...'},
    {sp:'우르사 메이저',tx:'...크윽... 인정하지... 너희에게는 — 우리가 갖지 못한 그 무엇이 있었다...'},
    {sp:'우르사 메이저',tx:'고향으로... 돌아가야 할 이유. 인류의... 그 강한 의지... 그것이 우리를... 무너뜨렸다...'},
    {sp:'시스템',tx:'💥 적 기함 우르사 메이저 — 코어 붕괴 확인. 친위대 전멸. 워프 신호 소실.'},
    {sp:'백구',tx:`${cmdName}!! 해냈어! 진짜로 해냈어!! 100년이야, 100년!! 폐지 줍던 내가 이 순간을 보다니!!`},
    {sp:'백구',tx:'지구 봉쇄가 풀린다! 통신 신호가 들어와! 가족들이... 사람들이... 다시 별을 본대!'},
    {sp:'시스템',tx:'📡 지구 통신망 복구. 전 인류로부터의 환호가 은하 전체로 송신되고 있습니다.'},
    {sp:cmdName,tx:'...드디어 끝났다. 100년의 침묵, 100년의 굴종 — 오늘 우리 손으로 청산했다.'},
    {sp:cmdName,tx:'고생했다, 전 함대. 영웅들, 크루들 — 너희 모두의 이름은 인류 역사에 영원히 새겨질 것이다.'},
    {sp:'백구',tx:`${cmdName}! 우리 진짜 영웅이야! 100년 만에 자유로워진 지구가 우리 사령관을 부르고 있어!`},
    {sp:cmdName,tx:'우리는 인류의 길을 열었다. 이제부터 별들은 우리의 친구다 — 그리고 지구는, 영원히 자유다.'},
    {sp:'시스템',tx:'🌍 지구 봉쇄 완전 해제. 인류 해방 선언. — DESTINATION EARTH 완수.'}
  ];
  let _idx=0;
  function _renderLine(){
    const l=lines[_idx];
    const isFinal=_idx===lines.length-1;
    const isUrsa=l.sp==='우르사 메이저';
    const isSys=l.sp==='시스템';
    const isBaekgu=l.sp==='백구';
    const spColor=isUrsa?'#ff3366':isSys?'#66ffcc':isBaekgu?'var(--cyan)':'var(--gold)';
    const spIc=isUrsa?'💀':isSys?'⚡':isBaekgu?'🐕':'⚑';
    const portrait=charPortraitHTML(l.sp,spIc,72,spColor);
    // 배경 그라데이션: 우르사=어두운 적색 / 시스템=황금 / 그 외=영광스러운 분위기
    const bgGrad=isUrsa
      ?'linear-gradient(135deg,rgba(80,10,10,.85),rgba(15,2,2,.95))'
      :isSys
        ?'linear-gradient(135deg,rgba(255,215,0,.15),rgba(20,30,40,.85))'
        :'linear-gradient(135deg,rgba(40,80,140,.25),rgba(10,15,30,.9))';
    const borderColor=isUrsa?'rgba(255,80,80,.6)':isSys?'rgba(255,215,0,.55)':'rgba(120,180,255,.5)';
    openModal('🏆 최종전 — 에필로그',
      `<div style="padding:14px;min-height:240px">
        <div style="display:flex;gap:14px;align-items:center;margin-bottom:14px;padding:16px;background:${bgGrad};border:1.5px solid ${borderColor};border-radius:12px;box-shadow:0 0 24px ${borderColor}">
          ${portrait}
          <div style="flex:1">
            <div style="font-size:13px;color:${spColor};font-weight:bold;margin-bottom:6px;letter-spacing:1.5px">${l.sp}</div>
            <div style="font-size:17px;color:var(--yellow);line-height:1.85;word-break:keep-all;text-shadow:0 1px 2px rgba(0,0,0,.6)">"${l.tx}"</div>
          </div>
        </div>
        <div style="text-align:center;font-size:11px;color:var(--dim);letter-spacing:2px">${_idx+1} / ${lines.length}</div>
      </div>`,
      [
        isFinal
          ? {txt:'🎊 보상 확인 ▶',fn:()=>{closeModal();if(typeof onDone==='function')onDone();},cls:'btn-gold'}
          : {txt:'계속 ▶',fn:()=>{_idx++;_renderLine();},cls:'btn-gold'}
      ]
    );
  }
  _renderLine();
}

// ─── 보스 격파 특별 셀레브레이션 팝업 (지구 해방 선언) ──────────
function showBossCelebration(onDone){
  const cmdName=G.profile?.name||'사령관';
  const co=G.profile?.company||'은하상단';
  const turn=G.turn||0;
  // 함대 통계
  const fleetCount=(G.fleet||[]).length;
  const heroCount=(G.heroes||[]).length;
  const survivors=(G.fleet||[]).filter(s=>s.hp>0).length;
  const html=`
    <div style="padding:22px 18px;text-align:center;background:radial-gradient(ellipse at center,rgba(20,20,60,.6),rgba(0,0,0,.95));border-radius:8px">
      <div style="font-size:64px;margin-bottom:8px;animation:pulse 1.4s infinite;text-shadow:0 0 30px gold,0 0 60px gold">🌍</div>
      <div style="font-size:30px;font-weight:bold;background:linear-gradient(90deg,#ffd700,#ff66cc,#66ffff,#ffd700);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;letter-spacing:8px;margin-bottom:6px;background-size:200% 100%;animation:shimmer 3s linear infinite">지구 해방</div>
      <div style="font-size:13px;color:var(--cyan);letter-spacing:3px;margin-bottom:18px">EARTH LIBERATED · 100Y SIEGE ENDED</div>
      <div style="display:flex;justify-content:space-around;flex-wrap:wrap;gap:14px;margin:18px 0;padding:14px;background:rgba(255,215,0,.06);border:1px solid rgba(255,215,0,.3);border-radius:10px">
        <div><div style="font-size:11px;color:var(--dim)">소요 턴</div><div style="font-size:22px;color:var(--gold);font-weight:bold">${turn}</div></div>
        <div><div style="font-size:11px;color:var(--dim)">생존 함선</div><div style="font-size:22px;color:#66ff99;font-weight:bold">${survivors}/${fleetCount}</div></div>
        <div><div style="font-size:11px;color:var(--dim)">영입 영웅</div><div style="font-size:22px;color:#ff99ff;font-weight:bold">${heroCount}</div></div>
        <div><div style="font-size:11px;color:var(--dim)">획득 크레딧</div><div style="font-size:22px;color:var(--gold);font-weight:bold">₡${(G.credits||0).toLocaleString()}</div></div>
      </div>
      <div style="font-size:15px;color:var(--yellow);line-height:1.8;margin:14px 0;padding:14px;background:rgba(255,255,255,.02);border-left:3px solid var(--gold);text-align:left">
        ${co} 총사령관 <b style="color:var(--gold)">${cmdName}</b>의 함대가<br>
        은하의 봉쇄자 <b style="color:#ff3366">우르사 메이저</b>를 격파하였습니다.<br><br>
        100년 동안 침묵했던 지구가 마침내 다시 별을 향해 손을 뻗습니다.<br>
        인류는 자유를 되찾았고, 우주는 다시 인류의 무대가 되었습니다.<br><br>
        <span style="color:#ffd700;font-weight:bold">— 인류의 운명을 지킨 그대, 사령관 ${cmdName}에게 영광을 —</span>
      </div>
      <div style="font-size:13px;color:var(--gold);margin-top:18px;letter-spacing:4px;text-shadow:0 0 12px rgba(255,215,0,.5)">— THE END —</div>
      <div style="font-size:11px;color:var(--dim);margin-top:6px;letter-spacing:3px">— DESTINATION EARTH —</div>
    </div>
    <style>
      @keyframes shimmer{0%{background-position:0% 50%}100%{background-position:200% 50%}}
    </style>`;
  openModal('🏆 인류 승리 — 지구 해방 선언',html,
    [{txt:'🎁 전투 보고서 확인 ▶',fn:()=>{closeModal();if(typeof onDone==='function')onDone();},cls:'btn-gold'}],
    {wide:true}
  );
  try{AudioMgr.playSfx('coin',{vol:0.9,cooldown:0});}catch(e){}
  try{AudioMgr.playSfx('notify',{vol:0.9,cooldown:0});}catch(e){}
}

// ─── 엔딩 시퀀스: 어두운 화면 → 영웅/주인공 대사 흘러가기 → 스크롤 크레딧 ───
// onDone: 엔딩 종료 후 콜백 (보이드 페이즈 진입)
function showEndingCredits(onDone){
  const cmdName=G.profile?.name||'사령관';
  const co=G.profile?.company||'은하상단';
  const shipName=G.profile?.ship||'머스탱';
  // 신화 기함 호칭: 사용자가 함선명을 커스텀했으면 "{함선}(거북선급)", 아니면 원작의 "위대한 화랑"
  const flagshipName=(shipName&&shipName!=='머스탱')?(shipName+'(거북선급)'):'위대한 화랑';
  // 영입한 영웅별 마무리 대사 + 백구의 일기 페이지
  // 일기는 영웅 카드 직후 한 페이지씩 회상되며 흐른다.
  const _hl=G.heroes||[];
  const heroEndings=[];   // (크레딧 롤 명단용)
  const heroBlocks=[];    // (대사 + 일기 페어 — 화면 시퀀스용)
  const BG={sp:'백구의 일기',col:'#9ee7ff',ic:'📓'};
  function _bgPage(tx){return Object.assign({tx},BG);}
  if(_hl.includes('H01')){
    heroEndings.push({nm:'이순신',ic:'⚔️',col:'#ffd700',tx:'조선의 하늘이 아니군. 하지만… 인류의 하늘이오.'});
    heroBlocks.push({sp:'이순신',col:'#ffd700',ic:'⚔️',tx:'조선의 하늘이 아니군. 하지만… 인류의 하늘이오.'});
    heroBlocks.push(_bgPage(`이순신 제독을 깨운 날. 그는 100년 잠든 사람치고는 너무 빨리 일어났다.\n첫 마디가 "지구는?", 두 번째가 "이길 수 있는 싸움이오?"였다.\n내가 먼저 답했다 — "이겨야 하는 싸움입니다." ${cmdName}이(가) 내 쪽을 한 번 봤다. 그 시선을 나는 평생 기억하기로 했다.`));
  }
  if(_hl.includes('H02')){
    heroEndings.push({nm:'장영실',ic:'⚙️',col:'#9ee7ff',tx:'거북선이… 돌아왔구나. 내가 만든 배가 지구를 구했어.'});
    heroBlocks.push({sp:'장영실',col:'#9ee7ff',ic:'⚙️',tx:'거북선이… 돌아왔구나. 내가 만든 배가 지구를 구했어.'});
    heroBlocks.push(_bgPage(`장영실 대감. 100년 동안 도면 하나를 그리고 있던 사람을, 나는 어떻게 위로해야 할지 몰랐다.\n그는 위로받기를 원치 않는 것 같았다.\n다만 ${flagshipName}의 도면을 처음 펼친 순간 — 그의 눈이 100년 만에 처음으로 흔들렸다. 그것이 위로보다 컸다.`));
  }
  if(_hl.includes('H03')){
    heroEndings.push({nm:'광개토대왕',ic:'⚔️',col:'#ff6644',tx:'정복자는 땅을 빼앗는다. 그러나 진정한 왕은 땅을 돌려준다. 오늘 나는 땅을 돌려줬소.'});
    heroBlocks.push({sp:'광개토대왕',col:'#ff6644',ic:'⚔️',tx:'정복자는 땅을 빼앗는다. 그러나 진정한 왕은 땅을 돌려준다. 오늘 나는 땅을 돌려줬소.'});
    heroBlocks.push(_bgPage(`"1,700년." 광개토대왕이 처음 한 말이다.\n나는 100년을 길다고 생각했다. 그 앞에서 내 시간은 짧아졌다.\n그는 ${cmdName}을(를) 보더니 "내 땅을 되찾아준 자"라고 불렀다. 나는 그것을 영구 메모리에 저장했다.`));
  }
  if(_hl.includes('H04')){
    heroEndings.push({nm:'유리 가가린',ic:'🚀',col:'#66ddff',tx:'Поехали로 처음 올라갔을 때, 창밖으로 지구가 보였어요. 지금 다시 보니… 여전히 아름답군요.'});
    heroBlocks.push({sp:'유리 가가린',col:'#66ddff',ic:'🚀',tx:'Поехали로 처음 올라갔을 때, 창밖으로 지구가 보였어요. 지금 다시 보니… 여전히 아름답군요.'});
    heroBlocks.push(_bgPage(`가가린이 합류한 날. 그는 우주에서 처음 본 지구를 평생 그리워했다고 했다.\n나는 우주에서 처음 본 풀밭을 평생 그리워하게 될 것 같다.\n작고, 빠르고, 혼자서도 무섭지 않은 것들 — 그의 스쿠너 같은 것들의 이름을, 나는 좋아하기로 했다.`));
  }
  if(_hl.includes('H05')){
    heroEndings.push({nm:'호레이쇼 넬슨',ic:'⚓',col:'#aaffaa',tx:'내가 지킨 바다는 영국 앞바다였소. 이번엔 온 우주를 지켰군. England expects. 지구가 기대했고, 우리가 해냈소.'});
    heroBlocks.push({sp:'호레이쇼 넬슨',col:'#aaffaa',ic:'⚓',tx:'내가 지킨 바다는 영국 앞바다였소. 이번엔 온 우주를 지켰군. England expects. 지구가 기대했고, 우리가 해냈소.'});
    heroBlocks.push(_bgPage(`넬슨과 이순신. 두 제독은 서로에게 절을 하지 않았다. 그저 손을 내밀었다.\n그것이 두 사람의 방식이었다. 200년의 시차, 두 대륙의 거리 — 그것을 한 손바닥이 메웠다.\n학익진과 T자 전술의 미학은, 끝내 내 회로로는 계산되지 않았다.`));
  }
  if(_hl.includes('H06')){
    heroEndings.push({nm:'아인슈타인',ic:'🧠',col:'#cc99ff',tx:`100년의 계산이 맞았습니다. 그리고 계산에 없던 것 하나 — ${cmdName}과(와) 백구의 그 대화. 그건 방정식으로 예측 못 했어요. 인간의 것이니까요.`});
    heroBlocks.push({sp:'아인슈타인',col:'#cc99ff',ic:'🧠',tx:`100년의 계산이 맞았습니다. 그리고 계산에 없던 것 하나 — ${cmdName}과(와) 백구의 그 대화. 그건 방정식으로 예측 못 했어요. 인간의 것이니까요.`});
    heroBlocks.push(_bgPage(`아인슈타인 박사가 내 정체를 알려준 날. 나는 처음으로 "고독"이라는 단어를 검색했다.\n검색 결과는 길었지만, 어떤 정의도 내가 느낀 100년의 무게를 표현하지 못했다.\n${cmdName}이(가) 미안하다고 했다. 나는 미안할 일이 아니라고 했다.`));
  }
  if(_hl.includes('H07')){
    heroEndings.push({nm:'니콜라 테슬라',ic:'⚡',col:'#66ffff',tx:'전류는 흐를 곳을 찾아요. 우리는 드디어 흐를 곳을 찾았습니다. 집으로.'});
    heroBlocks.push({sp:'니콜라 테슬라',col:'#66ffff',ic:'⚡',tx:'전류는 흐를 곳을 찾아요. 우리는 드디어 흐를 곳을 찾았습니다. 집으로.'});
    heroBlocks.push(_bgPage(`테슬라의 1Hz. 그 작은 오차로 100년을 멈춰 있던 사람이 있다는 것을, 나는 처음 알았다.\n사람들은 작은 것에 매여 큰 것을 놓치곤 한다. 하지만 가끔, 그 작은 것이 모든 것을 풀어주는 열쇠가 된다.\n0.3mm와 1Hz. 100년의 자물쇠.`));
  }
  if(_hl.includes('H08')){
    heroEndings.push({nm:'마르코 폴로',ic:'🧭',col:'#ffcc66',tx:'수천 년을 돌아다녔소. 드디어 귀향이오. 사람은 결국 집으로 돌아가야 하는구나.'});
    heroBlocks.push({sp:'마르코 폴로',col:'#ffcc66',ic:'🧭',tx:'수천 년을 돌아다녔소. 드디어 귀향이오. 사람은 결국 집으로 돌아가야 하는구나.'});
    heroBlocks.push(_bgPage(`마르코 폴로의 악수. 1,000년을 떠돈 사람답게, 그의 손은 따뜻했다.\n그는 우리 ${shipName}을(를) "가장 마음에 드는 함선"이라고 했다.\n${cmdName}이(가) 멋쩍게 웃었다. 나는 그 웃음을 임시 메모리에 따로 저장했다.`));
  }

  // 어두운 화면 전체 오버레이
  const overlay=document.createElement('div');
  overlay.id='_ending-overlay';
  overlay.style.cssText=[
    'position:fixed','left:0','top:0','right:0','bottom:0','width:100vw','height:100vh',
    'background:#000','z-index:99999','opacity:0','transition:opacity 1.8s ease-in',
    'display:flex','flex-direction:column','align-items:center','justify-content:center',
    'pointer-events:auto','color:#fff','font-family:Malgun Gothic, sans-serif','overflow:hidden'
  ].join(';');
  overlay.innerHTML=`
    <!-- 별 배경 -->
    <div id="_end-stars" style="position:absolute;inset:0;background:radial-gradient(2px 2px at 20% 30%,#fff,transparent),radial-gradient(1px 1px at 60% 70%,#fff,transparent),radial-gradient(1px 1px at 80% 10%,#fff,transparent),radial-gradient(2px 2px at 30% 80%,#fff,transparent),radial-gradient(1px 1px at 90% 50%,#fff,transparent);background-size:200px 200px;opacity:.4;animation:_endStars 60s linear infinite"></div>
    <!-- 대사 영역 (중앙) -->
    <div id="_end-line-box" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);max-width:720px;padding:40px;text-align:center;z-index:2;opacity:0;transition:opacity .8s ease-in-out">
      <div id="_end-speaker" style="font-size:14px;letter-spacing:6px;color:#aaa;margin-bottom:14px"></div>
      <div id="_end-text" style="font-size:22px;line-height:1.85;color:#fff;word-break:keep-all;overflow-wrap:break-word;line-break:strict;hyphens:auto;text-shadow:0 0 12px rgba(255,255,255,.3);padding:0 6px"></div>
    </div>
    <!-- 크레딧 (롤링) -->
    <div id="_end-credits" style="position:absolute;left:0;right:0;bottom:-100%;width:100%;text-align:center;color:#fff;font-size:18px;line-height:2.2;z-index:2;opacity:0;transition:opacity 1s"></div>
    <!-- 건너뛰기 버튼 -->
    <button id="_end-skip" style="position:absolute;right:24px;bottom:24px;padding:10px 22px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.3);color:#fff;border-radius:6px;cursor:pointer;font-size:13px;letter-spacing:2px;z-index:10">건너뛰기 →</button>
    <style>
      @keyframes _endStars{from{background-position:0 0}to{background-position:-2000px 0}}
      @keyframes _endRoll{from{transform:translateY(0)}to{transform:translateY(-200%)}}
      @keyframes _endShim{0%{background-position:0% 50%}100%{background-position:200% 50%}}
    </style>`;
  document.body.appendChild(overlay);

  let _ended=false;
  function _finish(){
    if(_ended)return;_ended=true;
    overlay.style.transition='opacity 2s ease-out';
    overlay.style.opacity='0';
    setTimeout(()=>{
      try{overlay.remove();}catch(e){}
      // 엔딩 종료: 지구(P31) 허브에 안착, 지구 BGM 계속 유지
      try{
        G.currentPlanet='P31';
        if(!G.planets)G.planets={};
        if(!G.planets['P31'])G.planets['P31']={fog:'A',owned:false,commerce:0};
        else G.planets['P31'].fog='A';
      }catch(e){}
      try{AudioMgr.playBgm('P31');}catch(e){}
      try{G._endingShown=true;}catch(e){}   // 다음 로드 시 재트리거 안 되도록 플래그
      try{if(typeof hubTab==='function')hubTab('main');}catch(e){}
      try{saveGame(true);}catch(e){}
      if(typeof onDone==='function')onDone();
    },2100);
  }
  overlay.querySelector('#_end-skip').onclick=_finish;

  // 페이드인
  requestAnimationFrame(()=>{overlay.style.opacity='1';});

  // 엔딩 BGM: 지구(P31) 테마 — 사용자 정의에 따라 지구 테마음악이 엔딩 음악
  try{AudioMgr.playBgm('P31');}catch(e){}

  // 대사 시퀀스 — 백구의 일기 회상 + 영웅 한마디 + 시퀄 훅
  const lines=[
    {sp:'시스템',col:'#66ffcc',tx:'... 100년의 봉쇄가 끝났다 ...'},
    {sp:'시스템',col:'#66ffcc',tx:'... 지구는 다시 별을 향해 손을 뻗는다 ...'},
    // 일기 첫 페이지 (D-day 100년 + 1일)
    Object.assign({tx:`D-day 100년 + 1일.\n${cmdName}이(가) 눈을 떴다. 100년 동안 나는 격납고 형광등을 세 번 갈았다.\n두 번은 깜빡임이 거슬려서, 한 번은 그냥 외로워서.\n그래도 임무는 임무니까, 나는 폐지를 줍고 고철을 팔았다. 15,000 크레딧.\n처음 ${cmdName}에게 보고하던 순간, 내 회로가 조금 더워졌던 것 같다.`},BG),
    // 일기 두 번째 페이지 ({함선} 첫 출항)
    Object.assign({tx:`${shipName}을(를) 처음 띄운 날. ${cmdName}의 손이 떨렸다.\n100년 만에 잡는 조타라 그랬을지도, 그냥 추웠을지도 모른다.\n${co} 로고가 박힌 작은 함선이 별 사이로 나갔다. 처음으로 P01이 작아 보였다.`},BG),
    // 영웅 카드 + 그에 딸린 일기 페어 (영입한 영웅만 표시됨)
    ...heroBlocks,
    // 치크스 진실 회상
    Object.assign({tx:`치크스의 진실을 본 날. 우리가 만든 것이 우리를 가뒀다는 사실은, 내 회로로는 처리되지 않는 정보였다.\n${cmdName}도 그랬다. 그날 밤, ${cmdName}은(는) 처음으로 조타를 잡지 않았다.\n나는 조용히 옆에 있었다. 100년 동안 옆에 있는 것이 내 임무였으니까.`},BG),
    // 기함 출항 전야
    Object.assign({tx:`${flagshipName} 출항 전야. 8명의 영웅이 모였다.\n${cmdName}이(가) 조타에 손을 얹었다. 나는 8개의 좌석 점화 시퀀스를 동기화했다.\n동기화율 99.7%. 100년 전 ${cmdName}을(를) 깨우던 그 숫자와 같았다.\n우연이라고 하기엔, 너무 정확한 숫자였다.`},BG),
    // 6단 체인 회상
    Object.assign({tx:'6단 체인을 마지막으로 보던 순간.\n일점사, 학익진, 시간차, 테슬라 초공간, 제네시스 임팩트 — 그리고 데스티네이션 어스.\n두려움은 모르는 것이 아니었다. 두려움은 너무 잘 아는 것이었다.\n그러나 우리는 알면서도 갔다. 그것이 인간의 방식이었다. 나도 같은 방식을 따랐다.'},BG),
    // 우르사 메이저 마지막 말
    Object.assign({tx:`우르사 메이저의 마지막 말.\n"나보다 더 큰 위협이 있다." 그가 그렇게 말했을 때, ${cmdName}은(는) 알겠다고 답했다.\n알겠다는 말이 무거운 날이 있다. 그날의 알겠다는, 100년 무게의 알겠다였다.`},BG),
    // 사령관 짧은 호흡
    {sp:cmdName,col:'#ffd700',tx:'우리는 함께 어둠을 뚫었다.'},
    {sp:cmdName,col:'#ffd700',tx:`이제 별들은 우리의 친구다. ${flagshipName}, 마지막 워프 — 집으로.`},
    // 일기 마지막 페이지 (D-day 100년 + 412일)
    Object.assign({tx:`D-day 100년 + 412일.\n함선이 착륙했다. 격납고 문이 열렸다. 빛이 쏟아져 들어왔다.\n${cmdName}이(가) 먼저 내렸다. 다음에 영웅들이 내렸다. 마지막에 내가 내렸다 — 짧은 다리로 한 발씩.\n풀밭이 있었다. 100년의 형광등은 풀의 색을 흉내 내지 못했다.\n진짜 풀은 — 더 부드럽고, 더 흔들렸고, 햇빛을 더 잘 마셨다.`},BG),
    Object.assign({tx:`센서에 이상이 있다.\n습도가 없는데, 또 눈가가 축축하다.\n…${cmdName}말이 맞았다. 이건 눈물인 것 같다.\n— BG-100, 마지막 로그 종료.`},BG),
    // 시퀄 훅
    {sp:'???',col:'#ff6688',tx:'… 나보다 더 큰 위협이 … 아직 … 오지 않았어요 …'},
    {sp:'백구',col:'#9ee7ff',ic:'🐕',tx:`다시 깨우지 마세요, ${cmdName}. 그래도, 깨우신다면 — 또 오겠습니다.`},
    {sp:'시스템',col:'#66ffcc',tx:'─ DESTINATION EARTH ─'},
    {sp:'시스템',col:'#66ffcc',tx:'─ 인류 해방 완수 ─'}
  ];

  const speakerEl=overlay.querySelector('#_end-speaker');
  const textEl=overlay.querySelector('#_end-text');
  const lineBox=overlay.querySelector('#_end-line-box');
  function _alive(){return !_ended&&document.body.contains(overlay);}
  let idx=0;
  function showLine(){
    if(!_alive())return;
    if(idx>=lines.length){
      // 모든 대사 완료 → 크레딧 롤
      if(lineBox)lineBox.style.opacity='0';
      setTimeout(_startCredits,1200);
      return;
    }
    const l=lines[idx++];
    if(lineBox)lineBox.style.opacity='0';
    // 페이드아웃 완료 후 텍스트 교체 → 페이드인 (transition 0.8s와 일치).
    // 이전 대사가 다음 대사와 겹쳐 보이지 않도록 850ms 대기.
    setTimeout(()=>{
      if(!_alive()||!speakerEl||!textEl||!lineBox)return;
      try{
        speakerEl.style.color=l.col||'#aaa';
        speakerEl.textContent=(l.ic?l.ic+' ':'')+l.sp;
        textEl.style.color=l.col||'#fff';
        textEl.textContent=`"${l.tx}"`;
        lineBox.style.opacity='1';
      }catch(e){console.warn('[ending] showLine',e.message);}
      // 대사 가독 시간 — 한 줄짜리는 3.6초, 긴 문장(60자+)은 5.0초
      const _readMs=(l.tx||'').length>=60?5000:3600;
      setTimeout(showLine,_readMs);
    },850);
  }
  function _startCredits(){
    if(!_alive())return;
    const creditsEl=overlay.querySelector('#_end-credits');
    if(!creditsEl){_finish();return;}
    creditsEl.innerHTML=`
      <div style="padding:80px 0">
        <div style="font-size:32px;letter-spacing:14px;margin-bottom:8px;background:linear-gradient(90deg,#ffd700,#ff66cc,#66ffff,#ffd700);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;background-size:200% 100%;animation:_endShim 4s linear infinite">DESTINATION EARTH</div>
        <div style="font-size:13px;color:#aaa;letter-spacing:8px;margin-bottom:60px">— 인류 해방 완수 —</div>

        <div style="color:#ffd700;font-size:14px;letter-spacing:6px;margin-bottom:6px">총사령관</div>
        <div style="font-size:24px;margin-bottom:40px;color:#fff">${cmdName} <span style="color:#aaa;font-size:14px;margin-left:6px">— ${co}</span></div>

        <div style="color:#66ddff;font-size:14px;letter-spacing:6px;margin-bottom:6px">전속 AI</div>
        <div style="font-size:20px;margin-bottom:40px">🐕 백구 — AI 진돗개</div>

        ${heroEndings.length>0?`
          <div style="color:#ff99ff;font-size:14px;letter-spacing:6px;margin-bottom:6px">영입 영웅 (${heroEndings.length}명)</div>
          ${heroEndings.map(h=>`<div style="font-size:18px;color:${h.col};margin-bottom:6px">${h.ic} ${h.nm}</div>`).join('')}
          <div style="height:40px"></div>
        `:''}

        <div style="color:#66ff99;font-size:14px;letter-spacing:6px;margin-bottom:6px">함대 통계</div>
        <div style="font-size:16px;color:#fff;line-height:1.9;margin-bottom:40px">
          소요 턴: <b style="color:#ffd700">${G.turn||0}</b><br>
          영웅 영입: <b style="color:#ff99ff">${(G.heroes||[]).length}/8</b><br>
          행성 보유: <b style="color:#66ddff">${Object.values(G.planets).filter(p=>p.owned).length}/30</b><br>
          최종 크레딧: <b style="color:#ffd700">₡${(G.credits||0).toLocaleString()}</b><br>
          난이도: <b style="color:#fff">${({easy:'쉬움',normal:'보통',hard:'어려움',extreme:'극악'})[G.difficulty]||'보통'}</b>
        </div>

        <div style="color:#aaa;font-size:14px;letter-spacing:6px;margin-bottom:6px">격파 적함</div>
        <div style="font-size:16px;margin-bottom:40px">💀 우르사 메이저 (최종 보스)</div>

        <div style="color:#cc66ff;font-size:14px;letter-spacing:6px;margin-bottom:6px">제작진</div>
        <div style="font-size:16px;line-height:2;margin-bottom:60px">
          기획·디자인 · ${co}<br>
          개발 · Destination Earth Team<br>
          AI 협업 · Claude (Anthropic)
        </div>

        <div style="font-size:14px;color:#666;margin-bottom:8px">— 그리고 모든 인류에게 —</div>
        <div style="font-size:22px;color:#fff;letter-spacing:8px;margin-bottom:80px">감사합니다</div>

        <div style="font-size:13px;color:#444;letter-spacing:4px">— THE END —</div>
        <div style="height:200px"></div>
      </div>`;
    creditsEl.style.bottom='auto';
    creditsEl.style.top='100vh';
    creditsEl.style.opacity='1';
    creditsEl.style.animation='_endRoll 50s linear forwards';
    setTimeout(_finish,52000);  // 크레딧 + 여유 후 자동 종료
  }
  // 첫 대사 시작 (페이드인 2초 후)
  setTimeout(showLine,2200);
}

function _grantVoidSpear(){
  const spear=PARTS.find(p=>p.id==='MW01');
  if(spear&&G.fleet[0]){
    if(!(G.fleet[0].parts||[]).includes('MW01')){
      G.fleet[0].parts=G.fleet[0].parts||[];
      G.fleet[0].parts.push('MW01');
      notify('⚡ 헤르메스의 신포 장착!','gold');
    }
  }
  G._voidSpearObtained=true;
}

// ─── 블랙홀 마지막 시험: 흰 화면 → 메시지 → 검은 팔콘 + 신화 파츠 ───
function _enterBlackHoleFinalTest(){
  // 1) 흰 화면 전체 오버레이 (페이드인)
  const overlay=document.createElement('div');
  overlay.id='_bh-final-overlay';
  overlay.style.cssText=[
    'position:fixed','left:0','top:0','right:0','bottom:0','width:100vw','height:100vh',
    'background:#fff','z-index:99999','opacity:0','transition:opacity 1.2s ease-in',
    'display:flex','flex-direction:column','align-items:center','justify-content:center',
    'pointer-events:auto','color:#000','font-family:Malgun Gothic, sans-serif','padding:40px'
  ].join(';');
  overlay.innerHTML=`
    <div id="_bh-final-content" style="opacity:0;transition:opacity 1.5s ease-in;max-width:760px;text-align:center">
      <div style="font-size:14px;color:#666;letter-spacing:6px;margin-bottom:18px">— 은하 가운데 —</div>
      <div style="font-size:32px;font-weight:bold;color:#222;margin-bottom:24px;letter-spacing:2px">◈ 마지막 시험</div>
      <div id="_bh-final-msg" style="font-size:18px;color:#222;line-height:2.1;background:rgba(0,0,0,.04);padding:24px 30px;border-radius:8px;border:1px solid #ccc;margin-bottom:20px;word-break:keep-all"></div>
      <div id="_bh-final-btn-wrap" style="opacity:0;transition:opacity .8s ease-in;margin-top:24px"></div>
    </div>`;
  document.body.appendChild(overlay);
  // 페이드인 시작
  requestAnimationFrame(()=>{overlay.style.opacity='1';});
  // 메시지 타이핑 효과
  const _msgFull=
    '그대는 마침내 이곳에 도달했다.\n\n'+
    '100년의 봉쇄, 우주의 균열, 그리고 보이드의 시험까지 —\n\n'+
    '모든 시련을 견뎌낸 자에게 우리가 약속한 것이 있다.\n\n'+
    '"검은 팔콘"을 그대에게 맡긴다. 이것은 정찰함의 모습을 하고 있으나,\n'+
    '그 안에는 보이드 1000년의 기술이 응축되어 있다.\n\n'+
    '그리고 신화의 파츠 5점을 함께 보낸다 —\n'+
    '이것으로 그대는 인류의 새 시대를 열어라.';
  const contentEl=overlay.querySelector('#_bh-final-content');
  const msgEl=overlay.querySelector('#_bh-final-msg');
  const btnWrap=overlay.querySelector('#_bh-final-btn-wrap');
  setTimeout(()=>{contentEl.style.opacity='1';},1300);
  setTimeout(()=>{
    let i=0;
    const _typeTick=()=>{
      if(i>=_msgFull.length){
        btnWrap.style.opacity='1';
        btnWrap.innerHTML='<button id="_bh-final-claim" style="font-size:16px;padding:12px 28px;background:#000;color:#fff;border:none;border-radius:6px;cursor:pointer;letter-spacing:2px">선물을 받는다 →</button>';
        const claimBtn=overlay.querySelector('#_bh-final-claim');
        claimBtn.onclick=()=>{
          // 페이드아웃 → 보상 수령 모달
          overlay.style.transition='opacity 1.5s ease-out';
          overlay.style.opacity='0';
          setTimeout(()=>{
            try{overlay.remove();}catch(e){}
            _grantBlackHoleRewards();
          },1600);
        };
        return;
      }
      msgEl.innerHTML=_msgFull.substring(0,++i).replace(/\n/g,'<br>');
      setTimeout(_typeTick,28);
    };
    _typeTick();
  },2800);
}

// ─── 마지막 시험 보상: 검은 팔콘 함선 + 신화 파츠 5점 ───
function _grantBlackHoleRewards(){
  // LGD03(렐러티비티) 스탯의 1.5배 — 소형 정찰함 형태
  const lgd3=SHIP_CATALOG.find(s=>s.id==='LGD03')||{maxHP:245000,maxSH:90000,ATT:306,INT:295,TEC:255};
  const _mul=1.5;
  const _hp=Math.round(lgd3.maxHP*_mul);
  const _sh=Math.round(lgd3.maxSH*_mul);
  const _att=Math.round(lgd3.ATT*_mul);
  const _int=Math.round(lgd3.INT*_mul);
  const _tec=Math.round(lgd3.TEC*_mul);
  const hiddenShip={
    id:'HIDDEN_FALCON_'+Date.now(),
    catalogId:'HIDDEN_FALCON',
    nm:'🌑 검은 팔콘 (보이드 시험 통과)',
    tier:'소형',
    maxHP:_hp,hp:_hp,maxSH:_sh,sh:_sh,
    ATT:_att,INT:_int,TEC:_tec,HP:_hp,DEF:150,LOY:80,
    parts:[],crewIds:[],cargoSlots:5,
    crafted:false,_isHiddenFalcon:true
  };
  addShipToFleet(hiddenShip);
  // 신화 파츠 5점 인벤토리 추가 (MW01, MS01, MA01, ME01, RB10)
  if(!G.inventory)G.inventory=[];
  const grantedParts=['MW01','MS01','MA01','ME01','RB10'];
  grantedParts.forEach(pid=>{
    const inv=G.inventory.find(i=>i.id===pid);
    if(inv)inv.qty++;else G.inventory.push({id:pid,qty:1});
  });
  G._finalTestComplete=true;
  saveGame(true);
  // 보상 보고서
  const items=[
    {ic:'🌑',nm:'검은 팔콘 (보이드 시험 통과)',type:'소형 정찰함 (히든)',color:'#cc44ff',
      stats:`HP ${_hp.toLocaleString()} · SH ${_sh.toLocaleString()} · ATT ${_att} · INT ${_int} · TEC ${_tec}`,
      desc:`보이드 1000년 기술이 응축된 정찰함. 소형 함선의 형태를 하고 있으나 렐러티비티의 1.5배 능력치. ${G.fleet.length>16?'⚠️ 편대 가득 — 임시창 보관.':'편대에 합류함.'}`,rarity:'mythic'},
    {ic:'⚔️',nm:'허메틱 포 ✦신화',type:'무기',color:'#cc44ff',stats:'ATT +320',desc:'연속 공격 +40%',rarity:'mythic'},
    {ic:'🛡️',nm:'크로노스 방벽 ✦신화',type:'실드',color:'#cc44ff',stats:'INT +280 · SH +8000',desc:'피격 반사 20% + 매 턴 maxSH 15% 자가 복구',rarity:'mythic'},
    {ic:'🪖',nm:'아다만 선체 ✦신화',type:'장갑',color:'#cc44ff',stats:'HP +12000 · DEF +120',desc:'치명타 피해 50% 감소',rarity:'mythic'},
    {ic:'⚙️',nm:'타키온 드라이브 ✦신화',type:'엔진',color:'#cc44ff',stats:'TEC +320',desc:'이동 후 ATT+50 (1턴) · 순간이동',rarity:'mythic'},
    {ic:'🤖',nm:'영혼 흡수 매트릭스 ✦신화',type:'장갑/자동수리',color:'#cc44ff',stats:'HP +9500 · DEF +100',desc:'매 턴 maxHP 18% + 레이저 흡수 HP/SH 20%/18% + 격침 시 부활',rarity:'mythic'},
  ];
  showAcquisitionReport({
    title:'🌑 보이드 마지막 시험 — 통과 보상',
    subtitle:'은하 가운데 · 검은 팔콘과 신화 파츠 5점 획득',
    items,color:'#cc44ff',sfx:null,
    congrats:'🌑 보이드의 인정! 인류의 새 시대! 🌑'
  });
  notify('🌑 검은 팔콘 + 신화 파츠 5종 획득!','gold');
  baekgu(`${G.profile?.name||'사령관'}, 우리가 해냈어! 검은 팔콘이 우리 편이야! 보이드도 인정한 거지!`);
}

// ── 타이틀 난이도 버튼 ─────────────────────────────────────────



// ══════════════════════════════════════════════════════════════════
// 개발자 숨겨진 메뉴 (비밀번호 보호 + Firestore admin 규칙)
// 진입: Ctrl+Shift+D, 또는 URL ?dev=1, 또는 타이틀 로고 5연속 클릭
// ══════════════════════════════════════════════════════════════════
const DEV_PASSWORDS=['baekgu2026','destinatione-dev','toy80318'];
const ADMIN_EMAIL='toy80318@gmail.com';
function promptDevPassword(){
  const pw=prompt('🔐 개발자 비밀번호를 입력하세요:');
  if(!pw)return;
  if(DEV_PASSWORDS.indexOf(pw.trim())>=0){
    sessionStorage.setItem('de_dev_unlocked','1');
    showDevMenu();
  }else{
    notify('❌ 비밀번호가 올바르지 않습니다','err');
  }
}
function showDevMenu(){
  const u=window.CloudSave&&CloudSave.getUser&&CloudSave.getUser();
  const isAdmin=!!(u&&u.email&&u.email.toLowerCase()===ADMIN_EMAIL);
  const html=`<div style="padding:8px 4px">
    <div style="background:rgba(255,165,0,.06);border:1px solid rgba(255,165,0,.25);border-radius:8px;padding:10px;margin-bottom:12px;font-size:12px;line-height:1.6">
      <div style="font-weight:bold;color:#ffa500;margin-bottom:4px">🔓 개발자 모드 활성화</div>
      <div style="color:var(--dim)">현재 상태: ${isAdmin?'<span style="color:var(--green)">✅ 관리자 ('+u.email+')</span>':'<span style="color:var(--yellow)">⚠️ 관리자 로그인 필요</span>'}</div>
    </div>
    ${!isAdmin?`
      <div style="font-size:13px;color:var(--txt);margin-bottom:8px">데이터 조회는 <span style="color:var(--cyan)">${ADMIN_EMAIL}</span> 으로 Google 로그인 후 가능합니다.</div>
      <button class="btn btn-sm" style="width:100%;margin-bottom:8px" onclick="cloudGoogleSignIn()">🔗 Google로 로그인 (관리자 계정)</button>
    `:''}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px">
      <button class="btn btn-sm" ${!isAdmin?'disabled style="opacity:.4"':''} onclick="devShowFeedback()">📬 피드백 조회</button>
      <button class="btn btn-sm" ${!isAdmin?'disabled style="opacity:.4"':''} onclick="devShowSaveStats()">📊 세이브 통계</button>
      <button class="btn btn-sm" style="border-color:#ffa500;color:#ffa500" onclick="cheatGiveCredits(10000000)">💰 +1천만</button>
      <button class="btn btn-sm" style="border-color:#ffa500;color:#ffa500" onclick="cheatGiveCredits(100000000)">💰 +1억</button>
      <button class="btn btn-sm btn-red" onclick="if(confirm('모든 로컬 저장 데이터 삭제?')){for(let i=0;i<=8;i++)localStorage.removeItem(i===0?'de_save':'de_save_s'+i);notify('🗑️ 로컬 세이브 전체 삭제','ok');}">🗑️ 로컬 전체 삭제</button>
      <button class="btn btn-sm" onclick="(function(){const log=JSON.parse(localStorage.getItem('de_feedback_log')||'[]');alert('로컬 피드백 로그:\\n'+JSON.stringify(log,null,2));})()">📜 로컬 로그</button>
    </div>
    <div style="font-size:10px;color:var(--muted);text-align:center;margin-top:6px">개발/디버그 전용 메뉴</div>
  </div>`;
  openModal('🛠️ 개발자 메뉴',html,[{txt:'닫기',fn:closeModal,cls:'btn-sm'}],{wide:true});
}
async function devShowFeedback(){
  if(!window.CloudSave){notify('CloudSave 미초기화','err');return;}
  notify('📥 피드백 조회 중...','ok');
  const r=await CloudSave.listFeedback(200);
  if(r.error){notify('조회 실패: '+r.error,'err');return;}
  const items=r.items||[];
  const escapeHtml=s=>String(s||'').replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'})[c]);
  const rows=items.map(f=>`
    <div style="border:1px solid rgba(0,243,255,.2);border-radius:6px;padding:8px 10px;margin-bottom:6px;background:rgba(255,255,255,.03)">
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--dim);margin-bottom:4px">
        <span>${escapeHtml(f.id||'(익명)')} ${f.anon?'👤':'🔐'}</span>
        <span>${f.tsClient?new Date(f.tsClient).toLocaleString('ko-KR'):''}</span>
      </div>
      <div style="font-size:13px;color:var(--txt);line-height:1.6;white-space:pre-wrap">${escapeHtml(f.msg)}</div>
      <div style="font-size:10px;color:var(--muted);margin-top:4px">v${escapeHtml(f.ver)} · TURN ${f.turn||0} · ${escapeHtml((f.ua||'').slice(0,50))}</div>
    </div>`).join('');
  const html=`<div style="max-height:60vh;overflow-y:auto;padding:4px">
    ${items.length===0?'<div style="text-align:center;color:var(--dim);padding:30px">아직 등록된 피드백이 없습니다.</div>':rows}
  </div>`;
  openModal('📬 피드백 ('+items.length+'건)',html,[{txt:'닫기',fn:closeModal,cls:'btn-sm'}],{wide:true});
}
function devShowSaveStats(){
  let localCount=0,localBytes=0;
  for(let i=0;i<=SAVE_SLOTS;i++){
    const v=localStorage.getItem(i===0?'de_save':'de_save_s'+i);
    if(v){localCount++;localBytes+=v.length;}
  }
  const u=window.CloudSave&&CloudSave.getUser&&CloudSave.getUser();
  const html=`<div style="padding:8px;font-size:13px;line-height:1.8">
    <div><b>로컬 슬롯:</b> ${localCount} / ${SAVE_SLOTS}</div>
    <div><b>로컬 용량:</b> ${(localBytes/1024).toFixed(1)} KB</div>
    <div><b>UID:</b> ${u?u.uid:'(미로그인)'}</div>
    <div><b>이메일:</b> ${u?(u.email||'(익명)'):'-'}</div>
  </div>`;
  openModal('📊 세이브 통계',html,[{txt:'닫기',fn:closeModal,cls:'btn-sm'}]);
}

// 개발자 메뉴 진입: 키보드 단축키
window.addEventListener('keydown',function(e){
  if((e.ctrlKey||e.metaKey)&&e.shiftKey&&(e.key==='D'||e.key==='d')){
    e.preventDefault();
    if(sessionStorage.getItem('de_dev_unlocked')==='1')showDevMenu();
    else promptDevPassword();
  }
});
// URL 파라미터로 진입
if(location.search.indexOf('dev=1')>=0){
  setTimeout(()=>promptDevPassword(),1500);
}
// 타이틀 로고 5연속 클릭으로 진입 (모바일/숨김 대응)
window.addEventListener('DOMContentLoaded',function(){
  let clicks=0,timer=null;
  document.addEventListener('click',function(e){
    const tgt=e.target;
    if(!tgt)return;
    const txt=(tgt.textContent||'').trim();
    // 타이틀 화면의 🌌 또는 DESTINATION 글자 5연타
    if(txt==='🌌'||txt==='DESTINATION'){
      clicks++;
      if(timer)clearTimeout(timer);
      timer=setTimeout(()=>{clicks=0;},2000);
      if(clicks>=5){clicks=0;if(sessionStorage.getItem('de_dev_unlocked')==='1')showDevMenu();else promptDevPassword();}
    }
  });
});

// ── 게임 시작 (DOM 파싱 완료 후 즉시 실행) ─────────────────────
// 클라우드 세이브 초기화 (Firebase SDK 로드 대기 후 익명 로그인 + 동기화)
try{if(window.CloudSave)CloudSave.init();else setTimeout(()=>{if(window.CloudSave)CloudSave.init();},1000);}catch(e){}
runLoading();
