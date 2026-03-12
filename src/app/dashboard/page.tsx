import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * Redireciona /dashboard para /app/dashboard (Torre de Controle).
 * Use localhost:3000/dashboard ou localhost:3000/app/dashboard — ambos mostram o mesmo painel.
 */
export default async function DashboardRedirect() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  redirect('/app/dashboard');
}
