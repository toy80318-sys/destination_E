// DESTINATION EARTH — Electron Preload
// 렌더러(게임)에서 안전하게 호출 가능한 데스크탑 전용 API를 노출.
// Phase 2에서 game.js의 세이브 로직이 window.desktopAPI를 활용.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
  isDesktop: true,
  platform: process.platform,
  // 슬롯 기반 세이브 API (key: 'de_save' | 'de_save_s1' ~ 's8' 등)
  saveSlot: (key, payload) => ipcRenderer.invoke('save-slot', key, payload),
  loadSlot: (key) => ipcRenderer.invoke('load-slot', key),
  listSlots: () => ipcRenderer.invoke('list-slots'),
  deleteSlot: (key) => ipcRenderer.invoke('delete-slot', key),
  showSaveDir: () => ipcRenderer.invoke('show-save-dir'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version')
});
