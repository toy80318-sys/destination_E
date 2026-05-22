// ═══ CRAFTING DATA ════════════════════════════════════════════════
// 제작소 레시피(파츠/함선/창고) + 행성별 설계도 드롭 매핑.
// 희귀 재료(R01~R08)는 commodities.js에 정의되어 있음.
const CRAFT_RECIPES=[
  // ─ 전설급 파츠 ─
  {id:'W15',type:'part',tier:'legend',nm:'신의 철퇴 ⚡전설',cat:'weapon',
   desc:'전설 무기. ATT +250. 트루딜.',
   mats:[{id:'R04',qty:20},{id:'R05',qty:15},{id:'R07',qty:10}]},
  {id:'S15',type:'part',tier:'legend',nm:'신의 방패 ⚡전설',cat:'shield',
   desc:'전설 실드. INT +220. SH +5000.',
   mats:[{id:'R03',qty:20},{id:'R06',qty:15},{id:'R07',qty:10}]},
  {id:'A15',type:'part',tier:'legend',nm:'절대 방벽 ⚡전설',cat:'armor',
   desc:'전설 장갑. HP +3000.',
   mats:[{id:'R02',qty:25},{id:'R04',qty:15},{id:'R05',qty:10}]},
  {id:'E15',type:'part',tier:'legend',nm:'블링크 엔진 ⚡전설',cat:'engine',
   desc:'전설 엔진. TEC +200. 순간이동.',
   mats:[{id:'R01',qty:20},{id:'R08',qty:15},{id:'R07',qty:10}]},
  // ─ 신화급 파츠 ─
  {id:'MW01',type:'part',tier:'mythic',nm:'허메틱 포 ✦신화',cat:'weapon',
   desc:'신화 무기. ATT +320. 연속 공격+40%.',
   mats:[{id:'R04',qty:30},{id:'R02',qty:20},{id:'R08',qty:15},{id:'R05',qty:10}]},
  {id:'MS01',type:'part',tier:'mythic',nm:'크로노스 방벽 ✦신화',cat:'shield',
   desc:'신화 실드. INT +280. SH +8000. 피격 반사 20%.',
   mats:[{id:'R03',qty:30},{id:'R01',qty:20},{id:'R08',qty:15},{id:'R06',qty:10}]},
  {id:'MA01',type:'part',tier:'mythic',nm:'아다만 선체 ✦신화',cat:'armor',
   desc:'신화 장갑. HP +12000. 치명타 피해 50% 감소.',
   mats:[{id:'R02',qty:30},{id:'R05',qty:20},{id:'R08',qty:15},{id:'R04',qty:10}]},
  {id:'ME01',type:'part',tier:'mythic',nm:'타키온 드라이브 ✦신화',cat:'engine',
   desc:'신화 엔진. TEC +320. 이동 후 ATT+50(1턴).',
   mats:[{id:'R01',qty:30},{id:'R07',qty:20},{id:'R08',qty:15},{id:'R03',qty:10}]},
  // ─ 전설 함선 ─
  {id:'H10',type:'ship',tier:'legend',nm:'레비아탄 🌟',cat:'대형',
   desc:'전설 대형 전투함. HP 45,000 / SH 18,000. 화력 최강.',
   mats:[{id:'R04',qty:25},{id:'R05',qty:20},{id:'R02',qty:15}]},
  {id:'H11',type:'ship',tier:'legend',nm:'아르마다 🌟',cat:'대형',
   desc:'방어·지원 특화. HP 38,000 / SH 22,000. 함대 전체 실드+20%.',
   mats:[{id:'R03',qty:25},{id:'R06',qty:20},{id:'R07',qty:15}]},
  {id:'H12',type:'ship',tier:'legend',nm:'우르사 메이저 파쇄기 🌟',cat:'대형',
   desc:'보이드 전용 함선. HP 75,000. 보스전 실드 관통 특화.',
   mats:[{id:'R01',qty:30},{id:'R08',qty:20},{id:'R02',qty:15}]},
  // ─ 전설 창고 확장 파츠 (제작소 제작 가능) ─
  {id:'SC08',type:'cargo',tier:'legend',nm:'[전설] 광자 차원 확장 모듈 ⚡',cat:'cargo_ext',
   desc:'전설급 광자 파동 차원 확장 모듈. 창고 +16칸.',
   mats:[{id:'R07',qty:20},{id:'R05',qty:15},{id:'R03',qty:10}]},
  {id:'SC09',type:'cargo',tier:'legend',nm:'[전설] 초공간 화물 매트릭스 ⚡',cat:'cargo_ext',
   desc:'전설급 초공간 화물 매트릭스. 창고 +20칸.',
   mats:[{id:'R08',qty:20},{id:'R06',qty:15},{id:'R04',qty:10}]},
  // ─ 신화 함선 (최고등급, 제한 없음) ─
  {id:'LGD01',type:'ship',tier:'mythic',nm:'거북선 ✦신화',cat:'대형',
   desc:'신화급 전투함. HP 200,000 / SH 65,000. 호위함 능력치+30%.',
   mats:[{id:'R06',qty:25},{id:'R08',qty:15},{id:'R07',qty:10},{id:'R04',qty:8}]},
  {id:'LGD02',type:'ship',tier:'mythic',nm:'워덴클리프 ✦신화',cat:'대형',
   desc:'신화급 전투함. HP 175,000 / SH 80,000. 매 턴 적 모듈 비활성화.',
   mats:[{id:'R05',qty:25},{id:'R08',qty:15},{id:'R03',qty:10},{id:'R07',qty:8}]},
  {id:'LGD03',type:'ship',tier:'mythic',nm:'렐러티비티 ✦신화',cat:'대형',
   desc:'신화급 전투함. HP 245,000 / SH 90,000. 최우선 턴 오더.',
   mats:[{id:'R07',qty:25},{id:'R08',qty:15},{id:'R01',qty:10},{id:'R06',qty:8}]},
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
  P22:'LGD01',P23:'LGD02',P24:'H10', P25:'H11',  P26:'H12',   // F06 저항군 → 전설
  P27:'ME01', P28:'LGD02',P29:'LGD03',P30:'MW01'  // F07 보이드 → 신화/기함
};
