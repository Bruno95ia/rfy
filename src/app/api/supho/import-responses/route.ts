import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireApiAuth, requireApiUserOrgAccess } from '@/lib/auth';
import { checkRateLimit } from '@/lib/ratelimit';
import { checkOrgLimit, recordUsageEvent, appendAuditLog } from '@/lib/billing';
import type { SuphoImportGroup } from '@/lib/supho/import-external-responses';
import {
  parseSuphoImportCsv,
  parseSuphoImportJson,
  validateImportGroupsAgainstCampaign,
  persistSuphoImportGroups,
} from '@/lib/supho/import-external-responses';

const MAX_FILE_BYTES = 12 * 1024 * 1024;

const postJsonSchema = z.object({
  orgId: z.string().uuid(),
  campaign_id: z.string().uuid(),
  /** Mesmo formato do arquivo JSON: { campaign_id, responses: [...] } */
  responses: z.array(z.unknown()).min(1),
});

/** GET: modelo CSV (cabeçalhos) para importação SUPHO externa. */
export async function GET() {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const header =
    'respondent,question_id,value,time_area,unit,external_id\n' +
    '# Uma linha por resposta. respondent = nome/papel; external_id opcional para distinguir homônimos.\n' +
    '# question_id = UUID da pergunta (veja /api/supho/questions). value = 1 a 5.\n';
  return new NextResponse(header, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="modelo-supho-import.csv"',
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
  let groups: SuphoImportGroup[];

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

    const name = file.name.toLowerCase();
    const buf = Buffer.from(await file.arrayBuffer());
    const text = buf.toString('utf-8');

    if (name.endsWith('.json') || file.type === 'application/json') {
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
      }
      const parsed = parseSuphoImportJson(json);
      if (!parsed.ok) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
      }
      if (parsed.campaign_id !== campaignId) {
        return NextResponse.json(
          { error: 'campaign_id do arquivo difere do campaign_id enviado no formulário' },
          { status: 400 }
        );
      }
      groups = parsed.groups;
    } else {
      const parsed = parseSuphoImportCsv(text);
      if (parsed.errors.length > 0) {
        return NextResponse.json(
          { error: parsed.errors.slice(0, 8).join(' | ') },
          { status: 400 }
        );
      }
      groups = parsed.groups;
    }
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

    return NextResponse.json({
      ok: true,
      respondents,
      answer_rows: answerRows,
      campaign_id: campaignId,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
