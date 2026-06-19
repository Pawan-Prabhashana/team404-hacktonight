/**
 * /api/invisible-savings/settings — Phase 9
 *
 * GET  — return current user's invisible savings settings.
 * PATCH — update settings (source account, destination, min/max round-up, enabled).
 *
 * Security: userId from session only. Account ownership verified inside service.
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
import { writeAuditLog } from '@/lib/audit'
import { getCurrentUser } from '@/lib/session'
import { BankingError } from '@/server/errors/banking-errors'
import {
  getInvisibleSavingsSettings,
  upsertInvisibleSavingsSettings
} from '@/server/repositories/invisible-savings-repository'
import {
  parseBody,
  updateInvisibleSavingsSettingsSchema
} from '@/server/schemas/invisible-savings-schemas'
import { query } from '@/lib/db'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const settings = await getInvisibleSavingsSettings(user.id)
    return NextResponse.json({ settings })
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorized()
    if (err instanceof ForbiddenError) return forbidden()
    console.error('[api/invisible-savings/settings GET]', (err as Error).message)
    return serverError()
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const body = await request.json().catch(() => ({}))
    const parsed = parseBody(updateInvisibleSavingsSettingsSchema, body)
    if (parsed.data === null) return badRequest(parsed.error ?? 'Invalid request.')

    const {
      enabled,
      sourceAccountId,
      destinationAccountId,
      minRoundupAmount,
      maxRoundupAmount,
      sweepDay
    } = parsed.data

    // Load existing settings to fill in unchanged fields
    const existing = await getInvisibleSavingsSettings(user.id)

    const newSourceId = sourceAccountId ?? existing?.sourceAccountId
    const newDestId = destinationAccountId ?? existing?.destinationAccountId

    if (!newSourceId || !newDestId) {
      return badRequest('Source and destination accounts are required.')
    }

    if (newSourceId === newDestId) {
      return badRequest('Source and destination accounts must differ.')
    }

    // Verify ownership of source account
    const srcCheck = await query<{ id: number; user_id: number }>(
      'SELECT id, user_id FROM accounts WHERE id = $1 LIMIT 1',
      [newSourceId]
    )
    if (!srcCheck.rows[0] || srcCheck.rows[0].user_id !== user.id) {
      return badRequest('Source account not found or access denied.')
    }

    // Verify ownership of destination account
    const dstCheck = await query<{ id: number; user_id: number }>(
      'SELECT id, user_id FROM accounts WHERE id = $1 LIMIT 1',
      [newDestId]
    )
    if (!dstCheck.rows[0] || dstCheck.rows[0].user_id !== user.id) {
      return badRequest('Destination account not found or access denied.')
    }

    let minRoundupMinorUnits = existing?.minRoundupMinorUnits ?? 2000
    let maxRoundupMinorUnits = existing?.maxRoundupMinorUnits ?? 5000

    if (minRoundupAmount !== undefined) {
      minRoundupMinorUnits = toMinorUnits(minRoundupAmount)
    }
    if (maxRoundupAmount !== undefined) {
      maxRoundupMinorUnits = toMinorUnits(maxRoundupAmount)
    }

    if (minRoundupMinorUnits >= maxRoundupMinorUnits) {
      return badRequest('Minimum round-up must be less than maximum round-up.')
    }

    const settings = await upsertInvisibleSavingsSettings({
      userId: user.id,
      sourceAccountId: newSourceId,
      destinationAccountId: newDestId,
      enabled: enabled ?? existing?.enabled ?? true,
      minRoundupMinorUnits,
      maxRoundupMinorUnits,
      sweepDay: sweepDay ?? existing?.sweepDay ?? 28
    })

    await writeAuditLog({
      userId: String(user.id),
      action: 'INVISIBLE_SAVINGS_SETTINGS_UPDATED',
      entityType: 'invisible_savings_settings',
      entityId: String(settings.id),
      metadata: { enabled: settings.enabled, sourceAccountId: newSourceId, destinationAccountId: newDestId }
    })

    return NextResponse.json({ settings })
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorized()
    if (err instanceof ForbiddenError) return forbidden()
    if (err instanceof BankingError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.statusCode }
      )
    }
    console.error('[api/invisible-savings/settings PATCH]', (err as Error).message)
    return serverError()
  }
}
