import type { ReactNode } from 'react'

type SerandibCardProps = {
  children: ReactNode
  className?: string
  dark?: boolean
  padding?: string
  style?: React.CSSProperties
}

export function SerandibCard({
  children,
  className = '',
  dark = false,
  padding = 'p-5',
  style
}: SerandibCardProps) {
  return (
    <div
      className={`${dark ? 'serandib-card-dark' : 'serandib-card'} ${padding} ${className}`}
      style={style}
    >
      {children}
    </div>
  )
}
