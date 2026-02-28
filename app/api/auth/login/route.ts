import { NextRequest, NextResponse } from 'next/server';
import { signCookie, COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { rep?: string; password?: string };
  const { rep, password } = body;

  if (!rep || !password) {
    return NextResponse.json({ error: 'Missing rep or password' }, { status: 400 });
  }

  if (rep !== 'austin' && rep !== 'jason') {
    return NextResponse.json({ error: 'Invalid rep' }, { status: 401 });
  }

  const envKey = rep === 'austin' ? 'AUSTIN_PASS' : 'JASON_PASS';
  const correctPass = process.env[envKey];

  if (!correctPass || password !== correctPass) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }

  const cookieValue = await signCookie(rep);

  const res = NextResponse.json({ ok: true, rep });
  res.cookies.set(COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return res;
}
