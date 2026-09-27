import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getPublicGalleryAlbums: vi.fn(),
}))

vi.mock('@/lib/api-helpers', () => ({
  successResponse: (data: unknown) => Response.json({ success: true, data }),
}))

vi.mock('@/lib/public-site', () => ({
  getPublicGalleryAlbums: mocks.getPublicGalleryAlbums,
}))

import { GET } from '../route'

describe('/api/public/gallery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('TEST-PUB-005: returns published gallery albums with success response shape', async () => {
    mocks.getPublicGalleryAlbums.mockResolvedValue({
      school: {
        id: 'school-1',
        name: 'Vidhya Bharthi High School',
        slug: 'vidhya-bharthi-high-school',
        logo_url: null,
        address: 'Campus Road',
        city: 'Hyderabad',
        state: 'Telangana',
        phone: '+91 98765 43210',
        email: 'info@school.test',
        website: 'https://school.test',
        board: 'CBSE',
        established_year: 1998,
        theme: {
          primary: '#1d4ed8',
          accent: '#f59e0b',
        },
      },
      albums: [
        {
          id: 'album-1',
          name: 'Annual Day',
          description: 'Celebration highlights',
          event_date: '2026-01-15T00:00:00.000Z',
          cover_image_url: 'https://example.com/cover.jpg',
          photo_count: 2,
          items: [],
        },
      ],
    })

    const response = await GET()
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({
      success: true,
      data: {
        school: expect.objectContaining({
          id: 'school-1',
          name: 'Vidhya Bharthi High School',
        }),
        albums: [
          expect.objectContaining({
            id: 'album-1',
            name: 'Annual Day',
            photo_count: 2,
          }),
        ],
      },
    })
  })

  it('TEST-PUB-005: returns an empty albums array when no public albums exist', async () => {
    mocks.getPublicGalleryAlbums.mockResolvedValue({
      school: {
        id: null,
        name: 'Vidhya Bharthi High School',
        slug: 'vidhya-bharthi-high-school',
        logo_url: null,
        address: 'Campus Road',
        city: 'Hyderabad',
        state: 'Telangana',
        phone: '+91 98765 43210',
        email: 'info@school.test',
        website: 'https://school.test',
        board: 'CBSE',
        established_year: 1998,
        theme: {
          primary: '#1d4ed8',
          accent: '#f59e0b',
        },
      },
      albums: [],
    })

    const response = await GET()
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(Array.isArray(payload.data.albums)).toBe(true)
    expect(payload.data.albums).toHaveLength(0)
  })
})
