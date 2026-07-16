import crypto from 'node:crypto';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(input: Buffer): string {
  let bits = '';
  for (const byte of input) bits += byte.toString(2).padStart(8, '0');
  let output = '';
  for (let index = 0; index < bits.length; index += 5) {
    output += alphabet[parseInt(bits.slice(index, index + 5).padEnd(5, '0'), 2)];
  }
  return output;
}

function base32Decode(input: string): Buffer {
  const normalized = input.toUpperCase().replace(/=|\s|-/g, '');
  let bits = '';
  for (const character of normalized) {
    const value = alphabet.indexOf(character);
    if (value < 0) throw new Error('Invalid base32 secret.');
    bits += value.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(parseInt(bits.slice(index, index + 8), 2));
  }
  return Buffer.from(bytes);
}

export const generateMfaSecret = (): string => base32Encode(crypto.randomBytes(20));

export function totpAt(secret: string, counter: number): string {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const digest = crypto.createHmac('sha1', base32Decode(secret)).update(buffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, '0');
}

export function verifyTotp(
  secret: string,
  code: string,
  lastCounter: number | null | undefined,
  now = Date.now()
): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const current = Math.floor(now / 30_000);
  for (const counter of [current - 1, current, current + 1]) {
    if (lastCounter !== null && lastCounter !== undefined && counter <= lastCounter) continue;
    const expected = Buffer.from(totpAt(secret, counter));
    const supplied = Buffer.from(code);
    if (expected.length === supplied.length && crypto.timingSafeEqual(expected, supplied))
      return counter;
  }
  return null;
}

const encryptionKey = (key: string) => crypto.createHash('sha256').update(key).digest();

export function encryptMfaSecret(secret: string, key: string, version: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(key), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return [
    version,
    iv.toString('base64url'),
    ciphertext.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
  ].join('.');
}

export function decryptMfaSecret(payload: string, key: string, expectedVersion: string): string {
  const [version, iv, ciphertext, tag] = payload.split('.');
  if (version !== expectedVersion || !iv || !ciphertext || !tag)
    throw new Error('MFA key version mismatch.');
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    encryptionKey(key),
    Buffer.from(iv, 'base64url')
  );
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

export function generateRecoveryCodes(count = 8): string[] {
  return Array.from({ length: count }, () => {
    const raw = crypto.randomBytes(8).toString('hex').toUpperCase();
    return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12)}`;
  });
}

export const recoveryCodeHash = (staffUserId: string, code: string): string =>
  crypto
    .createHash('sha256')
    .update(`${staffUserId}:${code.toUpperCase().replace(/[^A-F0-9]/g, '')}`)
    .digest('hex');

export const authenticationFingerprint = (scope: 'account' | 'ip', value: string): string =>
  crypto.createHash('sha256').update(`${scope}:${value.trim().toLowerCase()}`).digest('hex');
