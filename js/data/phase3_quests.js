// ═══════════════════════════════════════════════════════════════════
// DESTINATION EARTH — Phase 3 퀘스트 + 컷씬 데이터 (v1.0)
// 출처: Doc/PHASE3_QUEST_CARDS.md v1.0
// 페이즈 3 · 연대 | 행성 P22·P23·P08·P11·P26 | CH05~CH07
// 30개 퀘스트 + 10개 컷씬 (한·영 분기)
// 영웅 합류: 장영실(H02) @ P11 Q14-M / 광개토대왕(H03) @ P08 사전 등록 (페이즈 4 합류 조건)
// 거북선 LGD01 레시피 해금 (Q15-M) / R06 25개 수집 목표
// ═══════════════════════════════════════════════════════════════════
(function(){
if(typeof window==='undefined') return;
if(window.PHASE3_QUESTS) return;

const PHASE3_QUESTS={

  // ════════════════════════════════════════════════════════════════
  // 행성 11 · P22 저항군 제1기지 "에코" (저항군 최전선 거점)
  // 팩션 특산물: G13·G14·G15·G18·R06
  // ════════════════════════════════════════════════════════════════
  P22:[
    // ── Q11-01 저항군 기지 착지 허가 (메인 자동) ──
    {
      id:'p3_q1101', type:'story_quest', category:'main', phase:3,
      ic:'🛬', npc:'레인저 맥시모프', npcIc:'🎖️', npcKey:'delivery_F06',
      nm:{ko:'저항군 기지 착지 허가', en:'Echo Base Landing'},
      desc:{ko:'착지 코드 대신 강습 스파이크 ×1 제공(크리그 획득 물자 — 저항군 정보가치 입증) → 지하 방공호 에코 기지 착지 허가.\n레인저: "이순신 장군... 살아계셨군요."',
            en:'Submit 강습 스파이크 ×1 (Krieg materiel) instead of code → Echo Base landing approved. Ranger: "Admiral... you live."'},
      objectives:[
        {type:'gather', item:'G12', qty:1, label:{ko:'강습 스파이크 ×1 제출', en:'Submit 강습 스파이크 ×1'}},
      ],
      rewardCr:80000, rewardVe:80,
      rewardItems:[{id:'G13', qty:3}],
      rewardFlags:['echo_base_landed'],
      cutscene_pre:'p3_ch05a', cutscene_post:null
    },
    // ── Q11-02 G18 재보충 (메인) ──
    {
      id:'p3_q1102', type:'story_quest', category:'main', phase:3,
      ic:'📜', npc:'이순신', npcIc:'⚔️', npcKey:'hero01',
      nm:{ko:'난중일기 재보충', en:'Restock Nanjung Diary'},
      desc:{ko:'이순신: "G18 난중일기 영인본 — 캡슐 봉인 해제에 소모한 원본 데이터를 재보충해야 해. 저항군 아카이브에 비축분이 있어."\nG13 ×2 소비(아카이브 열람 비용) → G18 ×2 입수.',
            en:'Yi Sun-sin: "G18 must be restocked from the archive." G13 ×2 → G18 ×2.'},
      objectives:[
        {type:'gather', item:'G13', qty:2, label:{ko:'저항군 군수품 ×2 열람 비용', en:'저항군 군수품 ×2 archive fee'}},
      ],
      rewardCr:100000, rewardVe:80,
      rewardItems:[{id:'G18', qty:2}],
      rewardFlags:['g18_restocked'],
      cutscene_pre:null, cutscene_post:null
    },
    // ── Q11-03 에코 주점 정보 수집 (선택 주점) ──
    {
      id:'p3_q1103', type:'story_quest', category:'sub', phase:3,
      ic:'🍺', npc:'마르코 폴로', npcIc:'🗺️', npcKey:'hero08',
      nm:{ko:'에코 주점 — 케이드의 정보', en:'Echo Tavern — Kade'},
      desc:{ko:'에코 기지 비공개 주점. 전통 발효주 ×2 소비 → 정보원 "케이드": "P23 오딧세이 보급망에서 이상한 화물 움직임이 있어. 크리그 색깔이야."\n주점 가챠 가능 (정예 2,000₡ 또는 VC 5).',
            en:'전통 발효주 ×2 → Kade: "Strange Krieg-pattern cargo in P23 supply." Tavern gacha available.'},
      objectives:[
        {type:'gather', item:'G14', qty:2, label:{ko:'전통 발효주 ×2', en:'전통 발효주 ×2'}},
      ],
      rewardCr:30000, rewardVe:50,
      rewardItems:[],
      rewardFlags:['p23_spy_rumor'],
      cutscene_pre:null, cutscene_post:null
    },
    // ── Q11-04 기지 외곽 잔해 탐색 (서브) ──
    {
      id:'p3_q1104', type:'story_quest', category:'sub', phase:3,
      ic:'🔍', npc:'가가린', npcIc:'🚀', npcKey:'hero04',
      nm:{ko:'에코 기지 외곽 잔해 탐색', en:'Echo Outskirt Wreck'},
      desc:{ko:'에코 기지 외곽 — 과거 치크스-저항군 충돌 잔해 구역. 잔해 탐색 3회 실시.\n70% 자원 / 30% 잔해 해적 조우.',
            en:'Search 3× outside Echo. 70% resources / 30% wreck pirates.'},
      objectives:[
        {type:'explore', target:'p22_wreck', qty:3, label:{ko:'잔해 탐색 ×3', en:'Wreck search ×3'}},
      ],
      rewardCr:40000, rewardVe:40,
      rewardItems:[{id:'R06', qty:4},{id:'G13', qty:1},{id:'G15', qty:1}],
      rewardFlags:[],
      cutscene_pre:null, cutscene_post:null
    },
    // ── Q11-05 P22 에코 행성 경매 (서브 경매) ──
    {
      id:'p3_q1105', type:'story_quest', category:'sub', phase:3,
      ic:'🏛️', npc:'마르코 폴로', npcIc:'🗺️', npcKey:'hero08',
      nm:{ko:'지하 방공호 에코 행성 경매', en:'지하 방공호 Echo Auction'},
      desc:{ko:'에코 기지 경매소에서 지하 방공호 행성 소유권 경매. 즉시구매 ~71,760₡ / 최저입찰 ~21,528₡.\n낙찰 시 지하 방공호 매 턴 세금 5,000₡ 수입 + 저항군 함선 상시 구매 가능.',
            en:'Bid on 지하 방공호 ownership. Buyout ~71,760₡, min bid ~21,528₡. Owning → 5,000₡/turn tax + resistance ship access.'},
      objectives:[
        {type:'explore', target:'p22_auction', qty:1, label:{ko:'지하 방공호 경매 참여', en:'Participate auction'}},
      ],
      rewardCr:0, rewardVe:0,
      rewardItems:[],
      rewardFlags:['p22_owned'],
      cutscene_pre:null, cutscene_post:null
    },
    // ── Q11-M 저항군 1차 연대 합의 (이벤트 스토리) ──
    {
      id:'p3_q11m', type:'story_quest', category:'hidden', phase:3,
      ic:'🤝', npc:'레인저 맥시모프', npcIc:'🎖️', npcKey:'delivery_F06',
      nm:{ko:'저항군 1차 연대 합의', en:'Resistance Pact (1st)'},
      desc:{ko:'지구 철광석 ×2 소비(저항군 전통 연대 의식) → 1차 연대 협약 체결.\n레인저: "R06 반물질 5단 팩을 드릴게요. 더 필요하면 P26 본부에 오세요."',
            en:'지구 철광석 ×2 → 1st pact. Ranger: "R06 ×5 pack. More at P26 HQ."'},
      objectives:[
        {type:'gather', item:'G15', qty:2, label:{ko:'지구 철광석 ×2 의식', en:'지구 철광석 ×2 pact ritual'}},
      ],
      rewardCr:150000, rewardVe:100,
      rewardItems:[{id:'R06', qty:5}],
      rewardFlags:['resistance_alliance_1','p3_planet_unlocked_P23'],
      cutscene_pre:'p3_ch05b', cutscene_post:null
    }
  ],

  // ════════════════════════════════════════════════════════════════
  // 행성 12 · P23 저항군 제2기지 "오딧세이" (크리그 경계 보급 거점)
  // 팩션 특산물: G13·G14·G28·R06
  // ════════════════════════════════════════════════════════════════
  P23:[
    // ── Q12-01 오딧세이 잠입 (메인) ──
    {
      id:'p3_q1201', type:'story_quest', category:'main', phase:3,
      ic:'🎭', npc:'마르코 폴로', npcIc:'🗺️', npcKey:'hero08',
      nm:{ko:'오딧세이 잠입', en:'Infiltrate Odyssey'},
      desc:{ko:'마르코가 화물 위장 플랜 제안: 저항군 군수품 ×2 소비(화물 목록 위조 증빙) → 합법적 화물로 위장해 내부 진입.\n창고 담당 \'키이로\': "화물 이상은 세 번째 구역부터야."',
            en:'Marco: cargo cover plan. 저항군 군수품 ×2 → infiltration. Kiiro: "Anomaly in zone 3."'},
      objectives:[
        {type:'gather', item:'G13', qty:2, label:{ko:'저항군 군수품 ×2 위조 증빙', en:'저항군 군수품 ×2 forged manifest'}},
      ],
      rewardCr:80000, rewardVe:60,
      rewardItems:[{id:'G28', qty:2}],
      rewardFlags:['odyssey_infiltrated'],
      cutscene_pre:'p3_ch05c', cutscene_post:null
    },
    // ── Q12-02 크리그 첩자 추적 (메인) ──
    {
      id:'p3_q1202', type:'story_quest', category:'main', phase:3,
      ic:'🕵️', npc:'마르코 폴로', npcIc:'🗺️', npcKey:'hero08',
      nm:{ko:'크리그 첩자 추적', en:'Track Krieg Spy'},
      desc:{ko:'기지 민간인에게 지구 빈티지 씨앗 ×2 소비(정보 대가) → 첩자 실체 파악: 보급 담당 \'오그렌\'이 크리그 이중 스파이.\n추가: "오그렌이 아우레우스 기업 코르넬리우스와도 연결돼 있어."',
            en:'지구 빈티지 씨앗 ×2 → spy identified: Ogren, supply officer, linked to Aureus corp Cornelius.'},
      objectives:[
        {type:'gather', item:'G28', qty:2, label:{ko:'지구 빈티지 씨앗 ×2 정보 대가', en:'지구 빈티지 씨앗 ×2 informant fee'}},
      ],
      rewardCr:100000, rewardVe:70,
      rewardItems:[],
      rewardFlags:['spy_ogren_identified','aurelius_link_hint'],
      cutscene_pre:null, cutscene_post:null
    },
    // ── Q12-03 오그렌 격퇴·포획 (메인 전투) ──
    {
      id:'p3_q1203', type:'story_quest', category:'main', phase:3,
      ic:'⚔️', npc:'{사령관}', npcIc:'🧑‍🚀', npcKey:'commander',
      nm:{ko:'오그렌 격퇴·포획', en:'Defeat & Capture Ogren'},
      desc:{ko:'오그렌의 크리그 연락 함선 차단 → 오딧세이 외곽 전투.\n격퇴 후 심문: "코르넬리우스 CEO \'발테르\'가 아우레우스 P08에서 크리그에 기술 설계도를 팔고 있어. 아이젠클로 직속 거래야."',
            en:'Defeat & capture Ogren. Interrogation: "Cornelius CEO Walter sells tech to Krieg via Eisenklaue direct."'},
      objectives:[
        {type:'combat', target:'ogren_boss', qty:1, label:{ko:'오그렌 포획', en:'Capture Ogren'}},
      ],
      rewardCr:180000, rewardVe:90,
      rewardItems:[{id:'G10', qty:2},{id:'R06', qty:3}],
      rewardFlags:['cornelius_krieg_tech_transfer','p3_planet_unlocked_P08'],
      cutscene_pre:null, cutscene_post:'p3_ch06a'
    },
    // ── Q12-04 오딧세이 외곽 잔해 탐색 (서브 + LGD02 5% 드롭) ──
    {
      id:'p3_q1204', type:'story_quest', category:'sub', phase:3,
      ic:'🔍', npc:'가가린', npcIc:'🚀', npcKey:'hero04',
      nm:{ko:'오딧세이 잔해 탐색', en:'Odyssey Wreck Search'},
      desc:{ko:'오그렌 격퇴 후 외곽 잔해 구역 정리. 잔해 탐색 3회.\n탐색 중 워덴클리프 설계도 조각 5% 드롭 (화성 저항군 드롭 행성).',
            en:'3× wreck search. 5% 워덴클리프 Wardenclyffe blueprint chance.'},
      objectives:[
        {type:'explore', target:'p23_wreck', qty:3, label:{ko:'잔해 탐색 ×3', en:'Wreck ×3'}},
      ],
      rewardCr:50000, rewardVe:40,
      rewardItems:[{id:'R06', qty:2},{id:'G13', qty:1}],
      rewardFlags:[],
      cutscene_pre:null, cutscene_post:null
    },
    // ── Q12-05 P23 행성 투자 (서브 투자) ──
    {
      id:'p3_q1205', type:'story_quest', category:'sub', phase:3,
      ic:'📈', npc:'마르코 폴로', npcIc:'🗺️', npcKey:'hero08',
      nm:{ko:'화성 저항군 오딧세이 행성 투자', en:'화성 저항군 Investment'},
      desc:{ko:'오딧세이 기지 경제권 확보. 화성 저항군 커머스 레벨 1 투자(~30,240₡) → 매 턴 세금 수입 +20% (5,000→6,000₡).',
            en:'Invest 화성 저항군 commerce L1 (~30,240₡) → +20% tax/turn.'},
      objectives:[
        {type:'explore', target:'p23_commerce', qty:1, label:{ko:'화성 저항군 커머스 L1 투자', en:'Invest commerce L1'}},
      ],
      rewardCr:50000, rewardVe:30,
      rewardItems:[],
      rewardFlags:['p23_invested'],
      cutscene_pre:null, cutscene_post:null
    }
  ],

  // ════════════════════════════════════════════════════════════════
  // 행성 13 · P08 아우레우스 글리제 667Cc (코르넬리우스 본사)
  // 팩션 특산물: G04·G06·G23·G24·R03
  // 광개토대왕(H03) 사전 등록 행성
  // ════════════════════════════════════════════════════════════════
  P08:[
    // ── Q13-01 닥터 에바 접선 (메인) ──
    {
      id:'p3_q1301', type:'story_quest', category:'main', phase:3,
      ic:'📡', npc:'닥터 에바', npcIc:'👩‍🔬', npcKey:'gather_F02',
      nm:{ko:'닥터 에바 접선', en:'Contact Dr. Eva'},
      desc:{ko:'글리제 667Cc 글리제 항구 도착. 암호 통신으로 닥터 에바 접선.\nG04 아우레우스 금괴 ×2 소비(접선 비용) → 에바: "코르넬리우스 발테르 CEO가 아이젠클로에게 기술 자료를 넘기고 있어요. 창고 서버에 이전 로그가 있어요."',
            en:'아우레우스 금괴 ×2 → meet Eva. "Walter sends data to Eisenklaue. Warehouse server has transfer logs."'},
      objectives:[
        {type:'gather', item:'G04', qty:2, label:{ko:'아우레우스 금괴 ×2 접선 비용', en:'아우레우스 금괴 ×2 contact fee'}},
      ],
      rewardCr:100000, rewardVe:70,
      rewardItems:[{id:'G23', qty:2}],
      rewardFlags:['dr_eva_contact'],
      cutscene_pre:'p3_ch06a', cutscene_post:null
    },
    // ── Q13-02 코르넬리우스 창고 잠입 (메인) ──
    {
      id:'p3_q1302', type:'story_quest', category:'main', phase:3,
      ic:'🔓', npc:'닥터 에바', npcIc:'👩‍🔬', npcKey:'gather_F02',
      nm:{ko:'코르넬리우스 창고 잠입', en:'Cornelius Warehouse'},
      desc:{ko:'에바가 창고 접근 코드 제공. 아우레우스 태양 화폐 ×2 소비(경비원 매수) → 잠입. 아우레우스 정보 칩 ×1 소비(접속 인증 생성) → 기술 이전 로그 다운로드.\n로그: "LGD 설계도 기반 생체 엔진 데이터를 P13 아이젠클로 직속 실험실로 3차례 전송."',
            en:'아우레우스 태양 화폐 ×2 (bribe) + 아우레우스 정보 칩 ×1 (auth) → download tech-transfer log to Eisenklaue lab.'},
      objectives:[
        {type:'gather', item:'G23', qty:2, label:{ko:'아우레우스 태양 화폐 ×2 경비원 매수', en:'아우레우스 태양 화폐 ×2 bribe'}},
        {type:'gather', item:'G24', qty:1, label:{ko:'아우레우스 정보 칩 ×1 인증 생성', en:'아우레우스 정보 칩 ×1 auth'}},
      ],
      rewardCr:150000, rewardVe:80,
      rewardItems:[{id:'G06', qty:2}],
      rewardFlags:['tech_transfer_log_obtained'],
      cutscene_pre:null, cutscene_post:null
    },
    // ── Q13-03 코르넬리우스 보안팀 격퇴 (메인 전투) ──
    {
      id:'p3_q1303', type:'story_quest', category:'main', phase:3,
      ic:'⚔️', npc:'{사령관}', npcIc:'🧑‍🚀', npcKey:'commander',
      nm:{ko:'코르넬리우스 보안팀 격퇴', en:'Defeat Cornelius Security'},
      desc:{ko:'증거 탈취 직후 코르넬리우스 사설 보안함대 3기 출격 → 전투.\n에바: "이제 발테르가 아이젠클로에게 알릴 거예요. 시간이 없어요."',
            en:'Defeat 3 Cornelius security ships. Eva: "Walter will alert Eisenklaue. Hurry."'},
      objectives:[
        {type:'combat', target:'cornelius_security', qty:3, label:{ko:'보안함대 ×3 격퇴', en:'Defeat security ×3'}},
      ],
      rewardCr:200000, rewardVe:90,
      rewardItems:[{id:'G04', qty:2},{id:'R03', qty:5}],
      rewardFlags:['cornelius_exposed'],
      cutscene_pre:null, cutscene_post:null
    },
    // ── Q13-04 전투 후 수리 (서브) ──
    {
      id:'p3_q1304', type:'story_quest', category:'sub', phase:3,
      ic:'🔧', npc:'장영실', npcIc:'⚙️', npcKey:'hero02',
      nm:{ko:'글리제 667Cc 정비소 수리', en:'글리제 667Cc Repair Shop'},
      desc:{ko:'코르넬리우스 보안팀과의 전투로 {함선} 손상. 글리제 667Cc 정비소에서 수리.\n장영실(통신): "이번엔 내가 미리 봐줄게. 다음엔 내 작업실로 와."',
            en:'Repair {ship} at 글리제 667Cc. Jang Yeong-sil (radio): "I\'ll prep it remotely. Next time, my workshop."'},
      objectives:[
        {type:'explore', target:'p08_repair', qty:1, label:{ko:'정비소 수리 완료', en:'Complete repair'}},
      ],
      rewardCr:30000, rewardVe:30,
      rewardItems:[],
      rewardFlags:['p08_repaired'],
      cutscene_pre:null, cutscene_post:null
    },
    // ── Q13-05 아이템 제작 — 데이터 복호기 (서브) ──
    {
      id:'p3_q1305', type:'story_quest', category:'sub', phase:3,
      ic:'🛒', npc:'닥터 에바', npcIc:'👩‍🔬', npcKey:'gather_F02',
      nm:{ko:'데이터 복호기 제작', en:'Craft Data Decoder'},
      desc:{ko:'에바: "G24 정보 칩과 R03 태양핵을 결합하면 복호기를 만들 수 있어요."\nG24 ×1 + R03 ×2 → 데이터 복호기 → 로그 완전 해독.\n해독 로그: "아이젠클로의 다음 행선지 — P14 크리그 공장 행성."',
            en:'아우레우스 정보 칩 ×1 + 아우레우스 태양핵 ×2 → decoder → "Eisenklaue\'s next stop — P14 Krieg factory planet."'},
      objectives:[
        {type:'gather', item:'G24', qty:1, label:{ko:'아우레우스 정보 칩 ×1', en:'아우레우스 정보 칩 ×1'}},
        {type:'gather', item:'R03', qty:2, label:{ko:'아우레우스 태양핵 ×2', en:'아우레우스 태양핵 ×2'}},
      ],
      rewardCr:50000, rewardVe:50,
      rewardItems:[],
      rewardFlags:['log_fully_decoded','eisenklaue_p14_hint'],
      cutscene_pre:null, cutscene_post:'p3_ch06b'
    },
    // ── Q13-H 광개토대왕 첫 만남 (히든 영웅 사전) ──
    {
      id:'p3_q13h', type:'story_quest', category:'hidden', phase:3,
      ic:'⚜️', npc:'광개토대왕', npcIc:'🏹', npcKey:'hero03',
      nm:{ko:'광개토대왕 첫 만남', en:'Meet Gwanggaeto'},
      desc:{ko:'글리제 667Cc 항구 — 고구려 기치를 단 대형 상선. 광개토(H03) 등장.\n광개토: "이 행성을 내 손에 넣으면 — 당신과 거래하겠소. 단, P08 경매에서 최고가를 내야 하오."\n→ H03 합류 조건 등록 (Phase 4 P08 경매 낙찰 ~4,100만₡).',
            en:'Gwanggaeto (H03) appears at 글리제 667Cc port. Condition: win 글리제 667Cc auction (~41M₡) in Phase 4.'},
      objectives:[
        {type:'explore', target:'meet_gwanggaeto', qty:1, label:{ko:'광개토와 대화', en:'Talk to Gwanggaeto'}},
      ],
      rewardCr:50000, rewardVe:50,
      rewardItems:[],
      rewardFlags:['gwanggaeto_met','p3_planet_unlocked_P11'],
      cutscene_pre:null, cutscene_post:'p3_ch06c'
    }
  ],

  // ════════════════════════════════════════════════════════════════
  // 행성 14 · P11 메카니카 "기어월드" (자동화 제조 행성)
  // 팩션 특산물: G07·G08·G09·G25·R05
  // 장영실(H02) 합류 행성
  // ════════════════════════════════════════════════════════════════
  P11:[
    // ── Q14-01 기어월드 착지 허가 (메인) ──
    {
      id:'p3_q1401', type:'story_quest', category:'main', phase:3,
      ic:'🛬', npc:'시스템', npcIc:'📡', npcKey:'system',
      nm:{ko:'기어월드 착지 허가', en:'Gearworld Landing'},
      desc:{ko:'기어월드 자치 도크 위원회가 통행세 요구. 분열 배터리 ×2 소비(메카니카 통행세 현물 납부) → 착지 허가.\n작업실 구역 이동 허가 — 장영실 위치 확인.',
            en:'분열 배터리 ×2 transit fee → landing approved. Workshop access granted.'},
      objectives:[
        {type:'gather', item:'G07', qty:2, label:{ko:'분열 배터리 ×2 통행세', en:'분열 배터리 ×2 transit'}},
      ],
      rewardCr:80000, rewardVe:60,
      rewardItems:[{id:'G08', qty:2}],
      rewardFlags:['gearworld_landed'],
      cutscene_pre:'p3_ch06d', cutscene_post:null
    },
    // ── Q14-02 장영실 설득 (메인) ──
    {
      id:'p3_q1402', type:'story_quest', category:'main', phase:3,
      ic:'🛠️', npc:'이순신', npcIc:'⚔️', npcKey:'hero01',
      nm:{ko:'장영실 설득', en:'Convince Jang Yeong-sil'},
      desc:{ko:'장영실 요구 충족: 중수소 배터리 ×3 소비(시뮬레이터 연료) + 메카니카 자동화 부품 ×2 소비(거북선 선체 시뮬레이션 재료).\n시뮬레이션 결과: "이 설계... 가능해. 크리그 무기 원석 용골이 핵심이군."',
            en:'중수소 배터리 ×3 (simulator fuel) + 메카니카 자동화 부품 ×2 (hull sim materials). "It works. Krieg ore keel is the key."'},
      objectives:[
        {type:'gather', item:'G09', qty:3, label:{ko:'중수소 배터리 ×3 시뮬레이터 연료', en:'중수소 배터리 ×3 sim fuel'}},
        {type:'gather', item:'G25', qty:2, label:{ko:'메카니카 자동화 부품 ×2 시뮬레이션 재료', en:'메카니카 자동화 부품 ×2 sim parts'}},
      ],
      rewardCr:120000, rewardVe:80,
      rewardItems:[],
      rewardFlags:['jangyi_trust_1'],
      cutscene_pre:null, cutscene_post:null
    },
    // ── Q14-03 크리그 정찰대 격퇴 (메인 전투) ──
    {
      id:'p3_q1403', type:'story_quest', category:'main', phase:3,
      ic:'⚔️', npc:'가가린', npcIc:'🚀', npcKey:'hero04',
      nm:{ko:'크리그 정찰대 격퇴', en:'Repel Krieg Patrol'},
      desc:{ko:'가가린: "크리그 정찰함 2기가 기어월드에 접근 중이야. P08 코르넬리우스 사건 때문에 추적해온 것 같아."\n정찰대 격퇴. 장영실: "...고마워. 내 작업실까지 들이닥칠 뻔했어."',
            en:'Defeat 2 Krieg patrol ships pursuing from 글리제 667Cc. Jang: "Thanks. They almost reached my shop."'},
      objectives:[
        {type:'combat', target:'krieg_patrol', qty:2, label:{ko:'크리그 정찰함 ×2', en:'Krieg patrol ×2'}},
      ],
      rewardCr:200000, rewardVe:90,
      rewardItems:[{id:'G10', qty:2},{id:'R05', qty:5}],
      rewardFlags:['krieg_patrol_repelled'],
      cutscene_pre:null, cutscene_post:null
    },
    // ── Q14-04 함선 강화 — 장영실 정비 (서브) ──
    {
      id:'p3_q1404', type:'story_quest', category:'sub', phase:3,
      ic:'⚙️', npc:'장영실', npcIc:'🔧', npcKey:'hero02',
      nm:{ko:'장영실 함선 정비', en:'Jang\'s Ship Tuning'},
      desc:{ko:'장영실이 {함선}의 파츠 슬롯과 장착 구성을 전면 재점검 → 자동 정비(autoEquipAll) 실행 → 최적 파츠 자동 매칭.\n장영실: "이 배... 파츠 배치가 비효율적이야. 내가 다시 짜줄게."',
            en:'Jang tunes the ship — autoEquipAll() runs, optimal parts auto-matched.'},
      objectives:[
        {type:'explore', target:'p11_tuning', qty:1, label:{ko:'파츠 최적화 완료', en:'Parts optimized'}},
      ],
      rewardCr:40000, rewardVe:40,
      rewardItems:[],
      rewardFlags:['ship_optimized'],
      cutscene_pre:null, cutscene_post:null
    },
    // ── Q14-05 기어월드 외곽 잔해 탐색 (서브) ──
    {
      id:'p3_q1405', type:'story_quest', category:'sub', phase:3,
      ic:'🔍', npc:'마르코 폴로', npcIc:'🗺️', npcKey:'hero08',
      nm:{ko:'기어월드 외곽 잔해 탐색', en:'Gearworld Wreck Search'},
      desc:{ko:'기어월드 폐기 구역 외곽. 메카니카 폐기 부품과 메카니카 양자칩 코어가 섞여 있어. 잔해 탐색 3회.\n70% 자원 / 30% 잔해 해적.',
            en:'3× search. 메카니카 양자칩 cores + Mechanica scrap. 70/30 split.'},
      objectives:[
        {type:'explore', target:'p11_wreck', qty:3, label:{ko:'잔해 탐색 ×3', en:'Wreck ×3'}},
      ],
      rewardCr:40000, rewardVe:40,
      rewardItems:[{id:'R05', qty:3},{id:'G07', qty:1}],
      rewardFlags:[],
      cutscene_pre:null, cutscene_post:null
    },
    // ── Q14-M 장영실 합류 (영웅 퀘스트) ──
    {
      id:'p3_q14m', type:'hero_quest', category:'main', phase:3,
      heroId:'H02',
      ic:'🌟', npc:'장영실', npcIc:'⚙️', npcKey:'hero02',
      nm:{ko:'장영실 합류', en:'Jang Yeong-sil Joins'},
      desc:{ko:'장영실 제안: "거북선 — 내 손으로 완성시키겠소."\nG10 ×3 소비(거북선 용골 핵심 원자재) + G25 ×1 소비(제작 베이 초기화).\n장영실: "크리그 놈들 한 방 제대로 먹여줍시다."\n효과: 수리비 40% 할인 + 탐색 안개 제거.',
            en:'Jang: "I\'ll build the Geobukseon." G10 ×3 + G25 ×1. Effect: 40% repair discount + fog clear.'},
      objectives:[
        {type:'gather', item:'G10', qty:3, label:{ko:'크리그 무기 원석 ×3', en:'크리그 무기 원석 Krieg ore ×3'}},
        {type:'gather', item:'G25', qty:1, label:{ko:'메카니카 자동화 부품 ×1 제작 베이 초기화', en:'메카니카 자동화 부품 ×1 forge init'}},
      ],
      rewardCr:0, rewardVe:0,
      rewardItems:[],
      rewardFlags:['jangyeongsilm_joined','p3_planet_unlocked_P26'],
      cutscene_pre:null, cutscene_post:'p3_ch07a'
    }
  ],

  // ════════════════════════════════════════════════════════════════
  // 행성 15 · P26 저항군 최고 사령부 (+ P31 지구)
  // 팩션 특산물: G13·G15·G28·R06
  // 거북선 LGD01 레시피 해금 행성
  // ════════════════════════════════════════════════════════════════
  P26:[
    // ── Q15-01 P26 저항군 본부 합류 (메인) ──
    {
      id:'p3_q1501', type:'story_quest', category:'main', phase:3,
      ic:'🏛️', npc:'레인저 맥시모프', npcIc:'🎖️', npcKey:'delivery_F06',
      nm:{ko:'타이탄 기지 저항군 본부 합류', en:'Resistance HQ Arrival'},
      desc:{ko:'타이탄 기지 최고 사령부 정식 입장. 레인저 브리핑 — 저항군 전체 병력 현황 + 크리그 Kepler-442b 거점 정보 공유.',
            en:'Official entry. Ranger briefing on full Resistance forces + Krieg Kepler-442b base intel.'},
      objectives:[
        {type:'explore', target:'p26_arrival', qty:1, label:{ko:'본부 브리핑 청취', en:'Receive HQ briefing'}},
      ],
      rewardCr:100000, rewardVe:80,
      rewardItems:[{id:'G13', qty:3},{id:'G28', qty:2}],
      rewardFlags:['hq_p26_arrived'],
      cutscene_pre:'p3_ch07b', cutscene_post:null
    },
    // ── Q15-02 거북선 자원 지원 협상 (메인) ──
    {
      id:'p3_q1502', type:'story_quest', category:'main', phase:3,
      ic:'🤝', npc:'장영실', npcIc:'⚙️', npcKey:'hero02',
      nm:{ko:'거북선 자원 지원 협상', en:'Geobukseon Resource Talks'},
      desc:{ko:'레인저에게 저항군 반물질 반물질 비축분 협상. 장영실이 거북선 설계 도면 제시.\nG15 ×2 + 지구 빈티지 씨앗 ×1 소비(협상 성의 표시 — 지구 전통 방식) → 레인저 동의.\n레인저: "저항군 비축 R06 10단 팩. 거북선이 완성되면 우리 기함으로 써주세요."',
            en:'지구 철광석 ×2 + 지구 빈티지 씨앗 ×1 sincerity offering → Ranger agrees. 저항군 반물질 ×10 pack secured.'},
      objectives:[
        {type:'gather', item:'G15', qty:2, label:{ko:'지구 철광석 ×2 협상 성의', en:'지구 철광석 ×2 sincerity'}},
        {type:'gather', item:'G28', qty:1, label:{ko:'지구 빈티지 씨앗 ×1 협상 성의', en:'지구 빈티지 씨앗 ×1 sincerity'}},
      ],
      rewardCr:150000, rewardVe:90,
      rewardItems:[{id:'R06', qty:10}],
      rewardFlags:['r06_secured'],
      cutscene_pre:null, cutscene_post:null
    },
    // ── Q15-03 정식 연대 협약 체결 (메인) ──
    {
      id:'p3_q1503', type:'story_quest', category:'main', phase:3,
      ic:'📜', npc:'레인저 맥시모프', npcIc:'🎖️', npcKey:'delivery_F06',
      nm:{ko:'정식 연대 협약 체결', en:'Formal Alliance Pact'},
      desc:{ko:'공식 연대 협약 의식. 저항군 반물질 ×5 소비(반물질 에너지로 계약 봉인) → 협약 체결.\n저항군 함선 무상 지원 1기 (저항군 중형) + 명성 +80.',
            en:'저항군 반물질 ×5 (sealed by antimatter) → formal pact. Free 저항군 mid-class ship + reputation +80.'},
      objectives:[
        {type:'gather', item:'R06', qty:5, label:{ko:'저항군 반물질 ×5 계약 봉인', en:'저항군 반물질 ×5 seal'}},
      ],
      rewardCr:250000, rewardVe:120,
      rewardItems:[],
      rewardFlags:['resistance_alliance_formal'],
      cutscene_pre:null, cutscene_post:null
    },
    // ── Q15-04 저항군 대형 함선 구매 (서브 함선구매) ──
    {
      id:'p3_q1504', type:'story_quest', category:'sub', phase:3,
      ic:'🚀', npc:'마르코 폴로', npcIc:'🗺️', npcKey:'hero08',
      nm:{ko:'저항군 대형 함선 구매', en:'Buy Resistance Capital Ship'},
      desc:{ko:'마르코: "P26 도크에서 저항군 대형 함선 살 수 있어. HP가 모든 클래스 중 최강이야."\nF06 저항군 대형 함선(1,020,000₡) 구매 → 페이즈 4 크리그 요새 공략 대비.',
            en:'저항군 capital ship at 1,020,000₡ — HP top-class for Phase 4 fortress assault.'},
      objectives:[
        {type:'explore', target:'p26_capital_ship', qty:1, label:{ko:'저항군 대형 함선 구매', en:'Buy 저항군 capital'}},
      ],
      rewardCr:30000, rewardVe:0,
      rewardItems:[],
      rewardFlags:['resistance_flagship_purchased'],
      cutscene_pre:null, cutscene_post:null
    },
    // ── Q15-05 P26 아카이브 탐색 — 설계도 드롭 (서브) ──
    {
      id:'p3_q1505', type:'story_quest', category:'sub', phase:3,
      ic:'📜', npc:'장영실', npcIc:'⚙️', npcKey:'hero02',
      nm:{ko:'타이탄 기지 아카이브 — 설계도 탐색', en:'타이탄 기지 Archive — Blueprints'},
      desc:{ko:'저항군 기술 아카이브 전면 탐색. 타이탄 기지은 거북선 / H10 레비아탄 / H12 우르사 파쇄기 설계도 드롭 행성.\n탐색 중 각 5% 확률로 설계도 조각 획득.',
            en:'Search 타이탄 기지 archive. 5% each for 거북선 Geobukseon / H10 Leviathan / H12 Ursa Crusher fragments.'},
      objectives:[
        {type:'explore', target:'p26_archive', qty:3, label:{ko:'아카이브 탐색 ×3', en:'Archive search ×3'}},
      ],
      rewardCr:60000, rewardVe:50,
      rewardItems:[],
      rewardFlags:[],
      cutscene_pre:null, cutscene_post:null
    },
    // ── Q15-M 함선 제작 준비 선언 (이벤트 함선제작 · 페이즈 3 종료) ──
    {
      id:'p3_q15m', type:'story_quest', category:'hidden', phase:3,
      ic:'🛠️', npc:'장영실', npcIc:'⚙️', npcKey:'hero02',
      nm:{ko:'거북선 제작 준비 선언', en:'Geobukseon Forge Ready'},
      desc:{ko:'장영실이 타이탄 기지 제작 베이에서 거북선 제작 준비 완료 선언.\n거북선(거북선) 레시피 잠금 해제 → 도크 제작 탭에서 거북선 제작 가능.\n재료 조건: 저항군 반물질 ×25 / 은하 혼돈 결정 ×15 / 수퍼비아 중력자 ×10 / 크리그 마그마 코어 ×8.',
            en:'거북선 Geobukseon recipe unlocked at 타이탄 기지 forge bay. Materials: 저항군 반물질×25 / 은하 혼돈 결정×15 / 수퍼비아 중력자×10 / 크리그 마그마 코어×8.'},
      objectives:[
        {type:'explore', target:'p26_forge_declare', qty:1, label:{ko:'제작 베이 가동 선언', en:'Declare forge ready'}},
      ],
      rewardCr:100000, rewardVe:80,
      rewardItems:[],
      rewardFlags:['geobukseon_recipe_unlocked','phase3_complete'],
      cutscene_pre:null, cutscene_post:'p3_ch07c'
    }
  ]
};

// ═══════════════════════════════════════════════════════════════════
// Phase 3 컷씬 (한국어)
// 색상: 백구 #66ddff · 사령관 #00f3ff · NPC #a8b3c0
//      바텐더/상인 #d4a574 · 정보 #a78bfa · 적 #ef4444
//      시스템 #38bdf8 · 영웅 #ffd700 · 이순신 #c0a060 · 광개토 #ff9d52
//      장영실 #80e8c0 · 레인저(저항군) #88d65b
// ═══════════════════════════════════════════════════════════════════
const PHASE3_CUTSCENES_KO={

  // ─── CH05-A "첫 연락" (P22 도착) ───
  p3_ch05a:[
    {char:'hero01', name:'이순신', color:'#c0a060', text:'동쪽 항로 주파수... 케플러-62e 지하. 저항군 암호 채널이야. 내가 봉인되기 전에 함께했던 전우들의 후예가 그 기지를 운영하고 있어.'},
    {char:'hero08', name:'마르코 폴로', color:'#ffd700', text:'저항군? 거기가 얼마나 위험한지 알아? 치크스 사이 외톨이 거점이라고.'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'그래서 더 강하다.'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'...크리그에서 빼낸 물자를 가져가면 믿어줄 거야.'}
  ],

    // ─── CH05-B "연대의 뿌리" (Q11-M 완료) ───
  p3_ch05b:[
    {char:'gather_F06', name:'레인저 맥시모프', color:'#9ee7ff', text:'우리 저항군은 지구에서 쫓겨난 사람들이에요. 치크스-우르사 메이저가 지구를 봉쇄하고 크리그가 항로를 장악하기 전, 이순신 장군과 함께 맞서 싸웠던 선조들의 후손들이죠. 400년 전 이 방공호를 파고, 여기서 태어났어요.'},  // 수정 2026-06-11: 지구 봉쇄 주체 치크스-우르사 메이저로 정정 — GDD PHASE3_QUEST_CARDS L137 원문
    {char:'hero01', name:'이순신', color:'#c0a060', text:'당신들이 살아있었군." *(조용히)* "오래 기다렸겠군.'},
    {char:'maximov', name:'레인저', color:'#9ee7ff', text:'살아남은 것만으로 부족했어요. 지금 크리그가 보급망에 첩자를 심어두고 우리 내부를 흔들고 있어요. 믿을 수 있는 동료가 절실해요.'},
    {char:'hero08', name:'마르코 폴로', color:'#ffd700', text:'화성 저항군... 오딧세이 기지. 나도 그쪽 루트 알아. 화물 운반하다 두어 번 거쳤어.'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'함께 처리하자.'},
    {char:'maximov', name:'레인저', color:'#9ee7ff', text:'연대의 증표를 먼저. 지구 철광석 — 지구의 땅에서 온 것으로 서약하는 게 우리 전통이에요.'}
  ],

    // ─── CH05-C "내부의 적" (P23 도착) ───
  p3_ch05c:[
    {char:'hero08', name:'마르코 폴로', color:'#ffd700', text:'저 화물 분류 코드... 저항군 화물이 맞는데, 운항 패턴이 크리그 배급 루틴이야.'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'내부에 침투한 거야. 보급망을 장악해서 물자를 빼돌리고 있어.'},
    {char:'hero04', name:'가가린', color:'#88ccff', text:'먼저 들어가서 확인해야 해. 조용하게.'},
    {char:'hero08', name:'마르코 폴로', color:'#ffd700', text:'그건 내 전공이야.'}
  ],

    // ─── CH06-A "기업의 배신" (Q12-03 완료) ───
  p3_ch06a:[
    {char:'hero01', name:'이순신', color:'#c0a060', text:'코르넬리우스. 아우레우스 기업이 크리그에 기술 설계도를 판매하고 있다면... 단순한 이윤 추구가 아니야. 생체 병기 설계도가 거기로 흘러들어간 거야.'},
    {char:'hero04', name:'가가린', color:'#88ccff', text:'글리제 667Cc. 코르넬리우스 본사가 거기야.'},
    {char:'hero08', name:'마르코 폴로', color:'#ffd700', text:'오그렌이 말한 내부 고발자 — \'닥터 에바\'. 글리제 667Cc에 있어. 접촉하면 물증을 줄 수 있다고 했어.'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'증거 없이 아우레우스를 적으로 만들면 안 돼. 먼저 확인해야 해.'}
  ],

    // ─── CH06-B "광개토의 그림자" (Q13-05 완료) ───
  p3_ch06b:[
    {char:'hero08', name:'마르코 폴로', color:'#ffd700', text:'저 배... 본 적 있어. 은하 경매 시장에서 항상 최고가 써내는 자유 상인이야.'},
    {char:'hero03', name:'광개토', color:'#9ee7ff', text:'당신이 {사령관}인가. 크리그와 싸우고 있다고 들었소.'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'...광개토. 이름이 낯설지 않군." *(낮게)* "당신의 상선이 경매 시장 기록을 갖고 있다는 건 알고 있었소.'},
    {char:'hero03', name:'광개토', color:'#9ee7ff', text:'소문은 정확하군. 나는 이 은하계 어느 팩션에도 속하지 않아. 자유 상인이야. 하지만 크리그와 같이 거래하지는 않소.'},
    {char:'hero03', name:'광개토', color:'#9ee7ff', text:'이 행성을 내 손에 넣으면 — 당신과 거래하겠소. 단, 경매에서 최고가를 써내야 하오. 내가 합류할 만한 상대인지 보는 거요.'}
  ],

    // ─── CH06-C "설계의 명인" (Q13-H 완료) ───
  p3_ch06c:[
    {char:'hero01', name:'이순신', color:'#c0a060', text:'거북선 — 내가 임진왜란 때 만든 함선이야. 현대 재료로 재현하면 크리그 요새를 정면 돌파할 수 있어.'},
    {char:'hero04', name:'가가린', color:'#88ccff', text:'설계는 누가 해? 우리 중에 조선공학자 없잖아.'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'메카니카 기어월드. 그곳에 장영실이라는 기술자가 있어. 조선 시대 장영실의 기술 DNA를 이어받은 복제 기술자야.'},
    {char:'hero08', name:'마르코 폴로', color:'#ffd700', text:'\'장영실 2.0\'이라고 불려. 기어월드에서 전설이지.'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'그를 데려와야 해. 거북선은 그 없이는 완성할 수 없어.'}
  ],

    // ─── CH06-D "두 개의 이름" (P11 도착) ───
  p3_ch06d:[
    {char:'hero02', name:'장영실', color:'#a0d8ef', text:'거북선을 만들겠다고?'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'내 설계도를 갖고 왔어.'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'뭐든 구해 오겠어.'},
    {char:'hero02', name:'장영실', color:'#a0d8ef', text:'...중수소 배터리 3개. 내 시뮬레이터 연료야. 가져오면 들어줄게.'}
  ],

    // ─── CH07-A "귀환" (Q14-M 완료) ───
  p3_ch07a:[
    {char:'hero02', name:'장영실', color:'#a0d8ef', text:'거북선 완성에 저항군 반물질이 25개 필요해. 지금 우리한테 있는 건...'},
    {char:'hero08', name:'마르코 폴로', color:'#ffd700', text:'최대해봐야 8~10개.'},
    {char:'hero02', name:'장영실', color:'#a0d8ef', text:'저항군 본부 타이탄 기지에 비축이 있을 거야. 레인저한테 받아야 해.'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'타이탄 기지... 그리고. 지구.'},
    {char:'hero04', name:'가가린', color:'#88ccff', text:'지구." *(잠시 침묵)* "오래 꿈꿨어.'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'{사령관}. 방향은 타이탄 기지이야. 연대를 공식화하고 R06를 확보하자.'}
  ],

    // ─── CH07-B "본부" (P26 도착) ───
  p3_ch07b:[
    {char:'gather_F06', name:'레인저 맥시모프', color:'#9ee7ff', text:'당신들이 직접 왔군요. 코르넬리우스 사건 — 우리도 들었어요. 아이젠클로가 직접 기술을 구입했다면 생각보다 위협이 심각해요.'},
    {char:'hero02', name:'장영실', color:'#a0d8ef', text:'그래서 왔어요. 거북선을 만들 거야. 저항군 반물질 25개와 저항군 제작 베이 지원이 필요해요.'},
    {char:'maximov', name:'레인저', color:'#9ee7ff', text:'...공식 연대 협약을 먼저 체결해야 합니다. 지구의 방식으로.'}
  ],

    // ─── CH07-C "전쟁의 시작" (Q15-M 완료 · 페이즈 3 종료) ───
  p3_ch07c:[
    {char:'hero02', name:'장영실', color:'#a0d8ef', text:'저항군 반물질 재료 목록 완성됐어. 거북선 제작 시작 가능해.'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'저항군 반물질 ×25, 은하 혼돈 결정 ×15, 수퍼비아 중력자 ×10, 크리그 마그마 코어 ×8. 모두 확보하면 거북선이 완성된다.'},
    {char:'maximov', name:'레인저', color:'#9ee7ff', text:'크리그가 행성에 새 거점을 짓고 있어요. 아이젠클로가 직접 지휘 중이에요.'},
    {char:'hero04', name:'가가린', color:'#88ccff', text:'데이터 복호기가 해독한 정보와 일치해. Kepler-442b가 다음 목표야.'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'아이젠클로... 내 전술 데이터로 우리를 막으려 하겠지. 하지만 나는 그의 허점도 알고 있어.'},
    {char:'hero02', name:'장영실', color:'#a0d8ef', text:'거북선이 완성되면 아이젠클로의 요새도 뚫린다.'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'{사령관}. 페이즈 4 — 행성 16~20. 아이젠클로 추적. 거북선 완성.'}
  ],

  };

const PHASE3_CUTSCENES_EN={};

// 행성별 인트로 컷씬 — 행성 첫 도착 시 자동 재생
const PHASE3_PLANET_INTROS={
  P22:'p3_ch05a',  // 첫 연락
  P23:'p3_ch05c',  // 내부의 적
  P08:'p3_ch06a',  // 기업의 배신
  P11:'p3_ch06d',  // 두 개의 이름
  P26:'p3_ch07b'   // 본부
};

window.PHASE3_QUESTS=PHASE3_QUESTS;
window.PHASE3_CUTSCENES_KO=PHASE3_CUTSCENES_KO;
window.PHASE3_CUTSCENES_EN=PHASE3_CUTSCENES_EN;
window.PHASE3_PLANET_INTROS=PHASE3_PLANET_INTROS;

console.log('[PHASE3_QUESTS v1.0] Loaded — 30 quests across 5 planets (P22·P23·P08·P11·P26), 10 cutscenes');
})();
