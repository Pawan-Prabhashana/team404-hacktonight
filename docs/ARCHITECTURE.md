# Serandib Bank — System Architecture

**Hack to Night 2026 · Team 404**

---

## High-Level Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              USER'S BROWSER                                     │
│                                                                                 │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│   │  Landing     │  │  Login /     │  │  Dashboard   │  │  Banking Pages   │  │
│   │  Page        │  │  Sign Up     │  │  /dashboard  │  │  /accounts       │  │
│   │  /           │  │  /login      │  │              │  │  /bank-transfer  │  │
│   │              │  │              │  │              │  │  /pay-bills      │  │
│   │  React       │  │  React       │  │  React       │  │  /smart-spend    │  │
│   │  Client      │  │  Client      │  │  Client      │  │  /e-statement    │  │
│   │  Component   │  │  auth-client │  │  banking-    │  │  /security       │  │
│   │              │  │  .ts         │  │  client.ts   │  │  /invisible-     │  │
│   │              │  │              │  │              │  │  savings         │  │
│   └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └───────┬──────────┘  │
│          │                 │                  │                  │             │
└──────────┼─────────────────┼──────────────────┼──────────────────┼─────────────┘
           │  HTTPS          │  HTTPS           │  HTTPS           │  HTTPS
           │  (fetch)        │  (fetch)         │  (fetch)         │  (fetch)
           ▼                 ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        NEXT.JS EDGE MIDDLEWARE  (proxy.ts)                      │
│                                                                                 │
│   Runs on Edge Runtime — lightweight cookie-presence check only                 │
│   ┌──────────────────────────────────────────────────────────────────────────┐  │
│   │  if (!sessionCookie && isProtectedRoute)  →  redirect to /login         │  │
│   │  if (sessionCookie  && isAuthRoute)       →  pass through (show login)  │  │
│   └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│   Protected prefixes: /dashboard  /bank-accounts  /bank-transfer               │
│                        /pay-bills  /smart-spend   /e-statement                  │
│                        /security   /admin                                        │
└──────────────────────────────┬──────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    NEXT.JS APP ROUTER  (Node.js Runtime)                        │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                        API ROUTE HANDLERS                               │   │
│  │                                                                         │   │
│  │  /api/auth/login          /api/auth/logout       /api/auth/me           │   │
│  │  /api/accounts            /api/transactions      /api/transfer          │   │
│  │  /api/transfers/[ref]     /api/beneficiaries     /api/notifications     │   │
│  │  /api/smart-spend/summary /api/smart-spend/budgets                      │   │
│  │  /api/smart-spend/categories  /api/smart-spend/simulate                 │   │
│  │  /api/health              /api/setup             /api/admin/system      │   │
│  │                                                                         │   │
│  │  Every handler:                                                         │   │
│  │    1. requireUser()  →  validates session cookie server-side            │   │
│  │    2. safeParse(zodSchema, body)  →  validates all input with Zod v4    │   │
│  │    3. calls Service or Repository layer                                 │   │
│  │    4. writeAuditLog()  →  records action to audit_logs table            │   │
│  └──────────────────────────────┬──────────────────────────────────────────┘   │
│                                 │                                               │
│  ┌──────────────────────────────┼──────────────────────────────────────────┐   │
│  │                    SECURITY LAYER  (lib/)                               │   │
│  │                                                                         │   │
│  │  lib/session.ts       requireUser() / requireAdmin()                    │   │
│  │                       SHA-256 token hash lookup in sessions table       │   │
│  │                                                                         │   │
│  │  lib/password.ts      bcrypt verify (12 rounds)                         │   │
│  │  lib/audit.ts         structured audit log writes                       │   │
│  │  lib/money.ts         minor-unit ↔ display amount conversion            │   │
│  │  lib/api-response.ts  typed JSON response helpers                       │   │
│  └──────────────────────────────┬──────────────────────────────────────────┘   │
└─────────────────────────────────┼───────────────────────────────────────────────┘
                                  │
                ┌─────────────────┴──────────────────┐
                │                                    │
                ▼                                    ▼
┌─────────────────────────────┐      ┌───────────────────────────────────────────┐
│      SERVICE LAYER          │      │            REPOSITORY LAYER               │
│                             │      │                                           │
│  transfer-service.ts        │      │  accounts-repository.ts                   │
│    Atomic transfer logic    │      │    SELECT accounts WHERE user_id = $1     │
│    overdraft prevention     │      │    SELECT FOR UPDATE (row locking)        │
│    ledger entry creation    │      │                                           │
│                             │      │  transactions-repository.ts               │
│  categorization-service.ts  │      │    INSERT transactions                    │
│    16+ keyword rules        │      │    INSERT ledger_entries (double-entry)   │
│    Maps descriptions →      │      │                                           │
│    category slugs           │      │  smart-spend-repository.ts                │
│                             │      │    listUserTransactionsForAnalytics()     │
│  smart-spend-service.ts     │      │    listBudgetsForUser()                   │
│    Financial health score   │      │    upsertBudgetForUser()                  │
│    Savings potential        │      │                                           │
│    Cashflow forecast        │      │  beneficiaries-repository.ts              │
│    Recurring detection      │      │    Ownership-scoped queries               │
│    Category breakdown       │      │                                           │
│                             │      │  notifications-repository.ts              │
│  financial-twin-service.ts  │      │    Per-user notification queries          │
│    Read-only simulation     │      │                                           │
│    No DB mutations          │      │  All queries:                             │
│    Projected balance calc   │      │    - Parameterized ($1, $2, …)            │
│                             │      │    - User-scoped (never trust client ID)  │
└──────────────┬──────────────┘      └──────────────────┬────────────────────────┘
               │                                        │
               └──────────────────┬─────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    DATABASE LAYER  (lib/db.ts → pg Pool)                        │
│                                                                                 │
│   PostgreSQL 17  (Docker container: htn-26-challenge-db)                        │
│   Connection: postgresql://user:pass@localhost:5432/htn26db                     │
│   Pool: max 5 connections, 30s idle timeout, 5s connect timeout                 │
│                                                                                 │
│  ┌────────────────┬────────────────┬────────────────┬───────────────────────┐  │
│  │   CORE TABLES  │   BANKING      │   ANALYTICS    │   SAVINGS ENGINE      │  │
│  │                │                │                │                       │  │
│  │  users         │  transactions  │  spend_        │  partner_merchants    │  │
│  │  sessions      │  ledger_       │  categories    │  invisible_savings_   │  │
│  │  audit_logs    │  entries       │  budgets       │  settings             │  │
│  │                │  bill_         │                │  invisible_savings_   │  │
│  │  accounts      │  payments      │                │  events               │  │
│  │  beneficiaries │  billers       │                │  invisible_savings_   │  │
│  │  notifications │                │                │  sweeps               │  │
│  └────────────────┴────────────────┴────────────────┴───────────────────────┘  │
│                                                                                 │
│  Key Constraints & Design:                                                      │
│    NUMERIC(14,2)   — all currency amounts (no floating point)                   │
│    SERIAL PRIMARY KEY — integer IDs throughout                                  │
│    TIMESTAMPTZ     — all timestamps with timezone                               │
│    UNIQUE(reference) WHERE reference IS NOT NULL  — partial index               │
│    UNIQUE(user_id, idempotency_key) WHERE key IS NOT NULL — idempotency         │
│    REFERENCES users(id) ON DELETE CASCADE — referential integrity               │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Authentication & Session Flow

```
  Browser                   API Route               Database
    │                          │                       │
    │─── POST /api/auth/login ─▶│                       │
    │    { email, password }    │                       │
    │                          │── SELECT user ────────▶│
    │                          │◀── { id, hash, role } ─│
    │                          │                       │
    │                          │  bcrypt.compare()     │
    │                          │  (constant-time)      │
    │                          │                       │
    │                          │── INSERT sessions ────▶│
    │                          │   { user_id,          │
    │                          │     SHA256(token),    │
    │                          │     expires_at }      │
    │                          │                       │
    │◀── 200 { user } ─────────│                       │
    │    Set-Cookie:           │                       │
    │    serandib_session=     │                       │
    │    <raw_token>           │                       │
    │    HttpOnly; SameSite=   │                       │
    │    Lax; Path=/           │                       │
    │                          │                       │
    │  (all subsequent requests automatically include cookie)
    │                          │                       │
    │─── GET /api/accounts ───▶│                       │
    │    Cookie: serandib_     │                       │
    │    session=<raw_token>   │                       │
    │                          │  SHA256(raw_token)    │
    │                          │── SELECT sessions ────▶│
    │                          │   WHERE token_hash=$1 │
    │                          │   AND expires_at>NOW()│
    │                          │   AND revoked_at NULL │
    │                          │◀── { user_id, role } ─│
    │                          │                       │
    │◀── 200 { accounts } ─────│                       │
```

---

## Atomic Transfer Flow

```
  Client                    Transfer API              Database
    │                          │                       │
    │─── POST /api/transfer ──▶│                       │
    │    { fromAccount,        │  requireUser()        │
    │      toAccount,          │  safeParse(schema)    │
    │      amount,             │                       │
    │      idempotencyKey }    │                       │
    │                          │── BEGIN TRANSACTION ─▶│
    │                          │                       │
    │                          │── SELECT accounts ────▶│
    │                          │   WHERE account_number│
    │                          │   = $1 FOR UPDATE     │  ← row lock
    │                          │◀── { balance, id } ───│
    │                          │                       │
    │                          │  if balance < amount  │
    │                          │    ROLLBACK           │
    │                          │    return 422         │
    │                          │                       │
    │                          │── UPDATE accounts ────▶│
    │                          │   SET balance =       │
    │                          │   balance - amount    │
    │                          │   WHERE id = $1       │
    │                          │                       │
    │                          │── UPDATE accounts ────▶│
    │                          │   SET balance =       │
    │                          │   balance + amount    │
    │                          │   WHERE id = $2       │
    │                          │                       │
    │                          │── INSERT transactions ▶│
    │                          │── INSERT ledger_entry ▶│ ← debit
    │                          │── INSERT ledger_entry ▶│ ← credit
    │                          │                       │
    │                          │── COMMIT ─────────────▶│
    │                          │                       │
    │◀── 200 { reference,      │                       │
    │          receipt } ──────│                       │
```

---

## Smart Spend Analytics Flow

```
  Smart Spend Page          API Route               Services / DB
    │                          │                       │
    │─── GET /api/smart-spend/ │                       │
    │    summary?from=&to= ───▶│                       │
    │                          │  requireUser()        │
    │                          │                       │
    │                          │── listUserTransactions▶│
    │                          │   ForAnalytics()      │
    │                          │◀── [ transactions ] ──│
    │                          │                       │
    │                          │── listUserBillPayments▶│
    │                          │   ForAnalytics()      │
    │                          │◀── [ bill_payments ] ─│
    │                          │                       │
    │                          │── listBudgetsForUser()▶│
    │                          │◀── [ budgets ] ───────│
    │                          │                       │
    │                          │  categorization-      │
    │                          │  service.ts           │
    │                          │  (16+ keyword rules)  │
    │                          │  tx → category_slug   │
    │                          │                       │
    │                          │  smart-spend-         │
    │                          │  service.ts           │
    │                          │  • health score       │
    │                          │  • savings potential  │
    │                          │  • cashflow forecast  │
    │                          │  • recurring detect   │
    │                          │  • category breakdown │
    │                          │                       │
    │◀── 200 { SmartSpend      │                       │
    │    Summary } ────────────│                       │
```

---

## Directory Structure

```
hack-to-night-2026-challenge-main/
│
├── app/                          Next.js App Router pages & API routes
│   ├── (accounts)/               Auth pages (login, sign-up, reset-password)
│   ├── api/                      API route handlers
│   │   ├── auth/                 login, logout, me
│   │   ├── accounts/             account listing
│   │   ├── transfer/             atomic fund transfer
│   │   ├── transactions/         transaction history
│   │   ├── beneficiaries/        saved payees
│   │   ├── notifications/        user notifications
│   │   ├── smart-spend/          analytics, budgets, simulate
│   │   ├── health/               system health check
│   │   └── admin/                admin-only diagnostics
│   ├── dashboard/                Main banking dashboard
│   ├── bank-accounts/            Account management
│   ├── bank-transfer/            Fund transfer UI
│   ├── pay-bills/                Bill payment UI
│   ├── smart-spend/              Analytics & Financial Twin
│   ├── e-statement/              Transaction history
│   ├── security/                 Security centre
│   ├── invisible-savings/        Invisible Savings engine UI
│   └── globals.css               Design token system (CSS variables)
│
├── components/
│   ├── layout/                   AppShell, Sidebar
│   ├── ui/                       AppCard, StatCard, StatusPill, EmptyState…
│   └── auth/                     AuthProvider, UserMenu
│
├── lib/                          Shared server-side utilities
│   ├── db.ts                     pg Pool, query(), withTransaction()
│   ├── platform-db.ts            Schema DDL + Seed DML bootstrap
│   ├── session.ts                requireUser(), createSession()
│   ├── auth-client.ts            Client-side auth helpers (fetch wrappers)
│   ├── banking-client.ts         Client-side banking API wrappers
│   ├── audit.ts                  writeAuditLog()
│   ├── money.ts                  minorUnits ↔ display conversion
│   ├── password.ts               bcrypt hash & verify
│   └── validation.ts             Zod schemas, safeParse()
│
├── server/
│   ├── repositories/             SQL query functions (data access)
│   │   ├── accounts-repository.ts
│   │   ├── transactions-repository.ts
│   │   ├── smart-spend-repository.ts
│   │   ├── beneficiaries-repository.ts
│   │   └── notifications-repository.ts
│   ├── services/                 Business logic
│   │   ├── transfer-service.ts
│   │   ├── categorization-service.ts
│   │   ├── smart-spend-service.ts
│   │   └── financial-twin-service.ts
│   ├── schemas/                  Zod validation schemas
│   │   ├── banking-schemas.ts
│   │   ├── transfer-schemas.ts
│   │   └── smart-spend-schemas.ts
│   └── errors/
│       └── banking-errors.ts
│
├── db/
│   ├── schema.sql                Reference schema (canonical)
│   ├── seed.sql                  Reference seed data
│   └── README.md
│
├── docs/                         Technical documentation
│   ├── ARCHITECTURE.md           ← This file
│   ├── Serandib_Bank_Technical_Report.pdf
│   ├── Serandib_Bank_Technical_Report.docx
│   ├── SECURITY_PHASES.md
│   └── *_CHECKLIST.md
│
├── public/                       Static assets (logos, billers, brand)
├── proxy.ts                      Next.js Edge Middleware
├── compose.yml                   Docker Compose (PostgreSQL 17)
├── next.config.ts                Next.js config (standalone output)
├── package.json                  Dependencies (Next 15, Zod v4, pg, bcryptjs)
└── .env.local                    DATABASE_URL (not committed)
```

---

## Database Schema — Entity Relationship

```
users (id PK)
  │
  ├──< accounts (user_id FK)
  │        │
  │        └──< ledger_entries (account_id FK)
  │
  ├──< sessions (user_id FK)
  │
  ├──< transactions (created_by FK)
  │        │
  │        └──< ledger_entries (transaction_id FK)
  │
  ├──< beneficiaries (user_id FK)
  │
  ├──< notifications (user_id FK)
  │
  ├──< audit_logs (user_id FK)
  │
  ├──< bill_payments (user_id FK)
  │        │
  │        ├── billers (biller_id FK)
  │        ├── accounts (account_id FK)
  │        └── transactions (transaction_id FK)
  │
  ├──< budgets (user_id FK)
  │        └── spend_categories (category_slug)
  │
  └──< invisible_savings_settings (user_id FK)
           │
           ├──< invisible_savings_events (user_id FK)
           │        ├── partner_merchants (partner_merchant_id FK)
           │        └── transactions (purchase/saving transaction_id FK)
           │
           └──< invisible_savings_sweeps (user_id FK)
```

---

## Tech Stack Summary

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js App Router | 15.x |
| Language | TypeScript | 5.x |
| Runtime | Bun | 1.x |
| Database | PostgreSQL | 17 (Docker) |
| DB Client | node-postgres (pg) | latest |
| Validation | Zod | v4.4.3 |
| Auth | bcryptjs + Node crypto | latest |
| CSS | Custom CSS Variables | — |
| Linter | Biome | latest |
| Container | Docker Compose | — |

---

*Serandib Bank · Hack to Night 2026 · Team 404*
