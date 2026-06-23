// ═══════════════════════════════════════════════════════════════════
// DESTINATION EARTH — 엔딩 크레딧 시퀀스 모듈 (Phase A1)
//   · game.js 에서 분할 (2026-06-10, 사용자 요청: 긴 파일 분할)
//   · showEndingCredits      — ACT 4 우르사 메이저 격파 후 엔딩
//   · showFinalEndingCredits — ACT 5 보이드의 심연 통과 후 최종 엔딩
//
// 의존 글로벌 (window.*):
//   · G, I18N, HEROES, HERO_PORTRAITS_BY_ID, CHAR_PORTRAITS
//   · _GAME_VER
//   · AudioMgr, combatState, _cbEffects
//   · charPortraitHTML, _planetBgmName, hubTab, setHubNav, saveGame
//
// 외부 노출:
//   · window.showEndingCredits(onDone)
//   · window.showFinalEndingCredits()
// ═══════════════════════════════════════════════════════════════════
(function(){
if(typeof window==='undefined')return;
if(window._ENDING_CREDITS_LOADED)return;
window._ENDING_CREDITS_LOADED=true;

// ─── ACT 5 최종 엔딩 크레딧 ─────────────────────────────────────
// 보이드의 심연 통과 후 — 스토리 정리 + 제작진 + 영웅 + AI 이미지 + Special thanks
function showFinalEndingCredits(){
  const G=window.G;
  const I18N=window.I18N;
  const HEROES=window.HEROES;
  // 크레딧 진입 — 잔여 전투 SFX/이펙트 차단
  try{if(typeof combatState!=='undefined'&&combatState)combatState.done=true;}catch(e){}
  try{AudioMgr.stopAllSfx();}catch(e){}
  try{if(typeof _cbEffects!=='undefined')_cbEffects=[];}catch(e){}
  const cmdName=G.profile?.name||I18N.t('ui.commander');
  const co=G.profile?.company||I18N.t('profile.companyGalactic');
  const _hl=G.heroes||[];
  const HERO_NAMES={H01:(typeof HEROES!=='undefined'&&HEROES.H01?.nm)||'이순신',H02:(typeof HEROES!=='undefined'&&HEROES.H02?.nm)||'장영실',H03:(typeof HEROES!=='undefined'&&HEROES.H03?.nm)||'광개토대왕',H04:(typeof HEROES!=='undefined'&&HEROES.H04?.nm)||'유리 가가린',H05:(typeof HEROES!=='undefined'&&HEROES.H05?.nm)||'호레이쇼 넬슨',H06:(typeof HEROES!=='undefined'&&HEROES.H06?.nm)||'아인슈타인',H07:(typeof HEROES!=='undefined'&&HEROES.H07?.nm)||'니콜라 테슬라',H08:(typeof HEROES!=='undefined'&&HEROES.H08?.nm)||'마르코 폴로'};
  const heroList=_hl.map(h=>HERO_NAMES[h]||h).filter(Boolean);
  const overlay=document.createElement('div');
  overlay.id='_final-ending-overlay';
  overlay.style.cssText=[
    'position:fixed','left:0','top:0','right:0','bottom:0','width:100vw','height:100vh',
    'background:#000','z-index:99999','opacity:0','transition:opacity 2.5s ease-in',
    'display:flex','align-items:flex-start','justify-content:center',
    'pointer-events:auto','color:#fff','font-family:Malgun Gothic, sans-serif','overflow:hidden'
  ].join(';');
  overlay.innerHTML=`
    <style>
      @keyframes _finalRoll{from{transform:translateY(100vh)}to{transform:translateY(-220%)}}
      @keyframes _finalShim{0%{background-position:0% 50%}100%{background-position:200% 50%}}
      @keyframes _finalStars{from{background-position:0 0}to{background-position:-2000px 0}}
    </style>
    <!-- 별 배경 -->
    <div style="position:absolute;inset:0;background:radial-gradient(2px 2px at 20% 30%,#fff,transparent),radial-gradient(1px 1px at 60% 70%,#fff,transparent),radial-gradient(1px 1px at 80% 10%,#fff,transparent),radial-gradient(2px 2px at 30% 80%,#fff,transparent),radial-gradient(1px 1px at 90% 50%,#fff,transparent);background-size:200px 200px;opacity:.4;animation:_finalStars 60s linear infinite"></div>
    <!-- 크레딧 롤 -->
    <div id="_final-credits" style="position:relative;width:100%;max-width:760px;text-align:center;padding:20px;animation:_finalRoll 180s linear forwards;color:#fff">
      <div style="height:30vh"></div>

      <div style="font-size:36px;letter-spacing:14px;margin-bottom:12px;background:linear-gradient(90deg,#ffd700,#ff66cc,#66ffff,#ffd700);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;background-size:200% 100%;animation:_finalShim 4s linear infinite">DESTINATION EARTH</div>
      <div style="font-size:14px;color:#aaa;letter-spacing:10px;margin-bottom:80px">${I18N.t('credits.act5Header')}</div>

      <!-- 스토리 정리 -->
      <div style="color:#ffd700;font-size:14px;letter-spacing:6px;margin-bottom:14px">${I18N.t('credits.journeyHeader')}</div>
      <div style="font-size:15px;line-height:2.2;color:#dde;text-align:left;background:rgba(255,255,255,.03);padding:24px 28px;border-radius:8px;border:1px solid rgba(255,215,0,.15);margin-bottom:60px;word-break:keep-all">
        <p style="margin:0 0 14px"><b style="color:#ffd700">ACT 1</b> — ${I18N.t('credits.act1Body',{co:co,cmd:cmdName})}</p>
        <p style="margin:0 0 14px"><b style="color:#ffaa44">ACT 2</b> — ${I18N.t('credits.act2Body',{cmd:cmdName,n:heroList.length})}</p>
        <p style="margin:0 0 14px"><b style="color:#ff66ff">ACT 3</b> — ${I18N.t('credits.act3Body')}</p>
        <p style="margin:0 0 14px"><b style="color:#ff4444">ACT 4</b> — ${I18N.t('credits.act4Body')}</p>
        <p style="margin:0 0 14px"><b style="color:#cc66ff">ACT 5</b> — ${I18N.t('credits.act5Body')}</p>
        <p style="margin:0;color:#aaa;font-style:italic">${I18N.t('credits.voidQuote')}</p>
      </div>

      <!-- 등장 인물 -->
      <div style="color:#66ddff;font-size:14px;letter-spacing:6px;margin-bottom:10px">${I18N.t('ui.commanderTitle')}</div>
      <div style="font-size:24px;margin-bottom:40px;color:#fff">${cmdName} <span style="color:#aaa;font-size:14px;margin-left:6px">— ${co}</span></div>

      <div style="color:#66ddff;font-size:14px;letter-spacing:6px;margin-bottom:10px">${I18N.t('ui.exclusiveAI')}</div>
      <div style="font-size:20px;margin-bottom:40px">${I18N.t('ui.baekguAI')}</div>

      ${heroList.length>0?`
        <div style="color:#ff99ff;font-size:14px;letter-spacing:6px;margin-bottom:10px">${I18N.t('ui.recruitedHeroesN',{n:heroList.length})}</div>
        <div style="font-size:17px;line-height:2;margin-bottom:40px">
          ${heroList.map(n=>`<div>${n}</div>`).join('')}
        </div>
      `:''}

      <div style="color:#cc66ff;font-size:14px;letter-spacing:6px;margin-bottom:10px">${I18N.t('ui.finalBoss')}</div>
      <div style="font-size:17px;line-height:1.9;margin-bottom:40px">
        ${I18N.t('speaker.ursaMajor')} — ${I18N.t('credits.ursaDesc')}<br>
        ${I18N.t('speaker.blackfalcon')} — ${I18N.t('credits.blackfalconDesc')}
      </div>

      <!-- 함대 통계 -->
      <div style="color:#66ff99;font-size:14px;letter-spacing:6px;margin-bottom:10px">${I18N.t('ui.fleetStats')}</div>
      <div style="font-size:15px;color:#fff;line-height:2;margin-bottom:60px">
        ${I18N.t('ui.endingTurnsTaken')}: <b style="color:#ffd700">${G.turn||0}</b><br>
        ${I18N.t('ui.endingHeroesRecruited')}: <b style="color:#ff99ff">${heroList.length}/${(typeof HEROES!=='undefined'&&HEROES)?Object.keys(HEROES).length:9}</b><br>
        ${I18N.t('ui.endingPlanetsOwned')}: <b style="color:#66ddff">${Object.values(G.planets||{}).filter(p=>p.owned).length}/30</b><br>
        ${I18N.t('ui.endingFinalCredits')}: <b style="color:#ffd700">₡${(G.credits||0).toLocaleString()}</b><br>
        난이도: <b style="color:#fff">${({easy:I18N.t('difficulty.easy'),normal:I18N.t('difficulty.normal'),hard:I18N.t('difficulty.hard'),extreme:I18N.t('difficulty.extreme')})[G.difficulty]||I18N.t('difficulty.normal')}</b>
      </div>

      <!-- 제작진 -->
      <div style="color:#ffd700;font-size:14px;letter-spacing:6px;margin-bottom:10px">${I18N.t('ui.credits')}</div>
      <div style="font-size:16px;line-height:2;margin-bottom:40px">
        ${I18N.t('ui.creditsPlanningDesign',{co})}<br>
        ${I18N.t('ui.creditsDev')}<br>
        ${I18N.t('ui.creditsAi')}
      </div>

      <!-- AI Image Production -->
      <div style="color:#cc66ff;font-size:14px;letter-spacing:6px;margin-bottom:10px">${I18N.t('ui.creditsAiImage')}</div>
      <div style="font-size:16px;line-height:2;margin-bottom:40px">
        ${I18N.t('ui.creditsAiImageArtists')}
      </div>

      <!-- Special Thanks -->
      <div style="color:#ffd700;font-size:14px;letter-spacing:6px;margin-bottom:10px">Special Thanks</div>
      <div style="font-size:16px;line-height:2;margin-bottom:14px">
        ${I18N.t('credits.specialThanksCompany')}
      </div>
      <div style="font-size:14px;line-height:1.9;color:#bbb;margin-bottom:60px;font-style:italic">
        ${I18N.t('credits.testerThanks')}
      </div>

      <div style="font-size:14px;color:#666;margin-bottom:8px">${I18N.t('ui.toAllHumanity')}</div>
      <div style="font-size:24px;color:#fff;letter-spacing:8px;margin-bottom:80px">${I18N.t('ui.thankYou')}</div>

      <div style="font-size:13px;color:#444;letter-spacing:4px">— THE END —</div>
      <div style="font-size:12px;color:#333;letter-spacing:2px;margin-top:8px">${I18N.t('ui.act5Subtitle')}</div>
      <div style="height:30vh"></div>
    </div>
    <!-- 건너뛰기 (우측 하단, 항상 노출) -->
    <button id="_final-skip" style="position:absolute;right:24px;bottom:24px;padding:10px 22px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.3);color:#fff;border-radius:6px;cursor:pointer;font-size:13px;letter-spacing:2px;z-index:10">${I18N.t('ui.skipArrow')}</button>
    <!-- 크레딧 종료 후 표시될 메인 복귀 버튼 (중앙) -->
    <button id="_final-return" style="position:absolute;left:50%;bottom:60px;transform:translateX(-50%);padding:18px 52px;background:linear-gradient(135deg,rgba(255,215,0,.18),rgba(255,150,80,.22));border:2px solid #ffd700;color:#ffd700;border-radius:10px;cursor:pointer;font-size:18px;font-weight:bold;letter-spacing:6px;z-index:11;box-shadow:0 0 40px rgba(255,215,0,.45),inset 0 0 20px rgba(255,215,0,.1);display:none;opacity:0;transition:opacity 1.5s ease-in" onmouseover="this.style.background='linear-gradient(135deg,rgba(255,215,0,.32),rgba(255,150,80,.34))';this.style.transform='translateX(-50%) translateY(-2px)'" onmouseout="this.style.background='linear-gradient(135deg,rgba(255,215,0,.18),rgba(255,150,80,.22))';this.style.transform='translateX(-50%)'">${I18N.t('ui.backToGame')}</button>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(()=>{overlay.style.opacity='1';});
  const _close=()=>{
    overlay.style.transition='opacity 1.5s ease-out';
    overlay.style.opacity='0';
    setTimeout(()=>{
      try{overlay.remove();}catch(e){}
      try{AudioMgr.playBgm(_planetBgmName(G.currentPlanet));}catch(e){}
      try{setHubNav('main');hubTab('main');}catch(e){}
    },1500);
  };
  overlay.querySelector('#_final-skip').onclick=_close;
  overlay.querySelector('#_final-return').onclick=_close;
  // 180초(크레딧 롤 종료, 사용자 요청 2026-06-15: 스크롤 2배 느리게 90→180s) 후
  //   자동 종료 대신 "게임으로 돌아가기" 버튼 노출
  setTimeout(()=>{
    const rb=overlay.querySelector('#_final-return');
    if(rb){rb.style.display='block';requestAnimationFrame(()=>{rb.style.opacity='1';});}
    // 건너뛰기 버튼은 작게 유지하되 라벨 변경
    const sb=overlay.querySelector('#_final-skip');
    if(sb)sb.textContent=I18N.t('outro.closeBtn');
  },180000);
}

// ─── ACT 4 엔딩 시퀀스 (우르사 메이저 격파 후) ────────────────────
// onDone: 엔딩 종료 후 콜백 (보이드 페이즈 진입)
function showEndingCredits(onDone){
  // bugfix 2026-06-12: 재진입 가드 — 보상 확인 버튼 연타 시 오버레이가 중복 생성되며
  //   TypeError(onclick of null)로 체인이 죽던 문제. 이미 떠 있으면 무시.
  if(document.getElementById('_ending-overlay'))return;
  const G=window.G;
  const I18N=window.I18N;
  const HEROES=window.HEROES;
  // 엔딩 진입 — 전투 SFX/이펙트 차단
  try{if(typeof combatState!=='undefined'&&combatState)combatState.done=true;}catch(e){}
  try{AudioMgr.stopAllSfx();}catch(e){}
  try{if(typeof _cbEffects!=='undefined')_cbEffects=[];}catch(e){}
  const cmdName=G.profile?.name||I18N.t('ui.commander');
  const co=G.profile?.company||I18N.t('profile.companyGalactic');
  const shipName=G.profile?.ship||I18N.t('ui.shipDefault');
  // 신화 기함 호칭: 사용자가 함선명을 커스텀했으면 "{함선}(거북선급)", 아니면 원작의 "위대한 화랑"
  const flagshipName=(shipName&&shipName!==I18N.t('ui.shipDefault'))?(shipName+I18N.t('ship.mustangSuffix')):I18N.t('ship.flagshipDefault');
  // 영입한 영웅별 마무리 대사 + 백구의 일기 페이지
  // 일기는 영웅 카드 직후 한 페이지씩 회상되며 흐른다.
  const _hl=G.heroes||[];
  const heroEndings=[];   // (크레딧 롤 명단용)
  const heroBlocks=[];    // (대사 + 일기 페어 — 화면 시퀀스용)
  const BG={sp:I18N.t('baekgu.diaryTitle'),col:'#9ee7ff',ic:'📓'};
  function _bgPage(tx){return Object.assign({tx},BG);}
  // 영웅 한마디(vid 610~616)·백구 일기(vid 617~621) 음성 주입. 이름변수 포함분
  //   (h06.text·h02/h03/h08.diary)은 자막만 — vid 없음.
  if(_hl.includes('H01')){
    heroEndings.push({id:'H01',nm:I18N.t('hero.H01.nm'),ic:'⚔️',col:'#ffd700',tx:I18N.t('ending.h01.text')});
    heroBlocks.push({sp:I18N.t('hero.H01.nm'),col:'#ffd700',ic:'⚔️',tx:I18N.t('ending.h01.text'),vid:'610'});
    heroBlocks.push(Object.assign(_bgPage(I18N.t('ending.h01.diary')),{vid:'617'}));
  }
  if(_hl.includes('H02')){
    heroEndings.push({id:'H02',nm:I18N.t('hero.H02.nm'),ic:'⚙️',col:'#9ee7ff',tx:I18N.t('ending.h02.text')});
    heroBlocks.push({sp:I18N.t('hero.H02.nm'),col:'#9ee7ff',ic:'⚙️',tx:I18N.t('ending.h02.text'),vid:'611'});
    heroBlocks.push(_bgPage(I18N.t('ending.h02.diary',{flagshipName})));
  }
  if(_hl.includes('H03')){
    heroEndings.push({id:'H03',nm:I18N.t('hero.H03.nm'),ic:'⚔️',col:'#ff6644',tx:I18N.t('ending.h03.text')});
    heroBlocks.push({sp:I18N.t('hero.H03.nm'),col:'#ff6644',ic:'⚔️',tx:I18N.t('ending.h03.text'),vid:'612'});
    heroBlocks.push(_bgPage(I18N.t('ending.h03.diary',{cmdName})));
  }
  if(_hl.includes('H04')){
    heroEndings.push({id:'H04',nm:I18N.t('hero.H04.nm'),ic:'🚀',col:'#66ddff',tx:I18N.t('ending.h04.text')});
    heroBlocks.push({sp:I18N.t('hero.H04.nm'),col:'#66ddff',ic:'🚀',tx:I18N.t('ending.h04.text'),vid:'613'});
    heroBlocks.push(Object.assign(_bgPage(I18N.t('ending.h04.diary')),{vid:'618'}));
  }
  if(_hl.includes('H05')){
    heroEndings.push({id:'H05',nm:I18N.t('hero.H05.nm'),ic:'⚓',col:'#aaffaa',tx:I18N.t('ending.h05.text')});
    heroBlocks.push({sp:I18N.t('hero.H05.nm'),col:'#aaffaa',ic:'⚓',tx:I18N.t('ending.h05.text'),vid:'614'});
    heroBlocks.push(Object.assign(_bgPage(I18N.t('ending.h05.diary')),{vid:'619'}));
  }
  if(_hl.includes('H06')){
    heroEndings.push({id:'H06',nm:I18N.t('hero.H06.nm'),ic:'🧠',col:'#cc99ff',tx:I18N.t('ending.h06.text',{cmdName})});
    heroBlocks.push({sp:I18N.t('hero.H06.nm'),col:'#cc99ff',ic:'🧠',tx:I18N.t('ending.h06.text',{cmdName})});
    heroBlocks.push(Object.assign(_bgPage(I18N.t('ending.h06.diary')),{vid:'620'}));
  }
  if(_hl.includes('H07')){
    heroEndings.push({id:'H07',nm:I18N.t('hero.H07.nm'),ic:'⚡',col:'#66ffff',tx:I18N.t('ending.h07.text')});
    heroBlocks.push({sp:I18N.t('hero.H07.nm'),col:'#66ffff',ic:'⚡',tx:I18N.t('ending.h07.text'),vid:'615'});
    heroBlocks.push(Object.assign(_bgPage(I18N.t('ending.h07.diary')),{vid:'621'}));
  }
  if(_hl.includes('H08')){
    heroEndings.push({id:'H08',nm:I18N.t('hero.H08.nm'),ic:'🧭',col:'#ffcc66',tx:I18N.t('ending.h08.text')});
    heroBlocks.push({sp:I18N.t('hero.H08.nm'),col:'#ffcc66',ic:'🧭',tx:I18N.t('ending.h08.text'),vid:'616'});
    heroBlocks.push(_bgPage(I18N.t('ending.h08.diary',{shipName})));
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
    <div id="_end-line-box" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(1180px,94vw);padding:32px;z-index:2;opacity:0;transition:opacity .8s ease-in-out;display:flex;gap:36px;align-items:center;justify-content:center">
      <div id="_end-portrait" style="flex-shrink:0;display:none"></div>
      <div id="_end-textcol" style="flex:1;min-width:0;text-align:center">
        <div id="_end-speaker" style="font-size:23px;letter-spacing:6px;color:#aaa;margin-bottom:14px"></div>
        <div id="_end-text" style="font-size:33px;line-height:1.85;color:#fff;word-break:keep-all;overflow-wrap:break-word;line-break:strict;hyphens:auto;text-shadow:0 0 12px rgba(255,255,255,.3);padding:0 6px"></div>
      </div>
    </div>
    <!-- 크레딧 (롤링) -->
    <div id="_end-credits" style="position:absolute;left:0;right:0;bottom:-100%;width:100%;text-align:center;color:#fff;font-size:18px;line-height:2.2;z-index:2;opacity:0;transition:opacity 1s"></div>
    <!-- 건너뛰기 버튼 (우측 하단) -->
    <button id="_end-skip" style="position:absolute;right:24px;bottom:24px;padding:10px 22px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.3);color:#fff;border-radius:6px;cursor:pointer;font-size:13px;letter-spacing:2px;z-index:10">${I18N.t('ui.skipArrow')}</button>
    <!-- 크레딧 종료 후 표시될 메인 복귀 버튼 (중앙) -->
    <button id="_end-return" style="position:absolute;left:50%;bottom:60px;transform:translateX(-50%);padding:18px 52px;background:linear-gradient(135deg,rgba(102,221,255,.18),rgba(102,255,180,.22));border:2px solid #66ddff;color:#66ddff;border-radius:10px;cursor:pointer;font-size:18px;font-weight:bold;letter-spacing:6px;z-index:11;box-shadow:0 0 40px rgba(102,221,255,.45),inset 0 0 20px rgba(102,221,255,.1);display:none;opacity:0;transition:opacity 1.5s ease-in" onmouseover="this.style.background='linear-gradient(135deg,rgba(102,221,255,.32),rgba(102,255,180,.34))';this.style.transform='translateX(-50%) translateY(-2px)'" onmouseout="this.style.background='linear-gradient(135deg,rgba(102,221,255,.18),rgba(102,255,180,.22))';this.style.transform='translateX(-50%)'">${I18N.t('ui.backToGame')}</button>
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
  //   대사 데이터는 공통 모듈(js/data/boss-cutscenes.js)에서 참조
  //   (CUTSCENE_STRUCTURE_STANDARD §6-1). 고유 렌더러 R3(자동롤·크레딧·레이아웃)는
  //   아래 그대로 유지하며, {sp,col,tx,ic} 스키마·필드·순서도 보존된다.
  let lines;
  if(window.BOSS_CUTSCENES&&typeof window.BOSS_CUTSCENES.earthLiberationEnding==='function'){
    lines=window.BOSS_CUTSCENES.earthLiberationEnding(cmdName,shipName,flagshipName,_hl);
  } else {
    // 폴백: 공통 모듈 미로드 시에도 기존 정의로 엔딩 보장 (byte-identical)
    lines=[
      {sp:I18N.t('actTrans.2.sysSp'),col:'#66ffcc',tx:I18N.t('ending.sys1'),vid:'492'},
      {sp:I18N.t('actTrans.2.sysSp'),col:'#66ffcc',tx:I18N.t('ending.sys2'),vid:'493'},
      // 일기 첫 페이지 (D-day 100년 + 1일) — 이름 포함, 자막만
      Object.assign({tx:I18N.t('ui.diaryWake1',{cmdName})},BG),
      // 일기 두 번째 페이지 (첫 출항) — 이름 포함, 자막만
      Object.assign({tx:I18N.t('ui.firstFlightDiary',{shipName,cmdName})},BG),
      // 영웅 카드 + 그에 딸린 일기 페어 (영입한 영웅만 표시됨) — 자막만
      ...heroBlocks,
      // 치크스 진실 회상 — 이름 포함, 자막만
      Object.assign({tx:I18N.t('ui.cheeksTruthDiary',{cmdName})},BG),
      // 기함 출항 전야 — 이름 포함, 자막만
      Object.assign({tx:I18N.t('ui.predepartureDiary',{flagshipName,cmdName})},BG),
      // 6단 체인 회상 — 고정 대사, vid 497
      Object.assign({tx:I18N.t('ui.diary6Chain'),vid:'497'},BG),
      // 우르사 메이저 마지막 말 — 이름 포함, 자막만
      Object.assign({tx:I18N.t('ui.ursaPostLine',{cmdName})},BG),
      // 사령관 짧은 호흡 — 고정 대사, vid 495
      {sp:cmdName,col:'#ffd700',tx:I18N.t('ending.cmdTogether'),vid:'495'},
      {sp:cmdName,col:'#ffd700',tx:I18N.t('ui.lastWarpHome',{flagshipName})},
      // 일기 마지막 페이지 (D-day 100년 + 412일) — 고정 대사, vid 498
      Object.assign({tx:I18N.t('ui.diaryLand412'),vid:'498'},BG),
      Object.assign({tx:I18N.t('ending.bg100Final'),vid:'496'},BG),
      {sp:'백구',col:'#9ee7ff',ic:'🐕',tx:I18N.t('ui.dontWakeMe',{nm:cmdName})},
      {sp:I18N.t('actTrans.2.sysSp'),col:'#66ffcc',tx:I18N.t('ending.titleLine')},
      {sp:I18N.t('actTrans.2.sysSp'),col:'#66ffcc',tx:I18N.t('ending.liberationDone'),vid:'494'}
    ];
  }

  const speakerEl=overlay.querySelector('#_end-speaker');
  const textEl=overlay.querySelector('#_end-text');
  const lineBox=overlay.querySelector('#_end-line-box');
  const portraitEl=overlay.querySelector('#_end-portrait');
  const textColEl=overlay.querySelector('#_end-textcol');
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
        // ── 화자 얼굴(왼쪽) + 글(오른쪽) ── 시스템 메시지는 로봇 안내 이미지(system.png) 사용
        const _isSys=(l.sp===I18N.t('actTrans.2.sysSp'));
        const _pspk=(l.sp===I18N.t('baekgu.diaryTitle'))?I18N.t('baekgu.diarySpeaker'):l.sp;
        if(portraitEl&&textColEl){
          let _pHTML;
          if(l.sp==='???'||l.sp.indexOf(I18N.t('chat.signal'))>=0){
            const _pc=l.col||'#ff6688';
            const _vv=(window._GAME_VER)?('?v='+encodeURIComponent(window._GAME_VER)):'';
            // HD 우선(img/chars/H/) → 실패 시 저해상도 폴백. 사용자 보고 2026-06-16: 크레딧 해상도 낮음.
            _pHTML='<img src="img/chars/H/void_hiden.png'+_vv+'" data-lo="img/chars/void_hiden.png'+_vv+'" alt="???" style="width:396px;height:396px;border-radius:50%;object-fit:cover;border:2px solid '+_pc+';background:rgba(0,0,0,.4);box-shadow:0 0 18px '+_pc+'88" onerror="if(this.dataset.lo){this.src=this.dataset.lo;this.dataset.lo=\'\';}">';
          }else{
            _pHTML=charPortraitHTML(_pspk,l.ic||(_isSys?'🤖':'⚑'),396,l.col||'#fff',true);
          }
          portraitEl.innerHTML=_pHTML;
          portraitEl.style.display='block';
          textColEl.style.textAlign='left';
        }
        // 자동매칭 차단(음성연동 §0-B·4): 엔딩 오버레이의 화자 이름표·일기 본문을
        //   전역 MutationObserver(playByText)가 잡아 오재생/반복(백구 일기·"광개토대왕")하던
        //   문제를 막는다. 텍스트 주입 직전부터 다음 대사 전환까지 자동매칭을 억제하고,
        //   고정 대사(vid 보유분)만 playLine({vid})로 명시 재생한다.
        //   vid 라인은 음성 길이만큼 대기하므로 자동매칭 억제창도 넉넉히(클립 상한 고려).
        try{ if(window.VoicePlayer&&typeof window.VoicePlayer.suppress==='function') window.VoicePlayer.suppress(((l.tx||'').length>=60?5000:3600)+(l.vid?15000:2000)); }catch(e){}
        speakerEl.style.color=l.col||'#aaa';
        speakerEl.textContent=(l.ic?l.ic+' ':'')+l.sp;
        textEl.style.color=l.col||'#fff';
        textEl.textContent=`"${l.tx}"`;
        lineBox.style.opacity='1';
        // 대사 가독 시간 — 한 줄짜리는 3.6초, 긴 문장(60자+)은 5.0초
        const _readMs=(l.tx||'').length>=60?5000:3600;
        // 다음 라인 진행 — 음성 라인은 클립이 끝날 때까지 대기(빨리 넘어감 버그 수정 2026-06-24).
        //   음성 없는 라인(자막만)은 기존 _readMs 타이머 유지.
        //   _advance 는 1회만 실행(onended·안전타이머 중 먼저 오는 쪽). 음성이 _readMs 보다
        //   짧으면 최소 _readMs 는 보장(텍스트 페이드/가독), 길면 onended 까지 대기.
        let _advanced=false;
        const _advance=()=>{ if(_advanced||!_alive())return; _advanced=true; showLine(); };
        // 고정 대사만 음성 명시 재생(이름 포함 일기/타이틀/영웅카드는 vid 없음=무음 자막).
        let _audio=null;
        try{
          if(l.vid&&window.VoicePlayer&&typeof window.VoicePlayer.playVoice==='function'){
            const _startedAt=Date.now();
            _audio=window.VoicePlayer.playVoice(l.vid,{onended:()=>{
              // 음성이 끝나면 다음 라인 — 단, 최소 가독시간(_readMs)은 보장.
              const _elapsed=Date.now()-_startedAt;
              const _wait=Math.max(0,_readMs-_elapsed);
              setTimeout(_advance,_wait+600);
            }});
          } else if(l.vid&&window.VoicePlayer&&typeof window.VoicePlayer.playLine==='function'){
            window.VoicePlayer.playLine({vid:l.vid});
          }
        }catch(e){}
        // 안전 타이머: 음성이 없거나(또는 onended 미발화 시) — 음성 라인은 넉넉한 상한,
        //   자막 라인은 기존 _readMs 그대로.
        const _fallbackMs=(l.vid&&_audio)?(_readMs+12000):_readMs;
        setTimeout(_advance,_fallbackMs);
        return;   // (아래 공통 타이머 분기로 떨어지지 않음 — 진행은 _advance 가 전담)
      }catch(e){console.warn('[ending] showLine',e.message);}
      // (예외 발생 시 폴백) 음성 연동 실패해도 진행 보장 — 고정 가독 타이머
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
        <div style="font-size:13px;color:#aaa;letter-spacing:8px;margin-bottom:60px">${I18N.t('ui.endingPostTitle')}</div>

        <div style="color:#ffd700;font-size:14px;letter-spacing:6px;margin-bottom:6px">${I18N.t('ui.commanderTitle')}</div>
        <div style="font-size:24px;margin-bottom:40px;color:#fff">${cmdName} <span style="color:#aaa;font-size:14px;margin-left:6px">— ${co}</span></div>

        <div style="color:#66ddff;font-size:14px;letter-spacing:6px;margin-bottom:6px">${I18N.t('ui.exclusiveAI')}</div>
        <div style="font-size:20px;margin-bottom:40px">${I18N.t('ui.baekguAI')}</div>

        ${heroEndings.length>0?`
          <div style="color:#ff99ff;font-size:14px;letter-spacing:6px;margin-bottom:14px">${I18N.t('ui.recruitedHeroesNoCap',{n:heroEndings.length})}</div>
          ${heroEndings.map(h=>{
            // 1순위: 영웅 ID 기반 매핑 — 언어 무관 (EN/KO 동일하게 hero01~08.png)
            let _hImg=(h.id&&typeof HERO_PORTRAITS_BY_ID!=='undefined'&&HERO_PORTRAITS_BY_ID[h.id])
                       ||(typeof CHAR_PORTRAITS!=='undefined'&&CHAR_PORTRAITS[h.nm])||'';
            // 캐시 버스터: 새 빌드 시 강제 갱신
            if(_hImg&&window._GAME_VER&&_hImg.indexOf('?v=')<0)_hImg=_hImg+'?v='+encodeURIComponent(window._GAME_VER);
            // 표시 이름은 현재 언어의 HEROES[id].nm 우선 (EN 모드에서 영문명 노출)
            const _dispNm=(h.id&&typeof HEROES!=='undefined'&&HEROES[h.id]&&HEROES[h.id].nm)||h.nm;
            return `<div style="display:flex;align-items:center;justify-content:center;gap:14px;margin-bottom:12px">
              ${_hImg?`<img src="${_hImg}" alt="${_dispNm}" style="width:56px;height:56px;border-radius:50%;border:2px solid ${h.col};object-fit:cover;background:rgba(0,0,0,.4);box-shadow:0 0 14px ${h.col}66" onerror="this.outerHTML='<span style=&quot;font-size:30px&quot;>${h.ic}</span>'">`:`<span style="font-size:30px">${h.ic}</span>`}
              <div style="font-size:19px;color:${h.col};font-weight:bold;letter-spacing:1px">${_dispNm}</div>
            </div>`;
          }).join('')}
          <div style="height:40px"></div>
        `:''}

        <div style="color:#66ff99;font-size:14px;letter-spacing:6px;margin-bottom:6px">${I18N.t('ui.fleetStats')}</div>
        <div style="font-size:16px;color:#fff;line-height:1.9;margin-bottom:40px">
          ${I18N.t('ui.turnsTaken')}: <b style="color:#ffd700">${G.turn||0}</b><br>
          ${I18N.t('ui.heroesHired')}: <b style="color:#ff99ff">${(G.heroes||[]).length}/${(typeof HEROES!=='undefined'&&HEROES)?Object.keys(HEROES).length:9}</b><br>
          ${I18N.t('ui.planetsOwned')}: <b style="color:#66ddff">${Object.values(G.planets).filter(p=>p.owned).length}/30</b><br>
          ${I18N.t('ui.finalCredits')}: <b style="color:#ffd700">₡${(G.credits||0).toLocaleString()}</b><br>
          ${I18N.t('ui.difficulty')}: <b style="color:#fff">${({easy:I18N.t('difficulty.easy'),normal:I18N.t('difficulty.normal'),hard:I18N.t('difficulty.hard'),extreme:I18N.t('difficulty.extreme')})[G.difficulty]||I18N.t('difficulty.normal')}</b>
        </div>

        <div style="color:#aaa;font-size:14px;letter-spacing:6px;margin-bottom:6px">${I18N.t('ui.shipsDestroyed')}</div>
        <div style="font-size:16px;margin-bottom:40px">${I18N.t('ui.shipsDestroyedList')}</div>

        <!-- ─── 그동안의 이야기 (ACT 1~5 서사 회고) ─────────────────── -->
        <div style="color:#ffd87a;font-size:14px;letter-spacing:6px;margin-bottom:18px">${I18N.t('ui.theStorySoFar')}</div>
        <div style="max-width:760px;margin:0 auto 60px;font-size:15px;color:#e8e8e8;line-height:2.05;text-align:left;padding:0 28px;word-break:keep-all">

          <div style="text-align:center;color:#aaa;font-size:12px;letter-spacing:4px;margin:8px 0 10px">${I18N.t('ending.prologueHead')}</div>
          <p style="margin:0 0 22px">${I18N.t('ui.openingProseFull',{nm:cmdName})}</p>

          <div style="text-align:center;color:#ffd87a;font-size:12px;letter-spacing:4px;margin:8px 0 10px">${I18N.t('ending.act1Head')}</div>
          <p style="margin:0 0 22px">${I18N.t('ui.endingShipProse',{ship:shipName,co})}</p>

          <div style="text-align:center;color:#66ddff;font-size:12px;letter-spacing:4px;margin:8px 0 10px">${I18N.t('ending.act2Head')}</div>
          <p style="margin:0 0 22px">${I18N.t('ui.chixShadowProse')}</p>

          <div style="text-align:center;color:#ff99ff;font-size:12px;letter-spacing:4px;margin:8px 0 10px">${I18N.t('ending.act3Head')}</div>
          <p style="margin:0 0 22px">${I18N.t('ending.heroEpilogue',{nms:heroEndings.length>0?heroEndings.map(h=>h.nm).slice(0,8).join(' · '):I18N.t('ending.heroFallbackList'),cmd:cmdName})}</p>

          <div style="text-align:center;color:#ff8866;font-size:12px;letter-spacing:4px;margin:8px 0 10px">${I18N.t('ending.act4Head')}</div>
          <p style="margin:0 0 22px">${I18N.t('ui.chixMirrorProse',{title:I18N.t('ui.chixWereMirror'),nm:cmdName})}</p>

          <div style="text-align:center;color:#ffd700;font-size:12px;letter-spacing:4px;margin:8px 0 10px">${I18N.t('ending.act5Head')}</div>
          <p style="margin:0 0 22px">${I18N.t('ui.endingFlagshipProse',{ship:flagshipName})}</p>

          <div style="text-align:center;color:#cc88ff;font-size:12px;letter-spacing:4px;margin:8px 0 10px">${I18N.t('ending.act6Head')}</div>
          <p style="margin:0 0 22px">${I18N.t('ending.act6Body')}</p>

          <div style="text-align:center;color:#66ffcc;font-size:12px;letter-spacing:4px;margin:18px 0 10px">${I18N.t('ending.epilogueHead')}</div>
          <p style="margin:0">${I18N.t('ending.epilogueBody',{ship:flagshipName})}</p>
        </div>

        <div style="color:#cc66ff;font-size:14px;letter-spacing:6px;margin-bottom:6px">${I18N.t('ui.credits')}</div>
        <div style="font-size:16px;line-height:2;margin-bottom:60px">
          ${I18N.t('ui.creditsPlanningDesign',{co})}<br>
          ${I18N.t('ui.creditsDev')}<br>
          ${I18N.t('ui.creditsAi')}
        </div>

        <div style="font-size:14px;color:#666;margin-bottom:8px">${I18N.t('ui.toAllHumanity')}</div>
        <div style="font-size:22px;color:#fff;letter-spacing:8px;margin-bottom:80px">${I18N.t('ui.thankYou')}</div>

        <div style="font-size:13px;color:#444;letter-spacing:4px">— THE END —</div>
        <div style="height:200px"></div>
      </div>`;
    creditsEl.style.bottom='auto';
    creditsEl.style.top='100vh';
    creditsEl.style.opacity='1';
    // 스토리 내용이 많아 롤링 속도 50s → 95s 로 완화 (사용자 요청, 가독성 우선)
    creditsEl.style.animation='_endRoll 95s linear forwards';
    setTimeout(()=>{
      const rb=overlay.querySelector('#_end-return');
      if(rb){
        rb.onclick=_finish;
        rb.style.display='block';
        requestAnimationFrame(()=>{rb.style.opacity='1';});
      }
    },97000);
  }
  // 첫 대사 시작 (페이드인 2초 후)
  setTimeout(showLine,2200);
}

window.showEndingCredits=showEndingCredits;
window.showFinalEndingCredits=showFinalEndingCredits;
console.log('[ending-credits] Loaded — showEndingCredits + showFinalEndingCredits');
})();
