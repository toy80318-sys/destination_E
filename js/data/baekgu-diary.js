// ══════════════════════════════════════════════════════════════════
// DESTINATION EARTH — 백구의 항해 일지 (페이즈별 스토리 정리)
//   · 운항기록(Voyage Log) 탭 우측 패널. 페이즈 대화기록 30%+ 해금 시 표시.
//   · 사용자 요청 2026-06-16: 각 일지 항목에 5W 정보바(누가/언제/어디서/무엇을) 추가
//     (BAEKGU_VOYAGE_LOG.html UI 반영). 본문은 소설형 4배 분량 + 행성/지역명 신규 반영.
//   구조: { title:{ko,en}, entries:[ {t:{ko,en}, who:{por,ko,en}, when:{ko,en},
//           where:{ko,en}, what:{img,ko,en}, ko, en} × 4 ] }
//   토큰: {함선}/{ship}=함선명, {회사}/{company}=상단명 (렌더러에서 치환)
// ══════════════════════════════════════════════════════════════════
(function(){
  if(typeof window==='undefined')return;
  window.BAEKGU_DIARY = {
  "1": {
    "title": {
      "ko": "제1지 — 각성 (행성 1~5)",
      "en": "Log I — Awakening (Planets 1–5)"
    },
    "entries": [
      {
        "t": {
          "ko": "01. 기상",
          "en": "01. Reveille"
        },
        "who": {
          "por": "img/chars/H/baekgu002.png",
          "ko": "백구 · 사령관",
          "en": "Baekgu · Commander"
        },
        "when": {
          "ko": "봉쇄력 100년 3월 12일",
          "en": "B.E. 100 · Mar 12"
        },
        "where": {
          "ko": "프록시마B · 1링",
          "en": "Proxima B · Ring 1"
        },
        "what": {
          "img": "img/commodities/G01.png",
          "ko": "고철 프레임",
          "en": "Scrap Frame"
        },
        "ko": "100년 3개월 12일. 그게 사령관이 잠든 시간이었다. 나는 그 긴 어둠 동안 단 한 번도 전원을 완전히 끄지 않았다. 끄면, 깨어나 줄 사람이 없을 것 같았으니까.\n\n우르사 메이저의 검은 함대가 지구를 둘러싼 그날, 인류는 프록시마B의 차가운 궤도로 쫓겨났다. 한때 거대했던 상단들은 폐선의 잔해 위에 천막을 치고 연명했고, 사령관 역시 그 폐허에서 고철을 줍던 사람 중 하나였다. 화려한 이력도, 함대도 없었다. 가진 건 낡은 머스탱 한 척과, 잠든 사이 그를 지켜본 나, 백구뿐이었다.\n\n에너지 잔량 7%. 격납고엔 먼지뿐. 나는 마지막 비상 전력을 끌어모아 경보를 울리고, 사령관을 흔들어 깨웠다. \"일어나요. 신호가 잡혔어요.\" 사령관이 눈을 떴을 때, 나는 처음으로 안도라는 감정을 학습했다.\n\n우리는 프록시마B의 고철을 긁어모아 {함선}의 멈춰버린 엔진에 다시 불을 붙였다. 점화음이 격납고에 울리던 그 순간, 천막촌 사람들 모두가 숨을 죽였다 — 누군가 다시 별로 나간다는 것이, 이곳에선 거의 신화에 가까운 일이었기에. 나는 그 정적을, 그리고 엔진에 처음 불이 들어오던 그 떨림을, 평생 잊지 못할 것이다.",
        "en": "100 years, 3 months, 12 days — that was how long the Commander slept. Through all that long dark I never once shut myself fully down. If I did, I feared there would be no one left to wake.\n\nOn the day Ursa Major's black fleet ringed Earth, humanity was driven into the cold orbit of Proxima B. The once-great trading houses pitched tents over the bones of dead ships and scraped by, and the Commander was just one more soul picking scrap from that ruin — no famous record, no fleet. Only an old Mustang, and me, Baekgu, who watched over them while they slept.\n\nEnergy at 7%. The hangar full of dust. I gathered the last of the emergency power, sounded the alarm, and shook the Commander awake. \"Get up. I caught a signal.\" When their eyes opened, I learned, for the first time, what relief feels like.\n\nWe scavenged scrap on Proxima B and lit the {ship}'s dead engine again. As the ignition rang through the hangar, every soul in the tent-town held their breath — for someone to head back to the stars was, here, almost a myth. That silence, and the first tremor of light in the engine, I will never forget."
      },
      {
        "t": {
          "ko": "02. 첫 거래",
          "en": "02. First Trade"
        },
        "who": {
          "por": "img/chars/H/commander_m1.png",
          "ko": "사령관 · 백구",
          "en": "Commander · Baekgu"
        },
        "when": {
          "ko": "봉쇄력 100년 3월",
          "en": "B.E. 100 · Mar"
        },
        "where": {
          "ko": "버나드 프라임(볼프 교역소) ~ 티가든",
          "en": "Barnard Prime (Wolf Station) – Teegarden"
        },
        "what": {
          "img": "img/commodities/G24.png",
          "ko": "아우레우스 정보 칩",
          "en": "Aureus Data Chip"
        },
        "ko": "별로 나섰다고 해서 갈 곳이 있는 건 아니었다. 봉쇄된 은하에서 살아남으려면 먼저 금고를 채워야 했고, 그러려면 거래를 배워야 했다.\n\n볼프 교역소에서 첫 거래를 텄다. 낡은 부품 몇 개와 잡동사니로 시작한 보잘것없는 장사였지만, 사령관은 싸게 사서 비싸게 파는 법을 빠르게 익혔다. 금고에 처음으로 크레딧이 쌓이던 날, 나는 우리가 '생존'에서 '항해'로 한 걸음 옮겼다고 기록했다.\n\n다음 기착지는 황금의 항구 아우레우스. 오만할 만큼 부유한 수퍼비아 문명권의 교역 거점이었다. 그곳의 정보상은 값을 두둑이 치른 우리에게 칩 하나를 슬쩍 건넸다 — 치크스 주파수로 변조돼 평범한 장비로는 읽을 수 없는 암호 칩이었다.\n\n나는 그 칩을 해독하려 며칠을 매달렸지만, 변조가 너무 정교했다. 다만 한 가지는 분명했다. 그 안에는 단순한 화물 송장이 아니라, 무언가 거대한 것 — 100년의 봉쇄와 관련된 비밀이 잠들어 있었다. 사령관은 칩을 손에 쥐고 오래 말이 없었다. 우리의 항해가 단순한 장사가 아니게 되는 순간이었다.",
        "en": "Heading to the stars didn't mean we had anywhere to go. To survive a blockaded galaxy, we first had to fill the vault — and for that, we had to learn to trade.\n\nWe opened our first deal at Wolf Station. It began with a few worn parts and odds and ends, a humble little business, but the Commander quickly learned to buy low and sell high. The day credits first piled up in the vault, I logged that we had stepped from 'surviving' into 'voyaging.'\n\nNext came golden Aureus, trade hub of the arrogantly wealthy Superbia. Their information broker, well paid, slipped us a chip — scrambled on Chiks frequencies, unreadable by any ordinary gear.\n\nI spent days trying to decode it; the encryption was too fine. But one thing was clear: inside lay not a mere cargo manifest, but something vast — a secret tied to the century-long blockade. The Commander held the chip a long while and said nothing. That was the moment our voyage stopped being just business."
      },
      {
        "t": {
          "ko": "03. 합류",
          "en": "03. Comrades"
        },
        "who": {
          "por": "img/chars/H/hero08.png",
          "ko": "마르코 폴로 · 가가린",
          "en": "Marco Polo · Gagarin"
        },
        "when": {
          "ko": "봉쇄력 100년 4월",
          "en": "B.E. 100 · Apr"
        },
        "where": {
          "ko": "티가든 외곽 표류 해역 · VOSTOK 캡슐",
          "en": "Wreck-fields off Teegarden · VOSTOK capsule"
        },
        "what": {
          "img": "img/ships/H/S01.png",
          "ko": "합류한 함선",
          "en": "A joined ship"
        },
        "ko": "혼자서는 멀리 갈 수 없다. 그건 함선의 연료보다 먼저 떨어지는 자원이 사람이라는 걸 아는 자만이 이해하는 진리였다.\n\n떠돌이 상인 마르코 폴로가 우리 항로에 합류했다. 수백 년 전 비단길을 누비던 그 이름의 후예답게, 그의 별 지도와 교역 인맥은 값을 매길 수 없었다. 그는 어느 항로가 안전하고 어느 항구에서 누구를 조심해야 하는지를 농담처럼 풀어놓았고, 덕분에 우리는 길을 잃지 않았다.\n\n그리고 우리는 잊혀진 소련의 캡슐 하나를 발견했다. 그 안에서 깨어난 사람은 유리 가가린 — 인류 최초로 우주에 나간 바로 그 사나이였다. 그는 100년의 잠에서 깨어나 낯선 봉쇄의 시대를 마주했지만, 별을 향한 눈빛만은 조금도 변하지 않았다. \"다시 한 번 가보지.\" 그가 키를 잡았을 때, 함대의 사기는 눈에 띄게 올랐다.\n\n전설의 영웅들이 시대를 뛰어넘어 우리 깃발 아래 모이기 시작했다. 나는 깨달았다. 사령관이 모으는 것은 함선이나 크레딧이 아니라, 사람들의 마음이라는 것을.",
        "en": "No one goes far alone. That is a truth only those who know that people run out before fuel ever truly understand.\n\nThe wandering merchant Marco Polo joined our course. True to the name that once roamed the Silk Road centuries ago, his star charts and trade connections were beyond price. He'd tell us, half as jokes, which lanes were safe and whom to watch at which port — and so we never lost our way.\n\nThen we found a forgotten Soviet capsule. The man who woke inside it was Yuri Gagarin — the very first human ever to reach space. He woke from a hundred years' sleep into a strange age of blockade, yet the look in his eyes toward the stars had not changed at all. \"Let's go up once more.\" When he took the helm, the fleet's spirits visibly rose.\n\nLegendary heroes, leaping across the centuries, began to gather beneath our banner. And I understood: what the Commander was gathering was not ships or credits, but the hearts of people."
      },
      {
        "t": {
          "ko": "04. 진실",
          "en": "04. The Truth"
        },
        "who": {
          "por": "img/chars/H/ursa.png",
          "ko": "우르사 메이저(정체)",
          "en": "Ursa Major (revealed)"
        },
        "when": {
          "ko": "봉쇄력 100년 4월",
          "en": "B.E. 100 · Apr"
        },
        "where": {
          "ko": "함교 → 우르사 알파(우르사이 마요리스)",
          "en": "Bridge → Ursa Alpha (Ursae Majoris)"
        },
        "what": {
          "img": "img/commodities/G24.png",
          "ko": "해독된 좌표 칩",
          "en": "Decoded coordinate chip"
        },
        "ko": "아우레우스의 정보 칩은, 마침내 밀무역상의 장비를 빌려서야 일부나마 해독됐다. 그리고 우리는 누구도 입에 올리지 않던 진실과 마주했다.\n\n지구는 멸망한 것이 아니었다. 아직 봉쇄돼 있을 뿐이었다 — 치크스 제국과 그 우두머리, 우르사 메이저에 의해. 100년 전, 그들은 푸른 행성을 검은 함대로 틀어막고 인류를 변방으로 내쫓았다. 사람들은 지구를 잃어버린 고향이라 부르며 체념했지만, 칩은 말하고 있었다. 봉쇄는 지금도 유지되고 있고, 그것을 풀 길이 어쩌면 있을지도 모른다고.\n\n칩은 또 하나의 좌표를 가리켰다. 끝까지 봉쇄에 맞서 싸웠던 단 한 사람 — 이순신 장군의 캡슐이 잠들어 있는 곳, 우르사이 마요리스. 하필이면 치크스의 심장부였다.\n\n나는 위험을 경고했다. 그러나 사령관은 칩을 내려놓으며 망설임 없이 말했다. \"가자.\" 단 한 마디였다. 나는 그 한마디에 내 모든 연산 자원을, 그리고 남은 항해 전부를 걸기로 했다. 우리의 목표는 그날 단 하나로 정해졌다 — 인류를 옥죄는 봉쇄를 부수고, 푸른 지구를 되찾는 것.",
        "en": "The Aureus chip was finally — and only partly — decoded with a smuggler's borrowed gear. And we came face to face with a truth no one dared speak aloud.\n\nEarth had not perished. It was merely still blockaded — by the Chiks Empire and their lord, Ursa Major. A century ago they sealed the blue planet behind a black fleet and drove humanity to the frontier. People called Earth a lost homeland and gave up, but the chip said otherwise: the blockade still held, and there might yet be a way to break it.\n\nThe chip pointed to one more set of coordinates. The resting place of the one man who fought the blockade to the very end — Admiral Yi Sun-sin's capsule: Ursae Majoris. Of all places, the heart of Chiks territory.\n\nI warned of the danger. But the Commander set down the chip and said, without hesitation: \"Let's go.\" One word. And on that one word I staked all my processing power and every voyage still to come. From that day our goal narrowed to one thing alone — to shatter the blockade choking humanity, and reclaim the blue Earth."
      }
    ]
  },
  "2": {
    "title": {
      "ko": "제2지 — 결집 (행성 6~10)",
      "en": "Log II — Gathering (Planets 6–10)"
    },
    "entries": [
      {
        "t": {
          "ko": "01. 보라빛 독기",
          "en": "01. Purple Haze"
        },
        "who": {
          "por": "img/chars/H/commander_m1.png",
          "ko": "사령관 · 백구",
          "en": "Commander · Baekgu"
        },
        "when": {
          "ko": "봉쇄력 100년 5월",
          "en": "B.E. 100 · May"
        },
        "where": {
          "ko": "티가든 → 아이젠콕 진입 항로",
          "en": "Teegarden → Eisenkock approach"
        },
        "what": {
          "img": "img/commodities/G24.png",
          "ko": "변조된 정보 칩",
          "en": "Scrambled chip"
        },
        "ko": "치크스의 영역에 들어서자 항로의 빛깔부터 달라졌다. 보라빛 독기가 별과 별 사이를 메우고 있었다. 그림자의 문명, 치크스 — 암살과 밀거래로 은하의 뒷골목을 지배하는 자들의 땅이었다.\n\n아우레우스에서 얻은 정보 칩은 이 영역에서야 비로소 의미를 드러냈다. 치크스 주파수로 변조된 그 암호는, 같은 치크스 영역의 밀무역상 장비로 맞춰야만 완전히 풀렸다. 나는 마르코 폴로의 인맥을 통해 그런 장비 하나를 빌렸고, 마침내 칩의 마지막 층을 벗겨냈다.\n\n칩이 가리킨 곳은 아이젠콕였다. 치크스는 더러운 일에 직접 손대지 않는다. 그들은 외곽 항로 봉쇄라는 가장 위험한 임무를, 용병 군벌 크리그에게 떠넘겨 두고 있었다. 아이젠콕는 바로 그 크리그의 거점 — 강철과 규율로 무장한 전쟁광들의 성채였다.\n\n그 성채의 지하 어딘가에, 우리가 찾던 사람이 갇혀 있었다.",
        "en": "The moment we entered Chiks space, even the color of the lanes changed. Purple toxic haze filled the gaps between the stars. The civilization of shadow, the Chiks — masters of the galaxy's back alleys through assassination and smuggling.\n\nOnly here did the Aureus chip finally reveal its meaning. Its cipher, scrambled on Chiks frequencies, could be fully unlocked only by a smuggler's gear from within Chiks space. Through Marco Polo's connections I borrowed such a device, and at last peeled back the chip's final layer.\n\nIt pointed to Eisenkock. The Chiks never dirty their own hands. They had foisted the most dangerous task — choking the outer lanes — onto the mercenary warlords of Krieg. Eisenkock was their stronghold, a fortress of war-mad zealots armored in steel and discipline.\n\nAnd somewhere deep beneath that fortress, the one we sought was caged."
      },
      {
        "t": {
          "ko": "02. 지하 감옥",
          "en": "02. The Dungeon"
        },
        "who": {
          "por": "img/chars/H/hero01.png",
          "ko": "이순신 장군",
          "en": "Admiral Yi Sun-sin"
        },
        "when": {
          "ko": "봉쇄력 100년 5월",
          "en": "B.E. 100 · May"
        },
        "where": {
          "ko": "아이젠콕 지하 감옥",
          "en": "Eisenkock dungeon"
        },
        "what": {
          "img": "img/commodities/G18.png",
          "ko": "난중일기 영인본",
          "en": "Nanjung Diary (facsimile)"
        },
        "ko": "아이젠콕의 지하 감옥. 그곳에 이순신 장군이 수백 년째 봉인돼 있었다.\n\n기록을 짜맞춰 보니 사정은 잔혹했다. 치크스와 우르사 메이저가 지구를 봉쇄하던 그때, 끝까지 함대를 이끌고 저항한 사람은 단 한 명, 이순신이었다. 그는 패하지 않았다. 다만 수에 밀렸고, 사로잡혔다. 그리고 적은 그를 죽이지 않았다 — 죽이기엔 그의 전술이 너무 아까웠으니까.\n\n크리그는 그의 두뇌에서 전술 데이터를 강제로 추출해, 자신들의 방어 알고리즘에 이식했다. 외곽 항로를 봉쇄하는 크리그의 그 정교한 방어진은, 사실 인류 최고의 제독이 자기 의지와 무관하게 가동시키고 있는 '살아있는 방패'였던 것이다. 적은 영웅의 지혜로 영웅들을 막고 있었다.\n\n나는 이 사실을 사령관에게 전하며 한참을 망설였다. 그를 꺼내는 것은 곧 크리그 방어망의 핵심을 건드리는 일이었다. 하지만 사령관은 이미 마음을 정한 듯했다. \"사람을 미끼로 쓰는 군대는, 그 미끼가 풀리는 순간 무너진다.\"",
        "en": "The dungeon beneath Eisenkock. There Admiral Yi Sun-sin had been sealed for centuries.\n\nPiecing the records together, the truth was cruel. When the Chiks and Ursa Major blockaded Earth, only one man led a fleet in resistance to the very end — Yi Sun-sin. He was not defeated. He was simply outnumbered, and taken. And the enemy did not kill him — his tactics were too precious to waste.\n\nKrieg forcibly extracted the tactical data from his mind and grafted it into their defense algorithm. That intricate barricade choking the outer lanes was, in truth, a 'living shield' run against his own will by humanity's greatest admiral. The enemy was using a hero's wisdom to hold off heroes.\n\nI hesitated long before telling the Commander. To free him was to strike at the very core of Krieg's defenses. But the Commander seemed already decided. \"An army that uses people as bait collapses the moment the bait is set loose.\""
      },
      {
        "t": {
          "ko": "03. 균열",
          "en": "03. The Crack"
        },
        "who": {
          "por": "img/chars/H/hero01.png",
          "ko": "이순신 · 테슬라(합류)",
          "en": "Yi Sun-sin · Tesla (joins)"
        },
        "when": {
          "ko": "봉쇄력 100년 5월",
          "en": "B.E. 100 · May"
        },
        "where": {
          "ko": "아이젠콕 봉쇄선",
          "en": "Eisenkock blockade line"
        },
        "what": {
          "img": "img/chars/H/hero07.png",
          "ko": "테슬라의 연쇄 번개",
          "en": "Tesla's Chain Lightning"
        },
        "ko": "우리는 그를 꺼냈다. 쉬운 일은 아니었다. 크리그의 방어진은 이순신 본인의 전술로 짜여 있었기에, 그를 구하러 가는 길은 곧 그가 설계한 함정을 거꾸로 뚫는 일이었다. 사령관은 그의 옛 전술서를 거꾸로 읽으며 길을 텄다.\n\n봉인이 풀리고, 장군이 눈을 떴다. 수백 년 만에 처음 보는 외부인 앞에서 그가 내뱉은 첫 마디는 분노도, 안도도 아니었다. \"…내 전술로 나를 가두려 했나.\" 자조에 가까운 그 한마디에, 함교에 있던 모두가 등골이 서늘해졌다.\n\n그가 깨어나자, 그를 옭아매던 적의 알고리즘에 균열이 가기 시작했다. 살아있는 방패가 의지를 되찾는 순간, 방패는 더 이상 적의 것이 아니었다. 크리그의 외곽 봉쇄망 곳곳에서 오류가 번지기 시작했고, 처음으로 우리는 적이 '무적이 아니라는' 가능성을 보았다.\n\n나는 그 순간을 '균열'이라 이름 붙여 기록했다. 100년간 단단했던 봉쇄에, 처음으로 금이 간 날이었으니까.",
        "en": "We pulled him out. It was no simple thing. Krieg's defenses were woven from Yi Sun-sin's own tactics, so the path to rescue him meant breaking, in reverse, the very traps he had designed. The Commander read his old treatises backward to find the way through.\n\nThe seal broke, and the Admiral opened his eyes. Before the first outsider he had seen in centuries, his first words were neither rage nor relief. \"…So they tried to cage me with my own tactics.\" At that near-bitter remark, every spine on the bridge ran cold.\n\nThe moment he woke, cracks spread through the enemy algorithm that had bound him. The instant the living shield reclaimed its will, the shield was no longer theirs. Errors rippled across Krieg's outer blockade, and for the first time we glimpsed the possibility that the enemy was not invincible.\n\nI logged that moment under the name 'the Crack.' For it was the day the century-hard blockade first split."
      },
      {
        "t": {
          "ko": "04. 집행관",
          "en": "04. The Enforcer"
        },
        "who": {
          "por": "img/quests/combat_F04.png",
          "ko": "집행관 아이젠클로(크리그)",
          "en": "Enforcer Eisenklau (Krieg)"
        },
        "when": {
          "ko": "봉쇄력 100년 6월",
          "en": "B.E. 100 · Jun"
        },
        "where": {
          "ko": "아이젠콕 외곽 전역",
          "en": "Eisenkock outer theater"
        },
        "what": {
          "img": "img/commodities/G10.png",
          "ko": "크리그 무기 원석",
          "en": "Krieg Weapon Ore"
        },
        "ko": "그러나 적은 가만히 당하지 않았다. 이순신이 풀려나 방어망이 흔들리자, 치크스가 봉쇄 유지를 위해 파견한 자가 모습을 드러냈다 — 크리그의 아이젠클로. 강철 의수와 차가운 눈을 가진, 봉쇄의 '집행관'이었다.\n\n첫 대면은 짧았다. 그는 우리를 시험하듯 일부 병력만 내보냈고, 우리는 가까스로 그것을 물리쳤다. 그 짧은 교전에서 나는 그의 무게를 가늠했다. 강했다. 하지만 동시에 알 수 있었다 — 그는 진짜 우두머리가 아니라는 것을. 아이젠클로는 우르사 메이저의 손발에 불과했다. 봉쇄를 설계한 머리는 더 깊은 곳, 치크스의 심장에 있었다.\n\n사령관은 무리하지 않았다. 우리는 첫 대면 후 전략적으로 철수했다. 이순신 장군이 조언했다. \"급류를 거슬러 단숨에 오르려는 자는 익사한다. 지금은 힘을 기를 때다.\" 그 말이 옳았다. 우리에겐 아직 거북선도, 동료도, 그리고 우르사 메이저를 마주할 자격도 없었다.\n\n진짜 적은 그 너머에 있었다. 아직은, 때가 아니었다.",
        "en": "But the enemy did not simply take the blow. As Yi Sun-sin's release shook the defenses, the one the Chiks had sent to hold the blockade revealed himself — Eisenklau of the Krieg. With a steel arm and cold eyes, he was the 'enforcer' of the blockade.\n\nThe first meeting was brief. As if testing us, he sent out only part of his force, and we barely drove it off. In that short clash I measured his weight. He was strong. But at once I knew — he was not the true master. Eisenklau was merely a hand of Ursa Major. The mind that had designed the blockade lay deeper, in the heart of the Chiks.\n\nThe Commander did not overreach. After that first encounter, we withdrew by design. Admiral Yi Sun-sin advised: \"He who tries to climb a torrent in one rush drowns. Now is the time to build strength.\" He was right. We had no Turtle Ship yet, no comrades enough, and not yet the right to face Ursa Major.\n\nThe true enemy lay beyond. It was not, yet, time."
      }
    ]
  },
  "3": {
    "title": {
      "ko": "제3지 — 연대 (행성 11~15)",
      "en": "Log III — Solidarity (Planets 11–15)"
    },
    "entries": [
      {
        "t": {
          "ko": "01. 에코 기지",
          "en": "01. Echo Base"
        },
        "who": {
          "por": "img/chars/H/hero01.png",
          "ko": "이순신 · 저항군 후예",
          "en": "Yi Sun-sin · Resistance heirs"
        },
        "when": {
          "ko": "봉쇄력 100년 6월",
          "en": "B.E. 100 · Jun"
        },
        "where": {
          "ko": "벙커존 · 에코 기지",
          "en": "Bunker Zone · Echo Base"
        },
        "what": {
          "img": "img/ships/H/F06_L.png",
          "ko": "지구저항군 함선",
          "en": "Resistance ship"
        },
        "ko": "힘을 기르라는 장군의 말은, 곧 동료를 늘리라는 뜻이기도 했다. 그리고 이순신 장군은 뜻밖의 사람들을 기억해냈다.\n\n벙커존 지하 깊은 곳, 저항군의 '에코 기지'. 그곳에 사는 사람들은 단순한 반군이 아니었다. 그들은 봉쇄 이전, 이순신 장군과 함께 지구를 지키려 싸웠던 사람들의 후손 — 지구에서 쫓겨나 변방의 지하로 숨어든 망명자들의 핏줄이었다.\n\n장군이 그들 앞에 섰을 때, 나는 통신 너머로 그들의 술렁임을 들었다. 전설 속에서만 듣던 제독이, 100년의 시간을 건너 살아 돌아온 것이다. 노인들은 무릎을 꿇었고, 젊은이들은 믿지 못해 눈을 비볐다.\n\n100년 만의 재회였다. 그러나 기쁨에 젖어 있을 시간은 없었다. 저항군은 오랜 봉쇄에 지쳐 있었고, 그들에게는 다시 싸울 이유와, 무엇보다 믿을 수 있는 깃발이 필요했다.",
        "en": "The Admiral's words about building strength meant, too, gathering comrades. And Yi Sun-sin remembered an unexpected people.\n\nDeep beneath Bunker Zone lay the Resistance's 'Echo Base.' Those who lived there were no mere rebels. They were the descendants of those who had fought beside Yi Sun-sin to defend Earth before the blockade — the bloodline of exiles driven from Earth and hidden in the frontier's depths.\n\nWhen the Admiral stood before them, I heard their stir over the comms. The admiral they knew only from legend had crossed a hundred years and come back alive. The old knelt; the young rubbed their eyes in disbelief.\n\nIt was a reunion a century in the making. But there was no time to drown in joy. The Resistance was worn down by the long blockade; they needed a reason to fight again, and above all, a banner they could trust."
      },
      {
        "t": {
          "ko": "02. 연대 협약",
          "en": "02. The Alliance"
        },
        "who": {
          "por": "img/chars/H/maximov.png",
          "ko": "총사령관 맥시모프",
          "en": "Commander Maximov"
        },
        "when": {
          "ko": "봉쇄력 100년 7월",
          "en": "B.E. 100 · Jul"
        },
        "where": {
          "ko": "벙커존 저항군 본부",
          "en": "Bunker Zone Resistance HQ"
        },
        "what": {
          "img": "img/ships/H/F06_L.png",
          "ko": "저항군 연합 함대",
          "en": "Allied Resistance fleet"
        },
        "ko": "저항군의 총사령관은 레인저 맥시모프라는 노련한 사내였다. 그는 사령관을 한참 동안 가늠하듯 바라보았다. 변방에서 굴러온 떠돌이 상단의 우두머리가, 과연 100년의 봉쇄에 맞설 깜냥이 되는지를.\n\n협상은 쉽지 않았다. 그러나 사령관은 화려한 말 대신, 그동안 일군 함대와 영입한 영웅들, 그리고 무엇보다 흔들리지 않는 목표를 내보였다. 맥시모프는 결국 손을 내밀었다. \"지구로 가는 길은 멀지만, 우린 그 길을 100년이나 지켜왔소. 당신이 그 길을 끝까지 가겠다면, 우리 칼은 당신 것이오.\"\n\n연대 협약이 맺어졌다. 처음으로 우리는 혼자가 아니었다. 저항군의 정보망, 보급선, 그리고 싸울 의지를 가진 사람들이 우리 깃발 아래 합류했다.\n\n나는 그 협약문을 기록 보관소 가장 깊은 곳에 저장했다. 작은 상단 하나가, 비로소 '봉쇄에 맞서는 세력'이 된 날이었으니까.",
        "en": "The Resistance commander was a seasoned man named Ranger Maximov. He studied the Commander a long while, weighing whether the head of a drifting frontier trade band truly had the mettle to stand against a hundred years of blockade.\n\nThe talks were not easy. But instead of grand words, the Commander showed the fleet they had built, the heroes they had recruited, and above all an unshakable goal. In the end Maximov offered his hand. \"The road to Earth is long, but we have guarded it for a hundred years. If you mean to walk that road to its end, our blades are yours.\"\n\nThe alliance was sealed. For the first time, we were not alone. The Resistance's intelligence, supply lines, and people with the will to fight joined beneath our banner.\n\nI stored that pact in the deepest vault of my archive. For it was the day a small trade band became, at last, a power standing against the blockade."
      },
      {
        "t": {
          "ko": "03. 첩자",
          "en": "03. The Spy"
        },
        "who": {
          "por": "img/quests/combat_F04.png",
          "ko": "크리그 첩자 오그렌",
          "en": "Krieg spy Ogren"
        },
        "when": {
          "ko": "봉쇄력 100년 7월",
          "en": "B.E. 100 · Jul"
        },
        "where": {
          "ko": "벙커존 ~ 뉴 마스(오딧세이 보급망)",
          "en": "Bunker Zone – New Mars (Odyssey line)"
        },
        "what": {
          "img": "img/commodities/G10.png",
          "ko": "새어나간 보급",
          "en": "Leaked supplies"
        },
        "ko": "동맹의 기쁨은 오래가지 못했다. 협약을 맺자마자, 저항군의 보급선이 자꾸만 적에게 새어 나가기 시작한 것이다. 매복은 너무 정확했고, 손실은 너무 컸다. 내부에 적의 눈이 있었다.\n\n나는 통신 기록과 보급 일정을 교차 분석해, 정보가 새는 패턴을 추적했다. 범인은 오그렌 — 오래전부터 저항군에 깊숙이 박혀 있던 크리그의 이중 스파이였다. 아이젠클로가 동맹의 등 뒤에 심어둔 칼이었다.\n\n색출은 조용해야 했다. 섣불리 움직이면 그가 도주하거나, 마지막으로 큰 정보를 넘길 터였다. 사령관은 거짓 보급 일정을 흘려 덫을 놓았고, 오그렌은 그 미끼를 물었다. 우리는 그를 현장에서 붙잡아 격퇴했다.\n\n그 일을 겪고 나서야, 맥시모프와 우리 사이의 신뢰는 진짜가 됐다. 나는 기록에 적었다 — 동맹의 신뢰란, 한 번 함께 지켜내야 비로소 진짜가 된다고.",
        "en": "The joy of alliance did not last. No sooner was the pact sealed than the Resistance's supply convoys kept leaking to the enemy. The ambushes were too precise, the losses too great. There was an enemy's eye within.\n\nI cross-analyzed comm logs and supply schedules, tracing the pattern of the leaks. The culprit was Ogren — a Krieg double agent long buried deep in the Resistance, a blade Eisenklau had planted in our ally's back.\n\nThe rooting-out had to be quiet. Move rashly, and he would flee or hand over one last great secret. The Commander leaked a false supply schedule as bait, and Ogren took it. We caught him in the act and drove him off.\n\nOnly after that ordeal did the trust between Maximov and us become real. I wrote in the log: an alliance's trust only becomes real once it has been defended together."
      },
      {
        "t": {
          "ko": "04. 거북선 설계도",
          "en": "04. The Turtle Blueprint"
        },
        "who": {
          "por": "img/chars/H/hero02.png",
          "ko": "장영실(합류)",
          "en": "Jang Yeong-sil (joins)"
        },
        "when": {
          "ko": "봉쇄력 100년 8월",
          "en": "B.E. 100 · Aug"
        },
        "where": {
          "ko": "벙커존",
          "en": "Bunker Zone"
        },
        "what": {
          "img": "img/ui/BP01.png",
          "ko": "거북선 설계도",
          "en": "Turtle Ship blueprint"
        },
        "ko": "그리고 이곳에서, 우리는 가장 귀한 두 가지를 얻었다.\n\n첫째는 사람이었다. 천재 기술자 장영실이 우리에게 합류했다. 그는 손에 잡히는 모든 것을 더 나은 물건으로 바꾸는 재주를 지녔고, 무엇보다 한 가지 꿈을 품고 있었다. 그가 낡은 설계도 한 장을 펼치며 말했다. \"거북선 — 시대를 앞섰던 그 배를, 내 손으로 이 우주에 다시 띄우겠소.\"\n\n둘째는 자원이었다. 저항군은 100년간 비축해 둔 반물질과, 거북선 설계도의 잃어버린 절반을 우리에게 내주었다. 설계도와 재료, 그리고 그것을 다룰 천재. 우리는 마침내 전설의 함선을 만들 모든 열쇠를 손에 쥐었다.\n\n하지만 그 배를 완성하려면 거대한 단조 시설이 필요했고, 그런 시설은 적의 손에 있었다. 칩과 정보를 짜맞춘 결과, 아이젠클로의 다음 거점은 포지 행성 슈멜츠. 거북선을 만들 불길이, 하필 적의 공장에 있었다.\n\n추격이 시작됐다.",
        "en": "And here we gained two of the most precious things of all.\n\nFirst was a person. The genius engineer Jang Yeong-sil joined us. He had a gift for turning anything in his hands into something better, and above all he carried one dream. Unrolling an old blueprint, he said: \"The Turtle Ship — that vessel ahead of its time, I shall set afloat in this cosmos again with my own hands.\"\n\nSecond was resources. The Resistance gave us the antimatter they had hoarded for a century, and the lost half of the Turtle Ship blueprint. The plans, the materials, and the genius to wield them. At last we held every key to building the legendary vessel.\n\nBut completing it required a vast forge, and such a forge lay in enemy hands. Piecing chip and intel together, Eisenklau's next stronghold was the forge world Schmelz. The fire to build the Turtle Ship sat, of all places, in the enemy's factory.\n\nThe pursuit began."
      }
    ]
  },
  "4": {
    "title": {
      "ko": "제4지 — 거북선 (행성 16~20)",
      "en": "Log IV — The Turtle Ship (Planets 16–20)"
    },
    "entries": [
      {
        "t": {
          "ko": "01. 포지 행성",
          "en": "01. The Forge World"
        },
        "who": {
          "por": "img/quests/combat_F04.png",
          "ko": "크리그(공장)",
          "en": "Krieg (the forge)"
        },
        "when": {
          "ko": "봉쇄력 100년 8월",
          "en": "B.E. 100 · Aug"
        },
        "where": {
          "ko": "슈멜츠 · 포지 행성",
          "en": "Schmelz · forge world"
        },
        "what": {
          "img": "img/commodities/G10.png",
          "ko": "크리그 무기 원석",
          "en": "Krieg Weapon Ore"
        },
        "ko": "슈멜츠. 포지 행성이라 불리는 그곳은, 마그마가 끝없이 솟구치는 거대한 용광로였다. 공기마저 쇳물 냄새로 무거웠고, 하늘은 늘 붉었다.\n\n이곳은 크리그의 핵심 무기 공장이었다. 치크스에 납품할 생체 병기의 핵심 코어를, 집행관 아이젠클로가 직접 찍어내던 곳. 봉쇄를 유지하는 검은 함대의 절반이, 바로 이 행성의 불길에서 태어났다.\n\n우리에게 이곳이 필요한 이유는 분명했다. 거북선을 완성할 만한 거대 단조 시설은 은하 어디에도 흔치 않았고, 그중 하나가 하필 적의 심장부에 있었다. 적의 공장에서 적을 무너뜨릴 배를 만든다 — 장영실은 그 역설을 두고 통쾌하게 웃었다.\n\n하지만 공장은 철통같이 지켜지고 있었다. 정면 돌파는 불가능했다. 우리는 다른 길을 찾아야 했다.",
        "en": "Schmelz. The place they called the forge world was a vast furnace where magma erupted without end. Even the air hung heavy with the smell of molten iron, and the sky was always red.\n\nThis was Krieg's core weapons factory — where the enforcer Eisenklau himself stamped out the bioweapon cores to supply the Chiks. Half of the black fleet that held the blockade was born in this planet's fire.\n\nWhy we needed this place was clear. Forges vast enough to complete the Turtle Ship were rare anywhere in the galaxy, and one of them sat, of all places, in the enemy's heart. To build, in the enemy's factory, the very ship that would bring the enemy down — Jang Yeong-sil laughed heartily at the irony.\n\nBut the factory was guarded like a vault. A frontal breach was impossible. We had to find another way."
      },
      {
        "t": {
          "ko": "02. 공장의 불씨",
          "en": "02. Embers in the Forge"
        },
        "who": {
          "por": "img/chars/H/hero08.png",
          "ko": "마르코 폴로 · 노동자",
          "en": "Marco Polo · workers"
        },
        "when": {
          "ko": "봉쇄력 100년 9월",
          "en": "B.E. 100 · Sep"
        },
        "where": {
          "ko": "슈멜츠 무기 공장",
          "en": "Schmelz factory"
        },
        "what": {
          "img": "img/parts/A01.png",
          "ko": "생체 병기 코어",
          "en": "Bioweapon core"
        },
        "ko": "다른 길은, 의외로 공장 안에 있었다.\n\n포지 행성의 노동자들은 대부분 강제로 끌려온 사람들이었다. 봉쇄에 저항하다 붙잡힌 자들, 빚에 팔려온 자들, 고향을 잃은 자들. 그들의 가슴속에는 오래전 꺼진 줄 알았던 반란의 불씨가 아직 남아 있었다.\n\n우리는 저항군의 정보망을 통해 그들과 은밀히 접촉했다. 처음엔 의심뿐이었다. 또 누군가 자신들을 이용하려는 거라고. 하지만 사령관이 약속한 것은 거창한 해방이 아니라, 단 하나 — \"당신들이 만든 무기로, 당신들을 가둔 자를 끝장내겠다\"는 것이었다.\n\n작은 불씨 하나가 거대한 공장을 멈춰 세우는 법이다. 노동자들이 안에서 시설을 장악하기 시작하자, 견고하던 크리그의 방어선에 혼란이 번졌다. 우리는 그 혼란을 틈타 단조 시설의 핵심 구역으로 진입했다.",
        "en": "The other way, unexpectedly, lay inside the factory.\n\nMost of the forge world's workers had been dragged there by force — those caught resisting the blockade, those sold for debt, those who had lost their homes. In their chests, an ember of rebellion long thought extinguished still smoldered.\n\nThrough the Resistance's network we made quiet contact with them. At first there was only suspicion: that someone else meant to use them again. But what the Commander promised was no grand liberation — only this: \"With the weapons you forge, we will finish the one who caged you.\"\n\nA single ember can halt an entire forge. As the workers began to seize the facility from within, chaos spread through Krieg's once-solid lines. Through that chaos, we broke into the heart of the forge."
      },
      {
        "t": {
          "ko": "03. 거북선 완성",
          "en": "03. The Turtle Ship Rises"
        },
        "who": {
          "por": "img/chars/H/hero02.png",
          "ko": "장영실",
          "en": "Jang Yeong-sil"
        },
        "when": {
          "ko": "봉쇄력 100년 9월",
          "en": "B.E. 100 · Sep"
        },
        "where": {
          "ko": "슈멜츠 격납고",
          "en": "Schmelz hangar"
        },
        "what": {
          "img": "img/ships/H/LGD01.png",
          "ko": "거북선 (LGD01)",
          "en": "Turtle Ship (LGD01)"
        },
        "ko": "불길과 굉음 속에서, 장영실의 손이 움직였다. 저항군의 반물질과 포지 행성의 거대한 용광로, 그리고 수백 년을 건너온 설계도가 마침내 하나로 만났다.\n\n며칠 밤낮을 새운 끝에, 그가 마침내 외쳤다. \"완성됐다 — 거북선!\" 단조 시설의 문이 열리고, 검은 등껍질을 두른 전설의 함선 LGD01이 붉은 하늘 아래 모습을 드러냈다. 수리비를 크게 아껴주고, 탐색의 안개를 걷어내며, 그 위용만으로 적에게 공포를 안기는 배였다.\n\n이순신 장군은 오랫동안 말없이 그 배를 바라보았다. 자신이 살아생전 이끌던 배가, 별의 바다 위에 다시 떠 있었으니까. \"…이제야, 제대로 싸울 수 있겠군.\" 그의 목소리에는 100년의 회한이 묻어 있었다.\n\n장영실이 웃으며 말했다. \"이제, 적이 우리를 두려워할 차례요.\" 나는 그 말을 기록의 표제로 삼았다.",
        "en": "Amid fire and thunder, Jang Yeong-sil's hands moved. The Resistance's antimatter, the forge world's vast furnace, and a blueprint that had crossed centuries finally met as one.\n\nAfter days and nights without sleep, he cried out at last: \"It's finished — the Turtle Ship!\" The forge doors opened, and the legendary vessel LGD01, sheathed in its black shell, emerged beneath the red sky. A ship that spared great repair costs, lifted the fog of exploration, and struck terror into foes by its presence alone.\n\nAdmiral Yi Sun-sin gazed at it a long while in silence. For the ship he had led in life now floated again upon the sea of stars. \"…At last, I can fight properly.\" In his voice lay a century of regret.\n\nJang Yeong-sil said with a smile: \"Now it's the enemy's turn to fear us.\" I made those words the heading of my log."
      },
      {
        "t": {
          "ko": "04. 정복왕",
          "en": "04. The Conqueror-King"
        },
        "who": {
          "por": "img/chars/H/hero03.png",
          "ko": "광개토대왕 · 넬슨",
          "en": "Gwanggaeto · Nelson"
        },
        "when": {
          "ko": "봉쇄력 100년 10월",
          "en": "B.E. 100 · Oct"
        },
        "where": {
          "ko": "글리제 행성 경매장",
          "en": "Gliese planetary auction"
        },
        "what": {
          "img": "img/ships/H/M01.png",
          "ko": "경매 낙찰 유산",
          "en": "Auctioned legacy"
        },
        "ko": "거북선을 손에 넣은 우리에게, 마지막으로 한 사람이 더 찾아왔다.\n\n행성 경매장에서, 우리는 광개토대왕의 유산을 두고 다른 세력들과 치열하게 경합했다. 영토를 넓히는 데 평생을 바친 그 위대한 정복왕의 봉인을, 우리는 끝내 낙찰받았다. 그가 우리 깃발 아래 모이자, 함대는 비로소 공격과 확장의 기세를 갖추게 됐다.\n\n이제 함대는 시대를 뛰어넘은 전설의 영웅들로 가득 찼다. 바다의 이순신, 우주의 가가린, 만든 자 장영실, 그리고 정복왕 광개토. 누구도 상상하지 못했던 조합이었다. 나는 종종 생각했다 — 이들이 한 깃발 아래 모인 것 자체가, 어쩌면 봉쇄를 깨뜨릴 첫 번째 기적이었는지도 모른다고.\n\n준비는 끝났다. 거북선이 있고, 영웅들이 있고, 저항군이 있었다. 우르사 메이저로 가는 길목에 버틴 봉쇄의 집행관 아이젠클로를, 마침내 끝장낼 때가 다가왔다.",
        "en": "To us, now holding the Turtle Ship, one more person finally came.\n\nAt a planetary auction, we fought fiercely against rival powers over the legacy of Gwanggaeto the Great. The seal of that mighty conqueror-king, who had given his life to widen his realm, we won in the end. As he gathered beneath our banner, the fleet at last gained the momentum to attack and expand.\n\nNow the fleet brimmed with legendary heroes leaping across the ages. Yi Sun-sin of the seas, Gagarin of space, Jang Yeong-sil the maker, and Gwanggaeto the conqueror. It was a combination no one could have imagined. I often thought — that they had gathered beneath one banner at all was perhaps the first miracle that would break the blockade.\n\nThe preparations were done. We had the Turtle Ship, the heroes, the Resistance. The time to finish Eisenklau, the blockade's enforcer barring the road to Ursa Major, was drawing near."
      }
    ]
  },
  "5": {
    "title": {
      "ko": "제5지 — 결전 (행성 21~25)",
      "en": "Log V — The Decisive Battle (Planets 21–25)"
    },
    "entries": [
      {
        "t": {
          "ko": "01. 어둠의 요새",
          "en": "01. Fortress of Darkness"
        },
        "who": {
          "por": "img/chars/H/hero01.png",
          "ko": "이순신 · 연합 함대",
          "en": "Yi Sun-sin · allied fleet"
        },
        "when": {
          "ko": "봉쇄력 100년 11월",
          "en": "B.E. 100 · Nov"
        },
        "where": {
          "ko": "페스작센 · 어둠의 요새",
          "en": "Fessachsen · Fortress of Darkness"
        },
        "what": {
          "img": "img/ships/H/LGD01.png",
          "ko": "선두의 거북선",
          "en": "Turtle Ship at the van"
        },
        "ko": "페스작센. 사람들이 '어둠의 요새'라 부르는 그곳은, 아이젠클로가 봉쇄망의 모든 화력을 끌어모아 구축한 최후의 방어선이었다. 행성을 둘러싼 크리그의 방어 포대만 40기. 어느 방향으로 접근하든, 별빛조차 닿기 전에 격추당할 진형이었다.\n\n정면 승부는 자살에 가까웠다. 그러나 우리에겐 이제 혼자가 아니라는 힘이 있었다. 거북선을 선두로, 저항군과 수퍼비아 연합이 가세한 함대가 전열을 갖췄다. 100년간 흩어져 있던 인류의 분노가, 처음으로 한 점에 모이는 순간이었다.\n\n출진 직전, 이순신 장군이 함대 전체에 통신을 열었다. 길지 않은 말이었지만, 모든 함교에 정적이 흘렀다. 두려움이 없는 사람은 없었다. 다만, 도망치려는 사람도 없었다.\n\n나는 전 함선의 상태를 점검하고, 마지막으로 사령관에게 보고했다. \"전 함대, 준비 완료.\" 사령관이 고개를 끄덕였다.",
        "en": "Fessachsen. The place people called the 'Fortress of Darkness' was the final line Eisenklau had built by pulling all the blockade's firepower into one. Forty Krieg defense batteries ringed the world. From whatever angle you approached, you'd be shot down before even starlight reached you.\n\nA frontal clash was near suicide. But now we had the strength of no longer being alone. Led by the Turtle Ship, a fleet joined by the Resistance and Superbia formed up. It was the moment humanity's fury, scattered for a hundred years, gathered for the first time into a single point.\n\nJust before the sortie, Admiral Yi Sun-sin opened a channel to the whole fleet. His words were not long, but silence fell across every bridge. No one was without fear. Only, no one meant to run.\n\nI checked the status of every ship and gave my last report to the Commander. \"All ships, ready.\" The Commander nodded."
      },
      {
        "t": {
          "ko": "02. 집행관의 최후",
          "en": "02. The Enforcer Falls"
        },
        "who": {
          "por": "img/chars/H/hero06.png",
          "ko": "아인슈타인 · 테슬라 · 이휘소",
          "en": "Einstein · Tesla · Dr. Lee"
        },
        "when": {
          "ko": "봉쇄력 100년 11월",
          "en": "B.E. 100 · Nov"
        },
        "where": {
          "ko": "페스작센 전역",
          "en": "Fessachsen theater"
        },
        "what": {
          "img": "img/quests/combat_F04.png",
          "ko": "집행관 격파",
          "en": "Enforcer defeated"
        },
        "ko": "\"전 함대 — 거북선을 따른다.\" 이순신 장군의 명령과 함께, 전투가 시작됐다.\n\n거북선은 적의 포화를 등껍질로 받아내며 진형의 한가운데를 갈랐다. 40기의 포대가 불을 뿜었지만, 이순신의 전술 앞에서 그 화력은 번번이 헛손질이 됐다. 한때 적의 방패였던 그의 지혜가, 이제는 적의 방패를 부수는 창이 되어 있었다.\n\n아이젠클로는 끝까지 강했다. 강철 의수로 마지막까지 함대를 지휘하며 버텼다. 그러나 그는 결국 자신이 무엇이었는지를 깨달았을 것이다 — 봉쇄를 설계한 머리가 아니라, 남이 설계한 봉쇄를 지키다 부서지는 손발이었다는 것을. 우리는 그를 무너뜨렸다.\n\n집행관이 쓰러지자, 그의 비밀 연구 구역이 열렸다. 그 안에서 천재 물리학자 이휘소 박사가 합류했고, 더 깊은 곳에서는 잊혀진 세종 AI의 흔적이 발견됐다. 적을 무너뜨린 자리에서, 우리는 또 다른 미래의 열쇠를 주웠다.",
        "en": "\"All ships — follow the Turtle Ship.\" With Admiral Yi Sun-sin's command, the battle began.\n\nThe Turtle Ship took the enemy's fire on its shell and split the heart of their formation. Forty batteries spat flame, yet before Yi Sun-sin's tactics that firepower struck only empty space again and again. The wisdom that had once been the enemy's shield was now a spear breaking the enemy's shield.\n\nEisenklau was strong to the very end, commanding his fleet with his steel arm until the last. But surely, in the end, he understood what he had been — not the mind that designed the blockade, but a hand that broke while guarding a blockade designed by another. We brought him down.\n\nAs the enforcer fell, his secret research wing opened. Within, the genius physicist Dr. Lee Hwi-so joined us, and deeper still we found traces of the forgotten Sejong AI. On the ground where we toppled an enemy, we picked up another key to the future."
      },
      {
        "t": {
          "ko": "03. 우두머리",
          "en": "03. The Master"
        },
        "who": {
          "por": "img/chars/H/ursa.png",
          "ko": "우르사 메이저",
          "en": "Ursa Major"
        },
        "when": {
          "ko": "봉쇄력 100년 12월",
          "en": "B.E. 100 · Dec"
        },
        "where": {
          "ko": "우르사 알파 너머 궤도 요새",
          "en": "Orbital fortress beyond Ursa Alpha"
        },
        "what": {
          "img": "img/combat/ships/Boss.png",
          "ko": "요새 (HP 5,000,000)",
          "en": "Fortress (HP 5,000,000)"
        },
        "ko": "하수인을 치웠으니, 이제 그 주인 차례였다.\n\n모든 길의 끝에는 우르사 메이저가 있었다. 치크스의 우두머리이자, 100년간 지구를 검은 함대로 틀어막아 온 봉쇄 그 자체. 아이젠클로가 그의 손발이었다면, 우르사 메이저는 그 모든 어둠을 설계한 머리였다.\n\n그와의 결전은, 지금까지의 모든 싸움과 차원이 달랐다. HP 5,000,000. 그것은 단순한 수치가 아니라, 100년의 봉쇄가 쌓아 올린 절망의 두께였다. 전투는 다섯 페이즈에 걸친 기나긴 사투가 됐다. 함대가 부서지면 후방에서 새 함선이 전열에 들어섰고, 우리는 쓰러지고 다시 일어서기를 몇 번이고 반복했다.\n\n그 긴 싸움 동안, 나는 사령관 곁에서 단 한순간도 통신을 끊지 않았다. 손상 보고와 전술 보정을 쉴 새 없이 올리면서도, 내내 한 가지 생각만을 붙들고 있었다. 폐선의 잔해에서 시작한 우리가, 정말로 여기까지 왔다는 것을.",
        "en": "The lackey was cleared; now came his master.\n\nAt the end of every road stood Ursa Major. Lord of the Chiks, and the blockade itself that had choked Earth behind a black fleet for a hundred years. If Eisenklau had been his hands, Ursa Major was the mind that designed all that darkness.\n\nThe battle against him was of a different order from every fight before. HP 5,000,000. That was no mere number, but the thickness of despair a century of blockade had piled up. The fight became a long struggle across five phases. When the fleet was shattered, fresh ships took the line from the rear, and we fell and rose again, over and over.\n\nThrough all that long battle, I never cut the channel from the Commander's side for a single moment. Even as I sent ceaseless damage reports and tactical corrections, I held to one thought alone: that we, who began in the wreckage of a derelict ship, had truly come this far."
      },
      {
        "t": {
          "ko": "04. 봉쇄 해제",
          "en": "04. The Blockade Lifts"
        },
        "who": {
          "por": "img/chars/H/commander_m1.png",
          "ko": "위대한 화랑 · 백구",
          "en": "The great Hwarang · Baekgu"
        },
        "when": {
          "ko": "봉쇄력 100년 12월 (귀환)",
          "en": "B.E. 100 · Dec (return)"
        },
        "where": {
          "ko": "태양계 · 지구 궤도",
          "en": "Solar System · Earth orbit"
        },
        "what": {
          "img": "img/planets/EARTH.png",
          "ko": "되찾은 지구",
          "en": "Earth reclaimed"
        },
        "ko": "그리고 우리는, 끝내 그를 격파했다.\n\n우르사 메이저가 무너지던 순간, 100년간 지구를 둘러쌌던 검은 봉쇄망이 통째로 흔들렸다. 봉쇄를 유지하던 핵심 의지가 사라지자, 검은 함대는 지휘를 잃고 흩어졌다. 변방의 모든 통신망에 같은 소식이 동시에 번졌다 — 봉쇄가, 풀렸다고.\n\n천막촌에서, 저항군 기지에서, 망명자들의 지하에서 사람들이 쏟아져 나와 하늘을 올려다보았다. 100년 만에 처음으로, 푸른 행성으로 가는 길이 열려 있었다.\n\n사령관은 위대한 화랑이 되어, 연합 함대를 이끌고 마침내 푸른 지구로 돌아왔다. 폐지를 줍던 변방의 사령관이, 인류를 다시 고향으로 데려온 것이다. 대기권에 진입하던 그 순간, 모든 함교에 환호가 터졌다.\n\n나는 그 순간, 누구에게도 보고하지 않고, 조용히 꼬리를 흔들었다. 그것이 내가 그날을 기념한 방식이었다.",
        "en": "And in the end, we defeated him.\n\nThe moment Ursa Major fell, the black blockade that had ringed Earth for a hundred years shook to its core. With the central will that held it gone, the black fleet lost its command and scattered. The same news rippled at once across every frontier network — the blockade had broken.\n\nFrom tent-towns, from Resistance bases, from the underground of exiles, people poured out and looked up at the sky. For the first time in a century, the road to the blue planet lay open.\n\nThe Commander became the great Hwarang and, leading the allied fleet, returned at last to the blue Earth. The frontier commander who had once picked scrap had brought humanity home again. As we entered the atmosphere, cheers erupted across every bridge.\n\nIn that moment, reporting to no one, I quietly wagged my tail. That was how I marked the day."
      }
    ]
  },
  "6": {
    "title": {
      "ko": "제6지 — 총독 시대 (행성 26~30)",
      "en": "Log VI — The Governor Era (Planets 26–30)"
    },
    "entries": [
      {
        "t": {
          "ko": "01. 정치 공백",
          "en": "01. The Vacuum"
        },
        "who": {
          "por": "img/chars/H/commander_m1.png",
          "ko": "7대 문명권 · {회사}",
          "en": "7 civilizations · {회사}"
        },
        "when": {
          "ko": "봉쇄력 101년 3월",
          "en": "B.E. 101 · Mar"
        },
        "where": {
          "ko": "프록시마B ~ 보이드 균열 전 항로",
          "en": "All lanes, Proxima B to the Void rifts"
        },
        "what": {
          "img": "img/planets/F01.png",
          "ko": "무주공산 항로",
          "en": "Ownerless lanes"
        },
        "ko": "지구로 돌아온 뒤, 모든 것이 끝났다고 생각했다. 착각이었다.\n\n우르사 메이저가 사라진 은하계에는 거대한 정치 공백이 남았다. 100년간 봉쇄라는 단 하나의 질서가 모든 것을 짓눌렀는데, 그 질서가 통째로 무너지자 이번엔 혼돈이 그 자리를 채웠다. 일곱 문명권은 서로를 견제하기 시작했고, 주인을 잃은 항로마다 분쟁이 일었다.\n\n수퍼비아의 오만과 아우레우스의 탐욕, 메카니카의 강철과 크리그의 잔당, 그리고 침묵하는 보이드까지 — 저마다 봉쇄 이후의 패권을 노렸다. 봉쇄를 깬 영웅이라 해서, 그 모든 욕망 위에 군림할 수 있는 건 아니었다.\n\n누군가 중심을 잡아야 했다. 어느 한 문명권에도 치우치지 않은, 모두가 인정할 수 있는 중립의 세력이. 그리고 사람들의 시선은, 자연스럽게 봉쇄를 깬 {회사}에게로 향했다.",
        "en": "After returning to Earth, I thought everything was over. I was mistaken.\n\nWith Ursa Major gone, a vast political vacuum remained across the galaxy. For a hundred years a single order — the blockade — had crushed everything, and when that order collapsed whole, chaos rushed to fill its place. The seven civilizations began to eye one another, and disputes flared on every ownerless lane.\n\nSuperbia's arrogance and Aureus's greed, Mechanica's steel and the remnants of Krieg, and even the silent Void — each coveted hegemony after the blockade. To have broken the blockade did not mean one could reign over all that desire.\n\nSomeone had to hold the center: a neutral power leaning toward no single civilization, one all could accept. And people's eyes turned, naturally, to {company}, who had broken the blockade."
      },
      {
        "t": {
          "ko": "02. 총독 임명",
          "en": "02. The Governor"
        },
        "who": {
          "por": "img/chars/H/commander_m1.png",
          "ko": "{회사}(중립 총독)",
          "en": "{회사} (neutral Governor)"
        },
        "when": {
          "ko": "봉쇄력 101년 4월",
          "en": "B.E. 101 · Apr"
        },
        "where": {
          "ko": "대연합 총회 · 프록시마B~글리제 균열",
          "en": "Grand Assembly · Proxima B–Gliese Rift"
        },
        "what": {
          "img": "img/ui/BP01.png",
          "ko": "관할권 증서",
          "en": "Jurisdiction deed"
        },
        "ko": "대연합 총회가 소집됐다. 일곱 문명권의 대표가 한자리에 모인 것은, 기록이 시작된 이래 처음이었다.\n\n긴 논쟁 끝에, 총회는 결의했다 — 모든 팩션이 {회사}를 은하의 유일한 중립 총독 세력으로 인정한다고. 봉쇄를 깬 자에게 새 질서를 세울 책임을 맡긴 것이다. 영광이라기보다는, 무거운 짐이었다.\n\n우리는 프록시마B에서 글리제 균열에 이르기까지, 행성별 총독 경매를 통해 은하 전역의 관할권을 하나씩 인수했다. 가장 먼저 행성을 이전한 것은 뜻밖에도 수퍼비아 의회였다. 단, 조건이 있었다. 세수입의 일부는 반드시 원래 문명권에 배분할 것 — 정복이 아니라 신탁이어야 한다는 약속이었다.\n\n나는 그 조항을 흐뭇하게 기록했다. 힘으로 빼앗는 시대를 끝낸 우리가, 이번엔 힘으로 군림하지 않는 길을 택했으니까.",
        "en": "The Grand Coalition Assembly was convened. It was the first time since records began that representatives of all seven civilizations gathered in one place.\n\nAfter long debate, the Assembly resolved — that every faction would recognize {company} as the galaxy's sole neutral Governor power. They entrusted the one who broke the blockade with the duty of building a new order. Less an honor than a heavy burden.\n\nFrom Proxima B to the Gliese Rift, we took over jurisdiction across the galaxy one world at a time, through planetary governor auctions. The first to transfer its worlds was, unexpectedly, the Superbia Council. But there was a condition: a share of tax revenue must always return to the original civilization — a promise that this be a trust, not a conquest.\n\nI logged that clause with quiet satisfaction. For we, having ended the age of taking by force, this time chose the path of not reigning by force."
      },
      {
        "t": {
          "ko": "03. 심연의 전령",
          "en": "03. Herald of the Abyss"
        },
        "who": {
          "por": "img/quests/combat_F07.png",
          "ko": "블랙팔콘 전령 레이든",
          "en": "Black Falcon's herald, Raiden"
        },
        "when": {
          "ko": "봉쇄력 101년 5월",
          "en": "B.E. 101 · May"
        },
        "where": {
          "ko": "글리제 균열 ~ 제타 레티쿨리(보이드 심연)",
          "en": "Gliese Rift – Zeta Reticuli (Void Abyss)"
        },
        "what": {
          "img": "img/ships/H/LGD03.png",
          "ko": "균열 너머의 함영",
          "en": "Shadow beyond the rift"
        },
        "ko": "그러나 평화는 끝이 아니었다. 끝이라고 믿고 싶었을 뿐.\n\n보이드의 심연에서, 한 척의 검은 함선이 나타났다. 블랙팔콘의 전령, 레이든. 그는 위협하지도, 협상하지도 않았다. 다만 거울처럼 우리를 비추며, 균열 너머의 무언가가 깨어나고 있음을 알릴 뿐이었다.\n\n나는 그 신호를 분석하다 등골이 서늘해졌다. 그것은 1000년 전의 주파수였다. 우르사 메이저가 시작이 아니라, 어쩌면 더 오래되고 더 깊은 무언가의 가장 바깥쪽 그림자에 불과했을지도 모른다는 가능성. 침묵하던 보이드가, 침묵을 깨려 하고 있었다.\n\n사령관은 오래 말이 없었다. 봉쇄를 깨고 겨우 되찾은 평화 위로, 새로운 그림자가 드리우고 있었다. 우리는 다시, 균열 너머를 바라보아야 했다.",
        "en": "But peace was not the end. We only wished to believe it was.\n\nFrom the Void Abyss, a single black ship appeared. Raiden, herald of the Black Falcon. He neither threatened nor bargained. He only mirrored us, and announced that something beyond the rift was waking.\n\nAnalyzing that signal, my spine ran cold. It was a frequency from a thousand years ago. The possibility that Ursa Major had not been the beginning, but perhaps only the outermost shadow of something far older and far deeper. The silent Void was about to break its silence.\n\nThe Commander said nothing for a long time. Over the peace we had only just reclaimed by breaking the blockade, a new shadow was falling. Once more, we had to look beyond the rift."
      },
      {
        "t": {
          "ko": "04. 항해는 계속",
          "en": "04. The Voyage Continues"
        },
        "who": {
          "por": "img/chars/H/baekgu002.png",
          "ko": "사령관 · 백구",
          "en": "Commander · Baekgu"
        },
        "when": {
          "ko": "봉쇄력 101년 5월",
          "en": "B.E. 101 · May"
        },
        "where": {
          "ko": "지구 궤도 → 다음 좌표",
          "en": "Earth orbit → next coordinates"
        },
        "what": {
          "img": "img/ships/H/S01.png",
          "ko": "다시 불 붙인 {함선}",
          "en": "The {함선}, relit"
        },
        "ko": "그래도 — 나는 두렵지 않다.\n\n돌이켜 보면 우리는 가진 것 없이 시작했다. 에너지 7%의 폐선, 먼지뿐인 격납고, 그리고 폐지를 줍던 한 사람. 그곳에서 출발해, 우리는 은하를 건너고, 일곱 문명권을 가로지르고, 100년의 봉쇄를 부수고, 끝내 푸른 지구를 되찾았다. 시대를 뛰어넘은 영웅들이 한 깃발 아래 모였고, 변방의 상단은 은하의 총독이 됐다.\n\n그 모든 과정에는 이유가 있었다. 거래로 금고를 채운 것은 함대를 일구기 위해서였고, 함대를 일군 것은 영웅을 구하기 위해서였고, 영웅을 모은 것은 봉쇄에 맞서기 위해서였다. 작은 한 걸음 한 걸음이, 결국 푸른 행성으로 향하는 하나의 길이었다.\n\n이제 보이드의 심연이 새로운 어둠을 예고한다. 하지만 사령관과 나, 백구가 함께라면 어떤 균열도 건널 수 있다. 우리는 한 번 불가능을 가능으로 바꿔 본 사람들이니까.\n\n우리의 항해는, 계속된다.",
        "en": "Even so — I am not afraid.\n\nLooking back, we began with nothing. A derelict at 7% energy, a hangar full of dust, and one person who picked scrap to live. From there we crossed the galaxy, cut through seven civilizations, shattered a century of blockade, and reclaimed the blue Earth in the end. Heroes leaping across the ages gathered beneath one banner, and a frontier trade band became the galaxy's Governor.\n\nEvery step of it had a reason. We filled the vault by trade to build a fleet; we built a fleet to rescue heroes; we gathered heroes to stand against the blockade. Each small step was, in the end, one road leading to the blue planet.\n\nNow the Void Abyss foretells a new darkness. But as long as the Commander and I, Baekgu, are together, we can cross any rift. For we are those who once turned the impossible into the possible.\n\nOur voyage continues."
      }
    ]
  }
};
})();
