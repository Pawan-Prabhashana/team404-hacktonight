/**
 * Smart Spend repository — Phase 8.
 *
 * All queries are scoped to the authenticated user's data.
 * userId is always passed from the session (never from the request body).
 * All SQL uses parameterized queries only.
 */
import { query } from '@/lib/db'
import { ensureDatabase } from '@/lib/platform-db'

// ── Types ──────────────────────────────────────────────────────────────────

export type AnalyticsTransaction = {
  id:           number
  reference:    string | null
  type:         string
  fromAccount:  string
  toAccount:    string
  amountMajor:  number          // NUMERIC(14,2) converted to JS number
  amountMinor:  number          // amountMajor * 100, integer minor units
  description:  string
  status:       string
  categorySlug: string | null
  createdAt:    string
  isDebit:      boolean
  isCredit:     boolean
  isInternal:   boolean
}

export type AnalyticsBillPayment = {
  id:             number
  reference:      string
  amountMinor:    number          // already in minor units
  billerName:     string
  billerCategory: string
  status:         string
  createdAt:      string
}

export type BudgetRow = {
  id:                 number
  categorySlug:       string
  amountMinorUnits:   number
  currency:           string
  period:             string
}

export type AccountSummaryRow = {
  id:            number
  accountNumber: string
  accountName:   string
  balanceMajor:  number
  balanceMinor:  number
  status:        string
  nickname:      string | null
}

// ── Helpers ────────────────────────────────────────────────────────────────

function toMinor(major: number | string): number {
  return Math.round(Number(major) * 100)
}

// ── Queries ────────────────────────────────────────────────────────────────

/**
 * Return all transactions for the user between two ISO date strings.
 * Marks each row as debit/credit/internal relative to the user's accounts.
 */
export async function listUserTransactionsForAnalytics(input: {
  userId:    number
  from:      string
  to:        string
  accountId?: number
}): Promise<AnalyticsTransaction[]> {
  await ensureDatabase()
  const { userId, from, to, accountId } = input

  const acctResult = await query<{ account_number: string }>(
    `SELECT account_number FROM accounts WHERE user_id = $1`,
    [userId],
  )
  const userAccountNumbers = acctResult.rows.map((r) => r.account_number)
  if (userAccountNumbers.length === 0) return []

  let filterNumbers = userAccountNumbers
  if (accountId !== undefined) {
    const owned = await query<{ account_number: string }>(
      `SELECT account_number FROM accounts WHERE id = $1 AND user_id = $2 LIMIT 1`,
      [accountId, userId],
    )
    if (!owned.rows[0]) return []
    filterNumbers = [owned.rows[0].account_number]
  }

  const result = await query<{
    id: number
    reference: string | null
    type: string | null
    from_account: string
    to_account: string
    amount: string
    description: string | null
    status: string
    category_slug: string | null
    created_at: string
  }>(
    `SELECT id, reference, type, from_account, to_account,
            amount, description, status, category_slug, created_at
     FROM transactions
     WHERE (from_account = ANY($1::text[]) OR to_account = ANY($1::text[]))
       AND created_at >= $2
       AND created_at <  $3
     ORDER BY created_at DESC`,
    [filterNumbers, from, to],
  )

  const userSet = new Set(userAccountNumbers)

  return result.rows.map((row) => {
    const major    = Number(row.amount)
    const minor    = toMinor(major)
    const isDebit  = userSet.has(row.from_account)
    const isCredit = userSet.has(row.to_account)
    return {
      id:           row.id,
      reference:    row.reference,
      type:         row.type ?? 'transfer',
      fromAccount:  row.from_account,
      toAccount:    row.to_account,
      amountMajor:  major,
      amountMinor:  minor,
      description:  row.description ?? '',
      status:       row.status,
      categorySlug: row.category_slug,
      createdAt:    row.created_at,
      isDebit:      isDebit && !isCredit,  // pure outflow
      isCredit:     isCredit && !isDebit,  // pure inflow
      isInternal:   isDebit && isCredit,   // between own accounts
    }
  })
}

/**
 * Return completed bill payments for the user in the given date range.
 */
export async function listUserBillPaymentsForAnalytics(input: {
  userId:     number
  from:       string
  to:         string
  accountId?: number
}): Promise<AnalyticsBillPayment[]> {
  await ensureDatabase()
  const { userId, from, to, accountId } = input

  const params: unknown[] = [userId, from, to]
  let extra = ''
  if (accountId !== undefined) {
    params.push(accountId)
    extra = ` AND bp.account_id = $${params.length}`
  }

  const result = await query<{
    id: number
    reference: string
    amount_minor_units: string
    biller_name: string
    biller_category: string
    status: string
    created_at: string
  }>(
    `SELECT bp.id, bp.reference, bp.amount_minor_units,
            b.name AS biller_name, b.category AS biller_category,
            bp.status, bp.created_at
     FROM bill_payments bp
     JOIN billers b ON b.id = bp.biller_id
     WHERE bp.user_id = $1
       AND bp.created_at >= $2
       AND bp.created_at <  $3
       AND bp.status = 'completed'${extra}
     ORDER BY bp.created_at DESC`,
    params,
  )

  return result.rows.map((row) => ({
    id:             row.id,
    reference:      row.reference,
    amountMinor:    Number(row.amount_minor_units),
    billerName:     row.biller_name,
    billerCategory: row.biller_category,
    status:         row.status,
    createdAt:      row.created_at,
  }))
}

/**
 * Return all active accounts for the user with balances.
 */
export async function listUserAccountsForAnalytics(
  userId: number,
): Promise<AccountSummaryRow[]> {
  await ensureDatabase()
  const result = await query<{
    id: number
    account_number: string
    account_name: string
    balance: string
    status: string
    nickname: string | null
  }>(
    `SELECT id, account_number, account_name, balance, status, nickname
     FROM accounts
     WHERE user_id = $1 AND status = 'active'
     ORDER BY id`,
    [userId],
  )
  return result.rows.map((row) => ({
    id:            row.id,
    accountNumber: row.account_number,
    accountName:   row.account_name,
    balanceMajor:  Number(row.balance),
    balanceMinor:  toMinor(row.balance),
    status:        row.status,
    nickname:      row.nickname,
  }))
}

/**
 * Return all budgets for the user.
 */
export async function listBudgetsForUser(userId: number): Promise<BudgetRow[]> {
  await ensureDatabase()
  const result = await query<{
    id: number
    category_slug: string
    amount_minor_units: string
    currency: string
    period: string
  }>(
    `SELECT id, category_slug, amount_minor_units, currency, period
     FROM budgets
     WHERE user_id = $1
     ORDER BY category_slug`,
    [userId],
  )
  return result.rows.map((row) => ({
    id:               row.id,
    categorySlug:     row.category_slug,
    amountMinorUnits: Number(row.amount_minor_units),
    currency:         row.currency,
    period:           row.period,
  }))
}

/**
 * Upsert (create or update) a monthly budget for the user.
 */
export async function upsertBudgetForUser(input: {
  userId:           number
  categorySlug:     string
  amountMinorUnits: number
  currency:         string
  period:           'monthly'
}): Promise<BudgetRow> {
  await ensureDatabase()
  const { userId, categorySlug, amountMinorUnits, currency, period } = input
  const result = await query<{
    id: number
    category_slug: string
    amount_minor_units: string
    currency: string
    period: string
  }>(
    `INSERT INTO budgets (user_id, category_slug, amount_minor_units, currency, period)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, category_slug, period)
     DO UPDATE SET amount_minor_units = EXCLUDED.amount_minor_units,
                   updated_at         = NOW()
     RETURNING id, category_slug, amount_minor_units, currency, period`,
    [userId, categorySlug, amountMinorUnits, currency, period],
  )
  const row = result.rows[0]
  return {
    id:               row.id,
    categorySlug:     row.category_slug,
    amountMinorUnits: Number(row.amount_minor_units),
    currency:         row.currency,
    period:           row.period,
  }
}

/**
 * Return all spend categories from the reference table.
 */
export async function listSpendCategories(): Promise<
  { id: number; name: string; slug: string; color: string; icon: string }[]
> {
  await ensureDatabase()
  const result = await query<{
    id: number
    name: string
    slug: string
    color: string
    icon: string
  }>(`SELECT id, name, slug, color, icon FROM spend_categories ORDER BY name`, [])
  return result.rows
}
