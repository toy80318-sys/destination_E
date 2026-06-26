# -*- coding: utf-8 -*-
# falcon_1 프리뷰 → 블랙팔콘 보이스 저장 → 헤럴드 7줄 KO+EN 생성+배포+CSV.
import json,os,csv,time,shutil,urllib.request,urllib.error,importlib.util
s=importlib.util.spec_from_file_location("stt","stt.py");m=importlib.util.module_from_spec(s);s.loader.exec_module(m);K=m.key()
H={"xi-api-key":K,"Content-Type":"application/json"}
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),"..",".."))
PREVIEW_ID="aMPcWoZ4aG9JgmmSJZZX"
desc=json.load(open("clips/_sample_blackfalcon/_gids.json",encoding="utf-8"))["desc"]
# 1) 저장
b={"voice_name":"Black Falcon (Void herald)","voice_description":desc,"generated_voice_id":PREVIEW_ID}
r=urllib.request.Request("https://api.elevenlabs.io/v1/text-to-voice/create-voice-from-preview",data=json.dumps(b).encode(),headers=H,method="POST")
try:
    vid=json.loads(urllib.request.urlopen(r,timeout=120).read().decode())["voice_id"]; print("VOICE_SAVED",vid)
except urllib.error.HTTPError as e:
    print("HTTP save",e.code,e.read()[:200]); raise SystemExit(1)
open("voice_ids.csv","a",encoding="utf-8").write(f"blackfalcon,{vid}\n")
# 2) 헤럴드 7줄 (num, KO_매니페스트텍스트, KO_낭독, EN_매니페스트텍스트, EN_낭독)
JOBS=[
 (542,"...... 들리는가? .... 들리는...가....","들리는가...... 들리는가....",
       "...... Can you hear? .... Hear... me....","Can you hear...... hear me...."),
 (543,"지직— 보이드 행성의 총독권을 가져간 존재들이....... 그러한 가치가... 있는지...","보이드 행성의 총독권을 가져간 존재들이...... 그러한 가치가... 있는지...",
       "Crackle— Those who took the Void governorship... do they have... such value...","Those who took the Void governorship... do they have... such value..."),
 (544,"츠츠즉— ...... 시험해 보겠다.","시험해... 보겠다.",
       "Hzzzt— ...... I shall test you.","I shall... test you."),
 (545,"음.. 우주에서 이렇게 강한 함대는 1000년만에 처음 만났군.. 좋다..","음.. 우주에서 이렇게 강한 함대는 천 년 만에 처음 만났군.. 좋다..",
       "Hmm... a fleet this strong — the first I've met in a thousand years. Good.","Hmm... a fleet this strong; the first I've met in a thousand years. Good."),
 (546,"그대들의 목표를 지켜보겠다. 하지만 보이드 문명에 선을 넘지는 말길 바란다..","그대들의 목표를 지켜보겠다. 하지만 보이드 문명에 선을 넘지는 말길 바란다..",
       "I will watch your purpose. But do not cross the line of Void civilization.","I will watch your purpose. But do not cross the line of Void civilization."),
 (547,"선물 하나를 하지.. 은하계 가운데로 가볼 수 있다면 내 마지막 시험을 통과할 것이다.","선물 하나를 하지.. 은하계 가운데로 가볼 수 있다면, 내 마지막 시험을 통과할 것이다.",
       "A gift — if you can reach the center of the galaxy, you will pass my final trial.","A gift; if you can reach the center of the galaxy, you will pass my final trial."),
 (548,"훌륭하다... 내 함대를 모두 꺾었군. 1000년 만에 처음이다. 그렇다면 — 이제 내가 직접 상대해주지.","훌륭하다... 내 함대를 모두 꺾었군. 천 년 만에 처음이다. 그렇다면, 이제 내가 직접 상대해주지.",
       "Excellent... you broke my whole fleet. The first in a thousand years. Then — I'll face you myself.","Excellent... you broke my whole fleet. The first in a thousand years. Then, I'll face you myself."),
]
def tts(text,out):
    bd={"text":"[ominous][slow] "+text,"model_id":"eleven_v3","voice_settings":{"stability":0.4}}
    rq=urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{vid}?output_format=mp3_44100_128",data=json.dumps(bd).encode(),headers=H,method="POST")
    for a in range(4):
        try: open(out,"wb").write(urllib.request.urlopen(rq,timeout=180).read()); return True
        except urllib.error.HTTPError as e:
            if e.code==429 and a<3: time.sleep(5); continue
            print("HTTP",out,e.code,e.read()[:90]); return False
    return False
rows=[]; ok=0
for num,ko_txt,ko_say,en_txt,en_say in JOBS:
    ko=f"clips/blackfalcon/blackfalcon_{num}.mp3"; en=f"clips_en/blackfalcon/blackfalcon_{num}.mp3"
    os.makedirs(os.path.dirname(ko),exist_ok=True); os.makedirs(os.path.dirname(en),exist_ok=True)
    a=tts(ko_say,ko); b2=tts(en_say,en)
    if a:
        shutil.copyfile(ko,os.path.join(ROOT,"02_Assets","audio","voice","blackfalcon",f"blackfalcon_{num}.mp3")) if os.makedirs(os.path.join(ROOT,"02_Assets","audio","voice","blackfalcon"),exist_ok=True) or True else None
    if b2:
        os.makedirs(os.path.join(ROOT,"02_Assets","audio","voice_en","blackfalcon"),exist_ok=True); shutil.copyfile(en,os.path.join(ROOT,"02_Assets","audio","voice_en","blackfalcon",f"blackfalcon_{num}.mp3"))
    if a:
        rows.append((str(num),f"02_Assets/audio/voice/blackfalcon/blackfalcon_{num}.mp3",f"02_Assets/audio/voice_en/blackfalcon/blackfalcon_{num}.mp3",ko_txt)); ok+=1; print("OK",num)
    time.sleep(0.5)
with open("voice_manifest.csv","a",encoding="utf-8",newline="") as f:
    w=csv.writer(f)
    for num,clip,clip_en,tx in rows:
        w.writerow([num,"블랙팔콘","blackfalcon",clip,"",clip_en,"","ko",tx])
print(f"\n헤럴드 생성 {ok}/7, CSV {len(rows)}행 (num 542~548)")
