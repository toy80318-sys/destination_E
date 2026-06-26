# -*- coding: utf-8 -*-
# JY 보이스(bQlkYuipD5BHEhntA5iz) 장영실 — 한국식 숫자(세 개) + 연기 톤 3종 비교.
import json,os,urllib.request,urllib.error,importlib.util
s=importlib.util.spec_from_file_location("stt","stt.py");m=importlib.util.module_from_spec(s);s.loader.exec_module(m);K=m.key()
H={"xi-api-key":K,"Content-Type":"application/json"}
VID="bQlkYuipD5BHEhntA5iz"
# 한국식 읽기: 400년→사백 년, 3개→세 개(고유어 단위)
LINE="거북선을… 만들겠다고? 사백 년 전 그 배를, 지금 재료로. 후훗, 재밌네. 중수소 배터리 세 개만 가져오면 — 한번, 들어주지! 자, 그럼 시작해 볼까?"
VARS=[
 ("v3_expressive","eleven_v3",0.3,"[playful][teasing] "+LINE),   # 표현력↑(변화 큼)
 ("v3_natural","eleven_v3",0.55,"[warm][playful] "+LINE),         # 자연스럽게(안정)
 ("v2_smooth","eleven_multilingual_v2",0.45,LINE),               # 다른 엔진(부드러움, 태그無)
]
od="clips/_sample_jang3"; os.makedirs(od,exist_ok=True)
for nm,model,stab,txt in VARS:
    out=f"{od}/jy_{nm}.mp3"
    b={"text":txt,"model_id":model,"voice_settings":{"stability":stab,"similarity_boost":0.85}}
    r=urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{VID}?output_format=mp3_44100_128",data=json.dumps(b).encode(),headers=H,method="POST")
    try: open(out,"wb").write(urllib.request.urlopen(r,timeout=180).read()); print("OK",out)
    except urllib.error.HTTPError as e: print("HTTP",nm,e.code,e.read()[:160])
