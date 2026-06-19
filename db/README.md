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

### Phase 7 will add

- Bill payment execution engine.
- SmartSpend analytics categorization.
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
