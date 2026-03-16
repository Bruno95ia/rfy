import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireApiAuth, requireApiUserOrgAccess } from '@/lib/auth';
import { inngest } from '@/inngest/client';

/**
 * Reprocessa um upload existente: reenvia o evento Inngest correspondente
 * (upload/opportunities.process ou upload/activities.process) para reexecutar
 * o pipeline com o arquivo já armazenado.
 */
export async function POST(req: NextRequest) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  let body: { uploadId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 });
  }

  const uploadId = body?.uploadId;
  if (!uploadId || typeof uploadId !== 'string') {
    return NextResponse.json({ error: 'uploadId é obrigatório' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: upload, error: fetchError } = await admin
    .from('uploads')
    .select('id, org_id, kind, storage_path, status')
    .eq('id', uploadId)
    .single();

  if (fetchError || !upload) {
    return NextResponse.json({ error: 'Upload não encontrado' }, { status: 404 });
  }

  const access = await requireApiUserOrgAccess(upload.org_id);
  if (!access.ok) return access.response;

  if (!upload.storage_path) {
    return NextResponse.json(
      { error: 'Upload sem arquivo armazenado; não é possível reprocessar.' },
      { status: 400 }
    );
  }

  const eventName =
    upload.kind === 'opportunities'
      ? 'upload/opportunities.process'
      : 'upload/activities.process';

  try {
    await inngest.send({
      name: eventName,
      data: {
        uploadId: upload.id,
        orgId: upload.org_id,
        storagePath: upload.storage_path,
      },
    });
  } catch (err) {
    console.error('Reprocess Inngest send failed:', err);
    return NextResponse.json(
      { error: 'Falha ao enfileirar reprocessamento. Tente novamente.' },
      { status: 500 }
    );
  }

  await admin
    .from('uploads')
    .update({ status: 'uploaded', error_message: null })
    .eq('id', uploadId);

  return NextResponse.json({ ok: true, message: 'Reprocessamento enfileirado.' });
}
