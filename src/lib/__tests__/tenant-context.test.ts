import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  cacheGet: vi.fn(),
  cacheSet: vi.fn(),
  schoolFindFirst: vi.fn(),
  schoolSettingFindFirst: vi.fn(),
  nextHeaders: vi.fn(),
  loggerWarn: vi.fn(),
}))

vi.mock('@/lib/cache', () => ({
  cacheGet: mocks.cacheGet,
  cacheSet: mocks.cacheSet,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    warn: mocks.loggerWarn,
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    school: {
      findFirst: mocks.schoolFindFirst,
    },
    schoolSetting: {
      findFirst: mocks.schoolSettingFindFirst,
    },
  },
}))

vi.mock('next/headers', () => ({
  headers: mocks.nextHeaders,
}))

import {
  buildTenantCssVariables,
  extractSubdomainFromHost,
  getSchoolYearLabel,
  getTenantBrandingBySchoolId,
  getTenantBrandingFromHeaders,
  resolveTenantByHost,
  sanitizeHost,
} from '@/lib/tenant-context'

const defaultSchoolRecord = {
  id: 'school-1',
  name: 'Vidya Bharathi',
  slug: 'vbhs',
  logo_url: 'https://cdn.schoolos.in/vbhs.png',
  is_active: true,
}

describe('tenant-context', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.cacheGet.mockResolvedValue(null)
    mocks.cacheSet.mockResolvedValue(undefined)
    mocks.schoolFindFirst.mockResolvedValue(null)
    mocks.schoolSettingFindFirst.mockResolvedValue(null)
    mocks.nextHeaders.mockResolvedValue(new Headers())
  })

  it('TEST-TC-001: sanitizeHost strips ports and lowercases values', () => {
    expect(sanitizeHost('VBHS.schoolos.in:3000')).toBe('vbhs.schoolos.in')
    expect(sanitizeHost('vbhs.schoolos.in:443, proxy.schoolos.in')).toBe('vbhs.schoolos.in')
    expect(sanitizeHost('')).toBeNull()
  })

  it('TEST-TC-002: extractSubdomainFromHost extracts tenant slugs correctly', () => {
    expect(extractSubdomainFromHost('vbhs.schoolos.in')).toBe('vbhs')
    expect(extractSubdomainFromHost('VBHS.schoolos.in:443')).toBe('vbhs')
    expect(extractSubdomainFromHost('localhost')).toBeNull()
    expect(extractSubdomainFromHost('demo.localhost')).toBe('demo')
  })

  it('TEST-TC-003: resolveTenantByHost resolves subdomain hosts to school records', async () => {
    mocks.schoolFindFirst.mockResolvedValue(defaultSchoolRecord)

    const result = await resolveTenantByHost('vbhs.schoolos.in')

    expect(mocks.schoolFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: 'vbhs' },
      })
    )
    expect(mocks.cacheSet).toHaveBeenCalledWith(
      'tenant:host:vbhs.schoolos.in',
      expect.objectContaining({
        schoolId: 'school-1',
        hostType: 'subdomain',
      }),
      600
    )
    expect(result).toEqual(
      expect.objectContaining({
        schoolId: 'school-1',
        schoolName: 'Vidya Bharathi',
        slug: 'vbhs',
        hostType: 'subdomain',
        host: 'vbhs.schoolos.in',
      })
    )
  })

  it('TEST-TC-004: resolveTenantByHost supports custom domain lookup via school settings', async () => {
    mocks.schoolSettingFindFirst.mockResolvedValue({
      school: {
        ...defaultSchoolRecord,
        slug: 'custom-school',
      },
    })

    const result = await resolveTenantByHost('vidhyabharthi.com')

    expect(mocks.schoolFindFirst).not.toHaveBeenCalled()
    expect(mocks.schoolSettingFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          setting_key: 'custom_domain',
          setting_value: 'vidhyabharthi.com',
        },
      })
    )
    expect(result).toEqual(
      expect.objectContaining({
        schoolId: 'school-1',
        slug: 'custom-school',
        hostType: 'custom-domain',
      })
    )
  })

  it('TEST-TC-005: resolveTenantByHost returns cached values without querying Prisma', async () => {
    mocks.cacheGet.mockResolvedValue({
      schoolId: 'school-2',
      schoolName: 'Cached School',
      slug: 'cached',
      logoUrl: null,
      hostType: 'subdomain',
      host: 'cached.schoolos.in',
      isActive: true,
    })

    const result = await resolveTenantByHost('cached.schoolos.in')

    expect(mocks.schoolFindFirst).not.toHaveBeenCalled()
    expect(mocks.schoolSettingFindFirst).not.toHaveBeenCalled()
    expect(result?.schoolId).toBe('school-2')
  })

  it('TEST-TC-006: resolveTenantByHost returns null for unknown hosts', async () => {
    const result = await resolveTenantByHost('unknown.schoolos.in')

    expect(result).toBeNull()
    expect(mocks.cacheSet).toHaveBeenCalledWith(
      'tenant:host:unknown.schoolos.in',
      null,
      600
    )
  })

  it('TEST-TC-007: getTenantBrandingBySchoolId returns branding with computed HSL values', async () => {
    mocks.schoolFindFirst.mockResolvedValue({
      id: 'school-1',
      name: 'Vidya Bharathi',
      slug: 'vbhs',
      logo_url: 'https://cdn.schoolos.in/logo.png',
      settings: [
        { setting_key: 'brand_primary', setting_value: '#1e40af' },
        { setting_key: 'brand_accent', setting_value: '#f59e0b' },
      ],
    })

    const branding = await getTenantBrandingBySchoolId('school-1')

    expect(branding).toEqual(
      expect.objectContaining({
        schoolId: 'school-1',
        schoolName: 'Vidya Bharathi',
        schoolSlug: 'vbhs',
        primaryColor: '#1e40af',
        accentColor: '#f59e0b',
        primaryHsl: expect.any(String),
        accentHsl: expect.any(String),
        primaryForegroundHsl: expect.any(String),
      })
    )
  })

  it('TEST-TC-008: getTenantBrandingBySchoolId returns default branding for null school id', async () => {
    const branding = await getTenantBrandingBySchoolId(null)

    expect(branding).toEqual(
      expect.objectContaining({
        schoolId: null,
        schoolName: 'SchoolOS',
        schoolSlug: null,
        primaryColor: '#1d4ed8',
        accentColor: '#f59e0b',
      })
    )
  })

  it('TEST-TC-009: getTenantBrandingFromHeaders resolves branding from x-school-id header', async () => {
    mocks.schoolFindFirst.mockResolvedValue({
      id: 'school-9',
      name: 'Header School',
      slug: 'header-school',
      logo_url: null,
      settings: [],
    })

    const branding = await getTenantBrandingFromHeaders(
      new Headers({
        'x-school-id': 'school-9',
      })
    )

    expect(mocks.schoolFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'school-9',
          is_active: true,
        },
      })
    )
    expect(branding.schoolId).toBe('school-9')
  })

  it('TEST-TC-010: getTenantBrandingFromHeaders falls back to host-based tenant resolution', async () => {
    mocks.schoolFindFirst.mockImplementation(async (args) => {
      if (args.where?.slug === 'vbhs') {
        return {
          ...defaultSchoolRecord,
          logo_url: null,
        }
      }

      if (args.where?.id === 'school-1') {
        return {
          id: 'school-1',
          name: 'Vidya Bharathi',
          slug: 'vbhs',
          logo_url: null,
          settings: [],
        }
      }

      return null
    })

    const branding = await getTenantBrandingFromHeaders(
      new Headers({
        host: 'vbhs.schoolos.in',
      })
    )

    expect(branding).toEqual(
      expect.objectContaining({
        schoolId: 'school-1',
        schoolName: 'Vidya Bharathi',
        schoolSlug: 'vbhs',
      })
    )
  })

  it('TEST-TC-011: buildTenantCssVariables returns expected CSS custom properties', () => {
    const cssVars = buildTenantCssVariables({
      schoolId: 'school-1',
      schoolName: 'Vidya Bharathi',
      schoolSlug: 'vbhs',
      logoUrl: null,
      primaryColor: '#1e40af',
      accentColor: '#f59e0b',
      primaryHsl: '224 71.4% 32.9%',
      accentHsl: '37 92.1% 50.2%',
      primaryForegroundHsl: '210 40% 98%',
    })

    expect(cssVars).toEqual(
      expect.objectContaining({
        '--primary': '224 71.4% 32.9%',
        '--primary-foreground': '210 40% 98%',
        '--ring': '224 71.4% 32.9%',
        '--tenant-primary': '#1e40af',
        '--tenant-accent': '#f59e0b',
      })
    )
  })

  it('TEST-TC-012: getSchoolYearLabel returns expected labels by academic start month', () => {
    expect(getSchoolYearLabel(6, new Date('2026-07-01T00:00:00.000Z'))).toBe('2026-2027')
    expect(getSchoolYearLabel(6, new Date('2026-01-10T00:00:00.000Z'))).toBe('2025-2026')
    expect(getSchoolYearLabel(15, new Date('2026-01-10T00:00:00.000Z'))).toBe('2025-2026')
  })

  it('TEST-TC-013: color normalization supports short/full hex and falls back on invalid values', async () => {
    mocks.schoolFindFirst.mockResolvedValue({
      id: 'school-hex',
      name: 'Hex School',
      slug: 'hex',
      logo_url: null,
      settings: [
        { setting_key: 'brand_primary', setting_value: '#AbC' },
        { setting_key: 'brand_accent', setting_value: 'not-a-hex' },
      ],
    })

    const branding = await getTenantBrandingBySchoolId('school-hex')

    expect(branding.primaryColor).toBe('#aabbcc')
    expect(branding.accentColor).toBe('#f59e0b')
  })

  it('TEST-TC-014: accessible foreground color flips for dark and light primary colors', async () => {
    mocks.schoolFindFirst.mockImplementation(async (args) => {
      if (args.where?.id === 'dark-school') {
        return {
          id: 'dark-school',
          name: 'Dark School',
          slug: 'dark',
          logo_url: null,
          settings: [{ setting_key: 'brand_primary', setting_value: '#000000' }],
        }
      }

      if (args.where?.id === 'light-school') {
        return {
          id: 'light-school',
          name: 'Light School',
          slug: 'light',
          logo_url: null,
          settings: [{ setting_key: 'brand_primary', setting_value: '#ffffff' }],
        }
      }

      return null
    })

    const darkBranding = await getTenantBrandingBySchoolId('dark-school')
    const lightBranding = await getTenantBrandingBySchoolId('light-school')

    expect(darkBranding.primaryForegroundHsl).toBe('210 40% 98%')
    expect(lightBranding.primaryForegroundHsl).toBe('222.2 47.4% 11.2%')
  })
})
