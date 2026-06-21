# -*- coding: utf-8 -*-
# 내 ElevenLabs 계정의 보이스 목록(이름/언어/성별) 출력. 한국어 보이스 찾기용.
import os, json, urllib.request, sys
import os as _os
def _load_key():
    import os
    k=os.environ.get("ELEVENLABS_API_KEY","").strip()
    if not k and os.path.exists("el_key.txt"):
        for ln in open("el_key.txt",encoding="utf-8-sig"):
            s=ln.strip().strip('"').strip("'").strip()
            if s.lower().startswith("elevenlabs_api_key="): s=s.split("=",1)[1].strip()
            if s: k=s; break
    return k
API=_load_key()
if not API: sys.exit("ELEVENLABS_API_KEY 없음")
req=urllib.request.Request("https://api.elevenlabs.io/v1/voices", headers={"xi-api-key":API})
d=json.load(urllib.request.urlopen(req, timeout=30))
vs=d.get("voices",[])
print("총 보이스:", len(vs))
print("="*60)
for v in vs:
    lab=v.get("labels",{}) or {}
    lang=lab.get("language") or lab.get("accent") or ""
    desc=lab.get("description","")
    print(f"{v.get('name','?'):20s} | id={v.get('voice_id','')} | {lab.get('gender','')} {lang} {desc}")
# 한국어로 보이는 것 강조
print("\n[한국어 후보]")
for v in vs:
    s=(json.dumps(v.get('labels',{}),ensure_ascii=False)+v.get('name','')).lower()
    if 'korea' in s or 'ko' == (v.get('labels',{}) or {}).get('language','').lower() or '한국' in s:
        print("  ★", v.get('name'), v.get('voice_id'))
