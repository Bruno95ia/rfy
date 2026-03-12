import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    redirect('/setup');
  }
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) redirect('/app/dashboard');
  } catch {
    // Supabase indisponível ou erro de auth: envia para login
  }
  redirect('/login');
}
