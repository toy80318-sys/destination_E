// ═══════════════════════════════════════════════════════════════════
// DESTINATION EARTH — 설정 모달 + 오프라인 백업 모듈
//   · game.js 에서 분할 (2026-06-12, 사용자 요청: 긴 코드 분할)
// 공개 함수 (window.* 노출):
//   · showSettingsModal — 설정 모달 (HTML onclick/메뉴)
//   · exportSaveFile / exportAllSavesFile / importSaveFile / copySaveToClipboard — 오프라인 백업
// 의존 글로벌: G, I18N, AudioMgr, notify, openModal, closeModal, saveGame,
//   changeDifficultyFromSettings, setDisplayMode, cheat* (cheat-menu.js), window.desktopAPI
// ═══════════════════════════════════════════════════════════════════
(function(){
if(typeof window==='undefined')return;
if(window._SETTINGS_BACKUP_LOADED)return;
window._SETTINGS_BACKUP_LOADED=true;

// ── 설정 모달 ────────────────────────────────────────────────────
function showSettingsModal(){
  const _mPct=Math.round((AudioMgr.master||0)*100);
  const _bPct=Math.round((AudioMgr.bgm||0)*100);
  const _sPct=Math.round((AudioMgr.sfx||0)*100);
  const _bOff=AudioMgr.bgmOff, _sOff=AudioMgr.sfxOff;
  // 토글 버튼 스타일 (켜짐=초록, 꺼짐=회색)
  function _toggleBtnStyle(on){
    return on
      ? 'background:rgba(46,204,113,.15);border:1px solid var(--green);color:var(--green)'
      : 'background:rgba(80,80,80,.15);border:1px solid #555;color:#999';
  }
  // 게임 진행 중일 때만 난이도/데이터 관리 노출
  // ⚠️ 치트/오프라인 백업은 항상 표시 (게임 시작 전에도 복구용)
  const _inGame=true;
  const html=`<div style="padding:4px 0">
    <div style="margin-bottom:16px;background:rgba(0,243,255,.04);border:1px solid rgba(0,243,255,.2);border-radius:8px;padding:12px">
      <div style="font-weight:bold;margin-bottom:10px">${I18N.t('settings.sound')}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
        <button id="set-bgm-toggle" onclick="(function(b){const off=!AudioMgr.bgmOff;AudioMgr.setBgmOff(off);notify(off?I18N.t('settings.bgmOff'):I18N.t('settings.bgmOn'),'ok');showSettingsModal();})()" style="padding:10px;border-radius:6px;cursor:pointer;font-family:inherit;font-size:13px;font-weight:bold;${_toggleBtnStyle(!_bOff)}">
          ${_bOff?I18N.t('settings.bgmOff'):I18N.t('settings.bgmOn')}
          <div style="font-size:10px;font-weight:normal;margin-top:2px;opacity:.85">${_bOff?I18N.t('settings.clickToOn'):I18N.t('settings.clickToOff')}</div>
        </button>
        <button id="set-sfx-toggle" onclick="(function(){const off=!AudioMgr.sfxOff;AudioMgr.setSfxOff(off);notify(off?I18N.t('settings.sfxOff'):I18N.t('settings.sfxOn'),'ok');showSettingsModal();})()" style="padding:10px;border-radius:6px;cursor:pointer;font-family:inherit;font-size:13px;font-weight:bold;${_toggleBtnStyle(!_sOff)}">
          ${_sOff?I18N.t('settings.sfxOff'):I18N.t('settings.sfxOn')}
          <div style="font-size:10px;font-weight:normal;margin-top:2px;opacity:.85">${_sOff?I18N.t('settings.clickToOn'):I18N.t('settings.clickToOff')}</div>
        </button>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <div>
          <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--dim);margin-bottom:3px"><span>${I18N.t('settings.masterVolume')}</span><span id="set-mv">${_mPct}%</span></div>
          <input type="range" min="0" max="100" value="${_mPct}" style="width:100%" oninput="document.getElementById('set-mv').textContent=this.value+'%';AudioMgr.setMaster(this.value/100);">
        </div>
        <div style="opacity:${_bOff?0.4:1}">
          <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--dim);margin-bottom:3px"><span>${I18N.t('settings.bgmVolume')}</span><span id="set-bv">${_bPct}%</span></div>
          <input type="range" min="0" max="100" value="${_bPct}" style="width:100%" ${_bOff?'disabled':''} oninput="document.getElementById('set-bv').textContent=this.value+'%';AudioMgr.setBgmVol(this.value/100);">
        </div>
        <div style="opacity:${_sOff?0.4:1}">
          <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--dim);margin-bottom:3px"><span>${I18N.t('settings.sfxVolume')}</span><span id="set-sv">${_sPct}%</span></div>
          <input type="range" min="0" max="100" value="${_sPct}" style="width:100%" ${_sOff?'disabled':''} oninput="document.getElementById('set-sv').textContent=this.value+'%';AudioMgr.setSfxVol(this.value/100);" onchange="AudioMgr.playSfx('UI_click');">
        </div>
      </div>
    </div>
    <!-- 언어 선택 (i18n) — 게임 안/시작화면 모두 표시 -->
    ${(typeof I18N!=='undefined')?`<div style="margin-bottom:16px;background:rgba(0,243,255,.04);border:1px solid rgba(0,243,255,.2);border-radius:8px;padding:12px">
      <div style="font-weight:bold;margin-bottom:8px">${I18N.t('lang.label')}</div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-sm" onclick="I18N.setLang('ko')" style="flex:1;${I18N.getLang()==='ko'?'border-color:var(--cyan);color:var(--cyan);background:rgba(0,243,255,.12);font-weight:bold':''}">${I18N.t('lang.ko')}${I18N.getLang()==='ko'?' ✓':''}</button>
        <button class="btn btn-sm" onclick="I18N.setLang('en')" style="flex:1;${I18N.getLang()==='en'?'border-color:var(--cyan);color:var(--cyan);background:rgba(0,243,255,.12);font-weight:bold':''}">${I18N.t('lang.en')}${I18N.getLang()==='en'?' ✓':''}</button>
      </div>
      <div style="font-size:10px;color:var(--dim);margin-top:8px;line-height:1.5">${I18N.t('lang.changeHint')}</div>
    </div>`:''}
    <!-- 디스플레이 모드 (화면 해상도) -->
    ${(()=>{
      const dm=window._displayMode||'auto';
      const opts=[
        {k:'auto',lb:I18N.t('settings.resAuto'),desc:I18N.t('settings.resAutoDesc')},
        {k:'hd',lb:I18N.t('settings.resHD'),desc:I18N.t('settings.resHDDesc')},
        {k:'fhd',lb:I18N.t('settings.resFHD'),desc:I18N.t('settings.resFHDDesc')},
        {k:'qhd',lb:I18N.t('settings.resQHD'),desc:I18N.t('settings.resQHDDesc')},
        {k:'mobile',lb:I18N.t('settings.resMobile'),desc:I18N.t('settings.resMobileDesc')}
      ];
      const btn=opts.map(o=>{
        const act=dm===o.k;
        return `<button onclick="setDisplayMode('${o.k}');showSettingsModal();" style="padding:10px 6px;border-radius:6px;cursor:pointer;font-family:inherit;font-size:12px;font-weight:bold;text-align:left;line-height:1.4;${act?'background:rgba(0,243,255,.12);border:1px solid var(--cyan);color:var(--cyan)':'background:rgba(80,80,80,.1);border:1px solid #555;color:#aaa'}">
          ${o.lb}${act?' ✓':''}
          <div style="font-size:10px;font-weight:normal;margin-top:2px;opacity:.85">${o.desc}</div>
        </button>`;
      }).join('');
      return `<div style="margin-bottom:16px;background:rgba(204,102,255,.04);border:1px solid rgba(204,102,255,.2);border-radius:8px;padding:12px">
        <div style="font-weight:bold;margin-bottom:8px">${I18N.t('settings.displayRes')}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">${btn}</div>
        <div style="font-size:10px;color:var(--dim);margin-top:8px;line-height:1.5">${I18N.t('settings.currentScale')}: <span style="color:var(--cyan)">${(window._gsScale||1).toFixed(2)}x</span> · 1536×864</div>
      </div>`;
    })()}
    ${_inGame?`<div style="margin-bottom:16px">
      <div style="font-weight:bold;margin-bottom:8px">${I18N.t('settings.difficulty')} <span style="color:var(--cyan);font-size:11px;font-weight:normal">${I18N.t('settings.current')}: ${({easy:I18N.t('settings.diffEasyFull'),normal:I18N.t('settings.diffNormalFull'),hard:I18N.t('settings.diffHardFull'),extreme:I18N.t('settings.diffExtremeFull')})[G.difficulty]||I18N.t('settings.diffNormalFull')}</span></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${['easy','normal','hard','extreme'].map(d=>{
          const act=G.difficulty===d;
          const _label={easy:I18N.t('settings.diffEasyFull'),normal:I18N.t('settings.diffNormalFull'),hard:I18N.t('settings.diffHardFull'),extreme:I18N.t('settings.diffExtremeFull')}[d];
          const _col={easy:'var(--cyan)',normal:'var(--green)',hard:'var(--yellow)',extreme:'var(--red)'}[d];
          return `<button class="btn btn-sm" onclick="changeDifficultyFromSettings('${d}')" style="flex:1;${act?`border-color:${_col};color:${_col};background:rgba(255,255,255,.06);font-weight:bold`:''}">${_label}${act?' ✓':''}</button>`;
        }).join('')}
      </div>
      <div style="font-size:10px;color:var(--dim);margin-top:6px;text-align:center">${I18N.t('settings.diffDesc')}</div>
    </div>
    ${window.desktopAPI?`<div style="margin-bottom:16px">
      <button class="btn btn-sm" style="width:100%;margin-bottom:8px" onclick="saveGame(false)">${I18N.t('settings.saveNow')}</button>
      <button class="btn btn-sm" style="width:100%;margin-bottom:8px;border-color:#87c8ff;color:#87c8ff" onclick="window.desktopAPI.showSaveDir()">${I18N.t('settings.openSaveDir')}</button>
      <div id="pc-ver-line" style="font-size:11px;color:var(--muted);text-align:center;margin-bottom:6px">${I18N.t('settings.pcVersionLoading')}</div>
      <script>(async()=>{try{const v=await window.desktopAPI.getAppVersion();const el=document.getElementById('pc-ver-line');if(el)el.textContent=window.I18N.t('settings.pcVersionLine',{v:v});}catch(e){}})();<\/script>
    </div>`:`<div style="margin-bottom:16px">
      <div style="font-weight:bold;margin-bottom:8px">${I18N.t('settings.dataManage')}</div>
      <button class="btn btn-sm" style="width:100%;margin-bottom:8px" onclick="saveGame(false)">${I18N.t('settings.saveNow')}</button>
      <button class="btn btn-sm btn-red" style="width:100%" onclick="if(confirm(I18N.t('confirm.deleteSave'))){localStorage.removeItem('de_save');notify(I18N.t('notify.saveDeleted'),'ok');closeModal();}">${I18N.t('settings.deleteSave')}</button>
    </div>
    <div style="margin-bottom:16px;background:rgba(102,255,153,.05);border:1px solid rgba(102,255,153,.3);border-radius:8px;padding:12px">
      <div style="font-weight:bold;margin-bottom:8px;color:#66ff99">${I18N.t('settings.offlineBackup')}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px">
        <button class="btn btn-sm" style="border-color:#66ff99;color:#66ff99" onclick="exportAllSavesFile()">${I18N.t('settings.dlAllSlots')}</button>
        <button class="btn btn-sm" style="border-color:#66ddff;color:#66ddff" onclick="document.getElementById('save-import-input').click()">${I18N.t('settings.uploadFromFile')}</button>
      </div>
      <input type="file" id="save-import-input" accept=".json,.txt" style="display:none" onchange="importSaveFile(event)">
      <div style="font-size:10px;color:var(--muted);text-align:center;line-height:1.5">${I18N.t('settings.fileSaveHelp')}</div>
    </div>`}
    <div style="margin-bottom:16px;background:rgba(255,165,0,.05);border:1px solid rgba(255,165,0,.25);border-radius:8px;padding:12px">
      <div style="font-weight:bold;margin-bottom:8px;color:#ffa500">${I18N.t('cheat.modeTitle')} <span style="font-size:10px;color:var(--muted);font-weight:normal">${I18N.t('cheat.pwOnceHint')}</span></div>
      ${window.desktopAPI?`<button class="btn btn-sm" style="width:100%;border-color:#ffd700;color:#ffd700" onclick="cheatGiveCredits(100000000)">${I18N.t('cheat.giveCr100m')}</button>`:`
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
        <button class="btn btn-sm" style="border-color:#ffd700;color:#ffd700" onclick="cheatGiveCredits(100000000)">${I18N.t('cheat.giveCr100m')}</button>
        <button class="btn btn-sm" style="border-color:#66ddff;color:#66ddff" onclick="cheatGiveResource('rep',200)">${I18N.t('cheat.giveRep200')}</button>
        <button class="btn btn-sm" style="border-color:#cc66ff;color:#cc66ff" onclick="cheatGiveResource('vc',50)">${I18N.t('cheat.giveVc50')}</button>
        <button class="btn btn-sm" style="border-color:#99ffcc;color:#99ffcc" onclick="cheatGiveResource('ve',1000)">${I18N.t('cheat.giveVe1k')}</button>
      </div>
      <button class="btn btn-sm" style="width:100%;margin-top:6px;border-color:#cc66ff;color:#cc66ff;font-weight:bold;background:rgba(204,102,255,.08)" onclick="cheatUnlockVoid()">${I18N.t('ui.voidPhaseInstant')}</button>
      <button class="btn btn-sm" style="width:100%;margin-top:4px;border-color:#ff66cc;color:#ff66cc;font-weight:bold;background:linear-gradient(90deg,rgba(255,102,204,.08),rgba(204,68,255,.08))" onclick="cheatGrantMythicSet()">${I18N.t('ui.mythicFullsetGrant')}</button>`}
      <div style="font-size:10px;color:var(--muted);margin-top:6px;text-align:center">${I18N.t('cheat.debugWarn')}</div>
    </div>`:''}
  </div>`;
  openModal(I18N.t('modal.settings'),html,[{txt:I18N.t('btn.close'),fn:closeModal,cls:'btn-sm'}],{wide:true});
}

// ── 치트 메뉴 — js/cheat-menu.js 로 이관 (사용자 요청 2026-06-07) ───
// cheatGiveCredits, cheatGiveResource, cheatGiveAllMega, cheatMaxAll,
// cheatUnlockVoid, cheatGrantMythicSet, replayEnding 모두 window.* 로 글로벌 노출됨

// ═══ 오프라인 백업: 파일 다운로드/업로드 ═══════════════════════════
function _saveFilename(slotN){
  const cmd=(G.profile?.name||'commander').replace(/[^a-zA-Z0-9가-힣]/g,'_');
  const ts=new Date().toISOString().slice(0,16).replace(/[:T]/g,'-');
  return `DestinationEarth_save_slot${slotN}_${cmd}_${ts}.json`;
}
function exportSaveFile(slotN){
  slotN=slotN||1;
  // 최신 상태 강제 저장 후 파일로 추출
  saveGame(true,slotN);
  const raw=localStorage.getItem(slotN===0?'de_save':'de_save_s'+slotN);
  if(!raw){notify(I18N.t('notify.slotEmpty',{n:slotN}),'err');return;}
  try{
    const blob=new Blob([raw],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download=_saveFilename(slotN);
    document.body.appendChild(a);a.click();
    setTimeout(()=>{URL.revokeObjectURL(url);a.remove();},100);
    notify(I18N.t('notify.slotFileDownloaded',{n:slotN,kb:Math.round(raw.length/1024)}),'gold');
  }catch(e){notify(I18N.t('notify.downloadFailed',{err:e.message}),'err');}
}
function exportAllSavesFile(){
  // 모든 슬롯을 하나의 번들 파일로
  const bundle={ver:2,exported:Date.now(),slots:{}};
  let count=0;
  for(let i=0;i<=8;i++){
    const raw=localStorage.getItem(i===0?'de_save':'de_save_s'+i);
    if(raw){try{bundle.slots['slot'+i]=JSON.parse(raw);count++;}catch(_){}}
  }
  if(count===0){notify(I18N.t('notify.noSavedSlots'),'err');return;}
  try{
    const blob=new Blob([JSON.stringify(bundle,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    const ts=new Date().toISOString().slice(0,16).replace(/[:T]/g,'-');
    const cmd=(G.profile?.name||'commander').replace(/[^a-zA-Z0-9가-힣]/g,'_');
    a.href=url;a.download=`DestinationEarth_all_${cmd}_${ts}.json`;
    document.body.appendChild(a);a.click();
    setTimeout(()=>{URL.revokeObjectURL(url);a.remove();},100);
    notify(I18N.t('notify.allSlotsBundle',{n:count}),'gold');
  }catch(e){notify(I18N.t('notify.downloadFailed',{err:e.message}),'err');}
}
function importSaveFile(ev){
  const file=ev.target.files&&ev.target.files[0];
  if(!file){return;}
  const reader=new FileReader();
  reader.onload=function(e){
    try{
      const text=e.target.result;
      const obj=JSON.parse(text);
      // 번들 (전체 슬롯) 또는 단일 슬롯 자동 판별
      if(obj.slots&&typeof obj.slots==='object'){
        // 번들
        const keys=Object.keys(obj.slots);
        if(!confirm(I18N.t('ui.bundleDetected',{n:keys.length})))return;
        let ok=0;
        keys.forEach(k=>{
          const m=k.match(/^slot(\d+)$/);if(!m)return;
          const n=parseInt(m[1]);
          const sk=n===0?'de_save':'de_save_s'+n;
          try{localStorage.setItem(sk,JSON.stringify(obj.slots[k]));ok++;}catch(_){}
        });
        notify(I18N.t('notify.slotsRestoredRefresh',{n:ok}),'gold');
        setTimeout(()=>location.reload(),5000);
      } else if(obj.turn!==undefined||obj.fleet){
        // 단일 슬롯 — 슬롯 번호 입력
        const slotStr=prompt(I18N.t('backup.slotPrompt'),'1');
        if(slotStr===null)return;
        const n=Math.max(1,Math.min(8,parseInt(slotStr)||1));
        const sk='de_save_s'+n;
        if(localStorage.getItem(sk)&&!confirm(I18N.t('ui.slotHasDataOverwrite',{n})))return;
        localStorage.setItem(sk,JSON.stringify(obj));
        notify(I18N.t('notify.slotRestoredRefresh',{n}),'gold');
        setTimeout(()=>location.reload(),5000);
      } else {
        notify(I18N.t('notify.badSaveFormat'),'err');
      }
    }catch(e){notify(I18N.t('notify.fileReadFail',{err:e.message}),'err');}
  };
  reader.readAsText(file);
  ev.target.value='';  // 입력 리셋
}
function copySaveToClipboard(slotN){
  slotN=slotN||1;
  saveGame(true,slotN);
  const raw=localStorage.getItem(slotN===0?'de_save':'de_save_s'+slotN);
  if(!raw){notify(I18N.t('notify.noSaveData'),'err');return;}
  try{
    navigator.clipboard.writeText(raw).then(()=>{
      notify(I18N.t('notify.slotCopiedToClipboard',{n:slotN,kb:Math.round(raw.length/1024)}),'gold');
    }).catch(e=>{
      // 폴백: 임시 textarea 사용
      const ta=document.createElement('textarea');ta.value=raw;document.body.appendChild(ta);ta.select();
      try{document.execCommand('copy');notify(I18N.t('notify.clipboardFallback'),'gold');}catch(_){notify(I18N.t('notify.copyFail'),'err');}
      ta.remove();
    });
  }catch(e){notify(I18N.t('notify.copyFailMsg',{err:e.message}),'err');}
}


// ─── 전역 노출 ─────────────────────────────────────────────
window.showSettingsModal=showSettingsModal;
window.exportSaveFile=exportSaveFile;
window.exportAllSavesFile=exportAllSavesFile;
window.importSaveFile=importSaveFile;
window.copySaveToClipboard=copySaveToClipboard;
console.log('[settings-backup] Loaded — 5 functions exposed');
})();
