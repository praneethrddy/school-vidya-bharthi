import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  hasPermission: vi.fn(),
  createAuditLog: vi.fn(),
  categoryFindMany: vi.fn(),
  categoryFindFirst: vi.fn(),
  categoryCreate: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ auth: mocks.auth }))
vi.mock('@/lib/permissions', () => ({ hasPermission: mocks.hasPermission }))
vi.mock('@/lib/audit', () => ({ createAuditLog: mocks.createAuditLog }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    feeCategory: {
      findMany: mocks.categoryFindMany,
      findFirst: mocks.categoryFindFirst,
      create: mocks.categoryCreate,
    },
  },
}))

import { GET, POST } from '../route'

describe('/api/admin/fees/categories', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({
      user: { id: 'principal-1', role: 'PRINCIPAL', schoolId: 'school-1' },
    })
    mocks.hasPermission.mockResolvedValue(true)
  })

  it('GET returns categories with school scoping', async () => {
    mocks.categoryFindMany.mockResolvedValue([
      {
        id: 'cat-1',
        name: 'Transport',
        description: 'Bus fee',
        created_at: new Date('2025-01-01T00:00:00.000Z'),
        updated_at: new Date('2025-01-01T00:00:00.000Z'),
      },
    ])

    const response = await GET()
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({
      success: true,
      data: [{ id: 'cat-1', name: 'Transport', description: 'Bus fee' }],
    })
  })

  it('POST returns 409 on duplicate category', async () => {
    mocks.categoryFindFirst.mockResolvedValue({ id: 'cat-1' })

    const response = await POST(
      new NextRequest('http://localhost/api/admin/fees/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Tuition', description: null }),
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload).toMatchObject({
      success: false,
      error: { code: 'DUPLICATE_FEE_CATEGORY' },
    })
  })

  it('POST creates category and writes audit log', async () => {
    mocks.categoryFindFirst.mockResolvedValue(null)
    mocks.categoryCreate.mockResolvedValue({
      id: 'cat-2',
      name: 'Lab Fee',
      description: 'Science lab',
    })

    const response = await POST(
      new NextRequest('http://localhost/api/admin/fees/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.0.0.2' },
        body: JSON.stringify({ name: 'Lab Fee', description: 'Science lab' }),
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(201)
    expect(payload).toMatchObject({
      success: true,
      data: { id: 'cat-2', name: 'Lab Fee' },
    })
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CREATE',
        entity_type: 'fee_category',
        entity_id: 'cat-2',
      })
    )
  })
})
