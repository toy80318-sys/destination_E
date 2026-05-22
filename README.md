# 🌌 DESTINATION EARTH (데스티네이션 어스)
## 프로젝트 루트 디렉토리 안내

---

**장르**: SF 우주 경제 부동산 타이쿤 & 16v16 전술 교차 턴제 RPG  
**플랫폼**: PWA (웹 브라우저) → 향후 UE5  
**현재 버전**: GDD v5.3 | 2026-05-19

---

## 📂 폴더 구조

```
📁 데스티네이션 어스 웹게임/
│
├── 📁 01_GDD/                         ← 기획 문서
│   ├── DESTINATION_EARTH_GDD_MASTER_v5.3.md  ← ⭐ 메인 기획서 (이걸 보세요)
│   ├── MASTER_CHECKLIST_AND_ROADMAP.md        ← 개발 체크리스트
│   └── DESTINATION_EARTH_GDD_v1.0.md          ← 초기 초안 (참고용)
│
├── 📁 02_Assets/                      ← 게임 에셋
│   ├── 📁 images/
│   │   ├── 📁 characters/             ← 캐릭터 이미지
│   │   │   ├── protagonist/           (사령관 남/여)
│   │   │   ├── baekgu/               (AI 기계 진돗개)
│   │   │   ├── hero/                 (전설 8인 영웅)
│   │   │   ├── npc/                  (150인 동료)
│   │   │   ├── villain/              (치크스 제국 적)
│   │   │   └── dr_hwiso/             (역사적 멘토 캐릭터)
│   │   ├── 📁 environment/
│   │   │   ├── planets/              (30개 행성 이미지)
│   │   │   ├── backgrounds/          (스테이지 배경)
│   │   │   └── maps/                 (스타맵 배경)
│   │   ├── 📁 vehicles/
│   │   │   ├── spaceship/            (33종 함선)
│   │   │   └── engine/               (엔진 파츠)
│   │   ├── 📁 items/
│   │   │   ├── weapons/              (무기 15종)
│   │   │   ├── shields/              (실드 15종)
│   │   │   ├── armor/                (장갑 15종)
│   │   │   └── special/              (유틸리티/특산물)
│   │   └── 📁 ui/
│   │       ├── buttons/              (버튼 세트)
│   │       ├── frames/               (창 프레임)
│   │       ├── icons/                (스킬/아이템 아이콘)
│   │       ├── hud/                  (HUD 요소)
│   │       └── menus/                (메뉴 배경)
│   ├── 📁 audio/
│   │   ├── bgm/                      (BGM 21종+)
│   │   ├── sfx/                      (SFX 40종+)
│   │   └── voice/                    (백구 보이스)
│   └── 📁 fonts/                     (게임 폰트)
│
├── 📁 03_Source/                      ← 소스 코드
│   ├── html/
│   ├── css/
│   ├── js/
│   │   ├── core/                     (GameManager, SaveManager 등)
│   │   ├── scenes/                   (Phaser 씬)
│   │   ├── entities/                 (Player, Ship, NPC 등)
│   │   └── ui/                       (HUD, Dialog, SkillTree 등)
│   └── data/                         (JSON 데이터 파일)
│
├── 📁 04_Prototype/                   ← 프로토타입 빌드
├── 📁 05_Build/                       ← 최종 빌드
├── 📁 06_Docs/                        ← 참고 문서
│   └── references/
└── 📁 07_Tools/                       ← 에셋 제작 가이드
    ├── image_prompts/
    │   └── IMAGE_CREATION_GUIDE.md    ← AI 이미지 제작 프롬프트
    └── audio_prompts/
        └── SUNO_AI_AUDIO_GUIDE.md     ← SUNO AI 음악 제작 가이드
```

---

## 🚀 빠른 시작 가이드

### 1. 기획 문서 확인
→ `01_GDD/DESTINATION_EARTH_GDD_MASTER_v5.3.md`

### 2. 이미지 제작 시작
→ `07_Tools/image_prompts/IMAGE_CREATION_GUIDE.md`  
→ ChatGPT DALL-E / Grok / Gemini / Freepik AI 사용

### 3. 음악 제작 시작
→ `07_Tools/audio_prompts/SUNO_AI_AUDIO_GUIDE.md`  
→ SUNO AI 사용

### 4. 개발 진행 현황 확인
→ `01_GDD/MASTER_CHECKLIST_AND_ROADMAP.md`

---

## 🎮 핵심 게임 정보 요약

| 항목 | 내용 |
|------|------|
| 주인공 | 사령관 (커스터마이징) |
| 동반자 | 백구 (AI 기계 진돗개) |
| 전설 영웅 | 이순신, 장영실, 광개토대왕, 가가린, 넬슨, 아인슈타인, 테슬라, 마르코 폴로 |
| 동료 | 150명 (7대 문명권 × 각 행성 5명) |
| 행성 | 30개 (6중 오각형 격자, Galaxy Seed 1000) |
| 문명권 | 수퍼비아, 아우레우스, 메카니카, 크리그, 치크스 제국, 지구 저항군, 보이드 균열 |
| 함선 | 33종 (S01~S08, M01~M10, H01~H12, LGD01~LGD03) |
| 파츠 | 75종 (무기/실드/엔진/장갑/유틸리티 각 15종) |
| 최종 보스 | 우르사 메이저 (HP 5,000,000, 5페이즈) |
| 기술 스택 | Next.js + Phaser 3 + Zustand + Supabase |
