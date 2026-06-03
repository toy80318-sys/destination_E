// ═══ PLANET DATA ══════════════════════════════════════════════════
// 30개 행성 정의 + 행성별 상세 로어(설명, 경고, 베네핏, 백구의 한마디).
// nm/lore는 i18n_dict.js의 'planet.<id>.nm' / 'planet.<id>.loc/civ/feat/warn/benefit/op' 키로 다국어화.
const PLANET_DEF=[
  {id:'P01',f:'F01',nm:I18N.t('planet.P01.nm'),ang:65,ring:2,tax:5000,unlock:true,start:true},
  {id:'P02',f:'F01',nm:I18N.t('planet.P02.nm'),ang:85,ring:2,tax:5000,unlock:true},
  {id:'P03',f:'F01',nm:I18N.t('planet.P03.nm'),ang:105,ring:2,tax:5000,unlock:true},
  {id:'P04',f:'F01',nm:I18N.t('planet.P04.nm'),ang:115,ring:2,tax:5000,unlock:true},
  {id:'P05',f:'F02',nm:I18N.t('planet.P05.nm'),ang:130,ring:3,tax:12000},
  {id:'P06',f:'F02',nm:I18N.t('planet.P06.nm'),ang:145,ring:3,tax:12000,hero:'H02'},
  {id:'P07',f:'F02',nm:I18N.t('planet.P07.nm'),ang:160,ring:3,tax:12000},
  {id:'P08',f:'F02',nm:I18N.t('planet.P08.nm'),ang:170,ring:3,tax:12000},
  {id:'P09',f:'F03',nm:I18N.t('planet.P09.nm'),ang:10,ring:4,tax:12000,hero:'H07'},
  {id:'P10',f:'F03',nm:I18N.t('planet.P10.nm'),ang:25,ring:4,tax:12000},
  {id:'P11',f:'F03',nm:I18N.t('planet.P11.nm'),ang:40,ring:4,tax:12000},
  {id:'P12',f:'F03',nm:I18N.t('planet.P12.nm'),ang:50,ring:4,tax:12000},
  {id:'P13',f:'F04',nm:I18N.t('planet.P13.nm'),ang:185,ring:5,tax:12000,hero:'H05'},
  {id:'P14',f:'F04',nm:I18N.t('planet.P14.nm'),ang:205,ring:5,tax:12000},
  {id:'P15',f:'F04',nm:I18N.t('planet.P15.nm'),ang:220,ring:5,tax:12000},
  {id:'P16',f:'F04',nm:I18N.t('planet.P16.nm'),ang:235,ring:5,tax:12000},
  {id:'P17',f:'F05',nm:I18N.t('planet.P17.nm'),ang:0,ring:1,tax:25000,hostile:true},
  {id:'P18',f:'F05',nm:I18N.t('planet.P18.nm'),ang:72,ring:1,tax:25000,hostile:true},
  {id:'P19',f:'F05',nm:I18N.t('planet.P19.nm'),ang:144,ring:1,tax:25000,hostile:true},
  {id:'P20',f:'F05',nm:I18N.t('planet.P20.nm'),ang:216,ring:1,tax:25000,hostile:true},
  {id:'P21',f:'F05',nm:I18N.t('planet.P21.nm'),ang:288,ring:1,tax:25000,hostile:true},
  {id:'P22',f:'F06',nm:I18N.t('planet.P22.nm'),ang:245,ring:6,tax:5000,hero:'H01'},
  {id:'P23',f:'F06',nm:I18N.t('planet.P23.nm'),ang:260,ring:6,tax:5000,hero:'H03'},
  {id:'P24',f:'F06',nm:I18N.t('planet.P24.nm'),ang:275,ring:6,tax:5000,hero:'H04'},
  {id:'P25',f:'F06',nm:I18N.t('planet.P25.nm'),ang:290,ring:6,tax:5000},
  {id:'P26',f:'F06',nm:I18N.t('planet.P26.nm'),ang:305,ring:6,tax:5000},
  {id:'P27',f:'F07',nm:I18N.t('planet.P27.nm'),ang:315,ring:2,tax:50000,void:true,hero:'H08'},
  {id:'P28',f:'F07',nm:I18N.t('planet.P28.nm'),ang:325,ring:3,tax:50000,void:true},
  {id:'P29',f:'F07',nm:I18N.t('planet.P29.nm'),ang:335,ring:4,tax:50000,void:true},
  {id:'P30',f:'F07',nm:I18N.t('planet.P30.nm'),ang:345,ring:5,tax:50000,void:true,hero:'H06'},
  // ── 지구 (해방 후 안착·재건) ── 우르사 메이저 격파 후 자동 도착. 일반 행성처럼 경매·세금·투자 가능.
  // 이미지/BGM은 임시로 지구 저항군(P22) 자산 사용. 추후 지구 전용 자산 교체 예정.
  {id:'P31',f:'F06',nm:I18N.t('planet.P31.nm'),ang:255,ring:6,tax:8000}
];

// PLANET_LORE — 31 행성 × 6 필드 (loc/civ/feat/warn/benefit/op). i18n_dict.js의 'planet.<id>.<field>' 키 사용.
const PLANET_LORE=(function(){
  const _L={};
  const _ids=['P01','P02','P03','P04','P05','P06','P07','P08','P09','P10','P11','P12','P13','P14','P15','P16','P17','P18','P19','P20','P21','P22','P23','P24','P25','P26','P27','P28','P29','P30','P31'];
  const _fields=['loc','civ','feat','warn','benefit','op'];
  _ids.forEach(function(id){
    _L[id]={};
    _fields.forEach(function(f){ _L[id][f]=I18N.t('planet.'+id+'.'+f); });
  });
  return _L;
})();
