/**
 * GET /api/alerts/rules?org_id=...
 * POST /api/alerts/rules (body: { org_id, rule_key, severity?, threshold?, enabled?, cooldown_minutes?, channel_ids? })
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireAuthAndOrgAccess } from '@/lib/auth';

const postBodySchema = z.object({
  org_id: z.string().uuid('org_id inválido'),
  rule_key: z.enum([
    'rfy_index_below',
    'receita_inflada_above',
    'rfy_abaixo_do_limiar',
    'receita_inflada_acima_do_limiar',
    'pipeline_stagnation',
  ]),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional().default('medium'),
  threshold: z.number().nullable().optional(),
  enabled: z.boolean().optional().default(true),
  cooldown_minutes: z.number().min(0).optional().default(30),
  channel_ids: z.array(z.string()).optional().default([]),
});

export async function GET(req: NextRequest) {
  const orgId = req.nextUrl.searchParams.get('org_id');
  const auth = await requireAuthAndOrgAccess(orgId);
  if (!auth.ok) return auth.response;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('alert_rules')
    .select('id, org_id, rule_key, severity, threshold, enabled, cooldown_minutes, channel_ids, created_at')
    .eq('org_id', auth.orgId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido', details: [] }, { status: 400 });
  }
  const parsed = postBodySchema.safeParse(body);
  if (!parsed.success) {
    const details = parsed.error.flatten().fieldErrors;
    return NextResponse.json(
      { error: 'Payload inválido', details: parsed.error.issues },
      { status: 400 }
    );
  }
  const { org_id: orgId, rule_key, severity, threshold, enabled, cooldown_minutes, channel_ids } = parsed.data;
  const auth = await requireAuthAndOrgAccess(orgId);
  if (!auth.ok) return auth.response;
  if (orgId !== auth.orgId) {
    return NextResponse.json({ error: 'org_id inválido', details: [] }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('alert_rules')
    .insert({
      org_id: orgId,
      rule_key,
      severity,
      threshold: threshold ?? null,
      enabled,
      cooldown_minutes,
      channel_ids,
    })
    .select('id, org_id, rule_key, severity, threshold, enabled, cooldown_minutes, channel_ids, created_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
