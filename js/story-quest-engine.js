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
  console.log('[story-quest-engine] spawnPhasedQuests("'+pid+'") 시작');
  if(!pid||!window.G||!window.G.quests){
    console.warn('[story-quest-engine] 종료: pid='+pid+' window.G='+!!window.G+' G.quests='+!!(window.G&&window.G.quests));
    return false;
  }
  const G=window.G;
  // 사용자 보고 2026-06-08: 이전 버그로 인트로가 seen 마킹만 되고 실제 재생 안 된 경우 다시 못 봄.
  // 매 spawn 마다 자동 복구 — _phasedIntroSeen 안의 항목 중 G._scenesSeen 에 대응
  // 'scene_*' 가 없는 것(=실제로 본 적 없음)은 마킹 해제. (V2 일회성 게이트 제거 — 항상 자동 복구)
  if(G._phasedIntroSeen){
    var _scenesSeen=G._scenesSeen||{};
    var _intros=[window.PHASE1_PLANET_INTROS, window.PHASE2_PLANET_INTROS, window.PHASE3_PLANET_INTROS, window.PHASE4_PLANET_INTROS, window.PHASE5_PLANET_INTROS, window.PHASE6_PLANET_INTROS];
    var _restored=0;
    Object.keys(G._phasedIntroSeen).forEach(function(key){
      if(!key.startsWith('intro_'))return;
      var planetId=key.substring(6);
      var sceneId=null;
      for(var i=0;i<_intros.length;i++){
        if(_intros[i] && _intros[i][planetId]){sceneId=_intros[i][planetId];break;}
      }
      if(sceneId && !_scenesSeen['scene_'+sceneId]){
        delete G._phasedIntroSeen[key];
        _restored++;
        console.log('[story-quest-engine] auto-restored unseen intro:', key);
      }
    });
    if(_restored>0){try{if(typeof saveGame==='function')saveGame(true);}catch(e){}}
    G._phasedIntroSeenV2=true;  // 호환성 유지 — 옛 코드 분기 차단
  }
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
      // 시나리오 퀘는 일반 퀘 한도(QUEST_MAX) 면제 — 스토리 진행이 일반 퀘에 밀려 막히지 않도록.
      // 사용자 보고 2026-06-08: 일반 퀘 6개 한도가 시나리오 퀘 등장을 차단해 컷씬·퀘가 안 뜨던 문제.
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
  // 사용자 보고 2026-06-08: 컷씬이 안 나오는 문제 — 인트로를 seen 으로 마킹한 뒤
  // 800ms 후 triggerScene 호출하는 순서라서, 마킹 직후 어떤 이유로 트리거가
  // 실패하면 영구히 안 나옴. → 실제로 onDone 콜백이 호출됐을 때만 seen 마킹.
  if(!G._phasedIntroSeen)G._phasedIntroSeen={};
  const _introKey='intro_'+pid;
  if(!G._phasedIntroSeen[_introKey]){
    const _introMaps=[window.PHASE1_PLANET_INTROS, window.PHASE2_PLANET_INTROS, window.PHASE3_PLANET_INTROS, window.PHASE4_PLANET_INTROS, window.PHASE5_PLANET_INTROS, window.PHASE6_PLANET_INTROS];
    let _introSceneId=null;
    for(let i=0;i<_introMaps.length;i++){
      if(_introMaps[i] && _introMaps[i][pid]){ _introSceneId=_introMaps[i][pid]; break; }
    }
    if(_introSceneId){
      console.log('[story-quest-engine] intro scene triggered immediately:', _introSceneId, 'for', pid);
      // 사용자 요청 2026-06-09: 800ms 지연 제거 — 게임 시작/행성 도착 즉시 컷씬 노출
      if(window.STORY_SCENES_PC && typeof window.STORY_SCENES_PC.triggerScene==='function'){
        try{
          window.STORY_SCENES_PC.triggerScene(_introSceneId, function(){
            // 실제로 컷씬이 끝났을 때만 seen 마킹 (사용자가 봤음을 확실히 보장)
            G._phasedIntroSeen[_introKey]=true;
            try{if(typeof saveGame==='function')saveGame(true);}catch(e){}
          });
        }catch(e){
          console.error('[story-quest-engine] intro trigger failed:', _introSceneId, e);
        }
      } else {
        // STORY_SCENES_PC 가 아직 로드되지 않은 경우 — 폴링 재시도 (최대 5초)
        var _retries=0;
        var _retryTimer=setInterval(function(){
          _retries++;
          if(window.STORY_SCENES_PC && typeof window.STORY_SCENES_PC.triggerScene==='function'){
            clearInterval(_retryTimer);
            console.log('[story-quest-engine] STORY_SCENES_PC ready after',_retries*200,'ms — triggering',_introSceneId);
            try{
              window.STORY_SCENES_PC.triggerScene(_introSceneId, function(){
                G._phasedIntroSeen[_introKey]=true;
                try{if(typeof saveGame==='function')saveGame(true);}catch(e){}
              });
            }catch(e){
              console.error('[story-quest-engine] retry trigger failed:', e);
            }
          } else if(_retries>=25){  // 25 × 200ms = 5초 후 포기
            clearInterval(_retryTimer);
            console.warn('[story-quest-engine] STORY_SCENES_PC never loaded — intro skipped:', _introSceneId);
          }
        }, 200);
      }
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

// ─── 진단·복구 유틸 (사용자가 console 에서 호출 가능) ─────────
// debugStoryState() — 현재 시나리오 상태 출력
// resetStoryProgress() — 모든 인트로/씬 마킹 해제 (다시 처음부터)
// forceReplayPlanetIntro(pid) — 특정 행성 인트로 강제 재생
window.debugStoryState=function(){
  var G=window.G||{};
  console.group('=== STORY STATE DEBUG ===');
  console.log('현재 행성:', G.currentPlanet);
  console.log('G.quests:', JSON.parse(JSON.stringify(G.quests||{})));
  console.log('G._phasedIntroSeen:', JSON.parse(JSON.stringify(G._phasedIntroSeen||{})));
  console.log('G._phasedIntroSeenV2:', G._phasedIntroSeenV2);
  console.log('G._scenesSeen:', JSON.parse(JSON.stringify(G._scenesSeen||{})));
  console.log('window.PHASE1_QUESTS 로드?', !!window.PHASE1_QUESTS);
  console.log('window.PHASE1_PLANET_INTROS 로드?', !!window.PHASE1_PLANET_INTROS);
  console.log('window.PHASE1_CUTSCENES_KO 로드?', !!window.PHASE1_CUTSCENES_KO);
  console.log('window.STORY_SCENES_PC 로드?', !!window.STORY_SCENES_PC);
  console.log('window.STORY_SCENES_PC.triggerScene?', typeof (window.STORY_SCENES_PC||{}).triggerScene);
  console.groupEnd();
};
window.resetStoryProgress=function(){
  var G=window.G||{};
  G._phasedIntroSeen={};
  G._scenesSeen={};
  G._phasedIntroSeenV2=false;
  try{if(typeof saveGame==='function')saveGame(true);}catch(e){}
  console.log('[story] 모든 인트로/씬 마킹 해제 완료 — 행성 재방문 시 컷씬이 다시 재생됩니다.');
  console.log('[story] 현재 행성으로 다시 도착 처리하려면: spawnPhasedQuests(G.currentPlanet)');
};
window.forceReplayPlanetIntro=function(pid){
  var G=window.G||{};
  pid=pid||G.currentPlanet;
  if(!pid){console.warn('[story] 행성 ID 필요. forceReplayPlanetIntro("P01")');return;}
  var _intros=[window.PHASE1_PLANET_INTROS, window.PHASE2_PLANET_INTROS, window.PHASE3_PLANET_INTROS, window.PHASE4_PLANET_INTROS, window.PHASE5_PLANET_INTROS, window.PHASE6_PLANET_INTROS];
  var sceneId=null;
  for(var i=0;i<_intros.length;i++){
    if(_intros[i] && _intros[i][pid]){sceneId=_intros[i][pid];break;}
  }
  if(!sceneId){console.warn('[story] '+pid+' 행성에 등록된 인트로 컷씬이 없습니다.');return;}
  if(!window.STORY_SCENES_PC || typeof window.STORY_SCENES_PC.forceReplayScene !== 'function'){
    console.warn('[story] STORY_SCENES_PC 가 로드되지 않았습니다.');return;
  }
  console.log('[story] '+pid+' 인트로 강제 재생:', sceneId);
  window.STORY_SCENES_PC.forceReplayScene(sceneId);
};

console.log('[story-quest-engine] Loaded — spawnPhasedQuests + tickStoryQuests + _storyQuestCurrentProgress');
console.log('[story-quest-engine] 디버그 명령어: debugStoryState() / resetStoryProgress() / forceReplayPlanetIntro("P01")');
})();
