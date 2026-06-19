/**
 * Client-safe auth helpers for NOVA Bank.
 *
 * These functions call the server-side auth API routes. They never access
 * cookies directly (the browser handles HttpOnly cookies automatically).
 * Do not store user IDs or roles in localStorage.
 */

export type AuthUser = {
  id: number
  fullName: string
  email: string
  role: 'customer' | 'admin'
  status: string
}

/** Send login credentials to the server and return the authenticated user. */
export async function login(
  email: string,
  password: string
): Promise<AuthUser> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'same-origin'
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data?.error ?? 'Login failed.')
  }

  return data.user as AuthUser
}

/** Revoke the current session server-side and clear the cookie. */
export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'same-origin'
  })
}

/** Fetch the currently authenticated user from the server. Returns null if not logged in. */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const res = await fetch('/api/auth/me', {
    credentials: 'same-origin',
    cache: 'no-store'
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.user ?? null
}
