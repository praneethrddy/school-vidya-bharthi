import { NextRequest } from 'next/server'
import { errorResponse, successResponse } from '@/lib/api-helpers'
import { createTenantPrisma } from '@/lib/prisma'
import { registerSchoolCustomDomain, customDomainSchema } from '@/lib/saas'
import { getRequestMetadata, requireSchoolPermission } from '@/lib/settings-auth'
import { TENANT_CUSTOM_DOMAIN_SETTING_KEY } from '@/lib/tenant-context'

export async function GET() {
  const access = await requireSchoolPermission('SETTINGS.manage_school_settings')
  if (access.error) {
    return access.error
  }

  const tenantPrisma = createTenantPrisma({
    schoolId: access.user.schoolId,
  })

  const domainSetting = await tenantPrisma.schoolSetting.findFirst({
    where: {
      setting_key: TENANT_CUSTOM_DOMAIN_SETTING_KEY,
    },
    select: {
      setting_value: true,
      updated_at: true,
    },
  })

  return successResponse({
    domain: domainSetting?.setting_value || null,
    updated_at: domainSetting?.updated_at.toISOString() || null,
  })
}

export async function POST(request: NextRequest) {
  const access = await requireSchoolPermission('SETTINGS.manage_school_settings')
  if (access.error) {
    return access.error
  }

  const payload = await request.json().catch(() => null)
  const parsedBody = customDomainSchema.safeParse(payload)
  if (!parsedBody.success) {
    return errorResponse(
      'VALIDATION_ERROR',
      parsedBody.error.issues[0]?.message || 'Invalid domain payload',
      400
    )
  }

  try {
    const result = await registerSchoolCustomDomain({
      schoolId: access.user.schoolId,
      userId: access.user.id,
      domain: parsedBody.data.domain,
      metadata: getRequestMetadata(request),
    })

    return successResponse(result)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to register custom domain'
    return errorResponse('DOMAIN_REGISTRATION_FAILED', message, 400)
  }
}
