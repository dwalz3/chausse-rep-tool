/**
 * Auth helpers — HMAC-SHA256 cookie signing via Web Crypto API
 * Cookie name: 'rep_session'
 * Value format: `${rep}:${hmacHex}`
 */

import { RepIdentity } from '@/types';

const COOKIE_NAME = 'rep_session';

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET env var is not set');
  return secret;
}

async function hmacHex(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  if (a.length !== b.length) return false;
  const enc = new TextEncoder();
  const ka = await crypto.subtle.importKey('raw', enc.encode('key'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
  // Use XOR comparison via subtle to avoid timing leaks
  const aBytes = enc.encode(a);
  const bBytes = enc.encode(b);
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) {
    diff |= aBytes[i] ^ bBytes[i];
  }
  void ka; // suppress unused warning
  return diff === 0;
}

export async function signCookie(rep: string): Promise<string> {
  const secret = getSecret();
  const mac = await hmacHex(rep, secret);
  return `${rep}:${mac}`;
}

export async function verifyCookie(value: string): Promise<RepIdentity | null> {
  try {
    const secret = getSecret();
    const colonIdx = value.indexOf(':');
    if (colonIdx === -1) return null;
    const rep = value.slice(0, colonIdx);
    const mac = value.slice(colonIdx + 1);

    if (rep !== 'austin' && rep !== 'jason' && rep !== 'dave' && rep !== 'alejandra') return null;

    const expected = await hmacHex(rep, secret);
    const ok = await timingSafeEqual(mac, expected);
    return ok ? (rep as RepIdentity) : null;
  } catch {
    return null;
  }
}

export { COOKIE_NAME };
