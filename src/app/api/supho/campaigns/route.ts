import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/** GET: lista campanhas da org do usuário */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { data: members } = await supabase.from('org_members').select('org_id').eq('user_id', user.id).limit(1);
  const orgId = members?.[0]?.org_id;
  if (!orgId) return NextResponse.json({ error: 'Organização não encontrada' }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('supho_diagnostic_campaigns')
    .select('id, name, status, started_at, closed_at, created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

/** POST: cria campanha de diagnóstico */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { data: members } = await supabase.from('org_members').select('org_id').eq('user_id', user.id).limit(1);
  const orgId = members?.[0]?.org_id;
  if (!orgId) return NextResponse.json({ error: 'Organização não encontrada' }, { status: 400 });

  const body = await req.json();
  const name = (body?.name as string)?.trim() || 'Nova campanha';
  const status = body?.status ?? 'draft';

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('supho_diagnostic_campaigns')
    .insert({ org_id: orgId, name, status })
    .select('id, name, status, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
