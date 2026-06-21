// ══════════════════════════════════════════════════════════════════
// STARMAP 모듈 — game.js에서 분할 (2026-06-08, v1.0.0-beta.88)
//   · 은하 지도 렌더링 + 행성 이동 + 소행성대 미니게임 + 적대 행성 진입
//   · 38개 함수, 약 2,100줄
//   · 모듈 내부 상태: mapCtx, mapCV, mapOffX, mapOffY, map3dRotX, map3dRotY, mapDragMode
//   · window 노출: renderMapView, showHostilePlanetBriefing, _buildHostilePlanetEnemies
//                  travelTo, resetMapView, mapZoom, toggleMapDragMode (HTML onclick용)
// 의존: window.G, window.I18N, window.PLANET_DEF, window.HEROES, window.AudioMgr,
//       window.updateHUD, window.openModal, window.closeModal, window.notify, window.baekgu,
//       window.saveGame, window.hubTab, window.imgOrEmoji, window.shipImgSrc,
//       window.generateShopStock, window.spawnPhasedQuests, window._GAME_VER
// ══════════════════════════════════════════════════════════════════
(function(){
  if(typeof window==='undefined')return;
  // 모듈 내부 상태 (캡슐화)
  let mapCtx,mapCV,mapOffX=0,mapOffY=0;
  let map3dRotX=0.62,map3dRotY=0.0,mapDragMode='pan';   // 수평 디스크 기준 기본 피치(위에서 내려다보는 틸트) — 사용자 요청 2026-06-16
  let _travelAnimFor=null;  // 이동 모션 진행 중 목적지 (재진입 가드)
  function renderMapView(body){
    body.innerHTML=`<div style="height:48px;background:rgba(13,26,42,.97);border-bottom:1px solid var(--bdr);display:flex;align-items:center;gap:8px;padding:0 14px;flex-shrink:0">
      <span style="color:var(--yellow);font-weight:bold;font-size:16px">${I18N.t('map.title')}</span>
      <span style="color:var(--dim);font-size:12px;flex:1" id="map-cost"></span>
      <span style="font-size:11px;color:var(--muted)">${I18N.t('map.controlsHint')}</span>
      <button class="btn btn-sm" onclick="resetMapView()" style="color:var(--dim)" title="${I18N.t('map.resetView')}">⌂</button>
      <button class="btn btn-sm btn-gold" id="map-go" onclick="travelTo()" disabled>${I18N.t('map.move')}</button>
    </div>
    <div style="flex:1;position:relative;overflow:hidden;width:100%;min-height:0;height:0" id="map-wrap">
      <canvas id="map-cv" style="display:block;cursor:crosshair"></canvas>
      <!-- 우측 사이드 패널: 행성 정보 + 판매 특산물 + 판매 함선 (세로 스크롤) -->
      <div id="map-side" style="position:absolute;right:10px;top:10px;bottom:10px;width:230px;display:flex;flex-direction:column;gap:8px;pointer-events:auto;z-index:5">
        <div id="map-info" style="background:rgba(13,26,42,.95);border:1px solid var(--bdr);border-radius:8px;padding:10px 12px;font-size:13px;flex-shrink:0">
          <div style="color:var(--cyan);margin-bottom:6px">${I18N.t('map.planetInfo')}</div>
          <div style="color:var(--dim)">${I18N.t('ui.clickPlanet')}</div>
        </div>
        <div id="map-shop" style="flex:1;min-height:0;display:flex;flex-direction:column;gap:6px;background:rgba(13,26,42,.92);border:1px solid var(--bdr);border-radius:8px;padding:8px;overflow:hidden">
          <div style="color:var(--dim);font-size:11px;text-align:center;padding:8px">${I18N.t('map.selectForList')}</div>
        </div>
      </div>
      <div id="map-float" style="display:none;position:absolute;pointer-events:auto;transform:translate(-50%,-100%);z-index:10">
        <div style="background:rgba(5,10,26,.97);border:1px solid var(--cyan);border-radius:8px;padding:8px 12px;text-align:center;white-space:nowrap;box-shadow:0 0 14px rgba(0,243,255,.3)">
          <div id="mf-nm" style="color:var(--yellow);font-size:14px;font-weight:bold;margin-bottom:4px"></div>
          <div id="mf-st" style="color:var(--dim);font-size:12px;margin-bottom:6px"></div>
          <button id="mf-go" class="btn btn-sm btn-gold" onclick="travelTo()" style="width:100%">${I18N.t('map.move')}</button>
        </div>
        <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:6px solid var(--cyan);margin:0 auto"></div>
      </div>
      <!-- 행성 호버 툴팁 (마우스오버 시 문화권/팩션 미리보기) -->
      <div id="map-hover" style="display:none;position:absolute;pointer-events:none;z-index:11;background:rgba(5,12,26,.96);border:1px solid var(--cyan);border-radius:6px;padding:6px 10px;font-size:12px;white-space:nowrap;box-shadow:0 2px 12px rgba(0,243,255,.25);transform:translate(-50%,calc(-100% - 14px))"></div>
    </div>
    <!-- 탐색 도감 설명 — 은하지도 아래 (사용자 요청 2026-06-16) -->
    <div style="flex-shrink:0;padding:7px 14px;background:rgba(13,26,42,.92);border-top:1px solid var(--bdr);font-size:11px;color:var(--dim);line-height:1.55;word-break:keep-all">${I18N.t('map.codexHint')}</div>`;
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
    const p3=rotate3D(pos.x,0,pos.y,map3dRotX,map3dRotY);
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
    if(btn){btn.textContent=mapDragMode==='rotate'?I18N.t('map.modeRotate'):I18N.t('map.modeMove');btn.style.color=mapDragMode==='rotate'?'var(--cyan)':'var(--gold)';btn.style.borderColor=mapDragMode==='rotate'?'var(--cyan)':'var(--gold)';}
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
      // 좌클릭: 모드에 따라 회전/이동 (사용자 요청 2026-06-16: 좌우 회전 가능하게) · 우클릭: 항상 회전
      if(e.button===0){if(mapDragMode==='rotate')rotateDrag=true;else panDrag=true;mapCV.style.cursor='grabbing';}
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
        const wasClick=(!moved||elapsed<CLICK_MS);  // 클릭이면 회전/이동 모드 무관하게 행성 선택
        panDrag=false;if(mapDragMode==='rotate')rotateDrag=false;
        mapCV.style.cursor='crosshair';
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
    mapCV.onwheel=e=>{
      e.preventDefault();
      // 커서 기준 줌 (사용자 요청 2026-06-16): 커서 아래 지점이 고정되도록 오프셋 보정
      const rect=mapCV.getBoundingClientRect();
      const mx=(e.clientX-rect.left)*(mapCV.width/Math.max(1,rect.width));
      const my=(e.clientY-rect.top)*(mapCV.height/Math.max(1,rect.height));
      const oldZ=G.mapZoom,newZ=clamp(oldZ+(e.deltaY>0?-.12:.12),.25,4),k=newZ/oldZ;
      if(k!==1){
        const cx=mapCV.width/2+mapOffX,cy=mapCV.height/2+mapOffY;
        mapOffX=mx-(mx-cx)*k-mapCV.width/2;
        mapOffY=my-(my-cy)*k-mapCV.height/2;
        G.mapZoom=newZ;
      }
      renderMap();
    };
    // touch events — mapCV는 동일 DOM 인스턴스 재사용이므로 1회만 부착 (반복 진입 누수 차단)
    if(!mapCV.dataset.touchInit){
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
          if(d0>0)G.mapZoom=clamp(G.mapZoom*(d1/d0),.25,4);renderMap();
        }
        touches=[...e.touches];
      },{passive:false});
      mapCV.addEventListener('touchend',e=>{
        e.preventDefault();
        const elapsed=Date.now()-touchStartT;
        if((!moved||elapsed<CLICK_MS)&&e.changedTouches.length===1){onMapClick(e.changedTouches[0]);}
        touches=[];
      },{passive:false});
      mapCV.dataset.touchInit='1';
    }
  }
  function mapZoom(d){G.mapZoom=clamp(G.mapZoom+d,.25,4);renderMap();}
  function resetMapView(){mapOffX=0;mapOffY=0;G.mapZoom=1.0;map3dRotX=0.35;map3dRotY=0.0;renderMap();}
  function getTx(){const s=G.mapZoom,tx=(mapCV?mapCV.width/2:400)+(mapOffX||0),ty=(mapCV?mapCV.height/2:300)+(mapOffY||0);return{s,tx,ty};}
  
  // 3D projection
  function rotate3D(x,y,z,rx,ry){
    const x1=x*Math.cos(ry)-z*Math.sin(ry),z1=x*Math.sin(ry)+z*Math.cos(ry);
    // 수직 성분 부호 반전 — 기존 2D 지도와 상하 방향 일치 (사용자 보고 2026-06-16:
    //   3D 틸트 도입 후 행성 배치가 상하 뒤집혀 보이던 문제). 모든 호출이 y=0 (수평 디스크)이므로
    //   y 출력만 뒤집어도 가로위치·깊이정렬·좌우 회전 핸들링은 그대로 유지된다.
    const y2=z1*Math.sin(rx)-y*Math.cos(rx),z2=y*Math.sin(rx)+z1*Math.cos(rx);
    return{x:x1,y:y2,z:z2};
  }
  function project3D(x,y,z){
    const FOV=700,cx=(mapCV?mapCV.width/2:400)+(mapOffX||0),cy=(mapCV?mapCV.height/2:300)+(mapOffY||0);
    const scale=FOV/(FOV+z*0.5)*G.mapZoom;
    return{sx:x*scale+cx,sy:y*scale+cy,scale};
  }
  function worldToScreen(wx,wy){
    const p3=rotate3D(wx,0,wy,map3dRotX,map3dRotY);   // 2D 맵을 수평면(X-Z)에 배치 → 좌우 드래그=Y축 턴테이블 회전 (사용자 요청 2026-06-16)
    return project3D(p3.x,p3.y,p3.z);
  }
  function toScr(wx,wy){const r=worldToScreen(wx,wy);return{x:r.sx,y:r.sy};}
  function toWld(sx,sy){const cx=(mapCV?mapCV.width/2:400)+(mapOffX||0),cy=(mapCV?mapCV.height/2:300)+(mapOffY||0);return{x:(sx-cx)/G.mapZoom,y:(sy-cy)/G.mapZoom};}
  function hexAlpha(hex,a){const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);return`rgba(${r},${g},${b},${a})`;}
  function isConnected(a,b){if(!G.mapConns)return false;return G.mapConns.some(c=>(c.a===a&&c.b===b)||(c.a===b&&c.b===a));}
  function isWithinHops(from,to,maxHops,visited){if(!visited)visited=new Set();if(from===to)return true;if(maxHops<=0)return false;visited.add(from);const nbrs=G.mapConns.filter(c=>c.a===from||c.b===from).map(c=>c.a===from?c.b:c.a);if(nbrs.includes(to))return true;if(maxHops<=1)return false;return nbrs.some(n=>!visited.has(n)&&isWithinHops(n,to,maxHops-1,visited));}
  function hasLegendaryEngineOnAny(){return G.fleet.some(s=>(s.parts||[]).some(pid=>WARP_ENGINE_IDS.includes(pid)));}
  function travelCost(f,t){
    const pa=G.mapPositions[f],pb=G.mapPositions[t];if(!pa||!pb)return 0;
    const base=Math.min(5000,Math.max(200,Math.floor(Math.hypot(pa.x-pb.x,pa.y-pb.y)*3.5)));
    // 엔진(TEC) 합산이 높을수록 항행비 할인 (사용자 명세 D)
    //   TEC 0   → 100% / TEC 1000 → 67% / TEC 3000+ → 30% (캡)
    const _flTec=(G.fleet||[]).reduce((s,u)=>s+(u.TEC||0),0);
    const _mul=Math.max(0.30, 1 - Math.min(0.70, _flTec/3000));
    return Math.max(50, Math.floor(base*_mul));
  }
  // ─── 도넛 소행성대 (P29 오리온 균열 + P30 제타 레티쿨리 주변) ──────────
  // 두 보이드 행성을 둘러싸는 환형(annulus) 분포의 작은 소행성 파티클.
  // 항로가 이 지대를 통과하면 미니게임 트리거 (확률 기반).
  let _asteroidParticles=null;  // [{baseAng, baseR, sz, driftSpeed, phase}]
  function _initAsteroidParticles(){
    if(_asteroidParticles)return;
    const rng=mulberry32(1729);  // 시드 고정 — 매번 같은 분포
    const N=180;
    // 갈색 계열 베리에이션 팔레트
    const browns=['#8b6b4a','#a07a55','#6e5237','#7a5a3e','#9c7a52','#bb8e60','#5e4630','#7c6244'];
    _asteroidParticles=[];
    for(let i=0;i<N;i++){
      _asteroidParticles.push({
        baseAng:rng()*Math.PI*2,
        baseR:rng(),                       // 0~1 (도넛 내·외경 사이)
        sz:(0.6+rng()*1.8)*0.5,            // 크기 절반
        driftSpeed:(0.12+rng()*0.18)*0.09*(rng()<0.5?1:-1),  // 속도 추가로 절반 (~×0.09)
        phase:rng()*Math.PI*2,
        tw:0.35+rng()*0.55,                // 깜빡임
        col:browns[Math.floor(rng()*browns.length)]  // 갈색 베리에이션
      });
    }
  }
  let _earthBeltParticles=null;
  function _initEarthBeltParticles(){
    if(_earthBeltParticles)return;
    const rng=mulberry32(2718);
    const N=60;  // P29/P30의 1/3 수준
    // 회색·검은 계열 (지구 봉쇄 잔해 — 우주쓰레기 풍)
    const greys=['#5a5a60','#6e6e75','#444448','#3a3a40','#52525a','#6a6a72'];
    _earthBeltParticles=[];
    for(let i=0;i<N;i++){
      _earthBeltParticles.push({
        baseAng:rng()*Math.PI*2,
        baseR:rng(),
        sz:(0.5+rng()*1.4)*0.5,
        driftSpeed:(0.15+rng()*0.20)*0.12*(rng()<0.5?1:-1),
        phase:rng()*Math.PI*2,
        tw:0.4+rng()*0.5,
        col:greys[Math.floor(rng()*greys.length)]
      });
    }
  }
  // 도넛 중심 (P29·P30 중점)과 내·외경 계산
  function _asteroidBeltGeom(){
    const p29=G.mapPositions&&G.mapPositions['P29'];
    const p30=G.mapPositions&&G.mapPositions['P30'];
    if(!p29||!p30)return null;
    const cx=(p29.x+p30.x)/2;
    const cy=(p29.y+p30.y)/2;
    const dx=p30.x-p29.x, dy=p30.y-p29.y;
    const halfDist=Math.hypot(dx,dy)/2;
    const outerR=halfDist+90;   // 외곽 (두 행성 모두 포함하고 여유)
    const innerR=halfDist-30;   // 내경 (두 행성 사이 안쪽 빈 공간)
    return{cx,cy,innerR:Math.max(40,innerR),outerR};
  }
  // 지구 P31 주변 작은 소행성대 — 행성 봉쇄 잔재 (P29/P30 도넛의 약 1/3 크기)
  function _earthBeltGeom(){
    const p31=G.mapPositions&&G.mapPositions['P31'];
    if(!p31)return null;
    return{cx:p31.x, cy:p31.y, innerR:30, outerR:80};
  }
  function _renderAsteroidBelt(ctx){
    const g=_asteroidBeltGeom();
    if(!g)return;
    _initAsteroidParticles();
    // 도넛 영역 옅은 색감 (배경 보라/청 그라데이션)
    const center=worldToScreen(g.cx,g.cy);
    const sOuter=worldToScreen(g.cx+g.outerR,g.cy);
    const sInner=worldToScreen(g.cx+g.innerR,g.cy);
    const screenOR=Math.abs(sOuter.sx-center.sx);
    const screenIR=Math.abs(sInner.sx-center.sx);
    // 외곽 글로우 (큰 반경) — 갈색톤 옅은 띠
    const grd=ctx.createRadialGradient(center.sx,center.sy,screenIR,center.sx,center.sy,screenOR);
    grd.addColorStop(0,'rgba(140,100,60,0)');
    grd.addColorStop(0.5,'rgba(140,100,60,.05)');
    grd.addColorStop(1,'rgba(140,100,60,0)');
    ctx.fillStyle=grd;
    ctx.beginPath();ctx.arc(center.sx,center.sy,screenOR,0,Math.PI*2);ctx.fill();
    // 파티클 드리프트 (시간 기반)
    const t=performance.now()/1000;
    ctx.save();
    for(const p of _asteroidParticles){
      const ang=p.baseAng+p.driftSpeed*t;
      const radNorm=p.baseR;  // 0~1
      const r=g.innerR+(g.outerR-g.innerR)*radNorm;
      const wx=g.cx+Math.cos(ang)*r;
      const wy=g.cy+Math.sin(ang)*r;
      const s=worldToScreen(wx,wy);
      // 깜빡임
      const tw=0.45+0.55*Math.abs(Math.sin(t*p.tw+p.phase));
      ctx.globalAlpha=Math.min(1,0.55+tw*0.35);
      const psz=Math.max(0.4,p.sz*(G.mapZoom||1));
      // 색상: 파티클 고유 갈색 베리에이션 (8색 팔레트에서 시드로 배정)
      ctx.fillStyle=p.col||'#8b6b4a';
      ctx.beginPath();ctx.arc(s.sx,s.sy,psz,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha=1;
    // 지구(P31) 주변 작은 소행성대도 함께 렌더
    _renderEarthBelt(ctx);
    // 맵 탭에 있을 때만 드리프트 애니메이션 유지
    if(G._currentHubTab==='map'&&!window._asteroidAnimReq){
      window._asteroidAnimReq=requestAnimationFrame(()=>{
        window._asteroidAnimReq=null;
        if(G._currentHubTab==='map')renderMap();
      });
    }
  }
  // 지구 P31 주변 작은 소행성대 렌더 — 회색·우주쓰레기 톤
  function _renderEarthBelt(ctx){
    const g=_earthBeltGeom();if(!g)return;
    _initEarthBeltParticles();
    const center=worldToScreen(g.cx,g.cy);
    const sOuter=worldToScreen(g.cx+g.outerR,g.cy);
    const sInner=worldToScreen(g.cx+g.innerR,g.cy);
    const screenOR=Math.abs(sOuter.sx-center.sx);
    const screenIR=Math.abs(sInner.sx-center.sx);
    // 옅은 회색 띠
    const grd=ctx.createRadialGradient(center.sx,center.sy,screenIR,center.sx,center.sy,screenOR);
    grd.addColorStop(0,'rgba(100,100,108,0)');
    grd.addColorStop(0.5,'rgba(100,100,108,.07)');
    grd.addColorStop(1,'rgba(100,100,108,0)');
    ctx.fillStyle=grd;
    ctx.beginPath();ctx.arc(center.sx,center.sy,screenOR,0,Math.PI*2);ctx.fill();
    const t=performance.now()/1000;
    ctx.save();
    for(const p of _earthBeltParticles){
      const ang=p.baseAng+p.driftSpeed*t;
      const r=g.innerR+(g.outerR-g.innerR)*p.baseR;
      const wx=g.cx+Math.cos(ang)*r;
      const wy=g.cy+Math.sin(ang)*r;
      const s=worldToScreen(wx,wy);
      const tw=0.45+0.55*Math.abs(Math.sin(t*p.tw+p.phase));
      ctx.globalAlpha=Math.min(1,0.5+tw*0.35);
      const psz=Math.max(0.3,p.sz*(G.mapZoom||1));
      ctx.fillStyle=p.col||'#5a5a60';
      ctx.beginPath();ctx.arc(s.sx,s.sy,psz,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha=1;
  }
  
  // 항로가 소행성대를 통과하는지 검사 (선분-환 교차 단순 판정)
  function _routeCrossesAsteroidBelt(fromPid,toPid){
    if(fromPid===toPid)return false;
    // 통과 판정: 출발/도착 중 하나라도 P29/P30/P31이면 무조건 통과로 본다.
    // (정밀 선분-환 교차는 비용 대비 효용이 낮음 — 보이드 양 행성·지구 진입·이탈을 트리거로 사용)
    return fromPid==='P29'||fromPid==='P30'||fromPid==='P31'
         ||toPid==='P29'||toPid==='P30'||toPid==='P31';
  }
  
  // ─── 소행성대 미니게임 → js/modules/asteroid-minigame.js 로 분할 (2026-06-21) ───
  
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
      const p3=rotate3D(pos.x,0,pos.y,map3dRotX,map3dRotY);
      const proj=project3D(p3.x,p3.y,p3.z);
      drawList.push({p,proj,z:p3.z});
    });
    drawList.sort((a,b)=>b.z-a.z);
  
    // ─── 오리온 균열(P29) + 제타 레티쿨리(P30) 도넛 소행성대 ──────────────
    // 두 보이드 행성을 둘러싸는 환형 파티클. 클릭/항로 통과 시 미니게임 트리거.
    try{_renderAsteroidBelt(ctx);}catch(e){}
  
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
      const r=baseR*clamp(proj.scale/G.mapZoom,0.5,1.8);
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
      // 우주정거장(STA01) 아이콘 먼저 그림 → 함선이 그 위 레이어로 올라오게. 행성 위쪽 중앙.
      if(st?.owned){
        // 보유(총독) 행성 아이콘 — 🏠 이모지 → STA01 이미지로 교체 (사용자 요청 2026-06-16). 미로드 시 이모지 폴백.
        const _govSrc='img/ui/STA01_icon.png'+(window._GAME_VER?('?v='+encodeURIComponent(window._GAME_VER)):'');
        const _govImg=_loadMapImg(_govSrc,function(){renderMap();});
        const _gsz=Math.max(14,17*G.mapZoom);
        if(_govImg&&_govImg.complete&&_govImg.naturalWidth>0){
          ctx.save();ctx.globalAlpha=1;ctx.drawImage(_govImg,sp.x-_gsz/2,sp.y-r-4-_gsz,_gsz,_gsz);ctx.restore();
        } else {
          ctx.fillStyle='#deff9a';ctx.font=`${Math.max(7,9*G.mapZoom)}px serif`;ctx.textAlign='center';ctx.globalAlpha=1;ctx.fillText('🏠',sp.x,sp.y-r-4);
        }
      }
      // 기함 이미지 — 우주정거장(상단 중앙)보다 위 레이어 + 행성 '좌측 상단'에 고정해 겹침 방지. 사용자 요청 2026-06-17.
      //   · 이동 모션 중에는 출발지 정박 함선 숨김(_travelAnimFor). (※ 정거장 블록 뒤에 그려 함선이 위에 보임)
      if(isCur&&G.fleet&&G.fleet.length>0&&!_travelAnimFor){
        var _fsz=Math.max(18,r*3.2);
        var _fx=sp.x-r-_fsz*0.30;   // 행성 좌측 (정거장=상단 중앙 과 분리)
        var _fy=sp.y-r-_fsz*0.30;   // 행성 상단
        var _fImgSrc=shipImgSrc(G.fleet[0]);
        var _fImg=_loadMapImg(_fImgSrc,function(){renderMap();});
        if(_fImg&&_fImg.complete&&_fImg.naturalWidth>0){
          // 행성과 함선 사이 연결선 (함선 아래 레이어에 먼저)
          ctx.save();ctx.globalAlpha=0.6;ctx.strokeStyle='rgba(222,255,154,.5)';ctx.lineWidth=1;
          ctx.beginPath();ctx.moveTo(sp.x-r*0.7,sp.y-r*0.7);ctx.lineTo(_fx+_fsz*0.35,_fy+_fsz*0.35);ctx.stroke();ctx.restore();
          ctx.save();ctx.globalAlpha=0.97;
          ctx.beginPath();ctx.arc(_fx,_fy,_fsz/2,0,Math.PI*2);ctx.clip();
          ctx.drawImage(_fImg,_fx-_fsz/2,_fy-_fsz/2,_fsz,_fsz);
          ctx.restore();ctx.globalAlpha=1;
        } else {
          ctx.globalAlpha=1;ctx.fillStyle='#deff9a';
          ctx.font=Math.max(10,r*2)+'px serif';
          ctx.textAlign='center';
          ctx.fillText('🛸',_fx,_fy);
          ctx.textAlign='left';  // 다른 텍스트에 영향 안 가도록 복원
        }
      }
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
      const _p31_3d=rotate3D(_p31pos.x,0,_p31pos.y,map3dRotX,map3dRotY);
      const _p31p=project3D(_p31_3d.x,_p31_3d.y,_p31_3d.z);
      const _p31r=Math.max(8,12*G.mapZoom);
      ctx.strokeStyle='rgba(255,60,60,0.55)';ctx.lineWidth=1.4;ctx.setLineDash([4,5]);
      ctx.beginPath();ctx.arc(_p31p.sx,_p31p.sy,_p31r+10,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
    }
    // ── 거대 블랙홀 (은하 중앙) ────────────────────────────────────────
    {
      const bhWX=0,bhWY=0;
      const bh3d=rotate3D(bhWX,0,bhWY,map3dRotX,map3dRotY);
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
      ctx.fillText(_revealed?I18N.t('modal.voidAbyss'):'◈ ???',bp.sx,bp.sy+br+18);
      if(!_revealed){
        ctx.fillStyle='rgba(220,160,0,0.5)';ctx.font=`${Math.max(7,8*G.mapZoom)}px Courier New`;
        ctx.fillText(I18N.t('codex.locked'),bp.sx,bp.sy+br+30);
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
    ctx.fillText(I18N.t('map.help'),8,H-8);
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
      F01:I18N.t('faction.desc.F01'),
      F02:I18N.t('faction.desc.F02'),
      F03:I18N.t('faction.desc.F03'),
      F04:I18N.t('faction.desc.F04'),
      F05:I18N.t('faction.desc.F05'),
      F06:I18N.t('faction.desc.F06'),
      F07:I18N.t('faction.desc.F07')
    };
    const facDetail=factionLabels[closest.f]||facNm;
    if(fog==='L'){
      // 미탐험: 잠금 표시
      el.innerHTML=`<div style="color:var(--dim);font-size:11px">${I18N.t('map.unexploredPlanet')}</div>
        <div style="color:var(--dim);font-size:10px;margin-top:2px">${I18N.t('ui.unlockAfterAdj')}</div>`;
    } else {
      const _hostile=closest.hostile?' <span style="color:var(--red)">⚠️</span>':'';
      const _void=closest.void?' <span style="color:var(--purple)">🌀</span>':'';
      el.innerHTML=`<div style="color:${facCol};font-size:13px;font-weight:bold">${closest.nm}${_hostile}${_void}</div>
        <div style="color:${facCol};font-size:11px;margin-top:2px">${facDetail}</div>
        <div style="color:var(--dim);font-size:10px;margin-top:1px">${I18N.t('ui.ringTaxLine',{n:closest.ring,tax:closest.tax.toLocaleString()})}</div>`;
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
        // 보이드의 심연은 치크스(적대) 행성 근처에서만 접근 가능 (사용자 요청)
        //   현재 행성이 치크스(적대)이거나, 항로로 인접한 치크스 행성이 있을 때만 진입로 개방.
        const _curPd=PLANET_DEF.find(p=>p.id===G.currentPlanet);
        const _nearChix=(_curPd&&_curPd.hostile)||(G.mapConns||[]).some(c=>{
          const nb=c.a===G.currentPlanet?c.b:(c.b===G.currentPlanet?c.a:null);
          if(!nb)return false; const np=PLANET_DEF.find(p=>p.id===nb); return np&&np.hostile;
        });
        if(!_nearChix){
          baekgu(I18N.t('baekgu.blackHoleEntry'));
          notify(I18N.t('notify.voidAbyssChixOnly'),'err');
          return;
        }
        // 보이드 행성 전체 Lv10 투자 여부 (마지막 시험 조건)
        const _voidPlanets=PLANET_DEF.filter(p=>p.void);
        const _voidOwnedAll=_voidPlanets.every(p=>G.planets[p.id]?.owned);
        const _voidMaxAll=_voidPlanets.every(p=>(G.planets[p.id]?.commerce||0)>=10);
        const _allVoid100=_voidOwnedAll&&_voidMaxAll;
        const _voidProgress=_voidPlanets.filter(p=>(G.planets[p.id]?.commerce||0)>=10).length;
        if(!G._falconDefeated){
          if(!G._earthLiberated){
            // 지구 해방 전 — 우르사 메이저 먼저
            baekgu(I18N.t('baekgu.blackHoleGateLocked'));
            notify(I18N.t('notify.locked'),'err');
          } else {
            // 지구 해방됨 → 블랙홀에서 블랙팔콘(히든 보스) 직접 도전 (P30 퀘스트 놓쳐도 진행 가능)
            openModal(I18N.t('modal.voidAbyssSignal'),
              `<div style="text-align:center;padding:16px">
                ${imgOrEmoji('img/chars/void_hiden.png','🌑',110,110,'border-radius:50%;object-fit:cover;border:2px solid #cc44ff;box-shadow:0 0 18px rgba(204,68,255,.7);margin:0 auto 10px')}
                <div style="color:#cc44ff;font-size:17px;font-weight:bold;margin-bottom:8px">${I18N.t('ui.blackShipApproaching')}</div>
                <div style="color:#e0c0ff;font-size:13px;line-height:1.8">${I18N.t('ui.voidCoreTrialLine')}</div>
              </div>`,
              [{txt:I18N.t('falcon.challengeBtn'),fn:()=>{closeModal();
                // 사용자 요청 2026-06-15: 블랙팔콘은 즉시 전투가 아닌 P30 히든 퀘스트로만 도전.
                //   여기서는 퀘스트를 'available'로 등장시키고, 실제 전투는 P30 퀘스트 수락(acceptQuest)에서 시작.
                if(!G.quests['P30'])G.quests['P30']=[];
                let _q=G.quests['P30'].find(q=>q&&q.id==='q_void_boss');
                if(!_q){_q={id:'q_void_boss',type:'void_boss',ic:'🌑',npc:'???',npcIc:'🌑',nm:I18N.t('quest.darkShipHidden'),desc:I18N.t('falcon.duelLore'),rewardCr:200000000,rewardVe:999,status:'available',targetId:null,progress:0,required:1,planetId:'P30'};G.quests['P30'].unshift(_q);}
                if(_q.status!=='claimed')_q.status='available';
                try{saveGame(true);}catch(e){}
                notify(I18N.t('notify.voidBossQuestPosted'),'pur');
                try{baekgu(I18N.t('notify.voidBossQuestPosted'));}catch(e){}
              },cls:'btn-red'},{txt:I18N.t('falcon.notReady'),fn:closeModal,cls:'btn-sm'}]);
          }
        } else if(G._finalTestComplete){
          openModal(I18N.t('modal.voidAbyss'),
            `<div style="text-align:center;padding:16px">
              ${imgOrEmoji('img/chars/void_hiden.png','🌑',100,100,'border-radius:50%;object-fit:cover;border:2px solid #cc44ff;box-shadow:0 0 16px rgba(204,68,255,.6);margin:0 auto 10px')}
              <div style="color:#cc44ff;font-size:18px;font-weight:bold;margin-bottom:8px">${I18N.t('ui.voidAbyssPassed')}</div>
              <div style="color:#fff;font-size:15px;line-height:2;background:#000;padding:12px 16px;border-radius:8px;border:1px solid #cc44ff;margin-bottom:10px">
                ${I18N.t('ui.finalTrialPassed')}<br>
                <span style="color:#cc44ff">${I18N.t('ui.blackFalconFollowsYourWill')}</span>
              </div>
              <div style="color:var(--dim);font-size:12px;line-height:1.7">${I18N.t('ui.retryMirrorBattle')}</div>
            </div>`,
            [{txt:I18N.t('falcon.retryBtn'),fn:()=>{
              closeModal();
              // 재도전 시 통과 플래그만 임시 해제 (검은 팔콘 함선·신화 파츠 보상은 유지)
              G._finalTestComplete=false;
              try{saveGame(true);}catch(e){}
              _enterBlackHoleFinalTest();
            },cls:'btn-gold'},
             {txt:I18N.t('ui.goBack'),fn:closeModal,cls:'btn-sm'}]);
        } else if(!G._voidSpearObtained){
          // 1차 보상: 보이드의 창 (기존 흐름)
          openModal(I18N.t('modal.voidAbyss'),
            `<div style="text-align:center;padding:20px;background:linear-gradient(180deg,#0a0015,#1a0030);border-radius:10px;border:1px solid rgba(180,0,255,.4)">
              ${imgOrEmoji('img/chars/void_hiden.png','🌑',110,110,'border-radius:50%;object-fit:cover;border:2px solid #cc44ff;box-shadow:0 0 18px rgba(204,68,255,.7);margin:0 auto 10px')}
              <div style="color:#dd66ff;font-size:19px;font-weight:bold;margin-bottom:10px;text-shadow:0 0 12px rgba(200,100,255,.6)">${I18N.t('ui.voidAbyssDot')}</div>
              <div style="color:#e0d0ff;font-size:15px;line-height:2;background:rgba(0,0,0,.6);padding:14px 18px;border-radius:8px;border:1px solid rgba(180,0,255,.3);margin-bottom:12px">
                ${I18N.t('ui.noneLeftAlive')}<br>
                <span style="color:#cc44ff">${I18N.t('ui.youWereDifferent')}</span>
              </div>
              <div style="color:var(--gold);font-size:14px;background:rgba(212,175,55,.08);border:1px solid rgba(212,175,55,.3);border-radius:6px;padding:8px 14px;margin-bottom:8px">
                ${I18N.t('ui.voidSpearGainedLine',{nm:I18N.t('ui.voidSpearTitle')})}
              </div>
              <div style="color:var(--cyan);font-size:11px;margin-top:8px">${I18N.t('ui.voidLv10Tip')}</div>
            </div>`,
            [{txt:I18N.t('btn.takeVoidSpear'),fn:()=>{closeModal();_grantVoidSpear();G._voidSpearObtained=true;saveGame(true);},cls:'btn-gold'},{txt:I18N.t('ui.goBack'),fn:closeModal,cls:'btn-sm'}]);
        } else if(!_allVoid100){
          // 2차 조건: 보이드 100% 투자 아직 미달
          openModal(I18N.t('modal.voidAbyssFinalTest'),
            `<div style="text-align:center;padding:20px;background:linear-gradient(180deg,#0a0015,#1a0030);border-radius:10px;border:1px solid rgba(180,0,255,.4)">
              ${imgOrEmoji('img/chars/void_hiden.png','🌑',110,110,'border-radius:50%;object-fit:cover;border:2px solid #cc44ff;box-shadow:0 0 18px rgba(204,68,255,.7);margin:0 auto 10px')}
              <div style="color:#dd66ff;font-size:18px;font-weight:bold;margin-bottom:10px">${I18N.t('ui.galaxyCenterClosed')}</div>
              <div style="color:#e0d0ff;font-size:14px;line-height:2;background:rgba(0,0,0,.6);padding:12px 16px;border-radius:8px;border:1px solid rgba(180,0,255,.3);margin-bottom:12px">
                ${I18N.t('ui.recallVoidWhisper')}<br>
                <span style="color:#cc44ff">${I18N.t('ui.voidWhisperQuote')}</span>
              </div>
              <div style="color:var(--yellow);font-size:13px;background:rgba(255,215,0,.06);border:1px solid rgba(255,215,0,.3);border-radius:6px;padding:10px 14px;line-height:1.8">
                ${I18N.t('ui.voidAllLv10Cond',{n:_voidPlanets.length})}<br>
                <span style="color:var(--cyan);font-weight:bold">${I18N.t('ui.voidProgress',{cur:_voidProgress,tot:_voidPlanets.length})}</span>
              </div>
            </div>`,
            [{txt:I18N.t('ui.goBack'),fn:closeModal,cls:'btn-sm'}]);
        } else {
          // 3차: 마지막 시험 통과 — 흰 화면 → 메시지 → 보상
          closeModal();
          _enterBlackHoleFinalTest();
        }
        return;
      }
    }
  
    // (이전 장식용 지구 클릭 핸들러는 제거 — P31이 PLANET_DEF의 일반 행성으로 처리됨)
    // P31 클릭 처리:
    //   - ACT<3:               진입 무조건 차단 (Ursa 격파 상태와 무관 — defense-in-depth)
    //   - 격파 전 + ACT>=3:    첫 진입 → 우르사 메이저 보스전 강제 발동
    //   - 격파 후 + ACT>=3:    일반 이동 (아래 PLANET_DEF.forEach에서 처리)
    // ※ ACT<3 무조건 차단 추가 — _isUrsaDefeated()가 손상 상태에서 true로 잘못 보고되어도 지구 접근 불가
    if(G&&G.mapPositions&&G.mapPositions['P31']){
      const _p31w=G.mapPositions['P31'];
      const _p31_3d=rotate3D(_p31w.x,0,_p31w.y,map3dRotX,map3dRotY);
      const _p31p=project3D(_p31_3d.x,_p31_3d.y,_p31_3d.z);
      const _p31r=Math.max(8,12*G.mapZoom);
      if(Math.hypot(_p31p.sx-mx,_p31p.sy-my)<_p31r*2.5){
        if((G.act||1)<3){
          notify(I18N.t('notify.earthAct3PlusShort'),'warn');
          baekgu(I18N.t('baekgu.earthBlockedAct',{act:G.act||1}));
          return;
        }
        if(!_isUrsaDefeated()){
          baekgu(I18N.t('baekgu.earthApproachA'));
          tryBossEntry();
          return;
        }
        // 격파 후 + ACT>=3 — PLANET_DEF.forEach에서 일반 행성처럼 처리되도록 통과
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
      const info=document.getElementById('map-info');if(info)info.innerHTML=`<div style="color:var(--cyan);margin-bottom:6px">${I18N.t('map.planetInfo')}</div><div style="color:var(--dim)">${I18N.t('ui.clickPlanet')}</div>`;
      const shop=document.getElementById('map-shop');if(shop)shop.innerHTML=`<div style="color:var(--dim);font-size:11px;text-align:center;padding:8px">${I18N.t('ui.selectPlanet')}</div>`;
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
      if(fog==='L'){info.innerHTML=`<div style="color:var(--dim);font-size:13px">${I18N.t('ui.unexplored')}<br>${I18N.t('ui.unlockAfterAdj')}</div>`;}
      else{info.innerHTML=`<div style="color:${fac.col};font-size:14px;font-weight:bold;margin-bottom:6px">${p.nm}</div>
        <div style="font-size:12px;color:var(--dim);line-height:2"><span style="color:${fac.col}">${fac.nm}</span>${p.hostile?` <span style="color:var(--red)">${I18N.t('ui.hostileNoSpace')}</span>`:''}${p.void?` <span style="color:var(--cyan)">${I18N.t('ui.fissureChipShort')}</span>`:''}
        <br>${I18N.t('ui.taxRateLine',{n:p.tax.toLocaleString()})}
        ${st?.owned?`<br>${I18N.t('ui.commerceLvDisplay',{lv:st.commerce})}`:''}
        ${p.hero&&!G.heroes.includes(p.hero)?(()=>{
          // 사용자 요청 (2026-06-06, 옵션 E): 영웅 힌트에 영웅 이름·아이콘·조건 명시
          const _hkey='hero.'+p.hero+'.nm';
          const _hnm=(I18N&&I18N.has&&I18N.has(_hkey))?I18N.t(_hkey):(HEROES[p.hero]?.nm||p.hero);
          const _hic=HEROES[p.hero]?.ic||'⭐';
          const _attemptCnt=(G.planetHeroCount&&G.planetHeroCount[p.id])||0;
          const _g18Req=p.hero==='H01';
          const _g18Has=!!(G.inventory&&G.inventory.find(i=>i.id==='G18'&&i.qty>0));
          const _g18Note=_g18Req?(_g18Has?` <span style="color:var(--green)">(${I18N.t('ui.g18Ok')})</span>`:` <span style="color:var(--red)">(${I18N.t('ui.g18Need')})</span>`):'';
          const _atTxt=_attemptCnt>0?` <span style="color:var(--dim);font-size:11px">×${_attemptCnt}</span>`:'';
          return `<br><span style="color:var(--purple)">${I18N.t('ui.heroAvailHere',{ic:_hic,nm:_hnm})}${_g18Note}${_atTxt}</span>`;
        })():''}
        <br>${blink?`<span style="color:var(--cyan)">${I18N.t('ui.blinkJump',{cost:cost.toLocaleString()})}</span>`:conn?`<span style="color:var(--green)">${I18N.t('ui.moveOK',{cost:cost.toLocaleString()})}</span>`:isCur?`<span style="color:var(--yellow)">${I18N.t('ui.currentLocText')}</span>`:`<span style="color:var(--red)">${I18N.t('ui.noRouteText')}</span>`}</div>`;}
    }
    if(goBtn){goBtn.disabled=isCur||!conn||fog==='L';}
    if(costEl)costEl.textContent=conn&&!isCur?(blink?I18N.t('ui.moveCostBlink',{c:cost.toLocaleString()}):I18N.t('ui.moveCost',{c:cost.toLocaleString()})):isCur?I18N.t('ui.currentLocation'):'';
    // 우측 판매 목록 패널
    _updateMapShopPanel(p,fog);
    // 행성 위 floating 버튼 업데이트
    updateFloatBtn(p,fog,conn,isCur,cost);
  }
  // 은하 지도 우측 사이드 패널 — 선택 행성의 판매 특산물 + 판매 함선 리스트
  function _updateMapShopPanel(p,fog){
    const wrap=document.getElementById('map-shop');if(!wrap)return;
    if(!p||fog==='L'){
      wrap.innerHTML=`<div style="color:var(--dim);font-size:11px;text-align:center;padding:8px">${fog==='L'?I18N.t('ui.unexploredPlanetIcon'):I18N.t('ui.pickPlanet')}</div>`;
      return;
    }
    const stock=G.shopStock&&G.shopStock[p.id];
    if(!stock){
      wrap.innerHTML=`<div style="color:var(--dim);font-size:11px;text-align:center;padding:8px">${I18N.t('ui.beforeVisit')}</div>`;
      return;
    }
    // 특산물(일반 G* / 제작재료 R*) — qty>0 만
    const commList=(typeof COMMODITIES!=='undefined'?COMMODITIES:[])
      .filter(c=>!c.material&&(stock[c.id]||0)>0)
      .map(c=>({nm:commDisplayNm(c),ic:c.ic||'📦',qty:stock[c.id],buy:c.buy||0}));
    const matList=(typeof COMMODITIES!=='undefined'?COMMODITIES:[])
      .filter(c=>c.material&&(stock[c.id]||0)>0)
      .map(c=>({nm:commDisplayNm(c),ic:c.ic||'⚙️',qty:stock[c.id],buy:c.buy||0}));
    const shipList=(typeof SHIP_CATALOG!=='undefined'?SHIP_CATALOG:[])
      .filter(s=>(stock['ship_'+s.id]||0)>0)
      .map(s=>({nm:shipDisplayNm(s),ic:s.ic||'🛸',tier:s.tier,qty:stock['ship_'+s.id],price:s.price||0,att:s.ATT||0,hp:s.maxHP||0}));
    const _row=(it,kind)=>`<div style="display:flex;align-items:center;gap:6px;padding:3px 6px;border-radius:4px;background:rgba(0,0,0,.18);font-size:11px;line-height:1.3">
      <span style="font-size:13px;width:16px;text-align:center;flex-shrink:0">${it.ic}</span>
      <div style="flex:1;min-width:0;overflow:hidden">
        <div style="color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${it.nm}${kind==='ship'&&it.tier?` <span style="color:var(--dim);font-size:10px">[${I18N.tier(it.tier)}]</span>`:''}</div>
        ${kind==='ship'?`<div style="color:var(--dim);font-size:10px">ATT ${it.att} · HP ${it.hp.toLocaleString()}</div>`:''}
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="color:var(--gold);font-weight:bold">₡${(kind==='ship'?it.price:it.buy).toLocaleString()}</div>
        <div style="color:var(--dim);font-size:10px">×${it.qty}</div>
      </div>
    </div>`;
    const _section=(title,icon,color,list,emptyMsg,kind)=>`
      <div style="display:flex;flex-direction:column;gap:3px;min-height:0;flex:1">
        <div style="color:${color};font-size:11px;font-weight:bold;padding:2px 4px;border-bottom:1px solid rgba(255,255,255,.08);flex-shrink:0">${icon} ${title} <span style="color:var(--dim);font-weight:normal">(${list.length})</span></div>
        <div style="flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:2px;scrollbar-width:thin">
          ${list.length?list.map(it=>_row(it,kind)).join(''):`<div style="color:var(--dim);font-size:10px;text-align:center;padding:6px">${emptyMsg}</div>`}
        </div>
      </div>`;
    wrap.innerHTML=`
      ${_section(I18N.t('shop.sellCommSec'),'📦','var(--yellow)',commList,I18N.t('shop.noStock'),'comm')}
      ${matList.length?_section(I18N.t('shop.craftMatSec'),'⚙️','var(--cyan)',matList,I18N.t('shop.noneShort'),'mat'):''}
      ${_section(I18N.t('shop.sellShipSec'),'🛸','var(--green)',shipList,I18N.t('shop.noStock'),'ship')}
    `;
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
      if(_blink)st2.innerHTML=`<span style="color:var(--cyan)">${I18N.t('ui.blinkJump',{cost:cost.toLocaleString()})}</span>`;
      else if(conn)st2.innerHTML=`<span style="color:var(--green)">${I18N.t('ui.canMoveCost',{cost:cost.toLocaleString()})}</span>`;
      else st2.innerHTML=`<span style="color:var(--red)">${I18N.t('ui.noRouteBlink')}</span>`;
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
  // 엔진 등급별 이동 시간(ms) — 기함 엔진 파츠 최고 tier 기준 (사용자 요청 2026-06-16)
  //   엔진없음 10초 / E01 8초 / E04 6초 / E08 4초 / E12 2초 / E15·SE01 1초 / ME01(신화) 즉시
  function _travelDelayMs(){
    const flag=G.fleet&&G.fleet[0];let bestTier=0;
    if(flag&&flag.parts&&typeof PARTS!=='undefined'){
      for(const pid of flag.parts){const p=PARTS.find(x=>x.id===pid);if(p&&p.cat==='engine'&&(p.tier||0)>bestTier)bestTier=p.tier||0;}
    }
    // 사용자 요청 2026-06-17: 엔진 등급별 이동 모션이 "사라지지 않게" — 최고 등급도 0이 아닌
    //   짧은 글라이드(700ms)를 유지. 등급이 높을수록 빠르되 항상 눈에 보이는 이동 연출이 남는다.
    if(bestTier>=20)return 700;
    if(bestTier>=15)return 1200;
    if(bestTier>=12)return 2000;
    if(bestTier>=8)return 4000;
    if(bestTier>=4)return 6000;
    if(bestTier>=1)return 8000;
    return 10000;
  }
  // 은하지도 위에서 함선이 출발행성→목적행성으로 글라이드 이동하는 모션.
  //   · 항상 글라이드(이동 애니메이션) + dur 만큼 시간 소요. (사용자 요청 2026-06-17)
  //   · showFlash(블링크 이상 엔진)일 때만 출발/도착 지점에 워프 "번쩍" 효과를 글라이드 위에 겹쳐 표시.
  function _startTravelAnim(fromPid,toPid,dur,showFlash,onDone){
    try{
      const wrap=document.getElementById('map-wrap');
      const a=G.mapPositions&&G.mapPositions[fromPid],b=G.mapPositions&&G.mapPositions[toPid];
      // 지도 DOM/캔버스가 준비 안 됐어도 "이동 시간"은 그대로 소요 — 즉시 도착(instant) 방지.
      if(!wrap||!a||!b||!mapCV){setTimeout(onDone,Math.max(0,dur||0));return;}
      const pa=worldToScreen(a.x,a.y),pb=worldToScreen(b.x,b.y);
      if(getComputedStyle(wrap).position==='static')wrap.style.position='relative';
      mapCV.style.pointerEvents='none';  // 이동 중 맵 조작 차단
      const _img=(typeof shipImgSrc==='function'&&G.fleet&&G.fleet[0])?shipImgSrc(G.fleet[0]):'';
      const _shipInner=_img?('<img src="'+_img+'" style="width:100%;height:100%;object-fit:contain">'):'🚀';
      // 워프 "번쩍" 효과 (블링크 이상 엔진 전용) — 글라이드 위에 겹쳐 출발/도착 지점에서 번쩍.
      const _flash=(x,y)=>{
        const f=document.createElement('div');
        f.style.cssText='position:absolute;left:0;top:0;width:64px;height:64px;margin:-32px 0 0 -32px;z-index:41;pointer-events:none;border-radius:50%;'
          +'background:radial-gradient(circle,rgba(255,255,255,.98) 0%,rgba(120,225,255,.85) 35%,rgba(0,180,255,.35) 60%,rgba(0,180,255,0) 75%);'
          +'transform:translate('+x+'px,'+y+'px) scale(.25);opacity:0;transition:transform .32s cubic-bezier(.2,.7,.3,1),opacity .32s ease-out';
        wrap.appendChild(f);
        void f.offsetWidth;
        requestAnimationFrame(()=>{f.style.transform='translate('+x+'px,'+y+'px) scale(2.4)';f.style.opacity='1';});
        setTimeout(()=>{f.style.opacity='0';},160);
        setTimeout(()=>{try{f.remove();}catch(e){}},420);
      };
      // ── 글라이드 이동 (항상 적용 — 이동 애니메이션 + dur 시간 소요) ──
      const ship=document.createElement('div');
      ship.className='_travel-ship';
      ship.style.cssText='position:absolute;left:0;top:0;width:30px;height:30px;margin:-15px 0 0 -15px;z-index:40;pointer-events:none;transition:transform '+dur+'ms linear';
      ship.innerHTML=_shipInner;
      // 이동 방향을 바라보도록 함선 회전 — 스프라이트 기본 방향 = 오른쪽(+x).
      const _ang=Math.atan2(pb.sy-pa.sy,pb.sx-pa.sx)*180/Math.PI;
      ship.style.transform='translate('+pa.sx+'px,'+pa.sy+'px) rotate('+_ang+'deg)';
      wrap.appendChild(ship);
      void ship.offsetWidth;  // reflow → transition 적용
      requestAnimationFrame(()=>{ship.style.transform='translate('+pb.sx+'px,'+pb.sy+'px) rotate('+_ang+'deg)';});
      try{AudioMgr.playSfx(showFlash?'UI_open':'UI_click',{cooldown:0});}catch(e){}
      // 워프 번쩍 — 블링크 이상 엔진에서만: 출발 즉시 번쩍 + 도착 직전(글라이드 종료 무렵) 번쩍.
      if(showFlash){
        _flash(pa.sx,pa.sy);
        setTimeout(()=>{try{AudioMgr.playSfx('UI_open',{cooldown:0});}catch(e){}_flash(pb.sx,pb.sy);},Math.max(0,dur-120));
      }
      setTimeout(()=>{try{ship.remove();}catch(e){}try{if(mapCV)mapCV.style.pointerEvents='';}catch(e){}onDone();},dur+80);
    }catch(e){console.warn('[travel anim]',e);setTimeout(onDone,Math.max(0,dur||0));}
  }
  function travelTo(){
    const pid=G.mapSelected;if(!pid||pid===G.currentPlanet)return;
    // 사용자 요청 2026-06-09: 전투 중 행성 이동 차단
    //   · combatState 가 있고 done 이 false 면 진행 중 — 이동 거부
    //   · 도주는 escapePirateRaid / 항복 / 보스 패배 처리 경로 사용
    if(typeof combatState!=='undefined'&&combatState&&!combatState.done){   // combatState 는 전역 lexical(window 아님) — 직접 참조 (사용자 보고 2026-06-16: 전투 중 이동이 막히지 않던 버그 수정)
      try{notify(I18N.t('notify.combatTravelBlocked')||'⚔️ 전투 중에는 다른 행성으로 이동할 수 없습니다.','err');}catch(e){}
      try{if(typeof baekgu==='function')baekgu(I18N.t('baekgu.combatTravelBlocked')||'먼저 이 전투부터 끝내야 합니다.');}catch(e){}
      return;
    }
    // P31 (지구) 진입 게이트 — ACT/봉쇄 상태 검증
    // ※ ACT<3 무조건 차단 (defense-in-depth) — _isUrsaDefeated()가 손상 상태에서 true 잘못 보고되어도 지구 차단
    if(pid==='P31'){
      if((G.act||1)<3){
        notify(I18N.t('notify.earthAct3Plus',{act:G.act||1}),'warn');
        baekgu(I18N.t('baekgu.earthBlockedShort'));
        return;
      }
      if(!_isUrsaDefeated()){
        // ACT3+ 첫 지구 도착 → 우르사 메이저 보스전 강제 진입
        baekgu(I18N.t('baekgu.earthApproachB'));
        tryBossEntry();
        return;
      }
      // 격파 후 + ACT>=3 — 일반 이동 흐름으로 통과
    }
    const pd=PLANET_DEF.find(p=>p.id===pid),cost=travelCost(G.currentPlanet,pid);
    const blink=hasBlinkOnAll();
    // 블링크 엔진 없을 때 연결 항로 체크
    if(!blink){const _maxHops=hasLegendaryEngineOnAny()?2:1;if(!isWithinHops(G.currentPlanet,pid,_maxHops)){notify(I18N.t('notify.noRouteHopHint'),'err');return;}}
    // 탐험되지 않은 행성은 블링크로도 이동 불가
    if(G.planets[pid]?.fog==='L'&&!blink){notify(I18N.t('notify.unexploredVisitAdjFirst'),'err');return;}
    if(G.credits<cost){notify(I18N.t('notify.travelCostShort',{cost:cost.toLocaleString()}),'err');return;}
    // ── 행성 이동 모션 (사용자 요청 2026-06-17) ──
    //   1) 모든 이동은 글라이드 애니메이션 + 엔진 등급별 시간 소요(_travelDelayMs).
    //   2) "번쩍(워프 플래시)" 효과는 블링크 이상 엔진(WARP_ENGINE_IDS=E15·SE01·ME01) 장착 시에만 추가.
    //   먼저 모션을 재생하고, 끝나면 travelTo를 재진입해 실제 도착 처리를 수행한다.
    if(_travelAnimFor!==pid){
      const _flagship=G.fleet&&G.fleet[0];
      const _showFlash=!!(_flagship&&(_flagship.parts||[]).some(_pid=>WARP_ENGINE_IDS.includes(_pid)));  // 블링크 이상 엔진
      const _travelMs=_travelDelayMs();   // 항상 엔진 등급별 시간 소요 (최소 700ms)
      if(_travelMs>0){
        _travelAnimFor=pid;
        G.mapSelected=null;
        const _gb=document.getElementById('map-go');if(_gb)_gb.disabled=true;
        const _mf=document.getElementById('map-float');if(_mf)_mf.style.display='none';
        renderMap();  // 출발지 정박 함선 이미지를 즉시 숨김 (_travelAnimFor 가드 반영)
        _startTravelAnim(G.currentPlanet,pid,_travelMs,_showFlash,function(){G.mapSelected=pid;travelTo();});
        return;
      }
    }
    _travelAnimFor=null;  // 모션 완료(또는 즉시이동) → 실제 도착 처리 진행
    G.credits-=cost;G.currentPlanet=pid;G.planets[pid].fog='A';G.stayTurns=0;if(G.planets[pid].hubProg===undefined)G.planets[pid].hubProg=0;
    // 행성 도착 시 잠금 상태 복원 + 광장(s1) 단계 자동 해금
    // 1) _hubProgMax(영구 최대값) 트래커로 잠금 회귀 방지 — 한 번 해금한 단계는 재방문 시에도 유지
    // 2) 첫 도착이라 hubProg이 s1 미만이면 s1까지 자동 상향 (광장 즉시 해금)
    try{
      const _thrArr=_getHubThr(pid);
      const _prevMax=G.planets[pid]._hubProgMax||0;
      if(_prevMax>(G.planets[pid].hubProg||0))G.planets[pid].hubProg=_prevMax;
      if((G.planets[pid].hubProg||0)<_thrArr.s1)G.planets[pid].hubProg=_thrArr.s1;
      G.planets[pid]._hubProgMax=Math.max(_prevMax, G.planets[pid].hubProg||0);
    }catch(e){}
    try{AudioMgr.playBgm(_planetBgmName(pid));}catch(e){}
    // 행성 이동 시 치크스 출몰 카운터 유지 (같은 치크스 구역 침투 지속 반영)
    if(!PLANET_DEF.find(p=>p.id===pid)?.hostile){G.chixWaves=0;G.lastChixTurn=-999;} // 안전 행성으로 이동 시 리셋
    // Fix16: 인접 행성 자동 탐색 제거 — 행성은 직접 방문해야만 해금
    // 인접 연결 행성만 fog='S'로 공개 (직접 방문 시에만 'A'로 변경)
    if(G.mapConns){G.mapConns.filter(c=>c.a===pid||c.b===pid).forEach(c=>{const nb=c.a===pid?c.b:c.a;if(G.planets[nb]&&G.planets[nb].fog==='L')G.planets[nb].fog='S';});}
    generateShopStock(pid);  // 처음 방문 시 상점 재고 생성
    G.turn++;
    // ACT 전환 체크 — 이동도 턴을 소모하므로 doNextTurn 과 동일 트리거 필요 (버그 수정)
    try{_checkActAdvance();}catch(e){}
    // 행성 이동 시에도 주기적 메모리 위생 (10턴마다, 비전투)
    try{_periodicMemoryHygiene();}catch(e){}
    updateHUD();renderMap();G.mapSelected=null;
    // 행성 도착 즉시 사이드바 잠금/진행도 표시 갱신 (이전 행성 상태 잔존 차단)
    try{updateHubLockButtons();}catch(e){}
    const goBtn=document.getElementById('map-go');if(goBtn)goBtn.disabled=true;
    const fl=document.getElementById('map-float');if(fl)fl.style.display='none';
    boostLoyalty('travel'); // ← 충성도 증가 (이동)
    randomBaekgu('travel');notify(I18N.t('notify.arrived',{nm:pd.nm}),'ok');
    if(pd.hostile&&!G.planets[pd.id]?.hostile_cleared){setTimeout(()=>showHostilePlanetBriefing(pd),800);return;}
    if(pd.hostile&&G.planets[pd.id]?.hostile_cleared){notify(I18N.t('notify.mergedArrived',{nm:pd.nm}),'ok');}
    // ─── 소행성대 미니게임 트리거 — P29 오리온 균열·P30 제타 레티쿨리 출입 시 ─
    // 도넛 소행성대를 통과해야 하는 항로 → 60% 확률로 미니게임 진입
    try{
      if(_routeCrossesAsteroidBelt&&_routeCrossesAsteroidBelt(G._prevPlanet||G.currentPlanet,pid)&&Math.random()<0.6){
        G._prevPlanet=pid;
        setTimeout(()=>{if(typeof window.startAsteroidBeltMinigame==='function')window.startAsteroidBeltMinigame(pid);},600);
        return;
      }
    }catch(e){console.warn('asteroid trigger',e);}
    G._prevPlanet=pid;
    // 랜덤 해적 조우 (턴 3 이후, 비적대 행성, P31 제외)
    // P31(지구)는 해방 후 안착지 — 해적 조우 금지 (사용자 요청 2026-06-03)
    if(G.turn>2&&pid!=='P31'){
      // 허브 미해금 시 해적 조우 100% 보장 (해금 퀘스트 반드시 10회 진행)
      const _hubUnlocked=isPlanetHubUnlocked(pid);
      const chance=_hubUnlocked?calcTravelPirateChance(pd):100;
      if(Math.random()*100<chance){
        baekgu(_hubUnlocked?I18N.t('baekgu.routeSomething'):I18N.t('baekgu.planetNotUnlocked'));
        setTimeout(()=>triggerTravelPirate(pd),900);
        return;
      }
    }
    checkDeliveryQuests(pid);  // ← 배달 퀘스트 완료 체크
    // Phase 시나리오 퀘스트 자동 spawn (인트로 컷씬 포함) — 일반 퀘 시드보다 우선.
    // 사용자 요청 2026-06-09: 행성 도착 즉시 컷씬·시나리오 퀘 노출 (지연 없음)
    if(typeof spawnPhasedQuests==='function'){try{spawnPhasedQuests(pid);}catch(e){console.warn('[phase] spawn fail',e);}}
    // 일반 퀘스트 시드 — 행성 도착 시 즉시 (퀘스트 탭 열기 전에도 보장)
    if(typeof generateQuests==='function'){try{generateQuests(pid);}catch(e){console.warn('[quest] gen fail',e);}}
    // 사용자 요청 2026-06-09: spawn 직후 메인 탭 강제 재렌더 — 새 시나리오·일반 퀘 즉시 노출
    try{
      if(G._currentHubTab==='main' && typeof window.rerenderTab==='function' && typeof window.renderMain==='function'){
        window.rerenderTab(window.renderMain);
      } else if(G._currentHubTab==='quest' && typeof window.rerenderTab==='function' && typeof window.renderQuestTab==='function'){
        window.rerenderTab(window.renderQuestTab);
      }
    }catch(e){}
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
        setTimeout(()=>baekgu(I18N.t('baekgu.bpDropHint',{nm:pd.nm,bp:(_bpRec.type==='ship'?(shipDisplayNm(SHIP_CATALOG.find(s=>s.id===_bpRec.id))||_bpRec.nm):(partDisplayNm(PARTS.find(p=>p.id===_bpRec.id)||SPECIAL_CARGO_PARTS.find(c=>c.id===_bpRec.id)||{})||_bpRec.nm))})),1500);
        G.planets[pid]._craftHinted=true;
      } else if(_hasBp&&_fMat){
        // 설계도 보유 시 재료 힌트
        const have=G.materials[_fMatId]||0;
        const needed=(_bpRec?.mats||[]).find(m=>m.id===_fMatId)?.qty||0;
        if(needed>0&&have<needed){
          setTimeout(()=>baekgu(I18N.t('baekgu.materialAtShop',{mat:commDisplayNm(_fMat)||_fMat.nm,have,need:needed,bp:(_bpRec.type==='ship'?(shipDisplayNm(SHIP_CATALOG.find(s=>s.id===_bpRec.id))||_bpRec.nm):(partDisplayNm(PARTS.find(p=>p.id===_bpRec.id)||SPECIAL_CARGO_PARTS.find(c=>c.id===_bpRec.id)||{})||_bpRec.nm))})),1500);
        }
      } else if(_fMat&&(G.materials[_fMatId]||0)<5){
        setTimeout(()=>baekgu(I18N.t('baekgu.materialOriginPlanet',{nm:pd.nm,mat:commDisplayNm(_fMat)||_fMat.nm})),1500);
      }
    }
  
    // 지구 저항군 행성 도착 & 이순신 미영입 시 G18 힌트
    if(pd.f==='F06'&&!G.heroes.includes('H01')){
      const hasG18=(G.inventory||[]).find(i=>i.id==='G18'&&i.qty>0);
      if(!hasG18)setTimeout(()=>baekgu(I18N.t('baekgu.resistanceZoneHint')),1200);
      else setTimeout(()=>baekgu(I18N.t('baekgu.nanjungHave')),1200);
    }
    // ── 보이드(F07) 행성 도착 — 지구 해방 후에만 미스터리한 신호 언급 ──
    // 우르사 메이저 격파 전엔 일반 균열 행성으로만 인식
    // 격파 후 보이드 행성 근처에 도착하면 백구가 검은 함선/통신 신호를 감지
    if(pd.f==='F07'&&G._earthLiberated&&!G._voidFalconDefeated){
      if(!G._voidHintShown)G._voidHintShown={};
      if(!G._voidHintShown[pd.id]){
        G._voidHintShown[pd.id]=true;
        const _hints={
          P27:I18N.t('voidHint.P27'),
          P28:I18N.t('voidHint.P28'),
          P29:I18N.t('voidHint.P29'),
          P30:I18N.t('voidHint.P30')
        };
        const _msg=_hints[pd.id]||I18N.t('voidHint.default');
        setTimeout(()=>baekgu(_msg),1500);
      }
      // P30 도착 즉시 q_void_boss 퀘스트 생성 (광장 미진입 상태에서도 노출 보장)
      if(pd.id==='P30'&&typeof generateQuests==='function')generateQuests('P30');
    }
    saveGame(true);
  }

  // ─── 전역 노출 ─────────────────────────────────────────────
  // game.js 의 다른 코드, HTML onclick, 시나리오 트리거에서 호출되는 진입점
  window.renderMapView=renderMapView;
  window.centerMapOnCurrentPlanet=centerMapOnCurrentPlanet;
  window.showMap=showMap;
  window.toggleMapDragMode=toggleMapDragMode;
  window.initMapCanvas=initMapCanvas;
  window.mapZoom=mapZoom;
  window.resetMapView=resetMapView;
  window.renderMap=renderMap;
  window.travelTo=travelTo;
  window.travelCost=travelCost;
  window.isConnected=isConnected;
  window.isWithinHops=isWithinHops;
  window.hasLegendaryEngineOnAny=hasLegendaryEngineOnAny;
  // startAsteroidBeltMinigame → js/modules/asteroid-minigame.js 가 window 에 노출 (분리 2026-06-21)
  // 사용자 버그 보고 2026-06-08: showHostilePlanetBriefing 와 _buildHostilePlanetEnemies 는
  //   game.js 에 정의돼 있어 starmap IIFE 내 식별자로 미해결. 노출 시도가 ReferenceError 를
  //   던져 이후의 window 할당 + console.log 가 실행 안 되던 문제. → 라인 제거.
  //   (해당 두 함수는 game.js 의 글로벌 함수 선언이라 window 에 자동 노출됨)
  window.rotate3D=rotate3D;
  window.project3D=project3D;
  window.worldToScreen=worldToScreen;
  console.log('[starmap] module loaded — 38 functions');
})();
