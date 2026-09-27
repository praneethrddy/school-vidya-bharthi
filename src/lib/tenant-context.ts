import { headers as nextHeaders } from 'next/headers'
import { cacheGet, cacheSet } from '@/lib/cache'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import {
  extractSubdomainFromHost as extractHostSubdomain,
  sanitizeHost as sanitizeTenantHost,
} from '@/lib/tenant-hosts'

export { getPlatformRootUrl, isLikelyCustomDomainHost, isLocalHost } from '@/lib/tenant-hosts'

export function sanitizeHost(host: string | null | undefined): string | null {
  return sanitizeTenantHost(host)
}

export function extractSubdomainFromHost(host: string | null | undefined): string | null {
  return extractHostSubdomain(host)
}

export const TENANT_PRIMARY_COLOR_SETTING_KEY = 'brand_primary'
export const TENANT_ACCENT_COLOR_SETTING_KEY = 'brand_accent'
export const TENANT_CUSTOM_DOMAIN_SETTING_KEY = 'custom_domain'
export const TENANT_PLATFORM_PLAN_SETTING_KEY = 'platform_plan'
export const TENANT_PLATFORM_STATUS_SETTING_KEY = 'platform_subscription_status'

export interface TenantBranding {
  schoolId: string | null
  schoolName: string
  schoolSlug: string | null
  logoUrl: string | null
  primaryColor: string
  accentColor: string
  primaryHsl: string
  accentHsl: string
  primaryForegroundHsl: string
}

export interface TenantResolution {
  schoolId: string
  schoolName: string
  slug: string
  logoUrl: string | null
  hostType: 'subdomain' | 'custom-domain'
  host: string
  isActive: boolean
}

const DEFAULT_PRIMARY_COLOR = '#1d4ed8'
const DEFAULT_ACCENT_COLOR = '#f59e0b'
const DEFAULT_FOREGROUND_DARK = '222.2 47.4% 11.2%'
const DEFAULT_FOREGROUND_LIGHT = '210 40% 98%'

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum)
}

function normalizeHexColor(value: string | null | undefined, fallback: string): string {
  if (!value) {
    return fallback
  }

  const raw = value.trim()
  const shortHexMatch = /^#([0-9a-f]{3})$/i.exec(raw)
  if (shortHexMatch) {
    return `#${shortHexMatch[1]
      .split('')
      .map((char) => `${char}${char}`)
      .join('')
      .toLowerCase()}`
  }

  const fullHexMatch = /^#([0-9a-f]{6})$/i.exec(raw)
  if (fullHexMatch) {
    return `#${fullHexMatch[1].toLowerCase()}`
  }

  return fallback
}

function hexToRgb(hex: string) {
  const normalized = normalizeHexColor(hex, DEFAULT_PRIMARY_COLOR).slice(1)
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

function rgbToHslString(rgb: { r: number; g: number; b: number }): string {
  const red = rgb.r / 255
  const green = rgb.g / 255
  const blue = rgb.b / 255

  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const delta = max - min

  let hue = 0
  let saturation = 0
  const lightness = (max + min) / 2

  if (delta !== 0) {
    saturation =
      lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min)

    switch (max) {
      case red:
        hue = (green - blue) / delta + (green < blue ? 6 : 0)
        break
      case green:
        hue = (blue - red) / delta + 2
        break
      default:
        hue = (red - green) / delta + 4
        break
    }

    hue /= 6
  }

  const hueValue = Math.round(hue * 360 * 10) / 10
  const saturationValue = Math.round(saturation * 1000) / 10
  const lightnessValue = Math.round(lightness * 1000) / 10

  return `${hueValue} ${saturationValue}% ${lightnessValue}%`
}

function getAccessibleForegroundHsl(hex: string): string {
  const { r, g, b } = hexToRgb(hex)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? DEFAULT_FOREGROUND_DARK : DEFAULT_FOREGROUND_LIGHT
}

function buildBranding(params: {
  schoolId: string | null
  schoolName: string
  schoolSlug: string | null
  logoUrl: string | null
  primaryColor?: string | null
  accentColor?: string | null
}): TenantBranding {
  const primaryColor = normalizeHexColor(
    params.primaryColor,
    DEFAULT_PRIMARY_COLOR
  )
  const accentColor = normalizeHexColor(params.accentColor, DEFAULT_ACCENT_COLOR)

  return {
    schoolId: params.schoolId,
    schoolName: params.schoolName,
    schoolSlug: params.schoolSlug,
    logoUrl: params.logoUrl,
    primaryColor,
    accentColor,
    primaryHsl: rgbToHslString(hexToRgb(primaryColor)),
    accentHsl: rgbToHslString(hexToRgb(accentColor)),
    primaryForegroundHsl: getAccessibleForegroundHsl(primaryColor),
  }
}

async function getRequestHeaders(providedHeaders?: Headers): Promise<Headers> {
  if (providedHeaders) {
    return providedHeaders
  }

  return await nextHeaders()
}

export async function resolveTenantByHost(
  rawHost: string | null | undefined
): Promise<TenantResolution | null> {
  const host = sanitizeHost(rawHost)
  if (!host) {
    return null
  }

  const cacheKey = `tenant:host:${host}`

  try {
    const cached = await cacheGet<TenantResolution | null>(cacheKey)
    if (cached !== null) {
      return cached
    }
  } catch (error) {
    logger.warn({ error, host }, 'Tenant host cache read failed')
  }

  const subdomain = extractSubdomainFromHost(host)

  const school =
    (subdomain
      ? await prisma.school.findFirst({
          where: {
            slug: subdomain,
          },
          select: {
            id: true,
            name: true,
            slug: true,
            logo_url: true,
            is_active: true,
          },
        })
      : null) ||
    (await prisma.schoolSetting.findFirst({
      where: {
        setting_key: TENANT_CUSTOM_DOMAIN_SETTING_KEY,
        setting_value: host,
      },
      select: {
        school: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo_url: true,
            is_active: true,
          },
        },
      },
    }).then((record) => record?.school || null))

  const result = school
    ? {
        schoolId: school.id,
        schoolName: school.name,
        slug: school.slug,
        logoUrl: school.logo_url,
        hostType: (subdomain ? 'subdomain' : 'custom-domain') as
          | 'subdomain'
          | 'custom-domain',
        host,
        isActive: school.is_active,
      }
    : null

  try {
    await cacheSet(cacheKey, result, 60 * 10)
  } catch (error) {
    logger.warn({ error, host }, 'Tenant host cache write failed')
  }

  return result
}

export async function getTenantBrandingBySchoolId(
  schoolId: string | null | undefined
): Promise<TenantBranding> {
  if (!schoolId) {
    return buildBranding({
      schoolId: null,
      schoolName: 'SchoolOS',
      schoolSlug: null,
      logoUrl: null,
      primaryColor: DEFAULT_PRIMARY_COLOR,
      accentColor: DEFAULT_ACCENT_COLOR,
    })
  }

  const cacheKey = `tenant:branding:${schoolId}`
  try {
    const cached = await cacheGet<TenantBranding>(cacheKey)
    if (cached) {
      return cached
    }
  } catch (error) {
    logger.warn({ error, schoolId }, 'Tenant branding cache read failed')
  }

  const school = await prisma.school.findFirst({
    where: {
      id: schoolId,
      is_active: true,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      logo_url: true,
      settings: {
        where: {
          setting_key: {
            in: [
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
    },
  })

  const settingsMap = new Map(
    (school?.settings || []).map((setting) => [setting.setting_key, setting.setting_value])
  )

  const branding = buildBranding({
    schoolId: school?.id || schoolId,
    schoolName: school?.name || 'SchoolOS',
    schoolSlug: school?.slug || null,
    logoUrl: school?.logo_url || null,
    primaryColor: settingsMap.get(TENANT_PRIMARY_COLOR_SETTING_KEY),
    accentColor: settingsMap.get(TENANT_ACCENT_COLOR_SETTING_KEY),
  })

  try {
    await cacheSet(cacheKey, branding, 60 * 10)
  } catch (error) {
    logger.warn({ error, schoolId }, 'Tenant branding cache write failed')
  }

  return branding
}

export async function getTenantBrandingFromHeaders(
  providedHeaders?: Headers
): Promise<TenantBranding> {
  const requestHeaders = await getRequestHeaders(providedHeaders)
  const schoolId = requestHeaders.get('x-school-id')

  if (schoolId) {
    return getTenantBrandingBySchoolId(schoolId)
  }

  const host =
    requestHeaders.get('x-tenant-host') ||
    requestHeaders.get('x-forwarded-host') ||
    requestHeaders.get('host')

  const resolvedTenant = await resolveTenantByHost(host)
  if (resolvedTenant?.schoolId && resolvedTenant.isActive) {
    return getTenantBrandingBySchoolId(resolvedTenant.schoolId)
  }

  return buildBranding({
    schoolId: null,
    schoolName: 'SchoolOS',
    schoolSlug: null,
    logoUrl: null,
    primaryColor: DEFAULT_PRIMARY_COLOR,
    accentColor: DEFAULT_ACCENT_COLOR,
  })
}

export async function resolveTenantFromHeaders(
  providedHeaders?: Headers
): Promise<TenantResolution | null> {
  const requestHeaders = await getRequestHeaders(providedHeaders)
  const schoolId = requestHeaders.get('x-school-id')
  const schoolSlug = requestHeaders.get('x-school-slug')

  if (schoolId && schoolSlug) {
    const branding = await getTenantBrandingBySchoolId(schoolId)
    return {
      schoolId,
      schoolName: branding.schoolName,
      slug: schoolSlug,
      logoUrl: branding.logoUrl,
      hostType: 'subdomain',
      host:
        sanitizeHost(
          requestHeaders.get('x-tenant-host') ||
            requestHeaders.get('x-forwarded-host') ||
            requestHeaders.get('host')
        ) || 'unknown',
      isActive: true,
    }
  }

  return resolveTenantByHost(
    requestHeaders.get('x-tenant-host') ||
      requestHeaders.get('x-forwarded-host') ||
      requestHeaders.get('host')
  )
}

export function buildTenantCssVariables(branding: TenantBranding) {
  return {
    '--primary': branding.primaryHsl,
    '--primary-foreground': branding.primaryForegroundHsl,
    '--ring': branding.primaryHsl,
    '--tenant-primary': branding.primaryColor,
    '--tenant-accent': branding.accentColor,
    '--tenant-primary-hsl': branding.primaryHsl,
    '--tenant-accent-hsl': branding.accentHsl,
  } as Record<string, string>
}

export function getSchoolYearLabel(startMonth = 6, now = new Date()) {
  const normalizedMonth = clamp(startMonth, 1, 12)
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth() + 1
  const startYear = month >= normalizedMonth ? year : year - 1
  return `${startYear}-${startYear + 1}`
}
