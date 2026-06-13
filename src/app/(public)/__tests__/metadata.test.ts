import { describe, expect, it, vi } from 'vitest'
import { generateMetadata as generateHomeMetadata } from '../page'
import { generateMetadata as generateAboutMetadata } from '../about/page'
import { generateMetadata as generateAcademicsMetadata } from '../academics/page'
import { generateMetadata as generateAdmissionsMetadata } from '../admissions/page'
import { generateMetadata as generateContactMetadata } from '../contact/page'
import { generateMetadata as generateGalleryMetadata } from '../gallery/page'
import { generateMetadata as generateAlumniMetadata } from '../alumni/page'
import { generateMetadata as generateOnboardingMetadata } from '../onboarding/page'

vi.mock('@/lib/public-site', () => ({
  getPublicSchoolInfo: vi.fn().mockResolvedValue({
    id: 'school-1',
    name: 'Vidhya Bharthi High School',
    slug: 'vidhya-bharthi-high-school',
    established_year: 1998,
    board: 'CBSE',
    theme: { primary: '#1d4ed8', accent: '#f59e0b' },
  }),
  buildPublicMetadata: vi.fn().mockImplementation(async (params) => {
    const url = new URL(params.path || '/', 'http://localhost:3000')
    return {
      metadataBase: new URL('http://localhost:3000'),
      title: params.title,
      description: params.description,
      openGraph: {
        title: params.title,
        description: params.description,
        url: url.toString(),
        siteName: 'Vidhya Bharthi High School',
        type: 'website',
      },
      alternates: {
        canonical: url.toString(),
      },
    }
  }),
}))

describe('SECTION 44A — generateMetadata() Unit Tests', () => {
  it('TEST-SEO-001: Home page (/) → title contains school name', async () => {
    const metadata = await generateHomeMetadata()
    expect(metadata.title).toContain('Vidhya Bharthi High School')
  })

  it('TEST-SEO-002: Home page → description is non-empty, ≤ 160 chars', async () => {
    const metadata = await generateHomeMetadata()
    expect(metadata.description).toBeDefined()
    expect(metadata.description?.length).toBeGreaterThan(0)
    expect(metadata.description?.length).toBeLessThanOrEqual(160)
  })

  it('TEST-SEO-003: Home page → has og:title, og:description, og:type', async () => {
    const metadata = await generateHomeMetadata()
    expect(metadata.openGraph).toBeDefined()
    expect(metadata.openGraph?.title).toBeDefined()
    expect(metadata.openGraph?.description).toBeDefined()
    expect(metadata.openGraph?.type).toBe('website')
  })

  it('TEST-SEO-004: About page (/about) → title contains "About"', async () => {
    const metadata = await generateAboutMetadata()
    expect(metadata.title).toContain('About')
  })

  it('TEST-SEO-005: About page → description mentions school history/mission', async () => {
    const metadata = await generateAboutMetadata()
    expect(metadata.description).toBeDefined()
    expect(metadata.description).toMatch(/history|mission/i)
  })

  it('TEST-SEO-006: Academics page (/academics) → title contains "Academics"', async () => {
    const metadata = await generateAcademicsMetadata()
    expect(metadata.title).toContain('Academics')
  })

  it('TEST-SEO-007: Admissions page (/admissions) → title contains "Admissions"', async () => {
    const metadata = await generateAdmissionsMetadata()
    expect(metadata.title).toContain('Admissions')
  })

  it('TEST-SEO-008: Contact page (/contact) → title contains "Contact"', async () => {
    const metadata = await generateContactMetadata()
    expect(metadata.title).toContain('Contact')
  })

  it('TEST-SEO-009: Gallery page (/gallery) → title contains "Gallery"', async () => {
    const metadata = await generateGalleryMetadata()
    expect(metadata.title).toContain('Gallery')
  })

  it('TEST-SEO-010: Alumni page (/alumni) → title contains "Alumni"', async () => {
    const metadata = await generateAlumniMetadata()
    expect(metadata.title).toContain('Alumni')
  })

  it('TEST-SEO-011: Onboarding page (/onboarding) → title contains "Register"', async () => {
    const metadata = await generateOnboardingMetadata()
    expect(metadata.title).toContain('Register')
  })
})
