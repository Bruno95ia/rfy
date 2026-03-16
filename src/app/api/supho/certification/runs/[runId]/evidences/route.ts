import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireApiUserOrgAccess } from '@/lib/auth';

async function checkRunOrg(admin: ReturnType<typeof createAdminClient>, runId: string, orgId: string): Promise<boolean> {
  const { data } = await admin.from('supho_certification_runs').select('org_id').eq('id', runId).single();
  return data?.org_id === orgId;
}

/** GET: lista evidências de um run */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const auth = await requireApiUserOrgAccess(null);
  if (!auth.ok) return auth.response;

  const { runId } = await params;
  const admin = createAdminClient();
  if (!(await checkRunOrg(admin, runId, auth.orgId))) {
    return NextResponse.json({ error: 'Run não encontrado' }, { status: 404 });
  }

  const { data, error } = await admin
    .from('supho_certification_evidences')
    .select('id, criterion_id, score, evidence_url, notes, created_at')
    .eq('run_id', runId)
    .order('created_at');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

/** POST: upsert evidência (criterion_id, score, evidence_url, notes) */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const auth = await requireApiUserOrgAccess(null);
  if (!auth.ok) return auth.response;

  const { runId } = await params;
  const body = await req.json().catch(() => ({}));
  const criterionId = body?.criterion_id as string;
  const score = body?.score != null ? Number(body.score) : 0;
  const evidenceUrl = (body?.evidence_url as string)?.trim() || null;
  const notes = (body?.notes as string)?.trim() || null;

  if (!criterionId || score < 0 || score > 3) {
    return NextResponse.json({ error: 'criterion_id e score (0-3) obrigatórios' }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!(await checkRunOrg(admin, runId, auth.orgId))) {
    return NextResponse.json({ error: 'Run não encontrado' }, { status: 404 });
  }

  const { data: existing } = await admin
    .from('supho_certification_evidences')
    .select('id')
    .eq('run_id', runId)
    .eq('criterion_id', criterionId)
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    const { data: updated, error: updateErr } = await admin
      .from('supho_certification_evidences')
      .update({ score, evidence_url: evidenceUrl, notes })
      .eq('id', existing.id)
      .select('id, criterion_id, score, evidence_url, notes, created_at')
      .single();
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
    return NextResponse.json(updated);
  }

  const { data, error } = await admin
    .from('supho_certification_evidences')
    .insert({
      run_id: runId,
      criterion_id: criterionId,
      score,
      evidence_url: evidenceUrl,
      notes,
    })
    .select('id, criterion_id, score, evidence_url, notes, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
