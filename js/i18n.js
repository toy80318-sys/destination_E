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

  return { t, setLang, getLang, register, has, tier, rarity, SUPPORTED, DEFAULT_LANG };
})();
