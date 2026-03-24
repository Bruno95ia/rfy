import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireApiUserOrgAccess, getOrgMemberRole } from '@/lib/auth';
import { ORG_CONTEXT_DOCUMENT_DEFS, titleForDocKey } from '@/lib/org/context-documents';

/**
 * GET /api/org/context-documents
 * Lista os documentos de contexto (com corpo) e o status de integração ERP.
 *
 * PATCH /api/org/context-documents
 * Atualiza textos e/ou erp_integration_status (owner, admin ou manager). Pode enviar só documentos alterados.
 */

export async function GET() {
  const auth = await requireApiUserOrgAccess(null);
  if (!auth.ok) return auth.response;
  const { user, orgId } = auth;

  const admin = createAdminClient();
  const role = (await getOrgMemberRole(user.id, orgId)) ?? 'viewer';

  const [{ data: rows }, { data: cfg }, { data: crmRows }] = await Promise.all([
    admin.from('org_context_documents').select('doc_key, title, body_markdown, updated_at').eq('org_id', orgId),
    admin.from('org_config').select('erp_integration_status').eq('org_id', orgId).maybeSingle(),
    admin.from('crm_integrations').select('id').eq('org_id', orgId).eq('is_active', true).limit(1),
  ]);

  const byKey = new Map((rows ?? []).map((r) => [r.doc_key as string, r]));
  const documents = ORG_CONTEXT_DOCUMENT_DEFS.map((def) => {
    const existing = byKey.get(def.key);
    return {
      doc_key: def.key,
      title: existing?.title ?? def.title,
      hint: def.hint,
      body_markdown: existing?.body_markdown ?? '',
      updated_at: existing?.updated_at ?? null,
    };
  });

  const erpRaw =
    cfg && typeof cfg === 'object' && 'erp_integration_status' in cfg
      ? String((cfg as { erp_integration_status?: string }).erp_integration_status ?? 'unknown')
      : 'unknown';
  const erp_integration_status =
    erpRaw === 'integrated' || erpRaw === 'not_integrated' || erpRaw === 'unknown'
      ? erpRaw
      : 'unknown';

  const crm_integration_active = Array.isArray(crmRows) && crmRows.length > 0;

  return NextResponse.json({
    documents,
    erp_integration_status,
    crm_integration_active,
    role,
    can_edit: role === 'owner' || role === 'admin' || role === 'manager',
  });
}

const patchSchema = z.object({
  erp_integration_status: z.enum(['unknown', 'integrated', 'not_integrated']).optional(),
  documents: z
    .array(
      z.object({
        doc_key: z.string().min(1),
        body_markdown: z.string().max(500_000),
      })
    )
    .optional(),
});

export async function PATCH(req: NextRequest) {
  const auth = await requireApiUserOrgAccess(null);
  if (!auth.ok) return auth.response;
  const { user, orgId } = auth;

  const role = (await getOrgMemberRole(user.id, orgId)) ?? 'viewer';
  if (role !== 'owner' && role !== 'admin' && role !== 'manager') {
    return NextResponse.json(
      { error: 'Apenas owner, admin ou gestor pode editar o contexto da organização.' },
      { status: 403 }
    );
  }

  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Payload inválido', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { erp_integration_status, documents } = parsed.data;

  if (erp_integration_status !== undefined) {
    const { error: cfgErr } = await admin.from('org_config').upsert(
      {
        org_id: orgId,
        erp_integration_status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'org_id' }
    );
    if (cfgErr) {
      return NextResponse.json({ error: cfgErr.message }, { status: 500 });
    }
  }

  if (documents && documents.length > 0) {
    const validKeys = new Set<string>(ORG_CONTEXT_DOCUMENT_DEFS.map((d) => d.key));
    for (const doc of documents) {
      if (!validKeys.has(doc.doc_key)) {
        return NextResponse.json({ error: `doc_key inválido: ${doc.doc_key}` }, { status: 400 });
      }
      const { error } = await admin.from('org_context_documents').upsert(
        {
          org_id: orgId,
          doc_key: doc.doc_key,
          title: titleForDocKey(doc.doc_key),
          body_markdown: doc.body_markdown,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'org_id,doc_key' }
      );
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
