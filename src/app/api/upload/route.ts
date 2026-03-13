import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireApiAuth, requireApiUserOrgAccess } from '@/lib/auth';
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

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

const uploadFormSchema = z.object({
  kind: z.enum(['opportunities', 'activities'], { error: 'kind deve ser opportunities ou activities' }),
  orgId: z.string().uuid('orgId deve ser UUID válido'),
});

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;
  const { user } = auth;

  const identifier = `upload:${user.id}`;
  const { limited } = await checkRateLimit(identifier);
  if (limited) {
    return NextResponse.json(
      { error: 'Muitas requisições. Tente novamente em alguns minutos.' },
      { status: 429 }
    );
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const kind = formData.get('kind') as string | null;
  const orgId = formData.get('orgId') as string | null;

  if (!file) {
    return NextResponse.json(
      { error: 'Arquivo é obrigatório', details: [] },
      { status: 400 }
    );
  }
  const parsed = uploadFormSchema.safeParse({ kind, orgId });
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Payload inválido', details: parsed.error.issues },
      { status: 400 }
    );
  }
  const { kind: kindVal, orgId: orgIdVal } = parsed.data;

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: `Arquivo muito grande. Tamanho máximo: ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB` },
      { status: 413 }
    );
  }

  const allowedTypes = ['text/csv', 'application/csv', 'text/plain'];
  if (file.type && !allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: 'Tipo de arquivo inválido. Apenas CSV é aceito.' },
      { status: 400 }
    );
  }

  const access = await requireApiUserOrgAccess(orgIdVal);
  if (!access.ok) return access.response;

  const admin = createAdminClient();
  const uploadsLimit = await checkOrgLimit(admin, orgIdVal, 'uploads_30d', 1);
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

  const filename = `${orgIdVal}/${Date.now()}-${file.name}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: storageError } = await admin.storage
    .from('uploads')
    .upload(filename, buffer, {
      contentType: file.type || 'text/csv',
      upsert: true,
    });

  if (storageError) {
    return NextResponse.json(
      { error: 'Erro ao salvar arquivo: ' + storageError.message },
      { status: 500 }
    );
  }

  const { data: upload, error: insertError } = await admin
    .from('uploads')
    .insert({
      org_id: orgIdVal,
      filename: file.name,
      storage_path: filename,
      kind: kindVal,
      status: 'uploaded',
    })
    .select('id')
    .single();

  if (insertError) {
    return NextResponse.json(
      { error: 'Erro ao registrar upload: ' + insertError.message },
      { status: 500 }
    );
  }

  const eventName =
    kindVal === 'opportunities'
      ? 'upload/opportunities.process'
      : 'upload/activities.process';

  try {
    await inngest.send({
      name: eventName,
      data: {
        uploadId: upload!.id,
        orgId: orgIdVal,
        storagePath: filename,
      },
    });
  } catch (inngestErr) {
    console.warn('Inngest indisponível, processando upload em modo síncrono:', inngestErr);
    const csvBody = buffer.toString('utf-8');
    try {
      await admin.from('uploads').update({ status: 'processing' }).eq('id', upload!.id);
      if (kindVal === 'opportunities') {
        await processOpportunitiesCsv(admin, orgIdVal, upload!.id, csvBody);
        await computeAndPersistReport(admin, orgIdVal, upload!.id);
      } else {
        await processActivitiesCsv(admin, orgIdVal, upload!.id, csvBody);
        await linkActivitiesToOpportunities(admin, orgIdVal, upload!.id);
        await computeAndPersistReport(admin, orgIdVal, null);
      }
    } catch (syncErr) {
      const msg = syncErr instanceof Error ? syncErr.message : String(syncErr);
      await admin
        .from('uploads')
        .update({
          status: 'failed',
          error_message: msg,
          processed_at: new Date().toISOString(),
        })
        .eq('id', upload!.id);
      return NextResponse.json(
        { error: 'Erro ao processar o CSV: ' + msg },
        { status: 500 }
      );
    }
  }

  await recordUsageEvent(admin, orgIdVal, 'uploads_30d', 1, {
    kind: kindVal,
    upload_id: upload!.id,
    filename: file.name,
  });
  await appendAuditLog(admin, {
    orgId: orgIdVal,
    actorUserId: user.id,
    action: 'upload.created',
    entityType: 'upload',
    entityId: upload!.id,
    metadata: { kind: kindVal, filename: file.name },
  });

  return NextResponse.json({ ok: true, id: upload!.id });
}
