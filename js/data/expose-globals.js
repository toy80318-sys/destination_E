// ══════════════════════════════════════════════════════════════════
// 전역 데이터 window 노출 — bugfix 2026-06-11
//   데이터 파일들의 top-level const 는 전역 렉시컬 바인딩이라 window.* 로는
//   접근 불가. 분할 모듈(js/modules/*, story-quest-engine 등)이 window.X 를
//   참조하는 경우를 위해 명시적으로 노출한다. (window.G 는 game.js 에서 노출)
//   로드 위치: index.html 에서 데이터 파일들 직후, 모듈들 이전.
// ══════════════════════════════════════════════════════════════════
(function(){
  if(typeof window==='undefined')return;
  try{window.PLANET_DEF=PLANET_DEF;}catch(e){}
  try{window.HEROES=HEROES;}catch(e){}
  try{window.HERO_LORE=HERO_LORE;}catch(e){}
  try{window.SHIP_CATALOG=SHIP_CATALOG;}catch(e){}
  try{window.PARTS=PARTS;}catch(e){}
  try{window.PARTS_BY_ID=PARTS_BY_ID;}catch(e){}
  try{window.COMMODITIES=COMMODITIES;}catch(e){}
  try{window.CRAFT_RECIPES=CRAFT_RECIPES;}catch(e){}
  try{window.FACTION=FACTION;}catch(e){}
  try{window.FACTION_MATS=FACTION_MATS;}catch(e){}
  try{window.FACTION_LORE=FACTION_LORE;}catch(e){}
  console.log('[expose-globals] Loaded — data consts exposed on window');
})();
