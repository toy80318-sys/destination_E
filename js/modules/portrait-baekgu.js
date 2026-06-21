// ══════════════════════════════════════════════════════════════════
// PORTRAIT & BAEKGU — game.js 에서 분할 (2026-06-16, 사용자 요청: 긴 파일 분할)
//   캐릭터 초상 매핑(CHAR_PORTRAITS/HERO_PORTRAITS_BY_ID) · 백구 무드 초상 ·
//   _heroPortrait/charPortraitHTML · baekgu() 대사 · 전술 초상 · 사령관 초상.
//   ※ 일반 스크립트(전역) 유지 — game.js·타 모듈이 미한정 이름으로 호출하므로 IIFE 금지.
//   로드 위치: index.html 에서 i18n 이후·game.js 이전 (CHAR_PORTRAITS가 I18N.t 사용).
//   의존(전역): I18N(로드시), HEROES·G·calcPlayerLevel·window._GAME_VER·_mobileLod(호출시).
// ══════════════════════════════════════════════════════════════════

// ─── 캐릭터 초상 매핑 (대사 인트로/팝업 공통) ──────────────────
// 화자 이름 → 이미지 경로. 새 인물 추가 시 img/chars/<file>.png 넣고 여기에 한 줄 추가.
const CHAR_PORTRAITS={
  // 백구 (AI)
  '백구':'img/chars/baekgu1.png',
  // 시스템 메시지 — 로봇 안내 이미지 (파일을 img/chars/system.png 로 넣으면 자동 적용,
  //   없으면 ⚡ 이모지로 자동 폴백)
  '시스템':'img/chars/system.png',
  // 보스급
  '우르사 메이저':'img/chars/ursa.png',
  '블랙팔콘':'img/chars/void_hiden.png',
  '팔콘 스카우트':'img/chars/void_hiden.png',
  '⚠️ 통신 수신 ⚠️':'img/chars/void_hiden.png',
  '⚠️ Signal Received ⚠️':'img/chars/void_hiden.png',
  [I18N.t('ui.signalReceived')]:'img/chars/void_hiden.png',
  '???':'img/chars/void_hiden.png',
  // 보스 영문 alias (EN 모드에서 화자명이 영문일 때 매칭)
  'Ursa Major':'img/chars/ursa.png',
  'Black Falcon':'img/chars/void_hiden.png',
  'Falcon Scout':'img/chars/void_hiden.png',
  '🌑 Black Falcon':'img/chars/void_hiden.png',
  // 백구/시스템 영문 alias
  'Baekgu':'img/chars/baekgu1.png',
  'System':'img/chars/system.png',
  // 영웅 8인 — hero01~08.png 번호 구조 (HEROES H01~H08 순서와 1:1)
  // 짧은 이름·풀네임 둘 다 키로 등록해 대사 화자 변형 모두 커버
  // H01 이순신 / Yi Sun-sin
  '이순신':'img/chars/hero01.png',
  'Yi Sun-sin':'img/chars/hero01.png',
  // H02 장영실 / Jang Yeong-sil
  '장영실':'img/chars/hero02.png',
  'Jang Yeong-sil':'img/chars/hero02.png',
  // H03 광개토대왕 / Gwanggaeto the Great
  '광개토대왕':'img/chars/hero03.png',
  'Gwanggaeto the Great':'img/chars/hero03.png',
  'Gwanggaeto':'img/chars/hero03.png',
  // H04 유리 가가린 / Yuri Gagarin
  '가가린':'img/chars/hero04.png',
  '유리 가가린':'img/chars/hero04.png',
  'Yuri Gagarin':'img/chars/hero04.png',
  'Gagarin':'img/chars/hero04.png',
  // H05 호레이쇼 넬슨 / Horatio Nelson
  '넬슨':'img/chars/hero05.png',
  '호레이쇼 넬슨':'img/chars/hero05.png',
  'Horatio Nelson':'img/chars/hero05.png',
  'Nelson':'img/chars/hero05.png',
  // H06 아인슈타인 / A. Einstein
  '아인슈타인':'img/chars/hero06.png',
  'A. 아인슈타인':'img/chars/hero06.png',
  'A. Einstein':'img/chars/hero06.png',
  'Einstein':'img/chars/hero06.png',
  'Albert Einstein':'img/chars/hero06.png',
  // H07 니콜라 테슬라 / Nikola Tesla
  '테슬라':'img/chars/hero07.png',
  '니콜라 테슬라':'img/chars/hero07.png',
  'Nikola Tesla':'img/chars/hero07.png',
  'Tesla':'img/chars/hero07.png',
  // H08 마르코 폴로 / Marco Polo
  '마르코':'img/chars/hero08.png',
  '마르코 폴로':'img/chars/hero08.png',
  'Marco Polo':'img/chars/hero08.png',
  'Marco':'img/chars/hero08.png',
  // 추가 시나리오 인물 (2026-06-13 신규 초상) — 파일은 img/chars/ 에 배치
  '이휘소':'img/chars/hero09.png','이휘소 박사':'img/chars/hero09.png','Dr. Lee Hwi-so':'img/chars/hero09.png','Lee Hwi-so':'img/chars/hero09.png',
  '아이젠클로':'img/chars/eisenklau.png','Eisenklau':'img/chars/eisenklau.png','Eisenklaue':'img/chars/eisenklau.png',
  '레인저 맥시모프':'img/chars/maximov.png','맥시모프':'img/chars/maximov.png','Ranger Maximov':'img/chars/maximov.png','Maximov':'img/chars/maximov.png'
};
// ── 영웅 ID(H01~H08) → 초상 경로 ────────────────────────────────────
// CHAR_PORTRAITS는 한국어 이름 키 → EN 모드에선 h.nm가 영문이라 매칭 실패.
// ID 기반 매핑을 우선 조회해 언어와 무관하게 영웅 초상이 표시되도록 한다.
const HERO_PORTRAITS_BY_ID={
  H01:'img/chars/hero01.png',
  H02:'img/chars/hero02.png',
  H03:'img/chars/hero03.png',
  H04:'img/chars/hero04.png',
  H05:'img/chars/hero05.png',
  H06:'img/chars/hero06.png',
  H07:'img/chars/hero07.png',
  H08:'img/chars/hero08.png',
  H09:'img/chars/hero09.png'
};
// ─── 백구 무드 → 이미지 매핑 (시리즈 2 다양한 표정 활용) ───
// 파일명 기반 자동 배정:
//   default     baekgu1.png              (소형 정면 — 평소)
//   explore     baekgu2.png              (탐험/도착 — 시리즈2 기본)
//   combat      baekgu2_fight.png        (전투 자세)
//   boss        baekgu3.png              (보스급 — 무기 휴대)
//   smile       baekgu2_smile1.png       (미소 — 일반 칭찬/보상)
//   smile_big   baekgu2_smile2.png       (큰 미소 — 레벨업/명성 상승)
//   smile_proud baekgu2_smile4.png       (자랑 — 보스 격파/엔딩 진입)
//   surprise    baekgu1_surprise.png     (놀람 — 전설/신화/이벤트 발견)
//   think       baekgu2_think.png        (생각/궁리)
//   advice      baekgu2_advice.png       (조언/팁/제안)
//   anger_mild  baekgu2_anger0.png       (가벼운 짜증)
//   anger       baekgu2_anger1.png       (화남 — 실패/손해)
//   anger_max   baekgu2_anger2.png       (극대노 — 배신/이탈/완패)
//   sad         baekgu2_sad.png          (슬픔 — 패배/소실)
//   sad_happy   baekgu2_sad_happy.png    (희비교차 — 비싼 대가 + 좋은 결과)
//   sleepy      baekgu2_sleepy.png       (졸림 — 같은 자리 오래)
//   hungry      baekgu2_hungry.png       (배고픔 — 자원·크레딧 부족)
//   bothersome  baekgu2_bothersome.png   (귀찮음 — 반복 작업)
//   ignorant    baekgu2_ignorant_person.png (어이없음 — 잘못된 시도)
function _baekguSrcByMood(mood){
  const M={
    combat:'img/chars/baekgu2_fight.png',
    boss:'img/chars/baekgu3.png',
    explore:'img/chars/baekgu2.png',
    smile:'img/chars/baekgu2_smile1.png',
    smile_big:'img/chars/baekgu2_smile2.png',
    smile_proud:'img/chars/baekgu2_smile4.png',
    surprise:'img/chars/baekgu1_surprise.png',
    think:'img/chars/baekgu2_think.png',
    advice:'img/chars/baekgu2_advice.png',
    anger_mild:'img/chars/baekgu2_anger0.png',
    anger:'img/chars/baekgu2_anger1.png',
    anger_max:'img/chars/baekgu2_anger2.png',
    sad:'img/chars/baekgu2_sad.png',
    sad_happy:'img/chars/baekgu2_sad_happy.png',
    sleepy:'img/chars/baekgu2_sleepy.png',
    hungry:'img/chars/baekgu2_hungry.png',
    bothersome:'img/chars/baekgu2_bothersome.png',
    ignorant:'img/chars/baekgu2_ignorant_person.png'
  };
  return M[mood]||'img/chars/baekgu1.png';
}
// 전체 백구 무드 이미지 + 영웅·보스 초상을 페이지 로드 시 프리로드 — 스왑 깜빡임/이전 잔상 방지
(function _preloadCharsAll(){
  if(typeof window==='undefined')return;
  const _arr=[
    // 백구 19종
    'baekgu1.png','baekgu1_surprise.png','baekgu2.png','baekgu2_fight.png',
    'baekgu2_smile1.png','baekgu2_smile2.png','baekgu2_smile4.png','baekgu2_think.png',
    'baekgu2_advice.png','baekgu2_anger0.png','baekgu2_anger1.png','baekgu2_anger2.png',
    'baekgu2_sad.png','baekgu2_sad_happy.png','baekgu2_sleepy.png','baekgu2_hungry.png',
    'baekgu2_bothersome.png','baekgu2_ignorant_person.png','baekgu3.png',
    // 영웅 8인 (hero01~08)
    'hero01.png','hero02.png','hero03.png','hero04.png',
    'hero05.png','hero06.png','hero07.png','hero08.png',
    // 보스급
    'ursa.png','void_hiden.png'
  ];
  // 단계별 프리로드 — 한꺼번에 29개 요청 시 일부 환경에서 ERR_INSUFFICIENT_RESOURCES 유발 가능
  // 5개씩 100ms 간격으로 분산 (총 ~600ms, 사용자 체감 영향 없음)
  const _doPreload=()=>{
    const _batch=5;
    for(let i=0;i<_arr.length;i+=_batch){
      const _slice=_arr.slice(i,i+_batch);
      setTimeout(()=>_slice.forEach(f=>{const img=new Image();img.src='img/chars/'+f;}), Math.floor(i/_batch)*100);
    }
  };
  if(document.readyState==='complete'||document.readyState==='interactive')_doPreload();
  else window.addEventListener('DOMContentLoaded',_doPreload,{once:true});
})();
// 텍스트 키워드로 무드 자동 감지 — 우선순위 위에서 아래 (첫 매칭 채택)
// 명확한 결과(성공/실패/배신)를 active engagement(전투)보다 먼저 보고 매칭
function _detectBaekguMood(text){
  const t=String(text||'');
  // 1) boss — 최종전·엔딩급
  if(/(우르사 메이저|블랙팔콘|보이드 보스|최종전|지구 해방|엔딩)/.test(t))return 'boss';
  // 2) smile_proud — 격파·해방·정복 (전투 종료 후 성공) — combat보다 먼저
  if(/(격파|섬멸|해방|승리했|클리어|정복|평정|🏆|🥇|👑)/.test(t))return 'smile_proud';
  // 3) anger_max — 배신·이탈·완패
  if(/(배신|이탈했|넘어갔|적에게 넘|반란|쿠데타|망했|털렸|뺏겼|완패|치명)/.test(t))return 'anger_max';
  // 4) surprise — 희귀/대박 발견 (smile류보다 먼저 — "전설 들어왔다" 등)
  if(/(전설|신화|희귀|레어|초대박|대박|세상에|믿을 수 없|놀라|이럴 수|와우|헐|!!|✨|🎉|🌟|🎁)/.test(t))return 'surprise';
  // 5) anger — 실패·손해·놓침 (전투 결과로 매칭되도록 combat보다 먼저)
  if(/(실패|패배|손해|손실|놓쳤|놓치|파괴됐|당했|이런|젠장|쯧|❌|🚫)/.test(t))return 'anger';
  // 6) sad_happy — 희비교차 (먼저 매칭)
  if(/(아쉽지만|그래도|간신히|겨우|따돌렸|빠져나왔|살아남았)/.test(t))return 'sad_happy';
  // 7) sad — 슬픔/소실
  if(/(슬프|아쉬|안타|사라졌|소멸했|잃었|작별|이별|😢|💔)/.test(t))return 'sad';
  // 8) combat — 활성 전투 (단어 "전투력"은 제외 위해 \b 또는 negative lookahead)
  if(/(전투(?!력)|해적|적함|기습|공격해|치크스 함|싸우|격돌|⚔️|🏴|💥|☠️|💀)/.test(t))return 'combat';
  // 9) smile_big — 레벨업·명성 상승·제작 완료
  if(/(레벨업|랭크업|명성 상승|명성이 올|진급|승급|제작 완|업그레이드 완|만렙|⭐)/.test(t))return 'smile_big';
  // 10) smile — 일반 보상·획득·완료
  if(/(완료|성공|획득|들어왔|보상|축하|좋아|잘했|굿|나이스|충전됐|👍|💰)/.test(t))return 'smile';
  // 11) hungry — 크레딧·자원 부족
  if(/(크레딧 거의 없|크레딧 부족|돈이 없|자금 부족|연료 부족|보급 부족|배고프)/.test(t))return 'hungry';
  // 12) sleepy — 같은 자리/대기/오래
  if(/(같은 자리|오래 있|체류|대기|머무르|장기|쉬어)/.test(t))return 'sleepy';
  // 13) ignorant — 어이없음 (의도 다름)
  if(/(응\?|뭔가 물어|뭐라고|이해 못|모르겠|\?\?\?|🤷)/.test(t))return 'ignorant';
  // 14) bothersome — 반복/잔소리
  if(/(또|다시|반복|매번|잔소리|아까도|벌써|이미)/.test(t))return 'bothersome';
  // 15) advice — 조언·추천·제안
  if(/(추천|조언|제안|팁|힌트|방법은|이렇게 해|해보면|💡|📋)/.test(t))return 'advice';
  // 16) think — 생각/주의/확인 (전투력/배치 등은 think로)
  if(/(생각|준비|주의|조심|살펴|확인|체크|키워|장착|배치|전투력|🤔)/.test(t))return 'think';
  // 17) explore — 탐험/이동/도착
  if(/(탐험|도착|발견|이동|항해|새로운|진입|착륙|개척|항로|🌍|🛸|🚀|🔭|🌌|🪐)/.test(t))return 'explore';
  return 'default';
}
// 인라인 백구 아이콘 — 이모지 자리에 작은 이미지 노출. 로드 실패 시 🐕 폴백.
function _baekguIcon(size,mood){
  size=size||20;
  let src=_baekguSrcByMood(mood);
  if(src&&typeof window!=='undefined'&&window._GAME_VER&&src.indexOf('?v=')<0)src=src+'?v='+encodeURIComponent(window._GAME_VER);
  return `<img src="${src}" alt="${I18N.t('alt.baekgu')}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;vertical-align:middle;background:rgba(0,0,0,.3)" onerror="this.outerHTML='<span style=&quot;font-size:${Math.round(size*0.9)}px;line-height:1&quot;>🐕</span>'">`;
}
// 화자용 초상 HTML 반환 (이미지가 매핑되어 있으면 <img>, 아니면 폴백 이모지)
// 영웅용 원형 초상화 (도감/축하 모달 등) — CHAR_PORTRAITS에 매핑된 이미지 우선,
// 로드 실패 시 이모지 아이콘으로 폴백. 두 경우 모두 동일한 원형 프레임을 유지.
function _heroPortrait(h, size, borderColor){
  size=size||72;
  borderColor=borderColor||'var(--gold)';
  const _ic=h&&h.ic||'⚑';
  // 1순위: ID 기반 매핑 — 언어 무관. h.id가 비어있으면 HEROES 사전에서 객체 동일성으로 ID 역추적
  // (HEROES[hid]를 직접 받은 경우 id 필드가 없음 — 객체 참조 일치로 ID 복원)
  let _hid=h&&h.id;
  if(!_hid&&h&&typeof HEROES!=='undefined'){
    try{for(const k in HEROES){if(HEROES[k]===h){_hid=k;break;}}}catch(e){}
  }
  // 2순위: 한국어 이름 기반 (CHAR_PORTRAITS). EN 모드에서는 매칭 실패할 수 있어 ID 우선.
  let src=h&&((_hid&&HERO_PORTRAITS_BY_ID[_hid])||CHAR_PORTRAITS[h.nm]);
  // 캐시 버스터: _GAME_VER 변경 시 강제 갱신 (Firebase/CDN 24h 캐시 우회)
  if(src&&typeof window!=='undefined'&&window._GAME_VER)src=src+'?v='+encodeURIComponent(window._GAME_VER);
  const _frame=`width:${size}px;height:${size}px;border-radius:50%;background:rgba(0,0,0,.4);border:2px solid ${borderColor};flex-shrink:0;box-shadow:0 0 12px ${borderColor}66`;
  if(src){
    return `<img src="${src}" alt="${(h&&h.nm)||''}" style="${_frame};object-fit:cover" onerror="this.outerHTML='<div style=\\'${_frame};display:flex;align-items:center;justify-content:center;font-size:${Math.round(size*0.58)}px\\'>${_ic}</div>'">`;
  }
  return `<div style="${_frame};display:flex;align-items:center;justify-content:center;font-size:${Math.round(size*0.58)}px">${_ic}</div>`;
}
function charPortraitHTML(speaker, fallbackEmoji, size, borderColor, hd){
  size=size||54;
  borderColor=borderColor||'var(--cyan)';
  // HEROES 순회 — speaker가 영웅 이름(KO/EN 어느 쪽이든)과 매칭되면 ic + ID 캡처
  let _matchedHeroId=null;
  if(!fallbackEmoji||fallbackEmoji==='⚑'){
    try{
      if(typeof HEROES!=='undefined'){
        for(const hid in HEROES){
          const h=HEROES[hid];
          if(h&&(h.nm===speaker||speaker.includes(h.nm))){
            fallbackEmoji=h.ic||fallbackEmoji;
            _matchedHeroId=hid;
            break;
          }
        }
      }
    }catch(e){}
  } else if(typeof HEROES!=='undefined'){
    // fallbackEmoji가 이미 있어도 매칭된 영웅 ID는 이미지 조회를 위해 캡처
    try{
      for(const hid in HEROES){
        const h=HEROES[hid];
        if(h&&(h.nm===speaker||speaker.includes(h.nm))){_matchedHeroId=hid;break;}
      }
    }catch(e){}
  }
  fallbackEmoji=fallbackEmoji||'⚑';
  // 사령관(주인공) 화자 감지 — 성별·진행단계 자동 분기 이미지 사용 (사용자 명세)
  const _cmdName=(G&&G.profile&&G.profile.name)||I18N.t('ui.commander');
  let src=null;
  if(speaker===_cmdName||speaker===I18N.t('ui.commander')||speaker==='주인공'||speaker==='Hero'||speaker==='Protagonist'||(speaker&&_cmdName&&speaker.includes(_cmdName))){
    try{src=_commanderPortraitSrc();}catch(e){}
  }
  // 1순위: 영웅 ID 기반 매핑 (언어 무관) → EN 모드에서도 영웅 초상 정상 표시
  if(!src&&_matchedHeroId)src=HERO_PORTRAITS_BY_ID[_matchedHeroId];
  if(!src)src=CHAR_PORTRAITS[speaker];
  // 캐시 버스터: _GAME_VER 변경 시 강제 갱신
  if(src&&typeof window!=='undefined'&&window._GAME_VER&&src.indexOf('?v=')<0)src=src+'?v='+encodeURIComponent(window._GAME_VER);
  // 원형 폴백 프레임 — 이미지 로드 실패 시도 동일한 크기·테두리 유지해 레이아웃 흔들림 없음
  const _frame=`width:${size}px;height:${size}px;border-radius:50%;background:rgba(0,0,0,.4);border:2px solid ${borderColor};flex-shrink:0;box-shadow:0 0 12px ${borderColor}66;display:flex;align-items:center;justify-content:center;font-size:${Math.round(size*0.58)}px`;
  if(src){
    // 크레딧 등 대형(396px) 표시용 — HD 폴더(img/chars/H/) 우선 로드, 실패 시 저해상도 → 이모지 순 폴백.
    //   사용자 보고 2026-06-16: 우르사전 이후 크레딧 인물 이미지 해상도가 낮음.
    if(hd && src.indexOf('img/chars/')>=0 && src.indexOf('img/chars/H/')<0){
      let _hdSrc=src.replace('img/chars/','img/chars/H/');
      _hdSrc=_hdSrc.replace('/H/baekgu1.png','/H/baekgu002.png');  // baekgu1 HD 원본 파일명 보정
      return `<img src="${_hdSrc}" data-lo="${src}" alt="${speaker}" style="${_frame};object-fit:cover" onerror="if(this.dataset.lo){this.src=this.dataset.lo;this.dataset.lo='';}else{this.outerHTML='<div style=\\'${_frame}\\'>${fallbackEmoji}</div>';}">`;
    }
    return `<img src="${src}" alt="${speaker}" style="${_frame};object-fit:cover" onerror="this.outerHTML='<div style=\\'${_frame}\\'>${fallbackEmoji}</div>'">`;
  }
  return `<div style="${_frame}">${fallbackEmoji}</div>`;
}
function baekgu(text,mood){
  const msgs=document.getElementById('bk-msgs');
  if(!msgs)return;
  const el=document.createElement('div');
  el.className='bk-msg';
  const now=new Date();
  const ts=now.getHours().toString().padStart(2,'0')+':'+now.getMinutes().toString().padStart(2,'0');
  el.innerHTML=`<span style="color:var(--muted);font-size:11px;margin-right:4px">${ts}</span>${text}`;
  msgs.appendChild(el);
  while(msgs.children.length>10)msgs.removeChild(msgs.firstChild);
  msgs.scrollTop=msgs.scrollHeight;
  // 백구 버블 멘트 음성 (음성연동 §3) — 정적 대사는 텍스트매칭으로 재생, 동적/미녹음은 자막만(무음 폴백).
  try{ if(window.VoicePlayer&&typeof window.VoicePlayer.playLine==='function') window.VoicePlayer.playLine({char:'baekgu1', text:text}); }catch(e){}
  // 무드별 백구 초상화 자동 교체 (텍스트 키워드 자동 감지)
  // ★ 전술 초상 락이 활성화된 동안에는 mood swap 건너뜀 — 화자 얼굴이 그대로 노출되도록
  if(window._tacticPortraitUntil&&Date.now()<window._tacticPortraitUntil)return;
  try{
    const m=mood||_detectBaekguMood(text);
    const img=document.getElementById('bk-portrait-img');
    if(img){
      const newSrc=_baekguSrcByMood(m);
      // 새 src 적용 직전에 이전 onerror로 숨겨졌을 수 있는 img·emoji 상태를 복구
      // (한 번이라도 로드 실패하면 display:none이 박혀서 새 이미지도 안 보이는 버그 방지)
      img.style.display='block';
      const _em=document.getElementById('bk-emoji');if(_em)_em.style.display='none';
      // 현재 src와 다를 때만 교체 (불필요한 깜빡임 방지)
      const _tail=newSrc.replace(/^.*\//,'').split('?')[0];
      const _cur=(img.getAttribute('src')||'').replace(/^.*\//,'').split('?')[0];
      if(_cur!==_tail)img.src=newSrc;
    }
  }catch(e){}
}
// ── 전술 발동 시 백구 초상 자리에 화자(영웅/주인공) 이미지 표시 ──
// 락 동안 baekgu()의 mood swap이 건너뛰어 화자 얼굴이 유지됨. duration 후 자연스럽게 백구로 복귀.
function _showTacticPortrait(src,durationMs){
  durationMs=durationMs||6000;
  const img=document.getElementById('bk-portrait-img');
  if(!img)return;
  // 안전: emoji 숨김 + img 표시 보장
  img.style.display='block';
  const _em=document.getElementById('bk-emoji');if(_em)_em.style.display='none';
  // commander_{m|f}{0..3}.png 8장 모두 존재 — 최후 폴백만 baekgu1
  const _origOnError=img.onerror;
  let _fallbackDone=false;
  img.onerror=function(){
    if(_fallbackDone)return;_fallbackDone=true;
    img.style.display='block';
    const _em2=document.getElementById('bk-emoji');if(_em2)_em2.style.display='none';
    img.src='img/chars/baekgu1.png';
  };
  img.src=src;
  window._tacticPortraitUntil=Date.now()+durationMs;
  // 만료 후 default baekgu로 복귀 + onerror 핸들러 원복
  setTimeout(()=>{
    if(window._tacticPortraitUntil&&Date.now()>=window._tacticPortraitUntil){
      window._tacticPortraitUntil=null;
      const _img2=document.getElementById('bk-portrait-img');
      if(_img2){
        _img2.onerror=_origOnError;  // 원래 핸들러 복원 (index.html의 emoji 폴백)
        _img2.src='img/chars/baekgu1.png';
      }
    }
  },durationMs+50);
}
// 주인공(사령관) 초상화 — 성별 + 진행 단계 0~3 (명성 + 전투력 + 진행도 종합)
//   stage 3 (대제독 ★): ACT4 / 지구해방 / 영웅 8 / 명성 400+
//   stage 2 (제독): ACT3 / 영웅 5+ / 명성 150+ / 전투력 300+
//   stage 1 (함장): ACT2 / 함대 3+ / 영웅 1+ / 명성 30+ / 전투력 100+
//   stage 0 (일반인): 그 외 (게임 시작 직후)
function _commanderStage(){
  if(!G)return 0;
  const _act=G.act||1;
  const _heroes=(G.heroes||[]).length;
  const _fleet=(G.fleet||[]).length;
  const _rep=G.reputation||0;
  const _plv=(typeof calcPlayerLevel==='function')?calcPlayerLevel():1;
  if(_act>=4||G._earthLiberated||_heroes>=8||_rep>=400)return 3;
  if(_act>=3||_heroes>=5||_rep>=150||_plv>=300)return 2;
  if(_act>=2||_fleet>=3||_heroes>=1||_rep>=30||_plv>=100)return 1;
  return 0;
}
function _commanderPortraitSrc(){
  const g=(G&&G.profile&&G.profile.gender)||'male';
  const sfx=g==='female'?'f':'m';
  const st=_commanderStage();
  const _v=(typeof window!=='undefined'&&window._GAME_VER)?('?v='+window._GAME_VER):'';
  const _src='img/chars/commander_'+sfx+st+'.png'+_v;
  return (typeof window!=='undefined'&&window._mobileLod)?window._mobileLod(_src):_src;
}
try{if(typeof window!=='undefined'){window._commanderPortraitSrc=_commanderPortraitSrc;window._commanderStage=_commanderStage;}}catch(e){}
