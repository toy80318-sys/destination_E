// ═══════════════════════════════════════════════════════════════════
// DESTINATION EARTH — 퀘스트 생성 시스템 모듈 (일반 퀘 생성·보상 계산)
//   · game.js 에서 분할 (2026-06-13, 사용자 요청: 긴 코드 분할)
// ═══════════════════════════════════════════════════════════════════
(function(){
if(typeof window==='undefined')return;
if(window._QUEST_GEN_LOADED)return;
window._QUEST_GEN_LOADED=true;

// ═══ QUEST SYSTEM ════════════════════════════════════════════════
const QUEST_TEMPLATES=[
  {type:'combat',ic:'⚔️',npc:I18N.t('quest.npc.admiral'),npcIc:'🎖️',
   titles:[I18N.t('quest.combat.title1'),I18N.t('quest.combat.title2'),I18N.t('quest.combat.title3'),I18N.t('quest.combat.title4')],
   descs:[I18N.t('quest.combat.desc1'),I18N.t('quest.combat.desc2'),I18N.t('quest.combat.desc3'),I18N.t('quest.combat.desc4')]},
  {type:'delivery',ic:'📦',npc:I18N.t('quest.npc.broker'),npcIc:'🕴️',
   titles:[I18N.t('quest.delivery.title1'),I18N.t('quest.delivery.title2'),I18N.t('quest.delivery.title3'),I18N.t('quest.delivery.title4')],
   descs:[I18N.t('quest.delivery.desc1'),I18N.t('quest.delivery.desc2'),I18N.t('quest.delivery.desc3'),I18N.t('quest.delivery.desc4')]},
  {type:'gather',ic:'⛏️',npc:I18N.t('quest.npc.broker'),npcIc:'🕴️',
   titles:[I18N.t('quest.gather.title1'),I18N.t('quest.gather.title2'),I18N.t('quest.gather.title3'),I18N.t('quest.gather.title4')],
   descs:[I18N.t('quest.gather.desc1'),I18N.t('quest.gather.desc2'),I18N.t('quest.gather.desc3'),I18N.t('quest.gather.desc4')]},
  {type:'explore',ic:'🔭',npc:I18N.t('quest.npc.admiral'),npcIc:'🎖️',
   titles:[I18N.t('quest.explore.title1'),I18N.t('quest.explore.title2'),I18N.t('quest.explore.title3'),I18N.t('quest.explore.title4')],
   descs:[I18N.t('quest.explore.desc1'),I18N.t('quest.explore.desc2'),I18N.t('quest.explore.desc3'),I18N.t('quest.explore.desc4')]},
  // 특산물 구매 의뢰 — 보상 = 시세 판매가의 2배
  {type:'buy',ic:'🛒',npc:I18N.t('quest.npc.broker'),npcIc:'🕴️',
   titles:[I18N.t('quest.buy.title1'),I18N.t('quest.buy.title2'),I18N.t('quest.buy.title3'),I18N.t('quest.buy.title4')],
   descs:[I18N.t('quest.buy.desc1'),I18N.t('quest.buy.desc2'),I18N.t('quest.buy.desc3'),I18N.t('quest.buy.desc4')]},
];
const VOID_BOSS_ID='FALCON_SCOUT_VOID';
// 능력치 = 렐러티비티(LGD03)의 3배
//   HP 245,000×3 = 735,000 / SH 90,000×3 = 270,000
//   ATT 306×3 = 918 / INT 295×3 = 885 / TEC 255×3 = 765
// 50% 페이즈부터 차원 절단광선으로 비기함 함선 1척씩 즉시 소멸 / 10% 페이즈에서 자진 철수
const VOID_BOSS={
  id:VOID_BOSS_ID,nm:I18N.t('boss.blackfalcon'),tier:'소형',isEnemy:true,
  hp:735000,maxHP:735000,sh:270000,maxSH:270000,
  ATT:918,INT:885,TEC:765,DEF:200,HP:735000,LOY:0,parts:[],
  voidBoss:true,catId:'S10',  // img/ships/S10.png (보이드 보스 전용 함선 이미지)
  shieldTier:18,armorTier:14,
  _lore:I18N.t('boss.blackfalconLore')
};
function _allVoidOwned(){
  return PLANET_DEF.filter(p=>p.void).every(p=>G.planets[p.id]?.owned);
}
// ── 퀘스트 시스템 설정 ────────────────────────────────────────────
// 행성당 동시 미완료 퀘스트 최대치 (시나리오·영웅·일반 모두 합산)
// 사용자 요청 (2026-06-07): 최대 6개로 제한 — 6개 초과 시 신규 spawn 차단, 순차 진행 유도
const QUEST_MAX_AVAILABLE=6;
const QUEST_SPAWN_PER_TURN_MIN=1;
const QUEST_SPAWN_PER_TURN_MAX=2;

// 절차 퀘스트 텍스트 공용 포맷터 — 생성·재지역화에서 동일 규칙 사용 (현재 언어로 nm/desc 생성)
//   type: combat/delivery/gather/explore/buy, ti: 템플릿 인덱스(0-based)
//   opts(buy): {commNm, qty, cr, unit}
function _procQuestText(type, ti, opts){
  opts=opts||{}; ti=ti||0;
  var TK={combat:'quest.combat',delivery:'quest.delivery',gather:'quest.gather',explore:'quest.explore',buy:'quest.buy'}[type];
  if(!TK) return null;
  var titleKey=TK+'.title'+(ti+1), descKey=TK+'.desc'+(ti+1);
  var nm=I18N.t(titleKey), desc=I18N.t(descKey);
  if(type==='buy'){
    var cnm=opts.commNm||'';
    nm=I18N.t('quest.buyTitle',{title:I18N.t(titleKey),nm:cnm,qty:opts.qty});
    desc=I18N.t(descKey).replace(/N개/g,I18N.t('quest.qtyN',{n:opts.qty,nm:cnm}))
        +I18N.t('quest.buyDescSuffix',{cr:(opts.cr||0).toLocaleString(),unit:(opts.unit||0).toLocaleString(),qty:opts.qty});
  }
  return {nm:nm, desc:desc};
}
try{window._procQuestText=_procQuestText;}catch(e){}

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
  // 텍스트 = 공용 포맷터로 생성. 재지역화용 메타데이터 저장: _gT(템플릿 인덱스)·_gU(단가)
  var _qt=_procQuestText(tmpl.type, ti, {commNm:targetCommNm, qty:requiredQty, cr:cr, unit:unitPrice});
  var nm=_qt?_qt.nm:tmpl.titles[ti], desc=_qt?_qt.desc:tmpl.descs[ti];
  return {
    id:'q_'+pid+'_a'+G.act+'_t'+G.turn+'_s'+suffix+'_'+Math.floor(Math.random()*9999),
    type:tmpl.type,ic:tmpl.ic,npc:tmpl.npc,npcIc:tmpl.npcIc,
    nm:nm,desc:desc,rewardCr:cr,rewardVe:ve,
    status:'available',targetId:targetId,progress:0,
    required:requiredQty,planetId:pid,
    targetCommId:targetCommId,
    _gT:ti, _gU:unitPrice
  };
}

// 행성 도착 시 호출 — 신규 행성이면 초기 4개 시드. 기존 퀘스트는 보존
function generateQuests(pid){
  if(!G.quests[pid])G.quests[pid]=[];
  // ── 보이드 보스 퀘스트 상태 자가 복구 ────────────────────────────
  //  · 사용자 요청: "패배했을 경우만 수락이 다시 활성화"
  //  · 승리(G._voidFalconDefeated=true) 시: 어떤 상황에서도 'available' 로 되돌리지 않음
  //    └ 보상 outro 가 'claimed' 로 마무리할 시간이 필요하므로 status 변경 자체를 안 함
  //  · 미승리 + 'active' + 전투 중도 아님 → 패배로 간주, 'available' 로 재활성화
  if(G.quests[pid]&&G.quests[pid].length&&!G._voidFalconDefeated){
    const _voidCombatInProgress=!!(window.combatState&&combatState.isVoidBoss);
    if(!_voidCombatInProgress){
      G.quests[pid].forEach(q=>{
        if(q&&q.type==='void_boss'&&q.status==='active'){
          q.status='available';
        }
      });
    }
  }
  // 히든 보스 퀘스트: P30(제타 레티쿨리) 방문 시 — ACT 4 이후 + 보이드 행성 1개 이상 보유 시 등장
  // ※ 사용자 요청(2026-06-03): 트리거 조건을 "지구 해방"에서 "ACT≥4 + 보이드 행성 보유"로 변경.
  //   _earthLiberated 자동 승격 로직은 유지(다른 시스템 호환).
  if(!G._earthLiberated){
    const _hasUrsaCap=(G.fleet||[]).some(s=>s.id&&s.id.startsWith('BOSS_URSA'))
                    ||(G.reserveFleet||[]).some(s=>s.id&&s.id.startsWith('BOSS_URSA'));
    if(_hasUrsaCap){G._earthLiberated=true;}
  }
  // ※ 일반 퀘스트 생성보다 우선 처리 (early-return을 우회)
  const _ownsAnyVoid=(typeof PLANET_DEF!=='undefined')&&PLANET_DEF.filter(p=>p.void).some(p=>G.planets[p.id]?.owned);
  if(pid==='P30'&&(G.act||0)>=4&&_ownsAnyVoid&&!G.quests[pid].some(q=>q.id==='q_void_boss')&&!G._voidFalconDefeated){
    G.quests[pid].unshift({
      id:'q_void_boss',type:'void_boss',ic:'🌑',npc:'???',npcIc:'🌑',
      nm:I18N.t('quest.darkShipHidden'),
      desc:I18N.t('quest.darkShipDesc'),
      rewardCr:200000000,rewardVe:999,
      status:'available',targetId:null,progress:0,required:1,planetId:'P30'
    });
  }
  // 전체 미완료 퀘스트 카운트 — 시나리오·영웅·보이드 포함 모든 종류 합산 (사용자 요청)
  // 최대 6개 한도 → 한도 도달 시 추가 일반 퀘 생성 안 함 (순차 진행 유도)
  var _activeQuests=G.quests[pid].filter(function(q){
    return q && q.status!=='claimed';
  }).length;
  if(_activeQuests>=QUEST_MAX_AVAILABLE)return;
  // 신규 행성 — 6개 한도 안에서 일반 퀘 시드 채움 (시나리오·영웅 퀘 spawn 후 남는 만큼)
  var _seedRoom=QUEST_MAX_AVAILABLE-_activeQuests;
  var _seedCount=Math.min(4,_seedRoom);  // 기본 4개 시드, 단 한도 초과 안 함
  for(var i=0;i<_seedCount;i++){
    var q=_generateSingleQuest(pid,i);
    if(q)G.quests[pid].push(q);
  }
}
// 히든 보스 전투 진입 전 대사 팝업 → 확인 시 전투 모드 진입
// 호러 + 글리치 + 영웅 반응 + 위트있는 마무리
function showVoidBossIntro(questRef){
  const cmdName=G.profile?.name||I18N.t('ui.commander');
  // 사용자 요청 (2026-06-06): 영문판에서 화자명/효과음 텍스트 한글 잔재 제거 — i18n 라우팅
  const _spBk=I18N.t('speaker.baekgu');
  // 영입한 영웅 반응 자동 삽입 (있는 영웅만)
  const _hl=G.heroes||[];
  const heroLines=[];
  if(_hl.includes('H01'))heroLines.push({sp:I18N.t('hero.H01.nm'),tx:I18N.t('voidQ.h01.line')});
  if(_hl.includes('H03'))heroLines.push({sp:I18N.t('hero.H03.nm'),tx:I18N.t('voidQ.h03.line')});
  if(_hl.includes('H06'))heroLines.push({sp:I18N.t('hero.H06.nm'),tx:I18N.t('voidQ.h06.line')});
  if(_hl.includes('H07'))heroLines.push({sp:I18N.t('hero.H07.nm'),tx:I18N.t('voidQ.h07.line')});
  if(_hl.includes('H04'))heroLines.push({sp:I18N.t('hero.H04.nm'),tx:I18N.t('voidQ.h04.line')});
  if(_hl.includes('H08'))heroLines.push({sp:I18N.t('hero.H08.nm'),tx:I18N.t('voidQ.h08.line')});
  // 영웅이 없으면 위트있는 폴백
  if(heroLines.length===0)heroLines.push({sp:cmdName,tx:I18N.t('voidQ.cmdNoHero')});

  const lines=[
    // 1) 백구의 다급한 외침
    {sp:_spBk,tx:I18N.t('ui.blackShipApprox',{nm:cmdName}),fx:'baekgu'},
    // 2~5) 호러풍 글리치 통신 — '치지직' 사운드 텍스트도 i18n 키화 (voidQ.staticNoise)
    {sp:I18N.t('ui.signalReceived'),tx:I18N.t('voidQ.staticNoise'),fx:'static'},
    {sp:'???',tx:I18N.t('voidQ.unknown1'),fx:'glitch'},
    {sp:'???',tx:I18N.t('voidQ.unknown2'),fx:'glitch'},
    {sp:'???',tx:I18N.t('voidQ.unknown3'),fx:'glitch'},
    // 6) 백구의 놀란 반응
    {sp:_spBk,tx:I18N.t('ui.voidGovernorReact'),fx:'baekgu'},
    // 7~N) 영웅들의 반응 (영입한 영웅들만)
    ...heroLines,
    // 마지막 위트 있는 마무리들
    {sp:cmdName,tx:I18N.t('voidQ.cmdAccept')},
    {sp:_spBk,tx:I18N.t('voidQ.bkHorrorJoke')},
    {sp:cmdName,tx:I18N.t('voidQ.cmdBkScold')},
    {sp:_spBk,tx:I18N.t('ui.allFleetWaiting',{cmdName})}
  ];
  let _idx=0;
  function _renderLine(){
    const l=lines[_idx];
    const isVoid=l.sp==='???'||l.sp===I18N.t('ui.signalReceived');
    const isBaekgu=(l.sp=='백구'||l.sp=='Baekgu');
    const isCmd=l.sp===cmdName;
    const isHero=!isVoid&&!isBaekgu&&!isCmd;
    const spColor=isVoid?'#cc66ff':isBaekgu?'var(--cyan)':isHero?'#ffaa44':'var(--gold)';
    const spIc=isVoid?'🌑':isBaekgu?'🐕':isHero?'⚔️':'⚑';
    const portrait=charPortraitHTML(l.sp,spIc,216,spColor);
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
    openModal(I18N.t('modal.zetaSignal'),
      `<div style="padding:14px;min-height:240px;background:${isVoid?'radial-gradient(circle at center,rgba(40,0,60,.4),rgba(0,0,0,.9))':'transparent'};border-radius:8px">
        <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;justify-content:center;margin-bottom:14px;padding:16px;background:${bgGrad};border:1.5px solid ${borderColor};border-radius:12px;box-shadow:0 0 24px ${glowColor};${glitchAnim}">
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
          ? {txt:I18N.t('ui.continueArrow'),fn:()=>{_idx++;_renderLine();},cls:'btn-gold'}
          : {txt:I18N.t('ui.startBattle'),fn:()=>{closeModal();startVoidBossCombat(questRef);},cls:'btn-red'},
        {txt:I18N.t('voidQ.later'),fn:()=>{closeModal();questRef.status='available';saveGame(true);if(typeof rerenderTab==='function'&&typeof renderQuestTab==='function')rerenderTab(renderQuestTab);},cls:'btn-sm'}
      ],
      {wide:true}
    );
  }
  try{AudioMgr.playBgm('boss');}catch(e){}
  _renderLine();
}

// 히든 보스 격파/철수 시 — 작별 메시지 + 함대 복구 + 보상 수령
function showVoidBossOutro(){
  const cmdName=G.profile?.name||I18N.t('ui.commander');
  // 사용자 요청 (2026-06-06): 영문판 화자명/효과음 한글 잔재 제거
  const _spBk=I18N.t('speaker.baekgu');
  const _spFalcon=I18N.t('speaker.blackfalcon');
  const lines=[
    {sp:I18N.t('ui.signalReceived'),tx:I18N.t('voidQ.staticShort'),fx:'static'},
    {sp:_spFalcon,tx:I18N.t('falconEnd.l1')},
    {sp:_spFalcon,tx:I18N.t('falconEnd.l2')},
    {sp:_spFalcon,tx:I18N.t('falconEnd.l3')},
    {sp:I18N.t('ui.signalReceived'),tx:I18N.t('voidQ.staticEnd'),fx:'static'},
    {sp:_spBk,tx:I18N.t('ui.victoryLine3',{nm:cmdName})},
    {sp:cmdName,tx:I18N.t('falconEnd.cmd')}
  ];
  let _idx=0;
  function _renderLine(){
    const l=lines[_idx];
    // 사용자 요청 (2026-06-06): 화자 비교에 한/영 양쪽 alias 포함 — 영문 모드에서도 정상 분기
    const isVoid=l.sp==='팔콘 스카우트'||l.sp==='Falcon Scout'
              ||l.sp==='블랙팔콘'||l.sp==='Blackfalcon'||l.sp==='Black Falcon'
              ||l.sp===I18N.t('ui.signalReceived');
    const isBaekgu=(l.sp=='백구'||l.sp=='Baekgu');
    const spColor=isVoid?'#cc66ff':isBaekgu?'var(--cyan)':'var(--gold)';
    const spIc=isVoid?'🌑':isBaekgu?'🐕':'⚑';
    const portrait=charPortraitHTML(l.sp,spIc,216,spColor);
    const bgGrad=isVoid
      ?'linear-gradient(135deg,rgba(60,0,90,.7),rgba(0,0,0,.95))'
      :isBaekgu
        ?'linear-gradient(135deg,rgba(0,180,200,.12),rgba(10,30,50,.7))'
        :'linear-gradient(135deg,rgba(255,215,0,.08),rgba(20,15,5,.7))';
    const borderColor=isVoid?'rgba(204,102,255,.6)':isBaekgu?'rgba(0,243,255,.45)':'rgba(255,215,0,.45)';
    const glitchAnim=l.fx==='static'?'animation:glitchShake .35s infinite':'';
    openModal(I18N.t('modal.blackshipFarewell'),
      `<div style="padding:14px;min-height:240px;background:${isVoid?'radial-gradient(circle at center,rgba(40,0,60,.4),rgba(0,0,0,.9))':'transparent'};border-radius:8px">
        <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;justify-content:center;margin-bottom:14px;padding:16px;background:${bgGrad};border:1.5px solid ${borderColor};border-radius:12px;box-shadow:0 0 24px ${borderColor};${glitchAnim}">
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
          ? {txt:I18N.t('ui.continueArrow'),fn:()=>{_idx++;_renderLine();},cls:'btn-gold'}
          : {txt:I18N.t('falconEnd.btnReward'),fn:()=>{closeModal();_grantVoidBossRewards();},cls:'btn-gold'}
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
  //  · combatState 또는 _questRef 가 일찍 사라진 경우를 대비해 G.quests['P30'] 에서 직접 조회 폴백
  let _questGrantedCr=0;
  let _qRef=(combatState&&combatState._questRef)||null;
  if(!_qRef){
    _qRef=(G.quests&&G.quests['P30']||[]).find(q=>q&&q.id==='q_void_boss');
  }
  if(_qRef&&_qRef.status!=='claimed'){
    const _mult=(typeof getQuestRepTierMult==='function')?getQuestRepTierMult(_qRef):1;
    _questGrantedCr=Math.round((_qRef.rewardCr||0)*_mult);
    G.credits+=_questGrantedCr;
    _qRef.status='claimed';
    notify(I18N.t('notify.hiddenCreditsGot',{cr:_questGrantedCr.toLocaleString(),mult:_mult}),'gold');
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
      id:'CAP_BLACKFALCON_'+Date.now()+'_'+i,
      catalogId:'BLACKFALCON',  // 도감 ship_BLACKFALCON과 매칭 + S10.png 이미지
      catId:'S10',
      nm:_capCount>1?I18N.t('boss.blackfalconNumbered',{idx:i+1,n:_capCount}):I18N.t('boss.blackfalcon'),
      tier:'신화',  // 신화급 슬롯: 6 rows × 8 cols = 48 파츠 슬롯
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
  if(!G.blueprints.LGD03){G.blueprints.LGD03=true;bpGranted.push(I18N.t('reward.bpName.LGD03'));}
  if(!G.blueprints.RB10){G.blueprints.RB10=true;bpGranted.push(I18N.t('reward.bpName.RB10'));}
  if(!G.blueprints.LGD01){G.blueprints.LGD01=true;bpGranted.push(I18N.t('reward.bpName.LGD01'));}
  if(!G.blueprints.LGD02){G.blueprints.LGD02=true;bpGranted.push(I18N.t('reward.bpName.LGD02'));}
  // 신화 파츠 6종 (보스/검은팔콘 보상 + 보이드의 창 MMV01 — 최종 블랙홀 결전에서 활용)
  const mythicParts=['MW01','MS01','MA01','ME01','RB10','MMV01'];
  const partsGranted=[];
  mythicParts.forEach(pid=>{
    const def=(typeof partById==='function')?partById(pid):(PARTS.find(p=>p.id===pid));
    const inv=G.inventory.find(i=>i.id===pid);
    if(inv)inv.qty++;else G.inventory.push({id:pid,qty:1});
    // 사용자 요청 (2026-06-06): 보상 모달의 파츠 이름을 표시 시점 언어로 표시
    partsGranted.push(def?(partDisplayNm(def)||def.nm):pid);
  });
  // ─── 보상 3: 보이드 크리스탈(VC) 대량 ───
  const _vcGrant=200;  // 사용자 요청 ×2 — 100→200 (신화 가챠 200회 가능)
  G.voidCrystal=(G.voidCrystal||0)+_vcGrant;
  // VE도 추가 (보이드 에센스 — 보이드 행성 투자/뽑기 보조 자원)
  // 사용자 요청 2026-06-09: 전투 VE 절반으로 조정 (10000 → 5000)
  const _veGrant=5000;
  G.voidEssence=(G.voidEssence||0)+_veGrant;
  // ─── 알림 + 백구 대사 ───
  const _luckMsg=_lucky?I18N.t('reward.luckyTwo'):'';
  notify(I18N.t('notify.blackfalconCaptured',{n:_capCount,luck:_luckMsg}),'pur');
  if(bpGranted.length>0)notify(I18N.t('notify.mythicBpAndParts',{bp:bpGranted.length,parts:mythicParts.length}),'gold');
  notify(`💎 VC +${_vcGrant} · ⚛️ VE +${_veGrant.toLocaleString()}`,'pur');
  baekgu(I18N.t('baekgu.voidGifts',{cap:_capCount,luck:_lucky?I18N.t('baekgu.luckyTwo'):'',bp:bpGranted.length,vc:_vcGrant,ve:_veGrant.toLocaleString()}));
  // ─── 획득 보고서 모달 ───
  if(typeof showAcquisitionReport==='function'){
    const items=[];
    // 나포 팔콘 — S10.png 함선 이미지
    _capturedShips.forEach(s=>{
      // 사용자 요청 (2026-06-06): 함선 이름 표시 시점 언어로 — shipDisplayNm 우회
      items.push({ic:'🏴',img:shipImgSrc({id:'S10',catId:'S10',tier:'소형'}),nm:(shipDisplayNm(s)||s.nm),type:I18N.t('reward.voidScout'),color:'#cc66ff',
        stats:`HP ${_capHP.toLocaleString()} · SH ${_capSH.toLocaleString()} · ATT ${_capATT}`,
        desc:I18N.t('reward.voidScoutDesc'),rarity:'mythic'});
    });
    // 설계도 — 사용자 요청 2026-06-09: 표준 설계도 아이콘 사용 (함선=BP01 / 파츠=BP02)
    const _bpIdByName={
      [I18N.t('reward.bpName.LGD03')]:'LGD03',
      [I18N.t('reward.bpName.RB10')]:'RB10',
      [I18N.t('reward.bpName.LGD01')]:'LGD01',
      [I18N.t('reward.bpName.LGD02')]:'LGD02'
    };
    bpGranted.forEach(nm=>{
      const _bpId=_bpIdByName[nm]||'';
      items.push({ic:'📜',img:bpImgSrc(_bpId),nm,type:I18N.t('reward.mythicBp'),color:'#ff66cc',stats:I18N.t('reward.craftable'),desc:I18N.t('reward.mythicBpDesc'),rarity:'mythic'});
    });
    // 신화 파츠 — 각 파츠 이미지 (mythicParts와 partsGranted는 같은 순서)
    partsGranted.forEach((nm,idx)=>{
      const pid=mythicParts[idx];
      items.push({ic:'✦',img:`img/parts/${pid}.png`,nm,type:I18N.t('reward.mythicPart'),color:'#ff88ff',stats:I18N.t('reward.invPlusOne'),desc:I18N.t('reward.mythicPartDesc'),rarity:'mythic'});
    });
    items.push({ic:'🌌',img:'img/commodities/G29.png',nm:I18N.t('reward.voidCrystal'),type:I18N.t('reward.mythicResource'),color:'#cc66ff',stats:I18N.t('reward.plusN',{n:_vcGrant}),desc:I18N.t('reward.vcDesc'),rarity:'mythic'});
    items.push({ic:'💜',img:'img/commodities/G19.png',nm:I18N.t('reward.voidEssence'),type:I18N.t('reward.riftResource'),color:'#99ffcc',stats:`+${_veGrant.toLocaleString()}`,desc:I18N.t('reward.veDesc')});
    if(_questGrantedCr>0){
      items.unshift({ic:'💰',img:'img/ui/credit.png',nm:I18N.t('reward.hiddenQuestPrize'),type:I18N.t('reward.creditsLabel'),color:'var(--gold)',stats:I18N.t('reward.creditsPrefix',{n:_questGrantedCr.toLocaleString()}),desc:I18N.t('reward.hiddenQuestDesc')});
    }
    showAcquisitionReport({
      title:I18N.t('reward.hiddenBossTitle'),
      subtitle:I18N.t('ui.falconCaptureSummary',{cap:_capCount,luck:_lucky?I18N.t('ui.luckySuffix'):'',bp:bpGranted.length,vc:_vcGrant}),
      items,color:'#cc66ff',sfx:null,
      imgScale:0.7,   // 사용자 요청 2026-06-15: 보상 이미지 70% 크기
      rewardWide:true, // 가로 +50% · 세로 -30% 모달 (버튼 노출 보장)
      congrats:I18N.t('reward.voidApproval')
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
  // 사용자 요청 (2026-06-07): 전체 미완료 퀘스트(시나리오·영웅·일반·보이드) 합산하여 최대 6개 한도
  // 한도 도달 시 추가 spawn 차단 — 순차 진행 유도
  var _active=G.quests[pid].filter(function(q){return q && q.status!=='claimed';}).length;
  if(_active>=QUEST_MAX_AVAILABLE)return;
  var room=QUEST_MAX_AVAILABLE-_active;
  var addCount=Math.min(room,QUEST_SPAWN_PER_TURN_MIN+Math.floor(Math.random()*(QUEST_SPAWN_PER_TURN_MAX-QUEST_SPAWN_PER_TURN_MIN+1)));
  var added=0,startIdx=G.quests[pid].length;
  for(var i=0;i<addCount;i++){
    var q=_generateSingleQuest(pid,startIdx+i);
    if(q){G.quests[pid].push(q);added++;}
  }
  if(added>0)notify(I18N.t('notify.newQuestsPosted',{added,total:_active+added,max:QUEST_MAX_AVAILABLE}),'ok');
}
function acceptQuest(pid,idx){
  generateQuests(pid);
  var q=G.quests[pid]&&G.quests[pid][idx];if(!q||q.status!=='available')return;
  // 명성 기반 고VE 퀘스트 수락 제한 (히든 퀘스트는 제외 — 보상 VE가 매우 크지만 의도된 콘텐츠)
  const _qrep=G.reputation||0;
  if(q.type!=='void_boss'){
    if(q.rewardVe>=40&&_qrep<200){notify(I18N.t('notify.veQuestNeedRep200',{ve:q.rewardVe,rep:_qrep}),'err');return;}
    if(q.rewardVe>=30&&_qrep<100){notify(I18N.t('notify.veQuestNeedRep100',{ve:q.rewardVe,rep:_qrep}),'err');return;}
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
  if(q.type==='gather')notify(I18N.t('notify.questAcceptGather',{n:q.required}),'ok');
  else if(q.type==='explore')notify(I18N.t('notify.exploreAccept'),'ok');
  else if(q.type==='delivery'){var tnm=(PLANET_DEF.find(function(p){return p.id===q.targetId;})||{nm:I18N.t('notify.adjacentPlanet')}).nm;notify(I18N.t('notify.questAcceptDelivery',{nm:tnm}),'ok');}
  else if(q.type==='buy'){const _cn=COMMODITIES.find(c=>c.id===q.targetCommId)?.nm||q.targetCommId;notify(I18N.t('notify.questAcceptBuy',{nm:_cn,n:q.required}),'ok');}
  else if(q.type==='story_quest'){
    const _obj=(q.objectives&&q.objectives[0])||{};
    const _lbl=(typeof _obj.label==='object')?(_obj.label.ko||_obj.label.en||''):(_obj.label||'');
    notify('✓ '+(q.nm||'시나리오 퀘')+' 수락 — '+_lbl,'pur');
  }
  else notify(I18N.t('notify.questAcceptCombat'),'ok');
  // 사용자 보고 2026-06-07: 수락 직후 이미 보유한 아이템으로 즉시 완료 처리되도록 라이브 평가
  try{if(q.type==='story_quest'&&typeof tickStoryQuests==='function')tickStoryQuests();}catch(e){}
  saveGame(true);
  if(_fromTavern)rerenderTab(renderTavernView);
  else rerenderTab(renderQuestTab);
}
function startVoidBossCombat(questRef){
  const pd={id:'P30',nm:I18N.t('planet.blackfalconLoc'),ring:5,void:true,f:'F07'};
  // ─── 보이드 함대 능력치 스케일링 (사용자 명세 v3) ───
  //   · 적 함대 총 HP  = 아군 함대 HP × 2     (이전 ×500 → 대폭 완화)
  //   · 적 함대 총 ATT = 아군 함대 ATT × 1.1  (이전 ×10  → 균형 도전)
  //   · 적 함대 총 SH  = 아군 함대 SH × 2     (HP 비율과 동일)
  //   · 호위 15척 : 보스 1척 = 1 : 4 비율 (보스가 호위 1척의 4배)
  //   · 분배 단위 = 15 + 4 = 19 unit
  //     예시 (아군 23M HP / 77K ATT):
  //       총 적 = 46M HP / 84.7K ATT
  //       호위 1척 = 46M/19 ≈ 2.42M HP / 4.46K ATT
  //       보스 1척 = 호위 × 4 ≈ 9.7M HP / 17.8K ATT
  const VOID_FLEET_SIZE=16;
  const _fp=(typeof calcFleetTotalPower==='function')?calcFleetTotalPower():{hp:0,atk:0,sh:0};
  const _totalHP =Math.max(VOID_BOSS.maxHP, Math.round((_fp.hp ||0)*2));
  const _totalATT=Math.max(VOID_BOSS.ATT,   Math.round((_fp.atk||0)*1.1));
  const _totalSH =Math.max(VOID_BOSS.maxSH, Math.round((_fp.sh ||0)*2));
  const _UNIT=19;  // 호위 15 × 1 + 보스 1 × 4
  const _escortHP=Math.round(_totalHP/_UNIT);
  const _escortATT=Math.round(_totalATT/_UNIT);
  const _escortSH=Math.round(_totalSH/_UNIT);
  const _flagHP=_escortHP*4;
  const _flagATT=_escortATT*4;
  const _flagSH=_escortSH*4;
  // ── 진형(열): 0=보이드 소형 / 1=중형 / 2=대형 / 3=블랙팔콘 부대+본체(최후방) ──
  //   본체는 enemies[0] 유지(기존 페이즈 로직 호환). HP ×10(현 전투 한정), 호위 전멸 전까지 무적.
  const enemies=[];
  enemies.push({...VOID_BOSS,id:'VOID_FALCON_1',nm:'🌑 블랙팔콘 ✦신화',_nmKey:'enemy.blackfalconMythic',tier:'신화',isEnemy:true,
    hp:_flagHP*10,maxHP:_flagHP*10,HP:_flagHP*10,sh:_flagSH,maxSH:_flagSH,ATT:_flagATT,
    DEF:800,armorTier:60,shieldTier:60,voidBoss:true,_formationCol:3,_invincible:true});
  // 4열: 블랙팔콘 부대 3척 (신화 호위 — 본체와 같은 열)
  for(let i=0;i<3;i++){enemies.push({...VOID_BOSS,id:'VOID_FALCON_E'+(i+1),nm:'🌑 블랙팔콘 부대 '+(i+1),_nmKey:'enemy.blackfalconSquad',_nmKeyParams:{n:i+1},tier:'대형',isEnemy:true,
    hp:_escortHP,maxHP:_escortHP,HP:_escortHP,sh:_escortSH,maxSH:_escortSH,ATT:_escortATT,
    DEF:450,armorTier:48,shieldTier:48,voidBoss:false,_formationCol:3});}
  // 3열: 보이드 대형 전투선 3척 (F07 보이드 함선 외형)
  for(let i=0;i<3;i++){const _h=Math.round(_escortHP*0.8),_s=Math.round(_escortSH*0.7);
    enemies.push({id:'VOID_L'+(i+1),nm:'보이드 대형함 '+(i+1),_nmKey:'enemy.voidLarge',_nmKeyParams:{n:i+1},tier:'대형',isEnemy:true,catalogId:'F07_L',catId:'F07_L',_useCatalogImg:true,
      hp:_h,maxHP:_h,HP:_h,sh:_s,maxSH:_s,ATT:Math.round(_escortATT*0.8),INT:300,TEC:200,LOY:0,DEF:300,armorTier:32,shieldTier:32,_formationCol:2});}
  // 2열: 보이드 중형 순양함 4척
  for(let i=0;i<4;i++){const _h=Math.round(_escortHP*0.5),_s=Math.round(_escortSH*0.5);
    enemies.push({id:'VOID_M'+(i+1),nm:'보이드 순양함 '+(i+1),_nmKey:'enemy.voidCruiser',_nmKeyParams:{n:i+1},tier:'중형',isEnemy:true,catalogId:'F07_M',catId:'F07_M',_useCatalogImg:true,
      hp:_h,maxHP:_h,HP:_h,sh:_s,maxSH:_s,ATT:Math.round(_escortATT*0.6),INT:180,TEC:120,LOY:0,DEF:160,armorTier:20,shieldTier:20,_formationCol:1});}
  // 1열: 보이드 소형 정찰선 5척
  for(let i=0;i<5;i++){const _h=Math.round(_escortHP*0.3),_s=Math.round(_escortSH*0.3);
    enemies.push({id:'VOID_S'+(i+1),nm:'보이드 정찰선 '+(i+1),_nmKey:'enemy.voidScout',_nmKeyParams:{n:i+1},tier:'소형',isEnemy:true,catalogId:'F07_S',catId:'F07_S',_useCatalogImg:true,
      hp:_h,maxHP:_h,HP:_h,sh:_s,maxSH:_s,ATT:Math.round(_escortATT*0.4),INT:100,TEC:80,LOY:0,DEF:80,armorTier:10,shieldTier:10,_formationCol:0});}
  const players=G.fleet.map(s=>{const st=getShipStats(s);const _wpn=PARTS.find(p=>p.cat==='weapon'&&(s.parts||[]).includes(p.id));const _wt=_wpn?(_wpn.tier||1):1;const _wtype=_wpn?(_wpn.wtype||'laser'):'laser';const _wrar=_wpn?(_wpn.rarity||''):'';const _shp=PARTS.find(p=>p.cat==='shield'&&(s.parts||[]).includes(p.id));const _shTier=_shp?(_shp.tier||0):0;const _arp=PARTS.find(p=>p.cat==='armor'&&(s.parts||[]).includes(p.id));const _arTier=_arp?(_arp.tier||0):0;return{...s,isEnemy:false,hp:s.hp,maxHP:st.HP,sh:s.sh,maxSH:st.maxSH,ATT:st.ATT,INT:st.INT,TEC:st.TEC,DEF:st.DEF||0,wtype:_wtype,wpnTier:_wt,wpnRarity:_wrar,shieldTier:_shTier,armorTier:_arTier};});
  combatState={players,enemies,turn:0,done:false,log:[],planetDef:pd,isBoss:false,isVoidBoss:true,_questRef:questRef,_rndSeed:Date.now()%9999,_entranceT:0,_entranceDone:false,_planetId:'P30'};
  cbZoom=0.5;  // 4열 진형이 한 화면에 들어오도록 줌 축소 (휠로 조절 가능)
  renderCombatView(document.getElementById('hub-body'));
  setHubNav('combat');updateHUD();
  _cbEffects=[];_unitPos={};if(_cbAnimReq){cancelAnimationFrame(_cbAnimReq);_cbAnimReq=null;}
  combatState._sunsinUsed=false;
  combatState._entranceT=1;combatState._entranceDone=true;
  sfxAlert();try{AudioMgr.playBgm('boss');}catch(e){}_preloadCombatImages();requestAnimationFrame(()=>{initCombatCanvas();const t=document.getElementById('cb-title');if(t)t.textContent=I18N.t('combat.hiddenBlackfalcon');setTimeout(runCombatTurn,600);});
}
// 명성 티어별 퀘스트 보상 배율: VE>=40(명성200) ×3, VE>=30(명성100) ×2, 그 외 ×1
function getQuestRepTierMult(q){
  if(!q||typeof q.rewardVe!=='number')return 1;
  if(q.rewardVe>=40)return 3;
  if(q.rewardVe>=30)return 2;
  return 1;
}

// ─── 전역 노출 (자동 생성) ─────────────────────────────────────
try{window.QUEST_TEMPLATES=QUEST_TEMPLATES;}catch(e){}
try{window.VOID_BOSS_ID=VOID_BOSS_ID;}catch(e){}
try{window.VOID_BOSS=VOID_BOSS;}catch(e){}
try{window._allVoidOwned=_allVoidOwned;}catch(e){}
try{window.QUEST_MAX_AVAILABLE=QUEST_MAX_AVAILABLE;}catch(e){}
try{window.QUEST_SPAWN_PER_TURN_MIN=QUEST_SPAWN_PER_TURN_MIN;}catch(e){}
try{window.QUEST_SPAWN_PER_TURN_MAX=QUEST_SPAWN_PER_TURN_MAX;}catch(e){}
try{window._generateSingleQuest=_generateSingleQuest;}catch(e){}
try{window.generateQuests=generateQuests;}catch(e){}
try{window.showVoidBossIntro=showVoidBossIntro;}catch(e){}
try{window.showVoidBossOutro=showVoidBossOutro;}catch(e){}
try{window._grantVoidBossRewards=_grantVoidBossRewards;}catch(e){}
try{window.tickQuestSpawn=tickQuestSpawn;}catch(e){}
try{window.acceptQuest=acceptQuest;}catch(e){}
try{window.startVoidBossCombat=startVoidBossCombat;}catch(e){}
try{window.getQuestRepTierMult=getQuestRepTierMult;}catch(e){}
console.log('[quest-gen] Loaded — 16 decls exposed');
})();
