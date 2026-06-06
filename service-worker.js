// DESTINATION EARTH — PWA Service Worker
// 캐시 버전은 game.js의 _GAME_VER 가 바뀔 때마다 함께 올려야 새 빌드가 강제 갱신됨.
const CACHE_VERSION = 'de-cache-v20260606-112';
const CORE_ASSETS = [
  './',
  './index.html',
  './game.css',
  './game.js',
  './manifest.json',
  './js/data/factions.js',
  './js/data/planets.js',
  './js/data/heroes.js',
  './js/data/commodities.js',
  './js/data/parts.js',
  './js/data/quests.js',
  './js/data/cargo.js',
  './js/data/crafting.js',
  './js/data/ships.js',
  './js/cloudsave.js',
  './img/chars/baekgu1.png'
];

// ── 설치: 핵심 파일 사전 캐싱(설치 실패 방지를 위해 개별 시도) ─────────
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      Promise.allSettled(CORE_ASSETS.map((url) => cache.add(url).catch(() => null)))
    )
  );
});

// ── 활성화: 옛 캐시 정리 ─────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── 요청 가로채기 전략 ───────────────────────────────────────────────
// · Firebase / 외부 도메인: 항상 네트워크 (캐시하지 않음)
// · HTML / JS / CSS / JSON: network-first → 실패 시 cache
// · 이미지·오디오·폰트: cache-first → 없으면 네트워크 후 캐시
// · PC 전용 콘텐츠(js/story-scenes-pc.js, img/chars-hd/*): 가로채지 않음 (웹 빌드엔 부재)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 같은 출처가 아니면(예: firebase, gstatic) 가로채지 않음 → 브라우저 기본 처리
  if (url.origin !== self.location.origin) return;

  // PC 전용 리소스는 캐싱·폴백 대상 아님 (웹 빌드엔 존재하지 않음)
  if (url.pathname.includes('/story-scenes-pc.js') || url.pathname.includes('/chars-hd/')) {
    return;
  }

  const dest = req.destination;
  const isAsset = ['image', 'audio', 'video', 'font'].includes(dest);

  if (isAsset) {
    // cache-first
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
          }
          return res;
        }).catch(() => cached);
      })
    );
  } else {
    // network-first (HTML/JS/CSS 등 — 최신 빌드 즉시 반영)
    event.respondWith(
      fetch(req).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match(req).then((m) => m || caches.match('./index.html')))
    );
  }
});

// ── 메시지: 페이지에서 캐시 강제 갱신 트리거 가능 ──────────────────────
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
