/**
 * Atomic Bill Payment Service — Phase 7.
 *
 * Executes a real bill payment inside a single PostgreSQL BEGIN/COMMIT
 * transaction. The source account is locked with FOR UPDATE so concurrent
 * payments cannot overdraft it.
 *
 * Security guarantees (mirrors the Phase 6 transfer engine):
 *   - userId is always derived from the session, never the request body.
 *   - Source account ownership is verified inside the locked row.
 *   - Frozen accounts are rejected before any balance change.
 *   - Insufficient funds are rejected atomically.
 *   - Idempotency key prevents double-submit if the client retries.
 *   - Every payment writes: transaction + ledger entry + bill_payment + audit.
 *   - All writes roll back automatically on any error — no partial deduction.
 *   - No stack traces or internal details are returned to callers.
 */
import type { PoolClient } from 'pg'
import { writeAuditLog } from '@/lib/audit'
import { withTransaction } from '@/lib/db'
import { formatCurrency } from '@/lib/money'
import {
  AccountFrozenError,
  AccountNotFoundError,
  BankingError,
  BillerNotFoundError,
  CurrencyMismatchError
} from '@/server/errors/banking-errors'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AccountRow = {
  id: number
  user_id: number
  account_number: string
  balance: string // pg returns NUMERIC as string
  status: string
}

type BillerRow = {
  id: number
  name: string
  status: string
}

type ExistingBillPaymentRow = {
  id: number
  reference: string
  account_id: number
  biller_id: number
  transaction_id: number | null
  bill_reference: string
  amount_minor_units: string
  currency: string
  paid_at: string | null
  created_at: string
}

export type CreateBillPaymentInput = {
  userId: number
  accountId: number
  billerId: number
  billReference: string
  amountMinorUnits: number
  currency: string
  idempotencyKey?: string
  ipAddress?: string | null
  userAgent?: string | null
}

export type BillPaymentReceipt = {
  reference: string
  billPaymentId: number
  transactionId: number
  accountId: number
  billerId: number
  billerName: string
  billReference: string
  amountMinorUnits: number
  amountDisplay: string
  currency: string
  status: 'completed'
  paidAt: string
  balanceAfterMinorUnits: number
  balanceAfterDisplay: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateReference(): string {
  const d = new Date()
  const date = [
    d.getUTCFullYear(),
    String(d.getUTCMonth() + 1).padStart(2, '0'),
    String(d.getUTCDate()).padStart(2, '0')
  ].join('')
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `SRB-BILL-${date}-${rand}`
}

function toMinorUnits(balance: string): number {
  return Math.round(Number(balance) * 100)
}

async function lockAccount(
  client: PoolClient,
  accountId: number
): Promise<AccountRow | null> {
  const r = await client.query<AccountRow>(
    `SELECT id, user_id, account_number, balance, status
     FROM accounts
     WHERE id = $1
     FOR UPDATE`,
    [accountId]
  )
  return r.rows[0] ?? null
}

// ---------------------------------------------------------------------------
// Main service
// ---------------------------------------------------------------------------

export async function createBillPayment(
  input: CreateBillPaymentInput
): Promise<BillPaymentReceipt> {
  const {
    userId,
    accountId,
    billerId,
    billReference,
    amountMinorUnits,
    currency,
    idempotencyKey,
    ipAddress = null,
    userAgent = null
  } = input

  return withTransaction(async (client) => {
    // ── 1. Idempotency check ─────────────────────────────────────────────
    if (idempotencyKey) {
      const existing = await client.query<ExistingBillPaymentRow>(
        `SELECT id, reference, account_id, biller_id, transaction_id,
                bill_reference, amount_minor_units, currency, paid_at, created_at
         FROM bill_payments
         WHERE user_id = $1 AND idempotency_key = $2
         LIMIT 1`,
        [userId, idempotencyKey]
      )
      if (existing.rows[0]) {
        const bp = existing.rows[0]
        // Resolve current balance + biller name for an accurate receipt.
        const acct = await client.query<{ balance: string }>(
          'SELECT balance FROM accounts WHERE id = $1',
          [bp.account_id]
        )
        const balanceAfterMinor = toMinorUnits(acct.rows[0]?.balance ?? '0')
        const biller = await client.query<{ name: string }>(
          'SELECT name FROM billers WHERE id = $1',
          [bp.biller_id]
        )
        const existingAmountMinor = Number(bp.amount_minor_units)
        return {
          reference: bp.reference,
          billPaymentId: bp.id,
          transactionId: bp.transaction_id ?? 0,
          accountId: bp.account_id,
          billerId: bp.biller_id,
          billerName: biller.rows[0]?.name ?? 'Biller',
          billReference: bp.bill_reference,
          amountMinorUnits: existingAmountMinor,
          amountDisplay: formatCurrency(existingAmountMinor, bp.currency),
          currency: bp.currency,
          status: 'completed',
          paidAt: String(bp.paid_at ?? bp.created_at),
          balanceAfterMinorUnits: balanceAfterMinor,
          balanceAfterDisplay: formatCurrency(balanceAfterMinor, bp.currency)
        }
      }
    }

    // ── 2. Lock and verify source account ────────────────────────────────
    const src = await lockAccount(client, accountId)
    if (!src || src.user_id !== userId) {
      throw new AccountNotFoundError()
    }
    if (src.status !== 'active') {
      throw new AccountFrozenError()
    }

    // ── 3. Currency check (accounts are LKR in the demo schema) ───────────
    if (currency !== 'LKR') {
      throw new CurrencyMismatchError()
    }

    // ── 4. Insufficient funds check (inside the locked row) ───────────────
    const srcBalanceBefore = toMinorUnits(src.balance)
    if (srcBalanceBefore < amountMinorUnits) {
      throw new BankingError(
        `Insufficient funds. Available: ${formatCurrency(srcBalanceBefore, currency)}.`,
        400,
        'INSUFFICIENT_FUNDS'
      )
    }

    // ── 5. Verify biller exists and is active ─────────────────────────────
    const billerResult = await client.query<BillerRow>(
      `SELECT id, name, status FROM billers WHERE id = $1 AND status = 'active' LIMIT 1`,
      [billerId]
    )
    const biller = billerResult.rows[0]
    if (!biller) {
      throw new BillerNotFoundError()
    }

    // ── 6. Generate unique reference ──────────────────────────────────────
    const reference = generateReference()
    const amountDecimal = amountMinorUnits / 100
    const description = `${biller.name} — ${billReference}`

    // ── 7. Create transaction record (type = bill_payment, debit) ─────────
    const txResult = await client.query<{ id: number; created_at: string }>(
      `INSERT INTO transactions
         (from_account, to_account, amount, description, status, created_by,
          idempotency_key, reference, type)
       VALUES ($1, $2, $3, $4, 'SUCCESS', $5, $6, $7, 'bill_payment')
       RETURNING id, created_at`,
      [
        src.account_number,
        biller.name,
        amountDecimal,
        description,
        userId,
        idempotencyKey ? `bill:${idempotencyKey}` : null,
        reference
      ]
    )
    const txId = txResult.rows[0].id

    // ── 8. Debit source account ───────────────────────────────────────────
    const srcAfterResult = await client.query<{ balance: string }>(
      `UPDATE accounts
       SET balance = balance - $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING balance`,
      [amountDecimal, accountId]
    )
    const balanceAfterMinor = toMinorUnits(
      srcAfterResult.rows[0]?.balance ?? '0'
    )

    // ── 9. Ledger entry (debit) ───────────────────────────────────────────
    await client.query(
      `INSERT INTO ledger_entries
         (transaction_id, account_id, entry_type, amount_minor_units, balance_after_minor_units)
       VALUES ($1, $2, 'debit', $3, $4)`,
      [txId, accountId, amountMinorUnits, balanceAfterMinor]
    )

    // ── 10. Bill payment row ──────────────────────────────────────────────
    const bpResult = await client.query<{ id: number; paid_at: string }>(
      `INSERT INTO bill_payments
         (reference, user_id, account_id, biller_id, transaction_id,
          bill_reference, amount_minor_units, currency, status,
          idempotency_key, paid_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'completed', $9, NOW())
       RETURNING id, paid_at`,
      [
        reference,
        userId,
        accountId,
        billerId,
        txId,
        billReference,
        amountMinorUnits,
        currency,
        idempotencyKey ?? null
      ]
    )
    const billPaymentId = bpResult.rows[0].id
    const paidAt = String(bpResult.rows[0].paid_at)

    // ── 11. Audit log (non-blocking) ──────────────────────────────────────
    await writeAuditLog({
      userId: String(userId),
      action: 'BILL_PAYMENT_COMPLETED',
      entityType: 'bill_payment',
      entityId: String(billPaymentId),
      metadata: {
        reference,
        amountMinorUnits,
        currency,
        accountId,
        billerId,
        billerName: biller.name,
        billReference
      },
      ipAddress,
      userAgent
    })

    // ── 12. Notification (best-effort, inside the transaction) ────────────
    await client
      .query(
        `INSERT INTO notifications (user_id, type, title, message)
         VALUES ($1, 'success', $2, $3)`,
        [
          userId,
          'Bill payment completed',
          `Your payment of ${formatCurrency(amountMinorUnits, currency)} to ${biller.name} (${reference}) was completed.`
        ]
      )
      .catch(() => {})

    return {
      reference,
      billPaymentId,
      transactionId: txId,
      accountId,
      billerId,
      billerName: biller.name,
      billReference,
      amountMinorUnits,
      amountDisplay: formatCurrency(amountMinorUnits, currency),
      currency,
      status: 'completed',
      paidAt,
      balanceAfterMinorUnits: balanceAfterMinor,
      balanceAfterDisplay: formatCurrency(balanceAfterMinor, currency)
    }
  })
}
