# PC 빌드 & 배포 가이드 — v1.0.0-beta.100

## 현재 상태
- ✅ 모든 변경사항 GitHub `main` 푸시 완료 (커밋 `14d5588`)
- ✅ GitHub Pages 웹버전 자동 배포 (수 분 내 반영)
- ⏳ Windows 설치파일(NSIS) 빌드 — 사용자 로컬 PC에서 진행 필요

## Windows 빌드 (사용자 PC에서 실행)

### 사전 준비 (1회)
```bash
# 1. 저장소 최신화
git pull origin main

# 2. 종속성 설치 (이미 있으면 스킵)
npm install
```

### GitHub Releases 자동 발행 (권장)

```bash
# 1. GitHub Personal Access Token 발급
#    https://github.com/settings/tokens → "Generate new token (classic)"
#    필요 권한: repo, workflow

# 2. 환경 변수 설정 (Windows PowerShell)
$env:GH_TOKEN = "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# 3. 빌드 + 자동 업로드
npm run release:win
```

빌드 결과물이 `dist/` 에 생성되고 동시에 GitHub Releases (v1.0.0-beta.100 태그) 에 자동 업로드됩니다.

### 로컬 빌드만 (수동 업로드)

```bash
# 토큰 없이 .exe 만 생성
npm run dist:win

# 출력: dist/Destination Earth Setup 1.0.0-beta.100.exe
# 수동으로 GitHub Releases 페이지에서 업로드
```

## 빌드 옵션별 비교

| 명령 | 출력 | 자동 발행 | 환경 요구사항 |
|---|---|---|---|
| `npm run pack` | dist/win-unpacked/ (개발용) | X | Windows 또는 Wine |
| `npm run dist:win` | NSIS .exe 설치파일 | X | Windows 또는 Wine |
| `npm run release:win` | NSIS + GitHub Releases | ✓ | Windows + GH_TOKEN |

## 트러블슈팅

### "code signing" 경고
- 코드 서명 인증서가 없으면 Windows SmartScreen 경고 발생
- 사용자 측에서 "추가 정보 → 실행" 으로 우회 가능
- 정식 서명을 원하면 Sectigo/DigiCert 등에서 EV 인증서 구매

### Auto-Updater 동작
- `electron-updater` 가 `package.json publish` 설정을 보고 자동 업데이트 확인
- 사용자가 구버전을 실행 중이면 백그라운드에서 신버전 감지 → 알림

### 빌드 실패: "snap" / "appimage" 누락
- Linux 타겟이 활성화돼 있어 sharp/snap 같은 부가 의존성을 찾을 때 발생
- `--win` 플래그가 활성화돼 Linux 빌드는 스킵됨 → 일반적으로 무시 가능

## 이번 v1.0.0-beta.100 변경사항 요약

1. **컷씬·시나리오 퀘스트 재출현 보장** (beta.96~97)
   - `_scenesSeen` 마킹을 onDone 으로 지연
   - showHub 1·2차 retry + currentPlanet 폴백
   - 60초 idle 자동 닫힘 안전망

2. **컷신 비율 30/70 고정 + 1024×1024 영웅 이미지** (beta.97)
   - 모든 컷씬 좌30% / 우70%
   - img/chars/H/ 폴더 우선 사용

3. **타이틀 EXIT/HOF 버튼** (beta.97)
   - title.btnExit i18n 추가
   - showHallOfFame window 노출

4. **설계도 보상 이미지** (beta.99)
   - 함선 설계도 → BP01.png / 파츠 설계도 → BP02.png
   - notifyBlueprint helper + showAcquisitionReport bpImgSrc 적용
   - 거북선 단편 모달, 제작소 목록 카드 분기 적용

5. **영웅 HD 이미지 + 우르사 메이저 보스 이미지 갱신** (beta.98, beta.100)
   - img/chars/H/hero01~08 + ursa + void_hiden 재업로드
   - img/ships/Boss.png 신버전 (2.1MB, 1024×1024)
