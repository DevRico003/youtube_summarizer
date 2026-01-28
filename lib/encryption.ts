import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits for AES-256

/**
 * Derives a key from the secret using PBKDF2
 */
function deriveKey(secret: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(secret, salt, 100000, KEY_LENGTH, 'sha256');
}

/**
 * Encrypts plaintext using AES-256-GCM
 * @param plaintext - The text to encrypt
 * @param secret - The secret key for encryption
 * @returns Base64-encoded ciphertext (format: salt:iv:authTag:encrypted)
 */
export function encrypt(plaintext: string, secret: string): string {
  if (!plaintext || !secret) {
    throw new Error('Plaintext and secret are required');
  }

  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(secret, salt);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Combine salt, iv, authTag, and encrypted data
  const combined = Buffer.concat([salt, iv, authTag, encrypted]);

  return combined.toString('base64');
}

/**
 * Decrypts ciphertext using AES-256-GCM
 * @param ciphertext - Base64-encoded ciphertext
 * @param secret - The secret key for decryption
 * @returns Decrypted plaintext
 * @throws Error if decryption fails (invalid ciphertext or wrong secret)
 */
export function decrypt(ciphertext: string, secret: string): string {
  if (!ciphertext || !secret) {
    throw new Error('Ciphertext and secret are required');
  }

  let combined: Buffer;
  try {
    combined = Buffer.from(ciphertext, 'base64');
  } catch {
    throw new Error('Invalid ciphertext format');
  }

  // Minimum length: salt(16) + iv(12) + authTag(16) + at least 1 byte of data
  const minLength = SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH + 1;
  if (combined.length < minLength) {
    throw new Error('Invalid ciphertext: too short');
  }

  const salt = combined.subarray(0, SALT_LENGTH);
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = combined.subarray(
    SALT_LENGTH + IV_LENGTH,
    SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
  );
  const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

  const key = deriveKey(secret, salt);

  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch {
    throw new Error('Decryption failed: invalid ciphertext or wrong secret');
  }
}
