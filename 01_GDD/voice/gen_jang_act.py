# -*- coding: utf-8 -*-
# 캐릭터/연기 특화 한국어 여성 보이스 탐색 + 감정 기복 큰 대사로 표현력 샘플.
import sys,io
sys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding='utf-8')
import json,os,urllib.request,urllib.parse,urllib.error,importlib.util
s=importlib.util.spec_from_file_location("stt","stt.py");m=importlib.util.module_from_spec(s);s.loader.exec_module(m);K=m.key()
H={"xi-api-key":K,"Content-Type":"application/json"}
def shared(**kw):
    q=urllib.parse.urlencode(dict(language='ko',gender='female',page_size=40,**kw))
    req=urllib.request.Request('https://api.elevenlabs.io/v1/shared-voices?'+q,headers={'xi-api-key':K})
    return json.load(urllib.request.urlopen(req,timeout=30)).get('voices',[])
# 캐릭터/대화 특화 우선 수집
seen={};
for uc in ['characters_animation','conversational','social_media']:
    for v in shared(use_cases=uc):
        seen[v['voice_id']]=v
cand=list(seen.values())
print("후보 수집:",len(cand))
# 표현력 있어 보이는 descriptive 우선 (calm/narration 후순위)
def score(v):
    d=(v.get('descriptive') or '').lower();
    good=['confident','upbeat','expressive','animated','dramatic','energetic','crisp','excited','playful','sassy']
    bad=['calm','gentle','soft','formal','professional']
    return sum(g in d for g in good)*2 - sum(b in d for b in bad) + (1 if (v.get('age')=='young') else 0)
cand.sort(key=score,reverse=True)
top=cand[:5]
for v in top: print("PICK",v['voice_id'],'|',v.get('name'),'|',v.get('age'),v.get('accent'),'|',v.get('descriptive'),'|',v.get('use_case',''))
# 감정 기복 큰 대사
TXT="[excited] 좋았어! 드디어 거북선 설계도가 다 모였어! [curious] ...어? 잠깐, 이 부분은… [playful] 후훗, 역시 내가 천재라니까. [proud] 사령관, 이건 정말 물건이에요!"
od="clips/_sample_jang4"; os.makedirs(od,exist_ok=True)
for v in top:
    out=f"{od}/jang4_{v['voice_id'][:6]}.mp3"
    b={"text":TXT,"model_id":"eleven_v3","voice_settings":{"stability":0.3,"similarity_boost":0.85}}
    r=urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{v['voice_id']}?output_format=mp3_44100_128",data=json.dumps(b).encode(),headers=H,method="POST")
    try: open(out,"wb").write(urllib.request.urlopen(r,timeout=180).read()); print("OK",out,'|',v.get('name'))
    except urllib.error.HTTPError as e: print("HTTP",v['voice_id'],e.code,e.read()[:120])
