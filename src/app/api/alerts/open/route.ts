import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuthAndOrgAccess } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const orgId = req.nextUrl.searchParams.get('org_id');
    const auth = await requireAuthAndOrgAccess(orgId);
    if (!auth.ok) return auth.response;

    const limit = Math.min(
      Math.max(1, Number(req.nextUrl.searchParams.get('limit') ?? 20)),
      100
    );

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('alerts')
      .select('id, org_id, tipo, severidade, titulo, mensagem, valor_atual, limiar, created_at')
      .eq('org_id', auth.orgId)
      .is('resolved_at', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('[alerts/open] Supabase:', error.message, { org_id: auth.orgId });
      return NextResponse.json({ alerts: [] });
    }

    return NextResponse.json({ alerts: data ?? [] });
  } catch (e) {
    console.warn('[alerts/open]', e instanceof Error ? e.message : e);
    return NextResponse.json({ alerts: [] });
  }
}
