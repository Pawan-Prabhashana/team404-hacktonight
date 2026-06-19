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
    id: 'cable',
    name: 'Cable TV',
    logo: '/billers/cable-tv.png',
    category: 'Entertainment'
  },
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
    <AppShell>
      <main className="flex-1 overflow-y-auto px-6 py-6 md:px-8">
        <div className="mb-6">
          <h1
            className="text-2xl font-extrabold"
            style={{ color: 'var(--serandib-navy)' }}
          >
            Pay Bills
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: 'var(--serandib-muted)' }}
          >
            Utilities, telecom, insurance, and more
          </p>
        </div>

        {/* Bill Radar preview */}
        <div
          className="mb-6 flex items-start gap-3 rounded-2xl p-4"
          style={{
            background: 'rgba(10,99,255,0.06)',
            border: '1px solid var(--serandib-border)'
          }}
        >
          <span className="text-2xl">⚡</span>
          <div>
            <p
              className="font-semibold text-sm"
              style={{ color: 'var(--serandib-navy)' }}
            >
              Bill Radar
            </p>
            <p
              className="text-xs mt-0.5"
              style={{ color: 'var(--serandib-muted)' }}
            >
              We will detect recurring bills and forecast your balance after
              payments — coming in the next intelligence update.
            </p>
          </div>
          <span className="serandib-pill serandib-pill-blue ml-auto shrink-0 text-xs">
            Soon
          </span>
        </div>

        {screen === 'select' && (
          <div className="serandib-card p-6">
            {/* Categories */}
            <div className="mb-4 flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setActiveCategory(c)}
                  className="rounded-full px-4 py-1.5 text-xs font-semibold transition-all"
                  style={
                    activeCategory === c
                      ? { background: 'var(--serandib-blue)', color: 'white' }
                      : {
                          background: 'rgba(10,99,255,0.06)',
                          color: 'var(--serandib-blue)',
                          border: '1px solid var(--serandib-border)'
                        }
                  }
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
              {filtered.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    setSelected(b)
                    setScreen('form')
                  }}
                  className="flex flex-col items-center gap-2 rounded-2xl p-3 transition-all hover:-translate-y-1 hover:shadow-md"
                  style={{
                    border: '1px solid var(--serandib-border)',
                    background: 'white'
                  }}
                >
                  <div
                    className="relative h-12 w-12 overflow-hidden rounded-full border"
                    style={{ borderColor: 'var(--serandib-border)' }}
                  >
                    <Image
                      src={b.logo}
                      alt={b.name}
                      fill
                      style={{ objectFit: 'contain' }}
                    />
                  </div>
                  <span
                    className="text-center text-xs font-medium leading-tight"
                    style={{ color: 'var(--serandib-navy)' }}
                  >
                    {b.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {screen === 'form' && selected && (
          <div className="serandib-card max-w-lg p-6">
            <button
              type="button"
              onClick={() => setScreen('select')}
              className="mb-4 flex items-center gap-1 text-sm font-medium hover:underline"
              style={{ color: 'var(--serandib-blue)' }}
            >
              ← Back to billers
            </button>

            <div className="mb-5 flex items-center gap-3">
              <div
                className="relative h-10 w-10 overflow-hidden rounded-xl border"
                style={{ borderColor: 'var(--serandib-border)' }}
              >
                <Image
                  src={selected.logo}
                  alt={selected.name}
                  fill
                  style={{ objectFit: 'contain' }}
                />
              </div>
              <div>
                <p
                  className="font-bold"
                  style={{ color: 'var(--serandib-navy)' }}
                >
                  {selected.name}
                </p>
                <p
                  className="text-xs"
                  style={{ color: 'var(--serandib-muted)' }}
                >
                  {selected.category}
                </p>
              </div>
            </div>

            <div className="space-y-4">
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
                  placeholder: 'Enter bill ID',
                  key: 'billId'
                }
              ].map((f) => (
                <div key={f.id}>
                  <label
                    className="mb-1.5 block text-sm font-medium"
                    style={{ color: 'var(--serandib-muted)' }}
                  >
                    {f.label}
                  </label>
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
                    className="serandib-input"
                  />
                  {errors[f.key] && (
                    <p
                      className="mt-1 text-xs"
                      style={{ color: 'var(--serandib-danger)' }}
                    >
                      {errors[f.key]}
                    </p>
                  )}
                </div>
              ))}

              <div>
                <label
                  className="mb-1.5 block text-sm font-medium"
                  style={{ color: 'var(--serandib-muted)' }}
                >
                  Due amount (LKR)
                </label>
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
                  className="serandib-input"
                />
                {errors.amount && (
                  <p
                    className="mt-1 text-xs"
                    style={{ color: 'var(--serandib-danger)' }}
                  >
                    {errors.amount}
                  </p>
                )}
              </div>

              <div>
                <label
                  className="mb-1.5 block text-sm font-medium"
                  style={{ color: 'var(--serandib-muted)' }}
                >
                  Remarks (optional)
                </label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Optional"
                  className="serandib-input"
                />
              </div>

              <div
                className="rounded-xl p-3 text-xs"
                style={{
                  background: 'rgba(245,158,11,0.07)',
                  color: '#92400e',
                  border: '1px solid rgba(245,158,11,0.2)'
                }}
              >
                ⚠ Bill payment execution is in demo mode. Actual deductions
                require the Phase 6 ledger engine.
              </div>

              <button
                type="button"
                onClick={handlePay}
                className="serandib-button-primary w-full py-3.5"
              >
                Pay Now
              </button>
            </div>
          </div>
        )}

        {screen === 'success' && (
          <div className="serandib-card max-w-sm mx-auto p-8 text-center">
            <div
              className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full text-3xl"
              style={{ background: 'rgba(16,185,129,0.1)' }}
            >
              ✅
            </div>
            <h2
              className="mb-2 text-xl font-bold"
              style={{ color: 'var(--serandib-navy)' }}
            >
              Payment Submitted
            </h2>
            <p
              className="text-sm mb-1"
              style={{ color: 'var(--serandib-muted)' }}
            >
              Confirmation number:
            </p>
            <p
              className="mb-4 font-mono font-bold text-lg"
              style={{ color: 'var(--serandib-blue)' }}
            >
              #{confirmation}
            </p>
            <p
              className="text-xs mb-5"
              style={{ color: 'var(--serandib-muted)' }}
            >
              This is a demo confirmation. Actual balance deduction will occur
              after the Phase 6 ledger upgrade.
            </p>
            <button
              type="button"
              onClick={reset}
              className="serandib-button-primary px-8 py-2.5"
            >
              Pay Another Bill
            </button>
          </div>
        )}
      </main>
    </AppShell>
  )
}
