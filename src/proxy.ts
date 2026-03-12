import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const REQUEST_ID_HEADER = 'x-request-id';
function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

const hasSupabaseConfig = () => {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
  if (!url || !key) return false;
  if (url.includes('xxx') || url.includes('seu-projeto')) return false;
  if (key.includes('seu-') || key === 'eyJ...') return false;
  return true;
};

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const requestId = request.headers.get(REQUEST_ID_HEADER) ?? generateRequestId();
  const response = NextResponse.next({
    request: { headers: request.headers },
  });
  response.headers.set(REQUEST_ID_HEADER, requestId);

  const hasConfig = hasSupabaseConfig();
  if (!hasConfig) {
    if (path !== '/setup' && path !== '/login' && path !== '/signup') {
      return NextResponse.redirect(new URL('/setup', request.url));
    }
    return response;
  }

  let user = null;
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { data } = await supabase.auth.getUser();
    user = data?.user ?? null;
  } catch {
    return response;
  }

  const isApp = request.nextUrl.pathname.startsWith('/app');
  const isAuth =
    request.nextUrl.pathname === '/login' ||
    request.nextUrl.pathname === '/signup';

  if (isApp && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (isAuth && user) {
    return NextResponse.redirect(new URL('/app/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/', '/app/:path*', '/login', '/signup', '/setup', '/api/:path*'],
};
