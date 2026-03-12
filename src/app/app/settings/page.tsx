import { requireAuth } from '@/lib/auth';
import { PageHeader } from '@/components/layout/PageHeader';
import { SettingsClient } from './SettingsClient';

export default async function SettingsPage() {
  await requireAuth();

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'App', href: '/app/dashboard' }, { label: 'Configurações' }]}
        title="Configurações"
        subtitle="Controle central da organização, parâmetros de risco, notificações e integração CRM."
      />
      <SettingsClient />
    </>
  );
}
