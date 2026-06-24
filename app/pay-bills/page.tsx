'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import AppShell from '@/components/layout/AppShell'
import EmptyState from '@/components/ui/EmptyState'
import LoadingState from '@/components/ui/LoadingState'
import {
  AuthError,
  type BillPaymentReceipt,
  createBillPayment,
  fetchAccounts,
  fetchBillers,
  fetchBillPayments,
  type SafeAccount,
  type SafeBiller,
  type SafeBillPayment
} from '@/lib/banking-client'
import { analyzeBillRadar, formatDueDate } from '@/lib/bill-radar'

type Screen = 'select' | 'form' | 'success'

const CATEGORY_LABELS: Record<string, string> = {
  utilities: 'Utilities',
  mobile: 'Mobile',
  internet: 'Internet',
  insurance: 'Insurance',
  education: 'Education',
  government: 'Government',
  credit_card: 'Credit Card',
  other: 'Other'
}

function categoryLabel(c: string): string {
  return CATEGORY_LABELS[c] ?? c.charAt(0).toUpperCase() + c.slice(1)
}

function BillerAvatar({
  biller,
  size = 48
}: {
  biller: SafeBiller
  size?: number
}) {
  if (biller.logoUrl) {
    return (
      <div
        style={{
          position: 'relative',
          width: size,
          height: size,
          borderRadius: '50%',
          overflow: 'hidden',
          border: '1px solid #f1f5f8',
          flexShrink: 0
        }}
      >
        <Image
          src={biller.logoUrl}
          alt={biller.name}
          fill
          style={{ objectFit: 'contain' }}
        />
      </div>
    )
  }
  const initials = biller.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'rgba(8,127,122,0.12)',
        color: '#087f7a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: size * 0.32,
        flexShrink: 0
      }}
    >
      {initials}
    </div>
  )
}

export default function PayBillsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [screen, setScreen] = useState<Screen>('select')
  const [dataLoading, setDataLoading] = useState(true)

  const [accounts, setAccounts] = useState<SafeAccount[]>([])
  const [billers, setBillers] = useState<SafeBiller[]>([])
  const [history, setHistory] = useState<SafeBillPayment[]>([])

  const [selected, setSelected] = useState<SafeBiller | null>(null)
  const [accountId, setAccountId] = useState<number | null>(null)
  const [billReference, setBillReference] = useState('')
  const [amount, setAmount] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [receipt, setReceipt] = useState<BillPaymentReceipt | null>(null)

  // ── Auth guard + initial load ────────────────────────────
  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push('/login?next=/pay-bills')
      return
    }
    let cancelled = false
    async function load() {
      setDataLoading(true)
      try {
        const [accts, blrs, hist] = await Promise.all([
          fetchAccounts(),
          fetchBillers(),
          fetchBillPayments({ limit: 50 })
        ])
        if (cancelled) return
        setAccounts(accts)
        setBillers(blrs)
        setHistory(hist.billPayments)
        const firstActive = accts.find((a) => a.status === 'active') ?? accts[0]
        if (firstActive) setAccountId(firstActive.id)
      } catch (err) {
        if (err instanceof AuthError) router.push('/login?next=/pay-bills')
      } finally {
        if (!cancelled) setDataLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [authLoading, user, router])

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(billers.map((b) => b.category)))],
    [billers]
  )
  const filteredBillers =
    activeCategory === 'All'
      ? billers
      : billers.filter((b) => b.category === activeCategory)

  const selectedAccount = accounts.find((a) => a.id === accountId) ?? null

  const radar = useMemo(
    () => analyzeBillRadar(history, selectedAccount?.balanceMinorUnits),
    [history, selectedAccount]
  )

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (accountId == null) e.account = 'Select an account to pay from'
    if (!billReference.trim() || billReference.trim().length < 3)
      e.billReference = 'Bill reference must be at least 3 characters'
    if (!amount.trim() || Number.isNaN(Number(amount)) || Number(amount) <= 0)
      e.amount = 'Enter a valid amount'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function refreshAfterPayment() {
    try {
      const [accts, hist] = await Promise.all([
        fetchAccounts(),
        fetchBillPayments({ limit: 50 })
      ])
      setAccounts(accts)
      setHistory(hist.billPayments)
    } catch {
      /* non-fatal */
    }
  }

  async function handlePay() {
    setSubmitError('')
    if (!selected || accountId == null) return
    if (selectedAccount && selectedAccount.status !== 'active') {
      setSubmitError(
        'This account is frozen and cannot be used to pay bills. Choose another account.'
      )
      return
    }
    if (!validate()) return

    setSubmitting(true)
    try {
      const r = await createBillPayment({
        accountId,
        billerId: selected.id,
        billReference: billReference.trim(),
        amount
      })
      // Only update UI after the API confirms success — no optimistic mutation.
      setReceipt(r)
      setScreen('success')
      await refreshAfterPayment()
    } catch (err) {
      if (err instanceof AuthError) {
        router.push('/login?next=/pay-bills')
        return
      }
      setSubmitError(
        err instanceof Error ? err.message : 'Bill payment failed. Try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  function reset() {
    setScreen('select')
    setSelected(null)
    setBillReference('')
    setAmount('')
    setErrors({})
    setSubmitError('')
    setReceipt(null)
  }

  function fmtDate(iso: string | null): string {
    if (!iso) return '—'
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (authLoading || dataLoading) {
    return (
      <AppShell
        title="Pay Bills"
        subtitle="Utilities, telecom, insurance, and more"
      >
        <LoadingState />
      </AppShell>
    )
  }

  return (
    <AppShell
      title="Pay Bills"
      subtitle="Utilities, telecom, insurance, and more"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        {/* ── Bill Radar preview ─────────────────────────── */}
        <div className="app-card-soft">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: radar.recurring.length > 0 ? '1.25rem' : 0
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '0.875rem',
                background: 'rgba(8,127,122,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#087f7a',
                flexShrink: 0,
                fontSize: '1.25rem'
              }}
            >
              ⚡
            </div>
            <div style={{ flex: 1 }}>
              <p
                style={{
                  fontWeight: 700,
                  color: '#071f2a',
                  fontSize: '0.9375rem'
                }}
              >
                Bill Radar preview
              </p>
              <p
                style={{
                  color: '#6b7a90',
                  fontSize: '0.8125rem',
                  marginTop: '0.125rem',
                  lineHeight: 1.5
                }}
              >
                {radar.recurring.length > 0
                  ? `We found ${radar.recurring.length} recurring payment${radar.recurring.length !== 1 ? 's' : ''} in your history.`
                  : 'Pay a bill twice and we will start detecting recurring payments for you.'}
              </p>
            </div>
            <span className="app-pill app-pill-teal" style={{ flexShrink: 0 }}>
              Smart preview
            </span>
          </div>

          {radar.recurring.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '0.875rem'
              }}
            >
              {radar.recurring.map((r) => (
                <div
                  key={r.key}
                  style={{
                    padding: '1rem',
                    borderRadius: '0.875rem',
                    border: '1px solid #e7edf1',
                    background: '#fff'
                  }}
                >
                  <p
                    style={{
                      fontWeight: 700,
                      color: '#071f2a',
                      fontSize: '0.875rem'
                    }}
                  >
                    {r.billerName}
                  </p>
                  <p
                    style={{
                      fontSize: '0.75rem',
                      color: '#6b7a90',
                      marginTop: '0.125rem'
                    }}
                  >
                    Ref {r.billReference} · {r.occurrences} payments
                  </p>
                  <div
                    style={{
                      marginTop: '0.625rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem',
                      fontSize: '0.8125rem',
                      color: '#374151'
                    }}
                  >
                    <span>
                      Next likely bill:{' '}
                      <strong>around {formatDueDate(r.nextDueEstimate)}</strong>
                    </span>
                    <span>
                      Estimated amount: <strong>{r.averageDisplay}</strong>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {radar.lowBalanceWarning && (
            <div
              style={{
                marginTop: '1rem',
                padding: '0.75rem 1rem',
                borderRadius: '0.75rem',
                background: 'rgba(245,158,11,0.08)',
                border: '1px solid rgba(245,158,11,0.25)',
                fontSize: '0.8125rem',
                color: '#92400e',
                lineHeight: 1.5
              }}
            >
              Balance impact warning: paying your recurring bills (~
              {radar.totalMonthlyDisplay}) would leave{' '}
              {selectedAccount?.nickname || 'this account'} running low.
              Consider topping up first.
            </div>
          )}
        </div>

        {/* ── Biller select ──────────────────────────────── */}
        {screen === 'select' && (
          <div className="app-card">
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.5rem',
                marginBottom: '1.5rem'
              }}
            >
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setActiveCategory(c)}
                  className={
                    activeCategory === c
                      ? 'app-button-primary'
                      : 'app-button-ghost'
                  }
                  style={{
                    height: 36,
                    padding: '0 1rem',
                    fontSize: '0.8125rem'
                  }}
                >
                  {c === 'All' ? 'All' : categoryLabel(c)}
                </button>
              ))}
            </div>

            {filteredBillers.length === 0 ? (
              <EmptyState
                title="No billers available"
                description="Billers will appear here once configured."
              />
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                  gap: '1rem'
                }}
              >
                {filteredBillers.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      setSelected(b)
                      setErrors({})
                      setSubmitError('')
                      setScreen('form')
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.625rem',
                      padding: '1.25rem 0.75rem',
                      borderRadius: '1rem',
                      border: '1.5px solid #e7edf1',
                      background: '#fff',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={(e) => {
                      ;(
                        e.currentTarget as HTMLButtonElement
                      ).style.borderColor = '#0d9488'
                      ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
                        '0 4px 14px rgba(8,127,122,0.1)'
                    }}
                    onMouseLeave={(e) => {
                      ;(
                        e.currentTarget as HTMLButtonElement
                      ).style.borderColor = '#e7edf1'
                      ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
                        'none'
                    }}
                  >
                    <BillerAvatar biller={b} />
                    <span
                      style={{
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: '#071f2a',
                        textAlign: 'center',
                        lineHeight: 1.3
                      }}
                    >
                      {b.name}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
                      {categoryLabel(b.category)}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Recent bill payments */}
            <div style={{ marginTop: '2rem' }}>
              <div className="app-section-header">
                <h2 className="app-section-title" style={{ marginBottom: 0 }}>
                  Recent bill payments
                </h2>
              </div>
              {history.length === 0 ? (
                <EmptyState
                  title="No bill payments yet"
                  description="Your paid bills will appear here."
                />
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}
                >
                  {history.slice(0, 8).map((p) => (
                    <div
                      key={p.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        padding: '0.75rem 1rem',
                        borderRadius: '0.75rem',
                        border: '1px solid #f1f5f8',
                        background: '#fafcfc'
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <p
                          style={{
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            color: '#071f2a'
                          }}
                        >
                          {p.billerName}
                        </p>
                        <p
                          style={{
                            fontSize: '0.75rem',
                            color: '#6b7a90',
                            marginTop: '0.125rem'
                          }}
                        >
                          Ref {p.billReference} ·{' '}
                          {fmtDate(p.paidAt ?? p.createdAt)}
                          <span
                            style={{
                              fontFamily: 'monospace',
                              marginLeft: '0.5rem',
                              fontSize: '0.7rem'
                            }}
                          >
                            {p.reference}
                          </span>
                        </p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p
                          style={{
                            fontSize: '0.9rem',
                            fontWeight: 700,
                            color: '#071f2a'
                          }}
                        >
                          −{p.amountDisplay}
                        </p>
                        <span
                          className="app-pill app-pill-green"
                          style={{ marginTop: '0.25rem' }}
                        >
                          {p.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Payment form ───────────────────────────────── */}
        {screen === 'form' && selected && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0,1.2fr) minmax(280px,0.8fr)',
              gap: '1.5rem',
              alignItems: 'start'
            }}
          >
            <div className="app-card">
              <button
                type="button"
                onClick={() => setScreen('select')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#087f7a',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  marginBottom: '1.5rem',
                  padding: 0
                }}
              >
                ← Back to billers
              </button>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  marginBottom: '1.75rem',
                  paddingBottom: '1.25rem',
                  borderBottom: '1px solid #f1f5f8'
                }}
              >
                <BillerAvatar biller={selected} size={44} />
                <div>
                  <p style={{ fontWeight: 700, color: '#071f2a' }}>
                    {selected.name}
                  </p>
                  <p
                    style={{
                      fontSize: '0.8125rem',
                      color: '#6b7a90',
                      marginTop: '0.125rem'
                    }}
                  >
                    {categoryLabel(selected.category)}
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.25rem'
                }}
              >
                {/* Account selector */}
                <div>
                  <label className="app-label" htmlFor="pay-account">
                    Pay from account
                  </label>
                  <select
                    id="pay-account"
                    value={accountId ?? ''}
                    onChange={(e) => {
                      setAccountId(Number(e.target.value))
                      setErrors((p) => {
                        const n = { ...p }
                        delete n.account
                        return n
                      })
                      setSubmitError('')
                    }}
                    className={`app-input${errors.account ? ' app-input-error' : ''}`}
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nickname || a.accountName} · {a.accountNumberMasked}{' '}
                        · {a.balanceDisplay}
                        {a.status !== 'active' ? ' (frozen)' : ''}
                      </option>
                    ))}
                  </select>
                  {errors.account && (
                    <p className="app-error-msg">{errors.account}</p>
                  )}
                  {selectedAccount && selectedAccount.status !== 'active' && (
                    <p className="app-error-msg">
                      This account is frozen and cannot pay bills.
                    </p>
                  )}
                </div>

                {/* Bill reference */}
                <div>
                  <label className="app-label" htmlFor="bill-ref">
                    Bill reference
                  </label>
                  <input
                    id="bill-ref"
                    type="text"
                    value={billReference}
                    onChange={(e) => {
                      setBillReference(e.target.value)
                      setErrors((p) => {
                        const n = { ...p }
                        delete n.billReference
                        return n
                      })
                    }}
                    placeholder="e.g. 123456789"
                    className={`app-input${errors.billReference ? ' app-input-error' : ''}`}
                  />
                  {errors.billReference && (
                    <p className="app-error-msg">{errors.billReference}</p>
                  )}
                </div>

                {/* Amount */}
                <div>
                  <label className="app-label" htmlFor="bill-amount">
                    Amount (LKR)
                  </label>
                  <input
                    id="bill-amount"
                    type="number"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value)
                      setErrors((p) => {
                        const n = { ...p }
                        delete n.amount
                        return n
                      })
                    }}
                    placeholder="0.00"
                    min="0.01"
                    step="0.01"
                    className={`app-input${errors.amount ? ' app-input-error' : ''}`}
                    style={{ fontSize: '1.25rem', fontWeight: 700 }}
                  />
                  {errors.amount && (
                    <p className="app-error-msg">{errors.amount}</p>
                  )}
                </div>

                {submitError && (
                  <div
                    style={{
                      padding: '0.875rem 1.125rem',
                      borderRadius: '0.875rem',
                      background: 'rgba(239,68,68,0.06)',
                      border: '1px solid rgba(239,68,68,0.25)',
                      fontSize: '0.8125rem',
                      color: '#b91c1c',
                      lineHeight: 1.6
                    }}
                  >
                    {submitError}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handlePay}
                  disabled={
                    submitting ||
                    (selectedAccount != null &&
                      selectedAccount.status !== 'active')
                  }
                  className="app-button-primary"
                  style={{
                    width: '100%',
                    fontSize: '1rem',
                    fontWeight: 700,
                    opacity: submitting ? 0.7 : 1,
                    cursor: submitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  {submitting ? 'Processing…' : 'Pay Now'}
                </button>
              </div>
            </div>

            {/* Review summary */}
            <div className="app-card-soft">
              <p
                style={{
                  fontWeight: 700,
                  color: '#071f2a',
                  marginBottom: '1rem',
                  fontSize: '0.9375rem'
                }}
              >
                Payment summary
              </p>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  fontSize: '0.875rem'
                }}
              >
                {[
                  ['Biller', selected.name],
                  ['Category', categoryLabel(selected.category)],
                  [
                    'From',
                    selectedAccount
                      ? `${selectedAccount.nickname || selectedAccount.accountName} (${selectedAccount.accountNumberMasked})`
                      : '—'
                  ],
                  ['Bill reference', billReference.trim() || '—'],
                  [
                    'Amount',
                    amount && Number(amount) > 0
                      ? `LKR ${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : '—'
                  ]
                ].map(([label, val]) => (
                  <div
                    key={label}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '1rem'
                    }}
                  >
                    <span style={{ color: '#6b7a90' }}>{label}</span>
                    <span
                      style={{
                        color: '#071f2a',
                        fontWeight: 600,
                        textAlign: 'right'
                      }}
                    >
                      {val}
                    </span>
                  </div>
                ))}
              </div>
              <p
                style={{
                  marginTop: '1rem',
                  fontSize: '0.75rem',
                  color: '#9ca3af',
                  lineHeight: 1.6
                }}
              >
                Funds are deducted from your account in real time and recorded
                in the ledger. Duplicate submissions are blocked automatically.
              </p>
            </div>
          </div>
        )}

        {/* ── Success / receipt ──────────────────────────── */}
        {screen === 'success' && receipt && (
          <div style={{ maxWidth: 460, margin: '0 auto', width: '100%' }}>
            <div
              className="app-card"
              style={{
                padding: '2.25rem',
                border: '1.5px solid rgba(16,185,129,0.2)'
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: 'rgba(16,185,129,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem',
                    color: '#059669',
                    fontSize: '1.5rem',
                    fontWeight: 800
                  }}
                >
                  ✓
                </div>
                <h2
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: '#071f2a'
                  }}
                >
                  Bill payment complete
                </h2>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  fontSize: '0.875rem'
                }}
              >
                {[
                  ['Reference', receipt.reference],
                  ['Biller', receipt.billerName],
                  ['Bill reference', receipt.billReference],
                  ['Amount', receipt.amountDisplay],
                  [
                    'Paid from account',
                    selectedAccount
                      ? `${selectedAccount.nickname || selectedAccount.accountName} (${selectedAccount.accountNumberMasked})`
                      : `#${receipt.accountId}`
                  ],
                  ['Date / time', fmtDate(receipt.paidAt)],
                  ['Remaining balance', receipt.balanceAfterDisplay]
                ].map(([label, val]) => (
                  <div
                    key={label}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '1rem',
                      paddingBottom: '0.5rem',
                      borderBottom: '1px solid #f5f8fa'
                    }}
                  >
                    <span style={{ color: '#6b7a90' }}>{label}</span>
                    <span
                      style={{
                        color: '#071f2a',
                        fontWeight: 600,
                        textAlign: 'right',
                        fontFamily:
                          label === 'Reference' ? 'monospace' : undefined
                      }}
                    >
                      {val}
                    </span>
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  justifyContent: 'center',
                  marginTop: '1.75rem'
                }}
              >
                <button
                  type="button"
                  onClick={reset}
                  className="app-button-primary"
                >
                  Pay another bill
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
