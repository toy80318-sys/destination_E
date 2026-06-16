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
    const y2=y*Math.cos(rx)-z1*Math.sin(rx),z2=y*Math.sin(rx)+z1*Math.cos(rx);
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
  
  // ─── 소행성대 미니게임 — 사이드 스크롤 슈터 ─────────────────────────
  // 좌측 기함(우리 함대 0번)이 우측을 바라보고 움직임 / 배경 우→좌 스크롤
  // 우측에서 소행성·해적함이 날아옴. 해적함은 레이저/미사일로 반격.
  // 조작: 방향키·WASD 이동, 마우스 위치 추종, Shift=레이저, Ctrl/Enter=미사일(자동조준)
  // 30초 생존 = 승리 (+크레딧 5%+격파×500, +VE 20+격파×4)
  // 기함 HP 0 = 패배 (-크레딧 3%)
  // 함선 선택 UI — 행당 8척, 작은 카드 (기존 크기의 약 절반)
  function _showAsteroidShipPicker(destPid, onPick){
    const picker=document.createElement('div');
    picker.id='_ab-ship-picker';
    picker.style.cssText='position:fixed;left:0;top:0;right:0;bottom:0;background:rgba(0,0,0,.95);z-index:99996;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;font-family:Malgun Gothic,sans-serif;padding:14px;overflow-y:auto';
    // 카드: 가로 약 116px → 행당 8장(8×116 + gap×7×6 = 970px), max-width 1000px
    let cardsHtml='';
    (G.fleet||[]).forEach((s,idx)=>{
      const t=s.tier||'소형';
      const _tcol=t==='소형'?'#66ddff':t==='중형'?'#ffcc66':'#ff88cc';
      const tierBadge='<span style="color:'+_tcol+'">'+I18N.tier(t)+'</span>';
      const _hp=s.maxHP||s.HP||1000;
      const _sh=s.maxSH||300;
      const _att=s.ATT||30;
      const _rar=s.rarity||'';
      const _rarColor=_rar==='mythic'?'#ff88ff':_rar==='legend'?'#ffcc66':_rar==='set'?'#ff99cc':'#aaa';
      cardsHtml+=`
        <div class="ab-ship-card" data-idx="${idx}" style="
          cursor:pointer;background:rgba(20,10,40,.9);border:1.5px solid #6633aa;border-radius:7px;
          padding:7px 8px;width:104px;text-align:center;transition:all .15s ease;
          box-shadow:0 2px 8px rgba(180,80,255,.15)">
          <img src="${shipImgSrc(s)}" style="width:52px;height:52px;object-fit:contain;image-rendering:pixelated" onerror="this.style.opacity=.3">
          <div style="margin-top:4px;font-weight:bold;color:${_rarColor};font-size:10px;letter-spacing:.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${shipDisplayNm(s)||'#'+idx}</div>
          <div style="margin-top:2px;font-size:9px;color:#aaa">${tierBadge} · ATT ${_att}</div>
          <div style="margin-top:2px;font-size:9px;color:#ff8888">HP ${_hp>=10000?Math.round(_hp/1000)+'k':_hp}</div>
          <div style="font-size:9px;color:#66ddff">SH ${_sh>=10000?Math.round(_sh/1000)+'k':_sh}</div>
        </div>`;
    });
    const _bypassCost=Math.max(100,Math.round((G.credits||0)*0.01));
    const _canBypass=(G.credits||0)>=_bypassCost;
    picker.innerHTML=`
      <div style="text-align:center;margin-bottom:10px">
        <div style="color:#cc66ff;font-size:11px;letter-spacing:4px">${I18N.t('ui.asteroidBreakSub')}</div>
        <div style="color:#fff;font-size:16px;font-weight:bold;letter-spacing:2px;margin-top:3px">${I18N.t('ui.asteroidBreak')}</div>
        <div style="color:#aaa;font-size:10px;margin-top:3px">${I18N.t('ui.clickShipToSortie')}</div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(8,104px);gap:6px;justify-content:center;max-width:920px">${cardsHtml}</div>
      <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;justify-content:center">
        <button id="_ab-pick-bypass" ${_canBypass?'':'disabled'} style="
          padding:7px 18px;background:${_canBypass?'rgba(255,215,0,.18)':'rgba(120,120,120,.15)'};
          border:1px solid ${_canBypass?'#ffd700':'#666'};color:#fff;border-radius:5px;
          cursor:${_canBypass?'pointer':'not-allowed'};font-size:11px;letter-spacing:1px;
          opacity:${_canBypass?'1':'.5'}">
          ${I18N.t('ui.tollLine',{cr:_bypassCost.toLocaleString()})}
        </button>
        <button id="_ab-pick-cancel" style="padding:7px 16px;background:rgba(255,80,80,.15);border:1px solid #ff6666;color:#fff;border-radius:5px;cursor:pointer;font-size:11px;letter-spacing:1px">${I18N.t('ui.cancelEvade')}</button>
      </div>`;
    document.body.appendChild(picker);
    picker.querySelectorAll('.ab-ship-card').forEach(c=>{
      c.onmouseenter=()=>{c.style.transform='translateY(-3px)';c.style.borderColor='#ffcc66';c.style.boxShadow='0 6px 18px rgba(255,204,102,.35)';};
      c.onmouseleave=()=>{c.style.transform='';c.style.borderColor='#6633aa';c.style.boxShadow='0 2px 8px rgba(180,80,255,.15)';};
      c.onclick=()=>{const idx=parseInt(c.dataset.idx,10);picker.remove();onPick(idx);};
    });
    picker.querySelector('#_ab-pick-cancel').onclick=()=>{picker.remove();};
    // 통행세 지불 무사통과 — 1% 지불 + 해금 진행도 +1 효과만 적용
    const bypassBtn=picker.querySelector('#_ab-pick-bypass');
    if(bypassBtn&&_canBypass)bypassBtn.onclick=()=>{
      G.credits=Math.max(0,(G.credits||0)-_bypassCost);
      if(destPid){try{addHubProgress(destPid);}catch(e){}}
      try{saveGame(true);}catch(e){}
      notify(I18N.t('notify.tollPaidAsteroid',{cost:_bypassCost.toLocaleString()}),'gold');
      try{baekgu(I18N.t('baekgu.tollPaidSafe'));}catch(e){}
      picker.remove();
    };
  }
  
  // 백구 AI HUD 렌더 — 캔버스 하단 가운데 (말풍선 위로)
  function _renderBaekguHud(cx,W,H,state,baekguImgs,now){
    const b=state.baekgu;if(!b)return;
    const remain=b.expireAt-now;
    let alpha=1;
    if(remain<400)alpha=Math.max(0,remain/400);
    const moodKey=(remain<=0)?'default':b.mood;
    const im=baekguImgs[moodKey]||baekguImgs['default'];
    // 좌측 하단 배치 — 이름 라벨 잘리지 않도록 충분한 하단 마진 확보
    const size=100;
    const marginL=18, marginB=28;          // 이름 라벨 들어갈 공간(아래쪽) 확보
    const cxCircle=marginL+size/2;
    const cyCircle=H-marginB-size/2;
    const bx=cxCircle-size/2, by=cyCircle-size/2;
    cx.save();
    // 후광
    const moodCol=(b.mood==='anger1'||b.mood==='anger2'||b.mood==='sad')?'#ff6666'
                :(b.mood==='smile1'||b.mood==='smile2'||b.mood==='smile4')?'#ffd700':'#66ddff';
    const glowAlpha=(b.mood==='anger1'||b.mood==='anger2'||b.mood==='sad')?0.18*alpha
                  :(b.mood==='smile1'||b.mood==='smile2'||b.mood==='smile4')?0.18*alpha:0.10;
    cx.fillStyle=(b.mood==='anger1'||b.mood==='anger2'||b.mood==='sad')?'rgba(255,80,80,'+glowAlpha+')'
                :(b.mood==='smile1'||b.mood==='smile2'||b.mood==='smile4')?'rgba(255,215,0,'+glowAlpha+')'
                :'rgba(102,221,255,'+glowAlpha+')';
    cx.beginPath();cx.arc(cxCircle,cyCircle,size*0.7,0,Math.PI*2);cx.fill();
    // 원형 배경
    cx.beginPath();cx.arc(cxCircle,cyCircle,size/2-2,0,Math.PI*2);cx.closePath();
    cx.fillStyle='rgba(20,10,40,.92)';cx.fill();
    // 이미지 (원형 클립)
    cx.save();cx.clip();
    if(im&&im.complete&&im.naturalWidth>0){cx.drawImage(im,bx,by,size,size);}
    cx.restore();
    // 테두리
    cx.lineWidth=2.5;cx.strokeStyle=moodCol;
    cx.beginPath();cx.arc(cxCircle,cyCircle,size/2-1,0,Math.PI*2);cx.stroke();
    // 이름 라벨 (원 아래, 화면 안에 들어오도록)
    cx.fillStyle='rgba(102,221,255,.9)';cx.font='bold 12px monospace';cx.textAlign='center';
    cx.fillText(I18N.t('cb.baekguAI'),cxCircle,cyCircle+size/2+18);
    // 말풍선 — 이미지 우측에 배치
    if(b.msg && remain>0){
      cx.globalAlpha=alpha;
      cx.font='bold 14px Malgun Gothic, sans-serif';
      const tw=cx.measureText(b.msg).width;
      const bw=Math.max(180,tw+28), bh=44;
      // 우측에 배치: 원 오른쪽 가장자리에서 14px 간격
      const bbx=cxCircle+size/2+14;
      const bby=cyCircle-bh/2;
      // 그림자
      cx.fillStyle='rgba(0,0,0,.6)';
      _roundRect(cx,bbx+2,bby+2,bw,bh,10);cx.fill();
      // 배경 그라데이션
      const grd=cx.createLinearGradient(bbx,bby,bbx,bby+bh);
      grd.addColorStop(0,'rgba(40,20,60,.95)');grd.addColorStop(1,'rgba(20,10,40,.95)');
      cx.fillStyle=grd;_roundRect(cx,bbx,bby,bw,bh,10);cx.fill();
      // 테두리
      cx.strokeStyle=moodCol;cx.lineWidth=1.5;
      _roundRect(cx,bbx,bby,bw,bh,10);cx.stroke();
      // 좌측 꼬리 (원을 향함)
      cx.fillStyle=grd;
      cx.beginPath();
      cx.moveTo(bbx,cyCircle-8);cx.lineTo(bbx,cyCircle+8);cx.lineTo(bbx-10,cyCircle);
      cx.closePath();cx.fill();
      cx.strokeStyle=moodCol;
      cx.beginPath();
      cx.moveTo(bbx,cyCircle-8);cx.lineTo(bbx-10,cyCircle);cx.lineTo(bbx,cyCircle+8);
      cx.stroke();
      // 텍스트
      cx.fillStyle='#fff';cx.textAlign='left';
      cx.fillText(b.msg,bbx+14,bby+bh/2+5);
      cx.globalAlpha=1;
    }
    cx.textAlign='left';
    cx.restore();
  }
  function _roundRect(cx,x,y,w,h,r){
    cx.beginPath();cx.moveTo(x+r,y);cx.lineTo(x+w-r,y);cx.quadraticCurveTo(x+w,y,x+w,y+r);
    cx.lineTo(x+w,y+h-r);cx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    cx.lineTo(x+r,y+h);cx.quadraticCurveTo(x,y+h,x,y+h-r);
    cx.lineTo(x,y+r);cx.quadraticCurveTo(x,y,x+r,y);cx.closePath();
  }
  
  function startAsteroidBeltMinigame(destPid, shipIdx){
    // 함선 선택 단계 — 함대에 2척 이상이고 미선택이면 picker 표시
    if(shipIdx==null && G.fleet && G.fleet.length>1){
      return _showAsteroidShipPicker(destPid,(idx)=>{startAsteroidBeltMinigame(destPid,idx);});
    }
    shipIdx=shipIdx|0;
    // 기함 스탯 (선택한 함선)
    const flagship=G.fleet&&G.fleet[shipIdx];
    // 미니게임 HP 기준 — 기함의 기본 maxHP (파츠 보너스 제외, 함선 본체 스탯)
    const _baseHP=flagship?(flagship.maxHP||flagship.HP||1000):1000;
    const _baseSH=flagship?(flagship.maxSH||300):300;
    const _baseATT=flagship?(flagship.ATT||30):30;
    const flagStat={HP:_baseHP,maxSH:_baseSH,ATT:_baseATT};
    const shipSrc=flagship?shipImgSrc(flagship):shipImgSrc({id:'S01',catId:'S01',tier:'소형'});
    // 함선 크기 비율 — 소형=1 / 중형=3 / 대형=5 (사용자 명세)
    function _sizeForTier(tier){
      if(tier==='중형')return 90;
      if(tier==='대형'||tier==='전설기함'||tier==='신화')return 150;
      return 30;  // 소형 또는 기타
    }
    const flagSize=flagship?_sizeForTier(flagship.tier):30;
    // 함선 tier별 속도 배율 — 소형=1.0, 중형=0.7, 대형=0.5 (사용자 명세)
    function _spdFactorForTier(tier){
      if(tier==='중형')return 0.7;
      if(tier==='대형'||tier==='전설기함'||tier==='신화')return 0.5;
      return 1.0;
    }
    // 엔진 등급별 속도 배율 — 영웅 이하=1, 전설/세트=1.5, 신화=2 (사용자 명세)
    let _engineMul=1;
    if(flagship&&flagship.parts){
      for(const pid of flagship.parts){
        const p=PARTS.find(x=>x.id===pid);
        if(!p||p.cat!=='engine')continue;
        if(p.rarity==='mythic')_engineMul=Math.max(_engineMul,2);
        else if(p.rarity==='legend'||p.rarity==='set')_engineMul=Math.max(_engineMul,1.5);
      }
    }
    const _shipSpdFactor=flagship?_spdFactorForTier(flagship.tier):1.0;
    const _shipSpdMul=_shipSpdFactor*_engineMul;  // 최종 배율
    // 무기 등급 판정 — 기함 장착 레이저 파츠의 rarity로 분류
    let weaponTier='normal';  // normal (영웅 이하) / legend (전설·세트) / mythic (신화)
    // 미사일 등급 판정 — 기함 장착 미사일 파츠의 rarity로 분류 (미사일 cd 배율 결정)
    let missileTier='normal';
    // 무기 등급(희귀도) → 동시 발사 수 (사용자 요청 2026-06-16: 일반1·희귀2·영웅3·전설4·신화5 확산식)
    const _rarityToShots=(r)=> r==='mythic'?5 : (r==='legend'||r==='set')?4 : (r==='hero'||r==='epic')?3 : (r==='rare'||r==='R')?2 : 1;
    let _laserShots=1, _missileShots=1;
    if(flagship&&flagship.parts){
      for(const pid of flagship.parts){
        const p=PARTS.find(x=>x.id===pid);
        if(!p)continue;
        if(p.cat==='weapon'&&(p.wtype!=='missile')){
          _laserShots=Math.max(_laserShots,_rarityToShots(p.rarity));
          if(p.rarity==='mythic')weaponTier='mythic';
          else if(p.rarity==='legend'||p.rarity==='set')weaponTier=(weaponTier==='mythic'?'mythic':'legend');
          else if(weaponTier==='normal')weaponTier='normal';
        }
        // 미사일 (cat==='missile' 또는 weapon+wtype==='missile')
        if(p.cat==='missile'||(p.cat==='weapon'&&p.wtype==='missile')){
          _missileShots=Math.max(_missileShots,_rarityToShots(p.rarity));
          if(p.rarity==='mythic')missileTier='mythic';
          else if(p.rarity==='legend'||p.rarity==='set')missileTier=(missileTier==='mythic'?'mythic':'legend');
        }
      }
    }
    // 미사일 cd 배율 (작을수록 빠름) — 사용자 명세
    //   normal/영웅 이하: 50% 느림 → ×2.0
    //   legend/set:      30% 느림 → ×1.43 (1/0.7)
    //   mythic:          10% 빠름 → ×0.91 (1/1.1)
    const _missileCdMul=missileTier==='mythic'?(1/1.1):missileTier==='legend'?(1/0.7):2.0;
    // ── 장착 무기 특성 → 미니게임 효과 매핑 ─────────────────────────────────
    // 1) 레이저/미사일 데미지 — 등급별 차등 (1발당 적·소행성 HP 비례 격파력)
    const _laserDmg=weaponTier==='mythic'?4:weaponTier==='legend'?2:1;
    const _missileDmg=missileTier==='mythic'?8:missileTier==='legend'?5:3;
    // 2) 신화 무기 — 다단발사 (40% 확률로 1발 더 발사, 허메틱 포 MW01 효과)
    const _laserMultiShotRate=weaponTier==='mythic'?0.40:0;
    // 3) 흡혈 효과 — 흡혈 폭격 코어(RB09, 전설)/영혼 흡수 매트릭스(RB10, 신화) 장착 시
    //    레이저 명중 시 HP/SH 일부 회복
    let _leechHpPct=0,_leechShPct=0;
    if(flagship&&flagship.parts){
      for(const pid of flagship.parts){
        if(pid==='RB10'){_leechHpPct=0.020;_leechShPct=0.018;break;}      // 신화: HP 2% / SH 1.8%
        if(pid==='RB09'){_leechHpPct=0.015;_leechShPct=0.012;}            // 전설: HP 1.5% / SH 1.2%
      }
    }
    // 4) 실드 회복률 — 실드 파츠 등급별 (피격 없을 때 천천히 차오름)
    let _shieldRegen=0;  // 1프레임당 회복량
    if(flagship&&flagship.parts){
      for(const pid of flagship.parts){
        const p=PARTS.find(x=>x.id===pid);
        if(p&&p.cat==='shield'){
          if(p.rarity==='mythic')_shieldRegen=Math.max(_shieldRegen,flagStat.maxSH*0.0015);
          else if(p.rarity==='legend'||p.rarity==='set')_shieldRegen=Math.max(_shieldRegen,flagStat.maxSH*0.0008);
          else _shieldRegen=Math.max(_shieldRegen,flagStat.maxSH*0.0003);
        }
      }
    }
    const W=1440, H=840;  // 1.5× 확대 (기존 960×560)
    // 오버레이
    const overlay=document.createElement('div');
    overlay.id='_ab-mini-overlay';
    overlay.style.cssText='position:fixed;left:0;top:0;right:0;bottom:0;width:100vw;height:100vh;background:#000;z-index:99997;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;font-family:Malgun Gothic,sans-serif;opacity:0;transition:opacity 0.6s ease-in;user-select:none';
    overlay.innerHTML=`
      <div style="position:absolute;top:14px;left:0;right:0;text-align:center;pointer-events:none">
        <div style="color:#cc66ff;font-size:13px;letter-spacing:6px">${I18N.t('ui.voidAsteroidBreakSub')}</div>
        <div style="color:#fff;font-size:18px;font-weight:bold;letter-spacing:3px;margin-top:4px">${I18N.t('ui.voidAsteroidBreak')}</div>
      </div>
      <canvas id="ab-cv" width="${W}" height="${H}" style="background:#000;border:2px solid #6633aa;border-radius:8px;box-shadow:0 0 36px rgba(180,80,255,.5);cursor:none;touch-action:none;outline:none;max-width:96vw;max-height:84vh" tabindex="0"></canvas>
      <div style="position:absolute;bottom:16px;left:0;right:0;text-align:center;color:#aaa;font-size:11px;letter-spacing:2px;line-height:1.7;pointer-events:none">
        ${I18N.t('ui.miniGameControls',{mouse:I18N.t('ui.mouseMovement')})}
      </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(()=>{overlay.style.opacity='1';});
    const cv=overlay.querySelector('#ab-cv'), cx=cv.getContext('2d');
    cv.focus();
    // 이미지 로드
    const shipImg=new Image();shipImg.src=shipSrc;
    const pirateImgs={};const _piVer=(typeof window!=='undefined'&&window._GAME_VER)?('?v='+encodeURIComponent(window._GAME_VER)):'';['PIRATE_S','PIRATE_M','PIRATE_L'].forEach(k=>{pirateImgs[k]=new Image();pirateImgs[k].src='img/combat/enemies/'+k+'.png'+_piVer;});
    // 백구 AI 무드 이미지 프리로드
    const baekguImgs={};
    ['fight','smile1','smile2','smile4','anger0','anger1','anger2','sad','sad_happy','surprise','advice','think','bothersome','default'].forEach(m=>{
      const im=new Image();
      im.src=(m==='surprise')?'img/chars/baekgu1_surprise.png'
           :(m==='default')?'img/chars/baekgu2.png'
           :'img/chars/baekgu2_'+m+'.png';
      baekguImgs[m]=im;
    });
  
    // 게임 상태
    const state={
      ship:{x:120, y:H/2, vx:0, vy:0, w:flagSize, h:flagSize, hp:flagStat.HP, maxHP:flagStat.HP, sh:flagStat.maxSH, maxSH:flagStat.maxSH, att:flagStat.ATT||30, hitFlash:0},
      asteroids:[],
      enemies:[],
      pBullets:[],   // 아군 레이저
      pMissiles:[],  // 아군 미사일 (호밍)
      eBullets:[],   // 적 레이저
      eMissiles:[],  // 적 미사일
      parts:[],      // 폭발 파편
      stars:[],      // 배경 별 (스크롤)
      ultEffects:[], // 필살기(테슬라 초공간 라이트닝) 잔존 이펙트
      loots:[],      // 적 격파 시 드롭된 파츠 아이템 (사용자 요청)
      ultimateCd:0,  // 필살기 쿨다운 (60fps 기준, 600=10초)
      startMs:Date.now(),
      durationMs:50000,  // 50초 — 이 시간 후 맵으로 복귀 가능
      ended:false,
      spawnTimerAst:0,
      spawnTimerEn:0,
      laserCd:0, missileCd:0,
      kills:0, score:0,
      mouseX:null, mouseY:null,
      // 백구 AI HUD — 무드+대사+만료 시각
      baekgu:{mood:'fight', msg:I18N.t('mini.bk.startup'), expireAt:Date.now()+2500, bubbleAlpha:1, lastTriggerMs:0}
    };
    // 백구 발화 헬퍼 — 우선순위/쿨다운 처리
    function _baekguSay(mood,msg,durMs,priority){
      const now=Date.now();
      // 우선순위 낮은 발화는 쿨다운 600ms 내 무시
      if(!priority && now-state.baekgu.lastTriggerMs<600)return;
      state.baekgu.mood=mood||'default';
      state.baekgu.msg=msg||'';
      state.baekgu.expireAt=now+(durMs||1800);
      state.baekgu.bubbleAlpha=1;
      state.baekgu.lastTriggerMs=now;
    }
    // 무작위 대사 풀
    const _baekguLines={
      hit:[
        ['anger1',I18N.t('mini.bk.hit1')],
        ['sad',I18N.t('mini.bk.dodge')],
        ['anger2',I18N.t('mini.bk.shieldCheck')]
      ],
      kill:[
        ['smile2',I18N.t('mini.bk.killNice')],
        ['fight',I18N.t('mini.bk.nextOne')],
        ['smile1',I18N.t('mini.bk.hitTaste')],
        ['smile4',I18N.t('mini.bk.oneShot')]
      ],
      asteroidKill:[
        ['smile2',I18N.t('mini.bk.smashAst')],
        ['fight',I18N.t('mini.bk.shattered')]
      ],
      lowHp:[
        ['anger2',I18N.t('mini.bk.danger')],
        ['sad',I18N.t('mini.bk.heal')]
      ],
      enemyApproach:[
        ['surprise',I18N.t('mini.bk.enemyRight')],
        ['fight',I18N.t('mini.bk.piratesReady')]
      ],
      advice:[
        ['advice',I18N.t('mini.bk.tipClick')],
        ['advice',I18N.t('mini.bk.tipHoming')],
        ['think',I18N.t('mini.bk.tipMissileBig')],
        ['advice',I18N.t('mini.bk.tipAstAvoid')]
      ],
      timeWarn:[
        ['fight',I18N.t('mini.bk.holdOn')],
        ['surprise',I18N.t('mini.bk.almostDone')]
      ]
    };
    function _baekguPick(cat,priority){
      const arr=_baekguLines[cat];if(!arr||!arr.length)return;
      const [mood,msg]=arr[Math.floor(Math.random()*arr.length)];
      _baekguSay(mood,msg,priority?2400:1600,priority);
    }
    // 별 배경 (3 레이어 패럴랙스)
    for(let i=0;i<140;i++){state.stars.push({x:Math.random()*W, y:Math.random()*H, sz:Math.random()*1.8+0.4, layer:Math.floor(Math.random()*3)});}
  
    // 키보드
    const keys={};
    const onKD=e=>{
      keys[e.code]=true;
      if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight','ControlLeft','ControlRight','Enter','KeyW','KeyA','KeyS','KeyD'].includes(e.code))e.preventDefault();
    };
    const onKU=e=>{keys[e.code]=false;};
    window.addEventListener('keydown',onKD);
    window.addEventListener('keyup',onKU);
    // 마우스 — 입력 모드는 키보드 vs 마우스 추적 (키 떼도 초기 위치로 안 돌아가게)
    state._inputMode='keyboard';  // 시작은 키보드 기준
    state._mouseDown=false;       // 마우스 누르고 있으면 자동 발사
    const onMM=e=>{const r=cv.getBoundingClientRect();state.mouseX=(e.clientX-r.left)*(W/r.width);state.mouseY=(e.clientY-r.top)*(H/r.height);state._inputMode='mouse';};
    const onMD=e=>{e.preventDefault();state._mouseDown=true;};  // 누르면 hold 시작
    const onMU=e=>{state._mouseDown=false;};
    const onML=e=>{state._mouseDown=false;};
    cv.addEventListener('mousemove',onMM);
    cv.addEventListener('mousedown',onMD);
    cv.addEventListener('mouseup',onMU);
    cv.addEventListener('mouseleave',onML);
    // 터치 (모바일 대응)
    const onTS=e=>{e.preventDefault();const t=e.touches[0];if(!t)return;const r=cv.getBoundingClientRect();state.mouseX=(t.clientX-r.left)*(W/r.width);state.mouseY=(t.clientY-r.top)*(H/r.height);state._inputMode='mouse';_fireLaser();};
    const onTM=e=>{e.preventDefault();const t=e.touches[0];if(!t)return;const r=cv.getBoundingClientRect();state.mouseX=(t.clientX-r.left)*(W/r.width);state.mouseY=(t.clientY-r.top)*(H/r.height);state._inputMode='mouse';};
    cv.addEventListener('touchstart',onTS,{passive:false});
    cv.addEventListener('touchmove',onTM,{passive:false});
  
    // 발사
    function _fireLaser(){
      if(state.laserCd>0||state.ended)return;
      state.laserCd=5;  // ≈85ms @ 60fps (기존 8 → 1.5× 빠르게)
      // 무기 등급별 확산 발사 (일반1·희귀2·영웅3·전설4·신화5) — 중심 대칭 부채꼴
      const cx=state.ship.x+state.ship.w/2, cy=state.ship.y, n=_laserShots;
      for(let i=0;i<n;i++){
        const off=(i-(n-1)/2);          // 중심 기준 대칭 오프셋
        state.pBullets.push({x:cx, y:cy+off*6, vx:14, vy:off*1.7, dmg:_laserDmg, life:90});
      }
      try{AudioMgr.playSfx('laser_fire',{vol:0.4,cooldown:30});}catch(e){}
    }
    function _fireMissile(){
      if(state.missileCd>0||state.ended)return;
      // 미사일 등급별 발사 속도 배율 적용
      //   base=9 (≈150ms @60fps) × _missileCdMul
      //   normal=18, legend≈13, mythic≈8
      state.missileCd=Math.round(9*_missileCdMul);
      // 가장 가까운 적 타겟 (소행성·해적 합산)
      let target=null,td=1e9;
      [...state.asteroids,...state.enemies].forEach(e=>{
        const d=Math.hypot(e.x-state.ship.x,e.y-state.ship.y);
        if(d<td){td=d;target=e;}
      });
      // 무기 등급별 확산 발사 (일반1·희귀2·영웅3·전설4·신화5) — 호밍이라 초기 부채꼴 후 타겟 추적
      const cx=state.ship.x+state.ship.w/2, cy=state.ship.y, n=_missileShots;
      for(let i=0;i<n;i++){
        const off=(i-(n-1)/2);
        state.pMissiles.push({x:cx, y:cy+off*9, vx:6, vy:off*1.3, target, dmg:_missileDmg, life:140});
      }
      try{AudioMgr.playSfx('missile',{vol:0.5,cooldown:60});}catch(e){}
    }
    // 필살기 — 테슬라 초공간 라이트닝 (LeftShift, 10초 쿨다운)
    // 함선 앞 방향 직선형 빔, 너비 = 함선 크기 ×2.5 (사용자 요청: 50% 축소)
    function _fireUltimate(){
      if(state.ultimateCd>0||state.ended)return;
      state.ultimateCd=600;  // 600 frames @60fps ≈ 10초
      const sx=state.ship.x+state.ship.w/2;
      const sy=state.ship.y;
      const lineHeight=state.ship.w*2.5;     // 함선 크기 ×2.5 너비 (이전 ×5 → 50% 축소)
      const halfH=lineHeight/2;
      // 라인 내 모든 적 함선 파괴
      for(let i=state.enemies.length-1;i>=0;i--){
        const e=state.enemies[i];
        if(e.x>=sx && Math.abs(e.y-sy)<=halfH+e.h/2){
          _explode(e.x,e.y,'#cc66ff',true);
          _dropLoot(e.x,e.y,e.sz==='L'||e.sz==='M');
          state.kills++;
          state.enemies.splice(i,1);
        }
      }
      // 라인 내 모든 소행성 파괴
      for(let i=state.asteroids.length-1;i>=0;i--){
        const a=state.asteroids[i];
        if(a.x>=sx && Math.abs(a.y-sy)<=halfH+a.r){
          _explode(a.x,a.y,'#cc66ff',a.sz==='L');
          state.kills++;
          state.asteroids.splice(i,1);
        }
      }
      // 라이트닝 이펙트 (45프레임 잔존)
      state.ultEffects.push({x:sx,y:sy,halfH,life:45,maxLife:45,seed:Math.random()*9999});
      // SFX + 백구 발화
      try{AudioMgr.playSfx('explosion',{vol:0.7});}catch(e){}
      try{AudioMgr.playSfx('laser_fire',{vol:0.6});}catch(e){}
      _baekguSay('fight',I18N.t('mini.bk.teslaUlt'),2400,true);
    }
  
    // 적 스폰
    function _spawnAsteroid(){
      const roll=Math.random();
      let sz, r, hp;
      // 소행성 HP — 추가 ×1.5 적용 (S:4→6 / M:8→12 / L:16→24, 사용자 요청 2026-06-16). 크기는 그대로
      if(roll<0.55){sz='S';r=14+Math.random()*8;hp=6;}
      else if(roll<0.85){sz='M';r=22+Math.random()*10;hp=12;}
      else {sz='L';r=34+Math.random()*14;hp=24;}
      const elapsed=(Date.now()-state.startMs)/1000;
      // 소행성 속도 ½ (사용자 요청)
      const speed=(2+Math.random()*1.2+Math.min(2,elapsed/8))*0.5;
      state.asteroids.push({
        x:W+r, y:30+Math.random()*(H-60), r, sz, hp, maxHp:hp,
        vx:-speed, vy:(Math.random()-0.5)*0.2,
        rot:Math.random()*Math.PI*2, rotSpeed:(Math.random()-0.5)*0.06
      });
    }
    function _spawnEnemy(){
      const roll=Math.random();
      let sz, w, h, hp, fireRate, dmg;
      // 크기 비율 1:3:5 + 적함은 동급 아군보다 2× 큼 (S60/M180/L300)
      // HP — 추가 ×1.5 적용 (S:12→18 / M:20→30 / L:40→60, 사용자 요청 2026-06-16)
      // 발사 빈도 70% (사용자 요청) — fireRate(쿨다운)는 클수록 발사 느려짐: ×1/0.7 ≈ ×1.43
      if(roll<0.5){sz='S';w=60;h=60;hp=18;fireRate=114;dmg=8;}
      else if(roll<0.85){sz='M';w=180;h=180;hp=30;fireRate=86;dmg=14;}
      else {sz='L';w=300;h=300;hp=60;fireRate=64;dmg=22;}
      state.enemies.push({
        x:W+w, y:60+Math.random()*(H-120), w, h, sz, hp, maxHp:hp,
        // 적 함선 속도 ½ (사용자 요청)
        vx:-(1.4+Math.random()*0.8)*0.5, vy:(Math.random()-0.5)*0.3,
        fireCd:30+Math.random()*30, fireRate, dmg,
        img:pirateImgs['PIRATE_'+sz]
      });
      // 백구 — 대형 적함 출현 또는 가끔
      if(sz==='L')_baekguPick('enemyApproach',true);
      else if(Math.random()<0.35)_baekguPick('enemyApproach');
    }
  
    // 충돌 검사
    function _circleHit(a,bx,by,br){return Math.hypot(a.x-bx,a.y-by)<a.r+br;}
    function _boxHit(e,bx,by,br){return bx>=e.x-e.w/2-br&&bx<=e.x+e.w/2+br&&by>=e.y-e.h/2-br&&by<=e.y+e.h/2+br;}
  
    function _explode(x,y,color,big){
      // 폭발 이펙트 1.5× — 파티클 수·확산 속도·생존 모두 상향
      const n=Math.round((big?22:12)*1.5);
      for(let k=0;k<n;k++){
        const ang=Math.random()*Math.PI*2, sp=(1+Math.random()*4)*1.5;
        state.parts.push({x,y,vx:Math.cos(ang)*sp,vy:Math.sin(ang)*sp,life:Math.round((25+Math.random()*15)*1.2),col:color||'#ffaa44',sz:3});
      }
    }
    // ─── 적함 격파 시 파츠 드롭 (사용자 요청) ─────────────────────────
    // 25% 확률로 일반~희귀 파츠 드롭. 대형 격파 시 35%, 신화 파츠는 등장 안 함.
    function _dropLoot(x,y,big){
      const rate=big?0.35:0.20;
      if(Math.random()>=rate)return;
      if(typeof PARTS==='undefined')return;
      // 풀: 비-퀘스트, 가격 있음, mythic 제외, 티어 가중치 (낮을수록 흔함)
      const _r=Math.random();
      let pool;
      if(_r<0.65)pool=PARTS.filter(p=>!p.quest&&p.price>0&&p.tier<6&&p.rarity!=='mythic'&&p.rarity!=='set');  // 일반
      else if(_r<0.93)pool=PARTS.filter(p=>!p.quest&&p.price>0&&p.tier>=6&&p.tier<11&&p.rarity!=='mythic');    // 영웅
      else pool=PARTS.filter(p=>!p.quest&&p.price>0&&p.tier>=11&&p.rarity!=='mythic');                          // 전설
      if(!pool||pool.length===0)pool=PARTS.filter(p=>!p.quest&&p.price>0&&p.rarity!=='mythic');
      if(!pool.length)return;
      const p=pool[Math.floor(Math.random()*pool.length)];
      // 등급별 색상
      const _col=p.rarity==='legend'||p.rarity==='L'||p.tier>=11?'#ffcc44':p.rarity==='set'?'#33ddff':p.rarity==='hero'||p.rarity==='H'||p.tier>=6?'#cc88ff':p.rarity==='R'?'#88ccff':'#bbbbbb';
      state.loots.push({
        id:p.id, nm:p.nm, col:_col,
        x:x, y:y,
        vx:-(0.4+Math.random()*0.6),     // 좌측으로 천천히 흘러감 (스크롤 함께)
        vy:(Math.random()-0.5)*0.4,
        life:280,  // ~4.7초 (60fps)
        maxLife:280,
        r:14
      });
    }
    function _damageShip(amt){
      if(state.ship.sh>0){
        const absorbed=Math.min(state.ship.sh,amt);
        state.ship.sh-=absorbed;amt-=absorbed;
      }
      if(amt>0){state.ship.hp-=amt;state.ship.hitFlash=10;
        cv.style.boxShadow='0 0 36px rgba(255,80,80,.8)';
        setTimeout(()=>{cv.style.boxShadow='0 0 36px rgba(180,80,255,.5)';},150);
        // 백구 — 피격
        const hpPct=state.ship.hp/Math.max(1,state.ship.maxHP);  // maxHP 0 가드 (NaN 방지)
        if(hpPct<0.3)_baekguPick('lowHp',true);
        else _baekguPick('hit');
      }
      if(state.ship.hp<=0){state.ship.hp=0;_baekguSay('sad',I18N.t('mini.bk.sunk'),3000,true);_finish(false);}
    }
  
    function _finish(win){
      if(state.ended)return;state.ended=true;
      // 리스너 정리
      window.removeEventListener('keydown',onKD);
      window.removeEventListener('keyup',onKU);
      // 보상
      // 명성 구간별 보상 비율 — 사용자 명세 (1/10로 축소 + 별도 드롭 보장)
      //   rep  1~10  → 10% / rep 11~50 → 5% / rep 51~100 → 3% / rep 100+ → 1%
      //   최종 ×0.1 적용 (드롭 보상이 메인, 크레딧은 소액)
      const _rep=G.reputation||0;
      const _rewPct=_rep>100?0.01:_rep>=51?0.03:_rep>=11?0.05:_rep>=1?0.10:0.10;
      // 격파 대수 기반 보상 배율 — 1대=10%, 100대 이상=100%, 그 사이 선형
      //   kills=1   → 0.1 + 0.9 * 0.01  ≈ 0.109  (≈10%)
      //   kills=50  → 0.55
      //   kills=100+ → 1.0 (캡)
      const _killScale=Math.min(1, 0.1 + 0.9*Math.min(1,Math.max(0,state.kills)/100));
      // 드롭 확률 보너스 — 격파 30대당 +1% (legend/mythic/blueprint 각각 독립)
      const _dropBonus=Math.floor(state.kills/30)*0.01;
      const rew=win?Math.round(((G.credits||0)*_rewPct+state.kills*800)*0.1*_killScale):0;
      const veRew=win?Math.round((20+state.kills*5)*0.1*_killScale):0;
      const pen=win?0:Math.round((G.credits||0)*0.03);
      // 랜덤 드롭 (승리 시) — 각 등급 독립 roll + 격파 보너스
      //   설계도 20% + bonus / 신화 30% + bonus / 전설·세트 50% + bonus (우선순위 BP→신화→전설)
      let dropTxt='', _dropImg='', _dropNm='';   // 보상 팝업 상단 이미지/멘트용 (사용자 요청 2026-06-16)
      if(win){
        const _bpId=(typeof BLUEPRINT_MAP!=='undefined')?BLUEPRINT_MAP[destPid]:null;
        const _canBp=_bpId&&!G.blueprints?.[_bpId];
        const _rBp=Math.random(), _rMy=Math.random(), _rLg=Math.random();
        // MMB01(이휘소 방정식 미사일) 설계도 +5%p 가산 (사용자 요청)
        const _bpRateBase=(_bpId==='MMB01')?(0.25+_dropBonus):(0.20+_dropBonus);
        if(_rBp<_bpRateBase&&_canBp){
          if(!G.blueprints)G.blueprints={};
          G.blueprints[_bpId]=true;
          const _rec=(typeof CRAFT_RECIPES!=='undefined')?CRAFT_RECIPES.find(r=>r.id===_bpId):null;
          dropTxt=I18N.t('drop.blueprint',{nm:(_rec?.nm||_bpId)});
          _dropNm=(_rec?.nm||_bpId); _dropImg='img/parts/'+_bpId+'.png';
          notify(I18N.t('notify.bpAcquiredFrom',{nm:_rec?.nm||_bpId}),'gold');
        } else if(_rMy<(0.30+_dropBonus)&&typeof QUEST_MYTHIC_PARTS!=='undefined'&&QUEST_MYTHIC_PARTS.length>0){
          // MMB01(이휘소 방정식 미사일) +5%p 가중치 (사용자 요청)
          const partId=_pickQuestMythicPart();
          const p=partId?PARTS.find(x=>x.id===partId):null;
          if(partId&&p){
            if(!G.inventory)G.inventory=[];
            const inv=G.inventory.find(i=>i.id===partId);
            if(inv)inv.qty++;else G.inventory.push({id:partId,nm:p.nm,qty:1});
            dropTxt=I18N.t('drop.mythicPart',{nm:(p.nm||partId)});
            _dropNm=(typeof partDisplayNm==='function'?partDisplayNm(p):(p.nm||partId)); _dropImg='img/parts/'+partId+'.png';
            notify(I18N.t('notify.mythicPartLabel',{nm:p.nm||partId}),'gold');
          }
        } else if(_rLg<(0.50+_dropBonus)&&typeof QUEST_SET_PARTS!=='undefined'&&QUEST_SET_PARTS.length>0){
          const partId=QUEST_SET_PARTS[Math.floor(Math.random()*QUEST_SET_PARTS.length)];
          if(!G.inventory)G.inventory=[];
          const inv=G.inventory.find(i=>i.id===partId);
          if(inv)inv.qty++;else G.inventory.push({id:partId,qty:1});
          const p=PARTS.find(x=>x.id===partId);
          dropTxt=I18N.t('drop.partFormat',{label:p?.rarity==='set'?I18N.t('drop.setPart'):I18N.t('drop.legendPart'),nm:(p?.nm||partId)});
          _dropNm=(typeof partDisplayNm==='function'&&p?partDisplayNm(p):(p?.nm||partId)); _dropImg='img/parts/'+partId+'.png';
          notify(I18N.t('notify.partWithRarity',{kind:p?.rarity==='set'?I18N.t('ui.setRare'):I18N.t('ui.legendRare'),nm:p?.nm||partId}),'gold');
        }
      }
      if(win){G.credits=(G.credits||0)+rew;G.voidEssence=(G.voidEssence||0)+veRew*2;}  // 사용자 요청 ×2 (전투 승리 VE 2배)
      else{G.credits=Math.max(100,(G.credits||0)-pen);}
      // 퀘스트 1회 효과 — 도착 행성 허브 해금 진행도 +1 (해금 요소 1회 차감)
      if(win&&destPid){try{addHubProgress(destPid);}catch(e){}}
      // 실제 함대 hp 반영 (전투 결과 보존)
      if(flagship){flagship.hp=Math.max(1,Math.floor(state.ship.hp));if(flagship.sh!=null)flagship.sh=Math.max(0,Math.floor(state.ship.sh));}
      saveGame(true);
      // 상단 시각: 드롭 아이템/함선/설계도 이미지 (없으면 🚀) + 랜덤 발견 멘트 (사용자 요청 2026-06-16)
      const _flavorN=Math.floor(Math.random()*5)+1;
      const _flavorLine=_dropNm?`<div style="color:#ffe6a8;font-size:14px;font-style:italic;line-height:1.5;margin-bottom:10px;padding:6px 12px;background:rgba(255,215,0,.06);border-radius:6px">${I18N.t('minireward.flavor'+_flavorN,{nm:_dropNm})}</div>`:'';
      const _topVisual=_dropImg?`<div style="width:104px;height:104px;margin:0 auto 12px;border-radius:12px;overflow:hidden;border:2px solid #ffd700;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center"><img src="${_dropImg}" style="width:100%;height:100%;object-fit:contain" onerror="this.outerHTML='<div style=&quot;font-size:56px&quot;>🚀</div>'"></div>`:`<div style="font-size:48px;margin-bottom:10px">🚀</div>`;
      const msg=win?
        `${_topVisual}
         <div style="color:#ffd700;font-size:24px;font-weight:bold;letter-spacing:3px;margin-bottom:8px">${I18N.t('ui.asteroidBreakthrough')}</div>
         ${_flavorLine}
         <div style="color:#66ff99;font-size:13px;line-height:1.9;margin-bottom:10px">${I18N.t('ui.shipsKilled',{n:state.kills,hp:Math.floor(state.ship.hp),max:state.ship.maxHP})}</div>
         <div style="color:#ffe;font-size:13px;line-height:1.9;background:rgba(255,215,0,.08);border:1px solid rgba(255,215,0,.3);border-radius:6px;padding:10px 16px">
           ${I18N.t('ui.creditsRewardLine',{cr:rew.toLocaleString()})} <span style="color:#aaa;font-size:11px">${I18N.t('ui.rewardMultLine',{pct:Math.round(_killScale*100)})}</span><br>${I18N.t('ui.veRewardLine',{n:veRew})}
           ${dropTxt?'<br>'+dropTxt:''}
           <br><span style="color:#cc99ff;font-size:11px">${I18N.t('ui.dropBonusLine',{pct:Math.round(_dropBonus*100)})}</span>
           <br><span style="color:#66ddff;font-size:11px">${I18N.t('ui.planetUnlockLine')}</span>
         </div>`:
        `<div style="font-size:48px;margin-bottom:10px">💥</div>
         <div style="color:#ff6666;font-size:24px;font-weight:bold;letter-spacing:3px;margin-bottom:8px">${I18N.t('ui.flagshipDown')}</div>
         <div style="color:#aaa;font-size:13px;line-height:1.9;margin-bottom:10px">${I18N.t('ui.shipsKilledShort',{n:state.kills})}</div>
         <div style="color:#ffaa99;font-size:13px;line-height:1.9;background:rgba(255,60,60,.08);border:1px solid rgba(255,80,80,.3);border-radius:6px;padding:10px 16px">
           ${I18N.t('ui.creditsPenLine',{cr:pen.toLocaleString()})}
         </div>`;
      const result=document.createElement('div');
      // 팝업 1.5배 확대 (사용자 요청 2026-06-16) — 중앙 기준 scale
      result.style.cssText='position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) scale(1.5);transform-origin:center;background:rgba(20,10,40,.96);border:2px solid '+(win?'#ffd700':'#ff6666')+';border-radius:12px;padding:24px 36px;text-align:center;min-width:320px;max-width:62vw;box-shadow:0 8px 48px rgba(180,80,255,.5);z-index:10';
      result.innerHTML=msg+'<button style="margin-top:14px;padding:10px 28px;background:rgba(180,80,255,.2);border:1.5px solid #cc66ff;color:#fff;border-radius:6px;cursor:pointer;font-size:13px;letter-spacing:2px" onclick="(function(){var ov=document.getElementById(\'_ab-mini-overlay\');if(ov)ov.remove();})()">'+I18N.t('drop.continueBtn')+'</button>';
      overlay.appendChild(result);
    }
  
    // 메인 루프
    let lastT=Date.now();
    function tick(){
      if(!document.body.contains(overlay))return;
      if(state.ended)return;
      const now=Date.now();
      const dt=(now-lastT)/16.67;
      lastT=now;
      const elapsed=now-state.startMs;
      const leftSec=Math.max(0,Math.ceil((state.durationMs-elapsed)/1000));
  
      // 입력 → 이동 (tier × engine 등급 배율 적용)
      let vx=0,vy=0;
      const SPD=5*_shipSpdMul;
      if(keys.KeyA||keys.ArrowLeft)vx-=SPD;
      if(keys.KeyD||keys.ArrowRight)vx+=SPD;
      if(keys.KeyW||keys.ArrowUp)vy-=SPD;
      if(keys.KeyS||keys.ArrowDown)vy+=SPD;
      // 키가 눌리면 keyboard 모드로 전환 (마우스 lerp 끊김)
      if(vx!==0||vy!==0){
        state._inputMode='keyboard';
        state.ship.x+=vx*dt;state.ship.y+=vy*dt;
      } else if(state._inputMode==='mouse'&&state.mouseX!=null){
        // 마우스 모드에서만 lerp — 배율 함께 적용 (0.04~0.50 클램프)
        const _lerp=clamp(0.18*_shipSpdMul,0.04,0.50);
        state.ship.x+=(state.mouseX-state.ship.w/2-state.ship.x)*_lerp;
        state.ship.y+=(state.mouseY-state.ship.y)*_lerp;
      }
      // (둘 다 아니면 현재 위치 그대로 유지 — 초기 위치로 안 돌아감)
      // 클램프 (캔버스 영역)
      state.ship.x=clamp(state.ship.x,0,W-state.ship.w-4);
      state.ship.y=Math.max(state.ship.h/2,Math.min(H-state.ship.h/2,state.ship.y));
  
      // 발사 입력
      if(state.laserCd>0)state.laserCd-=dt;
      if(state.missileCd>0)state.missileCd-=dt;
      if(state.ultimateCd>0)state.ultimateCd-=dt;
      // 실드 자연 회복 — 장착 실드 파츠 등급별 (피격 직후엔 회복 안 함)
      if(_shieldRegen>0 && state.ship.hitFlash<=0 && state.ship.sh<state.ship.maxSH){
        state.ship.sh=Math.min(state.ship.maxSH,state.ship.sh+_shieldRegen*dt);
      }
      // hold 자동 발사 — 키 또는 마우스 버튼을 누르고 있는 동안 cd마다 계속 발사
      //   레이저: RightShift + 마우스 클릭 (LeftShift는 필살기 전용)
      //   미사일: Ctrl/Enter
      //   필살기: LeftShift (테슬라 초공간 라이트닝, 10초 쿨)
      if(keys.ShiftRight||state._mouseDown)_fireLaser();
      if(keys.ControlLeft||keys.ControlRight||keys.Enter)_fireMissile();
      if(keys.ShiftLeft)_fireUltimate();
  
      // 스폰
      state.spawnTimerAst+=dt;state.spawnTimerEn+=dt;
      if(state.spawnTimerAst>=Math.max(14,40-Math.floor(elapsed/2000)*4)){state.spawnTimerAst=0;_spawnAsteroid();}
      // 마지막 20초(러시 구간): 적 스폰 간격 절반 + 매 스폰마다 2척 (총 2배)
      const _isRush=(state.durationMs-elapsed)<=20000;
      const _enThresh=Math.max(140,280-Math.floor(elapsed/3000)*30)*(_isRush?0.5:1);
      if(state.spawnTimerEn>=_enThresh){
        state.spawnTimerEn=0;
        _spawnEnemy();
        if(_isRush)_spawnEnemy();
        // 러시 진입 시점에 한 번만 경고
        if(_isRush&&!state._rushAnnounced){
          state._rushAnnounced=true;
          _baekguSay('anger2',I18N.t('mini.bk.lastReinforce'),2800,true);
          try{notify(I18N.t('notify.last20Seconds'),'warn');}catch(e){}
        }
      }
  
      // ─── 렌더 시작 ───
      cx.fillStyle='#000';cx.fillRect(0,0,W,H);
      // 배경 별 스크롤 (우→좌)
      for(const s of state.stars){
        s.x-=(0.4+s.layer*0.8)*dt;
        if(s.x<0)s.x=W;
        const col=['#445','#778','#abc'][s.layer]||'#789';
        cx.fillStyle=col;cx.fillRect(s.x,s.y,s.sz,s.sz);
      }
  
      // 적 함선 업데이트·렌더
      for(let i=state.enemies.length-1;i>=0;i--){
        const e=state.enemies[i];
        e.x+=e.vx*dt;e.y+=e.vy*dt;
        if(e.y<e.h/2||e.y>H-e.h/2)e.vy=-e.vy;
        e.fireCd-=dt;
        if(e.fireCd<=0&&e.x<W-20){
          e.fireCd=e.fireRate;
          // 75% 레이저, 25% 미사일 — 사용자 요청 "미사일 발사속도 절반" 반영
          if(Math.random()<0.75){
            state.eBullets.push({x:e.x-e.w/2,y:e.y,vx:-9,dmg:e.dmg,life:120});
          } else {
            state.eMissiles.push({x:e.x-e.w/2,y:e.y,vx:-4,vy:0,target:state.ship,dmg:e.dmg*1.4,life:160});
          }
        }
        if(e.x<-e.w){state.enemies.splice(i,1);continue;}
        // 그리기
        if(e.img&&e.img.complete&&e.img.naturalWidth>0){
          cx.save();cx.translate(e.x,e.y);cx.scale(-1,1);  // 좌측 향하게 반전
          cx.drawImage(e.img,-e.w/2,-e.h/2,e.w,e.h);cx.restore();
        } else {
          cx.fillStyle='#cc4444';cx.beginPath();cx.ellipse(e.x,e.y,e.w/2,e.h/2,0,0,Math.PI*2);cx.fill();
        }
        // HP 바 (잔여 비율)
        if(e.hp<e.maxHp){
          cx.fillStyle='rgba(0,0,0,.6)';cx.fillRect(e.x-e.w/2,e.y-e.h/2-8,e.w,4);
          cx.fillStyle='#ff6666';cx.fillRect(e.x-e.w/2,e.y-e.h/2-8,e.w*(e.hp/e.maxHp),4);
        }
      }
  
      // 소행성 업데이트·렌더
      for(let i=state.asteroids.length-1;i>=0;i--){
        const a=state.asteroids[i];
        a.x+=a.vx*dt;a.y+=a.vy*dt;a.rot+=a.rotSpeed*dt;
        if(a.y<a.r||a.y>H-a.r)a.vy=-a.vy;
        if(a.x<-a.r){state.asteroids.splice(i,1);continue;}
        // 기함 충돌 = 데미지 (소행성은 자체 폭발)
        if(Math.hypot(a.x-(state.ship.x+state.ship.w/2),a.y-state.ship.y)<a.r+state.ship.w*0.35){
          _explode(a.x,a.y,'#ffaa66',a.sz==='L');
          _damageShip(a.sz==='L'?60:a.sz==='M'?30:15);
          state.asteroids.splice(i,1);continue;
        }
        // 그리기
        cx.save();cx.translate(a.x,a.y);cx.rotate(a.rot);
        cx.fillStyle='#998877';cx.strokeStyle='#665544';cx.lineWidth=1.5;
        cx.beginPath();
        const sides=8;
        for(let k=0;k<sides;k++){const ang=(k/sides)*Math.PI*2;const rr=a.r*(0.85+0.3*Math.sin(k*7.3));const px=Math.cos(ang)*rr,py=Math.sin(ang)*rr;if(k===0)cx.moveTo(px,py);else cx.lineTo(px,py);}
        cx.closePath();cx.fill();cx.stroke();
        cx.fillStyle='#776655';cx.beginPath();cx.arc(-a.r*0.3,-a.r*0.2,a.r*0.18,0,Math.PI*2);cx.fill();
        cx.restore();
      }
  
      // 아군 레이저
      for(let i=state.pBullets.length-1;i>=0;i--){
        const b=state.pBullets[i];b.x+=b.vx*dt;b.y+=(b.vy||0)*dt;b.life-=dt;
        if(b.x>W||b.life<=0){state.pBullets.splice(i,1);continue;}
        // 충돌
        let hit=false;
        for(let k=state.asteroids.length-1;k>=0;k--){
          const a=state.asteroids[k];
          if(_circleHit(a,b.x,b.y,3)){a.hp-=b.dmg;if(a.hp<=0){_explode(a.x,a.y,'#ffaa66',a.sz==='L');state.kills++;state.asteroids.splice(k,1);if(Math.random()<0.18)_baekguPick('asteroidKill');}hit=true;break;}
        }
        if(!hit){
          for(let k=state.enemies.length-1;k>=0;k--){
            const e=state.enemies[k];
            if(_boxHit(e,b.x,b.y,3)){e.hp-=b.dmg;if(e.hp<=0){_explode(e.x,e.y,'#ff6644',true);_dropLoot(e.x,e.y,e.sz==='L'||e.sz==='M');state.kills++;state.enemies.splice(k,1);_baekguPick('kill',true);}hit=true;break;}
          }
        }
        // 흡혈 — 레이저 명중 시 maxHP/maxSH 일부 회복 (RB09/RB10 장착 효과)
        if(hit && (_leechHpPct>0||_leechShPct>0)){
          if(_leechHpPct>0)state.ship.hp=Math.min(state.ship.maxHP,state.ship.hp+state.ship.maxHP*_leechHpPct);
          if(_leechShPct>0)state.ship.sh=Math.min(state.ship.maxSH,(state.ship.sh||0)+state.ship.maxSH*_leechShPct);
        }
        if(hit){state.pBullets.splice(i,1);continue;}
        // 그리기 — 무기 등급별 분기 (사용자 명세)
        //   normal(영웅 이하): 기본 청록 빔 (1.5배 확대)
        //   legend(전설·세트): 지속 전투모드 풍 — 두꺼운 다단 빔 + 강한 글로우
        //   mythic(신화): 번개 지그재그 + 1.3× 더 두꺼운 빔 + 흰 코어
        const bLen=18, bThick=4.5;  // 기본 1.5× (기존 12/3)
        if(weaponTier==='mythic'){
          // 번개 효과 — 지그재그
          const segs=4, mult=1.3;
          cx.save();
          cx.strokeStyle='#88ddff';cx.shadowColor='#aaeeff';cx.shadowBlur=18;cx.lineWidth=bThick*mult+1;cx.lineCap='round';
          cx.beginPath();cx.moveTo(b.x-bLen,b.y);
          for(let s=1;s<=segs;s++){
            const px=b.x-bLen+(bLen/segs)*s;
            const py=b.y+(s===segs?0:(Math.random()-0.5)*6);
            cx.lineTo(px,py);
          }
          cx.stroke();
          // 흰 코어
          cx.strokeStyle='#ffffff';cx.shadowBlur=0;cx.lineWidth=bThick*0.7;
          cx.beginPath();cx.moveTo(b.x-bLen,b.y);cx.lineTo(b.x,b.y);cx.stroke();
          cx.restore();
        } else if(weaponTier==='legend'){
          // 전설 — 두꺼운 다단 빔 (지속 전투모드 느낌)
          cx.save();
          // 바깥 글로우
          cx.strokeStyle='#00f3ff';cx.shadowColor='#00f3ff';cx.shadowBlur=20;cx.lineWidth=bThick*1.6;cx.lineCap='round';
          cx.beginPath();cx.moveTo(b.x-bLen,b.y);cx.lineTo(b.x,b.y);cx.stroke();
          // 중간 빔
          cx.strokeStyle='#aaf6ff';cx.shadowBlur=12;cx.lineWidth=bThick*0.9;
          cx.beginPath();cx.moveTo(b.x-bLen,b.y);cx.lineTo(b.x,b.y);cx.stroke();
          // 코어
          cx.strokeStyle='#ffffff';cx.shadowBlur=0;cx.lineWidth=bThick*0.4;
          cx.beginPath();cx.moveTo(b.x-bLen,b.y);cx.lineTo(b.x,b.y);cx.stroke();
          cx.restore();
        } else {
          // normal — 기본 (1.5×)
          cx.strokeStyle='#00f3ff';cx.lineWidth=bThick;cx.shadowColor='#00f3ff';cx.shadowBlur=15;
          cx.beginPath();cx.moveTo(b.x-bLen,b.y);cx.lineTo(b.x,b.y);cx.stroke();
          cx.shadowBlur=0;
        }
      }
  
      // 아군 미사일 (호밍) — 3단계 타게팅 + 근접 폭발(맴돌이 방지) + 적중영역 3배
      function _findMissileTarget(m){
        // 3단계 거리 밴드: 1단계 가까움(≤180) → 2단계 중간(≤360) → 3단계 멀음(전체)
        const all=[...state.asteroids,...state.enemies].filter(e=>e&&e.hp>0&&(e.x===undefined||e.x>-40));
        if(!all.length)return null;
        const tiers=[180, 360, Infinity];
        for(const tierR of tiers){
          let nt=null, td=Infinity;
          for(const e of all){
            const d=Math.hypot(e.x-m.x,e.y-m.y);
            if(d<=tierR && d<td){td=d;nt=e;}
          }
          if(nt)return nt;
        }
        return null;
      }
      for(let i=state.pMissiles.length-1;i>=0;i--){
        const m=state.pMissiles[i];
        // 주기적 재타게팅 (10프레임마다) — 죽은 타겟·범위 이탈 대응 + 항상 가까운 적 우선
        if(m._retCd===undefined)m._retCd=0;
        m._retCd-=dt;
        if(m._retCd<=0||!m.target||m.target.hp<=0||(m.target.x!==undefined&&m.target.x<-40)){
          m.target=_findMissileTarget(m);
          m._retCd=10;
        }
        if(m.target){
          const dx=m.target.x-m.x, dy=m.target.y-m.y, d=Math.hypot(dx,dy)||1;
          // 가까울수록 더 강한 선회 (맴돌이 방지)
          const turn=d<80?1.6 : d<180?1.1 : 0.7;
          m.vx+=(dx/d)*turn*dt; m.vy+=(dy/d)*turn*dt;
          // 속도 클램프
          const sp=Math.hypot(m.vx,m.vy);if(sp>12){m.vx*=12/sp;m.vy*=12/sp;}
          // 근접 폭발 — 25px 이내면 즉시 적중 (3배 적중영역의 의미를 살림)
          if(d<25){
            if(m.target.r!=null){
              // 소행성
              m.target.hp-=m.dmg;
              if(m.target.hp<=0){
                _explode(m.target.x,m.target.y,'#ffaa66',true);state.kills++;
                const ai=state.asteroids.indexOf(m.target);if(ai>=0)state.asteroids.splice(ai,1);
                if(Math.random()<0.18)_baekguPick('asteroidKill');
              }
            } else if(m.target.w!=null){
              // 적함
              m.target.hp-=m.dmg;
              if(m.target.hp<=0){
                _explode(m.target.x,m.target.y,'#ff6644',true);
                _dropLoot(m.target.x,m.target.y,m.target.sz==='L'||m.target.sz==='M');
                state.kills++;
                const ei=state.enemies.indexOf(m.target);if(ei>=0)state.enemies.splice(ei,1);
                _baekguPick('kill',true);
              }
            }
            _explode(m.x,m.y,'#ff8844',false);
            state.pMissiles.splice(i,1);
            continue;
          }
        }
        m.x+=m.vx*dt;m.y+=m.vy*dt;m.life-=dt;
        if(m.x>W+30||m.x<-30||m.y<-30||m.y>H+30||m.life<=0){state.pMissiles.splice(i,1);continue;}
        // 직접 충돌 (적중영역 5→15, 3배 확장)
        let hit=false;
        for(let k=state.asteroids.length-1;k>=0;k--){
          const a=state.asteroids[k];
          if(_circleHit(a,m.x,m.y,15)){a.hp-=m.dmg;if(a.hp<=0){_explode(a.x,a.y,'#ffaa66',true);state.kills++;state.asteroids.splice(k,1);if(Math.random()<0.18)_baekguPick('asteroidKill');}hit=true;break;}
        }
        if(!hit){
          for(let k=state.enemies.length-1;k>=0;k--){
            const e=state.enemies[k];
            if(_boxHit(e,m.x,m.y,15)){e.hp-=m.dmg;if(e.hp<=0){_explode(e.x,e.y,'#ff6644',true);_dropLoot(e.x,e.y,e.sz==='L'||e.sz==='M');state.kills++;state.enemies.splice(k,1);_baekguPick('kill',true);}hit=true;break;}
          }
        }
        if(hit){_explode(m.x,m.y,'#ff8844',false);state.pMissiles.splice(i,1);continue;}
        // 그리기 — 미사일 본체 1.5× 확장 + 글로우도 1.5×
        cx.save();cx.translate(m.x,m.y);cx.rotate(Math.atan2(m.vy,m.vx));
        cx.fillStyle='#ff66cc';cx.shadowColor='#ff66cc';cx.shadowBlur=18;
        cx.beginPath();cx.moveTo(-12,-4.5);cx.lineTo(12,0);cx.lineTo(-12,4.5);cx.closePath();cx.fill();
        cx.shadowBlur=0;cx.restore();
      }
  
      // 적 레이저
      for(let i=state.eBullets.length-1;i>=0;i--){
        const b=state.eBullets[i];b.x+=b.vx*dt;b.life-=dt;
        if(b.x<-12||b.life<=0){state.eBullets.splice(i,1);continue;}
        // 기함 충돌
        if(b.x>=state.ship.x&&b.x<=state.ship.x+state.ship.w&&b.y>=state.ship.y-state.ship.h/2&&b.y<=state.ship.y+state.ship.h/2){
          _damageShip(b.dmg);_explode(b.x,b.y,'#ff4444',false);state.eBullets.splice(i,1);continue;
        }
        cx.strokeStyle='#ff4444';cx.lineWidth=3;cx.shadowColor='#ff4444';cx.shadowBlur=8;
        cx.beginPath();cx.moveTo(b.x,b.y);cx.lineTo(b.x+12,b.y);cx.stroke();cx.shadowBlur=0;
      }
  
      // 적 미사일
      for(let i=state.eMissiles.length-1;i>=0;i--){
        const m=state.eMissiles[i];
        const ty=state.ship.y, tx=state.ship.x+state.ship.w/2;
        const dx=tx-m.x, dy=ty-m.y, d=Math.hypot(dx,dy)||1;
        m.vx+=(dx/d)*0.5*dt;m.vy+=(dy/d)*0.5*dt;
        const sp=Math.hypot(m.vx,m.vy);if(sp>8){m.vx*=8/sp;m.vy*=8/sp;}
        m.x+=m.vx*dt;m.y+=m.vy*dt;m.life-=dt;
        if(m.x<-30||m.life<=0){state.eMissiles.splice(i,1);continue;}
        // 기함 충돌
        if(Math.hypot(m.x-tx,m.y-ty)<state.ship.w*0.4){
          _damageShip(m.dmg);_explode(m.x,m.y,'#ff4488',true);state.eMissiles.splice(i,1);continue;
        }
        cx.save();cx.translate(m.x,m.y);cx.rotate(Math.atan2(m.vy,m.vx));
        cx.fillStyle='#ff6688';cx.shadowColor='#ff6688';cx.shadowBlur=10;
        cx.beginPath();cx.moveTo(-7,-3);cx.lineTo(7,0);cx.lineTo(-7,3);cx.closePath();cx.fill();
        cx.shadowBlur=0;cx.restore();
      }
  
      // 쉴드 시각화 — 매우 옅게(약 10% 투명도) 기함 둘레에 청록 오라
      if(state.ship.sh>0){
        const shRatio=clamp(state.ship.sh/Math.max(1,state.ship.maxSH),0,1);
        const shAlpha=0.10*shRatio;  // 최대 10%
        cx.save();
        cx.globalAlpha=shAlpha;
        const grd=cx.createRadialGradient(state.ship.x+state.ship.w/2,state.ship.y,state.ship.w*0.3,state.ship.x+state.ship.w/2,state.ship.y,state.ship.w*0.85);
        grd.addColorStop(0,'rgba(102,221,255,.8)');
        grd.addColorStop(0.7,'rgba(102,221,255,.4)');
        grd.addColorStop(1,'rgba(102,221,255,0)');
        cx.fillStyle=grd;
        cx.beginPath();cx.ellipse(state.ship.x+state.ship.w/2,state.ship.y,state.ship.w*0.85,state.ship.h*0.7,0,0,Math.PI*2);cx.fill();
        // 옅은 테두리 (헥사 임팩트 느낌)
        cx.globalAlpha=shAlpha*1.5;
        cx.strokeStyle='#66ddff';cx.lineWidth=1.5;
        cx.beginPath();cx.ellipse(state.ship.x+state.ship.w/2,state.ship.y,state.ship.w*0.8,state.ship.h*0.65,0,0,Math.PI*2);cx.stroke();
        cx.restore();
      }
  
      // 기함 그리기 (좌측, 우측 향함)
      if(shipImg.complete&&shipImg.naturalWidth>0){
        cx.save();
        if(state.ship.hitFlash>0){cx.globalAlpha=0.4+0.3*Math.random();state.ship.hitFlash-=dt;}
        cx.drawImage(shipImg,state.ship.x,state.ship.y-state.ship.h/2,state.ship.w,state.ship.h);
        cx.restore();
      } else {
        cx.fillStyle='#00f3ff';cx.beginPath();
        cx.moveTo(state.ship.x+state.ship.w,state.ship.y);
        cx.lineTo(state.ship.x,state.ship.y-state.ship.h/2);
        cx.lineTo(state.ship.x+state.ship.w*0.3,state.ship.y);
        cx.lineTo(state.ship.x,state.ship.y+state.ship.h/2);
        cx.closePath();cx.fill();
      }
      // 엔진 잔염
      if(state.ship.hitFlash<=0){
        cx.fillStyle='rgba(102,221,255,'+(0.4+0.4*Math.random())+')';
        cx.beginPath();cx.ellipse(state.ship.x-8,state.ship.y,12,4,0,0,Math.PI*2);cx.fill();
      }
  
      // 파편
      for(let i=state.parts.length-1;i>=0;i--){
        const p=state.parts[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;
        if(p.life<=0){state.parts.splice(i,1);continue;}
        cx.fillStyle=p.col;cx.globalAlpha=Math.max(0,p.life/30);
        cx.beginPath();cx.arc(p.x,p.y,p.sz||3,0,Math.PI*2);cx.fill();
      }
      cx.globalAlpha=1;
  
      // ─── 드롭된 파츠 (loot) — 이동·픽업·그리기 (사용자 요청) ───
      if(state.loots&&state.loots.length){
        const shipCx=state.ship.x+state.ship.w/2, shipCy=state.ship.y;
        const shipR=state.ship.w*0.6;
        for(let li=state.loots.length-1;li>=0;li--){
          const lt=state.loots[li];
          lt.x+=lt.vx*dt; lt.y+=lt.vy*dt;
          lt.life-=dt;
          // 화면 밖이나 수명 종료 시 제거
          if(lt.life<=0||lt.x<-30){state.loots.splice(li,1);continue;}
          // 함선과 충돌 → 픽업
          const dx=lt.x-shipCx, dy=lt.y-shipCy;
          if(Math.sqrt(dx*dx+dy*dy)<=shipR+lt.r){
            // 인벤토리에 추가
            try{
              if(!G.inventory)G.inventory=[];
              const inv=G.inventory.find(i=>i.id===lt.id);
              if(inv)inv.qty++;else G.inventory.push({id:lt.id,nm:lt.nm,qty:1});
              notify(I18N.t('notify.partGotMinigame',{nm:lt.nm}),'gold');
              try{AudioMgr.playSfx('gacha_pull',{vol:0.5});}catch(e){}
              try{_baekguSay('happy',I18N.t('mini.bk.partsGet'),2000,false);}catch(e){}
            }catch(e){}
            state.loots.splice(li,1);
            continue;
          }
          // 그리기 — 등급 색상 글로우 박스 + 깜빡임
          const blink=lt.life<60?(Math.sin(lt.life*0.5)*0.4+0.6):1;
          cx.save();
          cx.globalAlpha=Math.min(1,(lt.life/lt.maxLife)*1.2)*blink;
          cx.shadowColor=lt.col;cx.shadowBlur=16;
          cx.fillStyle=lt.col;
          cx.fillRect(lt.x-lt.r,lt.y-lt.r,lt.r*2,lt.r*2);
          cx.fillStyle='rgba(0,0,0,.6)';
          cx.fillRect(lt.x-lt.r+3,lt.y-lt.r+3,lt.r*2-6,lt.r*2-6);
          // 내부 박스 라벨 (작은 글자 — 화면에 너무 많으면 제거)
          cx.shadowBlur=0;
          cx.fillStyle='#fff';cx.font='bold 11px monospace';cx.textAlign='center';cx.textBaseline='middle';
          cx.fillText('⚙',lt.x,lt.y);
          cx.restore();
        }
        cx.globalAlpha=1;cx.textAlign='left';cx.textBaseline='alphabetic';
      }
  
      // 필살기 라이트닝 이펙트 (테슬라 초공간) — 함선 앞쪽 직선 빔
      if(state.ultEffects&&state.ultEffects.length){
        for(let i=state.ultEffects.length-1;i>=0;i--){
          const u=state.ultEffects[i];
          u.life-=dt;
          if(u.life<=0){state.ultEffects.splice(i,1);continue;}
          const t=u.life/u.maxLife;
          cx.save();
          // 외광 (보라 글로우)
          cx.globalAlpha=0.35*t;
          cx.fillStyle='#cc66ff';
          cx.fillRect(u.x,u.y-u.halfH,W-u.x,u.halfH*2);
          // 중심 코어 (밝은 자홍색)
          cx.globalAlpha=0.85*t;
          cx.fillStyle='#ff44ff';
          cx.fillRect(u.x,u.y-u.halfH*0.35,W-u.x,u.halfH*0.7);
          // 메인 라이트닝 zigzag (3줄, 두꺼움)
          cx.globalAlpha=t;
          cx.shadowColor='#ff66ff';cx.shadowBlur=24;
          for(let k=0;k<3;k++){
            cx.strokeStyle='#ffffff';
            cx.lineWidth=4+k*2;
            cx.beginPath();
            let _y=u.y+(Math.random()-0.5)*u.halfH*0.3;
            cx.moveTo(u.x,_y);
            for(let xx=u.x+30;xx<W;xx+=30+Math.random()*40){
              _y=u.y+(Math.random()-0.5)*u.halfH*0.7;
              cx.lineTo(xx,_y);
            }
            cx.lineTo(W,u.y+(Math.random()-0.5)*20);
            cx.stroke();
          }
          // 흰 화이트 코어 라인
          cx.shadowBlur=0;
          cx.globalAlpha=t;
          cx.strokeStyle='#ffffff';cx.lineWidth=2;
          cx.beginPath();cx.moveTo(u.x,u.y);cx.lineTo(W,u.y);cx.stroke();
          cx.restore();
        }
        cx.globalAlpha=1;
      }
  
      // HUD 오버레이 (캔버스 좌상단)
      // HP 바
      cx.fillStyle='rgba(0,0,0,.6)';cx.fillRect(10,10,220,18);
      cx.fillStyle='#ff6666';cx.fillRect(10,10,220*(state.ship.hp/Math.max(1,state.ship.maxHP)),18);
      cx.fillStyle='#fff';cx.font='bold 11px monospace';cx.fillText('HP '+Math.floor(state.ship.hp)+'/'+state.ship.maxHP, 16, 23);
      // 실드 바
      cx.fillStyle='rgba(0,0,0,.6)';cx.fillRect(10,32,220,12);
      cx.fillStyle='#66ddff';cx.fillRect(10,32,220*((state.ship.sh||0)/Math.max(1,state.ship.maxSH)),12);
      cx.fillStyle='#fff';cx.font='10px monospace';cx.fillText('SH '+Math.floor(state.ship.sh||0)+'/'+state.ship.maxSH, 16, 41);
      // 필살기 쿨다운 바 (HP/SH 아래)
      const _ultReady=state.ultimateCd<=0;
      const _ultRatio=_ultReady?1:(1-state.ultimateCd/600);
      cx.fillStyle='rgba(0,0,0,.6)';cx.fillRect(10,48,220,12);
      cx.fillStyle=_ultReady?'#ff66ff':'#6633aa';
      cx.fillRect(10,48,220*_ultRatio,12);
      cx.fillStyle='#fff';cx.font='bold 10px monospace';
      cx.fillText(_ultReady?I18N.t('mini.ultReady'):I18N.t('mini.ultCd',{s:(state.ultimateCd/60).toFixed(1)}), 16, 57);
      // 우상단: 시간·격파
      cx.fillStyle='#66ddff';cx.font='bold 18px monospace';cx.textAlign='right';
      cx.fillText('⏱ '+leftSec+'s', W-14, 26);
      cx.fillStyle='#ffcc66';cx.font='bold 14px monospace';
      cx.fillText(I18N.t('mini.kills',{n:state.kills}), W-14, 46);
      cx.textAlign='left';
  
      // 백구 — 시간 경고 (한 번씩만)
      if(!state._warn25s && leftSec<=25 && leftSec>20){state._warn25s=true;_baekguSay('think',I18N.t('mini.bk.midpoint'),2000,true);}
      if(!state._warn15s && leftSec<=15 && leftSec>10){state._warn15s=true;_baekguPick('timeWarn',true);}
      if(!state._warn5s && leftSec<=5 && leftSec>0){state._warn5s=true;_baekguSay('fight',I18N.t('mini.bk.fiveMore'),2000,true);}
      // 주기적 조언 (조용할 때만)
      if(!state._lastAdviceMs)state._lastAdviceMs=state.startMs;
      if(now-state._lastAdviceMs>9000 && now-state.baekgu.lastTriggerMs>3000 && elapsed>3000){
        state._lastAdviceMs=now;
        _baekguPick('advice');
      }
      // ─── 백구 AI HUD — 캔버스 하단 가운데 ───
      _renderBaekguHud(cx,W,H,state,baekguImgs,now);
  
      // 종료 판정
      if(elapsed>=state.durationMs){_baekguSay('smile1',I18N.t('mini.bk.breakthrough'),2500,true);_finish(true);return;}
      requestAnimationFrame(tick);
    }
    setTimeout(()=>{cv.focus();tick();},500);
    notify(I18N.t('notify.asteroidEntry'),'warn');
    try{baekgu(I18N.t('baekgu.asteroidBelt'));}catch(e){}
  }
  try{if(typeof window!=='undefined')window.startAsteroidBeltMinigame=startAsteroidBeltMinigame;}catch(e){}
  
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
      // 기함 이미지 표시 — 사용자 요청 2026-06-09: 행성 위쪽에 배치
      //   · 이전: 우측 (sp.x+r+5, sp.y)
      //   · 변경: 위쪽 중앙 정렬 — 행성 라벨과 겹치지 않게 위로 충분히 띄움
      if(isCur&&G.fleet&&G.fleet.length>0){
        var _fsz=Math.max(18,r*3.2);
        var _fx=sp.x;  // 행성 중심과 수평 정렬
        var _fy=sp.y-r-_fsz/2-6;  // 행성 위쪽 + 6px 여백
        var _fImgSrc=shipImgSrc(G.fleet[0]);
        var _fImg=_loadMapImg(_fImgSrc,function(){renderMap();});
        if(_fImg&&_fImg.complete&&_fImg.naturalWidth>0){
          ctx.save();ctx.globalAlpha=0.95;
          ctx.beginPath();ctx.arc(_fx,_fy,_fsz/2,0,Math.PI*2);ctx.clip();
          ctx.drawImage(_fImg,_fx-_fsz/2,_fy-_fsz/2,_fsz,_fsz);
          ctx.restore();
          // 행성과 함선 사이 미세 연결선 (위치 표시 강조)
          ctx.globalAlpha=0.6;ctx.strokeStyle='rgba(222,255,154,.5)';ctx.lineWidth=1;
          ctx.beginPath();ctx.moveTo(sp.x,sp.y-r-1);ctx.lineTo(_fx,_fy+_fsz/2+1);ctx.stroke();
          ctx.globalAlpha=1;
        } else {
          ctx.globalAlpha=1;ctx.fillStyle='#deff9a';
          ctx.font=Math.max(10,r*2)+'px serif';
          ctx.textAlign='center';
          ctx.fillText('🛸',_fx,_fy+r*0.6);
          ctx.textAlign='left';  // 다른 텍스트에 영향 안 가도록 복원
        }
      }
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
    if(bestTier>=20)return 0;
    if(bestTier>=15)return 1000;
    if(bestTier>=12)return 2000;
    if(bestTier>=8)return 4000;
    if(bestTier>=4)return 6000;
    if(bestTier>=1)return 8000;
    return 10000;
  }
  // 은하지도 위에서 함선이 출발행성→목적행성으로 이동하는 모션 (블링크면 반짝임)
  function _startTravelAnim(fromPid,toPid,dur,isBlink,onDone){
    try{
      const wrap=document.getElementById('map-wrap');
      const a=G.mapPositions&&G.mapPositions[fromPid],b=G.mapPositions&&G.mapPositions[toPid];
      if(!wrap||!a||!b||!mapCV){onDone();return;}
      const pa=worldToScreen(a.x,a.y),pb=worldToScreen(b.x,b.y);
      if(getComputedStyle(wrap).position==='static')wrap.style.position='relative';
      mapCV.style.pointerEvents='none';  // 이동 중 맵 조작 차단
      const ship=document.createElement('div');
      ship.className='_travel-ship'+(isBlink?' _travel-blink':'');
      ship.style.cssText='position:absolute;left:0;top:0;width:30px;height:30px;margin:-15px 0 0 -15px;z-index:40;pointer-events:none;transition:transform '+dur+'ms '+(isBlink?'ease-in-out':'linear');
      const _img=(typeof shipImgSrc==='function'&&G.fleet&&G.fleet[0])?shipImgSrc(G.fleet[0]):'';
      ship.innerHTML=_img?('<img src="'+_img+'" style="width:100%;height:100%;object-fit:contain">'):'🚀';
      ship.style.transform='translate('+pa.sx+'px,'+pa.sy+'px)';
      wrap.appendChild(ship);
      void ship.offsetWidth;  // reflow → transition 적용
      requestAnimationFrame(()=>{ship.style.transform='translate('+pb.sx+'px,'+pb.sy+'px)';});
      try{AudioMgr.playSfx(isBlink?'UI_open':'UI_click',{cooldown:0});}catch(e){}
      setTimeout(()=>{try{ship.remove();}catch(e){}try{if(mapCV)mapCV.style.pointerEvents='';}catch(e){}onDone();},dur+80);
    }catch(e){console.warn('[travel anim]',e);onDone();}
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
    // ── 엔진 등급별 이동 시간 + 은하지도 이동 모션 (사용자 요청 2026-06-16) ──
    //   먼저 모션을 재생하고, 끝나면 travelTo를 재진입해 실제 도착 처리를 수행한다.
    //   블링크 점프(연결 항로 밖)는 무조건 1초 + 반짝임.
    if(_travelAnimFor!==pid){
      const _maxHops2=hasLegendaryEngineOnAny()?2:1;
      const _isBlinkJump=blink&&!isWithinHops(G.currentPlanet,pid,_maxHops2);
      const _travelMs=_isBlinkJump?1000:_travelDelayMs();
      if(_travelMs>0){
        _travelAnimFor=pid;
        G.mapSelected=null;
        const _gb=document.getElementById('map-go');if(_gb)_gb.disabled=true;
        const _mf=document.getElementById('map-float');if(_mf)_mf.style.display='none';
        _startTravelAnim(G.currentPlanet,pid,_travelMs,_isBlinkJump,function(){G.mapSelected=pid;travelTo();});
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
        setTimeout(()=>startAsteroidBeltMinigame(pid),600);
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
  window.startAsteroidBeltMinigame=startAsteroidBeltMinigame;
  // 사용자 버그 보고 2026-06-08: showHostilePlanetBriefing 와 _buildHostilePlanetEnemies 는
  //   game.js 에 정의돼 있어 starmap IIFE 내 식별자로 미해결. 노출 시도가 ReferenceError 를
  //   던져 이후의 window 할당 + console.log 가 실행 안 되던 문제. → 라인 제거.
  //   (해당 두 함수는 game.js 의 글로벌 함수 선언이라 window 에 자동 노출됨)
  window.rotate3D=rotate3D;
  window.project3D=project3D;
  window.worldToScreen=worldToScreen;
  console.log('[starmap] module loaded — 38 functions');
})();
