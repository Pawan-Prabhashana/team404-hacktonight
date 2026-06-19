'use client'

import Link from 'next/link'
import { useState } from 'react'
import SerandibLogo from './SerandibLogo'

const NAV_LINKS = [
  { label: 'Plans', href: '#plans' },
  { label: 'Bank', href: '#bank' },
  { label: 'Save', href: '#savings' },
  { label: 'Invest', href: '#invest' },
  { label: 'Security', href: '/security' }
]

interface MarketingNavProps {
  ctaHref?: string
  loginHref?: string
}

export default function MarketingNav({
  ctaHref = '/sign-up',
  loginHref = '/login'
}: MarketingNavProps) {
  const [open, setOpen] = useState(false)

  return (
    <nav className="marketing-nav">
      <div
        className="marketing-container"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '2rem'
        }}
      >
        {/* Logo */}
        <SerandibLogo size="md" showText={true} />

        {/* Desktop links */}
        <ul
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            listStyle: 'none',
            padding: 0,
            margin: 0
          }}
          className="nav-links-desktop"
        >
          {NAV_LINKS.map((l) => (
            <li key={l.label}>
              <Link
                href={l.href}
                style={{
                  padding: '0.5rem 0.875rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.9375rem',
                  fontWeight: 500,
                  color: 'var(--sb-text)',
                  textDecoration: 'none',
                  transition: 'background 0.15s',
                  display: 'block'
                }}
                onMouseEnter={(e) => {
                  ;(e.target as HTMLElement).style.background =
                    'rgba(0,0,0,0.05)'
                }}
                onMouseLeave={(e) => {
                  ;(e.target as HTMLElement).style.background = 'transparent'
                }}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Right actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flexShrink: 0
          }}
        >
          <Link
            href={loginHref}
            style={{
              fontSize: '0.9375rem',
              fontWeight: 600,
              color: 'var(--sb-text)',
              textDecoration: 'none',
              padding: '0.5rem 0.75rem'
            }}
          >
            Log in
          </Link>
          <Link
            href={ctaHref}
            className="serandib-cta"
            style={{ fontSize: '0.875rem', padding: '0.625rem 1.375rem' }}
          >
            Open bank account
          </Link>
          {/* Mobile hamburger */}
          <button
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.5rem'
            }}
            className="nav-hamburger"
          >
            <span
              style={{
                display: 'block',
                width: 22,
                height: 2,
                background: 'var(--sb-text)',
                marginBottom: 5
              }}
            />
            <span
              style={{
                display: 'block',
                width: 22,
                height: 2,
                background: 'var(--sb-text)',
                marginBottom: 5
              }}
            />
            <span
              style={{
                display: 'block',
                width: 22,
                height: 2,
                background: 'var(--sb-text)'
              }}
            />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '72px',
            left: 0,
            right: 0,
            background: '#fff',
            borderBottom: '1px solid var(--sb-line)',
            padding: '1rem 2rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            zIndex: 99
          }}
        >
          {NAV_LINKS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              onClick={() => setOpen(false)}
              style={{
                fontSize: '1rem',
                fontWeight: 500,
                color: 'var(--sb-text)',
                textDecoration: 'none',
                padding: '0.5rem 0'
              }}
            >
              {l.label}
            </Link>
          ))}
          <div
            style={{
              borderTop: '1px solid var(--sb-line)',
              paddingTop: '1rem',
              display: 'flex',
              gap: '1rem',
              flexWrap: 'wrap'
            }}
          >
            <Link
              href={loginHref}
              style={{
                fontWeight: 600,
                color: 'var(--sb-text)',
                textDecoration: 'none'
              }}
            >
              Log in
            </Link>
            <Link
              href={ctaHref}
              className="serandib-cta"
              style={{ fontSize: '0.875rem' }}
            >
              Open bank account
            </Link>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .nav-links-desktop { display: none !important; }
          .nav-hamburger { display: block !important; }
        }
      `}</style>
    </nav>
  )
}
