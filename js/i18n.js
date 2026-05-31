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
    const saved = localStorage.getItem(LANG_KEY);
    if (saved && SUPPORTED.indexOf(saved) >= 0) {
      _lang = saved;
    } else {
      const browser = ((navigator.language || 'ko').slice(0, 2)).toLowerCase();
      _lang = SUPPORTED.indexOf(browser) >= 0 ? browser : DEFAULT_LANG;
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
    // 가장 안전하고 일관된 변경: 페이지 새로고침
    // (게임 진행 중이면 자동저장 후 새로고침 — saveGame은 game.js가 정의)
    try { if (typeof window.saveGame === 'function') window.saveGame(true); } catch (e) {}
    setTimeout(function () { try { window.location.reload(); } catch (e) {} }, 100);
    return true;
  }

  function getLang() { return _lang; }
  function has(key) { return !!_dict[key]; }

  function register(dict) {
    if (!dict || typeof dict !== 'object') return;
    for (const k in dict) {
      if (Object.prototype.hasOwnProperty.call(dict, k)) {
        _dict[k] = dict[k];
      }
    }
  }

  return { t, setLang, getLang, register, has, SUPPORTED, DEFAULT_LANG };
})();
