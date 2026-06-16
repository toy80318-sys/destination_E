// ═══════════════════════════════════════════════════════════════════
// DESTINATION EARTH — Phase 2 퀘스트 + 컷씬 데이터 (v4.0)
// 출처: Doc/PHASE2_QUEST_CARDS.md v4.0
// 페이즈 2 · 결집 | 행성 P19·P04·P20·P07·P13 | CH03~CH05
// 27개 퀘스트 + 11개 컷씬 (한·영 분기)
// 영웅 합류: 이순신(H01) Q10-M @ P13 (페이즈 1 마르코 H08·가가린 H04 이미 영입)
// ─── 페이즈 1과의 정합성 ───
// 페이즈 1 v2.0에서 마르코(H08)·가가린(H04)는 이미 합류 상태이므로
// Q06-M·Q07-M의 "합류" 단계를 "신뢰 강화 + 결정적 정보 획득"으로 재해석
// ═══════════════════════════════════════════════════════════════════
(function(){
if(typeof window==='undefined') return;
if(window.PHASE2_QUESTS) return;

const PHASE2_QUESTS={

  // ════════════════════════════════════════════════════════════════
  // 행성 6 · P19 치크스 "우르사 알파" (외곽 첩보 거점 · 적대)
  // 팩션 특산물: G16·G17·G27·R02
  // ════════════════════════════════════════════════════════════════
  P19:[
    // ── Q06-01 우르사 정거장 장악 (메인 자동) ──
    {
      id:'p2_q0601', type:'story_quest', category:'main', phase:2,
      ic:'🛰️', npc:'시스템', npcIc:'📡', npcKey:'system',
      nm:{ko:'우르사 정거장 장악', en:'Seize Ursa Station'},
      desc:{ko:'치크스 전위대 3개 조 격퇴 → 정거장 착지·통제권 확보. 수리·잔해 탐색 기능 개방.',
            en:'Defeat 3 Cygnus vanguard squads → station control. Repair/wreck-search opens.'},
      objectives:[
        {type:'combat', target:'cygnus_vanguard', qty:3, label:{ko:'치크스 전위대 ×3 격퇴', en:'Defeat vanguard ×3'}},
      ],
      rewardCr:15000, rewardVe:40,
      rewardItems:[{id:'G17', qty:3}],
      rewardFlags:['ursa_station_seized'],
      cutscene_pre:'p2_ch03', cutscene_post:null
    },
    // ── Q06-02 잔해 구역 탐색 (서브) ──
    {
      id:'p2_q0602', type:'story_quest', category:'sub', phase:2,
      ic:'🔍', npc:'마르코 폴로', npcIc:'🗺️', npcKey:'hero08',
      nm:{ko:'잔해 구역 탐색', en:'Wreck Zone Search'},
      desc:{ko:'마르코: "전투 잔해 구역에 치크스 화물이 남아있어. 치크스 결정 파편을 모아두면 나중에 써먹을 수 있어."\nG17 ×1 소비(탐색 시동) → 잔해 탐색 → 치크스 결정 파편 ×2 + 치크스 결정석 ×1 회수.',
            en:'Marco: "Cygnus cargo in the wreck zone." Chiks Crystal Shard ×1 → search → Chiks Crystal Shard ×2 + Chiks Crystalstone ×1.'},
      objectives:[
        {type:'gather', item:'G17', qty:1, label:{ko:'치크스 결정 파편 ×1 탐색 시동', en:'Spend Chiks Crystal Shard ×1'}},
      ],
      rewardCr:8000, rewardVe:30,
      rewardItems:[{id:'G17', qty:2},{id:'R02', qty:1}],
      rewardFlags:[],
      cutscene_pre:null, cutscene_post:null
    },
    // ── Q06-03 중개상 추적 (메인) ──
    {
      id:'p2_q0603', type:'story_quest', category:'main', phase:2,
      ic:'🕵️', npc:'정거장 행상', npcIc:'🛍️', npcKey:'delivery_F05',
      nm:{ko:'중개상 추적', en:'Track the Broker'},
      desc:{ko:'행상: "마르코라는 밀수꾼이 어딘가 숨어있어. 정거장 지하 격납고 쪽일 거야."\nG17 ×1 지불(정보비) → 마르코 폴로 은신처 좌표 확인.',
            en:'Trader: "Marco hides in the lower hangar." Chiks Crystal Shard ×1 → coordinates.'},
      objectives:[
        {type:'gather', item:'G17', qty:1, label:{ko:'치크스 결정 파편 ×1 정보비', en:'Pay Chiks Crystal Shard ×1'}},
      ],
      rewardCr:5000, rewardVe:30,
      rewardItems:[],
      rewardFlags:['marco_location_known'],
      cutscene_pre:null, cutscene_post:null
    },
    // ── Q06-04 포자 압박 해결 (메인) ──
    {
      id:'p2_q0604', type:'story_quest', category:'main', phase:2,
      ic:'💨', npc:'마르코 폴로', npcIc:'🗺️', npcKey:'hero08',
      nm:{ko:'포자 압박 해결', en:'Spore Pressure Released'},
      desc:{ko:'마르코: "치크스가 내 화물칸에 치크스 변이 포자를 강제 하역하라고 압박 중이야. 지휘선에서 잠금 해제 코드를 빼와."\n치크스 지휘선 강습 → 코드 탈취 + 치크스 뇌수액 ×2 부수 노획.',
            en:'Marco: "Cygnus forces Chiks Mutation Spore onto my hold. Steal the override code." Storm command ship.'},
      objectives:[
        {type:'combat', target:'cygnus_command', qty:1, label:{ko:'치크스 지휘선 ×1 강습', en:'Storm command ship ×1'}},
      ],
      rewardCr:20000, rewardVe:50,
      rewardItems:[{id:'G27', qty:2}],
      rewardFlags:['marco_trust_1'],
      cutscene_pre:null, cutscene_post:null
    },
    // ── Q06-05 치크스 군주 격퇴 (메인 보스) ──
    {
      id:'p2_q0605', type:'story_quest', category:'main', phase:2,
      ic:'👑', npc:'마르코 폴로', npcIc:'🗺️', npcKey:'hero08',
      nm:{ko:'치크스 군주 격퇴', en:'Defeat Cygnus Warlord'},
      desc:{ko:'마르코: "우르사 치크스 군주 \'갈크리스\'를 쓰러뜨려야 내가 이 구역에서 완전히 자유로워져."\n보스 전투 → 갈크리스 격퇴. 포자 창고 탈취 + 치크스 결정석 ×2 노획.',
            en:'Marco: "Take down warlord Galkris." Boss combat → spore stockpile + Chiks Crystalstone ×2.'},
      objectives:[
        {type:'combat', target:'galkris_boss', qty:1, label:{ko:'갈크리스 보스 격퇴', en:'Defeat Galkris'}},
      ],
      rewardCr:35000, rewardVe:70,
      rewardItems:[{id:'G16', qty:3},{id:'R02', qty:2}],
      rewardFlags:['galkris_down'],
      cutscene_pre:null, cutscene_post:null
    },
    // ── Q06-M 마르코의 칩 해독 (영웅 신뢰 — 이미 합류 상태 · 아이템 제작) ──
    {
      id:'p2_q06m', type:'story_quest', category:'hidden', phase:2,
      ic:'🌟', npc:'마르코 폴로', npcIc:'🗺️', npcKey:'hero08',
      nm:{ko:'마르코의 칩 해독', en:'Marco\'s Chip Decode'},
      desc:{ko:'페이즈 1 버나드 프라임에서 합류한 마르코, 우르사 작전 완수 후 신뢰 한 단계 깊어짐.\n마르코 작업대에서 아우레우스 정보 칩 해독 — 치크스 결정 파편 ×2 소비(암호 해석 매체 제작) → 칩 해독 성공.\n해독 결과: "크리그 스파이가 카스텔룸 수퍼비아 집하장 —32구역 경유."',
            en:'Marco (already joined Phase 1) deepens trust. Chiks Crystal Shard ×2 → decode Aureus Information Chip → Krieg spy route to Castellum zone-32.'},
      objectives:[
        {type:'gather', item:'G17', qty:2, label:{ko:'치크스 결정 파편 ×2 암호 해석 매체', en:'Chiks Crystal Shard ×2 cipher media'}},
      ],
      rewardCr:30000, rewardVe:100,
      rewardItems:[],
      rewardFlags:['marco_trust_2','chip_decoded_lhs128','p2_planet_unlocked_P04'],
      cutscene_pre:null, cutscene_post:'p2_ch03a'
    }
  ],

  // ════════════════════════════════════════════════════════════════
  // 행성 7 · P04 수퍼비아 "카스텔룸" (폐자재 집하장)
  // 팩션 특산물: G01·G02·G03·G05·G22·R07
  // ════════════════════════════════════════════════════════════════
  P04:[
    // ── Q07-01 집하장 접근권 확보 (메인) ──
    {
      id:'p2_q0701', type:'story_quest', category:'main', phase:2,
      ic:'🛂', npc:'코르비누스', npcIc:'🧑‍💼', npcKey:'delivery_F01',
      nm:{ko:'집하장 접근권 확보', en:'Dockyard Access'},
      desc:{ko:'코르비누스: "이 구역 진입은 거래자만 가능해. 고철 프레임 ×2 납품부터."\nG01 ×2 소비 → —32구역 접근 허가.',
            en:'Corvinus: "Traders only. Scrap Frame ×2 first." Submit → zone-32 access.'},
      objectives:[
        {type:'gather', item:'G01', qty:2, label:{ko:'고철 프레임 ×2 납품', en:'Submit Scrap Frame ×2'}},
      ],
      rewardCr:10000, rewardVe:30,
      rewardItems:[],
      rewardFlags:['dockyard_access'],
      cutscene_pre:'p2_ch03b', cutscene_post:null
    },
    // ── Q07-02 스파이의 흔적 (메인) ──
    {
      id:'p2_q0702', type:'story_quest', category:'main', phase:2,
      ic:'🔬', npc:'마르코 폴로', npcIc:'🗺️', npcKey:'hero08',
      nm:{ko:'스파이의 흔적', en:'Spy Traces'},
      desc:{ko:'—32구역 고철 프레임 더미 해체 → 크리그 암호 메모 수색.\nG01 ×1 소비(해체 작업) → 크리그 암호 메모 발견 + 구형 캡슐 감지.',
            en:'Dismantle Scrap Frame pile in zone-32. Scrap Frame ×1 → find Krieg cipher memo + capsule trace.'},
      objectives:[
        {type:'gather', item:'G01', qty:1, label:{ko:'고철 프레임 ×1 해체 작업', en:'Dismantle Scrap Frame ×1'}},
      ],
      rewardCr:15000, rewardVe:40,
      rewardItems:[],
      rewardFlags:['krieg_memo_found','capsule_detected'],
      cutscene_pre:null, cutscene_post:null
    },
    // ── Q07-03 중력 시스템 응급 복구 (서브) ──
    {
      id:'p2_q0703', type:'story_quest', category:'sub', phase:2,
      ic:'⚙️', npc:'오스카르', npcIc:'🔧', npcKey:'gather_F01',
      nm:{ko:'중력 시스템 응급 복구', en:'Gravity System Repair'},
      desc:{ko:'오스카르: "수퍼비아 중력수정이 오정렬됐어. 집하장 컨베이어 전체가 멈출 것 같아."\nG05 ×2 제공 → 시스템 복구.',
            en:'Oscar: "Superbia Gravity Crystal misaligned, conveyor failing." Provide Superbia Gravity Crystal ×2 → restore.'},
      objectives:[
        {type:'gather', item:'G05', qty:2, label:{ko:'수퍼비아 중력수정 ×2 제공', en:'Provide Superbia Gravity Crystal ×2'}},
      ],
      rewardCr:10000, rewardVe:40,
      rewardItems:[{id:'G02', qty:3}],
      rewardFlags:['osc_favor'],
      cutscene_pre:null, cutscene_post:null
    },
    // ── Q07-04 주점 정보 수집 (서브 주점) ──
    {
      id:'p2_q0704', type:'story_quest', category:'sub', phase:2,
      ic:'🍺', npc:'{사령관}', npcIc:'🧑‍🚀', npcKey:'commander',
      nm:{ko:'주점 정보 수집', en:'Tavern Intel'},
      desc:{ko:'집하장 주점 방문 — 주점 크루 영입 기능 활용.\nG03 ×1 소비(분위기 조성) → 소문: "—32구역 폐기 구역에 이상한 구형 캡슐이 있어. 수퍼비아가 고철 취급한다더라."',
            en:'Visit dockyard tavern. Orion Whisky ×1 → rumor about an unknown capsule in zone-32.'},
      objectives:[
        {type:'gather', item:'G03', qty:1, label:{ko:'오리온 위스키 ×1 소비', en:'Consume Orion Whisky ×1'}},
      ],
      rewardCr:5000, rewardVe:25,
      rewardItems:[],
      rewardFlags:['capsule_rumor'],
      cutscene_pre:null, cutscene_post:null
    },
    // ── Q07-05 캡슐 발굴 (메인) ──
    {
      id:'p2_q0705', type:'story_quest', category:'main', phase:2,
      ic:'⛏️', npc:'{사령관}', npcIc:'🧑‍🚀', npcKey:'commander',
      nm:{ko:'VOSTOK 캡슐 발굴', en:'Recover VOSTOK Capsule'},
      desc:{ko:'폐기 구역 구형 캡슐 인양. 표면에 키릴 문자: "VOSTOK".\nG02 ×1 소비(중장비 가동) + 수퍼비아 귀족 향수 ×1 소비(코르비누스 추가 허가 뇌물) → 캡슐 인양 성공.',
            en:'Recover the spherical capsule marked "VOSTOK". Energy Core ×1 (heavy machinery) + Superbia Noble Perfume ×1 (bribe).'},
      objectives:[
        {type:'gather', item:'G02', qty:1, label:{ko:'에너지 코어 ×1 중장비 가동', en:'Spend Energy Core ×1'}},
        {type:'gather', item:'G22', qty:1, label:{ko:'수퍼비아 귀족 향수 ×1 뇌물', en:'Spend Superbia Noble Perfume ×1'}},
      ],
      rewardCr:15000, rewardVe:50,
      rewardItems:[],
      rewardFlags:['gagarin_capsule_found'],
      cutscene_pre:null, cutscene_post:null
    },
    // ── Q07-M 가가린의 항법 데이터 (영웅 신뢰 — 이미 합류 · 함선 강화) ──
    {
      id:'p2_q07m', type:'story_quest', category:'hidden', phase:2,
      ic:'🌟', npc:'가가린', npcIc:'🚀', npcKey:'hero04',
      nm:{ko:'가가린의 비밀 항로', en:'Gagarin\'s Secret Route'},
      desc:{ko:'페이즈 1 티가든에서 합류한 가가린, VOSTOK 캡슐 발굴로 옛 기억 회복.\n함선 강화 — 에너지 코어 ×2 + 수퍼비아 중력자 ×1 소비(항법 컴퓨터 재가동) → 가가린: "Поехали! 내 옛 데이터에 소련 비밀 항로가 있어. 오미크론 퍼세이 — 크리그 부품이 넘어가는 교점이야."',
            en:'Gagarin (already joined Phase 1) recovers old memories from VOSTOK. Energy Core ×2 + Superbia Graviton ×1 → "Soviet covert route to Omicron Persei."'},
      objectives:[
        {type:'gather', item:'G02', qty:2, label:{ko:'에너지 코어 ×2 항법 재가동', en:'Energy Core ×2 reactivation'}},
        {type:'gather', item:'R07', qty:1, label:{ko:'수퍼비아 중력자 ×1 중력자', en:'Superbia Graviton ×1 graviton'}},
      ],
      rewardCr:30000, rewardVe:100,
      rewardItems:[],
      rewardFlags:['gagarin_trust_2','smuggle_route_omicron','p2_planet_unlocked_P20'],
      cutscene_pre:null, cutscene_post:'p2_ch03c'
    },
    // ── Q07-S1 보스토크-1 정찰 모듈 제작 (서브 함선 제작) ──
    {
      id:'p2_q07s1', type:'story_quest', category:'sub', phase:2,
      ic:'🛠️', npc:'가가린', npcIc:'🚀', npcKey:'hero04',
      nm:{ko:'보스토크-1 정찰 모듈', en:'Vostok-1 Scout Module'},
      desc:{ko:'가가린: "캡슐 안에 소련 설계 도면이 있어. 수퍼비아 조선소 제작 베이를 쓰면 정찰 모듈을 만들 수 있어."\nG01 ×2 + 분열 배터리 ×1 + 수퍼비아 중력자 ×1 소비 → 보스토크-1 제작.\n효과: 잔해 탐색 쿨다운 -2초 · 탐지 범위 +15%.',
            en:'Scrap Frame ×2 + Fission Battery ×1 + Superbia Graviton ×1 → Vostok-1 scout module. Wreck search cooldown -2s, range +15%.'},
      objectives:[
        {type:'gather', item:'G01', qty:2, label:{ko:'고철 프레임 ×2', en:'Scrap Frame ×2'}},
        {type:'gather', item:'G07', qty:1, label:{ko:'분열 배터리 ×1', en:'Fission Battery ×1'}},
        {type:'gather', item:'R07', qty:1, label:{ko:'수퍼비아 중력자 ×1', en:'Superbia Graviton ×1'}},
      ],
      rewardCr:12000, rewardVe:50,
      rewardItems:[{id:'vostok1', qty:1}],
      rewardFlags:['vostok_module_crafted'],
      cutscene_pre:null, cutscene_post:null
    }
  ],

  // ════════════════════════════════════════════════════════════════
  // 행성 8 · P20 치크스/메카니카 접경 "오미크론 퍼세이" (밀수 교역소)
  // 특산물 풀: G07·G08·G09·G16·G25·R05
  // ════════════════════════════════════════════════════════════════
  P20:[
    // ── Q08-01 교역소 위장 잠입 (메인) ──
    {
      id:'p2_q0801', type:'story_quest', category:'main', phase:2,
      ic:'🎭', npc:'마르코 폴로', npcIc:'🗺️', npcKey:'hero08',
      nm:{ko:'교역소 위장 잠입', en:'Trade Post Infiltration'},
      desc:{ko:'마르코: "치크스 변이 포자 ×3을 거래 화물인 척 들고 들어가야 해."\nG16 ×3 소비(위장 화물) → 교역소 내부 잠입 성공.',
            en:'Marco: "Bring Chiks Mutation Spore ×3 as cover cargo." Chiks Mutation Spore ×3 → inside infiltration.'},
      objectives:[
        {type:'gather', item:'G16', qty:3, label:{ko:'치크스 변이 포자 ×3 위장 화물', en:'Chiks Mutation Spore ×3 cover cargo'}},
      ],
      rewardCr:10000, rewardVe:30,
      rewardItems:[],
      rewardFlags:['omicron_infiltrated'],
      cutscene_pre:'p2_ch04', cutscene_post:null
    },
    // ── Q08-02 밀수 증거 확보 (메인 · 아이템 제작) ──
    {
      id:'p2_q0802', type:'story_quest', category:'main', phase:2,
      ic:'💾', npc:'가가린', npcIc:'🚀', npcKey:'hero04',
      nm:{ko:'밀수 증거 확보', en:'Secure Smuggling Evidence'},
      desc:{ko:'교역 기록 서버 해킹 — 아이템 제작 연계.\n분열 배터리 ×1 소비(해킹 장비 가동) → 메카니카 자동화 부품이 크리그로 밀수되는 경로 데이터 확보. 증거물 메카니카 자동화 부품 ×1 회수.',
            en:'Hack the trade server. Fission Battery ×1 → route data + Mechanica Automation Part ×1 evidence.'},
      objectives:[
        {type:'gather', item:'G07', qty:1, label:{ko:'분열 배터리 ×1 해킹 장비', en:'Fission Battery ×1 hacker'}},
      ],
      rewardCr:15000, rewardVe:45,
      rewardItems:[{id:'G25', qty:1}],
      rewardFlags:['smuggle_evidence_secured'],
      cutscene_pre:null, cutscene_post:null
    },
    // ── Q08-03 치크스 감시선 격퇴 (메인 전투) ──
    {
      id:'p2_q0803', type:'story_quest', category:'main', phase:2,
      ic:'⚔️', npc:'시스템', npcIc:'📡', npcKey:'system',
      nm:{ko:'치크스 감시선 격퇴', en:'Cygnus Surveillance Combat'},
      desc:{ko:'잠입 사실이 치크스 감시선에 포착됨. 메카니카 광학 렌즈 ×1 소비(조준 시스템 임시 강화) → 감시선 2기 격퇴. 잔해 구역 개방.',
            en:'Cover blown. Mechanica Optical Lens ×1 (aim boost) → defeat 2 surveillance ships.'},
      objectives:[
        {type:'gather', item:'G08', qty:1, label:{ko:'메카니카 광학 렌즈 ×1 조준 강화', en:'Mechanica Optical Lens ×1 aim boost'}},
        {type:'combat', target:'cygnus_surveillance', qty:2, label:{ko:'감시선 ×2 격퇴', en:'Defeat surveillance ×2'}},
      ],
      rewardCr:25000, rewardVe:60,
      rewardItems:[{id:'G17', qty:3},{id:'R02', qty:1}],
      rewardFlags:['cygnus_surveillance_down'],
      cutscene_pre:null, cutscene_post:null
    },
    // ── Q08-04 잔해 구역 탐색 (서브) ──
    {
      id:'p2_q0804', type:'story_quest', category:'sub', phase:2,
      ic:'🔍', npc:'가가린', npcIc:'🚀', npcKey:'hero04',
      nm:{ko:'잔해 구역 탐색', en:'Wreck Zone Search'},
      desc:{ko:'격퇴한 치크스 감시선 잔해 탐색. 접경지라 치크스 결정석와 메카니카 부품이 섞여 있음. 잔해 탐색 1~3회.',
            en:'Search Cygnus wreckage. Mixed Chiks Crystalstone + Mechanica parts.'},
      objectives:[
        {type:'explore', target:'p20_wreck', qty:2, label:{ko:'잔해 탐색 ×2', en:'Wreck search ×2'}},
      ],
      rewardCr:8000, rewardVe:25,
      rewardItems:[{id:'G17', qty:1},{id:'R02', qty:1}],
      rewardFlags:[],
      cutscene_pre:null, cutscene_post:null
    },
    // ── Q08-05 에이전트 오르크 추적 (메인 보스) ──
    {
      id:'p2_q0805', type:'story_quest', category:'main', phase:2,
      ic:'🎯', npc:'{사령관}', npcIc:'🧑‍🚀', npcKey:'commander',
      nm:{ko:'에이전트 오르크 추적', en:'Hunt Agent Ork'},
      desc:{ko:'오르크를 격리 구역에서 포위. 협상 시도 — 중수소 배터리 ×2 제시 → 오르크 배신 → 전투 → 체포.\n심문: "크리그가 LHS1140-b 지하에 생체 병기 제조창을 운영 중이야. 테슬라가 잡혀 있어."',
            en:'Corner Ork. Deuterium Battery ×2 offer → betrayal → combat → capture. Interrogation: "Krieg bioweapon lab at LHS1140-b. Tesla captive."'},
      objectives:[
        {type:'gather', item:'G09', qty:2, label:{ko:'중수소 배터리 ×2 매수 시도', en:'Deuterium Battery ×2 bribe attempt'}},
        {type:'combat', target:'agent_ork', qty:1, label:{ko:'오르크 체포', en:'Capture Ork'}},
      ],
      rewardCr:40000, rewardVe:80,
      rewardItems:[{id:'R05', qty:3}],
      rewardFlags:['lhs_facility_known','tesla_captive_known','p2_planet_unlocked_P07'],
      cutscene_pre:null, cutscene_post:'p2_ch04a'
    }
  ],

  // ════════════════════════════════════════════════════════════════
  // 행성 9 · P07 아우레우스 "LHS1140-b" (크리그 비밀 점령 지하 제조창)
  // 특산물: G06·G07·G25·R03 / 크리그 노획: G10·G26
  // ════════════════════════════════════════════════════════════════
  P07:[
    // ── Q09-01 지하 진입로 확보 (메인) ──
    {
      id:'p2_q0901', type:'story_quest', category:'main', phase:2,
      ic:'⛓️', npc:'가가린', npcIc:'🚀', npcKey:'hero04',
      nm:{ko:'지하 진입로 확보', en:'Underground Route'},
      desc:{ko:'광산 노동자에게 LHS 크리스탈 ×2 제공(정보비) → 지하 제조창 비밀 진입로 확인.\n노동자: "17층에... 낯선 사람들이 있어요. 우리도 무서워요."',
            en:'LHS Crystal ×2 to miners → underground route revealed. Worker: "Strangers on level 17..."'},
      objectives:[
        {type:'gather', item:'G06', qty:2, label:{ko:'LHS 크리스탈 ×2 정보비', en:'LHS Crystal ×2 intel'}},
      ],
      rewardCr:10000, rewardVe:30,
      rewardItems:[],
      rewardFlags:['underground_route_found'],
      cutscene_pre:'p2_ch04b', cutscene_post:null
    },
    // ── Q09-02 지하 경비대 격퇴 (메인 전투) ──
    {
      id:'p2_q0902', type:'story_quest', category:'main', phase:2,
      ic:'⚔️', npc:'{사령관}', npcIc:'🧑‍🚀', npcKey:'commander',
      nm:{ko:'지하 경비대 격퇴', en:'Underground Guard Combat'},
      desc:{ko:'지하 17층 진입 → 크리그 경비대 3개 조 교전.\nG27 ×1 소비(치크스 화학 성분이 크리그 생체 경비 장비를 교란) → 경비대 마비 후 격퇴.',
            en:'Level 17 → 3 Krieg squads. Chiks Brain Fluid ×1 (chemical disruption) → paralyze + defeat.'},
      objectives:[
        {type:'gather', item:'G27', qty:1, label:{ko:'치크스 뇌수액 ×1 화학 교란', en:'Chiks Brain Fluid ×1 disruption'}},
        {type:'combat', target:'krieg_guard', qty:3, label:{ko:'크리그 경비대 ×3', en:'Krieg guards ×3'}},
      ],
      rewardCr:25000, rewardVe:60,
      rewardItems:[{id:'G10', qty:2},{id:'G26', qty:1}],
      rewardFlags:['krieg_guards_down'],
      cutscene_pre:null, cutscene_post:null
    },
    // ── Q09-03 테슬라 구출 (메인) ──
    {
      id:'p2_q0903', type:'story_quest', category:'main', phase:2,
      ic:'⚡', npc:'테슬라', npcIc:'🔬', npcKey:'hero07',
      nm:{ko:'테슬라 구출', en:'Rescue Tesla'},
      desc:{ko:'격리 구역 잠금 해제: 메카니카 자동화 부품 ×1 소비(격리 도어 바이패스) → 테슬라 구출.\n테슬라: "크리그 최종 요새는 아이젠콕야. 지하 감옥에 이순신 장군 캡슐이 수백 년째 봉인돼 있어. 크리그가 방패막이로 쓰고 있는 거야."',
            en:'Mechanica Automation Part ×1 → bypass quarantine. Tesla rescued. "Final fortress at Eisenkock. Yi Sun-sin sealed for centuries — Krieg uses him as shield."'},
      objectives:[
        {type:'gather', item:'G25', qty:1, label:{ko:'메카니카 자동화 부품 ×1 도어 바이패스', en:'Mechanica Automation Part ×1 door bypass'}},
      ],
      rewardCr:30000, rewardVe:80,
      rewardItems:[],
      rewardFlags:['kepler22b_fortress_known','turtle_captain_location','tesla_rescued'],
      cutscene_pre:null, cutscene_post:'p2_ch04c'
    },
    // ── Q09-04 제조창 파괴 (메인 타임어택) ──
    {
      id:'p2_q0904', type:'story_quest', category:'main', phase:2,
      ic:'💥', npc:'테슬라', npcIc:'🔬', npcKey:'hero07',
      nm:{ko:'제조창 파괴', en:'Destroy the Lab'},
      desc:{ko:'테슬라: "아우레우스 태양핵 코어 재료를 에너지 주노드에 삽입하면 연쇄 과부하가 일어나."\nR03 ×1 소비(과부하 유도) → 60초 탈출. 탈출 경로에서 분열 배터리 ×2 회수 가능.',
            en:'Tesla: "Aureus Solar Core in the main node triggers overload." Aureus Solar Core ×1 → 60s escape. Fission Battery ×2 along route.'},
      objectives:[
        {type:'gather', item:'R03', qty:1, label:{ko:'아우레우스 태양핵 ×1 과부하 유도', en:'Aureus Solar Core ×1 overload'}},
      ],
      rewardCr:35000, rewardVe:90,
      rewardItems:[{id:'G07', qty:2},{id:'R04', qty:2}],
      rewardFlags:['lhs_facility_destroyed'],
      cutscene_pre:null, cutscene_post:null
    },
    // ── Q09-05 기지 폐허 잔해 탐색 (서브) ──
    {
      id:'p2_q0905', type:'story_quest', category:'sub', phase:2,
      ic:'🔍', npc:'마르코 폴로', npcIc:'🗺️', npcKey:'hero08',
      nm:{ko:'기지 폐허 잔해 탐색', en:'Base Ruin Search'},
      desc:{ko:'제조창 폭파 후 폐허 구역 탐색. 크리그 비축 재료와 아우레우스 태양핵·크리그 마그마 코어·크리그 무기 원석 수집 가능. 탐색 1~3회.',
            en:'Search ruins after blast. Aureus Solar Core / Krieg Magma Core / Krieg Weapon Ore possible.'},
      objectives:[
        {type:'explore', target:'p07_ruin', qty:2, label:{ko:'잔해 탐색 ×2', en:'Ruin search ×2'}},
      ],
      rewardCr:8000, rewardVe:25,
      rewardItems:[{id:'R03', qty:1},{id:'G10', qty:1}],
      rewardFlags:['p2_planet_unlocked_P13'],
      cutscene_pre:null, cutscene_post:null
    }
  ],

  // ════════════════════════════════════════════════════════════════
  // 행성 10 · P13 크리그 "아이젠콕" (최정예 요새 · 적대)
  // 특산물: G10·G11·G12·G26·R04
  // 이순신 봉인 해제: G18 난중일기 영인본 (페이즈 3 P22에서 보충)
  // ════════════════════════════════════════════════════════════════
  P13:[
    // ── Q10-01 외곽 포대 무력화 (메인 전투) ──
    {
      id:'p2_q1001', type:'story_quest', category:'main', phase:2,
      ic:'🛰️', npc:'가가린', npcIc:'🚀', npcKey:'hero04',
      nm:{ko:'외곽 포대 무력화', en:'Disable Outer Turrets'},
      desc:{ko:'균열대 진입로를 막는 크리그 무기 원석 무기 원석 포대 3기 파괴 → 셔틀 진입로 확보. 잔해 구역 개방.',
            en:'Destroy 3 Krieg Weapon Ore turrets blocking the rift entrance.'},
      objectives:[
        {type:'combat', target:'krieg_turret', qty:3, label:{ko:'크리그 포대 ×3 파괴', en:'Destroy turrets ×3'}},
      ],
      rewardCr:30000, rewardVe:60,
      rewardItems:[{id:'G10', qty:2},{id:'G11', qty:2}],
      rewardFlags:['outer_turrets_down'],
      cutscene_pre:'p2_ch04d', cutscene_post:null
    },
    // ── Q10-02 지하 감옥 진입 (메인 전투) ──
    {
      id:'p2_q1002', type:'story_quest', category:'main', phase:2,
      ic:'🔓', npc:'{사령관}', npcIc:'🧑‍🚀', npcKey:'commander',
      nm:{ko:'지하 감옥 진입', en:'Reach Prison Level'},
      desc:{ko:'크리그 전투 자극제 ×1 소비(크리그 위장 약물) → 감옥 층 접근.\nG11 ×1 소비(경비 반장 매수 시도) → 거절 → 전투 → 격퇴.\n지하 아카이브에서 거북선 설계도 조각 5% 드롭.',
            en:'Krieg Combat Stimulant ×1 disguise + Krieg Bloodstone ×1 bribe attempt → refused → fight. Turtle Ship fragment 5% drop in archive.'},
      objectives:[
        {type:'gather', item:'G26', qty:1, label:{ko:'크리그 전투 자극제 ×1 위장 약물', en:'Krieg Combat Stimulant ×1 disguise'}},
        {type:'gather', item:'G11', qty:1, label:{ko:'크리그 혈철석 ×1 매수 시도', en:'Krieg Bloodstone ×1 bribe'}},
      ],
      rewardCr:30000, rewardVe:70,
      rewardItems:[{id:'G12', qty:2}],
      rewardFlags:['prison_level_reached'],
      cutscene_pre:null, cutscene_post:null
    },
    // ── Q10-03 이순신 캡슐 봉인 해제 (메인 특수 · G18 필요) ──
    {
      id:'p2_q1003', type:'story_quest', category:'main', phase:2,
      ic:'📜', npc:'테슬라', npcIc:'🔬', npcKey:'hero07',
      nm:{ko:'이순신 캡슐 봉인 해제', en:'Unseal Yi Sun-sin Capsule'},
      desc:{ko:'이순신 캡슐 인식 코드: 난중일기 영인본 필요.\nG18 소비(캡슐 인식 장치 활성화) → 봉인 해제.\n이순신: "이곳이... 얼마나 흘렀느냐. 나를 깨운 자가 {사령관}인가. 빚을 졌구나."',
            en:'Capsule code: Nanjung Ilgi Facsimile. Nanjung Ilgi Facsimile ×1 → unseal. Yi Sun-sin: "How long has it been... I owe you a debt."'},
      objectives:[
        {type:'gather', item:'G18', qty:1, label:{ko:'난중일기 영인본 ×1', en:'Nanjung Ilgi Facsimile ×1'}},
      ],
      rewardCr:30000, rewardVe:80,
      rewardItems:[],
      rewardFlags:['turtle_captain_freed'],
      locked:true,
      lockReason:{ko:'페이즈 3 저항군 기지(저항군 벙커존)에서 난중일기 영인본을 먼저 입수하라.',
                  en:'Acquire Nanjung Ilgi Facsimile at the Resistance base (underground bunker) in Phase 3 first.'},
      cutscene_pre:null, cutscene_post:null
    },
    // ── Q10-M 이순신(H01) 합류 (영웅 퀘스트 + 세트 보상) ──
    {
      id:'p2_q10m', type:'hero_quest', category:'main', phase:2,
      heroId:'H01',
      ic:'⚔️', npc:'이순신', npcIc:'🛡️', npcKey:'hero01',
      nm:{ko:'이순신 장군 합류', en:'Admiral Yi Sun-sin Joins'},
      desc:{ko:'Q10-03 캡슐 봉인 해제 완료 → 이순신 장군 합류.\n합류 보상: SW01 이순신 무기 세트 (ATT +180) + SA01 이순신 장갑 세트 (HP +5,000 / DEF +60) 자동 인벤토리.',
            en:'Yi Sun-sin joins. Reward: SW01 (ATT +180) + SA01 (HP+5000 / DEF+60) auto-equipped.'},
      objectives:[
        {type:'explore', target:'yi_join', qty:1, label:{ko:'이순신 합류 확정', en:'Confirm Yi Sun-sin'}},
      ],
      rewardCr:0, rewardVe:0,
      rewardItems:[{id:'SW01', qty:1},{id:'SA01', qty:1}],
      rewardFlags:['turtle_captain_joined'],
      cutscene_pre:null, cutscene_post:'p2_yi_join'
    },
    // ── Q10-04 아이젠클로 대면 · 전략 철수 (메인 자동) ──
    {
      id:'p2_q1004', type:'story_quest', category:'main', phase:2,
      ic:'🏃', npc:'시스템', npcIc:'📡', npcKey:'system',
      nm:{ko:'아이젠클로 대면 · 전략 철수', en:'Eisenklaue · Strategic Retreat'},
      desc:{ko:'크리그 지휘관 아이젠클로 등장: "그 캡슐은 우리 방어 코어야. 내놔라."\n전면전 불가. 이순신: "지금은 물러서는 것이 전략이다. 철수."\nG11 ×1 소비(연막 폭발물 즉석 제조) → 탈출 성공. 페이즈 2 완료.',
            en:'Eisenklaue appears. Yi Sun-sin: "Retreat is strategy now." Krieg Bloodstone ×1 (smoke bomb) → escape. Phase 2 done.'},
      objectives:[
        {type:'gather', item:'G11', qty:1, label:{ko:'크리그 혈철석 ×1 연막 폭발물', en:'Krieg Bloodstone ×1 smoke bomb'}},
      ],
      rewardCr:50000, rewardVe:100,
      rewardItems:[],
      rewardFlags:['eisenklaue_encountered','phase2_complete'],
      cutscene_pre:null, cutscene_post:'p2_ch05'
    }
  ]
};

// ═══════════════════════════════════════════════════════════════════
// Phase 2 컷씬 (한국어)
// 색상: 백구 #66ddff · 사령관 #00f3ff · NPC #a8b3c0
//      바텐더/상인 #d4a574 · 정보 #a78bfa · 크리그/적 #ef4444
//      시스템 #38bdf8 · 영웅 #ffd700 · 이순신 #c0a060
// ═══════════════════════════════════════════════════════════════════
const PHASE2_CUTSCENES_KO={

  // ─── CH03 "칩 해독의 열쇠" (P19 도착) ───
  p2_ch03:[
    {char:'nav_ai', name:'항법 AI', color:'#38bdf8', text:'아우레우스 정보 칩 해독 시도 중 — 암호화 확인. 치크스 변조 주파수 적용. 현재 장비로는 해독 불가.'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'마르코 폴로. 이 구역 독립 중개상이라고 했어. 치크스 눈 피해 밀무역하는 사람 — 그가 통신 장비를 갖고 있을 거야.'},
    {char:'chiks_vanguard', name:'치크스 전위대', color:'#ef4444', text:'이곳은 치크스 관할 공역이다. 통행 허가 없이 접근은 적대 행위로 간주한다.'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'여긴 은하 공용 항로야. 비켜.'},
    {char:'baekgu2_anger1', name:'백구', color:'#66ddff', text:'전투 모드 전환. 적 3기 포착.'}
  ],

  // ─── CH03-A "마르코의 첫 정보" (Q06-M 완료) ───
  p2_ch03a:[
    {char:'hero08', name:'마르코 폴로', color:'#ffd700', text:'{사령관}, 됐어. 카스텔룸 수퍼비아 집하장 — 32구역. 크리그 스파이가 고철 프레임 속에 정보를 숨겨 운반했어. 수퍼비아 놈들은 그냥 고철로 처리했을 거야.'},
    {char:'hero08', name:'마르코 폴로', color:'#ffd700', text:'그리고... 이상한 게 하나 더. 그 구역 폐기물 목록에 없는 구형 캡슐 하나. 수백 년 전 설계야.'}
  ],

    // ─── CH03-B "고철 더미 속의 비밀" (P04 도착) ───
  p2_ch03b:[
    {char:'hero08', name:'마르코 폴로', color:'#ffd700', text:'저기 폐기 구역 끝... 목록에 없는 구형 물체야. 설계가 지금과 전혀 달라. 생명 반응이 미약하게 잡혀.'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'발굴한다.'}
  ],

    // ─── CH03-C "가가린의 항법 데이터" (Q07-M 완료) ───
  p2_ch03c:[
    {char:'hero04', name:'가가린', color:'#88ccff', text:'이 항로 — 60년대에 소련 우주국이 비밀 분류한 경로야. 지금은 크리그가 쓰고 있어. 메카니카 부품이 글리제 436 분지 교역소에서 크리그로 넘어가. 에이전트 코드명 \'오르크\'.'},
    {char:'hero08', name:'마르코 폴로', color:'#ffd700', text:'오르크... 접경지 밀수꾼들 사이에서 이름이 나왔어. 치크스-메카니카 접경이라 단속이 애매한 구역이야.'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'오르크를 잡으면 다음 경로가 열려. 출발한다.'}
  ],

    // ─── CH04 "접경의 이중 거래" (P20 도착) ───
  p2_ch04:[
    {char:'hero04', name:'가가린', color:'#ffd700', text:'저 교역소 — 공식 목록에 없는 화물이 계속 들어와. 에이전트 \'오르크\'가 여기 담당이야.'},
    {char:'hero08', name:'마르코 폴로', color:'#ffd700', text:'치크스 감시선 순찰 중이야. 잠입은 거래자 위장이 최선이야.'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'치크스 변이 포자 ×3 있지. 이 구역 화물이야. 써먹자.'}
  ],

  // ─── CH04-A "다음 목적지" (Q08-05 완료) ───
  p2_ch04a:[
    {char:'hero04', name:'가가린', color:'#88ccff', text:'테슬라가 납치됐어. 메카니카 최고 설계자야. 크리그가 억지로 생체 병기를 설계하게 만들고 있어.'},
    {char:'hero08', name:'마르코 폴로', color:'#ffd700', text:'LHS1140-b 표면은 LHS 크리스탈 광산이야. 지하 17층까지 굴착했다는 이야기는 들어봤어.'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'병기 설계도를 없애야 해. 테슬라도 구해야 하고.'}
  ],

    // ─── CH04-B "표면 아래" (P07 도착) ───
  p2_ch04b:[
    {char:'hero04', name:'가가린', color:'#88ccff', text:'저 컨베이어 동선 이상해. 크리스탈 일부가 지하로 내려가고 있어. 광산 창고 치고 루트가 너무 깊어.'},
    {char:'hero08', name:'마르코 폴로', color:'#ffd700', text:'노동자들이 겁먹어 있어. 크리그한테 협박당하고 있는 거야.'}
  ],

    // ─── CH04-C "이순신의 이름" (Q09-03 테슬라 구출 후) ───
  p2_ch04c:[
    {char:'hero07', name:'테슬라', color:'#66ffff', text:'크리그가 이순신 장군 캡슐을 왜 봉인했는지 알아? 이순신 장군은 수백 년 전 — 치크스-우르사 메이저가 지구를 봉쇄하고 크리그 아이젠클로가 항로를 장악할 때 — 끝까지 저항했던 유일한 존재야. 그 전술 데이터를 아이젠클로가 강제 추출해 크리그 방어 알고리즘에 통합했어. 살아있는 방패인 거야. 이순신 장군이 살아서 움직이면 크리그 방어 알고리즘이 스스로 무너질 수도 있어.'},  // 수정 2026-06-11: 지구 봉쇄 주체 치크스-우르사 메이저로 정정 — GDD PHASE2_QUEST_CARDS L511 원문
    {char:'hero04', name:'가가린', color:'#88ccff', text:'그분을 꺼내면... 크리그 방어 알고리즘의 약점을 우리가 갖는 건가?'},
    {char:'hero07', name:'테슬라', color:'#66ffff', text:'정확해. 그래서 크리그는 절대 놓지 않으려는 거야.'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'지하 감옥 진입 루트 — 마르코, 구역 지도 뽑을 수 있어?'},
    {char:'hero08', name:'마르코 폴로', color:'#ffd700', text:'...당연하지.'}
  ],

    // ─── CH04-D "요새 앞에서" (P13 도착) ───
  p2_ch04d:[
    {char:'hero08', name:'마르코 폴로', color:'#ffd700', text:'전면전은 무리야. 외곽 포대만 해도 우리 세 배야.'},
    {char:'hero04', name:'가가린', color:'#88ccff', text:'지하 감옥 진입 루트가 있어. 자연 균열대 — 셔틀 한 대가 들어갈 수 있는 폭이야.'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'이순신 장군이 수백 년째 저기 갇혀 있어. 우리가 끝내야 해.'}
  ],

    // ─── 이순신 합류 (Q10-M) ───
  p2_yi_join:[
    {char:'hero01', name:'이순신', color:'#c0a060', text:'[조선어] 이곳이... 얼마나 흘렀느냐.'},
    {char:'baekgu1', name:'백구', color:'#66ddff', text:'우주어 자동 번역 활성화.'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'나를 깨운 자가 {사령관}인가. 빚을 졌구나.'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'... 무기와 장갑이 함께 봉인되어 있었다. 가져가시오. 내 손이 이미 그대의 손이 되었으니.'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'장군. 함께 갑시다.'},
    {char:'baekgu2_smile1', name:'백구', color:'#66ddff', text:'SW01 무기 세트 + SA01 장갑 세트 자동 장착 완료. 화력 대폭 상승.'}
  ],

  // ─── CH05 "집결" (페이즈 2 결말 · Q10-04 완료) ───
  p2_ch05:[
    {char:'hero01', name:'이순신', color:'#c0a060', text:'아이젠클로... 내가 봉인된 이유가 저 자였군. 내 전술 데이터를 방패로 쓰다니. 페이즈 3에서 반드시 청산해야 할 빚이 생겼다.'},
    {char:'hero04', name:'가가린', color:'#ffd700', text:'크리그 방어 알고리즘 약점을 이제 우리가 알아. 이순신 장군의 전술이 거꾸로 그들의 허점을 가리켜.'},
    {char:'hero08', name:'마르코 폴로', color:'#ffd700', text:'다음 루트는 내가 잡겠어. 크리그 보급 거점 — 전부 알고 있어.'},
    {char:'hero07', name:'테슬라', color:'#ffd700', text:'생체 병기 설계도는 LHS에서 파괴했어. 하지만 백업이 어딘가에 있을 거야.'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'다음 계획을 세우자. {사령관}.'},
    {char:'baekgu1', name:'백구', color:'#66ddff', text:'페이즈 2 완료. 페이즈 3 — 행성 11~15 · 저항군과의 연대.'}
  ]
};

const PHASE2_CUTSCENES_EN={

  // ─── CH03 "The Key to Decrypting the Chip" (P19 arrival) ───
  p2_ch03:[
    {char:'nav_ai', name:'Nav AI', color:'#38bdf8', text:'Attempting to decrypt the Aureus data chip — encryption confirmed. Chiks scrambling frequency detected. Decryption impossible with current equipment.'},
    {char:'commander', name:'{commander}', color:'#00f3ff', text:'Marco Polo. They say he\'s an independent broker in this sector. A smuggler who slips past Chiks eyes — he\'ll have the comms gear we need.'},
    {char:'chiks_vanguard', name:'Chiks Vanguard', color:'#ef4444', text:'This is Chiks-controlled airspace. Approaching without clearance will be treated as a hostile act.'},
    {char:'commander', name:'{commander}', color:'#00f3ff', text:'This is a galactic public lane. Move.'},
    {char:'baekgu2_anger1', name:'Baekgu', color:'#66ddff', text:'Switching to combat mode. Three enemy units detected.'}
  ],

  // ─── CH03-A "Marco\'s First Intel" (Q06-M complete) ───
  p2_ch03a:[
    {char:'hero08', name:'Marco Polo', color:'#ffd700', text:'{commander}, I\'ve got it. Castellum, the Superbia depot — Sector 32. A Krieg spy hid the intel inside a scrap frame to smuggle it out. The Superbia crew probably just processed it as junk.'},
    {char:'hero08', name:'Marco Polo', color:'#ffd700', text:'And... one more odd thing. An old capsule that isn\'t on that sector\'s disposal manifest. The design is centuries old.'}
  ],

    // ─── CH03-B "Secret in the Scrap Heap" (P04 arrival) ───
  p2_ch03b:[
    {char:'hero08', name:'Marco Polo', color:'#ffd700', text:'There, at the edge of the disposal zone... an old object that\'s not on any manifest. The design is nothing like ours. I\'m picking up a faint life sign.'},
    {char:'commander', name:'{commander}', color:'#00f3ff', text:'We dig it out.'}
  ],

    // ─── CH03-C "Gagarin\'s Nav Data" (Q07-M complete) ───
  p2_ch03c:[
    {char:'hero04', name:'Gagarin', color:'#88ccff', text:'This route — the Soviet space agency classified it back in the sixties. Krieg uses it now. Mechanica parts pass to Krieg at the Gliese 436 basin trading post. The agent\'s codename is \'Ork\'.'},
    {char:'hero08', name:'Marco Polo', color:'#ffd700', text:'Ork... that name\'s come up among the border smugglers. It\'s the Chiks-Mechanica frontier, so jurisdiction is murky there.'},
    {char:'commander', name:'{commander}', color:'#00f3ff', text:'Catch Ork and the next route opens up. We move out.'}
  ],

    // ─── CH04 "Double Dealing at the Frontier" (P20 arrival) ───
  p2_ch04:[
    {char:'hero04', name:'Gagarin', color:'#ffd700', text:'That trading post — cargo keeps arriving that\'s on no official manifest. The agent \'Ork\' runs things here.'},
    {char:'hero08', name:'Marco Polo', color:'#ffd700', text:'Chiks surveillance ships are on patrol. Our best bet for infiltration is to pose as traders.'},
    {char:'commander', name:'{commander}', color:'#00f3ff', text:'We\'ve got three Chiks mutant spores. That\'s cargo from this sector. Let\'s put it to use.'}
  ],

  // ─── CH04-A "The Next Destination" (Q08-05 complete) ───
  p2_ch04a:[
    {char:'hero04', name:'Gagarin', color:'#88ccff', text:'Tesla has been abducted. Mechanica\'s greatest engineer. Krieg is forcing him to design a bio-weapon.'},
    {char:'hero08', name:'Marco Polo', color:'#ffd700', text:'The surface of Mercatus is an LHS crystal mine. I\'ve heard they\'ve dug down as far as seventeen levels underground.'},
    {char:'commander', name:'{commander}', color:'#00f3ff', text:'We have to destroy that weapon\'s blueprints. And we have to save Tesla too.'}
  ],

    // ─── CH04-B "Beneath the Surface" (P07 arrival) ───
  p2_ch04b:[
    {char:'hero04', name:'Gagarin', color:'#88ccff', text:'That conveyor line is strange. Some of the crystal is being sent underground. The route runs far too deep for a mine warehouse.'},
    {char:'hero08', name:'Marco Polo', color:'#ffd700', text:'The workers are terrified. Krieg is keeping them in line through fear.'}
  ],

    // ─── CH04-C "The Name Yi Sun-sin" (Q09-03, after rescuing Tesla) ───
  p2_ch04c:[
    {char:'hero07', name:'Tesla', color:'#66ffff', text:'Do you know why Krieg sealed away General Yi Sun-sin\'s capsule? Centuries ago — when the Chiks and Ursa Major blockaded Earth and Krieg\'s Eisenklaue seized the space lanes — he was the only one who resisted to the very end. Eisenklaue forcibly extracted his tactical data and folded it into the Krieg defense algorithm. He\'s a living shield. If General Yi Sun-sin wakes and moves, the Krieg defense algorithm could collapse on its own.'},
    {char:'hero04', name:'Gagarin', color:'#88ccff', text:'So if we get him out... we hold the weakness of the Krieg defense algorithm?'},
    {char:'hero07', name:'Tesla', color:'#66ffff', text:'Exactly. That\'s why Krieg will never let him go.'},
    {char:'commander', name:'{commander}', color:'#00f3ff', text:'The route into the underground prison — Marco, can you pull up a map of the sector?'},
    {char:'hero08', name:'Marco Polo', color:'#ffd700', text:'...Of course I can.'}
  ],

    // ─── CH04-D "Before the Fortress" (P13 arrival) ───
  p2_ch04d:[
    {char:'hero08', name:'Marco Polo', color:'#ffd700', text:'A frontal assault is suicide. The outer batteries alone outnumber us three to one.'},
    {char:'hero04', name:'Gagarin', color:'#88ccff', text:'There\'s a route into the underground prison. A natural fissure — wide enough for a single shuttle to slip through.'},
    {char:'commander', name:'{commander}', color:'#00f3ff', text:'General Yi Sun-sin has been locked in there for centuries. We\'re the ones who end it.'}
  ],

    // ─── Yi Sun-sin joins (Q10-M) ───
  p2_yi_join:[
    {char:'hero01', name:'Yi Sun-sin', color:'#c0a060', text:'[in Joseon tongue] This place... how much time has passed?'},
    {char:'baekgu1', name:'Baekgu', color:'#66ddff', text:'Activating automatic translation to the common galactic tongue.'},
    {char:'hero01', name:'Yi Sun-sin', color:'#c0a060', text:'So it is {commander} who woke me. I am in your debt.'},
    {char:'hero01', name:'Yi Sun-sin', color:'#c0a060', text:'... My weapons and armor were sealed away with me. Take them. My hands have already become your hands.'},
    {char:'commander', name:'{commander}', color:'#00f3ff', text:'General. Let us go together.'},
    {char:'baekgu2_smile1', name:'Baekgu', color:'#66ddff', text:'SW01 weapon set + SA01 armor set auto-equipped. Firepower greatly increased.'}
  ],

  // ─── CH05 "The Gathering" (Phase 2 finale · Q10-04 complete) ───
  p2_ch05:[
    {char:'hero01', name:'Yi Sun-sin', color:'#c0a060', text:'Eisenklaue... so that is the one behind my sealing. To use my tactical data as a shield. In Phase 3, there is a debt I must settle, without fail.'},
    {char:'hero04', name:'Gagarin', color:'#ffd700', text:'Now we know the weakness of the Krieg defense algorithm. General Yi Sun-sin\'s tactics point straight back at their blind spot.'},
    {char:'hero08', name:'Marco Polo', color:'#ffd700', text:'I\'ll chart the next route. Krieg\'s supply outposts — I know every one of them.'},
    {char:'hero07', name:'Tesla', color:'#ffd700', text:'I destroyed the bio-weapon blueprints at LHS. But there\'s sure to be a backup somewhere.'},
    {char:'hero01', name:'Yi Sun-sin', color:'#c0a060', text:'Let us lay the next plan. {commander}.'},
    {char:'baekgu1', name:'Baekgu', color:'#66ddff', text:'Phase 2 complete. Phase 3 — planets 11 through 15 · alliance with the resistance.'}
  ]
};

// 행성별 인트로 컷씬 — 행성 첫 도착 시 자동 재생
const PHASE2_PLANET_INTROS={
  P19:'p2_ch03',   // 칩 해독의 열쇠
  P04:'p2_ch03b',  // 고철 더미 속의 비밀
  P20:'p2_ch04',   // 접경의 이중 거래
  P07:'p2_ch04b',  // 표면 아래
  P13:'p2_ch04d'   // 요새 앞에서
};

window.PHASE2_QUESTS=PHASE2_QUESTS;
window.PHASE2_CUTSCENES_KO=PHASE2_CUTSCENES_KO;
window.PHASE2_CUTSCENES_EN=PHASE2_CUTSCENES_EN;
window.PHASE2_PLANET_INTROS=PHASE2_PLANET_INTROS;

console.log('[PHASE2_QUESTS v4.0] Loaded — 27 quests across 5 planets (P19·P04·P20·P07·P13), 11 cutscenes');
})();
