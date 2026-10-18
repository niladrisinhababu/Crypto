import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const DEFAULT_SECRET = process.env.ENCRYPTION_SECRET || 'vegaedge-security-key-32chars-ok!';

function getSecretKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET || DEFAULT_SECRET;
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypt sensitive API credentials server-side using AES-256-GCM
 */
export function encryptCredential(plainText: string): string {
  if (!plainText) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getSecretKey(), iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt sensitive credentials on the server only. Never returns to client.
 */
export function decryptCredential(cipherText: string): string {
  if (!cipherText || !cipherText.includes(':')) return '';
  try {
    const parts = cipherText.split(':');
    if (parts.length !== 3) return '';
    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, getSecretKey(), iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Decryption failure:', err);
    return '';
  }
}

/**
 * Generate HMAC SHA256 signature for Delta Exchange authenticated requests
 */
export function generateDeltaSignature(
  secret: string,
  method: string,
  timestamp: number,
  path: string,
  queryOrBody = ''
): string {
  const payload = method + timestamp + path + queryOrBody;
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}
