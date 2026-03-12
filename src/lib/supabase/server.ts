import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

function getEnv(name: string): string {
  const value = process.env[name];
  if (value == null || value === '') {
    throw new Error(
      `Variável de ambiente ausente: ${name}. Configure em .env.local (veja .env.example).`
    );
  }
  return value;
}

export async function createClient() {
  const cookieStore = await cookies();
  const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseAnonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Ignore in middleware
        }
      },
    },
  });
}
