import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const logoutMocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getToken: vi.fn(),
  redisSet: vi.fn(),
  createAuditLog: vi.fn(),
  loggerError: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: logoutMocks.auth,
}))

vi.mock('next-auth/jwt', () => ({
  getToken: logoutMocks.getToken,
}))

vi.mock('@/lib/audit', () => ({
  createAuditLog: logoutMocks.createAuditLog,
}))

vi.mock('@/lib/redis', () => ({
  redis: {
    set: logoutMocks.redisSet,
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: logoutMocks.loggerError,
  },
}))

import { POST } from '../route'

describe('/api/auth/logout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    logoutMocks.auth.mockResolvedValue({
      user: {
        id: 'user-1',
        schoolId: 'school-1',
      },
    })
    logoutMocks.getToken.mockResolvedValue({
      jti: 'token-1',
      exp: Math.floor(Date.now() / 1000) + 300,
    })
    logoutMocks.redisSet.mockResolvedValue(undefined)
    logoutMocks.createAuditLog.mockResolvedValue(undefined)
  })

  it('TEST-AUTH-LOGOUT-001: logout with session returns success and writes audit log', async () => {
    const request = new NextRequest('http://localhost/api/auth/logout', { method: 'POST' })
    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual(expect.objectContaining({ success: true }))
    expect(logoutMocks.redisSet).toHaveBeenCalledWith('blacklist:token-1', '1', expect.any(Number))
    expect(logoutMocks.createAuditLog).toHaveBeenCalledWith({
      school_id: 'school-1',
      user_id: 'user-1',
      action: 'LOGOUT',
      entity_type: 'user',
      entity_id: 'user-1',
    })
  })

  it('TEST-AUTH-LOGOUT-002: logout without session still returns success and skips audit log', async () => {
    logoutMocks.auth.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/auth/logout', { method: 'POST' })
    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual(expect.objectContaining({ success: true }))
    expect(logoutMocks.redisSet).toHaveBeenCalledWith('blacklist:token-1', '1', expect.any(Number))
    expect(logoutMocks.createAuditLog).not.toHaveBeenCalled()
  })

  it('TEST-AUTH-LOGOUT-003: audit/logging failure still returns success:true', async () => {
    logoutMocks.createAuditLog.mockRejectedValue(new Error('Audit DB offline'))

    const request = new NextRequest('http://localhost/api/auth/logout', { method: 'POST' })
    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual(expect.objectContaining({ success: true }))
    expect(logoutMocks.loggerError).toHaveBeenCalled()
  })

  it('TEST-AUTH-LOGOUT-004: logout skips blacklist when JWT lookup returns no jti', async () => {
    logoutMocks.getToken.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/auth/logout', { method: 'POST' })
    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual(expect.objectContaining({ success: true }))
    expect(logoutMocks.redisSet).not.toHaveBeenCalled()
  })
})
