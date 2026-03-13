/**
 * Callback de auth (ex.: magic link). Com auth própria por sessão, não usamos mais.
 * Redireciona para next ou login.
 */
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const next = searchParams.get('next') ?? '/app/dashboard';
  const origin = request.url.replace(/\?.*$/, '').replace(/\/api\/auth\/callback\/?$/, '') || new URL(request.url).origin;
  return NextResponse.redirect(`${origin}/login?next=${encodeURIComponent(next)}`);
}
