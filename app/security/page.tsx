import AppShell from '@/components/layout/AppShell'

const timeline = [
  {
    event: 'Login successful',
    detail: 'customer@serandib.test · session established',
    time: 'Just now',
    good: true
  },
  {
    event: 'Dashboard viewed',
    detail: 'Accounts and balances loaded',
    time: '2 min ago',
    good: true
  },
  {
    event: 'Account list fetched',
    detail: '2 accounts returned — ownership verified',
    time: '2 min ago',
    good: true
  },
  {
    event: 'Shield check performed',
    detail: 'All accounts: active status confirmed',
    time: '5 min ago',
    good: true
  },
  {
    event: 'Session token validated',
    detail: 'SHA-256 hash matched — session valid',
    time: '10 min ago',
    good: true
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
    detail: 'Coming in Phase 6 — multi-device session tracking',
    phase: '6'
  },
  {
    ok: false,
    label: 'Real-time transfer risk scoring',
    detail: 'Coming in Phase 6 — SafePay execution engine',
    phase: '6'
  }
]

const CheckIcon = () => (
  <svg
    width="13"
    height="13"
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
const ClockIcon = () => (
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
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
)
const ShieldIcon = () => (
  <svg
    width="22"
    height="22"
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

export default function SecurityPage() {
  return (
    <AppShell
      title="Security Center"
      subtitle="Session protection, Account Shield, and audit timeline"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        {/* Shield status banner */}
        <div
          className="app-card"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
            border: '1.5px solid rgba(16,185,129,0.25)',
            background: 'rgba(16,185,129,0.03)'
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'rgba(16,185,129,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#059669',
              flexShrink: 0
            }}
          >
            <ShieldIcon />
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '0.375rem'
              }}
            >
              <p
                style={{ fontWeight: 700, color: '#071f2a', fontSize: '1rem' }}
              >
                Serandib Shield Active
              </p>
              <span className="app-pill app-pill-green">Secure</span>
            </div>
            <p
              style={{
                fontSize: '0.875rem',
                color: '#6b7a90',
                lineHeight: 1.6
              }}
            >
              Your session is protected by HttpOnly cookies, server-side
              validation, and account ownership checks on every API call.
            </p>
          </div>
        </div>

        {/* Main 2-column */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1.4fr) minmax(300px,0.8fr)',
            gap: '1.5rem',
            alignItems: 'start'
          }}
        >
          {/* Left column */}
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
          >
            {/* Security Checklist */}
            <div className="app-card">
              <h2 className="app-section-title">Security Checklist</h2>
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: '0' }}
              >
                {checklist.map((item, i) => (
                  <div
                    key={item.label}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '1rem',
                      padding: '0.875rem 0',
                      borderBottom:
                        i < checklist.length - 1 ? '1px solid #f1f5f8' : 'none'
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: item.ok
                          ? 'rgba(16,185,129,0.1)'
                          : '#f1f5f8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: item.ok ? '#059669' : '#9ca3af',
                        flexShrink: 0,
                        marginTop: '0.125rem'
                      }}
                    >
                      {item.ok ? <CheckIcon /> : <ClockIcon />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.625rem',
                          flexWrap: 'wrap'
                        }}
                      >
                        <p
                          style={{
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            color: item.ok ? '#071f2a' : '#6b7a90'
                          }}
                        >
                          {item.label}
                        </p>
                        {!item.ok && item.phase && (
                          <span className="app-pill app-pill-gray">
                            Phase {item.phase}
                          </span>
                        )}
                      </div>
                      <p
                        style={{
                          fontSize: '0.8125rem',
                          color: '#6b7a90',
                          marginTop: '0.25rem',
                          lineHeight: 1.5
                        }}
                      >
                        {item.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SafePay Guardian */}
            <div className="app-card-soft">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '0.875rem'
                }}
              >
                <p
                  style={{
                    fontWeight: 700,
                    color: '#071f2a',
                    fontSize: '0.9375rem'
                  }}
                >
                  SafePay Guardian
                </p>
                <span className="app-pill app-pill-gray">Preview</span>
              </div>
              <p
                style={{
                  fontSize: '0.875rem',
                  color: '#374151',
                  lineHeight: 1.65,
                  marginBottom: '1rem'
                }}
              >
                Every transfer will be risk-scored before execution. High-risk
                transfers will require confirmation or be flagged for review.
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.5rem'
                }}
              >
                {[
                  'Beneficiary trust level check',
                  'Source account freeze status',
                  'Duplicate transfer detection',
                  'Unusual amount pattern flagging'
                ].map((f) => (
                  <div
                    key={f}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.8125rem',
                      color: '#6b7a90'
                    }}
                  >
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#cbd5e1',
                        flexShrink: 0
                      }}
                    />
                    {f}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
          >
            {/* Audit Timeline */}
            <div className="app-card">
              <h3 className="app-section-title">Audit Timeline</h3>
              <div className="app-timeline">
                {timeline.map((item) => (
                  <div key={item.event} className="app-timeline-item">
                    <div className="app-timeline-dot" />
                    <p
                      style={{
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: '#071f2a',
                        lineHeight: 1.4
                      }}
                    >
                      {item.event}
                    </p>
                    <p
                      style={{
                        fontSize: '0.8rem',
                        color: '#6b7a90',
                        marginTop: '0.25rem',
                        lineHeight: 1.5
                      }}
                    >
                      {item.detail}
                    </p>
                    <p
                      style={{
                        fontSize: '0.75rem',
                        color: '#9ca3af',
                        marginTop: '0.25rem'
                      }}
                    >
                      {item.time}
                    </p>
                  </div>
                ))}
              </div>
              <p
                style={{
                  fontSize: '0.75rem',
                  color: '#9ca3af',
                  marginTop: '0.875rem',
                  lineHeight: 1.5
                }}
              >
                Full audit log is stored server-side. Real-time streaming coming
                in Phase 7.
              </p>
            </div>

            {/* Account Shield */}
            <div className="app-card">
              <h3 className="app-section-title">Account Shield Mode</h3>
              <p
                style={{
                  fontSize: '0.875rem',
                  color: '#6b7a90',
                  lineHeight: 1.6,
                  marginBottom: '1rem'
                }}
              >
                Freeze any account to immediately block all outgoing transfers.
                The shield activates instantly and persists across sessions.
              </p>
              <a
                href="/bank-accounts"
                className="app-button-secondary"
                style={{
                  display: 'inline-flex',
                  height: 38,
                  fontSize: '0.8125rem',
                  padding: '0 1.125rem'
                }}
              >
                Manage account shield →
              </a>
            </div>

            {/* Active Session */}
            <div className="app-card">
              <h3 className="app-section-title">Active Session</h3>
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: '0' }}
              >
                {[
                  { label: 'Cookie', value: 'serandib_session' },
                  { label: 'Type', value: 'HttpOnly · Secure' },
                  { label: 'Storage', value: 'Server-side (DB)' },
                  { label: 'Token', value: 'SHA-256 hashed' }
                ].map((row, i) => (
                  <div
                    key={row.label}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '0.625rem 0',
                      borderBottom: i < 3 ? '1px solid #f1f5f8' : 'none'
                    }}
                  >
                    <span style={{ fontSize: '0.8125rem', color: '#6b7a90' }}>
                      {row.label}
                    </span>
                    <span
                      style={{
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        color: '#071f2a',
                        fontFamily: 'monospace'
                      }}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
