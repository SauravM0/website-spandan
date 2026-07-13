import crypto from 'crypto';

const sensitiveKey = /(password|secret|token|authorization|cookie|phone|email|name|address|dob|clinical|note|message)/i;

export function hashTelemetry(value: string | undefined): string | null {
  if (!value) return null;
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 5) return '[REDACTED_DEPTH]';
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [
    key,
    sensitiveKey.test(key) ? '[REDACTED]' : redact(item, depth + 1),
  ]));
}
