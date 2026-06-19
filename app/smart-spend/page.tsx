'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import AppShell from '@/components/layout/AppShell'
import {
  fetchAccounts,
  fetchInvisibleSavingsSummary,
  fetchSmartSpendSummary,
  simulateFinancialTwin,
  upsertBudget,
  type FinancialTwinResult,
  type InvisibleSavingsSummary,
  type SafeAccount,
  type SmartSpendSummary
} from '@/lib/banking-client'

// ── Small helpers ──────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444'
  const label =
    score >= 75 ? 'Excellent' : score >= 50 ? 'Fair' : 'Needs attention'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: '1rem',
          color: '#fff',
          flexShrink: 0,
        }}
      >
        {score}
      </div>
      <div>
        <p style={{ fontWeight: 700, color: '#071f2a', fontSize: '0.875rem' }}>{label}</p>
        <p style={{ fontSize: '0.75rem', color: '#6b7a90' }}>out of 100</p>
      </div>
    </div>
  )
}

function InsightPill({ type }: { type: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    positive: { bg: 'rgba(16,185,129,0.1)',  text: '#059669', label: 'Good' },
    warning:  { bg: 'rgba(239,68,68,0.1)',   text: '#dc2626', label: 'Warning' },
    tip:      { bg: 'rgba(8,127,122,0.1)',   text: '#087f7a', label: 'Tip' },
    info:     { bg: 'rgba(59,130,246,0.08)', text: '#2563eb', label: 'Info' },
  }
  const s = map[type] ?? map.info
  return (
    <span
      style={{
        fontSize: '0.65rem',
        fontWeight: 700,
        padding: '2px 8px',
        borderRadius: '9999px',
        background: s.bg,
        color: s.text,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}
    >
      {s.label}
    </span>
  )
}

const SCENARIO_LABELS: Record<string, string> = {
  purchase:     'Purchase',
  saving:       'Save Money',
  bill_payment: 'Bill Payment',
  transfer:     'Transfer',
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function SmartSpendPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [summary, setSummary]                     = useState<SmartSpendSummary | null>(null)
  const [accounts, setAccounts]                   = useState<SafeAccount[]>([])
  const [invisibleSummary, setInvisibleSummary]   = useState<InvisibleSavingsSummary | null>(null)
  const [loading, setLoading]               = useState(true)
  const [error, setError]                   = useState('')

  // Budget form
  const [budgetSlug, setBudgetSlug]         = useState('groceries')
  const [budgetAmount, setBudgetAmount]     = useState('')
  const [budgetSaving, setBudgetSaving]     = useState(false)
  const [budgetMsg, setBudgetMsg]           = useState('')

  // Twin simulator
  const [twinScenario, setTwinScenario]     = useState<'purchase' | 'saving' | 'bill_payment' | 'transfer'>('purchase')
  const [twinAmount, setTwinAmount]         = useState('')
  const [twinCategory, setTwinCategory]     = useState('groceries')
  const [twinAccount, setTwinAccount]       = useState('')
  const [twinDesc, setTwinDesc]             = useState('')
  const [twinSimulating, setTwinSimulating] = useState(false)
  const [twinResult, setTwinResult]         = useState<FinancialTwinResult | null>(null)
  const [twinError, setTwinError]           = useState('')

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.push('/login?next=/smart-spend'); return }
    load()
  }, [authLoading, user, router])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const [s, a, inv] = await Promise.all([
        fetchSmartSpendSummary(),
        fetchAccounts(),
        fetchInvisibleSavingsSummary().catch(() => null)
      ])
      setSummary(s)
      setInvisibleSummary(inv)
      setAccounts(a)
    } catch {
      setError('Failed to load Smart Spend data.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveBudget(e: React.FormEvent) {
    e.preventDefault()
    if (!budgetAmount || Number(budgetAmount) <= 0) {
      setBudgetMsg('Enter a valid amount.')
      return
    }
    setBudgetSaving(true)
    setBudgetMsg('')
    try {
      await upsertBudget({ categorySlug: budgetSlug, amount: budgetAmount })
      setBudgetMsg('Budget saved.')
      await load()
    } catch {
      setBudgetMsg('Failed to save budget.')
    } finally {
      setBudgetSaving(false)
    }
  }

  async function handleSimulate(e: React.FormEvent) {
    e.preventDefault()
    if (!twinAmount || Number(twinAmount) <= 0) {
      setTwinError('Enter a valid amount.')
      return
    }
    setTwinSimulating(true)
    setTwinError('')
    setTwinResult(null)
    try {
      const result = await simulateFinancialTwin({
        scenarioType: twinScenario,
        amount:       twinAmount,
        categorySlug: twinCategory || undefined,
        accountId:    twinAccount ? Number(twinAccount) : undefined,
        description:  twinDesc || undefined,
      })
      setTwinResult(result)
    } catch {
      setTwinError('Simulation failed. Please try again.')
    } finally {
      setTwinSimulating(false)
    }
  }

  if (authLoading || loading) {
    return (
      <AppShell title="Smart Spend" subtitle="Loading your analytics…">
        <div className="flex items-center justify-center py-24">
          <div className="app-spinner" />
        </div>
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell title="Smart Spend">
        <div className="app-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#dc2626', fontWeight: 600 }}>{error}</p>
          <button type="button" className="app-button-primary" style={{ marginTop: '1rem' }} onClick={load}>
            Retry
          </button>
        </div>
      </AppShell>
    )
  }

  const m = summary?.metrics

  // Categories from API
  const KNOWN_SLUGS = ['groceries', 'utilities', 'dining', 'transport', 'shopping', 'subscriptions',
    'salary', 'transfers', 'bills', 'education', 'insurance', 'travel', 'other']

  return (
    <AppShell
      title="Smart Spend"
      subtitle={`${summary?.range.from.slice(0, 10)} → ${summary?.range.to.slice(0, 10)}`}
    >
      {/* ── Metric cards ───────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.25rem',
          marginBottom: '1.75rem',
        }}
      >
        {/* Financial Health */}
        <div className="app-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7a90', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Financial Health
          </p>
          {m ? <ScoreBadge score={m.financialHealthScore} /> : <p className="app-muted">—</p>}
        </div>

        {/* Monthly Spend */}
        <div className="app-card">
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7a90', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
            Monthly Spend
          </p>
          <p style={{ fontSize: '1.4rem', fontWeight: 800, color: '#071f2a' }}>
            {m?.monthlySpendDisplay ?? '—'}
          </p>
          <p className="app-muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
            Avg daily: {m?.averageDailySpendDisplay ?? '—'}
          </p>
        </div>

        {/* Savings Potential */}
        <div className="app-card">
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7a90', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
            Savings Potential
          </p>
          <p style={{ fontSize: '1.4rem', fontWeight: 800, color: '#087f7a' }}>
            {m?.savingsPotentialDisplay ?? '—'}
          </p>
          <p className="app-muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
            vs. your budgets
          </p>
        </div>

        {/* Income vs Spend */}
        <div className="app-card">
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7a90', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
            Income This Month
          </p>
          <p style={{ fontSize: '1.4rem', fontWeight: 800, color: '#071f2a' }}>
            {m?.incomeDisplay ?? '—'}
          </p>
          <p className="app-muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
            Debits: {m?.debitDisplay ?? '—'}
          </p>
        </div>
      </div>

      {/* ── Main grid ──────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gap: '1.75rem',
          gridTemplateColumns: 'minmax(0, 1.5fr) minmax(320px, 0.8fr)',
        }}
        className="smart-spend-grid"
      >
        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

          {/* Category Breakdown */}
          <div className="app-card">
            <p style={{ fontWeight: 700, color: '#071f2a', fontSize: '1rem', marginBottom: '1.25rem' }}>
              Category Breakdown
            </p>
            {!summary?.categories.length ? (
              <p className="app-muted">No spending data for this period.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {summary.categories.filter(c => c.amountMinorUnits > 0).map((cat) => (
                  <div key={cat.slug}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            background: cat.color,
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#071f2a' }}>
                          {cat.name}
                        </span>
                        {cat.status !== 'safe' && (
                          <span
                            style={{
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              padding: '1px 7px',
                              borderRadius: '9999px',
                              background: cat.status === 'over' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.12)',
                              color: cat.status === 'over' ? '#dc2626' : '#b45309',
                            }}
                          >
                            {cat.status === 'over' ? 'Over budget' : 'Watch'}
                          </span>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#071f2a' }}>
                          {cat.amountDisplay}
                        </span>
                        <span className="app-muted" style={{ fontSize: '0.75rem', marginLeft: '0.375rem' }}>
                          {cat.percentage}%
                        </span>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div style={{ height: 6, borderRadius: 3, background: '#f0f4f7', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min(cat.percentage, 100)}%`,
                          background: cat.color,
                          borderRadius: 3,
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                    {cat.budgetDisplay && (
                      <p style={{ fontSize: '0.7rem', color: '#6b7a90', marginTop: '0.2rem' }}>
                        Budget: {cat.budgetDisplay}
                        {cat.budgetUsedPct !== undefined && ` — ${cat.budgetUsedPct}% used`}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Budget Manager */}
          <div className="app-card">
            <p style={{ fontWeight: 700, color: '#071f2a', fontSize: '1rem', marginBottom: '1.25rem' }}>
              Budget Manager
            </p>
            <form onSubmit={handleSaveBudget} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6b7a90', display: 'block', marginBottom: '0.375rem' }}>
                    Category
                  </label>
                  <select
                    className="app-select"
                    value={budgetSlug}
                    onChange={(e) => setBudgetSlug(e.target.value)}
                  >
                    {KNOWN_SLUGS.filter(s => s !== 'salary' && s !== 'transfers' && s !== 'other').map((slug) => (
                      <option key={slug} value={slug}>
                        {slug.charAt(0).toUpperCase() + slug.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6b7a90', display: 'block', marginBottom: '0.375rem' }}>
                    Monthly Budget (LKR)
                  </label>
                  <input
                    type="number"
                    className="app-input"
                    placeholder="e.g. 15000"
                    value={budgetAmount}
                    onChange={(e) => setBudgetAmount(e.target.value)}
                    min="1"
                  />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button type="submit" className="app-button-primary" disabled={budgetSaving}>
                  {budgetSaving ? 'Saving…' : 'Save Budget'}
                </button>
                {budgetMsg && (
                  <p style={{ fontSize: '0.8rem', color: budgetMsg === 'Budget saved.' ? '#087f7a' : '#dc2626' }}>
                    {budgetMsg}
                  </p>
                )}
              </div>
            </form>
          </div>

          {/* Spending Insights */}
          <div className="app-card">
            <p style={{ fontWeight: 700, color: '#071f2a', fontSize: '1rem', marginBottom: '1.25rem' }}>
              Spending Insights
            </p>
            {!summary?.insights.length ? (
              <p className="app-muted">No insights available yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {summary.insights.map((ins, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      gap: '0.75rem',
                      padding: '0.875rem',
                      borderRadius: '0.875rem',
                      background: '#f7f9fb',
                      alignItems: 'flex-start',
                    }}
                  >
                    <InsightPill type={ins.type} />
                    <div>
                      <p style={{ fontWeight: 700, fontSize: '0.8rem', color: '#071f2a', marginBottom: '0.2rem' }}>{ins.title}</p>
                      <p style={{ fontSize: '0.8rem', color: '#6b7a90', lineHeight: 1.5 }}>{ins.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

          {/* Cashflow Forecast */}
          <div className="app-card-soft">
            <p style={{ fontWeight: 700, color: '#071f2a', fontSize: '1rem', marginBottom: '1rem' }}>
              Cashflow Forecast
            </p>
            {summary?.forecast ? (
              <>
                <div style={{ marginBottom: '0.75rem' }}>
                  <p style={{ fontSize: '0.75rem', color: '#6b7a90', marginBottom: '0.25rem' }}>Projected month-end balance</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#071f2a' }}>
                    {summary.forecast.projectedMonthEndBalanceDisplay}
                  </p>
                  <p style={{ fontSize: '0.7rem', color: '#6b7a90', marginTop: '0.2rem' }}>
                    Confidence: {Math.round(summary.forecast.confidence * 100)}%
                  </p>
                </div>
                {summary.forecast.warning && (
                  <div
                    style={{
                      padding: '0.625rem 0.875rem',
                      borderRadius: '0.75rem',
                      background: 'rgba(239,68,68,0.08)',
                      border: '1px solid rgba(239,68,68,0.18)',
                    }}
                  >
                    <p style={{ fontSize: '0.775rem', color: '#dc2626', fontWeight: 600, lineHeight: 1.4 }}>
                      {summary.forecast.warning}
                    </p>
                  </div>
                )}
                <p style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '0.75rem', lineHeight: 1.4 }}>
                  This is a forecast based on spending patterns and is not financial advice.
                </p>
              </>
            ) : (
              <p className="app-muted">No forecast data available.</p>
            )}
          </div>

          {/* Recurring Payments */}
          <div className="app-card">
            <p style={{ fontWeight: 700, color: '#071f2a', fontSize: '1rem', marginBottom: '1rem' }}>
              Recurring Payments
            </p>
            {!summary?.recurring.length ? (
              <p className="app-muted" style={{ fontSize: '0.8rem' }}>No recurring payments detected yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {summary.recurring.slice(0, 6).map((r) => (
                  <div
                    key={r.key}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.625rem 0',
                      borderBottom: '1px solid #f0f4f7',
                    }}
                  >
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '0.825rem', color: '#071f2a', textTransform: 'capitalize' }}>
                        {r.name}
                      </p>
                      {r.nextExpectedDate && (
                        <p style={{ fontSize: '0.7rem', color: '#6b7a90' }}>
                          Next ~{r.nextExpectedDate}
                        </p>
                      )}
                    </div>
                    <p style={{ fontWeight: 700, fontSize: '0.825rem', color: '#071f2a' }}>
                      {r.averageAmountDisplay}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Financial Twin Simulator */}
          <div className="app-card">
            <p style={{ fontWeight: 700, color: '#071f2a', fontSize: '1rem', marginBottom: '0.375rem' }}>
              Financial Twin Simulator
            </p>
            <p style={{ fontSize: '0.775rem', color: '#6b7a90', marginBottom: '1.125rem', lineHeight: 1.5 }}>
              Simulate a financial decision risk-free. This does not move money.
            </p>
            <form onSubmit={handleSimulate} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6b7a90', display: 'block', marginBottom: '0.3rem' }}>Scenario</label>
                <select
                  className="app-select"
                  value={twinScenario}
                  onChange={(e) => setTwinScenario(e.target.value as typeof twinScenario)}
                >
                  {Object.entries(SCENARIO_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6b7a90', display: 'block', marginBottom: '0.3rem' }}>Amount (LKR)</label>
                <input
                  type="number"
                  className="app-input"
                  placeholder="e.g. 5000"
                  value={twinAmount}
                  onChange={(e) => setTwinAmount(e.target.value)}
                  min="1"
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6b7a90', display: 'block', marginBottom: '0.3rem' }}>Category (optional)</label>
                <select
                  className="app-select"
                  value={twinCategory}
                  onChange={(e) => setTwinCategory(e.target.value)}
                >
                  {KNOWN_SLUGS.map((slug) => (
                    <option key={slug} value={slug}>
                      {slug.charAt(0).toUpperCase() + slug.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              {accounts.length > 0 && (
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6b7a90', display: 'block', marginBottom: '0.3rem' }}>Account (optional)</label>
                  <select
                    className="app-select"
                    value={twinAccount}
                    onChange={(e) => setTwinAccount(e.target.value)}
                  >
                    <option value="">Any active account</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.accountName} — {a.balanceDisplay}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6b7a90', display: 'block', marginBottom: '0.3rem' }}>Description (optional)</label>
                <input
                  type="text"
                  className="app-input"
                  placeholder="e.g. New laptop"
                  value={twinDesc}
                  onChange={(e) => setTwinDesc(e.target.value)}
                />
              </div>
              <button type="submit" className="app-button-primary" disabled={twinSimulating}>
                {twinSimulating ? 'Simulating…' : 'Run Simulation'}
              </button>
              {twinError && <p style={{ fontSize: '0.8rem', color: '#dc2626' }}>{twinError}</p>}
            </form>

            {/* Simulation result */}
            {twinResult && (
              <div
                style={{
                  marginTop: '1.25rem',
                  padding: '1rem',
                  borderRadius: '1rem',
                  background: '#f7f9fb',
                  border: '1px solid #e7edf1',
                }}
              >
                <p style={{ fontWeight: 700, fontSize: '0.875rem', color: '#071f2a', marginBottom: '0.75rem' }}>
                  Simulation Result — {SCENARIO_LABELS[twinResult.scenarioType]}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div>
                    <p style={{ fontSize: '0.7rem', color: '#6b7a90' }}>Current balance</p>
                    <p style={{ fontWeight: 700, fontSize: '0.9rem', color: '#071f2a' }}>{twinResult.currentBalanceDisplay}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.7rem', color: '#6b7a90' }}>Projected balance</p>
                    <p style={{ fontWeight: 700, fontSize: '0.9rem', color: twinResult.impactLevel === 'high' ? '#dc2626' : '#071f2a' }}>
                      {twinResult.projectedBalanceDisplay}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center', marginBottom: '0.625rem' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6b7a90' }}>Impact:</span>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      background:
                        twinResult.impactLevel === 'high'   ? 'rgba(239,68,68,0.1)' :
                        twinResult.impactLevel === 'medium' ? 'rgba(245,158,11,0.1)' :
                                                              'rgba(16,185,129,0.1)',
                      color:
                        twinResult.impactLevel === 'high'   ? '#dc2626' :
                        twinResult.impactLevel === 'medium' ? '#b45309' :
                                                              '#059669',
                    }}
                  >
                    {twinResult.impactLevel.charAt(0).toUpperCase() + twinResult.impactLevel.slice(1)}
                  </span>
                </div>
                {twinResult.warnings.length > 0 && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    {twinResult.warnings.map((w, i) => (
                      <p key={i} style={{ fontSize: '0.775rem', color: '#dc2626', lineHeight: 1.45, marginBottom: '0.25rem' }}>
                        {w}
                      </p>
                    ))}
                  </div>
                )}
                {twinResult.recommendations.length > 0 && (
                  <div>
                    {twinResult.recommendations.map((r, i) => (
                      <p key={i} style={{ fontSize: '0.775rem', color: '#087f7a', lineHeight: 1.45, marginBottom: '0.2rem' }}>
                        {r}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

          {/* Invisible Savings Effect */}
          {invisibleSummary && (
            <div
              style={{
                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                border: '1px solid #bbf7d0',
                borderRadius: 14,
                padding: '1.5rem',
                marginTop: '1.5rem'
              }}
            >
              <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, color: '#14532d' }}>
                Invisible Savings effect
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#166534', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Round-ups this month
                  </p>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '1.3rem', fontWeight: 800, color: '#15803d' }}>
                    {invisibleSummary.capturedThisMonthDisplay}
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#166534', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Projected monthly
                  </p>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '1.3rem', fontWeight: 800, color: '#15803d' }}>
                    {invisibleSummary.projectedMonthlySavingDisplay}
                  </p>
                </div>
                {invisibleSummary.topPartner && (
                  <div>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#166534', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Top partner
                    </p>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '1.1rem', fontWeight: 700, color: '#14532d' }}>
                      {invisibleSummary.topPartner}
                    </p>
                  </div>
                )}
                <div>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#166534', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Savings habit
                  </p>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#14532d', lineHeight: 1.4 }}>
                    {invisibleSummary.eventCount > 0
                      ? `${invisibleSummary.eventCount} partner purchases captured automatically.`
                      : 'Simulate a partner purchase to start saving.'}
                  </p>
                </div>
              </div>
            </div>
          )}

      </div>

      <style>{`
        @media (max-width: 1023px) {
          .smart-spend-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </AppShell>
  )
}
