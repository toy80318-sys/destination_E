# -*- coding: utf-8 -*-
import sys,io; sys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding='utf-8')
import re,os
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),"..",".."))
def load(fn):
    s=open(os.path.join(ROOT,fn),encoding='utf-8').read()
    def g(k):
        m=re.search(r'"%s"\s*:\s*"((?:[^"\\]|\\.)*)"'%re.escape(k),s)
        if not m: return None
        t=m.group(1)
        try: t=t.encode().decode('unicode_escape').encode('latin1').decode('utf-8') if False else bytes(t,'utf-8').decode('unicode_escape')
        except: pass
        return t
    return g
gko=load('i18n/ko.js'); gen=load('i18n/en.js')
for i in range(1,9):
    for suf in ('text','diary'):
        k='ending.h0%d.%s'%(i,suf)
        ko=gko(k); en=gen(k)
        if ko is None and en is None: continue
        var='VAR' if (ko and '{' in ko) else 'OK '
        print('[%s] %s'%(var,k))
        print('    KO:',(ko or '')[:90])
        print('    EN:',(en or '')[:90])
