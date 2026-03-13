import { NextResponse, type NextRequest } from 'next/server';

const REQUEST_ID_HEADER = 'x-request-id';
const SESSION_COOKIE = 'rfy_session';

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function hasSessionCookie(request: NextRequest): boolean {
  const value = request.cookies.get(SESSION_COOKIE)?.value?.trim();
  if (!value) return false;
  // UUID format (8-4-4-4-12)
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const requestId = request.headers.get(REQUEST_ID_HEADER) ?? generateRequestId();
  const response = NextResponse.next({
    request: { headers: request.headers },
  });
  response.headers.set(REQUEST_ID_HEADER, requestId);

  // Sem Supabase: proteção por cookie de sessão (validação real em getCurrentUser nas rotas).
  const hasSession = hasSessionCookie(request);

  const isApp = path.startsWith('/app');
  const isAuth = path === '/login' || path === '/signup';

  if (isApp && !hasSession) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (isAuth && hasSession) {
    return NextResponse.redirect(new URL('/app/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/', '/app/:path*', '/login', '/signup', '/setup', '/api/:path*'],
};
