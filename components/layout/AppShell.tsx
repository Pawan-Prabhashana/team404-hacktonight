import Sidebar from '@/components/layout/Sidebar'

type AppShellProps = {
  children: React.ReactNode
  title?: string
  subtitle?: string
  className?: string
}

/**
 * AppShell — Serandib Bank premium authenticated layout.
 * Sidebar on the left, scrollable content on the right.
 */
export default function AppShell({
  children,
  title,
  subtitle,
  className = 'flex min-h-screen'
}: AppShellProps) {
  return (
    <div className={className} style={{ background: 'var(--background)' }}>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        {(title || subtitle) && (
          <div
            className="px-8 py-5"
            style={{
              borderBottom: '1px solid var(--serandib-border)',
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(10px)'
            }}
          >
            {title && (
              <h1
                className="text-2xl font-extrabold"
                style={{ color: 'var(--serandib-navy)' }}
              >
                {title}
              </h1>
            )}
            {subtitle && (
              <p
                className="mt-0.5 text-sm"
                style={{ color: 'var(--serandib-muted)' }}
              >
                {subtitle}
              </p>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
