import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getRedirectPath } from '../auth-redirect'

const authMocks = vi.hoisted(() => ({
  config: null as any,
  handlersGet: vi.fn(),
  handlersPost: vi.fn(),
  exportedSignIn: vi.fn(),
  exportedSignOut: vi.fn(),
  exportedAuth: vi.fn(),
  userFindFirst: vi.fn(),
  userUpdate: vi.fn(),
  redisGet: vi.fn(),
  redisSet: vi.fn(),
  redisDel: vi.fn(),
  redisExists: vi.fn(),
  bcryptCompare: vi.fn(),
  createAuditLog: vi.fn(),
  loggerError: vi.fn(),
}))

vi.mock('next-auth', () => ({
  default: (config: any) => {
    authMocks.config = config
    return {
      handlers: {
        GET: authMocks.handlersGet,
        POST: authMocks.handlersPost,
      },
      signIn: authMocks.exportedSignIn,
      signOut: authMocks.exportedSignOut,
      auth: authMocks.exportedAuth,
    }
  },
}))

vi.mock('next-auth/providers/credentials', () => ({
  default: (config: any) => ({
    id: 'credentials',
    type: 'credentials',
    ...config,
  }),
}))

vi.mock('../prisma', () => ({
  prisma: {
    user: {
      findFirst: authMocks.userFindFirst,
      update: authMocks.userUpdate,
    },
  },
}))

vi.mock('../redis', () => ({
  redis: {
    get: authMocks.redisGet,
    set: authMocks.redisSet,
    del: authMocks.redisDel,
    exists: authMocks.redisExists,
  },
}))

vi.mock('bcryptjs', () => ({
  default: {
    compare: authMocks.bcryptCompare,
  },
}))

vi.mock('../audit', () => ({
  createAuditLog: authMocks.createAuditLog,
}))

vi.mock('../logger', () => ({
  logger: {
    error: authMocks.loggerError,
  },
}))

import '../auth'

function getConfig() {
  if (!authMocks.config) {
    throw new Error('Auth config not initialized')
  }
  return authMocks.config
}

function getAuthorize() {
  return getConfig().providers[0].authorize as (credentials: unknown) => Promise<any>
}

function getJwtCallback() {
  return getConfig().callbacks.jwt as (params: unknown) => Promise<any>
}

function getSessionCallback() {
  return getConfig().callbacks.session as (params: unknown) => Promise<any>
}

function getSignInCallback() {
  return getConfig().callbacks.signIn as (params: unknown) => Promise<boolean>
}

describe('auth module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMocks.redisGet.mockResolvedValue(null)
    authMocks.redisExists.mockResolvedValue(false)
    authMocks.userUpdate.mockResolvedValue(undefined)
    authMocks.bcryptCompare.mockResolvedValue(true)
    authMocks.createAuditLog.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('TEST-AUTH-001: allows valid credentials for all 8 roles and maps JWT/session fields', async () => {
    const authorize = getAuthorize()
    const jwt = getJwtCallback()
    const session = getSessionCallback()

    const roles = [
      'SUPER_ADMIN',
      'PRINCIPAL',
      'STAFF_ADMIN',
      'STUDENT_ADMIN',
      'ACCOUNTANT',
      'TEACHER',
      'STUDENT',
      'PARENT',
    ] as const

    for (const role of roles) {
      authMocks.userFindFirst.mockResolvedValueOnce({
        id: `user-${role.toLowerCase()}`,
        email: `${role.toLowerCase()}@vbhs.com`,
        role,
        school_id: role === 'SUPER_ADMIN' ? null : 'school-1',
        password_hash: 'hash',
        is_active: true,
        failed_login_count: 0,
        locked_until: null,
      })

      const result = await authorize({
        email: `${role.toLowerCase()}@vbhs.com`,
        password: 'Test@1234',
      })

      expect(result.role).toBe(role)
      expect(result.schoolId).toBe(role === 'SUPER_ADMIN' ? null : 'school-1')

      const token = await jwt({
        token: {},
        user: result,
        account: { provider: 'credentials' },
      } as any)

      expect(token).toEqual(
        expect.objectContaining({
          id: result.id,
          role,
          schoolId: result.schoolId,
        })
      )

      const sessionResult = await session({
        session: {
          user: {
            email: result.email,
          },
          expires: '2099-01-01T00:00:00.000Z',
        },
        token,
      } as any)

      expect((sessionResult.user as any).role).toBe(role)
      expect((sessionResult.user as any).schoolId).toBe(result.schoolId)
    }
  })

  it('TEST-AUTH-002: rejects invalid credentials', async () => {
    const authorize = getAuthorize()

    authMocks.userFindFirst.mockResolvedValue({
      id: 'user-1',
      email: 'teacher@vbhs.com',
      role: 'TEACHER',
      school_id: 'school-1',
      password_hash: 'hash',
      is_active: true,
      failed_login_count: 0,
      locked_until: null,
    })
    authMocks.bcryptCompare.mockResolvedValue(false)

    const result = await authorize({
      email: 'teacher@vbhs.com',
      password: 'Wrong@123',
    })

    expect(result).toBeNull()
  })

  it('TEST-AUTH-003: blocks inactive accounts', async () => {
    const authorize = getAuthorize()

    authMocks.userFindFirst.mockResolvedValue({
      id: 'user-1',
      email: 'teacher@vbhs.com',
      role: 'TEACHER',
      school_id: 'school-1',
      password_hash: 'hash',
      is_active: false,
      failed_login_count: 0,
      locked_until: null,
    })

    await expect(
      authorize({
        email: 'teacher@vbhs.com',
        password: 'Test@1234',
      })
    ).rejects.toThrow('Your account has been deactivated. Contact your administrator')
  })

  it('TEST-AUTH-004: locks account after 5 failed attempts and persists lock details', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-26T09:00:00.000Z'))

    const authorize = getAuthorize()
    const now = Date.now()

    authMocks.userFindFirst.mockResolvedValue({
      id: 'user-1',
      email: 'teacher@vbhs.com',
      role: 'TEACHER',
      school_id: 'school-1',
      password_hash: 'hash',
      is_active: true,
      failed_login_count: 4,
      locked_until: null,
    })
    authMocks.bcryptCompare.mockResolvedValue(false)

    await expect(
      authorize({
        email: 'teacher@vbhs.com',
        password: 'Wrong@123',
      })
    ).rejects.toThrow('Account locked due to too many failed attempts. Try again in 15 minutes')

    expect(authMocks.redisSet).toHaveBeenCalledTimes(1)
    const [lockoutKey, redisPayload, ttl] = authMocks.redisSet.mock.calls[0]
    const parsed = JSON.parse(redisPayload)

    expect(lockoutKey).toBe('lockout:teacher@vbhs.com')
    expect(parsed.count).toBe(5)
    expect(parsed.locked_until).toBe(now + 15 * 60 * 1000)
    expect(ttl).toBe(15 * 60)

    expect(authMocks.userUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: expect.objectContaining({
        failed_login_count: 5,
        locked_until: expect.any(Date),
      }),
    })
  })

  it('TEST-AUTH-005: blocks login attempts while lockout is active', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-26T09:10:00.000Z'))

    const authorize = getAuthorize()

    authMocks.redisGet.mockResolvedValue(
      JSON.stringify({
        count: 5,
        locked_until: Date.now() + 5 * 60 * 1000,
      })
    )

    await expect(
      authorize({
        email: 'teacher@vbhs.com',
        password: 'Test@1234',
      })
    ).rejects.toThrow('Account locked. Try again in 5 minutes')
  })

  it('TEST-AUTH-006: allows login after lockout expiry and resets lock counters', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-26T09:30:00.000Z'))

    const authorize = getAuthorize()

    authMocks.redisGet.mockResolvedValue(
      JSON.stringify({
        count: 5,
        locked_until: Date.now() - 1,
      })
    )

    authMocks.userFindFirst.mockResolvedValue({
      id: 'user-1',
      email: 'teacher@vbhs.com',
      role: 'TEACHER',
      school_id: 'school-1',
      password_hash: 'hash',
      is_active: true,
      failed_login_count: 5,
      locked_until: new Date(Date.now() - 1),
    })

    const result = await authorize({
      email: 'teacher@vbhs.com',
      password: 'Test@1234',
    })

    expect(result.id).toBe('user-1')
    expect(authMocks.redisDel).toHaveBeenCalledWith('lockout:teacher@vbhs.com')
    expect(authMocks.userUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: expect.objectContaining({
        failed_login_count: 0,
        locked_until: null,
        last_login: expect.any(Date),
      }),
    })
  })

  it('TEST-AUTH-008: rejects missing credentials', async () => {
    const authorize = getAuthorize()

    await expect(authorize({ email: '', password: 'Test@1234' })).rejects.toThrow(
      'Missing credentials'
    )
    await expect(authorize({ email: 'teacher@vbhs.com', password: '' })).rejects.toThrow(
      'Missing credentials'
    )
  })

  it('TEST-AUTH-009: configures session maxAge as 15 minutes', () => {
    const config = getConfig()
    expect(config.session.strategy).toBe('jwt')
    expect(config.session.maxAge).toBe(15 * 60)
  })

  it('TEST-AUTH-010: returns expected redirect by role', () => {
    expect(getRedirectPath('STUDENT')).toBe('/dashboard')
    expect(getRedirectPath('PARENT')).toBe('/dashboard')
    expect(getRedirectPath('PRINCIPAL')).toBe('/admin/dashboard')
    expect(getRedirectPath('STAFF_ADMIN')).toBe('/admin/dashboard')
    expect(getRedirectPath('STUDENT_ADMIN')).toBe('/admin/dashboard')
    expect(getRedirectPath('ACCOUNTANT')).toBe('/admin/dashboard')
    expect(getRedirectPath('TEACHER')).toBe('/admin/dashboard')
    expect(getRedirectPath('SUPER_ADMIN')).toBe('/super-admin/dashboard')
  })

  it('TEST-AUTH-011: invalidates JWT when token jti is blacklisted', async () => {
    const jwt = getJwtCallback()
    authMocks.redisExists.mockResolvedValue(true)

    const result = await jwt({
      token: {
        jti: 'token-1',
      },
    } as any)

    expect(result).toEqual({})
  })

  it('TEST-AUTH-012: invalidates JWT issued before password reset timestamp', async () => {
    const jwt = getJwtCallback()
    authMocks.redisGet.mockImplementation(async (key: string) => {
      if (key === 'user_pw_reset:user-1') {
        return '200000'
      }
      return null
    })

    const result = await jwt({
      token: {
        id: 'user-1',
        iat: 100,
      },
    } as any)

    expect(result).toEqual({})
  })

  it('TEST-AUTH-013: expires session at epoch when token is empty', async () => {
    const session = getSessionCallback()

    const result = await session({
      session: {
        user: {
          email: 'teacher@vbhs.com',
        },
        expires: '2099-01-01T00:00:00.000Z',
      },
      token: {},
    } as any)

    expect(result.expires).toBe('1970-01-01T00:00:00.000Z')
  })

  it('TEST-AUTH-014: creates LOGIN audit log from signIn callback', async () => {
    const signIn = getSignInCallback()

    const ok = await signIn({
      user: {
        id: 'user-1',
        schoolId: 'school-1',
      },
      account: {
        provider: 'credentials',
      },
    } as any)

    expect(ok).toBe(true)
    expect(authMocks.createAuditLog).toHaveBeenCalledWith({
      school_id: 'school-1',
      user_id: 'user-1',
      action: 'LOGIN',
      entity_type: 'user',
      entity_id: 'user-1',
    })
  })

  it('TEST-AUTH-015: successful login clears lockout key and resets failed count', async () => {
    const authorize = getAuthorize()

    authMocks.userFindFirst.mockResolvedValue({
      id: 'user-2',
      email: 'student@vbhs.com',
      role: 'STUDENT',
      school_id: 'school-1',
      password_hash: 'hash',
      is_active: true,
      failed_login_count: 2,
      locked_until: null,
    })

    const result = await authorize({
      email: 'student@vbhs.com',
      password: 'Test@1234',
    })

    expect(result).toEqual(
      expect.objectContaining({
        id: 'user-2',
        role: 'STUDENT',
      })
    )
    expect(authMocks.redisDel).toHaveBeenCalledWith('lockout:student@vbhs.com')
    expect(authMocks.userUpdate).toHaveBeenCalledWith({
      where: { id: 'user-2' },
      data: expect.objectContaining({
        failed_login_count: 0,
        locked_until: null,
        last_login: expect.any(Date),
      }),
    })
  })
})
