// ═══ FACTION DATA ═════════════════════════════════════════════════
// 게임 내 7개 팩션(문명) 정의. ring은 갤럭시 내 거리(0=중심, 6=외곽).
// nm/로어 텍스트는 i18n_dict.js의 'faction.<id>.*' / 'special.<id>.*' 키로 다국어화.
const FACTION={
  F01:{nm:I18N.t('faction.F01.nm'),col:'#4a90d9',ring:2},F02:{nm:I18N.t('faction.F02.nm'),col:'#d4af37',ring:3},
  F03:{nm:I18N.t('faction.F03.nm'),col:'#7ecbce',ring:4},F04:{nm:I18N.t('faction.F04.nm'),col:'#c0392b',ring:5},
  F05:{nm:I18N.t('faction.F05.nm'),col:'#8b00ff',ring:1,hostile:true},F06:{nm:I18N.t('faction.F06.nm'),col:'#2ecc71',ring:6},
  F07:{nm:I18N.t('faction.F07.nm'),col:'#00f3ff',ring:0,void:true}
};

// 팩션별 특산 재료 (행성 상점 보장 판매)
const FACTION_MATS={F01:'R07',F02:'R03',F03:'R05',F04:'R04',F05:'R02',F06:'R06',F07:'R01'};

// ═══ SPECIAL CHARACTERS — 영웅 외 주요 인물 (백구·보스·히든) ════════════
// 인물 도감(영웅 탭)에 영웅 8인과 함께 표시. 영웅과 동일한 형식 — 이름·발견·능력·장단점·성격·위트
const SPECIAL_CHARS=[
  {
    id:'NPC_BAEKGU', nm:I18N.t('special.baekgu.nm'), ic:'🐕', img:'img/chars/baekgu1.png',
    role:I18N.t('special.baekgu.role'),
    found:I18N.t('special.baekgu.found'),
    stats:I18N.t('special.baekgu.stats'),
    pros:I18N.t('special.baekgu.pros'),
    cons:I18N.t('special.baekgu.cons'),
    personality:I18N.t('special.baekgu.personality'),
    creator:I18N.t('special.baekgu.creator'),
    quip:I18N.t('special.baekgu.quip')
  },
  {
    id:'NPC_URSA', nm:I18N.t('special.ursa.nm'), ic:'💀', img:'img/chars/ursa.png',
    role:I18N.t('special.ursa.role'),
    found:I18N.t('special.ursa.found'),
    stats:I18N.t('special.ursa.stats'),
    pros:I18N.t('special.ursa.pros'),
    cons:I18N.t('special.ursa.cons'),
    personality:I18N.t('special.ursa.personality'),
    creator:I18N.t('special.ursa.creator'),
    quip:I18N.t('special.ursa.quip')
  },
  {
    id:'NPC_BLACKFALCON', nm:I18N.t('special.blackfalcon.nm'), ic:'🌑', img:'img/chars/void_hiden.png',
    role:I18N.t('special.blackfalcon.role'),
    found:I18N.t('special.blackfalcon.found'),
    stats:I18N.t('special.blackfalcon.stats'),
    pros:I18N.t('special.blackfalcon.pros'),
    cons:I18N.t('special.blackfalcon.cons'),
    personality:I18N.t('special.blackfalcon.personality'),
    creator:I18N.t('special.blackfalcon.creator'),
    quip:I18N.t('special.blackfalcon.quip')
  }
];

// ═══ SYSTEM GUIDE — 은하계 시스템 생존 필수지식 ═══════════════════════
// 각 시스템별 위치·역할·담당자·해금조건·특징·주의사항·위트 의견
const SYSTEM_GUIDE=[
  {
    key:'map', icon:'🗺️', name:'은하 지도', img:'img/hub/route.png',
    location:'⭐ 메인서버 → 🗺️ 은하 지도',
    desc:'은하 전체를 3D로 펼쳐 보여주는 항법 콘솔. 30개 행성과 항로(워프 게이트)가 표시된다. 클릭으로 인접 행성 이동, 마우스 드래그로 회전, 휠로 줌.',
    operator:'백구 (전속 AI). 항로 추천과 위험 구간 경고를 담당.',
    unlock:'게임 시작 직후 즉시 사용 가능 — 첫 행성 P01 프록시마 b에서 자동 개방.',
    features:'인접 항로로만 이동(50% 해적 조우). 워프 엔진(블링크/타키온/테슬라) 전 함선 장착 시 어디든 직접 점프. 보이드 행성은 7링부터.',
    warn:'같은 행성에 3턴 이상 체류 시 해적 기습. 적대 행성(치크스) 영역은 착륙 즉시 전투. 보스 격파 전엔 지구(P31)·블랙홀 접근 불가.',
    quip:'백구는 항상 "이쪽으로 가자"고 하는데, "이쪽"이 어디인지는 매번 다르다. 그래도 결국 맞는 길이긴 하다.'
  },
  {
    key:'crew', icon:'👥', name:'크루 명단', img:'img/hub/crew.png',
    location:'⭐ 메인서버 → 👥 크루 명단',
    desc:'영입한 모든 크루·전설 영웅을 한눈에 보고, 함선에 배치하거나 방출하는 인사 콘솔.',
    operator:'본인 사령관. 백구가 정렬·통계 보조.',
    unlock:'게임 시작 직후 즉시 사용 가능.',
    features:'등급/클래스/이름순 정렬. 슬롯당 점유칸(일반 1 · 영웅 2 · 전설 3 · 스토리 4). 영입 영웅에는 본인 얼굴 표시.',
    warn:'명단이 가득 찼을 때 새 크루 영입 시 최하위 교체 모달. "🚪 최하위 N명" 버튼은 함선 탑승 중인 크루도 강제 하선 후 방출 — 되돌리기 가능하지만 확인 후 사용.',
    quip:'잘 키운 크루 한 명이 함선 두 척보다 낫다. 단, 충성도 80 이상일 때만 그렇다. 그 이하는 미친 짓을 한다.'
  },
  {
    key:'clog', icon:'📋', name:'전투 기록', img:'img/hub/clog.png',
    location:'⭐ 메인서버 → 📋 전투 기록',
    desc:'지금까지의 모든 전투 결과(승/패·도망)와 보상 기록을 시간순으로 정리한 항해일지.',
    operator:'백구 자동 기록 — 매 전투 종료 시 자동 추가.',
    unlock:'첫 전투 종료 시점부터 활성. 그전엔 빈 페이지.',
    features:'승/패/도주 표시, 행성·턴·획득 크레딧 표시. 최근 100건 자동 유지.',
    warn:'기록은 자동 정리되므로 100건 초과 시 오래된 항목부터 사라진다. 자랑할 거면 캡처를 빨리.',
    quip:'백구는 패배 기록도 꼼꼼히 적어 놓는다. 가끔 "이 전투는 미리 도망쳤어야 했어"라는 코멘트가 붙어 있다. 그 말이 맞다.'
  },
  {
    key:'quest', icon:'🎖️', name:'행성 제독', img:'img/hub/quest.png',
    location:'🏪 행성 광장 → 🎖️ 행성 제독',
    desc:'각 행성의 의뢰인(제독·중개인)이 발주하는 퀘스트 게시판. 전투/배달/탐색/구매 의뢰가 매 턴 자동 갱신된다.',
    operator:'행성별 NPC 제독. 백구가 추천/필터 보조.',
    unlock:'행성 도착 즉시 활성. 행성마다 다른 의뢰.',
    features:'5% 확률 설계도 드랍 + 명성 50+에서 전설 동료·세트 파츠·전설 미사일 드랍. 명성 120+에서 신화 미사일까지. 퀘스트 누적이 허브 해금 진행도.',
    warn:'명성 50 미만이면 특별 보상 0%. 같은 행성에서 한 종류 설계도는 1번만 드롭. 만료된 퀘스트는 그냥 사라진다.',
    quip:'제독들은 매번 "이건 자네만 할 수 있는 일이야"라고 한다. 옆 카운터에서도 똑같이 말한다. 우리만 할 수 있는 일이 너무 많다.'
  },
  {
    key:'tavern', icon:'🍺', name:'행성 주점', img:'img/hub/tavern.png',
    location:'🏪 행성 광장 → 🍺 행성 주점',
    desc:'크루 가챠(채용)와 전설 영웅 영입 이벤트가 일어나는 사교 거점. 한 잔 사면 친구가 한 명 생긴다.',
    operator:'주점장 + 가챠 시스템 (보이드 크리스탈 VC로 굴림).',
    unlock:'행성 광장 자동 개방. VC 또는 크레딧으로 즉시 채용.',
    features:'₡500/₡2,000 일반 가챠 + VC 1·5장 영웅 집중. 명성 높을수록 전설 확률 증가. 영웅 H01~H08은 가챠에 안 나오고 지정 행성 퀘스트 보상.',
    warn:'주점에서 마신 만큼 다음 날 후회한다. 크레딧 부족 상태로 가챠 돌리면 백구가 잔소리한다.',
    quip:'주점에서 채용한 크루가 가장 충성스럽다. 술자리에서 한 약속이라 그런 듯하다. 술자리 약속은 무서운 거다.'
  },
  {
    key:'trade', icon:'🏬', name:'행성 상점 (무역)', img:'img/hub/trade.png',
    location:'🏪 행성 광장 → 🏬 행성 상점',
    desc:'각 행성의 특산물·제작 재료를 사고파는 무역소. 싸게 사서 다른 행성에서 비싸게 파는 게 핵심 수입원.',
    operator:'행성별 상인. 명성에 따라 재고가 늘어난다.',
    unlock:'행성 광장 자동 개방. 모든 행성에 존재.',
    features:'특산물 가격이 행성마다 다름 — 차익 거래. 제작 재료(R01~R08)는 신화 함선·파츠 제작에 필수. 명성 100+에서 재고가 ×5 늘어남. 마르코 폴로 영입 시 판매가 +10%.',
    warn:'화물칸 가득 차면 못 산다. 재료를 잘못 팔면 신화 함선 못 만든다 — 매각 취소 60초 버튼 활용.',
    quip:'싸게 사서 비싸게 파는 게 무역인데, 어디가 싸고 어디가 비싼지는 매번 다르다. 결국 한 행성을 골라 평생 거기서 사는 게 답일지도.'
  },
  {
    key:'garage', icon:'🔧', name:'함선 정비소', img:'img/hub/garage.png',
    location:'🚢 함선 도크 → 🔧 함선 정비소',
    desc:'보유 함선의 HP/실드 수리, 파츠·크루 배치, 화물칸 확장이 이루어지는 핵심 시설. 함대 운영의 70%가 여기서 결정된다.',
    operator:'정비공 NPC + 본인 사령관. 백구가 추천 배치 안내.',
    unlock:'게임 시작 직후 즉시 사용 가능.',
    features:'파츠 평균 배분 자동 버튼 — 워프엔진→신화/전설 핵심3→세트 묶음→라운드→수리→소형 순. 화물칸 +2칸씩 확장(최대 80칸).',
    warn:'기함(0번 함선)에 신화 파츠 몰빵이 정석. 평균 분배는 함대 균형용. 함선 매각 시 파츠는 자동 회수되지만 60초 매각 취소 가능.',
    quip:'정비소에 들렀다가 한 시간이 지난다. 파츠 배치는 끝이 없다. 가장 마음에 드는 함선에 가장 좋은 파츠를 다 주고 싶다.'
  },
  {
    key:'ship', icon:'🛸', name:'함선 거래소', img:'img/hub/ship.png',
    location:'🚢 함선 도크 → 🛸 함선 거래소',
    desc:'신규 함선을 사고파는 매장. 전투력에 비례해 살 수 있는 함선 등급이 올라간다.',
    operator:'함선 딜러 + 행성별 재고. 명성·전투력에 따라 입고 등급 변동.',
    unlock:'게임 시작 직후 즉시 사용 가능.',
    features:'중형(전투력 200+) · 대형(400+) · 전설/신화(600+) 단계적 해금. 치크스 노획 함선은 치크스 행성 1개 이상 보유 시 입고.',
    warn:'함선 매각가는 정가의 80%. 너무 자주 사고팔면 손해. 16척 한도 초과 시 임시창 자동 보관.',
    quip:'새 함선은 항상 마음에 든다. 한 달 뒤엔 또 다른 새 함선이 마음에 든다. 통장이 비어간다.'
  },
  {
    key:'craft', icon:'⚗️', name:'함선 제작소', img:'img/hub/craft.png',
    location:'🚢 함선 도크 → ⚗️ 함선 제작소',
    desc:'전설·신화 함선과 파츠를 설계도 + 재료로 직접 제작하는 공방. 행성 상점에선 절대 못 사는 최강 장비가 여기서 나온다.',
    operator:'제작 마이스터 NPC. 백구가 재료 부족 항목 표시.',
    unlock:'퀘스트로 설계도(BLUEPRINT) 획득 시 활성. 설계도 5% (LGD03는 20%) 드롭.',
    features:'설계도별 행성 매핑(BLUEPRINT_MAP) — 행성마다 다른 설계도 드롭. 신화 함선(LGD01·LGD02·LGD03)은 끝판왕 함선.',
    warn:'재료 부족하면 못 만든다 — 재료 매각 신중. 제작 중에는 다른 행성 이동해도 시간이 소비된다.',
    quip:'설계도 한 장을 얻으면 그 다음엔 재료 30개가 필요하다. 재료를 다 모으면 또 다른 설계도가 갖고 싶어진다. 끝이 없다.'
  },
  {
    key:'gather', icon:'🔭', name:'잔해 탐색', img:'img/hub/route.png',
    location:'🚢 함선 도크 → 🔭 잔해 탐색 (사이드 버튼, 항상 노출)',
    desc:'행성 주변 우주 잔해 구역을 정찰해 아이템·잔해 해적·치크스 정찰대를 만나는 모험 기능.',
    operator:'본인 사령관 직접 발진. 백구가 결과 분석.',
    unlock:'게임 시작 직후 즉시 사용 가능. 모든 행성에서.',
    features:'30% 잔해 해적 / 10% 아이템·함선 / 60% 안전한 발견 (퀘스트 진행). 10초 쿨다운, 전설 크루·영웅 1명당 -1초(최소 5초). 전투 중 클릭 시 잔해 해적이 합류 (최대 2회).',
    warn:'잔해 해적은 링이 높을수록 강함. 도주 시 탐색 중단. 같은 행성에서 너무 자주 누르면 해적이 패턴을 학습한다 (는 농담이지만 진짜 같다).',
    quip:'잔해 탐색을 누르면 30% 확률로 후회한다. 10% 확률로 좋아한다. 60% 확률로 그냥 시간이 흐른다. 인생과 비슷하다.'
  },
  {
    key:'auction', icon:'🔨', name:'행성 경매', img:'img/hub/auction.png',
    location:'🌍 행성 프론트 → 🔨 행성경매',
    desc:'우주 부동산 시장. 행성 자체를 사들여 매 턴 세금 수입을 얻는다. 광개토대왕 영입 시 30% 할인.',
    operator:'경매장 진행자. 명성에 따라 입찰 한도 증가.',
    unlock:'명성 10 이상 + 행성 광장 1회 이상 방문 시 활성.',
    features:'명성 10당 최대 보유 +1개. 행성 보유 시 매 턴 세금. 보이드 행성(P27~P30) 100% 투자 = 블랙홀 진입 조건.',
    warn:'세율 높은 행성(특히 보이드)은 유지비도 비쌈. 즉시 입찰가는 정상가의 1.3배 — 신중히. 명성 부족하면 입찰 차단.',
    quip:'행성 한 개 가지면 영주가 된 기분. 두 개 가지면 황제가 된 기분. 세 개 가지면 세금 명세서가 무서운 기분.'
  },
  {
    key:'planets', icon:'🌐', name:'행성 현황', img:'img/hub/front.png',
    location:'🌍 행성 프론트 → 🌐 행성현황',
    desc:'보유 행성의 투자 레벨·수입·전쟁 상태·해금 진행도를 한눈에 보는 대시보드.',
    operator:'백구 데이터 콘솔 — 자동 집계.',
    unlock:'첫 행성 보유 즉시 활성. 그전에도 미보유 행성 정보 조회 가능.',
    features:'행성별 투자(상업 Lv1~10), 허브 해금 진행도, 적대 상태, 팩션 정보 표시. 보이드 행성은 별도 섹션.',
    warn:'적대 행성(치크스)은 격파 전엔 정보 제한. 보이드 행성 투자는 비싸지만 마지막 시험 진입 필수.',
    quip:'행성 목록을 보다 보면 내가 우주를 지배하는 느낌이 든다. 통장 잔고를 보면 다시 현실로 돌아온다.'
  }
];

// ═══ FACTION LORE — 문명 도감 ════════════════════════════════════════
// 각 팩션의 대표 행성, 시작 행성, 환경, 특징, 주의사항, 외계인 생김새, 위트 의견
const FACTION_LORE={
  F01:{icon:'👑',rep:'P01',start:I18N.t('faction.F01.start'),env:I18N.t('faction.F01.env'),traits:I18N.t('faction.F01.traits'),warn:I18N.t('faction.F01.warn'),look:I18N.t('faction.F01.look'),quip:I18N.t('faction.F01.quip')},
  F02:{icon:'💰',rep:'P06',start:I18N.t('faction.F02.start'),env:I18N.t('faction.F02.env'),traits:I18N.t('faction.F02.traits'),warn:I18N.t('faction.F02.warn'),look:I18N.t('faction.F02.look'),quip:I18N.t('faction.F02.quip')},
  F03:{icon:'⚙️',rep:'P09',start:I18N.t('faction.F03.start'),env:I18N.t('faction.F03.env'),traits:I18N.t('faction.F03.traits'),warn:I18N.t('faction.F03.warn'),look:I18N.t('faction.F03.look'),quip:I18N.t('faction.F03.quip')},
  F04:{icon:'⚔️',rep:'P13',start:I18N.t('faction.F04.start'),env:I18N.t('faction.F04.env'),traits:I18N.t('faction.F04.traits'),warn:I18N.t('faction.F04.warn'),look:I18N.t('faction.F04.look'),quip:I18N.t('faction.F04.quip')},
  F05:{icon:'💀',rep:'P17',start:I18N.t('faction.F05.start'),env:I18N.t('faction.F05.env'),traits:I18N.t('faction.F05.traits'),warn:I18N.t('faction.F05.warn'),look:I18N.t('faction.F05.look'),quip:I18N.t('faction.F05.quip')},
  F06:{icon:'🌍',rep:'P22',start:I18N.t('faction.F06.start'),env:I18N.t('faction.F06.env'),traits:I18N.t('faction.F06.traits'),warn:I18N.t('faction.F06.warn'),look:I18N.t('faction.F06.look'),quip:I18N.t('faction.F06.quip')},
  F07:{icon:'🌀',rep:'P30',start:I18N.t('faction.F07.start'),env:I18N.t('faction.F07.env'),traits:I18N.t('faction.F07.traits'),warn:I18N.t('faction.F07.warn'),look:I18N.t('faction.F07.look'),quip:I18N.t('faction.F07.quip')}
};
