// DESTINATION EARTH — Electron Preload
// 렌더러(게임)에서 안전하게 호출 가능한 데스크탑 전용 API.
const { contextBridge, ipcRenderer } = require('electron');

// Steam depot 빌드 여부 — 메인 프로세스의 _isSteamBuild() 결과를 동기로 1회 조회.
//   렌더러(설정 치트 패널 등)에서 동기 분기할 수 있도록 정적 boolean으로 노출.
const _isSteamBuild = (() => {
  try { return ipcRenderer.sendSync('get-steam-build-sync') === true; } catch (_) { return false; }
})();

contextBridge.exposeInMainWorld('desktopAPI', {
  isDesktop: true,
  isSteamBuild: _isSteamBuild,
  platform: process.platform,
  // 슬롯 기반 세이브 API
  saveSlot: (key, payload) => ipcRenderer.invoke('save-slot', key, payload),
  loadSlot: (key) => ipcRenderer.invoke('load-slot', key),
  listSlots: () => ipcRenderer.invoke('list-slots'),
  deleteSlot: (key) => ipcRenderer.invoke('delete-slot', key),
  showSaveDir: () => ipcRenderer.invoke('show-save-dir'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  // 언어 동기화 (메뉴 라벨 즉시 갱신)
  setLangPref: (lang) => ipcRenderer.invoke('set-lang-pref', lang),
  // 수동 업데이트 확인
  checkUpdate: () => ipcRenderer.invoke('check-update'),
  // 앱 종료 (타이틀 화면 종료 버튼)
  quit: () => ipcRenderer.invoke('quit-app'),
  // 자동 업데이트 상태 수신 (메인 → 렌더러 push)
  // status: {stage: 'available'|'downloading'|'downloaded'|'error', percent, version, message}
  onUpdateStatus: (cb) => {
    if (typeof cb !== 'function') return;
    ipcRenderer.on('update-status', (_evt, status) => { try { cb(status); } catch (_) {} });
  }
});
