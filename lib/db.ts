import {
  Pool,
  type PoolClient,
  type QueryResult,
  type QueryResultRow
} from 'pg'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  // Warn at startup but do not crash; local dev may configure later
  console.warn('[db] WARNING: DATABASE_URL is not configured.')
}

export const pool = new Pool({
  connectionString,
  // Keep pool small for a challenge/demo build
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000
})

pool.on('error', (err) => {
  // Never log the full connection string; the pool event fires from pg internals
  console.error('[db] Unexpected pool error:', err.message)
})

/**
 * Execute a parameterized query against the shared pool.
 *
 * Always use $1, $2, … placeholders — never interpolate user data into the SQL
 * string directly.
 *
 * @example
 *   await query('SELECT * FROM users WHERE email = $1', [email])
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params)
}

/**
 * Run a callback inside a BEGIN/COMMIT transaction block.
 * Automatically rolls back if the callback throws, then re-throws.
 *
 * @example
 *   await withTransaction(async (client) => {
 *     await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [amount, fromId])
 *     await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [amount, toId])
 *   })
 */
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
