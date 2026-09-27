import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  hasPermission: vi.fn(),
  createAuditLog: vi.fn(),
  createBulkNotifications: vi.fn(),

  concessionFindMany: vi.fn(),
  studentFindFirst: vi.fn(),
  structureFindFirst: vi.fn(),
  concessionCreate: vi.fn(),
  userFindMany: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: mocks.auth,
}))

vi.mock('@/lib/permissions', () => ({
  hasPermission: mocks.hasPermission,
}))

vi.mock('@/lib/audit', () => ({
  createAuditLog: mocks.createAuditLog,
}))

vi.mock('@/lib/notification-service', () => ({
  createBulkNotifications: mocks.createBulkNotifications,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    student: {
      findFirst: mocks.studentFindFirst,
    },
    feeStructure: {
      findFirst: mocks.structureFindFirst,
    },
    feeConcession: {
      findMany: mocks.concessionFindMany,
      create: mocks.concessionCreate,
    },
    user: {
      findMany: mocks.userFindMany,
    },
  },
}))

import { GET, POST } from '../route'

describe('/api/admin/fees/concessions', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.auth.mockResolvedValue({
      user: {
        id: 'accountant-user',
        role: 'ACCOUNTANT',
        schoolId: 'school-1',
      },
    })

    mocks.hasPermission.mockResolvedValue(true)

    mocks.studentFindFirst.mockResolvedValue({
      id: 'student-1',
      class_id: 'class-1',
    })

    mocks.structureFindFirst.mockResolvedValue({
      id: 'structure-1',
      class_id: 'class-1',
      academic_year_id: 'year-1',
      amount: { toNumber: () => 5000 },
    })

    mocks.concessionCreate.mockResolvedValue({
      id: 'concession-1',
      status: 'PENDING',
    })

    mocks.userFindMany.mockResolvedValue([{ id: 'principal-user' }])
  })

  it('GET returns 401 when session is missing', async () => {
    mocks.auth.mockResolvedValue(null)
    const response = await GET(new NextRequest('http://localhost/api/admin/fees/concessions'))
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } })
  })

  it('GET returns mapped concessions list', async () => {
    mocks.concessionFindMany.mockResolvedValue([
      {
        id: 'concession-1',
        student_id: 'student-1',
        fee_structure_id: 'structure-1',
        concession_type: 'PERCENTAGE',
        concession_value: { toNumber: () => 10 },
        reason: 'Sibling studying',
        status: 'PENDING',
        requested_by: 'accountant-user',
        approved_by: null,
        approved_at: null,
        created_at: new Date('2025-06-10T00:00:00.000Z'),
        updated_at: new Date('2025-06-10T00:00:00.000Z'),
        student: {
          first_name: 'Rahul',
          last_name: 'Sharma',
          class: { name: 'Grade 6', section: 'A' },
        },
        structure: { category: { name: 'Tuition' } },
        requester: { id: 'accountant-user', email: 'acc@vbhs.com', role: 'ACCOUNTANT' },
        approver: null,
      },
    ])

    const response = await GET(new NextRequest('http://localhost/api/admin/fees/concessions?status=PENDING'))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({
      success: true,
      data: [
        {
          id: 'concession-1',
          student_name: 'Rahul Sharma',
          category_name: 'Tuition',
          concession_value: 10,
          status: 'PENDING',
        },
      ],
    })
  })

  it('creates a pending concession request', async () => {
    const request = new NextRequest('http://localhost/api/admin/fees/concessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: '11111111-1111-1111-1111-111111111111',
        fee_structure_id: '22222222-2222-2222-2222-222222222222',
        concession_type: 'PERCENTAGE',
        concession_value: 10,
        reason: 'Sibling studying in same school',
      }),
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(201)
    expect(payload.success).toBe(true)
    expect(payload.data.status).toBe('PENDING')
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CREATE',
        entity_type: 'fee_concession',
        entity_id: 'concession-1',
      })
    )
  })

  it('POST returns validation error for invalid percentage value', async () => {
    const request = new NextRequest('http://localhost/api/admin/fees/concessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: '11111111-1111-1111-1111-111111111111',
        fee_structure_id: '22222222-2222-2222-2222-222222222222',
        concession_type: 'PERCENTAGE',
        concession_value: 110,
        reason: 'Sibling studying in same school',
      }),
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload).toMatchObject({
      success: false,
      error: { code: 'VALIDATION_ERROR' },
    })
  })
})
