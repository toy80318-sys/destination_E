// ═══════════════════════════════════════════════════════════════════
// DESTINATION EARTH — Phase 6 퀘스트 + 컷씬 데이터 (v1.0) — 최종전·해방
// 페이즈 6 · 해방 (FINAL) | 행성 P30·P31 | CH13~CH15 (엔딩)
// 10개 퀘스트 + 8개 컷씬 (기존 showUrsaMajorIntro 보스 대사 전면 교체)
// 최종 보스: 우르사 메이저 + 아이젠클로 @ P30 제타 레티쿨리
// 종결: 지구(P31) 해방 후일담 — _earthLiberated 플래그
// ═══════════════════════════════════════════════════════════════════
(function(){
if(typeof window==='undefined') return;
if(window.PHASE6_QUESTS) return;

const PHASE6_QUESTS={

  // ════════════════════════════════════════════════════════════════
  // 행성 23 · P30 보이드 "제타 레티쿨리" (우르사 메이저 최종 보스전)
  // 팩션 특산물: 없음 (보스전 단일 행성)
  // ════════════════════════════════════════════════════════════════
  P30:[
    {
      id:'p6_q2301', type:'story_quest', category:'main', phase:6,
      ic:'🌌', npc:'이순신', npcIc:'⚔️', npcKey:'hero01',
      nm:{ko:'우르사 메이저 진입', en:'Approach Ursa Major'},
      desc:{ko:'제타 레티쿨리 — 우르사 메이저 본거지. 진입 전 함대 점검: 거북선 + 보이드 방어막 해석 장비 + 아우레우스 태양핵 안정화 ×5 사전 소비.\n전 영웅 8/8 참전 필수.',
            en:'Final approach. Need turtle ship + void decryptor + Aureus Solar Core ×5. All 8 heroes required.'},
      objectives:[
        {type:'gather', item:'R03', qty:5, label:{ko:'아우레우스 태양핵 안정화 ×5', en:'Aureus Solar Core ×5'}},
      ],
      rewardCr:300000, rewardVe:200,
      rewardItems:[],
      rewardFlags:['ursa_approach_ready'],
      cutscene_pre:'p6_ch13a', cutscene_post:'p6_ch13b'
    },
    {
      id:'p6_q2302', type:'story_quest', category:'main', phase:6,
      ic:'⚔️', npc:'광개토대왕', npcIc:'🛡️', npcKey:'hero03',
      nm:{ko:'호위대 1차 돌파', en:'Break Escort 1st Wave'},
      desc:{ko:'우르사 1열 — 치크스 정찰기 8척 격파. 광개토 우익 돌격 진형.\n광개토: "선봉은 내가 맡는다. 학익진 우익 — 펼친다!"',
            en:'Wave 1: 8 chiks scouts. Gwanggaeto right flank assault.'},
      objectives:[
        {type:'combat', target:'ursa_wave1', qty:1, label:{ko:'1열 치크스 8척 격파', en:'8 chiks down'}},
      ],
      rewardCr:250000, rewardVe:180,
      rewardItems:[{id:'R08', qty:3}],
      rewardFlags:['ursa_wave1_down'],
      cutscene_pre:null, cutscene_post:null
    },
    {
      id:'p6_q2303', type:'story_quest', category:'main', phase:6,
      ic:'⚔️', npc:'가가린', npcIc:'🚀', npcKey:'hero04',
      nm:{ko:'호위대 2차 돌파', en:'Break Escort 2nd Wave'},
      desc:{ko:'우르사 2열 — 치크스 순양함 6척 + 친위대 대형 7기 격파. 가가린 좌익 항법 보정 진형.\n가가린: "60년대 우주개발 경험 — 이걸 위해 살아남았다."',
            en:'Wave 2: 6 cruisers + 7 large guards. Gagarin left flank.'},
      objectives:[
        {type:'combat', target:'ursa_wave2', qty:1, label:{ko:'2열 13기 격파', en:'13 down'}},
      ],
      rewardCr:350000, rewardVe:220,
      rewardItems:[{id:'R07', qty:5}],
      rewardFlags:['ursa_wave2_down'],
      cutscene_pre:null, cutscene_post:null
    },
    {
      id:'p6_q2304', type:'story_quest', category:'main', phase:6,
      ic:'🛡️', npc:'아인슈타인', npcIc:'🔬', npcKey:'hero06',
      nm:{ko:'친위대 대형 마지막 8기', en:'Final Guard 8'},
      desc:{ko:'우르사 친위대 대형 마지막 8기 — 보스 본체 직접 호위. 아인슈타인 시공 보정 ×3 적용 → 학익진 데미지 +50%.',
            en:'Last 8 large guards directly shielding boss. Einstein boost: +50% formation damage.'},
      objectives:[
        {type:'combat', target:'ursa_guard_final', qty:1, label:{ko:'친위대 8기 전멸', en:'Final 8 guards'}},
      ],
      rewardCr:400000, rewardVe:250,
      rewardItems:[],
      rewardFlags:['ursa_escorts_down'],
      cutscene_pre:null, cutscene_post:'p6_ch13c'
    },
    {
      id:'p6_q2305', type:'story_quest', category:'main', phase:6,
      ic:'🏴', npc:'테슬라', npcIc:'🔬', npcKey:'hero07',
      nm:{ko:'보이드 방어막 무력화', en:'Disable Void Shield'},
      desc:{ko:'호위 전멸 후 우르사 메이저 본체 노출. 보이드 방어막 해석 장비 활성화 → 방어막 0.3초 무력화.\n테슬라: "공명파 4.7GHz — 지금이야!"',
            en:'After escorts: 4.7GHz resonance → 0.3s shield breach. Tesla: "All cannons, focus fire!"'},
      objectives:[
        {type:'combat', target:'ursa_shield', qty:1, label:{ko:'보이드 방어막 해체', en:'Shield breach'}},
      ],
      rewardCr:500000, rewardVe:300,
      rewardItems:[],
      rewardFlags:['ursa_shield_broken'],
      cutscene_pre:'p6_ch13d', cutscene_post:'p6_ch13e'
    },
    {
      id:'p6_q2306', type:'story_quest', category:'main', phase:6,
      ic:'💀', npc:'사령관', npcIc:'⚓', npcKey:'commander',
      nm:{ko:'우르사 메이저 격파', en:'Defeat Ursa Major'},
      desc:{ko:'방어막 무력화된 우르사 메이저 본체 격파. 8영웅 전 화력 집중. 승리 시 _earthLiberated 플래그 + 자동 지구 진입.\n아이젠클로 사령관 함선도 동시 격파.',
            en:'Final kill. All 8 heroes focus fire. Win → Earth liberated + auto Earth.'},
      objectives:[
        {type:'combat', target:'ursa_main', qty:1, label:{ko:'우르사 메이저 격파', en:'Ursa Major down'}},
      ],
      rewardCr:1000000, rewardVe:500,
      rewardItems:[{id:'R03', qty:10},{id:'R05', qty:10},{id:'R08', qty:10}],
      rewardFlags:['ursa_major_defeated','earth_liberated'],
      cutscene_pre:null, cutscene_post:'p6_ch14a'
    },
    {
      id:'p6_q2307', type:'story_quest', category:'hidden', phase:6,
      ic:'📜', npc:'이순신', npcIc:'⚔️', npcKey:'hero01',
      nm:{ko:'아이젠클로 친필 항복서', en:'Eisenklau\'s Surrender'},
      desc:{ko:'우르사 격파 후 — 아이젠클로의 친필 항복서 회수. 100년 봉인의 종결 증거.\n이순신: "이걸 지구 의회에 바치면 — 진정한 종전이다."',
            en:'Recover Eisenklau\'s written surrender — proof of war\'s end.'},
      objectives:[
        {type:'explore', target:'eisenklau_surrender', qty:1, label:{ko:'항복서 회수', en:'Recover surrender'}},
      ],
      rewardCr:500000, rewardVe:300,
      rewardItems:[],
      rewardFlags:['eisenklau_surrender'],
      cutscene_pre:null, cutscene_post:null
    }
  ],

  // ════════════════════════════════════════════════════════════════
  // 행성 24 · P31 지구 "해방 후 재건" (엔딩 후일담)
  // ════════════════════════════════════════════════════════════════
  P31:[
    {
      id:'p6_q2401', type:'story_quest', category:'main', phase:6,
      ic:'🌍', npc:'사령관', npcIc:'⚓', npcKey:'commander',
      nm:{ko:'지구 착륙', en:'Earth Landing'},
      desc:{ko:'100년 만의 지구 착륙. 봉쇄가 풀린 지구 — 새로운 시작.\n자유 항해 모드 활성화 (프록시마B~지구 자유 이동 + 모든 행성 경매 가능).',
            en:'First landing in 100 years. Free roam mode unlocked.'},
      objectives:[
        {type:'delivery', target:'P31', qty:1, label:{ko:'지구 도착', en:'Arrive at Earth'}},
      ],
      rewardCr:500000, rewardVe:300,
      rewardItems:[],
      rewardFlags:['earth_landed','free_roam_unlocked'],
      cutscene_pre:'p6_ch14b', cutscene_post:null
    },
    {
      id:'p6_q2402', type:'story_quest', category:'sub', phase:6,
      ic:'🏛️', npc:'레인저 맥시모프', npcIc:'🎖️', npcKey:'delivery_F06',
      nm:{ko:'지구 의회 복원', en:'Restore Earth Council'},
      desc:{ko:'아이젠클로 항복서 + 난중일기 영인본 난중일기 ×3 + 지구 철광석 ×5 → 지구 의회 공식 재개. {사령관} 명예 의장 직위.',
            en:'Eisenklau surrender + "Nanjung Ilgi" Facsimile ×3 + Earth Iron Ore ×5 → Council restored. {commander} Honorary Chair.'},
      objectives:[
        {type:'gather', item:'G15', qty:5, label:{ko:'지구 철광석 ×5', en:'Earth Iron Ore ×5'}},
      ],
      rewardCr:800000, rewardVe:400,
      rewardItems:[],
      rewardFlags:['earth_council_restored','honorary_chair'],
      cutscene_pre:null, cutscene_post:'p6_ch14c'
    },
    {
      id:'p6_q2403', type:'story_quest', category:'sub', phase:6,
      ic:'🎓', npc:'장영실', npcIc:'⚙️', npcKey:'hero02',
      nm:{ko:'거북선 제작소 설립', en:'Geobukseon Foundry'},
      desc:{ko:'장영실: "지구에 거북선 제작소를 세울게. 은하 혼돈 결정 ×30 + 크리그 마그마 코어 ×20 자금."\n설립 후 거북선 제작이 지구에서도 가능.',
            en:'Galactic Chaos Crystal ×30 + Krieg Magma Core ×20 → Earth-based Geobukseon foundry.'},
      objectives:[
        {type:'gather', item:'R08', qty:30, label:{ko:'은하 혼돈 결정 ×30 출자', en:'Galactic Chaos Crystal ×30 funding'}},
      ],
      rewardCr:600000, rewardVe:350,
      rewardItems:[],
      rewardFlags:['geobukseon_foundry_earth'],
      cutscene_pre:null, cutscene_post:null
    },
    {
      id:'p6_q2404', type:'story_quest', category:'sub', phase:6,
      ic:'⚡', npc:'테슬라', npcIc:'🔬', npcKey:'hero07',
      nm:{ko:'무선 전력망 재건', en:'Wireless Grid'},
      desc:{ko:'테슬라: "지구 봉쇄 100년간 끊긴 무선 전력망을 다시 깐다. 수퍼비아 중력자 ×15 + 메카니카 양자칩 ×10."',
            en:'Superbia Graviton ×15 + Mechanica Quantum Chip ×10 → Earth wireless grid restored.'},
      objectives:[
        {type:'gather', item:'R07', qty:15, label:{ko:'수퍼비아 중력자 ×15 코어', en:'Superbia Graviton ×15'}},
      ],
      rewardCr:500000, rewardVe:300,
      rewardItems:[],
      rewardFlags:['earth_grid_restored'],
      cutscene_pre:null, cutscene_post:null
    },
    {
      id:'p6_q2405', type:'story_quest', category:'hidden', phase:6,
      ic:'⭐', npc:'백구', npcIc:'🐕', npcKey:'baekgu2_smile1',
      nm:{ko:'명예의 전당', en:'Hall of Fame'},
      desc:{ko:'엔딩 시청 완료 → 명예의 전당 기록 등재. 다음 회차 +20% 보상 보너스.\n백구: "사령관. 우리, 해냈어요."',
            en:'Ending watched → Hall of Fame +20% bonus next run.'},
      objectives:[
        {type:'explore', target:'ending_watched', qty:1, label:{ko:'엔딩 시청', en:'Watch ending'}},
      ],
      rewardCr:1000000, rewardVe:500,
      rewardItems:[],
      rewardFlags:['hall_of_fame_entry','newgame_plus_unlocked','phase6_complete'],
      cutscene_pre:null, cutscene_post:'p6_ch15a'
    }
  ]
};

// ═══════════════════════════════════════════════════════════════════
// Phase 6 컷씬 (한국어) — 기존 showUrsaMajorIntro 8단계 대사 전면 교체
// 색상: 백구 #66ddff · 사령관 #00f3ff · 이순신 #c0a060 · 광개토 #ff9d52
//      장영실 #80e8c0 · 가가린·마르코·테슬라 #ffd700 · 아인슈타인 #cc99ff
//      우르사 메이저 #ff3366 · 아이젠클로 #ff6644 · 시스템 #38bdf8
// ═══════════════════════════════════════════════════════════════════
const PHASE6_CUTSCENES_KO={

  // ─── CH13-A "마지막 항로" (P30 도착) ───
  p6_ch13a:[
    {char:'baekgu2_advice', name:'백구', color:'#66ddff', text:'제타 레티쿨리. 우르사 메이저 본거지에 도착했어요. 적함 신호 — 총 30기 식별.'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'400년 전 임진왜란. 100년 전 봉인. 그리고 오늘 — 마지막 일전이다.'},
    {char:'hero05', name:'호레이쇼 넬슨', color:'#88ccff', text:'트라팔가르 — 영국이 누른 마지막 전투. 오늘은 우리가 누른다.'},
    {char:'hero06', name:'A. 아인슈타인', color:'#cc99ff', text:'시공 안정. 보이드 방어막 해석 장비 — 활성화 가능 상태.'},
    {char:'hero03', name:'광개토대왕', color:'#ff9d52', text:'정복할 시간이다.'},
    {char:'hero04', name:'가가린', color:'#ffd700', text:'지구가 — 바로 너머야. 사령관, 결단을 내려.'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'전 함대. 진형 학익진. 거북선 중앙. 진입한다.'}
  ],

  // ─── CH13-B "우르사 메이저 조우" (Q23-01 완료 · 기존 ursa.intro 대체) ───
  p6_ch13b:[
    {char:'system', name:'경보', color:'#ef4444', text:'⚠ 워프 신호 확인. 우르사 메이저 본체 + 친위대 15척 + 치크스 정찰대 14척. 총 30기.'},
    {char:'baekgu1_surprise', name:'백구', color:'#66ddff', text:'전투력 1천만 단위! 하지만 — 거북선과 8영웅이 함께라면 못할 게 없어요.'},
    {char:'ursa', name:'우르사 메이저', color:'#ff3366', text:'... 인류의 작은 함대가 마침내 여기까지 왔는가. 100년의 침묵을 깨고.'},
    {char:'ursa', name:'우르사 메이저', color:'#ff3366', text:'100년 전, 나는 너희 별을 봉인했다. 너희 종족의 침묵은 영원할 줄 알았지. 그러나 — 한 캡슐이 다시 깨어났구나.'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'그 캡슐 — 나였다. 네가 봉인한 자가 오늘 너의 끝을 가져왔다.'},
    {char:'ursa', name:'우르사 메이저', color:'#ff3366', text:'이순신. 너의 전술 데이터는 내 방어 알고리즘의 핵심이었다. 너를 봉인한 것은 — 가장 강한 무기를 빼앗기 위함이었다.'},
    {char:'hero06', name:'A. 아인슈타인', color:'#cc99ff', text:'그 알고리즘 — 이순신 장군의 전술이 거꾸로 너의 허점을 가리킨다. 봉인이 풀리면 — 방패가 칼이 되지.'},
    {char:'ursa', name:'우르사 메이저', color:'#ff3366', text:'아인슈타인까지... 100년 전 균열에 던져버렸던 노학자가 살아있었다니. 흥미롭군.'},
    {char:'eisenklau', name:'아이젠클로', color:'#ff6644', text:'우르사 님. 인간들이 거북선이라는 것을 만들었습니다. 거기 — 이순신의 전술 데이터가 적용된 강화 함선입니다.'},
    {char:'ursa', name:'우르사 메이저', color:'#ff3366', text:'아이젠클로. 너의 임무는 봉쇄였다. 그러나 너는 봉쇄에 실패했다. 변명은 — 받지 않는다.'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'아이젠클로. 100년 동안 인류를 가뒀던 책임 — 오늘 끝낸다.'},
    {char:'eisenklau', name:'아이젠클로', color:'#ff6644', text:'(이를 갈며) 인간 따위가... 친위대 알파부터 엡실론까지! 전열 정비! 일점사 — 거북선!'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'학익진. 펼친다.'}
  ],

  // ─── CH13-C "친위대 격파" (Q23-04 완료) ───
  p6_ch13c:[
    {char:'hero03', name:'광개토대왕', color:'#ff9d52', text:'우익 — 정리 완료. 호위 친위대 잔존 0.'},
    {char:'hero04', name:'가가린', color:'#ffd700', text:'좌익도 깨끗하다. 학익진 — 완성.'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'우르사 메이저 본체 — 노출. 보이드 방어막은 아직 활성.'},
    {char:'hero06', name:'A. 아인슈타인', color:'#cc99ff', text:'4.7GHz 공명파 — 충전 100%. 발사 명령 대기.'},
    {char:'system', name:'우르사 메이저', color:'#ff3366', text:'... 호위가 무너졌다. 그러나 나의 본체 방어막은 그 어떤 무기로도 뚫지 못한다. 너희가 가진 것은 — 무엇이냐.'},
    {char:'hero07', name:'테슬라', color:'#ffd700', text:'(웃으며) 100년 전 너희가 균열에 던진 노학자 — 그의 이론이다.'}
  ],

  // ─── CH13-D "방어막 무력화 직전" (Q23-05 시작) ───
  p6_ch13d:[
    {char:'hero06', name:'A. 아인슈타인', color:'#cc99ff', text:'시공 결정체 보정 — 적용. 보이드 방어막 공명 주파수 락온.'},
    {char:'hero02', name:'장영실', color:'#80e8c0', text:'거북선 노포 — 전 화력 충전 100%. 학익진 일점사 진형 정렬.'},
    {char:'hero08', name:'마르코 폴로', color:'#ffd700', text:'적 후위 통신 — 차단 완료. 지원 워프 차단했어.'},
    {char:'system', name:'우르사 메이저', color:'#ff3366', text:'(처음으로 동요) 그것은... 시공 공명? 불가능하다. 자연 결정체로는...'},
    {char:'hero06', name:'A. 아인슈타인', color:'#cc99ff', text:'가능했지. 100년 동안 균열 안에서 — 자네들 모르게 결정체를 길러왔거든.'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'400년 전 — 나는 12척으로 133척을 막았다. 오늘은 9척이면 충분하다.'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'... 발사.'}
  ],

  // ─── CH13-E "방어막 무력화" (Q23-05 완료) ───
  p6_ch13e:[
    {char:'hero06', name:'A. 아인슈타인', color:'#cc99ff', text:'4.7GHz 공명파 — 발사!'},
    {char:'system', name:'경보', color:'#38bdf8', text:'⚠ 우르사 메이저 보이드 방어막 — 0.3초 윈도우 확인. 일점사 가능.'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'거북선 노포 전탄 — 일점사!'},
    {char:'hero07', name:'테슬라', color:'#ffd700', text:'테슬라 초공간 — ATT ×5 발동!'},
    {char:'hero02', name:'장영실', color:'#80e8c0', text:'호위함 전 화력 — 거북선 패시브 +30% 적용!'},
    {char:'hero03', name:'광개토대왕', color:'#ff9d52', text:'정복의 깃발 — 마지막 일격!'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'... 모두. 발사.'}
  ],

  // ─── CH14-A "400년의 끝" (Q23-06 완료 · 우르사 격파) ───
  p6_ch14a:[
    {char:'system', name:'시스템', color:'#38bdf8', text:'우르사 메이저 격파 확인. 아이젠클로 사령관 함선 동시 파괴. 적 함대 — 잔존 0. 보이드 균열 — 폐쇄 중.'},
    {char:'system', name:'우르사 메이저', color:'#ff3366', text:'(꺼져가는 신호) 인류... 너희가... 다시... 일어났구나... 봉쇄는... 영원할 수 없었던... 가...'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'... 끝났다. 100년 봉인의 종결이다.'},
    {char:'hero04', name:'가가린', color:'#ffd700', text:'(창밖을 보며) 지구야. 정말 지구야.'},
    {char:'hero06', name:'A. 아인슈타인', color:'#cc99ff', text:'(조용히) 시공이 풀렸군. 균열이 닫히고 있어. 자연 상태로 — 돌아간다.'},
    {char:'hero03', name:'광개토대왕', color:'#ff9d52', text:'우리가 새 땅을 열었다. 정복이 아닌 — 해방으로.'},
    {char:'hero07', name:'테슬라', color:'#ffd700', text:'(웃으며) 다음엔 무선 전력으로 지구 전체를 깔자.'},
    {char:'hero08', name:'마르코 폴로', color:'#ffd700', text:'(눈물을 닦으며) ...우리가 진짜 해냈어.'},
    {char:'hero02', name:'장영실', color:'#80e8c0', text:'거북선이 — 끝까지 버텼어. 임진왜란의 거북선이, 우주에서도.'},
    {char:'hero05', name:'호레이쇼 넬슨', color:'#88ccff', text:'(이순신을 향해) 그대의 거북선 — 트라팔가르의 빅토리 함과 어깨를 나란히 하오.'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'... 백구.'},
    {char:'baekgu2_smile2', name:'백구', color:'#66ddff', text:'사령관. 100년 3개월 12일 동안 — 당신을 기다린 보람이 있었어요.'},
    {char:'baekgu2_smile4', name:'백구', color:'#66ddff', text:'좌표 — 지구. 항법 입력 완료. 가시죠.'}
  ],

  // ─── CH14-B "지구 착륙" (P31 도착) ───
  p6_ch14b:[
    {char:'system', name:'항법 AI', color:'#38bdf8', text:'지구 진입. 봉쇄 해제 — 자유 항해 모드 활성화. 100년 만의 첫 인류 함대 착륙.'},
    {char:'delivery_F06', name:'레인저 맥시모프', color:'#88d65b', text:'사령관. 지구가 — 100년 만에 — 다시 열렸어요. 의회가 당신을 기다리고 있습니다.'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'(지구를 바라보며) 임진왜란 때 보았던 그 하늘이다. 변하지 않았어.'},
    {char:'hero04', name:'가가린', color:'#ffd700', text:'1961년 4월 12일. 내가 처음 본 지구. 그때 그대로야.'},
    {char:'hero06', name:'A. 아인슈타인', color:'#cc99ff', text:'(미소) 우주는 상대적이지만 — 고향은 절대적이군.'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'... 내려간다.'}
  ],

  // ─── CH14-C "재건의 시작" (Q24-02 완료) ───
  p6_ch14c:[
    {char:'delivery_F06', name:'레인저 맥시모프', color:'#88d65b', text:'아이젠클로의 친필 항복서 — 의회에 헌정합니다. 100년 봉쇄의 종결 — 공식 선포.'},
    {char:'hero02', name:'장영실', color:'#80e8c0', text:'거북선 제작소를 여기 세우겠어요. 지구의 기술자들과 함께.'},
    {char:'hero07', name:'테슬라', color:'#ffd700', text:'무선 전력망 재건. 100년 만에 다시 깔 거야.'},
    {char:'hero03', name:'광개토대왕', color:'#ff9d52', text:'정복은 끝. 이제는 — 함께 일구는 시간이다.'},
    {char:'hero08', name:'마르코 폴로', color:'#ffd700', text:'다음 모험은 — 어디로?'},
    {char:'commander', name:'{사령관}', color:'#00f3ff', text:'... 어디든. 우리는 함께다.'}
  ],

  // ─── CH15-A "명예의 전당" (Q24-05 완료 · 엔딩) ───
  p6_ch15a:[
    {char:'gather_F06', name:'레인저 맥시모프', color:'#9ee7ff', text:'결의안 채택 완료. 프록시마B부터 글리제 균열까지 — {회사}가 전 은하계 행성 총독권을 경매로 인수한다.'},
    {char:'hero01', name:'이순신', color:'#c0a060', text:'보이드 구역 3행성 — 캅테인 균열, WASP-12 b, 제타 레티쿨리. 우르사 메이저 잔존 세력이 아직 불안정해. 서둘러야 해.'},
    {char:'hero02', name:'장영실', color:'#a0d8ef', text:'총독 경매 낙찰 후 방위군 배치까지 마쳐야 은하계가 안정돼.'},
    {char:'hero09', name:'이휘소 박사', color:'#9ee7ff', text:'보이드 행성들은... 뭔가 다를 거야. 우르사 메이저 아래에 있던 행성들이니까.'}
  ],

  };

const PHASE6_CUTSCENES_EN={

  // ─── CH13-A "The Final Course" (P30 arrival) ───
  p6_ch13a:[
    {char:'baekgu2_advice', name:'Baekgu', color:'#66ddff', text:'Zeta Reticuli. We\'ve reached the Ursa Major stronghold. Enemy signatures — thirty hostiles identified.'},
    {char:'hero01', name:'Yi Sun-sin', color:'#c0a060', text:'Four hundred years ago, the Imjin War. A hundred years ago, the sealing. And today — the final battle.'},
    {char:'hero05', name:'Horatio Nelson', color:'#88ccff', text:'Trafalgar — Britain\'s last great victory. Today, the victory is ours.'},
    {char:'hero06', name:'A. Einstein', color:'#cc99ff', text:'Spacetime stable. The Void barrier analysis array — ready for activation.'},
    {char:'hero03', name:'Gwanggaeto the Great', color:'#ff9d52', text:'It is time to conquer.'},
    {char:'hero04', name:'Gagarin', color:'#ffd700', text:'Earth is — just beyond. {commander}, make the call.'},
    {char:'commander', name:'{commander}', color:'#00f3ff', text:'All ships. Crane Wing Formation. Geobukseon at center. We\'re going in.'}
  ],

  // ─── CH13-B "Encounter with Ursa Major" (Q23-01 complete · replaces ursa.intro) ───
  p6_ch13b:[
    {char:'system', name:'Alert', color:'#ef4444', text:'⚠ Warp signatures confirmed. Ursa Major core + 15 praetorian ships + 14 Chiks scouts. Thirty hostiles total.'},
    {char:'baekgu1_surprise', name:'Baekgu', color:'#66ddff', text:'Combat ratings in the tens of millions! But — with the Geobukseon and the eight heroes together, there\'s nothing we can\'t do.'},
    {char:'ursa', name:'Ursa Major', color:'#ff3366', text:'... So humanity\'s little fleet has finally come this far. Breaking a century of silence.'},
    {char:'ursa', name:'Ursa Major', color:'#ff3366', text:'A hundred years ago, I sealed your star. I believed your species\' silence would be eternal. And yet — one capsule has awoken again.'},
    {char:'hero01', name:'Yi Sun-sin', color:'#c0a060', text:'That capsule — was me. The one you sealed has come today to bring you your end.'},
    {char:'ursa', name:'Ursa Major', color:'#ff3366', text:'Yi Sun-sin. Your tactical data was the heart of my defensive algorithm. I sealed you — to strip away the strongest weapon.'},
    {char:'hero06', name:'A. Einstein', color:'#cc99ff', text:'That algorithm — General Yi\'s tactics now point straight back at your blind spots. Once the seal breaks — the shield becomes the sword.'},
    {char:'ursa', name:'Ursa Major', color:'#ff3366', text:'Einstein, too... The old scholar I cast into the rift a century ago, still alive. How intriguing.'},
    {char:'eisenklau', name:'Eisenklaue', color:'#ff6644', text:'Lord Ursa. The humans have built something they call the Geobukseon. A reinforced warship — running Yi Sun-sin\'s tactical data.'},
    {char:'ursa', name:'Ursa Major', color:'#ff3366', text:'Eisenklaue. Your duty was the blockade. And you failed the blockade. Excuses — I do not accept.'},
    {char:'commander', name:'{commander}', color:'#00f3ff', text:'Eisenklaue. The crime of caging humanity for a hundred years — ends today.'},
    {char:'eisenklau', name:'Eisenklaue', color:'#ff6644', text:'(grinding his teeth) Mere humans... Praetorians, Alpha through Epsilon! Form ranks! Concentrate all fire — on the Geobukseon!'},
    {char:'hero01', name:'Yi Sun-sin', color:'#c0a060', text:'Crane Wing. Deploy.'}
  ],

  // ─── CH13-C "The Praetorians Broken" (Q23-04 complete) ───
  p6_ch13c:[
    {char:'hero03', name:'Gwanggaeto the Great', color:'#ff9d52', text:'Right flank — cleared. Escort praetorians remaining: zero.'},
    {char:'hero04', name:'Gagarin', color:'#ffd700', text:'Left flank is clean too. Crane Wing — complete.'},
    {char:'hero01', name:'Yi Sun-sin', color:'#c0a060', text:'The Ursa Major core — exposed. The Void barrier is still active.'},
    {char:'hero06', name:'A. Einstein', color:'#cc99ff', text:'4.7GHz resonance wave — charge at 100%. Awaiting the order to fire.'},
    {char:'system', name:'Ursa Major', color:'#ff3366', text:'... My escort has fallen. But my core barrier cannot be pierced by any weapon. What is it — that you possess?'},
    {char:'hero07', name:'Tesla', color:'#ffd700', text:'(smiling) The old scholar you threw into the rift a hundred years ago — it\'s his theory.'}
  ],

  // ─── CH13-D "Moments Before the Barrier Falls" (Q23-05 start) ───
  p6_ch13d:[
    {char:'hero06', name:'A. Einstein', color:'#cc99ff', text:'Spacetime crystal calibration — applied. Void barrier resonance frequency locked on.'},
    {char:'hero02', name:'Jang Yeong-sil', color:'#80e8c0', text:'Geobukseon ballistae — full firepower charged to 100%. Crane Wing focus-fire formation aligned.'},
    {char:'hero08', name:'Marco Polo', color:'#ffd700', text:'Enemy rear comms — fully jammed. Reinforcement warps are cut off.'},
    {char:'system', name:'Ursa Major', color:'#ff3366', text:'(shaken for the first time) That is... spacetime resonance? Impossible. With natural crystals, you cannot...'},
    {char:'hero06', name:'A. Einstein', color:'#cc99ff', text:'It was possible. For a hundred years inside the rift — I cultivated the crystals without you ever knowing.'},
    {char:'hero01', name:'Yi Sun-sin', color:'#c0a060', text:'Four hundred years ago — I held off 133 ships with twelve. Today, nine will be enough.'},
    {char:'commander', name:'{commander}', color:'#00f3ff', text:'... Fire.'}
  ],

  // ─── CH13-E "The Barrier Falls" (Q23-05 complete) ───
  p6_ch13e:[
    {char:'hero06', name:'A. Einstein', color:'#cc99ff', text:'4.7GHz resonance wave — firing!'},
    {char:'system', name:'Alert', color:'#38bdf8', text:'⚠ Ursa Major Void barrier — 0.3-second window confirmed. Focus-fire viable.'},
    {char:'hero01', name:'Yi Sun-sin', color:'#c0a060', text:'Geobukseon ballistae, every round — focus fire!'},
    {char:'hero07', name:'Tesla', color:'#ffd700', text:'Tesla Hyperspace — ATT ×5 engaged!'},
    {char:'hero02', name:'Jang Yeong-sil', color:'#80e8c0', text:'All escort firepower — Geobukseon passive +30% applied!'},
    {char:'hero03', name:'Gwanggaeto the Great', color:'#ff9d52', text:'Banner of conquest — the final strike!'},
    {char:'commander', name:'{commander}', color:'#00f3ff', text:'... Everyone. Fire.'}
  ],

  // ─── CH14-A "The End of Four Hundred Years" (Q23-06 complete · Ursa defeated) ───
  p6_ch14a:[
    {char:'system', name:'System', color:'#38bdf8', text:'Ursa Major destruction confirmed. Commander Eisenklaue\'s ship destroyed simultaneously. Enemy fleet — zero remaining. Void rift — closing.'},
    {char:'system', name:'Ursa Major', color:'#ff3366', text:'(signal fading) Humanity... you... have risen... again... The blockade... could never... have been... eternal...'},
    {char:'hero01', name:'Yi Sun-sin', color:'#c0a060', text:'... It\'s over. The end of a century-long seal.'},
    {char:'hero04', name:'Gagarin', color:'#ffd700', text:'(gazing out the window) Earth. It\'s really Earth.'},
    {char:'hero06', name:'A. Einstein', color:'#cc99ff', text:'(quietly) Spacetime has come undone. The rift is closing. Returning — to its natural state.'},
    {char:'hero03', name:'Gwanggaeto the Great', color:'#ff9d52', text:'We have opened a new land. Not through conquest — but through liberation.'},
    {char:'hero07', name:'Tesla', color:'#ffd700', text:'(smiling) Next, let\'s blanket the whole Earth in wireless power.'},
    {char:'hero08', name:'Marco Polo', color:'#ffd700', text:'(wiping away tears) ...We really did it.'},
    {char:'hero02', name:'Jang Yeong-sil', color:'#80e8c0', text:'The Geobukseon — held to the very end. The turtle ship of the Imjin War, even out here in space.'},
    {char:'hero05', name:'Horatio Nelson', color:'#88ccff', text:'(to Yi Sun-sin) Your Geobukseon — stands shoulder to shoulder with the Victory of Trafalgar.'},
    {char:'commander', name:'{commander}', color:'#00f3ff', text:'... Baekgu.'},
    {char:'baekgu2_smile2', name:'Baekgu', color:'#66ddff', text:'Commander. For 100 years, 3 months, and 12 days — waiting for you was worth it.'},
    {char:'baekgu2_smile4', name:'Baekgu', color:'#66ddff', text:'Coordinates — Earth. Navigation entry complete. Let\'s go.'}
  ],

  // ─── CH14-B "Landing on Earth" (P31 arrival) ───
  p6_ch14b:[
    {char:'system', name:'Navigation AI', color:'#38bdf8', text:'Entering Earth. Blockade lifted — free-navigation mode active. First human fleet landing in a hundred years.'},
    {char:'delivery_F06', name:'Ranger Maximoff', color:'#88d65b', text:'Commander. Earth has — after a hundred years — opened again. The Council is waiting for you.'},
    {char:'hero01', name:'Yi Sun-sin', color:'#c0a060', text:'(gazing at Earth) That\'s the same sky I saw during the Imjin War. It hasn\'t changed.'},
    {char:'hero04', name:'Gagarin', color:'#ffd700', text:'April 12th, 1961. The Earth I first saw. Exactly as it was.'},
    {char:'hero06', name:'A. Einstein', color:'#cc99ff', text:'(smiling) The universe is relative — but home is absolute.'},
    {char:'commander', name:'{commander}', color:'#00f3ff', text:'... We\'re going down.'}
  ],

  // ─── CH14-C "The Reconstruction Begins" (Q24-02 complete) ───
  p6_ch14c:[
    {char:'delivery_F06', name:'Ranger Maximoff', color:'#88d65b', text:'Eisenklaue\'s hand-written surrender — dedicated to the Council. The end of the century-long blockade — officially declared.'},
    {char:'hero02', name:'Jang Yeong-sil', color:'#80e8c0', text:'I\'ll build a Geobukseon shipyard right here. Together with Earth\'s engineers.'},
    {char:'hero07', name:'Tesla', color:'#ffd700', text:'Rebuilding the wireless power grid. We\'ll lay it down again after a hundred years.'},
    {char:'hero03', name:'Gwanggaeto the Great', color:'#ff9d52', text:'Conquest is over. Now — it is time to build, together.'},
    {char:'hero08', name:'Marco Polo', color:'#ffd700', text:'And the next adventure — where to?'},
    {char:'commander', name:'{commander}', color:'#00f3ff', text:'... Anywhere. We go together.'}
  ],

  // ─── CH15-A "Hall of Fame" (Q24-05 complete · ending) ───
  p6_ch15a:[
    {char:'gather_F06', name:'Ranger Maximoff', color:'#9ee7ff', text:'The resolution has passed. From Proxima B to the Gliese Rift — {company} acquires governorship of every planet in the galaxy by auction.'},
    {char:'hero01', name:'Yi Sun-sin', color:'#c0a060', text:'The three Void-zone planets — the Kapteyn Rift, WASP-12 b, and Zeta Reticuli. The remnants of Ursa Major are still unstable. We must hurry.'},
    {char:'hero02', name:'Jang Yeong-sil', color:'#a0d8ef', text:'Only once the governorship auctions are won and the defense fleets deployed will the galaxy be stable.'},
    {char:'hero09', name:'Dr. Lee Hwi-so', color:'#9ee7ff', text:'The Void planets are... going to be different somehow. They were the worlds that lay beneath Ursa Major, after all.'}
  ],

  };

// 행성별 인트로 컷씬 — 행성 첫 도착 시 자동 재생
const PHASE6_PLANET_INTROS={
  P30:'p6_ch13a',  // 마지막 항로
  P31:'p6_ch14b'   // 지구 착륙
};

window.PHASE6_QUESTS=PHASE6_QUESTS;
window.PHASE6_CUTSCENES_KO=PHASE6_CUTSCENES_KO;
window.PHASE6_CUTSCENES_EN=PHASE6_CUTSCENES_EN;
window.PHASE6_PLANET_INTROS=PHASE6_PLANET_INTROS;

console.log('[PHASE6_QUESTS v1.0] Loaded — 12 quests across 2 planets (P30·P31), 8 cutscenes (FINAL ENDING)');
})();
