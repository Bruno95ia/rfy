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

const NO_HTML_CACHE =
  'private, no-cache, no-store, must-revalidate, max-age=0';

function withNoHtmlCache(res: NextResponse): NextResponse {
  res.headers.set('Cache-Control', NO_HTML_CACHE);
  return res;
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const requestId = request.headers.get(REQUEST_ID_HEADER) ?? generateRequestId();
  const response = NextResponse.next({
    request: { headers: request.headers },
  });
  response.headers.set(REQUEST_ID_HEADER, requestId);
  withNoHtmlCache(response);

  // Sem Supabase: proteção por cookie de sessão (validação real em getCurrentUser nas rotas).
  const hasSession = hasSessionCookie(request);

  const isApp = path.startsWith('/app');
  const isAuth = path === '/login' || path === '/signup';

  if (isApp && !hasSession) {
    return withNoHtmlCache(NextResponse.redirect(new URL('/login', request.url)));
  }
  if (isAuth && hasSession) {
    return withNoHtmlCache(NextResponse.redirect(new URL('/app/dashboard', request.url)));
  }

  return response;
}

/**
 * Exclui `/_next/static` e `/_next/image` — esses ficam com cache longo (hash por build).
 * Resto (HTML, API, etc.) com no-store para evitar ChunkLoadError após deploy.
 */
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
