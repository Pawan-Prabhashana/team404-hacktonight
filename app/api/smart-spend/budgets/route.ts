import { NextRequest, NextResponse } from 'next/server'
import { UnauthorizedError } from '@/lib/auth-errors'
import { writeAuditLog } from '@/lib/audit'
import { toMinorUnits } from '@/lib/money'
import { requireUser } from '@/lib/session'
import {
  listBudgetsForUser,
  upsertBudgetForUser,
} from '@/server/repositories/smart-spend-repository'
import { upsertBudgetSchema } from '@/server/schemas/smart-spend-schemas'

export async function GET() {
  try {
    const user    = await requireUser()
    const budgets = await listBudgetsForUser(user.id)
    return NextResponse.json({ budgets })
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed to load budgets.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    const body = await req.json()

    const parsed = upsertBudgetSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid budget data.', details: parsed.error.flatten().fieldErrors },
        { status: 422 },
      )
    }

    const { categorySlug, amount, currency, period } = parsed.data
    const amountMinorUnits = toMinorUnits(amount)

    const budget = await upsertBudgetForUser({
      userId: user.id,
      categorySlug,
      amountMinorUnits,
      currency,
      period,
    })

    await writeAuditLog({
      userId:     String(user.id),
      action:     'BUDGET_UPSERTED',
      entityType: 'budget',
      entityId:   String(budget.id),
      metadata:   { categorySlug, amountMinorUnits, currency, period },
    })

    return NextResponse.json({ budget }, { status: 201 })
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }
    console.error('[smart-spend/budgets POST]', (err as Error).message)
    return NextResponse.json({ error: 'Failed to save budget.' }, { status: 500 })
  }
}
