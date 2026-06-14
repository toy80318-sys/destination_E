// ═══════════════════════════════════════════════════════════════════
// DESTINATION EARTH — Phase 1 퀘스트 + 컷씬 데이터 (v2.0 재구성 2026-06-07)
// 출처: Doc/PHASE1_QUEST_CARDS.md v2.0
// 페이즈 1 · 각성 | 행성 P01·P03·P05·P06·P09 | CH01~CH02
// 27개 퀘스트 + 9개 컷씬 (한·영 분기)
// 영웅 합류: 백구(H01) 초기 / 마르코 폴로(H08) P03 / 가가린(H04) P05
// R-재료 사용 없음 — G01~G30 행성 특산물만 사용
// ═══════════════════════════════════════════════════════════════════
(function(){
if(typeof window==='undefined') return;
if(window.PHASE1_QUESTS) return;

// ─── Phase 1 퀘스트 데이터 ───
const PHASE1_QUESTS={

  // ════════════════════════════════════════════════════════════════
  // 행성 1 · P01 수퍼비아 "프록시마 격납고"
  // 팩션 특산물: G01·G02·G22
  // ════════════════════════════════════════════════════════════════
  P01:[
    // ── Q01-01 첫 발걸음 (메인) ──
    {
      id:'p1_q0101', type:'story_quest', category:'main', phase:1,
      ic:'🚀', npc:'백구', npcIc:'🐕', npcKey:'baekgu1',
      nm:{ko:'첫 발걸음', en:'First Steps'},
      desc:{ko:'100년 만에 깨어났다. 에너지 잔량 7%. 격납고 곳곳 고철 프레임을 수거해 {함선} 시스템을 재부팅하라.\n백구: "G01 3개면 연료전지 교체하고도 크레딧 남아요."',
            en:'Awakened after 100 years. Energy at 7%. Collect Scrap Frames around the hangar to reboot {ship} systems.'},
      objectives:[
        {type:'gather', item:'G01', qty:3, label:{ko:'고철 프레임 ×3 수거', en:'Collect Scrap Frame ×3'}},
      ],
      rewardCr:3000, rewardVe:30,
      rewardItems:[{id:'G02', qty:1}],
      rewardFlags:['awakening_complete','p1_planet_unlocked_P03'],
      cutscene_pre:'p1_ch01a', cutscene_post:'p1_ch01b'
    },
    // ── Q01-02 격납고 잔해 탐색 (서브) ──
    {
      id:'p1_q0102', type:'story_quest', category:'sub', phase:1,
      ic:'🔍', npc:'백구', npcIc:'🐕', npcKey:'baekgu2_advice',
      nm:{ko:'격납고 잔해 탐색', en:'Hangar Wreck Search'},
      desc:{ko:'백구: "격납고 폐기 구역에 100년 된 화물들이 있어요. 탐색해보면 뭔가 나올 거예요."\n잔해 탐색 3회 실시. 70% 자원 / 30% 소형 해적 조우.',
            en:'Search the hangar scrap zone 3 times. 70% resources / 30% small pirate encounter.'},
      objectives:[
        {type:'explore', target:'hangar_wreck', qty:3, label:{ko:'잔해 탐색 ×3', en:'Wreck search ×3'}},
      ],
      rewardCr:2000, rewardVe:25,
      rewardItems:[{id:'G01', qty:1},{id:'G02', qty:1}],
      rewardFlags:['hangar_searched'],
      cutscene_pre:null, cutscene_post:null
    },
    // ── Q01-03 함선 긴급 수리 (서브) ──
    {
      id:'p1_q0103', type:'story_quest', category:'sub', phase:1,
      ic:'🔧', npc:'백구', npcIc:'🐕', npcKey:'baekgu1',
      nm:{ko:'함선 긴급 수리', en:'Emergency Repairs'},
      desc:{ko:'100년 방치로 {함선} 외장 손상. 격납고 자가 정비 구역에서 고철 프레임 ×1 소비 → HP 30% 임시 수리.\n백구: "P03 교역소에 공인 정비소가 있어요. 거기서 제대로 수리하세요."',
            en:'{ship} hull damaged from 100 years of neglect. Use Scrap Frame ×1 for self-repair → HP +30%.'},
      objectives:[
        {type:'gather', item:'G01', qty:1, label:{ko:'고철 프레임 ×1 소비', en:'Consume Scrap Frame ×1'}},
      ],
      rewardCr:1000, rewardVe:20,
      rewardItems:[],
      rewardFlags:['ship_repaired_basic'],
      cutscene_pre:null, cutscene_post:null
    },
    // ── Q01-M 백구의 기억 (히든) ──
    {
      id:'p1_q01m', type:'story_quest', category:'hidden', phase:1,
      ic:'🎁', npc:'백구', npcIc:'🐕', npcKey:'baekgu2_think',
      nm:{ko:'백구의 기억', en:'Baekgu\'s Memory'},
      desc:{ko:'격납고 깊숙한 구석, 먼지 쌓인 화물 상자. 백구가 100년 전부터 보관하고 있었다. 안에는 {사령관}의 유품 — 수퍼비아 귀족 향수 한 병.',
            en:'A dusty crate deep in the hangar. Baekgu kept it for 100 years. Inside: {commander}\'s memento — a Superbia Noble Perfume.'},
      objectives:[
        {type:'explore', target:'hangar_box', qty:1, label:{ko:'격납고 유품 상자 발견', en:'Find the memorial crate'}},
      ],
      rewardCr:1500, rewardVe:15,
      rewardItems:[{id:'G22', qty:1}],
      rewardFlags:['baekgu_memory'],
      cutscene_pre:null, cutscene_post:null
    }
  ],

  // ════════════════════════════════════════════════════════════════
  // 행성 2 · P03 수퍼비아 "볼프 교역소"
  // 팩션 특산물: G01·G02·G03·G05·G22
  // ════════════════════════════════════════════════════════════════
  P03:[
    // ── Q02-01 첫 거래 (메인) ──
    {
      id:'p1_q0201', type:'story_quest', category:'main', phase:1,
      ic:'💰', npc:'백구', npcIc:'🐕', npcKey:'baekgu1',
      nm:{ko:'첫 거래', en:'First Trade'},
      desc:{ko:'아오리에게 고철 프레임 ×3 판매(+2,400₡) → 자금 확보. 수퍼비아 중력수정 ×3 매입(개당 1,800₡) — 아우레우스에서 40% 더 비싸게 판매 예정.',
            en:'Sell Scrap Frame ×3 to Aori (+2,400₡), then buy Superbia Gravity Crystal ×3 (1,800₡ each) — will sell 40% higher at Aureus.'},
      objectives:[
        {type:'gather', item:'G05', qty:3, label:{ko:'수퍼비아 중력수정 ×3 확보', en:'Secure Gravity Crystal ×3'}},
      ],
      rewardCr:5000, rewardVe:40,
      rewardItems:[{id:'G05', qty:3}],
      rewardFlags:['first_trade_done'],
      cutscene_pre:'p1_ch01c', cutscene_post:null
    },
    // ── Q02-02 마르코 폴로 영입 (서브) ──
    {
      id:'p1_q0202', type:'story_quest', category:'sub', phase:1,
      ic:'🍺', npc:'백구', npcIc:'🐕', npcKey:'baekgu1',
      nm:{ko:'마르코 폴로 영입', en:'Recruit Marco Polo'},
      desc:{ko:'볼프 주점 "오리온" 방문. G03 오리온 위스키 ×2 소비(주점 사교 비용) → 정보 브로커 마르코 폴로 발견. 정예 모집 1,500₡ 필요.',
            en:'Visit Wolf Tavern "Orion". Consume G03 Orion Whisky ×2 for socializing. Marco Polo recruitment costs 1,500₡.'},
      objectives:[
        {type:'gather', item:'G03', qty:2, label:{ko:'오리온 위스키 ×2 소비', en:'Consume Orion Whisky ×2'}},
      ],
      rewardCr:3000, rewardVe:30,
      rewardItems:[],
      rewardFlags:['marco_polo_recruited'],
      cutscene_pre:null, cutscene_post:'p1_marco_join'
    },
    // ── Q02-03 볼프 Ring 해적 소탕 (서브 전투) ──
    {
      id:'p1_q0203', type:'story_quest', category:'sub', phase:1,
      ic:'⚔️', npc:'볼프 자경단', npcIc:'🛡️', npcKey:'combat_F01',
      nm:{ko:'볼프 Ring 해적 소탕', en:'Wolf Ring Pirate Cleanup'},
      desc:{ko:'Ring 1 주변 소형 해적 "스크랩 갱" 현상 수배 — 1기 격파당 2,000₡ 지급. 2기 격파 → G01 ×1 노획.',
            en:'Bounty on Ring 1 "Scrap Gang" — 2,000₡ per kill. Defeat 2 → loot G01 ×1.'},
      objectives:[
        {type:'combat', target:'scrap_gang', qty:2, label:{ko:'스크랩 갱 ×2 격파', en:'Defeat Scrap Gang ×2'}},
      ],
      rewardCr:4000, rewardVe:35,
      rewardItems:[{id:'G01', qty:1}],
      rewardFlags:['scrap_gang_down'],
      cutscene_pre:null, cutscene_post:null
    },
    // ── Q02-04 소형 추진 파츠 업그레이드 (서브 함선구매) ──
    {
      id:'p1_q0204', type:'story_quest', category:'sub', phase:1,
      ic:'🚀', npc:'마르코 폴로', npcIc:'🗺️', npcKey:'hero08',
      nm:{ko:'추진 파츠 업그레이드', en:'Thruster Upgrade'},
      desc:{ko:'마르코: "에리다니까지 가려면 함선이 좀 더 빨라야 해. P03 도크에서 추진 파츠 달자."\n소형 추진 파츠 구매(20,000₡) → 파츠 슬롯 +1 장착 → 기동력 +10%.',
            en:'Marco: "We need speed to reach Eridani." Buy a thruster part (20,000₡) for +10% mobility.'},
      objectives:[
        {type:'explore', target:'thruster_install', qty:1, label:{ko:'추진 파츠 장착', en:'Install thruster'}},
      ],
      rewardCr:2000, rewardVe:25,
      rewardItems:[],
      rewardFlags:['ship_upgraded_p03'],
      cutscene_pre:null, cutscene_post:null
    },
    // ── Q02-05 전투 후 함선 수리 (서브) ──
    {
      id:'p1_q0205', type:'story_quest', category:'sub', phase:1,
      ic:'🔧', npc:'백구', npcIc:'🐕', npcKey:'baekgu1',
      nm:{ko:'바나드 프라임 공인 정비소 수리', en:'Barnard Prime Repair Shop'},
      desc:{ko:'해적 소탕 후 {함선} 외장 파손. 바나드 프라임 공인 정비소 수리. 고철 프레임 ×1 함께 제출 → 수리비 10% 할인.',
            en:'Repair {ship} at the Barnard Prime certified shop. Submit Scrap Frame ×1 for 10% discount.'},
      objectives:[
        {type:'gather', item:'G01', qty:1, label:{ko:'고철 프레임 ×1 정비소 제출', en:'Submit Scrap Frame ×1'}},
      ],
      rewardCr:1500, rewardVe:20,
      rewardItems:[],
      rewardFlags:['p03_repaired'],
      cutscene_pre:null, cutscene_post:null
    },
    // ── Q02-M 이순신의 소문 + 거북선 설계도 단편 1 (이벤트) ──
    {
      id:'p1_q02m', type:'story_quest', category:'hidden', phase:1,
      ic:'🗣️', npc:'볼프 노인', npcIc:'👴', npcKey:'gather_F01',
      nm:{ko:'이순신의 소문 · 거북선의 흔적', en:'Rumors of Yi Sun-sin · Geobukseon Trace'},
      desc:{ko:'마르코: "오리온 주점 노인한테 위스키 한 잔 더 사줘. 이순신 얘기 꺼내면 뭔가 알 것 같아."\nG03 ×1 추가 소비 → 노인 제보: 100년 전 이순신이 크리그에 저항하다 캡슐에 봉인됐다. 아우레우스 에리다니 쪽에서 그 신호.\n노인이 닳은 데이터 칩 한 조각을 건넨다 — 거북선 설계도 단편 1/3.',
            en:'Marco: "Buy the old man one more drink." Consume G03 ×1 → tip about Yi Sun-sin\'s capsule. Old man hands over a Geobukseon blueprint fragment 1/3.'},
      objectives:[
        {type:'gather', item:'G03', qty:1, label:{ko:'오리온 위스키 ×1 노인에게 증정', en:'Give Orion Whisky ×1'}},
      ],
      rewardCr:2500, rewardVe:30,
      rewardItems:[{id:'turtleBP1', qty:1}],
      rewardFlags:['joseon_whisper','p1_planet_unlocked_P05','turtle_bp_1'],
      cutscene_pre:null, cutscene_post:'p1_turtle1'
    }
  ],

  // ════════════════════════════════════════════════════════════════
  // 행성 3 · P05 아우레우스 "에리다니 항구"
  // 팩션 특산물: G04·G06·G23·G24
  // ════════════════════════════════════════════════════════════════
  P05:[
    // ── Q03-01 아우레우스 입항 허가 (메인) ──
    {
      id:'p1_q0301', type:'story_quest', category:'main', phase:1,
      ic:'🛂', npc:'아우레우스 세관', npcIc:'🏛️', npcKey:'delivery_F02',
      nm:{ko:'아우레우스 입항 허가', en:'Aureus Entry Permit'},
      desc:{ko:'세관: "수퍼비아 출신이면 G05 중력수정 세관 신고 필수. 미신고 시 전량 몰수."\nG05 ×2 자진 신고 → 아우레우스 시세(개당 2,520₡)로 자진 판매 → 입항 허가.',
            en:'Customs: "Declare G05 Gravity Crystal or lose all." Declare G05 ×2 → auto-sell at 2,520₡ each.'},
      objectives:[
        {type:'gather', item:'G05', qty:2, label:{ko:'수퍼비아 중력수정 ×2 자진 신고', en:'Declare Superbia Gravity Crystal ×2'}},
      ],
      rewardCr:5040, rewardVe:35,
      rewardItems:[{id:'G23', qty:1}],
      rewardFlags:['aurelius_p05_landed'],
      cutscene_pre:'p1_ch02a', cutscene_post:null
    },
    // ── Q03-02 가가린 구출 (메인 전투) ──
    {
      id:'p1_q0302', type:'story_quest', category:'main', phase:1,
      ic:'🆘', npc:'{사령관}', npcIc:'🧑‍🚀', npcKey:'commander',
      nm:{ko:'가가린 구출', en:'Rescue Gagarin'},
      desc:{ko:'항구 외곽 해적선 3기 격파 → 탐사선 "VOSTOK" 구출. 노획: G01 ×1 · G24 아우레우스 정보 칩 ×1 (가가린의 데이터 칩).',
            en:'Defeat 3 pirates outside the harbor → rescue VOSTOK. Loot: Scrap Frame ×1, Aureus Information Chip ×1.'},
      objectives:[
        {type:'combat', target:'pirate_small', qty:3, label:{ko:'해적선 ×3 격파', en:'Defeat pirates ×3'}},
      ],
      rewardCr:8000, rewardVe:50,
      rewardItems:[{id:'G01', qty:1},{id:'G24', qty:1}],
      rewardFlags:['gagarin_rescued'],
      cutscene_pre:null, cutscene_post:null
    },
    // ── Q03-03 전투 후 함선 수리 (서브) ──
    {
      id:'p1_q0303', type:'story_quest', category:'sub', phase:1,
      ic:'🔧', npc:'백구', npcIc:'🐕', npcKey:'baekgu1',
      nm:{ko:'티가든 금융 b 공인 정비소', en:'Teegarden Financial b Repair Shop'},
      desc:{ko:'해적 3기 격파로 {함선} 외장 손상. 티가든 금융 b 공인 정비소 수리.\n가가린: "내 배도 망가졌으니까 같이 가도 돼? 데이터 칩 분석도 도와줄게."',
            en:'Repair {ship} at Teegarden Financial b. Gagarin: "Mine\'s wrecked too — can I come along?"'},
      objectives:[
        {type:'explore', target:'p05_repair', qty:1, label:{ko:'정비소 수리 완료', en:'Complete repair'}},
      ],
      rewardCr:1500, rewardVe:20,
      rewardItems:[],
      rewardFlags:['p05_repaired'],
      cutscene_pre:null, cutscene_post:null
    },
    // ── Q03-04 함선 강화 — 아우레우스 방어 파츠 (서브) ──
    {
      id:'p1_q0304', type:'story_quest', category:'sub', phase:1,
      ic:'🛡️', npc:'마르코 폴로', npcIc:'🗺️', npcKey:'hero08',
      nm:{ko:'아우레우스 방어 파츠 강화', en:'Aureus Defense Part'},
      desc:{ko:'마르코: "P05 파츠샵에 좋은 게 있어. G06 LHS 크리스탈이 있으면 보조 결제 돼서 싸게 살 수 있어."\nG06 ×1 + 15,000₡ → 아우레우스 방어 파츠 장착 → 방어력 +15%.',
            en:'Marco: "Pay with G06 for a discount." G06 ×1 + 15,000₡ → defense part (+15% defense).'},
      objectives:[
        {type:'gather', item:'G06', qty:1, label:{ko:'LHS 크리스탈 ×1 보조 결제', en:'Use LHS Crystal ×1 as payment'}},
      ],
      rewardCr:2500, rewardVe:30,
      rewardItems:[],
      rewardFlags:['ship_enhanced_p05'],
      cutscene_pre:null, cutscene_post:null
    },
    // ── Q03-05 에리다니 소형 경매 참여 (서브) ──
    {
      id:'p1_q0305', type:'story_quest', category:'sub', phase:1,
      ic:'🏛️', npc:'가가린', npcIc:'🚀', npcKey:'hero04',
      nm:{ko:'에리다니 경매 참여', en:'Eridani Auction'},
      desc:{ko:'가가린: "저 경매소 — 아우레우스 소형 파츠 경매야. 한 번 참여해봐."\n에리다니 소형 경매 참여 — 최저 5,000₡ ~ 즉시구매 40,000₡. 낙찰 시 G23 ×2 또는 소형 파츠 ×1.',
            en:'Gagarin: "Try the Eridani auction." Min bid 5,000₡ ~ buyout 40,000₡. Win → G23 ×2 or small part.'},
      objectives:[
        {type:'explore', target:'p05_auction', qty:1, label:{ko:'경매 1회 참여', en:'Participate ×1'}},
      ],
      rewardCr:3000, rewardVe:25,
      rewardItems:[{id:'G23', qty:2}],
      rewardFlags:['p05_auction_done'],
      cutscene_pre:null, cutscene_post:null
    },
    // ── Q03-M 가가린 합류 & 이순신 단서 + 거북선 설계도 단편 2 (이벤트) ──
    {
      id:'p1_q03m', type:'story_quest', category:'hidden', phase:1,
      ic:'⭐', npc:'가가린', npcIc:'🚀', npcKey:'hero04',
      nm:{ko:'가가린 합류 & 거북선 외피', en:'Gagarin Joins · Geobukseon Hull'},
      desc:{ko:'가가린: "내 데이터 칩 돌려줘서 고마워. 보답으로 같이 갈게."\nG24 아우레우스 정보 칩 ×1 소비 → 분석 결과: P06 LHS 광산 방향에서 이순신 신호 패턴 탐지.\n해독 데이터 안에 거북선 설계도 두 번째 단편이 들어 있다 — 외피 가시 돌기 구조도 2/3.',
            en:'Gagarin joins your crew. Consume Aureus Information Chip ×1 → Nexus Prime LHS Mine signal detected. Decoded data includes Geobukseon hull plate fragment 2/3.'},
      objectives:[
        {type:'gather', item:'G24', qty:1, label:{ko:'아우레우스 정보 칩 ×1 데이터 해독', en:'Decode Aureus Information Chip ×1'}},
      ],
      rewardCr:5000, rewardVe:40,
      rewardItems:[{id:'turtleBP2', qty:1}],
      rewardFlags:['gagarin_joined','p1_planet_unlocked_P06','turtle_bp_2'],
      cutscene_pre:null, cutscene_post:'p1_gagarin_join'
    }
  ],

  // ════════════════════════════════════════════════════════════════
  // 행성 4 · P06 아우레우스 "LHS 광산 지대"
  // 팩션 특산물: G04·G06·G23
  // ════════════════════════════════════════════════════════════════
  P06:[
    // ── Q04-01 LHS 광산 착지 허가 (메인) ──
    {
      id:'p1_q0401', type:'story_quest', category:'main', phase:1,
      ic:'🛬', npc:'광부 대표 린다', npcIc:'⛏️', npcKey:'explore_F02',
      nm:{ko:'LHS 광산 착지 허가', en:'LHS Mine Landing Permit'},
      desc:{ko:'광산 관리소: 입장 채굴세 아우레우스 금괴 ×1 납부 → 착지 허가.\n린다: "크리그 해적단이 3주째예요. 뭔가 파고 있어요."\nG06 LHS 크리스탈 ×2 지급(관리소 보답).',
            en:'Pay Aureus Gold Ingot ×1 as landing tax. Linda: "Kriegs been here 3 weeks. They\'re digging for something."'},
      objectives:[
        {type:'gather', item:'G04', qty:1, label:{ko:'아우레우스 금괴 ×1 납부', en:'Pay Aureus Gold Ingot ×1'}},
      ],
      rewardCr:2000, rewardVe:25,
      rewardItems:[{id:'G06', qty:2}],
      rewardFlags:['lhs_mine_landed'],
      cutscene_pre:'p1_ch02b', cutscene_post:null
    },
    // ── Q04-02 크리그 해적단 소탕 (메인 전투) ──
    {
      id:'p1_q0402', type:'story_quest', category:'main', phase:1,
      ic:'⚔️', npc:'광부 대표 린다', npcIc:'⛏️', npcKey:'explore_F02',
      nm:{ko:'크리그 해적단 소탕', en:'Krieg Pirate Cleanup'},
      desc:{ko:'크리그 소형 3기 + 중형 지휘선 1기 격파 → 광부 억류 해제.\n린다: "정말 감사합니다. 저희 제작소 자유롭게 쓰세요."\n노획: G04 ×1 · G06 ×2 · G10 크리그 무기 원석 ×1',
            en:'Defeat 3 Krieg fighters + 1 command ship. Linda: "Use our workshop freely."'},
      objectives:[
        {type:'combat', target:'krieg_pirate', qty:4, label:{ko:'크리그 ×4 격파(소형 3 + 중형 1)', en:'Defeat Krieg ×4 (3 small + 1 mid)'}},
      ],
      rewardCr:12000, rewardVe:60,
      rewardItems:[{id:'G04', qty:1},{id:'G06', qty:2},{id:'G10', qty:1}],
      rewardFlags:['lhs_pirates_cleared'],
      cutscene_pre:null, cutscene_post:null
    },
    // ── Q04-03 강화 선체 코팅 제작 (서브) ──
    {
      id:'p1_q0403', type:'story_quest', category:'sub', phase:1,
      ic:'🛒', npc:'가가린', npcIc:'🚀', npcKey:'hero04',
      nm:{ko:'강화 선체 코팅 제작', en:'Craft Hull Coating'},
      desc:{ko:'가가린: "제작소 장비 써봐. G01 ×2 + G06 ×1 조합하면 선체 코팅 만들 수 있어."\n강화 선체 코팅 제작 → 장착 시 방어력 +8%.',
            en:'Craft Reinforced Hull Coating: Scrap Frame ×2 + LHS Crystal ×1 → +8% defense.'},
      objectives:[
        {type:'gather', item:'G01', qty:2, label:{ko:'고철 프레임 ×2 소비', en:'Consume Scrap Frame ×2'}},
        {type:'gather', item:'G06', qty:1, label:{ko:'LHS 크리스탈 ×1 소비', en:'Consume LHS Crystal ×1'}},
      ],
      rewardCr:3500, rewardVe:30,
      rewardItems:[{id:'armorCoating1', qty:1}],
      rewardFlags:['item_crafted_p06'],
      cutscene_pre:null, cutscene_post:null
    },
    // ── Q04-04 LHS 광산 행성 투자 (서브) ──
    {
      id:'p1_q0404', type:'story_quest', category:'sub', phase:1,
      ic:'📈', npc:'마르코 폴로', npcIc:'🗺️', npcKey:'hero08',
      nm:{ko:'LHS 광산 행성 투자', en:'LHS Mine Investment'},
      desc:{ko:'마르코: "광산 되찾았으니 투자 딱이야. 크리그 없으니 수익 바로 나."\nP06 커머스 레벨 1 투자(~18,000₡) → 매 턴 수입 +20% 증가.',
            en:'Marco: "Mine\'s free now. Invest." P06 commerce L1 invest (~18,000₡) → +20% revenue.'},
      objectives:[
        {type:'explore', target:'p06_commerce', qty:1, label:{ko:'넥서스 프라임 커머스 레벨 1 투자', en:'Invest commerce L1'}},
      ],
      rewardCr:3000, rewardVe:25,
      rewardItems:[],
      rewardFlags:['p06_invested'],
      cutscene_pre:null, cutscene_post:null
    },
    // ── Q04-05 광산 폐기 구역 잔해 탐색 (서브) ──
    {
      id:'p1_q0405', type:'story_quest', category:'sub', phase:1,
      ic:'🔍', npc:'가가린', npcIc:'🚀', npcKey:'hero04',
      nm:{ko:'광산 폐기 구역 탐색', en:'Mine Wreck Search'},
      desc:{ko:'린다: "크리그가 파고 있던 구역 — 거기 더 있을 수 있어요."\nLHS 광산 폐기 구역 잔해 탐색 2회. 70% 자원 / 30% 크리그 잔존 세력.',
            en:'Search the mine wreck zone 2 times. 70% resources / 30% Krieg remnants.'},
      objectives:[
        {type:'explore', target:'p06_wreck', qty:2, label:{ko:'잔해 탐색 ×2', en:'Wreck search ×2'}},
      ],
      rewardCr:3000, rewardVe:25,
      rewardItems:[{id:'G06', qty:1},{id:'G10', qty:1}],
      rewardFlags:['p06_wreck_searched'],
      cutscene_pre:null, cutscene_post:null
    },
    // ── Q04-M 이순신 캡슐 신호 중계기 발견 (이벤트) ──
    {
      id:'p1_q04m', type:'story_quest', category:'hidden', phase:1,
      ic:'📡', npc:'가가린', npcIc:'🚀', npcKey:'hero04',
      nm:{ko:'이순신 신호 중계기 발견', en:'Yi Sun-sin Relay Found'},
      desc:{ko:'크리그가 파던 구역 깊숙한 곳에서 오래된 신호 중계기 발견. 아우레우스 태양 화폐 ×2 소비(해독 장비 대여비) → 중계기 복원.\n가가린: "신호 패턴... P09 갈릴레오 전초기지 방향에서 증폭된 거야."',
            en:'Found an old signal relay. Consume Aureus Solar Coin ×2 to restore → signal points to TRAPPIST-1e Galileo outpost.'},
      objectives:[
        {type:'gather', item:'G23', qty:2, label:{ko:'아우레우스 태양 화폐 ×2 해독 장비 대여비', en:'Spend Aureus Solar Coin ×2 for decoder'}},
      ],
      rewardCr:5000, rewardVe:40,
      rewardItems:[],
      rewardFlags:['joseon_signal_fragment','p1_planet_unlocked_P09'],
      cutscene_pre:null, cutscene_post:null
    }
  ],

  // ════════════════════════════════════════════════════════════════
  // 행성 5 · P09 메카니카 "갈릴레오 전초기지"
  // 팩션 특산물: G07·G08·G09·G25
  // ════════════════════════════════════════════════════════════════
  P09:[
    // ── Q05-01 갈릴레오 기지 착지 (메인) ──
    {
      id:'p1_q0501', type:'story_quest', category:'main', phase:1,
      ic:'🛬', npc:'기지 정비원', npcIc:'🔧', npcKey:'explore_F03',
      nm:{ko:'갈릴레오 기지 착지', en:'Galileo Base Landing'},
      desc:{ko:'메카니카 기지 통행세: 수퍼비아 중력수정 ×1 소비(수퍼비아 무역품 — 메카니카에서 희귀) → 착지 허가.\n정비원: "무법자 해적단이 2주째야. 안테나 접근 못 하고 있어요."\nG07 분열 배터리 ×2 지급(기지 사례).',
            en:'Pay Superbia Gravity Crystal ×1 as transit. Mechanic: "Outlaws blocked the antenna for 2 weeks." G07 ×2 reward.'},
      objectives:[
        {type:'gather', item:'G05', qty:1, label:{ko:'수퍼비아 중력수정 ×1 통행세 납부', en:'Pay Superbia Gravity Crystal ×1 transit'}},
      ],
      rewardCr:2000, rewardVe:20,
      rewardItems:[{id:'G07', qty:2}],
      rewardFlags:['galileo_landed'],
      cutscene_pre:'p1_ch02c', cutscene_post:null
    },
    // ── Q05-02 무법자 해적단 소탕 (메인 전투) ──
    {
      id:'p1_q0502', type:'story_quest', category:'main', phase:1,
      ic:'⚔️', npc:'기지 정비원', npcIc:'🔧', npcKey:'explore_F03',
      nm:{ko:'무법자 해적단 소탕', en:'Outlaw Pirate Cleanup'},
      desc:{ko:'무법자 해적 소형 2기 + 지휘선 1기 격파 → 안테나 구역 접근 확보.\n가가린: "이제 안테나 쓸 수 있어."\n노획: G08 메카니카 광학 렌즈 ×1 · G25 메카니카 자동화 부품 ×1',
            en:'Defeat 2 outlaw fighters + 1 command ship → antenna access. Gagarin: "Now we can use it."'},
      objectives:[
        {type:'combat', target:'outlaw_pirate', qty:3, label:{ko:'무법자 ×3 격파(소형 2 + 지휘선 1)', en:'Defeat Outlaws ×3'}},
      ],
      rewardCr:10000, rewardVe:55,
      rewardItems:[{id:'G08', qty:1},{id:'G25', qty:1}],
      rewardFlags:['galileo_pirates_cleared'],
      cutscene_pre:null, cutscene_post:null
    },
    // ── Q05-03 소형 정찰 드론 모듈 제작 (서브 함선 제작) ──
    {
      id:'p1_q0503', type:'story_quest', category:'sub', phase:1,
      ic:'🛠️', npc:'가가린', npcIc:'🚀', npcKey:'hero04',
      nm:{ko:'정찰 드론 모듈 제작', en:'Scout Drone Module'},
      desc:{ko:'가가린: "P19 치크스 영역은 적대야. 정찰 드론이 있으면 유리해."\nG01 ×3 + G07 ×1 소비 → 소형 정찰 드론 모듈 제작.\n효과: 잔해 탐색 탐지 범위 +10% · 적 선제 감지 +1턴.',
            en:'Gagarin: "Cygnus is hostile. A drone helps." G01 ×3 + G07 ×1 → +10% detection, +1 turn pre-emption.'},
      objectives:[
        {type:'gather', item:'G01', qty:3, label:{ko:'고철 프레임 ×3 소비', en:'Consume Scrap Frame ×3'}},
        {type:'gather', item:'G07', qty:1, label:{ko:'분열 배터리 ×1 소비', en:'Consume Fission Battery ×1'}},
      ],
      rewardCr:3000, rewardVe:35,
      rewardItems:[{id:'scoutDrone1', qty:1}],
      rewardFlags:['drone_crafted'],
      cutscene_pre:null, cutscene_post:null
    },
    // ── Q05-04 기지 외곽 잔해 탐색 (서브) ──
    {
      id:'p1_q0504', type:'story_quest', category:'sub', phase:1,
      ic:'🔍', npc:'마르코 폴로', npcIc:'🗺️', npcKey:'hero08',
      nm:{ko:'기지 외곽 잔해 탐색', en:'Base Outskirt Wreck'},
      desc:{ko:'마르코: "메카니카 폐기 파츠 — 팔면 돈 돼. 아니면 강화에 써."\n기지 외곽 폐기 구역 잔해 탐색 2회 실시.',
            en:'Marco: "Mech scrap sells well." Wreck search ×2 at base outskirts.'},
      objectives:[
        {type:'explore', target:'p09_wreck', qty:2, label:{ko:'잔해 탐색 ×2', en:'Wreck search ×2'}},
      ],
      rewardCr:2500, rewardVe:20,
      rewardItems:[{id:'G08', qty:1},{id:'G25', qty:1}],
      rewardFlags:['p09_wreck_searched'],
      cutscene_pre:null, cutscene_post:null
    },
    // ── Q05-M 이순신 캡슐 좌표 확정 + 거북선 설계도 단편 3 (이벤트 · 페이즈 1 종료) ──
    {
      id:'p1_q05m', type:'story_quest', category:'hidden', phase:1,
      ic:'🎯', npc:'가가린', npcIc:'🚀', npcKey:'hero04',
      nm:{ko:'이순신 좌표 확정 · 거북선 코어', en:'Yi Sun-sin Coordinates · Geobukseon Core'},
      desc:{ko:'안테나 신호 증폭 가동 → 이순신 캡슐 완전 좌표 확정.\n가가린: "P19. 치크스 Ring 1이야."\n이순신(통신): "...나는 이순신. 크리그를 막아야... P19... 제발..."\n안테나 데이터 스트림에서 거북선 설계도 마지막 단편 — 활성 코어 격자 도면 3/3 확보. 페이즈 1 종료 시 3단편 통합 완성도 확인.',
            en:'Coordinates confirmed. Last Geobukseon fragment — Active Core blueprint 3/3 — recovered from antenna stream.'},
      objectives:[
        {type:'explore', target:'antenna_amp', qty:1, label:{ko:'안테나 신호 증폭 가동', en:'Activate antenna amp'}},
      ],
      rewardCr:8000, rewardVe:60,
      rewardItems:[{id:'turtleBP3', qty:1}],
      rewardFlags:['joseon_capsule_located','phase1_complete','turtle_bp_3','turtle_bp_complete'],
      cutscene_pre:null, cutscene_post:'p1_ch02d'
    }
  ]
};

// ═══════════════════════════════════════════════════════════════════
// Phase 1 컷씬 (한국어)
// 색상: 백구 #66ddff · 사령관 #00f3ff · NPC 일반 #a8b3c0
//      바텐더/오리드 #d4a574 · 정보 중개인 #a78bfa
//      크리그/해적 #ef4444 · 시스템 #38bdf8 · 영웅 #ffd700
// ═══════════════════════════════════════════════════════════════════
const PHASE1_CUTSCENES_KO={

  // ─── CH01-A "100년의 잠" (P01 시작) ───
  p1_ch01a:[
    {char:'baekgu1', name:'백구', color:'#66ddff', text:'{사령관}. 기상하세요. 에너지 잔량 7%. 지금 일어나지 않으면 다음은 없습니다.'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'...얼마나 됐어?'},
    {char:'baekgu1', name:'백구', color:'#66ddff', text:'100년 3개월 12일입니다. 지구는 아직 봉쇄 중이에요.'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'지구가... 우르사 메이저가 아직도 봉쇄 중이야?'},  // 수정 2026-06-11: 지구 봉쇄 주체는 치크스(우르사 메이저) — GDD PHASE1_QUEST_CARDS 원문
    {char:'baekgu1', name:'백구', color:'#66ddff', text:'떠날 때와 달라진 게 없어요. 오히려 더 조여졌습니다.'},
    {char:'baekgu1', name:'백구', color:'#66ddff', text:'감상은 나중에 하세요. 일단 살아야 합니다. 격납고 곳곳에 고철 프레임이 있어요. 수거하면 수리비랑 연료값은 나와요.'}
  ],

    // ─── CH01-B "볼프로 간다" (P01 outro · Q01-01 완료 후) ───
  p1_ch01b:[
    {char:'baekgu1', name:'백구', color:'#66ddff', text:'볼프 교역소. 수퍼비아 Ring 1 무역 정거장이에요. 아직 운영 중이에요.'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'사람들이 있어?'},
    {char:'baekgu1', name:'백구', color:'#66ddff', text:'있습니다. 수퍼비아 중력수정 — 여기선 시세가 낮아요. 아우레우스 쪽에선 40% 비싸게 팔 수 있어요. 첫 자금 만들기에 좋아요.'}
  ],

    // ─── CH01-C "첫 교역소" (P03 도착) ───
  p1_ch01c:[
    {char:'aori', name:'아오리', color:'#d4a574', text:'프록시마 b에서 왔소? 거기 사람이 아직 있었어?'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'좀 오래 잠들어 있었습니다.'},
    {char:'aori', name:'아오리', color:'#d4a574', text:'허. 뭘 팔 거요?'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'고철이요.'}
  ],

    // ─── 거북선 설계도 단편 1/3 발견 (P03 Q02-M 직후) ───
  p1_turtle1:[
    {char:'wolf_elder', name:'볼프 노인', color:'#a8b3c0', text:'(낡은 데이터 칩을 건네며) 이것도 가져가요. 100년 전 어떤 조선인이 두고 갔는데, "거북선"이라고 했어요.'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'거북선...?'},
    {char:'baekgu1', name:'백구', color:'#66ddff', text:'데이터 분석 — 함선 설계도 단편 1/3. 골격 구조도. 나머지 두 개를 더 찾으면 복원 가능합니다.'}
  ],

  // ─── 마르코 폴로 영입 ───
  p1_marco_join:[
    {char:'hero08', name:'마르코 폴로', color:'#ffd700', text:'이순신이요? 그 이름 오래간만에 듣네. 에리다니 쪽 노인네들이 그 신호를 잡았다고 했거든.'},
    {char:'hero08', name:'마르코 폴로', color:'#ffd700', text:'우리 한 팀 하자. 정보는 내가 맡지.'},
    {char:'baekgu1', name:'백구', color:'#66ddff', text:'마르코 폴로 — 정보 브로커 등록. 신뢰도 추적 시작합니다.'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'잘 부탁해.'}
  ],

  // ─── CH02-A "황금의 항구" (P05 도착) ───
  p1_ch02a:[
    {char:'baekgu1', name:'백구', color:'#66ddff', text:'아우레우스 Ring 1. 세금도 비싸고 규정도 엄격해요. 수퍼비아 중력수정은 여기서 희귀품이라 비싸게 팔 수 있어요.'},
    {char:'system', name:'마르코', color:'#9ee7ff', text:'근데 봐봐 저기 — 저 탐사선이 해적한테 당하고 있는 거 맞죠?'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'구조한다.'}
  ],

    // ─── 가가린 합류 + 거북선 설계도 단편 2/3 ───
  p1_gagarin_join:[
    {char:'hero04', name:'가가린', color:'#ffd700', text:'내 데이터 칩 돌려줘서 고마워. 보답으로 같이 갈게.'},
    {char:'hero04', name:'가가린', color:'#ffd700', text:'넥서스 프라임 LHS 광산 방향에서 아주 오래된 통신 패턴이 잡혀. 100년 전 것 같아. 이순신이라는 이름이랑 연결돼 있어.'},
    {char:'hero04', name:'가가린', color:'#ffd700', text:'그리고 — 데이터 안에 함선 외피 도면도 들어있어. 가시 돌기 구조. 너희가 가지고 있는 골격 단편이랑 짝이 맞아.'},
    {char:'baekgu2_advice', name:'백구', color:'#66ddff', text:'거북선 설계도 단편 2/3 확보. 외피 가시 돌기 구조도. 코어 단편 1개만 더 있으면 복원 가능합니다.'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'간다.'}
  ],

  // ─── CH02-B "크리그의 그림자" (P06 도착) ───
  p1_ch02b:[
    {char:'hero04', name:'가가린', color:'#88ccff', text:'신호 방향은 여기서 더 깊은 곳이야. 근데... 크리그 해적단 표식이 보여.'},
    {char:'system', name:'마르코', color:'#9ee7ff', text:'크리그가 광산 세금 징수를 빌미로 3주째 점거 중이야. 광부들이 착취당하고 있어.'},
    {char:'baekgu1', name:'백구', color:'#66ddff', text:'크리그 소형 3기, 중형 지휘선 1기 확인됩니다. 광부 민간인 7명 억류 중이에요.'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'크리그를 여기서 만날 줄은...'},
    {char:'system', name:'마르코', color:'#9ee7ff', text:'지구 봉쇄만 하는 게 아니야. 이 구역도 건드리고 있어.'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'먼저 사람부터.'}
  ],

    // ─── CH02-C "신호의 근원" (P09 도착) ───
  p1_ch02c:[
    {char:'hero04', name:'가가린', color:'#88ccff', text:'여기야. 이 안테나가 이순신 신호를 중계해온 거야.'},
    {char:'system', name:'마르코', color:'#9ee7ff', text:'근데 무법자 해적단이 기지를 장악하고 있어. 안테나 접근하려면 먼저 처리해야 해.'},
    {char:'baekgu1', name:'백구', color:'#66ddff', text:'해적 소형 2기, 지휘선 1기 감지됩니다. 기지 외곽 배치.'},
    {char:'hero04', name:'가가린', color:'#88ccff', text:'어서. 이순신 좌표 알아내면 다음이 정해져.'}
  ],

    // ─── CH02-D "결단" + 거북선 설계도 단편 3/3 완성 (P09 outro · Q05-M 완료 후 · 페이즈 1 종료) ───
  p1_ch02d:[
    {char:'system', name:'마르코', color:'#9ee7ff', text:'47 우르사이 마요리스 b (치크스) Ring 1... 들어가면 바로 적대 상태 돼. 각오해야 해.'},
    {char:'hero04', name:'가가린', color:'#88ccff', text:'하지만 이순신이 거기 있어. 크리그를 막을 방법도.'},
    {char:'baekgu1', name:'백구', color:'#66ddff', text:'확률 계산... 생존 가능성 62%. 이순신 구출 시 크리그 전략 정보 획득 가능성 89%.'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'백구, 62%면 충분해.'},
    {char:'baekgu1', name:'백구', color:'#66ddff', text:'...그냥이에요.'}
  ],

  };

// 영문 컷씬 — 폴백: EN 미존재 시 KO 사용
const PHASE1_CUTSCENES_EN={

  // ─── CH01-A "100년의 잠" (P01 시작) ───
  p1_ch01a:[
    {char:'baekgu1', name:'Baekgu', color:'#66ddff', text:'{commander}. Wake up. Energy reserves at 7%. If you don\'t rise now, there won\'t be a next time.'},
    {char:'commander', name:'{commander}', color:'#00f3ff', text:'...How long has it been?'},
    {char:'baekgu1', name:'Baekgu', color:'#66ddff', text:'One hundred years, three months, twelve days. Earth is still under blockade.'},
    {char:'commander', name:'{commander}', color:'#00f3ff', text:'Earth... Ursa Major still has it blockaded?'},
    {char:'baekgu1', name:'Baekgu', color:'#66ddff', text:'Nothing\'s changed since we left. If anything, the noose has tightened.'},
    {char:'baekgu1', name:'Baekgu', color:'#66ddff', text:'Save the sentiment for later. First, we survive. There are Scrap Frames scattered all over the hangar. Salvage them and we\'ll cover the repairs and fuel.'}
  ],

    // ─── CH01-B "볼프로 간다" (P01 outro · Q01-01 완료 후) ───
  p1_ch01b:[
    {char:'baekgu1', name:'Baekgu', color:'#66ddff', text:'The Wolf Trading Post. A trade station on Superbia Ring 1. It\'s still operational.'},
    {char:'commander', name:'{commander}', color:'#00f3ff', text:'There are people there?'},
    {char:'baekgu1', name:'Baekgu', color:'#66ddff', text:'There are. Superbia gravity crystals — they go cheap here. You can sell them on Aureus for 40% more. A good way to raise your first funds.'}
  ],

    // ─── CH01-C "첫 교역소" (P03 도착) ───
  p1_ch01c:[
    {char:'aori', name:'Aori', color:'#d4a574', text:'You came from Proxima b? There\'s still anybody left out there?'},
    {char:'commander', name:'{commander}', color:'#00f3ff', text:'I was asleep for quite a while.'},
    {char:'aori', name:'Aori', color:'#d4a574', text:'Huh. So what are you selling?'},
    {char:'commander', name:'{commander}', color:'#00f3ff', text:'Scrap.'}
  ],

    // ─── 거북선 설계도 단편 1/3 발견 (P03 Q02-M 직후) ───
  p1_turtle1:[
    {char:'wolf_elder', name:'Wolf Elder', color:'#a8b3c0', text:'(handing over a worn data chip) Take this too. Some Korean left it here a hundred years ago — called it the "Turtle Ship."'},
    {char:'commander', name:'{commander}', color:'#00f3ff', text:'Turtle Ship...?'},
    {char:'baekgu1', name:'Baekgu', color:'#66ddff', text:'Data analysis — ship blueprint fragment, 1 of 3. The skeletal frame schematic. Find the other two and it can be restored.'}
  ],

  // ─── 마르코 폴로 영입 ───
  p1_marco_join:[
    {char:'hero08', name:'Marco Polo', color:'#ffd700', text:'Yi Sun-sin? Haven\'t heard that name in ages. The old-timers out by Eridani said they caught that signal.'},
    {char:'hero08', name:'Marco Polo', color:'#ffd700', text:'Let\'s team up. I\'ll handle the intel.'},
    {char:'baekgu1', name:'Baekgu', color:'#66ddff', text:'Marco Polo — registered as information broker. Beginning trust tracking.'},
    {char:'commander', name:'{commander}', color:'#00f3ff', text:'Glad to have you.'}
  ],

  // ─── CH02-A "황금의 항구" (P05 도착) ───
  p1_ch02a:[
    {char:'baekgu1', name:'Baekgu', color:'#66ddff', text:'Aureus Ring 1. Taxes are steep and the regulations are strict. Superbia gravity crystals are rare here, so they fetch a high price.'},
    {char:'system', name:'Marco', color:'#9ee7ff', text:'Hold on, look over there — that survey ship is getting hit by pirates, isn\'t it?'},
    {char:'commander', name:'{commander}', color:'#00f3ff', text:'We move to rescue.'}
  ],

    // ─── 가가린 합류 + 거북선 설계도 단편 2/3 ───
  p1_gagarin_join:[
    {char:'hero04', name:'Gagarin', color:'#ffd700', text:'Thanks for getting my data chip back. I\'ll come along to repay the favor.'},
    {char:'hero04', name:'Gagarin', color:'#ffd700', text:'There\'s a very old comms pattern coming from the direction of the Nexus Prime LHS mines. Looks a hundred years old. It\'s tied to a name — Yi Sun-sin.'},
    {char:'hero04', name:'Gagarin', color:'#ffd700', text:'And — the data holds a ship hull schematic too. A spiked-ridge structure. It pairs perfectly with that frame fragment you\'re carrying.'},
    {char:'baekgu2_advice', name:'Baekgu', color:'#66ddff', text:'Turtle Ship blueprint fragment 2 of 3 secured. The hull spiked-ridge schematic. With just one more core fragment, restoration is possible.'},
    {char:'commander', name:'{commander}', color:'#00f3ff', text:'Let\'s go.'}
  ],

  // ─── CH02-B "크리그의 그림자" (P06 도착) ───
  p1_ch02b:[
    {char:'hero04', name:'Gagarin', color:'#88ccff', text:'The signal leads deeper in from here. But... I can see Krieg pirate markings.'},
    {char:'system', name:'Marco', color:'#9ee7ff', text:'Krieg\'s been occupying the place for three weeks now, using mine-tax collection as their excuse. The miners are being exploited.'},
    {char:'baekgu1', name:'Baekgu', color:'#66ddff', text:'Confirming three Krieg light craft and one medium command ship. Seven civilian miners held captive.'},
    {char:'commander', name:'{commander}', color:'#00f3ff', text:'To think I\'d run into Krieg here...'},
    {char:'system', name:'Marco', color:'#9ee7ff', text:'They\'re not just blockading Earth. They\'re reaching into this sector too.'},
    {char:'commander', name:'{commander}', color:'#00f3ff', text:'People first.'}
  ],

    // ─── CH02-C "신호의 근원" (P09 도착) ───
  p1_ch02c:[
    {char:'hero04', name:'Gagarin', color:'#88ccff', text:'This is it. This antenna has been relaying the Yi Sun-sin signal.'},
    {char:'system', name:'Marco', color:'#9ee7ff', text:'But an outlaw pirate band has seized the base. We\'ll have to deal with them before we can reach the antenna.'},
    {char:'baekgu1', name:'Baekgu', color:'#66ddff', text:'Detecting two pirate light craft and one command ship. Deployed around the base perimeter.'},
    {char:'hero04', name:'Gagarin', color:'#88ccff', text:'Hurry. Once we get the Yi Sun-sin coordinates, our next move is set.'}
  ],

    // ─── CH02-D "결단" + 거북선 설계도 단편 3/3 완성 (P09 outro · Q05-M 완료 후 · 페이즈 1 종료) ───
  p1_ch02d:[
    {char:'system', name:'Marco', color:'#9ee7ff', text:'47 Ursae Majoris b (Chiks) Ring 1... The moment we enter, we go hostile. We need to be ready.'},
    {char:'hero04', name:'Gagarin', color:'#88ccff', text:'But Yi Sun-sin is there. And so is the way to stop Krieg.'},
    {char:'baekgu1', name:'Baekgu', color:'#66ddff', text:'Probability calculation... survival odds 62%. Odds of obtaining Krieg strategic intel upon rescuing Yi Sun-sin: 89%.'},
    {char:'commander', name:'{commander}', color:'#00f3ff', text:'Baekgu, 62% is enough.'},
    {char:'baekgu1', name:'Baekgu', color:'#66ddff', text:'...If you say so.'}
  ],

  };

// 행성별 인트로 컷씬 매핑 — 행성 첫 도착 시 자동 재생
const PHASE1_PLANET_INTROS={
  P01:'p1_ch01a',  // 100년의 잠
  P03:'p1_ch01c',  // 첫 교역소
  P05:'p1_ch02a',  // 황금의 항구
  P06:'p1_ch02b',  // 크리그의 그림자
  P09:'p1_ch02c'   // 신호의 근원
};

// 전역 노출
window.PHASE1_QUESTS=PHASE1_QUESTS;
window.PHASE1_CUTSCENES_KO=PHASE1_CUTSCENES_KO;
window.PHASE1_CUTSCENES_EN=PHASE1_CUTSCENES_EN;
window.PHASE1_PLANET_INTROS=PHASE1_PLANET_INTROS;

console.log('[PHASE1_QUESTS v2.0] Loaded — 27 quests across 5 planets (P01·P03·P05·P06·P09), 9 cutscenes');
})();
