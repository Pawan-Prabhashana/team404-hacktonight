import Link from 'next/link'
import AppShell from '@/components/layout/AppShell'

const categories = [
  { label: 'Groceries', pct: 28, color: '#0d9488', amount: '13,496' },
  { label: 'Utilities', pct: 22, color: '#0f766e', amount: '10,604' },
  { label: 'Dining', pct: 18, color: '#06b6d4', amount: '8,676' },
  { label: 'Transport', pct: 14, color: '#6366f1', amount: '6,748' },
  { label: 'Shopping', pct: 10, color: '#10b981', amount: '4,820' },
  { label: 'Other', pct: 8, color: '#94a3b8', amount: '3,856' }
]

const insights = [
  {
    text: 'Your utility payments are trending 12% above last month.',
    tag: 'Heads up',
    tagColor: '#b45309',
    tagBg: 'rgba(245,158,11,0.1)'
  },
  {
    text: 'Dining spending is LKR 2,100 above your usual baseline.',
    tag: 'Heads up',
    tagColor: '#b45309',
    tagBg: 'rgba(245,158,11,0.1)'
  },
  {
    text: 'Setting a weekly savings transfer could add LKR 6,500/month.',
    tag: 'Tip',
    tagColor: '#087f7a',
    tagBg: 'rgba(8,127,122,0.1)'
  },
  {
    text: 'Transport costs are down 8% compared to last quarter.',
    tag: 'Positive',
    tagColor: '#059669',
    tagBg: 'rgba(16,185,129,0.1)'
  }
]

const modules = [
  {
    name: 'Cashflow Forecast',
    desc: 'Predict your end-of-month balance based on spending patterns.'
  },
  {
    name: 'Subscription Detector',
    desc: 'Auto-detect recurring charges across all accounts.'
  },
  {
    name: 'Financial Twin Simulator',
    desc: 'Simulate decisions risk-free before they affect your balance.'
  },
  {
    name: 'Budget Alerts',
    desc: 'Get notified before you exceed a category budget.'
  },
  {
    name: 'Auto Categorization',
    desc: 'Every transaction tagged automatically with ML-ready data.'
  }
]

export default function SmartSpendPage() {
  return (
    <AppShell
      title="Smart Spend"
      subtitle="Spending intelligence, budgets, and cashflow insight"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        {/* Top metrics */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem'
          }}
        >
          {/* Score card */}
          <div
            className="app-card-dark"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 160
            }}
          >
            <p
              style={{
                fontSize: '0.75rem',
                color: 'rgba(255,255,255,0.55)',
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                fontWeight: 700
              }}
            >
              Financial Health
            </p>
            <div>
              <p
                style={{
                  fontSize: '3.5rem',
                  fontWeight: 800,
                  lineHeight: 1,
                  letterSpacing: '-0.04em'
                }}
              >
                74
              </p>
              <p
                style={{
                  fontSize: '0.8125rem',
                  color: 'rgba(255,255,255,0.5)',
                  marginTop: '0.25rem'
                }}
              >
                / 100 · Good
              </p>
            </div>
            <div
              style={{
                height: 6,
                borderRadius: 9999,
                background: 'rgba(255,255,255,0.15)'
              }}
            >
              <div
                style={{
                  height: '100%',
                  borderRadius: 9999,
                  background: 'rgba(255,255,255,0.7)',
                  width: '74%'
                }}
              />
            </div>
          </div>

          {[
            {
              label: 'Monthly Spend',
              value: 'Rs. 48,200',
              sub: 'All categories',
              color: '#087f7a',
              bg: '#f0faf9'
            },
            {
              label: 'Savings Potential',
              value: 'Rs. 6,500',
              sub: 'Based on patterns',
              color: '#059669',
              bg: 'rgba(16,185,129,0.05)'
            },
            {
              label: 'Avg Daily Spend',
              value: 'Rs. 1,606',
              sub: '30-day average',
              color: '#b45309',
              bg: 'rgba(245,158,11,0.05)'
            }
          ].map((c) => (
            <div
              key={c.label}
              className="app-stat-card"
              style={{
                background: c.bg,
                border: `1px solid ${c.bg === '#f0faf9' ? '#cceae8' : '#e7edf1'}`
              }}
            >
              <p className="app-stat-label">{c.label}</p>
              <p className="app-stat-value" style={{ color: c.color }}>
                {c.value}
              </p>
              <p className="app-stat-sub">{c.sub}</p>
            </div>
          ))}
        </div>

        {/* Main 2-column */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1.5fr) minmax(300px,0.8fr)',
            gap: '1.5rem',
            alignItems: 'start'
          }}
        >
          {/* Left */}
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
          >
            {/* Category breakdown */}
            <div className="app-card">
              <h2 className="app-section-title">Category Breakdown</h2>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem'
                }}
              >
                {categories.map((c) => (
                  <div key={c.label}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '0.375rem'
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          color: '#10202b'
                        }}
                      >
                        {c.label}
                      </span>
                      <span style={{ fontSize: '0.875rem', color: '#6b7a90' }}>
                        Rs. {c.amount} · {c.pct}%
                      </span>
                    </div>
                    <div className="app-progress-bar">
                      <div
                        className="app-progress-fill"
                        style={{ width: `${c.pct}%`, background: c.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Spending insights */}
            <div className="app-card">
              <h2 className="app-section-title">Spending Insights</h2>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.875rem'
                }}
              >
                {insights.map((i) => (
                  <div
                    key={i.text}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '1rem',
                      padding: '0.875rem 1rem',
                      borderRadius: '0.875rem',
                      background: '#fafcfc',
                      border: '1px solid #f1f5f8'
                    }}
                  >
                    <p
                      style={{
                        fontSize: '0.875rem',
                        color: '#374151',
                        flex: 1,
                        lineHeight: 1.6
                      }}
                    >
                      {i.text}
                    </p>
                    <span
                      style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: 9999,
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: i.tagBg,
                        color: i.tagColor,
                        flexShrink: 0
                      }}
                    >
                      {i.tag}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right */}
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
          >
            {/* Financial Twin */}
            <div className="app-card-dark">
              <p
                style={{
                  fontSize: '0.75rem',
                  color: 'rgba(255,255,255,0.55)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  fontWeight: 700,
                  marginBottom: '0.875rem'
                }}
              >
                Financial Twin Simulator
              </p>
              <p
                style={{
                  fontSize: '0.9375rem',
                  color: 'rgba(255,255,255,0.72)',
                  lineHeight: 1.65,
                  marginBottom: '1rem'
                }}
              >
                Simulate purchases, savings plans, and payments before they
                affect your real balance.
              </p>
              <span
                className="app-pill"
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.75)'
                }}
              >
                Coming in Phase 7
              </span>
            </div>

            {/* Intelligence modules */}
            <div className="app-card">
              <h3 className="app-section-title">Intelligence Modules</h3>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem'
                }}
              >
                {modules.map((m) => (
                  <div
                    key={m.name}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.875rem'
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '0.625rem',
                        background: '#f0faf9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#087f7a"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                      </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          color: '#071f2a'
                        }}
                      >
                        {m.name}
                      </p>
                      <p
                        style={{
                          fontSize: '0.8rem',
                          color: '#6b7a90',
                          marginTop: '0.125rem',
                          lineHeight: 1.5
                        }}
                      >
                        {m.desc}
                      </p>
                    </div>
                    <span
                      className="app-pill app-pill-teal"
                      style={{ flexShrink: 0 }}
                    >
                      Soon
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <Link
              href="/dashboard"
              className="app-button-secondary"
              style={{
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
