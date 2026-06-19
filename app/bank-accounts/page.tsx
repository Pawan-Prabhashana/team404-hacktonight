'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import AppShell from '@/components/layout/AppShell'
import {
  fetchAccounts,
  type SafeAccount,
  updateAccount
} from '@/lib/banking-client'

function AccountCard({
  account,
  updating,
  onToggleFreeze,
  onEditNickname
}: {
  account: SafeAccount
  updating: boolean
  onToggleFreeze: (a: SafeAccount) => void
  onEditNickname: (a: SafeAccount) => void
}) {
  const isFrozen = account.status === 'frozen'

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: isFrozen
          ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
          : 'linear-gradient(135deg, var(--serandib-navy) 0%, var(--serandib-indigo) 100%)',
        color: 'white',
        boxShadow: '0 8px 24px rgba(6,26,64,0.2)',
        opacity: isFrozen ? 0.85 : 1
      }}
    >
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-white/60 uppercase tracking-wider">
            {account.accountName}
          </p>
          <p className="mt-0.5 text-lg font-bold">
            {account.nickname || 'Account'}
          </p>
        </div>
        <span
          className="serandib-pill text-xs"
          style={
            isFrozen
              ? { background: 'rgba(239,68,68,0.2)', color: '#fca5a5' }
              : { background: 'rgba(16,185,129,0.2)', color: '#6ee7b7' }
          }
        >
          {isFrozen ? '🔒 Frozen' : '✓ Active'}
        </span>
      </div>

      <p className="mb-1 text-sm font-mono text-white/50">
        {account.accountNumberMasked}
      </p>
      <p className="text-3xl font-extrabold">
        {account.currency}{' '}
        {(account.balanceMinorUnits / 100).toLocaleString('en-US', {
          minimumFractionDigits: 2
        })}
      </p>

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          disabled={updating}
          onClick={() => onToggleFreeze(account)}
          className="flex-1 rounded-xl py-2 text-xs font-semibold transition-all disabled:opacity-50"
          style={
            isFrozen
              ? {
                  background: 'rgba(16,185,129,0.2)',
                  color: '#6ee7b7',
                  border: '1px solid rgba(16,185,129,0.3)'
                }
              : {
                  background: 'rgba(239,68,68,0.2)',
                  color: '#fca5a5',
                  border: '1px solid rgba(239,68,68,0.3)'
                }
          }
        >
          {updating
            ? '…'
            : isFrozen
              ? '🔓 Unfreeze Account'
              : '🔒 Freeze Account'}
        </button>
        <button
          type="button"
          onClick={() => onEditNickname(account)}
          className="rounded-xl px-3 py-2 text-xs font-semibold transition-all"
          style={{
            background: 'rgba(255,255,255,0.1)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.15)'
          }}
        >
          ✏ Edit
        </button>
      </div>

      {/* Send / View transactions */}
      <div className="mt-2 flex gap-2">
        <a
          href="/bank-transfer"
          className="flex-1 rounded-xl py-2 text-center text-xs font-semibold transition-all"
          style={{
            background: isFrozen
              ? 'rgba(255,255,255,0.05)'
              : 'rgba(255,255,255,0.15)',
            color: isFrozen ? 'rgba(255,255,255,0.35)' : 'white',
            border: '1px solid rgba(255,255,255,0.15)',
            pointerEvents: isFrozen ? 'none' : 'auto',
            cursor: isFrozen ? 'not-allowed' : 'pointer'
          }}
        >
          ⬆ Send Money
        </a>
        <a
          href="/transactions"
          className="rounded-xl px-3 py-2 text-xs font-semibold transition-all"
          style={{
            background: 'rgba(255,255,255,0.1)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.15)'
          }}
        >
          📋 History
        </a>
      </div>
    </div>
  )
}

function NicknameModal({
  account,
  onClose,
  onSave
}: {
  account: SafeAccount
  onClose: () => void
  onSave: (id: number, nick: string) => Promise<void>
}) {
  const [nick, setNick] = useState(account.nickname || '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function handleSave() {
    if (!nick.trim()) {
      setErr('Nickname cannot be empty')
      return
    }
    setBusy(true)
    try {
      await onSave(account.id, nick.trim())
      onClose()
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(6,26,64,0.5)', backdropFilter: 'blur(6px)' }}
    >
      <div className="serandib-card w-full max-w-sm p-6">
        <h3
          className="mb-4 text-lg font-bold"
          style={{ color: 'var(--serandib-navy)' }}
        >
          Edit Account Name
        </h3>
        <input
          value={nick}
          onChange={(e) => setNick(e.target.value)}
          className="serandib-input mb-3"
          placeholder="e.g. My Savings"
          maxLength={40}
        />
        {err && (
          <p
            className="mb-2 text-xs"
            style={{ color: 'var(--serandib-danger)' }}
          >
            {err}
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="serandib-button-secondary flex-1 py-2 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={busy}
            className="serandib-button-primary flex-1 py-2 text-sm disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function BankAccountsPage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<SafeAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [editAccount, setEditAccount] = useState<SafeAccount | null>(null)

  const loadAccounts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setAccounts(await fetchAccounts())
    } catch (err) {
      const msg = (err as Error).message
      if (msg.includes('authenticated'))
        router.push('/login?next=/bank-accounts')
      else setError(msg)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    loadAccounts()
  }, [loadAccounts])

  async function toggleFreeze(account: SafeAccount) {
    setUpdatingId(account.id)
    try {
      const next = account.status === 'active' ? 'frozen' : 'active'
      const updated = await updateAccount({
        accountId: account.id,
        status: next
      })
      setAccounts((prev) =>
        prev.map((a) =>
          a.id === account.id ? { ...a, status: updated.status } : a
        )
      )
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setUpdatingId(null)
    }
  }

  async function saveNickname(id: number, nickname: string) {
    const updated = await updateAccount({ accountId: id, nickname })
    setAccounts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, nickname: updated.nickname } : a))
    )
  }

  const totalBalance = accounts.reduce((s, a) => s + a.balanceMinorUnits, 0)
  const activeCount = accounts.filter((a) => a.status === 'active').length
  const frozenCount = accounts.filter((a) => a.status === 'frozen').length

  return (
    <AppShell>
      <main className="flex-1 overflow-y-auto px-6 py-6 md:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1
            className="text-2xl font-extrabold"
            style={{ color: 'var(--serandib-navy)' }}
          >
            My Accounts
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: 'var(--serandib-muted)' }}
          >
            Manage your accounts and Account Shield Mode
          </p>
        </div>

        {/* Summary row */}
        {!loading && accounts.length > 0 && (
          <div className="mb-6 grid grid-cols-3 gap-4">
            {[
              {
                label: 'Total Balance',
                value: `LKR ${(totalBalance / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
                icon: '💰',
                color: 'var(--serandib-blue)'
              },
              {
                label: 'Active',
                value: `${activeCount} account${activeCount !== 1 ? 's' : ''}`,
                icon: '✓',
                color: 'var(--serandib-success)'
              },
              {
                label: 'Frozen',
                value: `${frozenCount} account${frozenCount !== 1 ? 's' : ''}`,
                icon: '🔒',
                color:
                  frozenCount > 0
                    ? 'var(--serandib-danger)'
                    : 'var(--serandib-muted)'
              }
            ].map((s) => (
              <div key={s.label} className="serandib-card text-center">
                <p className="text-2xl mb-1">{s.icon}</p>
                <p
                  className="text-xs font-medium"
                  style={{ color: 'var(--serandib-muted)' }}
                >
                  {s.label}
                </p>
                <p
                  className="font-bold text-sm mt-0.5"
                  style={{ color: s.color }}
                >
                  {s.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Account Shield info banner */}
        <div
          className="mb-6 rounded-2xl p-4 flex items-start gap-3"
          style={{
            background: 'rgba(10,99,255,0.06)',
            border: '1px solid var(--serandib-border)'
          }}
        >
          <span className="text-2xl">🛡</span>
          <div>
            <p
              className="font-semibold text-sm"
              style={{ color: 'var(--serandib-navy)' }}
            >
              Account Shield Mode
            </p>
            <p
              className="text-xs mt-0.5"
              style={{ color: 'var(--serandib-muted)' }}
            >
              Instantly freeze any account to block all outgoing transfers.
              Unfreeze at any time. Frozen accounts cannot be used as a source
              for transfers.
            </p>
          </div>
        </div>

        {/* States */}
        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-52 animate-pulse rounded-2xl bg-gray-200"
              />
            ))}
          </div>
        )}

        {error && (
          <div
            className="rounded-2xl p-6 text-center"
            style={{
              background: 'rgba(239,68,68,0.06)',
              border: '1px solid rgba(239,68,68,0.2)'
            }}
          >
            <p className="text-sm" style={{ color: 'var(--serandib-danger)' }}>
              {error}
            </p>
            <button
              type="button"
              onClick={loadAccounts}
              className="mt-3 serandib-button-secondary text-sm py-2"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && accounts.length === 0 && (
          <div className="rounded-2xl p-10 text-center serandib-card">
            <p className="text-3xl mb-3">💳</p>
            <p
              className="font-semibold"
              style={{ color: 'var(--serandib-navy)' }}
            >
              No accounts found
            </p>
            <p
              className="text-sm mt-1"
              style={{ color: 'var(--serandib-muted)' }}
            >
              Contact support to open your first account.
            </p>
          </div>
        )}

        {!loading && !error && accounts.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map((a) => (
              <AccountCard
                key={a.id}
                account={a}
                updating={updatingId === a.id}
                onToggleFreeze={toggleFreeze}
                onEditNickname={setEditAccount}
              />
            ))}
          </div>
        )}
      </main>

      {editAccount && (
        <NicknameModal
          account={editAccount}
          onClose={() => setEditAccount(null)}
          onSave={saveNickname}
        />
      )}
    </AppShell>
  )
}
