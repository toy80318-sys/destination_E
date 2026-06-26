# -*- coding: utf-8 -*-
# 섞임 정리: 524~529(영문 대사가 KO 폴더에 잘못 생성) 삭제 + 518~523 정상 EN 클립 생성.
import json,os,csv,time,urllib.request,urllib.error,importlib.util
s=importlib.util.spec_from_file_location("stt","stt.py");m=importlib.util.module_from_spec(s);s.loader.exec_module(m);K=m.key()
H={"xi-api-key":K,"Content-Type":"application/json"}
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),"..",".."))
# 1) 삭제: 524~529 KO 클립
for slug,num in [("yisunsin",524),("gagarin",525),("nelson",526),("einstein",527),("gwanggaeto",528),("gwanggaeto",529)]:
    for base in ("voice","voice_en"):
        p=os.path.join(ROOT,"02_Assets","audio",base,slug,f"{slug}_{num}.mp3")
        if os.path.exists(p): os.remove(p); print("DEL",base,slug,num)
    pc=os.path.join("clips" if True else "",slug)  # 작업본도 정리
    for c in (f"clips/{slug}/{slug}_{num}.mp3",f"clips_en/{slug}/{slug}_{num}.mp3"):
        if os.path.exists(c): os.remove(c)
# 2) CSV에서 524~529 행 제거
csvp="voice_manifest.csv"
lines=open(csvp,encoding="utf-8-sig").read().splitlines()
keep=[]
for ln in lines:
    n=ln.split(",",1)[0]
    if n in ("524","525","526","527","528","529"): continue
    keep.append(ln)
open(csvp,"w",encoding="utf-8",newline="").write("\n".join(keep)+"\n")
print("CSV 524~529 행 제거 완료")
# 3) 518~523 정상 EN 클립 생성 (EN 보이스 + EN 텍스트)
ENV={"yisunsin":"JBFqnCBsd6RMkjVDRZzb","gagarin":"IKne3meq5aSn9XLyUdCD","nelson":"onwK4e9ZLuTAKqWW03F9",
 "einstein":"nPczCjzI2devNBz1zQrb","gwanggaeto":"ESNrF6xSj96uiykXXT1f"}
JOBS=[
 ("yisunsin",518,"[solemn] Commander. I do not fight unnecessary battles. Only wars I can win."),
 ("gagarin",519,"[warm] Commander. So I am the first comrade in a hundred years — what an honor. Small craft are my specialty; I'll take you anywhere."),
 ("nelson",520,"[resolute] England expects— no. Now Earth expects. Let us begin, Commander."),
 ("einstein",521,"[thoughtful] A location even the Cheeks could not find — Proxima B, perturbed by the Gliese Rift. Your awakening point, Commander."),
 ("gwanggaeto",522,"[bold] Commander, you said? I have waited for one who would reclaim my land. Speak — what is your wish?"),
 ("gwanggaeto",523,"[bold] Commander — the final command is yours."),
]
ok=0
for slug,num,txt in JOBS:
    vid=ENV[slug]; out=f"clips_en/{slug}/{slug}_{num}.mp3"; os.makedirs(os.path.dirname(out),exist_ok=True)
    b={"text":txt,"model_id":"eleven_v3","voice_settings":{"stability":0.4}}
    r=urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{vid}?output_format=mp3_44100_128",data=json.dumps(b).encode(),headers=H,method="POST")
    try:
        open(out,"wb").write(urllib.request.urlopen(r,timeout=180).read())
        dp=os.path.join(ROOT,"02_Assets","audio","voice_en",slug,f"{slug}_{num}.mp3"); os.makedirs(os.path.dirname(dp),exist_ok=True)
        import shutil; shutil.copyfile(out,dp); ok+=1; print("EN OK",slug,num)
    except urllib.error.HTTPError as e: print("HTTP",slug,num,e.code,e.read()[:80])
    time.sleep(0.5)
print(f"\n518~523 EN 생성 {ok}/6 완료")
