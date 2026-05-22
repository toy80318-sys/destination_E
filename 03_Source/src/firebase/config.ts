/**
 * DESTINATION EARTH — Firebase 설정
 * GDD v6.0 §22 기준 Firebase 기반 백엔드
 *
 * ⚠️ 실제 배포 시 환경 변수(.env.local)에서 로드:
 *    NEXT_PUBLIC_FIREBASE_API_KEY=...
 *    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
 *    NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
 *    NEXT_PUBLIC_FIREBASE_DATABASE_URL=...
 *    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
 *    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
 *    NEXT_PUBLIC_FIREBASE_APP_ID=...
 */

import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// ─── Firebase 앱 초기화 (중복 방지) ──────────────────────────────────────
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// ─── Firebase 서비스 내보내기 ─────────────────────────────────────────────
export const auth = getAuth(app);                    // 인증
export const db = getFirestore(app);                  // Firestore (세이브)
export const rtdb = getDatabase(app);                 // Realtime DB (경매)
export const storage = getStorage(app);               // Storage (에셋 CDN)

// Analytics (브라우저 환경에서만)
export const analytics = (async () => {
  if (typeof window !== 'undefined' && await isSupported()) {
    const { getAnalytics } = await import('firebase/analytics');
    return getAnalytics(app);
  }
  return null;
})();

export default app;
