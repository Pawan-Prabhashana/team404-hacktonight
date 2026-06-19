type StatusPillProps = {
  status: 'active' | 'frozen' | 'pending' | 'completed' | 'failed' | string
  className?: string
}

const styleMap: Record<string, { bg: string; color: string; icon: string }> = {
  active: {
    bg: 'rgba(16,185,129,0.1)',
    color: 'var(--serandib-success)',
    icon: '✓'
  },
  frozen: {
    bg: 'rgba(239,68,68,0.1)',
    color: 'var(--serandib-danger)',
    icon: '🔒'
  },
  pending: {
    bg: 'rgba(245,158,11,0.1)',
    color: 'var(--serandib-warning)',
    icon: '⏳'
  },
  completed: {
    bg: 'rgba(16,185,129,0.1)',
    color: 'var(--serandib-success)',
    icon: '✓'
  },
  failed: {
    bg: 'rgba(239,68,68,0.1)',
    color: 'var(--serandib-danger)',
    icon: '✗'
  }
}

export function StatusPill({ status, className = '' }: StatusPillProps) {
  const s = styleMap[status] ?? {
    bg: 'rgba(100,116,139,0.1)',
    color: 'var(--serandib-muted)',
    icon: '●'
  }
  return (
    <span
      className={`serandib-pill ${className}`}
      style={{ background: s.bg, color: s.color }}
    >
      {s.icon} {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}
