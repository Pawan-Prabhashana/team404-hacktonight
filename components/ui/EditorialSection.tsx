import type { ReactNode } from 'react'

interface EditorialSectionProps {
  label?: string
  heading: string
  copy: string
  cta?: { label: string; href: string }
  left?: ReactNode
  right?: ReactNode
  reverse?: boolean
  bg?: string
}

export default function EditorialSection({
  label,
  heading,
  copy,
  cta,
  left,
  right,
  reverse = false,
  bg = 'transparent'
}: EditorialSectionProps) {
  return (
    <section style={{ background: bg, padding: '6rem 0' }}>
      <div className="marketing-container">
        <div
          className="editorial-split"
          style={{ direction: reverse ? 'rtl' : 'ltr' }}
        >
          <div style={{ direction: 'ltr' }}>{left}</div>
          <div
            style={{
              direction: 'ltr',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem'
            }}
          >
            {label && (
              <span
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--sb-teal)'
                }}
              >
                {label}
              </span>
            )}
            <h2
              style={{
                fontSize: 'clamp(2rem, 4vw, 3rem)',
                fontWeight: 800,
                lineHeight: 1.15,
                color: 'var(--sb-text)',
                letterSpacing: '-0.02em'
              }}
            >
              {heading}
            </h2>
            <p
              style={{
                fontSize: '1.0625rem',
                color: 'var(--sb-muted)',
                lineHeight: 1.7
              }}
            >
              {copy}
            </p>
            {cta && (
              <a
                href={cta.href}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  color: 'var(--sb-teal)',
                  fontWeight: 700,
                  fontSize: '1rem',
                  textDecoration: 'none'
                }}
              >
                {cta.label} &rarr;
              </a>
            )}
          </div>
          <div style={{ direction: 'ltr' }}>{right}</div>
        </div>
      </div>
    </section>
  )
}
