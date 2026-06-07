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

  // 4) PC 전용 — 메인 화면 하단 버전 + 업데이트 상태 배지
  //    DOMContentLoaded 후 한 번만 배치
  function _mountDesktopVersionBadge() {
    if (document.getElementById('pc-version-badge')) return;
    const badge = document.createElement('div');
    badge.id = 'pc-version-badge';
    badge.style.cssText = [
      'position:fixed','bottom:6px','left:50%','transform:translateX(-50%)',
      'z-index:99998','pointer-events:none',
      'display:flex','align-items:center','gap:8px',
      'padding:4px 10px',
      'background:rgba(0,0,0,0.55)',
      'border:1px solid rgba(0,243,255,0.25)',
      'border-radius:14px',
      'font-family:Consolas,Menlo,Monaco,monospace',
      'font-size:11px','letter-spacing:0.5px',
      'color:rgba(255,255,255,0.6)',
      'backdrop-filter:blur(4px)',
      '-webkit-backdrop-filter:blur(4px)',
      'box-shadow:0 1px 4px rgba(0,0,0,0.4)',
      'transition:opacity 0.3s ease'
    ].join(';');

    const verSpan = document.createElement('span');
    verSpan.id = 'pc-version-text';
    verSpan.textContent = 'PC v—';
    verSpan.style.color = '#9ee7ff';

    const sep = document.createElement('span');
    sep.textContent = '·';
    sep.style.opacity = '0.4';

    const statusSpan = document.createElement('span');
    statusSpan.id = 'pc-update-status';
    statusSpan.textContent = '최신';
    statusSpan.style.color = 'rgba(110,231,183,0.8)';

    badge.appendChild(verSpan);
    badge.appendChild(sep);
    badge.appendChild(statusSpan);
    document.body.appendChild(badge);

    // 앱 버전 가져와서 표시
    try {
      window.desktopAPI.getAppVersion().then(v => {
        if (v && verSpan) verSpan.textContent = 'PC v' + v;
      }).catch(()=>{});
    } catch (_) {}
  }

  function _setUpdateStatus(text, color) {
    const el = document.getElementById('pc-update-status');
    if (!el) return;
    el.textContent = text;
    if (color) el.style.color = color;
  }

  // 5) 업데이트 상태 수신 → 배지에 실시간 반영
  if (typeof window.desktopAPI.onUpdateStatus === 'function') {
    window.desktopAPI.onUpdateStatus((st) => {
      if (!st) return;
      const lang = (window.I18N && window.I18N.getLang) ? window.I18N.getLang() : 'ko';
      const isEn = lang === 'en';
      switch (st.stage) {
        case 'available': {
          const msg = isEn ? ('⬇ 업데이트 v' + (st.version||'?')+' 다운로드 시작…')
                           : ('⬇ 업데이트 v' + (st.version||'?') + ' 다운로드 시작…');
          _setUpdateStatus(msg, '#ffd700');
          break;
        }
        case 'downloading': {
          const pct = (typeof st.percent==='number') ? st.percent : 0;
          const msg = isEn ? ('⬇ Downloading… '+pct+'%') : ('⬇ 다운로드 중… '+pct+'%');
          _setUpdateStatus(msg, '#66ddff');
          break;
        }
        case 'downloaded': {
          const msg = isEn ? ('✓ Update v'+(st.version||'?')+' ready (restart to apply)')
                           : ('✓ 업데이트 v'+(st.version||'?')+' 준비 완료 (재시작 시 적용)');
          _setUpdateStatus(msg, '#a8ffb8');
          break;
        }
        case 'error': {
          const msg = isEn ? '⚠ Update check failed' : '⚠ 업데이트 확인 실패';
          _setUpdateStatus(msg, '#ff9999');
          break;
        }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _mountDesktopVersionBadge);
  } else {
    _mountDesktopVersionBadge();
  }
})();
