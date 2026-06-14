// ═══════════════════════════════════════════════════════════════════
// DESTINATION EARTH — 메인 허브 시나리오 퀘 스트립 모듈
//   · game.js 에서 분할 (2026-06-10, 사용자 요청: 긴 파일 분할)
//   · 메인 허브 배경 이미지 하단에 시나리오 퀘 카드를 가로로 노출
//   · 카드 클릭 → 상세 팝업 + 수락/보상수령 버튼 직접 제공
//   · 퀘 탭 UI 의존 제거 (반복 보고된 미노출 문제의 안전망)
//
// 의존 글로벌:
//   · G, I18N
//   · spawnPhasedQuests, acceptQuest, completeQuest (퀘 액션)
//   · openModal, closeModal, notify
//   · rerenderTab, renderMain, hubTab (UI 갱신)
//
// 외부 노출:
//   · window._buildStoryQuestStripHTML(pid)  → HTML 문자열
//   · window._openStoryQuestDetail(pid, qid) → 모달 팝업
// ═══════════════════════════════════════════════════════════════════
(function(){
if(typeof window==='undefined')return;
if(window._MAIN_HUB_STORY_STRIP_LOADED)return;
window._MAIN_HUB_STORY_STRIP_LOADED=true;

// ─── 시나리오 퀘 스트립 (메인 허브 배경 하단 가로 배치) ────────────
function _buildStoryQuestStripHTML(pid){
  try{
    if(!pid||!window.G||!window.G.quests)return '';
    const G=window.G;
    // 안전망 1: 진입 시 강제 재spawn (퀘 탭 안 거치고도 스토리 퀘 보장)
    try{ if(typeof window.spawnPhasedQuests==='function')window.spawnPhasedQuests(pid); }catch(e){}
    const _qlist=G.quests[pid]||[];
    // 시나리오 퀘만 추출 — claimed(완료 후 보상까지 수령) 제외
    const _stories=_qlist.filter(function(q){
      return q && q.type==='story_quest' && q.status!=='claimed';
    });
    if(_stories.length===0)return '';
    // 상태별 정렬: available → done(보상수령가능) → active(진행중)
    const _stOrder={available:0,done:1,active:2};
    _stories.sort(function(a,b){return (_stOrder[a.status]||9)-(_stOrder[b.status]||9);});
    const _en=(window.I18N&&I18N.getLang&&I18N.getLang()==='en');
    const _sub=window._subTokens||function(s){return s;};
    function _catCol(cat){return cat==='main'?'#ffd700':cat==='hidden'?'#ff88cc':'#cc88ff';}
    function _catLbl(cat){return cat==='main'?(_en?'[MAIN]':'[메인]'):cat==='hidden'?(_en?'[HIDDEN]':'[히든]'):(_en?'[SUB]':'[서브]');}
    function _stLbl(st){return st==='available'?(_en?'🆕 Available':'🆕 수락 가능'):st==='done'?(_en?'✅ Claim':'✅ 보상 수령'):(_en?'⏳ In Progress':'⏳ 진행 중');}
    const _cards=_stories.map(function(q){
      const _cat=q.category||'sub';
      const _col=_catCol(_cat);
      const _isAvail=q.status==='available';
      const _glow=_isAvail?'box-shadow:0 0 12px rgba(204,136,255,.45);animation:_storyStripPulse 2s ease-in-out infinite;':'';
      const _qid=(q.id||'').replace(/'/g,"\\'");
      const _nm=(q.nm||'').toString().replace(/"/g,'&quot;');
      const _desc=_sub((q.desc||'').toString()).substring(0,80).replace(/"/g,'&quot;');
      const _obj0=(q.objectives&&q.objectives[0])||{};
      const _objLbl=(typeof _obj0.label==='object'?((_en?_obj0.label.en:_obj0.label.ko)||_obj0.label.ko||_obj0.label.en||''):(_obj0.label||'')).toString();
      const _prog=q.status==='active'?('<div style="font-size:10px;color:#cc88ff;margin-top:2px">'+_objLbl+' · '+(q.progress||0)+'/'+(q.required||1)+'</div>'):'';
      return '<div onclick="_openStoryQuestDetail(\''+pid+'\',\''+_qid+'\')" style="flex:0 0 280px;background:linear-gradient(135deg,rgba(170,80,255,.22),rgba(40,10,80,.92));border:1.5px solid '+_col+';border-radius:8px;padding:8px 10px;cursor:pointer;'+_glow+'transition:transform .15s" onmouseover="this.style.transform=\'translateY(-2px)\'" onmouseout="this.style.transform=\'translateY(0)\'" title="'+_nm+' — '+(_en?'click for details':'클릭하여 상세 보기')+'">'
        +'<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px"><span style="font-size:16px">'+(q.ic||'⭐')+'</span><span style="font-weight:bold;color:#e0b3ff;font-size:13px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+_nm+'</span><span style="font-size:9px;padding:1px 5px;border:1px solid '+_col+';color:'+_col+';border-radius:4px;flex-shrink:0">'+_catLbl(_cat)+'</span></div>'
        +'<div style="font-size:11px;color:#bbb;line-height:1.35;max-height:30px;overflow:hidden">'+_desc+'</div>'
        +_prog
        +'<div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px"><span style="font-size:11px;color:'+_col+';font-weight:bold">'+_stLbl(q.status)+'</span><span style="font-size:11px;color:var(--gold)">+₡'+(q.rewardCr||0).toLocaleString()+' · VE+'+(q.rewardVe||0)+'</span></div>'
        +'</div>';
    }).join('');
    return '<div style="position:absolute;bottom:12px;left:12px;right:12px;z-index:15;display:flex;gap:8px;overflow-x:auto;padding:6px 4px;background:linear-gradient(180deg,transparent,rgba(13,26,42,.88) 30%);scrollbar-width:thin;scrollbar-color:#cc88ff44 transparent" data-scroll-id="story-strip">'
      +'<div style="position:sticky;left:0;display:flex;align-items:center;gap:4px;padding:6px 10px;background:rgba(80,40,140,.7);border:1px solid #cc88ff;border-radius:8px;color:#e0b3ff;font-size:11px;font-weight:bold;flex-shrink:0;white-space:nowrap;z-index:2">📜 '+(_en?'Scenario':'시나리오')+' '+_stories.length+'</div>'
      +_cards
      +'<style>@keyframes _storyStripPulse{0%,100%{box-shadow:0 0 12px rgba(204,136,255,.45)}50%{box-shadow:0 0 20px rgba(204,136,255,.75)}}</style>'
      +'</div>';
  }catch(e){console.warn('[storyStrip] build fail:',e);return '';}
}

// ─── 시나리오 퀘 상세 팝업 (스트립 카드 클릭) ──────────────────────
function _openStoryQuestDetail(pid,qid){
  try{
    const G=window.G;
    const _en=(window.I18N&&I18N.getLang&&I18N.getLang()==='en');
    const _sub=window._subTokens||function(s){return s;};
    const _qlist=(G&&G.quests&&G.quests[pid])||[];
    const _q=_qlist.find(function(x){return x&&x.id===qid;});
    if(!_q){if(typeof window.notify==='function')window.notify((_en?'Scenario quest not found: ':'시나리오 퀘를 찾을 수 없습니다: ')+qid,'err');return;}
    const _idx=_qlist.indexOf(_q);
    const _cat=_q.category||'sub';
    const _catLbl=_cat==='main'?(_en?'[Main Scenario]':'[메인 시나리오]'):_cat==='hidden'?(_en?'[Hidden Scenario]':'[히든 시나리오]'):(_en?'[Sub Scenario]':'[서브 시나리오]');
    const _objHtml=_q.objectives&&_q.objectives.length?_q.objectives.map(function(o){
      const _lbl=(typeof o.label==='object'?((_en?o.label.en:o.label.ko)||o.label.ko||o.label.en||''):(o.label||'')).toString();
      return '<div style="padding:4px 8px;background:rgba(204,136,255,.08);border-left:2px solid #cc88ff;margin:4px 0;font-size:12px;color:#e0b3ff">• '+_lbl+'</div>';
    }).join(''):'';
    const _rewardHtml='<div style="margin-top:10px;padding:8px 10px;background:rgba(212,175,55,.08);border:1px solid rgba(212,175,55,.3);border-radius:6px"><div style="font-size:11px;color:var(--dim);margin-bottom:4px">'+(_en?'Rewards':'보상')+'</div><div style="display:flex;gap:10px;flex-wrap:wrap;font-size:13px"><span style="color:var(--gold);font-weight:bold">+₡'+(_q.rewardCr||0).toLocaleString()+'</span><span style="color:var(--cyan);font-weight:bold">VE+'+(_q.rewardVe||0)+'</span>'+((_q.rewardItems||[]).map(function(it){return '<span style="color:#88ff88">📦 '+(it.id||'')+' ×'+(it.qty||1)+'</span>';}).join(''))+'</div></div>';
    const _bodyHtml='<div style="padding:4px 2px"><div style="font-size:11px;color:#cc88ff;font-weight:bold;margin-bottom:4px">'+_catLbl+' · NPC: '+(_q.npcIc||'')+' '+_sub(_q.npc||'')+'</div><div style="font-size:13px;color:var(--txt);line-height:1.6;margin-bottom:8px;white-space:pre-line">'+_sub(_q.desc||'')+'</div><div style="font-size:11px;color:var(--dim);margin-top:8px">'+(_en?'Objectives:':'목표:')+'</div>'+_objHtml+_rewardHtml+'</div>';
    const _btns=[];
    if(_q.status==='available'){
      _btns.push({txt:(_en?'✓ Accept':'✓ 수락'),cls:'btn-green',fn:function(){
        if(typeof window.closeModal==='function')window.closeModal();
        if(typeof window.acceptQuest==='function')window.acceptQuest(pid,_idx);
        try{if(G._currentHubTab==='main' && typeof window.rerenderTab==='function' && typeof window.renderMain==='function')window.rerenderTab(window.renderMain);}catch(e){}
      }});
    } else if(_q.status==='done'){
      _btns.push({txt:(_en?'💰 Claim Reward':'💰 보상 수령'),cls:'btn-gold',fn:function(){
        if(typeof window.closeModal==='function')window.closeModal();
        if(typeof window.completeQuest==='function')window.completeQuest(pid,_idx);
        try{if(G._currentHubTab==='main' && typeof window.rerenderTab==='function' && typeof window.renderMain==='function')window.rerenderTab(window.renderMain);}catch(e){}
      }});
    }
    _btns.push({txt:(_en?'Open Quests':'퀘 탭 열기'),cls:'',fn:function(){if(typeof window.closeModal==='function')window.closeModal();if(typeof window.hubTab==='function')window.hubTab('quest');}});
    _btns.push({txt:(_en?'Close':'닫기'),cls:'',fn:function(){if(typeof window.closeModal==='function')window.closeModal();}});
    if(typeof window.openModal==='function'){
      window.openModal((_q.ic||'⭐')+' '+(_q.nm||(_en?'Scenario Quest':'시나리오 퀘')),_bodyHtml,_btns);
    }
  }catch(e){console.warn('[storyStrip] detail fail:',e);if(typeof window.notify==='function')window.notify('상세 표시 실패: '+e.message,'err');}
}

window._buildStoryQuestStripHTML=_buildStoryQuestStripHTML;
window._openStoryQuestDetail=_openStoryQuestDetail;
console.log('[main-hub-story-strip] Loaded — _buildStoryQuestStripHTML + _openStoryQuestDetail');
})();
