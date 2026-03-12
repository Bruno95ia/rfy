import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { userHasOrgAccess } from '@/lib/auth';
import { checkRateLimit } from '@/lib/ratelimit';
import { checkOrgLimit, recordUsageEvent, appendAuditLog } from '@/lib/billing';
import { inngest } from '@/inngest/client';
import {
  processOpportunitiesCsv,
  processActivitiesCsv,
  linkActivitiesToOpportunities,
} from '@/lib/upload-process';
import { computeAndPersistReport } from '@/lib/report-compute-persist';
import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

/** Cria campanha SUPHO de demonstração e um resultado para o dashboard mostrar o card. */
async function ensureSuphoDemoCampaign(
  admin: SupabaseClient,
  orgId: string
): Promise<void> {
  const { data: existing } = await admin
    .from('supho_diagnostic_campaigns')
    .select('id')
    .eq('org_id', orgId)
    .ilike('name', '%Demo%')
    .limit(1)
    .maybeSingle();
  if (existing) return;

  const { data: campaign, error: campError } = await admin
    .from('supho_diagnostic_campaigns')
    .insert({
      org_id: orgId,
      name: '[Demo] Diagnóstico pós-upload',
      started_at: new Date().toISOString(),
      closed_at: new Date().toISOString(),
      status: 'closed',
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (campError || !campaign) return;

  await admin.from('supho_diagnostic_results').insert({
    org_id: orgId,
    campaign_id: campaign.id,
    computed_at: new Date().toISOString(),
    ic: 70,
    ih: 66,
    ip: 64,
    itsmo: 67,
    nivel: 3,
    gap_c_h: 4,
    gap_c_p: 6,
    ise: 3.5,
    ipt: 3.4,
    icl: 3.6,
    sample_size: 12,
    result_json: { source: 'demo_after_upload' },
  });
}

/**
 * POST /api/demo/upload-pack
 * Recebe dois CSVs (oportunidades + atividades) em um único request para
 * alimentar a demonstração completa. Cria dois uploads, envia para processamento
 * (Inngest) e dispara o pipeline até o relatório.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const identifier = `upload:${user.id}`;
  const { limited } = await checkRateLimit(identifier);
  if (limited) {
    return NextResponse.json(
      { error: 'Muitas requisições. Tente novamente em alguns minutos.' },
      { status: 429 }
    );
  }

  const formData = await request.formData();
  const fileOpportunities = formData.get('oportunidades') as File | null;
  const fileActivities = formData.get('atividades') as File | null;
  const orgId = formData.get('orgId') as string | null;

  if (!fileOpportunities || !fileActivities || !orgId) {
    return NextResponse.json(
      {
        error:
          'Envie os dois arquivos: oportunidades (CSV) e atividades (CSV), e informe orgId.',
      },
      { status: 400 }
    );
  }

  if (
    fileOpportunities.size > MAX_FILE_SIZE_BYTES ||
    fileActivities.size > MAX_FILE_SIZE_BYTES
  ) {
    return NextResponse.json(
      {
        error: `Cada arquivo deve ter no máximo ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB`,
      },
      { status: 413 }
    );
  }

  const allowedTypes = [
    'text/csv',
    'application/csv',
    'text/plain',
    'application/vnd.ms-excel',
  ];
  const okType = (f: File) =>
    !f.type || allowedTypes.some((t) => f.type?.toLowerCase().includes('csv') || f.type === t);
  if (!okType(fileOpportunities) || !okType(fileActivities)) {
    return NextResponse.json(
      { error: 'Ambos os arquivos devem ser CSV.' },
      { status: 400 }
    );
  }

  const { data: members } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .eq('org_id', orgId)
    .limit(1);

  let hasAccess = (members?.length ?? 0) > 0;
  if (!hasAccess) {
    hasAccess = await userHasOrgAccess(user.id, orgId);
  }
  if (!hasAccess) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  const admin = createAdminClient();
  const uploadsLimit = await checkOrgLimit(admin, orgId, 'uploads_30d', 2);
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

  const ts = Date.now();
  const pathOpp = `${orgId}/${ts}-${fileOpportunities.name}`;
  const pathAct = `${orgId}/${ts}-${fileActivities.name}`;

  const bufferOpp = Buffer.from(await fileOpportunities.arrayBuffer());
  const bufferAct = Buffer.from(await fileActivities.arrayBuffer());

  const { error: errOpp } = await admin.storage
    .from('uploads')
    .upload(pathOpp, bufferOpp, {
      contentType: 'text/csv',
      upsert: true,
    });
  if (errOpp) {
    return NextResponse.json(
      { error: 'Erro ao salvar CSV de oportunidades: ' + errOpp.message },
      { status: 500 }
    );
  }

  const { error: errAct } = await admin.storage
    .from('uploads')
    .upload(pathAct, bufferAct, {
      contentType: 'text/csv',
      upsert: true,
    });
  if (errAct) {
    return NextResponse.json(
      { error: 'Erro ao salvar CSV de atividades: ' + errAct.message },
      { status: 500 }
    );
  }

  const { data: uploadOpp, error: insOpp } = await admin
    .from('uploads')
    .insert({
      org_id: orgId,
      filename: fileOpportunities.name,
      storage_path: pathOpp,
      kind: 'opportunities',
      status: 'uploaded',
    })
    .select('id')
    .single();

  if (insOpp || !uploadOpp) {
    return NextResponse.json(
      { error: 'Erro ao registrar upload de oportunidades: ' + (insOpp?.message ?? '') },
      { status: 500 }
    );
  }

  const { data: uploadAct, error: insAct } = await admin
    .from('uploads')
    .insert({
      org_id: orgId,
      filename: fileActivities.name,
      storage_path: pathAct,
      kind: 'activities',
      status: 'uploaded',
    })
    .select('id')
    .single();

  if (insAct || !uploadAct) {
    return NextResponse.json(
      { error: 'Erro ao registrar upload de atividades: ' + (insAct?.message ?? '') },
      { status: 500 }
    );
  }

  let usedFallback = false;
  try {
    await inngest.send({
      name: 'upload/opportunities.process',
      data: {
        uploadId: uploadOpp.id,
        orgId,
        storagePath: pathOpp,
      },
    });
    await inngest.send({
      name: 'upload/activities.process',
      data: {
        uploadId: uploadAct.id,
        orgId,
        storagePath: pathAct,
      },
    });
  } catch (inngestErr) {
    const isKeyMissing =
      (inngestErr as { status?: number })?.status === 401 ||
      String((inngestErr as Error)?.message ?? '').includes('Event key not found');
    if (isKeyMissing) {
      console.warn('Inngest indisponível (chave não configurada), processando upload em modo síncrono.');
    } else {
      console.warn('Inngest indisponível, processando upload em modo síncrono:', inngestErr);
    }
    usedFallback = true;
    const csvOpp = bufferOpp.toString('utf-8');
    const csvAct = bufferAct.toString('utf-8');
    try {
      await admin.from('uploads').update({ status: 'processing' }).eq('id', uploadOpp.id);
      await processOpportunitiesCsv(admin, orgId, uploadOpp.id, csvOpp);
      await admin.from('uploads').update({ status: 'processing' }).eq('id', uploadAct.id);
      await processActivitiesCsv(admin, orgId, uploadAct.id, csvAct);
      await linkActivitiesToOpportunities(admin, orgId, uploadAct.id);
      await computeAndPersistReport(admin, orgId, uploadOpp.id);
      await ensureSuphoDemoCampaign(admin, orgId);
    } catch (syncErr) {
      const msg = syncErr instanceof Error ? syncErr.message : String(syncErr);
      await admin
        .from('uploads')
        .update({
          status: 'failed',
          error_message: msg,
          processed_at: new Date().toISOString(),
        })
        .eq('id', uploadOpp.id);
      await admin
        .from('uploads')
        .update({
          status: 'failed',
          error_message: msg,
          processed_at: new Date().toISOString(),
        })
        .eq('id', uploadAct.id);
      return NextResponse.json(
        { error: 'Erro ao processar os CSVs: ' + msg },
        { status: 500 }
      );
    }
  }
  await ensureSuphoDemoCampaign(admin, orgId);

  await recordUsageEvent(admin, orgId, 'uploads_30d', 2, {
    kind: 'demo_pack',
    upload_id: uploadOpp.id,
    filename: fileOpportunities.name,
  });
  await appendAuditLog(admin, {
    orgId,
    actorUserId: user.id,
    action: 'demo.upload_pack',
    entityType: 'upload',
    entityId: uploadOpp.id,
    metadata: {
      oportunidades: fileOpportunities.name,
      atividades: fileActivities.name,
      uploadIds: [uploadOpp.id, uploadAct.id],
    },
  });

  return NextResponse.json({
    ok: true,
    message: usedFallback
      ? 'Demonstração processada com sucesso (modo síncrono). Dashboard e relatórios já estão atualizados.'
      : 'Demonstração enviada. Oportunidades e atividades estão sendo processados. Em alguns segundos o dashboard e os relatórios serão atualizados.',
    uploadIds: [uploadOpp.id, uploadAct.id],
  });
}
