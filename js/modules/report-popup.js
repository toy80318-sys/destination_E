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

  function showAcquisitionReport(opts){
    opts=opts||{};
    const I18N=window.I18N;
    const title=opts.title||I18N.t('report.title');
    const subtitle=opts.subtitle||'';
    const items=opts.items||[];
    const headerColor=opts.color||'var(--gold)';
    const congrats=opts.congrats||'';
    try{window.AudioMgr&&window.AudioMgr.playSfx(opts.sfx||'notify',{cooldown:80});}catch(e){}
    // 사용자 요청 2026-06-08: 보상 팝업 70% 축소 + 항상 2열 그리드 (화면 넘침 방지)
    const _many=items.length>=5;
    const _icSz=_many?112:134;
    const _icFont=_many?62:78;
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
      const imgHtml=it.img
        ? `<div style="width:${_icSz}px;height:${_icSz}px;border-radius:6px;border:1.5px solid ${rc};overflow:hidden;flex-shrink:0;background:rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center">${window.imgOrEmoji(it.img,ic,_icSz-4,_icSz-4,'object-fit:cover')}</div>`
        : `<div style="width:${_icSz}px;height:${_icSz}px;border-radius:6px;border:1.5px solid ${rc};display:flex;align-items:center;justify-content:center;font-size:${_icFont}px;flex-shrink:0;background:rgba(0,0,0,.3)">${ic}</div>`;
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
    const _gridStyle='display:grid;grid-template-columns:1fr 1fr;gap:8px;width:100%;margin:0 auto';
    const congratsHtml=congrats?`<div style="margin-bottom:8px;padding:6px 12px;background:linear-gradient(90deg,rgba(255,215,0,.08),rgba(255,136,255,.08));border:1px solid ${headerColor};border-radius:6px;text-align:center;font-size:13px;color:${headerColor};font-weight:bold">🎉 ${escapeHtml(congrats)} 🎉</div>`:'';
    const subtitleHtml=subtitle?`<div style="text-align:center;font-size:12px;color:var(--dim);margin-bottom:6px">${escapeHtml(subtitle)}</div>`:'';
    const html=`<div style="padding:2px 2px">
      ${congratsHtml}
      ${subtitleHtml}
      ${itemRows?`<div style="${_gridStyle}">${itemRows}</div>`:`<div style="text-align:center;color:var(--dim);padding:18px">${I18N.t('ui.noAcquired')}</div>`}
    </div>`;
    const _onClose=opts.onClose;
    window.openModal(title,html,[{
      txt:I18N.t('btn.confirm'),
      fn:()=>{window.closeModal();if(typeof _onClose==='function')_onClose();},
      cls:'btn-gold'
    }],{wide:true,report:!opts.bossfight,bossfight:!!opts.bossfight,crewReveal:!!opts.crewReveal});
  }

  window.showAcquisitionReport=showAcquisitionReport;
})();
