# -*- coding: utf-8 -*-
p="voice_manifest.csv"
s=open(p,encoding="utf-8-sig").read().splitlines()
out=[];hit=False
for ln in s:
    if ln.startswith("541,") and "천 년 항해에서도" in ln:
        ln=ln.replace("천 년 항해에서도","1000년 항해에서도"); hit=True
    out.append(ln)
open(p,"w",encoding="utf-8",newline="").write("\n".join(out)+"\n")
print("changed" if hit else "no-match")
