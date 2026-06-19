import Link from 'next/link'

interface PlanCardProps {
  name: string
  tagline: string
  price?: string
  features: string[]
  ctaLabel?: string
  ctaHref?: string
  featured?: boolean
}

export default function PlanCard({
  name,
  tagline,
  price,
  features,
  ctaLabel = 'Get started',
  ctaHref = '/sign-up',
  featured = false
}: PlanCardProps) {
  return (
    <div className={`serandib-plan-card${featured ? ' featured' : ''}`}>
      {featured && (
        <div
          style={{
            display: 'inline-block',
            background: 'var(--sb-teal)',
            color: '#fff',
            fontSize: '0.6875rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            width: 'fit-content',
            marginBottom: '-0.25rem'
          }}
        >
          Most popular
        </div>
      )}

      <div>
        <h3
          style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            marginBottom: '0.25rem'
          }}
        >
          {name}
        </h3>
        <p style={{ fontSize: '0.875rem', opacity: 0.75 }}>{tagline}</p>
      </div>

      {price && (
        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
          {price}
          <span
            style={{
              fontSize: '0.875rem',
              fontWeight: 400,
              opacity: 0.7,
              marginLeft: '0.375rem'
            }}
          >
            /mo
          </span>
        </div>
      )}

      <ul
        style={{
          listStyle: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.625rem',
          padding: 0
        }}
      >
        {features.map((f) => (
          <li
            key={f}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.625rem',
              fontSize: '0.875rem',
              opacity: 0.9
            }}
          >
            <span
              style={{
                color: '#4ade80',
                fontSize: '1rem',
                lineHeight: 1.4,
                flexShrink: 0
              }}
            >
              ✓
            </span>
            {f}
          </li>
        ))}
      </ul>

      <Link
        href={ctaHref}
        style={{
          display: 'block',
          textAlign: 'center',
          padding: '0.75rem 1rem',
          borderRadius: '9999px',
          background: featured ? 'var(--sb-teal)' : 'rgba(255,255,255,0.15)',
          color: '#fff',
          fontWeight: 600,
          fontSize: '0.9rem',
          textDecoration: 'none',
          transition: 'background 0.2s',
          border: featured ? 'none' : '1px solid rgba(255,255,255,0.25)',
          marginTop: 'auto'
        }}
      >
        {ctaLabel}
      </Link>
    </div>
  )
}
