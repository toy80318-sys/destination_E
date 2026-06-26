# -*- coding: utf-8 -*-
# 블랙팔콘 전투 대사 음성(신규): 후퇴 652 · 차원광선충전 653. KO+EN. 블랙팔콘 보이스.
import sys,io; sys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding='utf-8')
import json,os,csv,time,shutil,re,urllib.request,urllib.error,importlib.util
s=importlib.util.spec_from_file_location("stt","stt.py");m=importlib.util.module_from_spec(s);s.loader.exec_module(m);K=m.key()
H={"xi-api-key":K,"Content-Type":"application/json"}
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),"..",".."))
FAL="aMPcWoZ4aG9JgmmSJZZX"
def say(t):  # TTS 낭독용 — 💬/이모지/[화자] 태그 제거
    t=re.sub(r'^[^가-힣A-Za-z]*','',t); t=re.sub(r'^\[[^\]]*\]\s*','',t); return t.strip()
J=[
 (652,"블랙팔콘 후퇴","💬 [블랙팔콘] 통신 신호 수신... 보이드 함대가 어둠 속으로 사라진다...",
      "💬 [Blackfalcon] Signal received... The Void fleet vanishes into the darkness..."),
 (653,"차원광선 충전","🌑 [블랙팔콘] 차원 절단광선 충전... 함대 비기함 함선이 위험합니다!",
      "🌑 [Blackfalcon] Dimensional cutting beam charging... Non-flagship ships are in danger!"),
]
def tts(text,rel):
    os.makedirs(os.path.dirname(rel),exist_ok=True)
    b={"text":"[ominous] "+text,"model_id":"eleven_v3","voice_settings":{"stability":0.4}}
    r=urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{FAL}?output_format=mp3_44100_128",data=json.dumps(b).encode(),headers=H,method="POST")
    for a in range(4):
        try:
            open(rel,"wb").write(urllib.request.urlopen(r,timeout=180).read())
            base="voice_en" if rel.startswith("clips_en/") else "voice"
            dp=os.path.join(ROOT,"02_Assets","audio",base,rel.split("/",1)[1]).replace("/",os.sep)
            os.makedirs(os.path.dirname(dp),exist_ok=True); shutil.copyfile(rel,dp); return True
        except urllib.error.HTTPError as e:
            if e.code==429 and a<3: time.sleep(5); continue
            print("HTTP",rel,e.code,e.read()[:80]); return False
    return False
rows=[];ok=0
for num,desc,ko,en in J:
    a=tts(say(ko),f"clips/blackfalcon/blackfalcon_{num}.mp3")
    b=tts(say(en),f"clips_en/blackfalcon/blackfalcon_{num}.mp3")
    if a:
        rows.append((str(num),f"02_Assets/audio/voice/blackfalcon/blackfalcon_{num}.mp3",f"02_Assets/audio/voice_en/blackfalcon/blackfalcon_{num}.mp3" if b else "",ko)); ok+=1; print("OK",num,desc)
    time.sleep(0.4)
with open("voice_manifest.csv","a",encoding="utf-8",newline="") as f:
    w=csv.writer(f)
    for num,clip,clip_en,tx in rows:
        w.writerow([num,"블랙팔콘","blackfalcon",clip,"",clip_en,"","ko",tx])
print(f"\n블랙팔콘 전투대사 생성 {ok}/2 (num 652 후퇴 · 653 차원광선)")
