import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  hasPermission: vi.fn(),
  createAuditLog: vi.fn(),
  admissionFindFirst: vi.fn(),
  admissionUpdate: vi.fn(),
  auditLogFindMany: vi.fn(),
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

vi.mock('@/lib/prisma', () => ({
  prisma: {
    admission: {
      findFirst: mocks.admissionFindFirst,
      update: mocks.admissionUpdate,
    },
    auditLog: {
      findMany: mocks.auditLogFindMany,
    },
  },
}))

import { GET, PATCH } from '../route'

describe('/api/admissions/[id] route handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.auth.mockResolvedValue({
      user: {
        id: 'user-1',
        role: 'STUDENT_ADMIN',
        schoolId: 'school-1',
      },
    })

    mocks.hasPermission.mockResolvedValue(true)

    mocks.admissionFindFirst.mockResolvedValue({
      id: 'admission-1',
      school_id: 'school-1',
      academic_year_id: 'year-1',
      applicant_name: 'Aarav Sharma',
      date_of_birth: new Date('2014-06-10'),
      gender: 'MALE',
      applying_for_class: 'Grade 6 - A',
      parent_name: 'Rohit Sharma',
      parent_phone: '9999999999',
      parent_email: 'rohit@example.com',
      address: 'Hyderabad',
      previous_school: 'ABC School',
      status: 'SHORTLISTED',
      processed_by: 'user-1',
      decided_by: null,
      decided_at: null,
      remarks: 'Initial review done',
      documents_url: ['https://mock/doc.pdf'],
      applied_at: new Date('2026-04-10T08:00:00.000Z'),
      created_at: new Date('2026-04-10T08:00:00.000Z'),
      updated_at: new Date('2026-04-10T09:00:00.000Z'),
      processor: { id: 'user-1', email: 'studentadmin@vbhs.com' },
      decider: null,
      academic_year: { id: 'year-1', name: '2026-27' },
    })

    mocks.auditLogFindMany.mockResolvedValue([
      {
        id: 'log-1',
        user_id: 'user-1',
        old_value: { status: 'APPLIED' },
        new_value: { status: 'SHORTLISTED', remarks: 'Initial review done' },
        created_at: new Date('2026-04-10T09:00:00.000Z'),
      },
    ])

    mocks.admissionUpdate.mockResolvedValue({
      id: 'admission-1',
      applicant_name: 'Aarav Sharma Updated',
      date_of_birth: new Date('2014-06-10'),
      gender: 'MALE',
      applying_for_class: 'Grade 6 - A',
      parent_name: 'Rohit Sharma',
      parent_phone: '9999999999',
      parent_email: 'rohit@example.com',
      address: 'Hyderabad',
      previous_school: 'ABC School',
      status: 'SHORTLISTED',
      remarks: 'Updated notes',
      documents_url: ['https://mock/doc.pdf'],
      updated_at: new Date('2026-04-10T10:00:00.000Z'),
    })
  })

  it('GET returns admission detail with actor emails and timeline', async () => {
    const response = await GET(new NextRequest('http://localhost/api/admissions/admission-1'), {
      params: Promise.resolve({ id: 'admission-1' }),
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.data).toMatchObject({
      id: 'admission-1',
      applicant_name: 'Aarav Sharma',
      processed_by_email: 'studentadmin@vbhs.com',
    })
    expect(payload.data.timeline).toHaveLength(1)
    expect(payload.data.timeline[0]).toMatchObject({
      from_status: 'APPLIED',
      to_status: 'SHORTLISTED',
    })
  })

  it('GET returns 401 when session is missing', async () => {
    mocks.auth.mockResolvedValue(null)

    const response = await GET(new NextRequest('http://localhost/api/admissions/admission-1'), {
      params: Promise.resolve({ id: 'admission-1' }),
    })
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('UNAUTHORIZED')
  })

  it('PATCH updates an admission and writes audit log', async () => {
    const request = new NextRequest('http://localhost/api/admissions/admission-1', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        applicant_name: 'Aarav Sharma Updated',
        remarks: 'Updated notes',
      }),
    })

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'admission-1' }),
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.data).toMatchObject({
      id: 'admission-1',
      applicant_name: 'Aarav Sharma Updated',
      remarks: 'Updated notes',
    })
    expect(mocks.createAuditLog).toHaveBeenCalledTimes(1)
  })

  it('PATCH returns 400 for empty update payload', async () => {
    const request = new NextRequest('http://localhost/api/admissions/admission-1', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    })

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'admission-1' }),
    })
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('VALIDATION_ERROR')
  })

  it('PATCH returns 401 when session is missing', async () => {
    mocks.auth.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/admissions/admission-1', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ remarks: 'test' }),
    })

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'admission-1' }),
    })
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('UNAUTHORIZED')
  })
})
