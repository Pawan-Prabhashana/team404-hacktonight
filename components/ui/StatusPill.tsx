type StatusPillProps = {
  children: React.ReactNode
  variant?: 'green' | 'teal' | 'red' | 'yellow' | 'gray'
  className?: string
}

export default function StatusPill({
  children,
  variant = 'teal',
  className = ''
}: StatusPillProps) {
  return (
    <span className={`app-pill app-pill-${variant} ${className}`}>
      {children}
    </span>
  )
}
