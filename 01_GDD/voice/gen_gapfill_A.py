# -*- coding: utf-8 -*-
# 누락분 A: 백구 전설/신화 멘트 6 + 601~609 보스 아웃트로 (KO+EN, 607~609 여성사령관 포함).
import json,os,shutil,time,urllib.request,urllib.error,importlib.util
s=importlib.util.spec_from_file_location("stt","stt.py");m=importlib.util.module_from_spec(s);s.loader.exec_module(m);K=m.key()
H={"xi-api-key":K,"Content-Type":"application/json"}
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),"..",".."))
# 계정 보이스 → 우르사 KO 해석
voices=[(v.get("name",""),v.get("voice_id","")) for v in json.load(urllib.request.urlopen(urllib.request.Request("https://api.elevenlabs.io/v1/voices",headers={"xi-api-key":K}),timeout=30)).get("voices",[])]
def acc(alias,fb):
    for nm,vid in voices:
        if alias in nm: return vid
    return fb
URSA_KO=acc("우르사","HtX6ldi13wWkUMIZD7Xq")
print("URSA_KO",URSA_KO)
BK_KO="m8ZvjfA66O7ipbXTTQ4Y"; BK_EN="cjVigY5qzO86Huf0OWal"
CM_KO="MpbDJfQJUYUnp0i1QvOZ"; CM_EN="TX3LPaxmHKxFdv7VOQHJ"
CMF_KO="xi3rF0t7dg7uN2M0WUhr"; CMF_EN="Xb7hH8MSUJpSbSDYk0k2"
URSA_EN="HtX6ldi13wWkUMIZD7Xq"
def tts(vid,text,rel,stab=0.4):
    out=rel; os.makedirs(os.path.dirname(out),exist_ok=True)
    b={"text":text,"model_id":"eleven_v3","voice_settings":{"stability":stab}}
    r=urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{vid}?output_format=mp3_44100_128",data=json.dumps(b).encode(),headers=H,method="POST")
    for a in range(4):
        try:
            open(out,"wb").write(urllib.request.urlopen(r,timeout=180).read())
            # deploy: clips/.. -> 02_Assets/audio/voice/..  ;  clips_en/.. -> voice_en/..
            if rel.startswith("clips_en/"): dp=os.path.join(ROOT,"02_Assets","audio","voice_en",rel[len("clips_en/"):])
            else: dp=os.path.join(ROOT,"02_Assets","audio","voice",rel[len("clips/"):])
            dp=dp.replace("/",os.sep); os.makedirs(os.path.dirname(dp),exist_ok=True); shutil.copyfile(out,dp)
            return True
        except urllib.error.HTTPError as e:
            if e.code==429 and a<3: time.sleep(5); continue
            print("HTTP",rel,e.code,e.read()[:80]); return False
    return False
# (voice_ko, voice_en, ko_text, en_text, fname_stem, [voice_kof, voice_enf])
JOBS=[
 (BK_KO,BK_EN,"[excited] 사령관, 전설급 크루예요! 이런 인재는 좀처럼 만나기 힘들어요 — 꼭 영입하세요!","[excited] Commander, a legendary crew member! Talent like this is rare — you must recruit them!","baekgu/crew_legendary_1"),
 (BK_KO,BK_EN,"[excited] 전설의 크루가 우리 함대에 합류했어요! 사령관, 큰 전력이 될 거예요.","[excited] A legendary crew member has joined our fleet! Commander, they'll be a huge asset.","baekgu/crew_legendary_2"),
 (BK_KO,BK_EN,"[cheerful] 전설급 파츠예요! 정비소에서 장착하면 함선이 확 달라질 거예요.","[cheerful] A legendary part! Install it at the workshop and your ship will transform.","baekgu/get_legendPart"),
 (BK_KO,BK_EN,"[awed] 신화급 파츠라니…! 이건 정말 귀한 거예요, 사령관. 최고의 한 방이 되겠어요.","[awed] A mythic part…! This is truly precious, Commander. It'll be your finest edge.","baekgu/get_mythicPart"),
 (BK_KO,BK_EN,"[excited] 전설급 함선을 손에 넣었어요! 함대의 핵심이 될 거예요.","[excited] We've acquired a legendary ship! It'll become the core of the fleet.","baekgu/get_legendShip"),
 (BK_KO,BK_EN,"[awed] 신화급 함선…! 믿기지 않아요, 사령관. 이 정도면 전설을 새로 쓰는 거예요.","[awed] A mythic ship…! I can't believe it, Commander. This rewrites the legend.","baekgu/get_mythicShip"),
 (URSA_KO,URSA_EN,"[weak] 불가능... 한낱 인간들의 함대가... 100년의 봉인을... 깨버렸단 말인가...","[weak] Impossible... a mere fleet of humans... has shattered... a century's seal...?","ursamajor/ursamajor_outro_1"),
 (URSA_KO,URSA_EN,"[weak] 크윽... 인정하지... 너희에게는 — 우리가 갖지 못한 그 무엇이 있었다...","[weak] Khh... I admit it... you possessed something we never had...","ursamajor/ursamajor_outro_2"),
 (URSA_KO,URSA_EN,"[weak] 고향으로... 돌아가야 할 이유. 인류의... 그 강한 의지... 그것이 우리를... 무너뜨렸다...","[weak] A reason to return home. Humanity's fierce will... that is what brought us down...","ursamajor/ursamajor_outro_3"),
 (BK_KO,BK_EN,"[excited] 사령관!! 해냈어! 진짜로 해냈어!! 100년이야, 100년!! 폐지 줍던 내가 이 순간을 보다니!!","[excited] Commander!! We did it! We really did it!! A hundred years — a hundred years!! To think a scrap-picker like me would see this moment!!","baekgu/baekgu_outro_victory1"),
 (BK_KO,BK_EN,"[moved] 지구 봉쇄가 풀린다! 통신 신호가 들어와! 가족들이... 사람들이... 다시 별을 본대!","[moved] The blockade on Earth is lifting! Signals are coming through! Families, people — they can see the stars again!","baekgu/baekgu_outro_bk"),
 (BK_KO,BK_EN,"[excited] 사령관! 우리 진짜 영웅이야! 100년 만에 자유로워진 지구가 우리 사령관을 부르고 있어!","[excited] Commander! We're true heroes! Earth, free after a hundred years, is calling for our Commander!","baekgu/baekgu_outro_victory2"),
]
COMMANDER=[  # 607~609: 남(commander) + 여(commander_f)
 ("[resolute] 드디어 끝났다. 100년의 침묵, 100년의 굴종 — 오늘 우리 손으로 청산했다.","[resolute] At last, it's over. A century of silence, a century of submission — today we settled it with our own hands.","commander_outro_1"),
 ("[warm] 고생했다, 전 함대. 영웅들, 크루들 — 너희 모두의 이름은 인류 역사에 영원히 새겨질 것이다.","[warm] Well done, all fleets. Heroes, crews — every one of your names will be etched forever in human history.","commander_outro_2"),
 ("[resolute] 우리는 인류의 길을 열었다. 이제부터 별들은 우리의 친구다 — 그리고 지구는, 영원히 자유다.","[resolute] We have opened the path for humanity. From now the stars are our friends — and Earth is free, forever.","commander_outro_3"),
]
ok=0
for vko,ven,ko,en,stem in JOBS:
    if tts(vko,ko,f"clips/{stem}.mp3"): ok+=1
    if tts(ven,en,f"clips_en/{stem}.mp3"): ok+=1
    print("done",stem)
for ko,en,stem in COMMANDER:
    if tts(CM_KO,ko,f"clips/commander/{stem}.mp3"): ok+=1
    if tts(CM_EN,en,f"clips_en/commander/{stem}.mp3"): ok+=1
    _fstem="commander_f_"+stem[len("commander_"):]   # commander_outro_1 -> commander_f_outro_1
    if tts(CMF_KO,ko,f"clips/commander_f/{_fstem}.mp3"): ok+=1
    if tts(CMF_EN,en,f"clips_en/commander_f/{_fstem}.mp3"): ok+=1
    print("done",stem,"(+f)")
print("\nA 생성 클립:",ok)
