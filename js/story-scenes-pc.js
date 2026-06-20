// ═══════════════════════════════════════════════════════════════════
// DESTINATION EARTH — PC 전용 시나리오 컷씬·대화 시스템
//   · Electron(PC) 빌드에서만 로드됨
//   · 웹 PWA 배포 제외 (firebase.json ignore + service-worker no-precache)
//   · 캐릭터 이미지 폴백: img/chars-hd/ → img/chars/
//   · 데이터 출처: Doc/DE_시나리오_정리본.md §2 (영웅 첫만남 대화)
// ═══════════════════════════════════════════════════════════════════
(function(){
  if(typeof window==='undefined') return;
  if(window.STORY_SCENES_PC) return;  // 중복 로드 방지

  // ─── 변수 치환 (시나리오 §0) — 언어별 기본값 적용 ───
  function _curLang(){
    return (window.I18N && window.I18N.getLang) ? window.I18N.getLang() : 'ko';
  }
  function rep(s){
    if(typeof s!=='string') return s;
    // 공용 토큰 치환(game.js _subTokens, i18n 키 기반 = N언어)에 위임 — 단일 소스
    if(window._subTokens) return window._subTokens(s);
    // 폴백 (game.js 미로드 시): 동일 규칙을 i18n 키로 처리
    var p = (window.G && window.G.profile) || {};
    var T = (window.I18N && I18N.t) ? (k=>I18N.t(k)) : (k=>k);
    var defCmd=T('ui.commanderDefault'), defShip=T('ui.shipDefault'),
        defFlag=T('ship.flagshipDefault'), defCompany=T('ui.companyDefault'), flagSfx=T('ship.mustangSuffix');
    return s
      .replace(/\{사령관\}/g, p.name || defCmd).replace(/\{commander\}/gi, p.name || defCmd)
      .replace(/\{함선\}/g, p.ship || defShip).replace(/\{ship\}/gi, p.ship || defShip)
      .replace(/\{기함\}/g, p.ship ? (p.ship + flagSfx) : defFlag).replace(/\{flagship\}/gi, p.ship ? (p.ship + flagSfx) : defFlag)
      .replace(/\{회사\}/g, p.company || defCompany).replace(/\{company\}/gi, p.company || defCompany);
  }

  // ─── 캐릭터 이미지 경로 해석 ───
  // key 타입별 라우팅:
  //   1. 'commander'             → img/chars/commander_{m|f}{0-3}.png (성별·외형 자동)
  //   2. 'baekgu*', 'hero0X' etc.→ img/chars/{key}.png (기존 캐릭터)
  //   3. 'delivery_F0X' 'gather_F0X' 'combat_F0X' 'explore_F0X' (Phase NPC 폴백)
  //                              → img/quests/{key}.png
  //   4. 'system'                → img/chars/system.png (시스템·UI)
  //   5. 기타                    → img/chars/{key}.png 시도, onerror 시 system 폴백
  // HD 시도는 명시적 opt-in (window.STORY_USE_HD = true)
  function _ver(){
    return window._GAME_VER ? '?v=' + encodeURIComponent(window._GAME_VER) : '';
  }
  function _resolveCommanderImg(){
    var p = (window.G && window.G.profile) || {};
    // 성별: FTUE에서 setGender() 호출 시 'male' / 'female' 문자열 저장됨
    // 폴백: 미설정 시 'male' 기본
    var gender = (p.gender === 'female' || p.gender === 'f') ? 'f' : 'm';
    // 외형 stage 0~3 — game.js의 _commanderStage() 우선 사용 (레벨·진행도 기반)
    // 없으면 G.profile.appearance, 그것도 없으면 1번 기본
    var idx = 1;
    if(typeof window._commanderStage === 'function'){
      try{ idx = Math.max(0, Math.min(3, window._commanderStage())); }catch(e){}
    } else if(typeof p.appearance === 'number'){
      idx = Math.max(0, Math.min(3, p.appearance));
    }
    return 'commander_' + gender + idx;
  }
  // HD 파일명 매핑 — img/chars/H/ 폴더의 실제 파일명이 게임 키와 다른 경우
  // (사용자 업로드 2026-06-07: baekgu1 의 HD 원본이 baekgu002.png 로 저장됨)
  var _HD_FILENAME_MAP = {
    'baekgu1': 'baekgu002',
    'baekgu1_surprise': 'baekgu_surprise'
  };
  function _charImgPath(key){
    var resolvedKey = key || 'system';
    // commander → 성별·외형 자동 해석
    if(resolvedKey === 'commander'){
      resolvedKey = _resolveCommanderImg();
    }
    // Phase NPC 폴백 키 (img/quests/ 경로)
    if(/^(delivery|gather|combat|explore)_F0[1-7]$/.test(resolvedKey)){
      return 'img/quests/' + resolvedKey + '.png' + _ver();
    }
    // 사용자 요청 2026-06-08: 모든 캐릭터(사령관·백구·영웅·NPC) HD 폴더(img/chars/H/) 우선 시도
    //   · 영웅 HD 이미지를 향후 H/ 폴더에 추가하면 자동 활용 (현재 hero01~08 미존재 → onerror 폴백)
    //   · onerror 체인: img/chars/H/ → img/chars-hd/ → img/chars/ → system.png
    var hdName = _HD_FILENAME_MAP[resolvedKey] || resolvedKey;
    return 'img/chars/H/' + hdName + '.png' + _ver();
  }

  // ─── 대화 팝업 UI ───
  // opts: {
  //   scenes: [{char:'hero01', name:'이순신', color:'#ffd700', text:'...'}, ...]
  //   onDone: function()
  // }
  function showCharDialog(opts){
    try {
      _showCharDialogInner(opts);
    } catch(err){
      console.error('[STORY_SCENES_PC] showCharDialog FAILED:', err);
      // 폴백: 에러 시에도 onDone 호출하여 다음 단계로 진행 보장
      if(opts && typeof opts.onDone === 'function') {
        try { opts.onDone(); } catch(e){}
      }
    }
  }
  function _showCharDialogInner(opts){
    if(!opts || !opts.scenes || !opts.scenes.length){
      if(typeof opts === 'object' && typeof opts.onDone === 'function') opts.onDone();
      return;
    }

    // 기존 오버레이 제거
    var existing = document.getElementById('story-scene-overlay');
    if(existing) existing.remove();

    var sceneIdx = 0;
    var scenes = opts.scenes;

    // ── 오버레이 컨테이너 ──
    var ov = document.createElement('div');
    ov.id = 'story-scene-overlay';
    ov.style.cssText = [
      'position:fixed','left:0','top:0','width:100vw','height:100vh',
      'background:rgba(0,0,0,0.88)','z-index:99999',
      'display:flex','align-items:stretch',
      'cursor:pointer','font-family:inherit',
      'animation:storySceneIn 0.35s ease-out'
    ].join(';');

    // 애니메이션 한 번만 추가
    if(!document.getElementById('story-scene-style')){
      var st = document.createElement('style');
      st.id = 'story-scene-style';
      st.textContent = '@keyframes storySceneIn{from{opacity:0}to{opacity:1}}'
                     + '#story-scene-overlay .ssc-name{animation:nameIn 0.4s ease-out}'
                     + '#story-scene-overlay .ssc-text{animation:textIn 0.5s ease-out}'
                     + '@keyframes nameIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}'
                     + '@keyframes textIn{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:translateX(0)}}'
                     + '#story-scene-overlay .ssc-img{animation:imgIn 0.5s ease-out}'
                     + '@keyframes imgIn{from{opacity:0;transform:scale(0.94)}to{opacity:1;transform:scale(1)}}';
      document.head.appendChild(st);
    }

    // ── 캐릭터 패널 ──
    // 사용자 요청 2026-06-09: 좌측 30% / 우측 70% 고정 비율
    //   · 모든 컷씬에서 동일한 비율 — 동적 리사이즈 제거
    //   · 이미지는 패널 100% 채움 (1024×1024 원본을 패널 폭에 맞춰 표시)
    var charPanel = document.createElement('div');
    charPanel.style.cssText = [
      'flex:0 0 30%','display:flex','align-items:center','justify-content:center',
      'background:linear-gradient(135deg,rgba(20,40,80,0.45),rgba(0,0,0,0.7))',
      'border-right:1px solid rgba(0,243,255,0.25)',
      'padding:16px','box-sizing:border-box','overflow:hidden'
    ].join(';');

    var charImg = document.createElement('img');
    charImg.className = 'ssc-img';
    charImg.style.cssText = [
      'width:100%','height:auto','max-width:100%','max-height:96vh',
      'object-fit:contain','image-rendering:high-quality',
      'filter:drop-shadow(0 0 32px rgba(0,243,255,0.5))'
    ].join(';');
    // 실패 시 fallback 체인:
    //   chars/H/ → chars-hd/ → chars/ → chars/system.png
    //   (Phase NPC는 별도 quests/ 폴백 — 코드에서 직접 처리)
    charImg.onerror = function(){
      var src = this.src;
      var key = this.dataset.charKey || 'system';
      // 1) HD(H/) 실패 → chars-hd/ 또는 chars/ 시도
      if(src.indexOf('/chars/H/') > -1){
        // 우선 chars-hd/ 시도 (영웅 등 다른 HD 자산)
        this.src = 'img/chars-hd/' + key + '.png' + _ver();
        return;
      }
      if(src.indexOf('chars-hd') > -1){
        this.src = 'img/chars/' + key + '.png' + _ver();
        return;
      }
      // 2) chars/ 실패 + Phase NPC 패턴 → quests/ 시도
      if(src.indexOf('/chars/') > -1 && /^(delivery|gather|combat|explore)_F0[1-7]$/.test(key)){
        this.src = 'img/quests/' + key + '.png' + _ver();
        return;
      }
      // 3) 모든 경로 실패 → system 폴백
      if(src.indexOf('system.png') < 0){
        this.src = 'img/chars/system.png' + _ver();
      } else {
        // 최종 폴백도 실패한 경우 onerror 끊어서 무한루프 방지
        this.onerror = null;
      }
    };
    charPanel.appendChild(charImg);

    // ── 대사 패널 (오른쪽 2/3) ──
    var dialogPanel = document.createElement('div');
    dialogPanel.style.cssText = [
      'flex:1','display:flex','flex-direction:column','justify-content:center',
      'padding:60px 60px 60px 55px','box-sizing:border-box','color:#fff','overflow:hidden'
    ].join(';');

    var nameBox = document.createElement('div');
    nameBox.className = 'ssc-name';
    nameBox.style.cssText = [
      'font-size:32px','font-weight:bold','letter-spacing:3px',
      'margin-bottom:28px','text-shadow:0 0 16px currentColor'
    ].join(';');

    var textBox = document.createElement('div');
    textBox.className = 'ssc-text';
    textBox.style.cssText = [
      'font-size:22px','line-height:1.85','letter-spacing:0.5px',
      'color:#eaf6ff','text-shadow:0 1px 3px rgba(0,0,0,0.9)',
      'max-width:820px','min-height:180px','word-break:keep-all'
    ].join(';');

    var progressBox = document.createElement('div');
    progressBox.style.cssText = [
      'margin-top:36px','display:flex','justify-content:space-between','align-items:center',
      'color:rgba(255,255,255,0.55)','font-size:13px','letter-spacing:0.5px'
    ].join(';');

    var hintLeft = document.createElement('div');
    var counterRight = document.createElement('div');

    progressBox.appendChild(hintLeft);
    progressBox.appendChild(counterRight);

    dialogPanel.appendChild(nameBox);
    dialogPanel.appendChild(textBox);
    dialogPanel.appendChild(progressBox);

    ov.appendChild(charPanel);
    ov.appendChild(dialogPanel);
    document.body.appendChild(ov);

    // 언어별 안내
    function getHint(){
      var lang = (window.I18N && window.I18N.getLang) ? window.I18N.getLang() : 'ko';
      return lang === 'en' ? 'Click / Enter to continue · ESC to skip' : '클릭 / 엔터 = 다음 · ESC = 건너뛰기';
    }

    function renderScene(){
      var s = scenes[sceneIdx];
      if(!s){ closeOverlay(); return; }
      // 매 장면 애니메이션 재시작
      charImg.style.animation = 'none';
      nameBox.style.animation = 'none';
      textBox.style.animation = 'none';
      void charImg.offsetWidth;
      charImg.style.animation = '';
      nameBox.style.animation = '';
      textBox.style.animation = '';

      // commander 는 성별·외형 자동 해석된 키를 dataset 에 저장
      // (폴백 시 정확한 파일명 사용 + 디버그 시 실제 시도 키 추적)
      var _charKey = s.char || 'system';
      if(_charKey === 'commander'){ _charKey = _resolveCommanderImg(); }
      charImg.dataset.charKey = _charKey;
      charImg.src = _charImgPath(s.char || 'system');
      // 사용자 요청 2026-06-09: 모든 컷씬 30%/70% 고정 — 동적 리사이즈 제거
      //   · 이미지는 패널 폭을 100% 채움 (1024×1024 원본을 패널에 맞춰 등비축소)
      //   · img/chars/H/ 원본을 우선 사용 (HD 풀해상도)
      charPanel.style.flex = '0 0 30%';
      charPanel.style.padding = '16px';
      charImg.style.width = '100%';
      charImg.style.height = 'auto';
      charImg.style.maxWidth = '100%';
      charImg.style.maxHeight = '96vh';
      charImg.style.objectFit = 'contain';
      charImg.style.imageRendering = 'high-quality';
      charImg.style.filter = 'drop-shadow(0 0 32px rgba(0,243,255,0.5))';
      console.log('[STORY_SCENES_PC] scene', sceneIdx+1, '/', scenes.length,
                  '· char:', s.char, '→ resolved:', _charKey);
      charImg.alt = rep(s.name || '');
      nameBox.textContent = rep(s.name || '');
      nameBox.style.color = s.color || '#00f3ff';
      textBox.textContent = rep(s.text || '');
      hintLeft.textContent = getHint();
      counterRight.textContent = (sceneIdx+1) + ' / ' + scenes.length;
      // 대사 보이스 재생 (음성연동 §3·4): vid(num) → VOICE_MANIFEST 우선, 없으면 char+text 텍스트매칭 폴백. 직전 보이스 자동 정지.
      try{
        if(window.VoicePlayer && typeof window.VoicePlayer.playLine==='function') window.VoicePlayer.playLine({vid:s.vid, char:s.char||'', text:s.text||''});
        else if(window.AudioMgr && typeof window.AudioMgr.playVoice==='function') window.AudioMgr.playVoice(s.char||'', s.text||'');
      }catch(e){}
    }

    function next(){
      sceneIdx++;
      if(sceneIdx >= scenes.length){
        closeOverlay();
      } else {
        renderScene();
      }
    }

    var _closed = false;
    function closeOverlay(){
      if(_closed)return;
      _closed = true;
      try{ if(window.VoicePlayer && typeof window.VoicePlayer.stopVoice==='function') window.VoicePlayer.stopVoice(); }catch(e){}
      try{ if(window.AudioMgr && typeof window.AudioMgr.stopVoice==='function') window.AudioMgr.stopVoice(); }catch(e){}
      document.removeEventListener('keydown', onKey);
      ov.style.transition = 'opacity 0.3s';
      ov.style.opacity = '0';
      setTimeout(function(){
        if(ov.parentNode) ov.parentNode.removeChild(ov);
        if(typeof opts.onDone === 'function'){
          try{ opts.onDone(); }catch(e){ console.error('[STORY_SCENES_PC] onDone error:', e); }
        }
      }, 300);
    }

    function onKey(e){
      if(e.key === 'Escape' || e.key === 'Esc'){ e.preventDefault(); closeOverlay(); }
      else if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); next(); }
    }

    ov.addEventListener('click', next);
    document.addEventListener('keydown', onKey);

    // 안전망: 60초 동안 사용자 응답 없으면 자동 닫힘 (게임 영구 잠금 방지)
    // 사용자가 클릭/엔터 하면 onKey/next 가 발화 → 활동 감지로 타임아웃 리셋
    var _idleTimer = null;
    function _resetIdle(){
      if(_idleTimer)clearTimeout(_idleTimer);
      _idleTimer = setTimeout(function(){
        if(!_closed){
          console.warn('[STORY_SCENES_PC] 60s idle — auto-closing overlay to unblock game');
          closeOverlay();
        }
      }, 60000);
    }
    _resetIdle();
    ov.addEventListener('click', _resetIdle);
    document.addEventListener('keydown', _resetIdle);

    renderScene();
  }

  // ═══════════════════════════════════════════════════════════════════
  // 영웅 첫만남 대화 데이터 — Doc/DE_시나리오_정리본.md §2 기반
  // 색상: 영웅별 시그니처 컬러 (game.js 엔딩 큐와 동일)
  // ═══════════════════════════════════════════════════════════════════
  var H01_KO = [
    {char:'hero01', name:'이순신', color:'#ffd700', text:'…100년. 내가 100년을 잠들었군.'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'이순신 제독님.'},
    {char:'hero01', name:'이순신', color:'#ffd700', text:'그대가 나를 깨웠소? …지구는.'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'아직 봉쇄 중입니다.'},
    {char:'hero01', name:'이순신', color:'#ffd700', text:'치크스는 아직 있소. 그렇다면 아직 싸워야 할 이유가 있군.'},
    {char:'hero01', name:'이순신', color:'#ffd700', text:'이길 수 있는 싸움이오?'},
    {char:'baekgu1', name:'백구', color:'#66ddff', text:'이겨야 하는 싸움입니다.'},
    {char:'hero01', name:'이순신', color:'#ffd700', text:'말이 다르군. 이기겠다고 하지 않고 이겨야 한다고 했소. 그것이 더 정직한 대답이오. 합류하겠소.'},
    {char:'hero01', name:'이순신', color:'#ffd700', text:'{사령관}. 나는 불필요한 전투는 하지 않소. 이기는 전쟁만 합니다.'}
  ];

  // H04 — 사용자 타임라인 기준 #7 (이순신 영입 전 등장 가능 → 분기)
  function H04_KO_dyn(){
    var hasYi = !!(window.G && window.G.heroes && window.G.heroes.indexOf('H01') >= 0);
    var hasMarco = !!(window.G && window.G.heroes && window.G.heroes.indexOf('H08') >= 0);
    var lines = [
      {char:'hero04', name:'유리 가가린', color:'#66ddff', text:'Поехали! 출발합시다! …아, 아직 전쟁 중인가요?'},
      {char:'commander', name:'{사령관}', color:'#00f3ff', text:'네. 100년이 지났습니다.'},
      {char:'hero04', name:'유리 가가린', color:'#66ddff', text:'100년이요? 그러면 제가 처음 우주에 갔을 때가 170년도 더 됐겠네요. 시간은 정말 이상한 것 같아요.'},
      {char:'hero04', name:'유리 가가린', color:'#66ddff', text:'그래도 우주는 여전히 아름다울 거예요.'}
    ];
    if(hasYi){
      lines.push({char:'hero04', name:'유리 가가린', color:'#66ddff', text:'이순신 제독이시군요! 당신의 한산도 해전을 공부한 적이 있어요. 소형 함선은 내 전문이에요.'});
    } else if(hasMarco){
      lines.push({char:'hero04', name:'유리 가가린', color:'#66ddff', text:'와, 마르코 폴로 선생까지! 100년 만의 새 동료가 한꺼번에 둘이라니. 소형 함선은 제 전문이에요 — 기대하셔도 좋습니다.'});
    } else {
      lines.push({char:'hero04', name:'유리 가가린', color:'#66ddff', text:'{사령관}이시군요. 100년 만의 첫 동료가 저라니, 영광입니다. 소형 함선은 제 전문이에요 — 어디든 데려다 드리죠.'});
    }
    return lines;
  }

  // H08 — 사용자 타임라인 기준 #6 (첫 영웅 → 분기)
  function H08_KO_dyn(){
    var hasYi = !!(window.G && window.G.heroes && window.G.heroes.indexOf('H01') >= 0);
    var lines = [
      {char:'hero08', name:'마르코 폴로', color:'#ffcc66', text:'허허. 100년을 기다렸소. 이런 통쾌한 광경을.'},
      {char:'commander', name:'{사령관}', color:'#00f3ff', text:'당신은…?'},
      {char:'hero08', name:'마르코 폴로', color:'#ffcc66', text:'마르코 폴로요. 제네시스 프로토콜의 마르코 폴로.'},
      {char:'hero08', name:'마르코 폴로', color:'#ffcc66', text:'치크스가 날 붙잡아 놓더니만, 이 함선의 무역 경로 데이터를 빼내려고 했소. 물론 안 줬지요. 나는 거래를 강요당한 적이 없소.'}
    ];
    if(hasYi){
      lines.push({char:'hero08', name:'마르코 폴로', color:'#ffcc66', text:'제독께서 알아봐주시는구먼. 자, 이제 거래합시다. 내가 가진 모든 항로 정보와 무역 네트워크를 드리겠소.'});
    } else {
      lines.push({char:'hero08', name:'마르코 폴로', color:'#ffcc66', text:'사령관 양반, 이 함선의 주인이오? 마음에 드는 눈을 가졌소. 자, 이제 거래합시다. 내가 가진 모든 항로 정보와 무역 네트워크를 드리겠소.'});
    }
    lines.push({char:'hero08', name:'마르코 폴로', color:'#ffcc66', text:'대신 지구까지 데려다 주시오.'});
    return lines;
  }

  var H05_KO = [
    {char:'hero05', name:'호레이쇼 넬슨', color:'#aaffaa', text:'…이순신. 설마 당신이오?'},
    {char:'hero01', name:'이순신', color:'#ffd700', text:'나요. 넬슨. 오래됐소.'},
    {char:'hero05', name:'호레이쇼 넬슨', color:'#aaffaa', text:'200년의 시차, 두 대륙의 거리… 그것을 이 손바닥이 메우는구려.'},
    {char:'hero05', name:'호레이쇼 넬슨', color:'#aaffaa', text:'England expects— 아니. 이제는 지구가 기대한다. 합시다, {사령관}.'}
  ];

  var H02_KO = [
    {char:'hero02', name:'장영실', color:'#9ee7ff', text:'구출? 나를 가두고 있던 놈들이 내 설계도를 빼앗아 갔소. 100년 전에. 그것도 없이 무슨 구출이오.'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'찾았습니다. 설계도 1권을 가지고 있습니다.'},
    {char:'hero02', name:'장영실', color:'#9ee7ff', text:'…!'},
    {char:'hero02', name:'장영실', color:'#9ee7ff', text:'내 손으로 직접 완성해야지. 나의 절친이자 거북선의 본 설계자 나대용의 정신을 이을 수 있는 자는 이제 없소.'},
    {char:'hero02', name:'장영실', color:'#9ee7ff', text:'다른 사람이 만든 거북선은 안 됩니다. 내 손으로 복원해보겠소!'}
  ];

  var H06_KO = [
    {char:'hero06', name:'A. 아인슈타인', color:'#cc99ff', text:'당신이 왔군요. 예상했습니다.'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'예상했다고요?'},
    {char:'hero06', name:'A. 아인슈타인', color:'#cc99ff', text:'나는 100년 전에 이 순간을 계산했습니다. 당신이 이 좌표에 올 것을, 그 시각까지. 오차 범위 0.3%.'},
    {char:'hero06', name:'A. 아인슈타인', color:'#cc99ff', text:'그리고 백구. 이휘소 박사와 내가 설계했습니다. 역시간 전송 방정식으로.'},
    {char:'hero06', name:'A. 아인슈타인', color:'#cc99ff', text:'치크스도 찾지 못할 위치, 글리제 균열의 간섭을 받는 프록시마B. {사령관}의 각성 지점이었습니다.'},
    {char:'baekgu1', name:'백구', color:'#66ddff', text:'사령관… 저도 이제 알겠습니다. 저는 100년간 당신을 기다리도록 설계된 프로그램이었습니다.'},
    {char:'hero06', name:'A. 아인슈타인', color:'#cc99ff', text:'당신이 유일하게 이 두 가지를 동시에 가졌기 때문입니다. 분노와 자비.'},
    {char:'hero06', name:'A. 아인슈타인', color:'#cc99ff', text:'치크스를 쓰러뜨릴 분노, 그리고 치크스를 이해할 자비. 분노만 있으면 또 다른 우르사 메이저를 만들 뿐이에요.'}
  ];

  var H07_KO = [
    {char:'hero07', name:'니콜라 테슬라', color:'#66ffff', text:'들어오지 마세요! 지금 정밀 조정 중이에요!'},
    {char:'baekgu1', name:'백구', color:'#66ddff', text:'10만 크레딧 무역 실적 보유 팀이 왔습니다.'},
    {char:'hero07', name:'니콜라 테슬라', color:'#66ffff', text:'진짜요? 확인해볼게요. 데이터 스캔. …맞네요. 정확히 100,247 크레딧. 좋습니다.'},
    {char:'hero02', name:'장영실', color:'#9ee7ff', text:'(코일을 살피며 0.3mm 핀 오차를 맨눈으로 잡아낸다) 천 년 전에도 나는 이렇게 했소.'},
    {char:'hero07', name:'니콜라 테슬라', color:'#66ffff', text:'완성이에요! 100년 만에 완성! 이제 갈 수 있어요!'}
  ];

  var H03_KO = [
    {char:'hero03', name:'광개토대왕', color:'#ff6644', text:'1,700년. 내 땅이 다시 내 손에 돌아왔구나.'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'광개토대왕.'},
    {char:'hero03', name:'광개토대왕', color:'#ff6644', text:'{사령관}이라 했소? 내 땅을 되찾아준 자가 나타나기를 기다렸소. 무엇을 원하오.'},
    {char:'hero03', name:'광개토대왕', color:'#ff6644', text:'고구려 정복자가 지구를 정복당한 채 두겠느냐. 내가 선봉에 선다.'},
    {char:'hero03', name:'광개토대왕', color:'#ff6644', text:'{사령관}, 최종 명령권은 그대에게 있소.'}
  ];

  // 정적 영웅 = 배열, 동적(분기 필요) 영웅 = 함수
  var HERO_RECRUIT_SCENES_KO = {
    H01: H01_KO,
    H02: H02_KO,
    H03: H03_KO,
    H04: H04_KO_dyn,
    H05: H05_KO,
    H06: H06_KO,
    H07: H07_KO,
    H08: H08_KO_dyn
  };

  // ═══════════════════════════════════════════════════════════════════
  // 영문 대사 (8영웅 전체 — 한글판과 1:1 대응)
  // ═══════════════════════════════════════════════════════════════════
  var H01_EN = [
    {char:'hero01', name:'Yi Sun-sin', color:'#ffd700', text:'…One hundred years. I slept for a century.'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'Admiral Yi.'},
    {char:'hero01', name:'Yi Sun-sin', color:'#ffd700', text:'You woke me? …And Earth?'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'Still under blockade.'},
    {char:'hero01', name:'Yi Sun-sin', color:'#ffd700', text:'The Cheeks remain. Then there is still a reason to fight.'},
    {char:'hero01', name:'Yi Sun-sin', color:'#ffd700', text:'Is this a war we can win?'},
    {char:'baekgu1', name:'Baekgu', color:'#66ddff', text:'It is a war we must win.'},
    {char:'hero01', name:'Yi Sun-sin', color:'#ffd700', text:'Different words. You did not say "we shall," but "we must." A more honest answer. I will join you.'},
    {char:'hero01', name:'Yi Sun-sin', color:'#ffd700', text:'{사령관}. I do not fight unnecessary battles. Only wars I can win.'}
  ];

  // H04 — 동적(이순신 영입 여부에 따라 분기)
  function H04_EN_dyn(){
    var hasYi = !!(window.G && window.G.heroes && window.G.heroes.indexOf('H01') >= 0);
    var hasMarco = !!(window.G && window.G.heroes && window.G.heroes.indexOf('H08') >= 0);
    var lines = [
      {char:'hero04', name:'Yuri Gagarin', color:'#66ddff', text:'Поехали! Let\'s go! …Wait, the war is still on?'},
      {char:'commander', name:'{사령관}', color:'#00f3ff', text:'Yes. One hundred years have passed.'},
      {char:'hero04', name:'Yuri Gagarin', color:'#66ddff', text:'A century? Then it\'s been over 170 years since my first spaceflight. Time really is strange.'},
      {char:'hero04', name:'Yuri Gagarin', color:'#66ddff', text:'But the universe must still be beautiful.'}
    ];
    if(hasYi){
      lines.push({char:'hero04', name:'Yuri Gagarin', color:'#66ddff', text:'Admiral Yi Sun-sin! I studied your Battle of Hansando. Small craft are my specialty.'});
    } else if(hasMarco){
      lines.push({char:'hero04', name:'Yuri Gagarin', color:'#66ddff', text:'Marco Polo himself! Two new comrades in a single century — what an honor. Small craft are my specialty — expect great things.'});
    } else {
      lines.push({char:'hero04', name:'Yuri Gagarin', color:'#66ddff', text:'{사령관}. So I am the first comrade in a hundred years — what an honor. Small craft are my specialty — I\'ll take you anywhere.'});
    }
    return lines;
  }

  // H08 — 동적(이순신 영입 여부에 따라 분기, 첫 영웅 경로 대응)
  function H08_EN_dyn(){
    var hasYi = !!(window.G && window.G.heroes && window.G.heroes.indexOf('H01') >= 0);
    var lines = [
      {char:'hero08', name:'Marco Polo', color:'#ffcc66', text:'Ha. A hundred years I waited — for a sight as satisfying as this.'},
      {char:'commander', name:'{사령관}', color:'#00f3ff', text:'And you are…?'},
      {char:'hero08', name:'Marco Polo', color:'#ffcc66', text:'Marco Polo. Marco Polo of the Genesis Protocol.'},
      {char:'hero08', name:'Marco Polo', color:'#ffcc66', text:'The Cheeks held me captive trying to extract trade route data. I refused, of course. I have never been forced into a deal.'}
    ];
    if(hasYi){
      lines.push({char:'hero08', name:'Marco Polo', color:'#ffcc66', text:'Ah, the Admiral recognizes me. Good — let us make a deal. All my routes, all my networks — yours.'});
    } else {
      lines.push({char:'hero08', name:'Marco Polo', color:'#ffcc66', text:'Commander. So you\'re the master of this ship? I like the look in your eyes. Let\'s make a deal — all my routes, all my networks, yours.'});
    }
    lines.push({char:'hero08', name:'Marco Polo', color:'#ffcc66', text:'In exchange — take me back to Earth.'});
    return lines;
  }

  var H05_EN = [
    {char:'hero05', name:'Horatio Nelson', color:'#aaffaa', text:'…Yi Sun-sin. Surely it can\'t be you?'},
    {char:'hero01', name:'Yi Sun-sin', color:'#ffd700', text:'It is. Nelson. A long time.'},
    {char:'hero05', name:'Horatio Nelson', color:'#aaffaa', text:'Two centuries apart, two continents removed… and now bridged by a single handshake.'},
    {char:'hero05', name:'Horatio Nelson', color:'#aaffaa', text:'England expects— no. Now Earth expects. Let us begin, {사령관}.'}
  ];

  var H02_EN = [
    {char:'hero02', name:'Jang Yeong-sil', color:'#9ee7ff', text:'A rescue? My captors stole my blueprints a century ago. Without them, what good is a rescue?'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'I found them. I have one of the blueprint volumes.'},
    {char:'hero02', name:'Jang Yeong-sil', color:'#9ee7ff', text:'…!'},
    {char:'hero02', name:'Jang Yeong-sil', color:'#9ee7ff', text:'I must complete it with my own hands. No one alive can carry on the spirit of Na Dae-yong, my dear friend and the original architect of the Geobukseon.'},
    {char:'hero02', name:'Jang Yeong-sil', color:'#9ee7ff', text:'A turtle ship built by others will not do. I will restore it myself!'}
  ];

  var H06_EN = [
    {char:'hero06', name:'A. Einstein', color:'#cc99ff', text:'So you came. As I predicted.'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'Predicted?'},
    {char:'hero06', name:'A. Einstein', color:'#cc99ff', text:'I calculated this moment a hundred years ago. That you would arrive at these coordinates — at this exact hour. Margin of error: 0.3 percent.'},
    {char:'hero06', name:'A. Einstein', color:'#cc99ff', text:'And Baekgu — Dr. Lee Hwi-so and I designed him. Through a reverse-time transmission equation.'},
    {char:'hero06', name:'A. Einstein', color:'#cc99ff', text:'A location even the Cheeks could not find — Proxima B, perturbed by the 글리제 균열 Rift. {사령관}\'s awakening point.'},
    {char:'baekgu1', name:'Baekgu', color:'#66ddff', text:'Commander… now I understand. I am a program designed to wait a hundred years — for you.'},
    {char:'hero06', name:'A. Einstein', color:'#cc99ff', text:'Because you are the only one who carries both at once. Wrath, and mercy.'},
    {char:'hero06', name:'A. Einstein', color:'#cc99ff', text:'Wrath to bring down the Cheeks. Mercy to understand them. Wrath alone only builds another Ursa Major.'}
  ];

  var H07_EN = [
    {char:'hero07', name:'Nikola Tesla', color:'#66ffff', text:'Don\'t come in! I\'m in the middle of fine-tuning!'},
    {char:'baekgu1', name:'Baekgu', color:'#66ddff', text:'The team with 100,000 credits in trade record has arrived.'},
    {char:'hero07', name:'Nikola Tesla', color:'#66ffff', text:'Really? Let me check. Data scan. …Yes. Exactly 100,247 credits. Excellent.'},
    {char:'hero02', name:'Jang Yeong-sil', color:'#9ee7ff', text:'(Inspecting the coil — catches a 0.3mm pin offset with his bare eye) A thousand years ago, I did it just like this.'},
    {char:'hero07', name:'Nikola Tesla', color:'#66ffff', text:'It\'s done! Complete after a hundred years! Now we can go!'}
  ];

  var H03_EN = [
    {char:'hero03', name:'Gwanggaeto the Great', color:'#ff6644', text:'One thousand seven hundred years. My land returns to my hand.'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'King Gwanggaeto.'},
    {char:'hero03', name:'Gwanggaeto the Great', color:'#ff6644', text:'{사령관}, you said? I have waited for one who would reclaim my land. Speak — what is your wish?'},
    {char:'hero03', name:'Gwanggaeto the Great', color:'#ff6644', text:'Would a conqueror of Goguryeo let Earth remain conquered? I shall lead the vanguard.'},
    {char:'hero03', name:'Gwanggaeto the Great', color:'#ff6644', text:'{사령관} — the final command is yours.'}
  ];

  var HERO_RECRUIT_SCENES_EN = {
    H01: H01_EN,
    H02: H02_EN,
    H03: H03_EN,
    H04: H04_EN_dyn,
    H05: H05_EN,
    H06: H06_EN,
    H07: H07_EN,
    H08: H08_EN_dyn
  };

  function getScenes(hid){
    var lang = (window.I18N && window.I18N.getLang) ? window.I18N.getLang() : 'ko';
    var src = (lang === 'en' && HERO_RECRUIT_SCENES_EN[hid])
      ? HERO_RECRUIT_SCENES_EN[hid]
      : HERO_RECRUIT_SCENES_KO[hid];
    if(!src) return null;
    // 함수면 호출해서 동적 분기 적용, 배열이면 그대로
    return (typeof src === 'function') ? src() : src;
  }

  // ═══════════════════════════════════════════════════════════════════
  // 시나리오 영웅 등장 순서 — 사용자 타임라인 확정
  // 기반: Doc/QUEST_TIMELINE_HERO_ROUTE.md + Doc/galaxy_map_hero_route_analysis.html
  // 실제 지도 이동 경로 기반 — 백트래킹 최소화
  //
  //   step #6  → H08 마르코 폴로     (우르사 알파, CH05)
  //   step #7  → H04 유리 가가린      (카스텔룸, CH04)
  //   step #10 → H01 이순신          (아이젠콕, CH03)
  //   step #17 → H05 호레이쇼 넬슨    (슈멜츠, CH06)
  //   step ★   → H02 장영실          (넥서스 프라임 귀환, CH07)
  //   step #19 → H03 광개토대왕      (글리제 재방문, CH13~14)
  //   step #23 → H06 아인슈타인      (캅테인b 균열, CH09)
  //   step #31 → H07 니콜라 테슬라    (볼티움, CH10~12)
  // ═══════════════════════════════════════════════════════════════════
  var SCENARIO_ORDER = ['H08','H04','H01','H05','H02','H03','H06','H07'];

  // 영웅 ↔ 행성 캐논 매핑 + 영입 조건
  // planet: 캐논 영입 행성 (현재 게임 코드의 행성 ID 추정 — 매핑 필요시 game.js 측 PLANET_DEF 참조)
  // cond: 영입 추가 조건 함수 (해당 영웅이 등장하기 위해 필요한 추가 조건)
  // step: 사용자 타임라인 step 번호 (디버그/로깅용)
  var HERO_PLANET_MAP = {
    H08: { planet:'P19', step:6,  ko:'우르사 알파',        cond:function(){ return true; } },
    H04: { planet:'P04', step:7,  ko:'카스텔룸',         cond:function(){ return true; } },
    H01: { planet:'P13', step:10, ko:'아이젠콕',         cond:function(){
      // 난중일기 영인본(G18) 보유 시
      return !!(window.G && window.G.inventory && window.G.inventory.find(function(i){ return i.id==='G18' && i.qty>0; }));
    }},
    H05: { planet:'P14', step:17, ko:'슈멜츠',        cond:function(){ return true; } },
    H02: { planet:'P06', step:18, ko:'넥서스 프라임 (귀환)', cond:function(){
      // 설계도 1권 보유 (H05 넬슨 영입 후 자연 획득 가정)
      // 단순화: H05 영입 완료 시 = 설계도 1권 확보 상태로 간주
      return !!(window.G && window.G.heroes && window.G.heroes.indexOf('H05') >= 0);
    }},
    H03: { planet:'P08', step:19, ko:'글리제 (재)',   cond:function(){
      // 4,100만 크레딧 누적 (경매 자본)
      return !!(window.G && (window.G.credits||0) >= 41000000);
    }},
    H06: { planet:'P28', step:23, ko:'캅테인b 균열',        cond:function(){ return true; } },
    H07: { planet:'P09', step:31, ko:'볼티움',        cond:function(){
      // 무역 누적 100,000 크레딧 (game.js 측의 _tradeTotalEarned 또는 유사 필드)
      var total = 0;
      if(window.G){
        total = window.G._tradeTotalEarned || window.G.tradeTotal || window.G._totalTradeProfit || 0;
      }
      return total >= 100000;
    }}
  };

  // 현재 행성에서 등장 가능한 다음 영웅 (시나리오 순서 + 조건 충족)
  function nextHeroAtPlanet(pid){
    var next = nextStoryHero();
    if(!next) return null;
    var info = HERO_PLANET_MAP[next];
    if(!info) return null;
    if(info.planet !== pid) return null;
    if(typeof info.cond === 'function' && !info.cond()) return null;
    return next;
  }

  function canHeroAppear(hid){
    var idx = SCENARIO_ORDER.indexOf(hid);
    if(idx < 0) return true;
    if(!window.G || !window.G.heroes) return idx === 0;
    var prev = SCENARIO_ORDER.slice(0, idx);
    for(var i=0;i<prev.length;i++){
      if(window.G.heroes.indexOf(prev[i]) < 0) return false;
    }
    return true;
  }

  function nextStoryHero(){
    if(!window.G || !window.G.heroes) return SCENARIO_ORDER[0];
    for(var i=0;i<SCENARIO_ORDER.length;i++){
      if(window.G.heroes.indexOf(SCENARIO_ORDER[i]) < 0) return SCENARIO_ORDER[i];
    }
    return null;  // 8영웅 전원 영입 완료
  }

  // ─── 영웅 영입 시 트리거 ───
  // 중복 방지: 같은 세션 내 짧은 시간 내 중복 호출 차단 (300ms)
  // _scenesSeen 영구 기록은 유지하되, 사용자가 강제 재생 가능
  var _lastTriggeredAt = {};
  function triggerHeroRecruitScene(hid, onDone){
    console.log('[STORY_SCENES_PC] triggerHeroRecruitScene called for', hid);
    var scenes = getScenes(hid);
    if(!scenes){
      console.warn('[STORY_SCENES_PC] No scenes defined for', hid);
      if(typeof onDone === 'function') onDone();
      return;
    }
    // 짧은 시간 내 중복 호출 차단 (recruitHero + showHeroRecruit 양쪽 트리거 충돌 방지)
    // bugfix 2026-06-11: 억제 시 onDone 호출 제거 — triggerScene과 동일한 무한루프 위험 차단
    var now = Date.now();
    if(_lastTriggeredAt[hid] && (now - _lastTriggeredAt[hid]) < 1500){
      console.log('[STORY_SCENES_PC] duplicate trigger suppressed for', hid);
      return;
    }
    if(document.getElementById('story-scene-overlay')){
      console.log('[STORY_SCENES_PC] hero scene trigger ignored — dialog already open:', hid);
      return;
    }
    _lastTriggeredAt[hid] = now;
    if(!window.G) window.G = {};
    if(!window.G._scenesSeen) window.G._scenesSeen = {};
    var key = 'hero_' + hid;
    if(window.G._scenesSeen[key]){
      console.log('[STORY_SCENES_PC] already-seen scene for', hid, '— playing again anyway (testing-friendly)');
      // 변경: 이전엔 스킵했지만, 사용자 테스트 편의로 항상 재생 (단, "본 적 있음" 플래그는 유지)
    }
    // 버그 수정 2026-06-08: _scenesSeen 마킹을 컷씬 실제 완료 후로 지연
    //   · 이전: showCharDialog 호출 전 즉시 true → 사용자가 중간에 닫으면 "본 적 있음" 오류
    //   · 수정: onDone 콜백에서 마킹 → 끝까지 본 경우에만 기록
    console.log('[STORY_SCENES_PC] opening cutscene for', hid, '— scene count:', scenes.length);
    showCharDialog({ scenes: scenes, onDone: function(){
      window.G._scenesSeen[key] = true;
      if(typeof window.saveGame === 'function'){
        try{ window.saveGame(true); }catch(e){}
      }
      if(typeof onDone === 'function') onDone();
    }});
  }

  // 사용자 편의: 강제 재생 (이미 본 플래그 무시)
  function forceReplay(hid){
    if(window.G && window.G._scenesSeen) delete window.G._scenesSeen['hero_' + hid];
    delete _lastTriggeredAt[hid];
    return triggerHeroRecruitScene(hid);
  }

  // ═══════════════════════════════════════════════════════════════════
  // Phase 시나리오 컷씬 — ID 기반 트리거 (PHASE1/2/3+_CUTSCENES_KO/EN)
  // ═══════════════════════════════════════════════════════════════════
  function _getPhaseScene(sceneId){
    var lang = _curLang();
    var sources = lang === 'en'
      ? [window.PHASE1_CUTSCENES_EN, window.PHASE2_CUTSCENES_EN, window.PHASE3_CUTSCENES_EN, window.PHASE4_CUTSCENES_EN, window.PHASE5_CUTSCENES_EN, window.PHASE6_CUTSCENES_EN]
      : [window.PHASE1_CUTSCENES_KO, window.PHASE2_CUTSCENES_KO, window.PHASE3_CUTSCENES_KO, window.PHASE4_CUTSCENES_KO, window.PHASE5_CUTSCENES_KO, window.PHASE6_CUTSCENES_KO];
    for(var i=0;i<sources.length;i++){
      if(sources[i] && sources[i][sceneId]) return sources[i][sceneId];
    }
    // EN 미존재 시 KO 폴백
    if(lang === 'en'){
      var fallback = [window.PHASE1_CUTSCENES_KO, window.PHASE2_CUTSCENES_KO, window.PHASE3_CUTSCENES_KO, window.PHASE4_CUTSCENES_KO, window.PHASE5_CUTSCENES_KO, window.PHASE6_CUTSCENES_KO];
      for(var j=0;j<fallback.length;j++){
        if(fallback[j] && fallback[j][sceneId]) return fallback[j][sceneId];
      }
    }
    return null;
  }

  function triggerScene(sceneId, onDone){
    if(!sceneId){
      if(typeof onDone === 'function') onDone();
      return;
    }
    var scenes = _getPhaseScene(sceneId);
    if(!scenes){
      console.warn('[STORY_SCENES_PC] No scene found for ID:', sceneId);
      if(typeof onDone === 'function') onDone();
      return;
    }
    // 선행조건 게이트 (지시서 2026-06-18): requires 미충족 컷신은 재생하지 않고 유도 멘트 표시
    try{
      if(typeof window.sceneGateBlocked === 'function'){
        var _gate = window.sceneGateBlocked(sceneId);
        if(_gate && _gate.blocked){
          console.log('[STORY_SCENES_PC] scene gated — prereq missing:', sceneId, _gate.missing0);
          if(typeof window.showStoryGateHint === 'function') window.showStoryGateHint(_gate.missing0, 'scene_'+sceneId);
          return;  // 컷신 차단 — onDone 호출 안 함(완료로 오판 방지)
        }

      }
    }catch(e){ console.warn('[STORY_SCENES_PC] gate check failed', e); }
    if(!window.G) window.G = {};
    if(!window.G._scenesSeen) window.G._scenesSeen = {};
    // bugfix 2026-06-11: 컷씬 오버레이가 이미 열려 있으면 재트리거 무시 (onDone 호출 금지)
    //   — spawn 재시도 안전망이 시청 중에 발화해도 대화창이 중복 생성되지 않게
    if(document.getElementById('story-scene-overlay')){
      console.log('[STORY_SCENES_PC] scene trigger ignored — dialog already open:', sceneId);
      return;
    }
    // 짧은 시간 중복 트리거 차단
    var now = Date.now();
    if(_lastTriggeredAt[sceneId] && (now - _lastTriggeredAt[sceneId]) < 1500){
      console.log('[STORY_SCENES_PC] duplicate scene trigger suppressed:', sceneId);
      // bugfix 2026-06-11: 여기서 onDone()을 호출하면 "끝까지 시청"으로 오판 마킹 →
      //   spawnPhasedQuests의 자동복구(미시청 인트로 마킹 해제)와 맞물려
      //   spawn→트리거→억제→onDone→재렌더→spawn… 무한 동기 루프로 렌더러가 크래시.
      //   (새 게임/불러오기 직후 게임이 죽던 원인) 중복 억제는 "완료"가 아니므로 그냥 return.
      return;
    }
    _lastTriggeredAt[sceneId] = now;
    // 버그 수정 2026-06-08: _scenesSeen 마킹을 onDone 으로 지연
    //   · 이전: 트리거 직후 즉시 true → 중간에 닫으면 spawnPhasedQuests 마이그레이션이
    //           "본 적 있음"으로 오판해 영구히 재생 안 됨
    //   · 수정: 사용자가 끝까지 본 시점에만 마킹
    console.log('[STORY_SCENES_PC] opening scene:', sceneId, '— lines:', scenes.length);
    showCharDialog({ scenes: scenes, onDone: function(){
      window.G._scenesSeen['scene_' + sceneId] = true;
      if(typeof window.saveGame === 'function'){
        try{ window.saveGame(true); }catch(e){}
      }
      // 사용자 요청 2026-06-09: 컷씬 종료 후 메인 탭 재렌더 — 다음 컷씬 버튼 자동 활성화
      try{
        var G=window.G||{};
        if(G._currentHubTab==='main' && typeof window.rerenderTab==='function' && typeof window.renderMain==='function'){
          window.rerenderTab(window.renderMain);
        }
      }catch(e){}
      if(typeof onDone === 'function') onDone();
    }});
  }

  // 강제 재생 (씬 ID) — 사용자 수동 클릭 시 _scenesSeen 마킹 일시 해제로 dedup 우회
  function forceReplayScene(sceneId){
    if(window.G && window.G._scenesSeen) delete window.G._scenesSeen['scene_' + sceneId];
    delete _lastTriggeredAt[sceneId];
    return triggerScene(sceneId);
  }

  // ═══════════════════════════════════════════════════════════════════
  // 전역 노출
  // ═══════════════════════════════════════════════════════════════════
  window.STORY_SCENES_PC = {
    version: '1.2.0',
    showCharDialog: showCharDialog,
    triggerHeroRecruitScene: triggerHeroRecruitScene,
    triggerScene: triggerScene,
    forceReplay: forceReplay,
    forceReplayScene: forceReplayScene,
    canHeroAppear: canHeroAppear,
    nextStoryHero: nextStoryHero,
    nextHeroAtPlanet: nextHeroAtPlanet,
    SCENARIO_ORDER: SCENARIO_ORDER,
    HERO_PLANET_MAP: HERO_PLANET_MAP,
    rep: rep,
    // 테스트용: 콘솔에서 window.STORY_SCENES_PC.testScene('H01') 가능
    testScene: function(hid){
      var scenes = getScenes(hid);
      if(!scenes){ console.warn('[STORY_SCENES_PC] No scenes for', hid); return; }
      console.log('[STORY_SCENES_PC] manual testScene for', hid);
      showCharDialog({ scenes: scenes });
    },
    // 모든 영웅 컷씬 순차 재생 (테스트용)
    playAll: function(){
      var order = ['H08','H04','H01','H05','H02','H03','H06','H07'];
      function next(i){
        if(i>=order.length){ console.log('[STORY_SCENES_PC] playAll done'); return; }
        showCharDialog({ scenes: getScenes(order[i]), onDone: function(){ next(i+1); } });
      }
      next(0);
    }
  };

  console.log('[STORY_SCENES_PC] Loaded v' + window.STORY_SCENES_PC.version
    + ' — scenario order:', SCENARIO_ORDER.join(' → '));
})();
