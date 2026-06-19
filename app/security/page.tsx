import AppShell from '@/components/layout/AppShell'

const timeline = [
  {
    icon: '✅',
    event: 'Login successful',
    detail: 'customer@serandib.test · session established',
    time: 'Just now',
    color: 'var(--serandib-success)'
  },
  {
    icon: '👁',
    event: 'Dashboard viewed',
    detail: 'Accounts and balances loaded',
    time: '2 min ago',
    color: 'var(--serandib-blue)'
  },
  {
    icon: '💳',
    event: 'Account list fetched',
    detail: '2 accounts returned — ownership verified',
    time: '2 min ago',
    color: 'var(--serandib-blue)'
  },
  {
    icon: '🔒',
    event: 'Shield check performed',
    detail: 'All accounts: active status confirmed',
    time: '5 min ago',
    color: 'var(--serandib-success)'
  },
  {
    icon: '🔑',
    event: 'Session token validated',
    detail: 'SHA-256 hash matched — session valid',
    time: '10 min ago',
    color: 'var(--serandib-success)'
  }
]

const checklist = [
  {
    ok: true,
    label: 'HttpOnly session cookie',
    detail: 'serandib_session — not accessible via JavaScript'
  },
  {
    ok: true,
    label: 'Session token hashed in DB',
    detail: 'SHA-256 before storage — never stored raw'
  },
  {
    ok: true,
    label: 'Server-side session validation',
    detail: 'Every API call validates session from server only'
  },
  {
    ok: true,
    label: 'Account ownership enforced',
    detail: 'All banking APIs verify user owns the account'
  },
  {
    ok: true,
    label: 'bcrypt password hashing',
    detail: '12 rounds — no plaintext passwords in database'
  },
  {
    ok: true,
    label: 'Admin role protection',
    detail: '/api/admin/* requires role=admin in session'
  },
  {
    ok: true,
    label: 'No client-supplied userId',
    detail: 'All APIs derive userId from session, not request'
  },
  {
    ok: true,
    label: 'Generic error messages',
    detail: 'Invalid email or password — no user enumeration'
  },
  {
    ok: false,
    label: 'Device/session trust score',
    detail: 'Coming in Phase 6 — multi-device session tracking'
  },
  {
    ok: false,
    label: 'Real-time transfer risk scoring',
    detail: 'Coming in Phase 6 — SafePay execution engine'
  }
]

export default function SecurityPage() {
  return (
    <AppShell>
      <main className="flex-1 overflow-y-auto px-6 py-6 md:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1
            className="text-2xl font-extrabold"
            style={{ color: 'var(--serandib-navy)' }}
          >
            Security Center
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: 'var(--serandib-muted)' }}
          >
            Session protection, account shield, and audit timeline
          </p>
        </div>

        {/* Shield status banner */}
        <div
          className="mb-6 flex items-center gap-4 rounded-2xl p-5"
          style={{
            background: 'linear-gradient(135deg, #022c22 0%, #064e3b 100%)',
            color: 'white'
          }}
        >
          <span className="text-4xl">🛡</span>
          <div>
            <p className="font-bold text-lg">Serandib Shield Active</p>
            <p className="text-sm text-white/60">
              Your session is protected by HttpOnly cookies, server-side
              validation, and account ownership checks on every API call.
            </p>
          </div>
          <span
            className="serandib-pill ml-auto shrink-0"
            style={{ background: 'rgba(16,185,129,0.2)', color: '#6ee7b7' }}
          >
            ✓ Secure
          </span>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Security checklist */}
          <div className="lg:col-span-3">
            <div className="serandib-card p-6">
              <h2
                className="mb-4 font-bold"
                style={{ color: 'var(--serandib-navy)' }}
              >
                Security Checklist
              </h2>
              <div className="space-y-3">
                {checklist.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-start gap-3 rounded-xl p-3"
                    style={{
                      background: item.ok
                        ? 'rgba(16,185,129,0.04)'
                        : 'rgba(10,99,255,0.03)',
                      border: `1px solid ${item.ok ? 'rgba(16,185,129,0.15)' : 'rgba(10,99,255,0.08)'}`
                    }}
                  >
                    <span
                      className="mt-0.5 text-base shrink-0"
                      style={{
                        color: item.ok
                          ? 'var(--serandib-success)'
                          : 'var(--serandib-muted)'
                      }}
                    >
                      {item.ok ? '✓' : '○'}
                    </span>
                    <div>
                      <p
                        className="text-sm font-semibold"
                        style={{
                          color: item.ok
                            ? 'var(--serandib-navy)'
                            : 'var(--serandib-muted)'
                        }}
                      >
                        {item.label}
                      </p>
                      <p
                        className="text-xs mt-0.5"
                        style={{ color: 'var(--serandib-muted)' }}
                      >
                        {item.detail}
                      </p>
                    </div>
                    {!item.ok && (
                      <span className="serandib-pill serandib-pill-blue ml-auto shrink-0 text-xs">
                        Phase 6
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* SafePay Guardian */}
            <div
              className="mt-4 rounded-2xl p-5 text-white"
              style={{
                background:
                  'linear-gradient(135deg, #061a40 0%, var(--serandib-indigo) 100%)',
                boxShadow: '0 4px 20px rgba(6,26,64,0.2)'
              }}
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="text-2xl">🛡</span>
                <p className="font-bold">SafePay Guardian</p>
                <span
                  className="serandib-pill ml-auto text-xs"
                  style={{
                    background: 'rgba(245,158,11,0.2)',
                    color: '#fcd34d'
                  }}
                >
                  Preview
                </span>
              </div>
              <p className="text-sm text-white/60 mb-4">
                Every transfer will be risk-scored before execution. High-risk
                transfers will require confirmation or be flagged for review.
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  'Beneficiary trust level check',
                  'Source account freeze status',
                  'Duplicate transfer detection',
                  'Unusual amount pattern flagging'
                ].map((s) => (
                  <div
                    key={s}
                    className="flex items-start gap-1.5 text-white/60"
                  >
                    <span className="text-white/40">○</span> {s}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Audit timeline + sessions */}
          <div className="lg:col-span-2 space-y-4">
            {/* Audit timeline */}
            <div className="serandib-card p-5">
              <h2
                className="mb-4 font-bold text-sm"
                style={{ color: 'var(--serandib-navy)' }}
              >
                Audit Timeline (Preview)
              </h2>
              <div className="relative">
                <div
                  className="absolute left-3.5 top-0 bottom-0 w-px"
                  style={{ background: 'var(--serandib-border)' }}
                />
                <div className="space-y-4">
                  {timeline.map((item, i) => (
                    <div
                      key={i}
                      className="relative flex items-start gap-3 pl-8"
                    >
                      <div
                        className="absolute left-0 flex h-7 w-7 items-center justify-center rounded-full text-sm"
                        style={{
                          background: `${item.color}18`,
                          border: `1.5px solid ${item.color}40`
                        }}
                      >
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <p
                          className="text-xs font-semibold"
                          style={{ color: 'var(--serandib-navy)' }}
                        >
                          {item.event}
                        </p>
                        <p
                          className="text-xs mt-0.5"
                          style={{ color: 'var(--serandib-muted)' }}
                        >
                          {item.detail}
                        </p>
                        <p
                          className="text-xs mt-0.5"
                          style={{
                            color: 'var(--serandib-muted)',
                            fontSize: '0.7rem'
                          }}
                        >
                          {item.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <p
                className="mt-4 text-xs"
                style={{ color: 'var(--serandib-muted)' }}
              >
                Full audit log is stored server-side. Real-time streaming coming
                in Phase 6.
              </p>
            </div>

            {/* Account shield summary */}
            <div
              className="rounded-2xl p-5"
              style={{
                background: 'rgba(10,99,255,0.05)',
                border: '1px solid var(--serandib-border)'
              }}
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="text-xl">🔒</span>
                <p
                  className="font-bold text-sm"
                  style={{ color: 'var(--serandib-navy)' }}
                >
                  Account Shield Mode
                </p>
              </div>
              <p
                className="text-xs leading-relaxed"
                style={{ color: 'var(--serandib-muted)' }}
              >
                Freeze any account to immediately block all outgoing transfers.
                The shield activates instantly and persists across sessions.
                Only you can unfreeze with your authenticated session.
              </p>
              <a
                href="/bank-accounts"
                className="mt-3 block text-xs font-semibold hover:underline"
                style={{ color: 'var(--serandib-blue)' }}
              >
                Manage account shield →
              </a>
            </div>

            {/* Session info */}
            <div
              className="rounded-2xl p-5"
              style={{
                background: 'rgba(16,185,129,0.05)',
                border: '1px solid rgba(16,185,129,0.15)'
              }}
            >
              <p
                className="mb-2 font-bold text-sm"
                style={{ color: 'var(--serandib-navy)' }}
              >
                Active Session
              </p>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span style={{ color: 'var(--serandib-muted)' }}>Cookie</span>
                  <span
                    className="font-mono"
                    style={{ color: 'var(--serandib-navy)' }}
                  >
                    serandib_session
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--serandib-muted)' }}>Type</span>
                  <span style={{ color: 'var(--serandib-navy)' }}>
                    HttpOnly · Secure
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--serandib-muted)' }}>
                    Storage
                  </span>
                  <span style={{ color: 'var(--serandib-navy)' }}>
                    Server-side (DB)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--serandib-muted)' }}>
                    Token hashing
                  </span>
                  <span style={{ color: 'var(--serandib-navy)' }}>SHA-256</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  )
}
