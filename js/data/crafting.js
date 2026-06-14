// ═══ CRAFTING DATA ════════════════════════════════════════════════
// 제작소 레시피(파츠/함선/창고) + 행성별 설계도 드롭 매핑.
// 희귀 재료(R01~R08)는 commodities.js에 정의되어 있음.
// nm/desc는 i18n_dict.js의 'craft.<id>.*' 키로 다국어화 (parts.js/cargo.js/ships.js와 텍스트가 다른 별도 도메인).
const CRAFT_RECIPES=[
  // ─ 전설급 파츠 ─
  {id:'W15',type:'part',tier:'legend',nm:I18N.t('craft.W15.nm'),cat:'weapon',
   desc:I18N.t('craft.W15.desc'),
   mats:[{id:'R04',qty:20},{id:'R05',qty:15},{id:'R07',qty:10}]},
  {id:'S15',type:'part',tier:'legend',nm:I18N.t('craft.S15.nm'),cat:'shield',
   desc:I18N.t('craft.S15.desc'),
   mats:[{id:'R03',qty:20},{id:'R06',qty:15},{id:'R07',qty:10}]},
  {id:'A15',type:'part',tier:'legend',nm:I18N.t('craft.A15.nm'),cat:'armor',
   desc:I18N.t('craft.A15.desc'),
   mats:[{id:'R02',qty:25},{id:'R04',qty:15},{id:'R05',qty:10}]},
  {id:'E15',type:'part',tier:'legend',nm:I18N.t('craft.E15.nm'),cat:'engine',
   desc:I18N.t('craft.E15.desc'),
   mats:[{id:'R01',qty:20},{id:'R08',qty:15},{id:'R07',qty:10}]},
  // ─ 신화급 파츠 ─
  {id:'MW01',type:'part',tier:'mythic',nm:I18N.t('craft.MW01.nm'),cat:'weapon',
   desc:I18N.t('craft.MW01.desc'),
   mats:[{id:'R04',qty:30},{id:'R02',qty:20},{id:'R08',qty:15},{id:'R05',qty:10}]},
  {id:'MS01',type:'part',tier:'mythic',nm:I18N.t('craft.MS01.nm'),cat:'shield',
   desc:I18N.t('craft.MS01.desc'),
   mats:[{id:'R03',qty:30},{id:'R01',qty:20},{id:'R08',qty:15},{id:'R06',qty:10}]},
  {id:'MA01',type:'part',tier:'mythic',nm:I18N.t('craft.MA01.nm'),cat:'armor',
   desc:I18N.t('craft.MA01.desc'),
   mats:[{id:'R02',qty:30},{id:'R05',qty:20},{id:'R08',qty:15},{id:'R04',qty:10}]},
  {id:'ME01',type:'part',tier:'mythic',nm:I18N.t('craft.ME01.nm'),cat:'engine',
   desc:I18N.t('craft.ME01.desc'),
   mats:[{id:'R01',qty:30},{id:'R07',qty:20},{id:'R08',qty:15},{id:'R03',qty:10}]},
  {id:'MMB01',type:'part',tier:'mythic',nm:I18N.t('craft.MMB01.nm'),cat:'weapon',
   desc:I18N.t('craft.MMB01.desc'),
   mats:[{id:'R06',qty:30},{id:'R04',qty:20},{id:'R08',qty:15},{id:'R02',qty:10}]},
  // ─ 전설 함선 ─
  {id:'H10',type:'ship',tier:'legend',nm:I18N.t('craft.H10.nm'),cat:'large',
   desc:I18N.t('craft.H10.desc'),
   mats:[{id:'R04',qty:25},{id:'R05',qty:20},{id:'R02',qty:15}]},
  {id:'H11',type:'ship',tier:'legend',nm:I18N.t('craft.H11.nm'),cat:'large',
   desc:I18N.t('craft.H11.desc'),
   mats:[{id:'R03',qty:25},{id:'R06',qty:20},{id:'R07',qty:15}]},
  {id:'H12',type:'ship',tier:'legend',nm:I18N.t('craft.H12.nm'),cat:'large',
   desc:I18N.t('craft.H12.desc'),
   mats:[{id:'R01',qty:30},{id:'R08',qty:20},{id:'R02',qty:15}]},
  // ─ 전설 창고 확장 파츠 (제작소 제작 가능) ─
  {id:'SC04',type:'cargo',tier:'legend',nm:I18N.t('craft.SC04.nm'),cat:'cargo_ext',
   desc:I18N.t('craft.SC04.desc'),
   mats:[{id:'R07',qty:20},{id:'R05',qty:15},{id:'R03',qty:10}]},
  // ─ 신화 창고 확장 파츠 (제작소 제작 가능) ─
  {id:'SC05',type:'cargo',tier:'mythic',nm:I18N.t('craft.SC05.nm'),cat:'cargo_ext',
   desc:I18N.t('craft.SC05.desc'),
   mats:[{id:'R08',qty:25},{id:'R07',qty:20},{id:'R06',qty:15},{id:'R04',qty:12}]},
  // ─ 신화 함선 (최고등급, 제한 없음) ─
  {id:'LGD01',type:'ship',tier:'mythic',nm:I18N.t('craft.LGD01.nm'),cat:'large',
   desc:I18N.t('craft.LGD01.desc'),
   mats:[{id:'R06',qty:25},{id:'R08',qty:15},{id:'R07',qty:10},{id:'R04',qty:8}]},
  {id:'LGD02',type:'ship',tier:'mythic',nm:I18N.t('craft.LGD02.nm'),cat:'large',
   desc:I18N.t('craft.LGD02.desc'),
   mats:[{id:'R05',qty:25},{id:'R08',qty:15},{id:'R03',qty:10},{id:'R07',qty:8}]},
  {id:'LGD03',type:'ship',tier:'mythic',nm:I18N.t('craft.LGD03.nm'),cat:'large',
   desc:I18N.t('craft.LGD03.desc'),
   mats:[{id:'R07',qty:25},{id:'R08',qty:15},{id:'R01',qty:10},{id:'R06',qty:8}]},
  // ─ 흡혈 자동 수리 로봇 (전설/신화) — 기존 전설/신화 파츠 재료의 절반 ─
  // 기준: 전설 파츠 합계 ≈ 45 → 흡혈 전설 ≈ 22 / 신화 파츠 합계 ≈ 75 → 흡혈 신화 ≈ 38
  {id:'RB09',type:'part',tier:'legend',nm:I18N.t('craft.RB09.nm'),cat:'armor',
   desc:I18N.t('craft.RB09.desc'),
   mats:[{id:'R06',qty:10},{id:'R02',qty:7},{id:'R05',qty:5}]},
  {id:'RB10',type:'part',tier:'mythic',nm:I18N.t('craft.RB10.nm'),cat:'armor',
   desc:I18N.t('craft.RB10.desc'),
   mats:[{id:'R08',qty:15},{id:'R02',qty:10},{id:'R06',qty:8},{id:'R05',qty:5}]},
];

// ── 행성별 설계도 배정 (퀘스트 5% 확률 드롭) ──────────────────────────
// ring낮은 F01/F06 → 전설함선, ring중간 F02/F03 → 전설파츠
// ring높은 F04 → 기함/신화, hostile F05 → 신화, void F07 → 신화/기함
const BLUEPRINT_MAP={
  P01:'H10',  P02:'H11',  P03:'H12',  P04:'H10',   // F01 수퍼비아 → 전설함선
  P05:'W15',  P06:'S15',  P07:'A15',  P08:'E15',   // F02 아우레우스 → 전설파츠
  P09:'E15',  P10:'W15',  P11:'S15',  P12:'A15',   // F03 메카니카 → 전설파츠
  P13:'LGD01',P14:'MW01', P15:'MS01', P16:'MA01',  // F04 크리그 → 기함/신화
  P17:'MW01', P18:'MS01', P19:'MA01', P20:'ME01', P21:'LGD03', // F05 치크스 → 신화
  P22:'LGD01',P23:'LGD02',P24:'MMB01',P25:'RB09', P26:'H12',  // F06 저항군 → 전설/신화(이휘소 미사일·흡혈 전설 로봇)
  P27:'ME01', P28:'LGD02',P29:'LGD03',P30:'RB10'  // F07 보이드 → 신화/기함(+ 흡혈 신화 로봇)
};
