/**
 * Transactions repository — Phase 6.
 *
 * Queries are scoped to the authenticated user's accounts.
 * Completed transfers are included via the new reference/type columns.
 * Direction (debit/credit/internal) is determined relative to the user's accounts.
 */
import { query } from '@/lib/db'
import { formatCurrency } from '@/lib/money'
import { ensureDatabase } from '@/lib/platform-db'
import { getAccountNumbersForUser } from '@/server/repositories/accounts-repository'

type TransactionRow = {
  id: number
  reference: string | null
  type: string | null
  from_account: string
  to_account: string
  amount: string
  description: string | null
  status: string
  created_by: number | null
  created_at: string
}

export type SafeTransaction = {
  id: number
  reference: string
  type: string
  fromAccount: string
  toAccount: string
  direction: 'debit' | 'credit' | 'internal'
  amountMinorUnits: number
  amountDisplay: string
  currency: string
  status: string
  description: string
  createdAt: string
}

function toSafeTransaction(
  row: TransactionRow,
  userAccountNumbers: Set<string>
): SafeTransaction {
  const amountMinorUnits = Math.round(Number(row.amount) * 100)
  const isDebit = userAccountNumbers.has(row.from_account)
  const isCredit = userAccountNumbers.has(row.to_account)
  let direction: 'debit' | 'credit' | 'internal' = 'debit'
  if (isDebit && isCredit) direction = 'internal'
  else if (isCredit) direction = 'credit'

  return {
    id: row.id,
    reference: row.reference ?? `TXN-${String(row.id).padStart(8, '0')}`,
    type: row.type ?? 'transfer',
    fromAccount: row.from_account,
    toAccount: row.to_account,
    direction,
    amountMinorUnits,
    amountDisplay: formatCurrency(amountMinorUnits),
    currency: 'LKR',
    status:
      row.status === 'SUCCESS'
        ? 'completed'
        : (row.status ?? 'completed').toLowerCase(),
    description: row.description ?? '',
    createdAt: row.created_at
  }
}

export type ListTransactionsInput = {
  userId: number
  accountId?: number
  limit?: number
  offset?: number
}

export async function listTransactionsForUser(input: ListTransactionsInput) {
  await ensureDatabase()
  const { userId, accountId, limit = 20, offset = 0 } = input

  const accountNumbers = await getAccountNumbersForUser(userId)
  if (accountNumbers.length === 0) {
    return { transactions: [], total: 0 }
  }

  let filterNumbers = accountNumbers

  if (accountId !== undefined) {
    const acctResult = await query<{ account_number: string }>(
      'SELECT account_number FROM accounts WHERE id = $1 AND user_id = $2 LIMIT 1',
      [accountId, userId]
    )
    const owned = acctResult.rows[0]
    if (!owned) return { transactions: [], total: 0 }
    filterNumbers = [owned.account_number]
  }

  const accountSet = new Set(filterNumbers)

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM transactions
     WHERE from_account = ANY($1::text[]) OR to_account = ANY($1::text[])`,
    [filterNumbers]
  )
  const total = Number(countResult.rows[0]?.count ?? 0)

  const result = await query<TransactionRow>(
    `SELECT id, reference, type, from_account, to_account,
            amount, description, status, created_by, created_at
     FROM transactions
     WHERE from_account = ANY($1::text[]) OR to_account = ANY($1::text[])
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [filterNumbers, limit, offset]
  )

  return {
    transactions: result.rows.map((row) => toSafeTransaction(row, accountSet)),
    total
  }
}
