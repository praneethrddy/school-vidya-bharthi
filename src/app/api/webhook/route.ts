import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextRequest } from 'next/server'
import { createAuditLog } from '@/lib/audit'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-helpers'
import { logger } from '@/lib/logger'
import { redis } from '@/lib/redis'

interface WebhookPayload {
  event_id: string
  event_type: string
  school_id: string | null
  data: {
    payment_id?: string
    status?: string
    amount?: number
    [key: string]: unknown
  }
}

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'test-webhook-secret'
const SIGNATURE_HEADER = 'x-webhook-signature'

function isValidPayload(payload: unknown): payload is WebhookPayload {
  if (!payload || typeof payload !== 'object') {
    return false
  }

  const candidate = payload as Record<string, unknown>
  return (
    typeof candidate.event_id === 'string' &&
    candidate.event_id.length > 0 &&
    typeof candidate.event_type === 'string' &&
    candidate.event_type.length > 0 &&
    (typeof candidate.school_id === 'string' || candidate.school_id === null) &&
    !!candidate.data &&
    typeof candidate.data === 'object'
  )
}

function buildSignature(rawBody: string) {
  return createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex')
}

function hasValidSignature(signature: string, rawBody: string) {
  const expectedSignature = Buffer.from(buildSignature(rawBody))
  const receivedSignature = Buffer.from(signature)

  if (expectedSignature.length !== receivedSignature.length) {
    return false
  }

  return timingSafeEqual(expectedSignature, receivedSignature)
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get(SIGNATURE_HEADER)
  if (!signature) {
    return unauthorizedResponse('Missing webhook signature')
  }

  const rawBody = await req.text()
  if (!hasValidSignature(signature, rawBody)) {
    return unauthorizedResponse('Invalid webhook signature')
  }

  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return errorResponse('INVALID_JSON', 'Malformed webhook payload', 400)
  }

  if (!isValidPayload(payload)) {
    return errorResponse('VALIDATION_ERROR', 'Invalid webhook payload', 400)
  }

  const event = payload
  const dedupeKey = `webhook:${event.event_id}`
  const existingEvent = await redis.get(dedupeKey)

  logger.info(
    {
      eventId: event.event_id,
      eventType: event.event_type,
      school_id: event.school_id,
    },
    'Received webhook event'
  )

  if (existingEvent) {
    return successResponse({
      received: true,
      processed: false,
      duplicate: true,
      event_id: event.event_id,
    })
  }

  await redis.set(dedupeKey, JSON.stringify({ handled_at: new Date().toISOString() }), 60 * 60)

  await createAuditLog({
    school_id: event.school_id,
    user_id: 'webhook-system',
    action: 'IMPORT',
    entity_type: 'webhook_event',
    entity_id: event.event_id,
    new_value: {
      event_type: event.event_type,
      data: event.data,
    },
  })

  return successResponse({
    received: true,
    processed: true,
    duplicate: false,
    event_id: event.event_id,
    summary: {
      payment_id: event.data.payment_id || null,
      status: event.data.status || 'received',
      amount: event.data.amount || null,
    },
  })
}
