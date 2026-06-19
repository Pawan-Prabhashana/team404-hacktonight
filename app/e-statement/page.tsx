'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import AppShell from '@/components/layout/AppShell'
import {
  fetchAccounts,
  fetchTransactions,
  type SafeAccount,
  type SafeTransaction
} from '@/lib/banking-client'

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
        if (accts.length > 0) {
          const txns = await fetchTransactions({ limit: 50 })
          setTransactions(txns.transactions)
        }
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
    <AppShell>
      <main className="flex-1 overflow-y-auto px-6 py-6 md:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1
              className="text-2xl font-extrabold"
              style={{ color: 'var(--serandib-navy)' }}
            >
              E-Statement
            </h1>
            <p
              className="mt-1 text-sm"
              style={{ color: 'var(--serandib-muted)' }}
            >
              Transaction history, intelligence summaries, and export
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="serandib-button-secondary text-xs py-2 px-4 flex items-center gap-1"
            >
              📥 PDF
            </button>
            <button
              type="button"
              className="serandib-button-secondary text-xs py-2 px-4 flex items-center gap-1"
            >
              📊 CSV
            </button>
          </div>
        </div>

        {/* Statement Intelligence */}
        {!loading && transactions.length > 0 && (
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: 'Total Credits',
                value: `LKR ${(totalCredits / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
                icon: '⬇',
                color: 'var(--serandib-success)'
              },
              {
                label: 'Total Debits',
                value: `LKR ${(totalDebits / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
                icon: '⬆',
                color: 'var(--serandib-danger)'
              },
              {
                label: 'Transactions',
                value: `${displayed.length}`,
                icon: '📋',
                color: 'var(--serandib-blue)'
              },
              {
                label: 'Avg Daily Spend',
                value: `LKR ${(avgDaily / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
                icon: '📅',
                color: 'var(--serandib-muted)'
              }
            ].map((s) => (
              <div key={s.label} className="serandib-card">
                <p className="text-xl mb-1">{s.icon}</p>
                <p
                  className="text-xs font-medium"
                  style={{ color: 'var(--serandib-muted)' }}
                >
                  {s.label}
                </p>
                <p className="mt-0.5 font-bold" style={{ color: s.color }}>
                  {s.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="mb-4 flex flex-wrap gap-3">
          <select
            value={selectedAccId}
            onChange={(e) => handleAccChange(e.target.value)}
            className="serandib-input max-w-[220px]"
          >
            <option value="">All accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={String(a.id)}>
                {a.nickname || a.accountName} — {a.accountNumberMasked}
              </option>
            ))}
          </select>

          <div
            className="flex gap-1 rounded-xl p-1"
            style={{
              background: 'rgba(10,99,255,0.06)',
              border: '1px solid var(--serandib-border)'
            }}
          >
            {(['all', 'credit', 'debit'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className="rounded-lg px-4 py-1.5 text-xs font-semibold capitalize transition-all"
                style={
                  typeFilter === t
                    ? { background: 'var(--serandib-blue)', color: 'white' }
                    : { color: 'var(--serandib-muted)' }
                }
              >
                {t}
              </button>
            ))}
          </div>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transactions…"
            className="serandib-input max-w-[200px]"
          />
        </div>

        {/* Statement area */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            border: '1px solid var(--serandib-border)',
            background: 'white'
          }}
        >
          {/* Statement header */}
          <div
            className="flex items-center gap-4 px-6 py-4"
            style={{
              borderBottom: '1px solid var(--serandib-border)',
              background: 'rgba(10,99,255,0.03)'
            }}
          >
            <div className="relative h-10 w-10 overflow-hidden rounded-lg">
              <Image
                src="/brand/serandib-logo.png"
                alt="Serandib Bank"
                fill
                style={{ objectFit: 'cover' }}
              />
            </div>
            <div>
              <p
                className="font-bold text-sm"
                style={{ color: 'var(--serandib-navy)' }}
              >
                Serandib Bank — Transaction Statement
              </p>
              <p className="text-xs" style={{ color: 'var(--serandib-muted)' }}>
                Generated:{' '}
                {new Date().toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
            </div>
          </div>

          {/* Transactions table */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
            </div>
          ) : displayed.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-3xl mb-3">📋</p>
              <p
                className="font-semibold"
                style={{ color: 'var(--serandib-navy)' }}
              >
                No transactions
              </p>
              <p
                className="text-sm mt-1"
                style={{ color: 'var(--serandib-muted)' }}
              >
                {search || typeFilter !== 'all'
                  ? 'Try adjusting your filters.'
                  : 'No transactions found for this account.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr
                    style={{
                      borderBottom: '1px solid var(--serandib-border)',
                      background: 'rgba(10,99,255,0.02)'
                    }}
                  >
                    {[
                      'Date',
                      'Description',
                      'From / To',
                      'Type',
                      'Amount',
                      'Status'
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                        style={{ color: 'var(--serandib-muted)' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((t, i) => {
                    const isCredit = t.direction === 'credit'
                    return (
                      <tr
                        key={t.id}
                        style={{
                          borderBottom:
                            i < displayed.length - 1
                              ? '1px solid var(--serandib-border)'
                              : 'none'
                        }}
                      >
                        <td
                          className="px-4 py-3 whitespace-nowrap text-xs"
                          style={{ color: 'var(--serandib-muted)' }}
                        >
                          {new Date(t.createdAt).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <p
                            className="font-medium text-xs"
                            style={{ color: 'var(--foreground)' }}
                          >
                            {t.description ||
                              (isCredit
                                ? 'Incoming transfer'
                                : 'Outgoing transfer')}
                          </p>
                        </td>
                        <td
                          className="px-4 py-3 text-xs font-mono"
                          style={{ color: 'var(--serandib-muted)' }}
                        >
                          {isCredit ? t.fromAccount : t.toAccount}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`serandib-pill text-xs ${isCredit ? 'serandib-pill-green' : 'serandib-pill-red'}`}
                          >
                            {isCredit ? 'Credit' : 'Debit'}
                          </span>
                        </td>
                        <td
                          className="px-4 py-3 font-semibold text-xs whitespace-nowrap"
                          style={{
                            color: isCredit
                              ? 'var(--serandib-success)'
                              : 'var(--serandib-danger)'
                          }}
                        >
                          {isCredit ? '+' : '−'}
                          {t.amountDisplay}
                        </td>
                        <td className="px-4 py-3">
                          <span className="serandib-pill serandib-pill-green text-xs capitalize">
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
      </main>
    </AppShell>
  )
}
