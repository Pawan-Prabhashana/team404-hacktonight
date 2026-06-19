# Invisible Savings — Manual Test Checklist (Phase 9)

Run these checks against a live server at http://localhost:3000.

## Authentication & Authorization

| # | Test | Expected |
|---|------|----------|
| 1 | GET /api/partner-merchants without cookie | 401 Unauthorized |
| 2 | GET /api/invisible-savings/settings without cookie | 401 Unauthorized |
| 3 | GET /api/invisible-savings/summary without cookie | 401 Unauthorized |
| 4 | POST /api/invisible-savings/purchase without cookie | 401 Unauthorized |
| 5 | POST /api/invisible-savings/sweep without cookie | 401 Unauthorized |

## Input Validation

| # | Test | Expected |
|---|------|----------|
| 6 | POST purchase with no userId in body | userId comes from session only — any userId in body is ignored |
| 7 | POST purchase with invalid partnerMerchantId (e.g. 99999) | 404 MERCHANT_NOT_FOUND |
| 8 | POST purchase with negative purchaseAmount | 400 validation error |
| 9 | POST purchase with zero amount | 400 validation error |
| 10 | POST purchase with sourceAccountId belonging to another user | 404 ACCOUNT_NOT_FOUND |

## Round-up Logic

| # | Test | Expected |
|---|------|----------|
| 11 | Purchase LKR 480 | Invisible saving = LKR 20.00, total debit = LKR 500.00 |
| 12 | Purchase LKR 455 | Invisible saving = LKR 45.00, total debit = LKR 500.00 |
| 13 | Purchase LKR 475 | Invisible saving = LKR 25.00, total debit = LKR 500.00 |
| 14 | Purchase LKR 499 | Invisible saving = LKR 20.00 (minimum), total debit = LKR 519.00 |
| 15 | Purchase LKR 401 | Invisible saving = LKR 50.00 (maximum), total debit = LKR 451.00 |
| 16 | Round-up never exceeds LKR 50 | Confirm for purchases ending in 01–49 |
| 17 | Round-up never below LKR 20 | Confirm for purchases ending in 90–99 |

## Account & Balance Integrity

| # | Test | Expected |
|---|------|----------|
| 18 | Source account debited by purchase + round-up | Balance decreases by LKR 500 for a LKR 480 purchase |
| 19 | Savings account NOT credited during purchase | Savings balance unchanged after purchase |
| 20 | Frozen source account | 400 ACCOUNT_FROZEN |
| 21 | Insufficient funds (purchase + roundup > balance) | 400 INSUFFICIENT_FUNDS with available balance shown |

## Monthly Sweep

| # | Test | Expected |
|---|------|----------|
| 22 | Simulate 3 partner purchases, then sweep | Savings account credited by sum of round-ups |
| 23 | Sweep same month twice | Second sweep returns no_op with "already swept" message |
| 24 | Sweep with no accumulated events | Returns no_op with "no accumulated savings" message |

## Idempotency

| # | Test | Expected |
|---|------|----------|
| 25 | POST purchase with same idempotency key twice | Same receipt returned, balance deducted only once |
| 26 | Idempotency key unique per user | Different users can use the same key without conflict |

## Dashboard & UI Integration

| # | Test | Expected |
|---|------|----------|
| 27 | Dashboard loads Invisible Savings card | Shows saved this month, partner purchases, next sweep |
| 28 | Smart Spend page shows Invisible Savings effect | Shows round-ups, projected monthly, top partner |
| 29 | Invisible Savings sidebar nav item | Routes to /invisible-savings |
| 30 | Partner merchant grid shows fallback badges | Clean initial badges when no logo asset available |

## Transactions & Statement

| # | Test | Expected |
|---|------|----------|
| 31 | Card purchase appears in /api/transactions | type = card_purchase, description includes merchant name |
| 32 | Monthly sweep appears as credit in transactions | type = invisible_savings_sweep, credits savings account |
| 33 | E-Statement shows Card Purchase label | Yellow/amber tag for card_purchase type |
| 34 | E-Statement shows Savings Sweep label | Green tag for invisible_savings_sweep type |

## Security

| # | Test | Expected |
|---|------|----------|
| 35 | No stack traces in API responses | Only { error, code } on failure |
| 36 | No DATABASE_URL in any response | Confirmed — all errors are generic |
| 37 | No userId leakage from client | Client never sends userId; verified in request logs |
