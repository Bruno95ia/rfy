/**
 * Autenticação própria: hash de senha (scrypt) e sessão em app_sessions.
 * Cookie: rfy_session = session_id (uuid). Sem Supabase.
 */

import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { getPool, query, queryOne } from '@/lib/db';

const SESSION_COOKIE = 'rfy_session';
const SESSION_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias
const SALT_LEN = 32;
const KEY_LEN = 64;
const SCRYPT_OPTS = { N: 16384, r: 8, p: 1 };

function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LEN);
  const key = scryptSync(password, salt, KEY_LEN, SCRYPT_OPTS);
  return `v1:${salt.toString('base64url')}:${key.toString('base64url')}`;
}

export function verifyPassword(storedHash: string, password: string): boolean {
  if (!storedHash.startsWith('v1:')) return false;
  const parts = storedHash.slice(3).split(':');
  if (parts.length !== 2) return false;
  const [saltB64, keyB64] = parts;
  const salt = Buffer.from(saltB64, 'base64url');
  const keyStored = Buffer.from(keyB64, 'base64url');
  const key = scryptSync(password, salt, KEY_LEN, SCRYPT_OPTS);
  if (key.length !== keyStored.length) return false;
  return timingSafeEqual(key, keyStored);
}

export type AppUser = { id: string; email: string };

export async function createUser(email: string, password: string): Promise<AppUser> {
  const normalized = email.trim().toLowerCase();
  const passwordHash = hashPassword(password);
  const pool = getPool();
  const { rows } = await pool.query<{ id: string; email: string }>(
    `INSERT INTO app_users (email, password_hash)
     VALUES ($1, $2)
     ON CONFLICT (email) DO NOTHING
     RETURNING id, email`,
    [normalized, passwordHash]
  );
  if (rows.length === 0) {
    throw new Error('Este e-mail já está cadastrado.');
  }
  return { id: rows[0].id, email: rows[0].email };
}

export async function getUserByEmail(email: string): Promise<AppUser | null> {
  const normalized = email.trim().toLowerCase();
  const row = await queryOne<{ id: string; email: string }>(
    `SELECT id, email FROM app_users WHERE email = $1`,
    [normalized]
  );
  return row;
}

export async function verifyLogin(email: string, password: string): Promise<AppUser | null> {
  const row = await queryOne<{ id: string; email: string; password_hash: string }>(
    `SELECT id, email, password_hash FROM app_users WHERE email = $1`,
    [email.trim().toLowerCase()]
  );
  if (!row || !verifyPassword(row.password_hash, password)) return null;
  return { id: row.id, email: row.email };
}

export async function createSession(userId: string): Promise<string> {
  const expiresAt = new Date(Date.now() + SESSION_AGE_MS);
  const pool = getPool();
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO app_sessions (user_id, expires_at) VALUES ($1, $2) RETURNING id`,
    [userId, expiresAt.toISOString()]
  );
  if (rows.length === 0) throw new Error('Falha ao criar sessão');
  return rows[0].id;
}

export async function getSessionUser(sessionId: string | null): Promise<AppUser | null> {
  if (!sessionId || sessionId.length < 30) return null;
  const now = new Date().toISOString();
  const row = await queryOne<{ user_id: string; email: string }>(
    `SELECT s.user_id, u.email
     FROM app_sessions s
     JOIN app_users u ON u.id = s.user_id
     WHERE s.id = $1 AND s.expires_at > $2`,
    [sessionId, now]
  );
  if (!row) return null;
  return { id: row.user_id, email: row.email };
}

export async function deleteSession(sessionId: string): Promise<void> {
  const pool = getPool();
  await pool.query(`DELETE FROM app_sessions WHERE id = $1`, [sessionId]);
}

export function getSessionCookieName(): string {
  return SESSION_COOKIE;
}

export function getSessionAgeMs(): number {
  return SESSION_AGE_MS;
}

/** No servidor Next: obtém o usuário atual a partir do cookie de sessão. */
export async function getCurrentUser(): Promise<AppUser | null> {
  const { cookies } = await import('next/headers');
  const store = await cookies();
  const sessionId = store.get(SESSION_COOKIE)?.value ?? null;
  return getSessionUser(sessionId);
}
