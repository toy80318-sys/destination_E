# DESTINATION EARTH — 스팀 출시 체크리스트 (2026-06-13)

Steamworks 등록부터 출시까지 단계별 가이드. 완료한 항목은 `[x]`로 표시하며 진행하세요.

---

## ✅ 이미 완료 (코드/에셋 측면)

- [x] **자동 업데이트 스팀 대응** — `electron/main.js`가 Steam 빌드 감지 시 electron-updater 자동 비활성화 (스팀은 자체 업데이트 사용)
- [x] **Steam 빌드 마커** — `steam/steam_build.flag` 생성 (depot에 포함하면 자동업데이트 OFF)
- [x] **멀티 OS 빌드 파이프라인** — `release-3os.bat` → GitHub Actions(win/mac/linux)
- [x] **스토어 그래픽 에셋 9종** — `steam/store_assets/` (메인/헤더/작은/세로 캡슐 + 라이브러리 3종 + 로고 + 커뮤니티 아이콘)
- [x] **스토어 텍스트 한/영** — `steam/STORE_TEXT_KO_EN.md`
- [x] **연령 게이트(AgeGate)** — 12세 미만 차단
- [x] **오프라인 동작 + 멀티 슬롯 세이브**
- [x] **개인정보처리방침(Privacy Policy)** — `privacy.html`(한/영, 루트 → Firebase 호스팅 = 스토어 URL) + 인게임 설정 → 법적 고지 → 개인정보처리방침 링크. Firebase(익명/구글 인증·Firestore 세이브) 데이터 수집 고지. **GDPR/스팀 필수.** (2026-06-28 추가)
  - ⚠ **게시 전 `privacy.html`의 `[CONTACT_EMAIL]` 자리표시 2곳(KO/EN)을 실제 운영자 이메일로 교체할 것.**
- [x] **스팀 빌드 치트/콘솔 차단** — Steam 빌드에서 DevTools(F12) 메뉴 제거 + 강제 닫기. 치트 메뉴는 비밀번호 게이트.

---

## 1️⃣ Steamworks 계정·등록 (회사/개인이 직접)

- [ ] Steamworks 파트너 가입 (https://partner.steamgames.com)
- [ ] **Steam Direct 등록비 $100** 결제 (게임당 1회, 매출 $1,000 도달 시 환불)
- [ ] 세금 정보(W-8BEN 등) + 은행 계좌 제출 → **승인까지 영업일 며칠 소요**
- [ ] 앱(App) 생성 → App ID 발급

## 2️⃣ 상점 페이지 구성 (Steamworks 콘솔)

- [ ] 기본 정보: 이름, 짧은 설명, 상세 설명 → `STORE_TEXT_KO_EN.md` 붙여넣기
- [ ] 그래픽 에셋 업로드 → `store_assets/` 의 캡슐들
  - 메인 캡슐 1232×706 / 헤더 920×430 / 작은 462×174 / 세로 748×896
  - 라이브러리: capsule 600×900, header 920×430, hero 1920×620, logo(투명)
- [ ] **스크린샷 5장 이상 (1920×1080, 실제 게임플레이만)** ← ⚠️ 아직 필요. 게임 설정에서 FHD 모드로 촬영
- [ ] **트레일러 영상** (권장, 사실상 필수)
- [ ] 시스템 요구사항 입력 (문서의 최소/권장)
- [ ] 지원 언어 체크: 한국어, 영어
- [ ] 태그·장르 설정
- [ ] 콘텐츠 설문 작성 (문서 §5 가이드대로 — 가챠는 현금거래 없음 명시)
- [ ] **개인정보처리방침 URL 입력** (스토어 → 일반 → "데이터 수집 시 필수") → `https://<호스팅도메인>/privacy.html` (예: destination.cgstation.kr/privacy.html). 데이터 수집(Firebase) 게임은 **필수 — 미입력 시 검토 반려**
- [ ] 가격 설정 (지역별 환율 자동 제안)

> ⚠ **2026 검토 흐름 주의:** ① **스토어 페이지를 먼저 검토 제출 → 승인** → ② "출시 예정(Coming Soon)" 상태로 **최소 2주** 유지 → ③ 그 후 **빌드 검토 제출** → ④ 출시 가능. 스토어/빌드는 별도 검토(각 1~5영업일). 스토어에 표시한 기능·스크린샷·트레일러는 **출시 시점에 실제 제공되는 것만** 허용(미구현 콘텐츠 제거 필요).

## 3️⃣ 빌드 업로드 (depot)

- [ ] `steam/steam_build.flag` 를 빌드 결과 폴더(`dist/win-unpacked/`)에 복사
- [ ] SteamPipe(`steamcmd` 또는 SteamPipeGUI)로 `win-unpacked` 폴더를 Windows depot에 업로드
- [ ] (선택) macOS/Linux depot도 동일하게 — GitHub Actions 산출물 사용
- [ ] 실행 옵션(Launch Option) 설정: `Destination Earth.exe`
- [ ] default 브랜치에 빌드 설정 후 테스트 설치

## 4️⃣ Steamworks 기능 (선택, 권장)

- [ ] **Steam Cloud (Auto-Cloud)**: 세이브 폴더를 클라우드 동기화 경로로 지정
  - Windows: `%USERPROFILE%\AppData\Roaming\Destination Earth\saves`
  - 패턴: `*.json`
- [ ] 도전과제(Achievements) — `steamworks.js` 패키지로 추후 추가 가능 (출시 필수 아님)
- [ ] Steam Deck 호환성 검토 신청

## 5️⃣ 검토 & 출시

- [ ] **"출시 예정(Coming Soon)" 페이지 공개** → Valve 검토(1~5일) → 위시리스트 수집 (최소 2주 권장)
- [ ] 상점 페이지 + 빌드 각각 Valve 검토 통과 확인
- [ ] 출시일 지정 → 출시 버튼

---

## ⚠️ 지금 당장 사람이 해야 하는 것 (우선순위)

1. **Steam Direct 등록 + $100 결제** — 모든 것의 전제
2. **게임플레이 스크린샷 5장 (1920×1080)** — 게임 FHD 모드로 촬영 (제가 촬영 가이드/자동화 도와드릴 수 있음)
3. **트레일러 영상** — 보유 중인 Premiere/After Effects로 제작

## 💡 Claude가 추가로 만들어 드릴 수 있는 것

- 스크린샷 촬영용 in-game 가이드 또는 자동 캡처 스크립트
- 트레일러용 30~60초 장면 구성·자막 스크립트
- 영문 스토어 텍스트 추가 다듬기, 다른 캡슐 디자인 변형
