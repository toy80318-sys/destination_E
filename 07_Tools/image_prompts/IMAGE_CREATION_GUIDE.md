# 🎨 DESTINATION EARTH — 이미지 제작 가이드
## AI 툴 활용 완전 프롬프트 가이드 (v5.3 기준)

---

> **제작 도구 분류**
> - **ChatGPT DALL-E 4**: 캐릭터 초상화, 감성적 장면
> - **Grok (xAI)**: SF 우주 함선, 전투 장면, 빌런
> - **Gemini (Google)**: 행성/배경, 우주 환경
> - **Freepik AI**: UI 버튼, 아이콘, 프레임, NPC 다수 제작
> - **공통 사양**: PNG (투명 배경), 캐릭터 2048×2048, 배경 1920×1080, UI 512×512

---

## 목차

1. [공통 스타일 가이드](#1-공통-스타일-가이드)
2. [주요 캐릭터 — 사령관 & 백구](#2-주요-캐릭터)
3. [전설 8인 영웅 (Genesis Protocol)](#3-전설-8인-영웅)
4. [150인 동료 NPC 배치 분류](#4-150인-동료-npc)
5. [7대 문명권 행성 배경](#5-7대-문명권-행성-배경)
6. [함선 (33종 + 우르사 메이저)](#6-함선-이미지)
7. [컴포넌트 파츠 아이콘 (75종)](#7-컴포넌트-파츠-아이콘)
8. [UI/UX 이미지 목록](#8-uiux-이미지)
9. [특산물 아이템 아이콘 (21종)](#9-특산물-아이템-아이콘)
10. [제작 우선순위](#10-제작-우선순위)

---

## 1. 공통 스타일 가이드

### 1.1 아트 스타일 정의

```
장르: SF 스페이스 오페라 + 한국 감성 융합
색조: 딥 스페이스 블루(#0d1117), 네온 옐로우(#deff9a), 플라즈마 시안(#00f3ff)
배경: 항상 투명(transparent) 또는 deep space 그라디언트
렌더링 퀄리티: 세미-리얼리스틱 + 약간의 애니메이션 스타일 (한국 SF 웹툰 감성)
조명: 차가운 우주 광원, 행성별 환경광 반영
```

### 1.2 캐릭터 공통 포즈 세트 (각 캐릭터 필수)

| 포즈 번호 | 포즈 이름 | 용도 |
|---------|---------|------|
| POSE_01 | 정면 서 있는 자세 (Idle) | 도감, 팀 선택 |
| POSE_02 | 전투 준비 자세 (Combat Ready) | 전투 화면 |
| POSE_03 | 상반신 초상화 (Portrait) | 대화창, 주점 |
| POSE_04 | 승리 포즈 (Victory) | 전투 승리 |
| POSE_05 | 부상/패배 포즈 (Defeated) | 피격 연출 |

---

## 2. 주요 캐릭터

### 2.1 사령관 (Commander) — 남성 버전

**파일명**: `protagonist_male_idle.png`, `protagonist_male_combat.png` 등  
**사용 도구**: ChatGPT DALL-E / Freepik AI  
**수량**: 포즈 5장 × 2 (남/여) = 10장

```
[DALL-E 프롬프트 — 남성 사령관]
A Korean male space commander in his mid-20s, wearing a sleek dark navy blue tactical combat suit with glowing cyan circuit patterns and a "Big Picture Space" emblem on the chest. Short black hair, determined eyes, futuristic holographic wrist display. Confident standing pose. 
Style: semi-realistic Korean sci-fi webtoon art style. 
Background: transparent. 
Full body, high detail, 2048x2048px.
```

```
[DALL-E 프롬프트 — 여성 사령관]
A Korean female space commander in her mid-20s, wearing a sleek dark navy blue tactical combat suit with glowing cyan circuit patterns and a "Big Picture Space" emblem on the chest. Short black hair with a single streak of neon cyan, sharp intelligent eyes, futuristic holographic wrist display. Confident standing pose.
Style: semi-realistic Korean sci-fi webtoon art style.
Background: transparent.
Full body, high detail, 2048x2048px.
```

---

### 2.2 백구 (Baekgu) — AI 기계 진돗개

**파일명**: `baekgu_idle.png`, `baekgu_bark.png` 등  
**사용 도구**: ChatGPT DALL-E  
**수량**: 6장

```
[DALL-E 프롬프트 — 백구 기본]
A mechanical AI Jindo dog (Korean Jindo breed) named Baekgu. Pure white metallic body with glowing blue circuit patterns across the body. Sleek cyberpunk design — titanium plating with soft rounded edges. Small holographic display on the collar. Eyes glow soft blue. 
Style: semi-realistic sci-fi concept art, cute yet mechanical.
Background: transparent.
Full body, 2048x2048px.
```

```
[포즈별 프롬프트 추가 키워드]
POSE_01 (Idle): sitting alertly, ears perked up, tail raised
POSE_02 (Bark): mouth open, energy wave emanating, aggressive stance  
POSE_03 (Sniff): nose to ground, scanning mode, holographic circles
POSE_04 (Charge): running forward at speed, motion blur
POSE_05 (Light Orb): floating orb of light around body, gentle glow
POSE_06 (Victory): sitting proudly, holographic thumbs up effect
```

---

## 3. 전설 8인 영웅 (Genesis Protocol)

> 각 영웅: **포즈 5장**, PNG 투명 배경, 2048×2048
> 
> **공통 설정**: "This character is a quantum AI data reconstruction of [이름], 100 years in the future. They appear in futuristic SF tactical gear while retaining their historical identity."

### H01 — 이순신 제독 (Admiral Yi Sun-sin)

**사용 도구**: ChatGPT DALL-E (역사적 인물 — 존경스러운 표현)  
**함선 연동**: LGD01 거북선

```
[DALL-E 프롬프트]
Admiral Yi Sun-sin reimagined as a futuristic Korean space admiral. Wearing dark navy blue admiral's coat with glowing gold trim and traditional Korean turtle motifs on the armor. Silver-streaked black hair, wise and commanding expression. Holding a quantum energy spear that resembles a traditional glaive. Age: mid-50s, dignified Korean warrior general appearance.
Style: semi-realistic Korean sci-fi historical fusion, webtoon art.
Background: transparent. Full body, 2048x2048px.

[포즈 추가 설명]
POSE_04 Victory: 학익진(鶴翼陣) formation energy wave behind him
Ultimate Skill Visual: 부채꼴 에너지 반사막 — crescent-shaped golden energy barrier
```

---

### H02 — 장영실 대감 (Jang Yeong-sil)

**사용 도구**: ChatGPT DALL-E

```
[DALL-E 프롬프트]
Jang Yeong-sil reimagined as a futuristic Korean space engineer genius. Wearing a bronze-tinted mechanical engineer suit with intricate gadgets and tools attached. Medium build, warm intelligent eyes, goggles on forehead, multiple holographic blueprints floating around him. Age: mid-40s.
Style: semi-realistic Korean sci-fi inventor aesthetic.
Background: transparent. Full body, 2048x2048px.

Ultimate Skill Visual: 자동 수리 드론 — swarm of golden repair nanobots
```

---

### H03 — 광개토대왕 (Gwanggaeto the Great)

**사용 도구**: Grok (xAI) — 강렬한 전투 포즈

```
[Grok 프롬프트]
Gwanggaeto the Great, ancient Korean king reimagined as a futuristic space warlord commander. Massive imposing physique, wearing black and gold armored space suit with Goguryeo dragon motifs engraved on the chest plate. Long black hair, fierce intimidating warrior eyes, wielding a massive plasma energy war axe. Age: late 30s, peak warrior condition.
Style: epic sci-fi Korean historical fusion, dramatic lighting, webtoon.
Background: transparent. Full body, 2048x2048px.

Ultimate Skill Visual: 고구려 트루 대미지 — dragon energy burst from weapon
```

---

### H04 — 유리 가가린 (Yuri Gagarin)

**사용 도구**: ChatGPT DALL-E

```
[DALL-E 프롬프트]
Yuri Gagarin reimagined as a futuristic space pilot ace. Wearing a sleek white and orange SF pilot suit with a retro-futuristic space helmet under his arm. Youthful charm, confident smile, short hair, Soviet space mission patches reimagined as futuristic emblems.
Style: retro-futuristic sci-fi, optimistic 1960s meets 2100s.
Background: transparent. Full body, 2048x2048px.

Ultimate Skill Visual: 스텔스 실드 — shimmering invisibility field
```

---

### H05 — 호레이쇼 넬슨 (Horatio Nelson)

**사용 도구**: ChatGPT DALL-E

```
[DALL-E 프롬프트]
Admiral Horatio Nelson reimagined as a futuristic space fleet admiral. Wearing a dark blue British naval uniform fused with futuristic SF armor. Missing one eye replaced with a glowing tactical HUD monocle, one arm is a sophisticated cybernetic prosthetic. Commanding presence, medals and decorations as holographic badges.
Style: steampunk meets sci-fi admiral, webtoon semi-realistic.
Background: transparent. Full body, 2048x2048px.

Ultimate Skill Visual: 해상 봉쇄 — fleet of miniature holographic ships forming blockade
```

---

### H06 — A. 아인슈타인 (Albert Einstein)

**사용 도구**: ChatGPT DALL-E

```
[DALL-E 프롬프트]
Albert Einstein reimagined as a futuristic theoretical physicist space engineer. Wild white hair (iconic), wearing a deep purple and silver lab coat fused with space suit elements. Multiple holographic equations (E=mc², general relativity) floating around him. Kind wise eyes with a slight mischievous smile. Holding a glowing mathematical crystal representing the time-reversal equation.
Style: eccentric genius sci-fi aesthetic, webtoon.
Background: transparent. Full body, 2048x2048px.

Ultimate Skill Visual: 시간 역행 세이브 — clock-face energy field, time flowing backward
```

---

### H07 — 니콜라 테슬라 (Nikola Tesla)

**사용 도구**: Grok / ChatGPT DALL-E  
**함선 연동**: LGD02 워덴클리프

```
[Grok 프롬프트]
Nikola Tesla reimagined as a futuristic electrical engineering genius in space. Tall slender figure, formal dark suit fused with copper-colored electrical coil armor. Arcs of lightning energy constantly crackling around his hands. Intense focused eyes, sharp features, holding a quantum Tesla coil staff that crackles with electricity.
Style: electropunk sci-fi visionary, dramatic lightning effects.
Background: transparent. Full body, 2048x2048px.

Ultimate Skill Visual: 연쇄 번개 — chain lightning arcing between multiple enemy ships
```

---

### H08 — 마르코 폴로 (Marco Polo)

**사용 도구**: ChatGPT DALL-E

```
[DALL-E 프롬프트]
Marco Polo reimagined as a futuristic space merchant explorer. Wearing layered explorer robes fused with lightweight SF armor, rich earth tones (burgundy, brown, gold). A weathered adventurer's face with a short beard, carrying a holographic star map scroll. Multiple cargo packs and trading gadgets. Warm charismatic expression.
Style: merchant explorer meets space trader, silk road meets galaxy.
Background: transparent. Full body, 2048x2048px.

[특수 설정]: 실체는 P27 보이드 균열의 차원 반향체(Dimensional Echo)
Ultimate Skill Visual: 실크로드 독점 — golden trade route lines spanning the galaxy
```

---

## 4. 150인 동료 NPC

> **제작 전략**: Freepik AI 대량 생성 (각 문명권 스타일별 배치)  
> 각 NPC: 상반신 초상화(Portrait) 1장, 512×512px  
> 총 150장

### 4.1 지구 저항군 (한국형 패러디) — 25명

**사용 도구**: Freepik AI / ChatGPT DALL-E  
**명칭**: 유명인 1~2글자 변형 (유제석→유제석, 백종투, 마동철 등)

```
[Freepik 프롬프트 템플릿]
Korean resistance fighter portrait, [age]-year-old [male/female], wearing dark military space suit with Korean flag emblem. [Physical description]. 
Style: semi-realistic Korean sci-fi character portrait.
Background: dark space station interior.
Portrait bust shot (head and shoulders), 512x512px.

[문명권별 유형]
제독(Pilot): 강인한 인상, 군인 기질
공학자(Engineer): 안경 착용, 기술자 느낌  
상인(Merchant): 세련된 비즈니스 감성
```

---

### 4.2 수퍼비아 문명권 (북아메리카형) — 20명

```
[Freepik 프롬프트 템플릿]
North American space worker portrait, [age]-year-old [male/female], wearing industrial orange and gray space suit with scrap metal patches. Rugged appearance, practical equipment.
Style: blue-collar sci-fi character, gritty space worker.
Portrait bust, 512x512px.
```

---

### 4.3 아우레우� 문명권 (서유럽형 수인족) — 20명

```
[Freepik 프롬프트 템플릿]
Western European anthropomorphic space banker/merchant portrait. [Animal type: fox/cat/rabbit], wearing elegant gold-trimmed business suit with holographic credit displays. Sophisticated and wealthy appearance.
Style: anthro sci-fi aristocrat, art nouveau meets space.
Portrait bust, 512x512px.
```

---

### 4.4 메카니카 문명권 (슬라브 사이보그) — 20명

```
[Freepik 프롬프트 템플릿]
Slavic cyborg engineer portrait, [age]-year-old, partially cybernetic face and arms with visible mechanical components. Gray industrial atmosphere, cold calculating eyes. Wearing tech-heavy engineer suit.
Style: Soviet-era industrial meets cyberpunk.
Portrait bust, 512x512px.
```

---

### 4.5 크리그 문명권 (남아메리카 라틴 용병) — 20명

```
[Freepik 프롬프트 템플릿]
Latin American space mercenary portrait, [age]-year-old, wearing battle-worn combat armor with tribal energy tattoos glowing on skin. Fierce confident expression, scars from past battles.
Style: space mercenary warrior, vibrant and dangerous.
Portrait bust, 512x512px.
```

---

### 4.6 치크스 제국 (생체 관료) — 25명

```
[Grok 프롬프트 템플릿]
Cheeks Empire biological bureaucrat alien portrait. Humanoid figure with bio-mechanical enhancements, dark empire uniform with bioluminescent accents. Cold authoritarian expression.
Style: organic empire aesthetic, alien bureaucracy.
Portrait bust, 512x512px.
```

---

### 4.7 보이드 균열 차원 반향체 — 20명

```
[DALL-E 프롬프트 템플릿]
Dimensional echo merchant portrait — a semi-transparent apparition of an ancient Arabic merchant, glowing with quantum energy and void light. Reality slightly distorted around the edges, they appear to flicker between dimensions.
Style: ethereal dimensional ghost merchant, mystical void energy.
Portrait bust, 512x512px.
```

---

## 5. 7대 문명권 행성 배경

> 각 행성: 2048×2048, PNG + JPG 두 버전  
> **사용 도구**: Gemini / Grok

### 5.1 행성 이미지 프롬프트 (선택)

| 행성/문명권 | 프롬프트 키워드 |
|-----------|-------------|
| P01~P04 (수퍼비아) | "rust-colored industrial planet, scrap metal rings, harsh atmosphere, mining facilities" |
| P05~P08 (아우레우스) | "golden gleaming financial planet, crystal towers, luxury orbital stations, warm amber light" |
| P09~P12 (메카니카) | "dark gray mechanical planet, massive factories, neon circuit patterns visible from orbit, cold blue" |
| P13~P16 (크리그) | "volcanic red mercenary planet, arena structures, dust storms, crimson sky" |
| P17~P21 (치크스 코어) | "bio-organic alien planet at galaxy core, living architecture, dark red pulsating, ominous" |
| P22~P26 (지구 저항군) | "Earth in ruins, blue and green planet partially devastated, resistance stations around it, hopeful" |
| P27 (보이드 문, 차원문) | "rift anomaly in space, purple-magenta void crack, dimensional echoes, ancient gate structure" |
| P28 (보이드 실험실) | "radiation scarred planetoid, quantum energy fields, glowing blue cracks, unstable matter" |
| P29 (보이드 싱크홀) | "black void sinkhole in space, objects falling in and out, random debris field, unpredictable" |
| P30 (보이드 방주) | "ancient mathematical crystal space station, Einstein equations carved in light, stable quantum field" |

```
[Gemini 프롬프트 템플릿]
[행성 설명] from orbit, epic space vista, cinematic sci-fi planet illustration.
Visible in the distance: [문명권 특징] architectural elements.
Lighting: [행성 고유 색조] planetary glow, deep space background with stars.
Style: epic space opera concept art, photorealistic 8K quality.
2048x2048px.
```

---

### 5.2 우주 배경 (Parallax용, 레이어별)

```
[레이어 1 — 깊은 우주]
Deep space background, countless stars, nebula clouds in purple and blue.
No foreground elements. Pure star field.
1920x1080px or 2048x2048px seamless tile.

[레이어 2 — 성운]
Colorful nebula clouds, semi-transparent, sci-fi.
각 문명권 색상 톤 반영.

[레이어 3 — 소행성/잔해]
Floating asteroid belt or space debris, intermediate layer.
```

---

## 6. 함선 이미지

> **사용 도구**: Grok (xAI) — SF 함선 특화  
> 각 함선: 3각도 (정면/측면/45도), PNG 투명 배경

### 6.1 주요 함선 프롬프트

**S01 머스탱 (초기 함선)**
```
[Grok 프롬프트]
Small single-seat SF light fighter spacecraft named "Mustang". Sleek aerodynamic design with dull gray hull showing wear and patching. Basic weapon mounts on wings. Retro 1980s sci-fi aesthetic meets modern SF.
Top-down and side view on transparent background.
Clean line art style for game sprite.
```

**LGD01 거북선 (이순신 기함)**
```
[Grok 프롬프트]
Legendary flagship spaceship "Geobukson" (Turtle Ship), inspired by the historical Korean turtle ship. Massive armored hull resembling a turtle shell with hexagonal titanium plates. Multiple cannon ports on all sides glowing with energy. Traditional Korean roof-line aesthetic on the ship's structure. Dark navy blue and gold color scheme. Extremely detailed concept art.
Side profile view + 3/4 perspective view.
Transparent background. Epic scale.
```

**LGD02 워덴클리프 (테슬라 기함)**
```
[Grok 프롬프트]
Tesla's flagship "Wardenclyffe Tower Ship". Massive spire-shaped spacecraft with a giant Tesla coil structure at its apex constantly crackling with electricity. Copper and silver color scheme. Lightning constantly arcing around the hull.
Epic concept art, transparent background.
```

**우르사 메이저 (최종 보스)**
```
[Grok 프롬프트]
The Ursa Major — a planet-sized biological fortress spacecraft. Resembling a massive bear constellation structure in space, with bio-organic architecture pulsating with dark red energy. Thousands of weapon ports, living hull that breathes. Scale is comparable to a small moon. Utterly terrifying and awe-inspiring.
Style: biomechanical horror meets empire fortress. Epic space opera.
Wide angle view showing full scale against background stars.
1920x1080px.
```

---

## 7. 컴포넌트 파츠 아이콘 (75종)

> **사용 도구**: Freepik AI (대량 아이콘 생성)  
> 각 아이콘: 256×256px, PNG 투명 배경  
> 색상 코드: 등급별 구분

| 등급 | 테두리 색상 | 배경 색상 |
|------|-----------|---------|
| 일반(Tier 1~3) | 회색 #888 | 어두운 그레이 |
| 고급(Tier 4~7) | 초록색 #44FF88 | 어두운 초록 |
| 희귀(Tier 8~11) | 파란색 #4488FF | 어두운 파랑 |
| 영웅(Tier 12~14) | 보라색 #AA44FF | 어두운 보라 |
| 전설(Tier 15/신화) | 금색 #FFD700 + 발광 | 어두운 금 |

```
[Freepik 아이콘 프롬프트 템플릿]
Sci-fi game inventory icon for [아이템명].
[카테고리별 설명]:
  무기(Weapon): energy weapon, cannon, rail gun, plasma emitter
  실드(Shield): energy barrier generator, force field emitter
  엔진(Engine): warp drive, quantum thruster, propulsion module
  장갑(Armor): titanium plate armor, hull reinforcement
  유틸리티: cargo container, drone bay, power core

Style: flat vector game icon, sci-fi, [등급 색상] border glow effect.
Clean icon design, no background, 256x256px.
```

**주요 아이콘 개별 프롬프트**

```
W15 신의 철퇴 (God's Mace): 
"Legendary sci-fi war hammer with purple-gold energy corona, reality distortion effect around the head, mythic weapon icon" — 금색 테두리, 극적인 발광

S15 신의 방패 (Aegis Core):
"Legendary full-scale energy shield generator, Greek Aegis motif meets futuristic tech, glowing golden circular barrier patterns" — 금색 테두리

E15 블링크 엔진 (Blink Engine):
"Mythic teleportation engine, quantum blink drive, pink-magenta wormhole energy, rectangular cross pattern" — 핑크-금색 테두리

A15 절대 방벽 (Absolute Armor):
"Ultimate hull armor plating, absolute defense, indestructible looking titanium plates with divine energy veins" — 금색 테두리
```

---

## 8. UI/UX 이미지

> **사용 도구**: Freepik AI + 수동 디자인  
> 모든 UI: PNG, 지정 해상도

### 8.1 버튼 세트 (상태별 3종 × 20 유형 = 60장)

```
[Freepik 프롬프트 — 버튼]
Sci-fi game UI button "[버튼명]", dark space theme.
States: [Normal] / [Hover - brighter glow] / [Pressed - darker, pressed in]
Color: Neon yellow-green (#deff9a) text on dark navy background (#0d1117)
Border: Cyan glow (#00f3ff)
Style: minimalist sci-fi HUD button, flat design.
512x128px per state.

버튼 유형:
- 출격 (LAUNCH) 버튼
- 경매 입찰 (BID) 버튼
- 가차/모집 (RECRUIT) 버튼
- 업그레이드 (UPGRADE) 버튼
- 워프 이동 (WARP) 버튼
- 저장 (SAVE) 버튼
- 스킵 (SKIP) 버튼
- 설정 (SETTINGS) 버튼
- 확인 (CONFIRM) 버튼
- 취소 (CANCEL) 버튼
```

---

### 8.2 HUD 프레임 요소

```
[HP/INT/TEC 바 (게이지)]
Sci-fi health bar, energy bar, tech bar.
HP: 빨간색 그라디언트 (#FF4444)
INT (Shield): 청록색 (#00CCFF)
TEC: 노란색 (#FFD700)
Style: flat minimalist game UI element.
400x20px, transparent background.

[미니맵 프레임]
Circular tactical radar display, sci-fi HUD style.
Cyan grid overlay, dark background.
256x256px circular frame.

[캐릭터 초상화 프레임]
Square portrait frame with sci-fi border, faction color coding:
- 지구 저항군: 파란색 + 태극 패턴
- 수퍼비아: 오렌지-회색
- 아우레우스: 황금색
- 메카니카: 회색-사이안
- 크리그: 붉은색
- 치크스: 어두운 적-보라
- 보이드: 마젠타-퍼플
128x128px per frame style.
```

---

### 8.3 주요 창 배경 (Panel)

```
[인벤토리 테트리스 그리드]
Sci-fi equipment grid panel, dark background with subtle grid lines.
Individual cell: 64x64px
Panel sizes: 3x3 / 4x3 / 5x5 / 10x10 / 12x12 / 16x16

[대화창 (Dialog Box)]
Sci-fi conversation panel, semi-transparent dark background.
Portrait slot on left, text area on right.
Speaker name display area at top.
1200x200px.

[우주 경매 UI]
Futuristic auction house interface, big central item display,
bid history on right, countdown timer prominent.
1200x700px.

[스타맵 오버레이 UI]
Galaxy map overlay, pentagon grid visible, fog of war shader.
Planet node indicators (Locked/Scouted/Active states)
Full screen: 1920x1080px.
```

---

## 9. 특산물 아이템 아이콘 (21종)

> **사용 도구**: Freepik AI  
> 각 아이콘: 256×256px, PNG 투명 배경

```
G01 리사이클 고철 프레임: "Scrap metal frame icon, industrial, gray"
G02 센타우리 이끼 엑기스: "Alien moss extract vial, green bioluminescent liquid"
G03 올드 오리온 위스키: "Futuristic whiskey bottle, amber liquid, constellation design"
G04 티가든 황금 찻잎: "Golden alien tea leaves, luxury item, warm golden"
G05 넥서스 암호화 토큰: "Digital encrypted token, holographic data crystal"
G06 LHS 크리스탈 시계: "Crystal timepiece, luxury futuristic watch, prismatic"
G09 고밀도 중수소 분열 배터리: "Deuterium battery cell, heavy blue energy core, crackling"
G12 강습 스파이크 범퍼: "Combat spike bumper, weapon attachment, dark red"
G18 난중일기 번역본 영인본: "Historical diary reproduction, ancient Korean text, artifact glow"
G20 실크로드 나침반 (마르코 폴로 퀘스트): "Dimensional compass, void energy, quantum navigation"
G21 별빛 왜곡 공간 나침반: "Starlight distortion compass, void rift energy, purple glow"
```

---

## 10. 제작 우선순위

### 🔴 1순위 (개발 즉시 필요 — MVP)

| 항목 | 수량 | 도구 |
|------|------|------|
| 사령관 남/여 기본 포즈 | 10장 | DALL-E |
| 백구 포즈 세트 | 6장 | DALL-E |
| S01 머스탱 함선 | 3각도 | Grok |
| 기본 UI 버튼 (10종 × 3상태) | 30장 | Freepik |
| HUD 게이지 바 | 5종 | Freepik |
| 스타맵 배경 | 1장 | Gemini |
| P01 행성 배경 | 1장 | Gemini |

### 🟡 2순위 (Act 1 구현용)

| 항목 | 수량 | 도구 |
|------|------|------|
| 전설 영웅 H01 이순신 포즈 | 5장 | DALL-E |
| 전설 영웅 H06 아인슈타인 포즈 | 5장 | DALL-E |
| P22~P26 지구 저항군 배경 | 5장 | Gemini |
| 지구 저항군 NPC 25명 초상화 | 25장 | Freepik |
| W01~W05 무기 아이콘 | 5장 | Freepik |
| 대화창 UI | 1장 | Freepik |

### 🟢 3순위 (전체 완성)

| 항목 | 수량 | 도구 |
|------|------|------|
| 나머지 전설 영웅 6명 | 30장 | DALL-E/Grok |
| 나머지 동료 NPC 125명 | 125장 | Freepik |
| 모든 행성 배경 | 24장 | Gemini |
| 나머지 함선 32종 | 96장 | Grok |
| 나머지 컴포넌트 아이콘 | 70장 | Freepik |
| LGD01~03 전설 기함 | 9장 | Grok |
| 우르사 메이저 보스 | 3장 | Grok |
| 전 특산물 아이콘 | 21장 | Freepik |

---

*이미지 파일은 모두 `/02_Assets/images/` 하위 폴더에 저장*  
*파일명 규칙: `[카테고리]_[영어ID]_[포즈/버전].png`*  
*예시: `hero_admiral_yisunsin_idle.png`, `ship_geobukson_side.png`*
