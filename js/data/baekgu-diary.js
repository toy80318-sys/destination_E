// ══════════════════════════════════════════════════════════════════
// DESTINATION EARTH — 백구의 항해 일지 (페이즈별 스토리 정리)
//   · 운항기록(Voyage Log) 탭에서, 해당 페이즈의 대화기록이 30% 이상 해금되면
//     백구의 1인칭 일지를 보여준다.
//   · 사용자 요청 2026-06-16: 페이즈당 4개 단위(entries)로 분할 + 대화기록 기반 스토리 상세화.
//   구조: { title:{ko,en}, entries:[ {t:{ko,en}, ko, en} × 4 ] }
//   토큰: {함선}/{ship}=함선명, {회사}/{company}=상단명 (렌더러에서 치환)
// ══════════════════════════════════════════════════════════════════
(function(){
  if(typeof window==='undefined')return;
  window.BAEKGU_DIARY = {
    1: {
      title: { ko:'제1지 — 각성 (행성 1~5)', en:'Log I — Awakening (Planets 1–5)' },
      entries: [
        {
          t:{ ko:'01. 기상', en:'01. Reveille' },
          ko:`100년 3개월 12일. 그게 사령관이 잠든 시간이었다. 에너지 잔량 7%, 격납고엔 먼지뿐. 나는 경보를 울려 사령관을 깨웠다.\n\n프록시마 b의 고철을 긁어모아 {함선}의 낡은 엔진에 다시 불을 붙였다. 모두가 숨을 죽이던 그 순간을, 나는 평생 잊지 못할 것이다.`,
          en:`100 years, 3 months, 12 days — that was how long the Commander slept. Energy at 7%, the hangar full of dust. I sounded the alarm and woke them.\n\nWe scavenged scrap on Proxima b and lit the {ship}'s old engine again. The moment everyone held their breath — I will never forget it.`
        },
        {
          t:{ ko:'02. 첫 거래', en:'02. First Trade' },
          ko:`볼프 교역소에서 첫 거래를 텄다. 낡은 부품 몇 개로 시작한 장사였지만, 금고에 처음으로 크레딧이 쌓였다.\n\n황금의 항구 아우레우스에서는 치크스 주파수로 변조된 정보 칩 하나를 손에 넣었다. 무언가 큰 것이 그 안에 잠들어 있었다.`,
          en:`We opened our first trade at Wolf Station. It began with a few worn parts, but for the first time, credits piled up in the vault.\n\nAt golden Aureus, I obtained an intel chip scrambled on Chiks frequencies. Something vast slept inside it.`
        },
        {
          t:{ ko:'03. 합류', en:'03. Comrades' },
          ko:`떠돌이 상인 마르코 폴로가 우리 항로에 합류했다. 그의 별 지도는 값을 매길 수 없었다.\n\n옛 소련 캡슐에서 깨어난 가가린도 우리 편이 됐다 — 인류 최초로 우주에 나간 사나이가, 다시 한 번 별을 향해 키를 잡았다.`,
          en:`The wandering merchant Marco Polo joined our course; his star charts were beyond price.\n\nGagarin, awakened from an old Soviet capsule, took our side too — the first man ever to reach space took the helm toward the stars once more.`
        },
        {
          t:{ ko:'04. 진실', en:'04. The Truth' },
          ko:`정보 칩을 해독하고서야 알았다. 지구는 아직 봉쇄돼 있다 — 치크스 제국과 그 우두머리 우르사 메이저에 의해.\n\n그리고 이순신 장군의 캡슐 좌표를 확보했다. 47 우르사이 마요리스 b, 치크스의 심장부. 사령관은 망설이지 않았다. "가자." 나는 그 한마디에 모든 걸 걸기로 했다.`,
          en:`Only after decoding the chip did I understand: Earth is still blockaded — by the Chiks Empire and their lord, Ursa Major.\n\nAnd we secured the coordinates of Admiral Yi Sun-sin's capsule: 47 Ursae Majoris b, the heart of Chiks territory. The Commander didn't hesitate. "Let's go." I bet everything on that one word.`
        }
      ]
    },
    2: {
      title: { ko:'제2지 — 결집 (행성 6~10)', en:'Log II — Gathering (Planets 6–10)' },
      entries: [
        {
          t:{ ko:'01. 보라빛 독기', en:'01. Purple Haze' },
          ko:`치크스의 영역은 보라빛 독기로 뒤덮여 있었다. 아우레우스 정보 칩은 치크스 주파수로 변조돼 있어, 밀무역상의 통신 장비를 빌려서야 겨우 해독했다.\n\n칩이 가리킨 곳은 Kepler-22b — 치크스가 외곽 항로 봉쇄를 떠넘긴 용병 군벌, 크리그의 거점이었다.`,
          en:`Chiks space was drowned in purple toxic haze. The Aureus chip was scrambled on Chiks frequencies; only a smuggler's borrowed comms gear could decode it.\n\nIt pointed to Kepler-22b — the stronghold of Krieg, the mercenary warlords the Chiks had subcontracted to choke the outer lanes.`
        },
        {
          t:{ ko:'02. 지하 감옥', en:'02. The Dungeon' },
          ko:`그 지하 감옥에 이순신 장군이 수백 년째 봉인돼 있었다. 치크스와 우르사 메이저가 지구를 틀어막던 그때, 끝까지 저항했던 단 한 사람.\n\n그의 전술 데이터는 강제로 추출돼, 크리그 방어 알고리즘의 '살아있는 방패'가 돼 있었다. 적은 영웅의 지혜로 영웅을 막고 있었다.`,
          en:`In that dungeon, Admiral Yi Sun-sin had been sealed for centuries. When the Chiks and Ursa Major choked Earth, he alone resisted to the end.\n\nHis tactical data had been forcibly extracted into the "living shield" of Krieg's defense algorithm. The enemy was using a hero's wisdom to hold off heroes.`
        },
        {
          t:{ ko:'03. 균열', en:'03. The Crack' },
          ko:`우리는 그를 꺼냈다. 이순신 장군이 눈을 뜨자, 그를 옭아매던 적의 알고리즘에 균열이 가기 시작했다.\n\n"…내 전술로 나를 가두려 했나." 장군의 첫 마디였다. 그 목소리에 함대의 사기가 끓어올랐다.`,
          en:`We pulled him out. The moment Yi Sun-sin opened his eyes, cracks spread through the enemy algorithm that had bound him.\n\n"…So they caged me with my own tactics." Those were his first words. The fleet's morale boiled at that voice.`
        },
        {
          t:{ ko:'04. 집행관', en:'04. The Enforcer' },
          ko:`그 순간, 치크스의 봉쇄 집행관이 모습을 드러냈다 — 크리그의 아이젠클로. 강철 같은 자였지만, 우르사 메이저의 손발에 불과했다.\n\n우리는 첫 대면 후 전략적으로 철수했다. 진짜 적은 그 너머에 있었다 — 치크스의 우르사 메이저. 아직은 때가 아니었다.`,
          en:`At that moment, the Chiks' blockade enforcer revealed himself — Eisenklau of the Krieg. A man like steel, yet nothing more than a hand of Ursa Major.\n\nAfter that first encounter, we withdrew by design. The true enemy lay beyond him — Ursa Major of the Chiks. It was not yet time.`
        }
      ]
    },
    3: {
      title: { ko:'제3지 — 연대 (행성 11~15)', en:'Log III — Solidarity (Planets 11–15)' },
      entries: [
        {
          t:{ ko:'01. 에코 기지', en:'01. Echo Base' },
          ko:`이순신 장군이 옛 전우들의 후예를 기억해냈다. 케플러-62e 지하, 저항군의 에코 기지.\n\n그들은 지구에서 쫓겨난 사람들 — 봉쇄 이전, 장군과 함께 맞서 싸웠던 선조들의 후손이었다. 100년 만의 재회였다.`,
          en:`Yi Sun-sin remembered the descendants of his old comrades — the Resistance's Echo Base, deep beneath Kepler-62e.\n\nThey were the exiles of Earth — heirs of those who once fought beside him before the blockade. A reunion a century in the making.`
        },
        {
          t:{ ko:'02. 연대 협약', en:'02. The Alliance' },
          ko:`저항군 총사령관 레인저 맥시모프와 연대 협약을 맺었다. 처음으로 우리는 혼자가 아니었다.\n\n"지구로 가는 길은 멀지만, 우린 그 길을 100년이나 지켜왔소." 맥시모프의 말이 오래 남았다.`,
          en:`We forged an alliance with Resistance commander Ranger Maximov. For the first time, we were not alone.\n\n"The road to Earth is long — but we've guarded it for a hundred years." Maximov's words stayed with me.`
        },
        {
          t:{ ko:'03. 첩자', en:'03. The Spy' },
          ko:`기쁨도 잠시, 저항군의 보급망에 크리그의 이중 스파이 '오그렌'이 숨어 있었다. 보급선이 자꾸 적에게 새어 나가던 이유였다.\n\n우리는 그를 색출해 격퇴했다. 동맹의 신뢰는, 한 번 지켜내야 비로소 진짜가 된다.`,
          en:`But joy was brief: a Krieg double agent, "Ogren," had infiltrated the Resistance's supply lines — the reason their convoys kept leaking to the enemy.\n\nWe rooted him out and drove him off. An alliance's trust only becomes real once it has been defended.`
        },
        {
          t:{ ko:'04. 거북선 설계도', en:'04. The Turtle Blueprint' },
          ko:`그리고 이곳에서 천재 기술자 장영실이 합류했다. 그가 설계도를 펼치며 말했다. "거북선 — 내 손으로 완성시키겠소."\n\n저항군의 반물질 비축분과 거북선 설계도. 우리는 마침내 전설의 함선을 만들 열쇠를 손에 넣었다. 아이젠클로의 다음 거점은 Kepler-442b. 추격이 시작됐다.`,
          en:`Here, the genius engineer Jang Yeong-sil joined us. Unrolling the blueprint, he declared, "The Turtle Ship — I shall complete it with my own hands."\n\nThe Resistance's antimatter stockpile and the Turtle Ship blueprint — at last we held the key to building the legendary vessel. Eisenklau's next stronghold: Kepler-442b. The pursuit began.`
        }
      ]
    },
    4: {
      title: { ko:'제4지 — 거북선 (행성 16~20)', en:'Log IV — The Turtle Ship (Planets 16–20)' },
      entries: [
        {
          t:{ ko:'01. 포지 행성', en:'01. The Forge World' },
          ko:`포지 행성 Kepler-442b. 마그마가 끝없이 솟구치는 크리그의 무기 공장.\n\n치크스에 납품할 생체 병기 핵심 코어를 아이젠클로가 직접 찍어내던 곳이다. 공기마저 쇳물 냄새로 무거웠다.`,
          en:`The forge world Kepler-442b — a Krieg weapons factory where magma erupts without end.\n\nHere Eisenklau stamped out bioweapon cores to supply the Chiks. Even the air hung heavy with the smell of molten iron.`
        },
        {
          t:{ ko:'02. 공장의 불씨', en:'02. Embers in the Forge' },
          ko:`공장 노동자들 사이에 반란의 불씨가 있었다. 그들은 강제로 끌려온 사람들이었다.\n\n우리는 그들과 손잡고 내부에서 균열을 키웠다. 작은 불씨 하나가, 거대한 공장을 멈춰 세우는 법이다.`,
          en:`Among the factory workers smoldered the embers of rebellion — people dragged here against their will.\n\nWe joined them and widened the cracks from within. A single ember, it turns out, can halt an entire forge.`
        },
        {
          t:{ ko:'03. 거북선 완성', en:'03. The Turtle Ship Rises' },
          ko:`그 혼란 속에서 장영실이 마침내 거북선(LGD01)을 완성했다. 수리비 40% 할인, 탐색 안개 제거 — 그 위용은 적들에게 공포 그 자체였다.\n\n"이제, 적이 우리를 두려워할 차례요." 장영실이 웃었다.`,
          en:`In that chaos, Jang Yeong-sil finally completed the Turtle Ship (LGD01) — 40% cheaper repairs, the fog of exploration cleared, its presence sheer terror to our foes.\n\n"Now it's the enemy's turn to fear us," Jang said, smiling.`
        },
        {
          t:{ ko:'04. 정복왕', en:'04. The Conqueror-King' },
          ko:`경매장에서는 광개토대왕의 유산을 낙찰받아, 그 위대한 정복왕마저 우리 깃발 아래 모였다. 이제 함대는 전설의 영웅들로 가득 찼다.\n\n우르사 메이저로 가는 길목 — 그 봉쇄 집행관 아이젠클로를 끝장낼 때가 다가왔다.`,
          en:`At auction we won the legacy of Gwanggaeto the Great, and even that mighty conqueror-king gathered beneath our banner. Now the fleet brimmed with legendary heroes.\n\nThe road to Ursa Major lay ahead — and the time to finish her blockade enforcer, Eisenklau, was drawing near.`
        }
      ]
    },
    5: {
      title: { ko:'제5지 — 결전 (행성 21~25)', en:'Log V — The Decisive Battle (Planets 21–25)' },
      entries: [
        {
          t:{ ko:'01. 어둠의 요새', en:'01. Fortress of Darkness' },
          ko:`아레스-III, 어둠의 요새. 크리그 방어 포대 40기가 행성을 뒤덮었다.\n\n그러나 거북선을 선두로, 저항군과 수퍼비아 연합 함대가 전열을 갖췄다. 100년의 분노가 한 곳에 모인 순간이었다.`,
          en:`Ares-III, the Fortress of Darkness. Forty Krieg defense batteries blanketed the world.\n\nYet led by the Turtle Ship, the Resistance and Superbia allied fleet formed up. A century of fury, gathered in one place.`
        },
        {
          t:{ ko:'02. 집행관의 최후', en:'02. The Enforcer Falls' },
          ko:`"전 함대 — 거북선을 따른다." 이순신 장군의 명령과 함께, 우리는 치크스의 봉쇄 집행관 아이젠클로를 무너뜨렸다.\n\n그를 격파하자 천재 물리학자 이휘소 박사가 합류했고, 심연 깊은 곳에서 세종 AI의 흔적도 발견했다.`,
          en:`"All ships — follow the Turtle Ship." With Yi Sun-sin's command, we brought down Eisenklau, the Chiks' blockade enforcer.\n\nWith his defeat, the genius physicist Dr. Lee Hwi-so joined us, and in the depths we found traces of the Sejong AI.`
        },
        {
          t:{ ko:'03. 우두머리', en:'03. The Master' },
          ko:`하수인을 치웠으니, 이제 그 주인 차례였다. 모든 길의 끝 — 우르사 메이저. 100년간 지구를 틀어막았던 치크스의 우두머리.\n\nHP 5,000,000. 5페이즈에 걸친 사투였다. 함대가 부서지고 다시 일어서기를 몇 번이고 반복했다.`,
          en:`The lackey was cleared; now came his master. At the end of every road — Ursa Major, the Chiks lord who had choked Earth for a hundred years.\n\nHP 5,000,000. A struggle across five phases. The fleet was shattered and rose again, over and over.`
        },
        {
          t:{ ko:'04. 봉쇄 해제', en:'04. The Blockade Lifts' },
          ko:`그리고 우리는 그를 격파했다. 우르사 메이저가 무너지자, 100년간 지구를 둘러쌌던 검은 봉쇄가 풀렸다.\n\n사령관은 위대한 화랑이 되어, 함대를 이끌고 마침내 푸른 지구로 돌아왔다. 나는 그 순간, 조용히 꼬리를 흔들었다.`,
          en:`And we defeated him. As Ursa Major fell, the black blockade that had ringed Earth for a century broke open.\n\nThe Commander became the great Hwarang and, leading the fleet, finally returned to the blue Earth. In that moment, I quietly wagged my tail.`
        }
      ]
    },
    6: {
      title: { ko:'제6지 — 총독 시대 (행성 26~30)', en:'Log VI — The Governor Era (Planets 26–30)' },
      entries: [
        {
          t:{ ko:'01. 정치 공백', en:'01. The Vacuum' },
          ko:`지구 귀환 후 3개월. 우르사 메이저가 사라진 은하계엔 거대한 정치 공백이 남았다.\n\n팩션들은 서로를 견제했고, 무주공산이 된 항로마다 분쟁이 일었다. 누군가 중심을 잡아야 했다.`,
          en:`Three months after returning to Earth. With Ursa Major gone, a vast political vacuum remained across the galaxy.\n\nThe factions eyed one another warily, and disputes flared on every ownerless lane. Someone had to hold the center.`
        },
        {
          t:{ ko:'02. 총독 임명', en:'02. The Governor' },
          ko:`대연합 총회는 결의했다 — 모든 팩션이 {회사}를 유일한 중립 총독 세력으로 인정한다고.\n\n프록시마 b부터 글리제 581g 균열까지, 우리는 행성별 총독 경매로 은하 전역의 관할권을 인수했다. 세수입의 일부는 원래 팩션에 배분하는 조건이었다.`,
          en:`The Grand Coalition Assembly resolved that every faction would recognize {company} as the sole neutral Governor power.\n\nFrom Proxima b to the Gliese 581g Rift, we took over jurisdiction across the galaxy through planetary governor auctions — on the condition that a share of tax revenue return to the original factions.`
        },
        {
          t:{ ko:'03. 심연의 전령', en:'03. Herald of the Abyss' },
          ko:`하지만 평화는 끝이 아니었다. 보이드의 심연에서 블랙팔콘의 전령 레이든이 나타났다.\n\n균열 너머에서 새로운 위협이 꿈틀댔다. 우르사 메이저는 시작에 불과했는지도 모른다.`,
          en:`But peace was not the end. From the Void Abyss appeared Raiden, herald of the Black Falcon.\n\nBeyond the rift, a new threat stirred. Perhaps Ursa Major had been only the beginning.`
        },
        {
          t:{ ko:'04. 항해는 계속', en:'04. The Voyage Continues' },
          ko:`그래도 — 두렵지 않다. 폐선의 잔해에서 시작해, 우리는 은하를 건너 지구를 되찾았다.\n\n사령관과 나, 백구가 함께라면 어떤 심연도 건널 수 있다. 우리의 항해는, 계속된다.`,
          en:`Even so — I fear nothing. From the wreckage of a derelict ship, we crossed the galaxy and reclaimed Earth.\n\nAs long as the Commander and I, Baekgu, are together, we can cross any abyss. Our voyage continues.`
        }
      ]
    }
  };
  console.log('[baekgu-diary] Loaded — 6 phases × 4 entries');
})();
