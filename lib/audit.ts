/**
 * Audit log helper for NOVA Bank.
 *
 * Inserts structured audit entries into the `audit_logs` table using a
 * fully parameterized query.
 *
 * Design decisions:
 *   - If the table does not yet exist (e.g. during local dev with the legacy
 *     schema), the failure is logged server-side but does NOT crash the
 *     calling request. This prevents audit machinery from blocking critical
 *     banking flows during the schema transition period.
 *   - Sensitive field values must NOT be included in `metadata` — only
 *     identifiers, action names, and non-secret context.
 *
 * Usage:
 *   await writeAuditLog({
 *     userId: '00000000-...',
 *     action: 'login.success',
 *     entityType: 'user',
 *     entityId: userId,
 *     metadata: { role: 'customer' },
 *     ipAddress: req.headers.get('x-forwarded-for'),
 *     userAgent: req.headers.get('user-agent'),
 *   })
 */
import { query } from '@/lib/db'

export type AuditInput = {
  userId?: string | null
  action: string
  entityType?: string | null
  entityId?: string | null
  metadata?: Record<string, unknown>
  ipAddress?: string | null
  userAgent?: string | null
}

export async function writeAuditLog(input: AuditInput): Promise<void> {
  const {
    userId = null,
    action,
    entityType = null,
    entityId = null,
    metadata = {},
    ipAddress = null,
    userAgent = null
  } = input

  try {
    await query(
      `INSERT INTO audit_logs
         (user_id, action, entity_type, entity_id, metadata, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId,
        action,
        entityType,
        entityId,
        JSON.stringify(metadata),
        ipAddress,
        userAgent
      ]
    )
  } catch (err) {
    // Log server-side but do not propagate — audit failure must not block banking flows.
    console.error(
      '[audit] Failed to write audit log for action:',
      action,
      (err as Error).message
    )
  }
}
