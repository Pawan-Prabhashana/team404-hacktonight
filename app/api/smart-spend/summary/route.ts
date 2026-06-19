import { NextRequest, NextResponse } from 'next/server'
import { UnauthorizedError } from '@/lib/auth-errors'
import { requireUser } from '@/lib/session'
import { smartSpendQuerySchema } from '@/server/schemas/smart-spend-schemas'
import { getSmartSpendSummary } from '@/server/services/smart-spend-service'

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser()

    const qs     = Object.fromEntries(req.nextUrl.searchParams)
    const parsed = smartSpendQuerySchema.safeParse(qs)
    const params = parsed.success ? parsed.data : {}
    const accountId = params.accountId ? Number(params.accountId) : undefined

    const summary = await getSmartSpendSummary({
      userId: user.id,
      from:   params.from,
      to:     params.to,
      accountId,
    })

    return NextResponse.json({ summary })
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }
    console.error('[smart-spend/summary]', (err as Error).message)
    return NextResponse.json({ error: 'Failed to load Smart Spend summary.' }, { status: 500 })
  }
}
