# -*- coding: utf-8 -*-
import sys, os, json, urllib.request, importlib.util
spec=importlib.util.spec_from_file_location("stt","stt.py"); stt=importlib.util.module_from_spec(spec); spec.loader.exec_module(stt)
k=stt.key()
if not k: print("키 없음"); sys.exit(1)
slugs=sys.argv[1:]
for s in slugs:
    audio=os.path.join("src", s+".mp3"); out="stt_%s.json"%s
    if not os.path.exists(audio): print("없음", audio); continue
    try:
        r=stt.transcribe(audio, k)
        open(out,"w",encoding="utf-8").write(json.dumps(r,ensure_ascii=False))
        print("OK", s, "words", len([w for w in r.get("words",[]) if w.get("type")=="word"]))
    except Exception as e:
        print("ERR", s, str(e)[:120])
