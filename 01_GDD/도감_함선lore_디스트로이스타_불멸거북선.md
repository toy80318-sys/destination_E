# 탐색 도감 — 디스트로이 스타 & 불멸의 거북선 (함선 lore)

> 작성: Cowork 콘텐츠 세션. **코드(i18n) 반영은 Coder 권한.**
> 대상: `DESTROYER_STAR`(디스트로이 스타) · `LGD01_SP`(불멸의 거북선). 둘 다 SHIP_CATALOG(tier 신화)에 이미 존재해 **도감 목록에는 표시되나**, `codex.js`가 상세 본문으로 읽는 `LORE_TEXT['ship_<id>']`(= i18n `lore.ship_<id>`) 항목이 없어 **"정보 없음"으로 표시됨**. 아래 lore 키만 추가하면 도감 상세가 완성된다(코드 수정 불필요).
> 형식: 기존 함선 lore와 동일 — `🔨 제작 \n 📜 이름 유래 \n ⚔️ 강점/약점 \n 💬 한줄평`. 줄 구분은 `\n`.

## 1. 불멸의 거북선 — `lore.ship_LGD01_SP`
- 제원(참고): 신화 / HP 1,300,000 · SH 325,000 · ATT 1,225 · INT 1,175 · TEC 1,050. 설계도 3단편 완성 보상(비매품). 전투 시 2배 크기.

**KO (`i18n/ko.js`)**
```
"lore.ship_LGD01_SP": "🔨 장영실이 흩어진 설계도 세 단편을 하나로 맞추고, 저항군 반물질과 포지 행성 슈멜츠의 용광로로 완성한 '진짜' 거북선. 신화 거북선을 다섯 배로 끌어올렸다.\n📜 이름 유래: 부서지지 않는 거북선. 우르사 메이저조차 이 배를 보면 떨었기에 '불멸'이라 불렸다.\n⚔️ 강점: 신화 거북선의 5배 성능 · 전투 시 2배 크기로 출현해 위용만으로 적을 압도. 단점: 비매품 — 설계도 3단편을 모두 모아야 한다.\n💬 이순신이 살아 별의 바다를 누볐다면, 분명 이 배의 함교에 섰을 것이다. 지구 해방의 상징.",
```
**EN (`i18n/en.js`)**
```
"lore.ship_LGD01_SP": "🔨 Maker — Jang Yeong-sil fit the three scattered blueprint fragments into one and forged the 'true' Geobukseon with Resistance antimatter and the furnaces of forge-world Schmelz. Five times the mythic Geobukseon.\n📜 Origin: The Geobukseon that would not break. Even Ursa Major trembled at the sight of it — so they called it Immortal.\n⚔️ Strength: 5× the mythic Geobukseon · appears at 2× size in battle, overawing the enemy by presence alone. Weakness: not for sale — you must gather all three blueprint fragments.\n💬 Had Yi Sun-sin lived to sail the sea of stars, he would have stood on this bridge. The symbol of Earth's liberation.",
```

## 2. 디스트로이 스타 — `lore.ship_DESTROYER_STAR`
- 제원(참고): 신화 / HP 1,950,000 · SH 487,500 · ATT 612 · INT 590 · TEC 510. 메카니카(F03) 전 행성 commerce LV10 보상(비매품). 볼티움(P09) 이미지. 전투 시 거북선 1.5배 크기·체력 · 렐러티비티 2배 공격력 · 슬링샷(코어드론) 발진 + 10초마다 적 1척 즉사 레이저.

**KO (`i18n/ko.js`)**
```
"lore.ship_DESTROYER_STAR": "🔨 메카니카 전 행성을 손에 넣은 자에게만 열리는 히든 유니크. 볼티움 행성 하나를 통째로 무기화한 함선으로, 메카니카 정비 기술의 정점이다.\n📜 이름 유래: '파괴의 별' — 행성 그 자체가 함선이 되어 별을 부순다는 뜻.\n⚔️ 강점: 전투 시 거북선의 1.5배 크기·체력 · 렐러티비티 2배 공격력 · 슬링샷 코어드론 발진 + 10초마다 적 1척을 즉사시키는 절멸 레이저. 단점: 비매품 — 메카니카 전 행성 상업 레벨 10 달성 필요.\n💬 한 발 쏠 때마다 적 한 척이 사라진다. 백구는 '행성이 통째로 함선이 됐다'며 입을 다물지 못했다.",
```
**EN (`i18n/en.js`)**
```
"lore.ship_DESTROYER_STAR": "🔨 Maker — A hidden unique unlocked only for those who claim every Mechanica world. An entire planet, Voltium, weaponized into a single ship — the pinnacle of Mechanica engineering.\n📜 Origin: \"Destroy Star\" — a planet itself become a ship, shattering stars.\n⚔️ Strength: 1.5× a Geobukseon's size and HP in battle · 2× Relativity attack · launches Slingshot Core Drones · an annihilation laser that one-shots one enemy ship every 10s. Weakness: not for sale — requires commerce Lv.10 on all Mechanica worlds.\n💬 Every shot erases an enemy ship. Baekgu couldn't close his mouth: \"A whole planet became a ship.\"",
```

## 3. 짧은 카탈로그 desc (선택 — 이미 있음, 유지/미세 보강)
현재 `ship.LGD01_SP.desc`·`ship.DESTROYER_STAR.desc` 는 이미 양호. 그대로 두거나, 도감 상세(위 lore)가 충분하므로 변경 불필요.

## 4. Coder 적용
1. `i18n/ko.js`·`i18n/en.js` 에 위 `lore.ship_LGD01_SP`·`lore.ship_DESTROYER_STAR` 4개 키 추가(기존 `lore.ship_*` 블록 근처, 라인 1814 부근).
2. 코드 변경 없음 — `codex.js showCodexShipModal` 이 `lore.ship_<catalogId>` 를 자동으로 읽어 🔨/📜/⚔️/💬 4줄로 렌더.
3. 검증: `node scripts/verify-i18n-live.js` → 도감(코덱스) 신화 탭에서 두 함선 상세에 "정보 없음" 대신 4줄 lore가 표시되는지 확인 → Director 보고.
> ⚠ 두 함선은 비매품(획득 조건 충족 전)이라 도감에서 '미발견' 상태일 수 있음 — 발견(획득/조우) 후 상세가 열린다.
