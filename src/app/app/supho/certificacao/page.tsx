import { requireAuth } from '@/lib/auth';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Award, Shield } from 'lucide-react';

export default async function CertificacaoPage() {
  await requireAuth();

  const levels = [
    { id: 'bronze', label: 'Bronze', desc: 'Critérios mínimos de Humano, Cultura e Performance atendidos.' },
    { id: 'prata', label: 'Prata', desc: 'Evidências consistentes e plano de manutenção definido.' },
    { id: 'ouro', label: 'Ouro', desc: 'Maturidade plena com evidências e governança sustentável.' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'App', href: '/app/dashboard' },
          { label: 'SUPHO', href: '/app/supho/maturidade' },
          { label: 'Certificação' },
        ]}
        title="Certificação SUPHO"
        subtitle="Auditoria, evidências e níveis Bronze, Prata e Ouro"
      />
      <Card className="border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
        <CardContent className="pt-6">
          <p className="mb-4 text-sm leading-relaxed text-[var(--color-text-muted)]">
            Dossiê de certificação com critérios por dimensão (Humano, Cultura, Performance), pontuação 0–3 por critério e evidências anexadas (atas, relatórios, dashboards).
          </p>
          <ul className="space-y-3">
            {levels.map((l) => (
              <li
                key={l.id}
                className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3"
              >
                <Award className="h-5 w-5 text-[var(--color-warning)]" />
                <div>
                  <span className="font-medium text-[var(--color-text)]">{l.label}</span>
                  <p className="text-sm text-[var(--color-text-muted)]">{l.desc}</p>
                </div>
                <Shield className="ml-auto h-5 w-5 text-[var(--color-success)]" />
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-[var(--color-text-muted)]">
            Registre runs de certificação e evidências para comprovar a maturidade da organização.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
