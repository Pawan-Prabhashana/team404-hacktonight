/**
 * Next.js Edge Middleware — route protection for Serandib Bank.
 *
 * This middleware runs on the Edge runtime and therefore CANNOT use the pg
 * database client. It performs a lightweight cookie-presence check only.
 * Actual cryptographic session validation happens inside server-side Route
 * Handlers and Server Components via lib/session.ts.
 *
 * Protection rules:
 *   - Unauthenticated visitors to banking pages → redirect to /login?next=<path>
 *   - Authenticated visitors to /login|/sign-up|/reset-password → redirect to /dashboard
 *   - /admin paths require a session cookie; role check is enforced by the API
 *     route handler (lib/session.ts requireAdmin()).
 *
 * IMPORTANT: middleware alone is NOT the security boundary. Always validate
 * sessions server-side in Route Handlers for any sensitive operation.
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

// Keep in sync with SESSION_COOKIE_NAME in lib/session.ts
const SESSION_COOKIE_NAME = 'serandib_session'

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/bank-accounts',
  '/bank-transfer',
  '/pay-bills',
  '/smart-spend',
  '/e-statement',
  '/security',
  '/admin'
]

const AUTH_EXACT_PATHS = new Set(['/login', '/sign-up', '/reset-password'])

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value
  const isAuthenticated = Boolean(sessionCookie)

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )

  // Unauthenticated user visiting a protected page → redirect to login
  if (isProtected && !isAuthenticated) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Authenticated user visiting an auth page → redirect to dashboard
  if (AUTH_EXACT_PATHS.has(pathname) && isAuthenticated) {
    const dashUrl = request.nextUrl.clone()
    dashUrl.pathname = '/dashboard'
    dashUrl.searchParams.delete('next')
    return NextResponse.redirect(dashUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/bank-accounts/:path*',
    '/bank-transfer/:path*',
    '/pay-bills/:path*',
    '/smart-spend/:path*',
    '/e-statement/:path*',
    '/security/:path*',
    '/admin/:path*',
    '/login',
    '/sign-up',
    '/reset-password'
  ]
}
