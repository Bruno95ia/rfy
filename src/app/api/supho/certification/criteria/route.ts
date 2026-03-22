import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireApiUserOrgAccess } from '@/lib/auth';

const DEFAULT_CRITERIA = [
  { dimension: 'humano', criterion_text: 'Gestão de pessoas e clima', max_score: 3, sort_order: 1 },
  { dimension: 'humano', criterion_text: 'Desenvolvimento e feedback', max_score: 3, sort_order: 2 },
  { dimension: 'cultura', criterion_text: 'Valores e alinhamento', max_score: 3, sort_order: 1 },
  { dimension: 'cultura', criterion_text: 'Rituais e comunicação', max_score: 3, sort_order: 2 },
  { dimension: 'performance', criterion_text: 'Metas e indicadores', max_score: 3, sort_order: 1 },
  { dimension: 'performance', criterion_text: 'Execução e revisão', max_score: 3, sort_order: 2 },
];

/** GET: lista critérios de certificação (globais); insere padrões se vazio. */
export async function GET() {
  await requireApiUserOrgAccess(null);

  const admin = createAdminClient();
  const first = await admin
    .from('supho_certification_criteria')
    .select('id, dimension, criterion_text, max_score, sort_order')
    .order('dimension')
    .order('sort_order');

  const { error } = first;
  let data = first.data;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.length === 0) {
    for (const c of DEFAULT_CRITERIA) {
      await admin.from('supho_certification_criteria').insert(c);
    }
    const res = await admin
      .from('supho_certification_criteria')
      .select('id, dimension, criterion_text, max_score, sort_order')
      .order('dimension')
      .order('sort_order');
    data = res.data ?? [];
  }
  return NextResponse.json(data);
}
