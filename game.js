
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

// ═══ SHOP STOCK (상점 재고 - 행성 방문시 한번만 생성) ═══════════
function generateShopStock(planetId){
  if(G.shopStock[planetId]){
    // 구버전 저장데이터: 제작 재료가 없을 경우 패치 추가
    const _st=G.shopStock[planetId];
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
    return;
  }  // 이미 생성됨 (리셋 방지)
  const stock={};
  const pd=PLANET_DEF.find(p=>p.id===planetId);
  const fac=pd?.f;
  // 해당 문명권 특산물 + 주변 특산물
  const available=COMMODITIES.filter(c=>c.f===fac||Math.random()<0.4);
  available.forEach(c=>{
    if(c.material){
      // 희귀 제작 재료: 4~13개 공급 (기존 2배)
      stock[c.id]=Math.floor(Math.random()*10)+4;
    } else {
      // 가격이 낮을수록 많은 수량 (1~100), 높을수록 적은 수량 (1~15)
      const priceRatio=c.buy/15000;  // 0~1
      const maxQty=Math.max(5,Math.floor(100*(1-priceRatio*0.85)));
      const minQty=Math.max(1,Math.floor(maxQty*0.3));
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
    const availShips=SHIP_CATALOG.filter(s=>
      s.tier==='소형'||
      (s.tier==='중형'&&(hasSunsin?ring>=1:ring>=3))||
      (s.tier==='대형'&&!s.id.startsWith('H1')&&!s.id.startsWith('LGD')&&(hasSunsin?ring>=3:ring>=5))||
      (s.tier==='대형'&&(s.id==='H10'||s.id==='H11')&&isVoidPlanet&&plvForShip>=80)||
      (s.tier==='대형'&&s.id==='H12'&&isVoidPlanet&&plvForShip>=80)||
      (s.tier==='신화'&&plvForShip>=100)
    );
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
    const hpPct=Math.max(0,Math.round(s.hp/st.HP*100));
    const shPct=Math.max(0,Math.round((s.sh||0)/Math.max(1,st.maxSH)*100));
    const fc=s.tier==='신화'?'#cc66ff':s.tier==='대형'?'#d4af37':s.tier==='중형'?'#00f3ff':'#88ccff';
    const tierIc=s.tier==='신화'?'✦':s.tier==='대형'?'🌟':s.tier==='중형'?'🚀':'🛸';
    const isFlagship=(i===0);
    const _att=st.ATT||0;
    const _int=st.INT||0;
    const _tec=st.TEC||0;
    return`<div onclick="showShipDetailModal(${i})" style="background:rgba(0,243,255,.05);border:1px solid ${fc}${isFlagship?'99':'44'};border-radius:8px;padding:5px 7px;cursor:pointer;display:flex;flex-direction:column;gap:3px;transition:border-color .2s;height:78px;box-sizing:border-box;min-width:0" onmouseover="this.style.borderColor='${fc}'" onmouseout="this.style.borderColor='${fc}${isFlagship?'99':'44'}'">
      <div style="display:flex;align-items:center;gap:6px;flex:1;min-height:0">
        ${imgOrEmoji(shipImgSrc(s),tierIc,44,44,'border-radius:5px;background:rgba(0,0,0,.5);flex-shrink:0')}
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
  const modalContent=`<div style="padding:14px;min-width:340px;max-width:540px">
    <div style="display:flex;gap:14px;margin-bottom:14px;align-items:flex-start">
      ${imgOrEmoji(shipImgSrc(s),tierIc,96,96,'border-radius:8px;background:rgba(0,0,0,.6);flex-shrink:0')}
      <div style="flex:1;min-width:0">
        <div style="font-size:18px;font-weight:bold;color:${fc};margin-bottom:2px">${isFlagship?'⚑ 기함 ':''}${s.nm}</div>
        <div style="font-size:12px;color:var(--dim);margin-bottom:8px">${s.tier}</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;font-size:13px;margin-bottom:8px">
          <span style="color:var(--red)">⚔️ ATT ${ATT}</span>
          <span style="color:var(--blue)">🔮 INT ${INT2}</span>
          <span style="color:var(--cyan)">⚡ ENG ${TEC}</span>
        </div>
        <div style="margin-top:4px">
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
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
      <div>
        <div style="font-size:13px;color:var(--cyan);font-weight:bold;margin-bottom:6px">👥 크루 (${crewIds.length}/${getMaxCrew(s)})</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">${crewHtml}</div>
      </div>
      <div>
        <div style="font-size:13px;color:var(--gold);font-weight:bold;margin-bottom:6px">⚙️ 장착 파츠 (${parts.length})</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">${partsHtml}</div>
      </div>
    </div>
    <div style="border-top:1px solid var(--bdr);padding-top:10px;display:flex;flex-direction:column;gap:8px">
      <!-- 파츠/크루/창고/기함 설정 -->
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn btn-sm" style="border-color:var(--gold);color:var(--gold)" onclick="pickPartModal(${idx})">⚙️ 파츠 장착</button>
        <button class="btn btn-sm" style="border-color:var(--cyan);color:var(--cyan)" onclick="pickCrewModal(${idx})">👥 크루 배치</button>
        ${(s.crewIds||[]).length>0?`<button class="btn btn-sm" style="border-color:#f88;color:#f88" onclick="unassignCrewModal(${idx},0)">👤 크루 해제</button>`:''}
        ${(()=>{if((s.cargoSlots||4)>=80)return'<span style="font-size:11px;color:var(--cyan)">📦최대80칸</span>';const cp=getCargoUpgradePrice(s);return`<button class="btn btn-sm" style="border-color:var(--purple);color:var(--purple)" onclick="upgradeCargoSlotFromModal(${idx})" ${G.credits>=cp?'':'disabled'}>📦 창고+2칸 ₡${cp.toLocaleString()} (${s.cargoSlots||4}/80)</button>`;})()}
        ${!isFlagship?`<button class="btn btn-sm" style="border-color:var(--gold);color:var(--gold);font-weight:bold;background:rgba(212,175,55,.12)" onclick="setAsFlagship(${idx})">⚑ 기함으로 설정</button>`:'<span style="font-size:11px;color:var(--gold);padding:4px 8px;border:1px solid rgba(212,175,55,.4);border-radius:5px">⚑ 현재 기함</span>'}
      </div>
      <!-- 수리 버튼 -->
      <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
        <span style="font-size:11px;color:var(--dim)">수리:</span>
        ${rc>0?`<button class="btn btn-sm btn-green" onclick="repairShipModal(${idx},'hp')" ${G.credits>=rc?'':'disabled'}>🔧 HP ₡${rc.toLocaleString()}</button>`:'<span style="font-size:11px;color:var(--green)">✅HP최대</span>'}
        ${shMax>0&&(s.sh||0)<shMax&&sc>0?`<button class="btn btn-sm" style="border-color:var(--blue);color:var(--blue)" onclick="repairShipModal(${idx},'sh')" ${G.credits>=sc?'':'disabled'}>🛡️실드 ₡${sc.toLocaleString()}</button>`:''}
        ${(rc+sc)>0?`<button class="btn btn-sm btn-gold" onclick="repairShipFullModal(${idx})" ${G.credits>=(rc+sc)?'':'disabled'}>⚡완전수리 ₡${(rc+sc).toLocaleString()}</button>`:''}
        <button class="btn btn-sm" onclick="closeModal();hubTab('garage')" style="margin-left:auto;font-size:10px;opacity:.6">🔧 정비소</button>
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
  window.bkToggleFloat=function(){
    const d=getDlg();if(!d)return;
    floating=!floating;
    if(floating){
      // 현재 위치 기준 분리
      const r=d.getBoundingClientRect();
      d.classList.add('bk-floating');
      d.style.left=r.left+'px';d.style.top=r.top+'px';
      d.style.right='auto';d.style.bottom='auto';
      d.style.width=r.width+'px';
      d.style.maxHeight='none';d.style.height=(d.classList.contains('bk-open')?r.height:36)+'px';
      document.getElementById('bk-pin-btn').textContent='📌';
    } else {
      d.classList.remove('bk-floating');
      d.style.left='';d.style.top='';d.style.right='';d.style.bottom='';
      d.style.width='';d.style.height='';d.style.maxHeight='';
      document.getElementById('bk-pin-btn').textContent='⊞';
      floating=false;
    }
    saveState();
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
    resOX=e.clientX;resOY=e.clientY;resW=r.width;resH=r.height;
    e.preventDefault();e.stopPropagation();
  });
  document.addEventListener('mousemove',function(e){
    const d=getDlg();if(!d)return;
    if(dragging){
      const nx=e.clientX-dragOX,ny=e.clientY-dragOY;
      const mw=window.innerWidth,mh=window.innerHeight;
      const r=d.getBoundingClientRect();
      d.style.left=Math.max(0,Math.min(nx,mw-r.width))+'px';
      d.style.top=Math.max(0,Math.min(ny,mh-36))+'px';
    }
    if(resizing){
      const nw=Math.max(280,resW+(e.clientX-resOX));
      const nh=Math.max(80,resH+(e.clientY-resOY));
      d.style.width=nw+'px';d.style.height=nh+'px';
    }
  });
  document.addEventListener('mouseup',function(){
    if(dragging||resizing)saveState();
    dragging=false;resizing=false;
  });
  // 저장된 상태 복원
  try{
    const saved=JSON.parse(localStorage.getItem(STORE_KEY)||'{}');
    if(saved.floating){
      document.addEventListener('DOMContentLoaded',function(){
        const d=getDlg();if(!d)return;
        floating=true;
        d.classList.add('bk-floating');
        if(saved.left)d.style.left=saved.left;
        if(saved.top)d.style.top=saved.top;
        if(saved.right!==undefined)d.style.right=saved.right;
        d.style.bottom='auto';
        if(saved.width)d.style.width=saved.width;
        if(saved.height)d.style.height=saved.height;
        d.style.maxHeight='none';
        const pin=document.getElementById('bk-pin-btn');
        if(pin)pin.textContent='📌';
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

// ═══ STARS ════════════════════════════════════════════════════
(function(){
  const cv=document.getElementById('star-bg'),ctx=cv.getContext('2d');
  const stars=[];function resize(){cv.width=window.innerWidth;cv.height=window.innerHeight;}resize();window.addEventListener('resize',resize);
  for(let i=0;i<180;i++)stars.push({x:Math.random(),y:Math.random(),r:Math.random()*1.4+.3,a:Math.random(),spd:Math.random()*.005+.001,ph:Math.random()*Math.PI*2});
  function draw(t){ctx.clearRect(0,0,cv.width,cv.height);stars.forEach(s=>{const a=s.a*(.4+.6*Math.abs(Math.sin(t*s.spd+s.ph)));ctx.fillStyle=`rgba(255,255,255,${a})`;ctx.beginPath();ctx.arc(s.x*cv.width,s.y*cv.height,s.r,0,Math.PI*2);ctx.fill();});requestAnimationFrame(draw);}
  requestAnimationFrame(draw);
})();

// ═══ HUD ════════════════════════════════════════════════════
function updateHUD(){updateGatherBtn();
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
    const targetBg='url(img/bg/'+G.currentPlanet+'.png)';
    const targetOp=(G._currentHubTab==='main')?'1.0':'.0';
    // 행성이 바뀌었을 때만 이미지 교체 (깜빡임 방지)
    if(hubBg._loadedPlanet!==G.currentPlanet){
      hubBg._loadedPlanet=null; // 로딩 중 표시
      const bgImg=new Image();
      bgImg.onload=function(){
        hubBg.style.backgroundImage=targetBg;
        hubBg._loadedPlanet=G.currentPlanet;
        hubBg.style.opacity=targetOp;
      };
      bgImg.onerror=function(){
        hubBg.style.backgroundImage='none';
        hubBg._loadedPlanet=G.currentPlanet;
      };
      bgImg.src='img/bg/'+G.currentPlanet+'.png';
    } else {
      // 같은 행성 — 이미지 교체 없이 opacity만 즉시 적용
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
    {k:['함선','배','ship','거래소','중형','대형','전설기함'],r:()=>`함선 거래소: 중형=전투력 40+, 대형=전투력 80+, 전설·신화=전투력 100+ 필요. 정비소에서 수리·파츠·크루 배치 가능. 도크 메뉴 1번이 정비소야.`},
    // 파츠/장착
    {k:['파츠','part','무기','실드','장갑','엔진','장착','업그레이드'],r:()=>`함선 도크 → 정비소에서 파츠 장착. 레이져(ATT)·미사일(ATT)·실드(INT/SH)·장갑(HP)·엔진(TEC) 순으로 구매 가능. 레이져는 쉴드에, 미사일은 장갑에 약해.`},
    // 크루/동료
    {k:['크루','동료','영입','가챠','뽑기','crew'],r:()=>`크루는 주점 가챠로 뽑거나 퀘스트 클리어 시 전설 동료 합류. 정비소에서 탑승시키면 ATT·INT·TEC 상승. 최대 24명. 전설 영웅은 퀘스트 10% 확률로 획득!`},
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
    {k:['경매','행성 구매','부동산','auction','소유','세금'],r:()=>{const ve=G.voidEssence||0,max=2+Math.floor(ve/1000);return`행성 프론트 → 경매에서 행성 구매 가능. 소유하면 매 턴 세금 수입. 최대 소유 ${max}개 (VE ${ve} 보유). VE 1000당 +1개 추가.`;}},
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
// 블링크 엔진(E15) 전체 함선 장착 여부 확인
function hasBlinkOnAll(){
  if(!G.fleet||G.fleet.length===0)return false;
  return G.fleet.every(s=>(s.parts||[]).includes('E15'));
}
// 스토리 진행 힌트 — 게임 상태 기반 맥락형
function getBaekguStoryHint(){
  const plv=calcPlayerLevel();
  const ownedCount=Object.values(G.planets).filter(p=>p.owned).length;
  const heroCount=G.heroes.length;
  const fleetSize=G.fleet.length;
  const blink=hasBlinkOnAll();
  const chix=G.chixWaves||0;
  // 최우선: 블링크 엔진 미완성 유도
  if(fleetSize>1&&!blink){
    const lacking=G.fleet.filter(s=>!(s.parts||[]).includes('E15')).length;
    return `블링크 엔진이 ${lacking}척에 아직 없어. 전 함대에 장착하면 은하 어디든 순간이동할 수 있어!`;
  }
  // ACT 1 힌트
  if(G.act===1){
    if(heroCount===0)return '영웅을 먼저 영입해야 해. 각 행성에 전설 영웅이 숨어있어. 은하계 경로 열어봐.';
    if(fleetSize<3)return '함선이 부족해. 거래소에서 중형함 사고 함대 3척 이상으로 키워야 해.';
    if(G.credits<50000)return '크레딧이 너무 적어. 행성 상점에서 무역하거나 퀘스트 수락해서 자금 모아.';
    if(ownedCount===0)return '행성 하나도 안 샀어? 경매탭에서 가까운 행성부터 투자해. 턴마다 세금 들어와.';
    return `ACT 1 목표: 크레딧 ₡200,000 이상, 함선 5척, 영웅 2명. 지금 레벨 ${plv} — 20턴 안에 ACT 2 진입.`;
  }
  // ACT 2 힌트
  if(G.act===2){
    if(heroCount<4)return `영웅이 ${heroCount}명뿐이야. 6명 이상 모아야 치크스 최종전 준비 가능해.`;
    if(chix===0)return '치크스 적대 행성(1링)에 진입해야 해. 은하계 경로에서 보라색 행성이야. 위험하지만 VE 보상이 커.';
    if(chix>=5)return `치크스 출몰 ${chix}회. ACT 3에서 최종전 준비해. 함대 6척·영웅 6명·₡50만 목표.`;
    if(ownedCount<3)return '행성 더 사야 해. 세금 수입이 안정되어야 치크스와 싸울 자금이 생겨.';
    return `ACT 2 목표: 치크스 행성 5개 격파, 영웅 6명, 보이드 에센스 수집. 7링 균열지대도 탐험해봐.`;
  }
  // ACT 3 힌트
  if(G.act===3){
    const cheeksCleared=(G.combatHistory||[]).filter(c=>c.win&&(c.planet.includes('치크스')||c.planet.includes('TOI')||c.planet.includes('케플러-452')||c.planet.includes('우르사-알파')||c.planet.includes('오미크론')||c.planet.includes('타이탄-X'))).length;
    const hasAllHeroes=heroCount>=8;
    // 단계별 상세 힌트
    if(!hasAllHeroes){
      const missing=8-heroCount;
      return `영웅 ${heroCount}/8명. 아직 ${missing}명 부족해. 행성마다 전설 영웅이 숨어있어 — 은하계 경로에서 ✨ 표시 행성 찾아봐.`;
    }
    if(cheeksCleared===0)return `치크스 행성 공략이 0회야. 은하계 경로에서 1링(보라색) 행성으로 가서 전투해야 해. TOI-700 d, 케플러-452b, 우르사-알파 등이야.`;
    if(cheeksCleared<5)return `치크스 ${cheeksCleared}/5개 공략 완료. ${5-cheeksCleared}개 더 격파하고 영웅 6명·함대 6척·₡50만 갖추면 최종전 진입 가능해!`;
    if(cheeksCleared>=5&&heroCount<6)return `치크스 5개 격파! 영웅이 ${heroCount}/6명이야. 행성마다 숨은 영웅 더 찾아봐.`;
    if(cheeksCleared>=5&&fleetSize<6)return `치크스 5개 격파! 함대가 ${fleetSize}척이야 — 최소 6척으로 키워야 최종전 진입 가능해.`;
    if(cheeksCleared>=5&&G.credits<500000)return `치크스 5개 격파! 크레딧 ₡${G.credits.toLocaleString()} — ₡500,000 이상 모아야 최종전 가능해.`;
    if(cheeksCleared>=5)return `치크스 ${cheeksCleared}개 격파 완료! 지금 당장 은하계 경로 열고 🌍 지구를 클릭해서 우르사 메이저를 박살내! 지구 해방이 눈앞이야!!`;
    return '최종 목표: 치크스 행성 5개 격파 → 영웅 6명 + 함대 6척 + ₡50만 → 지구 클릭 → 최종전!';
  }
  return '은하계 경로에서 미탐험 행성 찾아봐.';
}
function openModal(title,bodyHTML,buttons=[],opts={}){
  document.getElementById('modal-t').textContent=title;
  document.getElementById('modal-b').innerHTML=bodyHTML;
  const btns=document.getElementById('modal-btns');btns.innerHTML='';
  buttons.forEach(b=>{const el=document.createElement('button');el.className=`btn btn-sm ${b.cls||''}`;el.textContent=b.txt;el.onclick=b.fn;btns.appendChild(el);});
  const mbox=document.querySelector('#modal-bg .modal');
  if(mbox){mbox.classList.toggle('modal-wide',!!opts.wide);}
  document.getElementById('modal-bg').classList.add('on');
}
function closeModal(){document.getElementById('modal-bg').classList.remove('on');}

// ═══ LOADING ════════════════════════════════════════════════════
function runLoading(){
  const fill=document.getElementById('ld-fill'),msg=document.getElementById('ld-msg');
  const msgs=['은하 지도 생성 중...','백구 AI 초기화 중...','우주 데이터 로드 중...','전투 시스템 준비 중...','완료!'];
  let i=0;const iv=setInterval(()=>{i++;fill.style.width=(i*20)+'%';msg.textContent=msgs[Math.min(i-1,msgs.length-1)];
    if(i>=5){clearInterval(iv);setTimeout(()=>{show('s-title');if(localStorage.getItem('de_save'))notify('💾 저장 데이터 있음. 이어하기 가능.','ok');},400);}},400);
}

// ═══ TITLE / AGE / FTUE ═══════════════════════════════════════
function showExitModal(){
  openModal('🚪 게임 종료',
    `<div style="text-align:center;padding:12px">
      <div style="font-size:58px;margin-bottom:12px">🐕</div>
      <div style="color:var(--yellow);font-size:18px;font-weight:bold;margin-bottom:8px">정말 종료하시겠습니까?</div>
      <div style="color:var(--dim);font-size:14px;line-height:1.8">
        현재 진행 상황 TURN ${G.turn}<br>
        보유 크레딧 ₡${G.credits.toLocaleString()}<br>
        <span style="color:var(--muted);font-size:12px">※ 저장 후 종료를 권장합니다</span>
      </div>
    </div>`,
    [
      {txt:'💾 저장 후 종료',fn:()=>{saveGame(false);setTimeout(()=>{try{window.close();}catch(e){}show('s-title');closeModal();},400);},cls:'btn-gold'},
      {txt:'🚪 저장 없이 종료',fn:()=>{try{window.close();}catch(e){}show('s-title');closeModal();},cls:'btn-red'},
      {txt:'취소',fn:closeModal,cls:'btn-sm'}
    ]
  );
}
function showTitle(){show('s-title');}
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
// 난이도 배율: easy=0.9, normal=1.0, hard=1.1, extreme=1.2 (HP+ATK 모두)

// ─── 이미지 썸네일 헬퍼 ─────────────────────────────────────────────
// ═══ SCROLL-SAFE RERENDER ════════════════════════════════════════
// 탭 재렌더 시 스크롤 위치 유지 헬퍼
function rerenderTab(renderFn){
  const body=document.getElementById('hub-body');
  if(!body)return;
  const scrollEl=body.querySelector('.hub-scroll');
  const scrollTop=scrollEl?scrollEl.scrollTop:0;
  renderFn(body);
  requestAnimationFrame(()=>{
    const newScroll=body.querySelector('.hub-scroll');
    if(newScroll)newScroll.scrollTop=scrollTop;
  });
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
  'part_ML04':'🔨 소피아 모렛룥이 중력 연구 중 "집속하면 엔진을 봉인할 수 있을 것 같아"라며 군사용으로 전환했다.\n📜 이름 유래: 중력 집속탄. 명중 후 적 엔진 출력을 일시 봉쇄한다. 도망을 막는 병기.\n⚔️ 강점: 적 기동 봉쇄. 단점: 봉쇄 지속 시간이 짧아 후속 공격이 빠르게 이뤄져야 한다.\n💬 도망치려는 적에게 최고다. 모렛룥이 연구 목적을 물으면 "학문적 탐구"라고 한다.',
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
  var x=evt.clientX+16,y=evt.clientY+16;
  tip.style.left=x+'px';
  tip.style.top=y+'px';
  // 뷰포트 경계 보정
  requestAnimationFrame(function(){
    var r=tip.getBoundingClientRect();
    if(r.right>window.innerWidth-8)tip.style.left=(evt.clientX-r.width-12)+'px';
    if(r.bottom>window.innerHeight-8)tip.style.top=(evt.clientY-r.height-12)+'px';
  });
}
function hideLoreTip(){
  var tip=document.getElementById('de-tooltip');
  if(tip)tip.style.display='none';
}

function imgOrEmoji(src,fallback,w,h,style,loreKey){
  w=w||80;h=h||80;
  var tipAttr=loreKey?(' onmouseover="showLoreTip(\''+loreKey+'\',event)" onmouseout="hideLoreTip()"'):'';
  return `<div style="width:${w}px;height:${h}px;flex-shrink:0;display:flex;align-items:center;justify-content:center;${style||''}"${tipAttr}>
    <img src="${src}" alt="" style="width:100%;height:100%;object-fit:contain"
      onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
      onload="this.nextElementSibling.style.display='none'">
    <div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:${Math.round(h*0.5)}px">${fallback}</div>
  </div>`;
}
function shipImgSrc(ship){
  // 1) 명시적 catId (새 나포함선)
  if(ship.catId) return 'img/ships/'+ship.catId+'.png';
  const sid=ship.id||'';
  // 2) 나포 함선 (CAP_xxx): 이름/id로 팩션+티어 추정
  if(sid.startsWith('CAP_')){
    const nm=(ship.nm||'').toLowerCase();
    // 보스(우르사 메이저) 나포 — Boss.png 사용
    if(nm.includes('우르사')||nm.includes('ursa')||nm.includes('보스')||nm.includes('boss'))
      return 'img/ships/Boss.png';
    const faction=nm.includes('치크스')||nm.includes('chix')?'CHIX':
                  nm.includes('dbrp')?'DBRP':'PIRATE';
    const sz={'소형':'S','중형':'M','대형':'L','전설기함':'L'}[ship.tier]||'S';
    return 'img/ships/'+faction+'_'+sz+'.png';
  }
  // 3) 일반 함선: id 앞부분
  const catId=sid.replace(/_.*$/,'')||'default';
  return 'img/ships/'+catId+'.png';
}
function planetImgSrc(pid){return `img/planets/${pid||'P01'}.png`;}
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
function getDiffMult(){return{easy:0.8,normal:1.0,hard:1.2,extreme:1.5}[G.difficulty]||1.0;}
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
// 레벨 기반 적 강화 배율: lv1→×1.00, lv50→×1.37, lv100→×1.80
function getLevelMult(){return 1.0+((calcPlayerLevel()-1)*0.0008);}
// 플레이어 함대 평균 전투력 (ATK·HP) — 적 스탯 비례 조정용
function calcFleetAvgPower(){
  if(!G.fleet||!G.fleet.length)return{atk:18,hp:120};
  let totalATK=0,totalHP=0;
  G.fleet.forEach(s=>{
    const st=getShipStats(s);
    totalATK+=(st.ATT||18);
    totalHP+=(st.HP||120);
  });
  const n=G.fleet.length;
  return{atk:Math.max(10,Math.round(totalATK/n)),hp:Math.max(80,Math.round(totalHP/n))};
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
  const err=document.getElementById('ft-er');
  if(!nm){err.textContent='사령관명을 입력해 주세요.';return;}
  G.profile.name=nm;G.profile.company=co||'빅 픽처 스페이스';G.profile.ship=sh||'머스탱';
  err.textContent='';initGame();show('s-prologue');startPrologue();
}
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
  box.innerHTML=spHTML+`<div style="color:var(--yellow);font-size:17px;line-height:2">${l.tx}</div>`;
  const btn=document.getElementById('pr-btn');
  btn.style.display='inline-block';
  btn.textContent=pIdx<pl.length-1?'계속 ▶':'허브로 →';
}
function nextPrologue(){const pl=getPrologues();if(pIdx<pl.length-1){pIdx++;renderPrologue();}else showHub();}

// ═══ HUB ════════════════════════════════════════════════════
function showHub(){
  show('s-hub');
  // 배경 이미지 즉시 프리로드 (깜빡임 방지)
  (function(){
    const hubBg=document.getElementById('hub-planet-bg');
    if(!hubBg||hubBg._loadedPlanet===G.currentPlanet)return;
    const src='img/bg/'+G.currentPlanet+'.png';
    const pre=new Image();
    pre.onload=function(){
      hubBg.style.backgroundImage='url('+src+')';
      hubBg._loadedPlanet=G.currentPlanet;
      hubBg.style.opacity=(G._currentHubTab==='main')?'1.0':'.0';
    };
    pre.onerror=function(){hubBg._loadedPlanet=G.currentPlanet;};
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
    // 스토리 진행 힌트 우선 — 2회에 1번 확률로 등장
    if(Math.random()<0.5){baekgu(getBaekguStoryHint());return;}
    baekgu(tips[Math.floor(Math.random()*tips.length)]);
  },45000);
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
  return 15; // 5회마다 도크→광장→프론트 순서 해금 (3단계 × 5)
}
// 행성 허브 단계: 0=전부잠금 1=도크 2=광장 3=프론트
function _getHubThr(pid){
  // 행성 팩션에 따라 허브 해금 임계값 결정
  // F01 수퍼비아 귀족: 1/2/3회 (접근성↑), 기타: 5/10/15회
  const pd=PLANET_DEF.find(p=>p.id===pid);
  if(pd&&pd.f==='F01')return{s1:1,s2:2,s3:3};
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
  if(cur===t.s1){
    notify('🔓 '+nm+' — 함선 도크 개방! (거래소·제작소·정비소)','gold');
    baekgu('도크 시설이 열렸어. 함선 거래소·제작소·정비소 이용 가능해.');
  } else if(cur===t.s2){
    notify('🔓 '+nm+' — 행성 광장 개방! (주점·무역·경매)','gold');
    baekgu('광장이 열렸어. 주점에서 크루 가챠하고 무역·경매도 이용해봐.');
  } else if(cur===t.s3){
    notify('🔓 '+nm+' — 행성 프론트 완전 개방! 모든 시설 이용 가능','gold');
    baekgu('이 행성 완전 개방이야. 이제 전부 쓸 수 있어.');
  }
  updateHubLockButtons();
}
function updateHubLockButtons(){
  const pid=G.currentPlanet;
  const stage=getPlanetHubStage(pid);
  const prog=getPlanetHubProgress(pid);
  // 도크: stage>=1, 광장: stage>=2, 프론트: stage>=3 (임계값은 팩션별 동적)
  const t=_getHubThr(pid);
  const stageMap={dock:1,plaza:2,front:3};
  const needMap={dock:t.s1,plaza:t.s2,front:t.s3};
  ['dock','plaza','front'].forEach(folder=>{
    const btn=document.querySelector('#folder-'+folder+' .hn-folder-btn');
    if(!btn)return;
    const need=stageMap[folder];
    const unlocked=stage>=need;
    const lbl=btn.querySelector('span:nth-child(2)');
    if(!lbl)return;
    if(!lbl.dataset.origText)lbl.dataset.origText=lbl.textContent.replace(/ 🔒.*$/,'');
    if(!unlocked){
      btn.style.opacity='0.45';
      lbl.textContent=lbl.dataset.origText+' 🔒 '+prog+'/'+needMap[folder];
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
    // 도크계열 (5회), 광장계열 (10회), 프론트계열 (15회)
    const _dockTabs=['ship','craft','garage'];
    const _plazaTabs=['tavern','gacha','trade','auction'];
    const _frontTabs=['front','plaza','planets'];
    let needed=0,stageName='',stageEmoji='🏗️';
    if(_dockTabs.includes(tab)){needed=1;stageName='함선 도크';stageEmoji='🚀';}
    else if(_plazaTabs.includes(tab)){needed=2;stageName='행성 광장';stageEmoji='🏪';}
    else if(_frontTabs.includes(tab)){needed=3;stageName='행성 프론트';stageEmoji='🌐';}
    if(needed>0&&stage<needed){
      const pd=PLANET_DEF.find(p=>p.id===pid);
      const _thr2=_getHubThr(pid);
      const nextGoal=needed===1?_thr2.s1:needed===2?_thr2.s2:_thr2.s3;
      G._currentHubTab='main';
      setHubNav('main');
      updateFleetBar();
      const body=document.getElementById('hub-body');
      body.classList.remove('cv');
      body.innerHTML=`<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:30px;text-align:center;gap:14px">
        <div style="font-size:64px">${stageEmoji}</div>
        <div style="font-size:20px;font-weight:bold;color:var(--red)">🔒 ${stageName} 잠금</div>
        <div style="color:var(--dim);font-size:14px;line-height:2.1">
          <b style="color:var(--txt)">${pd?.nm||pid}</b><br>
          퀘스트 완료 또는 해적 격파 <b style="color:var(--gold)">${nextGoal}회</b> 달성 시 개방<br>
          <span style="color:var(--cyan)">현재 진행: ${prog} / ${nextGoal}</span>
        </div>
        <div style="background:rgba(0,243,255,.06);border:1px solid var(--cyan);border-radius:10px;padding:12px;font-size:13px;line-height:2;text-align:left;width:100%;max-width:320px">
          <div style="color:var(--yellow);font-weight:bold;margin-bottom:4px">📋 해금 단계</div>
          <div style="${prog>=5?'color:var(--green)':'color:var(--dim)'}">✅ 5회 → 🚀 함선 도크 (거래소·제작·정비)</div>
          <div style="${prog>=10?'color:var(--green)':'color:var(--dim)'}">✅ 10회 → 🏪 행성 광장 (주점·무역·경매)</div>
          <div style="${prog>=15?'color:var(--green)':'color:var(--dim)'}">✅ 15회 → 🌐 행성 프론트 (관리·현황)</div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">
          <button class="btn btn-sm btn-green" onclick="hubTab('quest')">🎖️ 퀘스트 수락하기</button>
          <button class="btn btn-sm btn-red" onclick="hubTab('main')">↩ 돌아가기</button>
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
  const firstSrc=factionId?'img/hub/'+factionId+'/'+tabId+'.png':genSrc;
  const onerr=factionId
    ?"if(this.src.indexOf('/'+arguments[0]+'/'+arguments[1])>=0){this.src='"+genSrc+"'}else{this.style.display='none';this.nextElementSibling.style.display='flex'}"
    :"this.style.display='none';this.nextElementSibling.style.display='flex'";
  return '<div style="position:relative;width:100%;height:60px;border-radius:8px;overflow:hidden;margin-bottom:8px;flex-shrink:0;background:rgba(5,10,22,.8)">'
    +'<img src="'+firstSrc+'" data-gen="'+genSrc+'" alt="'+label+'" style="width:100%;height:100%;object-fit:cover;display:block" onerror="var g=this.dataset.gen;if(this.src!==g&&this.src!==location.origin+\'/\'+g&&!this.src.endsWith(g)){this.src=g}else{this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'}">'
    +'<div style="display:none;position:absolute;inset:0;align-items:center;justify-content:center;flex-direction:column;gap:6px">'
    +'<div style="font-size:52px;opacity:.35">'+emoji+'</div>'
    +'<div style="color:rgba(0,243,255,.3);font-size:11px">'+(factionId?'img/hub/'+factionId+'/'+tabId+'.png':genSrc)+'</div>'
    +'</div>'
    +'<div style="position:absolute;inset:0;background:linear-gradient(0deg,rgba(5,10,22,.7) 0%,transparent 65%);pointer-events:none"></div>'
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
    <!-- 행성 배경 이미지 (전체 프레임) -->
    <img src="img/bg/${pd?.id||'P01'}.png" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.92;z-index:0"
      onerror="this.style.background='radial-gradient(ellipse at 40% 50%, #0d1a3a 0%, #050a1a 100%)';this.style.display='none'">
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
function calcTaxFor(pid){const pd=PLANET_DEF.find(p=>p.id===pid),st=G.planets[pid];if(!pd||!st||!st.owned)return 0;const aurBonus=pd.f==='F02'?1.25:1.0;return Math.floor(pd.tax*(1+st.commerce*.15)*1.8*aurBonus*0.5);}
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
  if(toRemove.length>0){updateHUD();if(G._currentHubTab==='ship'||G._currentHubTab==='garage')rerenderShipOrGarage();}
}

// ── 턴 종료 쿨다운 (실제 시간 3분) ──────────────────────────────
const TURN_COOLDOWN_MS = 3 * 60 * 1000; // 3분
let _lastTurnTime = 0;
let _turnCooldownTimer = null;

function tryNextTurn(){
  const now = Date.now();
  const elapsed = now - _lastTurnTime;
  if(_lastTurnTime > 0 && elapsed < TURN_COOLDOWN_MS){
    const remaining = Math.ceil((TURN_COOLDOWN_MS - elapsed) / 1000);
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
    const elapsed = Date.now() - _lastTurnTime;
    const remaining = Math.max(0, Math.ceil((TURN_COOLDOWN_MS - elapsed) / 1000));
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

function doNextTurn(){
  G.turn++;
  if(G.turn%20===0&&G.act<3){
    const prevAct=G.act;
    G.act++;
    setTimeout(()=>showActTransition(G.act),900);
  }
  G.stayTurns=(G.stayTurns||0)+1;
  tickGatherQuests();  // ← 채취 퀘스트 진행
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
  const dm=getDiffMult(),lm=getLevelMult(),ptm=getPirateTurnMult();
  const eCount=Math.min(Math.max(2,G.fleet.length),Math.round(4*getDiffCountMult()));
  const fp=calcFleetAvgPower();
  const tpMult=(0.55+(ring-1)*0.07)*dm*ptm;
  const eHP=Math.round(fp.hp*tpMult),eATK=Math.round(fp.atk*tpMult),eINT=Math.round(fp.atk*tpMult*0.6),eTEC=Math.round(fp.atk*tpMult*0.65);
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
    `<div style="text-align:center;padding:12px">
      <div style="font-size:58px;margin-bottom:10px">☠️</div>
      <div style="color:var(--red);font-size:19px;font-weight:bold;margin-bottom:8px">${pd?.nm||''} 항로 — 해적단 조우!</div>
      <div style="color:var(--dim);font-size:14px;line-height:1.9">
        이동 중 해적 ${eCount}척에게 기습당했습니다!<br>
        <span style="color:var(--muted);font-size:12px">조우 확률: ${chance}% (링${ring} · ${({easy:'쉬움',normal:'보통',hard:'어려움',extreme:'극악'})[G.difficulty]||'보통'})</span><br>
        <span style="color:var(--yellow)">승리 시 약탈금 획득 | 도주 시 크레딧 -15%</span>
      </div>
      <div style="margin-top:10px;color:var(--cyan);font-size:13px">🐕 백구: "항로에 적이다! 빨리 결정해!"</div>
    </div>`,
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
  const dm=getDiffMult(),lm=getLevelMult(),ptm=getPirateTurnMult();
  // 플레이어 함대 수 & 누적 등장 횟수 기반, 최소 2척
  const eCount=Math.min(Math.max(2,Math.floor(G.fleet.length*0.8)+Math.floor(G.pirateAppearances/2)),Math.round(4*getDiffCountMult()));
  const fp2=calcFleetAvgPower();
  const epMult=(0.45+(ring-1)*0.06)*dm*ptm*appMult;
  const eHP=Math.round(fp2.hp*epMult);
  const eATK=Math.round(fp2.atk*epMult);
  const eINT=Math.round(fp2.atk*epMult*0.55);
  const eTEC=Math.round(fp2.atk*epMult*0.60);
  const raidDef={
    id:'PIRATE_RAID',nm:'초반 해적',ring:ring,f:'PIRATE',hostile:true,tax:0,
    _enemies:Array.from({length:eCount},(_,i)=>({
      id:'EP'+i,nm:'해적 '+['정찰기','소형 전투함','강습정'][i%3],tier:'소형',isEnemy:true,
      hp:eHP,maxHP:eHP,sh:Math.floor(eHP*.15),maxSH:Math.floor(eHP*.15),
      ATT:eATK,INT:eINT,TEC:eTEC,HP:eHP,LOY:0,parts:[],crewIds:[]
    }))
  };
  openModal('🏴‍☠️ 해적 출몰!',
    `<div style="text-align:center;padding:12px">
      <div style="font-size:58px;margin-bottom:10px">☠️</div>
      <div style="color:var(--red);font-size:19px;font-weight:bold;margin-bottom:8px">${pd?.nm||''} — 해적 출몰!</div>
      <div style="color:var(--dim);font-size:14px;line-height:1.8">
        TURN ${G.turn} — 이 구역에 해적이 나타났습니다!<br>
        해적 ${eCount}척이 접근 중!<br>
        <span style="color:var(--yellow)">승리시 크레딧 획득 | 패배시 손실</span>
      </div>
      <div style="margin-top:6px;color:var(--yellow);font-size:12px">⚠️ 누적 등장 ${G.pirateAppearances}회 | 강화 ×${getPirateAppMult().toFixed(2)}</div>
      <div style="margin-top:4px;color:var(--cyan);font-size:13px">🐕 백구: "${G.pirateAppearances>=5?'이제 최강 해적! 각오해!':G.pirateAppearances>=3?'점점 강해져! 조심해!':'해적이야! 조심해!'}"</div>
    </div>`,
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

  const dm=getDiffMult(),lm=getLevelMult();
  const ring=pd?.ring||1;
  // 함선 수: 기본 3척, 출몰 횟수마다 20% 증가 (최대 8척)
  const baseCount=3;
  const countMult=Math.pow(1.20,wave);
  const eCount=Math.min(12,Math.round(baseCount*countMult*getDiffCountMult()));
  // 전투력: 플레이어 함대 비례 + 파도마다 20% 강화 (치크스는 적대 세력)
  const fp4=calcFleetAvgPower();
  const chixBase=(0.70+(ring-1)*0.06);   // ring1=0.70 ~ ring5=0.94
  const powerMult=Math.pow(1.20,wave)*dm;
  const eHP=Math.round(fp4.hp*chixBase*powerMult);
  const eATK=Math.round(fp4.atk*chixBase*powerMult);
  const eINT=Math.round(fp4.atk*chixBase*powerMult*0.65);
  const eTEC=Math.round(fp4.atk*chixBase*powerMult*0.70);

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
    `<div style="background:rgba(139,0,255,.08);border:1px solid #8b00ff66;border-radius:10px;padding:14px;margin-bottom:12px">
      <div style="color:${waveCol};font-size:17px;font-weight:bold;margin-bottom:8px">
        ${wave>=4?'☠️':'⚠️'} ${waveLbl} 출몰 — 전투력 ×${Math.pow(1.20,wave).toFixed(2)}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:13px;color:var(--dim);margin-bottom:10px">
        <div>함선 수: <span style="color:var(--red);font-weight:bold">${eCount}척</span></div>
        <div>출몰 횟수: <span style="color:${waveCol}">${G.chixWaves}/5</span></div>
        <div>HP: <span style="color:var(--cyan)">${eHP.toLocaleString()}</span></div>
        <div>공격력: <span style="color:var(--red)">${eATK}</span></div>
      </div>
      ${wave>=4?'<div style="color:var(--red);font-size:13px;font-weight:bold">⚠️ 최종 함대 — 이 전투가 마지막 기회!</div>':''}
    </div>
    <div style="font-size:13px;color:var(--dim);line-height:1.8">
      🐕 백구: "${wave>=4?'이게 마지막이야. 전멸시키자!':wave>=2?'점점 강해지고 있어. 조심해!':'치크스 함대 출현! 적 행성에서 오래 있으면 안 돼.'}"
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
  setHubNav('combat');updateHUD();sfxAlert();
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
  const dm=getDiffMult(),lm=getLevelMult(),ptm=getPirateTurnMult();
  const turnShipMult=Math.pow(1.2,Math.floor(G.turn/3));
  const eCount=Math.min(15,Math.round((2+Math.floor(ring/2))*turnShipMult*getDiffCountMult()));
  const fp3=calcFleetAvgPower();
  const prMult=(0.65+(ring-1)*0.08)*dm*ptm;
  const eHP=Math.round(fp3.hp*prMult),eATK=Math.round(fp3.atk*prMult),eINT=Math.round(fp3.atk*prMult*0.60),eTEC=Math.round(fp3.atk*prMult*0.65);
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
    `<div style="text-align:center;padding:12px">
      <div style="font-size:58px;margin-bottom:10px">☠️</div>
      <div style="color:var(--red);font-size:19px;font-weight:bold;margin-bottom:8px">${pd?.nm||''} — 해적단 기습!</div>
      <div style="color:var(--dim);font-size:14px;line-height:1.8">
        같은 행성에 ${G.stayTurns}턴 체류 → 해적 정보 누출!<br>
        해적 ${eCount}척이 공격해옵니다!<br>
        <span style="color:var(--yellow)">승리시 약탈금 획득 | 패배시 크레딧 손실</span>
      </div>
      <div style="margin-top:10px;color:var(--cyan);font-size:13px">🐕 백구: "내가 경고했잖아. 싸워!"</div>
    </div>`,
    [{txt:'⚔️ 전투 시작!',fn:()=>{closeModal();startPirateRaid(raidDef);},cls:'btn-red'},
     {txt:'🚀 도주 (크레딧 -20%)',fn:()=>{closeModal();escapePirateRaid();},cls:'btn-sm'}]
  );
  saveGame(true);
}
function startPirateRaid(raidDef){
  const players=G.fleet.map(s=>{const st=getShipStats(s);const _wpn=PARTS.find(p=>p.cat==='weapon'&&(s.parts||[]).includes(p.id));const _wrar=_wpn?(_wpn.rarity||''):'';const _shp=PARTS.find(p=>p.cat==='shield'&&(s.parts||[]).includes(p.id));const _shTier=_shp?(_shp.tier||0):0;const _arp=PARTS.find(p=>p.cat==='armor'&&(s.parts||[]).includes(p.id));const _arTier=_arp?(_arp.tier||0):0;return{...s,isEnemy:false,hp:Math.max(1,s.hp||st.HP),maxHP:st.HP,sh:(s.sh!=null?s.sh:st.maxSH),maxSH:st.maxSH,ATT:st.ATT,INT:st.INT,TEC:st.TEC,DEF:st.DEF||0,wtype:_wpn?(_wpn.wtype||'laser'):'laser',wpnTier:_wpn?(_wpn.tier||1):1,wpnRarity:_wrar,shieldTier:_shTier,armorTier:_arTier,tier:s.tier||'소형'};});
  combatState={players,enemies:raidDef._enemies,turn:0,done:false,log:[],planetDef:raidDef,isBoss:false,isPirate:true,_planetId:G.currentPlanet};
  renderCombatView(document.getElementById('hub-body'));
  setHubNav('combat');updateHUD();sfxAlert();
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
  const marcoMult=(G&&G.heroes&&G.heroes.includes('H08'))?1.10:1.0;
  // 제작 재료: maxSell:0이므로 구매가의 70% 고정 반환
  if(comm?.material){
    return Math.floor((comm.buy||cargoItem.buyPrice||0)*0.7*marcoMult);
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
    <div style="display:grid;grid-template-columns:repeat(8,1fr);gap:6px">
    ${G.cargo.map((slot,idx)=>{
      const sp=calcSellPrice(slot,G.currentPlanet),profitPer=sp-slot.buyPrice,profit=profitPer*slot.qty,pC=profit>0?'var(--green)':profit===0?'var(--dim)':'var(--red)';
      const isMixed=!slot.buyPlanetId||slot.buyPlanetId==='mixed';
      const samePlanet=!isMixed&&slot.buyPlanetId===G.currentPlanet;
      const sameFaction=!isMixed&&!samePlanet&&PLANET_DEF.find(p=>p.id===slot.buyPlanetId)?.f===pd?.f;
      const slotComm=COMMODITIES.find(c=>c.id===slot.id);const slotIc=slotComm?.ic||(slotComm?.material?'💎':'📦');
      const bdrCol=samePlanet?'rgba(255,255,255,.1)':sameFaction?'rgba(0,243,255,.35)':profit>0?'rgba(46,204,113,.35)':profit<0?'rgba(255,80,80,.3)':'var(--bdr)';
      const avgNote=isMixed?`<div style="font-size:10px;color:var(--muted)">평균매입₡${slot.buyPrice.toLocaleString()}</div>`:'';
      const priceLabel=samePlanet?'<div style="font-size:10px;color:var(--dim)">⚠️ 동일행성</div>'
        :`${avgNote}<div style="font-size:10px;color:${pC};font-weight:bold">₡${sp.toLocaleString()}/개</div>
         <div style="font-size:10px;color:${pC}">${profit>=0?'+':''}₡${profit.toLocaleString()}</div>`;
      return `<div style="background:var(--panel);border:1px solid ${bdrCol};border-radius:8px;padding:6px 5px;text-align:center;display:flex;flex-direction:column;gap:2px;align-items:center">
        ${imgOrEmoji('img/commodities/'+slot.id+'.png',slotIc,44,44,'background:#0d1a2a;border-radius:6px','comm_'+slot.id)}
        <div style="font-size:11px;font-weight:bold;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:100%;text-align:center" title="${slot.nm}">${slot.nm}</div>
        <div style="font-size:11px;color:var(--dim)">×${slot.qty}</div>
        ${priceLabel}
        <div style="display:flex;gap:3px;margin-top:3px;width:100%">
          <button class="btn btn-sm btn-gold" style="flex:1;font-size:10px;padding:2px 0" onclick="sellComm(${idx},1)">1개</button>
          ${slot.qty>1?`<button class="btn btn-sm btn-gold" style="flex:1;font-size:10px;padding:2px 0" onclick="sellComm(${idx},${slot.qty})">전량</button>`:''}
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
    <!-- 보유 화물 (절반 영역) -->
    <div style="flex:1;overflow-y:auto;min-height:0;padding:10px 16px 0;scrollbar-width:thin;scrollbar-color:rgba(0,243,255,.2) transparent">
      ${cargoHTML}
    </div>
    <!-- 구매 가능 특산물 그리드 -->
    <div style="flex:1;overflow-y:auto;padding:10px 14px 16px;scrollbar-width:thin;scrollbar-color:rgba(0,243,255,.2) transparent">
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
            const _pLock=(c.buy>=10000&&(_commPlv<60||_commRep<3000))||(c.buy>=5000&&(_commPlv<30||_commRep<1000));
            const canBuy=G.credits>=c.buy&&totalQty<MAX&&qty>0&&!_pLock;
            const _lockBadge=_pLock?`<div style="font-size:10px;color:var(--purple);font-weight:bold;margin-top:1px">🔒 ${c.buy>=10000?'전투력60·명성3000':'전투력30·명성1000'}</div>`:'';
            const isOrigin=c.f===pd?.f;
            const marcoBadge=hasMarco?`<div style="font-size:10px;color:var(--gold);margin-top:2px">🧭 최대₡${Math.floor(c.maxSell*1.1).toLocaleString()}</div>`:`<div style="font-size:10px;color:var(--dim);margin-top:2px">최대₡${(c.maxSell||0).toLocaleString()}</div>`;
            return`<div style="
              background:var(--card);
              border:1px solid ${isOrigin?'rgba(0,243,255,.4)':'var(--bdr)'};
              border-radius:10px;display:flex;flex-direction:row;overflow:hidden;
              transition:border-color .2s;
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
                <div style="display:flex;gap:3px;align-items:center;margin-top:4px">
                  <input id="qty_${c.id}" type="number" min="1" max="${qty}" value="1"
                    style="width:36px;padding:2px 3px;background:rgba(255,255,255,.08);border:1px solid rgba(0,243,255,.25);border-radius:4px;color:var(--txt);font-size:10px;text-align:center"
                    ${canBuy?'':'disabled'}>
                  <button class="btn btn-sm btn-green" onclick="buyCommN('${c.id}')" ${canBuy?'':'disabled'}
                    style="flex:1;font-size:10px;padding:3px 2px">구매</button>
                  <button class="btn btn-sm btn-green" onclick="buyComm('${c.id}')" ${canBuy?'':'disabled'}
                    style="font-size:10px;padding:3px 4px">1</button>
                </div>
              </div>
            </div>`;
          }).join('');

          // ── 제작 재료 그리드 ──
          const matCards=availMat.length===0?'':
            `<div style="color:var(--gold);font-size:12px;font-weight:bold;margin:14px 0 8px;grid-column:1/-1">⚗️ 제작 재료 <span style="font-weight:normal;color:var(--dim)">(재료창 보관)</span></div>`+
            availMat.map(c=>{
              const qty=stock[c.id]||0;
              const have=(G.materials&&G.materials[c.id])||0;
              const _matLock=(c.buy>=10000&&(_commPlv<60||_commRep<3000))||(c.buy>=5000&&(_commPlv<30||_commRep<1000));
              const canBuyMat=G.credits>=c.buy&&qty>0&&!_matLock;
              return`<div style="
                background:rgba(212,175,55,.04);
                border:1px solid ${canBuyMat?'rgba(212,175,55,.4)':'rgba(212,175,55,.15)'};
                border-radius:10px;display:flex;flex-direction:column;overflow:hidden;
                transition:border-color .2s;
                ${canBuyMat?'':'opacity:.5'}
              " onmouseover="this.style.borderColor='rgba(212,175,55,.8)'" onmouseout="this.style.borderColor='${canBuyMat?'rgba(212,175,55,.4)':'rgba(212,175,55,.15)'}'">
                <!-- 이미지 영역 -->
                <div style="background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;padding:10px;position:relative;min-height:80px">
                  ${imgOrEmoji('img/commodities/'+c.id+'.png',c.ic||'💎',64,64,'border-radius:6px;object-fit:cover','mat_'+c.id)}
                  <span style="position:absolute;top:5px;left:5px;background:rgba(212,175,55,.2);border:1px solid rgba(212,175,55,.4);color:var(--gold);font-size:10px;padding:1px 5px;border-radius:4px">제작재료</span>
                  <span style="position:absolute;top:5px;right:5px;background:rgba(0,0,0,.6);border:1px solid rgba(255,255,255,.15);color:var(--dim);font-size:10px;padding:1px 5px;border-radius:4px">재고 ${qty}</span>
                </div>
                <!-- 정보 영역 -->
                <div style="padding:8px 10px;flex:1;display:flex;flex-direction:column;gap:2px">
                  <div style="font-size:13px;font-weight:bold;color:var(--gold);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.nm}</div>
                  <div style="font-size:14px;font-weight:bold;color:var(--gold)">₡${c.buy.toLocaleString()}</div>
                  <div style="font-size:10px;color:var(--dim)">보유 <span style="color:var(--cyan);font-weight:bold">${have}개</span></div>
                </div>
                <!-- 버튼 영역 -->
                <div style="padding:6px 8px;border-top:1px solid rgba(212,175,55,.12);display:flex;gap:4px;align-items:center">
                  <input id="qty_${c.id}" type="number" min="1" max="${qty}" value="1"
                    style="width:40px;padding:3px 4px;background:rgba(255,255,255,.08);border:1px solid rgba(212,175,55,.3);border-radius:4px;color:var(--txt);font-size:11px;text-align:center"
                    ${canBuyMat?'':'disabled'}>
                  <button class="btn btn-sm" onclick="buyCommN('${c.id}')" ${canBuyMat?'':'disabled'}
                    style="flex:1;font-size:11px;padding:4px 2px;border-color:var(--gold);color:var(--gold)">구매</button>
                  <button class="btn btn-sm" onclick="buyComm('${c.id}')" ${canBuyMat?'':'disabled'}
                    style="font-size:11px;padding:4px 6px;border-color:var(--gold);color:var(--gold)">1</button>
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
  </div>`;
}

function buyComm(id,_silent=false){
  const comm=COMMODITIES.find(c=>c.id===id);if(!comm)return;
  // 전투력/명성 기반 고가 특산물 구매 제한
  const _bplv=calcPlayerLevel(),_brep=G.reputation||0;
  if(comm.buy>=10000&&(_bplv<60||_brep<3000)){notify(`🔒 ₡10,000+ 특산물은 전투력 60·명성 3,000 이상 필요 (현재 전투력 ${_bplv} / 명성 ${_brep})`,'err');return;}
  if(comm.buy>=5000&&(_bplv<30||_brep<1000)){notify(`🔒 ₡5,000+ 특산물은 전투력 30·명성 1,000 이상 필요 (현재 전투력 ${_bplv} / 명성 ${_brep})`,'err');return;}
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
function buyAllComm(){
  // 현재 행성 모든 특산물 일괄 구매 (최대 화물칸/크레딧 한도)
  const stock=G.shopStock[G.currentPlanet];
  if(!stock)return;
  let total=0;
  COMMODITIES.filter(c=>stock[c.id]>0).forEach(c=>{
    let bought=0;
    while(true){
      const cur=G.cargo.reduce((s,x)=>s+x.qty,0);
      if(!c.material&&cur>=getCargoMax())break;
      if(!stock[c.id]||stock[c.id]<=0)break;
      if(G.credits<c.buy)break;
      buyComm(c.id,true);bought++;
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
      // 재료 판매: 구매가의 70%
      const sellPriceRaw=Math.floor((commDef.buy||0)*0.7);
      if(!sellPriceRaw){notify('⚗️ 판매 불가 재료','err');return;}
      const sellQty=qty||1;
      // materials 창고에서 차감
      if(G.materials&&G.materials[slot.id]){G.materials[slot.id]=Math.max(0,(G.materials[slot.id]||0)-sellQty);}
      slot.qty-=sellQty;if(slot.qty<=0)G.cargo.splice(idx,1);
      G.credits+=sellPriceRaw*sellQty;
      updateHUD();notify(`⚗️ ${commDef.nm} ${sellQty}개 판매 +₡${(sellPriceRaw*sellQty).toLocaleString()} (구매가의 70%)`,'gold');
      rerenderTab(renderTradeTab);saveGame(true);return;
    }
    notify('📜 이 아이템은 판매할 수 없습니다 (영웅 영입 재료)','err');return;
  }
  const sp=calcSellPrice(slot,G.currentPlanet),profit=(sp-slot.buyPrice)*qty;
  G.credits+=sp*qty;slot.qty-=qty;if(slot.qty===0)G.cargo.splice(idx,1);
  updateHUD();notify(profit>0?`💰 판매 ₡${(sp*qty).toLocaleString()} (+₡${profit.toLocaleString()})`:` 판매 ₡${(sp*qty).toLocaleString()}`,'gold');
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
  (ship.parts||[]).forEach(pid=>{const p=PARTS.find(x=>x.id===pid);if(!p)return;if(p.cat==='weapon')att+=p.ATT||0;if(p.cat==='shield'){int2+=p.INT||0;sh+=p.maxSH||0;}if(p.cat==='armor'){hp+=p.HP||0;def+=p.DEF||0;}if(p.cat==='engine')tec+=p.TEC||0;});
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
function getMaxCrew(ship){var t=ship?ship.tier:'소형';return t==='신화'?10:t==='전설기함'?8:t==='대형'?8:t==='중형'?6:4;}
// 함선 거래소 서브탭 상태
let _shipTab='buy'; // buy | parts
let _fleetSort='tier'; // tier | att | hp | name
let _garageSubTab='parts'; // parts | crew | cargo
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
function getShipPartsGridRows(tier){
  return tier==='신화'?6:tier==='전설기함'?5:tier==='대형'?4:tier==='중형'?3:2;
}
function getShipPartsGridCols(tier){
  // 소형=4, 중형=8(×2), 대형/전설기함=12(×3), 신화=16(×4)
  return tier==='신화'?8:tier==='전설기함'||tier==='대형'?6:tier==='중형'?4:2;
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
    const anyDamaged=G.fleet.some(s=>{const b=getPartBonus(s);return s.hp<s.maxHP+(b.hp||0)||((s.maxSH+(b.sh||0))>0&&s.sh<s.maxSH+(b.sh||0));});
    // 정비소 서브탭 버튼 (정비소 모드에서만)
    const garageSubNav=G._garageMode?`<div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap">
      ${[{k:'parts',lb:'⚙️ 파츠 장비'},{k:'crew',lb:'👥 함선실'},{k:'cargo',lb:'📦 화물칸'}].map(function(t){const act=_garageSubTab===t.k;return'<button onclick="_garageSubTab=\''+t.k+'\';rerenderShipOrGarage()" style="padding:5px 14px;border:1px solid '+(act?'var(--cyan)':'var(--bdr)')+';background:'+(act?'rgba(0,243,255,.12)':'transparent')+';color:'+(act?'var(--cyan)':'var(--dim)')+';border-radius:6px;cursor:pointer;font-size:12px;font-weight:'+(act?'bold':'normal')+'">'+t.lb+'</button>';}).join('')}
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
    </div>`;

    const cats=[{k:'weapon',lb:'⚔️',col:'var(--red)',nm:'무기'},{k:'shield',lb:'🛡️',col:'var(--blue)',nm:'실드'},{k:'armor',lb:'🛡',col:'var(--gold)',nm:'장갑'},{k:'engine',lb:'⚡',col:'var(--cyan)',nm:'엔진'}];

    content = sortBar + sortedFleet.map(s=>{
      const idx=s._origIdx; // 실제 fleet 인덱스 (버튼 onclick용)
      const hpP=Math.round(s.hp/s.maxHP*100),shP=s.maxSH>0?Math.round(s.sh/s.maxSH*100):0;
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
      const crewCols=s.tier==='소형'?2:4;
      const PART_COLS=getShipPartsGridCols(s.tier);
      const PART_ROWS=getShipPartsGridRows(s.tier);
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
          const _isz=_is2x2?46:_is2x1?36:22;
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
          const _cargoHtml=(()=>{
            const slots=Math.min(s.cargoSlots||4,80);
            let cargoOffset=0;
            for(let fi=0;fi<G.fleet.length;fi++){if(G.fleet[fi].id===s.id)break;cargoOffset+=G.fleet[fi].cargoSlots||4;}
            const cargoFlat=[];
            G.cargo.forEach(function(c){const imgSrcC='img/commodities/'+c.id+'.png';for(let q=0;q<(c.qty||1);q++){cargoFlat.push({nm:c.nm,ic:c.ic||'📦',img:imgSrcC,price:c.buyPrice,id:c.id});}});
            const myCargo=cargoFlat.slice(cargoOffset,cargoOffset+slots);
            let h='<div style="display:grid;grid-template-rows:repeat(5,42px);grid-auto-flow:column;grid-auto-columns:42px;gap:3px;margin-bottom:8px">';
            for(let i=0;i<slots;i++){
              if(i<myCargo.length){const ci=myCargo[i];h+='<div style="width:42px;height:42px;border-radius:4px;background:rgba(0,243,255,.15);border:1px solid rgba(0,243,255,.4);display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative" title="'+ci.nm+'\n구매가: ₡'+ci.price.toLocaleString()+'"><img src="'+ci.img+'" style="width:38px;height:38px;object-fit:cover;border-radius:2px" onerror="this.style.display=\'none\';this.nextSibling.style.display=\'flex\'"><span style="font-size:18px;display:none;width:100%;height:100%;align-items:center;justify-content:center">'+ci.ic+'</span></div>';}
              else{const isMax=(slots>=80);h+='<div '+(isMax?'':'onclick="upgradeCargoSlot('+idx+')"')+' style="width:42px;height:42px;border-radius:4px;background:rgba(255,255,255,.03);border:1px dashed rgba(255,255,255,.12);'+(isMax?'':'cursor:pointer;')+'" title="'+(isMax?'화물칸 최대 (80칸)':'빈 화물칸 — 클릭하여 확장')+'"></div>';}
            }
            h+='</div>';
            if(slots<80){const cp=getCargoUpgradePrice(s);h+=`<button class="btn btn-sm" style="border-color:var(--cyan);color:var(--cyan);font-size:11px;padding:3px 8px" onclick="upgradeCargoSlot(${idx})" ${G.credits>=cp?'':'disabled'}>📦 창고+2칸 ₡${cp.toLocaleString()} (${slots}/80)</button>`;}
            else{h+='<span style="font-size:11px;color:var(--cyan)">✅ 창고 최대 (80칸)</span>';}
            return h;
          })();
          const _subRight=_garageSubTab==='parts'
            ?`<div style="font-size:10px;color:var(--dim);margin-bottom:6px">⚙️ <b style="color:var(--gold)">파츠 장비</b> ${(s.parts||[]).length}개 <span style="opacity:.45;font-size:9px">클릭=탈착</span></div>${partsGridHtml}<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap"><button class="btn btn-sm" style="border-color:var(--gold);color:var(--gold);font-size:11px;padding:3px 8px" onclick="pickPartForSlot(${idx})">+ 파츠 장착</button></div>`
            :_garageSubTab==='crew'
            ?`<div style="font-size:10px;color:var(--dim);margin-bottom:6px">👥 <b style="color:var(--green)">크루 배치</b> ${(s.crewIds||[]).length}/${maxCrew}명 <span style="opacity:.45;font-size:9px">클릭=하선</span></div><div style="display:grid;grid-template-columns:repeat(${crewCols},51px);gap:4px;margin-bottom:8px">${crewGrid}</div><div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn btn-sm" style="border-color:var(--green);color:var(--green);font-size:11px;padding:3px 8px" onclick="pickCrewForSlot(${idx})">+ 크루 배치</button>${(s.crewIds||[]).length>0?`<button class="btn btn-sm" style="border-color:#f88;color:#f88;font-size:11px;padding:3px 8px" onclick="unassignAllCrew(${idx})">👤 전원 하선</button>`:''}</div>`
            :_cargoHtml;
          return `<div style="display:flex;gap:0;min-height:160px">
            <div style="width:160px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;padding:10px 8px;border-right:1px solid var(--bdr);background:rgba(5,10,26,.6);gap:5px">
              <div style="width:130px;height:110px;display:flex;align-items:center;justify-content:center;border-radius:8px;background:rgba(0,243,255,.04);border:1px solid rgba(0,243,255,.12)">${imgOrEmoji(imgSrc,tierEmoji,108,108,'border-radius:6px;object-fit:contain')}</div>
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
            <div style="width:140px;height:120px;display:flex;align-items:center;justify-content:center;border-radius:10px;background:rgba(0,243,255,.04);border:1px solid rgba(0,243,255,.12)">${imgOrEmoji(imgSrc,tierEmoji,120,120,'border-radius:8px;object-fit:contain')}</div>
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
            ${s.hp<s.maxHP+(bonus.hp||0)?`<button class="btn btn-sm btn-green" style="font-size:11px;padding:3px 8px" onclick="repairShip(${idx},'hp')" ${G.credits>=rc?'':'disabled title="크레딧 부족"'}>🔧 HP ₡${rc.toLocaleString()}</button>`:'<span style="font-size:11px;color:var(--green)">✅HP최대</span>'}
            ${(s.maxSH+(bonus.sh||0))>0&&s.sh<s.maxSH+(bonus.sh||0)?`<button class="btn btn-sm" style="border-color:var(--blue);color:var(--blue);font-size:11px;padding:3px 8px" onclick="repairShip(${idx},'sh')" ${G.credits>=sc?'':'disabled title="크레딧 부족"'}>🛡️실드 ₡${sc.toLocaleString()}</button>`:''}
            ${(s.hp<s.maxHP+(bonus.hp||0)||(s.maxSH+(bonus.sh||0))>0&&s.sh<s.maxSH+(bonus.sh||0))?`<button class="btn btn-sm btn-gold" style="font-size:11px;padding:3px 8px" onclick="repairShipFull(${idx})" ${G.credits>=(rc+sc)?'':'disabled title="크레딧 부족"'}>⚡완전수리 ₡${(rc+sc).toLocaleString()}</button>`:''}
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

  // ── 함선 구매 ──────────────────────────────────────────────────────
  }else if(_shipTab==='buy'){
    const fleetFull=G.fleet.length>=16;
    const voidHintBuy=!isVoidPlanet?`<div style="background:rgba(139,0,255,.07);border:1px solid rgba(139,0,255,.3);border-radius:8px;padding:10px 14px;margin-bottom:12px;font-size:12px;color:var(--dim)">💡 구매 조건: <span style="color:var(--cyan)">중형 전투력 40+</span> / <span style="color:var(--gold)">대형 전투력 80+</span> / <span style="color:var(--purple)">전설·신화 전투력 100+</span></div>`:'';
    const _mythicHint=plvForShip>=100?'':`<div style="background:rgba(204,102,255,.07);border:1px solid rgba(204,102,255,.3);border-radius:8px;padding:10px 14px;margin-bottom:12px;font-size:12px;color:var(--dim)">🔒 <span style="color:var(--purple);font-weight:bold">신화·전설급 함선</span>은 <span style="color:var(--cyan)">전투력 100 이상</span> 구매 가능 (현재 ${plvForShip})</div>`;
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
        // 전체 4열 그리드 — 세로형 카드 (이미지 상단 + 정보 하단)
        var _curPlv2=calcPlayerLevel();
        var allSorted=sortedAvailShips;
        if(!allSorted.length)return'<div style="color:var(--dim);font-size:14px;padding:20px;text-align:center">입고된 함선 없음</div>';

        var tierLabel={'소형':'소형','중형':'중형','대형':'대형','전설기함':'전설기함','신화':'신화'};
        var tierCol={'신화':'var(--purple)','전설기함':'#d4af37','대형':'var(--gold)','중형':'var(--blue)','소형':'var(--dim)'};

        return '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px">'+
          allSorted.map(function(s){
            var tc=tierCol[s.tier]||'var(--dim)';
            var actualPrice=iSunsin?Math.floor(s.price*0.9):s.price;
            var qty=stock['ship_'+s.id]||0,canBuy=G.credits>=actualPrice&&qty>0;
            var maxCrew=getMaxCrew(s);
            var lvLock=(s.tier==='중형'&&_curPlv2<40)||(s.tier==='대형'&&_curPlv2<80)||((s.tier==='전설기함'||s.tier==='신화')&&_curPlv2<100);
            var _lockMsg2=s.tier==='중형'?'전투력40':s.tier==='대형'?'전투력80':'전투력100';
            var canBuyFinal=canBuy&&!lvLock;
            var cardBdr=s.tier==='신화'?'rgba(204,102,255,.5)':s.tier==='전설기함'?'rgba(212,175,55,.5)':s.tier==='대형'?'rgba(212,175,55,.3)':'var(--bdr)';
            var cardBg=s.tier==='신화'?'rgba(139,0,255,.05)':s.tier==='전설기함'?'rgba(212,175,55,.04)':'var(--card)';
            var cargoCnt=s.tier==='소형'?4:s.tier==='중형'?8:s.tier==='대형'?12:s.tier==='전설기함'?16:20;
            return '<div style="background:'+cardBg+';border:1px solid '+cardBdr+';border-radius:10px;padding:10px;display:flex;flex-direction:row;gap:8px;align-items:stretch">'+
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
                imgOrEmoji(shipImgSrc(s),TIER_EMOJI[s.tier]||'🛸',110,110,'border-radius:8px;background:rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.08);object-fit:contain','ship_'+(s.catId||s.id))+
              '</div>'+
            '</div>';
          }).join('')+'</div>';
      })();
    }

  // ── 파츠 구매 ─────────────────────────────────────────────────────
  }else{
    if(isHostile){
      content=`<div style="background:var(--card);border:1px dashed var(--red);border-radius:8px;padding:20px;text-align:center"><div style="color:var(--red)">적대구역 — 구매 불가</div></div>`;
    } else if(availParts.length===0){
      content=`<div style="color:var(--dim);font-size:14px;text-align:center;padding:20px">파츠 재고 없음</div>`;
    } else {
      content=['weapon','missile_inject','shield','armor','engine'].map(cat=>{
        if(cat==='missile_inject'){
          const _mi=PARTS.filter(p=>p.wtype==='missile'&&(stock['part_'+p.id]||0)>0&&!p.quest&&p.rarity!=='legend'&&p.rarity!=='mythic');
          if(_mi.length===0)return'';
          const _mm=_mi.map(p=>{
            const qty=stock['part_'+p.id]||0;
            const fp=iSunsin?Math.floor(p.price*0.9):p.price;
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
          return `<div style="margin-bottom:14px"><div style="font-size:13px;color:var(--red);font-weight:bold;margin-bottom:8px;letter-spacing:1px">🚀 미사일 (${_mi.length}종)</div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">${_mm}</div></div>`;
        }
        const catParts=PARTS.filter(p=>p.cat===cat&&(cat!=='weapon'||(p.wtype==='laser'||!p.wtype))&&(stock['part_'+p.id]||0)>0&&p.rarity!=='legend'&&p.rarity!=='mythic'&&p.rarity!=='set');
        if(catParts.length===0)return'';
        const catNm={weapon:'⚔️ 레이져',shield:'🛡️ 실드',armor:'🛡 장갑',engine:'⚡ 엔진'}[cat];
        const catCol={weapon:'var(--red)',shield:'var(--blue)',armor:'var(--gold)',engine:'var(--cyan)'}[cat];
        const catIc={weapon:'⚔️',shield:'🛡️',armor:'🛡',engine:'⚡'}[cat]||'⚙️';
        return `<div style="margin-bottom:14px">
          <div style="font-size:13px;color:${catCol};font-weight:bold;margin-bottom:8px;letter-spacing:1px">${catNm}</div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">${catParts.map(p=>{
            const qty=stock['part_'+p.id]||0;
            const partFinalPrice=iSunsin?Math.floor(p.price*0.9):p.price;
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
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">${mSC}</div>
        </div>`;
      }
    }
  }

  // 보유 파츠 매각 섹션 (parts 탭에만 표시)
  let invPartsSection='';
  if(_shipTab==='parts'){
    const hasMarcoInv=G.heroes&&G.heroes.includes('H08');
    const invParts=G.inventory.filter(i=>i.qty>0&&PARTS.find(p=>p.id===i.id));
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
      invPartsSection=`<div style="margin-top:18px;border-top:1px solid var(--bdr);padding-top:14px">
<div style="font-size:14px;color:var(--cyan);font-weight:bold;margin-bottom:10px">⚙️ 보유 파츠 매각${marcoNote}</div>
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">${rows}</div></div>`;
    }
  }

  body.innerHTML=`<div class="hub-scroll">
    ${G._garageMode?hubBanner('garage','🔧','함선 정비소',pd?.f):hubBanner('ship','🛸','함선 거래소',pd?.f)}
    <div class="hub-t">${G._garageMode?'🔧 함선 정비소':'🛸 함선 거래소'} — ${pd?.nm||''}</div>
    ${subNav}
    ${content}
    ${G._garageMode?'':invPartsSection}
  </div>`;
}
function sellPartFromInventory(partId){
  const p=PARTS.find(x=>x.id===partId);if(!p)return;
  const inv=G.inventory.find(i=>i.id===partId);
  if(!inv||inv.qty<=0){notify('보유 파츠 없음','err');return;}
  const marcoMult=(G&&G.heroes&&G.heroes.includes('H08'))?1.10:1.0;
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
function rerenderShipOrGarage(){
  var b=document.getElementById('hub-body');if(!b)return;
  if(G._currentHubTab==='garage')rerenderTab(renderGarageTab);
  else rerenderTab(renderShipTab);
}
function renderGarageTab(body){
  if(!body)return;
  G._garageMode=true;
  var _pt=_shipTab;
  _shipTab='fleet';
  renderShipTab(body);
  _shipTab=_pt;
  G._garageMode=false;
  // hub-body의 padding-bottom:210px + hub-scroll의 flex:1;min-height:0 으로 자연 스크롤 처리
  // (별도 absolute 포지셔닝 불필요 — 기존 코드가 flex 레이아웃을 깨뜨리는 원인이었음)
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
  const marcoMult=(G&&G.heroes&&G.heroes.includes('H08'))?1.10:1.0;
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
    <div style="margin-bottom:8px;display:flex;justify-content:center">${imgOrEmoji(shipImgSrc(s),'🛸',80,80,'border-radius:10px;background:rgba(0,0,0,.5);object-fit:contain')}</div>
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
  const cur=s.cargoSlots||5;
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
  if(def.tier==='중형'&&_plv<40){notify('🔒 중형 함선은 전투력 40 이상 필요 (현재 '+_plv+')','err');return;}
  if(def.tier==='대형'&&_plv<80){notify('🔒 대형 함선은 전투력 80 이상 필요 (현재 '+_plv+')','err');return;}
  if((def.tier==='전설기함'||def.tier==='신화')&&_plv<100){notify('🔒 전설/신화 함선은 전투력 100 이상 필요 (현재 '+_plv+')','err');return;}
  const shipFinalPrice=G.heroes.includes('H01')?Math.floor(def.price*0.9):def.price;
  if(G.credits<shipFinalPrice){notify(`크레딧 부족 (필요: ₡${shipFinalPrice.toLocaleString()})`,'err');return;}
  if(G.fleet.length>=16){notify('편대 슬롯 만석 (최대 16척) — 기존 함선을 판매하세요','err');return;}
  G.credits-=shipFinalPrice;stock['ship_'+shipId]--;
  const slotsByTier={소형:4,중형:8,대형:12,전설기함:16,신화:20};G.fleet.push({id:def.id+'_'+Date.now(),nm:def.nm,tier:def.tier,maxHP:def.maxHP,hp:def.maxHP,maxSH:def.maxSH,sh:def.maxSH,ATT:def.ATT,INT:def.INT,TEC:def.TEC,HP:def.maxHP,LOY:80,parts:[],crewIds:[],cargoSlots:slotsByTier[def.tier]||5});
  updateHUD();baekgu(`${def.nm} 구매 완료.`);notify(`🛸 ${def.nm} 구매!`,'gold');rerenderShipOrGarage();saveGame(true);
}
function buyPart(partId){
  const p=PARTS.find(x=>x.id===partId);if(!p)return;
  const stock=G.shopStock[G.currentPlanet];
  if(!stock||!stock['part_'+partId]||stock['part_'+partId]<=0){notify('재고 없음','err');return;}
  const partFinalPr=G.heroes.includes('H01')?Math.floor(p.price*0.9):p.price;
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
  // 블링크 엔진 전 함선 장착 완료 알림
  if(partId==='E15'&&hasBlinkOnAll()){
    notify('⚡ 전 함선 블링크 엔진 장착 완료! 은하계 모든 행성으로 순간이동 가능!','gold');
    baekgu('전 함대 블링크 엔진 장착 완료! 이제 은하계 어디든 순간이동할 수 있어. 은하계 경로 열어봐!');
  } else if(partId==='E15'){
    const lacking=G.fleet.filter(sh=>!(sh.parts||[]).includes('E15')).length;
    baekgu(`블링크 엔진 장착! ${G.fleet.length-lacking}/${G.fleet.length}척 완료. 전 함선 장착하면 순간이동 가능해.`);
  }
  rerenderShipOrGarage();saveGame(true);
}
function detachPart(shipIdx){
  const s=G.fleet[shipIdx];if(!s||!s.parts||s.parts.length===0){notify('장착된 파츠 없음','err');return;}
  const pid=s.parts.pop();const p=PARTS.find(x=>x.id===pid);
  {const _stA=getShipStats(s);s.hp=Math.min(s.hp,_stA.HP);s.sh=Math.min(s.sh,_stA.maxSH);}
  addToInventory(pid);notify(`${p?.nm||'파츠'} 탈착 → 인벤토리로`,'ok');rerenderShipOrGarage();saveGame(true);
}
// 특정 인덱스의 파츠 탈착 (파츠 버튼 클릭 시 호출)
function detachPartAt(shipIdx,partIdx){
  const s=G.fleet[shipIdx];if(!s||!s.parts||s.parts.length===0){notify('장착된 파츠 없음','err');return;}
  if(partIdx<0||partIdx>=s.parts.length)return;
  const _stBef2=getShipStats(s);
  const pid=s.parts.splice(partIdx,1)[0];
  const p=PARTS.find(x=>x.id===pid);
  {const _stA=getShipStats(s);s.hp=Math.min(s.hp,_stA.HP);s.sh=Math.min(s.sh,_stA.maxSH);}
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

  body.innerHTML=`<div class="hub-scroll">${hubBanner('crew','👥','크루')}<div class="hub-t">👥 크루 (${G.crew.length}/24명)
    <span style="font-size:12px;font-weight:normal;color:var(--dim);margin-left:8px">정렬:</span>
    ${sortBtn('rarity','⭐ 등급')}${sortBtn('cl','🔧 클래스')}${sortBtn('name','🔤 이름')}
    <button onclick="dismissLowestCrew(1)" style="margin-left:10px;padding:6px 16px;border:1px solid rgba(255,80,80,.6);background:rgba(255,40,40,.12);color:rgba(255,150,150,1);cursor:pointer;border-radius:5px;font-size:13px;font-family:Courier New,monospace;font-weight:bold">🚪 최하위 1명 내보내기</button>
    <button onclick="dismissLowestCrew(5)" style="margin-left:4px;padding:6px 16px;border:1px solid rgba(255,80,80,.4);background:rgba(255,40,40,.08);color:rgba(255,120,120,.8);cursor:pointer;border-radius:5px;font-size:13px;font-family:Courier New,monospace">🚪 최하위 5명</button>
    ${_lastDismissedCrew?`<button onclick="undoDismissCrew()" style="margin-left:10px;padding:6px 16px;border:1px solid rgba(0,243,255,.6);background:rgba(0,243,255,.12);color:var(--cyan);cursor:pointer;border-radius:5px;font-size:13px;font-family:Courier New,monospace;font-weight:bold;animation:pulse 1.5s infinite">🔄 되돌리기: ${_lastDismissedCrew.crew.nm}</button>`:''}
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
    // 되돌리기를 위해 저장
    _lastDismissedCrew={crew:JSON.parse(JSON.stringify(c)),shipIdx:savedShipIdx,insertIdx:idx};
    G.crew.splice(idx,1);
    notify(`${c.ic||'🧑'} ${c.nm} 내보냄 — 상단 되돌리기 버튼으로 복원 가능`,'ok');
  }
  rerenderTab(renderCrewTab);saveGame(true);
}
function undoDismissCrew(){
  if(!_lastDismissedCrew){notify('되돌릴 크루가 없습니다','err');return;}
  const {crew,shipIdx,insertIdx}=_lastDismissedCrew;
  // 크루 복원
  const restoreIdx=Math.min(insertIdx,G.crew.length);
  G.crew.splice(restoreIdx,0,crew);
  // 함선에 재탑승
  if(shipIdx!==null&&G.fleet[shipIdx]){
    const sh=G.fleet[shipIdx];
    if(!sh.crewIds)sh.crewIds=[];
    if((sh.crewIds||[]).length<getMaxCrew(sh)&&!sh.crewIds.includes(crew.id)){
      sh.crewIds.push(crew.id);
    }
  }
  notify(`${crew.ic||'🧑'} ${crew.nm} 복원 완료!`,'ok');
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
    if(G.crew.length>=24){
      // 신규 크루가 현재 최하위보다 등급이 높으면 교체 팝업 제안
      const RORDER={L:4,H:3,R:2,N:1};
      const newRank=RORDER[newCrew.rarity]||1;
      const assignedIds=new Set(G.fleet.flatMap(s=>s.crewIds||[]));
      const lowest=[...G.crew].filter(c=>!assignedIds.has(c.id)).sort((a,b)=>(RORDER[a.rarity]||1)-(RORDER[b.rarity]||1))[0];
      const lowestRank=lowest?RORDER[lowest.rarity]||1:0;
      if(lowest){
        // 더 높은 등급 — 교체 팝업 대상에 추가
        results.push({...newCrew,_swapCandidate:true,_swapTarget:lowest});
      } else {
        notify('크루 명단이 가득 찼습니다 (최대 24명)','err');
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
    const RARLBL={L:'전설',H:'영웅',R:'희귀',N:'일반'};
    const tgt=sc._swapTarget;
    openModal('🔄 고등급 크루 영입 제안',
      `<div style="padding:12px">
        <div style="font-size:15px;font-weight:bold;margin-bottom:10px;color:var(--cyan)">크루가 꽉 찼습니다!</div>
        <div style="display:flex;gap:16px;align-items:center;justify-content:center;margin-bottom:12px">
          <div style="text-align:center;padding:10px;background:rgba(255,59,59,.1);border:1px solid var(--red);border-radius:8px;min-width:100px">
            <div style="font-size:26px">${tgt.ic||'🧑'}</div>
            <div style="font-size:13px;font-weight:bold;margin-top:4px">${tgt.nm}</div>
            <div style="font-size:11px;color:var(--dim)">${RARLBL[tgt.rarity]||tgt.rarity} 등급</div>
          </div>
          <div style="font-size:22px;color:var(--dim)">→</div>
          <div style="text-align:center;padding:10px;background:rgba(0,243,255,.1);border:1px solid var(--cyan);border-radius:8px;min-width:100px">
            <div style="font-size:26px">${sc.ic||'🧑'}</div>
            <div style="font-size:13px;font-weight:bold;margin-top:4px">${sc.nm}</div>
            <div style="font-size:11px;color:var(--cyan)">${RARLBL[sc.rarity]||sc.rarity} 등급</div>
          </div>
        </div>
        <div style="font-size:13px;color:var(--dim);text-align:center"><b style="color:var(--red)">${tgt.nm}</b>을 내보내고<br><b style="color:var(--cyan)">${sc.nm}</b>을 영입하시겠습니까?</div>
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
      },cls:'btn-sm'}]);
  } else {
    renderGachaCards(results.filter(r=>!r._rejected));
    saveGame(true);
    baekgu(results.some(r=>r.rarity==='L')?'전설급이야! 대박!':results.some(r=>r.rarity==='H')?'영웅급 크루 영입!':'크루 영입 완료. 함선에 탑승시켜봐.');
  }
  // ── 주점 가챠: 해당 행성 지정 영웅 10% 조우 ──
  {const _gPD=(PLANET_DEF||[]).find(function(p){return p.id===G.currentPlanet;});
  const _gHId=_gPD&&_gPD.hero;
  if(_gHId&&G.heroes&&!G.heroes.includes(_gHId)&&Math.random()<0.10){
    setTimeout(function(){showHeroRecruit(_gHId);},800);
  }}
}
function dismissLowestCrew(n){
  const RORDER={L:0,H:1,R:2,N:3};
  // N등급 우선, 그 다음 R, 배정된 크루는 제외
  const assignedIds=new Set(G.fleet.flatMap(s=>s.crewIds||[]));
  const candidates=[...G.crew]
    .filter(c=>!assignedIds.has(c.id))
    .sort((a,b)=>{
      const ra=RORDER[a.rarity]??4,rb=RORDER[b.rarity]??4;
      return rb-ra; // 낮은 등급이 앞에 오도록
    });
  const targets=candidates.slice(0,n);
  if(targets.length===0){notify('내보낼 수 있는 크루가 없습니다','warn');return;}
  const names=targets.map(c=>c.nm).join(', ');
  const rarSummary=[...targets.reduce((m,c)=>{m.set(c.rarity,(m.get(c.rarity)||0)+1);return m;},new Map())].map(([r,cnt])=>`${r}×${cnt}`).join(' / ');
  openModal('🚪 크루 내보내기',
    `<div style="padding:12px">
      <div style="font-size:16px;font-weight:bold;margin-bottom:8px">최하위 ${targets.length}명을 내보냅니까?</div>
      <div style="font-size:13px;color:var(--dim);margin-bottom:6px">(배정된 크루 제외 | ${rarSummary})</div>
      <div style="font-size:12px;color:rgba(255,200,100,.8);max-height:120px;overflow-y:auto;line-height:1.6">${names}</div>
    </div>`,
    [{txt:`${targets.length}명 내보내기`,fn:()=>{
      closeModal();
      targets.forEach(c=>{
        G.fleet.forEach(s=>{if(s.crewIds){const i=s.crewIds.indexOf(c.id);if(i>=0)s.crewIds.splice(i,1);}});
        const idx=G.crew.findIndex(x=>x.id===c.id);
        if(idx>=0)G.crew.splice(idx,1);
      });
      notify(`🚪 크루 ${targets.length}명 내보냄`,'ok');
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
      const tax=calcTaxFor(p.id),investCost=Math.floor(p.tax*7.2*Math.pow(2.15,lv)*(1+G.act/2));
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
  const cost=Math.floor(pd.tax*7.2*Math.pow(2.15,lv)*(1+G.act/2));
  if(G.credits<cost){notify(`투자비용 ₡${cost.toLocaleString()} 부족`,'err');return;}
  G.credits-=cost;st.commerce=lv+1;
  updateHUD();notify(`📈 ${pd.nm} Lv${lv+1} 업그레이드! ₡${calcTaxFor(pid).toLocaleString()}/턴`,'gold');
  baekgu(`${pd.nm} 상업 레벨 ${lv+1}. 세금 ₡${calcTaxFor(pid).toLocaleString()} 들어온다.`);
  saveGame(true);rerenderTab(renderPlanetsTab);
}

// ═══ QUEST SYSTEM ════════════════════════════════════════════════
const QUEST_TEMPLATES=[
  {type:'combat',ic:'⚔️',npc:'제독',npcIc:'🎖️',
   titles:['해적 함대 소탕','치크스 정찰대 격퇴','밀수선 차단','항로 순찰 지원'],
   descs:['이 항로에 해적이 출몰. 처치하고 귀환하라.','치크스 정찰대가 상업로를 막고 있다. 격퇴하라.','밀수 조직 선박을 차단하고 화물을 압수하라.','우리 순찰대와 함께 항로를 지켜달라.']},
  {type:'delivery',ic:'📦',npc:'브로커',npcIc:'🕴️',
   titles:['긴급 화물 배달','기밀 문서 전달','의약품 이송','부품 조달'],
   descs:['지정 행성에 화물을 전달해 달라.','외교 채널 문서를 운반해 달라.','의약품을 인접 행성으로 이송해 달라.','생산 라인 부품을 가져와 달라.']},
  {type:'gather',ic:'⛏️',npc:'브로커',npcIc:'🕴️',
   titles:['희귀 광물 채취','방사선 데이터 수집','잔해 탐색','물자 회수'],
   descs:['소행성대에서 광물을 채취해 달라. 2턴 소요.','방사선 데이터 수집. 2턴 소요.','전투 잔해 탐색. 2턴 소요.','치크스 잔해 물자 회수. 2턴 소요.']},
  {type:'explore',ic:'🔭',npc:'제독',npcIc:'🎖️',
   titles:['항로 탐색 임무','성계 측량 지원','미지 구역 탐사','위성 궤도 조사'],
   descs:['이 행성 인근 항로를 탐색하라. 탐색 버튼을 눌러 임무를 수행하라.','항법사 지원을 위해 성계 측량에 참여하라. 탐색 버튼 사용.','미지의 구역을 탐사하고 데이터를 수집하라. 탐색 버튼 사용.','행성 위성 궤도를 조사하라. 탐색 버튼으로 수행.']},
];
const VOID_BOSS_ID='FALCON_SCOUT_VOID';
const VOID_BOSS={
  id:VOID_BOSS_ID,nm:'팔콘 스카우트',tier:'소형',isEnemy:true,
  hp:1000000,maxHP:1000000,sh:10000,maxSH:10000,
  ATT:10000,INT:10000,TEC:10000,DEF:10000,HP:1000000,LOY:0,parts:[],
  voidBoss:true,catId:'VOID_FALCON',
  _lore:'침묵의 은하에서 온 자. 이름도, 고향도, 목적도 알 수 없다.'
};
function _allVoidOwned(){
  return PLANET_DEF.filter(p=>p.void).every(p=>G.planets[p.id]?.owned);
}
function generateQuests(pid){
  if(G.quests[pid]&&G.quests[pid].length>0&&G.quests[pid].some(function(q){return q.status!=='claimed';}))return;
  var pd=PLANET_DEF.find(function(p){return p.id===pid;});if(!pd)return;
  var ring=pd.ring||1,seed=0;
  for(var i=0;i<pid.length;i++)seed+=pid.charCodeAt(i);seed+=G.act*997;
  // 제독 퀘스트 8개(explore 1 + combat 7) + 브로커 퀘스트 8개 = 총 16개
  var rng=mulberry32(seed),quests=[];
  // 탐색(explore) 퀘스트 반드시 1개 포함 (제독 발주)
  var exploreTmpl=QUEST_TEMPLATES.find(function(t){return t.type==='explore';});
  if(exploreTmpl){
    var eti=Math.floor(rng()*exploreTmpl.titles.length);
    var ecr=Math.round((2000+ring*700+Math.floor(rng()*600))/100)*100;
    var eve=Math.floor(rng()*ring*12)+8;
    quests.push({id:'q_'+pid+'_'+G.act+'_ex',type:'explore',ic:exploreTmpl.ic,npc:exploreTmpl.npc,npcIc:exploreTmpl.npcIc,
      nm:exploreTmpl.titles[eti],desc:exploreTmpl.descs[eti],rewardCr:ecr,rewardVe:eve,
      status:'available',targetId:null,progress:0,required:2,planetId:pid});
  }
  // 제독 combat 퀘스트 7개 추가 (총 제독 8개)
  var combatTmpl=QUEST_TEMPLATES.find(function(t){return t.type==='combat';});
  if(combatTmpl){
    for(var i=0;i<7;i++){
      var cti=Math.floor(rng()*combatTmpl.titles.length);
      var ccr=Math.round((2200+ring*800+Math.floor(rng()*1000))/100)*100;
      var cve=Math.floor(rng()*ring*18)+10;
      quests.push({id:'q_'+pid+'_'+G.act+'_c'+i,type:'combat',ic:combatTmpl.ic,npc:combatTmpl.npc,npcIc:combatTmpl.npcIc,
        nm:combatTmpl.titles[cti],desc:combatTmpl.descs[cti],rewardCr:ccr,rewardVe:cve,
        status:'available',targetId:null,progress:0,required:1,planetId:pid});
    }
  }
  // 브로커 퀘스트 8개 (delivery/gather)
  var brokerTmpl=QUEST_TEMPLATES.filter(function(t){return t.type==='delivery'||t.type==='gather';});
  for(var i=0;i<8;i++){
    var tmpl=brokerTmpl[Math.floor(rng()*brokerTmpl.length)];
    var ti=Math.floor(rng()*tmpl.titles.length);
    var cr=Math.round((1800+ring*600+Math.floor(rng()*800))/100)*100;
    var ve=Math.floor(rng()*ring*15)+5;
    var targetId=null;
    if(tmpl.type==='delivery'&&G.mapConns){
      var adj=G.mapConns.filter(function(c){return c.a===pid||c.b===pid;}).map(function(c){return c.a===pid?c.b:c.a;}).filter(function(id){return id!==G.currentPlanet;});
      if(adj.length>0)targetId=adj[Math.floor(rng()*adj.length)];
    }
    quests.push({id:'q_'+pid+'_'+G.act+'_b'+i,type:tmpl.type,ic:tmpl.ic,npc:tmpl.npc,npcIc:tmpl.npcIc,
      nm:tmpl.titles[ti],desc:tmpl.descs[ti],rewardCr:cr,rewardVe:ve,
      status:'available',targetId:targetId,progress:0,required:tmpl.type==='gather'?2:1,planetId:pid});
  }
  // 히든 보스 퀘스트: 보이드 행성 전체 보유 + P30 방문 시
  if(pid==='P30'&&_allVoidOwned()&&!quests.some(q=>q.id==='q_void_boss')){
    quests.unshift({
      id:'q_void_boss',type:'void_boss',ic:'🌑',npc:'제독',npcIc:'🎖️',
      nm:'[히든] 팔콘 스카우트의 경고',
      desc:'보이드 균열지대 전체를 장악한 직후, 수수께끼의 신호가 수신됐다. 정체불명의 소형 전투기 — 팔콘 스카우트. 은하 연방 기록에도 없는 기체다. 제타 레티쿨리 상공에서 교전을 요청하고 있다. 응하겠는가?',
      rewardCr:200000000,rewardVe:999,
      status:'available',targetId:null,progress:0,required:1,planetId:'P30'
    });
  }
  G.quests[pid]=quests;
}
function acceptQuest(pid,idx){
  generateQuests(pid);
  var q=G.quests[pid]&&G.quests[pid][idx];if(!q||q.status!=='available')return;
  // 명성 기반 고VE 퀘스트 수락 제한
  const _qrep=G.reputation||0;
  if(q.rewardVe>=40&&_qrep<200){notify(`🔒 VE ${q.rewardVe} 퀘스트는 명성 200 이상 필요 (현재 명성 ${_qrep})`,'err');return;}
  if(q.rewardVe>=30&&_qrep<100){notify(`🔒 VE ${q.rewardVe} 퀘스트는 명성 100 이상 필요 (현재 명성 ${_qrep})`,'err');return;}
  const _fromTavern=G._currentHubTab==='tavern';
  // 히든 보스 즉시 전투 진입
  if(q.type==='void_boss'){
    q.status='active';
    baekgu('팔콘 스카우트... 이자가 진짜인지 확인해봐. 조심해!');
    saveGame(true);
    startVoidBossCombat(q);
    return;
  }
  q.status='active';
  if(q.type==='gather')notify('채취 의뢰 수락 — '+q.required+'턴 대기 후 완료','ok');
  else if(q.type==='explore')notify('🔭 탐색 임무 수락 — 탐색 버튼을 눌러 임무를 수행하세요','ok');
  else if(q.type==='delivery'){var tnm=(PLANET_DEF.find(function(p){return p.id===q.targetId;})||{nm:'인접 행성'}).nm;notify('배달 의뢰 수락 — '+tnm+'으로 이동하면 완료','ok');}
  else notify('전투 의뢰 수락 — 전투 승리 후 보고하세요','ok');
  saveGame(true);
  if(_fromTavern)rerenderTab(renderTavernView);
  else rerenderTab(renderQuestTab);
}
function startVoidBossCombat(questRef){
  const pd={id:'P30',nm:'팔콘 스카우트 — 제타 레티쿨리 상공',ring:5,void:true,f:'F07'};
  const enemies=[{...VOID_BOSS,id:'VOID_FALCON_1',isEnemy:true}];
  const players=G.fleet.map(s=>{const st=getShipStats(s);const _wpn=PARTS.find(p=>p.cat==='weapon'&&(s.parts||[]).includes(p.id));const _wt=_wpn?(_wpn.tier||1):1;const _wtype=_wpn?(_wpn.wtype||'laser'):'laser';const _wrar=_wpn?(_wpn.rarity||''):'';const _shp=PARTS.find(p=>p.cat==='shield'&&(s.parts||[]).includes(p.id));const _shTier=_shp?(_shp.tier||0):0;const _arp=PARTS.find(p=>p.cat==='armor'&&(s.parts||[]).includes(p.id));const _arTier=_arp?(_arp.tier||0):0;return{...s,isEnemy:false,hp:s.hp,maxHP:st.HP,sh:s.sh,maxSH:st.maxSH,ATT:st.ATT,INT:st.INT,TEC:st.TEC,DEF:st.DEF||0,wtype:_wtype,wpnTier:_wt,wpnRarity:_wrar,shieldTier:_shTier,armorTier:_arTier};});
  combatState={players,enemies,turn:0,done:false,log:[],planetDef:pd,isBoss:false,isVoidBoss:true,_questRef:questRef,_rndSeed:Date.now()%9999,_entranceT:0,_entranceDone:false,_planetId:'P30'};
  renderCombatView(document.getElementById('hub-body'));
  setHubNav('combat');updateHUD();
  _cbEffects=[];_unitPos={};if(_cbAnimReq){cancelAnimationFrame(_cbAnimReq);_cbAnimReq=null;}
  combatState._sunsinUsed=false;
  combatState._entranceT=1;combatState._entranceDone=true;
  sfxAlert();_preloadCombatImages();requestAnimationFrame(()=>{initCombatCanvas();const t=document.getElementById('cb-title');if(t)t.textContent='🌑 히든전 — 팔콘 스카우트';setTimeout(runCombatTurn,600);});
}
function completeQuest(pid,idx){
  var q=G.quests[pid]&&G.quests[pid][idx];if(!q||q.status!=='done')return;
  const _fromTavern=G._currentHubTab==='tavern';
  q.status='claimed';try{sfxCoin();}catch(e){}
  const _rm=getTotalRewardMult(); // 레벨×난이도 통합 배율
  // 허브 해금 전(hubProg<10): 보상 50% 감소 / 해금 후: 정상 보상
  const _hubUnlockedQ=isPlanetHubUnlocked(pid);
  const _rewardRate=_hubUnlockedQ?1.0:0.5;
  const _actualCr=Math.round(q.rewardCr*_rm*_rewardRate);
  G.credits+=_actualCr;G.voidEssence+=q.rewardVe;
  // 행성 허브 진행도 추가
  addHubProgress(pid);
  updateHUD();
  // ── 특별 보상 추첨 ──────────────────────────────────────────────
  const roll=Math.random();
  const rep=G.reputation||0;
  // 퀘스트 VE 티어 보너스: VE>=40(명성200급) +10%, VE>=30(명성100급) +5%
  const _qveBonus=q.rewardVe>=40?0.10:q.rewardVe>=30?0.05:0;
  // 신화급 파츠 확률: 기본 3% + 명성당 0.5% (최대 12%) + VE 티어 보너스
  const mythicRate=Math.min(0.22,0.03+rep*0.005+_qveBonus);
  // 세트 아이템 확률: 기본 6% + 명성당 0.5% (최대 18%) + VE 티어 보너스
  const setRate=Math.min(0.28,0.06+rep*0.005+_qveBonus);
  // 전설 동료 확률: 기본 2% + 명성당 0.3% (최대 8%) + VE 티어 보너스
  const legendRate=Math.min(0.18,0.02+rep*0.003+_qveBonus);

  let bonusMsg='';
  if(roll<legendRate){
    // 전설 동료 획득
    if(!G.crew)G.crew=[];
    const pool=QUEST_LEGEND_CREW.filter(c=>!G.crew.find(x=>x.id===c.id));
    if(pool.length>0){
      const lucky=pool[Math.floor(Math.random()*pool.length)];
      const newCrew={...lucky,id:lucky.id+'_'+Date.now()};
      if(G.crew.length>=24){
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
  if(!G.blueprints)G.blueprints={};
  const _bpId=BLUEPRINT_MAP[pid];
  const _bpDropRate=(_bpId==='LGD03')?0.10:0.05;
  if(_bpId&&!G.blueprints[_bpId]&&Math.random()<_bpDropRate){
    G.blueprints[_bpId]=true;
    const _bpRec=CRAFT_RECIPES.find(r=>r.id===_bpId);
    const _bpTierCol=_bpRec?.tier==='mythic'?'#cc66ff':_bpRec?.tier==='flagship'?'#ff8800':'#d4af37';
    bonusMsg+=`<div style="margin-top:12px;background:rgba(212,175,55,.08);border:1px solid ${_bpTierCol};border-radius:8px;padding:10px;text-align:center">
      <div style="font-size:26px">📜 설계도 획득!</div>
      <div style="font-size:17px;font-weight:bold;color:${_bpTierCol};margin-top:4px">${_bpRec?.nm||_bpId}</div>
      <div style="font-size:12px;color:var(--dim);margin-top:3px">제작소에서 해당 아이템을 제작할 수 있습니다</div>
    </div>`;
    notify(`📜 설계도 획득: ${_bpRec?.nm||_bpId}`,'gold');
    baekgu(`설계도 드랍! ${_bpRec?.nm||_bpId} 설계도야. 재료 모아서 제작소에서 만들어봐!`);
  }
  // ── 전설 창고 확장 설계도 드롭 (링4+ 행성에서 3% 확률) ──────────────
  const _pd4=PLANET_DEF.find(p=>p.id===pid);
  if((_pd4?.ring||0)>=4){
    const _cargoBps=[{id:'SC08',prob:0.03},{id:'SC09',prob:0.02}];
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

  // ── 전설 영웅 조우 (10%, H01~H08 스토리 영웅 미보유 중 랜덤) ──────────────
  {const _allStoryHeroes=['H01','H02','H03','H04','H05','H06','H07','H08'];
  const _availHeroes=_allStoryHeroes.filter(function(h){return!(G.heroes||[]).includes(h);});
  if(_availHeroes.length>0&&Math.random()<0.10){
    const _pickedHero=_availHeroes[Math.floor(Math.random()*_availHeroes.length)];
    setTimeout(function(){showHeroRecruit(_pickedHero);},1400);
  }}
  changeReputation(1);
  const baseMsg='퀘스트 완료! +₡'+_actualCr.toLocaleString()+(_rm>1.05?' (×'+_rm.toFixed(1)+'배)':'')+(q.rewardVe>0?' +VE'+q.rewardVe:'')+' ⭐ 명성 '+(G.reputation)+'(+1)';
  notify(baseMsg,'gold');
  if(!bonusMsg)baekgu('퀘스트 보상 지급. '+_actualCr.toLocaleString()+' 크레딧'+(_rm>1.05?'. 레벨 보너스 ×'+_rm.toFixed(1)+'배!':'')+'.');

  if(bonusMsg){
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
function updateGatherBtn(){
  const btn=document.getElementById('hn-gather-search');
  if(!btn)return;
  // 현재 행성에서 활성화된 gather 또는 combat(치크스) 퀘스트 여부
  const pid=G.currentPlanet;
  const active=(G.quests[pid]||[]).some(q=>
    (q.status==='active'&&q.type==='gather')||
    (q.status==='active'&&q.type==='explore')||
    (q.status==='active'&&q.type==='combat'&&q.nm.includes('치크스'))
  );
  // 항상 표시 — 퀘스트 활성 시 하이라이트, 비활성 시 흐리게
  if(active){
    btn.style.background='rgba(0,255,140,.07)';
    btn.style.borderColor='rgba(0,255,140,.35)';
    btn.style.color='var(--green)';
    btn.style.opacity='1';
    btn.style.cursor='pointer';
    btn.style.animation='pulse 2.5s infinite';
  } else {
    btn.style.background='rgba(255,255,255,.03)';
    btn.style.borderColor='rgba(255,255,255,.12)';
    btn.style.color='var(--dim)';
    btn.style.opacity='.45';
    btn.style.cursor='default';
    btn.style.animation='none';
  }
  // 버튼 텍스트: 치크스 퀘스트면 "정찰대 탐색"
  const isCombatQ=(G.quests[pid]||[]).some(q=>q.status==='active'&&q.type==='combat'&&q.nm.includes('치크스'));
  const span=btn.querySelector('span:last-child');
  if(span)span.textContent=isCombatQ?'정찰대 탐색':'잔해 탐색';
  // 탐색 퀘스트 활성 시 dock 폴더 자동 열기
  if(active){const dockFolder=document.getElementById('folder-dock');if(dockFolder&&!dockFolder.classList.contains('open-folder')){openFolder('dock');}}
}

// ── 잔해/정찰대 탐색 실행 ────────────────────────────────────
function doGatherSearch(){
  // 활성 퀘스트 없으면 안내 메시지
  const _pid0=G.currentPlanet;
  const _hasQ=(G.quests[_pid0]||[]).some(q=>(q.status==='active'&&(q.type==='gather'||q.type==='explore'))||(q.status==='active'&&q.type==='combat'&&q.nm.includes('치크스')));
  if(!_hasQ){notify('잔해 탐색 가능한 퀘스트가 없습니다. 제독 탭에서 퀘스트를 수락하세요.','warn');return;}
  // 배경 이미지 숨김 (글자 가독성)
  const _bg=document.getElementById('hub-planet-bg');
  if(_bg)_bg.style.opacity='0';
  const pid=G.currentPlanet;
  const pd=PLANET_DEF.find(p=>p.id===pid);
  const ring=pd?.ring||1;

  // 활성 퀘스트 판별
  const gatherQ=(G.quests[pid]||[]).find(q=>q.status==='active'&&(q.type==='gather'||q.type==='explore'));
  const combatQ=(G.quests[pid]||[]).find(q=>q.status==='active'&&q.type==='combat'&&q.nm.includes('치크스'));

  if(!gatherQ&&!combatQ){
    notify('현재 행성에 진행 중인 탐색 퀘스트 없음','warn');
    return;
  }

  notify('🔭 탐색 중...','ok');
  baekgu('탐색 시작. 잔해 구역 접근 중.');

  // ── 1) 치크스 정찰대 탐색 (30% 조우) ─────────────────────
  if(combatQ){
    if(Math.random()<0.30){
      const dm=getDiffMult(),lm=getLevelMult(),ptm=Math.min(5,(G.pirateKills||0)/20+1);
      const eHP=Math.round((150+ring*60)*dm*lm),eATK=Math.round((30+ring*8)*dm*lm),eINT=Math.round((20+ring*5)*dm*lm),eTEC=Math.round((15+ring*4)*dm*lm);
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
    // 30%: 해적선 출현
    const dm=getDiffMult(),lm=getLevelMult();
    const eHP=Math.round((80+ring*30)*dm*lm),eATK=Math.round((18+ring*5)*dm*lm),eINT=Math.round((12+ring*3)*dm*lm),eTEC=Math.round((8+ring*2)*dm*lm);
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
    const raidDef={id:'DEBRIS_PIRATE',nm:'잔해 구역 해적',ring,f:'PIRATE',hostile:true,tax:0,_enemies:enemies,_questPid:pid,_questId:gatherQ.id,_isDebris:true};
    openModal('🏴‍☠️ 잔해 구역 해적 출현!',
      `<div style="font-size:16px;margin-bottom:10px;color:var(--red)">탐색 중 해적선과 조우했습니다!</div>
       <div style="font-size:13px;color:var(--dim);line-height:1.8">적군: 잔해 해적 ${pirateCount}척<br>격파하면 탐색이 계속됩니다.</div>`,
      [{txt:'⚔️ 전투!',fn:()=>{closeModal();startDebrisPirateCombat(raidDef);},cls:'btn-red'},
       {txt:'🚀 도주 (탐색 중단)',fn:()=>{closeModal();notify('탐색 중단','warn');},cls:'btn-sm'}]);

  } else if(roll<0.40){
    // 10%: 아이템 또는 함선 획득 (전설급 포함)
    _grantDebrisReward(ring,gatherQ,pid);

  } else {
    // 60%: 잔해 발견, 퀘스트 진행
    _progressGatherQuest(gatherQ,pid);
  }
}

// 잔해 퀘스트 진행 처리
function _progressGatherQuest(q,pid){
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
    if(G.fleet.length<16){
      const slotsByTier={소형:4,중형:8,대형:12,전설기함:16,신화:20};
      G.fleet.push({id:'DBR_'+Date.now(),catId:def.catId||def.id,nm:'회수 '+def.nm,tier:def.tier,maxHP:Math.floor(def.maxHP*.7),hp:Math.floor(def.maxHP*.5),maxSH:Math.floor(def.maxSH*.7),sh:0,ATT:def.ATT,INT:def.INT,TEC:def.TEC,HP:def.maxHP,LOY:55,parts:[],crewIds:[],cargoSlots:slotsByTier[def.tier]||5});
      notify(`🛸 잔해에서 ${def.tier} 함선 회수! ${def.nm}`, 'gold');
      baekgu(`${def.nm} 회수 완료. 함대에 추가됐어.`);
    } else {
      // 함대 만석이면 파츠로 대체
      const p=PARTS[Math.floor(Math.random()*PARTS.length)];
      addToInventory(p.id,1);
      notify(`⚠️ 함대 만석 — 대신 ${p.nm} 획득`,'warn');
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
  const r=Math.random();
  if(r<0.05)return{mult:1.20,label:'✨ 마스터작',col:'#ff8800'};
  if(r<0.15)return{mult:1.10,label:'⭐ 상급작',col:'#d4af37'};
  if(r<0.50)return{mult:1.00,label:'🔷 보통',col:'var(--cyan)'};
  if(r<0.75)return{mult:0.90,label:'▽ 하급',col:'var(--dim)'};
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
      if(!G.fleet||!G.fleet[0]){notify('기함 없음 — 편대에 함선을 먼저 배치하세요','err');return;}
      const flagship=G.fleet[0];
      if(!flagship.cargoSlots)flagship.cargoSlots=5;
      const _prevSlots=flagship.cargoSlots;
      flagship.cargoSlots=Math.min(80,flagship.cargoSlots+scDef.cargoBonus);
      const _addedSlots=flagship.cargoSlots-_prevSlots;
      resultHtml=`<div style="font-size:16px;color:var(--dim);margin-bottom:8px">${scDef.nm}</div>
        <div style="font-size:36px;font-weight:bold;color:#d4af37;margin:8px 0">📦</div>
        <div style="font-size:18px;font-weight:bold;color:#d4af37">창고 +${_addedSlots}칸 확장!</div>
        <div style="font-size:13px;color:var(--dim);margin-top:6px">기함 창고 현재: ${flagship.cargoSlots}칸 / 최대 80칸</div>
        <div style="font-size:12px;color:var(--dim);margin-top:8px">기함에 자동 적용됐습니다</div>`;
      notify(`📦 ${scDef.nm} 제작 완료! 창고 +${_addedSlots}칸 (현재: ${flagship.cargoSlots}/80칸)`,'gold');
      baekgu(`${scDef.nm} 제작 완료! 기함 창고가 ${flagship.cargoSlots}칸이 됐어.${flagship.cargoSlots>=80?' 이제 최대야!':''}`);
    } else {
      const def=SHIP_CATALOG.find(s=>s.id===rec.id);
      if(!def){notify('함선 데이터 오류','err');return;}
      const newShip={
        id:rec.id+'_craft_'+Date.now(),
        nm:def.nm+(mult>=1.1?' ★':mult<1.0?' ▽':''),
        tier:def.tier,maxHP:Math.round(def.maxHP*mult),hp:Math.round(def.maxHP*mult),
        maxSH:Math.round((def.maxSH||0)*mult),sh:Math.round((def.maxSH||0)*mult),
        atk:Math.round((def.atk||100)*mult),spd:def.spd||1,
        cargo:def.cargo||20,parts:[],crew:[],crafted:true,quality:mult,qualityLabel:q.label
      };
      if(!G.fleet)G.fleet=[];
      G.fleet.push(newShip);
      resultHtml=`<div style="font-size:16px;color:var(--dim);margin-bottom:8px">${def.nm}</div>
        <div style="font-size:36px;font-weight:bold;color:${q.col};margin:8px 0">${q.label}</div>
        <div style="font-size:16px;color:${q.col}">성능 ×${mult.toFixed(2)}</div>
        <div style="font-size:13px;color:var(--dim);margin-top:4px">HP:${newShip.maxHP} | ATK:${newShip.atk}</div>
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
              <span>${c?.ic||'💎'}</span>
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
    <div style="width:260px;flex-shrink:0;overflow-y:auto;border-right:1px solid rgba(0,243,255,.12);padding:10px 12px;display:flex;flex-direction:column;gap:0">
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
    <div style="flex:1;overflow-y:auto;display:flex;flex-direction:column;padding:12px 14px">

      <!-- 제작 버튼 (상단 좌측) -->
      <div style="margin-bottom:10px">
        <button class="btn btn-gold" id="craftBtn" onclick="doCraft('${selRec?.id||''}')"
          ${craftBtnDis?'disabled':''} style="font-size:13px;padding:8px 16px;letter-spacing:.5px;font-weight:bold">
          ${craftBtnTxt}
        </button>
        <span style="font-size:11px;color:var(--dim);margin-left:8px">🎲 마스터+20%(5%) | 상급+10%(10%) | 보통(35%) | 하급-10%(25%) | 불량-20%(25%)</span>
      </div>

      <div style="font-size:14px;font-weight:bold;color:var(--cyan);margin-bottom:2px">⚗️ 함선 제작소</div>
      <div style="font-size:12px;color:var(--dim);margin-bottom:8px">좌측 설계도 선택 → 슬롯 클릭으로 재료 투입 → 제작 버튼</div>

      <!-- 재료 상태 -->
      ${matStatusHtml}

      <!-- 재료 그리드 (12슬롯 4행×3열) -->
      <div style="font-size:11px;color:var(--dim);margin-bottom:4px">📦 재료 슬롯 — 슬롯 클릭 시 재료 선택, [✕] 클릭 시 제거</div>
      ${matGridHtml}

      <!-- 보유 재료 요약 -->
      <div style="margin-top:8px;font-size:15px;color:var(--dim)">
        보유 재료: ${ownedMats.length>0?ownedMats.map(m=>`${m.ic}${m.nm}×${G.materials[m.id]}`).join('  '):'없음 — 행성 상점에서 구매하세요'}
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
  const x=Math.min(ev.clientX+12,window.innerWidth-240);
  const y=Math.max(ev.clientY-10,4);
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
      <span style="font-size:26px">${m.ic||'💎'}</span>
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

function renderQuestTab(body){
  if(!body)return;
  var pid=G.currentPlanet;generateQuests(pid);
  var qlist=G.quests[pid]||[];
  var pd=PLANET_DEF.find(function(p){return p.id===pid;});
  var canLoan=(G.credits||0)<300,alreadyMax=(G.loan||0)>=20000;
  var loanSection=canLoan?'<div style="background:rgba(255,59,59,.1);border:1px solid var(--red);border-radius:8px;padding:12px;margin-bottom:14px"><div style="color:var(--red);font-size:16px;font-weight:bold;margin-bottom:4px">⚠️ 크레딧 부족 — 이동 불가</div><div style="color:var(--dim);font-size:13px;line-height:1.7;margin-bottom:8px">퀘스트 완료 또는 백구 긴급 대출 요청 (한도 20,000, 무이자)<br>현재 대출: '+(G.loan||0).toLocaleString()+'</div>'+(alreadyMax?'<div style="color:var(--red);font-size:13px">대출 한도 초과. 퀘스트로 자금을 마련하세요.</div>':'<button class="btn btn-sm btn-red" onclick="takeLoan()">백구 긴급 대출 5,000 요청</button>')+'</div>':'';
  var admiralQ=qlist.filter(function(q){return q.npc==='제독';});
  var brokerQ=qlist.filter(function(q){return q.npc==='브로커';});
  function qCard(q){
    var realIdx=qlist.indexOf(q);
    var stCfg={available:{bg:'var(--card)',bd:'var(--bdr)',col:'var(--dim)',lbl:'수락 가능'},active:{bg:'rgba(0,243,255,.05)',bd:'var(--cyan)',col:'var(--cyan)',lbl:'진행 중'},done:{bg:'rgba(46,204,113,.06)',bd:'var(--green)',col:'var(--green)',lbl:'보상 수령 가능'},claimed:{bg:'rgba(80,80,80,.1)',bd:'#444',col:'#555',lbl:'완료'}};
    var sc=stCfg[q.status]||stCfg.available;
    var progHTML='';
    if(q.type==='gather'&&q.status==='active'){var pct=Math.round((q.progress/q.required)*100);progHTML='<div style="margin:5px 0"><div style="display:flex;justify-content:space-between;font-size:12px;color:var(--dim);margin-bottom:2px"><span>탐색 진행</span><span>'+q.progress+'/'+q.required+'</span></div><div style="height:4px;background:var(--panel);border-radius:3px"><div style="width:'+pct+'%;height:100%;background:var(--cyan);border-radius:3px"></div></div><div style="margin-top:6px;font-size:12px;color:var(--dim);line-height:1.6">🔭 30% 해적 조우 | 💎 10% 아이템/함선 획득</div></div>';}
    if(q.type==='delivery'&&q.status==='active'){var tnm=(PLANET_DEF.find(function(p){return p.id===q.targetId;})||{nm:'목적지'}).nm;progHTML='<div style="font-size:12px;color:var(--cyan);margin:3px 0">목적지: '+tnm+'(으)로 이동하면 완료</div>';}
    var gatherSearchBtn=(q.type==='gather'&&q.status==='active')?'<button class="btn btn-sm" style="background:rgba(0,255,140,.1);border-color:rgba(0,255,140,.5);color:var(--green);animation:pulse 2s infinite" onclick="doGatherSearch()">🔭 탐색 실행</button>':'';
    var combatSearchBtn=(q.type==='combat'&&q.status==='active'&&q.nm.includes('치크스'))?'<button class="btn btn-sm" style="background:rgba(139,0,255,.1);border-color:var(--purple);color:#cc88ff;animation:pulse 2s infinite" onclick="doGatherSearch()">🛸 정찰대 탐색</button>':'';
    const _qrep2=G.reputation||0;const _qveLock=(q.rewardVe>=40&&_qrep2<200)||(q.rewardVe>=30&&_qrep2<100);const _qlockMsg2=q.rewardVe>=40?`명성 200+(현재 ${_qrep2})`:`명성 100+(현재 ${_qrep2})`;
    var actionHTML=q.status==='available'?(_qveLock?'<span style="font-size:10px;color:var(--purple)">🔒 '+_qlockMsg2+'</span>':'<button class="btn btn-sm btn-green" onclick="acceptQuest(\''+pid+'\','+realIdx+')">' + '수락</button>'):q.status==='done'?'<button class="btn btn-sm btn-gold" onclick="completeQuest(\''+pid+'\','+realIdx+')">보상 수령 +'+q.rewardCr.toLocaleString()+'</button>':'';
    actionHTML=gatherSearchBtn+combatSearchBtn+actionHTML;
    const qThumb=q.npc==='제독'?imgOrEmoji('img/chars/admiral.png',q.ic,38,38):imgOrEmoji('img/chars/broker.png',q.ic,38,38);return '<div style="background:'+sc.bg+';border:1px solid '+sc.bd+';border-radius:8px;padding:8px;display:flex;gap:8px;align-items:flex-start">'+qThumb+'<div style="flex:1;min-width:0"><div style="display:flex;align-items:center;gap:4px;margin-bottom:2px;flex-wrap:wrap"><span style="font-size:13px;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+q.nm+'</span><span style="font-size:10px;color:'+sc.col+';border:1px solid '+sc.bd+';border-radius:4px;padding:1px 4px;flex-shrink:0">'+sc.lbl+'</span></div><div style="font-size:11px;color:var(--dim);margin-bottom:3px">'+q.desc+'</div>'+progHTML+'<div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap"><span style="font-size:12px;color:var(--gold)">+'+q.rewardCr.toLocaleString()+'</span><span style="font-size:12px;color:var(--cyan)">VE+'+q.rewardVe+'</span>'+actionHTML+'</div></div></div>';
  }
  var allClaimed=qlist.length>0&&qlist.every(function(q){return q.status==='claimed';});
  // 브로커 의뢰 중 완료 가능한 항목(done/active/claimed)만 퀘스트 탭에도 표시
  var brokerVisible=brokerQ.filter(function(q){return q.status!=='available';});
  var brokerSection='';
  if(brokerVisible.length>0){
    brokerSection='<div style="background:rgba(0,243,255,.04);border:1px solid rgba(0,243,255,.2);border-radius:8px;padding:12px;margin-top:12px"><div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><span style="font-size:31px">🕴️</span><div><div style="color:var(--cyan);font-size:16px;font-weight:bold">브로커 의뢰</div><div style="color:var(--dim);font-size:12px">채취 · 배달 의뢰 — 보상 수령</div></div></div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">'+brokerVisible.map(function(q){return qCard(q);}).join('')+'</div></div>';
  }
  body.innerHTML='<div class="hub-scroll"><div class="hub-t">🎖️ 퀘스트 보상 — '+(pd?pd.nm:'')+'</div>'+loanSection+(admiralQ.length>0?'<div style="background:rgba(212,175,55,.05);border:1px solid rgba(212,175,55,.25);border-radius:8px;padding:12px;margin-bottom:12px"><div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><span style="font-size:31px">🎖️</span><div><div style="color:var(--gold);font-size:16px;font-weight:bold">함대 제독</div><div style="color:var(--dim);font-size:12px">해적 소탕 · 전투 · 탐색 의뢰</div></div></div>'+`<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">`+admiralQ.map(function(q){return qCard(q);}).join('')+`</div>`+'</div>':'')+(admiralQ.length===0?'<div style="text-align:center;padding:30px;color:var(--dim);font-size:14px">현재 제독 의뢰 없음<br><span style="font-size:12px">다른 행성으로 이동하면 새 의뢰가 생깁니다.</span></div>':allClaimed&&brokerVisible.length===0?'<div style="text-align:center;padding:20px;color:var(--dim);font-size:14px">의뢰 전부 완료! 다른 행성으로 이동하면 새 의뢰가 생깁니다.</div>':'')+brokerSection+'</div>';
}

// ═══ 행성 광장 ══════════════════════════════════════════════════
function renderPlazaView(body){
  body.classList.remove('cv');
  const pd=PLANET_DEF.find(p=>p.id===G.currentPlanet);
  const cards=[
    {tab:'tavern',ic:'🍺',nm:'주점',desc:'크루 가챠 영입 · 브로커 의뢰',color:'var(--yellow)',bg:'rgba(212,175,55,.1)',bdr:'rgba(212,175,55,.3)'},
    {tab:'trade',ic:'🪐',nm:'행성 상점',desc:'특산물 무역 · 화물 매매',color:'var(--green)',bg:'rgba(0,255,140,.07)',bdr:'rgba(0,255,140,.25)'},
    {tab:'quest',ic:'🎖️',nm:'제독 의뢰',desc:'해적 소탕 · 함대 전투 임무',color:'var(--gold)',bg:'rgba(212,175,55,.07)',bdr:'rgba(212,175,55,.2)'},
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
  body.classList.remove('cv');
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
  // 브로커 퀘스트 HTML
  const pid=G.currentPlanet;
  generateQuests(pid);
  const qlist=G.quests[pid]||[];
  const brokerQ=qlist.filter(q=>q.npc==='브로커');
  function brokerCard(q){
    const realIdx=qlist.indexOf(q);
    const stCfg={available:{bg:'var(--card)',bd:'var(--bdr)',col:'var(--dim)',lbl:'수락 가능'},active:{bg:'rgba(0,243,255,.05)',bd:'var(--cyan)',col:'var(--cyan)',lbl:'진행 중'},done:{bg:'rgba(46,204,113,.06)',bd:'var(--green)',col:'var(--green)',lbl:'보상 수령 가능'},claimed:{bg:'rgba(80,80,80,.1)',bd:'#444',col:'#555',lbl:'완료'}};
    const sc=stCfg[q.status]||stCfg.available;
    let progHTML='';
    if(q.type==='gather'&&q.status==='active'){const pct=Math.round((q.progress/q.required)*100);progHTML=`<div style="margin:3px 0"><div style="height:3px;background:var(--panel);border-radius:2px"><div style="width:${pct}%;height:100%;background:var(--cyan);border-radius:2px"></div></div><div style="font-size:10px;color:var(--dim);margin-top:1px">${q.progress}/${q.required}</div></div>`;}
    if(q.type==='delivery'&&q.status==='active'){const tnm=(PLANET_DEF.find(p=>p.id===q.targetId)||{nm:'목적지'}).nm;progHTML=`<div style="font-size:10px;color:var(--cyan);margin:2px 0">→${tnm}</div>`;}
    const gatherBtn=(q.type==='gather'&&q.status==='active')?`<button class="btn btn-sm" style="font-size:10px;padding:2px 5px;background:rgba(0,255,140,.1);border-color:rgba(0,255,140,.5);color:var(--green)" onclick="doGatherSearch()">🔭</button>`:'';
    const _qrep3=G.reputation||0,_qveLock2=(q.rewardVe>=40&&_qrep3<200)||(q.rewardVe>=30&&_qrep3<100),_qlockMsg3=q.rewardVe>=40?`명성 200+(현재 ${_qrep3})`:`명성 100+(현재 ${_qrep3})`;
    const actionHTML=q.status==='available'?(_qveLock2?`<span style="font-size:10px;color:var(--purple)">🔒 ${_qlockMsg3}</span>`:`<button class="btn btn-sm btn-green" style="font-size:10px;padding:2px 6px" onclick="acceptQuest('${pid}',${realIdx})">수락</button>`):q.status==='done'?`<button class="btn btn-sm btn-gold" style="font-size:10px;padding:2px 5px" onclick="completeQuest('${pid}',${realIdx})">보상</button>`:'';
    return `<div style="background:${sc.bg};border:1px solid ${sc.bd};border-radius:7px;padding:8px 7px;display:flex;flex-direction:column;gap:2px">
      <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap">
        <span style="font-size:12px;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${q.nm}</span>
        <span style="font-size:10px;color:${sc.col};border:1px solid ${sc.bd};border-radius:3px;padding:1px 4px;flex-shrink:0">${sc.lbl}</span>
      </div>
      <div style="font-size:11px;color:var(--dim);line-height:1.3">${q.desc}</div>
      ${progHTML}
      <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;margin-top:2px">
        <span style="font-size:11px;color:var(--gold)">+${q.rewardCr.toLocaleString()}</span>
        <span style="font-size:11px;color:var(--cyan)">VE+${q.rewardVe}</span>
        ${gatherBtn}${actionHTML}
      </div>
    </div>`;
  }
  const brokerHtml=brokerQ.length>0
    ? `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">${brokerQ.slice(0,8).map(q=>brokerCard(q)).join('')}</div>`
    : `<div style="color:var(--dim);font-size:13px;padding:12px 0;text-align:center">현재 의뢰 없음 — 다른 행성 방문 후 재방문하세요</div>`;
  // P30 보이드 보스 소문 (모든 보이드 행성 보유 시 백구가 귀띔)
  const voidBossRumorHtml=(pid==='P30'&&_allVoidOwned())?`
  <div style="background:rgba(80,0,120,.13);border:1px solid rgba(180,0,255,.35);border-radius:8px;padding:10px 12px;margin-top:10px">
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
      보이드 땅 빼앗긴 것에 분개한 미지의 존재라는 설도 있고,<br>
      보이드 균열 너머 어딘가에서 온 척후병이라는 설도 있어.<br>
      <span style="color:var(--gold)">제독 퀘스트 확인해봐. 뭔가 수상한 의뢰가 올라와 있을 거야."</span>
    </div>
  </div>`:'';
  body.innerHTML=`
  <div class="gc-panel" style="flex-direction:column;overflow:hidden">
    <div style="display:flex;align-items:center;gap:5px;padding:7px 10px;border-bottom:1px solid var(--bdr);flex-shrink:0;background:rgba(5,10,22,.97);flex-wrap:wrap">
      <button class="gc-action" style="flex:1;min-width:80px;padding:5px 4px;font-size:11px;background:rgba(0,243,255,.08);border-color:var(--cyan);color:var(--cyan)${cr<500?';opacity:.38;cursor:not-allowed':''}" ${cr>=500?'':'disabled'} onclick="doGacha(1,true,500,'N')">
        💰 ₡500<br><span style="font-size:10px;opacity:.8">일반~전설</span>
      </button>
      <button class="gc-action" style="flex:1;min-width:80px;padding:5px 4px;font-size:11px;background:rgba(30,100,255,.12);border-color:#4499ff;color:#88ccff${cr<3000?';opacity:.38;cursor:not-allowed':''}" ${cr>=3000?'':'disabled'} onclick="doGacha(1,true,3000,'R')">
        💎 ₡3,000<br><span style="font-size:10px;opacity:.8">희귀~전설</span>
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
      <div style="background:rgba(0,243,255,.04);border-top:1px solid rgba(0,243,255,.2);padding:10px 12px;flex:1;overflow-y:auto">
        <div style="display:flex;align-items:center;gap:7px;margin-bottom:8px">
          <span style="font-size:20px">🕴️</span>
          <div>
            <div style="color:var(--cyan);font-size:13px;font-weight:bold">화물 브로커</div>
            <div style="color:var(--dim);font-size:11px">배달 · 자원 채취 의뢰</div>
          </div>
        </div>
        ${brokerHtml}
        ${voidBossRumorHtml}
      </div>
    </div>
  </div>`;
}

function renderGachaView(body){renderTavernView(body);}

function renderGachaCards(results){
  const c=document.getElementById('gc-result-body');if(!c)return;
  const rarityNm={N:'일반',R:'희귀',H:'영웅',L:'전설',S:'스토리'};
  const rarityCol={N:'var(--dim)',R:'var(--blue)',H:'var(--purple)',L:'var(--gold)'};
  const CREW_BONUS={Pilot:{att:8,int2:2,tec:4},Eng:{att:2,int2:5,tec:8},Merch:{att:3,int2:7,tec:4}};
  c.innerHTML=results.map((r,i)=>{
    const rKey='r'+r.rarity;
    const rnm=rarityNm[r.rarity];
    const rcol=rarityCol[r.rarity];
    const cb=CREW_BONUS[r.cl]||{att:3,int2:3,tec:3};
    const m=RARITY_MULT[r.rarity]||1;
    const bonusTxt=['att','int2','tec'].filter(k=>cb[k]>0).map(k=>`${k.replace('int2','SHD').replace('att','ATT').replace('tec','ENG').replace('def','DEF')}+${Math.round(cb[k]*m)}`).join('  ');
    const gen=(r.ic||'👩').includes('👩')||r.nm?.endsWith('a')?'f':'m';
    return`<div class="gc-char ${rKey}" style="animation-delay:${i*0.12}s">
      <div style="flex-shrink:0;position:relative">
        ${imgOrEmoji('img/crew/'+(r.cl||'Merch')+'_'+gen+'.png',r.ic||'🧑',58,58,'border-radius:50%;border:2px solid '+rcol+';background:var(--panel)')}
        <div style="position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);white-space:nowrap;background:${rcol};color:#000;font-size:10px;font-weight:bold;padding:1px 5px;border-radius:3px">${rnm}</div>
      </div>
      <div style="flex:1;min-width:0">
        <div style="color:${rcol};font-size:17px;font-weight:bold;margin-bottom:3px;${r.rarity==='L'?'text-shadow:0 0 8px rgba(212,175,55,.7);letter-spacing:.5px':''}">${r.nm||'(이름없음)'}</div>
        <div style="color:var(--dim);font-size:12px;margin-bottom:5px">${r.cl} · ${r.f?'파벌 '+r.f:''}</div>
        <div style="font-size:13px;color:var(--cyan);background:rgba(0,243,255,.07);border:1px solid rgba(0,243,255,.18);border-radius:5px;padding:4px 8px">${bonusTxt||'스텟 보너스 없음'}</div>
        ${r.rarity==='L'?`<div style="margin-top:5px;font-size:12px;color:var(--gold)">⭐ 전설 등급 — 함선 성능 ×1.2 보너스</div>`:r.rarity==='H'?`<div style="margin-top:5px;font-size:12px;color:var(--purple)">💜 영웅 등급 — 높은 스탯 보너스</div>`:''}
      </div>
      <div style="font-size:11px;color:var(--green);flex-shrink:0;align-self:center">✅ 영입</div>
    </div>`;
  }).join('');
  c.scrollTop=0;
  // 헤더 크레딧 업데이트
  const hdr=c.closest('.gc-result')?.querySelector('.gc-result-hdr div:last-child');
  if(hdr)hdr.textContent=`현재 크루 ${G.crew.length}명 | VC ${G.voidCrystal} | ₡${G.credits.toLocaleString()}`;
}

// ═══ AUCTION ═════════════════════════════════════════════════════
function _maxOwnedPlanets(){return 1+Math.floor((G.voidEssence||0)/1000);}
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
  return (G.fleet||[]).some(sh=>sh.tier==='전설기함')||
    ['LGD01','LGD02','LGD03'].some(id=>(G.inventory||[]).some(i=>i.id===id&&i.qty>0));
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
  const hostileAvail=PLANET_DEF.filter(p=>{const st=G.planets[p.id];return st&&p.hostile&&!p.void&&!st.owned&&wonNames.has(p.nm)&&(G.act>=4||G.planets[p.id]?.hostile_cleared);});
  // 보이드 행성: 신화 파츠 4종 + 전설기함 보유 시 경매 가능
  const canBuyVoid=_hasAllMythicParts()&&_hasLegendaryFlagship();
  const voidAvail=canBuyVoid?PLANET_DEF.filter(p=>{const st=G.planets[p.id];return p.void&&st&&!st.owned;}):[];
  function normalCard(p){
    const f=FACTION[p.f],startBid=Math.floor(p.tax*8*auctDiff*gwanggaetoDisc),instBid=Math.floor(startBid*1.3),roi=Math.round(startBid/p.tax);
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
    const startBid=Math.floor(p.tax*8*auctDiff*2.5*gwanggaetoDisc);
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
    const startBid=Math.floor(p.tax*8*auctDiff*5*gwanggaetoDisc);
    const instBid=Math.floor(startBid*1.4); // 보이드는 +40% 프리미엄
    const roi=Math.round(startBid/p.tax);
    return `<div class="pl-item" style="flex-direction:row;align-items:stretch;overflow:hidden;padding:0;border-color:rgba(0,243,255,.5);background:rgba(0,243,255,.05);min-height:130px">
      <div style="flex:1;padding:12px;display:flex;flex-direction:column;justify-content:space-between;gap:6px;min-width:0">
        <div>
          <div style="font-size:16px;font-weight:bold;color:var(--cyan)">${p.nm} <span style="font-size:11px;background:rgba(0,243,255,.12);border:1px solid rgba(0,243,255,.4);padding:1px 5px;border-radius:6px">🌌 균열지대</span></div>
          <div style="font-size:12px;color:var(--cyan);margin-top:2px">보이드 | 링${p.ring} | 균열 지대</div>
          <div style="font-size:12px;color:var(--dim);margin-top:3px">세율 <b style="color:var(--cyan)">₡${p.tax.toLocaleString()}/턴</b> — 치크스 2배 💰 | 회수 ${roi}턴</div>
          <div style="font-size:12px;margin-top:3px">시작가 <span style="color:var(--cyan)">₡${startBid.toLocaleString()}</span> | 즉시 <span style="color:var(--gold)">₡${instBid.toLocaleString()}</span></div>
          <div style="font-size:11px;color:rgba(0,243,255,.6);margin-top:2px">✦신화 파츠 4종 + 전설기함 보유 조건 충족</div>
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
    const p=PARTS.find(x=>x.id===pid);
    const has=(G.inventory||[]).some(i=>i.id===pid&&i.qty>0)||(G.fleet||[]).some(sh=>(sh.parts||[]).includes(pid));
    return `<span style="color:${has?'var(--green)':'var(--dim)'}">■${p?.nm?.replace(' ✦신화','').replace(' ❖신화','')||pid}</span>`;
  }).join('&nbsp;');
  const hasFlag=_hasLegendaryFlagship();
  body.innerHTML=`<div class="hub-scroll">${hubBanner('auction','🏛️','행성 경매',PLANET_DEF.find(p=>p.id===G.currentPlanet)?.f)}<div class="hub-t">🏛️ 행성 경매 <span style="font-size:13px;font-weight:normal;color:${bidsLeft>0?'var(--cyan)':'var(--red)'}">입찰 남은 횟수: ${bidsLeft}/2 (턴당)</span>&nbsp;&nbsp;<span style="font-size:13px;font-weight:normal;color:${_planetsAtLimit?'var(--red)':'var(--dim)'}">| 소유 행성: ${_ownedCnt2}/${_maxPlanets2}개 (VE ${_maxPlanets2*1000}+ → +1)</span></div>
    <div style="color:var(--dim);font-size:13px;margin-bottom:4px">낙찰 즉시 총독권 획득. 매 턴 세금 수입 발생. 투자로 레벨업 가능.</div>
    <div style="background:rgba(212,175,55,.07);border:1px solid rgba(212,175,55,.25);border-radius:6px;padding:8px 12px;font-size:13px;color:var(--dim);margin-bottom:14px;line-height:1.7">
      💡 <b style="color:var(--gold)">즉시낙찰</b>: 시작가 <span style="color:var(--red)">+30%</span> 프리미엄 — 100% 확정 낙찰<br>
      💡 <b style="color:var(--cyan)">직접입찰</b>: 시작가 이상 자유 입찰 — 낙찰 확률 <span style="color:var(--cyan)">60~90%</span> (금액에 따라)<br>
      💡 <b style="color:var(--yellow)">난이도 배율</b>: ${{easy:'쉬움 +5%',normal:'보통 +15%',hard:'어려움 +22%',extreme:'극악 +30%'}[G.difficulty]||'보통 +15%'} 적용 중<br>
      💡 <b style="color:var(--red)">입찰 제한</b>: 턴당 최대 2회 (실패 포함) — 다음 턴에 초기화
    </div>
    ${G.heroes.includes('H03')?`<div style="background:rgba(255,215,0,.06);border:1px solid rgba(255,215,0,.25);border-radius:6px;padding:7px 12px;font-size:13px;color:var(--gold);margin-bottom:10px">👑 광개토대왕 효과: 행성 경매가 <b>30% 할인</b> 적용 중</div>`:''}
    ${bidsLeft<=0?`<div style="background:rgba(255,60,60,.07);border:1px solid rgba(255,60,60,.3);border-radius:8px;padding:12px;text-align:center;color:var(--red);font-size:14px;margin-bottom:12px">이번 턴 입찰 횟수 소진 — 다음 턴에 2회 초기화</div>`:''}
    ${_planetsAtLimit?`<div style="background:rgba(255,165,0,.07);border:1px solid rgba(255,165,0,.3);border-radius:8px;padding:12px;text-align:center;color:var(--yellow);font-size:14px;margin-bottom:12px">🔒 행성 보유 한도 도달 (${_ownedCnt2}/${_maxPlanets2}개) — VE ${(_maxPlanets2*1000).toLocaleString()} 달성 시 슬롯 +1 확장</div>`:''}
    ${noNormal&&noHostile?`<div style="background:var(--card);border:1px dashed var(--bdr);border-radius:8px;padding:24px;text-align:center;color:var(--dim)">경매 가능한 행성 없음<br><span style="font-size:13px">은하 지도에서 탐험하고 치크스 행성을 공략하세요</span></div>`:''}
    ${noNormal?'':`<div style="font-size:14px;font-weight:bold;color:var(--gold);margin-bottom:8px">🌐 일반 행성</div>${`<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px">`+avail.map(normalCard).join('')+`</div>`}`}
    ${noHostile?`<div style="background:rgba(139,0,255,.04);border:1px dashed #8b00ff44;border-radius:8px;padding:14px;text-align:center;color:#8b00ff88;font-size:13px;margin-top:${noNormal?'0':'12px'}">⚔️ 치크스 행성 전투에서 승리하면 합병 경매 가능</div>`:
    `<div style="font-size:14px;font-weight:bold;color:#cc66ff;margin-top:${noNormal?'0':'14px'};margin-bottom:8px">💀 치크스 전략 합병</div>${`<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px">`+hostileAvail.map(hostileCard).join('')+`</div>`}`}
    <!-- 보이드 행성 섹션 -->
    <div style="margin-top:16px">
      ${canBuyVoid&&!noVoid
        ?`<div style="font-size:14px;font-weight:bold;color:var(--cyan);margin-bottom:8px">🌌 보이드 균열지대 <span style="font-size:11px;color:var(--dim);font-weight:normal">(신화 풀셋 보유 확인됨)</span></div><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px">`+voidAvail.map(voidCard).join('')+`</div>`
        :canBuyVoid&&noVoid
          ?`<div style="background:rgba(0,243,255,.04);border:1px dashed rgba(0,243,255,.25);border-radius:8px;padding:14px;text-align:center;color:var(--cyan);font-size:13px">🌌 모든 보이드 균열지대 낙찰 완료</div>`
          :`<div style="background:rgba(0,243,255,.04);border:1px dashed rgba(0,243,255,.2);border-radius:8px;padding:14px;font-size:13px;color:var(--dim)">
            <div style="color:var(--cyan);font-weight:bold;margin-bottom:6px">🌌 보이드 균열지대 투자 — 잠금</div>
            <div style="margin-bottom:6px">신화 파츠 4종 + 전설기함 보유 시 보이드 행성 경매 가능</div>
            <div style="font-size:12px;line-height:1.8">${mythicStatus}</div>
            <div style="font-size:12px;margin-top:4px;color:${hasFlag?'var(--green)':'var(--dim)'}">■ 전설기함 ${hasFlag?'✅ 보유':'⬜ 미보유'}</div>
          </div>`
      }
    </div>
  </div>`;
}
function doBid(pid,amount,instant=false){
  const pd=PLANET_DEF.find(p=>p.id===pid);
  if(G.credits<amount){notify('크레딧 부족','err');return;}
  const _ownedCnt=Object.values(G.planets).filter(p=>p.owned).length;
  const _maxPlanets=_maxOwnedPlanets();
  if(_ownedCnt>=_maxPlanets){notify(`🔒 행성 보유 한도 초과 — 현재 ${_ownedCnt}/${_maxPlanets}개 (VE ${_maxPlanets*1000} 달성 시 +1 슬롯)`,'err');return;}
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
  updateHUD();saveGame(true);hubTab('planets');
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
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px">
          ${ships.map(s=>{const have=ownedIds.has(s.id);const seen=discoveredIds.has(s.id);
            const badge=have?'<div style="font-size:10px;color:var(--green);margin-top:3px">✅ 보유중</div>':seen?'<div style="font-size:10px;color:var(--cyan);margin-top:3px">🔍 발견</div>':'<div style="font-size:10px;color:var(--dim);margin-top:3px">❔ 미발견</div>';
            const _bdr=have?(tierCol[tier]||'var(--bdr)'):seen?'rgba(0,243,255,.3)':'var(--bdr)';
            const _filter=seen?'':'filter:grayscale(.9);opacity:.35';
            const _nc=have?'var(--txt)':seen?'var(--txt)':'var(--dim)';
            return'<div style="background:var(--card);border:1px solid '+_bdr+';border-radius:8px;padding:8px;text-align:center;'+_filter+'">'
              +imgOrEmoji(shipImgSrc(s),s.ic||'🛸',52,52,'border-radius:6px;margin:0 auto 4px',(seen?'ship_'+s.id:''))
              +'<div style="font-size:12px;font-weight:bold;color:'+_nc+';line-height:1.2">'+(seen?s.nm:'???')+'</div>'
              +badge
              +'<div style="font-size:11px;color:var(--dim)">'+(seen?'₡'+s.price.toLocaleString():'')+'</div>'
              +'</div>';
          }).join('')}
        </div>
      </div>`;
    }).join('');
    const capSection=capturedShips.length>0?`<div style="margin-bottom:16px;border-top:1px solid var(--bdr);padding-top:14px">
      <div style="font-size:13px;color:#ff8844;font-weight:bold;margin-bottom:8px;letter-spacing:1px">🏴 나포 함선 <span style="color:var(--dim);font-size:11px">${capturedShips.length}척</span></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px">
        ${capturedShips.map(s=>`<div style="background:var(--card);border:1px solid rgba(255,136,68,.4);border-radius:8px;padding:8px;text-align:center">
          ${imgOrEmoji(shipImgSrc(s),TIER_EMOJI[s.tier]||'🛸',52,52,'border-radius:6px;margin:0 auto 4px')}
          <div style="font-size:12px;font-weight:bold;color:var(--txt);line-height:1.2">${s.nm}</div>
          <div style="font-size:11px;margin-top:3px;color:#ff8844">🏴 나포</div>
          <div style="font-size:11px;color:var(--dim)">${s.tier}</div>
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
    const catNm={weapon:'⚔️ 무기',shield:'🛡️ 실드',armor:'🛡 장갑',engine:'⚡ 엔진'};
    const catCol={weapon:'var(--red)',shield:'var(--blue)',armor:'var(--gold)',engine:'var(--cyan)'};
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
    ${['weapon','shield','armor','engine'].map(cat=>{
      const ps=PARTS.filter(p=>p.cat===cat);const hv=ps.filter(p=>haveSet.has(p.id)).length;
      return`<div style="margin-bottom:16px">
        <div style="font-size:13px;color:${catCol[cat]};font-weight:bold;margin-bottom:8px;letter-spacing:1px">${catNm[cat]} <span style="color:var(--dim);font-size:11px">${hv}/${ps.length}</span></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:8px">
          ${ps.map(p=>{const have=haveSet.has(p.id);
            const _invQty=inv.find(i=>i.id===p.id)?.qty||0;
            const _eqQty=(G.fleet||[]).flatMap(s=>s.parts||[]).filter(pid=>pid===p.id).length;
            const qty=_invQty+_eqQty;
            const rarityBadge=p.rarity==='mythic'?'<div style="font-size:10px;color:#ff88ff;margin-top:1px">✦ 신화</div>':p.rarity==='set'?'<div style="font-size:10px;color:#c080ff;margin-top:1px">◈ 세트</div>':'';
            return`<div style="background:var(--card);border:1px solid ${have?rarBdr(p):'var(--bdr)'};border-radius:8px;padding:8px 6px;text-align:center;opacity:${have?1:.42};position:relative">
              ${imgOrEmoji('img/parts/'+p.id+'.png',cat==='weapon'?'⚔️':cat==='shield'?'🛡️':cat==='armor'?'🛡':'⚡',44,44,'border-radius:6px;margin:0 auto 4px','part_'+p.id)}
              <div style="font-size:11px;font-weight:bold;color:${rarCol(p)};line-height:1.2;word-break:keep-all">${p.nm}</div>
              ${rarityBadge}
              <div style="font-size:10px;color:var(--dim);margin-top:2px">T${p.tier} · ${statTxt(p)}</div>
              <div style="font-size:11px;margin-top:3px">${have?`<span style="color:var(--green)">✅ ×${qty}</span>`:`<span style="color:var(--dim)">❔ 미보유</span>`}</div>
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
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px">
      ${heroList.map(([id,h])=>{const have=G.heroes.includes(id);const aboard=G.fleet.find(s=>(s.crewIds||[]).includes(id));
        const cl=have?'cursor:pointer':'';
        const oc=have?`onclick="showCodexHeroModal('${id}')"` :'';
        const hover=have?'onmouseover="this.style.opacity=\'.8\'" onmouseout="this.style.opacity=\'1\'"':'';
        return`<div ${oc} ${hover} style="background:var(--card);border:1px solid ${have?'var(--gold)':'var(--bdr)'};border-radius:8px;padding:10px;text-align:center;opacity:${have?1:.4};${cl}">
          <div style="font-size:34px;margin-bottom:4px">${have?h.ic:'❔'}</div>
          <div style="font-size:13px;font-weight:bold;color:${have?'var(--gold)':'var(--dim)'}">${have?h.nm:'???'}</div>
          <div style="font-size:11px;color:var(--purple);margin:2px 0">${have?h.sk:'미영입'}</div>
          ${have?`<div style="font-size:11px;color:${aboard?'var(--cyan)':'var(--dim)'}">🛸 ${aboard?aboard.nm:'미탑승'}</div>`:''}
          <div style="font-size:11px;color:var(--dim);margin-top:3px">${have?`ATT:${h.ATT} INT:${h.INT} DEF:${h.DEF}`:''}</div>
          ${have?'<div style="font-size:9px;color:var(--dim);margin-top:3px;opacity:.6">👆 클릭=상세</div>':''}
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
      const imgEl=visited?('<img src="img/planets/'+p.id+'.png" style="width:100%;height:100%;object-fit:cover" onerror="this.remove()">'):'<span style="font-size:22px;display:flex;align-items:center;justify-content:center;height:100%">❔</span>';
      const badge=isCurrent?'<div style="font-size:10px;color:var(--cyan);margin-top:2px">📍 현재</div>':visited?'<div style="font-size:10px;color:var(--green);margin-top:2px">✅ 방문</div>':'';
      const clickable=visited?'cursor:pointer;':'';
      const onclick=visited?'onclick="showCodexPlanetModal(\''+p.id+'\')"':'';
      return '<div '+onclick+' style="background:var(--card);border:1px solid '+(isCurrent?'var(--cyan)':visited?fc:'var(--bdr)')+';border-radius:8px;padding:8px;text-align:center;'+filt+clickable+'" '+(visited?'onmouseover="this.style.opacity=\'.8\'" onmouseout="this.style.opacity=\'1\'"':'')+'>'
        +'<div style="width:52px;height:52px;border-radius:50%;overflow:hidden;margin:0 auto 6px">'+imgEl+'</div>'
        +'<div style="font-size:12px;font-weight:bold;color:'+(visited?'var(--txt)':'var(--dim)')+'">'+( visited?p.nm:'???')+'</div>'
        +'<div style="font-size:10px;color:'+fc+';margin-top:2px">'+(visited?fn:'')+'</div>'
        +'<div style="font-size:10px;color:var(--dim);margin-top:1px">'+(visited?'링 '+p.ring:'')+'</div>'
        +badge
        +(visited?'<div style="font-size:9px;color:var(--dim);margin-top:2px;opacity:.6">👆 클릭=상세</div>':'')
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
        return '<div style="background:var(--card);border:1px solid '+bdr+';border-radius:8px;padding:8px;text-align:center;'+filt+'">'
          +imgOrEmoji('img/commodities/'+c.id+'.png',c.ic||'💎',44,44,'border-radius:6px;margin:0 auto 4px',(seen?(c.material?'mat_':'comm_')+c.id:''))
          +'<div style="font-size:11px;font-weight:bold;color:'+nc+';line-height:1.2">'+(seen?c.nm:'???')+'</div>'
          +(seen?'<div style="font-size:10px;color:var(--gold);margin-top:2px">₡'+c.buy.toLocaleString()+'</div>':'')
          +'<div style="font-size:10px;color:'+(seen?'var(--green)':'var(--dim)')+';margin-top:1px">'+(seen?'🔍 발견':'')+'</div>'
          +'</div>';
      }).join('');
      return '<div style="margin-bottom:16px">'
        +'<div style="font-size:13px;color:var(--cyan);font-weight:bold;margin-bottom:8px">'+label+' <span style="color:var(--dim);font-size:11px">발견 '+discCount+'/'+list.length+'</span></div>'
        +'<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:8px">'+cards+'</div>'
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
      const pd=PLANET_DEF.find(p=>p.id===l.planetId)||PLANET_DEF.find(p=>p.nm===l.planet);
      const planetImgSrc=pd?`img/planets/${pd.id}.png`:'img/planets/P01.png';
      const pFaction=pd?FACTION[pd.f]:null;
      return `<div style="background:var(--card);border:1px solid ${l.win?'rgba(46,204,113,.3)':'rgba(255,80,80,.25)'};border-radius:12px;overflow:hidden;display:flex;flex-direction:row;min-height:160px">
        <!-- 좌측: 전투 정보 -->
        <div style="flex:1;padding:12px 14px;display:flex;flex-direction:column;gap:6px;min-width:0">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
            <span class="badge ${l.win?'bd-gn':'bd-rd'}" style="font-size:12px">${l.win?'승':'패'}</span>
            <span style="font-size:14px;font-weight:bold;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${l.planet}</span>
            ${pFaction?`<span style="font-size:11px;color:${pFaction.col}">${pFaction.nm}${pd?.ring?' · 링'+pd.ring:''}</span>`:''}
          </div>
          <div style="font-size:15px;font-weight:bold;color:${l.win?'var(--green)':'var(--red)'}">${l.win?'🎉 승리':'💀 패배'}</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <span style="font-size:13px;color:var(--gold)">₡${l.earned.toLocaleString()}</span>
            <span style="font-size:12px;color:var(--dim)">⏱${l.turn}턴</span>
            <span style="font-size:12px;color:var(--muted)">T${l.gameTurn}</span>
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
function showHeroRecruit(heroId){
  const h=HEROES[heroId];if(!h)return;
  let reqNote='';
  if(heroId==='H01'){
    const has=G.inventory&&G.inventory.find(i=>i.id==='G18'&&i.qty>0);
    reqNote=`<div style="margin-top:8px;padding:6px;border-radius:6px;font-size:13px;background:${has?'rgba(0,243,0,.1)':'rgba(255,60,60,.1)'};color:${has?'var(--green)':'var(--red)'}">
      ${has?'✅ 난중일기 영인본 보유 — 영입 가능':'⚠️ 난중일기 영인본(G18) 필요 — 지구 저항군 행성 상점에서 구입'}</div>`;}
  openModal(`${h.ic} 전설 영웅 발견!`,
    `<div style="text-align:center;padding:8px"><div style="font-size:58px;margin-bottom:8px">${h.ic}</div>
    <div style="color:var(--gold);font-size:22px;font-weight:bold;margin-bottom:4px">${h.nm}</div>
    <div style="background:var(--card);border-radius:8px;padding:12px;font-size:13px;line-height:2">
      ATT:${h.ATT} INT:${h.INT} DEF:${h.DEF} HP:${h.HP}<br>필살기: <span style="color:var(--purple)">${h.sk}</span></div>${reqNote}</div>`,
    [{txt:'✅ 영입!',fn:()=>recruitHero(heroId),cls:'btn-gold'},{txt:'나중에',fn:closeModal,cls:'btn-sm'}]);
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
    renderMap();
  }
  setTimeout(()=>tryInitMap(0),30);
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
  let panDrag=false,rotateDrag=false,lx=0,ly=0,moved=false;
  mapCV.oncontextmenu=e=>{e.preventDefault();}; // 우클릭 메뉴 방지
  mapCV.onmousedown=e=>{
    lx=e.clientX;ly=e.clientY;moved=false;
    if(e.button===0){panDrag=true;mapCV.style.cursor='grabbing';}
    else if(e.button===2){rotateDrag=true;mapCV.style.cursor='grabbing';}
  };
  mapCV.onmousemove=e=>{
    if(!panDrag&&!rotateDrag)return;
    const dx=e.clientX-lx,dy=e.clientY-ly;
    if(Math.abs(dx)+Math.abs(dy)>3)moved=true;
    if(rotateDrag){
      map3dRotY+=dx*0.007;map3dRotX+=dy*0.007;
      map3dRotX=Math.max(-Math.PI/2,Math.min(Math.PI/2,map3dRotX));
    } else if(panDrag){
      mapOffX+=dx;mapOffY+=dy;
    }
    lx=e.clientX;ly=e.clientY;renderMap();
  };
  mapCV.onmouseup=e=>{
    if(e.button===0){const wasClick=!moved&&panDrag;panDrag=false;mapCV.style.cursor='crosshair';if(wasClick)onMapClick(e);}
    else if(e.button===2){rotateDrag=false;mapCV.style.cursor='crosshair';}
  };
  mapCV.onmouseleave=()=>{panDrag=false;rotateDrag=false;mapCV.style.cursor='crosshair';};
  mapCV.onwheel=e=>{e.preventDefault();G.mapZoom=Math.max(.25,Math.min(4,G.mapZoom+(e.deltaY>0?-.12:.12)));renderMap();};
  // touch events
  let touches=[];
  mapCV.addEventListener('touchstart',e=>{e.preventDefault();touches=[...e.touches];moved=false;},{passive:false});
  mapCV.addEventListener('touchmove',e=>{
    e.preventDefault();
    if(e.touches.length===1&&touches.length>=1){
      const dx=e.touches[0].clientX-touches[0].clientX,dy=e.touches[0].clientY-touches[0].clientY;
      if(Math.abs(dx)+Math.abs(dy)>3)moved=true;
      mapOffX+=dx;mapOffY+=dy;
      renderMap();
    } else if(e.touches.length===2&&touches.length>=2){
      const d0=Math.hypot(touches[0].clientX-touches[1].clientX,touches[0].clientY-touches[1].clientY);
      const d1=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
      if(d0>0)G.mapZoom=Math.max(.25,Math.min(4,G.mapZoom*(d1/d0)));renderMap();
    }
    touches=[...e.touches];
  },{passive:false});
  mapCV.addEventListener('touchend',e=>{e.preventDefault();if(!moved&&e.changedTouches.length===1){onMapClick(e.changedTouches[0]);}touches=[];},{passive:false});
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
function hasLegendaryEngineOnAny(){return G.fleet.some(s=>(s.parts||[]).includes('E15'));}
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
    if(fog!=='L'){
      const pimgSrc='img/planets/'+p.id+'.png';
      const pImg=_loadMapImg(pimgSrc,()=>renderMap());
      if(pImg&&pImg.complete&&pImg.naturalWidth>0){
        ctx.save();ctx.globalAlpha=alpha;
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
    if(fog!=='L'&&G.mapZoom>.35){
      ctx.fillStyle=fog==='A'?'#ccd6f6':'rgba(160,200,220,.55)';
      ctx.font=`${Math.max(7,8*G.mapZoom)}px 'Malgun Gothic','맑은 고딕','Courier New'`;
      ctx.textAlign='center';ctx.globalAlpha=alpha;
      ctx.fillText(p.nm,sp.x,sp.y+r+13);
    }
    ctx.globalAlpha=1;
  });

  // 지구 위치 (달 정거장 아래 — 봉쇄된 인류의 고향)
  {
    const p24pos=G.mapPositions['P24'];
    const earthWX=p24pos?p24pos.x:0;
    const earthWY=p24pos?p24pos.y+110:0;
    const earth3d=rotate3D(earthWX,earthWY,0,map3dRotX,map3dRotY);
    const ep=project3D(earth3d.x,earth3d.y,earth3d.z);
    const er=Math.max(3,5*G.mapZoom); // 50% of original size
    // 지구 글로우
    const eg=ctx.createRadialGradient(ep.sx,ep.sy,0,ep.sx,ep.sy,er*4);
    eg.addColorStop(0,'rgba(30,144,255,0.35)');eg.addColorStop(1,'rgba(0,80,200,0)');
    ctx.globalAlpha=1;ctx.fillStyle=eg;ctx.beginPath();ctx.arc(ep.sx,ep.sy,er*4,0,Math.PI*2);ctx.fill();
    // 지구 구체 (이미지 or 파란색 그라디언트)
    {const earthImg=_loadMapImg('img/planets/EARTH.png',()=>renderMap());
    if(earthImg&&earthImg.complete&&earthImg.naturalWidth>0){
      ctx.save();ctx.globalAlpha=1;
      ctx.beginPath();ctx.arc(ep.sx,ep.sy,er,0,Math.PI*2);ctx.clip();
      ctx.drawImage(earthImg,ep.sx-er,ep.sy-er,er*2,er*2);
      ctx.restore();
    } else {
      const esg=ctx.createRadialGradient(ep.sx-er*.3,ep.sy-er*.3,er*.05,ep.sx,ep.sy,er*1.1);
      esg.addColorStop(0,'rgba(180,220,255,0.9)');esg.addColorStop(0.4,'#1e90ff');esg.addColorStop(1,'rgba(0,30,100,0.8)');
      ctx.fillStyle=esg;ctx.beginPath();ctx.arc(ep.sx,ep.sy,er,0,Math.PI*2);ctx.fill();
    }}
    // 봉쇄 링 (빨간 점선)
    ctx.strokeStyle='rgba(255,60,60,0.55)';ctx.lineWidth=1.2;ctx.setLineDash([4,5]);
    ctx.beginPath();ctx.arc(ep.sx,ep.sy,er+8,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
    // 레이블
    ctx.globalAlpha=1;ctx.fillStyle='#6ecfff';ctx.font=`bold ${Math.max(8,9*G.mapZoom)}px Courier New`;
    ctx.textAlign='center';ctx.fillText('지구',ep.sx,ep.sy+er+16);
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
function onMapClick(e){
  const rect=mapCV?mapCV.getBoundingClientRect():{left:0,top:0};
  const mx=(e.clientX!==undefined?e.clientX:e.pageX||0)-rect.left;
  const my=(e.clientY!==undefined?e.clientY:e.pageY||0)-rect.top;
  // ── 블랙홀 클릭 hit-test ──────────────────────────────────────────
  {
    const _bh3d=rotate3D(0,0,0,map3dRotX,map3dRotY);
    const _bp=project3D(_bh3d.x,_bh3d.y,_bh3d.z);
    const _br=Math.max(10,18*G.mapZoom)*1.4;  // 2배 확대에 맞춘 hit-test
    const _bhDist=Math.hypot(_bp.sx-mx,_bp.sy-my);
    if(_bhDist<_br){
      if(!G._falconDefeated){
        baekgu('저곳은... 블랙홀이야. 뭔가 있는 것 같지만 아직 접근할 수 없어. 팔콘 스카우트를 먼저 처치해야 해!');
        notify('🌑 [잠김] 팔콘 스카우트를 격파해야 진입 가능합니다','err');
      } else if(G._voidSpearObtained){
        openModal('◈ 보이드의 심연','<div style="text-align:center;padding:16px"><div style="font-size:48px;margin-bottom:10px">🌑</div><div style="color:#cc44ff;font-size:18px;font-weight:bold;margin-bottom:8px">보이드의 심연</div><div style="color:#fff;font-size:16px;line-height:2;background:#000;padding:12px 16px;border-radius:8px;border:1px solid #cc44ff">살아서 이곳을 나간자는 아직 없다.</div><div style="color:var(--dim);font-size:13px;margin-top:10px">보이드의 창은 이미 획득했습니다.</div></div>',[{txt:'돌아가기',fn:closeModal,cls:'btn-sm'}]);
      } else {
        openModal('◈ 보이드의 심연',
          `<div style="text-align:center;padding:20px;background:linear-gradient(180deg,#0a0015,#1a0030);border-radius:10px;border:1px solid rgba(180,0,255,.4)">
            <div style="font-size:56px;margin-bottom:10px;animation:pulse 1.5s infinite">🌑</div>
            <div style="color:#dd66ff;font-size:19px;font-weight:bold;margin-bottom:10px;text-shadow:0 0 12px rgba(200,100,255,.6)">◈ 보이드의 심연</div>
            <div style="color:#e0d0ff;font-size:15px;line-height:2;background:rgba(0,0,0,.6);padding:14px 18px;border-radius:8px;border:1px solid rgba(180,0,255,.3);margin-bottom:12px">
              살아서 이곳을 나간 자는 아직 없다.<br>
              <span style="color:#cc44ff">... 그러나 당신은 달랐다.</span>
            </div>
            <div style="color:var(--gold);font-size:14px;background:rgba(212,175,55,.08);border:1px solid rgba(212,175,55,.3);border-radius:6px;padding:8px 14px">
              🔱 <b>보이드의 창</b> 획득 — ATK 10,000 / 6슬롯
            </div>
          </div>`,
          [{txt:'🔱 창을 가져가다',fn:()=>{closeModal();_grantVoidSpear();},cls:'btn-gold'},{txt:'돌아가기',fn:closeModal,cls:'btn-sm'}]);
      }
      return;
    }
  }

  // 지구 클릭 hit-test (달 정거장 아래)
  const _p24c=G.mapPositions['P24'];
  const _ewx=_p24c?_p24c.x:0,_ewy=_p24c?_p24c.y+110:0;
  const _e3d=rotate3D(_ewx,_ewy,0,map3dRotX,map3dRotY);
  const ep=project3D(_e3d.x,_e3d.y,_e3d.z);
  const er=Math.max(3,5*G.mapZoom);
  const earthDist=Math.hypot(ep.sx-mx,ep.sy-my);
  if(earthDist<er*2.5){
    baekgu('지구야... 우르사 메이저를 격파해야 봉쇄가 풀려. 치크스 행성 3개 이상 공략하면 최종전 진입 가능해!');
    tryBossEntry();
    return;
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
  if(pd.hostile&&!G.planets[pd.id]?.hostile_cleared){setTimeout(()=>startCombat(pd),800);return;}
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
  if(pd.hero&&!G.heroes.includes(pd.hero))setTimeout(()=>showHeroRecruit(pd.hero),1000);
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
  saveGame(true);
}

// ═══ COMBAT ══════════════════════════════════════════════════════
let combatState=null;
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
  // 아르마다(T02) 보유 시 함대 전체 실드 +20%
  const hasArmada=G.fleet&&G.fleet.some(sh=>sh.id&&sh.id.startsWith('T02'));
  const armadaMult=hasArmada?1.2:1.0;
  return{ATT:Math.round(((+s.ATT||0)+b.att+cb.att)*hm),INT:Math.round(((+s.INT||0)+b.int2+cb.int2)*hm),TEC:Math.round(((+s.TEC||0)+b.tec+cb.tec)*hm),DEF:Math.round(((+s.DEF||0)+b.def+cb.def)*hm),HP:Math.round(((+s.maxHP||100)+b.hp+cb.hp)*hm),maxSH:Math.round(((+s.maxSH||0)+b.sh+cb.sh)*hm*armadaMult)};
}
function startCombat(planetDef){
  const isBoss=planetDef.id==='BOSS';
  let enemies;
  if(isBoss){
    enemies=[{...BOSS,id:'BOSS_MAIN',isEnemy:true,hp:BOSS.hp,sh:BOSS.sh,phase:1,_phaseAnn:0,shieldTier:20,armorTier:15}];
  } else {
    const dm=getDiffMult(),danger=planetDef.ring||2;
    const plv=calcPlayerLevel();
    // 적 함선 수 = 플레이어 함대 수 (최소2, 최대6)
    const baseEC=Math.max(2,Math.min(G.fleet.length,6));
    const eCount=planetDef.hostile?Math.min(12,Math.round(baseEC*1.2*getDiffCountMult())):Math.min(8,Math.round(baseEC*getDiffCountMult()));
    // ── 적 스탯: 플레이어 함대 평균치에 비례 (danger 링 단계별 65~90%) ──
    const fp=calcFleetAvgPower();
    // ring1=0.60, ring2=0.68, ring3=0.76, ring4=0.84, ring5=0.92
    const dangerMult=0.60+(danger-1)*0.08;
    const eHP=Math.round(fp.hp*dangerMult*dm);
    const eATK=Math.round(fp.atk*dangerMult*dm);
    const eINT=Math.round(fp.atk*dangerMult*0.65*dm);
    const eTEC=Math.round(fp.atk*dangerMult*0.70*dm);
    const tierFn=(i)=>i===0&&plv>=60?'대형':i<2&&plv>=30?'중형':'소형';
    enemies=Array.from({length:eCount},(_,i)=>({
      id:`E${i}`,nm:`치크스 ${['전투선','순양함','구축함','포함','강습함','모선'][i%6]}`,
      tier:tierFn(i),isEnemy:true,
      hp:Math.round(eHP*(i===0?1.3:1.0)),maxHP:Math.round(eHP*(i===0?1.3:1.0)),
      sh:Math.floor(eHP*(i===0?0.5:0.35)),maxSH:Math.floor(eHP*(i===0?0.5:0.35)),
      ATT:Math.round(eATK*(i===0?1.2:1.0)),INT:Math.round(eINT*(i===0?1.1:1.0)),
      TEC:eTEC,HP:eHP,LOY:50,parts:[],
      shieldTier:Math.min(20,Math.max(1,danger*3)),armorTier:Math.min(20,Math.max(1,danger*2))
    }));
  }
  const players=G.fleet.map(s=>{const st=getShipStats(s);const _wpn=PARTS.find(p=>p.cat==='weapon'&&(s.parts||[]).includes(p.id));const _wt=_wpn?(_wpn.tier||1):1;const _wtype=_wpn?(_wpn.wtype||'laser'):'laser';const _wrar=_wpn?(_wpn.rarity||''):'';const _shp=PARTS.find(p=>p.cat==='shield'&&(s.parts||[]).includes(p.id));const _shTier=_shp?(_shp.tier||0):0;const _arp=PARTS.find(p=>p.cat==='armor'&&(s.parts||[]).includes(p.id));const _arTier=_arp?(_arp.tier||0):0;return{...s,isEnemy:false,hp:s.hp,maxHP:st.HP,sh:s.sh,maxSH:st.maxSH,ATT:st.ATT,INT:st.INT,TEC:st.TEC,DEF:st.DEF||0,wtype:_wtype,wpnTier:_wt,wpnRarity:_wrar,shieldTier:_shTier,armorTier:_arTier};});
  combatState={players,enemies,turn:0,done:false,log:[],planetDef,isBoss,_rndSeed:Date.now()%9999,_entranceT:0,_entranceDone:false,_planetId:G.currentPlanet};
  renderCombatView(document.getElementById('hub-body'));
  setHubNav('combat');updateHUD();
  _cbEffects=[];_unitPos={};if(_cbAnimReq){cancelAnimationFrame(_cbAnimReq);_cbAnimReq=null;}
  combatState._sunsinUsed=false;
  // 함선 즉시 등장 (애니메이션 없음)
  combatState._entranceT=1;combatState._entranceDone=true;
  sfxAlert();_preloadCombatImages();requestAnimationFrame(()=>{initCombatCanvas();const t=document.getElementById('cb-title');if(t)t.textContent=`⚔️ ${isBoss?'우르사 메이저 최종전!':'전투'} — ${planetDef.nm}`;setTimeout(runCombatTurn,600);});
}
function renderCombatView(body){
  body.classList.add('cv');
  body.innerHTML=`<div id="cb-hdr" style="height:44px;background:rgba(13,26,42,.97);border-bottom:1px solid var(--bdr);display:flex;align-items:center;justify-content:space-between;padding:0 14px;flex-shrink:0">
    <div id="cb-title" style="color:var(--yellow);font-weight:bold;font-size:16px">⚔️ 전투</div>
    <div id="cb-turn" style="color:var(--cyan);font-size:14px">TURN 0</div>
    <div id="cb-status" style="color:var(--dim);font-size:13px">준비 중...</div>
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
const _cbImgCache={};
// 전투 시작 전 이미지 프리로드 (초기 렌더링에 PNG 즉시 표시)
function _preloadCombatImages(){
  // 로드 완료 시 캔버스 갱신 (이미지 로드 후 벡터→PNG로 전환)
  let _pendingRedraws=0;
  const _onImgLoad=()=>{_pendingRedraws++;if(_pendingRedraws===1)setTimeout(()=>{_pendingRedraws=0;if(typeof drawCombatFrame==='function')drawCombatFrame();},80);};
  const factions=['CHIX','PIRATE','DBRP'];const sizes=['S','M','L'];
  factions.forEach(f=>sizes.forEach(s=>_loadCombatImg('img/combat/enemies/'+f+'_'+s+'.png',_onImgLoad)));
  _loadCombatImg('img/combat/enemies/Boss.png',_onImgLoad);
  // 플레이어 함선 (편대 기준)
  if(G&&G.fleet){G.fleet.forEach(sh=>{const cid=(sh.id||'').replace(/_.*$/,'');_loadCombatImg('img/combat/ships/'+cid+'.png',_onImgLoad);});}
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
  // 소형 기준: 중형 ×1.5, 대형/전설기함 ×2 → 전체 ×0.8
  if(tier==='신화') return{w:224,h:138,bar:264,label:15,gap:640};
  if(tier==='전설기함') return{w:208,h:124,bar:240,label:14,gap:600};
  if(tier==='대형'||u.id==='BOSS_MAIN') return{w:144,h:88,bar:176,label:12,gap:480};
  if(tier==='중형') return{w:86,h:53,bar:112,label:11,gap:300};
  return{w:54,h:33,bar:70,label:10,gap:210};
}
// 적 함선 크기 — 아군과 동일 비율 적용
function _enemySize(u){
  const nm=u.nm||'',tier=u.tier||'소형';
  // 해적 모선: 현재의 50% 크기
  if(u.id==='BOSS_MAIN'||nm.includes('모선')||nm.includes('우르사')) return{w:252,h:153,bar:324,label:16,gap:700};
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
  // 카탈로그 ID 추출
  const catId=(u.id||'').replace(/_.*$/,'');
  // 적 함선: 타입+티어 기반 이미지 키 (예: CHIX_S.png, PIRATE_M.png)
  let imgSrc;
  if(isEnemy){
    const _tierMap={'소형':'S','중형':'M','대형':'L','전설기함':'L'};
    const tier=_tierMap[u.tier||'소형']||'S';
    const nm=(u.nm||'').toLowerCase();
    // 이름/ID 기반 팩션 판별 (E0, E1 등 일반 적도 치크스로 처리)
    const base=catId.startsWith('BOSS')||u.id==='BOSS_MAIN'?'BOSS':
               catId.startsWith('CHIX')||/^E\d/.test(catId)?'CHIX':'PIRATE';
    imgSrc='img/combat/enemies/'+base+'_'+tier+'.png';
  } else {
    const cid=(u.catalogId||u.id||'').replace(/_.*$/,'');
    imgSrc='img/combat/ships/'+cid+'.png';
  }
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
}
// ═══ 누락 함수 복구 패치 ════════════════════════════════════════════

// ── 전투 상태 변수 ────────────────────────────────────────────────
let _cbEffects=[];  // [{type,...}] beam / exp / shard / shockwave / muzzle
let _unitPos={};    // {unitId: {x,y}}
let _cbAnimReq=null;

// 이펙트가 살아있는 동안만 60fps 루프로 캔버스 재그리기.
// drawCombatFrame은 호출될 때마다 life 1씩 감소시키므로, 루프가 돌아야 effects가 자연스럽게 사라짐.
function _cbStartAnimLoop(){
  if(_cbAnimReq)return; // 이미 루프 중
  const tick=()=>{
    if(!cbCtx||!cbCV){_cbAnimReq=null;return;}
    drawCombatFrame();
    if((_cbEffects||[]).length>0){
      _cbAnimReq=requestAnimationFrame(tick);
    } else {
      _cbAnimReq=null;
    }
  };
  _cbAnimReq=requestAnimationFrame(tick);
}

// 빔/폭발/파편 한 세트를 한 번에 push (격침 여부에 따라 강도 조절)
function _cbAddBeamAndHit(a1,a2,beamCol,isDead){
  // 1) 머즐 플래시 (발사 위치에서 짧고 강한 섬광)
  _cbEffects.push({type:'muzzle',x:a1.x,y:a1.y,col:beamCol,r:8,life:8,maxLife:8});
  // 2) 레이저 빔 (천천히 페이드 — life 18프레임 ≈ 0.3초)
  _cbEffects.push({type:'beam',x1:a1.x,y1:a1.y,x2:a2.x,y2:a2.y,col:beamCol,life:18,maxLife:18});
  // 3) 피격 폭발
  const expCol=isDead?'#ff3300':'#ff7755';
  const expR=isDead?28:16;
  _cbEffects.push({type:'exp',x:a2.x,y:a2.y,col:expCol,r:expR,life:isDead?36:24,maxLife:isDead?36:24});
  if(isDead){
    // 4) 격침 시: 충격파 링 + 흰 코어 + 파편 8개
    _cbEffects.push({type:'shockwave',x:a2.x,y:a2.y,col:'#ffaa44',r:50,life:30,maxLife:30});
    _cbEffects.push({type:'exp',x:a2.x,y:a2.y,col:'#ffffff',r:14,life:14,maxLife:14});
    for(let i=0;i<8;i++){
      const ang=(Math.PI*2*i)/8 + Math.random()*0.3;
      _cbEffects.push({type:'shard',x:a2.x,y:a2.y,vx:Math.cos(ang)*3.5,vy:Math.sin(ang)*3.5,col:'#ffcc66',life:40,maxLife:40});
    }
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

// ── 사운드 알림 ─────────────────────────────────────────────────
function sfxAlert(){
  try{
    const ctx=new(window.AudioContext||window.webkitAudioContext)();
    const osc=ctx.createOscillator();const gain=ctx.createGain();
    osc.connect(gain);gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(440,ctx.currentTime);
    osc.frequency.setValueAtTime(660,ctx.currentTime+0.1);
    gain.gain.setValueAtTime(0.15,ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.4);
    osc.start(ctx.currentTime);osc.stop(ctx.currentTime+0.4);
  }catch(e){}
}
// 퀘스트 보상 수령 효과음
function sfxCoin(){
  try{
    const ctx=new(window.AudioContext||window.webkitAudioContext)();
    const gain=ctx.createGain();gain.connect(ctx.destination);
    [523,659,784,1047].forEach((f,i)=>{
      const o=ctx.createOscillator();o.connect(gain);
      o.frequency.value=f;
      gain.gain.setValueAtTime(0.12,ctx.currentTime+i*0.08);
      gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+i*0.08+0.18);
      o.start(ctx.currentTime+i*0.08);o.stop(ctx.currentTime+i*0.08+0.18);
    });
  }catch(e){}
}

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
  const allUnits=[...pl,...en];
  // 함선 크기 기준 (가장 큰 함선 기준으로 간격 결정)
  const _allPsz=pl.map(u=>_shipDrawSize(u));
  const _allEsz=en.map(u=>_enemySize(u));
  const _maxPhH=Math.max(33,..._allPsz.map(s=>s.h));
  const _maxEhH=Math.max(33,..._allEsz.map(s=>s.h));
  // 간격: 함선 높이×2 + 여유, 화면 초과 시 축소 (최소 함선높이+4)
  const vSpaceP=Math.max(_maxPhH+4,Math.min(H*0.9/Math.max(1,pl.length)/z,_maxPhH*2+12));
  const vSpaceE=Math.max(_maxEhH+4,Math.min(H*0.9/Math.max(1,en.length)/z,_maxEhH*2+12));
  const pBaseY=-((pl.length-1)*vSpaceP)/2;
  const eBaseY=-((en.length-1)*vSpaceE)/2;
  // 기준 X: 화면 35% 지점
  const pXbase=-W*0.33/z, eXbase=W*0.33/z;
  // 지그재그 오프셋 (짝수/홀수 열 교대, 플레이어는 오른쪽/왼쪽, 적은 반대)
  const zigAmt=Math.min(30,vSpaceP*0.25);

  // 플레이어 함선 (지그재그)
  pl.forEach((u,i)=>{
    const xOff=i%2===0?0:-zigAmt;
    const x=pXbase+xOff, y=pBaseY+i*vSpaceP;
    _unitPos[u.id||('P'+i)]={x:x+W/2/z+ox/z,y:y+H/2/z+oy/z};
    _drawShipUnit(cbCtx,u,x,y,null);
    _drawHealthBar(cbCtx,u,x,y,_shipDrawSize(u),false);
  });
  // 적 함선 (지그재그 반대)
  en.forEach((u,i)=>{
    const xOff=i%2===0?0:zigAmt;
    const x=eXbase+xOff, y=eBaseY+i*vSpaceE;
    _unitPos[u.id||('E'+i)]={x:x+W/2/z+ox/z,y:y+H/2/z+oy/z};
    _drawShipUnit(cbCtx,u,x,y,null);
    _drawHealthBar(cbCtx,u,x,y,_enemySize(u),true);
  });
  // 이펙트 렌더링 (beam: 레이저 빔, exp: 폭발, shockwave: 충격파 링, shard: 파편, muzzle: 발사 섬광)
  _cbEffects=(_cbEffects||[]).filter(ef=>{
    ef.life--;
    const a=Math.max(0,ef.life/ef.maxLife);   // 1 → 0 페이드
    const t=1-a;                              // 0 → 1 진행도
    cbCtx.save();
    if(ef.type==='beam'){
      // 외곽 글로우
      cbCtx.globalAlpha=Math.min(1,a*0.9);
      cbCtx.strokeStyle=ef.col;
      cbCtx.lineWidth=6*a;
      cbCtx.shadowColor=ef.col;
      cbCtx.shadowBlur=20*a;
      cbCtx.lineCap='round';
      cbCtx.beginPath();cbCtx.moveTo(ef.x1,ef.y1);cbCtx.lineTo(ef.x2,ef.y2);cbCtx.stroke();
      // 중심 흰 코어
      cbCtx.globalAlpha=Math.min(1,a);
      cbCtx.strokeStyle='#ffffff';
      cbCtx.lineWidth=2*a;
      cbCtx.shadowBlur=0;
      cbCtx.beginPath();cbCtx.moveTo(ef.x1,ef.y1);cbCtx.lineTo(ef.x2,ef.y2);cbCtx.stroke();
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
  const hpR=Math.max(0,u.hp/Math.max(1,u.maxHP));
  ctx.fillStyle=hpR>0.5?'#51cf66':hpR>0.25?'#ffd43b':'#ff6b6b';
  ctx.fillRect(bx,by,bw*hpR,bh);
  ctx.strokeStyle='rgba(255,255,255,.2)';ctx.lineWidth=0.5;ctx.strokeRect(bx,by,bw,bh);
  // SH 바
  if((u.maxSH||0)>0){
    const shy=by+bh+2;const shR=Math.max(0,(u.sh||0)/Math.max(1,u.maxSH));
    ctx.fillStyle='rgba(0,0,0,.5)';ctx.fillRect(bx,shy,bw,4);
    ctx.fillStyle='#339af0';ctx.fillRect(bx,shy,bw*shR,4);
    ctx.strokeStyle='rgba(255,255,255,.2)';ctx.lineWidth=0.5;ctx.strokeRect(bx,shy,bw,4);
  }
  // 이름 라벨
  ctx.fillStyle=u.hp<=0?'rgba(150,150,150,.6)':'rgba(220,220,255,.85)';
  ctx.font=`${sz.label||10}px sans-serif`;
  ctx.textAlign='center';
  ctx.fillText((u.nm||'').substring(0,10),x,by-3);
}

// ── 전투 1턴 처리 ─────────────────────────────────────────────────
function _txPos(pos){
  // _unitPos 저장값을 캔버스 변환 좌표계로 변환
  if(!cbCV)return{x:0,y:0};
  return{x:pos.x-cbCV.width/2-cbOffX, y:pos.y-cbCV.height/2-cbOffY};
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

  // 플레이어 공격
  pl.forEach(p=>{
    if(!en.filter(e=>e.hp>0).length)return;
    const target=en.filter(e=>e.hp>0)[Math.floor(Math.random()*en.filter(e=>e.hp>0).length)];
    const rawDmg=Math.max(1,Math.round((+p.ATT||1)-Math.floor((target.armorTier||0)*1.5)));
    const shDmg=Math.min(target.sh||0,rawDmg);
    const hpDmg=rawDmg-shDmg;
    target.sh=Math.max(0,(target.sh||0)-shDmg);
    target.hp=Math.max(0,(target.hp||target.maxHP)-hpDmg);
    const isDead=target.hp<=0;
    log.push(`🚀 ${p.nm||'아군'} → ${target.nm||'적'}: 실드${shDmg} HP${hpDmg}`+(isDead?' 격침!':''));
    // 레이저 빔 + 피격 폭발 + (격침 시) 충격파/파편
    const ap=_unitPos[p.id||('P'+0)], ep=_unitPos[target.id];
    if(ap&&ep){
      _cbAddBeamAndHit(_txPos(ap),_txPos(ep),'#00f3ff',isDead);
    }
  });
  // 적 공격
  en.filter(e=>e.hp>0).forEach(e=>{
    if(!pl.filter(p=>p.hp>0).length)return;
    const target=pl.filter(p=>p.hp>0)[Math.floor(Math.random()*pl.filter(p=>p.hp>0).length)];
    const armorRed=Math.floor((target.armorTier||0)*1.5);
    const rawDmg=Math.max(1,Math.round((+e.ATT||1)-armorRed));
    const shDmg=Math.min(target.sh||0,rawDmg);
    const hpDmg=rawDmg-shDmg;
    target.sh=Math.max(0,(target.sh||0)-shDmg);
    target.hp=Math.max(0,target.hp-hpDmg);
    // G.fleet 반영
    const gs=G.fleet.find(s=>s.id===target.id);
    if(gs){gs.hp=target.hp;gs.sh=target.sh;}
    const isDead=target.hp<=0;
    log.push(`💥 ${e.nm||'적'} → ${target.nm||'아군'}: 실드${shDmg} HP${hpDmg}`+(isDead?' 격파!':''));
    // 적 레이저 빔 + 피격 이펙트
    const ap=_unitPos[e.id], ep=_unitPos[target.id];
    if(ap&&ep){
      _cbAddBeamAndHit(_txPos(ap),_txPos(ep),'#cc44ff',isDead);
    }
  });
  log.forEach(m=>addCombatLog(m,''));

  const stillAliveEn=combatState.enemies.filter(u=>u.hp>0).length;
  const stillAlivePl=combatState.players.filter(u=>u.hp>0).length;
  drawCombatFrame();
  const stEl=document.getElementById('cb-status');
  if(stEl)stEl.textContent=`아군 ${stillAlivePl}/${combatState.players.length} | 적 ${stillAliveEn}/${combatState.enemies.length}`;
  if(!stillAliveEn||!stillAlivePl){
    setTimeout(function(){if(combatState&&!combatState.done)_finishCombat();},800);
  } else {
    // 최대 50턴 제한 (무한 루프 방지)
    if(combatState.turn>=50){
      addCombatLog('⏱️ 50턴 초과 — 강제 종료 (승리 처리)','gold');
      combatState.enemies.forEach(e=>{e.hp=0;});
      setTimeout(function(){if(combatState&&!combatState.done)_finishCombat();},800);
    } else {
      setTimeout(runCombatTurn,700);
    }
  }
}

function _finishCombat(){
  if(!combatState)return;
  combatState.done=true;
  const win=combatState.enemies.filter(u=>u.hp>0).length===0;
  const pid=combatState._planetId||G.currentPlanet;
  const pd=combatState.planetDef||{};
  if(win){
    addCombatLog('🎉 전투 승리!','ok');
    G.combatHistory.push({pid,turn:combatState.turn,win:true});
    if(pd.hostile&&!combatState.isBoss){G.planets[pid]=G.planets[pid]||{};G.planets[pid].hostile_cleared=true;}
    const reward=Math.round((1000+G.turn*50)*getDiffMult());
    G.credits+=reward;
    addCombatLog(`💰 보상 ₡${reward.toLocaleString()}`,'gold');
    // 해적 격파 시 pirateKills + 허브 진행도 증가
    if(combatState.isPirate||combatState._isChixFleet){
      if(!G.pirateKills)G.pirateKills=0;
      G.pirateKills++;
      changeReputation(1);
      addHubProgress(pid);
      addCombatLog(`🏴‍☠️ 해적 격파! 명성+1 / 허브 진행 ${getPlanetHubProgress(pid)}/15`,'gold');
    }
    if(combatState.isBoss){addCombatLog('🏆 우르사 메이저 제압! 게임 클리어!','gold');notify('🏆 최종 보스 격파! 게임 클리어!','gold');}
    else{notify('⚔️ 전투 승리!','ok');}
    checkQuestCombatDone();
  } else {
    addCombatLog('💀 전투 패배...','err');
    G.combatHistory.push({pid,turn:combatState.turn,win:false});
    const penalty=Math.floor(G.credits*0.1);
    G.credits=Math.max(100,G.credits-penalty);
    addCombatLog(`💸 크레딧 패널티 -₡${penalty.toLocaleString()}`,'err');
    notify('💀 전투 패배. 크레딧 -10%','err');
  }
  G.fleet.forEach(s=>{const cs=combatState.players.find(p=>p.id===s.id);if(cs){s.hp=Math.max(1,cs.hp);}});
  updateHUD();saveGame(true);
  // 퀘스트 전투 완료 시 퀘스트 탭으로 이동, 그 외 메인으로
  const _hasQDone=(G.quests[G.currentPlanet]||[]).some(function(q){return q.status==='done';});
  setTimeout(()=>{combatState=null;hubTab(_hasQDone?'quest':'main');},1800);
}

// ── 이순신 일점사 전술 ──────────────────────────────────────────
function activateSunsinFocus(){
  if(!combatState||combatState._sunsinUsed||combatState.done)return;
  const target=combatState.enemies.filter(e=>e.hp>0)[0];
  if(!target)return;
  combatState._sunsinUsed=true;
  target.hp=0;target.sh=0;
  addCombatLog(`⚔️ 이순신 일점사! ${target.nm} 즉시 격침!`,'gold');
  notify('⚔️ 이순신 일점사 발동!','gold');
  const sbtn=document.getElementById('cb-sunsin-btn');
  if(sbtn)sbtn.disabled=true;
  drawCombatFrame();
  const stillAliveEn=combatState.enemies.filter(u=>u.hp>0).length;
  if(!stillAliveEn)setTimeout(_finishCombat,600);
}

// ── 저장 / 불러오기 ──────────────────────────────────────────────
const SAVE_KEY='de_save';
// ══════════════════════════════════════════════════════════════════
// 6슬롯 저장/불러오기 시스템
// ══════════════════════════════════════════════════════════════════
const SAVE_SLOTS=6;
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

// 슬롯에 저장
function saveGame(silent,slotN){
  const n=(slotN!=null)?slotN:1;
  try{
    const snap=JSON.parse(JSON.stringify(G));
    snap._ver=2;snap._saved=Date.now();snap._slotN=n;
    localStorage.setItem(_slotKey(n),JSON.stringify(snap));
    if(!silent)notify('💾 슬롯 '+n+' 저장 완료','ok');
  }catch(e){if(!silent)notify('저장 실패: '+e.message,'err');}
}

// 슬롯에서 불러오기
function loadGame(slotN){
  const n=(slotN!=null)?slotN:1;
  try{
    // 슬롯 n 우선, 없으면 레거시 슬롯0 시도
    let snap=_getSlotInfo(n);
    if(!snap&&n===1)snap=_getSlotInfo(0); // 레거시 호환
    if(!snap){notify('슬롯 '+n+' 에 저장 데이터가 없습니다','err');return false;}
    Object.assign(G,snap);
    // 필수 필드 보완
    if(!G.mapPositions||!Object.keys(G.mapPositions).length){G.mapPositions=generateGalaxy(1000);G.mapConns=buildConnections(G.mapPositions);}
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
  const slotEmoji=['','🥇','🥈','🥉','4️⃣','5️⃣','6️⃣'][n]||'💾';
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
    <div style="margin-bottom:8px"><b>기획 · 개발</b><br>이완구 (TOY LEE)</div>
    <hr style="border-color:var(--bdr);margin:12px 0">
    <div style="margin-bottom:8px"><b>파츠 제작자</b><br>
      정약용 · 최무선 · 알렉스틸 · 뷀란트 · 마사무네<br>
      나대용 · 파스파토크 · 제리다지리 · 이휘소 박사
    </div>
    <hr style="border-color:var(--bdr);margin:12px 0">
    <div style="margin-bottom:8px"><b>함선 설계자</b><br>프레드릭 채프먼 · 기타 우주 조선 장인들</div>
    <hr style="border-color:var(--bdr);margin:12px 0">
    <div style="color:var(--dim);font-size:13px">이 게임은 단일 HTML 파일로 제작되었습니다.<br>별도 서버 없이 브라우저에서 실행됩니다.</div>
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
  const html=`<div style="text-align:center;padding:12px">
    <div style="font-size:32px;margin-bottom:12px">📬</div>
    <div style="margin-bottom:16px">게임에 대한 의견이나 버그 제보는<br>아래 이메일로 보내주세요.</div>
    <div style="background:rgba(255,255,255,.08);border-radius:6px;padding:10px;font-family:monospace;font-size:15px;color:var(--cyan)">toy80318@gmail.com</div>
  </div>`;
  openModal('📬 피드백',html,[{txt:'닫기',fn:closeModal,cls:'btn-sm'}]);
}

// ── 설정 모달 ────────────────────────────────────────────────────
function showSettingsModal(){
  const html=`<div style="padding:4px 0">
    <div style="margin-bottom:16px">
      <div style="font-weight:bold;margin-bottom:8px">🎮 난이도</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${['easy','normal','hard','extreme'].map(d=>`<button class="btn btn-sm" onclick="G.difficulty='${d}';notify('난이도: ${d}','ok');" style="flex:1">${{easy:'😊 쉬움',normal:'⚔️ 보통',hard:'💀 어려움',extreme:'☠️ 극악'}[d]}</button>`).join('')}
      </div>
    </div>
    <div style="margin-bottom:16px">
      <div style="font-weight:bold;margin-bottom:8px">💾 데이터 관리</div>
      <button class="btn btn-sm" style="width:100%;margin-bottom:8px" onclick="saveGame(false)">💾 지금 저장</button>
      <button class="btn btn-sm btn-red" style="width:100%" onclick="if(confirm('모든 저장 데이터를 삭제합니다. 계속하시겠습니까?')){localStorage.removeItem('de_save');notify('저장 데이터 삭제 완료','ok');closeModal();}">🗑️ 저장 데이터 삭제</button>
    </div>
  </div>`;
  openModal('⚙️ 설정',html,[{txt:'닫기',fn:closeModal,cls:'btn-sm'}],{wide:true});
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
    [{txt:'⚔️ 전투 돌입!',fn:()=>{G.voidCrystal--;closeModal();startCombat({id:'BOSS',nm:'우르사 메이저',ring:5});},cls:'btn-red'},
     {txt:'취소',fn:closeModal,cls:'btn-sm'}]);
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
}

// ── 타이틀 난이도 버튼 ─────────────────────────────────────────



// ── 게임 시작 (DOM 파싱 완료 후 즉시 실행) ─────────────────────
runLoading();
