import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token')?.trim();
  const slug = searchParams.get('slug')?.trim();

  if (!token || !slug) {
    return NextResponse.json({ error: 'token e slug são obrigatórios' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: invite, error: inviteError } = await admin
    .from('form_invites')
    .select('id, email, name, form_slug, status')
    .eq('token', token)
    .eq('form_slug', slug)
    .single();

  if (inviteError || !invite) {
    return NextResponse.json({ error: 'Convite não encontrado ou inválido' }, { status: 404 });
  }
  if (invite.status === 'answered') {
    return NextResponse.json({ error: 'Este link já foi utilizado' }, { status: 400 });
  }
  if (!['pending', 'sent'].includes(invite.status)) {
    return NextResponse.json({ error: 'Convite não está mais disponível' }, { status: 400 });
  }

  const campaignId = slug.startsWith('supho-')
    ? slug.slice('supho-'.length).trim()
    : '';
  if (!campaignId) {
    return NextResponse.json({ error: 'Formulário SUPHO inválido' }, { status: 400 });
  }

  const { data: campaign, error: campaignError } = await admin
    .from('supho_diagnostic_campaigns')
    .select('id, org_id, name, question_ids')
    .eq('id', campaignId)
    .single();

  if (campaignError || !campaign) {
    return NextResponse.json({ error: 'Campanha não encontrada para este formulário' }, { status: 404 });
  }

  type QuestionRow = {
    id: string;
    block: string | null;
    internal_weight: number | null;
    question_text: string | null;
    item_code: string | null;
    sort_order: number | null;
  };

  let data: QuestionRow[] | null = null;
  let error: { message: string } | null = null;

  const base = admin
    .from('supho_questions')
    .select('id, block, internal_weight, question_text, item_code, sort_order')
    .order('sort_order', { ascending: true });

  const [rNull, rOrg] = await Promise.all([
    base.is('org_id', null),
    admin
      .from('supho_questions')
      .select('id, block, internal_weight, question_text, item_code, sort_order')
      .eq('org_id', campaign.org_id)
      .order('sort_order', { ascending: true }),
  ]);

  if (rNull.error) {
    error = rNull.error;
  } else if (rOrg.error) {
    error = rOrg.error;
  } else {
    const byId = new Map<string, QuestionRow>();
    for (const row of (rNull.data ?? []) as QuestionRow[]) byId.set(row.id, row);
    for (const row of (rOrg.data ?? []) as QuestionRow[]) byId.set(row.id, row);
    let list = [...byId.values()].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const campaignQuestionIds = campaign.question_ids as string[] | null | undefined;
    if (Array.isArray(campaignQuestionIds) && campaignQuestionIds.length > 0) {
      const allowedSet = new Set(campaignQuestionIds);
      list = list.filter((q) => allowedSet.has(q.id));
    }
    data = list;
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    formName: invite.form_slug,
    respondentName: invite.name,
    questions: data ?? [],
  });
}
