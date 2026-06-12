// ═══════════════════════════════════════════════════════════════════
// DESTINATION EARTH — 주점 가챠 모듈 (Phase A3)
//   · game.js 에서 분할 (2026-06-10, 사용자 요청: 긴 파일 분할)
//   · doGacha — 주점 모집 (크레딧/VE 기반, 등급 가중치, 천장)
//
// 공개 함수 (window.* 노출):
//   · doGacha(n, useCr, crCost, minRarity, veCost)
//     - HTML onclick 호출 (tavern.js:577~580 에서 가챠 버튼 4종)
//     - n: 뽑기 횟수 (1 또는 5)
//     - useCr: true=크레딧, false=VE
//     - crCost: 크레딧 비용
//     - minRarity: 최소 등급 보장 (N/R/H/L)
//     - veCost: VE 비용 (지정 시 useCr 무관)
//
// 의존 글로벌 (window.*):
//   · G, I18N, HEROES
//   · CREW_NAME_TABLE, CREW_RARITY_TABLE 등 가챠 풀
//   · notify, baekgu, saveGame, rerenderTab, openModal, closeModal
//   · _genCrewByRarity (크루 인스턴스 생성)
// ═══════════════════════════════════════════════════════════════════
(function(){
if(typeof window==='undefined')return;
if(window._GACHA_LOADED)return;
window._GACHA_LOADED=true;

// ── 주점 가챠 ─────────────────────────────────────────────────────
function doGacha(n,useCr,crCost,minRarity,veCost){
  if(!G.gachaPity)G.gachaPity=0;
  const _crCost=crCost||500;
  // 사용자 요청 2026-06-07: VE 기반 모집 지원 (5번째 파라미터)
  //   veCost 가 지정되면 VE 차감, useCr 과 무관
  if(veCost){
    // 버그수정 2026-06-11: 미등록 키 notify.notEnoughVoidEssence → 기존 키 needVoidEssence 사용 (키 문자열 그대로 노출되던 문제)
    if((G.voidEssence||0)<veCost){notify(I18N.t('notify.needVoidEssence',{n:veCost}),'err');return;}
    G.voidEssence-=veCost;
  } else if(useCr){
    if(G.credits<_crCost){notify(I18N.t('notify.notEnoughCreditsLong'),'err');return;}
    G.credits-=_crCost;
  } else {
    if(G.voidCrystal<n){notify(I18N.t('notify.notEnoughVoidCrystal'),'err');return;}
    G.voidCrystal-=n;
  }
  try{AudioMgr.playSfx('gacha_pull');}catch(e){}
  // 사용자 요청 (2026-06-06): 넬슨(H05) 보유 시 전설 확률을 3% (10.5% → 3%로 하향),
  //   영웅 1명 영입할 때마다 추가 +1%p 누적. 최대 8인 영입 시 3 + 8 = 11%.
  const hasNelson=G.heroes&&G.heroes.includes('H05');
  const _heroAcqCnt=(G.heroes||[]).filter(h=>/^H0[1-8]$/.test(h)).length;
  const results=[];
  const CLASSES=['Pilot','Eng','Merch'];
  for(let pull=0;pull<n;pull++){
    G.gachaPity++;
    const pity=G.gachaPity;
    // 확률 계산: 전설(L), 영웅(H), 희귀(R), 일반(N)
    //   · Nelson 미보유: 기본 0.5%
    //   · Nelson 보유:    3% + 1%×영웅수
    let pL=(hasNelson?(0.03+0.01*_heroAcqCnt):0.005)+(pity>=80?1:pity>=60?(pity-60)/20*0.495:0);
    // minRarity 기반 확률 재조정
    const _minR=minRarity||'N';
    let pH=0.055,pR=0.24;
    if(_minR==='R'){// 희귀~전설: 일반 제거 → pR = 1-pL-pH
      pR=Math.max(0.4,1-pL-pH);pH=Math.min(pH,1-pL-pR);
    } else if(_minR==='H'){// 영웅~전설: 일반+희귀 제거 → pH = 1-pL
      pH=Math.max(0.55,1-pL);pR=0;
    } else if(_minR==='L'){// 전설 확정
      pL=1;pH=0;pR=0;
    }
    const roll=Math.random();
    let rarity;
    if(roll<pL){rarity='L';G.gachaPity=0;}
    else if(roll<pL+pH){rarity='H';}
    else if(roll<pL+pH+pR){rarity='R';}
    else{rarity=_minR==='N'?'N':'R';}
    // 크루 생성
    const statMul={N:1,R:1.5,H:2.5,L:4}[rarity];
    const cl=CLASSES[Math.floor(Math.random()*CLASSES.length)];
    let newCrew;
    if(rarity==='L'){
      // 전설 등급 — 가챠 영웅 등장 제거됨 (사용자 요청 2026-06-07)
      // 영웅은 이제 보라색 특별 퀘스트로만 영입 (일반 퀘스트 8회마다 자동 등장)
      // → 가챠는 전설 동료 풀(QUEST_LEGEND_CREW)로만 진행
      // 전설은 QUEST_LEGEND_CREW 풀에서
      const pool=(typeof QUEST_LEGEND_CREW!=='undefined'?QUEST_LEGEND_CREW:[]).filter(c=>!G.crew.find(x=>x.id===c.id));
      if(pool.length>0){
        const base=pool[Math.floor(Math.random()*pool.length)];
        newCrew={...base,id:base.id+'_g'+Date.now()+'_'+pull};
      }
    }
    if(!newCrew){
      // NPC_POOL에서 랜덤 선택 또는 생성
      const npcPool=typeof NPC_POOL!=='undefined'?NPC_POOL:[];
      const base=npcPool.length>0?npcPool[Math.floor(Math.random()*npcPool.length)]:{nm:I18N.t('crew.spaceNomad'),cl:'Pilot',ic:'🧑',f:'F01'};
      const baseDEX={Pilot:30,Eng:15,Merch:20}[cl]||20;
      const baseINT={Pilot:15,Eng:30,Merch:25}[cl]||20;
      const baseTEC={Pilot:20,Eng:30,Merch:15}[cl]||20;
      const baseSTR={Pilot:30,Eng:15,Merch:20,Sniper:40,Mage:15,Engineer:10,Commander:25}[cl]||20;
      const baseDEX2={Pilot:20,Eng:30,Merch:15,Sniper:10,Mage:20,Engineer:35,Commander:20}[cl]||20;
      const baseINT2={Pilot:15,Eng:30,Merch:25,Sniper:10,Mage:40,Engineer:25,Commander:20}[cl]||20;
      const baseDEF={Pilot:10,Eng:15,Merch:8,Sniper:5,Mage:20,Engineer:25,Commander:20}[cl]||10;
      newCrew={
        id:'gc_'+Date.now()+'_'+pull+'_'+Math.floor(Math.random()*9999),
        nm:base.nm,_nmKey:base._nmKey,cl:cl,ic:base.ic||'🧑',f:base.f||'F01',
        rarity,
        STR:Math.round(baseSTR*statMul),ATT:Math.round(baseDEX2*statMul),
        INT:Math.round(baseINT2*statMul),DEF:Math.round(baseDEF*statMul),
        HP:Math.round(80*statMul),LOY:Math.round(60+Math.random()*40)
      };
    }
    if(!G.crew)G.crew=[];
    const _maxCrew=getMaxCrewCount();
    if(G.crew.length>=_maxCrew){
      // 신규 크루가 현재 최하위보다 등급이 높으면 교체 팝업 제안
      const RORDER={L:4,H:3,R:2,N:1};
      const newRank=RORDER[newCrew.rarity]||1;
      // 함선 탑승 여부 무관 — 모든 크루 중 최하위를 교체 후보로 선정 (탑승 중이라도 강제 교체)
      const assignedIds=new Set(G.fleet.flatMap(s=>s.crewIds||[]));
      const lowest=[...G.crew].sort((a,b)=>{
        const ra=RORDER[a.rarity]||1,rb=RORDER[b.rarity]||1;
        if(ra!==rb)return ra-rb;
        // 동등급이면 미배정 우선 (탑승 중인 크루는 후순위)
        return (assignedIds.has(a.id)?1:0)-(assignedIds.has(b.id)?1:0);
      })[0];
      const lowestRank=lowest?RORDER[lowest.rarity]||1:0;
      // 신규 크루가 최하위보다 등급이 더 높을 때만 교체 제안
      if(lowest&&newRank>lowestRank){
        results.push({...newCrew,_swapCandidate:true,_swapTarget:lowest});
      } else if(lowest){
        // 같은 등급이라도 탑승 중이 아닌 경우 교체 제안 (기존 동작 유지)
        if(!assignedIds.has(lowest.id)){
          results.push({...newCrew,_swapCandidate:true,_swapTarget:lowest});
        } else {
          notify(I18N.t('notify.crewListFullBetter',{max:_maxCrew}),'err');
          results.push({...newCrew,_rejected:true});
        }
      } else {
        notify(I18N.t('notify.crewListFullSimple',{max:_maxCrew}),'err');
        results.push({...newCrew,_rejected:true});
      }
      continue;
    }
    G.crew.push(newCrew);
    results.push(newCrew);
  }
  updateHUD();
  // 교체 후보 처리: 팝업 띄우기
  const swapCandidates=results.filter(r=>r._swapCandidate);
  if(swapCandidates.length>0){
    const sc=swapCandidates[0];
    const RARCOL={L:'var(--gold)',H:'var(--purple)',R:'var(--blue)',N:'var(--dim)',S:'#ff6ec7'};
    const CREW_BONUS_LBL={Pilot:{att:8,int2:2,tec:4},Eng:{att:2,int2:5,tec:8},Merch:{att:3,int2:7,tec:4},Sniper:{att:10,int2:0,tec:3},Mage:{att:0,int2:10,tec:3},Engineer:{att:1,int2:3,tec:10},Commander:{att:5,int2:5,tec:5}};
    const tgt=sc._swapTarget;
    function _crewCard(c,roleColor,roleBg,roleLabel){
      const rar=c.rarity||'N';
      const rcol=RARCOL[rar]||'var(--dim)';
      const rlbl=I18N.rarity(rar)||rar;
      const cl=c.cl||'-';
      const mult=RARITY_MULT[rar]||1;
      const cb=CREW_BONUS_LBL[cl]||{att:3,int2:3,tec:3};
      const bonusTxt=['att','int2','tec'].filter(k=>cb[k]>0)
        .map(k=>`${k.replace('int2','SHD').replace('att','ATT').replace('tec','ENG')}+${Math.round(cb[k]*mult)}`).join(' · ');
      const gen=(c.ic||'👩').includes('👩')||(c.nm||'').endsWith('a')?'f':'m';
      const imgSrc=crewImgSrc(c);
      return `<div style="flex:1;min-width:0;padding:10px;background:${roleBg};border:1px solid ${roleColor};border-radius:8px;display:flex;flex-direction:column;gap:6px">
        <div style="display:flex;align-items:center;gap:8px">
          ${imgOrEmoji(imgSrc,c.ic||'🧑',56,56,'border-radius:50%;border:2px solid '+rcol+';background:var(--panel);flex-shrink:0')}
          <div style="flex:1;min-width:0">
            <div style="font-size:10px;color:${roleColor};font-weight:bold">${roleLabel}</div>
            <div style="font-size:14px;font-weight:bold;color:${rcol};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${crewDisplayNm(c)||I18N.t('ui.unnamed')}</div>
            <div style="font-size:11px;color:var(--dim)">${cl} · <span style="color:${rcol};font-weight:bold">${rlbl}</span> ${I18N.t('ui.rankShort')}${c.f?' · '+c.f:''}</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 8px;font-size:11px;background:rgba(0,0,0,.25);padding:6px 8px;border-radius:5px">
          <span style="color:#f88">💪 STR ${c.STR||0}</span>
          <span style="color:#fa8">⚔ ATT ${c.ATT||0}</span>
          <span style="color:#af8">🔮 INT ${c.INT||0}</span>
          <span style="color:var(--gold)">🛡 DEF ${c.DEF||0}</span>
          <span style="color:#f99">❤ HP ${c.HP||0}</span>
          <span style="color:#9cf">💖 LOY ${c.LOY||0}</span>
        </div>
        <div style="font-size:11px;color:var(--cyan);background:rgba(0,243,255,.08);border:1px solid rgba(0,243,255,.2);border-radius:5px;padding:5px 8px">
          ${I18N.t('crew.shipBonus',{txt:bonusTxt||I18N.t('crew.bonusNone')})}
        </div>
        ${c.desc?`<div style="font-size:11px;color:var(--dim);line-height:1.4">${c.desc}</div>`:''}
      </div>`;
    }
    openModal(I18N.t('modal.promoteCrewOffer'),
      `<div style="padding:10px 4px">
        <div style="font-size:14px;font-weight:bold;margin-bottom:10px;color:var(--cyan);text-align:center">${I18N.t('crew.fullChooseSwap')}</div>
        <div style="display:flex;gap:12px;align-items:stretch;margin-bottom:10px">
          ${_crewCard(tgt,'var(--red)','rgba(255,59,59,.08)',I18N.t('crew.toExpel'))}
          <div style="display:flex;align-items:center;justify-content:center;font-size:26px;color:var(--gold);flex-shrink:0">➡️</div>
          ${_crewCard(sc,'var(--cyan)','rgba(0,243,255,.08)',I18N.t('crew.candidateNew'))}
        </div>
        <div style="font-size:12px;color:var(--dim);text-align:center;line-height:1.6">
          ${I18N.t('ui.swapRecruitConfirm',{old:crewDisplayNm(tgt),new:crewDisplayNm(sc)})}<br>
          ${I18N.t('crew.swapHint')}
        </div>
      </div>`,
      [{txt:I18N.t('ui.acceptSwap'),fn:()=>{
        closeModal();
        // 내보낼 크루 제거
        G.fleet.forEach(s=>{if(s.crewIds){const i=s.crewIds.indexOf(tgt.id);if(i>=0)s.crewIds.splice(i,1);}});
        const tidx=G.crew.findIndex(x=>x.id===tgt.id);
        if(tidx>=0)G.crew.splice(tidx,1);
        // 신규 크루 추가
        delete sc._swapCandidate;delete sc._swapTarget;
        G.crew.push(sc);
        notify(I18N.t('notify.crewSwapRecruit',{old:crewDisplayNm(tgt),new:crewDisplayNm(sc)}),'gold');
        renderGachaCards(results.filter(r=>!r._swapCandidate&&!r._rejected));
        saveGame(true);
        baekgu(I18N.t('baekgu.crewJoinedDismiss',{nm:crewDisplayNm(sc),old:crewDisplayNm(tgt)}));
      },cls:'btn-gold'},{txt:I18N.t('ui.decline'),fn:()=>{
        closeModal();
        renderGachaCards(results.filter(r=>!r._swapCandidate&&!r._rejected));
        saveGame(true);
        baekgu(I18N.t('baekgu.crewRecruitDeclined'));
      },cls:'btn-sm'}],{wide:true});
  } else {
    renderGachaCards(results.filter(r=>!r._rejected&&!r._heroRoll));
    saveGame(true);
    baekgu(results.some(r=>r._heroRoll)?I18N.t('baekgu.gachaLegendHero'):results.some(r=>r.rarity==='L')?I18N.t('baekgu.gachaLegend'):results.some(r=>r.rarity==='H')?I18N.t('baekgu.gachaHero'):I18N.t('baekgu.gachaNormal'));
  }
  // 🎉 8인의 전설 영웅 등장 시 — 가챠 결과 카드 표시 후 영입 모달 순차 호출
  const _heroRolls=results.filter(r=>r._heroRoll).map(r=>r._heroRoll);
  if(_heroRolls.length>0){
    try{_fireFireworks();}catch(e){}  // 전설 영웅 등장 — 폭죽 + 효과음 (사용자 요청)
    // 각 영웅마다 1초 간격으로 모달 호출 (수동 영입 결정)
    _heroRolls.forEach((hid,i)=>{
      setTimeout(()=>{try{showHeroRecruit(hid);}catch(e){console.error(e);}},900+i*500);
    });
    notify(I18N.t('notify.legendHeroAppear',{n:_heroRolls.length}),'gold');
  }
  // 🎉 영웅/전설 크루 등장 처리 (사용자 요청)
  //  · 영웅(H): 팝업 없이 알림(토스트)만 — 연속 구매가 끊기지 않도록
  //  · 전설(L)·스토리(S): 폭죽 연출 + 획득 리포트로 강조
  const heroResults=results.filter(r=>!r._rejected&&!r._heroRoll&&r.rarity==='H');
  const legendResults=results.filter(r=>!r._rejected&&!r._heroRoll&&(r.rarity==='L'||r.rarity==='S'));
  if(heroResults.length>0){
    try{AudioMgr.playSfx('notify',{vol:0.85,cooldown:50});}catch(e){}
    notify(I18N.t('notify.heroRecruitedN',{n:heroResults.length,names:heroResults.map(c=>c.nm).join(', ')}),'gold');
  }
  if(legendResults.length>0){
    try{_fireFireworks();}catch(e){}  // 전설 등장 — 폭죽 + 효과음
    setTimeout(()=>{
      const _crewBonusLbl={Pilot:{att:8,int2:2,tec:4},Eng:{att:2,int2:5,tec:8},Merch:{att:3,int2:7,tec:4},Sniper:{att:10,int2:0,tec:3},Mage:{att:0,int2:10,tec:3},Engineer:{att:1,int2:3,tec:10},Commander:{att:5,int2:5,tec:5}};
      const items=legendResults.map(c=>{
        const cl=c.cl||'Merch';
        const mult=RARITY_MULT[c.rarity]||1;
        const cb=_crewBonusLbl[cl]||{att:3,int2:3,tec:3};
        const bonusTxt=['att','int2','tec'].filter(k=>cb[k]>0).map(k=>`${k.replace('int2','SHD').replace('att','ATT').replace('tec','ENG')}+${Math.round(cb[k]*mult)}`).join(' · ');
        const gen=(c.ic||'👩').includes('👩')||(c.nm||'').endsWith('a')?'f':'m';
        const imgSrc=crewImgSrc(c);
        return{ic:c.ic||'🧑',img:imgSrc,nm:c.nm,type:`${cl} · LOY ${c.LOY||80}`,rarity:c.rarity,stats:bonusTxt,desc:c.desc||c.sk||''};
      });
      showAcquisitionReport({
        title:I18N.t('gacha.legendTavernTitle'),
        subtitle:I18N.t('gacha.tavernSubtitle'),
        items,
        color:'var(--gold)',
        sfx:null,
        congrats:I18N.t('gacha.legendCongrats'),
        crewReveal:true  // 사용자 요청 (2026-06-06): 전설 크루 등장 팝업 추가 30% 축소
      });
    },600);
  }
  // 전설 영웅(H01~H08) 가챠 출현 제거 — 지정 행성 퀘스트 보상에서만 5% 확률 등장
}

window.doGacha=doGacha;
console.log('[gacha] Loaded — doGacha exposed');
})();
