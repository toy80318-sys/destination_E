# 🚀 DESTINATION EARTH — 개발 환경 설치 가이드

## 1. 사전 요구사항

- Node.js v20.0.0 이상
- npm v10.0.0 이상 (또는 pnpm v9)
- Firebase CLI (`npm install -g firebase-tools`)

## 2. 프로젝트 초기 설치

```bash
# 03_Source 폴더에서 실행
cd "데스티네이션 어스 웹게임/03_Source"

# 의존성 설치
npm install

# (또는 pnpm 사용 시)
pnpm install
```

## 3. Firebase 설정

### 3.1 Firebase 프로젝트 생성
1. [Firebase Console](https://console.firebase.google.com) 접속
2. 새 프로젝트 생성: `destination-earth-game`
3. 다음 서비스 활성화:
   - Authentication (Google + 이메일)
   - Firestore Database
   - Realtime Database
   - Storage
   - Analytics
   - Cloud Functions

### 3.2 환경 변수 설정

`03_Source` 폴더에 `.env.local` 파일 생성:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebaseio.com
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

### 3.3 Firebase Firestore Security Rules 배포

```bash
firebase login
firebase use --add  # destination-earth-game 선택

# Security Rules 파일 생성 후 배포
firebase deploy --only firestore:rules
```

**firestore.rules:**
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /gameStates/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /leaderboard/{document=**} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

**database.rules.json (Realtime DB):**
```json
{
  "rules": {
    "auctions": {
      "$planetId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```

### 3.4 Cloud Functions 배포

```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

## 4. 개발 서버 시작

```bash
# 개발 모드 (Hot Reload)
npm run dev

# 브라우저에서 http://localhost:3000 열기
```

## 5. 빌드 & 배포

```bash
# 프로덕션 빌드
npm run build

# 빌드 결과 미리보기
npm run start

# Firebase Hosting 배포 (선택)
firebase deploy --only hosting
```

## 6. 폴더 구조 요약

```
03_Source/
├── package.json              ← 의존성 정의
├── .env.local                ← Firebase 환경 변수 (미커밋)
├── public/
│   └── data/
│       ├── factions_planets.json   ← 게임 데이터
│       ├── crews_heroes.json       ← 캐릭터 데이터
│       └── (추가 예정)
├── src/
│   ├── app/                  ← Next.js App Router
│   │   └── page.tsx          ← 타이틀/게임 메인
│   ├── scenes/               ← Phaser 3 씬
│   │   ├── StarMapScene.ts   ← Galaxy Seed 스타맵
│   │   └── CombatScene.ts    ← 16v16 전투
│   ├── components/           ← React UI 컴포넌트
│   │   ├── AgeGate.tsx       ← 연령 확인
│   │   ├── FTUECustomize.tsx ← 사령관 커스터마이징
│   │   └── HubUI.tsx         ← 허브 UI
│   ├── store/
│   │   └── gameStore.ts      ← Zustand 전역 상태
│   ├── utils/
│   │   ├── galaxyGenerator.ts← Mulberry32 PRNG 맵 생성
│   │   ├── combatEngine.ts   ← 16v16 전투 공식
│   │   └── economyEngine.ts  ← 무역/경매/가차 공식
│   └── firebase/
│       ├── config.ts         ← Firebase 초기화
│       ├── firestore.ts      ← 세이브/로드
│       └── realtimeDB.ts     ← 실시간 경매
└── functions/
    └── src/
        └── auctionCloser.ts  ← Cloud Functions (경매/세금/미성년)
```

## 7. 다음 개발 단계 (Phase 1)

1. **타입스크립트 설정** (`tsconfig.json`, `tailwind.config.ts`)
2. **Next.js 설정** (`next.config.js` — PWA 포함)
3. **Phaser 3 씬 고도화** — 실제 에셋 연결
4. **주점 가차 UI** 완성
5. **경매 실시간 UI** 완성
6. **전투 HUD** 완성 (턴 타임라인, 편대 슬롯)
7. **스타맵 이동** — 워프 이동 로직
8. **세이브/로드** Firestore 완전 연결
