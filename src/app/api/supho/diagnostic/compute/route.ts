import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { computeDiagnosticResult } from '@/lib/supho/calculations';
import type { SuphoQuestionAverage } from '@/types/supho';

/**
 * POST /api/supho/diagnostic/compute
 * Body: { campaign_id: string }
 * Calcula IC, IH, IP, ITSMO, nível, gaps e subíndices a partir das respostas da campanha
 * e persiste em supho_diagnostic_results.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const schema = z.object({
      campaign_id: z.string().min(1, 'campaign_id é obrigatório'),
    });
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Payload inválido', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const campaignId = parsed.data.campaign_id;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { data: campaign } = await supabase
      .from('supho_diagnostic_campaigns')
      .select('id, org_id')
      .eq('id', campaignId)
      .single();

    if (!campaign) {
      return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });
    }

    const { data: members } = await supabase
      .from('org_members')
      .select('org_id')
      .eq('org_id', campaign.org_id)
      .eq('user_id', user.id);
    if (!members?.length) {
      return NextResponse.json({ error: 'Sem acesso a esta organização' }, { status: 403 });
    }

    const admin = createAdminClient();

    const { data: respondents } = await admin
      .from('supho_respondents')
      .select('id')
      .eq('campaign_id', campaignId);
    const respondentIds = (respondents ?? []).map((r) => r.id);
    if (respondentIds.length === 0) {
      return NextResponse.json(
        { error: 'Campanha sem respondentes' },
        { status: 400 }
      );
    }

    const { data: answers } = await admin
      .from('supho_answers')
      .select('question_id, value')
      .in('respondent_id', respondentIds);

    if (!answers?.length) {
      return NextResponse.json(
        { error: 'Nenhuma resposta encontrada' },
        { status: 400 }
      );
    }

    const questionIds = [...new Set(answers.map((a) => a.question_id))];
    const { data: questions } = await admin
      .from('supho_questions')
      .select('id, block, internal_weight, item_code')
      .in('id', questionIds);

    const questionMap = new Map(
      (questions ?? []).map((q) => [q.id, { block: q.block, internal_weight: q.internal_weight ?? 1, item_code: q.item_code ?? null }])
    );

    const byQuestion = new Map<string, { sum: number; count: number; block: string; internal_weight: number; item_code: string | null }>();
    for (const a of answers) {
      const q = questionMap.get(a.question_id);
      if (!q) continue;
      const key = a.question_id;
      if (!byQuestion.has(key)) {
        byQuestion.set(key, {
          sum: 0,
          count: 0,
          block: q.block,
          internal_weight: q.internal_weight,
          item_code: q.item_code,
        });
      }
      const rec = byQuestion.get(key)!;
      rec.sum += Number(a.value);
      rec.count += 1;
    }

    const questionAverages: SuphoQuestionAverage[] = [];
    for (const [questionId, rec] of byQuestion) {
      if (rec.count === 0) continue;
      questionAverages.push({
        questionId,
        block: rec.block as 'A' | 'B' | 'C',
        internalWeight: rec.internal_weight as 1 | 2 | 3,
        itemCode: rec.item_code ?? undefined,
        average: rec.sum / rec.count,
        count: rec.count,
      });
    }

    if (questionAverages.length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma resposta válida para calcular índices' },
        { status: 400 }
      );
    }

    const result = computeDiagnosticResult(questionAverages);
    const sampleSize = Math.max(...questionAverages.map((q) => q.count), 0);

    const { error: insertError } = await admin.from('supho_diagnostic_results').insert({
      org_id: campaign.org_id,
      campaign_id: campaignId,
      computed_at: new Date().toISOString(),
      ic: result.ic,
      ih: result.ih,
      ip: result.ip,
      itsmo: result.itsmo,
      nivel: result.nivel,
      gap_c_h: result.gapCH,
      gap_c_p: result.gapCP,
      ise: result.ise,
      ipt: result.ipt,
      icl: result.icl,
      sample_size: sampleSize,
      result_json: {
        questionAverages: result.questionAverages,
        seed: null,
      },
    });

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      result: {
        ic: result.ic,
        ih: result.ih,
        ip: result.ip,
        itsmo: result.itsmo,
        nivel: result.nivel,
        gapCH: result.gapCH,
        gapCP: result.gapCP,
        ise: result.ise,
        ipt: result.ipt,
        icl: result.icl,
        sampleSize,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
