-- =============================================================================
-- Serandib Bank -- Demo Seed Data  (Phase 5)
-- =============================================================================
-- Apply AFTER schema.sql:  psql $DATABASE_URL -f db/seed.sql
--
-- DEMO CREDENTIALS (local development only):
--   Customer:  customer@serandib.test  /  SerandibUser123
--   Admin:     admin@serandib.test     /  SerandibAdmin123
--
-- Passwords are bcrypt-hashed (12 rounds). Never store plaintext passwords.
--
-- NEVER deploy these demo credentials to a real environment.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- BILLERS
-- ---------------------------------------------------------------------------
-- Phase 7: provider_code is the unique conflict target; status replaces is_active.
INSERT INTO billers (id, name, category, provider_code, logo_url, status) VALUES
  (gen_random_uuid(), 'CEB Electricity',      'utilities',  'CEB',     '/billers/ceb.png',         'active'),
  (gen_random_uuid(), 'National Water Board', 'utilities',  'NWSDB',   '/billers/water-board.png', 'active'),
  (gen_random_uuid(), 'Dialog Mobile',        'mobile',     'DIALOG',  '/billers/dialog.png',      'active'),
  (gen_random_uuid(), 'SLT Fiber',            'internet',   'SLT',     '/billers/electricity.png', 'active'),
  (gen_random_uuid(), 'Mobitel',              'mobile',     'MOBITEL', '/billers/hutch.png',       'active'),
  (gen_random_uuid(), 'AIA Insurance',        'insurance',  'AIA',     '/billers/aia.png',         'active'),
  (gen_random_uuid(), 'University Payments',  'education',  'UNI',     NULL,                       'active'),
  (gen_random_uuid(), 'Municipal Council',    'government', 'MUNI',    NULL,                       'active')
ON CONFLICT (provider_code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- DEMO USERS
-- Bcrypt hashes (12 rounds) -- Phase 5 Serandib Bank credentials
-- ---------------------------------------------------------------------------
INSERT INTO users (id, full_name, email, password_hash, role) VALUES
  ('00000000-0000-0000-0000-000000000001',
   'Demo Customer',
   'customer@serandib.test',
   '$2b$12$cUicUs3hdmD8RdytV3.S6O3mZ2JOUiA2eBDcP2ZOfwcvDYaNsfqT.',
   'customer'),

  ('00000000-0000-0000-0000-000000000002',
   'Kasun Wickramanayake',
   'kasun@serandib.test',
   '$2b$12$cUicUs3hdmD8RdytV3.S6O3mZ2JOUiA2eBDcP2ZOfwcvDYaNsfqT.',
   'customer'),

  ('00000000-0000-0000-0000-000000000003',
   'Platform Administrator',
   'admin@serandib.test',
   '$2b$12$MXuqNM2a0InAu/8vIMnraOf6mEfc4lt/auEyYyydaG582toOieKVW',
   'admin')
ON CONFLICT (email) DO UPDATE
  SET password_hash = EXCLUDED.password_hash,
      full_name     = EXCLUDED.full_name;

-- ---------------------------------------------------------------------------
-- DEMO ACCOUNTS
-- balance_minor_units: Rs. 100,000.00 = 10000000 (x 100 for LKR cents)
-- ---------------------------------------------------------------------------
INSERT INTO accounts (id, user_id, account_number, account_type, currency, balance_minor_units, nickname) VALUES
  (gen_random_uuid(),
   '00000000-0000-0000-0000-000000000001',
   '1000003423', 'savings', 'LKR', 10000000, 'My Savings'),

  (gen_random_uuid(),
   '00000000-0000-0000-0000-000000000001',
   '1000004876', 'current', 'LKR', 4200000, 'Expenses'),

  (gen_random_uuid(),
   '00000000-0000-0000-0000-000000000002',
   '2000006754', 'current', 'LKR', 987000, 'Kasun Current'),

  (gen_random_uuid(),
   '00000000-0000-0000-0000-000000000003',
   '9999999999', 'admin',   'LKR', 999999999, 'Admin Vault')
ON CONFLICT (account_number) DO NOTHING;
