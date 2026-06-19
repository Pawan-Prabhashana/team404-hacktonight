/**
 * /api/health
 *
 * Phase 2: process.env no longer returned in the response.
 */
import { serverError } from '@/lib/api-response'
import { ensureDatabase, pool } from '@/lib/platform-db'

export async function GET() {
  try {
    await ensureDatabase()
    const result = await pool.query(
      'SELECT NOW() AS now, current_database() AS database'
    )

    return Response.json({
      ok: true,
      service: 'bank-api',
      status: 'healthy',
      timestamp: result.rows[0]?.now
    })
  } catch (reason) {
    console.error('[api/health] error:', (reason as Error).message)
    return serverError('Service unavailable.')
  }
}
