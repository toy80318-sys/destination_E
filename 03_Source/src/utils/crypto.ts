/**
 * DESTINATION EARTH — 로컬 세이브 암호화 유틸
 * Web Crypto API 기반 AES-GCM 256bit 암복호화 (GDD v6.0 §22.2)
 *
 * 목적: localStorage 세이브의 변조/조작 방지(난독화). 클라이언트에 키가 존재하므로
 * 절대적 기밀성 보장이 아니라 캐주얼한 변조를 막기 위한 용도다.
 */

// ─── 상수 ────────────────────────────────────────────────────────────────
// 암호화된 페이로드 식별용 접두사 (레거시 평문 세이브 구분)
const ENC_PREFIX = 'aesgcm:';
// PBKDF2 반복 횟수 (OWASP 권장 수준)
const PBKDF2_ITERATIONS = 100_000;
// 앱 고정 시드 — 키 파생용 (변조 방지 목적의 난독화 시드)
const APP_SECRET = 'destination-earth-local-save-v1';
const SALT_BYTES = 16;
const IV_BYTES = 12; // AES-GCM 권장 IV 길이

// ─── base64 직렬화 헬퍼 ───────────────────────────────────────────────────
function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// 새 ArrayBuffer 기반 Uint8Array 생성 (BufferSource 타입 호환 보장)
function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(new ArrayBuffer(length)));
}

// ─── 키 파생 (PBKDF2 → AES-GCM 256bit) ───────────────────────────────────
async function deriveKey(salt: BufferSource): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(APP_SECRET) as BufferSource,
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Web Crypto(subtle) 사용 가능 여부 — 보안 컨텍스트(https/localhost) 필요
function isCryptoAvailable(): boolean {
  return (
    typeof crypto !== 'undefined' &&
    typeof crypto.subtle !== 'undefined' &&
    typeof crypto.subtle.encrypt === 'function'
  );
}

// ─── 문자열 암호화 ────────────────────────────────────────────────────────
// 반환 형식: ENC_PREFIX + base64(salt[16] | iv[12] | ciphertext)
export async function encryptString(plaintext: string): Promise<string> {
  if (!isCryptoAvailable()) {
    // 암호화 불가 환경에서는 평문 그대로 저장 (게임이 죽지 않도록 폴백)
    return plaintext;
  }
  const enc = new TextEncoder();
  const salt = randomBytes(SALT_BYTES);
  const iv = randomBytes(IV_BYTES);
  const key = await deriveKey(salt as BufferSource);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    enc.encode(plaintext) as BufferSource
  );

  const cipherBytes = new Uint8Array(ciphertext);
  const payload = new Uint8Array(salt.length + iv.length + cipherBytes.length);
  payload.set(salt, 0);
  payload.set(iv, salt.length);
  payload.set(cipherBytes, salt.length + iv.length);

  return ENC_PREFIX + bytesToBase64(payload);
}

// ─── 문자열 복호화 ────────────────────────────────────────────────────────
// 접두사가 없으면 레거시 평문으로 간주하고 그대로 반환한다.
export async function decryptString(payload: string): Promise<string> {
  if (!payload.startsWith(ENC_PREFIX)) {
    return payload; // 레거시 평문 세이브 호환
  }
  if (!isCryptoAvailable()) {
    throw new Error('Web Crypto 미지원 환경에서 암호화 세이브를 복호화할 수 없습니다.');
  }

  const bytes = base64ToBytes(payload.slice(ENC_PREFIX.length));
  const salt = bytes.slice(0, SALT_BYTES);
  const iv = bytes.slice(SALT_BYTES, SALT_BYTES + IV_BYTES);
  const data = bytes.slice(SALT_BYTES + IV_BYTES);
  const key = await deriveKey(salt as BufferSource);

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    data as BufferSource
  );
  return new TextDecoder().decode(plaintext);
}
