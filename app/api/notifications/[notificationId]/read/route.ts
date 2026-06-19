/**
 * POST /api/notifications/[notificationId]/read
 *
 * Phase 4: Mark a single notification as read. Scoped to the session user.
 */
import { NextResponse } from 'next/server'
import {
  badRequest,
  forbidden,
  serverError,
  unauthorized
} from '@/lib/api-response'
import { ForbiddenError, UnauthorizedError } from '@/lib/auth-errors'
import { getCurrentUser } from '@/lib/session'
import { markNotificationRead } from '@/server/repositories/notifications-repository'
import { notificationIdSchema } from '@/server/schemas/banking-schemas'

type Params = { params: Promise<{ notificationId: string }> }

export async function POST(_request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const { notificationId: rawId } = await params
    const idParsed = notificationIdSchema.safeParse(rawId)
    if (!idParsed.success) return badRequest('Invalid notification ID.')

    await markNotificationRead(user.id, idParsed.data)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorized()
    if (err instanceof ForbiddenError) return forbidden()
    console.error('[api/notifications/read]', (err as Error).message)
    return serverError()
  }
}
