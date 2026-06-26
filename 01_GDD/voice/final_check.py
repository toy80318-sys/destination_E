# -*- coding: utf-8 -*-
import os,re,csv,glob
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),"..",".."))
def real(p): return os.path.join(ROOT,p.replace("/",os.sep))
def norm(t):
    t=t or ''; t=re.sub(r'\{\s*(사령관|commander|함선|회사|기함|nm|cmdName|shipName|flagshipName)\s*\}','',t,flags=re.I)
    t=re.sub(r'[\(\[\{][^\)\]\}]*[\)\]\}]','',t); return re.sub(r'[^가-힣A-Za-z0-9]','',t)
rows=[r for r in csv.reader(open("voice_manifest.csv",encoding="utf-8-sig")) if len(r)>=9 and r[3]]
# 1) clip_f / clip_en_f 존재
fmiss=[]
for r in rows:
    for col in (4,6):
        pass
for r in rows:
    cf=r[4].strip(); cef=r[6].strip()
    if cf and not os.path.exists(real(cf)): fmiss.append(r[0]+" "+cf)
    if cef and not os.path.exists(real(cef)): fmiss.append(r[0]+" "+cef)
print("여성 사령관 clip_f/clip_en_f 누락:",len(fmiss))
for x in fmiss: print("  F_MISS",x)
# 2) 매니페스트에 없는 컷신 대사 (char/name/text · 한글 · 이름/정적 제외)
M=set(norm(r[8]) for r in rows)
STATIC=set(["지지직츠츠","지지직치직츠츠츠지직","메시지전송끝"])
miss=[]; total=0
for fp in sorted(glob.glob(os.path.join(ROOT,"js","data","phase*_quests.js")))+[os.path.join(ROOT,"js","story-scenes-pc.js"),os.path.join(ROOT,"js","modules","combat.js")]:
    src=open(fp,encoding="utf-8").read()
    for mm in re.finditer(r"char:'([^']*)',\s*name:'(?:[^'\\]|\\.)*',\s*color:'[^']*',\s*text:'((?:[^'\\]|\\.)*)'",src):
        ch,tx=mm.group(1),mm.group(2)
        if '\\u' in tx or '\\n' in tx:
            try: tx=tx.encode().decode('unicode_escape')
            except: pass
        han=len(re.findall(r'[가-힣]',tx)); lat=len(re.findall(r'[A-Za-z]',tx))
        if han<=lat: continue   # 영문/비한글 라인 제외(영문은 EN 브리지/페어로 처리)
        total+=1
        n=norm(tx)
        if n and n not in M: miss.append((os.path.basename(fp),ch,tx[:48]))
print(f"\n한글 컷신 대사 {total}개 중 매니페스트 미등록: {len(miss)}")
for f,ch,t in miss: print(f"  MISS [{f}|{ch}] {t}")
