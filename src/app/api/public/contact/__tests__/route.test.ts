import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  getPublicContactRecipient: vi.fn(),
  createPublicAuditEntry: vi.fn(),
  sendPublicContactEmail: vi.fn(),
  checkRateLimit: vi.fn(),
  getRateLimitHeaders: vi.fn(),
}))

vi.mock('@/lib/api-helpers', () => ({
  errorResponse: (code: string, message: string, status = 400) =>
    Response.json({ success: false, error: { code, message } }, { status }),
  successResponse: (data: unknown) => Response.json({ success: true, data }),
}))

vi.mock('@/lib/public-site', () => ({
  getPublicContactRecipient: mocks.getPublicContactRecipient,
  createPublicAuditEntry: mocks.createPublicAuditEntry,
}))

vi.mock('@/lib/email', () => ({
  sendPublicContactEmail: mocks.sendPublicContactEmail,
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: mocks.checkRateLimit,
  getRateLimitHeaders: mocks.getRateLimitHeaders,
}))

import { POST } from '../route'

const validPayload = {
  name: 'Aarav',
  email: 'aarav@example.com',
  phone: '9876543210',
  subject: 'Admission enquiry',
  message: 'I would like to know more about the admission process.',
  company: '',
}

describe('/api/public/contact', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getPublicContactRecipient.mockResolvedValue({
      school: {
        id: 'school-1',
        name: 'Vidhya Bharthi High School',
        email: 'info@school.test',
      },
      email: 'info@school.test',
    })
    mocks.getRateLimitHeaders.mockImplementation((remaining: number, retryAfter?: number) => {
      const headers: Record<string, string> = {
        'X-RateLimit-Remaining': String(remaining),
      }
      if (retryAfter) {
        headers['Retry-After'] = String(retryAfter)
      }
      return headers
    })
  })

  it('TEST-PUB-006: submits a valid enquiry, rate-limits by IP, and writes audit log', async () => {
    mocks.checkRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 4,
    })
    mocks.sendPublicContactEmail.mockResolvedValue(true)

    const request = new NextRequest('http://localhost/api/public/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '127.0.0.1',
      },
      body: JSON.stringify(validPayload),
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({
      success: true,
      data: {
        delivered: true,
      },
    })
    expect(mocks.checkRateLimit).toHaveBeenCalledWith(
      'public-contact:school-1:127.0.0.1',
      'contact'
    )
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('4')
    expect(mocks.sendPublicContactEmail).toHaveBeenCalled()
    expect(mocks.createPublicAuditEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        schoolId: 'school-1',
        ipAddress: '127.0.0.1',
        userAgent: undefined,
      })
    )
  })

  it('TEST-PSS-002: invalid email fails schema validation with 400 response shape', async () => {
    const request = new NextRequest('http://localhost/api/public/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...validPayload,
        email: 'invalid-email',
      }),
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('VALIDATION_ERROR')
    expect(String(payload.error.message)).toContain('valid email')
    expect(mocks.checkRateLimit).not.toHaveBeenCalled()
    expect(mocks.sendPublicContactEmail).not.toHaveBeenCalled()
  })

  it('TEST-PUB-006: returns 429 response and rate-limit metadata when limit is exceeded', async () => {
    mocks.checkRateLimit.mockResolvedValue({
      allowed: false,
      remaining: 0,
      retryAfter: 3600,
    })

    const request = new NextRequest('http://localhost/api/public/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(validPayload),
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(429)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('RATE_LIMITED')
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('0')
    expect(response.headers.get('Retry-After')).toBe('3600')
    expect(mocks.sendPublicContactEmail).not.toHaveBeenCalled()
    expect(mocks.createPublicAuditEntry).not.toHaveBeenCalled()
  })

  it('TEST-PUB-006: silently accepts honeypot submissions without side effects', async () => {
    const request = new NextRequest('http://localhost/api/public/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Bot',
        email: 'bot@example.com',
        phone: '9999999999',
        subject: 'Spam',
        message: 'Spam message that should be ignored.',
        company: 'Bot Corp',
      }),
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({
      success: true,
      data: {
        delivered: true,
      },
    })
    expect(mocks.checkRateLimit).not.toHaveBeenCalled()
    expect(mocks.sendPublicContactEmail).not.toHaveBeenCalled()
    expect(mocks.createPublicAuditEntry).not.toHaveBeenCalled()
  })
})
