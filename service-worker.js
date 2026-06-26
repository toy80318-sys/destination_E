// DESTINATION EARTH — PWA Service Worker (v2 — 캐시 효율화)
// 캐시 버전은 game.js의 _GAME_VER 가 바뀔 때마다 함께 올려야 새 빌드가 강제 갱신됨.
const CACHE_VERSION = 'de-cache-v20260626-014';

// ── 캐시를 두 종류로 분리하여 LRU·정리 효율화 ──────────────────────────
// · CORE: 핵심 코드(HTML/JS/CSS) — 항상 최신 (network-first)
// · ASSETS: 이미지·오디오·폰트 — cache-first + LRU 200개 캡
const CORE_CACHE = CACHE_VERSION + '-core';
const ASSETS_CACHE = CACHE_VERSION + '-assets';
const ASSETS_MAX_ENTRIES = 200;

// 설치 시 미리 캐싱하는 최소 핵심 파일 (게임 부팅 필수)
const CORE_ASSETS = [
  './',
  './index.html',
  './game.css',
  './game.js',
  './manifest.json',
  './i18n/ko.js',
  './i18n/en.js',
  './js/data/factions.js',
  './js/data/planets.js',
  './js/data/heroes.js',
  './js/data/commodities.js',
  './js/data/parts.js',
  './js/data/quests.js',
  './js/data/cargo.js',
  './js/data/crafting.js',
  './js/data/ships.js',
  './js/data/phase1_quests.js',
  './js/data/phase2_quests.js',
  './js/data/phase3_quests.js',
  './js/cloudsave.js',
  './img/chars/baekgu1.png'
];

// ── LRU 정리: 캐시가 너무 커지면 가장 오래된 키부터 제거 ────────────────
async function _trimCache(cacheName, maxEntries){
  try{
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if(keys.length <= maxEntries) return;
    const toDelete = keys.length - maxEntries;
    for(let i = 0; i < toDelete; i++){
      await cache.delete(keys[i]);
    }
  }catch(e){/* 정리 실패 시 무시 — 다음 기회 */}
}

// ── 설치: 핵심 파일 사전 캐싱 (실패해도 게임 시작 가능) ────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CORE_CACHE).then((cache) =>
      Promise.allSettled(CORE_ASSETS.map((url) => cache.add(url).catch(() => null)))
    )
  );
});

// ── 활성화: 옛 버전 캐시 모두 정리 ──────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── 요청 가로채기 ──────────────────────────────────────────────────────
// · 외부 도메인 (Firebase 등): 가로채지 않음
// · HD 캐릭터 이미지 (PC 전용 img/chars-hd/*, img/chars/H/*): 가로채지 않음
// · HTML/JS/CSS/JSON: CORE_CACHE network-first
// · 이미지/오디오/폰트: ASSETS_CACHE cache-first + LRU 200 cap
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes('/chars-hd/')) return;
  if (url.pathname.includes('/img/chars/H/')) return;

  const dest = req.destination;
  const isAsset = ['image', 'audio', 'video', 'font'].includes(dest);

  if (isAsset) {
    // cache-first (ASSETS_CACHE)
    event.respondWith((async () => {
      const cache = await caches.open(ASSETS_CACHE);
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const res = await fetch(req);
        if (res && res.status === 200) {
          cache.put(req, res.clone());
          // LRU 정리는 비동기로 (응답 지연 차단)
          _trimCache(ASSETS_CACHE, ASSETS_MAX_ENTRIES);
        }
        return res;
      } catch (e) {
        return cached || new Response('', { status: 504 });
      }
    })());
  } else {
    // network-first (CORE_CACHE)
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res && res.status === 200) {
          const cache = await caches.open(CORE_CACHE);
          cache.put(req, res.clone());
        }
        return res;
      } catch (e) {
        const cached = await caches.match(req);
        return cached || (await caches.match('./index.html'));
      }
    })());
  }
});

// ── 메시지: 페이지에서 강제 갱신 / 캐시 비우기 트리거 ────────────────────
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
  if (event.data === 'CLEAR_ASSETS_CACHE') {
    caches.delete(ASSETS_CACHE).catch(() => {});
  }
  if (event.data === 'CLEAR_ALL_CACHE') {
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
  }
});
