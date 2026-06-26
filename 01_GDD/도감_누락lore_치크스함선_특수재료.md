# 탐색 도감 누락 lore — 치크스 함선(3) + 문명권 특수재료 R01~R08(8)

> 작성: Cowork 콘텐츠 세션. **i18n 반영은 Coder 권한.**
> 전수 점검 결과 도감 상세 lore가 없는 항목: 함선 `CHIX_S/M/L`, `DESTROYER_STAR`·`LGD01_SP`(별도 문서 `도감_함선lore_디스트로이스타_불멸거북선.md`), 특산물 `R01~R08`. 파츠는 누락 없음.
> 함선 형식 `🔨\n📜\n⚔️\n💬`, 특산물 형식 `📍\n🔨\n🛠️\n💬`. 줄 구분 `\n`. `codex.js`가 `lore.ship_<catalogId>`·`lore.comm_<id>` 를 자동 렌더 → 키만 추가하면 됨(코드 변경 없음).

## 1. 치크스 노획 함선 (lore.ship_CHIX_S/M/L)

**`lore.ship_CHIX_S` (치크스 정찰기 · 소형)**
- KO: `🔨 격추한 치크스 정찰기를 저항군 기술자들이 역설계해 재가동. 이질적 생체회로가 그대로 살아 숨 쉰다.\n📜 이름 유래: 치크스 정찰기. 곤충형 외계 함선 특유의 겹눈 센서를 그대로 단다.\n⚔️ 강점: 생체회로 덕에 매 턴 INT 회복 +10% · 화물 8칸. 단점: 장갑이 얇은 정찰용.\n💬 적의 눈을 빼앗아 우리 눈으로 쓴다. 노획의 묘미지.`
- EN: `🔨 Maker — Resistance engineers reverse-engineered a downed Chiks scout back to life. Its alien bio-circuitry still breathes.\n📜 Origin: A Chiks scout — fitted with the compound-eye sensors unique to their insectoid ships.\n⚔️ Strength: bio-circuits restore +10% INT per turn · 8 cargo. Weakness: thin scout-grade armor.\n💬 We took the enemy's eyes and made them our own. That's the joy of a good capture.`

**`lore.ship_CHIX_M` (치크스 순양함 · 중형)**
- KO: `🔨 치크스 중형 순양함을 나포해 인간용 조타계로 개조. 외계 추진부는 손대지 않고 그대로 두었다.\n📜 이름 유래: 치크스 순양함. 100년 봉쇄 함대의 주력이었던 기종.\n⚔️ 강점: 치크스 함대 상대 ATT +25%(적의 약점을 가장 잘 안다) · 화물 16칸. 단점: 치크스 외 상대엔 보너스 없음.\n💬 그들의 배로 그들을 친다 — 이보다 통쾌한 복수가 있을까.`
- EN: `🔨 Maker — A captured Chiks cruiser refitted with human helm controls; the alien drive left untouched.\n📜 Origin: A Chiks cruiser — the mainstay of the century-long blockade fleet.\n⚔️ Strength: +25% ATT vs Chiks fleets (it knows their weak points best) · 16 cargo. Weakness: no bonus against non-Chiks.\n💬 Their own ship, turned against them — is there a sweeter revenge?`

**`lore.ship_CHIX_L` (치크스 모선 · 대형)**
- KO: `🔨 치크스 모선을 통째로 나포한 대형함. 거대한 생체 격납고를 인간용 화물칸으로 개조했다.\n📜 이름 유래: 치크스 모선. 정찰대와 순양함을 토해내던 봉쇄의 거점.\n⚔️ 강점: 전투 시작 시 적 1척을 1턴 마비 · 화물 24칸. 단점: 비싸고 기동이 둔하다.\n💬 봉쇄의 심장을 빼앗아, 그 위에 우리 깃발을 꽂았다.`
- EN: `🔨 Maker — An entire Chiks mothership taken intact; its vast bio-hangar rebuilt into human cargo holds.\n📜 Origin: A Chiks mothership — the blockade hub that once spat out scouts and cruisers.\n⚔️ Strength: stuns one enemy ship for 1 turn at battle start · 24 cargo. Weakness: costly and slow to maneuver.\n💬 We seized the heart of the blockade — and planted our flag on it.`

## 2. 문명권 특수 제작 재료 (lore.comm_R01~R08)
> 모두 비매도(material·special) · 신화/전설급 제작의 핵심. 문명권별 1종.

| 키 | 이름 | 출처 |
|---|---|---|
| `lore.comm_R01` | 보이드 에너지 파편 | 보이드(F07) |
| `lore.comm_R02` | 치크스 결정석 | 치크스(F05) |
| `lore.comm_R03` | 아우레우스 태양핵 | 아우레우스(F02) |
| `lore.comm_R04` | 크리그 마그마 코어 | 크리그(F04) |
| `lore.comm_R05` | 메카니카 양자칩 | 메카니카(F03) |
| `lore.comm_R06` | 저항군 반물질 | 저항군(F06) |
| `lore.comm_R07` | 수퍼비아 중력자 | 수퍼비아(F01) |
| `lore.comm_R08` | 은하 혼돈 결정 | 은하 균열 최심부 |

**KO (`i18n/ko.js`)**
```
"lore.comm_R01": "📍 보이드 균열 행성(F07) 특산.\n🔨 균열 너머에서 새어 나온 에너지가 결정으로 굳은 파편. 가까이 두면 계기가 미쳐 날뛴다.\n🛠️ 신화·전설급 제작의 핵심 재료. 이휘소의 방정식과 결합하면 전에 없던 화력이 된다.\n💬 우주의 틈에서 흘러나온 빛. 만지면 손끝이 저릿하다.",
"lore.comm_R02": "📍 치크스 전쟁 행성(F05) 특산.\n🔨 치크스 생체 함선의 신경절이 결정화된 광물. 희미한 맥동이 멈추지 않는다.\n🛠️ 함체 강화·치크스 계열 장비 제작에 쓰인다.\n💬 적의 몸에서 나온 돌. 쓰임새를 알면 더 섬뜩하다.",
"lore.comm_R03": "📍 아우레우스 금융 행성(F02) 특산.\n🔨 인공 항성을 가둔 미니어처 코어. 아우레우스의 부와 기술이 응축돼 있다.\n🛠️ 에너지·실드 계열 고급 제작의 동력원.\n💬 별 하나를 손바닥에 올린 기분이다. 값을 매길 수 없다.",
"lore.comm_R04": "📍 크리그 화산 행성(F04) 특산.\n🔨 크리그 지각 깊은 곳에서 끓던 마그마를 냉각·압축한 코어. 아직도 속이 뜨겁다.\n🛠️ 거북선 용광로·중장갑·화염 무기 제작에 필수.\n💬 행성의 심장을 식혀 손에 쥐었다. 데지 않게 조심.",
"lore.comm_R05": "📍 메카니카 기계 행성(F03) 특산.\n🔨 메카니카의 초정밀 나노 공정으로 찍어낸 양자 연산칩. 머리카락보다 얇다.\n🛠️ 정밀 조준·항법·AI 계열 장비 제작의 두뇌.\n💬 이 작은 칩 하나에 도시 하나의 연산이 들었다.",
"lore.comm_R06": "📍 저항군 비밀 연구소(F06) 생산.\n🔨 지구 저항군이 100년간 숨어 생산한 반물질. 봉쇄를 깨기 위해 한 방울씩 모았다.\n🛠️ 거북선 완성과 최상급 무기 제작의 핵심 연료.\n💬 사람들의 100년이 이 한 병에 담겨 있다. 함부로 쓰지 마라.",
"lore.comm_R07": "📍 수퍼비아 귀족 행성(F01) 특산.\n🔨 중력이 뒤틀린 지대에서만 채취되는 중력자 결정. 무게가 손마다 다르게 느껴진다.\n🛠️ 시공·중력 계열 장비와 거북선 시공 보정 제작에 쓰인다.\n💬 무게를 속이는 돌. 귀족들이 비싸게 파는 이유가 있다.",
"lore.comm_R08": "📍 은하 균열 최심부에서만 나오는 초희귀 결정.\n🔨 일곱 문명 어디에도 속하지 않은, 혼돈 그 자체가 굳은 결정. 형태가 보는 각도마다 다르다.\n🛠️ 최종 신화급 제작의 마지막 한 조각. 이것 없이는 완성되지 않는 설계도가 있다.\n💬 은하가 부서지며 남긴 보석. 가장 깊은 어둠에서만 빛난다.",
```
**EN (`i18n/en.js`)**
```
"lore.comm_R01": "📍 Specialty of the Void rift worlds (F07).\n🔨 Energy bled from beyond the rift, hardened into crystal shards. Instruments go wild near it.\n🛠️ Core material for mythic/legendary crafting. Paired with Dr. Lee's equations, it yields firepower never seen before.\n💬 Light leaked from a crack in the universe. Touch it and your fingertips tingle.",
"lore.comm_R02": "📍 Specialty of the Chiks war worlds (F05).\n🔨 A mineral formed from the crystallized ganglia of Chiks bio-ships. A faint pulse never quite stops.\n🛠️ Used for hull reinforcement and Chiks-line equipment.\n💬 A stone from the enemy's body. Knowing its origin only makes it eerier.",
"lore.comm_R03": "📍 Specialty of the Aureus finance worlds (F02).\n🔨 A miniature core caging an artificial star — Aureus wealth and tech, condensed.\n🛠️ Power source for high-grade energy and shield crafting.\n💬 Like holding a star in your palm. You cannot put a price on it.",
"lore.comm_R04": "📍 Specialty of the Krieg volcanic worlds (F04).\n🔨 Magma boiled from deep in Krieg's crust, cooled and compressed into a core — still hot inside.\n🛠️ Essential for the Geobukseon furnace, heavy armor, and flame weapons.\n💬 We cooled a planet's heart and held it. Mind you don't get burned.",
"lore.comm_R05": "📍 Specialty of the Mechanica machine worlds (F03).\n🔨 A quantum compute chip stamped by Mechanica's ultra-fine nano process — thinner than a hair.\n🛠️ The brain for precision targeting, navigation, and AI equipment.\n💬 A whole city's computation packed into this tiny chip.",
"lore.comm_R06": "📍 Produced in the Resistance's secret labs (F06).\n🔨 Antimatter the Earth Resistance hid and produced for a century — gathered drop by drop to break the blockade.\n🛠️ The core fuel for completing the Geobukseon and top-tier weapons.\n💬 A hundred years of people's hope, in one vial. Don't waste it.",
"lore.comm_R07": "📍 Specialty of the Superbia noble worlds (F01).\n🔨 Graviton crystals harvested only in gravity-warped zones — their weight feels different in every hand.\n🛠️ Used for spacetime/gravity equipment and the Geobukseon's spacetime calibration.\n💬 A stone that lies about its weight. No wonder the nobles sell it dear.",
"lore.comm_R08": "📍 An ultra-rare crystal found only in the deepest galactic rift.\n🔨 Belonging to none of the seven civilizations — chaos itself, crystallized. Its shape shifts with every angle.\n🛠️ The final piece of end-game mythic crafting. Some blueprints cannot complete without it.\n💬 A gem left as the galaxy shattered. It shines only in the deepest dark.",
```

## 3. Coder 적용
1. `i18n/ko.js`·`i18n/en.js` 에 위 `lore.ship_CHIX_S/M/L`(3) + `lore.comm_R01~R08`(8) 키 추가. (DESTROYER_STAR·LGD01_SP 2종은 `도감_함선lore_디스트로이스타_불멸거북선.md` 참조 — 합쳐 총 13개 lore 키.)
2. 코드 변경 없음 — codex가 자동 렌더.
3. 검증: `node scripts/verify-i18n-live.js` → 도감 함선(치크스 3종)·특산물(R01~R08) 상세에 lore가 뜨는지 확인 → Director 보고.
