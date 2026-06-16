// ═══════════════════════════════════════════════════════════════════
// DESTINATION EARTH — Phase 4 퀘스트 + 컷씬 데이터 (v1.0)
// 페이즈 4 · 추격 | 행성 P15·P10·P12·P16·P14 | CH08~CH10
// 25개 퀘스트 + 9개 컷씬
// 영웅 합류: 광개토대왕(H03) @ P15 메카니카 (Phase 3 사전 등록 조건 충족 시)
// 거북선 LGD01 완성 (R06·R07·R08·R04 재료 확보 + 장영실 제작)
// 아이젠클로 P14 요새 정찰 (페이즈 5 보이드 진입 직전 단계)
// ═══════════════════════════════════════════════════════════════════
(function(){
if(typeof window==='undefined') return;
if(window.PHASE4_QUESTS) return;

const PHASE4_QUESTS={

  // ════════════════════════════════════════════════════════════════
  // 행성 16 · P15 메카니카 "기어월드 변두리" (장영실 제작 베이)
  // 팩션 특산물: G09·G10·R04·R07
  // ════════════════════════════════════════════════════════════════
  P15:[
    {
      id:'p4_q1601', type:'story_quest', category:'main', phase:4,
      ic:'🛠️', npc:'장영실', npcIc:'⚙️', npcKey:'hero02',
      nm:{ko:'거북선 용골 주조', en:'Geobukseon Keel Cast'},
      desc:{ko:'장영실: "거북선 용골은 R08 메카니카 합금 ×15가 필요해. 메카니카 본거지 P15에서 직접 만들어야 정밀도가 나와."\nR08 ×15 확보 후 제작 베이에서 용골 주조.',
            en:'Yi: "Need R08 ×15 for Geobukseon keel. Cast at P15 mecha-bay."'},
      objectives:[
        {type:'gather', item:'R08', qty:15, label:{ko:'은하 혼돈 결정 메카니카 합금 ×15 확보', en:'Secure Galactic Chaos Crystal ×15'}},
      ],
      rewardCr:120000, rewardVe:90,
      rewardItems:[{id:'G09', qty:2}],
      rewardFlags:['turtle_keel_cast'],
      cutscene_pre:'p4_ch08a', cutscene_post:'p4_ch08b'
    },
    {
      id:'p4_q1602', type:'story_quest', category:'main', phase:4,
      ic:'⚡', npc:'테슬라', npcIc:'🔬', npcKey:'hero07',
      nm:{ko:'코어 점화 시스템', en:'Core Ignition System'},
      desc:{ko:'테슬라: "거북선 추진코어는 내가 손볼게. R07 합성 코어 ×10 + R04 ×8이 필요해."',
            en:'Tesla: "I\'ll handle the core. R07 ×10 + R04 ×8."'},
      objectives:[
        {type:'gather', item:'R07', qty:10, label:{ko:'수퍼비아 중력자 합성 코어 ×10', en:'Superbia Graviton ×10'}},
      ],
      rewardCr:100000, rewardVe:80,
      rewardItems:[{id:'R04', qty:2}],
      rewardFlags:['turtle_core_ready'],
      cutscene_pre:null, cutscene_post:null
    },
    {
      id:'p4_q1603', type:'story_quest', category:'sub', phase:4,
      ic:'🍺', npc:'마르코 폴로', npcIc:'🗺️', npcKey:'hero08',
      nm:{ko:'기어월드 변두리 주점', en:'Gearworld Outskirt Tavern'},
      desc:{ko:'타르타로스 기어월드 변두리 주점. 크리그 무기 원석 ×2 소비 → 정보: "P12 아이젠클로 보급선이 매 6턴마다 통과해." (P12 잠복 가능).',
            en:'Krieg Weapon Ore ×2 → "Eisenklau supply ship passes P12 every 6 turns."'},
      objectives:[
        {type:'gather', item:'G10', qty:2, label:{ko:'크리그 무기 원석 ×2 정보료', en:'Krieg Weapon Ore ×2 fee'}},
      ],
      rewardCr:35000, rewardVe:45,
      rewardItems:[],
      rewardFlags:['p12_ambush_known'],
      cutscene_pre:null, cutscene_post:null
    },
    {
      id:'p4_q1604', type:'story_quest', category:'sub', phase:4,
      ic:'🔍', npc:'가가린', npcIc:'🚀', npcKey:'hero04',
      nm:{ko:'기어월드 구역 잔해 탐색', en:'Gearworld Scrap Search'},
      desc:{ko:'타르타로스 외곽 — 메카니카 폐기 구역. 잔해 탐색 3회.\n70% 은하 혼돈 결정·중수소 배터리·크리그 무기 원석 부산물 / 30% 잔해 해적.',
            en:'Search 3× outside Tartaros. 70% Galactic Chaos Crystal/Deuterium Battery/Krieg Weapon Ore / 30% wreck pirates.'},
      objectives:[
        {type:'explore', target:'p15_wreck', qty:3, label:{ko:'잔해 탐색 ×3', en:'Wreck ×3'}},
      ],
      rewardCr:40000, rewardVe:35,
      rewardItems:[{id:'R08', qty:2}],
      rewardFlags:[],
      cutscene_pre:null, cutscene_post:null
    },
    {
      id:'p4_q1605', type:'story_quest', category:'main', phase:4,
      ic:'⚔️', npc:'광개토대왕', npcIc:'🛡️', npcKey:'hero03',
      nm:{ko:'광개토의 약속', en:'Gwanggaeto\'s Pledge'},
      desc:{ko:'타르타로스 거대 격납고에서 자유 상인 광개토와 재회. 그가 보유한 거북선 외피 보강 도면 치크스 뇌수액 ×3 양도 거래.\n광개토: "거북선이 완성되면 — 나는 당신 깃발 아래 선다."',
            en:'Meet Gwanggaeto. Chiks Brain Fluid ×3 → He pledges to join your fleet once turtle ship is complete.'},
      objectives:[
        {type:'gather', item:'G27', qty:3, label:{ko:'치크스 뇌수액 ×3 거래', en:'Chiks Brain Fluid ×3 trade'}},
      ],
      rewardCr:150000, rewardVe:100,
      rewardItems:[],
      rewardFlags:['h03_recruit_pledged'],
      cutscene_pre:'p4_ch08c', cutscene_post:null
    },
    {
      id:'p4_q1606', type:'story_quest', category:'sub', phase:4,
      ic:'🏛️', npc:'마르코 폴로', npcIc:'🗺️', npcKey:'hero08',
      nm:{ko:'타르타로스 행성 경매', en:'Tartaros Auction'},
      desc:{ko:'타르타로스 메카니카 행성 경매. 즉구 ~88,000₡ / 최저 ~26,400₡.\n낙찰 시 매 턴 5,500₡ 세금 + 메카니카 R 재료 상시 구매 가능.',
            en:'Bid on Tartaros. Buyout ~88,000₡. Owner → 5,500₡/turn + R-mat shop.'},
      objectives:[
        {type:'explore', target:'p15_auction', qty:1, label:{ko:'타르타로스 경매 참여', en:'Auction'}},
      ],
      rewardCr:0, rewardVe:0,
      rewardItems:[],
      rewardFlags:['p15_owned'],
      cutscene_pre:null, cutscene_post:null
    }
  ],

  // ════════════════════════════════════════════════════════════════
  // 행성 17 · P10 수퍼비아 "콜드웰 광산"
  // 팩션 특산물: G03·G04·G05·R04
  // ════════════════════════════════════════════════════════════════
  P10:[
    {
      id:'p4_q1701', type:'story_quest', category:'main', phase:4,
      ic:'⛏️', npc:'백구', npcIc:'🐕', npcKey:'baekgu2_advice',
      nm:{ko:'콜드웰 광산 크리그 마그마 코어 채굴', en:'Coldwell Krieg Magma Core Mining'},
      desc:{ko:'백구: "거북선 외피 코팅에 R04 양자합금 ×8이 필요해요. P10 콜드웰 광산이 R04 주산지예요. G03 ×4 채굴권 비용 지불."',
            en:'Krieg Magma Core ×8 needed for hull. Orion Whisky ×4 mining fee.'},
      objectives:[
        {type:'gather', item:'R04', qty:8, label:{ko:'크리그 마그마 코어 양자합금 ×8 확보', en:'Secure Krieg Magma Core ×8'}},
      ],
      rewardCr:90000, rewardVe:70,
      rewardItems:[{id:'G04', qty:2}],
      rewardFlags:['turtle_hull_coated'],
      cutscene_pre:'p4_ch09a', cutscene_post:null
    },
    {
      id:'p4_q1702', type:'story_quest', category:'sub', phase:4,
      ic:'🔧', npc:'장영실', npcIc:'⚙️', npcKey:'hero02',
      nm:{ko:'정밀 부품 가공', en:'Precision Parts'},
      desc:{ko:'장영실: "콜드웰의 G04 정밀 합금이 거북선 노포 발사구에 좋아. G04 ×5 확보해 P15 베이에 보내줘."',
            en:'Aureus Gold Ingot ×5 for turtle cannon ports.'},
      objectives:[
        {type:'gather', item:'G04', qty:5, label:{ko:'아우레우스 금괴 ×5 확보', en:'Aureus Gold Ingot ×5'}},
      ],
      rewardCr:55000, rewardVe:50,
      rewardItems:[{id:'R04', qty:1}],
      rewardFlags:['turtle_cannon_port'],
      cutscene_pre:null, cutscene_post:null
    },
    {
      id:'p4_q1703', type:'story_quest', category:'sub', phase:4,
      ic:'🔍', npc:'가가린', npcIc:'🚀', npcKey:'hero04',
      nm:{ko:'광산 폐갱 탐사', en:'Old Shaft Survey'},
      desc:{ko:'콜드웰 광산 폐갱 — 잔해 탐색 3회.\n70% 크리그 마그마 코어·오리온 위스키·수퍼비아 중력수정 / 30% 잔해 해적.',
            en:'Search 3×. 70% Krieg Magma Core/Orion Whisky/Superbia Gravity Crystal / 30% wreck pirates.'},
      objectives:[
        {type:'explore', target:'p10_shaft', qty:3, label:{ko:'폐갱 탐색 ×3', en:'Shaft ×3'}},
      ],
      rewardCr:35000, rewardVe:35,
      rewardItems:[{id:'R04', qty:1},{id:'G05', qty:2}],
      rewardFlags:[],
      cutscene_pre:null, cutscene_post:null
    },
    {
      id:'p4_q1704', type:'story_quest', category:'sub', phase:4,
      ic:'🍺', npc:'마르코 폴로', npcIc:'🗺️', npcKey:'hero08',
      nm:{ko:'콜드웰 광부 술집', en:'Coldwell Miner\'s Pub'},
      desc:{ko:'수퍼비아 귀족 향수 수퍼비아 향수 ×2 소비 → 광부 노조 정보: "아이젠클로가 R04를 매 분기 대량 구매해. 가격 부풀린 책임자가 콜드웰 시장이야."',
            en:'Superbia Noble Perfume ×2 → "Eisenklau buys R04 in bulk; mayor inflates price."'},
      objectives:[
        {type:'gather', item:'G22', qty:2, label:{ko:'수퍼비아 귀족 향수 ×2', en:'Superbia Noble Perfume ×2'}},
      ],
      rewardCr:30000, rewardVe:40,
      rewardItems:[],
      rewardFlags:['mayor_corrupt_known'],
      cutscene_pre:null, cutscene_post:null
    },
    {
      id:'p4_q1705', type:'story_quest', category:'hidden', phase:4,
      ic:'🌑', npc:'백구', npcIc:'🐕', npcKey:'baekgu2_think',
      nm:{ko:'폐갱 깊은 곳의 신호', en:'Deep Shaft Signal'},
      desc:{ko:'폐갱 최심부 — 100년 전 봉인된 캡슐 한 점 발견. 안에는 작은 데이터 칩 + 수퍼비아 중력수정 ×3.\n백구: "오래된 좌표예요. P28 캅테인b 균열 입구."',
            en:'Old capsule found — chip + Superbia Gravity Crystal ×3. Coords for Kapteyn-b void rift.'},
      objectives:[
        {type:'explore', target:'p10_deep_capsule', qty:1, label:{ko:'폐갱 최심부 캡슐 회수', en:'Recover capsule'}},
      ],
      rewardCr:50000, rewardVe:40,
      rewardItems:[{id:'G05', qty:3}],
      rewardFlags:['p28_coord_known'],
      cutscene_pre:null, cutscene_post:null
    }
  ],

  // ════════════════════════════════════════════════════════════════
  // 행성 18 · P12 메카니카 "아이젠클로 보급선 잠복"
  // 팩션 특산물: G09·G10·R07
  // ════════════════════════════════════════════════════════════════
  P12:[
    {
      id:'p4_q1801', type:'story_quest', category:'main', phase:4,
      ic:'🎯', npc:'이순신', npcIc:'⚔️', npcKey:'hero01',
      nm:{ko:'보급선 잠복', en:'Supply Line Ambush'},
      desc:{ko:'이순신: "P12 항로의 좁은 협곡 — 매 6턴 아이젠클로 보급선이 통과해. 매복 격파 후 G09 강화 부품 ×6 노획."\n전투 1회 승리 후 보상 회수.',
            en:'Ambush Eisenklau supply ship at Giga-Net Hub narrow pass. Win combat, loot Deuterium Battery ×6.'},
      objectives:[
        {type:'combat', target:'p12_supply_ship', qty:1, label:{ko:'보급선 격파', en:'Destroy supply'}},
      ],
      rewardCr:160000, rewardVe:100,
      rewardItems:[{id:'G09', qty:6}],
      rewardFlags:['eisenklau_supply_disrupted'],
      cutscene_pre:'p4_ch09b', cutscene_post:'p4_ch09c'
    },
    {
      id:'p4_q1802', type:'story_quest', category:'main', phase:4,
      ic:'📡', npc:'테슬라', npcIc:'🔬', npcKey:'hero07',
      nm:{ko:'보급선 통신 로그 해독', en:'Decrypt Comm Log'},
      desc:{ko:'노획한 통신 로그 해독 — 수퍼비아 중력자 ×3 소비.\n결과: "P14 요새 — 아이젠클로 친위대 7기 + 모선급 1기 배치."',
            en:'Superbia Graviton ×3 → "P14 fort — 7 guards + 1 mothership."'},
      objectives:[
        {type:'gather', item:'R07', qty:3, label:{ko:'수퍼비아 중력자 ×3 해독 비용', en:'Superbia Graviton ×3 decrypt'}},
      ],
      rewardCr:80000, rewardVe:70,
      rewardItems:[],
      rewardFlags:['p14_fort_intel'],
      cutscene_pre:null, cutscene_post:null
    },
    {
      id:'p4_q1803', type:'story_quest', category:'sub', phase:4,
      ic:'🔧', npc:'장영실', npcIc:'⚙️', npcKey:'hero02',
      nm:{ko:'노획 부품 재활용', en:'Salvage Reuse'},
      desc:{ko:'중수소 배터리 강화 부품을 거북선 보조 장갑에 통합. 중수소 배터리 ×3 소비.',
            en:'Deuterium Battery ×3 → integrate into turtle aux armor.'},
      objectives:[
        {type:'gather', item:'G09', qty:3, label:{ko:'중수소 배터리 ×3 통합', en:'Integrate Deuterium Battery ×3'}},
      ],
      rewardCr:40000, rewardVe:50,
      rewardItems:[],
      rewardFlags:['turtle_aux_armor'],
      cutscene_pre:null, cutscene_post:null
    },
    {
      id:'p4_q1804', type:'story_quest', category:'sub', phase:4,
      ic:'🔍', npc:'마르코 폴로', npcIc:'🗺️', npcKey:'hero08',
      nm:{ko:'기가툼 협곡 잔해 탐색', en:'Giga-Net Hub Canyon Wreck'},
      desc:{ko:'잠복 협곡 잔해 — 과거 메카니카-크리그 충돌. 잔해 탐색 3회.',
            en:'Search 3× in canyon.'},
      objectives:[
        {type:'explore', target:'p12_canyon', qty:3, label:{ko:'협곡 탐색 ×3', en:'Canyon ×3'}},
      ],
      rewardCr:38000, rewardVe:35,
      rewardItems:[{id:'G09', qty:2},{id:'R07', qty:1}],
      rewardFlags:[],
      cutscene_pre:null, cutscene_post:null
    },
    {
      id:'p4_q1805', type:'story_quest', category:'hidden', phase:4,
      ic:'🤝', npc:'광개토대왕', npcIc:'🛡️', npcKey:'hero03',
      nm:{ko:'광개토 정식 합류', en:'Gwanggaeto Joins'},
      desc:{ko:'거북선 용골·코어·외피 모두 완성된 후 광개토가 정식 합류. 저항군 군수품 저항군 의례 ×2 소비.\n광개토: "이제 내 검을 그대 깃발 아래 둔다."',
            en:'After all turtle parts done → Gwanggaeto formally joins. Resistance Military Supplies ×2 ceremony.'},
      objectives:[
        {type:'gather', item:'G13', qty:2, label:{ko:'저항군 군수품 ×2 합류 의례', en:'Resistance Military Supplies ×2 ceremony'}},
      ],
      rewardCr:0, rewardVe:120,
      rewardItems:[],
      rewardFlags:['h03_joined'],
      cutscene_pre:null, cutscene_post:'p4_ch09d'
    }
  ],

  // ════════════════════════════════════════════════════════════════
  // 행성 19 · P16 아우레우스 "케플러 442b 외곽"
  // 팩션 특산물: G24·G25·G27
  // ════════════════════════════════════════════════════════════════
  P16:[
    {
      id:'p4_q1901', type:'story_quest', category:'main', phase:4,
      ic:'🔓', npc:'마르코 폴로', npcIc:'🗺️', npcKey:'hero08',
      nm:{ko:'요새 코드 위조', en:'Forge Fort Code'},
      desc:{ko:'슈멜츠 요새 진입 코드 위조 — 아우레우스 정보 칩 정보 칩 ×3 + 메카니카 자동화 부품 ×2 소비. 마르코 폴로의 위조 기술.',
            en:'Forge Schmelz entry code: Aureus Information Chip ×3 + Mechanica Automation Part ×2.'},
      objectives:[
        {type:'gather', item:'G24', qty:3, label:{ko:'아우레우스 정보 칩 ×3 위조 재료', en:'Aureus Information Chip ×3 forge'}},
      ],
      rewardCr:140000, rewardVe:90,
      rewardItems:[],
      rewardFlags:['p14_fort_code_forged'],
      cutscene_pre:'p4_ch10a', cutscene_post:null
    },
    {
      id:'p4_q1902', type:'story_quest', category:'sub', phase:4,
      ic:'💎', npc:'장영실', npcIc:'⚙️', npcKey:'hero02',
      nm:{ko:'외피 강화 도면', en:'Hull Reinforce Schematic'},
      desc:{ko:'치크스 뇌수액 외피 강화 도면 ×2 거래 — 아우레우스 시장. 거북선 외피 +20% 내구도.',
            en:'Chiks Brain Fluid ×2 → turtle hull +20% durability.'},
      objectives:[
        {type:'gather', item:'G27', qty:2, label:{ko:'치크스 뇌수액 ×2', en:'Chiks Brain Fluid ×2'}},
      ],
      rewardCr:75000, rewardVe:60,
      rewardItems:[],
      rewardFlags:['turtle_hull_plus20'],
      cutscene_pre:null, cutscene_post:null
    },
    {
      id:'p4_q1903', type:'story_quest', category:'sub', phase:4,
      ic:'🍺', npc:'마르코 폴로', npcIc:'🗺️', npcKey:'hero08',
      nm:{ko:'케플러 외곽 주점', en:'Kepler Outskirt Pub'},
      desc:{ko:'수퍼비아 귀족 향수 향수 ×2 → 정보: "P28 캅테인b 균열에 아인슈타인이 잠수 중. 양자물리학자 — 보이드 안정화 이론의 권위자."',
            en:'Superbia Noble Perfume ×2 → "Einstein hiding in P28 rift. Quantum physicist."'},
      objectives:[
        {type:'gather', item:'G22', qty:2, label:{ko:'수퍼비아 귀족 향수 ×2', en:'Superbia Noble Perfume ×2'}},
      ],
      rewardCr:30000, rewardVe:40,
      rewardItems:[],
      rewardFlags:['einstein_location_known'],
      cutscene_pre:null, cutscene_post:null
    },
    {
      id:'p4_q1904', type:'story_quest', category:'sub', phase:4,
      ic:'🏛️', npc:'마르코 폴로', npcIc:'🗺️', npcKey:'hero08',
      nm:{ko:'페스작센 행성 경매', en:'Fessachsen Auction'},
      desc:{ko:'페스작센 경매. 즉구 ~95,000₡ / 최저 ~28,500₡.\n낙찰 시 매 턴 6,000₡ 세금 + 아우레우스 아우레우스 정보 칩 메카니카 자동화 부품 상시 구매.',
            en:'Fessachsen auction. Buyout ~95,000₡. Owner → 6,000/turn + Aureus Information Chip/Mechanica Automation Part shop.'},
      objectives:[
        {type:'explore', target:'p16_auction', qty:1, label:{ko:'페스작센 경매', en:'Auction'}},
      ],
      rewardCr:0, rewardVe:0,
      rewardItems:[],
      rewardFlags:['p16_owned'],
      cutscene_pre:null, cutscene_post:null
    },
    {
      id:'p4_q1905', type:'story_quest', category:'main', phase:4,
      ic:'⚓', npc:'호레이쇼 넬슨', npcIc:'⚓', npcKey:'hero05',
      nm:{ko:'넬슨 제독과의 조우', en:'Encounter Admiral Nelson'},
      desc:{ko:'케플러 442b 외곽 — 영국 해군 제독 호레이쇼 넬슨의 옛 함선 \'빅토리\' 잔해 좌표 입수. 아우레우스 정보 칩 ×2 + 치크스 뇌수액 ×1 소비하여 잔해 깊이 진입.\n넬슨: "트라팔가르의 바람을 다시 맞을 줄은 몰랐소. 그대들의 함대에 함께 한다."',
            en:'Find Nelson\'s old flagship Victory wreckage. Aureus Information Chip ×2 + Chiks Brain Fluid ×1. Nelson: "I never thought I\'d catch the wind of Trafalgar again. I join your fleet."'},
      objectives:[
        {type:'gather', item:'G24', qty:2, label:{ko:'아우레우스 정보 칩 정보 칩 ×2 좌표 분석', en:'Aureus Information Chip ×2 coord'}},
      ],
      rewardCr:180000, rewardVe:120,
      rewardItems:[],
      rewardFlags:['h05_joined','nelson_recruited'],
      cutscene_pre:'p4_ch10a2', cutscene_post:'p4_ch10a3'
    },
    {
      id:'p4_q1906', type:'story_quest', category:'sub', phase:4,
      ic:'📜', npc:'호레이쇼 넬슨', npcIc:'⚓', npcKey:'hero05',
      nm:{ko:'빅토리 함의 기록', en:'Victory\'s Log'},
      desc:{ko:'넬슨의 빅토리 함 항해일지 복원 — 메카니카 자동화 부품 ×3 소비. 영국 해군 진형 데이터 — 학익진과 결합 시 +15% 명중률.\n넬슨: "트라팔가르에서 적의 전열을 가르던 그 진형이오."',
            en:'Mechanica Automation Part ×3 → Victory\'s log → +15% accuracy bonus when combined with Crane Wing formation.'},
      objectives:[
        {type:'gather', item:'G25', qty:3, label:{ko:'메카니카 자동화 부품 ×3 일지 복원', en:'Mechanica Automation Part ×3 log restore'}},
      ],
      rewardCr:70000, rewardVe:60,
      rewardItems:[],
      rewardFlags:['nelson_formation_data'],
      cutscene_pre:null, cutscene_post:null
    },
    // ── 아이젠클로 중간보스전 (수락 즉시 대면 컷신 → 전투) 사용자 요청 2026-06-17 ──
    {
      id:'p4_q1907', type:'story_quest', category:'main', phase:4,
      ic:'⚔️', npc:'아이젠클로', npcIc:'🔥', npcKey:'eisenklau',
      nm:{ko:'아이젠클로 격돌 — 페스작센 결전', en:'Clash with Eisenklaue — Battle of Fessachsen'},
      desc:{ko:'페스작센 단조 공장 심장부. 봉쇄의 집행관 아이젠클로의 함대와 정면 충돌.\n수락 즉시 대면 → 전투. 크리그 소형·중형·대형 함대 + 2배 크기 아이젠클로 기함(체력·방어 ×10, 공격 ×5). 호위를 걷어내고 기함을 격파하라.',
            en:'The heart of the Fessachsen forge — a head-on clash with the fleet of Eisenklaue, enforcer of the blockade.\nAccept → confrontation → battle. Krieg small/medium/large fleet + a double-size Eisenklaue flagship (HP/DEF ×10, ATT ×5). Strip the escorts, then destroy the flagship.'},
      objectives:[
        {type:'combat', target:'eisenklau_midboss', qty:1, label:{ko:'아이젠클로 기함 격파', en:'Destroy Eisenklaue flagship'}},
      ],
      required:1,
      rewardCr:150000, rewardVe:80,
      rewardItems:[],
      rewardFlags:['eisenklau_midboss_cleared'],
      cutscene_pre:null, cutscene_post:'p4_ch10c',
      _midBoss:'eisenklau'
    }
  ],

  // ════════════════════════════════════════════════════════════════
  // 행성 20 · P14 크리그 "아이젠클로 잔존 요새 · 점령" (페이즈 4 종착지) — 집행관 격파 후 잔당 소탕/요새 점령 톤 (2026-06-17)
  // 팩션 특산물: G09·G10·G12·R08
  // ════════════════════════════════════════════════════════════════
  P14:[
    {
      id:'p4_q2001', type:'story_quest', category:'main', phase:4,
      ic:'⚔️', npc:'이순신', npcIc:'⚔️', npcKey:'hero01',
      nm:{ko:'아이젠클로 잔당 소탕', en:'Crush the Remnants'},
      desc:{ko:'집행관을 잃은 슈멜츠 요새 — 그래도 친위대 잔당이 끝까지 버틴다. 외곽 친위대 7기 소탕. 거북선 출격.\n이순신: "거북선의 노포가 그들의 방패를 뚫는다."',
            en:'With their enforcer dead, the Schmelz fort\'s praetorian remnants resist to the last. Sweep 7 outer guards. Geobukseon sorties.'},
      objectives:[
        {type:'combat', target:'p14_guards', qty:1, label:{ko:'친위대 7기 격파', en:'7 guards down'}},
      ],
      rewardCr:200000, rewardVe:120,
      rewardItems:[{id:'G10', qty:5}],
      rewardFlags:['p14_guards_cleared'],
      cutscene_pre:'p4_ch10b', cutscene_post:null
    },
    {
      id:'p4_q2002', type:'story_quest', category:'main', phase:4,
      ic:'💥', npc:'테슬라', npcIc:'🔬', npcKey:'hero07',
      nm:{ko:'요새 점령 — 코어 제압', en:'Seize the Fort — Core Breach'},
      desc:{ko:'요새 중앙 에너지 코어에 수퍼비아 중력자 ×5 + 크리그 마그마 코어 ×3 삽입 → 폭파 유도. 60초 탈출 후 강습 스파이크 ×8 회수.',
            en:'Superbia Graviton ×5 + Krieg Magma Core ×3 → core breach. Escape 60s, loot Assault Spike ×8.'},
      objectives:[
        {type:'gather', item:'R07', qty:5, label:{ko:'수퍼비아 중력자 ×5 폭파 장약', en:'Superbia Graviton ×5 charges'}},
      ],
      rewardCr:180000, rewardVe:110,
      rewardItems:[{id:'G12', qty:8}],
      rewardFlags:['p14_core_blown'],
      cutscene_pre:null, cutscene_post:null
    },
    {
      id:'p4_q2003', type:'story_quest', category:'main', phase:4,
      ic:'📜', npc:'가가린', npcIc:'🚀', npcKey:'hero04',
      nm:{ko:'사령실 점령 — 우르사 좌표 확보', en:'Command Room — Ursa Coordinates'},
      desc:{ko:'슈멜츠 요새 사령실 점령 후 데이터 회수. 수퍼비아 중력자 ×2 해독.\n결과: "아이젠클로의 기록 — 그는 우르사 메이저의 하수인이었다. 본거지 좌표: P30 제타 레티쿨리."',
            en:'Seize the Schmelz command room, recover the data. Superbia Graviton ×2 → "Eisenklaue\'s records — he was Ursa Major\'s pawn. Lair coordinates: P30 Zeta Reticuli."'},
      objectives:[
        {type:'gather', item:'R07', qty:2, label:{ko:'수퍼비아 중력자 ×2 해독', en:'Superbia Graviton ×2'}},
      ],
      rewardCr:120000, rewardVe:100,
      rewardItems:[],
      rewardFlags:['ursa_major_target_known','phase4_complete'],
      cutscene_pre:null, cutscene_post:null
    },
    {
      id:'p4_q2004', type:'story_quest', category:'sub', phase:4,
      ic:'🔍', npc:'백구', npcIc:'🐕', npcKey:'baekgu2_advice',
      nm:{ko:'요새 외곽 데이터 코어 회수', en:'Outer Data Core'},
      desc:{ko:'요새 외곽 폐기된 데이터 코어 탐색 3회 — 은하 혼돈 결정 ×3 + 강습 스파이크 ×3 회수 가능.',
            en:'Search outer cores 3× — Galactic Chaos Crystal ×3 + Assault Spike ×3.'},
      objectives:[
        {type:'explore', target:'p14_outer_core', qty:3, label:{ko:'외곽 코어 탐색 ×3', en:'Outer core ×3'}},
      ],
      rewardCr:55000, rewardVe:50,
      rewardItems:[{id:'R08', qty:3},{id:'G12', qty:3}],
      rewardFlags:[],
      cutscene_pre:null, cutscene_post:null
    },
    {
      id:'p4_q2005', type:'story_quest', category:'hidden', phase:4,
      ic:'🏆', npc:'광개토대왕', npcIc:'🛡️', npcKey:'hero03',
      nm:{ko:'정복자의 깃발', en:'Conqueror\'s Banner'},
      desc:{ko:'슈멜츠 요새 점령 후 광개토가 깃발을 꽂는다. 강습 스파이크 ×3 → 정복 의례.\n광개토: "이 요새는 이제 우리 것이다."',
            en:'Assault Spike ×3 → Conquest banner. Gwanggaeto: "This fort is ours now."'},
      objectives:[
        {type:'gather', item:'G12', qty:3, label:{ko:'강습 스파이크 ×3 의례', en:'Assault Spike ×3 rite'}},
      ],
      rewardCr:80000, rewardVe:70,
      rewardItems:[],
      rewardFlags:['p14_conquered'],
      cutscene_pre:null, cutscene_post:null
    }
  ]
};

// ═══════════════════════════════════════════════════════════════════
// Phase 4 컷씬 (한국어)
// 색상: 백구 #66ddff · 사령관 #00f3ff · 이순신 #c0a060 · 광개토 #ff9d52
//      장영실 #80e8c0 · 가가린·마르코·테슬라 #ffd700 · 시스템 #38bdf8
// ═══════════════════════════════════════════════════════════════════
const PHASE4_CUTSCENES_KO={

  // ─── CH08-A "용골을 세운다" (P15 도착) ───
  p4_ch08a:[
    {char:'hero02', name:'장영실', color:'#a0d8ef', text:'데이터 복호기로 해독한 로그 — 아이젠클로가 직접 이 행성 공장을 지휘하고 있어. 생체 병기 핵심 코어를 여기서 제조 중이야.'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'아이젠콕에서 도망쳤던 그 놈이 여기 있군.'},
    {char:'hero08', name:'마르코 폴로', color:'#ffd700', text:'잠깐. 크리그 내부 정보망이 잡혔어. 공장 노동자 중에 반란 움직임이 있다고.'},
    {char:'hero02', name:'장영실', color:'#a0d8ef', text:'반란군... 이용할 수 있어. 공장 설비를 가동하면 크리그 마그마 코어도 얻을 수 있고.'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'둘 다 잡자. 아이젠클로 추격 + 크리그 마그마 코어 확보.'}
  ],

    // ─── CH08-B "용골 완성" (Q16-01 완료) ───
  p4_ch08b:[
    {char:'volcan', name:'반란군 리더 \'볼칸\'', color:'#9ee7ff', text:'당신들이 저항군과 함께 싸우는 {회사}야. 우리 스파크는 크리그 공장 노동자들의 자유 민병대야. 요새에 우리 동료들이 감금돼 있어.'},
    {char:'hero08', name:'마르코 폴로', color:'#ffd700', text:'거래 가능하겠네. 우리가 카토닉에 가면 당신 동료를 돕고, 당신들은 크리그 내부 항로 정보를 준다.'},
    {char:'volcan', name:'볼칸', color:'#9ee7ff', text:'그것뿐만 아니라 — 마그마 코어 비축고. 당신들이 뭘 만들려는지 모르지만, 필요하면 가져가.'}
  ],

    // ─── CH08-C "광개토와 재회" (Q16-05) ───
  p4_ch08c:[
    {char:'hero01', name:'이순신', color:'#c0a060', text:'공개 공격은 안 돼. 반란군 채널로 내부로 들어가야 해.'},
    {char:'hero08', name:'마르코 폴로', color:'#ffd700', text:'볼칸이 내부 노선 알려줬어. 비축고는 3층 심층부야.'},
    {char:'hero02', name:'장영실', color:'#a0d8ef', text:'크리그 마그마 코어 3개만 더 있으면... 거북선 용골 재료가 완성돼.'},
    {char:'hero04', name:'가가린', color:'#88ccff', text:'그리고 동료들을 구출한다. 동시에.'}
  ],

    // ─── CH09-A "코어를 잇는다" (P10 도착) ───
  p4_ch09a:[
    {char:'hero08', name:'마르코 폴로', color:'#ffd700', text:'수퍼비아는 외교가 전부야. 상인 의회가 이 행성을 통치해. 귀족 향수 하나면 회의실 입장도 가능하지.'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'우리가 원하는 건 수퍼비아 중력자야. 중력자 채굴 독점 허가가 필요해.'},
    {char:'hero08', name:'마르코 폴로', color:'#ffd700', text:'그건 내 분야야. 수퍼비아 상인 의회랑은 전에도 일한 적 있어. 귀족 향수 한 병이면 회의실 문은 열려.'}
  ],

    // ─── CH09-B "잠복" (P12 도착) ───
  p4_ch09b:[
    {char:'hero01', name:'이순신', color:'#c0a060', text:'은하 혼돈 결정. 보이드 균열에서만 얻을 수 있는 자원이야.'},
    {char:'hero04', name:'가가린', color:'#88ccff', text:'캅테인b 균열. 보이드 행성 중 가장 접근성이 좋아. 하지만—'},
    {char:'hero08', name:'마르코 폴로', color:'#ffd700', text:'보이드 공간은 물리 법칙이 달라. 시간이 느려지고, 공간이 접힌다. 함선 항법이 제대로 작동 안 할 수 있어.'},
    {char:'hero02', name:'장영실', color:'#a0d8ef', text:'은하 혼돈 결정 15개. 그것 없이는 거북선 제작이 불가능해.'},
    {char:'hero04', name:'가가린', color:'#88ccff', text:'거기다가 — 이휘소 박사가 그 근처에 있다고 했잖아. 그 분을 찾아야 해.'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'두 마리 토끼. 가자.'}
  ],

    // ─── CH09-C "보급선 격파" (Q18-01 완료) ───
  p4_ch09c:[
    {char:'hero02', name:'장영실', color:'#a0d8ef', text:'항법 보조가 안 돼. 균열 지도 원석으로 경로를 수동 입력해야 해.'},
    {char:'hero08', name:'마르코 폴로', color:'#ffd700', text:'균열 지도 원석... 이건 보이드 행성에서만 구하는 건데. 운 좋게 외곽에서 좀 샀어.'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'들어간다.'}
  ],

    // ─── CH09-D "광개토 합류" (Q18-05 완료) ───
  p4_ch09d:[
    {char:'hero08', name:'마르코 폴로', color:'#ffd700', text:'저 배... 수퍼비아 주점에서 들은 그 연구선이야.'},
    {char:'hero09', name:'이휘소 박사', color:'#9ee7ff', text:'누구시오? 이 좌표를 아는 사람이 있다니.'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'우리는 저항군과 함께 아이젠클로와 싸우고 있어요. 당신이 이휘소 박사인가요?'},
    {char:'hero09', name:'이휘소', color:'#9ee7ff', text:'...방정식이 완성됐소. 보이드 에너지와 반물질을 결합하면 — 지금껏 이 우주에 없던 무기 에너지가 나와.'},
    {char:'hero09', name:'이휘소', color:'#9ee7ff', text:'거북선에 그 에너지를 실을 수 있소? 도면이 있다면...'},
    {char:'hero02', name:'장영실', color:'#a0d8ef', text:'나한테 있어요.'}
  ],

    // ─── CH10-A "위조의 기술" (P16 도착) ───
  p4_ch10a:[
    {char:'hero02', name:'장영실', color:'#a0d8ef', text:'크리그 마그마 코어 × 8. 저항군 반물질 × 25. 수퍼비아 중력자 × 10. 은하 혼돈 결정 × 15. 모두 확보됐어.'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'...드디어.'},
    {char:'maximov', name:'레인저', color:'#9ee7ff', text:'제작 베이 준비 완료. 장영실 씨, 시작하시죠.'},
    {char:'hero08', name:'마르코 폴로', color:'#ffd700', text:'저건 개가 흥분한 거야, 확실히.'}
  ],

    // ─── CH10-A2 "트라팔가르의 메아리" (Q19-05 시작 · 넬슨 만남) ───
  p4_ch10a2:[
    {char:'baekgu2_advice', name:'백구', color:'#66ddff', text:'케플러 442b 외곽 — 약 200년 전 좌표의 잔해 신호 감지. 영국 해군 식별 코드 \'HMS Victory\'.'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'빅토리... 트라팔가르의 기함.'},
    {char:'hero08', name:'마르코 폴로', color:'#ffd700', text:'영국 넬슨 제독 — 1805년 트라팔가르 해전에서 전사. 그런데 우주에 빅토리가? 이건 — 우주 보존 캡슐이군.'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'아우레우스 정보 칩 정보 칩으로 좌표 분석. 진입한다.'}
  ],

  // ─── CH10-A3 "넬슨 합류" (Q19-05 완료) ───
  p4_ch10a3:[
    {char:'hero05', name:'호레이쇼 넬슨', color:'#88ccff', text:'(캡슐에서 깨어나며) ...영국이었어. 마지막 본 것은 트라팔가르의 안개였소.'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'(영어 자동 번역) 넬슨 제독. 나는 이순신이오.'},
    {char:'hero05', name:'호레이쇼 넬슨', color:'#88ccff', text:'동방의 거북선 제독... 이름은 들었소. 같은 바다의 영웅을 우주에서 만나다니.'},
    {char:'hero05', name:'호레이쇼 넬슨', color:'#88ccff', text:'트라팔가르의 바람을 다시 맞을 줄은 몰랐소. 그대들의 함대에 함께 한다 — 마지막 일전이 어디든.'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'학익진과 트라팔가르 진형 — 두 바다의 전술을 하나로 묶으면 우르사도 막을 수 없을 거요.'},
    {char:'baekgu2_smile4', name:'백구', color:'#66ddff', text:'영웅 합류: 호레이쇼 넬슨(H05). 영국 해군 진형 데이터 입수 → 학익진 명중률 +15%.'}
  ],

  // ─── CH10-B "요새 돌파" (P14 도착) ───
  p4_ch10b:[
    {char:'maximov', name:'레인저', color:'#9ee7ff', text:'페스작센은 끝났습니다. 집행관은 격파됐어요. 하지만 크리그 보급 요새 슈멜츠가 아직 살아있습니다.'},
    {char:'hero02', name:'장영실', color:'#a0d8ef', text:'아이젠클로는 죽었어도 친위대 잔당이 요새를 붙잡고 있어. 뿌리까지 뽑자.'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'{사령관}. 거북선으로 슈멜츠를 점령한다. 사령실 데이터에 — 우르사로 가는 길이 있을 거야.'}
  ],

    // ─── CH10-C "도주 좌표" (Q20-03 완료 · 페이즈 4 종료) ───
  p4_ch10c:[
    {char:'hero04', name:'가가린', color:'#ffd700', text:'사령실 데이터 회수. 아이젠클로 — 격파 확인. 봉쇄 집행관이 페스작센에서 끝났어.'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'100년 봉쇄의 손발 하나를 잘랐다. 하지만 머리는 아직 남아 있다.'},
    {char:'baekgu2_smile4', name:'백구', color:'#66ddff', text:'공장 지하 연구동에서 보존 캡슐 발견 — 생체 반응! 살아있어요.'},
    {char:'hero09', name:'이휘소', color:'#9ee7ff', text:'...여기가 어디요. 나는 이휘소요, 입자물리학자였소. 100년을 잤다니...'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'박사님의 방정식이 100년 뒤 우리를 여기로 이끌었습니다. 함께 가시죠.'},
    {char:'hero08', name:'마르코 폴로', color:'#ffd700', text:'아이젠클로 데이터에 좌표 하나 — 제타 레티쿨리. 우르사 메이저 본거지야.'},
    {char:'hero03', name:'광개토대왕', color:'#ff9d52', text:'우르사 메이저 — 진짜 보스다. 직접 잡아야 끝난다.'},
    {char:'hero07', name:'테슬라', color:'#ffd700', text:'제타 레티쿨리 전에 캅테인 균열을 거쳐야 해. 거기 아인슈타인이 있어 — 우르사의 보이드 방어막을 풀 열쇠야.'},
    {char:'baekgu1', name:'백구', color:'#66ddff', text:'페이즈 4 완료. 집행관 격파 · 이휘소(9번째 전설 영웅) 합류. 페이즈 5 — 캅테인 균열~지구, 우르사 메이저로.'}
  ],

    // ─── 아이젠클로 대면 (페스작센 P16 중간보스 직전) ─── 사용자 요청 2026-06-17
  p4_eisenklau:[
    {char:'eisenklau', name:'아이젠클로', color:'#ff6644', text:'여기까지 왔군, 인간. 페스작센 — 내 단조 공장의 심장부다. 한 발도 더 들이지 못한다.'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'아이젠클로. 100년 봉쇄의 집행관. 오늘 네 함대를 여기 묻겠다.'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'저 기함 — 다른 함선의 열 배는 단단하다. 정면은 피해. 호위부터 걷어내고 본함을 친다.'},
    {char:'eisenklau', name:'아이젠클로', color:'#ff6644', text:'(기함 출력 최대) 크리그 전 함대 — 전열 정비! 저 거북선을 갈아버려라!'},
    {char:'baekgu2_fight', name:'백구', color:'#66ddff', text:'아이젠클로 기함 포착 — 크기 2배, 장갑 이상. 전 함선 전투 준비!'}
  ]
};

const PHASE4_CUTSCENES_EN={

  // ─── CH08-A "Lay the Keel" (P15 arrival) ───
  p4_ch08a:[
    {char:'hero02', name:'Jang Yeong-sil', color:'#a0d8ef', text:'I decrypted the logs with the data decoder — Eisenklaue is personally directing this planet\'s factory. They\'re manufacturing the core for their bio-weapon right here.'},
    {char:'hero01', name:'Yi Sun-sin', color:'#c0a060', text:'So the one who fled from Eisenkock is here.'},
    {char:'hero08', name:'Marco Polo', color:'#ffd700', text:'Wait. I\'ve tapped into Krieg\'s internal network. They say there\'s a rebellion stirring among the factory workers.'},
    {char:'hero02', name:'Jang Yeong-sil', color:'#a0d8ef', text:'Rebels... we can use that. If we get the factory running, we can secure the Krieg Magma Core too.'},
    {char:'hero01', name:'Yi Sun-sin', color:'#c0a060', text:'We take both. Hunt down Eisenklaue, and secure the Krieg Magma Core.'}
  ],

    // ─── CH08-B "Keel Complete" (Q16-01 done) ───
  p4_ch08b:[
    {char:'volcan', name:'Rebel Leader \'Volcan\'', color:'#9ee7ff', text:'So you\'re the {company} fighting alongside the resistance. Our Spark is the free militia of the Krieg factory workers. Our comrades are locked up inside the fortress.'},
    {char:'hero08', name:'Marco Polo', color:'#ffd700', text:'We can deal. When we reach Catonic, we\'ll help free your comrades — and you give us Krieg\'s internal route data.'},
    {char:'volcan', name:'Volcan', color:'#9ee7ff', text:'And more than that — a magma core stockpile. I don\'t know what you\'re building, but take it if you need it.'}
  ],

    // ─── CH08-C "Reunion with Gwanggaeto" (Q16-05) ───
  p4_ch08c:[
    {char:'hero01', name:'Yi Sun-sin', color:'#c0a060', text:'No open assault. We have to go in through the rebels\' channel.'},
    {char:'hero08', name:'Marco Polo', color:'#ffd700', text:'Volcan gave us the internal route. The stockpile is deep on level three.'},
    {char:'hero02', name:'Jang Yeong-sil', color:'#a0d8ef', text:'Just three more Krieg Magma Cores... and the Geobukseon\'s keel material is complete.'},
    {char:'hero04', name:'Gagarin', color:'#88ccff', text:'And we rescue the comrades. At the same time.'}
  ],

    // ─── CH09-A "Link the Cores" (P10 arrival) ───
  p4_ch09a:[
    {char:'hero08', name:'Marco Polo', color:'#ffd700', text:'On Superbia, diplomacy is everything. A merchants\' council rules this planet. One bottle of noble perfume gets you into the council chamber.'},
    {char:'hero01', name:'Yi Sun-sin', color:'#c0a060', text:'What we want is the Superbia Graviton. We need an exclusive license to mine it.'},
    {char:'hero08', name:'Marco Polo', color:'#ffd700', text:'That\'s my field. I\'ve worked with the Superbia merchants\' council before. One bottle of noble perfume and the chamber doors swing open.'}
  ],

    // ─── CH09-B "Infiltration" (P12 arrival) ───
  p4_ch09b:[
    {char:'hero01', name:'Yi Sun-sin', color:'#c0a060', text:'Galactic Chaos Crystals. A resource found only in the Void rifts.'},
    {char:'hero04', name:'Gagarin', color:'#88ccff', text:'The Kapteyn-b rift. The most accessible of the Void planets. But—'},
    {char:'hero08', name:'Marco Polo', color:'#ffd700', text:'Void space follows different physical laws. Time slows, space folds. A ship\'s navigation can stop working properly.'},
    {char:'hero02', name:'Jang Yeong-sil', color:'#a0d8ef', text:'Fifteen Galactic Chaos Crystals. Without them, building the Geobukseon is impossible.'},
    {char:'hero04', name:'Gagarin', color:'#88ccff', text:'And on top of that — you said Dr. Lee Hwi-so is somewhere near there. We have to find him.'},
    {char:'hero01', name:'Yi Sun-sin', color:'#c0a060', text:'Two birds, one stone. Let\'s move.'}
  ],

    // ─── CH09-C "Crush the Supply Line" (Q18-01 done) ───
  p4_ch09c:[
    {char:'hero02', name:'Jang Yeong-sil', color:'#a0d8ef', text:'Navigation assist is down. We\'ll have to enter the route manually using a rift map shard.'},
    {char:'hero08', name:'Marco Polo', color:'#ffd700', text:'A rift map shard... those only come from the Void planets. Lucky for us, I picked some up out on the frontier.'},
    {char:'hero01', name:'Yi Sun-sin', color:'#c0a060', text:'We\'re going in.'}
  ],

    // ─── CH09-D "Gwanggaeto Joins" (Q18-05 done) ───
  p4_ch09d:[
    {char:'hero08', name:'Marco Polo', color:'#ffd700', text:'That ship... it\'s the research vessel I heard about in the Superbia tavern.'},
    {char:'hero09', name:'Dr. Lee Hwi-so', color:'#9ee7ff', text:'Who are you? I can\'t believe anyone knows these coordinates.'},
    {char:'hero01', name:'Yi Sun-sin', color:'#c0a060', text:'We fight Eisenklaue alongside the resistance. Are you Dr. Lee Hwi-so?'},
    {char:'hero09', name:'Lee Hwi-so', color:'#9ee7ff', text:'...The equation is complete. Combine Void energy with antimatter and you get a weapon energy this universe has never seen.'},
    {char:'hero09', name:'Lee Hwi-so', color:'#9ee7ff', text:'Can the Geobukseon carry that energy? If you have the blueprints...'},
    {char:'hero02', name:'Jang Yeong-sil', color:'#a0d8ef', text:'I have them.'}
  ],

    // ─── CH10-A "The Art of Forgery" (P16 arrival) ───
  p4_ch10a:[
    {char:'hero02', name:'Jang Yeong-sil', color:'#a0d8ef', text:'Krieg Magma Core ×8. Resistance Antimatter ×25. Superbia Graviton ×10. Galactic Chaos Crystal ×15. All secured.'},
    {char:'hero01', name:'Yi Sun-sin', color:'#c0a060', text:'...At last.'},
    {char:'maximov', name:'Ranger', color:'#9ee7ff', text:'The construction bay is ready. Jang Yeong-sil, whenever you\'re ready to begin.'},
    {char:'hero08', name:'Marco Polo', color:'#ffd700', text:'That\'s the dog getting excited, no doubt about it.'}
  ],

    // ─── CH10-A2 "Echo of Trafalgar" (Q19-05 start · meet Nelson) ───
  p4_ch10a2:[
    {char:'baekgu2_advice', name:'Baekgu', color:'#66ddff', text:'On the frontier of Schmelz — wreckage signal detected at coordinates roughly 200 years old. Royal Navy identification code \'HMS Victory\'.'},
    {char:'hero01', name:'Yi Sun-sin', color:'#c0a060', text:'Victory... the flagship of Trafalgar.'},
    {char:'hero08', name:'Marco Polo', color:'#ffd700', text:'Admiral Nelson of Britain — fell at the Battle of Trafalgar in 1805. But the Victory, out in space? This — this is a deep-space preservation capsule.'},
    {char:'commander', name:'{commander}', color:'#00f3ff', text:'Analyzing the coordinates with the Aureus Information Chip. We\'re going in.'}
  ],

  // ─── CH10-A3 "Nelson Joins" (Q19-05 done) ───
  p4_ch10a3:[
    {char:'hero05', name:'Horatio Nelson', color:'#88ccff', text:'(waking from the capsule) ...It was Britain. The last thing I saw was the mist of Trafalgar.'},
    {char:'hero01', name:'Yi Sun-sin', color:'#c0a060', text:'(auto-translated from English) Admiral Nelson. I am Yi Sun-sin.'},
    {char:'hero05', name:'Horatio Nelson', color:'#88ccff', text:'The turtle-ship admiral of the East... I have heard the name. To meet a hero of the same sea, here among the stars.'},
    {char:'hero05', name:'Horatio Nelson', color:'#88ccff', text:'I never thought I would feel the winds of Trafalgar again. I will stand with your fleet — wherever this last battle may be.'},
    {char:'hero01', name:'Yi Sun-sin', color:'#c0a060', text:'The Crane Wing and the Trafalgar line — bind the tactics of two seas into one, and not even Ursa can stop us.'},
    {char:'baekgu2_smile4', name:'Baekgu', color:'#66ddff', text:'Hero joined: Horatio Nelson (H05). Royal Navy formation data acquired → Crane Wing accuracy +15%.'}
  ],

  // ─── CH10-B "Break the Fortress" (P14 arrival) ───
  p4_ch10b:[
    {char:'maximov', name:'Ranger', color:'#9ee7ff', text:'Fessachsen is finished — the enforcer is dead. But the Krieg supply fort Schmelz still stands.'},
    {char:'hero02', name:'Jang Yeong-sil', color:'#a0d8ef', text:'Eisenklaue may be gone, but his praetorian remnants still hold the fort. Let\'s pull it out by the roots.'},
    {char:'hero01', name:'Yi Sun-sin', color:'#c0a060', text:'{commander}. We seize Schmelz with the Geobukseon. The command-room data should hold the road to Ursa.'}
  ],

    // ─── CH10-C "Escape Coordinates" (Q20-03 done · Phase 4 end) ───
  p4_ch10c:[
    {char:'hero04', name:'Gagarin', color:'#ffd700', text:'Command-room data recovered. Eisenklaue — confirmed destroyed. The blockade\'s enforcer met his end at Fessachsen.'},
    {char:'hero01', name:'Yi Sun-sin', color:'#c0a060', text:'We severed one hand of the century-long blockade. But the head still remains.'},
    {char:'baekgu2_smile4', name:'Baekgu', color:'#66ddff', text:'A preservation capsule in the research wing beneath the factory — life signs! Someone is alive.'},
    {char:'hero09', name:'Dr. Lee Hwi-so', color:'#9ee7ff', text:'...where am I. I am Lee Hwi-so — I was a particle physicist. A hundred years asleep...'},
    {char:'hero01', name:'Yi Sun-sin', color:'#c0a060', text:'Your equations led us here a century later, Doctor. Come with us.'},
    {char:'hero08', name:'Marco Polo', color:'#ffd700', text:'One coordinate buried in Eisenklaue\'s data — Zeta Reticuli. Ursa Major\'s home base.'},
    {char:'hero03', name:'Gwanggaeto the Great', color:'#ff9d52', text:'Ursa Major — the true boss. It ends only when we take it down ourselves.'},
    {char:'hero07', name:'Tesla', color:'#ffd700', text:'Before Zeta Reticuli we must pass the Kapteyn rift. Einstein is there — the key to unlocking Ursa\'s Void shield.'},
    {char:'baekgu1', name:'Baekgu', color:'#66ddff', text:'Phase 4 complete. The enforcer is down · Dr. Lee Hwi-so (9th legendary hero) joins. Phase 5 — Kapteyn rift to Earth, on to Ursa Major.'}
  ],

    // ─── Eisenklaue confrontation (Fessachsen P16, mid-boss lead-in) ─── 2026-06-17
  p4_eisenklau:[
    {char:'eisenklau', name:'Eisenklaue', color:'#ff6644', text:'So you reached this far, human. Fessachsen — the heart of my forge. Not one step further.'},
    {char:'commander', name:'{commander}', color:'#00f3ff', text:'Eisenklaue. Enforcer of the century-long blockade. Today your fleet is buried here.'},
    {char:'hero01', name:'Yi Sun-sin', color:'#c0a060', text:'That flagship — ten times the hull of the rest. Avoid a head-on. Strip the escorts first, then strike the core.'},
    {char:'eisenklau', name:'Eisenklaue', color:'#ff6644', text:'(flagship to full power) All Krieg ships — form ranks! Grind that Turtle Ship to dust!'},
    {char:'baekgu2_fight', name:'Baekgu', color:'#66ddff', text:'Eisenklaue flagship detected — double size, abnormal armor. All ships, prepare for battle!'}
  ]
};

// 행성별 인트로 컷씬 — 행성 첫 도착 시 자동 재생
const PHASE4_PLANET_INTROS={
  P15:'p4_ch08a',  // 용골을 세운다
  P10:'p4_ch09a',  // 코어를 잇는다
  P12:'p4_ch09b',  // 잠복
  P16:'p4_ch10a',  // 위조의 기술
  P14:'p4_ch10b'   // 요새 돌파
};

window.PHASE4_QUESTS=PHASE4_QUESTS;
window.PHASE4_CUTSCENES_KO=PHASE4_CUTSCENES_KO;
window.PHASE4_CUTSCENES_EN=PHASE4_CUTSCENES_EN;
window.PHASE4_PLANET_INTROS=PHASE4_PLANET_INTROS;

console.log('[PHASE4_QUESTS v1.0] Loaded — 25 quests across 5 planets (P15·P10·P12·P16·P14), 9 cutscenes');
})();
