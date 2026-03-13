import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireApiUserOrgAccess } from '@/lib/auth';

/** GET: lista planos PAIP da org */
export async function GET() {
  const auth = await requireApiUserOrgAccess(null);
  if (!auth.ok) return auth.response;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('supho_paip_plans')
    .select('id, name, status, period_start, period_end, diagnostic_result_id, created_at')
    .eq('org_id', auth.orgId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

/** POST: cria plano PAIP */
export async function POST(req: NextRequest) {
  const auth = await requireApiUserOrgAccess(null);
  if (!auth.ok) return auth.response;

  const body = await req.json();

  const schema = z.object({
    name: z.string().trim().min(1).optional(),
    diagnostic_result_id: z.string().trim().min(1).nullable().optional(),
    period_start: z.string().trim().min(1).nullable().optional(),
    period_end: z.string().trim().min(1).nullable().optional(),
  });

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Payload inválido', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const name = (parsed.data.name ?? '').trim() || 'Plano PAIP';
  const diagnostic_result_id = parsed.data.diagnostic_result_id ?? null;
  const period_start = parsed.data.period_start ?? null;
  const period_end = parsed.data.period_end ?? null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('supho_paip_plans')
    .insert({
      org_id: auth.orgId,
      name,
      diagnostic_result_id,
      period_start,
      period_end,
      status: 'draft',
    })
    .select('id, name, status, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
