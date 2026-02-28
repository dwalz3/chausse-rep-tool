import { NextRequest, NextResponse } from 'next/server';
import { signCookie, COOKIE_NAME } from '@/lib/auth';
import { RepIdentity } from '@/types';

// Email → internal rep identity + env var key
const EMAIL_MAP: Record<string, { rep: RepIdentity; envKey: string }> = {
  'austin@chausseselections.com':    { rep: 'austin',    envKey: 'AUSTIN_PASS' },
  'jason@chausseselections.com':     { rep: 'jason',     envKey: 'JASON_PASS' },
  'dave@chausseselections.com':      { rep: 'dave',      envKey: 'DAVE_PASS' },
  'alejandra@chausseselections.com': { rep: 'alejandra', envKey: 'ALEJANDRA_PASS' },
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { email?: string; password?: string };
  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
  }

  const entry = EMAIL_MAP[email.toLowerCase().trim()];
  if (!entry) {
    return NextResponse.json({ error: 'Incorrect email or password' }, { status: 401 });
  }

  const correctPass = process.env[entry.envKey];
  if (!correctPass || password !== correctPass) {
    return NextResponse.json({ error: 'Incorrect email or password' }, { status: 401 });
  }

  const cookieValue = await signCookie(entry.rep);

  const res = NextResponse.json({ ok: true, rep: entry.rep });
  res.cookies.set(COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return res;
}
