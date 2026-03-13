import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth';

/**
 * Redireciona /dashboard para /app/dashboard (Torre de Controle).
 * Use localhost:3000/dashboard ou localhost:3000/app/dashboard — ambos mostram o mesmo painel.
 */
export default async function DashboardRedirect() {
  await requireAuth();
  redirect('/app/dashboard');
}
