'use client'

import Image from 'next/image'
import Link from 'next/link'

interface SerandibLogoProps {
  href?: string
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  textColor?: string
}

export default function SerandibLogo({
  href = '/',
  size = 'md',
  showText = true,
  textColor = 'var(--sb-text)'
}: SerandibLogoProps) {
  const dim = size === 'sm' ? 28 : size === 'lg' ? 48 : 36

  const content = (
    <span style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
      <Image
        src="/brand/serandib-logo.png"
        alt="Serandib Bank"
        width={dim}
        height={dim}
        style={{ objectFit: 'contain', flexShrink: 0 }}
        onError={() => {}}
        priority
      />
      {showText && (
        <span
          style={{
            fontWeight: 700,
            fontSize:
              size === 'sm' ? '1rem' : size === 'lg' ? '1.375rem' : '1.125rem',
            color: textColor,
            letterSpacing: '-0.01em',
            whiteSpace: 'nowrap'
          }}
        >
          Serandib Bank
        </span>
      )}
    </span>
  )

  if (href) {
    return (
      <Link href={href} style={{ textDecoration: 'none' }}>
        {content}
      </Link>
    )
  }

  return content
}
