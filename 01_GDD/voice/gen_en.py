# -*- coding: utf-8 -*-
import csv,sys,os,json,time,urllib.request,urllib.error,importlib.util,collections
spec=importlib.util.spec_from_file_location("stt","stt.py");stt=importlib.util.module_from_spec(spec);spec.loader.exec_module(stt)
K=stt.key(); H={"xi-api-key":K,"Content-Type":"application/json"}
cast=json.load(open("casting_en.json",encoding="utf-8"))
WILL="bIHbv24MWmeRgasZH58o"; RIVER="SAz9YHcvj6GT2YYXdXww"
rows=list(csv.DictReader(open("lines_en.csv",encoding="utf-8-sig")))
idx=collections.Counter(); done=0; skip=0
def tts(vid,txt,out):
    os.makedirs(os.path.dirname(out),exist_ok=True)
    b={"text":txt,"model_id":"eleven_v3","voice_settings":{"stability":0.0}}
    req=urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{vid}?output_format=mp3_44100_128",
        data=json.dumps(b).encode("utf-8"),headers=H,method="POST")
    for a in range(5):
        try: open(out,"wb").write(urllib.request.urlopen(req,timeout=180).read()); return True
        except urllib.error.HTTPError as e:
            if e.code==429 and a<4: time.sleep(6); continue
            print("HTTP",out,e.code,e.read()[:80]); return False
start=int(sys.argv[1]) if len(sys.argv)>1 else 0
end=int(sys.argv[2]) if len(sys.argv)>2 else len(rows)
for i,r in enumerate(rows):
    slug=r["char_slug"]; num=r["num"]; txt=(r.get("emotion","")+" "+r["text_en"]).strip()
    if slug=="etc":
        n=int(num)
        if 486<=n<=491: skip+=1; continue
        vid=WILL if num=="482" else RIVER
        out=f"clips_en/etc/etc_{num}.mp3"
    else:
        idx[slug]+=1
        if slug not in cast: continue
        vid=cast[slug]["voice"]; out=f"clips_en/{slug}/{slug}_{idx[slug]:03d}.mp3"
    if not (start<=i<end): continue
    if not r["text_en"].strip(): continue
    if tts(vid,txt,out): done+=1; print("OK",out)
    time.sleep(0.4)
print(f"DONE generated={done} skipped_etc={skip}")
