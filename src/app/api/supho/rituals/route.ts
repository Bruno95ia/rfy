import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireApiUserOrgAccess } from '@/lib/auth';

/** GET: lista ocorrências de rituais (rituals) da org, opcionalmente por template_id */
export async function GET(req: NextRequest) {
  const auth = await requireApiUserOrgAccess(null);
  if (!auth.ok) return auth.response;

  const templateId = req.nextUrl.searchParams.get('template_id');
  const admin = createAdminClient();

  const { data: templateRows } = await admin
    .from('supho_ritual_templates')
    .select('id')
    .eq('org_id', auth.orgId);
  const ids = (templateRows ?? []).map((t: { id: string }) => t.id);
  if (ids.length === 0) return NextResponse.json([]);

  let query = admin
    .from('supho_rituals')
    .select('id, template_id, scheduled_at, conducted_at, notes, created_at')
    .in('template_id', ids)
    .order('scheduled_at', { ascending: false })
    .limit(100);

  if (templateId && ids.includes(templateId)) {
    query = query.eq('template_id', templateId);
  }

  const { data: rituals, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: templateDetails } = await admin
    .from('supho_ritual_templates')
    .select('id, type, cadence, default_agenda')
    .in('id', ids);
  const detailMap = new Map((templateDetails ?? []).map((t: { id: string }) => [t.id, t]));

  const enriched = (rituals ?? []).map((r: { template_id: string; [k: string]: unknown }) => ({
    ...r,
    template: detailMap.get(r.template_id),
  }));

  return NextResponse.json(enriched);
}

/** POST: cria uma ocorrência de ritual */
export async function POST(req: NextRequest) {
  const auth = await requireApiUserOrgAccess(null);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const templateId = body?.template_id as string | undefined;
  const scheduledAt = body?.scheduled_at as string | undefined;
  const notes = (body?.notes as string)?.trim() || null;

  if (!templateId || !scheduledAt) {
    return NextResponse.json(
      { error: 'template_id e scheduled_at são obrigatórios' },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: template } = await admin
    .from('supho_ritual_templates')
    .select('id, org_id')
    .eq('id', templateId)
    .single();

  if (!template || template.org_id !== auth.orgId) {
    return NextResponse.json({ error: 'Template não encontrado' }, { status: 404 });
  }

  const { data, error } = await admin
    .from('supho_rituals')
    .insert({
      template_id: templateId,
      scheduled_at: scheduledAt,
      notes,
    })
    .select('id, template_id, scheduled_at, conducted_at, notes, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
