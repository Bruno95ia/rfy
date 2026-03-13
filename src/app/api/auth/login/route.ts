import { NextRequest, NextResponse } from 'next/server';
import {
  verifyLogin,
  createSession,
  getSessionCookieName,
  getSessionAgeMs,
  createUser,
} from '@/lib/auth-session';
import { provisionOrgOnFirstLogin } from '@/lib/auth';

const DEMO_EMAIL = 'admin@demo.rfy.local';
const DEMO_PASSWORD = 'Adminrv';

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

    let user = await verifyLogin(email, password);

    // Se for o usuário de demo e ainda não existir, cria automaticamente na primeira tentativa
    if (!user && email === DEMO_EMAIL && password === DEMO_PASSWORD) {
      try {
        user = await createUser(email, password);
      } catch (e) {
        // Se já existir, tentamos logar novamente; caso contrário, propagamos erro genérico
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes('já está cadastrado')) {
          return NextResponse.json(
            { error: 'Erro ao preparar usuário demo para login' },
            { status: 500 }
          );
        }
        user = await verifyLogin(email, password);
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Email ou senha incorretos' },
        { status: 401 }
      );
    }

    const sessionId = await createSession(user.id);
    await provisionOrgOnFirstLogin(user.id);

    const next = request.nextUrl.searchParams.get('next') ?? '/app/dashboard';
    const res = NextResponse.json({ ok: true, next });
    res.cookies.set(getSessionCookieName(), sessionId, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: Math.floor(getSessionAgeMs() / 1000),
    });
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao fazer login';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
