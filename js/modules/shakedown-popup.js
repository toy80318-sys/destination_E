// ══════════════════════════════════════════════════════════════════
// 통행료 시비 팝업 모듈 — game.js에서 분할 (2026-06-08)
//   · 적대 행성/해적 raid 진입 시 두목 NPC가 통행료 요구
//   · 통행료 공식: (ring×4000+3000) + (아군 함대 자산 합계 × 1%)
//   · 지불 시 전투 회피, 거부 시 proceed() 콜백 호출
// 의존: window.openModal, window.closeModal, window.notify, window.baekgu,
//       window.updateHUD, window.saveGame, window.getShipSellPrice,
//       window.I18N, window.PLANET_DEF, window.G, window._GAME_VER
// ══════════════════════════════════════════════════════════════════
(function(){
  if(typeof window==='undefined')return;

  const _SHAKEDOWN_NPCS=[
    {get nm(){return window.I18N.t('toll.boss.hook');},ic:'🏴‍☠️',col:'#ff8844',get line(){return window.I18N.t('toll.boss.hookLine');}},
    {get nm(){return window.I18N.t('toll.boss.karim');},ic:'🦂',col:'#ffaa44',get line(){return window.I18N.t('toll.boss.karimLine');}},
    {get nm(){return window.I18N.t('toll.boss.krash');},ic:'👾',col:'#cc66ff',get line(){return window.I18N.t('toll.boss.krashLine');}},
    {get nm(){return window.I18N.t('toll.boss.veil');},ic:'🎯',col:'#ff6688',get line(){return window.I18N.t('toll.boss.veilLine');}},
    {get nm(){return window.I18N.t('toll.boss.dorga');},ic:'💀',col:'#ff5555',get line(){return window.I18N.t('toll.boss.dorgaLine');}}
  ];

  function _showShakedownPopup(planetDef,proceed){
    const I18N=window.I18N;
    const G=window.G;
    const npc=_SHAKEDOWN_NPCS[Math.floor(Math.random()*_SHAKEDOWN_NPCS.length)];
    const _cr=G.credits||0;
    // 통행료 = 기본(링 기반) + 아군 함대 자산 0.1% (캡 적용)
    // 사용자 보고 2026-06-09: 신화·전설 함선 보유 시 함대 자산 1% 가 수십~수백만 까지 폭증해
    //   "크레딧 있음에도 부족" 메시지. 다음 안전망 3중 적용:
    //   1) 함대 자산 multiplier 1% → 0.1% (10배 완화)
    //   2) 함대 자산 합산 5,000,000 캡 (그 이상은 통행료 계산에 미반영)
    //   3) 최종 demand 를 (a) 100,000 하드캡, (b) max(baseCr, credits×0.7) 중 작은 값 — 항상 지불 가능
    const _baseCr=(planetDef.ring||2)*4000+3000;
    const _fleetAssetRaw=(G.fleet||[]).reduce(function(sum,s){
      try{return sum+((typeof window.getShipSellPrice==='function'?(window.getShipSellPrice(s).total||0):0));}catch(e){return sum;}
    },0);
    const _fleetAssetCapped=Math.min(_fleetAssetRaw,5000000);
    const _fleetExtra=Math.floor(_fleetAssetCapped*0.001);
    // 1차 raw demand
    let demand=_baseCr+_fleetExtra;
    // 2차: 100k 하드캡
    demand=Math.min(demand,100000);
    // 3차: 항상 지불 가능 보장 — demand ≤ max(100, credits×0.7)
    //   bugfix 2026-06-11: 기존 Math.max(_baseCr, …) 하한 때문에 크레딧 < 기본요금이면
    //   지불 버튼이 사라지고 강제 전투만 남던 문제 수정 (설계 의도 "항상 지불 가능" 위반)
    if(_cr>0){
      demand=Math.min(demand,Math.max(100,Math.floor(_cr*0.7)));
    }
    const canPay=_cr>=demand;
    // 행성 팩션 기반 해적 이미지 폴백 체인
    let _pf=(/^F0[1-7]$/.test(planetDef?.f||''))?planetDef.f:'';
    if(!_pf){
      try{
        const _cp=(window.PLANET_DEF||[]).find(p=>p.id===G.currentPlanet);
        if(_cp&&/^F0[1-7]$/.test(_cp.f||''))_pf=_cp.f;
      }catch(e){}
    }
    if(!_pf)_pf='F0'+(1+Math.floor(Math.random()*7));
    const _pIdx=1+Math.floor(Math.random()*3);
    const _gv=(window._GAME_VER)?('?v='+encodeURIComponent(window._GAME_VER)):'';
    const _pSrc1='img/pirates/'+_pf+'_'+_pIdx+'.png'+_gv;
    const _pSrc2='img/pirates/'+_pf+'.png'+_gv;
    const _pSrc3='img/quests/combat_'+_pf+'.png'+_gv;
    const portrait=`<div style="width:240px;height:240px;border-radius:50%;background:rgba(0,0,0,.5);border:3px solid ${npc.col};box-shadow:0 0 32px ${npc.col}aa;overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center">
      <img src="${_pSrc1}" data-fb2="${_pSrc2}" data-fb3="${_pSrc3}" alt="${npc.nm}" style="width:100%;height:100%;object-fit:cover" onerror="var f2=this.dataset.fb2,f3=this.dataset.fb3;if(f2&&!this.src.endsWith(f2)){this.src=f2}else if(f3&&!this.src.endsWith(f3)){this.src=f3}else{this.outerHTML='<span style=&quot;font-size:128px&quot;>${npc.ic}</span>'}">
    </div>`;
    const line=npc.line.replace('{X}','<b style="color:var(--gold)">'+demand.toLocaleString()+'</b>');
    const btns=[];
    if(canPay){
      btns.push({txt:I18N.t('ui.payToAvoid',{p:demand.toLocaleString()}),cls:'btn-gold',fn:()=>{
        window.closeModal();
        G.credits=Math.max(0,(G.credits||0)-demand);
        try{window.updateHUD&&window.updateHUD();}catch(e){}
        window.notify&&window.notify(I18N.t('notify.tollPaidAvoid',{cost:demand.toLocaleString()}),'gold');
        try{window.baekgu&&window.baekgu(I18N.t('baekgu.tollPaidPrideHit'));}catch(e){}
        try{window.saveGame&&window.saveGame(true);}catch(e){}
      }});
    }
    btns.push({txt:I18N.t('toll.refuseBtn'),cls:'btn-red',fn:()=>{window.closeModal();if(typeof proceed==='function')proceed();}});
    window.openModal(`${npc.ic} ${npc.nm}`,
      `<div style="padding:12px">
        <div style="display:flex;gap:18px;align-items:center;flex-wrap:wrap;justify-content:center;padding:14px;background:linear-gradient(135deg,${npc.col}22,rgba(10,10,20,.85));border:1px solid ${npc.col}88;border-radius:12px">
          ${portrait}
          <div style="flex:1;min-width:200px">
            <div style="font-size:13px;color:${npc.col};font-weight:bold;margin-bottom:6px;letter-spacing:1px">${npc.nm}</div>
            <div style="font-size:16px;color:var(--yellow);line-height:1.8;word-break:keep-all">"${line}"</div>
            ${!canPay?`<div style="font-size:12px;color:#ff9999;margin-top:8px">${I18N.t('toll.cannotPay')}</div>`:''}
          </div>
        </div>
      </div>`,
      btns,{wide:true});
  }

  window._showShakedownPopup=_showShakedownPopup;
  window._SHAKEDOWN_NPCS=_SHAKEDOWN_NPCS;
})();
