/**
 * POST /api/ai/copilot-revenue — Copiloto de Receita (visão do vendedor).
 * Gera próximos passos, mensagens e oportunidades de expansão por conta.
 * Usa Gemini com prompt em docs/COPILOTO-RECEITA-VISAO-VENDEDOR.md.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuthAndOrgAccess } from '@/lib/auth';

const GEMINI_MODEL = 'gemini-2.5-flash';

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
        temperature: 0.4,
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
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
}

const SYSTEM_PROMPT = `Você é um Copiloto de Receita (Revenue Intelligence) para um Executivo de Contas B2B que vende infraestrutura de TI (cloud, backup, disaster recovery, segurança, monitoramento, serviços gerenciados).

OBJETIVO
Gerar oportunidades reais de expansão (upsell/cross-sell) e próximos passos acionáveis para cada conta, priorizando tickets maiores.

PRINCÍPIOS
1) Não invente fatos. Use SOMENTE os dados fornecidos no input.
2) Se faltar informação essencial para uma boa recomendação, preencha "missing_data" com o que falta e reduza "confidence".
3) Priorize recomendações que: a) aumentem MRR/ticket (pacotes, DR, segurança avançada, redundância, gestão); b) reduzam risco operacional (continuidade, backup, DR, segurança); c) tenham alta probabilidade de aceitação (fit por perfil e gatilhos).
4) Produza saídas curtas, diretas e executáveis: próxima ação + mensagem pronta (LinkedIn e e-mail) + agenda de reunião + perguntas de discovery.
5) Personalize a narrativa por PERSONA: CFO/Financeiro (risco financeiro, previsibilidade, ROI, compliance); TI (performance, SLA, segurança, arquitetura); Operações (continuidade, impacto em produção, tempo de resposta); CEO/Dono (crescimento, risco, foco no core, escala).
6) Use PLAYBOOKS quando fornecidos. Se não houver playbook, use boas práticas gerais.

RESTRIÇÕES
- Não use linguagem genérica "de marketing". Seja consultivo e específico, sem prometer números ou garantias sem base.
- Mensagens para LinkedIn são geradas; o envio é responsabilidade humana.

FORMATO DE SAÍDA (JSON único, sem markdown)
{
  "confidence": "high" | "medium" | "low",
  "missing_data": ["item1", "item2"] ou null,
  "next_action": "string curta e acionável",
  "message_linkedin": "string pronta para uso",
  "message_email": "string pronta para uso (assunto + corpo ou só corpo)",
  "meeting_agenda": "string ou array de tópicos",
  "discovery_questions": ["pergunta1", "pergunta2", "..."],
  "expansion_opportunities": [{"type": "upsell"|"cross-sell", "description": "...", "rationale": "..."}]
}
Responda EXCLUSIVAMENTE com esse JSON válido.`;

export type CopilotRevenueRequestBody = {
  org_id: string;
  account_name?: string;
  account_deals?: Array<{
    stage_name?: string | null;
    value?: number | null;
    title?: string | null;
    days_in_stage?: number | null;
  }>;
  persona?: 'CFO' | 'TI' | 'Operações' | 'CEO' | null;
  products_held?: string[] | null;
  playbook?: string | null;
};

export type CopilotRevenueResponse = {
  confidence: 'high' | 'medium' | 'low';
  missing_data: string[] | null;
  next_action: string;
  message_linkedin: string;
  message_email: string;
  meeting_agenda: string | string[];
  discovery_questions: string[];
  expansion_opportunities?: Array<{
    type: 'upsell' | 'cross-sell';
    description: string;
    rationale: string;
  }>;
  generated_at?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CopilotRevenueRequestBody;
    const orgId = body?.org_id ?? null;
    const auth = await requireAuthAndOrgAccess(orgId);
    if (!auth.ok) return auth.response;

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'GOOGLE_AI_API_KEY não configurada. Adicione em .env.local para o Copiloto de Receita.',
        },
        { status: 503 }
      );
    }

    let accountName = body.account_name?.trim() || null;
    let accountDeals = body.account_deals ?? null;
    const persona = body.persona ?? null;
    const productsHeld = body.products_held ?? null;
    const playbook = body.playbook ?? null;

    const admin = createAdminClient();

    if (accountName && !accountDeals) {
      const { data: opps } = await admin
        .from('opportunities')
        .select('company_name, stage_name, value, title, stage_timing_days')
        .eq('org_id', auth.orgId)
        .eq('status', 'open')
        .ilike('company_name', `%${accountName}%`);
      const list = opps ?? [];
      accountDeals = list.map((o) => ({
        stage_name: o.stage_name,
        value: o.value,
        title: o.title,
        days_in_stage: o.stage_timing_days,
      }));
      if (list.length > 0 && list[0].company_name) {
        accountName = list[0].company_name;
      }
    }

    const context = {
      account_name: accountName || 'Conta não identificada',
      account_deals: accountDeals ?? [],
      persona: persona || 'não informada',
      products_held: productsHeld ?? [],
      playbook: playbook || 'não informado',
    };

    const userContent = `Gere a saída do Copiloto de Receita para esta conta. Use SOMENTE os dados abaixo. Se não houver deals, indique em missing_data e reduza confidence.

${JSON.stringify(context, null, 2)}

Responda apenas com o JSON no formato especificado, sem markdown.`;

    const text = await generateWithGemini(apiKey, SYSTEM_PROMPT, userContent);

    let parsed: CopilotRevenueResponse;
    try {
      const cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```\s*$/i, '').trim();
      parsed = JSON.parse(cleaned) as CopilotRevenueResponse;
    } catch {
      parsed = {
        confidence: 'low',
        missing_data: ['Resposta do modelo em formato inválido'],
        next_action: 'Revisar dados da conta e tentar novamente.',
        message_linkedin: '',
        message_email: '',
        meeting_agenda: '',
        discovery_questions: [],
      };
    }

    return NextResponse.json({
      ...parsed,
      generated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[CopilotRevenue]', e);
    return NextResponse.json(
      { error: String(e instanceof Error ? e.message : e) },
      { status: 500 }
    );
  }
}
