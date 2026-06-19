/**
 * Financial Twin Simulator — Phase 8.
 *
 * Simulates what would happen to the user's finances if they made a purchase,
 * saved money, paid a bill, or made a transfer. Does NOT mutate any DB data.
 *
 * This is a preview/simulation tool, not financial advice.
 */
import { formatCurrency } from '@/lib/money'
import {
  listBudgetsForUser,
  listUserAccountsForAnalytics,
  listUserTransactionsForAnalytics
} from '@/server/repositories/smart-spend-repository'

export type FinancialTwinResult = {
  scenarioType: string
  amountDisplay: string
  currentBalanceDisplay: string
  projectedBalanceDisplay: string
  impactLevel: 'low' | 'medium' | 'high'
  warnings: string[]
  recommendations: string[]
}

function monthBounds(): { from: string; to: string } {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()
  return { from, to }
}

export async function simulateFinancialScenario(input: {
  userId: number
  scenarioType: 'purchase' | 'saving' | 'bill_payment' | 'transfer'
  amountMinorUnits: number
  categorySlug?: string
  accountId?: number
  description?: string
}): Promise<FinancialTwinResult> {
  const { userId, scenarioType, amountMinorUnits, categorySlug, accountId } =
    input

  // Load current state (read-only)
  const [accounts, budgets, monthTxns] = await Promise.all([
    listUserAccountsForAnalytics(userId),
    listBudgetsForUser(userId),
    listUserTransactionsForAnalytics({ userId, ...monthBounds() })
  ])

  // Verify account ownership if provided
  if (accountId !== undefined) {
    const owned = accounts.find((a) => a.id === accountId)
    if (!owned) {
      return {
        scenarioType,
        amountDisplay: formatCurrency(amountMinorUnits),
        currentBalanceDisplay: formatCurrency(0),
        projectedBalanceDisplay: formatCurrency(0),
        impactLevel: 'high',
        warnings: ['Account not found or not owned by you.'],
        recommendations: ['Use one of your active accounts.']
      }
    }
  }

  const totalBalanceMinor = accounts.reduce((s, a) => s + a.balanceMinor, 0)
  const targetAccount = accountId
    ? accounts.find((a) => a.id === accountId)
    : accounts[0]
  const accountBalance = targetAccount?.balanceMinor ?? totalBalanceMinor

  // Current month spend in the given category
  const categorySpend = monthTxns
    .filter((t) => t.isDebit && !t.isInternal)
    .reduce((s, t) => s + t.amountMinor, 0)

  const budget = categorySlug
    ? budgets.find((b) => b.categorySlug === categorySlug)
    : undefined

  const warnings: string[] = []
  const recommendations: string[] = []

  let projectedBalance = accountBalance

  if (
    scenarioType === 'purchase' ||
    scenarioType === 'bill_payment' ||
    scenarioType === 'transfer'
  ) {
    projectedBalance = accountBalance - amountMinorUnits

    if (projectedBalance < 0) {
      warnings.push(
        `This would overdraft your account by ${formatCurrency(Math.abs(projectedBalance))}.`
      )
      recommendations.push(
        'Choose a lower amount or use a different account with sufficient funds.'
      )
    } else if (projectedBalance < amountMinorUnits) {
      warnings.push(
        `After this, your account balance will be less than the transaction amount — consider if you can afford follow-on costs.`
      )
    }

    if (budget) {
      const newCategoryTotal = categorySpend + amountMinorUnits
      const usedPct = Math.round(
        (newCategoryTotal / budget.amountMinorUnits) * 100
      )
      if (usedPct > 100) {
        warnings.push(
          `This would put your ${categorySlug} spending at ${usedPct}% of your ${formatCurrency(budget.amountMinorUnits)} budget.`
        )
        recommendations.push(
          `You are already at ${Math.round((categorySpend / budget.amountMinorUnits) * 100)}% of your ${categorySlug} budget. Consider reducing this purchase.`
        )
      } else if (usedPct >= 80) {
        warnings.push(
          `After this you will be at ${usedPct}% of your ${categorySlug} budget.`
        )
      }
    }
  } else if (scenarioType === 'saving') {
    projectedBalance = accountBalance - amountMinorUnits
    if (projectedBalance < 0) {
      warnings.push(
        `You don't have enough balance to save ${formatCurrency(amountMinorUnits)}.`
      )
    } else {
      recommendations.push(
        `Saving ${formatCurrency(amountMinorUnits)} would boost your financial health score.`
      )
    }
  }

  const balanceDrop = accountBalance - projectedBalance
  const balanceDropPct =
    accountBalance > 0 ? (balanceDrop / accountBalance) * 100 : 100

  let impactLevel: 'low' | 'medium' | 'high' = 'low'
  if (balanceDropPct > 30 || projectedBalance < 0) impactLevel = 'high'
  else if (balanceDropPct > 10) impactLevel = 'medium'

  if (
    projectedBalance >= 0 &&
    projectedBalance < amountMinorUnits * 2 &&
    scenarioType !== 'saving'
  ) {
    recommendations.push(
      'Consider delaying this purchase until your next income cycle.'
    )
  }

  if (warnings.length === 0 && impactLevel === 'low') {
    recommendations.push(
      'This transaction appears affordable based on your current balance.'
    )
  }

  return {
    scenarioType,
    amountDisplay: formatCurrency(amountMinorUnits),
    currentBalanceDisplay: formatCurrency(accountBalance),
    projectedBalanceDisplay: formatCurrency(Math.max(0, projectedBalance)),
    impactLevel,
    warnings,
    recommendations
  }
}
