# -*- coding: utf-8 -*-
# 첫 만남 멘트 음성 — 영웅9 + 맥시모프. 기존 보이스. num 622~630, 632. KO+EN.
import sys,io; sys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding='utf-8')
import json,os,re,csv,time,shutil,urllib.request,urllib.error,importlib.util
s=importlib.util.spec_from_file_location("stt","stt.py");m=importlib.util.module_from_spec(s);s.loader.exec_module(m);K=m.key()
nk=importlib.util.module_from_spec(importlib.util.spec_from_file_location("_numko","_numko.py"))
importlib.util.spec_from_file_location("_numko","_numko.py").loader.exec_module(nk)
H={"xi-api-key":K,"Content-Type":"application/json"}
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),"..",".."))
EN=json.load(open("casting_en.json",encoding="utf-8"))
def env(slug): return (EN.get(slug) or {}).get("voice")
voices=[(v.get("name",""),v.get("voice_id","")) for v in json.load(urllib.request.urlopen(urllib.request.Request("https://api.elevenlabs.io/v1/voices",headers={"xi-api-key":K}),timeout=30)).get("voices",[])]
def acc(alias,fb=None):
    for a in alias:
        for nm,vid in voices:
            if a in nm: return vid
    return fb
FIX={"yisunsin":"Uzazy4zhKPfGGeuptGj0","jangyeongsil":"zGjIP4SZlMnY9m93k97r","baekgu":"m8ZvjfA66O7ipbXTTQ4Y"}
def kov(slug,aliases): return FIX.get(slug) or acc(aliases)
def clean(t):
    t=re.sub(r'[\(\[][^\)\]]*[\)\]]','',t); t=t.replace(',','')
    return nk.convert(t).strip()
# (num, slug, koVoice, enVoice, emo, KO, EN)
J=[
 (622,"yisunsin",FIX["yisunsin"],"JBFqnCBsd6RMkjVDRZzb","[solemn]",
  "…그대가 나를 깨운 사령관인가. 이순신이라 하오. 손을 빌려주겠소.",
  "...So you are the one who woke me, Commander. I am Yi Sun-sin. I lend you my hand."),
 (623,"jangyeongsil",FIX["jangyeongsil"],env("jangyeongsil"),"[cheerful]",
  "오, 처음 뵙네요. 장영실이에요. 손에 잡히는 건 뭐든 더 낫게 만들죠.",
  "Oh, we meet at last. I'm Jang Yeong-sil — I make anything I touch better."),
 (624,"gwanggaeto",acc(["광개토"],"ESNrF6xSj96uiykXXT1f"),"ESNrF6xSj96uiykXXT1f","[bold]",
  "반갑소, 사령관! 나 광개토, 그대의 깃발 아래 땅을 넓혀주지.",
  "Well met, Commander! I am Gwanggaeto — I'll widen your lands under your banner."),
 (625,"gagarin",acc(["가가린"],"IKne3meq5aSn9XLyUdCD"),"IKne3meq5aSn9XLyUdCD","[warm]",
  "안녕하세요, 사령관! 가가린입니다. 100년 만의 첫 동료라니 — 영광이에요.",
  "Hello, Commander! Gagarin here. The first comrade in a hundred years — what an honor."),
 (626,"nelson",acc(["넬슨"],"onwK4e9ZLuTAKqWW03F9"),"onwK4e9ZLuTAKqWW03F9","[resolute]",
  "처음 뵙겠소, 사령관. 호레이쇼 넬슨. 바다를 지키던 손, 이제 그대 곁에 두겠소.",
  "A pleasure, Commander. Horatio Nelson. The hand that guarded the sea now stands with you."),
 (627,"einstein",acc(["아인슈타인"],"nPczCjzI2devNBz1zQrb"),"nPczCjzI2devNBz1zQrb","[thoughtful]",
  "반갑네, 사령관. 아인슈타인일세. 시간조차… 우리 편으로 돌려보지.",
  "Good to meet you, Commander. Einstein. Let us turn even time… to our side."),
 (628,"tesla",acc(["테슬라"],"N2lVS1w4EtoT3dr4eOWO"),"N2lVS1w4EtoT3dr4eOWO","[playful]",
  "만나서 반가워, 사령관. 테슬라야. 번개 한 줄기면 충분하지.",
  "Nice to meet you, Commander. Tesla. One bolt of lightning is all I need."),
 (629,"marcopolo",acc(["마르코"],"iP95p4xoKVk53GoZ742B"),"iP95p4xoKVk53GoZ742B","[sly]",
  "하, 드디어 만났군. 마르코 폴로요. 이 우주의 길은 내가 제일 잘 알지.",
  "Ha, we finally meet. Marco Polo. No one knows the roads of this cosmos better than I."),
 (630,"leehwiso",acc(["이휘소"],env("leehwiso")),env("leehwiso"),"[hesitant]",
  "…날 깨운 게 당신이오? 이휘소요. 내 방정식이 쓰일 곳을 찾은 것 같군.",
  "...You woke me? I'm Dr. Lee Hwi-so. It seems my equations have found their purpose."),
 (632,"maximoff",acc(["맥시모프","레인저"],env("maximoff")),env("maximoff"),"[wary]",
  "낯선 함대로군… 적이오, 아군이오? …좋소, 믿어보지. 저항군 레인저, 맥시모프요.",
  "An unfamiliar fleet… foe or friend? ...Fine, I'll trust you. Maximoff, Ranger of the Resistance."),
]
def tts(vid,text,rel):
    if not vid: print("보이스없음",rel); return False
    os.makedirs(os.path.dirname(rel),exist_ok=True)
    b={"text":text,"model_id":"eleven_v3","voice_settings":{"stability":0.4}}
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
rows=[];ok=0
for num,slug,kv,ev,emo,ko,en in J:
    a=tts(kv,(emo+" "+clean(ko)).strip(),f"clips/{slug}/{slug}_{num}.mp3")
    b=tts(ev,(emo+" "+re.sub(r'[\(\[][^\)\]]*[\)\]]','',en)).strip(),f"clips_en/{slug}/{slug}_{num}.mp3")
    if a:
        rows.append((str(num),slug,f"02_Assets/audio/voice/{slug}/{slug}_{num}.mp3",f"02_Assets/audio/voice_en/{slug}/{slug}_{num}.mp3" if b else "",ko)); ok+=1
        print("OK",num,slug,"KO","EN" if b else "-")
    time.sleep(0.4)
with open("voice_manifest.csv","a",encoding="utf-8",newline="") as f:
    w=csv.writer(f)
    for num,slug,clip,clip_en,tx in rows:
        w.writerow([num,slug,slug,clip,"",clip_en,"","ko",tx])
print(f"\n첫만남 멘트 생성 {ok}/10, CSV 행 추가 (num 622~630,632)")
