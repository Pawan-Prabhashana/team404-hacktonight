/**
 * POST /api/auth/logout
 *
 * Revokes the current session in the database and clears the nova_session
 * cookie. Safe to call even when no session is active.
 */
import { NextResponse } from 'next/server'
import { revokeCurrentSession, SESSION_COOKIE_NAME } from '@/lib/session'

export async function POST() {
  await revokeCurrentSession()

  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  })

  return response
}
