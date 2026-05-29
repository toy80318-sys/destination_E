// 캔버스/애니메이션 비활성화 후 screenshot
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const URL = process.argv[2] || 'https://cgstation-d8178.web.app';
const ONLY = process.argv[3];
const OUT_DIR = path.join(__dirname, '..', '.screens');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const VIEWPORTS = [
  { name: 'desktop', w: 1366, h: 768, dpr: 1, isMobile: false, hasTouch: false },
  { name: 'mobile-portrait', w: 390, h: 844, dpr: 1, isMobile: true, hasTouch: true },
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function captureViewport(vp) {
  const browser = await puppeteer.launch({
    executablePath: '/nix/store/lpdrfl6n16q5zdf8acp4bni7yczzcx3h-idx-builtins/bin/chromium',
    headless: true,
    protocolTimeout: 30000,
    args: [
      '--no-sandbox', '--disable-setuid-sandbox',
      '--disable-dev-shm-usage', '--disable-gpu',
      '--disable-accelerated-2d-canvas',
      '--no-zygote', '--mute-audio',
      `--window-size=${vp.w},${vp.h}`,
    ],
    defaultViewport: { width: vp.w, height: vp.h, deviceScaleFactor: vp.dpr, isMobile: vp.isMobile, hasTouch: vp.hasTouch },
  });
  try {
    const page = await browser.newPage();
    // requestAnimationFrame을 즉시 1회만 호출하도록 — 캡처 중 무한 애니메이션 차단
    await page.evaluateOnNewDocument(() => {
      let _rafFired = false;
      window.requestAnimationFrame = (cb) => {
        if (_rafFired) return 0;
        _rafFired = true;
        setTimeout(() => { _rafFired = false; try { cb(performance.now()); } catch(e){} }, 50);
        return 1;
      };
    });
    console.log(`[${vp.name}] loading...`);
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await sleep(2500);

    await page.screenshot({ path: path.join(OUT_DIR, `${vp.name}-01-title.png`), captureBeyondViewport: false });
    console.log(`  ✓ title`);

    const boot = await page.evaluate(() => {
      try {
        if (typeof initGame === 'function') {
          G.profile = { name:'테스트',company:'테스트사',gender:'M',ship:'머스탱' };
          G.act = 1; initGame();
        }
        if (typeof showHub === 'function') showHub();
        const ov = document.getElementById('_tutorial-overlay'); if (ov) ov.remove();
        G._tutorialDone = true;
        // 캔버스 비활성화 — 별 배경, 전투 캔버스 등 무한 그리기 중단
        document.querySelectorAll('canvas').forEach(c => { c.style.display = 'none'; });
        return { ok:true, screen: document.querySelector('.scr.on')?.id };
      } catch (e) { return { ok:false, err:e.message }; }
    });
    console.log(`  boot:`, boot);
    await sleep(1500);

    try {
      await page.screenshot({ path: path.join(OUT_DIR, `${vp.name}-02-main.png`), captureBeyondViewport: false });
      console.log(`  ✓ main`);
    } catch (e) { console.log(`  ✗ main: ${e.message}`); }

    const m = await page.evaluate(() => {
      const get = (sel) => {
        const el = document.querySelector(sel); if (!el) return null;
        const r = el.getBoundingClientRect();
        return { l:Math.round(r.left), t:Math.round(r.top), w:Math.round(r.width), h:Math.round(r.height), font: getComputedStyle(el).fontSize };
      };
      return {
        vp: { w:window.innerWidth, h:window.innerHeight },
        scale: window._gsScale, rotated: window._gsRotated,
        hud: get('#hud'), company: get('#h-co'),
        resource: get('#h-resource-bar > span'),
        status: get('#h-status-bar > div'),
        sidebar: get('.hub-side'),
        sidebarBtn: get('.hn-btn'),
      };
    });
    fs.writeFileSync(path.join(OUT_DIR, `${vp.name}-measure.json`), JSON.stringify(m, null, 2));
    console.log(`  scale=${m.scale} rot=${m.rotated}`);
    if (m.hud) console.log(`  HUD ${m.hud.w}×${m.hud.h} font=${m.hud.font}`);
    if (m.company) console.log(`  회사 font=${m.company.font}`);
    if (m.sidebar) console.log(`  사이드바 ${m.sidebar.w}px`);
    if (m.sidebarBtn) console.log(`  사이드바버튼 font=${m.sidebarBtn.font}`);

    for (const tab of ['quest','tavern','trade','ship','garage','map','auction']) {
      const r = await page.evaluate((t) => { try { if (typeof hubTab==='function') hubTab(t); return true; } catch(e){return false;} }, tab);
      if (!r) continue;
      await sleep(600);
      try {
        await page.screenshot({ path: path.join(OUT_DIR, `${vp.name}-tab-${tab}.png`), captureBeyondViewport: false });
        console.log(`  ✓ tab-${tab}`);
      } catch (e) { console.log(`  ✗ tab-${tab}: ${e.message}`); break; }
    }
  } finally {
    await browser.close();
  }
}

(async () => {
  const list = ONLY ? VIEWPORTS.filter(v=>v.name===ONLY) : VIEWPORTS;
  for (const vp of list) {
    try { await captureViewport(vp); }
    catch (e) { console.error(`[${vp.name}] FAIL:`, e.message); }
  }
  console.log('=== done ===');
})();
