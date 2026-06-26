# -*- coding: utf-8 -*-
# Magnific(Freepik) AI 업스케일러 — 로컬 이미지를 고해상도로 업스케일.
# 키: 01_GDD/img/magnific_key.txt (또는 환경변수 MAGNIFIC_API_KEY). ※ 키는 커밋 금지(.gitignore 등록됨).
# 인증: 헤더 x-magnific-api-key (api.magnific.com).  Freepik 호환: api.freepik.com + x-freepik-api-key.
# 플랜: Business/Enterprise 만 API 키 발급 가능.
#
# 사용:  python magnific_upscale.py <입력이미지경로> [scale_factor]
#   예:  python magnific_upscale.py ..\..\02_Assets\img\prologue\scene01.png 4x
#   출력: 입력파일명_upscaled.png (같은 폴더)
import sys, os, re, json, time, base64, urllib.request, urllib.error

API_BASE = "https://api.magnific.com/v1"
UPSCALE_PATH = "/ai/image-upscaler"   # POST 생성, GET /{task_id} 상태조회

def load_key():
    env = os.environ.get("MAGNIFIC_API_KEY", "").strip()
    if env: return env
    here = os.path.dirname(os.path.abspath(__file__))
    for p in (os.path.join(here, "magnific_key.txt"),
              os.path.join(here, "..", "voice", "magnific_key.txt")):
        if os.path.exists(p):
            raw = open(p, encoding="utf-8-sig").read()
            toks = [t for t in re.findall(r"[A-Za-z0-9_\-]{16,}", raw)
                    if t.lower() not in ("magnific_api_key", "freepik_api_key")]
            if toks: return max(toks, key=len)
    return ""

def _req(method, url, key, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method,
        headers={"x-magnific-api-key": key, "Content-Type": "application/json", "Accept": "application/json"})
    return json.loads(urllib.request.urlopen(req, timeout=180).read().decode())

def main():
    if len(sys.argv) < 2:
        print("사용: python magnific_upscale.py <입력이미지> [scale_factor=2x|4x|8x|16x]"); return
    src = sys.argv[1]; scale = sys.argv[2] if len(sys.argv) > 2 else "4x"
    key = load_key()
    if not key:
        print("키 없음 — 01_GDD/img/magnific_key.txt 를 만들거나 MAGNIFIC_API_KEY 설정"); return
    if not os.path.exists(src):
        print("입력 파일 없음:", src); return
    # 1) 업스케일 작업 생성 (이미지 base64 전송)
    b64 = base64.b64encode(open(src, "rb").read()).decode()
    body = {
        "image": b64,                # 일부 플랜은 image URL 만 허용 → 그 경우 호스팅 URL 사용
        "scale_factor": scale,       # 2x / 4x / 8x / 16x
        "optimized_for": "art_and_illustration",  # 게임 키아트용 (photo / standard 등 택1)
        "creativity": 3, "hdr": 3, "resemblance": 5, "fractality": 3,  # 0~10 (기호에 맞게)
        "engine": "magnific_sharpy"  # 또는 magnific_illusio / sparkle
    }
    try:
        r = _req("POST", API_BASE + UPSCALE_PATH, key, body)
    except urllib.error.HTTPError as e:
        print("생성 HTTP", e.code, e.read()[:300].decode("utf-8", "ignore")); return
    task = (r.get("data") or r).get("task_id") or (r.get("data") or r).get("id")
    print("작업 생성:", task, "/ status:", (r.get("data") or r).get("status"))
    if not task: print("응답:", json.dumps(r)[:400]); return
    # 2) 상태 폴링
    out_url = None
    for i in range(60):
        time.sleep(5)
        try:
            s = _req("GET", f"{API_BASE}{UPSCALE_PATH}/{task}", key)
        except urllib.error.HTTPError as e:
            print("상태 HTTP", e.code, e.read()[:200].decode("utf-8", "ignore")); return
        d = s.get("data") or s
        st = d.get("status")
        gen = d.get("generated") or d.get("result") or []
        print(f"  [{i}] status={st}")
        if st in ("COMPLETED", "completed", "success") and gen:
            out_url = gen[0] if isinstance(gen, list) else gen; break
        if st in ("FAILED", "failed", "error"):
            print("실패:", json.dumps(d)[:300]); return
    if not out_url: print("타임아웃 — 작업이 끝나지 않음"); return
    # 3) 결과 다운로드
    out = os.path.splitext(src)[0] + "_upscaled.png"
    urllib.request.urlretrieve(out_url, out)
    print("완료:", out)

if __name__ == "__main__":
    main()
