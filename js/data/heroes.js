// ═══ HERO & NPC DATA ══════════════════════════════════════════════
// 8명의 전설 영웅(역사 인물) + NPC 크루 풀.
// nm/sk 및 HERO_LORE의 origin/found/stats/char/op는 i18n_dict.js의 'hero.<id>.*' 키로 다국어화.
const HEROES={
  H01:{nm:I18N.t('hero.H01.nm'),cl:'Pilot',ic:'⚔️',STR:99,ATT:88,INT:150,DEF:70,HP:120,LOY:100,sk:I18N.t('hero.H01.sk')},
  H02:{nm:I18N.t('hero.H02.nm'),cl:'Eng',ic:'⚙️',STR:60,ATT:70,INT:115,DEF:40,HP:110,LOY:100,sk:I18N.t('hero.H02.sk')},
  H03:{nm:I18N.t('hero.H03.nm'),cl:'Pilot',ic:'👑',STR:150,ATT:110,INT:80,DEF:60,HP:140,LOY:100,sk:I18N.t('hero.H03.sk')},
  H04:{nm:I18N.t('hero.H04.nm'),cl:'Pilot',ic:'🚀',STR:75,ATT:140,INT:100,DEF:30,HP:90,LOY:95,sk:I18N.t('hero.H04.sk')},
  H05:{nm:I18N.t('hero.H05.nm'),cl:'Pilot',ic:'🎖️',STR:145,ATT:82,INT:65,DEF:45,HP:85,LOY:92,sk:I18N.t('hero.H05.sk')},
  H06:{nm:I18N.t('hero.H06.nm'),cl:'Eng',ic:'🧪',STR:150,ATT:110,INT:150,DEF:80,HP:100,LOY:100,sk:I18N.t('hero.H06.sk')},
  H07:{nm:I18N.t('hero.H07.nm'),cl:'Eng',ic:'⚡',STR:110,ATT:90,INT:95,DEF:35,HP:80,LOY:95,sk:I18N.t('hero.H07.sk')},
  H08:{nm:I18N.t('hero.H08.nm'),cl:'Merch',ic:'🧭',STR:60,ATT:120,INT:90,DEF:25,HP:80,LOY:95,sk:I18N.t('hero.H08.sk')}
};

const HERO_LORE={
  'H01':{origin:I18N.t('hero.H01.origin'),found:I18N.t('hero.H01.found'),stats:I18N.t('hero.H01.stats'),char:I18N.t('hero.H01.char'),op:I18N.t('hero.H01.op')},
  'H02':{origin:I18N.t('hero.H02.origin'),found:I18N.t('hero.H02.found'),stats:I18N.t('hero.H02.stats'),char:I18N.t('hero.H02.char'),op:I18N.t('hero.H02.op')},
  'H03':{origin:I18N.t('hero.H03.origin'),found:I18N.t('hero.H03.found'),stats:I18N.t('hero.H03.stats'),char:I18N.t('hero.H03.char'),op:I18N.t('hero.H03.op')},
  'H04':{origin:I18N.t('hero.H04.origin'),found:I18N.t('hero.H04.found'),stats:I18N.t('hero.H04.stats'),char:I18N.t('hero.H04.char'),op:I18N.t('hero.H04.op')},
  'H05':{origin:I18N.t('hero.H05.origin'),found:I18N.t('hero.H05.found'),stats:I18N.t('hero.H05.stats'),char:I18N.t('hero.H05.char'),op:I18N.t('hero.H05.op')},
  'H06':{origin:I18N.t('hero.H06.origin'),found:I18N.t('hero.H06.found'),stats:I18N.t('hero.H06.stats'),char:I18N.t('hero.H06.char'),op:I18N.t('hero.H06.op')},
  'H07':{origin:I18N.t('hero.H07.origin'),found:I18N.t('hero.H07.found'),stats:I18N.t('hero.H07.stats'),char:I18N.t('hero.H07.char'),op:I18N.t('hero.H07.op')},
  'H08':{origin:I18N.t('hero.H08.origin'),found:I18N.t('hero.H08.found'),stats:I18N.t('hero.H08.stats'),char:I18N.t('hero.H08.char'),op:I18N.t('hero.H08.op')}
};

const NPC_POOL=[
  {nm:I18N.t('hero.npc.kimcheolsun.nm'),cl:'Pilot',f:'F06',ic:'🧑'},{nm:I18N.t('hero.npc.parksoi.nm'),cl:'Eng',f:'F06',ic:'👩'},
  {nm:I18N.t('hero.npc.leekangho.nm'),cl:'Merch',f:'F06',ic:'🧓'},{nm:I18N.t('hero.npc.junghayeon.nm'),cl:'Pilot',f:'F06',ic:'👩'},
  {nm:I18N.t('hero.npc.jamesmckenzie.nm'),cl:'Pilot',f:'F01',ic:'🧔'},{nm:I18N.t('hero.npc.rosadelgado.nm'),cl:'Merch',f:'F01',ic:'👩'},
  {nm:I18N.t('hero.npc.pierredubois.nm'),cl:'Merch',f:'F02',ic:'🦊'},{nm:I18N.t('hero.npc.sophiebeaumont.nm'),cl:'Eng',f:'F02',ic:'🐱'},
  {nm:I18N.t('hero.npc.dmitriivanov.nm'),cl:'Eng',f:'F03',ic:'🧔'},{nm:I18N.t('hero.npc.natashapetrova.nm'),cl:'Pilot',f:'F03',ic:'👩'},
  {nm:I18N.t('hero.npc.carlossilva.nm'),cl:'Pilot',f:'F04',ic:'🧑'},{nm:I18N.t('hero.npc.mariagonzalez.nm'),cl:'Merch',f:'F04',ic:'👩'},
  {nm:I18N.t('hero.npc.rashidaltariq.nm'),cl:'Merch',f:'F07',ic:'👳'},{nm:I18N.t('hero.npc.fatimaalnajjar.nm'),cl:'Eng',f:'F07',ic:'🧕'},
  {nm:I18N.t('hero.npc.tylerchen.nm'),cl:'Eng',f:'F01',ic:'🧑'},{nm:I18N.t('hero.npc.omaralfaruq.nm'),cl:'Eng',f:'F07',ic:'👳'},
  {nm:I18N.t('hero.npc.sergeivolkov.nm'),cl:'Merch',f:'F03',ic:'🧔'},{nm:I18N.t('hero.npc.diegoramirez.nm'),cl:'Eng',f:'F04',ic:'🧑'},
  {nm:I18N.t('hero.npc.hanminseok.nm'),cl:'Eng',f:'F06',ic:'🧑'},{nm:I18N.t('hero.npc.choiyoungjun.nm'),cl:'Pilot',f:'F06',ic:'🧑'}
];
