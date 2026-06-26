# -*- coding: utf-8 -*-
import sys,io; sys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding='utf-8')
import json
for fn in ['tts_ko_extra.json','tts_en_extra.json']:
    try:
        d=json.load(open(fn,encoding='utf-8'))
    except Exception as e:
        print(fn,'parse err',e); continue
    for j in d:
        o=j.get('out','')
        if 'merchantThanks_1' in o or 'scientistThanks_1' in o:
            print(fn,'|',o,'| voice=',j.get('voice'))
