# -*- coding: utf-8 -*-
# 프롤로그 효과음 — ElevenLabs Sound Generation. 02_Assets/audio/sfx/ 에 저장.
import sys,io; sys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding='utf-8')
import json,os,urllib.request,urllib.error,importlib.util
s=importlib.util.spec_from_file_location("stt","stt.py");m=importlib.util.module_from_spec(s);s.loader.exec_module(m);K=m.key()
H={"xi-api-key":K,"Content-Type":"application/json"}
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),"..",".."))
OUTDIR=os.path.join(ROOT,"02_Assets","audio","sfx"); os.makedirs(OUTDIR,exist_ok=True)
SFX=[
 ("prologue_skyfall","A colossal deep explosion as the sky itself tears apart — a massive blast, heavy low-end rumble, crackling shockwave and falling debris, distant secondary detonations, cinematic sci-fi cataclysm, dark and overwhelming.",5.0),
 ("prologue_launch","Escape pods / rescue capsules launching into space one after another — powerful rocket ignition whoosh, rising thrust, metallic release clamps, fading into the void, sci-fi cinematic.",4.0),
 ("prologue_signal","A single faint comms blip in deep silence, a soft sonar-like beep pulsing slowly like a distant heartbeat, lonely sci-fi ambience.",3.0),
]
ok=0
for name,prompt,dur in SFX:
    out=os.path.join(OUTDIR,name+".mp3")
    body={"text":prompt,"duration_seconds":dur,"prompt_influence":0.45}
    req=urllib.request.Request("https://api.elevenlabs.io/v1/sound-generation",data=json.dumps(body).encode(),headers=H,method="POST")
    try:
        open(out,"wb").write(urllib.request.urlopen(req,timeout=180).read())
        print("OK",out,os.path.getsize(out),"B"); ok+=1
    except urllib.error.HTTPError as e:
        print("HTTP",name,e.code,e.read()[:200])
    except Exception as e:
        print("ERR",name,str(e)[:160])
print("\nSFX 생성",ok,"/",len(SFX),"→ 02_Assets/audio/sfx/")
