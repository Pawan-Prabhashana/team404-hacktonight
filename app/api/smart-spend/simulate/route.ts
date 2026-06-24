import { NextRequest, NextResponse } from 'next/server'
import { UnauthorizedError } from '@/lib/auth-errors'
import { toMinorUnits } from '@/lib/money'
import { requireUser } from '@/lib/session'
import { financialTwinSchema } from '@/server/schemas/smart-spend-schemas'
import { simulateFinancialScenario } from '@/server/services/financial-twin-service'

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    const body = await req.json()

    const parsed = financialTwinSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid simulation input.', details: parsed.error.flatten().fieldErrors },
        { status: 422 },
      )
    }

    const { scenarioType, amount, categorySlug, accountId, description } = parsed.data
    const amountMinorUnits = toMinorUnits(amount)

    const result = await simulateFinancialScenario({
      userId: user.id,
      scenarioType,
      amountMinorUnits,
      categorySlug,
      accountId: accountId ? Number(accountId) : undefined,
      description,
    })

    return NextResponse.json({ result })
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }
    console.error('[smart-spend/simulate]', (err as Error).message)
    return NextResponse.json({ error: 'Simulation failed.' }, { status: 500 })
  }
}
