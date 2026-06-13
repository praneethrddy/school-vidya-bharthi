import { NextRequest } from 'next/server'
import { createAuditLog } from '@/lib/audit'
import {
  errorResponse,
  successResponse,
} from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import {
  GENERAL_SETTING_KEYS,
  generalSettingsPatchSchema,
  validateSettingValue,
} from '@/lib/school-settings'
import {
  getRequestMetadata,
  requireSchoolPermission,
} from '@/lib/settings-auth'

export async function GET() {
  const access = await requireSchoolPermission('SETTINGS.manage_school_settings')
  if (access.error) {
    return access.error
  }

  const settings = await prisma.schoolSetting.findMany({
    where: {
      school_id: access.user.schoolId,
      setting_key: {
        in: [...GENERAL_SETTING_KEYS],
      },
    },
    orderBy: {
      setting_key: 'asc',
    },
  })

  return successResponse({
    settings: settings.map((setting) => ({
      id: setting.id,
      setting_key: setting.setting_key,
      setting_value: setting.setting_value,
      updated_at: setting.updated_at.toISOString(),
    })),
    settings_map: settings.reduce<Record<string, string>>((accumulator, setting) => {
      accumulator[setting.setting_key] = setting.setting_value
      return accumulator
    }, {}),
  })
}

export async function PATCH(request: NextRequest) {
  const access = await requireSchoolPermission('SETTINGS.manage_school_settings')
  if (access.error) {
    return access.error
  }

  const payload = await request.json().catch(() => null)
  const parsedBody = generalSettingsPatchSchema.safeParse(payload)
  if (!parsedBody.success) {
    return errorResponse(
      'VALIDATION_ERROR',
      parsedBody.error.issues[0]?.message || 'Invalid payload',
      400
    )
  }

  const invalidSetting = parsedBody.data.settings.find((setting) => {
    return Boolean(validateSettingValue(setting.setting_key, setting.setting_value))
  })
  if (invalidSetting) {
    const validationMessage = validateSettingValue(
      invalidSetting.setting_key,
      invalidSetting.setting_value
    )
    return errorResponse('VALIDATION_ERROR', validationMessage || 'Invalid setting', 400)
  }

  const schoolId = access.user.schoolId
  const existing = await prisma.schoolSetting.findMany({
    where: {
      school_id: schoolId,
      setting_key: {
        in: parsedBody.data.settings.map((setting) => setting.setting_key),
      },
    },
  })

  const existingByKey = new Map(
    existing.map((setting) => [setting.setting_key, setting])
  )

  const writes = parsedBody.data.settings.map((setting) => {
    return prisma.schoolSetting.upsert({
      where: {
        school_id_setting_key: {
          school_id: schoolId,
          setting_key: setting.setting_key,
        },
      },
      create: {
        school_id: schoolId,
        setting_key: setting.setting_key,
        setting_value: setting.setting_value.trim(),
        category: 'general',
      },
      update: {
        setting_value: setting.setting_value.trim(),
        category: 'general',
        updated_at: new Date(),
      },
    })
  })

  const saved = await prisma.$transaction(writes)

  const metadata = getRequestMetadata(request)
  await Promise.all(
    saved.map((setting) => {
      const previous = existingByKey.get(setting.setting_key)
      return createAuditLog({
        school_id: schoolId,
        user_id: access.user.id,
        action: previous ? 'UPDATE' : 'CREATE',
        entity_type: 'school_setting',
        entity_id: setting.id,
        old_value: previous
          ? {
              setting_key: previous.setting_key,
              setting_value: previous.setting_value,
              category: previous.category,
            }
          : undefined,
        new_value: {
          setting_key: setting.setting_key,
          setting_value: setting.setting_value,
          category: setting.category,
        },
        ...metadata,
      })
    })
  )

  return successResponse({
    settings: saved.map((setting) => ({
      id: setting.id,
      setting_key: setting.setting_key,
      setting_value: setting.setting_value,
      updated_at: setting.updated_at.toISOString(),
    })),
    settings_map: saved.reduce<Record<string, string>>((accumulator, setting) => {
      accumulator[setting.setting_key] = setting.setting_value
      return accumulator
    }, {}),
  })
}

