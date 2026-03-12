import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const DEMO_ORG_NAME = 'Admin Demo';
const DEMO_PLAN_ID = 'pro';

function escapeSql(val: string): string {
  return String(val).replace(/'/g, "''");
}

/**
 * POST /api/admin/reset-demo
 * Zera e recarrega a base de demonstração da organização do usuário atual.
 * Requer autenticação e uso de pg + DATABASE_URL ou AI_DATABASE_URL.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: member } = await admin
      .from('org_members')
      .select('org_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (!member?.org_id) {
      return NextResponse.json({ error: 'Organização não encontrada' }, { status: 400 });
    }

    const orgId = member.org_id;
    const userId = user.id;

    const databaseUrl =
      process.env.DATABASE_URL ||
      process.env.AI_DATABASE_URL ||
      (process.env.POSTGRES_PASSWORD &&
        `postgresql://postgres:${process.env.POSTGRES_PASSWORD}@localhost:5432/postgres`);

    if (!databaseUrl) {
      return NextResponse.json(
        { error: 'DATABASE_URL ou AI_DATABASE_URL não configurado para reset da base' },
        { status: 503 }
      );
    }

    const sqlPath = join(process.cwd(), 'scripts', 'seed-demo.sql');
    if (!existsSync(sqlPath)) {
      return NextResponse.json({ error: 'Arquivo seed-demo.sql não encontrado' }, { status: 500 });
    }

    let sql = readFileSync(sqlPath, 'utf8');
    const orgIdQuoted = "'" + escapeSql(orgId) + "'";
    const userIdQuoted = "'" + escapeSql(userId) + "'";
    sql = sql
      .replace(/__ORG_ID__/g, orgIdQuoted)
      .replace(/__USER_ID__/g, userIdQuoted)
      .replace(/__ORG_NAME__/g, escapeSql(DEMO_ORG_NAME))
      .replace(/__PLAN_ID__/g, escapeSql(DEMO_PLAN_ID));

    const { Client } = await import('pg');
    const client = new Client({ connectionString: databaseUrl });
    await client.connect();
    try {
      await client.query(sql);
    } finally {
      await client.end();
    }

    return NextResponse.json({
      ok: true,
      message: 'Base de demonstração zerada e recarregada com sucesso.',
    });
  } catch (e) {
    console.error('reset-demo error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erro ao resetar base' },
      { status: 500 }
    );
  }
}
