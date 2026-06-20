// ══════════════════════════════════════════════════════════════════
// VOICE PLAYER — 대사 음성 재생 (지시서 음성연동 §4, 2026-06-20)
//   playLine({vid,char,text}) : ① vid(num) → VOICE_MANIFEST 매핑 우선
//                               ② 폴백 → VOICE_MAP 텍스트매칭(기존 7화자)
//   · 동시 1개(직전 정지 후 재생), 언어 게이트(클립 lang≠현재 언어면 생략), 무음 폴백(에러로 안 죽음)
//   · 설정/볼륨은 AudioMgr 보이스 채널(voiceOff/voice/master) 재사용 → 기존 설정 토글이 그대로 제어
//   · 일반 스크립트(전역). 정적 <script> 로드. 경로 베이스 상수 분리.
// ══════════════════════════════════════════════════════════════════
(function(){
  if(typeof window==='undefined')return;
  if(window._VOICE_PLAYER_LOADED)return; window._VOICE_PLAYER_LOADED=true;
  var VOICE_BASE='02_Assets/audio/voice/';   // VOICE_MAP 폴백용 베이스 (매니페스트 clip 은 전체경로)
  var _cur=null;                             // 현재 재생 HTMLAudioElement (동시 1개)

  function _lang(){ return (window.I18N&&window.I18N.getLang)?window.I18N.getLang():'ko'; }
  function _settings(){ var A=window.AudioMgr; return { off:A?A.voiceOff:false, vol:(A&&typeof A.voice==='number')?A.voice:0.95, master:(A&&typeof A.master==='number')?A.master:0.7 }; }
  // VOICE_MAP 폴백 — 화자 char → 폴더, 텍스트 정규화 (gen-voice-map.js _vnorm 과 동일)
  function _voiceKey(ch){ if(!ch)return null;
    if(ch.indexOf('baekgu')===0)return 'baekgu';
    if(ch==='commander')return 'commander';
    if(ch==='hero01')return 'yisunsin'; if(ch==='hero02')return 'jangyeongsil'; if(ch==='hero03')return 'gwanggaeto';
    if(ch==='hero04')return 'gagarin';  if(ch==='hero08')return 'marcopolo';
    return null; }
  function _vnorm(t){ if(!t)return '';
    return String(t).replace(/\([^)]*\)/g,'')
      .replace(/\{[^}]*\}/g,function(m){var k=m.slice(1,-1).toLowerCase();return (k==='commander'||k==='사령관')?'사령관':k==='함선'?'함선':k==='회사'?'회사':'';})
      .replace(/[^가-힣a-zA-Z0-9]/g,'').toLowerCase(); }

  function stopVoice(){ if(_cur){ try{_cur.pause();_cur.src='';}catch(e){} _cur=null; } }

  // src + lang 결정 (vid 우선, 없으면 텍스트매칭 폴백)
  function _resolve(opts){
    opts=opts||{};
    if(opts.vid!=null && window.VOICE_MANIFEST){
      var man=window.VOICE_MANIFEST[String(opts.vid)];
      if(man&&man.clip)return {src:man.clip, lang:man.lang||'ko'};
    }
    var vk=_voiceKey(opts.char);
    if(vk && window.VOICE_MAP && window.VOICE_MAP[vk]){
      var clip=window.VOICE_MAP[vk][_vnorm(opts.text)];
      if(clip)return {src:VOICE_BASE+vk+'/'+clip+'.mp3', lang:'ko'};
    }
    return null;
  }

  function playLine(opts){
    stopVoice();
    var r=_resolve(opts);
    if(!r)return false;                                   // 매핑 없음 → 자막만
    if(r.lang && r.lang!==_lang())return false;            // 언어 불일치 → 자막만(음성 생략)
    var s=_settings();
    if(s.off||s.master<=0||s.vol<=0)return false;          // 보이스 OFF/무음
    try{
      var ver=(window._GAME_VER)?('?v='+encodeURIComponent(window._GAME_VER)):'';
      var a=new Audio(r.src+ver);
      a.volume=Math.min(1, s.master*s.vol);
      _cur=a;
      a.play().catch(function(){});                        // 자동재생 차단/파일 누락 → 무음 폴백
      return true;
    }catch(e){ return false; }
  }
  // 단순 vid 재생 (지시서 §4 명칭 호환)
  function playVoice(vid){ return playLine({vid:vid}); }

  window.VoicePlayer={ playLine:playLine, playVoice:playVoice, stopVoice:stopVoice, VOICE_BASE:VOICE_BASE };
  window.playVoice=playVoice;     // 전역 단축
  window.stopVoiceLine=stopVoice;
})();
