import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireApiUserOrgAccess } from '@/lib/auth';

/** GET: histórico de resultados de diagnóstico da org (para gráfico de evolução IC, IH, IP, ITSMO) */
export async function GET() {
  const auth = await requireApiUserOrgAccess(null);
  if (!auth.ok) return auth.response;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('supho_diagnostic_results')
    .select('id, campaign_id, computed_at, ic, ih, ip, itsmo, nivel, sample_size')
    .eq('org_id', auth.orgId)
    .order('computed_at', { ascending: true })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];
  const campaignIds = [...new Set(rows.map((r) => (r as { campaign_id: string }).campaign_id))];
  const { data: campaigns } = campaignIds.length > 0
    ? await admin.from('supho_diagnostic_campaigns').select('id, name').in('id', campaignIds)
    : { data: [] };
  const nameByCampaign = new Map((campaigns ?? []).map((c) => [(c as { id: string; name: string }).id, (c as { id: string; name: string }).name]));

  const result = rows.map((r: Record<string, unknown>) => ({
    id: r.id,
    campaign_id: r.campaign_id,
    campaign_name: nameByCampaign.get(r.campaign_id as string) ?? null,
    computed_at: r.computed_at,
    ic: Number(r.ic),
    ih: Number(r.ih),
    ip: Number(r.ip),
    itsmo: Number(r.itsmo),
    nivel: Number(r.nivel),
    sample_size: Number(r.sample_size ?? 0),
  }));

  return NextResponse.json(result);
}
