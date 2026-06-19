'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import AppShell from '@/components/layout/AppShell'
import {
  fetchAccounts,
  fetchNotifications,
  fetchTransactions,
  type SafeAccount,
  type SafeNotification,
  type SafeTransaction
} from '@/lib/banking-client'

function QuickAction({
  icon,
  label,
  href
}: {
  icon: string
  label: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 rounded-xl p-3 transition-all hover:-translate-y-0.5"
      style={{
        background: 'rgba(10,99,255,0.06)',
        border: '1px solid var(--serandib-border)'
      }}
    >
      <span className="text-xl">{icon}</span>
      <span
        className="text-xs font-semibold text-center"
        style={{ color: 'var(--serandib-navy)' }}
      >
        {label}
      </span>
    </Link>
  )
}

function TxRow({ t }: { t: SafeTransaction }) {
  const isCredit = t.direction === 'credit'
  const isInternal = t.direction === 'internal'
  const arrow = isInternal ? '⇄' : isCredit ? '⬇' : '⬆'
  const amountColor =
    isCredit || isInternal
      ? 'var(--serandib-success)'
      : 'var(--serandib-danger)'
  const prefix = isCredit ? '+' : isInternal ? '' : '−'

  return (
    <div className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-blue-50/40">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base"
        style={{
          background: isCredit
            ? 'rgba(16,185,129,0.1)'
            : isInternal
              ? 'rgba(99,102,241,0.1)'
              : 'rgba(239,68,68,0.1)'
        }}
      >
        {arrow}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className="truncate text-sm font-medium"
          style={{ color: 'var(--foreground)' }}
        >
          {t.description ||
            (isCredit ? `From ${t.fromAccount}` : `To ${t.toAccount}`)}
        </p>
        <p className="text-xs" style={{ color: 'var(--serandib-muted)' }}>
          {t.reference && t.reference.startsWith('SRB-') && (
            <span className="mr-2 font-mono">{t.reference}</span>
          )}
          {new Date(t.createdAt).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          })}
        </p>
      </div>
      <span className="font-semibold text-sm" style={{ color: amountColor }}>
        {prefix}
        {t.amountDisplay}
      </span>
    </div>
  )
}

export default function Dashboard() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [accounts, setAccounts] = useState<SafeAccount[]>([])
  const [transactions, setTransactions] = useState<SafeTransaction[]>([])
  const [notifications, setNotifications] = useState<SafeNotification[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push('/login?next=/dashboard')
      return
    }

    async function load() {
      setDataLoading(true)
      try {
        const [accts, txns, notifs] = await Promise.all([
          fetchAccounts(),
          fetchTransactions({ limit: 5 }),
          fetchNotifications()
        ])
        setAccounts(accts)
        setTransactions(txns.transactions)
        setNotifications(notifs)
      } catch {
        /* non-fatal */
      } finally {
        setDataLoading(false)
      }
    }
    load()
  }, [authLoading, user, router])

  const totalBalance = accounts.reduce((s, a) => s + a.balanceMinorUnits, 0)
  const totalDisplay = (totalBalance / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
  const currency = accounts[0]?.currency ?? 'LKR'
  const unread = notifications.filter((n) => !n.readAt).length

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  if (authLoading) {
    return (
      <AppShell>
        <div className="flex flex-1 items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-200 border-t-blue-600" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <main className="flex-1 overflow-y-auto px-6 py-6 md:px-8">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p
              className="text-sm font-medium"
              style={{ color: 'var(--serandib-muted)' }}
            >
              {greeting}
            </p>
            <h1
              className="text-2xl font-extrabold"
              style={{ color: 'var(--serandib-navy)' }}
            >
              {user?.fullName ?? 'Welcome'}
            </h1>
            <p
              className="mt-1 text-xs"
              style={{ color: 'var(--serandib-muted)' }}
            >
              {new Date().toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                className="relative flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 hover:bg-blue-50"
                style={{ border: '1px solid var(--serandib-border)' }}
              >
                🔔
                {unread > 0 && (
                  <span
                    className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
                    style={{ background: 'var(--serandib-danger)' }}
                  >
                    {unread}
                  </span>
                )}
              </button>
            </div>
            <span className="serandib-pill serandib-pill-green">🛡 Secure</span>
          </div>
        </div>

        {/* Balance hero */}
        <div
          className="card-shine mb-6 rounded-2xl p-6 text-white"
          style={{
            background:
              'linear-gradient(135deg, var(--serandib-navy) 0%, var(--serandib-indigo) 60%, var(--serandib-blue) 100%)',
            boxShadow: '0 8px 32px rgba(6,26,64,0.25)'
          }}
        >
          <p className="text-sm font-medium text-white/60">Total Balance</p>
          <p className="mt-1 text-4xl font-extrabold tracking-tight">
            {dataLoading ? '—' : `${currency} ${totalDisplay}`}
          </p>
          <p className="mt-1 text-sm text-white/50">
            {dataLoading
              ? ''
              : `${accounts.length} account${accounts.length !== 1 ? 's' : ''} · All protected`}
          </p>
          <div className="mt-4 flex items-center gap-2">
            <span
              className="serandib-pill"
              style={{
                background: 'rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.85)'
              }}
            >
              ✓ Serandib Shield active
            </span>
          </div>
        </div>

        {/* Quick actions */}
        <div className="mb-6 grid grid-cols-4 gap-3">
          <QuickAction icon="⬆" label="Send Money" href="/bank-transfer" />
          <QuickAction icon="📄" label="Pay Bill" href="/pay-bills" />
          <QuickAction icon="🔒" label="Freeze Account" href="/bank-accounts" />
          <QuickAction icon="📊" label="Statement" href="/e-statement" />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Accounts */}
          <div className="lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <h2
                className="font-bold"
                style={{ color: 'var(--serandib-navy)' }}
              >
                My Accounts
              </h2>
              <Link
                href="/bank-accounts"
                className="text-xs font-semibold hover:underline"
                style={{ color: 'var(--serandib-blue)' }}
              >
                View all →
              </Link>
            </div>
            <div className="space-y-3">
              {dataLoading ? (
                [1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-20 animate-pulse rounded-2xl bg-gray-100"
                  />
                ))
              ) : accounts.length === 0 ? (
                <div className="serandib-card py-8 text-center">
                  <p
                    className="text-sm"
                    style={{ color: 'var(--serandib-muted)' }}
                  >
                    No accounts found.
                  </p>
                </div>
              ) : (
                accounts.map((a) => (
                  <div
                    key={a.id}
                    className="serandib-card flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-lg"
                        style={{ background: 'rgba(10,99,255,0.08)' }}
                      >
                        💳
                      </div>
                      <div>
                        <p
                          className="font-semibold text-sm"
                          style={{ color: 'var(--serandib-navy)' }}
                        >
                          {a.nickname || a.accountName}
                        </p>
                        <p
                          className="text-xs"
                          style={{ color: 'var(--serandib-muted)' }}
                        >
                          {a.accountNumberMasked}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className="font-bold"
                        style={{ color: 'var(--serandib-navy)' }}
                      >
                        {a.currency}{' '}
                        {(a.balanceMinorUnits / 100).toLocaleString('en-US', {
                          minimumFractionDigits: 2
                        })}
                      </p>
                      <span
                        className={`serandib-pill text-xs ${a.status === 'active' ? 'serandib-pill-green' : 'serandib-pill-red'}`}
                      >
                        {a.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Recent transactions */}
            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <h2
                  className="font-bold"
                  style={{ color: 'var(--serandib-navy)' }}
                >
                  Recent Transactions
                </h2>
                <Link
                  href="/e-statement"
                  className="text-xs font-semibold hover:underline"
                  style={{ color: 'var(--serandib-blue)' }}
                >
                  View all →
                </Link>
              </div>
              <div className="serandib-card p-2">
                {dataLoading ? (
                  [1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="mb-2 h-12 animate-pulse rounded-xl bg-gray-100"
                    />
                  ))
                ) : transactions.length === 0 ? (
                  <p
                    className="py-6 text-center text-sm"
                    style={{ color: 'var(--serandib-muted)' }}
                  >
                    No transactions yet.
                  </p>
                ) : (
                  transactions.map((t) => <TxRow key={t.id} t={t} />)
                )}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Smart Spend preview */}
            <div
              className="rounded-2xl p-5 text-white"
              style={{
                background:
                  'linear-gradient(135deg, #1e1b4b 0%, var(--serandib-indigo) 100%)',
                boxShadow: '0 4px 20px rgba(40,55,194,0.2)'
              }}
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="text-xl">🧠</span>
                <p className="font-bold">Smart Spend</p>
              </div>
              <p className="text-3xl font-extrabold">74</p>
              <p className="text-xs text-white/60">Financial health score</p>
              <div className="mt-3 h-1.5 w-full rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-white/70"
                  style={{ width: '74%' }}
                />
              </div>
              <Link
                href="/smart-spend"
                className="mt-3 block text-xs font-semibold text-white/70 hover:text-white"
              >
                View insights →
              </Link>
            </div>

            {/* Security preview */}
            <div
              className="rounded-2xl p-5"
              style={{
                background: 'rgba(16,185,129,0.06)',
                border: '1px solid rgba(16,185,129,0.15)'
              }}
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="text-xl">🛡</span>
                <p
                  className="font-bold text-sm"
                  style={{ color: 'var(--serandib-navy)' }}
                >
                  Security Center
                </p>
              </div>
              <div className="space-y-1.5">
                {['Session protected', 'APIs secured', 'Accounts verified'].map(
                  (s) => (
                    <div
                      key={s}
                      className="flex items-center gap-2 text-xs"
                      style={{ color: 'var(--serandib-success)' }}
                    >
                      <span>✓</span> {s}
                    </div>
                  )
                )}
              </div>
              <Link
                href="/security"
                className="mt-3 block text-xs font-semibold hover:underline"
                style={{ color: 'var(--serandib-success)' }}
              >
                View security timeline →
              </Link>
            </div>

            {/* Notifications */}
            {notifications.length > 0 && (
              <div className="serandib-card">
                <p
                  className="mb-3 font-bold text-sm"
                  style={{ color: 'var(--serandib-navy)' }}
                >
                  Notifications{' '}
                  {unread > 0 && (
                    <span className="serandib-pill serandib-pill-blue ml-1">
                      {unread} new
                    </span>
                  )}
                </p>
                <div className="space-y-2">
                  {notifications.slice(0, 3).map((n) => (
                    <div
                      key={n.id}
                      className="text-xs"
                      style={{
                        color: !n.readAt
                          ? 'var(--foreground)'
                          : 'var(--serandib-muted)'
                      }}
                    >
                      {!n.readAt && (
                        <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-blue-500 align-middle" />
                      )}
                      {n.message}
                    </div>
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
