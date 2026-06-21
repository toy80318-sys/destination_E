# -*- coding: utf-8 -*-
# 미리듣기(generated_voice_id) → 계정 저장 → 해당 음성으로 대사 TTS
import json,sys,os,urllib.request,urllib.error,importlib.util,time
spec=importlib.util.spec_from_file_location("stt","stt.py");stt=importlib.util.module_from_spec(spec);spec.loader.exec_module(stt)
K=stt.key(); H={"xi-api-key":K,"Content-Type":"application/json"}
cfg=json.load(open(sys.argv[1],encoding="utf-8"))
# 1) 저장
body={"voice_name":cfg["voice_name"],"voice_description":cfg["description"],"generated_voice_id":cfg["generated_voice_id"]}
req=urllib.request.Request("https://api.elevenlabs.io/v1/text-to-voice/create-voice-from-preview",
    data=json.dumps(body).encode("utf-8"),headers=H,method="POST")
try:
    vid=json.loads(urllib.request.urlopen(req,timeout=120).read().decode("utf-8"))["voice_id"]
    print("VOICE_SAVED",vid)
except urllib.error.HTTPError as e:
    print("HTTP save",e.code,e.read()[:300]); sys.exit(1)
# 2) TTS
for j in cfg["lines"]:
    os.makedirs(os.path.dirname(j["out"]),exist_ok=True)
    b={"text":j["text"],"model_id":"eleven_v3","voice_settings":{"stability":0.0}}
    r=urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{vid}?output_format=mp3_44100_128",
        data=json.dumps(b).encode("utf-8"),headers=H,method="POST")
    for a in range(4):
        try: open(j["out"],"wb").write(urllib.request.urlopen(r,timeout=180).read()); print("OK",j["out"]); break
        except urllib.error.HTTPError as e:
            if e.code==429 and a<3: time.sleep(5); continue
            print("HTTP",j["out"],e.code,e.read()[:120]); break
    time.sleep(0.8)
# voice_ids 기록
open("voice_ids.csv","a",encoding="utf-8").write(f"aureusboss,{vid}\n")
print("DONE")
