// ═══════════════════════════════════════════════════════════════════
// DESTINATION EARTH — Phase 5 퀘스트 + 컷씬 데이터 (v1.0) — 보이드 진입
// 페이즈 5 · 보이드 진입 | 행성 P28·P29 | CH11~CH12
// 12개 퀘스트 + 6개 컷씬
// 영웅 합류: 아인슈타인(H06) @ P28 캅테인b 균열
// 거북선 LGD01 최종 강화: 보이드 방어막 해석 장비 + 시공 결정체 + R05 차폐
// 페이즈 6(최종전) 진입 직전 준비 단계
// ═══════════════════════════════════════════════════════════════════
(function(){
if(typeof window==='undefined') return;
if(window.PHASE5_QUESTS) return;

const PHASE5_QUESTS={

  // ════════════════════════════════════════════════════════════════
  // 행성 21 · P28 보이드 "캅테인b 균열" (아인슈타인 잠수)
  // 팩션 특산물: G28·G29·R03·R05
  // ════════════════════════════════════════════════════════════════
  P28:[
    {
      id:'p5_q2101', type:'story_quest', category:'main', phase:5,
      ic:'🌀', npc:'백구', npcIc:'🐕', npcKey:'baekgu2_advice',
      nm:{ko:'캅테인b 균열 진입', en:'Enter Kapteyn-b Rift'},
      desc:{ko:'P28 보이드 균열 — 우주 시공이 불안정. R03 안정화 코어 ×3 + R05 차폐 합금 ×3 소비.\n백구: "균열 진입 시 함대 손상 최소화 — 안정화가 필수예요."',
            en:'Stabilize before entry: R03 ×3 + R05 ×3.'},
      objectives:[
        {type:'gather', item:'R03', qty:3, label:{ko:'R03 안정화 코어 ×3', en:'R03 ×3 stabilize'}},
      ],
      rewardCr:180000, rewardVe:120,
      rewardItems:[{id:'R05', qty:2}],
      rewardFlags:['p28_rift_entered'],
      cutscene_pre:'p5_ch11a', cutscene_post:'p5_ch11b'
    },
    {
      id:'p5_q2102', type:'story_quest', category:'main', phase:5,
      ic:'🧠', npc:'아인슈타인', npcIc:'🔬', npcKey:'hero06',
      nm:{ko:'아인슈타인 영입', en:'Recruit Einstein'},
      desc:{ko:'균열 핵심부에서 아인슈타인과 조우. G28 보이드 결정 ×3 + G29 시공 입자 ×3 → 그의 보이드 안정화 이론 실증 실험 협력.\n아인슈타인: "내 이론이 옳다면 — 우르사의 보이드 방어막을 0.3초만에 무력화할 수 있소."',
            en:'Meet Einstein. G28 ×3 + G29 ×3 → He joins. "I can disable Ursa\'s void shield in 0.3s."'},
      objectives:[
        {type:'gather', item:'G28', qty:3, label:{ko:'G28 보이드 결정 ×3', en:'G28 ×3'}},
      ],
      rewardCr:250000, rewardVe:150,
      rewardItems:[],
      rewardFlags:['h06_joined','einstein_theory_proven'],
      cutscene_pre:null, cutscene_post:'p5_ch11c'
    },
    {
      id:'p5_q2103', type:'story_quest', category:'sub', phase:5,
      ic:'🔍', npc:'가가린', npcIc:'🚀', npcKey:'hero04',
      nm:{ko:'균열 잔해 탐색', en:'Rift Wreck Search'},
      desc:{ko:'균열 안쪽 — 100년간 사라진 함선들의 잔해. 탐색 3회. R03·R05·G28·G29 확보 가능 + 30% 보이드 해적 조우.',
            en:'Search 3× in rift. 70% R03/R05/G28/G29 / 30% void pirates.'},
      objectives:[
        {type:'explore', target:'p28_rift_wreck', qty:3, label:{ko:'균열 잔해 탐색 ×3', en:'Wreck ×3'}},
      ],
      rewardCr:60000, rewardVe:60,
      rewardItems:[{id:'R03', qty:1},{id:'G28', qty:2}],
      rewardFlags:[],
      cutscene_pre:null, cutscene_post:null
    },
    {
      id:'p5_q2104', type:'story_quest', category:'hidden', phase:5,
      ic:'💎', npc:'아인슈타인', npcIc:'🔬', npcKey:'hero06',
      nm:{ko:'시공 결정체 회수', en:'Spacetime Crystal'},
      desc:{ko:'균열 핵심부 — 자연 생성된 시공 결정체 1점 회수. 추후 보이드 방어막 해석 장비 핵심 부품.',
            en:'Recover spacetime crystal from rift core. Critical for void shield decryptor.'},
      objectives:[
        {type:'explore', target:'p28_crystal', qty:1, label:{ko:'시공 결정체 회수', en:'Recover crystal'}},
      ],
      rewardCr:120000, rewardVe:100,
      rewardItems:[{id:'R03', qty:3}],
      rewardFlags:['spacetime_crystal'],
      cutscene_pre:null, cutscene_post:null
    },
    {
      id:'p5_q2105', type:'story_quest', category:'sub', phase:5,
      ic:'⚙️', npc:'장영실', npcIc:'⚙️', npcKey:'hero02',
      nm:{ko:'균열 환경 함대 적응', en:'Rift Fleet Adaption'},
      desc:{ko:'장영실: "균열 환경은 일반 우주와 달라. 함대 외피를 G29 시공 입자로 코팅해야 시공 충격에 견딘다."\nG29 ×4 소비.',
            en:'G29 ×4 → Coat fleet hulls for rift environment resistance.'},
      objectives:[
        {type:'gather', item:'G29', qty:4, label:{ko:'G29 시공 입자 ×4 코팅', en:'G29 ×4 coating'}},
      ],
      rewardCr:80000, rewardVe:70,
      rewardItems:[{id:'R05', qty:2}],
      rewardFlags:['fleet_rift_proofed'],
      cutscene_pre:null, cutscene_post:null
    },
    {
      id:'p5_q2106', type:'story_quest', category:'sub', phase:5,
      ic:'🍺', npc:'마르코 폴로', npcIc:'🗺️', npcKey:'hero08',
      nm:{ko:'균열 주민의 정보', en:'Rift Dweller\'s Tale'},
      desc:{ko:'균열 안 — 100년간 갇혀 살아온 작은 정착촌 발견. G15 지구 철광석 ×2 제공.\n정착민 장로: "우르사 메이저 본거지에는 친위대 15척 + 치크스 정찰대 14척이 호위 중이오."',
            en:'G15 ×2 → "Ursa Major lair: 15 guards + 14 chiks scouts."'},
      objectives:[
        {type:'gather', item:'G15', qty:2, label:{ko:'G15 ×2 의례', en:'G15 ×2'}},
      ],
      rewardCr:45000, rewardVe:50,
      rewardItems:[{id:'G28', qty:1}],
      rewardFlags:['ursa_fleet_intel'],
      cutscene_pre:null, cutscene_post:null
    }
  ],

  // ════════════════════════════════════════════════════════════════
  // 행성 22 · P29 보이드 "오리온 균열" (전설 파츠 분출지)
  // 팩션 특산물: G28·G29·R05 + 5턴마다 전설 파츠 분출
  // ════════════════════════════════════════════════════════════════
  P29:[
    {
      id:'p5_q2201', type:'story_quest', category:'main', phase:5,
      ic:'⚡', npc:'테슬라', npcIc:'🔬', npcKey:'hero07',
      nm:{ko:'오리온 균열 횡단 항법', en:'Orion Rift Navigation'},
      desc:{ko:'P29 → P30 직항 항법 — R05 차폐 합금 ×5 + 아인슈타인 시공 보정 계산 협력.\n5턴마다 균열에서 분출되는 전설급 파츠 자동 수집.',
            en:'P29→P30 navigation: R05 ×5 + Einstein\'s calc. Auto-collect legendary parts from rift.'},
      objectives:[
        {type:'gather', item:'R05', qty:5, label:{ko:'R05 차폐 합금 ×5', en:'R05 ×5'}},
      ],
      rewardCr:200000, rewardVe:130,
      rewardItems:[{id:'R03', qty:2}],
      rewardFlags:['orion_rift_navigable','p30_route_open'],
      cutscene_pre:'p5_ch12a', cutscene_post:null
    },
    {
      id:'p5_q2202', type:'story_quest', category:'main', phase:5,
      ic:'🛡️', npc:'아인슈타인', npcIc:'🔬', npcKey:'hero06',
      nm:{ko:'보이드 방어막 해석', en:'Void Shield Decryptor'},
      desc:{ko:'시공 결정체 + R05 ×3 + G29 ×3 → 보이드 방어막 해석 장비 제작.\n아인슈타인: "이걸 거북선에 장착하면 우르사 방어막이 0.3초만에 풀려."',
            en:'Spacetime crystal + R05 ×3 + G29 ×3 → void shield decryptor. Mount on Geobukseon.'},
      objectives:[
        {type:'gather', item:'G29', qty:3, label:{ko:'G29 시공 입자 ×3', en:'G29 ×3'}},
      ],
      rewardCr:150000, rewardVe:120,
      rewardItems:[],
      rewardFlags:['void_shield_decryptor'],
      cutscene_pre:null, cutscene_post:'p5_ch12b'
    },
    {
      id:'p5_q2203', type:'story_quest', category:'sub', phase:5,
      ic:'🔍', npc:'백구', npcIc:'🐕', npcKey:'baekgu2_advice',
      nm:{ko:'균열 분출물 회수', en:'Rift Ejecta Salvage'},
      desc:{ko:'오리온 균열 외곽 — 정기 분출물 잔해. 잔해 탐색 3회. 전설급 파츠 드롭 확률 +20%.',
            en:'Search 3× — +20% legendary part drop.'},
      objectives:[
        {type:'explore', target:'p29_ejecta', qty:3, label:{ko:'분출물 탐색 ×3', en:'Ejecta ×3'}},
      ],
      rewardCr:70000, rewardVe:60,
      rewardItems:[{id:'R05', qty:2}],
      rewardFlags:[],
      cutscene_pre:null, cutscene_post:null
    },
    {
      id:'p5_q2204', type:'story_quest', category:'sub', phase:5,
      ic:'🤝', npc:'레인저 맥시모프', npcIc:'🎖️', npcKey:'delivery_F06',
      nm:{ko:'저항군 최종 지원 요청', en:'Resistance Final Support'},
      desc:{ko:'P26 저항군 본부 통신 — R06 반물질 ×10 추가 지원 요청. G13 저항군 의례 ×3 + G18 ×2 제공.\n레인저: "지구 해방 — 우리 모두의 꿈이에요. 함대를 보냅니다."',
            en:'G13 ×3 + G18 ×2 → Resistance pledges R06 ×10 + fleet for Earth liberation.'},
      objectives:[
        {type:'gather', item:'G13', qty:3, label:{ko:'G13 ×3 의례', en:'G13 ×3'}},
      ],
      rewardCr:100000, rewardVe:90,
      rewardItems:[{id:'R06', qty:10}],
      rewardFlags:['resistance_final_pledged'],
      cutscene_pre:null, cutscene_post:null
    },
    {
      id:'p5_q2205', type:'story_quest', category:'sub', phase:5,
      ic:'⚙️', npc:'장영실', npcIc:'⚙️', npcKey:'hero02',
      nm:{ko:'거북선 최종 강화', en:'Geobukseon Final Upgrade'},
      desc:{ko:'장영실: "거북선 외피에 보이드 방어막 해석 장비 통합. R08 ×6 + G27 ×3."\n완성 시 거북선 ATT·INT 패시브 +50% (이전 +30% → +50%).',
            en:'R08 ×6 + G27 ×3 → Geobukseon ATT/INT passive +50%.'},
      objectives:[
        {type:'gather', item:'R08', qty:6, label:{ko:'R08 ×6 통합', en:'R08 ×6'}},
      ],
      rewardCr:120000, rewardVe:100,
      rewardItems:[],
      rewardFlags:['geobukseon_final_upgrade'],
      cutscene_pre:null, cutscene_post:'p5_ch12c'
    },
    {
      id:'p5_q2206', type:'story_quest', category:'hidden', phase:5,
      ic:'🌌', npc:'아인슈타인', npcIc:'🔬', npcKey:'hero06',
      nm:{ko:'시공 보정 알고리즘', en:'Spacetime Correction Algo'},
      desc:{ko:'아인슈타인이 직접 작성한 시공 보정 알고리즘 — 전 함대에 적용 시 명중률 +20%.\nG28 ×4 소비 (알고리즘 검증).\n페이즈 5 종료 → 페이즈 6 (최종전 P30) 진입 가능.',
            en:'G28 ×4 → +20% accuracy. Phase 5 complete → Phase 6 (final P30).'},
      objectives:[
        {type:'gather', item:'G28', qty:4, label:{ko:'G28 ×4 검증', en:'G28 ×4 verify'}},
      ],
      rewardCr:200000, rewardVe:180,
      rewardItems:[],
      rewardFlags:['einstein_algo_applied','phase5_complete'],
      cutscene_pre:null, cutscene_post:'p5_ch12d'
    }
  ]
};

// ═══════════════════════════════════════════════════════════════════
// Phase 5 컷씬 (한국어)
// 색상: 백구 #66ddff · 사령관 #00f3ff · 이순신 #c0a060 · 광개토 #ff9d52
//      장영실 #80e8c0 · 가가린·마르코·테슬라 #ffd700 · 아인슈타인 #cc99ff
//      시스템 #38bdf8 · 레인저 #88d65b
// ═══════════════════════════════════════════════════════════════════
const PHASE5_CUTSCENES_KO={

  // ─── CH11-A "균열의 가장자리" (P28 도착) ───
  p5_ch11a:[
    {char:'baekgu2_advice', name:'백구', color:'#66ddff', text:'P28 캅테인b 균열. 시공이 뒤틀려 있어요. R03 안정화 코어가 없으면 함대가 분해돼요.'},
    {char:'hero07', name:'테슬라', color:'#ffd700', text:'아인슈타인 박사가 이 안에 있어. 보이드 안정화 이론을 실증하려고 단신으로 들어갔지.'},
    {char:'hero04', name:'가가린', color:'#ffd700', text:'단신으로? 미친 짓이야.'},
    {char:'hero07', name:'테슬라', color:'#ffd700', text:'그게 그의 방식이지. 이론을 몸으로 증명하는 거.'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'들어간다. R03 셋, R05 셋 — 충분해.'}
  ],

  // ─── CH11-B "시공의 호흡" (Q21-01 완료) ───
  p5_ch11b:[
    {char:'baekgu1_surprise', name:'백구', color:'#66ddff', text:'(시공 왜곡) ⚠ 좌우 시공축 ±0.3 변동. 함대 자세 보정 중.'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'이건 — 바다의 폭풍과 같다. 흐름을 읽으면 통과할 수 있어.'},
    {char:'hero02', name:'장영실', color:'#80e8c0', text:'거북선이 균열을 견딘다. 외피가 잘 버티는군.'},
    {char:'hero03', name:'광개토대왕', color:'#ff9d52', text:'(앞을 가리키며) 저기 — 빛이 새어 나온다.'}
  ],

  // ─── CH11-C "아인슈타인 합류" (Q21-02 완료) ───
  p5_ch11c:[
    {char:'hero06', name:'A. 아인슈타인', color:'#cc99ff', text:'반갑소. 이 균열 안에서 백 년을 기다렸지. 시공은 상대적이니 — 나에게는 그리 길지 않았소.'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'박사. 우리는 우르사 메이저를 잡으러 갑니다. 박사의 이론이 필요하오.'},
    {char:'hero06', name:'A. 아인슈타인', color:'#cc99ff', text:'우르사의 보이드 방어막 — 일정 주파수에서 공명을 일으키면 0.3초만에 풀리오. 내가 계산을 해주지.'},
    {char:'hero07', name:'테슬라', color:'#ffd700', text:'(웃으며) 박사님 — 100년 만에 다시 같이 일하는군요.'},
    {char:'hero06', name:'A. 아인슈타인', color:'#cc99ff', text:'테슬라. 자네의 무선 전력은 결국 옳았어. 시간이 증명했지.'},
    {char:'baekgu2_smile4', name:'백구', color:'#66ddff', text:'영웅 합류: A. 아인슈타인(H06). 8영웅 완전체 — 함대 최종 강화 상태.'}
  ],

  // ─── CH12-A "오리온의 항법" (P29 도착) ───
  p5_ch12a:[
    {char:'hero06', name:'A. 아인슈타인', color:'#cc99ff', text:'오리온 균열 — 5턴마다 정기 분출. 분출 직후 30초가 가장 안정적이오. 그 창문을 노려 횡단하면 됩니다.'},
    {char:'hero04', name:'가가린', color:'#ffd700', text:'30초 안에 P29 → P30. 한 번에 가야 해.'},
    {char:'hero07', name:'테슬라', color:'#ffd700', text:'R05 차폐 합금 ×5 — 함대 표면에 코팅하면 균열 압력을 견딜 수 있어.'},
    {char:'hero06', name:'A. 아인슈타인', color:'#cc99ff', text:'시공 보정 계산 — 내가 실시간으로 처리하지. 백구, 자네가 항법을 잡으면 좋겠소.'},
    {char:'baekgu2_advice', name:'백구', color:'#66ddff', text:'네 박사님. 항법 좌표 입력 — P30 직항.'}
  ],

  // ─── CH12-B "방어막 해석" (Q22-02 완료) ───
  p5_ch12b:[
    {char:'hero06', name:'A. 아인슈타인', color:'#cc99ff', text:'(시공 결정체를 들어 보며) 자연이 만든 결정 — 인공으로는 만들 수 없는 정밀도지.'},
    {char:'hero02', name:'장영실', color:'#80e8c0', text:'(거북선 외피에 장비를 통합) 됐어. 보이드 방어막 해석 장비 — 거북선 함수에 장착 완료.'},
    {char:'hero07', name:'테슬라', color:'#ffd700', text:'에너지 공급은 내가 책임진다. 한 번에 0.3초 — 그게 우리 기회야.'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'0.3초. 그 안에 학익진 일점사 — 끝낸다.'}
  ],

  // ─── CH12-C "거북선 최종 강화" (Q22-05 완료) ───
  p5_ch12c:[
    {char:'hero02', name:'장영실', color:'#80e8c0', text:'거북선 LGD01 — 최종 강화 완료. 보이드 방어막 해석 장비 통합. ATT·INT 패시브 +50%로 상향.'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'400년 전 거북선 — 12척으로 133척을 깼다. 오늘의 거북선 — 8영웅과 함께라면 더 큰 일도 한다.'},
    {char:'hero03', name:'광개토대왕', color:'#ff9d52', text:'정복은 — 손이 떨릴 때 멈춰야 한다. 지금 우리 손은 — 떨리지 않는다.'},
    {char:'baekgu2_smile2', name:'백구', color:'#66ddff', text:'거북선 LGD01 + 8영웅 + 보이드 방어막 해석 장비 + 시공 보정 알고리즘 — 모든 준비 완료.'}
  ],

  // ─── CH12-D "마지막 좌표" (Q22-06 완료 · 페이즈 5 종료) ───
  p5_ch12d:[
    {char:'hero06', name:'A. 아인슈타인', color:'#cc99ff', text:'시공 보정 알고리즘 — 전 함대에 적용 완료. 명중률 +20%. 우르사의 회피 패턴까지 예측 가능.'},
    {char:'hero08', name:'마르코 폴로', color:'#ffd700', text:'정보는 다 모았어. 더 살펴볼 게 없어. 이제 — 싸움이야.'},
    {char:'hero07', name:'테슬라', color:'#ffd700', text:'에너지 만충. 거북선 추진 코어 100%.'},
    {char:'hero04', name:'가가린', color:'#ffd700', text:'지구가 — 바로 너머야. 우리가 끝내면 — 사람들이 다시 하늘을 본다.'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'좌표 — P30 제타 레티쿨리. 우르사 메이저 본거지.'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'... 진입한다.'},
    {char:'baekgu1', name:'백구', color:'#66ddff', text:'페이즈 5 완료. 페이즈 6 — 최종전 P30·P31. 우르사 메이저 격파 · 지구 해방.'}
  ]
};

const PHASE5_CUTSCENES_EN={};

// 행성별 인트로 컷씬 — 행성 첫 도착 시 자동 재생
const PHASE5_PLANET_INTROS={
  P28:'p5_ch11a',  // 균열의 가장자리
  P29:'p5_ch12a'   // 오리온의 항법
};

window.PHASE5_QUESTS=PHASE5_QUESTS;
window.PHASE5_CUTSCENES_KO=PHASE5_CUTSCENES_KO;
window.PHASE5_CUTSCENES_EN=PHASE5_CUTSCENES_EN;
window.PHASE5_PLANET_INTROS=PHASE5_PLANET_INTROS;

console.log('[PHASE5_QUESTS v1.0] Loaded — 12 quests across 2 planets (P28·P29), 6 cutscenes (Void Entry)');
})();
