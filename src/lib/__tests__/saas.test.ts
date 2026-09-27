import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  schoolCount: vi.fn(),
  userCount: vi.fn(),
  studentCount: vi.fn(),
  staffCount: vi.fn(),
  feePaymentAggregate: vi.fn(),
  schoolFindFirst: vi.fn(),
  schoolUpdate: vi.fn(),
  schoolSettingFindFirst: vi.fn(),
  schoolSettingUpdate: vi.fn(),
  createTenantPrisma: vi.fn(),
  tenantSchoolSettingFindFirst: vi.fn(),
  tenantSchoolSettingCreate: vi.fn(),
  createAuditLog: vi.fn(),
  cacheDel: vi.fn(),
  sendSchoolOnboardingEmail: vi.fn(),
  loggerInfo: vi.fn(),
  loggerWarn: vi.fn(),
  loggerError: vi.fn(),
}))

vi.mock('@/lib/audit', () => ({
  createAuditLog: mocks.createAuditLog,
}))

vi.mock('@/lib/cache', () => ({
  cacheDel: mocks.cacheDel,
}))

vi.mock('@/lib/email', () => ({
  sendSchoolOnboardingEmail: mocks.sendSchoolOnboardingEmail,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: mocks.loggerInfo,
    warn: mocks.loggerWarn,
    error: mocks.loggerError,
  },
}))

vi.mock('@/lib/permission-config', () => ({
  CONFIGURABLE_ROLES: [],
  ROLE_PERMISSION_DEFAULTS: {},
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    school: {
      count: mocks.schoolCount,
      findFirst: mocks.schoolFindFirst,
      update: mocks.schoolUpdate,
    },
    user: {
      count: mocks.userCount,
    },
    student: {
      count: mocks.studentCount,
    },
    staff: {
      count: mocks.staffCount,
    },
    feePayment: {
      aggregate: mocks.feePaymentAggregate,
    },
    schoolSetting: {
      findFirst: mocks.schoolSettingFindFirst,
      update: mocks.schoolSettingUpdate,
    },
  },
  createTenantPrisma: mocks.createTenantPrisma,
}))

vi.mock('@/lib/school-settings', () => ({
  buildDefaultTerms: vi.fn(() => []),
}))

vi.mock('@/lib/tenant-context', () => ({
  getPlatformRootUrl: vi.fn(() => 'http://localhost:3000'),
  getSchoolYearLabel: vi.fn(() => '2026-2027'),
  TENANT_ACCENT_COLOR_SETTING_KEY: 'brand_accent',
  TENANT_CUSTOM_DOMAIN_SETTING_KEY: 'custom_domain',
  TENANT_PLATFORM_PLAN_SETTING_KEY: 'platform_plan',
  TENANT_PLATFORM_STATUS_SETTING_KEY: 'platform_subscription_status',
  TENANT_PRIMARY_COLOR_SETTING_KEY: 'brand_primary',
}))

vi.mock('@/lib/utils', () => ({
  generatePassword: vi.fn(() => 'TempPass123!'),
}))

import {
  customDomainSchema,
  getPlatformAnalytics,
  registerSchoolCustomDomain,
  suspendSchool,
} from '@/lib/saas'

describe('saas library functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    process.env.CLOUDFLARE_API_TOKEN = ''
    process.env.CLOUDFLARE_ZONE_ID = ''

    mocks.createTenantPrisma.mockReturnValue({
      schoolSetting: {
        findFirst: mocks.tenantSchoolSettingFindFirst,
        create: mocks.tenantSchoolSettingCreate,
      },
    })

    mocks.schoolCount.mockResolvedValue(12)
    mocks.userCount.mockResolvedValue(680)
    mocks.studentCount.mockResolvedValue(6100)
    mocks.staffCount.mockResolvedValue(410)
    mocks.feePaymentAggregate.mockResolvedValue({
      _sum: {
        amount_paid: 2450000,
      },
    })
  })

  it('TEST-SAAS-001: getPlatformAnalytics aggregates platform-level counts', async () => {
    mocks.schoolCount.mockResolvedValueOnce(12).mockResolvedValueOnce(10)

    const result = await getPlatformAnalytics()

    expect(mocks.schoolCount).toHaveBeenNthCalledWith(1)
    expect(mocks.schoolCount).toHaveBeenNthCalledWith(2, { where: { is_active: true } })
    expect(result).toEqual({
      total_schools: 12,
      active_schools: 10,
      suspended_schools: 2,
      total_users: 680,
      total_students: 6100,
      total_staff: 410,
      total_mrr: 2450000,
    })
  })

  it('TEST-SAAS-002: suspendSchool sets is_active=false and writes audit log', async () => {
    mocks.schoolFindFirst.mockResolvedValueOnce({
      id: 'school-1',
      name: 'Alpha School',
      is_active: true,
    })
    mocks.schoolUpdate.mockResolvedValueOnce({
      id: 'school-1',
      name: 'Alpha School',
      slug: 'alpha-school',
      is_active: false,
    })

    const updated = await suspendSchool({
      schoolId: 'school-1',
      userId: 'super-1',
      isActive: false,
      metadata: {
        ip_address: '127.0.0.1',
        user_agent: 'vitest-agent',
      },
    })

    expect(updated.is_active).toBe(false)
    expect(mocks.schoolUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'school-1' },
        data: expect.objectContaining({
          is_active: false,
          updated_at: expect.any(Date),
        }),
      })
    )
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        school_id: null,
        user_id: 'super-1',
        action: 'UPDATE',
        entity_type: 'school',
        entity_id: 'school-1',
        old_value: expect.objectContaining({
          id: 'school-1',
          is_active: true,
        }),
        new_value: {
          name: 'Alpha School',
          is_active: false,
        },
        ip_address: '127.0.0.1',
        user_agent: 'vitest-agent',
      })
    )
    expect(mocks.cacheDel).toHaveBeenNthCalledWith(1, 'tenant:host:alpha-school.schoolos.in')
    expect(mocks.cacheDel).toHaveBeenNthCalledWith(2, 'tenant:branding:school-1')
  })

  it('TEST-SAAS-003: suspendSchool reactivates school with is_active=true', async () => {
    mocks.schoolFindFirst.mockResolvedValueOnce({
      id: 'school-1',
      name: 'Alpha School',
      is_active: false,
    })
    mocks.schoolUpdate.mockResolvedValueOnce({
      id: 'school-1',
      name: 'Alpha School',
      slug: 'alpha-school',
      is_active: true,
    })

    const updated = await suspendSchool({
      schoolId: 'school-1',
      userId: 'super-1',
      isActive: true,
    })

    expect(updated.is_active).toBe(true)
    expect(mocks.schoolUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          is_active: true,
        }),
      })
    )
    expect(mocks.createAuditLog).toHaveBeenCalledTimes(1)
  })

  it('TEST-SAAS-004: registerSchoolCustomDomain accepts valid domain and writes audit log', async () => {
    mocks.schoolSettingFindFirst.mockResolvedValueOnce(null)
    mocks.tenantSchoolSettingFindFirst.mockResolvedValueOnce(null)
    mocks.tenantSchoolSettingCreate.mockResolvedValueOnce({
      id: 'setting-1',
    })

    const result = await registerSchoolCustomDomain({
      schoolId: 'school-1',
      userId: 'super-1',
      domain: ' School.Example.com ',
      metadata: {
        ip_address: '127.0.0.1',
        user_agent: 'vitest-agent',
      },
    })

    expect(result).toEqual({
      domain: 'school.example.com',
      provider_status: 'mocked',
      cloudflare_hostname_id: null,
    })
    expect(mocks.createTenantPrisma).toHaveBeenCalledWith({ schoolId: 'school-1' })
    expect(mocks.tenantSchoolSettingCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          school_id: 'school-1',
          setting_key: 'custom_domain',
          setting_value: 'school.example.com',
        }),
      })
    )
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        school_id: 'school-1',
        user_id: 'super-1',
        action: 'CREATE',
        entity_type: 'school_setting',
        entity_id: 'setting-1',
        new_value: expect.objectContaining({
          setting_key: 'custom_domain',
          setting_value: 'school.example.com',
          provider_status: 'mocked',
        }),
      })
    )
    expect(mocks.cacheDel).toHaveBeenCalledWith('tenant:host:school.example.com')
  })

  it('TEST-SAAS-005: duplicate custom domain throws error', async () => {
    mocks.schoolSettingFindFirst.mockResolvedValueOnce({
      id: 'duplicate-setting',
    })

    await expect(
      registerSchoolCustomDomain({
        schoolId: 'school-1',
        userId: 'super-1',
        domain: 'school.example.com',
      })
    ).rejects.toThrow('already connected')

    expect(mocks.createAuditLog).not.toHaveBeenCalled()
    expect(mocks.cacheDel).not.toHaveBeenCalled()
  })

  it('TEST-SAAS-006: customDomainSchema validates domains without protocol', () => {
    const valid = customDomainSchema.safeParse({
      domain: 'school.example.com',
    })
    const invalidWithProtocol = customDomainSchema.safeParse({
      domain: 'https://school.example.com',
    })
    const invalidMalformed = customDomainSchema.safeParse({
      domain: 'school',
    })

    expect(valid.success).toBe(true)
    expect(invalidWithProtocol.success).toBe(false)
    expect(invalidMalformed.success).toBe(false)
  })
})
