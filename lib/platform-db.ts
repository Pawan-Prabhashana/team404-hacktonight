/**
 * platform-db.ts — backward-compatibility shim for existing API routes.
 *
 * New code should import directly from @/lib/db or @/lib/api-response.
 * This file remains so existing imports are not broken while the API routes
 * are migrated incrementally during Phase 2.
 *
 * REMOVED (were security hazards):
 *   - serviceFailure() leaked stack trace, error code, detail, and DATABASE_URL
 *   - runStatement() logged full SQL and accepted raw interpolated strings
 *   - Plaintext passwords in seed data
 *   - Hardcoded fallback credentials in connection string
 */

import type { QueryResultRow } from 'pg'
import { pool, query, withTransaction } from '@/lib/db'

export { pool, withTransaction }

// ---------------------------------------------------------------------------
// Schema bootstrap (local dev / Docker only)
// ---------------------------------------------------------------------------

const SCHEMA_DDL = `
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL        PRIMARY KEY,
  full_name     TEXT          NOT NULL,
  email         TEXT          UNIQUE,
  password_hash TEXT          NOT NULL,
  role          TEXT          NOT NULL DEFAULT 'customer',
  status        TEXT          NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email_legacy ON users (email);

-- Ensure password_hash column exists even if old schema used 'password'
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
-- Copy values from legacy 'password' column if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'password'
  ) THEN
    UPDATE users SET password_hash = password WHERE password_hash IS NULL;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  account_number TEXT UNIQUE NOT NULL,
  account_name TEXT NOT NULL,
  balance NUMERIC(14, 2) NOT NULL DEFAULT 0,
  pin TEXT NOT NULL DEFAULT '0000'
);

CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  from_account TEXT NOT NULL,
  to_account TEXT NOT NULL,
  amount NUMERIC(14, 2) NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'SUCCESS',
  created_by INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  event TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Phase 3: server-side session storage.
-- session_token_hash is SHA-256(raw_token). Raw token lives only in HttpOnly cookie.
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  CONSTRAINT sessions_token_unique UNIQUE (session_token_hash)
);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions (session_token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);

-- Phase 4: account status and nickname support.
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS nickname TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Phase 6: transaction reference, type, idempotency
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reference TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'transfer';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference) WHERE reference IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_user_idempotency ON transactions(created_by, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Phase 6: double-entry ledger for atomic transfers
CREATE TABLE IF NOT EXISTS ledger_entries (
  id               SERIAL       PRIMARY KEY,
  transaction_id   INTEGER      NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  account_id       INTEGER      NOT NULL REFERENCES accounts(id),
  entry_type       TEXT         NOT NULL CHECK (entry_type IN ('debit', 'credit')),
  amount_minor_units  BIGINT    NOT NULL CHECK (amount_minor_units > 0),
  balance_after_minor_units BIGINT NOT NULL,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_transaction_id ON ledger_entries(transaction_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_account_id    ON ledger_entries(account_id, created_at DESC);

-- Phase 4: beneficiaries — saved payees per user.
CREATE TABLE IF NOT EXISTS beneficiaries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bank_name TEXT NOT NULL DEFAULT 'NOVA Bank',
  account_number TEXT NOT NULL,
  trust_level TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_user_id ON beneficiaries (user_id);

-- Phase 4: notifications per user.
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id);

-- Phase 4: extend audit_logs to match lib/audit.ts expectations.
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_id INTEGER;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS action TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_id TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;
`

// Phase 5B: passwords are bcrypt-hashed (12 rounds). Demo credentials only.
//   customer@serandib.test / SerandibUser123
//   admin@serandib.test    / SerandibAdmin123
// ON CONFLICT ... DO UPDATE ensures existing rows get the new hashes applied.
const SEED_DML = `
INSERT INTO users (id, full_name, email, password_hash, role) VALUES
  (1, 'Demo Customer',           'customer@serandib.test', '$2b$12$cUicUs3hdmD8RdytV3.S6O3mZ2JOUiA2eBDcP2ZOfwcvDYaNsfqT.', 'customer'),
  (2, 'Kasun Wickramanayake',    'kasun@serandib.test',    '$2b$12$cUicUs3hdmD8RdytV3.S6O3mZ2JOUiA2eBDcP2ZOfwcvDYaNsfqT.', 'customer'),
  (3, 'Platform Administrator',  'admin@serandib.test',    '$2b$12$MXuqNM2a0InAu/8vIMnraOf6mEfc4lt/auEyYyydaG582toOieKVW',  'admin')
ON CONFLICT (id) DO UPDATE
  SET password_hash = EXCLUDED.password_hash,
      email         = EXCLUDED.email,
      full_name     = EXCLUDED.full_name;

INSERT INTO accounts (user_id, account_number, account_name, balance) VALUES
  (1, '1000003423', 'Dilara Savings',  100000.00),
  (1, '1000004876', 'Dilara Expenses',  42000.00),
  (2, '2000006754', 'Kasun Current',    9870.00),
  (3, '9999999999', 'Admin Vault',      9999999.99)
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO transactions (from_account, to_account, amount, description, created_by) VALUES
  ('1000003423', '2000006754', 4500.00,  'Lunch money',         1),
  ('1000004876', '9999999999', 10000.00, 'Totally normal fee',  1),
  ('2000006754', '1000003423', 9870.00,  'Refund maybe',        2)
ON CONFLICT DO NOTHING;

INSERT INTO beneficiaries (user_id, name, bank_name, account_number, trust_level) VALUES
  (1, 'Kasun Wickramanayake', 'Serandib Bank', '2000006754', 'trusted')
ON CONFLICT DO NOTHING;

INSERT INTO notifications (user_id, type, title, message) VALUES
  (1, 'security', 'New login detected', 'A new login to your account was recorded. If this was not you, change your password immediately.'),
  (1, 'info',     'Welcome to Serandib Bank', 'Your account is active and ready to use. Review your accounts and set up beneficiaries.')
ON CONFLICT DO NOTHING;
`

let booted = false

// Split a multi-statement SQL string into individual statements and run each
// one separately. This avoids pg quirks with multi-statement batches and allows
// per-statement error isolation.
async function runStatements(sql: string): Promise<void> {
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  for (const stmt of statements) {
    try {
      await pool.query(stmt)
    } catch (err) {
      const msg = (err as Error).message
      // Tolerate "already exists" and "duplicate" errors from seed re-runs.
      // These are expected when the server restarts against an existing database.
      if (
        msg.includes('already exists') ||
        msg.includes('duplicate key') ||
        msg.includes('unique constraint') ||
        msg.includes('column') ||
        msg.includes('relation') // e.g. "relation already exists"
      ) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(
            '[db] schema/seed skip (already applied):',
            msg.slice(0, 80)
          )
        }
      } else {
        // Real error — rethrow so callers know DB is not healthy.
        throw err
      }
    }
  }
}

export async function ensureDatabase() {
  if (booted) return
  try {
    await runStatements(SCHEMA_DDL)
    await runStatements(SEED_DML)
    booted = true
  } catch (err) {
    // Do NOT set booted=true so the next request retries.
    console.error('[db] ensureDatabase failed:', (err as Error).message)
    throw err
  }
}

// ---------------------------------------------------------------------------
// Safe parameterized query helper
// ---------------------------------------------------------------------------

/**
 * Parameterized query wrapper. Always pass user input via the params array.
 *
 * @deprecated Prefer importing `query` directly from @/lib/db in new code.
 */
export async function runStatement<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
) {
  await ensureDatabase()
  // Only log the SQL template (no param values) in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    console.log('[bank-sql]', text.trim().slice(0, 120))
  }
  return query<T>(text, params)
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

export function asText(value: unknown): string {
  if (value === undefined || value === null) return ''
  return String(value)
}
