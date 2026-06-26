# -*- coding: utf-8 -*-
# 보스 직후/엔딩 고정 대사(이름 변수 없는 것)만 음성 생성. KO+EN.
import json,os,urllib.request,urllib.error,importlib.util
spec=importlib.util.spec_from_file_location("stt","stt.py");stt=importlib.util.module_from_spec(spec);spec.loader.exec_module(stt)
K=stt.key(); H={"xi-api-key":K,"Content-Type":"application/json"}

# 계정 보이스에서 navai(시스템) KO 보이스 해석 (이름에 '항법' 포함)
def list_voices():
    req=urllib.request.Request("https://api.elevenlabs.io/v1/voices",headers={"xi-api-key":K})
    d=json.load(urllib.request.urlopen(req,timeout=30))
    return [(v.get("name",""),v.get("voice_id","")) for v in d.get("voices",[])]
voices=list_voices()
def resolve(aliases):
    for a in aliases:
        for nm,vid in voices:
            if a and a in nm: return vid,nm
    return None,None
sys_ko,nm=resolve(["항법","시스템","AI"])
print("시스템(navai) KO 보이스:",sys_ko,nm)
if not sys_ko: sys_ko="nPczCjzI2devNBz1zQrb"  # 폴백(Brian)

# 화자별 voice id
V={
 "system_ko":sys_ko, "system_en":"SAz9YHcvj6GT2YYXdXww",       # River neutral AI
 "commander_ko":"MpbDJfQJUYUnp0i1QvOZ", "commander_en":"TX3LPaxmHKxFdv7VOQHJ",
 "baekgu_ko":"m8ZvjfA66O7ipbXTTQ4Y",   "baekgu_en":"cjVigY5qzO86Huf0OWal",
 "yisunsin_ko":"ZZ4xhVcc83kZBfNIlIIz", "yisunsin_en":"JBFqnCBsd6RMkjVDRZzb",
}
# jobs: (out, voice, model, stability, text)
JOBS=[
 # ── KO ──
 ("clips/navai/navai_492.mp3",      V["system_ko"],"eleven_multilingual_v2",0.5,"백 년의 봉쇄가, 끝났다."),
 ("clips/navai/navai_493.mp3",      V["system_ko"],"eleven_multilingual_v2",0.5,"지구는, 다시 별을 향해 손을 뻗는다."),
 ("clips/navai/navai_494.mp3",      V["system_ko"],"eleven_multilingual_v2",0.5,"인류 해방, 완수."),
 ("clips/commander/commander_495.mp3",V["commander_ko"],"eleven_v3",0.4,"[resolute] 우리는 함께 어둠을 뚫었다."),
 ("clips/baekgu/baekgu_496.mp3",    V["baekgu_ko"],"eleven_v3",0.4,"[wistful] 센서 이상. 눈가가 축축하다. 이건 눈물이다. 비지 백, 마지막 로그 종료."),
 ("clips/baekgu/baekgu_497.mp3",    V["baekgu_ko"],"eleven_v3",0.4,"[wistful] 육 단 체인을 마지막으로 보던 순간. 알면서도 갔다. 그것이 인간의 방식이었다."),
 ("clips/baekgu/baekgu_498.mp3",    V["baekgu_ko"],"eleven_v3",0.4,"[warm] 디데이 백 년, 사백십이 일째. 지구에 착륙. 풀밭의 색은, 백 년 형광등이 흉내 못 한 것이었다."),
 ("clips/yisunsin/yisunsin_499.mp3",V["yisunsin_ko"],"eleven_v3",0.4,"[commanding] 보이드 구역 세 행성. 캅테인 균열, 오리온 균열, 제타 레티쿨리. 우르사 메이저 잔존 세력이 아직 불안정해. 서둘러야 해."),
 # ── EN ──
 ("clips_en/navai/navai_492.mp3",   V["system_en"],"eleven_multilingual_v2",0.5,"A hundred-year blockade has ended."),
 ("clips_en/navai/navai_493.mp3",   V["system_en"],"eleven_multilingual_v2",0.5,"Earth reaches for the stars again."),
 ("clips_en/navai/navai_494.mp3",   V["system_en"],"eleven_multilingual_v2",0.5,"Humanity, liberated."),
 ("clips_en/commander/commander_495.mp3",V["commander_en"],"eleven_v3",0.4,"[resolute] Together, we pierced the dark."),
 ("clips_en/baekgu/baekgu_496.mp3", V["baekgu_en"],"eleven_v3",0.4,"[wistful] Sensor anomaly. My eyes are damp. These are tears. B G one hundred, final log closing."),
 ("clips_en/baekgu/baekgu_497.mp3", V["baekgu_en"],"eleven_v3",0.4,"[wistful] The moment I last saw the six-stage chain. Knowing, they still went. That was the human way."),
 ("clips_en/baekgu/baekgu_498.mp3", V["baekgu_en"],"eleven_v3",0.4,"[warm] D-day, one hundred years and four hundred twelve days. Landed on Earth. The color of the grass; a hundred years of fluorescent light could not imitate it."),
 ("clips_en/yisunsin/yisunsin_499.mp3",V["yisunsin_en"],"eleven_v3",0.4,"[commanding] The three Void-zone planets; the Kapteyn Rift, the Orion Rift, and Zeta Reticuli. The remnants of Ursa Major are still unstable. We must hurry."),
]
ok=fail=0
for out,vid,model,stab,text in JOBS:
    os.makedirs(os.path.dirname(out),exist_ok=True)
    body={"text":text,"model_id":model,"voice_settings":{"stability":stab}}
    url=f"https://api.elevenlabs.io/v1/text-to-speech/{vid}?output_format=mp3_44100_128"
    req=urllib.request.Request(url,data=json.dumps(body).encode("utf-8"),headers=H,method="POST")
    try:
        open(out,"wb").write(urllib.request.urlopen(req,timeout=180).read())
        print("OK",out,os.path.getsize(out),"B"); ok+=1
    except urllib.error.HTTPError as e:
        print("HTTP",out,e.code,e.read()[:160]); fail+=1
    except Exception as e:
        print("ERR",out,str(e)[:160]); fail+=1
print(f"\n생성 {ok} / 실패 {fail}")
