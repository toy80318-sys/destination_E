# -*- coding: utf-8 -*-
# 컷신 누락 대사(매니페스트에 없는 한글 대사) 일괄 생성. KO 우선.
# 각 캐릭터의 기존 계정 보이스(이름매칭)로 생성 → clips/<slug>/<slug>_<num>.mp3 + 02_Assets 배포 + CSV 행.
import re,csv,json,os,time,shutil,urllib.request,urllib.error,importlib.util
spec=importlib.util.spec_from_file_location("stt","stt.py");stt=importlib.util.module_from_spec(spec);spec.loader.exec_module(stt)
nk=importlib.util.module_from_spec(importlib.util.spec_from_file_location("_numko","_numko.py"))
importlib.util.spec_from_file_location("_numko","_numko.py").loader.exec_module(nk)
K=stt.key(); H={"xi-api-key":K,"Content-Type":"application/json"}
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),"..",".."))

CHAR2SLUG={"hero01":"yisunsin","hero02":"jangyeongsil","hero03":"gwanggaeto","hero04":"gagarin",
 "hero05":"nelson","hero06":"einstein","hero07":"tesla","hero08":"marcopolo","hero09":"leehwiso",
 "commander":"commander","maximov":"maximoff"}
def slug_of(ch):
    if ch.startswith("baekgu"): return "baekgu"
    return CHAR2SLUG.get(ch)
ALIAS={"commander":["사령관"],"baekgu":["백구","조언자"],"yisunsin":["이순신"],"jangyeongsil":["장영실"],
 "gwanggaeto":["광개토"],"gagarin":["가가린"],"nelson":["넬슨"],"einstein":["아인슈타인"],"tesla":["테슬라"],
 "marcopolo":["마르코"],"leehwiso":["이휘소"],"maximoff":["맥시모프","레인저"]}
# 계정 보이스 해석
req=urllib.request.Request("https://api.elevenlabs.io/v1/voices",headers={"xi-api-key":K})
voices=[(v.get("name",""),v.get("voice_id","")) for v in json.load(urllib.request.urlopen(req,timeout=30)).get("voices",[])]
# 확정 보이스(기록 우선) — 이름매칭 실패 대비
FIXED={"commander":"MpbDJfQJUYUnp0i1QvOZ","baekgu":"m8ZvjfA66O7ipbXTTQ4Y",
 "yisunsin":"Uzazy4zhKPfGGeuptGj0"}
def resolve(slug):
    if slug in FIXED: return FIXED[slug]
    for a in ALIAS.get(slug,[]):
        for nm,vid in voices:
            if a and a in nm: return vid
    return None
def norm(t):
    t=t or ''; t=re.sub(r'\{\s*(사령관|commander|함선|회사|기함)\s*\}','',t,flags=re.I)
    t=re.sub(r'[\(\[\{][^\)\]\}]*[\)\]\}]','',t); return re.sub(r'[^가-힣A-Za-z0-9]','',t)
def clean(t):  # TTS 낭독용
    t=re.sub(r'\{\s*(사령관|commander)\s*\}','사령관',t,flags=re.I)
    t=re.sub(r'\{\s*(함선)\s*\}','함선',t); t=re.sub(r'\{\s*(회사)\s*\}','회사',t); t=re.sub(r'\{\s*(기함)\s*\}','기함',t)
    t=re.sub(r"[\(\[][^\)\]]*[\)\]]","",t)
    t=re.sub(r"×\s*(\d+)",r"\1개",t)
    return nk.convert(t).strip()
# 매니페스트 텍스트 집합
M=set()
for row in csv.reader(open("voice_manifest.csv",encoding="utf-8-sig")):
    if len(row)>=9: M.add(norm(row[-1]))
# 누락 KO 대사 수집
missing=[]
for fn in ["../../js/data/phase1_quests.js","../../js/data/phase2_quests.js","../../js/data/phase3_quests.js",
 "../../js/data/phase4_quests.js","../../js/data/phase5_quests.js","../../js/data/phase6_quests.js","../../js/story-scenes-pc.js"]:
    src=open(fn,encoding="utf-8").read()
    for m in re.finditer(r"char:'([^']*)',\s*name:'(?:[^'\\]|\\.)*',\s*color:'[^']*',\s*text:'((?:[^'\\]|\\.)*)'",src):
        ch,tx=m.group(1),m.group(2)
        if '\\u' in tx or '\\n' in tx:
            try: tx=tx.encode().decode('unicode_escape')
            except: pass
        if not re.search(r'[가-힣]',tx): continue
        if norm(tx) in M: continue
        sl=slug_of(ch)
        if not sl: print("slug?",ch); continue
        missing.append((sl,tx))
# 중복 제거(같은 정규화 텍스트)
seen=set(); uniq=[]
for sl,tx in missing:
    n=norm(tx)
    if n in seen: continue
    seen.add(n); uniq.append((sl,tx))
print("생성 대상:",len(uniq),"개")
num=500; rows=[]; ok=fail=0
for sl,tx in uniq:
    vid=resolve(sl)
    if not vid: print("보이스없음",sl,tx[:30]); fail+=1; num+=1; continue
    body={"text":"[solemn] "+clean(tx) if sl in ("yisunsin","gwanggaeto","nelson") else clean(tx),
          "model_id":"eleven_v3","voice_settings":{"stability":0.4}}
    out=f"clips/{sl}/{sl}_{num}.mp3"; os.makedirs(os.path.dirname(out),exist_ok=True)
    r=urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{vid}?output_format=mp3_44100_128",
        data=json.dumps(body).encode(),headers=H,method="POST")
    done=False
    for a in range(4):
        try:
            open(out,"wb").write(urllib.request.urlopen(r,timeout=180).read()); done=True; break
        except urllib.error.HTTPError as e:
            if e.code==429 and a<3: time.sleep(5); continue
            print("HTTP",out,e.code,e.read()[:100]); break
    if done:
        dp=os.path.join(ROOT,"02_Assets","audio","voice",sl,f"{sl}_{num}.mp3")
        os.makedirs(os.path.dirname(dp),exist_ok=True); shutil.copyfile(out,dp)
        rows.append((str(num),sl,f"02_Assets/audio/voice/{sl}/{sl}_{num}.mp3",tx)); ok+=1; print("OK",out)
    else: fail+=1
    num+=1; time.sleep(0.6)
# CSV append
with open("voice_manifest.csv","a",encoding="utf-8",newline="") as f:
    w=csv.writer(f)
    for num_s,sl,clip,tx in rows:
        clip_en=clip.replace("/voice/","/voice_en/")
        w.writerow([num_s,sl,sl,clip,"",clip_en,"","ko",tx])
print(f"\n생성 {ok} / 실패 {fail} / CSV행 {len(rows)} (num 500~{num-1})")
print("※ EN 클립은 미생성 — 컷신 EN 브리지/스토리씬 vid 배선은 Coder. KO 우선 적용.")
