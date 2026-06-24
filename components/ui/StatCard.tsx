type StatCardProps = {
  label: string
  value: string
  sub?: string
  icon?: React.ReactNode
  accent?: string
  className?: string
}

export default function StatCard({
  label,
  value,
  sub,
  icon,
  accent,
  className = ''
}: StatCardProps) {
  return (
    <div className={`app-stat-card ${className}`}>
      {icon && (
        <div
          className="mb-1"
          style={{ fontSize: '1.25rem', color: accent || '#087f7a' }}
        >
          {icon}
        </div>
      )}
      <p className="app-stat-label">{label}</p>
      <p
        className="app-stat-value"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </p>
      {sub && <p className="app-stat-sub">{sub}</p>}
    </div>
  )
}
