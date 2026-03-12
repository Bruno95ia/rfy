#!/usr/bin/env node
/**
 * Cria usuário de demonstração Admin (admin@demo.rfy.local / Adminrv),
 * organização "Admin Demo", org_members e aplica o seed completo.
 * Uso: node scripts/create-demo-admin.js
 * Requer: .env.local com NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e DATABASE_URL ou AI_DATABASE_URL.
 */

const { readFileSync, existsSync } = require('fs');
const { join } = require('path');
const { createClient } = require('@supabase/supabase-js');
const { spawn } = require('child_process');

const ROOT = join(__dirname, '..');
const DEMO_EMAIL = 'admin@demo.rfy.local';
const DEMO_PASSWORD = 'Adminrv';
const DEMO_ORG_NAME = 'Admin Demo';

function getDatabaseUrl() {
  return (
    process.env.DATABASE_URL ||
    process.env.AI_DATABASE_URL ||
    (process.env.POSTGRES_PASSWORD &&
      `postgresql://postgres:${process.env.POSTGRES_PASSWORD}@localhost:5432/postgres`)
  );
}

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

// .env.local primeiro; .env como fallback (ex.: DATABASE_URL)
loadEnvFile(join(ROOT, '.env.local'));
loadEnvFile(join(ROOT, '.env'));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Erro: defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local ou .env');
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** Busca usuário por email via listUsers (Supabase não tem getUserByEmail no admin). */
async function findUserByEmail(supabaseAdmin, email) {
  const perPage = 100;
  let page = 1;
  for (let i = 0; i < 20; i++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.warn('Aviso ao listar usuários:', error.message);
      return null;
    }
    const users = data?.users ?? [];
    const found = users.find((u) => (u.email || '').toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (users.length < perPage) break;
    page++;
  }
  return null;
}

async function main() {
  console.log('==> Criando usuário de demonstração Admin...');

  const { data: userData, error: userError } = await admin.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
  });

  if (userError) {
    const isAlreadyRegistered =
      userError.message && (
        userError.message.includes('already been registered') ||
        userError.message.includes('already exists') ||
        userError.message.includes('already registered')
      );
    if (isAlreadyRegistered) {
      const existingUser = await findUserByEmail(admin, DEMO_EMAIL);
      if (existingUser) {
        console.log('   Usuário já existe:', existingUser.id);
        await createOrgAndSeed(existingUser.id);
        return;
      }
    }
    console.error('Erro ao criar usuário:', userError.message);
    process.exit(1);
  }

  const userId = userData?.user?.id;
  if (!userId) {
    console.error('Erro: usuário criado mas id não retornado');
    process.exit(1);
  }

  console.log('   Usuário criado:', userId);
  await createOrgAndSeed(userId);
}

/** Insere/atualiza org_members via pg para não depender do schema cache do Supabase (coluna role da migração 006). */
async function upsertOrgMember(orgId, userId) {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    console.error('Erro: DATABASE_URL ou AI_DATABASE_URL não definido.');
    return false;
  }
  const { Client } = require('pg');
  const client = new Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    await client.query(
      `INSERT INTO org_members(org_id, user_id, role)
       VALUES ($1::uuid, $2::uuid, 'owner')
       ON CONFLICT (org_id, user_id) DO UPDATE SET role = 'owner'`,
      [orgId, userId]
    );
    return true;
  } catch (e) {
    if (e.message && e.message.includes('role')) {
      await client.query(
        `INSERT INTO org_members(org_id, user_id)
         VALUES ($1::uuid, $2::uuid)
         ON CONFLICT (org_id, user_id) DO NOTHING`,
        [orgId, userId]
      );
      return true;
    }
    console.error('Erro ao vincular org_members:', e.message);
    return false;
  } finally {
    await client.end().catch(() => {});
  }
}

async function createOrgAndSeed(userId) {
  console.log('==> Criando organização Admin Demo e vínculo...');

  const { data: org, error: orgError } = await admin
    .from('orgs')
    .insert({ name: DEMO_ORG_NAME })
    .select('id')
    .single();

  if (orgError) {
    const { data: existingOrgs } = await admin.from('orgs').select('id').eq('name', DEMO_ORG_NAME).limit(1);
    if (existingOrgs?.length) {
      const orgId = existingOrgs[0].id;
      console.log('   Org Admin Demo já existe:', orgId);
      await upsertOrgMember(orgId, userId);
      await runSeed(orgId, userId);
      return;
    }
    console.error('Erro ao criar org:', orgError.message);
    process.exit(1);
  }

  const orgId = org.id;

  const memberOk = await upsertOrgMember(orgId, userId);
  if (!memberOk) {
    console.error('Erro ao vincular usuário à organização. Verifique se as migrations foram aplicadas (npm run db:up ou npm run db:migrate).');
    process.exit(1);
  }

  console.log('   Org e membro OK. Aplicando seed...');
  await runSeed(orgId, userId);
}

function runSeed(orgId, userId) {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      DEMO_ORG_ID: orgId,
      DEMO_USER_ID: userId,
      DEMO_ORG_NAME: DEMO_ORG_NAME,
    };
    const child = spawn('node', [join(__dirname, 'db-seed-demo-node.js')], {
      cwd: ROOT,
      env,
      stdio: 'inherit',
    });
    child.on('close', (code) => {
      if (code === 0) {
        console.log('');
        console.log('✓ Conta de demonstração pronta.');
        console.log('  Login: ' + DEMO_EMAIL);
        console.log('  Senha: ' + DEMO_PASSWORD);
        console.log('  Acesse /login e entre com essas credenciais.');
        resolve();
      } else reject(new Error('Seed saiu com código ' + code));
    });
    child.on('error', reject);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
