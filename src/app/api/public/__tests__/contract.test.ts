import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  PublicInfoResponseSchema,
} from '@/test/contracts/schemas'

const mocks = vi.hoisted(() => ({
  getPublicSchoolInfo: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/public-site', () => ({
  getPublicSchoolInfo: mocks.getPublicSchoolInfo,
}))

import { GET } from '../info/route'

describe('Public API Contract Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('[TEST-CONTRACT-018] GET /api/public/info returns valid PublicInfoResponse shape', async () => {
    mocks.getPublicSchoolInfo.mockResolvedValue({
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Vidhya Bharthi High School',
      slug: 'vidhya-bharthi',
      logo_url: null,
      address: '1-2-3 Road',
      city: 'Hyderabad',
      state: 'Telangana',
      phone: '1234567890',
      email: 'info@school.com',
      website: 'www.school.com',
      board: 'CBSE',
    })

    const response = await GET()
    const payload = await response.json()

    expect(response.status).toBe(200)
    const result = PublicInfoResponseSchema.safeParse(payload)
    expect(result.success).toBe(true)
  })
})
