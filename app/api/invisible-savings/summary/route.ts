/**
 * GET /api/invisible-savings/summary — Phase 9
 *
 * Returns this month's invisible savings summary for the current user.
 */
import { NextResponse } from 'next/server'
import { forbidden, serverError, unauthorized } from '@/lib/api-response'
import { ForbiddenError, UnauthorizedError } from '@/lib/auth-errors'
import { formatCurrency } from '@/lib/money'
import { getCurrentUser } from '@/lib/session'
import {
  getInvisibleSavingsSettings,
  getInvisibleSavingsSummary,
  listInvisibleSavingsEvents
} from '@/server/repositories/invisible-savings-repository'

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const { searchParams } = new URL(request.url)
    const monthKey = searchParams.get('monthKey') ?? undefined

    const [settings, raw] = await Promise.all([
      getInvisibleSavingsSettings(user.id),
      getInvisibleSavingsSummary({ userId: user.id, monthKey })
    ])

    const events = await listInvisibleSavingsEvents({
      userId: user.id,
      monthKey: raw.monthKey,
      limit: 20
    })

    // Project monthly savings: extrapolate from daily average
    const dayOfMonth = new Date().getUTCDate()
    const daysInMonth = new Date(
      new Date().getUTCFullYear(),
      new Date().getUTCMonth() + 1,
      0
    ).getDate()
    const projected =
      dayOfMonth > 0 && raw.capturedMinorUnits > 0
        ? Math.round((raw.capturedMinorUnits / dayOfMonth) * daysInMonth)
        : 0

    // Estimate next sweep day
    const sweepDay = settings?.sweepDay ?? 28
    const now = new Date()
    const nextSweep = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        sweepDay <= now.getUTCDate()
          ? now.getUTCMonth() + 1
          : now.getUTCMonth(),
        sweepDay
      )
    )

    return NextResponse.json({
      summary: {
        monthKey: raw.monthKey,
        enabled: settings?.enabled ?? false,
        capturedThisMonthMinorUnits: raw.capturedMinorUnits,
        capturedThisMonthDisplay: formatCurrency(raw.capturedMinorUnits, 'LKR'),
        eventCount: raw.eventCount,
        averageRoundupMinorUnits: raw.averageRoundupMinorUnits,
        averageRoundupDisplay: formatCurrency(
          raw.averageRoundupMinorUnits,
          'LKR'
        ),
        projectedMonthlySavingMinorUnits: projected,
        projectedMonthlySavingDisplay: formatCurrency(projected, 'LKR'),
        topPartner: raw.topPartner,
        nextSweepDate: nextSweep.toISOString().slice(0, 10),
        events
      }
    })
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorized()
    if (err instanceof ForbiddenError) return forbidden()
    console.error('[api/invisible-savings/summary GET]', (err as Error).message)
    return serverError()
  }
}
