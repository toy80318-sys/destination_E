# -*- coding: utf-8 -*-
# 네이티브 한국어 여성 보이스(라이브러리)로 장영실 샘플. 감정·연기 위주.
import json,os,urllib.request,urllib.error,importlib.util
s=importlib.util.spec_from_file_location("stt","stt.py");m=importlib.util.module_from_spec(s);s.loader.exec_module(m);K=m.key()
H={"xi-api-key":K,"Content-Type":"application/json"}
TXT="[cheerful] 거북선을… 만들겠다고? 400년 전 그 배를, 지금 재료로. 후훗, 재밌네. 중수소 배터리 3개만 가져오면 — 한번, 들어주지! 자, 그럼 시작해 볼까?"
CAND=[
 ("jy_upbeat","bQlkYuipD5BHEhntA5iz"),
 ("hanabad_confident","YDseIkMzKtO5bK1Ehnev"),
 ("jiana_crisp","uD0jH1cfRqteeku18ODi"),
 ("kor_confident","967YaIBn5kirwC9uSefO"),
]
od="clips/_sample_jang3"; os.makedirs(od,exist_ok=True)
for nm,vid in CAND:
    out=f"{od}/jang3_{nm}.mp3"
    b={"text":TXT,"model_id":"eleven_v3","voice_settings":{"stability":0.4}}
    r=urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{vid}?output_format=mp3_44100_128",data=json.dumps(b).encode(),headers=H,method="POST")
    try:
        open(out,"wb").write(urllib.request.urlopen(r,timeout=180).read()); print("OK",out)
    except urllib.error.HTTPError as e:
        print("HTTP",nm,e.code,e.read()[:160])
    except Exception as e: print("ERR",nm,str(e)[:120])
