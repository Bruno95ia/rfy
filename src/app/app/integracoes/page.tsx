import { requireAuth } from '@/lib/auth';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plug, ExternalLink } from 'lucide-react';
import Link from 'next/link';

const CONNECTORS = [
  { id: 'piperun', name: 'PipeRun', description: 'Exportação CSV (atual)', status: 'active', href: '/app/uploads' },
  { id: 'pipedrive', name: 'Pipedrive', description: 'API REST', status: 'coming', href: null },
  { id: 'hubspot', name: 'HubSpot', description: 'API REST', status: 'coming', href: null },
  { id: 'salesforce', name: 'Salesforce', description: 'API REST', status: 'coming', href: null },
];

export default async function IntegracoesPage() {
  await requireAuth();

  return (
    <div className="space-y-8">
      <PageHeader
        breadcrumbs={[{ label: 'App', href: '/app/dashboard' }, { label: 'Integrações' }]}
        title="Centro de integrações"
        subtitle="Conectores de CRM e fontes de dados. Configure na central de uploads ou aguarde conectores nativos."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CONNECTORS.map((c) => (
          <Card key={c.id} className="border-[var(--color-border)]">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Plug className="h-4 w-4 text-[var(--color-text-muted)]" />
                  {c.name}
                </CardTitle>
                <Badge variant={c.status === 'active' ? 'success' : 'outline'}>
                  {c.status === 'active' ? 'Ativo' : 'Em breve'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-[var(--color-text-muted)]">{c.description}</p>
              {c.href && (
                <Link
                  href={c.href}
                  className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-primary)] hover:underline"
                >
                  Configurar <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
