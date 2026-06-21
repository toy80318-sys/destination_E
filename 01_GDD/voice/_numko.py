# 숫자 → 한글 발음 변환기 (음성 대본용)
import re
_S="영일이삼사오육칠팔구"
def sino(n):
    n=int(n)
    if n==0: return "영"
    if n<0: return "마이너스 "+sino(-n)
    units=["","만","억","조"]; parts=[]; i=0
    while n>0:
        chunk=n%10000
        if chunk: parts.append(_sino4(chunk)+units[i])
        n//=10000; i+=1
    return "".join(reversed(parts))
def _sino4(n):
    res=""; 
    for div,ch in [(1000,"천"),(100,"백"),(10,"십")]:
        d=n//div; n%=div
        if d: res+=("" if d==1 else _S[d])+ch
    if n: res+=_S[n]
    return res
_NU={1:"한",2:"두",3:"세",4:"네",5:"다섯",6:"여섯",7:"일곱",8:"여덟",9:"아홉",10:"열",
20:"스무",30:"서른",40:"마흔",50:"쉰",60:"예순",70:"일흔",80:"여든",90:"아흔"}
_NU_t={10:"열",20:"스물",30:"서른",40:"마흔",50:"쉰",60:"예순",70:"일흔",80:"여든",90:"아흔"}
def native(n):
    n=int(n)
    if n in _NU: return _NU[n]
    if n<10: return _NU.get(n,sino(n))
    if n<100:
        t=(n//10)*10; u=n%10
        if u==0: return _NU.get(t,_NU_t[t])
        return _NU_t[t]+_NU[u]
    return sino(n)  # 100 이상은 한자어

NATIVE_CNT="기|명|척|배|번|대|권|종|칸|단편|발|함|살|마리|군데|가지"
SINO_UNIT="퍼센트|％|%|년|개월|일|인|초|분|시간|크레딧|단계|레벨|등급|미터|광년|만|천|억|개"  # 개월 우선

def convert(t):
    import re as _re; t=_re.sub(r'(?<=\d),(?=\d)','',t)
    # 분수 A/B -> B분의 A
    t=re.sub(r'(\d+)\s*/\s*(\d+)', lambda m: sino(m.group(2))+"분의 "+sino(m.group(1)), t)
    # ± 기호
    t=t.replace("±","플러스 마이너스 ")
    # 소수
    t=re.sub(r'(\d+)\.(\d+)', lambda m: sino(m.group(1))+"쩜"+"".join(_S[int(c)] for c in m.group(2)), t)
    # 개월(한자어) 먼저 처리
    t=re.sub(r'(\d+)\s*개월', lambda m: sino(m.group(1))+" 개월", t)
    # 고유어 counter (개는 고유어: 한 개)
    t=re.sub(r'(\d+)\s*(개(?!월)|'+NATIVE_CNT+r')', lambda m: native(m.group(1))+" "+m.group(2), t)
    # 한자어 unit
    t=re.sub(r'(\d+)\s*(퍼센트|％|%|년|일(?!기)|인(?=\s|의|\b)|초|분|시간|크레딧|단계|레벨|등급|미터|광년|만|천|억)',
             lambda m: sino(m.group(1))+" "+("퍼센트" if m.group(2) in("%","％") else m.group(2)), t)
    # 남은 단독 숫자 -> 한자어
    t=re.sub(r'\d+', lambda m: sino(m.group()), t)
    return t

if __name__=="__main__":
    tests=["에너지 잔량 7%","100년 3개월 12일","크리그 소형 3기, 중형 지휘선 1기","민간 광부 7명",
    "설계도 단편 1/3","2/3 확보","생존 확률 62%","공격력 두 배! 십오 퍼센트","±3.0 변동","1천만 단위","화력 10배","1.2배","30기 식별","50초 버텨","8인의 전설","다섯 척"]
    for x in tests: print(x,"→",convert(x))
