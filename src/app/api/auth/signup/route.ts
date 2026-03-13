import { NextRequest, NextResponse } from 'next/server';
import {
  createUser,
  createSession,
  getSessionCookieName,
  getSessionAgeMs,
} from '@/lib/auth-session';
import { provisionOrgOnFirstLogin } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const email = form.get('email')?.toString()?.trim();
    const password = form.get('password')?.toString();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Senha deve ter no mínimo 6 caracteres' },
        { status: 400 }
      );
    }

    const user = await createUser(email, password);
    const sessionId = await createSession(user.id);
    await provisionOrgOnFirstLogin(user.id);

    const next = request.nextUrl.searchParams.get('next') ?? '/app/dashboard';
    const res = NextResponse.json({ ok: true, next });
    res.cookies.set(getSessionCookieName(), sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: Math.floor(getSessionAgeMs() / 1000),
    });
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao criar conta';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
