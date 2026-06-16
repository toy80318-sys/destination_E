// ═══════════════════════════════════════════════════════════════════
// DESTINATION EARTH — 퀘스트 UI 모듈
//   · game.js 에서 분할 (사용자 요청 2026-06-09)
//   · 함수: _questTypeImg / _questTypeImgGeneric / _questThumbHtml /
//           submitBuyQuest / _renderQuestCard / renderQuestTab
//
// 의존 글로벌 (window.*): G, I18N, PLANET_DEF, COMMODITIES, PARTS,
//   HEROES, _GAME_VER, notify, baekgu, openModal, closeModal,
//   takeLoan, rerenderTab, spawnPhasedQuests, generateQuests,
//   tickStoryQuests, _storyQuestCurrentProgress, partDisplayNm,
//   commDisplayNm, shipDisplayNm, planetBgSrc, planetImgSrc,
//   getQuestRepTierMult, acceptQuest, completeQuest, doGatherSearch,
//   imgOrEmoji, SHIP_CATALOG, SPECIAL_CARGO_PARTS
// ═══════════════════════════════════════════════════════════════════
(function(){
if(typeof window==='undefined')return;
if(window._QUEST_UI_LOADED)return;
window._QUEST_UI_LOADED=true;

const _QUEST_TYPE_IMG_ALIAS={ buy:'delivery' };
function _questTypeImg(q){
  const t0=q.type||'combat';
  const t=_QUEST_TYPE_IMG_ALIAS[t0]||t0;
  const pd=PLANET_DEF.find(p=>p.id===q.planetId);
  const f=pd?.f;
  const _v=(window._GAME_VER)?('?v='+encodeURIComponent(window._GAME_VER)):'';
  return (f?'img/quests/'+t+'_'+f+'.png':'img/quests/'+t+'.png')+_v;
}
function _questTypeImgGeneric(q){
  const t0=q.type||'combat';
  const t=_QUEST_TYPE_IMG_ALIAS[t0]||t0;
  const _v=(window._GAME_VER)?('?v='+encodeURIComponent(window._GAME_VER)):'';
  return 'img/quests/'+t+'.png'+_v;
}
// 퀘스트 썸네일: 팩션별 → 기본 팩션(F01) → generic → 이모지 순으로 폴백
// 사용자 요청 2026-06-08: buy(특산물 매수의뢰·거래보조) 카드 좌측 아이콘은 항상 거래상인 이미지 보장.
//   buy 타입은 행성 팩션 미일치 시에도 delivery_F01.png(수퍼비아 거래상인)로 최종 폴백.
function _questThumbHtml(q,size){
  size=size||44;
  // 퀘스트 전용 커스텀 썸네일(q.img) 우선 — 예: 이순신 합류(영웅 초상+행성 배경 합성). 사용자 요청 2026-06-13
  if(q&&q.img){
    const _cv=(window._GAME_VER)?('?v='+encodeURIComponent(window._GAME_VER)):'';
    const _cfb=q.ic||'⚔️';
    return `<div style="width:${size}px;height:${size}px;flex-shrink:0;position:relative;display:flex;align-items:center;justify-content:center;border-radius:6px">
      <div class="fb" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:${Math.round(size*0.5)}px;pointer-events:none">${_cfb}</div>
      <img src="${q.img}${_cv}" alt="" loading="lazy" decoding="async" style="position:relative;width:100%;height:100%;object-fit:cover;z-index:1;border-radius:6px"
        onload="var fb=this.parentNode.querySelector('.fb');if(fb)fb.style.display='none';"
        onerror="this.style.display='none';var fb=this.parentNode.querySelector('.fb');if(fb)fb.style.display='flex';">
    </div>`;
  }
  // 영웅 영입 퀘스트(8영웅): 해당 영웅 초상(hero01~08)을 썸네일로 표시. 사용자 요청 2026-06-14
  if(q&&q.heroId){
    const _hv=(window._GAME_VER)?('?v='+encodeURIComponent(window._GAME_VER)):'';
    const _hsrc=(typeof HERO_PORTRAITS_BY_ID!=='undefined'&&HERO_PORTRAITS_BY_ID[q.heroId])||('img/chars/hero'+String(q.heroId).slice(1)+'.png');
    const _hfb=q.ic||(typeof HEROES!=='undefined'&&HEROES[q.heroId]&&HEROES[q.heroId].ic)||'⭐';
    return `<div style="width:${size}px;height:${size}px;flex-shrink:0;position:relative;display:flex;align-items:center;justify-content:center;border-radius:6px;border:1.5px solid var(--gold);overflow:hidden">
      <div class="fb" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:${Math.round(size*0.5)}px;pointer-events:none">${_hfb}</div>
      <img src="${_hsrc}${_hv}" alt="" loading="lazy" decoding="async" style="position:relative;width:100%;height:100%;object-fit:cover;z-index:1"
        onload="var fb=this.parentNode.querySelector('.fb');if(fb)fb.style.display='none';"
        onerror="this.style.display='none';var fb=this.parentNode.querySelector('.fb');if(fb)fb.style.display='flex';">
    </div>`;
  }
  const facSrc=_questTypeImg(q);
  const genSrc=_questTypeImgGeneric(q);
  const _ver=(window._GAME_VER)?('?v='+encodeURIComponent(window._GAME_VER)):'';
  // buy 타입은 기본 팩션 거래상인 이미지를 한 단계 더 폴백 (delivery_F01.png 항상 존재)
  const t0=q.type||'combat';
  const _aliasedT=_QUEST_TYPE_IMG_ALIAS[t0]||t0;
  const defFacSrc=(t0==='buy')?('img/quests/'+_aliasedT+'_F01.png'+_ver):genSrc;
  const fbEm=q.ic||'⚔️';
  return `<div style="width:${size}px;height:${size}px;flex-shrink:0;position:relative;display:flex;align-items:center;justify-content:center;border-radius:6px">
    <div class="fb" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:${Math.round(size*0.5)}px;pointer-events:none">${fbEm}</div>
    <img src="${facSrc}" data-step="0" data-def="${defFacSrc}" data-gen="${genSrc}" alt="" loading="lazy" decoding="async" style="position:relative;width:100%;height:100%;object-fit:contain;z-index:1;border-radius:6px"
      onload="var fb=this.parentNode.querySelector('.fb');if(fb)fb.style.display='none';"
      onerror="if(this.dataset.step==='0'){this.dataset.step='1';this.src=this.dataset.def;}else if(this.dataset.step==='1'){this.dataset.step='2';this.src=this.dataset.gen;}else{this.style.display='none';var fb=this.parentNode.querySelector('.fb');if(fb)fb.style.display='flex';}">
  </div>`;
}
// 특산물 매수 의뢰 보고 — 화물칸에서 N개 차감 후 status='done' 처리
function submitBuyQuest(pid,idx){
  const q=G.quests[pid]&&G.quests[pid][idx];
  if(!q||q.status!=='active'||q.type!=='buy')return;
  const have=sumQtyById(G.cargo,q.targetCommId);
  if(have<q.required){notify(I18N.t('notify.qtyShort',{have,need:q.required}),'err');return;}
  // 화물에서 N개 차감 (여러 슬롯 합산)
  let toRemove=q.required;
  for(let i=0;i<G.cargo.length&&toRemove>0;i++){
    const slot=G.cargo[i];
    if(slot.id!==q.targetCommId)continue;
    const take=Math.min(slot.qty,toRemove);
    slot.qty-=take;toRemove-=take;
  }
  G.cargo=G.cargo.filter(s=>s.qty>0);
  q.status='done';q.progress=q.required;
  const _cn=COMMODITIES.find(c=>c.id===q.targetCommId)?.nm||q.targetCommId;
  notify(I18N.t('notify.deliveryQty',{nm:_cn,n:q.required}),'gold');
  baekgu(I18N.t('baekgu.buyQuestComplete'));
  saveGame(true);
  rerenderTab(renderQuestTab);
}

function _renderQuestCard(q,pid,qlist){
  const realIdx=qlist.indexOf(q);
  const stCfg={available:{bg:'var(--card)',bd:'var(--bdr)',col:'var(--dim)',lbl:I18N.t('qcard.statAvail')},active:{bg:'rgba(0,243,255,.05)',bd:'var(--cyan)',col:'var(--cyan)',lbl:I18N.t('qcard.statActive')},done:{bg:'rgba(46,204,113,.06)',bd:'var(--green)',col:'var(--green)',lbl:I18N.t('qcard.statDone')},claimed:{bg:'rgba(80,80,80,.1)',bd:'#444',col:'#555',lbl:I18N.t('qcard.statClaimed')}};
  let sc=stCfg[q.status]||stCfg.available;
  // 보이드 히든 퀘스트 — 퍼플 글로우 특별 카드
  const isVoidQuest=q.type==='void_boss';
  if(isVoidQuest){
    const _vLbl={available:I18N.t('qcard.hiddenAvail'),active:I18N.t('qcard.hiddenActive'),done:I18N.t('qcard.hiddenDone'),claimed:I18N.t('qcard.hiddenClaimed')}[q.status]||I18N.t('qcard.hiddenLabel');
    sc={
      bg:'linear-gradient(135deg,rgba(80,0,140,.20),rgba(15,0,30,.85))',
      bd:'#cc66ff',
      col:'#cc66ff',
      lbl:_vLbl
    };
  }
  // 영웅 퀘스트 — 보라색 + 금테 글로우 (사용자 요청 2026-06-07)
  const isHeroQuest=q.type==='hero_quest';
  if(isHeroQuest){
    const _isEn=(typeof I18N!=='undefined'&&I18N.getLang&&I18N.getLang()==='en');
    const _hLbl={
      available:_isEn?'[SPECIAL]':'[특별]',
      active:_isEn?'[INVESTIGATING]':'[추적 중]',
      done:_isEn?'[READY TO RECRUIT]':'[영입 가능]',
      claimed:_isEn?'[RECRUITED]':'[영입 완료]'
    }[q.status]||(_isEn?'[SPECIAL]':'[특별]');
    sc={
      bg:'linear-gradient(135deg,rgba(170,80,255,.22),rgba(40,10,80,.85))',
      bd:'#cc88ff',
      col:'#e0b3ff',
      lbl:_hLbl
    };
  }
  // 시나리오 메인 퀘스트 (story_quest) — 보라색 카테고리별 변형
  const isStoryQuest=q.type==='story_quest';
  if(isStoryQuest){
    const _isEn=(typeof I18N!=='undefined'&&I18N.getLang&&I18N.getLang()==='en');
    const _cat=q.category||'main';
    const _catLbl={
      main:_isEn?'MAIN':'메인',
      sub :_isEn?'SUB' :'서브',
      hidden:_isEn?'HIDDEN':'히든'
    }[_cat]||(_isEn?'MAIN':'메인');
    const _statLbl={
      available:_isEn?'AVAIL':'수락 가능',
      active   :_isEn?'ACTIVE':'진행 중',
      done     :_isEn?'CLAIM':'보상 받기',
      claimed  :_isEn?'DONE':'완료'
    }[q.status]||(_isEn?'AVAIL':'수락 가능');
    sc={
      bg:'linear-gradient(135deg,rgba(170,80,255,.22),rgba(40,10,80,.85))',
      bd:'#cc88ff',
      col:'#e0b3ff',
      lbl:'['+_catLbl+'] '+_statLbl
    };
    // 잠긴 퀘스트: 옅게
    if(q.locked){
      sc.bg='linear-gradient(135deg,rgba(80,80,100,.18),rgba(20,20,30,.85))';
      sc.bd='#666';
      sc.col='#aaa';
      sc.lbl='🔒 '+_catLbl;
    }
  }
  let progHTML='';
  if(q.type==='gather'&&q.status==='active'){
    const pct=Math.round((q.progress/q.required)*100);
    progHTML=`<div style="margin:5px 0"><div style="display:flex;justify-content:space-between;font-size:11px;color:var(--dim);margin-bottom:2px"><span>${I18N.t('ui.scanProgress')}</span><span>`+q.progress+'/'+q.required+'</span></div><div style="height:4px;background:var(--panel);border-radius:3px;overflow:hidden"><div style="width:'+pct+'%;height:100%;background:var(--cyan);border-radius:3px;transition:width .3s"></div></div></div>';
  }
  // 시나리오(story_quest) — 진행도 표시 (사용자 보고 2026-06-07)
  if(q.type==='story_quest'&&q.status==='active'){
    // 라이브 평가 — 보유량/카운터를 즉시 반영 (turn end 까지 기다릴 필요 없음)
    let _cur=q.progress||0;
    try{if(typeof _storyQuestCurrentProgress==='function')_cur=Math.min(q.required,_storyQuestCurrentProgress(q));}catch(e){}
    const pct2=Math.round((_cur/Math.max(1,q.required))*100);
    const _obj0=(q.objectives&&q.objectives[0])||{};
    const _objLbl=_obj0.label||I18N.t('qcard.statActive')||'진행';
    progHTML='<div style="margin:5px 0"><div style="display:flex;justify-content:space-between;font-size:11px;color:#e0b3ff;margin-bottom:2px"><span>'+_objLbl+'</span><span>'+_cur+'/'+q.required+'</span></div><div style="height:4px;background:var(--panel);border-radius:3px;overflow:hidden"><div style="width:'+pct2+'%;height:100%;background:#cc88ff;border-radius:3px;transition:width .3s"></div></div></div>';
  }
  if(q.type==='delivery'&&q.status==='active'){
    const tnm=(PLANET_DEF.find(function(p){return p.id===q.targetId;})||{nm:I18N.t('qcard.dest')}).nm;
    progHTML='<div style="font-size:11px;color:var(--cyan);margin:3px 0">'+I18N.t('qcard.travelComplete',{nm:tnm})+'</div>';
  }
  if(q.type==='buy'&&q.status==='active'){
    const _have=sumQtyById(G.cargo,q.targetCommId);
    const _cn=COMMODITIES.find(c=>c.id===q.targetCommId)?.nm||q.targetCommId;
    const _pct=Math.min(100,Math.round(_have/q.required*100));
    progHTML='<div style="margin:5px 0"><div style="display:flex;justify-content:space-between;font-size:11px;color:var(--dim);margin-bottom:2px"><span>'+I18N.t('qcard.buyHoldingLabel',{nm:_cn})+'</span><span>'+_have+'/'+q.required+'</span></div><div style="height:4px;background:var(--panel);border-radius:3px;overflow:hidden"><div style="width:'+_pct+'%;height:100%;background:#ff8844;border-radius:3px;transition:width .3s"></div></div></div>';
  }
  // ── 카드 액션 버튼: 클릭하기 좋게 2배 확대 + 카드 우측 하단 고정 ──
  // 공통 스타일 (font-size:18px, padding:8px 18px → 기존 대비 약 2배)
  const _BTN_STYLE='font-size:14px;padding:6px 14px;font-weight:bold;line-height:1.15;min-width:70px;border-radius:6px;letter-spacing:.4px';
  const buySubmitBtn=(q.type==='buy'&&q.status==='active')?(()=>{
    const _have=sumQtyById(G.cargo,q.targetCommId);
    const _ok=_have>=q.required;
    return '<button class="btn" style="'+_BTN_STYLE+';background:rgba(255,136,68,'+(_ok?'.2':'.05')+');border:1px solid #ff8844;color:#ffaa66'+(_ok?';animation:pulse 1.5s infinite':';opacity:.5')+'" '+(_ok?'':'disabled')+' onclick="submitBuyQuest(\''+pid+'\','+realIdx+')">'+I18N.t('qcard.reportBtn')+'</button>';
  })():'';
  const gatherSearchBtn=(q.type==='gather'&&q.status==='active')?'<button class="btn" style="'+_BTN_STYLE+';background:rgba(0,255,140,.12);border:1px solid rgba(0,255,140,.6);color:var(--green);animation:pulse 2s infinite" onclick="doGatherSearch()">'+I18N.t('qcard.searchBtn')+'</button>':'';
  const combatSearchBtn=(q.type==='combat'&&q.status==='active'&&(q.nm.includes('치크스')||q.nm.toLowerCase().includes('chiks')))?'<button class="btn" style="'+_BTN_STYLE+';background:rgba(139,0,255,.14);border:1px solid var(--purple);color:#cc88ff;animation:pulse 2s infinite" onclick="doGatherSearch()">'+I18N.t('qcard.searchBtn')+'</button>':'';
  const _qrep=G.reputation||0;
  const _qveLock=(q.rewardVe>=40&&_qrep<50)||(q.rewardVe>=30&&_qrep<10);
  const _qlockMsg=q.rewardVe>=40?I18N.t('qcard.fameReq200',{n:_qrep}):I18N.t('qcard.fameReq100',{n:_qrep});
  const _repMult=getQuestRepTierMult(q);
  const _shownCr=q.rewardCr*_repMult,_shownVe=q.rewardVe*_repMult;
  const _multBadge=_repMult>1?'<span style="font-size:11px;color:var(--gold);font-weight:bold">×'+_repMult+'</span>':'';
  let actionHTML='';
  if(q.status==='available'){
    actionHTML=_qveLock
      ? '<span style="font-size:13px;color:var(--purple)">🔒 '+_qlockMsg+'</span>'
      : '<button class="btn btn-green" style="'+_BTN_STYLE+'" onclick="acceptQuest(\''+pid+'\','+realIdx+')">'+I18N.t('qcard.acceptBtn')+'</button>';
  } else if(q.status==='done'){
    actionHTML='<button class="btn btn-gold" style="'+_BTN_STYLE+'" onclick="completeQuest(\''+pid+'\','+realIdx+')">'+I18N.t('quest.claimReward',{cr:_shownCr.toLocaleString()})+'</button>';
  }
  actionHTML=gatherSearchBtn+combatSearchBtn+buySubmitBtn+actionHTML;
  // 종류별 색상 (이미지 폴백 배경)
  const typeCol=q.type==='combat'?'rgba(255,59,59,.12)':q.type==='delivery'?'rgba(0,243,255,.12)':q.type==='gather'?'rgba(0,255,140,.12)':q.type==='explore'?'rgba(212,175,55,.15)':'rgba(180,100,255,.15)';
  const typeBdr=q.type==='combat'?'rgba(255,80,80,.4)':q.type==='delivery'?'rgba(0,243,255,.4)':q.type==='gather'?'rgba(0,255,140,.4)':q.type==='explore'?'rgba(212,175,55,.4)':'rgba(180,100,255,.4)';
  // 시나리오 퀘스트(story_quest) — 행성 배경 + 행성 이미지 + 인물 이미지 합성 히어로 썸네일
  // 사용자 요청 2026-06-07: "이미지는 행성이미지, 행성 배경이미지, 인물이미지로 넣어줘. 백구이미지활용해줘."
  let thumb;
  // 모든 퀘스트 — 행성배경 + 행성 + 관련 인물(스토리 NPC / 영웅 / 팩션 NPC) 합성 히어로 썸네일.
  //   · 사용자 요청 2026-06-16: "모든 퀘스트는 해당 관련 인물의 이미지가 들어가도록" — 일반 사이드 퀘스트도
  //     기존 작은 종류 아이콘 대신 스토리 퀘스트와 동일한 합성 썸네일(행성+팩션 NPC)로 통일.
  //   · 단, q.img(이순신 yi_join 등 전용 합성)는 _questThumbHtml 경로 유지.
  if(!q.img){
    const _ver=(typeof window!=='undefined'&&window._GAME_VER)?('?v='+encodeURIComponent(window._GAME_VER)):'';
    const _pid=q.planetId||pid;
    const _bgSrc=(typeof planetBgSrc==='function')?planetBgSrc(_pid):('img/bg/'+_pid+'.jpg'+_ver);
    const _planetSrc=(typeof planetImgSrc==='function')?planetImgSrc(_pid):('img/planets/'+_pid+'.png'+_ver);
    // 관련 인물 이미지 경로 — NPC 영웅(hero01~09)·백구·사령관·Phase NPC·팩션 NPC 라우팅
    let _charSrc, _charFb='';
    if(isHeroQuest && q.heroId && !q.npcKey){
      // 영웅 영입 퀘스트 — 해당 영웅 초상(hero01~09)
      _charSrc='img/chars/hero'+String(q.heroId).slice(1)+'.png'+_ver;
    } else if(q.npcKey && /^(delivery|gather|combat|explore)_F0[1-7]$/.test(q.npcKey)){
      _charSrc='img/quests/'+q.npcKey+'.png'+_ver;
    } else if(q.npcKey==='commander'){
      // 성별·외형 자동 (commander_m1 기본)
      const _g=(G&&G.profile&&G.profile.gender==='female')?'f':'m';
      const _outfit=(G&&G.profile&&G.profile.outfitIdx)||1;
      _charSrc='img/chars/commander_'+_g+_outfit+'.png'+_ver;
    } else if(q.npcKey){
      _charSrc='img/chars/'+q.npcKey+'.png'+_ver;
    } else {
      // 일반 사이드 퀘스트(전투·운송·채집·탐사) — 행성 팩션의 종류별 NPC를 관련 인물로 사용
      _charSrc=_questTypeImg(q);              // 팩션별 (이미 ?v= 포함)
      _charFb=_questTypeImgGeneric(q);        // 폴백: generic 종류 이미지
    }
    const _charErr=_charFb
      ? 'if(this.dataset.fb){this.src=this.dataset.fb;this.dataset.fb=\'\';}else{this.style.display=\'none\';}'
      : 'this.style.display=\'none\';';
    thumb=
      '<div style="width:140px;height:108px;flex-shrink:0;border:1.5px solid '+typeBdr+';border-radius:8px;overflow:hidden;position:relative;background:#0a0a18">'
        +'<img src="'+_bgSrc+'" alt="" loading="lazy" decoding="async" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.55" onerror="this.style.display=\'none\'">'
        +'<div style="position:absolute;inset:0;background:linear-gradient(135deg,'+(isStoryQuest||isHeroQuest?'rgba(180,100,255,.18)':typeCol)+',rgba(0,0,0,.35) 60%,rgba(0,0,0,.65))"></div>'
        +'<img src="'+_planetSrc+'" alt="" loading="lazy" decoding="async" style="position:absolute;left:6px;top:6px;width:44px;height:44px;object-fit:contain;filter:drop-shadow(0 0 6px rgba(0,243,255,.6))" onerror="this.style.display=\'none\'">'
        +'<img src="'+_charSrc+'" data-fb="'+_charFb+'" alt="" loading="lazy" decoding="async" style="position:absolute;right:0;bottom:0;width:78px;height:78px;object-fit:contain;filter:drop-shadow(0 2px 6px rgba(0,0,0,.7))" onerror="'+_charErr+'">'
        +'<div style="position:absolute;left:6px;bottom:4px;font-size:10px;color:'+(isStoryQuest||isHeroQuest?'#e0b3ff':'#bfe9ff')+';background:rgba(0,0,0,.55);padding:1px 6px;border-radius:8px;font-weight:bold;letter-spacing:.5px">'+_pid+'</div>'
      +'</div>';
  } else {
    thumb='<div style="width:92px;height:92px;flex-shrink:0;background:'+typeCol+';border:1px solid '+typeBdr+';border-radius:8px;display:flex;align-items:center;justify-content:center;overflow:hidden">'
      +_questThumbHtml(q,88)
      +'</div>';
  }
  // 보이드 히든 퀘스트 — 보라색 글로우 + 펄스 강조 (특별 카드)
  const _voidStyle=isVoidQuest
    ?';box-shadow:0 0 16px rgba(204,102,255,.45),inset 0 0 12px rgba(204,102,255,.08);animation:_voidPulse 2.4s ease-in-out infinite'
    :'';
  const _voidNmCol=isVoidQuest?'#e0b8ff':'';
  // 카드 본체: flex column 레이아웃 — 상단(썸네일+정보) + 하단(보상+버튼).
  // 하단은 flex space-between으로 좌측 보상과 우측 버튼이 같은 행에 배치되며 절대 겹치지 않음.
  // flex-wrap:wrap으로 좁은 카드에서는 버튼이 한 줄 아래로 떨어져 자동 분리 — 영역 보호.
  return '<div style="background:'+sc.bg+';border:1.5px solid '+sc.bd+';border-radius:8px;padding:8px 10px 10px 10px;display:flex;flex-direction:column;min-height:108px;position:relative;overflow:hidden'+_voidStyle+'">'
    // ── 상단: 썸네일 + 정보 ──
    +'<div style="display:flex;gap:8px;align-items:flex-start;flex:1;min-height:0">'
      +thumb
      +'<div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:3px">'
        +'<div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap"><span style="font-size:13px;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis'+(isVoidQuest?';color:'+_voidNmCol+';text-shadow:0 0 8px rgba(204,102,255,.6)':'')+'">'+q.nm+'</span><span style="font-size:10px;color:'+sc.col+';border:1px solid '+sc.bd+';border-radius:4px;padding:1px 5px;flex-shrink:0'+(isVoidQuest?';background:rgba(204,102,255,.15)':'')+'">'+sc.lbl+'</span></div>'
        +'<div style="font-size:11px;color:'+(isVoidQuest?'#d0a8e8':'var(--dim)')+';line-height:1.4">'+(window._subTokens?window._subTokens(q.desc):q.desc)+'</div>'
        +progHTML
      +'</div>'
    +'</div>'
    // ── 하단: 보상(좌) + 액션 버튼(우) — flex space-between + 영역 보호 ──
    +'<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:8px;flex-wrap:wrap;row-gap:6px">'
      +'<div style="display:flex;align-items:center;gap:6px;flex-wrap:nowrap;flex-shrink:0">'
        +'<span style="font-size:13px;color:var(--gold);font-weight:bold;white-space:nowrap">+₡'+_shownCr.toLocaleString()+'</span>'
        +'<span style="font-size:13px;color:var(--cyan);font-weight:bold;white-space:nowrap">VE+'+_shownVe+'</span>'
        +_multBadge
      +'</div>'
      +'<div style="display:flex;align-items:center;gap:6px;flex-wrap:nowrap;flex-shrink:0;margin-left:auto">'
        +actionHTML
      +'</div>'
    +'</div>'
    +'</div>';
}

function renderQuestTab(body){
  if(!body)return;
  var pid=G.currentPlanet;
  // 사용자 보고 2026-06-09: 시나리오·백구 퀘 안 보임 — renderQuestTab 진입 시
  //   spawnPhasedQuests 도 함께 호출해 시나리오 퀘 누락 방지
  try{ if(typeof spawnPhasedQuests==='function')spawnPhasedQuests(pid); }catch(e){console.warn('[questTab] spawnPhasedQuests fail:',e);}
  generateQuests(pid);
  // 사용자 보고 2026-06-07: 메인 퀘스트가 완료 안 되는 문제 — 카드 렌더 시점에 라이브 평가
  try{if(typeof tickStoryQuests==='function')tickStoryQuests();}catch(e){}
  var qlist=G.quests[pid]||[];
  var pd=PLANET_DEF.find(function(p){return p.id===pid;});
  var canLoan=(G.credits||0)<300,alreadyMax=(G.loan||0)>=20000;
  var loanSection=canLoan?'<div style="background:rgba(255,59,59,.1);border:1px solid var(--red);border-radius:8px;padding:10px 12px;margin-bottom:10px"><div style="color:var(--red);font-size:14px;font-weight:bold;margin-bottom:4px">'+I18N.t('ui.creditShortTitle')+'</div><div style="color:var(--dim);font-size:12px;line-height:1.6;margin-bottom:6px">'+I18N.t('ui.creditShortDesc')+(G.loan||0).toLocaleString()+'</div>'+(alreadyMax?`<div style="color:var(--red);font-size:12px">${I18N.t('ui.loanLimitExceeded')}</div>`:'<button class="btn btn-sm btn-red" onclick="takeLoan()">'+I18N.t('ui.loanBtn')+'</button>')+'</div>':'';
  function qCard(q){return _renderQuestCard(q,pid,qlist);}
  // 좌측: 내 퀘스트 (active/done/claimed) — 제독+브로커 모두
  // 우측: 행성 퀘스트 (available) — 제독+브로커 모두
  const myQ=qlist.filter(function(q){return q.status!=='available';});
  const availQ=qlist.filter(function(q){return q.status==='available';});
  // 상태별 정렬: 보상수령가능(done) → 진행중(active) → 완료(claimed)
  const _stOrder={done:0,active:1,claimed:2,available:3};
  myQ.sort((a,b)=>(_stOrder[a.status]||9)-(_stOrder[b.status]||9));
  // 타입별 정렬: 제독 먼저. EN/KO 양쪽 라벨 매칭 (i18n 적용된 라벨 또는 한국어 원본)
  const _adminN=I18N.t('quest.npc.admiral'),_brokerN=I18N.t('quest.npc.broker');
  // 사용자 보고 2026-06-09: 백구 퀘 안 보임 — 안전망 강화
  //   1. npc='백구' 명시 추가 (시나리오 퀘 외 모든 백구 NPC 퀘 → 제독 섹션)
  //   2. 영웅 NPC (이순신·가가린·마르코폴로 등) 도 제독 섹션 (시나리오 퀘 NPC)
  //   3. 미분류 폴백 — 브로커가 아닌 모든 퀘는 무조건 제독 섹션 (절대 사라지지 않게)
  const _isBrk=q=>q.npc===_brokerN||q.npc==='브로커';
  const _isAdm=q=>!_isBrk(q);  // 단순 명확: broker 가 아니면 모두 admin
  availQ.sort((a,b)=>((_isAdm(a)?0:1)-(_isAdm(b)?0:1)));
  const myAdmiralQ=myQ.filter(_isAdm);
  const myBrokerQ=myQ.filter(_isBrk);
  const availAdmiralQ=availQ.filter(_isAdm);
  const availBrokerQ=availQ.filter(_isBrk);
  // 진단 로그 — 사용자가 콘솔로 확인 가능
  try{
    console.log('[quest-ui] '+pid+' · 총 '+qlist.length+'개 (제독:'+(myAdmiralQ.length+availAdmiralQ.length)+', 브로커:'+(myBrokerQ.length+availBrokerQ.length)+')');
    var _baekguN=qlist.filter(function(q){return q.npc==='백구';}).length;
    if(_baekguN>0)console.log('[quest-ui] '+pid+' · 백구 NPC 퀘 '+_baekguN+'개 → 제독 섹션 분류 확인');
  }catch(e){}
  function _section(title,icon,color,bg,bdr,list,emptyMsg){
    if(!list.length)return`<div style="background:${bg};border:1px solid ${bdr};border-radius:8px;padding:10px 12px;margin-bottom:10px"><div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span style="font-size:22px">${icon}</span><div style="color:${color};font-size:14px;font-weight:bold">${title}</div></div><div style="color:var(--dim);font-size:12px;text-align:center;padding:10px">${emptyMsg}</div></div>`;
    return`<div style="background:${bg};border:1px solid ${bdr};border-radius:8px;padding:10px 12px;margin-bottom:10px"><div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span style="font-size:22px">${icon}</span><div><div style="color:${color};font-size:14px;font-weight:bold">${title}</div><div style="color:var(--dim);font-size:11px">${I18N.t('quest.countN',{n:list.length})}</div></div></div><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px">${list.map(qCard).join('')}</div></div>`;
  }
  const leftHTML=
    _section(I18N.t('ui.adminQuests'),'🎖️','var(--gold)','rgba(212,175,55,.05)','rgba(212,175,55,.25)',myAdmiralQ,I18N.t('ui.noOngoingAdmin'))+
    _section(I18N.t('ui.brokerQuests'),'🕴️','var(--cyan)','rgba(0,243,255,.04)','rgba(0,243,255,.2)',myBrokerQ,I18N.t('ui.noOngoingBroker'));
  const rightHTML=
    _section(I18N.t('ui.adminAvailable'),'🎖️','var(--gold)','rgba(212,175,55,.05)','rgba(212,175,55,.25)',availAdmiralQ,I18N.t('ui.noAvailableAdmin'))+
    _section(I18N.t('ui.brokerAvailable'),'🕴️','var(--cyan)','rgba(0,243,255,.04)','rgba(0,243,255,.2)',availBrokerQ,I18N.t('ui.noAvailableBroker'));
  body.innerHTML=`<div style="display:flex;flex-direction:column;height:100%;overflow:hidden">
    <!-- 헤더 -->
    <div style="padding:10px 14px 6px;border-bottom:1px solid rgba(255,255,255,.07);flex-shrink:0">
      <div style="font-size:17px;font-weight:bold;color:var(--gold)">${I18N.t('ui.questHeader',{nm:pd?pd.nm:''})}</div>
      ${loanSection}
    </div>
    <!-- 좌우 분할 -->
    <div style="flex:1;display:flex;flex-direction:row;min-height:0;overflow:hidden">
      <!-- 왼쪽: 나의 퀘스트 -->
      <div data-scroll-id="quest-my" style="flex:1;overflow-y:auto;min-height:0;padding:10px 8px 16px 14px;border-right:1px solid rgba(255,255,255,.07);scrollbar-width:thin;scrollbar-color:rgba(0,243,255,.2) transparent">
        <div style="font-size:12px;color:var(--green);font-weight:bold;margin-bottom:8px;letter-spacing:.5px">${I18N.t('ui.myQuestsHeader')}</div>
        ${leftHTML}
      </div>
      <!-- 오른쪽: 행성 퀘스트 (수락 가능) -->
      <div data-scroll-id="quest-avail" style="flex:1;overflow-y:auto;min-height:0;padding:10px 14px 16px 8px;scrollbar-width:thin;scrollbar-color:rgba(0,243,255,.2) transparent">
        <div style="font-size:12px;color:var(--cyan);font-weight:bold;margin-bottom:8px;letter-spacing:.5px">${I18N.t('ui.planetQuestsHeader')}</div>
        ${rightHTML}
      </div>
    </div>
  </div>`;
}


// ─── 진단 명령어 (사용자가 console 에서 호출 가능) ─────────────
// debugQuestState() — 현재 행성의 퀘스트 분포 + npc/type 별 카운트
window.debugQuestState=function(pid){
  var G=window.G||{};
  pid=pid||G.currentPlanet||'P01';
  var qlist=(G.quests&&G.quests[pid])||[];
  console.group('=== QUEST STATE: '+pid+' ('+qlist.length+'개) ===');
  if(!qlist.length){
    console.warn('퀘스트 없음! spawnPhasedQuests('+pid+') 직접 호출 권장');
    if(typeof window.spawnPhasedQuests==='function'){
      console.log('자동 spawn 시도...');
      window.spawnPhasedQuests(pid);
      qlist=(G.quests&&G.quests[pid])||[];
      console.log('spawn 후 개수:', qlist.length);
    }
  }
  var byNpc={},byType={},byStatus={};
  qlist.forEach(function(q){
    byNpc[q.npc||'(none)']=(byNpc[q.npc||'(none)']||0)+1;
    byType[q.type||'(none)']=(byType[q.type||'(none)']||0)+1;
    byStatus[q.status||'(none)']=(byStatus[q.status||'(none)']||0)+1;
  });
  console.log('NPC별:', byNpc);
  console.log('Type별:', byType);
  console.log('Status별:', byStatus);
  console.log('백구 NPC 퀘:', qlist.filter(function(q){return q.npc==='백구';}).length+'개');
  console.log('전체 데이터:', qlist);
  console.groupEnd();
  return qlist;
};
// forceSpawnQuests(pid) — 현재 행성에 시나리오 + 일반 퀘 강제 spawn
window.forceSpawnQuests=function(pid){
  pid=pid||(window.G&&window.G.currentPlanet)||'P01';
  console.log('[forceSpawn] '+pid+' 시작');
  if(typeof window.spawnPhasedQuests==='function')window.spawnPhasedQuests(pid);
  if(typeof window.generateQuests==='function')window.generateQuests(pid);
  if(typeof window.rerenderTab==='function'&&typeof window.renderQuestTab==='function'){
    window.rerenderTab(window.renderQuestTab);
  }
  console.log('[forceSpawn] 완료 — 퀘 탭 새로고침');
};

// 글로벌 노출 (game.js 기존 호출처 호환)
window._QUEST_TYPE_IMG_ALIAS=_QUEST_TYPE_IMG_ALIAS;
window._questTypeImg=_questTypeImg;
window._questTypeImgGeneric=_questTypeImgGeneric;
window._questThumbHtml=_questThumbHtml;
window.submitBuyQuest=submitBuyQuest;
window._renderQuestCard=_renderQuestCard;
window.renderQuestTab=renderQuestTab;

console.log('[quest-ui] Loaded — 6 functions exposed');
})();
