'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import AppShell from '@/components/layout/AppShell'
import EmptyState from '@/components/ui/EmptyState'
import LoadingState from '@/components/ui/LoadingState'
import { fetchAccounts, type SafeAccount } from '@/lib/banking-client'

const CardIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <line x1="2" y1="10" x2="22" y2="10" />
  </svg>
)
const LockIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)
const SendIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
)
const HistoryIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 .49-4.98" />
  </svg>
)
const CheckIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
)
const ShieldIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
)

function AccountCard({ account }: { account: SafeAccount }) {
  const isFrozen = account.status === 'frozen'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        borderRadius: '1.5rem',
        overflow: 'hidden',
        border: '1px solid #e7edf1'
      }}
    >
      {/* Card header with gradient */}
      <div
        style={{
          padding: '1.75rem 2rem',
          background: isFrozen
            ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
            : 'linear-gradient(135deg, #071f2a 0%, #0d9488 100%)',
          color: '#fff',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            position: 'absolute',
            bottom: -20,
            right: -20,
            width: 100,
            height: 100,
            background: 'rgba(255,255,255,0.04)',
            borderRadius: '50%',
            pointerEvents: 'none'
          }}
        />
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <p
              style={{
                fontSize: '0.75rem',
                color: 'rgba(255,255,255,0.55)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontWeight: 700,
                marginBottom: '0.375rem'
              }}
            >
              {account.accountName?.includes('Savings') ? 'Savings Account' : account.accountName?.includes('Expense') ? 'Expense Account' : 'Account'}
            </p>
            <p
              style={{
                fontSize: '1.125rem',
                fontWeight: 700,
                letterSpacing: '-0.01em'
              }}
            >
              {account.nickname || account.accountName}
            </p>
            <p
              style={{
                fontSize: '0.875rem',
                color: 'rgba(255,255,255,0.55)',
                marginTop: '0.25rem',
                fontFamily: 'monospace',
                letterSpacing: '0.06em'
              }}
            >
              {account.accountNumberMasked}
            </p>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.12)'
            }}
          >
            {isFrozen ? <LockIcon /> : <CardIcon />}
          </div>
        </div>
        <div style={{ marginTop: '1.25rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
            Available Balance
          </p>
          <p
            style={{
              fontSize: '2rem',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
              marginTop: '0.125rem'
            }}
          >
            {account.currency}{' '}
            {(account.balanceMinorUnits / 100).toLocaleString('en-US', {
              minimumFractionDigits: 2
            })}
          </p>
        </div>
        <div style={{ marginTop: '1rem' }}>
          <span
            className={`app-pill ${isFrozen ? 'app-pill-yellow' : 'app-pill-green'}`}
            style={{
              background: isFrozen
                ? 'rgba(245,158,11,0.2)'
                : 'rgba(16,185,129,0.2)',
              color: '#fff'
            }}
          >
            {isFrozen ? <LockIcon /> : <CheckIcon />} {account.status}
          </span>
        </div>
      </div>

      {/* Actions bar */}
      <div
        style={{
          background: '#fff',
          padding: '1rem 1.5rem',
          display: 'flex',
          gap: '0.75rem',
          flexWrap: 'wrap'
        }}
      >
        <Link
          href={`/bank-transfer?from=${account.id}`}
          className={`app-button-primary${isFrozen ? ' disabled' : ''}`}
          style={{
            height: 38,
            padding: '0 1.125rem',
            fontSize: '0.8125rem',
            pointerEvents: isFrozen ? 'none' : undefined,
            opacity: isFrozen ? 0.4 : 1
          }}
          aria-disabled={isFrozen}
        >
          <SendIcon /> Send Money
        </Link>
        <Link
          href={`/e-statement?account=${account.id}`}
          className="app-button-ghost"
          style={{ height: 38, padding: '0 1.125rem', fontSize: '0.8125rem' }}
        >
          <HistoryIcon /> History
        </Link>
      </div>
    </div>
  )
}

export default function BankAccountsPage() {
  const [accounts, setAccounts] = useState<SafeAccount[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAccounts()
      .then(setAccounts)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const totalBalance = accounts.reduce((s, a) => s + a.balanceMinorUnits, 0)
  const activeCount = accounts.filter((a) => a.status === 'active').length
  const frozenCount = accounts.filter((a) => a.status === 'frozen').length
  const currency = accounts[0]?.currency ?? 'LKR'

  return (
    <AppShell
      title="My Accounts"
      subtitle="Manage your accounts and Account Shield Mode"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        {/* Stat row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1rem'
          }}
        >
          <div className="app-stat-card">
            <p className="app-stat-label">Total Balance</p>
            <p
              className="app-stat-value"
              style={{ color: '#087f7a', fontSize: '1.25rem' }}
            >
              {loading
                ? '—'
                : `${currency} ${(totalBalance / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            </p>
          </div>
          <div className="app-stat-card">
            <p className="app-stat-label">Active</p>
            <p className="app-stat-value" style={{ color: '#059669' }}>
              {loading
                ? '—'
                : `${activeCount} account${activeCount !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div className="app-stat-card">
            <p className="app-stat-label">Frozen</p>
            <p
              className="app-stat-value"
              style={{ color: frozenCount > 0 ? '#dc2626' : '#6b7a90' }}
            >
              {loading
                ? '—'
                : `${frozenCount} account${frozenCount !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>

        {/* Shield info */}
        <div
          className="app-card-soft"
          style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'rgba(8,127,122,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#087f7a',
              flexShrink: 0
            }}
          >
            <ShieldIcon />
          </div>
          <div>
            <p
              style={{
                fontWeight: 700,
                color: '#071f2a',
                fontSize: '0.9375rem'
              }}
            >
              Account Shield Mode
            </p>
            <p
              style={{
                color: '#6b7a90',
                fontSize: '0.875rem',
                marginTop: '0.25rem',
                lineHeight: 1.6
              }}
            >
              Instantly freeze any account to block all outgoing transfers.
              Frozen accounts cannot send money but can still receive deposits.
              Unfreeze anytime from the Security Center.
            </p>
          </div>
        </div>

        {/* Accounts grid */}
        {loading ? (
          <LoadingState />
        ) : accounts.length === 0 ? (
          <div className="app-card">
            <EmptyState
              title="No accounts found"
              description="Your bank accounts will appear here."
            />
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
              gap: '1.25rem'
            }}
          >
            {accounts.map((a) => (
              <AccountCard key={a.id} account={a} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
