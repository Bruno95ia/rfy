#!/usr/bin/env node
/**
 * Remove duplicatas em opportunities (org_id, crm_hash) para permitir
 * criar o índice único da migração 002. Uso: node scripts/dedupe-opportunities.js
 */

const { readFileSync, existsSync } = require('fs');
const { join } = require('path');
const { Client } = require('pg');

const ROOT = join(__dirname, '..');

function loadEnv(path) {
  if (!existsSync(path)) return;
  const content = readFileSync(path, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const m = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
    }
  }
}

loadEnv(join(ROOT, '.env.local'));
loadEnv(join(ROOT, '.env'));

const DATABASE_URL = process.env.DATABASE_URL || process.env.AI_DATABASE_URL;
if (!DATABASE_URL) {
  console.error('Defina DATABASE_URL ou AI_DATABASE_URL em .env.local');
  process.exit(1);
}

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  const r = await client.query(`
    WITH dupes AS (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY org_id, crm_hash ORDER BY id) AS rn
      FROM opportunities
    )
    DELETE FROM opportunities WHERE id IN (SELECT id FROM dupes WHERE rn > 1)
  `);
  const deleted = r.rowCount || 0;
  console.log('Duplicatas removidas em opportunities:', deleted);
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
