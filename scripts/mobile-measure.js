// 모바일 측정 전용 — 스크린샷 없이 hub 레이아웃 검증
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const URL = process.argv[2] || 'http://127.0.0.1:5454/index.html';
const VW = parseInt(process.argv[3] || '390', 10);
const VH = parseInt(process.argv[4] || '844', 10);
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/nix/store/lpdrfl6n16q5zdf8acp4bni7yczzcx3h-idx-builtins/bin/chromium',
    headless: true,
    protocolTimeout: 60000,
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote','--mute-audio',`--window-size=${VW},${VH}`],
    defaultViewport: { width: VW, height: VH, deviceScaleFactor: 1, isMobile: true, hasTouch: true },
  });
  try {
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(() => {
      let n=0;
      window.requestAnimationFrame = (cb) => { if (n++>2) return 0; return setTimeout(()=>{try{cb(performance.now());}catch(e){}}, 16); };
      // Audio / fetch 무력화 — initGame/hub 부팅 시 네트워크/오디오 시작 방지
      window.Audio = function(){ return { play:()=>Promise.resolve(), pause:()=>{}, addEventListener:()=>{}, removeEventListener:()=>{}, volume:0, loop:false, paused:true }; };
      const _f = window.fetch;
      window.fetch = (...a) => Promise.resolve({ ok:false, status:404, text:()=>Promise.resolve(''), json:()=>Promise.resolve({}) });
    });
    page.on('pageerror', e => console.log('  [pageerror]', e.message.slice(0,160)));
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(2200);
    // 부트
    const result = await page.evaluate(() => {
      const _r = { boot:null, m:null };
      try {
        const _oSI = window.setInterval;
        window.setInterval = function(){return 0;};
        G.profile = { name:'테스트',company:'테스트사',gender:'M',ship:'머스탱' };
        G.act = 1;
        _r.boot = { step:'pre-init', screen: document.querySelector('.scr.on')?.id };
        try { initGame(); _r.boot.step='post-init'; } catch(e){ _r.boot.err='init:'+e.message; }
        window.setInterval = _oSI;
        _r.boot = { ok:true, screen: document.querySelector('.scr.on')?.id };
      } catch (e) { _r.boot = { ok:false, err: e.message }; return _r; }
      const get = (sel) => {
        const el = document.querySelector(sel); if (!el) return null;
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return { l:Math.round(r.left), t:Math.round(r.top), w:Math.round(r.width), h:Math.round(r.height),
                 font: cs.fontSize, pad: cs.padding, minH: cs.minHeight };
      };
      const clipped = [];
      const overflowed = [];
      document.querySelectorAll('.hub-side, .hub-body, #hud, .modal, .btn-lg, .btn, .btn-sm, .hn-btn, .hn-folder-btn').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return;
        // 회전 좌표계로 변환된 화면 안에서, 부모 컨테이너 경계를 벗어났는지 확인
        if (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) {
          overflowed.push({ tag: (el.id||'')+'.'+(''+el.className).split(' ')[0], sw:el.scrollWidth, cw:el.clientWidth, sh:el.scrollHeight, ch:el.clientHeight });
        }
      });
      // stage 자체 fit 검증
      const stage = document.getElementById('game-stage');
      const sR = stage ? stage.getBoundingClientRect() : null;
      const fits = sR ? (sR.left >= -1 && sR.top >= -1 && sR.right <= window.innerWidth+1 && sR.bottom <= window.innerHeight+1) : null;
      _r.m = {
        vp: { w:window.innerWidth, h:window.innerHeight },
        scale: window._gsScale, rotated: window._gsRotated,
        stage: sR ? { l:Math.round(sR.left), t:Math.round(sR.top), w:Math.round(sR.width), h:Math.round(sR.height), fits } : null,
        hud: get('#hud'),
        company: get('#h-co'),
        sidebar: get('.hub-side'),
        sidebarBtn: get('.hn-btn'),
        hubBody: get('.hub-body'),
        titleBtnLg: get('.btn-lg'),
        titleBtnSm: get('.btn-sm'),
        overflowed: overflowed.slice(0, 15),
      };
      return _r;
    });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await browser.close();
  }
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
