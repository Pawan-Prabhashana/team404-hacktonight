/**
 * Invisible Savings Service — Phase 9.
 *
 * Processes partner card purchases, captures a LKR 20–50 round-up per
 * transaction, and accumulates it for a monthly sweep into the savings account.
 *
 * Security guarantees (mirrors Phase 6/7 engines):
 *   - userId always comes from the session, never the request body.
 *   - Source and destination accounts are locked with FOR UPDATE.
 *   - Ownership is verified inside the lock.
 *   - Frozen accounts and insufficient funds are rejected atomically.
 *   - Idempotency key prevents double-submit.
 *   - Savings account is NOT credited during purchase; only during month-end sweep.
 *   - All writes roll back on any error — no partial state.
 */
import type { PoolClient } from 'pg'
import { writeAuditLog } from '@/lib/audit'
import { withTransaction } from '@/lib/db'
import { formatCurrency } from '@/lib/money'
import {
  AccountFrozenError,
  AccountNotFoundError,
  BankingError
} from '@/server/errors/banking-errors'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AccountRow = {
  id: number
  user_id: number
  account_number: string
  balance: string
  status: string
}

export type PartnerPurchaseReceipt = {
  reference: string
  partnerName: string
  purchaseAmountMinorUnits: number
  purchaseAmountDisplay: string
  roundupAmountMinorUnits: number
  roundupAmountDisplay: string
  totalDebitMinorUnits: number
  totalDebitDisplay: string
  monthKey: string
  status: 'accumulated'
  sourceAccountId: number
  destinationAccountId: number
  balanceAfterDisplay: string
  createdAt: string
}

export type InvisibleSavingsSweepReceipt = {
  monthKey: string
  amountMinorUnits: number
  amountDisplay: string
  status: 'completed' | 'no_op'
  transactionId?: number
  destinationAccountId: number
  message: string
}

// ---------------------------------------------------------------------------
// Round-up calculation
// ---------------------------------------------------------------------------

/**
 * Round up a purchase to the next LKR 100 boundary, then clamp to [min, max].
 *
 * Examples (minor units, LKR × 100):
 *   48000 (LKR 480) → next 100 = 50000 → diff 2000 → in [2000,5000] → 2000
 *   45500 (LKR 455) → next 100 = 50000 → diff 4500 → in [2000,5000] → 4500
 *   49900 (LKR 499) → next 100 = 50000 → diff 100  → < 2000 min    → 2000
 *   40100 (LKR 401) → next 100 = 50000 → diff 9900 → > 5000 max    → 5000
 */
export function calculateInvisibleRoundup(input: {
  purchaseAmountMinorUnits: number
  minRoundupMinorUnits: number
  maxRoundupMinorUnits: number
}): number {
  const {
    purchaseAmountMinorUnits,
    minRoundupMinorUnits,
    maxRoundupMinorUnits
  } = input
  // Round up to the next LKR 100 boundary (10000 minor units)
  const base = 10000
  const nextRound = (Math.floor(purchaseAmountMinorUnits / base) + 1) * base
  let roundup = nextRound - purchaseAmountMinorUnits
  if (roundup < minRoundupMinorUnits) roundup = minRoundupMinorUnits
  if (roundup > maxRoundupMinorUnits) roundup = maxRoundupMinorUnits
  return roundup
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
  return `SRB-SAVE-${date}-${rand}`
}

function currentMonthKey(): string {
  const now = new Date()
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

function balanceToMinor(balance: string): number {
  return Math.round(Number(balance) * 100)
}

async function lockAccount(
  client: PoolClient,
  accountId: number
): Promise<AccountRow | null> {
  const r = await client.query<AccountRow>(
    `SELECT id, user_id, account_number, balance, status
     FROM accounts WHERE id = $1 FOR UPDATE`,
    [accountId]
  )
  return r.rows[0] ?? null
}

// ---------------------------------------------------------------------------
// Partner purchase
// ---------------------------------------------------------------------------

export async function processPartnerPurchase(input: {
  userId: number
  partnerMerchantId: number
  sourceAccountId: number
  purchaseAmountMinorUnits: number
  currency: string
  description?: string
  idempotencyKey?: string
  ipAddress?: string | null
  userAgent?: string | null
}): Promise<PartnerPurchaseReceipt> {
  const {
    userId,
    partnerMerchantId,
    sourceAccountId,
    purchaseAmountMinorUnits,
    currency,
    description,
    idempotencyKey,
    ipAddress = null,
    userAgent = null
  } = input

  return withTransaction(async (client) => {
    // ── 1. Idempotency check ─────────────────────────────────────────────
    if (idempotencyKey) {
      const existing = await client.query<{
        id: number
        purchase_amount_minor_units: string
        roundup_amount_minor_units: string
        total_debit_minor_units: string
        source_account_id: number
        destination_account_id: number
        month_key: string
        currency: string
        created_at: string
        partner_name: string
        purchase_transaction_id: number | null
      }>(
        `SELECT e.id, e.purchase_amount_minor_units, e.roundup_amount_minor_units,
                e.total_debit_minor_units, e.source_account_id, e.destination_account_id,
                e.month_key, e.currency, e.created_at, e.purchase_transaction_id,
                pm.name AS partner_name
         FROM invisible_savings_events e
         JOIN partner_merchants pm ON pm.id = e.partner_merchant_id
         WHERE e.user_id = $1 AND e.idempotency_key = $2
         LIMIT 1`,
        [userId, idempotencyKey]
      )
      if (existing.rows[0]) {
        const ev = existing.rows[0]
        const acct = await client.query<{ balance: string }>(
          'SELECT balance FROM accounts WHERE id = $1',
          [ev.source_account_id]
        )
        const balanceAfterMinor = balanceToMinor(acct.rows[0]?.balance ?? '0')
        const pu = Number(ev.purchase_amount_minor_units)
        const ru = Number(ev.roundup_amount_minor_units)
        const td = Number(ev.total_debit_minor_units)
        return {
          reference: `SRB-SAVE-IDEM-${ev.id}`,
          partnerName: ev.partner_name,
          purchaseAmountMinorUnits: pu,
          purchaseAmountDisplay: formatCurrency(pu, ev.currency),
          roundupAmountMinorUnits: ru,
          roundupAmountDisplay: formatCurrency(ru, ev.currency),
          totalDebitMinorUnits: td,
          totalDebitDisplay: formatCurrency(td, ev.currency),
          monthKey: ev.month_key,
          status: 'accumulated',
          sourceAccountId: ev.source_account_id,
          destinationAccountId: ev.destination_account_id,
          balanceAfterDisplay: formatCurrency(balanceAfterMinor, ev.currency),
          createdAt: String(ev.created_at)
        }
      }
    }

    // ── 2. Load user invisible savings settings ───────────────────────────
    const settingsRes = await client.query<{
      source_account_id: number
      destination_account_id: number
      enabled: boolean
      min_roundup_minor_units: string
      max_roundup_minor_units: string
    }>(
      `SELECT source_account_id, destination_account_id, enabled,
              min_roundup_minor_units, max_roundup_minor_units
       FROM invisible_savings_settings WHERE user_id = $1 LIMIT 1`,
      [userId]
    )
    const settings = settingsRes.rows[0]
    if (!settings || !settings.enabled) {
      throw new BankingError(
        'Invisible Savings is not enabled for this account.',
        400,
        'INVISIBLE_SAVINGS_DISABLED'
      )
    }
    const destAccountId = settings.destination_account_id
    const minRoundup = Number(settings.min_roundup_minor_units)
    const maxRoundup = Number(settings.max_roundup_minor_units)

    // ── 3. Verify partner merchant ────────────────────────────────────────
    const merchantRes = await client.query<{
      id: number
      name: string
      status: string
    }>(
      `SELECT id, name, status FROM partner_merchants
       WHERE id = $1 AND status = 'active' LIMIT 1`,
      [partnerMerchantId]
    )
    const merchant = merchantRes.rows[0]
    if (!merchant) {
      throw new BankingError(
        'Partner merchant not found or inactive.',
        404,
        'MERCHANT_NOT_FOUND'
      )
    }

    // ── 4. Lock source account ────────────────────────────────────────────
    const src = await lockAccount(client, sourceAccountId)
    if (!src || src.user_id !== userId) throw new AccountNotFoundError()
    if (src.status !== 'active') throw new AccountFrozenError()

    // ── 5. Lock destination savings account ───────────────────────────────
    const dst = await lockAccount(client, destAccountId)
    if (!dst || dst.user_id !== userId) throw new AccountNotFoundError()
    if (dst.status !== 'active') throw new AccountFrozenError()

    if (sourceAccountId === destAccountId) {
      throw new BankingError(
        'Source and destination accounts must differ.',
        400,
        'SAME_ACCOUNT'
      )
    }

    // ── 6. Calculate round-up ─────────────────────────────────────────────
    const roundupMinorUnits = calculateInvisibleRoundup({
      purchaseAmountMinorUnits,
      minRoundupMinorUnits: minRoundup,
      maxRoundupMinorUnits: maxRoundup
    })
    const totalDebitMinorUnits = purchaseAmountMinorUnits + roundupMinorUnits
    const totalDebitDecimal = totalDebitMinorUnits / 100

    // ── 7. Check sufficient funds (purchase + round-up) ───────────────────
    const srcBalanceBefore = balanceToMinor(src.balance)
    if (srcBalanceBefore < totalDebitMinorUnits) {
      throw new BankingError(
        `Insufficient funds. Available: ${formatCurrency(srcBalanceBefore, currency)}.`,
        400,
        'INSUFFICIENT_FUNDS'
      )
    }

    // ── 8. Currency guard ─────────────────────────────────────────────────
    if (currency !== 'LKR') {
      throw new BankingError(
        'Only LKR is supported for Invisible Savings.',
        400,
        'CURRENCY_MISMATCH'
      )
    }

    // ── 9. Generate reference ─────────────────────────────────────────────
    const reference = generateReference()
    const monthKey = currentMonthKey()
    const txDescription = description ?? `Partner purchase at ${merchant.name}`

    // ── 10. Create purchase transaction (card_purchase, debit) ────────────
    const txRes = await client.query<{ id: number; created_at: string }>(
      `INSERT INTO transactions
         (from_account, to_account, amount, description, status, created_by,
          idempotency_key, reference, type, category_slug)
       VALUES ($1, $2, $3, $4, 'SUCCESS', $5, $6, $7, 'card_purchase', 'dining')
       RETURNING id, created_at`,
      [
        src.account_number,
        merchant.name,
        totalDebitDecimal,
        txDescription,
        userId,
        idempotencyKey ? `save:${idempotencyKey}` : null,
        reference
      ]
    )
    const txId = txRes.rows[0].id
    const createdAt = String(txRes.rows[0].created_at)

    // ── 11. Deduct total debit from source account ────────────────────────
    const srcAfterRes = await client.query<{ balance: string }>(
      `UPDATE accounts SET balance = balance - $1, updated_at = NOW()
       WHERE id = $2 RETURNING balance`,
      [totalDebitDecimal, sourceAccountId]
    )
    const balanceAfterMinor = balanceToMinor(
      srcAfterRes.rows[0]?.balance ?? '0'
    )

    // ── 12. Ledger entry for source debit ─────────────────────────────────
    await client.query(
      `INSERT INTO ledger_entries
         (transaction_id, account_id, entry_type, amount_minor_units, balance_after_minor_units)
       VALUES ($1, $2, 'debit', $3, $4)`,
      [txId, sourceAccountId, totalDebitMinorUnits, balanceAfterMinor]
    )

    // ── 13. Create invisible savings event row ────────────────────────────
    const evRes = await client.query<{ id: number }>(
      `INSERT INTO invisible_savings_events
         (user_id, partner_merchant_id, source_account_id, destination_account_id,
          purchase_transaction_id, purchase_amount_minor_units,
          roundup_amount_minor_units, total_debit_minor_units,
          currency, status, month_key, idempotency_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'accumulated', $10, $11)
       RETURNING id`,
      [
        userId,
        partnerMerchantId,
        sourceAccountId,
        destAccountId,
        txId,
        purchaseAmountMinorUnits,
        roundupMinorUnits,
        totalDebitMinorUnits,
        currency,
        monthKey,
        idempotencyKey ?? null
      ]
    )
    const eventId = evRes.rows[0].id

    // ── 14. Audit log ──────────────────────────────────────────────────────
    await writeAuditLog({
      userId: String(userId),
      action: 'INVISIBLE_SAVINGS_CAPTURED',
      entityType: 'invisible_savings_event',
      entityId: String(eventId),
      metadata: {
        reference,
        merchantName: merchant.name,
        purchaseAmountMinorUnits,
        roundupAmountMinorUnits: roundupMinorUnits,
        totalDebitMinorUnits,
        monthKey
      },
      ipAddress,
      userAgent
    })

    // ── 15. Notification (best-effort) ────────────────────────────────────
    await client
      .query(
        `INSERT INTO notifications (user_id, type, title, message)
         VALUES ($1, 'info', $2, $3)`,
        [
          userId,
          'Invisible Savings captured',
          `${formatCurrency(roundupMinorUnits, currency)} saved from your ${merchant.name} purchase. Monthly total growing.`
        ]
      )
      .catch(() => {})

    return {
      reference,
      partnerName: merchant.name,
      purchaseAmountMinorUnits,
      purchaseAmountDisplay: formatCurrency(purchaseAmountMinorUnits, currency),
      roundupAmountMinorUnits: roundupMinorUnits,
      roundupAmountDisplay: formatCurrency(roundupMinorUnits, currency),
      totalDebitMinorUnits,
      totalDebitDisplay: formatCurrency(totalDebitMinorUnits, currency),
      monthKey,
      status: 'accumulated',
      sourceAccountId,
      destinationAccountId: destAccountId,
      balanceAfterDisplay: formatCurrency(balanceAfterMinor, currency),
      createdAt
    }
  })
}

// ---------------------------------------------------------------------------
// Monthly sweep
// ---------------------------------------------------------------------------

export async function sweepInvisibleSavingsForMonth(input: {
  userId: number
  monthKey?: string
}): Promise<InvisibleSavingsSweepReceipt> {
  const monthKey = input.monthKey ?? currentMonthKey()

  return withTransaction(async (client) => {
    // ── 1. Load settings ──────────────────────────────────────────────────
    const settingsRes = await client.query<{
      destination_account_id: number
      source_account_id: number
    }>(
      `SELECT destination_account_id, source_account_id
       FROM invisible_savings_settings WHERE user_id = $1 FOR UPDATE`,
      [input.userId]
    )
    const settings = settingsRes.rows[0]
    if (!settings) {
      throw new BankingError(
        'Invisible Savings settings not found.',
        404,
        'SETTINGS_NOT_FOUND'
      )
    }
    const { destination_account_id: destId, source_account_id: srcId } =
      settings

    // ── 2. Check if already swept ─────────────────────────────────────────
    const dupCheck = await client.query<{ id: number }>(
      `SELECT id FROM invisible_savings_sweeps
       WHERE user_id = $1 AND month_key = $2 LIMIT 1`,
      [input.userId, monthKey]
    )
    if (dupCheck.rows[0]) {
      return {
        monthKey,
        amountMinorUnits: 0,
        amountDisplay: 'LKR 0.00',
        status: 'no_op',
        destinationAccountId: destId,
        message: `Savings for ${monthKey} have already been swept.`
      }
    }

    // ── 3. Sum accumulated events ─────────────────────────────────────────
    const sumRes = await client.query<{ total: string; count: string }>(
      `SELECT COALESCE(SUM(roundup_amount_minor_units),0) AS total, COUNT(*) AS count
       FROM invisible_savings_events
       WHERE user_id = $1 AND month_key = $2 AND status = 'accumulated'`,
      [input.userId, monthKey]
    )
    const totalMinor = Number(sumRes.rows[0]?.total ?? 0)

    if (totalMinor === 0) {
      return {
        monthKey,
        amountMinorUnits: 0,
        amountDisplay: 'LKR 0.00',
        status: 'no_op',
        destinationAccountId: destId,
        message: `No accumulated savings found for ${monthKey}.`
      }
    }

    // ── 4. Lock destination savings account ───────────────────────────────
    const dst = await lockAccount(client, destId)
    if (!dst || dst.user_id !== input.userId) throw new AccountNotFoundError()

    const totalDecimal = totalMinor / 100
    const balanceAfterDstMinor = balanceToMinor(dst.balance) + totalMinor

    // ── 5. Create sweep transaction (credit, invisible_savings_sweep) ─────
    const reference = generateReference().replace('SRB-SAVE-', 'SRB-SWEP-')
    const txRes = await client.query<{ id: number; created_at: string }>(
      `INSERT INTO transactions
         (from_account, to_account, amount, description, status, created_by,
          reference, type)
       VALUES ($1, $2, $3, 'Invisible Savings monthly sweep', 'SUCCESS', $4, $5, 'invisible_savings_sweep')
       RETURNING id, created_at`,
      [
        'INVISIBLE_SAVINGS_POOL',
        dst.account_number,
        totalDecimal,
        input.userId,
        reference
      ]
    )
    const txId = txRes.rows[0].id

    // ── 6. Credit destination savings account ─────────────────────────────
    await client.query(
      `UPDATE accounts SET balance = balance + $1, updated_at = NOW()
       WHERE id = $2`,
      [totalDecimal, destId]
    )

    // ── 7. Ledger credit entry ────────────────────────────────────────────
    await client.query(
      `INSERT INTO ledger_entries
         (transaction_id, account_id, entry_type, amount_minor_units, balance_after_minor_units)
       VALUES ($1, $2, 'credit', $3, $4)`,
      [txId, destId, totalMinor, balanceAfterDstMinor]
    )

    // ── 8. Mark events as swept ───────────────────────────────────────────
    await client.query(
      `UPDATE invisible_savings_events
       SET status = 'swept'
       WHERE user_id = $1 AND month_key = $2 AND status = 'accumulated'`,
      [input.userId, monthKey]
    )

    // ── 9. Create sweep record ────────────────────────────────────────────
    await client.query(
      `INSERT INTO invisible_savings_sweeps
         (user_id, source_account_id, destination_account_id, month_key,
          amount_minor_units, status, transaction_id)
       VALUES ($1, $2, $3, $4, $5, 'completed', $6)`,
      [input.userId, srcId, destId, monthKey, totalMinor, txId]
    )

    // ── 10. Audit log ─────────────────────────────────────────────────────
    await writeAuditLog({
      userId: String(input.userId),
      action: 'INVISIBLE_SAVINGS_SWEPT',
      entityType: 'invisible_savings_sweep',
      entityId: String(txId),
      metadata: { monthKey, totalMinor, reference }
    })

    // ── 11. Notification ──────────────────────────────────────────────────
    await client
      .query(
        `INSERT INTO notifications (user_id, type, title, message)
         VALUES ($1, 'success', $2, $3)`,
        [
          input.userId,
          'Monthly Invisible Savings swept',
          `${formatCurrency(totalMinor, 'LKR')} from ${monthKey} has been moved into your Savings account.`
        ]
      )
      .catch(() => {})

    return {
      monthKey,
      amountMinorUnits: totalMinor,
      amountDisplay: formatCurrency(totalMinor, 'LKR'),
      status: 'completed',
      transactionId: txId,
      destinationAccountId: destId,
      message: `Successfully swept ${formatCurrency(totalMinor, 'LKR')} into your Savings account.`
    }
  })
}
