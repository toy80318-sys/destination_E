# -*- coding: utf-8 -*-
"""
ElevenLabs 배치 음성 생성 — lines.csv 를 읽어 줄별 mp3 생성.
사용법:
  1) pip install requests
  2) 환경변수 설정:  set ELEVENLABS_API_KEY=발급키   (mac/linux: export ...)
  3) 아래 VOICE_MAP 에 캐릭터별 voice_id 입력 (ElevenLabs Voice Library에서 복사)
  4) python elevenlabs_batch.py
  → out/ 폴더에 001_commander.mp3 ... 생성 (이미 있으면 건너뜀 = 재실행 안전)
"""
import os, csv, time, sys
try:
    import requests
except ImportError:
    sys.exit("requests 필요: pip install requests")

import os as _os
def _load_key():
    k=_os.environ.get("ELEVENLABS_API_KEY","")
    if not k and _os.path.exists("el_key.txt"):
        k=open("el_key.txt",encoding="utf-8").read().strip()
    return k
API_KEY=_load_key()
# v3 audio tag([excited] 등)을 인식하는 모델 사용. 사양 변동 시 공식 문서에서 모델 id 확인.
MODEL_ID = "eleven_v3"          # 태그 미인식이면 "eleven_multilingual_v2"
OUT_DIR  = os.environ.get("OUT_DIR", "out")
CSV_PATH = os.environ.get("CSV_PATH", "lines.csv")
SLEEP    = 0.7                  # 호출 간 간격(요금/레이트리밋 대비)
USE_EMOTION_TAGS = False       # True면 [감정]태그 포함 입력(v3). False=깨끗한 대사만(권장: 태그/감탄사 오독 방지)

# 캐릭터 char_slug -> voice_id  (반드시 채울 것. 빈 값이면 DEFAULT 사용)
VOICE_MAP = {
    "commander": "",      # 주인공
    "baekgu": "",         # 백구
    "yisunsin": "",       # 이순신
    "marcopolo": "",
    "gagarin": "",
    "jangyeongsil": "",
    "gwanggaeto": "",
    "tesla": "",
    "nelson": "",
    "einstein": "",
    "leehwiso": "",
    "ursamajor": "",
    "eisenklau": "",
    "blackfalcon": "",
    "wolfelder": "",
    "aori": "",
    "maximoff": "",
    "navai": "",
    "chiks": "",
    "volcan": "",
    "borg": "", "karim": "", "krash": "", "veil": "", "dorga": "",
}
DEFAULT_VOICE = ""   # 매핑 비었을 때 쓸 기본 voice_id

def main():
    if not API_KEY:
        sys.exit("환경변수 ELEVENLABS_API_KEY 가 비었습니다.")
    os.makedirs(OUT_DIR, exist_ok=True)
    with open(CSV_PATH, encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))
    total = len(rows); ok = 0; skip = 0; fail = 0
    for r in rows:
        fn = os.path.join(OUT_DIR, r["filename"])
        if os.path.exists(fn):
            skip += 1; continue
        vid = VOICE_MAP.get(r["char_slug"]) or DEFAULT_VOICE
        if not vid:
            print(f"[!] voice_id 없음: {r['character']}({r['char_slug']}) — 건너뜀"); fail += 1; continue
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{vid}"
        body = {
            "text": (r["input_text"] if USE_EMOTION_TAGS else r["text"]),
            "model_id": MODEL_ID,
            "voice_settings": {"stability": 0.4, "similarity_boost": 0.8, "style": 0.3},
        }
        try:
            resp = requests.post(url, headers={"xi-api-key": API_KEY,
                "Content-Type": "application/json", "Accept": "audio/mpeg"}, json=body, timeout=60)
            if resp.status_code == 200 and resp.content:
                with open(fn, "wb") as o: o.write(resp.content)
                ok += 1; print(f"[{ok+skip}/{total}] OK {r['filename']}  {r['character']}")
            else:
                fail += 1; print(f"[X] {r['filename']} HTTP {resp.status_code}: {resp.text[:120]}")
        except Exception as e:
            fail += 1; print(f"[X] {r['filename']} 오류: {e}")
        time.sleep(SLEEP)
    print(f"\n완료 — 생성 {ok} / 건너뜀(이미존재) {skip} / 실패 {fail} / 총 {total}")

if __name__ == "__main__":
    main()
