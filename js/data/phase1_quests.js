// ═══════════════════════════════════════════════════════════════════
// DESTINATION EARTH — Phase 1 퀘스트 + 컷씬 데이터
// 출처: Doc/PHASE1_QUEST_CARDS.md v3.0
// 페이즈 1 (각성): 행성 P01~P06 (P04 제외) · CH01~CH02
// 12개 퀘스트 + 11개 컷씬 (한·영 분기)
// ═══════════════════════════════════════════════════════════════════
(function(){
if(typeof window==='undefined') return;
if(window.PHASE1_QUESTS) return;

// ─── Phase 1 퀘스트 데이터 ───
// type: 'story_quest' → 보라색 카드 자동 적용 (game.js _renderQuestCard 분기 + completeQuest 분기)
// category: 'main' / 'sub' / 'hidden'
// objectives: 단순 표시용 (실제 완료 판정은 game.js의 gather/combat 시스템과 연동)
// cutscenes: 수락 시 cutscene_pre, 완료/클레임 시 cutscene_post 재생
const PHASE1_QUESTS={
  // ─── 행성 1: 프록시마 b (P01) ───
  P01:[
    {
      id:'p1_q01a', type:'story_quest', category:'main', phase:1,
      ic:'🏠', npc:'백구', npcIc:'🐕', npcKey:'baekgu1',
      nm:{ko:'첫 발걸음', en:'First Steps'},
      desc:{ko:'100년 만에 깨어났다. 격납고 주변에 버려진 고철 프레임이 널려 있다. 수거해서 최소 자본을 마련하고 {함선} 시스템을 재부팅하라.',
            en:'You wake after 100 years. Scrap frames are scattered around the hangar. Collect them to secure starting capital and reboot the {ship} system.'},
      objectives:[
        {type:'gather', item:'G01', qty:3, label:{ko:'G01 고철 프레임 ×3 수거', en:'Collect Scrap Frame ×3'}},
      ],
      rewardCr:2000, rewardVe:30,
      rewardItems:[],
      rewardFlags:['p1_planet_unlocked_P02'],
      cutscene_pre:'p1_p01_intro',  // 게임 시작 즉시 백구 깨움 컷씬 (사용자 보고 2026-06-07)
      cutscene_post:'p1_p01_outro'
    },
    {
      id:'p1_q01b', type:'story_quest', category:'hidden', phase:1,
      ic:'🎁', npc:'백구', npcIc:'🐕', npcKey:'baekgu2_think',
      nm:{ko:'격납고의 기억', en:'Hangar Memories'},
      desc:{ko:'격납고 깊숙한 곳에 100년 전 {사령관}의 유품 상자가 있다. 백구는 알면서도 손대지 않았다.',
            en:'Deep in the hangar lies {사령관}\'s memorial box from 100 years ago. Baekgu knew but never touched it.'},
      objectives:[
        {type:'explore', target:'hangar_box', qty:1, label:{ko:'격납고 유품 상자 발견', en:'Find the memorial box'}},
      ],
      rewardCr:1500, rewardVe:15,
      rewardItems:[{id:'G22', qty:1}],
      rewardFlags:[],
      cutscene_pre:null,
      cutscene_post:null
    }
  ],
  // ─── 행성 2: 센타우리 에코 c (P02) ───
  P02:[
    {
      id:'p1_q02a', type:'story_quest', category:'main', phase:1,
      ic:'💰', npc:'백구', npcIc:'🐕', npcKey:'baekgu1',
      nm:{ko:'첫 거래', en:'First Trade'},
      desc:{ko:'에코 c는 수퍼비아 링. 여기서 G05 수퍼비아 중력수정을 싸게 사두면 아우레우스 링에서 40% 높게 팔 수 있다. G01 고철 프레임을 먼저 팔아 자금을 만들고 중력수정을 매입하라.',
            en:'Echo c is Superbia Ring. Buy G05 Superbia Gravity Crystal cheap here, sell 40% higher in Aureus Ring. Sell G01 Scrap Frames first to raise capital, then buy crystals.'},
      objectives:[
        {type:'trade_sell', item:'G01', qty:5000, label:{ko:'G01 고철 프레임 판매 (5,000₡ 이상)', en:'Sell Scrap Frame (5,000₡+)'}},
        {type:'gather', item:'G05', qty:3, label:{ko:'G05 수퍼비아 중력수정 ×3 구매', en:'Buy Superbia Gravity Crystal ×3'}},
      ],
      rewardCr:8500, rewardVe:50,
      rewardItems:[{id:'G05', qty:3}],
      rewardFlags:['p1_planet_unlocked_P03'],
      cutscene_pre:'p1_p02_intro',
      cutscene_post:'p1_p02_outro'
    },
    {
      id:'p1_q02b', type:'story_quest', category:'sub', phase:1,
      ic:'⚠️', npc:'교역소 자경단', npcIc:'🛡️', npcKey:'combat_F01',
      nm:{ko:'현상 수배 게시판', en:'Bounty Board'},
      desc:{ko:'크리그 용병 현상 수배 3건. 목표 1명 제보 또는 격파 시 현금 지급.',
            en:'Three Krieg bounty contracts. Report or eliminate one target for cash reward.'},
      objectives:[
        {type:'combat', target:'krieg', qty:1, label:{ko:'크리그 정보 제보 또는 격파 ×1', en:'Report or defeat Krieg ×1'}},
      ],
      rewardCr:2000, rewardVe:20,
      rewardItems:[],
      rewardFlags:[],
      cutscene_pre:null,
      cutscene_post:null
    }
  ],
  // ─── 행성 3: 바나드 프라임 (P03) ───
  P03:[
    {
      id:'p1_q03a', type:'story_quest', category:'main', phase:1,
      ic:'☢️', npc:'백구', npcIc:'🐕', npcKey:'baekgu2_advice',
      nm:{ko:'방사능 구역 자원 수집', en:'Radzone Resource Gathering'},
      desc:{ko:'방사능 지대 고철과 에너지 코어는 품질이 다르다. 크리그를 피하거나 격파하며 채굴하라.',
            en:'Scrap and energy cores from the radioactive zone are of higher quality. Mine while avoiding or defeating Krieg.'},
      objectives:[
        {type:'gather', item:'G01', qty:5, label:{ko:'G01 고철 프레임 ×5 수집', en:'Gather Scrap Frame ×5'}},
        {type:'gather', item:'G02', qty:3, label:{ko:'G02 에너지 코어 ×3 수집', en:'Gather Energy Core ×3'}},
      ],
      rewardCr:5500, rewardVe:60,
      rewardItems:[{id:'R07', qty:2}],
      rewardFlags:[],
      cutscene_pre:'p1_p03_intro',
      cutscene_post:null
    },
    {
      id:'p1_q03b', type:'story_quest', category:'main', phase:1,
      ic:'⚔️', npc:'크리그 용병', npcIc:'💀', npcKey:'combat_F04',
      nm:{ko:'크리그 첫 전투', en:'First Krieg Combat'},
      desc:{ko:'크리그 용병 2기가 구역 진입을 막는다. 격파 후 무기 원석을 노획하라.',
            en:'Two Krieg mercenaries block the zone. Defeat them and salvage weapon ore.'},
      objectives:[
        {type:'combat', target:'krieg_small', qty:2, label:{ko:'크리그 소형 전투기 ×2 격파', en:'Defeat Krieg fighters ×2'}},
      ],
      rewardCr:3200, rewardVe:40,
      rewardItems:[{id:'G10', qty:1}],
      rewardFlags:['clue_KRIEG_01'],
      cutscene_pre:null,
      cutscene_post:'p1_p03_combat_after'
    },
    {
      id:'p1_q03c', type:'story_quest', category:'hidden', phase:1,
      ic:'📜', npc:'데이터 칩', npcIc:'💾', npcKey:'system',
      nm:{ko:'거북선의 씨앗', en:'Seed of the Geobukseon'},
      desc:{ko:'폐허 안에 오래된 데이터 칩. 조선 함선 "거북선" 설계도 단편이 들어있다. 완성하려면 재료를 더 모아야 한다.',
            en:'An old data chip lies in the ruins — fragments of the Geobukseon ship blueprint. More materials needed to complete it.'},
      objectives:[
        {type:'explore', target:'data_chip', qty:1, label:{ko:'데이터 칩 판독', en:'Decode the data chip'}},
        {type:'gather', item:'G02', qty:3, label:{ko:'G02 에너지 코어 ×3 추가 수집', en:'Gather Energy Core ×3 more'}},
      ],
      rewardCr:3200, rewardVe:35,
      rewardItems:[{id:'G02', qty:2}],
      rewardFlags:['turtle_blueprint_fragment_memo'],
      cutscene_pre:null,
      cutscene_post:null
    }
  ],
  // ─── 행성 4(시나리오상): 티가든 금융 b (P05) ───
  P05:[
    {
      id:'p1_q05a', type:'story_quest', category:'main', phase:1,
      ic:'🍸', npc:'백구', npcIc:'🐕', npcKey:'baekgu1',
      nm:{ko:'정보 네트워크', en:'Information Network'},
      desc:{ko:'골든 퀘이사 바텐더는 G03 오리온 위스키를 좋아한다. 뇌물을 건네고 이순신 캡슐 정보를 구매한 뒤 주점 네트워크 3곳을 더 돌아 단서를 모아라.',
            en:'The Golden Quasar bartender favors G03 Orion Whisky. Bribe him for Yi Sun-sin capsule intel, then visit 3 more tavern hubs to gather clues.'},
      objectives:[
        {type:'gather', item:'G03', qty:2, label:{ko:'G03 오리온 위스키 ×2 바텐더 증정', en:'Give Orion Whisky ×2 to bartender'}},
        {type:'explore', target:'taverns_3', qty:3, label:{ko:'주점 3곳 추가 방문', en:'Visit 3 additional taverns'}},
      ],
      rewardCr:6000, rewardVe:80,
      rewardItems:[{id:'G24', qty:2}],
      rewardFlags:['kepler22b_coord_clue', 'marco_polo_intel'],
      cutscene_pre:'p1_p05_intro',
      cutscene_post:'p1_p05_bartender'
    },
    {
      id:'p1_q05b', type:'story_quest', category:'sub', phase:1,
      ic:'🗣️', npc:'주점 손님 A', npcIc:'🕵️', npcKey:'explore_F02',
      nm:{ko:'소문의 진원지', en:'Source of Rumors'},
      desc:{ko:'"크리그 링에 지구 출신 캡슐이 있다"는 소문을 더 파고 싶다는 손님. 정보 2건 더 모아주면 사례한다.',
            en:'A patron wants to dig deeper into the "Earth-origin capsule in Krieg Ring" rumor. Bring 2 more pieces of intel for a reward.'},
      objectives:[
        {type:'explore', target:'tavern_intel', qty:2, label:{ko:'주점 네트워크 추가 정보 수집 ×2', en:'Collect 2 more tavern network intel'}},
      ],
      rewardCr:2500, rewardVe:25,
      rewardItems:[{id:'G24', qty:1}],
      rewardFlags:[],
      cutscene_pre:null,
      cutscene_post:'p1_p05_broker'
    }
  ],
  // ─── 행성 5(시나리오상): 넥서스 프라임 (P06) ───
  P06:[
    {
      id:'p1_q06a', type:'story_quest', category:'main', phase:1,
      ic:'🌐', npc:'주점 주인 오리드', npcIc:'🍺', npcKey:'delivery_F02',
      nm:{ko:'아우레우스 정보망 완성', en:'Complete the Aureus Network'},
      desc:{ko:'넥서스 프라임이 아우레우스 링 정보망의 마지막 허브다. G24 아우레우스 정보 칩이 접속 코드 대신 쓰인다.',
            en:'Nexus Prime is the final hub of the Aureus network. G24 Information Chips work as access codes.'},
      objectives:[
        {type:'gather', item:'G24', qty:2, label:{ko:'G24 아우레우스 정보 칩 ×2 제출', en:'Submit Aureus Info Chip ×2'}},
        {type:'explore', target:'aureus_network', qty:4, label:{ko:'4개 행성 망 완전 연결', en:'Connect all 4 Aureus planets'}},
      ],
      rewardCr:7000, rewardVe:90,
      rewardItems:[{id:'G04', qty:1}],
      rewardFlags:['aureus_network_unlocked'],
      cutscene_pre:'p1_p06_intro',
      cutscene_post:null
    },
    {
      id:'p1_q06b', type:'story_quest', category:'hidden', phase:1,
      ic:'🔒', npc:'미지의 신호', npcIc:'❓', npcKey:'system',
      nm:{ko:'하부 5층의 비밀', en:'Secret of Sublevel 5'},
      desc:{ko:'접근 허가 조건이 확인됐다. 거북선 설계도 단편 메모 + G02 에너지 코어 ×5 보유 시 해금. 준비물을 갖추고 돌아와야 한다.',
            en:'Access conditions confirmed. Unlocks with the Geobukseon blueprint memo + Energy Core ×5. Return when prepared.'},
      objectives:[
        {type:'flag', target:'turtle_blueprint_fragment_memo', label:{ko:'거북선 설계도 단편 메모 보유', en:'Hold Geobukseon blueprint memo'}},
        {type:'gather', item:'G02', qty:5, label:{ko:'G02 에너지 코어 ×5 보유', en:'Hold Energy Core ×5'}},
      ],
      rewardCr:0, rewardVe:0,
      rewardItems:[],
      rewardFlags:['mq_07_master_artisan_active'],
      locked:true,
      lockReason:{ko:'거북선 설계도 단편 메모 + G02 ×5 필요', en:'Need turtle blueprint memo + G02 ×5'},
      cutscene_pre:null,
      cutscene_post:null
    },
    {
      id:'p1_q06c', type:'story_quest', category:'sub', phase:1,
      ic:'🔄', npc:'오리드', npcIc:'🍺', npcKey:'delivery_F02',
      nm:{ko:'삼각 무역 루트 개통', en:'Triangle Trade Route'},
      desc:{ko:'수퍼비아↔아우레우스↔메카니카 삼각 루트. 첫 1회 완주하면 보너스 지급.',
            en:'Superbia↔Aureus↔Mechanica triangle route. Bonus on first completion.'},
      objectives:[
        {type:'trade_route', target:'triangle', qty:1, label:{ko:'삼각 무역 루트 첫 1회 완료', en:'Complete triangle route ×1'}},
      ],
      rewardCr:5000, rewardVe:55,
      rewardItems:[{id:'G06', qty:2}],
      rewardFlags:['trade_margin_5pct_perm'],
      cutscene_pre:null,
      cutscene_post:'p1_p06_outro'
    }
  ]
};

// ─── Phase 1 컷씬 데이터 ───
// 각 컷씬은 SceneLine 배열 — story-scenes-pc.js의 showCharDialog와 동일 포맷
// {char, name, color, text} 4필드
// 색상 시그니처:
//   백구 #66ddff · 사령관 #00f3ff · NPC 일반 #a8b3c0
//   바텐더/오리드 #d4a574 · 정보 중개인 #a78bfa · 크리그 #ef4444 · 시스템 #38bdf8

const PHASE1_CUTSCENES_KO={
  // P01 — 극저온 수면 해제
  p1_p01_intro:[
    {char:'baekgu1', name:'백구', color:'#66ddff', text:'{사령관}. 눈 뜨세요.'},
    {char:'baekgu1', name:'백구', color:'#66ddff', text:'100년이 경과했습니다. 현재 자산 15,000 크레딧. {함선} 1기. 연료 60%.'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'지구는.'},
    {char:'baekgu2_advice', name:'백구', color:'#66ddff', text:'봉쇄 중입니다. 감동은 나중에 하세요. 지금은 일 시작할 시간입니다.'}
  ],
  // P01 — 첫 발걸음 완료
  p1_p01_outro:[
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'100년 동안 형광등만 갈았어?'},
    {char:'baekgu2_think', name:'백구', color:'#66ddff', text:'두 번은 깜빡임이 거슬려서. 한 번은 그냥.'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'그냥?'},
    {char:'baekgu2_sad_happy', name:'백구', color:'#66ddff', text:'(침묵) … 그냥이요.'}
  ],
  // P02 — 첫 도착 (아오리)
  p1_p02_intro:[
    {char:'delivery_F01', name:'아오리', color:'#d4a574', text:'어디서 왔소? 프록시마 b 머스탱이 오랜만이구만.'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'오래 잠들어 있었습니다.'},
    {char:'delivery_F01', name:'아오리', color:'#d4a574', text:'허. 뭘 팔 거요?'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'고철이요.'}
  ],
  // P02 — 첫 거래 완료
  p1_p02_outro:[
    {char:'baekgu1', name:'백구', color:'#66ddff', text:'수익 8,740 크레딧. 예상보다 240 초과.'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'이순신이라는 이름, 여기선 못 들었어?'},
    {char:'baekgu2_think', name:'백구', color:'#66ddff', text:'그 이름은 아직 없습니다. 다른 경로가 필요합니다.'}
  ],
  // P03 — 위험 구역 진입
  p1_p03_intro:[
    {char:'baekgu2_advice', name:'백구', color:'#66ddff', text:'방사능 수치 정상치의 340%. 크리그 소형 2~4기 분산 배치 확인.'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'여기 G01 고철 프레임 품질이 링 최고라고 했지?'},
    {char:'baekgu1', name:'백구', color:'#66ddff', text:'그렇습니다. 에너지 코어도 같이 캐면 나중에 씁니다.'}
  ],
  // P03 — 크리그 첫 전투 후
  p1_p03_combat_after:[
    {char:'combat_F04', name:'크리그', color:'#ef4444', text:'강한 놈이네. 이름이 뭐야.'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'{사령관}.'},
    {char:'combat_F04', name:'크리그', color:'#ef4444', text:'{사령관}. 기억해두지. (통신 끊김)'},
    {char:'baekgu2_anger1', name:'백구', color:'#66ddff', text:'크리그 네트워크에 이름이 공유됩니다.'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'나쁠 것 없어.'}
  ],
  // P05 — 골든 퀘이사 입장
  p1_p05_intro:[
    {char:'delivery_F02', name:'바텐더', color:'#d4a574', text:'처음 보는 얼굴이네요. 뭘 드릴까요?'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'정보요.'},
    {char:'delivery_F02', name:'바텐더', color:'#d4a574', text:'정보는 공짜가 아닌데. — 오리온 위스키 두 병 있으면 얘기가 달라지지.'}
  ],
  // P05 — 바텐더 정보 거래 (정보 네트워크 완료)
  p1_p05_bartender:[
    {char:'delivery_F02', name:'바텐더', color:'#d4a574', text:'크리그 구역에 조선 제독 이름이 달린 캡슐이 있다는 소문이에요. "이순신".'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'(굳으며) 위치는.'},
    {char:'delivery_F02', name:'바텐더', color:'#d4a574', text:'오리온 위스키 두 병.'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'(건네며) 거래.'},
    {char:'delivery_F02', name:'바텐더', color:'#d4a574', text:'하나 더 — 우르사-알파에 억류된 상인, 마르코 폴로. 정보가 어마어마하다는 소문.'},
    {char:'baekgu2_think', name:'백구', color:'#66ddff', text:'(메모) 마르코 폴로. 기록.'}
  ],
  // P05 — 정보 중개인 (소문의 진원지 완료)
  p1_p05_broker:[
    {char:'gather_F02', name:'정보 중개인', color:'#a78bfa', text:'이순신 캡슐을 열려면 난중일기 영인본이 필요하다는 말이 있소. 지구 저항군이 갖고 있다고.'},
    {char:'baekgu2_advice', name:'백구', color:'#66ddff', text:'지구 저항군. 기록.'},
    {char:'gather_F02', name:'정보 중개인', color:'#a78bfa', text:'넥서스 프라임 하부 5층에 100년째 혼자 뭔가를 만드는 조선인이 있다는 이야기도.'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'(백구와 눈을 마주친다)'}
  ],
  // P06 — 하부 5층 접근 시도
  p1_p06_intro:[
    {char:'system', name:'경비 시스템', color:'#38bdf8', text:'접근 권한 없음. 지정 물품 소지 확인 필요.'},
    {char:'baekgu2_think', name:'백구', color:'#66ddff', text:'생체 신호 1명. 안에 있습니다. (문 안쪽에서 희미하게 금속 가는 소리)'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'(문에 손을 얹고) 기다려요. 곧 다시 올게.'}
  ],
  // P06 — 페이즈 1 마무리 (삼각 무역 완료 또는 P06 떠날 때)
  p1_p06_outro:[
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'백구. 100년 동안 외롭지 않았어?'},
    {char:'baekgu2_sleepy', name:'백구', color:'#66ddff', text:'…"외로움"이라는 감각이 제게 있는지 모르겠습니다.'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'있어. 형광등을 그냥 갈았다고 했잖아. 이유 없이.'},
    {char:'baekgu2_sad', name:'백구', color:'#66ddff', text:'(오래 침묵) 그렇다면, 네. 외로웠던 것 같습니다.'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'앞으로는 안 외로울 거야.'},
    {char:'baekgu2_smile1', name:'백구', color:'#66ddff', text:'…알겠습니다, {사령관}.'}
  ]
};

// 영문 컷씬 — 일단 빈 객체. 사용자 EN 작성 시 채움.
// getScene() 폴백: EN 미존재 시 KO 사용
const PHASE1_CUTSCENES_EN={};

// 행성별 인트로 컷씬 매핑 (행성 첫 도착 시 자동 재생 — 퀘스트와 무관)
// 사용자 보고 2026-06-07: 행성 도착 시 컷씬이 안 나오는 문제 → 별도 매핑으로 보장
const PHASE1_PLANET_INTROS={
  P01:'p1_p01_intro',
  P02:'p1_p02_intro',
  P03:'p1_p03_intro',
  P05:'p1_p05_intro',
  P06:'p1_p06_intro'
};

// 전역 노출
window.PHASE1_QUESTS=PHASE1_QUESTS;
window.PHASE1_CUTSCENES_KO=PHASE1_CUTSCENES_KO;
window.PHASE1_CUTSCENES_EN=PHASE1_CUTSCENES_EN;
window.PHASE1_PLANET_INTROS=PHASE1_PLANET_INTROS;

console.log('[PHASE1_QUESTS] Loaded — 12 quests across 5 planets (P01·P02·P03·P05·P06), 11 cutscenes');
})();
