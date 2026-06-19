/**
 * /api/transfers/[reference] — Phase 6: Transfer Receipt Lookup
 *
 * GET /api/transfers/:reference
 *
 * Returns the receipt for a completed transfer.
 * Only the owner of the source account can view the receipt.
 */
import { NextResponse } from 'next/server'
import { notFound, serverError, unauthorized } from '@/lib/api-response'
import { UnauthorizedError } from '@/lib/auth-errors'
import { query } from '@/lib/db'
import { formatCurrency } from '@/lib/money'
import { ensureDatabase } from '@/lib/platform-db'
import { getCurrentUser } from '@/lib/session'

type TxRow = {
  id: number
  reference: string
  from_account: string
  to_account: string
  amount: string
  description: string | null
  status: string
  created_at: string
  created_by: number
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reference: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    await ensureDatabase()

    const { reference } = await params

    if (!reference || !/^SRB-\d{8}-[A-Z0-9]+$/.test(reference)) {
      return notFound()
    }

    const result = await query<TxRow>(
      `SELECT t.id, t.reference, t.from_account, t.to_account,
              t.amount, t.description, t.status, t.created_at, t.created_by
       FROM transactions t
       WHERE t.reference = $1
       LIMIT 1`,
      [reference]
    )

    const tx = result.rows[0]
    if (!tx) return notFound()

    // Verify the session user owns the source account
    const ownerCheck = await query<{ id: number }>(
      'SELECT id FROM accounts WHERE account_number = $1 AND user_id = $2 LIMIT 1',
      [tx.from_account, user.id]
    )
    if (!ownerCheck.rows[0]) return notFound()

    const amountMinorUnits = Math.round(Number(tx.amount) * 100)

    return NextResponse.json({
      receipt: {
        reference: tx.reference,
        transactionId: tx.id,
        fromAccount: tx.from_account,
        toAccount: tx.to_account,
        amountMinorUnits,
        amountDisplay: formatCurrency(amountMinorUnits),
        currency: 'LKR',
        status: tx.status === 'SUCCESS' ? 'completed' : tx.status.toLowerCase(),
        description: tx.description ?? '',
        createdAt: tx.created_at
      }
    })
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorized()
    console.error('[api/transfers/reference]', (err as Error).message)
    return serverError()
  }
}
