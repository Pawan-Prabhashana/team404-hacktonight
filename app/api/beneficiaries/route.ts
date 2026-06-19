/**
 * /api/beneficiaries
 *
 * Phase 4: Protected beneficiary list and creation.
 *
 * GET  — returns all beneficiaries for the logged-in user.
 * POST — creates a new beneficiary for the logged-in user.
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
  createBeneficiaryForUser,
  listBeneficiariesForUser
} from '@/server/repositories/beneficiaries-repository'
import {
  createBeneficiarySchema,
  parseBody
} from '@/server/schemas/banking-schemas'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const beneficiaries = await listBeneficiariesForUser(user.id)
    return NextResponse.json({ beneficiaries })
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorized()
    if (err instanceof ForbiddenError) return forbidden()
    console.error('[api/beneficiaries GET]', (err as Error).message)
    return serverError()
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const body = await request.json().catch(() => ({}))
    const parsed = parseBody(createBeneficiarySchema, body)
    if (parsed.data === null)
      return badRequest(parsed.error ?? 'Invalid request.')

    const { name, bankName, accountNumber } = parsed.data

    const beneficiary = await createBeneficiaryForUser({
      userId: user.id,
      name,
      bankName,
      accountNumber
    })

    await writeAuditLog({
      action: 'BENEFICIARY_CREATED',
      userId: String(user.id),
      entityType: 'beneficiary',
      entityId: String(beneficiary.id),
      metadata: { name, bankName }
    }).catch(() => {})

    return NextResponse.json({ beneficiary }, { status: 201 })
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorized()
    if (err instanceof ForbiddenError) return forbidden()
    console.error('[api/beneficiaries POST]', (err as Error).message)
    return serverError()
  }
}
