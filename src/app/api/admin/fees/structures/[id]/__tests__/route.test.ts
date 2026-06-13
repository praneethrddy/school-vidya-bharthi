import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  hasPermission: vi.fn(),
  createAuditLog: vi.fn(),
  structureFindFirst: vi.fn(),
  paymentCount: vi.fn(),
  structureDeleteMany: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ auth: mocks.auth }))
vi.mock('@/lib/permissions', () => ({ hasPermission: mocks.hasPermission }))
vi.mock('@/lib/audit', () => ({ createAuditLog: mocks.createAuditLog }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    feeStructure: {
      findFirst: mocks.structureFindFirst,
      deleteMany: mocks.structureDeleteMany,
    },
    feePayment: {
      count: mocks.paymentCount,
    },
  },
}))

import { DELETE } from '../route'

describe('/api/admin/fees/structures/[id] DELETE', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({
      user: { id: 'principal-1', role: 'PRINCIPAL', schoolId: 'school-1' },
    })
    mocks.hasPermission.mockResolvedValue(true)
  })

  it('returns 401 when session is missing', async () => {
    mocks.auth.mockResolvedValue(null)

    const response = await DELETE(new NextRequest('http://localhost/api/admin/fees/structures/fs-1', { method: 'DELETE' }), {
      params: Promise.resolve({ id: 'fs-1' }),
    })
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } })
  })

  it('returns 404 when structure does not exist in school scope', async () => {
    mocks.structureFindFirst.mockResolvedValue(null)

    const response = await DELETE(new NextRequest('http://localhost/api/admin/fees/structures/fs-1', { method: 'DELETE' }), {
      params: Promise.resolve({ id: 'fs-1' }),
    })
    const payload = await response.json()

    expect(response.status).toBe(404)
    expect(payload).toMatchObject({ success: false, error: { code: 'NOT_FOUND' } })
  })

  it('returns 409 when payments are linked', async () => {
    mocks.structureFindFirst.mockResolvedValue({ id: 'fs-1' })
    mocks.paymentCount.mockResolvedValue(2)

    const response = await DELETE(new NextRequest('http://localhost/api/admin/fees/structures/fs-1', { method: 'DELETE' }), {
      params: Promise.resolve({ id: 'fs-1' }),
    })
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload).toMatchObject({
      success: false,
      error: { code: 'FEE_STRUCTURE_HAS_PAYMENTS' },
    })
  })

  it('deletes structure and writes audit log', async () => {
    mocks.structureFindFirst.mockResolvedValue({ id: 'fs-1', amount: 1000 })
    mocks.paymentCount.mockResolvedValue(0)
    mocks.structureDeleteMany.mockResolvedValue({ count: 1 })

    const response = await DELETE(
      new NextRequest('http://localhost/api/admin/fees/structures/fs-1', {
        method: 'DELETE',
        headers: { 'x-real-ip': '127.0.0.1' },
      }),
      { params: Promise.resolve({ id: 'fs-1' }) }
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({ success: true, data: { message: expect.any(String) } })
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'DELETE',
        entity_type: 'fee_structure',
        entity_id: 'fs-1',
      })
    )
  })
})
