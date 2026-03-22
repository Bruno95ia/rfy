import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth-session';

const AUTH_CHECK_TIMEOUT_MS = 5000;

export default async function Home() {
  let user = null;
  try {
    user = await Promise.race([
      getCurrentUser(),
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('Auth check timeout')), AUTH_CHECK_TIMEOUT_MS)
      ),
    ]);
  } catch {
    // Timeout ou erro de DB: redireciona para login para não travar a tela
    redirect('/login');
  }
  if (user) redirect('/app/dashboard');
  redirect('/login');
}
