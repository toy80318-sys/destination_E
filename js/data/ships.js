// ═══ SHIP CATALOG & BOSS DATA ═════════════════════════════════════
// 33종 함선(소형/중형/대형/신화) + 최종 보스 데이터.
// nm/desc는 i18n_dict.js의 'ship.<id>.nm/desc' 키로 다국어화.
const SHIP_CATALOG=[
  // ── 소형 전투선 S01~S08 (초반 개척, 기동 게릴라) ──────────────────
  {id:'S01',nm:I18N.t('ship.S01.nm'),tier:'소형',price:5000,maxHP:100,maxSH:50,ATT:20,INT:15,TEC:18,LOY:80,ic:'🛸',desc:I18N.t('ship.S01.desc')},
  {id:'S02',nm:I18N.t('ship.S02.nm'),tier:'소형',price:8000,maxHP:200,maxSH:200,ATT:18,INT:12,TEC:22,LOY:70,ic:'🛸',cargoStart:8,desc:I18N.t('ship.S02.desc')},
  {id:'S03',nm:I18N.t('ship.S03.nm'),tier:'소형',price:14000,maxHP:180,maxSH:150,ATT:25,INT:10,TEC:30,LOY:65,ic:'🛸',partsRows:3,crewMax:6,desc:I18N.t('ship.S03.desc')},
  {id:'S04',nm:I18N.t('ship.S04.nm'),tier:'소형',price:12000,maxHP:240,maxSH:180,ATT:20,INT:22,TEC:20,LOY:72,ic:'🛸',partsRows:3,cargoStart:6,desc:I18N.t('ship.S04.desc')},
  {id:'S05',nm:I18N.t('ship.S05.nm'),tier:'소형',price:20000,maxHP:350,maxSH:400,ATT:22,INT:20,TEC:28,LOY:75,ic:'🛸',partsRows:3,desc:I18N.t('ship.S05.desc')},
  {id:'S06',nm:I18N.t('ship.S06.nm'),tier:'소형',price:18000,maxHP:280,maxSH:120,ATT:30,INT:8,TEC:22,LOY:68,ic:'🛸',crewMax:6,desc:I18N.t('ship.S06.desc')},
  {id:'S07',nm:I18N.t('ship.S07.nm'),tier:'소형',price:22000,maxHP:300,maxSH:200,ATT:28,INT:15,TEC:35,LOY:72,ic:'🛸',desc:I18N.t('ship.S07.desc')},
  {id:'S08',nm:I18N.t('ship.S08.nm'),tier:'소형',price:28000,maxHP:320,maxSH:300,ATT:24,INT:18,TEC:32,LOY:74,ic:'🛸',partsRows:4,crewMax:8,desc:I18N.t('ship.S08.desc')},
  // ── 중형 고속함 M01~M10 (상업 화물 + 밸런스) ──────────────────────
  {id:'M01',nm:I18N.t('ship.M01.nm'),tier:'중형',price:35000,maxHP:1500,maxSH:800,ATT:32,INT:28,TEC:28,LOY:78,ic:'🚀',desc:I18N.t('ship.M01.desc')},
  {id:'M02',nm:I18N.t('ship.M02.nm'),tier:'중형',price:42000,maxHP:2000,maxSH:600,ATT:38,INT:22,TEC:24,LOY:76,ic:'🚀',desc:I18N.t('ship.M02.desc')},
  {id:'M03',nm:I18N.t('ship.M03.nm'),tier:'중형',price:55000,maxHP:2200,maxSH:1200,ATT:40,INT:35,TEC:32,LOY:80,ic:'🚀',desc:I18N.t('ship.M03.desc')},
  {id:'M04',nm:I18N.t('ship.M04.nm'),tier:'중형',price:50000,maxHP:2400,maxSH:700,ATT:48,INT:20,TEC:38,LOY:74,ic:'🚀',desc:I18N.t('ship.M04.desc')},
  {id:'M05',nm:I18N.t('ship.M05.nm'),tier:'중형',price:48000,maxHP:2800,maxSH:800,ATT:28,INT:30,TEC:25,LOY:85,ic:'🚀',desc:I18N.t('ship.M05.desc')},
  {id:'M06',nm:I18N.t('ship.M06.nm'),tier:'중형',price:62000,maxHP:2600,maxSH:1400,ATT:42,INT:32,TEC:40,LOY:78,ic:'🚀',desc:I18N.t('ship.M06.desc')},
  {id:'M07',nm:I18N.t('ship.M07.nm'),tier:'중형',price:75000,maxHP:3500,maxSH:1500,ATT:55,INT:32,TEC:36,LOY:78,ic:'🚀',desc:I18N.t('ship.M07.desc')},
  {id:'M08',nm:I18N.t('ship.M08.nm'),tier:'중형',price:82000,maxHP:4200,maxSH:900,ATT:44,INT:28,TEC:30,LOY:80,ic:'🚀',desc:I18N.t('ship.M08.desc')},
  {id:'M09',nm:I18N.t('ship.M09.nm'),tier:'중형',price:100000,maxHP:3800,maxSH:2000,ATT:50,INT:45,TEC:42,LOY:82,ic:'🚀',desc:I18N.t('ship.M09.desc')},
  {id:'M10',nm:I18N.t('ship.M10.nm'),tier:'중형',price:130000,maxHP:6000,maxSH:2500,ATT:58,INT:52,TEC:48,LOY:90,ic:'🚀',desc:I18N.t('ship.M10.desc')},
  // ── 대형 순양함 H01~H12 (엔드게임 보스 격돌) ─────────────────────
  {id:'H01',nm:I18N.t('ship.H01.nm'),tier:'대형',price:260000,maxHP:10000,maxSH:4000,ATT:72,INT:68,TEC:58,LOY:85,ic:'🌟',desc:I18N.t('ship.H01.desc')},
  {id:'H02',nm:I18N.t('ship.H02.nm'),tier:'대형',price:290000,maxHP:11000,maxSH:5000,ATT:75,INT:62,TEC:55,LOY:84,ic:'🌟',desc:I18N.t('ship.H02.desc')},
  {id:'H03',nm:I18N.t('ship.H03.nm'),tier:'대형',price:320000,maxHP:13000,maxSH:3500,ATT:68,INT:72,TEC:52,LOY:86,ic:'🌟',desc:I18N.t('ship.H03.desc')},
  {id:'H04',nm:I18N.t('ship.H04.nm'),tier:'대형',price:480000,maxHP:16000,maxSH:7000,ATT:88,INT:82,TEC:62,LOY:88,ic:'🌟',desc:I18N.t('ship.H04.desc')},
  {id:'H05',nm:I18N.t('ship.H05.nm'),tier:'대형',price:380000,maxHP:12000,maxSH:5500,ATT:95,INT:70,TEC:60,LOY:82,ic:'🌟',desc:I18N.t('ship.H05.desc')},
  {id:'H06',nm:I18N.t('ship.H06.nm'),tier:'대형',price:420000,maxHP:14000,maxSH:6000,ATT:78,INT:85,TEC:65,LOY:84,ic:'🌟',desc:I18N.t('ship.H06.desc')},
  {id:'H07',nm:I18N.t('ship.H07.nm'),tier:'대형',price:450000,maxHP:15000,maxSH:7500,ATT:82,INT:75,TEC:68,LOY:85,ic:'🌟',desc:I18N.t('ship.H07.desc')},
  {id:'H08',nm:I18N.t('ship.H08.nm'),tier:'대형',price:500000,maxHP:17000,maxSH:6500,ATT:92,INT:80,TEC:70,LOY:86,ic:'🌟',desc:I18N.t('ship.H08.desc')},
  {id:'H09',nm:I18N.t('ship.H09.nm'),tier:'대형',price:580000,maxHP:20000,maxSH:8000,ATT:98,INT:88,TEC:75,LOY:87,ic:'🌟',desc:I18N.t('ship.H09.desc')},
  {id:'H10',nm:I18N.t('ship.H10.nm'),tier:'대형',price:1200000,maxHP:45000,maxSH:18000,ATT:110,INT:105,TEC:95,LOY:92,ic:'🌟',desc:I18N.t('ship.H10.desc')},
  {id:'H11',nm:I18N.t('ship.H11.nm'),tier:'대형',price:950000,maxHP:38000,maxSH:22000,ATT:90,INT:120,TEC:88,LOY:95,ic:'🌟',desc:I18N.t('ship.H11.desc')},
  {id:'H12',nm:I18N.t('ship.H12.nm'),tier:'대형',price:2000000,maxHP:75000,maxSH:25000,ATT:120,INT:115,TEC:100,LOY:90,ic:'🌟',desc:I18N.t('ship.H12.desc')},
  // ── 신화 함선 LGD01~LGD03 (최고등급 신화함, 제한 없음) ───────────
  {id:'LGD01',nm:I18N.t('ship.LGD01.nm'),tier:'신화',price:25000000,maxHP:260000,maxSH:65000,ATT:245,INT:235,TEC:210,LOY:80,ic:'✦',desc:I18N.t('ship.LGD01.desc')},
  {id:'LGD02',nm:I18N.t('ship.LGD02.nm'),tier:'신화',price:22500000,maxHP:175000,maxSH:160000,ATT:323,INT:265,TEC:230,LOY:80,ic:'✦',desc:I18N.t('ship.LGD02.desc')},
  {id:'LGD03',nm:I18N.t('ship.LGD03.nm'),tier:'신화',price:30000000,maxHP:245000,maxSH:90000,ATT:306,INT:295,TEC:255,LOY:80,ic:'✦',desc:I18N.t('ship.LGD03.desc')},
  // ── 우르사 메이저 — 격파 후 나포 시 등장하는 최종 보스 함선 ────────────
  {id:'URSA',catalogId:'URSA',nm:I18N.t('ship.URSA.nm'),tier:'신화',price:0,maxHP:1000000,maxSH:120000,ATT:580,INT:340,TEC:220,LOY:0,ic:'✦',desc:I18N.t('ship.URSA.desc')},
  // ── 블랙팔콘 — 히든 보스 (보이드의 사자, 신화 최고 등급) ──────────────
  {id:'BLACKFALCON',catalogId:'BLACKFALCON',nm:I18N.t('ship.BLACKFALCON.nm'),tier:'신화',price:0,maxHP:9700000,maxSH:300000,ATT:32000,INT:1200,TEC:560,LOY:0,ic:'✦',desc:I18N.t('ship.BLACKFALCON.desc')},
  // ── 문명권별 전용 함선 (각 문명 행성에서만 구매 · 클래스 최상위급 성능 / F07 보이드 최강) ─
  // 이미지: img/ships/F0X_S/M/L.png · 가격은 기존 최고가보다 상회 (영웅급 프리미엄)
  // ── F01 수퍼비아 (귀족·정치 — INT/LOY 강세, 외교 보너스) ──
  {id:'F01_S',civ:'F01',nm:I18N.t('ship.F01_S.nm'),tier:'소형',price:65000,maxHP:540,maxSH:480,ATT:38,INT:36,TEC:36,LOY:95,ic:'🛸',cargoStart:8,desc:I18N.t('ship.F01_S.desc')},
  {id:'F01_M',civ:'F01',nm:I18N.t('ship.F01_M.nm'),tier:'중형',price:280000,maxHP:6800,maxSH:3000,ATT:62,INT:60,TEC:52,LOY:96,ic:'🚀',cargoStart:16,desc:I18N.t('ship.F01_M.desc')},
  {id:'F01_L',civ:'F01',nm:I18N.t('ship.F01_L.nm'),tier:'대형',price:1050000,maxHP:23000,maxSH:10000,ATT:104,INT:108,TEC:82,LOY:98,ic:'🌟',cargoStart:24,desc:I18N.t('ship.F01_L.desc')},
  // ── F02 아우레우스 (금융 — 화물·크레딧) ──
  {id:'F02_S',civ:'F02',nm:I18N.t('ship.F02_S.nm'),tier:'소형',price:62000,maxHP:520,maxSH:460,ATT:38,INT:32,TEC:38,LOY:88,ic:'🛸',cargoStart:24,desc:I18N.t('ship.F02_S.desc')},
  {id:'F02_M',civ:'F02',nm:I18N.t('ship.F02_M.nm'),tier:'중형',price:285000,maxHP:7000,maxSH:2900,ATT:60,INT:58,TEC:52,LOY:92,ic:'🚀',cargoStart:36,desc:I18N.t('ship.F02_M.desc')},
  {id:'F02_L',civ:'F02',nm:I18N.t('ship.F02_L.nm'),tier:'대형',price:1100000,maxHP:22500,maxSH:9500,ATT:102,INT:100,TEC:82,LOY:95,ic:'🌟',cargoStart:24,desc:I18N.t('ship.F02_L.desc')},
  // ── F03 메카니카 (기계 — TEC/INT, 자동수리) ──
  {id:'F03_S',civ:'F03',nm:I18N.t('ship.F03_S.nm'),tier:'소형',price:68000,maxHP:500,maxSH:520,ATT:36,INT:40,TEC:48,LOY:82,ic:'🛸',cargoStart:8,desc:I18N.t('ship.F03_S.desc')},
  {id:'F03_M',civ:'F03',nm:I18N.t('ship.F03_M.nm'),tier:'중형',price:295000,maxHP:6800,maxSH:3100,ATT:62,INT:60,TEC:64,LOY:92,ic:'🚀',partsRows:5,cargoStart:16,desc:I18N.t('ship.F03_M.desc')},
  {id:'F03_L',civ:'F03',nm:I18N.t('ship.F03_L.nm'),tier:'대형',price:1150000,maxHP:23500,maxSH:9800,ATT:104,INT:118,TEC:100,LOY:94,ic:'🌟',cargoStart:24,desc:I18N.t('ship.F03_L.desc')},
  // ── F04 크리그 (전사 — ATT 최강) ──
  {id:'F04_S',civ:'F04',nm:I18N.t('ship.F04_S.nm'),tier:'소형',price:70000,maxHP:580,maxSH:380,ATT:52,INT:22,TEC:38,LOY:85,ic:'🛸',cargoStart:8,desc:I18N.t('ship.F04_S.desc')},
  {id:'F04_M',civ:'F04',nm:I18N.t('ship.F04_M.nm'),tier:'중형',price:305000,maxHP:7200,maxSH:2700,ATT:78,INT:50,TEC:56,LOY:93,ic:'🚀',cargoStart:16,desc:I18N.t('ship.F04_M.desc')},
  {id:'F04_L',civ:'F04',nm:I18N.t('ship.F04_L.nm'),tier:'대형',price:1200000,maxHP:24000,maxSH:9200,ATT:122,INT:92,TEC:85,LOY:95,ic:'🌟',cargoStart:24,desc:I18N.t('ship.F04_L.desc')},
  // ── F05 치크스 (해적 — 노획 함선) — 기존 CHIX 라인 → 문명권 최상위 수치로 동급 상향 ──
  {id:'CHIX_S_BUY',civ:'F05',nm:I18N.t('ship.CHIX_S_BUY.nm'),tier:'소형',price:65000,maxHP:560,maxSH:420,ATT:42,INT:30,TEC:38,LOY:75,ic:'🛸',catalogId:'CHIX_S',cargoStart:8,desc:I18N.t('ship.CHIX_S_BUY.desc')},
  {id:'CHIX_M_BUY',civ:'F05',nm:I18N.t('ship.CHIX_M_BUY.nm'),tier:'중형',price:290000,maxHP:6700,maxSH:2800,ATT:70,INT:56,TEC:54,LOY:88,ic:'🚀',catalogId:'CHIX_M',cargoStart:16,desc:I18N.t('ship.CHIX_M_BUY.desc')},
  {id:'CHIX_L_BUY',civ:'F05',nm:I18N.t('ship.CHIX_L_BUY.nm'),tier:'대형',price:1080000,maxHP:22500,maxSH:9500,ATT:106,INT:100,TEC:82,LOY:90,ic:'🌟',catalogId:'CHIX_L',cargoStart:24,desc:I18N.t('ship.CHIX_L_BUY.desc')},
  // ── F06 지구저항군 (회복·내구 — HP 최강) ──
  // 사용자 요청 2026-06-09: F06 함선 S/M/L 성능 1.2배 강화 (maxHP/maxSH/ATT/INT/TEC)
  {id:'F06_S',civ:'F06',nm:I18N.t('ship.F06_S.nm'),tier:'소형',price:58000,maxHP:744,maxSH:528,ATT:46,INT:34,TEC:43,LOY:96,ic:'🛸',cargoStart:8,desc:I18N.t('ship.F06_S.desc')},
  {id:'F06_M',civ:'F06',nm:I18N.t('ship.F06_M.nm'),tier:'중형',price:275000,maxHP:9000,maxSH:3360,ATT:77,INT:67,TEC:67,LOY:95,ic:'🚀',cargoStart:16,desc:I18N.t('ship.F06_M.desc')},
  {id:'F06_L',civ:'F06',nm:I18N.t('ship.F06_L.nm'),tier:'대형',price:1020000,maxHP:30000,maxSH:11160,ATT:130,INT:120,TEC:103,LOY:98,ic:'🌟',cargoStart:24,desc:I18N.t('ship.F06_L.desc')},
  // ── F07 보이드 (균열 — 모든 클래스 최강 / 사용자 명세 ★) ──
  {id:'F07_S',civ:'F07',nm:I18N.t('ship.F07_S.nm'),tier:'소형',price:95000,maxHP:960,maxSH:840,ATT:84,INT:72,TEC:78,LOY:98,ic:'🛸',cargoStart:8,desc:I18N.t('ship.F07_S.desc')},
  {id:'F07_M',civ:'F07',nm:I18N.t('ship.F07_M.nm'),tier:'중형',price:450000,maxHP:11700,maxSH:5250,ATT:123,INT:117,TEC:102,LOY:98,ic:'🚀',cargoStart:16,desc:I18N.t('ship.F07_M.desc')},
  {id:'F07_L',civ:'F07',nm:I18N.t('ship.F07_L.nm'),tier:'대형',price:1650000,maxHP:39000,maxSH:18000,ATT:192,INT:192,TEC:158,LOY:100,ic:'🌟',cargoStart:24,desc:I18N.t('ship.F07_L.desc')},
];

// 최종 보스 ─ 우르사 메이저 (신화 풀셋 장착) — HP 1,000만 / ATT 30,000 / SH 30만
// 사용자 요청 (2026-06-06): ATT 6,000 → 30,000 (×5) 인상.
//   · 보스전 baseline _BASE_ATT = ATT × 3 = 90,000
//   · 본체 각성 2페이즈 후 추가 ×3 — 최종 270,000
//   · 캡처 시 보상 함선 ATT = ATT × 2 = 60,000 (격파한 만큼 강력해진 노획함)
const BOSS={id:'URSA',nm:I18N.t('ship.BOSS.nm'),tier:'신화',hp:10000000,maxHP:10000000,sh:300000,maxSH:300000,ATT:30000,INT:600,TEC:280,HP:10000000,LOY:0,phases:5,parts:['MW01','MS01','MA01','ME01']};
// 보스 호위 함대 (치크스 대형 함선 15척) — 우르사 메이저와 함께 등장 (보스 1 + 호위 15 = 총 16척)
const BOSS_ESCORT=(()=>{
  // 그리스 문자 키 (i18n_dict.js: ship.greek.*) — 호위함 이름 접미사
  const greekKeys=['alpha','beta','gamma','delta','epsilon','zeta','eta','theta','iota','kappa','lambda','mu','nu','xi','omicron'];
  return greekKeys.map((gKey,i)=>({
    id:'BOSS_E'+(i+1),
    nm:I18N.t('ship.bossEscort.label',{letter:I18N.t('ship.greek.'+gKey)}),
    tier:'대형',
    hp:80000-i*1500,maxHP:80000-i*1500,
    sh:25000-i*500,maxSH:25000-i*500,
    ATT:1200-i*30,INT:300-i*5,TEC:120-i*2,
    HP:80000-i*1500,LOY:0,isEnemy:true
  }));
})();
