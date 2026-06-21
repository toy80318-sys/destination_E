// ─────────────────────────────────────────────────────────────────────────
// voice-player.js — 대사 음성 자동 재생 (KO/EN · 남/여 분기)
// 데이터: js/data/voice-manifest.js (window.VOICE_MANIFEST / window.VOICE_BYTEXT)
// 정적 로드: index.html 에서 voice-manifest.js → voice-player.js 순.
// 자동재생: 화면 대사 텍스트를 매니페스트와 매칭해 재생(지문/괄호·{사령관} 토큰 보정).
// 명시재생: window.VoicePlayer.playVoice(num[,{female}]) / playLine({vid,char,name,text,female})
// ⚠ 타이핑 효과·요소 구조에 맞춰 디바운스/셀렉터 검증 필요 → Coder.
// ─────────────────────────────────────────────────────────────────────────
(function () {
  'use strict';
  var LS_ON = 'voiceOn', LS_VOL = 'voiceVol';
  var audio = null, lastKey = '', lastAt = 0, suppressUntil = 0;

  // 보이스 ON/OFF·볼륨은 게임 사운드 설정(AudioMgr=combat.js, de_audio_settings)을 단일 소스로 따른다.
  // 설정 UI는 AudioMgr.setVoiceOff/setVoiceVol 만 제어하므로, 여기서도 그 값을 읽어야
  // 설정 토글이 컷신/통행료 음성에 실제로 적용된다. AudioMgr 미로드 시 자체 localStorage 폴백.
  function on()  {
    try { if (window.AudioMgr && typeof AudioMgr.voiceOff !== 'undefined') return !AudioMgr.voiceOff; } catch (e) {}
    var v = localStorage.getItem(LS_ON);  return v === null ? true : v === '1';
  }
  function vol() {
    try { if (window.AudioMgr && typeof AudioMgr.voice === 'number') {
      var m = (typeof AudioMgr.master === 'number') ? AudioMgr.master : 1;
      return Math.min(1, m * AudioMgr.voice);
    } } catch (e) {}
    var v = parseFloat(localStorage.getItem(LS_VOL)); return isNaN(v) ? 0.9 : v;
  }
  function setOn(b){ localStorage.setItem(LS_ON, b ? '1' : '0'); if (!b) stop(); }
  function setVol(x){ localStorage.setItem(LS_VOL, String(x)); if (audio) audio.volume = x; }

  function norm(t){
    t = (t || '').replace(/\{\s*(사령관|commander)\s*\}/gi, '사령관');
    t = t.replace(/[\(\[\{][^\)\]\}]*[\)\]\}]/g, '');   // 지문/잔여 토큰 제거
    return t.replace(/[^가-힣A-Za-z0-9]/g, '');
  }

  function lang(){
    try {
      if (window.I18N && I18N.lang) return I18N.lang;
      if (window.G && G.lang) return G.lang;
      if (window.GAME_LANG) return window.GAME_LANG;
    } catch (e) {}
    return (document.documentElement.lang || 'ko').slice(0, 2);
  }
  function female(){
    try {
      var g = (window.G && (G.commanderGender || G.gender || G.protagonistGender || (G.profile && G.profile.gender)));
      if (g) return /f|female|여/i.test(String(g));
    } catch (e) {}
    return false;
  }
  // femOverride: true/false 면 그 성별 강제(통행료 포트레이트 성별 등), 미지정이면 주인공 성별 따름.
  function pick(e, femOverride){
    if (!e) return null;
    var en = lang() === 'en';
    var f = (femOverride === undefined || femOverride === null) ? female() : !!femOverride;
    if (en && f && e.clip_en_f) return e.clip_en_f;
    if (en && e.clip_en)        return e.clip_en;
    if (f && e.clip_f)          return e.clip_f;
    return e.clip || e.clip_en || e.clip_en_f || e.clip_f || null;
  }
  function stop(){ if (audio){ try { audio.pause(); } catch (e) {} audio = null; } }
  // §7 재녹음 대기 — 구버전 발음 클립은 자막과 불일치하므로 재생 제외(자막만):
  //   마르코 301 = marcopolo_028 (구 '볼칸' 발음 / 현재 자막은 '불칸'). 교체 후 이 항목 제거.
  var _EXCLUDE_RE = /\/marcopolo_028\.[a-z0-9]+$/i;
  function playPath(p){
    if (!p || !on()) return;
    if (_EXCLUDE_RE.test(p)) return;   // 구버전 음성 무음 폴백(자막 유지)
    stop();
    audio = new Audio(p);
    audio.volume = vol();
    audio.play().catch(function(){ /* 파일없음/차단 → 무음 폴백 */ });
  }
  // 명시 재생(playVoice/playLine) 직후, 같은 자막이 DOM에 떠 MutationObserver 자동매칭으로
  // 중복 재생(특히 성별 override 무시한 클립)되는 것을 막는 억제 창.
  function _markExplicit(){ suppressUntil = Date.now() + 1800; }
  function playVoice(num, opts){
    var e = window.VOICE_MANIFEST && window.VOICE_MANIFEST[num];
    if (!e) return;
    _markExplicit();
    var fem = (opts && ('female' in opts)) ? opts.female : undefined;
    playPath(pick(e, fem));
  }
  // 컷신/팝업 라인 재생: vid 우선, 없으면 자막 텍스트 매칭 폴백. {vid,char,name,text,female} 허용.
  function playLine(opts){
    opts = opts || {};
    if (opts.vid !== undefined && opts.vid !== null && opts.vid !== '') { playVoice(opts.vid, opts); return; }
    var n = norm(opts.text || '');
    if (!n || n.length < 2) return;
    var e = window.VOICE_BYTEXT && window.VOICE_BYTEXT[n];
    if (!e) return;
    _markExplicit();
    var fem = (opts && ('female' in opts)) ? opts.female : undefined;
    playPath(pick(e, fem));
  }
  function playByText(text){
    if (Date.now() < suppressUntil) return;   // 명시 재생 직후 자동매칭 중복 방지
    var n = norm(text);
    if (!n || n.length < 2) return;
    var e = window.VOICE_BYTEXT && window.VOICE_BYTEXT[n];
    if (!e) return;
    var now = Date.now();
    if (n === lastKey && now - lastAt < 1500) return;
    lastKey = n; lastAt = now;
    playPath(pick(e));
  }
  function observe(){
    if (!('MutationObserver' in window)) return;
    var mo = new MutationObserver(function (muts){
      for (var i = 0; i < muts.length; i++){
        var m = muts[i];
        for (var j = 0; j < m.addedNodes.length; j++){
          var nd = m.addedNodes[j];
          var txt = (nd.textContent || '').trim();
          if (txt && txt.length >= 4 && txt.length <= 400) playByText(txt);
        }
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState !== 'loading') observe();
  else document.addEventListener('DOMContentLoaded', observe);

  window.VoicePlayer = {
    playVoice: playVoice, playLine: playLine, playByText: playByText,
    stop: stop, stopVoice: stop,
    isOn: on, setOn: setOn, getVol: vol, setVol: setVol
  };
})();
