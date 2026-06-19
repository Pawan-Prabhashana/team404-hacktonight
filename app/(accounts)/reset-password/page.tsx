'use client'

import Link from 'next/link'
import { useState } from 'react'
import SerandibLogo from '@/components/ui/SerandibLogo'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await new Promise((r) => setTimeout(r, 800))
    setSubmitted(true)
    setLoading(false)
  }

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
          Back to login
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
        <div style={{ maxWidth: '440px', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔐</div>
            <h1
              style={{
                fontSize: 'clamp(1.875rem,4vw,2.25rem)',
                fontWeight: 900,
                color: 'var(--sb-text)',
                letterSpacing: '-0.025em',
                marginBottom: '0.75rem'
              }}
            >
              Reset your password
            </h1>
            <p
              style={{
                fontSize: '1.0625rem',
                color: 'var(--sb-muted)',
                lineHeight: 1.6
              }}
            >
              Enter your email and we&apos;ll send secure recovery instructions.
            </p>
          </div>

          <div className="auth-form-container">
            {!submitted ? (
              <form
                onSubmit={handleSubmit}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.5rem'
                }}
              >
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
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="auth-input"
                    placeholder="The email on your account"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="serandib-cta"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    fontSize: '1rem',
                    padding: '0.9375rem',
                    opacity: loading ? 0.7 : 1,
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? 'Sending…' : 'Send recovery email'}
                </button>

                <p
                  style={{
                    textAlign: 'center',
                    fontSize: '0.875rem',
                    color: 'var(--sb-muted)'
                  }}
                >
                  Remember your password?{' '}
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
              </form>
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.5rem',
                  alignItems: 'center'
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: 'var(--sb-mint)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem'
                  }}
                >
                  ✓
                </div>
                <div>
                  <h2
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      color: 'var(--sb-text)',
                      marginBottom: '0.5rem'
                    }}
                  >
                    Check your inbox
                  </h2>
                  <p
                    style={{
                      fontSize: '0.9375rem',
                      color: 'var(--sb-muted)',
                      lineHeight: 1.65
                    }}
                  >
                    If an account exists for <strong>{email}</strong>, secure
                    recovery instructions have been sent.
                  </p>
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--sb-muted)' }}>
                  Didn&apos;t receive it? Check your spam folder or{' '}
                  <button
                    type="button"
                    onClick={() => setSubmitted(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--sb-teal)',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    try again
                  </button>
                  .
                </p>
                <Link
                  href="/login"
                  className="serandib-cta-outline"
                  style={{ fontSize: '0.9375rem' }}
                >
                  Back to login
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
