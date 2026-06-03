// ═══ QUEST REWARD DATA ════════════════════════════════════════════
// 퀘스트 전용 보상 풀: 전설급 동료, 신화/세트 파츠 ID 목록.
// 행성별 설계도 드롭(BLUEPRINT_MAP)은 crafting.js 참고.

// 퀘스트 전용 전설급 동료 풀 (가챠 미출현, 퀘스트 보상 한정)
// nm/desc는 i18n_dict.js의 'quest.crew.QL0X.*' 키로 다국어화 (언어 전환은 setLang이 페이지 새로고침으로 처리)
const QUEST_LEGEND_CREW=[
  {id:'QL01',nm:I18N.t('quest.crew.QL01.nm'),cl:'Mage',ic:'🔮',STR:80,ATT:130,INT:180,DEF:55,HP:90,LOY:88,rarity:'L',desc:I18N.t('quest.crew.QL01.desc')},
  {id:'QL02',nm:I18N.t('quest.crew.QL02.nm'),cl:'Pilot',ic:'🚀',STR:160,ATT:150,INT:90,DEF:40,HP:100,LOY:92,rarity:'L',desc:I18N.t('quest.crew.QL02.desc')},
  {id:'QL03',nm:I18N.t('quest.crew.QL03.nm'),cl:'Sniper',ic:'🎯',STR:200,ATT:110,INT:80,DEF:35,HP:85,LOY:90,rarity:'L',desc:I18N.t('quest.crew.QL03.desc')},
  {id:'QL04',nm:I18N.t('quest.crew.QL04.nm'),cl:'Engineer',ic:'⚙️',STR:70,ATT:220,INT:140,DEF:65,HP:95,LOY:95,rarity:'L',desc:I18N.t('quest.crew.QL04.desc')},
  {id:'QL05',nm:I18N.t('quest.crew.QL05.nm'),cl:'Commander',ic:'🌟',STR:130,ATT:130,INT:150,DEF:75,HP:110,LOY:98,rarity:'L',desc:I18N.t('quest.crew.QL05.desc')},
];

// 신화·세트 파츠 보상 풀
// MMB01 (이휘소 방정식 미사일): mythic, quest:true → 퀘스트 전용 신화 미사일
// ML06 (아우레우스 황금작살) / ML07 (치크스 결정파쇄탄): legend tier 15/16 — 상점 미판매
// → 퀘스트 풀(전설/세트 통합)에 추가해야 획득 가능
const QUEST_MYTHIC_PARTS=['MW01','MS01','MA01','ME01','MMB01'];
const QUEST_SET_PARTS=['SW01','SA01','SS01','SE01','SMIS01','SARM01','ML06','ML07'];
