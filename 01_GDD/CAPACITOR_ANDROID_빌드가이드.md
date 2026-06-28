# DESTINATION EARTH — Capacitor Android 빌드 가이드 (2026-06-28)

> 웹 게임을 **Capacitor**로 감싸 Android(Google Play) 앱으로 빌드. iOS는 §7(Mac 필요).
> 현재 저장소엔 **스캐폴드(설정·스크립트·초기화 코드)** 만 커밋됨. `android/`·`mobile-www/`는 생성물이라 .gitignore(각 빌드 머신에서 생성).

## 0. 현재까지 반영된 것 (커밋됨)
- `@capacitor/core·cli·android` + 플러그인(`app·splash-screen·status-bar·screen-orientation`) → `package.json`.
- `capacitor.config.json` — appId `kr.cgtation.destinationearth`, appName `Destination Earth`, webDir `mobile-www`, 스플래시/상태바 설정.
- `scripts/build-mobile-www.cjs` — 런타임 웹 자산을 `mobile-www/`로 조립(node_modules/.git/dist 제외).
- `js/modules/capacitor-init.js` — 네이티브에서만 **가로 고정·상태바 숨김·스플래시 숨김·안드로이드 뒤로가기**(웹/데스크톱 no-op). index.html에 로드됨.
- npm 스크립트: `mobile:www` / `mobile:add` / `mobile:sync` / `mobile:open`.

## 1. 사전 준비(빌드 머신 — Windows/Mac 모두 가능)
- **JDK 17** (Android Gradle Plugin 요구). `java -version`로 확인.
- **Android Studio** + Android SDK(Platform 34+, Build-Tools). `ANDROID_HOME` 환경변수.
- Node 18+ / npm. (이 PC엔 JDK·SDK 없어 빌드 불가 — Android Studio 머신에서 진행)

## 2. 최초 1회 — Android 프로젝트 생성
```bash
npm install                 # @capacitor/* 포함 설치
npm run mobile:www          # mobile-www/ 조립 (웹 자산 복사)
npx cap add android         # android/ 네이티브 프로젝트 생성 (= npm run mobile:add)
```

## 3. 코드 변경 후 반영 / 실행
```bash
npm run mobile:sync         # mobile-www 재조립 + android 동기화(웹 자산·플러그인)
npm run mobile:open         # Android Studio 로 android/ 열기
# Android Studio: Run ▶(에뮬/실기) 또는 Build > Generate Signed Bundle/APK (AAB)
```

## 4. 에셋 최적화 (자동화 — 구현·검증 완료)
원본: **img/ ≈ 655MB + 02_Assets/audio ≈ 229MB = ~884MB** → 플레이스토어 권장 <150MB.
**자동 최적화 파이프라인 구축**(`mobile-www/`로만 출력, 원본·데스크톱 무영향, 파일명/경로/확장자 유지 → 코드 무변경):

```bash
npm run mobile:www      # = build-mobile-www(런타임+오디오 복사) + optimize-mobile-assets(이미지 압축)
# 또는 이미지만:  npm run mobile:assets
```

- **이미지(`optimize-mobile-assets.cjs`)**: 최대 1024px 캡 + 팔레트 양자화(PNG)/mozjpeg(JPG).
  **검증 결과: 652.5MB → 95.7MB (85%↓, 907개 압축)** ✅. (.png/.jpg 그대로라 코드 참조 무변경)
- **오디오(같은 스크립트, ffmpeg 필요)**: mp3 96kbps 재인코딩. **ffmpeg 설치된 빌드 머신**에서 자동 실행
  (미설치 시 원본 유지·건너뜀). 229MB → 약 절반 예상.
- **추가 절감 옵션**: 언어별 음성 분리(현재 언어만 번들), **Play Asset Delivery**(대용량 on-demand 에셋팩),
  더 강한 이미지 축소(상한 768px) 또는 WebP 전환(참조 일괄 치환 필요).
- 최적화 후 예상 번들: 이미지 ~96MB + 오디오(재인코딩/언어분리) → **<150MB 목표 달성 가능**.

## 5. 가로 고정·아이콘·스플래시
- **가로 고정**: `capacitor-init.js`가 `ScreenOrientation.lock('landscape')` 호출(런타임). 보강하려면 `android/app/src/main/AndroidManifest.xml`의 `<activity android:screenOrientation="landscape">`도 설정.
- **아이콘/스플래시**: `@capacitor/assets`(`npx @capacitor/assets generate`)로 `assets/icon.png`·`assets/splash.png`에서 자동 생성 권장. 또는 Android Studio Image Asset.

## 6. 서명 & 업로드
- Play 업로드용 **업로드 키(keystore)** 생성(`keytool`) → Android Studio에서 AAB 서명. (`.keystore`는 .gitignore — 절대 커밋 금지)
- Google Play Console → 앱 생성 → 내부 테스트 트랙에 AAB 업로드 → 개인정보처리방침 URL(이미 `privacy.html` 보유) 입력 → 콘텐츠 등급 설문 → 출시.

## 7. iOS (후속, Mac 필요)
```bash
npm install @capacitor/ios
npm run mobile:www && npx cap add ios && npx cap sync ios
npx cap open ios        # Xcode → 서명 → Archive → TestFlight
```
- iPad 가로 고정: `Info.plist`에 `Requires Full Screen = YES`.

## 8. 검증 체크리스트(실기)
- [ ] 가로 고정 동작 / 회전 무시
- [ ] 첫 터치 후 음성 재생(웹 오디오 unlock 유지)
- [ ] 세이프에어리어(노치/홈바) 회피(`_safeInsets` 적용됨)
- [ ] 뒤로가기: 컷신/모달 닫기 → 최상위 최소화
- [ ] 세이브(localStorage) 유지 / 클라우드 로그인
- [ ] 번들 용량 < 150MB(§4)
