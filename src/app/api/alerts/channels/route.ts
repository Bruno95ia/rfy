/**
 * GET /api/alerts/channels?org_id=...
 * POST /api/alerts/channels (body: { org_id, channel_type, target, config_json? })
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireAuthAndOrgAccess } from '@/lib/auth';

const postBodySchema = z.object({
  org_id: z.string().uuid('org_id inválido'),
  channel_type: z.enum(['email', 'slack', 'webhook', 'whatsapp']),
  target: z.string().min(1, 'target obrigatório'),
  config_json: z.record(z.string(), z.unknown()).optional().default({}),
});

export async function GET(req: NextRequest) {
  const orgId = req.nextUrl.searchParams.get('org_id');
  const auth = await requireAuthAndOrgAccess(orgId);
  if (!auth.ok) return auth.response;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('alert_channels')
    .select('id, org_id, channel_type, target, config_json, is_active, created_at')
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
    return NextResponse.json(
      { error: 'Payload inválido', details: parsed.error.issues },
      { status: 400 }
    );
  }
  const { org_id: orgId, channel_type, target, config_json } = parsed.data;
  const auth = await requireAuthAndOrgAccess(orgId);
  if (!auth.ok) return auth.response;
  if (orgId !== auth.orgId) {
    return NextResponse.json({ error: 'org_id inválido', details: [] }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('alert_channels')
    .insert({
      org_id: orgId,
      channel_type,
      target,
      config_json,
      is_active: true,
    })
    .select('id, org_id, channel_type, target, config_json, is_active, created_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
