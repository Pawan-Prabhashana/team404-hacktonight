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
INSERT INTO billers (id, name, code, category, logo_path) VALUES
  (gen_random_uuid(), 'Water Board',               'water',   'utility',       '/billers/water-board.png'),
  (gen_random_uuid(), 'Ceylon Electricity Board',  'ceb',     'utility',       '/billers/ceb.png'),
  (gen_random_uuid(), 'Dialog Axiata',             'dialog',  'telecom',       '/billers/dialog.png'),
  (gen_random_uuid(), 'Sri Lanka Telecom',         'slt',     'telecom',       '/billers/electricity.png'),
  (gen_random_uuid(), 'Airtel Lanka',              'airtel',  'telecom',       '/billers/airtel.png'),
  (gen_random_uuid(), 'LOLC Finance',              'lolc',    'finance',       '/billers/lolc.png'),
  (gen_random_uuid(), 'AIA Insurance',             'aia',     'insurance',     '/billers/aia.png'),
  (gen_random_uuid(), 'HSBC',                      'hsbc',    'bank',          '/billers/hsbc.png'),
  (gen_random_uuid(), 'PEO TV',                    'peotv',   'entertainment', '/billers/mpesa.png'),
  (gen_random_uuid(), 'Hutch Lanka',               'hutch',   'telecom',       '/billers/hutch.png')
ON CONFLICT (code) DO NOTHING;

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
