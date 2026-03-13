import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';

const schema = z.object({
  token: z.string().min(1, 'token é obrigatório'),
  slug: z.string().min(1, 'slug é obrigatório'),
  answers: z
    .array(
      z.object({
        question_id: z.string().min(1),
        value: z.number().min(1).max(5),
      })
    )
    .min(1, 'answers deve ter ao menos um item'),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Payload inválido', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { token, slug, answers } = parsed.data;
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
    .select('id, org_id')
    .eq('id', campaignId)
    .single();

  if (campaignError || !campaign) {
    return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });
  }

  const questionIds = [...new Set(answers.map((answer) => answer.question_id))];
  const [globalQuestions, orgQuestions] = await Promise.all([
    admin
      .from('supho_questions')
      .select('id')
      .in('id', questionIds)
      .is('org_id', null),
    admin
      .from('supho_questions')
      .select('id')
      .in('id', questionIds)
      .eq('org_id', campaign.org_id),
  ]);
  if (globalQuestions.error) {
    return NextResponse.json({ error: globalQuestions.error.message }, { status: 500 });
  }
  if (orgQuestions.error) {
    return NextResponse.json({ error: orgQuestions.error.message }, { status: 500 });
  }

  const validQuestionIds = new Set<string>();
  for (const row of (globalQuestions.data ?? []) as Array<{ id: string }>) validQuestionIds.add(row.id);
  for (const row of (orgQuestions.data ?? []) as Array<{ id: string }>) validQuestionIds.add(row.id);
  if (validQuestionIds.size !== questionIds.length) {
    return NextResponse.json({ error: 'Payload inválido: contém perguntas desconhecidas' }, { status: 400 });
  }

  const { data: respondent, error: respError } = await admin
    .from('supho_respondents')
    .insert({
      campaign_id: campaign.id,
      role: invite.name ?? invite.email,
      responded_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (respError || !respondent) {
    return NextResponse.json({ error: 'Falha ao criar respondente' }, { status: 500 });
  }

  const rows = answers.map((a) => ({
    respondent_id: respondent.id,
    question_id: a.question_id,
    value: Math.round(Number(a.value)),
  }));

  const { error: insertError } = await admin.from('supho_answers').upsert(rows, {
    onConflict: 'respondent_id,question_id',
    ignoreDuplicates: false,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  await admin
    .from('form_invites')
    .update({ status: 'answered', responded_at: new Date().toISOString() })
    .eq('id', invite.id);

  return NextResponse.json({ ok: true });
}
