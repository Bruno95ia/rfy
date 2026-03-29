import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  computeBlockIndexUnrounded,
  computeDiagnosticResult,
  computeGaps,
  computeITSMOFromUnroundedPillars,
  computeNivel,
} from '@/lib/supho/calculations';
import {
  buildOrgContextBundleText,
  ORG_CONTEXT_DOCUMENT_DEFS,
  truncateOrgContextForResultJson,
} from '@/lib/org/context-documents';
import { appendKnowledgeFilesToBundle } from '@/lib/org/knowledge';
import { filterQuestionAveragesForCampaign } from '@/lib/supho/campaign-questions';
import { assessSystemsMaturity, applyIpPenalty } from '@/lib/supho/systems-maturity';
import type { SuphoQuestionAverage } from '@/types/supho';
import { requireApiCampaignAccess } from '@/lib/auth';

/**
 * POST /api/supho/diagnostic/compute
 * Body: { campaign_id: string }
 * Calcula IC, IH, IP, ITSMO, nível, gaps e subíndices a partir das respostas da campanha,
 * aplica ajuste de imaturidade de sistemas (CRM/ERP), incorpora documentos de contexto da org
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

    const access = await requireApiCampaignAccess(campaignId);
    if (!access.ok) return access.response;
    const campaign = access.campaign;

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

    const { data: campaignRow } = await admin
      .from('supho_diagnostic_campaigns')
      .select('question_ids, uploads_context_markdown')
      .eq('id', campaignId)
      .maybeSingle();
    const campaignQuestionIds =
      campaignRow && typeof campaignRow === 'object' && 'question_ids' in campaignRow
        ? (campaignRow as { question_ids?: string[] | null }).question_ids
        : null;
    const uploadsSynth =
      campaignRow &&
      typeof campaignRow === 'object' &&
      'uploads_context_markdown' in campaignRow
        ? String(
            (campaignRow as { uploads_context_markdown?: string | null }).uploads_context_markdown ?? ''
          ).trim()
        : '';

    const questionAveragesForCompute = filterQuestionAveragesForCampaign(
      questionAverages,
      campaignQuestionIds
    );

    if (questionAveragesForCompute.length === 0) {
      return NextResponse.json(
        {
          error:
            'Nenhuma resposta nas perguntas selecionadas para esta campanha. Ajuste a seleção em Diagnóstico ou confira as respostas importadas.',
        },
        { status: 400 }
      );
    }

    const result = computeDiagnosticResult(questionAveragesForCompute);
    const sampleSize = Math.max(...questionAveragesForCompute.map((q) => q.count), 0);

    const orgId = campaign.org_id;
    const [{ data: crmRows }, { data: cfgRow }, { data: ctxRows }] = await Promise.all([
      admin.from('crm_integrations').select('id').eq('org_id', orgId).eq('is_active', true).limit(1),
      admin.from('org_config').select('erp_integration_status').eq('org_id', orgId).maybeSingle(),
      admin.from('org_context_documents').select('doc_key, body_markdown').eq('org_id', orgId),
    ]);

    const hasActiveCrmIntegration = Array.isArray(crmRows) && crmRows.length > 0;
    const erpRaw = cfgRow && typeof cfgRow === 'object' && 'erp_integration_status' in cfgRow
      ? String((cfgRow as { erp_integration_status?: string }).erp_integration_status ?? 'unknown')
      : 'unknown';
    const erpIntegrationStatus =
      erpRaw === 'integrated' || erpRaw === 'not_integrated' ? erpRaw : 'unknown';

    const systemsAssessment = assessSystemsMaturity({
      hasActiveCrmIntegration,
      erpIntegrationStatus,
    });
    const ipAdjusted = applyIpPenalty(result.ip, systemsAssessment.ipPenalty);
    const rawIc = computeBlockIndexUnrounded(questionAveragesForCompute, 'A');
    const rawIh = computeBlockIndexUnrounded(questionAveragesForCompute, 'B');
    const rawIp = computeBlockIndexUnrounded(questionAveragesForCompute, 'C');
    const itsmoAdjusted = computeITSMOFromUnroundedPillars(rawIc, rawIh, ipAdjusted);
    const nivelAdjusted = computeNivel(itsmoAdjusted);
    const gapsAdjusted = computeGaps(result.ic, result.ih, ipAdjusted);

    const ctxForBundle = (ctxRows ?? []) as Array<{ doc_key: string; body_markdown: string | null }>;
    let bundle = buildOrgContextBundleText(ctxForBundle);
    if (uploadsSynth) {
      const block = `## Síntese dos uploads (campanha)\n\n${uploadsSynth}`;
      bundle = bundle.trim() ? `${bundle}\n\n---\n\n${block}` : block;
    }
    const { bundle: bundleWithKnowledge, knowledgeFilesUsed } = await appendKnowledgeFilesToBundle(
      admin,
      orgId,
      campaignId,
      bundle
    );
    bundle = bundleWithKnowledge;
    const orgContextSummary = truncateOrgContextForResultJson(bundle);

    const orgContextSectionCount = ORG_CONTEXT_DOCUMENT_DEFS.filter((def) => {
      const row = ctxForBundle.find((r) => r.doc_key === def.key);
      return row && String(row.body_markdown ?? '').trim().length > 0;
    }).length;

    const resultJson = {
      questionAverages: result.questionAverages,
      seed: null,
      /** Transparência: o que entrou no cálculo numérico vs texto de contexto (documentos não alteram IC/IH/IP). */
      sourcesUsedInCompute: {
        numericIndicesFrom: 'survey_likert_only' as const,
        surveyQuestionRowsUsed: questionAveragesForCompute.length,
        surveyQuestionRowsBeforeFilter: questionAverages.length,
        campaignQuestionFilterActive: Boolean(
          Array.isArray(campaignQuestionIds) && campaignQuestionIds.length > 0
        ),
        ipAdjustedBySystemsCrmErp: systemsAssessment.ipPenalty > 0,
        ipPenaltyPoints: systemsAssessment.ipPenalty,
        contextTextForSummary: {
          orgContextMarkdownSectionsFilled: orgContextSectionCount,
          uploadsSynthesisIncluded: Boolean(uploadsSynth),
          knowledgeFilesAttached: knowledgeFilesUsed.length,
          knowledgeFilenamesSample: knowledgeFilesUsed.slice(0, 15).map((f) => f.filename),
        },
        notePt:
          'IC, IH, IP e ITSMO derivam apenas das respostas Likert (1–5) agregadas por bloco, com a seleção de perguntas da campanha quando definida. Documentos de contexto, uploads (síntese) e ficheiros de Conhecimento compõem o texto resumido para leitura; não alteram os índices numéricos. O pilar IP pode ser reduzido por penalidade de maturidade de sistemas (CRM/ERP).',
      },
      indicesFromSurvey: {
        ic: result.ic,
        ih: result.ih,
        ip: result.ip,
        itsmo: result.itsmo,
        nivel: result.nivel,
        gapCH: result.gapCH,
        gapCP: result.gapCP,
      },
      systemsMaturity: {
        hasActiveCrmIntegration: systemsAssessment.hasActiveCrmIntegration,
        erpIntegrationStatus: systemsAssessment.erpIntegrationStatus,
        ipPenaltyApplied: systemsAssessment.ipPenalty,
        reasons: systemsAssessment.reasons,
      },
      orgContextPresent: bundle.trim().length > 0,
      orgContextSummary: orgContextSummary || null,
      knowledgeFilesUsed,
      uploadsSynthesisUsed: Boolean(uploadsSynth),
    };

    const { error: insertError } = await admin.from('supho_diagnostic_results').insert({
      org_id: campaign.org_id,
      campaign_id: campaignId,
      computed_at: new Date().toISOString(),
      ic: result.ic,
      ih: result.ih,
      ip: ipAdjusted,
      itsmo: itsmoAdjusted,
      nivel: nivelAdjusted,
      gap_c_h: gapsAdjusted.gapCH,
      gap_c_p: gapsAdjusted.gapCP,
      ise: result.ise,
      ipt: result.ipt,
      icl: result.icl,
      sample_size: sampleSize,
      result_json: resultJson,
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
        ip: ipAdjusted,
        itsmo: itsmoAdjusted,
        nivel: nivelAdjusted,
        gapCH: gapsAdjusted.gapCH,
        gapCP: gapsAdjusted.gapCP,
        ise: result.ise,
        ipt: result.ipt,
        icl: result.icl,
        sampleSize,
        indicesFromSurvey: resultJson.indicesFromSurvey,
        systemsMaturity: resultJson.systemsMaturity,
        orgContextPresent: resultJson.orgContextPresent,
        sourcesUsedInCompute: resultJson.sourcesUsedInCompute,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
