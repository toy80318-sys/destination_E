// ─────────────────────────────────────────────────────────────────────────
// prologue.js — 신규 게임 전체화면 프롤로그 "봉쇄된 하늘"
// 기획: 01_GDD/기획서_오프닝_프롤로그.md (20비트) + 기획서_프롤로그_이미지프롬프트.md (10컷)
//
// ⚠ 사용자 지시: 캐릭터-대화 컷신(showCharDialog)과 별개의 전용 풀스크린 연출.
//   풀스크린 배경 이미지(켄번스 느린 줌) + 자막 한 호흡씩 페이드 인/아웃(타이핑 X)
//   + SFX/BGM/음성 동기. ESC 스킵 가능.
//
// 노출: window.showPrologue(onDone)
//   · 1회만 호출(트리거/가드는 호출부 png-image.js startGame() 에서 G._prologueSeen 으로 처리).
//   · 자산이 없어도 깨지지 않게 폴백(이미지 없으면 검은 배경, 음성 없으면 가독 타이머).
//
// 자산(drop-in):
//   · 배경: 02_Assets/img/prologue/scene01.png ~ scene10.png
//   · SFX : 02_Assets/audio/sfx/prologue_*.mp3 (AudioMgr.playSfx 로 큐, 확장자 제외 이름)
//   · BGM : 02_Assets/audio/bgm/prologue.mp3 (AudioMgr.playBgm('prologue'))
//   · 음성: VoicePlayer.playVoice(vid) — 매니페스트에 vid 있으면 재생, 없으면 폴백
// ─────────────────────────────────────────────────────────────────────────
(function () {
  'use strict';

  var IMG_BASE = '02_Assets/img/prologue/';
  var SFX_BASE = '02_Assets/audio/sfx/';

  function ver() {
    try { return (window._GAME_VER) ? ('?v=' + encodeURIComponent(window._GAME_VER)) : ''; }
    catch (e) { return ''; }
  }
  function t(key) {
    try {
      if (window.I18N && I18N.t) {
        var cmd = '';
        try { cmd = (window.G && G.profile && G.profile.name) || ''; } catch (e2) {}
        return I18N.t(key, { commander: cmd });
      }
    } catch (e) {}
    return key;
  }

  // ── 비트 정의 ──────────────────────────────────────────────────────
  //   i18n  : 자막 키 (prologue.b1 ~ prologue.b20)
  //   scene : 풀스크린 배경 (scene01~scene10) — 비트↔컷 매핑(이미지프롬프트 문서)
  //   sfx   : 비트 시작 시 1회 큐(AudioMgr.playSfx 이름, 없으면 null)
  //   amb   : 'on' = space_ambience 루프 시작, 'off' = 정지
  //   vid   : 백구 음성 num (문서 §4: 2~14 = 660~672). 없으면 자막+타이머 폴백.
  //   hold  : 음성 없을 때 자막 표시 시간(ms). 길이로 호흡 조절.
  var BEATS = [
    { i: 'prologue.b1',  scene: 'scene01', sfx: 'prologue_skyfall',      vid: null, hold: 3200 },
    { i: 'prologue.b2',  scene: 'scene01', sfx: null,                    vid: 660,  hold: 3600 },
    { i: 'prologue.b3',  scene: 'scene02', sfx: 'prologue_lab_fire',     vid: 661,  hold: 5200 },
    { i: 'prologue.b4',  scene: 'scene03', sfx: null,                    vid: 662,  hold: 4400 },
    { i: 'prologue.b5',  scene: 'scene03', sfx: null,                    vid: 663,  hold: 3800 },
    { i: 'prologue.b6',  scene: 'scene04', sfx: 'prologue_cryo_seal',    vid: 664,  hold: 5600 },
    { i: 'prologue.b7',  scene: 'scene05', sfx: 'prologue_launch',       vid: 665,  hold: 5600 },
    { i: 'prologue.b8',  scene: 'scene06', sfx: null,                    vid: 666,  hold: 4400 },
    { i: 'prologue.b9',  scene: 'scene06', sfx: 'prologue_void_fade',    vid: 667,  hold: 4600 },
    { i: 'prologue.b10', scene: 'scene07', sfx: 'prologue_ship_flyby',   vid: 668,  hold: 5200 },
    { i: 'prologue.b11', scene: 'scene07', sfx: 'prologue_distant_boom', vid: 669,  hold: 3800 },
    { i: 'prologue.b12', scene: 'scene08', sfx: null, amb: 'on',         vid: 670,  hold: 3000 },
    { i: 'prologue.b13', scene: 'scene08', sfx: null,                    vid: 671,  hold: 5200 },
    { i: 'prologue.b14', scene: 'scene08', sfx: null,                    vid: 672,  hold: 6000 },
    { i: 'prologue.b15', scene: 'scene08', sfx: null,                    vid: 673,  hold: 4400 },
    { i: 'prologue.b16', scene: 'scene09', sfx: 'prologue_signal', amb: 'off', vid: null, hold: 4400 },
    { i: 'prologue.b17', scene: 'scene09', sfx: null,                    vid: null, hold: 3000 },
    { i: 'prologue.b18', scene: 'scene09', sfx: 'prologue_capsule_wake', vid: null, hold: 3800 },
    { i: 'prologue.b19', scene: 'scene09', sfx: null,                    vid: null, hold: 4200 },
    { i: 'prologue.b20', scene: 'scene10', sfx: null,                    vid: null, hold: 5200 }
  ];

  var FADE_MS = 700;     // 자막/배경 페이드 시간
  var GAP_MS  = 320;     // 자막 사이 짧은 정적(검은 호흡)

  var _running = false;

  // ── SFX/음성 안전 래퍼 ─────────────────────────────────────────────
  function sfx(name) {
    if (!name) return;
    try { if (window.AudioMgr && AudioMgr.playSfx) AudioMgr.playSfx(name, { cooldown: 0 }); } catch (e) {}
  }
  function ambience(state) {
    // space_ambience: 루프 베드. AudioMgr 풀은 일회성이라 전용 Audio 로 루프.
    try {
      if (state === 'on') {
        if (_amb) return;
        var a = new Audio(SFX_BASE + 'prologue_space_ambience.mp3' + ver());
        a.loop = true;
        var vol = 0.35;
        try {
          if (window.AudioMgr && typeof AudioMgr.master === 'number') {
            if (AudioMgr.sfxOff) vol = 0;
            else vol = 0.5 * AudioMgr.master * (typeof AudioMgr.sfx === 'number' ? AudioMgr.sfx : 1);
          }
        } catch (e2) {}
        a.volume = vol;
        a.play().catch(function () {});
        _amb = a;
      } else if (state === 'off') {
        if (_amb) { try { _amb.pause(); _amb.src = ''; } catch (e3) {} _amb = null; }
      }
    } catch (e) {}
  }
  var _amb = null;

  // 음성 재생 → onended 콜백. 재생 못 하면(파일/매니페스트 없음·OFF) false 반환.
  function playVoice(vid, onend) {
    if (vid == null) return false;
    try {
      if (window.VoicePlayer && VoicePlayer.playVoice && window.VOICE_MANIFEST && window.VOICE_MANIFEST[vid]) {
        var a = VoicePlayer.playVoice(vid, { onended: onend });
        // playVoice 는 재생 못 해도(OFF/차단) onended 를 즉시 호출(폴백) → a 가 null 이면 음성 없음 취급
        return !!a;
      }
    } catch (e) {}
    return false;
  }

  // ── BGM 덕킹(내레이션 우선 −6dB) ───────────────────────────────────
  var _bgmSaved = null;
  function duck(on) {
    try {
      if (!window.AudioMgr) return;
      if (on) {
        if (_bgmSaved == null && typeof AudioMgr.bgm === 'number') {
          _bgmSaved = AudioMgr.bgm;
          // −6dB ≈ ×0.5
          if (AudioMgr.setBgmVol) AudioMgr.setBgmVol(Math.max(0, _bgmSaved * 0.5));
        }
      } else {
        if (_bgmSaved != null && AudioMgr.setBgmVol) AudioMgr.setBgmVol(_bgmSaved);
        _bgmSaved = null;
      }
    } catch (e) {}
  }

  // ── DOM ────────────────────────────────────────────────────────────
  function buildOverlay() {
    var ov = document.getElementById('prologue-overlay');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'prologue-overlay';
      document.body.appendChild(ov);
    }
    ov.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:99999', 'background:#000',
      'display:flex', 'align-items:flex-end', 'justify-content:center',
      'overflow:hidden', 'cursor:pointer', 'opacity:0',
      'transition:opacity ' + FADE_MS + 'ms ease'
    ].join(';');
    ov.innerHTML =
      '<div id="prologue-bg" style="position:absolute;inset:0;background:#000 center/cover no-repeat;opacity:0;transition:opacity ' + FADE_MS + 'ms ease, transform 9000ms linear;transform:scale(1.0)"></div>' +
      '<div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.82) 0%,rgba(0,0,0,.25) 38%,rgba(0,0,0,0) 60%)"></div>' +
      '<div id="prologue-cap" style="position:relative;max-width:min(1100px,86vw);margin:0 auto 11vh;padding:0 24px;text-align:center;font-size:clamp(18px,2.5vw,30px);line-height:1.7;color:#eaf6ff;text-shadow:0 2px 14px rgba(0,0,0,.95);word-break:keep-all;opacity:0;transition:opacity ' + FADE_MS + 'ms ease;font-weight:500;letter-spacing:.3px"></div>' +
      '<div id="prologue-skip" style="position:absolute;top:18px;right:24px;font-size:13px;color:rgba(255,255,255,.55);letter-spacing:1px;pointer-events:none"></div>';
    return ov;
  }

  function _runPrologue(onDone) {
    if (_running) { if (typeof onDone === 'function') onDone(); return; }
    _running = true;

    var ov = buildOverlay();
    var bg = ov.querySelector('#prologue-bg');
    var cap = ov.querySelector('#prologue-cap');
    var skip = ov.querySelector('#prologue-skip');
    skip.textContent = t('prologue.skipHint');

    var idx = -1;
    var curScene = null;
    var timer = null;
    var ended = false;

    function clearTimer() { if (timer) { clearTimeout(timer); timer = null; } }

    function finish() {
      if (ended) return;
      ended = true;
      clearTimer();
      _running = false;
      try { document.removeEventListener('keydown', onKey, true); } catch (e) {}
      try { ov.removeEventListener('click', onClick); } catch (e) {}
      try { if (window.VoicePlayer && VoicePlayer.stop) VoicePlayer.stop(); } catch (e) {}
      ambience('off');
      duck(false);
      // BGM: 프롤로그 곡 페이드아웃(허브 진입 시 호출부가 hub BGM 으로 교체)
      try { if (window.AudioMgr && AudioMgr.stopBgm) AudioMgr.stopBgm(); } catch (e) {}
      // 오버레이 페이드아웃 후 제거
      ov.style.opacity = '0';
      setTimeout(function () {
        try { if (ov && ov.parentNode) ov.parentNode.removeChild(ov); } catch (e) {}
        if (typeof onDone === 'function') { try { onDone(); } catch (e) {} }
      }, FADE_MS + 40);
    }

    function setScene(scene) {
      if (scene === curScene) return;
      curScene = scene;
      var url = IMG_BASE + scene + '.png' + ver();
      // 이미지 존재 확인 — 없으면 검은 배경 유지(onerror 폴백)
      var probe = new Image();
      probe.onload = function () {
        bg.style.backgroundImage = "url('" + url + "')";
        bg.style.opacity = '1';
        // 켄번스: 살짝 줌
        bg.style.transform = 'scale(1.0)';
        // 강제 리플로우 후 천천히 확대
        void bg.offsetWidth;
        bg.style.transform = 'scale(1.08)';
      };
      probe.onerror = function () {
        bg.style.backgroundImage = 'none';
        bg.style.opacity = '0';   // 검은 배경 폴백
      };
      probe.src = url;
    }

    function next() {
      if (ended) return;
      idx++;
      if (idx >= BEATS.length) { finish(); return; }
      var b = BEATS[idx];

      // 자막 페이드아웃 → 짧은 정적 → 다음 비트
      cap.style.opacity = '0';

      timer = setTimeout(function () {
        if (ended) return;
        // 배경 전환(컷 바뀔 때만)
        setScene(b.scene);
        // 앰비언스 토글
        if (b.amb === 'on') ambience('on');
        else if (b.amb === 'off') ambience('off');
        // SFX 큐
        sfx(b.sfx);
        // 자막
        cap.innerHTML = t(b.i);
        void cap.offsetWidth;
        cap.style.opacity = '1';

        // 음성 우선: 음성 끝나면 다음 비트. 없으면 가독 타이머.
        duck(true);
        var hasVoice = playVoice(b.vid, function () {
          // 음성 종료 → 잠깐 여운 후 다음
          if (ended) return;
          timer = setTimeout(next, 500);
        });
        if (!hasVoice) {
          timer = setTimeout(next, (b.hold || 3500));
        }
      }, GAP_MS);
    }

    function onKey(e) {
      if (e.key === 'Escape' || e.keyCode === 27) {
        e.preventDefault(); e.stopPropagation();
        finish();
      }
    }
    function onClick() { /* 클릭으로 다음 비트 진행(가독 보조) */
      if (ended) return;
      clearTimer();
      try { if (window.VoicePlayer && VoicePlayer.stop) VoicePlayer.stop(); } catch (e) {}
      next();
    }

    document.addEventListener('keydown', onKey, true);
    ov.addEventListener('click', onClick);

    // BGM 시작
    try { if (window.AudioMgr && AudioMgr.playBgm) AudioMgr.playBgm('prologue'); } catch (e) {}

    // 오버레이 페이드 인 → 첫 비트
    void ov.offsetWidth;
    ov.style.opacity = '1';
    timer = setTimeout(next, 500);
  }

  // 배경 이미지(scene01)가 없으면 프롤로그를 건너뛴다 — 이미지 drop-in 전까지 검은 화면으로 막히는 것 방지. 2026-06-26.
  //   scene01.png 첨부 시 자동으로 프롤로그 재생됨.
  function showPrologue(onDone) {
    var pr = new Image();
    pr.onload = function () { _runPrologue(onDone); };
    pr.onerror = function () { if (typeof onDone === 'function') { try { onDone(); } catch (e) {} } };
    pr.src = IMG_BASE + 'scene01.png' + ver();
  }
  window.showPrologue = showPrologue;
})();
