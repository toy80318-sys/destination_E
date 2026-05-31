// DESTINATION EARTH — Electron Main Process
// PC 버전 메인 프로세스: 윈도우 생성·메뉴·단축키·외부링크 처리
const { app, BrowserWindow, Menu, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = !app.isPackaged;
const WINDOW_STATE_FILE = 'window-state.json';

// ── 창 상태 저장/복원 (위치·크기 기억) ──────────────────────────────
function getWindowStatePath() {
  return path.join(app.getPath('userData'), WINDOW_STATE_FILE);
}
function loadWindowState() {
  try {
    const raw = fs.readFileSync(getWindowStatePath(), 'utf-8');
    const s = JSON.parse(raw);
    if (typeof s.width === 'number' && typeof s.height === 'number') return s;
  } catch (_) {}
  return { width: 1600, height: 900, fullscreen: false };
}
function saveWindowState(win) {
  try {
    const bounds = win.getBounds();
    const state = {
      ...bounds,
      fullscreen: win.isFullScreen(),
      maximized: win.isMaximized()
    };
    fs.writeFileSync(getWindowStatePath(), JSON.stringify(state));
  } catch (_) {}
}

// ── 메인 윈도우 생성 ────────────────────────────────────────────────
let mainWindow = null;
function createWindow() {
  const state = loadWindowState();

  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 1024,
    minHeight: 600,
    backgroundColor: '#050a1a',
    title: 'DESTINATION EARTH',
    icon: path.join(__dirname, '..', 'img', 'icons', 'icon-512.png'),
    autoHideMenuBar: true,
    show: false, // 흰 첫 frame 차단: 콘텐츠 준비 후에만 표시
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
      backgroundThrottling: false
    }
  });

  if (state.fullscreen) mainWindow.setFullScreen(true);
  else if (state.maximized) mainWindow.maximize();

  // 게임 로드 (Phase 1은 로컬 파일 그대로)
  mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));

  // 콘텐츠가 그릴 준비가 되면 표시 — 검은 우주 배경 → boot-splash 순서로 자연스럽게
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) mainWindow.focus();
  });

  // 외부 링크는 기본 브라우저로 열기
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
  mainWindow.webContents.on('will-navigate', (e, url) => {
    const current = mainWindow.webContents.getURL();
    if (url !== current && /^https?:/.test(url)) {
      e.preventDefault();
      shell.openExternal(url);
    }
  });

  // 창 닫힐 때 상태 저장
  mainWindow.on('close', () => saveWindowState(mainWindow));
  mainWindow.on('closed', () => { mainWindow = null; });

  if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });
}

// ── 단축키: F11 풀스크린, F12 DevTools, Ctrl+R 새로고침 ──────────────
function registerShortcuts() {
  // 메뉴를 비우되 단축키는 살리기 위해 accelerator만 등록
  const menu = Menu.buildFromTemplate([
    {
      label: 'View',
      submenu: [
        { role: 'reload', accelerator: 'CmdOrCtrl+R' },
        { role: 'forceReload', accelerator: 'CmdOrCtrl+Shift+R' },
        { role: 'toggleDevTools', accelerator: 'F12' },
        { type: 'separator' },
        { role: 'togglefullscreen', accelerator: 'F11' },
        { role: 'quit', accelerator: 'CmdOrCtrl+Q' }
      ]
    }
  ]);
  Menu.setApplicationMenu(menu);
}

// ── 단일 인스턴스 보장 ──────────────────────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    registerShortcuts();
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}

// ── IPC: 세이브 시스템 (슬롯별 파일 백업) ──────────────────────────
// 폴더 구조: <userData>/saves/de_save.json, de_save_s1.json … de_save_s8.json
//          + 보조 키 그대로 (예: de_audio_settings.json)
const SAVES_DIR = () => path.join(app.getPath('userData'), 'saves');
function _safeKey(k) {
  // 안전한 파일명만 허용 (영숫자·언더스코어·하이픈)
  return /^[a-zA-Z0-9_-]+$/.test(k) ? k : null;
}
function _ensureSavesDir() {
  const dir = SAVES_DIR();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

ipcMain.handle('save-slot', async (_e, key, payload) => {
  try {
    const safe = _safeKey(key);
    if (!safe) return { ok: false, error: 'invalid key' };
    const dir = _ensureSavesDir();
    const file = path.join(dir, safe + '.json');
    // 안전 저장: 임시 파일에 쓰고 rename (전원 차단 등으로 인한 손상 방지)
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, typeof payload === 'string' ? payload : JSON.stringify(payload));
    fs.renameSync(tmp, file);
    return { ok: true, path: file };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});

ipcMain.handle('load-slot', async (_e, key) => {
  try {
    const safe = _safeKey(key);
    if (!safe) return { ok: false, error: 'invalid key' };
    const file = path.join(SAVES_DIR(), safe + '.json');
    if (!fs.existsSync(file)) return { ok: true, data: null };
    return { ok: true, data: fs.readFileSync(file, 'utf-8') };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});

ipcMain.handle('list-slots', async () => {
  try {
    const dir = SAVES_DIR();
    if (!fs.existsSync(dir)) return { ok: true, keys: [] };
    const keys = fs.readdirSync(dir)
      .filter(f => f.endsWith('.json') && !f.endsWith('.tmp'))
      .map(f => f.replace(/\.json$/, ''));
    return { ok: true, keys };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});

ipcMain.handle('delete-slot', async (_e, key) => {
  try {
    const safe = _safeKey(key);
    if (!safe) return { ok: false, error: 'invalid key' };
    const file = path.join(SAVES_DIR(), safe + '.json');
    if (fs.existsSync(file)) fs.unlinkSync(file);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});

ipcMain.handle('show-save-dir', async () => {
  _ensureSavesDir();
  shell.openPath(SAVES_DIR());
});

ipcMain.handle('get-app-version', () => app.getVersion());
