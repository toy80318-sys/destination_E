# 음성 일괄 생성 (ElevenLabs 공식 API · 본인 PC 실행)

> 힉스필드/미디어 MCP 사용 안 함. **본인 ElevenLabs 계정 API 키**로 직접 생성.
> 키는 본인 PC에만 두세요(채팅에 붙여넣지 마세요).

## 파일
- `lines.csv` — 491개 대사. 컬럼: num, character, char_slug, emotion, **text(클린 발화)**, input_text(감정태그 포함), filename
  - 주인공 호칭 '사령관' 통일 / (지문)·{토큰} 제거 완료.
- `elevenlabs_batch.py` — CSV 읽어 줄별 mp3 생성(이미 있으면 건너뜀=재실행 안전)
  - 기본은 **클린 text**로 생성(감탄사/태그 오독 방지). 감정태그를 넣고 싶으면(v3) `USE_EMOTION_TAGS=True`.

## 실행
1. `pip install requests`
2. ElevenLabs → Profile → API Keys 에서 키 발급 후:
   - Windows: `set ELEVENLABS_API_KEY=발급키`
   - mac/linux: `export ELEVENLABS_API_KEY=발급키`
3. `elevenlabs_batch.py` 의 `VOICE_MAP` 에 캐릭터별 voice_id 입력(ElevenLabs Voice Library의 voice_id).
4. `python elevenlabs_batch.py` → `out/` 에 `001_commander.mp3 … 491_xxx.mp3` 생성.
5. 게임 적용: 파일명 번호 = lines.csv num. (예: 컷신 라인별로 매칭.)

## 게임에 바로 넣기
- 생성된 mp3를 게임의 오디오 폴더(예: `02_Assets/audio/voice/`)에 넣고,
  컷신/대사 출력 시 해당 번호 mp3를 재생하도록 연결(코드 적용은 Claude Code).
- 매칭표가 곧 lines.csv(num↔대사↔파일명)이므로 그대로 사용.

## 참고
- `MODEL_ID` 기본 "eleven_v3"(감정 태그 인식). 미인식/오류 시 "eleven_multilingual_v2"로.
- voice_settings(stability/style)는 취향 조정. 한 캐릭터만 뽑으려면 lines.csv를 해당 character만 남겨 실행.
