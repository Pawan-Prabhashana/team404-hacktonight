/**
 * /api/notifications
 *
 * Phase 4: Protected notifications for the logged-in user.
 *
 * GET — returns all notifications, newest first.
 */
import { NextResponse } from 'next/server'
import { forbidden, serverError, unauthorized } from '@/lib/api-response'
import { ForbiddenError, UnauthorizedError } from '@/lib/auth-errors'
import { getCurrentUser } from '@/lib/session'
import { listNotificationsForUser } from '@/server/repositories/notifications-repository'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const notifications = await listNotificationsForUser(user.id)
    return NextResponse.json({ notifications })
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorized()
    if (err instanceof ForbiddenError) return forbidden()
    console.error('[api/notifications GET]', (err as Error).message)
    return serverError()
  }
}
