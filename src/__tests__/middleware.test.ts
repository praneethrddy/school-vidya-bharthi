import { beforeEach, describe, expect, it, vi } from 'vitest'

type MockSession = {
  role: string
  schoolId: string | null
}

type MockRequest = {
  nextUrl: URL
  headers: Headers
  mockToken: MockSession | null
}

const middlewareMocks = vi.hoisted(() => ({
  getToken: vi.fn(async ({ req }: { req: MockRequest }) => req.mockToken),
  next: vi.fn((init?: unknown) => ({ type: 'next', init })),
  redirect: vi.fn((url: URL) => ({ type: 'redirect', url: url.toString() })),
}))

vi.mock('next-auth/jwt', () => ({
  getToken: middlewareMocks.getToken,
}))

vi.mock('next/server', () => ({
  NextResponse: {
    next: middlewareMocks.next,
    redirect: middlewareMocks.redirect,
  },
}))

import middleware, { config } from '@/middleware'

function createRequest(
  path: string,
  options?: {
    host?: string
    role?: string
    schoolId?: string | null
  }
): MockRequest {
  const host = options?.host || 'vbhs.schoolos.in'
  const nextUrl = new URL(path, `https://${host}`)

  return {
    nextUrl,
    headers: new Headers({
      host,
    }),
    mockToken: options?.role
      ? {
          role: options.role,
          schoolId: options.schoolId ?? 'school-1',
        }
      : null,
  }
}

function getRewrittenHeaders() {
  const lastCall = middlewareMocks.next.mock.calls.at(-1)
  const init = (lastCall?.[0] as { request?: { headers?: Headers } } | undefined) ?? {}
  return init.request?.headers
}

describe('middleware multi-tenancy and auth behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('TEST-MW-001: injects x-school-slug for subdomain hosts', async () => {
    await middleware(createRequest('/about', { host: 'vbhs.schoolos.in' }) as never)

    const headers = getRewrittenHeaders()
    expect(headers?.get('x-school-slug')).toBe('vbhs')
    expect(headers?.get('x-tenant-host')).toBe('vbhs.schoolos.in')
  })

  it('TEST-MW-002: invalid subdomain host is passed downstream (no middleware rejection)', async () => {
    await middleware(createRequest('/about', { host: 'unknown.schoolos.in' }) as never)

    expect(middlewareMocks.redirect).not.toHaveBeenCalled()
    const headers = getRewrittenHeaders()
    expect(headers?.get('x-school-slug')).toBe('unknown')
    expect(headers?.get('x-tenant-host')).toBe('unknown.schoolos.in')
  })

  it('TEST-MW-003: injects x-tenant-host on rewritten requests', async () => {
    await middleware(createRequest('/admin/fees', { role: 'TEACHER', host: 'VBHS.schoolos.in:3000' }) as never)

    const headers = getRewrittenHeaders()
    expect(headers?.get('x-tenant-host')).toBe('vbhs.schoolos.in')
  })

  it('TEST-MW-004: SUPER_ADMIN with school_id = NULL bypasses school scoping in middleware', async () => {
    const response = await middleware(
      createRequest('/dashboard', { role: 'SUPER_ADMIN', schoolId: null }) as never
    )

    expect(response).toEqual(expect.objectContaining({ type: 'next' }))
    expect(middlewareMocks.redirect).not.toHaveBeenCalled()
  })

  it('TEST-MW-005: unauthenticated /admin/* redirects to login with callbackUrl', async () => {
    await middleware(createRequest('/admin/students') as never)

    expect(middlewareMocks.redirect).toHaveBeenCalledWith(
      expect.objectContaining({
        href: 'https://vbhs.schoolos.in/login?callbackUrl=%2Fadmin%2Fstudents',
      })
    )
  })

  it('TEST-MW-006: unauthenticated /dashboard/* redirects to login with callbackUrl', async () => {
    await middleware(createRequest('/dashboard/attendance') as never)

    expect(middlewareMocks.redirect).toHaveBeenCalledWith(
      expect.objectContaining({
        href: 'https://vbhs.schoolos.in/login?callbackUrl=%2Fdashboard%2Fattendance',
      })
    )
  })

  it('TEST-MW-007: callbackUrl preserves query string for redirected unauthenticated requests', async () => {
    await middleware(createRequest('/dashboard?tab=fees&year=2026') as never)

    expect(middlewareMocks.redirect).toHaveBeenCalledWith(
      expect.objectContaining({
        href: 'https://vbhs.schoolos.in/login?callbackUrl=%2Fdashboard%3Ftab%3Dfees%26year%3D2026',
      })
    )
  })

  it('TEST-MW-008: STUDENT accessing /admin/* redirects to /dashboard', async () => {
    await middleware(createRequest('/admin/dashboard', { role: 'STUDENT' }) as never)

    expect(middlewareMocks.redirect).toHaveBeenCalledWith(
      expect.objectContaining({
        href: 'https://vbhs.schoolos.in/dashboard',
      })
    )
  })

  it('TEST-MW-009: TEACHER accessing /admin/fees is allowed (permission checked downstream)', async () => {
    const response = await middleware(createRequest('/admin/fees', { role: 'TEACHER' }) as never)

    expect(response).toEqual(expect.objectContaining({ type: 'next' }))
    expect(middlewareMocks.redirect).not.toHaveBeenCalled()
  })

  it.each(['/', '/about', '/academics', '/admissions', '/gallery', '/contact', '/alumni'])(
    'TEST-MW-010: public route %s does not require auth',
    async (path) => {
      const response = await middleware(createRequest(path) as never)

      expect(response).toEqual(expect.objectContaining({ type: 'next' }))
      expect(middlewareMocks.redirect).not.toHaveBeenCalled()
    }
  )

  it('TEST-MW-011: /api/auth/* always passes through middleware', async () => {
    await middleware(createRequest('/api/auth/session') as never)

    expect(middlewareMocks.next).toHaveBeenCalledWith()
    expect(middlewareMocks.redirect).not.toHaveBeenCalled()
  })

  it.each(['/api/public/gallery', '/api/onboarding/register'])(
    'TEST-MW-012: public API route %s passes through middleware',
    async (path) => {
      await middleware(createRequest(path) as never)

      expect(middlewareMocks.next).toHaveBeenCalledWith()
      expect(middlewareMocks.redirect).not.toHaveBeenCalled()
    }
  )

  it('TEST-MW-013: unauthenticated API route is passed to route-level auth (no login redirect)', async () => {
    await middleware(createRequest('/api/grades') as never)

    expect(middlewareMocks.redirect).not.toHaveBeenCalled()
    expect(middlewareMocks.next).toHaveBeenCalledWith()
  })

  it('TEST-MW-014: logged-in user visiting /login is redirected to role home', async () => {
    await middleware(createRequest('/login', { role: 'PARENT' }) as never)

    expect(middlewareMocks.redirect).toHaveBeenCalledWith(
      expect.objectContaining({
        href: 'https://vbhs.schoolos.in/dashboard',
      })
    )
  })

  it('TEST-MW-015: SUPER_ADMIN accessing /admin/* is redirected to /super-admin/dashboard', async () => {
    await middleware(createRequest('/admin/settings', { role: 'SUPER_ADMIN', schoolId: null }) as never)

    expect(middlewareMocks.redirect).toHaveBeenCalledWith(
      expect.objectContaining({
        href: 'https://vbhs.schoolos.in/super-admin/dashboard',
      })
    )
  })

  it('TEST-MW-016: non-SUPER_ADMIN user accessing /super-admin/* redirects to role home', async () => {
    await middleware(createRequest('/super-admin/schools', { role: 'PRINCIPAL' }) as never)

    expect(middlewareMocks.redirect).toHaveBeenCalledWith(
      expect.objectContaining({
        href: 'https://vbhs.schoolos.in/admin/dashboard',
      })
    )
  })

  it('TEST-MW-017: /admin/permissions only allows PRINCIPAL or SUPER_ADMIN', async () => {
    await middleware(createRequest('/admin/permissions', { role: 'TEACHER' }) as never)
    expect(middlewareMocks.redirect).toHaveBeenCalledWith(
      expect.objectContaining({
        href: 'https://vbhs.schoolos.in/portal/forbidden',
      })
    )

    vi.clearAllMocks()

    const principalResponse = await middleware(
      createRequest('/admin/permissions', { role: 'PRINCIPAL' }) as never
    )
    expect(principalResponse).toEqual(expect.objectContaining({ type: 'next' }))
    expect(middlewareMocks.redirect).not.toHaveBeenCalled()
  })

  it('TEST-MW-018: matcher excludes static assets and known public files', () => {
    expect(config.matcher).toEqual([
      '/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|logo.png|images/|api/webhook/).*)',
    ])
  })
})
