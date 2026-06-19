# 음성 일괄 생성 (ElevenLabs)

## 파일
- `lines.csv` — 493개 대사. 컬럼: num, character, char_slug, emotion, text, input_text, filename
  - `input_text` = 감정태그 + 대사 (실제 TTS 입력값), `filename` = 001_commander.mp3 …
- `elevenlabs_batch.py` — CSV 읽어 줄별 mp3 생성(재실행 시 이미 있는 파일 건너뜀)

## 순서
1. `pip install requests`
2. API 키: `export ELEVENLABS_API_KEY=...` (Windows: `set ELEVENLABS_API_KEY=...`)
3. `elevenlabs_batch.py` 의 `VOICE_MAP` 에 캐릭터별 voice_id 입력 (ElevenLabs Voice Library)
4. `python elevenlabs_batch.py` → `out/` 에 mp3 생성
5. 게임 적용 시 파일명(번호)으로 대사 매칭 (lines.csv num 기준)

## 참고
- `MODEL_ID="eleven_v3"` = 감정 오디오 태그 인식 모델(사양 변동 시 공식 문서 확인). 태그 미인식이면 multilingual_v2.
- voice_settings(stability/style)는 취향에 맞게 조정.
- 한 캐릭터만 뽑으려면 lines.csv 를 해당 character 행만 남기고 돌리면 됨.
