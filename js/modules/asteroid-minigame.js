// ══════════════════════════════════════════════════════════════════
// asteroid-minigame.js — starmap.js 에서 분할 (2026-06-21, 긴 파일 분리)
//   소행성대 사이드스크롤 슈터 미니게임 (자기완결 블록 — starmap 내부 심볼 미참조).
//   window.startAsteroidBeltMinigame 노출. starmap.js 트리거가 이를 호출.
//   의존: window.G/I18N/AudioMgr/openModal/closeModal/notify/baekgu/imgOrEmoji/shipImgSrc/updateHUD/saveGame/_GAME_VER
// ══════════════════════════════════════════════════════════════════
(function(){
  if(typeof window==='undefined')return;
  // ─── 소행성대 미니게임 — 사이드 스크롤 슈터 ─────────────────────────
  // 좌측 기함(우리 함대 0번)이 우측을 바라보고 움직임 / 배경 우→좌 스크롤
  // 우측에서 소행성·해적함이 날아옴. 해적함은 레이저/미사일로 반격.
  // 조작: 방향키·WASD 이동, 마우스 위치 추종, Shift=레이저, Ctrl/Enter=미사일(자동조준)
  // 30초 생존 = 승리 (+크레딧 5%+격파×500, +VE 20+격파×4)
  // 기함 HP 0 = 패배 (-크레딧 3%)
  // 함선 선택 UI — 행당 8척, 작은 카드 (기존 크기의 약 절반)
  function _showAsteroidShipPicker(destPid, onPick){
    const picker=document.createElement('div');
    picker.id='_ab-ship-picker';
    picker.style.cssText='position:fixed;left:0;top:0;right:0;bottom:0;background:rgba(0,0,0,.95);z-index:99996;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;font-family:Malgun Gothic,sans-serif;padding:14px;overflow-y:auto';
    // 카드: 가로 약 116px → 행당 8장(8×116 + gap×7×6 = 970px), max-width 1000px
    let cardsHtml='';
    (G.fleet||[]).forEach((s,idx)=>{
      const t=s.tier||'소형';
      const _tcol=t==='소형'?'#66ddff':t==='중형'?'#ffcc66':'#ff88cc';
      const tierBadge='<span style="color:'+_tcol+'">'+I18N.tier(t)+'</span>';
      const _hp=s.maxHP||s.HP||1000;
      const _sh=s.maxSH||300;
      const _att=s.ATT||30;
      const _rar=s.rarity||'';
      const _rarColor=_rar==='mythic'?'#ff88ff':_rar==='legend'?'#ffcc66':_rar==='set'?'#ff99cc':'#aaa';
      cardsHtml+=`
        <div class="ab-ship-card" data-idx="${idx}" style="
          cursor:pointer;background:rgba(20,10,40,.9);border:1.5px solid #6633aa;border-radius:7px;
          padding:7px 8px;width:104px;text-align:center;transition:all .15s ease;
          box-shadow:0 2px 8px rgba(180,80,255,.15)">
          <img src="${shipImgSrc(s)}" style="width:52px;height:52px;object-fit:contain;image-rendering:pixelated" onerror="this.style.opacity=.3">
          <div style="margin-top:4px;font-weight:bold;color:${_rarColor};font-size:10px;letter-spacing:.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${shipDisplayNm(s)||'#'+idx}</div>
          <div style="margin-top:2px;font-size:9px;color:#aaa">${tierBadge} · ATT ${_att}</div>
          <div style="margin-top:2px;font-size:9px;color:#ff8888">HP ${_hp>=10000?Math.round(_hp/1000)+'k':_hp}</div>
          <div style="font-size:9px;color:#66ddff">SH ${_sh>=10000?Math.round(_sh/1000)+'k':_sh}</div>
        </div>`;
    });
    const _bypassCost=Math.max(100,Math.round((G.credits||0)*0.01));
    const _canBypass=(G.credits||0)>=_bypassCost;
    picker.innerHTML=`
      <div style="text-align:center;margin-bottom:10px">
        <div style="color:#cc66ff;font-size:11px;letter-spacing:4px">${I18N.t('ui.asteroidBreakSub')}</div>
        <div style="color:#fff;font-size:16px;font-weight:bold;letter-spacing:2px;margin-top:3px">${I18N.t('ui.asteroidBreak')}</div>
        <div style="color:#aaa;font-size:10px;margin-top:3px">${I18N.t('ui.clickShipToSortie')}</div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(8,104px);gap:6px;justify-content:center;max-width:920px">${cardsHtml}</div>
      <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;justify-content:center">
        <button id="_ab-pick-bypass" ${_canBypass?'':'disabled'} style="
          padding:7px 18px;background:${_canBypass?'rgba(255,215,0,.18)':'rgba(120,120,120,.15)'};
          border:1px solid ${_canBypass?'#ffd700':'#666'};color:#fff;border-radius:5px;
          cursor:${_canBypass?'pointer':'not-allowed'};font-size:11px;letter-spacing:1px;
          opacity:${_canBypass?'1':'.5'}">
          ${I18N.t('ui.tollLine',{cr:_bypassCost.toLocaleString()})}
        </button>
        <button id="_ab-pick-cancel" style="padding:7px 16px;background:rgba(255,80,80,.15);border:1px solid #ff6666;color:#fff;border-radius:5px;cursor:pointer;font-size:11px;letter-spacing:1px">${I18N.t('ui.cancelEvade')}</button>
      </div>`;
    document.body.appendChild(picker);
    picker.querySelectorAll('.ab-ship-card').forEach(c=>{
      c.onmouseenter=()=>{c.style.transform='translateY(-3px)';c.style.borderColor='#ffcc66';c.style.boxShadow='0 6px 18px rgba(255,204,102,.35)';};
      c.onmouseleave=()=>{c.style.transform='';c.style.borderColor='#6633aa';c.style.boxShadow='0 2px 8px rgba(180,80,255,.15)';};
      c.onclick=()=>{const idx=parseInt(c.dataset.idx,10);picker.remove();onPick(idx);};
    });
    picker.querySelector('#_ab-pick-cancel').onclick=()=>{picker.remove();};
    // 통행세 지불 무사통과 — 1% 지불 + 해금 진행도 +1 효과만 적용
    const bypassBtn=picker.querySelector('#_ab-pick-bypass');
    if(bypassBtn&&_canBypass)bypassBtn.onclick=()=>{
      G.credits=Math.max(0,(G.credits||0)-_bypassCost);
      if(destPid){try{addHubProgress(destPid);}catch(e){}}
      try{saveGame(true);}catch(e){}
      notify(I18N.t('notify.tollPaidAsteroid',{cost:_bypassCost.toLocaleString()}),'gold');
      try{baekgu(I18N.t('baekgu.tollPaidSafe'));}catch(e){}
      picker.remove();
    };
  }
  
  // 백구 AI HUD 렌더 — 캔버스 하단 가운데 (말풍선 위로)
  function _renderBaekguHud(cx,W,H,state,baekguImgs,now){
    const b=state.baekgu;if(!b)return;
    const remain=b.expireAt-now;
    let alpha=1;
    if(remain<400)alpha=Math.max(0,remain/400);
    const moodKey=(remain<=0)?'default':b.mood;
    const im=baekguImgs[moodKey]||baekguImgs['default'];
    // 좌측 하단 배치 — 이름 라벨 잘리지 않도록 충분한 하단 마진 확보
    const size=100;
    const marginL=18, marginB=28;          // 이름 라벨 들어갈 공간(아래쪽) 확보
    const cxCircle=marginL+size/2;
    const cyCircle=H-marginB-size/2;
    const bx=cxCircle-size/2, by=cyCircle-size/2;
    cx.save();
    // 후광
    const moodCol=(b.mood==='anger1'||b.mood==='anger2'||b.mood==='sad')?'#ff6666'
                :(b.mood==='smile1'||b.mood==='smile2'||b.mood==='smile4')?'#ffd700':'#66ddff';
    const glowAlpha=(b.mood==='anger1'||b.mood==='anger2'||b.mood==='sad')?0.18*alpha
                  :(b.mood==='smile1'||b.mood==='smile2'||b.mood==='smile4')?0.18*alpha:0.10;
    cx.fillStyle=(b.mood==='anger1'||b.mood==='anger2'||b.mood==='sad')?'rgba(255,80,80,'+glowAlpha+')'
                :(b.mood==='smile1'||b.mood==='smile2'||b.mood==='smile4')?'rgba(255,215,0,'+glowAlpha+')'
                :'rgba(102,221,255,'+glowAlpha+')';
    cx.beginPath();cx.arc(cxCircle,cyCircle,size*0.7,0,Math.PI*2);cx.fill();
    // 원형 배경
    cx.beginPath();cx.arc(cxCircle,cyCircle,size/2-2,0,Math.PI*2);cx.closePath();
    cx.fillStyle='rgba(20,10,40,.92)';cx.fill();
    // 이미지 (원형 클립)
    cx.save();cx.clip();
    if(im&&im.complete&&im.naturalWidth>0){cx.drawImage(im,bx,by,size,size);}
    cx.restore();
    // 테두리
    cx.lineWidth=2.5;cx.strokeStyle=moodCol;
    cx.beginPath();cx.arc(cxCircle,cyCircle,size/2-1,0,Math.PI*2);cx.stroke();
    // 이름 라벨 (원 아래, 화면 안에 들어오도록)
    cx.fillStyle='rgba(102,221,255,.9)';cx.font='bold 12px monospace';cx.textAlign='center';
    cx.fillText(I18N.t('cb.baekguAI'),cxCircle,cyCircle+size/2+18);
    // 말풍선 — 이미지 우측에 배치
    if(b.msg && remain>0){
      cx.globalAlpha=alpha;
      cx.font='bold 14px Malgun Gothic, sans-serif';
      const tw=cx.measureText(b.msg).width;
      const bw=Math.max(180,tw+28), bh=44;
      // 우측에 배치: 원 오른쪽 가장자리에서 14px 간격
      const bbx=cxCircle+size/2+14;
      const bby=cyCircle-bh/2;
      // 그림자
      cx.fillStyle='rgba(0,0,0,.6)';
      _roundRect(cx,bbx+2,bby+2,bw,bh,10);cx.fill();
      // 배경 그라데이션
      const grd=cx.createLinearGradient(bbx,bby,bbx,bby+bh);
      grd.addColorStop(0,'rgba(40,20,60,.95)');grd.addColorStop(1,'rgba(20,10,40,.95)');
      cx.fillStyle=grd;_roundRect(cx,bbx,bby,bw,bh,10);cx.fill();
      // 테두리
      cx.strokeStyle=moodCol;cx.lineWidth=1.5;
      _roundRect(cx,bbx,bby,bw,bh,10);cx.stroke();
      // 좌측 꼬리 (원을 향함)
      cx.fillStyle=grd;
      cx.beginPath();
      cx.moveTo(bbx,cyCircle-8);cx.lineTo(bbx,cyCircle+8);cx.lineTo(bbx-10,cyCircle);
      cx.closePath();cx.fill();
      cx.strokeStyle=moodCol;
      cx.beginPath();
      cx.moveTo(bbx,cyCircle-8);cx.lineTo(bbx-10,cyCircle);cx.lineTo(bbx,cyCircle+8);
      cx.stroke();
      // 텍스트
      cx.fillStyle='#fff';cx.textAlign='left';
      cx.fillText(b.msg,bbx+14,bby+bh/2+5);
      cx.globalAlpha=1;
    }
    cx.textAlign='left';
    cx.restore();
  }
  function _roundRect(cx,x,y,w,h,r){
    cx.beginPath();cx.moveTo(x+r,y);cx.lineTo(x+w-r,y);cx.quadraticCurveTo(x+w,y,x+w,y+r);
    cx.lineTo(x+w,y+h-r);cx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    cx.lineTo(x+r,y+h);cx.quadraticCurveTo(x,y+h,x,y+h-r);
    cx.lineTo(x,y+r);cx.quadraticCurveTo(x,y,x+r,y);cx.closePath();
  }
  
  function startAsteroidBeltMinigame(destPid, shipIdx){
    // 함선 선택 단계 — 함대에 2척 이상이고 미선택이면 picker 표시
    if(shipIdx==null && G.fleet && G.fleet.length>1){
      return _showAsteroidShipPicker(destPid,(idx)=>{startAsteroidBeltMinigame(destPid,idx);});
    }
    shipIdx=shipIdx|0;
    // 기함 스탯 (선택한 함선)
    const flagship=G.fleet&&G.fleet[shipIdx];
    // 미니게임 HP 기준 — 기함의 기본 maxHP (파츠 보너스 제외, 함선 본체 스탯)
    const _baseHP=flagship?(flagship.maxHP||flagship.HP||1000):1000;
    const _baseSH=flagship?(flagship.maxSH||300):300;
    const _baseATT=flagship?(flagship.ATT||30):30;
    const flagStat={HP:_baseHP,maxSH:_baseSH,ATT:_baseATT};
    const shipSrc=flagship?shipImgSrc(flagship):shipImgSrc({id:'S01',catId:'S01',tier:'소형'});
    // 함선 크기 비율 — 소형=1 / 중형=3 / 대형=5 (사용자 명세)
    function _sizeForTier(tier){
      if(tier==='중형')return 90;
      if(tier==='대형'||tier==='전설기함'||tier==='신화')return 150;
      return 30;  // 소형 또는 기타
    }
    const flagSize=flagship?_sizeForTier(flagship.tier):30;
    // 함선 tier별 속도 배율 — 소형=1.0, 중형=0.7, 대형=0.5 (사용자 명세)
    function _spdFactorForTier(tier){
      if(tier==='중형')return 0.7;
      if(tier==='대형'||tier==='전설기함'||tier==='신화')return 0.5;
      return 1.0;
    }
    // 엔진 등급별 속도 배율 — 영웅 이하=1, 전설/세트=1.5, 신화=2 (사용자 명세)
    let _engineMul=1;
    if(flagship&&flagship.parts){
      for(const pid of flagship.parts){
        const p=PARTS.find(x=>x.id===pid);
        if(!p||p.cat!=='engine')continue;
        if(p.rarity==='mythic')_engineMul=Math.max(_engineMul,2);
        else if(p.rarity==='legend'||p.rarity==='set')_engineMul=Math.max(_engineMul,1.5);
      }
    }
    const _shipSpdFactor=flagship?_spdFactorForTier(flagship.tier):1.0;
    const _shipSpdMul=_shipSpdFactor*_engineMul;  // 최종 배율
    // 무기 등급 판정 — 기함 장착 레이저 파츠의 rarity로 분류
    let weaponTier='normal';  // normal (영웅 이하) / legend (전설·세트) / mythic (신화)
    // 미사일 등급 판정 — 기함 장착 미사일 파츠의 rarity로 분류 (미사일 cd 배율 결정)
    let missileTier='normal';
    // 무기 등급(희귀도) → 동시 발사 수 (사용자 요청 2026-06-16: 일반1·희귀2·영웅3·전설4·신화5 확산식)
    const _rarityToShots=(r)=> r==='mythic'?5 : (r==='legend'||r==='set')?4 : (r==='hero'||r==='epic')?3 : (r==='rare'||r==='R')?2 : 1;
    let _laserShots=1, _missileShots=1;
    if(flagship&&flagship.parts){
      for(const pid of flagship.parts){
        const p=PARTS.find(x=>x.id===pid);
        if(!p)continue;
        if(p.cat==='weapon'&&(p.wtype!=='missile')){
          _laserShots=Math.max(_laserShots,_rarityToShots(p.rarity));
          if(p.rarity==='mythic')weaponTier='mythic';
          else if(p.rarity==='legend'||p.rarity==='set')weaponTier=(weaponTier==='mythic'?'mythic':'legend');
          else if(weaponTier==='normal')weaponTier='normal';
        }
        // 미사일 (cat==='missile' 또는 weapon+wtype==='missile')
        if(p.cat==='missile'||(p.cat==='weapon'&&p.wtype==='missile')){
          _missileShots=Math.max(_missileShots,_rarityToShots(p.rarity));
          if(p.rarity==='mythic')missileTier='mythic';
          else if(p.rarity==='legend'||p.rarity==='set')missileTier=(missileTier==='mythic'?'mythic':'legend');
        }
      }
    }
    // 미사일 cd 배율 (작을수록 빠름) — 사용자 명세
    //   normal/영웅 이하: 50% 느림 → ×2.0
    //   legend/set:      30% 느림 → ×1.43 (1/0.7)
    //   mythic:          10% 빠름 → ×0.91 (1/1.1)
    const _missileCdMul=missileTier==='mythic'?(1/1.1):missileTier==='legend'?(1/0.7):2.0;
    // ── 장착 무기 특성 → 미니게임 효과 매핑 ─────────────────────────────────
    // 1) 레이저/미사일 데미지 — 등급별 차등 (1발당 적·소행성 HP 비례 격파력)
    const _laserDmg=weaponTier==='mythic'?4:weaponTier==='legend'?2:1;
    const _missileDmg=missileTier==='mythic'?8:missileTier==='legend'?5:3;
    // 2) 신화 무기 — 다단발사 (40% 확률로 1발 더 발사, 허메틱 포 MW01 효과)
    const _laserMultiShotRate=weaponTier==='mythic'?0.40:0;
    // 3) 흡혈 효과 — 흡혈 폭격 코어(RB09, 전설)/영혼 흡수 매트릭스(RB10, 신화) 장착 시
    //    레이저 명중 시 HP/SH 일부 회복
    let _leechHpPct=0,_leechShPct=0;
    if(flagship&&flagship.parts){
      for(const pid of flagship.parts){
        if(pid==='RB10'){_leechHpPct=0.020;_leechShPct=0.018;break;}      // 신화: HP 2% / SH 1.8%
        if(pid==='RB09'){_leechHpPct=0.015;_leechShPct=0.012;}            // 전설: HP 1.5% / SH 1.2%
      }
    }
    // 4) 실드 회복률 — 실드 파츠 등급별 (피격 없을 때 천천히 차오름)
    let _shieldRegen=0;  // 1프레임당 회복량
    if(flagship&&flagship.parts){
      for(const pid of flagship.parts){
        const p=PARTS.find(x=>x.id===pid);
        if(p&&p.cat==='shield'){
          if(p.rarity==='mythic')_shieldRegen=Math.max(_shieldRegen,flagStat.maxSH*0.0015);
          else if(p.rarity==='legend'||p.rarity==='set')_shieldRegen=Math.max(_shieldRegen,flagStat.maxSH*0.0008);
          else _shieldRegen=Math.max(_shieldRegen,flagStat.maxSH*0.0003);
        }
      }
    }
    const W=1440, H=840;  // 1.5× 확대 (기존 960×560)
    // 오버레이
    const overlay=document.createElement('div');
    overlay.id='_ab-mini-overlay';
    overlay.style.cssText='position:fixed;left:0;top:0;right:0;bottom:0;width:100vw;height:100vh;background:#000;z-index:99997;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;font-family:Malgun Gothic,sans-serif;opacity:0;transition:opacity 0.6s ease-in;user-select:none';
    overlay.innerHTML=`
      <div style="position:absolute;top:14px;left:0;right:0;text-align:center;pointer-events:none">
        <div style="color:#cc66ff;font-size:13px;letter-spacing:6px">${I18N.t('ui.voidAsteroidBreakSub')}</div>
        <div style="color:#fff;font-size:18px;font-weight:bold;letter-spacing:3px;margin-top:4px">${I18N.t('ui.voidAsteroidBreak')}</div>
      </div>
      <canvas id="ab-cv" width="${W}" height="${H}" style="background:#000;border:2px solid #6633aa;border-radius:8px;box-shadow:0 0 36px rgba(180,80,255,.5);cursor:none;touch-action:none;outline:none;max-width:96vw;max-height:84vh" tabindex="0"></canvas>
      <div style="position:absolute;bottom:16px;left:0;right:0;text-align:center;color:#aaa;font-size:11px;letter-spacing:2px;line-height:1.7;pointer-events:none">
        ${I18N.t('ui.miniGameControls',{mouse:I18N.t('ui.mouseMovement')})}
      </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(()=>{overlay.style.opacity='1';});
    const cv=overlay.querySelector('#ab-cv'), cx=cv.getContext('2d');
    cv.focus();
    // 이미지 로드
    const shipImg=new Image();shipImg.src=shipSrc;
    const pirateImgs={};const _piVer=(typeof window!=='undefined'&&window._GAME_VER)?('?v='+encodeURIComponent(window._GAME_VER)):'';['PIRATE_S','PIRATE_M','PIRATE_L'].forEach(k=>{pirateImgs[k]=new Image();pirateImgs[k].src='img/combat/enemies/'+k+'.png'+_piVer;});
    // 백구 AI 무드 이미지 프리로드
    const baekguImgs={};
    ['fight','smile1','smile2','smile4','anger0','anger1','anger2','sad','sad_happy','surprise','advice','think','bothersome','default'].forEach(m=>{
      const im=new Image();
      im.src=(m==='surprise')?'img/chars/baekgu1_surprise.png'
           :(m==='default')?'img/chars/baekgu2.png'
           :'img/chars/baekgu2_'+m+'.png';
      baekguImgs[m]=im;
    });
  
    // 게임 상태
    const state={
      ship:{x:120, y:H/2, vx:0, vy:0, w:flagSize, h:flagSize, hp:flagStat.HP, maxHP:flagStat.HP, sh:flagStat.maxSH, maxSH:flagStat.maxSH, att:flagStat.ATT||30, hitFlash:0},
      asteroids:[],
      enemies:[],
      pBullets:[],   // 아군 레이저
      pMissiles:[],  // 아군 미사일 (호밍)
      eBullets:[],   // 적 레이저
      eMissiles:[],  // 적 미사일
      parts:[],      // 폭발 파편
      stars:[],      // 배경 별 (스크롤)
      ultEffects:[], // 필살기(테슬라 초공간 라이트닝) 잔존 이펙트
      loots:[],      // 적 격파 시 드롭된 파츠 아이템 (사용자 요청)
      ultimateCd:0,  // 필살기 쿨다운 (60fps 기준, 600=10초)
      startMs:Date.now(),
      durationMs:50000,  // 50초 — 이 시간 후 맵으로 복귀 가능
      ended:false,
      spawnTimerAst:0,
      spawnTimerEn:0,
      laserCd:0, missileCd:0,
      kills:0, score:0,
      mouseX:null, mouseY:null,
      // 백구 AI HUD — 무드+대사+만료 시각
      baekgu:{mood:'fight', msg:I18N.t('mini.bk.startup'), expireAt:Date.now()+2500, bubbleAlpha:1, lastTriggerMs:0}
    };
    // 백구 발화 헬퍼 — 우선순위/쿨다운 처리
    function _baekguSay(mood,msg,durMs,priority){
      const now=Date.now();
      // 우선순위 낮은 발화는 쿨다운 600ms 내 무시
      if(!priority && now-state.baekgu.lastTriggerMs<600)return;
      state.baekgu.mood=mood||'default';
      state.baekgu.msg=msg||'';
      state.baekgu.expireAt=now+(durMs||1800);
      state.baekgu.bubbleAlpha=1;
      state.baekgu.lastTriggerMs=now;
    }
    // 무작위 대사 풀
    const _baekguLines={
      hit:[
        ['anger1',I18N.t('mini.bk.hit1')],
        ['sad',I18N.t('mini.bk.dodge')],
        ['anger2',I18N.t('mini.bk.shieldCheck')]
      ],
      kill:[
        ['smile2',I18N.t('mini.bk.killNice')],
        ['fight',I18N.t('mini.bk.nextOne')],
        ['smile1',I18N.t('mini.bk.hitTaste')],
        ['smile4',I18N.t('mini.bk.oneShot')]
      ],
      asteroidKill:[
        ['smile2',I18N.t('mini.bk.smashAst')],
        ['fight',I18N.t('mini.bk.shattered')]
      ],
      lowHp:[
        ['anger2',I18N.t('mini.bk.danger')],
        ['sad',I18N.t('mini.bk.heal')]
      ],
      enemyApproach:[
        ['surprise',I18N.t('mini.bk.enemyRight')],
        ['fight',I18N.t('mini.bk.piratesReady')]
      ],
      advice:[
        ['advice',I18N.t('mini.bk.tipClick')],
        ['advice',I18N.t('mini.bk.tipHoming')],
        ['think',I18N.t('mini.bk.tipMissileBig')],
        ['advice',I18N.t('mini.bk.tipAstAvoid')]
      ],
      timeWarn:[
        ['fight',I18N.t('mini.bk.holdOn')],
        ['surprise',I18N.t('mini.bk.almostDone')]
      ]
    };
    function _baekguPick(cat,priority){
      const arr=_baekguLines[cat];if(!arr||!arr.length)return;
      const [mood,msg]=arr[Math.floor(Math.random()*arr.length)];
      _baekguSay(mood,msg,priority?2400:1600,priority);
    }
    // 별 배경 (3 레이어 패럴랙스)
    for(let i=0;i<140;i++){state.stars.push({x:Math.random()*W, y:Math.random()*H, sz:Math.random()*1.8+0.4, layer:Math.floor(Math.random()*3)});}
  
    // 키보드
    const keys={};
    const onKD=e=>{
      keys[e.code]=true;
      if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight','ControlLeft','ControlRight','Enter','KeyW','KeyA','KeyS','KeyD'].includes(e.code))e.preventDefault();
    };
    const onKU=e=>{keys[e.code]=false;};
    window.addEventListener('keydown',onKD);
    window.addEventListener('keyup',onKU);
    // 마우스 — 입력 모드는 키보드 vs 마우스 추적 (키 떼도 초기 위치로 안 돌아가게)
    state._inputMode='keyboard';  // 시작은 키보드 기준
    state._mouseDown=false;       // 마우스 누르고 있으면 자동 발사
    const onMM=e=>{const r=cv.getBoundingClientRect();state.mouseX=(e.clientX-r.left)*(W/r.width);state.mouseY=(e.clientY-r.top)*(H/r.height);state._inputMode='mouse';};
    const onMD=e=>{e.preventDefault();state._mouseDown=true;};  // 누르면 hold 시작
    const onMU=e=>{state._mouseDown=false;};
    cv.addEventListener('mousemove',onMM);
    cv.addEventListener('mousedown',onMD);
    // 버튼 해제는 window 레벨에서 감지 — 커서가 캔버스 밖(벽)으로 나가도 발사 유지.
    //   사용자 보고 2026-06-16: 함선을 벽에 밀어붙이면 커서가 캔버스를 벗어나
    //   mouseleave 로 발사가 끊기던 문제. mouseleave 로 발사를 멈추지 않는다.
    window.addEventListener('mouseup',onMU);
    // 터치 (모바일 대응)
    const onTS=e=>{e.preventDefault();const t=e.touches[0];if(!t)return;const r=cv.getBoundingClientRect();state.mouseX=(t.clientX-r.left)*(W/r.width);state.mouseY=(t.clientY-r.top)*(H/r.height);state._inputMode='mouse';_fireLaser();};
    const onTM=e=>{e.preventDefault();const t=e.touches[0];if(!t)return;const r=cv.getBoundingClientRect();state.mouseX=(t.clientX-r.left)*(W/r.width);state.mouseY=(t.clientY-r.top)*(H/r.height);state._inputMode='mouse';};
    cv.addEventListener('touchstart',onTS,{passive:false});
    cv.addEventListener('touchmove',onTM,{passive:false});
  
    // 발사
    function _fireLaser(){
      if(state.laserCd>0||state.ended)return;
      state.laserCd=5;  // ≈85ms @ 60fps (기존 8 → 1.5× 빠르게)
      // 무기 등급별 확산 발사 (일반1·희귀2·영웅3·전설4·신화5) — 중심 대칭 부채꼴
      const cx=state.ship.x+state.ship.w/2, cy=state.ship.y, n=_laserShots;
      for(let i=0;i<n;i++){
        const off=(i-(n-1)/2);          // 중심 기준 대칭 오프셋
        state.pBullets.push({x:cx, y:cy+off*6, vx:14, vy:off*1.7, dmg:_laserDmg, life:90});
      }
      try{AudioMgr.playSfx('laser_fire',{vol:0.4,cooldown:30});}catch(e){}
    }
    function _fireMissile(){
      if(state.missileCd>0||state.ended)return;
      // 미사일 등급별 발사 속도 배율 적용
      //   base=9 (≈150ms @60fps) × _missileCdMul
      //   normal=18, legend≈13, mythic≈8
      state.missileCd=Math.round(9*_missileCdMul);
      // 가장 가까운 적 타겟 (소행성·해적 합산)
      let target=null,td=1e9;
      [...state.asteroids,...state.enemies].forEach(e=>{
        const d=Math.hypot(e.x-state.ship.x,e.y-state.ship.y);
        if(d<td){td=d;target=e;}
      });
      // 무기 등급별 확산 발사 (일반1·희귀2·영웅3·전설4·신화5) — 호밍이라 초기 부채꼴 후 타겟 추적
      const cx=state.ship.x+state.ship.w/2, cy=state.ship.y, n=_missileShots;
      for(let i=0;i<n;i++){
        const off=(i-(n-1)/2);
        state.pMissiles.push({x:cx, y:cy+off*9, vx:6, vy:off*1.3, target, dmg:_missileDmg, life:140});
      }
      try{AudioMgr.playSfx('missile',{vol:0.5,cooldown:60});}catch(e){}
    }
    // 필살기 — 테슬라 초공간 라이트닝 (LeftShift, 10초 쿨다운)
    // 함선 앞 방향 직선형 빔, 너비 = 함선 크기 ×2.5 (사용자 요청: 50% 축소)
    function _fireUltimate(){
      if(state.ultimateCd>0||state.ended)return;
      state.ultimateCd=600;  // 600 frames @60fps ≈ 10초
      const sx=state.ship.x+state.ship.w/2;
      const sy=state.ship.y;
      const lineHeight=state.ship.w*2.5;     // 함선 크기 ×2.5 너비 (이전 ×5 → 50% 축소)
      const halfH=lineHeight/2;
      // 라인 내 모든 적 함선 파괴
      for(let i=state.enemies.length-1;i>=0;i--){
        const e=state.enemies[i];
        if(e.x>=sx && Math.abs(e.y-sy)<=halfH+e.h/2){
          _explode(e.x,e.y,'#cc66ff',true);
          _dropLoot(e.x,e.y,e.sz==='L'||e.sz==='M');
          state.kills++;
          state.enemies.splice(i,1);
        }
      }
      // 라인 내 모든 소행성 파괴
      for(let i=state.asteroids.length-1;i>=0;i--){
        const a=state.asteroids[i];
        if(a.x>=sx && Math.abs(a.y-sy)<=halfH+a.r){
          _explode(a.x,a.y,'#cc66ff',a.sz==='L');
          state.kills++;
          state.asteroids.splice(i,1);
        }
      }
      // 라이트닝 이펙트 (45프레임 잔존)
      state.ultEffects.push({x:sx,y:sy,halfH,life:45,maxLife:45,seed:Math.random()*9999});
      // SFX + 백구 발화
      try{AudioMgr.playSfx('explosion',{vol:0.7});}catch(e){}
      try{AudioMgr.playSfx('laser_fire',{vol:0.6});}catch(e){}
      _baekguSay('fight',I18N.t('mini.bk.teslaUlt'),2400,true);
    }
  
    // 적 스폰
    function _spawnAsteroid(){
      const roll=Math.random();
      let sz, r, hp;
      // 소행성 HP — 추가 ×1.5 적용 (S:4→6 / M:8→12 / L:16→24, 사용자 요청 2026-06-16). 크기는 그대로
      if(roll<0.55){sz='S';r=14+Math.random()*8;hp=6;}
      else if(roll<0.85){sz='M';r=22+Math.random()*10;hp=12;}
      else {sz='L';r=34+Math.random()*14;hp=24;}
      const elapsed=(Date.now()-state.startMs)/1000;
      // 소행성 속도 ½ (사용자 요청)
      const speed=(2+Math.random()*1.2+Math.min(2,elapsed/8))*0.5;
      state.asteroids.push({
        x:W+r, y:30+Math.random()*(H-60), r, sz, hp, maxHp:hp,
        vx:-speed, vy:(Math.random()-0.5)*0.2,
        rot:Math.random()*Math.PI*2, rotSpeed:(Math.random()-0.5)*0.06
      });
    }
    function _spawnEnemy(){
      const roll=Math.random();
      let sz, w, h, hp, fireRate, dmg;
      // 크기 비율 1:3:5 + 적함은 동급 아군보다 2× 큼 (S60/M180/L300)
      // HP — 추가 ×1.5 적용 (S:12→18 / M:20→30 / L:40→60, 사용자 요청 2026-06-16)
      // 발사 빈도 70% (사용자 요청) — fireRate(쿨다운)는 클수록 발사 느려짐: ×1/0.7 ≈ ×1.43
      if(roll<0.5){sz='S';w=60;h=60;hp=18;fireRate=114;dmg=8;}
      else if(roll<0.85){sz='M';w=180;h=180;hp=30;fireRate=86;dmg=14;}
      else {sz='L';w=300;h=300;hp=60;fireRate=64;dmg=22;}
      state.enemies.push({
        x:W+w, y:60+Math.random()*(H-120), w, h, sz, hp, maxHp:hp,
        // 적 함선 속도 ½ (사용자 요청)
        vx:-(1.4+Math.random()*0.8)*0.5, vy:(Math.random()-0.5)*0.3,
        fireCd:30+Math.random()*30, fireRate, dmg,
        img:pirateImgs['PIRATE_'+sz]
      });
      // 백구 — 대형 적함 출현 또는 가끔
      if(sz==='L')_baekguPick('enemyApproach',true);
      else if(Math.random()<0.35)_baekguPick('enemyApproach');
    }
  
    // 충돌 검사
    function _circleHit(a,bx,by,br){return Math.hypot(a.x-bx,a.y-by)<a.r+br;}
    function _boxHit(e,bx,by,br){return bx>=e.x-e.w/2-br&&bx<=e.x+e.w/2+br&&by>=e.y-e.h/2-br&&by<=e.y+e.h/2+br;}
  
    function _explode(x,y,color,big){
      // 폭발 이펙트 1.5× — 파티클 수·확산 속도·생존 모두 상향
      const n=Math.round((big?22:12)*1.5);
      for(let k=0;k<n;k++){
        const ang=Math.random()*Math.PI*2, sp=(1+Math.random()*4)*1.5;
        state.parts.push({x,y,vx:Math.cos(ang)*sp,vy:Math.sin(ang)*sp,life:Math.round((25+Math.random()*15)*1.2),col:color||'#ffaa44',sz:3});
      }
    }
    // ─── 적함 격파 시 파츠 드롭 (사용자 요청) ─────────────────────────
    // 25% 확률로 일반~희귀 파츠 드롭. 대형 격파 시 35%, 신화 파츠는 등장 안 함.
    function _dropLoot(x,y,big){
      const rate=big?0.35:0.20;
      if(Math.random()>=rate)return;
      if(typeof PARTS==='undefined')return;
      // 풀: 비-퀘스트, 가격 있음, mythic 제외, 티어 가중치 (낮을수록 흔함)
      const _r=Math.random();
      let pool;
      if(_r<0.65)pool=PARTS.filter(p=>!p.quest&&p.price>0&&p.tier<6&&p.rarity!=='mythic'&&p.rarity!=='set');  // 일반
      else if(_r<0.93)pool=PARTS.filter(p=>!p.quest&&p.price>0&&p.tier>=6&&p.tier<11&&p.rarity!=='mythic');    // 영웅
      else pool=PARTS.filter(p=>!p.quest&&p.price>0&&p.tier>=11&&p.rarity!=='mythic');                          // 전설
      if(!pool||pool.length===0)pool=PARTS.filter(p=>!p.quest&&p.price>0&&p.rarity!=='mythic');
      if(!pool.length)return;
      const p=pool[Math.floor(Math.random()*pool.length)];
      // 등급별 색상
      const _col=p.rarity==='legend'||p.rarity==='L'||p.tier>=11?'#ffcc44':p.rarity==='set'?'#33ddff':p.rarity==='hero'||p.rarity==='H'||p.tier>=6?'#cc88ff':p.rarity==='R'?'#88ccff':'#bbbbbb';
      state.loots.push({
        id:p.id, nm:p.nm, col:_col,
        x:x, y:y,
        vx:-(0.4+Math.random()*0.6),     // 좌측으로 천천히 흘러감 (스크롤 함께)
        vy:(Math.random()-0.5)*0.4,
        life:280,  // ~4.7초 (60fps)
        maxLife:280,
        r:14
      });
    }
    function _damageShip(amt){
      if(state.ship.sh>0){
        const absorbed=Math.min(state.ship.sh,amt);
        state.ship.sh-=absorbed;amt-=absorbed;
      }
      if(amt>0){state.ship.hp-=amt;state.ship.hitFlash=10;
        cv.style.boxShadow='0 0 36px rgba(255,80,80,.8)';
        setTimeout(()=>{cv.style.boxShadow='0 0 36px rgba(180,80,255,.5)';},150);
        // 백구 — 피격
        const hpPct=state.ship.hp/Math.max(1,state.ship.maxHP);  // maxHP 0 가드 (NaN 방지)
        if(hpPct<0.3)_baekguPick('lowHp',true);
        else _baekguPick('hit');
      }
      if(state.ship.hp<=0){state.ship.hp=0;_baekguSay('sad',I18N.t('mini.bk.sunk'),3000,true);_finish(false);}
    }
  
    function _finish(win){
      if(state.ended)return;state.ended=true;
      // 리스너 정리
      window.removeEventListener('keydown',onKD);
      window.removeEventListener('keyup',onKU);
      window.removeEventListener('mouseup',onMU);
      // 보상
      // 명성 구간별 보상 비율 — 사용자 명세 (1/10로 축소 + 별도 드롭 보장)
      //   rep  1~10  → 10% / rep 11~50 → 5% / rep 51~100 → 3% / rep 100+ → 1%
      //   최종 ×0.1 적용 (드롭 보상이 메인, 크레딧은 소액)
      const _rep=G.reputation||0;
      const _rewPct=_rep>100?0.01:_rep>=51?0.03:_rep>=11?0.05:_rep>=1?0.10:0.10;
      // 격파 대수 기반 보상 배율 — 1대=10%, 100대 이상=100%, 그 사이 선형
      //   kills=1   → 0.1 + 0.9 * 0.01  ≈ 0.109  (≈10%)
      //   kills=50  → 0.55
      //   kills=100+ → 1.0 (캡)
      const _killScale=Math.min(1, 0.1 + 0.9*Math.min(1,Math.max(0,state.kills)/100));
      // 드롭 확률 보너스 — 격파 30대당 +1% (legend/mythic/blueprint 각각 독립)
      const _dropBonus=Math.floor(state.kills/30)*0.01;
      const rew=win?Math.round(((G.credits||0)*_rewPct+state.kills*800)*0.1*_killScale):0;
      const veRew=win?Math.round((20+state.kills*5)*0.1*_killScale):0;
      const pen=win?0:Math.round((G.credits||0)*0.03);
      // 랜덤 드롭 (승리 시) — 각 등급 독립 roll + 격파 보너스
      //   설계도 20% + bonus / 신화 30% + bonus / 전설·세트 50% + bonus (우선순위 BP→신화→전설)
      let dropTxt='', _dropImg='', _dropNm='';   // 보상 팝업 상단 이미지/멘트용 (사용자 요청 2026-06-16)
      if(win){
        const _bpId=(typeof BLUEPRINT_MAP!=='undefined')?BLUEPRINT_MAP[destPid]:null;
        const _canBp=_bpId&&!G.blueprints?.[_bpId];
        const _rBp=Math.random(), _rMy=Math.random(), _rLg=Math.random();
        // MMB01(이휘소 방정식 미사일) 설계도 +5%p 가산 (사용자 요청)
        const _bpRateBase=(_bpId==='MMB01')?(0.25+_dropBonus):(0.20+_dropBonus);
        if(_rBp<_bpRateBase&&_canBp){
          if(!G.blueprints)G.blueprints={};
          G.blueprints[_bpId]=true;
          const _rec=(typeof CRAFT_RECIPES!=='undefined')?CRAFT_RECIPES.find(r=>r.id===_bpId):null;
          dropTxt=I18N.t('drop.blueprint',{nm:(_rec?.nm||_bpId)});
          _dropNm=(_rec?.nm||_bpId); _dropImg='img/parts/'+_bpId+'.png';
          notify(I18N.t('notify.bpAcquiredFrom',{nm:_rec?.nm||_bpId}),'gold');
        } else if(_rMy<(0.30+_dropBonus)&&typeof QUEST_MYTHIC_PARTS!=='undefined'&&QUEST_MYTHIC_PARTS.length>0){
          // MMB01(이휘소 방정식 미사일) +5%p 가중치 (사용자 요청)
          const partId=_pickQuestMythicPart();
          const p=partId?PARTS.find(x=>x.id===partId):null;
          if(partId&&p){
            if(!G.inventory)G.inventory=[];
            const inv=G.inventory.find(i=>i.id===partId);
            if(inv)inv.qty++;else G.inventory.push({id:partId,nm:p.nm,qty:1});
            dropTxt=I18N.t('drop.mythicPart',{nm:(p.nm||partId)});
            _dropNm=(typeof partDisplayNm==='function'?partDisplayNm(p):(p.nm||partId)); _dropImg='img/parts/'+partId+'.png';
            notify(I18N.t('notify.mythicPartLabel',{nm:p.nm||partId}),'gold');
          }
        } else if(_rLg<(0.50+_dropBonus)&&typeof QUEST_SET_PARTS!=='undefined'&&QUEST_SET_PARTS.length>0){
          const partId=QUEST_SET_PARTS[Math.floor(Math.random()*QUEST_SET_PARTS.length)];
          if(!G.inventory)G.inventory=[];
          const inv=G.inventory.find(i=>i.id===partId);
          if(inv)inv.qty++;else G.inventory.push({id:partId,qty:1});
          const p=PARTS.find(x=>x.id===partId);
          dropTxt=I18N.t('drop.partFormat',{label:p?.rarity==='set'?I18N.t('drop.setPart'):I18N.t('drop.legendPart'),nm:(p?.nm||partId)});
          _dropNm=(typeof partDisplayNm==='function'&&p?partDisplayNm(p):(p?.nm||partId)); _dropImg='img/parts/'+partId+'.png';
          notify(I18N.t('notify.partWithRarity',{kind:p?.rarity==='set'?I18N.t('ui.setRare'):I18N.t('ui.legendRare'),nm:p?.nm||partId}),'gold');
        }
      }
      if(win){G.credits=(G.credits||0)+rew;G.voidEssence=(G.voidEssence||0)+veRew;}  // 전투 승리 VE — 사용자 요청 2026-06-16: 기존 ×2 → ×1 (50% 감소)
      else{G.credits=Math.max(100,(G.credits||0)-pen);}
      // 퀘스트 1회 효과 — 도착 행성 허브 해금 진행도 +1 (해금 요소 1회 차감)
      if(win&&destPid){try{addHubProgress(destPid);}catch(e){}}
      // 실제 함대 hp 반영 (전투 결과 보존)
      if(flagship){flagship.hp=Math.max(1,Math.floor(state.ship.hp));if(flagship.sh!=null)flagship.sh=Math.max(0,Math.floor(state.ship.sh));}
      saveGame(true);
      // 상단 시각: 드롭 아이템/함선/설계도 이미지 (없으면 🚀) + 랜덤 발견 멘트 (사용자 요청 2026-06-16)
      const _flavorN=Math.floor(Math.random()*5)+1;
      const _flavorLine=_dropNm?`<div style="color:#ffe6a8;font-size:14px;font-style:italic;line-height:1.5;margin-bottom:10px;padding:6px 12px;background:rgba(255,215,0,.06);border-radius:6px">${I18N.t('minireward.flavor'+_flavorN,{nm:_dropNm})}</div>`:'';
      const _topVisual=_dropImg?`<div style="width:104px;height:104px;margin:0 auto 12px;border-radius:12px;overflow:hidden;border:2px solid #ffd700;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center"><img src="${_dropImg}" style="width:100%;height:100%;object-fit:contain" onerror="this.outerHTML='<div style=&quot;font-size:56px&quot;>🚀</div>'"></div>`:`<div style="font-size:48px;margin-bottom:10px">🚀</div>`;
      const msg=win?
        `${_topVisual}
         <div style="color:#ffd700;font-size:24px;font-weight:bold;letter-spacing:3px;margin-bottom:8px">${I18N.t('ui.asteroidBreakthrough')}</div>
         ${_flavorLine}
         <div style="color:#66ff99;font-size:13px;line-height:1.9;margin-bottom:10px">${I18N.t('ui.shipsKilled',{n:state.kills,hp:Math.floor(state.ship.hp),max:state.ship.maxHP})}</div>
         <div style="color:#ffe;font-size:13px;line-height:1.9;background:rgba(255,215,0,.08);border:1px solid rgba(255,215,0,.3);border-radius:6px;padding:10px 16px">
           ${I18N.t('ui.creditsRewardLine',{cr:rew.toLocaleString()})} <span style="color:#aaa;font-size:11px">${I18N.t('ui.rewardMultLine',{pct:Math.round(_killScale*100)})}</span><br>${I18N.t('ui.veRewardLine',{n:veRew})}
           ${dropTxt?'<br>'+dropTxt:''}
           <br><span style="color:#cc99ff;font-size:11px">${I18N.t('ui.dropBonusLine',{pct:Math.round(_dropBonus*100)})}</span>
           <br><span style="color:#66ddff;font-size:11px">${I18N.t('ui.planetUnlockLine')}</span>
         </div>`:
        `<div style="font-size:48px;margin-bottom:10px">💥</div>
         <div style="color:#ff6666;font-size:24px;font-weight:bold;letter-spacing:3px;margin-bottom:8px">${I18N.t('ui.flagshipDown')}</div>
         <div style="color:#aaa;font-size:13px;line-height:1.9;margin-bottom:10px">${I18N.t('ui.shipsKilledShort',{n:state.kills})}</div>
         <div style="color:#ffaa99;font-size:13px;line-height:1.9;background:rgba(255,60,60,.08);border:1px solid rgba(255,80,80,.3);border-radius:6px;padding:10px 16px">
           ${I18N.t('ui.creditsPenLine',{cr:pen.toLocaleString()})}
         </div>`;
      const result=document.createElement('div');
      // 팝업 1.5배 확대 (사용자 요청 2026-06-16) — 중앙 기준 scale
      result.style.cssText='position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) scale(1.5);transform-origin:center;background:rgba(20,10,40,.96);border:2px solid '+(win?'#ffd700':'#ff6666')+';border-radius:12px;padding:24px 36px;text-align:center;min-width:320px;max-width:62vw;box-shadow:0 8px 48px rgba(180,80,255,.5);z-index:10';
      result.innerHTML=msg+'<button style="margin-top:14px;padding:10px 28px;background:rgba(180,80,255,.2);border:1.5px solid #cc66ff;color:#fff;border-radius:6px;cursor:pointer;font-size:13px;letter-spacing:2px" onclick="(function(){var ov=document.getElementById(\'_ab-mini-overlay\');if(ov)ov.remove();})()">'+I18N.t('drop.continueBtn')+'</button>';
      overlay.appendChild(result);
    }
  
    // 메인 루프
    let lastT=Date.now();
    function tick(){
      if(!document.body.contains(overlay))return;
      if(state.ended)return;
      const now=Date.now();
      const dt=(now-lastT)/16.67;
      lastT=now;
      const elapsed=now-state.startMs;
      const leftSec=Math.max(0,Math.ceil((state.durationMs-elapsed)/1000));
  
      // 입력 → 이동 (tier × engine 등급 배율 적용)
      let vx=0,vy=0;
      const SPD=5*_shipSpdMul;
      if(keys.KeyA||keys.ArrowLeft)vx-=SPD;
      if(keys.KeyD||keys.ArrowRight)vx+=SPD;
      if(keys.KeyW||keys.ArrowUp)vy-=SPD;
      if(keys.KeyS||keys.ArrowDown)vy+=SPD;
      // 키가 눌리면 keyboard 모드로 전환 (마우스 lerp 끊김)
      if(vx!==0||vy!==0){
        state._inputMode='keyboard';
        state.ship.x+=vx*dt;state.ship.y+=vy*dt;
      } else if(state._inputMode==='mouse'&&state.mouseX!=null){
        // 마우스 모드에서만 lerp — 배율 함께 적용 (0.04~0.50 클램프)
        const _lerp=clamp(0.18*_shipSpdMul,0.04,0.50);
        state.ship.x+=(state.mouseX-state.ship.w/2-state.ship.x)*_lerp;
        state.ship.y+=(state.mouseY-state.ship.y)*_lerp;
      }
      // (둘 다 아니면 현재 위치 그대로 유지 — 초기 위치로 안 돌아감)
      // 클램프 (캔버스 영역)
      state.ship.x=clamp(state.ship.x,0,W-state.ship.w-4);
      state.ship.y=Math.max(state.ship.h/2,Math.min(H-state.ship.h/2,state.ship.y));
  
      // 발사 입력
      if(state.laserCd>0)state.laserCd-=dt;
      if(state.missileCd>0)state.missileCd-=dt;
      if(state.ultimateCd>0)state.ultimateCd-=dt;
      // 실드 자연 회복 — 장착 실드 파츠 등급별 (피격 직후엔 회복 안 함)
      if(_shieldRegen>0 && state.ship.hitFlash<=0 && state.ship.sh<state.ship.maxSH){
        state.ship.sh=Math.min(state.ship.maxSH,state.ship.sh+_shieldRegen*dt);
      }
      // hold 자동 발사 — 키 또는 마우스 버튼을 누르고 있는 동안 cd마다 계속 발사
      //   레이저: RightShift + 마우스 클릭 (LeftShift는 필살기 전용)
      //   미사일: Ctrl/Enter
      //   필살기: LeftShift (테슬라 초공간 라이트닝, 10초 쿨)
      if(keys.ShiftRight||state._mouseDown)_fireLaser();
      if(keys.ControlLeft||keys.ControlRight||keys.Enter)_fireMissile();
      if(keys.ShiftLeft)_fireUltimate();
  
      // 스폰
      state.spawnTimerAst+=dt;state.spawnTimerEn+=dt;
      if(state.spawnTimerAst>=Math.max(14,40-Math.floor(elapsed/2000)*4)){state.spawnTimerAst=0;_spawnAsteroid();}
      // 마지막 20초(러시 구간): 적 스폰 간격 절반 + 매 스폰마다 2척 (총 2배)
      const _isRush=(state.durationMs-elapsed)<=20000;
      const _enThresh=Math.max(140,280-Math.floor(elapsed/3000)*30)*(_isRush?0.5:1);
      if(state.spawnTimerEn>=_enThresh){
        state.spawnTimerEn=0;
        _spawnEnemy();
        if(_isRush)_spawnEnemy();
        // 러시 진입 시점에 한 번만 경고
        if(_isRush&&!state._rushAnnounced){
          state._rushAnnounced=true;
          _baekguSay('anger2',I18N.t('mini.bk.lastReinforce'),2800,true);
          try{notify(I18N.t('notify.last20Seconds'),'warn');}catch(e){}
        }
      }
  
      // ─── 렌더 시작 ───
      cx.fillStyle='#000';cx.fillRect(0,0,W,H);
      // 배경 별 스크롤 (우→좌)
      for(const s of state.stars){
        s.x-=(0.4+s.layer*0.8)*dt;
        if(s.x<0)s.x=W;
        const col=['#445','#778','#abc'][s.layer]||'#789';
        cx.fillStyle=col;cx.fillRect(s.x,s.y,s.sz,s.sz);
      }
  
      // 적 함선 업데이트·렌더
      for(let i=state.enemies.length-1;i>=0;i--){
        const e=state.enemies[i];
        e.x+=e.vx*dt;e.y+=e.vy*dt;
        if(e.y<e.h/2||e.y>H-e.h/2)e.vy=-e.vy;
        e.fireCd-=dt;
        if(e.fireCd<=0&&e.x<W-20){
          e.fireCd=e.fireRate;
          // 75% 레이저, 25% 미사일 — 사용자 요청 "미사일 발사속도 절반" 반영
          if(Math.random()<0.75){
            state.eBullets.push({x:e.x-e.w/2,y:e.y,vx:-9,dmg:e.dmg,life:120});
          } else {
            state.eMissiles.push({x:e.x-e.w/2,y:e.y,vx:-4,vy:0,target:state.ship,dmg:e.dmg*1.4,life:160});
          }
        }
        if(e.x<-e.w){state.enemies.splice(i,1);continue;}
        // 그리기
        if(e.img&&e.img.complete&&e.img.naturalWidth>0){
          cx.save();cx.translate(e.x,e.y);cx.scale(-1,1);  // 좌측 향하게 반전
          cx.drawImage(e.img,-e.w/2,-e.h/2,e.w,e.h);cx.restore();
        } else {
          cx.fillStyle='#cc4444';cx.beginPath();cx.ellipse(e.x,e.y,e.w/2,e.h/2,0,0,Math.PI*2);cx.fill();
        }
        // HP 바 (잔여 비율)
        if(e.hp<e.maxHp){
          cx.fillStyle='rgba(0,0,0,.6)';cx.fillRect(e.x-e.w/2,e.y-e.h/2-8,e.w,4);
          cx.fillStyle='#ff6666';cx.fillRect(e.x-e.w/2,e.y-e.h/2-8,e.w*(e.hp/e.maxHp),4);
        }
      }
  
      // 소행성 업데이트·렌더
      for(let i=state.asteroids.length-1;i>=0;i--){
        const a=state.asteroids[i];
        a.x+=a.vx*dt;a.y+=a.vy*dt;a.rot+=a.rotSpeed*dt;
        if(a.y<a.r||a.y>H-a.r)a.vy=-a.vy;
        if(a.x<-a.r){state.asteroids.splice(i,1);continue;}
        // 기함 충돌 = 데미지 (소행성은 자체 폭발)
        if(Math.hypot(a.x-(state.ship.x+state.ship.w/2),a.y-state.ship.y)<a.r+state.ship.w*0.35){
          _explode(a.x,a.y,'#ffaa66',a.sz==='L');
          _damageShip(a.sz==='L'?60:a.sz==='M'?30:15);
          state.asteroids.splice(i,1);continue;
        }
        // 그리기
        cx.save();cx.translate(a.x,a.y);cx.rotate(a.rot);
        cx.fillStyle='#998877';cx.strokeStyle='#665544';cx.lineWidth=1.5;
        cx.beginPath();
        const sides=8;
        for(let k=0;k<sides;k++){const ang=(k/sides)*Math.PI*2;const rr=a.r*(0.85+0.3*Math.sin(k*7.3));const px=Math.cos(ang)*rr,py=Math.sin(ang)*rr;if(k===0)cx.moveTo(px,py);else cx.lineTo(px,py);}
        cx.closePath();cx.fill();cx.stroke();
        cx.fillStyle='#776655';cx.beginPath();cx.arc(-a.r*0.3,-a.r*0.2,a.r*0.18,0,Math.PI*2);cx.fill();
        cx.restore();
      }
  
      // 아군 레이저
      for(let i=state.pBullets.length-1;i>=0;i--){
        const b=state.pBullets[i];b.x+=b.vx*dt;b.y+=(b.vy||0)*dt;b.life-=dt;
        if(b.x>W||b.life<=0){state.pBullets.splice(i,1);continue;}
        // 충돌
        let hit=false;
        for(let k=state.asteroids.length-1;k>=0;k--){
          const a=state.asteroids[k];
          if(_circleHit(a,b.x,b.y,3)){a.hp-=b.dmg;if(a.hp<=0){_explode(a.x,a.y,'#ffaa66',a.sz==='L');state.kills++;state.asteroids.splice(k,1);if(Math.random()<0.18)_baekguPick('asteroidKill');}hit=true;break;}
        }
        if(!hit){
          for(let k=state.enemies.length-1;k>=0;k--){
            const e=state.enemies[k];
            if(_boxHit(e,b.x,b.y,3)){e.hp-=b.dmg;if(e.hp<=0){_explode(e.x,e.y,'#ff6644',true);_dropLoot(e.x,e.y,e.sz==='L'||e.sz==='M');state.kills++;state.enemies.splice(k,1);_baekguPick('kill',true);}hit=true;break;}
          }
        }
        // 흡혈 — 레이저 명중 시 maxHP/maxSH 일부 회복 (RB09/RB10 장착 효과)
        if(hit && (_leechHpPct>0||_leechShPct>0)){
          if(_leechHpPct>0)state.ship.hp=Math.min(state.ship.maxHP,state.ship.hp+state.ship.maxHP*_leechHpPct);
          if(_leechShPct>0)state.ship.sh=Math.min(state.ship.maxSH,(state.ship.sh||0)+state.ship.maxSH*_leechShPct);
        }
        if(hit){state.pBullets.splice(i,1);continue;}
        // 그리기 — 무기 등급별 분기 (사용자 명세)
        //   normal(영웅 이하): 기본 청록 빔 (1.5배 확대)
        //   legend(전설·세트): 지속 전투모드 풍 — 두꺼운 다단 빔 + 강한 글로우
        //   mythic(신화): 번개 지그재그 + 1.3× 더 두꺼운 빔 + 흰 코어
        const bLen=18, bThick=4.5;  // 기본 1.5× (기존 12/3)
        if(weaponTier==='mythic'){
          // 번개 효과 — 지그재그
          const segs=4, mult=1.3;
          cx.save();
          cx.strokeStyle='#88ddff';cx.shadowColor='#aaeeff';cx.shadowBlur=18;cx.lineWidth=bThick*mult+1;cx.lineCap='round';
          cx.beginPath();cx.moveTo(b.x-bLen,b.y);
          for(let s=1;s<=segs;s++){
            const px=b.x-bLen+(bLen/segs)*s;
            const py=b.y+(s===segs?0:(Math.random()-0.5)*6);
            cx.lineTo(px,py);
          }
          cx.stroke();
          // 흰 코어
          cx.strokeStyle='#ffffff';cx.shadowBlur=0;cx.lineWidth=bThick*0.7;
          cx.beginPath();cx.moveTo(b.x-bLen,b.y);cx.lineTo(b.x,b.y);cx.stroke();
          cx.restore();
        } else if(weaponTier==='legend'){
          // 전설 — 두꺼운 다단 빔 (지속 전투모드 느낌)
          cx.save();
          // 바깥 글로우
          cx.strokeStyle='#00f3ff';cx.shadowColor='#00f3ff';cx.shadowBlur=20;cx.lineWidth=bThick*1.6;cx.lineCap='round';
          cx.beginPath();cx.moveTo(b.x-bLen,b.y);cx.lineTo(b.x,b.y);cx.stroke();
          // 중간 빔
          cx.strokeStyle='#aaf6ff';cx.shadowBlur=12;cx.lineWidth=bThick*0.9;
          cx.beginPath();cx.moveTo(b.x-bLen,b.y);cx.lineTo(b.x,b.y);cx.stroke();
          // 코어
          cx.strokeStyle='#ffffff';cx.shadowBlur=0;cx.lineWidth=bThick*0.4;
          cx.beginPath();cx.moveTo(b.x-bLen,b.y);cx.lineTo(b.x,b.y);cx.stroke();
          cx.restore();
        } else {
          // normal — 기본 (1.5×)
          cx.strokeStyle='#00f3ff';cx.lineWidth=bThick;cx.shadowColor='#00f3ff';cx.shadowBlur=15;
          cx.beginPath();cx.moveTo(b.x-bLen,b.y);cx.lineTo(b.x,b.y);cx.stroke();
          cx.shadowBlur=0;
        }
      }
  
      // 아군 미사일 (호밍) — 3단계 타게팅 + 근접 폭발(맴돌이 방지) + 적중영역 3배
      function _findMissileTarget(m){
        // 3단계 거리 밴드: 1단계 가까움(≤180) → 2단계 중간(≤360) → 3단계 멀음(전체)
        const all=[...state.asteroids,...state.enemies].filter(e=>e&&e.hp>0&&(e.x===undefined||e.x>-40));
        if(!all.length)return null;
        const tiers=[180, 360, Infinity];
        for(const tierR of tiers){
          let nt=null, td=Infinity;
          for(const e of all){
            const d=Math.hypot(e.x-m.x,e.y-m.y);
            if(d<=tierR && d<td){td=d;nt=e;}
          }
          if(nt)return nt;
        }
        return null;
      }
      for(let i=state.pMissiles.length-1;i>=0;i--){
        const m=state.pMissiles[i];
        // 주기적 재타게팅 (10프레임마다) — 죽은 타겟·범위 이탈 대응 + 항상 가까운 적 우선
        if(m._retCd===undefined)m._retCd=0;
        m._retCd-=dt;
        if(m._retCd<=0||!m.target||m.target.hp<=0||(m.target.x!==undefined&&m.target.x<-40)){
          m.target=_findMissileTarget(m);
          m._retCd=10;
        }
        if(m.target){
          const dx=m.target.x-m.x, dy=m.target.y-m.y, d=Math.hypot(dx,dy)||1;
          // 가까울수록 더 강한 선회 (맴돌이 방지)
          const turn=d<80?1.6 : d<180?1.1 : 0.7;
          m.vx+=(dx/d)*turn*dt; m.vy+=(dy/d)*turn*dt;
          // 속도 클램프
          const sp=Math.hypot(m.vx,m.vy);if(sp>12){m.vx*=12/sp;m.vy*=12/sp;}
          // 근접 폭발 — 25px 이내면 즉시 적중 (3배 적중영역의 의미를 살림)
          if(d<25){
            if(m.target.r!=null){
              // 소행성
              m.target.hp-=m.dmg;
              if(m.target.hp<=0){
                _explode(m.target.x,m.target.y,'#ffaa66',true);state.kills++;
                const ai=state.asteroids.indexOf(m.target);if(ai>=0)state.asteroids.splice(ai,1);
                if(Math.random()<0.18)_baekguPick('asteroidKill');
              }
            } else if(m.target.w!=null){
              // 적함
              m.target.hp-=m.dmg;
              if(m.target.hp<=0){
                _explode(m.target.x,m.target.y,'#ff6644',true);
                _dropLoot(m.target.x,m.target.y,m.target.sz==='L'||m.target.sz==='M');
                state.kills++;
                const ei=state.enemies.indexOf(m.target);if(ei>=0)state.enemies.splice(ei,1);
                _baekguPick('kill',true);
              }
            }
            _explode(m.x,m.y,'#ff8844',false);
            state.pMissiles.splice(i,1);
            continue;
          }
        }
        m.x+=m.vx*dt;m.y+=m.vy*dt;m.life-=dt;
        if(m.x>W+30||m.x<-30||m.y<-30||m.y>H+30||m.life<=0){state.pMissiles.splice(i,1);continue;}
        // 직접 충돌 (적중영역 5→15, 3배 확장)
        let hit=false;
        for(let k=state.asteroids.length-1;k>=0;k--){
          const a=state.asteroids[k];
          if(_circleHit(a,m.x,m.y,15)){a.hp-=m.dmg;if(a.hp<=0){_explode(a.x,a.y,'#ffaa66',true);state.kills++;state.asteroids.splice(k,1);if(Math.random()<0.18)_baekguPick('asteroidKill');}hit=true;break;}
        }
        if(!hit){
          for(let k=state.enemies.length-1;k>=0;k--){
            const e=state.enemies[k];
            if(_boxHit(e,m.x,m.y,15)){e.hp-=m.dmg;if(e.hp<=0){_explode(e.x,e.y,'#ff6644',true);_dropLoot(e.x,e.y,e.sz==='L'||e.sz==='M');state.kills++;state.enemies.splice(k,1);_baekguPick('kill',true);}hit=true;break;}
          }
        }
        if(hit){_explode(m.x,m.y,'#ff8844',false);state.pMissiles.splice(i,1);continue;}
        // 그리기 — 미사일 본체 1.5× 확장 + 글로우도 1.5×
        cx.save();cx.translate(m.x,m.y);cx.rotate(Math.atan2(m.vy,m.vx));
        cx.fillStyle='#ff66cc';cx.shadowColor='#ff66cc';cx.shadowBlur=18;
        cx.beginPath();cx.moveTo(-12,-4.5);cx.lineTo(12,0);cx.lineTo(-12,4.5);cx.closePath();cx.fill();
        cx.shadowBlur=0;cx.restore();
      }
  
      // 적 레이저
      for(let i=state.eBullets.length-1;i>=0;i--){
        const b=state.eBullets[i];b.x+=b.vx*dt;b.life-=dt;
        if(b.x<-12||b.life<=0){state.eBullets.splice(i,1);continue;}
        // 기함 충돌
        if(b.x>=state.ship.x&&b.x<=state.ship.x+state.ship.w&&b.y>=state.ship.y-state.ship.h/2&&b.y<=state.ship.y+state.ship.h/2){
          _damageShip(b.dmg);_explode(b.x,b.y,'#ff4444',false);state.eBullets.splice(i,1);continue;
        }
        cx.strokeStyle='#ff4444';cx.lineWidth=3;cx.shadowColor='#ff4444';cx.shadowBlur=8;
        cx.beginPath();cx.moveTo(b.x,b.y);cx.lineTo(b.x+12,b.y);cx.stroke();cx.shadowBlur=0;
      }
  
      // 적 미사일
      for(let i=state.eMissiles.length-1;i>=0;i--){
        const m=state.eMissiles[i];
        const ty=state.ship.y, tx=state.ship.x+state.ship.w/2;
        const dx=tx-m.x, dy=ty-m.y, d=Math.hypot(dx,dy)||1;
        m.vx+=(dx/d)*0.5*dt;m.vy+=(dy/d)*0.5*dt;
        const sp=Math.hypot(m.vx,m.vy);if(sp>8){m.vx*=8/sp;m.vy*=8/sp;}
        m.x+=m.vx*dt;m.y+=m.vy*dt;m.life-=dt;
        if(m.x<-30||m.life<=0){state.eMissiles.splice(i,1);continue;}
        // 기함 충돌
        if(Math.hypot(m.x-tx,m.y-ty)<state.ship.w*0.4){
          _damageShip(m.dmg);_explode(m.x,m.y,'#ff4488',true);state.eMissiles.splice(i,1);continue;
        }
        cx.save();cx.translate(m.x,m.y);cx.rotate(Math.atan2(m.vy,m.vx));
        cx.fillStyle='#ff6688';cx.shadowColor='#ff6688';cx.shadowBlur=10;
        cx.beginPath();cx.moveTo(-7,-3);cx.lineTo(7,0);cx.lineTo(-7,3);cx.closePath();cx.fill();
        cx.shadowBlur=0;cx.restore();
      }
  
      // 쉴드 시각화 — 매우 옅게(약 10% 투명도) 기함 둘레에 청록 오라
      if(state.ship.sh>0){
        const shRatio=clamp(state.ship.sh/Math.max(1,state.ship.maxSH),0,1);
        const shAlpha=0.10*shRatio;  // 최대 10%
        cx.save();
        cx.globalAlpha=shAlpha;
        const grd=cx.createRadialGradient(state.ship.x+state.ship.w/2,state.ship.y,state.ship.w*0.3,state.ship.x+state.ship.w/2,state.ship.y,state.ship.w*0.85);
        grd.addColorStop(0,'rgba(102,221,255,.8)');
        grd.addColorStop(0.7,'rgba(102,221,255,.4)');
        grd.addColorStop(1,'rgba(102,221,255,0)');
        cx.fillStyle=grd;
        cx.beginPath();cx.ellipse(state.ship.x+state.ship.w/2,state.ship.y,state.ship.w*0.85,state.ship.h*0.7,0,0,Math.PI*2);cx.fill();
        // 옅은 테두리 (헥사 임팩트 느낌)
        cx.globalAlpha=shAlpha*1.5;
        cx.strokeStyle='#66ddff';cx.lineWidth=1.5;
        cx.beginPath();cx.ellipse(state.ship.x+state.ship.w/2,state.ship.y,state.ship.w*0.8,state.ship.h*0.65,0,0,Math.PI*2);cx.stroke();
        cx.restore();
      }
  
      // 기함 그리기 (좌측, 우측 향함)
      if(shipImg.complete&&shipImg.naturalWidth>0){
        cx.save();
        if(state.ship.hitFlash>0){cx.globalAlpha=0.4+0.3*Math.random();state.ship.hitFlash-=dt;}
        cx.drawImage(shipImg,state.ship.x,state.ship.y-state.ship.h/2,state.ship.w,state.ship.h);
        cx.restore();
      } else {
        cx.fillStyle='#00f3ff';cx.beginPath();
        cx.moveTo(state.ship.x+state.ship.w,state.ship.y);
        cx.lineTo(state.ship.x,state.ship.y-state.ship.h/2);
        cx.lineTo(state.ship.x+state.ship.w*0.3,state.ship.y);
        cx.lineTo(state.ship.x,state.ship.y+state.ship.h/2);
        cx.closePath();cx.fill();
      }
      // 엔진 잔염
      if(state.ship.hitFlash<=0){
        cx.fillStyle='rgba(102,221,255,'+(0.4+0.4*Math.random())+')';
        cx.beginPath();cx.ellipse(state.ship.x-8,state.ship.y,12,4,0,0,Math.PI*2);cx.fill();
      }
  
      // 파편
      for(let i=state.parts.length-1;i>=0;i--){
        const p=state.parts[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;
        if(p.life<=0){state.parts.splice(i,1);continue;}
        cx.fillStyle=p.col;cx.globalAlpha=Math.max(0,p.life/30);
        cx.beginPath();cx.arc(p.x,p.y,p.sz||3,0,Math.PI*2);cx.fill();
      }
      cx.globalAlpha=1;
  
      // ─── 드롭된 파츠 (loot) — 이동·픽업·그리기 (사용자 요청) ───
      if(state.loots&&state.loots.length){
        const shipCx=state.ship.x+state.ship.w/2, shipCy=state.ship.y;
        const shipR=state.ship.w*0.6;
        for(let li=state.loots.length-1;li>=0;li--){
          const lt=state.loots[li];
          lt.x+=lt.vx*dt; lt.y+=lt.vy*dt;
          lt.life-=dt;
          // 화면 밖이나 수명 종료 시 제거
          if(lt.life<=0||lt.x<-30){state.loots.splice(li,1);continue;}
          // 함선과 충돌 → 픽업
          const dx=lt.x-shipCx, dy=lt.y-shipCy;
          if(Math.sqrt(dx*dx+dy*dy)<=shipR+lt.r){
            // 인벤토리에 추가
            try{
              if(!G.inventory)G.inventory=[];
              const inv=G.inventory.find(i=>i.id===lt.id);
              if(inv)inv.qty++;else G.inventory.push({id:lt.id,nm:lt.nm,qty:1});
              notify(I18N.t('notify.partGotMinigame',{nm:lt.nm}),'gold');
              try{AudioMgr.playSfx('gacha_pull',{vol:0.5});}catch(e){}
              try{_baekguSay('happy',I18N.t('mini.bk.partsGet'),2000,false);}catch(e){}
              // 픽업한 아이템 이미지를 잠깐 띄웠다가 사라지게 (사용자 요청 2026-06-16)
              try{
                const _rc=cv.getBoundingClientRect();
                const _px=_rc.left+shipCx*(_rc.width/W), _py=_rc.top+shipCy*(_rc.height/H);
                const _fx=document.createElement('img');
                _fx.src='img/parts/'+lt.id+'.png'+((window._GAME_VER)?('?v='+encodeURIComponent(window._GAME_VER)):'');
                _fx.style.cssText='position:fixed;left:'+_px+'px;top:'+_py+'px;width:66px;height:66px;object-fit:contain;transform:translate(-50%,-50%) scale(.55);opacity:0;pointer-events:none;z-index:100000;filter:drop-shadow(0 0 12px '+lt.col+');transition:transform .28s ease-out,opacity .28s ease-out';
                document.body.appendChild(_fx);
                requestAnimationFrame(()=>{_fx.style.transform='translate(-50%,-95%) scale(1.45)';_fx.style.opacity='1';});
                setTimeout(()=>{_fx.style.opacity='0';_fx.style.transform='translate(-50%,-160%) scale(1.1)';},560);
                setTimeout(()=>{try{_fx.remove();}catch(e){}},980);
              }catch(e){}
            }catch(e){}
            state.loots.splice(li,1);
            continue;
          }
          // 그리기 — 등급 색상 글로우 박스 + 깜빡임
          const blink=lt.life<60?(Math.sin(lt.life*0.5)*0.4+0.6):1;
          cx.save();
          cx.globalAlpha=Math.min(1,(lt.life/lt.maxLife)*1.2)*blink;
          cx.shadowColor=lt.col;cx.shadowBlur=16;
          cx.fillStyle=lt.col;
          cx.fillRect(lt.x-lt.r,lt.y-lt.r,lt.r*2,lt.r*2);
          cx.fillStyle='rgba(0,0,0,.6)';
          cx.fillRect(lt.x-lt.r+3,lt.y-lt.r+3,lt.r*2-6,lt.r*2-6);
          // 내부 박스 라벨 (작은 글자 — 화면에 너무 많으면 제거)
          cx.shadowBlur=0;
          cx.fillStyle='#fff';cx.font='bold 11px monospace';cx.textAlign='center';cx.textBaseline='middle';
          cx.fillText('⚙',lt.x,lt.y);
          cx.restore();
        }
        cx.globalAlpha=1;cx.textAlign='left';cx.textBaseline='alphabetic';
      }
  
      // 필살기 라이트닝 이펙트 (테슬라 초공간) — 함선 앞쪽 직선 빔
      if(state.ultEffects&&state.ultEffects.length){
        for(let i=state.ultEffects.length-1;i>=0;i--){
          const u=state.ultEffects[i];
          u.life-=dt;
          if(u.life<=0){state.ultEffects.splice(i,1);continue;}
          const t=u.life/u.maxLife;
          cx.save();
          // 외광 (보라 글로우)
          cx.globalAlpha=0.35*t;
          cx.fillStyle='#cc66ff';
          cx.fillRect(u.x,u.y-u.halfH,W-u.x,u.halfH*2);
          // 중심 코어 (밝은 자홍색)
          cx.globalAlpha=0.85*t;
          cx.fillStyle='#ff44ff';
          cx.fillRect(u.x,u.y-u.halfH*0.35,W-u.x,u.halfH*0.7);
          // 메인 라이트닝 zigzag (3줄, 두꺼움)
          cx.globalAlpha=t;
          cx.shadowColor='#ff66ff';cx.shadowBlur=24;
          for(let k=0;k<3;k++){
            cx.strokeStyle='#ffffff';
            cx.lineWidth=4+k*2;
            cx.beginPath();
            let _y=u.y+(Math.random()-0.5)*u.halfH*0.3;
            cx.moveTo(u.x,_y);
            for(let xx=u.x+30;xx<W;xx+=30+Math.random()*40){
              _y=u.y+(Math.random()-0.5)*u.halfH*0.7;
              cx.lineTo(xx,_y);
            }
            cx.lineTo(W,u.y+(Math.random()-0.5)*20);
            cx.stroke();
          }
          // 흰 화이트 코어 라인
          cx.shadowBlur=0;
          cx.globalAlpha=t;
          cx.strokeStyle='#ffffff';cx.lineWidth=2;
          cx.beginPath();cx.moveTo(u.x,u.y);cx.lineTo(W,u.y);cx.stroke();
          cx.restore();
        }
        cx.globalAlpha=1;
      }
  
      // HUD 오버레이 (캔버스 좌상단)
      // HP 바
      cx.fillStyle='rgba(0,0,0,.6)';cx.fillRect(10,10,220,18);
      cx.fillStyle='#ff6666';cx.fillRect(10,10,220*(state.ship.hp/Math.max(1,state.ship.maxHP)),18);
      cx.fillStyle='#fff';cx.font='bold 11px monospace';cx.fillText('HP '+Math.floor(state.ship.hp)+'/'+state.ship.maxHP, 16, 23);
      // 실드 바
      cx.fillStyle='rgba(0,0,0,.6)';cx.fillRect(10,32,220,12);
      cx.fillStyle='#66ddff';cx.fillRect(10,32,220*((state.ship.sh||0)/Math.max(1,state.ship.maxSH)),12);
      cx.fillStyle='#fff';cx.font='10px monospace';cx.fillText('SH '+Math.floor(state.ship.sh||0)+'/'+state.ship.maxSH, 16, 41);
      // 필살기 쿨다운 바 (HP/SH 아래)
      const _ultReady=state.ultimateCd<=0;
      const _ultRatio=_ultReady?1:(1-state.ultimateCd/600);
      cx.fillStyle='rgba(0,0,0,.6)';cx.fillRect(10,48,220,12);
      cx.fillStyle=_ultReady?'#ff66ff':'#6633aa';
      cx.fillRect(10,48,220*_ultRatio,12);
      cx.fillStyle='#fff';cx.font='bold 10px monospace';
      cx.fillText(_ultReady?I18N.t('mini.ultReady'):I18N.t('mini.ultCd',{s:(state.ultimateCd/60).toFixed(1)}), 16, 57);
      // 우상단: 시간·격파
      cx.fillStyle='#66ddff';cx.font='bold 18px monospace';cx.textAlign='right';
      cx.fillText('⏱ '+leftSec+'s', W-14, 26);
      cx.fillStyle='#ffcc66';cx.font='bold 14px monospace';
      cx.fillText(I18N.t('mini.kills',{n:state.kills}), W-14, 46);
      cx.textAlign='left';
  
      // 백구 — 시간 경고 (한 번씩만)
      if(!state._warn25s && leftSec<=25 && leftSec>20){state._warn25s=true;_baekguSay('think',I18N.t('mini.bk.midpoint'),2000,true);}
      if(!state._warn15s && leftSec<=15 && leftSec>10){state._warn15s=true;_baekguPick('timeWarn',true);}
      if(!state._warn5s && leftSec<=5 && leftSec>0){state._warn5s=true;_baekguSay('fight',I18N.t('mini.bk.fiveMore'),2000,true);}
      // 주기적 조언 (조용할 때만)
      if(!state._lastAdviceMs)state._lastAdviceMs=state.startMs;
      if(now-state._lastAdviceMs>9000 && now-state.baekgu.lastTriggerMs>3000 && elapsed>3000){
        state._lastAdviceMs=now;
        _baekguPick('advice');
      }
      // ─── 백구 AI HUD — 캔버스 하단 가운데 ───
      _renderBaekguHud(cx,W,H,state,baekguImgs,now);
  
      // 종료 판정
      if(elapsed>=state.durationMs){_baekguSay('smile1',I18N.t('mini.bk.breakthrough'),2500,true);_finish(true);return;}
      requestAnimationFrame(tick);
    }
    setTimeout(()=>{cv.focus();tick();},500);
    notify(I18N.t('notify.asteroidEntry'),'warn');
    try{baekgu(I18N.t('baekgu.asteroidBelt'));}catch(e){}
  }
  try{if(typeof window!=='undefined')window.startAsteroidBeltMinigame=startAsteroidBeltMinigame;}catch(e){}
})();
