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
// ─── 페이즈 게이팅 (사용자 요청 2026-06-14) ──────────────────────────────
//   페이즈 N 퀘스트는 직전 페이즈(N-1)가 50% 이상 "완료(claimed)"되어야 해금된다.
//   → 한 번에 모든 페이즈가 열려 보스전 없이 엔딩까지 도달하던 문제 차단.
function _phaseClaimedFrac(p){
  const G=window.G; if(!G||!G.quests)return 0;
  const src=window['PHASE'+p+'_QUESTS']; let total=0;
  if(src){ for(const k in src){ if(Array.isArray(src[k]))total+=src[k].length; } }
  if(total<=0)return 1;  // 데이터 없으면 통과
  let claimed=0;
  for(const pid in G.quests){ (G.quests[pid]||[]).forEach(function(q){ if(q&&q.phase===p&&q.status==='claimed')claimed++; }); }
  return claimed/total;
}
function _isPhaseUnlocked(n){
  if(n<=1)return true;
  return _phaseClaimedFrac(n-1)>=0.5;
}
// 행성이 속한 페이즈 번호(1~6). PHASEx_PLANET_INTROS / PHASEx_QUESTS 키에서 역조회. 사용자 요청 2026-06-26.
function _planetPhase(pid){
  for(var p=1;p<=6;p++){
    var intros=window['PHASE'+p+'_PLANET_INTROS']; if(intros && intros[pid])return p;
    var qs=window['PHASE'+p+'_QUESTS']; if(qs && qs[pid])return p;
  }
  return 1;
}
try{ if(typeof window!=='undefined'){ window._phaseClaimedFrac=_phaseClaimedFrac; window._isPhaseUnlocked=_isPhaseUnlocked; window._planetPhase=_planetPhase; } }catch(e){}

// ═══ 선행조건 게이트 + 유도 멘트 (사용자 지시서 2026-06-18) ═══════════════
//   퀘스트/컷신 템플릿의 선언적 `requires`{heroes,items,blueprints,quests} 를 읽어
//   미충족 시 컷신을 차단하고 "먼저 {행성}에서 {인물/아이템}을 찾아야 해" 유도 멘트 표시.
//   보유 판정: G.heroes(영웅) / G.inventory(아이템) / G.blueprints(설계도) / G.quests(선행 퀘 완료).
function _gateHas(type,id){
  const G=window.G||{};
  if(type==='hero')      return !!(G.heroes && G.heroes.indexOf(id)>=0);
  if(type==='item')      return !!(G.inventory && G.inventory.some(function(i){return i&&i.id===id&&(i.qty||0)>0;}));
  if(type==='blueprint') return !!(G.blueprints && G.blueprints[id]);
  if(type==='quest'){
    for(const pid in (G.quests||{})){
      const q=(G.quests[pid]||[]).find(function(x){return x&&x.id===id;});
      if(q) return q.status==='done'||q.status==='claimed';
    }
    return false;
  }
  return true;
}
// 선행조건을 어디서 구하는지 — planet ID 역참조(없으면 null). 코드네임/구지명 금지, planet.<ID>.nm 토큰용.
function _gateLocate(type,id){
  try{
    if(type==='hero'){
      const HM=(window.STORY_SCENES_PC&&window.STORY_SCENES_PC.HERO_PLANET_MAP)||{};
      return (HM[id]&&HM[id].planet)||null;
    }
    for(let ph=1;ph<=6;ph++){
      const Q=window['PHASE'+ph+'_QUESTS']; if(!Q)continue;
      for(const pid in Q){
        const arr=Q[pid]||[];
        for(let i=0;i<arr.length;i++){
          const t=arr[i]; if(!t)continue;
          if(type==='quest'     && t.id===id) return pid;
          if(type==='item'      && (t.rewardItems||[]).some(function(r){return r&&r.id===id;})) return pid;
          if(type==='blueprint' && (t.rewardFlags||[]).indexOf(id)>=0) return pid;
        }
      }
    }
    if(type==='blueprint' && typeof BLUEPRINT_MAP!=='undefined'){
      for(const pid in BLUEPRINT_MAP){ if(BLUEPRINT_MAP[pid]===id) return pid; }
    }
  }catch(e){}
  return null;
}
// 선행조건 표시명 (i18n, 폴백=id)
function _gateName(type,id){
  try{
    if(type==='hero'){
      const k='hero.'+id+'.nm', v=I18N.t(k); if(v&&v!==k) return v;
      if(typeof HEROES!=='undefined'&&HEROES[id]&&HEROES[id].nm) return HEROES[id].nm;
    }
    if(type==='item'){      const k='commodity.'+id+'.nm',  v=I18N.t(k); if(v&&v!==k) return v; }
    if(type==='blueprint'){ const k='reward.bpName.'+id,    v=I18N.t(k); if(v&&v!==k) return v; }
  }catch(e){}
  return id;
}
// 리졸버: requires 객체(또는 requires를 가진 템플릿) → {ok, missing:[{type,id,planet}]} (미보유만, 우선순위 순)
function checkPrereqs(reqOrTmpl){
  const req=(reqOrTmpl&&reqOrTmpl.requires)?reqOrTmpl.requires:reqOrTmpl;
  if(!req||typeof req!=='object') return {ok:true,missing:[]};
  const missing=[];
  // 유도 우선순위: 영웅 → 설계도 → 아이템 → 선행퀘 (배열 내 순서 유지)
  [['heroes','hero'],['blueprints','blueprint'],['items','item'],['quests','quest']].forEach(function(pair){
    (req[pair[0]]||[]).forEach(function(id){
      if(!_gateHas(pair[1],id)) missing.push({type:pair[1],id:id,planet:_gateLocate(pair[1],id)});
    });
  });
  return {ok:missing.length===0,missing:missing};
}
// 유도 멘트 텍스트 (첫 미충족 기준) — gate.needX i18n + {planet}/{name} 치환
function gateHintText(m0){
  if(!m0) return '';
  const planetNm = m0.planet ? I18N.t('planet.'+m0.planet+'.nm') : I18N.t('gate.unknownPlace');
  const nm = _gateName(m0.type,m0.id);
  const key = {hero:'gate.needHero',item:'gate.needItem',blueprint:'gate.needBlueprint',quest:'gate.needQuest'}[m0.type]||'gate.needItem';
  return I18N.t(key).replace('{planet}',planetNm).replace('{name}',nm);
}
// 씬 ID → 그 씬을 pre/post로 갖는 시나리오 퀘스트 템플릿의 requires (없으면 null)
function sceneRequires(sid){
  if(!sid) return null;
  for(let ph=1;ph<=6;ph++){
    const Q=window['PHASE'+ph+'_QUESTS']; if(!Q)continue;
    for(const pid in Q){
      const arr=Q[pid]||[];
      for(let i=0;i<arr.length;i++){
        const t=arr[i];
        if(t&&(t.cutscene_pre===sid||t.cutscene_post===sid)) return t.requires||null;
      }
    }
  }
  return null;
}
// 씬 게이트 판정 → {blocked, missing0}
function sceneGateBlocked(sid){
  const req=sceneRequires(sid);
  if(!req) return {blocked:false,missing0:null};
  const r=checkPrereqs(req);
  return {blocked:!r.ok, missing0:r.missing[0]||null};
}
// 유도 팝업 (백구 화자, 풀스크린 컷신 톤). key 지정 시 중복 스팸 방지.
function showStoryGateHint(m0,key){
  if(!m0) return;
  const G=window.G||{}; if(!G._gateHintShown)G._gateHintShown={};
  if(key){ if(G._gateHintShown[key]) return; G._gateHintShown[key]=true; }
  const _isEn=(typeof I18N!=='undefined'&&typeof I18N.getLang==='function'&&I18N.getLang()==='en');
  // 게이트 멘트 전용 음성(백구) — 타입별 vid (gate.needHero 등). showCharDialog 훅이 vid 재생.
  const _gvid={hero:'gate.needHero',item:'gate.needItem',blueprint:'gate.needBlueprint',quest:'gate.needQuest'}[m0.type]||null;
  // 버그수정 2026-06-26: 게이트 힌트를 풀스크린 컷신(showCharDialog)으로 띄우면 새 게임/허브 진입 시
  //   게이트된 씬이 자동 트리거되며 게임을 덮는 "갑작스런 컷신" 현상 발생. → 비침습적 토스트(notify)로 표시.
  //   (showCharDialog 는 notify 불가 환경에서만 폴백.)
  const _txt=gateHintText(m0);
  try{
    if(typeof window.notify==='function'){ window.notify(_txt,'gold'); }
    else if(window.STORY_SCENES_PC&&typeof window.STORY_SCENES_PC.showCharDialog==='function'){
      window.STORY_SCENES_PC.showCharDialog({scenes:[{char:'baekgu2_advice', vid:_gvid, name:(_isEn?'Baekgu':'백구'), color:'#66ddff', text:_txt}]});
    }
  }catch(e){}
}
try{ if(typeof window!=='undefined'){
  window.checkPrereqs=checkPrereqs; window.gateHintText=gateHintText;
  window.sceneRequires=sceneRequires; window.sceneGateBlocked=sceneGateBlocked;
  window.showStoryGateHint=showStoryGateHint;
} }catch(e){}

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
      // 프롤로그(showPrologue)가 P01 기상 서사를 담당 → P01 인트로는 복원(재트리거)하지 않음.
      //   이 가드 없으면 자동복원이 intro_P01 seen 을 지워 새 게임에 인트로 컷신이 다시 뜸. 사용자 요청 2026-06-26.
      if(planetId==='P01' && typeof window.showPrologue==='function')return;
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
    // 페이즈 게이팅 — 직전 페이즈 50% 미완료면 이 페이즈 퀘스트는 아직 스폰하지 않음
    const _phNum=parseInt(srcName.replace(/\D/g,''))||1;
    if(_phNum>1 && !_isPhaseUnlocked(_phNum)){
      console.log('[story-quest-engine] phase '+_phNum+' 잠금 — 직전 페이즈 50% 미완료, 스폰 보류');
      return;
    }
    if(!G.quests[pid])G.quests[pid]=[];
    src[pid].forEach(template=>{
      if(G.quests[pid].some(q=>q&&q.id===template.id))return;
      // 시나리오 퀘는 일반 퀘 한도(QUEST_MAX) 면제 — 스토리 진행이 일반 퀘에 밀려 막히지 않도록.
      // 사용자 보고 2026-06-08: 일반 퀘 6개 한도가 시나리오 퀘 등장을 차단해 컷씬·퀘가 안 뜨던 문제.
      const _nm=(typeof template.nm==='object')?(template.nm[_lang]||template.nm.ko||''):template.nm;
      const _desc=(typeof template.desc==='object')?(template.desc[_lang]||template.desc.ko||''):template.desc;
      let _lockReason=template.lockReason&&typeof template.lockReason==='object'
        ?(template.lockReason[_lang]||template.lockReason.ko||'')
        :template.lockReason;
      // 선행조건 게이트: requires 미충족 시 잠금 + 유도 멘트 자동 생성
      let _locked=!!template.locked;
      if(template.requires){
        const _pc=checkPrereqs(template);
        if(!_pc.ok){ _locked=true; _lockReason=gateHintText(_pc.missing[0]); }
      }
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
        locked:_locked,
        lockReason:_lockReason||'',
        requires:template.requires||null,
        _midBoss:template._midBoss||null,   // 중간보스 트리거 플래그 보존 (아이젠클로 등) — 누락 시 보스전 미발생 버그. 수정 2026-06-22.
        heroId:template.heroId||null,        // 영웅 합류 퀘스트 식별자 보존
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
  if(!G._introInFlight)G._introInFlight={};  // 컷씬 재생 중 재진입 차단(연속 2회 재생 방지)
  const _introKey='intro_'+pid;
  // 프롤로그(showPrologue)가 P01 기상 서사를 담당 → P01 인트로 컷신(p1_ch01a) 자동재생 중복 억제.
  //   타이밍 경쟁(인트로가 startGame 억제 직전에 발동) 회피 위해, 프롤로그 기능이 있으면 무조건 seen 마킹. 사용자 요청 2026-06-26.
  if(pid==='P01' && typeof window.showPrologue==='function'){ G._phasedIntroSeen[_introKey]=true; }
  if(!G._phasedIntroSeen[_introKey] && !G._introInFlight[_introKey]){
    const _introMaps=[window.PHASE1_PLANET_INTROS, window.PHASE2_PLANET_INTROS, window.PHASE3_PLANET_INTROS, window.PHASE4_PLANET_INTROS, window.PHASE5_PLANET_INTROS, window.PHASE6_PLANET_INTROS];
    let _introSceneId=null;
    for(let i=0;i<_introMaps.length;i++){
      if(_introMaps[i] && _introMaps[i][pid]){ _introSceneId=_introMaps[i][pid]; break; }
    }
    if(_introSceneId){
      console.log('[story-quest-engine] intro scene triggered immediately:', _introSceneId, 'for', pid);
      // 재생 시작 시점에 즉시 in-flight 마킹 → 동시에 들어온 중복 호출이 같은 컷씬을 또 트리거하지 못하게 차단
      G._introInFlight[_introKey]=true;
      // 사용자 요청 2026-06-09: 800ms 지연 제거 — 게임 시작/행성 도착 즉시 컷씬 노출
      if(window.STORY_SCENES_PC && typeof window.STORY_SCENES_PC.triggerScene==='function'){
        try{
          window.STORY_SCENES_PC.triggerScene(_introSceneId, function(){
            // 실제로 컷씬이 끝났을 때만 seen 마킹 (사용자가 봤음을 확실히 보장)
            G._phasedIntroSeen[_introKey]=true;
            G._introInFlight[_introKey]=false;
            try{if(typeof saveGame==='function')saveGame(true);}catch(e){}
            // 사용자 요청 2026-06-09: 자동 컷씬 종료 후 메인 탭 재렌더 → 컷씬 1~N 버튼 활성화
            try{
              if(G._currentHubTab==='main' && typeof rerenderTab==='function' && typeof renderMain==='function'){
                rerenderTab(renderMain);
              }
            }catch(e){}
          });
        }catch(e){
          G._introInFlight[_introKey]=false;  // 트리거 실패 → 잠금 해제하여 재시도 허용
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
                G._introInFlight[_introKey]=false;
                try{if(typeof saveGame==='function')saveGame(true);}catch(e){}
                // 자동 컷씬 종료 → 메인 탭 재렌더 (컷씬 1~N 버튼 활성화)
                try{
                  if(G._currentHubTab==='main' && typeof rerenderTab==='function' && typeof renderMain==='function'){
                    rerenderTab(renderMain);
                  }
                }catch(e){}
              });
            }catch(e){
              G._introInFlight[_introKey]=false;  // 실패 → 잠금 해제
              console.error('[story-quest-engine] retry trigger failed:', e);
            }
          } else if(_retries>=25){  // 25 × 200ms = 5초 후 포기
            clearInterval(_retryTimer);
            G._introInFlight[_introKey]=false;  // 포기 → 잠금 해제
            console.warn('[story-quest-engine] STORY_SCENES_PC never loaded — intro skipped:', _introSceneId);
          }
        }, 200);
      }
    }
  }
  // 행성 도착 시 해당 행성의 영웅 퀘스트 자동 스폰 (사용자 요청 2026-06-15)
  //   game.js 정의 함수 — 런타임에 window 로 노출됨. 미영입 영웅이면 즉시 퀘스트(status:done) 등장.
  //   페이즈 게이트 적용 (사용자 요청 2026-06-26): 행성이 속한 페이즈가 잠겨 있으면(직전 페이즈 <50% claimed) 영웅퀘도 미스폰.
  //   (이 가드 없으면 새 게임/전행성 사전 spawn 시 모든 페이즈 영웅퀘가 한꺼번에 떠 순서가 엉망)
  try{ if(typeof window._spawnHeroQuestForPlanet==='function' && _isPhaseUnlocked(_planetPhase(pid)))window._spawnHeroQuestForPlanet(pid); }catch(e){console.warn('[story-quest-engine] hero quest spawn fail:',e);}
  return added>0;
}

// ─── 시나리오 퀘 진행도 라이브 평가 ─────────────────────────────
function _storyQuestCurrentProgress(q,pid){
  if(!q||!q.objectives||!q.objectives.length)return q.progress||0;
  const G=window.G; if(!G)return q.progress||0;
  const obj=q.objectives[0];
  // gather/buy — cargo + inventory + materials 전부 합산 (보상 수령 위치 무관)
  if((obj.type==='gather'||obj.type==='buy')&&obj.item){
    const item=obj.item;
    const cargoQty=sumQtyById(G.cargo,item);
    const invQty=sumQtyById(G.inventory,item);
    const matQty=(G.materials&&G.materials[item])||0;
    return cargoQty+invQty+matQty;
  }
  if(obj.type==='explore'){
    const _evt=(G._storyExploreCount&&G._storyExploreCount[obj.target])||0;
    if(_evt>0)return _evt;
    // 사용자 요청 2026-06-18: 이미 충족된 상태를 소급 인정 → 즉시 완료
    //   경매 낙찰(=행성 소유) / 행성 투자(commerce) 는 이벤트 카운터가 없어도 상태로 판정.
    const _t=String(obj.target||'').toLowerCase();
    const _pl=(pid&&G.planets)?G.planets[pid]:null;
    if(_pl){
      if(/auction/.test(_t)&&_pl.owned)return obj.qty||1;
      if(/commerce/.test(_t)&&(_pl.commerce||_pl.owned))return obj.qty||1;
    }
    // 서사형 1회 액션(안테나 신호 증폭/스캔/송신 등) — 전용 버튼이 없어 영구 미완 방지.
    //   선행조건(전투 등)이 끝나 퀘가 active이고 해당 행성에 도착해 있으면 자동 충족.
    //   (사용자 보고 2026-06-21: '안테나 신호 증폭 가동 0/1' 미완 — 거북선 설계도 최종 단편)
    if(pid&&pid===G.currentPlanet&&/antenna|signal|broadcast|relay|_amp\b|^amp/.test(_t))return obj.qty||1;
    return q.progress||0;
  }
  if(obj.type==='delivery'&&obj.target) return (G.currentPlanet===obj.target)?obj.qty||1:0;
  if(obj.type==='combat') return (G._storyCombatKills&&G._storyCombatKills[q.id])||q.progress||0;
  return q.progress||0;
}

function tickStoryQuests(){
  const G=window.G;
  if(!G||!G.quests)return;
  Object.keys(G.quests).forEach(function(pid){
    (G.quests[pid]||[]).forEach(function(q){
      // 선행조건 게이트 자동 해제/갱신: requires 보유한 잠긴 시나리오 퀘 재평가
      if(q.type==='story_quest' && q.requires){
        const _pc=checkPrereqs(q.requires);
        if(_pc.ok){ if(q.locked){ q.locked=false; q.lockReason=''; } }
        else if(!q.locked){ q.locked=true; q.lockReason=gateHintText(_pc.missing[0]); }
      }
      if(q.type!=='story_quest'||q.status!=='active')return;
      const _cur=_storyQuestCurrentProgress(q,pid);
      const _need=q.required||((q.objectives&&q.objectives[0]&&q.objectives[0].qty)||1);
      const _newProg=Math.min(_need,_cur);
      if(_newProg!==q.progress) q.progress=_newProg;
      // 수정 2026-06-11 (사용자 요청): 80% 조기완료 제거 — 요구 수량을 전부 채워야 완료
      const _completionThreshold=_need;
      if(q.progress>=_completionThreshold&&q.status==='active'){
        q.status='done';
        q.progress=_need;  // UI에서 100% 표시
        try{if(typeof notify==='function')notify(I18N.t('notify.gatherQuestDone',{nm:q.nm}),'gold');}catch(e){}
        try{if(typeof baekgu==='function')baekgu(I18N.t('baekgu.searchCompleteQuest'));}catch(e){}
      }
    });
  });
}

// ─── 이미 충족된 시나리오 퀘스트 자동 완료+보상 (사용자 요청 2026-06-18) ───
//   tickStoryQuests로 충족분을 'done'으로 만든 뒤, 'done' 시나리오 퀘를 즉시 보상 수령(completeQuest).
//   completeQuest가 'claimed'로 전환하므로 멱등(중복 수령 없음). 재진입 가드로 렌더 중 호출도 안전.
function autoResolveSatisfiedStoryQuests(){
  const G=window.G; if(!G||!G.quests)return 0;
  if(window._autoResolvingQuests)return 0;
  window._autoResolvingQuests=true;
  let _claimed=0;
  try{
    try{tickStoryQuests();}catch(e){}
    Object.keys(G.quests).forEach(function(pid){
      const arr=G.quests[pid]||[];
      for(let i=0;i<arr.length;i++){
        const q=arr[i];
        if(q&&q.type==='story_quest'&&q.status==='done'){
          try{ if(typeof window.completeQuest==='function'){ window.completeQuest(pid,i); _claimed++; } }catch(e){}
        }
      }
    });
  } finally { window._autoResolvingQuests=false; }
  return _claimed;
}
window.autoResolveSatisfiedStoryQuests=autoResolveSatisfiedStoryQuests;

// 함선/파츠 정비형 시나리오 퀘스트 자동 완료 (사용자 요청 2026-06-20):
//   보유 함선에 파츠 자동 배치(autoEquipParts*) 실행 시, '파츠 최적화/정비' explore 퀘를 충족 처리.
//   → 특정 함선·파츠 퀘스트가 별도 트리거 없이 영구 미해결되던 문제 방지. 대상 target: tuning/equip/optim/정비.
function completeTuningQuests(){
  const G=window.G; if(!G||!G.quests)return 0;
  const pid=G.currentPlanet;
  let done=0;
  (G.quests[pid]||[]).forEach(function(q){
    if(q.type!=='story_quest'||q.status!=='active')return;
    const obj=(q.objectives||[])[0]; if(!obj||obj.type!=='explore')return;
    const t=String(obj.target||'').toLowerCase();
    if(t.indexOf('tuning')<0&&t.indexOf('equip')<0&&t.indexOf('optim')<0&&t.indexOf('정비')<0)return;
    if(!G._storyExploreCount)G._storyExploreCount={};
    const need=q.required||obj.qty||1;
    G._storyExploreCount[obj.target]=Math.max(G._storyExploreCount[obj.target]||0,need);
    done++;
  });
  if(done>0){
    try{ if(typeof tickStoryQuests==='function')tickStoryQuests(); }catch(e){}
    try{ if(typeof autoResolveSatisfiedStoryQuests==='function')autoResolveSatisfiedStoryQuests(); }catch(e){}
  }
  return done;
}
window.completeTuningQuests=completeTuningQuests;

// ─── 시나리오 퀘 진행 카운터 증가 (bugfix 2026-06-11) ─────────────
//   문제: _storyCombatKills / _storyExploreCount 를 읽기만 하고 어디서도 증가시키지 않아
//         combat/explore 목표 시나리오 퀘스트가 영구히 완료 불가.
//   해결: 게임 액션 지점(전투 승리·잔해 탐색)에서 이 함수를 호출해 카운터 증가.
//   kind: 'combat' | 'explore' · n: 증가량 · pid: 행성(기본 현재 행성)
//   v2 (2026-06-11, 사용자 요청 "실제 요건 충족 시에만 보상"): 액션-타겟 정밀 매칭
//   action: 'gather'(잔해 탐색) | 'auction'(경매 입찰) | 'repair'(수리) | 'install'(파츠 장착)
//         | 'commerce'(행성 투자) | 'combat_ursa'(우르사 보스전 승리) | 'combat_chix'(치크스전 승리)
//         | 'combat_generic'(일반 전투 승리)
//   (구버전 호환: 'explore'→gather, 'combat'→combat_generic)
var _EXPLORE_ROUTE={
  auction:['auction'], repair:['repair'], install:['install','tuning'], commerce:['commerce'],
  gather:['wreck','box','ruin','canyon','shaft','ejecta','crystal','core','capsule','archive','arrival','deep']
};
function _exploreActionMatches(action, target){
  var t=String(target||'').toLowerCase();
  for(var act in _EXPLORE_ROUTE){
    if(_EXPLORE_ROUTE[act].some(function(k){return t.indexOf(k)>=0;})) return act===action;
  }
  // 키워드 미등록(서사형: yi_join, meet_gwanggaeto 등) 태그는 탐색으로 진행 허용 (완료 불가 방지)
  return action==='gather';
}
function _combatActionMatches(action, target){
  var t=String(target||'').toLowerCase();
  if(t.indexOf('ursa')>=0) return action==='combat_ursa';                       // 우르사 퀘는 보스전 승리만
  if(t.indexOf('cygnus')>=0||t.indexOf('chix')>=0) return action==='combat_chix'||action==='combat_ursa';
  return action==='combat_generic'||action==='combat_chix'||action==='combat_ursa'; // 일반 태그는 모든 승리 인정
}
function bumpStoryQuestProgress(action, n, pid){
  const G=window.G; if(!G||!G.quests)return 0;
  n=n||1; pid=pid||G.currentPlanet;
  if(action==='explore')action='gather';
  if(action==='combat')action='combat_generic';
  const isCombat=action.indexOf('combat_')===0;
  let bumped=0;
  (G.quests[pid]||[]).forEach(function(q){
    if(q.type!=='story_quest'||q.status!=='active')return;
    const obj=(q.objectives||[])[0]; if(!obj)return;
    if(isCombat){
      if(obj.type!=='combat'||!_combatActionMatches(action,obj.target))return;
      if(!G._storyCombatKills)G._storyCombatKills={};
      G._storyCombatKills[q.id]=(G._storyCombatKills[q.id]||0)+n;bumped++;
    } else {
      if(obj.type!=='explore'||!_exploreActionMatches(action,obj.target))return;
      if(!G._storyExploreCount)G._storyExploreCount={};
      G._storyExploreCount[obj.target]=(G._storyExploreCount[obj.target]||0)+n;bumped++;
    }
  });
  if(bumped){try{tickStoryQuests();}catch(e){}}
  return bumped;
}

// ─── 컷씬 스토리 해금 판정 (사용자 요청 2026-06-12) ─────────────────
//   메인 허브 대화기록 버튼·운항기록 탭 공용: 컷씬이 "스토리 이벤트로 열렸는가"
//   · 이미 시청(scene_*) → 해금
//   · 행성 인트로: 해당 행성 방문(현재 행성/인트로 재생됨/탐사 완료) → 해금
//   · 퀘스트 사전(pre) 컷씬: 퀘스트 수락(active) 이상 → 해금
//   · 퀘스트 사후(post) 컷씬: 퀘스트 완료(done/claimed) → 해금
function isSceneStoryUnlocked(sid){
  const G=window.G; if(!G||!sid)return false;
  if(G._scenesSeen&&G._scenesSeen['scene_'+sid])return true;
  for(let ph=1;ph<=6;ph++){
    const INTRO=window['PHASE'+ph+'_PLANET_INTROS']||{};
    for(const pid in INTRO){
      if(INTRO[pid]===sid){
        if(G._phasedIntroSeen&&G._phasedIntroSeen['intro_'+pid])return true;
        if(G.currentPlanet===pid)return true;
        if(G.planets&&G.planets[pid]&&G.planets[pid].fog==='A')return true;
        return false;
      }
    }
    const Q=window['PHASE'+ph+'_QUESTS'];
    if(!Q)continue;
    for(const pid in Q){
      const arr=Q[pid]||[];
      for(let i=0;i<arr.length;i++){
        const tq=arr[i];
        if(tq.cutscene_pre===sid||tq.cutscene_post===sid){
          const liveQ=((G.quests||{})[pid]||[]).find(function(x){return x.id===tq.id;});
          if(!liveQ)return false;
          if(tq.cutscene_pre===sid)return liveQ.status==='active'||liveQ.status==='done'||liveQ.status==='claimed';
          return liveQ.status==='done'||liveQ.status==='claimed';
        }
      }
    }
  }
  return false;
}
window.isSceneStoryUnlocked=isSceneStoryUnlocked;

// 글로벌 노출 (기존 game.js 호출처 호환)
window.spawnPhasedQuests=spawnPhasedQuests;
window._storyQuestCurrentProgress=_storyQuestCurrentProgress;
window.tickStoryQuests=tickStoryQuests;
window.bumpStoryQuestProgress=bumpStoryQuestProgress;

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

// ═══════════════════════════════════════════════════════════════════
// 저장된 시나리오 퀘스트 재현지화 (relocalize)
//   버그(2026-06-14): 퀘스트는 spawn 시점 언어로 nm/desc/objective.label 을 "문자열"로
//     확정 저장한다(story-quest-engine 96~110행). 언어 전환은 페이지 reload 를 하지만
//     spawnPhasedQuests 는 이미 존재하는 퀘스트(같은 id)를 skip 하므로(93행) 한 번 한국어로
//     스폰된 퀘스트는 영어로 바꿔도 한글 문자열이 그대로 남는다.
//   수정: 게임 로드/허브 진입 시 G.quests 전체를 원본 템플릿(PHASE1~6_QUESTS)에서 현재
//     언어로 재해석. 현재 언어로 이미 맞춰져 있으면(G._questLocLang) 비용 없이 즉시 반환.
function relocalizeStoryQuests(){
  try{
    if(!window.G||!G.quests) return 0;
    const _lang=(typeof I18N!=='undefined'&&I18N.getLang&&I18N.getLang()==='en')?'en':'ko';
    // 버전 태그: 데이터 변경 시 +1 → 구 세이브 1회 강제 재지역화. v3: P14 잔당소탕/요새점령 + 우르사좌표 리톤 (2026-06-17)
    const _tag=_lang+'.v3';
    if(G._questLocLang===_tag) return 0; // 이미 현재 언어·버전으로 지역화됨 — 스킵
    // id → 원본 템플릿 맵 구성
    const byId=Object.create(null);
    ['PHASE1_QUESTS','PHASE2_QUESTS','PHASE3_QUESTS','PHASE4_QUESTS','PHASE5_QUESTS','PHASE6_QUESTS'].forEach(s=>{
      const src=window[s]; if(!src) return;
      Object.keys(src).forEach(pid=>{ (src[pid]||[]).forEach(t=>{ if(t&&t.id) byId[t.id]=t; }); });
    });
    // ── 절차 생성 퀘스트(quest-gen) 재지역화 ──────────────────────────
    //   구 세이브는 _gT(인덱스) 메타데이터가 없으므로 템플릿 ko/en 문자열 역매칭으로 인덱스 복원.
    const _procTypes=['combat','delivery','gather','explore']; // buy는 동적 제목이라 역매칭 제외(메타데이터로만)
    const _titleRev=Object.create(null), _descRev=Object.create(null);
    if(typeof I18N!=='undefined'&&I18N.getEntry){
      _procTypes.forEach(tp=>{
        for(let i=1;i<=4;i++){
          const te=I18N.getEntry('quest.'+tp+'.title'+i);
          if(te){ if(te.ko)_titleRev[tp+'|'+te.ko]=i-1; if(te.en)_titleRev[tp+'|'+te.en]=i-1; }
          const de=I18N.getEntry('quest.'+tp+'.desc'+i);
          if(de){ if(de.ko)_descRev[tp+'|'+de.ko]=i-1; if(de.en)_descRev[tp+'|'+de.en]=i-1; }
        }
      });
    }
    function _relocProc(q){
      if(!q||!q.type||['combat','delivery','gather','explore','buy'].indexOf(q.type)<0) return 0;
      let ti=(q._gT!=null)?q._gT:null;
      if(ti==null){ // 메타데이터 없는 구 세이브 → 역매칭으로 복원
        let k=_titleRev[q.type+'|'+q.nm];
        if(k==null && q.desc){ k=_descRev[q.type+'|'+q.desc]; if(k==null)k=_descRev[q.type+'|'+String(q.desc).split('\n')[0]]; }
        if(k!=null){ ti=k; q._gT=ti; }
      }
      if(ti==null && q.type==='buy' && typeof I18N!=='undefined' && I18N.getEntry){
        // buy 제목은 '{title} — {nm} {qty}개' 동적 → 접두어(title base) 매칭으로 인덱스 복원
        for(let i=0;i<4;i++){ const te=I18N.getEntry('quest.buy.title'+(i+1)); if(!te)continue;
          if((te.ko&&String(q.nm).indexOf(te.ko)===0)||(te.en&&String(q.nm).indexOf(te.en)===0)){ ti=i; q._gT=i; break; } }
        // 단가(_gU) 복원: cr = qty × unit × 2  →  unit = cr / (qty×2)
        if(ti!=null && q._gU==null && q.required>0) q._gU=Math.round(q.rewardCr/(q.required*2));
      }
      if(ti==null || typeof window._procQuestText!=='function') return 0;
      let commNm='';
      if(q.targetCommId && typeof COMMODITIES!=='undefined'){ const c=COMMODITIES.find(x=>x.id===q.targetCommId); if(c)commNm=c.nm; }
      const r=window._procQuestText(q.type, ti, {commNm:commNm, qty:q.required, cr:q.rewardCr, unit:q._gU});
      let ch=0;
      if(r&&r.nm&&r.nm!==q.nm){ q.nm=r.nm; ch++; }
      if(r&&r.desc&&r.desc!==q.desc){ q.desc=r.desc; ch++; }
      return ch;
    }
    let changed=0;
    Object.keys(G.quests).forEach(pid=>{
      (G.quests[pid]||[]).forEach(q=>{
        if(!q||!q.id) return;
        // 보이드 보스 / 영웅 퀘스트 재지역화 (사용자 보고 2026-06-16: 영문판에서 한글 잔존 방지)
        if(q.type==='void_boss'){
          const _vn=I18N.t('quest.darkShipHidden'),_vd=I18N.t('quest.darkShipDesc');
          if(_vn&&_vn!==q.nm){q.nm=_vn;changed++;} if(_vd&&_vd!==q.desc){q.desc=_vd;changed++;}
          return;
        }
        if(q.type==='hero_quest'&&q.heroId&&typeof window._heroQuestText==='function'){
          const r=window._heroQuestText(q.heroId);
          if(r){ if(r.nm&&r.nm!==q.nm){q.nm=r.nm;changed++;} if(r.desc&&r.desc!==q.desc){q.desc=r.desc;changed++;} }
          return;
        }
        const t=byId[q.id]; if(!t){ changed+=_relocProc(q); return; } // 템플릿 없으면 절차 퀘로 재지역화
        if(t.nm&&typeof t.nm==='object'){ const v=t.nm[_lang]||t.nm.ko; if(v&&v!==q.nm){ q.nm=v; changed++; } }
        if(t.desc&&typeof t.desc==='object'){ const v=t.desc[_lang]||t.desc.ko; if(v&&v!==q.desc){ q.desc=v; changed++; } }
        if(Array.isArray(q.objectives)&&Array.isArray(t.objectives)){
          q.objectives.forEach((o,i)=>{
            const to=t.objectives[i];
            if(o&&to&&typeof to.label==='object'){ const l=to.label[_lang]||to.label.ko; if(l&&l!==o.label){ o.label=l; changed++; } }
          });
        }
        if(t.lockReason&&typeof t.lockReason==='object'){ const lr=t.lockReason[_lang]||t.lockReason.ko; if(lr&&lr!==q.lockReason){ q.lockReason=lr; changed++; } }
      });
    });
    G._questLocLang=_tag;
    if(changed>0){ try{ if(typeof saveGame==='function') saveGame(true); }catch(e){} }
    return changed;
  }catch(e){ console.warn('[relocalizeStoryQuests]',e); return 0; }
}
window.relocalizeStoryQuests=relocalizeStoryQuests;

console.log('[story-quest-engine] Loaded — spawnPhasedQuests + tickStoryQuests + _storyQuestCurrentProgress');
console.log('[story-quest-engine] 디버그 명령어: debugStoryState() / resetStoryProgress() / forceReplayPlanetIntro("P01")');
})();
