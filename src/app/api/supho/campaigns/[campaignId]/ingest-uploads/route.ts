import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireApiCampaignAccess, getOrgMemberRole } from '@/lib/auth';
import { fetchKnowledgeFilesForCampaign, excerptForKnowledgeFile } from '@/lib/org/knowledge';
import { geminiGenerateText } from '@/lib/gemini';

/** Leitura de muitos ficheiros + Gemini pode exceder o default de 60s em serverless. */
export const maxDuration = 120;

const MAX_INPUT_GEMINI_CHARS = 110_000;
const MAX_OUTPUT_MARKDOWN = 24_000;

/**
 * POST /api/supho/campaigns/[campaignId]/ingest-uploads
 * Agrega todos os documentos do repositório (org + campanha), gera síntese para o diagnóstico
 * e grava em supho_diagnostic_campaigns.uploads_context_markdown.
 * Se GOOGLE_AI_API_KEY estiver definida, usa Gemini; caso contrário, gera um resumo estruturado sem IA.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const { campaignId } = await params;
  if (!campaignId) {
    return NextResponse.json({ error: 'campaign_id inválido' }, { status: 400 });
  }

  const access = await requireApiCampaignAccess(campaignId);
  if (!access.ok) return access.response;
  const { orgId, user } = access;

  const role = (await getOrgMemberRole(user.id, orgId)) ?? 'viewer';
  if (role !== 'owner' && role !== 'admin' && role !== 'manager') {
    return NextResponse.json(
      { error: 'Apenas owner, admin ou gestor pode sintetizar uploads para a campanha.' },
      { status: 403 }
    );
  }

  const admin = createAdminClient();
  const files = await fetchKnowledgeFilesForCampaign(admin, orgId, campaignId);
  if (files.length === 0) {
    return NextResponse.json(
      { error: 'Nenhum documento no repositório Conhecimento para esta organização/campanha. Envie ficheiros em Configurações → Conhecimento.' },
      { status: 400 }
    );
  }

  const parts: string[] = [];
  for (const f of files) {
    const scope = f.campaign_id ? 'campanha' : 'organização';
    const excerpt = await excerptForKnowledgeFile(f.storage_path, f.filename, f.mime_type, f.size_bytes);
    parts.push(`### ${f.filename} (${scope})\n\n${excerpt}`);
  }
  const raw = parts.join('\n\n---\n\n');
  const truncated =
    raw.length > MAX_INPUT_GEMINI_CHARS ? `${raw.slice(0, MAX_INPUT_GEMINI_CHARS)}\n\n[… texto truncado para síntese.]` : raw;

  const apiKey = process.env.GOOGLE_AI_API_KEY?.trim();
  let markdown: string;
  let usedGemini = false;

  if (apiKey) {
    usedGemini = true;
    const systemInstruction = `És um analista de maturidade organizacional e diagnóstico SUPHO (Cultura, Humano, Performance).
Recebes extratos de documentos internos (políticas, relatórios, formulários, planilhas).
Produz uma síntese em português (PT-BR) em Markdown:
- **Resumo executivo** (5–8 linhas): o que estes materiais revelam sobre a organização no contexto do diagnóstico.
- **Temas transversais**: lista com bullets (cultura, processo comercial, dados/CRM, pessoas, riscos).
- **Lacunas ou contradições** (se visíveis nos textos).
- **Relevância para ITSMO/maturidade**: 3–6 frases.
Não inventes factos que não estejam suportados pelos textos. Se o material for só metadados ou vazio, diz-o claramente.`;
    try {
      markdown = await geminiGenerateText({
        apiKey,
        systemInstruction,
        userContent: `Documentos agregados (trechos):\n\n${truncated}`,
        maxOutputTokens: 8192,
        responseMimeType: 'text/plain',
        temperature: 0.35,
      });
      markdown = markdown.trim().slice(0, MAX_OUTPUT_MARKDOWN);
      if (!markdown) {
        throw new Error('Resposta vazia do modelo');
      }
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : 'Falha ao sintetizar com Gemini' },
        { status: 502 }
      );
    }
  } else {
    const lines = files.map((f) => {
      const scope = f.campaign_id ? 'campanha' : 'organização';
      return `- **${f.filename}** (${scope}) — incluído no contexto bruto (${f.size_bytes != null ? `${Math.round(f.size_bytes / 1024)} KB` : 'tamanho ?'}).`;
    });
    markdown = [
      '## Síntese automática (sem Google Gemini)',
      '',
      'Configure `GOOGLE_AI_API_KEY` no servidor para obter uma análise gerada por IA. Enquanto isso, segue o inventário dos documentos que serão considerados no cálculo do diagnóstico:',
      '',
      ...lines,
      '',
      `_Total: ${files.length} ficheiro(s). O texto completo de cada um entra no diagnóstico ao calcular o resultado._`,
    ].join('\n');
  }

  const now = new Date().toISOString();
  const { error } = await admin
    .from('supho_diagnostic_campaigns')
    .update({
      uploads_context_markdown: markdown,
      uploads_context_updated_at: now,
      updated_at: now,
    })
    .eq('id', campaignId)
    .eq('org_id', orgId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    used_gemini: usedGemini,
    files_count: files.length,
    updated_at: now,
  });
}
