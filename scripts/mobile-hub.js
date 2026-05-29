// 모바일 hub 캡처 — captureScreenshot 행 회피용 우회
// 1) 부팅 시 setInterval/Audio/fetch 완전 차단
// 2) requestIdleCallback 으로 페인트 완료 보장
// 3) clip 영역 작게 잡고 PNG → JPEG fallback
const puppeteer = require('puppeteer-core');
const fs = require('fs'); const path = require('path');

const URL = process.argv[2] || 'http://127.0.0.1:5454/index.html';
const LABEL = process.argv[3] || 'hub';
const VW = parseInt(process.argv[4] || '390', 10);
const VH = parseInt(process.argv[5] || '844', 10);
const OUT = path.join(__dirname, '..', '.screens');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const b = await puppeteer.launch({
    executablePath: '/nix/store/lpdrfl6n16q5zdf8acp4bni7yczzcx3h-idx-builtins/bin/chromium',
    headless: true, protocolTimeout: 30000,
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote','--mute-audio',`--window-size=${VW},${VH}`],
    defaultViewport: { width:VW, height:VH, deviceScaleFactor:1, isMobile:true, hasTouch:true },
  });
  try {
    const p = await b.newPage();
    // 인터벌/RAF/Audio/fetch 모두 차단
    await p.evaluateOnNewDocument(() => {
      window.requestAnimationFrame = () => 0;
      window.setInterval = () => 0;
      window.Audio = function(){return{play:()=>Promise.resolve(),pause:()=>{},addEventListener:()=>{},removeEventListener:()=>{},volume:0,loop:false,paused:true};};
      const _f = window.fetch;
      window.fetch = () => Promise.resolve({ ok:false, status:404, text:()=>Promise.resolve(''), json:()=>Promise.resolve({}) });
      // 모든 transition / animation 끔
      const st = document.createElement('style');
      st.textContent = '*{transition:none!important;animation:none!important}';
      (document.head||document.documentElement).appendChild(st);
    });
    p.on('pageerror', e => console.log('  [err]', e.message.slice(0,120)));
    await p.goto(URL, { waitUntil:'domcontentloaded', timeout: 20000 });
    await sleep(1800);
    // 캔버스 / 배경이미지 제거 (메모리 절약)
    await p.evaluate(() => {
      document.querySelectorAll('canvas').forEach(c => c.remove());
      document.querySelectorAll('img').forEach(i => i.removeAttribute('src'));
    });
    // 타이틀 캡처
    await p.screenshot({ path: path.join(OUT, `mh-${LABEL}-01-title.jpg`), type:'jpeg', quality:80, clip:{x:0,y:0,width:VW,height:VH} });
    console.log('  ✓ title');
    // 부트 (인터벌 차단된 상태에서)
    const boot = await p.evaluate(() => {
      try {
        G.profile = { name:'사령관', company:'테스트사', gender:'M', ship:'머스탱' };
        G.act = 1; initGame();
        showHub();
        const ov = document.getElementById('_tutorial-overlay'); if (ov) ov.remove();
        G._tutorialDone = true;
        document.querySelectorAll('canvas').forEach(c => c.remove());
        return { ok:true, screen: document.querySelector('.scr.on')?.id };
      } catch(e) { return { ok:false, err:e.message }; }
    });
    console.log('  boot:', boot);
    await sleep(700);
    // 캡처
    let ok = false;
    for (const t of ['jpeg','png']) {
      try {
        await p.screenshot({ path: path.join(OUT, `mh-${LABEL}-02-hub.${t==='jpeg'?'jpg':'png'}`), type:t, quality: t==='jpeg'?80:undefined, clip:{x:0,y:0,width:VW,height:VH} });
        console.log('  ✓ hub ('+t+')'); ok = true; break;
      } catch(e) { console.log('  hub '+t+' fail:', e.message.slice(0,80)); }
    }
    // 측정 (실패해도 진행)
    try {
      const m = await p.evaluate(() => {
        const g = sel => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return { l:Math.round(r.left), t:Math.round(r.top), w:Math.round(r.width), h:Math.round(r.height), font:c.fontSize, mh:c.minHeight, pad:c.padding }; };
        return {
          vp:{w:innerWidth,h:innerHeight}, scale:window._gsScale, rotated:window._gsRotated,
          stage: (()=>{const s=document.getElementById('game-stage');if(!s)return null;const r=s.getBoundingClientRect();return{l:Math.round(r.left),t:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height)};})(),
          hud:g('#hud'), sidebar:g('.hub-side'), bk:g('#bkdialog'), bkHeader:g('#bk-header-bar'),
          hCo:g('#h-co'), hPl:g('#h-pl'), btn:g('.btn'), btnLg:g('.btn-lg'),
        };
      });
      console.log('  measure:', JSON.stringify(m, null, 2));
      fs.writeFileSync(path.join(OUT, `mh-${LABEL}-measure.json`), JSON.stringify(m,null,2));
    } catch(e) { console.log('  measure fail:', e.message.slice(0,80)); }
  } finally { await b.close(); }
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
