# Bill Payment Engine — Phase 7 Integrity Checklist

> Local / demo banking logic only. App runs on **http://localhost:3000**.
>
> Demo credentials:
> - Customer: `customer@serandib.test` / `SerandibUser123`
> - Admin: `admin@serandib.test` / `SerandibAdmin123`

The bill payment engine mirrors the Phase 6 atomic transfer engine: every
payment runs inside a single DB transaction with a `FOR UPDATE` lock on the
source account, and writes a transaction, a ledger entry, a bill payment row,
and an audit log atomically.

---

## Manual tests

| # | Test | Expected |
|---|------|----------|
| 1 | `GET /api/billers` with no session cookie | `401 Unauthorized` |
| 2 | Authenticated `GET /api/billers` | `200` with active billers only |
| 3 | `POST /api/bill-payments` with no session cookie | `401 Unauthorized` |
| 4 | Pay from another user's `accountId` | `404` (account not found / access denied) |
| 5 | Negative amount | `400` validation error |
| 6 | Zero amount | `400` validation error |
| 7 | Amount greater than balance | `400` `INSUFFICIENT_FUNDS` |
| 8 | Pay from a frozen account | `400` `ACCOUNT_FROZEN` |
| 9 | Valid payment | source account balance decreases by the amount |
| 10 | Ledger entry created | one `debit` row in `ledger_entries` per payment |
| 11 | Transaction recorded | row appears in `GET /api/transactions` (`type = bill_payment`) |
| 12 | Bill payment recorded | row appears in `GET /api/bill-payments` |
| 13 | Receipt endpoint | `GET /api/bill-payments/:reference` returns only the owner's receipt; another user gets `404` |
| 14 | Same idempotency key twice | second call returns the same receipt, balance changes only once |
| 15 | Dashboard balance | total balance reflects the deduction after refresh |
| 16 | Error responses | no stack traces, SQL, or `DATABASE_URL` in any response body |

---

## Quick curl examples

```bash
# 1. Unauthenticated billers → 401
curl -i http://localhost:3000/api/billers

# 2. List billers (authenticated — pass your session cookie)
curl -s --cookie "serandib_session=<token>" http://localhost:3000/api/billers

# 9 + 14. Pay a bill (idempotent on Idempotency-Key)
curl -s --cookie "serandib_session=<token>" \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: demo-bill-0001' \
  -d '{"accountId":1,"billerId":1,"billReference":"123456789","amount":"4500"}' \
  http://localhost:3000/api/bill-payments

# 12. List the current user's bill payments
curl -s --cookie "serandib_session=<token>" \
  http://localhost:3000/api/bill-payments
```

---

## Security invariants

- `userId` is always derived from the HttpOnly session cookie — never the body.
- Source account ownership is verified **inside** the locked row.
- Frozen accounts and insufficient funds are rejected before any mutation.
- All mutations roll back on any error — no partial deductions, no fake success.
- All SQL is parameterized (`$1`, `$2`, …) — no string interpolation of input.
- Idempotency is enforced both in the service (early return) and by a unique
  index on `bill_payments(user_id, idempotency_key)`.
