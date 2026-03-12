import { createClient } from '@supabase/supabase-js';

function getEnv(name: string): string {
  const value = process.env[name];
  if (value == null || value === '') {
    throw new Error(
      `Variável de ambiente ausente: ${name}. Configure em .env.local (veja .env.example).`
    );
  }
  return value;
}

/**
 * Cliente Supabase com SERVICE_ROLE_KEY - usar SOMENTE no servidor.
 * Nunca exponha no client.
 */
export function createAdminClient() {
  const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
