# -*- coding: utf-8 -*-
# 누락분 B: 500~517 EN 클립. KO 라인을 phase/story 병렬 EN과 매칭해 EN 텍스트 확보 → 캐릭터 EN 보이스로 생성.
import json,os,re,csv,glob,shutil,time,urllib.request,urllib.error,importlib.util
s=importlib.util.spec_from_file_location("stt","stt.py");m=importlib.util.module_from_spec(s);s.loader.exec_module(m);K=m.key()
H={"xi-api-key":K,"Content-Type":"application/json"}
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),"..",".."))
EN=json.load(open("casting_en.json",encoding="utf-8"))
def env(slug): return (EN.get(slug) or {}).get("voice")
def norm(t):
    t=t or ''; t=re.sub(r'\{[^}]*\}','',t); t=re.sub(r'[\(\[\{][^\)\]\}]*[\)\]\}]','',t); return re.sub(r'[^가-힣A-Za-z0-9]','',t)
# KO_norm -> EN 텍스트 맵 (phase 병렬 + story 병렬)
KO2EN={}
def pair(src):
    ko=re.findall(r"char:'[^']*',\s*name:'(?:[^'\\]|\\.)*',\s*color:'[^']*',\s*text:'((?:[^'\\]|\\.)*)'",src)
    return ko
for fp in sorted(glob.glob(os.path.join(ROOT,"js","data","phase*_quests.js")))+[os.path.join(ROOT,"js","story-scenes-pc.js")]:
    src=open(fp,encoding="utf-8").read()
    # KO 블록과 EN 블록을 분리(_KO / _EN 또는 PHASE..KO/EN). 단순화: 모든 text를 순서 리스트로 뽑고
    # 한글 텍스트 다음에 오는 동일 인덱스 영문을 못 맞추므로, scene 사전 기반으로 매칭.
    # 대안: KO 텍스트와 EN 텍스트를 각각 모으고, KO i번째 ↔ EN i번째 (병렬 구조 가정)
    blocks=re.split(r'_CUTSCENES_EN|_EN\s*=', src)
    # 간단·견고: 파일 전체에서 (KO텍스트, 바로 뒤 같은 위치 EN텍스트) 쌍을 scene 키로 매칭하기 어려워
    # → 텍스트만 순서대로 모아 한글/영문 분리 후, 같은 char 시퀀스로 짝짓기 생략하고 직접 사전 사용.
    pass
# 더 견고한 방법: 각 phase 파일의 *_KO / *_EN 객체를 정규식으로 분리하여 같은 씬키·인덱스로 매칭
def build_map(src):
    mp={}
    ko_obj=re.search(r'CUTSCENES_KO\s*=\s*\{(.*?)\n\s*\}\s*;', src, re.S)
    en_obj=re.search(r'CUTSCENES_EN\s*=\s*\{(.*?)\n\s*\}\s*;', src, re.S)
    if not ko_obj or not en_obj: return mp
    def scenes(body):
        d={}
        for sm in re.finditer(r'([A-Za-z0-9_]+)\s*:\s*\[(.*?)\]\s*,?', body, re.S):
            sid=sm.group(1); txts=re.findall(r"text:'((?:[^'\\]|\\.)*)'", sm.group(2))
            d[sid]=txts
        return d
    ko=scenes(ko_obj.group(1)); en=scenes(en_obj.group(1))
    for sid in ko:
        if sid in en:
            for i,kt in enumerate(ko[sid]):
                if i<len(en[sid]):
                    kt2=kt.encode().decode('unicode_escape') if '\\' in kt else kt
                    et2=en[sid][i]; et2=et2.encode().decode('unicode_escape') if '\\' in et2 else et2
                    mp[norm(kt2)]=et2
    return mp
for fp in sorted(glob.glob(os.path.join(ROOT,"js","data","phase*_quests.js"))):
    KO2EN.update(build_map(open(fp,encoding="utf-8").read()))
# story-scenes-pc: SCENES_KO / SCENES_EN 또는 배열쌍 — 같은 빌더 시도
KO2EN.update(build_map(open(os.path.join(ROOT,"js","story-scenes-pc.js"),encoding="utf-8").read()))
print("KO2EN 매핑:",len(KO2EN))
# manifest 500~517
rows=[r for r in csv.reader(open("voice_manifest.csv",encoding="utf-8-sig")) if len(r)>=9 and r[0].isdigit() and 500<=int(r[0])<=517]
def tts(vid,text,rel):
    os.makedirs(os.path.dirname(rel),exist_ok=True)
    b={"text":text,"model_id":"eleven_v3","voice_settings":{"stability":0.4}}
    r=urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{vid}?output_format=mp3_44100_128",data=json.dumps(b).encode(),headers=H,method="POST")
    for a in range(4):
        try:
            open(rel,"wb").write(urllib.request.urlopen(r,timeout=180).read())
            dp=os.path.join(ROOT,"02_Assets","audio","voice_en",rel[len("clips_en/"):]).replace("/",os.sep)
            os.makedirs(os.path.dirname(dp),exist_ok=True); shutil.copyfile(rel,dp); return True
        except urllib.error.HTTPError as e:
            if e.code==429 and a<3: time.sleep(5); continue
            print("HTTP",rel,e.code,e.read()[:80]); return False
    return False
ok=0; nomap=[]
for r in rows:
    num,ch,slug=r[0],r[1],r[2]; ko=r[8]
    et=KO2EN.get(norm(ko))
    vid=env(slug)
    if not et: nomap.append((num,slug,ko[:34])); continue
    if not vid: print("EN보이스없음",slug); continue
    if tts(vid,et,f"clips_en/{slug}/{slug}_{num}.mp3"): ok+=1; print("EN OK",num,slug)
    time.sleep(0.4)
print(f"\nB EN 생성 {ok}/{len(rows)}")
if nomap:
    print("EN 텍스트 매칭 실패:")
    for n,sl,t in nomap: print("  ",n,sl,t)
