
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
  // DOM 캡 — 빠른 다발 알림으로 DOM 풍선 방지 (가장 오래된 것부터 제거)
  while(container.children.length>10)container.removeChild(container.firstChild);
  setTimeout(()=>{el.style.opacity='0';setTimeout(()=>el.remove(),400);},2800);
}
// 사용자 요청 2026-06-09: 설계도 보상 알림에 BP01/BP02 이미지 표시
// 사용: notifyBlueprint('LGD01','LGD01 거북선') → 함선 설계도 (BP01)
//       notifyBlueprint('RB10','RB10 영혼 흡수 매트릭스') → 파츠 설계도 (BP02)
// ─── 제작 시스템 (notifyBlueprint) → js/modules/render-craft-tab.js 로 분할 (Phase B2, 2026-06-10) ───
//   notifyBlueprint 함수 window 전역 노출 — game.js 내부 호출처(3403, 7772, 7793, 11745) 무변경
// ─── 캐릭터 초상 매핑 (대사 인트로/팝업 공통) ──────────────────
// 화자 이름 → 이미지 경로. 새 인물 추가 시 img/chars/<file>.png 넣고 여기에 한 줄 추가.
const CHAR_PORTRAITS={
  // 백구 (AI)
  '백구':'img/chars/baekgu1.png',
  // 시스템 메시지 — 로봇 안내 이미지 (파일을 img/chars/system.png 로 넣으면 자동 적용,
  //   없으면 ⚡ 이모지로 자동 폴백)
  '시스템':'img/chars/system.png',
  // 보스급
  '우르사 메이저':'img/chars/ursa.png',
  '블랙팔콘':'img/chars/void_hiden.png',
  '팔콘 스카우트':'img/chars/void_hiden.png',
  '⚠️ 통신 수신 ⚠️':'img/chars/void_hiden.png',
  '⚠️ Signal Received ⚠️':'img/chars/void_hiden.png',
  [I18N.t('ui.signalReceived')]:'img/chars/void_hiden.png',
  '???':'img/chars/void_hiden.png',
  // 보스 영문 alias (EN 모드에서 화자명이 영문일 때 매칭)
  'Ursa Major':'img/chars/ursa.png',
  'Black Falcon':'img/chars/void_hiden.png',
  'Falcon Scout':'img/chars/void_hiden.png',
  '🌑 Black Falcon':'img/chars/void_hiden.png',
  // 백구/시스템 영문 alias
  'Baekgu':'img/chars/baekgu1.png',
  'System':'img/chars/system.png',
  // 영웅 8인 — hero01~08.png 번호 구조 (HEROES H01~H08 순서와 1:1)
  // 짧은 이름·풀네임 둘 다 키로 등록해 대사 화자 변형 모두 커버
  // H01 이순신 / Yi Sun-sin
  '이순신':'img/chars/hero01.png',
  'Yi Sun-sin':'img/chars/hero01.png',
  // H02 장영실 / Jang Yeong-sil
  '장영실':'img/chars/hero02.png',
  'Jang Yeong-sil':'img/chars/hero02.png',
  // H03 광개토대왕 / Gwanggaeto the Great
  '광개토대왕':'img/chars/hero03.png',
  'Gwanggaeto the Great':'img/chars/hero03.png',
  'Gwanggaeto':'img/chars/hero03.png',
  // H04 유리 가가린 / Yuri Gagarin
  '가가린':'img/chars/hero04.png',
  '유리 가가린':'img/chars/hero04.png',
  'Yuri Gagarin':'img/chars/hero04.png',
  'Gagarin':'img/chars/hero04.png',
  // H05 호레이쇼 넬슨 / Horatio Nelson
  '넬슨':'img/chars/hero05.png',
  '호레이쇼 넬슨':'img/chars/hero05.png',
  'Horatio Nelson':'img/chars/hero05.png',
  'Nelson':'img/chars/hero05.png',
  // H06 아인슈타인 / A. Einstein
  '아인슈타인':'img/chars/hero06.png',
  'A. 아인슈타인':'img/chars/hero06.png',
  'A. Einstein':'img/chars/hero06.png',
  'Einstein':'img/chars/hero06.png',
  'Albert Einstein':'img/chars/hero06.png',
  // H07 니콜라 테슬라 / Nikola Tesla
  '테슬라':'img/chars/hero07.png',
  '니콜라 테슬라':'img/chars/hero07.png',
  'Nikola Tesla':'img/chars/hero07.png',
  'Tesla':'img/chars/hero07.png',
  // H08 마르코 폴로 / Marco Polo
  '마르코':'img/chars/hero08.png',
  '마르코 폴로':'img/chars/hero08.png',
  'Marco Polo':'img/chars/hero08.png',
  'Marco':'img/chars/hero08.png',
  // 추가 시나리오 인물 (2026-06-13 신규 초상) — 파일은 img/chars/ 에 배치
  '이휘소':'img/chars/hero09.png','이휘소 박사':'img/chars/hero09.png','Dr. Lee Hwi-so':'img/chars/hero09.png','Lee Hwi-so':'img/chars/hero09.png',
  '아이젠클로':'img/chars/eisenklau.png','Eisenklau':'img/chars/eisenklau.png','Eisenklaue':'img/chars/eisenklau.png',
  '레인저 맥시모프':'img/chars/maximov.png','맥시모프':'img/chars/maximov.png','Ranger Maximov':'img/chars/maximov.png','Maximov':'img/chars/maximov.png'
};
// ── 영웅 ID(H01~H08) → 초상 경로 ────────────────────────────────────
// CHAR_PORTRAITS는 한국어 이름 키 → EN 모드에선 h.nm가 영문이라 매칭 실패.
// ID 기반 매핑을 우선 조회해 언어와 무관하게 영웅 초상이 표시되도록 한다.
const HERO_PORTRAITS_BY_ID={
  H01:'img/chars/hero01.png',
  H02:'img/chars/hero02.png',
  H03:'img/chars/hero03.png',
  H04:'img/chars/hero04.png',
  H05:'img/chars/hero05.png',
  H06:'img/chars/hero06.png',
  H07:'img/chars/hero07.png',
  H08:'img/chars/hero08.png'
};
// ─── 백구 무드 → 이미지 매핑 (시리즈 2 다양한 표정 활용) ───
// 파일명 기반 자동 배정:
//   default     baekgu1.png              (소형 정면 — 평소)
//   explore     baekgu2.png              (탐험/도착 — 시리즈2 기본)
//   combat      baekgu2_fight.png        (전투 자세)
//   boss        baekgu3.png              (보스급 — 무기 휴대)
//   smile       baekgu2_smile1.png       (미소 — 일반 칭찬/보상)
//   smile_big   baekgu2_smile2.png       (큰 미소 — 레벨업/명성 상승)
//   smile_proud baekgu2_smile4.png       (자랑 — 보스 격파/엔딩 진입)
//   surprise    baekgu1_surprise.png     (놀람 — 전설/신화/이벤트 발견)
//   think       baekgu2_think.png        (생각/궁리)
//   advice      baekgu2_advice.png       (조언/팁/제안)
//   anger_mild  baekgu2_anger0.png       (가벼운 짜증)
//   anger       baekgu2_anger1.png       (화남 — 실패/손해)
//   anger_max   baekgu2_anger2.png       (극대노 — 배신/이탈/완패)
//   sad         baekgu2_sad.png          (슬픔 — 패배/소실)
//   sad_happy   baekgu2_sad_happy.png    (희비교차 — 비싼 대가 + 좋은 결과)
//   sleepy      baekgu2_sleepy.png       (졸림 — 같은 자리 오래)
//   hungry      baekgu2_hungry.png       (배고픔 — 자원·크레딧 부족)
//   bothersome  baekgu2_bothersome.png   (귀찮음 — 반복 작업)
//   ignorant    baekgu2_ignorant_person.png (어이없음 — 잘못된 시도)
function _baekguSrcByMood(mood){
  const M={
    combat:'img/chars/baekgu2_fight.png',
    boss:'img/chars/baekgu3.png',
    explore:'img/chars/baekgu2.png',
    smile:'img/chars/baekgu2_smile1.png',
    smile_big:'img/chars/baekgu2_smile2.png',
    smile_proud:'img/chars/baekgu2_smile4.png',
    surprise:'img/chars/baekgu1_surprise.png',
    think:'img/chars/baekgu2_think.png',
    advice:'img/chars/baekgu2_advice.png',
    anger_mild:'img/chars/baekgu2_anger0.png',
    anger:'img/chars/baekgu2_anger1.png',
    anger_max:'img/chars/baekgu2_anger2.png',
    sad:'img/chars/baekgu2_sad.png',
    sad_happy:'img/chars/baekgu2_sad_happy.png',
    sleepy:'img/chars/baekgu2_sleepy.png',
    hungry:'img/chars/baekgu2_hungry.png',
    bothersome:'img/chars/baekgu2_bothersome.png',
    ignorant:'img/chars/baekgu2_ignorant_person.png'
  };
  return M[mood]||'img/chars/baekgu1.png';
}
// 전체 백구 무드 이미지 + 영웅·보스 초상을 페이지 로드 시 프리로드 — 스왑 깜빡임/이전 잔상 방지
(function _preloadCharsAll(){
  if(typeof window==='undefined')return;
  const _arr=[
    // 백구 19종
    'baekgu1.png','baekgu1_surprise.png','baekgu2.png','baekgu2_fight.png',
    'baekgu2_smile1.png','baekgu2_smile2.png','baekgu2_smile4.png','baekgu2_think.png',
    'baekgu2_advice.png','baekgu2_anger0.png','baekgu2_anger1.png','baekgu2_anger2.png',
    'baekgu2_sad.png','baekgu2_sad_happy.png','baekgu2_sleepy.png','baekgu2_hungry.png',
    'baekgu2_bothersome.png','baekgu2_ignorant_person.png','baekgu3.png',
    // 영웅 8인 (hero01~08)
    'hero01.png','hero02.png','hero03.png','hero04.png',
    'hero05.png','hero06.png','hero07.png','hero08.png',
    // 보스급
    'ursa.png','void_hiden.png'
  ];
  // 단계별 프리로드 — 한꺼번에 29개 요청 시 일부 환경에서 ERR_INSUFFICIENT_RESOURCES 유발 가능
  // 5개씩 100ms 간격으로 분산 (총 ~600ms, 사용자 체감 영향 없음)
  const _doPreload=()=>{
    const _batch=5;
    for(let i=0;i<_arr.length;i+=_batch){
      const _slice=_arr.slice(i,i+_batch);
      setTimeout(()=>_slice.forEach(f=>{const img=new Image();img.src='img/chars/'+f;}), Math.floor(i/_batch)*100);
    }
  };
  if(document.readyState==='complete'||document.readyState==='interactive')_doPreload();
  else window.addEventListener('DOMContentLoaded',_doPreload,{once:true});
})();
// 텍스트 키워드로 무드 자동 감지 — 우선순위 위에서 아래 (첫 매칭 채택)
// 명확한 결과(성공/실패/배신)를 active engagement(전투)보다 먼저 보고 매칭
function _detectBaekguMood(text){
  const t=String(text||'');
  // 1) boss — 최종전·엔딩급
  if(/(우르사 메이저|블랙팔콘|보이드 보스|최종전|지구 해방|엔딩)/.test(t))return 'boss';
  // 2) smile_proud — 격파·해방·정복 (전투 종료 후 성공) — combat보다 먼저
  if(/(격파|섬멸|해방|승리했|클리어|정복|평정|🏆|🥇|👑)/.test(t))return 'smile_proud';
  // 3) anger_max — 배신·이탈·완패
  if(/(배신|이탈했|넘어갔|적에게 넘|반란|쿠데타|망했|털렸|뺏겼|완패|치명)/.test(t))return 'anger_max';
  // 4) surprise — 희귀/대박 발견 (smile류보다 먼저 — "전설 들어왔다" 등)
  if(/(전설|신화|희귀|레어|초대박|대박|세상에|믿을 수 없|놀라|이럴 수|와우|헐|!!|✨|🎉|🌟|🎁)/.test(t))return 'surprise';
  // 5) anger — 실패·손해·놓침 (전투 결과로 매칭되도록 combat보다 먼저)
  if(/(실패|패배|손해|손실|놓쳤|놓치|파괴됐|당했|이런|젠장|쯧|❌|🚫)/.test(t))return 'anger';
  // 6) sad_happy — 희비교차 (먼저 매칭)
  if(/(아쉽지만|그래도|간신히|겨우|따돌렸|빠져나왔|살아남았)/.test(t))return 'sad_happy';
  // 7) sad — 슬픔/소실
  if(/(슬프|아쉬|안타|사라졌|소멸했|잃었|작별|이별|😢|💔)/.test(t))return 'sad';
  // 8) combat — 활성 전투 (단어 "전투력"은 제외 위해 \b 또는 negative lookahead)
  if(/(전투(?!력)|해적|적함|기습|공격해|치크스 함|싸우|격돌|⚔️|🏴|💥|☠️|💀)/.test(t))return 'combat';
  // 9) smile_big — 레벨업·명성 상승·제작 완료
  if(/(레벨업|랭크업|명성 상승|명성이 올|진급|승급|제작 완|업그레이드 완|만렙|⭐)/.test(t))return 'smile_big';
  // 10) smile — 일반 보상·획득·완료
  if(/(완료|성공|획득|들어왔|보상|축하|좋아|잘했|굿|나이스|충전됐|👍|💰)/.test(t))return 'smile';
  // 11) hungry — 크레딧·자원 부족
  if(/(크레딧 거의 없|크레딧 부족|돈이 없|자금 부족|연료 부족|보급 부족|배고프)/.test(t))return 'hungry';
  // 12) sleepy — 같은 자리/대기/오래
  if(/(같은 자리|오래 있|체류|대기|머무르|장기|쉬어)/.test(t))return 'sleepy';
  // 13) ignorant — 어이없음 (의도 다름)
  if(/(응\?|뭔가 물어|뭐라고|이해 못|모르겠|\?\?\?|🤷)/.test(t))return 'ignorant';
  // 14) bothersome — 반복/잔소리
  if(/(또|다시|반복|매번|잔소리|아까도|벌써|이미)/.test(t))return 'bothersome';
  // 15) advice — 조언·추천·제안
  if(/(추천|조언|제안|팁|힌트|방법은|이렇게 해|해보면|💡|📋)/.test(t))return 'advice';
  // 16) think — 생각/주의/확인 (전투력/배치 등은 think로)
  if(/(생각|준비|주의|조심|살펴|확인|체크|키워|장착|배치|전투력|🤔)/.test(t))return 'think';
  // 17) explore — 탐험/이동/도착
  if(/(탐험|도착|발견|이동|항해|새로운|진입|착륙|개척|항로|🌍|🛸|🚀|🔭|🌌|🪐)/.test(t))return 'explore';
  return 'default';
}
// 인라인 백구 아이콘 — 이모지 자리에 작은 이미지 노출. 로드 실패 시 🐕 폴백.
function _baekguIcon(size,mood){
  size=size||20;
  let src=_baekguSrcByMood(mood);
  if(src&&typeof window!=='undefined'&&window._GAME_VER&&src.indexOf('?v=')<0)src=src+'?v='+encodeURIComponent(window._GAME_VER);
  return `<img src="${src}" alt="${I18N.t('alt.baekgu')}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;vertical-align:middle;background:rgba(0,0,0,.3)" onerror="this.outerHTML='<span style=&quot;font-size:${Math.round(size*0.9)}px;line-height:1&quot;>🐕</span>'">`;
}
// 화자용 초상 HTML 반환 (이미지가 매핑되어 있으면 <img>, 아니면 폴백 이모지)
// 영웅용 원형 초상화 (도감/축하 모달 등) — CHAR_PORTRAITS에 매핑된 이미지 우선,
// 로드 실패 시 이모지 아이콘으로 폴백. 두 경우 모두 동일한 원형 프레임을 유지.
function _heroPortrait(h, size, borderColor){
  size=size||72;
  borderColor=borderColor||'var(--gold)';
  const _ic=h&&h.ic||'⚑';
  // 1순위: ID 기반 매핑 — 언어 무관. h.id가 비어있으면 HEROES 사전에서 객체 동일성으로 ID 역추적
  // (HEROES[hid]를 직접 받은 경우 id 필드가 없음 — 객체 참조 일치로 ID 복원)
  let _hid=h&&h.id;
  if(!_hid&&h&&typeof HEROES!=='undefined'){
    try{for(const k in HEROES){if(HEROES[k]===h){_hid=k;break;}}}catch(e){}
  }
  // 2순위: 한국어 이름 기반 (CHAR_PORTRAITS). EN 모드에서는 매칭 실패할 수 있어 ID 우선.
  let src=h&&((_hid&&HERO_PORTRAITS_BY_ID[_hid])||CHAR_PORTRAITS[h.nm]);
  // 캐시 버스터: _GAME_VER 변경 시 강제 갱신 (Firebase/CDN 24h 캐시 우회)
  if(src&&typeof window!=='undefined'&&window._GAME_VER)src=src+'?v='+encodeURIComponent(window._GAME_VER);
  const _frame=`width:${size}px;height:${size}px;border-radius:50%;background:rgba(0,0,0,.4);border:2px solid ${borderColor};flex-shrink:0;box-shadow:0 0 12px ${borderColor}66`;
  if(src){
    return `<img src="${src}" alt="${(h&&h.nm)||''}" style="${_frame};object-fit:cover" onerror="this.outerHTML='<div style=\\'${_frame};display:flex;align-items:center;justify-content:center;font-size:${Math.round(size*0.58)}px\\'>${_ic}</div>'">`;
  }
  return `<div style="${_frame};display:flex;align-items:center;justify-content:center;font-size:${Math.round(size*0.58)}px">${_ic}</div>`;
}
function charPortraitHTML(speaker, fallbackEmoji, size, borderColor){
  size=size||54;
  borderColor=borderColor||'var(--cyan)';
  // HEROES 순회 — speaker가 영웅 이름(KO/EN 어느 쪽이든)과 매칭되면 ic + ID 캡처
  let _matchedHeroId=null;
  if(!fallbackEmoji||fallbackEmoji==='⚑'){
    try{
      if(typeof HEROES!=='undefined'){
        for(const hid in HEROES){
          const h=HEROES[hid];
          if(h&&(h.nm===speaker||speaker.includes(h.nm))){
            fallbackEmoji=h.ic||fallbackEmoji;
            _matchedHeroId=hid;
            break;
          }
        }
      }
    }catch(e){}
  } else if(typeof HEROES!=='undefined'){
    // fallbackEmoji가 이미 있어도 매칭된 영웅 ID는 이미지 조회를 위해 캡처
    try{
      for(const hid in HEROES){
        const h=HEROES[hid];
        if(h&&(h.nm===speaker||speaker.includes(h.nm))){_matchedHeroId=hid;break;}
      }
    }catch(e){}
  }
  fallbackEmoji=fallbackEmoji||'⚑';
  // 사령관(주인공) 화자 감지 — 성별·진행단계 자동 분기 이미지 사용 (사용자 명세)
  const _cmdName=(G&&G.profile&&G.profile.name)||I18N.t('ui.commander');
  let src=null;
  if(speaker===_cmdName||speaker===I18N.t('ui.commander')||speaker==='주인공'||speaker==='Hero'||speaker==='Protagonist'||(speaker&&_cmdName&&speaker.includes(_cmdName))){
    try{src=_commanderPortraitSrc();}catch(e){}
  }
  // 1순위: 영웅 ID 기반 매핑 (언어 무관) → EN 모드에서도 영웅 초상 정상 표시
  if(!src&&_matchedHeroId)src=HERO_PORTRAITS_BY_ID[_matchedHeroId];
  if(!src)src=CHAR_PORTRAITS[speaker];
  // 캐시 버스터: _GAME_VER 변경 시 강제 갱신
  if(src&&typeof window!=='undefined'&&window._GAME_VER&&src.indexOf('?v=')<0)src=src+'?v='+encodeURIComponent(window._GAME_VER);
  // 원형 폴백 프레임 — 이미지 로드 실패 시도 동일한 크기·테두리 유지해 레이아웃 흔들림 없음
  const _frame=`width:${size}px;height:${size}px;border-radius:50%;background:rgba(0,0,0,.4);border:2px solid ${borderColor};flex-shrink:0;box-shadow:0 0 12px ${borderColor}66;display:flex;align-items:center;justify-content:center;font-size:${Math.round(size*0.58)}px`;
  if(src){
    return `<img src="${src}" alt="${speaker}" style="${_frame};object-fit:cover" onerror="this.outerHTML='<div style=\\'${_frame}\\'>${fallbackEmoji}</div>'">`;
  }
  return `<div style="${_frame}">${fallbackEmoji}</div>`;
}
function baekgu(text,mood){
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
  // 무드별 백구 초상화 자동 교체 (텍스트 키워드 자동 감지)
  // ★ 전술 초상 락이 활성화된 동안에는 mood swap 건너뜀 — 화자 얼굴이 그대로 노출되도록
  if(window._tacticPortraitUntil&&Date.now()<window._tacticPortraitUntil)return;
  try{
    const m=mood||_detectBaekguMood(text);
    const img=document.getElementById('bk-portrait-img');
    if(img){
      const newSrc=_baekguSrcByMood(m);
      // 새 src 적용 직전에 이전 onerror로 숨겨졌을 수 있는 img·emoji 상태를 복구
      // (한 번이라도 로드 실패하면 display:none이 박혀서 새 이미지도 안 보이는 버그 방지)
      img.style.display='block';
      const _em=document.getElementById('bk-emoji');if(_em)_em.style.display='none';
      // 현재 src와 다를 때만 교체 (불필요한 깜빡임 방지)
      const _tail=newSrc.replace(/^.*\//,'').split('?')[0];
      const _cur=(img.getAttribute('src')||'').replace(/^.*\//,'').split('?')[0];
      if(_cur!==_tail)img.src=newSrc;
    }
  }catch(e){}
}
// ── 전술 발동 시 백구 초상 자리에 화자(영웅/주인공) 이미지 표시 ──
// 락 동안 baekgu()의 mood swap이 건너뛰어 화자 얼굴이 유지됨. duration 후 자연스럽게 백구로 복귀.
function _showTacticPortrait(src,durationMs){
  durationMs=durationMs||6000;
  const img=document.getElementById('bk-portrait-img');
  if(!img)return;
  // 안전: emoji 숨김 + img 표시 보장
  img.style.display='block';
  const _em=document.getElementById('bk-emoji');if(_em)_em.style.display='none';
  // commander_{m|f}{0..3}.png 8장 모두 존재 — 최후 폴백만 baekgu1
  const _origOnError=img.onerror;
  let _fallbackDone=false;
  img.onerror=function(){
    if(_fallbackDone)return;_fallbackDone=true;
    img.style.display='block';
    const _em2=document.getElementById('bk-emoji');if(_em2)_em2.style.display='none';
    img.src='img/chars/baekgu1.png';
  };
  img.src=src;
  window._tacticPortraitUntil=Date.now()+durationMs;
  // 만료 후 default baekgu로 복귀 + onerror 핸들러 원복
  setTimeout(()=>{
    if(window._tacticPortraitUntil&&Date.now()>=window._tacticPortraitUntil){
      window._tacticPortraitUntil=null;
      const _img2=document.getElementById('bk-portrait-img');
      if(_img2){
        _img2.onerror=_origOnError;  // 원래 핸들러 복원 (index.html의 emoji 폴백)
        _img2.src='img/chars/baekgu1.png';
      }
    }
  },durationMs+50);
}
// 주인공(사령관) 초상화 — 성별 + 진행 단계 0~3 (명성 + 전투력 + 진행도 종합)
//   stage 3 (대제독 ★): ACT4 / 지구해방 / 영웅 8 / 명성 400+
//   stage 2 (제독): ACT3 / 영웅 5+ / 명성 150+ / 전투력 300+
//   stage 1 (함장): ACT2 / 함대 3+ / 영웅 1+ / 명성 30+ / 전투력 100+
//   stage 0 (일반인): 그 외 (게임 시작 직후)
function _commanderStage(){
  if(!G)return 0;
  const _act=G.act||1;
  const _heroes=(G.heroes||[]).length;
  const _fleet=(G.fleet||[]).length;
  const _rep=G.reputation||0;
  const _plv=(typeof calcPlayerLevel==='function')?calcPlayerLevel():1;
  if(_act>=4||G._earthLiberated||_heroes>=8||_rep>=400)return 3;
  if(_act>=3||_heroes>=5||_rep>=150||_plv>=300)return 2;
  if(_act>=2||_fleet>=3||_heroes>=1||_rep>=30||_plv>=100)return 1;
  return 0;
}
function _commanderPortraitSrc(){
  const g=(G&&G.profile&&G.profile.gender)||'male';
  const sfx=g==='female'?'f':'m';
  const st=_commanderStage();
  const _v=(typeof window!=='undefined'&&window._GAME_VER)?('?v='+window._GAME_VER):'';
  const _src='img/chars/commander_'+sfx+st+'.png'+_v;
  return (typeof window!=='undefined'&&window._mobileLod)?window._mobileLod(_src):_src;
}
try{if(typeof window!=='undefined'){window._commanderPortraitSrc=_commanderPortraitSrc;window._commanderStage=_commanderStage;}}catch(e){}

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
function askBaekgu(){
  const inp=document.getElementById('bk-ask-input');
  if(!inp)return;
  const q=(inp.value||'').trim();
  if(!q){baekgu(I18N.t('baekgu.askMore'));inp.focus();return;}
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
    {k:['크레딧','돈','자금','수입','벌','earn','credit','credits','money','income','gold'],r:()=>I18N.t('chatbot.creditsTip')},
    // 무역
    {k:['무역','특산물','상품','거래','trade','specialty','goods','merchant','commerce'],r:()=>I18N.t('chatbot.tradeTip')},
    // 함선
    {k:['함선','배','ship','거래소','중형','대형','전설기함','ships','exchange','fleet','large','medium','flagship'],r:()=>I18N.t('chatbot.shipShopTip')},
    // 파츠/장착
    {k:['파츠','part','무기','실드','장갑','엔진','장착','업그레이드','parts','weapon','shield','armor','engine','equip','upgrade'],r:()=>I18N.t('chatbot.partsTip')},
    // 크루/동료
    {k:['크루','동료','영입','가챠','뽑기','crew','companion','recruit','gacha','tavern','roll'],r:()=>I18N.t('chatbot.crewTip',{n:getMaxCrewCount()})},
    // 영웅
    {k:['영웅','hero','특수','스킬','능력','heroes','skill','ability','legend','legendary','영입처','영웅위치','where hero','hero location'],r:()=>{
      const hc=(G.heroes||[]).length;
      let msg=I18N.t('chatbot.heroTip',{hc});
      try{
        const _unrec=(PLANET_DEF||[]).filter(p=>p.hero&&!(G.heroes||[]).includes(p.hero));
        if(_unrec.length){
          const _list=_unrec.map(p=>I18N.t('chatbot.heroLocItem',{hero:I18N.t('hero.'+p.hero+'.nm'),planet:p.nm,ring:p.ring})).join('\n');
          msg += '\n'+I18N.t('chatbot.heroLocHeader',{n:_unrec.length})+'\n'+_list;
        } else {
          msg += '\n'+I18N.t('chatbot.heroLocAllDone');
        }
      }catch(e){}
      return msg;
    }},
    // 행성 허브 잠금
    {k:['잠금','허브','개방','시설','unlock','hub','open','facility','lock','locked'],r:()=>{const pid=G.currentPlanet,prog=getPlanetHubProgress(pid),thr=getPlanetHubThreshold(pid);const unlocked=isPlanetHubUnlocked(pid);const pd=PLANET_DEF.find(p=>p.id===pid);const isSup=pd?.f==='F01';return I18N.t('chatbot.hubProgress',{prog,thr,done:unlocked?I18N.t('chatbot.hubDone'):'',scale:isSup?I18N.t('chatbot.hubScaleSup'):I18N.t('chatbot.hubScaleStd')});}},
    // 행성/탐험
    {k:['행성','탐험','지도','경로','항로','fog','안개','어둠','planet','planets','explore','exploration','map','route','path'],r:()=>I18N.t('chatbot.travelTip')},
    // 퀘스트
    {k:['퀘스트','임무','quest','수락','보상','quests','mission','missions','accept','reward','rewards'],r:()=>I18N.t('chatbot.questTip')},
    // 설계도/제작
    {k:['설계도','제작','craft','만들기','전설 아이템','신화 아이템','제작소','blueprint','make','factory','crafting','mythic item','legend item'],r:()=>I18N.t('chatbot.bpTip')},
    // 보이드
    {k:['보이드','void','에센스','균열','7링','essence','rift','ring 7','ring7'],r:()=>I18N.t('ui.voidEssenceTip')},
    // 치크스/전투
    {k:['치크스','chix','적','전투','combat','싸움','chiks','enemy','enemies','fight','battle'],r:()=>I18N.t('ui.cheeksRuleTip')},
    // 보스/최종전
    {k:['보스','boss','우르사','최종','지구','해방','ursa','final','earth','liberation','liberate'],r:()=>{const hc=(G.heroes||[]).length,fc=G.fleet.length,cr=G.credits;return I18N.t('chatbot.finalCondition',{hc,fc,cr:cr.toLocaleString()});}},
    // 경매/행성 구매
    {k:['경매','행성 구매','부동산','auction','소유','세금','real estate','own','tax','buy planet'],r:()=>{const rep=G.reputation||0,max=1+Math.floor(rep/10);return I18N.t('chatbot.planetAuctionTip',{max,rep});}},
    // 저장/불러오기
    {k:['저장','세이브','save','불러오기','load','슬롯','saving','loading','slot','slots'],r:()=>I18N.t('chatbot.saveTip')},
    // 블링크 엔진
    {k:['블링크','blink','순간이동','워프','warp','teleport','jump'],r:()=>I18N.t('ui.blinkEngineTip')},
    // 명성/평판
    {k:['명성','평판','reputation','랭크','레벨','fame','rank','level'],r:()=>{const lv=calcPlayerLevel(),rep=G.reputation||0;return I18N.t('chatbot.repTip',{lv,rep});}},
    // 해적
    {k:['해적','pirate','약탈','항로','조우','pirates','raid','plunder','encounter'],r:()=>I18N.t('chatbot.pirateTip')},
    // 나포
    {k:['나포','포획','capture','적 함선','captured','enemy ship','seize'],r:()=>I18N.t('ui.captureRuleTip')},
    // 힌트/도움
    {k:['힌트','help','도움','뭐','어떻게','모르겠','어디','hint','what','how','where','dont know',"don't know",'guide','tip'],r:()=>getBaekguStoryHint()},
  ];
  const pd=PLANET_DEF.find(p=>p.id===G.currentPlanet);
  // 현재 행성 관련 질문 (KO/EN)
  if(Q.includes('여기')||Q.includes('이 행성')||Q.includes('현재')||Q.includes('지금')||Q.includes('here')||Q.includes('this planet')||Q.includes('current')||Q.includes('now')){
    const fac=pd?FACTION[pd.f]:null;
    setTimeout(()=>baekgu(I18N.t('baekgu.locationInfo',{nm:pd?.nm||'?',fac:fac?.nm||'?',ring:pd?.ring||'?'})),300);
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
      I18N.t('chatbot.unknownAsk',{q}),
      I18N.t('chatbot.fallbackVague',{q}),
      I18N.t('chatbot.unclearAsk')
    ];
    setTimeout(()=>baekgu(fallbacks[Math.floor(Math.random()*fallbacks.length)]),300);
  }
}
function randomBaekgu(key){
  const m={
    travel:[I18N.t('baekgu.travel1'),I18N.t('baekgu.travel2')],
    combat_win:[I18N.t('baekgu.cwin1'),I18N.t('baekgu.cwin2')],
    combat_lose:[I18N.t('baekgu.close1'),I18N.t('baekgu.close2')],
    gacha_hero:[I18N.t('baekgu.gachaHero1')],
    gacha_legend:[I18N.t('baekgu.gachaLegend1')],
    low_credits:[I18N.t('baekgu.lowCred1')]
  };
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
    return I18N.t('hint.warpEngineNeeded',{lacking});
  }
  // ACT 1 힌트 (조건: 20턴 안에 ACT 2 진입)
  if(G.act===1){
    if(heroCount===0)return I18N.t('hint.act1.firstHero');
    if(fleetSize<3)return I18N.t('hint.act1.fleet3');
    if(G.credits<50000)return I18N.t('hint.act1.credits50k');
    if(ownedCount===0)return I18N.t('hint.act1.ownPlanet1');
    return I18N.t('hint.act1.goal',{turn:G.turn,plv});
  }
  // ACT 2 힌트 (조건: 40턴 안에 ACT 3 진입)
  if(G.act===2){
    if(heroCount<4)return I18N.t('hint.act2.hero4',{heroCount});
    if(chix===0)return I18N.t('hint.act2.chixFirst');
    if(ownedCount<3)return I18N.t('hint.act2.own3',{ownedCount});
    if(rep<100)return I18N.t('hint.act2.rep100',{rep});
    if(chix>=5)return I18N.t('hint.act2.chix5',{turnsLeft:40-G.turn,chix});
    return I18N.t('hint.act2.goal',{turn:G.turn});
  }
  // ACT 3 힌트 (조건: 60턴 자동 ACT 4 또는 우르사 메이저 격파)
  if(G.act===3){
    const cheeksCleared=(G.combatHistory||[]).filter(c=>{const _pl=(c.planet||'').toLowerCase();return c.win&&(_pl.includes('치크스')||_pl.includes('chiks')||_pl.includes('toi')||_pl.includes('케플러-452')||_pl.includes('kepler-452')||_pl.includes('우르사-알파')||_pl.includes('ursa-alpha')||_pl.includes('오미크론')||_pl.includes('omicron')||_pl.includes('타이탄-x')||_pl.includes('titan-x'));}).length;
    if(heroCount<8){const m=8-heroCount;return I18N.t('hint.act3.heroN8',{heroCount,remaining:m});}
    if(cheeksCleared===0)return I18N.t('hint.act3.cheeksFirst');
    if(cheeksCleared<5)return I18N.t('hint.act3.cheeksProg',{cleared:cheeksCleared,remaining:5-cheeksCleared});
    if(fleetSize<6)return I18N.t('hint.act3.fleet6',{fleetSize});
    if(G.credits<500000)return I18N.t('hint.act3.credits500k',{credits:G.credits.toLocaleString()});
    if(!G.voidCrystal||G.voidCrystal<1)return I18N.t('hint.act3.voidCrystal');
    return I18N.t('hint.act3.ready');
  }
  // ACT 4 힌트 (엔드게임)
  if(G.act>=4){
    if(ownedCount<20)return I18N.t('hint.act4.planet20',{ownedCount,rep,needed:Math.max(0,30-rep%10)});
    const _ursaCap=G.fleet.some(s=>s.id&&s.id.startsWith('BOSS_URSA'))||G.reserveFleet?.some(s=>s.id&&s.id.startsWith('BOSS_URSA'));
    if(!_ursaCap)return I18N.t('hint.act4.ursaShip');
    if(heroCount<8)return I18N.t('hint.act4.hero8',{heroCount});
    return I18N.t('hint.act4.endgame');
  }
  return I18N.t('hint.default');
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
function showHub(){
  show('s-hub');
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
const ALL_TABS=['main','map','plaza','front','tavern','gacha','auction','clog','ship','crew','planets','trade','quest','combat','result'];
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
    const _frontTabs=['front','plaza','planets','auction'];
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
          return `<span onclick="hubTab('quest')" style="color:#ffd700;font-size:13px;white-space:nowrap;background:rgba(255,215,0,.12);border:1px solid #ffd70066;border-radius:5px;padding:1px 8px;cursor:pointer;font-weight:bold" title="제독·백구 퀘스트 ${_story}개 (수락 가능 ${_avail}개) — 클릭하여 이동">📜 시나리오 ${_story}${_avail>0?' · 🆕 '+_avail:''}${_baekgu>0?' · 🐕 '+_baekgu:''}</span>`;
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
            const _label='💬 대화기록 '+(idx+1);
            const _onclick=_unlocked
              ? `onclick="(window.STORY_SCENES_PC&&window.STORY_SCENES_PC.forceReplayScene)?window.STORY_SCENES_PC.forceReplayScene('${sid}'):notify('STORY_SCENES_PC 미로드','err')"`
              : '';
            const _title=!_unlocked
              ? '이전 대화기록을 먼저 시청해야 활성화됩니다'
              : (_seenScene ? '대화기록 '+sid+' (시청 완료)' : '대화기록 '+sid+' — 클릭하여 재생');
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
    <!-- 행성 이름 + 배지 (우측 하단) -->
    <div style="position:absolute;bottom:18px;right:20px;text-align:right;z-index:20;pointer-events:none">
      <div style="color:${fc};font-size:15px;font-family:'Malgun Gothic','맑은 고딕','Courier New',monospace;letter-spacing:2px;text-shadow:0 0 12px ${fc};opacity:.9">◈ ${pnm} ◈</div>
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
  const tierMin=t==='신화'?20:t==='전설기함'?20:t==='대형'?16:t==='중형'?10:8;
  // 인스턴스/카탈로그 override가 더 크면 사용, 아니면 티어 기본 (티어 기본이 최소 보장)
  let base=tierMin;
  if(typeof ship.crewMax==='number'&&ship.crewMax>tierMin)base=ship.crewMax;
  else{
    const cid=String(ship.catalogId||ship.catId||ship.id||'').replace(/(?:_\d+|_main)$/,'');
    const def=cid?SHIP_CATALOG.find(d=>d.id===cid):null;
    if(def&&typeof def.crewMax==='number'&&def.crewMax>tierMin)base=def.crewMax;
  }
  // 절대 상한: 20명 + 구매 확장(crewMaxExtra: 4 × N)
  const extra=(+ship.crewMaxExtra)||0;
  return Math.min(20,base)+extra;
}
// 함선실(크루) 확장 — 4칸당 1회 구매, 최대 3회(+12칸)
const CREW_EXT_PER=4;
const CREW_EXT_MAX_BUYS=3;
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

// ─── 영웅 퀘스트 시스템 (사용자 요청 2026-06-07) ──────────────────────
// · 일반 퀘스트 8회 완료마다 1개씩 보라색 특별 퀘스트 자동 등장
// · 영웅의 캐논 행성에서 등장 (시나리오 순서 보존)
// · 클릭 → 컷씬 재생 → 영웅 자동 영입
const _HERO_QUEST_PLANET_MAP={
  H08:'P19', H04:'P04', H01:'P13', H05:'P14',
  H02:'P06', H03:'P08', H06:'P28', H07:'P09'
};
const _HERO_SCENARIO_ORDER=['H08','H04','H01','H05','H02','H03','H06','H07'];
const _HERO_QUEST_THRESHOLD=8;  // 일반 퀘스트 N회마다 등장

function _nextScenarioHero(){
  // 시나리오 순서대로 미영입 첫 영웅
  for(let i=0;i<_HERO_SCENARIO_ORDER.length;i++){
    const hid=_HERO_SCENARIO_ORDER[i];
    if(!(G.heroes||[]).includes(hid)) return hid;
  }
  return null;
}

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
  const _nmText=_isEn?('[Special] Recruit '+heroNm):('[특별] '+heroNm+' 영입');
  const _descText=_isEn
    ?('A trace of the legendary '+heroNm+' has been detected at '+planetNm+'. Travel there and recruit.')
    :(planetNm+'에서 전설의 '+heroNm+' 단서가 포착되었습니다. 추적하여 영입하세요.');
  G.quests[planetId].unshift({
    id:'q_hero_'+heroId,
    type:'hero_quest',
    heroId:heroId,
    ic:'⭐',
    npc:heroNm,
    npcIc:heroIc,
    nm:_nmText,
    desc:_descText,
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
  if(!bonusMsg)baekgu(I18N.t('baekgu.questReward',{cr:_actualCr.toLocaleString(),bonus:_rm>1.05?I18N.t('baekgu.levelBonusX',{mult:_rm.toFixed(1)}):''}));

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
  // ─── 영웅 퀘스트 자동 등장 카운터 (일반 퀘스트만 집계) ───
  // void_boss, hero_quest, story_quest 는 카운트 제외 (특수 퀘스트는 페이싱 기준 아님)
  if(q.type!=='hero_quest'&&q.type!=='void_boss'&&q.type!=='story_quest'){
    G._normalQuestCount=(G._normalQuestCount||0)+1;
    if(G._normalQuestCount>=_HERO_QUEST_THRESHOLD){
      const _nextHero=_nextScenarioHero();
      if(_nextHero){
        const _spawned=_spawnHeroQuest(_nextHero);
        if(_spawned){
          G._normalQuestCount=0;  // 카운터 리셋
          try{saveGame(true);}catch(e){}
        }
      } else {
        // 8영웅 전원 영입 완료 — 카운터 영구 동결
        G._normalQuestCount=0;
      }
    }
  }
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
        <div style="font-size:13px;color:var(--dim);line-height:1.8">적군: 잔해 해적 ${pirateCount}척<br>${I18N.t('ui.scanContinues')}</div>
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
  const _bonus=Math.max(0,Math.min(0.30,+superiorBonus||0));  // 최대 30%p 안전 캡
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
    {tab:'planets',ic:'🌍',nm:I18N.t('plaza.planetsNm'),desc:I18N.t('plaza.planetsDesc'),color:'var(--green)',bg:'rgba(0,255,140,.07)',bdr:'rgba(0,255,140,.25)'},
    {tab:'auction',ic:'🏛️',nm:I18N.t('ui.planetAuction'),desc:I18N.t('ui.planetAuctionDesc'),color:'var(--gold)',bg:'rgba(212,175,55,.07)',bdr:'rgba(212,175,55,.2)'},
  ];
  body.innerHTML=`<div class="hub-scroll">
${hubBanner('front','🌍',I18N.t('front.title'),pd?.f)}
<div class="hub-t">${I18N.t('hub.planetFrontT')} — ${pd?pd.nm:''}</div>
<div style="color:var(--dim);font-size:13px;margin-bottom:20px;text-align:center">${I18N.t('ui.auctionIntro')}</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;max-width:380px;margin:0 auto">
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
  const _enhMul=1+Math.max(0,Math.min(10,s._enhanceLv||0))*0.05;
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
// 적대 행성 적 함대 생성 (startCombat과 브리핑에서 공용)
// 적함 등급 30% 확률로 한 단계 상위 (사용자 요청: 대형 함선 비중 30% 증가)
//   소형 → 중형, 중형 → 대형 으로 상향 (대형은 그대로 유지, 확률은 누적이 아닌 단일 롤)
function _enemyTierBoost(base){
  if(Math.random()<0.30){
    if(base==='소형')return '중형';
    if(base==='중형')return '대형';
  }
  return base;
}
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
  const tierFn=(i)=>_enemyTierBoost(i===0&&plv>=60?'대형':i<2&&plv>=30?'중형':'소형');
  return Array.from({length:eCount},(_,i)=>({
    id:`E${i}`,nm:I18N.t('ui.cheeksShipFmt',{nm:I18N.t('ui.cheeksShipNames').split('|')[i%6]}),
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
  const advisor=totFleetAtk>=totEnemyAtk*1.2?{c:'var(--green)',t:I18N.t('advisor.advantage'),lvl:'win'}
                :totFleetAtk>=totEnemyAtk*0.8?{c:'var(--yellow)',t:I18N.t('advisor.even'),lvl:'mid'}
                :{c:'var(--red)',t:I18N.t('advisor.disadvantage'),lvl:'lose'};
  // 사용자 요청 2026-06-07: 적대 대치 팝업 통일 — _hostileVsHeader 헬퍼 사용 (192px 캐릭터, 16px VS, ⚠ 제거)
  const _hFac=(/^F0[1-7]$/.test(planetDef?.f||''))?planetDef.f:'F05';
  const _hVer=(window._GAME_VER)?('?v='+encodeURIComponent(window._GAME_VER)):'';
  const _enemySrc='img/quests/combat_'+_hFac+'.png'+_hVer;
  openModal(I18N.t('modal.hostilePlanetEntry',{nm:planetDef.nm}),
    _hostileVsHeader({enemyImg:_enemySrc,enemyName:planetDef.nm,enemyFallback:'⚠️'})
    +`<div style="text-align:center;padding:0 6px 6px">
      <div style="color:var(--red);font-size:18px;font-weight:bold;margin-bottom:4px">${I18N.t('ui.enemyFleetDetected',{nm:planetDef.nm})}</div>
      <div style="color:var(--dim);font-size:12px;line-height:1.7">
        ${I18N.t('ui.briefingRingDiff',{ring:planetDef.ring||2,diff:({easy:I18N.t('difficulty.easy'),normal:I18N.t('difficulty.normal'),hard:I18N.t('difficulty.hard'),extreme:I18N.t('difficulty.extreme')})[G.difficulty]||I18N.t('difficulty.normal')})}<br>
        <span style="color:${advisor.c};font-weight:bold">${I18N.t('ui.powerAssessment',{t:advisor.t})}</span>
      </div>
    </div>
    ${_formatEnemyPreview(enemies)}
    <div style="text-align:center;font-size:12px;color:var(--yellow);margin-top:6px">${I18N.t('ui.winConquerLoseCr')}</div>
    <div style="text-align:center;font-size:12px;color:var(--cyan);margin-top:4px">${_baekguIcon(18)} ${I18N.t('ui.baekguShort')}: "${I18N.t('advisor.bkPreCombat')}${advisor.lvl==='win'?I18N.t('advisor.bkPush'):advisor.lvl==='mid'?I18N.t('advisor.bkCareful'):I18N.t('advisor.bkComeLater')}"</div>`,
    [
      {txt:I18N.t('ui.startBattle'),fn:()=>{closeModal();_safeCombatEntry(function(){startCombat(planetDef);},"startCombat");},cls:'btn-red'},
      {txt:I18N.t('btn.retreatOther'),fn:()=>{closeModal();notify(I18N.t('notify.retreatOther'),'warn');baekgu(I18N.t('baekgu.retreatedStep'));},cls:'btn-sm'}
    ],{wide:true}
  );
}

// 전투 직전 적 두목 시비/통행료 요구 — js/modules/shakedown-popup.js 로 분할됨 (2026-06-08)
//   · 통행료 = (ring×4000+3000) + (아군 함대 자산 합계 × 1%)
//   · window._showShakedownPopup, window._SHAKEDOWN_NPCS 노출
// 일반 구매가능 함선 풀 (S/M/H, 가격>0, 전설/보스 제외)
function _normalShipPool(){
  return (typeof SHIP_CATALOG!=='undefined'?SHIP_CATALOG:[]).filter(s=>
    (s.price||0)>0 && (s.tier==='소형'||s.tier==='중형'||s.tier==='대형') &&
    !/^LGD/.test(s.id) && s.id!=='URSA' && s.id!=='BLACKFALCON'
  );
}
// 적 함대의 약 50%를 일반 구매가능 함선으로 외형 치환 (전투 스탯은 그대로 → 밸런스 불변)
function _mixInNormalShips(enemies){
  if(!Array.isArray(enemies)||!enemies.length)return;
  const pool=_normalShipPool();
  if(!pool.length)return;
  enemies.forEach(u=>{
    if(!u||u.voidBoss||u.id==='BOSS_MAIN'||u._ursaBoss||(u.nm||'').toLowerCase().includes('우르사')||(u.nm||'').toLowerCase().includes('ursa'))return;
    if(Math.random()>=0.5)return;  // ~50%
    const sameTier=pool.filter(s=>s.tier===(u.tier||'소형'));
    const arr=sameTier.length?sameTier:pool;
    const def=arr[Math.floor(Math.random()*arr.length)];
    if(!def)return;
    u.catId=def.id; u.catalogId=def.id; u.tier=def.tier;
    u.nm=I18N.t('enemy.prefix')+def.nm;
    u._useCatalogImg=true;  // _combatShipImgSrc 가 카탈로그 함선 이미지로 표시
    try{if(typeof _markShipDiscovered==='function')_markShipDiscovered({catalogId:def.id,id:def.id});}catch(e){}  // 전투에서 마주친 함선 발견 처리
  });
}
function startCombat(planetDef){
  const isBoss=planetDef.id==='BOSS';
  // 전투 직전 통행료 시비 이벤트 (보스 제외, 항상 노출, 세션당 1회) — 사용자 요청
  // 사용자 보고 2026-06-09: 팝업 실패 시 전투 영구 미진입 — 안전망 추가
  if(!isBoss && planetDef && !planetDef._shakedownDone){
    planetDef._shakedownDone=true;
    if(typeof _showShakedownPopup==='function'){
      try{
        _showShakedownPopup(planetDef,()=>startCombat(planetDef));
        return;
      }catch(e){
        console.warn('[combat] shakedown(startCombat) failed — proceeding:',e);
      }
    } else {
      console.warn('[combat] _showShakedownPopup 미정의 — startCombat 시비 단계 스킵');
    }
  }
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
    // 사용자 요청 누적: 보스 본체 HP ×100 → 추가 ×10 (호위 전멸 후 본격 2페이즈용)
    let _scaleHP=Math.max(_BASE_HP,Math.round(_playerDur*2.7));
    _scaleHP=_scaleHP*100*10;
    const _scaleATT=Math.max(_BASE_ATT,Math.round(_fp.atk*2.7));    // ATT는 기존 유지(2페이즈 진입 시 ×3)
    const _scaleSH=Math.max(_BASE_SH,Math.round(_fp.sh*2.7));       // SH는 기존 유지
    // ── 진형(열): 0=치크스 소형 / 1=치크스 중형 / 2=친위대(대형) / 3=우르사 본체(최후방) ──
    // 보스는 array 0번 유지(기존 enemies[0] 참조 호환). 시각 배치는 _formationCol 로 결정.
    // 호위 전멸 전까지 _invincible=true → 타겟 불가(무적) + 최후 공격 대상.
    enemies=[{...BOSS,id:'BOSS_MAIN',isEnemy:true,
      hp:_scaleHP,maxHP:_scaleHP,HP:_scaleHP,
      sh:_scaleSH,maxSH:_scaleSH,
      ATT:_scaleATT,
      phase:1,_phaseAnn:0,shieldTier:20,armorTier:15,
      _formationCol:3,_ursaBoss:true,_invincible:true}];
    // 3열: 친위대 15척(대형) — HP ×10
    if(typeof BOSS_ESCORT!=='undefined'){
      BOSS_ESCORT.forEach(esc=>{
        const _eHP=(esc.maxHP||esc.HP||1)*10;
        enemies.push({...esc,hp:_eHP,maxHP:_eHP,HP:_eHP,shieldTier:10,armorTier:8,_formationCol:2});
      });
    }
    // 1열: 치크스 소형 정찰대 8척
    for(let i=0;i<8;i++){const _h=8000;
      enemies.push({id:'CHIX_S_BOSS_'+i,nm:'치크스 정찰기',_nmKey:'enemy.chiksScout',tier:'소형',isEnemy:true,
        hp:_h,maxHP:_h,HP:_h,sh:2000,maxSH:2000,ATT:300,INT:60,TEC:45,LOY:0,
        shieldTier:4,armorTier:3,_formationCol:0});}
    // 2열: 치크스 중형 순양함 6척
    for(let i=0;i<6;i++){const _h=25000;
      enemies.push({id:'CHIX_M_BOSS_'+i,nm:'치크스 순양함',_nmKey:'enemy.chiksCruiser',tier:'중형',isEnemy:true,
        hp:_h,maxHP:_h,HP:_h,sh:6000,maxSH:6000,ATT:600,INT:120,TEC:70,LOY:0,
        shieldTier:7,armorTier:5,_formationCol:1});}
  } else if(planetDef._previewEnemies){
    // 브리핑에서 미리 생성한 적 함대 재사용 (능력치 일관성 보장)
    enemies=planetDef._previewEnemies;
    delete planetDef._previewEnemies;
  } else {
    enemies=_buildHostilePlanetEnemies(planetDef);
  }
  const players=G.fleet.map(s=>{const st=getShipStats(s);const _wpn=PARTS.find(p=>p.cat==='weapon'&&(s.parts||[]).includes(p.id));const _wt=_wpn?(_wpn.tier||1):1;const _wtype=_wpn?(_wpn.wtype||'laser'):'laser';const _wrar=_wpn?(_wpn.rarity||''):'';const _shp=PARTS.find(p=>p.cat==='shield'&&(s.parts||[]).includes(p.id));const _shTier=_shp?(_shp.tier||0):0;const _arp=PARTS.find(p=>p.cat==='armor'&&(s.parts||[]).includes(p.id));const _arTier=_arp?(_arp.tier||0):0;return{...s,isEnemy:false,hp:s.hp,maxHP:st.HP,sh:s.sh,maxSH:st.maxSH,ATT:st.ATT,INT:st.INT,TEC:st.TEC,DEF:st.DEF||0,wtype:_wtype,wpnTier:_wt,wpnRarity:_wrar,shieldTier:_shTier,armorTier:_arTier};});
  combatState={players,enemies,turn:0,done:false,log:[],planetDef,isBoss,_rndSeed:Date.now()%9999,_entranceT:0,_entranceDone:false,_planetId:G.currentPlanet};
  // 우르사 최종전: 4열 진형 + 거대 보스가 한 화면에 들어오도록 기본 줌 축소(플레이어가 휠로 조절 가능)
  if(isBoss)cbZoom=0.4;
  renderCombatView(document.getElementById('hub-body'));
  setHubNav('combat');updateHUD();
  _cbEffects=[];_unitPos={};if(_cbAnimReq){cancelAnimationFrame(_cbAnimReq);_cbAnimReq=null;}
  combatState._sunsinUsed=false;
  // 함선 즉시 등장 (애니메이션 없음)
  combatState._entranceT=1;combatState._entranceDone=true;
  sfxAlert();try{AudioMgr.playBgm(isBoss?'boss':'combat');}catch(e){}
  _preloadCombatImages();requestAnimationFrame(()=>{initCombatCanvas();const t=document.getElementById('cb-title');if(t)t.textContent=I18N.t('combat.titleBoss',{bossTitle:isBoss?I18N.t('combat.title.bossUrsa'):I18N.t('combat.title.default'),nm:planetDef.nm});_cbStartAnimLoop();_updateCombatFleetStats();setTimeout(runCombatTurn,600);});
}
// 전투 중 도망가기 — 확인 모달 → fleeCombat 실행
function confirmFleeCombat(){
  if(!combatState||combatState.done)return;
  // 보스급 전투는 도망 불가 (스토리 진행상 후퇴 의미 없음)
  if(combatState.isBoss||combatState.isVoidBoss){
    notify(I18N.t('notify.cannotFleeBoss'),'err');
    return;
  }
  const _pen=Math.floor(G.credits*0.03);
  openModal(I18N.t('modal.flee'),
    `<div style="padding:6px 4px">
       <div style="color:var(--yellow);font-size:14px;line-height:1.7;margin-bottom:10px">${I18N.t('ui.fleeWithoutDamage')}</div>
       <div style="background:rgba(255,40,40,.08);border:1px solid rgba(255,80,80,.4);border-radius:6px;padding:10px 12px;font-size:13px;line-height:1.9;color:#ff9999">
         ${I18N.t('ui.fleeRetreatPen',{cr:_pen.toLocaleString()})}<br>
         ${I18N.t('ui.fleeRepPen')}<br>
         ${I18N.t('ui.fleeNoReward')}
       </div>
     </div>`,
    [
      {txt:I18N.t('cb.flee'),fn:()=>{closeModal();fleeCombat();},cls:'btn-red'},
      {txt:I18N.t('ui.keepFighting'),fn:closeModal,cls:'btn-sm'}
    ]);
}
function fleeCombat(){
  if(!combatState||combatState.done)return;
  combatState.done=true;
  // 잔여 SFX/이펙트 정리
  try{AudioMgr.stopAllSfx();}catch(e){}
  try{_cbEffects=[];if(_cbAnimReq){cancelAnimationFrame(_cbAnimReq);_cbAnimReq=null;}}catch(e){}
  // 도주 페널티 — 엔진(TEC) 합산이 높을수록 손실 완화 (사용자 명세)
  //   TEC 0   → 페널티 100% (3% 크레딧, 명성 -2)
  //   TEC 500 → 페널티 67%   (~2% / 명성 -1)
  //   TEC 1500+ → 페널티 30% (캡 — 0.9% / 명성 0~-1)
  const _flTec=(combatState.players||G.fleet||[]).reduce((s,u)=>s+(u.TEC||0),0);
  const _penMul=Math.max(0.30, 1 - Math.min(0.70, _flTec/2200));
  const _pen=Math.floor(G.credits*0.03*_penMul);
  const _repLoss=Math.max(1, Math.round(2*_penMul));
  G.credits=Math.max(100,G.credits-_pen);
  try{changeReputation(-_repLoss);}catch(e){}
  const _tecNote=_penMul<0.95?I18N.t('ui.engineAdvDiscount',{pct:Math.round((1-_penMul)*100)}):'';
  addCombatLog(I18N.t('combat.fleeWithPenalty',{pen:_pen.toLocaleString(),rep:_repLoss,tec:_tecNote}),'err');
  notify(I18N.t('notify.fleeAlt',{cr:_pen.toLocaleString(),rep:_repLoss,tec:_tecNote}),'err');
  try{baekgu(I18N.t('baekgu.fledStronger'));}catch(e){}
  // 아군 함대 HP 동기화 (전투 중 데미지 보존)
  try{G.fleet.forEach(s=>{const cs=combatState.players.find(p=>p.id===s.id);if(cs){s.hp=Math.max(1,cs.hp);if(cs.sh!=null)s.sh=cs.sh;}});}catch(e){}
  // 전투 기록 저장 (패배 처리)
  if(!G.combatHistory)G.combatHistory=[];
  const _pdef=combatState.planetDef&&combatState.planetDef.nm?combatState.planetDef:(PLANET_DEF.find(p=>p.id===G.currentPlanet)||{});
  G.combatHistory.push({
    win:false,fled:true,
    pid:G.currentPlanet,planetId:G.currentPlanet,
    planet:_pdef.nm||I18N.t('ui.unknownPlanet'),
    turn:combatState.turn,
    earned:-_pen,
    gameTurn:G.turn
  });
  updateHUD();saveGame(true);
  // 1.2초 후 허브로 복귀 (이펙트 페이드 시간)
  setTimeout(()=>{
    combatState=null;
    try{_cbCacheClear();}catch(e){}
    _cbEffects=[];_unitPos={};
    if(_cbAnimReq){cancelAnimationFrame(_cbAnimReq);_cbAnimReq=null;}
    try{updateGatherBtn();}catch(e){}
    try{AudioMgr.playBgm(_planetBgmName(G.currentPlanet));}catch(e){}
    if(typeof hubTab==='function')hubTab('main');
  },1200);
}
try{if(typeof window!=='undefined'){window.confirmFleeCombat=confirmFleeCombat;window.fleeCombat=fleeCombat;}}catch(e){}

function renderCombatView(body){
  body.classList.add('cv');
  document.body.classList.add('combat-mode');  // 알림(notif) 위치 조정용
  body.innerHTML=`<div id="cb-hdr" style="min-height:42px;background:rgba(13,26,42,.97);border-bottom:1px solid var(--bdr);display:flex;align-items:center;justify-content:space-between;padding:4px 10px;flex-shrink:0;gap:8px;white-space:nowrap;overflow:hidden">
    <div id="cb-title" style="color:var(--yellow);font-weight:bold;font-size:13px;flex-shrink:1;min-width:0;overflow:hidden;text-overflow:ellipsis">${I18N.t('combat.title.default')}</div>
    <div id="cb-turn" style="color:var(--cyan);font-size:11px;flex-shrink:0">TURN 0</div>
    <div id="cb-status" style="color:var(--dim);font-size:11px;flex-shrink:1;min-width:0;overflow:hidden;text-overflow:ellipsis">${I18N.t('combat.statusPreparing')}</div>
  </div>
  <!-- 사용자 요청: 함대 전술 버튼은 헤더 바로 하단 1행에 정렬 표시 -->
  <div id="cb-tactics" style="background:rgba(8,16,28,.92);border-bottom:1px solid var(--bdr);padding:4px 10px;flex-shrink:0;display:flex;align-items:center;gap:6px;flex-wrap:nowrap;overflow-x:auto;min-height:42px"></div>
  <div id="cb-fleet-stats" style="background:rgba(8,16,28,.96);border-bottom:1px solid var(--bdr);padding:6px 14px;flex-shrink:0;display:grid;grid-template-columns:1fr 1fr;gap:14px;font-size:11px;font-family:Courier New,monospace">
    <div id="cb-fleet-pl" style="color:var(--cyan)">${I18N.t('combat.alliesMeasuring')}</div>
    <div id="cb-fleet-en" style="color:#ff8888;text-align:right">${I18N.t('combat.enemyMeasuring')}</div>
  </div>
  <div id="cb-arena" style="flex:1;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;background:#050a1a">
    <canvas id="cb-cv"></canvas>
    <!-- 전투 상황 로그 — 우측 세로 팝업 컬럼 (사용자 요청: 하단 스트립 → 우측 페이드 팝업) -->
    <div id="cb-log" class="cb-log" style="position:absolute;right:10px;top:10px;bottom:10px;width:174px;display:flex;flex-direction:column-reverse;gap:4px;pointer-events:none;z-index:8;overflow:hidden"></div>
  </div>`;
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
  // 터치 리스너 — addEventListener는 중복 추가되므로 element에 한 번만 attach (data-touch-init 가드)
  // ※ renderCombatView가 매번 cb-cv를 새로 만들지만, 같은 노드를 재사용하는 경로(resumeCombat 등)에서는
  //    가드 없이 그대로 두면 매 호출마다 touchstart/move/end 리스너가 누적되어 RAM/이벤트 폭주를 유발.
  if(cbCV.dataset.touchInit!=='1'){
  cbCV.dataset.touchInit='1';
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
  }
  // 전투 헤더에 줌 버튼 추가
  const hdr=document.getElementById('cb-hdr');
  if(hdr&&!document.getElementById('cb-zoom-btns')){
    const btns=document.createElement('div');btns.id='cb-zoom-btns';
    btns.style.cssText='display:flex;gap:3px;align-items:center;flex-shrink:0';
    // 사용자 요청: 상단 -, + 줌 버튼 삭제. 시점 리셋(⌂) 만 유지. 줌은 휠·핀치로 계속 가능.
    btns.innerHTML=`<span style="font-size:10px;color:var(--muted);white-space:nowrap">${I18N.t('combat.controlsHint')}</span>
      <button class="btn btn-sm" onclick="cbZoom=1;cbOffX=0;cbOffY=0;drawCombatFrame()" style="padding:3px 11px;font-size:16px;min-height:34px" title="${I18N.t('map.resetView')}">⌂</button>
      <button id="cb-flee-btn" onclick="confirmFleeCombat()" title="${I18N.t('combat.fleeTooltip')}"
        style="background:rgba(231,76,60,.18);border:1.5px solid rgba(255,80,80,.6);color:#ff9999;font-family:inherit;font-size:13px;font-weight:bold;padding:8px 18px;border-radius:6px;cursor:pointer;letter-spacing:2px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.3)">${I18N.t('combat.flee')}</button>`;
    hdr.insertBefore(btns,hdr.children[1]);
  // 일점사 전술 버튼 — H01(이순신) OR H05(넬슨) 영입 시 표시 (사용자 요청: 넬슨 단독도 OK)
  //   · 부착 위치: cb-tactics (헤더 하단 1행) — 사용자 요청
  if((G.heroes.includes('H01')||G.heroes.includes('H05'))&&!document.getElementById('cb-sunsin-btn')){
    const _tac=document.getElementById('cb-tactics')||hdr;
    const sbtn=document.createElement('button');sbtn.id='cb-sunsin-btn';
    sbtn.className='btn btn-sm';
    sbtn.style.cssText='padding:5px 14px;font-size:14px;min-height:34px;min-width:130px;letter-spacing:.3px;border-color:var(--red);color:var(--red);background:rgba(255,60,60,.08);animation:pulse 2s infinite;white-space:nowrap;flex-shrink:0';
    sbtn.textContent=I18N.t('combat.focusFire');
    const _by=G.heroes.includes('H01')?((typeof HEROES!=='undefined'&&HEROES.H01?.nm)||I18N.t('hero.fallbackH01')):((typeof HEROES!=='undefined'&&HEROES.H05?.nm)||I18N.t('hero.fallbackH05'));
    sbtn.title=I18N.t('combat.focusFireTip',{by:_by});
    sbtn.onclick=activateSunsinFocus;
    _tac.appendChild(sbtn);
  }
  }
  // 탭 전환 후 복귀 시 — 이미 활성화/사용된 스킬 버튼 상태 복원
  try{_restoreCombatSkillButtons();}catch(e){console.warn('skill button restore failed',e);}
  drawCombatFrame();
}

// ── 다른 탭 갔다 와도 일점사/학익진/시간차공격 등 후속 스킬 버튼 상태 복원 ──
// 원인: 일점사 사용 → 5초 setTimeout → _showHaikjinButton 호출 시점에 cb-hdr이 없어
//      (다른 탭 화면) 버튼 생성이 silent fail 됨. 복귀해도 setTimeout이 이미 소진됐기 때문에
//      학익진 버튼이 영영 안 나타남. _xxxReady 플래그를 보고 재생성.
function _restoreCombatSkillButtons(){
  if(!combatState||combatState.done)return;
  // 일점사: 항상 initCombatCanvas에서 추가됨 — 사용 흔적만 반영해 비활성화
  const sbtn=document.getElementById('cb-sunsin-btn');
  if(sbtn&&combatState._sunsinUsed)sbtn.disabled=true;
  // 학익진/시간차공격/테슬라/제네시스/데스티네이션 — ready 또는 used 시 재생성
  if(combatState._haikjinReady||combatState._haikjinUsed){try{_showHaikjinButton();}catch(e){}}
  if(combatState._einsteinReady||combatState._einsteinUsed){try{_showEinsteinButton();}catch(e){}}
  if(combatState._teslaReady||combatState._teslaUsed){try{_showTeslaButton();}catch(e){}}
  if(combatState._genesisReady||combatState._genesisUsed){try{_showGenesisButton();}catch(e){}}
  if(combatState._destinationReady||combatState._destinationUsed){try{_showDestinationButton();}catch(e){}}
  // 이미 사용된 버튼은 비활성화 표시
  [['haikjin','_haikjinUsed'],['einstein','_einsteinUsed'],['tesla','_teslaUsed'],['genesis','_genesisUsed'],['destination','_destinationUsed']].forEach(([k,flag])=>{
    const btn=document.getElementById('cb-'+k+'-btn');
    if(btn&&combatState[flag])btn.disabled=true;
  });
}
// ── 전투 이미지 캐시 (PNG 교체 구조) ──────────────────────────────
// PNG 파일 위치: img/combat/ships/{catalogId}.png  (플레이어 함선)
//                img/combat/enemies/{enemyType}.png (적 함선)
// PNG 없으면 벡터 폴백으로 자동 전환
// 전투 이미지 캐시: LRU 상한으로 메모리 누수 방지 (장시간 플레이 시 다운 예방)
const _CB_IMG_CACHE_MAX=60;  // 사용자 다운 재보고 (2026-06-06): 80 → 60 (-25% 추가)
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
  const _r=_combatShipImgSrcRaw(u);
  const _lod=(typeof window!=='undefined'&&window._mobileLod)?window._mobileLod(_r):_r;
  // bugfix 2026-06-11: 전투 화면에도 신규 HD 함선 이미지 적용 —
  //   허브(shipImgSrc)는 img/ships/H/ HD를 쓰지만 전투는 구버전 img/combat/ships/ 만 사용하던 문제.
  //   데스크탑: img/combat/ships/X.png → img/ships/H/X.png 우선, 실패 시 _COMBAT_H_FB 매핑으로
  //   _drawShipUnit 에서 원본 경로 폴백. 모바일은 기존 LOD(m/) 유지.
  if(typeof window!=='undefined'&&!window.IS_MOBILE&&typeof _r==='string'){
    const _hd=_r.replace(/^img\/combat\/ships\/([^/?]+\.png)(\?|$)/,'img/ships/H/$1$2');
    if(_hd!==_r){
      try{
        if(!window._COMBAT_H_FB)window._COMBAT_H_FB={};
        window._COMBAT_H_FB[_hd]=_lod;
      }catch(e){}
      return _hd;
    }
  }
  return _lod;
}
function _combatShipImgSrcRaw(u){
  const _TIER={'소형':'S','중형':'M','대형':'L','전설기함':'L','신화':'L'};
  const _tierKey=t=>_TIER[t||'소형']||'S';
  // 캐시 버스터 — Firebase png 24h 캐시 우회 (H12 등 함선 이미지 교체 시 즉시 반영)
  const _ver=(typeof window!=='undefined'&&window._GAME_VER)?('?v='+encodeURIComponent(window._GAME_VER)):'';
  // 스킨(홀로그램) — 전투 화면에서도 외관만 변경
  if(!u.isEnemy && u._skinCatId){
    const _sk=String(u._skinCatId).toUpperCase();
    if(_sk==='URSA'||_sk==='BOSS')return 'img/combat/ships/Boss.png'+_ver;
    if(_sk==='BLACKFALCON'||_sk==='VOIDFALCON'||_sk==='HIDDEN_FALCON')return 'img/ships/S10.png'+_ver;
    return 'img/combat/ships/'+u._skinCatId+'.png'+_ver;
  }
  const isEnemy=!!u.isEnemy;
  const sid=String(u.id||'');
  const nmLow=String(u.nm||'').toLowerCase();
  const catId=sid.replace(/(?:_\d+|_main)$/,'').toUpperCase();
  // 이름 기반 팩션 추정 (catalogId/id 누락 대비)
  const isChixName=nmLow.includes('치크스')||nmLow.includes('chix')||nmLow.includes('chiks');
  const isPirateName=nmLow.includes('해적')||nmLow.includes('pirate')||nmLow.includes('raider')||nmLow.includes('약탈');
  const isDbrpName=nmLow.includes('잔해')||nmLow.includes('dbrp')||nmLow.includes('salvage')||nmLow.includes('debris')||nmLow.includes('recovered')||nmLow.includes('회수');
  // ── 블랙팔콘 / 보이드 팔콘 / 히든 팔콘(보이드 시험 보상) 공통 — 적/아군 무관하게 S10.png ──
  // catalogId 변형: BLACKFALCON / VOID_FALCON / HIDDEN_FALCON / FALCON
  // (catalogId의 '_' 이후가 잘려 'HIDDEN'/'VOID'가 되는 경우까지 포함)
  const _isFalcon=(()=>{
    const _cidRawUp=String(u.catalogId||u.catId||u.id||'').toUpperCase();
    if(/BLACKFALCON|VOIDFALCON|VOID_FALCON|HIDDEN_FALCON|^FALCON/.test(_cidRawUp))return true;
    if(catId==='HIDDEN'||catId==='VOID'||catId==='FALCON'||catId==='BLACKFALCON'||catId==='VOIDFALCON')return true;
    if(sid.startsWith('HIDDEN_FALCON')||sid.startsWith('CAP_BLACKFALCON')||sid.startsWith('CAP_VOIDFALCON')||sid.startsWith('BLACKFALCON')||sid.startsWith('VOID_FALCON'))return true;
    if(u._isHiddenFalcon||u._isVoidFalconCaptured||u.voidBoss)return true;
    if(nmLow.includes('팔콘')||nmLow.includes('블랙')||nmLow.includes('검은 팔콘')||nmLow.includes('다크팔콘')||nmLow.includes('falcon')||nmLow.includes('black falcon')||nmLow.includes('dark falcon')||nmLow.includes('blackfalcon'))return true;
    return false;
  })();
  if(_isFalcon)return 'img/ships/S10.png'+_ver;
  if(isEnemy){
    // 사용자 보고 2026-06-07 (재발): 우르사 알파(P19) 진입 시 우르사 메이저 보스 함선 등장
    // → 단순 '우르사' substring 매칭 제거. BOSS_* id, catalogId='URSA', 또는 정확히 '우르사 메이저'/'ursa major' 이름만 보스로 인정.
    //   (P19 행성 우르사-알파에 있는 일반 치크스 함선이 어떤 경로로든 nm에 '우르사'를 포함하면 오인식되던 문제 차단)
    const isBoss=catId.startsWith('BOSS_')||catId==='BOSS'||catId==='URSA'
                 ||sid.startsWith('BOSS_URSA')||sid==='BOSS_MAIN'
                 ||nmLow.includes('우르사 메이저')||nmLow.includes('ursa major');
    if(isBoss)return 'img/combat/enemies/Boss.png'+_ver;
    // 적 함대에 섞인 「일반 구매가능 함선」 — 카탈로그 함선 이미지로 표시
    if(u._useCatalogImg&&(u.catId||u.catalogId)){
      const _cc=String(u.catalogId||u.catId).replace(/(?:_\d+|_main)$/,'');
      const _n=(typeof _resolveShipImgBase==='function')?_resolveShipImgBase(_cc,u.tier):_cc;
      if(_n){if(_n==='S10')return 'img/ships/S10.png'+_ver;if(_n==='Default')return 'img/combat/ships/S01.png'+_ver;return 'img/combat/ships/'+_n+'.png'+_ver;}
    }
    const base=catId.startsWith('CHIX')||/^E\d/.test(catId)||isChixName?'CHIX':
               isDbrpName?'DBRP':'PIRATE';
    return 'img/combat/enemies/'+base+'_'+_tierKey(u.tier)+'.png'+_ver;
  }
  const cid=String(u.catalogId||u.catId||u.id||'').replace(/(?:_\d+|_main)$/,'').toUpperCase();
  // 특수 거북선 — 전투에서도 단일 이미지(img/ships/LGD01_SP.png) 사용 (별도 combat 에셋 없음)
  if(cid==='LGD01_SP'||u._turtleSpecial)return 'img/ships/LGD01_SP.png'+_ver;
  if(cid==='URSA'||sid.startsWith('BOSS_URSA')||cid==='BOSS'||sid==='BOSS_MAIN')return 'img/combat/ships/Boss.png'+_ver;
  // 나포 함선 (CAP_<ts>_<rand>) — id에 timestamp가 붙어 cid가 'CAP'과 정확히 일치하지 않으므로 prefix로 감지
  if(sid.startsWith('CAP_')||cid==='CAP'||cid.startsWith('CAP_')){
    const _capFac=isChixName?'CHIX':isDbrpName?'DBRP':'PIRATE';
    return 'img/combat/ships/'+_capFac+'_'+_tierKey(u.tier)+'.png'+_ver;
  }
  if(cid==='CHIX'||cid.startsWith('CHIX')||isChixName){
    return 'img/combat/ships/CHIX_'+_tierKey(u.tier)+'.png'+_ver;
  }
  const cidRaw=String(u.catalogId||u.catId||u.id||'').replace(/(?:_\d+|_main)$/,'');
  // 비표준 id 까지 실재 파일로 정규화 — 전투 화면 함선 이미지 누락(빈칸) 방지.
  // S10/Default 는 combat 폴더에 없으므로 ships 폴더(또는 S01)로 대체.
  const _cn=(typeof _resolveShipImgBase==='function')?_resolveShipImgBase(cidRaw,u.tier):null;
  if(_cn){
    if(_cn==='S10')return 'img/ships/S10.png'+_ver;
    if(_cn==='Default')return 'img/combat/ships/S01.png'+_ver;
    return 'img/combat/ships/'+_cn+'.png'+_ver;
  }
  return 'img/combat/ships/'+(cidRaw||'S01')+'.png'+_ver;
}
// 전투 시작 전 이미지 프리로드 (초기 렌더링에 PNG 즉시 표시)
function _preloadCombatImages(){
  // 로드 완료 시 캔버스 갱신 (이미지 로드 후 벡터→PNG로 전환)
  let _pendingRedraws=0;
  const _onImgLoad=()=>{_pendingRedraws++;if(_pendingRedraws===1)setTimeout(()=>{_pendingRedraws=0;if(typeof drawCombatFrame==='function')drawCombatFrame();},80);};
  const factions=['CHIX','PIRATE','DBRP'];const sizes=['S','M','L'];
  // 적 측: 모든 팩션+사이즈 + 보스 (모바일은 m/ 사본 자동 로드)
  const _lod=(s)=>(typeof window!=='undefined'&&window._mobileLod)?window._mobileLod(s):s;
  factions.forEach(f=>sizes.forEach(s=>_loadCombatImg(_lod('img/combat/enemies/'+f+'_'+s+'.png'),_onImgLoad)));
  _loadCombatImg(_lod('img/combat/enemies/Boss.png'),_onImgLoad);
  // 플레이어 함선: 실제 draw 경로와 동일한 helper로 경로 산출하여 정확히 일치하는 파일을 프리로드
  if(G&&G.fleet){
    const _seen=new Set();
    G.fleet.forEach(sh=>{
      const src=_combatShipImgSrc({...sh,isEnemy:false});
      if(src&&!_seen.has(src)){_seen.add(src);_loadCombatImg(src,_onImgLoad);}
    });
  }
}
// 맵 이미지 캐시 — LRU 36개 캡 (다운 재보고 2026-06-06 후 48→36)
const _MAP_IMG_CACHE_MAX=36;
const _mapImgCacheMap=new Map();
const _mapImgCache=new Proxy({},{
  get(_,k){return _mapImgCacheMap.get(k);},
  set(_,k,v){_mapImgCacheMap.delete(k);_mapImgCacheMap.set(k,v);
    while(_mapImgCacheMap.size>_MAP_IMG_CACHE_MAX){
      const oldest=_mapImgCacheMap.keys().next().value;if(oldest===undefined)break;
      _mapImgCacheMap.delete(oldest);
    }
    return true;
  },
  has(_,k){return _mapImgCacheMap.has(k);},
  deleteProperty(_,k){return _mapImgCacheMap.delete(k);}
});
function _loadMapImg(src,onLoad){
  if(_mapImgCacheMap.has(src)) return _mapImgCacheMap.get(src);
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
  // 특수 거북선 — 신화 기본(246×152)의 2배 크기로 전투 표시 (사용자 요청)
  if((u.catalogId||u.catId||u.id||'').toString().toUpperCase().indexOf('LGD01_SP')>-1||u._turtleSpecial)
    return{w:492,h:304,bar:528,label:18,gap:1100};
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
  const nm=(u.nm||'').toLowerCase(),tier=u.tier||'소형';
  // 우르사 메이저 보스 본체 — 사용자 요청 2026-06-07: 50% 축소 (1512×918 → 756×459)
  //   + 매칭 강화: BOSS_MAIN id 또는 _ursaBoss 플래그 또는 정확히 '우르사 메이저'/'ursa major' 이름만.
  //   (P19 우르사-알파 행성의 일반 함선이 우르사 보스 크기로 그려지던 문제 차단)
  if(u.id==='BOSS_MAIN'||u._ursaBoss||nm.includes('우르사 메이저')||nm.includes('ursa major'))
    return{w:756,h:459,bar:300,label:18,gap:1200};
  {
    const _idUp=String(u.catalogId||u.catId||u.id||'').toUpperCase();
    if(/BLACKFALCON|VOID_?FALCON|HIDDEN_FALCON/.test(_idUp)||u.voidBoss||u._isHiddenFalcon
       ||nm.includes('블랙팔콘')||nm.includes('블랙 팔콘')||nm.includes('black falcon')||nm.includes('blackfalcon'))
      return{w:448,h:276,bar:300,label:17,gap:900};
  }
  // 일반 해적 모선
  if(nm.includes('모선')||nm.includes('mothership')||nm.includes('carrier')) return{w:252,h:153,bar:324,label:16,gap:700};
  if(tier==='신화') return{w:224,h:138,bar:264,label:15,gap:640};
  if(tier==='전설기함') return{w:208,h:124,bar:240,label:14,gap:600};
  if(tier==='대형') return{w:144,h:88,bar:176,label:12,gap:480};
  if(tier==='중형'||nm.includes('포함')||nm.includes('순양함')||nm.includes('전투함')||nm.includes('구축함')||nm.includes('gunship')||nm.includes('cruiser')||nm.includes('battleship')||nm.includes('destroyer')||nm.includes('assault')) return{w:86,h:53,bar:112,label:11,gap:300};
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
  let imgSrc=_combatShipImgSrc(u);
  const dsz=isEnemy?_enemySize(u):_shipDrawSize(u);
  const col=isEnemy?'#cc44ff':'#00ccff';
  let cached=_cbImgCache[imgSrc];
  // bugfix 2026-06-11: HD 경로 로드 실패(ERR) 시 원본 combat 경로로 폴백
  if(cached==='ERR'&&typeof window!=='undefined'&&window._COMBAT_H_FB&&window._COMBAT_H_FB[imgSrc]){
    imgSrc=window._COMBAT_H_FB[imgSrc];
    cached=_cbImgCache[imgSrc];
  }
  // ── 함선 방향: 가장 가까운 적/아군(공격 대상) 방향을 바라보도록 회전 ──
  //  · 아군 → 가장 가까운 적 좌표 / 적 → 가장 가까운 아군 좌표
  //  · 부드러운 회전 보간(turnSpeed=0.02) → 사용자 요청 "회전 5배 느림"
  //  · 기본 함선 이미지/벡터는 우측(노즈)을 향함. 적은 atan2 + π로 미러 대체
  let _targetAngle=isEnemy?Math.PI:0;  // 기본 방향
  try{
    if(combatState){
      const others=isEnemy?(combatState.players||[]):(combatState.enemies||[]);
      let minD=Infinity,tx=null,ty=null;
      for(let i=0;i<others.length;i++){
        const o=others[i];if(!o||(o.hp||0)<=0)continue;
        const pos=_unitPos&&_unitPos[o.id||('X'+i)];if(!pos)continue;
        const dx=pos.x-x,dy=pos.y-y,d=dx*dx+dy*dy;
        if(d<minD){minD=d;tx=pos.x;ty=pos.y;}
      }
      if(tx!=null)_targetAngle=Math.atan2(ty-y,tx-x);
    }
  }catch(e){}
  // 회전 보간: 최단 경로 + 5배 느린 turnSpeed
  if(u._drawAngle==null)u._drawAngle=_targetAngle;
  let _da=_targetAngle-u._drawAngle;
  while(_da>Math.PI)_da-=Math.PI*2;
  while(_da<-Math.PI)_da+=Math.PI*2;
  u._drawAngle+=_da*0.0004;  // 사용자 요청: 10배 빠르게 (0.00004→0.0004)
  if(cached&&cached!=='ERR'&&cached.complete&&cached.naturalWidth>0){
    ctx.save();
    ctx.globalAlpha=alpha;
    // 자연 비율 유지: 높이 기준으로 스케일, 최대 너비 dsz.w*2.8 제한
    const nat=cached.naturalWidth/Math.max(1,cached.naturalHeight);
    const dh=dsz.h*2;
    const dw=Math.min(dsz.w*2.8, dh*nat);
    // 사용자 요청 (2026-06-06): 적 함선이 회전 시 상하 뒤집혀 표시되는 현상 완전 차단.
    //   접근: 회전 보간을 제거하고, 적은 항상 X축 미러로 좌측을 향함(노즈 좌측), 아군은 미러 없이 우측 향함.
    //   ※ 단순 미러는 ship sprite의 "위/아래"를 절대 뒤집지 않으므로 상하 반전 현상이 원천 차단된다.
    ctx.translate(x,y);
    if(isEnemy){
      ctx.scale(-1,1);  // 좌측 향하게 수평 미러만 적용 — 회전 없음
    }
    ctx.drawImage(cached,-dw/2,-dh/2,dw,dh);
    ctx.restore();
  } else {
    _drawShipVector(ctx,x,y,dsz,isEnemy,col,alpha,u._drawAngle);
    if(!cached)_loadCombatImg(imgSrc,function(){if(typeof drawCombatFrame==='function')drawCombatFrame();});
  }
  // 쉴드 오라: SH>0이고 살아있는 함선만. SH%에 따라 강도 조절 + 미세 펄스.
  // 사용자 요청: 투명도 20% 낮춤(곱 0.8) + 입체감 — 3중 그라데이션(외곽 글로우 → 본체 → 빛반사 하이라이트)
  if(u.hp>0&&(u.sh||0)>0&&(u.maxSH||0)>0){
    const shR=Math.max(0.1,Math.min(1,(u.sh||0)/(u.maxSH||1)));
    const pulse=0.85+0.15*Math.sin(Date.now()*0.005);
    const rx=dsz.w*1.12, ry=dsz.h*1.07;
    const A=0.8;  // 전체 알파 곱 (사용자 요청 ×0.8 — 투명도 20% 더 낮춤)
    ctx.save();
    ctx.translate(x,y);
    // ① 외곽 글로우 (가장 옅은 청록빛 후광 — 입체 1층)
    const gOuter=ctx.createRadialGradient(0,0,rx*0.4,0,0,rx*1.25);
    gOuter.addColorStop(0,'rgba(102,221,255,0)');
    gOuter.addColorStop(0.55,'rgba(102,221,255,0.10)');
    gOuter.addColorStop(1,'rgba(102,221,255,0)');
    ctx.globalAlpha=0.20*shR*pulse*A;
    ctx.fillStyle=gOuter;
    ctx.shadowColor='#66ddff';ctx.shadowBlur=18;
    ctx.beginPath();ctx.ellipse(0,0,rx*1.18,ry*1.18,0,0,Math.PI*2);ctx.fill();
    // ② 본체 — 라디얼 그라데이션 (중심 짙음 → 외곽 fade)
    const gBody=ctx.createRadialGradient(-rx*0.25,-ry*0.3,rx*0.15,0,0,rx);
    gBody.addColorStop(0,'rgba(180,235,255,0.45)');     // 좌상단 하이라이트
    gBody.addColorStop(0.45,'rgba(102,221,255,0.20)');
    gBody.addColorStop(1,'rgba(60,170,230,0.05)');
    ctx.globalAlpha=0.16*shR*pulse*A;
    ctx.fillStyle=gBody;
    ctx.shadowBlur=8;
    ctx.beginPath();ctx.ellipse(0,0,rx,ry,0,0,Math.PI*2);ctx.fill();
    // ③ 외곽 라인 (실드 가장자리 헥사 느낌 — 약간 진하게)
    ctx.globalAlpha=0.55*shR*pulse*A;
    ctx.strokeStyle='#9ee7ff';
    ctx.lineWidth=1.6;
    ctx.shadowBlur=10;
    ctx.beginPath();ctx.ellipse(0,0,rx,ry,0,0,Math.PI*2);ctx.stroke();
    // ④ 좌상단 빛반사 호 (입체감 — 작은 흰빛 아크)
    ctx.globalAlpha=0.42*shR*pulse*A;
    ctx.strokeStyle='rgba(220,245,255,0.9)';
    ctx.lineWidth=1.2;
    ctx.shadowBlur=4;
    ctx.beginPath();
    ctx.ellipse(0,0,rx*0.94,ry*0.92,0,Math.PI*1.05,Math.PI*1.55);
    ctx.stroke();
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
  // 기존 루프 정합성 검증 — 캔버스가 DOM에서 분리되었으면 stale 루프이므로 강제 재시작
  if(_cbAnimReq){
    if(cbCV&&document.body.contains(cbCV))return;  // 기존 루프 유효 — 그대로 둠
    try{cancelAnimationFrame(_cbAnimReq);}catch(e){}
    _cbAnimReq=null;
  }
  // 30fps 다운샘플링 — 이펙트가 적을 때 매 프레임이 아니라 격프레임으로 그려 CPU 절약
  // 이펙트가 50개 미만이고 모든 이펙트가 페이드 단계(life<maxLife/2)일 때만 적용.
  // 다이내믹한 폭발·번개가 살아 있을 땐 60fps 유지 → 시각 품질 보존.
  let _skipToggle=false;
  const tick=()=>{
    if(!cbCtx||!cbCV){_cbAnimReq=null;return;}
    const _effs=_cbEffects||[];
    const _calm=_effs.length<50&&_effs.every(e=>!e||(e.life||0)<((e.maxLife||1)/2));
    if(_calm){
      _skipToggle=!_skipToggle;
      if(_skipToggle){_cbAnimReq=requestAnimationFrame(tick);return;}
    }
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
// 데미지 텍스트 — 피격 시 함선 위로 떠오르는 숫자
//   사용자 요청 (2026-06-06 갱신):
//     · 폰트 ×2 (16 → 32px), 투명도 90%로 가독성 강화
//     · 데미지: 빨강 #ff3333 / 회복: 파랑 #3399ff (_cbAddHealText)
//     · 0.2s(12프레임) 동안 아래→위로 페이드인·피크·페이드아웃
function _cbAddDmgText(pos,rawDmg,shDmg,delay){
  if(!pos||!(rawDmg>0))return;
  _cbEffects.push({
    type:'dmgText',
    x:pos.x,
    y:pos.y-28,
    txt:'-'+Math.round(rawDmg),
    col:'#ff3333',                  // 피해: 빨강 (쉴드/HP 구분 없이 통일)
    life:12,maxLife:12,
    delay:Math.max(0,delay||0)
  });
}
// 회복 텍스트 — 아군 자가수리/흡혈 등 HP·실드 회복 시 함선 위로 +N 표시
function _cbAddHealText(pos,healAmt,delay){
  if(!pos||!(healAmt>0))return;
  _cbEffects.push({
    type:'dmgText',                 // 동일 이펙트 타입 재사용 (렌더 로직 공유)
    x:pos.x,
    y:pos.y-28,
    txt:'+'+Math.round(healAmt),
    col:'#3399ff',                  // 회복: 파랑
    life:12,maxLife:12,
    delay:Math.max(0,delay||0)
  });
}
function _cbAddBeamAndHit(a1,a2,beamCol,isDead,delay,wasShielded){
  delay=delay||0;
  // 클로저로 현재 combatState 캡처 — 전투 종료 후엔 SFX 발화 안 함
  const _cs=combatState;
  const _sfxOk=()=>_cs&&!_cs.done;
  // 발사 사운드 (delay 프레임 후, 1프레임≈16ms)
  setTimeout(()=>{if(!_sfxOk())return;try{AudioMgr.playSfx('laser_fire',{vol:0.55,cooldown:40});}catch(e){}},delay*16);
  // 피격 사운드: 빔 도달 시점(delay+3프레임), 쉴드 vs 폭발
  const hitMs=(delay+3)*16;
  if(wasShielded){setTimeout(()=>{if(!_sfxOk())return;try{AudioMgr.playSfx('shield_hit',{vol:0.55,cooldown:40});}catch(e){}},hitMs);}
  if(isDead){setTimeout(()=>{if(!_sfxOk())return;try{AudioMgr.playSfx('explosion',{vol:0.75,cooldown:80});}catch(e){}},(delay+5)*16);}
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
  // 사용자 명세: 기본 1발, 전설·신화 미사일은 최대 4발까지 다양한 곡선으로 발사
  count=Math.max(1,Math.min(4,count|0));
  baseDelay=baseDelay||0;
  sizeMul=Math.max(1,sizeMul||1);
  // 클로저로 현재 combatState 캡처 — 전투 종료 후엔 SFX 발화 안 함
  const _cs=combatState;
  const _sfxOk=()=>_cs&&!_cs.done;
  // 살보 발사 사운드 (한 번)
  setTimeout(()=>{if(!_sfxOk())return;try{AudioMgr.playSfx('missile',{vol:0.6,cooldown:60});}catch(e){}},baseDelay*16);
  // 미사일은 약 60프레임에 걸쳐 도달 → 살보의 마지막이 도착하는 시점에 충돌 sfx
  const lastImpactMs=(baseDelay + (count-1)*3 + 50)*16;
  if(wasShielded){setTimeout(()=>{if(!_sfxOk())return;try{AudioMgr.playSfx('shield_hit',{vol:0.6,cooldown:80});}catch(e){}},lastImpactMs);}
  if(isDead){setTimeout(()=>{if(!_sfxOk())return;try{AudioMgr.playSfx('explosion',{vol:0.8,cooldown:80});}catch(e){}},lastImpactMs+50);}
  for(let i=0;i<count;i++){
    const stagger=baseDelay + i*4; // 미사일 사이 4프레임 (살짝 더 분명한 발사 텀)
    // 다양한 곡선 (사용자 요청) — 부채꼴 + 위/아래 교차 호 + 약간 랜덤 지터
    const spread=(i-(count-1)/2)*22;  // 직전 8 → 22 (3배 더 넓게 퍼짐)
    const _archDir=(i%2===0)?-1:1;     // 짝수 미사일은 위 호, 홀수는 아래 호 — 시각적 다양성
    const _archBase=70+i*10;            // 미사일마다 호 높이 다르게
    const _jx=(Math.random()-0.5)*16;   // 가로 지터 ±8
    const _jy=(Math.random()-0.5)*20;   // 세로 지터 ±10
    const midx=(a1.x+a2.x)/2 + spread + _jx;
    const midy=(a1.y+a2.y)/2 + _archDir*(_archBase+Math.abs(spread)*0.3) + _jy;
    const isLast=(i===count-1);
    _cbEffects.push({type:'muzzle',x:a1.x,y:a1.y,col:salvoCol,r:6*sizeMul,life:6,maxLife:6,delay:stagger});
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
  if(combatState.log.length>200)combatState.log.splice(0,combatState.log.length-200);
  const el=document.getElementById('cb-log');
  if(!el)return;
  // ── 팝업 카드 ─────────────────────────────────────────────
  //  · 우측 세로 컬럼에 새 항목이 위에서 등장 → 5초 후 페이드 → 자동 제거
  //  · column-reverse 컨테이너 + appendChild → 시각적으로 항상 상단 등장
  const card=document.createElement('div');
  const _bg=cls==='err'?'rgba(255,60,60,.18)':cls==='ok'?'rgba(80,200,120,.18)':cls==='gold'?'rgba(255,215,0,.18)':cls==='warn'?'rgba(255,165,0,.18)':'rgba(40,55,80,.85)';
  const _bd=cls==='err'?'#ff6b6b':cls==='ok'?'#51cf66':cls==='gold'?'#ffd43b':cls==='warn'?'#ffa726':'rgba(0,243,255,.35)';
  const _fg=cls==='err'?'#ffb3b3':cls==='ok'?'#a8e6b6':cls==='gold'?'#ffe082':cls==='warn'?'#ffcc80':'#dee2e6';
  card.style.cssText=`background:${_bg};border-left:2px solid ${_bd};color:${_fg};font-size:9px;line-height:1.4;padding:5px 7px;border-radius:4px;word-break:keep-all;backdrop-filter:blur(2px);box-shadow:0 2px 6px rgba(0,0,0,.4);opacity:0;transform:translateX(20px);transition:opacity .25s ease, transform .25s ease;pointer-events:auto;flex-shrink:0`;
  card.textContent=msg;
  el.appendChild(card);
  // slide-in
  requestAnimationFrame(()=>{card.style.opacity='1';card.style.transform='translateX(0)';});
  // DOM 노드 12개 캡 (가장 오래된 부터 제거)
  while(el.children.length>12){el.removeChild(el.firstChild);}
  // 5초 후 자동 페이드아웃 → 제거
  setTimeout(()=>{
    if(!card.parentNode)return;
    card.style.opacity='0';
    card.style.transform='translateX(20px)';
    setTimeout(()=>{if(card.parentNode)card.parentNode.removeChild(card);},300);
  },5000);
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
  const _INTERACT_EVENTS=['click','keydown','touchstart','pointerdown'];
  function _onInteract(){
    if(userInteracted)return;
    userInteracted=true;
    // 첫 상호작용 후 4개 리스너 즉시 해제 (장시간 플레이 시 document 리스너 누적 방지)
    _INTERACT_EVENTS.forEach(ev=>{
      try{document.removeEventListener(ev,_onInteract,{capture:true});}catch(e){}
    });
    if(pendingBgm){playBgm(pendingBgm);pendingBgm=null;}
    else if(curBgmAudio&&curBgmAudio.paused&&!bgmOff)curBgmAudio.play().catch(()=>{});
  }
  _INTERACT_EVENTS.forEach(ev=>{
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
  const _activeSfx=new Set();  // 재생 중 인스턴스 추적 (stopAllSfx 용)
  // ── SFX Audio 풀링 (메모리 누수 방지) ──────────────────────────────
  //   사용자 보고: 전투 도중 RAM 폭증 → Chrome 'Aw, Snap!' 크래시.
  //   원인: 매 playSfx 호출마다 new Audio() 생성 → mp3 디코드 파이프라인이
  //         GC보다 빨리 적재되어 렌더러 프로세스 OOM.
  //   대책: 8개짜리 인스턴스 풀을 미리 만들어 재사용 (LRU 라운드로빈).
  //         같은 src 재할당 시 Chrome은 디코드 결과를 캐시하여 추가 메모리 사용 0.
  const _MAX_SFX_POOL=6;  // 다운 재보고 (2026-06-06) 후 8→6
  const _sfxPool=new Array(_MAX_SFX_POOL).fill(null).map(()=>{const a=new Audio();a.preload='none';return a;});
  let _sfxIdx=0;
  function playSfx(name,opts){
    opts=opts||{};
    if(sfxOff||masterVol<=0||sfxVol<=0)return;
    if(!userInteracted)return;
    const cd=opts.cooldown||0;
    if(cd>0){const now=performance.now();if(sfxCooldown[name]&&now-sfxCooldown[name]<cd)return;sfxCooldown[name]=now;}
    try{
      const _sfxVer=(typeof window!=='undefined'&&window._GAME_VER)?window._GAME_VER:'';
      const a=_sfxPool[_sfxIdx];
      _sfxIdx=(_sfxIdx+1)%_MAX_SFX_POOL;
      try{a.pause();}catch(e){}
      a.src=SFX_BASE+name+'.mp3'+(_sfxVer?'?v='+encodeURIComponent(_sfxVer):'');
      a.currentTime=0;
      a.volume=Math.min(1,(opts.vol||1)*masterVol*sfxVol);
      _activeSfx.add(a);
      a.play().catch(()=>{_activeSfx.delete(a);});
    }catch(e){}
  }
  // 진행 중인 모든 SFX 즉시 정지 (전투 종료 / 엔딩 진입 시 호출)
  function stopAllSfx(){
    _activeSfx.forEach(a=>{try{a.pause();a.src='';}catch(e){}});
    _activeSfx.clear();
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
    playBgm,stopBgm,playSfx,stopAllSfx,setMaster,setBgmVol,setSfxVol,setBgmOff,setSfxOff,setMuted,
    get curBgm(){return curBgmName;},
    get master(){return masterVol;},get bgm(){return bgmVol;},get sfx(){return sfxVol;},
    get bgmOff(){return bgmOff;},get sfxOff(){return sfxOff;},
    get muted(){return bgmOff&&sfxOff;}
  };
})();

// 행성 BGM: P0X.mp3 가 있으면 해당 곡, 없으면 hub.mp3
function _planetBgmName(pid){
  // P17(TOI-700d, 치크스) 전용 BGM 파일이 누락 → 같은 치크스 팩션 행성 P18 BGM 으로 폴백
  //  (이전 'hub' 폴백은 치크스 분위기와 맞지 않아 변경 — 사용자 보고)
  if(pid==='P17')return 'P18';
  if(/^P\d+$/.test(pid||''))return pid;
  return 'hub';
}

// 사운드 알림 (전투 진입/긴급 알림)
function sfxAlert(){AudioMgr.playSfx('notify',{cooldown:300});}

// ══════════════════════════════════════════════════════════════════
// 획득 보고 팝업 — js/modules/report-popup.js 로 분할됨 (2026-06-08)
//   · 모듈에서 window.showAcquisitionReport 와 window.RARITY_COLOR 노출
//   · 여기서는 호환성용 로컬 별칭만 유지 (다른 함수가 RARITY_COLOR 직접 참조)
// ══════════════════════════════════════════════════════════════════
const RARITY_COLOR=window.RARITY_COLOR||{N:'#888',R:'var(--blue)',H:'var(--purple)',L:'var(--gold)',S:'#ff6ec7',legend:'var(--gold)',mythic:'#ff88ff',set:'#c080ff',hero:'var(--purple)'};
// 퀘스트 보상 수령
function sfxCoin(){AudioMgr.playSfx('coin');}

// ── 전투 프레임 렌더링 ────────────────────────────────────────────
// 전투 배경(그라데이션 + 80 별) 오프스크린 캐시 — 매 프레임 재생성 대신 1회 그리고 drawImage 만
//  · key: W×H×seed — 화면 크기/배틀 변경 시 자동 무효화
//  · 별 좌표가 seed 기반 결정론이라 시각적 동일 (사용자가 차이를 알 수 없음)
let _cbBgCache=null;
function _ensureCombatBg(W,H,seed){
  const key=W+'x'+H+'_'+seed;
  if(_cbBgCache&&_cbBgCache.key===key)return _cbBgCache.cv;
  const oc=document.createElement('canvas');oc.width=W;oc.height=H;
  const oct=oc.getContext('2d');
  const bg=oct.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,'#050a1a');bg.addColorStop(1,'#0a1428');
  oct.fillStyle=bg;oct.fillRect(0,0,W,H);
  for(let i=0;i<80;i++){
    const sx=((seed*i*137+i*31)%W);const sy=((seed*i*97+i*53)%H);
    const sr=((i%5)*0.3+0.2);const sa=(0.3+(i%7)*0.1);
    oct.globalAlpha=sa;oct.fillStyle='#ffffff';
    oct.beginPath();oct.arc(sx,sy,sr,0,Math.PI*2);oct.fill();
  }
  oct.globalAlpha=1;
  _cbBgCache={key,cv:oc};
  return oc;
}
function drawCombatFrame(){
  if(!cbCtx||!cbCV||!combatState)return;
  const W=cbCV.width,H=cbCV.height;
  const z=cbZoom,ox=cbOffX,oy=cbOffY;
  // 배경 — 캐시된 오프스크린 캔버스를 한 번에 drawImage
  const seed=combatState._rndSeed||1234;
  cbCtx.drawImage(_ensureCombatBg(W,H,seed),0,0);

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
    const nonBossSizes=units.map((u,i)=>({u,s:sizes[i]})).filter(({u})=>{const _nm=(u.nm||'').toLowerCase();return !(isEnemy&&(u.id==='BOSS_MAIN'||_nm.includes('우르사')||_nm.includes('ursa')));});
    const baseSizes=nonBossSizes.length?nonBossSizes.map(x=>x.s):sizes;
    const maxW=Math.max(...baseSizes.map(s=>s.w));
    const maxH=Math.max(...baseSizes.map(s=>s.h));
    const n=units.length;
    // ── 사용자 요청: 적 함대 진형 랜덤 변형 (구형/삼각형) — 아군 향한 화살표 방향 삼각형 ──
    //  · 전투당 1회 결정 (combatState._enemyFormation), 진형은 유지하되 위치만 lerp로 이동
    //  · circle: 원형 클러스터 (방어형)  /  triangle: 아군 방향 화살촉 (공격형)
    if(isEnemy&&!units.some(u=>typeof u._formationCol==='number')&&!units.some(u=>u._isBlackHoleFleet)){
      if(!combatState._enemyFormation){
        combatState._enemyFormation=Math.random()<0.5?'circle':'triangle';
      }
      const formation=combatState._enemyFormation;
      const cellW=maxW*1.5, cellH=maxH*1.55;
      // 적 함대 중심점 — 화면 우측 60% 부근
      const cxA=W*0.30, cyA=0;
      const out=new Array(n);
      if(formation==='circle'){
        // 구형 — 동심원 클러스터 (반경 = sqrt(n)*cellH 기준, 균등 각도 분배)
        const R0=Math.max(cellH*1.5,Math.sqrt(n)*cellH*0.9);
        units.forEach((u,i)=>{
          if(n===1){out[i]={x:cxA,y:cyA};return;}
          const ang=(i+0.5)*(Math.PI*2/n)-Math.PI*0.5;
          // 내·외 2층 분포: 짝수 인덱스 외층, 홀수 내층
          const r=(i%2===0)?R0:R0*0.55;
          out[i]={x:cxA+r*Math.cos(ang)*0.7,y:cyA+r*Math.sin(ang)};
          u._frontRank=Math.floor(i/Math.max(1,n/3));  // 앞·중·뒤 그룹
        });
      } else {
        // 삼각형 — 아군 향한 화살촉(◀): 정점이 좌측(-X), 후방이 우측
        //   행 r 마다 (r+1)대씩 → 1, 2, 3, 4… 늘어남
        //   r=0(정점/선봉)이 -X로 가장 멀리, r 커질수록 +X 후방
        let rowI=0,remaining=n,rowsList=[];
        while(remaining>0){rowI++;const take=Math.min(rowI,remaining);rowsList.push(take);remaining-=take;}
        let idx=0;
        rowsList.forEach((cnt,r)=>{
          const colH=(cnt-1)*cellH;
          for(let c=0;c<cnt;c++){
            out[idx]={x:cxA-cellW*1.2+r*cellW*0.9,y:c*cellH-colH/2};
            units[idx]._frontRank=r;  // r=0이 가장 앞(선봉)
            idx++;
          }
        });
      }
      return out;
    }
    // ── 우르사 최종전 진형: _formationCol(0~3)로 열 고정 (소형/중형/친위대/보스) ──
    if(isEnemy&&units.some(u=>typeof u._formationCol==='number')){
      const COLS=4;
      const byCol=[[],[],[],[]];
      units.forEach((u,i)=>{const c=Math.max(0,Math.min(3,u._formationCol||0));byCol[c].push(i);});
      const cw=maxW*1.5, ch=maxH*1.55;
      const xA=W*0.18;
      const out=new Array(n);
      for(let c=0;c<COLS;c++){
        const arr=byCol[c];
        const colH=(arr.length-1)*ch;
        arr.forEach((ui,ri)=>{
          units[ui]._frontRank=c;       // 앞열(소형 c=0)일수록 우선 타겟 / 보스(c=3)는 최후
          units[ui]._fleetCols=COLS;
          out[ui]={x:xA + c*cw, y:ri*ch - colH/2};
        });
      }
      return out;
    }
    function _seedRng(seed){let s=seed>>>0||1;return()=>{s=(s*1664525+1013904223)>>>0;return s/0x100000000;};}
    function _tankiness(u){
      return (+u.maxHP||+u.hp||1)+(+u.DEF||0)*8+(+u.maxSH||0)*0.6+(+u.armorTier||0)*30+(+u.shieldTier||0)*15;
    }
    // 사용자 매뉴얼 편성: 4×4 그리드 사용
    const manual=!isEnemy?(G&&G.fleetFormation):null;
    const hasManual=manual&&typeof manual==='object'&&Object.keys(manual).length>0;
    // 블랙홀 미러 함대(5척 신화) — 1열 5행으로 좁게 보이지 않도록 가로 펼침 모드
    const _isWideFleet=isEnemy&&units.some(u=>u&&u._isBlackHoleFleet);
    let cols,rows;
    if(hasManual){cols=4;rows=4;}
    else if(_isWideFleet){
      // 가로 펼침: 최대 4열, 행은 필요한 만큼 (5척 → 4열 2행)
      cols=Math.max(1,Math.min(4,n));
      rows=Math.ceil(n/cols);
    }
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
      // 가로 펼침 모드: 블랙팔콘 신화기함도 포함
      if(isEnemy){
        const bossIdx=units.findIndex(u=>{const _nm=(u.nm||'').toLowerCase();return u.id==='BOSS_MAIN'||_nm.includes('우르사')||_nm.includes('ursa')||(u.voidBoss&&(_nm.includes('기함')||_nm.includes('flagship')))||u.id==='VOID_FALCON_1'||(u._isBlackHoleFleet&&(u.catalogId==='BLACKFALCON'||_nm.includes('블랙팔콘')||_nm.includes('black falcon')||_nm.includes('blackfalcon')));});
        if(bossIdx>=0){
          // row-first(가로 펼침): 뒤쪽(row=rows-1) 중앙 cols 위치
          // col-first(기본): 마지막 컬럼 중앙
          const bossSlot=_isWideFleet
            ? Math.min(n-1,(rows-1)*cols+Math.floor((cols-1)/2))
            : (cols-1)*rows+Math.floor((rows-1)/2);
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
      // 가로 펼침 모드는 row-first 매핑: slotCol=slot%cols, slotRow=floor(slot/cols)
      const slotCol=_isWideFleet?(slot%cols):Math.floor(slot/rows);
      const slotRow=_isWideFleet?Math.floor(slot/cols):(slot%rows);
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
  //   ── 사용자 요청 10배 빠르게 ──
  //   · 학익진 활성: T=0.00016 (0.000016→0.00016)
  //   · 일반 위치 변경: T=0.0008 (0.00008→0.0008)
  const _hjOn=!!(combatState._haikjinFormation);
  // 사용자 요청 (2026-06-06): 진형 이동 중 함선이 완벽 겹침 방지 — 최대 70% 겹침까지만 허용.
  //   각 함선 페어에 대해 중심간 거리 < (각 함선 폭+높이 평균) × 0.3 이면 둘을 외측으로 살짝 밀어냄.
  //   여러 패스를 실행해 다중 충돌도 점진적으로 해소.
  // ※ 매 프레임 60fps × 20척 객체 생성 부담 줄이기 위해 모듈 스코프 풀(_resolvedPool)을 재사용.
  if(!window._resolvedPool)window._resolvedPool=[];
  const _resolved=window._resolvedPool;
  _resolved.length=0;  // 비우되 배열 자체는 보존 → GC 압박 감소
  function _resolveOverlap(){
    for(let _it=0;_it<3;_it++){
      let moved=false;
      for(let a=0;a<_resolved.length;a++){
        for(let b=a+1;b<_resolved.length;b++){
          const A=_resolved[a],B=_resolved[b];
          // 자기 자신 또는 같은 객체 스킵
          const minDx=(A.w+B.w)*0.5*0.30;  // 최소 X 간격 (70% 겹침 허용)
          const minDy=(A.h+B.h)*0.5*0.30;
          const dx=B.x-A.x, dy=B.y-A.y;
          const adx=Math.abs(dx), ady=Math.abs(dy);
          if(adx<minDx && ady<minDy){
            // 더 작은 축 방향으로 밀어내기 (간섭이 적은 방향)
            const pushX=(minDx-adx)*0.5*Math.sign(dx||0.5);
            const pushY=(minDy-ady)*0.5*Math.sign(dy||0.5);
            if(Math.abs(pushX)<Math.abs(pushY)){
              A.x-=pushX; B.x+=pushX;
            } else {
              A.y-=pushY; B.y+=pushY;
            }
            moved=true;
          }
        }
      }
      if(!moved)break;
    }
  }
  pl.forEach((u,i)=>{
    let{x,y}=pPos[i];
    // 위치 lerp 보간 (학익진/일반 무관 모두 부드러운 이동)
    if(u._curX==null){u._curX=x;u._curY=y;}
    if(_hjOn&&u._haikjinTargetX!=null){
      // 사용자 요청 (2026-06-06): 학익진 이동 속도 +50% (0.00016 → 0.00024)
      const T=0.00024;
      u._curX+=(u._haikjinTargetX-u._curX)*T;
      u._curY+=(u._haikjinTargetY-u._curY)*T;
    } else {
      const T=0.0008;  // 일반 이동 — 사용자 요청 10배 빠르게 (0.00008→0.0008)
      u._curX+=(x-u._curX)*T;
      u._curY+=(y-u._curY)*T;
    }
    const sz=_shipDrawSize(u);
    _resolved.push({u,x:u._curX,y:u._curY,w:sz.w*2,h:sz.h*2,isEnemy:false,sz});
  });
  // 적 함선 — 사용자 요청: 동일 10배 빠르게 (회전은 _drawShipUnit에서 처리)
  //   · 적도 아군 향해 회전 — _drawShipUnit이 isEnemy 분기로 가장 가까운 아군 좌표를 타겟으로 atan2 사용
  en.forEach((u,i)=>{
    let{x,y}=ePos[i];
    if(u._curX==null){u._curX=x;u._curY=y;}
    const T=0.0008;  // 0.00008→0.0008
    u._curX+=(x-u._curX)*T;
    u._curY+=(y-u._curY)*T;
    const sz=_enemySize(u);
    _resolved.push({u,x:u._curX,y:u._curY,w:sz.w*2,h:sz.h*2,isEnemy:true,sz});
  });
  // 충돌 해소 — 70% 겹침 한계 강제
  _resolveOverlap();
  // 해소된 위치를 함선에 반영(_curX/_curY로 다음 프레임에도 기억) + 렌더
  _resolved.forEach((r,_idx)=>{
    r.u._curX=r.x; r.u._curY=r.y;
    _unitPos[r.u.id||((r.isEnemy?'E':'P')+_idx)]={x:r.x,y:r.y};
    _drawShipUnit(cbCtx,r.u,r.x,r.y,null);
    _drawHealthBar(cbCtx,r.u,r.x,r.y,r.sz,r.isEnemy);
  });
  // 이펙트 렌더링
  // 타입: beam(레이저 빔) / exp(폭발) / shockwave(충격파 링) / shard(파편)
  //        muzzle(발사 섬광) / missile(곡선 궤적 미사일) / shieldHit(헥사 임팩트)
  // ★ 미사일→폭발 변환 시 filter 콜백 내부에서 새 이펙트가 발생 — _newEffs로 수집해 손실 방지
  const _newEffs=[];
  // ★ 이펙트 다수일 때 shadowBlur 자동 비활성화 — Canvas GPU 가속 무력화 방지
  //   사용자 보고 (2026-06-06): 전투 진행 중 느려지는 현상 — heavyMode 임계 100으로 하향
  //   shadowBlur 가 가장 큰 성능 hog 임. 100 이상이면 즉시 shadowBlur OFF로 fps 보호.
  const _heavyMode=(_cbEffects||[]).length>100;
  if(_heavyMode){
    try{Object.defineProperty(cbCtx,'shadowBlur',{value:0,writable:true,configurable:true});}catch(e){}
  }
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
        // 타겟 도달 — 폭발 트리거 (크기 배율 적용). _newEffs로 수집 (filter 중 push 손실 방지)
        const ec=ef.isDead?'#ff3300':(ef.wasShielded?'#ffaa66':'#ff7755');
        const er=(ef.isDead?26:(ef.wasShielded?12:18))*_msz;
        _newEffs.push({type:'exp',x:ef.x2,y:ef.y2,col:ec,r:er,life:ef.isDead?36:22,maxLife:ef.isDead?36:22});
        if(ef.wasShielded){
          _newEffs.push({type:'shieldHit',x:ef.x2,y:ef.y2,col:'#66ddff',r:22,life:14,maxLife:14});
        }
        if(ef.isLastInSalvo&&ef.isDead){
          _newEffs.push({type:'shockwave',x:ef.x2,y:ef.y2,col:'#ffaa44',r:50,life:30,maxLife:30});
          _newEffs.push({type:'exp',x:ef.x2,y:ef.y2,col:'#ffffff',r:14,life:14,maxLife:14});
          for(let i=0;i<10;i++){
            const ang=(Math.PI*2*i)/10+Math.random()*0.3;
            _newEffs.push({type:'shard',x:ef.x2,y:ef.y2,vx:Math.cos(ang)*3.8,vy:Math.sin(ang)*3.8,col:'#ffcc66',life:42,maxLife:42});
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
    } else if(ef.type==='dmgText'){
      // 데미지 텍스트 — 사용자 요청 (2026-06-06 갱신):
      //   · 폰트 크기 ×2: 16 → 32px
      //   · 투명도 피크 90% (가독성 강화 — 종전 50%)
      //   · alpha 곡선: 0 → 0.9 → 0 (sin(t·π)) — 등장→피크→소멸
      //   · y 위치: 베이스에서 24px 위로 천천히 부유
      const rise=24*t;
      const alpha=0.9*Math.sin(t*Math.PI);
      if(alpha>0.001){
        cbCtx.globalAlpha=Math.min(0.9,Math.max(0,alpha));
        cbCtx.font='bold 32px "Courier New", monospace';
        cbCtx.textAlign='center';
        cbCtx.textBaseline='bottom';
        cbCtx.shadowColor='rgba(0,0,0,.9)';
        cbCtx.shadowBlur=6;
        cbCtx.fillStyle=ef.col||'#ff3333';
        cbCtx.fillText(ef.txt||'', ef.x, ef.y - rise);
      }
    } else if(ef.type==='shieldHit'){
      // 쉴드 피격 — 헥사곤 임팩트 + 짧은 광점
      // 사용자 요청: 전체 쉴드 투명도 ×0.8 (20% 감소)
      const radius=ef.r*(0.9+t*0.4);
      cbCtx.globalAlpha=Math.min(1,a*0.95*0.8);
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
  // 미사일→폭발 등 filter 콜백 내부에서 발생한 신규 이펙트 합치기
  if(_newEffs.length)_cbEffects.push(..._newEffs);
  // 사용자 보고 (2026-06-06): 전투가 길어지면 미사일·레이저가 사라지는 현상.
  //   종전: _cbEffects.splice(0, ...) → 가장 오래된 effect 무차별 컷
  //   문제: missile(life:60), beam(life:18) 같이 "시각적으로 진행 중"인 effect가
  //         muzzle(life:8), shieldHit(life:16) 같은 짧은 effect와 함께 큐 앞쪽에 있으면
  //         같이 컷되어 발사체가 사라지는 시각적 버그 발생.
  //   수정: 상한 120 → 200 으로 증가 + 컷 대상을 "짧은 effect 우선"으로 스마트 선택.
  //         lifeRatio (life/maxLife) > 0.66 (수명 1/3 이내 발사체)는 보호.
  const _EF_CAP=200;
  if(_cbEffects.length>_EF_CAP){
    const _excess=_cbEffects.length-_EF_CAP;
    // 후보 인덱스: 보호 대상이 아닌 effect (수명 2/3 이상 지나거나 짧은 muzzle/shieldHit 류)
    const _victims=[];
    for(let _i=0;_i<_cbEffects.length&&_victims.length<_excess;_i++){
      const _ef=_cbEffects[_i]; if(!_ef)continue;
      const _r=(_ef.life||0)/(_ef.maxLife||1);
      const _isProjectile=_ef.type==='missile'||_ef.type==='beam'||_ef.type==='lightning';
      // 보호: 발사체 + 수명 1/3 이내 (도달 전) — 미사일이 화면 가운데 사라지지 않게
      if(_isProjectile&&_r>0.66)continue;
      _victims.push(_i);
    }
    // 뒤에서부터 splice → 인덱스 안정
    for(let _i=_victims.length-1;_i>=0;_i--)_cbEffects.splice(_victims[_i],1);
    // 그래도 초과 시 (모두 발사체 보호 중) — 가장 오래된 발사체부터 컷
    if(_cbEffects.length>_EF_CAP){_cbEffects.splice(0,_cbEffects.length-_EF_CAP);}
  }
  // heavyMode shadowBlur 오버라이드 해제 — prototype의 shadowBlur 다시 사용
  if(_heavyMode){try{delete cbCtx.shadowBlur;}catch(e){}}
  cbCtx.restore();
  // TURN 표시
  const tEl=document.getElementById('cb-turn');
  if(tEl)tEl.textContent='TURN '+(combatState.turn||0);
}

function _drawHealthBar(ctx,u,x,y,sz,isEnemy){
  const bw=sz.bar||60,bh=6,by=y-sz.h-16;
  const bx=x-bw/2;
  // 보이드의 창 충전 게이지 (아군 + MMV01 장착함 한정)
  if(!isEnemy && u.parts && u.parts.includes('MMV01')){
    const _r=u._voidSpearReadyAt||0;
    const _now=Date.now();
    const _total=u._voidSpearTotal||10000;
    // 잔여 시간 → 진행률
    const _rem=Math.max(0,(_r-_now));
    const _prog=Math.max(0,Math.min(1,1-(_rem/_total)));
    const gby=by-10;
    ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(bx,gby,bw,4);
    // 그라데이션 보라/핑크 + 충전 완료 시 깜빡임
    const _ready=_rem<=0;
    const _flash=_ready?(0.5+0.5*Math.sin(_now*0.012)):1;
    ctx.fillStyle=_ready?`rgba(255,${Math.round(80+100*_flash)},255,1)`:'#cc66ff';
    ctx.fillRect(bx,gby,bw*_prog,4);
    ctx.strokeStyle='rgba(204,102,255,.7)';ctx.lineWidth=0.5;ctx.strokeRect(bx,gby,bw,4);
    if(_ready){
      ctx.fillStyle='#ff88ff';ctx.font='bold 9px sans-serif';ctx.textAlign='center';
      ctx.fillText(I18N.t('cb.voidSpearReady'),x,gby-2);
    }
  }
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
  ctx.fillText(((typeof shipDisplayNm==='function'?shipDisplayNm(u):u.nm)||'').substring(0,10),x,by-3);
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
  if(plEl)plEl.innerHTML=I18N.t('ui.allyFleetLine',{alive:pa.alive,total:pa.total,att:fmt(pa.att),hp:fmt(pa.hp),maxhp:fmt(pa.maxHp),sh:fmt(pa.sh),maxsh:fmt(pa.maxSh),def:fmt(pa.def)});
  if(enEl)enEl.innerHTML=I18N.t('ui.enemyFleetLine',{alive:ea.alive,total:ea.total,att:fmt(ea.att),hp:fmt(ea.hp),maxhp:fmt(ea.maxHp),sh:fmt(ea.sh),maxsh:fmt(ea.maxSh),def:fmt(ea.def)});
}

// ── 전투 1턴 처리 ─────────────────────────────────────────────────
function _txPos(pos){
  // _unitPos 가 이미 로컬 좌표(ctx.scale 적용 전)로 저장되므로 그대로 사용
  return{x:pos.x, y:pos.y};
}
function runCombatTurn(){
  if(!combatState||combatState.done){drawCombatFrame();return;}
  // ── 재진입 가드 — 페이즈 팝업 콜백 + setTimeout 체인이 중첩되는 경우 차단 ──
  // 동일 턴 중복 실행 시 적/아군 상태가 두 번 변동되어 시각 스터터·계산 오류 유발
  if(combatState._turnInProgress)return;
  combatState._turnInProgress=true;
  // 적 함대 ~50% 일반 함선 혼합 (보스/히든전 제외, 전투당 1회 — 첫 렌더 전에 처리)
  if(!combatState._mixed){
    combatState._mixed=true;
    if(!combatState.isBoss&&!combatState.isVoidBoss&&typeof _mixInNormalShips==='function'){
      try{_mixInNormalShips(combatState.enemies);}catch(e){console.warn('[mix]',e.message);}
    }
  }
  // 장기 전투 보너스용 타이머 — 첫 턴 시 시각 캡처 (모든 전투 시작점을 통일하기 위해 여기서 단일 처리)
  if(!combatState._combatStartedAt)combatState._combatStartedAt=Date.now();
  // _unitPos 사전 채우기: 이펙트 좌표 참조 전 반드시 호출
  drawCombatFrame();
  combatState.turn++;
  const pl=combatState.players.filter(u=>u.hp>0);
  const en=combatState.enemies.filter(u=>u.hp>0);
  if(!pl.length||!en.length){combatState._turnInProgress=false;_finishCombat();return;}

  // ── 우르사 최종전: 호위(치크스·친위대) 전멸 → 2페이즈 전환 ──
  //   보스 무적 해제 + 대사 팝업 + 본체 공격력 ×3
  if(combatState.isBoss && !combatState._ursaPhase2){
    const _boss=combatState.enemies.find(e=>e._ursaBoss||e.id==='BOSS_MAIN');
    const _escAlive=combatState.enemies.some(e=>e!==_boss && (e.hp||0)>0);
    if(_boss && (_boss.hp||0)>0 && !_escAlive){
      combatState._ursaPhase2=true;
      _boss._invincible=false;
      _boss.phase=Math.max(2,_boss.phase||1);
      if(_boss._origATT_p1==null)_boss._origATT_p1=_boss.ATT;
      _boss.ATT=Math.round((_boss.ATT||1)*3);   // 2페이즈 공격력 ×3
      addCombatLog(I18N.t('combat.ursaPhase2'),'err');
      drawCombatFrame();
      if(typeof _showUrsaPhase2Popup==='function'){
        // 팝업 콜백에서 runCombatTurn 재호출 — 현재 호출 종료로 가드 해제 필요
        combatState._turnInProgress=false;
        _showUrsaPhase2Popup(()=>{try{runCombatTurn();}catch(e){}});
        return;  // 팝업 확인 후 전투 재개
      }
    }
  }

  // ── 블랙팔콘 히든전: 호위(보이드 함대+부대) 전멸 → 본체 무적 해제 + 파장 + 대사 ──
  if(combatState.isVoidBoss && !combatState._voidPhase2){
    const _vb=combatState.enemies.find(e=>e.voidBoss)||combatState.enemies[0];
    const _escAlive=combatState.enemies.some(e=>e!==_vb&&(e.hp||0)>0);
    if(_vb&&(_vb.hp||0)>0&&!_escAlive){
      combatState._voidPhase2=true;
      _vb._invincible=false;
      addCombatLog(I18N.t('combat.blackfalconPhase2'),'err');
      // 파장(shockwave) 이펙트 — 본체 위치에서 다중 충격파
      try{const bp=_unitPos[_vb.id];if(bp&&typeof _txPos==='function'){const t=_txPos(bp);for(let k=0;k<4;k++)_cbEffects.push({type:'shockwave',x:t.x,y:t.y,col:'#cc66ff',r:180+k*90,life:70,maxLife:70,delay:k*7});}}catch(e){}
      try{_cbStartAnimLoop&&_cbStartAnimLoop();}catch(e){}
      drawCombatFrame();
      if(typeof _showBlackfalconPhase2Popup==='function'){
        combatState._turnInProgress=false;
        _showBlackfalconPhase2Popup(()=>{try{runCombatTurn();}catch(e){}});
        return;
      }
    }
  }

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
    if(!ship||!ship.parts)return {missile:0,laser:0,missileBestRarity:''};
    let missile=0,laser=0,missileBestRarity='';
    const _rarityRank={'mythic':3,'set':2,'legend':2};  // set=legend 동급 취급
    let _bestR=0;
    ship.parts.forEach(pid=>{
      const p=partById(pid);
      if(!p||p.cat!=='weapon')return;
      if(p.wtype==='missile'){
        missile++;
        const r=_rarityRank[p.rarity]||0;
        if(r>_bestR){_bestR=r;missileBestRarity=p.rarity;}
      }
      else laser++;
    });
    return {missile,laser,missileBestRarity};
  };

  // ─── 사격 속도(TEC) — 높은 함선이 먼저 발사 ────────────────
  //   렐러티비티(LGD03) 효과: 항상 최우선 턴 오더 — TEC 와 무관하게 맨 앞 (사용자 명세)
  const _isRelativ=(u)=>{const c=String(u.catalogId||u.catId||u.id||'').replace(/(?:_\d+|_main)$/,'').toUpperCase();return c==='LGD03';};
  pl.sort((a,b)=>{
    const aR=_isRelativ(a)?1:0, bR=_isRelativ(b)?1:0;
    if(aR!==bR)return bR-aR; // 렐러티비티 우선
    return (b.TEC||0)-(a.TEC||0);
  });
  en.sort((a,b)=>(b.TEC||0)-(a.TEC||0));
  // ─── 워덴클리프(LGD02) 효과: 매 턴 적 함선 1척 무기 슬롯 비활성화 (이번 턴 ATT ×0.5)
  //   해당 적의 _wardClyffeDebuffTurn 으로 1턴만 작동, 다음 턴 자동 복구
  {
    const _hasWarden=pl.some(p=>String(p.catalogId||p.catId||p.id||'').replace(/(?:_\d+|_main)$/,'').toUpperCase()==='LGD02');
    // 이전 턴 디버프 자동 복구
    en.forEach(e=>{if(e._wardClyffeDebuffTurn!=null&&e._wardClyffeDebuffTurn<combatState.turn&&e._origATT_LGD2!=null){e.ATT=e._origATT_LGD2;delete e._origATT_LGD2;delete e._wardClyffeDebuffTurn;}});
    if(_hasWarden){
      const _eligible=en.filter(e=>e.hp>0&&!e._wardClyffeDebuffTurn);
      if(_eligible.length>0){
        const _tgt=_eligible[Math.floor(Math.random()*_eligible.length)];
        _tgt._origATT_LGD2=_tgt.ATT;
        _tgt.ATT=Math.max(1,Math.round((_tgt.ATT||1)*0.5));
        _tgt._wardClyffeDebuffTurn=combatState.turn;
        addCombatLog(I18N.t('combat.wardenclyffe',{nm:shipDisplayNm(_tgt)||I18N.t('combat.enemyLabel')}),'gold');
      }
    }
  }
  // ─── 선제공격(이니셔티브) — turn 1, 함대 합산 TEC 비교 ─────
  //   우위 측 (상대의 1.2배 이상) 은 이번 턴 ATT +20% 보너스
  if(combatState.turn===1 && !combatState._initChecked){
    combatState._initChecked=true;
    const _plTec=pl.reduce((s,u)=>s+(u.TEC||0),0);
    const _enTec=en.reduce((s,u)=>s+(u.TEC||0),0);
    if(_plTec >= _enTec*1.2 && _plTec>0){
      pl.forEach(p=>{if(!p._origATT)p._origATT=p.ATT; p.ATT=Math.round(p.ATT*1.2);});
      addCombatLog(I18N.t('combat.firstStrikeAlly',{pl:_plTec,en:_enTec}),'gold');
    } else if(_enTec >= _plTec*1.2 && _enTec>0){
      en.forEach(e=>{e.ATT=Math.round((e.ATT||1)*1.2);});
      addCombatLog(I18N.t('combat.firstStrikeEnemy',{en:_enTec,pl:_plTec}),'err');
    }
  }
  // ── 일점사(집중사격) 타겟 승계 — 이전 타겟 격침 시 다음 가장 앞쪽 적으로 자동 전환 ──
  // 사용자 명세(2026-06-03): 일점사 발동 후 전 함선은 같은 적 1척에 집중사격, 격침되면 다음 앞열로 승계
  if(combatState._focusTargetId){
    const _cur=combatState.enemies.find(e=>e.id===combatState._focusTargetId);
    if(!_cur||(_cur.hp||0)<=0){
      // 다음 후보: 살아있고 무적/보스 제외, 가장 앞열
      const _next=combatState.enemies.filter(e=>(e.hp||0)>0&&!e._invincible)
        .sort((a,b)=>{
          const ar=(typeof a._frontRank==='number')?a._frontRank:99;
          const br=(typeof b._frontRank==='number')?b._frontRank:99;
          return ar-br;
        })[0];
      combatState._focusTargetId=_next?_next.id:null;
      if(_next)addCombatLog(I18N.t('combat.focusTargetSwitch',{nm:shipDisplayNm(_next)}),'gold');
    }
  }

  // 플레이어 공격
  pl.forEach(p=>{
    let aliveEn=en.filter(e=>e.hp>0);
    if(!aliveEn.length)return;
    if(combatState.isVoidBoss){
      const nonBoss=aliveEn.filter(e=>!e.voidBoss);
      if(nonBoss.length>0)aliveEn=nonBoss;
    }
    // 우르사 최종전: 호위(치크스·친위대) 전멸 전까지 보스 무적 — 타겟에서 제외(=최후 공격)
    if(combatState.isBoss){
      const nonBoss=aliveEn.filter(e=>!(e._ursaBoss||e._invincible||e.id==='BOSS_MAIN'));
      if(nonBoss.length>0)aliveEn=nonBoss;
    }
    // ── 일점사 집중사격: focusTarget이 살아있고 후보군에 포함되면 그 1척만 타겟 ──
    if(combatState._focusTargetId){
      const _ft=aliveEn.find(e=>e.id===combatState._focusTargetId);
      if(_ft)aliveEn=[_ft];
    }
    // ─── 보이드의 창 (MMV01) — 첫 발사 10초, 이후 30초 쿨다운 + 발사 직전 1초 파티클 충전 (사용자 명세) ───
    if(p.parts&&p.parts.includes('MMV01')){
      const _now=Date.now();
      if(!p._voidSpearReadyAt){p._voidSpearReadyAt=_now+10000;p._voidSpearTotal=10000;}  // 첫 충전 10초
      let _shouldFireSpear=false;
      if(_now>=p._voidSpearReadyAt){
        if(!p._voidSpearCharging){
          // 충전 시작 — 1초간 파티클 수렴 이펙트 (외곽 → 함선 중심)
          p._voidSpearCharging=true;
          p._voidSpearChargeFireAt=_now+1000;
          const _ap=_unitPos[p.id];
          if(_ap){
            const _a1=_txPos(_ap);
            // 외곽 → 중심으로 수렴하는 파티클 60개 (60프레임에 분산)
            for(let _i=0;_i<60;_i++){
              const _ang=Math.random()*Math.PI*2;
              const _r=70+Math.random()*40;
              const _sx=_a1.x+Math.cos(_ang)*_r, _sy=_a1.y+Math.sin(_ang)*_r;
              const _spd=2.0+Math.random()*1.5;
              const _col=(_i%3===0)?'#ff3322':(_i%3===1)?'#ff8844':'#ffcc66';
              _cbEffects.push({type:'shard',x:_sx,y:_sy,vx:-Math.cos(_ang)*_spd,vy:-Math.sin(_ang)*_spd,col:_col,life:35+Math.random()*10,maxLife:45,delay:Math.floor(_i*0.8)});
            }
            // 중심부 펄스 — 보이드 코어 발광 (점차 커지는 링 6개)
            for(let _i=0;_i<6;_i++){
              _cbEffects.push({type:'exp',x:_a1.x,y:_a1.y,col:'#ff2200',r:24+_i*6,life:38,maxLife:38,delay:_i*9});
            }
            try{_cbStartAnimLoop();}catch(_e){}
            try{AudioMgr.playSfx('gacha_pull',{vol:0.4});}catch(e){}
            addCombatLog(I18N.t('combat.voidSpearCharging',{nm:shipDisplayNm(p)||I18N.t('combat.allyLabel')}),'gold');
          }
        } else if(_now>=p._voidSpearChargeFireAt){
          // 충전 완료 — 발사
          p._voidSpearCharging=false;
          p._voidSpearChargeFireAt=0;
          _shouldFireSpear=true;
        }
        // else: 충전 진행 중 — 이번 틱은 발사 보류
      }
      if(_shouldFireSpear){
        // 밸런스 — HP 가 가장 낮은 적부터 격추 (사용자 명세)
        const tgt=[...aliveEn].sort((a,b)=>(a.hp||0)-(b.hp||0))[0];
        if(tgt){
          const ap=_unitPos[p.id], ep=_unitPos[tgt.id];
          // 데미지: 무조건 즉사 (DEF·SHD 완전 관통)
          tgt.sh=0; tgt.hp=0;
          const gs=G.fleet.find(s=>s.id===p.id);  // (참조용 — 데미지는 enemy 상태에만)
          log.push(`💥 ${shipDisplayNm(p)||I18N.t('ui.allyShort')} ▶ ${I18N.t('combat.voidSpearLaunch')} ${shipDisplayNm(tgt)||I18N.t('ui.enemyShort')} ${I18N.t('combat.instantKill')} ✦`);
          addCombatLog(I18N.t('combat.voidSpearFired',{nm:shipDisplayNm(p)||I18N.t('combat.allyLabel'),tgt:shipDisplayNm(tgt)||I18N.t('combat.enemyLabel')}),'gold');
          if(ap&&ep){
            const a1=_txPos(ap), a2=_txPos(ep);
            // 충전 글로우 (붉은색)
            for(let i=0;i<6;i++){
              _cbEffects.push({type:'exp',x:a1.x,y:a1.y,col:'#ff3322',r:14+i*3,life:30,maxLife:30,delay:_fireDelay+i});
            }
            _cbEffects.push({type:'muzzle',x:a1.x,y:a1.y,col:'#ff2200',r:38,life:22,maxLife:22,delay:_fireDelay+6});
            // ── 붉은색 전기 광선 3개 (수직 오프셋 + 시간차) ──
            const _ang=Math.atan2(a2.y-a1.y,a2.x-a1.x)+Math.PI/2;
            const _px=Math.cos(_ang), _py=Math.sin(_ang);
            for(let b=0;b<3;b++){
              const _off=(b-1)*16;            // -16 / 0 / +16
              const ex=a2.x+_px*_off, ey=a2.y+_py*_off;
              _cbEffects.push({type:'lightning',x1:a1.x,y1:a1.y,x2:ex,y2:ey,col:'#ff2a2a',life:38,maxLife:38,delay:_fireDelay+8+b*3,thickMul:3.4,seed:Math.random()*9999});
              _cbEffects.push({type:'lightning',x1:a1.x,y1:a1.y,x2:ex,y2:ey,col:'#ffd0d0',life:38,maxLife:38,delay:_fireDelay+10+b*3,thickMul:1.7,seed:Math.random()*9999});
            }
            // ── 피격: 파티클(shard) 발산 + 거대 폭발 + 충격파 → 함선 소멸 ──
            for(let s=0;s<28;s++){
              const _a=Math.random()*Math.PI*2, _spd=3+Math.random()*8;
              _cbEffects.push({type:'shard',x:a2.x,y:a2.y,vx:Math.cos(_a)*_spd,vy:Math.sin(_a)*_spd,col:(s%2?'#ff4422':'#ffcc33'),life:42+Math.random()*30,maxLife:72,delay:_fireDelay+16});
            }
            _cbEffects.push({type:'shockwave',x:a2.x,y:a2.y,col:'#ff3322',r:170,life:58,maxLife:58,delay:_fireDelay+16});
            _cbEffects.push({type:'exp',x:a2.x,y:a2.y,col:'#ff2200',r:140,life:66,maxLife:66,delay:_fireDelay+18});
            _cbEffects.push({type:'exp',x:a2.x,y:a2.y,col:'#ffaa00',r:95,life:50,maxLife:50,delay:_fireDelay+20});
            _cbEffects.push({type:'exp',x:a2.x,y:a2.y,col:'#ffffff',r:58,life:36,maxLife:36,delay:_fireDelay+22});
            try{_cbStartAnimLoop();}catch(_e){}
            _fireDelay+=30;
          }
          try{AudioMgr.playSfx('gacha_pull',{vol:1.0});}catch(e){}
          setTimeout(()=>{try{AudioMgr.playSfx('explosion',{vol:0.9});}catch(e){}},200);
          // 쿨다운 재시작 (이후 발사는 30초 고정)
          p._voidSpearReadyAt=_now+30000;
          p._voidSpearTotal=30000;
          // 적군이 비었으면 추가 공격 스킵
          aliveEn=en.filter(e=>e.hp>0);
          if(!aliveEn.length)return;
        }
      }
    }
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
    log.push(`${usesMissile?'🚀':'⚡'} ${shipDisplayNm(p)||I18N.t('ui.allyShort')} → ${shipDisplayNm(target)||I18N.t('ui.enemyShort')}: ${I18N.t('ui.combatLogDmg',{shDmg,hpDmg})}`+(isDead?' '+I18N.t('ui.killedSuffix'):'')+_healLog);
    const ap=_unitPos[p.id||('P'+0)], ep=_unitPos[target.id];
    if(ap&&ep){
      const a1=_txPos(ap), a2=_txPos(ep);
      // 흡혈 회복 시 발사 함선 위로 파란 +N 표시 (사용자 요청 2026-06-06)
      if(_healHP+_healSH>0) _cbAddHealText(a1, _healHP+_healSH, _fireDelay+5);
      if(usesMissile){
        // 사용자 명세: 기본 1발, 전설(set/legend)·신화(mythic) 미사일 장착 시 최대 4발
        const _bestR=_wc.missileBestRarity;
        const _isHighRarity=(_bestR==='mythic'||_bestR==='set'||_bestR==='legend');
        const mcnt=_isHighRarity?Math.min(4,Math.max(2,_mcnt)):1;
        // 전술 단계마다 미사일 크기 ×1.1 누적 + 시간차공격부터 주황→붉은색으로 색 변화
        let _mSize=1, _mCol='#ffcc66';
        if(combatState._sunsinUsed)      _mSize*=1.1;
        if(combatState._haikjinUsed)     _mSize*=1.1;
        if(combatState._einsteinUsed){   _mSize*=1.1; _mCol='#ff9933';}
        if(combatState._teslaUsed){      _mSize*=1.1; _mCol='#ff8822';}
        if(combatState._genesisUsed){    _mSize*=1.1; _mCol='#ff6633';}
        if(combatState._destinationUsed){_mSize*=1.1; _mCol='#ff3333';}
        _cbAddMissileSalvo(a1,a2,_mCol,isDead,mcnt,_fireDelay,wasShielded,_mSize);
        _cbAddDmgText(a2,rawDmg,shDmg,_fireDelay+50);  // 미사일 도달 시점에 데미지 표시
        _fireDelay+=18+mcnt*2;
      } else {
        // 데스티네이션 어스 발동 시 레이저 색상 → 핑크/퍼플 (무지개급 피니셔)
        const _laserCol=combatState._destinationUsed?'#ff44ff':'#00f3ff';
        _cbAddBeamAndHit(a1,a2,_laserCol,isDead,_fireDelay,wasShielded);
        _cbAddDmgText(a2,rawDmg,shDmg,_fireDelay+4);   // 빔 도달 시점에 데미지 표시
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
      // 버그픽스: 일점사로 flagship(보스) 즉시 격침 시 boss.hp<=0 단독 조건이
      // OR로 묶여 있어 호위함 15척이 멀쩡한데도 자진 철수가 발동되던 문제 해결.
      // 보스 단독 생존 의도를 살리려면 "다른 적이 모두 죽었을 때"만 트리거.
      const _aliveEnemies=combatState.enemies.filter(e=>e.hp>0).length;
      if((fleetHpPct<=0.10||(boss.hp<=0&&_aliveEnemies<=0))&&!combatState._voidRetreated){
        combatState._voidRetreated=true;
        // ★ 승리 확정 — 자가복구 로직이 outro 중간에 퀘스트를 'available' 로 되돌리지 않게
        //   격파 플래그를 outro 진입 전에 미리 셋. 모달 도중 어떻게 빠져나가도 잠금 유지.
        //   퀘스트 status 는 'active' 그대로 두고, outro 마지막 '보상 수령' 클릭 시 'claimed' 로.
        //   (제너릭 completeQuest 가 끼어들어 보이드 보상을 가로채지 않게 'done' 으로 바꾸지 않음)
        G._voidFalconDefeated=true;
        G._falconDefeated=true;
        // 남은 모든 적함 함께 어둠 속으로 사라짐
        combatState.enemies.forEach(e=>{e.hp=0;e.sh=0;});
        addCombatLog(I18N.t('combat.blackfalconRetreatLog'),'gold');
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
          addCombatLog(I18N.t('combat.dimRayCharging'),'err');
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
          addCombatLog(I18N.t('combat.dimRayFired',{nm:shipDisplayNm(v)}),'err');
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
    // ─── 회피(TEC 기반) ─────────────────────────────────────────
    //   사용자 명세: 엔진(TEC) 수치가 높을수록 회피율 상승
    //   공식: evade = min(0.40, TEC / 2500)  → TEC 0=0% / 250=10% / 500=20% / 1000=40% (캡)
    //   대응 적 TEC 가 더 높으면 회피 확률이 깎임 (상쇄 0~70%)
    const _tTEC=Math.max(0,target.TEC||0), _eTEC=Math.max(0,e.TEC||0);
    let _evChance=Math.min(0.40, _tTEC/2500);
    if(_eTEC>0)_evChance*=Math.max(0.30, 1 - Math.min(0.70, _eTEC/(_tTEC+1)*0.4));
    if(_evChance>0 && Math.random()<_evChance){
      log.push(`🌀 ${shipDisplayNm(target)||I18N.t('ui.allyShort')} ${I18N.t('combat.dodged')} (${shipDisplayNm(e)||I18N.t('ui.enemyShort')} ${I18N.t('combat.attackVoid')} · TEC ${_tTEC})`);
      const _ep=_unitPos[target.id];
      if(_ep){const a=_txPos(_ep);_cbEffects.push({type:'exp',x:a.x,y:a.y,col:'#66ddff',r:18,life:14,maxLife:14,delay:_fireDelay});try{_cbStartAnimLoop();}catch(_e){}}
      _fireDelay+=8;
      return; // 데미지 적용 스킵
    }
    const armorRed=Math.floor((target.armorTier||0)*1.5);
    const rawDmg=Math.max(1,Math.round((+e.ATT||1)-armorRed));
    const shDmg=Math.min(target.sh||0,rawDmg);
    const hpDmg=rawDmg-shDmg;
    const wasShielded=(target.sh||0)>0;
    target.sh=Math.max(0,(target.sh||0)-shDmg);
    target.hp=Math.max(0,target.hp-hpDmg);
    const gs=G.fleet.find(s=>s.id===target.id);
    if(gs){gs.hp=target.hp;gs.sh=target.sh;}
    const isDead=target.hp<=0;
    // ─── 보이드 적함: 테슬라식 번개 + 미사일 무작위 ───
    const _isVoidEnemy=combatState.isVoidBoss||e.voidBoss||(e.nm||'').toLowerCase().includes('팔콘')||(e.nm||'').toLowerCase().includes('falcon');
    let _atkKind='beam';  // 'beam' | 'lightning' | 'missile'
    if(_isVoidEnemy){
      const r=Math.random();
      _atkKind=r<0.45?'lightning':r<0.90?'missile':'beam';
    }
    const _iconMap={beam:'💥',lightning:'⚡',missile:'🚀'};
    log.push(`${_iconMap[_atkKind]} ${shipDisplayNm(e)||I18N.t('ui.enemyShort')} → ${shipDisplayNm(target)||I18N.t('ui.allyShort')}: ${I18N.t('ui.combatLogDmg',{shDmg,hpDmg})}`+(isDead?' '+I18N.t('ui.killedSuffix'):''));
    const ap=_unitPos[e.id], ep=_unitPos[target.id];
    if(ap&&ep){
      const a1=_txPos(ap),a2=_txPos(ep);
      if(_atkKind==='lightning'){
        // 보이드 번개: 보라 코어 + 자가 가지 (테슬라 시각 효과 재활용)
        _cbEffects.push({type:'muzzle',x:a1.x,y:a1.y,col:'#cc66ff',r:10,life:8,maxLife:8,delay:_fireDelay});
        _cbEffects.push({type:'lightning',x1:a1.x,y1:a1.y,x2:a2.x,y2:a2.y,col:'#cc66ff',life:16,maxLife:16,delay:_fireDelay,thickMul:1.4,seed:Math.random()*9999});
        if(wasShielded)_cbEffects.push({type:'shieldHit',x:a2.x,y:a2.y,col:'#cc66ff',r:30,life:18,maxLife:18,delay:_fireDelay+4});
        _cbEffects.push({type:'exp',x:a2.x,y:a2.y,col:isDead?'#ff3300':'#cc66ff',r:isDead?32:18,life:isDead?36:24,maxLife:isDead?36:24,delay:_fireDelay+5});
        _cbAddDmgText(a2,rawDmg,shDmg,_fireDelay+5);  // 번개 도달 시점에 데미지 표시
        try{_cbStartAnimLoop();}catch(_e){}
        _fireDelay+=15;
      } else if(_atkKind==='missile'){
        // 사용자 요청: 한번에 여러 발 발사 시스템 제거 → 1발만
        _cbAddMissileSalvo(a1,a2,'#cc66ff',isDead,1,_fireDelay,wasShielded,1.2);
        _cbAddDmgText(a2,rawDmg,shDmg,_fireDelay+50);  // 미사일 도달 시점에 데미지 표시
        _fireDelay+=22;
      } else {
        _cbAddBeamAndHit(a1,a2,_isVoidEnemy?'#cc66ff':'#cc44ff',isDead,_fireDelay,wasShielded);
        _cbAddDmgText(a2,rawDmg,shDmg,_fireDelay+4);   // 빔 도달 시점에 데미지 표시
        _fireDelay+=14;
      }
    }
  });
  log.forEach(m=>addCombatLog(m,''));

  const stillAliveEn=combatState.enemies.filter(u=>u.hp>0).length;
  const stillAlivePl=combatState.players.filter(u=>u.hp>0).length;
  drawCombatFrame();
  const stEl=document.getElementById('cb-status');
  if(stEl)stEl.textContent=I18N.t('ui.combatStatus',{ally:stillAlivePl,allyMax:combatState.players.length,enemy:stillAliveEn,enemyMax:combatState.enemies.length});
  _updateCombatFleetStats();
  // 모든 사격이 시각적으로 끝날 때까지 대기 (마지막 이펙트 페이드 포함 ~60프레임 여유)
  // 사용자 요청 (2026-06-06): 학익진 이후 전술 사용마다 함선 속도 +10% 누적.
  //   _tacticSpeedMul 로 턴 사이 대기 시간을 단축 → 다음 턴이 빠르게 도래.
  const _tspd=Math.max(1,(combatState&&combatState._tacticSpeedMul)||1);
  const turnMs=Math.round(Math.min(3000,Math.max(700,(_fireDelay+60)*16))/_tspd);
  if(!stillAliveEn||!stillAlivePl){
    setTimeout(function(){if(combatState&&!combatState.done)_finishCombat();},Math.max(900,turnMs));
  } else {
    // 최대 50턴 제한 (무한 루프 방지)
    if(combatState.turn>=50){
      addCombatLog(I18N.t('combat.over50TurnsForced'),'gold');
      combatState.enemies.forEach(e=>{e.hp=0;});
      setTimeout(function(){if(combatState&&!combatState.done)_finishCombat();},900);
    } else {
      setTimeout(runCombatTurn,turnMs);
    }
  }
  // 턴 마무리 — 재진입 가드 해제 (다음 turn 진행 허용)
  if(combatState)combatState._turnInProgress=false;
}

function _finishCombat(){
  if(!combatState)return;
  combatState.done=true;
  // 전투 종료 — 진행 중인 SFX·잔여 이펙트·애니메이션 즉시 정리
  // (예약된 setTimeout SFX는 클로저로 combatState.done 체크해서 자동 차단)
  try{AudioMgr.stopAllSfx();}catch(e){}
  try{_cbEffects=[];if(typeof _cbAnimReq!=='undefined'&&_cbAnimReq){cancelAnimationFrame(_cbAnimReq);_cbAnimReq=null;}}catch(e){}
  // 사용자 보고 (2026-06-06): 장기간 플레이 중 RAM 폭증·다운 — 전투 종료마다
  //   배경 캔버스(~1-2MB)와 이미지 캐시 절반을 즉시 해제해 GC 압박 완화.
  try{_cbBgCache=null;}catch(e){}
  try{
    if(typeof _cbImgCacheMap!=='undefined'&&_cbImgCacheMap.size>_CB_IMG_CACHE_MAX/2){
      const _toDrop=_cbImgCacheMap.size-Math.floor(_CB_IMG_CACHE_MAX/2);
      const _iter=_cbImgCacheMap.keys();
      for(let i=0;i<_toDrop;i++){const _k=_iter.next().value;if(_k===undefined)break;_cbImgCacheMap.delete(_k);}
    }
  }catch(e){}
  // 충돌 해소 풀 청소 — 전투 종료 후 stale 객체 보존 방지
  try{if(window._resolvedPool)window._resolvedPool.length=0;}catch(e){}
  // 함선 _curX/_curY 보존 → 다음 전투 시작점에서 깜빡임 발생할 수 있어 정리
  //   사용자 보고 (2026-06-06): 전투 누적 시 미사일·레이저가 사라지는 현상.
  //   원인: 휘발성 필드(학익진 target/_origATT 등)가 이전 전투 데이터로 남아
  //         후속 전투의 위치 계산/공격력 산정 등에 잔존 영향.
  //   대책: 전투 종료 시 모든 휘발성 필드 일괄 삭제 + combatState 자체도 null로 강제 해제 (참조 보존 방지)
  try{
    [...(combatState.players||[]),...(combatState.enemies||[])].forEach(u=>{
      if(!u)return;
      delete u._curX;delete u._curY;delete u._drawAngle;delete u._frontRank;
      // 학익진 진형 휘발성 필드
      delete u._haikjinTargetX;delete u._haikjinTargetY;delete u._isHaikjinTank;
      // 공격력 원본/누적 보너스 필드
      delete u._origATT;
      // 보스 무적·각성 페이즈 플래그
      delete u._invincible;delete u._awakened;
      // 보이드 창 충전 타임스탬프 등 일시적 상태
      delete u._voidSpearReadyAt;delete u._voidSpearTotal;
    });
  }catch(e){}
  // 충돌 해소 풀 청소 (위에서도 1회 했지만 안전망)
  try{if(window._resolvedPool)window._resolvedPool.length=0;}catch(e){}
  const win=combatState.enemies.filter(u=>u.hp>0).length===0;
  const pid=combatState._planetId||G.currentPlanet;
  const pd=combatState.planetDef||{};
  // ★ 보이드 보스(블랙팔콘) — 승리 시 일반 승리 흐름 절대 금지, 무조건 outro 보상 경로로
  //   · player turn 즉시격파(일점사) 든 enemy turn 트리거(line 13992)든 모두 여기서 종착
  //   · _voidRetreated 가 이미 true 라도 generic win 으로 빠지지 않게 반드시 return
  if(win&&combatState.isVoidBoss){
    if(!combatState._voidRetreated){
      // 최초 진입: 격파 플래그 셋 + outro 예약
      combatState._voidRetreated=true;
      G._voidFalconDefeated=true;
      G._falconDefeated=true;
      addCombatLog(I18N.t('combat.blackfalconRetreat'),'gold');
      G.fleet.forEach(s=>{const cs=combatState.players.find(p=>p.id===s.id);if(cs){s.hp=Math.max(1,cs.hp);if(cs.sh!=null)s.sh=cs.sh;}});
      try{AudioMgr.playBgm(_planetBgmName(G.currentPlanet));}catch(e){}
      saveGame(true);
      setTimeout(()=>{
        try{showVoidBossOutro();}catch(e){console.warn('void boss outro failed',e);}
      },1000);
    }
    // 이미 outro 가 다른 경로(line 13992)에서 예약되어 있어도 generic 보상 흐름은 무조건 차단
    return;
  }
  if(win&&combatState._isBlackHoleFinal){
    // 방어 코드: 0턴 자동 승리(적이 등장도 못함) 차단 — 최소 1턴 진행해야 보상 인정
    if((combatState.turn||0)<1){
      console.warn('[BlackHole] auto-win on turn 0 detected — ignoring (likely a regen/state bug). enemies count:',combatState.enemies?.length);
      addCombatLog(I18N.t('combat.noEnemyFleetInvalid'),'warn');
      notify(I18N.t('notify.blackHoleInvalid'),'err');
      try{setTimeout(()=>{combatState=null;hubTab('map');},800);}catch(e){}
      return;
    }
    addCombatLog(I18N.t('combat.blackHoleLionDefeat'),'gold');
    notify(I18N.t('notify.blackHoleClear'),'gold');
    G.fleet.forEach(s=>{const cs=combatState.players.find(p=>p.id===s.id);if(cs){s.hp=Math.max(1,cs.hp);if(cs.sh!=null)s.sh=cs.sh;}});
    try{_grantBlackHoleRewardsSilent();}catch(e){console.warn(e);}
    G._act5Complete=true;
    G._finalEndingShown=false;
    // 🌌 명예의 전당 기록 — ACT 5 (블랙홀의 심연)
    try{_recordHallOfFameEntry(5,I18N.t('hof.act5'));}catch(e){console.warn('HoF act5',e);}
    saveGame(true);
    setTimeout(()=>{
      combatState=null;
      try{_cbCacheClear();}catch(e){}
      _cbEffects=[];_unitPos={};
      if(_cbAnimReq){cancelAnimationFrame(_cbAnimReq);_cbAnimReq=null;}
      try{showFinalEndingCredits();}catch(e){console.warn(e);}
    },2500);
    return;
  }
  let earned=0;
  if(win){
    addCombatLog(I18N.t('combat.victory'),'ok');
    // bugfix 2026-06-11 v2: 시나리오 전투 퀘 정밀 연동 — 전투 종류(우르사 보스/치크스/일반)별 매칭
    try{
      if(typeof bumpStoryQuestProgress==='function'){
        const _sqKills=(combatState.enemies||[]).filter(u=>u&&u.hp<=0).length||1;
        const _isUrsa=!!combatState.isBoss||(combatState.enemies||[]).some(u=>u&&(String(u.id||'').indexOf('BOSS')===0||/우르사 메이저|ursa major/i.test(String(u.nm||''))));
        const _isChix=(combatState.enemies||[]).some(u=>u&&(/^(CHIX|E\d)/.test(String(u.catalogId||u.catId||u.id||''))||/치크스|chix|cygnus/i.test(String(u.nm||''))));
        bumpStoryQuestProgress(_isUrsa?'combat_ursa':_isChix?'combat_chix':'combat_generic',_sqKills,pid);
      }
    }catch(e){}
    if(pd.hostile&&!combatState.isBoss){G.planets[pid]=G.planets[pid]||{};G.planets[pid].hostile_cleared=true;}
    // 호레이쇼 넬슨(H05) 보유 시 전투 보상 +20%
    const _nelsonBonus=(G.heroes||[]).includes('H05')?1.2:1.0;
    // 장기 전투 보너스: 1분 경과마다 +5%, 최대 +100% (2배) — 20분 = 캡
    const _elapsedMs=combatState._combatStartedAt?(Date.now()-combatState._combatStartedAt):0;
    const _elapsedMin=Math.floor(_elapsedMs/60000);
    const _timeBonus=1+Math.min(1.0,_elapsedMin*0.05);
    // 잔해 합류(_debrisJoinCount>0) 시 보상 ×3 (사용자 명세)
    const _joinBonus=(combatState._debrisJoinCount||0)>0?3:1;
    earned=Math.round((1000+G.turn*50)*getDiffMult()*_nelsonBonus*_timeBonus*_joinBonus);
    G.credits+=earned;
    addCombatLog(I18N.t('combat.rewardCr',{cr:earned.toLocaleString(),join:_joinBonus>1?I18N.t('combat.debrisBonus',{n:_joinBonus}):''}),'gold');
    if(_elapsedMin>=1){
      const _bonusPct=Math.round((_timeBonus-1)*100);
      addCombatLog(I18N.t('combat.longBattleBonus',{pct:_bonusPct,min:_elapsedMin}),'gold');
    }
    // 모든 비-보스 전투 승리 시 허브 진행도 +1 (해적/치크스/적대행성/잔해해적 모두 카운트)
    let _kindLbl=I18N.t('ui.enemyForce');
    let _repGained=0;
    if(!combatState.isBoss){
      if(combatState.isPirate||combatState._isChixFleet){
        if(!G.pirateKills)G.pirateKills=0;
        G.pirateKills++;
        changeReputation(1);_repGained=1;
      }
      addHubProgress(pid);
      _kindLbl=combatState._isChixFleet?I18N.t('cb.kindChix'):combatState.isPirate?I18N.t('cb.kindPirate'):I18N.t('cb.kindEnemy');
      addCombatLog(I18N.t('combat.hubProgress',{kind:_kindLbl,now:getPlanetHubProgress(pid),max:getPlanetHubThreshold(pid)}),'gold');
      // ── 전리품 특산물 드롭 — 사용자 요청 2026-06-09: 명성(1~1000) 기반 비례 ──
      //   · 명성 1     → 종 1 / 개 10~15  (저명성 신참 사령관)
      //   · 명성 500   → 종 3 / 개 45~58
      //   · 명성 1000+ → 종 5 / 개 80~100 (전설급 사령관)
      //   · 화물칸이 가득 차면 가능한 만큼만 적재 후 알림
      try{
        const _rep=Math.max(1,Math.min(1000,G.reputation||1));
        const _t=(_rep-1)/999;  // 0(명성1) ~ 1(명성1000)
        // 잔해 합류 시 전리품 수량도 3배 (사용자 명세 — 보상 3배)
        const _lootMul=(combatState._debrisJoinCount||0)>0?3:1;
        const _kinds=Math.max(1,Math.min(5,Math.round(1+_t*4)));
        // 명성 1 → 10~15개 / 명성 1000 → 80~100개 (선형 보간)
        const _qtyMin=Math.round((10+_t*70)*_lootMul);
        const _qtyMax=Math.round((15+_t*85)*_lootMul);
        const _plv=(typeof calcPlayerLevel==='function')?calcPlayerLevel():1;  // notify 용 라벨 유지
        const _facId=pd&&pd.f;
        // 보상 풀: 행성 팩션 특산물 우선 + 일반 풀 — 재료(material)는 제외 (일반 G* 만)
        const _pool=(typeof COMMODITIES!=='undefined'?COMMODITIES:[]).filter(c=>c&&!c.material);
        const _facPool=_pool.filter(c=>c.f===_facId);
        const _restPool=_pool.filter(c=>c.f!==_facId);
        // 시드 셔플 후 facPool 먼저 _kinds 만큼 선택
        const _shuffle=arr=>{const a=arr.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
        const _picks=[..._shuffle(_facPool),..._shuffle(_restPool)].slice(0,_kinds);
        if(_picks.length>0){
          const _maxCargo=(typeof getCargoMax==='function')?getCargoMax():999999;
          if(!Array.isArray(G.cargo))G.cargo=[];
          const _curCargo=()=>G.cargo.reduce((s,c)=>s+(c.qty||0),0);
          const _gotten=[];
          _picks.forEach(c=>{
            const _wantQty=_qtyMin+Math.floor(Math.random()*(_qtyMax-_qtyMin+1));
            const _room=Math.max(0,_maxCargo-_curCargo());
            const _giveQty=Math.min(_wantQty,_room);
            if(_giveQty<=0)return;
            // 전리품 슬롯 — loot:true 표식 → calcSellPrice 가 maxSell 가격으로 판매 처리
            //  · 매입 가격이 없으므로 일반 가격 공식(차익=판매-매입)이 의미 없음
            //  · 사용자 명세: 어디서 팔든 최대가에 매각
            const _slot=G.cargo.find(x=>x.id===c.id&&x.loot===true);
            if(_slot){_slot.qty+=_giveQty;}
            else{G.cargo.push({id:c.id,nm:c.nm,qty:_giveQty,buyPrice:0,buyPlanetId:null,buyFaction:_facId,loot:true});}
            _gotten.push(`${c.ic||'📦'} ${commDisplayNm(c)}×${_giveQty}`);
          });
          if(_gotten.length>0){
            addCombatLog(I18N.t('combat.loot',{items:_gotten.join(' · ')}),'gold');
            notify(I18N.t('notify.lootCount',{n:_gotten.length,rep:_rep,lv:_plv}),'ok');
          } else if(_picks.length>0){
            addCombatLog(I18N.t('combat.lootFullCargo'),'warn');
          }
        }
      }catch(e){console.warn('combat loot drop failed',e);}
    }
    if(combatState.isBoss){
      addCombatLog(I18N.t('combat.ursaDefeatedClear'),'gold');
      notify(I18N.t('notify.finalBossCleared'),'gold');
      // ── 최종 보스 보상: 1천만 크레딧 + 우르사 메이저 함선 + 신화 파츠 4종 ──
      const _bossBonusCr=10000000;
      G.credits+=_bossBonusCr;
      addCombatLog(I18N.t('combat.bossBonus',{cr:_bossBonusCr.toLocaleString()}),'gold');
      // 우르사 메이저 함선 강제 획득
      if(!G.fleet)G.fleet=[];
      const _ursaShip={
        id:'BOSS_URSA_CAP_'+Date.now(),
        nm:I18N.t('enemy.ursaPrefix'),
        tier:'신화',
        maxHP:10000000,hp:10000000,maxSH:300000,sh:300000,
        // 사용자 요청 (2026-06-06): BOSS.ATT 6,000 → 30,000 (×5)에 맞춰 노획함 보상도 동기화
        ATT:30000,INT:600,TEC:280,HP:10000000,DEF:200,LOY:80,
        parts:['MW01','MS01','MA01','ME01'],crewIds:[],cargoSlots:40,
        catalogId:'URSA',crafted:false
      };
      // 활성 편대 한도 체크 (최대 16척) — 초과 시 임시창, 임시창 8척 초과 시 매각 프롬프트
      const _ursaAdd=addShipToFleet(_ursaShip);
      if(_ursaAdd.added==='reserve')addCombatLog(I18N.t('combat.ursaToReserve'),'gold');
      else addCombatLog(I18N.t('combat.ursaJoined'),'gold');
      // 신화 파츠 4종 모두 인벤토리에 추가
      if(!G.inventory)G.inventory=[];
      ['MW01','MS01','MA01','ME01'].forEach(pid=>{
        const inv=G.inventory.find(i=>i.id===pid);
        if(inv)inv.qty++;else G.inventory.push({id:pid,qty:1});
      });
      addCombatLog(I18N.t('combat.mythicPartSet'),'gold');
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
        addCombatLog(I18N.t('combat.mythicBp',{n:_grantedBp.length,names:_bpNames}),'gold');
        // 사용자 요청 2026-06-09: 보스 보상 설계도도 BP01/BP02 이미지 알림
        _grantedBp.forEach(bp=>{
          const r=(typeof CRAFT_RECIPES!=='undefined')&&CRAFT_RECIPES.find(x=>x.id===bp);
          try{notifyBlueprint(bp,r?r.nm:bp,'gold');}catch(e){}
        });
      }
    }
    else{notify(I18N.t('notify.battleWin'),'ok');}
    // ── 🏴 적함 나포 처리 (보스 제외) ──────────────────────────────
    // 사용자 요청 2026-06-09: 나포 확률 50% 감소 (기존 28%→14%, 팩션 보너스 ÷100→÷200, 상한 55%→27.5%)
    // 편대편성 "나포 거절" 토글이 켜져 있으면 나포 대신 즉시 매각하여 크레딧 획득
    const _capturedShips=[];
    let _autoSoldRevenue=0,_autoSoldCount=0;
    if(!combatState.isBoss){
      const _capBase=0.14;
      const _facBonus=(getFactionPassive().captureBns||0)/200;
      const _capRate=Math.min(0.275,_capBase+_facBonus);
      const _decline=!!G.declineCapture;
      combatState.enemies.forEach(e=>{
        if(e.hp>0)return;  // 살아남은 적은 못 나포
        if(Math.random()>=_capRate)return;
        // 적 함선 데이터 → CAP_ 함선 변환
        const cap={
          id:'CAP_'+Date.now()+'_'+Math.floor(Math.random()*9999),
          nm:I18N.t('enemy.capturedPrefix',{nm:(e.nm||I18N.t('enemy.captured'))}),
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
        addCombatLog(I18N.t('combat.shipsCaptured',{n:_capturedShips.length}),'gold');
        notify(I18N.t('notify.shipsCapturedShort',{n:_capturedShips.length}),'gold');
      }
      if(_autoSoldCount>0){
        G.credits=(G.credits||0)+_autoSoldRevenue;
        addCombatLog(I18N.t('combat.captureRejected',{n:_autoSoldCount,cr:_autoSoldRevenue.toLocaleString()}),'gold');
        notify(I18N.t('notify.captureRefusedSold',{n:_autoSoldCount,cr:_autoSoldRevenue.toLocaleString()}),'gold');
      }
    }
    // 🎉 승리 효과음 + 획득 보고 팝업
    try{AudioMgr.playSfx('notify',{vol:0.8,cooldown:60});}catch(e){}
    try{AudioMgr.playSfx('coin',{vol:0.7,cooldown:200});}catch(e){}
    // 로컬 캡쳐 (setTimeout 내에서도 안전하게) — combatState는 1800ms 후 null이 되므로 미리 스냅샷
    const _isBossWin=!!combatState.isBoss;
    const _enemyCountSnap=(combatState.enemies||[]).length;
    const _debrisCombatSnap=(combatState._debrisJoinCount||0)>0||combatState.planetDef?.id==='DEBRIS_PIRATE'||!!combatState.planetDef?._isDebris;
    const _chixFleetSnap=!!combatState._isChixFleet;
    const _firstEnemySnap=(combatState.enemies||[])[0]||null;
    // 보고 팝업 구성 (보스/일반 공통)
    const _buildReport=()=>{
      const items=[];
      // 사용자 요청 2026-06-07: 보고 아이콘 → 실제 이미지로 교체
      //   · 크레딧 항목: img/ui/credit.png
      //   · 격파 적함: 해적선 이미지 (img/combat/enemies/PIRATE_M.png 등)
      //   · 행성 허브 진행도: 행성 이미지 (planetImgSrc)
      const _ver=(window._GAME_VER)?('?v='+encodeURIComponent(window._GAME_VER)):'';
      // 크레딧 — credit.png 아이콘
      items.push({ic:'💰',img:'img/ui/credit.png'+_ver,nm:I18N.t('report.creditsNm'),type:I18N.t('report.creditsType'),color:'var(--gold)',stats:`+₡${earned.toLocaleString()}`,desc:I18N.t('ui.combatRewardDesc',{mul:getDiffMult().toFixed(2)})});
      // 명성 — HN01.png 메달 아이콘 (사용자 요청 2026-06-08)
      if(_repGained>0)items.push({ic:'⭐',img:'img/ui/HN01.png'+_ver,nm:I18N.t('report.repNm'),type:I18N.t('report.repType'),color:'var(--cyan)',stats:I18N.t('ui.repGained',{gained:_repGained,cur:G.reputation}),desc:I18N.t('report.repDesc')});
      const enemyCount=_enemyCountSnap;
      // 격파 적함 — 첫 번째 적 함선의 실제 이미지를 우선 사용 (배저스카우트·치크스·잔해해적 등)
      // 사용자 요청 2026-06-07: 좌측 이미지는 반드시 함선 실제 이미지로 (아이콘 금지)
      const _isDebrisCombat=_debrisCombatSnap;
      const _firstEnemy=_firstEnemySnap;
      const _enemyImg=(_firstEnemy && typeof shipImgSrc==='function')
        ? shipImgSrc(_firstEnemy)
        : (_isDebrisCombat?('img/combat/enemies/DBRP_M.png'+_ver)
            :_chixFleetSnap?('img/combat/enemies/CHIX_M.png'+_ver)
            :('img/combat/enemies/PIRATE_M.png'+_ver));
      items.push({ic:'☠️',img:_enemyImg,nm:I18N.t('report.enemyKilled'),type:_kindLbl,color:'var(--red)',stats:I18N.t('report.enemyDestN',{n:enemyCount}),desc:I18N.t('report.enemyDesc')});
      // 나포 함선 — 각 함선의 실제 이미지 (shipImgSrc로 팩션·등급 자동 라우팅)
      _capturedShips.forEach(s=>{
        const _sImg=(typeof shipImgSrc==='function')?shipImgSrc(s):null;
        items.push({ic:'🏴',img:_sImg,nm:(typeof shipDisplayNm==='function'?shipDisplayNm(s):s.nm),type:I18N.t('ship.capturedLabel',{tier:I18N.tier(s.tier)}),color:'#ff8844',stats:I18N.t('ui.attHpLoyalty',{att:s.ATT,hp:s.maxHP}),desc:I18N.t('report.captureDesc')});
      });
      if(_autoSoldCount>0){
        items.push({ic:'💰',img:'img/ui/credit.png'+_ver,nm:I18N.t('ui.captureDeclinedSold',{n:_autoSoldCount}),type:I18N.t('report.autoSoldType'),color:'var(--gold)',stats:`+₡${_autoSoldRevenue.toLocaleString()}`,desc:I18N.t('report.autoSoldDesc')});
      }
      if(!_isBossWin){
        const hp=getPlanetHubProgress(pid),thr=_getHubThr(pid);
        // 행성 허브 진행도 — 현재 행성 이미지
        const _planetImg=(typeof planetImgSrc==='function')?planetImgSrc(pid):null;
        items.push({ic:'🏛️',img:_planetImg,nm:I18N.t('report.planetHubProg'),type:I18N.t('report.unlockProg'),color:'var(--cyan)',stats:`${hp}/${thr.s3}`,desc:I18N.t('report.unlockDesc')});
      }
      // 보스 전용: 신화 파츠 4종 + 보너스 크레딧 + 우르사 함선 (이미지 추가 — 보상 시각화)
      if(_isBossWin){
        items.push({ic:'💰',nm:I18N.t('report.bossBonus'),type:I18N.t('report.creditsType'),color:'var(--gold)',stats:`+₡10,000,000`,desc:I18N.t('report.bossBonusDesc')});
        items.push({ic:'🏴',img:'img/combat/ships/Boss.png',nm:I18N.t('ship.URSA.nm'),type:I18N.t('report.ursaType'),color:'#ff66cc',stats:I18N.t('ui.ursaSpec'),desc:I18N.t('report.ursaDesc')});
        items.push({ic:'⚔️',img:partImgSrc('MW01'),nm:I18N.t('reward.hermeticGunNm'),type:I18N.t('reward.partWeaponType'),color:'#ff66cc',stats:'ATT +320',desc:I18N.t('reward.hermeticDesc'),rarity:'mythic'});
        items.push({ic:'🛡️',img:partImgSrc('MS01'),nm:I18N.t('reward.kronosShieldNm'),type:I18N.t('reward.partShieldType'),color:'#ff66cc',stats:'INT +280 · '+I18N.t('ui.shieldShort')+' +8000',desc:I18N.t('reward.kronosDesc'),rarity:'mythic'});
        items.push({ic:'🪖',img:partImgSrc('MA01'),nm:I18N.t('reward.adamanArmorNm'),type:I18N.t('reward.partArmorType'),color:'#ff66cc',stats:'HP +12000 · DEF +120',desc:I18N.t('reward.adamanDesc'),rarity:'mythic'});
        items.push({ic:'⚙️',img:partImgSrc('ME01'),nm:I18N.t('reward.tachyonDriveNm'),type:I18N.t('reward.partEngineType'),color:'#ff66cc',stats:'TEC +320',desc:I18N.t('reward.tachyonDesc'),rarity:'mythic'});
        // 추가 신화 설계도 (미보유 시에만 보상 표시)
        if(G.blueprints&&G.blueprints.RB10){
          items.push({ic:'📜',img:partImgSrc('RB10'),nm:I18N.t('reward.soulMatrixBp'),type:I18N.t('reward.soulMatrixBpType'),color:'#cc66ff',stats:I18N.t('reward.armorShort'),desc:I18N.t('reward.soulMatrixBpDesc'),rarity:'mythic'});
        }
        if(G.blueprints&&G.blueprints.LGD03){
          items.push({ic:'📜',nm:I18N.t('reward.relativityBp'),type:I18N.t('reward.relativityBpType'),color:'#cc66ff',stats:I18N.t('reward.largeMythicFs'),desc:I18N.t('reward.relativityBpDesc'),rarity:'mythic'});
        }
      }
      return items;
    };
    if(_isBossWin){
      // ── 보스 격파: 격정적 에필로그 → 특별 셀레브레이션 → 보상 보고 (지구 해방 엔딩) ──
      // 1) ACT 4로 승격 + 지구 해방 플래그 (P31 배경이 P31_free.jpg로 자동 전환)
      if(G.act<4)G.act=4;
      G._earthLiberated=true;
      // 🏆 명예의 전당 기록 — ACT 4 (지구 해방)
      try{_recordHallOfFameEntry(4,I18N.t('hof.act4'));}catch(e){console.warn('HoF act4',e);}
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
            title:I18N.t('ending.finalReportTitle'),
            subtitle:I18N.t('hud.ursaDefeated',{turn:G.turn}),
            items:_buildReport(),
            color:'#ffd700',
            sfx:null,
            bossfight:true,
            congrats:I18N.t('ending.finalCongrats'),
            // 보상 확인 후 — 어두운 화면 + 영웅/주인공 대사 + 엔딩 크레딧 → 보이드 페이즈
            onClose:()=>{
              showEndingCredits(()=>{
                G._earthLiberated=true;
                saveGame(true);
                // 엔딩 크레딧 후 — 보이드 페이즈로 자연스럽게 전환
                baekgu(I18N.t('baekgu.earthFreeNewEra',{nm:G.profile?.name||I18N.t('hof.commander')}));
              });
            }
          });
        });
      }),600);
    } else {
      setTimeout(()=>{
        showAcquisitionReport({title:I18N.t('report.victoryTitle'),subtitle:I18N.t('ui.areaTurn',{nm:pd.nm||I18N.t('ui.unknownArea'),turn:G.turn}),items:_buildReport(),color:'var(--gold)',sfx:null,imgScale:0.5,congrats:_capturedShips.length>0?I18N.t('report.allWinCaptured',{n:_capturedShips.length}):I18N.t('report.allWin')});
      },900);
    }
    checkQuestCombatDone();
  } else {
    addCombatLog(I18N.t('combat.defeat'),'err');
    const penalty=Math.floor(G.credits*0.1);
    G.credits=Math.max(100,G.credits-penalty);
    earned=-penalty;
    addCombatLog(I18N.t('combat.creditsPenalty',{pen:penalty.toLocaleString()}),'err');
    notify(I18N.t('notify.battleLoseCr'),'err');
    // 보이드 보스(블랙팔콘) 패배 시: 퀘스트를 available 로 되돌려 재도전 허용
    //  · q.status='active' 인 채 멈춰 있으면 퀘스트 탭에서 '수락' 버튼이 사라져 재도전 불가
    if(combatState&&combatState.isVoidBoss&&combatState._questRef){
      combatState._questRef.status='available';
      addCombatLog(I18N.t('combat.blackfalconQuestReset'),'warn');
      notify(I18N.t('notify.blackfalconRetryQuest'),'warn');
    }
  }
  // 전투 기록 저장 (렌더링이 참조하는 필드 모두 포함)
  if(!G.combatHistory)G.combatHistory=[];
  const _pdef=pd&&pd.nm?pd:(PLANET_DEF.find(p=>p.id===pid)||{});
  G.combatHistory.push({
    win,pid,planetId:pid,
    planet:_pdef.nm||I18N.t('ui.unknownPlanet'),
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
    // 잔해 탐색 버튼을 다시 "탐색" 모드로 복귀
    try{updateGatherBtn();}catch(e){}
    if(_bossEnding){
      // 보스 엔딩 진행 중: 행성 BGM/허브탭 전환을 showEndingCredits에 위임
      return;
    }
    try{AudioMgr.playBgm(_planetBgmName(G.currentPlanet));}catch(e){}
    hubTab(_hasQDone?'quest':'main');
  },1800);
}

// ── 이순신 일점사 전술 ──────────────────────────────────────────
// 발동 효과: ① 가장 앞쪽 적 1척을 집중사격 타겟으로 지정 — 아군 전 함선이 그 1척을 집중 공격
//           ② 남은 전투 내내 아군 공격력 ×2
//           ③ 집중 타겟이 격침되면 자동으로 다음 가장 앞쪽 적으로 타겟 승계
// 일점사 후 5초 뒤 → 학익진 버튼 활성화 (아군 ATT ×3 추가 강화)
// ※ 사용자 요청(2026-06-03): 즉시 격침 → 실제 집중사격 시도로 변경
function activateSunsinFocus(){
  if(!combatState||combatState._sunsinUsed||combatState.done)return;
  // ★ 전술 화자 초상: 일점사 → 호레이쇼 넬슨 (H05)
  try{_showTacticPortrait('img/chars/hero05.png',12000);}catch(e){}
  // 가장 앞쪽(낮은 _frontRank — 진형 앞열 우선) 적 1척을 집중 타겟으로 — 보스/무적은 제외
  const _candidates=combatState.enemies.filter(e=>e.hp>0&&!e._invincible);
  if(!_candidates.length)return;
  const target=_candidates.slice().sort((a,b)=>{
    const ar=(typeof a._frontRank==='number')?a._frontRank:99;
    const br=(typeof b._frontRank==='number')?b._frontRank:99;
    return ar-br;
  })[0];
  if(!target)return;
  combatState._sunsinUsed=true;
  combatState._playerAttMult=2;  // 남은 전투 동안 아군 ATT ×2
  combatState._focusTargetId=target.id;  // ★ 집중사격 타겟 — runCombatTurn에서 참조
  // 이미 활성화된 함선들의 ATT 즉시 갱신 (combatState.players의 캐시된 ATT를 2배로)
  if(combatState.players){
    combatState.players.forEach(p=>{
      if(!p._origATT)p._origATT=p.ATT;
      p.ATT=Math.round(p._origATT*2);
    });
  }
  addCombatLog(I18N.t('combat.focusFireLog',{nm:shipDisplayNm(target)}),'gold');
  notify(I18N.t('notify.focusFireShort'),'gold');
  baekgu(I18N.t('baekgu.focusFireOn',{nm:target.nm}));
  const sbtn=document.getElementById('cb-sunsin-btn');
  if(sbtn)sbtn.disabled=true;
  drawCombatFrame();
  const stillAliveEn=combatState.enemies.filter(u=>u.hp>0).length;
  if(!stillAliveEn){setTimeout(_finishCombat,600);return;}
  // ── 5초 후 학익진 버튼 활성화 (사용자 명세: 넬슨 H05 + 이순신 H01 둘 다 필요) ──
  const _h=G.heroes||[];
  if(!(_h.includes('H01')&&_h.includes('H05')))return;
  combatState._haikjinPending=true;
  setTimeout(()=>{
    if(!combatState||combatState.done||!combatState._haikjinPending||combatState._haikjinUsed)return;
    _showHaikjinButton();
    addCombatLog(I18N.t('combat.haikjinReady'),'gold');
    notify(I18N.t('notify.haikjinReadyShort'),'gold');
  },5000);
}

// 학익진 버튼 생성 (일점사 발동 5초 후)
function _showHaikjinButton(){
  // Ready 플래그 — 탭 전환 후 복귀 시 _restoreSkillButtons가 이 플래그 보고 재생성
  if(combatState)combatState._haikjinReady=true;
  if(document.getElementById('cb-haikjin-btn'))return;
  const hdr=document.getElementById('cb-tactics')||document.getElementById('cb-hdr');
  if(!hdr)return;
  const hbtn=document.createElement('button');
  hbtn.id='cb-haikjin-btn';
  hbtn.className='btn btn-sm';
  hbtn.style.cssText='padding:5px 14px;font-size:14px;min-height:34px;min-width:130px;letter-spacing:.3px;border-color:var(--gold);color:var(--gold);background:rgba(255,215,0,.12);animation:pulse 1.4s infinite;margin-left:3px;white-space:nowrap;flex-shrink:0';
  hbtn.textContent=I18N.t('ult.crane');
  hbtn.title=I18N.t('ult.craneTip');
  hbtn.onclick=activateHaikjin;
  hdr.appendChild(hbtn);
}

// 학익진 포위 진형 셋업 — 아군 함대를 적군 주변 원형으로 배치
//   · 가장 방어력 높은 아군 1대 → 적 정면(앞쪽 중앙) 탱커 슬롯
//   · 나머지 아군은 적군을 둘러싸는 시계 분산 배치
//   · 좌표는 _haikjinTarget(x,y)에 저장하고 drawCombatFrame이 lerp 보간 (천천히 이동)
function _setupHaikjinFormation(){
  if(!combatState||!combatState.players||!combatState.enemies)return;
  const pl=combatState.players.filter(p=>(p.hp||0)>0);
  const en=combatState.enemies.filter(e=>(e.hp||0)>0);
  if(pl.length===0||en.length===0)return;
  combatState._haikjinFormation=true;
  combatState._haikjinT0=performance.now();
  // 방어 점수: 체력(maxHP) + 실드(maxSH) + 방어력(DEF×10) — 사용자 명시 3개 핵심 스탯
  //  · 같은 점수일 경우 장갑·실드 tier로 미세 가중
  function _defScore(u){
    return (+u.maxHP||+u.hp||1)
         + (+u.maxSH||0)
         + (+u.DEF||0)*10
         + (+u.armorTier||0)*25
         + (+u.shieldTier||0)*15;
  }
  const tank=pl.slice().sort((a,b)=>_defScore(b)-_defScore(a))[0];
  // 적군 중심점 (적 함선의 평균 위치) — _unitPos는 drawCombatFrame이 매 프레임 갱신
  const _up=_unitPos||{};
  const _eposx=en.map(u=>_up[u.id]?_up[u.id].x:0);
  const _eposy=en.map(u=>_up[u.id]?_up[u.id].y:0);
  const cxE=_eposx.reduce((a,b)=>a+b,0)/Math.max(1,en.length);
  const cyE=_eposy.reduce((a,b)=>a+b,0)/Math.max(1,en.length);
  // 적 함대 spread (적의 분산 크기 — 진형 크기 결정 기준)
  const spread=Math.max(...en.map(u=>{const p=_up[u.id]||{};return Math.hypot((p.x||0)-cxE,(p.y||0)-cyE);}),120);
  // 사용자 요청 (2026-06-06, hack.png 참조): 학익진 = U자 호 형태, 열린 면이 적군을 향함
  //   · 16척을 현재 Y 좌표 기준 정렬 → 위쪽 절반은 U의 상단 arm, 아래쪽 절반은 하단 arm
  //   · U 호의 중심 C(가상 원 중심)은 적 좌측 가까이 → 호의 안쪽(curve)은 좌측, 열린 면은 우측(적군)
  //   · 각 arm 은 호의 중간(좌측 back) → 외각(상/하측 tip, 적 방향)으로 배치
  const R_arc=spread+220;                 // 호 반경 (전체 진형 크기)
  const C_x=cxE-R_arc*0.65;               // 호 중심: 적 좌측 (호의 좌측 끝이 깊이 들어가도록)
  const C_y=cyE;                          // Y는 적 중심과 같은 높이
  const ARC_HALF=Math.PI*0.65;            // 각 arm 의 호 각도 범위(rad): π*0.65 ≈ 117° → 두 arm 합 234°
  // 모든 아군 함선을 현재 Y 좌표 기준 정렬 (tank 구분 없이 일괄 분할)
  const sorted=pl.slice().sort((a,b)=>{
    const ya=(_up[a.id]?_up[a.id].y:0);
    const yb=(_up[b.id]?_up[b.id].y:0);
    return ya-yb;
  });
  const n=sorted.length;
  if(n>0){
    const half=Math.ceil(n/2);
    const top=sorted.slice(0,half);       // Y 작은 쪽 = 위쪽 → U 상단 arm
    const bottom=sorted.slice(half);      // Y 큰 쪽 = 아래쪽 → U 하단 arm
    // 상단 arm: 호의 back(π=좌측) → tip(π+ARC_HALF=상우측)
    //   캔버스 좌표: +X=우, +Y=아래. sin(angle)<0 이면 캔버스에서 위쪽.
    //   t=0 → back of U (좌측), t=1 → upper tip (우상단, 적 정면 위)
    top.forEach((p,i)=>{
      const t=top.length===1?0.5:(i/(top.length-1));
      const angle=Math.PI+t*ARC_HALF;     // π → π+0.65π (≈ 1.65π = 297°)
      p._haikjinTargetX=C_x+R_arc*Math.cos(angle);
      p._haikjinTargetY=C_y+R_arc*Math.sin(angle);   // sin가 음수 → 캔버스 위쪽
    });
    // 하단 arm: 호의 back(π=좌측) → tip(π-ARC_HALF=하우측)
    //   t=0 → back of U (좌측), t=1 → lower tip (우하단, 적 정면 아래)
    bottom.forEach((p,i)=>{
      const t=bottom.length===1?0.5:(i/(bottom.length-1));
      const angle=Math.PI-t*ARC_HALF;     // π → π-0.65π (≈ 0.35π = 63°)
      p._haikjinTargetX=C_x+R_arc*Math.cos(angle);
      p._haikjinTargetY=C_y+R_arc*Math.sin(angle);   // sin가 양수 → 캔버스 아래쪽
    });
  }
}

// 학익진 전술 — 아군 ATT ×3 (일점사 ×2 위에 덮어쓰기, 즉 원본 대비 ×3)
function activateHaikjin(){
  if(!combatState||combatState._haikjinUsed||combatState.done)return;
  // ★ 전술 화자 초상: 학익진 → 이순신 (H01)
  try{_showTacticPortrait('img/chars/hero01.png',12000);}catch(e){}
  combatState._haikjinUsed=true;
  combatState._playerAttMult=3;
  // 사용자 요청 (2026-06-06): 학익진부터 전술 사용마다 함선 속도 +10% 누적
  combatState._tacticSpeedMul=(combatState._tacticSpeedMul||1)+0.10;
  if(combatState.players){
    combatState.players.forEach(p=>{
      if(!p._origATT)p._origATT=p.ATT;
      p.ATT=Math.round(p._origATT*3);
    });
  }
  // 사용자 요청: 학익진 발동 시 아군 함대가 적군을 둘러싸는 원형 포위 진형으로 천천히 이동
  //  · 방어력(DEF+장갑+실드 기반) 가장 높은 아군 1대는 적군 정면(앞쪽)에 배치 — 탱커 역할
  //  · 나머지 아군은 적군 주변에 균등 분산 배치 (시계방향 ARC)
  //  · drawCombatFrame이 매 프레임 sx/sy를 target으로 lerp 보간해 천천히 이동
  try{_setupHaikjinFormation();}catch(e){console.warn('[Haikjin formation]',e);}
  addCombatLog(I18N.t('combat.haikjinActivate'),'gold');
  // 누적 속도 +N% 안내 (사용자 요청 2026-06-06)
  try{addCombatLog(I18N.t('combat.tacticSpeedBoost',{pct:Math.round(((combatState._tacticSpeedMul||1)-1)*100)}),'gold');}catch(e){}
  notify(I18N.t('notify.haikjinActivateShort'),'gold');
  baekgu(I18N.t('baekgu.haikjin'));
  const hbtn=document.getElementById('cb-haikjin-btn');
  if(hbtn)hbtn.disabled=true;
  drawCombatFrame();
  // ── 학익진 5초 후 → 아인슈타인 시간차공격 버튼 활성화 (사용자 명세: 넬슨+이순신+아인슈타인) ──
  const _h2=G.heroes||[];
  if(!(_h2.includes('H01')&&_h2.includes('H05')&&_h2.includes('H06')))return;
  combatState._einsteinPending=true;
  setTimeout(()=>{
    if(!combatState||combatState.done||!combatState._einsteinPending||combatState._einsteinUsed)return;
    _showEinsteinButton();
    addCombatLog(I18N.t('combat.einsteinReady'),'gold');
    notify(I18N.t('notify.einsteinReadyShort'),'gold');
  },5000);
}

// 아인슈타인 시간차공격 버튼 생성 (학익진 발동 30초 후)
function _showEinsteinButton(){
  if(combatState)combatState._einsteinReady=true;
  if(document.getElementById('cb-einstein-btn'))return;
  const hdr=document.getElementById('cb-tactics')||document.getElementById('cb-hdr');
  if(!hdr)return;
  const ebtn=document.createElement('button');
  ebtn.id='cb-einstein-btn';
  ebtn.className='btn btn-sm';
  ebtn.style.cssText='padding:5px 14px;font-size:14px;min-height:34px;min-width:130px;letter-spacing:.3px;border-color:#cc66ff;color:#cc66ff;background:rgba(204,102,255,.12);animation:pulse 1.2s infinite;margin-left:3px;white-space:nowrap;flex-shrink:0';
  ebtn.textContent=I18N.t('ult.einstein');
  ebtn.title=I18N.t('ult.einsteinTip');
  ebtn.onclick=activateEinsteinTimeAttack;
  hdr.appendChild(ebtn);
}

// 아인슈타인 시간차공격 — 아군 ATT ×4
function activateEinsteinTimeAttack(){
  if(!combatState||combatState._einsteinUsed||combatState.done)return;
  // ★ 전술 화자 초상: 시간차공격 → 아인슈타인 (H06)
  try{_showTacticPortrait('img/chars/hero06.png',12000);}catch(e){}
  combatState._einsteinUsed=true;
  combatState._playerAttMult=4;
  combatState._tacticSpeedMul=(combatState._tacticSpeedMul||1)+0.10;  // +10% 누적 (학익진 이후 전술)
  if(combatState.players){
    combatState.players.forEach(p=>{
      if(!p._origATT)p._origATT=p.ATT;
      p.ATT=Math.round(p._origATT*4);
    });
  }
  addCombatLog(I18N.t('combat.einsteinActivate'),'gold');
  try{addCombatLog(I18N.t('combat.tacticSpeedBoost',{pct:Math.round(((combatState._tacticSpeedMul||1)-1)*100)}),'gold');}catch(e){}
  notify(I18N.t('notify.einsteinActivateShort'),'gold');
  baekgu(I18N.t('baekgu.einsteinRelativity'));
  const ebtn=document.getElementById('cb-einstein-btn');
  if(ebtn)ebtn.disabled=true;
  drawCombatFrame();
  // ── 시간차공격 5초 후 → 테슬라 초공간 버튼 활성화 (사용자 명세: 넬슨+이순신+아인슈타인+테슬라) ──
  const _h3=G.heroes||[];
  if(!(_h3.includes('H01')&&_h3.includes('H05')&&_h3.includes('H06')&&_h3.includes('H07')))return;
  combatState._teslaPending=true;
  setTimeout(()=>{
    if(!combatState||combatState.done||!combatState._teslaPending||combatState._teslaUsed)return;
    _showTeslaButton();
    addCombatLog(I18N.t('combat.teslaReady'),'gold');
    notify(I18N.t('notify.teslaReady'),'gold');
  },5000);
}

// 테슬라 초공간 버튼 생성 (시간차공격 발동 5초 후)
function _showTeslaButton(){
  if(combatState)combatState._teslaReady=true;
  if(document.getElementById('cb-tesla-btn'))return;
  const hdr=document.getElementById('cb-tactics')||document.getElementById('cb-hdr');
  if(!hdr)return;
  const tbtn=document.createElement('button');
  tbtn.id='cb-tesla-btn';
  tbtn.className='btn btn-sm';
  tbtn.style.cssText='padding:5px 14px;font-size:14px;min-height:34px;min-width:130px;letter-spacing:.3px;border-color:#66ffff;color:#66ffff;background:rgba(0,255,255,.12);animation:pulse 1s infinite;margin-left:3px;text-shadow:0 0 6px rgba(0,255,255,.6);white-space:nowrap;flex-shrink:0';
  tbtn.textContent=I18N.t('ult.tesla');
  tbtn.title=I18N.t('ult.teslaTip');
  tbtn.onclick=activateTeslaHyperspace;
  hdr.appendChild(tbtn);
}

// 테슬라 초공간 — 아군 ATT ×5
function activateTeslaHyperspace(){
  if(!combatState||combatState._teslaUsed||combatState.done)return;
  // ★ 전술 화자 초상: 테슬라 초공간 → 니콜라 테슬라 (H07)
  try{_showTacticPortrait('img/chars/hero07.png',12000);}catch(e){}
  combatState._teslaUsed=true;
  combatState._playerAttMult=5;
  combatState._tacticSpeedMul=(combatState._tacticSpeedMul||1)+0.10;  // +10% 누적 (학익진 이후 전술)
  if(combatState.players){
    combatState.players.forEach(p=>{
      if(!p._origATT)p._origATT=p.ATT;
      p.ATT=Math.round(p._origATT*5);
    });
  }
  addCombatLog(I18N.t('combat.teslaActivate'),'gold');
  try{addCombatLog(I18N.t('combat.tacticSpeedBoost',{pct:Math.round(((combatState._tacticSpeedMul||1)-1)*100)}),'gold');}catch(e){}
  notify(I18N.t('notify.teslaActivateShort'),'gold');
  baekgu(I18N.t('baekgu.teslaHyperspace'));
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
  // ── 테슬라 5초 후 → 제네시스 임펙트 버튼 활성화 (사용자 명세: 넬슨+이순신+아인슈타인+테슬라+광개토) ──
  const _h4=G.heroes||[];
  if(!(_h4.includes('H01')&&_h4.includes('H03')&&_h4.includes('H05')&&_h4.includes('H06')&&_h4.includes('H07')))return;
  combatState._genesisPending=true;
  setTimeout(()=>{
    if(!combatState||combatState.done||!combatState._genesisPending||combatState._genesisUsed)return;
    _showGenesisButton();
    addCombatLog(I18N.t('combat.genesisReady',{n:G.heroes.length}),'gold');
    notify(I18N.t('notify.genesisReadyShort'),'gold');
  },5000);
}

// 제네시스 임펙트 버튼 생성 (테슬라 발동 5초 후)
function _showGenesisButton(){
  if(combatState)combatState._genesisReady=true;
  if(document.getElementById('cb-genesis-btn'))return;
  const hdr=document.getElementById('cb-tactics')||document.getElementById('cb-hdr');
  if(!hdr)return;
  const gbtn=document.createElement('button');
  gbtn.id='cb-genesis-btn';
  gbtn.className='btn btn-sm';
  gbtn.style.cssText='padding:5px 14px;font-size:14px;min-height:34px;min-width:130px;letter-spacing:.3px;border-color:#ff66cc;color:#ff66cc;background:rgba(255,102,204,.15);animation:pulse .9s infinite;margin-left:3px;text-shadow:0 0 8px rgba(255,102,204,.7);white-space:nowrap;flex-shrink:0';
  gbtn.textContent=I18N.t('ult.genesis');
  gbtn.title=I18N.t('ult.genesisTip');
  gbtn.onclick=activateGenesisImpact;
  hdr.appendChild(gbtn);
}

// 제네시스 임펙트 — 아군 ATT ×6
function activateGenesisImpact(){
  if(!combatState||combatState._genesisUsed||combatState.done)return;
  // ★ 전술 화자 초상: 제네시스 임펙트 → 광개토대왕 (H03)
  try{_showTacticPortrait('img/chars/hero03.png',12000);}catch(e){}
  combatState._genesisUsed=true;
  combatState._playerAttMult=6;
  combatState._tacticSpeedMul=(combatState._tacticSpeedMul||1)+0.10;  // +10% 누적 (학익진 이후 전술)
  if(combatState.players){
    combatState.players.forEach(p=>{
      if(!p._origATT)p._origATT=p.ATT;
      p.ATT=Math.round(p._origATT*6);
    });
  }
  addCombatLog(I18N.t('combat.genesisActivate'),'gold');
  try{addCombatLog(I18N.t('combat.tacticSpeedBoost',{pct:Math.round(((combatState._tacticSpeedMul||1)-1)*100)}),'gold');}catch(e){}
  notify(I18N.t('notify.genesisActivateShort'),'gold');
  baekgu(I18N.t('baekgu.genesisImpact'));
  const gbtn=document.getElementById('cb-genesis-btn');
  if(gbtn)gbtn.disabled=true;
  drawCombatFrame();
  // ── 제네시스 5초 후 → 데스티네이션 어스 버튼 활성화 (ATT ×10) ──
  // 영웅 8명 모두 영입 시에만 활성화
  if(!G.heroes||G.heroes.length<8)return;
  combatState._destinationPending=true;
  setTimeout(()=>{
    if(!combatState||combatState.done||!combatState._destinationPending||combatState._destinationUsed)return;
    _showDestinationButton();
    addCombatLog(I18N.t('combat.destinationReady'),'gold');
    notify(I18N.t('notify.destinationReadyShort'),'gold');
  },5000);
}

// 데스티네이션 어스 버튼 생성 (제네시스 발동 5초 후)
function _showDestinationButton(){
  if(combatState)combatState._destinationReady=true;
  if(document.getElementById('cb-destination-btn'))return;
  const hdr=document.getElementById('cb-tactics')||document.getElementById('cb-hdr');
  if(!hdr)return;
  const dbtn=document.createElement('button');
  dbtn.id='cb-destination-btn';
  dbtn.className='btn btn-sm';
  dbtn.style.cssText='padding:3px 15px;font-size:17px;min-height:34px;border:2px solid #ffd700;color:#ffd700;background:linear-gradient(135deg,rgba(255,215,0,.18),rgba(255,100,200,.18),rgba(102,255,255,.18));animation:pulse .7s infinite;margin-left:3px;text-shadow:0 0 10px gold;font-weight:bold;white-space:nowrap;flex-shrink:0';
  dbtn.textContent=I18N.t('ult.destEarth');
  dbtn.title=I18N.t('ult.destEarthTip');
  dbtn.onclick=activateDestinationEarth;
  hdr.appendChild(dbtn);
}

// 데스티네이션 어스 — 아군 ATT ×10 (콤보 최종)
function activateDestinationEarth(){
  if(!combatState||combatState._destinationUsed||combatState.done)return;
  // ★ 전술 화자 초상: 데스티네이션 어스 → 주인공 (성별 기반 commander_m/f.png, 없으면 자동 폴백)
  try{_showTacticPortrait(_commanderPortraitSrc(),14000);}catch(e){}
  combatState._destinationUsed=true;
  combatState._playerAttMult=10;
  combatState._tacticSpeedMul=(combatState._tacticSpeedMul||1)+0.10;  // +10% 누적 (학익진 이후 전술)
  if(combatState.players){
    combatState.players.forEach(p=>{
      if(!p._origATT)p._origATT=p.ATT;
      p.ATT=Math.round(p._origATT*10);
    });
  }
  addCombatLog(I18N.t('combat.destinationActivate'),'gold');
  try{addCombatLog(I18N.t('combat.tacticSpeedBoost',{pct:Math.round(((combatState._tacticSpeedMul||1)-1)*100)}),'gold');}catch(e){}
  notify(I18N.t('notify.destinationActivateShort'),'gold');
  baekgu(I18N.t('baekgu.destinationEarth'));
  const dbtn=document.getElementById('cb-destination-btn');
  if(dbtn)dbtn.disabled=true;
  drawCombatFrame();
}

// ── 세이브 슬롯 시스템 (저장/불러오기/백업 복구/슬롯 UI) → js/modules/save-slots.js 로 분할 (2026-06-12, 사용자 요청: 긴 코드 분할)

// ── 명예의 전당 (ACT4/ACT5 기록 + 글로벌 랭킹) → js/modules/hall-of-fame.js 로 분할 (2026-06-12, 사용자 요청: 긴 코드 분할)

// ── 피드백 전송 모달 → js/modules/feedback.js 로 분할 (2026-06-12, 사용자 요청: 긴 코드 분할)

// ── 설정 모달 + 오프라인 백업 → js/modules/settings-backup.js 로 분할 (2026-06-12, 사용자 요청: 긴 코드 분할)
//   showSettingsModal / _saveFilename / exportSaveFile / exportAllSavesFile / importSaveFile / copySaveToClipboard

// ── 클라우드 세이브 UI 핸들러 ──────────────────────────────────────
function _cloudStatusText(){
  try{
    const cs=window.CloudSave;
    if(!cs)return I18N.t('cloud.notLoaded');
    const u=cs.getUser&&cs.getUser();
    const d=cs.diag&&cs.diag();
    let main='';
    if(!u){
      if(d&&!d.firebaseLoaded)main=I18N.t('cloud.sdkNotLoaded');
      else if(d&&d.firebaseLoaded&&!d.ready)main=I18N.t('cloud.initializing');
      else main=I18N.t('cloud.localOnly');
    } else if(u.isAnonymous){
      main=I18N.t('cloud.anonymous',{uid:u.uid.slice(0,8)});
    } else {
      main=I18N.t('cloud.signedIn',{who:(u.email||u.displayName||I18N.t('cloud.loggedIn'))});
    }
    // 진단 추가
    let diagLine='';
    if(d){
      const upMs=d.lastUploadAt?I18N.t('cloud.upMsAgo',{n:Math.round((Date.now()-d.lastUploadAt)/1000)}):I18N.t('cloud.upNone');
      diagLine+=`<div style="font-size:11px;color:var(--muted);margin-top:4px">${I18N.t('ui.uploadStats',{n:d.uploadCount||0,ts:upMs})}`;
      if(d.queueSize>0)diagLine+=I18N.t('ui.queueWaiting',{n:d.queueSize});
      if(d.lastUploadError)diagLine+=`<br><span style="color:var(--red)">${I18N.t('ui.lastUploadError',{msg:d.lastUploadError.slice(0,80)})}</span>`;
      diagLine+='</div>';
    }
    return main+diagLine;
  }catch(e){return I18N.t('cloud.errorPrefix',{err:e.message});}
}
async function cloudGoogleSignIn(){
  if(!window.CloudSave){notify(I18N.t('notify.cloudModuleNotLoaded'),'err');return;}
  notify(I18N.t('notify.googleLoginOpen'),'ok');
  const r=await CloudSave.signInGoogle();
  if(r.error)notify(I18N.t('notify.loginFailErr',{err:r.error}),'err');
  else{notify(I18N.t('notify.googleConnectOk'),'gold');showSettingsModal();}
}
async function cloudPushAll(){
  if(!window.CloudSave){notify(I18N.t('notify.cloudModuleNotLoaded'),'err');return;}
  // 모듈 초기화 안 됐으면 강제 재시도
  const d=CloudSave.diag&&CloudSave.diag();
  if(!d||!d.user){
    notify(I18N.t('notify.cloudInitTrying'),'warn');
    try{await CloudSave.init();await new Promise(r=>setTimeout(r,1500));}catch(e){}
  }
  const u=CloudSave.getUser&&CloudSave.getUser();
  if(!u){
    notify(I18N.t('notify.cloudLoginFail'),'err');
    return;
  }
  const r=await CloudSave.pushAll();
  if(r.error)notify(I18N.t('notify.uploadFail',{err:r.error}),'err');
  else notify(I18N.t('notify.uploadDone',{n:r.pushed,uid:u.uid.slice(0,8)}),'gold');
  setTimeout(()=>showSettingsModal(),500);  // 상태 갱신
}
async function cloudPullAll(){
  if(!window.CloudSave){notify(I18N.t('notify.cloudModuleNotLoaded'),'err');return;}
  const r=await CloudSave.pullAll();
  notify(I18N.t('notify.downloadDone',{n:r.pulled||0}),'ok');
}
async function cloudSignOut(){
  if(!window.CloudSave)return;
  await CloudSave.signOut();
  notify(I18N.t('notify.logoutAnon'),'ok');
  showSettingsModal();
}

// ── 보스 진입 / 보이드 창 ────────────────────────────────────────
// 강제 보스 재도전 — 조건/크리스탈 무시하고 우르사 메이저 보스전 즉시 시작
// (지구 접근 시 보스 미출현 버그 복구용 + 격파 후 재도전용)
function forceUrsaBoss(){
  openModal(I18N.t('modal.ursaForcedFight'),
    `<div style="text-align:center;padding:14px">
      <div style="font-size:46px;margin-bottom:8px">☠️</div>
      <div style="color:var(--red);font-weight:bold;font-size:16px;margin-bottom:8px">${I18N.t('ui.forcedUrsa')}</div>
      <div style="color:var(--dim);font-size:13px;line-height:1.8">${I18N.t('ui.forceUrsaBossHelp')}<br>${I18N.t('ui.noVcConsumed')}</div>
    </div>`,
    [{txt:I18N.t('btn.startCombat'),fn:()=>{closeModal();try{if(typeof showUrsaMajorIntro==='function')showUrsaMajorIntro();else startCombat({id:'BOSS',nm:I18N.t('ursa.bossName'),ring:5});}catch(e){notify(I18N.t('notify.bossStartErr',{err:e.message}),'err');}},cls:'btn-red'},
     {txt:I18N.t('btn.cancel'),fn:closeModal,cls:'btn-sm'}]);
}
try{if(typeof window!=='undefined')window.forceUrsaBoss=forceUrsaBoss;}catch(e){}
function tryBossEntry(){
  // 사용자 요청 2026-06-09: 전투 중 보스전 진입도 차단 (이중 안전망)
  if(window.combatState&&!window.combatState.done){
    try{notify(I18N.t('notify.combatTravelBlocked')||'⚔️ 전투 중에는 보스전에 진입할 수 없습니다.','err');}catch(e){}
    return;
  }
  // 첫 도전 판정 — 실제 격파 흔적(BOSS_URSA 나포함 OR 엔딩 시청)이 없으면 "첫 도전"으로 간주.
  //   _earthLiberated 만 켜져 있고 격파 흔적이 없는 손상 상태(B2 후속)에서도 보스가 정상 트리거되도록 보장.
  const _isFirst=!_isUrsaDefeated();
  // ── 사용자 요청: 지구 해방 보스전 입장 시 거북선(LGD01) 신화 함선 1대 필수 보유 ──
  //   catalogId/catId/id 어느 쪽이든 'LGD01'을 포함하면 거북선으로 인정 (제작 함선 id 'LGD01_craft_xxx' 포함)
  const _hasTurtleShip=(G.fleet||[]).some(s=>{
    const _cid=String(s.catalogId||s.catId||s.id||'').toUpperCase();
    return _cid==='LGD01'||_cid.startsWith('LGD01_')||_cid.startsWith('LGD01-');
  });
  if(!_hasTurtleShip){
    notify(I18N.t('notify.needTurtleShip'),'err');
    openModal(I18N.t('modal.bossEntryBlocked'),
      `<div style="text-align:center;padding:14px">
        <div style="font-size:46px;margin-bottom:8px">🛡️</div>
        <div style="color:var(--yellow);font-weight:bold;font-size:16px;margin-bottom:8px">${I18N.t('ui.needTurtleShipTitle')}</div>
        <div style="color:var(--dim);font-size:13px;line-height:1.8;word-break:keep-all">${I18N.t('ui.needTurtleShipDesc')}</div>
      </div>`,
      [{txt:I18N.t('btn.confirm'),fn:closeModal,cls:'btn-gold'}]);
    return;
  }
  // 첫 도전이 아니라면 (재도전) 보이드 크리스탈 필요
  if(!_isFirst&&(!G.voidCrystal||G.voidCrystal<=0)){
    notify(I18N.t('notify.noVoidCrystal'),'err');return;
  }
  const _hint=_isFirst
    ?`<div style="color:#ffd700;font-weight:bold;margin-bottom:6px">${I18N.t('ui.firstEarthEntry')}</div><div style="color:var(--dim);margin-bottom:12px">${I18N.t('ui.firstBossFree')}<br>${I18N.t('ui.winLiftsBlockade')}</div>`
    :`<div style="color:var(--dim);margin-bottom:12px">${I18N.t('ui.finalBossIntro')}<br>${I18N.t('ui.winClearsGame')}</div><div style="font-size:13px;color:var(--yellow)">${I18N.t('ui.crystalsOwnedFull',{n:G.voidCrystal||0})}</div>`;
  openModal(I18N.t('modal.ursaFinalFight'),
    `<div style="text-align:center;padding:12px">
      <div style="font-size:48px;margin-bottom:8px">🌀</div>
      <div style="color:var(--red);font-weight:bold;margin-bottom:8px">${I18N.t('ui.extremeDangerWarn')}</div>
      ${_hint}
    </div>`,
    [{txt:I18N.t('ursa.fightEnter'),fn:()=>{if(!_isFirst)G.voidCrystal--;closeModal();showUrsaMajorIntro();},cls:'btn-red'},
     {txt:I18N.t('btn.cancel'),fn:closeModal,cls:'btn-sm'}]);
}
// 우르사 메이저 보스 대사 인트로 — 페이즈 6 컷씬(p6_ch13b)으로 전면 교체 (사용자 요청 2026-06-07)
// 기존 8단계 보스 대사는 phase6_quests.js / PHASE6_CUTSCENES_KO.p6_ch13b 로 이관.
// 페이즈 6 컷씬 미로드 환경(이전 세이브 등)을 위해 8단계 폴백 로직 유지.
function showUrsaMajorIntro(){
  try{AudioMgr.playBgm('boss');}catch(e){}
  // 페이즈 6 컷씬 우선 — STORY_SCENES_PC 가 있고 p6_ch13b 가 로드돼 있으면 그것으로 재생
  if(window.STORY_SCENES_PC && typeof window.STORY_SCENES_PC.triggerScene==='function'
     && window.PHASE6_CUTSCENES_KO && window.PHASE6_CUTSCENES_KO['p6_ch13b']){
    window.STORY_SCENES_PC.forceReplayScene
      ? window.STORY_SCENES_PC.forceReplayScene('p6_ch13b')
      : window.STORY_SCENES_PC.triggerScene('p6_ch13b', ()=>{
          try{startCombat({id:'BOSS',nm:I18N.t('ursa.bossName'),ring:5});}catch(e){notify(I18N.t('notify.bossStartErr',{err:e.message}),'err');}
        });
    // STORY_SCENES_PC triggerScene 은 onDone 콜백을 지원 — 컷씬 종료 후 자동 전투 진입
    // forceReplayScene 은 onDone 없으므로, 폴백으로 4초 후 전투 진입
    if(window.STORY_SCENES_PC.forceReplayScene){
      setTimeout(()=>{
        try{startCombat({id:'BOSS',nm:I18N.t('ursa.bossName'),ring:5});}catch(e){notify(I18N.t('notify.bossStartErr',{err:e.message}),'err');}
      }, 4000);
    }
    return;
  }
  // ── 폴백 (페이즈 6 미로드 환경): 기존 8단계 i18n 대사 ──
  const cmdName=G.profile?.name||I18N.t('ui.commander');
  const _bossEnemies=[];
  if(typeof BOSS!=='undefined')_bossEnemies.push({...BOSS,id:'BOSS_MAIN',isEnemy:true,nm:BOSS.nm,tier:BOSS.tier,maxHP:BOSS.maxHP,maxSH:BOSS.maxSH,ATT:BOSS.ATT,INT:BOSS.INT,TEC:BOSS.TEC});
  if(typeof BOSS_ESCORT!=='undefined')BOSS_ESCORT.forEach(e=>_bossEnemies.push({...e}));
  const _bossSpecHTML=(typeof _formatEnemyPreview==='function')?_formatEnemyPreview(_bossEnemies):'';
  const _spUrsa=I18N.t('speaker.ursaMajor');
  const _spBk=I18N.t('speaker.baekgu');
  const lines=[
    {sp:I18N.t('actTrans.2.sysSp'),tx:I18N.t('ursa.intro.sys1')},
    {sp:_spUrsa,tx:I18N.t('ursa.intro.ursa1')},
    {sp:_spUrsa,tx:I18N.t('ursa.intro.ursa2')},
    {sp:cmdName,tx:I18N.t('ursa.intro.cmd1')},
    {sp:_spUrsa,tx:I18N.t('ursa.intro.ursa3')},
    {sp:_spUrsa,tx:I18N.t('ursa.intro.ursa4')},
    {sp:_spBk,tx:I18N.t('ursa.intro.bk')},
    {sp:cmdName,tx:I18N.t('ursa.intro.cmd2')}
  ];
  let _idx=0;
  function _renderLine(){
    const l=lines[_idx];
    const _isUrsa2=(l.sp==='우르사 메이저'||l.sp==='Ursa Major');
    const _isSys2=(l.sp==='시스템'||l.sp==='System');
    const _isBk2=(l.sp==='백구'||l.sp==='Baekgu');
    const spColor=_isUrsa2?'#ff3366':_isSys2?'var(--cyan)':_isBk2?'var(--cyan)':'var(--gold)';
    const spIc=_isUrsa2?'☠️':_isSys2?'⚡':_isBk2?'🐕':'⚑';
    const portrait=charPortraitHTML(l.sp,spIc,192,spColor);
    const isFinal=_idx===lines.length-1;
    openModal(I18N.t('modal.ursaFinalShowdown'),
      `<div style="padding:14px;min-height:220px">
        <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;justify-content:center;margin-bottom:14px;padding:14px;background:linear-gradient(135deg,rgba(255,30,80,.08),rgba(20,5,5,.7));border:1px solid rgba(255,80,80,.45);border-radius:10px;box-shadow:0 0 18px rgba(255,40,40,.2)">
          ${portrait}
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;color:${spColor};font-weight:bold;margin-bottom:6px;letter-spacing:1px;word-break:keep-all;overflow-wrap:break-word">${l.sp}</div>
            <div style="font-size:17px;color:var(--yellow);line-height:1.8;word-break:keep-all;overflow-wrap:break-word;hyphens:none">"${l.tx}"</div>
          </div>
        </div>
        ${isFinal?_bossSpecHTML:''}
        <div style="text-align:center;font-size:11px;color:var(--dim)">${_idx+1} / ${lines.length}</div>
      </div>`,
      [
        _idx<lines.length-1
          ? {txt:I18N.t('ui.continueArrow'),fn:()=>{_idx++;_renderLine();},cls:'btn-red'}
          : {txt:I18N.t('ursa.startFinalBattle'),fn:()=>{closeModal();_safeCombatEntry(function(){startCombat({id:"BOSS",nm:I18N.t("ursa.bossName"),ring:5});},"startCombat(BOSS)");},cls:'btn-red'},
        {txt:I18N.t('ursa.later'),fn:()=>{closeModal();G.voidCrystal++;notify(I18N.t('notify.voidCrystalRefund'),'warn');},cls:'btn-sm'}
      ],
      {bossfight:true}
    );
  }
  _renderLine();
}

// ─── 우르사 메이저 2페이즈 진입 팝업 (호위 전멸 → 본체 각성) ───
function _showUrsaPhase2Popup(onClose){
  const _line=I18N.t('ursa.phase2Line');
  // 사용자 요청 (2026-06-06): 영문판에서 화자명 한글 잔재 제거 — i18n speaker 라우팅 (CHAR_PORTRAITS에 EN alias 있음)
  const portrait=(typeof charPortraitHTML==='function')?charPortraitHTML(I18N.t('speaker.ursaMajor'),'☠️',216,'#ff3366'):'';
  openModal(I18N.t('modal.ursaPhase2'),
    `<div style="padding:14px;min-height:160px">
      <div style="display:flex;gap:26px;align-items:center;flex-wrap:wrap;justify-content:center;padding:16px;background:linear-gradient(135deg,rgba(255,30,80,.1),rgba(20,5,5,.88));border:1.5px solid rgba(255,80,80,.6);border-radius:12px;box-shadow:0 0 26px rgba(255,40,40,.4)">
        ${portrait}
        <div style="flex:1;min-width:200px">
          <div style="font-size:14px;color:#ff3366;font-weight:bold;margin-bottom:8px;letter-spacing:2px">${I18N.t('ursa.bossNameStory')}</div>
          <div style="font-size:19px;color:var(--yellow);line-height:1.85;word-break:keep-all;text-shadow:0 0 8px rgba(255,60,60,.45)">"${_line}"</div>
          <div style="font-size:12px;color:#ff9999;margin-top:10px">${I18N.t('ui.ursaShieldDown')}</div>
        </div>
      </div>
    </div>`,
    [{txt:I18N.t('ui.keepFighting'),fn:()=>{closeModal();if(typeof onClose==='function')onClose();},cls:'btn-red'}],
    {bossfight:true}
  );
}
// ─── 블랙팔콘 히든전: 호위 전멸 → 본체 각성 팝업 ───
function _showBlackfalconPhase2Popup(onClose){
  const _line=I18N.t('falcon.afterUrsa');
  // 사용자 요청 (2026-06-06): 영문판 화자명 한글 잔재 제거 — i18n 라우팅
  const portrait=(typeof charPortraitHTML==='function')?charPortraitHTML(I18N.t('speaker.blackfalcon'),'🌑',216,'#cc66ff'):'';
  openModal(I18N.t('modal.blackfalconAwaken'),
    `<div style="padding:14px;min-height:160px">
      <div style="display:flex;gap:26px;align-items:center;flex-wrap:wrap;justify-content:center;padding:16px;background:linear-gradient(135deg,rgba(120,0,180,.18),rgba(8,2,18,.92));border:1.5px solid rgba(204,102,255,.6);border-radius:12px;box-shadow:0 0 26px rgba(204,102,255,.4)">
        ${portrait}
        <div style="flex:1;min-width:200px">
          <div style="font-size:14px;color:#cc66ff;font-weight:bold;margin-bottom:8px;letter-spacing:2px">${I18N.t('falcon.bossNameStory')}</div>
          <div style="font-size:19px;color:#e0c0ff;line-height:1.85;word-break:keep-all;text-shadow:0 0 8px rgba(204,102,255,.5)">"${_line}"</div>
          <div style="font-size:12px;color:#e0b8ff;margin-top:10px">${I18N.t('ui.falconCoreOpen')}</div>
        </div>
      </div>
    </div>`,
    [{txt:I18N.t('ui.keepFighting'),fn:()=>{closeModal();if(typeof onClose==='function')onClose();},cls:'btn-red'}],
    {bossfight:true}
  );
}
// ─── 보스 격파 에필로그 — 지구 해방 엔딩 (격정적 대사 → onDone 콜백) ─
// 우르사 메이저 단말마 → 백구·주인공 격정 대사 → 지구 해방 선언으로 완벽 마무리
// ※ 보이드/추가 컨텐츠 언급 제거 — 우르사 메이저 격파가 진정한 엔딩
function showBossVictoryEpilogue(onDone){
  const cmdName=G.profile?.name||I18N.t('ui.commander');
  // 사용자 요청 (2026-06-06): 영문판 화자명 한글 잔재 제거 — i18n 라우팅
  const _spUrsa=I18N.t('speaker.ursaMajor');
  const _spBk=I18N.t('speaker.baekgu');
  const lines=[
    {sp:_spUrsa,tx:I18N.t('ursa.outro.1')},
    {sp:_spUrsa,tx:I18N.t('ursa.outro.2')},
    {sp:_spUrsa,tx:I18N.t('ursa.outro.3')},
    {sp:I18N.t('actTrans.2.sysSp'),tx:I18N.t('ursa.outro.sys1')},
    {sp:_spBk,tx:I18N.t('ui.victoryLine1',{nm:cmdName})},
    {sp:_spBk,tx:I18N.t('ursa.outro.bk')},
    {sp:I18N.t('actTrans.2.sysSp'),tx:I18N.t('ursa.outro.sys2')},
    {sp:cmdName,tx:I18N.t('ursa.outro.cmd1')},
    {sp:cmdName,tx:I18N.t('ursa.outro.cmd2')},
    {sp:_spBk,tx:I18N.t('ui.victoryLine2',{nm:cmdName})},
    {sp:cmdName,tx:I18N.t('ursa.outro.cmd3')},
    {sp:I18N.t('actTrans.2.sysSp'),tx:I18N.t('ursa.outro.sys3')}
  ];
  let _idx=0;
  function _renderLine(){
    const l=lines[_idx];
    const isFinal=_idx===lines.length-1;
    const isUrsa=l.sp==='우르사 메이저'||l.sp==='Ursa Major';
    const isSys=l.sp==='시스템'||l.sp==='System';
    const isBaekgu=(l.sp=='백구'||l.sp=='Baekgu');
    const spColor=isUrsa?'#ff3366':isSys?'#66ffcc':isBaekgu?'var(--cyan)':'var(--gold)';
    const spIc=isUrsa?'💀':isSys?'⚡':isBaekgu?'🐕':'⚑';
    const portrait=charPortraitHTML(l.sp,spIc,216,spColor);
    // 배경 그라데이션: 우르사=어두운 적색 / 시스템=황금 / 그 외=영광스러운 분위기
    const bgGrad=isUrsa
      ?'linear-gradient(135deg,rgba(80,10,10,.85),rgba(15,2,2,.95))'
      :isSys
        ?'linear-gradient(135deg,rgba(255,215,0,.15),rgba(20,30,40,.85))'
        :'linear-gradient(135deg,rgba(40,80,140,.25),rgba(10,15,30,.9))';
    const borderColor=isUrsa?'rgba(255,80,80,.6)':isSys?'rgba(255,215,0,.55)':'rgba(120,180,255,.5)';
    openModal(I18N.t('modal.finalEpilogue'),
      `<div style="padding:14px;min-height:240px">
        <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;justify-content:center;margin-bottom:14px;padding:16px;background:${bgGrad};border:1.5px solid ${borderColor};border-radius:12px;box-shadow:0 0 24px ${borderColor}">
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
          ? {txt:I18N.t('outro.confirmReward'),fn:()=>{closeModal();if(typeof onDone==='function')onDone();},cls:'btn-gold'}
          : {txt:I18N.t('ui.continueArrow'),fn:()=>{_idx++;_renderLine();},cls:'btn-gold'}
      ]
    );
  }
  _renderLine();
}

// ─── 보스 격파 특별 셀레브레이션 팝업 (지구 해방 선언) ──────────
function showBossCelebration(onDone){
  const cmdName=G.profile?.name||I18N.t('ui.commander');
  const co=G.profile?.company||I18N.t('profile.companyGalactic');
  const turn=G.turn||0;
  // 함대 통계
  const fleetCount=(G.fleet||[]).length;
  const heroCount=(G.heroes||[]).length;
  const survivors=(G.fleet||[]).filter(s=>s.hp>0).length;
  const html=`
    <div style="padding:22px 18px;text-align:center;background:radial-gradient(ellipse at center,rgba(20,20,60,.6),rgba(0,0,0,.95));border-radius:8px">
      <div style="font-size:64px;margin-bottom:8px;animation:pulse 1.4s infinite;text-shadow:0 0 30px gold,0 0 60px gold">🌍</div>
      <div style="font-size:30px;font-weight:bold;background:linear-gradient(90deg,#ffd700,#ff66cc,#66ffff,#ffd700);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;letter-spacing:8px;margin-bottom:6px;background-size:200% 100%;animation:shimmer 3s linear infinite">${I18N.t('ui.earthFreedom')}</div>
      <div style="font-size:13px;color:var(--cyan);letter-spacing:3px;margin-bottom:18px">EARTH LIBERATED · 100Y SIEGE ENDED</div>
      <div style="display:flex;justify-content:space-around;flex-wrap:wrap;gap:14px;margin:18px 0;padding:14px;background:rgba(255,215,0,.06);border:1px solid rgba(255,215,0,.3);border-radius:10px">
        <div><div style="font-size:11px;color:var(--dim)">${I18N.t('ui.turnsRequired')}</div><div style="font-size:22px;color:var(--gold);font-weight:bold">${turn}</div></div>
        <div><div style="font-size:11px;color:var(--dim)">${I18N.t('ui.shipsAlive')}</div><div style="font-size:22px;color:#66ff99;font-weight:bold">${survivors}/${fleetCount}</div></div>
        <div><div style="font-size:11px;color:var(--dim)">${I18N.t('ui.recruitedHeroes2')}</div><div style="font-size:22px;color:#ff99ff;font-weight:bold">${heroCount}</div></div>
        <div><div style="font-size:11px;color:var(--dim)">${I18N.t('ui.gainedCredits')}</div><div style="font-size:22px;color:var(--gold);font-weight:bold">₡${(G.credits||0).toLocaleString()}</div></div>
      </div>
      <div style="font-size:15px;color:var(--yellow);line-height:1.8;margin:14px 0;padding:14px;background:rgba(255,255,255,.02);border-left:3px solid var(--gold);text-align:left">
        ${I18N.t('ui.endingFleetText',{co,nm:cmdName})}<br><br>
        ${I18N.t('ui.endingLine1')}<br>
        ${I18N.t('ui.endingLine2')}<br><br>
        <span style="color:#ffd700;font-weight:bold">${I18N.t('ui.endingDedication',{nm:cmdName})}</span>
      </div>
      <div style="font-size:13px;color:var(--gold);margin-top:18px;letter-spacing:4px;text-shadow:0 0 12px rgba(255,215,0,.5)">— THE END —</div>
      <div style="font-size:11px;color:var(--dim);margin-top:6px;letter-spacing:3px">— DESTINATION EARTH —</div>
    </div>
    <style>
      @keyframes shimmer{0%{background-position:0% 50%}100%{background-position:200% 50%}}
    </style>`;
  openModal(I18N.t('modal.victoryDeclaration'),html,
    [{txt:I18N.t('outro.reportConfirm'),fn:()=>{closeModal();if(typeof onDone==='function')onDone();},cls:'btn-gold'}],
    {bossfight:true}
  );
  try{AudioMgr.playSfx('coin',{vol:0.9,cooldown:0});}catch(e){}
  try{AudioMgr.playSfx('notify',{vol:0.9,cooldown:0});}catch(e){}
}

// ─── 엔딩 크레딧 시퀀스 → js/modules/ending-credits.js 로 분할 (Phase A1, 2026-06-10) ───
//   showEndingCredits / showFinalEndingCredits 둘 다 window 전역에 노출됨

// 보이드의 창 (MMV01) 인벤토리 지급 + (기함 빈 슬롯 있으면) 즉시 장착
function _grantVoidSpear(){
  if(!G.inventory)G.inventory=[];
  // 이미 보유 또는 장착돼 있으면 중복 지급 방지
  const _invHas=(G.inventory||[]).find(i=>i.id==='MMV01'&&i.qty>0);
  const _equipped=(G.fleet||[]).some(s=>(s.parts||[]).includes('MMV01'));
  if(!_invHas&&!_equipped){
    G.inventory.push({id:'MMV01',qty:1});
  }
  // 기함(0번) 에 빈 무기 슬롯이 있고 아직 미장착이면 자동 장착
  const flag=G.fleet&&G.fleet[0];
  if(flag&&!(flag.parts||[]).includes('MMV01')){
    flag.parts=flag.parts||[];
    // 파츠 슬롯 = 행 수 × 2 (대형 보통 6슬롯, partsRows=4 면 8, partsRows=5 면 10)
    const _rows=(typeof getShipPartsGridRows==='function')?getShipPartsGridRows(flag):3;
    const _maxSlots=_rows*2;
    if(flag.parts.length<_maxSlots){
      flag.parts.push('MMV01');
      // 인벤토리에서 1개 차감 (장착했으므로)
      const _idx=G.inventory.findIndex(i=>i.id==='MMV01'&&i.qty>0);
      if(_idx>=0){G.inventory[_idx].qty--;if(G.inventory[_idx].qty<=0)G.inventory.splice(_idx,1);}
      notify(I18N.t('notify.voidSpearAutoEquip'),'gold');
    }else{
      notify(I18N.t('notify.voidSpearInvFlagshipFull'),'gold');
    }
  }else if(!_equipped){
    notify(I18N.t('notify.voidSpearInv'),'gold');
  }
  G._voidSpearObtained=true;
  try{saveGame(true);}catch(e){}
}

// ─── ACT 5 종료: 보이드의 심연 → 흰 화면 → 엔딩 음악 → 최종 크레딧 ───
function _enterBlackHoleFinalTest(){
  // ACT 5 진입 + 엔딩 음악
  G.act=Math.max(G.act||1,5);
  // 엔딩 진입 — 전투 잔여 SFX·이펙트 완전 종료
  try{if(typeof combatState!=='undefined'&&combatState)combatState.done=true;}catch(e){}
  try{AudioMgr.stopAllSfx();}catch(e){}
  try{if(typeof _cbEffects!=='undefined')_cbEffects=[];}catch(e){}
  try{AudioMgr.playBgm('end');}catch(e){}
  // 1) 흰 화면 전체 오버레이 (페이드인)
  const overlay=document.createElement('div');
  overlay.id='_bh-final-overlay';
  overlay.style.cssText=[
    'position:fixed','left:0','top:0','right:0','bottom:0','width:100vw','height:100vh',
    'background:radial-gradient(circle at center, #ffffff 0%, #ffeecc 60%, #ffd88a 100%)',
    'z-index:99999','opacity:0','transition:opacity 2.5s ease-in',
    'display:flex','flex-direction:column','align-items:center','justify-content:center',
    'pointer-events:auto','color:#000','font-family:Malgun Gothic, sans-serif','padding:40px',
    'animation:_bhWhitePulse 4s ease-in-out infinite'
  ].join(';');
  overlay.innerHTML=`
    <style>
      @keyframes _bhWhitePulse{
        0%,100%{filter:brightness(1.0)}
        50%{filter:brightness(1.15)}
      }
      @keyframes _bhFadeUp{
        from{opacity:0;transform:translateY(20px)}
        to{opacity:1;transform:translateY(0)}
      }
    </style>
    <div id="_bh-final-content" style="opacity:0;transition:opacity 2s ease-in;max-width:820px;text-align:center">
      <div style="font-size:13px;color:#888;letter-spacing:8px;margin-bottom:22px;text-transform:uppercase">${I18N.t('ui.act5DashSubtitle')}</div>
      <div style="font-size:36px;font-weight:bold;color:#1a1a1a;margin-bottom:36px;letter-spacing:4px;text-shadow:0 0 24px rgba(255,255,255,.8)">${I18N.t('ui.lastMessage')}</div>
      <div id="_bh-final-msg" style="font-size:24px;color:#1a1a1a;line-height:2.2;background:rgba(255,255,255,.7);padding:36px 40px;border-radius:12px;border:2px solid rgba(255,200,100,.5);margin-bottom:28px;word-break:keep-all;font-weight:500;letter-spacing:0.5px;box-shadow:0 8px 32px rgba(255,180,80,.3)"></div>
      <div id="_bh-final-btn-wrap" style="opacity:0;transition:opacity 1s ease-in;margin-top:30px"></div>
    </div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(()=>{overlay.style.opacity='1';});
  // 메시지 타이핑 효과 — 사용자 명세 텍스트
  const _msgFull=I18N.t('bh.finalMsg');
  const contentEl=overlay.querySelector('#_bh-final-content');
  const msgEl=overlay.querySelector('#_bh-final-msg');
  const btnWrap=overlay.querySelector('#_bh-final-btn-wrap');
  setTimeout(()=>{contentEl.style.opacity='1';},2200);
  setTimeout(()=>{
    let i=0;
    const _typeTick=()=>{
      if(i>=_msgFull.length){
        btnWrap.style.opacity='1';
        btnWrap.innerHTML='<button id="_bh-final-claim" style="font-size:16px;padding:14px 32px;background:linear-gradient(135deg,#1a1a1a,#3a0030);color:#fff;border:2px solid rgba(200,100,255,.5);border-radius:8px;cursor:pointer;letter-spacing:4px;box-shadow:0 4px 16px rgba(180,0,255,.4);transition:all .3s" onmouseover="this.style.background=\'linear-gradient(135deg,#000,#4a0040)\';this.style.transform=\'translateY(-2px)\'" onmouseout="this.style.background=\'linear-gradient(135deg,#1a1a1a,#3a0030)\';this.style.transform=\'translateY(0)\'">'+I18N.t('bh.finalBattleBtn')+'</button>';
        const claimBtn=overlay.querySelector('#_bh-final-claim');
        claimBtn.onclick=()=>{
          overlay.style.transition='opacity 2.5s ease-out';
          overlay.style.opacity='0';
          setTimeout(()=>{
            try{overlay.remove();}catch(e){}
            // ★ 변경: 보상·엔딩으로 바로 가지 않고 블랙홀 보이드 함대 전투 진입
            try{startBlackHoleFleetCombat();}catch(e){console.warn(e);}
          },2700);
        };
        return;
      }
      msgEl.innerHTML=_msgFull.substring(0,++i).replace(/\n/g,'<br>');
      setTimeout(_typeTick,55);
    };
    _typeTick();
  },4000);
}
// ─── 블랙홀 보이드 함대 전투 (ACT 5 최종전) ──────────────────────────
// 흐름: _enterBlackHoleFinalTest 메시지 → "마지막 전투" 클릭 → 이 함수 호출 →
//       전투 → 승리 시 _finishCombat에서 _isBlackHoleFinal 플래그 감지 →
//       _grantBlackHoleRewardsSilent + showFinalEndingCredits
// 능력치: 아군 함대 총합의 ×15 (히든 보이드 보스 ×10보다 강한 최종 보스 페이즈)
function startBlackHoleFleetCombat(){
  // 보이드의 창(MMV01) 자동 지급 — 최종 블랙홀 결전에서 활용 (사용자 명세, 누락 보정)
  try{
    if(!G.inventory)G.inventory=[];
    const _hasSpear=G.inventory.find(i=>i.id==='MMV01'&&i.qty>0)
                  ||(G.fleet||[]).some(s=>(s.parts||[]).includes('MMV01'));
    if(!_hasSpear){
      G.inventory.push({id:'MMV01',qty:1});
      notify(I18N.t('notify.voidSpearAutoInv'),'gold');
      try{baekgu(I18N.t('baekgu.voidSpearGranted'));}catch(e){}
    }
  }catch(e){}
  const pd={id:'P-BLACKHOLE',nm:I18N.t('bh.planetName'),ring:7,void:true,f:'F07'};
  // ── 사용자 명세: 16척 보이드 심연 함대 (사용자 요청 — 함대 풀 구성)
  //    거북선×3 / 워덴클리프×3 / 렐러티비티×3 / 우르사메이저×2 / 블랙팔콘×2 / 대형 H10·H11·H12 각 1
  //    능력치는 카탈로그와 동일, HP만 "우리 함대 총 HP의 2배"가 되도록 비례 스케일
  const _hNm=id=>{const c=(typeof SHIP_CATALOG!=='undefined')&&SHIP_CATALOG.find(s=>s.id===id);return (c&&(typeof shipDisplayNm==='function'?shipDisplayNm(c):c.nm))||id;};
  const _mkN=(n,fn)=>Array.from({length:n},(_,k)=>fn(k+1));
  const _fleetSpec=[
    ..._mkN(4,k=>({catId:'URSA',nm:(k===1?I18N.t('enemy.ursaMythic'):I18N.t('enemy.ursaMythic2')+' '+k),baseHP:1000000,SH:120000,ATT:580,INT:340,TEC:220,DEF:120,armorTier:60,shieldTier:50})),
    ..._mkN(4,k=>({catId:'BLACKFALCON',nm:(k===1?I18N.t('enemy.blackfalconMythic'):I18N.t('enemy.blackfalconMythic2')+' '+k),baseHP:9700000,SH:300000,ATT:32000,INT:1200,TEC:560,DEF:200,armorTier:80,shieldTier:60})),
    ..._mkN(4,k=>({catId:'LGD03',nm:I18N.t('enemy.lgd03')+(k>1?' '+k:''),baseHP:245000,SH:90000,ATT:306,INT:295,TEC:255,DEF:80,armorTier:40,shieldTier:40})),
    ..._mkN(4,k=>({catId:'LGD01',nm:I18N.t('enemy.lgd01')+(k>1?' '+k:''),baseHP:260000,SH:65000,ATT:245,INT:235,TEC:210,DEF:80,armorTier:40,shieldTier:40})),
    ...['H01','H03','H05','H07','H09','H10','H11','H12'].map(hid=>({
      catId:hid,tier:'대형',
      nm:(hid==='H10'?I18N.t('enemy.leviathan'):hid==='H11'?I18N.t('enemy.armada'):hid==='H12'?I18N.t('enemy.ursaCrusher'):_hNm(hid)),
      baseHP:hid==='H12'?75000:hid==='H10'?45000:40000,
      SH:hid==='H12'?25000:20000,
      ATT:hid==='H12'?120:100,INT:110,TEC:95,DEF:50,armorTier:30,shieldTier:32
    }))
  ];
  // 우리 함대 총 HP의 2배 = 적 총 HP 목표치. 5척 카탈로그 비율대로 분배
  const _fp=(typeof calcFleetTotalPower==='function')?calcFleetTotalPower():{hp:0,atk:0,sh:0};
  const _playerTotalHP=Math.max(50000,_fp.hp||0);  // 최소 5만 (저레벨 안전장치)
  const _targetTotalEnemyHP=_playerTotalHP*2;
  const _totalCatHP=_fleetSpec.reduce((s,sp)=>s+sp.baseHP,0);
  const _scale=_targetTotalEnemyHP/_totalCatHP;
  const enemies=_fleetSpec.map((sp,i)=>{
    const _hp=Math.max(1000,Math.round(sp.baseHP*_scale));
    const isFlagship=(sp.catId==='BLACKFALCON');  // 블랙팔콘이 기함(보스)
    return {
      id:`BH_${sp.catId}_${Date.now()+i}`,
      catalogId:sp.catId,
      catId:sp.catId,
      nm:sp.nm,
      tier:sp.tier||'신화',
      isEnemy:true,
      voidBoss:isFlagship,
      hp:_hp,maxHP:_hp,HP:_hp,
      sh:sp.SH,maxSH:sp.SH,
      ATT:sp.ATT,INT:sp.INT,TEC:sp.TEC,
      DEF:sp.DEF,
      armorTier:sp.armorTier,shieldTier:sp.shieldTier,
      LOY:0,parts:[],crewIds:[],
      _isBlackHoleFleet:true
    };
  });
  const players=G.fleet.map(s=>{
    const st=getShipStats(s);
    const _wpn=PARTS.find(p=>p.cat==='weapon'&&(s.parts||[]).includes(p.id));
    const _wt=_wpn?(_wpn.tier||1):1;
    const _wtype=_wpn?(_wpn.wtype||'laser'):'laser';
    const _wrar=_wpn?(_wpn.rarity||''):'';
    const _shp=PARTS.find(p=>p.cat==='shield'&&(s.parts||[]).includes(p.id));
    const _shTier=_shp?(_shp.tier||0):0;
    const _arp=PARTS.find(p=>p.cat==='armor'&&(s.parts||[]).includes(p.id));
    const _arTier=_arp?(_arp.tier||0):0;
    return{...s,isEnemy:false,hp:s.hp,maxHP:st.HP,sh:s.sh,maxSH:st.maxSH,ATT:st.ATT,INT:st.INT,TEC:st.TEC,DEF:st.DEF||0,wtype:_wtype,wpnTier:_wt,wpnRarity:_wrar,shieldTier:_shTier,armorTier:_arTier};
  });
  combatState={players,enemies,turn:0,done:false,log:[],planetDef:pd,
               isBoss:false,isVoidBoss:false,_isBlackHoleFinal:true,
               _rndSeed:Date.now()%9999,_entranceT:1,_entranceDone:true,
               _planetId:G.currentPlanet};
  renderCombatView(document.getElementById('hub-body'));
  setHubNav('combat');updateHUD();
  _cbEffects=[];_unitPos={};
  if(_cbAnimReq){cancelAnimationFrame(_cbAnimReq);_cbAnimReq=null;}
  combatState._sunsinUsed=false;
  sfxAlert();try{AudioMgr.playBgm('boss');}catch(e){}
  _preloadCombatImages();
  requestAnimationFrame(()=>{
    initCombatCanvas();
    const t=document.getElementById('cb-title');
    if(t)t.textContent=I18N.t('bh.combatTitle');
    addCombatLog(I18N.t('combat.legendFleetAppears'),'err');
    addCombatLog(I18N.t('combat.legendFleetHpHint'),'gold');
    try{baekgu(I18N.t('baekgu.mirrorFleetAwoken'));}catch(e){}
    setTimeout(runCombatTurn,800);
  });
}
try{if(typeof window!=='undefined')window.startBlackHoleFleetCombat=startBlackHoleFleetCombat;}catch(e){}

// 보상 즉시 지급 (모달 없이) — 엔딩 시퀀스로 바로 진입
function _grantBlackHoleRewardsSilent(){
  // 검은 팔콘 + 신화 파츠 5점 지급
  const lgd3=SHIP_CATALOG.find(s=>s.id==='LGD03')||{maxHP:245000,maxSH:90000,ATT:306,INT:295,TEC:255};
  const _mul=1.5;
  const hiddenShip={
    id:'HIDDEN_FALCON_'+Date.now(),
    catalogId:'HIDDEN_FALCON',
    nm:I18N.t('bh.blackFalconReward'),
    tier:'소형',
    maxHP:Math.round(lgd3.maxHP*_mul),hp:Math.round(lgd3.maxHP*_mul),
    maxSH:Math.round(lgd3.maxSH*_mul),sh:Math.round(lgd3.maxSH*_mul),
    ATT:Math.round(lgd3.ATT*_mul),INT:Math.round(lgd3.INT*_mul),TEC:Math.round(lgd3.TEC*_mul),
    HP:Math.round(lgd3.maxHP*_mul),DEF:150,LOY:80,
    parts:[],crewIds:[],cargoSlots:5,
    crafted:false,_isHiddenFalcon:true
  };
  try{addShipToFleet(hiddenShip);}catch(e){}
  if(!G.inventory)G.inventory=[];
  ['MW01','MS01','MA01','ME01','RB10'].forEach(pid=>{
    const inv=G.inventory.find(i=>i.id===pid);
    if(inv)inv.qty++;else G.inventory.push({id:pid,qty:1});
  });
  G._finalTestComplete=true;
}

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
