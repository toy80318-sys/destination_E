# -*- coding: utf-8 -*-
# voice/(KO) 폴더의 num 500~548 클립 전수 STT → 영어(섞임) 탐지.
import os,re,uuid,json,glob,urllib.request,importlib.util
s=importlib.util.spec_from_file_location("stt","stt.py");m=importlib.util.module_from_spec(s);s.loader.exec_module(m);K=m.key()
def tr(f):
    b='----'+uuid.uuid4().hex;p=b''
    p+=(f'--{b}\r\nContent-Disposition: form-data; name="model_id"\r\n\r\nscribe_v1\r\n').encode()
    d=open(f,'rb').read()
    p+=(f'--{b}\r\nContent-Disposition: form-data; name="file"; filename="a.mp3"\r\nContent-Type: audio/mpeg\r\n\r\n').encode()+d+(f'\r\n--{b}--\r\n').encode()
    r=urllib.request.Request('https://api.elevenlabs.io/v1/speech-to-text',data=p,headers={'xi-api-key':K,'Content-Type':'multipart/form-data; boundary='+b})
    return json.loads(urllib.request.urlopen(r,timeout=120).read().decode())
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),"..",".."))
mixed=[]
for f in sorted(glob.glob(os.path.join(ROOT,"02_Assets","audio","voice","*","*.mp3"))):
    bn=os.path.basename(f); mnum=re.search(r'_(\d{3})\.mp3$',bn)
    if not mnum: continue
    n=int(mnum.group(1))
    if n<500 or n>548: continue
    try:
        R=tr(f);t=R.get('text','');han=len(re.findall(r'[가-힣]',t));lat=len(re.findall(r'[A-Za-z]',t));sc='KO' if han>=lat else 'EN'
        if sc=='EN':
            slug=os.path.basename(os.path.dirname(f)); mixed.append((slug,n,bn)); print(f'[EN섞임] {slug}/{bn}  {t[:46]}')
    except Exception as e: print('ERR',bn,str(e)[:50])
print("\n섞인(영어가 KO폴더) 클립:",[f"{s}/{n}" for s,n,_ in mixed] or "없음")
