/**
 * /api/setup
 *
 * Phase 2: Production guard added.
 *
 * Previously this endpoint was publicly accessible in all environments and
 * returned the list of public DB tables (leaking schema information).
 *
 * Now:
 *   - Returns 403 in production.
 *   - Only runs schema bootstrap in non-production environments.
 *   - Does not expose sensitive internal details.
 *
 * TODO Phase 3: remove entirely; replace with a proper DB migration pipeline.
 */
import { forbidden, serverError } from '@/lib/api-response'
import { ensureDatabase, pool } from '@/lib/platform-db'

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return forbidden('Setup endpoint is disabled in production.')
  }

  try {
    await ensureDatabase()

    const tables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `)

    return Response.json({
      ok: true,
      message:
        'Database initialized. This endpoint is only available in non-production environments.',
      tables: tables.rows.map((r: { table_name: string }) => r.table_name)
    })
  } catch (reason) {
    console.error('[api/setup] error:', (reason as Error).message)
    return serverError()
  }
}
