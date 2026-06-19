/**
 * /api/search
 *
 * Phase 4: Search restricted to the authenticated user's own data.
 *
 * Searches only:
 *   - The user's own accounts (by nickname/account_name)
 *   - The user's own beneficiaries (by name)
 *   - The user's own transactions (by description)
 *
 * Never searches across all users. Never returns passwords, PINs, or
 * other users' data. All queries are parameterized.
 */
import { NextResponse } from 'next/server'
import {
  badRequest,
  forbidden,
  serverError,
  unauthorized
} from '@/lib/api-response'
import { ForbiddenError, UnauthorizedError } from '@/lib/auth-errors'
import { query } from '@/lib/db'
import { ensureDatabase } from '@/lib/platform-db'
import { getCurrentUser } from '@/lib/session'
import { getAccountNumbersForUser } from '@/server/repositories/accounts-repository'

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') ?? '').trim()

    if (q.length < 2) {
      return badRequest('Search query must be at least 2 characters.')
    }

    const like = `%${q}%`
    await ensureDatabase()

    const userAccountNumbers = await getAccountNumbersForUser(user.id)

    // Search user's own accounts
    const accountResults = await query(
      `SELECT 'account' AS type, id::text, account_name AS label,
              CASE WHEN nickname IS NOT NULL THEN nickname ELSE account_name END AS detail
       FROM accounts
       WHERE user_id = $1 AND (account_name ILIKE $2 OR nickname ILIKE $2)
       LIMIT 10`,
      [user.id, like]
    )

    // Search user's own beneficiaries
    const beneficiaryResults = await query(
      `SELECT 'beneficiary' AS type, id::text, name AS label, bank_name AS detail
       FROM beneficiaries
       WHERE user_id = $1 AND name ILIKE $2
       LIMIT 10`,
      [user.id, like]
    )

    // Search user's own transactions
    const transactionResults =
      userAccountNumbers.length > 0
        ? await query(
            `SELECT 'transaction' AS type, id::text,
                    from_account || ' → ' || to_account AS label,
                    description AS detail
             FROM transactions
             WHERE (from_account = ANY($1::text[]) OR to_account = ANY($1::text[]))
               AND description ILIKE $2
             LIMIT 10`,
            [userAccountNumbers, like]
          )
        : { rows: [] }

    const results = [
      ...accountResults.rows,
      ...beneficiaryResults.rows,
      ...transactionResults.rows
    ]

    return NextResponse.json({ results, query: q })
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorized()
    if (err instanceof ForbiddenError) return forbidden()
    console.error('[api/search]', (err as Error).message)
    return serverError()
  }
}
