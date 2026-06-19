/**
 * /api/bill-payments/[reference] — Phase 7: Bill Payment Receipt Lookup
 *
 * GET /api/bill-payments/:reference
 *
 * Returns the receipt for a bill payment. Only the owner (the user the payment
 * belongs to) can view it — other users' payments are never exposed.
 */
import { NextResponse } from 'next/server'
import { notFound, serverError, unauthorized } from '@/lib/api-response'
import { UnauthorizedError } from '@/lib/auth-errors'
import { ensureDatabase } from '@/lib/platform-db'
import { getCurrentUser } from '@/lib/session'
import { getBillPaymentForUser } from '@/server/repositories/bill-payments-repository'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reference: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    await ensureDatabase()

    const { reference } = await params

    if (!reference || !/^SRB-BILL-\d{8}-[A-Z0-9]+$/.test(reference)) {
      return notFound()
    }

    const receipt = await getBillPaymentForUser(user.id, reference)
    if (!receipt) return notFound()

    return NextResponse.json({ receipt })
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorized()
    console.error('[api/bill-payments/reference]', (err as Error).message)
    return serverError()
  }
}
