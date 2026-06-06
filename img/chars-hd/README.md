# img/chars-hd/ — PC 전용 고해상도 캐릭터 이미지

> 이 폴더는 **Electron PC 빌드에서만 사용**되는 고해상도 원본 이미지 디렉터리입니다.
> 웹 PWA 배포에서는 자동으로 제외됩니다 (firebase.json + service-worker.js).

## 파일명 규칙

스토리 컷씬에서 사용하는 캐릭터 키(`char` 필드)와 동일한 파일명으로 저장합니다.

권장 사양: **1024×1024 이상**, PNG, 투명 배경 또는 단색 배경

## 필수 이미지 목록

대화 팝업에서 등장하는 캐릭터 (없으면 `img/chars/` 의 기존 이미지로 자동 폴백):

| 파일명 | 용도 |
|---|---|
| `hero01.png` | H01 이순신 |
| `hero02.png` | H02 장영실 |
| `hero03.png` | H03 광개토대왕 |
| `hero04.png` | H04 유리 가가린 |
| `hero05.png` | H05 호레이쇼 넬슨 |
| `hero06.png` | H06 A. 아인슈타인 |
| `hero07.png` | H07 니콜라 테슬라 |
| `hero08.png` | H08 마르코 폴로 |
| `baekgu1.png` | 백구 (AI 진돗개) |
| `commander.png` | 사령관 (성별 무관 기본) — 또는 `commander_m1.png`/`commander_f1.png` |

## 폴백 동작

1. `img/chars-hd/{key}.png` 시도
2. 실패 시 자동으로 `img/chars/{key}.png` 로 폴백
3. 그것도 실패 시 `img/chars/system.png` 표시

## 파일을 어떻게 추가하나요?

1. 1024×1024 (또는 그 이상) PNG 파일을 위 표 파일명으로 이 폴더에 저장
2. PC 빌드 재시작 (또는 게임 새로고침)
3. 영웅 영입 컷씬에서 자동으로 고해상도 이미지가 표시됨

## 웹 PWA에는 영향 없음

이 폴더 전체는 `firebase.json` 의 `hosting.ignore` 목록에 포함되어 웹 배포에서 제외됩니다.
또한 `service-worker.js` 가 이 경로를 fetch 가로채기에서 제외하므로 PWA 캐시 부담이 전혀 없습니다.
