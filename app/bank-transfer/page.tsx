'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import AppShell from '@/components/layout/AppShell'
import {
  createTransfer,
  fetchAccounts,
  fetchBeneficiaries,
  type SafeAccount,
  type SafeBeneficiary,
  type TransferReceipt
} from '@/lib/banking-client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DestinationType = 'beneficiary' | 'account'

type FormState = {
  sourceAccountId: string
  destType: DestinationType
  beneficiaryId: string
  destAccountId: string
  amount: string
  description: string
}

type FormErrors = Partial<Record<keyof FormState, string>>

type Stage = 'form' | 'review' | 'loading' | 'success' | 'error'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatLKR(val: string) {
  const n = Number(val)
  if (!Number.isFinite(n)) return ''
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BankTransferPage() {
  const [accounts, setAccounts] = useState<SafeAccount[]>([])
  const [beneficiaries, setBeneficiaries] = useState<SafeBeneficiary[]>([])
  const [loadingData, setLoadingData] = useState(true)

  const [form, setForm] = useState<FormState>({
    sourceAccountId: '',
    destType: 'beneficiary',
    beneficiaryId: '',
    destAccountId: '',
    amount: '',
    description: ''
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [stage, setStage] = useState<Stage>('form')
  const [receipt, setReceipt] = useState<TransferReceipt | null>(null)
  const [apiError, setApiError] = useState('')
  const submittingRef = useRef(false)

  // ── Load data ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const [accts, benes] = await Promise.all([
          fetchAccounts(),
          fetchBeneficiaries()
        ])
        setAccounts(accts)
        setBeneficiaries(benes)
        const first = accts.find((a) => a.status === 'active') ?? accts[0]
        if (first) setForm((f) => ({ ...f, sourceAccountId: String(first.id) }))
        if (benes.length > 0)
          setForm((f) => ({ ...f, beneficiaryId: String(benes[0].id) }))
      } catch {
        /* middleware handles 401 redirect */
      } finally {
        setLoadingData(false)
      }
    }
    load()
  }, [])

  const sourceAccount = accounts.find(
    (a) => String(a.id) === form.sourceAccountId
  )
  const selectedBeneficiary = beneficiaries.find(
    (b) => String(b.id) === form.beneficiaryId
  )
  const destAccount = accounts.find((a) => String(a.id) === form.destAccountId)

  // ── Setters ────────────────────────────────────────────────────────────
  const set = useCallback(
    (field: keyof FormState, value: string) =>
      setForm((f) => ({ ...f, [field]: value })),
    []
  )
  const clearError = useCallback(
    (field: keyof FormState) =>
      setErrors((e) => ({ ...e, [field]: undefined })),
    []
  )

  // ── Validation ─────────────────────────────────────────────────────────
  function validate(): boolean {
    const e: FormErrors = {}

    if (!form.sourceAccountId) e.sourceAccountId = 'Select a source account.'
    else if (sourceAccount?.status === 'frozen')
      e.sourceAccountId =
        'This account is frozen. Unfreeze it from Account Shield Mode.'

    if (form.destType === 'beneficiary') {
      if (!form.beneficiaryId) e.beneficiaryId = 'Select a beneficiary.'
    } else {
      if (!form.destAccountId) e.destAccountId = 'Select a destination account.'
      else if (form.destAccountId === form.sourceAccountId)
        e.destAccountId = 'Destination must differ from source.'
    }

    const amt = Number(form.amount)
    if (!form.amount) e.amount = 'Enter an amount.'
    else if (!Number.isFinite(amt) || amt <= 0)
      e.amount = 'Amount must be a positive number.'
    else if (sourceAccount && amt * 100 > sourceAccount.balanceMinorUnits)
      e.amount = `Insufficient funds. Available: ${sourceAccount.balanceDisplay}.`

    setErrors(e)
    return Object.keys(e).filter((k) => e[k as keyof FormErrors]).length === 0
  }

  function handleReview(ev: React.FormEvent) {
    ev.preventDefault()
    if (validate()) setStage('review')
  }

  // ── Submit ─────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (submittingRef.current) return
    submittingRef.current = true
    setStage('loading')
    setApiError('')

    try {
      const result = await createTransfer({
        sourceAccountId: Number(form.sourceAccountId),
        destinationAccountId:
          form.destType === 'account' ? Number(form.destAccountId) : null,
        beneficiaryId:
          form.destType === 'beneficiary' ? Number(form.beneficiaryId) : null,
        amount: form.amount,
        currency: 'LKR',
        description: form.description
      })
      setReceipt(result)
      setStage('success')
    } catch (err) {
      setApiError(
        err instanceof Error
          ? err.message
          : 'Transfer failed. Please try again.'
      )
      setStage('error')
    } finally {
      submittingRef.current = false
    }
  }

  function resetForm() {
    setStage('form')
    setForm((f) => ({ ...f, amount: '', description: '' }))
    setErrors({})
    setApiError('')
    setReceipt(null)
  }

  // ── Loading skeleton ───────────────────────────────────────────────────
  if (loadingData) {
    return (
      <AppShell>
        <main className="flex-1 overflow-y-auto px-6 py-8 md:px-8">
          <div className="mb-6">
            <div className="h-8 w-48 rounded-lg bg-gray-100 animate-pulse" />
            <div className="mt-2 h-4 w-64 rounded bg-gray-100 animate-pulse" />
          </div>
          <div className="max-w-2xl mx-auto serandib-card p-8">
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-12 rounded-lg bg-gray-100 animate-pulse"
                />
              ))}
            </div>
          </div>
        </main>
      </AppShell>
    )
  }

  // ── Success receipt ────────────────────────────────────────────────────
  if (stage === 'success' && receipt) {
    return (
      <AppShell>
        <main className="flex-1 overflow-y-auto px-6 py-8 md:px-8">
          <div className="max-w-lg mx-auto">
            {/* Success card */}
            <div
              className="serandib-card overflow-hidden"
              style={{ border: '1.5px solid rgba(16,185,129,0.25)' }}
            >
              {/* Green header */}
              <div
                style={{
                  background:
                    'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
                  padding: '2rem',
                  textAlign: 'center',
                  color: '#fff'
                }}
              >
                <div className="text-5xl mb-3">✓</div>
                <h2 className="text-2xl font-bold">Transfer Complete</h2>
                <p className="mt-1 opacity-90 text-sm">{receipt.reference}</p>
              </div>

              {/* Receipt details */}
              <div className="p-6 space-y-4">
                <ReceiptRow
                  label="Amount"
                  value={receipt.amountDisplay}
                  highlight
                />
                <ReceiptRow
                  label="From account"
                  value={receipt.sourceAccountNumber}
                />
                <ReceiptRow
                  label={
                    receipt.beneficiaryId != null
                      ? 'To beneficiary'
                      : 'To account'
                  }
                  value={
                    receipt.destinationAccountId != null
                      ? `Account #${receipt.destinationAccountId}`
                      : (selectedBeneficiary?.name ?? 'External')
                  }
                />
                <ReceiptRow
                  label="Description"
                  value={receipt.description || '—'}
                />
                <ReceiptRow
                  label="Date"
                  value={new Date(receipt.createdAt).toLocaleString('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  })}
                />
                <div
                  style={{
                    borderTop: '1px solid var(--sb-border)',
                    paddingTop: '1rem',
                    marginTop: '1rem'
                  }}
                />
                <ReceiptRow
                  label="Remaining balance"
                  value={receipt.balanceAfterDisplay}
                  highlight
                />
              </div>

              {/* Actions */}
              <div
                className="px-6 pb-6 flex gap-3"
                style={{ flexDirection: 'column' }}
              >
                <button
                  type="button"
                  onClick={resetForm}
                  className="serandib-button-primary w-full py-3"
                >
                  New Transfer
                </button>
                <Link
                  href="/dashboard"
                  className="serandib-button-secondary w-full py-3 text-center"
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </main>
      </AppShell>
    )
  }

  // ── Error state ────────────────────────────────────────────────────────
  if (stage === 'error') {
    return (
      <AppShell>
        <main className="flex-1 overflow-y-auto px-6 py-8 md:px-8">
          <div className="max-w-lg mx-auto">
            <div
              className="serandib-card p-8 text-center"
              style={{ border: '1.5px solid rgba(239,68,68,0.25)' }}
            >
              <div className="text-5xl mb-4">⚠</div>
              <h2
                className="text-xl font-bold mb-2"
                style={{ color: 'var(--serandib-navy)' }}
              >
                Transfer Failed
              </h2>
              <p
                className="text-sm mb-6 leading-relaxed"
                style={{ color: 'var(--serandib-muted)' }}
              >
                {apiError}
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => setStage('review')}
                  className="serandib-button-secondary py-2 px-6 text-sm"
                >
                  Try Again
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="serandib-button-primary py-2 px-6 text-sm"
                >
                  New Transfer
                </button>
              </div>
            </div>
          </div>
        </main>
      </AppShell>
    )
  }

  // ── Review panel ───────────────────────────────────────────────────────
  if (stage === 'review') {
    const destLabel =
      form.destType === 'beneficiary'
        ? (selectedBeneficiary?.name ?? '—')
        : (destAccount?.nickname ?? destAccount?.accountName ?? '—')

    return (
      <AppShell>
        <main className="flex-1 overflow-y-auto px-6 py-8 md:px-8">
          <div className="max-w-lg mx-auto">
            <div className="mb-6">
              <h1
                className="text-2xl font-extrabold"
                style={{ color: 'var(--serandib-navy)' }}
              >
                Review Transfer
              </h1>
              <p
                className="mt-1 text-sm"
                style={{ color: 'var(--serandib-muted)' }}
              >
                Check the details before confirming.
              </p>
            </div>

            <div className="serandib-card p-6 space-y-4 mb-4">
              <ReceiptRow
                label="From"
                value={
                  sourceAccount?.nickname ?? sourceAccount?.accountName ?? '—'
                }
              />
              <ReceiptRow label="To" value={destLabel} />
              <ReceiptRow
                label="Amount"
                value={`LKR ${formatLKR(form.amount)}`}
                highlight
              />
              {form.description && (
                <ReceiptRow label="Description" value={form.description} />
              )}
              {sourceAccount && (
                <ReceiptRow
                  label="Balance after (estimated)"
                  value={`LKR ${formatLKR(
                    String(
                      sourceAccount.balanceMinorUnits / 100 -
                        Number(form.amount)
                    )
                  )}`}
                />
              )}
            </div>

            {/* Frozen warning */}
            {sourceAccount?.status === 'frozen' && (
              <div
                className="mb-4 rounded-xl p-3 text-sm"
                style={{
                  background: 'rgba(239,68,68,0.08)',
                  color: '#b91c1c',
                  border: '1px solid rgba(239,68,68,0.2)'
                }}
              >
                This account is frozen. Unfreeze it from Account Shield Mode.
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStage('form')}
                className="serandib-button-secondary flex-1 py-3"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={sourceAccount?.status === 'frozen'}
                className="serandib-button-primary flex-1 py-3"
                style={
                  sourceAccount?.status === 'frozen'
                    ? { opacity: 0.5, cursor: 'not-allowed' }
                    : {}
                }
              >
                Confirm Transfer
              </button>
            </div>
          </div>
        </main>
      </AppShell>
    )
  }

  // ── Loading ────────────────────────────────────────────────────────────
  if (stage === 'loading') {
    return (
      <AppShell>
        <main className="flex-1 overflow-y-auto px-6 py-8 md:px-8">
          <div className="max-w-lg mx-auto serandib-card p-12 text-center">
            <div
              className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4"
              style={{
                borderColor: 'var(--sb-border)',
                borderTopColor: 'var(--serandib-indigo)'
              }}
            />
            <p
              className="font-semibold"
              style={{ color: 'var(--serandib-navy)' }}
            >
              Processing transfer…
            </p>
            <p
              className="text-sm mt-1"
              style={{ color: 'var(--serandib-muted)' }}
            >
              Securing your transaction. Do not close this page.
            </p>
          </div>
        </main>
      </AppShell>
    )
  }

  // ── Main form ──────────────────────────────────────────────────────────
  const isFrozen = sourceAccount?.status === 'frozen'
  const hasActiveBeneficiaries = beneficiaries.filter(
    (b) => b.trustLevel !== 'blocked'
  )
  const otherAccounts = accounts.filter(
    (a) => String(a.id) !== form.sourceAccountId
  )

  return (
    <AppShell>
      <main className="flex-1 overflow-y-auto px-6 py-6 md:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1
            className="text-2xl font-extrabold"
            style={{ color: 'var(--serandib-navy)' }}
          >
            Send Money
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: 'var(--serandib-muted)' }}
          >
            Secure, atomic transfers powered by the Serandib Transfer Engine
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* ── Transfer form ── */}
          <form
            onSubmit={handleReview}
            className="lg:col-span-3 serandib-card p-6 space-y-5"
          >
            {/* Source account */}
            <div>
              <label
                className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
                style={{ color: 'var(--serandib-muted)' }}
              >
                From Account
              </label>
              <select
                value={form.sourceAccountId}
                onChange={(e) => {
                  set('sourceAccountId', e.target.value)
                  clearError('sourceAccountId')
                }}
                className="w-full rounded-xl border px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2"
                style={{
                  borderColor: errors.sourceAccountId
                    ? '#ef4444'
                    : 'var(--sb-border)',
                  background: 'var(--sb-surface)',
                  color: 'var(--sb-text)'
                }}
              >
                <option value="">Select account</option>
                {accounts.map((a) => (
                  <option key={a.id} value={String(a.id)}>
                    {a.nickname} — {a.balanceDisplay}
                    {a.status === 'frozen' ? ' (Frozen)' : ''}
                  </option>
                ))}
              </select>
              {isFrozen && (
                <p className="mt-1.5 text-xs text-red-600">
                  This account is frozen. Unfreeze it from Account Shield Mode.
                </p>
              )}
              {errors.sourceAccountId && !isFrozen && (
                <p className="mt-1.5 text-xs text-red-600">
                  {errors.sourceAccountId}
                </p>
              )}
            </div>

            {/* Destination type toggle */}
            <div>
              <label
                className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
                style={{ color: 'var(--serandib-muted)' }}
              >
                Send To
              </label>
              <div
                className="flex rounded-xl overflow-hidden border"
                style={{ borderColor: 'var(--sb-border)' }}
              >
                {(['beneficiary', 'account'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => set('destType', type)}
                    className="flex-1 py-2.5 text-sm font-medium transition-colors"
                    style={{
                      background:
                        form.destType === type
                          ? 'var(--serandib-indigo)'
                          : 'var(--sb-surface)',
                      color:
                        form.destType === type
                          ? '#fff'
                          : 'var(--serandib-muted)'
                    }}
                  >
                    {type === 'beneficiary' ? 'Beneficiary' : 'My Account'}
                  </button>
                ))}
              </div>
            </div>

            {/* Beneficiary selector */}
            {form.destType === 'beneficiary' && (
              <div>
                {hasActiveBeneficiaries.length === 0 ? (
                  <div
                    className="rounded-xl p-4 text-sm text-center"
                    style={{
                      background: 'rgba(99,102,241,0.06)',
                      color: 'var(--serandib-muted)'
                    }}
                  >
                    No beneficiaries added yet.{' '}
                    <Link
                      href="/beneficiaries"
                      className="underline font-medium"
                      style={{ color: 'var(--serandib-indigo)' }}
                    >
                      Add one
                    </Link>
                    .
                  </div>
                ) : (
                  <>
                    <label
                      className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
                      style={{ color: 'var(--serandib-muted)' }}
                    >
                      Beneficiary
                    </label>
                    <select
                      value={form.beneficiaryId}
                      onChange={(e) => {
                        set('beneficiaryId', e.target.value)
                        clearError('beneficiaryId')
                      }}
                      className="w-full rounded-xl border px-4 py-3 text-sm font-medium focus:outline-none"
                      style={{
                        borderColor: errors.beneficiaryId
                          ? '#ef4444'
                          : 'var(--sb-border)',
                        background: 'var(--sb-surface)',
                        color: 'var(--sb-text)'
                      }}
                    >
                      <option value="">Select beneficiary</option>
                      {hasActiveBeneficiaries.map((b) => (
                        <option key={b.id} value={String(b.id)}>
                          {b.name} — {b.bankName} ({b.accountNumberMasked})
                        </option>
                      ))}
                    </select>
                    {errors.beneficiaryId && (
                      <p className="mt-1.5 text-xs text-red-600">
                        {errors.beneficiaryId}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Internal account selector */}
            {form.destType === 'account' && (
              <div>
                {otherAccounts.length === 0 ? (
                  <div
                    className="rounded-xl p-4 text-sm text-center"
                    style={{
                      background: 'rgba(99,102,241,0.06)',
                      color: 'var(--serandib-muted)'
                    }}
                  >
                    No other accounts available.
                  </div>
                ) : (
                  <>
                    <label
                      className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
                      style={{ color: 'var(--serandib-muted)' }}
                    >
                      Destination Account
                    </label>
                    <select
                      value={form.destAccountId}
                      onChange={(e) => {
                        set('destAccountId', e.target.value)
                        clearError('destAccountId')
                      }}
                      className="w-full rounded-xl border px-4 py-3 text-sm font-medium focus:outline-none"
                      style={{
                        borderColor: errors.destAccountId
                          ? '#ef4444'
                          : 'var(--sb-border)',
                        background: 'var(--sb-surface)',
                        color: 'var(--sb-text)'
                      }}
                    >
                      <option value="">Select account</option>
                      {otherAccounts.map((a) => (
                        <option key={a.id} value={String(a.id)}>
                          {a.nickname} — {a.balanceDisplay}
                          {a.status === 'frozen' ? ' (Frozen)' : ''}
                        </option>
                      ))}
                    </select>
                    {errors.destAccountId && (
                      <p className="mt-1.5 text-xs text-red-600">
                        {errors.destAccountId}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Amount */}
            <div>
              <label
                className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
                style={{ color: 'var(--serandib-muted)' }}
              >
                Amount (LKR)
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => {
                  set('amount', e.target.value)
                  clearError('amount')
                }}
                className="w-full rounded-xl border px-4 py-3 text-lg font-bold focus:outline-none focus:ring-2"
                style={{
                  borderColor: errors.amount ? '#ef4444' : 'var(--sb-border)',
                  background: 'var(--sb-surface)',
                  color: 'var(--sb-text)'
                }}
              />
              {errors.amount && (
                <p className="mt-1.5 text-xs text-red-600">{errors.amount}</p>
              )}
              {sourceAccount && (
                <p
                  className="mt-1.5 text-xs"
                  style={{ color: 'var(--serandib-muted)' }}
                >
                  Available: {sourceAccount.balanceDisplay}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label
                className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
                style={{ color: 'var(--serandib-muted)' }}
              >
                Description{' '}
                <span className="font-normal normal-case">(optional)</span>
              </label>
              <input
                type="text"
                maxLength={140}
                placeholder="e.g. Rent payment, Family support…"
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none"
                style={{
                  borderColor: 'var(--sb-border)',
                  background: 'var(--sb-surface)',
                  color: 'var(--sb-text)'
                }}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isFrozen}
              className="serandib-button-primary w-full py-3.5 text-base font-bold"
              style={isFrozen ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            >
              Review Transfer →
            </button>
          </form>

          {/* ── Side panel ── */}
          <div className="lg:col-span-2 space-y-4">
            {/* Source account card */}
            {sourceAccount && (
              <div
                className="rounded-2xl p-5"
                style={{
                  background:
                    'linear-gradient(135deg, var(--serandib-indigo) 0%, var(--serandib-blue) 100%)',
                  color: '#fff'
                }}
              >
                <p className="text-xs font-semibold opacity-80 uppercase tracking-wide mb-1">
                  From
                </p>
                <p className="font-bold text-lg">{sourceAccount.nickname}</p>
                <p className="text-xs opacity-70 mb-3">
                  {sourceAccount.accountNumberMasked}
                </p>
                <p className="text-3xl font-extrabold">
                  {sourceAccount.balanceDisplay}
                </p>
                {isFrozen && (
                  <div className="mt-3 rounded-lg px-3 py-2 text-xs font-semibold bg-white/20">
                    Frozen — cannot send
                  </div>
                )}
              </div>
            )}

            {/* Security notice */}
            <div
              className="rounded-2xl p-4"
              style={{
                background: 'rgba(16,185,129,0.06)',
                border: '1px solid rgba(16,185,129,0.2)'
              }}
            >
              <p
                className="text-xs font-bold mb-1"
                style={{ color: '#065f46' }}
              >
                Transfer Engine Active
              </p>
              <ul className="text-xs space-y-1" style={{ color: '#047857' }}>
                <li>✓ Atomic DB transaction</li>
                <li>✓ Row-level balance locks</li>
                <li>✓ Double-entry ledger</li>
                <li>✓ Idempotency protection</li>
                <li>✓ Overdraft prevention</li>
              </ul>
            </div>

            {/* Quick beneficiaries */}
            {beneficiaries.length > 0 && (
              <div className="serandib-card p-4">
                <p
                  className="text-xs font-semibold uppercase tracking-wide mb-3"
                  style={{ color: 'var(--serandib-muted)' }}
                >
                  Quick Select
                </p>
                <div className="space-y-2">
                  {beneficiaries.slice(0, 4).map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        set('destType', 'beneficiary')
                        set('beneficiaryId', String(b.id))
                        clearError('beneficiaryId')
                      }}
                      className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors"
                      style={{
                        background:
                          form.beneficiaryId === String(b.id) &&
                          form.destType === 'beneficiary'
                            ? 'rgba(99,102,241,0.08)'
                            : 'transparent',
                        border: '1px solid var(--sb-border)'
                      }}
                    >
                      <div
                        className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{
                          background: 'rgba(99,102,241,0.1)',
                          color: 'var(--serandib-indigo)'
                        }}
                      >
                        {b.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p
                          className="text-sm font-semibold truncate"
                          style={{ color: 'var(--sb-text)' }}
                        >
                          {b.name}
                        </p>
                        <p
                          className="text-xs truncate"
                          style={{ color: 'var(--serandib-muted)' }}
                        >
                          {b.bankName}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </AppShell>
  )
}

// ---------------------------------------------------------------------------
// Receipt row helper
// ---------------------------------------------------------------------------

function ReceiptRow({
  label,
  value,
  highlight
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm" style={{ color: 'var(--serandib-muted)' }}>
        {label}
      </span>
      <span
        className={`text-sm font-semibold ${highlight ? 'text-lg font-extrabold' : ''}`}
        style={{
          color: highlight ? 'var(--serandib-indigo)' : 'var(--sb-text)'
        }}
      >
        {value}
      </span>
    </div>
  )
}
