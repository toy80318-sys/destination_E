// ═══ BOSS CUTSCENES — 공통 컷신 데이터 모듈 ════════════════════════════
//   CUTSCENE_STRUCTURE_STANDARD §6-1: combat/quest-gen 에 흩어진 보스 컷신
//   대사 정의를 한 곳에 모은다. i18n 런타임 치환·{nm} 플레이스홀더 때문에
//   정적 배열이 아니라 "함수 형태"로 노출 — 호출 시점에 표준 scene 배열을 생성.
//   렌더러는 그대로 STORY_SCENES_PC.showCharDialog 를 사용한다.
//   ※ 화자 char/color 는 STORY_SCENES_PC.speakerToChar 헬퍼로 일원화하되,
//     기존 인라인 매핑과 byte-identical 결과를 보장한다 (기능 변화 0).
(function(){
  function _i18n(k,p){ try{ return I18N.t(k,p); }catch(e){ return k; } }
  function _spc(id){
    try{
      if(typeof window!=='undefined'&&window.STORY_SCENES_PC&&typeof window.STORY_SCENES_PC.speakerToChar==='function')
        return window.STORY_SCENES_PC.speakerToChar(id);
    }catch(e){}
    // 폴백 — 헬퍼 미로드 시 기존 인라인 값과 동일
    switch(id){
      case 'baekgu':    return {char:'baekgu1',   color:'#66ddff'};
      case 'commander': return {char:'commander', color:'#00f3ff'};
      case 'ursa':      return {char:'ursa',      color:'#ff3366'};
      case 'void':      return {char:'void_hiden',color:'#cc66ff'};
      case 'system':    return {char:'system',    color:'#66ffcc'};
    }
    return {char:'system', color:'#66ffcc'};
  }

  // ── 우르사 메이저 보스 격파 에필로그 (지구 해방 엔딩) ──────────────
  //   ※ vid 601~609 는 음성 배선 — 절대 보존 (누락 시 음성 깨짐).
  //   victoryLine1/2 는 런타임 {nm} 치환으로 텍스트매칭이 깨지므로 vid 필수.
  //   시스템 3줄(sys1/2/3)은 안내음으로 무음이 정상 — vid 미부여.
  function ursaEpilogue(cmdName){
    var ursaNm = _i18n('speaker.ursaMajor');
    var bkNm   = _i18n('speaker.baekgu');
    var sysNm  = _i18n('actTrans.2.sysSp');
    var raw=[
      {sp:'ursa',     name:ursaNm,  text:_i18n('ursa.outro.1'),                  vid:'601'},
      {sp:'ursa',     name:ursaNm,  text:_i18n('ursa.outro.2'),                  vid:'602'},
      {sp:'ursa',     name:ursaNm,  text:_i18n('ursa.outro.3'),                  vid:'603'},
      {sp:'system',   name:sysNm,   text:_i18n('ursa.outro.sys1')                        },
      {sp:'baekgu',   name:bkNm,    text:_i18n('ui.victoryLine1',{nm:cmdName}),  vid:'604'},
      {sp:'baekgu',   name:bkNm,    text:_i18n('ursa.outro.bk'),                 vid:'605'},
      {sp:'system',   name:sysNm,   text:_i18n('ursa.outro.sys2')                        },
      {sp:'commander',name:cmdName, text:_i18n('ursa.outro.cmd1'),               vid:'607'},
      {sp:'commander',name:cmdName, text:_i18n('ursa.outro.cmd2'),               vid:'608'},
      {sp:'baekgu',   name:bkNm,    text:_i18n('ui.victoryLine2',{nm:cmdName}),  vid:'606'},
      {sp:'commander',name:cmdName, text:_i18n('ursa.outro.cmd3'),               vid:'609'},
      {sp:'system',   name:sysNm,   text:_i18n('ursa.outro.sys3')                        }
    ];
    return raw.map(function(l){
      var m=_spc(l.sp);
      return {char:m.char, name:l.name, color:m.color, text:l.text, vid:l.vid};
    });
  }

  // ── 우르사 메이저 2페이즈 진입 (호위 전멸 → 본체 각성) ──────────────
  function ursaPhase2(){
    var m=_spc('ursa');
    return [{char:m.char, name:_i18n('ursa.bossNameStory'), color:m.color, text:_i18n('ursa.phase2Line')}];
  }

  // ── 블랙팔콘 히든전 2페이즈 (호위 전멸 → 본체 각성) ────────────────
  function blackfalconPhase2(){
    var m=_spc('void');
    return [{char:m.char, name:_i18n('falcon.bossNameStory'), color:m.color, text:_i18n('falcon.afterUrsa')}];
  }

  // ── 보이드(히든) 보스 인트로 — 호러+글리치+영웅 반응+위트 마무리 ───────
  //   기존 quest-gen.showVoidBossIntro 의 인라인 lines/scenes 를 이전.
  //   fx(static/glitch/baekgu) 정적 필드는 보존. 화자는 id 기반 speakerToChar.
  //   ownedHeroes: G.heroes (영입한 영웅 id 배열). 없으면 위트 폴백 1줄.
  function voidIntro(cmdName, ownedHeroes){
    var bkNm = _i18n('speaker.baekgu');
    var sigNm = _i18n('ui.signalReceived');
    var hl = ownedHeroes||[];
    // 영입한 영웅 반응 자동 삽입 (있는 영웅만) — 기존 순서/조건 보존
    var heroOrder=[
      ['H01','voidQ.h01.line'],['H03','voidQ.h03.line'],['H06','voidQ.h06.line'],
      ['H07','voidQ.h07.line'],['H04','voidQ.h04.line'],['H08','voidQ.h08.line']
    ];
    var heroLines=[];
    heroOrder.forEach(function(p){
      if(hl.indexOf(p[0])>=0) heroLines.push({sp:p[0], name:_i18n('hero.'+p[0]+'.nm'), text:_i18n(p[1])});
    });
    if(heroLines.length===0) heroLines.push({sp:'commander', name:cmdName, text:_i18n('voidQ.cmdNoHero')});

    var raw=[
      {sp:'baekgu', name:bkNm,  text:_i18n('ui.blackShipApprox',{nm:cmdName}), fx:'baekgu'},
      {sp:'void',   name:sigNm, text:_i18n('voidQ.staticNoise'),              fx:'static'},
      {sp:'void',   name:'???', text:_i18n('voidQ.unknown1'),                 fx:'glitch'},
      {sp:'void',   name:'???', text:_i18n('voidQ.unknown2'),                 fx:'glitch'},
      {sp:'void',   name:'???', text:_i18n('voidQ.unknown3'),                 fx:'glitch'},
      {sp:'baekgu', name:bkNm,  text:_i18n('ui.voidGovernorReact'),           fx:'baekgu'}
    ].concat(heroLines).concat([
      {sp:'commander', name:cmdName, text:_i18n('voidQ.cmdAccept')},
      {sp:'baekgu',    name:bkNm,    text:_i18n('voidQ.bkHorrorJoke')},
      {sp:'commander', name:cmdName, text:_i18n('voidQ.cmdBkScold')},
      {sp:'baekgu',    name:bkNm,    text:_i18n('ui.allFleetWaiting',{cmdName:cmdName})}
    ]);
    // ※ 기존 출력은 fx 를 scene 에 포함하지 않으므로(원본 .map 이 char/name/color/text 만 반환)
    //   byte-identity 보존을 위해 fx 는 raw 주석용으로만 두고 scene 에는 넣지 않는다.
    return raw.map(function(l){
      var m=_spc(l.sp);
      return {char:m.char, name:l.name, color:m.color, text:l.text};
    });
  }

  // ── 보이드(히든) 보스 아웃트로 — 작별 메시지 ──────────────────────────
  //   기존 quest-gen.showVoidBossOutro 의 인라인 lines/scenes 를 이전.
  function voidOutro(cmdName){
    var bkNm = _i18n('speaker.baekgu');
    var falconNm = _i18n('speaker.blackfalcon');
    var sigNm = _i18n('ui.signalReceived');
    var raw=[
      {sp:'void',      name:sigNm,    text:_i18n('voidQ.staticShort'),            fx:'static'},
      {sp:'void',      name:falconNm, text:_i18n('falconEnd.l1')},
      {sp:'void',      name:falconNm, text:_i18n('falconEnd.l2')},
      {sp:'void',      name:falconNm, text:_i18n('falconEnd.l3')},
      {sp:'void',      name:sigNm,    text:_i18n('voidQ.staticEnd'),              fx:'static'},
      {sp:'baekgu',    name:bkNm,     text:_i18n('ui.victoryLine3',{nm:cmdName})},
      {sp:'commander', name:cmdName,  text:_i18n('falconEnd.cmd')}
    ];
    return raw.map(function(l){
      var m=_spc(l.sp);
      return {char:m.char, name:l.name, color:m.color, text:l.text};
    });
  }

  // ── 지구 해방 엔딩 컷신 (R3 자동롤 렌더러용 대사 데이터) ───────────────
  //   ※ 이 컷신은 ending-credits.js 의 고유 렌더러(R3: 자동 타이머 진행 +
  //     좌초상/우텍스트 + 크레딧 롤)가 소비한다. 렌더러가 {sp,col,tx,ic}
  //     스키마를 직접 쓰므로 표준 {char,name,color,text} 로 변환하지 않는다.
  //     데이터(라인 배열)만 이전 — 필드/값/순서는 원본과 byte-identical.
  //   BG = 백구의 일기 페이지 공통 헤더({sp,col,ic}); Object.assign({tx},BG)
  //     로 tx 우선·BG 키 후속 순서 유지(JSON 동일성 보존).
  //   ownedHeroes: G.heroes (영입한 영웅 id 배열) — 영입 영웅만 heroBlocks 삽입.
  function earthLiberationEnding(cmdName, shipName, flagshipName, ownedHeroes){
    var hl = ownedHeroes||[];
    var BG = {sp:_i18n('baekgu.diaryTitle'), col:'#9ee7ff', ic:'📓'};
    function _bgPage(tx){ return Object.assign({tx:tx}, BG); }
    // 영입한 영웅별 마무리 대사 + 백구의 일기 페어 (영입 영웅만, 기존 순서 보존)
    var heroBlocks=[];
    if(hl.indexOf('H01')>=0){
      heroBlocks.push({sp:_i18n('hero.H01.nm'),col:'#ffd700',ic:'⚔️',tx:_i18n('ending.h01.text')});
      heroBlocks.push(_bgPage(_i18n('ending.h01.diary')));
    }
    if(hl.indexOf('H02')>=0){
      heroBlocks.push({sp:_i18n('hero.H02.nm'),col:'#9ee7ff',ic:'⚙️',tx:_i18n('ending.h02.text')});
      heroBlocks.push(_bgPage(_i18n('ending.h02.diary',{flagshipName:flagshipName})));
    }
    if(hl.indexOf('H03')>=0){
      heroBlocks.push({sp:_i18n('hero.H03.nm'),col:'#ff6644',ic:'⚔️',tx:_i18n('ending.h03.text')});
      heroBlocks.push(_bgPage(_i18n('ending.h03.diary',{cmdName:cmdName})));
    }
    if(hl.indexOf('H04')>=0){
      heroBlocks.push({sp:_i18n('hero.H04.nm'),col:'#66ddff',ic:'🚀',tx:_i18n('ending.h04.text')});
      heroBlocks.push(_bgPage(_i18n('ending.h04.diary')));
    }
    if(hl.indexOf('H05')>=0){
      heroBlocks.push({sp:_i18n('hero.H05.nm'),col:'#aaffaa',ic:'⚓',tx:_i18n('ending.h05.text')});
      heroBlocks.push(_bgPage(_i18n('ending.h05.diary')));
    }
    if(hl.indexOf('H06')>=0){
      heroBlocks.push({sp:_i18n('hero.H06.nm'),col:'#cc99ff',ic:'🧠',tx:_i18n('ending.h06.text',{cmdName:cmdName})});
      heroBlocks.push(_bgPage(_i18n('ending.h06.diary')));
    }
    if(hl.indexOf('H07')>=0){
      heroBlocks.push({sp:_i18n('hero.H07.nm'),col:'#66ffff',ic:'⚡',tx:_i18n('ending.h07.text')});
      heroBlocks.push(_bgPage(_i18n('ending.h07.diary')));
    }
    if(hl.indexOf('H08')>=0){
      heroBlocks.push({sp:_i18n('hero.H08.nm'),col:'#ffcc66',ic:'🧭',tx:_i18n('ending.h08.text')});
      heroBlocks.push(_bgPage(_i18n('ending.h08.diary',{shipName:shipName})));
    }
    // 대사 시퀀스 — 백구의 일기 회상 + 영웅 한마디 + 시퀄 훅 (원본 순서/필드 그대로)
    return [
      {sp:_i18n('actTrans.2.sysSp'),col:'#66ffcc',tx:_i18n('ending.sys1')},
      {sp:_i18n('actTrans.2.sysSp'),col:'#66ffcc',tx:_i18n('ending.sys2')},
      Object.assign({tx:_i18n('ui.diaryWake1',{cmdName:cmdName})},BG),
      Object.assign({tx:_i18n('ui.firstFlightDiary',{shipName:shipName,cmdName:cmdName})},BG),
      ...heroBlocks,
      Object.assign({tx:_i18n('ui.cheeksTruthDiary',{cmdName:cmdName})},BG),
      Object.assign({tx:_i18n('ui.predepartureDiary',{flagshipName:flagshipName,cmdName:cmdName})},BG),
      Object.assign({tx:_i18n('ui.diary6Chain')},BG),
      Object.assign({tx:_i18n('ui.ursaPostLine',{cmdName:cmdName})},BG),
      {sp:cmdName,col:'#ffd700',tx:_i18n('ending.cmdTogether')},
      {sp:cmdName,col:'#ffd700',tx:_i18n('ui.lastWarpHome',{flagshipName:flagshipName})},
      Object.assign({tx:_i18n('ui.diaryLand412')},BG),
      Object.assign({tx:_i18n('ending.bg100Final')},BG),
      {sp:'백구',col:'#9ee7ff',ic:'🐕',tx:_i18n('ui.dontWakeMe',{nm:cmdName})},
      {sp:_i18n('actTrans.2.sysSp'),col:'#66ffcc',tx:_i18n('ending.titleLine')},
      {sp:_i18n('actTrans.2.sysSp'),col:'#66ffcc',tx:_i18n('ending.liberationDone')}
    ];
  }

  var API = {
    ursaEpilogue: ursaEpilogue,
    ursaPhase2: ursaPhase2,
    blackfalconPhase2: blackfalconPhase2,
    voidIntro: voidIntro,
    voidOutro: voidOutro,
    earthLiberationEnding: earthLiberationEnding
  };
  try{ if(typeof window!=='undefined') window.BOSS_CUTSCENES = API; }catch(e){}
})();
