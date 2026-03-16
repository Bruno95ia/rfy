import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireApiCampaignAccess } from '@/lib/auth';

const patchSchema = z.object({
  question_ids: z.array(z.string().uuid()).nullable().optional(),
  name: z.string().min(1).optional(),
  status: z.enum(['draft', 'open', 'closed']).optional(),
});

/** PATCH: atualiza campanha (question_ids, name, status). */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const { campaignId } = await params;
  const access = await requireApiCampaignAccess(campaignId);
  if (!access.ok) return access.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Payload inválido', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { question_ids, name, status } = parsed.data;
  const admin = createAdminClient();

  if (question_ids !== undefined) {
    if (question_ids !== null && question_ids.length > 0) {
      const uniqueIds = [...new Set(question_ids)];
      const { data: allowed } = await admin
        .from('supho_questions')
        .select('id')
        .or(`org_id.is.null,org_id.eq.${access.campaign.org_id}`)
        .in('id', uniqueIds);
      const allowedIds = new Set((allowed ?? []).map((r) => r.id));
      const invalid = uniqueIds.filter((id) => !allowedIds.has(id));
      if (invalid.length > 0) {
        return NextResponse.json(
          { error: 'Algumas perguntas não pertencem ao repositório (global ou desta organização)' },
          { status: 400 }
        );
      }
    }
  }

  const updates: Record<string, unknown> = {};
  if (question_ids !== undefined) updates.question_ids = question_ids;
  if (name !== undefined) updates.name = name.trim();
  if (status !== undefined) updates.status = status;
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true });
  }

  const { data, error } = await admin
    .from('supho_diagnostic_campaigns')
    .update(updates)
    .eq('id', campaignId)
    .select('id, name, status, question_ids')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
