# 명예의 전당(글로벌 랭킹) 설정 체크리스트

> 진단일 2026-06-18 · 글로벌 탭이 안 되는 **확정 원인**과 해결 절차.
> **코드는 모두 정상**입니다. 아래는 전부 **Firebase 콘솔/CLI 설정** 작업이라 코딩이 아니라 계정 권한이 필요합니다.

## 한 줄 요약

게임을 실제로 띄워 테스트한 결과, 글로벌 탭이 다음 에러로 실패합니다:

```
[CloudSave] 익명 로그인 실패  Firebase: Error (auth/configuration-not-found)
→ 글로벌 조회: "인증 대기 실패 (auth_timeout_15000ms)"
```

**`auth/configuration-not-found` = Firebase 프로젝트 `cgstation-d8178`의 익명 로그인(Anonymous Auth)이 켜져 있지 않다**는 뜻입니다. 글로벌 랭킹은 익명 로그인으로 Firestore에 접근하므로, 이게 안 되면 전부 실패합니다.

- **「내 기록」 탭** = localStorage 기반이라 **이미 정상 작동**합니다(게임 진행 중·ACT4/5 클리어 시 표시). Firebase와 무관.
- **「글로벌」 탭** = 아래 1번만 해결하면 대부분 살아납니다.

## 해결 절차 (소유 계정 `toy80318@gmail.com` 으로)

### 1. 익명 인증 활성화 ★필수★
[Firebase Console](https://console.firebase.google.com/) → 프로젝트 **`cgstation-d8178`**
→ **Authentication** → **Sign-in method** 탭
→ **익명(Anonymous)** 공급자 → **사용 설정(Enable)** → 저장

> 이 한 가지가 `auth/configuration-not-found`의 직접 원인입니다. 콘솔 클릭만으로 되며, `firebase` CLI 로그인이 막혀 있어도 무관합니다.

### 2. Firestore 데이터베이스 생성 (이미 있으면 건너뜀)
→ **Firestore Database** → **데이터베이스 만들기** → 위치 선택 → 프로덕션 모드로 시작.

### 3. 보안 규칙 배포
프로젝트 루트의 [`firestore.rules`](firestore.rules) 가 **이미 올바르게 작성**돼 있습니다
(`hall_of_fame`: 인증 사용자 읽기 / 본인 uid·ACT4~5만 쓰기).

- CLI 가능 시: `firebase deploy --only firestore:rules --project cgstation-d8178`
- CLI 로그인 차단 시: 콘솔 → Firestore → **규칙** 탭에 `firestore.rules` 내용을 붙여넣고 **게시**.

### 4. 승인된 도메인 추가
→ Authentication → **Settings** → **승인된 도메인(Authorized domains)** 에 실행 위치 추가:
- 웹 호스팅 도메인(예: `cgstation-d8178.web.app`, 커스텀 도메인)
- 로컬 테스트용 `localhost`
- (대개 `localhost` · `*.firebaseapp.com` · `*.web.app` 은 기본 등록됨)

### 5. 복합 인덱스 (필요 시 자동 안내)
글로벌 목록은 `act` 필터 + `tsClient` 정렬 쿼리를 씁니다. 인덱스가 없으면 콘솔 에러에 **"인덱스 만들기"** 링크가 뜨니 클릭해서 생성하면 됩니다. (코드에 무정렬 폴백도 있어 인덱스 없이도 동작은 합니다.)

## 검증 방법

설정 후 게임을 새로고침하고 브라우저 콘솔에서:

```js
CloudSave.diag()
// 기대값: { ready:true, user:{uid:...,isAnon:true}, lastAuthError:null, ... }
await CloudSave.listHallOfFame({limit:5})
// 기대값: { items:[...] }  (에러 없음)
```

`ready:true` + `user` 가 채워지면 성공입니다.

## 데스크톱(Electron/Steam) 참고

- 익명 인증은 팝업이 아닌 REST 방식이라 Electron에서도 동작합니다(1번 활성화가 전제).
- 단, 글로벌 랭킹은 **인터넷 연결**이 필요합니다(오프라인 시 자동으로 「내 기록」만 동작).
- Steam 빌드는 `STEAM_BUILD=1` 등으로 autoUpdater만 끄며, CloudSave 동작에는 영향 없습니다.

## 코드 측 개선 (2026-06-18 적용됨)

- 글로벌 탭 실패 시 **원인을 구체적으로 안내**: 익명 인증 비활성화(`configuration-not-found`)면 "Firebase 콘솔에서 익명 인증을 켜야 한다"고 표시.
- 「내 기록」 빈 상태 메시지를 탭 전용 문구로 개선.
- `CloudSave.diag()` 에 `lastAuthError` 노출(진단용).
