import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  hasPermission: vi.fn(),
  createAuditLog: vi.fn(),
  yearFindFirst: vi.fn(),
  yearFindMany: vi.fn(),
  classFindFirst: vi.fn(),
  categoryFindFirst: vi.fn(),
  structureFindMany: vi.fn(),
  structureFindFirst: vi.fn(),
  structureUpsert: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ auth: mocks.auth }))
vi.mock('@/lib/permissions', () => ({ hasPermission: mocks.hasPermission }))
vi.mock('@/lib/audit', () => ({ createAuditLog: mocks.createAuditLog }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    academicYear: { findFirst: mocks.yearFindFirst, findMany: mocks.yearFindMany },
    class: { findFirst: mocks.classFindFirst },
    feeCategory: { findFirst: mocks.categoryFindFirst },
    feeStructure: {
      findMany: mocks.structureFindMany,
      findFirst: mocks.structureFindFirst,
      upsert: mocks.structureUpsert,
    },
  },
}))

import { GET, POST } from '../route'

const validPayload = {
  academic_year_id: '11111111-1111-1111-1111-111111111111',
  class_id: '22222222-2222-2222-2222-222222222222',
  fee_category_id: '33333333-3333-3333-3333-333333333333',
  amount: 1200,
  due_date: '2025-06-10',
  frequency: 'MONTHLY',
}

describe('/api/admin/fees/structures', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({
      user: { id: 'principal-user', role: 'PRINCIPAL', schoolId: 'school-1' },
    })
    mocks.hasPermission.mockResolvedValue(true)
  })

  it('GET returns 401 when session is missing', async () => {
    mocks.auth.mockResolvedValue(null)

    const response = await GET(new NextRequest('http://localhost/api/admin/fees/structures'))
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload).toMatchObject({
      success: false,
      error: { code: 'UNAUTHORIZED' },
    })
  })

  it('GET returns 403 without FEES.view_structure permission', async () => {
    mocks.hasPermission.mockResolvedValue(false)

    const response = await GET(new NextRequest('http://localhost/api/admin/fees/structures'))
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload).toMatchObject({
      success: false,
      error: { code: 'FORBIDDEN' },
    })
  })

  it('GET returns mapped fee structures', async () => {
    mocks.structureFindMany.mockResolvedValue([
      {
        id: 'fs-1',
        academic_year_id: validPayload.academic_year_id,
        class_id: validPayload.class_id,
        fee_category_id: validPayload.fee_category_id,
        amount: 1200,
        due_date: new Date('2025-06-10T00:00:00.000Z'),
        frequency: 'MONTHLY',
        created_at: new Date('2025-01-01T00:00:00.000Z'),
        updated_at: new Date('2025-01-02T00:00:00.000Z'),
        class: { id: validPayload.class_id, name: 'Grade 6', section: 'A' },
        category: { id: validPayload.fee_category_id, name: 'Tuition' },
        academic_year: { id: validPayload.academic_year_id, name: '2025-26' },
      },
    ])

    const response = await GET(
      new NextRequest(
        'http://localhost/api/admin/fees/structures?academic_year_id=11111111-1111-1111-1111-111111111111'
      )
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({
      success: true,
      data: [
        {
          id: 'fs-1',
          amount: 1200,
          due_date: '2025-06-10',
          class_name: 'Grade 6 A',
          category_name: 'Tuition',
          academic_year_name: '2025-26',
        },
      ],
    })
  })

  it('POST returns 403 for non-principal roles even if permission is granted', async () => {
    mocks.auth.mockResolvedValue({
      user: { id: 'accountant-user', role: 'ACCOUNTANT', schoolId: 'school-1' },
    })

    const response = await POST(
      new NextRequest('http://localhost/api/admin/fees/structures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validPayload),
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload).toMatchObject({
      success: false,
      error: { code: 'FORBIDDEN' },
    })
  })

  it('POST returns 400 for invalid payload', async () => {
    const response = await POST(
      new NextRequest('http://localhost/api/admin/fees/structures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...validPayload, amount: 0 }),
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload).toMatchObject({
      success: false,
      error: { code: 'VALIDATION_ERROR' },
    })
  })

  it('POST creates structure and writes CREATE audit log', async () => {
    mocks.yearFindFirst.mockResolvedValue({ id: validPayload.academic_year_id })
    mocks.classFindFirst.mockResolvedValue({ id: validPayload.class_id })
    mocks.categoryFindFirst.mockResolvedValue({ id: validPayload.fee_category_id })
    mocks.structureFindFirst.mockResolvedValue(null)
    mocks.structureUpsert.mockResolvedValue({
      id: 'fs-1',
      academic_year_id: validPayload.academic_year_id,
      class_id: validPayload.class_id,
      fee_category_id: validPayload.fee_category_id,
      amount: 1200,
      due_date: new Date('2025-06-10T00:00:00.000Z'),
      frequency: 'MONTHLY',
    })

    const response = await POST(
      new NextRequest('http://localhost/api/admin/fees/structures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-real-ip': '127.0.0.1' },
        body: JSON.stringify(validPayload),
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(201)
    expect(payload).toMatchObject({
      success: true,
      data: { id: 'fs-1', amount: 1200, frequency: 'MONTHLY' },
    })
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CREATE',
        entity_type: 'fee_structure',
        entity_id: 'fs-1',
      })
    )
  })

  it('POST updates structure and writes UPDATE audit log', async () => {
    mocks.yearFindFirst.mockResolvedValue({ id: validPayload.academic_year_id })
    mocks.classFindFirst.mockResolvedValue({ id: validPayload.class_id })
    mocks.categoryFindFirst.mockResolvedValue({ id: validPayload.fee_category_id })
    mocks.structureFindFirst.mockResolvedValue({ id: 'fs-1', amount: 1000 })
    mocks.structureUpsert.mockResolvedValue({
      id: 'fs-1',
      academic_year_id: validPayload.academic_year_id,
      class_id: validPayload.class_id,
      fee_category_id: validPayload.fee_category_id,
      amount: 1200,
      due_date: new Date('2025-06-10T00:00:00.000Z'),
      frequency: 'MONTHLY',
    })

    const response = await POST(
      new NextRequest('http://localhost/api/admin/fees/structures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validPayload),
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'UPDATE',
        entity_type: 'fee_structure',
        entity_id: 'fs-1',
      })
    )
  })
})
