/**
 * Centralized API response helpers.
 *
 * Rules enforced here:
 *   - Error messages to the client are generic — no stack traces, no env vars,
 *     no database details, no credential strings.
 *   - Log full details server-side via console.error only.
 *   - All helpers return NextResponse-compatible Response objects.
 */
import { NextResponse } from 'next/server'

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init)
}

export function badRequest(message = 'Invalid request.') {
  return NextResponse.json({ error: message }, { status: 400 })
}

export function unauthorized(message = 'Unauthorized.') {
  return NextResponse.json({ error: message }, { status: 401 })
}

export function forbidden(message = 'Forbidden.') {
  return NextResponse.json({ error: message }, { status: 403 })
}

export function notFound(message = 'Not found.') {
  return NextResponse.json({ error: message }, { status: 404 })
}

export function serverError(message = 'Internal server error.') {
  return NextResponse.json({ error: message }, { status: 500 })
}
