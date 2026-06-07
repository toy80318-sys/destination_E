// DESTINATION EARTH — Electron Main Process
// PC 버전 메인 프로세스: 윈도우 생성·메뉴·단축키·외부링크·자동 업데이트·세이브 IPC
const { app, BrowserWindow, Menu, MenuItem, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// BGM autoplay 정책 해제 — 게임 시작 즉시 배경음악 재생 (app.ready 전에 호출)
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// 자동 업데이트 (electron-updater)
let autoUpdater = null;
try { autoUpdater = require('electron-updater').autoUpdater; } catch (_) {}

const isDev = !app.isPackaged;
const WINDOW_STATE_FILE = 'window-state.json';
const PREFS_FILE = 'prefs.json';  // 언어 등 사용자 설정

// ── 사용자 설정 (언어 등) ───────────────────────────────────────────
function getPrefsPath() {
  return path.join(app.getPath('userData'), PREFS_FILE);
}
function loadPrefs() {
  try {
    const raw = fs.readFileSync(getPrefsPath(), 'utf-8');
    const s = JSON.parse(raw);
    if (s && typeof s === 'object') return s;
  } catch (_) {}
  return { lang: 'ko' };
}
function savePrefs(prefs) {
  try {
    fs.writeFileSync(getPrefsPath(), JSON.stringify(prefs));
  } catch (_) {}
}

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

// ── 메뉴 라벨 (한/영 동시 지원) ──────────────────────────────────────
const MENU_LABELS = {
  ko: {
    game: '게임', save: '지금 저장', saveDir: '세이브 폴더 열기', quit: '종료',
    view: '보기', reload: '새로고침', forceReload: '캐시 강제 새로고침',
    devtools: '개발자 도구', fullscreen: '전체화면',
    language: '언어', langKo: '한국어', langEn: 'English',
    help: '도움말', checkUpdate: '업데이트 확인', homepage: '홈페이지 열기', about: '정보'
  },
  en: {
    game: 'Game', save: 'Save Now', saveDir: 'Open Save Folder', quit: 'Quit',
    view: 'View', reload: 'Reload', forceReload: 'Force Reload',
    devtools: 'DevTools', fullscreen: 'Fullscreen',
    language: 'Language', langKo: '한국어', langEn: 'English',
    help: 'Help', checkUpdate: 'Check for Updates', homepage: 'Open Homepage', about: 'About'
  }
};

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
    autoHideMenuBar: false,
    show: false,
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

  // 언어 prefs를 ?lang=ko|en 쿼리로 게임에 전달 — 사용자 보고(2026-06-06): Windows 한글 전환 실패
  //   원인: ko일 때 쿼리 미포함 → localStorage 잔존값(en)이 우선 적용되어 영문 유지.
  //   수정: 항상 명시적 ?lang= 쿼리 부여 → 확정적 언어 적용.
  const prefs = loadPrefs();
  const indexPath = path.join(__dirname, '..', 'index.html');
  const indexUrl = 'file://' + indexPath + '?lang=' + (prefs.lang === 'en' ? 'en' : 'ko');
  mainWindow.loadURL(indexUrl);

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

  mainWindow.on('close', () => saveWindowState(mainWindow));
  mainWindow.on('closed', () => { mainWindow = null; });

  if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });
}

// ── 메뉴 (게임/보기/언어/도움말) ─────────────────────────────────────
function buildMenu() {
  const prefs = loadPrefs();
  const L = MENU_LABELS[prefs.lang === 'en' ? 'en' : 'ko'];

  const template = [
    {
      label: L.game,
      submenu: [
        { label: L.save, accelerator: 'CmdOrCtrl+S', click: () => {
            if (mainWindow) mainWindow.webContents.executeJavaScript("typeof saveGame==='function'&&saveGame(false);").catch(()=>{});
          } },
        { label: L.saveDir, click: () => { _ensureSavesDir(); shell.openPath(SAVES_DIR()); } },
        { type: 'separator' },
        { label: L.quit, role: 'quit', accelerator: 'CmdOrCtrl+Q' }
      ]
    },
    {
      label: L.view,
      submenu: [
        { label: L.reload, role: 'reload', accelerator: 'CmdOrCtrl+R' },
        { label: L.forceReload, role: 'forceReload', accelerator: 'CmdOrCtrl+Shift+R' },
        { label: L.devtools, role: 'toggleDevTools', accelerator: 'F12' },
        { type: 'separator' },
        { label: L.fullscreen, role: 'togglefullscreen', accelerator: 'F11' }
      ]
    },
    {
      label: L.language,
      submenu: [
        { label: L.langKo, type: 'radio', checked: prefs.lang !== 'en', click: () => switchLanguage('ko') },
        { label: L.langEn, type: 'radio', checked: prefs.lang === 'en', click: () => switchLanguage('en') }
      ]
    },
    {
      label: L.help,
      submenu: [
        { label: L.checkUpdate, click: () => checkForUpdatesManual() },
        { label: L.homepage, click: () => shell.openExternal('https://destination.cgstation.kr') },
        { type: 'separator' },
        { label: L.about, click: () => showAboutDialog() }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function switchLanguage(lang) {
  const prefs = loadPrefs();
  if (prefs.lang === lang) return;
  prefs.lang = lang;
  savePrefs(prefs);
  // 메뉴 라벨 즉시 갱신
  buildMenu();
  // 렌더러에 적용 (게임 내 setLang)
  //   사용자 보고 (2026-06-06): Windows PC 빌드에서 한글 전환 실패 — URL 쿼리 ?lang=en
  //   잔존으로 i18n 재초기화 시 영문 유지. setLang 내부에서 URL 정리되지만 안전망으로
  //   메뉴 클릭 경로에서는 새 URL로 명시적 reload.
  if (mainWindow) {
    const indexPath = path.join(__dirname, '..', 'index.html');
    // 사용자 보고 (2026-06-06): Windows에서 한글 전환 실패 — ?lang=ko 도 명시적으로 부여해
    //   localStorage 잔존값에 의존하지 않고 URL 쿼리로 확정적 언어 적용.
    const indexUrl = 'file://' + indexPath + '?lang=' + (lang === 'en' ? 'en' : 'ko');
    mainWindow.loadURL(indexUrl).catch(()=>{});
  }
}

function showAboutDialog() {
  const prefs = loadPrefs();
  const lang = prefs.lang === 'en' ? 'en' : 'ko';
  const ver = app.getVersion();
  const opts = {
    type: 'info',
    title: lang === 'en' ? 'About — Destination Earth' : '정보 — 데스티네이션 어스',
    message: 'DESTINATION EARTH',
    detail: (lang === 'en'
      ? `PC version ${ver}\nBIG PICTURE SPACE RPG\n\nWeb: https://destination.cgstation.kr\nElectron ${process.versions.electron}, Chromium ${process.versions.chrome}, Node ${process.versions.node}`
      : `PC 버전 ${ver}\n빅 픽처 스페이스 RPG\n\n웹: https://destination.cgstation.kr\nElectron ${process.versions.electron}, Chromium ${process.versions.chrome}, Node ${process.versions.node}`),
    buttons: ['OK']
  };
  dialog.showMessageBox(mainWindow, opts);
}

// ── 자동 업데이트 (무음 자동 다운로드 + 종료 시 자동 설치) ─────────────
function setupAutoUpdater() {
  if (!autoUpdater || isDev) return;
  // 사용자 개입 최소화: 즉시 자동 다운로드 + 종료 시 자동 설치
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  // 새 버전 감지 — 토스트성 알림만 (사용자 작업 방해 안 함)
  autoUpdater.on('update-available', (info) => {
    if (mainWindow && mainWindow.webContents) {
      try {
        mainWindow.webContents.send('update-status', {
          stage: 'available',
          version: info && info.version
        });
      } catch (_) {}
    }
  });

  // 다운로드 진행률 — 렌더러에 전달 (UI에서 옵션 표시)
  autoUpdater.on('download-progress', (p) => {
    if (mainWindow && mainWindow.webContents) {
      try {
        mainWindow.webContents.send('update-status', {
          stage: 'downloading',
          percent: Math.round(p.percent || 0),
          bytesPerSecond: p.bytesPerSecond,
          transferred: p.transferred,
          total: p.total
        });
      } catch (_) {}
    }
  });

  // 다운로드 완료 — 사용자에게 비차단 알림 (모달 X). 다음 종료 시 자동 설치됨.
  autoUpdater.on('update-downloaded', (info) => {
    if (mainWindow && mainWindow.webContents) {
      try {
        mainWindow.webContents.send('update-status', {
          stage: 'downloaded',
          version: info && info.version
        });
      } catch (_) {}
    }
    const prefs = loadPrefs();
    const lang = prefs.lang === 'en' ? 'en' : 'ko';
    // 비차단 알림 (작업 방해 최소화) — 동의 시 즉시 재시작, 거부 시 다음 종료 때 자동 설치
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: lang === 'en' ? 'Update Ready' : '업데이트 준비 완료',
      message: lang === 'en'
        ? `Update downloaded. Apply now?`
        : `업데이트 다운로드 완료. 지금 적용할까요?`,
      detail: lang === 'en'
        ? 'Choose "Later" to apply automatically the next time you quit.'
        : '"나중에"를 선택하면 다음 종료 시 자동 적용됩니다.',
      buttons: lang === 'en' ? ['Restart Now', 'Later'] : ['지금 재시작', '나중에'],
      defaultId: 1,  // 기본은 "나중에" (작업 흐름 보호)
      cancelId: 1
    }).then(r => { if (r.response === 0) autoUpdater.quitAndInstall(); });
  });

  autoUpdater.on('error', (err) => {
    console.warn('[updater]', err && err.message);
    if (mainWindow && mainWindow.webContents) {
      try { mainWindow.webContents.send('update-status', { stage: 'error', message: err && err.message }); } catch (_) {}
    }
  });

  // 부팅 후 10초 뒤 자동 확인 (단축 — 사용자가 빠르게 최신 버전 받도록)
  setTimeout(() => { try { autoUpdater.checkForUpdates(); } catch (_) {} }, 10000);

  // 1시간마다 백그라운드 자동 확인 (장시간 켜둔 사용자 대응)
  setInterval(() => { try { autoUpdater.checkForUpdates(); } catch (_) {} }, 60 * 60 * 1000);
}
function checkForUpdatesManual() {
  const prefs = loadPrefs();
  const lang = prefs.lang === 'en' ? 'en' : 'ko';
  if (!autoUpdater || isDev) {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: lang === 'en' ? 'Updates' : '업데이트',
      message: lang === 'en' ? 'Auto-update unavailable in dev mode.' : '개발 모드에서는 자동 업데이트가 비활성화됩니다.',
      buttons: ['OK']
    });
    return;
  }
  autoUpdater.once('update-not-available', () => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: lang === 'en' ? 'Up to Date' : '최신 버전',
      message: lang === 'en' ? 'You are running the latest version.' : '이미 최신 버전을 사용 중입니다.',
      buttons: ['OK']
    });
  });
  try { autoUpdater.checkForUpdates(); } catch (_) {}
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
    buildMenu();
    createWindow();
    setupAutoUpdater();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}

// ── IPC: 세이브 시스템 (슬롯별 파일 백업) ──────────────────────────
const SAVES_DIR = () => path.join(app.getPath('userData'), 'saves');
function _safeKey(k) {
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

// 렌더러에서 호출되는 언어 변경(메뉴 라벨 동기화)
ipcMain.handle('set-lang-pref', async (_e, lang) => {
  const safe = (lang === 'en') ? 'en' : 'ko';
  const prefs = loadPrefs();
  prefs.lang = safe;
  savePrefs(prefs);
  buildMenu();
  return { ok: true };
});

// 렌더러에서 호출되는 수동 업데이트 확인
ipcMain.handle('check-update', async () => { checkForUpdatesManual(); return { ok: true }; });
