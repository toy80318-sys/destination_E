// ═══ FACTION DATA ═════════════════════════════════════════════════
// 게임 내 7개 팩션(문명) 정의. ring은 갤럭시 내 거리(0=중심, 6=외곽).
const FACTION={
  F01:{nm:'수퍼비아',col:'#4a90d9',ring:2},F02:{nm:'아우레우스',col:'#d4af37',ring:3},
  F03:{nm:'메카니카',col:'#7ecbce',ring:4},F04:{nm:'크리그',col:'#c0392b',ring:5},
  F05:{nm:'치크스',col:'#8b00ff',ring:1,hostile:true},F06:{nm:'지구저항군',col:'#2ecc71',ring:6},
  F07:{nm:'보이드',col:'#00f3ff',ring:0,void:true}
};

// 팩션별 특산 재료 (행성 상점 보장 판매)
const FACTION_MATS={F01:'R07',F02:'R03',F03:'R05',F04:'R04',F05:'R02',F06:'R06',F07:'R01'};
