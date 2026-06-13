import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getPublicSchoolInfo: vi.fn(),
}))

vi.mock('@/lib/api-helpers', () => ({
  successResponse: (data: unknown) => Response.json({ success: true, data }),
}))

vi.mock('@/lib/public-site', () => ({
  getPublicSchoolInfo: mocks.getPublicSchoolInfo,
}))

import { GET } from '../route'

describe('/api/public/info', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('TEST-PUB-008: returns school info in the expected success envelope', async () => {
    mocks.getPublicSchoolInfo.mockResolvedValue({
      id: 'school-1',
      name: 'Vidhya Bharthi High School',
      slug: 'vidhya-bharthi-high-school',
      logo_url: 'https://example.com/logo.png',
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
          board: 'CBSE',
        }),
      },
    })
  })
})
