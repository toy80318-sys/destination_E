// ══════════════════════════════════════════════════════════════════
// BAEKGU CHAT — 백구 챗봇/힌트 (game.js 에서 분할, 2026-06-16: 긴 파일 분할)
//   askBaekgu(키워드 Q&A) · randomBaekgu(상황별 대사) · getBaekguStoryHint(ACT별 진행 힌트)
//   ※ 일반 스크립트(전역) — game.js·HTML onclick이 미한정 이름으로 호출하므로 IIFE 금지.
//   로드 위치: index.html 에서 game.js 직후 (호출은 모두 런타임).
//   의존(전역): G·I18N·baekgu·PLANET_DEF·FACTION·COMMODITIES·FACTION_MATS·calcPlayerLevel·
//             hasBlinkOnAll·WARP_ENGINE_IDS·getMaxCrewCount·commDisplayNm 등 (호출 시점 해소).
// ══════════════════════════════════════════════════════════════════

function askBaekgu(){
  const inp=document.getElementById('bk-ask-input');
  if(!inp)return;
  const q=(inp.value||'').trim();
  if(!q){baekgu(I18N.t('baekgu.askMore'));inp.focus();return;}
  // 유저 질문 표시
  const msgs=document.getElementById('bk-msgs');
  if(msgs){
    const now=new Date();const ts=now.getHours().toString().padStart(2,'0')+':'+now.getMinutes().toString().padStart(2,'0');
    const qEl=document.createElement('div');qEl.className='bk-msg';
    qEl.innerHTML=`<span class="bk-ts" style="color:var(--muted);font-size:11px;margin-right:4px">${ts}</span><span style="color:rgba(200,220,255,.7)">📡 ${q}</span>`;
    msgs.appendChild(qEl);while(msgs.children.length>12)msgs.removeChild(msgs.firstChild);msgs.scrollTop=msgs.scrollHeight;
  }
  inp.value='';
  // 키워드 매칭 힌트
  const Q=q.toLowerCase();
  const KW=[
    // 크레딧/돈
    {k:['크레딧','돈','자금','수입','벌','earn','credit','credits','money','income','gold'],r:()=>I18N.t('chatbot.creditsTip')},
    // 제작 재료·특산물이 많이 나오는 행성 (사용자 요청 2026-06-16) — 일반 무역 팁보다 먼저 매칭
    {k:['재료가 많','재료 많','특산물 많','재료 행성','특산물 행성','어디서 재료','재료 어디','특산물 어디','재료 구','특산물 구','어느 행성','어떤 행성','재료 나오','특산물 나오','where material','material planet','specialty planet','which planet','where specialty','where to buy','material source','rich planet'],r:()=>{
      try{
        const order=['F01','F02','F03','F04','F05','F06','F07'];
        const lines=[];
        order.forEach(fac=>{
          const matId=(typeof FACTION_MATS!=='undefined')?FACTION_MATS[fac]:null; if(!matId)return;
          const mat=(COMMODITIES||[]).find(c=>c.id===matId); if(!mat)return;
          const facNm=(FACTION[fac]&&FACTION[fac].nm)||fac;
          const planets=(PLANET_DEF||[]).filter(p=>p.f===fac);
          const known=planets.filter(p=>{const st=G.planets[p.id];return st&&st.fog!=='L';});
          const pick=(known.length?known:planets).slice(0,2).map(p=>p.nm).join(', ');
          const _matNm=(typeof commDisplayNm==='function')?commDisplayNm(mat):mat.nm;
          lines.push(I18N.t('chatbot.matPlanetItem',{ic:mat.ic||'📦',mat:_matNm,fac:facNm,planets:pick||'?'}));
        });
        const explored=(PLANET_DEF||[]).filter(p=>{const st=G.planets[p.id];return st&&st.fog!=='L';}).length;
        return I18N.t('chatbot.matPlanetHeader')+'\n'+lines.join('\n')+'\n\n'+I18N.t('chatbot.matPlanetFooter',{n:explored});
      }catch(e){return I18N.t('chatbot.tradeTip');}
    }},
    // 무역
    {k:['무역','특산물','상품','거래','trade','specialty','goods','merchant','commerce'],r:()=>I18N.t('chatbot.tradeTip')},
    // 함선
    {k:['함선','배','ship','거래소','중형','대형','전설기함','ships','exchange','fleet','large','medium','flagship'],r:()=>I18N.t('chatbot.shipShopTip')},
    // 파츠/장착
    {k:['파츠','part','무기','실드','장갑','엔진','장착','업그레이드','parts','weapon','shield','armor','engine','equip','upgrade'],r:()=>I18N.t('chatbot.partsTip')},
    // 크루/동료
    {k:['크루','동료','영입','가챠','뽑기','crew','companion','recruit','gacha','tavern','roll'],r:()=>I18N.t('chatbot.crewTip',{n:getMaxCrewCount()})},
    // 영웅
    {k:['영웅','hero','특수','스킬','능력','heroes','skill','ability','legend','legendary','영입처','영웅위치','where hero','hero location'],r:()=>{
      const hc=(G.heroes||[]).length;
      let msg=I18N.t('chatbot.heroTip',{hc});
      try{
        const _unrec=(PLANET_DEF||[]).filter(p=>p.hero&&!(G.heroes||[]).includes(p.hero));
        if(_unrec.length){
          const _list=_unrec.map(p=>I18N.t('chatbot.heroLocItem',{hero:I18N.t('hero.'+p.hero+'.nm'),planet:p.nm,ring:p.ring})).join('\n');
          msg += '\n'+I18N.t('chatbot.heroLocHeader',{n:_unrec.length})+'\n'+_list;
        } else {
          msg += '\n'+I18N.t('chatbot.heroLocAllDone');
        }
      }catch(e){}
      return msg;
    }},
    // 행성 허브 잠금
    {k:['잠금','허브','개방','시설','unlock','hub','open','facility','lock','locked'],r:()=>{const pid=G.currentPlanet,prog=getPlanetHubProgress(pid),thr=getPlanetHubThreshold(pid);const unlocked=isPlanetHubUnlocked(pid);const pd=PLANET_DEF.find(p=>p.id===pid);const isSup=pd?.f==='F01';return I18N.t('chatbot.hubProgress',{prog,thr,done:unlocked?I18N.t('chatbot.hubDone'):'',scale:isSup?I18N.t('chatbot.hubScaleSup'):I18N.t('chatbot.hubScaleStd')});}},
    // 행성/탐험
    {k:['행성','탐험','지도','경로','항로','fog','안개','어둠','planet','planets','explore','exploration','map','route','path'],r:()=>I18N.t('chatbot.travelTip')},
    // 퀘스트
    {k:['퀘스트','임무','quest','수락','보상','quests','mission','missions','accept','reward','rewards'],r:()=>I18N.t('chatbot.questTip')},
    // 거북선 설계도 단편 위치 (사용자 요청) — 일반 '설계도' 항목보다 먼저 매칭
    {k:['거북선','거북선 설계도','거북선 도면','설계도 위치','거북선 위치','turtle','geobukseon','turtle ship','turtle blueprint'],r:()=>{
      try{
        const G=window.G;
        const bp=G.geobukseonBP||{p1:0,p2:0,p3:0};
        const frags=[{key:'p1',item:'turtleBP1'},{key:'p2',item:'turtleBP2'},{key:'p3',item:'turtleBP3'}];
        const lines=frags.map((f,i)=>{
          const have=(bp[f.key]||0)>0;
          let pid=null;
          for(let ph=1;ph<=6&&!pid;ph++){
            const Q2=window['PHASE'+ph+'_QUESTS']; if(!Q2)continue;
            for(const p in Q2){ if((Q2[p]||[]).some(t=>t&&(t.rewardItems||[]).some(r=>r&&r.id===f.item))){pid=p;break;} }
          }
          const pnm=pid?I18N.t('planet.'+pid+'.nm'):I18N.t('gate.unknownPlace');
          return I18N.t('chatbot.turtleBpItem',{n:i+1,planet:pnm,status:have?I18N.t('chatbot.turtleHave'):I18N.t('chatbot.turtleNeed')});
        });
        const got=frags.filter(f=>(bp[f.key]||0)>0).length;
        return I18N.t('chatbot.turtleBpHeader',{got})+'\n'+lines.join('\n');
      }catch(e){return I18N.t('chatbot.bpTip');}
    }},
    // 설계도/제작
    {k:['설계도','제작','craft','만들기','전설 아이템','신화 아이템','제작소','blueprint','make','factory','crafting','mythic item','legend item'],r:()=>I18N.t('chatbot.bpTip')},
    // 보이드
    {k:['보이드','void','에센스','균열','7링','essence','rift','ring 7','ring7'],r:()=>I18N.t('ui.voidEssenceTip')},
    // 치크스/전투
    {k:['치크스','chix','적','전투','combat','싸움','chiks','enemy','enemies','fight','battle'],r:()=>I18N.t('ui.cheeksRuleTip')},
    // 보스/최종전
    {k:['보스','boss','우르사','최종','지구','해방','ursa','final','earth','liberation','liberate'],r:()=>{const hc=(G.heroes||[]).length,fc=G.fleet.length,cr=G.credits;return I18N.t('chatbot.finalCondition',{hc,fc,cr:cr.toLocaleString()});}},
    // 경매/행성 구매
    {k:['경매','행성 구매','부동산','auction','소유','세금','real estate','own','tax','buy planet'],r:()=>{const rep=G.reputation||0,max=1+Math.floor(rep/10);return I18N.t('chatbot.planetAuctionTip',{max,rep});}},
    // 저장/불러오기
    {k:['저장','세이브','save','불러오기','load','슬롯','saving','loading','slot','slots'],r:()=>I18N.t('chatbot.saveTip')},
    // 블링크 엔진
    {k:['블링크','blink','순간이동','워프','warp','teleport','jump'],r:()=>I18N.t('ui.blinkEngineTip')},
    // 명성/평판
    {k:['명성','평판','reputation','랭크','레벨','fame','rank','level'],r:()=>{const lv=calcPlayerLevel(),rep=G.reputation||0;return I18N.t('chatbot.repTip',{lv,rep});}},
    // 해적
    {k:['해적','pirate','약탈','항로','조우','pirates','raid','plunder','encounter'],r:()=>I18N.t('chatbot.pirateTip')},
    // 나포
    {k:['나포','포획','capture','적 함선','captured','enemy ship','seize'],r:()=>I18N.t('ui.captureRuleTip')},
    // 힌트/도움
    {k:['힌트','help','도움','뭐','어떻게','모르겠','어디','hint','what','how','where','dont know',"don't know",'guide','tip'],r:()=>getBaekguStoryHint()},
  ];
  const pd=PLANET_DEF.find(p=>p.id===G.currentPlanet);
  // 현재 행성 관련 질문 (KO/EN)
  if(Q.includes('여기')||Q.includes('이 행성')||Q.includes('현재')||Q.includes('지금')||Q.includes('here')||Q.includes('this planet')||Q.includes('current')||Q.includes('now')){
    const fac=pd?FACTION[pd.f]:null;
    setTimeout(()=>baekgu(I18N.t('baekgu.locationInfo',{nm:pd?.nm||'?',fac:fac?.nm||'?',ring:pd?.ring||'?'})),300);
    return;
  }
  let found=false;
  for(const entry of KW){
    if(entry.k.some(k=>Q.includes(k))){
      const ans=typeof entry.r==='function'?entry.r():entry.r;
      setTimeout(()=>baekgu(ans),300);
      found=true;break;
    }
  }
  // 시나리오 인물(영웅) 이름으로 직접 질문 시 위치/합류 상태 안내 (사용자 요청: 인물·아이템·함선 물어보면 알려주기)
  if(!found){
    try{
      for(const hid of Object.keys(HEROES||{})){
        const hnm=(I18N.t('hero.'+hid+'.nm')||'').toLowerCase();
        if(hnm&&hnm.length>=2&&Q.includes(hnm)){
          const has=(G.heroes||[]).includes(hid);
          const pdh=(PLANET_DEF||[]).find(p=>p.hero===hid);
          const _hNm=I18N.t('hero.'+hid+'.nm');
          let ans;
          if(has)ans=I18N.t('chatbot.heroAlreadyJoined',{hero:_hNm});
          else if(pdh)ans=I18N.t('chatbot.heroWhere',{hero:_hNm,planet:pdh.nm,ring:pdh.ring||'?'});
          else ans=I18N.t('chatbot.heroWhereEvent',{hero:_hNm});
          found=true;setTimeout(()=>baekgu(ans),300);break;
        }
      }
    }catch(e){}
  }
  // 시나리오 아이템/함선 이름으로 질문 시 산출처 안내 (PHASE 퀘스트 보상 역참조)
  if(!found){
    try{
      const COMMS=(typeof COMMODITIES!=='undefined')?COMMODITIES:[];
      let hitItem=null;
      for(const c of COMMS){ const cn=((typeof commDisplayNm==='function'?commDisplayNm(c):c.nm)||'').toLowerCase(); if(cn&&cn.length>=2&&Q.includes(cn)){hitItem=c;break;} }
      if(hitItem){
        let pid=null;
        const _qMatch=t=>t&&((t.rewardItems||[]).some(r=>r&&r.id===hitItem.id)||(t.objectives||[]).some(o=>o&&o.item===hitItem.id));
        for(let ph=1;ph<=6&&!pid;ph++){ const Q2=window['PHASE'+ph+'_QUESTS']; if(!Q2)continue; for(const p in Q2){ if((Q2[p]||[]).some(_qMatch)){pid=p;break;} } }
        const _inm=(typeof commDisplayNm==='function')?commDisplayNm(hitItem):hitItem.nm;
        const ans=pid?I18N.t('chatbot.itemWhere',{item:_inm,planet:I18N.t('planet.'+pid+'.nm')}):I18N.t('chatbot.itemWhereTrade',{item:_inm});
        found=true;setTimeout(()=>baekgu(ans),300);
      }
    }catch(e){}
  }
  if(!found){
    const fallbacks=[
      I18N.t('chatbot.unknownAsk',{q}),
      I18N.t('chatbot.fallbackVague',{q}),
      I18N.t('chatbot.unclearAsk')
    ];
    setTimeout(()=>baekgu(fallbacks[Math.floor(Math.random()*fallbacks.length)]),300);
  }
}
function randomBaekgu(key){
  const m={
    travel:[I18N.t('baekgu.travel1'),I18N.t('baekgu.travel2')],
    combat_win:[I18N.t('baekgu.cwin1'),I18N.t('baekgu.cwin2')],
    combat_lose:[I18N.t('baekgu.close1'),I18N.t('baekgu.close2')],
    gacha_hero:[I18N.t('baekgu.gachaHero1')],
    gacha_legend:[I18N.t('baekgu.gachaLegend1')],
    low_credits:[I18N.t('baekgu.lowCred1')]
  };
  const arr=m[key];if(arr)baekgu(arr[Math.floor(Math.random()*arr.length)]);
}

// 스토리 진행 힌트 — 게임 상태 기반 맥락형
function getBaekguStoryHint(){
  const plv=calcPlayerLevel();
  const ownedCount=Object.values(G.planets).filter(p=>p.owned).length;
  const heroCount=G.heroes.length;
  const fleetSize=G.fleet.length;
  const blink=hasBlinkOnAll();
  const chix=G.chixWaves||0;
  const rep=G.reputation||0;
  // 최우선 1: 워프 엔진 미완성 유도 (소소한 미흡 안내)
  if(fleetSize>1&&!blink){
    const lacking=G.fleet.filter(s=>!(s.parts||[]).some(pid=>WARP_ENGINE_IDS.includes(pid))).length;
    return I18N.t('hint.warpEngineNeeded',{lacking});
  }
  // ACT 1 힌트 (조건: 20턴 안에 ACT 2 진입)
  if(G.act===1){
    if(heroCount===0)return I18N.t('hint.act1.firstHero');
    if(fleetSize<3)return I18N.t('hint.act1.fleet3');
    if(G.credits<50000)return I18N.t('hint.act1.credits50k');
    if(ownedCount===0)return I18N.t('hint.act1.ownPlanet1');
    return I18N.t('hint.act1.goal',{turn:G.turn,plv});
  }
  // ACT 2 힌트 (조건: 40턴 안에 ACT 3 진입)
  if(G.act===2){
    if(heroCount<4)return I18N.t('hint.act2.hero4',{heroCount});
    if(chix===0)return I18N.t('hint.act2.chixFirst');
    if(ownedCount<3)return I18N.t('hint.act2.own3',{ownedCount});
    if(rep<100)return I18N.t('hint.act2.rep100',{rep});
    if(chix>=5)return I18N.t('hint.act2.chix5',{turnsLeft:40-G.turn,chix});
    return I18N.t('hint.act2.goal',{turn:G.turn});
  }
  // ACT 3 힌트 (조건: 60턴 자동 ACT 4 또는 우르사 메이저 격파)
  if(G.act===3){
    // 치크스(F05) 적대 행성 P17~P21 — 신규 행성명 + 구명(기존 세이브 전투기록 호환) 모두 매칭. 사용자 요청 2026-06-16.
    const _cheeksNames=['치크스','chiks','하이브','hive','카토닉','catonic','우르사 알파','ursa alpha','오미크론','omicron','코사크','cossack',
      'toi','케플러-452','kepler-452','우르사-알파','ursa-alpha','타이탄-x','titan-x'];
    const cheeksCleared=(G.combatHistory||[]).filter(c=>{const _pl=(c.planet||'').toLowerCase();return c.win&&_cheeksNames.some(h=>_pl.includes(h));}).length;
    if(heroCount<8){const m=8-heroCount;return I18N.t('hint.act3.heroN8',{heroCount,remaining:m});}
    if(cheeksCleared===0)return I18N.t('hint.act3.cheeksFirst');
    if(cheeksCleared<5)return I18N.t('hint.act3.cheeksProg',{cleared:cheeksCleared,remaining:5-cheeksCleared});
    if(fleetSize<6)return I18N.t('hint.act3.fleet6',{fleetSize});
    if(G.credits<500000)return I18N.t('hint.act3.credits500k',{credits:G.credits.toLocaleString()});
    if(!G.voidCrystal||G.voidCrystal<1)return I18N.t('hint.act3.voidCrystal');
    return I18N.t('hint.act3.ready');
  }
  // ACT 4 힌트 (엔드게임)
  if(G.act>=4){
    if(ownedCount<20)return I18N.t('hint.act4.planet20',{ownedCount,rep,needed:Math.max(0,30-rep%10)});
    const _ursaCap=G.fleet.some(s=>s.id&&s.id.startsWith('BOSS_URSA'))||G.reserveFleet?.some(s=>s.id&&s.id.startsWith('BOSS_URSA'));
    if(!_ursaCap)return I18N.t('hint.act4.ursaShip');
    if(heroCount<8)return I18N.t('hint.act4.hero8',{heroCount});
    return I18N.t('hint.act4.endgame');
  }
  return I18N.t('hint.default');
}
