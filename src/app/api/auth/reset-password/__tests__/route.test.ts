import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const resetMocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  redisGet: vi.fn(),
  redisSet: vi.fn(),
  redisDel: vi.fn(),
  bcryptHash: vi.fn(),
  createAuditLog: vi.fn(),
  loggerError: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: resetMocks.userFindUnique,
      update: resetMocks.userUpdate,
    },
  },
}))

vi.mock('@/lib/redis', () => ({
  redis: {
    get: resetMocks.redisGet,
    set: resetMocks.redisSet,
    del: resetMocks.redisDel,
  },
}))

vi.mock('bcryptjs', () => ({
  default: {
    hash: resetMocks.bcryptHash,
  },
}))

vi.mock('@/lib/audit', () => ({
  createAuditLog: resetMocks.createAuditLog,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: resetMocks.loggerError,
  },
}))

import { POST } from '../route'

describe('/api/auth/reset-password', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetMocks.redisGet.mockResolvedValue('user-1')
    resetMocks.userFindUnique.mockResolvedValue({
      id: 'user-1',
      school_id: 'school-1',
      is_active: true,
    })
    resetMocks.bcryptHash.mockResolvedValue('hashed-password')
    resetMocks.userUpdate.mockResolvedValue(undefined)
    resetMocks.redisDel.mockResolvedValue(undefined)
    resetMocks.redisSet.mockResolvedValue(undefined)
    resetMocks.createAuditLog.mockResolvedValue(undefined)
  })

  it('TEST-AUTH-RP-API-002: rejects passwords shorter than 8 characters', async () => {
    const request = new NextRequest('http://localhost/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: 'reset-token',
        password: 'Ab1!',
      }),
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.any(String),
      })
    )
    expect(payload.error).toContain('8')
  })

  it('TEST-AUTH-RP-API-002: requires uppercase, number, and special character', async () => {
    const cases = [
      {
        password: 'lowercase1!',
        message: 'uppercase',
      },
      {
        password: 'NoNumber!',
        message: 'number',
      },
      {
        password: 'NoSpecial1',
        message: 'special',
      },
    ]

    for (const testCase of cases) {
      const request = new NextRequest('http://localhost/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'reset-token',
          password: testCase.password,
        }),
      })

      const response = await POST(request)
      const payload = await response.json()

      expect(response.status).toBe(400)
      expect(payload.success).toBe(false)
      expect(payload.error.toLowerCase()).toContain(testCase.message)
    }
  })

  it('TEST-AUTH-RP-API-001: returns 400 for invalid or expired token', async () => {
    resetMocks.redisGet.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: 'expired-token',
        password: 'Valid@123',
      }),
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload).toEqual(
      expect.objectContaining({
        success: false,
        error: 'Invalid or expired token',
      })
    )
  })

  it('TEST-AUTH-RP-API-004/005: updates password, invalidates reset token, and records audit log on success', async () => {
    const request = new NextRequest('http://localhost/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: 'valid-token',
        password: 'Valid@123',
      }),
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual(
      expect.objectContaining({
        success: true,
      })
    )

    expect(resetMocks.userUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { password_hash: 'hashed-password' },
    })
    expect(resetMocks.redisDel).toHaveBeenCalledWith('reset_token:valid-token')
    expect(resetMocks.redisSet).toHaveBeenCalledWith(
      'user_pw_reset:user-1',
      expect.any(String)
    )
    expect(resetMocks.createAuditLog).toHaveBeenCalledWith({
      school_id: 'school-1',
      user_id: 'user-1',
      action: 'UPDATE',
      entity_type: 'user',
      entity_id: 'user-1',
      new_value: { action: 'completed_password_reset' },
    })
  })

  it('TEST-AUTH-RP-API-003: returns 400 when token maps to inactive account', async () => {
    resetMocks.userFindUnique.mockResolvedValue({
      id: 'user-1',
      school_id: 'school-1',
      is_active: false,
    })

    const request = new NextRequest('http://localhost/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: 'inactive-user-token',
        password: 'Valid@123',
      }),
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload).toEqual(
      expect.objectContaining({
        success: false,
        error: 'Invalid user account',
      })
    )
  })

  it('TEST-AUTH-RP-API-006: unexpected exception returns 500 with stable error shape', async () => {
    resetMocks.redisGet.mockResolvedValue('user-1')
    resetMocks.userFindUnique.mockResolvedValue({
      id: 'user-1',
      school_id: 'school-1',
      is_active: true,
    })
    resetMocks.bcryptHash.mockRejectedValue(new Error('hash failed'))

    const request = new NextRequest('http://localhost/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: 'token-1',
        password: 'Valid@123',
      }),
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(500)
    expect(payload).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.any(String),
      })
    )
    expect(resetMocks.loggerError).toHaveBeenCalled()
  })
})
