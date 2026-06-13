import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getRedirectPath } from '@/lib/auth-redirect'
import {
  extractSubdomainFromHost,
  sanitizeHost,
} from '@/lib/tenant-hosts'

type MiddlewareToken = {
  role?: string
  schoolId?: string | null
}

export default async function middleware(req: NextRequest) {
  const { nextUrl } = req
  const token = (await getToken({
    req,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  })) as MiddlewareToken | null
  const isLoggedIn = !!token
  const userRole = token?.role
  const requestHost = sanitizeHost(
    req.headers.get('x-forwarded-host') || req.headers.get('host')
  )
  const requestSubdomain = extractSubdomainFromHost(requestHost)
  const canonicalHost = requestHost || sanitizeHost(nextUrl.host)

  const applySecurityHeaders = (response: NextResponse) => {
    const responseWithOptionalHeaders = response as NextResponse & { headers?: Headers }
    const responseHeaders = responseWithOptionalHeaders.headers ?? new Headers()

    let allowedOrigin = nextUrl.origin
    const originHeader = req.headers.get('origin')

    if (originHeader) {
      try {
        const origin = new URL(originHeader)
        const originHost = sanitizeHost(origin.host)
        if (originHost && originHost === canonicalHost) {
          allowedOrigin = origin.origin
        }
      } catch {}
    }

    responseHeaders.set('X-Content-Type-Options', 'nosniff')
    responseHeaders.set('X-Frame-Options', 'DENY')
    responseHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    responseHeaders.set('Access-Control-Allow-Origin', allowedOrigin)
    responseHeaders.set('Vary', 'Origin')
    if (!responseWithOptionalHeaders.headers) {
      responseWithOptionalHeaders.headers = responseHeaders
    }

    return response
  }

  const isApiAuthRoute = nextUrl.pathname.startsWith('/api/auth')
  const isApiRoute = nextUrl.pathname.startsWith('/api/')
  const isPublicApiRoute =
    nextUrl.pathname.startsWith('/api/public/') ||
    nextUrl.pathname === '/api/public/info' ||
    nextUrl.pathname === '/api/onboarding/register'
  const isPublicRoute = [
    '/login',
    '/forgot-password',
    '/reset-password',
    '/',
    '/about',
    '/academics',
    '/admissions',
    '/gallery',
    '/contact',
    '/alumni',
    '/onboarding',
    '/icon',
    '/apple-icon',
  ].includes(nextUrl.pathname)
  const isAuthRoute = ['/login', '/forgot-password', '/reset-password'].includes(nextUrl.pathname)

  if (isApiAuthRoute || isPublicApiRoute || isApiRoute) {
    return applySecurityHeaders(NextResponse.next())
  }

  const rewriteWithTenantHeaders = async () => {
    const requestHeaders = new Headers(req.headers)
    if (requestSubdomain) {
      requestHeaders.set('x-school-slug', requestSubdomain)
    }
    if (requestHost) {
      requestHeaders.set('x-tenant-host', requestHost)
    }

    return applySecurityHeaders(NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    }))
  }

  if (isAuthRoute) {
    if (isLoggedIn && userRole) {
      return applySecurityHeaders(NextResponse.redirect(new URL(getRedirectPath(userRole), nextUrl)))
    }
    return rewriteWithTenantHeaders()
  }

  if (!isLoggedIn && !isPublicRoute) {
    let callbackUrl = nextUrl.pathname
    if (nextUrl.search) {
      callbackUrl += nextUrl.search
    }
    const encodedCallbackUrl = encodeURIComponent(callbackUrl)
    return applySecurityHeaders(
      NextResponse.redirect(new URL(`/login?callbackUrl=${encodedCallbackUrl}`, nextUrl))
    )
  }

  if (isLoggedIn && userRole) {
    if (userRole === 'SUPER_ADMIN' && nextUrl.pathname.startsWith('/admin')) {
      return applySecurityHeaders(NextResponse.redirect(new URL('/super-admin/dashboard', nextUrl)))
    }

    if (nextUrl.pathname.startsWith('/super-admin') && userRole !== 'SUPER_ADMIN') {
      return applySecurityHeaders(NextResponse.redirect(new URL(getRedirectPath(userRole), nextUrl)))
    }

    const isAdminRoute = nextUrl.pathname.startsWith('/admin')
    const isPortalRoute = nextUrl.pathname.startsWith('/dashboard')
    const isAdminRole = ['SUPER_ADMIN', 'PRINCIPAL', 'STAFF_ADMIN', 'STUDENT_ADMIN', 'ACCOUNTANT', 'TEACHER'].includes(userRole)
    const isPortalRole = ['STUDENT', 'PARENT'].includes(userRole)

    if (isAdminRoute && !isAdminRole) {
      return applySecurityHeaders(NextResponse.redirect(new URL(getRedirectPath(userRole), nextUrl)))
    }

    if (isPortalRoute && !isPortalRole && !isAdminRole) {
      return applySecurityHeaders(NextResponse.redirect(new URL(getRedirectPath(userRole), nextUrl)))
    }

    // specific permissions for /admin/permissions
    if (
      nextUrl.pathname.startsWith('/admin/permissions') &&
      userRole !== 'PRINCIPAL' &&
      userRole !== 'SUPER_ADMIN'
    ) {
      return applySecurityHeaders(NextResponse.redirect(new URL('/portal/forbidden', nextUrl)))
    }
  }

  return rewriteWithTenantHeaders()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|logo.png|images/|api/webhook/).*)'],
}
