// ═══════════════════════════════════════════════════════════════════
// Capacitor 네이티브(iOS/Android) 전용 초기화 — 가로 고정·스플래시·상태바·뒤로가기.
//   · 웹/데스크톱(window.Capacitor 없음 또는 isNativePlatform=false)에선 전부 no-op → 회귀 0.
//   · 번들러 미사용 프로젝트라 ES import 대신 window.Capacitor.Plugins 브리지 사용
//     (네이티브 앱에선 등록된 플러그인이 프록시로 노출됨).
//   모바일 포팅 §6 Capacitor 스캐폴드 (2026-06-28)
// ═══════════════════════════════════════════════════════════════════
(function(){
  if(typeof window==='undefined') return;
  var Cap = window.Capacitor;
  if(!Cap || typeof Cap.isNativePlatform !== 'function' || !Cap.isNativePlatform()) return; // 네이티브 앱에서만
  var P = Cap.Plugins || {};
  function _try(fn){ try{ return fn(); }catch(e){ try{console.warn('[cap-init]', e&&e.message);}catch(_){} } }

  // 1) 가로(landscape) 고정 — 와이드 HUD 기반 게임
  _try(function(){ P.ScreenOrientation && P.ScreenOrientation.lock && P.ScreenOrientation.lock({orientation:'landscape'}); });

  // 2) 상태바 숨김(몰입형 풀스크린)
  _try(function(){ P.StatusBar && P.StatusBar.hide && P.StatusBar.hide(); });

  // 3) 스플래시 — 게임 로드 후 숨김(launchAutoHide=false 이므로 수동)
  function _hideSplash(){ _try(function(){ P.SplashScreen && P.SplashScreen.hide && P.SplashScreen.hide(); }); }
  if(document.readyState==='complete') setTimeout(_hideSplash, 400);
  else window.addEventListener('load', function(){ setTimeout(_hideSplash, 400); });

  // 4) 안드로이드 하드웨어 뒤로가기: 컷신/모달 우선 닫기 → 최상위면 앱 최소화
  _try(function(){
    P.App && P.App.addListener && P.App.addListener('backButton', function(){
      var ov=document.querySelector('#story-scene-overlay, #prologue-overlay, #_final-ending-overlay');
      if(ov){ _try(function(){ ov.click(); }); return; }
      var modal=document.getElementById('modal-bg');
      if(modal && modal.classList.contains('on')){ _try(function(){ if(typeof window.closeModal==='function')window.closeModal(); }); return; }
      _try(function(){ if(P.App.minimizeApp) P.App.minimizeApp(); else if(P.App.exitApp) P.App.exitApp(); });
    });
  });

  try{ console.log('[cap-init] Capacitor native('+Cap.getPlatform()+') 초기화 완료 — landscape lock'); }catch(e){}
})();
