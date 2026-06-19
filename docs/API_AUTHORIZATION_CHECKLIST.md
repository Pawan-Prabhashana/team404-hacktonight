# API Authorization Checklist — NOVA Bank Phase 4

Use this checklist to manually verify that all banking APIs are properly scoped
to the authenticated session user. Run after any change to auth or banking routes.

---

## Prerequisites

Start the dev server on **localhost:3000**:
```bash
npm run dev
# or
bun run dev
```

Log in at http://localhost:3000/login with:
- `customer@nova.test` / `Customer123`

Get the session cookie value from browser DevTools → Application → Cookies → `nova_session`.

---

## Checks

### 1. Unauthenticated GET /api/accounts returns 401

```bash
curl -s http://localhost:3000/api/accounts | jq .
# Expected: { "error": "Unauthorized." }
```

### 2. Authenticated customer only sees their own accounts

```bash
curl -s -H "Cookie: nova_session=<TOKEN>" \
  http://localhost:3000/api/accounts | jq '.accounts[].id'
# Expected: only account IDs belonging to customer@nova.test (user id=1)
```

### 3. `userId` query parameter is ignored

```bash
curl -s -H "Cookie: nova_session=<CUSTOMER_TOKEN>" \
  "http://localhost:3000/api/accounts?userId=3" | jq '.accounts[].id'
# Expected: still returns customer's accounts, NOT admin's accounts
```

### 4. Customer cannot PATCH another customer's account

```bash
# Get admin's account ID first (requires admin login)
# Then try to patch it as customer:
curl -s -X PATCH -H "Cookie: nova_session=<CUSTOMER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"accountId": <ADMIN_ACCOUNT_ID>, "nickname": "HACK"}' \
  http://localhost:3000/api/accounts | jq .
# Expected: { "error": "Forbidden." } or { "error": "Account not found or access denied." }
```

### 5. Transactions are scoped to current user

```bash
curl -s -H "Cookie: nova_session=<CUSTOMER_TOKEN>" \
  http://localhost:3000/api/transactions | jq '.transactions | length'
# Expected: only transactions involving customer@nova.test's accounts
```

### 6. Beneficiaries are scoped to current user

```bash
curl -s -H "Cookie: nova_session=<CUSTOMER_TOKEN>" \
  http://localhost:3000/api/beneficiaries | jq .
# Expected: only beneficiaries with user_id matching customer
```

### 7. Search does not return other users' data

```bash
curl -s -H "Cookie: nova_session=<CUSTOMER_TOKEN>" \
  "http://localhost:3000/api/search?q=admin" | jq '.results'
# Expected: empty array (admin account is not in customer's data scope)
```

### 8. Transfer execution is disabled until Phase 5

```bash
curl -s -X POST -H "Cookie: nova_session=<CUSTOMER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"fromAccount":"1000003423","toAccount":"2000006754","amount":100}' \
  http://localhost:3000/api/transfer | jq .
# Expected: HTTP 501 with message about Phase 5
```

### 9. Frozen account cannot be used for transfer

```bash
# First freeze the account via PATCH
curl -s -X PATCH -H "Cookie: nova_session=<CUSTOMER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"accountId": 1, "status": "frozen"}' \
  http://localhost:3000/api/accounts | jq .

# Then try to transfer from it
curl -s -X POST -H "Cookie: nova_session=<CUSTOMER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"fromAccount":"1000003423","toAccount":"2000006754","amount":100}' \
  http://localhost:3000/api/transfer | jq .
# Expected: 400 "Source account is frozen and cannot send transfers."
```

### 10. Admin diagnostics still requires admin

```bash
# As customer:
curl -s -H "Cookie: nova_session=<CUSTOMER_TOKEN>" \
  http://localhost:3000/api/admin/system | jq .
# Expected: { "error": "Forbidden." }

# As admin (after admin login):
curl -s -H "Cookie: nova_session=<ADMIN_TOKEN>" \
  http://localhost:3000/api/admin/system | jq .
# Expected: { "status": "ok", "checks": { ... } }
```

### 11. Notifications are scoped to current user

```bash
curl -s -H "Cookie: nova_session=<CUSTOMER_TOKEN>" \
  http://localhost:3000/api/notifications | jq '.notifications | length'
# Expected: only notifications for customer@nova.test
```

### 12. Mark notification read

```bash
# Get a notification ID first:
NOTIF_ID=$(curl -s -H "Cookie: nova_session=<CUSTOMER_TOKEN>" \
  http://localhost:3000/api/notifications | jq '.notifications[0].id')

curl -s -X POST -H "Cookie: nova_session=<CUSTOMER_TOKEN>" \
  http://localhost:3000/api/notifications/$NOTIF_ID/read | jq .
# Expected: { "ok": true }
```

### 13. Sensitive fields never returned

Verify none of the API responses contain:
- `password` or `password_hash`
- `pin`
- `session_token_hash`
- `DATABASE_URL`
- `process.env`

```bash
curl -s -H "Cookie: nova_session=<CUSTOMER_TOKEN>" \
  http://localhost:3000/api/accounts | grep -i "password\|pin\|hash\|DATABASE"
# Expected: no output
```

---

## Page verification

| Page | Expected behaviour |
|------|--------------------|
| `/login` | Loads without auth |
| `/dashboard` | Redirects to `/login` without session cookie |
| `/bank-accounts` | Shows real accounts from API |
| `/bank-transfer` | Shows real accounts/beneficiaries; shows Phase 5 notice on submit |
| Account freeze | PATCH succeeds; button text changes; transfer rejects frozen account |

---

## Demo credentials

| Role     | Email               | Password    |
|----------|---------------------|-------------|
| Customer | customer@nova.test  | Customer123 |
| Admin    | admin@nova.test     | Admin12345  |
