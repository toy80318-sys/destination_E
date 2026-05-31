// ═══ CARGO EXPANSION DATA ═════════════════════════════════════════
// 창고 확장 아이템(CH01~CH10): 문명별 컨테이너, 함선 슬롯에 장착.
// 특수 창고 확장 파츠(SC01~SC10): 기함에 직접 적용되는 칸 추가 부품.
const CARGO_ITEMS=[
  {id:'CH01',cat:'cargo',nm:'지구 저항군 군용 컨테이너',tier:2,slots:2,size:1,price:4000,faction:'F06',rarity:'common',ic:'📦',
   desc:'지구 저항군이 보급 작전에 사용하던 표준형 군용 컨테이너. 내부에는 인류 최후의 희망이 담겨 있다는 낙서가 남아 있다.'},
  {id:'CH02',cat:'cargo',nm:'메카니카 모듈형 화물칸 Mk.I',tier:4,slots:4,size:1,price:12000,faction:'F03',rarity:'uncommon',ic:'🔩',
   desc:'메카니카 공화국의 표준 규격 모듈형 화물칸. 정밀 기계 조립품을 안전하게 운반하기 위해 진동 흡수 설계가 적용되었다.'},
  {id:'CH03',cat:'cargo',nm:'크리그 전투 보급 박스',tier:5,slots:6,size:1,price:22000,faction:'F04',rarity:'rare',ic:'⚔️',
   desc:'크리그 전투원들이 원정 시 사용하는 군사 보급 박스. 폭발물부터 식량까지 무엇이든 욱여넣을 수 있도록 내부를 설계했다.'},
  {id:'CH04',cat:'cargo',nm:'수퍼비아 중력 압축 창고',tier:6,slots:6,size:1,price:25000,faction:'F01',rarity:'rare',ic:'🌀',
   desc:'수퍼비아 귀족 함대에서 사용하는 고급 중력 압축 화물 시스템. 내부 공간을 중력장으로 재배열해 일반 창고보다 훨씬 효율적이다.'},
  {id:'CH05',cat:'cargo',nm:'치크스 생체 저장 낭',tier:7,slots:8,size:1,price:42000,faction:'F05',rarity:'epic',ic:'🦠',
   desc:'치크스 생체공학 기술로 배양된 유기 저장 낭. 살아 있는 세포막이 화물을 감싸 보호하며 스스로 형태를 변형해 다양한 화물을 수용한다.'},
  {id:'CH06',cat:'cargo',nm:'아우레우스 황금 금고 모듈',tier:8,slots:8,size:1,price:50000,faction:'F02',rarity:'epic',ic:'💰',
   desc:'아우레우스 상인 연합의 황금 금고 모듈. 장거리 무역 상인들이 귀중품과 크레딧을 안전하게 보관하기 위해 사용한다.'},
  {id:'CH07',cat:'cargo',nm:'보이드 차원 포켓',tier:10,slots:10,size:1,price:130000,faction:'F07',rarity:'hero',ic:'🌌',
   desc:'보이드 종족의 불가사의한 차원 접기 기술로 만들어진 포켓 공간. 물리 법칙을 왜곡해 외부 크기와 무관하게 거대한 화물을 수납한다.'},
  {id:'CH08',cat:'cargo',nm:'이휘소 양자 압축 창고',tier:13,slots:12,size:2,price:220000,faction:'F06',rarity:'hero',ic:'⚛️',
   desc:'이휘소 박사가 설계한 양자 중첩 원리 기반의 압축 창고. 양자 상태로 화물을 저장해 이론적으로 무한 용량이 가능하다. 전설적인 희귀품.'},
  {id:'CH09',cat:'cargo',nm:'광개토 함대 통합 화물창 ⚡전설',tier:16,slots:15,size:2,price:900000,faction:'F04',rarity:'legend',ic:'👑',
   desc:'광개토 함대 기함급에 탑재되는 전설급 통합 화물창 시스템. 함대 전체 보급을 단독으로 담당할 수 있는 압도적인 적재 능력을 자랑한다.'},
  {id:'CH10',cat:'cargo',nm:'허블 공간 왜곡 창고 ❖신화',tier:20,slots:20,size:2,price:0,faction:'F06',rarity:'mythic',quest:true,ic:'🔭',
   desc:'허블 망원경 잔해에서 발견된 고대 외계 기술. 공간 자체를 왜곡해 사실상 무한에 가까운 적재 공간을 생성한다. 퀘스트 보상으로만 획득 가능.'},
];

// ── 특수 창고 확장 파츠 (SC01-SC05) — 5종 ──────────────────────────
// 구매 시 인벤토리 적립 → 정비소에서 함선별 「창고 확장 전용 슬롯」(최대 8칸)에 장착.
// 장착 1개 = 전용 슬롯 1칸 점유 + 해당 함선 화물칸 +cargoBonus.
const SPECIAL_CARGO_PARTS=[
  {id:'SC01',cat:'cargo_ext',nm:'[일반] 소형 화물 컨테이너',tier:1,price:2000,cargoBonus:4,ic:'📦',rarity:'common',desc:'[일반] 표준 규격 소형 화물 컨테이너. 장착 함선 화물 +4칸.'},
  {id:'SC02',cat:'cargo_ext',nm:'[고급] 모듈형 확장 창고',tier:5,price:12000,cargoBonus:10,ic:'🗃️',rarity:'rare',desc:'[고급] 진동 흡수 모듈형 확장 창고. 장착 함선 화물 +10칸.'},
  {id:'SC03',cat:'cargo_ext',nm:'[희귀] 중력 압축 화물고',tier:9,price:45000,cargoBonus:20,ic:'🌀',rarity:'epic',desc:'[희귀] 중력장 재배열 압축 화물고. 장착 함선 화물 +20칸.'},
  {id:'SC04',cat:'cargo_ext',nm:'[전설] 초공간 화물 매트릭스 ⚡',tier:14,price:200000,cargoBonus:32,ic:'⚡',rarity:'legend',desc:'[전설] 초공간 연속 접힘 화물 매트릭스. 장착 함선 화물 +32칸. 제작소 제작 가능.'},
  {id:'SC05',cat:'cargo_ext',nm:'[신화] 시공간 압축 무한 창고 ✦',tier:20,price:1200000,cargoBonus:48,ic:'🔭',rarity:'mythic',desc:'[신화] 시공간 왜곡 기반 사실상 무한 적재 창고. 장착 함선 화물 +48칸.'},
];
