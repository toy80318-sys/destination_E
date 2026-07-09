---
description: 검증 → bump → 커밋 → 릴리스(push+tag→CI 3-OS) 원스톱. 인수: 커밋 제목(선택)
---

「데스티네이션 어스」 표준 출고 절차를 실행하라. 인수($ARGUMENTS)가 있으면 커밋 제목으로 사용.

## 절차 (순서 엄수 — 앞 단계 실패 시 중단하고 보고)
1. **검증**: /verify-game 기준 1~4를 실행(실패 시 수정 후 재검증, 최대 3회 — 통과 못 하면 출고 중단).
2. **bump**: `node scripts/bump-version.js --no-commit` (package.json version + _GAME_VER + 캐시버스터 동기화. 손으로 어긋나게 두지 말 것).
3. **커밋**: 이번 작업 관련 파일만 `git add`(명시적 경로 — `git add -A` 금지). 커밋 메시지: 제목(conventional commit, 한국어) + 본문(무엇을·왜·검증 결과). Co-Authored-By 트레일러 포함.
4. **릴리스**: `npm run release` → 완료 후 반드시 확인:
   - `git rev-list --count origin/main..main` → **0** (push됨)
   - `git tag --points-at HEAD` → 새 v* 태그 존재 (CI 3-OS 트리거)
5. **보고**: 버전, 태그, 커밋 해시, 릴리스/Actions 링크(https://github.com/toy80318-sys/destination_E), 헤드리스 확인 불가 항목(실기 확인 요청).

## 금지
- 검증 실패 상태로 릴리스 금지. dist/·mobile-www/·android/·el_key·_*.cjs 커밋 금지.
- `--no-verify`·훅 우회 금지. 게임 디자인 수치 임의 변경분이 diff에 섞여 있으면 커밋 전에 사용자에게 확인.
