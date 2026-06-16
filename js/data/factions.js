// ═══ FACTION DATA ═════════════════════════════════════════════════
// 게임 내 7개 팩션(문명) 정의. ring은 갤럭시 내 거리(0=중심, 6=외곽).
// nm/로어 텍스트는 i18n_dict.js의 'faction.<id>.*' / 'special.<id>.*' 키로 다국어화.
const FACTION={
  F01:{nm:I18N.t('faction.F01.nm'),col:'#4a90d9',ring:2},F02:{nm:I18N.t('faction.F02.nm'),col:'#d4af37',ring:3},
  F03:{nm:I18N.t('faction.F03.nm'),col:'#7ecbce',ring:4},F04:{nm:I18N.t('faction.F04.nm'),col:'#c0392b',ring:5},
  F05:{nm:I18N.t('faction.F05.nm'),col:'#8b00ff',ring:1,hostile:true},F06:{nm:I18N.t('faction.F06.nm'),col:'#2ecc71',ring:6},
  F07:{nm:I18N.t('faction.F07.nm'),col:'#00f3ff',ring:0,void:true}
};

// 팩션별 특산 재료 (행성 상점 보장 판매)
const FACTION_MATS={F01:'R07',F02:'R03',F03:'R05',F04:'R04',F05:'R02',F06:'R06',F07:'R01'};

// ═══ SPECIAL CHARACTERS — 영웅 외 주요 인물 (백구·보스·히든) ════════════
// 인물 도감(영웅 탭)에 영웅 8인과 함께 표시. 영웅과 동일한 형식 — 이름·발견·능력·장단점·성격·위트
const SPECIAL_CHARS=[
  {
    id:'NPC_BAEKGU', nm:I18N.t('special.baekgu.nm'), ic:'🐕', img:'img/chars/baekgu1.png',
    role:I18N.t('special.baekgu.role'),
    found:I18N.t('special.baekgu.found'),
    stats:I18N.t('special.baekgu.stats'),
    pros:I18N.t('special.baekgu.pros'),
    cons:I18N.t('special.baekgu.cons'),
    personality:I18N.t('special.baekgu.personality'),
    creator:I18N.t('special.baekgu.creator'),
    quip:I18N.t('special.baekgu.quip')
  },
  {
    id:'NPC_URSA', nm:I18N.t('special.ursa.nm'), ic:'💀', img:'img/chars/ursa.png',
    role:I18N.t('special.ursa.role'),
    found:I18N.t('special.ursa.found'),
    stats:I18N.t('special.ursa.stats'),
    pros:I18N.t('special.ursa.pros'),
    cons:I18N.t('special.ursa.cons'),
    personality:I18N.t('special.ursa.personality'),
    creator:I18N.t('special.ursa.creator'),
    quip:I18N.t('special.ursa.quip')
  },
  {
    id:'NPC_BLACKFALCON', nm:I18N.t('special.blackfalcon.nm'), ic:'🌑', img:'img/chars/void_hiden.png',
    role:I18N.t('special.blackfalcon.role'),
    found:I18N.t('special.blackfalcon.found'),
    stats:I18N.t('special.blackfalcon.stats'),
    pros:I18N.t('special.blackfalcon.pros'),
    cons:I18N.t('special.blackfalcon.cons'),
    personality:I18N.t('special.blackfalcon.personality'),
    creator:I18N.t('special.blackfalcon.creator'),
    quip:I18N.t('special.blackfalcon.quip')
  }
];

// ═══ STORY NPCs — 컷씬에서 대화한 조연 인물 (도감 인물 탭) ═══════════════
//   컷씬에서 한 번이라도 등장(시청)하면 도감 인물 탭에 해금. id = 컷씬 char 키.
const STORY_NPCS=[
  {id:'aori',           nm:I18N.t('npc.aori'),          ic:'🍺', img:'img/chars/aori.png',           color:'#d4a574', role:I18N.t('npcLore.aori.role'),           desc:I18N.t('npcLore.aori.desc')},
  {id:'wolf_elder',     nm:I18N.t('npc.wolfElder'),     ic:'👴', img:'img/chars/wolf_elder.png',     color:'#a8b3c0', role:I18N.t('npcLore.wolf_elder.role'),     desc:I18N.t('npcLore.wolf_elder.desc')},
  {id:'nav_ai',         nm:I18N.t('npc.navAi'),         ic:'🛰️', img:'img/chars/nav_ai.png',         color:'#9ee7ff', role:I18N.t('npcLore.nav_ai.role'),         desc:I18N.t('npcLore.nav_ai.desc')},
  {id:'volcan',         nm:I18N.t('npc.volcan'),        ic:'🔥', img:'img/chars/volcan.png',         color:'#ff8844', role:I18N.t('npcLore.volcan.role'),         desc:I18N.t('npcLore.volcan.desc')},
  {id:'chiks_vanguard', nm:I18N.t('npc.chiksVanguard'), ic:'👾', img:'img/chars/chiks_vanguard.png', color:'#cc66ff', role:I18N.t('npcLore.chiks_vanguard.role'), desc:I18N.t('npcLore.chiks_vanguard.desc')},
  {id:'maximov',        nm:I18N.t('npc.maximoff'),      ic:'🎖️', img:'img/chars/maximov.png',        color:'#ffd700', role:I18N.t('npcLore.maximov.role'),        desc:I18N.t('npcLore.maximov.desc')}
];
try{if(typeof window!=='undefined')window.STORY_NPCS=STORY_NPCS;}catch(e){}

// ═══ SYSTEM GUIDE — 은하계 시스템 생존 필수지식 ═══════════════════════
// 각 시스템별 위치·역할·담당자·해금조건·특징·주의사항·위트 의견
const SYSTEM_GUIDE=[
  {key:'map',    icon:'🗺️', name:I18N.t('sys.map.name'),    img:'img/hub/route.png',  location:I18N.t('sys.map.location'),    desc:I18N.t('sys.map.desc'),    operator:I18N.t('sys.map.operator'),    unlock:I18N.t('sys.map.unlock'),    features:I18N.t('sys.map.features'),    warn:I18N.t('sys.map.warn'),    quip:I18N.t('sys.map.quip')},
  {key:'crew',   icon:'👥', name:I18N.t('sys.crew.name'),   img:'img/hub/crew.png',   location:I18N.t('sys.crew.location'),   desc:I18N.t('sys.crew.desc'),   operator:I18N.t('sys.crew.operator'),   unlock:I18N.t('sys.crew.unlock'),   features:I18N.t('sys.crew.features'),   warn:I18N.t('sys.crew.warn'),   quip:I18N.t('sys.crew.quip')},
  {key:'quest',  icon:'🎖️', name:I18N.t('sys.quest.name'),  img:'img/hub/quest.png',  location:I18N.t('sys.quest.location'),  desc:I18N.t('sys.quest.desc'),  operator:I18N.t('sys.quest.operator'),  unlock:I18N.t('sys.quest.unlock'),  features:I18N.t('sys.quest.features'),  warn:I18N.t('sys.quest.warn'),  quip:I18N.t('sys.quest.quip')},
  {key:'tavern', icon:'🍺', name:I18N.t('sys.tavern.name'), img:'img/hub/tavern.png', location:I18N.t('sys.tavern.location'), desc:I18N.t('sys.tavern.desc'), operator:I18N.t('sys.tavern.operator'), unlock:I18N.t('sys.tavern.unlock'), features:I18N.t('sys.tavern.features'), warn:I18N.t('sys.tavern.warn'), quip:I18N.t('sys.tavern.quip')},
  {key:'trade',  icon:'🏬', name:I18N.t('sys.trade.name'),  img:'img/hub/trade.png',  location:I18N.t('sys.trade.location'),  desc:I18N.t('sys.trade.desc'),  operator:I18N.t('sys.trade.operator'),  unlock:I18N.t('sys.trade.unlock'),  features:I18N.t('sys.trade.features'),  warn:I18N.t('sys.trade.warn'),  quip:I18N.t('sys.trade.quip')},
  {key:'garage', icon:'🔧', name:I18N.t('sys.garage.name'), img:'img/hub/garage.png', location:I18N.t('sys.garage.location'), desc:I18N.t('sys.garage.desc'), operator:I18N.t('sys.garage.operator'), unlock:I18N.t('sys.garage.unlock'), features:I18N.t('sys.garage.features'), warn:I18N.t('sys.garage.warn'), quip:I18N.t('sys.garage.quip')},
  {key:'ship',   icon:'🛸', name:I18N.t('sys.ship.name'),   img:'img/hub/ship.png',   location:I18N.t('sys.ship.location'),   desc:I18N.t('sys.ship.desc'),   operator:I18N.t('sys.ship.operator'),   unlock:I18N.t('sys.ship.unlock'),   features:I18N.t('sys.ship.features'),   warn:I18N.t('sys.ship.warn'),   quip:I18N.t('sys.ship.quip')},
  {key:'craft',  icon:'⚗️', name:I18N.t('sys.craft.name'),  img:'img/hub/craft.png',  location:I18N.t('sys.craft.location'),  desc:I18N.t('sys.craft.desc'),  operator:I18N.t('sys.craft.operator'),  unlock:I18N.t('sys.craft.unlock'),  features:I18N.t('sys.craft.features'),  warn:I18N.t('sys.craft.warn'),  quip:I18N.t('sys.craft.quip')},
  {key:'gather', icon:'🔭', name:I18N.t('sys.gather.name'), img:'img/hub/route.png',  location:I18N.t('sys.gather.location'), desc:I18N.t('sys.gather.desc'), operator:I18N.t('sys.gather.operator'), unlock:I18N.t('sys.gather.unlock'), features:I18N.t('sys.gather.features'), warn:I18N.t('sys.gather.warn'), quip:I18N.t('sys.gather.quip')},
  {key:'auction',icon:'🔨', name:I18N.t('sys.auction.name'),img:'img/hub/auction.png',location:I18N.t('sys.auction.location'),desc:I18N.t('sys.auction.desc'),operator:I18N.t('sys.auction.operator'),unlock:I18N.t('sys.auction.unlock'),features:I18N.t('sys.auction.features'),warn:I18N.t('sys.auction.warn'),quip:I18N.t('sys.auction.quip')}
];

// ═══ FACTION LORE — 문명 도감 ════════════════════════════════════════
// 각 팩션의 대표 행성, 시작 행성, 환경, 특징, 주의사항, 외계인 생김새, 위트 의견
const FACTION_LORE={
  F01:{icon:'👑',rep:'P01',start:I18N.t('faction.F01.start'),env:I18N.t('faction.F01.env'),traits:I18N.t('faction.F01.traits'),warn:I18N.t('faction.F01.warn'),look:I18N.t('faction.F01.look'),quip:I18N.t('faction.F01.quip')},
  F02:{icon:'💰',rep:'P06',start:I18N.t('faction.F02.start'),env:I18N.t('faction.F02.env'),traits:I18N.t('faction.F02.traits'),warn:I18N.t('faction.F02.warn'),look:I18N.t('faction.F02.look'),quip:I18N.t('faction.F02.quip')},
  F03:{icon:'⚙️',rep:'P09',start:I18N.t('faction.F03.start'),env:I18N.t('faction.F03.env'),traits:I18N.t('faction.F03.traits'),warn:I18N.t('faction.F03.warn'),look:I18N.t('faction.F03.look'),quip:I18N.t('faction.F03.quip')},
  F04:{icon:'⚔️',rep:'P13',start:I18N.t('faction.F04.start'),env:I18N.t('faction.F04.env'),traits:I18N.t('faction.F04.traits'),warn:I18N.t('faction.F04.warn'),look:I18N.t('faction.F04.look'),quip:I18N.t('faction.F04.quip')},
  F05:{icon:'💀',rep:'P17',start:I18N.t('faction.F05.start'),env:I18N.t('faction.F05.env'),traits:I18N.t('faction.F05.traits'),warn:I18N.t('faction.F05.warn'),look:I18N.t('faction.F05.look'),quip:I18N.t('faction.F05.quip')},
  F06:{icon:'🌍',rep:'P22',start:I18N.t('faction.F06.start'),env:I18N.t('faction.F06.env'),traits:I18N.t('faction.F06.traits'),warn:I18N.t('faction.F06.warn'),look:I18N.t('faction.F06.look'),quip:I18N.t('faction.F06.quip')},
  F07:{icon:'🌀',rep:'P30',start:I18N.t('faction.F07.start'),env:I18N.t('faction.F07.env'),traits:I18N.t('faction.F07.traits'),warn:I18N.t('faction.F07.warn'),look:I18N.t('faction.F07.look'),quip:I18N.t('faction.F07.quip')}
};
