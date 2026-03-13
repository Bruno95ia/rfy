import { requireAuth, getOrgIdForUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/layout/PageHeader';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PAIPClient } from './PAIPClient';

export default async function PAIPPage() {
  const { user } = await requireAuth();
  const supabase = await createClient();

  const orgId = await getOrgIdForUser(user.id);
  if (!orgId) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500">
        Carregando organização...
      </div>
    );
  }

  const { data: plans } = await supabase
    .from('supho_paip_plans')
    .select('id, name, status, period_start, period_end, created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'App', href: '/app/dashboard' },
          { label: 'SUPHO', href: '/app/supho/maturidade' },
          { label: 'PAIP' },
        ]}
        title="PAIP — Plano de Ação"
        subtitle="Plano 90–180 dias: gaps, objetivos, KRs e ações vinculados ao diagnóstico e ao CRM"
      />
      <PAIPClient initialPlans={(plans ?? []) as { id: string; name: string; status: string; period_start: string; period_end: string; created_at: string }[]} />
    </div>
  );
}
