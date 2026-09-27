import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  nextHeaders: vi.fn(),
  resolveTenantFromHeaders: vi.fn(),
  sanitizeHost: vi.fn(),
  extractSubdomainFromHost: vi.fn(),
  isLikelyCustomDomainHost: vi.fn(),
  getTenantBrandingBySchoolId: vi.fn(),
  schoolFindFirst: vi.fn(),
  studentCount: vi.fn(),
  staffCount: vi.fn(),
  schoolSettingFindFirst: vi.fn(),
  announcementFindMany: vi.fn(),
  galleryFindMany: vi.fn(),
  staffFindMany: vi.fn(),
  academicYearFindFirst: vi.fn(),
  classFindMany: vi.fn(),
  subjectFindMany: vi.fn(),
  galleryAlbumFindMany: vi.fn(),
  userFindFirst: vi.fn(),
  createAuditLog: vi.fn(),
  loggerWarn: vi.fn(),
}))

vi.mock('next/headers', () => ({
  headers: mocks.nextHeaders,
}))

vi.mock('@/lib/tenant-context', () => ({
  TENANT_PRIMARY_COLOR_SETTING_KEY: 'branding.primary_color',
  TENANT_ACCENT_COLOR_SETTING_KEY: 'branding.accent_color',
  resolveTenantFromHeaders: mocks.resolveTenantFromHeaders,
  sanitizeHost: mocks.sanitizeHost,
  extractSubdomainFromHost: mocks.extractSubdomainFromHost,
  isLikelyCustomDomainHost: mocks.isLikelyCustomDomainHost,
  getTenantBrandingBySchoolId: mocks.getTenantBrandingBySchoolId,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    school: {
      findFirst: mocks.schoolFindFirst,
    },
    student: {
      count: mocks.studentCount,
    },
    staff: {
      count: mocks.staffCount,
      findMany: mocks.staffFindMany,
    },
    schoolSetting: {
      findFirst: mocks.schoolSettingFindFirst,
    },
    announcement: {
      findMany: mocks.announcementFindMany,
    },
    gallery: {
      findMany: mocks.galleryFindMany,
    },
    academicYear: {
      findFirst: mocks.academicYearFindFirst,
    },
    class: {
      findMany: mocks.classFindMany,
    },
    subject: {
      findMany: mocks.subjectFindMany,
    },
    galleryAlbum: {
      findMany: mocks.galleryAlbumFindMany,
    },
    user: {
      findFirst: mocks.userFindFirst,
    },
  },
}))

vi.mock('@/lib/audit', () => ({
  createAuditLog: mocks.createAuditLog,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    warn: mocks.loggerWarn,
  },
}))

import {
  buildPublicMetadata,
  createPublicAuditEntry,
  getPublicGalleryAlbums,
  getPublicHomePageData,
  getPublicSchoolInfo,
} from '@/lib/public-site'

const schoolRecord = {
  id: 'school-1',
  name: 'Green Valley School',
  slug: 'green-valley-school',
  logo_url: 'https://example.com/logo.png',
  address: 'Campus Road',
  city: 'Hyderabad',
  state: 'Telangana',
  phone: '+91 98765 43210',
  email: 'hello@greenvalley.school',
  website: 'https://greenvalley.school',
  board: 'CBSE',
  established_year: 2005,
  settings: [
    { setting_key: 'branding.primary_color', setting_value: '#0f172a' },
    { setting_key: 'branding.accent_color', setting_value: '#f97316' },
  ],
}

describe('public-site service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.nextHeaders.mockResolvedValue(new Headers({ host: 'green.schoolos.test' }))
    mocks.resolveTenantFromHeaders.mockResolvedValue(null)
    mocks.sanitizeHost.mockImplementation((value: string | null) => value ?? '')
    mocks.extractSubdomainFromHost.mockReturnValue('green-valley-school')
    mocks.isLikelyCustomDomainHost.mockReturnValue(false)
    mocks.getTenantBrandingBySchoolId.mockResolvedValue({
      primaryColor: '#123456',
      accentColor: '#654321',
    })
    mocks.schoolFindFirst.mockResolvedValue(schoolRecord)

    mocks.studentCount.mockResolvedValue(1320)
    mocks.staffCount.mockResolvedValue(102)
    mocks.schoolSettingFindFirst.mockResolvedValue({
      setting_value: '96',
    })
    mocks.announcementFindMany.mockResolvedValue([
      {
        id: 'ann-1',
        title: 'Exam Schedule',
        content: 'Term exams begin next Monday.',
        type: 'ACADEMIC',
        published_at: null,
        created_at: new Date('2026-04-01T00:00:00.000Z'),
      },
    ])
    mocks.galleryFindMany.mockResolvedValue([
      {
        id: 'gallery-1',
        title: null,
        description: null,
        file_url: 'https://example.com/gallery-1.jpg',
        file_type: 'IMAGE',
        created_at: new Date('2026-03-10T00:00:00.000Z'),
      },
    ])

    mocks.galleryAlbumFindMany.mockResolvedValue([
      {
        id: 'album-1',
        name: 'Annual Day',
        description: null,
        event_date: new Date('2026-02-14T00:00:00.000Z'),
        cover_image_url: null,
        galleries: [
          {
            id: 'gallery-1',
            title: null,
            description: null,
            file_url: 'https://example.com/gallery-1.jpg',
            file_type: 'IMAGE',
            created_at: new Date('2026-02-14T10:00:00.000Z'),
          },
          {
            id: 'gallery-2',
            title: 'Prize Distribution',
            description: 'Final ceremony',
            file_url: 'https://example.com/gallery-2.jpg',
            file_type: 'IMAGE',
            created_at: new Date('2026-02-14T11:00:00.000Z'),
          },
        ],
      },
    ])
  })

  it('TEST-PS-002: getPublicSchoolInfo resolves active school branding for tenant host', async () => {
    const school = await getPublicSchoolInfo()

    expect(school).toEqual(
      expect.objectContaining({
        id: 'school-1',
        name: 'Green Valley School',
        slug: 'green-valley-school',
        theme: {
          primary: '#123456',
          accent: '#654321',
        },
      })
    )
    expect(mocks.schoolFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          slug: 'green-valley-school',
          is_active: true,
        }),
      })
    )
    expect(mocks.getTenantBrandingBySchoolId).toHaveBeenCalledWith('school-1')
  })

  it('TEST-PS-002: getPublicSchoolInfo falls back to default public profile when no school is found', async () => {
    mocks.schoolFindFirst.mockResolvedValueOnce(null)

    const school = await getPublicSchoolInfo()

    expect(school.id).toBeNull()
    expect(school.name).toBe('Vidhya Bharthi High School')
    expect(school.slug).toBe('vidhya-bharthi-high-school')
    expect(school.theme.primary).toBe('#1d4ed8')
  })

  it('TEST-PS-001: getPublicHomePageData returns mapped metrics, announcements, and gallery preview', async () => {
    const data = await getPublicHomePageData()

    expect(data.school.id).toBe('school-1')
    expect(data.studentCount).toBe(1320)
    expect(data.staffCount).toBe(102)
    expect(data.passPercentage).toBe(96)
    expect(data.announcements).toEqual([
      {
        id: 'ann-1',
        title: 'Exam Schedule',
        content: 'Term exams begin next Monday.',
        type: 'ACADEMIC',
        published_at: '2026-04-01T00:00:00.000Z',
      },
    ])
    expect(data.galleryPreview).toEqual([
      {
        id: 'gallery-1',
        title: 'Green Valley School',
        description: '',
        file_url: 'https://example.com/gallery-1.jpg',
        file_type: 'IMAGE',
        created_at: '2026-03-10T00:00:00.000Z',
      },
    ])
  })

  it('TEST-PS-001: getPublicGalleryAlbums maps album cards and gallery items for public rendering', async () => {
    const result = await getPublicGalleryAlbums()

    expect(result.school.id).toBe('school-1')
    expect(result.albums).toHaveLength(1)
    expect(result.albums[0]).toEqual({
      id: 'album-1',
      name: 'Annual Day',
      description: '',
      event_date: '2026-02-14T00:00:00.000Z',
      cover_image_url: 'https://example.com/gallery-1.jpg',
      photo_count: 2,
      items: [
        {
          id: 'gallery-1',
          title: 'Annual Day',
          description: '',
          file_url: 'https://example.com/gallery-1.jpg',
          file_type: 'IMAGE',
          created_at: '2026-02-14T10:00:00.000Z',
        },
        {
          id: 'gallery-2',
          title: 'Prize Distribution',
          description: 'Final ceremony',
          file_url: 'https://example.com/gallery-2.jpg',
          file_type: 'IMAGE',
          created_at: '2026-02-14T11:00:00.000Z',
        },
      ],
    })
  })

  it('TEST-PS-001: createPublicAuditEntry writes public contact audit logs with resolved actor user', async () => {
    mocks.userFindFirst.mockResolvedValueOnce({ id: 'principal-1' })

    await createPublicAuditEntry({
      schoolId: 'school-1',
      entityId: 'contact-1',
      newValue: {
        subject: 'Admission enquiry',
      },
      ipAddress: '127.0.0.1',
      userAgent: 'vitest',
    })

    expect(mocks.createAuditLog).toHaveBeenCalledWith({
      school_id: 'school-1',
      user_id: 'principal-1',
      action: 'CREATE',
      entity_type: 'public_contact',
      entity_id: 'contact-1',
      new_value: {
        subject: 'Admission enquiry',
      },
      ip_address: '127.0.0.1',
      user_agent: 'vitest',
    })
  })

  it('TEST-PS-001: buildPublicMetadata returns canonical and OpenGraph metadata for page SEO', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://schoolos.example'

    const metadata = await buildPublicMetadata({
      title: 'Contact Us - Green Valley School',
      description: 'Reach out for admissions and campus visits.',
      path: '/contact',
      providedHeaders: new Headers({ host: 'green.schoolos.test' }),
    })

    expect(metadata.title).toBe('Contact Us - Green Valley School')
    expect(metadata.description).toBe('Reach out for admissions and campus visits.')
    expect(metadata.alternates?.canonical).toBe('https://schoolos.example/contact')
    expect(metadata.openGraph).toEqual(
      expect.objectContaining({
        title: 'Contact Us - Green Valley School',
        siteName: 'Green Valley School',
        url: 'https://schoolos.example/contact',
        type: 'website',
      })
    )
  })
})
