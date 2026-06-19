'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import SerandibLogo from '@/components/ui/SerandibLogo'
import { login } from '@/lib/auth-client'

const DEMO = {
  customer: { email: 'customer@serandib.test', password: 'SerandibUser123' },
  admin: { email: 'admin@serandib.test', password: 'SerandibAdmin123' }
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function fill(type: 'customer' | 'admin') {
    setEmail(DEMO[type].email)
    setPassword(DEMO[type].password)
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email.trim(), password)
      router.replace('/dashboard')
    } catch (err) {
      setError((err as Error).message ?? 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      {/* ── Left: teal brand panel ──────────────────────── */}
      <div
        style={{
          flex: '0 0 46%',
          background:
            'linear-gradient(160deg, #087f7a 0%, #065e5a 50%, #071f2a 100%)',
          display: 'flex',
          flexDirection: 'column',
          padding: '2.5rem',
          position: 'relative',
          overflow: 'hidden',
          minHeight: '100vh'
        }}
        className="login-left-panel"
      >
        <SerandibLogo size="md" showText textColor="#fff" href="/" />

        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '1.75rem',
            paddingTop: '2rem'
          }}
        >
          <h1
            style={{
              fontSize: 'clamp(1.875rem,3.5vw,2.75rem)',
              fontWeight: 900,
              color: '#fff',
              lineHeight: 1.15,
              letterSpacing: '-0.025em'
            }}
          >
            Log in to
            <br />
            Serandib Bank
          </h1>
          <p
            style={{
              fontSize: '1.0625rem',
              color: 'rgba(255,255,255,0.75)',
              lineHeight: 1.65,
              maxWidth: '340px'
            }}
          >
            Secure access to your accounts, transfers, and spending
            intelligence.
          </p>

          {/* Demo credentials */}
          <div
            style={{
              background: 'rgba(255,255,255,0.10)',
              border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: '1.25rem',
              padding: '1.5rem',
              maxWidth: '360px'
            }}
          >
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.55)',
                marginBottom: '1rem'
              }}
            >
              Demo credentials
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.625rem'
              }}
            >
              {(['customer', 'admin'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => fill(type)}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '0.875rem',
                    padding: '0.875rem 1rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: '#fff',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLElement).style.background =
                      'rgba(255,255,255,0.18)'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLElement).style.background =
                      'rgba(255,255,255,0.08)'
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      marginBottom: '0.25rem',
                      textTransform: 'capitalize'
                    }}
                  >
                    {type} account
                  </div>
                  <div
                    style={{
                      fontSize: '0.8125rem',
                      opacity: 0.7,
                      fontFamily: 'monospace'
                    }}
                  >
                    {DEMO[type].email}
                    <br />
                    {DEMO[type].password}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Decorative circles */}
        <div
          style={{
            position: 'absolute',
            bottom: '-100px',
            right: '-100px',
            width: '380px',
            height: '380px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
            pointerEvents: 'none'
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '-60px',
            left: '-60px',
            width: '220px',
            height: '220px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.03)',
            pointerEvents: 'none'
          }}
        />

        <style>{`
          @media (max-width: 768px) {
            .login-left-panel { display: none !important; }
          }
        `}</style>
      </div>

      {/* ── Right: login form ───────────────────────────── */}
      <div
        style={{
          flex: 1,
          background: '#f7f5f2',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Top bar */}
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 2.5rem',
            borderBottom: '1px solid #e7e2dc',
            background: '#fff'
          }}
        >
          <div className="login-mobile-logo">
            <SerandibLogo size="sm" />
          </div>
          <Link
            href="/sign-up"
            className="serandib-cta"
            style={{ fontSize: '0.875rem', padding: '0.5625rem 1.25rem' }}
          >
            Open bank account
          </Link>
        </div>

        <main
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '3rem 2.5rem'
          }}
        >
          <div style={{ maxWidth: '400px', width: '100%' }}>
            <div style={{ marginBottom: '2.5rem' }}>
              <h2
                style={{
                  fontSize: '1.875rem',
                  fontWeight: 900,
                  color: 'var(--sb-text)',
                  letterSpacing: '-0.02em',
                  marginBottom: '0.5rem'
                }}
              >
                Welcome back
              </h2>
              <p style={{ fontSize: '1rem', color: 'var(--sb-muted)' }}>
                Enter your details to continue
              </p>
            </div>

            {/* Error */}
            {error && (
              <div
                style={{
                  background: '#fff5f5',
                  border: '1.5px solid #fecaca',
                  borderRadius: '0.875rem',
                  padding: '0.875rem 1rem',
                  marginBottom: '1.5rem',
                  fontSize: '0.9rem',
                  color: '#dc2626',
                  display: 'flex',
                  gap: '0.5rem',
                  alignItems: 'flex-start'
                }}
              >
                <span style={{ flexShrink: 0 }}>⚠</span>
                {error}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem'
              }}
            >
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
                  required
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
                  <Link
                    href="/reset-password"
                    style={{
                      fontSize: '0.8125rem',
                      color: 'var(--sb-teal)',
                      fontWeight: 600,
                      textDecoration: 'none'
                    }}
                  >
                    Forgot password?
                  </Link>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    id="password"
                    type={showPw ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="auth-input"
                    placeholder="Your password"
                    style={{ paddingRight: '3rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute',
                      right: '0.875rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      color: 'var(--sb-muted)',
                      lineHeight: 1
                    }}
                  >
                    {showPw ? '🙈' : '👁'}
                  </button>
                </div>
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
                  cursor: loading ? 'not-allowed' : 'pointer',
                  border: 'none'
                }}
              >
                {loading ? 'Logging in…' : 'Log in'}
              </button>
            </form>

            <p
              style={{
                marginTop: '1.75rem',
                fontSize: '0.9rem',
                color: 'var(--sb-muted)',
                textAlign: 'center'
              }}
            >
              {"Don't have an account? "}
              <Link
                href="/sign-up"
                style={{
                  color: 'var(--sb-teal)',
                  fontWeight: 600,
                  textDecoration: 'none'
                }}
              >
                Open one free
              </Link>
            </p>
          </div>
        </main>
      </div>

      <style>{`
        .login-mobile-logo { display: none; }
        @media (max-width: 768px) {
          .login-mobile-logo { display: block; }
        }
      `}</style>
    </div>
  )
}
