import { NextResponse } from 'next/server';
import { getSessionCookieName } from '@/lib/auth-session';
import { cookies } from 'next/headers';
import { deleteSession } from '@/lib/auth-session';

export async function POST() {
  const store = await cookies();
  const sessionId = store.get(getSessionCookieName())?.value;
  if (sessionId) {
    await deleteSession(sessionId);
  }
  const res = NextResponse.redirect(
    new URL('/login', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
    { status: 302 }
  );
  res.cookies.set(getSessionCookieName(), '', { path: '/', maxAge: 0 });
  return res;
}
