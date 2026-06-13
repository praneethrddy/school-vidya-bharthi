import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  hasPermission: vi.fn(),
  yearFindMany: vi.fn(),
  yearFindFirst: vi.fn(),
  categoryFindMany: vi.fn(),
  classFindMany: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ auth: mocks.auth }))
vi.mock('@/lib/permissions', () => ({ hasPermission: mocks.hasPermission }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    academicYear: {
      findMany: mocks.yearFindMany,
      findFirst: mocks.yearFindFirst,
    },
    feeCategory: {
      findMany: mocks.categoryFindMany,
    },
    class: {
      findMany: mocks.classFindMany,
    },
  },
}))

import { GET } from '../route'

describe('/api/admin/fees/meta GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({
      user: { role: 'ACCOUNTANT', schoolId: 'school-1' },
    })
    mocks.hasPermission.mockResolvedValue(true)
  })

  it('returns 401 for missing session', async () => {
    mocks.auth.mockResolvedValue(null)

    const response = await GET()
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } })
  })

  it('returns 403 when user has no fee module permissions', async () => {
    mocks.hasPermission.mockResolvedValue(false)

    const response = await GET()
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload).toMatchObject({ success: false, error: { code: 'FORBIDDEN' } })
  })

  it('returns aggregated metadata response', async () => {
    mocks.yearFindMany.mockResolvedValue([{ id: 'y1', name: '2025-26', is_current: true }])
    mocks.yearFindFirst.mockResolvedValue({ id: 'y1' })
    mocks.categoryFindMany.mockResolvedValue([{ id: 'c1', name: 'Tuition', description: null }])
    mocks.classFindMany.mockResolvedValue([{ id: 'cl1', name: 'Grade 6', section: 'A', academic_year_id: 'y1' }])

    const response = await GET()
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({
      success: true,
      data: {
        current_academic_year_id: 'y1',
        academic_years: [{ id: 'y1', name: '2025-26', is_current: true }],
        categories: [{ id: 'c1', name: 'Tuition' }],
        classes: [{ id: 'cl1', name: 'Grade 6 A', academic_year_id: 'y1' }],
      },
    })
  })
})
