import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/** GET: lista respondentes de uma campanha (query: campaign_id) */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get('campaign_id');
  if (!campaignId) return NextResponse.json({ error: 'campaign_id é obrigatório' }, { status: 400 });

  const admin = createAdminClient();
  const { data: campaign } = await admin
    .from('supho_diagnostic_campaigns')
    .select('id, org_id')
    .eq('id', campaignId)
    .single();
  if (!campaign) return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });

  const { data: members } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('org_id', campaign.org_id)
    .eq('user_id', user.id);
  if (!members?.length) return NextResponse.json({ error: 'Sem acesso a esta campanha' }, { status: 403 });

  const { data, error } = await admin
    .from('supho_respondents')
    .select('id, responded_at, created_at')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

/** POST: cria respondente em uma campanha (verifica acesso à org da campanha) */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const body = await req.json();
  const campaignId = body?.campaign_id as string | undefined;
  if (!campaignId) return NextResponse.json({ error: 'campaign_id é obrigatório' }, { status: 400 });

  const admin = createAdminClient();
  const { data: campaign } = await admin
    .from('supho_diagnostic_campaigns')
    .select('id, org_id')
    .eq('id', campaignId)
    .single();
  if (!campaign) return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });

  const { data: members } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('org_id', campaign.org_id)
    .eq('user_id', user.id);
  if (!members?.length) return NextResponse.json({ error: 'Sem acesso a esta campanha' }, { status: 403 });

  const time_area = (body?.time_area as string)?.trim() || null;
  const unit = (body?.unit as string)?.trim() || null;
  const role = (body?.role as string)?.trim() || null;

  const { data, error } = await admin
    .from('supho_respondents')
    .insert({
      campaign_id: campaignId,
      time_area,
      unit,
      role,
      responded_at: new Date().toISOString(),
    })
    .select('id, campaign_id, responded_at, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
