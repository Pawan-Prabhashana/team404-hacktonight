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
