import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireApiUserOrgAccess } from '@/lib/auth';

const ALLOWED_TYPES = ['checkin_weekly', 'performance_biweekly', 'feedback_monthly', 'governance_quarterly'] as const;

const DEFAULT_TEMPLATES: Array<{ type: string; cadence: string; default_agenda: string }> = [
  { type: 'checkin_weekly', cadence: 'Semanal', default_agenda: 'Check-in semanal: prioridades, bloqueios e próximos passos.' },
  { type: 'performance_biweekly', cadence: 'Quinzenal', default_agenda: 'Performance quinzenal: métricas e revisão de metas.' },
  { type: 'feedback_monthly', cadence: 'Mensal', default_agenda: 'Feedback mensal: resultados e ajustes.' },
  { type: 'governance_quarterly', cadence: 'Trimestral', default_agenda: 'Governança trimestral: estratégia e OKRs.' },
];

/** GET: lista templates de rituais da org; garante os 4 padrões se não existirem */
export async function GET() {
  const auth = await requireApiUserOrgAccess(null);
  if (!auth.ok) return auth.response;

  const admin = createAdminClient();
  let { data: templates } = await admin
    .from('supho_ritual_templates')
    .select('id, type, cadence, default_agenda, created_at')
    .eq('org_id', auth.orgId)
    .order('type');

  if (!templates || templates.length === 0) {
    for (const t of DEFAULT_TEMPLATES) {
      await admin.from('supho_ritual_templates').insert({
        org_id: auth.orgId,
        type: t.type,
        cadence: t.cadence,
        default_agenda: t.default_agenda,
      });
    }
    const { data: created } = await admin
      .from('supho_ritual_templates')
      .select('id, type, cadence, default_agenda, created_at')
      .eq('org_id', auth.orgId)
      .order('type');
    templates = created ?? [];
  }

  return NextResponse.json(templates);
}

/** POST: cria um template de ritual customizado na org */
export async function POST(req: NextRequest) {
  const auth = await requireApiUserOrgAccess(null);
  if (!auth.ok) return auth.response;

  let body: { type?: string; cadence?: string; default_agenda?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 });
  }

  const type = (body?.type ?? '').trim();
  if (!type || !ALLOWED_TYPES.includes(type as (typeof ALLOWED_TYPES)[number])) {
    return NextResponse.json(
      { error: 'type obrigatório e deve ser um de: ' + ALLOWED_TYPES.join(', ') },
      { status: 400 }
    );
  }

  const cadence = (body?.cadence ?? '').trim() || null;
  const defaultAgenda = (body?.default_agenda ?? '').trim() || null;

  const admin = createAdminClient();
  const { data: created, error } = await admin
    .from('supho_ritual_templates')
    .insert({
      org_id: auth.orgId,
      type,
      cadence,
      default_agenda: defaultAgenda,
    })
    .select('id, type, cadence, default_agenda, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(created);
}
