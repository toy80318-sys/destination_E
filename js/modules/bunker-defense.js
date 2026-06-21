// ══════════════════════════════════════════════════════════════════
// bunker-defense.js — 벙커존 '행성 디펜스' 타워디펜스 미니게임 (코어)
//   지시서: 01_GDD/CLAUDE_CODE_지시_벙커존_행성디펜스_미니게임.md
//   Phase 1(코어): 캔버스 + 웨이브 스케줄러 + 터렛 건설/강화/해금 + 경제 + 벙커HP 승패 + HUD.
//   Phase 2(별도): 벙커존 진입 버튼 + 연계 퀘스트 + 보상/패널티(EARTH_RESIST_SP 등).
//   실행: window.startBunkerDefense()  또는  window.BunkerDefense.start({onResult})
//   의존(있으면 사용·없어도 동작): window.AudioMgr, window.I18N, window._fireFireworks
// ══════════════════════════════════════════════════════════════════
(function(){
  if(typeof window==='undefined')return;

  // ── 확정 밸런스 (지시서 §2~§7) ───────────────────────────────────
  const CFG={
    START_CREDITS:5000, MAX_TURRETS:32, BUNKER_HP:1000,
    CROSS_MS:10000,                 // 적 화면 체류(강하) 10초
    UPG_MULT:1.5, UPG_MAX:5,        // 강화 ×1.5, 최대 5강(×7.59)
    UPG_COST_RATE:0.5, UPG_COST_MULT:1.3,  // 강화비 = 건설가×0.5 시작, 강화마다 ×1.3
    UNLOCK_BASE:2, UNLOCK_PER:2,    // 1~2등급 시작 해금, 누적 강화 2회마다 다음 등급 해금
    TIERS:[ // tier1..7 : 비용 / DPS
      {cost:100,dps:10},{cost:500,dps:50},{cost:1000,dps:120},
      {cost:5000,dps:800},{cost:10000,dps:2000},{cost:20000,dps:5000},{cost:30000,dps:10000}
    ],
    ENEMY:{ // hp / 벙커 도달 시 피해(atk) / 격추 보상 / 반지름 / 색 / 함선 이미지(치크스 강하)
      small :{hp:100,  atk:50,  reward:300,  r:15, col:'#7fd4ff', img:'img/ships/CHIX_S.png'},
      medium:{hp:1000, atk:150, reward:1000, r:21, col:'#ffcc66', img:'img/ships/CHIX_M.png'},
      large :{hp:10000,atk:400, reward:5000, r:30, col:'#ff6b6b', img:'img/ships/CHIX_L.png'}
    },
    // 하단 디펜스 이미지(사용자 제작 예정). 없으면 벡터 폴백 — 파일 추가 시 자동 적용.
    //   img/bunker/turret_laser.png · turret_missile.png · bunker.png (투명 PNG, 정사각 권장)
    TURRET_IMG:{ laser:'img/bunker/turret_laser.png', missile:'img/bunker/turret_missile.png' },
    BUNKER_IMG:'img/bunker/bunker.png',
    MISSILE:{ interval:600, speed:860, turn:7, hitR:16, dmgMul:1.5 }, // 유도탄: 발사주기·탄속(×2)·선회·명중반경·피해배수(×1.5)
    MILESTONE:50,   // 누적 n대 격파마다 보상 (×2=전설, ×3=신화). 누적치 G.bunkerKills 에 영속.
    WAVES:[ // 총 160초 (8웨이브 × 20초). hpMul=후반 적 체력·격추보상 배수.
      {dur:20000, spawnMs:1000, hpMul:1,   pick:()=>'small'},
      {dur:20000, spawnMs:1000, hpMul:1,   pick:()=>'medium'},
      {dur:20000, spawnMs:1000, hpMul:1,   pick:()=>'large'},
      {dur:20000, spawnMs:500,  hpMul:1,   pick:()=>{const r=Math.random();return r<0.50?'small':r<0.85?'medium':'large';}},
      {dur:20000, spawnMs:900,  hpMul:1.5, pick:()=>{const r=Math.random();return r<0.40?'medium':'large';}},
      {dur:20000, spawnMs:800,  hpMul:2,   pick:()=>{const r=Math.random();return r<0.25?'medium':'large';}},
      {dur:20000, spawnMs:500,  hpMul:2.5, pick:()=>{const r=Math.random();return r<0.20?'small':r<0.50?'medium':'large';}},
      {dur:20000, spawnMs:600,  hpMul:4,   pick:()=>'large'}
    ]
  };
  const W=880, H=480, BUNKER_Y=452, SKY_TOP=14;
  const TOTAL_MS=CFG.WAVES.reduce((a,w)=>a+w.dur,0), WAVE_COUNT=CFG.WAVES.length; // 동적 총시간·웨이브 수
  const tt=(k,d)=>{ try{ if(window.I18N&&I18N.t){const v=I18N.t(k); if(v&&v!==k)return v;} }catch(e){} return d; };
  const fmt=n=>{ try{return Math.round(n).toLocaleString();}catch(e){return ''+Math.round(n);} };
  const sfx=(n,o)=>{ try{ if(window.AudioMgr&&AudioMgr.playSfx)AudioMgr.playSfx(n,o||{}); }catch(e){} };
  const _ver=()=>{ try{ return window._GAME_VER?('?v='+encodeURIComponent(window._GAME_VER)):''; }catch(e){ return ''; } };
  // 이미지 캐시 (지연 로드 + 폴백). _ready 면 drawImage, 아니면 벡터 폴백.
  const _IMG={};
  function _img(src){ let im=_IMG[src]; if(!im){ im=new Image(); im.src=src; _IMG[src]=im; } return im; }
  function _ready(im){ return !!(im && im.complete && im.naturalWidth>0); }

  // ── 32 터렛 슬롯 좌표 (지상 4행 × 8열) ───────────────────────────
  const SLOTS=(function(){
    const s=[], cols=8, rows=4, x0=70, dx=(W-140)/(cols-1), y0=298, dy=46;
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++) s.push({x:x0+c*dx, y:y0+r*dy, t:null});
    return s; // 32개
  })();

  let S=null; // 게임 상태

  function _newState(opts){
    return {
      opts:opts||{}, credits:CFG.START_CREDITS, bunkerHp:CFG.BUNKER_HP,
      enemies:[], beams:[], shots:[], pops:[],
      totalUpg:0, selTier:0, selType:'laser',
      started:false, over:false, win:false,
      waveIdx:-1, waveStart:0, lastSpawn:0, elapsed:0,
      lastTs:0, raf:0, killed:0
    };
  }
  function maxUnlockedTier(){ return Math.min(7, CFG.UNLOCK_BASE + Math.floor(S.totalUpg/CFG.UNLOCK_PER)); }
  function turretCount(){ let n=0; for(const s of SLOTS) if(s.t)n++; return n; }
  function upgCost(t){ // 다음 강화 비용
    const base=CFG.TIERS[t.tier].cost*CFG.UPG_COST_RATE;
    return Math.round(base*Math.pow(CFG.UPG_COST_MULT, t.level));
  }
  function turretDps(t){ return CFG.TIERS[t.tier].dps*Math.pow(CFG.UPG_MULT, t.level); }

  // ── 오버레이 DOM ────────────────────────────────────────────────
  function _buildOverlay(){
    const ov=document.createElement('div');
    ov.id='bunker-def-overlay';
    ov.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(4,6,14,.94);display:flex;align-items:center;justify-content:center;font-family:inherit';
    ov.innerHTML=
      '<div style="width:min(94vw,920px);max-height:96vh;overflow:auto;background:linear-gradient(160deg,#0b1322,#070a14);border:1.5px solid rgba(120,180,255,.35);border-radius:14px;padding:14px 16px;box-shadow:0 0 40px rgba(40,90,180,.4)">'
      + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">'
      +   '<div style="font-size:17px;font-weight:bold;color:#cfe6ff">🛰️ '+tt('bunker.title','벙커존 행성 디펜스')+'</div>'
      +   '<button id="bd-close" style="margin-left:auto;background:rgba(255,90,90,.16);border:1px solid #ff6b6b;color:#ff9b9b;border-radius:7px;padding:6px 12px;cursor:pointer;font-family:inherit;font-weight:bold">'+tt('bunker.close','닫기')+'</button>'
      + '</div>'
      + '<div id="bd-hud" style="display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;font-size:12px;color:#bcd;margin-bottom:8px"></div>'
      + '<canvas id="bd-canvas" width="'+W+'" height="'+H+'" style="width:100%;height:auto;display:block;background:#060912;border:1px solid rgba(120,180,255,.25);border-radius:10px;cursor:crosshair"></canvas>'
      + '<div id="bd-tools" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:9px"></div>'
      + '<div id="bd-hint" style="font-size:11px;color:#8aa;margin-top:6px;min-height:14px"></div>'
      + '</div>';
    document.body.appendChild(ov);
    return ov;
  }

  function _renderTools(){
    const el=document.getElementById('bd-tools'); if(!el)return;
    const maxT=maxUnlockedTier();
    let h='';
    // 무기 종류 토글
    ['laser','missile'].forEach(tp=>{
      const on=S.selType===tp;
      h+='<button data-type="'+tp+'" style="padding:6px 10px;border-radius:7px;cursor:pointer;font-family:inherit;font-size:12px;font-weight:bold;border:1px solid '+(on?'#7fd4ff':'rgba(255,255,255,.22)')+';background:'+(on?'rgba(127,212,255,.20)':'rgba(255,255,255,.05)')+';color:'+(on?'#cfe6ff':'#9ab')+'">'+(tp==='laser'?('🔫 '+tt('bunker.laser','레이저')):('🚀 '+tt('bunker.missile','미사일')))+'</button>';
    });
    h+='<span style="width:8px"></span>';
    // 등급 선택
    CFG.TIERS.forEach((tg,i)=>{
      const locked=i+1>maxT, sel=S.selTier===i && !locked;
      const afford=S.credits>=tg.cost;
      h+='<button data-tier="'+i+'" '+(locked?'disabled':'')+' title="DPS '+fmt(tg.dps)+'" style="padding:6px 8px;border-radius:7px;cursor:'+(locked?'not-allowed':'pointer')+';font-family:inherit;font-size:11px;font-weight:bold;opacity:'+(locked?'.4':'1')+';border:1px solid '+(sel?'#ffd86b':'rgba(255,255,255,.2)')+';background:'+(sel?'rgba(255,216,107,.18)':'rgba(255,255,255,.05)')+';color:'+(locked?'#778':(afford?'#e6edf5':'#ff9b9b'))+'">T'+(i+1)+'<br><span style="font-size:9px;color:#9ab">₡'+fmt(tg.cost)+'</span></button>';
    });
    h+='<span style="width:8px"></span>';
    if(!S.started){
      h+='<button id="bd-start" style="padding:7px 16px;border-radius:7px;cursor:pointer;font-family:inherit;font-size:13px;font-weight:bold;border:1px solid #6bdc8e;background:rgba(107,220,142,.18);color:#bff5cf">▶ '+tt('bunker.startBtn','방어 시작')+'</button>';
    }
    el.innerHTML=h;
    el.querySelectorAll('[data-type]').forEach(b=>b.onclick=()=>{S.selType=b.getAttribute('data-type');_renderTools();});
    el.querySelectorAll('[data-tier]').forEach(b=>b.onclick=()=>{ if(b.disabled)return; S.selTier=+b.getAttribute('data-tier'); _renderTools(); });
    const sb=document.getElementById('bd-start'); if(sb)sb.onclick=_startWaves;
  }

  function _renderHud(){
    const el=document.getElementById('bd-hud'); if(!el)return;
    const remain=S.started?Math.max(0,Math.ceil((TOTAL_MS-S.elapsed)/1000)):Math.round(TOTAL_MS/1000);
    const wv=S.waveIdx<0?0:S.waveIdx+1;
    const hpPct=Math.max(0,Math.round(S.bunkerHp/CFG.BUNKER_HP*100));
    el.innerHTML=
      '<span>'+tt('bunker.wave','웨이브')+' <b style="color:#cfe6ff">'+wv+'/'+WAVE_COUNT+'</b></span>'
      +'<span>⏱ <b style="color:#ffd86b">'+remain+'s</b></span>'
      +'<span>💰 <b style="color:#ffd86b">₡'+fmt(S.credits)+'</b></span>'
      +'<span>🏰 '+tt('bunker.bunkerHp','벙커 HP')+' <b style="color:'+(hpPct>30?'#6bdc8e':'#ff6b6b')+'">'+fmt(S.bunkerHp)+'</b>'
      +'<span style="display:inline-block;width:90px;height:8px;background:rgba(255,255,255,.12);border-radius:4px;vertical-align:middle;margin-left:5px;overflow:hidden"><span style="display:block;height:100%;width:'+hpPct+'%;background:'+(hpPct>30?'#6bdc8e':'#ff6b6b')+'"></span></span></span>'
      +'<span>🔧 '+tt('bunker.turrets','포대')+' <b style="color:#cfe6ff">'+turretCount()+'/'+CFG.MAX_TURRETS+'</b></span>';
  }

  function _hint(msg,col){ const el=document.getElementById('bd-hint'); if(el){el.textContent=msg||''; el.style.color=col||'#8aa';} }

  // ── 입력: 캔버스 클릭 → 슬롯 건설/강화 ───────────────────────────
  function _onCanvasClick(ev){
    if(S.over)return;
    const cv=document.getElementById('bd-canvas'); const rc=cv.getBoundingClientRect();
    const x=(ev.clientX-rc.left)*(W/rc.width), y=(ev.clientY-rc.top)*(H/rc.height);
    let best=null,bd=1e9;
    for(const s of SLOTS){ const d=(s.x-x)*(s.x-x)+(s.y-y)*(s.y-y); if(d<bd){bd=d;best=s;} }
    if(!best||bd>30*30)return;
    if(best.t){ _showTurretMenu(best, ev); } else { _closeTurretMenu(); _tryBuild(best); }
  }
  // 포대 액션 메뉴 — 강화 / 상위 등급 교체
  function _closeTurretMenu(){ const m=document.getElementById('bd-turret-menu'); if(m)m.remove(); }
  function _showTurretMenu(slot, ev){
    _closeTurretMenu();
    const t=slot.t, mt=maxUnlockedTier();
    const m=document.createElement('div'); m.id='bd-turret-menu';
    m.style.cssText='position:fixed;z-index:100001;background:#0d1626;border:1px solid #7fd4ff;border-radius:9px;padding:7px;display:flex;flex-direction:column;gap:5px;box-shadow:0 6px 20px rgba(0,0,0,.6);min-width:150px';
    m.style.left=Math.min(window.innerWidth-170,Math.max(6,ev.clientX))+'px';
    m.style.top=Math.min(window.innerHeight-180,Math.max(6,ev.clientY))+'px';
    const _bs='padding:7px 9px;border-radius:6px;cursor:pointer;font-family:inherit;font-size:12px;font-weight:bold;text-align:left;';
    let h='<div style="font-size:11px;color:#9ab;padding:1px 3px 3px">T'+(t.tier+1)+' '+(t.type==='laser'?tt('bunker.laser','레이저'):tt('bunker.missile','미사일'))+' Lv.'+t.level+' · DPS '+fmt(turretDps(t))+'</div>';
    if(t.level<CFG.UPG_MAX){ const c=upgCost(t); h+='<button data-act="up" style="'+_bs+'border:1px solid #6bdc8e;background:rgba(107,220,142,.16);color:#bff5cf">⬆ '+tt('bunker.upgradePlus','강화 +1')+' (₡'+fmt(c)+')</button>'; }
    else { h+='<div style="font-size:11px;color:#ffd86b;padding:2px 4px">'+tt('bunker.maxLevel','최대 강화입니다 (5강)')+'</div>'; }
    // 무기 종류 교체(레이저↔미사일) — 같은 등급·레벨 유지, 재구성 수수료
    { const cfee=Math.round(CFG.TIERS[t.tier].cost*0.3);
      const toMis=t.type==='laser';
      h+='<button data-act="conv" style="'+_bs+'border:1px solid #7fd4ff;background:rgba(127,212,255,.14);color:#cfe6ff">'+(toMis?('🚀 '+tt('bunker.toMissile','미사일로 교체')):('🔫 '+tt('bunker.toLaser','레이저로 교체')))+' (₡'+fmt(cfee)+')</button>'; }
    for(let tier=t.tier+1; tier<mt; tier++){ const tg=CFG.TIERS[tier];
      h+='<button data-act="rep" data-tier="'+tier+'" style="'+_bs+'border:1px solid #ffd86b;background:rgba(255,216,107,.14);color:#ffe9a8">🔁 T'+(tier+1)+' '+tt('bunker.replace','교체')+' (₡'+fmt(tg.cost)+')</button>'; }
    h+='<button data-act="close" style="'+_bs+'border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.05);color:#9ab;text-align:center">'+tt('bunker.close','닫기')+'</button>';
    m.innerHTML=h;
    document.body.appendChild(m);
    m.querySelectorAll('button').forEach(b=>b.onclick=(e)=>{ e.stopPropagation(); const a=b.getAttribute('data-act');
      if(a==='up')_tryUpgrade(slot); else if(a==='rep')_tryReplace(slot,+b.getAttribute('data-tier')); else if(a==='conv')_tryConvertType(slot);
      _closeTurretMenu();
    });
  }
  function _tryReplace(slot, tier){
    if(tier+1>maxUnlockedTier()){ _hint(tt('bunker.locked','잠긴 등급입니다'),'#ff9b9b'); return; }
    const tg=CFG.TIERS[tier];
    if(S.credits<tg.cost){ _hint(tt('bunker.notEnough','자금이 부족합니다')+' (₡'+fmt(tg.cost)+')','#ff9b9b'); return; }
    S.credits-=tg.cost;
    slot.t={tier:tier, level:0, type:slot.t.type, cd:0};   // 등급 교체(레벨 초기화, 무기종류 유지)
    sfx('UI_click',{cooldown:0});
    _renderTools(); _renderHud();
    _hint(tt('bunker.replaced','상위 등급으로 교체')+' → T'+(tier+1)+' (DPS '+fmt(turretDps(slot.t))+')','#ffd86b');
  }
  function _tryConvertType(slot){
    const t=slot.t, fee=Math.round(CFG.TIERS[t.tier].cost*0.3);
    if(S.credits<fee){ _hint(tt('bunker.notEnough','자금이 부족합니다')+' (₡'+fmt(fee)+')','#ff9b9b'); return; }
    S.credits-=fee; t.type=(t.type==='laser'?'missile':'laser'); t.cd=0;   // 등급·레벨 유지, 무기만 전환
    sfx('UI_click',{cooldown:0}); _renderHud();
    _hint(tt('bunker.converted','무기 교체')+' → '+(t.type==='laser'?tt('bunker.laser','레이저'):tt('bunker.missile','미사일')),'#7fd4ff');
  }
  function _tryBuild(slot){
    const tier=S.selTier; const tg=CFG.TIERS[tier];
    if(tier+1>maxUnlockedTier()){ _hint(tt('bunker.locked','잠긴 등급입니다'),'#ff9b9b'); return; }
    if(turretCount()>=CFG.MAX_TURRETS){ _hint(tt('bunker.full','포대가 가득 찼습니다 (32)'),'#ff9b9b'); return; }
    if(S.credits<tg.cost){ _hint(tt('bunker.notEnough','자금이 부족합니다'),'#ff9b9b'); return; }
    S.credits-=tg.cost;
    slot.t={tier:tier, level:0, type:S.selType, cd:0, tx:null, ty:null};
    sfx('UI_click',{cooldown:0});
    _renderTools(); _renderHud(); _hint('');
  }
  function _tryUpgrade(slot){
    const t=slot.t;
    if(t.level>=CFG.UPG_MAX){ _hint(tt('bunker.maxLevel','최대 강화입니다 (5강)'),'#ffd86b'); return; }
    const c=upgCost(t);
    if(S.credits<c){ _hint(tt('bunker.notEnough','자금이 부족합니다')+' (₡'+fmt(c)+')','#ff9b9b'); return; }
    S.credits-=c; t.level++; S.totalUpg++;
    sfx('UI_click',{cooldown:0});
    _renderTools(); _renderHud();
    _hint(tt('bunker.upgraded','강화 완료')+' → Lv.'+t.level+' (DPS '+fmt(turretDps(t))+')','#6bdc8e');
  }

  // ── 누적 격파 보상 (B) — 50대마다, ×2=전설·×3=신화. 누적치 G.bunkerKills 에 영속. ───
  function _pick(a){ return (a&&a.length)?a[Math.floor(Math.random()*a.length)]:null; }
  function _grantPart(grade){
    const P=window.PARTS||[]; let pool;
    if(grade==='mythic') pool=P.filter(p=>p.rarity==='mythic'&&!p.quest);
    else if(grade==='legend') pool=P.filter(p=>p.rarity==='legend'&&!p.quest);
    else pool=P.filter(p=>!p.rarity&&!p.quest);
    if((!pool||!pool.length)&&grade==='mythic') pool=P.filter(p=>p.rarity==='legend'&&!p.quest);
    if(!pool||!pool.length) pool=P.filter(p=>!p.quest);
    const p=_pick(pool); if(!p)return null;
    try{ if(typeof window.addToInventory==='function')window.addToInventory(p.id,1); }catch(e){}
    return {kind:'part', nm:(typeof window.partDisplayNm==='function'?window.partDisplayNm(p):p.nm)||p.id};
  }
  function _grantShip(grade){
    const C=window.SHIP_CATALOG||[]; const tierName=grade==='mythic'?'신화':grade==='legend'?'대형':'중형';
    // price>0 && !quest 만 — 보스/유니크(URSA·BLACKFALCON·LGD_SP 등 price:0)·퀘스트 함선 제외
    const ok=s=>s.tier===tierName && (s.price>0) && !s.quest;
    let pool=C.filter(ok);
    if(!pool.length&&grade==='mythic') pool=C.filter(s=>s.tier==='대형'&&(s.price>0)&&!s.quest);
    if(!pool.length) pool=C.filter(s=>s.tier==='중형'&&(s.price>0)&&!s.quest);
    const d=_pick(pool); if(!d)return _grantPart(grade);
    try{
      const ship={id:(d.id||'BD')+'_bd_'+Date.now(),catalogId:d.id,catId:d.id,nm:d.nm,tier:d.tier,
        maxHP:d.maxHP,hp:d.maxHP,maxSH:d.maxSH||0,sh:d.maxSH||0,ATT:d.ATT,INT:d.INT,TEC:d.TEC,HP:d.maxHP,LOY:80,parts:[],crewIds:[],cargoSlots:d.cargoSlots||5};
      if(typeof window.addShipToFleet==='function')window.addShipToFleet(ship);
      else { window.G.reserveFleet=window.G.reserveFleet||[]; window.G.reserveFleet.push(ship); }
    }catch(e){ return _grantPart(grade); }
    return {kind:'ship', nm:(typeof window.shipDisplayNm==='function'?window.shipDisplayNm(d):d.nm)||d.id};
  }
  function _milestoneReward(grade){
    // 신화 파츠는 전부 퀘스트 전용 → 신화는 함선(신화 tier) 위주. 일반/전설은 함선·파츠 혼합.
    const wantShip = grade==='mythic' ? true : (Math.random()<0.45);
    return (wantShip?_grantShip(grade):_grantPart(grade)) || _grantPart(grade);
  }
  function _onKill(){
    try{
      if(!window.G)return;
      G.bunkerKills=(G.bunkerKills||0)+1;
      let rewarded=G.bunkerRewarded||0;
      while(G.bunkerKills>=rewarded+CFG.MILESTONE){
        rewarded+=CFG.MILESTONE;
        const grade=(rewarded%(CFG.MILESTONE*3)===0)?'mythic':(rewarded%(CFG.MILESTONE*2)===0)?'legend':'regular';
        const r=_milestoneReward(grade);
        const gLabel=grade==='mythic'?tt('bunker.gradeMythic','신화'):grade==='legend'?tt('bunker.gradeLegend','전설'):tt('bunker.gradeRegular','일반');
        const msg=tt('bunker.killReward','🎁 {n}대 격파 보상 — [{grade}] {item}').replace('{n}',rewarded).replace('{grade}',gLabel).replace('{item}',r?r.nm:'');
        try{ if(typeof window.notify==='function')window.notify(msg,'gold'); }catch(e){}
        _hint(msg,'#ffd86b'); sfx('coin',{vol:.8,cooldown:0});
      }
      G.bunkerRewarded=rewarded;
      try{ if(typeof window.saveGame==='function')window.saveGame(true); }catch(e){}
    }catch(e){ /* 보상 실패는 게임 흐름 유지 위해 무시 */ }
  }

  // ── 웨이브 시작 ─────────────────────────────────────────────────
  function _startWaves(){
    if(S.started)return;
    S.started=true; S.waveIdx=0; S.waveStart=0; S.lastSpawn=-99999; S.elapsed=0;
    _renderTools(); _hint(tt('bunker.incoming','강하 경보! 적 함대 진입'),'#ff9b9b');
  }

  // ── 메인 루프 ───────────────────────────────────────────────────
  function _spawn(type, hpMul){
    hpMul=hpMul||1;
    const e=CFG.ENEMY[type], hp=Math.round(e.hp*hpMul);
    S.enemies.push({type, hp:hp, maxHp:hp, rewardMul:hpMul, x:60+Math.random()*(W-120), born:S.elapsed});
  }
  function _step(dt){
    if(S.started && !S.over){
      S.elapsed+=dt;
      // 웨이브 진행/스폰
      const w=CFG.WAVES[S.waveIdx];
      if(w){
        if(S.elapsed-S.waveStart>=w.dur){ // 다음 웨이브
          if(S.waveIdx<CFG.WAVES.length-1){ S.waveIdx++; S.waveStart=S.elapsed; S.lastSpawn=-99999; _renderHud(); }
        }
        const cur=CFG.WAVES[S.waveIdx];
        if(S.elapsed-S.waveStart<cur.dur && S.elapsed-S.lastSpawn>=cur.spawnMs){ S.lastSpawn=S.elapsed; _spawn(cur.pick(), cur.hpMul||1); }
      }
      // 적 이동 (born→ +CROSS_MS 동안 위→벙커)
      for(const e of S.enemies){ e.prog=Math.min(1,(S.elapsed-e.born)/CFG.CROSS_MS); e.y=SKY_TOP+e.prog*(BUNKER_Y-SKY_TOP); }
      // 가장 진행된 적(공통 표적)
      let front=null,bestP=-1;
      for(const e of S.enemies){ if(e.hp<=0)continue; if(e.prog>bestP){bestP=e.prog;front=e;} }
      // 터렛: 레이저=즉시 연속 DPS / 미사일=유도탄 발사(피해는 명중 시)
      S.beams.length=0;
      for(const s of SLOTS){ if(!s.t)continue; const t=s.t; if(!front)continue;
        if(t.type==='laser'){ front.hp-=turretDps(t)*(dt/1000); S.beams.push({x1:s.x,y1:s.y,x2:front.x,y2:front.y}); }
        else { t.cd=(t.cd||0)-dt; if(t.cd<=0){ t.cd=CFG.MISSILE.interval;
          const ang=Math.atan2(front.y-s.y,front.x-s.x), sp=CFG.MISSILE.speed;
          S.shots.push({x:s.x,y:s.y,vx:Math.cos(ang)*sp,vy:Math.sin(ang)*sp,dmg:turretDps(t)*(CFG.MISSILE.interval/1000)*(CFG.MISSILE.dmgMul||1),tgt:front,life:0,trail:[]});
          sfx('missile',{vol:.3,cooldown:80}); } }
      }
      // 유도탄 진행 — 표적으로 곡선 추적, 명중 시 피해
      for(let i=S.shots.length-1;i>=0;i--){ const m=S.shots[i]; m.life+=dt;
        let tg=m.tgt; if(!tg||tg.hp<=0){ tg=front; m.tgt=front; }
        if(tg){ const dx=tg.x-m.x, dy=tg.y-m.y, dist=Math.hypot(dx,dy)||1;
          const dvx=dx/dist*CFG.MISSILE.speed, dvy=dy/dist*CFG.MISSILE.speed;
          const k=Math.min(1,CFG.MISSILE.turn*(dt/1000)); // 선회 보간 → 곡선
          m.vx+=(dvx-m.vx)*k; m.vy+=(dvy-m.vy)*k;
          const sm=Math.hypot(m.vx,m.vy)||1; m.vx=m.vx/sm*CFG.MISSILE.speed; m.vy=m.vy/sm*CFG.MISSILE.speed;
        }
        m.trail.push({x:m.x,y:m.y}); if(m.trail.length>7)m.trail.shift();
        m.x+=m.vx*(dt/1000); m.y+=m.vy*(dt/1000);
        if(tg && Math.hypot(tg.x-m.x,tg.y-m.y)<CFG.MISSILE.hitR){ tg.hp-=m.dmg; S.pops.push({x:m.x,y:m.y,life:0,r:8}); S.shots.splice(i,1); continue; }
        if(m.life>3500 || m.x<-50||m.x>W+50||m.y<-50||m.y>H+50){ S.shots.splice(i,1); }
      }
      // 격추 처리
      for(let i=S.enemies.length-1;i>=0;i--){ const e=S.enemies[i];
        if(e.hp<=0){ S.credits+=Math.round(CFG.ENEMY[e.type].reward*(e.rewardMul||1)); S.killed++; _onKill(); S.pops.push({x:e.x,y:e.y,life:0,r:CFG.ENEMY[e.type].r}); S.enemies.splice(i,1); sfx('explosion',{vol:.35,cooldown:60}); continue; }
        if(e.prog>=1){ S.bunkerHp-=CFG.ENEMY[e.type].atk; S.enemies.splice(i,1); sfx('shield_hit',{vol:.4,cooldown:80}); if(S.bunkerHp<=0){S.bunkerHp=0; _end(false);} }
      }
      // 폭발 파티클 진행
      for(let i=S.pops.length-1;i>=0;i--){ const p=S.pops[i]; p.life+=dt; if(p.life>=320)S.pops.splice(i,1); }
      // 승리: 전 웨이브(TOTAL_MS) 생존
      if(!S.over && S.elapsed>=TOTAL_MS && S.enemies.length===0){ _end(true); }
      else if(!S.over && S.elapsed>=TOTAL_MS+2000){ _end(true); } // 잔여 적 안전망(2초 유예)
      _renderHud();
    }
    _draw();
  }

  function _draw(){
    const cv=document.getElementById('bd-canvas'); if(!cv)return; const g=cv.getContext('2d');
    g.clearRect(0,0,W,H);
    // 하늘
    const sky=g.createLinearGradient(0,0,0,H); sky.addColorStop(0,'#0a0f1f'); sky.addColorStop(.7,'#0c1426'); sky.addColorStop(1,'#10203a');
    g.fillStyle=sky; g.fillRect(0,0,W,H);
    // 별
    g.fillStyle='rgba(255,255,255,.10)'; for(let i=0;i<40;i++){ g.fillRect((i*97)%W,(i*53)%260,1.5,1.5); }
    // 행성 지형(둥근 능선)
    g.fillStyle='#14223c'; g.beginPath(); g.moveTo(0,H); g.lineTo(0,330);
    g.quadraticCurveTo(W/2,300,W,330); g.lineTo(W,H); g.closePath(); g.fill();
    g.strokeStyle='rgba(120,180,255,.25)'; g.lineWidth=2; g.beginPath(); g.moveTo(0,330); g.quadraticCurveTo(W/2,300,W,330); g.stroke();
    // 슬롯
    for(const s of SLOTS){ if(s.t)continue; g.strokeStyle='rgba(140,180,255,.18)'; g.lineWidth=1; g.beginPath(); g.arc(s.x,s.y,9,0,7); g.stroke(); }
    // 벙커 (이미지 → 폴백: 벡터)
    const bx=W/2, by=BUNKER_Y;
    const bim=_img(CFG.BUNKER_IMG+_ver());
    if(_ready(bim)){ const asp=bim.naturalWidth/bim.naturalHeight, bw=128, bh=bw/asp; g.drawImage(bim,bx-bw/2,by-bh+12,bw,bh); }
    else {
      g.fillStyle='#26405f'; g.fillRect(bx-46,by-22,92,30);
      g.fillStyle='#3a5f8a'; g.fillRect(bx-30,by-34,60,16);
      g.fillStyle='rgba(127,212,255,.9)'; g.fillRect(bx-3,by-40,6,8);
    }
    // 빔
    for(const b of S.beams){ g.strokeStyle='rgba(127,212,255,.8)'; g.lineWidth=2; g.beginPath(); g.moveTo(b.x1,b.y1); g.lineTo(b.x2,b.y2); g.stroke(); }
    // 유도 미사일 (꼬리 잔상 + 탄두)
    for(const m of S.shots){
      for(let j=0;j<m.trail.length;j++){ const tr=m.trail[j], a=(j+1)/m.trail.length*0.5; g.fillStyle='rgba(255,200,120,'+a.toFixed(2)+')'; g.beginPath(); g.arc(tr.x,tr.y,2,0,7); g.fill(); }
      g.fillStyle='#fff1c0'; g.beginPath(); g.arc(m.x,m.y,3.5,0,7); g.fill();
      g.fillStyle='#ffaa44'; g.beginPath(); g.arc(m.x,m.y,2,0,7); g.fill();
    }
    // 터렛 (디펜스 이미지 → 폴백: 벡터). 강화마다 크기 +5% (×1.05^level).
    for(const s of SLOTS){ if(!s.t)continue; const t=s.t; const col=t.type==='laser'?'#7fd4ff':'#ffd86b';
      const scale=Math.pow(1.05,t.level), R=12*scale;
      const tim=_img(CFG.TURRET_IMG[t.type]+_ver());
      if(_ready(tim)){ const asp=tim.naturalWidth/tim.naturalHeight, w=R*2.6, h=w/asp; g.drawImage(tim,s.x-w/2,s.y-h/2,w,h); }
      else {
        g.fillStyle='#1b2c44'; g.beginPath(); g.arc(s.x,s.y,R,0,7); g.fill();
        g.strokeStyle=col; g.lineWidth=2; g.beginPath(); g.arc(s.x,s.y,R,0,7); g.stroke();
        g.fillStyle=col; g.font='bold '+Math.round(9*scale)+'px sans-serif'; g.textAlign='center'; g.fillText('T'+(t.tier+1),s.x,s.y+3*scale);
      }
      if(t.level>0){ g.fillStyle='#6bdc8e'; g.font='8px sans-serif'; g.textAlign='center'; g.fillText('+'+t.level,s.x,s.y-R-3); }
    }
    // 적 (치크스 함선 이미지 → 폴백: 원형). 강하 느낌으로 90° 회전(기수 아래).
    for(const e of S.enemies){ const d=CFG.ENEMY[e.type];
      const im=_img(d.img+_ver());
      if(_ready(im)){
        const asp=im.naturalWidth/im.naturalHeight, w=d.r*3.0, h=w/asp;
        g.save(); g.translate(e.x,e.y); g.rotate(Math.PI/2); g.drawImage(im,-w/2,-h/2,w,h); g.restore();
      } else {
        g.fillStyle=d.col; g.beginPath(); g.arc(e.x,e.y,d.r,0,7); g.fill();
        g.fillStyle='rgba(0,0,0,.4)'; g.beginPath(); g.arc(e.x,e.y,d.r*.5,0,7); g.fill();
      }
      // hp바
      const wbar=d.r*2, hp=Math.max(0,e.hp/e.maxHp);
      g.fillStyle='rgba(0,0,0,.5)'; g.fillRect(e.x-wbar/2,e.y-d.r-9,wbar,3);
      g.fillStyle=hp>.5?'#6bdc8e':hp>.2?'#ffd86b':'#ff6b6b'; g.fillRect(e.x-wbar/2,e.y-d.r-9,wbar*hp,3);
    }
    // 폭발
    for(const p of S.pops){ const k=p.life/320; g.strokeStyle='rgba(255,180,90,'+(1-k)+')'; g.lineWidth=2; g.beginPath(); g.arc(p.x,p.y,p.r+k*22,0,7); g.stroke(); }
  }

  function _loop(ts){
    if(!S||S.over && S._stopped)return;
    if(!S.lastTs)S.lastTs=ts;
    let dt=ts-S.lastTs; S.lastTs=ts; if(dt>60)dt=60; // 탭 비활성 점프 방지
    _step(dt);
    if(!S.over) S.raf=requestAnimationFrame(_loop);
    else { S._stopped=true; }
  }

  function _end(win){
    if(S.over)return; S.over=true; S.win=win;
    if(win){ try{ if(typeof window._fireFireworks==='function')window._fireFireworks(); }catch(e){} sfx('notify',{vol:.9}); }
    else { sfx('explosion',{vol:.8}); }
    _renderHud();
    setTimeout(()=>_showResult(win),300);
  }
  function _showResult(win){
    const ov=document.getElementById('bunker-def-overlay'); if(!ov)return;
    const box=document.createElement('div');
    box.style.cssText='position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(4,6,14,.7)';
    box.innerHTML='<div style="text-align:center;padding:26px 30px;background:linear-gradient(160deg,#0d1626,#080b15);border:1.5px solid '+(win?'#6bdc8e':'#ff6b6b')+';border-radius:14px;box-shadow:0 0 40px '+(win?'rgba(107,220,142,.4)':'rgba(255,107,107,.4)')+'">'
      +'<div style="font-size:40px;margin-bottom:8px">'+(win?'🎉':'💥')+'</div>'
      +'<div style="font-size:22px;font-weight:bold;color:'+(win?'#bff5cf':'#ff9b9b')+';margin-bottom:6px">'+(win?tt('bunker.win','방어 성공!'):tt('bunker.lose','벙커 함락…'))+'</div>'
      +'<div style="font-size:13px;color:#bcd;margin-bottom:6px">'+(win?tt('bunker.winDesc','모든 웨이브 방어에 성공했습니다.'):tt('bunker.loseDesc','벙커가 무너졌습니다.'))+'</div>'
      +'<div style="font-size:12px;color:#8aa;margin-bottom:6px">'+tt('bunker.killed','격추')+' '+S.killed+' · 💰 ₡'+fmt(S.credits)+'</div>'
      +'<div style="font-size:11px;color:#9ab;margin-bottom:16px">'+tt('bunker.totalKills','누적 격파')+' '+((window.G&&G.bunkerKills)||0)+'</div>'
      +'<div style="display:flex;gap:8px;justify-content:center">'
      +'<button id="bd-result-restart" style="padding:9px 20px;border-radius:8px;cursor:pointer;font-family:inherit;font-weight:bold;border:1px solid #7fd4ff;background:rgba(127,212,255,.16);color:#cfe6ff">🔄 '+tt('bunker.restart','다시 시작')+'</button>'
      +'<button id="bd-result-close" style="padding:9px 20px;border-radius:8px;cursor:pointer;font-family:inherit;font-weight:bold;border:1px solid '+(win?'#6bdc8e':'#ff6b6b')+';background:'+(win?'rgba(107,220,142,.18)':'rgba(255,107,107,.18)')+';color:'+(win?'#bff5cf':'#ff9b9b')+'">'+tt('bunker.close','닫기')+'</button>'
      +'</div>'
      +'</div>';
    ov.appendChild(box);
    box.querySelector('#bd-result-close').onclick=()=>{ _close(); };
    box.querySelector('#bd-result-restart').onclick=()=>{ _restart(); };
    // Phase 2 연동 훅: 결과 콜백
    try{ if(S.opts&&typeof S.opts.onResult==='function')S.opts.onResult(win,{killed:S.killed,credits:S.credits}); }catch(e){}
  }

  function _close(){
    if(S){ S.over=true; if(S.raf)cancelAnimationFrame(S.raf); }
    _closeTurretMenu();
    const ov=document.getElementById('bunker-def-overlay'); if(ov)ov.remove();
    S=null;
  }
  // 다시 시작 — 항상 처음부터(웨이브1·자금5,000·포대 초기화). 누적 격파 보상치는 유지.
  function _restart(){ const o=(S&&S.opts)||{}; _close(); start(o); }

  function start(opts){
    if(document.getElementById('bunker-def-overlay'))return; // 중복 방지
    S=_newState(opts);
    try{ if(window.G){ if(typeof G.bunkerKills!=='number')G.bunkerKills=0; if(typeof G.bunkerRewarded!=='number')G.bunkerRewarded=0; } }catch(e){}
    // 이미지 선로드(폴백 안전 — 없으면 벡터 사용)
    try{ Object.keys(CFG.ENEMY).forEach(k=>_img(CFG.ENEMY[k].img+_ver())); _img(CFG.TURRET_IMG.laser+_ver()); _img(CFG.TURRET_IMG.missile+_ver()); _img(CFG.BUNKER_IMG+_ver()); }catch(e){}
    const ov=_buildOverlay();
    ov.querySelector('#bd-close').onclick=_close;
    const cv=ov.querySelector('#bd-canvas');
    cv.addEventListener('click',_onCanvasClick);
    _renderTools(); _renderHud();
    _hint(tt('bunker.tip','빈 자리=설치 · 포대 클릭=강화/교체 · 준비되면 [방어 시작]'),'#8aa');
    S.lastTs=0; S.raf=requestAnimationFrame(_loop);
  }

  window.BunkerDefense={ start, close:_close, CFG };
  window.startBunkerDefense=function(){ start(); };

  // ── 진입 버튼: 보류(2026-06-21) ──────────────────────────────────
  //   미니게임 자체는 보존. 진입(메뉴 버튼/퀘스트)은 미연결 상태로 둠.
  //   재개 시: 벙커존(P22) 진입 버튼 또는 임시 런처에서 window.startBunkerDefense() 호출.
})();
