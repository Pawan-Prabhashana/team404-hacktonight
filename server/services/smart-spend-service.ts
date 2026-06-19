/**
 * Smart Spend analytics service — Phase 8.
 *
 * All computation is deterministic and rule-based.
 * This is not financial advice — it is an informational analytics preview.
 */
import { formatCurrency } from '@/lib/money'
import { categorizeTransaction } from '@/server/services/categorization-service'
import {
  listBudgetsForUser,
  listUserAccountsForAnalytics,
  listUserBillPaymentsForAnalytics,
  listUserTransactionsForAnalytics,
} from '@/server/repositories/smart-spend-repository'

// ── Public types ───────────────────────────────────────────────────────────

export type CategoryBreakdownItem = {
  slug:                 string
  name:                 string
  color:                string
  amountMinorUnits:     number
  amountDisplay:        string
  percentage:           number
  budgetMinorUnits?:    number
  budgetDisplay?:       string
  budgetUsedPct?:       number
  status:               'safe' | 'watch' | 'over'
}

export type SpendInsight = {
  type:    'positive' | 'warning' | 'tip' | 'info'
  title:   string
  message: string
}

export type RecurringItem = {
  key:                      string
  name:                     string
  averageAmountMinorUnits:  number
  averageAmountDisplay:     string
  nextExpectedDate?:        string
  confidence:               number
}

export type SmartSpendSummary = {
  range: { from: string; to: string }
  metrics: {
    financialHealthScore:          number
    monthlySpendMinorUnits:        number
    monthlySpendDisplay:           string
    savingsPotentialMinorUnits:    number
    savingsPotentialDisplay:       string
    averageDailySpendMinorUnits:   number
    averageDailySpendDisplay:      string
    incomeMinorUnits:              number
    incomeDisplay:                 string
    debitMinorUnits:               number
    debitDisplay:                  string
    creditMinorUnits:              number
    creditDisplay:                 string
  }
  categories:  CategoryBreakdownItem[]
  insights:    SpendInsight[]
  recurring:   RecurringItem[]
  forecast: {
    projectedMonthEndBalanceMinorUnits: number
    projectedMonthEndBalanceDisplay:    string
    confidence:                         number
    warning?:                           string
  }
}

// ── Date helpers ───────────────────────────────────────────────────────────

function monthBounds(): { from: string; to: string } {
  const now   = new Date()
  const from  = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const to    = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()
  return { from, to }
}

function daysInMonth(): number {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
}

function dayOfMonth(): number {
  return new Date().getDate()
}

// ── Category meta (local map — avoids extra DB call) ──────────────────────

const CAT_META: Record<string, { name: string; color: string }> = {
  groceries:     { name: 'Groceries',     color: '#22c55e' },
  utilities:     { name: 'Utilities',     color: '#3b82f6' },
  dining:        { name: 'Dining',        color: '#f97316' },
  transport:     { name: 'Transport',     color: '#8b5cf6' },
  shopping:      { name: 'Shopping',      color: '#ec4899' },
  subscriptions: { name: 'Subscriptions', color: '#6366f1' },
  salary:        { name: 'Salary',        color: '#10b981' },
  transfers:     { name: 'Transfers',     color: '#64748b' },
  bills:         { name: 'Bills',         color: '#f59e0b' },
  education:     { name: 'Education',     color: '#0ea5e9' },
  insurance:     { name: 'Insurance',     color: '#14b8a6' },
  travel:        { name: 'Travel',        color: '#f43f5e' },
  other:         { name: 'Other',         color: '#9ca3af' },
}

// ── Recurring detection ────────────────────────────────────────────────────

function detectRecurring(
  transactions: Array<{ description: string; amountMinor: number; createdAt: string; type: string }>,
  billPayments: Array<{ billerName: string; amountMinor: number; createdAt: string }>,
): RecurringItem[] {
  // Normalise description to a short key
  const norm = (s: string) =>
    s.toLowerCase()
      .replace(/\d+/g, '') // strip numbers
      .replace(/[^a-z ]/g, ' ')
      .trim()
      .split(/\s+/)
      .slice(0, 3)
      .join(' ')

  const groups: Map<string, { amounts: number[]; dates: string[] }> = new Map()

  for (const t of transactions) {
    const key = norm(t.description)
    if (!key) continue
    const g = groups.get(key) ?? { amounts: [], dates: [] }
    g.amounts.push(t.amountMinor)
    g.dates.push(t.createdAt)
    groups.set(key, g)
  }

  // Bill payments are inherently recurring
  for (const bp of billPayments) {
    const key = `bill:${norm(bp.billerName)}`
    const g = groups.get(key) ?? { amounts: [], dates: [] }
    g.amounts.push(bp.amountMinor)
    g.dates.push(bp.createdAt)
    groups.set(key, g)
  }

  const result: RecurringItem[] = []
  for (const [key, g] of groups.entries()) {
    if (g.amounts.length < 1) continue
    if (g.amounts.length === 1 && !key.startsWith('bill:')) continue

    const avg = Math.round(g.amounts.reduce((a, b) => a + b, 0) / g.amounts.length)
    const confidence = key.startsWith('bill:') ? 0.95 : Math.min(0.5 + g.amounts.length * 0.15, 0.9)

    // Estimate next occurrence ~ 30 days after last payment
    const lastDate = g.dates.sort().at(-1)
    let nextDate: string | undefined
    if (lastDate) {
      const d = new Date(lastDate)
      d.setDate(d.getDate() + 30)
      nextDate = d.toISOString().slice(0, 10)
    }

    result.push({
      key,
      name:                    key.replace('bill:', '').replace(/ /g, ' ').trim(),
      averageAmountMinorUnits: avg,
      averageAmountDisplay:    formatCurrency(avg),
      nextExpectedDate:        nextDate,
      confidence,
    })
  }

  return result.sort((a, b) => b.confidence - a.confidence).slice(0, 10)
}

// ── Financial health score ─────────────────────────────────────────────────

function computeHealthScore(params: {
  totalDebit:       number
  totalCredit:      number
  categoriesOver:   number
  categoriesWatch:  number
  avgDailySpend:    number
  budgetDailyLimit: number
  recurringCount:   number
}): number {
  let score = 70

  if (params.totalCredit > params.totalDebit) score += 10
  else if (params.totalDebit > params.totalCredit) score -= 10

  const allBudgetsSafe = params.categoriesOver === 0 && params.categoriesWatch === 0
  if (allBudgetsSafe) score += 10
  else if (params.categoriesOver === 0) score += 5

  if (params.categoriesOver > 2) score -= 10
  else if (params.categoriesOver > 0) score -= 5

  if (params.recurringCount >= 2) score += 5

  if (params.budgetDailyLimit > 0 && params.avgDailySpend > params.budgetDailyLimit) score -= 5

  return Math.max(0, Math.min(100, score))
}

// ── Main analytics function ────────────────────────────────────────────────

export async function getSmartSpendSummary(input: {
  userId:     number
  from?:      string
  to?:        string
  accountId?: number
}): Promise<SmartSpendSummary> {
  const bounds    = monthBounds()
  const from      = input.from ?? bounds.from
  const to        = input.to   ?? bounds.to
  const { userId, accountId } = input

  // Load data in parallel
  const [transactions, billPayments, budgets, accounts] = await Promise.all([
    listUserTransactionsForAnalytics({ userId, from, to, accountId }),
    listUserBillPaymentsForAnalytics({ userId, from, to, accountId }),
    listBudgetsForUser(userId),
    listUserAccountsForAnalytics(userId),
  ])

  // ── Totals ───────────────────────────────────────────────────────────────
  let totalDebit  = 0
  let totalCredit = 0

  for (const t of transactions) {
    if (t.isInternal) continue  // skip own-to-own transfers
    if (t.isDebit)  totalDebit  += t.amountMinor
    if (t.isCredit) totalCredit += t.amountMinor
  }

  // Bill payments are always debit spending
  for (const bp of billPayments) {
    totalDebit += bp.amountMinor
  }

  // ── Category breakdown ───────────────────────────────────────────────────
  const catMap: Map<string, number> = new Map()

  for (const t of transactions) {
    if (t.isInternal || t.isCredit) continue  // only count debits as spending

    const { categorySlug } = t.categorySlug
      ? { categorySlug: t.categorySlug }
      : categorizeTransaction({
          type:        t.type,
          description: t.description,
          isCredit:    false,
        })

    catMap.set(categorySlug, (catMap.get(categorySlug) ?? 0) + t.amountMinor)
  }

  for (const bp of billPayments) {
    const { categorySlug } = categorizeTransaction({
      type:           'bill_payment',
      billerCategory: bp.billerCategory,
      description:    bp.billerName,
    })
    catMap.set(categorySlug, (catMap.get(categorySlug) ?? 0) + bp.amountMinor)
  }

  // Monthly spend = sum of all spending categories
  const monthlySpend = Array.from(catMap.values()).reduce((a, b) => a + b, 0)

  const budgetMap = new Map(budgets.map((b) => [b.categorySlug, b.amountMinorUnits]))

  const categories: CategoryBreakdownItem[] = Array.from(catMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([slug, amount]) => {
      const meta    = CAT_META[slug] ?? CAT_META.other
      const pct     = monthlySpend > 0 ? Math.round((amount / monthlySpend) * 100) : 0
      const budget  = budgetMap.get(slug)
      const usedPct = budget && budget > 0 ? Math.round((amount / budget) * 100) : undefined

      let status: 'safe' | 'watch' | 'over' = 'safe'
      if (usedPct !== undefined) {
        if (usedPct > 100)     status = 'over'
        else if (usedPct >= 75) status = 'watch'
      }

      return {
        slug,
        name:             meta.name,
        color:            meta.color,
        amountMinorUnits: amount,
        amountDisplay:    formatCurrency(amount),
        percentage:       pct,
        budgetMinorUnits: budget,
        budgetDisplay:    budget !== undefined ? formatCurrency(budget) : undefined,
        budgetUsedPct:    usedPct,
        status,
      }
    })

  // ── Savings potential ────────────────────────────────────────────────────
  let savingsPotential = 0
  let categoriesOver  = 0
  let categoriesWatch = 0
  for (const cat of categories) {
    if (cat.status === 'over' && cat.budgetMinorUnits) {
      savingsPotential += cat.amountMinorUnits - cat.budgetMinorUnits
      categoriesOver++
    }
    if (cat.status === 'watch') categoriesWatch++
  }
  // If no budgets set, estimate 10% of discretionary spend
  if (budgets.length === 0 && monthlySpend > 0) {
    savingsPotential = Math.round(monthlySpend * 0.10)
  }

  // ── Average daily spend ──────────────────────────────────────────────────
  const daysElapsed       = Math.max(dayOfMonth(), 1)
  const avgDailySpend     = Math.round(monthlySpend / daysElapsed)
  const totalBudget       = budgets.reduce((s, b) => s + b.amountMinorUnits, 0)
  const dailyBudgetLimit  = totalBudget > 0 ? Math.round(totalBudget / daysInMonth()) : 0

  // ── Health score ─────────────────────────────────────────────────────────
  const recurring = detectRecurring(
    transactions.filter((t) => t.isDebit),
    billPayments,
  )

  const healthScore = computeHealthScore({
    totalDebit,
    totalCredit,
    categoriesOver,
    categoriesWatch,
    avgDailySpend,
    budgetDailyLimit: dailyBudgetLimit,
    recurringCount:   recurring.length,
  })

  // ── Insights ─────────────────────────────────────────────────────────────
  const insights: SpendInsight[] = []

  if (totalCredit > totalDebit) {
    insights.push({
      type: 'positive',
      title: 'Spending under control',
      message: `Your income of ${formatCurrency(totalCredit)} exceeds spending by ${formatCurrency(totalCredit - totalDebit)}.`,
    })
  } else if (totalDebit > totalCredit && totalCredit > 0) {
    insights.push({
      type: 'warning',
      title: 'Spending exceeds income',
      message: `You have spent ${formatCurrency(totalDebit - totalCredit)} more than you earned this month.`,
    })
  }

  for (const cat of categories.filter((c) => c.status === 'over')) {
    insights.push({
      type: 'warning',
      title: `${cat.name} over budget`,
      message: `You have used ${cat.budgetUsedPct}% of your ${cat.name} budget. Consider reducing spending here.`,
    })
  }

  for (const cat of categories.filter((c) => c.status === 'watch')) {
    insights.push({
      type: 'info',
      title: `${cat.name} at ${cat.budgetUsedPct}%`,
      message: `Your ${cat.name} spending is approaching your budget limit.`,
    })
  }

  if (savingsPotential > 0 && categoriesOver > 0) {
    insights.push({
      type: 'tip',
      title: 'Savings opportunity',
      message: `Reducing over-budget categories could save you ${formatCurrency(savingsPotential)} this month.`,
    })
  }

  if (recurring.length > 0) {
    insights.push({
      type: 'info',
      title: `${recurring.length} recurring payment(s) detected`,
      message: `Regular charges detected: ${recurring.slice(0, 3).map((r) => r.name).join(', ')}.`,
    })
  }

  // ── Cashflow forecast ─────────────────────────────────────────────────────
  const totalBalance    = accounts.reduce((s, a) => s + a.balanceMinor, 0)
  const daysLeft        = daysInMonth() - dayOfMonth()
  const projectedSpend  = avgDailySpend * daysLeft

  // Add known upcoming recurring payments
  const upcomingRecurring = recurring.reduce((s, r) => s + r.averageAmountMinorUnits, 0)
  const projectedEndBalance = totalBalance - projectedSpend - upcomingRecurring

  let forecastWarning: string | undefined
  if (projectedEndBalance < 0) {
    forecastWarning = 'Your projected month-end balance is negative. Consider reducing discretionary spending.'
  } else if (projectedEndBalance < avgDailySpend * 7) {
    forecastWarning = 'Your projected month-end balance is low. Review upcoming recurring payments.'
  }

  const forecastConfidence = daysElapsed >= 5 ? 0.75 : 0.45

  return {
    range: { from, to },
    metrics: {
      financialHealthScore:         healthScore,
      monthlySpendMinorUnits:       monthlySpend,
      monthlySpendDisplay:          formatCurrency(monthlySpend),
      savingsPotentialMinorUnits:   savingsPotential,
      savingsPotentialDisplay:      formatCurrency(savingsPotential),
      averageDailySpendMinorUnits:  avgDailySpend,
      averageDailySpendDisplay:     formatCurrency(avgDailySpend),
      incomeMinorUnits:             totalCredit,
      incomeDisplay:                formatCurrency(totalCredit),
      debitMinorUnits:              totalDebit,
      debitDisplay:                 formatCurrency(totalDebit),
      creditMinorUnits:             totalCredit,
      creditDisplay:                formatCurrency(totalCredit),
    },
    categories,
    insights: insights.slice(0, 6),
    recurring,
    forecast: {
      projectedMonthEndBalanceMinorUnits: Math.max(0, projectedEndBalance),
      projectedMonthEndBalanceDisplay:    formatCurrency(Math.max(0, projectedEndBalance)),
      confidence:                         forecastConfidence,
      warning:                            forecastWarning,
    },
  }
}
