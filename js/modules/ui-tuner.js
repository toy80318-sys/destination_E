// ══════════════════════════════════════════════════════════════════
// DESTINATION EARTH — UI 튜너 (개발용 실시간 UI/UX 가이드 도구)
//   · 버튼/이미지/팝업·카드/폰트·HUD 치수를 슬라이더로 실시간 조절
//   · 값은 CSS 변수(:root)로 적용 → 게임을 실제로 보면서 튜닝
//   · localStorage 저장/복원, JSON 내보내기/가져오기, 리셋
//   · 토글: Ctrl+Shift+U  (개발 빌드에서만 런처 버튼 노출)
//   · 사용자 요청 2026-06-14
// ══════════════════════════════════════════════════════════════════
(function(){
  if(typeof window==='undefined'||typeof document==='undefined')return;

  var LS_KEY='de_ui_tuner_v1';

  // ── 토큰 정의 ──────────────────────────────────────────────────
  // id        : CSS 변수명(--ui-<id>) + 저장 키
  // group     : 패널 그룹
  // min/max/step/unit/def : 슬라이더 설정 + 기본값
  // (CSS 적용은 아래 _OVERRIDE_CSS 에서 var(--ui-<id>) 참조)
  var TOKENS=[
    // 버튼
    {id:'btn-minh',     g:'버튼',    label:'기본 버튼 최소높이', min:0,  max:64,  step:1, unit:'px', def:0},
    {id:'btn-pady',     g:'버튼',    label:'기본 버튼 상하패딩', min:2,  max:24,  step:1, unit:'px', def:9},
    {id:'navbtn-pady',  g:'버튼',    label:'좌측 메뉴버튼 패딩', min:2,  max:22,  step:1, unit:'px', def:7},
    {id:'sysbtn-pady',  g:'버튼',    label:'시스템 토글 높이(패딩)', min:4, max:26, step:1, unit:'px', def:12},
    {id:'btn-bg-alpha', g:'버튼',    label:'버튼 배경 불투명도(투명방지)', min:0, max:1, step:0.05, unit:'', def:0},

    // 이미지
    {id:'reward-img',     g:'이미지', label:'보상 팝업 아이템 이미지', min:80, max:360, step:4, unit:'px', def:268},
    {id:'reward-img-many',g:'이미지', label:'보상 팝업 이미지(다수)',  min:80, max:320, step:4, unit:'px', def:224},
    {id:'part-guide-img', g:'이미지', label:'파츠 가이드 아이콘',     min:24, max:96,  step:2, unit:'px', def:48},
    {id:'char-panel',     g:'이미지', label:'컷씬 초상 패널 폭',      min:20, max:50,  step:1, unit:'%',  def:30},
    {id:'title-banner',   g:'이미지', label:'타이틀 배너 최대폭',     min:300,max:960, step:10,unit:'px', def:640},

    // 팝업/카드
    {id:'popup-card-min', g:'팝업·카드', label:'보상 그리드 카드 최소폭', min:180, max:520, step:10, unit:'px', def:300},
    {id:'modal-maxw',     g:'팝업·카드', label:'모달 최대폭',           min:360, max:1100, step:20, unit:'px', def:760},

    // 폰트/HUD
    {id:'ui-zoom',  g:'폰트·HUD', label:'전체 UI 배율(zoom)', min:0.8, max:1.4, step:0.02, unit:'', def:1},
    {id:'hud-h',    g:'폰트·HUD', label:'상단 HUD 높이',     min:36,  max:78,   step:1,    unit:'px', def:48}
  ];

  // 현재 값
  var state={};
  function _defaults(){ var o={}; TOKENS.forEach(function(t){o[t.id]=t.def;}); return o; }

  function _load(){
    try{ var raw=localStorage.getItem(LS_KEY); state= raw? Object.assign(_defaults(), JSON.parse(raw)) : _defaults(); }
    catch(e){ state=_defaults(); }
  }
  function _save(){ try{ localStorage.setItem(LS_KEY, JSON.stringify(state)); }catch(e){} }

  // ── CSS 변수 적용 ─────────────────────────────────────────────
  function _applyVars(){
    var r=document.documentElement;
    TOKENS.forEach(function(t){
      var v=state[t.id];
      r.style.setProperty('--ui-'+t.id, v + (t.unit==='px'?'px':(t.unit==='%'?'%':'')));
    });
    // 전체 UI 줌은 body.zoom 으로 별도 적용
    try{ document.body.style.zoom = state['ui-zoom']||1; }catch(e){}
  }

  // 게임 요소에 토큰을 연결하는 오버라이드 CSS (var 미적용 클래스 요소 보강)
  var _OVERRIDE_CSS = [
    '#hud{height:var(--ui-hud-h,48px) !important}',
    // 기본 버튼: 인라인 배경이 없는 버튼만 불투명 배경 보강(투명방지) + 최소높이/패딩
    '.btn{min-height:var(--ui-btn-minh,0px);padding-top:var(--ui-btn-pady,9px);padding-bottom:var(--ui-btn-pady,9px)}',
    // 호버/비활성 상태는 자체 스타일 유지(글자 가림 방지). 기본 alpha=0 → 평상시 전역 변화 없음.
    '.btn:not([style*="background"]):not(:hover):not(:disabled){background-color:rgba(18,26,45,var(--ui-btn-bg-alpha,0))}',
    '.hn-btn{padding-top:var(--ui-navbtn-pady,7px);padding-bottom:var(--ui-navbtn-pady,7px)}',
    '#sys-sec-hdr{padding-top:var(--ui-sysbtn-pady,12px);padding-bottom:var(--ui-sysbtn-pady,6px)}'
  ].join('\n');

  function _injectOverrideStyle(){
    if(document.getElementById('ui-tuner-style'))return;
    var st=document.createElement('style');
    st.id='ui-tuner-style';
    st.textContent=_OVERRIDE_CSS;
    document.head.appendChild(st);
  }

  function applyAll(){ _injectOverrideStyle(); _applyVars(); }

  // ── 패널 UI ──────────────────────────────────────────────────
  var panelEl=null;
  function _buildPanel(){
    if(panelEl)return panelEl;
    var p=document.createElement('div');
    p.id='ui-tuner-panel';
    p.style.cssText=[
      'position:fixed','top:12px','right:12px','z-index:2147483000',
      'width:320px','max-height:88vh','overflow-y:auto',
      'background:rgba(8,12,22,0.96)','border:1px solid #2a4a6a','border-radius:10px',
      'box-shadow:0 8px 32px rgba(0,0,0,.6)','color:#dfe9f5',
      "font-family:'Malgun Gothic','맑은 고딕',sans-serif",'font-size:12px',
      'padding:10px 12px 14px','display:none'
    ].join(';');

    // 그룹별 슬라이더
    var groups={};
    TOKENS.forEach(function(t){ (groups[t.g]=groups[t.g]||[]).push(t); });

    var html='';
    html+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">';
    html+='<div style="font-weight:bold;color:#7fd1ff;font-size:13px;letter-spacing:.5px">🎛 UI 튜너</div>';
    html+='<button id="uit-close" style="background:none;border:none;color:#9ab;cursor:pointer;font-size:16px;line-height:1">✕</button>';
    html+='</div>';
    Object.keys(groups).forEach(function(gName){
      html+='<div style="margin:8px 0 4px;color:#ffce6b;font-weight:bold;border-bottom:1px solid #243a52;padding-bottom:2px">'+gName+'</div>';
      groups[gName].forEach(function(t){
        html+='<div style="margin:7px 0">';
        html+='<div style="display:flex;justify-content:space-between;margin-bottom:2px">';
        html+='<span style="color:#bcd">'+t.label+'</span>';
        html+='<span id="uit-val-'+t.id+'" style="color:#7fd1ff;font-weight:bold">'+state[t.id]+t.unit+'</span>';
        html+='</div>';
        html+='<input type="range" id="uit-rng-'+t.id+'" min="'+t.min+'" max="'+t.max+'" step="'+t.step+'" value="'+state[t.id]+'" style="width:100%;accent-color:#3fa9ff;cursor:pointer">';
        html+='</div>';
      });
    });
    // 액션 버튼
    html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:12px;border-top:1px solid #243a52;padding-top:10px">';
    html+='<button id="uit-export" style="padding:7px;background:#1d6fbf;border:none;border-radius:5px;color:#fff;font-weight:bold;cursor:pointer">📋 값 복사(JSON)</button>';
    html+='<button id="uit-css" style="padding:7px;background:#2a6f3f;border:none;border-radius:5px;color:#fff;font-weight:bold;cursor:pointer">📋 CSS 복사</button>';
    html+='<button id="uit-import" style="padding:7px;background:#5a4a8f;border:none;border-radius:5px;color:#fff;cursor:pointer">📥 값 붙여넣기</button>';
    html+='<button id="uit-reset" style="padding:7px;background:#7a3a3a;border:none;border-radius:5px;color:#fff;cursor:pointer">↺ 초기화</button>';
    html+='</div>';
    html+='<div style="margin-top:8px;font-size:10px;color:#789;line-height:1.5">단축키 Ctrl+Shift+U · 값은 자동 저장됩니다. 확정 후 "값 복사"로 전달하면 코드에 반영해 드립니다.</div>';
    p.innerHTML=html;
    document.body.appendChild(p);
    panelEl=p;

    // 이벤트
    p.querySelector('#uit-close').onclick=function(){ toggle(false); };
    TOKENS.forEach(function(t){
      var rng=p.querySelector('#uit-rng-'+t.id);
      var val=p.querySelector('#uit-val-'+t.id);
      rng.addEventListener('input', function(){
        var v=parseFloat(rng.value);
        state[t.id]=v;
        val.textContent=v+t.unit;
        _applyVars(); _save();
      });
    });
    p.querySelector('#uit-export').onclick=function(){
      _copy(JSON.stringify(state,null,2),'JSON 값');
    };
    p.querySelector('#uit-css').onclick=function(){
      var css=':root{\n'+TOKENS.map(function(t){return '  --ui-'+t.id+': '+state[t.id]+(t.unit||'')+';';}).join('\n')+'\n}';
      _copy(css,'CSS');
    };
    p.querySelector('#uit-import').onclick=function(){
      var raw=prompt('UI 튜너 JSON 값을 붙여넣으세요:');
      if(!raw)return;
      try{ state=Object.assign(_defaults(), JSON.parse(raw)); _syncSliders(); _applyVars(); _save(); }
      catch(e){ alert('JSON 파싱 실패: '+e.message); }
    };
    p.querySelector('#uit-reset').onclick=function(){
      state=_defaults(); _syncSliders(); _applyVars(); _save();
    };
    return p;
  }

  function _syncSliders(){
    if(!panelEl)return;
    TOKENS.forEach(function(t){
      var rng=panelEl.querySelector('#uit-rng-'+t.id);
      var val=panelEl.querySelector('#uit-val-'+t.id);
      if(rng){ rng.value=state[t.id]; }
      if(val){ val.textContent=state[t.id]+t.unit; }
    });
  }

  function _copy(text,label){
    try{
      navigator.clipboard.writeText(text).then(function(){ _toast((label||'값')+' 복사됨 ✓'); },function(){ _fallbackCopy(text,label); });
    }catch(e){ _fallbackCopy(text,label); }
  }
  function _fallbackCopy(text,label){
    try{ var ta=document.createElement('textarea'); ta.value=text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); _toast((label||'값')+' 복사됨 ✓'); }
    catch(e){ prompt('복사 실패 — 수동 복사:', text); }
  }
  function _toast(msg){
    var t=document.createElement('div');
    t.textContent=msg;
    t.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1d6fbf;color:#fff;padding:8px 16px;border-radius:6px;z-index:2147483001;font-size:13px;box-shadow:0 4px 16px rgba(0,0,0,.5)';
    document.body.appendChild(t);
    setTimeout(function(){ t.style.transition='opacity .4s'; t.style.opacity='0'; setTimeout(function(){t.remove();},400); },1400);
  }

  // ── 토글 / 런처 ──────────────────────────────────────────────
  var open=false;
  function toggle(force){
    var p=_buildPanel();
    open = (typeof force==='boolean')? force : !open;
    p.style.display= open? 'block':'none';
    if(open)_syncSliders();
  }

  function _isDevBuild(){
    try{
      if(localStorage.getItem('de_ui_tuner_force')==='1')return true;
      var v=(window._GAME_VER||'')+'';
      return /beta|alpha|dev/i.test(v);
    }catch(e){ return true; }
  }

  function _addLauncher(){
    if(document.getElementById('ui-tuner-launch'))return;
    if(!_isDevBuild())return;
    var b=document.createElement('button');
    b.id='ui-tuner-launch';
    b.title='UI 튜너 (Ctrl+Shift+U)';
    b.textContent='🎛';
    b.style.cssText='position:fixed;bottom:10px;right:10px;z-index:2147482999;width:34px;height:34px;border-radius:50%;border:1px solid #2a4a6a;background:rgba(8,12,22,0.85);color:#7fd1ff;font-size:16px;cursor:pointer;opacity:.45;transition:opacity .2s';
    b.onmouseenter=function(){ b.style.opacity='1'; };
    b.onmouseleave=function(){ b.style.opacity='.45'; };
    b.onclick=function(){ toggle(); };
    document.body.appendChild(b);
  }

  function _bindKey(){
    document.addEventListener('keydown', function(e){
      if(e.ctrlKey && e.shiftKey && (e.key==='U'||e.key==='u')){ e.preventDefault(); toggle(); }
    });
  }

  // ── 초기화 ───────────────────────────────────────────────────
  function init(){
    _load();
    applyAll();
    _bindKey();
    _addLauncher();
    console.log('[ui-tuner] Loaded — Ctrl+Shift+U 로 토글');
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // 외부 노출
  window.UITuner={ toggle:toggle, apply:applyAll, reset:function(){ state=_defaults(); _save(); applyAll(); _syncSliders(); }, state:function(){ return Object.assign({},state); } };
})();
