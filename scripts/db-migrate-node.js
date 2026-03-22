#!/usr/bin/env node
/**
 * Aplica schema e migrations via Node (pg).
 * Use quando não tiver psql nem Docker: DATABASE_URL no .env.local ou export.
 * Carrega .env.local da raiz do projeto se existir.
 */

const { readFileSync, readdirSync, existsSync } = require('fs');
const { join } = require('path');
const { createHash } = require('crypto');
const { Client } = require('pg');

const ROOT = join(__dirname, '..');

function loadEnv(file) {
  const path = join(ROOT, file);
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

loadEnv('.env');
loadEnv('.env.local');

// DATABASE_URL ou AI_DATABASE_URL (Supabase costuma usar a mesma connection string)
const DATABASE_URL = process.env.DATABASE_URL
  || process.env.AI_DATABASE_URL
  || `postgresql://postgres:${process.env.POSTGRES_PASSWORD || 'postgres'}@localhost:5432/postgres`;

const upTo = process.argv.includes('--up-to') ? process.argv[process.argv.indexOf('--up-to') + 1] : null;

function fileChecksum(content) {
  return createHash('sha256').update(content).digest('hex');
}

function getMigrationFiles() {
  const schemaPath = join(ROOT, 'supabase/sql/schema.sql');
  const migrationsDir = join(ROOT, 'supabase/sql/migrations');
  const list = [];
  if (existsSync(schemaPath)) list.push({ path: schemaPath, version: 'schema.sql' });
  if (existsSync(migrationsDir)) {
    const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
    for (const f of files) list.push({ path: join(migrationsDir, f), version: f });
  }
  return list;
}

async function main() {
  if (!DATABASE_URL) {
    console.error('Erro: defina DATABASE_URL (ou coloque em .env.local).');
    process.exit(1);
  }

  const clientConfig = { connectionString: DATABASE_URL };
  if (DATABASE_URL.includes('sslmode=require') || DATABASE_URL.includes('ssl=true')) {
    clientConfig.ssl = { rejectUnauthorized: false };
  }
  const client = new Client(clientConfig);
  try {
    await client.connect();
  } catch (e) {
    console.error('Erro ao conectar no banco:', e.message);
    console.error('');
    if (e.message && (e.message.includes('ENOTFOUND') || e.message.includes('getaddrinfo'))) {
      console.error('Se estiver usando Supabase:');
      console.error('  - Projeto pausado? Ative em supabase.com (Dashboard do projeto).');
      console.error('  - Use a Connection Pooler (porta 6543, host aws-0-XX.pooler.supabase.com):');
      console.error('    Settings > Database > Connection string > URI (modo Session ou Transaction).');
    }
    console.error('  1) Supabase: DATABASE_URL ou AI_DATABASE_URL em .env.local com a URI do Pooler.');
    console.error('  2) Postgres local: suba o Docker e rode "npm run db:up"');
    process.exit(1);
  }

  const isLocal = DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1');
  console.log('==> Banco alvo (Node/pg):', DATABASE_URL.replace(/:[^:@]+@/, ':****@'));
  if (isLocal) console.log('    Dica: Postgres local — suba o container antes: docker compose up -d postgres');

  await client.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      version text PRIMARY KEY,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  const files = getMigrationFiles();
  if (files.length === 0) {
    console.error('Nenhum arquivo de migração encontrado.');
    process.exit(1);
  }

  let foundUpTo = false;
  for (const { path: filePath, version } of files) {
    const content = readFileSync(filePath, 'utf8');
    const checksum = fileChecksum(content);

    const r = await client.query(
      "SELECT checksum FROM public.schema_migrations WHERE version = $1",
      [version]
    );
    const existing = r.rows[0]?.checksum;

    if (existing) {
      if (existing !== checksum) {
        console.error(`Erro: checksum divergente para ${version}. Crie uma nova migração.`);
        process.exit(1);
      }
      console.log('✓', version, '(já aplicada)');
    } else {
      console.log('→ Aplicando', version);
      await client.query('BEGIN');
      try {
        await client.query(content);
        await client.query(
          `INSERT INTO public.schema_migrations(version, checksum) VALUES ($1, $2)`,
          [version, checksum]
        );
        await client.query('COMMIT');
        console.log('✓', version, '(ok)');
      } catch (e) {
        await client.query('ROLLBACK');
        if (e.message && e.message.includes('already exists')) {
          await client.query(
            `INSERT INTO public.schema_migrations(version, checksum) VALUES ($1, $2) ON CONFLICT (version) DO NOTHING`,
            [version, checksum]
          );
          console.log('✓', version, '(já existia no banco, registrado)');
        } else {
          console.error('Erro em', version, ':', e.message);
          process.exit(1);
        }
      }
    }

    if (upTo && version === upTo) {
      foundUpTo = true;
      break;
    }
  }

  if (upTo && !foundUpTo) {
    console.error('Erro: arquivo definido em --up-to não encontrado:', upTo);
    process.exit(1);
  }

  await client.end();
  console.log('==> Migrações finalizadas com sucesso.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
