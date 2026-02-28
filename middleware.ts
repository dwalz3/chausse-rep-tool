import { NextRequest, NextResponse } from 'next/server';
import { verifyCookie, COOKIE_NAME } from '@/lib/auth';

export const config = {
  matcher: ['/((?!login|api/auth|_next|favicon|icons).*)'],
};

export async function middleware(req: NextRequest) {
  const cookieValue = req.cookies.get(COOKIE_NAME)?.value;

  if (!cookieValue) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('from', req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  const rep = await verifyCookie(cookieValue);
  if (!rep) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('from', req.nextUrl.pathname);
    const res = NextResponse.redirect(loginUrl);
    res.cookies.delete(COOKIE_NAME);
    return res;
  }

  // Pass through with rep identity header for server components
  const res = NextResponse.next();
  res.headers.set('x-rep', rep);
  return res;
}
