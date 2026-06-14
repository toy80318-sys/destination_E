// ══════════════════════════════════════════════════════════════════
// DESTINATION EARTH — 백구의 항해 일지 (페이즈별 스토리 정리)
//   · 운항기록(Voyage Log) 탭에서, 해당 페이즈의 모든 대화기록이 해금되면
//     백구의 1인칭 일지 형태로 전체 스토리 요약을 보여준다.
//   · 사용자 요청 2026-06-13
// ══════════════════════════════════════════════════════════════════
(function(){
  if(typeof window==='undefined')return;
  window.BAEKGU_DIARY = {
    1: {
      title: { ko:'제1지 — 각성 (행성 1~5)', en:'Log I — Awakening (Planets 1–5)' },
      ko:`100년 3개월 12일. 그게 사령관이 잠든 시간이었다. 에너지 잔량 7%, 격납고엔 먼지뿐. 나는 다시 사령관을 깨웠다.\n\n프록시마 b의 고철을 긁어모아 {함선}을 재부팅했다. 볼프 교역소에서 첫 거래를 트고, 황금의 항구 아우레우스에서 정보 칩을 손에 넣었다. 떠돌이 상인 마르코 폴로가 합류했고, 옛 소련 캡슐에서 깨어난 가가린도 우리 편이 됐다.\n\n신호의 근원을 쫓다 알아냈다. 지구는 아직 봉쇄돼 있다 — 치크스 제국과 그들의 우두머리 우르사 메이저에 의해. 그리고 이순신 장군의 캡슐 좌표를 확보했다. 47 우르사이 마요리스 b. 치크스의 심장부다.\n\n사령관은 망설이지 않았다. "가자." 나는 그 한마디에 모든 걸 걸기로 했다.`,
      en:`100 years, 3 months, 12 days. That was how long the Commander slept. Energy at 7%, the hangar full of dust. I woke them anyway.\n\nWe scavenged scrap on Proxima b to reboot the {ship}, made our first trade at Wolf Station, and obtained an intel chip at golden Aureus. The wandering merchant Marco Polo joined us, and Gagarin — awakened from an old Soviet capsule — took our side.\n\nChasing the signal's source, I learned the truth: Earth is still blockaded — by the Chiks Empire and their lord, Ursa Major. And we secured the coordinates of Admiral Yi Sun-sin's capsule: 47 Ursae Majoris b, the heart of Chiks territory.\n\nThe Commander didn't hesitate. "Let's go." I bet everything on that one word.`
    },
    2: {
      title: { ko:'제2지 — 결집 (행성 6~10)', en:'Log II — Gathering (Planets 6–10)' },
      ko:`치크스의 영역은 보라빛 독기로 뒤덮여 있었다. 아우레우스 정보 칩은 치크스 주파수로 변조돼 있어, 밀무역상의 통신 장비로 겨우 해독했다.\n\n칩이 가리킨 곳은 Kepler-22b — 치크스가 외곽 항로 봉쇄를 떠넘긴 용병 군벌, 크리그의 거점이었다. 그 지하 감옥에 이순신 장군이 수백 년째 봉인돼 있었다. 치크스와 우르사 메이저가 지구를 봉쇄하던 그때, 끝까지 저항했던 단 한 사람. 그의 전술 데이터는 강제로 추출돼 크리그 방어 알고리즘의 '살아있는 방패'가 돼 있었다.\n\n우리는 그를 꺼냈다. 이순신 장군이 깨어나자 적의 알고리즘에 균열이 가기 시작했다. 그리고 그 순간, 치크스의 봉쇄 집행관이 모습을 드러냈다 — 크리그의 아이젠클로. 우르사 메이저의 손발에 불과한 자였다. 우리는 첫 대면 후 전략적으로 철수했다. 진짜 적은 그 너머에 있었다 — 치크스의 우르사 메이저. 아직은 때가 아니었다.`,
      en:`Chiks space was drowned in purple toxic haze. The Aureus chip was scrambled on Chiks frequencies; only a smuggler's comms gear could decode it.\n\nIt pointed to Kepler-22b — the stronghold of Krieg, the mercenary warlords the Chiks had subcontracted to choke the outer lanes. In its dungeon, Admiral Yi Sun-sin had been sealed for centuries. When the Chiks and Ursa Major blockaded Earth, he alone resisted to the end. His tactical data had been forcibly extracted to become the "living shield" of Krieg's defense algorithm.\n\nWe pulled him out. The moment he awoke, cracks spread through the enemy's algorithm. And then the Chiks' blockade enforcer revealed himself — Eisenklau of the Krieg, nothing more than a hand of Ursa Major. After that first encounter, we withdrew by design. The true enemy lay beyond him: Ursa Major of the Chiks. It was not yet time.`
    },
    3: {
      title: { ko:'제3지 — 연대 (행성 11~15)', en:'Log III — Solidarity (Planets 11–15)' },
      ko:`이순신 장군이 옛 전우들의 후예를 기억해냈다. 케플러-62e 지하, 저항군의 에코 기지. 그들은 지구에서 쫓겨난 사람들 — 봉쇄 이전, 이순신 장군과 함께 맞서 싸웠던 선조들의 후손이었다.\n\n저항군 총사령관 레인저 맥시모프와 연대 협약을 맺었다. 하지만 기쁨도 잠시, 그들의 보급망에 크리그 이중 스파이 '오그렌'이 숨어 있었다. 우리는 첩자를 색출해 격퇴했다.\n\n그리고 이곳에서 천재 기술자 장영실이 합류했다. 그가 말했다. "거북선 — 내 손으로 완성시키겠소." 저항군의 반물질 비축분과 거북선 설계도. 우리는 마침내 전설의 함선을 만들 열쇠를 손에 넣었다. 아이젠클로의 다음 거점은 Kepler-442b. 추격이 시작됐다.`,
      en:`Yi Sun-sin remembered the descendants of his old comrades — the Echo Base of the Resistance, deep beneath Kepler-62e. They were the exiles of Earth, heirs of those who once fought beside him before the blockade.\n\nWe forged an alliance with Resistance commander Ranger Maximov. But joy was brief: a Krieg double agent, "Ogren," had infiltrated their supply lines. We rooted out the spy and drove him off.\n\nHere, the genius engineer Jang Yeong-sil joined us. He declared, "The Turtle Ship — I shall complete it with my own hands." The Resistance's antimatter stockpile and the Turtle Ship blueprint — at last we held the key to building the legendary vessel. Eisenklau's next stronghold: Kepler-442b. The pursuit began.`
    },
    4: {
      title: { ko:'제4지 — 거북선 (행성 16~20)', en:'Log IV — The Turtle Ship (Planets 16–20)' },
      ko:`포지 행성 Kepler-442b. 마그마가 끝없이 솟구치는 크리그의 무기 공장. 치크스에 납품할 생체 병기 핵심 코어를 아이젠클로가 직접 찍어내던 곳이다.\n\n공장 노동자들 사이에 반란의 불씨가 있었다. 우리는 그들과 손잡고 내부에서 균열을 키웠다. 그 혼란 속에서 장영실이 마침내 거북선(LGD01)을 완성했다. 수리비 40% 할인, 탐색 안개 제거 — 그 위용은 적들에게 공포 그 자체였다.\n\n경매장에서는 광개토대왕의 유산을 낙찰받아, 그 위대한 정복왕마저 우리 깃발 아래 모였다. 이제 함대는 전설의 영웅들로 가득 찼다. 우르사 메이저로 가는 길목 — 그 봉쇄 집행관 아이젠클로를 끝장낼 때가 다가왔다.`,
      en:`The forge world Kepler-442b — a Krieg weapons factory where magma erupts without end, where Eisenklau stamped out bioweapon cores to supply the Chiks.\n\nAmong the factory workers smoldered the embers of rebellion. We joined them and widened the cracks from within. In that chaos, Jang Yeong-sil finally completed the Turtle Ship (LGD01) — 40% cheaper repairs, fog of exploration cleared, its presence sheer terror to our foes.\n\nAt auction we won the legacy of Gwanggaeto the Great, and even that great conqueror-king gathered beneath our banner. Now the fleet brimmed with legendary heroes. The road to Ursa Major lay ahead — and the time to finish her blockade enforcer, Eisenklau, was drawing near.`
    },
    5: {
      title: { ko:'제5지 — 결전 (행성 21~25)', en:'Log V — The Decisive Battle (Planets 21–25)' },
      ko:`아레스-III, 어둠의 요새. 크리그 방어 포대 40기가 행성을 뒤덮었지만, 거북선을 선두로 저항군-수퍼비아 연합 함대가 전열을 갖췄다.\n\n"전 함대 — 거북선을 따른다." 이순신 장군의 명령과 함께 우리는 치크스의 봉쇄 집행관 아이젠클로를 무너뜨렸다. 그를 격파하자 천재 물리학자 이휘소 박사가 합류했고, 심연 깊은 곳에서 세종 AI의 흔적도 발견했다.\n\n하수인을 치웠으니, 이제 그 주인 차례였다. 모든 길의 끝 — 우르사 메이저. 100년간 지구를 틀어막았던 치크스의 우두머리. HP 5,000,000, 5페이즈에 걸친 사투 끝에 우리는 그를 격파했다. 지구의 봉쇄가 풀렸다. 사령관은 위대한 화랑이 되어, 함대를 이끌고 마침내 지구로 돌아왔다.`,
      en:`Ares-III, the Fortress of Darkness. Forty Krieg defense batteries blanketed the world, yet led by the Turtle Ship, the Resistance-Superbia allied fleet formed up.\n\n"All ships — follow the Turtle Ship." With Yi Sun-sin's command, we brought down Eisenklau, the Chiks' blockade enforcer. With his defeat, the genius physicist Dr. Lee Hwi-so joined us, and in the depths we found traces of the Sejong AI.\n\nThe lackey was cleared; now came his master. At the end of every road — Ursa Major. The Chiks lord who had choked Earth for 100 years. HP 5,000,000, a struggle across five phases, and we defeated him. Earth's blockade was lifted. The Commander became the great Hwarang and, leading the fleet, finally returned to Earth.`
    },
    6: {
      title: { ko:'제6지 — 총독 시대 (행성 26~30)', en:'Log VI — The Governor Era (Planets 26–30)' },
      ko:`지구 귀환 후 3개월. 우르사 메이저가 사라진 은하계엔 거대한 정치 공백이 남았다. 대연합 총회는 결의했다 — 모든 팩션이 {회사}를 유일한 중립 총독 세력으로 인정한다고.\n\n프록시마 b부터 글리제 581g 균열까지, 우리는 행성별 총독 경매로 은하 전역의 관할권을 인수했다. 수퍼비아 의회가 가장 먼저 행성을 이전했고, 세수입의 일부는 원래 팩션에 배분하는 조건이었다.\n\n하지만 평화는 끝이 아니었다. 보이드의 심연에서 블랙팔콘의 전령 레이든이 나타났고, 균열 너머에서 새로운 위협이 꿈틀댔다. 우르사 메이저는 시작에 불과했는지도 모른다. 그래도 — 사령관과 나, 백구가 함께라면 두렵지 않다. 우리의 항해는 계속된다.`,
      en:`Three months after returning to Earth. With Ursa Major gone, a vast political vacuum remained across the galaxy. The Grand Coalition Assembly resolved that every faction would recognize {company} as the sole neutral Governor power.\n\nFrom Proxima b to the Gliese 581g Rift, we took over jurisdiction across the galaxy through planetary governor auctions. The Superbia Council was the first to transfer its worlds, on the condition that a share of tax revenue be returned to the original factions.\n\nBut peace was not the end. From the Void Abyss appeared Raiden, herald of the Black Falcon, and beyond the rift a new threat stirred. Perhaps Ursa Major was only the beginning. Even so — as long as the Commander and I, Baekgu, are together, I fear nothing. Our voyage continues.`
    }
  };
  console.log('[baekgu-diary] Loaded — 6 phase logs');
})();
