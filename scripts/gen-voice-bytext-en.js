// EN 컷신 보이스 브리지 생성기
//   문제: VOICE_BYTEXT 는 한글 텍스트 키만 → 영문 빌드에선 컷신 자막(영문)이 매칭 안 돼 무음.
//   해결: phase{N}_quests.js 의 KO/EN 컷신은 같은 씬키·같은 순서의 병렬 구조 →
//         KO 라인 norm → VOICE_BYTEXT 엔트리 찾고, 같은 위치 EN 라인 norm → 그 엔트리에 매핑.
//   산출: js/data/voice-bytext-en.js (window.VOICE_BYTEXT_EN[normEN] = entry)
//   voice-player.playByText 가 KO 매칭 실패 시 이 맵으로 폴백 → pick()이 clip_en 재생.
//   사용: node scripts/gen-voice-bytext-en.js
const fs=require('fs'), path=require('path');
const ROOT=path.join(__dirname,'..');
// voice-player.js 의 norm() 과 반드시 동일 (대소문자 보존)
function norm(t){
  t=(t||'').replace(/\{\s*(사령관|commander)\s*\}/gi,'사령관');
  t=t.replace(/[\(\[\{][^\)\]\}]*[\)\]\}]/g,'');
  return t.replace(/[^가-힣A-Za-z0-9]/g,'');
}
global.window={};
// 매니페스트(VOICE_BYTEXT) 로드
require(path.join(ROOT,'js','data','voice-manifest.js'));
const BYTEXT=global.window.VOICE_BYTEXT||{};
// phase 데이터 로드
for(let i=1;i<=6;i++){ try{ require(path.join(ROOT,'js','data','phase'+i+'_quests.js')); }catch(e){ /* 일부 phase 없을 수 있음 */ } }
const EN={}; let linked=0, scenes=0, noKO=0;
for(let i=1;i<=6;i++){
  const KO=global.window['PHASE'+i+'_CUTSCENES_KO'], ENs=global.window['PHASE'+i+'_CUTSCENES_EN'];
  if(!KO||!ENs)continue;
  for(const sid in KO){ const ko=KO[sid], en=ENs[sid]; if(!Array.isArray(ko)||!Array.isArray(en))continue; scenes++;
    const n=Math.min(ko.length,en.length);
    for(let j=0;j<n;j++){ const kt=ko[j]&&ko[j].text, et=en[j]&&en[j].text; if(!kt||!et)continue;
      const entry=BYTEXT[norm(kt)]; if(!entry){noKO++;continue;}
      const ek=norm(et); if(ek&&ek.length>=2){ EN[ek]=entry; linked++; }
    }
  }
}
const out='// 자동 생성 — scripts/gen-voice-bytext-en.js (편집 금지)\n'
  +'// 영문 컷신 자막 → 보이스 엔트리 브리지(VOICE_BYTEXT 의 EN 짝). voice-player 가 KO 매칭 실패 시 폴백.\n'
  +'window.VOICE_BYTEXT_EN='+JSON.stringify(EN)+';\n';
fs.writeFileSync(path.join(ROOT,'js','data','voice-bytext-en.js'),out,'utf8');
console.log('생성: voice-bytext-en.js — EN 키 '+Object.keys(EN).length+'개 (연결 '+linked+', 씬 '+scenes+', KO엔트리없음 '+noKO+')');
