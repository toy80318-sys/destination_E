// 모바일 UI 감사 — 390×844 viewport에서 실제 렌더링
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const URL = process.argv[2] || 'http://127.0.0.1:5454/index.html';
const LABEL = process.argv[3] || 'cur';
const VW = parseInt(process.argv[4] || '390', 10);
const VH = parseInt(process.argv[5] || '844', 10);
const OUT_DIR = path.join(__dirname, '..', '.screens');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function snap(page, file) {
  // jpeg + 낮은 quality — 큰 DOM에서 PNG 인코더가 죽는 문제 회피
  try {
    const jpgFile = file.replace(/\.png$/, '.jpg');
    await page.screenshot({ path: jpgFile, type:'jpeg', quality: 85, clip: { x:0, y:0, width: VW, height: VH } });
    return true;
  } catch (e) {
    console.log('  snap fail:', e.message.slice(0,80));
    return false;
  }
}

async function measure(page) {
  return page.evaluate(() => {
    const get = (sel) => {
      const el = document.querySelector(sel); if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return { l:Math.round(r.left), t:Math.round(r.top), w:Math.round(r.width), h:Math.round(r.height),
               font: cs.fontSize, pad: cs.padding, minH: cs.minHeight };
    };
    const stage = document.getElementById('game-stage');
    const sR = stage ? stage.getBoundingClientRect() : null;
    const sideEl = document.querySelector('.hub-side');
    const clipped = [];
    document.querySelectorAll('.hub-side, .hub-body, #hud, .modal, .btn-lg, .btn').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return;
      const off = r.right > window.innerWidth + 1 || r.bottom > window.innerHeight + 1 || r.left < -1 || r.top < -1;
      if (off) {
        clipped.push({ tag: el.tagName.toLowerCase()+(el.id?'#'+el.id:'')+(el.className?'.'+(''+el.className).split(' ')[0]:''),
                       r: { l:Math.round(r.left),t:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height)}});
      }
    });
    return {
      vp: { w:window.innerWidth, h:window.innerHeight },
      scale: window._gsScale, rotated: window._gsRotated,
      stage: sR ? { l:Math.round(sR.left), t:Math.round(sR.top), w:Math.round(sR.width), h:Math.round(sR.height) } : null,
      hud: get('#hud'),
      company: get('#h-co'),
      sidebar: get('.hub-side'),
      sidebarBtn: get('.hn-btn'),
      sidebarScroll: sideEl ? { sH: sideEl.scrollHeight, cH: sideEl.clientHeight, overflowing: sideEl.scrollHeight > sideEl.clientHeight+1 } : null,
      hubBody: get('.hub-body'),
      titleBtnLg: get('.btn-lg'),
      titleBtnSm: get('.btn-sm'),
      clipped,
    };
  });
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/nix/store/lpdrfl6n16q5zdf8acp4bni7yczzcx3h-idx-builtins/bin/chromium',
    headless: true,
    protocolTimeout: 60000,
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote','--mute-audio',`--window-size=${VW},${VH}`],
    defaultViewport: { width: VW, height: VH, deviceScaleFactor: 1, isMobile: true, hasTouch: true },
  });
  const allMeasure = {};
  try {
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(() => {
      let n=0;
      window.requestAnimationFrame = (cb) => { if (n++>2) return 0; return setTimeout(()=>{try{cb(performance.now());}catch(e){}}, 16); };
    });
    page.on('pageerror', e => console.log('  [pageerror]', e.message.slice(0,160)));
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(2500);
    // 배경 캔버스/이미지 비활성화 — 캡처 시간 단축
    await page.evaluate(() => {
      document.querySelectorAll('canvas').forEach(c=>{c.style.display='none';});
      document.querySelectorAll('img[src*="hub-planet"], #hub-planet-bg').forEach(i=>{i.style.display='none';});
    });

    await snap(page, path.join(OUT_DIR, `m-${LABEL}-01-title.png`));
    allMeasure.title = await measure(page);
    console.log('  ✓ title  scale=', allMeasure.title.scale.toFixed(3));

    // Boot → hub
    const boot = await page.evaluate(() => {
      try {
        G.profile = { name:'테스트',company:'테스트사',gender:'M',ship:'머스탱' };
        G.act = 1; initGame();
        if (typeof showHub === 'function') showHub();
        const ov = document.getElementById('_tutorial-overlay'); if (ov) ov.remove();
        G._tutorialDone = true;
        document.querySelectorAll('canvas').forEach(c=>{c.style.display='none';});
        document.querySelectorAll('#hub-planet-bg').forEach(i=>{i.style.background='none';i.style.display='none';});
        return { ok:true, screen: document.querySelector('.scr.on')?.id };
      } catch (e) { return { ok:false, err: e.message }; }
    });
    console.log('  boot:', boot);
    await sleep(1500);

    await snap(page, path.join(OUT_DIR, `m-${LABEL}-02-hub.png`));
    allMeasure.hub = await measure(page);
    console.log('  hub scale=', allMeasure.hub.scale?.toFixed(3), 'sidebar=', allMeasure.hub.sidebar, 'clipped=', allMeasure.hub.clipped.length);
    allMeasure.hub.clipped.forEach(c => console.log('    -', c.tag, c.r));

    for (const tab of ['quest','tavern','trade','ship']) {
      const ok = await page.evaluate((t) => { try { if (typeof hubTab==='function') { hubTab(t); document.querySelectorAll('canvas').forEach(c=>{c.style.display='none';}); return true; } return false; } catch(e){return false;} }, tab);
      if (!ok) continue;
      await sleep(600);
      const did = await snap(page, path.join(OUT_DIR, `m-${LABEL}-tab-${tab}.png`));
      if (did) console.log(`  ✓ tab-${tab}`);
      else break;
    }
  } finally {
    fs.writeFileSync(path.join(OUT_DIR, `m-${LABEL}-measure.json`), JSON.stringify(allMeasure, null, 2));
    await browser.close();
  }
  console.log('done');
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
