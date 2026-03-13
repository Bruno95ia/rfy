import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getOrgIdForUser, requireApiAuth } from '@/lib/auth';

/** GET: lista perguntas disponíveis (globais org_id IS NULL + da org do usuário) */
export async function GET() {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const orgId = await getOrgIdForUser(auth.user.id);

  type QuestionRow = { id: string; block: string | null; internal_weight: number | null; question_text: string | null; item_code: string | null; sort_order: number | null };
  const admin = createAdminClient();
  let data: QuestionRow[] | null = null;
  let error: { message: string } | null = null;

  if (orgId) {
    const base = admin.from('supho_questions').select('id, block, internal_weight, question_text, item_code, sort_order').order('sort_order', { ascending: true });
    const [rNull, rOrg] = await Promise.all([
      base.is('org_id', null),
      admin.from('supho_questions').select('id, block, internal_weight, question_text, item_code, sort_order').eq('org_id', orgId).order('sort_order', { ascending: true }),
    ]);
    if (rNull.error) {
      error = rNull.error;
    } else if (rOrg.error) {
      error = rOrg.error;
    } else {
      const byId = new Map<string, QuestionRow>();
      for (const row of (rNull.data ?? []) as QuestionRow[]) byId.set(row.id, row);
      for (const row of (rOrg.data ?? []) as QuestionRow[]) byId.set(row.id, row);
      data = [...byId.values()].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    }
  } else {
    const res = await admin.from('supho_questions').select('id, block, internal_weight, question_text, item_code, sort_order').order('sort_order', { ascending: true }).is('org_id', null);
    data = res.data as QuestionRow[] | null;
    error = res.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
