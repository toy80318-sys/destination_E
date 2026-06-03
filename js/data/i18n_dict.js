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
  'boot.restored':  { ko: '세이브 복원 완료 ({count}개)', en: 'Restored {count} save(s)' },

  // 퀘스트 보상 — 전설급 동료 (quests.js: QUEST_LEGEND_CREW)
  'quest.crew.QL01.nm':   { ko: '가브리엘 드 클리포드',           en: 'Gabriel de Clifford' },
  'quest.crew.QL01.desc': { ko: '우주 마법사. 실드 재생 +30%.',    en: 'Space mage. Shield regen +30%.' },
  'quest.crew.QL02.nm':   { ko: '오세아누스 카터',                 en: 'Oceanus Carter' },
  'quest.crew.QL02.desc': { ko: '전설의 우주 파일럿. 회피율+25%.', en: 'Legendary space pilot. Evasion +25%.' },
  'quest.crew.QL03.nm':   { ko: '세이라 아크',                     en: 'Seira Ark' },
  'quest.crew.QL03.desc': { ko: '은하 저격수. 선제 공격 확률+40%.', en: 'Galactic sniper. First-strike chance +40%.' },
  'quest.crew.QL04.nm':   { ko: '카이사르 볼테',                   en: 'Caesar Volte' },
  'quest.crew.QL04.desc': { ko: '전설 엔지니어. 수리비 -40%.',     en: 'Legendary engineer. Repair cost -40%.' },
  'quest.crew.QL05.nm':   { ko: '오로라 셴',                       en: 'Aurora Shen' },
  'quest.crew.QL05.desc': { ko: '전설 지휘관. 크루 전원 능력치+15%.', en: 'Legendary commander. All crew stats +15%.' },

  // ── 화물 — 컨테이너 (cargo.js: CARGO_ITEMS, CH01~CH10) ───────────
  // 용어 매핑: 컨테이너=Container, 화물칸=Cargo Bay, 창고=Hold
  'cargo.CH01.nm':   { ko: '지구 저항군 군용 컨테이너', en: 'Earth Resistance Military Container' },
  'cargo.CH01.desc': { ko: '지구 저항군이 보급 작전에 사용하던 표준형 군용 컨테이너. 내부에는 인류 최후의 희망이 담겨 있다는 낙서가 남아 있다.',
                      en: 'Standard military container used by the Earth Resistance for supply ops. Graffiti inside reads "Humanity\'s last hope is stored here."' },
  'cargo.CH02.nm':   { ko: '메카니카 모듈형 화물칸 Mk.I', en: 'Mechanica Modular Cargo Bay Mk.I' },
  'cargo.CH02.desc': { ko: '메카니카 공화국의 표준 규격 모듈형 화물칸. 정밀 기계 조립품을 안전하게 운반하기 위해 진동 흡수 설계가 적용되었다.',
                      en: 'Standard-spec modular cargo bay of the Mechanica Republic. Built with vibration absorption to safely transport precision machine assemblies.' },
  'cargo.CH03.nm':   { ko: '크리그 전투 보급 박스', en: 'Krieg Combat Supply Crate' },
  'cargo.CH03.desc': { ko: '크리그 전투원들이 원정 시 사용하는 군사 보급 박스. 폭발물부터 식량까지 무엇이든 욱여넣을 수 있도록 내부를 설계했다.',
                      en: 'Military supply crate used by Krieg combatants on expeditions. Interior designed to cram in anything from explosives to rations.' },
  'cargo.CH04.nm':   { ko: '수퍼비아 중력 압축 창고', en: 'Superbia Gravity-Compression Hold' },
  'cargo.CH04.desc': { ko: '수퍼비아 귀족 함대에서 사용하는 고급 중력 압축 화물 시스템. 내부 공간을 중력장으로 재배열해 일반 창고보다 훨씬 효율적이다.',
                      en: 'Premium gravity-compression cargo system used by Superbia noble fleets. Rearranges interior space with a gravity field — far more efficient than standard holds.' },
  'cargo.CH05.nm':   { ko: '치크스 생체 저장 낭', en: 'Chiks Biotic Storage Sac' },
  'cargo.CH05.desc': { ko: '치크스 생체공학 기술로 배양된 유기 저장 낭. 살아 있는 세포막이 화물을 감싸 보호하며 스스로 형태를 변형해 다양한 화물을 수용한다.',
                      en: 'Organic storage sac cultivated with Chiks bio-engineering. Living cell membranes wrap and protect cargo, reshaping themselves to fit various loads.' },
  'cargo.CH06.nm':   { ko: '아우레우스 황금 금고 모듈', en: 'Aureus Gold Vault Module' },
  'cargo.CH06.desc': { ko: '아우레우스 상인 연합의 황금 금고 모듈. 장거리 무역 상인들이 귀중품과 크레딧을 안전하게 보관하기 위해 사용한다.',
                      en: 'Gold vault module of the Aureus Merchants\' Guild. Used by long-haul traders to securely store valuables and credits.' },
  'cargo.CH07.nm':   { ko: '보이드 차원 포켓', en: 'Void Dimensional Pocket' },
  'cargo.CH07.desc': { ko: '보이드 종족의 불가사의한 차원 접기 기술로 만들어진 포켓 공간. 물리 법칙을 왜곡해 외부 크기와 무관하게 거대한 화물을 수납한다.',
                      en: 'Pocket space crafted by the Void\'s mysterious dimension-folding tech. Bends physical laws to store massive cargo regardless of external size.' },
  'cargo.CH08.nm':   { ko: '이휘소 양자 압축 창고', en: 'Lee Hwi-soh Quantum Compression Hold' },
  'cargo.CH08.desc': { ko: '이휘소 박사가 설계한 양자 중첩 원리 기반의 압축 창고. 양자 상태로 화물을 저장해 이론적으로 무한 용량이 가능하다. 전설적인 희귀품.',
                      en: 'Compression hold designed by Dr. Lee Hwi-soh based on quantum superposition. Stores cargo in a quantum state — theoretically infinite capacity. A legendary rarity.' },
  'cargo.CH09.nm':   { ko: '광개토 함대 통합 화물창 ⚡전설', en: 'Gwanggaeto Fleet Unified Cargo Hold ⚡Legend' },
  'cargo.CH09.desc': { ko: '광개토 함대 기함급에 탑재되는 전설급 통합 화물창 시스템. 함대 전체 보급을 단독으로 담당할 수 있는 압도적인 적재 능력을 자랑한다.',
                      en: 'Legendary unified cargo hold mounted on Gwanggaeto fleet flagships. Boasts overwhelming load capacity — can supply an entire fleet single-handedly.' },
  'cargo.CH10.nm':   { ko: '허블 공간 왜곡 창고 ❖신화', en: 'Hubble Spatial-Distortion Hold ❖Mythic' },
  'cargo.CH10.desc': { ko: '허블 망원경 잔해에서 발견된 고대 외계 기술. 공간 자체를 왜곡해 사실상 무한에 가까운 적재 공간을 생성한다. 퀘스트 보상으로만 획득 가능.',
                      en: 'Ancient alien tech recovered from the Hubble Telescope wreckage. Warps space itself to create virtually infinite storage. Quest reward only.' },

  // ── 화물 — 특수 확장 파츠 (cargo.js: SPECIAL_CARGO_PARTS, SC01~SC05) ─
  'cargo.SC01.nm':   { ko: '[일반] 소형 화물 컨테이너', en: '[Common] Small Cargo Container' },
  'cargo.SC01.desc': { ko: '[일반] 표준 규격 소형 화물 컨테이너. 장착 함선 화물 +4칸.',
                      en: '[Common] Standard-spec small cargo container. Equipped ship: +4 cargo slots.' },
  'cargo.SC02.nm':   { ko: '[고급] 모듈형 확장 창고', en: '[Uncommon] Modular Extension Hold' },
  'cargo.SC02.desc': { ko: '[고급] 진동 흡수 모듈형 확장 창고. 장착 함선 화물 +10칸.',
                      en: '[Uncommon] Vibration-absorbing modular extension hold. Equipped ship: +10 cargo slots.' },
  'cargo.SC03.nm':   { ko: '[희귀] 중력 압축 화물고', en: '[Rare] Gravity-Compression Cargo Hold' },
  'cargo.SC03.desc': { ko: '[희귀] 중력장 재배열 압축 화물고. 장착 함선 화물 +20칸.',
                      en: '[Rare] Gravity-field-rearrangement compression hold. Equipped ship: +20 cargo slots.' },
  'cargo.SC04.nm':   { ko: '[전설] 초공간 화물 매트릭스 ⚡', en: '[Legend] Hyperspace Cargo Matrix ⚡' },
  'cargo.SC04.desc': { ko: '[전설] 초공간 연속 접힘 화물 매트릭스. 장착 함선 화물 +32칸. 제작소 제작 가능.',
                      en: '[Legend] Continuously-folded hyperspace cargo matrix. Equipped ship: +32 cargo slots. Craftable at workshop.' },
  'cargo.SC05.nm':   { ko: '[신화] 시공간 압축 무한 창고 ✦', en: '[Mythic] Spacetime-Compression Infinite Hold ✦' },
  'cargo.SC05.desc': { ko: '[신화] 시공간 왜곡 기반 사실상 무한 적재 창고. 장착 함선 화물 +48칸.',
                      en: '[Mythic] Spacetime-distortion-based virtually infinite hold. Equipped ship: +48 cargo slots.' },

  // ── 제작 레시피 (crafting.js: CRAFT_RECIPES) ──────────────────────
  // 동일 ID라도 cargo/parts/ships의 키와 텍스트가 다르므로 별도 키(craft.<id>.*) 사용.
  // 전설 파츠
  'craft.W15.nm':   { ko: '신의 철퇴 ⚡전설',        en: 'God\'s Mace ⚡Legend' },
  'craft.W15.desc': { ko: '전설 무기. ATT +250. 트루딜.', en: 'Legendary weapon. ATT +250. True damage.' },
  'craft.S15.nm':   { ko: '신의 방패 ⚡전설',        en: 'God\'s Shield ⚡Legend' },
  'craft.S15.desc': { ko: '전설 실드. INT +220. SH +5000.', en: 'Legendary shield. INT +220. SH +5000.' },
  'craft.A15.nm':   { ko: '절대 방벽 ⚡전설',        en: 'Absolute Barrier ⚡Legend' },
  'craft.A15.desc': { ko: '전설 장갑. HP +3000.',    en: 'Legendary armor. HP +3000.' },
  'craft.E15.nm':   { ko: '블링크 엔진 ⚡전설',      en: 'Blink Engine ⚡Legend' },
  'craft.E15.desc': { ko: '전설 엔진. TEC +200. 순간이동.', en: 'Legendary engine. TEC +200. Teleport.' },
  // 신화 파츠
  'craft.MW01.nm':   { ko: '허메틱 포 ✦신화',       en: 'Hermetic Cannon ✦Mythic' },
  'craft.MW01.desc': { ko: '신화 무기. ATT +320. 연속 공격+40%.', en: 'Mythic weapon. ATT +320. Multi-attack +40%.' },
  'craft.MS01.nm':   { ko: '크로노스 방벽 ✦신화',   en: 'Chronos Barrier ✦Mythic' },
  'craft.MS01.desc': { ko: '신화 실드. INT +280. SH +8000. 피격 반사 20%.', en: 'Mythic shield. INT +280. SH +8000. Damage reflect 20%.' },
  'craft.MA01.nm':   { ko: '아다만 선체 ✦신화',     en: 'Adamant Hull ✦Mythic' },
  'craft.MA01.desc': { ko: '신화 장갑. HP +12000. 치명타 피해 50% 감소.', en: 'Mythic armor. HP +12000. Crit damage -50%.' },
  'craft.ME01.nm':   { ko: '타키온 드라이브 ✦신화', en: 'Tachyon Drive ✦Mythic' },
  'craft.ME01.desc': { ko: '신화 엔진. TEC +320. 이동 후 ATT+50(1턴).', en: 'Mythic engine. TEC +320. After move: ATT +50 (1 turn).' },
  'craft.MMB01.nm':   { ko: '이휘소 방정식 미사일 ❖신화', en: 'Lee Hwi-soh Equation Missile ❖Mythic' },
  'craft.MMB01.desc': { ko: '신화 미사일. ATT +380. DEF/SHD 관통 + 크리티컬 +30%. 다각도 다중 충격파.',
                       en: 'Mythic missile. ATT +380. Pierces DEF/SHD + Critical +30%. Multi-angle multi-shockwaves.' },
  // 전설 함선 (대형)
  'craft.H10.nm':   { ko: '레비아탄 🌟',           en: 'Leviathan 🌟' },
  'craft.H10.desc': { ko: '전설 대형 전투함. HP 45,000 / SH 18,000. 화력 최강.',
                     en: 'Legendary large battleship. HP 45,000 / SH 18,000. Top firepower.' },
  'craft.H11.nm':   { ko: '아르마다 🌟',           en: 'Armada 🌟' },
  'craft.H11.desc': { ko: '방어·지원 특화. HP 38,000 / SH 22,000. 함대 전체 실드+20%.',
                     en: 'Defense/support specialist. HP 38,000 / SH 22,000. Fleet-wide shield +20%.' },
  'craft.H12.nm':   { ko: '우르사 파쇄기 🌟',      en: 'Ursa Crusher 🌟' },
  'craft.H12.desc': { ko: '보이드 전용 함선. HP 75,000. 보스전 실드 관통 특화.',
                     en: 'Void-specialized ship. HP 75,000. Boss-fight shield-piercing.' },
  // 전설 창고 (제작소 버전 — cargo.SC04와 cargoBonus 수치가 다름; 원본 충실 번역)
  'craft.SC04.nm':   { ko: '[전설] 초공간 화물 매트릭스 ⚡', en: '[Legend] Hyperspace Cargo Matrix ⚡' },
  'craft.SC04.desc': { ko: '전설급 초공간 연속 접힘 화물 매트릭스. 장착 함선 화물 +16칸.',
                      en: 'Legendary continuously-folded hyperspace cargo matrix. Equipped ship: +16 cargo slots.' },
  // 신화 함선 (대형)
  'craft.LGD01.nm':   { ko: '거북선 ✦신화',         en: 'Geobukseon ✦Mythic' },
  'craft.LGD01.desc': { ko: '신화급 전투함. HP 200,000 / SH 65,000. 호위함 능력치+30%.',
                       en: 'Mythic battleship. HP 200,000 / SH 65,000. Escort stats +30%.' },
  'craft.LGD02.nm':   { ko: '워덴클리프 ✦신화',     en: 'Wardenclyffe ✦Mythic' },
  'craft.LGD02.desc': { ko: '신화급 전투함. HP 175,000 / SH 80,000. 매 턴 적 모듈 비활성화.',
                       en: 'Mythic battleship. HP 175,000 / SH 80,000. Disables one enemy module per turn.' },
  'craft.LGD03.nm':   { ko: '렐러티비티 ✦신화',     en: 'Relativity ✦Mythic' },
  'craft.LGD03.desc': { ko: '신화급 전투함. HP 245,000 / SH 90,000. 최우선 턴 오더.',
                       en: 'Mythic battleship. HP 245,000 / SH 90,000. Highest turn-order priority.' },
  // 흡혈 로봇 파츠
  'craft.RB09.nm':   { ko: '흡혈 폭격 코어 ⚡전설',  en: 'Vampiric Strike Core ⚡Legend' },
  'craft.RB09.desc': { ko: '전설 흡혈 코어. 매 턴 maxHP 12% 회복 + 레이저 발사 시 HP 15%/실드 12% 흡수.',
                      en: 'Legendary vampiric core. Restores 12% maxHP per turn + on laser fire: drains 15% HP / 12% shield.' },
  'craft.RB10.nm':   { ko: '영혼 흡수 매트릭스 ✦신화', en: 'Soul Absorption Matrix ✦Mythic' },
  'craft.RB10.desc': { ko: '신화 흡수 매트릭스. 매 턴 maxHP 18% 회복 + 레이저 발사 시 HP 20%/실드 18% 흡수 + 격침 시 부활.',
                      en: 'Mythic absorption matrix. Restores 18% maxHP per turn + on laser fire: drains 20% HP / 18% shield + revives on destruction.' }
});
