# -*- coding: utf-8 -*-
# STT 단어 타임스탬프 ↔ 대본을 difflib 내용정합으로 정렬 후 분할
import json, csv, re, sys, os, subprocess, importlib.util, difflib
slug, sttjson, audio, outdir = sys.argv[1:5]
spec=importlib.util.spec_from_file_location("_numko","_numko.py"); nk=importlib.util.module_from_spec(spec); spec.loader.exec_module(nk)
def strip_dir(t): return re.sub(r"[\[\(\{][^\]\)\}]*[\]\)\}]","", t)
def norm(t): return re.sub(r"[^가-힣A-Za-z0-9]","", t)
rows=[r for r in csv.DictReader(open("lines.csv",encoding="utf-8-sig")) if r["char_slug"]==slug]
N=len(rows)
# 대본 char 스트림 + 각 char의 줄 index
sc=[]; sc_line=[]
for i,r in enumerate(rows):
    t=norm(nk.convert(strip_dir(r["text"])))
    for c in t: sc.append(c); sc_line.append(i)
# STT char 스트림 + 각 char의 시간(단어 start~end 보간)
words=[(w["text"],float(w["start"]),float(w["end"])) for w in json.load(open(sttjson,encoding="utf-8"))["words"] if w.get("type")=="word"]
hc=[]; hc_t=[]
for tx,st,en in words:
    cs=norm(tx); n=len(cs)
    for j,c in enumerate(cs):
        hc.append(c); hc_t.append(st+(en-st)*(j/max(1,n)))
d=json.load(open(sttjson,encoding="utf-8")); D=float(d.get("audio_duration_secs") or 0) or float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=nk=1:nw=1',audio]).decode())
# 대본 char index -> STT char index 매핑(매칭블록 + 선형보간)
sm=difflib.SequenceMatcher(None, sc, hc, autojunk=False)
s2h=[None]*len(sc)
for a,b,size in sm.get_matching_blocks():
    for k in range(size): s2h[a+k]=b+k
# 미매칭 보간
last=0
for i in range(len(sc)):
    if s2h[i] is None:
        nxt=next((s2h[j] for j in range(i+1,len(sc)) if s2h[j] is not None), len(hc)-1)
        s2h[i]=(last+nxt)//2
    last=s2h[i]
def htime(hi): hi=min(max(hi,0),len(hc_t)-1); return hc_t[hi] if hc_t else 0.0
# 각 줄의 마지막 대본 char -> STT 시간 = 경계
cuts=[]; prev=0.0
line_end_idx=[]
cur=rows  # noop
# 줄별 마지막 char 위치
ends=[]; 
for i in range(N):
    idxs=[k for k in range(len(sc_line)) if sc_line[k]==i]
    ends.append(idxs[-1] if idxs else None)
for i in range(N-1):
    e=ends[i]
    if e is None: b=prev+0.15
    else:
        t_end=htime(s2h[e]); 
        # 다음 줄 첫 char 시작과의 중점
        ns=ends[i]+1 if ends[i] is not None else None
        t_next=htime(s2h[ns]) if (ns is not None and ns<len(sc)) else t_end
        b=max((t_end+t_next)/2.0, prev+0.15)
    cuts.append(b); prev=b
bounds=[0]+cuts+[D]
os.makedirs(outdir,exist_ok=True)
for f in os.listdir(outdir):
    if f.endswith(".mp3"): os.remove(os.path.join(outdir,f))
pad=0.08
for i in range(N):
    a=max(0,bounds[i]-pad); b=min(D,bounds[i+1]+pad)
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-ss',f'{a:.3f}','-to',f'{b:.3f}','-i',audio,'-c:a','libmp3lame','-q:a','3',os.path.join(outdir,f"{slug}_{i+1:03d}.mp3")])
# 대조표(검증용): 각 줄 시간구간에 들어온 STT 단어
wmap=[]
for i in range(N):
    a,b=bounds[i],bounds[i+1]; got=[tx for tx,st,en in words if a-0.05<=st<b-0.0]
    wmap.append((i+1,rows[i]["text"]," ".join(got)))
with open(f"voice_map_{slug}.csv","w",encoding="utf-8-sig",newline="") as f:
    w=csv.writer(f); w.writerow(["clip","line_text","recognized"])
    for n,scr,rec in wmap: w.writerow([f"{slug}_{n:03d}.mp3",scr,rec])
print(f"{slug}: {N}줄 / 단어 {len(words)} / {D:.0f}s / 클립 {len(os.listdir(outdir))}개")
