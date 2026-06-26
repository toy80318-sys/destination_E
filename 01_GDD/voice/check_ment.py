# -*- coding: utf-8 -*-
import sys,io; sys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding='utf-8')
import re,os,csv
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),"..",".."))
def real(p): return os.path.join(ROOT,p.replace("/",os.sep))
def norm(t):
    t=t or ''; t=re.sub(r'\{[^}]*\}','',t); t=re.sub(r'[\(\[\{][^\)\]\}]*[\)\]\}]','',t)
    return re.sub(r'[^가-힣A-Za-z0-9]','',t)
rows=[r for r in csv.reader(open("voice_manifest.csv",encoding="utf-8-sig")) if len(r)>=9 and r[3] and r[0]!="num"]
MK={}
for r in rows: MK[norm(r[8])]=(os.path.exists(real(r[3])), bool(r[5].strip()) and os.path.exists(real(r[5])))
ko=open(os.path.join(ROOT,"i18n","ko.js"),encoding="utf-8").read()
en=open(os.path.join(ROOT,"i18n","en.js"),encoding="utf-8").read()
def kval(s,key):
    m=re.search(r'"%s"\s*:\s*"((?:[^"\\]|\\.)*)"'%re.escape(key),s)
    if not m: return None
    return m.group(1).replace('\\n',' ').replace('\\"','"')

print("===[A] 전투후 멘트 계열 i18n 전수 점검===")
# 멘트 계열 키 모두 추출(combat.js에서 쓰는 후멘트 + i18n에 존재하는 변형 전부)
fam_keys=sorted(set(re.findall(r'"(combat\.(?:enemyRegret|enemyFlee|merchantThanks|scientistThanks|allyMent|enemyMent|victoryMent|pirate\w*)\d*)"', ko)))
# 혹시 다른 접두의 멘트도
fam_keys+=sorted(set(re.findall(r'"((?:cb|enemy|ally|victory|win)\.[a-zA-Z]*(?:flee|regret|thanks|ment|taunt|win|victory)\w*)"', ko, re.I)))
fam_keys=sorted(set(fam_keys))
miss=[]
for k in fam_keys:
    t=kval(ko,k)
    if not t: continue
    n=norm(t); st=MK.get(n)
    ko_ok = st[0] if st else False
    en_ok = st[1] if st else False
    tag = "OK" if (ko_ok and en_ok) else ("KO만" if ko_ok else "없음")
    if not (ko_ok and en_ok): miss.append((k,tag,t[:42]))
    print(f"  [{tag}] {k}  {t[:42]}")
print("멘트 계열 키:",len(fam_keys),"/ 음성 불완전:",len(miss))

print("\n===[B] 500~523 컷신 보강분 KO/EN 클립 존재===")
b_ko=[]; b_en=[]
for r in rows:
    if r[0].isdigit() and 500<=int(r[0])<=523:
        if not os.path.exists(real(r[3])): b_ko.append(r[0])
        if r[5].strip() and not os.path.exists(real(r[5])): b_en.append(r[0])
print("500~523 KO 누락:",b_ko or "없음")
print("500~523 EN 누락:",b_en or "없음")
print("524~529 행 존재?:", [r[0] for r in rows if r[0] in ('524','525','526','527','528','529')] or "없음(정상 삭제됨)")
