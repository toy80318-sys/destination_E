# -*- coding: utf-8 -*-
# ElevenLabs Voice Design(text-to-voice) → 보이스 생성 후 해당 대사 TTS 저장
import json, os, sys, base64, urllib.request, urllib.error, importlib.util
spec=importlib.util.spec_from_file_location("stt","stt.py");stt=importlib.util.module_from_spec(spec);spec.loader.exec_module(stt)
K=stt.key()
if not K: sys.exit("키 없음")
H={"xi-api-key":K,"Content-Type":"application/json"}
def post(url,obj):
    req=urllib.request.Request(url,data=json.dumps(obj).encode("utf-8"),headers=H,method="POST")
    return json.loads(urllib.request.urlopen(req,timeout=180).read().decode("utf-8"))
def tts(voice_id,text,out):
    url=f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128"
    req=urllib.request.Request(url,data=json.dumps({"text":text,"model_id":"eleven_multilingual_v2"}).encode("utf-8"),headers=H,method="POST")
    open(out,"wb").write(urllib.request.urlopen(req,timeout=180).read())
jobs=json.load(open(sys.argv[1],encoding="utf-8"))
vid_map={}
if os.path.exists("voice_ids.csv"):
    for ln in open("voice_ids.csv",encoding="utf-8"):
        p=ln.strip().split(","); 
        if len(p)>=2: vid_map[p[0]]=p[1]
for j in jobs:
    slug=j["slug"]
    try:
        pv=post("https://api.elevenlabs.io/v1/text-to-voice/create-previews",
                {"voice_description":j["description"],"text":j["sample"],"auto_generate_text":False})
        gid=pv["previews"][0]["generated_voice_id"]
        # 미리듣기 저장(참고)
        open(f"preview_{slug}.mp3","wb").write(base64.b64decode(pv["previews"][0]["audio_base_64"]))
        sv=post("https://api.elevenlabs.io/v1/text-to-voice/create-voice-from-preview",
                {"voice_name":j["name"],"voice_description":j["description"],"generated_voice_id":gid})
        vid=sv["voice_id"]; vid_map[slug]=vid
        tts(vid,j["line"],f"src/{slug}.mp3")
        print(f"OK {slug} voice_id={vid} -> src/{slug}.mp3 ({os.path.getsize('src/'+slug+'.mp3')}B)")
    except urllib.error.HTTPError as e:
        print(f"HTTP {slug}",e.code,e.read()[:300])
    except Exception as e:
        print(f"ERR {slug}",str(e)[:200])
with open("voice_ids.csv","w",encoding="utf-8") as f:
    for k,v in vid_map.items(): f.write(f"{k},{v}\n")
