# Security Phases — Serandib Bank

Known issues and the planned remediation timeline.
Kept here to avoid scattering `TODO` comments across every file.

---

## Phase 1 — Complete ✅ (Route cleanup and UI foundation)

- Duplicate root `page.tsx` / `layout.tsx` removed.
- Broken `/accounts` link fixed to `/bank-accounts`.
- Canonical `Sidebar` and `AppShell` components created.
- Smart Spend placeholder built.

---

## Phase 2 — Complete ✅ (Secure database layer)

### What was fixed

| # | Issue | Resolution |
|---|-------|-----------|
| 1 | `serviceFailure()` leaked stack trace, DB URL, error codes to the client | Removed; replaced with `serverError()` from `lib/api-response.ts` |
| 2 | `/api/admin/system` returned `process.env`, all users (with passwords), all accounts (with PINs), and raw cookies | Returns HTTP 403 with a safe message |
| 3 | `/api/auth/login` GET returned ALL users including plaintext passwords | Endpoint returns 405; GET removed |
| 4 | `/api/auth/login` POST used raw string interpolation: `WHERE username = '${username}'` | Fully parameterized with `$1`, `$2` |
| 5 | `/api/accounts` injected `userId` directly: `WHERE a.user_id = ${userId}` | Parameterized; PIN column removed from all responses |
| 6 | `/api/accounts` had `includePins=true` query param that returned account PINs | Parameter removed entirely |
| 7 | `/api/transactions` injected account number directly into SQL | Parameterized with `$1` |
| 8 | `/api/transfer` used string interpolation for amount, accounts, userId | Fully parameterized; wrapped in `withTransaction()` for atomicity |
| 9 | `/api/search` used `ILIKE '%${q}%'` raw interpolation | Server-side wildcard wrapping, bound as `$1` |
| 10 | `/api/setup` accessible in production | Returns 403 when `NODE_ENV === 'production'` |
| 11 | `platform-db.ts` had hardcoded fallback credentials in the connection string | Removed; `DATABASE_URL` must be explicitly configured |

### New infrastructure added

- `lib/db.ts` — safe `query()` and `withTransaction()` helpers
- `lib/api-response.ts` — generic, non-leaking response helpers
- `lib/money.ts` — minor-unit money arithmetic utilities
- `lib/audit.ts` — parameterized audit log writer
- `lib/validation.ts` — Zod schemas for all future route inputs
- `db/schema.sql` — full production PostgreSQL schema
- `db/seed.sql` — demo data with password hash placeholders

---

## Phase 3 — Complete ✅ (Secure Authentication and Sessions)

### Issues resolved

| # | Issue | Resolution |
|---|-------|-----------|
| 1 | Plaintext password comparison in login | bcrypt.compare via `lib/password.ts` (12 rounds) |
| 2 | Insecure base64 session token returned in JSON body | Raw token stored in HttpOnly `nova_session` cookie only; SHA-256 hash stored in DB |
| 3 | Client-controlled `userId` in `/api/accounts` | Derived from verified session via `getCurrentUser()` |
| 4 | No authentication on `/api/transactions` | Requires session; validates account ownership |
| 5 | `/api/admin/system` returned 403 for all (Phase 2 interim) | Now requires admin session via `requireAdmin()`; returns safe diagnostics |
| 6 | No route protection on banking pages | `middleware.ts` redirects unauthenticated users to `/login?next=<path>` |
| 7 | Login revealed whether email or password was wrong | Generic "Invalid email or password." for both failures |
| 8 | No session invalidation | `/api/auth/logout` revokes session in DB + clears cookie |
| 9 | No current user endpoint | `/api/auth/me` returns safe user object or null |
| 10 | Seed data contained plaintext password placeholders | Replaced with bcrypt hashes (12 rounds) in both legacy and new schemas |

### New infrastructure added

- `lib/password.ts` — bcrypt hash and verify helpers
- `lib/session.ts` — `createSession()`, `getCurrentUser()`, `requireUser()`, `requireAdmin()`, `revokeCurrentSession()`
- `lib/auth-errors.ts` — typed `UnauthorizedError` and `ForbiddenError`
- `lib/auth-client.ts` — client-safe `login()`, `logout()`, `getCurrentUser()` fetchers
- `components/auth/AuthProvider.tsx` — React context + `useAuth()` hook
- `components/auth/UserMenu.tsx` — sidebar user display and logout button
- `middleware.ts` — Edge middleware for lightweight cookie-presence route protection
- `app/api/auth/me/route.ts` — current user endpoint
- `app/api/auth/logout/route.ts` — session revocation endpoint
- `scripts/hash-demo-passwords.ts` — CLI script to regenerate demo bcrypt hashes

### Security properties

- Session token is `crypto.randomBytes(32)` — cryptographically random and opaque
- Only the SHA-256 hash of the session token is stored in the database
- Raw token is placed exclusively in an HttpOnly cookie (`nova_session`)
- Clients cannot forge or alter session data
- Simple in-memory rate limiter caps 5 failed login attempts per 15 minutes per IP/email
- App runs on `localhost:3000` only

---

## Phase 4 — Complete ✅ (Account Authorization and Protected Banking APIs)

### Issues resolved

| # | Issue | Resolution |
|---|-------|-----------|
| 1 | `/api/accounts` returned client-supplied `userId` from query param | Derives `userId` exclusively from `getCurrentUser()` via session cookie |
| 2 | `/api/transactions` required `account` param with no ownership check | Full ownership join; if `accountId` supplied, verifies it belongs to session user |
| 3 | `/api/transfer` accepted `userId` from request body | Derives user from session; returns 501 pending Phase 5 atomic engine |
| 4 | `/api/search` searched all users' data globally | Restricted to session user's own accounts, beneficiaries, and transactions |
| 5 | No beneficiaries API | Added `/api/beneficiaries` (GET/POST) and `/api/beneficiaries/[id]` (PATCH/DELETE) — ownership verified |
| 6 | No notifications API | Added `/api/notifications` and `/api/notifications/[id]/read` |
| 7 | Account responses included full account number | All responses use `accountNumberMasked` (last 4 digits shown) via `lib/masking.ts` |
| 8 | No account status control | PATCH `/api/accounts` supports `status: "active" | "frozen"` with audit log |
| 9 | Unsafe transfer execution still active | Disabled; returns HTTP 501; Phase 5 engine will implement atomic transfer |
| 10 | Dashboard and accounts page used hardcoded mock data | Both pages now fetch real user-scoped data from protected APIs |

### New infrastructure added

- `lib/masking.ts` — `maskAccountNumber()` helper
- `lib/banking-auth.ts` — `assertAccountOwnership()`, `getOwnedAccount()`, `toSafeAccount()` 
- `lib/banking-client.ts` — client-side fetch helpers; never sends `userId`; throws `AuthError` on 401
- `server/repositories/accounts-repository.ts` — `listAccountsForUser`, `updateAccountNickname`, `updateAccountStatus`, `getAccountNumbersForUser`
- `server/repositories/transactions-repository.ts` — `listTransactionsForUser` with direction computation
- `server/repositories/beneficiaries-repository.ts` — full CRUD scoped to user
- `server/repositories/notifications-repository.ts` — list and mark-read
- `server/schemas/banking-schemas.ts` — Zod schemas for all Phase 4 APIs
- `docs/API_AUTHORIZATION_CHECKLIST.md` — manual regression test checklist with curl examples
- Legacy schema extended: `accounts.status`, `accounts.nickname`, `beneficiaries` table, `notifications` table

### Security properties

- No banking API trusts client-supplied `userId` — all use `getCurrentUser()` from session cookie
- Account ownership is verified before every write operation
- Sensitive fields never returned: `password`, `pin`, `session_token_hash`, raw account numbers
- All queries remain parameterized
- Audit logs written for account status changes, nickname changes, beneficiary create/update/delete
- Transfer execution completely disabled until Phase 5 atomic engine is ready
- App continues to run on `localhost:3000`

---

## Phase 5: Serandib Bank Premium Frontend, Rebrand, Asset Integration -- Complete

- Rebranded platform from NOVA Bank to Serandib Bank
- Session cookie renamed: nova_session -> serandib_session
- Demo credentials updated: customer@serandib.test / SerandibUser123 and admin@serandib.test / SerandibAdmin123
- New bcrypt hashes (12 rounds) generated for new passwords
- Serandib logo (public/brand/serandib-logo.png) and video (public/brand/bank-hero.mp4) integrated
- Premium blue design system added (CSS variables, utility classes, keyframes)
- Landing page redesigned as a fintech-grade homepage
- Sidebar redesigned: navy/blue theme, Security nav item added
- AppShell updated with blue color system
- Login page redesigned: split-screen, demo credential helpers, show/hide password
- Signup page redesigned: password generator (lib/password-generator.ts), strength meter
- Reset password page redesigned
- Dashboard redesigned: hero balance card, quick actions, live API data, security panel
- Accounts page redesigned: Account Shield Mode with freeze/unfreeze toggle
- Transfer page redesigned: SafePay preview, polished 501 handling, no fake execution
- Pay bills page redesigned: category filter, demo confirmation
- Smart Spend page redesigned: category breakdown bars, insights, Financial Twin preview
- E-Statement page redesigned: filters, intelligence summary, full transaction table
- Security Center page added (/security): checklist, audit timeline, session info
- Reusable UI components added (SerandibCard, SerandibButton, MetricCard, StatusPill, etc.)
- dev script fixed: next dev -p 3000
- scripts/dev-local.sh added
- README.md updated with clean copy-paste commands and Serandib credentials

---

## Phase 6: Atomic Transfer Engine — Complete ✅

- [x] `/api/transfer` replaced 501 stub with real atomic engine
- [x] `withTransaction()` wraps all balance mutations — full rollback on failure
- [x] Source account locked with `SELECT ... FOR UPDATE` before any debit
- [x] Destination account locked with `SELECT ... FOR UPDATE` for internal transfers
- [x] Source account ownership verified inside the DB lock (userId from session)
- [x] Frozen accounts cannot send money (`ACCOUNT_FROZEN` error)
- [x] Insufficient funds rejected atomically (`INSUFFICIENT_FUNDS` error)
- [x] Negative, zero, and NaN amounts rejected at validation layer (Zod)
- [x] Idempotency key prevents duplicate transfers (unique index on created_by + idempotency_key)
- [x] Double-entry ledger entries written to `ledger_entries` table
- [x] `transactions.reference` (`SRB-YYYYMMDD-XXXXXX`) generated and stored
- [x] `transactions.type = 'transfer'` tracked
- [x] `/api/transfers/[reference]` receipt endpoint added (ownership-scoped)
- [x] Transfer receipts returned with `balanceAfterDisplay`
- [x] Transfer UI rebuilt — real API, review step, success receipt, error cards
- [x] Dashboard TxRow shows SRB reference numbers
- [x] Accounts page shows Send Money and History per account
- [x] `TRANSFER_ENGINE_CHECKLIST.md` created

**NOT implemented in Phase 6 (deferred):**
- Daily/per-transaction limit enforcement (Phase 7)
- Rate limiting on transfer endpoint (Phase 7)
- Full SafePay Guardian risk engine (Phase 7)

---

## Phase 7: Bill Payment Engine and Bill Radar — Complete ✅

- [x] `billers` and `bill_payments` tables added to the running schema
- [x] Atomic bill payment service (`withTransaction`, `SELECT ... FOR UPDATE`)
- [x] Source account ownership verified inside the DB lock (userId from session)
- [x] Frozen accounts cannot pay bills (`ACCOUNT_FROZEN` error)
- [x] Insufficient funds rejected atomically (`INSUFFICIENT_FUNDS` error)
- [x] Negative, zero, and NaN amounts rejected at validation layer (Zod)
- [x] Idempotency prevents duplicate payments (unique index on user_id + idempotency_key)
- [x] Each payment writes transaction + ledger entry + bill payment + audit log
- [x] `bill_payments.reference` (`SRB-BILL-YYYYMMDD-XXXXXX`) generated and stored
- [x] `transactions.type = 'bill_payment'` tracked and shown in transactions API
- [x] `/api/billers` protected biller directory (active only, category/search)
- [x] `/api/bill-payments` GET (history) + POST (pay) — protected, user-scoped
- [x] `/api/bill-payments/[reference]` receipt endpoint (ownership-scoped)
- [x] Pay Bills UI rebuilt — real API, account select, review, success receipt
- [x] Bill Radar preview (rule-based recurring detection, not AI)
- [x] Dashboard shows recent bills + bill payments in transactions
- [x] `BILL_PAYMENT_ENGINE_CHECKLIST.md` created

**NOT implemented in Phase 7 (deferred):**
- Full Smart Spend analytics engine (Phase 8)
- Full SafePay Guardian fraud engine
- Statement PDF/CSV export
- Real external payment gateway / SMS / email confirmations

---

## Phase 8: Smart Spend Analytics Engine (TODO)

- Spending categorization, budget alerts, cashflow forecast
- Risk scoring engine: velocity checks, unusual amounts, new recipients
- Anomaly detection tied to risk_events table

---

## General remaining issues

- Rate limiting on transfer endpoints not yet implemented (login has basic in-memory limiter)
- All error responses are generic to the client; ensure no new leakage in future phases
- Dependency audit: run npm audit and fix high/critical CVEs before production

---

## Phase 8: Smart Spend Analytics Engine — Complete

- Rule-based transaction categorization (dining, groceries, utilities, etc.)
- Per-user monthly budgets with over-budget alerts
- Financial Twin simulator (what-if scenarios — no real transactions)
- Smart Spend summary API with cashflow forecast and recurring payment detection
- Protected APIs: /api/smart-spend/summary, /api/smart-spend/categories, /api/smart-spend/budgets, /api/smart-spend/simulate
- All data scoped by session user_id

---

## Phase 9: Invisible Savings Engine — Complete

- Partner merchant registry (Barista, Java Lounge, KFC, Pizza Hut, Dominos, Crepe Runner, Caravan Fresh)
- Automatic LKR 20–50 round-up per partner card transaction
- Total debit = purchase + round-up (source account debited once atomically)
- Savings accumulate monthly; credited to savings account only during month-end sweep
- Idempotency protection (duplicate purchase key returns same receipt)
- Monthly sweep cannot run twice for the same month
- Protected APIs: /api/partner-merchants, /api/invisible-savings/settings, /api/invisible-savings/summary, /api/invisible-savings/purchase, /api/invisible-savings/sweep
- Dashboard integration showing monthly savings, event count, next sweep date
- Smart Spend Invisible Savings effect section
- E-Statement shows card_purchase and invisible_savings_sweep transaction types
- All ownership checks inside FOR UPDATE DB row locks
- Audit logs written for INVISIBLE_SAVINGS_CAPTURED and INVISIBLE_SAVINGS_SWEPT events
