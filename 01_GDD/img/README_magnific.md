# Magnific(Freepik) API 키 설정 & 사용

> 게임 이미지(프롤로그 키아트·함선·포트레이트 등)를 Magnific AI로 고해상도 업스케일하기 위한 설정. ElevenLabs 키와 동일한 안전 방식(키 파일은 로컬 전용·커밋 금지).

## 1. 키 발급
- Magnific(=Freepik) 로그인 → User 메뉴 → **organization Settings → API Keys** 에서 발급.
- ⚠ **Business / Enterprise 플랜**만 API 키로 크레딧을 소비할 수 있음. (무료/개인 플랜은 API 불가)

## 2. 키 파일 만들기 (직접 — 키 원문은 코드/대화에 넣지 말 것)
- 파일 생성: `01_GDD/img/magnific_key.txt`
- 내용: 발급받은 API 키 한 줄만 붙여넣기. (예: `fpsk_xxxxxxxx...`)
- 이 경로는 `.gitignore`에 등록돼 **커밋되지 않습니다**(magnific_key.txt 전역 무시).
- 또는 환경변수 `MAGNIFIC_API_KEY` 로 설정해도 됨.

## 3. 사용
```
cd 01_GDD\img
python magnific_upscale.py ..\..\02_Assets\img\prologue\scene01.png 4x
# → scene01_upscaled.png 생성 (scale: 2x|4x|8x|16x)
```
- 인증: 헤더 `x-magnific-api-key` (`https://api.magnific.com/v1/ai/image-upscaler`).
- Freepik 호환: `api.freepik.com` + `x-freepik-api-key` (같은 키 사용 가능).
- 스크립트 파라미터(creativity·hdr·resemblance·engine 등)는 `magnific_upscale.py` 상단에서 조정.

## 4. 주의
- 키·크레딧은 유료 — 대량 처리 전 1장 테스트.
- 입력은 base64 전송 방식(대용량은 이미지 URL 방식이 필요할 수 있음 — 플랜/문서 확인).
- 산출물(_upscaled.png)·키 파일은 커밋 금지.

> 참고 문서: docs.magnific.com (Image Upscaler Creative), api.magnific.com.
