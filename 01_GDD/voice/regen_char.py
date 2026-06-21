# -*- coding: utf-8 -*-
import csv,sys,os,re,time,json,urllib.request,urllib.error,importlib.util
spec=importlib.util.spec_from_file_location("stt","stt.py");stt=importlib.util.module_from_spec(spec);spec.loader.exec_module(stt)
spec2=importlib.util.spec_from_file_location("_numko","_numko.py");nk=importlib.util.module_from_spec(spec2);spec2.loader.exec_module(nk)
K=stt.key(); H={"xi-api-key":K,"Content-Type":"application/json"}
slug, vid = sys.argv[1], sys.argv[2]
out_slug = sys.argv[3] if len(sys.argv)>3 else slug
def clean(t):
    t=re.sub(r"[\(\{][^\)\}]*[\)\}]","",t)      # (지문) {토큰} 제거
    t=re.sub(r"×\s*(\d+)", r"\1개", t)            # ×8 → 8개
    return nk.convert(t).strip()
rows=[r for r in csv.DictReader(open("lines.csv",encoding="utf-8-sig")) if r["char_slug"]==slug]
os.makedirs(f"clips/{out_slug}",exist_ok=True)
for i,r in enumerate(rows,1):
    txt=(r["emotion"]+" "+clean(r["text"])).strip()
    out=f"clips/{out_slug}/{out_slug}_{i:03d}.mp3"
    body={"text":txt,"model_id":"eleven_v3","voice_settings":{"stability":0.0}}
    req=urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{vid}?output_format=mp3_44100_128",
        data=json.dumps(body).encode("utf-8"),headers=H,method="POST")
    for attempt in range(4):
        try:
            open(out,"wb").write(urllib.request.urlopen(req,timeout=180).read()); print("OK",out); break
        except urllib.error.HTTPError as e:
            if e.code==429 and attempt<3: time.sleep(5); continue
            print("HTTP",out,e.code,e.read()[:120]); break
    time.sleep(0.8)
print("DONE",slug,len(rows),"lines")
