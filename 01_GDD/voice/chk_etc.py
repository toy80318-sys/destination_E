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
for base in [r'..\..\02_Assets\audio\voice_en\etc', r'..\..\02_Assets\audio\voice_en\navai', r'..\..\02_Assets\audio\voice_en\rebel']:
    if not os.path.isdir(base): continue
    print("===",base,"===")
    for f in sorted(glob.glob(base+r'\*.mp3')):
        try:
            R=tr(f);t=R.get('text','');han=len(re.findall(r'[가-힣]',t));lat=len(re.findall(r'[A-Za-z]',t));sc='KO' if han>lat else 'EN'
            print(f'[{sc}|{R.get("language_code","")}] {os.path.basename(f):16} {t[:46]}')
        except Exception as e:
            print('ERR',os.path.basename(f),str(e)[:60])
