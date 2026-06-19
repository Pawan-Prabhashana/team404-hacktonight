/**
 * GET /api/auth/me
 *
 * Returns the currently authenticated user, or { user: null } if no valid
 * session exists. Always returns HTTP 200 so client code can pattern-match
 * on the `user` field without needing to catch 401 errors.
 */
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'

export async function GET() {
  const user = await getCurrentUser()
  return NextResponse.json({ user })
}
