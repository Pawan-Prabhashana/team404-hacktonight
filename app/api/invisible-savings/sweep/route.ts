/**
 * POST /api/invisible-savings/sweep — Phase 9
 *
 * Manually triggers the month-end sweep for demo purposes.
 * Sweeps accumulated invisible savings into the destination savings account.
 * Cannot sweep the same month twice.
 */
import { NextResponse } from 'next/server'
import {
  badRequest,
  forbidden,
  serverError,
  unauthorized
} from '@/lib/api-response'
import { ForbiddenError, UnauthorizedError } from '@/lib/auth-errors'
import { ensureDatabase } from '@/lib/platform-db'
import { getCurrentUser } from '@/lib/session'
import { BankingError } from '@/server/errors/banking-errors'
import {
  parseBody,
  sweepSavingsSchema
} from '@/server/schemas/invisible-savings-schemas'
import { sweepInvisibleSavingsForMonth } from '@/server/services/invisible-savings-service'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    await ensureDatabase()

    const body = await request.json().catch(() => ({}))
    const parsed = parseBody(sweepSavingsSchema, body)
    if (parsed.data === null)
      return badRequest(parsed.error ?? 'Invalid request.')

    const { monthKey } = parsed.data

    const receipt = await sweepInvisibleSavingsForMonth({
      userId: user.id,
      monthKey
    })

    return NextResponse.json({ receipt }, { status: 200 })
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorized()
    if (err instanceof ForbiddenError) return forbidden()
    if (err instanceof BankingError) {
      const status =
        err.statusCode === 404 ? 404 : err.statusCode === 403 ? 403 : 400
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status }
      )
    }
    console.error('[api/invisible-savings/sweep POST]', (err as Error).message)
    return serverError()
  }
}
