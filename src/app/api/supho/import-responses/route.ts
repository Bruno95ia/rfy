import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireApiAuth, requireApiUserOrgAccess } from '@/lib/auth';
import { checkRateLimit } from '@/lib/ratelimit';
import { checkOrgLimit, recordUsageEvent, appendAuditLog } from '@/lib/billing';
import type { SuphoImportGroup } from '@/lib/supho/import-external-responses';
import {
  getOrderedQuestionIdsForCampaign,
  parseMatrixFromSuphoImportBuffer,
  parseSuphoImportFromBuffer,
  parseSuphoImportJson,
  parseSuphoImportMatrix,
  parseWideFormatMatrix,
  shouldPreferWideFormat,
  validateImportGroupsAgainstCampaign,
  persistSuphoImportGroups,
} from '@/lib/supho/import-external-responses';
import { persistSuphoImportKnowledgeSnapshot } from '@/lib/org/knowledge';

const MAX_FILE_BYTES = 12 * 1024 * 1024;

const postJsonSchema = z.object({
  orgId: z.string().uuid(),
  campaign_id: z.string().uuid(),
  /** Mesmo formato do arquivo JSON: { campaign_id, responses: [...] } */
  responses: z.array(z.unknown()).min(1),
});

/** Modelo formato LARGO (tipo exportação Google Forms / Luma / Excel “Diagnóstico SUPHO — … (respostas)”). */
const CSV_TEMPLATE_WIDE =
  '# Diagnóstico SUPHO — modelo LARGO (uma linha por respondente)\n' +
  '# Igual às planilhas “Foodtest / Luma / Thiago (respostas)”: metadados à esquerda; depois uma coluna por pergunta (1 a 5).\n' +
  '# Número e ordem das colunas de pergunta devem alinhar com a campanha e /api/supho/questions (pode apagar colunas a mais ou copiar do seu export).\n' +
  '# Linhas com # são ignoradas na importação.\n' +
  '#\n' +
  'Carimbo de data/hora,Endereço de e-mail,Nome completo,' +
  [
    'Pergunta 1',
    'Pergunta 2',
    'Pergunta 3',
    'Pergunta 4',
    'Pergunta 5',
    'Pergunta 6',
    'Pergunta 7',
    'Pergunta 8',
    'Pergunta 9',
    'Pergunta 10',
    'Pergunta 11',
    'Pergunta 12',
    'Pergunta 13',
    'Pergunta 14',
    'Pergunta 15',
    'Pergunta 16',
    'Pergunta 17',
    'Pergunta 18',
  ].join(',') +
  '\n' +
  '# Exemplo (apague ou substitua pelas suas linhas de resposta):\n' +
  '# 28/03/2026 15:42:00,exemplo@empresa.com,Exemplo Nome,4,3,5,4,3,5,4,3,5,4,3,5,4,3,5,4,3,5,4\n';

/** Modelo formato LONGO (uma linha por resposta; question_id = UUID). */
const CSV_TEMPLATE_LONG =
  '# Diagnóstico SUPHO — modelo LONGO (uma linha por resposta × pergunta)\n' +
  '# question_id = UUID em /api/supho/questions. value = inteiro 1 a 5.\n' +
  '#\n' +
  'respondent,question_id,value,time_area,unit,external_id\n';

/** GET: modelo CSV. ?variant=wide (padrão, tipo Luma/Google) | ?variant=long */
export async function GET(req: NextRequest) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const variant = req.nextUrl.searchParams.get('variant')?.toLowerCase();
  const useLong = variant === 'long' || variant === 'longo';

  const body = '\ufeff' + (useLong ? CSV_TEMPLATE_LONG : CSV_TEMPLATE_WIDE);
  const filename = useLong ? 'modelo-supho-import-longo.csv' : 'modelo-supho-import-largo.csv';

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;
  const { user } = auth;

  const identifier = `supho-import:${user.id}`;
  const { limited } = await checkRateLimit(identifier);
  if (limited) {
    return NextResponse.json({ error: 'Muitas requisições. Tente novamente em alguns minutos.' }, { status: 429 });
  }

  const contentType = req.headers.get('content-type') ?? '';

  let orgId: string;
  let campaignId: string;
  let groups: SuphoImportGroup[] | undefined;
  /** Se formato longo falhar, tentamos largo após carregar a campanha. */
  let multipartWideMatrix: string[][] | null = null;
  let multipartLongResult: { groups: SuphoImportGroup[]; errors: string[] } | null = null;
  /** Google/Luma: sem coluna question_id — não parsear como longo (evita erro “question_id vazio”). */
  let multipartPreferWide = false;
  let multipartArtifact:
    | { buf: Buffer; filename: string; mimeType: string; sizeBytes: number }
    | null = null;

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const cId = formData.get('campaign_id') as string | null;
    const oId = formData.get('orgId') as string | null;

    if (!file || !cId || !oId) {
      return NextResponse.json(
        { error: 'Envie file, campaign_id e orgId (multipart).' },
        { status: 400 }
      );
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'Arquivo muito grande (máx. 12 MB).' }, { status: 413 });
    }

    orgId = oId.trim();
    campaignId = cId.trim();

    const buf = Buffer.from(await file.arrayBuffer());
    const fname = (file.name || 'import.csv').toLowerCase();
    const mimeLower = (file.type || '').toLowerCase();
    const isJsonUpload = fname.endsWith('.json') || mimeLower.includes('json');

    if (isJsonUpload) {
      const parsedFile = parseSuphoImportFromBuffer(buf, file.name, { mimeType: file.type });
      if (!parsedFile.ok) {
        return NextResponse.json({ error: parsedFile.error }, { status: 400 });
      }
      if (parsedFile.kind !== 'json') {
        return NextResponse.json({ error: 'Arquivo JSON inválido para importação SUPHO' }, { status: 400 });
      }
      if (parsedFile.campaign_id !== campaignId) {
        return NextResponse.json(
          { error: 'campaign_id do arquivo difere do campaign_id enviado no formulário' },
          { status: 400 }
        );
      }
      groups = parsedFile.groups;
    } else {
      multipartWideMatrix = parseMatrixFromSuphoImportBuffer(buf, file.name);
      if (multipartWideMatrix.length === 0) {
        return NextResponse.json(
          { error: 'Arquivo vazio ou não foi possível ler como CSV/Excel' },
          { status: 400 }
        );
      }
      multipartPreferWide = shouldPreferWideFormat(multipartWideMatrix);
      if (!multipartPreferWide) {
        multipartLongResult = parseSuphoImportMatrix(multipartWideMatrix);
        if (multipartLongResult.errors.length === 0) {
          groups = multipartLongResult.groups;
        }
      }
    }

    multipartArtifact = {
      buf,
      filename: file.name || 'import.csv',
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
    };
  } else if (contentType.includes('application/json')) {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 });
    }
    const parsed = postJsonSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Payload inválido', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    orgId = parsed.data.orgId;
    campaignId = parsed.data.campaign_id;
    const payloadParsed = parseSuphoImportJson({
      campaign_id: campaignId,
      responses: parsed.data.responses,
    });
    if (!payloadParsed.ok) {
      return NextResponse.json({ error: payloadParsed.error }, { status: 400 });
    }
    groups = payloadParsed.groups;
  } else {
    return NextResponse.json(
      { error: 'Use multipart/form-data (arquivo) ou application/json' },
      { status: 400 }
    );
  }

  const access = await requireApiUserOrgAccess(orgId);
  if (!access.ok) return access.response;

  const admin = createAdminClient();
  const uploadsLimit = await checkOrgLimit(admin, orgId, 'uploads_30d', 1);
  if (!uploadsLimit.ok) {
    return NextResponse.json(
      {
        error: uploadsLimit.message ?? 'Limite do plano atingido',
        metric: uploadsLimit.metric,
        limit: uploadsLimit.limit,
        current: uploadsLimit.current,
        plan: uploadsLimit.planName,
      },
      { status: 402 }
    );
  }

  const { data: campaign, error: campErr } = await admin
    .from('supho_diagnostic_campaigns')
    .select('id, org_id, question_ids')
    .eq('id', campaignId)
    .single();

  if (campErr || !campaign) {
    return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });
  }

  if (campaign.org_id !== orgId) {
    return NextResponse.json({ error: 'Campanha não pertence à organização' }, { status: 403 });
  }

  const campaignRow = campaign as {
    id: string;
    org_id: string;
    question_ids: string[] | null;
  };

  const shouldTryWide =
    groups === undefined &&
    multipartWideMatrix &&
    (multipartPreferWide ||
      (multipartLongResult != null && multipartLongResult.errors.length > 0));

  if (shouldTryWide) {
    try {
      const qIds = await getOrderedQuestionIdsForCampaign(admin, campaignRow);
      const wide = parseWideFormatMatrix(multipartWideMatrix!, qIds);
      if (wide.errors.length > 0) {
        const longErr = multipartLongResult?.errors?.[0];
        const msg = longErr ? `${longErr} | ${wide.errors[0]}` : wide.errors[0];
        return NextResponse.json({ error: msg }, { status: 400 });
      }
      groups = wide.groups;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const longErr = multipartLongResult?.errors?.[0];
      const err = longErr
        ? `${longErr} | Falha ao mapear perguntas: ${msg}`
        : `Falha ao mapear perguntas: ${msg}`;
      return NextResponse.json({ error: err }, { status: 400 });
    }
  }

  if (groups === undefined) {
    return NextResponse.json(
      { error: multipartLongResult?.errors[0] ?? 'Não foi possível interpretar o arquivo' },
      { status: 400 }
    );
  }

  const validate = await validateImportGroupsAgainstCampaign(admin, campaignRow, groups);
  if (!validate.ok) {
    return NextResponse.json({ error: validate.error }, { status: 400 });
  }

  try {
    const { respondents, answerRows } = await persistSuphoImportGroups(admin, campaignId, groups);

    await recordUsageEvent(admin, orgId, 'uploads_30d', 1, {
      kind: 'supho_external_import',
      campaign_id: campaignId,
      respondents,
      answer_rows: answerRows,
    });
    await appendAuditLog(admin, {
      orgId,
      actorUserId: user.id,
      action: 'supho.import_external',
      entityType: 'supho_diagnostic_campaign',
      entityId: campaignId,
      metadata: { respondents, answer_rows: answerRows },
    });

    let importFileId: string | null = null;
    if (multipartArtifact) {
      const snap = await persistSuphoImportKnowledgeSnapshot(admin, {
        orgId,
        campaignId,
        userId: user.id,
        buf: multipartArtifact.buf,
        filename: multipartArtifact.filename,
        mimeType: multipartArtifact.mimeType,
        sizeBytes: multipartArtifact.sizeBytes,
      });
      if (snap.ok) {
        importFileId = snap.id;
      } else {
        console.warn('[supho/import-responses] persistência do arquivo no repositório:', snap.error);
      }
    }

    return NextResponse.json({
      ok: true,
      respondents,
      answer_rows: answerRows,
      campaign_id: campaignId,
      import_file_id: importFileId,
      import_file_saved: importFileId != null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
