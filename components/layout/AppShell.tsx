import Sidebar from '@/components/layout/Sidebar'

type AppShellProps = {
  children: React.ReactNode
  title?: string
  subtitle?: string
  actions?: React.ReactNode
}

export default function AppShell({
  children,
  title,
  subtitle,
  actions
}: AppShellProps) {
  return (
    <div className="app-shell-grid">
      <Sidebar />
      <main className="app-main-area">
        <div className="app-page">
          {(title || subtitle || actions) && (
            <header className="app-header">
              <div className="app-header-text">
                {title && <h1 className="app-page-title">{title}</h1>}
                {subtitle && <p className="app-page-subtitle">{subtitle}</p>}
              </div>
              {actions && <div className="app-header-actions">{actions}</div>}
            </header>
          )}
          {children}
        </div>
      </main>
    </div>
  )
}
