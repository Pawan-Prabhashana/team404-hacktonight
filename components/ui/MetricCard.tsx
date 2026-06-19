type MetricCardProps = {
  title: string
  value: string
  description?: string
  icon?: string
  trend?: 'up' | 'down' | 'neutral'
  trendLabel?: string
  className?: string
}

export function MetricCard({
  title,
  value,
  description,
  icon,
  trend,
  trendLabel,
  className = ''
}: MetricCardProps) {
  const trendColor =
    trend === 'up'
      ? 'var(--serandib-success)'
      : trend === 'down'
        ? 'var(--serandib-danger)'
        : 'var(--serandib-muted)'
  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'

  return (
    <div className={`serandib-card ${className}`}>
      {icon && <p className="mb-3 text-2xl">{icon}</p>}
      <p
        className="text-xs font-medium"
        style={{ color: 'var(--serandib-muted)' }}
      >
        {title}
      </p>
      <p
        className="mt-1 text-2xl font-extrabold"
        style={{ color: 'var(--serandib-navy)' }}
      >
        {value}
      </p>
      {description && (
        <p
          className="mt-0.5 text-xs"
          style={{ color: 'var(--serandib-muted)' }}
        >
          {description}
        </p>
      )}
      {trend && trendLabel && (
        <p className="mt-2 text-xs font-semibold" style={{ color: trendColor }}>
          {trendIcon} {trendLabel}
        </p>
      )}
    </div>
  )
}
