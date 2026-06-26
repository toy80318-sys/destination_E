# -*- coding: utf-8 -*-
# 장영실 전체 재녹음 — JY 보이스(bQlkYuipD5BHEhntA5iz), eleven_v3, stability 0.55.
# 한국식 단위: 개=고유어(세 개), 년/%=한자식. lines.csv 27줄 + 컷신 514.
import csv,os,re,json,time,shutil,urllib.request,urllib.error,importlib.util
s=importlib.util.spec_from_file_location("stt","stt.py");m=importlib.util.module_from_spec(s);s.loader.exec_module(m);K=m.key()
nk=importlib.util.module_from_spec(importlib.util.spec_from_file_location("_numko","_numko.py"))
importlib.util.spec_from_file_location("_numko","_numko.py").loader.exec_module(nk)
H={"xi-api-key":K,"Content-Type":"application/json"}
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),"..",".."))
VID="zGjIP4SZlMnY9m93k97r"  # Hope (Clear, Relatable, Charismatic) — 연기 특화, 사용자 결정 2026-06-23
_U=['','한','두','세','네','다섯','여섯','일곱','여덟','아홉']
_T=['','열','스물','서른','마흔','쉰','예순','일흔','여든','아흔']
def native(n):
    n=int(n)
    if n<1 or n>99: return None
    return (_T[n//10]+_U[n%10]) or '열'
def clean(t):
    t=re.sub(r'\{\s*(사령관|commander)\s*\}','사령관',t,flags=re.I)
    t=re.sub(r'\{\s*함선\s*\}','함선',t); t=re.sub(r'\{\s*회사\s*\}','회사',t); t=re.sub(r'\{\s*기함\s*\}','기함',t)
    t=re.sub(r'[\(\[][^\)\]]*[\)\]]','',t)          # (지문) 제거
    # 고유어 단위: 개
    def _gae(mm):
        nv=native(mm.group(1)); return (nv+' 개') if nv else (mm.group(1)+'개')
    t=re.sub(r'×\s*(\d+)\s*개?', _gae, t)            # ×3 / ×3개 → 세 개
    t=re.sub(r'(\d+)\s*개', _gae, t)                 # 3개 → 세 개
    t=re.sub(r'\s*%',' 퍼센트', t)                    # % → 퍼센트
    return nk.convert(t).strip()                     # 나머지 숫자(년 등) 한자식
# lines.csv 27줄
rows=[r for r in csv.DictReader(open("lines.csv",encoding="utf-8-sig")) if r["char_slug"]=="jangyeongsil"]
def tts(text,out,stab=0.3):
    os.makedirs(os.path.dirname(out),exist_ok=True)
    b={"text":text,"model_id":"eleven_v3","voice_settings":{"stability":stab,"similarity_boost":0.85}}
    r=urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{VID}?output_format=mp3_44100_128",data=json.dumps(b).encode(),headers=H,method="POST")
    for a in range(4):
        try: open(out,"wb").write(urllib.request.urlopen(r,timeout=180).read()); return True
        except urllib.error.HTTPError as e:
            if e.code==429 and a<3: time.sleep(5); continue
            print("HTTP",out,e.code,e.read()[:90]); return False
    return False
ok=0
for i,r in enumerate(rows,1):
    txt=(r["emotion"]+" "+clean(r["text"])).strip()
    out=f"clips/jangyeongsil/jangyeongsil_{i:03d}.mp3"
    if tts(txt,out):
        shutil.copyfile(out,os.path.join(ROOT,"02_Assets","audio","voice","jangyeongsil",f"jangyeongsil_{i:03d}.mp3")); ok+=1
        print("OK",i,txt[:40])
    time.sleep(0.4)
# 컷신 514 (매니페스트 텍스트)
m514=None
for r in csv.reader(open("voice_manifest.csv",encoding="utf-8-sig")):
    if len(r)>=9 and r[0]=="514": m514=r[8]; break
if m514:
    txt="[cheerful] "+clean(m514)
    out="clips/jangyeongsil/jangyeongsil_514.mp3"
    if tts(txt,out):
        shutil.copyfile(out,os.path.join(ROOT,"02_Assets","audio","voice","jangyeongsil","jangyeongsil_514.mp3")); ok+=1; print("OK 514")
print(f"\n장영실 재녹음 {ok}개 (001~027 + 514). 보이스=JY {VID}")
# 기록
open("voice_ids.csv","a",encoding="utf-8").write(f"jangyeongsil_KO_Hope,{VID}\n")
