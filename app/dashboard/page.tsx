'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import AppShell from '@/components/layout/AppShell'
import EmptyState from '@/components/ui/EmptyState'
import LoadingState from '@/components/ui/LoadingState'
import {
  fetchAccounts,
  fetchBillPayments,
  fetchNotifications,
  fetchTransactions,
  type SafeAccount,
  type SafeBillPayment,
  type SafeNotification,
  type SafeTransaction
} from '@/lib/banking-client'

// ── Icons ───────────────────────────────────────────────
const SendIcon = () => (
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
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
)
const BillIcon = () => (
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
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
)
const FreezeIcon = () => (
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
    <path d="M12 2v20M4.93 4.93l14.14 14.14M2 12h20M4.93 19.07l14.14-14.14" />
  </svg>
)
const StatementIcon = () => (
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
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
)
const ArrowUpIcon = () => (
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
    <line x1="12" y1="19" x2="12" y2="5" />
    <polyline points="5 12 12 5 19 12" />
  </svg>
)
const ArrowDownIcon = () => (
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
    <line x1="12" y1="5" x2="12" y2="19" />
    <polyline points="19 12 12 19 5 12" />
  </svg>
)
const SwitchIcon = () => (
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
    <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
  </svg>
)
const ShieldIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
)
const CardIcon = () => (
  <svg
    width="18"
    height="18"
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

// ── Sub-components ──────────────────────────────────────

function QuickAction({
  icon,
  label,
  href
}: {
  icon: React.ReactNode
  label: string
  href: string
}) {
  return (
    <Link href={href} className="quick-action-card">
      <span className="quick-action-icon">{icon}</span>
      <span className="quick-action-label">{label}</span>
    </Link>
  )
}

function TxRow({ t }: { t: SafeTransaction }) {
  const isCredit = t.direction === 'credit'
  const isInternal = t.direction === 'internal'
  const iconClass = isCredit
    ? 'tx-icon-credit'
    : isInternal
      ? 'tx-icon-internal'
      : 'tx-icon-debit'
  const amtClass = isCredit
    ? 'tx-amount-credit'
    : isInternal
      ? 'tx-amount-internal'
      : 'tx-amount-debit'
  const prefix = isCredit ? '+' : isInternal ? '±' : '−'

  return (
    <div className="tx-row">
      <div className={`tx-icon ${iconClass}`}>
        {isCredit ? (
          <ArrowDownIcon />
        ) : isInternal ? (
          <SwitchIcon />
        ) : (
          <ArrowUpIcon />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: '0.9rem',
            fontWeight: 600,
            color: '#10202b',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {t.description ||
            (isCredit ? `From ${t.fromAccount}` : `To ${t.toAccount}`)}
        </p>
        <p
          style={{
            fontSize: '0.75rem',
            color: '#6b7a90',
            marginTop: '0.125rem'
          }}
        >
          {new Date(t.createdAt).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          })}
          {t.reference?.startsWith('SRB-') && (
            <span
              style={{
                fontFamily: 'monospace',
                marginLeft: '0.5rem',
                fontSize: '0.7rem'
              }}
            >
              {t.reference}
            </span>
          )}
        </p>
      </div>
      <span className={amtClass} style={{ fontSize: '0.9rem', flexShrink: 0 }}>
        {prefix}
        {t.amountDisplay}
      </span>
    </div>
  )
}

// ── Page ────────────────────────────────────────────────

export default function Dashboard() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [accounts, setAccounts] = useState<SafeAccount[]>([])
  const [transactions, setTransactions] = useState<SafeTransaction[]>([])
  const [notifications, setNotifications] = useState<SafeNotification[]>([])
  const [billPayments, setBillPayments] = useState<SafeBillPayment[]>([])
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
        const [accts, txns, notifs, bills] = await Promise.all([
          fetchAccounts(),
          fetchTransactions({ limit: 5 }),
          fetchNotifications(),
          fetchBillPayments({ limit: 3 })
        ])
        setAccounts(accts)
        setTransactions(txns.transactions)
        setNotifications(notifs)
        setBillPayments(bills.billPayments)
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
  const name =
    user?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'there'
  const greeting = (() => {
    const h = new Date().getHours()
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  })()
  const dateStr = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  if (authLoading)
    return (
      <AppShell>
        <LoadingState />
      </AppShell>
    )

  return (
    <AppShell
      title={`${greeting}, ${name}`}
      subtitle={dateStr}
      actions={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="app-pill app-pill-green">
            <ShieldIcon /> Secure
          </span>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        {/* ── Balance hero ─────────────────────────────── */}
        <div className="app-card-dark">
          <p
            style={{
              fontSize: '0.875rem',
              color: 'rgba(255,255,255,0.6)',
              marginBottom: '0.375rem'
            }}
          >
            Total Balance
          </p>
          <p
            style={{
              fontSize: '2.5rem',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 1.1
            }}
          >
            {dataLoading ? '—' : `${currency} ${totalDisplay}`}
          </p>
          <p
            style={{
              fontSize: '0.875rem',
              color: 'rgba(255,255,255,0.5)',
              marginTop: '0.5rem'
            }}
          >
            {dataLoading
              ? ''
              : `${accounts.length} account${accounts.length !== 1 ? 's' : ''} · All protected`}
          </p>
        </div>

        {/* ── Quick actions ─────────────────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '1rem'
          }}
        >
          <QuickAction
            icon={<SendIcon />}
            label="Send Money"
            href="/bank-transfer"
          />
          <QuickAction icon={<BillIcon />} label="Pay Bill" href="/pay-bills" />
          <QuickAction
            icon={<FreezeIcon />}
            label="Accounts"
            href="/bank-accounts"
          />
          <QuickAction
            icon={<StatementIcon />}
            label="Statement"
            href="/e-statement"
          />
        </div>

        {/* ── Main 2-column grid ───────────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0,2fr) minmax(300px,1fr)',
            gap: '1.5rem',
            alignItems: 'start'
          }}
        >
          {/* Left column */}
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
          >
            {/* My Accounts */}
            <div className="app-card">
              <div className="app-section-header">
                <h2 className="app-section-title" style={{ marginBottom: 0 }}>
                  My Accounts
                </h2>
                <Link href="/bank-accounts" className="app-view-all">
                  View all →
                </Link>
              </div>
              {dataLoading ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}
                >
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="app-skeleton"
                      style={{ height: 64 }}
                    />
                  ))}
                </div>
              ) : accounts.length === 0 ? (
                <EmptyState title="No accounts found" />
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}
                >
                  {accounts.map((a) => (
                    <div
                      key={a.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        padding: '0.875rem 1rem',
                        borderRadius: '0.875rem',
                        border: '1px solid #f1f5f8',
                        background: '#fafcfc'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.875rem'
                        }}
                      >
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: '#f0faf9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#087f7a',
                            flexShrink: 0
                          }}
                        >
                          <CardIcon />
                        </div>
                        <div>
                          <p
                            style={{
                              fontSize: '0.9rem',
                              fontWeight: 600,
                              color: '#071f2a'
                            }}
                          >
                            {a.nickname || a.accountName}
                          </p>
                          <p
                            style={{
                              fontSize: '0.75rem',
                              color: '#6b7a90',
                              marginTop: '0.125rem'
                            }}
                          >
                            {a.accountNumberMasked}
                          </p>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p
                          style={{
                            fontSize: '1rem',
                            fontWeight: 700,
                            color: '#071f2a'
                          }}
                        >
                          {a.currency}{' '}
                          {(a.balanceMinorUnits / 100).toLocaleString('en-US', {
                            minimumFractionDigits: 2
                          })}
                        </p>
                        <span
                          className={`app-pill ${a.status === 'active' ? 'app-pill-green' : 'app-pill-red'}`}
                          style={{ marginTop: '0.25rem' }}
                        >
                          {a.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Transactions */}
            <div className="app-card">
              <div className="app-section-header">
                <h2 className="app-section-title" style={{ marginBottom: 0 }}>
                  Recent Transactions
                </h2>
                <Link href="/e-statement" className="app-view-all">
                  View all →
                </Link>
              </div>
              {dataLoading ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}
                >
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="app-skeleton"
                      style={{ height: 52 }}
                    />
                  ))}
                </div>
              ) : transactions.length === 0 ? (
                <EmptyState
                  title="No transactions yet"
                  description="Your transactions will appear here."
                />
              ) : (
                <div>
                  {transactions.map((t) => (
                    <TxRow key={t.id} t={t} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right column */}
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
          >
            {/* Smart Spend preview */}
            <div className="app-card-dark">
              <p
                style={{
                  fontSize: '0.75rem',
                  color: 'rgba(255,255,255,0.55)',
                  marginBottom: '0.375rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontWeight: 700
                }}
              >
                Smart Spend
              </p>
              <p
                style={{
                  fontSize: '3rem',
                  fontWeight: 800,
                  lineHeight: 1,
                  letterSpacing: '-0.03em'
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
                Financial health score
              </p>
              <div
                style={{
                  marginTop: '0.875rem',
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
              <Link
                href="/smart-spend"
                style={{
                  display: 'block',
                  marginTop: '0.875rem',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.65)'
                }}
              >
                View insights →
              </Link>
            </div>

            {/* Recent & upcoming bills */}
            <div className="app-card">
              <div className="app-section-header">
                <h2 className="app-section-title" style={{ marginBottom: 0 }}>
                  Bills
                </h2>
                <Link href="/pay-bills" className="app-view-all">
                  Pay bills →
                </Link>
              </div>
              {dataLoading ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}
                >
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="app-skeleton"
                      style={{ height: 44 }}
                    />
                  ))}
                </div>
              ) : billPayments.length === 0 ? (
                <EmptyState
                  title="No bills paid yet"
                  description="Pay a bill to see it here."
                />
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.625rem'
                  }}
                >
                  {billPayments.map((b) => (
                    <div
                      key={b.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem'
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <p
                          style={{
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            color: '#071f2a',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {b.billerName}
                        </p>
                        <p style={{ fontSize: '0.7rem', color: '#6b7a90' }}>
                          {new Date(b.paidAt ?? b.createdAt).toLocaleDateString(
                            'en-GB',
                            {
                              day: '2-digit',
                              month: 'short'
                            }
                          )}{' '}
                          · Ref {b.billReference}
                        </p>
                      </div>
                      <span
                        className="tx-amount-debit"
                        style={{ fontSize: '0.8125rem', flexShrink: 0 }}
                      >
                        −{b.amountDisplay}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Security */}
            <div className="app-card-soft">
              <p
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  color: '#071f2a',
                  marginBottom: '0.875rem'
                }}
              >
                Security Center
              </p>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}
              >
                {['Session protected', 'APIs secured', 'Accounts verified'].map(
                  (s) => (
                    <div
                      key={s}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.8125rem'
                      }}
                    >
                      <span
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          background: 'rgba(16,185,129,0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#059669',
                          fontSize: '0.7rem',
                          flexShrink: 0
                        }}
                      >
                        ✓
                      </span>
                      <span style={{ color: '#374151' }}>{s}</span>
                    </div>
                  )
                )}
              </div>
              <Link
                href="/security"
                style={{
                  display: 'block',
                  marginTop: '0.875rem',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: '#087f7a'
                }}
              >
                View security timeline →
              </Link>
            </div>

            {/* Notifications */}
            {notifications.length > 0 && (
              <div className="app-card">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.875rem'
                  }}
                >
                  <p
                    style={{
                      fontWeight: 700,
                      fontSize: '0.8125rem',
                      color: '#071f2a'
                    }}
                  >
                    Notifications
                  </p>
                  {unread > 0 && (
                    <span className="app-pill app-pill-teal">{unread} new</span>
                  )}
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.625rem'
                  }}
                >
                  {notifications.slice(0, 3).map((n) => (
                    <div
                      key={n.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.625rem'
                      }}
                    >
                      {!n.readAt && (
                        <div
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: '#087f7a',
                            flexShrink: 0,
                            marginTop: '0.3rem'
                          }}
                        />
                      )}
                      <p
                        style={{
                          fontSize: '0.8rem',
                          color: n.readAt ? '#9ca3af' : '#374151',
                          lineHeight: 1.5
                        }}
                      >
                        {n.message}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
