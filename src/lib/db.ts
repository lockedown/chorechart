import { neon } from "@neondatabase/serverless";
import { hashSync } from "bcryptjs";
import { randomUUID } from "crypto";

const DATABASE_URL = process.env.DATABASE_URL!;

export const sql = neon(DATABASE_URL);

// Postgres NUMERIC columns come back as strings — coerce to JS numbers
export function numify<T extends Record<string, unknown>>(row: T, ...keys: string[]): T {
  const out = { ...row };
  for (const k of keys) {
    if (k in out && out[k] !== null && out[k] !== undefined) {
      (out as Record<string, unknown>)[k] = Number(out[k]);
    }
  }
  return out;
}

let _initialized = false;

export async function ensureDb() {
  if (_initialized) return;
  _initialized = true;

  await sql`
    CREATE TABLE IF NOT EXISTS children (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      avatar TEXT NOT NULL DEFAULT '',
      balance NUMERIC NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS chores (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      value NUMERIC NOT NULL DEFAULT 0,
      frequency TEXT NOT NULL DEFAULT 'one-off',
      day_of_week INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  // V2 migration: add day_of_week if missing
  await sql`ALTER TABLE chores ADD COLUMN IF NOT EXISTS day_of_week INTEGER`;

  await sql`
    CREATE TABLE IF NOT EXISTS chore_assignments (
      id TEXT PRIMARY KEY,
      child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      chore_id TEXT NOT NULL REFERENCES chores(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending',
      due_date TEXT,
      end_date TEXT,
      recurrence_source_id TEXT,
      completed_at TIMESTAMPTZ,
      approved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  // V2 migration: add end_date and recurrence_source_id if missing
  await sql`ALTER TABLE chore_assignments ADD COLUMN IF NOT EXISTS end_date TEXT`;
  await sql`ALTER TABLE chore_assignments ADD COLUMN IF NOT EXISTS recurrence_source_id TEXT`;

  await sql`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      amount NUMERIC NOT NULL,
      "type" TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS rewards (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      cost NUMERIC NOT NULL,
      icon TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS reward_claims (
      id TEXT PRIMARY KEY,
      child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      reward_id TEXT NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'child',
      child_id TEXT REFERENCES children(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS chore_proposals (
      id TEXT PRIMARY KEY,
      child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      requested_value NUMERIC NOT NULL,
      admin_value NUMERIC,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS savings_goals (
      id TEXT PRIMARY KEY,
      child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      target_amount NUMERIC NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  // Seed admin user
  const existing = await sql`SELECT id FROM users WHERE role = 'admin' LIMIT 1`;
  if (existing.length === 0) {
    const id = randomUUID();
    const hash = hashSync("admin", 10);
    await sql`INSERT INTO users (id, username, password_hash, role) VALUES (${id}, ${'admin'}, ${hash}, 'admin')`;
  }
}
