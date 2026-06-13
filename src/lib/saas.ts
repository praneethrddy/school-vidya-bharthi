import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { createAuditLog } from '@/lib/audit'
import { cacheDel } from '@/lib/cache'
import { sendSchoolOnboardingEmail } from '@/lib/email'
import { logger } from '@/lib/logger'
import { CONFIGURABLE_ROLES, ROLE_PERMISSION_DEFAULTS } from '@/lib/permission-config'
import { prisma, createTenantPrisma } from '@/lib/prisma'
import { buildDefaultTerms } from '@/lib/school-settings'
import {
  getPlatformRootUrl,
  getSchoolYearLabel,
  TENANT_ACCENT_COLOR_SETTING_KEY,
  TENANT_CUSTOM_DOMAIN_SETTING_KEY,
  TENANT_PLATFORM_PLAN_SETTING_KEY,
  TENANT_PLATFORM_STATUS_SETTING_KEY,
  TENANT_PRIMARY_COLOR_SETTING_KEY,
} from '@/lib/tenant-context'
import { generatePassword } from '@/lib/utils'

const DEFAULT_CLASSES = [
  'Grade 1',
  'Grade 2',
  'Grade 3',
  'Grade 4',
  'Grade 5',
  'Grade 6',
  'Grade 7',
  'Grade 8',
  'Grade 9',
  'Grade 10',
] as const

const DEFAULT_FEE_CATEGORIES = [
  'Tuition Fee',
  'Admission Fee',
  'Examination Fee',
  'Library Fee',
  'Transport Fee',
] as const

const DEFAULT_PLATFORM_PLAN = 'GROWTH'
const DEFAULT_PLATFORM_STATUS = 'TRIAL'
const DEFAULT_PRIMARY_COLOR = '#1d4ed8'
const DEFAULT_ACCENT_COLOR = '#f59e0b'

export const onboardingRegisterSchema = z.object({
  school_name: z.string().trim().min(3).max(255),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain lowercase letters, numbers, and hyphens'),
  school_email: z.string().trim().email().max(255),
  principal_email: z.string().trim().email().max(255),
  principal_name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(20).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  board: z.string().trim().max(100).optional(),
  brand_primary: z
    .string()
    .trim()
    .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Primary color must be a valid hex color')
    .optional(),
  brand_accent: z
    .string()
    .trim()
    .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Accent color must be a valid hex color')
    .optional(),
})

export const customDomainSchema = z.object({
  domain: z
    .string()
    .trim()
    .min(3)
    .max(255)
    .regex(
      /^(?!https?:\/\/)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i,
      'Provide a valid domain without http:// or https://'
    ),
})

function normalizeSlug(value: string) {
  return value.trim().toLowerCase()
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

function getAcademicYearDates(startMonth = 6, now = new Date()) {
  const currentYear = now.getUTCFullYear()
  const currentMonth = now.getUTCMonth() + 1
  const startYear = currentMonth >= startMonth ? currentYear : currentYear - 1
  const startDate = new Date(Date.UTC(startYear, startMonth - 1, 1))
  const endDate = new Date(Date.UTC(startYear + 1, startMonth - 1, 0))
  return { startDate, endDate }
}

async function seedDefaultRolePermissions(params: {
  schoolId: string
  principalUserId: string
}) {
  const allCodes = Object.values(ROLE_PERMISSION_DEFAULTS).flat()
  if (allCodes.length === 0) {
    return
  }

  const permissionRows = await prisma.permission.findMany({
    where: {
      code: {
        in: allCodes,
      },
    },
    select: {
      id: true,
      code: true,
    },
  })

  const permissionByCode = new Map(
    permissionRows.map((permission) => [permission.code, permission.id])
  )

  const tenantPrisma = createTenantPrisma({ schoolId: params.schoolId })
  const rolePermissionRows = CONFIGURABLE_ROLES.flatMap((role) =>
    ROLE_PERMISSION_DEFAULTS[role]
      .map((code) => permissionByCode.get(code))
      .filter((permissionId): permissionId is string => Boolean(permissionId))
      .map((permissionId) => ({
        role,
        permission_id: permissionId,
        granted_by: params.principalUserId,
      }))
  )

  if (rolePermissionRows.length > 0) {
    await tenantPrisma.rolePermission.createMany({
      data: rolePermissionRows.map((entry) => ({
        school_id: params.schoolId,
        role: entry.role,
        permission_id: entry.permission_id,
        granted_by: entry.granted_by,
      })),
    })
  }
}

export async function createSchoolOnboarding(
  input: z.infer<typeof onboardingRegisterSchema>
) {
  const slug = normalizeSlug(input.slug)
  const schoolEmail = normalizeEmail(input.school_email)
  const principalEmail = normalizeEmail(input.principal_email)
  const temporaryPassword = generatePassword(14)
  const passwordHash = await bcrypt.hash(temporaryPassword, 12)
  const { startDate, endDate } = getAcademicYearDates(6)
  const academicYearName = getSchoolYearLabel(6, startDate)
  const brandPrimary = input.brand_primary || DEFAULT_PRIMARY_COLOR
  const brandAccent = input.brand_accent || DEFAULT_ACCENT_COLOR

  const [existingSchool, existingDomainSchool] = await Promise.all([
    prisma.school.findFirst({
      where: {
        OR: [{ slug }, { email: schoolEmail }],
      },
      select: {
        id: true,
        slug: true,
        email: true,
      },
    }),
    prisma.schoolSetting.findFirst({
      where: {
        setting_key: TENANT_CUSTOM_DOMAIN_SETTING_KEY,
        setting_value: slug,
      },
      select: {
        id: true,
      },
    }),
  ])

  if (existingSchool?.slug === slug) {
    throw new Error('That school slug is already in use')
  }

  if (existingSchool?.email === schoolEmail) {
    throw new Error('That school email is already registered')
  }

  if (existingDomainSchool) {
    throw new Error('That tenant identifier is already reserved')
  }

  const created = await prisma.$transaction(async (transaction) => {
    const school = await transaction.school.create({
      data: {
        name: input.school_name.trim(),
        slug,
        email: schoolEmail,
        phone: input.phone?.trim() || null,
        city: input.city?.trim() || null,
        state: input.state?.trim() || null,
        board: input.board?.trim() || 'CBSE',
        is_active: true,
      },
    })

    const principalUser = await transaction.user.create({
      data: {
        school_id: school.id,
        email: principalEmail,
        password_hash: passwordHash,
        role: 'PRINCIPAL',
        is_active: true,
      },
    })

    const academicYear = await transaction.academicYear.create({
      data: {
        school_id: school.id,
        name: academicYearName,
        start_date: startDate,
        end_date: endDate,
        is_current: true,
      },
    })

    const terms = buildDefaultTerms(startDate, endDate)
    if (terms.length > 0) {
      await transaction.term.createMany({
        data: terms.map((term) => ({
          school_id: school.id,
          academic_year_id: academicYear.id,
          name: term.name,
          start_date: term.start_date,
          end_date: term.end_date,
        })),
      })
    }

    await transaction.class.createMany({
      data: DEFAULT_CLASSES.map((name) => ({
        school_id: school.id,
        academic_year_id: academicYear.id,
        name,
      })),
    })

    await transaction.feeCategory.createMany({
      data: DEFAULT_FEE_CATEGORIES.map((name) => ({
        school_id: school.id,
        name,
      })),
    })

    await transaction.schoolSetting.createMany({
      data: [
        {
          school_id: school.id,
          setting_key: 'working_days',
          setting_value: 'MON,TUE,WED,THU,FRI,SAT',
          category: 'general',
        },
        {
          school_id: school.id,
          setting_key: 'grading_scheme',
          setting_value: 'PERCENTAGE',
          category: 'general',
        },
        {
          school_id: school.id,
          setting_key: 'receipt_prefix',
          setting_value: school.name
            .split(' ')
            .map((part) => part[0])
            .join('')
            .slice(0, 6)
            .toUpperCase(),
          category: 'general',
        },
        {
          school_id: school.id,
          setting_key: 'academic_start_month',
          setting_value: '6',
          category: 'general',
        },
        {
          school_id: school.id,
          setting_key: 'attendance_type',
          setting_value: 'DAILY',
          category: 'general',
        },
        {
          school_id: school.id,
          setting_key: TENANT_PRIMARY_COLOR_SETTING_KEY,
          setting_value: brandPrimary,
          category: 'branding',
        },
        {
          school_id: school.id,
          setting_key: TENANT_ACCENT_COLOR_SETTING_KEY,
          setting_value: brandAccent,
          category: 'branding',
        },
        {
          school_id: school.id,
          setting_key: TENANT_PLATFORM_PLAN_SETTING_KEY,
          setting_value: DEFAULT_PLATFORM_PLAN,
          category: 'billing',
        },
        {
          school_id: school.id,
          setting_key: TENANT_PLATFORM_STATUS_SETTING_KEY,
          setting_value: DEFAULT_PLATFORM_STATUS,
          category: 'billing',
        },
      ],
    })

    return {
      school,
      principalUser,
      academicYear,
    }
  })

  await seedDefaultRolePermissions({
    schoolId: created.school.id,
    principalUserId: created.principalUser.id,
  })

  await Promise.all([
    createAuditLog({
      school_id: created.school.id,
      user_id: created.principalUser.id,
      action: 'CREATE',
      entity_type: 'school',
      entity_id: created.school.id,
      new_value: {
        name: created.school.name,
        slug: created.school.slug,
        email: created.school.email,
      },
    }),
    createAuditLog({
      school_id: created.school.id,
      user_id: created.principalUser.id,
      action: 'CREATE',
      entity_type: 'academic_year',
      entity_id: created.academicYear.id,
      new_value: {
        name: created.academicYear.name,
        is_current: created.academicYear.is_current,
      },
    }),
  ])

  const loginUrl = `${getPlatformRootUrl().replace(/\/$/, '')}/login`
  await sendSchoolOnboardingEmail({
    to: principalEmail,
    schoolName: created.school.name,
    principalEmail,
    temporaryPassword,
    loginUrl,
  })

  return {
    school: created.school,
    principal: {
      id: created.principalUser.id,
      email: created.principalUser.email,
      temporaryPassword,
      name: input.principal_name.trim(),
    },
    academicYear: created.academicYear,
    loginUrl,
  }
}

export async function getPlatformAnalytics() {
  const [totalSchools, activeSchools, totalUsers, totalStudents, totalStaff, monthPayments] =
    await Promise.all([
      prisma.school.count(),
      prisma.school.count({ where: { is_active: true } }),
      prisma.user.count(),
      prisma.student.count({ where: { is_active: true } }),
      prisma.staff.count({ where: { is_active: true } }),
      prisma.feePayment.aggregate({
        _sum: {
          amount_paid: true,
        },
        where: {
          payment_date: {
            gte: new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)),
          },
        },
      }),
    ])

  return {
    total_schools: totalSchools,
    active_schools: activeSchools,
    suspended_schools: totalSchools - activeSchools,
    total_users: totalUsers,
    total_students: totalStudents,
    total_staff: totalStaff,
    total_mrr: Number(monthPayments._sum.amount_paid || 0),
  }
}

function mapSettings(settings: Array<{ setting_key: string; setting_value: string }>) {
  return settings.reduce<Record<string, string>>((accumulator, setting) => {
    accumulator[setting.setting_key] = setting.setting_value
    return accumulator
  }, {})
}

export async function listPlatformSchools() {
  const [schools, revenueBySchool] = await Promise.all([
    prisma.school.findMany({
      orderBy: [{ is_active: 'desc' }, { created_at: 'desc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        logo_url: true,
        city: true,
        state: true,
        is_active: true,
        created_at: true,
        users: {
          where: {
            role: 'PRINCIPAL',
          },
          select: {
            email: true,
          },
          take: 1,
        },
        _count: {
          select: {
            students: true,
            staff: true,
            users: true,
          },
        },
        settings: {
          where: {
            setting_key: {
              in: [
                TENANT_CUSTOM_DOMAIN_SETTING_KEY,
                TENANT_PLATFORM_PLAN_SETTING_KEY,
                TENANT_PLATFORM_STATUS_SETTING_KEY,
              ],
            },
          },
          select: {
            setting_key: true,
            setting_value: true,
          },
        },
      },
    }),
    prisma.feePayment.groupBy({
      by: ['school_id'],
      _sum: {
        amount_paid: true,
      },
    }),
  ])

  const revenueMap = new Map(
    revenueBySchool.map((entry) => [entry.school_id, Number(entry._sum.amount_paid || 0)])
  )

  return schools.map((school) => {
    const settings = mapSettings(school.settings)
    return {
      id: school.id,
      name: school.name,
      slug: school.slug,
      email: school.email,
      logo_url: school.logo_url,
      city: school.city,
      state: school.state,
      is_active: school.is_active,
      created_at: school.created_at.toISOString(),
      principal_email: school.users[0]?.email || null,
      student_count: school._count.students,
      staff_count: school._count.staff,
      user_count: school._count.users,
      total_revenue: revenueMap.get(school.id) || 0,
      custom_domain: settings[TENANT_CUSTOM_DOMAIN_SETTING_KEY] || null,
      platform_plan: settings[TENANT_PLATFORM_PLAN_SETTING_KEY] || DEFAULT_PLATFORM_PLAN,
      platform_status:
        settings[TENANT_PLATFORM_STATUS_SETTING_KEY] || DEFAULT_PLATFORM_STATUS,
    }
  })
}

export async function getPlatformSchoolDetail(schoolId: string) {
  const school = await prisma.school.findFirst({
    where: {
      id: schoolId,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      email: true,
      phone: true,
      city: true,
      state: true,
      logo_url: true,
      board: true,
      is_active: true,
      created_at: true,
      updated_at: true,
      users: {
        where: {
          role: 'PRINCIPAL',
        },
        select: {
          id: true,
          email: true,
          created_at: true,
        },
        take: 1,
      },
      settings: {
        where: {
          setting_key: {
            in: [
              TENANT_CUSTOM_DOMAIN_SETTING_KEY,
              TENANT_PLATFORM_PLAN_SETTING_KEY,
              TENANT_PLATFORM_STATUS_SETTING_KEY,
              TENANT_PRIMARY_COLOR_SETTING_KEY,
              TENANT_ACCENT_COLOR_SETTING_KEY,
            ],
          },
        },
        select: {
          setting_key: true,
          setting_value: true,
        },
      },
        _count: {
          select: {
            students: true,
            staff: true,
            users: true,
            classes: true,
            fee_payments: true,
            admissions: true,
          },
        },
      academic_years: {
        where: {
          is_current: true,
        },
        select: {
          id: true,
          name: true,
          start_date: true,
          end_date: true,
        },
        take: 1,
      },
    },
  })

  if (!school) {
    return null
  }

  const [revenue, pendingAdmissions, unreadNotifications] = await Promise.all([
    prisma.feePayment.aggregate({
      where: {
        school_id: schoolId,
      },
      _sum: {
        amount_paid: true,
      },
    }),
    prisma.admission.count({
      where: {
        school_id: schoolId,
        status: {
          notIn: ['ADMITTED', 'REJECTED'],
        },
      },
    }),
    prisma.notification.count({
      where: {
        school_id: schoolId,
        is_read: false,
      },
    }),
  ])

  const settings = mapSettings(school.settings)

  return {
    id: school.id,
    name: school.name,
    slug: school.slug,
    email: school.email,
    phone: school.phone,
    city: school.city,
    state: school.state,
    board: school.board,
    logo_url: school.logo_url,
    is_active: school.is_active,
    created_at: school.created_at.toISOString(),
    updated_at: school.updated_at.toISOString(),
    principal: school.users[0]
      ? {
          id: school.users[0].id,
          email: school.users[0].email,
          created_at: school.users[0].created_at.toISOString(),
        }
      : null,
    current_academic_year: school.academic_years[0]
      ? {
          id: school.academic_years[0].id,
          name: school.academic_years[0].name,
          start_date: school.academic_years[0].start_date.toISOString(),
          end_date: school.academic_years[0].end_date.toISOString(),
        }
      : null,
    counts: {
      students: school._count.students,
      staff: school._count.staff,
      users: school._count.users,
      classes: school._count.classes,
      payments: school._count.fee_payments,
      admissions: school._count.admissions,
      pending_admissions: pendingAdmissions,
      unread_notifications: unreadNotifications,
    },
    total_revenue: Number(revenue._sum.amount_paid || 0),
    custom_domain: settings[TENANT_CUSTOM_DOMAIN_SETTING_KEY] || null,
    platform_plan: settings[TENANT_PLATFORM_PLAN_SETTING_KEY] || DEFAULT_PLATFORM_PLAN,
    platform_status:
      settings[TENANT_PLATFORM_STATUS_SETTING_KEY] || DEFAULT_PLATFORM_STATUS,
    brand_primary: settings[TENANT_PRIMARY_COLOR_SETTING_KEY] || DEFAULT_PRIMARY_COLOR,
    brand_accent: settings[TENANT_ACCENT_COLOR_SETTING_KEY] || DEFAULT_ACCENT_COLOR,
  }
}

export async function suspendSchool(params: {
  schoolId: string
  userId: string
  isActive: boolean
  metadata?: {
    ip_address?: string
    user_agent?: string
  }
}) {
  const existing = await prisma.school.findFirst({
    where: {
      id: params.schoolId,
    },
    select: {
      id: true,
      name: true,
      is_active: true,
    },
  })

  if (!existing) {
    throw new Error('School not found')
  }

  const updated = await prisma.school.update({
    where: {
      id: params.schoolId,
    },
    data: {
      is_active: params.isActive,
      updated_at: new Date(),
    },
  })

  await createAuditLog({
    school_id: null,
    user_id: params.userId,
    action: 'UPDATE',
    entity_type: 'school',
    entity_id: updated.id,
    old_value: existing as unknown as Record<string, unknown>,
    new_value: {
      name: updated.name,
      is_active: updated.is_active,
    },
    ...params.metadata,
  })

  await Promise.all([
    cacheDel(`tenant:host:${updated.slug}.schoolos.in`),
    cacheDel(`tenant:branding:${updated.id}`),
  ])

  return updated
}

async function provisionCloudflareCustomHostname(domain: string) {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN
  const zoneId = process.env.CLOUDFLARE_ZONE_ID

  if (!apiToken || !zoneId) {
    logger.info({ domain }, 'Cloudflare credentials missing; custom domain provision mocked')
    return {
      provider_status: 'mocked',
      cloudflare_hostname_id: null as string | null,
    }
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${zoneId}/custom_hostnames`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        hostname: domain,
        ssl: {
          method: 'txt',
          type: 'dv',
        },
      }),
    }
  )

  const payload = await response.json().catch(() => null)

  if (!response.ok || !payload?.success) {
    throw new Error(
      payload?.errors?.[0]?.message || 'Cloudflare custom hostname provisioning failed'
    )
  }

  return {
    provider_status: payload.result?.ssl?.status || 'pending',
    cloudflare_hostname_id: payload.result?.id || null,
  }
}

export async function registerSchoolCustomDomain(params: {
  schoolId: string
  userId: string
  domain: string
  metadata?: {
    ip_address?: string
    user_agent?: string
  }
}) {
  const normalizedDomain = params.domain.trim().toLowerCase()
  const duplicate = await prisma.schoolSetting.findFirst({
    where: {
      setting_key: TENANT_CUSTOM_DOMAIN_SETTING_KEY,
      setting_value: normalizedDomain,
      NOT: {
        school_id: params.schoolId,
      },
    },
    select: {
      id: true,
    },
  })

  if (duplicate) {
    throw new Error('That custom domain is already connected to another school')
  }

  const cloudflareResult = await provisionCloudflareCustomHostname(normalizedDomain)
  const tenantPrisma = createTenantPrisma({ schoolId: params.schoolId })

  const existing = await tenantPrisma.schoolSetting.findFirst({
    where: {
      setting_key: TENANT_CUSTOM_DOMAIN_SETTING_KEY,
    },
    select: {
      id: true,
      setting_value: true,
    },
  })

  const saved = existing
    ? await prisma.schoolSetting.update({
        where: {
          school_id_setting_key: {
            school_id: params.schoolId,
            setting_key: TENANT_CUSTOM_DOMAIN_SETTING_KEY,
          },
        },
        data: {
          setting_value: normalizedDomain,
          category: 'branding',
          updated_at: new Date(),
        },
      })
    : await tenantPrisma.schoolSetting.create({
        data: {
          school_id: params.schoolId,
          setting_key: TENANT_CUSTOM_DOMAIN_SETTING_KEY,
          setting_value: normalizedDomain,
          category: 'branding',
        },
      })

  await createAuditLog({
    school_id: params.schoolId,
    user_id: params.userId,
    action: existing ? 'UPDATE' : 'CREATE',
    entity_type: 'school_setting',
    entity_id: saved.id,
    old_value: existing
      ? {
          setting_key: TENANT_CUSTOM_DOMAIN_SETTING_KEY,
          setting_value: existing.setting_value,
        }
      : undefined,
    new_value: {
      setting_key: TENANT_CUSTOM_DOMAIN_SETTING_KEY,
      setting_value: normalizedDomain,
      provider_status: cloudflareResult.provider_status,
      cloudflare_hostname_id: cloudflareResult.cloudflare_hostname_id,
    },
    ...params.metadata,
  })

  await cacheDel(`tenant:host:${normalizedDomain}`)

  return {
    domain: normalizedDomain,
    provider_status: cloudflareResult.provider_status,
    cloudflare_hostname_id: cloudflareResult.cloudflare_hostname_id,
  }
}
