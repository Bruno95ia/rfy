import { createBrowserClient } from '@supabase/ssr';

function getEnv(name: string): string {
  const value = process.env[name];
  if (value == null || value === '') {
    throw new Error(
      `Variável de ambiente ausente: ${name}. Configure em .env.local (veja .env.example).`
    );
  }
  return value;
}

export function createClient() {
  const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseAnonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
