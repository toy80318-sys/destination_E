# -*- coding: utf-8 -*-
# 엔딩 heroBlocks 누락 음성: 영웅 한마디(이름없는 것) + 백구 일기(이름없는 것). KO+EN. num 610~.
import sys,io; sys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding='utf-8')
import re,os,csv,json,time,shutil,urllib.request,urllib.error,importlib.util
s=importlib.util.spec_from_file_location("stt","stt.py");m=importlib.util.module_from_spec(s);s.loader.exec_module(m);K=m.key()
nk=importlib.util.module_from_spec(importlib.util.spec_from_file_location("_numko","_numko.py"))
importlib.util.spec_from_file_location("_numko","_numko.py").loader.exec_module(nk)
H={"xi-api-key":K,"Content-Type":"application/json"}
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),"..",".."))
def i18n(fn):
    s=open(os.path.join(ROOT,fn),encoding='utf-8').read()
    def g(k):
        mm=re.search(r'"%s"\s*:\s*"((?:[^"\\]|\\.)*)"'%re.escape(k),s)
        if not mm: return None
        t=mm.group(1).replace('\\n',' ').replace('\\"','"').replace("\\'","'")
        return t
    return g
gko=i18n('i18n/ko.js'); gen=i18n('i18n/en.js')
def clean(t):
    t=re.sub(r'<[^>]+>','',t)            # html 태그 제거
    t=re.sub(r'\{[^}]*\}','',t)
    t=re.sub(r'[\(\[][^\)\]]*[\)\]]','',t)
    t=t.replace(',', '')                 # 1,700 → 1700
    return nk.convert(t).strip()
# 계정 보이스 해석
voices=[(v.get("name",""),v.get("voice_id","")) for v in json.load(urllib.request.urlopen(urllib.request.Request("https://api.elevenlabs.io/v1/voices",headers={"xi-api-key":K}),timeout=30)).get("voices",[])]
def acc(alias,fb=None):
    for nm,vid in voices:
        if alias in nm: return vid
    return fb
# slug -> (KO voice, EN voice, emo)
HERO={
 1:("yisunsin","Uzazy4zhKPfGGeuptGj0","JBFqnCBsd6RMkjVDRZzb","[solemn]"),
 2:("jangyeongsil","zGjIP4SZlMnY9m93k97r","Z... ",""),  # h02 text는 jangyeongsil; EN 캐스팅 사용
 3:("gwanggaeto",acc("광개토","ESNrF6xSj96uiykXXT1f"),"ESNrF6xSj96uiykXXT1f","[bold]"),
 4:("gagarin",acc("가가린","IKne3meq5aSn9XLyUdCD"),"IKne3meq5aSn9XLyUdCD","[warm]"),
 5:("nelson",acc("넬슨","onwK4e9ZLuTAKqWW03F9"),"onwK4e9ZLuTAKqWW03F9","[resolute]"),
 7:("tesla",acc("테슬라","N2lVS1w4EtoT3dr4eOWO"),"N2lVS1w4EtoT3dr4eOWO","[wry]"),
 8:("marcopolo",acc("마르코","iP95p4xoKVk53GoZ742B"),"iP95p4xoKVk53GoZ742B","[warm]"),
}
EN_CAST=json.load(open("casting_en.json",encoding="utf-8"))
HERO[2]=("jangyeongsil","zGjIP4SZlMnY9m93k97r",(EN_CAST.get("jangyeongsil") or {}).get("voice"),"[cheerful]")
BK_KO="m8ZvjfA66O7ipbXTTQ4Y"; BK_EN="cjVigY5qzO86Huf0OWal"
def tts(vid,text,rel,stab=0.4):
    os.makedirs(os.path.dirname(rel),exist_ok=True)
    b={"text":text,"model_id":"eleven_v3","voice_settings":{"stability":stab}}
    r=urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{vid}?output_format=mp3_44100_128",data=json.dumps(b).encode(),headers=H,method="POST")
    for a in range(4):
        try:
            open(rel,"wb").write(urllib.request.urlopen(r,timeout=180).read())
            base="voice_en" if rel.startswith("clips_en/") else "voice"
            sub=rel.split("/",1)[1]
            dp=os.path.join(ROOT,"02_Assets","audio",base,sub).replace("/",os.sep)
            os.makedirs(os.path.dirname(dp),exist_ok=True); shutil.copyfile(rel,dp); return True
        except urllib.error.HTTPError as e:
            if e.code==429 and a<3: time.sleep(5); continue
            print("HTTP",rel,e.code,e.read()[:80]); return False
    return False
# 작업 목록: (num, slug, koVoice, enVoice, emo, ko_text, en_text, clipstem)
jobs=[]; num=610
# 영웅 한마디 (h06.text 제외: 이름변수)
for i in [1,2,3,4,5,7,8]:
    slug,kv,ev,emo=HERO[i]
    ko=gko(f"ending.h0{i}.text"); en=gen(f"ending.h0{i}.text")
    jobs.append((num,slug,kv,ev,emo,ko,en,f"{slug}/{slug}_{num}")); num+=1
# 백구 일기 (이름없는 것: h01,h04,h05,h06,h07)
for i in [1,4,5,6,7]:
    ko=gko(f"ending.h0{i}.diary"); en=gen(f"ending.h0{i}.diary")
    jobs.append((num,"baekgu",BK_KO,BK_EN,"[wistful]",ko,en,f"baekgu/baekgu_{num}")); num+=1
rows=[]; ok=0
for num,slug,kv,ev,emo,ko,en,stem in jobs:
    if not ko: print("KO텍스트없음",num,slug); continue
    a=tts(kv,(emo+" "+clean(ko)).strip(),f"clips/{stem}.mp3")
    b=tts(ev,(emo+" "+re.sub(r'\{[^}]*\}','',re.sub(r'<[^>]+>','',en or ''))).strip(),f"clips_en/{stem}.mp3") if ev and en else False
    if a:
        rows.append((str(num),slug,f"02_Assets/audio/voice/{stem}.mp3",f"02_Assets/audio/voice_en/{stem}.mp3" if b else "",ko)); ok+=1
        print("OK",num,slug,"KO","EN" if b else "-")
    time.sleep(0.4)
with open("voice_manifest.csv","a",encoding="utf-8",newline="") as f:
    w=csv.writer(f)
    for num,slug,clip,clip_en,tx in rows:
        w.writerow([num,slug,slug,clip,"",clip_en,"","ko",tx])
print(f"\n엔딩 영웅/일기 생성 {ok}, CSV {len(rows)}행 (num 610~{num-1})")
