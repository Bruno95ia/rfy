import { requireAuth } from '@/lib/auth';
import { PageHeader } from '@/components/layout/PageHeader';
import { CertificacaoClient } from './CertificacaoClient';

export default async function CertificacaoPage() {
  await requireAuth();

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'App', href: '/app/dashboard' },
          { label: 'SUPHO', href: '/app/supho/maturidade' },
          { label: 'Certificação' },
        ]}
        title="Certificação SUPHO"
        subtitle="Runs de certificação, evidências por critério e dossiê para impressão (PDF)"
      />
      <CertificacaoClient />
    </div>
  );
}
