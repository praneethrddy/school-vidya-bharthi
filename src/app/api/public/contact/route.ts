import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { errorResponse, successResponse } from '@/lib/api-helpers'
import { sendPublicContactEmail } from '@/lib/email'
import { getRateLimitHeaders, checkRateLimit } from '@/lib/rate-limit'
import { publicContactFormSchema } from '@/lib/public-site-schemas'
import {
  createPublicAuditEntry,
  getPublicContactRecipient,
} from '@/lib/public-site'

function getClientIpAddress(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null)
  const parsedBody = publicContactFormSchema.safeParse(payload)

  if (!parsedBody.success) {
    return errorResponse(
      'VALIDATION_ERROR',
      parsedBody.error.issues[0]?.message || 'Invalid payload',
      400
    )
  }

  const { school, email } = await getPublicContactRecipient(request.headers)
  const data = parsedBody.data
  const clientIp = getClientIpAddress(request)

  if (data.company) {
    return successResponse({
      delivered: true,
    })
  }

  const rateLimitResult = await checkRateLimit(
    `public-contact:${school.id || 'default'}:${clientIp}`,
    'contact'
  )

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many contact requests. Please try again later.',
        },
      },
      {
        status: 429,
        headers: getRateLimitHeaders(rateLimitResult.remaining, rateLimitResult.retryAfter),
      }
    )
  }

  const delivered = await sendPublicContactEmail({
    to: email,
    schoolName: school.name,
    senderName: data.name,
    senderEmail: data.email,
    senderPhone: data.phone,
    subject: data.subject,
    message: data.message,
  })

  if (!delivered) {
    return errorResponse(
      'EMAIL_FAILED',
      'We could not send your message right now. Please try again later.',
      502
    )
  }

  await createPublicAuditEntry({
    schoolId: school.id,
    entityId: randomUUID(),
    newValue: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      subject: data.subject,
      source: 'public_contact_form',
    },
    ipAddress: clientIp,
    userAgent: request.headers.get('user-agent') || undefined,
  })

  return NextResponse.json(
    {
      success: true,
      data: {
        delivered: true,
      },
    },
    {
      status: 200,
      headers: getRateLimitHeaders(rateLimitResult.remaining),
    }
  )
}
