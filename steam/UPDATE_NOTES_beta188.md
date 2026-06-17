# Destination Earth — Major Update (v1.0.0-beta.188)

> This build rolls up **146 versions** of work since the previous release (beta.42).
> Story, combat, fleet, balance, and UI have all changed significantly. Grab the new build and dive in!

---

## 📖 Story & Scenario — the biggest change

- **First-encounter cutscenes for all 8 Legendary Heroes** — special cinematic moments when you recruit Yi Sun-sin, Jang Yeong-sil, Gwanggaeto the Great, Gagarin, Nelson, Einstein, Tesla, and Marco Polo.
- **Main scenario for Phases 1–6 completed** — the full story from departure through the Void Rift to the final ending, with many new cutscenes.
- **Scenario quests appear instantly** — story and Baekgu NPC quests now show up the moment you arrive at a planet.
- **Cutscenes 1–9 unlock in sequence** — replay any past cutscene anytime via the dialogue-log buttons.
- **Cleaner cutscene writing** — 448 internal codes (P01, G05, etc.) replaced with real planet/item names, duplicate and typo lines cleaned up, and 59 English cutscenes localized.
- **Main hub quest badge** — an at-a-glance counter ("📜 Scenario N · 🆕 N · 🐕 N") for the current planet's quests.

## ⚔️ Combat

- **Ship role (specialization) system** — 51 ships now have Defense / Attack / Transport / Versatile roles for deeper tactics.
- **Loot scales with Reputation** — higher reputation means more spoils after battle (from ~10 up to ~100 items).
- **Combat stability** — fixed the "battle won't start after the message" bug and other entry errors with multiple safety nets.
- **No fleeing mid-battle** — you can no longer jump to another planet during combat (normal retreat paths remain).
- **More varied pirate encounters** — pirate fights now pull from a dedicated character-image pool for visual variety.

## 🚀 Fleet & Shipyard

- **HD ship art** — all 69 ships unified at 1024×1024 high resolution (desktop-first).
- **Max 8 of the same ship** — a cap for fleet diversity, with in-game guidance from Baekgu.
- **Major shipyard UI overhaul** — larger ship images, vertical layouts, and no more cut-off text.
- **Codex parts guide** — the real effects of Laser, Missile, Shield, Armor, Engine, and Special Cargo are now summarized at the top of the Codex.

## ⚖️ Balance

- **Toll-spike bug fixed** — tolls that ballooned when you owned mythic fleets are now clamped to a sensible range (~7k–28k).
- **Capture rate reduced by 50%** — enemy ship capture difficulty re-tuned.
- **Earth Resistance ships buffed** — F06 small/medium/large stats ×1.2 (reinforcing their durability theme).
- **Void Energy (VE) inflation eased** — combat/quest VE rewards adjusted.

## 🎨 UI / UX & Quality of Life

- Reward popups now show real ship / part / blueprint art.
- Added a main-menu Quit button, refreshed app icon, HUD credit icon, and more.
- Removed non-functional cloud/email/feedback and duplicate settings buttons.
- Korean/English text pass (i18n).

## 🐛 Bug Fixes & Stability

- **[Important] Hero quest reward not granted — fixed** — a critical bug where an already-recruited hero's quest rewards (credits, VE, items) vanished.
- Cutscenes/quests now reliably appear on game start and planet arrival (fixed delays and mis-spawns).
- Resolved cutscene race conditions and several memory leaks to prevent slowdown in long sessions.

## 🛠️ Under the Hood

- Split the large single code file into feature modules for better stability and maintainability.
- Versioning automation plus a Windows / macOS / Linux three-OS build pipeline.

---

**Supported platforms:** Windows · macOS (Intel / Apple Silicon) · Linux
Thanks for playing — feedback is always welcome! 🐕🚀

---

### (Short version — for store / social posts)

Destination Earth's big update is here! First-encounter cutscenes for all 8 legendary heroes and the complete Phase 1–6 main scenario, a combat overhaul with ship roles and reputation-based loot, HD ship art and a reworked shipyard UI, toll/balance tuning, and major stabilization including the hero-quest reward fix — 146 versions of changes in one drop. (Windows · macOS · Linux)

---
---

# 데스티네이션 어스 — 대형 업데이트 (v1.0.0-beta.188)

> 이전 빌드(beta.42)에서 **146개 버전**에 걸쳐 쌓인 대규모 업데이트를 한 번에 반영했습니다.
> 스토리·전투·함대·밸런스·UI 전반이 크게 달라졌습니다. 새 빌드를 받아 플레이해 주세요!

---

## 📖 스토리 & 시나리오 — 가장 큰 변화

- **8인 전설 영웅 첫만남 컷씬** 추가 — 이순신·장영실·광개토대왕·가가린·넬슨·아인슈타인·테슬라·마르코 폴로를 영입할 때 전용 시네마틱 연출.
- **페이즈 1~6 메인 시나리오 완성** — 출발부터 보이드 균열, 최종 엔딩까지 이어지는 전체 서사 + 컷씬 다수.
- **시나리오 퀘스트 즉시 노출** — 행성에 도착하면 시나리오·백구 NPC 퀘스트가 바로 등장합니다.
- **컷씬 1~9 순차 해금** — 대화기록 버튼으로 지난 컷씬을 언제든 다시 볼 수 있습니다.
- **컷씬 대사 정리** — 448곳의 내부 코드(P01, G05 등)를 실제 행성·아이템 이름으로 교체, 중복·오타 대사 정리, 영어 컷씬 59종 번역.
- **메인 허브 퀘스트 배지** — "📜 시나리오 N · 🆕 N · 🐕 N" 카운터로 현재 행성의 퀘스트를 한눈에.

## ⚔️ 전투 시스템

- **함선 역할(특성화) 시스템** — 51척 함선에 방어형·공격형·수송형·만능형 역할을 부여해 전술 다양성 강화.
- **전리품이 명성에 비례** — 명성이 높을수록 전투 후 특산물 획득량 증가(10개 → 최대 100개).
- **전투 안정성 강화** — "메시지 후 전투가 시작되지 않던" 버그를 포함해 전투 진입 오류를 다중 안전망으로 해결.
- **전투 중 행성 이동 차단** — 교전 중에는 다른 행성으로 도망갈 수 없습니다(정규 도주 경로는 유지).
- **해적 전투 연출 다양화** — 해적 조우 시 전용 인물 이미지 풀로 시각적 변주.

## 🚀 함대 & 정비소

- **HD 함선 이미지** — 69종 함선을 1024×1024 고해상도로 통일(데스크톱 우선).
- **같은 함선 최대 8대 한도** — 함대 다양성을 위한 보유 제한 + 백구의 안내.
- **정비소 UI 대대적 개편** — 함선 이미지 확대·세로 배치·텍스트 잘림 방지로 가독성 향상.
- **도감 파츠 가이드** — 레이저·미사일·실드·장갑·엔진·특수창고 6종의 실제 효과를 도감 상단에 정리.

## ⚖️ 밸런스 조정

- **통행료 폭증 버그 수정** — 신화 함대 보유 시 통행료가 비정상적으로 치솟던 문제를 합리적 범위(약 7천~2.8만)로 고정.
- **나포 확률 50% 감소** — 적 함선 나포 난이도 재조정.
- **지구저항군 함선 강화** — F06 소·중·대형 능력치 1.2배(회복·내구 컨셉 강화).
- **보이드 에너지(VE) 인플레이션 완화** — 전투/퀘스트 VE 보상 조정.

## 🎨 UI / UX & 편의

- 보상 팝업에 실제 함선·파츠·설계도 이미지 표시.
- 메인 메뉴 종료 버튼, 앱 아이콘 신버전, HUD 크레딧 아이콘 등 정리.
- 작동하지 않던 클라우드/이메일/피드백·중복 설정 버튼 제거.
- 한국어/영어 텍스트 재정비(i18n).

## 🐛 버그 수정 & 안정성

- **[중요] 영웅 퀘스트 보상 미지급 수정** — 이미 영입한 영웅의 퀘스트 보상(크레딧·VE·아이템)이 사라지던 치명적 버그 해결.
- 게임 시작·행성 도착 시 컷씬/퀘스트가 즉시 뜨도록 보장(지연·미스폰 해결).
- 컷씬 레이스 컨디션, 메모리 누수 다수 정리로 장시간 플레이 시 슬로다운 방지.

## 🛠️ 내부 개선

- 거대한 단일 코드 파일을 기능별 모듈로 분할해 안정성·유지보수성 향상.
- 버전 자동화 + Windows·macOS·Linux 3-OS 자동 빌드 파이프라인.

---

**지원 플랫폼:** Windows · macOS(인텔/애플실리콘) · Linux
플레이해 주셔서 감사합니다. 피드백은 언제든 환영입니다! 🐕🚀

---

### (짧은 버전 — 스토어/SNS 공지용)

데스티네이션 어스 대형 업데이트! 8인 전설 영웅 컷씬과 페이즈 1~6 메인 시나리오 완성, 함선 역할 시스템과 명성 기반 전리품 등 전투 개편, HD 함선 이미지와 정비소 UI 개선, 통행료·밸런스 조정, 영웅 퀘스트 보상 버그를 비롯한 대규모 안정화까지 — 146개 버전의 변화를 한 번에 담았습니다. (Windows·macOS·Linux 지원)
