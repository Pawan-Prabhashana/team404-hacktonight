-- =============================================================================
-- NOVA Bank — Production Schema
-- Phase 2 foundation. Replaces the inline DDL from lib/platform-db.ts.
-- =============================================================================
-- Apply with:  psql $DATABASE_URL -f db/schema.sql
-- =============================================================================

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- USERS
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name       TEXT          NOT NULL,
  email           TEXT          NOT NULL,
  -- TODO Phase 3: populate with bcrypt/argon2 hashes; remove plaintext migration helper.
  password_hash   TEXT          NOT NULL,
  role            TEXT          NOT NULL DEFAULT 'customer'
                  CHECK (role IN ('customer', 'admin', 'support')),
  status          TEXT          NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'suspended', 'closed')),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT users_email_unique UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- =============================================================================
-- SESSIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS sessions (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  -- Store only the hash of the token, never the raw token.
  session_token_hash  TEXT        NOT NULL,
  expires_at          TIMESTAMPTZ NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at          TIMESTAMPTZ,
  CONSTRAINT sessions_token_hash_unique UNIQUE (session_token_hash)
);

CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions (session_token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id    ON sessions (user_id);

-- =============================================================================
-- ACCOUNTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS accounts (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  account_number        TEXT        NOT NULL,
  account_type          TEXT        NOT NULL DEFAULT 'savings'
                        CHECK (account_type IN ('savings', 'current', 'fixed_deposit', 'admin')),
  currency              CHAR(3)     NOT NULL DEFAULT 'LKR',
  -- Money stored in minor units (cents) to avoid floating-point issues.
  -- LKR uses 2 decimal places: Rs. 100.50 → 10050 minor units.
  balance_minor_units   BIGINT      NOT NULL DEFAULT 0
                        CHECK (balance_minor_units >= 0),
  status                TEXT        NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'frozen', 'closed')),
  nickname              TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT accounts_number_unique UNIQUE (account_number)
);

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts (user_id);

-- =============================================================================
-- BENEFICIARIES
-- =============================================================================
CREATE TABLE IF NOT EXISTS beneficiaries (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  bank_name       TEXT        NOT NULL,
  account_number  TEXT        NOT NULL,
  trust_level     TEXT        NOT NULL DEFAULT 'new'
                  CHECK (trust_level IN ('new', 'trusted', 'blocked')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_beneficiaries_user_id ON beneficiaries (user_id);

-- =============================================================================
-- TRANSACTIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS transactions (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reference                 TEXT        NOT NULL,
  user_id                   UUID        NOT NULL REFERENCES users (id),
  source_account_id         UUID        NOT NULL REFERENCES accounts (id),
  destination_account_id    UUID        REFERENCES accounts (id),
  beneficiary_id            UUID        REFERENCES beneficiaries (id),
  type                      TEXT        NOT NULL
                            CHECK (type IN ('transfer', 'bill_payment', 'deposit', 'withdrawal', 'fee')),
  direction                 TEXT        NOT NULL
                            CHECK (direction IN ('debit', 'credit')),
  amount_minor_units        BIGINT      NOT NULL CHECK (amount_minor_units > 0),
  currency                  CHAR(3)     NOT NULL DEFAULT 'LKR',
  status                    TEXT        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'completed', 'failed', 'reversed')),
  description               TEXT,
  risk_score                SMALLINT    CHECK (risk_score BETWEEN 0 AND 100),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT transactions_reference_unique UNIQUE (reference)
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id           ON transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_source_account    ON transactions (source_account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_status            ON transactions (status);

-- =============================================================================
-- LEDGER ENTRIES
-- Double-entry bookkeeping: every transaction produces two ledger rows.
-- =============================================================================
CREATE TABLE IF NOT EXISTS ledger_entries (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id            UUID        NOT NULL REFERENCES transactions (id),
  account_id                UUID        NOT NULL REFERENCES accounts (id),
  entry_type                TEXT        NOT NULL CHECK (entry_type IN ('debit', 'credit')),
  amount_minor_units        BIGINT      NOT NULL CHECK (amount_minor_units > 0),
  balance_after_minor_units BIGINT      NOT NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_account_id     ON ledger_entries (account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_transaction_id ON ledger_entries (transaction_id);

-- =============================================================================
-- BILLERS
-- =============================================================================
-- Phase 7: provider_code identifies the biller; status replaces is_active.
CREATE TABLE IF NOT EXISTS billers (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  category      TEXT        NOT NULL DEFAULT 'other'
                CHECK (category IN ('utilities', 'mobile', 'internet', 'insurance',
                                    'education', 'government', 'credit_card', 'other')),
  provider_code TEXT        NOT NULL,
  logo_url      TEXT,
  status        TEXT        NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'inactive')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT billers_provider_code_unique UNIQUE (provider_code)
);

CREATE INDEX IF NOT EXISTS idx_billers_category ON billers (category);

-- =============================================================================
-- BILL PAYMENTS
-- Phase 7: atomic, ledger-backed bill payments with idempotency protection.
-- =============================================================================
CREATE TABLE IF NOT EXISTS bill_payments (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reference           TEXT        NOT NULL,
  user_id             UUID        NOT NULL REFERENCES users (id),
  account_id          UUID        NOT NULL REFERENCES accounts (id),
  biller_id           UUID        NOT NULL REFERENCES billers (id),
  transaction_id      UUID        REFERENCES transactions (id),
  bill_reference      TEXT        NOT NULL,
  amount_minor_units  BIGINT      NOT NULL CHECK (amount_minor_units > 0),
  currency            CHAR(3)     NOT NULL DEFAULT 'LKR',
  status              TEXT        NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  idempotency_key     TEXT,
  scheduled_for       TIMESTAMPTZ,
  paid_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT bill_payments_reference_unique UNIQUE (reference)
);

CREATE INDEX IF NOT EXISTS idx_bill_payments_user_created    ON bill_payments (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bill_payments_account_created ON bill_payments (account_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bill_payments_user_idempotency
  ON bill_payments (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- =============================================================================
-- BUDGETS
-- =============================================================================
CREATE TABLE IF NOT EXISTS budgets (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  category              TEXT        NOT NULL,
  limit_minor_units     BIGINT      NOT NULL CHECK (limit_minor_units > 0),
  period                TEXT        NOT NULL DEFAULT 'monthly'
                        CHECK (period IN ('weekly', 'monthly', 'yearly')),
  currency              CHAR(3)     NOT NULL DEFAULT 'LKR',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- NOTIFICATIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  body        TEXT        NOT NULL,
  type        TEXT        NOT NULL DEFAULT 'info'
              CHECK (type IN ('info', 'alert', 'warning', 'success')),
  is_read     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id, is_read);

-- =============================================================================
-- AUDIT LOGS
-- =============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        REFERENCES users (id),
  action        TEXT        NOT NULL,
  entity_type   TEXT,
  entity_id     TEXT,
  metadata      JSONB       NOT NULL DEFAULT '{}'::jsonb,
  ip_address    INET,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id    ON audit_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action     ON audit_logs (action);

-- =============================================================================
-- RISK EVENTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS risk_events (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        REFERENCES users (id),
  transaction_id  UUID        REFERENCES transactions (id),
  risk_type       TEXT        NOT NULL,
  severity        TEXT        NOT NULL DEFAULT 'low'
                  CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  score           SMALLINT    NOT NULL CHECK (score BETWEEN 0 AND 100),
  reasons         JSONB       NOT NULL DEFAULT '[]'::jsonb,
  status          TEXT        NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open', 'reviewing', 'cleared', 'escalated')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_risk_events_status     ON risk_events (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_events_user_id    ON risk_events (user_id);

-- =============================================================================
-- TRUSTED DEVICES
-- =============================================================================
CREATE TABLE IF NOT EXISTS trusted_devices (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  device_hash     TEXT        NOT NULL,
  device_label    TEXT,
  trusted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at      TIMESTAMPTZ,
  CONSTRAINT trusted_devices_user_device_unique UNIQUE (user_id, device_hash)
);

-- =============================================================================
-- TRANSFER LIMITS
-- =============================================================================
CREATE TABLE IF NOT EXISTS transfer_limits (
  id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id                  UUID        NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  daily_limit_minor_units     BIGINT      NOT NULL DEFAULT 500000,   -- Rs. 5,000
  per_txn_limit_minor_units   BIGINT      NOT NULL DEFAULT 100000,   -- Rs. 1,000
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT transfer_limits_account_unique UNIQUE (account_id)
);

-- =============================================================================
-- PHASE 9: INVISIBLE SAVINGS
-- =============================================================================

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
CREATE INDEX IF NOT EXISTS idx_invisible_events_user_month    ON invisible_savings_events(user_id, month_key);
CREATE INDEX IF NOT EXISTS idx_invisible_events_user_created  ON invisible_savings_events(user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_invisible_events_idempotency
  ON invisible_savings_events(user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

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
