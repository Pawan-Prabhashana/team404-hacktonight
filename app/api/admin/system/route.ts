/**
 * /api/admin/system — Phase 3: admin-only diagnostics endpoint.
 *
 * Requires a valid session with role === 'admin'.
 * Returns only safe, generic diagnostic information — no secrets, no env vars,
 * no user data, no passwords, no database connection strings.
 *
 * Previous versions of this endpoint leaked:
 *   - All users + plaintext passwords
 *   - All accounts + PINs
 *   - The full process.env object (DATABASE_URL, secrets)
 *   - The raw Cookie header
 *
 * All of those disclosures are now removed.
 */
import { NextResponse } from 'next/server'
import { forbidden, serverError, unauthorized } from '@/lib/api-response'
import { ForbiddenError, UnauthorizedError } from '@/lib/auth-errors'
import { query } from '@/lib/db'
import { requireAdmin } from '@/lib/session'

export async function GET() {
  try {
    await requireAdmin()

    // Safe database connectivity check — no sensitive data in response.
    let dbStatus = 'unknown'
    try {
      await query('SELECT 1')
      dbStatus = 'connected'
    } catch {
      dbStatus = 'unavailable'
    }

    return NextResponse.json({
      status: 'ok',
      message: 'Admin diagnostics are protected.',
      checks: {
        database: dbStatus,
        auth: 'enabled'
      }
    })
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorized()
    if (err instanceof ForbiddenError) return forbidden()
    console.error('[api/admin/system] error:', (err as Error).message)
    return serverError()
  }
}
