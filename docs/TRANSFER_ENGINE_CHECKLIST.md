# Transfer Engine Integrity Checklist — Phase 6

Manual verification tests for the Serandib Atomic Transfer Engine.

Run these against `http://localhost:3000` with:

- **Customer**: `customer@serandib.test` / `SerandibUser123`
- **Admin**: `admin@serandib.test` / `SerandibAdmin123`

---

## Authentication

- [ ] **T01 — Unauthenticated transfer returns 401**
  - Send `POST /api/transfer` with no session cookie.
  - Expected: `401 Unauthorized`.

## Input validation

- [ ] **T02 — Negative amount is rejected**
  - Send `amount: -100`.
  - Expected: `400` with validation error.

- [ ] **T03 — Zero amount is rejected**
  - Send `amount: 0`.
  - Expected: `400` with validation error.

- [ ] **T04 — Non-numeric amount is rejected**
  - Send `amount: "abc"`.
  - Expected: `400` with validation error.

- [ ] **T05 — Missing destination is rejected**
  - Send without `destinationAccountId` and without `beneficiaryId`.
  - Expected: `400` with "A destination account or beneficiary is required."

## Ownership and access

- [ ] **T06 — Transfer from another user's account returns 404**
  - Authenticate as customer, send `sourceAccountId` belonging to admin.
  - Expected: `404 Account not found or access denied`.

- [ ] **T07 — Invalid beneficiary is rejected**
  - Authenticate as customer, send a `beneficiaryId` belonging to another user.
  - Expected: `404 Beneficiary not found`.

## Account status

- [ ] **T08 — Frozen source account transfer is rejected**
  - Freeze an account via Account Shield Mode.
  - Attempt a transfer from that account.
  - Expected: `400 ACCOUNT_FROZEN`.

## Balance checks

- [ ] **T09 — Insufficient funds transfer is rejected**
  - Send amount greater than account balance.
  - Expected: `400 INSUFFICIENT_FUNDS`.

## Successful transfer

- [ ] **T10 — Successful beneficiary transfer**
  - Send a valid amount to a beneficiary.
  - Expected: `200` with receipt containing `reference`, `amountDisplay`, `balanceAfterDisplay`.
  - Verify: source account balance decreased in `/api/accounts`.

- [ ] **T11 — Successful internal transfer credits destination**
  - Send a valid amount to another internal account.
  - Expected: `200` receipt.
  - Verify: source balance decreased, destination balance increased.
  - Verify: ledger entries created (2 rows — debit + credit).

- [ ] **T12 — Transaction appears in /api/transactions**
  - After T10 or T11, call `GET /api/transactions?limit=5`.
  - Expected: the transfer appears with `reference` starting with `SRB-`.

- [ ] **T13 — Dashboard balance updates after transfer**
  - Reload dashboard after a successful transfer.
  - Expected: total balance reflects deducted amount.

- [ ] **T14 — Accounts page balance updates after transfer**
  - Reload accounts page after a successful transfer.
  - Expected: source account shows decreased balance.

## Idempotency

- [ ] **T15 — Duplicate idempotency key does not double-transfer**
  - Submit the same transfer twice with the same `idempotencyKey`.
  - Expected: second call returns the same receipt (no second debit).
  - Verify: balance deducted only once.

## Receipt

- [ ] **T16 — Transfer receipt is retrievable**
  - Use `GET /api/transfers/{reference}` with the reference from T10.
  - Expected: `200` with full receipt.
  - Verify: another user cannot retrieve the same receipt (returns `404`).

## Security

- [ ] **T17 — No stack traces in error responses**
  - Trigger any error scenario above.
  - Expected: response body contains only `error` (string) and `code` fields.
  - Verify: no file paths, SQL, or env vars in response.

- [ ] **T18 — No userId accepted in request body**
  - Send `userId: 999` in the transfer body.
  - Expected: field is ignored; transfer uses the session user only.

## UI

- [ ] **T19 — Transfer page loads without "engine disabled" message**
  - Open `/bank-transfer`.
  - Expected: a working transfer form, no "Phase 5/6 coming soon" notice.

- [ ] **T20 — Success receipt displayed after transfer**
  - Complete a transfer via the UI.
  - Expected: success card with reference, amount, and remaining balance.

- [ ] **T21 — Frozen account submit button is disabled in UI**
  - Select a frozen account as source.
  - Expected: submit button is disabled with frozen notice.

- [ ] **T22 — Insufficient funds error displayed in UI**
  - Enter amount greater than balance.
  - Expected: inline validation error before review step.
