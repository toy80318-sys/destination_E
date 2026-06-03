// ═══ PARTS DATA ═══════════════════════════════════════════════════
// 함선 파츠 정의 (무기/실드/장갑/엔진/미사일/세트/신화).
// 일반: 상점 판매 / 신화·세트: 퀘스트 보상 전용 (price:0).
// nm/desc는 i18n_dict.js의 'part.<id>.nm/desc' 키로 다국어화.
const PARTS=[
  // 무기 W
  {id:'W01',cat:'weapon',nm:I18N.t('part.W01.nm'),tier:1,wtype:'laser',ATT:15,price:2000,desc:I18N.t('part.W01.desc')},
  {id:'W03',cat:'weapon',nm:I18N.t('part.W03.nm'),tier:3,wtype:'laser',ATT:35,price:8000,desc:I18N.t('part.W03.desc')},
  {id:'W05',cat:'weapon',nm:I18N.t('part.W05.nm'),tier:5,wtype:'laser',ATT:60,price:18000,desc:I18N.t('part.W05.desc')},
  {id:'W08',cat:'weapon',nm:I18N.t('part.W08.nm'),tier:8,wtype:'laser',ATT:100,price:40000,desc:I18N.t('part.W08.desc')},
  {id:'W12',cat:'weapon',nm:I18N.t('part.W12.nm'),tier:12,wtype:'laser',ATT:160,price:90000,desc:I18N.t('part.W12.desc')},
  {id:'W15',cat:'weapon',nm:I18N.t('part.W15.nm'),tier:15,wtype:'laser',ATT:250,price:1000000,desc:I18N.t('part.W15.desc')},
  // 실드 S
  {id:'S01',cat:'shield',nm:I18N.t('part.S01.nm'),tier:1,INT:20,maxSH:200,price:1500,desc:I18N.t('part.S01.desc')},
  {id:'S03',cat:'shield',nm:I18N.t('part.S03.nm'),tier:3,INT:50,maxSH:600,price:7000,desc:I18N.t('part.S03.desc')},
  {id:'S06',cat:'shield',nm:I18N.t('part.S06.nm'),tier:6,INT:90,maxSH:1200,price:22000,desc:I18N.t('part.S06.desc')},
  {id:'S10',cat:'shield',nm:I18N.t('part.S10.nm'),tier:10,INT:140,maxSH:2500,price:60000,desc:I18N.t('part.S10.desc')},
  {id:'S15',cat:'shield',nm:I18N.t('part.S15.nm'),tier:15,INT:220,maxSH:5000,shieldRegen:0.08,price:900000,desc:I18N.t('part.S15.desc')},
  // 장갑 A
  {id:'A01',cat:'armor',nm:I18N.t('part.A01.nm'),tier:1,HP:100,DEF:5,price:1800,desc:I18N.t('part.A01.desc')},
  {id:'A04',cat:'armor',nm:I18N.t('part.A04.nm'),tier:4,HP:400,DEF:15,price:12000,desc:I18N.t('part.A04.desc')},
  {id:'A08',cat:'armor',nm:I18N.t('part.A08.nm'),tier:8,HP:900,DEF:30,price:35000,desc:I18N.t('part.A08.desc')},
  {id:'A12',cat:'armor',nm:I18N.t('part.A12.nm'),tier:12,HP:1800,DEF:50,price:85000,desc:I18N.t('part.A12.desc')},
  {id:'A15',cat:'armor',nm:I18N.t('part.A15.nm'),tier:15,HP:3000,DEF:80,price:800000,desc:I18N.t('part.A15.desc')},
  // 엔진 E
  {id:'E01',cat:'engine',nm:I18N.t('part.E01.nm'),tier:1,TEC:12,price:2500,desc:I18N.t('part.E01.desc')},
  {id:'E04',cat:'engine',nm:I18N.t('part.E04.nm'),tier:4,TEC:35,price:10000,desc:I18N.t('part.E04.desc')},
  {id:'E08',cat:'engine',nm:I18N.t('part.E08.nm'),tier:8,TEC:70,price:30000,desc:I18N.t('part.E08.desc')},
  {id:'E12',cat:'engine',nm:I18N.t('part.E12.nm'),tier:12,TEC:120,price:75000,desc:I18N.t('part.E12.desc')},
  {id:'E15',cat:'engine',nm:I18N.t('part.E15.nm'),tier:15,TEC:200,price:750000,desc:I18N.t('part.E15.desc')},
  // ── 미사일 무기 (10종) ────────────────────────────────────
  {id:'ML01',cat:'weapon',nm:I18N.t('part.ML01.nm'),tier:2,wtype:'missile',ATT:20,price:3000,faction:'F06',desc:I18N.t('part.ML01.desc')},
  {id:'ML02',cat:'weapon',nm:I18N.t('part.ML02.nm'),tier:4,wtype:'missile',ATT:45,price:14000,faction:'F04',desc:I18N.t('part.ML02.desc')},
  {id:'ML03',cat:'weapon',nm:I18N.t('part.ML03.nm'),tier:6,wtype:'missile',ATT:75,price:25000,faction:'F07',desc:I18N.t('part.ML03.desc')},
  {id:'ML04',cat:'weapon',nm:I18N.t('part.ML04.nm'),tier:8,wtype:'missile',ATT:110,price:45000,faction:'F01',desc:I18N.t('part.ML04.desc')},
  {id:'ML05',cat:'weapon',nm:I18N.t('part.ML05.nm'),tier:10,wtype:'missile',ATT:150,price:65000,faction:'F03',desc:I18N.t('part.ML05.desc')},
  {id:'ML06',cat:'weapon',nm:I18N.t('part.ML06.nm'),tier:15,wtype:'missile',ATT:240,price:950000,rarity:'legend',faction:'F02',desc:I18N.t('part.ML06.desc')},
  {id:'ML07',cat:'weapon',nm:I18N.t('part.ML07.nm'),tier:16,wtype:'missile',ATT:220,price:900000,rarity:'legend',faction:'F05',desc:I18N.t('part.ML07.desc')},
  {id:'MMB01',cat:'weapon',nm:I18N.t('part.MMB01.nm'),tier:20,wtype:'missile',ATT:380,price:0,rarity:'mythic',quest:true,faction:'F06',desc:I18N.t('part.MMB01.desc')},
  {id:'SMIS01',cat:'weapon',nm:I18N.t('part.SMIS01.nm'),tier:17,wtype:'missile',ATT:200,price:0,rarity:'set',setId:'goguryeo',quest:true,faction:'F06',desc:I18N.t('part.SMIS01.desc')},
  {id:'SARM01',cat:'armor',nm:I18N.t('part.SARM01.nm'),tier:17,HP:6000,DEF:100,price:0,rarity:'set',setId:'goguryeo',quest:true,faction:'F06',desc:I18N.t('part.SARM01.desc')},

  // ── 신화급 파츠 (퀘스트 보상 전용 — 상점 판매 없음) ──────────────
  {id:'MW01',cat:'weapon',nm:I18N.t('part.MW01.nm'),tier:20,wtype:'laser',ATT:320,price:0,desc:I18N.t('part.MW01.desc'),rarity:'mythic',quest:true},
  {id:'MS01',cat:'shield',nm:I18N.t('part.MS01.nm'),tier:20,INT:280,maxSH:8000,shieldRegen:0.15,price:0,desc:I18N.t('part.MS01.desc'),rarity:'mythic',quest:true},
  {id:'MA01',cat:'armor',nm:I18N.t('part.MA01.nm'),tier:20,HP:12000,DEF:120,price:0,desc:I18N.t('part.MA01.desc'),rarity:'mythic',quest:true},
  {id:'ME01',cat:'engine',nm:I18N.t('part.ME01.nm'),tier:20,TEC:320,price:0,desc:I18N.t('part.ME01.desc'),rarity:'mythic',quest:true},
  // 보이드의 창 — 최강 신화급 미사일. 30초마다 1회 적 함선 1대 즉시 파괴
  {id:'MMV01',cat:'weapon',nm:I18N.t('part.MMV01.nm'),tier:21,wtype:'missile',ATT:500,price:0,rarity:'mythic',quest:true,voidSpear:true,voidSpearCdMs:30000,desc:I18N.t('part.MMV01.desc')},
  // ── 세트 아이템 (퀘스트 보상 전용 — 2종 보유시 세트 보너스) ───────
  {id:'SW01',cat:'weapon',nm:I18N.t('part.SW01.nm'),tier:16,wtype:'laser',ATT:180,price:0,desc:I18N.t('part.SW01.desc'),rarity:'set',setId:'sunsin',quest:true},
  {id:'SA01',cat:'armor',nm:I18N.t('part.SA01.nm'),tier:16,HP:5000,DEF:90,price:0,desc:I18N.t('part.SA01.desc'),rarity:'set',setId:'sunsin',quest:true},
  {id:'SE01',cat:'engine',nm:I18N.t('part.SE01.nm'),tier:16,TEC:180,price:0,desc:I18N.t('part.SE01.desc'),rarity:'set',setId:'tesla',quest:true},
  {id:'SS01',cat:'shield',nm:I18N.t('part.SS01.nm'),tier:16,INT:200,maxSH:4000,shieldRegen:0.10,price:0,desc:I18N.t('part.SS01.desc'),rarity:'set',setId:'tesla',quest:true},
  // ── 자동 수리 로봇 파츠 (5종) — armor 카테고리에 통합 ───────────────
  // repairRate: 매 턴 종료 시 함선 maxHP의 N% 회복
  {id:'RB01',cat:'armor',nm:I18N.t('part.RB01.nm'),tier:4,HP:150,DEF:5,repairRate:0.02,price:9000,desc:I18N.t('part.RB01.desc')},
  {id:'RB02',cat:'armor',nm:I18N.t('part.RB02.nm'),tier:8,HP:500,DEF:12,repairRate:0.04,price:32000,desc:I18N.t('part.RB02.desc')},
  {id:'RB03',cat:'armor',nm:I18N.t('part.RB03.nm'),tier:12,HP:1200,DEF:25,repairRate:0.06,price:95000,rarity:'hero',desc:I18N.t('part.RB03.desc')},
  {id:'RB04',cat:'armor',nm:I18N.t('part.RB04.nm'),tier:15,HP:2800,DEF:45,repairRate:0.10,price:1100000,rarity:'legend',desc:I18N.t('part.RB04.desc')},
  {id:'RB05',cat:'armor',nm:I18N.t('part.RB05.nm'),tier:20,HP:8000,DEF:80,repairRate:0.15,price:0,rarity:'mythic',quest:true,desc:I18N.t('part.RB05.desc')},
  // ── 흡혈형 자동 수리 로봇 (5종) — 레이저 발사 시 HP/실드 흡수 회복 ─────
  // laserHealHP / laserHealSH: 레이저 발사 1회당 입힌 피해의 N% 만큼 자가 함선 HP/실드 회복
  {id:'RB06',cat:'armor',nm:I18N.t('part.RB06.nm'),tier:6,HP:300,DEF:8,repairRate:0.03,laserHealHP:0.05,price:14000,desc:I18N.t('part.RB06.desc')},
  {id:'RB07',cat:'armor',nm:I18N.t('part.RB07.nm'),tier:10,HP:800,DEF:18,repairRate:0.05,laserHealHP:0.08,laserHealSH:0.05,price:48000,desc:I18N.t('part.RB07.desc')},
  {id:'RB08',cat:'armor',nm:I18N.t('part.RB08.nm'),tier:14,HP:1800,DEF:35,repairRate:0.08,laserHealHP:0.10,laserHealSH:0.08,price:140000,rarity:'hero',desc:I18N.t('part.RB08.desc')},
  {id:'RB09',cat:'armor',nm:I18N.t('part.RB09.nm'),tier:17,HP:3800,DEF:60,repairRate:0.12,laserHealHP:0.15,laserHealSH:0.12,price:0,rarity:'legend',quest:true,desc:I18N.t('part.RB09.desc')},
  {id:'RB10',cat:'armor',nm:I18N.t('part.RB10.nm'),tier:21,HP:9500,DEF:100,repairRate:0.18,laserHealHP:0.20,laserHealSH:0.18,price:0,rarity:'mythic',quest:true,desc:I18N.t('part.RB10.desc')}
];
// O(1) 파츠 ID 조회 — PARTS.find() 매 호출 선형 탐색을 대체
const PARTS_BY_ID=Object.fromEntries(PARTS.map(p=>[p.id,p]));
function partById(id){return PARTS_BY_ID[id];}
