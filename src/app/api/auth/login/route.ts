import { NextRequest, NextResponse } from 'next/server';
import {
  verifyLogin,
  createSession,
  getSessionCookieName,
  getSessionAgeMs,
  createUser,
} from '@/lib/auth-session';
import { provisionOrgOnFirstLogin } from '@/lib/auth';
import { appendFile } from 'node:fs/promises';

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

    // #region agent log
    appendFile(
      '/home/ubuntu/rfy/.cursor/debug-497d65.log',
      JSON.stringify({
        sessionId: '497d65',
        runId: 'pre-fix',
        hypothesisId: 'L5',
        location: 'src/app/api/auth/login/route.ts:16-25',
        message: 'Tentativa de login iniciada',
        data: { email },
        timestamp: Date.now(),
      }) + '\n'
    ).catch(() => {});
    // #endregion

    let user = await verifyLogin(email, password);

    // Se for o usuário de demo e ainda não existir, cria automaticamente na primeira tentativa
    if (!user && email === DEMO_EMAIL && password === DEMO_PASSWORD) {
      try {
        user = await createUser(email, password);
      } catch (e) {
        // Se já existir, tentamos logar novamente; caso contrário, propagamos erro genérico
        const msg = e instanceof Error ? e.message : String(e);

        // #region agent log
        appendFile(
          '/home/ubuntu/rfy/.cursor/debug-497d65.log',
          JSON.stringify({
            sessionId: '497d65',
            runId: 'pre-fix',
            hypothesisId: 'L6',
            location: 'src/app/api/auth/login/route.ts:31-41',
            message: 'Erro ao criar usuário demo',
            data: { email, errorMessage: msg },
            timestamp: Date.now(),
          }) + '\n'
        ).catch(() => {});
        // #endregion
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
      // #region agent log
      appendFile(
        '/home/ubuntu/rfy/.cursor/debug-497d65.log',
        JSON.stringify({
          sessionId: '497d65',
          runId: 'pre-fix',
          hypothesisId: 'L7',
          location: 'src/app/api/auth/login/route.ts:46-50',
          message: 'Login falhou (usuário nulo após verifyLogin/createUser)',
          data: { email },
          timestamp: Date.now(),
        }) + '\n'
      ).catch(() => {});
      // #endregion
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
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: Math.floor(getSessionAgeMs() / 1000),
    });

    // #region agent log
    appendFile(
      '/home/ubuntu/rfy/.cursor/debug-497d65.log',
      JSON.stringify({
        sessionId: '497d65',
        runId: 'pre-fix',
        hypothesisId: 'L8',
        location: 'src/app/api/auth/login/route.ts:53-65',
        message: 'Login bem-sucedido, sessão criada e cookie enviado',
        data: { email, userId: user.id, sessionId, next },
        timestamp: Date.now(),
      }) + '\n'
    ).catch(() => {});
    // #endregion

    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao fazer login';

    // #region agent log
    appendFile(
      '/home/ubuntu/rfy/.cursor/debug-497d65.log',
      JSON.stringify({
        sessionId: '497d65',
        runId: 'pre-fix',
        hypothesisId: 'L9',
        location: 'src/app/api/auth/login/route.ts:66-68',
        message: 'Exceção no handler de login',
        data: { errorMessage: msg },
        timestamp: Date.now(),
      }) + '\n'
    ).catch(() => {});
    // #endregion

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
