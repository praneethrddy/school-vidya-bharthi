import { createHmac } from 'node:crypto'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const loggerMocks = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}))

const redisMocks = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
}))

const auditMocks = vi.hoisted(() => ({
  createAuditLog: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: loggerMocks,
}))

vi.mock('@/lib/redis', () => ({
  redis: redisMocks,
}))

vi.mock('@/lib/audit', () => ({
  createAuditLog: auditMocks.createAuditLog,
}))

vi.mock('@/lib/api-helpers', () => ({
  successResponse: (data: unknown) => Response.json({ success: true, data }, { status: 200 }),
  errorResponse: (code: string, message: string, status = 400) =>
    Response.json({ success: false, error: { code, message } }, { status }),
  unauthorizedResponse: (message = 'Unauthorized') =>
    Response.json(
      { success: false, error: { code: 'UNAUTHORIZED', message } },
      { status: 401 }
    ),
}))

import { POST } from '@/app/api/webhook/route'

const middlewareMatcher = '/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|logo.png|images/|api/webhook/).*)'

function matchesMiddleware(path: string): boolean {
  const regex = new RegExp(`^${middlewareMatcher}$`)
  return regex.test(path)
}

function signPayload(payload: string) {
  return createHmac('sha256', 'test-webhook-secret').update(payload).digest('hex')
}

function buildRequest(payload: string, signature?: string) {
  const headers = new Headers({ 'content-type': 'application/json' })
  if (signature) {
    headers.set('x-webhook-signature', signature)
  }

  return new NextRequest('http://localhost/api/webhook', {
    method: 'POST',
    body: payload,
    headers,
  })
}

describe('TEST-WEBHOOK-MIDDLEWARE-EXCLUSION: Middleware Exclusion Pattern', () => {
  it('should verify requests to /api/webhook/ bypass auth middleware', () => {
    expect(matchesMiddleware('/api/webhook/')).toBe(false)
    expect(matchesMiddleware('/api/webhook/stripe')).toBe(false)
    expect(matchesMiddleware('/api/webhook/payment-callback')).toBe(false)
  })

  it('should verify standard routes are matched by middleware', () => {
    expect(matchesMiddleware('/admin/dashboard')).toBe(true)
    expect(matchesMiddleware('/dashboard/attendance')).toBe(true)
    expect(matchesMiddleware('/api/students')).toBe(true)
    expect(matchesMiddleware('/api/grades')).toBe(true)
  })

  it('should verify other static/ignored routes bypass middleware', () => {
    expect(matchesMiddleware('/_next/static/chunks/main.js')).toBe(false)
    expect(matchesMiddleware('/favicon.ico')).toBe(false)
    expect(matchesMiddleware('/logo.png')).toBe(false)
  })
})

describe('Webhook API Route Handler Coverage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubEnv('WEBHOOK_SECRET', 'test-webhook-secret')
    redisMocks.get.mockResolvedValue(null)
    redisMocks.set.mockResolvedValue(undefined)
    auditMocks.createAuditLog.mockResolvedValue(undefined)
  })

  it('TEST-WEBHOOK-001: Webhook route exists and responds to POST', async () => {
    const payload = JSON.stringify({
      event_id: 'evt-1',
      event_type: 'payment.completed',
      school_id: 'school-1',
      data: { payment_id: 'pay-1', status: 'captured', amount: 5000 },
    })

    const response = await POST(buildRequest(payload, signPayload(payload)))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
  })

  it('TEST-WEBHOOK-002: Missing webhook signature header → 401', async () => {
    const response = await POST(
      buildRequest(
        JSON.stringify({
          event_id: 'evt-2',
          event_type: 'payment.completed',
          school_id: 'school-1',
          data: { payment_id: 'pay-2' },
        })
      )
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'UNAUTHORIZED' },
    })
  })

  it('TEST-WEBHOOK-003: Invalid webhook signature → 401', async () => {
    const payload = JSON.stringify({
      event_id: 'evt-3',
      event_type: 'payment.completed',
      school_id: 'school-1',
      data: { payment_id: 'pay-3' },
    })

    const response = await POST(buildRequest(payload, 'bad-signature'))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'UNAUTHORIZED' },
    })
  })

  it('TEST-WEBHOOK-004: Valid signature + valid payload → 200', async () => {
    const payload = JSON.stringify({
      event_id: 'evt-4',
      event_type: 'payment.completed',
      school_id: 'school-1',
      data: { payment_id: 'pay-4', status: 'captured', amount: 7200 },
    })

    const response = await POST(buildRequest(payload, signPayload(payload)))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      success: true,
      data: {
        received: true,
        processed: true,
        duplicate: false,
        event_id: 'evt-4',
      },
    })
  })

  it('TEST-WEBHOOK-005: Valid signature + malformed payload → 400', async () => {
    const payload = JSON.stringify({
      event_id: 'evt-5',
      school_id: 'school-1',
      data: { payment_id: 'pay-5' },
    })

    const response = await POST(buildRequest(payload, signPayload(payload)))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'VALIDATION_ERROR' },
    })
  })

  it('TEST-WEBHOOK-006: Webhook processes event correctly (e.g., payment callback)', async () => {
    const payload = JSON.stringify({
      event_id: 'evt-6',
      event_type: 'payment.completed',
      school_id: 'school-1',
      data: { payment_id: 'pay-6', status: 'captured', amount: 8800 },
    })

    const response = await POST(buildRequest(payload, signPayload(payload)))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data.summary).toMatchObject({
      payment_id: 'pay-6',
      status: 'captured',
      amount: 8800,
    })
  })

  it('TEST-WEBHOOK-007: Webhook is idempotent (replay same event → no duplicate)', async () => {
    const payload = JSON.stringify({
      event_id: 'evt-7',
      event_type: 'payment.completed',
      school_id: 'school-1',
      data: { payment_id: 'pay-7', status: 'captured', amount: 6400 },
    })
    const signature = signPayload(payload)

    await POST(buildRequest(payload, signature))
    redisMocks.get.mockResolvedValueOnce(JSON.stringify({ handled_at: '2026-06-13T00:38:00.000Z' }))

    const response = await POST(buildRequest(payload, signature))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data).toMatchObject({
      received: true,
      processed: false,
      duplicate: true,
      event_id: 'evt-7',
    })
  })

  it('TEST-WEBHOOK-008: Webhook logs received events for debugging', async () => {
    const payload = JSON.stringify({
      event_id: 'evt-8',
      event_type: 'payment.completed',
      school_id: 'school-1',
      data: { payment_id: 'pay-8', status: 'captured', amount: 5400 },
    })

    await POST(buildRequest(payload, signPayload(payload)))

    expect(loggerMocks.info).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 'evt-8',
        eventType: 'payment.completed',
        school_id: 'school-1',
      }),
      'Received webhook event'
    )
    expect(auditMocks.createAuditLog).toHaveBeenCalled()
  })
})
