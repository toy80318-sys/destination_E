// ══════════════════════════════════════════════════════════════════
// 획득 보고 팝업 모듈 — game.js에서 분할 (2026-06-08)
//   · 전투/가챠/퀘스트/주점 보상 공용
//   · showAcquisitionReport({title, subtitle, items, color, sfx, congrats, onClose, bossfight, crewReveal})
//   · items: [{ic, nm, type, rarity, desc, color, badge, img, stats}]
// 의존: window.openModal, window.closeModal, window.AudioMgr, window.imgOrEmoji, window.I18N
// ══════════════════════════════════════════════════════════════════
(function(){
  if(typeof window==='undefined')return;

  const RARITY_COLOR={
    N:'#888',R:'var(--blue)',H:'var(--purple)',L:'var(--gold)',S:'#ff6ec7',
    legend:'var(--gold)',mythic:'#ff88ff',set:'#c080ff',hero:'var(--purple)'
  };
  window.RARITY_COLOR=RARITY_COLOR;

  function escapeHtml(s){
    return String(s||'').replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'})[c]);
  }

  // 획득 경로 몰입 멘트 (사용자 요청 2026-06-16) — context별 + 등급 높을수록 수식 추가
  //   context: found/pirateDrop/chance/gift/asteroid/chixWarehouse/salvage/combatLoot/combatGeneric/bossReward/void
  function _acqFlavorLine(context,name,rarity){
    try{
      const I18N=window.I18N; const key='acq.'+(context||'combatLoot');
      let base=I18N.t(key,{nm:name||''});
      if(!base||base===key)base=I18N.t('acq.combatLoot',{nm:name||''});
      let suf='';
      if(name){ // 구체 아이템명이 있을 때만 등급 수식
        if(rarity==='mythic'||rarity==='신화')suf=I18N.t('acq.rarityMythic');
        else if(rarity==='legend'||rarity==='L'||/전설/.test(String(rarity||'')))suf=I18N.t('acq.rarityLegend');
      }
      return base+suf;
    }catch(e){return name||'';}
  }
  window._acqFlavorLine=_acqFlavorLine;

  function showAcquisitionReport(opts){
    opts=opts||{};
    const I18N=window.I18N;
    const title=opts.title||I18N.t('report.title');
    const subtitle=opts.subtitle||'';
    const items=opts.items||[];
    const headerColor=opts.color||'var(--gold)';
    const congrats=opts.congrats||'';
    try{window.AudioMgr&&window.AudioMgr.playSfx(opts.sfx||'notify',{cooldown:80});}catch(e){}
    // 사용자 요청 2026-06-13: 보상 팝업 아이템/설계도 이미지 2배 확대 + 그리드 자동조정
    //   · 기존 112/134 → 2배(224/268). 이미지가 커지므로 grid는 auto-fit으로 1~2열 자동 전환
    // 사용자 요청 2026-06-14: opts.imgScale 지원 — 전투 승리 보고는 0.5로 호출(현재의 50%)
    const _scale=opts.imgScale||1;
    const _many=items.length>=5;
    const _icSz=Math.round((_many?224:268)*_scale);
    const _icFont=Math.round((_many?120:150)*_scale);
    const _padRow=_many?'5px 8px':'7px 9px';
    const _gapRow=_many?'8px':'10px';
    const _nmFs=_many?12:13;
    const _typeFs=_many?10:11;
    const _statsFs=_many?11:12;
    const _descFs=_many?10:11;
    const itemRows=items.map(it=>{
      const rc=it.color||RARITY_COLOR[it.rarity]||'var(--txt)';
      const rl=I18N.rarity(it.rarity)||'';
      const badge=it.badge||(rl?`<span style="font-size:9px;color:${rc};border:1px solid ${rc};border-radius:3px;padding:0 5px;margin-left:5px">${rl}</span>`:'');
      const ic=it.ic||'📦';
      // UI 튜너 토큰: --ui-reward-img(-many) (기본값=계산된 _icSz)
      //   imgScale 지정(전투 보고 등) 시에는 고정 px 사용 — 전역 튜너 토큰에 영향받지 않음
      const _imgVar=(_scale!==1)?`${_icSz}px`:`var(--ui-reward-img${_many?'-many':''}, ${_icSz}px)`;
      const imgHtml=it.img
        ? `<div style="width:${_imgVar};height:${_imgVar};border-radius:6px;border:1.5px solid ${rc};overflow:hidden;flex-shrink:0;background:rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center">${window.imgOrEmoji(it.img,ic,_imgVar,_imgVar,'object-fit:contain')}</div>`
        : `<div style="width:${_imgVar};height:${_imgVar};border-radius:6px;border:1.5px solid ${rc};display:flex;align-items:center;justify-content:center;font-size:${_icFont}px;flex-shrink:0;background:rgba(0,0,0,.3)">${ic}</div>`;
      return `<div style="display:flex;gap:${_gapRow};align-items:flex-start;padding:${_padRow};background:rgba(255,255,255,.03);border:1px solid ${rc};border-radius:6px">
        ${imgHtml}
        <div style="flex:1;min-width:0">
          <div style="font-size:${_nmFs}px;font-weight:bold;color:${rc};line-height:1.3;word-break:keep-all;overflow-wrap:break-word">${escapeHtml(it.nm)}${badge}</div>
          ${it.type?`<div style="font-size:${_typeFs}px;color:var(--dim);margin-top:2px;word-break:keep-all;overflow-wrap:break-word">${escapeHtml(it.type)}</div>`:''}
          ${it.stats?`<div style="font-size:${_statsFs}px;color:var(--cyan);margin-top:3px;word-break:keep-all;overflow-wrap:break-word">${escapeHtml(it.stats)}</div>`:''}
          ${it.desc?`<div style="font-size:${_descFs}px;color:var(--muted);margin-top:3px;line-height:1.45;word-break:keep-all;overflow-wrap:break-word">${escapeHtml(it.desc)}</div>`:''}
        </div>
      </div>`;
    }).join('');
    // 이미지 2배 확대에 맞춰 그리드 자동조정: 카드 최소폭 확보 → 화면 폭에 따라 1~2열 자동 전환
    const _gridStyle='display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:8px;width:100%;margin:0 auto';
    const congratsHtml=congrats?`<div style="margin-bottom:8px;padding:6px 12px;background:linear-gradient(90deg,rgba(255,215,0,.08),rgba(255,136,255,.08));border:1px solid ${headerColor};border-radius:6px;text-align:center;font-size:13px;color:${headerColor};font-weight:bold">🎉 ${escapeHtml(congrats)} 🎉</div>`:'';
    const subtitleHtml=subtitle?`<div style="text-align:center;font-size:12px;color:var(--dim);margin-bottom:6px">${escapeHtml(subtitle)}</div>`:'';
    // 획득 경로 몰입 멘트 (한 줄)
    const acqLineHtml=opts.acqLine?`<div style="margin:2px auto 9px;padding:8px 16px;max-width:600px;background:linear-gradient(90deg,rgba(255,215,0,.07),rgba(120,180,255,.05));border-left:3px solid ${headerColor};border-radius:6px;text-align:center;font-size:14px;color:#ffe6a8;font-style:italic;line-height:1.55;word-break:keep-all">${escapeHtml(opts.acqLine)}</div>`:'';
    // Doc#6 지시4: 전투 종료 후 패배측(적) 극적 멘트 — 멘트 글씨 1.5배(≈21px)
    // 사용자 요청: 패배 멘트 좌측에 해적/적군 이미지 표시(opts.enemyImg). 이미지 있으면 좌측 정렬 + 💬 생략, 없으면 기존 가운데+💬.
    const _eImg=opts.enemyImg;
    const _eImgHtml=_eImg?`<div style="width:62px;height:62px;border-radius:8px;border:2px solid #ff6a6a;overflow:hidden;flex-shrink:0;background:rgba(0,0,0,.45);box-shadow:0 0 12px rgba(255,60,60,.4);display:flex;align-items:center;justify-content:center">${window.imgOrEmoji(_eImg,'☠️','62px','62px','object-fit:cover')}</div>`:'';
    const enemyMentHtml=opts.enemyMent?`<div style="display:flex;align-items:center;gap:13px;margin:2px auto 11px;padding:11px 16px;max-width:640px;background:linear-gradient(135deg,rgba(255,60,60,.10),rgba(10,5,5,.55));border-left:3px solid #ff6a6a;border-radius:8px;text-shadow:0 0 6px rgba(255,60,60,.3)">${_eImgHtml}<div style="flex:1;text-align:${_eImg?'left':'center'};font-size:21px;color:#ffb3b3;line-height:1.5;word-break:keep-all">${_eImg?'':'💬 '}"${escapeHtml(opts.enemyMent)}"</div></div>`:'';
    const html=`<div style="padding:2px 2px">
      ${congratsHtml}
      ${enemyMentHtml}
      ${acqLineHtml}
      ${subtitleHtml}
      ${itemRows?`<div style="${_gridStyle}">${itemRows}</div>`:`<div style="text-align:center;color:var(--dim);padding:18px">${I18N.t('ui.noAcquired')}</div>`}
    </div>`;
    const _onClose=opts.onClose;
    window.openModal(title,html,[{
      txt:I18N.t('btn.confirm'),
      fn:()=>{window.closeModal();if(typeof _onClose==='function')_onClose();},
      cls:'btn-gold'
    }],{wide:true,report:!opts.bossfight,bossfight:!!opts.bossfight,crewReveal:!!opts.crewReveal,rewardWide:!!opts.rewardWide});
  }

  window.showAcquisitionReport=showAcquisitionReport;
})();
