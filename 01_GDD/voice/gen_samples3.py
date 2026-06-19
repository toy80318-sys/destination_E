# -*- coding: utf-8 -*-
# ElevenLabs 샘플 생성 (stdlib만 사용). 환경변수 ELEVENLABS_API_KEY 필요.
import os, csv, json, time, urllib.request, sys
from _numko import convert
def _get_key():
    k=os.environ.get("ELEVENLABS_API_KEY","")
    if k: return k
    try:
        import winreg
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER,"Environment") as r:
            v,_=winreg.QueryValueEx(r,"ELEVENLABS_API_KEY"); return v
    except Exception: return ""
API = _get_key()
MODEL = "eleven_multilingual_v2"   # 한국어 지원
OUT = "samples3_out"
# char_slug -> ElevenLabs 기본(프리빌트) voice_id
VOICE = {
 "commander":"pNInz6obpgDQGcFmaJgB",  # Adam
 "baekgu":"yoZ06aMxZJJ28mfd3POQ",     # Sam
 "yisunsin":"VR6AewLTigWG4xSOukaG",   # Arnold
 "marcopolo":"ErXwobaYiN019PkySvjV",  # Antoni
 "gagarin":"TX3LPaxmHKxFdv7VOQHJ",    # Liam
 "jangyeongsil":"GBv7mTt0atIp3Br8iCZE", # Thomas
 "gwanggaeto":"pqHfZKP75CvOlQylNhV4", # Bill
 "tesla":"bVMeCyTHy58xNoL34h3p",      # Jeremy
 "nelson":"JBFqnCBsd6RMkjVDRZzb",     # George
 "einstein":"onwK4e9ZLuTAKqWW03F9",   # Daniel
 "leehwiso":"nPczCjzI2devNBz1zQrb",   # Brian
 "ursamajor":"N2lVS1w4EtoT3dr4eOWO",  # Callum
 "eisenklau":"2EiwWnXFnvU5JabPnv8n",  # Clyde
 "blackfalcon":"29vD33N1CtxCmqQRPOHJ",# Drew
 "wolfelder":"JBFqnCBsd6RMkjVDRZzb",  # George
 "aori":"ODq5zmih8GrVes37Dizd",       # Patrick
 "maximoff":"5Q0t7uMcjvnagumLfvZi",   # Paul
 "navai":"nPczCjzI2devNBz1zQrb",      # Brian
 "volcan":"pqHfZKP75CvOlQylNhV4",     # Bill
 "borg":"2EiwWnXFnvU5JabPnv8n",       # Clyde
 "karim":"ErXwobaYiN019PkySvjV",      # Antoni
 "krash":"N2lVS1w4EtoT3dr4eOWO",      # Callum
 "veil":"onwK4e9ZLuTAKqWW03F9",       # Daniel
 "dorga":"2EiwWnXFnvU5JabPnv8n",      # Clyde
}
def tts(voice_id, text, path):
    url = "https://api.elevenlabs.io/v1/text-to-speech/" + voice_id
    data = json.dumps({"text": text, "model_id": MODEL,
        "voice_settings": {"stability":0.4,"similarity_boost":0.8,"style":0.3}}).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST", headers={
        "xi-api-key": API, "Content-Type":"application/json", "Accept":"audio/mpeg"})
    with urllib.request.urlopen(req, timeout=60) as r:
        b = r.read()
    open(path,"wb").write(b); return len(b)

def main():
    if not API: sys.exit("ELEVENLABS_API_KEY 없음")
    os.makedirs(OUT, exist_ok=True)
    rows = list(csv.DictReader(open("samples3.csv", encoding="utf-8-sig")))
    ok=0; fail=0
    for r in rows:
        out = os.path.join(OUT, r["filename"])
        if os.path.exists(out): print("skip", r["filename"]); ok+=1; continue
        vid = VOICE.get(r["char_slug"])
        if not vid: print("no voice", r["char_slug"]); fail+=1; continue
        try:
            n = tts(vid, convert(r["text"]), out)
            ok+=1; print("OK", r["filename"], r["character"], n, "bytes")
        except Exception as e:
            fail+=1; print("FAIL", r["filename"], str(e)[:160])
        time.sleep(0.5)
    print("\n완료 생성/스킵", ok, "실패", fail)

if __name__ == "__main__": main()
