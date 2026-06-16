
// ═══ DESTINATION EARTH v1.1 ════════════════════════════════════
// 빌드: 2026-05-20 | 파일 버전 확인용
// ⚠️ _GAME_VER는 index.html(<head>)에서 먼저 설정한다(이미지 캐시 버스터의 단일 소스).
//    여기서는 game.js 단독 로드 대비용 fallback만 둔다 — index.html 값을 덮어쓰지 말 것.
window._GAME_VER=window._GAME_VER||'20260531.plaza_arrival';
// ── 모바일 LOD: viewport <=820px 또는 모바일 UA → img/<dir>/m/<file> 자동 사용 ──
// 모든 이미지 helper 가 _mobileLod() 를 거쳐 모바일에서는 ~10% 크기의 사본을 로드 (총 22MB → 2MB)
window.IS_MOBILE=(function(){
  try{
    if(window.desktopAPI)return false; // Electron PC 빌드: 항상 PC 모드(고해상도)
    const ua=navigator.userAgent||'';
    const mobileUA=/Mobi|Android|iPhone|iPad|iPod|IEMobile|Opera Mini|Mobile/i.test(ua);
    const narrow=Math.min(window.innerWidth||9999,window.screen?.width||9999)<=820;
    return mobileUA||narrow;
  }catch(e){return false;}
})();
// _mobileLod: img/<dir>/<file>.png[?ver] → img/<dir>/m/<file>.png[?ver] (모바일일 때만)
//   외부 URL, m/ 이미 포함, 비정상 경로는 그대로 반환
// m/ 사본이 실제로 생성된 디렉토리에만 LOD 적용 (gen_mobile_lod.js TARGETS와 일치).
// bg/planets/hub/ui 등은 m/ 사본이 없으므로 원본 경로를 그대로 둬야 모바일에서 이미지가 깨지지 않는다.
window._MOBILE_LOD_DIRS=['img/ships','img/chars','img/parts','img/combat/ships','img/combat/enemies','img/quests','img/commodities'];
window._mobileLod=function(src){
  if(!window.IS_MOBILE||!src||typeof src!=='string')return src;
  if(/^https?:/i.test(src)||src.indexOf('/m/')>=0)return src;
  return src.replace(/^(img\/[^?#]+?)\/([^/?#]+\.(?:png|jpg|jpeg|webp))(\?[^#]*)?$/i,
    function(m,dir,fname,q){return window._MOBILE_LOD_DIRS.indexOf(dir)>=0 ? dir+'/m/'+fname+(q||'') : m;});
};
let _lastDismissedCrew=null; // 되돌리기용 마지막 내보낸 크루
// 전역 미처리 오류 캐처 — 화면 멈춤 방지
window.onerror=function(msg,src,line,col,err){
  console.error('[GLOBAL ERROR]',msg,'at line',line,err);
  try{notify(I18N.t('notify.errorPrefix',{msg:msg.substring(0,60)}),'err');}catch(e){}
  return false; // 기본 오류 동작 유지
};
window.addEventListener('unhandledrejection',function(e){
  console.error('[PROMISE ERROR]',e.reason);
});
// ═══ 공통 헬퍼 (중복 제거 · 단일 소스) ═══════════════════════════
//   여러 모듈에 흩어져 있던 동일 인라인 로직을 한 곳에 모은다.
//   ⚠️ 동작은 기존 인라인 구현과 100% 동일(순수 리팩터링 — 밸런스/로직 변경 아님).
//   game.js가 일부 모듈보다 늦게 로드돼도 호출은 전부 런타임이라 안전.
function clamp(v,min,max){return Math.max(min,Math.min(max,v));}                                       // 범위 제한 [min,max]
function sumQtyById(arr,id){return (arr||[]).filter(x=>x&&x.id===id).reduce((s,x)=>s+(x.qty||0),0);} // id 일치 항목 qty 합산
function stringToSeed(str){return String(str||'').split('').reduce((a,c)=>a+c.charCodeAt(0),0);}      // 문자열→결정론적 시드
function clampCargoSlots(slots,bonus){return Math.min(100,(slots||4)+(bonus||0));}                    // 화물칸 100 상한 클램프
function getTotalCargoQty(){return (G.cargo||[]).reduce((s,c)=>s+(c.qty||0),0);}                      // 현재 적재 화물 총량
try{if(typeof window!=='undefined'){window.clamp=clamp;window.sumQtyById=sumQtyById;window.stringToSeed=stringToSeed;window.clampCargoSlots=clampCargoSlots;window.getTotalCargoQty=getTotalCargoQty;}}catch(e){}
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
// bugfix 2026-06-11: G가 const(전역 렉시컬)라 window.G가 undefined —
//   window.G를 참조하는 분할 모듈들(story-quest-engine: 스토리/백구 퀘스트 spawn,
//   shakedown-popup: 통행료 지불 팝업 등)이 전부 무력화되던 문제 수정.
//   G는 const로 객체 자체가 재할당되지 않고 내부만 변이되므로 참조 1회 노출로 충분.
try{if(typeof window!=='undefined')window.G=G;}catch(e){}

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
// ─── 거래 시스템 (상점 재고 생성) → js/modules/render-trade-tab.js 로 분할 (Phase B3, 2026-06-10) ───
//   generateShopStock + _restockMissingParts + _restockCommodities 모두 window 전역 노출
function initGame(){
  G.planets={};
  PLANET_DEF.forEach(p=>{G.planets[p.id]={fog:p.unlock?(p.start?'A':'S'):'L',owned:false,commerce:0};});
  G.fleet=[{id:'S01_main',nm:G.profile.ship||'머스탱',tier:'소형',maxHP:100,hp:100,maxSH:50,sh:50,ATT:20,INT:15,TEC:18,HP:100,LOY:80,parts:[],crewIds:[],cargoSlots:4}];
  G.crew=[];G.heroes=[];G.cargo=[];G.inventory=[];G.materials={};G.blueprints={};G.combatHistory=[];G.quests={};G.loan=0;G.reputation=0;G.pirateKills=0;G.pirateAppearances=0;G.lastPirateTurn=-999;G.auctionBids=0;G.auctionBidTurn=-1;G.chixWaves=0;G.lastChixTurn=-999;G.hallOfFame=G.hallOfFame||[];
  // 사용자 보고 2026-06-09: 새 게임 시작해도 컷씬 안 나오는 결정적 원인 —
  //   이전 플레이에서 G._phasedIntroSeen 마킹된 상태가 메모리에 잔존.
  //   initGame 은 새 게임이므로 컷씬/씬 마킹을 명시적으로 초기화해야 함.
  G._phasedIntroSeen={};
  G._scenesSeen={};
  G._phasedIntroSeenV2=false;
  G._gameStartedAt=Date.now();
  G.turn=0;G.act=1;G.currentPlanet='P01';G.gachaPity=0;G.stayTurns=0;
  G.credits=50000;G.voidEssence=0;G.voidCrystal=3;
  G.shopStock={};
  G.mapPositions=generateGalaxy(1000);G.mapConns=buildConnections(G.mapPositions);
  generateShopStock('P01');
  // 시작 행성 P01(프록시마b·수퍼비아 F01): 광장(1회)·도크(2회) 이미 해금 상태로 시작 (프론트 1회 남음)
  G.planets['P01'].hubProg=2;
  // 튜토리얼 편의: P02(센타우리 에코 c·수퍼비아 F01) 광장(상점·주점·제독) 1회 해금 — 첫 이동 시 즉시 거래/판매 가능
  if(G.planets['P02'])G.planets['P02'].hubProg=Math.max(G.planets['P02'].hubProg||0,1);
}

// ═══ SCREENS ════════════════════════════════════════════════════
const SCREENS=['s-loading','s-title','s-agegate','s-ftue','s-prologue','s-hub'];
function toggleBaekgu(){/* 항상 표시 — 토글 비활성화 */}

// 함대 바 갱신 (모든 허브 탭에서 하단 바에 함대 카드 표시)
function updateFleetBar(){
  const el=document.getElementById('bk-fleet');if(!el)return;
  // 헤더의 함대 수 카운트 (접힘 상태에서도 보임)
  const _cntEl=document.getElementById('bk-fleet-count');
  if(_cntEl)_cntEl.textContent=(G&&G.fleet&&G.fleet.length)?I18N.t('ui.fleetCount',{n:G.fleet.length}):'';
  if(!G||!G.fleet||!G.fleet.length){el.innerHTML=`<span style="color:var(--dim);font-size:12px">${I18N.t('ui.shipNoneSpan')}</span>`;return;}
  const cards=G.fleet.map((s,i)=>{
    const st=getShipStats(s);
    const hpPct=clamp(Math.round(s.hp/Math.max(1,st.HP)*100),0,100);
    const shPct=clamp(Math.round((s.sh||0)/Math.max(1,st.maxSH)*100),0,100);
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
          <div style="color:${fc};font-size:11px;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${isFlagship?'⚑ ':''}${shipDisplayNm(s)||I18N.t('ui.shipDefault2')}</div>
          <div style="color:var(--muted);font-size:10px">${I18N.tier(s.tier)}</div>
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
      <div style="min-width:0"><div style="font-size:11px;color:${RC2[c.rarity]||'#888'};font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${crewDisplayNm(c)}</div><div style="font-size:9px;color:var(--dim)">${c.cl}</div></div>
    </div>`;
  }).join(''):`<div style="color:var(--dim);font-size:12px;grid-column:span 2">${I18N.t('ui.noCrewAboard')}</div>`;
  // 파츠
  const parts=s.parts||[];
  const catIcMap={weapon:'⚔️',missile:'🚀',shield:'🛡️',armor:'🛡',engine:'⚡'};
  const catColMap={weapon:'var(--red)',missile:'#ff8844',shield:'var(--blue)',armor:'var(--gold)',engine:'var(--cyan)'};
  const partsHtml=parts.length>0?parts.map(pid2=>{
    const p2=PARTS.find(x=>x.id===pid2);if(!p2)return'';
    const ci=catIcMap[p2.cat]||'⚙️';const cc=catColMap[p2.cat]||'var(--dim)';
    return`<div style="display:flex;align-items:center;gap:4px;padding:3px 6px;background:rgba(0,0,0,.4);border-radius:4px;border:1px solid rgba(255,255,255,.08);min-width:0">
      <span style="font-size:14px;flex-shrink:0">${ci}</span>
      <div style="font-size:11px;color:${cc};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${partDisplayNm(p2)}</div>
    </div>`;
  }).join(''):`<div style="color:var(--dim);font-size:12px;grid-column:span 2">${I18N.t('ui.noPartsEquipped')}</div>`;
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
        <div style="font-size:19px;font-weight:bold;color:${fc};margin-bottom:2px">${isFlagship?I18N.t('ui.flagshipPrefix'):''}${(typeof shipDisplayNm==="function"?shipDisplayNm(s):s.nm)}</div>
        <div style="font-size:12px;color:var(--dim);margin-bottom:6px;display:flex;gap:8px;align-items:center">
          <span>${I18N.tier(s.tier)}</span>
          ${(()=>{
            // 사용자 요청 2026-06-09: 함선 특성화(역할) 배지
            const _role=_getShipRole(s);
            if(_role==='mythic')return '';
            const _roleStyle={
              defense:   {ic:'🛡️', col:'#66b3ff', lbl:I18N.t('ship.role.defense')||'방어형',  desc:I18N.t('ship.role.defenseDesc')||'쉴드·INT 강화'},
              attack:    {ic:'⚔️', col:'#ff7777', lbl:I18N.t('ship.role.attack')||'공격형',   desc:I18N.t('ship.role.attackDesc')||'ATT·엔진 강화'},
              transport: {ic:'📦', col:'#ffd166', lbl:I18N.t('ship.role.transport')||'수송형', desc:I18N.t('ship.role.transportDesc')||'HP·화물·크루 강화'},
              versatile: {ic:'⚖️', col:'#88ddaa', lbl:I18N.t('ship.role.versatile')||'만능형', desc:I18N.t('ship.role.versatileDesc')||'전 능력치 균형 +10%'}
            }[_role];
            if(!_roleStyle)return '';
            return `<span style="display:inline-flex;align-items:center;gap:4px;padding:1px 8px;border:1px solid ${_roleStyle.col}88;border-radius:10px;background:${_roleStyle.col}15;color:${_roleStyle.col};font-weight:bold;font-size:11px" title="${_roleStyle.desc}">${_roleStyle.ic} ${_roleStyle.lbl}</span>`;
          })()}
        </div>
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
        <div style="font-size:13px;color:var(--cyan);font-weight:bold;margin-bottom:6px">${I18N.t('ui.crewCountHeader',{n:crewIds.length,max:getMaxCrew(s)})}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">${crewHtml}</div>
      </div>
      <div>
        <div style="font-size:13px;color:var(--gold);font-weight:bold;margin-bottom:6px">${I18N.t('ui.equippedPartsHeader',{n:parts.length})}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">${partsHtml}</div>
      </div>
    </div>

    <!-- 액션 패널: 3 그룹 (장비 / 함선 / 수리) -->
    <div style="display:flex;flex-direction:column;gap:8px">
      <div style="${groupStyle}">
        <div style="${groupTitleStyle}"><span>⚙️</span><span>${I18N.t('ui.equipment')}</span></div>
        <div style="${btnRowStyle}">
          <button class="btn btn-sm" style="border-color:var(--gold);color:var(--gold)" onclick="pickPartModal(${idx})">${I18N.t('ui.partsEquipBtn')}</button>
          <button class="btn btn-sm" style="border-color:var(--cyan);color:var(--cyan)" onclick="pickCrewModal(${idx})">${I18N.t('ui.crewAssign')}</button>
          ${crewIds.length>0?`<button class="btn btn-sm" style="border-color:#f88;color:#f88" onclick="unassignCrewModal(${idx},0)">${I18N.t('ui.crewReleaseBtn')}</button>`:''}
        </div>
      </div>
      <div style="${groupStyle}">
        <div style="${groupTitleStyle}"><span>🚀</span><span>${I18N.t('ui.shipLabelShort')}</span></div>
        <div style="${btnRowStyle}">
          ${isFlagship
            ? `<span style="font-size:12px;color:var(--gold);padding:5px 9px;border:1px solid rgba(212,175,55,.4);border-radius:5px">${I18N.t('hud.flagshipCurrent')}</span>`
            : `<button class="btn btn-sm" style="border-color:var(--gold);color:var(--gold);font-weight:bold;background:rgba(212,175,55,.12)" onclick="setAsFlagship(${idx})">${I18N.t('ui.flagshipSetBtn')}</button>`}
        </div>
      </div>
      <div style="${groupStyle}">
        <div style="${groupTitleStyle}"><span>🔧</span><span>${I18N.t('ui.repair')}</span><span style="margin-left:auto;font-size:10px;color:var(--muted);text-transform:none;letter-spacing:0;font-weight:normal">${I18N.t('ui.creditsHeld',{cr:G.credits.toLocaleString()})}</span></div>
        <div style="${btnRowStyle}">
          ${rc>0
            ? `<button class="btn btn-sm btn-green" onclick="repairShipModal(${idx},'hp')" ${G.credits>=rc?'':'disabled'}>${I18N.t('ui.hpRepair',{cost:rc.toLocaleString()})}</button>`
            : `<span style="font-size:12px;color:var(--green);padding:5px 9px;border:1px solid rgba(46,204,113,.3);border-radius:5px">${I18N.t('ui.hpMaxBadge')}</span>`}
          ${shMax>0&&(s.sh||0)<shMax&&sc>0
            ? `<button class="btn btn-sm" style="border-color:var(--blue);color:var(--blue)" onclick="repairShipModal(${idx},'sh')" ${G.credits>=sc?'':'disabled'}>${I18N.t('ui.shieldRepairBtn',{cost:sc.toLocaleString()})}</button>`
            : (shMax>0?`<span style="font-size:12px;color:var(--cyan);padding:5px 9px;border:1px solid rgba(0,243,255,.3);border-radius:5px">${I18N.t('hud.shieldMax')}</span>`:'')}
          ${(rc+sc)>0
            ? `<button class="btn btn-sm btn-gold" onclick="repairShipFullModal(${idx})" ${G.credits>=(rc+sc)?'':'disabled'}>${I18N.t('ui.fullRepairBtn',{cost:(rc+sc).toLocaleString()})}</button>`
            : ''}
          <button class="btn btn-sm" onclick="closeModal();hubTab('garage')" style="margin-left:auto;opacity:.7">${I18N.t('ui.garageBtn')}</button>
        </div>
      </div>
    </div>
  </div>`;
  openModal(`${isFlagship?'⚑ ':tierIc+' '}${(typeof shipDisplayNm==="function"?shipDisplayNm(s):s.nm)}`,modalContent,[{txt:I18N.t('btn.close'),fn:closeModal,cls:'btn-sm'}]);
}

// ─── 기함 설정 ────────────────────────────────────────────────
function setAsFlagship(idx){
  if(idx===0||idx>=G.fleet.length)return;
  const tmp=G.fleet[idx];
  G.fleet.splice(idx,1);
  G.fleet.unshift(tmp);
  updateHUD();updateFleetBar();
  notify(I18N.t('notify.flagshipSetTmp',{nm:shipDisplayNm(tmp)}),'gold');
  baekgu(I18N.t('baekgu.flagshipPromoted',{nm:shipDisplayNm(tmp)}));
  saveGame(true);
  showShipDetailModal(0); // 기함 위치(0)로 팝업 갱신
}
// ─── 백구 패널 접기 토글 + 상태 복원 ───────────────────────────────
// (분리/플로팅 모드는 UI 깨짐으로 제거. 옛 mousedown/move/up 리스너 IIFE 전체 삭제 —
//  floating이 항상 false라 dead code였고 매 mouse 이벤트마다 DOM 쿼리만 발생시켰음)
(function(){
  // 옛 호출자 호환용 no-op
  window.bkToggleFloat=function(){/* deprecated */};
  window._bkSetFloating=function(){/* deprecated — 항상 false */};
  // 백구 창 접기 토글
  window.bkToggleCollapse=function(){
    const d=document.getElementById('bkdialog');if(!d)return;
    const collapsed=d.classList.toggle('bk-collapsed');
    try{localStorage.setItem('de_bk_collapsed',collapsed?'1':'0');}catch(e){}
  };
  // 옛 floating 저장 상태 정리 (마이그레이션)
  try{
    const saved=JSON.parse(localStorage.getItem('bk_panel_state')||'{}');
    if(saved.floating)localStorage.removeItem('bk_panel_state');
  }catch(e){}
  // collapse 상태 복원
  try{
    if(localStorage.getItem('de_bk_collapsed')==='1'){
      document.addEventListener('DOMContentLoaded',function(){
        const d=document.getElementById('bkdialog');if(d)d.classList.add('bk-collapsed');
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
// PC: 1536×864 (16:9), 모바일: 1500×750 (16:8 = 2:1) — 사용자 명세
//  · 모바일에서 무대 높이를 줄여 회전 시 폰 화면에 더 꽉 차게 (스케일 ≈0.52)
//  · 모바일 감지: pointer:coarse OR 작은 뷰포트(<=768) OR isPortrait
const STAGE_W_PC=1536,STAGE_H_PC=864;
const STAGE_W_MOBILE=1500,STAGE_H_MOBILE=750;
// 호환성: 기존 STAGE_W/STAGE_H 참조는 PC 기준값 유지 (별 배경 캔버스 등 정적 참조)
const STAGE_W=STAGE_W_PC,STAGE_H=STAGE_H_PC;
function _isMobileFit(){
  try{
    if(window.matchMedia&&window.matchMedia('(pointer:coarse)').matches)return true;
  }catch(e){}
  return (window.innerWidth<=768)||(window.innerHeight<=768);
}
window._gsScale=1;
window._gsRotated=false;
// 디스플레이 모드 — auto / hd(1280×720) / fhd(1920×1080) / qhd(2560×1440) / mobile
window._displayMode='auto';
try{const _dm=localStorage.getItem('de_display_mode');if(_dm)window._displayMode=_dm;}catch(e){}
function setDisplayMode(mode){
  if(!['auto','hd','fhd','qhd','mobile'].includes(mode))mode='auto';
  window._displayMode=mode;
  try{localStorage.setItem('de_display_mode',mode);}catch(e){}
  fitGameStage();
}
try{if(typeof window!=='undefined')window.setDisplayMode=setDisplayMode;}catch(e){}
function fitGameStage(){
  const vw=window.innerWidth,vh=window.innerHeight;
  const mode=window._displayMode||'auto';
  const isPortrait=vh>vw;
  const stage=document.getElementById('game-stage');
  if(!stage){window.addEventListener('DOMContentLoaded',fitGameStage,{once:true});return;}
  // 무대 크기: 모바일 1500×750(16:8), PC 1536×864(16:9)
  const isMobile=_isMobileFit();
  const SW=isMobile?STAGE_W_MOBILE:STAGE_W_PC;
  const SH=isMobile?STAGE_H_MOBILE:STAGE_H_PC;
  // 무대 DOM 크기 동기화 (CSS 디폴트는 PC 기준, 모바일이면 동적 축소)
  stage.style.width=SW+'px';
  stage.style.height=SH+'px';
  // 디스플레이 모드별 최대 스케일 — 폭 캡 (실제 렌더 픽셀 제한)
  let maxScale=Infinity;
  if(mode==='hd')maxScale=1280/SW;
  else if(mode==='fhd')maxScale=1920/SW;
  else if(mode==='qhd')maxScale=2560/SW;
  if(isPortrait){
    const sx=vh/SW;
    const sy=vw/SH;
    let s=Math.min(sx,sy);
    if(mode==='hd'||mode==='fhd'||mode==='qhd')s=Math.min(s,maxScale);
    window._gsScale=s;
    window._gsRotated=true;
    document.documentElement.style.setProperty('--gs',s);
    stage.style.transform=`translate(-50%,-50%) rotate(90deg) scale(${s})`;
    stage.style.transformOrigin='center center';
    stage.style.position='absolute';
    stage.style.left='50%';
    stage.style.top='50%';
    const _vH=SW*s, _vW=SH*s;
    document.body.style.overflow=(_vH>vh||_vW>vw)?'auto':'hidden';
  } else {
    const sx=vw/SW;
    const sy=vh/SH;
    let s=Math.min(sx,sy);
    if(mode==='hd'||mode==='fhd'||mode==='qhd')s=Math.min(s,maxScale);
    window._gsScale=s;
    window._gsRotated=false;
    document.documentElement.style.setProperty('--gs',s);
    stage.style.transform=`scale(${s})`;
    stage.style.transformOrigin='center center';
    stage.style.position='';
    stage.style.left='';
    stage.style.top='';
    const _vW=SW*s, _vH=SH*s;
    document.body.style.overflow=(_vW>vw||_vH>vh)?'auto':'hidden';
  }
}
// 리사이즈 디바운스 — 모바일 URL바 등장/사라짐으로 인한 잦은 리플로우 방지 (UI 떨림)
let _fitDebounce=null;
function _fitGameStageDebounced(){
  if(_fitDebounce)clearTimeout(_fitDebounce);
  _fitDebounce=setTimeout(()=>{_fitDebounce=null;fitGameStage();},120);
}
// 모바일/터치 디바이스 감지 → body에 클래스 추가 (CSS 분기·UX 최적화용)
try{
  if(('ontouchstart' in window)||navigator.maxTouchPoints>0||window.matchMedia('(pointer:coarse)').matches){
    document.documentElement.classList.add('touch-device');
    document.body&&document.body.classList.add('touch-device');
  }
}catch(e){}
fitGameStage();
// 디바운스된 리사이즈 — 모바일 URL바 등장/숨김으로 인한 잦은 fit 호출이 UI를 떨리게 만드는 문제 해결
window.addEventListener('resize',_fitGameStageDebounced);
window.addEventListener('orientationchange',()=>setTimeout(fitGameStage,250));

// ═══ STARS ════════════════════════════════════════════════════
(function(){
  // 별 배경 — 1회만 그리고 RAF 종료. 모바일 누수 부하 원인이던 60fps 무한 루프 제거.
  //  · 별의 깜빡임(twinkle) 효과는 제거되지만 별의 분포·밝기 변주는 유지 (시각적 정체감 보존)
  //  · resize 시에만 다시 그림 — 평소엔 캔버스가 정지된 정적 이미지처럼 동작
  const cv=document.getElementById('star-bg'),ctx=cv.getContext('2d');
  const stars=[];
  for(let i=0;i<180;i++)stars.push({x:Math.random(),y:Math.random(),r:Math.random()*1.4+.3,a:.35+Math.random()*.6});
  function paintOnce(){
    cv.width=STAGE_W;cv.height=STAGE_H;
    ctx.clearRect(0,0,cv.width,cv.height);
    stars.forEach(s=>{
      ctx.fillStyle=`rgba(255,255,255,${s.a})`;
      ctx.beginPath();ctx.arc(s.x*cv.width,s.y*cv.height,s.r,0,Math.PI*2);ctx.fill();
    });
  }
  paintOnce();
  // resize 는 디바운스 처리 — 잦은 호출 방지 (모바일 URL바 등장/숨김)
  let _rTm=null;
  window.addEventListener('resize',()=>{
    if(_rTm)clearTimeout(_rTm);
    _rTm=setTimeout(()=>{_rTm=null;paintOnce();},300);
  });
})();

// ═══ HUD ════════════════════════════════════════════════════
// 진행 중인 전투로 복귀
function resumeCombat(){
  if(!combatState||combatState.done){notify(I18N.t('notify.noActiveCombat'),'warn');_updateResumeBtn();return;}
  // hubTab('combat')에는 렌더 분기가 없으므로 직접 renderCombatView 호출
  G._currentHubTab='combat';
  const body=document.getElementById('hub-body');
  if(!body){notify(I18N.t('notify.hubNotReady'),'err');return;}
  try{
    // ⚠️ 이전 애니메이션 루프 강제 종료 — 2회차+ 복귀 시 _cbStartAnimLoop 가 early-return 되는 문제 픽스
    try{if(_cbAnimReq){cancelAnimationFrame(_cbAnimReq);_cbAnimReq=null;}}catch(e){}
    // 캔버스 참조도 비워서 initCombatCanvas 가 새 element 로 다시 set 하도록 강제
    try{cbCtx=null;cbCV=null;}catch(e){}
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
    notify(I18N.t('combat.returnToScreen'),'ok');
  }catch(e){
    console.error('resumeCombat failed',e);
    notify(I18N.t('notify.combatReturnFail',{err:e.message}),'err');
  }
  _updateResumeBtn();
}
// 전투 복귀 버튼 — HUD 우측 상단 항시 노출. 전투 활성화 시에만 클릭 가능 (사용자 명세)
function _updateResumeBtn(){
  const btn=document.getElementById('h-resume-combat');
  if(!btn)return;
  const hasActiveCombat=!!(combatState&&!combatState.done);
  const onCombatTab=G._currentHubTab==='combat';
  const enabled=hasActiveCombat&&!onCombatTab;
  btn.disabled=!enabled;
  btn.style.opacity=enabled?'1':(hasActiveCombat?'.55':'.35');
  btn.style.animation=enabled?'pulse 1.6s infinite':'none';
  btn.style.boxShadow=enabled?'0 2px 12px rgba(255,80,80,.45)':'0 2px 6px rgba(0,0,0,.3)';
  btn.style.cursor=enabled?'pointer':'not-allowed';
  btn.title=enabled?I18N.t('combat.btnReturnTooltip'):(hasActiveCombat?I18N.t('combat.btnAlreadyOnScreen'):I18N.t('combat.btnNoneInProgress'));
}
function updateHUD(){updateGatherBtn();_updateResumeBtn();
  const pd=PLANET_DEF.find(p=>p.id===G.currentPlanet);
  document.getElementById('h-co').textContent=G.profile.company;
  const _cmdEl=document.getElementById('hub-cmd');if(_cmdEl)_cmdEl.textContent=G.profile.name||I18N.t('ui.commander');
  // 좌측 상단 사령관 아바타 — 성별·진행단계 자동 분기 (백구 → 사령관 단계별 이미지)
  try{
    const _av=document.getElementById('hub-cmd-avatar');
    if(_av&&typeof _commanderPortraitSrc==='function'){
      const _src=_commanderPortraitSrc();
      if(_av.getAttribute('src')!==_src)_av.src=_src;
    }
  }catch(e){}
  document.getElementById('h-pl').textContent=`| ${pd?.nm||G.currentPlanet}`;
  document.getElementById('h-cr').textContent=G.credits.toLocaleString();
  document.getElementById('h-ve').textContent=G.voidEssence.toLocaleString();
  document.getElementById('h-vc').textContent=G.voidCrystal;
  const _repEl=document.getElementById('h-rep');if(_repEl)_repEl.textContent=(G.reputation||0).toLocaleString();
  const _repRk=getRepRank(G.reputation||0),_repRkEl=document.getElementById('h-rep-rank');
  if(_repRkEl){
    // 사용자 요청 2026-06-08: 명성 이모지를 HN01.png 이미지로 일괄 교체
    const _hnVer=window._GAME_VER?'?v='+window._GAME_VER:'';
    _repRkEl.innerHTML=`<img src="img/ui/HN01.png${_hnVer}" alt="HN" style="width:16px;height:16px;object-fit:contain;vertical-align:middle;margin-right:3px;filter:drop-shadow(0 0 4px ${_repRk.col})" onerror="this.outerHTML='${_repRk.ic} '">${_repRk.lb}`;
    _repRkEl.style.color=_repRk.col;_repRkEl.style.borderColor=_repRk.col;
  }
  document.getElementById('h-act').textContent=G.act;
  document.getElementById('h-tn').textContent=G.turn;
  const _lv=calcPlayerLevel(),_rank=getLevelRank(_lv);
  const lvEl=document.getElementById('h-lv'),rkEl=document.getElementById('h-lv-rank');
  if(lvEl){lvEl.textContent=I18N.t('ui.powerHud')+' '+_lv;lvEl.style.color=_rank.col;}
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
    //     + P01 인트로배경 상태 (첫 턴 진행 시 P00→P01 즉시 반영)
    const _introBg=(G.currentPlanet==='P01'&&(G.turn||0)===0&&!G._introBgDone);
    const _key=G.currentPlanet+(G.currentPlanet==='P31'&&_isEarthFree()?'#free':'')+(_introBg?'#intro':'');
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
  el.textContent=msg;
  const container=document.getElementById('notif');
  if(!container)return;
  container.appendChild(el);
  // 최대 5개만 표시 — 초과 시 가장 오래된 것 즉시 제거(빠르게 사라짐). (사용자 요청 2026-06-15)
  while(container.children.length>5)container.removeChild(container.firstChild);
  setTimeout(()=>{el.style.opacity='0';setTimeout(()=>el.remove(),300);},2000);
}
// 사용자 요청 2026-06-09: 설계도 보상 알림에 BP01/BP02 이미지 표시
// 사용: notifyBlueprint('LGD01','LGD01 거북선') → 함선 설계도 (BP01)
//       notifyBlueprint('RB10','RB10 영혼 흡수 매트릭스') → 파츠 설계도 (BP02)
// ─── 제작 시스템 (notifyBlueprint) → js/modules/render-craft-tab.js 로 분할 (Phase B2, 2026-06-10) ───
//   notifyBlueprint 함수 window 전역 노출 — game.js 내부 호출처(3403, 7772, 7793, 11745) 무변경
// ─── 캐릭터 초상/백구 대사 시스템 → js/modules/portrait-baekgu.js 로 분할 (2026-06-16) ───

// ─── 적대 대치 팝업 공용 헤더 (사용자 요청 2026-06-07) ─────────
// 모든 적대 세력 대치 팝업에서 동일한 "사령관 VS 적" 헤더 사용.
// 사양: 캐릭터 192×192, VS 16px, ⚠ 등 부가 표시 없음.
//   opts: {enemyImg: string,                  // 적 이미지 경로 (필수)
//          enemyName: string,                  // 적 이름 (필수)
//          enemyFallback?: string ('☠️'),     // 이미지 로드 실패 시 이모지
//          size?: number (192),                // 캐릭터 한 변 px
//          vsSize?: number (16)                // VS 글자 크기 px
//   }
function _hostileVsHeader(opts){
  const _ver=(typeof window!=='undefined'&&window._GAME_VER)?('?v='+encodeURIComponent(window._GAME_VER)):'';
  const _cmdSrc=(typeof _commanderPortraitSrc==='function')?_commanderPortraitSrc():('img/chars/commander_m1.png'+_ver);
  const _cmdName=(G&&G.profile&&G.profile.name)||(typeof I18N!=='undefined'?I18N.t('ui.commander'):'사령관');
  const sz=opts.size||192;
  const vsSize=opts.vsSize||16;
  const eImg=opts.enemyImg||'';
  const eName=opts.enemyName||'';
  const eFb=opts.enemyFallback||'☠️';
  return '<div style="display:flex;align-items:center;justify-content:center;gap:20px;padding:14px 6px 12px;flex-wrap:nowrap">'
    +'<div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex-shrink:0">'
      +'<div style="width:'+sz+'px;height:'+sz+'px;border-radius:14px;overflow:hidden;border:3px solid var(--cyan);box-shadow:0 0 24px rgba(0,243,255,.5);background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center">'
        +'<img src="'+_cmdSrc+'" alt="commander" style="width:100%;height:100%;object-fit:contain" onerror="this.style.display=\'none\'">'
      +'</div>'
      +'<div style="color:var(--cyan);font-size:13px;font-weight:bold;letter-spacing:1.5px;max-width:'+sz+'px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+_cmdName+'</div>'
    +'</div>'
    +'<div style="font-size:'+vsSize+'px;color:var(--red);font-weight:bold;text-shadow:0 0 8px rgba(255,80,80,.7);letter-spacing:1px;flex-shrink:0">VS</div>'
    +'<div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex-shrink:0">'
      +'<div style="width:'+sz+'px;height:'+sz+'px;border-radius:14px;overflow:hidden;border:3px solid var(--red);box-shadow:0 0 24px rgba(255,80,80,.5);background:rgba(20,0,0,.5);display:flex;align-items:center;justify-content:center">'
        +'<img src="'+eImg+'" alt="enemy" style="width:100%;height:100%;object-fit:contain" onerror="this.outerHTML=\'<div style=&quot;font-size:90px;display:flex;align-items:center;justify-content:center;height:100%&quot;>'+eFb+'</div>\'">'
      +'</div>'
      +'<div style="color:var(--red);font-size:13px;font-weight:bold;letter-spacing:1.5px;max-width:'+sz+'px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+eName+'</div>'
    +'</div>'
  +'</div>';
}
try{if(typeof window!=='undefined')window._hostileVsHeader=_hostileVsHeader;}catch(e){}
// ─── 백구 챗봇/힌트(askBaekgu·randomBaekgu·getBaekguStoryHint) → js/modules/baekgu-chat.js 로 분할 (2026-06-16) ───
// 순간이동 가능 엔진(블링크 E15 / 신화 타키온 ME01 / 세트 테슬라 SE01) 전체 장착 여부
// 각 함선마다 셋 중 하나라도 장착돼 있으면 인정 (상위 엔진은 블링크 대체)
const WARP_ENGINE_IDS=['E15','ME01','SE01'];
function hasBlinkOnAll(){
  if(!G.fleet||G.fleet.length===0)return false;
  return G.fleet.every(s=>(s.parts||[]).some(pid=>WARP_ENGINE_IDS.includes(pid)));
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
    // 보스 인트로 같이 줄바꿈이 어색한 긴 대사 박스 — 폭만 1.1× 확장 (폰트 그대로)
    mbox.classList.toggle('modal-bossfight',!!opts.bossfight);
    // 사용자 요청 (2026-06-06): 크루 영입 전설 등장 팝업 추가 30% 축소
    mbox.classList.toggle('modal-crew-reveal',!!opts.crewReveal);
    // 사용자 요청 2026-06-14: 게임 저장/불러오기 메뉴 — 가로 10%·세로 20% 축소
    mbox.classList.toggle('modal-save-compact',!!opts.compactSave);
    // 사용자 요청 2026-06-15: 보이드 보상 등 — 가로 +50%·세로 -30% (버튼 노출 보장)
    mbox.classList.toggle('modal-reward-wide',!!opts.rewardWide);
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
  const msgs=[I18N.t('loading.msg1'),I18N.t('loading.msg2'),I18N.t('loading.msg3'),I18N.t('loading.msg4'),I18N.t('loading.msg5')];
  let i=0;const iv=setInterval(()=>{i++;fill.style.width=(i*20)+'%';msg.textContent=msgs[Math.min(i-1,msgs.length-1)];
    if(i>=5){clearInterval(iv);setTimeout(()=>{showTitle();if(localStorage.getItem('de_save'))notify(I18N.t('notify.haveSaveData'),'ok');},400);}},400);
}

// ═══ TITLE / AGE / FTUE ═══════════════════════════════════════
// 사용자 보고 2026-06-09: 새 게임 버튼 안 됨 — goAgeGate 함수가 정의되지 않아
// onclick="goAgeGate()" 가 무반응. 함수 복구.
function goAgeGate(){
  try{
    // 연령 게이트 화면으로 이동 (s-agegate). checkAge 가 통과 시 s-ftue 로 진행.
    if(typeof show==='function')show('s-agegate');
    else if(typeof document!=='undefined'){
      // 폴백: show() 가 아직 정의 안 된 극한 상황 — 직접 클래스 조작
      document.querySelectorAll('.scr.on').forEach(function(el){el.classList.remove('on');});
      var t=document.getElementById('s-agegate'); if(t)t.classList.add('on');
    }
  }catch(e){
    console.error('[goAgeGate] failed:',e);
    try{notify('연령 확인 화면 진입 실패: '+e.message,'err');}catch(_){}
  }
}
try{if(typeof window!=='undefined')window.goAgeGate=goAgeGate;}catch(e){}
function showExitModal(){
  openModal(I18N.t('modal.exitGame'),
    `<div style="text-align:center;padding:12px">
      <div style="margin-bottom:12px">${_baekguIcon(58)}</div>
      <div style="color:var(--yellow);font-size:18px;font-weight:bold;margin-bottom:8px">${I18N.t('ui.confirmExit')}</div>
      <div style="color:var(--dim);font-size:14px;line-height:1.8">
        ${I18N.t('ui.currentTurnLine',{turn:G.turn})}<br>
        ${I18N.t('ui.heldCreditsLine',{cr:G.credits.toLocaleString()})}<br>
        <span style="color:var(--muted);font-size:12px">${I18N.t('ui.saveBeforeExitTip')}</span>
      </div>
    </div>`,
    [
      {txt:I18N.t('btn.saveAndExit'),fn:()=>{saveGame(false);setTimeout(()=>{try{window.close();}catch(e){}showTitle();closeModal();},400);},cls:'btn-gold'},
      {txt:I18N.t('btn.exitWithoutSave'),fn:()=>{try{window.close();}catch(e){}showTitle();closeModal();},cls:'btn-red'},
      {txt:I18N.t('btn.cancel'),fn:closeModal,cls:'btn-sm'}
    ]
  );
}
function showTitle(){show('s-title');try{AudioMgr.playBgm('Title');}catch(e){}}
// 타이틀 화면 종료 — Electron 은 앱 종료, 웹은 창 닫기 시도 후 안내
function exitFromTitle(){
  const isEn=(window.I18N&&window.I18N.getLang&&window.I18N.getLang()==='en');
  const _t=isEn?{
    title:'Exit Game',
    msg:'Exit Destination Earth?',
    confirm:'Exit',
    cancel:'Cancel',
    closeHint:'You can safely close this browser tab.'
  }:{
    title:'게임 종료',
    msg:'데스티네이션 어스를 종료하시겠습니까?',
    confirm:'종료',
    cancel:'취소',
    closeHint:'브라우저 탭을 직접 닫아 주세요.'
  };
  openModal(_t.title,
    `<div style="text-align:center;padding:14px 4px;font-size:15px;color:var(--txt);line-height:1.7">${_t.msg}</div>`,
    [
      {txt:_t.confirm,cls:'btn-red',fn:()=>{
        closeModal();
        // Electron PC 빌드 — 앱 종료
        if(window.desktopAPI&&typeof window.desktopAPI.quit==='function'){
          try{window.desktopAPI.quit();return;}catch(e){}
        }
        // 일반 브라우저 — window.close 시도 (script로 열린 창만 닫힘)
        try{window.close();}catch(e){}
        // 닫히지 않으면 안내
        setTimeout(()=>{
          if(!window.closed){
            try{notify(_t.closeHint,'warn');}catch(e){}
          }
        },200);
      }},
      {txt:_t.cancel,cls:'btn-sm',fn:closeModal}
    ]);
}
function checkAge(){
  const y=parseInt(document.getElementById('ag-y').value),m=parseInt(document.getElementById('ag-m').value),d=parseInt(document.getElementById('ag-d').value);
  const err=document.getElementById('ag-err');
  if(!y||!m||!d||y<1900||y>2015){err.textContent=I18N.t('agegate.invalidDate');return;}
  const birth=new Date(y,m-1,d),now=new Date();let age=now.getFullYear()-birth.getFullYear();
  if(now.getMonth()<birth.getMonth()||(now.getMonth()===birth.getMonth()&&now.getDate()<birth.getDate()))age--;
  if(age<12){err.textContent=I18N.t('agegate.under12');return;}
  if(age<18)G.isMinor=true;err.textContent='';syncDiffButtons(_titleDiff);setDifficulty(_titleDiff);show('s-ftue');
}
function setGender(g){
  G.profile.gender=g;
  document.getElementById('gb-m').style.borderColor=g==='male'?'var(--cyan)':'var(--bdr)';
  document.getElementById('gb-m').style.color=g==='male'?'var(--cyan)':'var(--dim)';
  document.getElementById('gb-f').style.borderColor=g==='female'?'var(--cyan)':'var(--bdr)';
  document.getElementById('gb-f').style.color=g==='female'?'var(--cyan)':'var(--dim)';
  // 사용자 요청 2026-06-12: 선택한 성별의 사령관 이미지 강조 (비선택 쪽은 흐리게)
  try{
    const _mi=document.getElementById('gb-m-img'),_fi=document.getElementById('gb-f-img');
    if(_mi){_mi.style.borderColor=g==='male'?'var(--cyan)':'var(--bdr)';_mi.style.opacity=g==='male'?'1':'.55';_mi.style.filter=g==='male'?'none':'grayscale(.4)';}
    if(_fi){_fi.style.borderColor=g==='female'?'var(--cyan)':'var(--bdr)';_fi.style.opacity=g==='female'?'1':'.55';_fi.style.filter=g==='female'?'none':'grayscale(.4)';}
  }catch(e){}
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
  const lbl={easy:I18N.t('difficulty.easy'),normal:I18N.t('difficulty.normal'),hard:I18N.t('difficulty.hard'),extreme:I18N.t('difficulty.extreme')}[d]||d;
  notify(I18N.t('notify.difficultyChanged',{lbl}),'ok');
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
// ── PNG 이미지 경로 시스템 (함선/행성/크루/파츠 이미지 헬퍼) → js/modules/png-image.js 로 분할 (2026-06-12, 사용자 요청: 긴 코드 분할)

// ═══ HUB ════════════════════════════════════════════════════
// 스토리/퀘스트 텍스트 토큰 치환 ({사령관}/{commander}·{함선}/{ship}·{기함}/{flagship}·{회사}/{company})
//   → 프로필의 실제 이름·함선명으로 교체 + 중괄호 제거. story-scenes-pc.js 의 rep() 과 동일 규칙.
//   퀘스트 설명·시나리오 카드·도감 일기 등 컷씬 외 텍스트에서 공용으로 사용.
function _subTokens(s){
  if(typeof s!=='string') return s;
  var p=(window.G&&G.profile)||{};
  // 기본값을 i18n 키에서 가져옴 → 언어 추가 시 코드 수정 없이 해당 로케일 값 자동 사용 (N언어 대응)
  var T=(window.I18N&&I18N.t)?(k=>I18N.t(k)):(k=>k);
  var defCmd=T('ui.commanderDefault'), defShip=T('ui.shipDefault'),
      defFlag=T('ship.flagshipDefault'), defCompany=T('ui.companyDefault'),
      flagSfx=T('ship.mustangSuffix');
  return s.replace(/\{사령관\}/g,p.name||defCmd).replace(/\{commander\}/gi,p.name||defCmd)
    .replace(/\{함선\}/g,p.ship||defShip).replace(/\{ship\}/gi,p.ship||defShip)
    .replace(/\{기함\}/g,p.ship?(p.ship+flagSfx):defFlag).replace(/\{flagship\}/gi,p.ship?(p.ship+flagSfx):defFlag)
    .replace(/\{회사\}/g,p.company||defCompany).replace(/\{company\}/gi,p.company||defCompany);
}
window._subTokens=_subTokens;

// NPC 표시명 현지화 — npc 필드는 데이터/로직 매칭용으로 한글 유지하므로, 표시 시점에만 번역.
//   한글명 → i18n 키 매핑 후 t()로 해석 → 현재 언어 값 반환 (ko/en/그외 언어 자동 대응).
//   ※ 영웅명은 기존 hero.*.nm 키 재사용, 그 외 NPC는 npc.* 키(로케일 파일).
const _NPC_KEY = {
  '백구':'speaker.baekgu','시스템':'speaker.system','아오리':'npc.aori',
  '이순신':'hero.H01.nm','장영실':'hero.H02.nm','광개토대왕':'hero.H03.nm',
  '가가린':'hero.H04.nm','유리 가가린':'hero.H04.nm','넬슨':'hero.H05.nm','호레이쇼 넬슨':'hero.H05.nm',
  '아인슈타인':'hero.H06.nm','A. 아인슈타인':'hero.H06.nm','테슬라':'hero.H07.nm','니콜라 테슬라':'hero.H07.nm',
  '마르코':'hero.H08.nm','마르코 폴로':'hero.H08.nm',
  '이휘소':'npc.leeHwiso','이휘소 박사':'npc.leeHwisoDr','광부 대표 린다':'npc.linda',
  '기지 정비원':'npc.baseMechanic','닥터 에바':'npc.drEva','레인저 맥시모프':'npc.maximoff','맥시모프':'npc.maximoff',
  '볼프 노인':'npc.wolfElder','볼프 자경단':'npc.wolfVigilante','아우레우스 세관':'npc.aureusCustoms',
  '오스카르':'npc.oscar','정거장 행상':'npc.peddler','코르비누스':'npc.corvinus'
};
function _npcName(nm){
  if(typeof nm!=='string'||!nm) return nm;
  nm=(window._subTokens?window._subTokens(nm):nm);
  if(nm==='사령관') return (window.G&&G.profile&&G.profile.name)||((window.I18N&&I18N.t)?I18N.t('ui.commanderDefault'):nm);
  var key=_NPC_KEY[nm];
  if(key&&window.I18N&&I18N.has&&I18N.has(key)) return I18N.t(key);
  return nm; // 미등록 NPC명 → 원문 유지
}
window._npcName=_npcName;

function showHub(){
  show('s-hub');
  // 언어 전환(reload) 후, 한국어로 스폰돼 저장된 시나리오 퀘스트를 현재 언어로 재지역화.
  //   (메인 허브 스토리 스트립·퀘스트 탭이 렌더되기 전에 1회 — 현재 언어면 즉시 반환)
  try{if(typeof relocalizeStoryQuests==='function')relocalizeStoryQuests();}catch(e){}
  // 옛 세이브 자동 복구 — turn 이 ACT 마일스톤을 이미 지났는데 act 가 못 따라잡힌 경우 1회 보정
  try{if(typeof _checkActAdvance==='function')_checkActAdvance();}catch(e){}
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
  // 행성이 바뀐 경우 이전 배경을 즉시 제거하여 재방문 시 옛 이미지가 잠시 보이는 문제 방지
  (function(){
    const hubBg=document.getElementById('hub-planet-bg');
    const _key=G.currentPlanet+(G.currentPlanet==='P31'&&_isEarthFree()?'#free':'');
    if(!hubBg)return;
    if(hubBg._loadedPlanet===_key)return;
    // 다른 행성 → 이전 이미지 즉시 제거 + 페이드아웃 (preload 비동기 동안 잔존 차단)
    hubBg.style.backgroundImage='';
    hubBg.style.opacity='0';
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
  const cmd=document.getElementById('hub-cmd');if(cmd)cmd.textContent=G.profile.name||I18N.t('ui.commander');
  // 사이드바 폴더 — 기본 닫힘 (사용자가 직접 펼침) — 현재 활성 탭이 속한 폴더만 setHubNav에서 자동 열림
  hubTab('main');
  // 안전망: 행성 재방문 시 사이드바 잠금 표시 즉시 갱신 (이전 행성 상태 잔존 방지)
  try{updateHubLockButtons();}catch(e){}
  // 초기 백구 인사 제거 (사용자 요청 2026-06-07): 시나리오 컷씬이 자동 재생되므로 중복 차단
  // 페이즈 1 P01 첫 도착 시 p1_ch01a 컷씬이 spawnPhasedQuests 안에서 자동 트리거됨
  // 주기적 조언 (45초 간격)
  if(showHub._tip)clearInterval(showHub._tip);
  const tips=[I18N.t('hubTip.0'),I18N.t('hubTip.1'),I18N.t('hubTip.2'),I18N.t('hubTip.3'),I18N.t('hubTip.4'),I18N.t('hubTip.5'),I18N.t('hubTip.6'),I18N.t('hubTip.7')];
  showHub._tip=setInterval(()=>{
    if(!document.getElementById('s-hub')?.classList.contains('on'))return;
    // 스토리 진행 힌트 우선 — 80% 확률로 등장 (이전 50% → 80%로 증가, 다음 할 일 안내 강조)
    if(Math.random()<0.8){baekgu(getBaekguStoryHint());return;}
    baekgu(tips[Math.floor(Math.random()*tips.length)]);
  },25000);  // 25초 간격 (이전 45초 → 25초)
  // 기존 온보딩 튜토리얼 자동 실행 제거됨 (2026-06-07)
  // → Phase 1 시나리오 퀘스트가 동일 역할 수행
  // 새 게임·이어하기 시작 시 일반 퀘스트 + 시나리오 퀘 + 인트로 컷씬 보장
  // 사용자 요청 2026-06-09: 즉시 노출 — DOM 렌더 직후 한 프레임 안에 spawn + 컷씬
  //   · 이전 600ms / 1800ms 지연 제거
  //   · requestAnimationFrame 으로 hub UI 한 번 그려진 직후 발화
  //   · spawn 후 즉시 hub 메인 탭 재렌더 → 시나리오 퀘 카드 노출 보장
  (function _ensureQuestsAndCutscene(){
    var _pid=(G&&G.currentPlanet)||'P01';
    if(G&&!G.currentPlanet)G.currentPlanet=_pid;
    // 사용자 요청 2026-06-09: 모든 행성에 시나리오 퀘 미리 spawn — 어느 행성 방문해도 즉시 노출
    //   세션당 1회만 실행 (G._allPlanetsSeeded 플래그)
    function _seedAllPlanetQuests(){
      if(G._allPlanetsSeeded)return;
      try{
        var _maps=[window.PHASE1_PLANET_INTROS,window.PHASE2_PLANET_INTROS,window.PHASE3_PLANET_INTROS,window.PHASE4_PLANET_INTROS,window.PHASE5_PLANET_INTROS,window.PHASE6_PLANET_INTROS];
        var _all=new Set();
        _maps.forEach(function(m){if(m)Object.keys(m).forEach(function(p){_all.add(p);});});
        var seeded=0,baekguTotal=0;
        _all.forEach(function(p){
          if(typeof spawnPhasedQuests==='function'){
            try{
              spawnPhasedQuests(p);
              seeded++;
              var _list=(G.quests&&G.quests[p])||[];
              baekguTotal+=_list.filter(function(q){return q.npc==='백구';}).length;
            }catch(e){console.warn('[seed]',p,'fail:',e.message);}
          }
        });
        G._allPlanetsSeeded=true;
        console.log('[seed all] '+seeded+'개 행성 spawn 완료 · 백구 퀘 '+baekguTotal+'개');
      }catch(e){console.warn('[seed all] fail:',e);}
    }
    function _doSpawn(){
      // 전 행성 미리 spawn (세션당 1회) — 사용자가 어느 행성 가도 즉시 백구·시나리오 퀘 노출
      _seedAllPlanetQuests();
      try{ if(typeof spawnPhasedQuests==='function')spawnPhasedQuests(_pid); }catch(e){console.warn('[phase] spawn fail',e);}
      try{ if(typeof generateQuests==='function')generateQuests(_pid); }catch(e){console.warn('[quest] gen fail',e);}
      // 메인 허브 탭 재렌더 — 새로 추가된 시나리오 퀘·일반 퀘가 즉시 보이도록
      try{
        if(G._currentHubTab==='main' && typeof rerenderTab==='function' && typeof renderMain==='function'){
          rerenderTab(renderMain);
        } else if(G._currentHubTab==='quest' && typeof rerenderTab==='function' && typeof renderQuestTab==='function'){
          rerenderTab(renderQuestTab);
        }
      }catch(e){}
      // 사용자 보고 2026-06-09: 시나리오 퀘 안 나옴 — 진단 로그
      try{
        var _q=(G.quests&&G.quests[_pid])||[];
        var _story=_q.filter(function(x){return x&&x.type==='story_quest';}).length;
        console.log('[showHub spawn] '+_pid+' · 총 '+_q.length+'개 (시나리오 '+_story+'개)');
      }catch(e){}
    }
    // 즉시 동기 호출 — RAF 의존 없이 바로 spawn (이전 RAF 의존성에서 fail 케이스 발견)
    _doSpawn();
    // RAF 보조 — DOM 한 번 그려진 직후 한 번 더 (이중 안전망)
    if(typeof requestAnimationFrame==='function'){
      requestAnimationFrame(_doSpawn);
    }
    // 안전망: STORY_SCENES_PC 늦은 로드·일부 실패 대비 1초 후 단일 재시도
    setTimeout(function(){
      try{
        var _list=(G.quests&&G.quests[_pid])||[];
        var _hasStory=_list.some(function(q){return q&&q.type==='story_quest';});
        if(!_hasStory && typeof spawnPhasedQuests==='function'){
          console.log('[hub-retry] story quests missing — re-spawning');
          spawnPhasedQuests(_pid);
        }
        if(_list.length<3 && typeof generateQuests==='function'){
          generateQuests(_pid);
        }
        // 재시도 후에도 메인 탭 재렌더
        if(G._currentHubTab==='main' && typeof rerenderTab==='function' && typeof renderMain==='function'){
          rerenderTab(renderMain);
        }
      }catch(e){console.warn('[hub retry fail]',e);}
    },1000);
  })();
}

// ═══ 온보딩 튜토리얼 ════════════════════════════════════════════════
// 첫 게임 진입 시 메뉴/UI를 팝업 툴팁으로 단계별 안내. G._tutorialDone 플래그로 1회만.
// ═══ 온보딩 튜토리얼 — 제거됨 (2026-06-07) ═══
// Phase 1 시나리오 퀘스트(보라색 메인 카드)와 백구 컷씬이 동일 역할을 수행하여
// 기존 단계별 툴팁 튜토리얼은 중복 차단을 위해 비활성화됨.
// 함수 시그니처는 호환성을 위해 유지 (호출하는 다른 모듈 안전 보호).
function showOnboardingTutorial(){ /* deprecated 2026-06-07 — see Phase 1 scenario quests */ }
function replayTutorial(){ /* deprecated 2026-06-07 — see Phase 1 scenario quests */ }
const ALL_TABS=['main','map','plaza','front','tavern','gacha','auction','clog','ship','crew','trade','quest','combat','result'];
function setHubNav(tab){
  // 잔해 탐색 버튼 라벨 즉시 갱신 (전투 진입/종료 시 합류 호출 모드 전환)
  try{if(typeof updateGatherBtn==='function')updateGatherBtn();}catch(e){}
  // Clear all active states
  document.querySelectorAll('.hn-btn,.hn-folder-btn').forEach(b=>b.classList.remove('on'));
  if(tab==='main'){const b=document.getElementById('hn-main');if(b)b.classList.add('on');return;}
  // Folder membership
  const captainTabs=['map','crew','clog','combat','result','codex'];
  const dockTabs=['ship','craft','garage'];
  const plazaTabs=['tavern','gacha','trade','quest','plaza'];
  const frontTabs=['auction','front'];
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
  // 팩션별 최종 단계(s3) 임계값 — F01(수퍼비아):3 / 그 외 모든 팩션:8
  // 진행 트리거: 해적 격파 · 퀘스트 완료 · 턴 종료 · 잔해 탐색
  return _getHubThr(pid).s3;
}
// 행성 허브 단계: 0=전부잠금 1/2/3=각 단계 해금
// 해금 순서 — 모든 행성 통일: 광장 → 도크 → 프론트
// 진행 트리거(공통): 해적 격파 · 퀘스트 완료 · 턴 종료 · 잔해 탐색
function _getStageOrder(pid){
  return['plaza','dock','front'];
}
// 카테고리(plaza/dock/front)가 해금되는 단계(1/2/3) 반환
function _getCategoryStage(pid,cat){
  return _getStageOrder(pid).indexOf(cat)+1;
}
function _getHubThr(pid){
  // 팩션별 단계 임계값
  // F01(수퍼비아): 광장 1회 / 도크 2회 / 프론트 3회 (시작 행성·최저)
  // 그 외 모든 팩션: 광장 2회 / 도크 4회 / 프론트 8회 (표준)
  const pd=PLANET_DEF.find(p=>p.id===pid);
  if(pd?.f==='F01')return{s1:1,s2:2,s3:3};
  return{s1:2,s2:4,s3:8};
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
  // 영구 최대값 트래커 — 재방문 시 잠금 회귀 방지 (어떤 경로로도 hubProg가 줄어도 복원 기준)
  const _curMax=G.planets[pid]._hubProgMax||0;
  if(G.planets[pid].hubProg>_curMax)G.planets[pid]._hubProgMax=G.planets[pid].hubProg;
  const cur=G.planets[pid].hubProg;
  const pd=PLANET_DEF.find(p=>p.id===pid);
  const nm=pd?.nm||pid;
  const t=_getHubThr(pid);
  const order=_getStageOrder(pid);
  const unlockMsg={
    plaza:{n:I18N.t('unlock.plazaNotify',{nm}),b:I18N.t('unlock.plazaBaekgu')},
    dock :{n:I18N.t('unlock.dockNotify',{nm}), b:I18N.t('unlock.dockBaekgu')},
    front:{n:I18N.t('unlock.frontNotify',{nm}),b:I18N.t('unlock.frontBaekgu')}
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
    // 캐시 대신 매번 신선한 origText 계산 — 행성 재방문 시 이전 행성 진행도 텍스트 잔존 차단
    const _orig=lbl.textContent.replace(/ 🔒.*$/,'');
    if(!unlocked){
      btn.style.opacity='0.45';
      lbl.textContent=_orig+' 🔒 '+prog+'/'+thrByStage[need];
    } else {
      btn.style.opacity='';
      lbl.textContent=_orig;
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
    const _frontTabs=['front','plaza','auction'];
    let needed=0,stageName='',stageEmoji='🏗️';
    if(_plazaTabs.includes(tab)){needed=_getCategoryStage(pid,'plaza');stageName=I18N.t('stage.plaza');stageEmoji='🏪';}
    else if(_dockTabs.includes(tab)){needed=_getCategoryStage(pid,'dock');stageName=I18N.t('stage.dock');stageEmoji='🚀';}
    else if(_frontTabs.includes(tab)){needed=_getCategoryStage(pid,'front');stageName=I18N.t('stage.front');stageEmoji='🌐';}
    if(needed>0&&stage<needed){
      const pd=PLANET_DEF.find(p=>p.id===pid);
      const _thr2=_getHubThr(pid);
      const nextGoal=needed===1?_thr2.s1:needed===2?_thr2.s2:_thr2.s3;
      G._currentHubTab='main';
      setHubNav('main');
      updateFleetBar();
      // 잠금 화면 표시 시 사이드바 잠금 카운트도 즉시 갱신 (일관성)
      try{updateHubLockButtons();}catch(e){}
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
            ${(()=>{
              // 잠금 안내 담당자 — 퀘스트 의뢰 인물 이미지(img/quests, 행성 팩션별) + 이모지 폴백
              //   ※ 우리 함대 영웅(hero01~08) 사용 금지 — NPC(제독/행정관 등)와 혼동 방지
              const _ltype={quest:'combat',plaza:'combat',trade:'delivery',tavern:'delivery',gacha:'delivery',ship:'explore',craft:'gather',garage:'gather',auction:'combat',planets:'explore',front:'explore'}[tab];
              const _lfac=(pd&&/^F0[1-7]$/.test(pd.f||''))?pd.f:'F01';
              const _lockImg=_ltype?('img/quests/'+_ltype+'_'+_lfac+'.png'+((window._GAME_VER)?('?v='+encodeURIComponent(window._GAME_VER)):'')):'';
              return _lockImg
                ? imgOrEmoji(_lockImg,npcInfo.ic,110,110,'border-radius:12px;object-fit:cover;flex-shrink:0;border:2px solid rgba(255,80,80,.4);background:rgba(0,0,0,.4)')
                : '<div style="font-size:78px;line-height:1;flex-shrink:0;filter:drop-shadow(0 0 14px rgba(255,80,80,.3))">'+npcInfo.ic+'</div>';
            })()}
            <div style="flex:1;min-width:0">
              <div style="font-size:14px;color:var(--cyan);font-weight:bold;margin-bottom:6px">${npcInfo.title}</div>
              <div style="font-size:20px;color:var(--yellow);line-height:1.7;word-break:keep-all">"${npcInfo.line}"</div>
            </div>
          </div>
          <div style="font-size:17px;font-weight:bold;color:var(--red)">🔒 ${I18N.t('lock.stageLocked',{stage:stageName})}</div>
          <div style="color:var(--dim);font-size:14px;line-height:1.9">
            ${I18N.t('lock.openCondition',{goal:`<b style="color:var(--gold)">${nextGoal}</b>`})}
            &nbsp;·&nbsp; <span style="color:var(--cyan)">${I18N.t('ui.currentN',{now:prog,goal:nextGoal})}</span>
          </div>
          <div style="background:rgba(0,243,255,.06);border:1px solid rgba(0,243,255,.4);border-radius:8px;padding:10px 14px;font-size:13px;line-height:1.9;text-align:left">
            <div style="color:var(--yellow);font-weight:bold;margin-bottom:4px">${I18N.t('lock.unlockStages')}</div>
            ${(()=>{const ord=_getStageOrder(pid);const lbl={plaza:I18N.t('stage.plazaFull'),dock:I18N.t('stage.dockFull'),front:I18N.t('stage.frontFull')};const thArr=[_thr.s1,_thr.s2,_thr.s3];return ord.map((cat,i)=>`<div style="color:${prog>=thArr[i]?'var(--green)':'var(--dim)'}">${prog>=thArr[i]?'✅':'⬜'} ${I18N.t('lock.unlockRow',{n:thArr[i],lbl:lbl[cat]})}</div>`).join('');})()}
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">
            <button class="btn btn-sm btn-green" onclick="hubTab('quest')" ${stage>=1?'':'disabled style=\"opacity:.4\"'}>${I18N.t('btn.acceptQuest')}</button>
            <button class="btn btn-sm" style="border-color:var(--cyan);color:var(--cyan)" onclick="hubTab('main')">${I18N.t('btn.toMainHub')}</button>
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
  // 전투 복귀 버튼 상태 갱신 — 탭 변경 시 항상 (사용자 요청: 전투 중엔 항시 복귀 가능)
  try{if(typeof _updateResumeBtn==='function')_updateResumeBtn();}catch(e){}
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
  const genSrc='img/hub/'+tabId+'.png'+((typeof window!=='undefined'&&window._GAME_VER)?('?v='+encodeURIComponent(window._GAME_VER)):'');
  // 팩션 폴더 우선 시도는 폴더가 없을 경우 onerror 폴백을 거치며 깜빡임 발생 → 기본 이미지만 사용
  // 팩션별 변형이 필요하면 명시적으로 img/hub/<faction>/<tab>.png 만든 후 코드에서 활성화
  const firstSrc=genSrc;
  // 시설 NPC 담당자 이미지: trade·quest·tavern·craft·ship·garage·auction 7종 한정
  const _NPC_TABS=['trade','quest','tavern','craft','ship','garage','auction'];
  const _hasNpc=_NPC_TABS.indexOf(tabId)>=0;
  const _pid=G&&G.currentPlanet;
  // 시설 담당자 이미지 — 퀘스트 의뢰 인물 이미지(img/quests) 사용. 행성 팩션별로 분기.
  //   ※ 우리 함대 영웅(hero01~08)을 쓰지 않음 (제독/행정관 등 NPC 와 혼동 방지)
  // img/hub_npc/ 폴더는 현재 미존재 — 매 렌더링마다 3중 404 폭주 차단을 위해
  // 곧장 img/quests/{type}_{faction}.png 사용 (실제 존재 보장)
  const _NPC_TYPE={quest:'combat',ship:'explore',garage:'gather',trade:'delivery',craft:'gather',tavern:'delivery',auction:'combat'};
  const _qFac=(/^F0[1-7]$/.test(factionId||''))?factionId:'F01';
  const npcTemp=_NPC_TYPE[tabId]?('img/quests/'+_NPC_TYPE[tabId]+'_'+_qFac+'.png'+((window._GAME_VER)?('?v='+encodeURIComponent(window._GAME_VER)):'')):'';
  const npcFirst=npcTemp;
  // 퀘스트·크루를 언급하는 담당자(제독=quest · 주점주인=tavern)는 2배 크게 (사용자 요청)
  const _npcBig=(tabId==='quest'||tabId==='tavern');
  const _npcH=_npcBig?208:104;
  const _npcMaxW=_npcBig?300:140;
  const npcHtml=_hasNpc&&npcFirst?(
    '<img src="'+npcFirst+'" alt="" style="position:absolute;right:8px;bottom:0;height:'+_npcH+'px;width:auto;max-width:'+_npcMaxW+'px;object-fit:contain;object-position:bottom right;z-index:2;filter:drop-shadow(-2px 0 8px rgba(0,0,0,.5));pointer-events:none" onerror="this.onerror=null;this.style.display=\'none\'">'
  ):'';
  const bannerH=_hasNpc?(_npcBig?200:96):60;
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

// ─── 메인 허브 시나리오 퀘 스트립 ──────────────────────────────────
// _buildStoryQuestStripHTML / _openStoryQuestDetail → js/modules/main-hub-story-strip.js 로 분할
//   · 사용자 요청 2026-06-10: 긴 파일 분할
//   · window 전역에 노출되어 renderMain template literal 에서 그대로 호출 가능

// ═══ MAIN HUB VIEW ═══════════════════════════════════════════
function renderMain(body){
  updateHubLockButtons();
  if(!body)return;
  const owned=Object.values(G.planets||{}).filter(p=>p.owned).length;
  const tax=calcTurnTax();const pd=PLANET_DEF.find(p=>p.id===G.currentPlanet)||PLANET_DEF[0];const fac=pd?FACTION[pd.f]:null;
  try{body.innerHTML=`
    <div style="display:flex;gap:8px;padding:8px 14px;background:rgba(13,26,42,.98);border-bottom:1px solid var(--bdr);flex-wrap:nowrap;overflow-x:auto;flex-shrink:0;scrollbar-width:none">
      <div class="ic"><span class="icl">${I18N.t('ui.locationShort')}</span><span class="icv" style="color:${fac?.col||'var(--cyan)'}">📍 ${pd?.nm||'?'}</span></div>
      <div class="ic"><span class="icl">${I18N.t('ui.shipLabelShort')}</span><span class="icv">🛸 ${G.fleet.length}척</span></div>
      <div class="ic"><span class="icl">${I18N.t('ui.crewShort')}</span><span class="icv">👥 ${G.crew.length}명</span></div>
      <div class="ic"><span class="icl">${I18N.t('ui.planetShort')}</span><span class="icv">🌍 ${owned}개</span></div>
      <div class="ic"><span class="icl">${I18N.t('ui.heroShort')}</span><span class="icv" style="color:var(--gold)">⚡ ${G.heroes.length}/8</span></div>
      <div class="ic"><span class="icl">${I18N.t('ui.turnTax')}</span><span class="icv" style="color:var(--green)">₡${tax.toLocaleString()}</span></div>
      <div class="ic"><span class="icl">ACT/TURN</span><span class="icv" style="color:var(--cyan)">${G.act}/${G.turn}</span></div>
      ${(()=>{const lv=calcPlayerLevel(),rk=getLevelRank(lv);return`<div class="ic"><span class="icl">${I18N.t('ui.levelShort')}</span><span class="icv" style="color:${rk.col};font-weight:bold">Lv.${lv} <span style="font-size:12px">${rk.lb}</span></span></div>`;})()}
      ${(()=>{const rep=G.reputation||0,rr=getRepRank(rep);const next=rr.next;const pct=Math.min(100,next>0?Math.round(rep/next*100):100);const _ver=window._GAME_VER?'?v='+window._GAME_VER:'';return`<div class="ic" style="min-width:130px;display:flex;align-items:center;gap:8px"><img src="img/ui/HN01.png${_ver}" alt="HN" style="width:32px;height:32px;object-fit:contain;flex-shrink:0;filter:drop-shadow(0 0 6px ${rr.col})" onerror="this.style.display='none'"><div style="flex:1;min-width:0"><span class="icl">${I18N.t('ui.repShort')}</span><span class="icv" style="color:${rr.col};font-weight:bold">${rr.ic} ${rr.lb}</span><div style="margin-top:2px;height:3px;background:rgba(255,255,255,.1);border-radius:2px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${rr.col};transition:width .4s"></div></div><div style="font-size:9px;color:var(--dim);text-align:right;margin-top:1px">${rep}${next<9999?' / '+next:''}</div></div></div>`;})()}
      ${(G.stayTurns||0)>=2?`<div class="ic"><span class="icl">${I18N.t('ui.stayShort')}</span><span class="icv" style="color:var(--red);font-weight:bold">${I18N.t('ui.stayProgressWarn',{n:G.stayTurns})}</span></div>`:(G.stayTurns||0)>0?`<div class="ic"><span class="icl">${I18N.t('ui.stayShort')}</span><span class="icv" style="color:var(--dim)">${I18N.t('ui.stayProgress',{n:G.stayTurns})}</span></div>`:''}
    </div>
    <div style="flex:1;position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center">
      ${buildSceneHTML(pd,fac)}
      <div style="position:absolute;top:12px;left:50%;transform:translateX(-50%);background:rgba(13,26,42,.92);border:1px solid var(--cyan);border-radius:10px;padding:10px 18px;max-width:500px;text-align:center;pointer-events:none;z-index:20">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px">${imgOrEmoji('img/chars/baekgu1.png','🐕',28,28,'border-radius:50%;background:var(--panel)')}<span style="color:var(--cyan);font-size:12px">${I18N.t('speaker.baekgu')}</span></div>
        <div style="color:var(--yellow);font-size:14px;line-height:1.6">${getBaekguLine()}</div>
      </div>
      ${_buildStoryQuestStripHTML(G.currentPlanet)}
    </div>
    <div style="background:rgba(13,26,42,.97);border-top:1px solid var(--bdr);flex-shrink:0">
      <div style="display:flex;align-items:center;gap:14px;padding:4px 16px;overflow-x:auto;height:36px;border-bottom:1px solid rgba(0,243,255,.1)">
        <span style="color:var(--dim);font-size:12px">📋</span>
        <span style="color:var(--txt);font-size:13px;white-space:nowrap">${I18N.t('hud.dockedAt',{turn:G.turn,nm:pd?.nm||''})}</span>
        ${G.heroes.length>0?`<span style="color:var(--gold);font-size:13px;white-space:nowrap">${I18N.t('hud.heroesPrefix')}${G.heroes.map(h=>HEROES[h]?.ic||'').join(' ')}</span>`:''}
        ${(()=>{
          // 사용자 요청 2026-06-09: 현재 행성의 시나리오·백구 퀘 카운트 배지 (눈에 띄게)
          const _ql=(G.quests&&G.quests[G.currentPlanet])||[];
          const _story=_ql.filter(q=>q.type==='story_quest').length;
          const _baekgu=_ql.filter(q=>q.npc==='백구').length;
          if(_story===0)return '';
          const _avail=_ql.filter(q=>q.type==='story_quest'&&q.status==='available').length;
          const _enSB=(window.I18N&&I18N.getLang&&I18N.getLang()==='en');
          const _sbTitle=_enSB?`Admiral/Baekgu quests: ${_story} (${_avail} available) — click to open`:`제독·백구 퀘스트 ${_story}개 (수락 가능 ${_avail}개) — 클릭하여 이동`;
          return `<span onclick="hubTab('quest')" style="color:#ffd700;font-size:13px;white-space:nowrap;background:rgba(255,215,0,.12);border:1px solid #ffd70066;border-radius:5px;padding:1px 8px;cursor:pointer;font-weight:bold" title="${_sbTitle}">📜 ${_enSB?'Scenario':'시나리오'} ${_story}${_avail>0?' · 🆕 '+_avail:''}${_baekgu>0?' · 🐕 '+_baekgu:''}</span>`;
        })()}
        ${G._earthLiberated?`<button onclick="replayEnding()" style="padding:3px 10px;border:1px solid #cc66ff;border-radius:5px;background:rgba(204,102,255,.12);color:#cc66ff;cursor:pointer;font-size:12px;font-family:inherit;white-space:nowrap" title="${I18N.t('title.replayUrsaEnding')}">${I18N.t('ui.replayEnding')}</button>`:''}
        ${(()=>{
          // 사용자 요청 2026-06-09 (재설계): 컷씬 버튼 순차 해금 + 첫 버튼 항상 활성
          //   · 컷씬 #1 (인트로): 항상 활성 (자동 인트로 안 떠도 수동 재생 가능)
          //   · 컷씬 #2~N: 직전 컷씬을 본 후에만 활성화 (순차 해금)
          //   · 자동 인트로는 백그라운드에서 시도 — 실패해도 #1 버튼으로 사용자 복구 가능
          const _introMaps=[window.PHASE1_PLANET_INTROS, window.PHASE2_PLANET_INTROS, window.PHASE3_PLANET_INTROS, window.PHASE4_PLANET_INTROS, window.PHASE5_PLANET_INTROS, window.PHASE6_PLANET_INTROS];
          const _cutMaps=[window.PHASE1_CUTSCENES_KO, window.PHASE2_CUTSCENES_KO, window.PHASE3_CUTSCENES_KO, window.PHASE4_CUTSCENES_KO, window.PHASE5_CUTSCENES_KO, window.PHASE6_CUTSCENES_KO];
          let _introId=null,_introMapIdx=-1;
          for(let i=0;i<_introMaps.length;i++){
            if(_introMaps[i] && _introMaps[i][G.currentPlanet]){_introId=_introMaps[i][G.currentPlanet];_introMapIdx=i;break;}
          }
          if(!_introId)return'';
          // 챕터 prefix 추출 — p1_ch01a → p1_ch01 / p2_ch03 → p2_ch03
          // 사용자 요청 2026-06-09: 컷씬 1~9 순차 해금 (이전 최대 5 → 9 확장)
          //   · 챕터 prefix 동일 시: 같은 챕터 시퀀스로 묶음
          //   · 페이즈 prefix 동일 시: 페이즈 전체 컷씬으로 폴백 (행성당 9개 채움)
          const _chapterMatch=_introId.match(/^(p\d_ch\d+|p\d_[a-z]+)/);
          const _prefix=_chapterMatch?_chapterMatch[1]:_introId;
          const _phasePrefix=_introId.match(/^(p\d)/)?.[1]||'';
          // 같은 챕터 컷씬 수집 (해당 페이즈만)
          const _sceneIds=[_introId];
          const _phaseCuts=_cutMaps[_introMapIdx]||{};
          Object.keys(_phaseCuts).sort().forEach(id=>{
            if(id===_introId)return;
            if(id.startsWith(_prefix))_sceneIds.push(id);
          });
          // 챕터 컷씬이 9개 미만이면 같은 페이즈의 다른 챕터 컷씬으로 보충 (1~9 채우기)
          if(_sceneIds.length<9 && _phasePrefix){
            Object.keys(_phaseCuts).sort().forEach(id=>{
              if(_sceneIds.length>=9)return;
              if(_sceneIds.includes(id))return;
              if(id.startsWith(_phasePrefix))_sceneIds.push(id);
            });
          }
          const _scenes=_sceneIds.slice(0,9);  // 최대 9개 (사용자 요청)
          return _scenes.map((sid,idx)=>{
            const _seenScene=!!(G._scenesSeen&&G._scenesSeen['scene_'+sid]);
            // 순차 해금 규칙:
            //   idx===0 → 항상 활성 (첫 인트로 = 즉시 클릭 가능)
            //   idx>=1  → 직전 컷씬을 시청 완료한 경우만 활성
            let _unlocked=true;
            if(idx>0){
              const _prevSid=_scenes[idx-1];
              _unlocked=!!(G._scenesSeen&&G._scenesSeen['scene_'+_prevSid])
                ||(typeof isSceneStoryUnlocked==='function'&&isSceneStoryUnlocked(sid));
            }
            const _col=!_unlocked?'#666':(_seenScene?'#88ccff':'#ffd700');
            const _bg=!_unlocked?'rgba(80,80,80,.10)':(_seenScene?'rgba(0,243,255,.08)':'rgba(255,215,0,.18)');
            const _pulse=(idx===0&&!_seenScene)?'animation:cutscenePulse 1.6s ease-in-out infinite;':(_unlocked&&!_seenScene?'animation:cutscenePulse 2.2s ease-in-out infinite;':'');
            const _enDL=(window.I18N&&I18N.getLang&&I18N.getLang()==='en');
            const _dlName=_enDL?'Dialogue Log':'대화기록';
            const _label='💬 '+_dlName+' '+(idx+1);
            const _onclick=_unlocked
              ? `onclick="(window.STORY_SCENES_PC&&window.STORY_SCENES_PC.forceReplayScene)?window.STORY_SCENES_PC.forceReplayScene('${sid}'):notify('STORY_SCENES_PC 미로드','err')"`
              : '';
            const _title=!_unlocked
              ? (_enDL?'Watch the previous dialogue log first to unlock':'이전 대화기록을 먼저 시청해야 활성화됩니다')
              : (_seenScene ? _dlName+' '+sid+(_enDL?' (watched)':' (시청 완료)') : _dlName+' '+sid+(_enDL?' — click to play':' — 클릭하여 재생'));
            return `<button ${_onclick} ${!_unlocked?'disabled':''} style="padding:3px 10px;border:1px solid ${_col};border-radius:5px;background:${_bg};color:${_col};cursor:${!_unlocked?'not-allowed':'pointer'};font-size:12px;font-family:inherit;white-space:nowrap;font-weight:bold;${_pulse};opacity:${!_unlocked?'.55':'1'}" title="${_title}">${_label}</button>`;
          }).join('') + `<style>@keyframes cutscenePulse{0%,100%{box-shadow:0 0 0 0 currentColor}50%{box-shadow:0 0 0 8px transparent}}</style>`;
        })()}
        ${(G.act>=4)?`<button onclick="forceUrsaBoss()" style="padding:3px 10px;border:1px solid #ff5555;border-radius:5px;background:rgba(255,60,60,.12);color:#ff7777;cursor:pointer;font-size:12px;font-family:inherit;white-space:nowrap" title="${I18N.t('ui.ursaRetryTitle')}">${I18N.t('ui.ursaRetryBtn')}</button>`:''}
        ${(()=>{
          if(!pd?.hostile)return'';
          const waves=G.chixWaves||0;const stay=G.stayTurns||0;
          const warnCol=waves>=4?'var(--red)':waves>=2?'#cc55ff':'#ff8844';
          const threat=waves>=5?I18N.t('threat.final'):waves>=4?I18N.t('threat.critical'):waves>=3?I18N.t('threat.warn'):waves>=2?I18N.t('threat.caution'):I18N.t('threat.safe');
          return`<span style="color:${warnCol};font-size:13px;white-space:nowrap;background:rgba(139,0,255,.12);border:1px solid rgba(139,0,255,.3);border-radius:4px;padding:2px 7px">${I18N.t('hud.cheeksThreat',{threat,waves,stay})}}${stay>=2?I18N.t('hud.cheeksWarn50'):''}</span>`;
        })()}
      </div>
      <!-- 함대 정보는 하단 바(#bk-fleet)에 항상 표시 -->
    </div>`;
  }catch(e_rm){console.error('[renderMain error]',e_rm);body.innerHTML='<div style="padding:20px;color:#f88">'+I18N.t('err.renderError')+e_rm.message+'</div>';}
}
function getBaekguLine(){
  const lines=[I18N.t('ui.tutorialIntro',{nm:G.profile.name||I18N.t('ui.commander')}),
    I18N.t('chatbot.creditsLow',{c:G.credits.toLocaleString(),tail:G.credits<10000?I18N.t('chatbot.creditsLowTail'):I18N.t('chatbot.creditsOkTail')}),
    `${G.heroes.length>0?I18N.t('ui.heroesJoining',{nms:G.heroes.map(h=>HEROES[h]?.nm||'').join(', ')}):I18N.t('ui.noHeroesYet')}`,
    I18N.t('chatbot.crewCount',{n:G.crew.length,tail:G.crew.length<5?I18N.t('chatbot.crewMore'):I18N.t('chatbot.crewEnough')}),
    I18N.t('hubTip.8')];
  // 추가 2026-06-11 (사용자 요청): 미영입 전설 영웅 소재 행성 힌트 — 턴마다 다른 영웅 순환
  try{
    const _unrec=(PLANET_DEF||[]).filter(p=>p.hero&&!(G.heroes||[]).includes(p.hero));
    if(_unrec.length){
      const _hp=_unrec[G.turn%_unrec.length];
      const _hnm=I18N.t('hero.'+_hp.hero+'.nm');
      lines.push(I18N.t('baekgu.heroLocationHint',{hero:_hnm,planet:_hp.nm,ring:_hp.ring}));
      // 힌트 노출 빈도를 높이기 위해 한 슬롯 더 (5→7개 중 2개가 영웅 힌트)
      const _hp2=_unrec[(G.turn+1)%_unrec.length];
      if(_hp2&&_hp2!==_hp)lines.push(I18N.t('baekgu.heroLocationHint',{hero:I18N.t('hero.'+_hp2.hero+'.nm'),planet:_hp2.nm,ring:_hp2.ring}));
    }
  }catch(e){}
  return lines[G.turn%lines.length];
}
function buildSceneSVG(pd,fac){
  // SVG 폴백 씬 (PNG 로드 실패시)
  const fc=fac?.col||'#00f3ff',pnm=pd?.nm||'?',snm=G.fleet[0]?.nm||I18N.t('ui.shipDefault');
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
  const shipSrc=flagship?shipImgSrc(flagship):shipImgSrc({id:'S01',catId:'S01',tier:'소형'});
  const shipEmoji=flagship?.tier==='신화'?'✦':flagship?.tier==='대형'?'🌟':flagship?.tier==='중형'?'🚀':'🛸';
  const planetSrc=planetImgSrc(pd?.id);
  const isHostile=!!pd?.hostile,isVoid=pd?.f==='F07';
  const planetBg=isHostile?'radial-gradient(circle, #3a0a0a, #1a0005)':isVoid?'radial-gradient(circle, #001a2a, #000510)':'radial-gradient(circle, #0a2a5a, #050a1a)';

  return `<div style="width:100%;height:100%;position:relative;overflow:hidden">
    <!-- 행성 배경 이미지 (전체 프레임) — P31 해방 후 _free 변형 자동 사용 + .jpg→.png fallback -->
    <img src="${planetBgSrc(pd?.id||'P01')}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.92;z-index:0"
      onerror="if(this.src.indexOf('.jpg')>=0){this.src=(typeof planetBgFallback==='function')?planetBgFallback('${pd?.id||'P01'}'):'img/bg/${pd?.id||'P01'}.png';}else{this.style.background='radial-gradient(ellipse at 40% 50%, #0d1a3a 0%, #050a1a 100%)';this.style.display='none';}">
    <div style="position:absolute;inset:0;background:linear-gradient(to right, rgba(5,10,26,.55) 0%, rgba(5,10,26,.1) 50%, rgba(5,10,26,.35) 100%);z-index:1"></div>

    <!-- 하단 갑판 -->
    <div style="position:absolute;bottom:0;left:0;right:0;height:10%;background:linear-gradient(to top,#0a1520,transparent)"></div>
    <div style="position:absolute;bottom:0;left:0;right:0;height:2px;background:linear-gradient(to right,transparent,${fc}50,transparent)"></div>
    <!-- 행성 이름 표기는 퀘스트 카드와 겹쳐 제거 (사용자 요청). 위험/보이드 경고만 우측 하단 유지 -->
    <div style="position:absolute;bottom:18px;right:20px;text-align:right;z-index:20;pointer-events:none">
      ${isHostile?`<div style="color:#ff4444;font-size:12px;font-family:'Malgun Gothic','맑은 고딕','Courier New',monospace;letter-spacing:1px">${I18N.t('ui.hostileZone')}</div>`:''}
      ${isVoid?`<div style="color:#bb88ff;font-size:12px;font-family:'Malgun Gothic','맑은 고딕','Courier New',monospace;letter-spacing:1px">${I18N.t('ui.voidRegion')}</div>`:''}
    </div>
  </div>`;
}

// ═══ ECONOMY ═════════════════════════════════════════════════════
// 투자비·세금 산정용 기준 tax. 지구(P31)는 보이드 행성 tax의 1.2배로 책정 (사용자 요청).
function _planetBaseTax(pd){
  if(!pd)return 0;
  if(pd.id==='P31'){
    const _voidTax=Math.max(0,...PLANET_DEF.filter(p=>p.void).map(p=>p.tax||0));
    return Math.round((_voidTax||50000)*1.2);
  }
  return pd.tax||0;
}
function calcTaxFor(pid){const pd=PLANET_DEF.find(p=>p.id===pid),st=G.planets[pid];if(!pd||!st||!st.owned)return 0;const aurBonus=pd.f==='F02'?1.25:1.0;/* 행성 세금 (사용자 요청 2026-06-06):
  · 기준치 ×1.5 (현재보다 1.5배 인상)
  · 투자 레벨당 최초금액에서 +20% 선형 누적 (Lv0→1.0, Lv1→1.2, Lv2→1.4, ... Lv10→3.0)
  · 종전: Math.pow(1.3, commerce) 복리 → 누적증가 직관성을 위해 선형(1+0.2×lv)로 전환 */
  const lv=st.commerce||0;
  return Math.floor(_planetBaseTax(pd)*(1+0.2*lv)*1.8*aurBonus*1.5);}
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
// ACT 전환 스토리 팝업 — 사용자 요청 2026-06-07: 페이즈 1~6 컷씬 시스템으로 일원화하면서 ACT 팝업 제거
// G.act 상태값은 _checkActAdvance 에서 계속 갱신 (게임 진행 마일스톤 로직 호환). 팝업 표시만 스킵.
function showActTransition(newAct){ /* no-op: ACT 1~5 팝업 제거 */ }
// ── 충성도(LOY) 시스템 (크루 충성도 틱·위생·반란 이벤트) → js/modules/loyalty.js 로 분할 (2026-06-12, 사용자 요청: 긴 코드 분할)

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
    id:'TRAVEL_PIRATE',nm:I18N.t('pirate.routeName'),ring:ring,f:'PIRATE',hostile:true,tax:0,
    _enemies:Array.from({length:eCount},(_,i)=>({
      id:`TP${i}`,nm:I18N.t('ui.routePiratePrefix',{nm:I18N.t('ui.routePirateNames').split('|')[i%4]}),tier:i%4===3?'중형':'소형',isEnemy:true,
      hp:eHP,maxHP:eHP,sh:Math.floor(eHP*.25),maxSH:Math.floor(eHP*.25),
      ATT:eATK,INT:eINT,TEC:eTEC,HP:eHP,LOY:0,parts:[],crewIds:[]
    }))
  };
  const chance=calcTravelPirateChance(pd);
  // 사용자 요청 2026-06-07 (2차): 인물 이미지 추가 2배 확대 (96 → 192px)
  // 행성 팩션 기반 combat NPC 이미지 사용. PIRATE 폴백은 F01.
  const _pFac=(/^F0[1-7]$/.test(pd?.f||''))?pd.f:'F01';
  const _ver=(window._GAME_VER)?('?v='+encodeURIComponent(window._GAME_VER)):'';
  const _warriorSrc='img/quests/combat_'+_pFac+'.png'+_ver;
  const _commanderSrc=(typeof _commanderPortraitSrc==='function')?_commanderPortraitSrc():('img/chars/commander_m1.png'+_ver);
  openModal(I18N.t('modal.routePirate'),
    _hostileVsHeader({enemyImg:_warriorSrc,enemyName:I18N.t('pirate.routeName'),enemyFallback:'☠️'})
    +`<div style="text-align:center;padding:0 6px 8px">
      <div style="color:var(--red);font-size:18px;font-weight:bold;margin-bottom:4px">${I18N.t('pirate.routeEncounter',{nm:pd?.nm||''})}</div>
      <div style="color:var(--dim);font-size:12px;line-height:1.7">
        ${I18N.t('pirate.routeAmbushBy',{n:eCount})}<br>
        <span style="color:var(--muted);font-size:11px">${I18N.t('pirate.encounterChance',{pct:chance,ring,diff:({easy:I18N.t('difficulty.easy'),normal:I18N.t('difficulty.normal'),hard:I18N.t('difficulty.hard'),extreme:I18N.t('difficulty.extreme')})[G.difficulty]||I18N.t('difficulty.normal')})}</span>
      </div>
    </div>
    ${_formatEnemyPreview(raidDef._enemies)}
    <div style="text-align:center;font-size:12px;color:var(--yellow);margin-top:6px">${I18N.t('pirate.winLoot')}</div>
    <div style="text-align:center;font-size:12px;color:var(--cyan);margin-top:4px">${_baekguIcon(18)} ${I18N.t('ui.baekguShort')}: "${I18N.t('pirate.baekguRoute')}"</div>`,
    [{txt:I18N.t('ui.fight'),fn:()=>{closeModal();_safeCombatEntry(function(){startPirateRaid(raidDef);},"startPirateRaid");},cls:'btn-red'},
     {txt:I18N.t('ui.flee'),fn:()=>{closeModal();escapeTravelPirate();},cls:'btn-sm'}]
  );
}
function escapeTravelPirate(){
  const penalty=Math.floor(G.credits*0.03);
  G.credits=Math.max(100,G.credits-penalty);
  changeReputation(-2);
  updateHUD();
  notify(I18N.t('notify.fleeSuccess',{cr:penalty.toLocaleString()}),'err');
  baekgu(I18N.t('baekgu.barelyEscaped'));
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
    id:'PIRATE_RAID',nm:I18N.t('pirate.earlyName'),ring:ring,f:'PIRATE',hostile:true,tax:0,
    _enemies:Array.from({length:eCount},(_,i)=>({
      id:'EP'+i,nm:I18N.t('pirate.namePrefix')+[I18N.t('pirate.scout'),I18N.t('pirate.smallFighter'),I18N.t('pirate.raider')][i%3],tier:'소형',isEnemy:true,
      hp:eHP,maxHP:eHP,sh:Math.floor(eHP*.15),maxSH:Math.floor(eHP*.15),
      ATT:eATK,INT:eINT,TEC:eTEC,HP:eHP,LOY:0,parts:[],crewIds:[]
    }))
  };
  openModal(I18N.t('modal.pirateAppear'),
    (function(){
      // 사용자 요청 2026-06-09: 해적 전용 이미지 풀(FF01~FF08) 추가 활용
      const _pImg=pirateCombatImg(pd);
      return _hostileVsHeader({enemyImg:_pImg,enemyName:I18N.t('pirate.earlyAppear',{nm:pd?.nm||''}),enemyFallback:'☠️'});
    })()
    +`<div style="text-align:center;padding:0 6px 6px">
      <div style="color:var(--dim);font-size:12px;line-height:1.7">
        ${I18N.t('pirate.earlyMsg',{turn:G.turn})}<br>
        ${I18N.t('pirate.approachingN',{n:eCount})}
      </div>
      <div style="margin-top:4px;color:var(--yellow);font-size:11px">${I18N.t('pirate.cumulativeWarn',{n:G.pirateAppearances,mult:getPirateAppMult().toFixed(2)})}</div>
    </div>
    ${_formatEnemyPreview(raidDef._enemies)}
    <div style="text-align:center;font-size:12px;color:var(--yellow);margin-top:6px">${I18N.t('pirate.winCredits')}</div>
    <div style="text-align:center;font-size:12px;color:var(--cyan);margin-top:4px">${_baekguIcon(18)} ${I18N.t('ui.baekguShort')}: "${G.pirateAppearances>=5?I18N.t('pirate.bk5'):G.pirateAppearances>=3?I18N.t('pirate.bk3'):I18N.t('pirate.bk0')}"</div>`,
    [{txt:I18N.t('ui.fight'),fn:()=>{closeModal();_safeCombatEntry(function(){startPirateRaid(raidDef);},"startPirateRaid");},cls:'btn-red'},
     {txt:I18N.t('ui.flee'),fn:()=>{closeModal();const p=Math.floor(G.credits*0.03);G.credits=Math.max(100,G.credits-p);changeReputation(-2);updateHUD();notify(I18N.t('notify.fleeWithCr',{cr:p.toLocaleString()}),'err');saveGame(true);hubTab('main');},cls:'btn-sm'}]
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

  const shipNames=[I18N.t('chix.battleship'),I18N.t('chix.cruiser'),I18N.t('chix.destroyer'),I18N.t('chix.gunship'),I18N.t('chix.carrier'),I18N.t('chix.assaultShip')];
  const enemies=Array.from({length:eCount},(_,i)=>({
    id:`CHIX_W${wave}_${i}`,
    nm:I18N.t('ui.cheeksShipPrefix',{nm:shipNames[i%shipNames.length]}),
    tier:_enemyTierBoost(i===0&&wave>=3?'대형':i<2&&wave>=2?'중형':'소형'),
    isEnemy:true,
    maxHP:Math.round(eHP*(i===0?1.4:1.0)),hp:Math.round(eHP*(i===0?1.4:1.0)),
    maxSH:Math.round(eHP*(i===0?0.6:0.35)),sh:Math.round(eHP*(i===0?0.6:0.35)),
    ATT:Math.round(eATK*(i===0?1.3:1.0)),INT:Math.round(eINT*(i===0?1.2:1.0)),
    TEC:Math.round(eTEC),HP:eHP,LOY:0,parts:[],crewIds:[]
  }));

  const waveLbl=[I18N.t('ui.wave1'),I18N.t('ui.wave2'),I18N.t('ui.wave3'),I18N.t('ui.wave4'),I18N.t('ui.wave5Final')][wave];
  const waveCol=wave>=4?'var(--red)':wave>=2?'var(--purple)':'#cc88ff';

  openModal(I18N.t('modal.chixFleetWave',{wave:waveLbl}),
    (function(){
      const _verC=(window._GAME_VER)?('?v='+encodeURIComponent(window._GAME_VER)):'';
      const _cImg='img/quests/combat_F05.png'+_verC;
      return _hostileVsHeader({enemyImg:_cImg,enemyName:I18N.t('chix.appearLabel',{wave:waveLbl,mult:Math.pow(1.20,wave).toFixed(2),now:G.chixWaves}),enemyFallback:'👾'});
    })()
    +`<div style="background:rgba(139,0,255,.08);border:1px solid #8b00ff66;border-radius:10px;padding:10px 12px;margin-bottom:10px">
      ${wave>=4?`<div style="color:var(--red);font-size:12px;font-weight:bold">${I18N.t('chix.finalLastChance')}</div>`:''}
    </div>
    ${_formatEnemyPreview(enemies)}
    <div style="font-size:12px;color:var(--dim);line-height:1.7">
      ${_baekguIcon(18)} ${I18N.t('ui.baekguShort')}: "${wave>=4?I18N.t('chix.bkFinal'):wave>=2?I18N.t('chix.bkMid'):I18N.t('chix.bkEarly')}"
    </div>`,
    [{txt:I18N.t('chix.fightBtn',{n:eCount}),fn:()=>{
      closeModal();
      const raidDef={...pd,_enemies:enemies,_chixWave:wave};
      startChixFleetCombat(raidDef);
    },cls:'btn-red'},
     {txt:I18N.t('ui.flee'),fn:()=>{
      closeModal();
      const loss=Math.floor(G.credits*0.03);
      G.credits=Math.max(100,G.credits-loss);
      G.stayTurns=0;changeReputation(-2);updateHUD();
      notify(I18N.t('notify.chixFleetFlee',{cr:loss.toLocaleString()}),'err');
      baekgu(I18N.t('baekgu.escapedJustNow'));
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
    const waveLbl=[I18N.t('ui.wave1'),I18N.t('ui.wave2'),I18N.t('ui.wave3'),I18N.t('ui.wave4'),I18N.t('ui.wave5Final')][wave];
    const t=document.getElementById('cb-title');if(t)t.textContent=I18N.t('combat.titleChixWave',{wave:waveLbl,nm:raidDef.nm});
    setTimeout(()=>{addCombatLog(I18N.t('combat.chixFleetAppear',{wave:waveLbl,n:raidDef._enemies.length}),'');runCombatTurn();},400);
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
    id:'PIRATE_RAID',nm:I18N.t('pirate.raidName'),ring:ring,f:'PIRATE',hostile:true,tax:0,
    _enemies:Array.from({length:eCount},(_,i)=>({
      id:`P${i}`,nm:I18N.t('ui.piratePrefix',{nm:I18N.t('ui.pirateShipNames').split('|')[i%5]}),tier:_enemyTierBoost(['소형','중형','소형','대형','소형'][i%5]),isEnemy:true,
      hp:eHP,maxHP:eHP,sh:Math.floor(eHP*.2),maxSH:Math.floor(eHP*.2),
      ATT:eATK,INT:eINT,TEC:eTEC,HP:eHP,LOY:0,parts:[],crewIds:[]
    }))
  };
  // 모달로 경고 먼저
  openModal(I18N.t('modal.pirateRaid'),
    (function(){
      // 사용자 요청 2026-06-09: 해적 전용 이미지 풀(FF01~FF08) 추가 활용
      const _prImg=pirateCombatImg(pd);
      return _hostileVsHeader({enemyImg:_prImg,enemyName:I18N.t('pirate.raidName'),enemyFallback:'☠️'});
    })()
    +`<div style="text-align:center;padding:0 6px 6px">
      <div style="color:var(--red);font-size:17px;font-weight:bold;margin-bottom:6px">${I18N.t('ui.pirateRaidHere',{nm:pd?.nm||''})}</div>
      <div style="color:var(--dim);font-size:13px;line-height:1.7">
        ${I18N.t('ui.pirateStayLeak',{n:G.stayTurns})}<br>
        <span style="color:var(--yellow)">${I18N.t('ui.winLootLoseCr')}</span>
      </div>
    </div>
    ${_formatEnemyPreview(raidDef._enemies)}
    <div style="font-size:12px;color:var(--cyan);text-align:center">${_baekguIcon(18)} ${I18N.t('ui.baekguShort')}: "${I18N.t('baekgu.pirateWarn')}"</div>`,
    [{txt:I18N.t('ui.startBattle'),fn:()=>{
        closeModal();
        // 사용자 보고 2026-06-09: 전투 진입 안 됨 — 컷씬 오버레이 잔존 시 강제 정리 + 함수 존재 가드
        try{ var _ov=document.getElementById('story-scene-overlay'); if(_ov)_ov.remove(); }catch(e){}
        if(typeof startPirateRaid!=='function'){console.error('[combat] startPirateRaid 미정의');notify(I18N.t('err.combatInitFail')||'전투 시스템 로드 실패','err');return;}
        try{ startPirateRaid(raidDef); }catch(e){console.error('[combat] startPirateRaid threw',e);notify('전투 진입 오류: '+e.message,'err');}
     },cls:'btn-red'},
     {txt:I18N.t('ui.flee'),fn:()=>{closeModal();escapePirateRaid();},cls:'btn-sm'}]
  );
  saveGame(true);
}
// 사용자 보고 2026-06-09: 전투 진입 실패 공통 처리
//   · 모달 클릭 핸들러에서 사용 — 함수 미정의/throw 시 명확한 에러 + 다음 시도 차단
//   · 컷씬 오버레이 잔존 시 강제 정리
function _safeCombatEntry(fn,name){
  try{
    if(typeof window!=='undefined'){
      var _ov=document.getElementById('story-scene-overlay');
      if(_ov)_ov.remove();
    }
    if(typeof fn!=='function'){
      console.error('[combat] '+(name||'entry')+' 미정의');
      notify('전투 시스템 함수 미로드: '+(name||'entry')+' — 페이지 새로고침 후 재시도','err');
      return;
    }
    fn();
  }catch(e){
    console.error('[combat] '+(name||'entry')+' threw:',e);
    notify('전투 진입 오류 ('+(name||'entry')+'): '+e.message,'err');
  }
}
try{if(typeof window!=='undefined')window._safeCombatEntry=_safeCombatEntry;}catch(e){}

function startPirateRaid(raidDef){
  // 해적/적대 만남 시 통행료 시비 팝업 (사용자 요청) — raidDef 세션당 1회만
  // 사용자 보고 2026-06-09: 전투 메세지 뜬 이후 전투가 안 시작되는 경우
  //   · 원인: _showShakedownPopup 이 throw 하거나 undefined 면 _shakedownDone 만
  //     true 로 마킹되고 콜백 미발화 → 전투 영구 미진입
  //   · 수정: 팝업 호출을 try/catch 로 보호 + 실패 시 즉시 전투로 진행
  if(raidDef&&!raidDef._shakedownDone){
    raidDef._shakedownDone=true;
    if(typeof _showShakedownPopup==='function'){
      try{
        _showShakedownPopup(raidDef,()=>startPirateRaid(raidDef));
        return;
      }catch(e){
        console.warn('[combat] shakedown popup failed — proceeding to combat:',e);
        // fall through to actual combat
      }
    } else {
      console.warn('[combat] _showShakedownPopup 미정의 — 시비 단계 스킵');
    }
  }
  // 사용자 보고 2026-06-09: 전투 진입 단계 전체를 try/catch 로 보호
  try{
    const players=G.fleet.map(s=>{const st=getShipStats(s);const _wpn=PARTS.find(p=>p.cat==='weapon'&&(s.parts||[]).includes(p.id));const _wrar=_wpn?(_wpn.rarity||''):'';const _shp=PARTS.find(p=>p.cat==='shield'&&(s.parts||[]).includes(p.id));const _shTier=_shp?(_shp.tier||0):0;const _arp=PARTS.find(p=>p.cat==='armor'&&(s.parts||[]).includes(p.id));const _arTier=_arp?(_arp.tier||0):0;return{...s,isEnemy:false,hp:Math.max(1,s.hp||st.HP),maxHP:st.HP,sh:(s.sh!=null?s.sh:st.maxSH),maxSH:st.maxSH,ATT:st.ATT,INT:st.INT,TEC:st.TEC,DEF:st.DEF||0,wtype:_wpn?(_wpn.wtype||'laser'):'laser',wpnTier:_wpn?(_wpn.tier||1):1,wpnRarity:_wrar,shieldTier:_shTier,armorTier:_arTier,tier:s.tier||'소형'};});
    combatState={players,enemies:raidDef._enemies,turn:0,done:false,log:[],planetDef:raidDef,isBoss:false,isPirate:true,_planetId:G.currentPlanet};
    renderCombatView(document.getElementById('hub-body'));
    setHubNav('combat');updateHUD();sfxAlert();try{AudioMgr.playBgm('combat');}catch(e){}
    const _plv=calcPlayerLevel(),_plm=getLevelMult();
    requestAnimationFrame(()=>{
      try{
        initCombatCanvas();
        const t=document.getElementById('cb-title');if(t)t.textContent=I18N.t('combat.title.pirateRaid');
        setTimeout(function(){
          if(combatState&&!combatState.done){
            try{
              addCombatLog(I18N.t('combat.pirateRaidStat',{plv:_plv,mult:_plm.toFixed(2)}),'');
              runCombatTurn();
            }catch(e){
              console.error('[combat] first turn failed:',e);
              notify('전투 첫 턴 오류: '+e.message,'err');
            }
          }
        },800);
      }catch(e){
        console.error('[combat] canvas init failed:',e);
        notify('전투 화면 초기화 오류: '+e.message,'err');
      }
    });
  }catch(e){
    console.error('[combat] startPirateRaid fatal:',e);
    notify('전투 진입 실패: '+e.message+' (페이지 새로고침 후 재시도)','err');
    // 실패 시 raidDef._shakedownDone 리셋하지 않음 — 재시도 시 같은 경로 반복 방지
    combatState=null;
  }
}
function escapePirateRaid(){
  const penalty=Math.floor(G.credits*0.03);
  G.credits=Math.max(0,G.credits-penalty);
  G.stayTurns=0;
  changeReputation(-2);
  updateHUD();
  notify(I18N.t('notify.fleeSuccess',{cr:penalty.toLocaleString()}),'err');
  baekgu(I18N.t('baekgu.fled'));
  try{saveGame(true);}catch(e){}  // 페널티 상태 영속화 (이전 누락: 새로고침 시 차감 분실)
  hubTab('main');
}
function changeReputation(delta){if(!G.reputation)G.reputation=0;G.reputation=clamp(G.reputation+delta,0,9999);updateHUD();}
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
// ─── 화물·재료 정합성 검증 (함선 교체·로드 시 자동 호출) ──────────
// 1) 동일 id+material 슬롯 통합 (mergeCargoById 호출)
// 2) 0 이하 qty 슬롯 제거
// 3) G.materials 카운터를 G.cargo의 material 슬롯 qty와 일치시킴
//    (저장 직렬화/직접 수정 등으로 두 출처가 어긋나면 수정)
// 4) nm 필드 누락 시 COMMODITIES에서 자동 보완
function _validateCargoIntegrity(){
  if(!G.cargo)G.cargo=[];
  if(!G.materials)G.materials={};
  // 1) 슬롯 통합
  mergeCargoById();
  // 2) 0 이하 qty 슬롯 제거
  G.cargo=G.cargo.filter(s=>s&&s.qty>0);
  // 3) material 슬롯 qty를 G.materials 카운터의 단일 출처로 — 더 큰 값 채택
  //    (재료는 화물칸·재료창고 두 곳에서 카운트되므로 어긋나면 큰 쪽을 유지)
  const matCargoSums={};
  G.cargo.forEach(s=>{if(s.material)matCargoSums[s.id]=(matCargoSums[s.id]||0)+s.qty;});
  Object.keys(matCargoSums).forEach(id=>{
    const cargoQty=matCargoSums[id];
    const matQty=G.materials[id]||0;
    const trueQty=Math.max(cargoQty,matQty);
    G.materials[id]=trueQty;
    // cargo의 해당 material 슬롯들의 qty 합이 trueQty가 되도록 조정 (단일 슬롯로 통합되어 있음 — mergeCargoById 후)
    const slot=G.cargo.find(s=>s.id===id&&s.material);
    if(slot&&slot.qty!==trueQty)slot.qty=trueQty;
  });
  // 3b) G.materials 에 있는데 G.cargo 에 슬롯이 없는 재료 → 신규 슬롯 추가 (화물칸 가득 차 있던 동안 매입한 재료 복구)
  //     함선 교체 등으로 화물칸 여유 생겼을 때 자동으로 거래소에 노출·판매 가능해짐 (사용자 보고 픽스)
  if(typeof COMMODITIES!=='undefined'){
    Object.keys(G.materials||{}).forEach(id=>{
      const matQty=G.materials[id]||0;
      if(matQty<=0)return;
      const existingSlot=G.cargo.find(s=>s.id===id&&s.material);
      if(existingSlot){
        if(existingSlot.qty!==matQty)existingSlot.qty=matQty;
        // 사용자 보고 (2026-06-06): 기존 슬롯의 buyPrice 가 0이면 COMMODITIES 정가로 복원
        //   → sellComm에서 폴백 가격이 정상 계산되어 매각 차단 해소
        const _commFix=COMMODITIES.find(c=>c.id===id);
        if(_commFix&&(!existingSlot.buyPrice||existingSlot.buyPrice<=0))existingSlot.buyPrice=_commFix.buy||0;
        return;
      }
      const comm=COMMODITIES.find(c=>c.id===id);
      if(!comm)return;
      G.cargo.push({id:id,nm:comm.nm,qty:matQty,buyPrice:comm.buy||0,buyPlanetId:'unknown',material:true});
    });
  }
  // 4) nm 필드 누락 보완 + material 플래그 복원
  //    사용자 보고 (2026-06-06): 함선 교체 후 일부 재료의 material 플래그가 손실되어
  //    매각 분기가 잘못 타는 현상 — COMMODITIES 정의 기준으로 material 플래그 강제 복원.
  if(typeof COMMODITIES!=='undefined'){
    G.cargo.forEach(s=>{
      const c=COMMODITIES.find(x=>x.id===s.id);
      if(c){
        if(!s.nm)s.nm=c.nm;
        // material 플래그는 COMMODITIES 정의를 단일 진실로 신뢰
        if(c.material&&!s.material)s.material=true;
      }
    });
  }
}
try{if(typeof window!=='undefined')window._validateCargoIntegrity=_validateCargoIntegrity;}catch(e){}
// bugfix 2026-06-12: 재료 소비 단일 진입점 — G.materials 카운터와 G.cargo 슬롯을 함께 차감.
//   한쪽만 차감하면 _validateCargoIntegrity 의 max() 보정이 "유령 수량"을 부활시켜
//   표시 보유량과 실제 사용 가능량이 어긋나던 문제(사용자 보고: 함선 판매/교체 후 재료 숫자 불일치) 해결.
function consumeMaterialQty(id,n){
  n=n||1;
  if(!G.materials)G.materials={};
  G.materials[id]=Math.max(0,(G.materials[id]||0)-n);
  const _slot=(G.cargo||[]).find(s=>s.id===id&&s.material);
  if(_slot){
    _slot.qty=Math.max(0,_slot.qty-n);
    if(_slot.qty===0)G.cargo.splice(G.cargo.indexOf(_slot),1);
  }
}
try{if(typeof window!=='undefined')window.consumeMaterialQty=consumeMaterialQty;}catch(e){}
function calcSellPrice(cargoItem,sellPlanetId){
  const comm=COMMODITIES.find(c=>c.id===cargoItem.id);
  const marcoMult=(G&&G.heroes&&G.heroes.includes('H08'))?1.20:1.0;
  // 전리품(해적·치크스·적대 전투에서 획득): 평균가에 매각 (사용자 요청 — 너무 비싸게 팔리던 문제 완화)
  if(cargoItem.loot&&comm){
    const _buy=comm.buy||0;
    const _max=comm.maxSell||_buy;
    return Math.floor(((_buy+_max)/2)*marcoMult);
  }
  // 영입 재료(특수 비-재료, 예: 난중일기 영인본 G18): maxSell 최대가로 매각 — UI 가격 표시 일관성
  if(comm&&comm.special&&!comm.material){
    return Math.floor((comm.maxSell||comm.buy||0)*marcoMult);
  }
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
  // ── 거리 보너스: 매입↔판매 행성이 멀수록 추가 수익 (사용자 요청) ──
  //   링(반지름)·각도를 좌표로 변환해 실제 은하 거리 계산 → 최대 +60%.
  const _toXY=(p)=>{const r=(p.ring||0),a=(p.ang||0)*Math.PI/180;return [r*Math.cos(a),r*Math.sin(a)];};
  const _A=_toXY(bp),_B=_toXY(sp);
  const _dist=Math.hypot(_A[0]-_B[0],_A[1]-_B[1]);
  const _distMul=1+Math.min(0.6,_dist*0.06);   // 멀수록 최대 +60%
  let base;
  if(bp.f===sp.f){
    // 동일 문명: 낮은 기본 마진 + 거리 비례
    base=Math.floor(cargoItem.buyPrice*1.05*_distMul);
  } else {
    // 이종 문명 보너스(4~5×) 유지 + 거리 비례 추가
    const dR=Math.abs(bp.ring-sp.ring)+.1*Math.min(Math.abs(bp.ang-sp.ang),360-Math.abs(bp.ang-sp.ang));
    const margin=dR<=2?4.0:dR>=4?5.0:4.0+(dR-2)/2;
    base=Math.floor(cargoItem.buyPrice*margin*_distMul);
  }
  // 상한도 거리 비례로 함께 상향 → 거리 보너스가 maxSell 에 막히지 않게
  const maxSellAdjusted=(marcoMult>1?Math.floor(comm.maxSell*marcoMult):comm.maxSell);
  return Math.min(Math.floor(base*marcoMult),Math.floor(maxSellAdjusted*_distMul));
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
// ─── 거래 탭 (renderTradeTab + buy/sell) → js/modules/render-trade-tab.js 로 분할 (Phase B3, 2026-06-10) ───
//   buyComm/buyComm5/buyCommN/buyCommMax/sellComm 모두 window 전역 노출, HTML onclick 무변경

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
// 장영실(H02) 보유 시 수리비 40% 할인
function getJangRepairMult(){return (G.heroes&&G.heroes.includes('H02'))?0.60:1.0;}
function repairCost(s){
  const b=getPartBonus(s);
  const effMax=s.maxHP+(b.hp||0);
  const base=Math.floor((effMax-Math.min(s.hp,effMax))*(s.tier==='신화'?600:s.tier==='전설기함'?500:s.tier==='대형'?200:s.tier==='중형'?150:100));
  const raw=Math.floor(base*getFactionPassive().repairDisc*getJangRepairMult());
  // 함선 구매 가격 초과 불가 — 카탈로그 없는 함선은 등급별 기본가 사용
  const shipDef=SHIP_CATALOG.find(x=>x.id===(s.id||'').replace(/(?:_\d+|_main)$/,''));
  const tierFallback=s.tier==='신화'?25000000:s.tier==='전설기함'?3000000:s.tier==='대형'?200000:s.tier==='중형'?50000:10000;
  const shipPrice=shipDef?shipDef.price:tierFallback;
  return Math.min(raw,Math.floor(shipPrice*0.8));
}
function shRepairCost(s){
  const b=getPartBonus(s);
  const effMax=s.maxSH+(b.sh||0);
  const rawSH=Math.floor((effMax-Math.min(s.sh,effMax))*80*getJangRepairMult());
  // 실드 수리비 — 함선 가격의 20% 상한, 카탈로그 없는 함선도 등급별 기본가 적용
  const shipDef=SHIP_CATALOG.find(x=>x.id===(s.id||'').replace(/(?:_\d+|_main)$/,''));
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
try{if(typeof window!=='undefined')window.RARITY_MULT=RARITY_MULT;}catch(e){}  // bugfix 2026-06-11: 모듈 호환 노출
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
  // 신화 함선실: 4열×6행=24 기본 (사용자 요청 2026-06-16)
  const tierMin=t==='신화'?24:t==='전설기함'?20:t==='대형'?16:t==='중형'?10:8;
  // 인스턴스/카탈로그 override가 더 크면 사용, 아니면 티어 기본 (티어 기본이 최소 보장)
  let base=tierMin;
  if(typeof ship.crewMax==='number'&&ship.crewMax>tierMin)base=ship.crewMax;
  else{
    const cid=String(ship.catalogId||ship.catId||ship.id||'').replace(/(?:_\d+|_main)$/,'');
    const def=cid?SHIP_CATALOG.find(d=>d.id===cid):null;
    if(def&&typeof def.crewMax==='number'&&def.crewMax>tierMin)base=def.crewMax;
  }
  // 베이스 상한: 신화 24 · 그 외 20. 구매 확장(crewMaxExtra: 6×N) 가산 후 절대 상한: 신화 48 · 그 외 32.
  const _baseCap=t==='신화'?24:20;
  const _absCap=t==='신화'?48:32;
  const extra=(+ship.crewMaxExtra)||0;
  return Math.min(_absCap, Math.min(_baseCap,base)+extra);
}
// 함선실(크루) 확장 — 6칸(1열)당 1회 구매 (사용자 요청 2026-06-16: 가로로 6칸씩). 신화 24→48까지 4회.
const CREW_EXT_PER=6;
const CREW_EXT_MAX_BUYS=4;
function getCrewMaxUpgradePrice(s){
  if(!s)return 0;
  const cnt=Math.floor(((+s.crewMaxExtra)||0)/CREW_EXT_PER);
  // 티어별 기본가 — 사용자 요청: 10만 크레딧 수준
  const tierBase={소형:80000,중형:100000,대형:140000,전설기함:200000,신화:280000}[s.tier]||100000;
  return Math.round(tierBase*Math.pow(1.5,cnt)/1000)*1000;
}
function upgradeCrewMax(shipIdx,fromModal){
  const s=G.fleet[shipIdx];if(!s)return;
  const cnt=Math.floor(((+s.crewMaxExtra)||0)/CREW_EXT_PER);
  if(cnt>=CREW_EXT_MAX_BUYS){
    notify(I18N.t('notify.crewQuartersMax',{nm:shipDisplayNm(s),max:CREW_EXT_MAX_BUYS*CREW_EXT_PER}),'warn');
    return;
  }
  const cost=getCrewMaxUpgradePrice(s);
  if(G.credits<cost){notify(I18N.t('notify.needCreditsCost',{cost:cost.toLocaleString()}),'err');return;}
  G.credits-=cost;
  s.crewMaxExtra=((+s.crewMaxExtra)||0)+CREW_EXT_PER;
  updateHUD();
  notify(I18N.t('notify.crewQuartersExpand',{nm:shipDisplayNm(s),add:CREW_EXT_PER,max:getMaxCrew(s),cost:cost.toLocaleString()}),'gold');
  saveGame(true);
  if(fromModal&&typeof showShipDetailModal==='function')showShipDetailModal(shipIdx);
  else rerenderShipOrGarage();
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
// Phase B1 (2026-06-10): render-ship-tab.js 모듈에서도 참조 — `let` → window 속성으로 변환
//   비엄격 모드에서 bare `_shipTab` 참조는 window._shipTab 으로 자동 해석됨
if(typeof window._shipTab==='undefined')window._shipTab='buy'; // buy | parts | fleet
// Phase B1 수정 (2026-06-10): 정렬 상태 변수도 render-ship-tab.js 모듈에서 참조 — window 속성 변환
if(typeof window._shopShipSort==='undefined')window._shopShipSort='price'; // price | tier × asc | desc
if(typeof window._shopShipSortDir==='undefined')window._shopShipSortDir='asc';
if(typeof window._myShipSort==='undefined')window._myShipSort='price';
if(typeof window._myShipSortDir==='undefined')window._myShipSortDir='asc';
try{if(typeof window!=='undefined'){
  // 같은 키 재클릭 시 방향 토글, 다른 키 클릭 시 방향은 asc 로 초기화
  window._setShopShipSort=function(k){
    if(_shopShipSort===k)_shopShipSortDir=(_shopShipSortDir==='asc'?'desc':'asc');
    else{_shopShipSort=k;_shopShipSortDir='asc';}
    try{rerenderTab(renderShipTab);}catch(e){}
  };
  window._setMyShipSort=function(k){
    if(_myShipSort===k)_myShipSortDir=(_myShipSortDir==='asc'?'desc':'asc');
    else{_myShipSort=k;_myShipSortDir='asc';}
    try{rerenderTab(renderShipTab);}catch(e){}
  };
}}catch(e){}
let _fleetSort='hp'; // tier | att | hp | name (사용자 요청: 기본값 = 내구도)
let _garageSubTab='parts'; // parts | crew | cargo
let _partSort='tier'; // tier | priceAsc | priceDesc | nm — 파츠 구매 정렬
let _invPartSort='tier'; // tier | priceAsc | priceDesc | nm — 보유 파츠(매각) 정렬
function buildCrewManifest(s,idx){
  const ids=s.crewIds||[];
  if(ids.length===0)return`<div style="font-size:11px;color:var(--dim)">${I18N.t('ui.noCrewAboard')}</div>`;
  const RC={N:'#888',R:'var(--blue)',H:'var(--purple)',L:'var(--gold)',S:'#ff6ec7'};
  const rows=ids.map((cid,ci)=>{
    const c=G.crew.find(x=>x.id===cid)||G.heroes.map(h=>({...HEROES[h],id:h,isHero:true,rarity:'S'})).find(x=>x.id===cid);
    if(!c)return'';
    const rc=RC[c.rarity]||'#888';
    const rnm=I18N.rarity(c.rarity)||'';
    const cb2=CREW_BONUS_TABLE[c.cl]||{att:3,int2:3,tec:3};
    const m2=RARITY_MULT[c.rarity]||1;
    const slotCost2={N:1,R:1,H:2,L:4,S:4}[c.rarity]||1;
    const b2=[cb2.att?'ATT+'+Math.round(cb2.att*m2):'',cb2.int2?'SHD+'+Math.round(cb2.int2*m2):'',cb2.tec?'ENG+'+Math.round(cb2.tec*m2):''].filter(Boolean).join(' ');
    return '<div style="display:flex;align-items:center;gap:6px">'
      +'<span style="font-size:17px;flex-shrink:0">'+(c.ic||'🧑')+'</span>'
      +'<div style="flex:1;min-width:0">'
        +'<div style="font-size:12px;font-weight:bold;color:'+rc+';'+(c.rarity==="L"||c.isHero?'text-shadow:0 0 5px '+rc+'.6':'')+'">'+(c.isHero?'⭐ ':c.rarity==="L"?'✨ ':'')+crewDisplayNm(c)+' <span style="font-size:11px;opacity:.7">['+rnm+']</span></div>'
        +'<div style="font-size:11px;color:var(--dim)">'+(c.cl||'')+( b2?' · '+b2:'')+'</div>'
      +'</div>'
      +'<button onclick="unassignCrew('+idx+','+ci+')" style="background:none;border:1px solid rgba(255,60,60,.3);border-radius:3px;color:var(--red);cursor:pointer;padding:1px 5px;font-size:11px;flex-shrink:0">'+I18N.t('ui.disembark')+'</button>'
      +'</div>';
  }).filter(Boolean).join('');
  return '<div style="background:rgba(0,243,255,.04);border:1px solid rgba(0,243,255,.12);border-radius:6px;padding:7px 10px">'
    +'<div style="font-size:11px;color:var(--dim);margin-bottom:5px;letter-spacing:.5px">'+I18N.t('ui.boardingList')+'</div>'
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
    const cid=String(s.catalogId||s.catId||s.id||'').replace(/(?:_\d+|_main)$/,'');
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
    notify(I18N.t('notify.partsSlotMax',{nm:shipDisplayNm(s),rows:_baseRowsActual+maxExtra}),'warn');
    return;
  }
  const cost=getPartsUpgradePrice(s);
  if(G.credits<cost){notify(I18N.t('notify.needCreditsCost',{cost:cost.toLocaleString()}),'err');return;}
  G.credits-=cost;
  s.partsRowsExtra=cur+1;
  const newRows=getShipPartsGridRows(s);
  const cols=getShipPartsGridCols(s.tier);
  updateHUD();
  notify(I18N.t('notify.partsSlotExpand',{nm:shipDisplayNm(s),rows:newRows,cols,total:newRows*cols,cost:cost.toLocaleString()}),'gold');
  baekgu(I18N.t('baekgu.partSlotsAdded',{nm:shipDisplayNm(s)}));
  saveGame(true);
  if(fromModal&&typeof showShipDetailModal==='function')showShipDetailModal(shipIdx);
  else rerenderShipOrGarage();
}
function layoutPartsGrid(partIds,COLS,ROWS){
  var grid=[];for(var _r=0;_r<ROWS;_r++){var row=[];for(var _c=0;_c<COLS;_c++)row.push(null);grid.push(row);}
  var result=[];
  function canPlace(r,c,sr,sc){if(r+sr>ROWS||c+sc>COLS)return false;for(var dr=0;dr<sr;dr++)for(var dc=0;dc<sc;dc++)if(grid[r+dr][c+dc]!==null)return false;return true;}
  function markGrid(r,c,sr,sc,key){for(var dr=0;dr<sr;dr++)for(var dc=0;dc<sc;dc++)grid[r+dr][c+dc]=key;}
  // 큰 파츠(2×2)가 1×1로 강등되거나 누락되지 않도록, 면적 내림차순 정렬 후 배치.
  // 원본 인덱스(pi)는 click 핸들러에서 s.parts[pi] 참조에 그대로 쓰이므로 보존.
  var queue=[];
  for(var pi=0;pi<partIds.length;pi++){
    var p=null;for(var xi=0;xi<PARTS.length;xi++){if(PARTS[xi].id===partIds[pi]){p=PARTS[xi];break;}}
    if(!p)continue;
    var gs=getPartGridSize(p);
    queue.push({pid:partIds[pi],pi:pi,p:p,sr:gs.rows,sc:gs.cols,area:gs.rows*gs.cols});
  }
  queue.sort(function(a,b){return b.area-a.area;});
  for(var qi=0;qi<queue.length;qi++){
    var it=queue[qi];var sc=it.sc;var sr=it.sr;
    var done=false;
    outer1:for(var r=0;r<ROWS;r++)for(var c=0;c<COLS;c++){if(canPlace(r,c,sr,sc)){markGrid(r,c,sr,sc,String(it.pi));result.push({r:r,c:c,spanR:sr,spanC:sc,pid:it.pid,pi:it.pi,p:it.p});done=true;break outer1;}}
    if(!done){outer2:for(var r=0;r<ROWS;r++)for(var c=0;c<COLS;c++){if(canPlace(r,c,1,1)){markGrid(r,c,1,1,String(it.pi));result.push({r:r,c:c,spanR:1,spanC:1,pid:it.pid,pi:it.pi,p:it.p,forced:true});done=true;break outer2;}}}
  }
  for(var r=0;r<ROWS;r++)for(var c=0;c<COLS;c++)if(grid[r][c]===null)result.push({r:r,c:c,spanR:1,spanC:1,pid:null});
  return result;
}
// ─── 정비소 함선 탭 렌더 → js/modules/render-ship-tab.js 로 분할 (Phase B1, 2026-06-10) ───
//   renderShipTab 함수 window 전역 노출 — game.js 내부 호출처(rerenderTab/hubTab/switchShipTab) 무변경
// 인벤토리의 일반/희귀/영웅 파츠 일괄 매각 (전설/신화/세트 제외, 함선 장착 파츠는 인벤토리에 없음 → 자동 제외)
function sellAllPartsBulk(){
  if(!G.inventory||G.inventory.length===0){notify(I18N.t('notify.noPartsOwned'),'warn');return;}
  const hasMarco=G.heroes&&G.heroes.includes('H08');
  const _mul=hasMarco?1.1:1;
  const sellable=G.inventory.filter(i=>{
    if(i.qty<=0)return false;
    const p=PARTS.find(x=>x.id===i.id);
    if(!p)return false;
    return !['legend','mythic','set','hero'].includes(p.rarity);
  });
  if(sellable.length===0){notify(I18N.t('notify.noSellableParts'),'warn');return;}
  const totalQty=sellable.reduce((s,i)=>s+i.qty,0);
  const totalCr=sellable.reduce((s,i)=>{const p=PARTS.find(x=>x.id===i.id);return s+Math.floor((p.price||0)*0.5*_mul)*i.qty;},0);
  if(!confirm(I18N.t('ui.bulkSellParts',{n:totalQty,cr:totalCr.toLocaleString(),marco:hasMarco?I18N.t('ui.marcoBonusSuffix'):''})))return;
  // 매각 실행 + 되돌리기용 스냅샷 (개수까지 깊은 복사)
  const _undoParts=sellable.map(i=>({id:i.id,qty:i.qty}));
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
  try{_recordSell({type:'bulkPart',parts:_undoParts,credits:totalCr,label:I18N.t('sell.bulkPartLabel',{n:totalQty})});}catch(e){}
  updateHUD();
  notify(I18N.t('notify.partsBulkSell',{n:totalQty,cr:totalCr.toLocaleString()}),'gold');
  baekgu(I18N.t('baekgu.scrapSold',{cr:totalCr.toLocaleString()}));
  saveGame(true);
  rerenderShipOrGarage();
}

// ── 매각 취소(되돌리기) 시스템 → js/modules/sell-undo.js 로 분할 (2026-06-13, 사용자 요청: 긴 코드 분할)

// ── 함선 정비 탭 (스킨·강화·편대·수리·매각) → js/modules/ship-skin-enhance.js 로 분할 (2026-06-13, 사용자 요청: 긴 코드 분할)

// ═══ CREW / PLANETS ═════════════════════════════════════════════
let _crewSort='rarity'; // rarity | name | cl
// 크루 임시 초상 — 퀘스트 의뢰 이미지(img/quests/<type>_F<NN>) 재사용.
//   직업(class)→의뢰 유형, 팩션/행성→F번호. f 없으면 id 해시로 1~7 결정론 부여.
//   ※ 임시 처리: 추후 전용 크루 초상 추가 시 교체.
function _crewQuestImg(c){
  if(!c)return 'img/quests/explore_F01.png';
  const _typeByCl={Pilot:'combat',Sniper:'combat',Commander:'combat',Merch:'delivery',Eng:'gather',Engineer:'gather',Mage:'explore'};
  const type=_typeByCl[c.cl]||'explore';
  let fn=0;
  if(c.f&&/^F0[1-7]$/.test(c.f))fn=parseInt(c.f.slice(1),10);
  else{const s=String(c.id||c.nm||'x');let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;fn=(h%7)+1;}
  const _v=(typeof window!=='undefined'&&window._GAME_VER)?('?v='+encodeURIComponent(window._GAME_VER)):'';
  return 'img/quests/'+type+'_F'+String(fn).padStart(2,'0')+'.png'+_v;
}
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

  body.innerHTML=`<div class="hub-scroll">${hubBanner('crew','👥',I18N.t('crew.tabLabel'))}<div class="hub-t">${I18N.t('crew.header',{n:G.crew.length,max:getMaxCrewCount()})}
    <span style="font-size:12px;font-weight:normal;color:var(--dim);margin-left:8px">${I18N.t('ui.sortPrefix')}</span>
    ${sortBtn('rarity',I18N.t('ui.sortByRarity'))}${sortBtn('cl',I18N.t('ui.sortByClass'))}${sortBtn('name',I18N.t('ui.sortByName'))}
    <button onclick="dismissLowestCrew(1)" style="margin-left:10px;padding:6px 16px;border:1px solid rgba(255,80,80,.6);background:rgba(255,40,40,.12);color:rgba(255,150,150,1);cursor:pointer;border-radius:5px;font-size:13px;font-family:Courier New,monospace;font-weight:bold" title="${I18N.t('title.forceCrewDismiss')}">${I18N.t('crew.dismissLowest1')}</button>
    <button onclick="dismissLowestCrew(5)" style="margin-left:4px;padding:6px 16px;border:1px solid rgba(255,80,80,.6);background:rgba(255,40,40,.12);color:rgba(255,150,150,1);cursor:pointer;border-radius:5px;font-size:13px;font-family:Courier New,monospace;font-weight:bold" title="${I18N.t('title.forceCrewDismiss')}">${I18N.t('crew.dismissLowest5')}</button>
    <button onclick="dismissLowestCrew(10)" style="margin-left:4px;padding:6px 16px;border:1px solid rgba(255,80,80,.7);background:rgba(255,40,40,.15);color:rgba(255,180,180,1);cursor:pointer;border-radius:5px;font-size:13px;font-family:Courier New,monospace;font-weight:bold" title="${I18N.t('title.forceAllCrewDismiss')}">${I18N.t('crew.dismissLowest10')}</button>
    <button onclick="dismissCrewBelowRare()" style="margin-left:4px;padding:6px 16px;border:1px solid rgba(255,120,40,.7);background:rgba(255,120,40,.18);color:rgba(255,200,140,1);cursor:pointer;border-radius:5px;font-size:13px;font-family:Courier New,monospace;font-weight:bold" title="${I18N.t('crew.belowRareTitle')}">${I18N.t('crew.dismissBelowRare')}</button>
    ${_lastDismissedCrew&&_lastDismissedCrew.crew&&_lastDismissedCrew.crew.length>0?`<button onclick="undoDismissCrew()" style="margin-left:10px;padding:6px 16px;border:1px solid rgba(0,243,255,.6);background:rgba(0,243,255,.12);color:var(--cyan);cursor:pointer;border-radius:5px;font-size:13px;font-family:Courier New,monospace;font-weight:bold;animation:pulse 1.5s infinite" title="${_lastDismissedCrew.crew.map(e=>crewDisplayNm(e.data)).join(', ')}">${I18N.t('crew.undoDismiss',{n:_lastDismissedCrew.crew.length})}</button>`:''}
  </div>
    ${sorted.length===0?`<div style="color:var(--dim);font-size:14px">${I18N.t('ui.recruitAtTavern')}</div>`
    :`<div class="crew-grid">${sorted.map(c=>{
      const gen=(c.ic||'👩').includes('👩')||c.nm?.endsWith('a')?'f':'m';
      const assignedShip=G.fleet.find(sh=>(sh.crewIds||[]).includes(c.id));
      const rarityNm=I18N.rarity(c.rarity)||c.rarity;
      const rarityCol={N:'var(--dim)',R:'var(--blue)',H:'var(--purple)',L:'var(--gold)',S:'#ff6ec7'}[c.rarity]||'var(--dim)';
      const cb=CREW_BONUS_TABLE[c.cl]||{att:3,int2:3,tec:3,hp:0,sh:0};
      const m=RARITY_MULT[c.rarity]||1;
      const bonusTxt=Object.entries(cb).filter(([,v])=>v>0).map(([k,v])=>`${k.replace('int2','SHD').replace('att','ATT').replace('tec','ENG').replace('def','DEF')}+${Math.round(v*m)}`).join(' ');
      return`<div class="crew-c" style="border:1px solid ${assignedShip?'rgba(0,243,255,.3)':'var(--bdr)'};position:relative">
        <div class="crew-av" style="position:relative;overflow:hidden;justify-content:center">${imgOrEmoji(_crewQuestImg(c),c.ic||'🧑',64,64,'border-radius:50%;background:var(--panel);border:2px solid '+rarityCol+';object-fit:cover')}</div>
        <div class="crew-nm" style="color:${rarityCol};${c.rarity==='L'?'text-shadow:0 0 6px rgba(212,175,55,.5);font-size:14px':''}" title="${crewDisplayNm(c)}">${crewDisplayNm(c)||I18N.t('ui.unnamed')}</div>
        <div class="crew-cl">${c.cl}</div>
        <div style="font-size:12px;color:${rarityCol};font-weight:bold">${rarityNm}</div>
        <div style="font-size:11px;color:var(--dim);margin-top:2px">${bonusTxt||'-'}</div>
        <div style="margin-top:4px">
          ${assignedShip?`<div style="font-size:11px;color:var(--cyan);margin-bottom:3px">🛸 ${shipDisplayNm(assignedShip)}</div>`:''}
          <select id="cs_${c.id}" style="font-size:10px;background:var(--panel);border:1px solid ${assignedShip?'var(--cyan)':'var(--bdr)'};color:white;border-radius:3px;padding:1px;width:100%">
            ${G.fleet.length===1?'':`<option value="">${I18N.t('ui.shipPickerPlaceholder')}</option>`}
            ${G.fleet.map((sh,si)=>`<option value="${si}" ${assignedShip===sh||(G.fleet.length===1&&si===0)?'selected':''}>[${I18N.tier(sh.tier)}] ${shipDisplayNm(sh)} (${(sh.crewIds||[]).length}/${getMaxCrew(sh)})</option>`).join('')}
          </select>
          <div style="display:flex;gap:4px;margin-top:4px">
            <button class="btn btn-sm" style="font-size:11px;flex:1;padding:3px 4px;${assignedShip?'border-color:var(--cyan);color:var(--cyan)':''}" onclick="assignCrewFromCrewTab('${c.id}')">${assignedShip?I18N.t('ui.crewMoveBtn'):I18N.t('ui.crewBoardBtn')}</button>
            ${assignedShip?`<button style="font-size:11px;padding:3px 6px;border:1px solid var(--red);border-radius:4px;background:none;color:var(--red);cursor:pointer" onclick="unassignCrewById('${c.id}')">${I18N.t('ui.disembark')}</button>`:''}
          </div>
          <button style="margin-top:3px;font-size:10px;padding:3px 0;width:100%;border:1px solid rgba(255,60,60,.5);border-radius:5px;background:rgba(255,40,40,.08);color:rgba(255,110,110,.9);cursor:pointer" onclick="_doDismissCrew('${c.id}')">${I18N.t('ui.crewExpelBtn')}</button>
        </div>
      </div>`;
    }).join('')}</div>`}
    ${G.heroes.length>0?`<div class="hub-t" style="margin-top:16px">${I18N.t('hub.recruitedHeroes')}</div><div class="crew-grid">${G.heroes.map(h=>{
  const hd=HEROES[h];
  const aboard=G.fleet.find(sh=>(sh.crewIds||[]).includes(h));
  const freeShips=G.fleet.filter(sh=>!(sh.crewIds||[]).includes(h)&&(sh.crewIds||[]).length<getMaxCrew(sh));
  const _hrr=getRepRank(G.reputation||0);
  return`<div class="crew-c" style="border:1px solid var(--gold);padding:10px">
    <div class="crew-av" style="padding-top:2px">${_heroPortrait({...hd,id:h},56,'var(--gold)')}</div>
    <div class="crew-nm" style="color:var(--gold);margin-top:4px">${(I18N&&I18N.has&&I18N.has('hero.'+h+'.nm'))?I18N.t('hero.'+h+'.nm'):hd.nm}</div>
    <div class="crew-cl" style="color:var(--purple)">${hd.sk}</div>
    <div class="cr-L">${I18N.t('ui.legendBoost')}</div>
    <div style="margin-top:4px;font-size:11px;color:${_hrr.col};border:1px solid ${_hrr.col};border-radius:8px;padding:1px 6px;display:inline-flex;align-items:center;gap:3px"><img src="img/ui/HN01.png${window._GAME_VER?'?v='+window._GAME_VER:''}" alt="HN" style="width:14px;height:14px;object-fit:contain;filter:drop-shadow(0 0 3px ${_hrr.col})" onerror="this.outerHTML='${_hrr.ic} '">${I18N.t('ui.fameLabelInline')}: ${_hrr.lb}</div>
    <div style="margin-top:4px">
      ${aboard?`<div style="font-size:11px;color:var(--cyan);margin-bottom:3px">${I18N.t('ui.aboardShip',{nm:shipDisplayNm(aboard)})}</div>`:''}
      <select id="hero-ship-${h}" style="background:var(--panel);border:1px solid var(--gold);color:var(--gold);border-radius:3px;padding:2px;font-size:11px;width:100%">
        <option value="">${I18N.t('ui.selectShipPlaceholder')}</option>
        ${G.fleet.map((sh,si)=>`<option value="${si}" ${aboard===sh?'selected':''}>[${I18N.tier(sh.tier)}] ${shipDisplayNm(sh)} (${(sh.crewIds||[]).length}/${getMaxCrew(sh)})</option>`).join('')}
      </select>
      <div style="display:flex;gap:3px;margin-top:3px">
        <button onclick="boardHeroToShip('${h}')" style="font-size:11px;flex:1;padding:2px 8px;border:1px solid var(--gold);border-radius:3px;background:rgba(212,175,55,.1);color:var(--gold);cursor:pointer">${aboard?I18N.t('ui.changeShipBtn'):I18N.t('ui.boardBtn')}</button>
        ${aboard?`<button onclick="unassignHero('${h}')" style="font-size:11px;padding:2px 6px;border:1px solid var(--red);border-radius:3px;background:none;color:var(--red);cursor:pointer">${I18N.t('ui.disembark')}</button>`:''}
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
      notify(I18N.t('notify.crewDisembarkIc',{ic:c?.ic||'🧑',nm:(c?crewDisplayNm(c):'')||I18N.t('ui.crewShort')}),'ok');
    }
  });
  rerenderShipOrGarage();saveGame(true);
}
// ── 크루 내보내기 확인 팝업 ──────────────────────────────────────
function confirmDismissCrew(cid){
  const c=G.crew.find(x=>x.id===cid);
  if(!c){notify(I18N.t('notify.crewNotFound'),'err');return;}
  if(c.rarity==='L'||c.rarity==='H'){
    openModal(I18N.t('modal.crewDismissTitle',{ic:c.ic||'🧑',nm:crewDisplayNm(c)}),
      `<div style="padding:12px;text-align:center">
        <div style="font-size:34px;margin-bottom:8px">${c.ic||'🧑'}</div>
        <div style="font-size:17px;font-weight:bold;margin-bottom:6px">${crewDisplayNm(c)}</div>
        <div style="color:${c.rarity==='L'?'var(--gold)':'var(--purple)'};font-size:14px;margin-bottom:12px">
          ${I18N.t('crew.dangerLegendOrHero',{rank:c.rarity==='L'?I18N.t('crew.rankLegend'):I18N.t('crew.rankHero')})}
        </div>
        <div style="font-size:13px;color:var(--dim)">${I18N.t('ui.confirmDismiss')}</div>
      </div>`,
      [{txt:I18N.t('crew.expel'),fn:()=>{closeModal();_doDismissCrew(cid);},cls:'btn-red'},
       {txt:I18N.t('btn.cancel'),fn:closeModal,cls:'btn-sm'}]);
  } else {
    openModal(I18N.t('modal.dismissCrew'),
      `<div style="padding:12px;text-align:center">
        <div style="font-size:34px;margin-bottom:8px">${c.ic||'🧑'}</div>
        <div style="font-size:16px;font-weight:bold;margin-bottom:10px">${I18N.t('crew.expelByName',{nm:crewDisplayNm(c)})}</div>
        <div style="font-size:13px;color:var(--dim)">${I18N.t('ui.confirmRecruitCrew')}</div>
      </div>`,
      [{txt:I18N.t('crew.expel'),fn:()=>{closeModal();_doDismissCrew(cid);},cls:'btn-red'},
       {txt:I18N.t('btn.cancel'),fn:closeModal,cls:'btn-sm'}]);
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
    notify(I18N.t('notify.crewDismissedUndo',{ic:c.ic||'🧑',nm:crewDisplayNm(c)}),'ok');
  }
  rerenderTab(renderCrewTab);saveGame(true);
}
// 통합 되돌리기 — 단일/일괄 내보내기 모두 복원 (마지막 작업만)
function undoDismissCrew(){
  if(!_lastDismissedCrew||!_lastDismissedCrew.crew||_lastDismissedCrew.crew.length===0){
    notify(I18N.t('notify.noUndoCrew'),'err');return;
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
  notify(I18N.t('notify.crewRestored',{n:restored,reseat:reseated>0?I18N.t('notify.crewAutoSeated',{n:reseated}):''}),'ok');
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
// ─── 주점 가챠 → js/modules/gacha.js 로 분할 (Phase A3, 2026-06-10) ───
//   doGacha 함수 window 전역 노출 — HTML onclick 호출처(tavern.js) 무변경
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
  if(targets.length===0){notify(I18N.t('notify.noCrewToDismiss'),'warn');return;}
  const names=targets.map(c=>c.nm+(assignedIds.has(c.id)?'⚓':'')).join(', ');
  const rarSummary=[...targets.reduce((m,c)=>{m.set(c.rarity,(m.get(c.rarity)||0)+1);return m;},new Map())].map(([r,cnt])=>`${r}×${cnt}`).join(' / ');
  const assignedCount=targets.filter(c=>assignedIds.has(c.id)).length;
  const warningHtml=assignedCount>0
    ? `<div style="font-size:12px;color:var(--red);margin-top:6px;background:rgba(255,40,40,.08);border-left:3px solid var(--red);padding:6px 10px">${I18N.t('ui.crewAboardWarn',{n:assignedCount})}</div>`
    : '';
  openModal(I18N.t('modal.forceDismissCrew'),
    `<div style="padding:12px">
      <div style="font-size:16px;font-weight:bold;margin-bottom:8px">${I18N.t('ui.lowestDismissConfirm',{n:targets.length})}</div>
      <div style="font-size:13px;color:var(--dim);margin-bottom:6px">${I18N.t('ui.rarSummaryAboard',{summary:rarSummary})}</div>
      <div style="font-size:12px;color:rgba(255,200,100,.8);max-height:120px;overflow-y:auto;line-height:1.6">${names}</div>
      ${warningHtml}
      <div style="font-size:11px;color:var(--cyan);margin-top:8px">💡 내보낸 후 <b>${I18N.t('ui.undo')}</b> ${I18N.t('tip.restoreLastWork')}</div>
    </div>`,
    [{txt:I18N.t('ui.forceLeaveCount',{n:targets.length}),fn:()=>{
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
      notify(I18N.t('notify.crewForceDismissed',{n:targets.length}),'ok');
      rerenderTab(renderCrewTab);saveGame(true);
    },cls:'btn-red'},{txt:I18N.t('btn.cancel'),fn:closeModal,cls:'btn-sm'}]);
}
// 희귀(R) 등급 이하 일괄 내보내기 — N(일반)·R(희귀) 크루 전원 강제 하선·삭제
//   영웅(H)·전설(L)·스토리(S)은 보존. 탑승 크루도 자동 하선 후 삭제.
function dismissCrewBelowRare(){
  const targets=(G.crew||[]).filter(c=>c.rarity==='N'||c.rarity==='R');
  if(targets.length===0){notify(I18N.t('notify.noCrewToDismiss'),'warn');return;}
  const assignedIds=new Set(G.fleet.flatMap(s=>s.crewIds||[]));
  const names=targets.map(c=>c.nm+(assignedIds.has(c.id)?'⚓':'')).join(', ');
  const rarSummary=[...targets.reduce((m,c)=>{m.set(c.rarity,(m.get(c.rarity)||0)+1);return m;},new Map())].map(([r,cnt])=>`${r}×${cnt}`).join(' / ');
  const assignedCount=targets.filter(c=>assignedIds.has(c.id)).length;
  const warningHtml=assignedCount>0
    ? `<div style="font-size:12px;color:var(--red);margin-top:6px;background:rgba(255,40,40,.08);border-left:3px solid var(--red);padding:6px 10px">${I18N.t('ui.crewAboardWarn',{n:assignedCount})}</div>`
    : '';
  openModal(I18N.t('modal.forceDismissCrew'),
    `<div style="padding:12px">
      <div style="font-size:16px;font-weight:bold;margin-bottom:8px">${I18N.t('crew.belowRareConfirm',{n:targets.length})}</div>
      <div style="font-size:13px;color:var(--dim);margin-bottom:6px">${rarSummary} | ⚓ = ${I18N.t('crew.aboardLegend')}</div>
      <div style="font-size:12px;color:rgba(255,200,100,.8);max-height:120px;overflow-y:auto;line-height:1.6">${names}</div>
      ${warningHtml}
      <div style="font-size:11px;color:var(--cyan);margin-top:8px">💡 ${I18N.t('tip.undoAfterDismiss')}</div>
    </div>`,
    [{txt:I18N.t('ui.forceLeaveCount',{n:targets.length}),fn:()=>{
      closeModal();
      const entries=targets.map(c=>{
        let shipIdx=null;
        G.fleet.forEach((s,si)=>{if(s.crewIds&&s.crewIds.includes(c.id))shipIdx=si;});
        const insertIdx=G.crew.findIndex(x=>x.id===c.id);
        return{data:JSON.parse(JSON.stringify(c)),shipIdx,insertIdx};
      });
      _lastDismissedCrew={crew:entries};
      targets.forEach(c=>{
        G.fleet.forEach(s=>{if(s.crewIds){const i=s.crewIds.indexOf(c.id);if(i>=0)s.crewIds.splice(i,1);}});
        const idx=G.crew.findIndex(x=>x.id===c.id);
        if(idx>=0)G.crew.splice(idx,1);
      });
      notify(I18N.t('notify.crewForceDismissed',{n:targets.length}),'ok');
      rerenderTab(renderCrewTab);saveGame(true);
    },cls:'btn-red'},{txt:I18N.t('btn.cancel'),fn:closeModal,cls:'btn-sm'}]);
}
try{if(typeof window!=='undefined')window.dismissCrewBelowRare=dismissCrewBelowRare;}catch(e){}
function assignCrewFromCrewTab(cid){
  const sel=document.getElementById('cs_'+cid);
  // 함선이 1개이면 자동 선택 (idx 0)
  if(sel&&(sel.value===''||sel.options.length===1)&&G.fleet.length===1)sel.value='0';
  if(!sel||sel.value===''){notify(I18N.t('notify.selectBoardShipFirst'),'warn');return;}
  const shipIdx=parseInt(sel.value);
  if(isNaN(shipIdx)){notify(I18N.t('notify.shipSelectError'),'err');return;}
  const s=G.fleet[shipIdx];
  if(!s){notify(I18N.t('notify.shipNotFound'),'err');return;}
  if(!s.crewIds)s.crewIds=[];
  // 이미 이 함선에 탑승 중
  if(s.crewIds.includes(cid)){notify(I18N.t('notify.alreadyAboard'),'warn');return;}
  // 최대 탑승 인원 체크 (함선 티어별 상이)
  const _maxSlots=getMaxCrew(s);
  const _allP=[...G.crew,...(G.heroes||[]).map(h=>Object.assign({},HEROES[h],{id:h,rarity:'S',isHero:true}))];
  const _newC=_allP.find(x=>x.id===cid);
  const _newCost=getCrewSlotCost(_newC);
  const _usedSlots=getTotalSlotUsed(s);
  if(_usedSlots+_newCost>_maxSlots){notify(I18N.t('notify.slotShort',{nm:shipDisplayNm(s),used:_usedSlots,need:_newCost,max:_maxSlots}),'err');return;}
  // 다른 함선에서 자동 이전
  G.fleet.forEach(sh=>{if(sh.crewIds){const i=sh.crewIds.indexOf(cid);if(i>=0)sh.crewIds.splice(i,1);}});
  const _stBefACT=getShipStats(s);
  s.crewIds.push(cid);
  _syncShipCapacity(s,_stBefACT);
  const allPeople=[...G.crew,...G.heroes.map(h=>({...HEROES[h],id:h,rarity:'S',isHero:true}))];
  const c=allPeople.find(x=>x.id===cid);
  notify(I18N.t('notify.crewBoardDone',{ic:c?.ic||'🧑',nm:(c?crewDisplayNm(c):'')||I18N.t('ui.crewShort'),ship:shipDisplayNm(s)}),'ok');
  baekgu(I18N.t('baekgu.crewBoardedShip',{nm:(c?crewDisplayNm(c):'')||I18N.t('ui.crewShort'),ship:shipDisplayNm(s)}));
  rerenderTab(renderCrewTab);saveGame(true);
}
function renderPlanetsTab(body){
  if(!body)return;
  const list=PLANET_DEF.filter(p=>G.planets[p.id]?.fog!=='L');
  // 보유 행성 합산 세금(턴당) — 상단 요약 카드
  const ownedList=PLANET_DEF.filter(p=>G.planets[p.id]?.owned);
  const totalTax=ownedList.reduce((s,p)=>s+calcTaxFor(p.id),0);
  const ownedCount=ownedList.length;
  body.innerHTML=`<div class="hub-scroll">${hubBanner('route','🌌',I18N.t('hub.bannerGalaxyRoute'))}<div class="hub-t">${I18N.t('hub.exploredPlanets')}</div>
    <!-- 턴당 전체 세금 합산 요약 -->
    <div style="background:linear-gradient(135deg,rgba(212,175,55,.12),rgba(212,175,55,.04));border:1px solid rgba(212,175,55,.4);border-radius:10px;padding:12px 16px;margin-bottom:12px;display:flex;align-items:center;gap:14px;flex-wrap:wrap">
      <span style="font-size:22px">💰</span>
      <div style="flex:1;min-width:140px">
        <div style="color:var(--gold);font-size:13px;font-weight:bold">${I18N.t('ui.turnTaxIncome')}</div>
        <div style="color:var(--dim);font-size:11px;margin-top:2px">${I18N.t('ui.ownedPlanetsSum',{n:ownedCount})}</div>
      </div>
      <div style="text-align:right">
        <div style="color:var(--gold);font-size:20px;font-weight:bold">₡${totalTax.toLocaleString()}</div>
        <div style="color:var(--dim);font-size:11px">${I18N.t('ui.perTurnSuffix')}</div>
      </div>
    </div>
    <div style="color:var(--dim);font-size:13px;margin-bottom:12px">${I18N.t('ui.investTip')}</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">${list.map(p=>{
      const st=G.planets[p.id],f=FACTION[p.f],lv=st.commerce||0;
      const tax=calcTaxFor(p.id),investCost=Math.floor(_planetBaseTax(p)*7.2*Math.pow(1.548,lv)*(1+G.act/2)*0.56);
      const fEmoji=FACTION_EMOJI[p.f]||(p.void?'🌀':p.hostile?'💀':'🌐');
      const pBg=p.hostile?'#1a0505':p.void?'#0a0518':'#0a1828';
      return `<div style="background:var(--card);border:1px solid ${st.owned?'var(--gold)':'var(--bdr)'};border-radius:10px;overflow:hidden;display:flex;flex-direction:column;min-height:0">
        <!-- 상단: 행성 이미지 (4열 그리드 가독성) -->
        <div style="width:100%;aspect-ratio:16/7;flex-shrink:0;overflow:hidden;background:${pBg};position:relative">
          <img src="${planetImgSrc(p.id)}" style="width:100%;height:100%;object-fit:cover;opacity:.9"
            onerror="this.outerHTML='<div style=\'width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:36px\'>${fEmoji}</div>'" />
          ${st.owned?'<span style="position:absolute;top:5px;right:5px;color:var(--gold);font-size:10px;background:rgba(0,0,0,.6);border:1px solid var(--gold);padding:1px 5px;border-radius:8px">🏠</span>':''}
        </div>
        <!-- 하단: 정보 + 투자 버튼 -->
        <div style="padding:8px 10px;display:flex;flex-direction:column;gap:4px;min-width:0">
          <div style="font-size:13px;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.nm}</div>
          <div style="font-size:10px;color:${f.col};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${f.nm}${p.hostile?' ⚠️':''}${p.void?' 🌀':''} ${I18N.t('ui.ringSep',{n:p.ring})}</div>
          ${st.owned?`<div style="display:flex;flex-direction:column;gap:3px;margin-top:2px">
            <div style="display:flex;justify-content:space-between;font-size:10px"><span style="color:var(--dim)">${I18N.t('ui.commerceShort')}</span><span style="color:var(--gold)">Lv${lv}/10</span></div>
            <div style="height:4px;background:var(--panel);border-radius:2px;overflow:hidden"><div style="width:${lv*10}%;height:100%;background:linear-gradient(90deg,var(--gold),#ffaa00);border-radius:2px"></div></div>
            <div style="color:var(--green);font-size:11px;font-weight:bold">${I18N.t('ui.taxPerTurnShort',{cr:tax.toLocaleString()})}</div>
            ${lv<10?`<button class="btn btn-sm btn-gold" style="font-size:10px;padding:3px 6px;width:100%;margin-top:2px" onclick="investPlanet('${p.id}')" ${G.credits>=investCost?'':'disabled'}>${I18N.t('ui.investSimple',{lv:lv+1,cost:investCost.toLocaleString()})}</button>`:`<div style="color:var(--gold);font-size:10px;text-align:center;margin-top:2px">${I18N.t('ui.maxLevel')}</div>`}
          </div>`:
          `<div style="font-size:10px;color:var(--dim);margin-top:2px">${I18N.t('ui.baseTaxTurn',{tax:p.tax.toLocaleString()})}</div>`}
        </div>
      </div>`;
    }).join('')}</div>
  </div>`;
}
function investPlanet(pid){
  const pd=PLANET_DEF.find(p=>p.id===pid),st=G.planets[pid];if(!pd||!st||!st.owned)return;
  const lv=st.commerce||0;if(lv>=10){notify(I18N.t('notify.maxLevel'),'err');return;}
  // 화면에 표시된 비용과 정확히 동일한 공식 사용 (이전 버그: 2.15^lv*1.0 사용으로 큰 금액 차감됨)
  const cost=Math.floor(_planetBaseTax(pd)*7.2*Math.pow(1.548,lv)*(1+G.act/2)*0.56);
  if(G.credits<cost){notify(I18N.t('notify.investCost',{cost:cost.toLocaleString()}),'err');return;}
  G.credits-=cost;st.commerce=lv+1;
  // 시나리오 탐사 퀘 연동 2026-06-11: 행성 투자(commerce 태그) 진행 — 투자한 행성 기준
  try{if(typeof bumpStoryQuestProgress==='function')bumpStoryQuestProgress('commerce',1,pid);}catch(e){}
  updateHUD();notify(I18N.t('notify.planetUpgrade',{nm:pd.nm,lv:lv+1,tax:calcTaxFor(pid).toLocaleString()}),'gold');
  baekgu(I18N.t('baekgu.commerceLevel',{nm:pd.nm,lv:lv+1,tax:calcTaxFor(pid).toLocaleString()}));
  saveGame(true);
  // 현재 활성 탭에 맞춰 재렌더 (탭 강제 전환 방지)
  const _curTab=G._currentHubTab;
  if(_curTab==='auction'&&typeof renderAuctionView==='function')rerenderTab(renderAuctionView);
  else if(_curTab==='front'&&typeof renderFrontView==='function')rerenderTab(renderFrontView);
  else rerenderTab(renderPlanetsTab);
}

// ── 퀘스트 생성 시스템 → js/modules/quest-gen.js 로 분할 (2026-06-13, 사용자 요청: 긴 코드 분할)

// ─── 영웅 퀘스트 시스템 (사용자 요청 2026-06-07 · 도착기반 전환 2026-06-15) ──────────────────────
// · 8인 전설 영웅은 각자의 캐논 행성에 배정 (아래 MAP)
// · 해당 행성에 도착하면 즉시 영웅 퀘스트(status:done) 등장 → 클릭 → 컷씬 재생 → 영입
// · 스폰 트리거: spawnPhasedQuests → _spawnHeroQuestForPlanet(pid)
const _HERO_QUEST_PLANET_MAP={
  H08:'P19', H04:'P04', H01:'P13', H05:'P14',
  H02:'P06', H03:'P08', H06:'P28', H07:'P09'
};
// 영웅 퀘스트 nm/desc — i18n 키 기반으로 항상 현재 언어 재해석 (사용자 보고 2026-06-16: 영문판 한글 잔존 방지)
function _heroQuestText(heroId){
  const planetId=_HERO_QUEST_PLANET_MAP[heroId]||'';
  const _hKey='hero.'+heroId+'.nm';
  const heroNm=(typeof I18N!=='undefined'&&I18N.has&&I18N.has(_hKey))?I18N.t(_hKey):((typeof HEROES!=='undefined'&&HEROES[heroId])?HEROES[heroId].nm:heroId);
  const planetNm=(typeof PLANET_DEF!=='undefined'&&planetId)?((PLANET_DEF.find(p=>p.id===planetId)||{}).nm||planetId):'';
  return {nm:I18N.t('quest.heroRecruitNm',{nm:heroNm}),desc:I18N.t('quest.heroRecruitDesc',{nm:heroNm,planet:planetNm}),heroNm,planetNm};
}
try{if(typeof window!=='undefined')window._heroQuestText=_heroQuestText;}catch(e){}

function _spawnHeroQuest(heroId){
  // 의존성 가드 — 데이터 파일 미로드 시 NPE 방지
  if(!heroId||typeof HEROES==='undefined'||!HEROES[heroId])return false;
  if(typeof PLANET_DEF==='undefined')return false;
  const planetId=_HERO_QUEST_PLANET_MAP[heroId];
  if(!planetId)return false;
  if(!G.quests)G.quests={};
  if(!G.quests[planetId])G.quests[planetId]=[];
  // 중복 방지
  if(G.quests[planetId].some(q=>q&&q.heroId===heroId))return false;
  // I18N 미초기화 시 폴백 — has/t/getLang 함수 존재 모두 검증
  const _i18nReady=(typeof I18N!=='undefined'&&typeof I18N.t==='function');
  const heroNmKey='hero.'+heroId+'.nm';
  const heroNm=(_i18nReady&&I18N.has&&I18N.has(heroNmKey))?I18N.t(heroNmKey):(HEROES[heroId].nm||heroId);
  const heroIc=HEROES[heroId].ic||'⭐';
  const planetNm=(PLANET_DEF.find(p=>p.id===planetId)||{}).nm||planetId;
  const _isEn=(_i18nReady&&typeof I18N.getLang==='function'&&I18N.getLang()==='en');
  const _qt=_heroQuestText(heroId);  // i18n 키 기반 → 언어 전환 시 relocalize 가능
  G.quests[planetId].unshift({
    id:'q_hero_'+heroId,
    type:'hero_quest',
    heroId:heroId,
    ic:'⭐',
    npc:heroNm,
    npcIc:heroIc,
    nm:_qt.nm,
    desc:_qt.desc,
    rewardCr:1000000,
    rewardVe:50,
    status:'done',  // 도착 = 완료, 바로 보상 받기 가능
    targetId:null,
    progress:1,
    required:1,
    planetId:planetId
  });
  // 알림 + 백구
  if(typeof notify==='function')notify(_isEn?('⭐ Special Quest: '+heroNm+' ('+planetNm+')'):('⭐ 특별 퀘스트: '+heroNm+' ('+planetNm+')'),'pur');
  if(typeof baekgu==='function')baekgu(_isEn?(heroNm+' detected at '+planetNm+'. Set course, Commander.'):(planetNm+'에서 '+heroNm+'의 위치 단서를 포착했습니다.'));
  return true;
}

// 행성 도착 시 그 행성에 배정된 영웅 퀘스트를 즉시 스폰 (사용자 요청 2026-06-15)
//   · _HERO_QUEST_PLANET_MAP 역방향 조회 — 이 행성의 영웅이 아직 미영입이면 바로 퀘스트(status:done) 등장
//   · spawnPhasedQuests(=행성 도착 훅)에서 호출 → 도착 즉시 영입 가능
//   · _spawnHeroQuest 자체 dedup + 영입여부 가드로 중복/재스폰/알림 스팸 없음
function _spawnHeroQuestForPlanet(pid){
  if(!pid||typeof _HERO_QUEST_PLANET_MAP==='undefined')return false;
  let spawned=false;
  for(const hid in _HERO_QUEST_PLANET_MAP){
    if(_HERO_QUEST_PLANET_MAP[hid]!==pid)continue;
    if((G.heroes||[]).includes(hid))continue;  // 이미 영입한 영웅은 스킵
    if(_spawnHeroQuest(hid))spawned=true;
  }
  return spawned;
}
try{if(typeof window!=='undefined')window._spawnHeroQuestForPlanet=_spawnHeroQuestForPlanet;}catch(e){}

// ═══════════════════════════════════════════════════════════════════
// Phase 시나리오 퀘스트 자동 spawn (PHASE1/2/3+_QUESTS 데이터 사용)
//   행성 도착 시 doArrivePlanet → 호출 → 해당 행성의 미스폰 퀘스트 일괄 추가
//   중복 방지: 같은 id가 이미 존재하면 skip
//   캐릭터별 다국어: nm/desc를 {ko, en} 객체로 받아 현재 언어 적용
// ═══════════════════════════════════════════════════════════════════
// ─── 거북선 설계도 진화도 팝업 ───
// 사용자 요청 2026-06-07: Gaubuk01·02·03.png 단편 보상 표시
// 골격(1) → 외피(2) → 완성(3) 순으로 누적 진화 도면 노출
function showGeobukseonBlueprintModal(latestPart){
  try{
    const _isEn=(typeof I18N!=='undefined'&&I18N.getLang&&I18N.getLang()==='en');
    if(!G.geobukseonBP)G.geobukseonBP={p1:0,p2:0,p3:0};
    const _has1=(G.geobukseonBP.p1||0)>0;
    const _has2=(G.geobukseonBP.p2||0)>0;
    const _has3=(G.geobukseonBP.p3||0)>0;
    const _total=(_has1?1:0)+(_has2?1:0)+(_has3?1:0);
    const _ver=(window._GAME_VER?'?v='+window._GAME_VER:'');
    const _title=_isEn?'Geobukseon Blueprint':'거북선 설계도';
    const _subtitle=_isEn?('Fragment '+_total+'/3 acquired'):('설계도 단편 '+_total+'/3 확보');
    const _stageNm=[_isEn?'Frame':'골격', _isEn?'Hull':'외피', _isEn?'Active Core':'활성 코어'];
    const _stageNote=[
      _isEn?'Basic skeletal structure — long hull and 3 module hints':'기본 골격 구조 — 긴 몸체 + 모듈 단편 3종',
      _isEn?'Spiked outer hull formed — defensive plating':'외피 가시 돌기 형성 — 방어 외장',
      _isEn?'Lattice armor + active core matrix — completion blueprint':'격자 외장 + 활성 코어 — 완성 도면'
    ];
    // 카드 3장 — 단편 미보유는 흐림 처리
    let _cards='';
    for(let i=1;i<=3;i++){
      const _has=(i===1?_has1:i===2?_has2:_has3);
      const _isLatest=(i===latestPart);
      _cards += '<div style="flex:1;display:flex;flex-direction:column;align-items:center;padding:10px;background:'+(_has?'rgba(0,243,255,.06)':'rgba(255,255,255,.02)')+';border:1px solid '+(_isLatest?'rgba(0,243,255,.85)':_has?'rgba(0,243,255,.35)':'rgba(255,255,255,.1)')+';border-radius:10px;'+(_has?'':'opacity:.35;filter:grayscale(.85)')+';transition:all .3s;'+(_isLatest?'box-shadow:0 0 24px rgba(0,243,255,.5);transform:scale(1.04)':'')+'">'+
        '<div style="font-size:11px;color:#a8b3c0;margin-bottom:6px">'+_stageNm[i-1]+' '+i+'/3</div>'+
        '<img src="img/ui/Gaubuk0'+i+'.png'+_ver+'" alt="Geobukseon stage '+i+'" style="width:100%;max-width:180px;aspect-ratio:1/1;object-fit:contain;border-radius:8px;background:rgba(0,0,0,.4)" onerror="this.style.display=\'none\'">'+
        '<div style="font-size:11px;color:#cbd5e1;margin-top:8px;text-align:center;min-height:32px;line-height:1.4">'+_stageNote[i-1]+'</div>'+
        (_isLatest?'<div style="margin-top:6px;font-size:10px;color:#00f3ff;font-weight:bold">★ '+(_isEn?'NEW':'신규 획득')+'</div>':'')+
      '</div>';
    }
    const _turtleDone=!!(G&&G._turtleSpecialGranted);
    const _completion = (_total===3)?
      ('<div style="margin-top:14px;padding:12px;background:linear-gradient(90deg,rgba(212,175,55,.15),rgba(0,243,255,.15));border:1px solid rgba(212,175,55,.5);border-radius:10px;text-align:center;color:#ffd700;font-weight:bold;font-size:13px">★ '+
       (_turtleDone
         ? (_isEn?'Special Geobukseon restored — already in your fleet':'특수 거북선 복원 완료 — 함대에 보유 중')
         : (_isEn?'All 3 fragments collected — claim the restored Special Geobukseon below':'3단편 모두 확보 — 아래 버튼으로 복원된 특수 거북선을 수령하세요'))+
       '</div>'):'';
    const _modalHtml =
      '<div style="text-align:center;margin-bottom:14px">'+
        // 거북선(LGD01) = 함선 설계도 → BP01.png
        '<img src="img/ui/BP01.png'+_ver+'" alt="BP" style="width:64px;height:64px;object-fit:contain;margin-bottom:6px;filter:drop-shadow(0 0 12px rgba(0,243,255,.7))" onerror="this.style.display=\'none\'">'+
        '<div style="font-size:18px;color:#00f3ff;font-weight:bold;margin-bottom:4px">'+_title+'</div>'+
        '<div style="font-size:12px;color:#a8b3c0">'+_subtitle+'</div>'+
      '</div>'+
      '<div style="display:flex;gap:10px;margin-bottom:6px">'+_cards+'</div>'+
      _completion;
    if(typeof openModal==='function'){
      const _btns=[];
      if(_total===3 && !_turtleDone){
        _btns.push({txt:_isEn?'★ Claim Special Geobukseon':'★ 특수 거북선 수령', cls:'btn-gold', fn:function(){try{grantSpecialTurtle();}catch(e){console.warn('[turtle] grant fail',e);}}});
        _btns.push({txt:_isEn?'Later':'나중에', cls:'btn-sm', fn:closeModal});
      } else {
        _btns.push({txt:_isEn?'Continue':'계속', cls:'btn-gold', fn:closeModal});
      }
      openModal(_title, _modalHtml, _btns);
    } else {
      try{notify((_isEn?'Geobukseon blueprint fragment ':'거북선 설계도 단편 ')+_total+'/3','pur');}catch(e){}
    }
  }catch(e){console.warn('[geobukseon] modal fail',e);}
}
try{if(typeof window!=='undefined')window.showGeobukseonBlueprintModal=showGeobukseonBlueprintModal;}catch(e){}

// 설계도 3단편 완성 보상 — 특수 거북선(LGD01_SP, 신화 거북선 5배 성능 / 전투 2배 크기) 1회 지급
function grantSpecialTurtle(){
  try{
    if(!G)return;
    const _isEn=(typeof I18N!=='undefined'&&I18N.getLang&&I18N.getLang()==='en');
    if(G._turtleSpecialGranted){ if(typeof closeModal==='function')closeModal(); return; }
    const _def=(typeof SHIP_CATALOG!=='undefined')?SHIP_CATALOG.find(s=>s.id==='LGD01_SP'):null;
    if(!_def){ try{notify(_isEn?'Ship data error':'함선 데이터 오류','err');}catch(e){} return; }
    const newShip={
      id:'LGD01_SP_'+Date.now(),catalogId:'LGD01_SP',catId:'LGD01_SP',
      nm:_def.nm,tier:'신화',_turtleSpecial:true,
      maxHP:_def.maxHP,hp:_def.maxHP,
      maxSH:_def.maxSH||0,sh:_def.maxSH||0,
      ATT:_def.ATT||0,INT:_def.INT||0,TEC:_def.TEC||0,
      HP:_def.maxHP,LOY:_def.LOY||100,DEF:_def.DEF||0,
      cargoSlots:(typeof _def.cargoStart==='number'?_def.cargoStart:30),
      parts:[],crewIds:[]
    };
    const _addRes=(typeof addShipToFleet==='function')?addShipToFleet(newShip):null;
    G._turtleSpecialGranted=true;
    if(typeof closeModal==='function')closeModal();
    try{notify(I18N.t('notify.turtleSpecialGained'),'pur');}catch(e){}
    try{baekgu(I18N.t('baekgu.turtleSpecialGained'));}catch(e){}
    try{if(typeof updateHUD==='function')updateHUD();}catch(e){}
    try{if(typeof rerenderShipOrGarage==='function')rerenderShipOrGarage();}catch(e){}
    try{saveGame(true);}catch(e){}
    if(typeof openModal==='function'){
      const _img=(typeof shipImgSrc==='function')?shipImgSrc({id:'LGD01_SP',catId:'LGD01_SP',catalogId:'LGD01_SP',tier:'신화',_turtleSpecial:true}):'';
      const _body='<div style="text-align:center;padding:8px">'+
        '<img src="'+_img+'" alt="" style="width:180px;height:180px;object-fit:contain;filter:drop-shadow(0 0 22px #ffd700);margin-bottom:8px" onerror="this.outerHTML=\'<div style=\\\'font-size:110px\\\'>✦</div>\'">'+
        '<div style="font-size:24px;color:#ffd700;font-weight:bold">✦ '+(_isEn?'Special Geobukseon Restored':'특수 거북선 복원 완료')+'</div>'+
        '<div style="font-size:16px;font-weight:bold;color:#ff88ff;margin-top:6px">'+((typeof shipDisplayNm==='function'?shipDisplayNm(_def):'')||_def.nm)+'</div>'+
        '<div style="font-size:12px;color:var(--dim);margin-top:6px">'+(_isEn?'5× the mythic Geobukseon — 2× size in battle':'신화 거북선의 5배 성능 · 전투 시 2배 크기')+'</div>'+
        (_addRes&&_addRes.added==='reserve'?'<div style="font-size:12px;color:var(--cyan);margin-top:4px">'+I18N.t('craft.reserveStored')+'</div>':'')+
      '</div>';
      openModal(_isEn?'Special Geobukseon':'특수 거북선', _body, [{txt:_isEn?'Great!':'좋아!',cls:'btn-gold',fn:closeModal}]);
    }
  }catch(e){console.warn('[turtle] grantSpecialTurtle fail',e);}
}
try{if(typeof window!=='undefined')window.grantSpecialTurtle=grantSpecialTurtle;}catch(e){}

// spawnPhasedQuests — js/story-quest-engine.js 로 이관 (사용자 요청 2026-06-07: 페이즈 모듈 분리)
// window.spawnPhasedQuests 로 글로벌 노출되어 기존 호출처 그대로 동작

// 퀘스트 보상 짧은 팝업 — 아이템 보상이 없어도 보상금/VE를 2초간 띄웠다 사라지게 (사용자 요청 2026-06-16)
function _showQuestRewardToast(cr,ve,rm){
  try{
    const el=document.createElement('div');
    el.style.cssText='position:fixed;left:50%;top:30%;transform:translate(-50%,-50%) scale(.85);z-index:99998;background:linear-gradient(135deg,rgba(30,22,8,.97),rgba(20,14,30,.97));border:2px solid var(--gold);border-radius:12px;padding:16px 30px;text-align:center;box-shadow:0 8px 40px rgba(255,215,0,.35);opacity:0;transition:opacity .3s ease,transform .3s ease;pointer-events:none';
    el.innerHTML='<div style="font-size:34px;margin-bottom:4px">🎖️</div>'
      +'<div style="font-size:14px;color:var(--gold);font-weight:bold;letter-spacing:1px;margin-bottom:6px">'+I18N.t('modal.questReward')+'</div>'
      +'<div style="font-size:17px;color:#ffe;font-weight:bold">'+I18N.t('ui.creditsRewardLine',{cr:(cr||0).toLocaleString()})+((rm>1.05)?' <span style="font-size:12px;color:#aaa">×'+rm.toFixed(1)+'</span>':'')+'</div>'
      +((ve>0)?('<div style="font-size:14px;color:#88ddff;margin-top:3px">'+I18N.t('ui.veRewardLine',{n:ve})+'</div>'):'');
    document.body.appendChild(el);
    requestAnimationFrame(()=>{el.style.opacity='1';el.style.transform='translate(-50%,-50%) scale(1)';});
    setTimeout(()=>{el.style.opacity='0';el.style.transform='translate(-50%,-50%) scale(.9)';},1700);
    setTimeout(()=>{try{el.remove();}catch(e){}},2050);
  }catch(e){}
}
function completeQuest(pid,idx){
  var q=G.quests[pid]&&G.quests[pid][idx];if(!q||q.status!=='done')return;
  const _fromTavern=G._currentHubTab==='tavern';
  // ─── 시나리오 퀘스트 처리 (PHASE1/2/3 — story_quest 타입) ───
  // 보상 + 아이템 + 플래그 + 완료 컷씬 트리거
  if(q.type==='story_quest'){
    q.status='claimed';
    // 운항기록(탐색도감) 표시용 영구 완료 기록 — G.quests에서 사라져도 완료 이력 유지 (사용자 보고 2026-06-14)
    try{ if(!G._storyQuestsClaimed)G._storyQuestsClaimed={}; G._storyQuestsClaimed[q.id]=true; }catch(e){}
    try{sfxCoin();}catch(e){}
    G.credits=(G.credits||0)+(q.rewardCr||0);
    G.voidEssence=(G.voidEssence||0)+(q.rewardVe||0);
    // 아이템 보상 인벤토리 추가 (R-시리즈는 materials, G-시리즈는 inventory)
    // 거북선 단편(turtleBP1/2/3)은 G.geobukseonBP 별도 카운터로 추적
    let _turtleGained=null;
    (q.rewardItems||[]).forEach(it=>{
      if(!it||!it.id)return;
      if(/^turtleBP[1-3]$/.test(it.id)){
        if(!G.geobukseonBP)G.geobukseonBP={p1:0,p2:0,p3:0};
        const _idx=parseInt(it.id.slice(-1));
        const _key='p'+_idx;
        G.geobukseonBP[_key]=(G.geobukseonBP[_key]||0)+(it.qty||1);
        _turtleGained=_idx;
      } else if(/^R0[0-9]/.test(it.id)){
        if(!G.materials)G.materials={};
        G.materials[it.id]=(G.materials[it.id]||0)+(it.qty||1);
      } else {
        if(!G.inventory)G.inventory=[];
        const inv=G.inventory.find(i=>i.id===it.id);
        if(inv)inv.qty+=(it.qty||1);
        else G.inventory.push({id:it.id,qty:it.qty||1});
      }
    });
    // 거북선 단편 획득 시 진화도 팝업 (컷씬 끝난 후 1.6초 딜레이)
    if(_turtleGained && typeof showGeobukseonBlueprintModal==='function'){
      const _delay = q.cutscene_post ? 2400 : 600;
      setTimeout(()=>showGeobukseonBlueprintModal(_turtleGained), _delay);
    }
    // 스토리 플래그
    if(!G._storyFlags)G._storyFlags={};
    (q.rewardFlags||[]).forEach(fl=>{ if(fl)G._storyFlags[fl]=true; });
    // 알림
    const _isEn=(typeof I18N!=='undefined'&&I18N.getLang&&I18N.getLang()==='en');
    notify(_isEn?('✓ '+q.nm+' completed (+'+(q.rewardCr||0).toLocaleString()+'₡)')
                :('✓ '+q.nm+' 완료 (+'+(q.rewardCr||0).toLocaleString()+'₡)'),'pur');
    updateHUD();
    saveGame(true);
    // 페이즈 게이팅: 완료로 직전 페이즈 50% 달성 시 다음 페이즈 퀘스트 즉시 해금·스폰
    try{ if(typeof spawnPhasedQuests==='function')spawnPhasedQuests(G.currentPlanet); }catch(e){}
    // 완료 컷씬 트리거 (있는 경우, 400ms 딜레이로 알림 표시 후)
    if(q.cutscene_post && window.STORY_SCENES_PC && typeof window.STORY_SCENES_PC.triggerScene==='function'){
      setTimeout(()=>window.STORY_SCENES_PC.triggerScene(q.cutscene_post), 400);
    }
    if(_fromTavern)rerenderTab(renderTavernView);
    else rerenderTab(renderQuestTab);
    return;
  }
  // ─── 영웅 퀘스트 처리 (보상받기 = 영웅 영입 + 컷씬 트리거 + 세트 아이템) ───
  // 사용자 보고 2026-06-09: 전설영웅 획득 이후 제독에서 보상 미지급 버그
  //   · 이전: includes 체크 if(!G.heroes.includes) 블록 안에 보상·아이템·플래그·컷씬
  //     모두 들어있어서, 이미 영입된 영웅이면 SKIP → 크레딧·VE·아이템 영구 손실
  //   · 수정: 영웅 영입(push)만 조건 안, 나머지 보상은 항상 지급
  if(q.type==='hero_quest'&&q.heroId){
    q.status='claimed';
    const _newHero=!G.heroes.includes(q.heroId);
    if(_newHero){
      G.heroes.push(q.heroId);
      // 장영실 효과 (영입 시점 1회만)
      if(q.heroId==='H02'&&typeof applyJangYeongsilEffect==='function')applyJangYeongsilEffect();
    }
    // 보상 — 새 영입이든 재수령이든 항상 지급
    G.credits=(G.credits||0)+(q.rewardCr||0);
    G.voidEssence=(G.voidEssence||0)+(q.rewardVe||0);
    try{sfxCoin();}catch(e){}
    const _hKey='hero.'+q.heroId+'.nm';
    const _hNm=(I18N&&I18N.has&&I18N.has(_hKey))?I18N.t(_hKey):(HEROES[q.heroId]?.nm||q.heroId);
    if(_newHero){
      notify(I18N.t('notify.heroRecruitedIc',{ic:HEROES[q.heroId]?.ic,nm:_hNm}),'pur');
      baekgu(I18N.t('baekgu.heroJoined',{nm:_hNm}));
    } else {
      // 이미 영입된 영웅의 보상만 수령 — 명확한 알림
      const _isEn2=(I18N.getLang&&I18N.getLang()==='en');
      notify((_isEn2?'✓ Reward claimed: ':'✓ 보상 수령: ')+_hNm+' (+'+(q.rewardCr||0).toLocaleString()+'₡)','gold');
    }
    // 영웅 세트 아이템 보상 (예: 이순신 SW01 + SA01) — 인벤토리 자동 추가
    (q.rewardItems||[]).forEach(it=>{
      if(!it||!it.id)return;
      if(/^R0[0-9]/.test(it.id)){
        if(!G.materials)G.materials={};
        G.materials[it.id]=(G.materials[it.id]||0)+(it.qty||1);
      } else {
        if(!G.inventory)G.inventory=[];
        const _inv=G.inventory.find(i=>i.id===it.id);
        if(_inv)_inv.qty+=(it.qty||1);
        else G.inventory.push({id:it.id,qty:it.qty||1});
      }
    });
    // 스토리 플래그
    if(!G._storyFlags)G._storyFlags={};
    (q.rewardFlags||[]).forEach(fl=>{ if(fl)G._storyFlags[fl]=true; });
    saveGame(true);
    updateHUD();
    if(_newHero){try{_grantAllHeroesReward();}catch(e){}}
    // 시나리오 컷씬 자동 재생 — 새 영입일 때만 (재수령 시는 컷씬 안 봐도 됨)
    if(_newHero){
      if(q.cutscene_post && window.STORY_SCENES_PC && typeof window.STORY_SCENES_PC.triggerScene==='function'){
        setTimeout(()=>window.STORY_SCENES_PC.triggerScene(q.cutscene_post), 400);
      } else if(window.STORY_SCENES_PC && typeof window.STORY_SCENES_PC.triggerHeroRecruitScene==='function'){
        setTimeout(()=>window.STORY_SCENES_PC.triggerHeroRecruitScene(q.heroId), 400);
      }
    }
    if(_fromTavern)rerenderTab(renderTavernView);
    else rerenderTab(renderQuestTab);
    return;
  }
  q.status='claimed';try{sfxCoin();}catch(e){}
  const _rm=getTotalRewardMult(); // 레벨×난이도 통합 배율
  const _repMult=getQuestRepTierMult(q); // 명성 티어 배율 (VE≥40:×3, VE≥30:×2)
  // 허브 해금 전(hubProg<10): 보상 50% 감소 / 해금 후: 정상 보상
  const _hubUnlockedQ=isPlanetHubUnlocked(pid);
  const _rewardRate=_hubUnlockedQ?1.0:0.5;
  const _actualCr=Math.round(q.rewardCr*_rm*_rewardRate*_repMult);
  // 사용자 요청 2026-06-09: 전투/퀘스트 VE 절반 — ×2 multiplier 제거 (원본 ×1)
  const _actualVe=q.rewardVe*_repMult;
  G.credits+=_actualCr;G.voidEssence+=_actualVe;
  // ── 보이드 크리스탈(VC) 드롭 — 보이드 행성(P27~P30) 퀘스트 완료 시 48% 확률 ──
  // (이전 45% → 48%로 +3%p 추가 인상, 사용자 요청)
  const _vcPlanet=PLANET_DEF.find(p=>p.id===pid);
  if(_vcPlanet&&_vcPlanet.void){
    if(Math.random()<0.48){
      G.voidCrystal=(G.voidCrystal||0)+2;  // 사용자 요청 ×2 — 드롭 1→2
      notify(I18N.t('notify.gotVoidCrystal',{n:G.voidCrystal}),'pur');
      baekgu(I18N.t('baekgu.voidCrystalGet'));
    }
  }
  // 행성 허브 진행도 추가
  addHubProgress(pid);
  updateHUD();
  // ── 특별 보상 추첨 (사용자 피드백 반영: 명성 게이트 완화 + 확률 정상화) ──
  // 명성 50+ → 전설(set 파츠/legend 동료) 등장
  // 명성 120+ → 신화(mythic 파츠) 등장
  // 종전 공식의 비대칭 캡(*0.5-0.10 등)을 제거하고 단조 증가 형태로 정정
  const roll=Math.random();
  const rep=G.reputation||0;
  const _legendUnlocked=rep>=50;
  const _mythicUnlocked=rep>=120;
  // 퀘스트 VE 티어 보너스: VE>=40 +10%, VE>=30 +5%
  const _qveBonus=q.rewardVe>=40?0.10:q.rewardVe>=30?0.05:0;
  // 신화급 파츠: 120명성=0.5%, 300명성=8% 캡 — 부드러운 단조 증가
  const mythicRate=_mythicUnlocked?Math.min(0.08,Math.max(0,(rep-120)*0.0006)+0.005+_qveBonus):0;
  // 세트(전설) 파츠: 50명성=4%, 220명성=25% 캡
  const setRate=_legendUnlocked?Math.min(0.25,0.04+(rep-50)*0.0014+_qveBonus):0;
  // 전설 동료: 50명성=2%, 200명성=12% 캡
  const legendRate=_legendUnlocked?Math.min(0.12,0.02+(rep-50)*0.0007+_qveBonus):0;
  // 사용자 요청 (2026-06-06): 거북선(LGD01) 획득 확률 낮음 보고
  //   · 직접 드롭 확률 5% → 10% (×2)
  //   · 게이트 rep>=120 → 60 (중반부터 가능, 별도 게이트 _turtleShipUnlocked)
  // 사용자 요청 (2026-06-12): 획득 확률 50% 감소 — 10% → 5%
  const _turtleShipUnlocked=rep>=60;
  const turtleShipRate=_turtleShipUnlocked?0.05:0;

  let bonusMsg='';
  if(roll<legendRate){
    // 전설 동료 획득
    if(!G.crew)G.crew=[];
    const pool=QUEST_LEGEND_CREW.filter(c=>!G.crew.find(x=>x.id===c.id));
    if(pool.length>0){
      const lucky=pool[Math.floor(Math.random()*pool.length)];
      const newCrew={...lucky,id:lucky.id+'_'+Date.now()};
      // 크루 이미지 (보너스 메시지에 표시)
      const _crewImg=(typeof crewImgSrc==='function')?crewImgSrc(newCrew):`img/quests/explore_F01.png`;
      const _luckyDispNm=crewDisplayNm(lucky)||lucky.nm;
      // 사용자 요청 2026-06-13: 전설등급 크루 캐릭터 이미지 2배 확대 (84→168px). 신화 8영웅은 영입 플로우 별도 — 미변경
      const _imgHtml=`<img src="${_crewImg}" alt="${_luckyDispNm}" style="width:168px;height:168px;border-radius:50%;border:3px solid var(--gold);object-fit:cover;background:rgba(0,0,0,.4);box-shadow:0 0 22px rgba(255,215,0,.45);margin-bottom:10px" onerror="this.outerHTML='<div style=\\'font-size:100px;margin-bottom:10px\\'>'+'${lucky.ic||'🧑'}'+'</div>'">`;
      if(G.crew.length>=getMaxCrewCount()){
        // 크루 가득 찬 경우: 교체 팝업 예약
        G._pendingQuestCrew=newCrew;
        bonusMsg=`<div style="margin-top:12px;background:rgba(255,215,0,.1);border:1px solid var(--gold);border-radius:8px;padding:10px;text-align:center">
          ${_imgHtml}
          <div style="font-size:22px">${I18N.t('ui.legendCrewAcquired')}</div>
          <div style="font-size:17px;font-weight:bold;color:var(--gold);margin-top:4px">${lucky.ic} ${_luckyDispNm}</div>
          <div style="font-size:12px;color:var(--dim);margin-top:3px">${lucky.desc}</div>
          <div style="font-size:12px;color:var(--red);font-weight:bold;margin-top:6px">${I18N.t('ui.crewListFullWarn')}</div>
        </div>`;
        notify(I18N.t('notify.legendCompGotNeedSwap',{nm:_luckyDispNm}),'gold');
        baekgu(I18N.t('baekgu.legendCompChooseSwap',{nm:_luckyDispNm}));
      } else {
        G.crew.push(newCrew);
        bonusMsg=`<div style="margin-top:12px;background:rgba(255,215,0,.1);border:1px solid var(--gold);border-radius:8px;padding:10px;text-align:center">
          ${_imgHtml}
          <div style="font-size:22px">${I18N.t('ui.legendCrewAcquired')}</div>
          <div style="font-size:17px;font-weight:bold;color:var(--gold);margin-top:4px">${lucky.ic} ${_luckyDispNm}</div>
          <div style="font-size:12px;color:var(--dim);margin-top:3px">${lucky.desc}</div>
          <div style="font-size:12px;color:var(--yellow);margin-top:3px">${I18N.t('ui.boardCrewFromList')}</div>
        </div>`;
        notify(I18N.t('notify.legendCompJoined',{nm:_luckyDispNm}),'gold');
        baekgu(I18N.t('baekgu.legendCompJoinedBoard',{nm:_luckyDispNm}));
      }
    }
  } else if(roll<legendRate+mythicRate){
    // 신화급 파츠 획득 — MMB01(이휘소 방정식 미사일) +5%p 가중치 (사용자 요청)
    const partId=_pickQuestMythicPart();
    const p=partId?PARTS.find(x=>x.id===partId):null;
    if(partId&&p){
      if(!G.inventory)G.inventory=[];
      const inv=G.inventory.find(i=>i.id===partId);
      if(inv)inv.qty++;else G.inventory.push({id:partId,nm:p.nm,qty:1});
      bonusMsg=`<div style="margin-top:12px;background:rgba(255,136,255,.1);border:1px solid #ff88ff;border-radius:8px;padding:10px;text-align:center">
        <img src="img/parts/${partId}.png" alt="" style="width:140px;height:140px;border-radius:8px;border:2px solid #ff88ff;object-fit:cover;background:rgba(0,0,0,.4);box-shadow:0 0 18px rgba(255,136,255,.4);margin-bottom:8px" onerror="this.outerHTML='<div style=\\'font-size:80px;margin-bottom:8px\\'>✦</div>'">
        <div style="font-size:26px">${I18N.t('ui.mythicPartGained')}</div>
        <div style="font-size:17px;font-weight:bold;color:#ff88ff;margin-top:4px">${partDisplayNm(p)||partId}</div>
        <div style="font-size:12px;color:var(--dim);margin-top:3px">${p.desc||''}</div>
        <div style="font-size:12px;color:#ff88ff;margin-top:3px">${I18N.t('ui.partsTabEquipHint')}</div>
      </div>`;
      notify(I18N.t('notify.mythicPartAcquired',{nm:partDisplayNm(p)||p.nm||partId}),'pur');
      baekgu(I18N.t('baekgu.mythicPart',{nm:partDisplayNm(p)||p.nm||partId}));
    }
  } else if(roll<legendRate+mythicRate+setRate){
    // 세트/전설 파츠 획득 — 풀에 set과 legend(ML06/ML07)이 섞여 있음. 실제 rarity로 라벨 분기
    const partId=QUEST_SET_PARTS&&QUEST_SET_PARTS.length>0?QUEST_SET_PARTS[Math.floor(Math.random()*QUEST_SET_PARTS.length)]:null;
    const p=partId?PARTS.find(x=>x.id===partId):null;
    if(!partId||!p)return;
    if(!G.inventory)G.inventory=[];
    const inv=G.inventory.find(i=>i.id===partId);
    if(inv)inv.qty++;else G.inventory.push({id:partId,nm:p.nm,qty:1});
    const isSet=p?.rarity==='set';
    // 세트 완성 확인 (세트일 때만)
    const setId=isSet?p?.setId:null;
    const setComplete=isSet&&setId&&PARTS.filter(sp=>sp.setId===setId).every(sp=>G.inventory.find(si=>si.id===sp.id&&si.qty>0)||G.fleet.some(sh=>(sh.parts||[]).includes(sp.id)));
    const _icon=isSet?'◈':'⭐';
    const _title=isSet?I18N.t('reward.setItemTitle'):I18N.t('reward.legendPartTitle');
    bonusMsg=`<div style="margin-top:12px;background:rgba(212,175,55,.1);border:1px solid var(--gold);border-radius:8px;padding:10px;text-align:center">
      <img src="img/parts/${partId}.png" alt="" style="width:140px;height:140px;border-radius:8px;border:2px solid var(--gold);object-fit:cover;background:rgba(0,0,0,.4);box-shadow:0 0 18px rgba(255,215,0,.4);margin-bottom:8px" onerror="this.outerHTML='<div style=\\'font-size:80px;margin-bottom:8px\\'>'+'${_icon}'+'</div>'">
      <div style="font-size:26px">${_icon} ${_title}</div>
      <div style="font-size:17px;font-weight:bold;color:var(--gold);margin-top:4px">${(p?partDisplayNm(p):'')||p?.nm||partId}</div>
      <div style="font-size:12px;color:var(--dim);margin-top:3px">${p?.desc||''}</div>
      ${setComplete?`<div style="font-size:12px;color:var(--gold);margin-top:3px">${I18N.t('reward.setComplete')}</div>`:''}
    </div>`;
    notify(I18N.t('notify.partAcquiredTier',{ic:_icon,kind:isSet?I18N.t('ui.setShort'):I18N.t('ui.legendShort'),nm:(p?partDisplayNm(p):'')||p?.nm||partId}),'gold');
    baekgu(isSet?I18N.t('baekgu.setItem',{nm:partDisplayNm(p)||p?.nm}):I18N.t('baekgu.legendPart',{nm:partDisplayNm(p)||p?.nm}));
  } else if(roll<legendRate+mythicRate+setRate+turtleShipRate){
    // 사용자 요청: 거북선(LGD01) 신화 함선 5% 확률 — 지구 해방 보스전 진입 필수 함선
    const _lgdDef=(typeof SHIP_CATALOG!=='undefined')?SHIP_CATALOG.find(s=>s.id==='LGD01'):null;
    if(_lgdDef){
      const newShip={
        id:'LGD01_quest_'+Date.now(),catalogId:'LGD01',catId:'LGD01',
        nm:_lgdDef.nm,tier:'신화',
        maxHP:_lgdDef.maxHP,hp:_lgdDef.maxHP,
        maxSH:_lgdDef.maxSH||0,sh:_lgdDef.maxSH||0,
        ATT:_lgdDef.ATT||_lgdDef.atk||0,
        INT:_lgdDef.INT||0,TEC:_lgdDef.TEC||0,
        HP:_lgdDef.maxHP,LOY:_lgdDef.LOY||80,DEF:_lgdDef.DEF||0,
        cargoSlots:(typeof _lgdDef.cargoStart==='number'?_lgdDef.cargoStart:30),
        parts:[],crewIds:[]
      };
      const _addRes=(typeof addShipToFleet==='function')?addShipToFleet(newShip):null;
      const _lgdImg=(typeof shipImgSrc==='function')?shipImgSrc({id:'LGD01',catId:'LGD01',catalogId:'LGD01',tier:'신화'}):'';
      bonusMsg=`<div style="margin-top:12px;background:rgba(255,136,255,.1);border:1px solid #ff88ff;border-radius:8px;padding:10px;text-align:center">
        <img src="${_lgdImg}" alt="" style="width:144px;height:144px;object-fit:contain;filter:drop-shadow(0 0 18px #ff88ff);margin-bottom:6px" onerror="this.outerHTML='<div style=\\'font-size:96px;margin-bottom:6px\\'>✦</div>'">
        <div style="font-size:26px">✦ ${I18N.t('reward.turtleShipTitle')}</div>
        <div style="font-size:17px;font-weight:bold;color:#ff88ff;margin-top:4px">${shipDisplayNm(_lgdDef)||_lgdDef.nm}</div>
        <div style="font-size:12px;color:var(--dim);margin-top:3px">${I18N.t('reward.turtleShipDesc')}</div>
        ${_addRes&&_addRes.added==='reserve'?`<div style="font-size:12px;color:var(--cyan);margin-top:3px">${I18N.t('craft.reserveStored')}</div>`:''}
      </div>`;
      notify(I18N.t('notify.turtleShipGained'),'pur');
      baekgu(I18N.t('baekgu.turtleShipGained'));
    }
  }

  // ── 설계도 드롭 (5%, 미보유 시에만, 특별 보상과 독립) ──────────────────
  // 설계도 명성 게이트 완화 (이전: 전설 100, 신화 200) → (신규: 전설 30, 신화 60)
  // 명성이 낮아도 행성 퀘스트를 충분히 수행하면 모든 설계도가 드롭 가능
  if(!G.blueprints)G.blueprints={};
  const _bpId=BLUEPRINT_MAP[pid];
  const _bpRecCheck=_bpId&&CRAFT_RECIPES.find(r=>r.id===_bpId);
  const _bpTier=_bpRecCheck?.tier;
  // 설계도 명성 게이트 (사용자 피드백 — 초중반에도 잡힐 수 있게 완화):
  // 신화 60→40, 전설/기함 30→15
  const _bpRepOK=
    _bpTier==='mythic'?(rep>=40):
    _bpTier==='legend'||_bpTier==='flagship'?(rep>=15):
    true;
  // 설계도 드롭 확률 — 사용자 요청 +5%p 추가 인상
  //   전설(legend): 25%   /   신화(mythic): 20% → 30% (사용자 보고 2026-06-06)
  let _bpDropRate=(_bpTier==='mythic')?0.30:0.25;
  // 사용자 요청: 이휘소 방정식 미사일(MMB01) 설계도 +5%p 추가 가산
  if(_bpId==='MMB01')_bpDropRate+=0.05;
  // 사용자 요청 (2026-06-06): 거북선(LGD01) 설계도 +5%p 추가 가산 — 신화 함선 핵심 보스 진입 필수
  if(_bpId==='LGD01')_bpDropRate+=0.05;
  if(_bpId&&_bpRepOK&&!G.blueprints[_bpId]&&Math.random()<_bpDropRate){
    G.blueprints[_bpId]=true;
    const _bpRec=_bpRecCheck;
    const _bpTierCol=_bpRec?.tier==='mythic'?'#cc66ff':_bpRec?.tier==='flagship'?'#ff8800':'#d4af37';
    // 설계도 보상 박스 — 사용자 요청 2026-06-09: BP01(함선) / BP02(파츠) 이미지 표시
    const _bpNm=(_bpRec?partDisplayNm(_bpRec):'')||_bpRec?.nm||_bpId;
    const _bpImg=bpImgSrc(_bpId);
    bonusMsg+=`<div style="margin-top:12px;background:rgba(212,175,55,.08);border:1px solid ${_bpTierCol};border-radius:8px;padding:10px;text-align:center">
      <img src="${_bpImg}" alt="BP" style="width:144px;height:144px;object-fit:contain;filter:drop-shadow(0 0 18px ${_bpTierCol})" onerror="this.outerHTML='<div style=&quot;font-size:96px&quot;>📜</div>'">
      <div style="font-size:14px;color:var(--dim);margin-top:6px">${I18N.t('ui.bpAcquired')}</div>
      <div style="font-size:17px;font-weight:bold;color:${_bpTierCol};margin-top:4px">${_bpNm}</div>
      <div style="font-size:12px;color:var(--dim);margin-top:3px">${I18N.t('ui.canCraftHere')}</div>
    </div>`;
    try{notifyBlueprint(_bpId,_bpNm,'gold');}catch(e){notify(I18N.t('notify.bpAcquired',{nm:_bpNm}),'gold');}
    baekgu(I18N.t('baekgu.blueprintDrop',{nm:_bpNm}));
  }
  // ── 전설 창고 확장 설계도 드롭 (링4+ 행성에서 3% 확률, 명성 100+) ──
  const _pd4=PLANET_DEF.find(p=>p.id===pid);
  if((_pd4?.ring||0)>=4 && _legendUnlocked){
    // 전설 창고 확장 설계도 드롭 (SC04: 13%)
    const _cargoBps=[{id:'SC04',prob:0.13}];
    for(const _cb of _cargoBps){
      if(!G.blueprints[_cb.id]&&Math.random()<_cb.prob){
        G.blueprints[_cb.id]=true;
        const _cbRec=CRAFT_RECIPES.find(r=>r.id===_cb.id);
        const _cbNm=(_cbRec?partDisplayNm(_cbRec):'')||_cbRec?.nm||_cb.id;
        // 사용자 요청 2026-06-09: 화물 설계도 = 파츠 분류 → BP02
        const _cbBpImg=bpImgSrc(_cb.id);
        bonusMsg+=`<div style="margin-top:12px;background:rgba(212,175,55,.08);border:1px solid #d4af37;border-radius:8px;padding:10px;text-align:center">
          <img src="${_cbBpImg}" alt="BP" style="width:144px;height:144px;object-fit:contain;filter:drop-shadow(0 0 18px #d4af37)" onerror="this.outerHTML='<div style=&quot;font-size:96px&quot;>📜</div>'">
          <div style="font-size:14px;color:var(--dim);margin-top:6px">${I18N.t('ui.cargoBpAcquired')}</div>
          <div style="font-size:17px;font-weight:bold;color:#d4af37;margin-top:4px">${_cbNm}</div>
          <div style="font-size:12px;color:var(--dim);margin-top:3px">${I18N.t('ui.canCraftLegendaryHold')}</div>
        </div>`;
        try{notifyBlueprint(_cb.id,_cbNm,'gold');}catch(e){notify(I18N.t('notify.cargoBpAcquired',{nm:_cbNm}),'gold');}
        break;
      }
    }
  }

  // ── 전설 영웅 조우 ────────────────────────────────────────────────
  // 사용자 요청 (2026-06-06, 옵션 E):
  //   · 확률 30% → 50% 상향
  //   · 행성당 시도 횟수 제한 제거 (종전: _phCount < 2) → 무제한 시도
  //   · 같은 행성을 반복 방문/퀘스트 수행 시 결국 영입 가능 (RNG 영영 실패 차단)
  // H01~H08은 각자 지정된 행성의 퀘스트 보상에서 50% 확률로 등장
  {const _hPd=PLANET_DEF.find(function(p){return p.id===pid;});
  const _hHId=_hPd&&_hPd.hero;
  if(!G.planetHeroCount)G.planetHeroCount={};
  // H01(이순신)은 난중일기 영인본(G18) 보유 시에만 등장 — 없으면 다음 기회로 보존
  const _hasG18Q=!!(G.inventory&&G.inventory.find(i=>i.id==='G18'&&i.qty>0));
  const _hReqOk=(_hHId!=='H01')||_hasG18Q;
  if(_hHId&&_hReqOk&&!(G.heroes||[]).includes(_hHId)&&Math.random()<0.50){
    G.planetHeroCount[pid]=(G.planetHeroCount[pid]||0)+1;  // 통계용 카운터 (UI 힌트에서 사용)
    setTimeout(function(){showHeroRecruit(_hHId);},1400);
  }}
  changeReputation(1);
  const _repMultLbl=_repMult>1?I18N.t('quest.fameMult',{m:_repMult}):'';
  const baseMsg=I18N.t('quest.completeMsg',{cr:_actualCr.toLocaleString(),multTxt:_rm>1.05?I18N.t('quest.multTimes',{m:_rm.toFixed(1)}):'',repMult:_repMultLbl,ve:_actualVe>0?I18N.t('quest.veGain',{n:_actualVe}):'',rep:G.reputation});
  notify(baseMsg,'gold');
  if(!bonusMsg){
    baekgu(I18N.t('baekgu.questReward',{cr:_actualCr.toLocaleString(),bonus:_rm>1.05?I18N.t('baekgu.levelBonusX',{mult:_rm.toFixed(1)}):''}));
    _showQuestRewardToast(_actualCr,_actualVe,_rm);  // 짧은 보상 팝업 (2초 자동 소멸)
  }

  if(bonusMsg){
    // 🎉 희귀 보상(설계도/전설/신화) 획득 시 효과음 + 강조
    try{
      const isMythic=/신화|mythic/i.test(bonusMsg);
      AudioMgr.playSfx(isMythic?'gacha_pull':'notify',{vol:isMythic?1.0:0.85,cooldown:50});
      setTimeout(()=>{try{AudioMgr.playSfx('coin',{vol:0.7,cooldown:200});}catch(e){}},250);
    }catch(e){}
    openModal(I18N.t('modal.questReward'),
      `<div style="text-align:center;padding:8px">
        <div style="font-size:16px;color:var(--gold);margin-bottom:8px">${baseMsg}</div>
        ${bonusMsg}
      </div>`,
      [{txt:I18N.t('btn.confirm'),fn:()=>{
        closeModal();
        const _pend=G._pendingQuestCrew;
        delete G._pendingQuestCrew;
        saveGame(true);
        if(_pend){
          // 전설 동료 교체 팝업
          const _RORDER={L:4,H:3,R:2,N:1};
          const _assignedIds=new Set(G.fleet.flatMap(s=>s.crewIds||[]));
          const _lowest=[...G.crew].filter(c=>!_assignedIds.has(c.id)).sort((a,b)=>(_RORDER[a.rarity]||1)-(_RORDER[b.rarity]||1))[0];
          if(_lowest){
            const _lowImg=(typeof crewImgSrc==='function')?crewImgSrc(_lowest):'';
            const _pendImg=(typeof crewImgSrc==='function')?crewImgSrc(_pend):'';
            openModal(I18N.t('modal.legendCompanionOffer'),
              `<div style="padding:12px">
                <div style="font-size:15px;font-weight:bold;margin-bottom:10px;color:var(--gold)">${I18N.t('ui.legendCompanionChance')}</div>
                <div style="display:flex;gap:16px;align-items:center;justify-content:center;margin-bottom:12px">
                  <div style="text-align:center;padding:10px;background:rgba(255,59,59,.1);border:1px solid var(--red);border-radius:8px;min-width:110px">
                    <img src="${_lowImg}" alt="${crewDisplayNm(_lowest)}" style="width:64px;height:64px;border-radius:50%;border:2px solid var(--red);object-fit:cover;background:rgba(0,0,0,.4);margin-bottom:4px" onerror="this.outerHTML='<div style=\\'font-size:30px;margin-bottom:4px\\'>'+'${_lowest.ic||'🧑'}'+'</div>'">
                    <div style="font-size:13px;font-weight:bold;margin-top:4px">${crewDisplayNm(_lowest)}</div>
                    <div style="font-size:11px;color:var(--dim)">${I18N.t('ui.rarityRank',{lbl:I18N.rarity(_lowest.rarity)||_lowest.rarity})}</div>
                  </div>
                  <div style="font-size:22px;color:var(--dim)">→</div>
                  <div style="text-align:center;padding:10px;background:rgba(255,215,0,.1);border:1px solid var(--gold);border-radius:8px;min-width:110px">
                    <img src="${_pendImg}" alt="${crewDisplayNm(_pend)}" style="width:64px;height:64px;border-radius:50%;border:2px solid var(--gold);object-fit:cover;background:rgba(0,0,0,.4);margin-bottom:4px" onerror="this.outerHTML='<div style=\\'font-size:30px;margin-bottom:4px\\'>'+'${_pend.ic||'🧑'}'+'</div>'">
                    <div style="font-size:13px;font-weight:bold;margin-top:4px">${crewDisplayNm(_pend)}</div>
                    <div style="font-size:11px;color:var(--gold)">${I18N.t('ui.legendTier')}</div>
                  </div>
                </div>
                <div style="font-size:12px;color:var(--dim);text-align:center;margin-bottom:6px">${_pend.desc||''}</div>
                <div style="font-size:13px;color:var(--dim);text-align:center">${I18N.t('ui.swapLegendConfirm',{old:crewDisplayNm(_lowest),new:crewDisplayNm(_pend)})}</div>
              </div>`,
              [{txt:I18N.t('ui.acceptSwap'),fn:()=>{
                G.fleet.forEach(s=>{if(s.crewIds){const _i=s.crewIds.indexOf(_lowest.id);if(_i>=0)s.crewIds.splice(_i,1);}});
                const _ti=G.crew.findIndex(x=>x.id===_lowest.id);
                if(_ti>=0)G.crew.splice(_ti,1);
                G.crew.push(_pend);
                closeModal();
                notify(I18N.t('notify.legendSwapRecruit',{old:crewDisplayNm(_lowest),new:crewDisplayNm(_pend)}),'gold');
                baekgu(I18N.t('baekgu.crewJoinedDismiss',{nm:crewDisplayNm(_pend),old:crewDisplayNm(_lowest)}));
                saveGame(true);
                if(_fromTavern)rerenderTab(renderTavernView);else rerenderTab(renderQuestTab);
              },cls:'btn-gold'},{txt:I18N.t('ui.decline'),fn:()=>{
                closeModal();
                baekgu(I18N.t('baekgu.legendCompDeclined'));
                if(_fromTavern)rerenderTab(renderTavernView);else rerenderTab(renderQuestTab);
              },cls:'btn-sm'}]);
          } else {
            notify(I18N.t('notify.crewListFull'),'err');
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
    // 일반 퀘스트 완료 시 — 작은 확인 팝업 (보상은 이미 지급됨, 확인용)
    _showQuestRewardToast(_actualCr,_actualVe,_rm,_repMult);
  }
  // ─── 영웅 퀘스트는 행성 도착 시 자동 스폰으로 전환 (사용자 보고/요청 2026-06-15) ───
  //   이전: 일반 퀘 8회 완료 임계 + 시나리오 고정순서 게이팅 → 영웅을 영영 못 받는 문제.
  //   변경: 임계 제거. 해당 영웅의 캐논 행성에 도착하면 즉시 퀘스트(status:done)로 영입 가능.
  //         → spawnPhasedQuests → _spawnHeroQuestForPlanet(pid) 에서 처리.
}
// 퀘스트 완료 시 작은 보상 안내 팝업 (보너스 없는 일반 완료용)
// 화면 우상단에 자동 사라지는 카드 형태 — 모달이 아니라 클릭으로 닫을 수 있는 작은 패널
function _showQuestRewardToast(cr,ve,levelMult,repMult){
  // 기존 동일 토스트 있으면 제거
  const old=document.getElementById('_quest-reward-toast');if(old)old.remove();
  const _hasBonus=(levelMult>1.05)||(repMult>1);
  const card=document.createElement('div');
  card.id='_quest-reward-toast';
  card.style.cssText='position:fixed;top:72px;right:20px;z-index:99996;background:linear-gradient(135deg,rgba(40,30,8,.98),rgba(20,15,5,.98));border:2px solid var(--gold);border-radius:10px;padding:12px 16px;min-width:240px;max-width:300px;color:#fff;font-family:Malgun Gothic,sans-serif;box-shadow:0 8px 24px rgba(255,215,0,.4),0 0 16px rgba(255,215,0,.2);animation:_qrSlide .35s ease-out;cursor:pointer';
  // CSS 애니메이션 1회 주입
  if(!document.getElementById('_qr-style')){
    const st=document.createElement('style');st.id='_qr-style';
    st.textContent='@keyframes _qrSlide{from{transform:translateX(20px);opacity:0}to{transform:translateX(0);opacity:1}}@keyframes _qrFade{from{opacity:1}to{opacity:0;transform:translateX(20px)}}';
    document.head.appendChild(st);
  }
  card.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <div style="font-size:13px;font-weight:bold;color:var(--gold);letter-spacing:1px">${I18N.t('ui.questCompleteHeader')}</div>
      <div style="color:#888;font-size:14px;line-height:1">✕</div>
    </div>
    <div style="font-size:12px;line-height:1.6;color:#dde">
      <div>💰 +₡<b style="color:#ffd700">${(cr||0).toLocaleString()}</b>${levelMult>1.05?` <span style="color:#88ddff">×${levelMult.toFixed(1)}</span>`:''}</div>
      ${ve>0?`<div>${I18N.t('ui.veGained',{n:`<b style="color:#cc66ff">${ve}</b>`})}</div>`:''}
      <div>${I18N.t('ui.repPlus1Line',{n:G.reputation||0})}</div>
      ${_hasBonus?`<div style="color:#ff88cc;margin-top:3px">${I18N.t('ui.bonusMultActive')}</div>`:''}
    </div>`;
  document.body.appendChild(card);
  // 클릭으로 즉시 닫기
  card.onclick=()=>{card.remove();};
  // 4초 후 자동 페이드아웃
  setTimeout(()=>{
    if(!document.body.contains(card))return;
    card.style.animation='_qrFade .4s ease-out forwards';
    setTimeout(()=>{if(document.body.contains(card))card.remove();},420);
  },4000);
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
      notify(I18N.t('notify.combatQuestDone'),'gold');
      saveGame(true);
    },1200);
  }
}
// ── 좌측 탐색 버튼 표시/숨김 업데이트 ──────────────────────────
// 잔해 탐색은 항상 활성. 기본 10초 쿨다운 + 전설급 크루(또는 영웅) 1명당 1초 감소(최소 5초)
const GATHER_COOLDOWN_BASE_MS=8000;   // 잔해 탐색 최대 쿨타임 8초 (사용자 명세, 기존 10초)
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
  const isCombatQ=(G.quests[pid]||[]).some(q=>q.status==='active'&&q.type==='combat'&&(q.nm.includes('치크스')||q.nm.toLowerCase().includes('chiks')));
  // 전투 중 모드 — 잔해 해적 합류 호출 (쿨다운 무관, 한 전투당 2회 한도)
  const _inCombat=(typeof combatState!=='undefined')&&combatState&&!combatState.done;
  const _joinUsed=_inCombat?(combatState._debrisJoinCount||0):0;
  const _joinMax=2;
  if(_inCombat){
    const _exhausted=_joinUsed>=_joinMax;
    if(_exhausted){
      btn.style.background='rgba(80,80,80,.12)';
      btn.style.borderColor='rgba(255,255,255,.1)';
      btn.style.color='#888';btn.style.opacity='.55';btn.style.cursor='default';btn.style.animation='none';
    } else {
      btn.style.background='rgba(255,60,60,.10)';
      btn.style.borderColor='rgba(255,80,80,.45)';
      btn.style.color='rgba(255,150,150,1)';
      btn.style.opacity='1';btn.style.cursor='pointer';btn.style.animation='pulse 1.8s infinite';
    }
    const span2=btn.querySelector('span:last-child');
    if(span2)span2.textContent=_exhausted?I18N.t('ui.wreckJoinExhausted'):I18N.t('ui.wreckJoinCount',{used:_joinUsed,max:_joinMax});
    return;
  }
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
    if(onCooldown)span.textContent=I18N.t('ui.wreckExploreCountdown',{s:Math.ceil(left/1000)});
    else span.textContent=isCombatQ?I18N.t('scout.patrol'):I18N.t('scout.salvage');
  }
  // 쿨다운 중이면 1초마다 갱신 예약
  if(onCooldown){
    if(!window._gatherCdTimer){
      window._gatherCdTimer=setInterval(()=>{
        // 허브 화면을 떠났으면 타이머 정리 (메모리·DOM 쿼리 누수 방지)
        const _hubOn=document.getElementById('s-hub')?.classList.contains('on');
        if(!_hubOn||_gatherCooldownLeft()<=0){
          clearInterval(window._gatherCdTimer);window._gatherCdTimer=null;
          if(!_hubOn)return;  // 허브 떠난 상태면 마지막 갱신도 생략
        }
        updateGatherBtn();
      },1000);
    }
  }
}

// ── 잔해/정찰대 탐색 실행 (항상 활성, 30초 쿨다운) ────────────
// ── 전투 중 잔해 탐색 시 적 함대를 현재 전투에 추가 합류시키는 헬퍼 ──
// 현재 행성의 링·아군 함대 평균 전투력에 맞춰 1~3척의 잔해 해적을 즉시 스폰
function spawnDebrisReinforcementToCombat(){
  if(!combatState||combatState.done)return;
  const pid=G.currentPlanet;
  const pd=PLANET_DEF.find(p=>p.id===pid);
  const ring=pd?.ring||1;
  // 잔해 해적 능력치 (doGatherSearch의 30% 분기 로직과 동일한 공식 — 50~70% 캡 적용)
  const dm=getDiffMult(),lm=getLevelMult(),egm=getEarlyGameMult();
  const _rdHP=Math.round((80+ring*30)*dm*lm*egm);
  const _rdATK=Math.round((18+ring*5)*dm*lm*egm);
  const _rdINT=Math.round((12+ring*3)*dm*lm*egm);
  const _rdTEC=Math.round((8+ring*2)*dm*lm*egm);
  const _cap=clampEnemyStats(_rdHP,_rdATK,_rdINT,_rdTEC,calcFleetAvgPower());
  const eHP=_cap.eHP,eATK=_cap.eATK,eINT=_cap.eINT,eTEC=_cap.eTEC;
  // 합류 척수: 링1-3=1척, 4-6=2척, 7=3척
  const joinCount=ring>=7?3:ring>=4?2:1;
  const _tier=(i)=>{
    if(ring>=7)return i===0?'대형':'중형';
    if(ring>=5)return '중형';
    return '소형';
  };
  const _nm=(i)=>{
    if(ring>=7)return i===0?I18N.t('debris.motherSupport'):I18N.t('debris.midSupport');
    if(ring>=5)return joinCount>1?I18N.t('debris.midSupportN',{i:i+1}):I18N.t('debris.midSupport');
    return joinCount>1?I18N.t('debris.smallSupportN',{i:i+1}):I18N.t('debris.smallSupport');
  };
  const _hp=(i)=>Math.round(eHP*(ring>=7&&i===0?2.0:ring>=5&&i===0?1.4:1.0));
  // 기존 _debrisJoinCount 누적 — 같은 전투에서 두번째 합류일 때 _2 suffix
  combatState._debrisJoinCount=(combatState._debrisJoinCount||0)+1;
  const _suffix='_J'+combatState._debrisJoinCount+'_';
  const newEnemies=[];
  for(let i=0;i<joinCount;i++){
    const e={
      id:'DBRP'+_suffix+i+'_'+Date.now(),
      nm:_nm(i),
      tier:_tier(i),
      isEnemy:true,
      maxHP:_hp(i),hp:_hp(i),
      maxSH:Math.floor(_hp(i)*0.3),sh:Math.floor(_hp(i)*0.3),
      ATT:Math.round(eATK*(ring>=7&&i===0?1.5:1.0)),
      INT:Math.round(eINT*(ring>=7&&i===0?1.3:1.0)),
      TEC:eTEC,HP:_hp(i),LOY:0,
      parts:[],crewIds:[],
      _joined:true  // 합류 표시 (로그/렌더링용)
    };
    newEnemies.push(e);
  }
  combatState.enemies.push(...newEnemies);
  // 로그 + 알림 + 사운드
  addCombatLog(I18N.t('combat.debrisPiratesJoin',{n:joinCount}),'err');
  notify(I18N.t('notify.debrisPiratesJoinShort',{n:joinCount}),'warn');
  try{baekgu(I18N.t('baekgu.debrisPirates'));}catch(e){}
  try{sfxAlert();}catch(e){}
  try{AudioMgr.playSfx('notify',{vol:0.7});}catch(e){}
  // 잔해 탐색 횟수 허브 진행도에도 카운트 (전투 외 행동과 동일)
  try{addHubProgress(pid);}catch(e){}
  // 캔버스 즉시 갱신 — 신규 적 함선 화면에 노출
  try{if(typeof drawCombatFrame==='function')drawCombatFrame();}catch(e){}
  // 버튼 라벨 갱신 (잔해 합류 카운트 반영)
  try{updateGatherBtn();}catch(e){}
}

function doGatherSearch(){
  // ── 전투 중이면 잔해 해적 적 함대를 현재 전투에 합류시킴 (지원군 효과) ──
  // 한 전투당 최대 2회까지만 허용 — 전투가 너무 길어지지 않도록
  if(typeof combatState!=='undefined'&&combatState&&!combatState.done){
    if((combatState._debrisJoinCount||0)>=2){
      notify(I18N.t('notify.debrisPiratesFull'),'warn');
      return;
    }
    spawnDebrisReinforcementToCombat();
    return;
  }
  // 쿨다운 체크 (전투 외)
  const _cdLeft=_gatherCooldownLeft();
  if(_cdLeft>0){
    notify(I18N.t('notify.scanCooldown',{n:Math.ceil(_cdLeft/1000)}),'warn');
    return;
  }
  window._lastGatherTime=Date.now();
  updateGatherBtn();
  // 잔해 탐색 횟수도 행성 허브 해금 진행도에 포함
  try{addHubProgress(G.currentPlanet);}catch(e){}
  // bugfix 2026-06-11 v2: 잔해 탐색 → '탐색 계열' explore 퀘만 진행 (경매/수리/장착 태그는 제외)
  try{if(typeof bumpStoryQuestProgress==='function')bumpStoryQuestProgress('gather',1,G.currentPlanet);}catch(e){}
  // 배경 이미지 숨김 (글자 가독성)
  const _bg=document.getElementById('hub-planet-bg');
  if(_bg)_bg.style.opacity='0';
  const pid=G.currentPlanet;
  const pd=PLANET_DEF.find(p=>p.id===pid);
  const ring=pd?.ring||1;

  // 활성 퀘스트 판별 (있으면 보너스로 진행도 반영)
  const gatherQ=(G.quests[pid]||[]).find(q=>q.status==='active'&&(q.type==='gather'||q.type==='explore'));
  const combatQ=(G.quests[pid]||[]).find(q=>q.status==='active'&&q.type==='combat'&&(q.nm.includes('치크스')||q.nm.toLowerCase().includes('chiks')));

  notify(I18N.t('notify.scanning'),'ok');
  baekgu(I18N.t('baekgu.searchStart'));

  // ── 1) 치크스 정찰대 탐색 (30% 조우) ─────────────────────
  if(combatQ){
    if(Math.random()<0.30){
      const dm=getDiffMult(),lm=getLevelMult(),ptm=Math.min(5,(G.pirateKills||0)/20+1),egm=getEarlyGameMult();
      // 치크스 정찰대 HP 50% 감소 + 50~70% 캡 (보스 제외 밸런스 조정)
      const _rcpHP=Math.round((150+ring*60)*dm*lm*egm*0.5),_rcpATK=Math.round((30+ring*8)*dm*lm*egm),_rcpINT=Math.round((20+ring*5)*dm*lm*egm),_rcpTEC=Math.round((15+ring*4)*dm*lm*egm);
      const _cChP=clampEnemyStats(_rcpHP,_rcpATK,_rcpINT,_rcpTEC,calcFleetAvgPower());
      const eHP=_cChP.eHP,eATK=_cChP.eATK,eINT=_cChP.eINT,eTEC=_cChP.eTEC;
      const chixFleet=[
        {id:'CHIX_1',nm:'치크스 정찰기',_nmKey:'enemy.chiksScout',tier:'소형',isEnemy:true,maxHP:eHP,hp:eHP,maxSH:Math.floor(eHP*0.4),sh:Math.floor(eHP*0.4),ATT:eATK,INT:eINT,TEC:eTEC,HP:eHP,LOY:0,parts:[],crewIds:[]},
        {id:'CHIX_2',nm:'치크스 정찰기 B',_nmKey:'enemy.chiksScoutB',tier:'소형',isEnemy:true,maxHP:Math.floor(eHP*.8),hp:Math.floor(eHP*.8),maxSH:Math.floor(eHP*0.3),sh:Math.floor(eHP*0.3),ATT:Math.floor(eATK*.9),INT:eINT,TEC:eTEC,HP:Math.floor(eHP*.8),LOY:0,parts:[],crewIds:[]}
      ];
      const raidDef={id:'CHIX_PATROL',nm:I18N.t('chix.patrolName'),ring,f:'F05',hostile:true,tax:0,_enemies:chixFleet,_questPid:pid,_questId:combatQ.id};
      openModal(I18N.t('modal.chixScoutFound'),
        (function(){
          const _verCS=(window._GAME_VER)?('?v='+encodeURIComponent(window._GAME_VER)):'';
          const _csImg='img/quests/combat_F05.png'+_verCS;
          return _hostileVsHeader({enemyImg:_csImg,enemyName:I18N.t('chix.patrolName'),enemyFallback:'👾'});
        })()
        +`<div style="text-align:center;padding:0 6px 8px"><div style="color:var(--purple);font-size:16px;font-weight:bold;margin-bottom:6px">${I18N.t('ui.encounterChixScan')}</div>
         <div style="font-size:13px;color:var(--dim);line-height:1.8">적군: 치크스 정찰기 2척<br>${I18N.t('ui.repelCompletesQuest')}</div></div>`,
        [{txt:I18N.t('ui.fight'),fn:()=>{closeModal();_safeCombatEntry(function(){startChixPatrolCombat(raidDef);},"startChixPatrolCombat");},cls:'btn-red'},
         {txt:I18N.t('btn.fleeShort'),fn:()=>{closeModal();notify(I18N.t('notify.chixScoutFled'),'warn');},cls:'btn-sm'}]);
    } else {
      notify(I18N.t('notify.scanNoScouts'),'warn');
      baekgu(I18N.t('baekgu.searchNothing'));
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
      if(ring>=7) return idx===0?I18N.t('debris.mainMother'):I18N.t('debris.mainMid');
      if(ring>=5) return pirateCount>1?I18N.t('debris.mainMidN',{i:idx+1}):I18N.t('debris.mainMid');
      return pirateCount>1?I18N.t('debris.mainSmallN',{i:idx+1}):I18N.t('debris.mainSmall');
    };
    const _dbrpHP=(idx)=>Math.round(eHP*(ring>=7&&idx===0?2.0:ring>=5&&idx===0?1.4:1.0));
    const enemies=Array.from({length:pirateCount},(_,i)=>({
      id:'DBRP_'+i,nm:_dbrpNm(i),tier:_dbrpTier(i),isEnemy:true,
      maxHP:_dbrpHP(i),hp:_dbrpHP(i),maxSH:Math.floor(_dbrpHP(i)*.3),sh:Math.floor(_dbrpHP(i)*.3),
      ATT:Math.round(eATK*(ring>=7&&i===0?1.5:1.0)),INT:Math.round(eINT*(ring>=7&&i===0?1.3:1.0)),
      TEC:eTEC,HP:_dbrpHP(i),LOY:0,parts:[],crewIds:[]
    }));
    const raidDef={id:'DEBRIS_PIRATE',nm:I18N.t('debris.raidName'),ring,f:'PIRATE',hostile:true,tax:0,_enemies:enemies,_questPid:pid,_questId:gatherQ?gatherQ.id:null,_isDebris:true};
    // 사용자 요청 2026-06-08: 잔해 해적 출현 팝업 — 적 이미지를 현재 행성 문명권의 전투계열 인물로 교체
    //   · 기존 img/ships/DBRP_*.png (함선 이미지) → img/quests/combat_F0X.png (인물 이미지)
    //   · 항로 해적·적대 행성 진입과 동일한 폴백 패턴 적용
    const _ver=(window._GAME_VER)?('?v='+encodeURIComponent(window._GAME_VER)):'';
    const _flagship=G.fleet[0];
    const _ourShipSrc=_flagship?shipImgSrc(_flagship):('img/ships/Default.png'+_ver);
    const _ourShipName=_flagship?(shipDisplayNm(_flagship)||_flagship.nm||I18N.t('ui.flagship')):I18N.t('ui.flagship');
    // 현재 행성 팩션 기반 — F01~F07 매칭, 비-F0X면 F01 폴백
    const _curPd=PLANET_DEF.find(p=>p.id===G.currentPlanet);
    const _pFac=(/^F0[1-7]$/.test(_curPd?.f||''))?_curPd.f:'F01';
    const _enemyShipSrc='img/quests/combat_'+_pFac+'.png'+_ver;
    openModal(I18N.t('modal.debrisPiratesAppear'),
      _hostileVsHeader({enemyImg:_enemyShipSrc,enemyName:I18N.t('debris.raidName'),enemyFallback:'☠️'})
      +`<div style="text-align:center;padding:0 6px 8px">
        <div style="color:var(--red);font-size:16px;font-weight:bold;margin-bottom:6px">${I18N.t('ui.encounterPirateScan')}</div>
        <div style="font-size:13px;color:var(--dim);line-height:1.8">${I18N.t('ui.enemyCount',{nm:I18N.t('debris.raidName'),n:pirateCount})}<br>${I18N.t('ui.scanContinues')}</div>
      </div>`,
      [{txt:I18N.t('ui.fight'),fn:()=>{closeModal();startDebrisPirateCombat(raidDef);},cls:'btn-red'},
       {txt:I18N.t('btn.fleeAbortSearch'),fn:()=>{closeModal();notify(I18N.t('notify.searchAborted'),'warn');},cls:'btn-sm'}]);

  } else if(roll<0.40){
    // 10%: 아이템 또는 함선 획득 (전설급 포함)
    _grantDebrisReward(ring,gatherQ,pid);

  } else {
    // 60%: 잔해 발견 — 퀘스트 진행 또는 안내 메시지
    if(gatherQ){
      _progressGatherQuest(gatherQ,pid);
    } else {
      notify(I18N.t('notify.scanNothing'),'ok');
      baekgu(I18N.t('baekgu.searchNothingAlt'));
    }
  }
}

// 잔해 퀘스트 진행 처리
function _progressGatherQuest(q,pid){
  if(!q)return;
  q.progress=Math.min(q.required,(q.progress||0)+1);
  if(q.progress>=q.required){
    q.status='done';
    notify(I18N.t('notify.questDoneClaim',{nm:q.nm}),'gold');
    baekgu(I18N.t('baekgu.searchCompleteQuest'));
    updateGatherBtn();
  } else {
    notify(I18N.t('notify.debrisProgress',{n:q.progress,max:q.required}),'ok');
    baekgu(I18N.t('baekgu.searchPartial'));
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
    notify(I18N.t('notify.partFoundTier',{kind:isLegend?I18N.t('ui.legendStar'):I18N.t('ui.legendSparkle'),nm:partDisplayNm(p)||p.nm,tier:p.tier}),isLegend?'pur':'gold');
    baekgu(I18N.t('baekgu.partFound',{nm:partDisplayNm(p)||p.nm,quality:isLegend?I18N.t('baekgu.partQualityLegend'):I18N.t('baekgu.partQualityGood')}));
  } else {
    // 함선: ring 3+에서 중형, ring 5+에서 대형 가능
    const tierPool=ring>=5?['소형','소형','중형','중형','대형']:ring>=3?['소형','소형','중형']:['소형'];
    const tier=tierPool[Math.floor(Math.random()*tierPool.length)];
    const shipPool=SHIP_CATALOG.filter(s=>s.tier===tier);
    if(!shipPool.length){_progressGatherQuest(q,pid);return;}
    const def=shipPool[Math.floor(Math.random()*shipPool.length)];
    {
      const slotsByTier={소형:4,중형:8,대형:12,전설기함:16,신화:20};
      addShipToFleet({id:'DBR_'+Date.now(),catId:def.catalogId||def.catId||def.id,nm:I18N.t('debris.recovered',{nm:shipDisplayNm(def)||def.nm}),tier:def.tier,maxHP:Math.floor(def.maxHP*.7),hp:Math.floor(def.maxHP*.5),maxSH:Math.floor(def.maxSH*.7),sh:0,ATT:def.ATT,INT:def.INT,TEC:def.TEC,HP:def.maxHP,LOY:55,parts:[],crewIds:[],cargoSlots:slotsByTier[def.tier]||5});
      notify(I18N.t('notify.shipSalvaged',{tier:I18N.tier(def.tier),nm:shipDisplayNm(def)||def.nm}),'gold');
      baekgu(I18N.t('baekgu.shipSalvaged',{nm:shipDisplayNm(def)||def.nm}));
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
    const t=document.getElementById('cb-title');if(t)t.textContent=I18N.t('combat.title.debris');
    setTimeout(()=>{addCombatLog(I18N.t('combat.debrisPiratesAppear'),'');runCombatTurn();},400);
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
    const t=document.getElementById('cb-title');if(t)t.textContent=I18N.t('combat.title.chixScout');
    setTimeout(()=>{addCombatLog(I18N.t('combat.chixScoutsAppear'),'');runCombatTurn();},400);
  });
}

function tickGatherQuests(){
  Object.keys(G.quests).forEach(function(pid){
    (G.quests[pid]||[]).forEach(function(q){
      if(q.type==='gather'&&q.status==='active'&&q.planetId===G.currentPlanet){
        q.progress=Math.min(q.required,(q.progress||0)+1);
        if(q.progress>=q.required){q.status='done';notify(I18N.t('notify.gatherQuestDone',{nm:q.nm}),'ok');}
      }
    });
  });
}
// ─── 시나리오(story_quest) 진행도 평가 ────────────────────────────
// 사용자 보고 2026-06-07: 메인(시나리오) 퀘스트가 작업 수행해도 완료 안 됨
// → story_quest 의 첫 objective 를 자동 평가 (cargo 보유량 / 행성 도착 / 격파 카운트)
// _storyQuestCurrentProgress / tickStoryQuests — js/story-quest-engine.js 로 이관 (사용자 요청 2026-06-07)
// window.tickStoryQuests / window._storyQuestCurrentProgress 로 글로벌 노출
function checkDeliveryQuests(arrivedPid){
  Object.keys(G.quests).forEach(function(pid){
    (G.quests[pid]||[]).forEach(function(q){
      if(q.type==='delivery'&&q.status==='active'&&q.targetId===arrivedPid){
        q.status='done';notify(I18N.t('notify.deliveryComplete',{nm:q.nm}),'ok');baekgu(I18N.t('baekgu.deliveryArrived'));
      }
    });
  });
}
function takeLoan(){
  if((G.loan||0)>=20000){notify(I18N.t('notify.loanLimitExceeded'),'err');return;}
  var amt=5000;G.loan=(G.loan||0)+amt;G.credits+=amt;
  updateHUD();notify(I18N.t('notify.loanGranted',{amt:amt.toLocaleString(),total:G.loan.toLocaleString()}),'ok');
  baekgu(I18N.t('baekgu.loanGranted'));
  saveGame(true);rerenderTab(renderQuestTab);
}
// ═══ 제작소 ═════════════════════════════════════════════════════════
function rollCraftQuality(superiorBonus){
  // 제작 품질 등급 (확률 동일, 배율만 조정)
  // 마스터작 +30% / 상급작 +15% / 보통 ±0% / 하급 -10% / 불량 -20%
  //
  // 사용자 요청 (2026-06-06): 함선 제작 시 "상급 이상(상급작+마스터작)" 확률에
  //   100회 제작당 +1%p 누적 보너스. 보너스는 superiorBonus(0~1) 인자로 받음.
  //   상급작/마스터작 영역을 확장하고 보통(이하) 영역을 그만큼 축소.
  const _bonus=clamp(+superiorBonus||0,0,0.30);  // 최대 30%p 안전 캡
  const r=Math.random();
  if(r<0.065+_bonus*0.36)return{mult:1.30,label:I18N.t('craft.masterpiece'),col:'#ff8800'};  // 마스터작도 비율 따라 소폭 상승
  if(r<0.18+_bonus)       return{mult:1.15,label:I18N.t('craft.superior'),col:'#d4af37'};
  if(r<0.53+_bonus)       return{mult:1.00,label:I18N.t('craft.normal'),col:'var(--cyan)'};
  if(r<0.765+_bonus)      return{mult:0.90,label:I18N.t('craft.poor'),col:'var(--dim)'};
  return{mult:0.80,label:I18N.t('craft.faulty'),col:'var(--red)'};
}
// 함선 제작 누적 카운터 기반 상급이상 보너스 — 10회당 +0.1%p (사용자 정정 2026-06-06),
//   최대 30%p 캡은 rollCraftQuality 내부에서 안전망 적용.
function _shipCraftSuperiorBonus(){
  const _n=(G&&G.craftCount)?G.craftCount:0;
  return Math.floor(_n/10)*0.001;
}
// 폭죽 연출 — 마스터작 제작 시 화면 전체에 분출 + 효과음 (사용자 요청)
function _fireFireworks(){
  try{AudioMgr.playSfx('gacha_pull',{vol:0.9,cooldown:0});}catch(e){}
  setTimeout(()=>{try{AudioMgr.playSfx('notify',{vol:0.8,cooldown:0});}catch(e){}},250);
  const host=document.getElementById('game-stage')||document.body;
  const cv=document.createElement('canvas');
  cv.style.cssText='position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:99990';
  const W=host.clientWidth||1500, H=host.clientHeight||750;
  cv.width=W;cv.height=H;
  host.appendChild(cv);
  const ctx=cv.getContext('2d');
  const _COLS=['#ff4477','#ffdd33','#44eaff','#aaff66','#ff8844','#cc66ff','#ffffff'];
  const _particles=[];
  // 5발 폭죽 — 시작 위치 무작위, 각 발사 후 ~70 파티클 방사
  let _shotsLeft=5;
  const _spawnBurst=()=>{
    const ox=W*(0.2+Math.random()*0.6);
    const oy=H*(0.2+Math.random()*0.4);
    const col=_COLS[Math.floor(Math.random()*_COLS.length)];
    for(let i=0;i<70;i++){
      const a=Math.random()*Math.PI*2;
      const sp=2+Math.random()*5;
      _particles.push({x:ox,y:oy,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:1,col,sz:2+Math.random()*2});
    }
  };
  _spawnBurst();_shotsLeft--;
  const _shotIv=setInterval(()=>{if(_shotsLeft<=0){clearInterval(_shotIv);return;}_spawnBurst();_shotsLeft--;},420);
  let _ranTicks=0;
  const _draw=()=>{
    ctx.clearRect(0,0,W,H);
    _particles.forEach(p=>{
      p.x+=p.vx;p.y+=p.vy;p.vy+=0.10;p.vx*=0.99;p.vy*=0.99;p.life-=0.018;
      if(p.life<=0)return;
      ctx.globalAlpha=Math.max(0,p.life);
      ctx.fillStyle=p.col;
      ctx.shadowColor=p.col;ctx.shadowBlur=12;
      ctx.beginPath();ctx.arc(p.x,p.y,p.sz,0,Math.PI*2);ctx.fill();
    });
    ctx.globalAlpha=1;ctx.shadowBlur=0;
    // 살아있는 파티클만 유지 — 메모리 절약
    for(let i=_particles.length-1;i>=0;i--)if(_particles[i].life<=0)_particles.splice(i,1);
    _ranTicks++;
    if(_particles.length>0||_shotsLeft>0||_ranTicks<60)requestAnimationFrame(_draw);
    else{try{cv.remove();}catch(_e){}}
  };
  requestAnimationFrame(_draw);
}
try{if(typeof window!=='undefined')window._fireFireworks=_fireFireworks;}catch(e){}
// ─── 제작 시스템 (renderCraftTab + 13개 함수) → js/modules/render-craft-tab.js 로 분할 (Phase B2, 2026-06-10) ───
//   selectCraft*, doCraft, _showCraft*, renderCraftTab, *MatSlotTip, *BpTip, *CraftSlot 모두 window 전역 노출

// ── 통합 퀘스트 카드 ─────────────────────────────────────────────
// 제독 의뢰 / 브로커 의뢰 / 주점 의뢰 모두 동일한 카드 디자인을 공유.
// 퀘스트 종류별 + 문명권(팩션) 이미지:
//   1순위: img/quests/{type}_{factionId}.png  (예: combat_F01.png)
//   2순위: img/quests/{type}.png               (팩션 무관 generic)
//   3순위: type 이모지 폴백
// 사용자 요청 2026-06-07: buy(거래보조) 타입은 buy_*.png 자산이 없어 거래상인 이미지(delivery_*.png) 사용
// ═══ 퀘스트 UI 섹션 이관 (사용자 요청 2026-06-09 v1.0.0-beta.121) ═══
// 기존 _QUEST_TYPE_IMG_ALIAS / _questTypeImg / _questTypeImgGeneric /
// _questThumbHtml / submitBuyQuest / _renderQuestCard / renderQuestTab 는
// js/modules/quest-ui.js 로 이관 → window.* 로 그대로 전역 호출 가능

// ── 잠긴 메뉴 NPC 대사 (탭/행성별 위트 대사) ──────────────────────
function _getLockedNpcDialog(tab,pid,pd){
  const npcByTab={
    quest:    {ic:'🎖️', title:I18N.t('lock.npcQuest'),     base:I18N.t('lock.npcQuestBase')},
    trade:    {ic:'🪐', title:I18N.t('lock.npcTrade'), base:I18N.t('lock.npcTradeBase')},
    tavern:   {ic:'🍺', title:I18N.t('ui.tavernKeeper'), base:I18N.t('ui.tavernBusy')},
    gacha:    {ic:'🍺', title:I18N.t('ui.tavernKeeper'), base:I18N.t('ui.tavernGacha')},
    ship:     {ic:'🚀', title:I18N.t('lock.npcShip'), base:I18N.t('lock.npcShipBase')},
    craft:    {ic:'🔧', title:I18N.t('lock.npcCraft'), base:I18N.t('lock.npcCraftBase')},
    garage:   {ic:'🔩', title:I18N.t('lock.npcGarage'),   base:I18N.t('lock.npcGarageBase')},
    planets:  {ic:'🌍', title:I18N.t('lock.npcPlanets'),   base:I18N.t('lock.npcPlanetsBase')},
    auction:  {ic:'🏛️', title:I18N.t('lock.npcAuction'),   base:I18N.t('lock.npcAuctionBase')},
    front:    {ic:'🌐', title:I18N.t('lock.npcFront'),   base:I18N.t('lock.npcFrontBase')}
  };
  const npc=npcByTab[tab]||{ic:'👤',title:I18N.t('lock.npcDefault'),base:I18N.t('lock.npcDefaultBase')};
  // 행성별 위트 (행성 ID 마지막 글자/숫자로 결정론 분기)
  const flavors={
    'F01':I18N.t('lock.declineF01'),
    'F02':I18N.t('lock.declineF02'),
    'F03':I18N.t('lock.declineF03'),
    'F04':I18N.t('plaza.declineF04'),
    'F05':I18N.t('plaza.declineF05'),
    'F06':I18N.t('plaza.declineF06'),
    'F07':I18N.t('plaza.declineF07')
  };
  const facLine=flavors[pd?.f]||npc.base;
  // 행성 이름으로 한 줄 더 위트 추가
  const planetWit=pd?.nm?I18N.t('ui.hereEspecially',{nm:pd.nm}):'';
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
    {tab:'tavern',ic:'🍺',nm:I18N.t('plaza.tavernNm'),desc:I18N.t('plaza.tavernDesc'),color:'var(--yellow)',bg:'rgba(212,175,55,.1)',bdr:'rgba(212,175,55,.3)'},
    {tab:'trade',ic:'🪐',nm:I18N.t('plaza.tradeNm'),desc:I18N.t('plaza.tradeDesc'),color:'var(--green)',bg:'rgba(0,255,140,.07)',bdr:'rgba(0,255,140,.25)'},
    {tab:'quest',ic:'🎖️',nm:I18N.t('plaza.questNm'),desc:I18N.t('plaza.questDesc'),color:'var(--gold)',bg:'rgba(212,175,55,.07)',bdr:'rgba(212,175,55,.2)'},
  ];
  body.innerHTML=`<div class="hub-scroll">
${hubBanner('plaza','🏪',I18N.t('plaza.title'),pd?.f)}
<div class="hub-t">${I18N.t('hub.planetPlazaT')} — ${pd?pd.nm:''}</div>
<div style="color:var(--dim);font-size:13px;margin-bottom:20px;text-align:center">${I18N.t('ui.visitPlanetFacility')}</div>
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
    {tab:'auction',ic:'🏛️',nm:I18N.t('ui.planetAuction'),desc:I18N.t('ui.planetAuctionDesc'),color:'var(--gold)',bg:'rgba(212,175,55,.07)',bdr:'rgba(212,175,55,.2)'},
  ];
  body.innerHTML=`<div class="hub-scroll">
${hubBanner('front','🌍',I18N.t('front.title'),pd?.f)}
<div class="hub-t">${I18N.t('hub.planetFrontT')} — ${pd?pd.nm:''}</div>
<div style="color:var(--dim);font-size:13px;margin-bottom:20px;text-align:center">${I18N.t('ui.auctionIntro')}</div>
<div style="display:grid;grid-template-columns:1fr;gap:14px;max-width:260px;margin:0 auto">
${cards.map(c=>`<button onclick="hubTab('${c.tab}')" style="background:${c.bg};border:2px solid ${c.bdr};border-radius:14px;padding:20px 10px;cursor:pointer;text-align:center;transition:all .2s;display:flex;flex-direction:column;align-items:center;gap:8px;width:100%" onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 6px 20px rgba(0,0,0,.5)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
<div style="font-size:38px">${c.ic}</div>
<div style="color:${c.color};font-size:14px;font-weight:bold">${c.nm}</div>
<div style="color:var(--dim);font-size:11px;line-height:1.5">${c.desc}</div>
</button>`).join('')}
</div></div>`;
}

// ═══ TAVERN — js/modules/tavern.js 로 분할됨 (2026-06-08, v1.0.0-beta.88) ═══
//   · 691줄 — 주점/가챠/블랙마켓/미스테리박스

// ═══ COMBAT LOG ══════════════════════════════════════════════════
function renderCombatLog(body){
  body.innerHTML=`<div class="hub-scroll">${hubBanner('clog','📋',I18N.t('hub.bannerCombatRecord'))}<div class="hub-t">${I18N.t('hub.combatLog')}</div>${_combatLogContentHTML()}</div>`;
}
// 함선 기록 내용 HTML — 허브 뷰 + 탐색도감 'clog' 탭 공용 (사용자 요청 2026-06-14)
function _combatLogContentHTML(){
  const logs=G.combatHistory||[];
  const flagship=G.fleet&&G.fleet[0];
  const flagImgSrc=flagship?shipImgSrc(flagship):null;
  const flagTierIc={소형:'🛸',중형:'🚀',대형:'🌟',전설기함:'🏮'}[flagship?.tier]||'🛸';
  return `${logs.length===0?`<div style="color:var(--dim);font-size:14px">${I18N.t('ui.noCombatRecords')}</div>`:
    `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">`+logs.slice().reverse().map(l=>{
      const pd=PLANET_DEF.find(p=>p.id===(l.planetId||l.pid))||PLANET_DEF.find(p=>p.nm===l.planet);
      const planetImgSrc=pd?`img/planets/${pd.id}.png`:'img/planets/P01.png';
      const pFaction=pd?FACTION[pd.f]:null;
      // 사용자 보고 (2026-06-06): 전투 기록에 저장된 l.planet은 기록 시점 언어로 굳어 KO/EN 혼재.
      //   PLANET_DEF에서 현재 언어로 다시 조회 가능하면 그것을 우선 사용.
      const _planetNm=pd?.nm||l.planet||I18N.t('ui.unknownPlanet');
      const _earned=typeof l.earned==='number'?l.earned:0;
      const _gameTurn=l.gameTurn!=null?l.gameTurn:'?';
      const _turn=l.turn!=null?l.turn:0;
      return `<div style="background:var(--card);border:1px solid ${l.win?'rgba(46,204,113,.3)':'rgba(255,80,80,.25)'};border-radius:12px;overflow:hidden;display:flex;flex-direction:row;min-height:160px">
        <!-- 좌측: 전투 정보 -->
        <div style="flex:1;padding:12px 14px;display:flex;flex-direction:column;gap:6px;min-width:0">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
            <span class="badge ${l.win?'bd-gn':'bd-rd'}" style="font-size:12px">${l.win?I18N.t('cb.win'):I18N.t('cb.lose')}</span>
            <span style="font-size:14px;font-weight:bold;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_planetNm}</span>
            ${pFaction?`<span style="font-size:11px;color:${pFaction.col}">${pFaction.nm}${pd?.ring?I18N.t('ui.factionRingSuffix',{ring:pd.ring}):''}</span>`:''}
          </div>
          <div style="font-size:15px;font-weight:bold;color:${l.win?'var(--green)':'var(--red)'}">${l.win?I18N.t('cb.winLong'):I18N.t('cb.loseLong')}</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <span style="font-size:13px;color:var(--gold)">₡${_earned.toLocaleString()}</span>
            <span style="font-size:12px;color:var(--dim)">${I18N.t('ui.combatTurnsLabel',{n:_turn})}</span>
            <span style="font-size:12px;color:var(--muted)">T${_gameTurn}</span>
          </div>
          ${flagImgSrc?`<div style="display:flex;align-items:center;gap:6px;margin-top:auto;padding-top:6px;border-top:1px solid rgba(255,255,255,.07)">
            <img src="${flagImgSrc}" style="width:48px;height:32px;object-fit:contain;border-radius:4px;border:1px solid var(--bdr);background:rgba(0,0,0,.4)" onerror="this.style.display='none'">
            <span style="font-size:11px;color:var(--dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${(flagship?shipDisplayNm(flagship):'')||''}</span>
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
    }).join('')+`</div>`}`;
}
try{if(typeof window!=='undefined')window._combatLogContentHTML=_combatLogContentHTML;}catch(e){}

// ═══ HERO RECRUIT ════════════════════════════════════════════════
// 8인의 핵심 영웅 등장 시 자동 영입 — 모달은 축하용이며 어떤 버튼을 눌러도 영입은 유지된다.
// (H01 이순신만 난중일기 G18 필요 — 풀 단계에서 제외하므로 여기엔 도달하지 않는다)
// 전설 영웅 첫 만남 멘트 (영입 연출용)
const HERO_GREETING={
  get H01(){return I18N.t('heroGreet.H01');},
  get H02(){return I18N.t('heroGreet.H02');},
  get H03(){return I18N.t('heroGreet.H03');},
  get H04(){return I18N.t('heroGreet.H04');},
  get H05(){return I18N.t('heroGreet.H05');},
  get H06(){return I18N.t('heroGreet.H06');},
  get H07(){return I18N.t('heroGreet.H07');},
  get H08(){return I18N.t('heroGreet.H08');}
};
function showHeroRecruit(heroId){
  // HEROES 데이터 미로드 시 안전 종료
  if(typeof HEROES==='undefined')return;
  const h=HEROES[heroId];if(!h)return;
  // ★ 시나리오 컷씬 즉시 트리거 — 어느 경로든 영입 모달 호출 시 컷씬 보장 (사용자 요청)
  if(window.STORY_SCENES_PC && typeof window.STORY_SCENES_PC.triggerHeroRecruitScene==='function'){
    try{ window.STORY_SCENES_PC.triggerHeroRecruitScene(heroId); }
    catch(e){console.warn('[STORY] showHeroRecruit trigger fail',e);}
  } else {
    console.warn('[STORY] STORY_SCENES_PC not loaded — cutscene skipped for', heroId);
  }
  // 1) 먼저 영입 확정 (notify + baekgu + saveGame 포함). 실패해도 본 함수는 정보용으로 계속 진행.
  const _already=(G.heroes||[]).includes(heroId);
  if(!_already){try{recruitHero(heroId);}catch(e){console.warn('[hero] auto-recruit',e.message);}}
  const _ok=(G.heroes||[]).includes(heroId);
  const _greet=HERO_GREETING[heroId]||'';
  // 2) 축하 모달 — 닫기 버튼 1개만, 영입 결과에 영향 없음
  //    인물 이미지 3배 확대(96→288) + 첫 만남 멘트 (사용자 요청)
  openModal(I18N.t('modal.legendHeroJoined',{ic:h.ic}),
    `<div style="text-align:center;padding:8px">
      <div style="display:flex;justify-content:center;margin-bottom:10px;filter:drop-shadow(0 0 28px gold)">${_heroPortrait({...h,id:heroId},288,'var(--gold)')}</div>
      <div style="color:var(--gold);font-size:24px;font-weight:bold;margin-bottom:4px">${(I18N&&I18N.has&&I18N.has('hero.'+heroId+'.nm'))?I18N.t('hero.'+heroId+'.nm'):h.nm}</div>
      <div style="font-size:12px;color:var(--cyan);letter-spacing:2px;margin-bottom:10px">${_ok?I18N.t('ui.recruitCompleteDesc'):I18N.t('ui.recruitFailedCond')}</div>
      ${_greet?`<div style="background:rgba(255,215,0,.06);border:1px solid rgba(255,215,0,.35);border-radius:10px;padding:12px 16px;margin-bottom:10px;font-size:16px;line-height:1.8;color:var(--yellow);font-style:italic;word-break:keep-all">"${_greet}"</div>`:''}
      <div style="background:var(--card);border-radius:8px;padding:12px;font-size:13px;line-height:2">
        ATT:${h.ATT} INT:${h.INT} DEF:${h.DEF} HP:${h.HP}<br>${I18N.t('ui.specialSign')}: <span style="color:var(--purple)">${(I18N&&I18N.has&&I18N.has('hero.'+heroId+'.sk'))?I18N.t('hero.'+heroId+'.sk'):h.sk}</span>
      </div>
    </div>`,
    [{txt:I18N.t('ui.confirm'),fn:closeModal,cls:'btn-gold'}]);
}
function boardHeroToShip(hid){
  const sel=document.getElementById('hero-ship-'+hid);
  // 함선이 1개이면 자동 선택
  if(sel&&sel.value===''&&G.fleet.length===1)sel.value='0';
  if(!sel||sel.value===''){notify(I18N.t('notify.selectBoardShip'),'warn');return;}
  const shipIdx=parseInt(sel.value);
  const s=G.fleet[shipIdx];if(!s)return;
  // 이미 다른 함선 탑승 중이면 자동 이전 (먼저 빼고 체크)
  G.fleet.forEach(sh=>{if(sh!==s&&sh.crewIds){const i=sh.crewIds.indexOf(hid);if(i>=0)sh.crewIds.splice(i,1);}});
  if((s.crewIds||[]).length>=getMaxCrew(s)){notify(I18N.t('notify.shipFullDisembarkFirst'),'err');return;}
  if(!s.crewIds)s.crewIds=[];
  const _stBefH=getShipStats(s);
  s.crewIds.push(hid);
  _syncShipCapacity(s,_stBefH);
  const _hKey='hero.'+hid+'.nm';
  const _hNm=(I18N&&I18N.has&&I18N.has(_hKey))?I18N.t(_hKey):(HEROES[hid]?.nm||'');
  notify(I18N.t('notify.heroBoarded',{nm:_hNm,ship:shipDisplayNm(s)}),'gold');
  baekgu(I18N.t('baekgu.heroBoarded',{nm:_hNm}));
  rerenderShipOrGarage();saveGame(true);
}
function unassignHero(hid){
  G.fleet.forEach(sh=>{
    if(!sh.crewIds)return;
    const idx=sh.crewIds.indexOf(hid);
    if(idx>=0){sh.crewIds.splice(idx,1);const _hKey='hero.'+hid+'.nm';const _hNm=(I18N&&I18N.has&&I18N.has(_hKey))?I18N.t(_hKey):(HEROES[hid]?.nm||'');notify(I18N.t('notify.heroDisembark',{nm:_hNm}),'ok');}
  });
  rerenderShipOrGarage();saveGame(true);
}
// 전설 영웅 8인 전원 수집 완료 — 1회성 마일스톤 보상 (사용자 요청 2026-06-15)
//   지급액은 후반 마일스톤 기준 기본값 — 밸런스 조정 시 이 상수만 변경.
function _grantAllHeroesReward(){
  try{
    if(!G||!Array.isArray(G.heroes)||G.heroes.length<8)return;
    if(G._allHeroesRewarded)return;
    G._allHeroesRewarded=true;
    const _cr=1000000,_vc=5,_ve=1000,_rep=10;
    G.credits=(G.credits||0)+_cr;
    G.voidCrystal=(G.voidCrystal||0)+_vc;
    G.voidEssence=(G.voidEssence||0)+_ve;
    if(typeof changeReputation==='function')changeReputation(_rep); else G.reputation=(G.reputation||0)+_rep;
    try{updateHUD();}catch(e){}
    try{if(typeof sfxCoin==='function')sfxCoin();}catch(e){}
    try{notify(I18N.t('notify.allHeroesReward',{cr:_cr.toLocaleString(),vc:_vc,ve:_ve,rep:_rep}),'gold');}catch(e){}
    try{baekgu(I18N.t('baekgu.allHeroesReward'));}catch(e){}
    try{saveGame(true);}catch(e){}
  }catch(e){console.warn('[allHeroesReward]',e);}
}
window._grantAllHeroesReward=_grantAllHeroesReward;

function recruitHero(heroId){if(G.heroes.includes(heroId)){closeModal();return;}
  // H01 이순신: 난중일기 영인본(G18) 인벤토리 확인
  if(heroId==='H01'){
    const has=G.inventory&&G.inventory.find(i=>i.id==='G18'&&i.qty>0);
    if(!has){
      notify(I18N.t('notify.needNanjungIlgi'),'err');
      closeModal();return;
    }
    // 소모
    const inv=G.inventory.find(i=>i.id==='G18');inv.qty--;
    notify(I18N.t('notify.nanjungSubmitted'),'ok');
  }
  G.heroes.push(heroId);closeModal();{const _hKey='hero.'+heroId+'.nm';const _hNm=(I18N&&I18N.has&&I18N.has(_hKey))?I18N.t(_hKey):(HEROES[heroId]?.nm||'');notify(I18N.t('notify.heroRecruitedIc',{ic:HEROES[heroId]?.ic,nm:_hNm}),'pur');baekgu(I18N.t('baekgu.heroJoined',{nm:_hNm}));}
  // 장영실: 모든 행성 안개 제거
  if(heroId==='H02'){applyJangYeongsilEffect();notify(I18N.t('notify.jangYeongsilEffect'),'gold');}
  try{_grantAllHeroesReward();}catch(e){}
  saveGame(true);
  // PC 전용: 영입 직후 시나리오 첫만남 컷씬 재생 (이미 본 장면은 자동 스킵)
  if(window.STORY_SCENES_PC && typeof window.STORY_SCENES_PC.triggerHeroRecruitScene==='function'){
    setTimeout(function(){ window.STORY_SCENES_PC.triggerHeroRecruitScene(heroId); }, 400);
  }
}
function applyJangYeongsilEffect(){
  if(!G.heroes.includes('H02'))return;
  PLANET_DEF.forEach(p=>{if(G.planets[p.id]&&G.planets[p.id].fog==='L')G.planets[p.id].fog='S';});
}

// ═══ STARMAP — js/modules/starmap.js 로 분할됨 (2026-06-08, v1.0.0-beta.88) ═══
//   · 38개 함수, ~2,100줄 → 자립 IIFE 모듈로 추출 (mapCtx/mapCV 등 모듈 내부 상태)
//   · window 노출: renderMapView, travelTo, mapZoom, resetMapView, showHostilePlanetBriefing 등


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
// 함선 이름에 강화 등급(+N) + 제작 품질(✨ 마스터작 등) 접두/접미 부착 — 일관 표시 헬퍼
//   · 베이스 이름은 shipDisplayNm 로 i18n 재조회 (KO/EN 혼재 방지)
function shipDisplayName(s){
  if(!s)return '';
  let nm=(typeof shipDisplayNm==='function'?shipDisplayNm(s):s.nm)||s.nm||'';
  if(s._enhanceLv&&s._enhanceLv>0)nm='+'+s._enhanceLv+' '+nm;
  if(s.qualityLabel)nm=nm+' '+s.qualityLabel;
  return nm;
}
try{if(typeof window!=='undefined')window.shipDisplayName=shipDisplayName;}catch(e){}

// ═══ 함선 역할(특성화) 시스템 — 사용자 요청 2026-06-09 ════════════════════════════
// 신화/우르사/블랙팔콘 제외, 모든 비신화 함선에 역할 부여.
//   · 방어형(defense):   maxSH ×1.40, INT ×1.25, HP ×0.95, ATT ×0.90
//   · 공격형(attack):    ATT ×1.40, TEC ×1.25, HP ×0.90, maxSH ×0.85
//   · 수송형(transport): HP ×1.30, cargo ×1.50, crewMax ×1.30, ATT ×0.85, maxSH ×0.90
//   · 만능형(versatile): 모든 능력치 ×1.10 (균형 보너스)
//   · 신화/특수 — multiplier 1.0 (원본 그대로)
const SHIP_ROLE_DEF={
  // ── 소형 (S01~S08) ──
  S01:'versatile', S02:'transport', S03:'attack',  S04:'transport',
  S05:'defense',   S06:'attack',    S07:'attack',  S08:'versatile',
  // ── 중형 (M01~M10) ──
  M01:'versatile', M02:'attack',    M03:'defense', M04:'attack',
  M05:'transport', M06:'versatile', M07:'attack',  M08:'transport',
  M09:'defense',   M10:'versatile',
  // ── 대형 (H01~H12) ──
  H01:'versatile', H02:'defense',   H03:'transport',H04:'versatile',
  H05:'attack',    H06:'defense',   H07:'versatile',H08:'attack',
  H09:'versatile', H10:'versatile', H11:'defense',  H12:'attack',
  // ── 문명권 함선 ──
  F01_S:'versatile', F01_M:'versatile', F01_L:'versatile',   // 수퍼비아(귀족·외교) — 균형
  F02_S:'transport', F02_M:'transport', F02_L:'transport',   // 아우레우스(금융·화물) — 수송
  F03_S:'attack',    F03_M:'attack',    F03_L:'attack',      // 메카니카(기계·엔진) — 공격
  F04_S:'attack',    F04_M:'attack',    F04_L:'attack',      // 크리그(전사·무력) — 공격
  F05_S:'defense',   F05_M:'defense',   F05_L:'defense',     // 티리온(평화·실드) — 방어
  F06_S:'versatile', F06_M:'versatile', F06_L:'versatile',   // 저항군 — 균형
  F07_S:'defense',   F07_M:'defense',   F07_L:'defense'      // 보이드(혼돈·차원) — 방어
};
const SHIP_ROLE_MUL={
  defense:   {HP:0.95, ATT:0.90, INT:1.25, TEC:0.95, SH:1.40, cargo:0.85, crew:1.00},
  attack:    {HP:0.90, ATT:1.40, INT:0.95, TEC:1.25, SH:0.85, cargo:0.85, crew:1.00},
  transport: {HP:1.30, ATT:0.85, INT:0.95, TEC:0.90, SH:0.90, cargo:1.50, crew:1.30},
  versatile: {HP:1.10, ATT:1.10, INT:1.10, TEC:1.10, SH:1.10, cargo:1.10, crew:1.10},
  // 신화·특수 — multiplier 없음 (원본 능력치 그대로)
  mythic:    {HP:1.00, ATT:1.00, INT:1.00, TEC:1.00, SH:1.00, cargo:1.00, crew:1.00}
};
// 함선 역할 조회 — catalogId 우선, 신화 tier 는 항상 mythic 반환
function _getShipRole(s){
  if(!s)return 'versatile';
  // 신화 tier(LGD01~03, URSA, BLACKFALCON) + 전설기함은 mythic (원본 능력치 그대로)
  if(s.tier==='신화' || s.tier==='전설기함') return 'mythic';
  // catalogId 또는 catId 또는 id prefix 로 역할 조회
  const _cid=String(s.catalogId||s.catId||(s.id||'').replace(/(?:_\d+|_main|_craft.*)$/,'')).toUpperCase();
  return SHIP_ROLE_DEF[_cid] || 'versatile';
}
function _shipRoleMul(s, statName){
  const role=_getShipRole(s);
  const m=SHIP_ROLE_MUL[role]||SHIP_ROLE_MUL.versatile;
  return m[statName]||1.0;
}
try{if(typeof window!=='undefined'){
  window._getShipRole=_getShipRole;
  window._shipRoleMul=_shipRoleMul;
  window.SHIP_ROLE_DEF=SHIP_ROLE_DEF;
  window.SHIP_ROLE_MUL=SHIP_ROLE_MUL;
}}catch(e){}

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
  // 거북선(LGD01) 보유 — 자신 외 모든 호위함 ATT/INT +30% (사용자 명세: 신화 함선 효과 실구현)
  const _selfCat=(s.catalogId||(s.id||'').replace(/(?:_\d+|_main)$/,'')).toUpperCase();
  const _hasGeobukseon=G.fleet&&G.fleet.some(sh=>{
    const cid=(sh.catalogId||(sh.id||'').replace(/(?:_\d+|_main)$/,'')).toUpperCase();
    return cid==='LGD01';
  });
  const _geobukMul=(_hasGeobukseon&&_selfCat!=='LGD01')?1.30:1.0;
  // 영웅 전역 패시브
  const _hp=getHeroPassiveBonus();
  // 함선 강화 — _enhanceLv (0~10) × 5% 모든 능력치 추가 보너스 (사용자 명세)
  const _enhMul=1+clamp(s._enhanceLv||0,0,10)*0.05;
  // 사용자 요청 2026-06-09: 함선 역할(특성화) multiplier 적용 (신화 제외)
  const _rmATT=_shipRoleMul(s,'ATT');
  const _rmINT=_shipRoleMul(s,'INT');
  const _rmTEC=_shipRoleMul(s,'TEC');
  const _rmHP =_shipRoleMul(s,'HP');
  const _rmSH =_shipRoleMul(s,'SH');
  return{
    ATT:Math.round(((+s.ATT||0)+b.att+cb.att)*hm*_hp.attMul*_geobukMul*_enhMul*_rmATT),
    INT:Math.round(((+s.INT||0)+b.int2+cb.int2)*hm*_hp.intMul*_geobukMul*_enhMul*_rmINT),
    TEC:Math.round(((+s.TEC||0)+b.tec+cb.tec)*hm*_hp.tecMul*_enhMul*_rmTEC),
    DEF:Math.round(((+s.DEF||0)+b.def+cb.def)*hm*_enhMul),
    HP:Math.round(((+s.maxHP||100)+b.hp+cb.hp)*hm*_hp.hpMul*_enhMul*_rmHP),
    maxSH:Math.round(((+s.maxSH||0)+b.sh+cb.sh)*hm*armadaMult*_hp.shMul*_enhMul*_rmSH)
  };
}
// ═══ COMBAT — js/modules/combat.js 로 분할 (C1, 2026-06-14, 긴 코드 분할) ═══
// 전투 엔진 전체(_enemyTierBoost ~ _grantBlackHoleRewardsSilent, 62개 함수)를 combat.js 로 이동.
// combatState 선언과 역할/스탯 시스템은 위쪽에 잔류. 전투 함수는 전역이라 호출부 변경 불필요.

// ※ _grantBlackHoleRewards() 죽은 함수 제거 — _grantBlackHoleRewardsSilent와 거의 동일했으나
//    어디서도 호출되지 않아 dead code였음 (실제 사용 경로는 silent 버전만)

// ── 타이틀 난이도 버튼 ─────────────────────────────────────────



// ── 개발자 숨겨진 메뉴 → js/modules/dev-menu.js 로 분할 (2026-06-12, 사용자 요청: 긴 코드 분할)

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

// 전역 버튼 클릭 효과음은 모바일 과부하로 제거됨 (사용자 요청)
// 개별 버튼이 자체로 호출하는 AudioMgr.playSfx 는 그대로 유지

// ── 게임 시작 (DOM 파싱 완료 후 즉시 실행) ─────────────────────
// 클라우드 세이브 초기화 (Firebase SDK 로드 대기 후 익명 로그인 + 동기화)
try{if(window.CloudSave)CloudSave.init();else setTimeout(()=>{if(window.CloudSave)CloudSave.init();},1000);}catch(e){}
runLoading();


