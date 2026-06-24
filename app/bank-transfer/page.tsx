'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import AppShell from '@/components/layout/AppShell'
import LoadingState from '@/components/ui/LoadingState'
import {
  createTransfer,
  fetchAccounts,
  fetchBeneficiaries,
  type SafeAccount,
  type SafeBeneficiary,
  type TransferReceipt
} from '@/lib/banking-client'

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

function fmt(val: string) {
  const n = Number(val)
  return Number.isFinite(n)
    ? n.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    : ''
}

function ReceiptRow({
  label,
  value,
  accent
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        padding: '0.75rem 0',
        borderBottom: '1px solid #f1f5f8'
      }}
    >
      <span style={{ fontSize: '0.875rem', color: '#6b7a90' }}>{label}</span>
      <span
        style={{
          fontSize: accent ? '1.125rem' : '0.9375rem',
          fontWeight: accent ? 800 : 600,
          color: accent ? '#087f7a' : '#10202b'
        }}
      >
        {value}
      </span>
    </div>
  )
}

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
        /* middleware handles 401 */
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
  const otherAccounts = accounts.filter(
    (a) => String(a.id) !== form.sourceAccountId
  )
  const activeBeneficiaries = beneficiaries.filter(
    (b) => b.trustLevel !== 'blocked'
  )

  const set = useCallback(
    (field: keyof FormState, value: string) =>
      setForm((f) => ({ ...f, [field]: value })),
    []
  )
  const clearErr = useCallback(
    (field: keyof FormState) =>
      setErrors((e) => ({ ...e, [field]: undefined })),
    []
  )

  function validate(): boolean {
    const e: FormErrors = {}
    if (!form.sourceAccountId) e.sourceAccountId = 'Select a source account.'
    else if (sourceAccount?.status === 'frozen')
      e.sourceAccountId =
        'This account is frozen. Unfreeze from Account Shield Mode.'
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

  if (loadingData)
    return (
      <AppShell title="Send Money">
        <LoadingState />
      </AppShell>
    )

  // ── Success ────────────────────────────────────────────
  if (stage === 'success' && receipt) {
    return (
      <AppShell title="Transfer Complete" subtitle={receipt.reference}>
        <div style={{ maxWidth: 540, margin: '0 auto' }}>
          <div
            className="app-card"
            style={{
              border: '1.5px solid rgba(16,185,129,0.25)',
              overflow: 'hidden',
              padding: 0
            }}
          >
            <div
              style={{
                background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
                padding: '2.25rem 2rem',
                textAlign: 'center',
                color: '#fff'
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem',
                  fontSize: '1.5rem',
                  fontWeight: 800
                }}
              >
                ✓
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                Transfer Complete
              </h2>
              <p
                style={{
                  opacity: 0.75,
                  fontSize: '0.875rem',
                  marginTop: '0.375rem',
                  fontFamily: 'monospace'
                }}
              >
                {receipt.reference}
              </p>
            </div>
            <div style={{ padding: '1.75rem 2rem' }}>
              <ReceiptRow label="Amount" value={receipt.amountDisplay} accent />
              <ReceiptRow label="From" value={receipt.sourceAccountNumber} />
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
              {receipt.description && (
                <ReceiptRow label="Description" value={receipt.description} />
              )}
              <ReceiptRow
                label="Date"
                value={new Date(receipt.createdAt).toLocaleString('en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'short'
                })}
              />
              <ReceiptRow
                label="Remaining balance"
                value={receipt.balanceAfterDisplay}
                accent
              />
            </div>
            <div
              style={{
                padding: '0 2rem 2rem',
                display: 'flex',
                gap: '0.75rem'
              }}
            >
              <button
                type="button"
                onClick={resetForm}
                className="app-button-primary"
                style={{ flex: 1 }}
              >
                New Transfer
              </button>
              <Link
                href="/dashboard"
                className="app-button-secondary"
                style={{
                  flex: 1,
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </AppShell>
    )
  }

  // ── Error ──────────────────────────────────────────────
  if (stage === 'error') {
    return (
      <AppShell title="Transfer Failed">
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <div
            className="app-card"
            style={{
              border: '1.5px solid rgba(239,68,68,0.2)',
              textAlign: 'center',
              padding: '2.5rem'
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'rgba(239,68,68,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
                color: '#dc2626',
                fontSize: '1.5rem',
                fontWeight: 800
              }}
            >
              !
            </div>
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: '#071f2a',
                marginBottom: '0.75rem'
              }}
            >
              Transfer Failed
            </h2>
            <p
              style={{
                color: '#6b7a90',
                fontSize: '0.9375rem',
                lineHeight: 1.6,
                marginBottom: '1.5rem'
              }}
            >
              {apiError}
            </p>
            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                justifyContent: 'center'
              }}
            >
              <button
                type="button"
                onClick={() => setStage('review')}
                className="app-button-secondary"
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="app-button-primary"
              >
                New Transfer
              </button>
            </div>
          </div>
        </div>
      </AppShell>
    )
  }

  // ── Review ─────────────────────────────────────────────
  if (stage === 'review') {
    const destLabel =
      form.destType === 'beneficiary'
        ? (selectedBeneficiary?.name ?? '—')
        : (destAccount?.nickname ?? destAccount?.accountName ?? '—')
    return (
      <AppShell
        title="Review Transfer"
        subtitle="Confirm the details before sending."
      >
        <div
          style={{
            maxWidth: 520,
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}
        >
          <div className="app-card" style={{ padding: '1.75rem 2rem' }}>
            <ReceiptRow
              label="From"
              value={
                sourceAccount?.nickname ?? sourceAccount?.accountName ?? '—'
              }
            />
            <ReceiptRow label="To" value={destLabel} />
            <ReceiptRow
              label="Amount"
              value={`LKR ${fmt(form.amount)}`}
              accent
            />
            {form.description && (
              <ReceiptRow label="Note" value={form.description} />
            )}
            {sourceAccount && (
              <ReceiptRow
                label="Balance after (est.)"
                value={`LKR ${fmt(String(sourceAccount.balanceMinorUnits / 100 - Number(form.amount)))}`}
              />
            )}
          </div>
          {sourceAccount?.status === 'frozen' && (
            <div
              style={{
                padding: '0.875rem 1.125rem',
                borderRadius: '0.875rem',
                background: 'rgba(239,68,68,0.06)',
                border: '1px solid rgba(239,68,68,0.2)',
                color: '#b91c1c',
                fontSize: '0.875rem'
              }}
            >
              This account is frozen. Unfreeze it from Account Shield Mode.
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.875rem' }}>
            <button
              type="button"
              onClick={() => setStage('form')}
              className="app-button-secondary"
              style={{ flex: 1 }}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={sourceAccount?.status === 'frozen'}
              className="app-button-primary"
              style={{ flex: 1 }}
            >
              Confirm Transfer
            </button>
          </div>
        </div>
      </AppShell>
    )
  }

  // ── Loading ────────────────────────────────────────────
  if (stage === 'loading') {
    return (
      <AppShell title="Processing Transfer">
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <div
            className="app-card"
            style={{ textAlign: 'center', padding: '3rem' }}
          >
            <div className="app-spinner" style={{ margin: '0 auto 1.25rem' }} />
            <p style={{ fontWeight: 600, color: '#071f2a' }}>
              Processing transfer…
            </p>
            <p
              style={{
                color: '#6b7a90',
                fontSize: '0.875rem',
                marginTop: '0.375rem'
              }}
            >
              Securing your transaction. Do not close this page.
            </p>
          </div>
        </div>
      </AppShell>
    )
  }

  // ── Main Form ──────────────────────────────────────────
  const isFrozen = sourceAccount?.status === 'frozen'

  return (
    <AppShell
      title="Send Money"
      subtitle="Secure, atomic transfers powered by the Serandib Transfer Engine"
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1.4fr) minmax(300px,0.8fr)',
          gap: '1.5rem',
          alignItems: 'start'
        }}
      >
        {/* Transfer form */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (validate()) setStage('review')
          }}
          className="app-card"
          style={{ display: 'flex', flexDirection: 'column', gap: '1.375rem' }}
        >
          {/* From account */}
          <div>
            <label className="app-label">From Account</label>
            <select
              value={form.sourceAccountId}
              onChange={(e) => {
                set('sourceAccountId', e.target.value)
                clearErr('sourceAccountId')
              }}
              className={`app-select${errors.sourceAccountId ? ' app-input-error' : ''}`}
            >
              <option value="">Select account</option>
              {accounts.map((a) => (
                <option key={a.id} value={String(a.id)}>
                  {a.nickname} — {a.balanceDisplay}
                  {a.status === 'frozen' ? ' (Frozen)' : ''}
                </option>
              ))}
            </select>
            {errors.sourceAccountId && (
              <p className="app-error-msg">{errors.sourceAccountId}</p>
            )}
          </div>

          {/* Destination type */}
          <div>
            <label className="app-label">Send To</label>
            <div className="app-segmented">
              {(['beneficiary', 'account'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => set('destType', type)}
                  className={`app-segmented-btn${form.destType === type ? ' active' : ''}`}
                >
                  {type === 'beneficiary' ? 'Beneficiary' : 'My Account'}
                </button>
              ))}
            </div>
          </div>

          {/* Beneficiary */}
          {form.destType === 'beneficiary' && (
            <div>
              {activeBeneficiaries.length === 0 ? (
                <div
                  style={{
                    padding: '1rem',
                    borderRadius: '0.875rem',
                    background: '#f0faf9',
                    border: '1px dashed #cceae8',
                    textAlign: 'center',
                    fontSize: '0.875rem',
                    color: '#6b7a90'
                  }}
                >
                  No beneficiaries yet.{' '}
                  <Link
                    href="/beneficiaries"
                    style={{ color: '#087f7a', fontWeight: 600 }}
                  >
                    Add one →
                  </Link>
                </div>
              ) : (
                <>
                  <label className="app-label">Beneficiary</label>
                  <select
                    value={form.beneficiaryId}
                    onChange={(e) => {
                      set('beneficiaryId', e.target.value)
                      clearErr('beneficiaryId')
                    }}
                    className={`app-select${errors.beneficiaryId ? ' app-input-error' : ''}`}
                  >
                    <option value="">Select beneficiary</option>
                    {activeBeneficiaries.map((b) => (
                      <option key={b.id} value={String(b.id)}>
                        {b.name} — {b.bankName} ({b.accountNumberMasked})
                      </option>
                    ))}
                  </select>
                  {errors.beneficiaryId && (
                    <p className="app-error-msg">{errors.beneficiaryId}</p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Internal account */}
          {form.destType === 'account' && (
            <div>
              {otherAccounts.length === 0 ? (
                <div
                  style={{
                    padding: '1rem',
                    borderRadius: '0.875rem',
                    background: '#f0faf9',
                    border: '1px dashed #cceae8',
                    textAlign: 'center',
                    fontSize: '0.875rem',
                    color: '#6b7a90'
                  }}
                >
                  No other accounts available.
                </div>
              ) : (
                <>
                  <label className="app-label">Destination Account</label>
                  <select
                    value={form.destAccountId}
                    onChange={(e) => {
                      set('destAccountId', e.target.value)
                      clearErr('destAccountId')
                    }}
                    className={`app-select${errors.destAccountId ? ' app-input-error' : ''}`}
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
                    <p className="app-error-msg">{errors.destAccountId}</p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="app-label">Amount (LKR)</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => {
                set('amount', e.target.value)
                clearErr('amount')
              }}
              className={`app-input${errors.amount ? ' app-input-error' : ''}`}
              style={{ fontSize: '1.25rem', fontWeight: 700 }}
            />
            {errors.amount && <p className="app-error-msg">{errors.amount}</p>}
            {sourceAccount && !errors.amount && (
              <p
                style={{
                  fontSize: '0.8125rem',
                  color: '#6b7a90',
                  marginTop: '0.375rem'
                }}
              >
                Available: {sourceAccount.balanceDisplay}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="app-label">
              Note{' '}
              <span style={{ fontWeight: 400, color: '#9ca3af' }}>
                (optional)
              </span>
            </label>
            <input
              type="text"
              maxLength={140}
              placeholder="e.g. Rent payment, Family support…"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              className="app-input"
            />
          </div>

          <button
            type="submit"
            disabled={isFrozen}
            className="app-button-primary"
            style={{ width: '100%', fontSize: '1rem', fontWeight: 700 }}
          >
            Review Transfer →
          </button>
        </form>

        {/* Side panel */}
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}
        >
          {/* From account card */}
          {sourceAccount && (
            <div className="app-card-dark">
              <p
                style={{
                  fontSize: '0.75rem',
                  color: 'rgba(255,255,255,0.5)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  fontWeight: 700,
                  marginBottom: '0.5rem'
                }}
              >
                From
              </p>
              <p style={{ fontWeight: 700, fontSize: '1.0625rem' }}>
                {sourceAccount.nickname}
              </p>
              <p
                style={{
                  fontSize: '0.8125rem',
                  color: 'rgba(255,255,255,0.55)',
                  marginTop: '0.25rem',
                  marginBottom: '0.875rem',
                  fontFamily: 'monospace'
                }}
              >
                {sourceAccount.accountNumberMasked}
              </p>
              <p
                style={{
                  fontSize: '1.875rem',
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  lineHeight: 1
                }}
              >
                {sourceAccount.balanceDisplay}
              </p>
              {isFrozen && (
                <div
                  style={{
                    marginTop: '0.875rem',
                    padding: '0.5rem 0.875rem',
                    borderRadius: '0.625rem',
                    background: 'rgba(239,68,68,0.25)',
                    fontSize: '0.8125rem',
                    fontWeight: 600
                  }}
                >
                  Frozen — cannot send
                </div>
              )}
            </div>
          )}

          {/* Engine info */}
          <div className="app-card-soft">
            <p
              style={{
                fontSize: '0.8125rem',
                fontWeight: 700,
                color: '#065f46',
                marginBottom: '0.875rem'
              }}
            >
              Transfer Engine Active
            </p>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}
            >
              {[
                'Atomic DB transaction',
                'Row-level balance locks',
                'Double-entry ledger',
                'Idempotency protection',
                'Overdraft prevention'
              ].map((item) => (
                <div
                  key={item}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.8125rem',
                    color: '#047857'
                  }}
                >
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      background: 'rgba(16,185,129,0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.6875rem',
                      flexShrink: 0
                    }}
                  >
                    ✓
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Quick beneficiaries */}
          {activeBeneficiaries.length > 0 && (
            <div className="app-card" style={{ padding: '1.375rem' }}>
              <p
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#6b7a90',
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  marginBottom: '0.875rem'
                }}
              >
                Quick Select
              </p>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}
              >
                {activeBeneficiaries.slice(0, 4).map((b) => {
                  const isSelected =
                    form.beneficiaryId === String(b.id) &&
                    form.destType === 'beneficiary'
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        set('destType', 'beneficiary')
                        set('beneficiaryId', String(b.id))
                        clearErr('beneficiaryId')
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.625rem 0.875rem',
                        borderRadius: '0.75rem',
                        border: `1px solid ${isSelected ? 'rgba(8,127,122,0.3)' : '#e7edf1'}`,
                        background: isSelected ? '#f0faf9' : '#fff',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s'
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: isSelected
                            ? 'rgba(8,127,122,0.15)'
                            : '#f1f5f8',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.875rem',
                          fontWeight: 700,
                          color: '#087f7a',
                          flexShrink: 0
                        }}
                      >
                        {b.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p
                          style={{
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            color: '#071f2a',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {b.name}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: '#6b7a90' }}>
                          {b.bankName}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
