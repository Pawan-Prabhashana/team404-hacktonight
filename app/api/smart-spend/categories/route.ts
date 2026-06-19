import { NextResponse } from 'next/server'
import { UnauthorizedError } from '@/lib/auth-errors'
import { requireUser } from '@/lib/session'
import { listSpendCategories } from '@/server/repositories/smart-spend-repository'

export async function GET() {
  try {
    await requireUser()
    const categories = await listSpendCategories()
    return NextResponse.json({ categories })
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }
    console.error('[smart-spend/categories]', (err as Error).message)
    return NextResponse.json({ error: 'Failed to load categories.' }, { status: 500 })
  }
}
