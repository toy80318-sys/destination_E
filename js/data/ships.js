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
  {id:'H02',nm:'레기온',tier:'대형',price:290000,maxHP:11000,maxSH:5000,ATT:75,INT:62,TEC:55,LOY:84,ic:'🌟',desc:'편대 지원 강화. 아군 회복+15%'},
  {id:'H03',nm:'아이언클래드',tier:'대형',price:320000,maxHP:13000,maxSH:3500,ATT:68,INT:72,TEC:52,LOY:86,ic:'🌟',desc:'극중장갑. 피해 감쇄 +20%'},
  {id:'H04',nm:'드레드노트',tier:'대형',price:480000,maxHP:16000,maxSH:7000,ATT:88,INT:82,TEC:62,LOY:88,ic:'🌟',desc:'무기 4개 이상 시 크리티컬 +15%'},
  {id:'H05',nm:'노바 캐논',tier:'대형',price:380000,maxHP:12000,maxSH:5500,ATT:95,INT:70,TEC:60,LOY:82,ic:'🌟',desc:'원거리 포격 특화. ATT 최고급'},
  {id:'H06',nm:'아르고',tier:'대형',price:420000,maxHP:14000,maxSH:6000,ATT:78,INT:85,TEC:65,LOY:84,ic:'🌟',desc:'탐험 특화. 신규 행성 발견 확률 +20%'},
  {id:'H07',nm:'타이탄',tier:'대형',price:450000,maxHP:15000,maxSH:7500,ATT:82,INT:75,TEC:68,LOY:85,ic:'🌟',desc:'균형 전투함. 공/방/속 밸런스'},
  {id:'H08',nm:'스톰브링어',tier:'대형',price:500000,maxHP:17000,maxSH:6500,ATT:92,INT:80,TEC:70,LOY:86,ic:'🌟',desc:'번개 폭풍. 광역 연쇄 공격'},
  {id:'H09',nm:'갤럭시 호크',tier:'대형',price:580000,maxHP:20000,maxSH:8000,ATT:98,INT:88,TEC:75,LOY:87,ic:'🌟',desc:'고속 중순양함. 추가 턴 오더 +1'},
  {id:'H10',nm:'레비아탄',tier:'대형',price:1200000,maxHP:45000,maxSH:18000,ATT:110,INT:105,TEC:95,LOY:92,ic:'🌟',desc:'전설 대형 전투함. 화력 최강'},
  {id:'H11',nm:'아르마다',tier:'대형',price:950000,maxHP:38000,maxSH:22000,ATT:90,INT:120,TEC:88,LOY:95,ic:'🌟',desc:'방어·지원 특화. 함대 전체 실드+20%'},
  {id:'H12',nm:'우르사 메이저 파쇄기',tier:'대형',price:2000000,maxHP:75000,maxSH:25000,ATT:120,INT:115,TEC:100,LOY:90,ic:'🌟',desc:'보스전 실드 관통 100,000. 보이드 전용'},
  // ── 신화 함선 LGD01~LGD03 (최고등급 신화함, 제한 없음) ───────────
  {id:'LGD01',nm:'거북선',tier:'신화',price:25000000,maxHP:200000,maxSH:65000,ATT:245,INT:235,TEC:210,LOY:80,ic:'✦',desc:'신화급 전투함. 호위함 ATT/INT +30%'},
  {id:'LGD02',nm:'워덴클리프',tier:'신화',price:22500000,maxHP:175000,maxSH:80000,ATT:215,INT:265,TEC:230,LOY:80,ic:'✦',desc:'신화급 전투함. 매 턴 적 모듈 1개 랜덤 비활성화'},
  {id:'LGD03',nm:'렐러티비티',tier:'신화',price:30000000,maxHP:245000,maxSH:90000,ATT:255,INT:295,TEC:255,LOY:80,ic:'✦',desc:'신화급 전투함. 항상 최우선 턴 오더 강제 부여'},
];

// 최종 보스 ─ 우르사 메이저 (신화 풀셋 장착)
const BOSS={id:'URSA',nm:'우르사 메이저',hp:80000,maxHP:80000,sh:30000,maxSH:30000,ATT:4000,INT:400,TEC:180,HP:80000,LOY:0,phases:5,parts:['MW01','MS01','MA01','ME01']};
