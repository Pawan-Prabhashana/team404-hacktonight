/**
 * /api/billers — Phase 7: Protected biller directory
 *
 * GET /api/billers?category=<cat>&search=<term>
 *
 * Security contract:
 *   - Requires a logged-in user (session cookie).
 *   - Returns active billers only.
 *   - Search/category are validated and passed as bound query parameters.
 *   - Returns a safe shape only — no secrets.
 */
import { NextResponse } from 'next/server'
import { badRequest, serverError, unauthorized } from '@/lib/api-response'
import { UnauthorizedError } from '@/lib/auth-errors'
import { getCurrentUser } from '@/lib/session'
import { listActiveBillers } from '@/server/repositories/billers-repository'
import {
  listBillersSchema,
  parseParams
} from '@/server/schemas/bill-payment-schemas'

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const { searchParams } = new URL(request.url)
    const parsed = parseParams(listBillersSchema, searchParams)
    if (parsed.data === null)
      return badRequest(parsed.error ?? 'Invalid request.')

    const { category, search } = parsed.data

    const billers = await listActiveBillers({ category, search })

    return NextResponse.json({ billers })
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorized()
    console.error('[api/billers]', (err as Error).message)
    return serverError()
  }
}
