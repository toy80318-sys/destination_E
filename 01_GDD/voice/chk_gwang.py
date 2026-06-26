# -*- coding: utf-8 -*-
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
bad=[]
for base,want in [("voice","KO"),("voice_en","EN")]:
    d=os.path.join(ROOT,"02_Assets","audio",base,"gwanggaeto")
    print(f"=== {base}/gwanggaeto (기대 {want}) ===")
    for f in sorted(glob.glob(d+"/*.mp3")):
        try:
            R=tr(f);t=R.get('text','');han=len(re.findall(r'[가-힣]',t));lat=len(re.findall(r'[A-Za-z]',t));sc='KO' if han>lat else 'EN'
            flag='' if sc==want else '  <<< 섞임!'
            if sc!=want: bad.append((base,os.path.basename(f),sc))
            print(f'[{sc}] {os.path.basename(f):24} {t[:42]}{flag}')
        except Exception as e: print('ERR',os.path.basename(f),str(e)[:50])
print("\n섞인 파일:",bad if bad else "없음")
