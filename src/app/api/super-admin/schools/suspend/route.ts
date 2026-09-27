import { NextRequest } from 'next/server'
import { z } from 'zod'
import { errorResponse, successResponse } from '@/lib/api-helpers'
import { logger } from '@/lib/logger'
import { requireSuperAdmin } from '@/lib/platform-auth'
import { suspendSchool } from '@/lib/saas'
import { getRequestMetadata } from '@/lib/settings-auth'

const suspendSchema = z.object({
  school_id: z.string().uuid('school_id must be a valid UUID'),
  is_active: z.boolean().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const access = await requireSuperAdmin()
    if (access.error) {
      return access.error
    }

    const payload = await request.json().catch(() => null)
    const parsedBody = suspendSchema.safeParse(payload)
    if (!parsedBody.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        parsedBody.error.issues[0]?.message || 'Invalid suspend payload',
        400
      )
    }

    const updated = await suspendSchool({
      schoolId: parsedBody.data.school_id,
      userId: access.user.id,
      isActive: parsedBody.data.is_active ?? false,
      metadata: getRequestMetadata(request),
    })

    return successResponse({
      school: {
        id: updated.id,
        name: updated.name,
        is_active: updated.is_active,
      },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to update school status'
    logger.error({ error }, 'Failed to update school status')
    return errorResponse('UPDATE_FAILED', message, 400)
  }
}
