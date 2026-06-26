# 기획서 — DESTINATION EARTH 모바일(iOS·Android) 포팅

> 목표: 현재 웹(HTML/CSS/JS) 게임을 **App Store + Google Play** 에 출시. 코드 재작성 없이 동일 코드베이스를 재사용하는 것이 핵심.
> 결론 먼저: **Capacitor 로 래핑**(데스크톱을 Electron으로 싼 것과 같은 원리의 모바일 버전) + **가로(landscape) 고정** + 소형 화면 UI 폴리시.

---
## 0. 권장 방식 — 왜 Capacitor 인가
| 방식 | 코드 재사용 | 스토어 출시 | 난이도 | 평가 |
|---|---|---|---|---|
| **Capacitor (권장)** | 기존 웹 그대로 | iOS·Android 둘 다 | 낮음 | ✅ 최선 — Electron(데스크톱)과 같은 "웹앱 래핑". 네이티브 플러그인(저장·인앱·햅틱·오디오) 풍부 |
| Cordova | 동일 | 가능 | 낮음 | Capacitor의 구형. 신규는 Capacitor 권장 |
| PWA(설치형 웹) | 동일 | ❌ App Store 불가(iOS 정책) | 매우낮음 | 웹 배포엔 좋으나 앱스토어 출시 목적엔 부적합 |
| React Native / Flutter | ❌ 전면 재작성 | 가능 | 매우높음 | 게임이 이미 웹이라 재작성은 낭비 |
| Unity 등 네이티브 이식 | ❌ 전면 재작성 | 가능 | 최고 | 불필요 |
- 이 게임은 이미 **Electron으로 데스크톱을 패키징**하는 순수 웹 게임 → 모바일도 같은 자산을 **Capacitor**로 감싸면 한 코드베이스로 웹·데스크톱(Steam)·모바일을 모두 커버.

## 1. 현재 모바일 대응 현황 (이미 갖춰진 것 — 강점)
- `index.html`: `viewport-fit=cover`(노치/세이프에어리어), `user-scalable=no`, `screen-orientation=landscape`, apple-touch-icon.
- `game.css`: `100dvh`(URL바 제외 실뷰포트), `touch-action:pan-x pan-y`(핀치줌 차단), `overscroll-behavior:none`, `-webkit-tap-highlight-color:transparent`, **`@media (max-width:768px),(pointer:coarse)` 반응형 블록 존재**.
- 터치 드래그(그립) 핸들러, 음성 **첫 터치 자동재생 잠금 해제** 이미 구현.
→ **결론: 처음부터 다시 만들 필요 없음.** 래핑 + 소형화면 폴리시 + 스토어 준비가 핵심 작업.

## 2. 레퍼런스 & UI 패턴 (유사 장르 모바일 관례)
- 유사 장르: 함대/우주 경영 RPG, 내러티브 RPG, 4X-라이트, 가챠 함대물(예: 함대 수집·턴제 전투·맵 순회 구조의 모바일 타이틀군).
- 차용할 모바일 UI 관례:
  - **하단 탭 / 라디얼**: 데스크톱 사이드바(허브 메뉴) → 모바일은 **하단 탭바** 또는 **드로어(햄버거)** 로 전환.
  - **풀스크린 시트**: 모달/팝업은 화면 꽉 채우는 시트 + 큰 닫기(X) 버튼.
  - **큰 터치 타깃**: 버튼 최소 44×44pt(iOS)/48dp(Android). 정보 칩·아이콘 키우기.
  - **별지도(스타맵)**: 핀치 줌·드래그 팬, 행성 노드 탭 영역 확대.
  - **전투**: 학익진·스킬 버튼을 엄지 영역(화면 하단 좌우)에 배치, 가독성 위해 폰트·게이지 확대.
  - **세이프에어리어**: 노치·홈인디케이터 회피(`env(safe-area-inset-*)`).

## 3. 화면 방향 — **가로(landscape) 고정 권장**
- 현 UI는 와이드 HUD/사이드바 기반 → **가로 고정**이 재작업 최소. (이미 `screen-orientation=landscape` 선언됨)
- Capacitor `ScreenOrientation` 플러그인으로 가로 잠금. 스토어 스크린샷·아이콘도 가로 기준.
- (선택) 추후 세로 대응은 별도 과제 — 1차 출시는 가로 고정 권장.

## 4. UI 적응 작업 목록 (Coder)
1. **반응형 강화:** 기존 `@media (max-width:768px),(pointer:coarse)` 블록 확장 — 작은 화면에서 폰트·버튼·칩 스케일업, 2~3열 그리드를 1~2열로, 사이드바→하단탭/드로어.
2. **세이프에어리어:** 루트 컨테이너에 `padding: env(safe-area-inset-*)` 적용(노치·홈바).
3. **터치 타깃:** 모든 `.btn/.ic/.hn-btn` 최소 44pt. hover 전용 효과 제거/탭 대체(터치엔 hover 없음).
4. **모달:** 작은 화면에서 모달을 풀스크린 시트로(현 `.modal` 미디어쿼리). 큰 닫기 버튼.
5. **스타맵:** 핀치 줌/드래그 팬 + 노드 히트영역 확대(현 터치 드래그 기반 확장).
6. **전투 HUD:** 스킬/일시정지/도망 버튼 하단 엄지 영역, 게이지·데미지 텍스트 확대.
7. **롱프레스/툴팁:** 데스크톱 hover 툴팁 → 모바일 길게누르기(long-press) 또는 (i) 버튼.
8. **폰트 로딩:** '맑은 고딕' 의존 → 모바일엔 시스템 한글 폰트 폴백 또는 웹폰트 번들.

## 5. 입력·터치
- click→tap, hover→없음(대체 UI), 우클릭→없음(롱프레스 메뉴로). drag-drop은 터치 드래그로(일부 구현됨).
- 햅틱(선택): Capacitor Haptics — 전투 타격·획득 시 가벼운 진동.

## 6. 성능 · 에셋 · 배터리
- 이미지가 많음(함선 1024² 등) → 모바일용 **해상도/용량 다이어트**(텍스처 크기 조정·webp), 지연 로딩.
- 오디오: 다국어 보이스 클립 다수 → 필요 시 언어별 패키징(앱 용량↓), 또는 온디맨드 다운로드.
- 60fps 목표(전투 VFX는 이미 모바일 고려 주석 있음). 저사양 폴백 옵션(이펙트 감소).
- 배터리: 불필요한 애니메이션 루프 일시정지(백그라운드 시 BGM/루프 정지 — Capacitor App state).

## 7. 저장 · 계정
- 현재 `localStorage` 저장 → 모바일 WebView에서도 동작하나, OS가 정리할 수 있어 **Capacitor Preferences/Filesystem 로 영속 저장** 권장. 마이그레이션(localStorage→Filesystem) 1회.
- 클라우드 세이브(선택): 동일 계정 기기 간 이어하기. (Steam Cloud는 데스크톱 전용)

## 8. 스토어 요건
- **Apple App Store:** 개발자 계정($99/년), Xcode 빌드, App Privacy(데이터 수집 신고), 연령등급, 무료앱이면 IAP 불필요. TestFlight 베타. (외부결제·광고 SDK 쓰면 정책 추가)
- **Google Play:** 개발자 계정($25 1회), **AAB** 빌드, 최신 target SDK 준수, Data Safety 양식, 콘텐츠 등급(IARC). 내부 테스트 트랙.
- 공통: 아이콘(여러 해상도)·스플래시·스토어 스크린샷(가로)·개인정보처리방침 URL.
- 본 게임은 무료(itch 100% 세일 중) → IAP 없으면 심사 단순. 광고 도입 시 정책·SDK 별도.

## 9. 빌드 파이프라인 (Capacitor)
```
npm i @capacitor/core @capacitor/cli
npx cap init "Destination Earth" com.bigpicture.destinationearth --web-dir=.   # 웹 루트 지정
npx cap add ios && npx cap add android
# 웹 자산 갱신 때마다:
npx cap copy
# iOS: npx cap open ios  → Xcode 서명/Archive → TestFlight
# Android: npx cap open android → Android Studio → AAB 서명 → Play 내부테스트
```
- 플러그인 권장: `@capacitor/screen-orientation`(가로 고정), `@capacitor/preferences`/`filesystem`(저장), `@capacitor/haptics`, `@capacitor/app`(상태/백버튼), `@capacitor/status-bar`/`splash-screen`.
- ⚠ web-dir: 빌드 산출 웹 루트를 지정. `build.files` 제외 목록(img_backup 등)과 별개로 모바일 번들 용량 관리.

## 10. 단계별 로드맵
1. **PoC(1~2주):** Capacitor 래핑 → 실기기(iOS/Android)에서 가로 구동·터치·저장·음성 확인.
2. **UI 폴리시(2~4주):** §4 반응형/세이프에어리어/터치타깃/모달/스타맵/전투HUD.
3. **에셋 최적화(1~2주):** 이미지·오디오 다이어트, 저사양 옵션.
4. **스토어 준비(1~2주):** 아이콘·스플래시·스크린샷·개인정보방침, TestFlight/Play 내부테스트.
5. **베타 → 정식:** 피드백 반영 후 심사 제출.

## 11. 리스크 / 주의
- 화면이 작아 정보 밀도 높은 화면(정비소·도감·경매)은 재배치 필요 — 가장 손이 많이 감.
- 오디오 자동재생: 모바일도 첫 터치 후 재생(이미 unlock 구현) — 유지.
- 용량: 이미지·다국어 음성으로 앱이 커질 수 있음 → 압축/온디맨드.
- iOS 심사: WebView 게임도 출시 가능하나, "단순 웹사이트 래핑"으로 보이지 않게 네이티브 느낌(스플래시·아이콘·가로고정·오프라인 동작) 확보.

> 한 줄 결론: **Capacitor로 같은 코드를 모바일에 래핑** + 가로 고정 + 소형화면 UI 폴리시 + 저장/에셋/스토어 준비. 현재 UI가 이미 모바일 친화적이라(반응형·터치·노치 대응) 재작성 없이 추진 가능.
