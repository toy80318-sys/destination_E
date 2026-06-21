# -*- coding: utf-8 -*-
# Voice Design 미리듣기 3종 저장(슬롯 미소비). 인자: desc_file(json)
import json,sys,os,base64,urllib.request,urllib.error,importlib.util
spec=importlib.util.spec_from_file_location("stt","stt.py");stt=importlib.util.module_from_spec(spec);spec.loader.exec_module(stt)
K=stt.key(); H={"xi-api-key":K,"Content-Type":"application/json"}
j=json.load(open(sys.argv[1],encoding="utf-8"))
body={"voice_description":j["description"],"text":j["sample"],"auto_generate_text":False}
req=urllib.request.Request("https://api.elevenlabs.io/v1/text-to-voice/create-previews",
    data=json.dumps(body).encode("utf-8"),headers=H,method="POST")
try:
    r=json.loads(urllib.request.urlopen(req,timeout=180).read().decode("utf-8"))
    os.makedirs(j["outdir"],exist_ok=True)
    ids=[]
    for i,p in enumerate(r.get("previews",[]),1):
        out=os.path.join(j["outdir"],f"{j['prefix']}_{i}.mp3")
        open(out,"wb").write(base64.b64decode(p["audio_base_64"]))
        ids.append(p["generated_voice_id"]); print("OK",out,p["generated_voice_id"])
    json.dump({"generated_ids":ids,"desc":j["description"]},open(j["outdir"]+"/_gids.json","w",encoding="utf-8"),ensure_ascii=False)
except urllib.error.HTTPError as e:
    print("HTTP",e.code,e.read()[:300])
