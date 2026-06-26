# 도감 — 불멸의 거북선 (LGD01_SP / Immortal Geobukseon)

> 대상 함선: `LGD01_SP` (신화 / 특수). 설계도 3단편 완성 시 복원되는 보상 함선. 신화 거북선 LGD01의 **5배 성능**, 전투 시 **2배 크기**, 전용 이미지 `img/ships/LGD01_SP.png`.
> 작성: Cowork 콘텐츠 세션. **코드(i18n) 반영은 Coder 권한.** 아래 §4 적용안을 i18n에 넣으면 됨.

## 1. 제원 (현재 데이터 기준)
| 항목 | 값 | 비고 |
|---|---|---|
| 등급 | 신화 (특수) | `_turtleSpecial:true` |
| 내구도(HP) | 1,300,000 | 신화 거북선 LGD01의 5배 |
| 보호막(SH) | 325,000 | |
| 공격(ATT) | 1,225 | |
| 정보(INT) | 1,175 | |
| 기술(TEC) | 1,050 | |
| 충성(LOY) | 100 | 최대치 |
| 가격 | 0 (비매품) | 설계도 3단편 완성 보상, 상점 제외 |
| 전투 연출 | 본체 2배 크기 | 위용으로 적 사기 저하 |

## 2. 도감 설명 (개정안 — 카탈로그 표시용 짧은 desc)
- **KO:** `세 조각의 설계도가 하나로 모여 복원된 전설. 신화 거북선의 5배 성능 · 전투 시 2배 크기. 호위함 ATT·INT를 끌어올리고, 그 위용만으로 적을 압도한다 — 지구 해방의 상징.`
- **EN:** `The legend restored when three blueprint fragments became one. 5× the mythic Geobukseon, 2× size in battle. It lifts allied ATT·INT and overawes the enemy by its presence alone — the symbol of Earth's liberation.`

## 3. 도감 유래 (확장 lore — 상세 패널/도감 본문용, 백구 일기체)
- **KO:**
  400년 전 옛 지구의 바다를 지배했던 배. 그 배의 설계도는 봉쇄의 세월 속에 셋으로 찢겨 은하 곳곳에 흩어졌다. 천재 기술자 장영실이 잃어버린 절반을 맞추고, 저항군이 100년간 비축한 반물질을 보태고, 포지 행성 슈멜츠의 거대한 용광로가 마지막 불길을 더했다.

  세 단편이 하나로 맞물리던 순간, 검은 등껍질의 함선이 붉은 하늘 아래 다시 떠올랐다. 이순신 장군은 오래 말이 없었다. 자신이 살아생전 이끌던 배가, 이번엔 별의 바다 위에 서 있었으니까. "…이제야, 제대로 싸울 수 있겠군."

  이 배는 부서지지 않는다. 다섯 배의 내구로 적의 일제사격을 받아내고, 곁의 호위함을 끌어올리며, 그 거대한 그림자만으로 적의 대열을 흔든다. 우르사 메이저조차 이 배를 보면 떨었다 — 사람들은 그래서 이 배를 '불멸의 거북선'이라 불렀다.

- **EN:**
  The ship that once ruled the seas of old Earth, four centuries ago. Across the long blockade its blueprint was torn into three and scattered across the galaxy. The genius engineer Jang Yeong-sil fit the missing half together, the Resistance added a century's hoard of antimatter, and the great furnaces of the forge-world Schmelz lent the final fire.

  The moment the three fragments locked into one, a black-shelled ship rose again beneath a red sky. Admiral Yi Sun-sin was silent for a long while — for the ship he had once led in life now stood upon a sea of stars. "...Now, at last, I can truly fight."

  This ship does not break. It takes the enemy's full salvo on fivefold hull, lifts the escorts at its side, and shakes the enemy line by its vast shadow alone. Even Ursa Major trembled at the sight of it — and so the people called it the Immortal Geobukseon.

## 4. i18n 적용안 (Coder)
`i18n/ko.js` · `i18n/en.js` 의 기존 키 교체(짧은 desc) + 선택적으로 상세 lore 키 신설:
```
// 짧은 카탈로그 desc 교체
"ship.LGD01_SP.desc": "<§2 KO>"          // ko.js
"ship.LGD01_SP.desc": "<§2 EN>"          // en.js
// (선택) 도감 상세 패널용 lore 키 신설 — 도감이 lore 필드를 지원하도록 codex.js 확장 시
"ship.LGD01_SP.lore": "<§3 KO>"          // ko.js
"ship.LGD01_SP.lore": "<§3 EN>"          // en.js
```
- 짧은 desc만 교체하면 기존 도감/카탈로그에 즉시 반영(추가 코드 불필요).
- 상세 lore를 쓰려면 codex.js의 함선 상세 표시에 `ship.<id>.lore` 출력 추가 필요(없으면 §3은 도감 보조 문서로만 보관).
- 검증: `node scripts/verify-i18n-live.js` (텍스트 변경 시), 도감에서 LGD01_SP 표시 확인 → Director 보고.
```
