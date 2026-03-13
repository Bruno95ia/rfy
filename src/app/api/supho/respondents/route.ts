import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireApiCampaignAccess } from '@/lib/auth';

/** GET: lista respondentes de uma campanha (query: campaign_id) */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get('campaign_id');
  if (!campaignId) return NextResponse.json({ error: 'campaign_id é obrigatório' }, { status: 400 });

  const access = await requireApiCampaignAccess(campaignId);
  if (!access.ok) return access.response;

  const admin = createAdminClient();
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
  const body = await req.json();
  const campaignId = body?.campaign_id as string | undefined;
  if (!campaignId) return NextResponse.json({ error: 'campaign_id é obrigatório' }, { status: 400 });

  const access = await requireApiCampaignAccess(campaignId);
  if (!access.ok) return access.response;

  const time_area = (body?.time_area as string)?.trim() || null;
  const unit = (body?.unit as string)?.trim() || null;
  const role = (body?.role as string)?.trim() || null;

  const admin = createAdminClient();
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
