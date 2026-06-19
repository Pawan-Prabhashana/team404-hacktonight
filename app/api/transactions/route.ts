/**
 * /api/transactions
 *
 * Phase 4: Fully session-scoped, paginated, ownership-verified.
 *
 * GET /api/transactions?accountId=<int>&limit=20&offset=0
 *
 * - userId is never read from query params.
 * - If accountId is provided, verifies it belongs to the session user.
 * - Returns transaction direction relative to the session user's accounts.
 * - Supports pagination via limit/offset.
 */
import { NextResponse } from 'next/server'
import {
  badRequest,
  forbidden,
  serverError,
  unauthorized
} from '@/lib/api-response'
import { ForbiddenError, UnauthorizedError } from '@/lib/auth-errors'
import { getCurrentUser } from '@/lib/session'
import { listTransactionsForUser } from '@/server/repositories/transactions-repository'
import {
  listTransactionsSchema,
  parseParams
} from '@/server/schemas/banking-schemas'

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const { searchParams } = new URL(request.url)
    const parsed = parseParams(listTransactionsSchema, searchParams)
    if (parsed.data === null)
      return badRequest(parsed.error ?? 'Invalid request.')

    const { accountId, limit, offset } = parsed.data

    const { transactions, total } = await listTransactionsForUser({
      userId: user.id,
      accountId,
      limit,
      offset
    })

    return NextResponse.json({
      transactions,
      pagination: { limit, offset, count: transactions.length, total }
    })
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorized()
    if (err instanceof ForbiddenError) return forbidden()
    console.error('[api/transactions]', (err as Error).message)
    return serverError()
  }
}
