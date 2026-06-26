# -*- coding: utf-8 -*-
# 전 컷신 음성 누락 전수 점검: (1) char/name/text 컷신(KO+EN) (2) i18n sp/tx 컷신(void/ending/ursa outro)
import sys,io; sys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding='utf-8')
import os,re,csv,glob,json
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),"..",".."))
def real(p): return os.path.join(ROOT,p.replace("/",os.sep))
def norm(t):
    t=t or ''
    t=re.sub(r'\{[^}]*\}','',t)   # 모든 {토큰} 제거(이름 변수 포함)
    t=re.sub(r'[\(\[\{][^\)\]\}]*[\)\]\}]','',t)
    return re.sub(r'[^가-힣A-Za-z0-9]','',t)
# 매니페스트: KO텍스트 norm 집합 + clip/clip_en 존재맵
rows=[r for r in csv.reader(open("voice_manifest.csv",encoding="utf-8-sig")) if len(r)>=9 and r[3] and r[0]!="num"]
MK={}  # normKO -> (clipKO존재, clipEN존재)
for r in rows:
    MK[norm(r[8])]=(os.path.exists(real(r[3])), bool(r[5].strip()) and os.path.exists(real(r[5])))
def is_static(t):
    n=norm(t);
    return ('지지직' in t) or ('츠츠' in t) or ('메시지전송' in n) or ('통신수신' in n) or t.strip().startswith('─') or t.strip().startswith('-') or ('DESTINATIONEARTH' in n)
def has_name(t): return bool(re.search(r'\{(nm|cmdName|shipName|flagshipName|company|회사)\}',t))

print("="*60)
print("[1] char/name/text 컷신 (phase1~6 · story-scenes · combat)")
miss_ko=[]; miss_en=[]; tot=0
for fp in sorted(glob.glob(os.path.join(ROOT,"js","data","phase*_quests.js")))+[os.path.join(ROOT,"js","story-scenes-pc.js"),os.path.join(ROOT,"js","modules","combat.js")]:
    src=open(fp,encoding="utf-8").read()
    for mm in re.finditer(r"char:'([^']*)',\s*name:'(?:[^'\\]|\\.)*',\s*color:'[^']*',\s*text:'((?:[^'\\]|\\.)*)'",src):
        tx=mm.group(2)
        if '\\u' in tx or '\\n' in tx:
            try: tx=tx.encode().decode('unicode_escape')
            except: pass
        han=len(re.findall(r'[가-힣]',tx)); lat=len(re.findall(r'[A-Za-z]',tx))
        if han==0 and lat==0: continue
        tot+=1; n=norm(tx)
        if n not in MK:
            if han>=lat: miss_ko.append((os.path.basename(fp),tx[:46]))
            # 영문 라인은 KO 형제로 매칭되므로 별도 누락취급 안 함(브리지)
        else:
            ko_ok,en_ok=MK[n]
            if not ko_ok: miss_ko.append((os.path.basename(fp),"[clip없음]"+tx[:40]))
            if not en_ok: miss_en.append((os.path.basename(fp),tx[:46]))
print(f" 대사 {tot}개 / KO 누락 {len(miss_ko)} / EN(clip_en) 누락 {len(miss_en)}")
for f,t in miss_ko[:40]: print("   KO_MISS",f,t)
for f,t in miss_en[:40]: print("   EN_MISS",f,t)

print("="*60)
print("[2] i18n sp/tx 컷신 (void 보스 intro/outro · ending · ursa outro)")
ko=open(os.path.join(ROOT,"i18n","ko.js"),encoding="utf-8").read()
def kget(key):
    m=re.search(r'"%s"\s*:\s*"((?:[^"\\]|\\.)*)"'%re.escape(key),ko)
    return (m.group(1).encode().decode('unicode_escape') if m and '\\' in m.group(1) else (m.group(1) if m else None))
# 컷신 코드에서 I18N.t('key') 추출
keys=set()
for fp in [os.path.join(ROOT,"js","modules","quest-gen.js"),os.path.join(ROOT,"js","modules","ending-credits.js")]:
    src=open(fp,encoding="utf-8").read()
    for k in re.findall(r"I18N\.t\('([^']+)'",src): keys.add(k)
# 컷신 관련 접두만
PREF=('voidQ.','falconEnd.','falcon.','ending.','ui.')
cut=[k for k in keys if k.startswith(PREF)]
miss=[]; skip_name=[]; skip_static=[]; matched=0
for k in sorted(cut):
    t=kget(k)
    if t is None: continue
    if is_static(t): skip_static.append(k); continue
    n=norm(t)
    if not n: continue
    if has_name(t):
        # 이름 포함: 자막만 결정 — 단, manifest에 (기본호칭) 클립이 있으면 matched
        if n in MK: matched+=1
        else: skip_name.append((k,t[:40]))
        continue
    if n in MK and MK[n][0]: matched+=1
    else: miss.append((k,t[:50]))
print(f" 컷신 i18n 키 {len(cut)} / 매칭 {matched} / 이름변수(자막) {len(skip_name)} / 정적SFX {len(skip_static)} / 미매칭 {len(miss)}")
for k,t in miss: print("   I18N_MISS",k,"::",t)
print(" (참고)이름변수 자막처리:",[k for k,_ in skip_name])
print("="*60)
print("결론: KO_MISS",len(miss_ko),"/ EN_MISS",len(miss_en),"/ i18n_MISS",len(miss))
