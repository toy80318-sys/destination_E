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
        {type:'gather', item:'R08', qty:15, label:{ko:'R08 메카니카 합금 ×15 확보', en:'Secure R08 ×15'}},
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
        {type:'gather', item:'R07', qty:10, label:{ko:'R07 합성 코어 ×10', en:'R07 ×10'}},
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
      desc:{ko:'P15 기어월드 변두리 주점. G10 크리그 무기 원석 ×2 소비 → 정보: "P12 아이젠클로 보급선이 매 6턴마다 통과해." (P12 잠복 가능).',
            en:'G10 ×2 → "Eisenklau supply ship passes P12 every 6 turns."'},
      objectives:[
        {type:'gather', item:'G10', qty:2, label:{ko:'G10 ×2 정보료', en:'G10 ×2 fee'}},
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
      desc:{ko:'P15 외곽 — 메카니카 폐기 구역. 잔해 탐색 3회.\n70% R08·G09·G10 부산물 / 30% 잔해 해적.',
            en:'Search 3× outside P15. 70% R08/G09/G10 / 30% wreck pirates.'},
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
      desc:{ko:'P15 거대 격납고에서 자유 상인 광개토와 재회. 그가 보유한 거북선 외피 보강 도면 G27 ×3 양도 거래.\n광개토: "거북선이 완성되면 — 나는 당신 깃발 아래 선다."',
            en:'Meet Gwanggaeto. G27 ×3 → He pledges to join your fleet once turtle ship is complete.'},
      objectives:[
        {type:'gather', item:'G27', qty:3, label:{ko:'G27 ×3 거래', en:'G27 ×3 trade'}},
      ],
      rewardCr:150000, rewardVe:100,
      rewardItems:[],
      rewardFlags:['h03_recruit_pledged'],
      cutscene_pre:'p4_ch08c', cutscene_post:null
    },
    {
      id:'p4_q1606', type:'story_quest', category:'sub', phase:4,
      ic:'🏛️', npc:'마르코 폴로', npcIc:'🗺️', npcKey:'hero08',
      nm:{ko:'P15 행성 경매', en:'P15 Auction'},
      desc:{ko:'P15 메카니카 행성 경매. 즉구 ~88,000₡ / 최저 ~26,400₡.\n낙찰 시 매 턴 5,500₡ 세금 + 메카니카 R 재료 상시 구매 가능.',
            en:'Bid on P15. Buyout ~88,000₡. Owner → 5,500₡/turn + R-mat shop.'},
      objectives:[
        {type:'explore', target:'p15_auction', qty:1, label:{ko:'P15 경매 참여', en:'Auction'}},
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
      nm:{ko:'콜드웰 광산 R04 채굴', en:'Coldwell R04 Mining'},
      desc:{ko:'백구: "거북선 외피 코팅에 R04 양자합금 ×8이 필요해요. P10 콜드웰 광산이 R04 주산지예요. G03 ×4 채굴권 비용 지불."',
            en:'R04 ×8 needed for hull. G03 ×4 mining fee.'},
      objectives:[
        {type:'gather', item:'R04', qty:8, label:{ko:'R04 양자합금 ×8 확보', en:'Secure R04 ×8'}},
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
            en:'G04 ×5 for turtle cannon ports.'},
      objectives:[
        {type:'gather', item:'G04', qty:5, label:{ko:'G04 ×5 확보', en:'G04 ×5'}},
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
      desc:{ko:'콜드웰 광산 폐갱 — 잔해 탐색 3회.\n70% R04·G03·G05 / 30% 잔해 해적.',
            en:'Search 3×. 70% R04/G03/G05 / 30% wreck pirates.'},
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
      desc:{ko:'G22 수퍼비아 향수 ×2 소비 → 광부 노조 정보: "아이젠클로가 R04를 매 분기 대량 구매해. 가격 부풀린 책임자가 콜드웰 시장이야."',
            en:'G22 ×2 → "Eisenklau buys R04 in bulk; mayor inflates price."'},
      objectives:[
        {type:'gather', item:'G22', qty:2, label:{ko:'G22 ×2', en:'G22 ×2'}},
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
      desc:{ko:'폐갱 최심부 — 100년 전 봉인된 캡슐 한 점 발견. 안에는 작은 데이터 칩 + G05 ×3.\n백구: "오래된 좌표예요. P28 캅테인b 균열 입구."',
            en:'Old capsule found — chip + G05 ×3. Coords for P28 Kapteyn-b void rift.'},
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
            en:'Ambush Eisenklau supply ship at P12 narrow pass. Win combat, loot G09 ×6.'},
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
      desc:{ko:'노획한 통신 로그 해독 — R07 ×3 소비.\n결과: "P14 요새 — 아이젠클로 친위대 7기 + 모선급 1기 배치."',
            en:'R07 ×3 → "P14 fort — 7 guards + 1 mothership."'},
      objectives:[
        {type:'gather', item:'R07', qty:3, label:{ko:'R07 ×3 해독 비용', en:'R07 ×3 decrypt'}},
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
      desc:{ko:'G09 강화 부품을 거북선 보조 장갑에 통합. G09 ×3 소비.',
            en:'G09 ×3 → integrate into turtle aux armor.'},
      objectives:[
        {type:'gather', item:'G09', qty:3, label:{ko:'G09 ×3 통합', en:'Integrate G09 ×3'}},
      ],
      rewardCr:40000, rewardVe:50,
      rewardItems:[],
      rewardFlags:['turtle_aux_armor'],
      cutscene_pre:null, cutscene_post:null
    },
    {
      id:'p4_q1804', type:'story_quest', category:'sub', phase:4,
      ic:'🔍', npc:'마르코 폴로', npcIc:'🗺️', npcKey:'hero08',
      nm:{ko:'P12 협곡 잔해 탐색', en:'P12 Canyon Wreck'},
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
      desc:{ko:'거북선 용골·코어·외피 모두 완성된 후 광개토가 정식 합류. G13 저항군 의례 ×2 소비.\n광개토: "이제 내 검을 그대 깃발 아래 둔다."',
            en:'After all turtle parts done → Gwanggaeto formally joins. G13 ×2 ceremony.'},
      objectives:[
        {type:'gather', item:'G13', qty:2, label:{ko:'G13 ×2 합류 의례', en:'G13 ×2 ceremony'}},
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
      desc:{ko:'P14 요새 진입 코드 위조 — G24 정보 칩 ×3 + G25 ×2 소비. 마르코 폴로의 위조 기술.',
            en:'Forge P14 entry code: G24 ×3 + G25 ×2.'},
      objectives:[
        {type:'gather', item:'G24', qty:3, label:{ko:'G24 ×3 위조 재료', en:'G24 ×3 forge'}},
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
      desc:{ko:'G27 외피 강화 도면 ×2 거래 — 아우레우스 시장. 거북선 외피 +20% 내구도.',
            en:'G27 ×2 → turtle hull +20% durability.'},
      objectives:[
        {type:'gather', item:'G27', qty:2, label:{ko:'G27 ×2', en:'G27 ×2'}},
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
      desc:{ko:'G22 향수 ×2 → 정보: "P28 캅테인b 균열에 아인슈타인이 잠수 중. 양자물리학자 — 보이드 안정화 이론의 권위자."',
            en:'G22 ×2 → "Einstein hiding in P28 rift. Quantum physicist."'},
      objectives:[
        {type:'gather', item:'G22', qty:2, label:{ko:'G22 ×2', en:'G22 ×2'}},
      ],
      rewardCr:30000, rewardVe:40,
      rewardItems:[],
      rewardFlags:['einstein_location_known'],
      cutscene_pre:null, cutscene_post:null
    },
    {
      id:'p4_q1904', type:'story_quest', category:'sub', phase:4,
      ic:'🏛️', npc:'마르코 폴로', npcIc:'🗺️', npcKey:'hero08',
      nm:{ko:'P16 행성 경매', en:'P16 Auction'},
      desc:{ko:'P16 경매. 즉구 ~95,000₡ / 최저 ~28,500₡.\n낙찰 시 매 턴 6,000₡ 세금 + 아우레우스 G24 G25 상시 구매.',
            en:'P16 auction. Buyout ~95,000₡. Owner → 6,000/turn + G24/G25 shop.'},
      objectives:[
        {type:'explore', target:'p16_auction', qty:1, label:{ko:'P16 경매', en:'Auction'}},
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
      desc:{ko:'케플러 442b 외곽 — 영국 해군 제독 호레이쇼 넬슨의 옛 함선 \'빅토리\' 잔해 좌표 입수. G24 ×2 + G27 ×1 소비하여 잔해 깊이 진입.\n넬슨: "트라팔가르의 바람을 다시 맞을 줄은 몰랐소. 그대들의 함대에 함께 한다."',
            en:'Find Nelson\'s old flagship Victory wreckage. G24 ×2 + G27 ×1. Nelson: "I never thought I\'d catch the wind of Trafalgar again. I join your fleet."'},
      objectives:[
        {type:'gather', item:'G24', qty:2, label:{ko:'G24 정보 칩 ×2 좌표 분석', en:'G24 ×2 coord'}},
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
      desc:{ko:'넬슨의 빅토리 함 항해일지 복원 — G25 ×3 소비. 영국 해군 진형 데이터 — 학익진과 결합 시 +15% 명중률.\n넬슨: "트라팔가르에서 적의 전열을 가르던 그 진형이오."',
            en:'G25 ×3 → Victory\'s log → +15% accuracy bonus when combined with crane formation.'},
      objectives:[
        {type:'gather', item:'G25', qty:3, label:{ko:'G25 ×3 일지 복원', en:'G25 ×3 log restore'}},
      ],
      rewardCr:70000, rewardVe:60,
      rewardItems:[],
      rewardFlags:['nelson_formation_data'],
      cutscene_pre:null, cutscene_post:null
    }
  ],

  // ════════════════════════════════════════════════════════════════
  // 행성 20 · P14 크리그 "아이젠클로 요새" (페이즈 4 종착지)
  // 팩션 특산물: G09·G10·G12·R08
  // ════════════════════════════════════════════════════════════════
  P14:[
    {
      id:'p4_q2001', type:'story_quest', category:'main', phase:4,
      ic:'⚔️', npc:'이순신', npcIc:'⚔️', npcKey:'hero01',
      nm:{ko:'아이젠클로 친위대 격파', en:'Eisenklau Guard Down'},
      desc:{ko:'P14 요새 외곽 친위대 7기 격파. 거북선 LGD01 첫 출격.\n이순신: "거북선의 노포가 그들의 방패를 뚫는다."',
            en:'Destroy 7 guards. Geobukseon\'s first sortie.'},
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
      nm:{ko:'요새 코어 폭파', en:'Fort Core Breach'},
      desc:{ko:'요새 중앙 에너지 코어에 R07 ×5 + R04 ×3 삽입 → 폭파 유도. 60초 탈출 후 G12 ×8 회수.',
            en:'R07 ×5 + R04 ×3 → core breach. Escape 60s, loot G12 ×8.'},
      objectives:[
        {type:'gather', item:'R07', qty:5, label:{ko:'R07 ×5 폭파 장약', en:'R07 ×5 charges'}},
      ],
      rewardCr:180000, rewardVe:110,
      rewardItems:[{id:'G12', qty:8}],
      rewardFlags:['p14_core_blown'],
      cutscene_pre:null, cutscene_post:null
    },
    {
      id:'p4_q2003', type:'story_quest', category:'main', phase:4,
      ic:'📜', npc:'가가린', npcIc:'🚀', npcKey:'hero04',
      nm:{ko:'아이젠클로의 비밀 — 도주 좌표', en:'Eisenklau\'s Escape Coord'},
      desc:{ko:'요새 사령실 데이터 회수. R07 ×2 해독.\n결과: "아이젠클로는 P30 제타 레티쿨리 우르사 메이저 본거지로 도주. 우르사가 그를 비호 중."',
            en:'R07 ×2 → "Eisenklau escaped to P30 Ursa Major lair."'},
      objectives:[
        {type:'gather', item:'R07', qty:2, label:{ko:'R07 ×2 해독', en:'R07 ×2'}},
      ],
      rewardCr:120000, rewardVe:100,
      rewardItems:[],
      rewardFlags:['ursa_major_target_known','phase4_complete'],
      cutscene_pre:null, cutscene_post:'p4_ch10c'
    },
    {
      id:'p4_q2004', type:'story_quest', category:'sub', phase:4,
      ic:'🔍', npc:'백구', npcIc:'🐕', npcKey:'baekgu2_advice',
      nm:{ko:'요새 외곽 데이터 코어 회수', en:'Outer Data Core'},
      desc:{ko:'요새 외곽 폐기된 데이터 코어 탐색 3회 — R08 ×3 + G12 ×3 회수 가능.',
            en:'Search outer cores 3× — R08 ×3 + G12 ×3.'},
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
      desc:{ko:'P14 요새 점령 후 광개토가 깃발을 꽂는다. G12 강습 스파이크 ×3 → 정복 의례.\n광개토: "이 요새는 이제 우리 것이다."',
            en:'G12 ×3 → Conquest banner. Gwanggaeto: "This fort is ours now."'},
      objectives:[
        {type:'gather', item:'G12', qty:3, label:{ko:'G12 ×3 의례', en:'G12 ×3 rite'}},
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
    {char:'hero02', name:'장영실', color:'#80e8c0', text:'P15 메카니카 기어월드 — 거북선 제작 베이가 여기 있어. R08 메카니카 합금이 용골 재료야.'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'400년 만에 다시 용골이 서는군.'},
    {char:'hero02', name:'장영실', color:'#80e8c0', text:'장군. 이번에는 우주에서 떠도는 거북선이에요.'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'R08 ×15. 모아오겠다.'},
    {char:'baekgu2_advice', name:'백구', color:'#66ddff', text:'P15 메카니카 R 재료 시장 데이터 입력 완료.'}
  ],

  // ─── CH08-B "용골 완성" (Q16-01 완료) ───
  p4_ch08b:[
    {char:'hero02', name:'장영실', color:'#80e8c0', text:'(용골 주조 완료) ...됐어. 골격은 섰어. 이제 코어와 외피를 입혀야 해.'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'(거대한 용골을 올려다보며) 이걸로 크리그 함대를 뚫는다.'},
    {char:'hero04', name:'가가린', color:'#ffd700', text:'아이젠클로가 들으면 잠을 못 자겠는데.'},
    {char:'baekgu2_smile2', name:'백구', color:'#66ddff', text:'거북선 제작 단계 1/3 완료. 진행률: 33%.'}
  ],

  // ─── CH08-C "광개토와 재회" (Q16-05) ───
  p4_ch08c:[
    {char:'hero03', name:'광개토대왕', color:'#ff9d52', text:'{사령관}. P08에서 한 약속을 지키러 왔소.'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'광개토... 정말 오는군.'},
    {char:'hero03', name:'광개토대왕', color:'#ff9d52', text:'거북선 외피 도면 — 고구려 갑주 양식을 응용한 강화 도면이오. G27 세 장.'},
    {char:'hero02', name:'장영실', color:'#80e8c0', text:'(도면을 살피며) 충분해. 이거 적용하면 외피 강도 두 배는 나와.'},
    {char:'hero03', name:'광개토대왕', color:'#ff9d52', text:'거북선이 완성되면 — 나는 정식으로 그대 깃발 아래 선다. 그때까지는 자유 상인이다.'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'기다리겠다.'}
  ],

  // ─── CH09-A "코어를 잇는다" (P10 도착) ───
  p4_ch09a:[
    {char:'baekgu2_advice', name:'백구', color:'#66ddff', text:'P10 콜드웰 광산 — 수퍼비아 R04 양자합금 주산지. 외피 코팅에 필수예요.'},
    {char:'hero07', name:'테슬라', color:'#ffd700', text:'R04 ×8 + R07 ×10이면 거북선 코어가 점화 단계까지 갈 수 있어. 추진력은 아이젠클로 친위대의 두 배가 나올 거야.'},
    {char:'hero04', name:'가가린', color:'#ffd700', text:'콜드웰은 광부 노조가 강해. 채굴권부터 정리해야 해.'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'G03 ×4 — 그 정도면 충분하지?'}
  ],

  // ─── CH09-B "잠복" (P12 도착) ───
  p4_ch09b:[
    {char:'hero01', name:'이순신', color:'#c0a060', text:'P12 협곡. 좁고 깊다. 임진왜란 명량 해전과 똑같은 지형이야.'},
    {char:'hero08', name:'마르코 폴로', color:'#ffd700', text:'6턴마다 아이젠클로 보급선이 통과해. 매복 한 번에 자원 + 통신 로그를 동시에 얻을 수 있어.'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'학익진. 거북선이 중앙. 호위는 좌우.'},
    {char:'baekgu2_advice', name:'백구', color:'#66ddff', text:'전술 입력 완료. 학익진 ×2.25 데미지 배율 적용 가능.'}
  ],

  // ─── CH09-C "보급선 격파" (Q18-01 완료) ───
  p4_ch09c:[
    {char:'hero01', name:'이순신', color:'#c0a060', text:'... 깨끗하다.'},
    {char:'hero08', name:'마르코 폴로', color:'#ffd700', text:'통신 로그 회수. P14 요새 배치 정보가 통째로 들어있어.'},
    {char:'hero07', name:'테슬라', color:'#ffd700', text:'해독은 내가 하지. R07 세 개면 충분해.'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'아이젠클로가 깜짝 놀라겠군.'}
  ],

  // ─── CH09-D "광개토 합류" (Q18-05 완료) ───
  p4_ch09d:[
    {char:'hero03', name:'광개토대왕', color:'#ff9d52', text:'거북선이 완성됐다. 약속대로 — 나는 이제 그대 깃발 아래 있다.'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'환영하오, 정복자.'},
    {char:'hero03', name:'광개토대왕', color:'#ff9d52', text:'P14 — 아이젠클로의 요새. 정복해야 할 땅이다.'},
    {char:'hero02', name:'장영실', color:'#80e8c0', text:'거북선 LGD01 — 호위 함선 ATT·INT +30% 패시브 활성화.'},
    {char:'baekgu2_smile4', name:'백구', color:'#66ddff', text:'영웅 합류: 광개토대왕(H03). 함대 전투력 대폭 상승.'}
  ],

  // ─── CH10-A "위조의 기술" (P16 도착) ───
  p4_ch10a:[
    {char:'hero08', name:'마르코 폴로', color:'#ffd700', text:'P16 케플러 442b 외곽. 아우레우스 데이터 위조의 본거지지.'},
    {char:'hero08', name:'마르코 폴로', color:'#ffd700', text:'P14 요새 진입 코드 — G24 정보 칩과 G25 데이터 매트릭스로 위조할 수 있어. 내 전공이야.'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'정면 돌파 대신 — 코드로 들어간다.'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'트로이의 목마인 셈인가.'},
    {char:'hero08', name:'마르코 폴로', color:'#ffd700', text:'(웃으며) 거북선의 목마지.'}
  ],

  // ─── CH10-A2 "트라팔가르의 메아리" (Q19-05 시작 · 넬슨 만남) ───
  p4_ch10a2:[
    {char:'baekgu2_advice', name:'백구', color:'#66ddff', text:'케플러 442b 외곽 — 약 200년 전 좌표의 잔해 신호 감지. 영국 해군 식별 코드 \'HMS Victory\'.'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'빅토리... 트라팔가르의 기함.'},
    {char:'hero08', name:'마르코 폴로', color:'#ffd700', text:'영국 넬슨 제독 — 1805년 트라팔가르 해전에서 전사. 그런데 우주에 빅토리가? 이건 — 우주 보존 캡슐이군.'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'G24 정보 칩으로 좌표 분석. 진입한다.'}
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
    {char:'hero01', name:'이순신', color:'#c0a060', text:'P14 — 크리그 아이젠클로의 요새. 외곽 친위대 7기 + 본진 모선.'},
    {char:'hero03', name:'광개토대왕', color:'#ff9d52', text:'전면 돌파. 거북선을 앞세우고 친위대를 갈라낸다.'},
    {char:'hero05', name:'호레이쇼 넬슨', color:'#88ccff', text:'트라팔가르 진형 — 적 전열을 둘로 가르는 정공법. 학익진의 양 날개와 결합 가능하오.'},
    {char:'hero02', name:'장영실', color:'#80e8c0', text:'거북선 화력 시뮬레이션 — 친위대 방어막 1.5초 안에 무력화 가능.'},
    {char:'hero07', name:'테슬라', color:'#ffd700', text:'중앙 코어가 무너지면 요새 전체가 자폭한다. R07 다섯, R04 셋 — 충분해.'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'학익진 — 거북선 중앙. 광개토 우익. 가가린 좌익. 넬슨 후위 진형 분단. 마르코 정보 차단.'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'시작한다.'}
  ],

  // ─── CH10-C "도주 좌표" (Q20-03 완료 · 페이즈 4 종료) ───
  p4_ch10c:[
    {char:'hero04', name:'가가린', color:'#ffd700', text:'사령실 데이터 회수. 아이젠클로는 — 도망쳤어.'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'어디로?'},
    {char:'hero04', name:'가가린', color:'#ffd700', text:'P30 제타 레티쿨리. 우르사 메이저 본거지.'},
    {char:'hero08', name:'마르코 폴로', color:'#ffd700', text:'우르사가 아이젠클로를 비호 중이라는 거잖아. 마지막 일전이 다가왔어.'},
    {char:'hero03', name:'광개토대왕', color:'#ff9d52', text:'우르사 메이저 — 보스다. 직접 잡아야 끝난다.'},
    {char:'hero07', name:'테슬라', color:'#ffd700', text:'P30 도달 전에 — P28 캅테인b 균열을 거쳐야 해. 거기에 아인슈타인이 있어. 보이드 안정화 이론의 권위자야. 우르사의 보이드 방어막을 무력화할 수 있어.'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'아인슈타인 영입 → 보이드 횡단 → 우르사 격파 → 지구 해방. 순서가 정해졌다.'},
    {char:'baekgu1', name:'백구', color:'#66ddff', text:'페이즈 4 완료. 페이즈 5 — 행성 P28~P31 · 아인슈타인 합류 · 보이드 균열 횡단 · 우르사 메이저 격파 · 지구 해방.'}
  ]
};

const PHASE4_CUTSCENES_EN={};

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
