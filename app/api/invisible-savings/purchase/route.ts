/**
 * POST /api/invisible-savings/purchase — Phase 9
 *
 * Simulates a partner card purchase, capturing an invisible round-up saving.
 * userId comes from session only. No stack traces returned.
 */
import { NextResponse } from 'next/server'
import {
  badRequest,
  forbidden,
  serverError,
  unauthorized
} from '@/lib/api-response'
import { ForbiddenError, UnauthorizedError } from '@/lib/auth-errors'
import { toMinorUnits } from '@/lib/money'
import { ensureDatabase } from '@/lib/platform-db'
import { getCurrentUser } from '@/lib/session'
import { BankingError } from '@/server/errors/banking-errors'
import { processPartnerPurchase } from '@/server/services/invisible-savings-service'
import {
  parseBody,
  simulatePartnerPurchaseSchema
} from '@/server/schemas/invisible-savings-schemas'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    await ensureDatabase()

    const body = await request.json().catch(() => ({}))
    const parsed = parseBody(simulatePartnerPurchaseSchema, body)
    if (parsed.data === null) return badRequest(parsed.error ?? 'Validation error.')

    const { partnerMerchantId, sourceAccountId, purchaseAmount, currency, description, idempotencyKey } = parsed.data

    let purchaseAmountMinorUnits: number
    try {
      purchaseAmountMinorUnits = toMinorUnits(purchaseAmount)
    } catch {
      return badRequest('Purchase amount must be a positive number.')
    }
    if (purchaseAmountMinorUnits <= 0) return badRequest('Purchase amount must be greater than zero.')
    if (purchaseAmountMinorUnits > 10_000_000_00) return badRequest('Purchase amount exceeds the limit.')

    const resolvedKey = idempotencyKey ?? (request.headers.get('Idempotency-Key') || undefined)
    const ipAddress = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null
    const userAgent = request.headers.get('user-agent')

    const receipt = await processPartnerPurchase({
      userId: user.id,
      partnerMerchantId,
      sourceAccountId,
      purchaseAmountMinorUnits,
      currency: currency ?? 'LKR',
      description,
      idempotencyKey: resolvedKey,
      ipAddress,
      userAgent
    })

    return NextResponse.json({ receipt }, { status: 200 })
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorized()
    if (err instanceof ForbiddenError) return forbidden()
    if (err instanceof BankingError) {
      const status = err.statusCode === 404 ? 404 : err.statusCode === 403 ? 403 : 400
      return NextResponse.json({ error: err.message, code: err.code }, { status })
    }
    console.error('[api/invisible-savings/purchase POST]', (err as Error).message)
    return serverError()
  }
}
