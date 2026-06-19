# HTN26 Challenge — Serandib Bank

> **Warning:** This project is a hackathon demo. Do not deploy as a real banking platform.

## Quick Start

```bash
cd hack-to-night-2026-challenge-main
bun install
bun run dev
```

Open: http://localhost:3000

Do not change the app port. This project is standardized on localhost:3000.

If port 3000 is busy:

```bash
lsof -ti:3000
kill -9 $(lsof -ti:3000)
bun run dev
```

Alternative using the dev script:

```bash
bash scripts/dev-local.sh
```

Commit workflow (simple and safe):

```bash
git status
git add -A
git commit -m "phase5b: your short message here"
git push
```

If your terminal shows `dquote>`, press Ctrl + C. It means a quote was not closed. Retype the commit command with a closing double-quote on the same line.

---

## Demo Credentials (local hackathon only)

| Role     | Email                      | Password          |
|----------|----------------------------|-------------------|
| Customer | customer@serandib.test     | SerandibUser123   |
| Admin    | admin@serandib.test        | SerandibAdmin123  |

These are local demo credentials for the hackathon challenge only.
Passwords are stored as bcrypt hashes (12 rounds). Plaintext is never persisted.

---

---

## Troubleshooting

### Login says Internal Server Error

1. Check `DATABASE_URL` is set in your `.env.local` or Docker environment.
2. Apply the schema: `psql $DATABASE_URL -f db/schema.sql`
3. Apply the seed: `psql $DATABASE_URL -f db/seed.sql`
4. Restart the dev server: `bun run dev`
5. Use exact demo credentials (copy-paste to avoid typos):
   - `customer@serandib.test` / `SerandibUser123`
   - `admin@serandib.test` / `SerandibAdmin123`
6. Check terminal logs for `[api/auth/login] unexpected error:` for the root cause.

### Terminal shows `dquote>`

Press Ctrl + C. A quote was not closed. Retype the command with a closing `"` on the same line.

### App not starting on port 3000

```bash
lsof -ti:3000 | xargs kill -9
bun run dev
```

---

## Setup with Docker

```bash
git clone https://github.com/Pawan-Prabhashana/team404-hacktonight.git
cd team404-hacktonight
cp .env.example .env.local
docker compose up --build --watch
```

---

## Project Structure

```
app/                     # Next.js App Router pages and API routes
  (accounts)/            # Auth group: login, sign-up, reset-password
  dashboard/
  bank-accounts/
  bank-transfer/
  pay-bills/
  smart-spend/
  e-statement/
  security/              # Security Center page (Phase 5)
  api/
    auth/login                        # POST -- secure login (bcrypt + session cookie)
    auth/me                           # GET  -- current user from session
    auth/logout                       # POST -- revoke session + clear cookie
    accounts                          # GET/PATCH -- session-scoped accounts
    transactions                      # GET -- session-scoped, paginated
    beneficiaries                     # GET/POST -- session-scoped
    beneficiaries/[beneficiaryId]     # PATCH/DELETE -- ownership-verified
    notifications                     # GET -- session-scoped
    notifications/[id]/read           # POST -- mark read
    search                            # GET -- user-scoped only
    transfer                          # POST -- disabled (Phase 6 ledger pending)
    admin/system                      # GET  -- admin-only diagnostics
components/
  auth/
    AuthProvider.tsx     # React auth context + useAuth() hook
    UserMenu.tsx         # Sidebar logout button
  layout/
    Sidebar.tsx          # Serandib Bank sidebar (navy/blue theme)
    AppShell.tsx         # Banking page shell
  ui/
    SerandibCard.tsx     # Premium card component
    SerandibButton.tsx   # Premium button component
    MetricCard.tsx       # Metric display card
    StatusPill.tsx       # Status badge
    AnimatedBackground.tsx
    PasswordStrengthMeter.tsx
    InfoCard.tsx
    PageSection.tsx
lib/
  db.ts                  # Safe parameterized database helper
  api-response.ts        # Centralized response helpers
  auth-errors.ts         # UnauthorizedError / ForbiddenError
  auth-client.ts         # Client-safe auth fetch helpers
  banking-auth.ts        # Account ownership helpers
  banking-client.ts      # Client-side banking API helpers
  masking.ts             # Account number masking
  password.ts            # bcrypt hash + verify
  password-generator.ts  # Strong password generator (Phase 5)
  session.ts             # Server-side session (serandib_session cookie)
  money.ts               # Minor-unit money utilities
  audit.ts               # Audit log helper
  validation.ts          # Zod validation schemas
  platform-db.ts         # Legacy DB shim
server/
  repositories/
    accounts-repository.ts
    transactions-repository.ts
    beneficiaries-repository.ts
    notifications-repository.ts
  schemas/
    banking-schemas.ts
public/
  brand/
    serandib-logo.png    # Serandib Bank logo (Phase 5)
    bank-hero.mp4        # Banking hero video (Phase 5)
proxy.ts                 # Edge proxy -- route protection
db/
  schema.sql             # Production PostgreSQL DDL
  seed.sql               # Demo data (Serandib credentials)
  README.md
scripts/
  dev-local.sh           # Safe local run script (Phase 5)
  hash-demo-passwords.ts # Generate bcrypt hashes
docs/
  SECURITY_PHASES.md
  API_AUTHORIZATION_CHECKLIST.md
```

---

## Modernization Roadmap

### Phase 1 -- Complete

- Removed duplicate root-level files
- Fixed broken links
- Created reusable AppShell and canonical Sidebar
- Standardized @/ imports

### Phase 2 -- Complete

- Safe parameterized database helper (lib/db.ts)
- Replaced all SQL injection vulnerabilities
- Centralized API response helpers
- Added money, audit, and validation utilities
- Added production banking schema (db/schema.sql)

### Phase 3 -- Complete

- bcrypt password hashing (12 rounds)
- Server-side session storage (SHA-256 token hashing, HttpOnly cookie)
- /api/auth/login, /api/auth/me, /api/auth/logout
- Edge proxy (proxy.ts) protects all banking routes
- Generic error messages (no user enumeration)

### Phase 4 -- Complete

- Account ownership enforced on all banking APIs
- User-scoped repository layer
- Account Shield Mode (freeze/unfreeze via UI)
- Protected transfer, accounts, transactions, beneficiaries, notifications APIs
- Dashboard, accounts, and transfer pages connected to real APIs
- Sensitive fields never returned in API responses

### Phase 5B -- Complete

- N26-inspired landing page rebuild (hero, app preview, plan cards, feature grid)
- Integrated numbered stock images (public/brand/stock-1.png through stock-6.png)
- Rebuilt login page: clean minimal split layout, demo fill buttons
- Rebuilt signup page: password generator, strength meter, demo notice
- Rebuilt reset password page: non-enumerating success message
- New reusable components: MarketingNav, PhoneMockup, FeatureCard, PlanCard, EditorialSection, SerandibLogo
- Refactored globals.css to N26-inspired design (clean whites, mint accents, large spacing)
- Fixed login Internal Server Error: schema mismatch between password/password_hash columns resolved
  - SCHEMA_DDL updated to use password_hash
  - ensureDatabase() split into per-statement execution for resilience
  - Login route uses COALESCE-safe password_hash alias query
- Updated scripts/hash-demo-passwords.ts to serandib.test credentials
- Cleaned README git commands (no multi-line fragile commits)
- Added dquote> troubleshooting note

### Phase 5 -- Complete

- Rebranded platform to Serandib Bank
- Session cookie renamed to serandib_session
- Demo credentials updated to @serandib.test with new passwords
- Integrated Serandib logo and banking video (public/brand/)
- Premium blue design system (CSS variables, utility classes, keyframes)
- Redesigned landing page with fintech-grade UI
- Redesigned sidebar (navy/blue theme) and AppShell
- Redesigned login page (split-screen, demo credential helpers)
- Redesigned signup page with strong password generator
- Redesigned reset password page
- Redesigned dashboard (live data, quick actions, security panel)
- Redesigned accounts page (Account Shield Mode UI)
- Redesigned transfer page (SafePay preview, no fake execution)
- Redesigned pay bills page
- Redesigned Smart Spend page (category breakdown, insights)
- Redesigned E-Statement page (filters, intelligence summary, table)
- Added Security Center page (/security)
- Added reusable UI components (SerandibCard, SerandibButton, etc.)
- Fixed dev script: next dev -p 3000 enforced
- Added scripts/dev-local.sh

### Phase 6 -- Complete

- Replaced 501 transfer stub with real atomic transfer engine
- `POST /api/transfer` executes real money movement inside a DB transaction
- Row-level `FOR UPDATE` locks prevent race conditions and overdrafts
- Idempotency key (unique index on user + key) prevents duplicate transfers
- Double-entry `ledger_entries` written on every transfer (debit + credit)
- Typed `BankingError` hierarchy (InsufficientFunds, AccountFrozen, AccountNotFound…)
- Zod validation schema (`server/schemas/transfer-schemas.ts`)
- Atomic transfer service (`server/services/transfer-service.ts`)
- Transfer receipt API: `GET /api/transfers/:reference` (ownership-scoped)
- Transactions repository updated: includes `reference`, `type` columns
- Banking client updated: `createTransfer()` with auto-generated idempotency key
- Transfer page rebuilt: source/dest selectors, review step, success receipt, error card
- Dashboard TxRow shows SRB reference numbers for completed transfers
- Accounts page: per-account Send Money and History buttons
- `docs/TRANSFER_ENGINE_CHECKLIST.md` manual test guide added

### Planned Phases

| Phase | Focus |
|-------|-------|
| 7 | Bill Payment Engine -- biller verification, idempotent payment records |
| 8 | SafePay Guardian -- fraud detection, risk scoring, anomaly alerts |
| 9 | Statement Intelligence -- downloadable PDFs, advanced search |
| 10 | Admin Fraud Command Center -- audit log viewer, protected admin dashboard |
