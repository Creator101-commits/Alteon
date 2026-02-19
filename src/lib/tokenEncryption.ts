/**
 * Token Encryption Utility
 * 
 * Encrypts/decrypts OAuth tokens using AES-256-GCM via the Web Crypto API.
 * Used to protect Google access/refresh tokens stored in Supabase.
 * 
 * The encryption key is derived from TOKEN_ENCRYPTION_KEY env var using PBKDF2.
 * Each encrypted value has its own random IV and auth tag for security.
 * 
 * Format: base64(iv:ciphertext:authTag)
 */

// Use a fixed salt for key derivation (safe since we use a strong random key)
const SALT = 'alteon-token-encryption-v1';

/**
 * Derive a CryptoKey from the secret string using PBKDF2
 */
async function deriveKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(SALT),
      iterations: 100_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a plaintext token string.
 * Returns a base64-encoded string containing IV + ciphertext + auth tag.
 * Returns null if encryption key is not configured.
 */
export async function encryptToken(plaintext: string, encryptionKey?: string): Promise<string | null> {
  const key = encryptionKey || getEncryptionKey();
  if (!key || !plaintext) return plaintext || null;

  try {
    const cryptoKey = await deriveKey(key);
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM

    const cipherBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      encoder.encode(plaintext)
    );

    // Combine IV + ciphertext into a single buffer, then base64 encode
    const cipherArray = new Uint8Array(cipherBuffer);
    const combined = new Uint8Array(iv.length + cipherArray.length);
    combined.set(iv, 0);
    combined.set(cipherArray, iv.length);

    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Token encryption failed:', error);
    return null;
  }
}

/**
 * Decrypt an encrypted token string.
 * Expects the base64-encoded format produced by encryptToken.
 * Returns null if decryption fails or key is not configured.
 */
export async function decryptToken(encrypted: string, encryptionKey?: string): Promise<string | null> {
  const key = encryptionKey || getEncryptionKey();
  if (!key || !encrypted) return encrypted || null;

  // If this doesn't look like an encrypted value (not base64), return as-is
  // This handles migration from unencrypted to encrypted tokens
  if (!isEncryptedToken(encrypted)) {
    return encrypted;
  }

  try {
    const cryptoKey = await deriveKey(key);
    const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));

    // Extract IV (first 12 bytes) and ciphertext (rest)
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const plainBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      ciphertext
    );

    return new TextDecoder().decode(plainBuffer);
  } catch (error) {
    // If decryption fails, the value might be unencrypted (pre-migration)
    console.warn('Token decryption failed - value may be unencrypted (pre-migration):', error);
    return encrypted;
  }
}

/**
 * Check if a string looks like an encrypted token (base64 of sufficient length).
 * Unencrypted Google tokens typically start with "ya29." or similar.
 */
function isEncryptedToken(value: string): boolean {
  if (!value) return false;
  // Google OAuth tokens start with known prefixes
  if (value.startsWith('ya29.') || value.startsWith('1//')) return false;
  // Check if it's valid base64 of minimum length (12 byte IV + some ciphertext)
  try {
    const decoded = atob(value);
    return decoded.length >= 16; // At least IV + a few bytes of ciphertext
  } catch {
    return false;
  }
}

/**
 * Get the encryption key from environment or import.meta.env.
 * Server-side: process.env.TOKEN_ENCRYPTION_KEY
 * Client-side: import.meta.env.VITE_TOKEN_ENCRYPTION_KEY
 */
function getEncryptionKey(): string | undefined {
  // Server-side (Vercel functions)
  if (typeof process !== 'undefined' && process.env?.TOKEN_ENCRYPTION_KEY) {
    return process.env.TOKEN_ENCRYPTION_KEY;
  }
  // Client-side (Vite)
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_TOKEN_ENCRYPTION_KEY) {
    return (import.meta as any).env.VITE_TOKEN_ENCRYPTION_KEY;
  }
  return undefined;
}

/**
 * Encrypt HAC credentials for safe localStorage storage.
 * Uses a user-specific key derived from their UID.
 */
export async function encryptLocalData(data: string, userUid: string): Promise<string> {
  // Derive a key from the user's UID + a fixed app secret
  const derivedSecret = `alteon-local-${userUid}-v1`;
  const result = await encryptToken(data, derivedSecret);
  return result || data;
}

/**
 * Decrypt HAC credentials from localStorage.
 */
export async function decryptLocalData(encrypted: string, userUid: string): Promise<string> {
  const derivedSecret = `alteon-local-${userUid}-v1`;
  const result = await decryptToken(encrypted, derivedSecret);
  return result || encrypted;
}
