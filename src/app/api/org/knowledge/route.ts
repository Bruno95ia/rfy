import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireApiUserOrgAccess, getOrgMemberRole } from '@/lib/auth';

const MAX_BYTES = 50 * 1024 * 1024;

function safeFileSegment(name: string): string {
  const base = name.replace(/[/\\]/g, '_').replace(/[^a-zA-Z0-9._\s-]/g, '_');
  return base.slice(0, 200) || 'file';
}

/**
 * GET /api/org/knowledge?campaign_id=uuid opcional
 * Lista arquivos do repositório Conhecimento (org + opcional filtro por campanha).
 */
export async function GET(req: NextRequest) {
  const auth = await requireApiUserOrgAccess(null);
  if (!auth.ok) return auth.response;
  const { orgId } = auth;

  const campaignId = req.nextUrl.searchParams.get('campaign_id')?.trim() || null;

  const admin = createAdminClient();

  if (campaignId) {
    const { data: camp } = await admin
      .from('supho_diagnostic_campaigns')
      .select('id')
      .eq('id', campaignId)
      .eq('org_id', orgId)
      .maybeSingle();
    if (!camp) {
      return NextResponse.json({ error: 'Campanha não encontrada nesta organização.' }, { status: 404 });
    }
  }

  const { data: globalRows, error: e1 } = await admin
    .from('org_knowledge_files')
    .select('id, filename, storage_path, mime_type, size_bytes, campaign_id, label, created_at')
    .eq('org_id', orgId)
    .is('campaign_id', null)
    .order('created_at', { ascending: false });
  if (e1) {
    return NextResponse.json({ error: e1.message }, { status: 500 });
  }

  let campaignRows: typeof globalRows = [];
  if (campaignId) {
    const { data: cr, error: e2 } = await admin
      .from('org_knowledge_files')
      .select('id, filename, storage_path, mime_type, size_bytes, campaign_id, label, created_at')
      .eq('org_id', orgId)
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false });
    if (e2) {
      return NextResponse.json({ error: e2.message }, { status: 500 });
    }
    campaignRows = cr ?? [];
  }

  const role = (await getOrgMemberRole(auth.user.id, orgId)) ?? 'viewer';

  return NextResponse.json({
    global: globalRows ?? [],
    campaign: campaignId ? campaignRows : [],
    campaign_id: campaignId,
    can_edit: role === 'owner' || role === 'admin' || role === 'manager',
  });
}

/**
 * POST multipart: file, orgId, campaign_id opcional
 */
export async function POST(req: NextRequest) {
  const auth = await requireApiUserOrgAccess(null);
  if (!auth.ok) return auth.response;
  const { user, orgId } = auth;

  const role = (await getOrgMemberRole(user.id, orgId)) ?? 'viewer';
  if (role !== 'owner' && role !== 'admin' && role !== 'manager') {
    return NextResponse.json({ error: 'Sem permissão para enviar arquivos.' }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const campaignIdRaw = formData.get('campaign_id') as string | null;

  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: 'Envie um arquivo no campo file.' }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Arquivo muito grande (máx. 50 MB).' }, { status: 413 });
  }

  const campaignId = campaignIdRaw?.trim() || null;
  const admin = createAdminClient();

  if (campaignId) {
    const { data: camp } = await admin
      .from('supho_diagnostic_campaigns')
      .select('id')
      .eq('id', campaignId)
      .eq('org_id', orgId)
      .maybeSingle();
    if (!camp) {
      return NextResponse.json({ error: 'Campanha inválida.' }, { status: 400 });
    }
  }

  const originalName = file.name || 'documento';
  const safeName = safeFileSegment(originalName);
  const storagePath = `knowledge/${orgId}/${campaignId ?? 'org'}/${Date.now()}-${safeName}`;

  const buf = Buffer.from(await file.arrayBuffer());
  const mime = file.type || 'application/octet-stream';

  const { error: upErr } = await admin.storage.from('knowledge').upload(storagePath, buf, {
    contentType: mime,
    upsert: false,
  });
  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  const ins = await admin
    .from('org_knowledge_files')
    .insert({
      org_id: orgId,
      campaign_id: campaignId,
      filename: originalName,
      storage_path: storagePath,
      mime_type: mime,
      size_bytes: file.size,
      created_by_user_id: user.id,
    })
    .select('id, filename, storage_path, mime_type, size_bytes, campaign_id, created_at')
    .single();

  const insTyped = ins as { data: Record<string, unknown> | null; error: { message: string } | null };
  if (insTyped.error || !insTyped.data) {
    await admin.storage.from('knowledge').remove([storagePath]);
    return NextResponse.json(
      { error: insTyped.error?.message ?? 'Falha ao registrar arquivo' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, file: insTyped.data });
}

const deleteSchema = z.object({ id: z.string().uuid() });

/**
 * DELETE /api/org/knowledge?id=uuid
 */
export async function DELETE(req: NextRequest) {
  const auth = await requireApiUserOrgAccess(null);
  if (!auth.ok) return auth.response;
  const { user, orgId } = auth;

  const role = (await getOrgMemberRole(user.id, orgId)) ?? 'viewer';
  if (role !== 'owner' && role !== 'admin' && role !== 'manager') {
    return NextResponse.json({ error: 'Sem permissão para excluir.' }, { status: 403 });
  }

  const id = req.nextUrl.searchParams.get('id')?.trim();
  const parsed = deleteSchema.safeParse({ id });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Parâmetro id (UUID) obrigatório.' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: existing, error: fetchErr } = await admin
    .from('org_knowledge_files')
    .select('id, storage_path')
    .eq('id', parsed.data.id)
    .eq('org_id', orgId)
    .maybeSingle();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: 'Arquivo não encontrado.' }, { status: 404 });
  }

  const path = (existing as { storage_path: string }).storage_path;

  const delRes = (await admin
    .from('org_knowledge_files')
    .delete()
    .eq('id', parsed.data.id)
    .eq('org_id', orgId)) as { error: { message: string } | null };
  if (delRes.error) {
    return NextResponse.json({ error: delRes.error.message }, { status: 500 });
  }

  await admin.storage.from('knowledge').remove([path]);

  return NextResponse.json({ ok: true });
}
