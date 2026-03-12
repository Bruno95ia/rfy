import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/** GET: lista perguntas disponíveis (globais org_id IS NULL + da org do usuário) */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { data: members } = await supabase.from('org_members').select('org_id').eq('user_id', user.id).limit(1);
  const orgId = members?.[0]?.org_id;

  const admin = createAdminClient();
  const q = admin
    .from('supho_questions')
    .select('id, block, internal_weight, question_text, item_code, sort_order')
    .order('sort_order', { ascending: true });
  const { data, error } = orgId
    ? await q.or(`org_id.is.null,org_id.eq.${orgId}`)
    : await q.is('org_id', null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
