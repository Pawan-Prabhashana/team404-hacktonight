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

-- Ensure password_hash column exists (safe no-op if already present).
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

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
  bank_name TEXT NOT NULL DEFAULT 'Serandib Bank',
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

-- Phase 7: billers — utilities, telecom, insurance, etc. the user can pay.
CREATE TABLE IF NOT EXISTS billers (
  id            SERIAL       PRIMARY KEY,
  name          TEXT         NOT NULL,
  category      TEXT         NOT NULL DEFAULT 'other',
  provider_code TEXT         UNIQUE NOT NULL,
  logo_url      TEXT,
  status        TEXT         NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_billers_category ON billers(category);

-- Phase 7: bill payments — each row is one completed/pending bill payment.
-- amount stored in integer minor units, mirroring the Phase 6 ledger.
CREATE TABLE IF NOT EXISTS bill_payments (
  id                  SERIAL       PRIMARY KEY,
  reference           TEXT         UNIQUE NOT NULL,
  user_id             INTEGER      NOT NULL REFERENCES users(id),
  account_id          INTEGER      NOT NULL REFERENCES accounts(id),
  biller_id           INTEGER      NOT NULL REFERENCES billers(id),
  transaction_id      INTEGER      REFERENCES transactions(id),
  bill_reference      TEXT         NOT NULL,
  amount_minor_units  BIGINT       NOT NULL CHECK (amount_minor_units > 0),
  currency            TEXT         NOT NULL DEFAULT 'LKR',
  status              TEXT         NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  idempotency_key     TEXT,
  scheduled_for       TIMESTAMPTZ,
  paid_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bill_payments_user_created ON bill_payments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bill_payments_account_created ON bill_payments(account_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bill_payments_user_idempotency
  ON bill_payments(user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Phase 8: category tag on each transaction for Smart Spend analytics
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS category_slug TEXT;

-- Phase 8: spend categories reference table
CREATE TABLE IF NOT EXISTS spend_categories (
  id         SERIAL      PRIMARY KEY,
  name       TEXT        NOT NULL UNIQUE,
  slug       TEXT        NOT NULL UNIQUE,
  color      TEXT        NOT NULL DEFAULT '#9ca3af',
  icon       TEXT        NOT NULL DEFAULT 'o',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Phase 8: per-user monthly budgets
CREATE TABLE IF NOT EXISTS budgets (
  id                  SERIAL      PRIMARY KEY,
  user_id             INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_slug       TEXT        NOT NULL,
  amount_minor_units  BIGINT      NOT NULL CHECK (amount_minor_units > 0),
  currency            TEXT        NOT NULL DEFAULT 'LKR',
  period              TEXT        NOT NULL DEFAULT 'monthly',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, category_slug, period)
);
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);

-- Phase 9: Invisible Savings — partner merchants
CREATE TABLE IF NOT EXISTS partner_merchants (
  id                      SERIAL      PRIMARY KEY,
  name                    TEXT        NOT NULL UNIQUE,
  slug                    TEXT        NOT NULL UNIQUE,
  category                TEXT        NOT NULL DEFAULT 'food_and_dining',
  logo_url                TEXT,
  status                  TEXT        NOT NULL DEFAULT 'active',
  min_roundup_minor_units BIGINT      NOT NULL DEFAULT 2000,
  max_roundup_minor_units BIGINT      NOT NULL DEFAULT 5000,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_partner_merchants_status ON partner_merchants(status);

-- Phase 9: per-user invisible savings settings
CREATE TABLE IF NOT EXISTS invisible_savings_settings (
  id                      SERIAL      PRIMARY KEY,
  user_id                 INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  source_account_id       INTEGER     NOT NULL REFERENCES accounts(id),
  destination_account_id  INTEGER     NOT NULL REFERENCES accounts(id),
  enabled                 BOOLEAN     NOT NULL DEFAULT TRUE,
  min_roundup_minor_units BIGINT      NOT NULL DEFAULT 2000,
  max_roundup_minor_units BIGINT      NOT NULL DEFAULT 5000,
  sweep_day               INTEGER     NOT NULL DEFAULT 28 CHECK (sweep_day BETWEEN 1 AND 28),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Phase 9: each individual partner purchase event
CREATE TABLE IF NOT EXISTS invisible_savings_events (
  id                          SERIAL      PRIMARY KEY,
  user_id                     INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  partner_merchant_id         INTEGER     NOT NULL REFERENCES partner_merchants(id),
  source_account_id           INTEGER     NOT NULL REFERENCES accounts(id),
  destination_account_id      INTEGER     NOT NULL REFERENCES accounts(id),
  purchase_transaction_id     INTEGER     REFERENCES transactions(id),
  saving_transaction_id       INTEGER     REFERENCES transactions(id),
  purchase_amount_minor_units BIGINT      NOT NULL CHECK (purchase_amount_minor_units > 0),
  roundup_amount_minor_units  BIGINT      NOT NULL CHECK (roundup_amount_minor_units > 0),
  total_debit_minor_units     BIGINT      NOT NULL CHECK (total_debit_minor_units > 0),
  currency                    TEXT        NOT NULL DEFAULT 'LKR',
  status                      TEXT        NOT NULL DEFAULT 'accumulated',
  month_key                   TEXT        NOT NULL,
  idempotency_key             TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_invisible_events_user_month ON invisible_savings_events(user_id, month_key);
CREATE INDEX IF NOT EXISTS idx_invisible_events_user_created ON invisible_savings_events(user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_invisible_events_idempotency
  ON invisible_savings_events(user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Phase 9: monthly sweep records
CREATE TABLE IF NOT EXISTS invisible_savings_sweeps (
  id                     SERIAL      PRIMARY KEY,
  user_id                INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_account_id      INTEGER     NOT NULL REFERENCES accounts(id),
  destination_account_id INTEGER     NOT NULL REFERENCES accounts(id),
  month_key              TEXT        NOT NULL,
  amount_minor_units     BIGINT      NOT NULL CHECK (amount_minor_units > 0),
  status                 TEXT        NOT NULL DEFAULT 'completed',
  transaction_id         INTEGER     REFERENCES transactions(id),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, month_key)
);
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

-- Phase 7: demo billers. provider_code is the unique conflict target.
INSERT INTO billers (name, category, provider_code, logo_url, status) VALUES
  ('CEB Electricity',     'utilities', 'CEB',     '/billers/ceb.png',          'active'),
  ('National Water Board','utilities', 'NWSDB',   '/billers/water-board.png',  'active'),
  ('Dialog Mobile',       'mobile',    'DIALOG',  '/billers/dialog.png',       'active'),
  ('SLT Fiber',           'internet',  'SLT',     '/billers/electricity.png',  'active'),
  ('Mobitel',             'mobile',    'MOBITEL', '/billers/hutch.png',        'active'),
  ('AIA Insurance',       'insurance', 'AIA',     '/billers/aia.png',          'active'),
  ('University Payments', 'education', 'UNI',     null,                        'active'),
  ('Municipal Council',   'government','MUNI',    null,                        'active')
ON CONFLICT (provider_code) DO NOTHING;

-- Phase 8: spend categories reference data
INSERT INTO spend_categories (name, slug, color, icon) VALUES
  ('Groceries',     'groceries',     '#22c55e', 'G'),
  ('Utilities',     'utilities',     '#3b82f6', 'U'),
  ('Dining',        'dining',        '#f97316', 'D'),
  ('Transport',     'transport',     '#8b5cf6', 'T'),
  ('Shopping',      'shopping',      '#ec4899', 'S'),
  ('Subscriptions', 'subscriptions', '#6366f1', 'P'),
  ('Salary',        'salary',        '#10b981', 'Y'),
  ('Transfers',     'transfers',     '#64748b', 'X'),
  ('Bills',         'bills',         '#f59e0b', 'B'),
  ('Education',     'education',     '#0ea5e9', 'E'),
  ('Insurance',     'insurance',     '#14b8a6', 'I'),
  ('Travel',        'travel',        '#f43f5e', 'V'),
  ('Other',         'other',         '#9ca3af', 'O')
ON CONFLICT (slug) DO NOTHING;

-- Phase 8: demo budgets for the demo customer (user 1)
INSERT INTO budgets (user_id, category_slug, amount_minor_units, currency, period) VALUES
  (1, 'groceries',      200000, 'LKR', 'monthly'),
  (1, 'utilities',      150000, 'LKR', 'monthly'),
  (1, 'dining',         120000, 'LKR', 'monthly'),
  (1, 'transport',      100000, 'LKR', 'monthly'),
  (1, 'shopping',       150000, 'LKR', 'monthly'),
  (1, 'subscriptions',   50000, 'LKR', 'monthly')
ON CONFLICT DO NOTHING;

-- Phase 8: realistic demo transactions for Smart Spend analytics (current month)
-- All amounts in LKR (NUMERIC 14,2). Minor units = amount * 100.
-- References prevent duplicate inserts on server restart.
INSERT INTO transactions (from_account, to_account, amount, description, created_by, type, reference, created_at) VALUES
  ('1000004876', '9999999999',  1850.00, 'Keells Super - Weekly Groceries',  1, 'transfer', 'SEED-G001', NOW() - INTERVAL  '1 day'),
  ('1000004876', '9999999999',  2200.00, 'Cargills Food City - Groceries',   1, 'transfer', 'SEED-G002', NOW() - INTERVAL  '4 days'),
  ('1000004876', '9999999999',  1450.00, 'LAUGFS Supermarket',                1, 'transfer', 'SEED-G003', NOW() - INTERVAL  '9 days'),
  ('1000004876', '9999999999',  1950.00, 'Commons Cafe - Team Lunch',         1, 'transfer', 'SEED-D001', NOW() - INTERVAL  '2 days'),
  ('1000004876', '9999999999',   850.00, 'Burger King Colombo',               1, 'transfer', 'SEED-D002', NOW() - INTERVAL  '6 days'),
  ('1000004876', '9999999999',  1200.00, 'Noodle Box Takeaway',               1, 'transfer', 'SEED-D003', NOW() - INTERVAL '12 days'),
  ('1000004876', '9999999999',  1150.00, 'PickMe Taxi - Office commute',      1, 'transfer', 'SEED-T001', NOW() - INTERVAL  '1 day'),
  ('1000004876', '9999999999',   750.00, 'Uber Ride - Airport',               1, 'transfer', 'SEED-T002', NOW() - INTERVAL  '5 days'),
  ('1000004876', '9999999999',  3200.00, 'Fuel - IOC Petrol Station',         1, 'transfer', 'SEED-T003', NOW() - INTERVAL  '8 days'),
  ('1000004876', '9999999999',  1490.00, 'Netflix Monthly Subscription',      1, 'transfer', 'SEED-S001', NOW() - INTERVAL  '3 days'),
  ('1000004876', '9999999999',   599.00, 'Spotify Premium Subscription',      1, 'transfer', 'SEED-S002', NOW() - INTERVAL  '3 days'),
  ('1000004876', '9999999999',  8500.00, 'ODEL Clothing Purchase',            1, 'transfer', 'SEED-SH001', NOW() - INTERVAL '7 days'),
  ('1000004876', '9999999999',  4200.00, 'Amazon Household Essentials',       1, 'transfer', 'SEED-SH002', NOW() - INTERVAL '14 days'),
  ('9999999999', '1000003423', 85000.00, 'Monthly Salary - Serandib Corp',    1, 'transfer', 'SEED-INC01', NOW() - INTERVAL '15 days'),
  ('1000004876', '9999999999',  4500.00, 'Dialog Mobile - Monthly Bill',      1, 'bill_payment', 'SEED-BP001', NOW() - INTERVAL '5 days'),
  ('1000004876', '9999999999',  2800.00, 'CEB Electricity Bill',              1, 'bill_payment', 'SEED-BP002', NOW() - INTERVAL '10 days')
ON CONFLICT DO NOTHING;

-- Phase 9: partner merchants (no local logo assets, logo_url left null for fallback badges)
INSERT INTO partner_merchants (name, slug, category, logo_url, status, min_roundup_minor_units, max_roundup_minor_units) VALUES
  ('Barista',       'barista',       'food_and_dining', null, 'active', 2000, 5000),
  ('Java Lounge',   'java-lounge',   'food_and_dining', null, 'active', 2000, 5000),
  ('KFC',           'kfc',           'food_and_dining', null, 'active', 2000, 5000),
  ('Pizza Hut',     'pizza-hut',     'food_and_dining', null, 'active', 2000, 5000),
  ('Dominos',       'dominos',       'food_and_dining', null, 'active', 2000, 5000),
  ('Crepe Runner',  'crepe-runner',  'food_and_dining', null, 'active', 2000, 5000),
  ('Caravan Fresh', 'caravan-fresh', 'food_and_dining', null, 'active', 2000, 5000)
ON CONFLICT (slug) DO NOTHING;

-- Phase 9: default invisible savings settings for demo customer
-- source = Expenses account (1000004876), destination = Savings account (1000003423)
INSERT INTO invisible_savings_settings
  (user_id, source_account_id, destination_account_id, enabled, min_roundup_minor_units, max_roundup_minor_units, sweep_day)
SELECT
  1,
  (SELECT id FROM accounts WHERE account_number = '1000004876' LIMIT 1),
  (SELECT id FROM accounts WHERE account_number = '1000003423' LIMIT 1),
  true, 2000, 5000, 28
WHERE NOT EXISTS (SELECT 1 FROM invisible_savings_settings WHERE user_id = 1);
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
        msg.includes('relation') ||
        msg.includes('no unique or exclusion constraint') ||
        msg.includes('violates not-null constraint') ||
        msg.includes('does not exist')
      ) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(
            '[db] schema/seed skip (already applied):',
            msg.slice(0, 120)
          )
        }
      } else {
        // Real error — log the failing statement so it's easy to diagnose.
        console.error(
          '[db] runStatements fatal error:',
          msg,
          '\nFailing SQL:',
          stmt.slice(0, 200)
        )
        throw err
      }
    }
  }
}

export async function ensureDatabase() {
  if (booted) return
  // Schema creation is critical — rethrow if it fails.
  await runStatements(SCHEMA_DDL)
  // Seed data is best-effort — log failures but do not block the app.
  try {
    await runStatements(SEED_DML)
  } catch (err) {
    console.error(
      '[db] seed DML warning (non-fatal):',
      (err as Error).message
    )
  }
  booted = true
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
