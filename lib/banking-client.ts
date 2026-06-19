/**
 * Client-side banking API helpers for NOVA Bank.
 *
 * Rules:
 *   - Never sends userId in requests — identity comes from the HttpOnly session cookie.
 *   - Never reads the session cookie manually.
 *   - Throws a clear AuthError on 401 so callers can redirect to /login.
 *   - All paths are relative (/api/...) so they work regardless of origin.
 */

export class AuthError extends Error {
  constructor() {
    super('Not authenticated. Please log in.')
    this.name = 'AuthError'
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    }
  })

  if (res.status === 401) throw new AuthError()

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data?.error ?? `Request failed (${res.status})`)
  }

  return data as T
}

// ---------------------------------------------------------------------------
// Account types
// ---------------------------------------------------------------------------

export type SafeAccount = {
  id: number
  accountNumberMasked: string
  accountName: string
  currency: string
  balanceMinorUnits: number
  balanceDisplay: string
  status: string
  nickname: string
}

// ---------------------------------------------------------------------------
// Transaction types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Beneficiary types
// ---------------------------------------------------------------------------

export type SafeBeneficiary = {
  id: number
  name: string
  bankName: string
  accountNumberMasked: string
  trustLevel: string
  createdAt: string
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Notification types
// ---------------------------------------------------------------------------

export type SafeNotification = {
  id: number
  type: string
  title: string
  message: string
  readAt: string | null
  createdAt: string
}

// ---------------------------------------------------------------------------
// Account helpers
// ---------------------------------------------------------------------------

export async function fetchAccounts(): Promise<SafeAccount[]> {
  const data = await apiFetch<{ accounts: SafeAccount[] }>('/api/accounts')
  return data.accounts
}

export async function updateAccount(input: {
  accountId: number
  nickname?: string
  status?: 'active' | 'frozen'
}): Promise<SafeAccount> {
  const data = await apiFetch<{ account: SafeAccount }>('/api/accounts', {
    method: 'PATCH',
    body: JSON.stringify(input)
  })
  return data.account
}

// ---------------------------------------------------------------------------
// Transaction helpers
// ---------------------------------------------------------------------------

export type FetchTransactionsParams = {
  accountId?: number
  limit?: number
  offset?: number
}

export async function fetchTransactions(
  params: FetchTransactionsParams = {}
): Promise<{
  transactions: SafeTransaction[]
  pagination: { limit: number; offset: number; count: number; total: number }
}> {
  const qs = new URLSearchParams()
  if (params.accountId !== undefined)
    qs.set('accountId', String(params.accountId))
  if (params.limit !== undefined) qs.set('limit', String(params.limit))
  if (params.offset !== undefined) qs.set('offset', String(params.offset))
  return apiFetch(`/api/transactions?${qs.toString()}`)
}

// ---------------------------------------------------------------------------
// Beneficiary helpers
// ---------------------------------------------------------------------------

export async function fetchBeneficiaries(): Promise<SafeBeneficiary[]> {
  const data = await apiFetch<{ beneficiaries: SafeBeneficiary[] }>(
    '/api/beneficiaries'
  )
  return data.beneficiaries
}

export async function createBeneficiary(input: {
  name: string
  bankName: string
  accountNumber: string
}): Promise<SafeBeneficiary> {
  const data = await apiFetch<{ beneficiary: SafeBeneficiary }>(
    '/api/beneficiaries',
    {
      method: 'POST',
      body: JSON.stringify(input)
    }
  )
  return data.beneficiary
}

export async function updateBeneficiaryTrustLevel(input: {
  beneficiaryId: number
  trustLevel: 'new' | 'verified' | 'trusted' | 'blocked'
}): Promise<SafeBeneficiary> {
  const data = await apiFetch<{ beneficiary: SafeBeneficiary }>(
    `/api/beneficiaries/${input.beneficiaryId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ trustLevel: input.trustLevel })
    }
  )
  return data.beneficiary
}

export async function deleteBeneficiary(beneficiaryId: number): Promise<void> {
  await apiFetch(`/api/beneficiaries/${beneficiaryId}`, { method: 'DELETE' })
}

// ---------------------------------------------------------------------------
// Transfer types and helpers
// ---------------------------------------------------------------------------

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

function generateIdempotencyKey(): string {
  const ts = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 10)
  return `${ts}-${rand}`
}

export async function createTransfer(input: {
  sourceAccountId: number
  destinationAccountId?: number | null
  beneficiaryId?: number | null
  amount: string | number
  currency?: string
  description?: string
}): Promise<TransferReceipt> {
  const idempotencyKey = generateIdempotencyKey()

  const data = await apiFetch<{ receipt: TransferReceipt }>('/api/transfer', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({ ...input, idempotencyKey })
  })
  return data.receipt
}

export async function fetchTransferReceipt(
  reference: string
): Promise<TransferReceipt | null> {
  try {
    const data = await apiFetch<{ receipt: TransferReceipt }>(
      `/api/transfers/${reference}`
    )
    return data.receipt
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Bill payment types and helpers — Phase 7
// ---------------------------------------------------------------------------

export type SafeBiller = {
  id: number
  name: string
  category: string
  providerCode: string
  logoUrl: string | null
  status: string
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

export async function fetchBillers(params?: {
  category?: string
  search?: string
}): Promise<SafeBiller[]> {
  const qs = new URLSearchParams()
  if (params?.category) qs.set('category', params.category)
  if (params?.search) qs.set('search', params.search)
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  const data = await apiFetch<{ billers: SafeBiller[] }>(
    `/api/billers${suffix}`
  )
  return data.billers
}

export async function fetchBillPayments(params?: {
  accountId?: number
  billerId?: number
  status?: string
  limit?: number
  offset?: number
}): Promise<{
  billPayments: SafeBillPayment[]
  pagination: { limit: number; offset: number; count: number }
}> {
  const qs = new URLSearchParams()
  if (params?.accountId !== undefined)
    qs.set('accountId', String(params.accountId))
  if (params?.billerId !== undefined)
    qs.set('billerId', String(params.billerId))
  if (params?.status) qs.set('status', params.status)
  if (params?.limit !== undefined) qs.set('limit', String(params.limit))
  if (params?.offset !== undefined) qs.set('offset', String(params.offset))
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  return apiFetch(`/api/bill-payments${suffix}`)
}

export async function createBillPayment(input: {
  accountId: number
  billerId: number
  billReference: string
  amount: string | number
  currency?: string
}): Promise<BillPaymentReceipt> {
  // Generate an idempotency key so a retried/double-clicked submit cannot
  // produce a second payment. userId is never sent — it comes from the cookie.
  const idempotencyKey = generateIdempotencyKey()

  const data = await apiFetch<{ receipt: BillPaymentReceipt }>(
    '/api/bill-payments',
    {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ ...input, idempotencyKey })
    }
  )
  return data.receipt
}

export async function fetchBillPaymentReceipt(
  reference: string
): Promise<BillPaymentReceipt | null> {
  try {
    const data = await apiFetch<{ receipt: BillPaymentReceipt }>(
      `/api/bill-payments/${reference}`
    )
    return data.receipt
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Notification helpers
// ---------------------------------------------------------------------------

export async function fetchNotifications(): Promise<SafeNotification[]> {
  const data = await apiFetch<{ notifications: SafeNotification[] }>(
    '/api/notifications'
  )
  return data.notifications
}

export async function markNotificationRead(
  notificationId: number
): Promise<void> {
  await apiFetch(`/api/notifications/${notificationId}/read`, {
    method: 'POST'
  })
}

// ---------------------------------------------------------------------------
// Invisible Savings types — Phase 9
// ---------------------------------------------------------------------------

export type SafePartnerMerchant = {
  id: number
  name: string
  slug: string
  category: string
  logoUrl: string | null
  status: string
  minRoundupMinorUnits: number
  maxRoundupMinorUnits: number
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

export type InvisibleSavingsSummary = {
  monthKey: string
  enabled: boolean
  capturedThisMonthMinorUnits: number
  capturedThisMonthDisplay: string
  eventCount: number
  averageRoundupMinorUnits: number
  averageRoundupDisplay: string
  projectedMonthlySavingMinorUnits: number
  projectedMonthlySavingDisplay: string
  topPartner: string | null
  nextSweepDate: string
  events: SafeInvisibleSavingsEvent[]
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

export async function fetchPartnerMerchants(): Promise<SafePartnerMerchant[]> {
  const data = await apiFetch<{ partners: SafePartnerMerchant[] }>(
    '/api/partner-merchants'
  )
  return data.partners
}

export async function fetchInvisibleSavingsSettings(): Promise<InvisibleSavingsSettings | null> {
  const data = await apiFetch<{ settings: InvisibleSavingsSettings | null }>(
    '/api/invisible-savings/settings'
  )
  return data.settings
}

export async function updateInvisibleSavingsSettings(input: {
  enabled?: boolean
  sourceAccountId?: number
  destinationAccountId?: number
  minRoundupAmount?: string | number
  maxRoundupAmount?: string | number
  sweepDay?: number
}): Promise<InvisibleSavingsSettings> {
  const data = await apiFetch<{ settings: InvisibleSavingsSettings }>(
    '/api/invisible-savings/settings',
    { method: 'PATCH', body: JSON.stringify(input) }
  )
  return data.settings
}

export async function fetchInvisibleSavingsSummary(params?: {
  monthKey?: string
}): Promise<InvisibleSavingsSummary> {
  const qs = new URLSearchParams()
  if (params?.monthKey) qs.set('monthKey', params.monthKey)
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  const data = await apiFetch<{ summary: InvisibleSavingsSummary }>(
    `/api/invisible-savings/summary${suffix}`
  )
  return data.summary
}

export async function simulatePartnerPurchase(input: {
  partnerMerchantId: number
  sourceAccountId: number
  purchaseAmount: string | number
  currency?: string
  description?: string
}): Promise<PartnerPurchaseReceipt> {
  const idempotencyKey = generateIdempotencyKey()
  const data = await apiFetch<{ receipt: PartnerPurchaseReceipt }>(
    '/api/invisible-savings/purchase',
    {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ ...input, idempotencyKey })
    }
  )
  return data.receipt
}

export async function sweepInvisibleSavings(input?: {
  monthKey?: string
}): Promise<InvisibleSavingsSweepReceipt> {
  const data = await apiFetch<{ receipt: InvisibleSavingsSweepReceipt }>(
    '/api/invisible-savings/sweep',
    { method: 'POST', body: JSON.stringify(input ?? {}) }
  )
  return data.receipt
}

// ---------------------------------------------------------------------------
// Smart Spend types — Phase 8
// ---------------------------------------------------------------------------

export type SpendCategory = {
  id: number
  name: string
  slug: string
  color: string
  icon: string
}

export type BudgetItem = {
  id: number
  categorySlug: string
  amountMinorUnits: number
  currency: string
  period: string
}

export type CategoryBreakdown = {
  slug: string
  name: string
  color: string
  amountMinorUnits: number
  amountDisplay: string
  percentage: number
  budgetMinorUnits?: number
  budgetDisplay?: string
  budgetUsedPct?: number
  status: 'safe' | 'watch' | 'over'
}

export type SmartSpendSummary = {
  range: { from: string; to: string }
  metrics: {
    financialHealthScore: number
    monthlySpendMinorUnits: number
    monthlySpendDisplay: string
    savingsPotentialMinorUnits: number
    savingsPotentialDisplay: string
    averageDailySpendMinorUnits: number
    averageDailySpendDisplay: string
    incomeMinorUnits: number
    incomeDisplay: string
    debitMinorUnits: number
    debitDisplay: string
    creditMinorUnits: number
    creditDisplay: string
  }
  categories: CategoryBreakdown[]
  insights: Array<{ type: string; title: string; message: string }>
  recurring: Array<{
    key: string
    name: string
    averageAmountMinorUnits: number
    averageAmountDisplay: string
    nextExpectedDate?: string
    confidence: number
  }>
  forecast: {
    projectedMonthEndBalanceMinorUnits: number
    projectedMonthEndBalanceDisplay: string
    confidence: number
    warning?: string
  }
}

export type FinancialTwinResult = {
  scenarioType: string
  amountDisplay: string
  currentBalanceDisplay: string
  projectedBalanceDisplay: string
  impactLevel: 'low' | 'medium' | 'high'
  warnings: string[]
  recommendations: string[]
}

// ---------------------------------------------------------------------------
// Smart Spend helpers — Phase 8
// ---------------------------------------------------------------------------

export async function fetchSmartSpendSummary(params?: {
  from?: string
  to?: string
  accountId?: number
}): Promise<SmartSpendSummary> {
  const qs = new URLSearchParams()
  if (params?.from) qs.set('from', params.from)
  if (params?.to) qs.set('to', params.to)
  if (params?.accountId !== undefined)
    qs.set('accountId', String(params.accountId))
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  const data = await apiFetch<{ summary: SmartSpendSummary }>(
    `/api/smart-spend/summary${suffix}`
  )
  return data.summary
}

export async function fetchSpendCategories(): Promise<SpendCategory[]> {
  const data = await apiFetch<{ categories: SpendCategory[] }>(
    '/api/smart-spend/categories'
  )
  return data.categories
}

export async function fetchBudgets(): Promise<BudgetItem[]> {
  const data = await apiFetch<{ budgets: BudgetItem[] }>(
    '/api/smart-spend/budgets'
  )
  return data.budgets
}

export async function upsertBudget(input: {
  categorySlug: string
  amount: string | number
  currency?: string
  period?: 'monthly'
}): Promise<BudgetItem> {
  const data = await apiFetch<{ budget: BudgetItem }>(
    '/api/smart-spend/budgets',
    {
      method: 'POST',
      body: JSON.stringify({
        ...input,
        currency: input.currency ?? 'LKR',
        period: input.period ?? 'monthly'
      })
    }
  )
  return data.budget
}

export async function simulateFinancialTwin(input: {
  scenarioType: 'purchase' | 'saving' | 'bill_payment' | 'transfer'
  amount: string | number
  categorySlug?: string
  accountId?: number
  description?: string
}): Promise<FinancialTwinResult> {
  const data = await apiFetch<{ result: FinancialTwinResult }>(
    '/api/smart-spend/simulate',
    {
      method: 'POST',
      body: JSON.stringify(input)
    }
  )
  return data.result
}
