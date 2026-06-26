# -*- coding: utf-8 -*-
# 전 컷신 system/시스템/경보 화자 대사 ↔ 매니페스트 대조 (음성 보유/누락)
import sys,io; sys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding='utf-8')
import re,os,csv,glob
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),"..",".."))
def real(p): return os.path.join(ROOT,p.replace("/",os.sep))
def norm(t):
    t=t or ''; t=re.sub(r'\{[^}]*\}','',t); t=re.sub(r'[\(\[\{][^\)\]\}]*[\)\]\}]','',t)
    return re.sub(r'[^가-힣A-Za-z0-9]','',t)
rows=[r for r in csv.reader(open("voice_manifest.csv",encoding="utf-8-sig")) if len(r)>=9 and r[3] and r[0]!="num"]
MK={}
for r in rows: MK[norm(r[8])]=(os.path.exists(real(r[3])), bool(r[5].strip()) and os.path.exists(real(r[5])))
def is_static(t):
    n=norm(t); return ('지지직' in t) or ('츠츠' in t) or ('메시지전송' in n) or n==''
files=sorted(glob.glob(os.path.join(ROOT,"js","data","phase*_quests.js")))+[os.path.join(ROOT,"js","story-scenes-pc.js"),os.path.join(ROOT,"js","modules","combat.js"),os.path.join(ROOT,"js","modules","quest-gen.js")]
print("=== system/경보/시스템 화자 컷신 대사 점검 ===")
tot=0; miss=[]
for fp in files:
    src=open(fp,encoding="utf-8").read()
    for mm in re.finditer(r"char:'(system|nav_ai)'[^}]*?text:'((?:[^'\\]|\\.)*)'",src):
        tx=mm.group(2)
        if '\\u' in tx or '\\n' in tx:
            try: tx=tx.encode().decode('unicode_escape')
            except: pass
        # 한글만(EN 별도)
        han=len(re.findall(r'[가-힣]',tx))
        tag=''
        if is_static(tx): tag='[정적SFX·음성불요]'
        else:
            st=MK.get(norm(tx))
            if not st: tag='[❌ 매니페스트 없음]'; miss.append((os.path.basename(fp),tx[:50]))
            elif not st[0]: tag='[❌ KO클립 없음]'; miss.append((os.path.basename(fp),tx[:50]))
            elif not st[1]: tag='[△ EN클립 없음]'
            else: tag='[OK]'
        if han:
            tot+=1; print(f"  {tag} {os.path.basename(fp)} :: {tx[:54]}")
print(f"\n한글 system 대사 {tot} / 음성문제 {len(miss)}")
for f,t in miss: print("   PROBLEM",f,t)
