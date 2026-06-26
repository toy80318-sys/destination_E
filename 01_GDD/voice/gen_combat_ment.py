# -*- coding: utf-8 -*-
# 전투후 멘트 음성(자막 정확 매칭): combat.defeatGeneric1~3(적), merchant.thanks1~3(상인). KO+EN.
import sys,io; sys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding='utf-8')
import json,os,csv,time,shutil,urllib.request,urllib.error,importlib.util
s=importlib.util.spec_from_file_location("stt","stt.py");m=importlib.util.module_from_spec(s);s.loader.exec_module(m);K=m.key()
H={"xi-api-key":K,"Content-Type":"application/json"}
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),"..",".."))
EN_VOICE_ENEMY="SOYHLrjzK2X1ezoPC6cr"; KO_VOICE_ENEMY="pyPk875kUhi61JhqMlUF"
EN_VOICE_MER="cjVigY5qzO86Huf0OWal"; KO_VOICE_MER="ZZ4xhVcc83kZBfNIlIIz"
# (manifestKey, char, clipstem, koVoice,enVoice, emo, koText, enText)
J=[
 ("combat.defeatGeneric1","적군/해적","combat/defeatGeneric_1",KO_VOICE_ENEMY,EN_VOICE_ENEMY,"[shocked]",
  "말도 안 돼… 이 함대가, 우리를?!","Impossible… this fleet, beating us?!"),
 ("combat.defeatGeneric2","적군/해적","combat/defeatGeneric_2",KO_VOICE_ENEMY,EN_VOICE_ENEMY,"[menacing]",
  "이런 굴욕은… 반드시 기억해두마.","I'll remember this humiliation… count on it."),
 ("combat.defeatGeneric3","적군/해적","combat/defeatGeneric_3",KO_VOICE_ENEMY,EN_VOICE_ENEMY,"[urgent]",
  "후퇴! 전부 후퇴하라 — 저들은 보통이 아니다!","Fall back! All ships retreat — these are no ordinary foes!"),
 ("merchant.thanks1","구출된 상인","combat/merchant_thanks_1",KO_VOICE_MER,EN_VOICE_MER,"[relieved]",
  "휴— 살았다! 해적들이 막 화물칸을 뜯어내려던 참이었소. 정말 고맙소, 사령관.","Phew — saved! The pirates were about to crack open my hold. Truly grateful, Commander."),
 ("merchant.thanks2","구출된 상인","combat/merchant_thanks_2",KO_VOICE_MER,EN_VOICE_MER,"[grateful]",
  "당신이 아니었으면 우주 먼지가 될 뻔했지. 변변찮지만 사례로 받아주시오.","Without you I'd be space dust by now. It isn't much, but please accept it."),
 ("merchant.thanks3","구출된 상인","combat/merchant_thanks_3",KO_VOICE_MER,EN_VOICE_MER,"[warm]",
  "이 은하에 아직 의로운 이가 남아있었군. 이 신세는 잊지 않으리다.","So there are still decent folk left in this galaxy. I won't forget this debt."),
]
def tts(vid,text,rel):
    os.makedirs(os.path.dirname(rel),exist_ok=True)
    b={"text":text,"model_id":"eleven_v3","voice_settings":{"stability":0.3}}
    r=urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{vid}?output_format=mp3_44100_128",data=json.dumps(b).encode(),headers=H,method="POST")
    for a in range(4):
        try:
            open(rel,"wb").write(urllib.request.urlopen(r,timeout=180).read())
            base="voice_en" if rel.startswith("clips_en/") else "voice"
            dp=os.path.join(ROOT,"02_Assets","audio",base,rel.split("/",1)[1]).replace("/",os.sep)
            os.makedirs(os.path.dirname(dp),exist_ok=True); shutil.copyfile(rel,dp); return True
        except urllib.error.HTTPError as e:
            if e.code==429 and a<3: time.sleep(5); continue
            print("HTTP",rel,e.code,e.read()[:80]); return False
    return False
rows=[]; ok=0
for key,ch,stem,kv,ev,emo,ko,en in J:
    a=tts(kv,emo+" "+ko,f"clips/{stem}.mp3")
    b=tts(ev,emo+" "+en,f"clips_en/{stem}.mp3")
    if a:
        rows.append((key,ch,f"02_Assets/audio/voice/{stem}.mp3",f"02_Assets/audio/voice_en/{stem}.mp3" if b else "",ko)); ok+=1
        print("OK",key)
    time.sleep(0.4)
# 매니페스트 추가(중복 키 방지)
existing=open("voice_manifest.csv",encoding="utf-8-sig").read()
with open("voice_manifest.csv","a",encoding="utf-8",newline="") as f:
    w=csv.writer(f)
    for key,ch,clip,clip_en,tx in rows:
        if (","+key+",") in (","+existing):
            print("skip existing",key); continue
        if ("/"+clip.split("/")[-1]) in existing and key in existing:
            print("skip",key); continue
        w.writerow([key,ch,"combat",clip,"",clip_en,"","ko",tx])
print(f"\n전투후 멘트 생성 {ok}/6, CSV 행 추가 완료")
