type AppCardProps = {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'soft' | 'dark'
}

export default function AppCard({
  children,
  className = '',
  variant = 'default'
}: AppCardProps) {
  const cls =
    variant === 'soft'
      ? 'app-card-soft'
      : variant === 'dark'
        ? 'app-card-dark'
        : 'app-card'
  return <div className={`${cls} ${className}`}>{children}</div>
}
