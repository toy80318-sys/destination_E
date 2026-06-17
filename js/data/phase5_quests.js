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
      desc:{ko:'캅테인 균열 보이드 균열 — 우주 시공이 불안정. 아우레우스 태양핵 안정화 코어 ×3 + 메카니카 양자칩 차폐 합금 ×3 소비.\n백구: "균열 진입 시 함대 손상 최소화 — 안정화가 필수예요."',
            en:'Stabilize before entry: Aureus Solar Core ×3 + Mechanica Quantum Chip ×3.'},
      objectives:[
        {type:'gather', item:'R03', qty:3, label:{ko:'아우레우스 태양핵 안정화 코어 ×3', en:'Aureus Solar Core ×3 stabilize'}},
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
      desc:{ko:'균열 핵심부에서 아인슈타인과 조우. 지구 빈티지 씨앗 보이드 결정 ×3 + 보이드 공간 수정 시공 입자 ×3 → 그의 보이드 안정화 이론 실증 실험 협력.\n아인슈타인: "내 이론이 옳다면 — 우르사의 보이드 방어막을 0.3초만에 무력화할 수 있소."',
            en:'Meet Einstein. Earth Vintage Seeds ×3 + Void Space Crystal ×3 → He joins. "I can disable Ursa\'s void shield in 0.3s."'},
      objectives:[
        {type:'gather', item:'G28', qty:3, label:{ko:'지구 빈티지 씨앗 보이드 결정 ×3', en:'Earth Vintage Seeds ×3'}},
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
      desc:{ko:'균열 안쪽 — 100년간 사라진 함선들의 잔해. 탐색 3회. 아우레우스 태양핵·메카니카 양자칩·지구 빈티지 씨앗·보이드 공간 수정 확보 가능 + 30% 보이드 해적 조우.',
            en:'Search 3× in rift. 70% Aureus Solar Core/Mechanica Quantum Chip/Earth Vintage Seeds/Void Space Crystal / 30% void pirates.'},
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
      desc:{ko:'장영실: "균열 환경은 일반 우주와 달라. 함대 외피를 보이드 공간 수정 시공 입자로 코팅해야 시공 충격에 견딘다."\nG29 ×4 소비.',
            en:'Void Space Crystal ×4 → Coat fleet hulls for rift environment resistance.'},
      objectives:[
        {type:'gather', item:'G29', qty:4, label:{ko:'보이드 공간 수정 시공 입자 ×4 코팅', en:'Void Space Crystal ×4 coating'}},
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
      desc:{ko:'균열 안 — 100년간 갇혀 살아온 작은 정착촌 발견. 지구 철광석 ×2 제공.\n정착민 장로: "우르사 메이저 본거지에는 친위대 15척 + 치크스 정찰대 14척이 호위 중이오."',
            en:'Earth Iron Ore ×2 → "Ursa Major lair: 15 guards + 14 chiks scouts."'},
      objectives:[
        {type:'gather', item:'G15', qty:2, label:{ko:'지구 철광석 ×2 의례', en:'Earth Iron Ore ×2'}},
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
      desc:{ko:'오리온 균열 → 제타 레티쿨리 직항 항법 — 메카니카 양자칩 차폐 합금 ×5 + 아인슈타인 시공 보정 계산 협력.\n5턴마다 균열에서 분출되는 전설급 파츠 자동 수집.',
            en:'Orion Rift→Zeta Reticuli navigation: Mechanica Quantum Chip ×5 + Einstein\'s calc. Auto-collect legendary parts from rift.'},
      objectives:[
        {type:'gather', item:'R05', qty:5, label:{ko:'메카니카 양자칩 차폐 합금 ×5', en:'Mechanica Quantum Chip ×5'}},
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
      desc:{ko:'시공 결정체 + 메카니카 양자칩 ×3 + 보이드 공간 수정 ×3 → 보이드 방어막 해석 장비 제작.\n아인슈타인: "이걸 거북선에 장착하면 우르사 방어막이 0.3초만에 풀려."',
            en:'Spacetime crystal + Mechanica Quantum Chip ×3 + Void Space Crystal ×3 → void shield decryptor. Mount on Geobukseon.'},
      objectives:[
        {type:'gather', item:'G29', qty:3, label:{ko:'보이드 공간 수정 시공 입자 ×3', en:'Void Space Crystal ×3'}},
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
      desc:{ko:'타이탄H 저항군 본부 통신 — 저항군 반물질 ×10 추가 지원 요청. 저항군 군수품 ×3 + 난중일기 영인본 ×2 제공.\n레인저: "지구 해방 — 우리 모두의 꿈이에요. 함대를 보냅니다."',
            en:'Resistance Military Supplies ×3 + "Nanjung Ilgi" Facsimile ×2 → Resistance pledges Resistance Antimatter ×10 + fleet for Earth liberation.'},
      objectives:[
        {type:'gather', item:'G13', qty:3, label:{ko:'저항군 군수품 ×3 의례', en:'Resistance Military Supplies ×3'}},
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
      desc:{ko:'장영실: "거북선 외피에 보이드 방어막 해석 장비 통합. 은하 혼돈 결정 ×6 + 치크스 뇌수액 ×3."\n완성 시 거북선 ATT·INT 패시브 +50% (이전 +30% → +50%).',
            en:'Galactic Chaos Crystal ×6 + Chiks Brain Fluid ×3 → Geobukseon ATT/INT passive +50%.'},
      objectives:[
        {type:'gather', item:'R08', qty:6, label:{ko:'은하 혼돈 결정 ×6 통합', en:'Galactic Chaos Crystal ×6'}},
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
      desc:{ko:'아인슈타인이 직접 작성한 시공 보정 알고리즘 — 전 함대에 적용 시 명중률 +20%.\nG28 ×4 소비 (알고리즘 검증).\n임무 종료 → 다음 단계 (최종전 제타 레티쿨리) 진입 가능.',
            en:'Earth Vintage Seeds ×4 → +20% accuracy. Mission complete → next stage (final Zeta Reticuli).'},
      objectives:[
        {type:'gather', item:'G28', qty:4, label:{ko:'지구 빈티지 씨앗 ×4 검증', en:'Earth Vintage Seeds ×4 verify'}},
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
    {char:'baekgu2_advice', name:'백구', color:'#66ddff', text:'캅테인 균열 캅테인b 균열. 시공이 뒤틀려 있어요. 아우레우스 태양핵 안정화 코어가 없으면 함대가 분해돼요.'},
    {char:'hero07', name:'테슬라', color:'#ffd700', text:'아인슈타인 박사가 이 안에 있어. 보이드 안정화 이론을 실증하려고 단신으로 들어갔지.'},
    {char:'hero04', name:'가가린', color:'#ffd700', text:'단신으로? 미친 짓이야.'},
    {char:'hero07', name:'테슬라', color:'#ffd700', text:'그게 그의 방식이지. 이론을 몸으로 증명하는 거.'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'들어간다. 아우레우스 태양핵 셋, 메카니카 양자칩 셋 — 충분해.'}
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
    {char:'baekgu2_smile4', name:'백구', color:'#66ddff', text:'영웅 합류: A. 아인슈타인. 8영웅 완전체 — 함대 최종 강화 상태.'}
  ],

  // ─── CH12-A "오리온의 항법" (P29 도착) ───
  p5_ch12a:[
    {char:'hero01', name:'이순신', color:'#c0a060', text:'전 함대 — 거북선을 따른다.'},
    {char:'hero03', name:'광개토대왕', color:'#ff8844', text:'저 요새를 내 눈으로 무너뜨리는 날이 왔군.'},
    {char:'hero08', name:'마르코 폴로', color:'#ffd700', text:'레인저의 신호가 왔어. 저항군 전 함대 — 전투 준비 완료.'},
    {char:'hero02', name:'장영실', color:'#a0d8ef', text:'거북선 출력 120%. 전류 방어막 — 활성화.'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'{사령관}. 아이젠클로에게 전달해. — 이번엔 끝이라고.'}
  ],

    // ─── CH12-B "방어막 해석" (Q22-02 완료) ───
  p5_ch12b:[
    {char:'hero01', name:'이순신', color:'#c0a060', text:'끝났어, 아이젠클로.'},
    {char:'system', name:'아이젠클로', color:'#9ee7ff', text:'...아니야. 보이드 군주의 의지는 — 나 하나가 아니야. 우르사 메이저는 그분의 손발 중 하나에 불과해.'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'보이드 군주. 크리그 뒤에 그 존재가 있었던 거군.'}
  ],

    // ─── CH12-C "거북선 최종 강화" (Q22-05 완료) ───
  p5_ch12c:[
    {char:'hero02', name:'장영실', color:'#80e8c0', text:'거북선 — 최종 강화 완료. 보이드 방어막 해석 장비 통합. ATT·INT 패시브 +50%로 상향.'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'400년 전 거북선 — 12척으로 133척을 깼다. 오늘의 거북선 — 8영웅과 함께라면 더 큰 일도 한다.'},
    {char:'hero03', name:'광개토대왕', color:'#ff9d52', text:'정복은 — 손이 떨릴 때 멈춰야 한다. 지금 우리 손은 — 떨리지 않는다.'},
    {char:'baekgu2_smile2', name:'백구', color:'#66ddff', text:'거북선 + 8영웅 + 보이드 방어막 해석 장비 + 시공 보정 알고리즘 — 모든 준비 완료.'}
  ],

  // ─── CH12-D "마지막 좌표" (Q22-06 완료 · 페이즈 5 종료) ───
  p5_ch12d:[
    {char:'hero06', name:'A. 아인슈타인', color:'#cc99ff', text:'시공 보정 알고리즘 — 전 함대에 적용 완료. 명중률 +20%. 우르사의 회피 패턴까지 예측 가능.'},
    {char:'hero08', name:'마르코 폴로', color:'#ffd700', text:'정보는 다 모았어. 더 살펴볼 게 없어. 이제 — 싸움이야.'},
    {char:'hero07', name:'테슬라', color:'#ffd700', text:'에너지 만충. 거북선 추진 코어 100%.'},
    {char:'hero04', name:'가가린', color:'#ffd700', text:'지구가 — 바로 너머야. 우리가 끝내면 — 사람들이 다시 하늘을 본다.'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'좌표 — 제타 레티쿨리. 우르사 메이저 본거지.'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'... 진입한다.'},
    {char:'baekgu1', name:'백구', color:'#66ddff', text:'임무 완료. 다음 단계 — 최종전 제타 레티쿨리·지구. 우르사 메이저 격파 · 지구 해방.'}
  ]
};

const PHASE5_CUTSCENES_EN={

  // ─── CH11-A "Edge of the Rift" (P28 arrival) ───
  p5_ch11a:[
    {char:'baekgu2_advice', name:'Baekgu', color:'#66ddff', text:'Captain b a rift, Captain b a rift. Spacetime is warped here. Without an Aureus Solar Core stabilizer, the fleet will be torn apart.'},
    {char:'hero07', name:'Tesla', color:'#ffd700', text:'Dr. Einstein is in there. He went in alone to prove his Void stabilization theory.'},
    {char:'hero04', name:'Gagarin', color:'#ffd700', text:'Alone? That\'s insane.'},
    {char:'hero07', name:'Tesla', color:'#ffd700', text:'That\'s his way. Proving a theory with his own body.'},
    {char:'commander', name:'{commander}', color:'#00f3ff', text:'We\'re going in. Three Aureus Solar Cores, three Mechanica quantum chips — that\'s enough.'}
  ],

  // ─── CH11-B "Breath of Spacetime" (Q21-01 complete) ───
  p5_ch11b:[
    {char:'baekgu1_surprise', name:'Baekgu', color:'#66ddff', text:'(spacetime distortion) ⚠ Lateral spacetime axis fluctuating ±0.3. Correcting fleet attitude.'},
    {char:'hero01', name:'Yi Sun-sin', color:'#c0a060', text:'This is — like a storm at sea. Read the currents and we can pass through.'},
    {char:'hero02', name:'Jang Yeong-sil', color:'#80e8c0', text:'The Turtle Ship is holding against the rift. The hull is taking it well.'},
    {char:'hero03', name:'Gwanggaeto the Great', color:'#ff9d52', text:'(pointing ahead) There — light is leaking through.'}
  ],

  // ─── CH11-C "Einstein Joins" (Q21-02 complete) ───
  p5_ch11c:[
    {char:'hero06', name:'A. Einstein', color:'#cc99ff', text:'Well met. I have waited a hundred years inside this rift. But spacetime is relative — to me it was not so long.'},
    {char:'hero01', name:'Yi Sun-sin', color:'#c0a060', text:'Doctor. We are going to take down Ursa Major. We need your theory.'},
    {char:'hero06', name:'A. Einstein', color:'#cc99ff', text:'Ursa\'s Void shield — strike it at the right frequency and it resonates loose in 0.3 seconds. I will run the calculations for you.'},
    {char:'hero07', name:'Tesla', color:'#ffd700', text:'(smiling) Doctor — working together again after a hundred years.'},
    {char:'hero06', name:'A. Einstein', color:'#cc99ff', text:'Tesla. Your wireless power was right all along. Time has proven it.'},
    {char:'baekgu2_smile4', name:'Baekgu', color:'#66ddff', text:'Hero joined: A. Einstein. All eight heroes complete — fleet at maximum reinforcement.'}
  ],

  // ─── CH12-A "Navigation of Orion" (P29 arrival) ───
  p5_ch12a:[
    {char:'hero01', name:'Yi Sun-sin', color:'#c0a060', text:'All ships — follow the Turtle Ship.'},
    {char:'hero03', name:'Gwanggaeto the Great', color:'#ff8844', text:'The day has come to tear down that fortress with my own eyes.'},
    {char:'hero08', name:'Marco Polo', color:'#ffd700', text:'The Ranger\'s signal is in. The entire resistance fleet — ready for battle.'},
    {char:'hero02', name:'Jang Yeong-sil', color:'#a0d8ef', text:'Turtle Ship output at 120%. Electric shield — activated.'},
    {char:'hero01', name:'Yi Sun-sin', color:'#c0a060', text:'{commander}. Send word to Eisenklau. — Tell him this is the end.'}
  ],

    // ─── CH12-B "Decoding the Shield" (Q22-02 complete) ───
  p5_ch12b:[
    {char:'hero01', name:'Yi Sun-sin', color:'#c0a060', text:'It\'s over, Eisenklau.'},
    {char:'system', name:'Eisenklau', color:'#9ee7ff', text:'...No. The will of the Void Lord — it is not me alone. Ursa Major is merely one of his hands and feet.'},
    {char:'hero01', name:'Yi Sun-sin', color:'#c0a060', text:'The Void Lord. So that was the one behind Krieg.'}
  ],

    // ─── CH12-C "Turtle Ship Final Upgrade" (Q22-05 complete) ───
  p5_ch12c:[
    {char:'hero02', name:'Jang Yeong-sil', color:'#80e8c0', text:'Turtle Ship — final upgrade complete. Void-shield decoding gear integrated. ATT and INT passives raised to +50%.'},
    {char:'hero01', name:'Yi Sun-sin', color:'#c0a060', text:'Four hundred years ago the Turtle Ship — broke 133 ships with twelve. Today\'s Turtle Ship — with eight heroes, can do far greater things.'},
    {char:'hero03', name:'Gwanggaeto the Great', color:'#ff9d52', text:'Conquest — must stop when the hand begins to tremble. Right now our hands — do not tremble.'},
    {char:'baekgu2_smile2', name:'Baekgu', color:'#66ddff', text:'Turtle Ship + 8 heroes + Void-shield decoding gear + spacetime-correction algorithm — all preparations complete.'}
  ],

  // ─── CH12-D "The Final Coordinates" (Q22-06 complete · Phase 5 end) ───
  p5_ch12d:[
    {char:'hero06', name:'A. Einstein', color:'#cc99ff', text:'Spacetime-correction algorithm — applied across the whole fleet. Accuracy +20%. We can even predict Ursa\'s evasion patterns.'},
    {char:'hero08', name:'Marco Polo', color:'#ffd700', text:'I\'ve gathered all the intel. Nothing left to scout. Now — it\'s the fight.'},
    {char:'hero07', name:'Tesla', color:'#ffd700', text:'Energy fully charged. Turtle Ship propulsion core at 100%.'},
    {char:'hero04', name:'Gagarin', color:'#ffd700', text:'Earth is — just beyond. When we finish this — people will look at the sky again.'},
    {char:'hero01', name:'Yi Sun-sin', color:'#c0a060', text:'Coordinates — Zeta Reticuli. Ursa Major\'s stronghold.'},
    {char:'commander', name:'{commander}', color:'#00f3ff', text:'... We\'re going in.'},
    {char:'baekgu1', name:'Baekgu', color:'#66ddff', text:'Mission complete. Next stage — final battle at Zeta Reticuli and Earth. Defeat Ursa Major and liberate Earth.'}
  ]
};

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
