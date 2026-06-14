// DESTINATION EARTH — i18n (다국어)
// 사용법:
//   I18N.t('menu.start')              — 키로 번역 조회 (미정의 키는 키 자체 반환)
//   I18N.t('greet',{name:'A'})        — {name} 치환
//   I18N.setLang('en'|'ko')           — 언어 전환 (저장 + 페이지 새로고침)
//   I18N.getLang()                    — 현재 언어
//   I18N.register({key:{ko:'',en:''}}) — 사전 등록 (data 파일 또는 모듈에서)
//   I18N.has(key)                     — 키 존재 여부
//
// 새 키 추가 정책:
//   1) 가능하면 점진적으로: 기존 한국어 문자열을 I18N.t('section.key')로 교체
//   2) en 번역이 없으면 ko fallback. 누락 시 키 그대로 표시 → 디버그 용이
//   3) 사전 파일은 js/data/i18n_dict.js (코어), 추가 사전은 도메인별 분할 가능
window.I18N = (function () {
  const DEFAULT_LANG = 'ko';
  const SUPPORTED = ['ko', 'en'];
  const LANG_KEY = 'de_language';

  let _lang;
  try {
    // 1순위: URL 쿼리 파라미터 ?lang=en|ko (CG Station 등 외부 사이트에서 영문 강제 확인용)
    let urlLang = null;
    try {
      const _qs = (window.location && window.location.search) || '';
      const _m = _qs.match(/[?&]lang=([a-zA-Z]{2})/);
      if (_m) urlLang = _m[1].toLowerCase();
    } catch (e) {}
    if (urlLang && SUPPORTED.indexOf(urlLang) >= 0) {
      _lang = urlLang;
      // 쿼리로 들어온 언어를 localStorage에도 저장 → 새로고침해도 유지
      try { localStorage.setItem(LANG_KEY, _lang); } catch (e) {}
    } else {
      const saved = localStorage.getItem(LANG_KEY);
      if (saved && SUPPORTED.indexOf(saved) >= 0) {
        _lang = saved;
      } else {
        const browser = ((navigator.language || 'ko').slice(0, 2)).toLowerCase();
        _lang = SUPPORTED.indexOf(browser) >= 0 ? browser : DEFAULT_LANG;
      }
    }
  } catch (e) { _lang = DEFAULT_LANG; }

  const _dict = Object.create(null);

  function t(key, params) {
    const entry = _dict[key];
    if (!entry) return key; // 미정의 키는 키 자체 반환 (디버그 용이)
    let val = entry[_lang];
    if (val === undefined || val === null) val = entry[DEFAULT_LANG];
    if (val === undefined || val === null) val = key;
    if (params && typeof val === 'string') {
      for (const p in params) {
        if (Object.prototype.hasOwnProperty.call(params, p)) {
          val = val.split('{' + p + '}').join(String(params[p]));
        }
      }
    }
    return val;
  }

  function setLang(lang) {
    if (SUPPORTED.indexOf(lang) < 0) return false;
    if (_lang === lang) return true;
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
    _lang = lang;
    // 사용자 보고 (2026-06-06, eng2.png): 언어 전환 시 함선·행성이 사라지는 현상.
    //   원인: 종전 코드는 _activeSlot != null 일 때만 저장 → 새 게임은 _activeSlot 미설정이라
    //         저장이 스킵됨. 또한 saveGame(silent=true)는 800ms 디바운스라 100ms 후 reload 전
    //         실제 저장이 완료되지 않을 수 있음.
    //   수정: G.profile.name 만 있으면 (게임 진행 중) 강제로 동기 저장. 슬롯이 없으면 1번 폴백.
    try {
      var _G = window.G;
      if (_G && _G.profile && _G.profile.name) {
        var _slot = (_G._activeSlot != null) ? _G._activeSlot : 1;
        // 디바운스 우회: 내부 즉시 저장 함수가 노출돼 있으면 그것을 호출, 없으면 saveGame(false)로
        // 명시적(non-silent) 호출하여 디바운스를 우회 (saveGame은 silent=false에서 즉시 실행).
        if (typeof window._saveGameImmediate === 'function') {
          window._saveGameImmediate(true, _slot);
        } else if (typeof window.saveGame === 'function') {
          window.saveGame(false, _slot);
        }
      }
    } catch (e) { console.warn('[setLang autosave]', e); }
    // Electron PC 빌드: 메인 프로세스(메뉴 라벨) 동기화 — 새로고침 전에 호출
    try {
      if (window.desktopAPI && typeof window.desktopAPI.setLangPref === 'function') {
        window.desktopAPI.setLangPref(lang);
      }
    } catch (e) {}
    // 사용자 보고 (2026-06-06): Windows PC 빌드에서 한글 전환이 동작하지 않는 현상.
    //   원인: PC 첫 부팅 시 영문 모드면 file://path/index.html?lang=en 으로 로드됨.
    //         setLang('ko') → reload 시 URL 쿼리(?lang=en)가 보존돼 i18n 재초기화 시
    //         URL 쿼리가 localStorage(ko)보다 우선 적용 → 영문으로 회귀.
    //   수정: reload 전 history.replaceState 로 ?lang= 쿼리 제거 → localStorage 가 정상 적용.
    try {
      var _u = new URL(window.location.href);
      if (_u.searchParams.has('lang')) {
        _u.searchParams.delete('lang');
        var _newUrl = _u.pathname + (_u.search || '') + (_u.hash || '');
        window.history.replaceState(null, '', _newUrl);
      }
    } catch (e) {}
    // 동기 저장이 끝났으므로 reload 지연을 줄임 (사용자 체감 응답성 개선)
    setTimeout(function () { try { window.location.reload(); } catch (e) {} }, 50);
    return true;
  }

  function getLang() { return _lang; }
  function has(key) { return !!_dict[key]; }
  // 단일 키의 양 언어 원본 엔트리 반환 — 역방향 lookup(이름→키 마이그레이션)에 사용
  function getEntry(key) { return _dict[key] || null; }

  // 한국어 tier enum('소형'/'중형'/'대형'/'신화') → 번역. 데이터 비교(예: s.tier==='소형')는 한국어 enum 유지.
  // 사용: I18N.tier(ship.tier) — UI 표시 사이트에서만 호출
  const _TIER_KEY = { '소형': 'tier.small', '중형': 'tier.medium', '대형': 'tier.large', '신화': 'tier.mythic', '전설기함': 'tier.legendFlagship' };
  function tier(value) {
    if (!value) return value;
    const k = _TIER_KEY[value];
    return k ? t(k) : value;
  }
  // 희귀도(rarity) 코드 + 한국어 라벨 양방향 지원 → 번역.
  //  · 코드 입력: 'N'·'R'·'H'·'L'·'S' (크루) 또는 'common'·'uncommon'·'rare'·'hero'·'legend'·'mythic'·'set' (파츠/장비)
  //  · 한국어 라벨 입력: '일반'·'희귀'·'영웅'·'전설'·'신화'·'세트'·'스토리'
  // 사용: I18N.rarity(c.rarity) — UI 표시 사이트에서 호출 (데이터 비교는 그대로 유지)
  const _RARITY_KEY = {
    'N': 'rarity.common', 'R': 'rarity.rare', 'H': 'rarity.hero', 'L': 'rarity.legend', 'S': 'rarity.story',
    'common': 'rarity.common', 'uncommon': 'rarity.uncommon', 'rare': 'rarity.rare',
    'hero': 'rarity.hero', 'legend': 'rarity.legend', 'mythic': 'rarity.mythic', 'set': 'rarity.set',
    '일반': 'rarity.common', '고급': 'rarity.uncommon', '희귀': 'rarity.rare',
    '영웅': 'rarity.hero', '전설': 'rarity.legend', '신화': 'rarity.mythic', '세트': 'rarity.set', '스토리': 'rarity.story'
  };
  function rarity(value) {
    if (!value) return value;
    const k = _RARITY_KEY[value];
    return k ? t(k) : value;
  }

  function register(dict) {
    if (!dict || typeof dict !== 'object') return;
    for (const k in dict) {
      if (Object.prototype.hasOwnProperty.call(dict, k)) {
        _dict[k] = dict[k];
      }
    }
  }

  // ── 로케일별 등록 (글로벌 표준 구조) ────────────────────────────────
  //   registerLocale('en', { 'menu.start': 'Start', ... })  — 키→값 평면 사전
  //   언어 추가 = 파일 1개(i18n/<lang>.js)에서 이 함수 1회 호출. 기존 키별 {ko,en} 저장소에
  //   해당 언어 필드만 채워 넣으므로 t()/getEntry() 등 기존 동작과 완전 호환.
  function registerLocale(lang, dict) {
    if (!lang || !dict || typeof dict !== 'object') return;
    const isNew = SUPPORTED.indexOf(lang) < 0;
    if (isNew) SUPPORTED.push(lang); // 새 언어 자동 인식
    for (const k in dict) {
      if (Object.prototype.hasOwnProperty.call(dict, k)) {
        if (!_dict[k]) _dict[k] = Object.create(null);
        _dict[k][lang] = dict[k];
      }
    }
    // 새 언어가 방금 등록됐고 사용자 저장 선호(URL ?lang= 또는 localStorage)가 이 언어라면 _lang 보정.
    //   초기 _lang 감지는 로케일 파일 로드 전이라 SUPPORTED에 없어 놓쳤을 수 있음 → 여기서 적용.
    if (isNew && _lang !== lang) {
      try {
        let pref = null;
        const m = ((window.location && window.location.search) || '').match(/[?&]lang=([a-zA-Z]{2})/);
        if (m) pref = m[1].toLowerCase();
        if (!pref) { const sv = localStorage.getItem(LANG_KEY); if (sv) pref = sv; }
        if (pref === lang) { _lang = lang; applyI18nToDOM(); }
      } catch (e) {}
    }
  }

  // ── DOM 자동 적용 ────────────────────────────────────────────────
  // [data-i18n="key"]        → element.textContent = I18N.t(key)
  // [data-i18n-html="key"]   → element.innerHTML  = I18N.t(key)
  // [data-i18n-title="key"]  → element.title      = I18N.t(key)
  // [data-i18n-attr="key"]   → element.setAttribute(...) (e.g., placeholder)
  // 호출: applyI18nToDOM() — 페이지 로드 시 / 언어 전환 시 자동 호출
  function applyI18nToDOM(root) {
    root = root || document;
    try {
      root.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (key) el.textContent = t(key);
      });
      root.querySelectorAll('[data-i18n-html]').forEach(el => {
        const key = el.getAttribute('data-i18n-html');
        if (key) el.innerHTML = t(key);
      });
      root.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        if (key) el.title = t(key);
      });
      root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (key) el.setAttribute('placeholder', t(key));
      });
      root.querySelectorAll('[data-i18n-value]').forEach(el => {
        const key = el.getAttribute('data-i18n-value');
        if (key) el.value = t(key);
      });
      root.querySelectorAll('[data-i18n-alt]').forEach(el => {
        const key = el.getAttribute('data-i18n-alt');
        if (key) el.setAttribute('alt', t(key));
      });
    } catch (e) { /* ignore — DOM may not be ready */ }
  }
  // DOMContentLoaded 시 자동 적용 (이미 로드됐으면 즉시)
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => applyI18nToDOM());
    } else {
      setTimeout(() => applyI18nToDOM(), 0);
    }
  }

  return { t, setLang, getLang, register, registerLocale, has, getEntry, tier, rarity, applyI18nToDOM, SUPPORTED, DEFAULT_LANG };
})();
