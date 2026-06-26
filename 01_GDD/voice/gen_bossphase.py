# -*- coding: utf-8 -*-
# 보스 2페이즈 각성 멘트 음성(신규): 우르사 메이저 650 · 블랙팔콘 651. KO+EN. 기존 보스 보이스.
import sys,io; sys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding='utf-8')
import json,os,csv,time,shutil,urllib.request,urllib.error,importlib.util
s=importlib.util.spec_from_file_location("stt","stt.py");m=importlib.util.module_from_spec(s);s.loader.exec_module(m);K=m.key()
H={"xi-api-key":K,"Content-Type":"application/json"}
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),"..",".."))
URSA_KO="CAKds35J8i23lmagRYAo"; URSA_EN="HtX6ldi13wWkUMIZD7Xq"
FAL="aMPcWoZ4aG9JgmmSJZZX"
J=[
 (650,"ursamajor",URSA_KO,URSA_EN,"[menacing]",
  "호위는 끝났다. 이제… 내가 직접 상대해주마.",
  "The escort is finished. Now… I face you myself."),
 (651,"blackfalcon",FAL,FAL,"[ominous][slow]",
  "호위 따위… 시험에 불과했다. 이제 진짜 어둠을 보여주지.",
  "The escort was merely a test. Now I show you true darkness."),
]
def tts(vid,text,rel):
    os.makedirs(os.path.dirname(rel),exist_ok=True)
    b={"text":text,"model_id":"eleven_v3","voice_settings":{"stability":0.4}}
    r=urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{vid}?output_format=mp3_44100_128",data=json.dumps(b).encode(),headers=H,method="POST")
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
for num,slug,kv,ev,emo,ko,en in J:
    a=tts(kv,emo+" "+ko,f"clips/{slug}/{slug}_{num}.mp3")
    b=tts(ev,emo+" "+en,f"clips_en/{slug}/{slug}_{num}.mp3")
    if a:
        rows.append((str(num),slug,f"02_Assets/audio/voice/{slug}/{slug}_{num}.mp3",f"02_Assets/audio/voice_en/{slug}/{slug}_{num}.mp3" if b else "",ko)); ok+=1; print("OK",num,slug)
    time.sleep(0.4)
ch={"ursamajor":"우르사 메이저","blackfalcon":"블랙팔콘"}
with open("voice_manifest.csv","a",encoding="utf-8",newline="") as f:
    w=csv.writer(f)
    for num,slug,clip,clip_en,tx in rows:
        w.writerow([num,ch.get(slug,slug),slug,clip,"",clip_en,"","ko",tx])
print(f"\n보스 2페이즈 멘트 생성 {ok}/2 (num 650 우르사 · 651 블랙팔콘)")
