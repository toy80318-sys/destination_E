// ═══════════════════════════════════════════════════════════════════
// DESTINATION EARTH — PRNG & 은하 지도 생성 (game.js 에서 분할, 2026-06-17)
//   · mulberry32         : 결정론적 32bit PRNG (quest-gen·starmap·tavern 에서 사용)
//   · generateGalaxy     : 오각형 링 그리드 행성 좌표 생성 (PLANET_DEF 기반)
//   · buildConnections   : 행성 간 항로(연결) 생성 (2 UNIT 이내 인접 + 보이드 특별 연결)
// game.js 와 동일하게 "평범한 스크립트"로 두어 세 함수를 전역에 그대로 노출한다.
//   호출은 모두 런타임(initGame·save-slots·starmap 등) — 로드 시점 호출 없음.
//   index.html 에서 이 파일을 game.js·starmap.js 보다 먼저(데이터 로드 직후) 로드한다.
// ═══════════════════════════════════════════════════════════════════

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

// 명시적 전역 노출 (평범한 스크립트라 선언만으로도 전역이지만, 모듈 규약에 맞춰 노출)
if(typeof window!=='undefined'){
  window.mulberry32=mulberry32;
  window.generateGalaxy=generateGalaxy;
  window.buildConnections=buildConnections;
}
