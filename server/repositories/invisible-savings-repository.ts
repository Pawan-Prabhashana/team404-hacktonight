/**
 * Invisible Savings repository — Phase 9.
 *
 * All queries are scoped by user_id. Uses parameterized SQL only.
 */

import { query } from '@/lib/db'
import { formatCurrency } from '@/lib/money'
import { ensureDatabase } from '@/lib/platform-db'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SettingsRow = {
  id: number
  user_id: number
  source_account_id: number
  destination_account_id: number
  enabled: boolean
  min_roundup_minor_units: string
  max_roundup_minor_units: string
  sweep_day: number
  created_at: string
  updated_at: string
}

export type InvisibleSavingsSettings = {
  id: number
  userId: number
  sourceAccountId: number
  destinationAccountId: number
  enabled: boolean
  minRoundupMinorUnits: number
  maxRoundupMinorUnits: number
  sweepDay: number
}

type EventRow = {
  id: number
  user_id: number
  partner_merchant_id: number
  partner_name: string
  source_account_id: number
  destination_account_id: number
  purchase_transaction_id: number | null
  purchase_amount_minor_units: string
  roundup_amount_minor_units: string
  total_debit_minor_units: string
  currency: string
  status: string
  month_key: string
  created_at: string
}

export type SafeInvisibleSavingsEvent = {
  id: number
  partnerMerchantId: number
  partnerName: string
  purchaseAmountMinorUnits: number
  purchaseAmountDisplay: string
  roundupAmountMinorUnits: number
  roundupAmountDisplay: string
  totalDebitMinorUnits: number
  currency: string
  status: string
  monthKey: string
  createdAt: string
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

function toSettings(row: SettingsRow): InvisibleSavingsSettings {
  return {
    id: row.id,
    userId: row.user_id,
    sourceAccountId: row.source_account_id,
    destinationAccountId: row.destination_account_id,
    enabled: row.enabled,
    minRoundupMinorUnits: Number(row.min_roundup_minor_units),
    maxRoundupMinorUnits: Number(row.max_roundup_minor_units),
    sweepDay: row.sweep_day
  }
}

export async function getInvisibleSavingsSettings(
  userId: number
): Promise<InvisibleSavingsSettings | null> {
  await ensureDatabase()
  const r = await query<SettingsRow>(
    `SELECT id, user_id, source_account_id, destination_account_id, enabled,
            min_roundup_minor_units, max_roundup_minor_units, sweep_day,
            created_at, updated_at
     FROM invisible_savings_settings
     WHERE user_id = $1
     LIMIT 1`,
    [userId]
  )
  return r.rows[0] ? toSettings(r.rows[0]) : null
}

export async function upsertInvisibleSavingsSettings(input: {
  userId: number
  sourceAccountId: number
  destinationAccountId: number
  enabled: boolean
  minRoundupMinorUnits: number
  maxRoundupMinorUnits: number
  sweepDay: number
}): Promise<InvisibleSavingsSettings> {
  await ensureDatabase()
  const r = await query<SettingsRow>(
    `INSERT INTO invisible_savings_settings
       (user_id, source_account_id, destination_account_id, enabled,
        min_roundup_minor_units, max_roundup_minor_units, sweep_day)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (user_id) DO UPDATE SET
       source_account_id       = EXCLUDED.source_account_id,
       destination_account_id  = EXCLUDED.destination_account_id,
       enabled                 = EXCLUDED.enabled,
       min_roundup_minor_units = EXCLUDED.min_roundup_minor_units,
       max_roundup_minor_units = EXCLUDED.max_roundup_minor_units,
       sweep_day               = EXCLUDED.sweep_day,
       updated_at              = NOW()
     RETURNING *`,
    [
      input.userId,
      input.sourceAccountId,
      input.destinationAccountId,
      input.enabled,
      input.minRoundupMinorUnits,
      input.maxRoundupMinorUnits,
      input.sweepDay
    ]
  )
  return toSettings(r.rows[0])
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

function toEvent(row: EventRow): SafeInvisibleSavingsEvent {
  const pu = Number(row.purchase_amount_minor_units)
  const ru = Number(row.roundup_amount_minor_units)
  return {
    id: row.id,
    partnerMerchantId: row.partner_merchant_id,
    partnerName: row.partner_name,
    purchaseAmountMinorUnits: pu,
    purchaseAmountDisplay: formatCurrency(pu, row.currency),
    roundupAmountMinorUnits: ru,
    roundupAmountDisplay: formatCurrency(ru, row.currency),
    totalDebitMinorUnits: Number(row.total_debit_minor_units),
    currency: row.currency,
    status: row.status,
    monthKey: row.month_key,
    createdAt: String(row.created_at)
  }
}

export async function listInvisibleSavingsEvents(input: {
  userId: number
  monthKey?: string
  limit?: number
  offset?: number
}): Promise<SafeInvisibleSavingsEvent[]> {
  await ensureDatabase()
  const params: unknown[] = [input.userId]
  const clauses: string[] = ['e.user_id = $1']
  if (input.monthKey) {
    params.push(input.monthKey)
    clauses.push(`e.month_key = $${params.length}`)
  }
  const limit = input.limit ?? 20
  const offset = input.offset ?? 0
  params.push(limit, offset)
  const r = await query<EventRow>(
    `SELECT e.id, e.user_id, e.partner_merchant_id, pm.name AS partner_name,
            e.source_account_id, e.destination_account_id,
            e.purchase_transaction_id,
            e.purchase_amount_minor_units, e.roundup_amount_minor_units,
            e.total_debit_minor_units, e.currency, e.status,
            e.month_key, e.created_at
     FROM invisible_savings_events e
     JOIN partner_merchants pm ON pm.id = e.partner_merchant_id
     WHERE ${clauses.join(' AND ')}
     ORDER BY e.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  )
  return r.rows.map(toEvent)
}

export async function getInvisibleSavingsSummary(input: {
  userId: number
  monthKey?: string
}): Promise<{
  monthKey: string
  capturedMinorUnits: number
  eventCount: number
  averageRoundupMinorUnits: number
  topPartner: string | null
}> {
  await ensureDatabase()
  const mk =
    input.monthKey ??
    (() => {
      const now = new Date()
      return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
    })()

  const r = await query<{
    total: string
    count: string
    avg_roundup: string
    top_partner: string | null
  }>(
    `SELECT
       COALESCE(SUM(roundup_amount_minor_units), 0) AS total,
       COUNT(*)                                      AS count,
       COALESCE(AVG(roundup_amount_minor_units), 0) AS avg_roundup,
       (SELECT pm2.name
        FROM invisible_savings_events e2
        JOIN partner_merchants pm2 ON pm2.id = e2.partner_merchant_id
        WHERE e2.user_id = $1 AND e2.month_key = $2 AND e2.status = 'accumulated'
        GROUP BY pm2.name ORDER BY COUNT(*) DESC LIMIT 1) AS top_partner
     FROM invisible_savings_events e
     WHERE e.user_id = $1 AND e.month_key = $2 AND e.status = 'accumulated'`,
    [input.userId, mk]
  )
  const row = r.rows[0]
  return {
    monthKey: mk,
    capturedMinorUnits: Number(row?.total ?? 0),
    eventCount: Number(row?.count ?? 0),
    averageRoundupMinorUnits: Math.round(Number(row?.avg_roundup ?? 0)),
    topPartner: row?.top_partner ?? null
  }
}
