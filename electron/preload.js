// DESTINATION EARTH — Electron Preload
// 렌더러(게임)에서 안전하게 호출 가능한 데스크탑 전용 API.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
  isDesktop: true,
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
  // 자동 업데이트 상태 수신 (메인 → 렌더러 push)
  // status: {stage: 'available'|'downloading'|'downloaded'|'error', percent, version, message}
  onUpdateStatus: (cb) => {
    if (typeof cb !== 'function') return;
    ipcRenderer.on('update-status', (_evt, status) => { try { cb(status); } catch (_) {} });
  }
});
