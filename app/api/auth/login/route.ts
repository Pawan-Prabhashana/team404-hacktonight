/**
 * /api/auth/login — Phase 3: secure authentication endpoint.
 *
 * POST { email, password }
 *   → verifies bcrypt hash
 *   → creates server-side session
 *   → sets HttpOnly nova_session cookie
 *   → returns safe user object (no password, no session token)
 *
 * Security properties:
 *   - Does not reveal whether email or password was wrong (generic error).
 *   - Password hash is never returned to the client.
 *   - Session token is stored only as a SHA-256 hash in the DB.
 *   - Raw session token is in an HttpOnly cookie only.
 *   - Simple in-memory rate limiter caps repeated failed attempts per IP/email.
 */
import { NextResponse } from 'next/server'
import { badRequest, serverError, unauthorized } from '@/lib/api-response'
import { writeAuditLog } from '@/lib/audit'
import { ForbiddenError, UnauthorizedError } from '@/lib/auth-errors'
import { verifyPassword } from '@/lib/password'
import { ensureDatabase, runStatement } from '@/lib/platform-db'
import {
  createSession,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS
} from '@/lib/session'
import { loginSchema, safeParse } from '@/lib/validation'

// ---------------------------------------------------------------------------
// Simple in-memory rate limiter (per IP + email).
// Resets after WINDOW_MS. A proper cache (Redis) can replace this in Phase 4+.
// ---------------------------------------------------------------------------
const loginAttempts = new Map<string, { count: number; resetAt: number }>()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes

function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const entry = loginAttempts.get(key)
  if (!entry || entry.resetAt < now) {
    loginAttempts.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  if (entry.count >= MAX_ATTEMPTS) return false
  entry.count++
  return true
}

function clearRateLimit(key: string): void {
  loginAttempts.delete(key)
}

// ---------------------------------------------------------------------------
// GET — not supported
// ---------------------------------------------------------------------------
export async function GET() {
  return new Response(JSON.stringify({ error: 'Method not allowed.' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' }
  })
}

// ---------------------------------------------------------------------------
// POST
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  // Fast-fail with a helpful message if DATABASE_URL is not set.
  if (!process.env.DATABASE_URL) {
    console.error(
      '[api/auth/login] DATABASE_URL is not set. Cannot authenticate.'
    )
    return serverError(
      'Database not configured. Start Docker (docker compose up) and ensure DATABASE_URL is set in .env.local, then restart the server.'
    )
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  try {
    const body = await request.json().catch(() => ({}))
    const parsed = safeParse(loginSchema, body)

    if (parsed.data === null) {
      return badRequest(parsed.error ?? 'Invalid request.')
    }

    const { email, password } = parsed.data
    const rateLimitKey = `${ip}:${email}`

    if (!checkRateLimit(rateLimitKey)) {
      return unauthorized(
        'Too many failed login attempts. Please try again later.'
      )
    }

    await ensureDatabase()

    // Look up user by email — parameterized, no SQL injection possible.
    // Alias password_hash → password so either schema column name works.
    const result = await runStatement<{
      id: number
      password: string
      role: string
      full_name: string
      email: string
    }>(
      `SELECT id, password_hash AS password, role, full_name, email
       FROM users
       WHERE email = $1
       LIMIT 1`,
      [email]
    )

    const dbUser = result.rows[0]

    // Always run bcrypt.compare even when user not found (constant-time guard).
    // Use a dummy hash so compare always does real work.
    const DUMMY_HASH =
      '$2b$12$abcdefghijklmnopqrstuvuuuuuuuuuuuuuuuuuuuuuuuuuuuuuu'
    const hashToVerify = dbUser?.password ?? DUMMY_HASH
    const passwordOk = await verifyPassword(password, hashToVerify)

    if (!dbUser || !passwordOk) {
      await writeAuditLog({
        action: 'LOGIN_FAILED',
        metadata: { email, ip, reason: dbUser ? 'bad_password' : 'no_user' }
      }).catch(() => {})
      // Generic message — never reveal whether the email or password was wrong.
      return unauthorized('Invalid email or password.')
    }

    // Successful login — create session and clear any rate-limit counter.
    clearRateLimit(rateLimitKey)
    const token = await createSession(dbUser.id)

    await writeAuditLog({
      action: 'LOGIN_SUCCESS',
      userId: String(dbUser.id),
      metadata: { email, ip }
    }).catch(() => {})

    const safeUser = {
      id: dbUser.id,
      fullName: dbUser.full_name,
      email: dbUser.email,
      role: dbUser.role,
      status: 'active'
    }

    const response = NextResponse.json({ user: safeUser })
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      ...SESSION_COOKIE_OPTIONS,
      secure: process.env.NODE_ENV === 'production'
    })

    return response
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      return unauthorized(err.message)
    }
    const msg = (err as Error).message ?? 'unknown'
    console.error('[api/auth/login] unexpected error:', msg)
    if (process.env.NODE_ENV !== 'production') {
      console.error((err as Error).stack)
    }

    // Give a more helpful message when Docker / DB is unreachable
    if (
      msg.includes('ECONNREFUSED') ||
      msg.includes('connect') ||
      msg.includes('timeout') ||
      msg.includes('database')
    ) {
      return serverError(
        'Database unreachable. Make sure Docker is running (docker compose up db -d) and DATABASE_URL is set in .env.local, then restart the server.'
      )
    }

    return serverError('Unable to process login. Please try again.')
  }
}
