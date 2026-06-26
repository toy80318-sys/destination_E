# -*- coding: utf-8 -*-
# 각 캐릭터 폴더에서 표본 클립을 STT(자동언어)로 받아 스크립트(한글/영문) 판별 → 폴더 언어 일치 점검.
import os,re,sys,uuid,json,urllib.request,urllib.error,importlib.util,glob
spec=importlib.util.spec_from_file_location("stt","stt.py");stt=importlib.util.module_from_spec(spec);spec.loader.exec_module(stt)
K=stt.key()
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),"..",".."))
def transcribe(audio):
    b='----'+uuid.uuid4().hex; parts=b''
    for k,v in [('model_id','scribe_v1'),('timestamps_granularity','word')]:  # language_code 생략 → 자동감지
        parts+=(f'--{b}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n').encode()
    data=open(audio,'rb').read()
    parts+=(f'--{b}\r\nContent-Disposition: form-data; name="file"; filename="a.mp3"\r\nContent-Type: audio/mpeg\r\n\r\n').encode()+data+(f'\r\n--{b}--\r\n').encode()
    req=urllib.request.Request('https://api.elevenlabs.io/v1/speech-to-text',data=parts,
        headers={'xi-api-key':K,'Content-Type':f'multipart/form-data; boundary={b}'})
    return json.loads(urllib.request.urlopen(req,timeout=120).read().decode('utf-8'))
def script_of(t):
    han=len(re.findall(r'[가-힣]',t)); lat=len(re.findall(r'[A-Za-z]',t))
    if han>lat: return 'KO'
    if lat>han: return 'EN'
    return '?'
def sample(base):  # base: voice or voice_en — 폴더별 첫 클립 1개
    res={}
    for d in sorted(glob.glob(os.path.join(ROOT,"02_Assets","audio",base,"*"))):
        if not os.path.isdir(d): continue
        mp3=sorted(glob.glob(os.path.join(d,"*.mp3")))
        if not mp3: continue
        f=mp3[0]
        try:
            r=transcribe(f); txt=r.get("text","")
            res[os.path.basename(d)]=(script_of(txt),r.get("language_code",""),os.path.basename(f),txt[:40])
        except Exception as e:
            res[os.path.basename(d)]=("ERR","",os.path.basename(f),str(e)[:60])
    return res
expect = sys.argv[1] if len(sys.argv)>1 else "voice_en"  # 점검 대상 폴더
want = "EN" if expect=="voice_en" else "KO"
print(f"=== {expect} 폴더 표본 점검 (기대: {want}) ===")
bad=[]
for slug,(sc,lc,fn,txt) in sample(expect).items():
    flag="" if sc==want else "  <<< 불일치!"
    if sc!=want and sc!="ERR": bad.append(slug)
    print(f"[{sc:2}|{lc:3}] {slug:14} {fn:24} {txt}{flag}")
print("\n불일치 폴더:",bad if bad else "없음")
