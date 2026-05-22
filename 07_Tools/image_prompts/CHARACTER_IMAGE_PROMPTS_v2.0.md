# 🎨 DESTINATION EARTH — 캐릭터 이미지 생성 완전 가이드 v2.0
## 158명 등장인물 + 주인공/백구 이미지 프롬프트 모음

---

> **제작 도구 분류 (v6.0 기준)**
> - **ChatGPT DALL-E 4o**: 주인공/전설 영웅 초상화 (감성적, 정밀)
> - **Grok (xAI)**: 빌런/치크스 제국/전투 액션 씬
> - **Gemini (Imagen 3)**: 보이드 균열 NPC, 수인족 (아우레우스), 기계 NPC
> - **Freepik AI (Mystic)**: 동료 NPC 다수, UI 스프라이트, 지구 저항군 NPC
> - **Nano-banana (Google)**: 배경 보조, 텍스처 생성
>
> **공통 사양**: PNG + 투명 배경 / 캐릭터 2048×2048 / 초상화 512×512 / UI 512×512

---

## 📋 목차

1. [공통 스타일 가이드](#1-공통-스타일-가이드)
2. [주인공 사령관 (남/여 각 5포즈 = 10장)](#2-주인공-사령관)
3. [백구 (6포즈)](#3-백구)
4. [전설 8인 영웅 (각 5포즈 = 40장)](#4-전설-8인-영웅)
5. [치크스 빌런 8인 (각 4포즈 = 32장)](#5-치크스-빌런-8인)
6. [이휘소 박사 (1장 초상화)](#6-이휘소-박사)
7. [동료 NPC 141인 (각 1장 초상화 = 141장)](#7-동료-npc-141인)

---

## 1. 공통 스타일 가이드

```
아트 스타일: semi-realistic Korean sci-fi webtoon, high detail
색조: deep space navy(#0d1117), neon cyan(#00f3ff), plasma yellow(#deff9a)
배경: transparent (PNG alpha channel)
조명: cold space ambient + character-specific accent light
렌더링: 2048×2048px (전신), 512×512px (초상화)
```

### 공통 포즈 세트 (영웅 캐릭터 필수)

| 번호 | 이름 | 용도 |
|------|------|------|
| POSE_01 | 정면 서 있기 (Idle) | 도감, 팀 선택 |
| POSE_02 | 전투 준비 (Combat Ready) | 전투 화면 |
| POSE_03 | 상반신 초상화 (Portrait) | 대화창, 주점 |
| POSE_04 | 승리 (Victory) | 전투 승리 |
| POSE_05 | 부상/패배 (Defeated) | 피격 연출 |

---

## 2. 주인공 사령관

### 2.1 남성 사령관 (5장) — ChatGPT DALL-E 4o

```
[POSE_01 — 남성 Idle]
A Korean male space commander, mid-20s, wearing dark navy tactical combat suit 
with glowing cyan circuit patterns, "Big Picture Space" emblem on chest. 
Short black hair, determined dark eyes, futuristic holographic wrist display.
Full body standing, confident pose.
Style: semi-realistic Korean sci-fi webtoon. Background: transparent. 2048×2048px.

[POSE_02 — 남성 Combat Ready]
Same Korean male commander, battle stance, right hand gripping plasma pistol,
left hand raised with glowing energy shield. Intense expression, cyan energy
particles swirling around him. Dynamic pose.
Style: semi-realistic Korean sci-fi webtoon. Background: transparent. 2048×2048px.

[POSE_03 — 남성 Portrait]
Korean male space commander bust portrait, close-up face and upper torso.
Confident expression, slight smirk, holographic tactical display behind him.
Dramatic side lighting, deep space background.
Style: semi-realistic Korean sci-fi webtoon. 512×512px.

[POSE_04 — 남성 Victory]
Korean male commander celebrating victory, fist raised, bright smile,
space battle debris floating in background, cyan glow aura.
Full body. Style: semi-realistic Korean sci-fi webtoon. Background: transparent. 2048×2048px.

[POSE_05 — 남성 Defeated]
Korean male commander kneeling, damaged suit with scorch marks,
exhausted expression, one hand on ground, dramatic shadows.
Full body. Style: semi-realistic Korean sci-fi webtoon. Background: transparent. 2048×2048px.
```

**파일명**: `commander_male_01_idle.png` ~ `commander_male_05_defeated.png`

---

### 2.2 여성 사령관 (5장) — ChatGPT DALL-E 4o

```
[POSE_01 — 여성 Idle]
A Korean female space commander, mid-20s, dark navy tactical combat suit
with glowing cyan circuit patterns, "Big Picture Space" emblem. Short black hair
with one neon cyan streak, sharp intelligent eyes, holographic wrist display.
Full body standing, powerful confident pose.
Style: semi-realistic Korean sci-fi webtoon. Background: transparent. 2048×2048px.

[POSE_02 — 여성 Combat Ready]
Same Korean female commander, combat stance, dual energy blades drawn,
cyan energy trailing from blades. Fierce determined expression.
Style: semi-realistic Korean sci-fi webtoon. Background: transparent. 2048×2048px.

[POSE_03 — 여성 Portrait]
Korean female commander bust portrait, close-up. Calm authoritative expression,
tactical visor pushed up on forehead, deep space stars visible behind.
Style: semi-realistic Korean sci-fi webtoon. 512×512px.

[POSE_04 — 여성 Victory]
Korean female commander arms wide open in triumph, bright smile,
starfield background, golden light particles falling around her.
Style: semi-realistic Korean sci-fi webtoon. Background: transparent. 2048×2048px.

[POSE_05 — 여성 Defeated]
Korean female commander crouching in pain, torn suit, determined eyes still glowing.
Style: semi-realistic Korean sci-fi webtoon. Background: transparent. 2048×2048px.
```

**파일명**: `commander_female_01_idle.png` ~ `commander_female_05_defeated.png`

---

## 3. 백구 (AI 기계 진돗개)

**제작 도구**: ChatGPT DALL-E 4o (6포즈)

```
[공통 기본 설명]
An AI robotic Jindo dog (Korean breed), pure white metallic body with glowing cyan LED eyes,
mechanical prosthetic legs with joint details, small antenna on back, 
"BPS-K9" engraved on collar. Sleek futuristic design, not cartoonish.
Style: semi-realistic sci-fi mechanical creature. Background: transparent. 2048×2048px.

[BAEKGU_01 — Idle]
Robotic white Jindo dog sitting upright, alert posture, cyan eyes glowing steadily,
holographic display projecting from collar showing star map data.
Background: transparent. 2048×2048px.

[BAEKGU_02 — Combat]
Robotic Jindo dog in attack stance, teeth showing metallic teeth, eyes glowing red,
energy coils charging along spine, ready to pounce.
Background: transparent. 2048×2048px.

[BAEKGU_03 — Bark (짖기 스킬)]
Robotic Jindo dog barking, mouth wide open releasing sonic energy wave (cyan sound rings),
fur plates raised, dramatic power stance.
Background: transparent. 2048×2048px.

[BAEKGU_04 — Sniff (냄새추적 스킬)]
Robotic Jindo dog nose close to ground, sniffing with glowing sensor particles
flowing from nose toward a trail, tail raised high.
Background: transparent. 2048×2048px.

[BAEKGU_05 — Victory]
Robotic Jindo dog on hind legs, paws up, mouth open in happy expression,
tail wagging creating cyan motion blur. Joyful pose.
Background: transparent. 2048×2048px.

[BAEKGU_06 — Sad]
Robotic Jindo dog lying down, ears folded back, dim eyes flickering,
one paw extended forward. Lonely waiting posture.
Background: transparent. 2048×2048px.
```

**파일명**: `baekgu_01_idle.png` ~ `baekgu_06_sad.png`

---

## 4. 전설 8인 영웅 (Genesis Protocol)

**제작 도구**: ChatGPT DALL-E 4o / Freepik AI  
**공통 접두사**: 각 영웅 최신 SF 갑옷 착용 + 고유 역사적 모티브 융합

---

### H01 이순신 제독

```
[공통 설정]
Admiral Yi Sun-sin reimagined as a space admiral. Korean male, late 40s, dignified face.
Wearing midnight blue spacesuit armor with turtle ship (Geobukson) motif decorations,
gold rank insignia, traditional Korean naval admiral hat (장군모) reimagined in metallic SF style.
Carries a holographic war fan and tactical plasma sword.
Style: semi-realistic Korean sci-fi webtoon. Background: transparent.

[H01_01 Idle] Full body standing, arms behind back, admiral's commanding presence, calm expression.
[H01_02 Combat] Drawing plasma sword, turtle ship hologram behind him, fierce battle cry.
[H01_03 Portrait] Bust portrait, stern wise expression, decorated medal ribbons visible.
[H01_04 Victory] Pointing forward triumphantly, glowing tactical display showing victory formation.
[H01_05 Defeated] Kneeling but unbroken, one fist on ground, fire in eyes.
```

**파일명**: `hero_H01_01_idle.png` ~ `hero_H01_05_defeated.png`

---

### H02 장영실 대감

```
[공통 설정]
Jang Yeong-sil reimagined as a master engineer. Korean male, 50s, kind intelligent face.
Wearing bronze-gold engineering suit covered in gears, circuit patterns, tool holsters.
Carries multi-tool robotic arm, surrounded by floating repair drones.
Traditional Joseon scholar cap (갓) reimagined in holographic metal.

[H02_01 Idle] Standing with hands clasped behind, surrounded by hovering repair drones.
[H02_02 Combat] Deploying repair drones in attack formation, multi-tool arm extended.
[H02_03 Portrait] Bust portrait, warm smile, spectacles-like HUD visor.
[H02_04 Victory] Arms raised with a satisfied engineer's grin, drones celebrating.
[H02_05 Defeated] Exhausted slump, drones gathering around to support him.
```

---

### H03 광개토대왕

```
[공통 설정]
Gwanggaeto the Great reimagined as a supreme conqueror pilot. Korean male, 40s, powerful build.
Enormous armored spacesuit, red-gold color scheme (Goguryeo royal colors),
massive shoulder pauldrons, energy crown, twin plasma battle axes.
Eyes glow red with warrior spirit.

[H03_01 Idle] Towering stance, arms crossed, aura of absolute authority, war map behind.
[H03_02 Combat] Both battle axes raised, energy exploding in red-gold burst, war cry.
[H03_03 Portrait] Bust portrait, royal face with battle scars, intense eyes.
[H03_04 Victory] Standing on defeated enemy ship hull, conquering pose.
[H03_05 Defeated] Bleeding but refusing to fall, still gripping axes.
```

---

### H04 유리 가가린

```
[공통 설정]
Yuri Gagarin reimagined as an ace stealth pilot. Russian male, 30s, boyish charming face.
Sleek silver-white pilot suit, retro-futuristic design mixing Soviet space era + SF future.
Classic rounded pilot helmet, stealth generator on wrist.
Warm smile even in combat.

[H04_01 Idle] Leaning against a phantom fighter, arms crossed, easy smile.
[H04_02 Combat] Activating stealth mode, becoming semi-transparent, glowing outline only.
[H04_03 Portrait] Bust portrait, iconic Gagarin smile, starfield behind.
[H04_04 Victory] Giving thumbs up in cockpit, "ПОЕХАЛИ!" expression.
[H04_05 Defeated] Canopy shattered, still smiling, refusing to give up.
```

---

### H05 호레이쇼 넬슨

```
[공통 설정]
Horatio Nelson reimagined as a naval blockade specialist. British male, 50s, weathered face.
Admiral's coat reimagined in dark space navy with gold trim,
eye patch replaced with tactical monocle HUD, empty right sleeve from battle injury.
Commands from a holographic flagship bridge.

[H05_01 Idle] Standing at holographic war table, strategizing, one hand on table.
[H05_02 Combat] Pointing command baton forward, fleet attack order issued.
[H05_03 Portrait] Bust portrait, weathered noble face, tactical monocle glowing.
[H05_04 Victory] Raising captain's hat in salute, ship fleet in background.
[H05_05 Defeated] Leaning on wall, pressing wound, still commanding.
```

---

### H06 알베르트 아인슈타인

```
[공통 설정]
Albert Einstein reimagined as a time-bending physicist. Male, 70s, wild white hair, warm kind eyes.
Wearing professor's coat fused with quantum field emitters, time-distortion gauntlets,
mathematical equations floating around him in holographic form.
Carrying quantum chalk and portable blackboard device.

[H06_01 Idle] Writing equations in holographic air, lost in thought, genius at work.
[H06_02 Combat] Activating time reversal gauntlets, golden time-stream swirling around him.
[H06_03 Portrait] Bust portrait, warm mischievous smile, relativity equation visible.
[H06_04 Victory] Laughing with delight, equations resolving perfectly around him.
[H06_05 Defeated] Time gauntlets flickering, determined face, not finished yet.
```

---

### H07 니콜라 테슬라

```
[공통 설정]
Nikola Tesla reimagined as a lightning engineer. Male, 40s, tall thin build, intense eyes.
Black coat with Tesla coil integrated as spine, electric arc dischargers on shoulders,
chain lightning crackling from fingertips, wireless electricity field aura.

[H07_01 Idle] Standing in electric field, lightning dancing between fingers, focused gaze.
[H07_02 Combat] Releasing chain lightning attack, arms spread wide, electric storm unleashed.
[H07_03 Portrait] Bust portrait, haunted intense eyes, lightning sparks in hair.
[H07_04 Victory] Electric arc crown above head, triumphant smile, power contained.
[H07_05 Defeated] Coils overloaded, sparking dangerously, on one knee.
```

---

### H08 마르코 폴로

```
[공통 설정]
Marco Polo reimagined as an interstellar merchant-explorer. Male, 30s, Mediterranean features.
Layered traveler's coat mixing Silk Road patterns with holographic fabrics,
trade route maps tattooed on arms in glowing ink, merchant's satchel with dimensional storage.
Always accompanied by floating trade ledger hologram.

[H08_01 Idle] Studying star trade route map, merchant ring on finger, wise expression.
[H08_02 Combat] Throwing dimensional trade goods as weapons, merchant-style combat.
[H08_03 Portrait] Bust portrait, knowing smile, trade route map behind.
[H08_04 Victory] Presenting rare trade item as spoils, satisfied grin.
[H08_05 Defeated] Satchel burst open, goods scattered, scrambling to collect.
```

---

## 5. 치크스 빌런 8인

**제작 도구**: **Grok (xAI)** — 다크하고 공격적인 SF 빌런 특화

**공통 스타일**: 치크스 제국 = 생체공학 + 아시아 고급 관료 미학. 
어두운 보라/검정 색조, 생체 기계 융합 갑옷, 위압적 외형.

---

### V01 황제 우르사-렉스

```
[공통 설정]
Ursa-Rex, the Supreme Emperor of Cheeks Empire. Massive alien emperor, humanoid but imposing.
Bio-mechanical black-purple armor fused with living tissue, enormous scale,
crown made of planetary fragments. Eyes glow dark red. Radiates absolute power.
Background shows Ursa Major fortress.

[V01_01 Idle] Seated on bio-throne, arms on rests, universe-crushing authority.
[V01_02 Combat] Rising from throne, bio-energy weapon charging, planet-scale threat.
[V01_03 Portrait] Bust portrait, alien emperor face, cold merciless eyes.
[V01_04 Rage] Full power unleashed, absolute shield glowing, unstoppable.
Style: dark sci-fi epic villain. Background: transparent. 2048×2048px.
```

---

### V02 제독 칸 크리스탈

```
Fleet Admiral of Cheeks Empire, male alien warrior, 40s, lean battle-hardened.
Crystal-black naval armor, rank insignia made of dark matter crystals,
command saber at hip, tactical holo-displays surrounding him.
Cold calculating expression.

[4 포즈]: Idle(fleet commander stance) / Combat(drawing saber, fleet attack order) / Portrait(stern face) / Rage(dark ion cannon firing)
```

---

### V03 총독 즈하

```
Governor Zha, administrator of core planets. Rotund bureaucratic alien, 50s.
Lavish imperial robes with credits/numbers embedded in fabric, abacus-like weapon.
Greedy scheming expression, multiple rings on each finger.

[4 포즈]: Idle(counting credits) / Combat(deploying tax collector drones) / Portrait(smug smile) / Rage(summoning debt collector mechs)
```

---

### V04 생체공학자 바이오-렉스

```
Bio-Rex, designer of Ursa Major. Alien scientist, tall skeletal frame.
White lab coat merged with living bio-machines, specimen jars on belt,
hands with extended surgical fingers, eyes magnified by bio-lens implants.

[4 포즈]: Idle(examining specimen) / Combat(releasing cellular division clones) / Portrait(clinical cold eyes) / Rage(full body bio-mutation mode)
```

---

### V05 제국 첩보관 그림자-날

```
Shadow-Nal, Cheeks spy master. Androgynous assassin figure, slim.
Mirror-surface armor that reflects environment, face covered by shifting shadow-mask,
twin shadow blades, no visible eyes (just void).

[4 포즈]: Idle(partially invisible, emerging from shadow) / Combat(mirror clone summoning) / Portrait(featureless face, single glowing eye) / Rage(multiple clone ambush)
```

---

### V06 포격함장 볼텍스-9

```
Vortex-9, machine-fusion artillery captain. Cyborg alien, half-machine.
Right half of body fully replaced with cannon mechanism, graviton launcher arm,
battle damage scars on organic left side, one red mechanical eye.

[4 포즈]: Idle(gravity bomb primed in hand) / Combat(cannon arm extended, charging shot) / Portrait(machine half glowing) / Rage(full barrage mode, multiple cannons deployed)
```

---

### V07 봉쇄 사령관 시그마

```
Sigma, solar system blockade commander. Military alien, imposing posture.
Deep space black armor with star chart embedded in chest plate,
fog-generator on back (creates interstellar mist), sector map on wrist.

[4 포즈]: Idle(reviewing blockade map) / Combat(activating fog of war device) / Portrait(strategic cold expression) / Rage(full blockade protocol, mist engulfing everything)
```

---

### V08 황실 근위대 오메가

```
Omega, emperor's closest guardian. Massive armored knight alien.
Emperor's crest on shield, divine aura armor, twin plasma spears.
Acts as final gate before reaching the emperor.

[4 포즈]: Idle(spears crossed in guard stance) / Combat(emperor's shield barrier deployed) / Portrait(faceless imperial helmet, aura leaking) / Rage(both spears unleashed, divine retribution attack)
```

---

## 6. 이휘소 박사 (초상화 1장)

**제작 도구**: ChatGPT DALL-E 4o

```
[이휘소 박사 초상화]
A worn black-and-white photograph on an old wall. Shows a Korean male physicist 
in his 40s, intelligent kind eyes behind thick-rimmed glasses, gentle smile.
Professor's lab coat, chalk dust on hands.
The photo appears aged, slightly yellowed, with tears at corners.
A complex physics equation (quantum field theory) is written on a blackboard behind him.
Style: photorealistic aged photograph aesthetic. Size: 512×512px.
Context: displayed in an underground bunker wall in the game.
```

**파일명**: `dr_hwiso_portrait.png`

---

## 7. 동료 NPC 141인 초상화

**제작 도구**: Freepik AI (다량 생성 최적화)

### 7.1 제작 방식

각 문명권 스타일 기준으로 **배치 프롬프트** 사용 (Freepik AI 배치 생성):

```
공통 포맷:
[문명권 스타일] character portrait, bust shot, [직무 표시], 
[성별/나이], [분위기 특성], space crew member,
game character portrait style, semi-realistic,
white or transparent background, 512×512px.
```

---

### 7.2 지구 저항군 NPC (25명) — Freepik AI

**스타일**: 한국 SF 웹툰 스타일, 한국인 외모, 전투/저항군 느낌

```
[배치 프롬프트 템플릿]
Korean resistance fighter character portrait, bust shot, 
[pilot/engineer/merchant], Korean appearance, 
[20s-50s, male/female, hair description],
worn but determined expression, patched military jacket,
Earth Resistance Force insignia patch visible.
Semi-realistic Korean sci-fi webtoon style.
Transparent background. 512×512px.
```

| 행성 | NPC 코드 | 성명 (한국형 패러디) | 직무 | 성별/나이 |
|------|---------|----------------|------|---------|
| P22 | NPC_F06_P22_01 | 김철순 (Kim Cheol-sun) | Pilot | 남/40s |
| P22 | NPC_F06_P22_02 | 박소이 (Park So-i) | Engineer | 여/30s |
| P22 | NPC_F06_P22_03 | 이강호 (Lee Gang-ho) | Merchant | 남/50s |
| P22 | NPC_F06_P22_04 | 정하연 (Jung Ha-yeon) | Pilot | 여/25s |
| P22 | NPC_F06_P22_05 | 한민석 (Han Min-seok) | Engineer | 남/35s |
| P23 | NPC_F06_P23_01 | 최영준 (Choi Young-jun) | Pilot | 남/45s |
| P23 | NPC_F06_P23_02 | 윤수아 (Yoon Su-a) | Merchant | 여/28s |
| P23 | NPC_F06_P23_03 | 강동현 (Kang Dong-hyeon) | Engineer | 남/38s |
| P23 | NPC_F06_P23_04 | 임지원 (Lim Ji-won) | Pilot | 여/32s |
| P23 | NPC_F06_P23_05 | 오재형 (Oh Jae-hyeong) | Merchant | 남/55s |
| P24 | NPC_F06_P24_01 | 신은혜 (Shin Eun-hye) | Engineer | 여/30s |
| P24 | NPC_F06_P24_02 | 류현태 (Ryu Hyeon-tae) | Pilot | 남/42s |
| P24 | NPC_F06_P24_03 | 조민아 (Jo Min-a) | Merchant | 여/27s |
| P24 | NPC_F06_P24_04 | 서준혁 (Seo Jun-hyeok) | Engineer | 남/36s |
| P24 | NPC_F06_P24_05 | 배나영 (Bae Na-young) | Pilot | 여/33s |
| P25 | NPC_F06_P25_01 | 홍세진 (Hong Se-jin) | Merchant | 남/48s |
| P25 | NPC_F06_P25_02 | 문다희 (Mun Da-hee) | Pilot | 여/26s |
| P25 | NPC_F06_P25_03 | 안재민 (An Jae-min) | Engineer | 남/40s |
| P25 | NPC_F06_P25_04 | 장소연 (Jang So-yeon) | Merchant | 여/35s |
| P25 | NPC_F06_P25_05 | 권태양 (Kwon Tae-yang) | Pilot | 남/29s |
| P26 | NPC_F06_P26_01 | 나유진 (Na Yu-jin) | Engineer | 여/31s |
| P26 | NPC_F06_P26_02 | 도승일 (Do Seung-il) | Merchant | 남/44s |
| P26 | NPC_F06_P26_03 | 고민정 (Go Min-jeong) | Pilot | 여/37s |
| P26 | NPC_F06_P26_04 | 석준서 (Seok Jun-seo) | Engineer | 남/52s |
| P26 | NPC_F06_P26_05 | 심채원 (Shim Chae-won) | Merchant | 여/24s |

---

### 7.3 수퍼비아 NPC (16명) — Freepik AI

**스타일**: 북아메리카형, 다양한 민족, 공업적 실용주의 복장

```
[배치 프롬프트 템플릿]
North American space crew character portrait, bust shot,
[pilot/engineer/merchant], diverse ethnicity, 
[age/gender], practical industrial spacesuit, 
Superbia faction badge (gear + star emblem),
confident capable expression.
Semi-realistic sci-fi style. Transparent background. 512×512px.
```

| 행성 | NPC 코드 | 이름 | 직무 | 특징 |
|------|---------|------|------|------|
| P01 | NPC_F01_P01_01 | James Mackenzie | Pilot | 남/45, 빨간 수염 스코티시 |
| P01 | NPC_F01_P01_02 | Rosa Delgado | Merchant | 여/35, 라틴 아메리카 |
| P01 | NPC_F01_P01_03 | Tyler Chen | Engineer | 남/28, 아시안-아메리칸 |
| P01 | NPC_F01_P01_04 | Samantha Torres | Pilot | 여/40, 흑인 여성 |
| P02 | NPC_F01_P02_01 | Rick O'Brien | Merchant | 남/52, 아이리시 |
| P02 | NPC_F01_P02_02 | Nina Volkov | Engineer | 여/33, 러시안-아메리칸 |
| P02 | NPC_F01_P02_03 | Marcus Webb | Pilot | 남/38, 흑인 남성 |
| P02 | NPC_F01_P02_04 | Claire Fontaine | Merchant | 여/29, 프렌치-캐네디안 |
| P03 | NPC_F01_P03_01 | Derek Johnson | Engineer | 남/47, 중서부 미국인 |
| P03 | NPC_F01_P03_02 | Aiyana Redcloud | Pilot | 여/31, 네이티브 아메리칸 |
| P03 | NPC_F01_P03_03 | Oscar Patel | Merchant | 남/43, 인도계 캐나다인 |
| P03 | NPC_F01_P03_04 | Brianna Lee | Engineer | 여/26, 아시안-아메리칸 |
| P04 | NPC_F01_P04_01 | Tom Hargrove | Pilot | 남/55, 텍사스 카우보이 스타일 |
| P04 | NPC_F01_P04_02 | Zoe Nakamura | Merchant | 여/34, 일본계 미국인 |
| P04 | NPC_F01_P04_03 | Carlos Rivera | Engineer | 남/41, 멕시코계 미국인 |
| P04 | NPC_F01_P04_04 | Heather Brooks | Pilot | 여/37, 금발 앵글로색슨 |

---

### 7.4 아우레우스 NPC (16명) — Gemini Imagen 3

**스타일**: 서유럽형 수인족 (반수반인), 우아한 금융 귀족 분위기

```
[배치 프롬프트 템플릿]
Anthropomorphic European noble space merchant character portrait,
[animal type: fox/cat/wolf/rabbit/etc.] ears and features, bipedal humanoid,
wearing elegant gold-trimmed banking suit, Aureus faction emblem (gold coin + star),
sophisticated wealthy expression, [male/female, age].
Gemini Imagen 3. Semi-realistic fantasy sci-fi. Transparent background. 512×512px.
```

| 행성 | NPC 코드 | 이름 | 수인 타입 | 직무 |
|------|---------|------|--------|------|
| P05 | NPC_F02_P05_01 | Pierre Dubois | Fox 수인 | Merchant |
| P05 | NPC_F02_P05_02 | Sophie Beaumont | Cat 수인 | Engineer |
| P05 | NPC_F02_P05_03 | Diego Bianchi | Wolf 수인 | Pilot |
| P05 | NPC_F02_P05_04 | Amelie Moreau | Rabbit 수인 | Merchant |
| P06 | NPC_F02_P06_01 | Henri Laurent | Bear 수인 | Pilot |
| P06 | NPC_F02_P06_02 | Isabella Ferrari | Deer 수인 | Merchant |
| P06 | NPC_F02_P06_03 | Luca Romano | Otter 수인 | Engineer |
| P06 | NPC_F02_P06_04 | Clara Lefebvre | Squirrel 수인 | Pilot |
| P07 | NPC_F02_P07_01 | Marcel Girard | Horse 수인 | Merchant |
| P07 | NPC_F02_P07_02 | Elise Mercier | Bird(Raven) 수인 | Engineer |
| P07 | NPC_F02_P07_03 | Antoine Bernard | Lion 수인 | Pilot |
| P07 | NPC_F02_P07_04 | Margot Petit | Swan 수인 | Merchant |
| P08 | NPC_F02_P08_01 | Nicolas Thomas | Fox 수인 | Engineer |
| P08 | NPC_F02_P08_02 | Juliette Martin | Cat 수인 | Pilot |
| P08 | NPC_F02_P08_03 | Olivier Simon | Wolf 수인 | Merchant |
| P08 | NPC_F02_P08_04 | Camille Robert | Rabbit 수인 | Engineer |

---

### 7.5 메카니카 NPC (16명) — Gemini Imagen 3

**스타일**: 슬라브 공업형, 중장비 공학자 외형, 기계 부품 장착

```
[배치 프롬프트 템플릿]
Slavic industrial space engineer character portrait, bust shot,
[male/female], heavy-duty engineering exosuit, Mechanica faction emblem (gear + circuit),
cybernetic enhancement visible (arm implant or eye HUD),
serious focused engineer expression, [age].
Semi-realistic sci-fi. Transparent background. 512×512px.
```

| 행성 | NPC 코드 | 이름 | 직무 | 특징 |
|------|---------|------|------|------|
| P09 | NPC_F03_P09_01 | Dmitri Ivanov | Engineer | 남/50, 큰 수염, 사이보그 팔 |
| P09 | NPC_F03_P09_02 | Natasha Petrova | Pilot | 여/35, 기계 눈 왼쪽 |
| P09 | NPC_F03_P09_03 | Sergei Volkov | Merchant | 남/42, 공업용 안전모 |
| P09 | NPC_F03_P09_04 | Oksana Romanova | Engineer | 여/29, 전기 손 장착 |
| P10 | NPC_F03_P10_01 | Pavel Kozlov | Pilot | 남/46, 중장갑 전투복 |
| P10 | NPC_F03_P10_02 | Irina Sokolova | Engineer | 여/38, 나노봇 팔 보조 |
| P10 | NPC_F03_P10_03 | Viktor Morozov | Merchant | 남/55, 선글라스형 HUD |
| P10 | NPC_F03_P10_04 | Elena Kuznetsova | Pilot | 여/31, 기계 척추 보조 |
| P11 | NPC_F03_P11_01 | Alexei Popov | Engineer | 남/48, 화염 방사 도구 |
| P11 | NPC_F03_P11_02 | Olga Mikhailova | Merchant | 여/40, 공구 벨트 가득 |
| P11 | NPC_F03_P11_03 | Andrei Lebedev | Pilot | 남/33, 사이버네틱 다리 |
| P11 | NPC_F03_P11_04 | Vera Solovyova | Engineer | 여/27, 작은 수리 드론 동반 |
| P12 | NPC_F03_P12_01 | Konstantin Fedorov | Merchant | 남/52, 회계용 홀로 주판 |
| P12 | NPC_F03_P12_02 | Ludmila Vasileva | Pilot | 여/44, 핵연료 팩 장착 |
| P12 | NPC_F03_P12_03 | Boris Nikolaev | Engineer | 남/37, 스팀펑크 고글 |
| P12 | NPC_F03_P12_04 | Tatyana Zaitseva | Merchant | 여/30, 분석 안경 |

---

### 7.6 크리그 NPC (16명) — Grok (xAI)

**스타일**: 남아메리카 라틴 용병, 근육질 전사 외형, 화려한 무기

```
[배치 프롬프트 템플릿]
Latin American mercenary space warrior character portrait, bust shot,
[male/female], battle-worn combat armor, Krieg faction tattoo visible,
weapon holstered, [skin tone, hair], fierce mercenary expression.
Dark action sci-fi style. Transparent background. 512×512px.
```

| 행성 | NPC 코드 | 이름 | 직무 | 특징 |
|------|---------|------|------|------|
| P13 | NPC_F04_P13_01 | Carlos Silva | Pilot | 남/38, 얼굴 흉터 |
| P13 | NPC_F04_P13_02 | Maria Gonzalez | Merchant | 여/32, 권총 두 자루 |
| P13 | NPC_F04_P13_03 | Diego Ramirez | Engineer | 남/45, 폭발물 전문가 |
| P13 | NPC_F04_P13_04 | Sofia Vargas | Pilot | 여/27, 매 문신 |
| P14 | NPC_F04_P14_01 | Luis Martinez | Merchant | 남/50, 거대 중기관총 |
| P14 | NPC_F04_P14_02 | Carmen Lopez | Engineer | 여/36, 드론 조종 |
| P14 | NPC_F04_P14_03 | Jorge Hernandez | Pilot | 남/42, 칼날 장갑 |
| P14 | NPC_F04_P14_04 | Ana Torres | Merchant | 여/29, 로켓 배낭 |
| P15 | NPC_F04_P15_01 | Pablo Rodriguez | Engineer | 남/48, 화염방사기 |
| P15 | NPC_F04_P15_02 | Isabella Moreno | Pilot | 여/33, 레이저 소총 |
| P15 | NPC_F04_P15_03 | Rafael Jimenez | Merchant | 남/40, 전술 가방 |
| P15 | NPC_F04_P15_04 | Valentina Cruz | Engineer | 여/26, 공학 드릴 팔 |
| P16 | NPC_F04_P16_01 | Marco Sanchez | Pilot | 남/55, 전투 흉터 다수 |
| P16 | NPC_F04_P16_02 | Lucia Reyes | Merchant | 여/41, 블랙마켓 상인 |
| P16 | NPC_F04_P16_03 | Antonio Flores | Engineer | 남/34, 부스터 팩 |
| P16 | NPC_F04_P16_04 | Elena Ortega | Pilot | 여/30, 대검 소지 |

---

### 7.7 치크스 제국 동료 NPC (20명) — Grok (xAI)

**스타일**: 아시아 관료형, 탈주 제국 병사 또는 이중 첩자 느낌

```
[배치 프롬프트 템플릿]
Asian bureaucratic alien empire space officer character portrait,
defector/double agent look, imperial uniform partially torn,
Cheeks Empire insignia visible but damaged, conflicted expression,
[male/female, age]. Dark bureaucratic sci-fi style. Transparent background. 512×512px.
```

| 행성 | NPC 코드 | 이름 | 직무 | 특징 |
|------|---------|------|------|------|
| P17 | NPC_F05_P17_01 | Wang Wei | Pilot | 남/40, 탈주 제국 에이스 |
| P17 | NPC_F05_P17_02 | Liu Mei | Engineer | 여/35, 제국 기술자 이탈자 |
| P17 | NPC_F05_P17_03 | Zhang Feng | Merchant | 남/55, 암거래 제국 관료 |
| P17 | NPC_F05_P17_04 | Chen Xiu | Pilot | 여/28, 이중 첩자 |
| P18 | NPC_F05_P18_01 | Kim Jong-su | Engineer | 남/47, 조선계 제국 기술자 |
| P18 | NPC_F05_P18_02 | Nguyen Minh | Pilot | 남/38, 베트남계 제국 파일럿 |
| P18 | NPC_F05_P18_03 | Yamamoto Keiko | Merchant | 여/43, 일본계 제국 상인 |
| P18 | NPC_F05_P18_04 | Park Sung-min | Engineer | 남/31, 탈주 병사 |
| P19 | NPC_F05_P19_01 | Sato Hiroshi | Pilot | 남/52, 경험 많은 제국 사령관 이탈 |
| P19 | NPC_F05_P19_02 | Lin Xue | Merchant | 여/37, 제국 무역부 이탈자 |
| P19 | NPC_F05_P19_03 | Tanaka Ryo | Engineer | 남/44, 제국 병기 전문가 |
| P19 | NPC_F05_P19_04 | Oh Seon-hwa | Pilot | 여/29, 이중첩자 제국 에이스 |
| P20 | NPC_F05_P20_01 | Cho Byung-guk | Engineer | 남/48, 우르사 메이저 내부 정보 |
| P20 | NPC_F05_P20_02 | Han Ji-hye | Merchant | 여/36, 제국 자금 유출 |
| P20 | NPC_F05_P20_03 | Lee Sun-tae | Pilot | 남/41, 제국 탈주 에이스 |
| P20 | NPC_F05_P20_04 | Jung Hae-ri | Engineer | 여/26, 신기술 이탈자 |
| P21 | NPC_F05_P21_01 | Choi Sang-woo | Merchant | 남/53, 황실 조달 담당 이탈 |
| P21 | NPC_F05_P21_02 | Yoo Ji-young | Pilot | 여/32, 황실 근위 이탈자 |
| P21 | NPC_F05_P21_03 | Im Hyun-joon | Engineer | 남/45, 제국 공학 최고 수준 |
| P21 | NPC_F05_P21_04 | Kwon Min-ji | Merchant | 여/27, 제국 첩보 요원 이탈 |

---

### 7.8 보이드 균열 NPC (16명) — Gemini Imagen 3

**스타일**: 아랍형 차원 반향체, 반투명 유령 상인, 신비로운 외형

```
[배치 프롬프트 템플릿]
Arabic dimensional echo entity character portrait, semi-transparent ghostly appearance,
ancient silk road merchant robes mixed with void energy patterns,
glowing turquoise dimensional rift energy surrounding body,
wise ancient eyes, [male/female]. 
Mystical sci-fi dimensional ghost style. Transparent background. 512×512px.
```

| 균열 | NPC 코드 | 이름 | 직무 | 특징 |
|------|---------|------|------|------|
| P27 | NPC_F07_P27_01 | Rashid al-Tariq | Merchant | 남, 반투명 silk road 상인 |
| P27 | NPC_F07_P27_02 | Fatima al-Najjar | Engineer | 여, 차원 문 수리 전문 |
| P27 | NPC_F07_P27_03 | Karim ibn Yusuf | Pilot | 남, 고대 항법사 기억 |
| P27 | NPC_F07_P27_04 | Layla al-Rashid | Merchant | 여, 차원 물품 중개 |
| P28 | NPC_F07_P28_01 | Omar al-Farouq | Engineer | 남, 균열 연구 기억 보유 |
| P28 | NPC_F07_P28_02 | Amira bint Saad | Merchant | 여, 희귀 에센스 거래 |
| P28 | NPC_F07_P28_03 | Hakim al-Mansur | Pilot | 남, 균열 항법 전문 |
| P28 | NPC_F07_P28_04 | Zara al-Hassan | Engineer | 여, 차원 역학 기억 |
| P29 | NPC_F07_P29_01 | Ibrahim al-Kindi | Merchant | 남, 싱크홀 파츠 중개 |
| P29 | NPC_F07_P29_02 | Yasmin al-Fadl | Pilot | 여, 싱크홀 생존 반향체 |
| P29 | NPC_F07_P29_03 | Khalid ibn Omar | Engineer | 남, 전설 파츠 감정 |
| P29 | NPC_F07_P29_04 | Sana al-Jamil | Merchant | 여, 5턴 파츠 예측 |
| P30 | NPC_F07_P30_01 | Abdullah al-Noor | Pilot | 남, 방주 보호 임무 |
| P30 | NPC_F07_P30_02 | Mariam al-Aziz | Engineer | 여, 시간 안정화 전문 |
| P30 | NPC_F07_P30_03 | Yusuf al-Qadir | Merchant | 남, 아인슈타인 관련 기억 |
| P30 | NPC_F07_P30_04 | Noor al-Huda | Pilot | 여, 균열 방주 전문 |

---

## 📊 이미지 총계 요약

| 분류 | 수량 | 제작 도구 |
|------|------|---------|
| 사령관 (남/여 각 5포즈) | 10장 | DALL-E 4o |
| 백구 (6포즈) | 6장 | DALL-E 4o |
| 전설 영웅 8인 (각 5포즈) | 40장 | DALL-E 4o / Freepik |
| 치크스 빌런 8인 (각 4포즈) | 32장 | Grok (xAI) |
| 이휘소 박사 (초상화) | 1장 | DALL-E 4o |
| 동료 NPC 141인 (각 1장) | 141장 | Freepik AI / Gemini / Grok |
| **캐릭터 총합** | **230장** | |

---

*본 가이드는 DESTINATION EARTH GDD v6.0 기준 캐릭터 이미지 제작 완전 가이드입니다.*  
*최종 수정: 2026-05-19*
