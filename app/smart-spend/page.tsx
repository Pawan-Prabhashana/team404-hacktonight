import Link from 'next/link'
import AppShell from '@/components/layout/AppShell'

const categories = [
  {
    label: 'Groceries',
    pct: 28,
    color: 'var(--serandib-blue)',
    amount: '13,496'
  },
  {
    label: 'Utilities',
    pct: 22,
    color: 'var(--serandib-sky)',
    amount: '10,604'
  },
  { label: 'Dining', pct: 18, color: 'var(--serandib-cyan)', amount: '8,676' },
  {
    label: 'Transport',
    pct: 14,
    color: 'var(--serandib-indigo)',
    amount: '6,748'
  },
  {
    label: 'Shopping',
    pct: 10,
    color: 'var(--serandib-success)',
    amount: '4,820'
  },
  { label: 'Other', pct: 8, color: 'var(--serandib-muted)', amount: '3,856' }
]

const modules = [
  {
    icon: '📈',
    name: 'Cashflow Forecast',
    desc: 'Predict your end-of-month balance based on spending patterns.'
  },
  {
    icon: '🔁',
    name: 'Subscription Detector',
    desc: 'Auto-detect recurring charges across all accounts.'
  },
  {
    icon: '🧠',
    name: 'Financial Twin Simulator',
    desc: 'Simulate decisions risk-free before they affect your balance.'
  },
  {
    icon: '🔔',
    name: 'Budget Alerts',
    desc: 'Get notified before you exceed a category budget.'
  },
  {
    icon: '🏷️',
    name: 'Auto Categorization',
    desc: 'Every transaction tagged automatically with ML-ready data.'
  }
]

const insights = [
  {
    icon: '📊',
    text: 'Your utility payments are trending 12% above last month.',
    type: 'warn'
  },
  {
    icon: '🍽️',
    text: 'Dining spending is LKR 2,100 above your usual baseline.',
    type: 'warn'
  },
  {
    icon: '💡',
    text: 'Setting a weekly savings transfer could add LKR 6,500/month.',
    type: 'info'
  },
  {
    icon: '✓',
    text: 'Transport costs are down 8% compared to last quarter.',
    type: 'good'
  }
]

export default function SmartSpendPage() {
  return (
    <AppShell>
      <main className="flex-1 overflow-y-auto px-6 py-6 md:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1
            className="text-2xl font-extrabold"
            style={{ color: 'var(--serandib-navy)' }}
          >
            Smart Spend
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: 'var(--serandib-muted)' }}
          >
            AI-ready financial insights, budget tracking, and cashflow
            intelligence
          </p>
        </div>

        {/* Score + Summary row */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Health score ring */}
          <div
            className="col-span-full sm:col-span-1 rounded-2xl p-5 text-white flex flex-col justify-between"
            style={{
              background:
                'linear-gradient(135deg, var(--serandib-navy) 0%, var(--serandib-indigo) 100%)',
              minHeight: 160
            }}
          >
            <p className="text-sm font-medium text-white/60">
              Financial Health
            </p>
            <div>
              <p className="text-5xl font-extrabold">74</p>
              <p className="text-xs text-white/50 mt-1">/ 100 · Good</p>
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-white/15">
              <div
                className="h-full rounded-full"
                style={{ width: '74%', background: 'var(--serandib-sky)' }}
              />
            </div>
          </div>

          {[
            {
              label: 'Monthly Spend',
              value: 'Rs. 48,200',
              sub: 'All categories',
              icon: '💳',
              bg: 'rgba(10,99,255,0.06)'
            },
            {
              label: 'Savings Potential',
              value: 'Rs. 6,500',
              sub: 'Based on patterns',
              icon: '💰',
              bg: 'rgba(16,185,129,0.06)'
            },
            {
              label: 'Avg Daily Spend',
              value: 'Rs. 1,606',
              sub: '30-day average',
              icon: '📅',
              bg: 'rgba(245,158,11,0.06)'
            }
          ].map((c) => (
            <div
              key={c.label}
              className="rounded-2xl p-5"
              style={{
                background: c.bg,
                border: '1px solid var(--serandib-border)'
              }}
            >
              <p className="text-2xl mb-2">{c.icon}</p>
              <p
                className="text-xs font-medium"
                style={{ color: 'var(--serandib-muted)' }}
              >
                {c.label}
              </p>
              <p
                className="mt-1 text-2xl font-extrabold"
                style={{ color: 'var(--serandib-navy)' }}
              >
                {c.value}
              </p>
              <p
                className="text-xs mt-0.5"
                style={{ color: 'var(--serandib-muted)' }}
              >
                {c.sub}
              </p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Category breakdown */}
          <div className="lg:col-span-3">
            <div className="serandib-card p-6">
              <h2
                className="mb-4 font-bold"
                style={{ color: 'var(--serandib-navy)' }}
              >
                Category Breakdown
              </h2>
              <div className="space-y-3">
                {categories.map((c) => (
                  <div key={c.label}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span
                        className="font-medium"
                        style={{ color: 'var(--foreground)' }}
                      >
                        {c.label}
                      </span>
                      <span style={{ color: 'var(--serandib-muted)' }}>
                        Rs. {c.amount} · {c.pct}%
                      </span>
                    </div>
                    <div
                      className="h-2 w-full rounded-full"
                      style={{ background: 'rgba(10,99,255,0.08)' }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${c.pct}%`, background: c.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Spending insights */}
            <div className="mt-4 serandib-card p-5">
              <h2
                className="mb-3 font-bold"
                style={{ color: 'var(--serandib-navy)' }}
              >
                Spending Insights
              </h2>
              <div className="space-y-2">
                {insights.map((i) => (
                  <div
                    key={i.text}
                    className="flex items-start gap-3 rounded-xl p-3"
                    style={{ background: 'rgba(10,99,255,0.03)' }}
                  >
                    <span className="text-lg shrink-0">{i.icon}</span>
                    <p
                      className="text-sm"
                      style={{ color: 'var(--foreground)' }}
                    >
                      {i.text}
                    </p>
                    <span
                      className="serandib-pill ml-auto shrink-0 text-xs"
                      style={
                        i.type === 'good'
                          ? {
                              background: 'rgba(16,185,129,0.1)',
                              color: 'var(--serandib-success)'
                            }
                          : i.type === 'warn'
                            ? {
                                background: 'rgba(245,158,11,0.1)',
                                color: 'var(--serandib-warning)'
                              }
                            : {
                                background: 'rgba(10,99,255,0.1)',
                                color: 'var(--serandib-blue)'
                              }
                      }
                    >
                      {i.type === 'good'
                        ? 'Positive'
                        : i.type === 'warn'
                          ? 'Heads up'
                          : 'Tip'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Financial Twin */}
            <div
              className="rounded-2xl p-5 text-white"
              style={{
                background:
                  'linear-gradient(135deg, #1e1b4b 0%, var(--serandib-indigo) 100%)',
                boxShadow: '0 4px 20px rgba(40,55,194,0.25)'
              }}
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="text-2xl">🧠</span>
                <p className="font-bold">Financial Twin Simulator</p>
              </div>
              <p className="text-sm text-white/60 leading-relaxed">
                Simulate purchases, savings plans, and payments before they
                affect your real balance.
              </p>
              <span
                className="mt-3 inline-block serandib-pill text-xs"
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.7)'
                }}
              >
                Coming in Phase 6
              </span>
            </div>

            {/* Intelligence modules */}
            <div className="serandib-card p-5">
              <h3
                className="mb-3 font-bold text-sm"
                style={{ color: 'var(--serandib-navy)' }}
              >
                Intelligence Modules
              </h3>
              <div className="space-y-2.5">
                {modules.map((m) => (
                  <div key={m.name} className="flex items-start gap-3">
                    <span className="text-lg shrink-0">{m.icon}</span>
                    <div>
                      <p
                        className="text-xs font-semibold"
                        style={{ color: 'var(--serandib-navy)' }}
                      >
                        {m.name}
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: 'var(--serandib-muted)' }}
                      >
                        {m.desc}
                      </p>
                    </div>
                    <span className="serandib-pill serandib-pill-blue ml-auto shrink-0 text-xs">
                      Soon
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <Link
              href="/dashboard"
              className="serandib-button-secondary block text-center py-2.5 text-sm"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </main>
    </AppShell>
  )
}
