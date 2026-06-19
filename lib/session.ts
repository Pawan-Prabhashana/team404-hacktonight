/**
 * Server-side session management for NOVA Bank.
 *
 * Design:
 *   - A cryptographically random token is generated on login.
 *   - Only the SHA-256 hash of that token is stored in the database.
 *   - The raw token is placed in an HttpOnly cookie and never stored server-side.
 *   - Clients cannot forge or modify session data by design.
 *
 * Usage in Route Handlers:
 *   const user = await getCurrentUser()        // null if unauthenticated
 *   const user = await requireUser()           // throws UnauthorizedError
 *   const admin = await requireAdmin()         // throws ForbiddenError if not admin
 */
import crypto from 'crypto'
import { cookies } from 'next/headers'
import { ForbiddenError, UnauthorizedError } from '@/lib/auth-errors'
import { query } from '@/lib/db'

export const SESSION_COOKIE_NAME = 'serandib_session'

// 7-day session lifetime
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

export type AuthUser = {
  id: number
  fullName: string
  email: string
  role: 'customer' | 'admin'
  status: string
}

type SessionRow = {
  user_id: number
  full_name: string
  email: string
  role: string
}

/** Generate a cryptographically random opaque token. */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('base64url')
}

/** Hash a session token with SHA-256 before DB storage. */
export function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * Create a new session row in the DB for the given user.
 * Returns the raw (unhashed) session token to be placed in the cookie.
 */
export async function createSession(userId: number): Promise<string> {
  const token = generateSessionToken()
  const tokenHash = hashSessionToken(token)
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000)

  await query(
    `INSERT INTO sessions (user_id, session_token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt]
  )

  return token
}

/**
 * Read the session cookie, look up the hashed token in the DB, and return the
 * associated user. Returns null for any invalid/expired/revoked session.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
    if (!token) return null

    const tokenHash = hashSessionToken(token)

    const result = await query<SessionRow>(
      `SELECT s.user_id, u.full_name, u.email, u.role
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.session_token_hash = $1
         AND s.expires_at > NOW()
         AND s.revoked_at IS NULL
       LIMIT 1`,
      [tokenHash]
    )

    const row = result.rows[0]
    if (!row) return null

    return {
      id: row.user_id,
      fullName: row.full_name,
      email: row.email,
      role: row.role as 'customer' | 'admin',
      status: 'active'
    }
  } catch (err) {
    // Gracefully return null if the sessions table is not yet created or DB is
    // unavailable; a missing session simply means unauthenticated.
    console.error('[session] getCurrentUser error:', (err as Error).message)
    return null
  }
}

/**
 * Like getCurrentUser() but throws UnauthorizedError instead of returning null.
 * Use this in API routes that require authentication.
 */
export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser()
  if (!user) throw new UnauthorizedError()
  return user
}

/**
 * Like requireUser() but additionally checks that role === 'admin'.
 * Throws ForbiddenError if the authenticated user is not an admin.
 */
export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireUser()
  if (user.role !== 'admin') throw new ForbiddenError()
  return user
}

/**
 * Mark the current session as revoked in the DB.
 * Safe to call even when no session cookie is present.
 */
export async function revokeCurrentSession(): Promise<void> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
    if (!token) return

    const tokenHash = hashSessionToken(token)
    await query(
      `UPDATE sessions
       SET revoked_at = NOW()
       WHERE session_token_hash = $1 AND revoked_at IS NULL`,
      [tokenHash]
    )
  } catch (err) {
    console.error(
      '[session] revokeCurrentSession error:',
      (err as Error).message
    )
  }
}

/** Cookie options used both when setting and when clearing the session cookie. */
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SESSION_MAX_AGE_SECONDS
} as const
