# -*- coding: utf-8 -*-
import os,shutil,csv
root=os.path.abspath(os.path.join(os.path.dirname(__file__),"..",".."))
vd=os.path.join(root,"01_GDD","voice")
pairs=[
 ("clips/navai/navai_492.mp3","02_Assets/audio/voice/navai/navai_492.mp3"),
 ("clips/navai/navai_493.mp3","02_Assets/audio/voice/navai/navai_493.mp3"),
 ("clips/navai/navai_494.mp3","02_Assets/audio/voice/navai/navai_494.mp3"),
 ("clips/commander/commander_495.mp3","02_Assets/audio/voice/commander/commander_495.mp3"),
 ("clips/baekgu/baekgu_496.mp3","02_Assets/audio/voice/baekgu/baekgu_496.mp3"),
 ("clips/baekgu/baekgu_497.mp3","02_Assets/audio/voice/baekgu/baekgu_497.mp3"),
 ("clips/baekgu/baekgu_498.mp3","02_Assets/audio/voice/baekgu/baekgu_498.mp3"),
 ("clips/yisunsin/yisunsin_499.mp3","02_Assets/audio/voice/yisunsin/yisunsin_499.mp3"),
 ("clips_en/navai/navai_492.mp3","02_Assets/audio/voice_en/navai/navai_492.mp3"),
 ("clips_en/navai/navai_493.mp3","02_Assets/audio/voice_en/navai/navai_493.mp3"),
 ("clips_en/navai/navai_494.mp3","02_Assets/audio/voice_en/navai/navai_494.mp3"),
 ("clips_en/commander/commander_495.mp3","02_Assets/audio/voice_en/commander/commander_495.mp3"),
 ("clips_en/baekgu/baekgu_496.mp3","02_Assets/audio/voice_en/baekgu/baekgu_496.mp3"),
 ("clips_en/baekgu/baekgu_497.mp3","02_Assets/audio/voice_en/baekgu/baekgu_497.mp3"),
 ("clips_en/baekgu/baekgu_498.mp3","02_Assets/audio/voice_en/baekgu/baekgu_498.mp3"),
 ("clips_en/yisunsin/yisunsin_499.mp3","02_Assets/audio/voice_en/yisunsin/yisunsin_499.mp3"),
]
dep=0
for s,d in pairs:
    sp=os.path.join(vd,s); dp=os.path.join(root,d.replace("/",os.sep))
    os.makedirs(os.path.dirname(dp),exist_ok=True); shutil.copyfile(sp,dp); dep+=1
print("deployed",dep,"clips")
csvp=os.path.join(vd,"voice_manifest.csv")
rows=[
 ("492","시스템","navai","navai_492","... 100년의 봉쇄가 끝났다 ..."),
 ("493","시스템","navai","navai_493","... 지구는 다시 별을 향해 손을 뻗는다 ..."),
 ("494","시스템","navai","navai_494","─ 인류 해방 완수 ─"),
 ("495","사령관","commander","commander_495","우리는 함께 어둠을 뚫었다."),
 ("496","백구","baekgu","baekgu_496","센서 이상 — 눈가가 축축하다. 이건 눈물이다. — BG-100, 마지막 로그 종료."),
 ("497","백구","baekgu","baekgu_497","6단 체인을 마지막으로 보던 순간. 알면서도 갔다. 그것이 인간의 방식이었다."),
 ("498","백구","baekgu","baekgu_498","D-day 100년 + 412일. 지구에 착륙. 풀밭의 색은 100년 형광등이 흉내 못 한 것이었다."),
 ("499","이순신","yisunsin","yisunsin_499","보이드 구역 3행성 — 캅테인 균열, 오리온 균열, 제타 레티쿨리. 우르사 메이저 잔존 세력이 아직 불안정해. 서둘러야 해."),
]
existing=open(csvp,encoding="utf-8-sig").read()
add=[]
with open(csvp,"a",encoding="utf-8",newline="") as f:
    w=csv.writer(f)
    for num,ch,slug,fn,text in rows:
        if ("/"+fn+".mp3") in existing:
            print("skip existing",num); continue
        clip="02_Assets/audio/voice/%s/%s.mp3"%(slug,fn)
        clip_en="02_Assets/audio/voice_en/%s/%s.mp3"%(slug,fn)
        w.writerow([num,ch,slug,clip,"",clip_en,"","ko",text]); add.append(num)
print("appended rows:",add)
