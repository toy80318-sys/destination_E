# -*- coding: utf-8 -*-
# 탐색 도감 lore 누락 전수 점검: 함선/파츠/특산물 카탈로그 id ↔ i18n lore.ship_/part_/comm_ 키
import sys,io; sys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding='utf-8')
import re,os,glob
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),"..",".."))
def rd(p):
    try: return open(os.path.join(ROOT,p),encoding='utf-8',errors='ignore').read()
    except: return ''
ko=rd('i18n/ko.js')
lore_keys=set(re.findall(r'"lore\.(ship|part|comm)_([A-Za-z0-9_]+)"', ko))
have={'ship':set(),'part':set(),'comm':set()}
for typ,idv in lore_keys: have[typ].add(idv)

def find_ids(globpat, idpat=r"id:'([A-Za-z0-9_]+)'"):
    ids=[]
    for f in glob.glob(os.path.join(ROOT,globpat)):
        s=open(f,encoding='utf-8',errors='ignore').read()
        ids+=re.findall(idpat,s)
    return ids

# 함선
ship_ids=[]
for f in glob.glob(os.path.join(ROOT,'js','data','ships*.js'))+glob.glob(os.path.join(ROOT,'js','data','*ship*.js')):
    s=open(f,encoding='utf-8',errors='ignore').read()
    ship_ids+=re.findall(r"\{id:'([A-Za-z0-9_]+)'",s)
    ship_ids+=re.findall(r"catalogId:'([A-Za-z0-9_]+)'",s)
ship_ids=sorted(set(ship_ids))

# 파츠
part_ids=[]
for f in glob.glob(os.path.join(ROOT,'js','data','*part*.js'))+glob.glob(os.path.join(ROOT,'js','data','parts*.js')):
    s=open(f,encoding='utf-8',errors='ignore').read()
    part_ids+=re.findall(r"id:'([A-Za-z0-9_]+)'",s)
part_ids=sorted(set(part_ids))

# 특산물
comm_ids=[]
for f in glob.glob(os.path.join(ROOT,'js','data','*commod*.js'))+glob.glob(os.path.join(ROOT,'js','data','*comm*.js'))+glob.glob(os.path.join(ROOT,'js','data','*special*.js')):
    s=open(f,encoding='utf-8',errors='ignore').read()
    comm_ids+=re.findall(r"id:'([A-Za-z0-9_]+)'",s)
comm_ids=sorted(set(comm_ids))

def report(name,ids,typ):
    miss=[i for i in ids if i not in have[typ]]
    print(f"\n=== {name}: 카탈로그 {len(ids)} / lore 보유 {len(have[typ])} / 누락 {len(miss)} ===")
    print("  누락:", miss)
print("데이터 파일 — ships:",[os.path.basename(f) for f in glob.glob(os.path.join(ROOT,'js','data','*ship*.js'))])
print("데이터 파일 — parts:",[os.path.basename(f) for f in glob.glob(os.path.join(ROOT,'js','data','*part*.js'))])
print("데이터 파일 — comm:",[os.path.basename(f) for f in glob.glob(os.path.join(ROOT,'js','data','*comm*.js'))]+[os.path.basename(f) for f in glob.glob(os.path.join(ROOT,'js','data','*special*.js'))])
report('함선',ship_ids,'ship')
report('파츠',part_ids,'part')
report('특산물',comm_ids,'comm')
