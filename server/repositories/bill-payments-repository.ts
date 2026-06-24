/**
 * Bill payments repository — Phase 7.
 *
 * Every query is scoped to a specific user_id, derived from the session by the
 * caller. The userId is NEVER trusted from the frontend.
 *
 * Returns safe, joined biller data (name/category) where useful and never
 * exposes internal secrets or other users' payments.
 */
import { query } from '@/lib/db'
import { formatCurrency } from '@/lib/money'
import { ensureDatabase } from '@/lib/platform-db'

type BillPaymentRow = {
  id: number
  reference: string
  account_id: number
  biller_id: number
  transaction_id: number | null
  biller_name: string | null
  biller_category: string | null
  bill_reference: string
  amount_minor_units: string
  currency: string
  status: string
  paid_at: string | null
  created_at: string
}

export type SafeBillPayment = {
  id: number
  reference: string
  accountId: number
  billerId: number
  transactionId: number | null
  billerName: string
  billerCategory: string | null
  billReference: string
  amountMinorUnits: number
  amountDisplay: string
  currency: string
  status: string
  paidAt: string | null
  createdAt: string
}

function toSafeBillPayment(row: BillPaymentRow): SafeBillPayment {
  const amountMinorUnits = Number(row.amount_minor_units)
  return {
    id: row.id,
    reference: row.reference,
    accountId: row.account_id,
    billerId: row.biller_id,
    transactionId: row.transaction_id,
    billerName: row.biller_name ?? 'Biller',
    billerCategory: row.biller_category,
    billReference: row.bill_reference,
    amountMinorUnits,
    amountDisplay: formatCurrency(amountMinorUnits, row.currency),
    currency: row.currency,
    status: row.status,
    paidAt: row.paid_at,
    createdAt: row.created_at
  }
}

export type ListBillPaymentsInput = {
  userId: number
  accountId?: number
  billerId?: number
  status?: string
  limit?: number
  offset?: number
}

/** List the user's bill payments, optionally filtered. Always user-scoped. */
export async function listBillPaymentsForUser(
  input: ListBillPaymentsInput
): Promise<{ billPayments: SafeBillPayment[]; total: number }> {
  await ensureDatabase()
  const { userId, accountId, billerId, status, limit = 20, offset = 0 } = input

  // user_id is always the first bound parameter — never trusted from input body.
  const clauses: string[] = ['bp.user_id = $1']
  const params: unknown[] = [userId]

  if (accountId !== undefined) {
    params.push(accountId)
    clauses.push(`bp.account_id = $${params.length}`)
  }
  if (billerId !== undefined) {
    params.push(billerId)
    clauses.push(`bp.biller_id = $${params.length}`)
  }
  if (status !== undefined) {
    params.push(status)
    clauses.push(`bp.status = $${params.length}`)
  }

  const where = clauses.join(' AND ')

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM bill_payments bp WHERE ${where}`,
    params
  )
  const total = Number(countResult.rows[0]?.count ?? 0)

  const limitIdx = params.length + 1
  const offsetIdx = params.length + 2

  const result = await query<BillPaymentRow>(
    `SELECT bp.id, bp.reference, bp.account_id, bp.biller_id, bp.transaction_id,
            b.name AS biller_name, b.category AS biller_category,
            bp.bill_reference, bp.amount_minor_units, bp.currency, bp.status,
            bp.paid_at, bp.created_at
     FROM bill_payments bp
     LEFT JOIN billers b ON b.id = bp.biller_id
     WHERE ${where}
     ORDER BY bp.created_at DESC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    [...params, limit, offset]
  )

  return { billPayments: result.rows.map(toSafeBillPayment), total }
}

/** Fetch a single bill payment by reference, scoped to the owning user. */
export async function getBillPaymentForUser(
  userId: number,
  reference: string
): Promise<SafeBillPayment | null> {
  await ensureDatabase()
  const result = await query<BillPaymentRow>(
    `SELECT bp.id, bp.reference, bp.account_id, bp.biller_id, bp.transaction_id,
            b.name AS biller_name, b.category AS biller_category,
            bp.bill_reference, bp.amount_minor_units, bp.currency, bp.status,
            bp.paid_at, bp.created_at
     FROM bill_payments bp
     LEFT JOIN billers b ON b.id = bp.biller_id
     WHERE bp.reference = $1 AND bp.user_id = $2
     LIMIT 1`,
    [reference, userId]
  )
  const row = result.rows[0]
  return row ? toSafeBillPayment(row) : null
}
