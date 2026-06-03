// ═══ CARGO EXPANSION DATA ═════════════════════════════════════════
// 창고 확장 아이템(CH01~CH10): 문명별 컨테이너, 함선 슬롯에 장착.
// 특수 창고 확장 파츠(SC01~SC10): 기함에 직접 적용되는 칸 추가 부품.
// nm/desc는 i18n_dict.js의 'cargo.<id>.nm/desc' 키로 다국어화 (en 번역은 i18n-style.md 용어집 준수).
const CARGO_ITEMS=[
  {id:'CH01',cat:'cargo',nm:I18N.t('cargo.CH01.nm'),tier:2,slots:2,size:1,price:4000,faction:'F06',rarity:'common',ic:'📦',desc:I18N.t('cargo.CH01.desc')},
  {id:'CH02',cat:'cargo',nm:I18N.t('cargo.CH02.nm'),tier:4,slots:4,size:1,price:12000,faction:'F03',rarity:'uncommon',ic:'🔩',desc:I18N.t('cargo.CH02.desc')},
  {id:'CH03',cat:'cargo',nm:I18N.t('cargo.CH03.nm'),tier:5,slots:6,size:1,price:22000,faction:'F04',rarity:'rare',ic:'⚔️',desc:I18N.t('cargo.CH03.desc')},
  {id:'CH04',cat:'cargo',nm:I18N.t('cargo.CH04.nm'),tier:6,slots:6,size:1,price:25000,faction:'F01',rarity:'rare',ic:'🌀',desc:I18N.t('cargo.CH04.desc')},
  {id:'CH05',cat:'cargo',nm:I18N.t('cargo.CH05.nm'),tier:7,slots:8,size:1,price:42000,faction:'F05',rarity:'epic',ic:'🦠',desc:I18N.t('cargo.CH05.desc')},
  {id:'CH06',cat:'cargo',nm:I18N.t('cargo.CH06.nm'),tier:8,slots:8,size:1,price:50000,faction:'F02',rarity:'epic',ic:'💰',desc:I18N.t('cargo.CH06.desc')},
  {id:'CH07',cat:'cargo',nm:I18N.t('cargo.CH07.nm'),tier:10,slots:10,size:1,price:130000,faction:'F07',rarity:'hero',ic:'🌌',desc:I18N.t('cargo.CH07.desc')},
  {id:'CH08',cat:'cargo',nm:I18N.t('cargo.CH08.nm'),tier:13,slots:12,size:2,price:220000,faction:'F06',rarity:'hero',ic:'⚛️',desc:I18N.t('cargo.CH08.desc')},
  {id:'CH09',cat:'cargo',nm:I18N.t('cargo.CH09.nm'),tier:16,slots:15,size:2,price:900000,faction:'F04',rarity:'legend',ic:'👑',desc:I18N.t('cargo.CH09.desc')},
  {id:'CH10',cat:'cargo',nm:I18N.t('cargo.CH10.nm'),tier:20,slots:20,size:2,price:0,faction:'F06',rarity:'mythic',quest:true,ic:'🔭',desc:I18N.t('cargo.CH10.desc')},
];

// ── 특수 창고 확장 파츠 (SC01-SC05) — 5종 ──────────────────────────
// 구매 시 인벤토리 적립 → 정비소에서 함선별 「창고 확장 전용 슬롯」(최대 8칸)에 장착.
// 장착 1개 = 전용 슬롯 1칸 점유 + 해당 함선 화물칸 +cargoBonus.
const SPECIAL_CARGO_PARTS=[
  {id:'SC01',cat:'cargo_ext',nm:I18N.t('cargo.SC01.nm'),tier:1,price:2000,cargoBonus:4,ic:'📦',rarity:'common',desc:I18N.t('cargo.SC01.desc')},
  {id:'SC02',cat:'cargo_ext',nm:I18N.t('cargo.SC02.nm'),tier:5,price:12000,cargoBonus:10,ic:'🗃️',rarity:'rare',desc:I18N.t('cargo.SC02.desc')},
  {id:'SC03',cat:'cargo_ext',nm:I18N.t('cargo.SC03.nm'),tier:9,price:45000,cargoBonus:20,ic:'🌀',rarity:'epic',desc:I18N.t('cargo.SC03.desc')},
  {id:'SC04',cat:'cargo_ext',nm:I18N.t('cargo.SC04.nm'),tier:14,price:200000,cargoBonus:32,ic:'⚡',rarity:'legend',desc:I18N.t('cargo.SC04.desc')},
  {id:'SC05',cat:'cargo_ext',nm:I18N.t('cargo.SC05.nm'),tier:20,price:1200000,cargoBonus:48,ic:'🔭',rarity:'mythic',desc:I18N.t('cargo.SC05.desc')},
];
