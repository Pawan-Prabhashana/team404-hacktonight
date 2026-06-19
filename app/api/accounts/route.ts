/**
 * /api/accounts
 *
 * Phase 4: Fully session-scoped account API.
 *
 * GET  — returns all accounts owned by the logged-in user.
 * PATCH — update nickname or status (active/frozen) of an owned account.
 *
 * Security:
 *   - userId is NEVER read from query params or request body.
 *   - Account ownership is verified on every write.
 *   - PIN is never returned.
 *   - Only active/frozen status allowed for customers.
 */
import { NextResponse } from 'next/server'
import {
  badRequest,
  forbidden,
  serverError,
  unauthorized
} from '@/lib/api-response'
import { writeAuditLog } from '@/lib/audit'
import { ForbiddenError, UnauthorizedError } from '@/lib/auth-errors'
import { getCurrentUser } from '@/lib/session'
import {
  listAccountsForUser,
  updateAccountNickname,
  updateAccountStatus
} from '@/server/repositories/accounts-repository'
import {
  parseBody,
  updateAccountSchema
} from '@/server/schemas/banking-schemas'

// ---------------------------------------------------------------------------
// GET /api/accounts
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const accounts = await listAccountsForUser(user.id)
    return NextResponse.json({ accounts })
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorized()
    if (err instanceof ForbiddenError) return forbidden()
    console.error('[api/accounts GET]', (err as Error).message)
    return serverError()
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/accounts
// ---------------------------------------------------------------------------
export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const body = await request.json().catch(() => ({}))
    const parsed = parseBody(updateAccountSchema, body)
    if (parsed.data === null)
      return badRequest(parsed.error ?? 'Invalid request.')

    const { accountId, nickname, status } = parsed.data

    let updated: ReturnType<typeof Object.assign> | null = null

    if (nickname !== undefined) {
      updated = await updateAccountNickname(user.id, accountId, nickname)
      if (!updated) return forbidden('Account not found or access denied.')

      await writeAuditLog({
        action: 'ACCOUNT_NICKNAME_UPDATED',
        userId: String(user.id),
        entityType: 'account',
        entityId: String(accountId),
        metadata: { nickname }
      }).catch(() => {})
    }

    if (status !== undefined) {
      updated = await updateAccountStatus(user.id, accountId, status)
      if (!updated) return forbidden('Account not found or access denied.')

      await writeAuditLog({
        action: 'ACCOUNT_STATUS_UPDATED',
        userId: String(user.id),
        entityType: 'account',
        entityId: String(accountId),
        metadata: { status }
      }).catch(() => {})
    }

    return NextResponse.json({ account: updated })
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorized()
    if (err instanceof ForbiddenError) return forbidden()
    console.error('[api/accounts PATCH]', (err as Error).message)
    return serverError()
  }
}
