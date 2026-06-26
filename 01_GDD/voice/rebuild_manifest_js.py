# -*- coding: utf-8 -*-
# voice_manifest.csv → js/data/voice-manifest.js 재빌드 (라이브 리치 포맷 정확 복제).
# VOICE_MANIFEST[num]={clip,clip_f?,clip_en?,clip_en_f?,lang} · VOICE_BYTEXT[norm(text)]=entry
import re,csv,json,os,shutil,time
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),"..",".."))
CSV=os.path.join(ROOT,"01_GDD","voice","voice_manifest.csv")
OUT=os.path.join(ROOT,"js","data","voice-manifest.js")
def norm(t):
    t=t or ''
    t=re.sub(r'\{\s*(사령관|commander)\s*\}','사령관',t,flags=re.I)
    t=re.sub(r'[\(\[\{][^\)\]\}]*[\)\]\}]','',t)
    return re.sub(r'[^가-힣A-Za-z0-9]','',t)
EXCLUDE_NUM={'301'}  # 마르코 028 구버전(자막만)
MAN={}; BY={}
n=0; dup=0
for r in csv.reader(open(CSV,encoding="utf-8-sig")):
    if len(r)<9 or r[0]=="num": continue
    num=r[0].strip(); slug=r[2].strip(); clip=r[3].strip(); clip_f=r[4].strip()
    clip_en=r[5].strip(); clip_en_f=r[6].strip(); lang=(r[7].strip() or "ko"); text=r[8]
    if not num or not clip: continue
    e={"clip":clip}
    if clip_f: e["clip_f"]=clip_f
    if clip_en: e["clip_en"]=clip_en
    if clip_en_f: e["clip_en_f"]=clip_en_f
    e["lang"]=lang
    MAN[num]=e; n+=1
    if num in EXCLUDE_NUM: continue
    k=norm(text)
    if k and k not in BY: BY[k]=e
    elif k in BY: dup+=1
hdr="// 자동생성 — KO남=clip,KO여=clip_f,EN남=clip_en,EN여=clip_en_f. bytext=지문/토큰 제거 정규화\n"
body="window.VOICE_MANIFEST = "+json.dumps(MAN,ensure_ascii=False,separators=(',',':'))+";\n"
body+="window.VOICE_BYTEXT = "+json.dumps(BY,ensure_ascii=False,separators=(',',':'))+";\n"
# 백업 후 기록
if os.path.exists(OUT):
    shutil.copyfile(OUT, OUT+".bak_"+time.strftime("%Y%m%d%H%M%S"))
open(OUT,"w",encoding="utf-8").write(hdr+body)
print("재빌드 완료: VOICE_MANIFEST",n,"개 · VOICE_BYTEXT",len(BY),"개(중복스킵",dup,")")
print("백업:",[f for f in os.listdir(os.path.dirname(OUT)) if f.startswith("voice-manifest.js.bak")][-1:])
