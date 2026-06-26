# -*- coding: utf-8 -*-
# 프롤로그 장면 묘사 효과음 추가분 — ElevenLabs Sound Generation.
import sys,io; sys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding='utf-8')
import json,os,urllib.request,urllib.error,importlib.util
s=importlib.util.spec_from_file_location("stt","stt.py");m=importlib.util.module_from_spec(s);s.loader.exec_module(m);K=m.key()
H={"xi-api-key":K,"Content-Type":"application/json"}
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),"..",".."))
OUTDIR=os.path.join(ROOT,"02_Assets","audio","sfx"); os.makedirs(OUTDIR,exist_ok=True)
SFX=[
 ("prologue_ship_flyby","A large escape ship tearing up through the atmosphere into space at high speed — powerful deep engine roar, doppler whoosh as it passes, metallic hull rumble and air-rush, cinematic sci-fi launch.",6.0),
 ("prologue_lab_fire","Interior of a burning, collapsing laboratory — crackling flames, sparking shorting electronics, distant warning sirens and groaning buckling metal, tense sci-fi disaster ambience.",5.0),
 ("prologue_cryo_seal","A cryo-stasis capsule sealing and pressurizing — hydraulic hiss, a glass canopy lowering and locking, soft rising electronic hum, sci-fi.",4.0),
 ("prologue_void_fade","A faint signal dissolving into the silent void — a fragile electronic tone fading into deep cold space reverb, dwindling away to nothing, lonely.",4.0),
 ("prologue_space_ambience","Cold vast deep-space ambience — an empty low drone, faint sub-bass hum, distant metallic creaks of a derelict drifting hull, lonely and still, seamless loop.",10.0),
 ("prologue_capsule_wake","A stasis pod powering up and waking after long sleep — rising electronic hum, hatch unlocking with a hydraulic hiss and venting steam, hopeful sci-fi boot-up chime.",4.0),
 ("prologue_distant_boom","A massive explosion seen from far above in orbit — a muffled deep boom followed by a long low rumble, felt more than heard, cinematic and distant.",4.0),
]
ok=0
for name,prompt,dur in SFX:
    out=os.path.join(OUTDIR,name+".mp3")
    body={"text":prompt,"duration_seconds":dur,"prompt_influence":0.45}
    req=urllib.request.Request("https://api.elevenlabs.io/v1/sound-generation",data=json.dumps(body).encode(),headers=H,method="POST")
    try:
        open(out,"wb").write(urllib.request.urlopen(req,timeout=200).read()); print("OK",name,os.path.getsize(out),"B"); ok+=1
    except urllib.error.HTTPError as e:
        print("HTTP",name,e.code,e.read()[:200])
    except Exception as e:
        print("ERR",name,str(e)[:160])
print("\n추가 SFX",ok,"/",len(SFX),"→ 02_Assets/audio/sfx/")
