import { NextRequest } from 'next/server'
import { createAuditLog } from '@/lib/audit'
import { cacheDel } from '@/lib/cache'
import { errorResponse, successResponse } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { uploadFile } from '@/lib/r2'
import {
  normalizeNullableText,
  schoolProfilePatchSchema,
} from '@/lib/school-settings'
import {
  getRequestMetadata,
  requireSchoolPermission,
} from '@/lib/settings-auth'
import {
  TENANT_ACCENT_COLOR_SETTING_KEY,
  TENANT_PRIMARY_COLOR_SETTING_KEY,
} from '@/lib/tenant-context'

const ALLOWED_LOGO_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
]

const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024

function getFileExtension(contentType: string): string {
  if (contentType === 'image/jpeg') return 'jpg'
  if (contentType === 'image/png') return 'png'
  if (contentType === 'image/webp') return 'webp'
  if (contentType === 'image/svg+xml') return 'svg'
  return 'bin'
}

export async function GET() {
  const access = await requireSchoolPermission('SETTINGS.manage_school_settings')
  if (access.error) {
    return access.error
  }

  const school = await prisma.school.findFirst({
    where: {
      id: access.user.schoolId,
      is_active: true,
    },
    select: {
      id: true,
      name: true,
      logo_url: true,
      address: true,
      city: true,
      state: true,
      phone: true,
      email: true,
      website: true,
      board: true,
      updated_at: true,
      settings: {
        where: {
          setting_key: {
            in: [TENANT_PRIMARY_COLOR_SETTING_KEY, TENANT_ACCENT_COLOR_SETTING_KEY],
          },
        },
        select: {
          setting_key: true,
          setting_value: true,
        },
      },
    },
  })

  if (!school) {
    return errorResponse('NOT_FOUND', 'School not found', 404)
  }

  return successResponse({
    school: {
      ...school,
      brand_primary:
        school.settings.find(
          (setting) => setting.setting_key === TENANT_PRIMARY_COLOR_SETTING_KEY
        )?.setting_value || '#1d4ed8',
      brand_accent:
        school.settings.find(
          (setting) => setting.setting_key === TENANT_ACCENT_COLOR_SETTING_KEY
        )?.setting_value || '#f59e0b',
      updated_at: school.updated_at.toISOString(),
    },
  })
}

export async function PATCH(request: NextRequest) {
  const access = await requireSchoolPermission('SETTINGS.manage_school_settings')
  if (access.error) {
    return access.error
  }

  const schoolId = access.user.schoolId
  const existingSchool = await prisma.school.findFirst({
    where: {
      id: schoolId,
    },
    select: {
      id: true,
      name: true,
      logo_url: true,
      address: true,
      city: true,
      state: true,
      phone: true,
      email: true,
      website: true,
      board: true,
      settings: {
        where: {
          setting_key: {
            in: [TENANT_PRIMARY_COLOR_SETTING_KEY, TENANT_ACCENT_COLOR_SETTING_KEY],
          },
        },
        select: {
          setting_key: true,
          setting_value: true,
        },
      },
    },
  })

  if (!existingSchool) {
    return errorResponse('NOT_FOUND', 'School not found', 404)
  }

  const contentType = request.headers.get('content-type') || ''
  const isMultipart = contentType.includes('multipart/form-data')

  const profilePayload: Record<string, unknown> = {}

  if (isMultipart) {
    const formData = await request.formData()
    const file = formData.get('logo')
    const fields = [
      'name',
      'address',
      'city',
      'state',
      'phone',
      'email',
      'website',
      'board',
      'logo_url',
      'brand_primary',
      'brand_accent',
    ] as const

    fields.forEach((field) => {
      if (!formData.has(field)) {
        return
      }
      const value = formData.get(field)
      profilePayload[field] = normalizeNullableText(value)
    })

    if (file instanceof File) {
      if (file.size > MAX_LOGO_SIZE_BYTES) {
        return errorResponse(
          'VALIDATION_ERROR',
          'Logo size must be 5MB or smaller',
          400
        )
      }

      if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
        return errorResponse(
          'VALIDATION_ERROR',
          'Logo file type must be JPEG, PNG, WEBP, or SVG',
          400
        )
      }

      const extension = getFileExtension(file.type)
      const key = `schools/${schoolId}/logo-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}.${extension}`

      const buffer = Buffer.from(await file.arrayBuffer())
      const logoUrl = await uploadFile(key, buffer, file.type)
      profilePayload.logo_url = logoUrl
    }
  } else {
    const jsonPayload = await request.json().catch(() => null)
    if (!jsonPayload || typeof jsonPayload !== 'object') {
      return errorResponse('VALIDATION_ERROR', 'Invalid payload', 400)
    }
    Object.assign(profilePayload, jsonPayload)
  }

  const parsedBody = schoolProfilePatchSchema.safeParse(profilePayload)
  if (!parsedBody.success) {
    return errorResponse(
      'VALIDATION_ERROR',
      parsedBody.error.issues[0]?.message || 'Invalid payload',
      400
    )
  }

  const data = parsedBody.data
  const brandingWrites = [
    {
      key: TENANT_PRIMARY_COLOR_SETTING_KEY,
      value: data.brand_primary,
    },
    {
      key: TENANT_ACCENT_COLOR_SETTING_KEY,
      value: data.brand_accent,
    },
  ].filter((entry) => Boolean(entry.value))

  const updatedSchool = await prisma.$transaction(async (transaction) => {
    const schoolRecord = await transaction.school.update({
      where: {
        id: schoolId,
      },
      data: {
        name: data.name,
        address: data.address,
        city: data.city,
        state: data.state,
        phone: data.phone,
        email: data.email,
        website: data.website,
        board: data.board,
        logo_url: data.logo_url,
        updated_at: new Date(),
      },
      select: {
        id: true,
        name: true,
        logo_url: true,
        address: true,
        city: true,
        state: true,
        phone: true,
        email: true,
        website: true,
        board: true,
        updated_at: true,
      },
    })

    for (const brandingWrite of brandingWrites) {
      await transaction.schoolSetting.upsert({
        where: {
          school_id_setting_key: {
            school_id: schoolId,
            setting_key: brandingWrite.key,
          },
        },
        create: {
          school_id: schoolId,
          setting_key: brandingWrite.key,
          setting_value: brandingWrite.value as string,
          category: 'branding',
        },
        update: {
          setting_value: brandingWrite.value as string,
          category: 'branding',
          updated_at: new Date(),
        },
      })
    }

    return schoolRecord
  })

  const brandingMap = new Map(
    (existingSchool.settings || []).map((setting) => [setting.setting_key, setting.setting_value])
  )

  await createAuditLog({
    school_id: schoolId,
    user_id: access.user.id,
    action: 'UPDATE',
    entity_type: 'school',
    entity_id: schoolId,
    old_value: existingSchool,
    new_value: {
      name: updatedSchool.name,
      logo_url: updatedSchool.logo_url,
      address: updatedSchool.address,
      city: updatedSchool.city,
      state: updatedSchool.state,
      phone: updatedSchool.phone,
      email: updatedSchool.email,
      website: updatedSchool.website,
      board: updatedSchool.board,
      brand_primary:
        data.brand_primary ||
        brandingMap.get(TENANT_PRIMARY_COLOR_SETTING_KEY) ||
        '#1d4ed8',
      brand_accent:
        data.brand_accent ||
        brandingMap.get(TENANT_ACCENT_COLOR_SETTING_KEY) ||
        '#f59e0b',
    },
    ...getRequestMetadata(request),
  })

  await cacheDel(`tenant:branding:${schoolId}`)

  return successResponse({
    school: {
      ...updatedSchool,
      brand_primary:
        data.brand_primary ||
        brandingMap.get(TENANT_PRIMARY_COLOR_SETTING_KEY) ||
        '#1d4ed8',
      brand_accent:
        data.brand_accent ||
        brandingMap.get(TENANT_ACCENT_COLOR_SETTING_KEY) ||
        '#f59e0b',
      updated_at: updatedSchool.updated_at.toISOString(),
    },
  })
}
