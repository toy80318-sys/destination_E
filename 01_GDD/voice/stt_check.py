# -*- coding: utf-8 -*-
# 각 클립 STT → 대본과 커버리지/끝부분 비교로 잘림 탐지
import csv,re,sys,os,importlib.util,difflib
spec=importlib.util.spec_from_file_location("stt","stt.py");stt=importlib.util.module_from_spec(spec);spec.loader.exec_module(stt)
sp2=importlib.util.spec_from_file_location("_numko","_numko.py");nk=importlib.util.module_from_spec(sp2);sp2.loader.exec_module(nk)
K=stt.key()
def sd(t):return re.sub(r"[\(\{\[][^\)\}\]]*[\)\}\]]","",t)
def nm(t):return re.sub(r"[^가-힣A-Za-z0-9]","",t)
slug=sys.argv[1]
rows=[r for r in csv.DictReader(open("lines.csv",encoding="utf-8-sig")) if r["char_slug"]==slug]
flag=[]
for i,r in enumerate(rows,1):
    f=f"clips/{slug}/{slug}_{i:03d}.mp3"
    if not os.path.exists(f):continue
    try: rec=stt.transcribe(f,K).get("text","")
    except Exception as e: print("ERR",f,str(e)[:40]); continue
    a=nm(nk.convert(sd(r["text"]))); b=nm(rec)
    cov=len(b)/len(a) if a else 1
    tail=a[-7:] if len(a)>=7 else a
    tok=difflib.SequenceMatcher(None,tail, b[-12:] if len(b)>=12 else b).ratio()
    if cov<0.72 or tok<0.34:
        flag.append((i,r["num"],cov,r["text"],rec))
        print(f"⚠ {slug}_{i:03d}(num{r['num']}) cov{cov:.0%} tail{tok:.0%}\n  대본:{r['text'][:48]}\n  인식:{rec[:48]}")
print(f"\n{slug} 잘림의심 {len(flag)}건")
