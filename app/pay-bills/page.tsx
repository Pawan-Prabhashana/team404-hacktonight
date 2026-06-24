'use client'

import Image from 'next/image'
import { useState } from 'react'
import AppShell from '@/components/layout/AppShell'

type Biller = { id: string; name: string; logo: string; category: string }

const billers: Biller[] = [
  {
    id: 'water',
    name: 'Water Board',
    logo: '/billers/water-board.png',
    category: 'Utility'
  },
  { id: 'ceb', name: 'CEB', logo: '/billers/ceb.png', category: 'Utility' },
  {
    id: 'dialog',
    name: 'Dialog',
    logo: '/billers/dialog.png',
    category: 'Telecom'
  },
  {
    id: 'slt',
    name: 'Sri Lanka Telecom',
    logo: '/billers/electricity.png',
    category: 'Telecom'
  },
  {
    id: 'airtel',
    name: 'Airtel',
    logo: '/billers/airtel.png',
    category: 'Telecom'
  },
  {
    id: 'hutch',
    name: 'Hutch',
    logo: '/billers/hutch.png',
    category: 'Telecom'
  },
  {
    id: 'peotv',
    name: 'PEO TV',
    logo: '/billers/mpesa.png',
    category: 'Entertainment'
  },
  {
    id: 'cable',
    name: 'Cable TV',
    logo: '/billers/cable-tv.png',
    category: 'Entertainment'
  },
  {
    id: 'aia',
    name: 'AIA Insurance',
    logo: '/billers/aia.png',
    category: 'Insurance'
  },
  {
    id: 'lolc',
    name: 'LOLC Finance',
    logo: '/billers/lolc.png',
    category: 'Finance'
  },
  { id: 'hsbc', name: 'HSBC', logo: '/billers/hsbc.png', category: 'Bank' },
  {
    id: 'insurance',
    name: 'Insurance',
    logo: '/billers/insurance2.png',
    category: 'Insurance'
  }
]

type Screen = 'select' | 'form' | 'success'

export default function PayBillsPage() {
  const [screen, setScreen] = useState<Screen>('select')
  const [selected, setSelected] = useState<Biller | null>(null)
  const [accountNumber, setAccountNumber] = useState('')
  const [billId, setBillId] = useState('')
  const [amount, setAmount] = useState('')
  const [remarks, setRemarks] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [confirmation, setConfirmation] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')

  const categories = [
    'All',
    ...Array.from(new Set(billers.map((b) => b.category)))
  ]
  const filtered =
    activeCategory === 'All'
      ? billers
      : billers.filter((b) => b.category === activeCategory)

  function validate() {
    const e: Record<string, string> = {}
    if (!accountNumber.trim() || !/^\d{6,16}$/.test(accountNumber.trim()))
      e.accountNumber = 'Enter a valid account number (6–16 digits)'
    if (!billId.trim() || billId.trim().length < 3)
      e.billId = 'Bill ID must be at least 3 characters'
    if (!amount.trim() || Number.isNaN(Number(amount)) || Number(amount) <= 0)
      e.amount = 'Enter a valid amount'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handlePay() {
    if (!validate()) return
    setConfirmation(Math.floor(10000000 + Math.random() * 90000000).toString())
    setScreen('success')
  }

  function reset() {
    setScreen('select')
    setSelected(null)
    setAccountNumber('')
    setBillId('')
    setAmount('')
    setRemarks('')
    setErrors({})
  }

  return (
    <AppShell
      title="Pay Bills"
      subtitle="Utilities, telecom, insurance, and more"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        {/* Bill Radar info card */}
        <div
          className="app-card-soft"
          style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem' }}
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
              Bill Radar
            </p>
            <p
              style={{
                color: '#6b7a90',
                fontSize: '0.875rem',
                marginTop: '0.25rem',
                lineHeight: 1.6
              }}
            >
              We will automatically detect recurring bills and forecast your
              account balance after payments — coming in the next intelligence
              update.
            </p>
          </div>
          <span className="app-pill app-pill-teal" style={{ flexShrink: 0 }}>
            Coming soon
          </span>
        </div>

        {/* Biller select */}
        {screen === 'select' && (
          <div className="app-card">
            {/* Category pills */}
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
                  {c}
                </button>
              ))}
            </div>

            {/* Biller grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                gap: '1rem'
              }}
            >
              {filtered.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    setSelected(b)
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
                    ;(e.currentTarget as HTMLButtonElement).style.borderColor =
                      '#0d9488'
                    ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
                      '0 4px 14px rgba(8,127,122,0.1)'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLButtonElement).style.borderColor =
                      '#e7edf1'
                    ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
                      'none'
                  }}
                >
                  <div
                    style={{
                      position: 'relative',
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      overflow: 'hidden',
                      border: '1px solid #f1f5f8'
                    }}
                  >
                    <Image
                      src={b.logo}
                      alt={b.name}
                      fill
                      style={{ objectFit: 'contain' }}
                    />
                  </div>
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
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Payment form */}
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
                <div
                  style={{
                    position: 'relative',
                    width: 44,
                    height: 44,
                    borderRadius: '0.75rem',
                    overflow: 'hidden',
                    border: '1px solid #e7edf1',
                    flexShrink: 0
                  }}
                >
                  <Image
                    src={selected.logo}
                    alt={selected.name}
                    fill
                    style={{ objectFit: 'contain' }}
                  />
                </div>
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
                    {selected.category}
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
                {[
                  {
                    id: 'acc',
                    label: 'Account number',
                    val: accountNumber,
                    set: setAccountNumber,
                    placeholder: 'Enter account number',
                    key: 'accountNumber'
                  },
                  {
                    id: 'bid',
                    label: 'Bill ID',
                    val: billId,
                    set: setBillId,
                    placeholder: 'Enter bill reference',
                    key: 'billId'
                  }
                ].map((f) => (
                  <div key={f.id}>
                    <label className="app-label">{f.label}</label>
                    <input
                      type="text"
                      value={f.val}
                      onChange={(e) => {
                        f.set(e.target.value)
                        setErrors((p) => {
                          const n = { ...p }
                          delete n[f.key]
                          return n
                        })
                      }}
                      placeholder={f.placeholder}
                      className={`app-input${errors[f.key] ? ' app-input-error' : ''}`}
                    />
                    {errors[f.key] && (
                      <p className="app-error-msg">{errors[f.key]}</p>
                    )}
                  </div>
                ))}

                <div>
                  <label className="app-label">Amount (LKR)</label>
                  <input
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

                <div>
                  <label className="app-label">
                    Remarks{' '}
                    <span style={{ fontWeight: 400, color: '#9ca3af' }}>
                      (optional)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Optional note"
                    className="app-input"
                  />
                </div>

                <div
                  style={{
                    padding: '0.875rem 1.125rem',
                    borderRadius: '0.875rem',
                    background: 'rgba(245,158,11,0.06)',
                    border: '1px solid rgba(245,158,11,0.2)',
                    fontSize: '0.8125rem',
                    color: '#92400e',
                    lineHeight: 1.6
                  }}
                >
                  Bill payment is in demo mode. No funds are deducted from your
                  account.
                </div>

                <button
                  type="button"
                  onClick={handlePay}
                  className="app-button-primary"
                  style={{ width: '100%', fontSize: '1rem', fontWeight: 700 }}
                >
                  Pay Now
                </button>
              </div>
            </div>

            {/* Info sidebar */}
            <div className="app-card-soft">
              <p
                style={{
                  fontWeight: 700,
                  color: '#071f2a',
                  marginBottom: '1rem',
                  fontSize: '0.9375rem'
                }}
              >
                Payment Info
              </p>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.875rem',
                  fontSize: '0.875rem',
                  color: '#374151'
                }}
              >
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span
                    style={{ color: '#087f7a', flexShrink: 0, fontWeight: 700 }}
                  >
                    ✓
                  </span>
                  Instant payment confirmation
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span
                    style={{ color: '#087f7a', flexShrink: 0, fontWeight: 700 }}
                  >
                    ✓
                  </span>
                  Secure channel — no card data stored
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span
                    style={{ color: '#087f7a', flexShrink: 0, fontWeight: 700 }}
                  >
                    ✓
                  </span>
                  Receipt emailed automatically
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success */}
        {screen === 'success' && (
          <div style={{ maxWidth: 440, margin: '0 auto', width: '100%' }}>
            <div
              className="app-card"
              style={{
                textAlign: 'center',
                padding: '2.5rem',
                border: '1.5px solid rgba(16,185,129,0.2)'
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'rgba(16,185,129,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem',
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
                Payment Submitted
              </h2>
              <p
                style={{
                  color: '#6b7a90',
                  fontSize: '0.875rem',
                  marginTop: '0.5rem',
                  marginBottom: '1.5rem'
                }}
              >
                Your {selected?.name} bill payment has been submitted.
                <br />
                Confirmation:{' '}
                <strong style={{ fontFamily: 'monospace', color: '#071f2a' }}>
                  {confirmation}
                </strong>
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
                  onClick={reset}
                  className="app-button-primary"
                >
                  Pay Another Bill
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
