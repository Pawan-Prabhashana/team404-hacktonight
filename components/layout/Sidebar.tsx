'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import UserMenu from '@/components/auth/UserMenu'

type IconProps = { size?: number; stroke?: string }

const DashboardIcon = ({ size = 18 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
)

const AccountsIcon = ({ size = 18 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <line x1="2" y1="10" x2="22" y2="10" />
  </svg>
)

const TransferIcon = ({ size = 18 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M7 16V4m0 0L3 8m4-4l4 4" />
    <path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
  </svg>
)

const BillsIcon = ({ size = 18 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
)

const SmartSpendIcon = ({ size = 18 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
)

const StatementIcon = ({ size = 18 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
)

const SecurityIcon = ({ size = 18 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
)

const menuItems = [
  { label: 'Dashboard', path: '/dashboard', Icon: DashboardIcon },
  { label: 'Accounts', path: '/bank-accounts', Icon: AccountsIcon },
  { label: 'Transfer', path: '/bank-transfer', Icon: TransferIcon },
  { label: 'Pay Bills', path: '/pay-bills', Icon: BillsIcon },
  { label: 'Smart Spend', path: '/smart-spend', Icon: SmartSpendIcon },
  { label: 'E-Statement', path: '/e-statement', Icon: StatementIcon },
  { label: 'Security', path: '/security', Icon: SecurityIcon }
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      style={{
        width: 260,
        minHeight: '100vh',
        background: 'var(--serandib-navy)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        borderRight: '1px solid rgba(56, 189, 248, 0.1)',
        boxShadow: '4px 0 24px rgba(6, 26, 64, 0.25)'
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-5 py-6"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl">
          <Image
            src="/brand/serandib-logo.png"
            alt="Serandib Bank"
            fill
            style={{ objectFit: 'cover' }}
            priority
          />
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-tight">
            Serandib Bank
          </p>
          <p className="text-xs" style={{ color: 'rgba(56,189,248,0.7)' }}>
            Digital Banking
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {menuItems.map(({ label, path, Icon }) => {
          const active = pathname === path || pathname.startsWith(`${path}/`)
          return (
            <Link
              key={path}
              href={path}
              className={`sidebar-item${active ? ' active' : ''}`}
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{
                  background: active
                    ? 'rgba(56, 189, 248, 0.2)'
                    : 'rgba(255, 255, 255, 0.06)'
                }}
              >
                <Icon size={16} />
              </span>
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 space-y-3">
        <div
          className="rounded-xl px-3 py-2.5 flex items-center gap-2"
          style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)'
          }}
        >
          <span className="text-base">🛡</span>
          <div>
            <p
              className="text-xs font-semibold"
              style={{ color: 'rgba(110, 231, 183, 0.9)' }}
            >
              Protected by
            </p>
            <p
              className="text-xs font-bold"
              style={{ color: 'rgba(110, 231, 183, 0.9)' }}
            >
              Serandib Shield
            </p>
          </div>
        </div>
        <UserMenu />
      </div>
    </aside>
  )
}
