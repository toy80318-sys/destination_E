# DESTINATION EARTH — 이미지 가이드

## 폴더 구조

```
img/
├── bg/
│   ├── station_interior.png   ← 허브 메인 우주정거장 내부 배경 (1280×720)
│   ├── garage.png             ← 정비창 배경 (1280×720)
│   └── space.png              ← 기본 우주 배경 (1280×720)
│
├── ships/                     ← 함선 이미지 (투명 PNG, 400×300 권장)
│   ├── S01_main.png           ← 초기 함선 머스탱 (소형)
│   ├── S02.png                ← 배저 스카우트
│   ├── S03.png                ← 코요테
│   ├── S05.png                ← 팔콘 스카우트
│   ├── M03.png                ← 셔먼 전투함 (중형)
│   ├── M05.png                ← 코브라 트레이더
│   ├── M07.png                ← 헌터
│   ├── M10.png                ← 어벤저
│   ├── H01.png                ← 크루세이더 (대형)
│   ├── H04.png                ← 드레드노트
│   └── captured.png           ← 나포 함선 (공통)
│
├── planets/                   ← 행성 이미지 (원형 투명 PNG, 400×400)
│   ├── P01.png ~ P30.png      ← 행성 ID별 이미지
│   ├── hostile.png            ← 적대 행성 (치크스)
│   └── void.png               ← 공허 행성
│
├── crew/                      ← 크루 클래스별 이미지 (투명 PNG, 200×300)
│   ├── Pilot_m.png            ← 남성 파일럿
│   ├── Pilot_f.png            ← 여성 파일럿
│   ├── Eng_m.png              ← 남성 엔지니어
│   ├── Eng_f.png              ← 여성 엔지니어
│   ├── Merch_m.png            ← 남성 상인
│   └── Merch_f.png            ← 여성 상인
│
├── chars/                     ← 특수 캐릭터 (투명 PNG, 200×300)
│   ├── baekgu.png             ← 백구 (AI 기계 진돗개)
│   ├── commander_m.png        ← 남성 사령관 (주인공)
│   ├── commander_f.png        ← 여성 사령관 (주인공)
│   ├── broker.png             ← 화물 브로커 NPC
│   └── admiral.png            ← 함대 제독 NPC
│
├── parts/                     ← 장비 파츠 이미지 (투명 PNG, 200×200)
│   ├── W01.png ~ W15.png      ← 무기 시리즈
│   ├── S01.png ~ S15.png      ← 실드 시리즈
│   ├── A01.png ~ A15.png      ← 장갑 시리즈
│   └── E01.png ~ E12.png      ← 엔진 시리즈
│
├── commodities/               ← 특산물 이미지 (투명 PNG, 150×150)
│   ├── C01.png ~ C12.png      ← 특산물 ID별
│   └── generic.png            ← 기본 화물 아이콘
│
└── ui/                        ← UI 요소
    ├── logo.png               ← 게임 로고
    ├── faction_SF.png         ← 성간 연방 로고
    ├── faction_UN.png         ← 유나이트 로고
    ├── faction_MA.png         ← 마그나 로고
    ├── faction_VX.png         ← 빅스 로고
    └── window_frame.png       ← 우주정거장 창문 프레임 오버레이
```

## 이미지 제작 가이드 (나노바나나 / Kling / Freepik)

### 함선 프롬프트 예시
```
"futuristic spacecraft, small scout ship, side view, transparent background, 
sci-fi style, metallic surface, glowing cyan engine, space game asset, PNG"
```

### 행성 프롬프트 예시
```
"alien planet, circular, space game asset, transparent background, 
detailed surface texture, glowing atmosphere, game icon style, PNG"
```

### 허브 메인 배경 프롬프트
```
"space station interior, looking out through large circular window into space, 
dark metallic walls, futuristic, atmospheric, wide angle, cinematic, 
deep space background visible through window"
```

## 이미지 없을 때 동작
모든 이미지는 로딩 실패시 자동으로 이모지 아이콘으로 대체됩니다.
