// ═══ COMMODITY DATA ═══════════════════════════════════════════════
// 일반 상품(G01~G30) + 희귀 제작 재료(R01~R08).
// 일반 상품은 화물창(G.cargo)으로 거래, 재료는 G.materials에 별도 저장.
// nm/desc는 i18n_dict.js의 'commodity.<id>.nm/desc' 키로 다국어화.
const COMMODITIES=[
  // ── F01 수퍼비아 귀족 문명 (링2-3) ────────────────────────────────
  {id:'G01',nm:I18N.t('commodity.G01.nm'),ic:'🪤',buy:150,maxSell:600,f:'F01'},
  {id:'G02',nm:I18N.t('commodity.G02.nm'),ic:'⚡',buy:800,maxSell:3600,f:'F01'},
  {id:'G03',nm:I18N.t('commodity.G03.nm'),ic:'🥃',buy:1200,maxSell:5400,f:'F01'},
  {id:'G05',nm:I18N.t('commodity.G05.nm'),ic:'🌀',buy:5000,maxSell:22000,f:'F01'},
  {id:'G22',nm:I18N.t('commodity.G22.nm'),ic:'💜',buy:8000,maxSell:40000,f:'F01'},
  // ── F02 아우레우스 금융 문명 (링3) ────────────────────────────────
  {id:'G04',nm:I18N.t('commodity.G04.nm'),ic:'🥇',buy:3000,maxSell:13500,f:'F02'},
  {id:'G06',nm:I18N.t('commodity.G06.nm'),ic:'💎',buy:6000,maxSell:30000,f:'F02'},
  {id:'G23',nm:I18N.t('commodity.G23.nm'),ic:'☀️',buy:9000,maxSell:45000,f:'F02'},
  {id:'G24',nm:I18N.t('commodity.G24.nm'),ic:'💾',buy:7000,maxSell:35000,f:'F02'},
  // ── F03 메카니카 기계 문명 (링4) ──────────────────────────────────
  {id:'G07',nm:I18N.t('commodity.G07.nm'),ic:'🔋',buy:2500,maxSell:10000,f:'F03'},
  {id:'G09',nm:I18N.t('commodity.G09.nm'),ic:'⚗️',buy:4000,maxSell:20000,f:'F03'},
  {id:'G08',nm:I18N.t('commodity.G08.nm'),ic:'🔬',buy:3500,maxSell:17500,f:'F03'},
  {id:'G25',nm:I18N.t('commodity.G25.nm'),ic:'🔩',buy:5500,maxSell:27500,f:'F03'},
  // ── F04 크리그 전쟁 문명 (링5) ────────────────────────────────────
  {id:'G10',nm:I18N.t('commodity.G10.nm'),ic:'🪨',buy:1000,maxSell:4000,f:'F04'},
  {id:'G12',nm:I18N.t('commodity.G12.nm'),ic:'⚔️',buy:4500,maxSell:22500,f:'F04'},
  {id:'G11',nm:I18N.t('commodity.G11.nm'),ic:'🔴',buy:3200,maxSell:16000,f:'F04'},
  {id:'G26',nm:I18N.t('commodity.G26.nm'),ic:'💉',buy:6000,maxSell:30000,f:'F04'},
  // ── F05 치크스 적대 문명 (링1) ────────────────────────────────────
  {id:'G16',nm:I18N.t('commodity.G16.nm'),ic:'🦠',buy:7000,maxSell:35000,f:'F05'},
  {id:'G17',nm:I18N.t('commodity.G17.nm'),ic:'🔮',buy:5500,maxSell:27500,f:'F05'},
  {id:'G27',nm:I18N.t('commodity.G27.nm'),ic:'🧠',buy:9500,maxSell:47500,f:'F05'},
  // ── F06 지구 저항군 (링6) ─────────────────────────────────────────
  {id:'G13',nm:I18N.t('commodity.G13.nm'),ic:'🎒',buy:500,maxSell:2000,f:'F06'},
  {id:'G14',nm:I18N.t('commodity.G14.nm'),ic:'🍶',buy:1500,maxSell:6750,f:'F06'},
  {id:'G15',nm:I18N.t('commodity.G15.nm'),ic:'🪨',buy:3000,maxSell:15000,f:'F06'},
  {id:'G18',nm:I18N.t('commodity.G18.nm'),ic:'📜',buy:10000,maxSell:50000,f:'F06',special:true},
  {id:'G28',nm:I18N.t('commodity.G28.nm'),ic:'🌱',buy:4500,maxSell:22500,f:'F06'},
  // ── F07 보이드 균열 (링0) ─────────────────────────────────────────
  {id:'G19',nm:I18N.t('commodity.G19.nm'),ic:'💜',buy:12000,maxSell:60000,f:'F07'},
  {id:'G21',nm:I18N.t('commodity.G21.nm'),ic:'🧭',buy:15000,maxSell:75000,f:'F07'},
  {id:'G20',nm:I18N.t('commodity.G20.nm'),ic:'⏳',buy:18000,maxSell:90000,f:'F07'},
  {id:'G29',nm:I18N.t('commodity.G29.nm'),ic:'🌌',buy:20000,maxSell:100000,f:'F07'},
  {id:'G30',nm:I18N.t('commodity.G30.nm'),ic:'🗺️',buy:25000,maxSell:125000,f:'F07'},
  // ── 희귀 제작 재료 (제작소 전용 — 화물창 미사용, G.materials에 보관) ──
  {id:'R01',nm:I18N.t('commodity.R01.nm'),buy:35000,maxSell:0,f:'F07',material:true,special:true,ic:'💜',desc:I18N.t('commodity.R01.desc')},
  {id:'R02',nm:I18N.t('commodity.R02.nm'),buy:45000,maxSell:0,f:'F05',material:true,special:true,ic:'🔮',desc:I18N.t('commodity.R02.desc')},
  {id:'R03',nm:I18N.t('commodity.R03.nm'),buy:40000,maxSell:0,f:'F02',material:true,special:true,ic:'🌟',desc:I18N.t('commodity.R03.desc')},
  {id:'R04',nm:I18N.t('commodity.R04.nm'),buy:38000,maxSell:0,f:'F04',material:true,special:true,ic:'🔥',desc:I18N.t('commodity.R04.desc')},
  {id:'R05',nm:I18N.t('commodity.R05.nm'),buy:42000,maxSell:0,f:'F03',material:true,special:true,ic:'⚙️',desc:I18N.t('commodity.R05.desc')},
  {id:'R06',nm:I18N.t('commodity.R06.nm'),buy:36000,maxSell:0,f:'F06',material:true,special:true,ic:'⚡',desc:I18N.t('commodity.R06.desc')},
  {id:'R07',nm:I18N.t('commodity.R07.nm'),buy:50000,maxSell:0,f:'F01',material:true,special:true,ic:'🌀',desc:I18N.t('commodity.R07.desc')},
  {id:'R08',nm:I18N.t('commodity.R08.nm'),buy:80000,maxSell:0,f:'F07',material:true,special:true,ic:'💎',desc:I18N.t('commodity.R08.desc')}
];
