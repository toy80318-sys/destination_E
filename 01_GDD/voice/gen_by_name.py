# -*- coding: utf-8 -*-
# 계정 보이스를 '이름'으로 매칭해 생성. 환경변수 또는 el_key.txt 키.
import os, csv, json, time, urllib.request, sys
def _key():
    k=os.environ.get("ELEVENLABS_API_KEY","")
    if not k and os.path.exists("el_key.txt"): k=open("el_key.txt",encoding="utf-8").read().strip()
    return k
API=_key()
MODEL=os.environ.get("MODEL_ID","eleven_multilingual_v2")  # V3 태그 쓰려면 v3 모델 id로
CSV_PATH=os.environ.get("CSV_PATH","samples3.csv")
OUT=os.environ.get("OUT_DIR","byname_out")
# char_slug -> 허용 보이스 이름(부분일치). 한글 이름으로 저장하면 자동 매칭.
ALIAS={
 "commander":["사령관","데스티네이션 사령관"],
 "baekgu":["백구","조언자"],
 "yisunsin":["이순신"], "jangyeongsil":["장영실"], "gwanggaeto":["광개토"],
 "gagarin":["가가린"], "nelson":["넬슨"], "einstein":["아인슈타인"],
 "tesla":["테슬라"], "marcopolo":["마르코"], "leehwiso":["이휘소"],
 "ursamajor":["우르사"], "eisenklau":["아이젠클"], "blackfalcon":["블랙팔콘"],
 "wolfelder":["볼프"], "aori":["아오리"], "maximoff":["맥시모프","레인저"],
 "navai":["항법"], "volcan":["볼칸"], "borg":["보그"], "karim":["카림"],
 "krash":["크라쉬"], "veil":["베일"], "dorga":["도르가"],
}
def list_voices():
    req=urllib.request.Request("https://api.elevenlabs.io/v1/voices", headers={"xi-api-key":API})
    d=json.load(urllib.request.urlopen(req,timeout=30))
    return [(v.get("name",""), v.get("voice_id","")) for v in d.get("voices",[])]
def resolve(slug, voices):
    for alias in ALIAS.get(slug,[]):
        for nm,vid in voices:
            if alias and alias in nm: return vid, nm
    return None, None
def tts(vid, text, path):
    data=json.dumps({"text":text,"model_id":MODEL,"voice_settings":{"stability":0.45,"similarity_boost":0.8,"style":0.3}}).encode("utf-8")
    req=urllib.request.Request("https://api.elevenlabs.io/v1/text-to-speech/"+vid, data=data, method="POST",
        headers={"xi-api-key":API,"Content-Type":"application/json","Accept":"audio/mpeg"})
    open(path,"wb").write(urllib.request.urlopen(req,timeout=60).read())
def main():
    if not API: sys.exit("키 없음(el_key.txt 또는 ELEVENLABS_API_KEY)")
    os.makedirs(OUT,exist_ok=True)
    voices=list_voices(); print("계정 보이스",len(voices),"개")
    rows=list(csv.DictReader(open(CSV_PATH,encoding="utf-8-sig")))
    ok=0;skip=0;nomap=0;fail=0
    for r in rows:
        out=os.path.join(OUT,r["filename"])
        if os.path.exists(out): skip+=1; continue
        vid,nm=resolve(r["char_slug"],voices)
        if not vid: print("매칭 보이스 없음:",r["character"],r["char_slug"]); nomap+=1; continue
        try: tts(vid,r["text"],out); ok+=1; print("OK",r["filename"],"<-",nm)
        except Exception as e: fail+=1; print("FAIL",r["filename"],str(e)[:140])
        time.sleep(0.5)
    print(f"\n생성 {ok} / 스킵 {skip} / 매칭없음 {nomap} / 실패 {fail}")
if __name__=="__main__": main()
