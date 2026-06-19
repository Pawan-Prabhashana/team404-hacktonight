'use client'

/**
 * AuthProvider — lightweight client-side auth context for NOVA Bank.
 *
 * Fetches the current user from /api/auth/me on mount. Does NOT use
 * localStorage or store credentials client-side. The HttpOnly cookie is
 * handled by the browser automatically.
 *
 * Usage:
 *   const { user, loading, logout, refreshUser } = useAuth()
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState
} from 'react'
import {
  type AuthUser,
  getCurrentUser,
  logout as logoutClient
} from '@/lib/auth-client'

type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  refreshUser: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  refreshUser: async () => {},
  logout: async () => {}
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    setLoading(true)
    try {
      const current = await getCurrentUser()
      setUser(current)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    await logoutClient()
    setUser(null)
    window.location.href = '/login'
  }, [])

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext)
}
