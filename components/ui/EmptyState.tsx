type EmptyStateProps = {
  title: string
  description?: string
  className?: string
}

export default function EmptyState({
  title,
  description,
  className = ''
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-14 text-center ${className}`}
    >
      <div
        className="mb-4 flex h-14 w-14 items-center justify-center rounded-full"
        style={{ background: '#f0faf9' }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#087f7a"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      </div>
      <p style={{ fontWeight: 600, color: '#071f2a', fontSize: '0.9375rem' }}>
        {title}
      </p>
      {description && <p className="app-muted mt-1">{description}</p>}
    </div>
  )
}
