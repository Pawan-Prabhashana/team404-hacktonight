'use client'

/**
 * UserMenu — shows the signed-in user's name and a logout button.
 * Designed for the sidebar footer of banking pages.
 */
import { useAuth } from '@/components/auth/AuthProvider'

export default function UserMenu() {
  const { user, loading, logout } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 text-xs text-white/50">
        Loading…
      </div>
    )
  }

  if (!user) {
    return (
      <a
        href="/login"
        className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white/70 transition hover:bg-white/10"
      >
        <span>Log in</span>
      </a>
    )
  }

  return (
    <div className="flex w-full flex-col gap-1 px-3">
      <div className="truncate px-1 text-xs font-medium text-white/60">
        {user.fullName || user.email}
      </div>
      <button
        type="button"
        onClick={logout}
        className="flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4 shrink-0"
          aria-hidden="true"
        >
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        Log out
      </button>
    </div>
  )
}
