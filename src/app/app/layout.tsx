import { requireAuth, provisionOrgOnFirstLogin, getOrgIdForUser } from '@/lib/auth';
import { getOrgDisplayName } from '@/lib/org/display';
import { AppShell } from '@/components/layout/AppShell';
import { isAiServiceConfigured } from '@/lib/ai-deployment';

function isNextRedirectError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'digest' in error &&
    typeof (error as { digest: unknown }).digest === 'string' &&
    (error as { digest: string }).digest.startsWith('NEXT_REDIRECT')
  );
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireAuth();

  try {
    await provisionOrgOnFirstLogin(user.id);
  } catch (e) {
    if (isNextRedirectError(e)) throw e;
    console.error('[AppLayout] provisionOrgOnFirstLogin', e);
  }

  const orgId = await getOrgIdForUser(user.id);

  const orgName = orgId ? await getOrgDisplayName(orgId) : 'Minha organização';

  return (
    <AppShell userEmail={user.email ?? ''} orgName={orgName} aiActive={isAiServiceConfigured()}>
      {children}
    </AppShell>
  );
}
