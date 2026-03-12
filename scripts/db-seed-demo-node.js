#!/usr/bin/env node
/**
 * Aplica seed de demonstração via Node (pg).
 * Usado quando psql e Docker não estão disponíveis (ex.: Supabase com DATABASE_URL no .env.local).
 * Carrega .env.local e descobre org_id/user_id da primeira linha de org_members.
 */

const { readFileSync, existsSync } = require('fs');
const { join } = require('path');
const { Client } = require('pg');

const ROOT = join(__dirname, '..');
const SEED_SQL_PATH = join(__dirname, 'seed-demo.sql');

const DEFAULT_ORG_ID = '8c2f64ad-0fe8-4a52-a01f-2f4a64796f01';
const DEFAULT_USER_ID = '11111111-1111-1111-1111-111111111111';
const DEMO_ORG_NAME = process.env.DEMO_ORG_NAME || 'RFY Demo SaaS';
const DEMO_PLAN_ID = process.env.DEMO_PLAN_ID || 'pro';

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const content = readFileSync(path, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const m = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) {
      const val = m[2].replace(/^["']|["']$/g, '').trim();
      process.env[m[1]] = val;
    }
  }
}

loadEnvFile(join(ROOT, '.env.local'));
loadEnvFile(join(ROOT, '.env'));

const DATABASE_URL = process.env.DATABASE_URL
  || process.env.AI_DATABASE_URL
  || (process.env.POSTGRES_PASSWORD && `postgresql://postgres:${process.env.POSTGRES_PASSWORD}@localhost:5432/postgres`);

function escapeSql(val) {
  return String(val).replace(/'/g, "''");
}

async function main() {
  if (!DATABASE_URL) {
    console.error('Erro: defina DATABASE_URL ou AI_DATABASE_URL no .env.local');
    process.exit(1);
  }

  if (!existsSync(SEED_SQL_PATH)) {
    console.error('Erro: scripts/seed-demo.sql não encontrado.');
    process.exit(1);
  }

  const client = new Client({ connectionString: DATABASE_URL });
  try {
    await client.connect();
  } catch (e) {
    console.error('Erro ao conectar no banco:', e.message);
    if (DATABASE_URL.includes('localhost') && (e.code === 'ECONNREFUSED' || e.message.includes('ENOTFOUND'))) {
      console.error('');
      console.error('  Dica: suba o Postgres no Docker e tente de novo:');
      console.error('    docker compose up -d postgres');
      console.error('    npm run db:seed');
    }
    process.exit(1);
  }

  let orgId = process.env.DEMO_ORG_ID || DEFAULT_ORG_ID;
  let userId = process.env.DEMO_USER_ID || DEFAULT_USER_ID;

  try {
    const memberRes = await client.query(
      'SELECT org_id::text, user_id::text FROM org_members ORDER BY created_at DESC NULLS LAST LIMIT 1'
    );
    if (memberRes.rows.length > 0) {
      userId = memberRes.rows[0].user_id;
      const orgRes = await client.query(
        'SELECT org_id::text FROM org_members WHERE user_id = $1::uuid ORDER BY created_at DESC NULLS LAST LIMIT 1',
        [userId]
      );
      if (orgRes.rows.length > 0) orgId = orgRes.rows[0].org_id;
    }
  } catch (e) {
    console.warn('Aviso: não foi possível descobrir org/user, usando defaults.');
  }

  const tableCheck = await client.query(`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'org_subscriptions'
  `);
  if (!tableCheck.rows.length) {
    console.error('');
    console.error('Erro: a tabela org_subscriptions não existe.');
    console.error('Execute as migrations antes: npm run db:up  ou  npm run db:migrate');
    console.error('Depois rode novamente: npm run db:seed:admin');
    process.exit(1);
  }

  console.log('==> Seed demo (Node)');
  console.log('   org_id:   ', orgId);
  console.log('   user_id:  ', userId);
  console.log('   org_name: ', DEMO_ORG_NAME);
  console.log('   plan_id:  ', DEMO_PLAN_ID);

  let sql = readFileSync(SEED_SQL_PATH, 'utf8');
  const orgIdQuoted = "'" + escapeSql(orgId) + "'";
  const userIdQuoted = "'" + escapeSql(userId) + "'";
  sql = sql
    .replace(/__ORG_ID__/g, orgIdQuoted)
    .replace(/__USER_ID__/g, userIdQuoted)
    .replace(/__ORG_NAME__/g, escapeSql(DEMO_ORG_NAME))
    .replace(/__PLAN_ID__/g, escapeSql(DEMO_PLAN_ID));

  try {
    await client.query(sql);
  } catch (e) {
    console.error('Erro ao aplicar seed:', e.message);
    process.exit(1);
  }

  const counts = await client.query(
    'SELECT (SELECT COUNT(*) FROM opportunities WHERE org_id = $1::uuid) AS opps, (SELECT COUNT(*) FROM activities WHERE org_id = $1::uuid) AS acts, (SELECT COUNT(*) FROM reports WHERE org_id = $1::uuid) AS reports',
    [orgId]
  );
  const { opps, acts, reports } = counts.rows[0];

  console.log('');
  console.log('✓ Seed aplicado com sucesso.');
  console.log('  Organização:', DEMO_ORG_NAME, '(' + orgId + ')');
  console.log('  Usuário owner:', userId);
  console.log('  Oportunidades:', opps);
  console.log('  Atividades:', acts);
  console.log('  Reports:', reports);

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
