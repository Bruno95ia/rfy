import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuthAndOrgAccess } from '@/lib/auth';

const GEMINI_MODEL = 'gemini-2.5-flash';

type CompanyRow = {
  company_name: string | null;
  value: number | null;
  status: string;
  stage_name: string | null;
};

type GeminiPart = { text?: string };
type GeminiContent = { parts?: GeminiPart[] };
type GeminiCandidate = { content?: GeminiContent };
type GeminiResponse = { candidates?: GeminiCandidate[] };

async function generateWithGemini(
  apiKey: string,
  systemInstruction: string,
  userContent: string
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: 'user', parts: [{ text: userContent }] }],
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
      },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `Gemini API: ${res.status}`);
  }
  const data = (await res.json()) as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
  return text;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const orgId = (body?.org_id as string | undefined) ?? null;
    const auth = await requireAuthAndOrgAccess(orgId);
    if (!auth.ok) return auth.response;

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GOOGLE_AI_API_KEY não configurada. Adicione em .env.local para análise de ICP.' },
        { status: 503 }
      );
    }

    const admin = createAdminClient();
    const { data: opps } = await admin
      .from('opportunities')
      .select('company_name, value, status, stage_name')
      .eq('org_id', auth.orgId)
      .in('status', ['won', 'lost', 'open']);

    const won = (opps ?? []).filter((o) => o.status === 'won') as CompanyRow[];
    const lost = (opps ?? []).filter((o) => o.status === 'lost') as CompanyRow[];
    const open = (opps ?? []).filter((o) => o.status === 'open') as CompanyRow[];

    const companiesWon = won
      .map((o) => ({ nome: o.company_name ?? 'N/A', valor: o.value ?? 0, etapa: o.stage_name ?? '' }))
      .slice(0, 50);
    const companiesLost = lost
      .map((o) => ({ nome: o.company_name ?? 'N/A', valor: o.value ?? 0, etapa: o.stage_name ?? '' }))
      .slice(0, 50);
    const companiesOpen = open
      .map((o) => ({ nome: o.company_name ?? 'N/A', valor: o.value ?? 0, etapa: o.stage_name ?? '' }))
      .slice(0, 30);

    const context = {
      ganhos: companiesWon,
      perdidos: companiesLost,
      em_andamento: companiesOpen,
      total_ganhos: won.length,
      total_perdidos: lost.length,
      total_abertos: open.length,
      win_rate: won.length + lost.length > 0 ? (won.length / (won.length + lost.length)) * 100 : 0,
      ticket_medio_ganho:
        companiesWon.length > 0
          ? companiesWon.reduce((s, c) => s + c.valor, 0) / companiesWon.length
          : 0,
    };

    const systemInstruction = `Você é um consultor de vendas B2B especializado em ICP (Ideal Customer Profile). 
Analise os dados de oportunidades (ganhas, perdidas, em andamento) e produza:
1. Um resumo executivo: qual ICP a empresa está atingindo hoje (segmento, ticket, perfil)
2. Um estudo detalhado por segmento: analise padrões nos nomes das empresas ganhas vs perdidas, 
   faça inferências sobre setor/porte pelo nome, valor médio por perfil, e recomendações de foco.
Seja objetivo e use dados concretos. Responda em português.`;

    const userContent = `Analise estes dados comerciais e gere o estudo de ICP:

**Ganhas (${context.total_ganhos}):** ${JSON.stringify(context.ganhos, null, 0).slice(0, 3000)}

**Perdidas (${context.total_perdidos}):** ${JSON.stringify(context.perdidos, null, 0).slice(0, 2000)}

**Em andamento (${context.total_abertos}):** ${JSON.stringify(context.em_andamento, null, 0).slice(0, 1000)}

**Métricas:** Win rate ${context.win_rate.toFixed(1)}%, ticket médio ganho R$ ${context.ticket_medio_ganho.toLocaleString('pt-BR')}

Gere um único objeto JSON com:
1. **icp_summary**: string com parágrafo resumindo qual ICP está sendo atingido (2-4 frases)
2. **icp_study**: objeto com array "empresas_analisadas" onde cada item tem: 
   { "segmento_inferido", "padrao", "valor_medio", "win_rate_segmento", "recomendacao" }
   Inclua pelo menos 2-4 segmentos identificados a partir dos nomes das empresas.
Responda apenas com o JSON, sem markdown.`;

    const text = await generateWithGemini(apiKey, systemInstruction, userContent);

    let parsed: { icp_summary?: string; icp_study?: { empresas_analisadas?: unknown[] } };
    try {
      const cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```\s*$/i, '').trim();
      parsed = JSON.parse(cleaned) as typeof parsed;
    } catch {
      // Fallback: tenta extrair icp_summary com regex (evita armazenar JSON bruto)
      const match = text.match(/"icp_summary"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      const extracted = match?.[1]?.replace(/\\"/g, '"').trim();
      parsed = {
        icp_summary: extracted || 'Análise gerada. Formato parcialmente reconhecido.',
        icp_study: { empresas_analisadas: [] },
      };
    }

    const icpSummary = parsed.icp_summary ?? 'Análise indisponível.';
    const icpStudyJson = parsed.icp_study ?? { empresas_analisadas: [] };

    await admin.from('org_icp_studies').insert({
      org_id: auth.orgId,
      icp_summary: icpSummary,
      icp_study_json: icpStudyJson,
      model_used: GEMINI_MODEL,
    });

    return NextResponse.json({
      icp_summary: icpSummary,
      icp_study: icpStudyJson,
      generated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[ICP]', e);
    return NextResponse.json(
      { error: String(e instanceof Error ? e.message : e) },
      { status: 500 }
    );
  }
}
