/**
 * /api/beneficiaries/[beneficiaryId]
 *
 * Phase 4: Beneficiary update and delete, scoped to the session user.
 *
 * PATCH  — update trustLevel of a beneficiary.
 * DELETE — remove a beneficiary.
 */
import { NextResponse } from 'next/server'
import {
  badRequest,
  forbidden,
  notFound,
  serverError,
  unauthorized
} from '@/lib/api-response'
import { writeAuditLog } from '@/lib/audit'
import { ForbiddenError, UnauthorizedError } from '@/lib/auth-errors'
import { getCurrentUser } from '@/lib/session'
import {
  deleteBeneficiaryForUser,
  updateBeneficiaryTrustLevel
} from '@/server/repositories/beneficiaries-repository'
import {
  beneficiaryIdSchema,
  parseBody,
  updateBeneficiaryTrustSchema
} from '@/server/schemas/banking-schemas'

type Params = { params: Promise<{ beneficiaryId: string }> }

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const { beneficiaryId: rawId } = await params
    const idParsed = beneficiaryIdSchema.safeParse(rawId)
    if (!idParsed.success) return badRequest('Invalid beneficiary ID.')
    const beneficiaryId = idParsed.data

    const body = await request.json().catch(() => ({}))
    const parsed = parseBody(updateBeneficiaryTrustSchema, body)
    if (parsed.data === null)
      return badRequest(parsed.error ?? 'Invalid request.')

    const updated = await updateBeneficiaryTrustLevel({
      userId: user.id,
      beneficiaryId,
      trustLevel: parsed.data.trustLevel
    })

    if (!updated) return notFound('Beneficiary not found.')

    await writeAuditLog({
      action: 'BENEFICIARY_TRUST_UPDATED',
      userId: String(user.id),
      entityType: 'beneficiary',
      entityId: String(beneficiaryId),
      metadata: { trustLevel: parsed.data.trustLevel }
    }).catch(() => {})

    return NextResponse.json({ beneficiary: updated })
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorized()
    if (err instanceof ForbiddenError) return forbidden()
    console.error('[api/beneficiaries PATCH]', (err as Error).message)
    return serverError()
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const { beneficiaryId: rawId } = await params
    const idParsed = beneficiaryIdSchema.safeParse(rawId)
    if (!idParsed.success) return badRequest('Invalid beneficiary ID.')
    const beneficiaryId = idParsed.data

    const deleted = await deleteBeneficiaryForUser(user.id, beneficiaryId)
    if (!deleted) return notFound('Beneficiary not found.')

    await writeAuditLog({
      action: 'BENEFICIARY_DELETED',
      userId: String(user.id),
      entityType: 'beneficiary',
      entityId: String(beneficiaryId)
    }).catch(() => {})

    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorized()
    if (err instanceof ForbiddenError) return forbidden()
    console.error('[api/beneficiaries DELETE]', (err as Error).message)
    return serverError()
  }
}
