'use client'

import Link from 'next/link'
import { useState } from 'react'
import SerandibLogo from '@/components/ui/SerandibLogo'
import { generateStrongPassword, scorePassword } from '@/lib/password-generator'

export default function SignUpPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [copied, setCopied] = useState(false)

  const score = password ? scorePassword(password) : null

  function handleGenerate() {
    const pw = generateStrongPassword(20)
    setPassword(pw)
    setConfirmPw(pw)
    setShowPw(true)
  }

  async function handleCopy() {
    if (!password) return
    await navigator.clipboard.writeText(password).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const barColor = !score
    ? '#e5e7eb'
    : score.label === 'Strong'
      ? '#087f7a'
      : score.label === 'Medium'
        ? '#f59e0b'
        : '#ef4444'

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--sb-bg)',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Mini nav */}
      <header
        style={{
          height: 64,
          background: '#fff',
          borderBottom: '1px solid var(--sb-line)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 2rem',
          justifyContent: 'space-between'
        }}
      >
        <SerandibLogo size="md" />
        <Link
          href="/login"
          style={{
            fontSize: '0.9375rem',
            fontWeight: 600,
            color: 'var(--sb-text)',
            textDecoration: 'none'
          }}
        >
          Log in
        </Link>
      </header>

      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '3rem 1.5rem'
        }}
      >
        <div style={{ maxWidth: '480px', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <h1
              style={{
                fontSize: 'clamp(1.875rem,4vw,2.5rem)',
                fontWeight: 900,
                color: 'var(--sb-text)',
                letterSpacing: '-0.025em',
                marginBottom: '0.75rem'
              }}
            >
              Open your account
            </h1>
            <p
              style={{
                fontSize: '1.0625rem',
                color: 'var(--sb-muted)',
                lineHeight: 1.6
              }}
            >
              Join thousands of Sri Lankans banking smarter with Serandib.
            </p>
          </div>

          {/* Demo notice banner */}
          <div
            style={{
              background: 'var(--sb-mint)',
              borderRadius: '1rem',
              padding: '1.125rem 1.375rem',
              marginBottom: '2rem',
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'flex-start'
            }}
          >
            <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>💡</span>
            <div>
              <div
                style={{
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: 'var(--sb-teal)',
                  marginBottom: '0.25rem'
                }}
              >
                Demo mode
              </div>
              <div
                style={{
                  fontSize: '0.875rem',
                  color: '#374151',
                  lineHeight: 1.55
                }}
              >
                Account opening is in demo mode. Use{' '}
                <Link
                  href="/login"
                  style={{
                    color: 'var(--sb-teal)',
                    fontWeight: 600,
                    textDecoration: 'none'
                  }}
                >
                  demo credentials
                </Link>{' '}
                to explore Serandib Bank. Full onboarding launches in Phase 6.
              </div>
            </div>
          </div>

          <div className="auth-form-container">
            <form
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem'
              }}
              onSubmit={(e) => e.preventDefault()}
            >
              {/* Full name */}
              <div>
                <label
                  htmlFor="fullName"
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: 'var(--sb-text)',
                    marginBottom: '0.5rem'
                  }}
                >
                  Full name
                </label>
                <input
                  id="fullName"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="auth-input"
                  placeholder="Your legal name"
                />
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: 'var(--sb-text)',
                    marginBottom: '0.5rem'
                  }}
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="auth-input"
                  placeholder="you@example.com"
                />
              </div>

              {/* Password */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.5rem'
                  }}
                >
                  <label
                    htmlFor="password"
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: 'var(--sb-text)'
                    }}
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerate}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--sb-teal)',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: '0.25rem 0'
                    }}
                  >
                    ✨ Generate strong
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    id="password"
                    type={showPw ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="auth-input"
                    placeholder="Min 8 characters"
                    style={{ paddingRight: '5.5rem' }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      display: 'flex',
                      gap: '0.5rem',
                      alignItems: 'center'
                    }}
                  >
                    {password && (
                      <button
                        type="button"
                        onClick={handleCopy}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '0.8125rem',
                          color: copied ? '#087f7a' : 'var(--sb-muted)',
                          fontWeight: 600
                        }}
                      >
                        {copied ? '✓' : '📋'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        color: 'var(--sb-muted)',
                        padding: '0.125rem'
                      }}
                      aria-label={showPw ? 'Hide' : 'Show'}
                    >
                      {showPw ? '🙈' : '👁'}
                    </button>
                  </div>
                </div>

                {/* Strength bar */}
                {score && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <div
                      style={{
                        height: 4,
                        borderRadius: 9999,
                        background: '#f3f4f6',
                        overflow: 'hidden'
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${score.score}%`,
                          background: barColor,
                          borderRadius: 9999,
                          transition: 'width 0.3s, background 0.3s'
                        }}
                      />
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginTop: '0.5rem'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          gap: '0.75rem',
                          fontSize: '0.75rem',
                          color: 'var(--sb-muted)'
                        }}
                      >
                        {[
                          { k: 'length', l: '12+' },
                          { k: 'uppercase', l: 'A-Z' },
                          { k: 'lowercase', l: 'a-z' },
                          { k: 'number', l: '0-9' },
                          { k: 'symbol', l: '#$' }
                        ].map(({ k, l }) => (
                          <span
                            key={k}
                            style={{
                              color: score.checks[
                                k as keyof typeof score.checks
                              ]
                                ? '#087f7a'
                                : '#d1d5db'
                            }}
                          >
                            {score.checks[k as keyof typeof score.checks]
                              ? '✓'
                              : '·'}{' '}
                            {l}
                          </span>
                        ))}
                      </div>
                      <span
                        style={{
                          fontSize: '0.8125rem',
                          fontWeight: 700,
                          color: barColor
                        }}
                      >
                        {score.label}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label
                  htmlFor="confirmPw"
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: 'var(--sb-text)',
                    marginBottom: '0.5rem'
                  }}
                >
                  Confirm password
                </label>
                <input
                  id="confirmPw"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  className="auth-input"
                  placeholder="Repeat your password"
                  style={{
                    borderColor:
                      confirmPw && confirmPw !== password
                        ? '#ef4444'
                        : undefined
                  }}
                />
                {confirmPw && confirmPw !== password && (
                  <div
                    style={{
                      fontSize: '0.8125rem',
                      color: '#ef4444',
                      marginTop: '0.375rem'
                    }}
                  >
                    Passwords do not match
                  </div>
                )}
              </div>

              {/* Terms */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  style={{
                    marginTop: '0.15rem',
                    width: 16,
                    height: 16,
                    flexShrink: 0,
                    accentColor: 'var(--sb-teal)'
                  }}
                />
                <span
                  style={{
                    fontSize: '0.875rem',
                    color: 'var(--sb-muted)',
                    lineHeight: 1.55
                  }}
                >
                  I agree to the{' '}
                  <a
                    href="#"
                    style={{
                      color: 'var(--sb-teal)',
                      fontWeight: 600,
                      textDecoration: 'none'
                    }}
                  >
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a
                    href="#"
                    style={{
                      color: 'var(--sb-teal)',
                      fontWeight: 600,
                      textDecoration: 'none'
                    }}
                  >
                    Privacy Policy
                  </a>
                  .
                </span>
              </label>

              <Link
                href="/login"
                className="serandib-cta"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  fontSize: '1rem',
                  padding: '0.9375rem',
                  textAlign: 'center'
                }}
              >
                Explore with demo account &rarr;
              </Link>
            </form>

            <p
              style={{
                marginTop: '1.5rem',
                fontSize: '0.9rem',
                color: 'var(--sb-muted)',
                textAlign: 'center'
              }}
            >
              Already have an account?{' '}
              <Link
                href="/login"
                style={{
                  color: 'var(--sb-teal)',
                  fontWeight: 600,
                  textDecoration: 'none'
                }}
              >
                Log in
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
