/**
 * Bill Radar — Phase 7 (rule-based "smart preview", not AI).
 *
 * Analyses the user's fetched bill payments locally and surfaces likely
 * recurring bills. This is intentionally simple, demo-only logic:
 *   1. Group payments by (billerId + billReference).
 *   2. A group with at least 2 payments is considered recurring.
 *   3. Estimate the average amount.
 *   4. Estimate the next due date as ~30 days after the latest payment.
 *   5. Flag a balance-impact warning when the selected account would drop low
 *      after paying all detected recurring bills.
 *
 * Nothing here claims to be AI — call it a "Bill Radar preview".
 */
import type { SafeBillPayment } from '@/lib/banking-client'

const RECURRENCE_DAYS = 30
const MS_PER_DAY = 24 * 60 * 60 * 1000

export type RecurringBill = {
  key: string
  billerId: number
  billerName: string
  billReference: string
  occurrences: number
  averageMinorUnits: number
  averageDisplay: string
  lastPaidAt: string
  nextDueEstimate: string
}

export type BillRadarResult = {
  recurring: RecurringBill[]
  totalMonthlyMinorUnits: number
  totalMonthlyDisplay: string
  lowBalanceWarning: boolean
}

function formatLKR(minorUnits: number): string {
  const decimal = (minorUnits / 100).toFixed(2)
  const [whole, cents] = decimal.split('.')
  return `LKR ${Number(whole).toLocaleString('en-US')}.${cents}`
}

function formatDueDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'soon'
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long'
  })
}

/**
 * Detect recurring bills from a list of bill payments and compute a balance
 * impact warning relative to the selected account balance (in minor units).
 */
export function analyzeBillRadar(
  payments: SafeBillPayment[],
  selectedAccountBalanceMinorUnits?: number
): BillRadarResult {
  const groups = new Map<string, SafeBillPayment[]>()

  for (const p of payments) {
    if (p.status !== 'completed') continue
    const key = `${p.billerId}::${p.billReference.trim().toLowerCase()}`
    const list = groups.get(key) ?? []
    list.push(p)
    groups.set(key, list)
  }

  const recurring: RecurringBill[] = []

  for (const [key, list] of groups) {
    if (list.length < 2) continue

    const sorted = [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    const latest = sorted[0]
    const total = sorted.reduce((s, p) => s + p.amountMinorUnits, 0)
    const averageMinorUnits = Math.round(total / sorted.length)

    const lastTime = new Date(latest.createdAt).getTime()
    const nextDueEstimate = new Date(
      lastTime + RECURRENCE_DAYS * MS_PER_DAY
    ).toISOString()

    recurring.push({
      key,
      billerId: latest.billerId,
      billerName: latest.billerName,
      billReference: latest.billReference,
      occurrences: sorted.length,
      averageMinorUnits,
      averageDisplay: formatLKR(averageMinorUnits),
      lastPaidAt: latest.createdAt,
      nextDueEstimate
    })
  }

  recurring.sort((a, b) => b.occurrences - a.occurrences)

  const totalMonthlyMinorUnits = recurring.reduce(
    (s, r) => s + r.averageMinorUnits,
    0
  )

  // Warn if paying all recurring bills would leave less than 10% of balance
  // (or push it negative). Only meaningful when a balance is provided.
  let lowBalanceWarning = false
  if (
    selectedAccountBalanceMinorUnits !== undefined &&
    totalMonthlyMinorUnits > 0
  ) {
    const remaining = selectedAccountBalanceMinorUnits - totalMonthlyMinorUnits
    lowBalanceWarning =
      remaining < 0 || remaining < selectedAccountBalanceMinorUnits * 0.1
  }

  return {
    recurring,
    totalMonthlyMinorUnits,
    totalMonthlyDisplay: formatLKR(totalMonthlyMinorUnits),
    lowBalanceWarning
  }
}

export { formatDueDate }
