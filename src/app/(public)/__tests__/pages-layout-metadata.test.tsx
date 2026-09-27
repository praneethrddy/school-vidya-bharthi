import { describe, expect, it, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import PublicLayout from '../layout'
import HomePage, { generateMetadata as generateHomeMetadata } from '../page'
import AboutPage, { generateMetadata as generateAboutMetadata } from '../about/page'
import AcademicsPage, { generateMetadata as generateAcademicsMetadata } from '../academics/page'
import AdmissionsPage, { generateMetadata as generateAdmissionsMetadata } from '../admissions/page'
import GalleryPage, { generateMetadata as generateGalleryMetadata } from '../gallery/page'
import ContactPage, { generateMetadata as generateContactMetadata } from '../contact/page'
import AlumniPage, { generateMetadata as generateAlumniMetadata } from '../alumni/page'
import OnboardingPage, { generateMetadata as generateOnboardingMetadata } from '../onboarding/page'

const mocks = vi.hoisted(() => ({
  getPublicSchoolInfo: vi.fn(),
  getPublicHomePageData: vi.fn(),
  getPublicAboutData: vi.fn(),
  getPublicAcademicsData: vi.fn(),
  getPublicGalleryAlbums: vi.fn(),
  buildPublicMetadata: vi.fn(),
}))

vi.mock('@/lib/public-site', () => ({
  getPublicSchoolInfo: mocks.getPublicSchoolInfo,
  getPublicHomePageData: mocks.getPublicHomePageData,
  getPublicAboutData: mocks.getPublicAboutData,
  getPublicAcademicsData: mocks.getPublicAcademicsData,
  getPublicGalleryAlbums: mocks.getPublicGalleryAlbums,
  buildPublicMetadata: mocks.buildPublicMetadata,
}))

vi.mock('@/components/public/navbar', () => ({
  default: ({ school }: { school: { name: string } }) => (
    <div data-testid="public-navbar">{school.name}</div>
  ),
}))

vi.mock('@/components/public/footer', () => ({
  default: ({ school }: { school: { name: string } }) => (
    <div data-testid="public-footer">{school.name}</div>
  ),
}))

vi.mock('@/components/public/section-header', () => ({
  default: ({ title }: { title: string }) => <h2>{title}</h2>,
}))

vi.mock('@/components/public/hero-section', () => ({
  default: () => <div data-testid="hero-section">Hero section</div>,
}))

vi.mock('@/components/public/feature-card', () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}))

vi.mock('@/components/public/gallery-grid', () => ({
  default: ({ albums }: { albums: unknown[] }) => (
    <div data-testid="gallery-grid">Albums: {albums.length}</div>
  ),
}))

vi.mock('@/components/public/team-card', () => ({
  default: ({ leader }: { leader: { name: string } }) => <div>{leader.name}</div>,
}))

vi.mock('@/components/public/contact-form', () => ({
  default: () => <div data-testid="contact-form">Contact form</div>,
}))

vi.mock('@/components/public/onboarding-wizard', () => ({
  OnboardingWizard: () => <div data-testid="onboarding-wizard">Onboarding wizard</div>,
}))

describe('SECTION 18A — Public Pages and Metadata', () => {
  const school = {
    id: 'school-1',
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

  beforeEach(() => {
    vi.clearAllMocks()

    mocks.getPublicSchoolInfo.mockResolvedValue(school)
    mocks.getPublicHomePageData.mockResolvedValue({
      school,
      studentCount: 1200,
      staffCount: 95,
      passPercentage: 98,
      yearsOfExcellence: 25,
      announcements: [],
      galleryPreview: [],
    })
    mocks.getPublicAboutData.mockResolvedValue({
      school,
      leaders: [
        {
          id: 'leader-1',
          name: 'Principal Ananya Rao',
          designation: 'Principal',
          photo_url: null,
        },
      ],
    })
    mocks.getPublicAcademicsData.mockResolvedValue({
      school,
      gradingScheme: 'PERCENTAGE',
      classLabels: ['Grade 1'],
      subjectsByClass: [
        {
          classLabel: 'Grade 1 - A',
          subjects: ['English', 'Mathematics'],
        },
      ],
    })
    mocks.getPublicGalleryAlbums.mockResolvedValue({
      school,
      albums: [
        {
          id: 'album-1',
          name: 'Annual Day',
          description: 'Highlights',
          event_date: '2026-02-14T00:00:00.000Z',
          cover_image_url: 'https://example.com/cover.jpg',
          photo_count: 1,
          items: [],
        },
      ],
    })
    mocks.buildPublicMetadata.mockImplementation(
      async ({ title, description, path }: { title: string; description: string; path: string }) => ({
        title,
        description,
        alternates: {
          canonical: `https://schoolos.test${path}`,
        },
      })
    )
  })

  it('TEST-PUB-011: PublicLayout renders public header, footer, and child content', async () => {
    render(
      await PublicLayout({
        children: <div>Public page content</div>,
      })
    )

    expect(screen.getByTestId('public-navbar')).toHaveTextContent('Vidhya Bharthi High School')
    expect(screen.getByText('Public page content')).toBeInTheDocument()
    expect(screen.getByTestId('public-footer')).toHaveTextContent('Vidhya Bharthi High School')
  })

  it('TEST-PUB-001: home page resolves and renders public homepage sections', async () => {
    render(await HomePage())
    expect(mocks.getPublicHomePageData).toHaveBeenCalledTimes(1)
    expect(mocks.getPublicGalleryAlbums).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('hero-section')).toBeInTheDocument()
  })

  it('TEST-PUB-002: about page resolves and renders leadership content', async () => {
    render(await AboutPage())
    expect(mocks.getPublicAboutData).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Principal Ananya Rao')).toBeInTheDocument()
  })

  it('TEST-PUB-003: academics page resolves and renders classes and subjects', async () => {
    render(await AcademicsPage())
    expect(mocks.getPublicAcademicsData).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Grade 1')).toBeInTheDocument()
  })

  it('TEST-PUB-004: admissions page resolves and renders admissions guidance', async () => {
    render(await AdmissionsPage())
    expect(mocks.getPublicSchoolInfo).toHaveBeenCalled()
    expect(screen.getByText('Apply Now')).toBeInTheDocument()
  })

  it('TEST-PUB-005: gallery page resolves and renders the public gallery grid', async () => {
    render(await GalleryPage())
    expect(mocks.getPublicGalleryAlbums).toHaveBeenCalled()
    expect(screen.getByTestId('gallery-grid')).toHaveTextContent('Albums: 1')
  })

  it('TEST-PUB-006: contact page resolves and renders contact form entry point', async () => {
    render(await ContactPage())
    expect(mocks.getPublicSchoolInfo).toHaveBeenCalled()
    expect(screen.getByTestId('contact-form')).toBeInTheDocument()
  })

  it('TEST-PUB-007: alumni page resolves and renders alumni content', async () => {
    render(await AlumniPage())
    expect(mocks.getPublicSchoolInfo).toHaveBeenCalled()
    expect(screen.getByText('Ananya Rao')).toBeInTheDocument()
  })

  it('TEST-PUB-009: onboarding page renders onboarding wizard entry', () => {
    render(<OnboardingPage />)
    expect(screen.getByTestId('onboarding-wizard')).toBeInTheDocument()
  })

  it('TEST-PUB-012: generateMetadata returns SEO meta for all public pages', async () => {
    const metadataResults = await Promise.all([
      generateHomeMetadata(),
      generateAboutMetadata(),
      generateAcademicsMetadata(),
      generateAdmissionsMetadata(),
      generateGalleryMetadata(),
      generateContactMetadata(),
      generateAlumniMetadata(),
      generateOnboardingMetadata(),
    ])

    expect(mocks.buildPublicMetadata).toHaveBeenCalledTimes(8)
    expect(mocks.buildPublicMetadata).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ path: '/' })
    )
    expect(mocks.buildPublicMetadata).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ path: '/about' })
    )
    expect(mocks.buildPublicMetadata).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ path: '/academics' })
    )
    expect(mocks.buildPublicMetadata).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({ path: '/admissions' })
    )
    expect(mocks.buildPublicMetadata).toHaveBeenNthCalledWith(
      5,
      expect.objectContaining({ path: '/gallery' })
    )
    expect(mocks.buildPublicMetadata).toHaveBeenNthCalledWith(
      6,
      expect.objectContaining({ path: '/contact' })
    )
    expect(mocks.buildPublicMetadata).toHaveBeenNthCalledWith(
      7,
      expect.objectContaining({ path: '/alumni' })
    )
    expect(mocks.buildPublicMetadata).toHaveBeenNthCalledWith(
      8,
      expect.objectContaining({ path: '/onboarding' })
    )
    expect(metadataResults).toHaveLength(8)
    metadataResults.forEach((metadata) => {
      expect(metadata).toEqual(
        expect.objectContaining({
          title: expect.any(String),
          description: expect.any(String),
          alternates: expect.objectContaining({
            canonical: expect.stringContaining('https://schoolos.test/'),
          }),
        })
      )
    })
  })
})
