// DESTINATION EARTH — i18n 코어 사전 (한국어/영어)
// 추가 키는 각 도메인별로 같은 패턴으로 register() 호출하여 분할 가능.
// 키 명명 규칙:
//   lang.*       — 언어 메뉴 자체
//   settings.*   — 설정 모달 섹션 헤더
//   difficulty.* — 난이도 라벨
//   btn.*        — 공통 버튼 라벨
//   notify.*     — 알림 메시지
//   confirm.*    — 확인 다이얼로그 메시지
//   sidebar.*    — 사이드바 폴더 라벨
//   game.*       — 게임 타이틀·서브타이틀
//   menu.*       — 메인 메뉴 / 시작 화면
//   common.*     — 매우 빈번한 일반 단어 (예/아니오)
I18N.register({
  // 언어 메뉴
  'lang.label':       { ko: '🌐 언어 / Language',   en: '🌐 Language / 언어' },
  'lang.ko':          { ko: '한국어',                en: '한국어 (Korean)' },
  'lang.en':          { ko: 'English',               en: 'English' },
  'lang.changeHint':  { ko: '변경 시 자동 저장 후 페이지가 새로고침됩니다.', en: 'Auto-save and reload on change.' },

  // 설정 모달 헤더
  'settings.title':           { ko: '⚙️ 설정',          en: '⚙️ Settings' },
  'settings.difficulty':      { ko: '⚔️ 난이도',        en: '⚔️ Difficulty' },
  'settings.dataManagement':  { ko: '💾 데이터 관리',   en: '💾 Data Management' },
  'settings.cloudSave':       { ko: '☁️ 클라우드 세이브', en: '☁️ Cloud Save' },
  'settings.audio':           { ko: '🔊 오디오',        en: '🔊 Audio' },
  'settings.display':         { ko: '🖥️ 화면',          en: '🖥️ Display' },

  // 난이도
  'difficulty.easy':    { ko: '😊 쉬움',  en: '😊 Easy' },
  'difficulty.normal':  { ko: '⚔️ 보통',  en: '⚔️ Normal' },
  'difficulty.hard':    { ko: '💀 어려움', en: '💀 Hard' },
  'difficulty.extreme': { ko: '☠️ 극악',  en: '☠️ Extreme' },
  'difficulty.hint':    {
    ko: '쉬움 적 능력 -75% · 보통 기준 · 어려움 +20% · 극악 +50% & 적 수 ×3',
    en: 'Easy: enemies -75% · Normal: baseline · Hard: +20% · Extreme: +50% & 3× enemy count'
  },

  // 데이터 관리 버튼
  'btn.saveNow':        { ko: '💾 지금 저장',           en: '💾 Save Now' },
  'btn.replayTutorial': { ko: '🎓 튜토리얼 다시 보기',  en: '🎓 Replay Tutorial' },
  'btn.openSaveDir':    { ko: '📁 세이브 폴더 열기 (PC)', en: '📁 Open Save Folder (PC)' },
  'btn.deleteAllSaves': { ko: '🗑️ 저장 데이터 삭제',    en: '🗑️ Delete Save Data' },

  // 클라우드 세이브
  'btn.googleSignIn':   { ko: '🔗 Google 연결',  en: '🔗 Connect Google' },
  'btn.cloudPushAll':   { ko: '⬆️ 전체 업로드',  en: '⬆️ Upload All' },
  'btn.cloudPullAll':   { ko: '⬇️ 전체 다운로드', en: '⬇️ Download All' },
  'btn.signOut':        { ko: '🚪 로그아웃',     en: '🚪 Sign Out' },

  // 공통 액션
  'btn.close':    { ko: '닫기',     en: 'Close' },
  'btn.cancel':   { ko: '취소',     en: 'Cancel' },
  'btn.confirm':  { ko: '확인',     en: 'Confirm' },
  'btn.ok':       { ko: '확인',     en: 'OK' },
  'btn.save':     { ko: '저장',     en: 'Save' },
  'btn.load':     { ko: '불러오기', en: 'Load' },
  'btn.delete':   { ko: '삭제',     en: 'Delete' },
  'btn.start':    { ko: '시작',     en: 'Start' },
  'btn.continue': { ko: '이어하기', en: 'Continue' },
  'btn.back':     { ko: '뒤로',     en: 'Back' },
  'btn.next':     { ko: '다음',     en: 'Next' },
  'btn.skip':     { ko: '건너뛰기', en: 'Skip' },

  // 공통 단어
  'common.yes':     { ko: '예',     en: 'Yes' },
  'common.no':      { ko: '아니오', en: 'No' },
  'common.loading': { ko: '로딩 중...', en: 'Loading...' },
  'common.error':   { ko: '오류',   en: 'Error' },
  'common.success': { ko: '성공',   en: 'Success' },

  // 사이드바 폴더 (라벨에 🔒/카운터 자동 추가)
  'sidebar.main':    { ko: '메인',     en: 'Main' },
  'sidebar.dock':    { ko: '함선 도크', en: 'Ship Dock' },
  'sidebar.plaza':   { ko: '행성 광장', en: 'Plaza' },
  'sidebar.front':   { ko: '행성 프론트', en: 'Front' },
  'sidebar.captain': { ko: '함장',     en: 'Captain' },

  // 알림 메시지 (notify)
  'notify.saveComplete':     { ko: '💾 저장 완료',                en: '💾 Save complete' },
  'notify.saveFailed':       { ko: '저장 실패',                   en: 'Save failed' },
  'notify.saveDeleted':      { ko: '저장 데이터 삭제 완료',       en: 'Save data deleted' },
  'notify.allLocalDeleted':  { ko: '🗑️ 로컬 세이브 전체 삭제',    en: '🗑️ All local saves deleted' },
  'notify.langChanged':      { ko: '🌐 언어가 변경되었습니다',     en: '🌐 Language changed' },

  // 확인 다이얼로그
  'confirm.deleteSave':     { ko: '모든 저장 데이터를 삭제합니다. 계속하시겠습니까?', en: 'This will delete all save data. Continue?' },
  'confirm.deleteAllLocal': { ko: '모든 로컬 저장 데이터 삭제?', en: 'Delete all local save data?' },

  // 게임 타이틀
  'game.title':    { ko: 'DESTINATION EARTH',  en: 'DESTINATION EARTH' },
  'game.subtitle': { ko: '빅 픽처 스페이스 RPG', en: 'Big Picture Space RPG' },

  // 부팅 화면
  'boot.preparing': { ko: '우주를 준비하는 중...', en: 'Preparing the universe...' },
  'boot.restored':  { ko: '세이브 복원 완료 ({count}개)', en: 'Restored {count} save(s)' }
});
