# -*- coding: utf-8 -*-
# 글자수 비율 + 무음 위치로 N줄에 정렬 분할 (드리프트 방지)
import sys, csv, re, subprocess, os
audio, slug, outdir = sys.argv[1], sys.argv[2], sys.argv[3]
rows=list(csv.DictReader(open("lines.csv",encoding="utf-8-sig")))
L=[r["text"] for r in rows if r["char_slug"]==slug]
N=len(L); chars=[max(1,len(t)) for t in L]; total=sum(chars)
D=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=nk=1:nw=1',audio]).decode().strip())
out=subprocess.run(['ffmpeg','-hide_banner','-i',audio,'-af','silencedetect=noise=-33dB:d=0.28','-f','null','-'],stderr=subprocess.PIPE).stderr.decode()
sil=[];cur=None
for ln in out.splitlines():
    m=re.search(r'silence_start:\s*([0-9.]+)',ln)
    if m: cur=float(m.group(1))
    m=re.search(r'silence_end:\s*([0-9.]+)',ln)
    if m and cur is not None:
        sil.append((cur,float(m.group(1)))); cur=None
cands=sorted((s+e)/2 for s,e in sil)
# 기대 경계 = 글자수 누적 비율
exp=[D*sum(chars[:i+1])/total for i in range(N-1)]
chosen=[]
for it in range(5):
    chosen=[]; prev=0.0
    for e in exp:
        best=None; bd=1e9
        for c in cands:
            if c<=prev+0.35: continue
            dd=abs(c-e)
            if dd<bd: bd=dd; best=c
        if best is None or bd>2.5:
            best=max(e, prev+0.35)
        chosen.append(best); prev=best
    exp=[0.5*chosen[i]+0.5*(D*sum(chars[:i+1])/total) for i in range(N-1)]
os.makedirs(outdir,exist_ok=True)
for f in os.listdir(outdir):
    if f.endswith('.mp3'): os.remove(os.path.join(outdir,f))
bounds=[0]+chosen+[D]; pad=0.10
for i in range(N):
    a=max(0,bounds[i]-pad); b=min(D,bounds[i+1]+pad)
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-ss',f'{a:.3f}','-to',f'{b:.3f}','-i',audio,'-c:a','libmp3lame','-q:a','3',os.path.join(outdir,f"{slug}_{i+1:03d}.mp3")])
print(f"{slug}: {N}개(대본 동일) / 후보무음 {len(cands)} / {D:.0f}s")
