# DESTINATION EARTH — i18n Glossary (한·영 용어 통일 규칙)

이 문서는 게임 내 한·영 번역의 일관성을 보장하기 위한 단일 출처(SoT)입니다. 새 키를 `js/data/i18n_dict.js`에 추가할 때 이 표를 참고하세요.

> **원칙**
> 1. 고유명사(팩션·영웅·함선·행성)는 음역. 영어권에서 익숙한 라틴/그리스 어원은 그대로 유지.
> 2. 영문은 문장형(첫 글자 대문자)·간결체. 한국어 종결어미(다·요)는 제거.
> 3. 능력/효과는 `<Effect> <±N%>` 패턴 — 한국어 어순(`회피율+25%`)을 영어 어순(`Evasion +25%`)으로 변경.
> 4. UI 라벨은 가능한 짧게. 1~3 단어 권장.
> 5. 게임 내 약어(ATT/INT/DEF/HP/SH/TEC/LOY)는 양 언어 동일 유지.

---

## 1. Factions (팩션 7종)

| ID | 한국어 | English | 비고 |
|---|---|---|---|
| F01 | 수퍼비아 | Superbia | 라틴어 그대로 |
| F02 | 아우레우스 | Aureus | 라틴어 그대로 |
| F03 | 메카니카 | Mechanica | 라틴어 그대로 |
| F04 | 크리그 | Krieg | 독일어 "전쟁" 그대로 |
| F05 | 치크스 | Chiks | 음역(독자 종족명) |
| F06 | 지구 저항군 | Earth Resistance | |
| F07 | 보이드 | Void | |

## 2. Tier / Rarity (등급)

| 한국어 | English | 키 값 |
|---|---|---|
| 일반 | Common | `common` |
| 고급 | Uncommon | `uncommon` |
| 희귀 | Rare | `rare` |
| 영웅 | Hero | `hero` |
| 전설 ⚡ | Legend ⚡ | `legend` |
| 신화 ✦/❖ | Mythic ✦/❖ | `mythic` |
| 세트 ◈ | Set ◈ | `set` |

## 3. Ship Size (함선 크기)

| 한국어 | English |
|---|---|
| 소형 | Small |
| 중형 | Medium |
| 대형 | Large |
| 신화 | Mythic |

## 4. Crew Class (크루 클래스)

| 한국어 | English (코드 키) | 약어 |
|---|---|---|
| 파일럿 | Pilot | Pilot |
| 엔지니어 | Engineer | Eng |
| 상인 | Merchant | Merch |
| 마법사 | Mage | — |
| 저격수 | Sniper | — |
| 지휘관 | Commander | — |

## 5. Stats (능력치 약어 — 양 언어 동일)

`ATT` · `INT` · `DEF` · `HP` · `STR` · `SH`/`maxSH` · `TEC` · `LOY`

## 6. Game Entities (핵심 게임 용어)

| 한국어 | English |
|---|---|
| 함선 | Ship |
| 기함 | Flagship |
| 호위함 | Escort |
| 함대 | Fleet |
| 파츠 | Part |
| 화물 / 화물칸 | Cargo / Cargo Bay |
| 창고 (확장 슬롯) | Hold (Storage Slot) |
| 슬롯 / 칸 | Slot |
| 크루 | Crew |
| 영웅 | Hero |
| 전설 동료 | Legendary Companion |
| 행성 | Planet |
| 균열 (지대) | Rift (Zone) |
| 차원 | Dimension |
| 보이드 | Void |
| 명성 | Reputation |
| 크레딧 ₡ | Credit ₡ |
| 보이드 크리스탈 (VC) | Void Crystal (VC) |
| 보이드 에센스 (VE) | Void Essence (VE) |
| 설계도 | Blueprint |
| 정비소 | Garage |
| 제작소 | Workshop |
| 광장 | Plaza |
| 도크 | Dock |
| 경매 | Auction |

## 7. Combat / Effects (전투·효과 표현)

| 한국어 패턴 | English 패턴 |
|---|---|
| `매 턴 maxHP N% 회복` | `Restores N% maxHP per turn` |
| `회피율 +N%` | `Evasion +N%` |
| `선제 공격 확률 +N%` | `First-strike chance +N%` |
| `크루 전원 능력치 +N%` | `All crew stats +N%` |
| `수리비 -N%` | `Repair cost -N%` |
| `실드 재생 +N%` | `Shield regen +N%` |
| `광역 공격` | `AoE attack` |
| `관통 / DEF 무시` | `Penetrate / Ignores DEF` |
| `피격 반사 N%` | `Damage reflect N%` |
| `격침 시 부활` | `Revives on destruction` |
| `상점 미판매` | `Not sold in shops` |
| `퀘스트 보상 한정` | `Quest reward only` |
| `장착 함선 화물 +N칸` | `Equipped ship: +N cargo slots` |

## 8. Weapon Types (무기 카테고리)

| 한국어 | English |
|---|---|
| 무기 | Weapon |
| 레이저 | Laser |
| 미사일 | Missile |
| 캐논 / 포 | Cannon |
| 펄스 | Pulse |
| 산탄 | Scatter |
| 실드 | Shield |
| 장갑 | Armor |
| 엔진 | Engine |

## 9. Cargo / Tech Specific (창고·기술 용어)

| 한국어 | English |
|---|---|
| 컨테이너 | Container |
| 보급 박스 | Supply Crate |
| 모듈형 화물칸 | Modular Cargo Bay |
| 중력 압축 창고 | Gravity-Compression Hold |
| 생체 저장 낭 | Biotic Storage Sac |
| 황금 금고 모듈 | Gold Vault Module |
| 차원 포켓 | Dimensional Pocket |
| 양자 압축 창고 | Quantum Compression Hold |
| 통합 화물창 | Unified Cargo Hold |
| 공간 왜곡 창고 | Spatial-Distortion Hold |
| 초공간 매트릭스 | Hyperspace Matrix |
| 시공간 압축 | Spacetime Compression |

## 10. 역사 인물 (영문 표기)

| 한국어 | English |
|---|---|
| 이순신 | Yi Sun-sin |
| 장영실 | Jang Yeong-sil |
| 광개토대왕 | Gwanggaeto the Great |
| 유리 가가린 | Yuri Gagarin |
| 호레이쇼 넬슨 | Horatio Nelson |
| 알베르트 아인슈타인 | Albert Einstein |
| 니콜라 테슬라 | Nikola Tesla |
| 마르코 폴로 | Marco Polo |
| 이휘소 | Lee Hwi-soh |
| 백구 (AI 진돗개) | Baekgu (AI Jindo) |

---

## 키 명명 규칙 (요약)

```
<domain>.<id>.<field>          // 데이터 도메인: cargo, quest.crew, part, ship, planet, faction, hero
<domain>.<id>.<subfield>.<X>   // 다중 필드: heroes의 origin/found/stats/char/op 등
<section>.<key>                // UI: btn, common, settings, lang, notify, confirm 등
```

키 추가 후 `scripts/extract-i18n.js`를 재실행하여 해당 도메인 카운트가 감소했는지 확인하세요.
