import { NextRequest } from 'next/server'
import { errorResponse, successResponse } from '@/lib/api-helpers'
import { logger } from '@/lib/logger'
import { createSchoolOnboarding, onboardingRegisterSchema } from '@/lib/saas'

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json().catch(() => null)
    const parsedBody = onboardingRegisterSchema.safeParse(payload)

    if (!parsedBody.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        parsedBody.error.issues[0]?.message || 'Invalid onboarding payload',
        400
      )
    }

    const result = await createSchoolOnboarding(parsedBody.data)

    return successResponse({
      school: {
        id: result.school.id,
        name: result.school.name,
        slug: result.school.slug,
        email: result.school.email,
      },
      principal: {
        email: result.principal.email,
        temporary_password: result.principal.temporaryPassword,
      },
      current_academic_year: {
        id: result.academicYear.id,
        name: result.academicYear.name,
      },
      login_url: result.loginUrl,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'School onboarding failed'
    logger.error({ error }, 'School onboarding failed')
    return errorResponse('ONBOARDING_FAILED', message, 400)
  }
}
