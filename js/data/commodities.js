// ═══ COMMODITY DATA ═══════════════════════════════════════════════
// 일반 상품(G01~G30) + 희귀 제작 재료(R01~R08).
// 일반 상품은 화물창(G.cargo)으로 거래, 재료는 G.materials에 별도 저장.
const COMMODITIES=[
  // ── F01 수퍼비아 귀족 문명 (링2-3) ────────────────────────────────
  {id:'G01',nm:'고철 프레임',ic:'🪤',buy:150,maxSell:600,f:'F01'},
  {id:'G02',nm:'에너지 코어',ic:'⚡',buy:800,maxSell:3600,f:'F01'},
  {id:'G03',nm:'오리온 위스키',ic:'🥃',buy:1200,maxSell:5400,f:'F01'},
  {id:'G05',nm:'수퍼비아 중력수정',ic:'🌀',buy:5000,maxSell:22000,f:'F01'},
  {id:'G22',nm:'수퍼비아 귀족 향수',ic:'💜',buy:8000,maxSell:40000,f:'F01'},
  // ── F02 아우레우스 금융 문명 (링3) ────────────────────────────────
  {id:'G04',nm:'아우레우스 금괴',ic:'🥇',buy:3000,maxSell:13500,f:'F02'},
  {id:'G06',nm:'LHS 크리스탈',ic:'💎',buy:6000,maxSell:30000,f:'F02'},
  {id:'G23',nm:'아우레우스 태양 화폐',ic:'☀️',buy:9000,maxSell:45000,f:'F02'},
  {id:'G24',nm:'아우레우스 정보 칩',ic:'💾',buy:7000,maxSell:35000,f:'F02'},
  // ── F03 메카니카 기계 문명 (링4) ──────────────────────────────────
  {id:'G07',nm:'분열 배터리',ic:'🔋',buy:2500,maxSell:10000,f:'F03'},
  {id:'G09',nm:'중수소 배터리',ic:'⚗️',buy:4000,maxSell:20000,f:'F03'},
  {id:'G08',nm:'메카니카 광학 렌즈',ic:'🔬',buy:3500,maxSell:17500,f:'F03'},
  {id:'G25',nm:'메카니카 자동화 부품',ic:'🔩',buy:5500,maxSell:27500,f:'F03'},
  // ── F04 크리그 전쟁 문명 (링5) ────────────────────────────────────
  {id:'G10',nm:'크리그 무기 원석',ic:'🪨',buy:1000,maxSell:4000,f:'F04'},
  {id:'G12',nm:'강습 스파이크',ic:'⚔️',buy:4500,maxSell:22500,f:'F04'},
  {id:'G11',nm:'크리그 혈철석',ic:'🔴',buy:3200,maxSell:16000,f:'F04'},
  {id:'G26',nm:'크리그 전투 자극제',ic:'💉',buy:6000,maxSell:30000,f:'F04'},
  // ── F05 치크스 적대 문명 (링1) ────────────────────────────────────
  {id:'G16',nm:'치크스 변이 포자',ic:'🦠',buy:7000,maxSell:35000,f:'F05'},
  {id:'G17',nm:'치크스 결정 파편',ic:'🔮',buy:5500,maxSell:27500,f:'F05'},
  {id:'G27',nm:'치크스 뇌수액',ic:'🧠',buy:9500,maxSell:47500,f:'F05'},
  // ── F06 지구 저항군 (링6) ─────────────────────────────────────────
  {id:'G13',nm:'저항군 군수품',ic:'🎒',buy:500,maxSell:2000,f:'F06'},
  {id:'G14',nm:'전통 발효주',ic:'🍶',buy:1500,maxSell:6750,f:'F06'},
  {id:'G15',nm:'지구 철광석',ic:'🪨',buy:3000,maxSell:15000,f:'F06'},
  {id:'G18',nm:'난중일기 영인본',ic:'📜',buy:10000,maxSell:50000,f:'F06',special:true},
  {id:'G28',nm:'지구 빈티지 씨앗',ic:'🌱',buy:4500,maxSell:22500,f:'F06'},
  // ── F07 보이드 균열 (링0) ─────────────────────────────────────────
  {id:'G19',nm:'보이드 에센스',ic:'💜',buy:12000,maxSell:60000,f:'F07'},
  {id:'G21',nm:'별빛 나침반',ic:'🧭',buy:15000,maxSell:75000,f:'F07'},
  {id:'G20',nm:'보이드 시간 파편',ic:'⏳',buy:18000,maxSell:90000,f:'F07'},
  {id:'G29',nm:'보이드 공간 수정',ic:'🌌',buy:20000,maxSell:100000,f:'F07'},
  {id:'G30',nm:'균열 지도 원석',ic:'🗺️',buy:25000,maxSell:125000,f:'F07'},
  // ── 희귀 제작 재료 (제작소 전용 — 화물창 미사용, G.materials에 보관) ──
  {id:'R01',nm:'보이드 에너지 파편',buy:35000,maxSell:0,f:'F07',material:true,special:true,ic:'💜',desc:'보이드 균열 행성 특산. 제작 재료.'},
  {id:'R02',nm:'치크스 결정석',buy:45000,maxSell:0,f:'F05',material:true,special:true,ic:'🔮',desc:'치크스 전쟁 행성 특산. 제작 재료.'},
  {id:'R03',nm:'아우레우스 태양핵',buy:40000,maxSell:0,f:'F02',material:true,special:true,ic:'🌟',desc:'아우레우스 금융 행성 특산. 제작 재료.'},
  {id:'R04',nm:'크리그 마그마 코어',buy:38000,maxSell:0,f:'F04',material:true,special:true,ic:'🔥',desc:'크리그 행성 화산 지각 추출. 제작 재료.'},
  {id:'R05',nm:'메카니카 양자칩',buy:42000,maxSell:0,f:'F03',material:true,special:true,ic:'⚙️',desc:'메카니카 초정밀 나노칩. 제작 재료.'},
  {id:'R06',nm:'저항군 반물질',buy:36000,maxSell:0,f:'F06',material:true,special:true,ic:'⚡',desc:'지구 저항군 비밀 연구소 생산. 제작 재료.'},
  {id:'R07',nm:'수퍼비아 중력자',buy:50000,maxSell:0,f:'F01',material:true,special:true,ic:'🌀',desc:'수퍼비아 중력 이상 지대 채취. 제작 재료.'},
  {id:'R08',nm:'은하 혼돈 결정',buy:80000,maxSell:0,f:'F07',material:true,special:true,ic:'💎',desc:'은하 균열 최심부 희귀 결정체. 제작 재료.'}
];
