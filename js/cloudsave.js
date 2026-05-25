// ══════════════════════════════════════════════════════════════════
// CloudSave: Firebase Auth (Anonymous + Google) + Firestore 클라우드 세이브
// 사용법:
//   CloudSave.init()        — 페이지 로드시 호출 (익명 로그인 + 초기 동기화)
//   CloudSave.upload(n,obj) — 슬롯 n 저장 (game.js saveGame() 안에서 호출)
//   CloudSave.pullAll()     — 모든 슬롯 클라우드 → 로컬 동기화
//   CloudSave.signInGoogle()— Google 계정 연결 (세이브 영구 보관)
//   CloudSave.signOut()     — 로그아웃
//   CloudSave.getUser()     — 현재 로그인 정보
// ══════════════════════════════════════════════════════════════════
(function(){
  const FIREBASE_CONFIG={
    apiKey:'AIzaSyAvVXD-r_mlOFNR1VoXfzSsETu-we76Qbk',
    authDomain:'cgstation-d8178.firebaseapp.com',
    projectId:'cgstation-d8178',
    storageBucket:'cgstation-d8178.firebasestorage.app',
    messagingSenderId:'715302606771',
    appId:'1:715302606771:web:6d2786eb65d30dbf961dc6',
    measurementId:'G-4YKD8Z5EH7'
  };
  const SLOT_COUNT=8;
  const _state={ready:false,user:null,uploadQueue:new Map(),uploadTimer:null,uploading:false,listeners:[]};

  function _log(){try{console.log.apply(console,['[CloudSave]'].concat([].slice.call(arguments)));}catch(e){}}
  function _emit(){_state.listeners.forEach(fn=>{try{fn(_state.user);}catch(e){}});}

  function _slotKey(n){return n===0?'de_save':'de_save_s'+n;}

  // 로컬 슬롯 정보 읽기
  function _readLocal(n){
    try{
      const raw=localStorage.getItem(_slotKey(n));
      if(!raw)return null;
      return JSON.parse(raw);
    }catch(e){return null;}
  }
  // 로컬 슬롯 쓰기
  function _writeLocal(n,obj){
    try{localStorage.setItem(_slotKey(n),JSON.stringify(obj));return true;}catch(e){_log('localStorage 쓰기 실패',e);return false;}
  }

  // Firebase 로드 대기
  function _waitForFirebase(){
    return new Promise((resolve,reject)=>{
      let tries=0;
      const iv=setInterval(()=>{
        tries++;
        if(window.firebase&&firebase.auth&&firebase.firestore){clearInterval(iv);resolve();}
        else if(tries>100){clearInterval(iv);reject(new Error('Firebase SDK 로드 실패'));}
      },50);
    });
  }

  async function init(){
    if(_state.ready)return;
    try{
      await _waitForFirebase();
      if(!firebase.apps.length)firebase.initializeApp(FIREBASE_CONFIG);
      _state.auth=firebase.auth();
      _state.db=firebase.firestore();
      // 오프라인 캐시 활성화 (네트워크 없을 때도 동작)
      try{await _state.db.enablePersistence({synchronizeTabs:true});}catch(e){_log('Persistence 활성화 실패(다른 탭에서 사용 중일 수 있음)',e.code);}
      // Auth 상태 변경 핸들러
      _state.auth.onAuthStateChanged(async (u)=>{
        _state.user=u;
        if(u){
          _log('로그인 됨:',u.isAnonymous?'익명':u.email||u.displayName,u.uid);
          _state.ready=true;
          _emit();
          // 첫 로그인시 클라우드 → 로컬 자동 풀
          try{await pullAll();}catch(e){_log('pullAll 실패',e);}
        }else{
          _log('로그아웃 상태');
          _emit();
        }
      });
      // 익명 로그인 (아직 로그인 안 됐을 때)
      if(!_state.auth.currentUser){
        try{await _state.auth.signInAnonymously();}
        catch(e){_log('익명 로그인 실패',e.message);}
      }
    }catch(e){
      _log('init 실패:',e.message,'— 로컬 저장만 사용됩니다');
    }
  }

  // 슬롯 한 개 업로드 (디바운스: 1초 모아서 일괄 전송)
  function upload(n,obj){
    // 초기화 안 됐으면 시도
    if(!_state.user||!_state.db){
      _state.lastUploadError='미초기화 (Firebase 로드 안 됨 또는 로그인 안 됨)';
      // 백그라운드 init 시도
      if(!_state.ready)init();
      return;
    }
    _state.uploadQueue.set(n,obj);
    if(_state.uploadTimer)clearTimeout(_state.uploadTimer);
    _state.uploadTimer=setTimeout(_flushUpload,1000);
  }

  async function _flushUpload(){
    if(_state.uploading||!_state.user||!_state.db||_state.uploadQueue.size===0)return;
    _state.uploading=true;
    const items=Array.from(_state.uploadQueue.entries());
    _state.uploadQueue.clear();
    try{
      const batch=_state.db.batch();
      const uid=_state.user.uid;
      items.forEach(([n,obj])=>{
        const ref=_state.db.collection('saves').doc(uid).collection('slots').doc('slot'+n);
        batch.set(ref,{
          slotN:n,
          savedAt:Date.now(),
          data:JSON.stringify(obj)  // 통째 직렬화 (Firestore 필드 깊이 제한 회피)
        });
      });
      await batch.commit();
      _state.lastUploadAt=Date.now();
      _state.lastUploadError=null;
      _state.uploadCount=(_state.uploadCount||0)+items.length;
      _log('업로드 완료',items.map(([n])=>n));
    }catch(e){
      _state.lastUploadError=e.code+': '+e.message;
      _log('업로드 실패',e.code,e.message);
      // 큐 복원 — 다음 시도에 재업로드
      items.forEach(([n,obj])=>_state.uploadQueue.set(n,obj));
    }
    finally{_state.uploading=false;}
  }

  // 진단 정보 반환 (UI에서 상태 표시용)
  function diag(){
    return{
      ready:_state.ready,
      user:_state.user?{uid:_state.user.uid,email:_state.user.email,isAnon:_state.user.isAnonymous}:null,
      lastUploadAt:_state.lastUploadAt,
      lastUploadError:_state.lastUploadError,
      uploadCount:_state.uploadCount||0,
      queueSize:_state.uploadQueue.size,
      firebaseLoaded:!!window.firebase,
      firestoreLoaded:!!(window.firebase&&firebase.firestore)
    };
  }

  // 모든 슬롯 클라우드 → 로컬 동기화 (savedAt 비교, 클라우드가 더 새 것만 덮어쓰기)
  async function pullAll(){
    if(!_state.user||!_state.db)return{pulled:0};
    try{
      const uid=_state.user.uid;
      const snap=await _state.db.collection('saves').doc(uid).collection('slots').get();
      let pulled=0;
      snap.forEach(doc=>{
        const d=doc.data();
        if(!d||!d.data||d.slotN==null)return;  // slotN===0 가능성 보존
        const local=_readLocal(d.slotN);
        const localTs=local&&local._saved?local._saved:0;
        if(d.savedAt>localTs){
          try{
            const obj=JSON.parse(d.data);
            _writeLocal(d.slotN,obj);
            pulled++;
          }catch(e){}
        }
      });
      if(pulled>0)_log('클라우드 → 로컬 동기화:',pulled,'슬롯');
      return{pulled};
    }catch(e){_log('pullAll 실패',e.message);return{pulled:0,error:e.message};}
  }

  // 모든 로컬 슬롯 → 클라우드 업로드 (수동 백업)
  async function pushAll(){
    if(!_state.user||!_state.db)return{pushed:0};
    let pushed=0;
    for(let i=0;i<=SLOT_COUNT;i++){
      const obj=_readLocal(i);
      if(obj){upload(i,obj);pushed++;}
    }
    await _flushUpload();
    _log('로컬 → 클라우드 일괄 업로드:',pushed,'슬롯');
    return{pushed};
  }

  async function signInGoogle(){
    if(!_state.auth)return{error:'Firebase 미초기화'};
    try{
      const provider=new firebase.auth.GoogleAuthProvider();
      // 익명 사용자가 있으면 계정 연결 시도 (UID 유지 → 세이브 보존)
      if(_state.user&&_state.user.isAnonymous){
        try{
          const cred=await _state.user.linkWithPopup(provider);
          _log('익명 → Google 계정 연결 완료',cred.user.email);
          return{user:cred.user};
        }catch(e){
          // 이미 다른 익명 계정과 연결된 Google 계정이면 일반 로그인으로 폴백
          if(e.code==='auth/credential-already-in-use'||e.code==='auth/email-already-in-use'){
            _log('기존 Google 계정으로 전환',e.code);
            const cred=await _state.auth.signInWithPopup(provider);
            return{user:cred.user,switched:true};
          }
          throw e;
        }
      }
      const cred=await _state.auth.signInWithPopup(provider);
      return{user:cred.user};
    }catch(e){_log('Google 로그인 실패',e.message);return{error:e.message};}
  }

  async function signOut(){
    if(!_state.auth)return;
    await _state.auth.signOut();
    // 로그아웃 후 다시 익명 로그인
    try{await _state.auth.signInAnonymously();}catch(e){}
  }

  function onAuthChange(fn){_state.listeners.push(fn);if(_state.user)try{fn(_state.user);}catch(e){}}
  function getUser(){return _state.user;}
  function isReady(){return _state.ready;}

  // ── 피드백 (Firestore feedback 컬렉션) ─────────────────────────────
  async function sendFeedback(id,msg,meta){
    if(!_state.db){
      // Firebase 초기화 안 됐어도 init 시도
      try{await init();await new Promise(r=>setTimeout(r,500));}catch(e){}
    }
    if(!_state.db)return{error:'Firebase 미초기화'};
    try{
      const doc={
        id:id||'',
        msg:msg||'',
        ver:(meta&&meta.ver)||'',
        turn:(meta&&meta.turn)||0,
        ua:navigator.userAgent.slice(0,200),
        ref:(typeof document!=='undefined'?document.referrer:'').slice(0,200),
        uid:_state.user?_state.user.uid:'',
        anon:_state.user?_state.user.isAnonymous:true,
        ts:firebase.firestore.FieldValue.serverTimestamp(),
        tsClient:Date.now()
      };
      await _state.db.collection('feedback').add(doc);
      _log('피드백 업로드 완료');
      return{ok:true};
    }catch(e){_log('피드백 업로드 실패',e.message);return{error:e.message};}
  }

  async function listFeedback(limit){
    if(!_state.db)return{error:'Firebase 미초기화'};
    if(!_state.user)return{error:'로그인 필요'};
    try{
      const snap=await _state.db.collection('feedback').orderBy('tsClient','desc').limit(limit||100).get();
      const items=[];
      snap.forEach(d=>{const v=d.data();items.push({id:d.id,...v});});
      return{items};
    }catch(e){_log('피드백 조회 실패',e.message);return{error:e.message};}
  }

  // ══════════════════════════════════════════════════════════════════
  // 이메일 기반 클라우드 세이브 (간편 로그인 — 패스워드 없음)
  //   · 이메일을 키로 Firestore /email_saves/{emailLower}/save 에 저장
  //   · 같은 이메일 입력하면 어디서든 진행 상황 불러오기 가능
  //   · 본인 이메일을 기억하면 끝 (Google 로그인 안 해도 동작)
  // ══════════════════════════════════════════════════════════════════
  function _normalizeEmail(em){
    return String(em||'').toLowerCase().trim().replace(/[^a-z0-9@._+-]/g,'');
  }
  function _validEmail(em){
    return /^[a-z0-9._+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(em||'');
  }
  // 슬롯 N에 자동 동기화될 이메일 (localStorage 영구 기억)
  function setEmail(email){
    const em=_normalizeEmail(email);
    if(!em||!_validEmail(em))return{error:'유효한 이메일 형식이 아닙니다'};
    try{localStorage.setItem('de_email',em);}catch(e){}
    return{ok:true,email:em};
  }
  function getEmail(){
    try{return localStorage.getItem('de_email')||'';}catch(e){return '';}
  }
  function clearEmail(){
    try{localStorage.removeItem('de_email');}catch(e){}
  }

  // 이메일 → Firestore에서 세이브 가져오기
  async function loadByEmail(email){
    if(!_state.db){try{await init();await new Promise(r=>setTimeout(r,500));}catch(e){}}
    if(!_state.db)return{error:'Firebase 미초기화'};
    // 인증 완료 대기 — Firestore 규칙(request.auth != null) 통과 필수
    // 익명 로그인이 비동기로 끝나는 동안 호출되면 PERMISSION_DENIED가 됨.
    if(!_state.user){
      try{
        await new Promise((resolve,reject)=>{
          let tries=0;
          const iv=setInterval(()=>{tries++;if(_state.user){clearInterval(iv);resolve();}else if(tries>40){clearInterval(iv);reject(new Error('auth_timeout'));}},100);
        });
      }catch(e){return{error:'인증 대기 시간 초과 — 잠시 후 다시 시도해 주세요'};}
    }
    const em=_normalizeEmail(email);
    if(!_validEmail(em))return{error:'유효한 이메일이 아닙니다'};
    try{
      const docRef=_state.db.collection('email_saves').doc(em).collection('slots');
      const snap=await docRef.get();
      const slots={};
      snap.forEach(d=>{const v=d.data();if(v&&v.data)slots[d.id]=v;});
      if(Object.keys(slots).length===0)return{error:'해당 이메일로 저장된 게임이 없습니다',email:em,empty:true};
      // 로컬에 병합 저장 — 클라우드가 항상 최신으로 가정
      let imported=0;
      Object.entries(slots).forEach(([slotId,obj])=>{
        const n=parseInt(slotId.replace(/[^0-9]/g,''),10)||0;
        try{
          _writeLocal(n,obj.data);
          imported++;
        }catch(e){_log('슬롯',n,'복원 실패',e.message);}
      });
      setEmail(em);
      return{ok:true,imported,email:em,slots:Object.keys(slots).length};
    }catch(e){_log('이메일 불러오기 실패',e.message);return{error:e.message};}
  }

  // 이메일 슬롯에 업로드 (game.js saveGame() 호출 시 자동 트리거)
  async function uploadByEmail(n,obj){
    if(!_state.db)return{error:'Firebase 미초기화'};
    // 인증 완료 대기 — 익명 로그인이 비동기로 끝나기 때문에 _state.user가 없으면 잠시 기다림.
    // 누락 시 Firestore 규칙(request.auth != null)에 막혀 PERMISSION_DENIED.
    if(!_state.user){
      try{
        await new Promise((resolve,reject)=>{
          let tries=0;
          const iv=setInterval(()=>{tries++;if(_state.user){clearInterval(iv);resolve();}else if(tries>40){clearInterval(iv);reject(new Error('auth_timeout'));}},100);
        });
      }catch(e){_log('이메일 업로드 — 인증 대기 실패',e.message);return{error:'auth_pending'};}
    }
    const em=getEmail();
    if(!em||!_validEmail(em))return{ok:false,skipped:true};  // 이메일 등록 안 됐으면 스킵
    try{
      const doc={
        slotN:n,
        data:obj,
        email:em,
        ver:(obj&&obj._ver)||'',
        updatedAt:firebase.firestore.FieldValue.serverTimestamp(),
        tsClient:Date.now()
      };
      await _state.db.collection('email_saves').doc(em).collection('slots').doc('slot'+n).set(doc);
      return{ok:true};
    }catch(e){_log('이메일 업로드 실패',e.code,e.message);return{error:(e.code||'')+': '+e.message};}
  }

  // 이메일 등록 + 즉시 모든 슬롯 업로드 (이메일 처음 연결 시)
  async function registerEmail(email){
    const r=setEmail(email);
    if(r.error)return r;
    // 로컬 슬롯 전부 클라우드 업로드
    let uploaded=0;
    for(let n=0;n<=SLOT_COUNT;n++){
      const local=_readLocal(n);
      if(local&&local._saved){
        const res=await uploadByEmail(n,local);
        if(res.ok)uploaded++;
      }
    }
    return{ok:true,email:r.email,uploaded};
  }

  // CloudSave 객체에 이메일 함수 노출
  window.CloudSave={init,upload,pullAll,pushAll,signInGoogle,signOut,onAuthChange,getUser,isReady,sendFeedback,listFeedback,diag,
    // 이메일 기반 API
    setEmail,getEmail,clearEmail,loadByEmail,registerEmail,uploadByEmail,
    _normalizeEmail,_validEmail};
})();
