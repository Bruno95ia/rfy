/**
 * Cliente browser: auth é feita via API (/api/auth/login, signup) e sessão em cookie.
 * Este módulo existe apenas para compatibilidade; não use createClient() no client para auth.
 * Para checar usuário no servidor, use getCurrentUser() de @/lib/auth-session.
 */
export function createClient(): never {
  throw new Error(
    'Auth no browser é feita via /api/auth/login e /api/auth/signup. Use fetch com credentials: "include".'
  );
}
