// ═══ VIEWS-MISC — game.js 에서 분리 (C5, 2026-06-23, 긴 코드 분할) ═══
//   제작 품질/폭죽 연출, 잠긴 메뉴 NPC 대사, 행성 광장/전방 뷰, 전투 기록(combat log) 뷰.
//   전역 function 이라 호출부 변경 불필요(hubTab 디스패치·onclick 모두 이름 호출).
//   game.js 직후(economy.js 인근) 로드. 잔류 의존 전역(game.js 등):
//     clamp, AudioMgr, I18N, G, PLANET_DEF, FACTION, hubBanner, shipImgSrc, shipDisplayNm.
//   combatState/getShipStats 등 전투 경계 상태는 참조하지 않음(클린 leaf).

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

// ─── 타 모듈/onclick 참조용 전역 export (C5 분리, 2026-06-23) ───────────────
try{if(typeof window!=='undefined'){
  window.rollCraftQuality=rollCraftQuality;
  window._shipCraftSuperiorBonus=_shipCraftSuperiorBonus;
  window._fireFireworks=_fireFireworks;
  window._getLockedNpcDialog=_getLockedNpcDialog;
  window.renderPlazaView=renderPlazaView;
  window.renderFrontView=renderFrontView;
  window.renderCombatLog=renderCombatLog;
  window._combatLogContentHTML=_combatLogContentHTML;
}}catch(e){}
