# -*- coding: utf-8 -*-
# 매니페스트(SSOT) 기준 클립 파일 존재 감사. 사실만 출력.
import os,csv
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),"..",".."))
csvp="voice_manifest.csv"
rows=list(csv.reader(open(csvp,encoding="utf-8-sig")))
hdr=rows[0]; data=rows[1:]
def real(p): return os.path.join(ROOT,p.replace("/",os.sep))
total=0; ko_missing=[]; en_listed=0; en_missing=[]; en_blank=0
for r in data:
    if len(r)<9: continue
    num,ch,slug,clip,clip_f,clip_en,clip_en_f,lang,text=r[:9]
    if not num or not clip: continue
    total+=1
    if not os.path.exists(real(clip)): ko_missing.append(num+" "+clip)
    if clip_en.strip():
        en_listed+=1
        if not os.path.exists(real(clip_en)): en_missing.append(num+" "+clip_en)
    else:
        en_blank+=1
print(f"매니페스트 행(클립 보유): {total}")
print(f"KO 클립 누락: {len(ko_missing)}")
for x in ko_missing: print("  KO_MISS",x)
print(f"clip_en 지정된 행: {en_listed}  (clip_en 빈칸: {en_blank})")
print(f"EN 클립 누락(지정됐으나 파일 없음): {len(en_missing)}")
for x in en_missing: print("  EN_MISS",x)
