/**
 * Criptografia AES-256-GCM para secrets (api_key, webhook_secret).
 * Requer ENCRYPTION_KEY (32 bytes hex ou 64 chars) em variável de ambiente.
 * Sem a chave, usa base64 (legado, não seguro).
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer | null {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw || raw.length < 16) return null;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, 'hex');
  }
  return createHash('sha256').update(raw).digest();
}

const ENC_PREFIX = 'v1:';

/**
 * Criptografa texto. Sem ENCRYPTION_KEY, retorna base64 do texto (legado).
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  if (!key) {
    return Buffer.from(plaintext, 'utf-8').toString('base64');
  }
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([iv, authTag, encrypted]).toString('base64');
  return ENC_PREFIX + combined;
}

/**
 * Descriptografa. Aceita formato criptografado (v1:...) ou legado (base64).
 */
export function decrypt(ciphertext: string | null): string {
  if (!ciphertext) return '';
  const key = getKey();
  if (!key) {
    return Buffer.from(ciphertext, 'base64').toString('utf-8');
  }
  if (ciphertext.startsWith(ENC_PREFIX)) {
    try {
      const buf = Buffer.from(ciphertext.slice(ENC_PREFIX.length), 'base64');
      const iv = buf.subarray(0, IV_LENGTH);
      const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
      const encrypted = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
      const decipher = createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);
      return decipher.update(encrypted) + decipher.final('utf-8');
    } catch {
      return '';
    }
  }
  return Buffer.from(ciphertext, 'base64').toString('utf-8');
}
