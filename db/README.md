# Database — Serandib Bank

> **Challenge / Demo only.** This database schema and seed data are for the
> Hack-to-Night 2026 challenge environment. Do not use in production without
> completing all remaining security phases.

---

## Files

| File | Purpose |
|------|---------|
| `schema.sql` | Full production-ready PostgreSQL DDL |
| `seed.sql` | Demo data for local development |

---

## Applying the schema

```bash
psql "$DATABASE_URL" -f db/schema.sql
psql "$DATABASE_URL" -f db/seed.sql
```

Or inside the Docker container:

```bash
docker exec -i htn-26-challenge-db \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < db/schema.sql

docker exec -i htn-26-challenge-db \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < db/seed.sql
```

---

## Demo credentials (Phase 5 — local only)

| Role     | Email                      | Password          |
|----------|----------------------------|-------------------|
| Customer | customer@serandib.test     | SerandibUser123   |
| Admin    | admin@serandib.test        | SerandibAdmin123  |

Passwords are stored as bcrypt hashes (12 rounds) — never as plaintext.

These are local demo credentials for the hackathon challenge only.
Do not use these in any real environment.

To regenerate demo hashes:

```bash
npx tsx scripts/hash-demo-passwords.ts
```

---

## Notes

### Phase 6 status (complete)

- The legacy schema (in `lib/platform-db.ts`) is used by the running app via
  `ensureDatabase()`. Phase 6 added:
  - `ledger_entries` table (double-entry bookkeeping per transfer)
  - `transactions.reference` — unique `SRB-YYYYMMDD-XXXXXX` reference
  - `transactions.type` — e.g. `'transfer'`
  - `transactions.idempotency_key` — prevents duplicate submissions
  - `accounts.updated_at` — tracks last balance mutation
- `/api/transfer` now executes real atomic transfers with row-level locking.
- Idempotency is enforced via a unique index on `(created_by, idempotency_key)`.
- Frozen accounts cannot send money (checked inside the DB lock).
- Insufficient funds are rejected atomically (compared inside the locked row).
- Every transfer creates one debit + one credit ledger entry.

### Phase 7 status (complete)

- The running app schema (`lib/platform-db.ts`) added two tables via
  `ensureDatabase()`:
  - `billers` — `id`, `name`, `category`, `provider_code` (unique), `logo_url`,
    `status`, timestamps. Categories: `utilities`, `mobile`, `internet`,
    `insurance`, `education`, `government`, `credit_card`, `other`.
  - `bill_payments` — `reference` (unique), `user_id`, `account_id`, `biller_id`,
    `transaction_id`, `bill_reference`, `amount_minor_units`, `currency`,
    `status` (`pending`/`completed`/`failed`/`cancelled`), `idempotency_key`,
    `scheduled_for`, `paid_at`, timestamps.
- Bill payments are atomic and ledger-backed: each completed payment creates one
  `transactions` row (`type = 'bill_payment'`), one debit `ledger_entries` row,
  one `bill_payments` row, and an audit log — all inside a single DB transaction
  with a `FOR UPDATE` lock on the source account.
- Idempotency is enforced via a unique index on
  `(user_id, idempotency_key)` where the key is not null.
- Frozen accounts cannot pay bills; insufficient funds are rejected atomically.
- Demo billers seeded: CEB Electricity, National Water Board, Dialog Mobile,
  SLT Fiber, Mobitel, AIA Insurance, University Payments, Municipal Council.

### Future phases will add

- SmartSpend analytics categorization (Phase 8).
- Full SafePay Guardian risk rule engine.
- Statement PDF/CSV export.

---

## Money values

All monetary amounts in the new schema use **minor units** (integer).

```
Rs. 100.50  =>  balance_minor_units = 10050
Rs. 1,000   =>  balance_minor_units = 100000
```

Use the helpers in `lib/money.ts` to convert between display strings and minor units.
