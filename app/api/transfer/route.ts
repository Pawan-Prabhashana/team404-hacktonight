/**
 * /api/transfer — Phase 6: Atomic Transfer Engine
 *
 * POST /api/transfer
 *
 * Security contract:
 *   - userId is derived from the HttpOnly session cookie, never the body.
 *   - Source account ownership is verified inside a DB row lock.
 *   - Frozen accounts are rejected before any balance change.
 *   - Insufficient funds are rejected atomically.
 *   - Idempotency key prevents double-submit.
 *   - All mutations roll back on any failure.
 *   - No stack traces or DB internals are returned.
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
import {
  createTransferSchema,
  parseBody
} from '@/server/schemas/transfer-schemas'
import { createTransfer } from '@/server/services/transfer-service'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    await ensureDatabase()

    const body = await request.json().catch(() => ({}))

    // Validate request body
    const parsed = parseBody(createTransferSchema, body)
    if (parsed.data === null) {
      return badRequest(parsed.error ?? 'Validation error.')
    }

    const {
      sourceAccountId,
      destinationAccountId,
      beneficiaryId,
      amount,
      currency,
      description,
      idempotencyKey
    } = parsed.data

    // Convert amount to minor units
    let amountMinorUnits: number
    try {
      amountMinorUnits = toMinorUnits(amount)
    } catch {
      return badRequest('Amount must be a positive number.')
    }

    if (amountMinorUnits <= 0) {
      return badRequest('Amount must be greater than zero.')
    }
    if (amountMinorUnits > 10_000_000_00) {
      // 10 million LKR max
      return badRequest('Amount exceeds the maximum single-transfer limit.')
    }

    // Resolve idempotency key: body → header → none
    const resolvedKey =
      idempotencyKey ?? (request.headers.get('Idempotency-Key') || undefined)

    const ipAddress =
      request.headers.get('x-forwarded-for') ??
      request.headers.get('x-real-ip') ??
      null

    const receipt = await createTransfer({
      userId: user.id,
      sourceAccountId,
      destinationAccountId: destinationAccountId ?? null,
      beneficiaryId: beneficiaryId ?? null,
      amountMinorUnits,
      currency: currency ?? 'LKR',
      description: description ?? '',
      idempotencyKey: resolvedKey,
      ipAddress
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

    console.error('[api/transfer]', (err as Error).message)
    return serverError()
  }
}
