// ═══ SHIP CATALOG & BOSS DATA ═════════════════════════════════════
// 33종 함선(소형/중형/대형/신화) + 최종 보스 데이터.
const SHIP_CATALOG=[
  // ── 소형 전투선 S01~S08 (초반 개척, 기동 게릴라) ──────────────────
  {id:'S01',nm:'머스탱',tier:'소형',price:5000,maxHP:100,maxSH:50,ATT:20,INT:15,TEC:18,LOY:80,ic:'🛸',desc:'초기 지급 기준함. 1턴 회피율 +5%'},
  {id:'S02',nm:'배저 스카우트',tier:'소형',price:8000,maxHP:200,maxSH:200,ATT:18,INT:12,TEC:22,LOY:70,ic:'🛸',cargoStart:8,desc:'빠른 정찰형. 스캔 범위 +1 · 화물 8칸'},
  {id:'S03',nm:'코요테',tier:'소형',price:14000,maxHP:180,maxSH:150,ATT:25,INT:10,TEC:30,LOY:65,ic:'🛸',partsRows:3,crewMax:6,desc:'고속 요격기. 선제 공격 확률 +10% · 파츠 6칸 · 크루 6명'},
  {id:'S04',nm:'레이더',tier:'소형',price:12000,maxHP:240,maxSH:180,ATT:20,INT:22,TEC:20,LOY:72,ic:'🛸',partsRows:3,cargoStart:6,desc:'탐지 특화. 스캔 범위 +2 · 화물 6칸 · 파츠 6칸'},
  {id:'S05',nm:'팔콘 스카우트',tier:'소형',price:20000,maxHP:350,maxSH:400,ATT:22,INT:20,TEC:28,LOY:75,ic:'🛸',partsRows:3,desc:'스텔스 진입 3턴 · 파츠 6칸'},
  {id:'S06',nm:'슬링샷',tier:'소형',price:18000,maxHP:280,maxSH:120,ATT:30,INT:8,TEC:22,LOY:68,ic:'🛸',crewMax:6,desc:'첫 공격 대미지 +30% · 크루 6명'},
  {id:'S07',nm:'페레그린',tier:'소형',price:22000,maxHP:300,maxSH:200,ATT:28,INT:15,TEC:35,LOY:72,ic:'🛸',desc:'이동 후 즉시 공격 가능'},
  {id:'S08',nm:'나이트호크',tier:'소형',price:28000,maxHP:320,maxSH:300,ATT:24,INT:18,TEC:32,LOY:74,ic:'🛸',partsRows:4,crewMax:8,desc:'스텔스+요격 복합형 · 파츠 8칸 · 크루 8명'},
  // ── 중형 고속함 M01~M10 (상업 화물 + 밸런스) ──────────────────────
  {id:'M01',nm:'그리핀',tier:'중형',price:35000,maxHP:1500,maxSH:800,ATT:32,INT:28,TEC:28,LOY:78,ic:'🚀',desc:'중형 입문형. 균형 스탯'},
  {id:'M02',nm:'불독',tier:'중형',price:42000,maxHP:2000,maxSH:600,ATT:38,INT:22,TEC:24,LOY:76,ic:'🚀',desc:'근접 화력 +20%. 근거리 특화'},
  {id:'M03',nm:'셔먼 전투함',tier:'중형',price:55000,maxHP:2200,maxSH:1200,ATT:40,INT:35,TEC:32,LOY:80,ic:'🚀',desc:'균형형 전투함'},
  {id:'M04',nm:'바이퍼',tier:'중형',price:50000,maxHP:2400,maxSH:700,ATT:48,INT:20,TEC:38,LOY:74,ic:'🚀',desc:'독 상태이상 확률 +20%'},
  {id:'M05',nm:'코브라 트레이더',tier:'중형',price:48000,maxHP:2800,maxSH:800,ATT:28,INT:30,TEC:25,LOY:85,ic:'🚀',desc:'무역 특화. 창고+30'},
  {id:'M06',nm:'팬텀',tier:'중형',price:62000,maxHP:2600,maxSH:1400,ATT:42,INT:32,TEC:40,LOY:78,ic:'🚀',desc:'스텔스 특화. 탐지 회피율 +25%'},
  {id:'M07',nm:'헌터',tier:'중형',price:75000,maxHP:3500,maxSH:1500,ATT:55,INT:32,TEC:36,LOY:78,ic:'🚀',desc:'나포 확률 +25%'},
  {id:'M08',nm:'라이노',tier:'중형',price:82000,maxHP:4200,maxSH:900,ATT:44,INT:28,TEC:30,LOY:80,ic:'🚀',desc:'충돌 체공 대미지 +40%'},
  {id:'M09',nm:'선더볼트',tier:'중형',price:100000,maxHP:3800,maxSH:2000,ATT:50,INT:45,TEC:42,LOY:82,ic:'🚀',desc:'번개 광역 공격. INT 기반 방어'},
  {id:'M10',nm:'어벤저',tier:'중형',price:130000,maxHP:6000,maxSH:2500,ATT:58,INT:52,TEC:48,LOY:90,ic:'🚀',desc:'영웅 스탯 +15%'},
  // ── 대형 순양함 H01~H12 (엔드게임 보스 격돌) ─────────────────────
  {id:'H01',nm:'크루세이더',tier:'대형',price:260000,maxHP:10000,maxSH:4000,ATT:72,INT:68,TEC:58,LOY:85,ic:'🌟',desc:'중장갑 순양함. 탑승 크루 LOY+10'},
  {id:'H02',nm:'레기온',tier:'대형',price:290000,maxHP:11000,maxSH:5000,ATT:75,INT:62,TEC:55,LOY:84,ic:'🌟',desc:'편대 지원형. 매 턴 종료 시 함대 전 함선 HP +1.5%/레기온 (최대 +15%, 10척 보유 시 캡)'},
  {id:'H03',nm:'아이언클래드',tier:'대형',price:320000,maxHP:13000,maxSH:3500,ATT:68,INT:72,TEC:52,LOY:86,ic:'🌟',desc:'극중장갑. 피해 감쇄 +20%'},
  {id:'H04',nm:'드레드노트',tier:'대형',price:480000,maxHP:16000,maxSH:7000,ATT:88,INT:82,TEC:62,LOY:88,ic:'🌟',desc:'무기 4개 이상 시 크리티컬 +15%'},
  {id:'H05',nm:'노바 캐논',tier:'대형',price:380000,maxHP:12000,maxSH:5500,ATT:95,INT:70,TEC:60,LOY:82,ic:'🌟',desc:'원거리 포격 특화. ATT 최고급'},
  {id:'H06',nm:'아르고',tier:'대형',price:420000,maxHP:14000,maxSH:6000,ATT:78,INT:85,TEC:65,LOY:84,ic:'🌟',desc:'탐험 특화. 신규 행성 발견 확률 +20%'},
  {id:'H07',nm:'타이탄',tier:'대형',price:450000,maxHP:15000,maxSH:7500,ATT:82,INT:75,TEC:68,LOY:85,ic:'🌟',desc:'균형 전투함. 공/방/속 밸런스'},
  {id:'H08',nm:'스톰브링어',tier:'대형',price:500000,maxHP:17000,maxSH:6500,ATT:92,INT:80,TEC:70,LOY:86,ic:'🌟',desc:'번개 폭풍. 광역 연쇄 공격'},
  {id:'H09',nm:'갤럭시 호크',tier:'대형',price:580000,maxHP:20000,maxSH:8000,ATT:98,INT:88,TEC:75,LOY:87,ic:'🌟',desc:'고속 중순양함. 추가 턴 오더 +1'},
  {id:'H10',nm:'레비아탄',tier:'대형',price:1200000,maxHP:45000,maxSH:18000,ATT:110,INT:105,TEC:95,LOY:92,ic:'🌟',desc:'전설 대형 전투함. 화력 최강'},
  {id:'H11',nm:'아르마다',tier:'대형',price:950000,maxHP:38000,maxSH:22000,ATT:90,INT:120,TEC:88,LOY:95,ic:'🌟',desc:'방어·지원 특화. 함대 전체 실드+20%'},
  {id:'H12',nm:'우르사 파쇄기',tier:'대형',price:2000000,maxHP:75000,maxSH:25000,ATT:120,INT:115,TEC:100,LOY:90,ic:'🌟',desc:'보스전 실드 관통 100,000. 보이드 전용'},
  // ── 신화 함선 LGD01~LGD03 (최고등급 신화함, 제한 없음) ───────────
  {id:'LGD01',nm:'거북선',tier:'신화',price:25000000,maxHP:260000,maxSH:65000,ATT:245,INT:235,TEC:210,LOY:80,ic:'✦',desc:'신화급 전투함. 호위함 ATT/INT +30% · 압도적 내구도'},
  {id:'LGD02',nm:'워덴클리프',tier:'신화',price:22500000,maxHP:175000,maxSH:160000,ATT:323,INT:265,TEC:230,LOY:80,ic:'✦',desc:'신화급 전투함. 매 턴 적 모듈 1개 랜덤 비활성화 · 강화된 실드/화력'},
  {id:'LGD03',nm:'렐러티비티',tier:'신화',price:30000000,maxHP:245000,maxSH:90000,ATT:306,INT:295,TEC:255,LOY:80,ic:'✦',desc:'신화급 전투함. 항상 최우선 턴 오더 강제 부여 · 강화된 화력'},
  // ── 우르사 메이저 — 격파 후 나포 시 등장하는 최종 보스 함선 ────────────
  {id:'URSA',catalogId:'URSA',nm:'우르사 메이저',tier:'신화',price:0,maxHP:1000000,maxSH:120000,ATT:580,INT:340,TEC:220,LOY:0,ic:'✦',desc:'치크스 친위대 기함. 보스전 격파 후 나포 가능. 신화급 풀셋(MW01·MS01·MA01·ME01) 기본 장착 · 보이드 차원의 거대 함선'},
  // ── 블랙팔콘 — 히든 보스 (보이드의 사자, 신화 최고 등급) ──────────────
  {id:'BLACKFALCON',catalogId:'BLACKFALCON',nm:'🌑 블랙팔콘',tier:'신화',price:0,maxHP:9700000,maxSH:300000,ATT:32000,INT:1200,TEC:560,LOY:0,ic:'✦',desc:'보이드의 사자(使者). 1000년의 침묵을 깨고 나타난 검은 정찰함. 히든 보스 격파 후 나포 가능 — 우르사 메이저의 2배 능력치, 신화 최고 등급.'},
  // ── 문명권별 전용 함선 (각 문명 행성에서만 구매 · 클래스 최상위급 성능 / F07 보이드 최강) ─
  // 이미지: img/ships/F0X_S/M/L.png · 가격은 기존 최고가보다 상회 (영웅급 프리미엄)
  // ── F01 수퍼비아 (귀족·정치 — INT/LOY 강세, 외교 보너스) ──
  {id:'F01_S',civ:'F01',nm:'임페리오 호위정',tier:'소형',price:65000,maxHP:540,maxSH:480,ATT:38,INT:36,TEC:36,LOY:95,ic:'🛸',cargoStart:8,desc:'수퍼비아 황실 친위 정찰기. 명성 획득 +10% · LOY 95 (소형 최상) · 화물 8칸'},
  {id:'F01_M',civ:'F01',nm:'노블레스 가디언',tier:'중형',price:280000,maxHP:6800,maxSH:3000,ATT:62,INT:60,TEC:52,LOY:96,ic:'🚀',cargoStart:16,desc:'수퍼비아 귀족 호위 순양함. 함대 LOY +5 · 행성 세금 -10% · 화물 16칸'},
  {id:'F01_L',civ:'F01',nm:'임페리얼 솔라리스',tier:'대형',price:1050000,maxHP:23000,maxSH:10000,ATT:104,INT:108,TEC:82,LOY:98,ic:'🌟',cargoStart:24,desc:'수퍼비아 황제 친위 기함. 명성 +20% · 외교 협상 우대 · 화물 24칸'},
  // ── F02 아우레우스 (금융 — 화물·크레딧) ──
  {id:'F02_S',civ:'F02',nm:'골드 베인',tier:'소형',price:62000,maxHP:520,maxSH:460,ATT:38,INT:32,TEC:38,LOY:88,ic:'🛸',cargoStart:24,desc:'아우레우스 무역 호위기. 화물 24칸 · 거래 수익 +5%'},
  {id:'F02_M',civ:'F02',nm:'머카타일 갤리언',tier:'중형',price:285000,maxHP:7000,maxSH:2900,ATT:60,INT:58,TEC:52,LOY:92,ic:'🚀',cargoStart:36,desc:'아우레우스 상단 호위 순양함. 화물 36칸 · 무역 수익 +20%'},
  {id:'F02_L',civ:'F02',nm:'골드 페가서스',tier:'대형',price:1100000,maxHP:22500,maxSH:9500,ATT:102,INT:100,TEC:82,LOY:95,ic:'🌟',cargoStart:24,desc:'아우레우스 황금 페가서스 기함. 격파 시 크레딧 +30% · 거래 +15% · 화물 24칸'},
  // ── F03 메카니카 (기계 — TEC/INT, 자동수리) ──
  {id:'F03_S',civ:'F03',nm:'코어 드론',tier:'소형',price:68000,maxHP:500,maxSH:520,ATT:36,INT:40,TEC:48,LOY:82,ic:'🛸',cargoStart:8,desc:'메카니카 자율 정찰 드론. TEC 48 (소형 최상) · 매 턴 INT +5 · 화물 8칸'},
  {id:'F03_M',civ:'F03',nm:'기어 헤드',tier:'중형',price:295000,maxHP:6800,maxSH:3100,ATT:62,INT:60,TEC:64,LOY:92,ic:'🚀',partsRows:5,cargoStart:16,desc:'메카니카 산업 중형함. 파츠 슬롯 10개 · TEC 최강 · 자동 수리 1%/턴 · 화물 16칸'},
  {id:'F03_L',civ:'F03',nm:'옴니코어 프라임',tier:'대형',price:1150000,maxHP:23500,maxSH:9800,ATT:104,INT:118,TEC:100,LOY:94,ic:'🌟',cargoStart:24,desc:'메카니카 슈퍼AI 기함. INT 118 · TEC 100 · 매 턴 적 1척 TEC -10% · 화물 24칸'},
  // ── F04 크리그 (전사 — ATT 최강) ──
  {id:'F04_S',civ:'F04',nm:'워액스',tier:'소형',price:70000,maxHP:580,maxSH:380,ATT:52,INT:22,TEC:38,LOY:85,ic:'🛸',cargoStart:8,desc:'크리그 돌격 정찰기. ATT 52 (소형 최강) · 첫 턴 크리티컬 +15% · 화물 8칸'},
  {id:'F04_M',civ:'F04',nm:'블러드해머',tier:'중형',price:305000,maxHP:7200,maxSH:2700,ATT:78,INT:50,TEC:56,LOY:93,ic:'🚀',cargoStart:16,desc:'크리그 전투 순양함. ATT 78 (중형 최강) · 근접 ATT +25% · 화물 16칸'},
  {id:'F04_L',civ:'F04',nm:'블레이드 오브 크리그',tier:'대형',price:1200000,maxHP:24000,maxSH:9200,ATT:122,INT:92,TEC:85,LOY:95,ic:'🌟',cargoStart:24,desc:'크리그 군단 기함. ATT 122 (대형 최강) · 전투 시작 시 적 기함 ATT -15% · 화물 24칸'},
  // ── F05 치크스 (해적 — 노획 함선) — 기존 CHIX 라인 → 문명권 최상위 수치로 동급 상향 ──
  {id:'CHIX_S_BUY',civ:'F05',nm:'치크스 정찰기',tier:'소형',price:65000,maxHP:560,maxSH:420,ATT:42,INT:30,TEC:38,LOY:75,ic:'🛸',catalogId:'CHIX_S',cargoStart:8,desc:'노획된 치크스 정찰기. 이질적 생체회로로 INT 회복 +10%/턴 · 화물 8칸'},
  {id:'CHIX_M_BUY',civ:'F05',nm:'치크스 순양함',tier:'중형',price:290000,maxHP:6700,maxSH:2800,ATT:70,INT:56,TEC:54,LOY:88,ic:'🚀',catalogId:'CHIX_M',cargoStart:16,desc:'노획된 치크스 중형 순양함. 치크스 함대 상대로 ATT +25% · 화물 16칸'},
  {id:'CHIX_L_BUY',civ:'F05',nm:'치크스 모선',tier:'대형',price:1080000,maxHP:22500,maxSH:9500,ATT:106,INT:100,TEC:82,LOY:90,ic:'🌟',catalogId:'CHIX_L',cargoStart:24,desc:'노획된 치크스 모선. 전투 시작 시 적 1척 마비(1턴) · 화물 24칸'},
  // ── F06 지구저항군 (회복·내구 — HP 최강) ──
  {id:'F06_S',civ:'F06',nm:'자유의 횃불',tier:'소형',price:58000,maxHP:620,maxSH:440,ATT:38,INT:28,TEC:36,LOY:96,ic:'🛸',cargoStart:8,desc:'지구저항군 정찰기. HP 620 (소형 최상) · 매 턴 HP +1% · LOY 96 · 화물 8칸'},
  {id:'F06_M',civ:'F06',nm:'게릴라 와스프',tier:'중형',price:275000,maxHP:7500,maxSH:2800,ATT:64,INT:56,TEC:56,LOY:95,ic:'🚀',cargoStart:16,desc:'화성·달 게릴라 순양함. HP 7500 (중형 최상) · 수리 효율 +25% · 자국령 ATT +10% · 화물 16칸'},
  {id:'F06_L',civ:'F06',nm:'어스 다이어울프',tier:'대형',price:1020000,maxHP:25000,maxSH:9300,ATT:108,INT:100,TEC:86,LOY:98,ic:'🌟',cargoStart:24,desc:'지구저항군 결사 기함. HP 25000 · 함대 HP +1%/턴 · 자국령 행성당 INT +1% (캡 +10%) · 화물 24칸'},
  // ── F07 보이드 (균열 — 모든 클래스 최강 / 사용자 명세 ★) ──
  {id:'F07_S',civ:'F07',nm:'보이드 위스퍼',tier:'소형',price:95000,maxHP:960,maxSH:840,ATT:84,INT:72,TEC:78,LOY:98,ic:'🛸',cargoStart:8,desc:'★ 보이드 최상위 정찰기. 전 스탯 소형 최강(×1.5) · 회피율 +12% · 보이드 행성에서 ATT +10% · 화물 8칸'},
  {id:'F07_M',civ:'F07',nm:'리프트 시커',tier:'중형',price:450000,maxHP:11700,maxSH:5250,ATT:123,INT:117,TEC:102,LOY:98,ic:'🚀',cargoStart:16,desc:'★ 보이드 최상위 중형함. 전 스탯 중형 최강(×1.5) · 전투 시작 시 적 INT -10% (전투 내내) · 화물 16칸'},
  {id:'F07_L',civ:'F07',nm:'메아리 군주',tier:'대형',price:1650000,maxHP:39000,maxSH:18000,ATT:192,INT:192,TEC:158,LOY:100,ic:'🌟',cargoStart:24,desc:'★★ 보이드 최강 기함. 전 스탯 대형 최강(×1.5) · INT/TEC 압도 · 매 턴 적 1척 회피율 -20% · 실드 침투 +10% · 화물 24칸'},
];

// 최종 보스 ─ 우르사 메이저 (신화 풀셋 장착) — HP 1,000만 (현실적 격파 가능 밸런스) / ATT 6000 / SH 30만
const BOSS={id:'URSA',nm:'우르사 메이저',tier:'신화',hp:10000000,maxHP:10000000,sh:300000,maxSH:300000,ATT:6000,INT:600,TEC:280,HP:10000000,LOY:0,phases:5,parts:['MW01','MS01','MA01','ME01']};
// 보스 호위 함대 (치크스 대형 함선 15척) — 우르사 메이저와 함께 등장 (보스 1 + 호위 15 = 총 16척)
const BOSS_ESCORT=(()=>{
  const greek=['알파','베타','감마','델타','엡실론','제타','에타','세타','이오타','카파','람다','뮤','뉴','크사이','오미크론'];
  return greek.map((nm,i)=>({
    id:'BOSS_E'+(i+1),
    nm:'치크스 친위대 '+nm,
    tier:'대형',
    hp:80000-i*1500,maxHP:80000-i*1500,
    sh:25000-i*500,maxSH:25000-i*500,
    ATT:1200-i*30,INT:300-i*5,TEC:120-i*2,
    HP:80000-i*1500,LOY:0,isEnemy:true
  }));
})();
