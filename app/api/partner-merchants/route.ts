/**
 * GET /api/partner-merchants — Phase 9: Invisible Savings
 *
 * Returns active partner merchants for the Invisible Savings feature.
 * Requires a logged-in user (session cookie). No secrets or stack traces returned.
 */
import { NextResponse } from 'next/server'
import { forbidden, serverError, unauthorized } from '@/lib/api-response'
import { ForbiddenError, UnauthorizedError } from '@/lib/auth-errors'
import { getCurrentUser } from '@/lib/session'
import { listActivePartnerMerchants } from '@/server/repositories/partner-merchants-repository'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const partners = await listActivePartnerMerchants()
    return NextResponse.json({ partners })
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorized()
    if (err instanceof ForbiddenError) return forbidden()
    console.error('[api/partner-merchants GET]', (err as Error).message)
    return serverError()
  }
}
