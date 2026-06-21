# -*- coding: utf-8 -*-
import json,sys,os,urllib.request,importlib.util
spec=importlib.util.spec_from_file_location("stt","stt.py");stt=importlib.util.module_from_spec(spec);spec.loader.exec_module(stt)
K=stt.key()
vid=sys.argv[1]; jobs=json.load(open(sys.argv[2],encoding="utf-8"))
H={"xi-api-key":K,"Content-Type":"application/json"}
for j in jobs:
    os.makedirs(os.path.dirname(j["out"]),exist_ok=True)
    url=f"https://api.elevenlabs.io/v1/text-to-speech/{vid}?output_format=mp3_44100_128"
    req=urllib.request.Request(url,data=json.dumps({"text":j["text"],"model_id":"eleven_multilingual_v2"}).encode("utf-8"),headers=H,method="POST")
    try:
        open(j["out"],"wb").write(urllib.request.urlopen(req,timeout=180).read())
        print("OK",j["out"],os.path.getsize(j["out"]),"B")
    except Exception as e: print("ERR",j["out"],str(e)[:160])
