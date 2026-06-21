# -*- coding: utf-8 -*-
import json,sys,os,urllib.request,urllib.error,importlib.util
spec=importlib.util.spec_from_file_location("stt","stt.py");stt=importlib.util.module_from_spec(spec);spec.loader.exec_module(stt)
K=stt.key(); H={"xi-api-key":K,"Content-Type":"application/json"}
for j in json.load(open(sys.argv[1],encoding="utf-8")):
    os.makedirs(os.path.dirname(j["out"]),exist_ok=True)
    body={"text":j["text"],"model_id":j.get("model","eleven_v3")}
    if "stability" in j: body["voice_settings"]={"stability":j["stability"]}
    url=f"https://api.elevenlabs.io/v1/text-to-speech/{j['voice']}?output_format=mp3_44100_128"
    req=urllib.request.Request(url,data=json.dumps(body).encode("utf-8"),headers=H,method="POST")
    try:
        open(j["out"],"wb").write(urllib.request.urlopen(req,timeout=180).read())
        print("OK",j["out"],os.path.getsize(j["out"]),"B  model=",body["model_id"])
    except urllib.error.HTTPError as e:
        print("HTTP",j["out"],e.code,e.read()[:200])
    except Exception as e: print("ERR",j["out"],str(e)[:160])
