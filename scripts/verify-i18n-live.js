// i18n 라이브 배포 검증 — ko/en 양쪽에서 데이터 도메인 8개 핵심 키 확인 + 콘솔 에러 모니터링
// 사용: node scripts/verify-i18n-live.js [URL]
const puppeteer = require('puppeteer-core');

const URL = process.argv[2] || 'https://cgstation-d8178.web.app/';
const CHROMIUM = '/nix/store/lpdrfl6n16q5zdf8acp4bni7yczzcx3h-idx-builtins/bin/chromium';

// 도메인별 핵심 키 — 마이그레이션 검증용
const PROBES = [
  { domain: 'quest',     key: 'quest.crew.QL01.nm',  expectKo: '가브리엘 드 클리포드',     expectEn: 'Gabriel de Clifford' },
  { domain: 'cargo',     key: 'cargo.CH01.nm',       expectKo: '지구 저항군 군용 컨테이너', expectEn: 'Earth Resistance Military Container' },
  { domain: 'craft',     key: 'craft.LGD01.nm',      expectKo: '거북선 ✦신화',             expectEn: 'Geobukseon ✦Mythic' },
  { domain: 'commodity', key: 'commodity.G19.nm',    expectKo: '보이드 에센스',             expectEn: 'Void Essence' },
  { domain: 'hero',      key: 'hero.H01.nm',         expectKo: '이순신',                   expectEn: 'Yi Sun-sin' },
  { domain: 'part',      key: 'part.MMB01.nm',       expectKo: '이휘소 방정식 미사일 ❖신화', expectEn: 'Lee Hwi-soh Equation Missile ❖Mythic' },
  { domain: 'ship',      key: 'ship.URSA.nm',        expectKo: '우르사 메이저',             expectEn: 'Ursa Major' },
  { domain: 'faction',   key: 'faction.F07.nm',      expectKo: '보이드',                   expectEn: 'Void' },
  { domain: 'special',   key: 'special.baekgu.nm',   expectKo: '백구',                     expectEn: 'Baekgu' },
  { domain: 'sys',       key: 'sys.map.name',        expectKo: '은하 지도',                 expectEn: 'Galaxy Map' },
  { domain: 'planet',    key: 'planet.P31.nm',       expectKo: '지구',                     expectEn: 'Earth' },
];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROMIUM,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    headless: 'new'
  });
  try {
    const page = await browser.newPage();

    const consoleErrors = [];
    const pageErrors = [];
    const failedRequests = [];
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', e => { pageErrors.push(e.message); });
    page.on('response', resp => {
      const s = resp.status();
      if (s >= 400) failedRequests.push(`${s} ${resp.url()}`);
    });

    console.log('[1/4] Loading', URL);
    await page.goto(URL, { waitUntil: 'load', timeout: 60000 });

    // I18N 시스템 로드까지 대기
    await page.waitForFunction(() => window.I18N && typeof window.I18N.t === 'function', { timeout: 30000 });
    console.log('[2/4] I18N system loaded');

    // 사전 키 개수 확인
    const dictSize = await page.evaluate(() => {
      let n = 0;
      // 내부 _dict는 클로저라 직접 접근 불가 — has()로 샘플 키들 체크
      return n;
    });

    // 페이즈 1: 현재 언어로 키 조회
    const currentLang = await page.evaluate(() => window.I18N.getLang());
    console.log('[3/4] Current lang:', currentLang);

    const results = { ko: {}, en: {} };

    // ko 결과 수집
    if (currentLang === 'ko') {
      for (const p of PROBES) {
        const v = await page.evaluate(k => window.I18N.t(k), p.key);
        results.ko[p.key] = v;
      }
    }

    // en 으로 전환 — setLang은 리로드를 트리거하므로 _lang 직접 변경하고 t() 다시 호출 (검증 한정)
    // 실제 setLang은 saveGame + reload — 우리는 검증 목적이므로 페이지 reload 후 navigator.language 'en' 시뮬
    // 단순 방식: localStorage 'de_language'='en' 설정 후 reload
    console.log('[4/4] Switching to EN and verifying...');
    await page.evaluate(() => { try { localStorage.setItem('de_language', 'en'); } catch (e) {} });
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => window.I18N && window.I18N.getLang() === 'en', { timeout: 30000 });

    for (const p of PROBES) {
      const v = await page.evaluate(k => window.I18N.t(k), p.key);
      results.en[p.key] = v;
    }

    // ko 측정도 한 번 더 (en에서 ko 키 조회)
    await page.evaluate(() => { try { localStorage.setItem('de_language', 'ko'); } catch (e) {} });
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => window.I18N && window.I18N.getLang() === 'ko', { timeout: 30000 });
    for (const p of PROBES) {
      const v = await page.evaluate(k => window.I18N.t(k), p.key);
      results.ko[p.key] = v;
    }

    // 결과 출력
    console.log('\n─── PROBE RESULTS ────────────────────────────────');
    let pass = 0, fail = 0;
    for (const p of PROBES) {
      const koGot = results.ko[p.key];
      const enGot = results.en[p.key];
      const koOk = koGot === p.expectKo;
      const enOk = enGot === p.expectEn;
      if (koOk && enOk) {
        console.log(`✅ ${p.domain.padEnd(10)} ${p.key.padEnd(28)} ko="${koGot}" / en="${enGot}"`);
        pass++;
      } else {
        console.log(`❌ ${p.domain.padEnd(10)} ${p.key}`);
        if (!koOk) console.log(`   ko expected: "${p.expectKo}"  got: "${koGot}"`);
        if (!enOk) console.log(`   en expected: "${p.expectEn}"  got: "${enGot}"`);
        fail++;
      }
    }

    console.log('\n─── SUMMARY ──────────────────────────────────────');
    console.log(`Probes: ${pass}/${PROBES.length} pass · ${fail} fail`);
    console.log(`Console errors: ${consoleErrors.length}`);
    if (consoleErrors.length) {
      consoleErrors.slice(0, 10).forEach((e, i) => console.log(`  [${i + 1}] ${e.slice(0, 200)}`));
    }
    console.log(`Page errors: ${pageErrors.length}`);
    if (pageErrors.length) {
      pageErrors.slice(0, 10).forEach((e, i) => console.log(`  [${i + 1}] ${e.slice(0, 200)}`));
    }
    console.log(`Failed HTTP requests: ${failedRequests.length}`);
    failedRequests.slice(0, 10).forEach((e, i) => console.log(`  [${i + 1}] ${e}`));

    process.exitCode = (fail > 0 || pageErrors.length > 0) ? 1 : 0;
  } catch (e) {
    console.error('[verify] error:', e.message);
    process.exitCode = 2;
  } finally {
    await browser.close();
  }
})();
