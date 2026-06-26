# -*- coding: utf-8 -*-
import json,os,shutil,urllib.request,importlib.util
s=importlib.util.spec_from_file_location("stt","stt.py");m=importlib.util.module_from_spec(s);s.loader.exec_module(m);K=m.key()
vid="bIHbv24MWmeRgasZH58o"  # rebel = Will
txt="[neutral] So you're the ones fighting alongside the Resistance. We, the 'Spark', are the free militia of Krieg's factory workers. My comrades are locked up inside that fortress."
out="clips_en/etc/etc_482.mp3"
b={"text":txt,"model_id":"eleven_v3","voice_settings":{"stability":0.4}}
r=urllib.request.Request("https://api.elevenlabs.io/v1/text-to-speech/"+vid+"?output_format=mp3_44100_128",
    data=json.dumps(b).encode(),headers={"xi-api-key":K,"Content-Type":"application/json"},method="POST")
open(out,"wb").write(urllib.request.urlopen(r,timeout=180).read())
dp=os.path.abspath(os.path.join(os.path.dirname(__file__),"..","..","02_Assets","audio","voice_en","etc","etc_482.mp3"))
shutil.copyfile(out,dp)
print("OK etc_482 EN regen+deploy",os.path.getsize(out),"B")
