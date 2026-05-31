// DESTINATION EARTH — Desktop (Electron) Bridge
// 웹 게임 코드는 그대로 두고, Electron 환경일 때만 localStorage 쓰기를
// 사용자 데이터 폴더의 백업 파일과 자동 동기화. 앱 삭제·재설치 시
// 백업 파일에서 복구하여 세이브 영구 보존.
(function () {
  if (!window.desktopAPI) return; // 웹 브라우저면 아무 동작 안 함

  // 백업 대상 키: 슬롯·백업·옵션·피드백
  const SAVE_KEY_RE = /^(de_save(_s[1-8])?(_bk)?|de_audio_settings|de_display_mode|de_feedback_id|de_feedback_log|de_bk_collapsed|bk_panel_state)$/;

  const _origSetItem = Storage.prototype.setItem;
  const _origRemoveItem = Storage.prototype.removeItem;
  const _origClear = Storage.prototype.clear;

  // 1) localStorage 쓰기/삭제 후킹 — fire-and-forget 백업 동기화
  Storage.prototype.setItem = function (key, value) {
    _origSetItem.call(this, key, value);
    if (this === window.localStorage && SAVE_KEY_RE.test(key)) {
      try { window.desktopAPI.saveSlot(key, String(value)).catch(() => {}); } catch (_) {}
    }
  };
  Storage.prototype.removeItem = function (key) {
    _origRemoveItem.call(this, key);
    if (this === window.localStorage && SAVE_KEY_RE.test(key)) {
      try { window.desktopAPI.deleteSlot(key).catch(() => {}); } catch (_) {}
    }
  };
  // clear()는 위험하므로 백업 동기화는 일부러 안 함 (사용자 명시적 의도일 때만)

  // 2) 부팅 시 백업 복구 — localStorage에 없는 키만 보충
  //    (재설치 후 첫 실행 시 자동 복구되도록)
  (async function restoreFromBackup() {
    try {
      const list = await window.desktopAPI.listSlots();
      if (!list || !list.ok || !list.keys || list.keys.length === 0) return;
      let restored = 0;
      for (const key of list.keys) {
        if (!SAVE_KEY_RE.test(key)) continue;
        if (localStorage.getItem(key) !== null) continue; // 이미 있으면 skip
        const r = await window.desktopAPI.loadSlot(key);
        if (r && r.ok && typeof r.data === 'string') {
          _origSetItem.call(localStorage, key, r.data);
          restored++;
        }
      }
      if (restored > 0) {
        console.log('[DesktopBridge] 백업에서', restored, '개 키 복구');
        // 게임 부팅 후 이어하기 버튼이 즉시 갱신되도록 이벤트 발생
        try { window.dispatchEvent(new CustomEvent('desktop-save-restored', { detail: { count: restored } })); } catch (_) {}
      }
    } catch (e) {
      console.warn('[DesktopBridge] 백업 복구 실패:', e);
    }
  })();

  // 3) 데스크탑 환경 플래그 노출 (게임 코드에서 분기용)
  window.IS_DESKTOP = true;
  window.DESKTOP_PLATFORM = window.desktopAPI.platform;
})();
