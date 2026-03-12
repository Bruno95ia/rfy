import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/** POST: insere respostas em lote para um respondente (verifica acesso via respondent → campaign → org) */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const body = await req.json();

  const schema = z.object({
    respondent_id: z.string().min(1, 'respondent_id é obrigatório'),
    answers: z
      .array(
        z.object({
          question_id: z.string().min(1),
          value: z.number().min(1).max(5),
        })
      )
      .min(1, 'answers[] deve ter pelo menos um item'),
  });

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Payload inválido', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { respondent_id: respondentId, answers } = parsed.data;

  const admin = createAdminClient();
  const { data: respondent } = await admin
    .from('supho_respondents')
    .select('id, campaign_id')
    .eq('id', respondentId)
    .single();
  if (!respondent) return NextResponse.json({ error: 'Respondente não encontrado' }, { status: 404 });

  const { data: campaign } = await admin
    .from('supho_diagnostic_campaigns')
    .select('org_id')
    .eq('id', respondent.campaign_id)
    .single();
  if (!campaign) return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });

  const { data: members } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('org_id', campaign.org_id)
    .eq('user_id', user.id);
  if (!members?.length) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 });

  const rows = answers
    .filter((a) => a?.question_id && typeof a?.value === 'number' && a.value >= 1 && a.value <= 5)
    .map((a) => ({
      respondent_id: respondentId,
      question_id: a.question_id,
      value: Math.round(Number(a.value)),
    }));

  if (rows.length === 0) return NextResponse.json({ error: 'Nenhuma resposta válida (value 1-5)' }, { status: 400 });

  const { error: insertError } = await admin.from('supho_answers').upsert(rows, {
    onConflict: 'respondent_id,question_id',
    ignoreDuplicates: false,
  });

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  return NextResponse.json({ ok: true, count: rows.length });
}
