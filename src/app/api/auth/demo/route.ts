import { NextRequest, NextResponse } from 'next/server';
import {
  createUser,
  createSession,
  getSessionCookieName,
  getSessionCookieOptions,
  getUserByEmail,
} from '@/lib/auth-session';
import { provisionOrgOnFirstLogin } from '@/lib/auth';

const DEMO_EMAIL = 'admin@demo.rfy.local';
const DEMO_PASSWORD = 'Adminrv';

export async function GET(_req: NextRequest) {
  try {
    let user = await getUserByEmail(DEMO_EMAIL);
    if (!user) {
      try {
        user = await createUser(DEMO_EMAIL, DEMO_PASSWORD);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes('já está cadastrado')) {
          return NextResponse.json(
            { error: 'Erro ao preparar usuário demo', details: msg },
            { status: 500 }
          );
        }
        user = await getUserByEmail(DEMO_EMAIL);
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Não foi possível obter usuário demo' },
        { status: 500 }
      );
    }

    const sessionId = await createSession(user.id);
    await provisionOrgOnFirstLogin(user.id);

    const res = NextResponse.redirect(new URL('/app/dashboard', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'));
    res.cookies.set(getSessionCookieName(), sessionId, getSessionCookieOptions());
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao criar sessão demo';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

