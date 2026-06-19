/**
 * Atomic Transfer Service — Phase 6.
 *
 * Executes a real money transfer inside a PostgreSQL BEGIN/COMMIT transaction.
 * All balance mutations are protected by row-level FOR UPDATE locks so that
 * concurrent transfers cannot overdraft an account.
 *
 * Security guarantees:
 *   - userId is always derived from the session, never the request body.
 *   - Source account ownership is verified inside the locked row.
 *   - Frozen accounts are rejected before any balance change.
 *   - Insufficient funds are rejected atomically.
 *   - Idempotency key prevents double-submit if the client retries.
 *   - All writes are rolled back automatically on any error.
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
  BeneficiaryNotFoundError,
  SameAccountError
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

type BeneficiaryRow = {
  id: number
  user_id: number
  name: string
  account_number: string
}

type ExistingTxRow = {
  id: number
  reference: string | null
  from_account: string
  amount: string
  created_at: string
}

export type TransferServiceInput = {
  userId: number
  sourceAccountId: number
  destinationAccountId?: number | null
  beneficiaryId?: number | null
  amountMinorUnits: number
  currency: string
  description?: string
  idempotencyKey?: string
  ipAddress?: string | null
}

export type TransferReceipt = {
  reference: string
  transactionId: number
  sourceAccountId: number
  sourceAccountNumber: string
  destinationAccountId: number | null
  beneficiaryId: number | null
  amountMinorUnits: number
  amountDisplay: string
  currency: string
  status: 'completed'
  description: string
  createdAt: string
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
  return `SRB-${date}-${rand}`
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

function toMinorUnits(balance: string): number {
  return Math.round(Number(balance) * 100)
}

// ---------------------------------------------------------------------------
// Main service
// ---------------------------------------------------------------------------

export async function createTransfer(
  input: TransferServiceInput
): Promise<TransferReceipt> {
  const {
    userId,
    sourceAccountId,
    destinationAccountId = null,
    beneficiaryId = null,
    amountMinorUnits,
    currency,
    description = '',
    idempotencyKey,
    ipAddress = null
  } = input

  return withTransaction(async (client) => {
    // ── 1. Idempotency check ─────────────────────────────────────────────
    if (idempotencyKey) {
      const existing = await client.query<ExistingTxRow>(
        `SELECT id, reference, from_account, amount, created_at
         FROM transactions
         WHERE created_by = $1 AND idempotency_key = $2
         LIMIT 1`,
        [userId, idempotencyKey]
      )
      if (existing.rows[0]) {
        const tx = existing.rows[0]
        const srcNow = await client.query<{ balance: string }>(
          'SELECT balance FROM accounts WHERE id = $1',
          [sourceAccountId]
        )
        const srcBalanceMinor = toMinorUnits(srcNow.rows[0]?.balance ?? '0')
        const existingAmountMinor = toMinorUnits(tx.amount)
        return {
          reference: tx.reference ?? `TXN-${String(tx.id).padStart(8, '0')}`,
          transactionId: tx.id,
          sourceAccountId,
          sourceAccountNumber: tx.from_account,
          destinationAccountId,
          beneficiaryId,
          amountMinorUnits: existingAmountMinor,
          amountDisplay: formatCurrency(existingAmountMinor, currency),
          currency,
          status: 'completed',
          description: description || 'Transfer',
          createdAt: String(tx.created_at),
          balanceAfterMinorUnits: srcBalanceMinor,
          balanceAfterDisplay: formatCurrency(srcBalanceMinor, currency)
        }
      }
    }

    // ── 2. Lock and verify source account ────────────────────────────────
    const src = await lockAccount(client, sourceAccountId)
    if (!src || src.user_id !== userId) {
      throw new AccountNotFoundError()
    }
    if (src.status !== 'active') {
      throw new AccountFrozenError()
    }

    const srcBalanceBefore = toMinorUnits(src.balance)
    if (srcBalanceBefore < amountMinorUnits) {
      throw new BankingError(
        `Insufficient funds. Available: ${formatCurrency(srcBalanceBefore, currency)}.`,
        400,
        'INSUFFICIENT_FUNDS'
      )
    }

    // ── 3. Lock destination account (internal transfers) ─────────────────
    let dest: AccountRow | null = null
    let destAccountNumber: string | null = null

    if (destinationAccountId != null) {
      if (destinationAccountId === sourceAccountId) {
        throw new SameAccountError()
      }
      dest = await lockAccount(client, destinationAccountId)
      if (!dest) {
        throw new AccountNotFoundError()
      }
      if (dest.status !== 'active') {
        throw new BankingError(
          'Destination account is not active.',
          400,
          'DEST_NOT_ACTIVE'
        )
      }
      destAccountNumber = dest.account_number
    }

    // ── 4. Verify beneficiary ownership ──────────────────────────────────
    if (beneficiaryId != null) {
      const ben = await client.query<BeneficiaryRow>(
        `SELECT id, user_id, name, account_number
         FROM beneficiaries
         WHERE id = $1 AND user_id = $2
         LIMIT 1`,
        [beneficiaryId, userId]
      )
      if (!ben.rows[0]) throw new BeneficiaryNotFoundError()
      // Use the beneficiary's account number as the destination label if no
      // internal account was provided.
      if (destAccountNumber === null) {
        destAccountNumber = ben.rows[0].account_number
      }
    }

    // ── 5. Generate unique reference ─────────────────────────────────────
    const reference = generateReference()
    const amountDecimal = amountMinorUnits / 100

    // ── 6. Create transaction record ─────────────────────────────────────
    const txResult = await client.query<{ id: number; created_at: string }>(
      `INSERT INTO transactions
         (from_account, to_account, amount, description, status, created_by,
          idempotency_key, reference, type)
       VALUES ($1, $2, $3, $4, 'SUCCESS', $5, $6, $7, 'transfer')
       RETURNING id, created_at`,
      [
        src.account_number,
        destAccountNumber ?? 'EXTERNAL',
        amountDecimal,
        description || 'Transfer',
        userId,
        idempotencyKey ?? null,
        reference
      ]
    )
    const txId = txResult.rows[0].id
    const createdAt = String(txResult.rows[0].created_at)

    // ── 7. Debit source account ───────────────────────────────────────────
    const srcAfterResult = await client.query<{ balance: string }>(
      `UPDATE accounts
       SET balance = balance - $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING balance`,
      [amountDecimal, sourceAccountId]
    )
    const srcBalanceAfterMinor = toMinorUnits(
      srcAfterResult.rows[0]?.balance ?? '0'
    )

    // ── 8. Source ledger entry ────────────────────────────────────────────
    await client.query(
      `INSERT INTO ledger_entries
         (transaction_id, account_id, entry_type, amount_minor_units, balance_after_minor_units)
       VALUES ($1, $2, 'debit', $3, $4)`,
      [txId, sourceAccountId, amountMinorUnits, srcBalanceAfterMinor]
    )

    // ── 9. Credit destination account (internal only) ─────────────────────
    if (dest !== null && destinationAccountId !== null) {
      await client.query(
        `UPDATE accounts
         SET balance = balance + $1,
             updated_at = NOW()
         WHERE id = $2`,
        [amountDecimal, destinationAccountId]
      )
      const destAfterResult = await client.query<{ balance: string }>(
        'SELECT balance FROM accounts WHERE id = $1',
        [destinationAccountId]
      )
      const destBalanceAfterMinor = toMinorUnits(
        destAfterResult.rows[0]?.balance ?? '0'
      )
      await client.query(
        `INSERT INTO ledger_entries
           (transaction_id, account_id, entry_type, amount_minor_units, balance_after_minor_units)
         VALUES ($1, $2, 'credit', $3, $4)`,
        [txId, destinationAccountId, amountMinorUnits, destBalanceAfterMinor]
      )
    }

    // ── 10. Audit log (non-blocking) ──────────────────────────────────────
    await writeAuditLog({
      userId: String(userId),
      action: 'TRANSFER_COMPLETED',
      entityType: 'transaction',
      entityId: String(txId),
      metadata: {
        reference,
        amountMinorUnits,
        currency,
        sourceAccountId,
        destinationAccountId,
        beneficiaryId
      },
      ipAddress
    })

    return {
      reference,
      transactionId: txId,
      sourceAccountId,
      sourceAccountNumber: src.account_number,
      destinationAccountId,
      beneficiaryId,
      amountMinorUnits,
      amountDisplay: formatCurrency(amountMinorUnits, currency),
      currency,
      status: 'completed',
      description: description || 'Transfer',
      createdAt,
      balanceAfterMinorUnits: srcBalanceAfterMinor,
      balanceAfterDisplay: formatCurrency(srcBalanceAfterMinor, currency)
    }
  })
}
