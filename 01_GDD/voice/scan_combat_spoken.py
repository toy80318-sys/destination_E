# -*- coding: utf-8 -*-
# 전투/보스 이벤트 중 '대사(💬 또는 [화자])' 성격인데 음성 없는 i18n 라인 색출.
import sys,io; sys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding='utf-8')
import re,os,csv
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),"..",".."))
def real(p): return os.path.join(ROOT,p.replace("/",os.sep))
def norm(t):
    t=t or ''; t=re.sub(r'\{[^}]*\}','',t); t=re.sub(r'[\(\[\{][^\)\]\}]*[\)\]\}]','',t)
    return re.sub(r'[^가-힣A-Za-z0-9]','',t)
rows=[r for r in csv.reader(open("voice_manifest.csv",encoding="utf-8-sig")) if len(r)>=9 and r[3] and r[0]!="num"]
MK=set(norm(r[8]) for r in rows)
ko=open(os.path.join(ROOT,"i18n","ko.js"),encoding="utf-8").read()
# combat./bh./enemy./falcon. 계열 키-값
pat=re.compile(r'"((?:combat|bh|falcon|boss)\.[A-Za-z0-9_.]+)"\s*:\s*"((?:[^"\\]|\\.)*)"')
cand=[]
for k,v in pat.findall(ko):
    val=v.replace('\\n',' ')
    spoken = ('💬' in val) or re.search(r'\[(블랙팔콘|우르사|아이젠|레이든|이순신|백구|사령관)',val) or ('"' in val) or ('“' in val)
    if not spoken: continue
    # 동적/순수배너 제외
    if re.search(r'\{(nm|dmg|n|pct|cap|bp|x|mult|plv|cr|rep|tec|ring|diff|luck)\}',val): continue
    plain=re.sub(r'^[^가-힣A-Za-z]+','',val)  # 앞 이모지 제거 후 내용
    n=norm(val)
    if not n: continue
    has = n in MK
    cand.append((has,k,val[:70]))
print("=== combat/boss 대사형 i18n (음성 유무) ===")
for has,k,v in sorted(cand):
    print(("[OK]" if has else "[❌무음]"), k, "::", v)
print("\n무음 대사:",sum(1 for h,_,_ in cand if not h))
