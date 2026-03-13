/**
 * Cliente de servidor: sessão via cookie (getCurrentUser) e dados via PostgreSQL (createAdminClient).
 * Substitui createServerClient do Supabase; não depende mais de NEXT_PUBLIC_SUPABASE_*.
 */

import { cookies } from 'next/headers';
import { getSessionUser, getSessionCookieName } from '@/lib/auth-session';
import { createAdminClient } from '@/lib/supabase/admin';

export async function createClient() {
  const store = await cookies();
  const sessionId = store.get(getSessionCookieName())?.value ?? null;
  const user = await getSessionUser(sessionId);

  return {
    auth: {
      getUser: async () => ({
        data: { user: user ? { id: user.id, email: user.email } : null },
        error: null,
      }),
    },
    from: (table: string) => createAdminClient().from(table),
  };
}
