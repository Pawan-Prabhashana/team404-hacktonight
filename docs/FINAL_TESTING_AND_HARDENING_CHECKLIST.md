# Final Testing and Hardening Checklist — Serandib Bank

## Authentication

- [ ] Unauthenticated requests to all /api/* routes return 401
- [ ] Session cookie is HttpOnly, not readable by JavaScript
- [ ] Sessions expire correctly (check sessions.expires_at in DB)
- [ ] Logout invalidates the session token in the database
- [ ] SHA-256 hash of token stored in DB, never raw token
- [ ] No session fixation: new token issued on login

## Authorization

- [ ] Users cannot access other users' accounts via /api/accounts
- [ ] Users cannot view or modify other users' transactions
- [ ] Users cannot pay bills from accounts they don't own
- [ ] Users cannot trigger invisible savings from accounts they don't own
- [ ] Admin endpoints (/api/admin/*) reject non-admin users with 403
- [ ] Cross-user receipt isolation: cannot view another user's bill/transfer receipt

## Session Cookie Security

- [ ] serandib_session cookie has HttpOnly flag
- [ ] serandib_session cookie has SameSite=Strict
- [ ] serandib_session cookie has Secure flag in production
- [ ] Cookie is not accessible via document.cookie in browser console

## Account Ownership

- [ ] All account operations verify user_id matches the session user
- [ ] Source account ownership verified inside DB row lock (FOR UPDATE)
- [ ] Destination account ownership verified where applicable

## Transfers (Phase 6)

- [ ] Frozen source account rejected: ACCOUNT_FROZEN
- [ ] Insufficient funds rejected: INSUFFICIENT_FUNDS
- [ ] Same-account transfer rejected: SAME_ACCOUNT
- [ ] Currency mismatch rejected: CURRENCY_MISMATCH
- [ ] Beneficiary ownership verified before transfer
- [ ] Idempotency prevents double-send
- [ ] Ledger entries created for both debit and credit
- [ ] Balance accurate after concurrent transfers

## Bill Payments (Phase 7)

- [ ] Frozen account rejects bill payment
- [ ] Insufficient funds rejects bill payment
- [ ] Unknown biller returns BILLER_NOT_FOUND
- [ ] Idempotency key prevents duplicate payment
- [ ] Ledger entry created for bill payment debit
- [ ] Receipt visible only to owning user

## Smart Spend (Phase 8)

- [ ] Summary scoped to current user's transactions only
- [ ] Budget operations scoped to current user
- [ ] Financial twin simulation does not execute real transactions
- [ ] Categorization only affects own user's data

## Invisible Savings (Phase 9)

- [ ] See docs/INVISIBLE_SAVINGS_CHECKLIST.md for detailed checks
- [ ] Round-up always LKR 20–50
- [ ] Source debited by purchase + round-up (not just purchase)
- [ ] Savings account not credited during purchase event
- [ ] Sweep cannot run twice for same month
- [ ] Idempotency prevents duplicate purchase recording

## Admin Endpoints

- [ ] GET /api/admin/system: returns 403 for non-admin users
- [ ] Admin audit log scoped to admin role only

## Error Handling

- [ ] No stack traces returned to client on any error path
- [ ] No DATABASE_URL in any error response
- [ ] No password_hash or session token in any response
- [ ] All 500 errors log server-side only, return generic message

## SQL Injection Checks

- [ ] All user input passed via parameterized queries ($1, $2, ...)
- [ ] No string interpolation in SQL strings
- [ ] ILIKE search uses bound parameter with % prefix

## Sensitive Data Exposure

Run these checks and verify results are server-only:
```bash
grep -R "process.env" app lib server --include="*.ts" --include="*.tsx"
grep -R "DATABASE_URL" app --include="*.ts" --include="*.tsx"
grep -R "password_hash" app --include="*.ts" --include="*.tsx"
grep -R "\.stack" app lib server --include="*.ts" --include="*.tsx"
```

Expected: DATABASE_URL only in lib/db.ts (connection config), password_hash only in auth/login route (hashing), .stack only in dev-only console.error.

## Build & Lint

- [ ] `bun run lint` passes with 0 errors
- [ ] `bun run build` passes with 0 errors
- [ ] No TypeScript type errors
- [ ] No unused imports in Phase 9 files

## Responsive UI

- [ ] /invisible-savings layout works on mobile (320px–480px)
- [ ] Partner grid wraps cleanly at narrow widths
- [ ] Dashboard cards stack on mobile
- [ ] No text clipping or overflow
- [ ] Sidebar collapses on mobile (if implemented)

## Demo Flow Verification

1. Open http://localhost:3000
2. Log in: customer@serandib.test / SerandibUser123
3. Dashboard loads with Invisible Savings card
4. Navigate to Invisible Savings
5. Select Barista, Expenses account, amount 480
6. Submit — receipt shows LKR 20 saved, LKR 500 total debit
7. Expenses account balance decreases by LKR 500
8. Savings account balance unchanged
9. Click "Sweep this month into Savings"
10. Savings account balance increases by accumulated round-ups
11. Sweep a second time — no_op result
12. E-Statement shows Card Purchase and Savings Sweep entries
13. Logout

## README

- [ ] README.md updated with Phase 9 feature
- [ ] Demo credentials included
- [ ] Local setup instructions correct (bun install, bun run dev)
- [ ] Partner badge note included
