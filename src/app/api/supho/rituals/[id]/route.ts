import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireApiUserOrgAccess } from '@/lib/auth';

/** PATCH: atualiza ritual (conducted_at, notes) */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUserOrgAccess(null);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const conductedAt = body?.conducted_at as string | null | undefined;
  const notes = (body?.notes as string)?.trim();

  const admin = createAdminClient();
  const { data: ritual } = await admin
    .from('supho_rituals')
    .select('id, template_id')
    .eq('id', id)
    .single();

  if (!ritual) return NextResponse.json({ error: 'Ritual não encontrado' }, { status: 404 });

  const { data: template } = await admin
    .from('supho_ritual_templates')
    .select('org_id')
    .eq('id', ritual.template_id)
    .single();

  if (!template || template.org_id !== auth.orgId) {
    return NextResponse.json({ error: 'Ritual não encontrado' }, { status: 404 });
  }

  const updates: { conducted_at?: string; notes?: string } = {};
  if (conductedAt !== undefined) updates.conducted_at = conductedAt || null;
  if (notes !== undefined) updates.notes = notes ?? null;

  const { data, error } = await admin
    .from('supho_rituals')
    .update(updates)
    .eq('id', id)
    .select('id, template_id, scheduled_at, conducted_at, notes, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
