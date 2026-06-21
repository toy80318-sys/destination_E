# -*- coding: utf-8 -*-
# ElevenLabs STT(scribe) → 단어 타임스탬프. el_key.txt 또는 env 키.
import urllib.request, urllib.error, os, sys, uuid, json
def key():
    import re
    env=os.environ.get("ELEVENLABS_API_KEY","").strip()
    if env: return env
    if not os.path.exists("el_key.txt"): return ""
    raw=open("el_key.txt",encoding="utf-8-sig").read()
    toks=[t for t in re.findall(r"[A-Za-z0-9_\-]{20,}", raw) if t.lower()!="elevenlabs_api_key"]
    return max(toks,key=len) if toks else ""
def transcribe(audio, K):
    b='----'+uuid.uuid4().hex; parts=b''
    for k,v in [('model_id','scribe_v1'),('language_code','kor'),('timestamps_granularity','word')]:
        parts+=(f'--{b}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n').encode()
    data=open(audio,'rb').read()
    parts+=(f'--{b}\r\nContent-Disposition: form-data; name="file"; filename="a.mp3"\r\nContent-Type: audio/mpeg\r\n\r\n').encode()+data+(f'\r\n--{b}--\r\n').encode()
    req=urllib.request.Request('https://api.elevenlabs.io/v1/speech-to-text', data=parts,
        headers={'xi-api-key':K,'Content-Type':f'multipart/form-data; boundary={b}'})
    return json.loads(urllib.request.urlopen(req,timeout=300).read().decode('utf-8'))
if __name__=="__main__":
    audio, outjson = sys.argv[1], sys.argv[2]
    K=key()
    if not K: sys.exit("키 없음(el_key.txt 또는 ELEVENLABS_API_KEY)")
    try:
        r=transcribe(audio,K); open(outjson,'w',encoding='utf-8').write(json.dumps(r,ensure_ascii=False))
        print("OK words", len([w for w in r.get("words",[]) if w.get("type")=="word"]))
    except urllib.error.HTTPError as e:
        print("HTTP",e.code,e.read()[:300])
