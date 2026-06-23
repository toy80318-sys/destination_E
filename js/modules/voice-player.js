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

  // 자동재생 잠금 해제: 브라우저/Electron은 첫 사용자 입력 전 오디오 재생을 막는다.
  // 첫 입력에서 무음 워밍업으로 잠금을 풀어, 이후 컷신/통행료 음성이 정상 재생되게 한다.
  var _unlocked = false;
  function _unlock(){
    if (_unlocked) return; _unlocked = true;
    try { var a = new Audio(); a.muted = true; var p = a.play(); if (p && p.catch) p.catch(function(){}); } catch (e) {}
    ['pointerdown','keydown','touchstart','click'].forEach(function(ev){ document.removeEventListener(ev, _unlock, true); });
  }
  ['pointerdown','keydown','touchstart','click'].forEach(function(ev){ document.addEventListener(ev, _unlock, true); });

  function playPath(p){
    if (!p || !on()) return;
    if (_EXCLUDE_RE.test(p)) return;   // 구버전 발음 제외
    stop();
    audio = new Audio(p);
    audio.volume = vol();
    var pr = audio.play();
    if (pr && pr.catch) pr.catch(function(){ /* 파일없음/자동재생 차단 → 무음 폴백 */ });
  }

  // vid(num) 직접 재생. opts.female 로 성별 강제 가능.
  function playVoice(num, opts){
    var e = window.VOICE_MANIFEST && window.VOICE_MANIFEST[num];
    var fem = opts && ('female' in opts) ? opts.female : undefined;
    playPath(pick(e, fem));
  }
  // 텍스트로 매칭 재생. femOverride 로 성별 강제 가능.
  function playByText(text, femOverride){
    if (Date.now() < suppressUntil) return;
    var n = norm(text);
    if (!n || n.length < 2) return;
    var e = (window.VOICE_BYTEXT && window.VOICE_BYTEXT[n]) || (window.VOICE_BYTEXT_EN && window.VOICE_BYTEXT_EN[n]);  // EN 자막 폴백(영문 컷신 음성)
    if (!e) return;
    var now = Date.now();
    if (n === lastKey && now - lastAt < 1500) return;   // 중복(타이핑 효과) 방지
    lastKey = n; lastAt = now;
    playPath(pick(e, femOverride));
  }
  // 통합 호출: {vid, char, name, text, female} — vid 우선, 없으면 text 매칭.
  function playLine(o){
    if (!o) return;
    if (o.vid != null && window.VOICE_MANIFEST && window.VOICE_MANIFEST[o.vid]) {
      return playVoice(o.vid, { female: o.female });
    }
    if (o.text) return playByText(o.text, o.female);
  }
  // 자동매칭을 잠시 끄기(중복 재생 방지용; 명시 재생 직후 등)
  function suppress(ms){ suppressUntil = Date.now() + (ms || 1200); }

  // DOM 자동재생: 대사 텍스트가 나타나면 매칭 재생(지문/토큰 보정).
  // ⚠ 타이핑 효과가 있으면 라인 완성 시점에 1회만 매칭되도록 Coder가 셀렉터/디바운스 보정.
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
    playVoice: playVoice, playByText: playByText, playLine: playLine,
    stop: stop, stopVoice: stop, suppress: suppress,
    isOn: on, setOn: setOn, getVol: vol, setVol: setVol
  };
})();
