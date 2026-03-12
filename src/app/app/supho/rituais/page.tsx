import { requireAuth } from '@/lib/auth';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, CheckCircle2 } from 'lucide-react';

export default async function RituaisPage() {
  await requireAuth();

  const types = [
    { id: 'checkin_weekly', label: 'Check-in semanal', cadence: 'Semanal' },
    { id: 'performance_biweekly', label: 'Performance quinzenal', cadence: 'Quinzenal' },
    { id: 'feedback_monthly', label: 'Feedback mensal', cadence: 'Mensal' },
    { id: 'governance_quarterly', label: 'Governança trimestral', cadence: 'Trimestral' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'App', href: '/app/dashboard' },
          { label: 'SUPHO', href: '/app/supho/maturidade' },
          { label: 'Rituais' },
        ]}
        title="Rituais e cadência"
        subtitle="Check-in semanal, performance quinzenal, feedback mensal e governança trimestral"
      />
      <Card className="border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
        <CardContent className="pt-6">
          <p className="mb-4 text-sm leading-relaxed text-[var(--color-text-muted)]">
            Cadência de rituais registrada com decisões, ações e SLAs. Cada ritual tem pauta padrão e gera o Índice de Ritmo SUPHO (assiduidade, qualidade, execução).
          </p>
          <ul className="space-y-3">
            {types.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3"
              >
                <Calendar className="h-5 w-5 text-[var(--color-text-muted)]" />
                <div>
                  <span className="font-medium text-[var(--color-text)]">{t.label}</span>
                  <span className="ml-2 text-xs text-[var(--color-text-muted)]">{t.cadence}</span>
                </div>
                <CheckCircle2 className="ml-auto h-5 w-5 text-[var(--color-success)]" />
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-[var(--color-text-muted)]">
            Configure templates de ritual em sua organização para registrar realização e decisões.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
