/**
 * /api/bill-payments — Phase 7: Bill Payment Engine
 *
 * GET  /api/bill-payments  — list the current user's bill payments (filtered).
 * POST /api/bill-payments  — execute an atomic, ledger-backed bill payment.
 *
 * Security contract:
 *   - Requires a logged-in user (session cookie).
 *   - userId is derived from the session, never the body.
 *   - Source account ownership is verified inside a DB row lock.
 *   - Frozen accounts and insufficient funds are rejected atomically.
 *   - Idempotency key prevents double-submit.
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
import { listBillPaymentsForUser } from '@/server/repositories/bill-payments-repository'
import {
  createBillPaymentSchema,
  listBillPaymentsSchema,
  parseBody,
  parseParams
} from '@/server/schemas/bill-payment-schemas'
import { createBillPayment } from '@/server/services/bill-payment-service'

// ---------------------------------------------------------------------------
// GET /api/bill-payments
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const { searchParams } = new URL(request.url)
    const parsed = parseParams(listBillPaymentsSchema, searchParams)
    if (parsed.data === null)
      return badRequest(parsed.error ?? 'Invalid request.')

    const { accountId, billerId, status, limit, offset } = parsed.data

    const { billPayments } = await listBillPaymentsForUser({
      userId: user.id,
      accountId,
      billerId,
      status,
      limit,
      offset
    })

    return NextResponse.json({
      billPayments,
      pagination: { limit, offset, count: billPayments.length }
    })
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorized()
    if (err instanceof ForbiddenError) return forbidden()
    console.error('[api/bill-payments GET]', (err as Error).message)
    return serverError()
  }
}

// ---------------------------------------------------------------------------
// POST /api/bill-payments
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    await ensureDatabase()

    const body = await request.json().catch(() => ({}))

    const parsed = parseBody(createBillPaymentSchema, body)
    if (parsed.data === null) {
      return badRequest(parsed.error ?? 'Validation error.')
    }

    const { accountId, billerId, billReference, amount, currency, idempotencyKey } =
      parsed.data

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
      return badRequest('Amount exceeds the maximum single-payment limit.')
    }

    // Resolve idempotency key: body → header → none
    const resolvedKey =
      idempotencyKey ?? (request.headers.get('Idempotency-Key') || undefined)

    const ipAddress =
      request.headers.get('x-forwarded-for') ??
      request.headers.get('x-real-ip') ??
      null
    const userAgent = request.headers.get('user-agent')

    const receipt = await createBillPayment({
      userId: user.id,
      accountId,
      billerId,
      billReference,
      amountMinorUnits,
      currency: currency ?? 'LKR',
      idempotencyKey: resolvedKey,
      ipAddress,
      userAgent
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

    console.error('[api/bill-payments POST]', (err as Error).message)
    return serverError()
  }
}
