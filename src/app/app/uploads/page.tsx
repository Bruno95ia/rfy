import { requireAuth, getOrgIdForUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { UploadsList } from './UploadsList';
import { UploadForm } from './UploadForm';
import { DemoPackForm } from './DemoPackForm';
import { UploadsTrack } from './UploadsTrack';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock3, AlertTriangle, Package } from 'lucide-react';

export default async function UploadsPage() {
  const { user } = await requireAuth();
  const supabase = await createClient();

  let orgId = (await supabase.from('org_members').select('org_id').limit(1)).data?.[0]?.org_id;
  if (!orgId) {
    orgId = await getOrgIdForUser(user.id);
  }
  if (!orgId) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500">
        Carregando organização...
      </div>
    );
  }

  const { data: uploads } = await supabase
    .from('uploads')
    .select('id, filename, kind, status, error_message, created_at, processed_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(50);
  const uploadRows = uploads ?? [];
  const doneCount = uploadRows.filter((u) => u.status === 'done').length;
  const processingCount = uploadRows.filter((u) => u.status === 'processing').length;
  const failedCount = uploadRows.filter((u) => u.status === 'failed').length;

  return (
    <div className="space-y-8">
      <UploadsTrack />
      <PageHeader
        breadcrumbs={[{ label: 'App', href: '/app/dashboard' }, { label: 'Uploads' }]}
        title="Uploads"
        subtitle="Central de ingestão de dados. Envie CSVs, acompanhe processamento e valide falhas."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="success" className="gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {doneCount} concluídos
            </Badge>
            <Badge variant="processing" className="gap-1.5">
              <Clock3 className="h-3.5 w-3.5" />
              {processingCount} processando
            </Badge>
            {failedCount > 0 && (
              <Badge variant="danger" className="gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                {failedCount} com erro
              </Badge>
            )}
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4 text-indigo-600" />
            Alimentar demonstração completa
          </CardTitle>
          <p className="text-sm text-slate-500">
            Envie as duas planilhas (oportunidades + atividades) de uma vez. O sistema processa, vincula e gera o relatório automaticamente — ideal para demonstrar o fluxo do início ao fim.
          </p>
        </CardHeader>
        <CardContent>
          <DemoPackForm orgId={orgId} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <UploadForm orgId={orgId} />
        </CardContent>
      </Card>

      <UploadsList uploads={uploadRows} />
    </div>
  );
}
