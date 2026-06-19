/**
 * Accounts repository — all queries are scoped to a specific user_id.
 * Never returns PIN. Never trusts client-supplied userId.
 */
import { type AccountRow, toSafeAccount } from '@/lib/banking-auth'
import { query } from '@/lib/db'
import { ensureDatabase } from '@/lib/platform-db'

/** List all accounts owned by userId. */
export async function listAccountsForUser(userId: number) {
  await ensureDatabase()
  const result = await query<AccountRow>(
    `SELECT id, user_id, account_number, account_name, balance, status, nickname
     FROM accounts
     WHERE user_id = $1
     ORDER BY id`,
    [userId]
  )
  return result.rows.map(toSafeAccount)
}

/** Get a single account by integer ID, verified to belong to userId. */
export async function getAccountForUser(userId: number, accountId: number) {
  await ensureDatabase()
  const result = await query<AccountRow>(
    `SELECT id, user_id, account_number, account_name, balance, status, nickname
     FROM accounts
     WHERE id = $1 AND user_id = $2
     LIMIT 1`,
    [accountId, userId]
  )
  const row = result.rows[0]
  return row ? toSafeAccount(row) : null
}

/** Update the nickname of an account. Verifies ownership. */
export async function updateAccountNickname(
  userId: number,
  accountId: number,
  nickname: string | null
): Promise<ReturnType<typeof toSafeAccount> | null> {
  await ensureDatabase()
  const result = await query<AccountRow>(
    `UPDATE accounts
     SET nickname = $1
     WHERE id = $2 AND user_id = $3
     RETURNING id, user_id, account_number, account_name, balance, status, nickname`,
    [nickname, accountId, userId]
  )
  const row = result.rows[0]
  return row ? toSafeAccount(row) : null
}

/** Update the status of an account (active / frozen). Verifies ownership. */
export async function updateAccountStatus(
  userId: number,
  accountId: number,
  status: 'active' | 'frozen'
): Promise<ReturnType<typeof toSafeAccount> | null> {
  await ensureDatabase()
  const result = await query<AccountRow>(
    `UPDATE accounts
     SET status = $1
     WHERE id = $2 AND user_id = $3
     RETURNING id, user_id, account_number, account_name, balance, status, nickname`,
    [status, accountId, userId]
  )
  const row = result.rows[0]
  return row ? toSafeAccount(row) : null
}

/** Return all account numbers belonging to a user (used for transaction scoping). */
export async function getAccountNumbersForUser(
  userId: number
): Promise<string[]> {
  await ensureDatabase()
  const result = await query<{ account_number: string }>(
    'SELECT account_number FROM accounts WHERE user_id = $1',
    [userId]
  )
  return result.rows.map((r) => r.account_number)
}
