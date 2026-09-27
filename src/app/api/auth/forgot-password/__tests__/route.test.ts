import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const forgotApiMocks = vi.hoisted(() => ({
  userFindFirst: vi.fn(),
  redisGet: vi.fn(),
  redisSet: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  createAuditLog: vi.fn(),
  loggerWarn: vi.fn(),
  loggerError: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findFirst: forgotApiMocks.userFindFirst,
    },
  },
}))

vi.mock('@/lib/redis', () => ({
  redis: {
    get: forgotApiMocks.redisGet,
    set: forgotApiMocks.redisSet,
  },
}))

vi.mock('@/lib/email', () => ({
  sendPasswordResetEmail: forgotApiMocks.sendPasswordResetEmail,
}))

vi.mock('@/lib/audit', () => ({
  createAuditLog: forgotApiMocks.createAuditLog,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    warn: forgotApiMocks.loggerWarn,
    error: forgotApiMocks.loggerError,
  },
}))

import { POST } from '../route'

function buildRequest(email: unknown) {
  return new NextRequest('http://localhost/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
}

describe('/api/auth/forgot-password', () => {
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_APP_URL = 'https://school.vbhs.app'

    forgotApiMocks.redisGet.mockResolvedValue(null)
    forgotApiMocks.redisSet.mockResolvedValue(undefined)
    forgotApiMocks.userFindFirst.mockResolvedValue({
      id: 'user-1',
      email: 'parent@vbhs.com',
      school_id: 'school-1',
      is_active: true,
    })
    forgotApiMocks.sendPasswordResetEmail.mockResolvedValue(true)
    forgotApiMocks.createAuditLog.mockResolvedValue(undefined)
  })

  afterAll(() => {
    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl
  })

  it('TEST-AUTH-FP-API-001: active user creates reset token, sends email, and writes audit log', async () => {
    const response = await POST(buildRequest('parent@vbhs.com'))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual(expect.objectContaining({ success: true }))

    expect(forgotApiMocks.redisSet).toHaveBeenCalledWith('rl:forgot-pw:parent@vbhs.com', '1', 3600)

    const resetTokenCall = forgotApiMocks.redisSet.mock.calls.find(([key]) =>
      String(key).startsWith('reset_token:')
    )
    expect(resetTokenCall).toBeTruthy()
    expect(resetTokenCall?.[2]).toBe(3600)

    expect(forgotApiMocks.sendPasswordResetEmail).toHaveBeenCalledWith(
      'parent@vbhs.com',
      expect.stringMatching(/^https:\/\/school\.vbhs\.app\/reset-password\?token=/)
    )
    expect(forgotApiMocks.createAuditLog).toHaveBeenCalledWith({
      school_id: 'school-1',
      user_id: 'user-1',
      action: 'UPDATE',
      entity_type: 'user',
      entity_id: 'user-1',
      new_value: { action: 'requested_password_reset' },
    })
  })

  it('TEST-AUTH-FP-API-002: unknown email returns success without enumeration or email send', async () => {
    forgotApiMocks.userFindFirst.mockResolvedValue(null)

    const response = await POST(buildRequest('unknown@vbhs.com'))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual(expect.objectContaining({ success: true }))
    expect(forgotApiMocks.sendPasswordResetEmail).not.toHaveBeenCalled()
    expect(forgotApiMocks.createAuditLog).not.toHaveBeenCalled()
  })

  it('TEST-AUTH-FP-API-003: inactive user returns success without reset token or audit log', async () => {
    forgotApiMocks.userFindFirst.mockResolvedValue({
      id: 'user-2',
      email: 'inactive@vbhs.com',
      school_id: 'school-1',
      is_active: false,
    })

    const response = await POST(buildRequest('inactive@vbhs.com'))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual(expect.objectContaining({ success: true }))

    const resetTokenCall = forgotApiMocks.redisSet.mock.calls.find(([key]) =>
      String(key).startsWith('reset_token:')
    )
    expect(resetTokenCall).toBeUndefined()
    expect(forgotApiMocks.createAuditLog).not.toHaveBeenCalled()
  })

  it('TEST-AUTH-FP-API-004: rate-limited requests return success and skip downstream work', async () => {
    forgotApiMocks.redisGet.mockResolvedValue('3')

    const response = await POST(buildRequest('parent@vbhs.com'))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual(expect.objectContaining({ success: true }))
    expect(forgotApiMocks.loggerWarn).toHaveBeenCalled()
    expect(forgotApiMocks.userFindFirst).not.toHaveBeenCalled()
    expect(forgotApiMocks.sendPasswordResetEmail).not.toHaveBeenCalled()
  })

  it('TEST-AUTH-FP-API-005: invalid payload still returns success for anti-enumeration', async () => {
    const response = await POST(buildRequest('not-an-email'))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual(expect.objectContaining({ success: true }))
    expect(forgotApiMocks.loggerError).toHaveBeenCalled()
  })

  it('TEST-AUTH-FP-API-006: reset URL falls back to localhost when NEXT_PUBLIC_APP_URL is missing', async () => {
    process.env.NEXT_PUBLIC_APP_URL = ''

    const response = await POST(buildRequest('parent@vbhs.com'))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual(expect.objectContaining({ success: true }))
    expect(forgotApiMocks.sendPasswordResetEmail).toHaveBeenCalledWith(
      'parent@vbhs.com',
      expect.stringMatching(/^http:\/\/localhost:3000\/reset-password\?token=/)
    )
  })

  it('TEST-AUTH-FP-API-007: internal exceptions still return success and log error', async () => {
    forgotApiMocks.redisGet.mockRejectedValue(new Error('Redis unavailable'))

    const response = await POST(buildRequest('parent@vbhs.com'))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual(expect.objectContaining({ success: true }))
    expect(forgotApiMocks.loggerError).toHaveBeenCalled()
  })
})
