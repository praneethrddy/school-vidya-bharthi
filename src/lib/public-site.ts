import type { Metadata } from 'next'
import { headers as nextHeaders } from 'next/headers'
import { FileType } from '@prisma/client'
import { createAuditLog } from '@/lib/audit'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import {
  extractSubdomainFromHost,
  getTenantBrandingBySchoolId,
  isLikelyCustomDomainHost,
  sanitizeHost,
  TENANT_ACCENT_COLOR_SETTING_KEY,
  TENANT_PRIMARY_COLOR_SETTING_KEY,
  resolveTenantFromHeaders,
} from '@/lib/tenant-context'

export interface PublicSchoolInfo {
  id: string | null
  name: string
  slug: string
  logo_url: string | null
  address: string
  city: string
  state: string
  phone: string
  email: string
  website: string
  board: string
  established_year: number
  theme: {
    primary: string
    accent: string
  }
}

export interface PublicAnnouncement {
  id: string
  title: string
  content: string
  type: string
  published_at: string
}

export interface PublicGalleryItem {
  id: string
  title: string
  description: string
  file_url: string
  file_type: 'IMAGE' | 'VIDEO'
  created_at: string
}

export interface PublicGalleryAlbum {
  id: string
  name: string
  description: string
  event_date: string
  cover_image_url: string | null
  photo_count: number
  items: PublicGalleryItem[]
}

export interface PublicLeader {
  id: string
  name: string
  designation: string
  photo_url: string | null
}

export interface PublicHomePageData {
  school: PublicSchoolInfo
  studentCount: number
  staffCount: number
  passPercentage: number
  yearsOfExcellence: number
  announcements: PublicAnnouncement[]
  galleryPreview: PublicGalleryItem[]
}

export interface PublicAboutData {
  school: PublicSchoolInfo
  leaders: PublicLeader[]
}

export interface PublicAcademicsData {
  school: PublicSchoolInfo
  gradingScheme: string
  classLabels: string[]
  subjectsByClass: Array<{
    classLabel: string
    subjects: string[]
  }>
}

const defaultSchool: PublicSchoolInfo = {
  id: null,
  name: 'Vidhya Bharthi High School',
  slug: 'vidhya-bharthi-high-school',
  logo_url: null,
  address: 'Campus Road, Vidya Nagar',
  city: 'Hyderabad',
  state: 'Telangana',
  phone: '+91 98765 43210',
  email: 'info@vidhyabharthi.edu',
  website: 'https://vidhyabharthi.edu',
  board: 'CBSE',
  established_year: 1998,
  theme: {
    primary: '#1d4ed8',
    accent: '#f59e0b',
  },
}

const leadershipKeywords = ['Principal', 'Vice Principal', 'HoD', 'HOD', 'Head']

async function getRequestHeaders(providedHeaders?: Headers): Promise<Headers> {
  if (providedHeaders) {
    return providedHeaders
  }

  return await nextHeaders()
}

function getBaseUrl(): URL {
  return new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
}

function normalizeSchool(
  school:
    | {
        id: string
        name: string
        slug: string
        logo_url: string | null
        address: string | null
        city: string | null
        state: string | null
        phone: string | null
        email: string | null
        website: string | null
        board: string | null
        established_year: number | null
        settings?: Array<{ setting_key: string; setting_value: string }>
      }
    | null
): PublicSchoolInfo {
  if (!school) {
    return defaultSchool
  }

  return {
    id: school.id,
    name: school.name || defaultSchool.name,
    slug: school.slug || defaultSchool.slug,
    logo_url: school.logo_url,
    address: school.address || defaultSchool.address,
    city: school.city || defaultSchool.city,
    state: school.state || defaultSchool.state,
    phone: school.phone || defaultSchool.phone,
    email: school.email || defaultSchool.email,
    website: school.website || defaultSchool.website,
    board: school.board || defaultSchool.board,
    established_year: school.established_year || defaultSchool.established_year,
    theme: {
      primary:
        school.settings?.find((setting) => setting.setting_key === TENANT_PRIMARY_COLOR_SETTING_KEY)
          ?.setting_value || defaultSchool.theme.primary,
      accent:
        school.settings?.find((setting) => setting.setting_key === TENANT_ACCENT_COLOR_SETTING_KEY)
          ?.setting_value || defaultSchool.theme.accent,
    },
  }
}

async function safeQuery<T>(label: string, operation: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    logger.warn({ error, label }, 'Public site query failed, using fallback')
    return fallback
  }
}

async function resolvePublicSchoolRecord(providedHeaders?: Headers) {
  const requestHeaders = await getRequestHeaders(providedHeaders)
  const resolvedTenant = await resolveTenantFromHeaders(requestHeaders)
  const forwardedHost = requestHeaders.get('x-forwarded-host')
  const host = requestHeaders.get('host')
  const explicitHost = sanitizeHost(
    requestHeaders.get('x-tenant-host') || forwardedHost || host
  )
  const slugFromHost =
    resolvedTenant?.slug || extractSubdomainFromHost(forwardedHost || host)
  const defaultSlug = process.env.PUBLIC_DEFAULT_SCHOOL_SLUG || null

  const school = await safeQuery(
    'resolvePublicSchoolRecord',
    async () => {
      if (slugFromHost) {
        const subdomainSchool = await prisma.school.findFirst({
          where: {
            slug: slugFromHost,
            is_active: true,
          },
          select: {
            id: true,
            name: true,
            slug: true,
            logo_url: true,
            address: true,
            city: true,
            state: true,
            phone: true,
            email: true,
            website: true,
            board: true,
            established_year: true,
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

        if (subdomainSchool) {
          return subdomainSchool
        }

        return null
      }

      if (explicitHost && isLikelyCustomDomainHost(explicitHost) && !resolvedTenant) {
        return null
      }

      if (defaultSlug) {
        const configuredSchool = await prisma.school.findFirst({
          where: {
            slug: defaultSlug,
            is_active: true,
          },
          select: {
            id: true,
            name: true,
            slug: true,
            logo_url: true,
            address: true,
            city: true,
            state: true,
            phone: true,
            email: true,
            website: true,
            board: true,
            established_year: true,
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

        if (configuredSchool) {
          return configuredSchool
        }
      }

      return prisma.school.findFirst({
        where: {
          is_active: true,
        },
        orderBy: {
          created_at: 'asc',
        },
        select: {
          id: true,
          name: true,
          slug: true,
          logo_url: true,
          address: true,
          city: true,
          state: true,
          phone: true,
          email: true,
          website: true,
          board: true,
          established_year: true,
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
    },
    null
  )

  return school
}

export async function getPublicSchoolInfo(providedHeaders?: Headers): Promise<PublicSchoolInfo> {
  const school = await resolvePublicSchoolRecord(providedHeaders)
  const normalizedSchool = normalizeSchool(school)

  if (!normalizedSchool.id) {
    return normalizedSchool
  }

  const branding = await getTenantBrandingBySchoolId(normalizedSchool.id)
  return {
    ...normalizedSchool,
    theme: {
      primary: branding.primaryColor,
      accent: branding.accentColor,
    },
  }
}

export async function getPublicHomePageData(
  providedHeaders?: Headers
): Promise<PublicHomePageData> {
  const school = await getPublicSchoolInfo(providedHeaders)

  if (!school.id) {
    return {
      school,
      studentCount: 1200,
      staffCount: 95,
      passPercentage: 98,
      yearsOfExcellence: new Date().getFullYear() - school.established_year,
      announcements: [],
      galleryPreview: [],
    }
  }

  const [studentCount, staffCount, passPercentageSetting, announcements, galleryPreview] =
    await Promise.all([
      safeQuery(
        'home.studentCount',
        () =>
          prisma.student.count({
            where: {
              school_id: school.id as string,
              is_active: true,
            },
          }),
        1200
      ),
      safeQuery(
        'home.staffCount',
        () =>
          prisma.staff.count({
            where: {
              school_id: school.id as string,
              is_active: true,
            },
          }),
        95
      ),
      safeQuery(
        'home.passPercentageSetting',
        () =>
          prisma.schoolSetting.findFirst({
            where: {
              school_id: school.id as string,
              setting_key: 'public_pass_percentage',
            },
            select: {
              setting_value: true,
            },
          }),
        null
      ),
      safeQuery(
        'home.announcements',
        () =>
          prisma.announcement.findMany({
            where: {
              school_id: school.id as string,
              is_published: true,
              OR: [{ expires_at: null }, { expires_at: { gt: new Date() } }],
            },
            orderBy: [{ published_at: 'desc' }, { created_at: 'desc' }],
            take: 3,
            select: {
              id: true,
              title: true,
              content: true,
              type: true,
              published_at: true,
              created_at: true,
            },
          }),
        []
      ),
      safeQuery(
        'home.galleryPreview',
        () =>
          prisma.gallery.findMany({
            where: {
              school_id: school.id as string,
              is_published: true,
              file_type: FileType.IMAGE,
            },
            orderBy: {
              created_at: 'desc',
            },
            take: 6,
            select: {
              id: true,
              title: true,
              description: true,
              file_url: true,
              file_type: true,
              created_at: true,
            },
          }),
        []
      ),
    ])

  return {
    school,
    studentCount,
    staffCount,
    passPercentage: Number(passPercentageSetting?.setting_value || 98),
    yearsOfExcellence: Math.max(new Date().getFullYear() - school.established_year, 1),
    announcements: announcements.map((announcement) => ({
      id: announcement.id,
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      published_at: (announcement.published_at || announcement.created_at).toISOString(),
    })),
    galleryPreview: galleryPreview.map((item) => ({
      id: item.id,
      title: item.title || school.name,
      description: item.description || '',
      file_url: item.file_url,
      file_type: item.file_type,
      created_at: item.created_at.toISOString(),
    })),
  }
}

export async function getPublicAboutData(providedHeaders?: Headers): Promise<PublicAboutData> {
  const school = await getPublicSchoolInfo(providedHeaders)

  if (!school.id) {
    return {
      school,
      leaders: [],
    }
  }

  const leaders = await safeQuery(
    'about.leaders',
    () =>
      prisma.staff.findMany({
        where: {
          school_id: school.id as string,
          is_active: true,
          OR: leadershipKeywords.map((keyword) => ({
            designation: {
              contains: keyword,
              mode: 'insensitive',
            },
          })),
        },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          designation: true,
          photo_url: true,
        },
        take: 6,
        orderBy: [{ designation: 'asc' }, { first_name: 'asc' }],
      }),
    []
  )

  return {
    school,
    leaders: leaders.map((leader) => ({
      id: leader.id,
      name: `${leader.first_name} ${leader.last_name}`.trim(),
      designation: leader.designation || 'Faculty Lead',
      photo_url: leader.photo_url,
    })),
  }
}

export async function getPublicAcademicsData(
  providedHeaders?: Headers
): Promise<PublicAcademicsData> {
  const school = await getPublicSchoolInfo(providedHeaders)

  if (!school.id) {
    return {
      school,
      gradingScheme: 'PERCENTAGE',
      classLabels: ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'],
      subjectsByClass: [],
    }
  }

  const currentAcademicYear = await safeQuery(
    'academics.currentAcademicYear',
    () =>
      prisma.academicYear.findFirst({
        where: {
          school_id: school.id as string,
          is_current: true,
        },
        select: {
          id: true,
        },
      }),
    null
  )

  const [gradingSchemeSetting, classes, subjects] = await Promise.all([
    safeQuery(
      'academics.gradingScheme',
      () =>
        prisma.schoolSetting.findFirst({
          where: {
            school_id: school.id as string,
            setting_key: 'grading_scheme',
          },
          select: {
            setting_value: true,
          },
        }),
      null
    ),
    safeQuery(
      'academics.classes',
      () =>
        prisma.class.findMany({
          where: {
            school_id: school.id as string,
            ...(currentAcademicYear?.id ? { academic_year_id: currentAcademicYear.id } : {}),
          },
          select: {
            id: true,
            name: true,
            section: true,
          },
          orderBy: [{ name: 'asc' }, { section: 'asc' }],
        }),
      []
    ),
    safeQuery(
      'academics.subjects',
      () =>
        prisma.subject.findMany({
          where: {
            school_id: school.id as string,
            ...(currentAcademicYear?.id
              ? {
                  class: {
                    academic_year_id: currentAcademicYear.id,
                  },
                }
              : {}),
          },
          select: {
            id: true,
            name: true,
            class_id: true,
          },
          orderBy: [{ name: 'asc' }],
        }),
      []
    ),
  ])

  const classLookup = new Map(
    classes.map((classItem) => [
      classItem.id,
      `${classItem.name}${classItem.section ? ` - ${classItem.section}` : ''}`,
    ])
  )

  const groupedSubjects = new Map<string, Set<string>>()
  subjects.forEach((subject) => {
    const classLabel = classLookup.get(subject.class_id)
    if (!classLabel) {
      return
    }

    const subjectSet = groupedSubjects.get(classLabel) || new Set<string>()
    subjectSet.add(subject.name)
    groupedSubjects.set(classLabel, subjectSet)
  })

  const classLabels = Array.from(new Set(classes.map((classItem) => classItem.name)))

  return {
    school,
    gradingScheme: gradingSchemeSetting?.setting_value || 'PERCENTAGE',
    classLabels,
    subjectsByClass: Array.from(groupedSubjects.entries()).map(([classLabel, subjectSet]) => ({
      classLabel,
      subjects: Array.from(subjectSet),
    })),
  }
}

export async function getPublicGalleryAlbums(
  providedHeaders?: Headers
): Promise<{ school: PublicSchoolInfo; albums: PublicGalleryAlbum[] }> {
  const school = await getPublicSchoolInfo(providedHeaders)

  if (!school.id) {
    return {
      school,
      albums: [],
    }
  }

  const albums = await safeQuery(
    'gallery.albums',
    () =>
      prisma.galleryAlbum.findMany({
        where: {
          school_id: school.id as string,
          is_published: true,
        },
        orderBy: {
          event_date: 'desc',
        },
        select: {
          id: true,
          name: true,
          description: true,
          event_date: true,
          cover_image_url: true,
          galleries: {
            where: {
              school_id: school.id as string,
              is_published: true,
            },
            orderBy: {
              created_at: 'desc',
            },
            select: {
              id: true,
              title: true,
              description: true,
              file_url: true,
              file_type: true,
              created_at: true,
            },
          },
        },
      }),
    []
  )

  return {
    school,
    albums: albums.map((album) => {
      const items = album.galleries.map((item) => ({
        id: item.id,
        title: item.title || album.name,
        description: item.description || '',
        file_url: item.file_url,
        file_type: item.file_type,
        created_at: item.created_at.toISOString(),
      }))

      return {
        id: album.id,
        name: album.name,
        description: album.description || '',
        event_date: album.event_date.toISOString(),
        cover_image_url: album.cover_image_url || items[0]?.file_url || null,
        photo_count: items.length,
        items,
      }
    }),
  }
}

export async function getPublicContactRecipient(providedHeaders?: Headers): Promise<{
  school: PublicSchoolInfo
  email: string
}> {
  const school = await getPublicSchoolInfo(providedHeaders)
  return {
    school,
    email: school.email || process.env.PUBLIC_CONTACT_EMAIL || defaultSchool.email,
  }
}

async function resolvePublicAuditActorUserId(schoolId: string): Promise<string | null> {
  const principal = await safeQuery(
    'publicAudit.principal',
    () =>
      prisma.user.findFirst({
        where: {
          school_id: schoolId,
          role: 'PRINCIPAL',
          is_active: true,
        },
        select: {
          id: true,
        },
      }),
    null
  )

  if (principal?.id) {
    return principal.id
  }

  const fallbackUser = await safeQuery(
    'publicAudit.fallbackUser',
    () =>
      prisma.user.findFirst({
        where: {
          school_id: schoolId,
          is_active: true,
        },
        orderBy: {
          created_at: 'asc',
        },
        select: {
          id: true,
        },
      }),
    null
  )

  return fallbackUser?.id || null
}

export async function createPublicAuditEntry(params: {
  schoolId: string | null
  entityId: string
  newValue: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}): Promise<void> {
  if (!params.schoolId) {
    return
  }

  const userId = await resolvePublicAuditActorUserId(params.schoolId)
  if (!userId) {
    logger.warn({ schoolId: params.schoolId }, 'Skipping public audit log because no actor user exists')
    return
  }

  await createAuditLog({
    school_id: params.schoolId,
    user_id: userId,
    action: 'CREATE',
    entity_type: 'public_contact',
    entity_id: params.entityId,
    new_value: params.newValue,
    ip_address: params.ipAddress,
    user_agent: params.userAgent,
  })
}

export async function buildPublicMetadata(params: {
  title: string
  description: string
  path?: string
  providedHeaders?: Headers
}): Promise<Metadata> {
  const school = await getPublicSchoolInfo(params.providedHeaders)
  const url = new URL(params.path || '/', getBaseUrl())

  return {
    metadataBase: getBaseUrl(),
    title: params.title,
    description: params.description,
    openGraph: {
      title: params.title,
      description: params.description,
      url: url.toString(),
      siteName: school.name,
      type: 'website',
    },
    alternates: {
      canonical: url.toString(),
    },
  }
}
