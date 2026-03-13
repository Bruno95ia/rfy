import { requireAuth, provisionOrgOnFirstLogin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getOrgIdForUser } from '@/lib/auth';
import { AppShell } from '@/components/layout/AppShell';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireAuth();

  await provisionOrgOnFirstLogin(user.id);

  const supabase = await createClient();
  const orgId = await getOrgIdForUser(user.id);

  let orgName = 'Minha organização';
  if (orgId) {
    const { data: org } = await supabase.from('orgs').select('name').eq('id', orgId).single();
    orgName = org?.name ?? orgName;
  }

  return (
    <AppShell userEmail={user.email ?? ''} orgName={orgName}>
      {children}
    </AppShell>
  );
}
