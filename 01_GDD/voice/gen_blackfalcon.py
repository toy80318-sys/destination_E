# -*- coding: utf-8 -*-
# 블랙팔콘(보이드 보스) 컷신 음성: (A) 블랙팔콘 보이스 Voice Design 프리뷰 3종(슬롯 미소비)
#                                  (B) 이미 보이스 있는 12줄(사령관/백구/영웅) KO+EN 생성+배포+CSV.
import json,os,base64,csv,time,shutil,urllib.request,urllib.error,importlib.util
s=importlib.util.spec_from_file_location("stt","stt.py");m=importlib.util.module_from_spec(s);s.loader.exec_module(m);K=m.key()
H={"xi-api-key":K,"Content-Type":"application/json"}
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),"..",".."))

# ── (A) 블랙팔콘 보이스 프리뷰 ──
desc=("An ancient, vast cosmic entity speaking from the Void. A deep, resonant, slow and ominous male-ish voice "
 "with an unnatural reverberant echo. Calm, absolute, god-like — as if speaking across a thousand years of silence. "
 "Not quite human, not robotic; eerie, grand, and cold. Measured, unhurried, with weight behind every word.")
sample=("음.. 우주에서 이렇게 강한 함대는 천 년 만에 처음 만났군.. 좋다.. 그대들의 목표를 지켜보겠다. "
 "하지만 보이드 문명에 선을 넘지는 말길 바란다.. 선물 하나를 하지. 은하계 가운데로 가볼 수 있다면, 내 마지막 시험을 통과할 것이다.")
try:
    body={"voice_description":desc,"text":sample,"auto_generate_text":False}
    r=urllib.request.Request("https://api.elevenlabs.io/v1/text-to-voice/create-previews",
        data=json.dumps(body).encode(),headers=H,method="POST")
    res=json.loads(urllib.request.urlopen(r,timeout=180).read().decode())
    od="clips/_sample_blackfalcon"; os.makedirs(od,exist_ok=True); ids=[]
    for i,p in enumerate(res.get("previews",[]),1):
        out=f"{od}/falcon_{i}.mp3"; open(out,"wb").write(base64.b64decode(p["audio_base_64"])); ids.append(p["generated_voice_id"]); print("PREVIEW",out,p["generated_voice_id"])
    json.dump({"ids":ids,"desc":desc},open(od+"/_gids.json","w",encoding="utf-8"),ensure_ascii=False)
except urllib.error.HTTPError as e:
    print("VD HTTP",e.code,e.read()[:200])

# ── (B) 이미 보이스 있는 12줄 ──
# 계정 보이스 해석(영웅 KO)
voices=[(v.get("name",""),v.get("voice_id","")) for v in json.load(urllib.request.urlopen(urllib.request.Request("https://api.elevenlabs.io/v1/voices",headers={"xi-api-key":K}),timeout=30)).get("voices",[])]
ALIAS={"gwanggaeto":["광개토"],"gagarin":["가가린"],"einstein":["아인슈타인"],"tesla":["테슬라"],"marcopolo":["마르코"]}
FIX_KO={"commander":"MpbDJfQJUYUnp0i1QvOZ","baekgu":"m8ZvjfA66O7ipbXTTQ4Y","yisunsin":"Uzazy4zhKPfGGeuptGj0"}
def kov(slug):
    if slug in FIX_KO: return FIX_KO[slug]
    for a in ALIAS.get(slug,[]):
        for nm,vid in voices:
            if a in nm: return vid
    return None
ENV={"commander":"TX3LPaxmHKxFdv7VOQHJ","baekgu":"cjVigY5qzO86Huf0OWal","yisunsin":"JBFqnCBsd6RMkjVDRZzb",
 "gwanggaeto":"ESNrF6xSj96uiykXXT1f","gagarin":"IKne3meq5aSn9XLyUdCD","einstein":"nPczCjzI2devNBz1zQrb",
 "tesla":"N2lVS1w4EtoT3dr4eOWO","marcopolo":"iP95p4xoKVk53GoZ742B"}
# (num, slug, emo, KO, EN)
JOBS=[
 (530,"baekgu","[surprised]","헐... 헐!! 보이드 총독권을 우리가 가져간 걸 알고 있어?! 무슨... 무슨 존재야 도대체!!","Whoa... whoa! It knows we took the Void governorship?! What... what kind of being is this?!"),
 (531,"baekgu","[playful]","근데 솔직히 말해서, 저 통신 음성... 어디서 많이 들어본 것 같아. 호러 영화에서.","Honestly though... that voice sounds awfully familiar. Like a horror movie."),
 (532,"commander","[resolute]","좋다. 보이드든 뭐든 — 시험에 응하지. 우리는 100년 봉쇄를 깬 함대다.","Fine. Void or otherwise — we accept the trial. We are the fleet that broke a 100-year blockade."),
 (533,"commander","[wry]","백구야, 분위기 좀 깨지 말아줘. 가뜩이나 무서운데.","Baekgu, don't break the mood — it's scary enough already."),
 (534,"commander","[wry]","영웅도 없는데 검은 함선이라니. 백구야, 도망갈까?","A dark ship and no heroes at hand. Baekgu — should we run?"),
 (535,"commander","[thoughtful]","은하계 가운데... 블랙홀 말이로군. 마지막 시험이라... 보이드의 모든 별이 우리 손에 들어와야 한다는 뜻일지도.","The center of the galaxy... the black hole. Final trial... perhaps it means we must hold every Void star."),
 (536,"yisunsin","[solemn]","전열을 가다듬으십시오, 사령관. 적의 정체는 모르나, 함대의 진형부터 정비합시다.","Steady the formation, Commander. We don't know the enemy yet, let's align the fleet first."),
 (537,"gwanggaeto","[bold]","정복의 기개로 맞서겠소. 보이드든 어둠이든, 두려움은 우리의 적이 아니오.","I will meet them with the spirit of conquest. Void or darkness, fear is not our foe."),
 (538,"gagarin","[calm]","우주에 미지의 존재가 있다고 늘 말해왔지. 드디어 만나보는군.","I've always said there are unknowns in space. We finally meet them."),
 (539,"einstein","[curious]","흥미롭군요... 이 신호의 주파수는 일반 공간을 넘어선다. 정말로 보이드의 존재일 가능성이 있어요.","Fascinating... this signal's frequency transcends normal space. It really might be a Void entity."),
 (540,"tesla","[alarmed]","전자기 간섭이 폭주합니다! 통신 회로가 망가질 수도 있으니 조심하십시오.","Electromagnetic interference is spiking! The comms could fail, be careful."),
 (541,"marcopolo","[awed]","천 년 항해에서도 들어본 적 없는 신호다... 이건 새 대륙이야.","Never heard such a signal in a thousand years of voyaging... this is a new continent."),
]
def tts(vid,text,out,model="eleven_v3",stab=0.4):
    b={"text":text,"model_id":model,"voice_settings":{"stability":stab}}
    r=urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{vid}?output_format=mp3_44100_128",data=json.dumps(b).encode(),headers=H,method="POST")
    for a in range(4):
        try: open(out,"wb").write(urllib.request.urlopen(r,timeout=180).read()); return True
        except urllib.error.HTTPError as e:
            if e.code==429 and a<3: time.sleep(5); continue
            print("HTTP",out,e.code,e.read()[:90]); return False
    return False
rows=[]; ok=0
for num,slug,emo,ko,en in JOBS:
    kv=kov(slug); ev=ENV.get(slug)
    ko_out=f"clips/{slug}/{slug}_{num}.mp3"; en_out=f"clips_en/{slug}/{slug}_{num}.mp3"
    os.makedirs(os.path.dirname(ko_out),exist_ok=True); os.makedirs(os.path.dirname(en_out),exist_ok=True)
    a=tts(kv,emo+" "+ko,ko_out) if kv else False
    b=tts(ev,emo+" "+en,en_out) if ev else False
    if a:
        shutil.copyfile(ko_out,_dp:=os.path.join(ROOT,"02_Assets","audio","voice",slug,f"{slug}_{num}.mp3"))
    if b:
        dpe=os.path.join(ROOT,"02_Assets","audio","voice_en",slug,f"{slug}_{num}.mp3"); os.makedirs(os.path.dirname(dpe),exist_ok=True); shutil.copyfile(en_out,dpe)
    if a:
        rows.append((str(num),slug,f"02_Assets/audio/voice/{slug}/{slug}_{num}.mp3",f"02_Assets/audio/voice_en/{slug}/{slug}_{num}.mp3",ko)); ok+=1; print("OK",num,slug,"KO" if a else "-","EN" if b else "-")
    time.sleep(0.5)
with open("voice_manifest.csv","a",encoding="utf-8",newline="") as f:
    w=csv.writer(f)
    for num,slug,clip,clip_en,tx in rows:
        w.writerow([num,slug,slug,clip,"",clip_en,"","ko",tx])
print(f"\n(B) 생성 {ok}/12, CSV {len(rows)}행 추가 (num 530~541)")
print("헤럴드 7줄(unknown1~3·falconEnd.l1~3·falcon.afterUrsa)은 블랙팔콘 보이스 선택 후 생성 예정.")
