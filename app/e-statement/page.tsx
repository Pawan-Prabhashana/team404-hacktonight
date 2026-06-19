'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import AppShell from '@/components/layout/AppShell'
import EmptyState from '@/components/ui/EmptyState'
import LoadingState from '@/components/ui/LoadingState'
import {
  fetchAccounts,
  fetchTransactions,
  type SafeAccount,
  type SafeTransaction
} from '@/lib/banking-client'

const ArrowUpIcon = () => (
  <svg
    width="12"
    height="12"
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
    width="12"
    height="12"
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

export default function EStatementPage() {
  const [accounts, setAccounts] = useState<SafeAccount[]>([])
  const [transactions, setTransactions] = useState<SafeTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAccId, setSelectedAccId] = useState('')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'debit' | 'credit'>(
    'all'
  )

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const accts = await fetchAccounts()
        setAccounts(accts)
        const txns = await fetchTransactions({ limit: 50 })
        setTransactions(txns.transactions)
      } catch {
        /* proxy handles auth */
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleAccChange(id: string) {
    setSelectedAccId(id)
    setLoading(true)
    try {
      const q = id ? { accountId: Number(id), limit: 50 } : { limit: 50 }
      const txns = await fetchTransactions(q)
      setTransactions(txns.transactions)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }

  const displayed = transactions.filter((t) => {
    if (typeFilter !== 'all' && t.direction !== typeFilter) return false
    if (
      search &&
      !t.description?.toLowerCase().includes(search.toLowerCase()) &&
      !t.fromAccount.includes(search) &&
      !t.toAccount.includes(search)
    )
      return false
    return true
  })

  const totalCredits = displayed
    .filter((t) => t.direction === 'credit')
    .reduce((s, t) => s + t.amountMinorUnits, 0)
  const totalDebits = displayed
    .filter((t) => t.direction === 'debit')
    .reduce((s, t) => s + t.amountMinorUnits, 0)
  const avgDaily = displayed.length > 0 ? totalDebits / 30 : 0

  return (
    <AppShell
      title="E-Statement"
      subtitle="Transaction history, summaries, and export"
      actions={
        <div style={{ display: 'flex', gap: '0.625rem' }}>
          <button
            type="button"
            className="app-button-ghost"
            style={{ height: 38, fontSize: '0.8125rem' }}
          >
            Export PDF
          </button>
          <button
            type="button"
            className="app-button-ghost"
            style={{ height: 38, fontSize: '0.8125rem' }}
          >
            Export CSV
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        {/* Stats */}
        {!loading && transactions.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1rem'
            }}
          >
            {[
              {
                label: 'Total Credits',
                value: `LKR ${(totalCredits / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
                color: '#059669'
              },
              {
                label: 'Total Debits',
                value: `LKR ${(totalDebits / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
                color: '#dc2626'
              },
              {
                label: 'Transactions',
                value: `${displayed.length}`,
                color: '#087f7a'
              },
              {
                label: 'Avg Daily Spend',
                value: `LKR ${(avgDaily / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
                color: '#6b7a90'
              }
            ].map((s) => (
              <div key={s.label} className="app-stat-card">
                <p className="app-stat-label">{s.label}</p>
                <p
                  className="app-stat-value"
                  style={{ color: s.color, fontSize: '1.1875rem' }}
                >
                  {s.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="app-card" style={{ padding: '1.25rem 1.5rem' }}>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.875rem',
              alignItems: 'center'
            }}
          >
            <select
              value={selectedAccId}
              onChange={(e) => handleAccChange(e.target.value)}
              className="app-select"
              style={{ maxWidth: 240 }}
            >
              <option value="">All accounts</option>
              {accounts.map((a) => (
                <option key={a.id} value={String(a.id)}>
                  {a.nickname || a.accountName} — {a.accountNumberMasked}
                </option>
              ))}
            </select>

            <div
              className="app-segmented"
              style={{ width: 'auto', flexShrink: 0 }}
            >
              {(['all', 'credit', 'debit'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={`app-segmented-btn${typeFilter === t ? ' active' : ''}`}
                  style={{ minWidth: 72 }}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search transactions…"
              className="app-input"
              style={{ maxWidth: 220 }}
            />
          </div>
        </div>

        {/* Statement */}
        <div className="app-card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1.25rem 1.75rem',
              borderBottom: '1px solid #f1f5f8',
              background: '#fafcfc'
            }}
          >
            <div
              style={{
                position: 'relative',
                width: 38,
                height: 38,
                borderRadius: '0.75rem',
                overflow: 'hidden',
                flexShrink: 0
              }}
            >
              <Image
                src="/brand/serandib-logo.png"
                alt="Serandib Bank"
                fill
                style={{ objectFit: 'cover' }}
              />
            </div>
            <div>
              <p
                style={{
                  fontWeight: 700,
                  color: '#071f2a',
                  fontSize: '0.9375rem'
                }}
              >
                Serandib Bank — Transaction Statement
              </p>
              <p
                style={{
                  fontSize: '0.8125rem',
                  color: '#6b7a90',
                  marginTop: '0.125rem'
                }}
              >
                Generated:{' '}
                {new Date().toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <LoadingState />
          ) : displayed.length === 0 ? (
            <EmptyState
              title="No transactions"
              description={
                search || typeFilter !== 'all'
                  ? 'Try adjusting your filters.'
                  : 'No transactions found for this account.'
              }
            />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="app-table" style={{ minWidth: 600 }}>
                <thead>
                  <tr>
                    {[
                      'Date',
                      'Description',
                      'From / To',
                      'Type',
                      'Amount',
                      'Status'
                    ].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((t) => {
                    const isCredit = t.direction === 'credit'
                    return (
                      <tr key={t.id}>
                        <td
                          style={{
                            whiteSpace: 'nowrap',
                            color: '#6b7a90',
                            fontSize: '0.8125rem'
                          }}
                        >
                          {new Date(t.createdAt).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        <td>
                          <p
                            style={{
                              fontWeight: 600,
                              fontSize: '0.875rem',
                              color: '#10202b'
                            }}
                          >
                            {t.description ||
                              (isCredit
                                ? 'Incoming transfer'
                                : 'Outgoing transfer')}
                          </p>
                          {t.reference?.startsWith('SRB-') && (
                            <p
                              style={{
                                fontSize: '0.75rem',
                                fontFamily: 'monospace',
                                color: '#9ca3af',
                                marginTop: '0.125rem'
                              }}
                            >
                              {t.reference}
                            </p>
                          )}
                        </td>
                        <td
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '0.8125rem',
                            color: '#6b7a90'
                          }}
                        >
                          {isCredit ? t.fromAccount : t.toAccount}
                        </td>
                        <td>
                          <span
                            className="app-pill"
                            style={
                              isCredit
                                ? {
                                    background: 'rgba(16,185,129,0.1)',
                                    color: '#059669'
                                  }
                                : t.type === 'card_purchase'
                                  ? { background: '#fef3c7', color: '#92400e' }
                                  : t.type === 'invisible_savings_sweep'
                                    ? {
                                        background: '#dcfce7',
                                        color: '#15803d'
                                      }
                                    : {
                                        background: 'rgba(239,68,68,0.08)',
                                        color: '#dc2626'
                                      }
                            }
                          >
                            {isCredit ? <ArrowDownIcon /> : <ArrowUpIcon />}
                            {t.type === 'card_purchase'
                              ? 'Card Purchase'
                              : t.type === 'invisible_savings_sweep'
                                ? 'Savings Sweep'
                                : t.type === 'bill_payment'
                                  ? 'Bill Payment'
                                  : isCredit
                                    ? 'Credit'
                                    : 'Debit'}
                          </span>
                        </td>
                        <td
                          style={{
                            fontWeight: 700,
                            fontSize: '0.9rem',
                            color: isCredit ? '#059669' : '#dc2626',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {isCredit ? '+' : '−'}
                          {t.amountDisplay}
                        </td>
                        <td>
                          <span
                            className={`app-pill ${t.status === 'completed' ? 'app-pill-green' : 'app-pill-gray'}`}
                          >
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
