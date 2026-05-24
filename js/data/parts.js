// ═══ PARTS DATA ═══════════════════════════════════════════════════
// 함선 파츠 정의 (무기/실드/장갑/엔진/미사일/세트/신화).
// 일반: 상점 판매 / 신화·세트: 퀘스트 보상 전용 (price:0).
const PARTS=[
  // 무기 W
  {id:'W01',cat:'weapon',nm:'기본 레이저',tier:1,wtype:'laser',ATT:15,price:2000,desc:'초급 무기'},
  {id:'W03',cat:'weapon',nm:'펄스 캐논',tier:3,wtype:'laser',ATT:35,price:8000,desc:'중급 무기'},
  {id:'W05',cat:'weapon',nm:'플라즈마 산탄',tier:5,wtype:'laser',ATT:60,price:18000,desc:'광역 무기'},
  {id:'W08',cat:'weapon',nm:'이온 캐논',tier:8,wtype:'laser',ATT:100,price:40000,desc:'고급 무기'},
  {id:'W12',cat:'weapon',nm:'강습 스파이크',tier:12,wtype:'laser',ATT:160,price:90000,desc:'최강급 무기'},
  {id:'W15',cat:'weapon',nm:'신의 철퇴',tier:15,wtype:'laser',ATT:250,price:1000000,desc:'전설 무기. 트루딜'},
  // 실드 S
  {id:'S01',cat:'shield',nm:'기본 배리어',tier:1,INT:20,maxSH:200,price:1500,desc:'기초 실드'},
  {id:'S03',cat:'shield',nm:'플라즈마 실드',tier:3,INT:50,maxSH:600,price:7000,desc:'중급 실드'},
  {id:'S06',cat:'shield',nm:'포스 필드',tier:6,INT:90,maxSH:1200,price:22000,desc:'고급 실드'},
  {id:'S10',cat:'shield',nm:'양자 방어막',tier:10,INT:140,maxSH:2500,price:60000,desc:'최고급 실드'},
  {id:'S15',cat:'shield',nm:'신의 방패',tier:15,INT:220,maxSH:5000,shieldRegen:0.08,price:900000,desc:'전설 실드. 매 턴 maxSH 8% 자가 충전'},
  // 장갑 A
  {id:'A01',cat:'armor',nm:'기본 합금',tier:1,HP:100,DEF:5,price:1800,desc:'기초 장갑'},
  {id:'A04',cat:'armor',nm:'티타늄 장갑',tier:4,HP:400,DEF:15,price:12000,desc:'중급 장갑'},
  {id:'A08',cat:'armor',nm:'중성자 장갑',tier:8,HP:900,DEF:30,price:35000,desc:'고급 장갑'},
  {id:'A12',cat:'armor',nm:'위상 장갑',tier:12,HP:1800,DEF:50,price:85000,desc:'최고급 장갑'},
  {id:'A15',cat:'armor',nm:'절대 방벽',tier:15,HP:3000,DEF:80,price:800000,desc:'전설 장갑'},
  // 엔진 E
  {id:'E01',cat:'engine',nm:'이온 추진기',tier:1,TEC:12,price:2500,desc:'기초 엔진'},
  {id:'E04',cat:'engine',nm:'플라즈마 드라이브',tier:4,TEC:35,price:10000,desc:'중급 엔진'},
  {id:'E08',cat:'engine',nm:'양자 드라이브',tier:8,TEC:70,price:30000,desc:'고급 엔진'},
  {id:'E12',cat:'engine',nm:'하이퍼드라이브',tier:12,TEC:120,price:75000,desc:'최고급 엔진'},
  {id:'E15',cat:'engine',nm:'블링크 엔진',tier:15,TEC:200,price:750000,desc:'전설 엔진. 순간이동'},
  // ── 미사일 무기 (10종) ────────────────────────────────────
  {id:'ML01',cat:'weapon',nm:'타우 미사일',tier:2,wtype:'missile',ATT:20,price:3000,faction:'F06',desc:'[F06 지구저항군] 이강호 박사 개발. 게릴라전용 경량 열추적 미사일. 실드 약세 / 장갑 관놵 특화.'},
  {id:'ML02',cat:'weapon',nm:'크리그 충격탄',tier:4,wtype:'missile',ATT:45,price:14000,faction:'F04',desc:'[F04 크리그] 화산 마그마 코어 폭발에너지 탑두. 기원지지 전쟁영주 카를로스 승인. 장갑 파괴 전문.'},
  {id:'ML03',cat:'weapon',nm:'보이드 파동탄',tier:6,wtype:'missile',ATT:75,price:25000,faction:'F07',desc:'[F07 보이드] 반물질 탄두로 공간 왜곡. 라시드 알타리크 연구소 개발. 거리 무관 명중률.'},
  {id:'ML04',cat:'weapon',nm:'수퍼비아 중력 미사일',tier:8,wtype:'missile',ATT:110,price:45000,faction:'F01',desc:'[F01 수퍼비아] 소피아 모렛룥 설계. 중력 집속 탄두. 명중 시 적 ENG -20% (1턴 지속).'},
  {id:'ML05',cat:'weapon',nm:'메카니카 스마트 미사일',tier:10,wtype:'missile',ATT:150,price:65000,faction:'F03',desc:'[F03 메카니카] AI 자율유도. 드미트리 개발. 회피 중인 함선도 추적 명중.'},
  {id:'ML06',cat:'weapon',nm:'아우레우스 황금 작살 ⚡전설',tier:15,wtype:'missile',ATT:240,price:950000,rarity:'legend',faction:'F02',desc:'[F02 아우레우스] 전설급 유도 작살. 피에르 발주. 태양핵 에너지 탄두로 DEF 무시 관통 효과.'},
  {id:'ML07',cat:'weapon',nm:'치크스 결정 파쇄탄 ⚡전설',tier:16,wtype:'missile',ATT:220,price:900000,rarity:'legend',faction:'F05',desc:'[F05 치크스] 결정석 초고속 파편 미사일. 타기가 제작. 폭발 반경 3칸 광역 타격.'},
  {id:'MMB01',cat:'weapon',nm:'이휘소 방정식 미사일 ❖신화',tier:20,wtype:'missile',ATT:380,price:0,rarity:'mythic',quest:true,faction:'F06',desc:'[신화급] 고 이휘소 박사의 입자물리 방정식 구현. DEF/SHD 관통 + 크리티칼 +30%. 뺛의 속도를 넘어 다각도 출그 다중 충격파 생성.'},
  {id:'SMIS01',cat:'weapon',nm:'광개토 봉화 미사일 ◈세트',tier:17,wtype:'missile',ATT:200,price:0,rarity:'set',setId:'goguryeo',quest:true,faction:'F06',desc:'[광개토 세트(2종)] 보유 시 ATT+100, DEF+40. 광개토대왕(영웅H03) 효과. 봉화 통신 레이더 재머 접목 자율유도.'},
  {id:'SARM01',cat:'armor',nm:'광개토 선체 ◈세트',tier:17,HP:6000,DEF:100,price:0,rarity:'set',setId:'goguryeo',quest:true,faction:'F06',desc:'[광개토 세트(2종)] 보유 시 ATT+100, DEF+40. 고구려 철갑 공법 암용. 비피 시 자동 회피 +15%.'},

  // ── 신화급 파츠 (퀘스트 보상 전용 — 상점 판매 없음) ──────────────
  {id:'MW01',cat:'weapon',nm:'허메틱 포 ✦신화',tier:20,wtype:'laser',ATT:320,price:0,desc:'신화급 무기. 연속 공격 확률+40%. 상점 미판매.',rarity:'mythic',quest:true},
  {id:'MS01',cat:'shield',nm:'크로노스 방벽 ✦신화',tier:20,INT:280,maxSH:8000,shieldRegen:0.15,price:0,desc:'신화급 실드. 피격 반사 20% + 매 턴 maxSH 15% 자가 복구. 상점 미판매.',rarity:'mythic',quest:true},
  {id:'MA01',cat:'armor',nm:'아다만 선체 ✦신화',tier:20,HP:12000,DEF:120,price:0,desc:'신화급 장갑. 치명타 피해 50% 감소. 상점 미판매.',rarity:'mythic',quest:true},
  {id:'ME01',cat:'engine',nm:'타키온 드라이브 ✦신화',tier:20,TEC:320,price:0,desc:'신화급 엔진. 이동 후 ATT+50 (1턴). 상점 미판매.',rarity:'mythic',quest:true},
  // ── 세트 아이템 (퀘스트 보상 전용 — 2종 보유시 세트 보너스) ───────
  {id:'SW01',cat:'weapon',nm:'거북선 함포 ◈세트',tier:16,wtype:'laser',ATT:180,price:0,desc:'이순신 세트(2종). 보유시 전투 ATT+80 추가.',rarity:'set',setId:'sunsin',quest:true},
  {id:'SA01',cat:'armor',nm:'거북선 갑옷 ◈세트',tier:16,HP:5000,DEF:90,price:0,desc:'이순신 세트(2종). 보유시 전투 ATT+80 추가.',rarity:'set',setId:'sunsin',quest:true},
  {id:'SE01',cat:'engine',nm:'테슬라 드라이브 ◈세트',tier:16,TEC:180,price:0,desc:'테슬라 세트(2종). 보유시 전투 INT+100 추가.',rarity:'set',setId:'tesla',quest:true},
  {id:'SS01',cat:'shield',nm:'테슬라 장벽 ◈세트',tier:16,INT:200,maxSH:4000,shieldRegen:0.10,price:0,desc:'테슬라 세트(2종). 보유시 전투 INT+100 + 매 턴 maxSH 10% 자가 복구.',rarity:'set',setId:'tesla',quest:true},
  // ── 자동 수리 로봇 파츠 (5종) — armor 카테고리에 통합 ───────────────
  // repairRate: 매 턴 종료 시 함선 maxHP의 N% 회복
  {id:'RB01',cat:'armor',nm:'정비 드론',tier:4,HP:150,DEF:5,repairRate:0.02,price:9000,desc:'기초 자동 수리 드론. 매 턴 maxHP 2% 회복'},
  {id:'RB02',cat:'armor',nm:'수리 봇',tier:8,HP:500,DEF:12,repairRate:0.04,price:32000,desc:'중급 자동 수리 봇. 매 턴 maxHP 4% 회복'},
  {id:'RB03',cat:'armor',nm:'자동 정비기',tier:12,HP:1200,DEF:25,repairRate:0.06,price:95000,rarity:'hero',desc:'영웅급 자동 정비기. 매 턴 maxHP 6% 회복'},
  {id:'RB04',cat:'armor',nm:'수리 군단 ⚡전설',tier:15,HP:2800,DEF:45,repairRate:0.10,price:1100000,rarity:'legend',desc:'전설 자동 수리 군단. 매 턴 maxHP 10% 회복'},
  {id:'RB05',cat:'armor',nm:'자가 복구 매트릭스 ✦신화',tier:20,HP:8000,DEF:80,repairRate:0.15,price:0,rarity:'mythic',quest:true,desc:'신화 자가 복구 매트릭스. 매 턴 maxHP 15% 회복 + 격침 시 1회 부활(HP 30%). 상점 미판매.'},
  // ── 흡혈형 자동 수리 로봇 (5종) — 레이저 발사 시 HP/실드 흡수 회복 ─────
  // laserHealHP / laserHealSH: 레이저 발사 1회당 입힌 피해의 N% 만큼 자가 함선 HP/실드 회복
  {id:'RB06',cat:'armor',nm:'흡혈 정비 드론',tier:6,HP:300,DEF:8,repairRate:0.03,laserHealHP:0.05,price:14000,desc:'적의 에너지 잔열을 회수하는 정비 드론. 매 턴 maxHP 3% 회복 + 레이저 발사 시 피해의 5%만큼 HP 흡수'},
  {id:'RB07',cat:'armor',nm:'적응형 회복 봇',tier:10,HP:800,DEF:18,repairRate:0.05,laserHealHP:0.08,laserHealSH:0.05,price:48000,desc:'중급 적응형 회복 봇. 매 턴 maxHP 5% 회복 + 레이저 발사 시 피해의 8%만큼 HP / 5%만큼 실드 흡수'},
  {id:'RB08',cat:'armor',nm:'듀얼 코어 정비 시스템',tier:14,HP:1800,DEF:35,repairRate:0.08,laserHealHP:0.10,laserHealSH:0.08,price:140000,rarity:'hero',desc:'영웅급 듀얼 코어 정비 시스템. 매 턴 maxHP 8% 회복 + 레이저 발사 시 피해의 10%만큼 HP / 8%만큼 실드 흡수'},
  {id:'RB09',cat:'armor',nm:'흡혈 폭격 코어 ⚡전설',tier:17,HP:3800,DEF:60,repairRate:0.12,laserHealHP:0.15,laserHealSH:0.12,price:0,rarity:'legend',quest:true,desc:'전설 흡혈 코어. 매 턴 maxHP 12% 회복 + 레이저 발사 시 피해의 15%만큼 HP / 12%만큼 실드 흡수. 상점 미판매 (설계도 제작)'},
  {id:'RB10',cat:'armor',nm:'영혼 흡수 매트릭스 ✦신화',tier:21,HP:9500,DEF:100,repairRate:0.18,laserHealHP:0.20,laserHealSH:0.18,price:0,rarity:'mythic',quest:true,desc:'신화 영혼 흡수 매트릭스. 매 턴 maxHP 18% 회복 + 레이저 발사 시 피해의 20%만큼 HP / 18%만큼 실드 흡수. 격침 시 1회 부활(HP 50%). 상점 미판매 (설계도 제작)'}
];
// O(1) 파츠 ID 조회 — PARTS.find() 매 호출 선형 탐색을 대체
const PARTS_BY_ID=Object.fromEntries(PARTS.map(p=>[p.id,p]));
function partById(id){return PARTS_BY_ID[id];}
