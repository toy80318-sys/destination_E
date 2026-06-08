// ═══════════════════════════════════════════════════════════════════
// DESTINATION EARTH — 시나리오 퀘스트 엔진 (Phase 1~6 wiring)
//   · spawnPhasedQuests       — 행성 도착 시 PHASE1~6_QUESTS 에서 해당 행성 퀘 자동 spawn
//   · _storyQuestCurrentProgress / tickStoryQuests
//     - 시나리오 퀘스트 진행도 자동 평가 (gather/buy → cargo+inventory+materials, explore→counter, delivery→arrival, combat→kills)
//   · PHASE 1~6 PLANET_INTROS 자동 컷씬 트리거
//
// 의존 글로벌: G, I18N, PLANET_DEF, QUEST_MAX_AVAILABLE, COMMODITIES, HEROES
//             notify(), baekgu(), saveGame(), rerenderTab(), renderQuestTab()
//             STORY_SCENES_PC.triggerScene()
//             window.PHASE1~6_QUESTS / PHASE1~6_PLANET_INTROS
// ═══════════════════════════════════════════════════════════════════
(function(){
if(typeof window==='undefined') return;
if(window._STORY_QUEST_ENGINE_LOADED) return;
window._STORY_QUEST_ENGINE_LOADED=true;

// 사용자 요청 2026-06-08: 시나리오 퀘 완료 기준 완화
//   · 모든 gather/buy/combat/explore 요구 수량을 ceil(원본 × 0.5) 로 축소 (최소 1)
//   · delivery (행성 도착) 는 단일 행성 이동이라 그대로 유지
//   · 완료 임계값도 80% 진행 시 done 처리 (추가 안전망)
const _DIFFICULTY_RELAX = 0.5;  // 0.5 = 절반 / 0.7 = 70% 등
function _relaxQty(qty, objType){
  if(objType==='delivery') return qty||1;  // 도착 퀘는 유지
  return Math.max(1, Math.ceil((qty||1) * _DIFFICULTY_RELAX));
}

// ─── 시나리오 퀘 spawn ──────────────────────────────────────────
function spawnPhasedQuests(pid){
  if(!pid||!window.G||!window.G.quests)return false;
  const G=window.G;
  const _isEn=(typeof I18N!=='undefined'&&I18N.getLang&&I18N.getLang()==='en');
  const _lang=_isEn?'en':'ko';
  const QUEST_MAX=(typeof QUEST_MAX_AVAILABLE!=='undefined')?QUEST_MAX_AVAILABLE:6;
  let added=0;
  // PHASE1~6 시나리오 퀘를 순회하며 해당 행성 데이터를 모두 시도
  ['PHASE1_QUESTS','PHASE2_QUESTS','PHASE3_QUESTS','PHASE4_QUESTS','PHASE5_QUESTS','PHASE6_QUESTS'].forEach(srcName=>{
    const src=window[srcName];
    if(!src||!src[pid])return;
    if(!G.quests[pid])G.quests[pid]=[];
    src[pid].forEach(template=>{
      if(G.quests[pid].some(q=>q&&q.id===template.id))return;
      const _active=G.quests[pid].filter(q=>q&&q.status!=='claimed').length;
      if(_active>=QUEST_MAX)return;
      const _nm=(typeof template.nm==='object')?(template.nm[_lang]||template.nm.ko||''):template.nm;
      const _desc=(typeof template.desc==='object')?(template.desc[_lang]||template.desc.ko||''):template.desc;
      const _lockReason=template.lockReason&&typeof template.lockReason==='object'
        ?(template.lockReason[_lang]||template.lockReason.ko||'')
        :template.lockReason;
      // 사용자 요청 2026-06-08: 모든 objective 의 qty 를 50% 로 완화 (delivery 제외)
      const _objs=(template.objectives||[]).map(o=>{
        const _origQty=o.qty||1;
        const _relaxedQty=_relaxQty(_origQty, o.type);
        // 라벨에 (50% 완화) 표시는 생략 — 자연스럽게 적용
        return {
          ...o,
          qty:_relaxedQty,
          _origQty:_origQty,  // 원본 보존 (디버그용)
          label:(typeof o.label==='object')?(o.label[_lang]||o.label.ko||''):o.label
        };
      });
      const _firstObj=_objs[0]||{};
      G.quests[pid].push({
        id:template.id,
        type:template.type||'story_quest',
        phaseQuestType:template.type,
        category:template.category,
        phase:template.phase||1,
        ic:template.ic||'⭐',
        npc:template.npc||'',
        npcIc:template.npcIc||'❓',
        npcKey:template.npcKey||'system',
        nm:_nm, desc:_desc, objectives:_objs,
        rewardCr:template.rewardCr||0,
        rewardVe:template.rewardVe||0,
        rewardItems:template.rewardItems||[],
        rewardFlags:template.rewardFlags||[],
        cutscene_pre:template.cutscene_pre||null,
        cutscene_post:template.cutscene_post||null,
        locked:!!template.locked,
        lockReason:_lockReason||'',
        status:'available',
        targetId:_firstObj.target||null,
        targetCommId:_firstObj.item||null,
        progress:0,
        required:_firstObj.qty||1,
        planetId:pid
      });
      added++;
    });
  });
  if(added>0){
    try{if(typeof saveGame==='function')saveGame(true);}catch(e){}
    try{if(G._currentHubTab==='quest' && typeof rerenderTab==='function' && typeof renderQuestTab==='function')rerenderTab(renderQuestTab);}catch(e){}
  }
  // 행성 첫 도착 인트로 컷씬 자동 재생
  if(!G._phasedIntroSeen)G._phasedIntroSeen={};
  const _introKey='intro_'+pid;
  if(!G._phasedIntroSeen[_introKey]){
    const _introMaps=[window.PHASE1_PLANET_INTROS, window.PHASE2_PLANET_INTROS, window.PHASE3_PLANET_INTROS, window.PHASE4_PLANET_INTROS, window.PHASE5_PLANET_INTROS, window.PHASE6_PLANET_INTROS];
    let _introSceneId=null;
    for(let i=0;i<_introMaps.length;i++){
      if(_introMaps[i] && _introMaps[i][pid]){ _introSceneId=_introMaps[i][pid]; break; }
    }
    if(_introSceneId && window.STORY_SCENES_PC && typeof window.STORY_SCENES_PC.triggerScene==='function'){
      G._phasedIntroSeen[_introKey]=true;
      try{if(typeof saveGame==='function')saveGame(true);}catch(e){}
      setTimeout(()=>window.STORY_SCENES_PC.triggerScene(_introSceneId), 800);
    }
  }
  return added>0;
}

// ─── 시나리오 퀘 진행도 라이브 평가 ─────────────────────────────
function _storyQuestCurrentProgress(q){
  if(!q||!q.objectives||!q.objectives.length)return q.progress||0;
  const G=window.G; if(!G)return q.progress||0;
  const obj=q.objectives[0];
  // gather/buy — cargo + inventory + materials 전부 합산 (보상 수령 위치 무관)
  if((obj.type==='gather'||obj.type==='buy')&&obj.item){
    const item=obj.item;
    const cargoQty=(G.cargo||[]).filter(c=>c.id===item).reduce((s,c)=>s+(c.qty||0),0);
    const invQty=(G.inventory||[]).filter(i=>i.id===item).reduce((s,i)=>s+(i.qty||0),0);
    const matQty=(G.materials&&G.materials[item])||0;
    return cargoQty+invQty+matQty;
  }
  if(obj.type==='explore') return (G._storyExploreCount&&G._storyExploreCount[obj.target])||q.progress||0;
  if(obj.type==='delivery'&&obj.target) return (G.currentPlanet===obj.target)?obj.qty||1:0;
  if(obj.type==='combat') return (G._storyCombatKills&&G._storyCombatKills[q.id])||q.progress||0;
  return q.progress||0;
}

function tickStoryQuests(){
  const G=window.G;
  if(!G||!G.quests)return;
  Object.keys(G.quests).forEach(function(pid){
    (G.quests[pid]||[]).forEach(function(q){
      if(q.type!=='story_quest'||q.status!=='active')return;
      const _cur=_storyQuestCurrentProgress(q);
      const _need=q.required||((q.objectives&&q.objectives[0]&&q.objectives[0].qty)||1);
      const _newProg=Math.min(_need,_cur);
      if(_newProg!==q.progress) q.progress=_newProg;
      // 사용자 요청 2026-06-08: 80% 진행 시에도 done 처리 (반올림 누락·수량 미세 차이 안전망)
      const _completionThreshold=Math.max(1, Math.ceil(_need * 0.8));
      if(q.progress>=_completionThreshold&&q.status==='active'){
        q.status='done';
        q.progress=_need;  // UI에서 100% 표시
        try{if(typeof notify==='function')notify(I18N.t('notify.gatherQuestDone',{nm:q.nm}),'gold');}catch(e){}
        try{if(typeof baekgu==='function')baekgu(I18N.t('baekgu.searchCompleteQuest'));}catch(e){}
      }
    });
  });
}

// 글로벌 노출 (기존 game.js 호출처 호환)
window.spawnPhasedQuests=spawnPhasedQuests;
window._storyQuestCurrentProgress=_storyQuestCurrentProgress;
window.tickStoryQuests=tickStoryQuests;

console.log('[story-quest-engine] Loaded — spawnPhasedQuests + tickStoryQuests + _storyQuestCurrentProgress');
})();
