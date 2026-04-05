import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const ALGO = 'aes-256-gcm';

function deriveKey(): Buffer {
  const s = process.env.BYOK_ENCRYPTION_SECRET || '';
  if (s.length < 32) {
    throw new Error('BYOK_ENCRYPTION_SECRET must be set (min 32 characters)');
  }
  return createHash('sha256').update(s, 'utf8').digest();
}

/** iv(12) + tag(16) + ciphertext — base64 */
export function encryptByokPlaintext(plain: string): string {
  const key = deriveKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decryptByokCiphertext(blob: string): string | null {
  try {
    const key = deriveKey();
    const buf = Buffer.from(blob, 'base64');
    if (buf.length < 12 + 16 + 1) return null;
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const data = buf.subarray(28);
    const decipher = createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(data), decipher.final()]);
    return dec.toString('utf8');
  } catch {
    return null;
  }
}
