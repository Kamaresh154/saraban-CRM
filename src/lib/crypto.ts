import crypto from 'crypto';

// AES-256-CBC requires a 32-byte (256-bit) key and a 16-byte (128-bit) IV.
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

// Get key from environment, fallback to a secure default for dev if not set
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY
  ? crypto.createHash('sha256').update(process.env.ENCRYPTION_KEY).digest()
  : Buffer.from('32byteslongsecretkeyforvdconnect!!', 'utf-8');

export function encrypt(text: string): string {
  if (!text) return text;
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (err) {
    console.error('Encryption failed:', err);
    return text;
  }
}

export function decrypt(encryptedText: string): string {
  if (!encryptedText || !encryptedText.includes(':')) return encryptedText;
  try {
    const [ivHex, encryptedHex] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Decryption failed, returning raw text:', err);
    return encryptedText;
  }
}
