/**
 * Banking authorization helpers for NOVA Bank.
 *
 * These wrap the core session helpers and add account-level ownership checks.
 * All banking API routes that touch account-specific data should use these
 * instead of calling requireUser() directly, so ownership is always verified.
 *
 * Note: The legacy DB schema uses integer IDs (not UUIDs) for users and
 * accounts. These helpers use `number` to match `AuthUser.id`.
 */
import { ForbiddenError } from '@/lib/auth-errors'
import { query } from '@/lib/db'
import { maskAccountNumber } from '@/lib/masking'
import { formatCurrency } from '@/lib/money'
import { type AuthUser, requireAdmin, requireUser } from '@/lib/session'

export type { AuthUser }
export {
  requireAdmin as requireBankingAdmin,
  requireUser as requireBankingUser
}

// ---------------------------------------------------------------------------
// Account row type (legacy schema)
// ---------------------------------------------------------------------------

export type AccountRow = {
  id: number
  user_id: number
  account_number: string
  account_name: string
  balance: string // pg returns NUMERIC as string
  status: string
  nickname: string | null
}

// ---------------------------------------------------------------------------
// Ownership helpers
// ---------------------------------------------------------------------------

/**
 * Assert that an account (by integer ID) belongs to the given user.
 * Throws ForbiddenError if not found or not owned by userId.
 */
export async function assertAccountOwnership(
  userId: number,
  accountId: number
): Promise<void> {
  const result = await query(
    'SELECT id FROM accounts WHERE id = $1 AND user_id = $2 LIMIT 1',
    [accountId, userId]
  )
  if ((result.rowCount ?? 0) === 0) {
    throw new ForbiddenError('Account access denied.')
  }
}

/**
 * Fetch a single account row, verified to belong to the given user.
 * Returns null if the account does not exist or belongs to another user.
 */
export async function getOwnedAccount(
  userId: number,
  accountId: number
): Promise<AccountRow | null> {
  const result = await query<AccountRow>(
    `SELECT id, user_id, account_number, account_name, balance, status, nickname
     FROM accounts
     WHERE id = $1 AND user_id = $2
     LIMIT 1`,
    [accountId, userId]
  )
  return result.rows[0] ?? null
}

// ---------------------------------------------------------------------------
// Safe serializer
// ---------------------------------------------------------------------------

/**
 * Convert a raw account DB row into a safe client-facing object.
 * - Masks the account number.
 * - Converts balance to minor units (integer cents).
 * - Never returns PIN, user_id, or raw account number.
 */
export function toSafeAccount(row: AccountRow) {
  const balanceMinorUnits = Math.round(Number(row.balance) * 100)
  return {
    id: row.id,
    accountNumberMasked: maskAccountNumber(row.account_number),
    accountName: row.account_name,
    currency: 'LKR' as const,
    balanceMinorUnits,
    balanceDisplay: formatCurrency(balanceMinorUnits),
    status: row.status ?? 'active',
    nickname: row.nickname ?? row.account_name
  }
}
