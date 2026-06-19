'use client'

import { useEffect, useState } from 'react'
import AppShell from '@/components/layout/AppShell'
import { AuthError } from '@/lib/banking-client'
import type {
  InvisibleSavingsSummary,
  InvisibleSavingsSettings,
  PartnerPurchaseReceipt,
  InvisibleSavingsSweepReceipt,
  SafePartnerMerchant,
  SafeAccount
} from '@/lib/banking-client'
import {
  fetchPartnerMerchants,
  fetchInvisibleSavingsSummary,
  fetchInvisibleSavingsSettings,
  updateInvisibleSavingsSettings,
  simulatePartnerPurchase,
  sweepInvisibleSavings,
  fetchAccounts
} from '@/lib/banking-client'
import { useRouter } from 'next/navigation'

// ---------------------------------------------------------------------------
// Partner badge (initials fallback — no external logos)
// ---------------------------------------------------------------------------

const PARTNER_COLORS: Record<string, string> = {
  barista: '#7B3F00',
  'java-lounge': '#2C3E50',
  kfc: '#C0392B',
  'pizza-hut': '#C0392B',
  dominos: '#1A237E',
  'crepe-runner': '#6A1B9A',
  'caravan-fresh': '#2E7D32'
}

function PartnerBadge({ merchant }: { merchant: SafePartnerMerchant }) {
  const initials = merchant.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
  const color = PARTNER_COLORS[merchant.slug] ?? '#374151'

  if (merchant.logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={merchant.logoUrl}
        alt={merchant.name}
        style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover' }}
      />
    )
  }

  return (
    <div
      style={{
        width: 48,
        height: 48,
        borderRadius: 12,
        background: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontWeight: 700,
        fontSize: 16,
        letterSpacing: 1,
        flexShrink: 0
      }}
    >
      {initials}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Preset purchase amounts
// ---------------------------------------------------------------------------

const PRESETS = [
  { label: 'Coffee', amount: '480', desc: 'Coffee at Barista' },
  { label: 'Lunch', amount: '1250', desc: 'Lunch at Java Lounge' },
  { label: 'Pizza', amount: '2430', desc: 'Pizza Hut dinner' },
  { label: 'Dessert', amount: '760', desc: 'Crepe Runner dessert' }
]

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function InvisibleSavingsPage() {
  const router = useRouter()

  const [partners, setPartners] = useState<SafePartnerMerchant[]>([])
  const [accounts, setAccounts] = useState<SafeAccount[]>([])
  const [summary, setSummary] = useState<InvisibleSavingsSummary | null>(null)
  const [settings, setSettings] = useState<InvisibleSavingsSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Purchase form
  const [selectedMerchantId, setSelectedMerchantId] = useState<number | ''>('')
  const [selectedAccountId, setSelectedAccountId] = useState<number | ''>('')
  const [purchaseAmount, setPurchaseAmount] = useState('')
  const [purchaseDesc, setPurchaseDesc] = useState('')
  const [purchasing, setPurchasing] = useState(false)
  const [purchaseReceipt, setPurchaseReceipt] = useState<PartnerPurchaseReceipt | null>(null)
  const [purchaseError, setPurchaseError] = useState<string | null>(null)

  // Settings form
  const [settingsEnabled, setSettingsEnabled] = useState(true)
  const [settingsSrcId, setSettingsSrcId] = useState<number | ''>('')
  const [settingsDstId, setSettingsDstId] = useState<number | ''>('')
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null)

  // Sweep
  const [sweeping, setSweeping] = useState(false)
  const [sweepReceipt, setSweepReceipt] = useState<InvisibleSavingsSweepReceipt | null>(null)
  const [sweepError, setSweepError] = useState<string | null>(null)

  async function loadAll() {
    try {
      const [pts, accts, sum, sett] = await Promise.all([
        fetchPartnerMerchants(),
        fetchAccounts(),
        fetchInvisibleSavingsSummary(),
        fetchInvisibleSavingsSettings()
      ])
      setPartners(pts)
      setAccounts(accts)
      setSummary(sum)
      setSettings(sett)
      if (sett) {
        setSettingsEnabled(sett.enabled)
        setSettingsSrcId(sett.sourceAccountId)
        setSettingsDstId(sett.destinationAccountId)
      }
      if (accts.length > 0 && !selectedAccountId) {
        setSelectedAccountId(accts[0].id)
      }
      if (pts.length > 0 && !selectedMerchantId) {
        setSelectedMerchantId(pts[0].id)
      }
    } catch (err) {
      if (err instanceof AuthError) {
        router.push('/login')
        return
      }
      setError('Failed to load Invisible Savings data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  async function handlePurchase(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedMerchantId || !selectedAccountId || !purchaseAmount) return
    setPurchasing(true)
    setPurchaseError(null)
    setPurchaseReceipt(null)
    try {
      const receipt = await simulatePartnerPurchase({
        partnerMerchantId: Number(selectedMerchantId),
        sourceAccountId: Number(selectedAccountId),
        purchaseAmount,
        description: purchaseDesc || undefined
      })
      setPurchaseReceipt(receipt)
      const [sum, accts] = await Promise.all([
        fetchInvisibleSavingsSummary(),
        fetchAccounts()
      ])
      setSummary(sum)
      setAccounts(accts)
    } catch (err) {
      setPurchaseError(err instanceof Error ? err.message : 'Purchase failed.')
    } finally {
      setPurchasing(false)
    }
  }

  async function handleSweep() {
    setSweeping(true)
    setSweepError(null)
    setSweepReceipt(null)
    try {
      const receipt = await sweepInvisibleSavings()
      setSweepReceipt(receipt)
      const [sum, accts] = await Promise.all([
        fetchInvisibleSavingsSummary(),
        fetchAccounts()
      ])
      setSummary(sum)
      setAccounts(accts)
    } catch (err) {
      setSweepError(err instanceof Error ? err.message : 'Sweep failed.')
    } finally {
      setSweeping(false)
    }
  }

  async function handleSettingsSave(e: React.FormEvent) {
    e.preventDefault()
    if (!settingsSrcId || !settingsDstId) return
    setSettingsSaving(true)
    setSettingsMsg(null)
    try {
      const updated = await updateInvisibleSavingsSettings({
        enabled: settingsEnabled,
        sourceAccountId: Number(settingsSrcId),
        destinationAccountId: Number(settingsDstId)
      })
      setSettings(updated)
      setSettingsMsg('Settings saved.')
    } catch (err) {
      setSettingsMsg(err instanceof Error ? err.message : 'Failed to save settings.')
    } finally {
      setSettingsSaving(false)
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading Invisible Savings...
        </div>
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell>
        <div style={{ padding: '3rem', textAlign: 'center', color: '#ef4444' }}>{error}</div>
      </AppShell>
    )
  }

  const selectedMerchant = partners.find((p) => p.id === Number(selectedMerchantId))

  return (
    <AppShell>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem' }}>
        {/* ── Page header ──────────────────────────────────────────────── */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Invisible Savings
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.4rem', fontSize: '0.95rem' }}>
            Save tiny amounts from everyday partner purchases without feeling it.
          </p>
        </div>

        {/* ── Hero summary card ─────────────────────────────────────────── */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)',
            borderRadius: 16,
            padding: '1.75rem 2rem',
            color: '#fff',
            marginBottom: '2rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '1.5rem'
          }}
        >
          <div>
            <p style={{ margin: 0, fontSize: '0.78rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1 }}>
              Saved this month
            </p>
            <p style={{ margin: '0.3rem 0 0', fontSize: '1.6rem', fontWeight: 800 }}>
              {summary?.capturedThisMonthDisplay ?? 'LKR 0.00'}
            </p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.78rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1 }}>
              Events captured
            </p>
            <p style={{ margin: '0.3rem 0 0', fontSize: '1.6rem', fontWeight: 800 }}>
              {summary?.eventCount ?? 0}
            </p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.78rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1 }}>
              Projected monthly
            </p>
            <p style={{ margin: '0.3rem 0 0', fontSize: '1.6rem', fontWeight: 800 }}>
              {summary?.projectedMonthlySavingDisplay ?? 'LKR 0.00'}
            </p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.78rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1 }}>
              Next sweep
            </p>
            <p style={{ margin: '0.3rem 0 0', fontSize: '1.2rem', fontWeight: 700 }}>
              {summary?.nextSweepDate
                ? new Date(summary.nextSweepDate).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short'
                  })
                : '—'}
            </p>
          </div>
          {summary?.topPartner && (
            <div>
              <p style={{ margin: 0, fontSize: '0.78rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1 }}>
                Top partner
              </p>
              <p style={{ margin: '0.3rem 0 0', fontSize: '1.1rem', fontWeight: 700 }}>
                {summary.topPartner}
              </p>
            </div>
          )}
        </div>

        {/* ── How it works ──────────────────────────────────────────────── */}
        <div
          style={{
            background: 'var(--card-bg, #fff)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: '1.5rem',
            marginBottom: '2rem'
          }}
        >
          <h2 style={{ margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            How it works
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            {[
              { step: '1', text: 'Pay at a partner café or restaurant' },
              { step: '2', text: 'Serandib rounds up LKR 20–50 automatically' },
              { step: '3', text: 'Month-end sweep moves savings to your Savings account' }
            ].map(({ step, text }) => (
              <div
                key={step}
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  alignItems: 'flex-start',
                  padding: '0.75rem',
                  background: 'var(--bg, #f9fafb)',
                  borderRadius: 10
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: '#0f3460',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  {step}
                </div>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Partner grid ──────────────────────────────────────────────── */}
        <div
          style={{
            background: 'var(--card-bg, #fff)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: '1.5rem',
            marginBottom: '2rem'
          }}
        >
          <h2 style={{ margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Partner merchants
          </h2>
          <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Partner logo cards use local assets when provided. If official logo assets are not available in the
            repository, Serandib Bank uses neutral text-based partner badges for demo purposes.
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
              gap: '0.75rem'
            }}
          >
            {partners.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setSelectedMerchantId(p.id)
                  setPurchaseReceipt(null)
                  setPurchaseError(null)
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '1rem 0.75rem',
                  borderRadius: 12,
                  border: `2px solid ${selectedMerchantId === p.id ? '#0f3460' : 'var(--border)'}`,
                  background: selectedMerchantId === p.id ? '#f0f4ff' : 'var(--bg, #f9fafb)',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                <PartnerBadge merchant={p} />
                <span
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    textAlign: 'center',
                    lineHeight: 1.3
                  }}
                >
                  {p.name}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {p.category.replace(/_/g, ' ')}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Purchase simulator ────────────────────────────────────────── */}
        <div
          style={{
            background: 'var(--card-bg, #fff)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: '1.5rem',
            marginBottom: '2rem'
          }}
        >
          <h2 style={{ margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Simulate a partner purchase
          </h2>

          {/* Preset buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            {PRESETS.map((pre) => (
              <button
                key={pre.label}
                type="button"
                onClick={() => {
                  setPurchaseAmount(pre.amount)
                  setPurchaseDesc(pre.desc)
                  setPurchaseReceipt(null)
                  setPurchaseError(null)
                }}
                style={{
                  padding: '0.4rem 0.9rem',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: purchaseAmount === pre.amount ? '#0f3460' : 'var(--bg, #f9fafb)',
                  color: purchaseAmount === pre.amount ? '#fff' : 'var(--text-primary)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {pre.label} LKR {Number(pre.amount).toLocaleString()}
              </button>
            ))}
          </div>

          <form onSubmit={handlePurchase} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                  Partner
                </label>
                <select
                  value={selectedMerchantId}
                  onChange={(e) => setSelectedMerchantId(Number(e.target.value))}
                  required
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--bg, #f9fafb)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="">Select partner</option>
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                  Debit from account
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(Number(e.target.value))}
                  required
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--bg, #f9fafb)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="">Select account</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.accountName} — {a.balanceDisplay}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                  Purchase amount (LKR)
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={purchaseAmount}
                  onChange={(e) => {
                    setPurchaseAmount(e.target.value)
                    setPurchaseReceipt(null)
                    setPurchaseError(null)
                  }}
                  placeholder="e.g. 480"
                  required
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--bg, #f9fafb)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={purchaseDesc}
                  onChange={(e) => setPurchaseDesc(e.target.value)}
                  placeholder="e.g. Iced latte"
                  maxLength={140}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--bg, #f9fafb)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Live round-up preview */}
            {purchaseAmount && Number(purchaseAmount) > 0 && (
              <div
                style={{
                  background: '#f0f7ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: 10,
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  gap: '1.5rem',
                  flexWrap: 'wrap',
                  fontSize: '0.85rem'
                }}
              >
                <span>
                  <strong>Purchase:</strong> LKR {Number(purchaseAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <span style={{ color: '#15803d', fontWeight: 600 }}>
                  + Invisible saving: LKR{' '}
                  {(() => {
                    const minor = Math.round(Number(purchaseAmount) * 100)
                    const base = 10000
                    const next = (Math.floor(minor / base) + 1) * base
                    let ru = next - minor
                    if (ru < 2000) ru = 2000
                    if (ru > 5000) ru = 5000
                    return (ru / 100).toFixed(2)
                  })()}
                </span>
                <span style={{ color: '#1e40af', fontWeight: 700 }}>
                  Total debit: LKR{' '}
                  {(() => {
                    const minor = Math.round(Number(purchaseAmount) * 100)
                    const base = 10000
                    const next = (Math.floor(minor / base) + 1) * base
                    let ru = next - minor
                    if (ru < 2000) ru = 2000
                    if (ru > 5000) ru = 5000
                    return ((minor + ru) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })
                  })()}
                </span>
              </div>
            )}

            {purchaseError && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 8,
                  padding: '0.6rem 1rem',
                  color: '#dc2626',
                  fontSize: '0.85rem'
                }}
              >
                {purchaseError}
              </div>
            )}

            <button
              type="submit"
              disabled={purchasing}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: 10,
                background: purchasing ? '#94a3b8' : '#0f3460',
                color: '#fff',
                fontWeight: 700,
                border: 'none',
                cursor: purchasing ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem',
                alignSelf: 'flex-start'
              }}
            >
              {purchasing ? 'Processing...' : 'Simulate Purchase'}
            </button>
          </form>

          {/* Purchase receipt */}
          {purchaseReceipt && (
            <div
              style={{
                marginTop: '1.25rem',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 12,
                padding: '1.25rem'
              }}
            >
              <p style={{ margin: '0 0 0.75rem', fontWeight: 700, color: '#15803d', fontSize: '0.9rem' }}>
                Purchase recorded — invisible saving captured
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                {[
                  { label: 'Partner', value: purchaseReceipt.partnerName },
                  { label: 'Purchase', value: purchaseReceipt.purchaseAmountDisplay },
                  { label: 'Invisible saving', value: purchaseReceipt.roundupAmountDisplay },
                  { label: 'Total debited', value: purchaseReceipt.totalDebitDisplay },
                  { label: 'Month', value: purchaseReceipt.monthKey },
                  { label: 'Balance after', value: purchaseReceipt.balanceAfterDisplay }
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {label}
                    </p>
                    <p style={{ margin: '0.15rem 0 0', fontWeight: 700, color: '#1e293b', fontSize: '0.9rem' }}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>
              <p style={{ margin: '0.75rem 0 0', fontSize: '0.8rem', color: '#16a34a' }}>
                Status: Accumulated for month-end sweep into Savings account.
              </p>
            </div>
          )}
        </div>

        {/* ── Monthly sweep ─────────────────────────────────────────────── */}
        <div
          style={{
            background: 'var(--card-bg, #fff)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: '1.5rem',
            marginBottom: '2rem'
          }}
        >
          <h2 style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Month-end sweep
          </h2>
          <p style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Move this month&apos;s accumulated invisible savings into your Savings account. Normally runs automatically on sweep day.
          </p>

          {sweepError && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 8,
                padding: '0.6rem 1rem',
                color: '#dc2626',
                fontSize: '0.85rem',
                marginBottom: '1rem'
              }}
            >
              {sweepError}
            </div>
          )}

          {sweepReceipt && (
            <div
              style={{
                background: sweepReceipt.status === 'completed' ? '#f0fdf4' : '#fffbeb',
                border: `1px solid ${sweepReceipt.status === 'completed' ? '#bbf7d0' : '#fde68a'}`,
                borderRadius: 12,
                padding: '1rem 1.25rem',
                marginBottom: '1rem'
              }}
            >
              <p style={{ margin: 0, fontWeight: 700, color: sweepReceipt.status === 'completed' ? '#15803d' : '#92400e', fontSize: '0.9rem' }}>
                {sweepReceipt.message}
              </p>
              {sweepReceipt.status === 'completed' && (
                <p style={{ margin: '0.4rem 0 0', fontSize: '0.85rem', color: '#16a34a' }}>
                  {sweepReceipt.amountDisplay} moved to Savings account.
                </p>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={handleSweep}
            disabled={sweeping}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: 10,
              background: sweeping ? '#94a3b8' : '#0f3460',
              color: '#fff',
              fontWeight: 700,
              border: 'none',
              cursor: sweeping ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem'
            }}
          >
            {sweeping ? 'Sweeping...' : 'Sweep this month into Savings'}
          </button>
        </div>

        {/* ── Settings ──────────────────────────────────────────────────── */}
        <div
          style={{
            background: 'var(--card-bg, #fff)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: '1.5rem',
            marginBottom: '2rem'
          }}
        >
          <h2 style={{ margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Settings
          </h2>
          <form onSubmit={handleSettingsSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settingsEnabled}
                onChange={(e) => setSettingsEnabled(e.target.checked)}
                style={{ width: 18, height: 18 }}
              />
              Enable Invisible Savings
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                  Debit from (Expenses)
                </label>
                <select
                  value={settingsSrcId}
                  onChange={(e) => setSettingsSrcId(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--bg, #f9fafb)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem'
                  }}
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.accountName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                  Sweep to (Savings)
                </label>
                <select
                  value={settingsDstId}
                  onChange={(e) => setSettingsDstId(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--bg, #f9fafb)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem'
                  }}
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.accountName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="submit"
                disabled={settingsSaving}
                style={{
                  padding: '0.6rem 1.25rem',
                  borderRadius: 8,
                  background: settingsSaving ? '#94a3b8' : '#0f3460',
                  color: '#fff',
                  fontWeight: 700,
                  border: 'none',
                  cursor: settingsSaving ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                {settingsSaving ? 'Saving...' : 'Save settings'}
              </button>
              {settingsMsg && (
                <span
                  style={{
                    fontSize: '0.85rem',
                    color: settingsMsg === 'Settings saved.' ? '#15803d' : '#dc2626'
                  }}
                >
                  {settingsMsg}
                </span>
              )}
            </div>
          </form>
        </div>

        {/* ── Recent events ─────────────────────────────────────────────── */}
        <div
          style={{
            background: 'var(--card-bg, #fff)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: '1.5rem'
          }}
        >
          <h2 style={{ margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Recent savings events
          </h2>
          {!summary?.events?.length ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No savings events yet. Simulate a purchase above to get started.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {summary.events.map((ev) => {
                const partner = partners.find((p) => p.id === ev.partnerMerchantId)
                return (
                  <div
                    key={ev.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem 1rem',
                      background: 'var(--bg, #f9fafb)',
                      borderRadius: 10
                    }}
                  >
                    {partner && <PartnerBadge merchant={partner} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                        {ev.partnerName}
                      </p>
                      <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {new Date(ev.createdAt).toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                        {ev.purchaseAmountDisplay}
                      </p>
                      <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: '#16a34a', fontWeight: 600 }}>
                        +{ev.roundupAmountDisplay} saved
                      </p>
                    </div>
                    <span
                      style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: 6,
                        background: ev.status === 'accumulated' ? '#dcfce7' : '#dbeafe',
                        color: ev.status === 'accumulated' ? '#15803d' : '#1d4ed8',
                        fontSize: '0.72rem',
                        fontWeight: 700
                      }}
                    >
                      {ev.status}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
