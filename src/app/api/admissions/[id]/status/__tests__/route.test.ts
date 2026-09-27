import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  hasPermission: vi.fn(),
  createAuditLog: vi.fn(),
  admissionFindFirst: vi.fn(),
  admissionUpdate: vi.fn(),
  userFindMany: vi.fn(),
  notificationCreateMany: vi.fn(),
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
    user: {
      findMany: mocks.userFindMany,
    },
    notification: {
      createMany: mocks.notificationCreateMany,
    },
  },
}))

import { PATCH } from '../route'

describe('/api/admissions/[id]/status PATCH', () => {
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

    mocks.userFindMany.mockResolvedValue([{ id: 'principal-1' }])
    mocks.notificationCreateMany.mockResolvedValue({ count: 1 })

    mocks.admissionUpdate.mockResolvedValue({
      id: 'admission-1',
      status: 'SHORTLISTED',
      remarks: null,
      processed_by: 'user-1',
      decided_by: null,
      decided_at: null,
      updated_at: new Date('2026-04-10T10:00:00.000Z'),
    })
  })

  it('allows STUDENT_ADMIN to move APPLIED -> SHORTLISTED and emits notifications', async () => {
    mocks.admissionFindFirst.mockResolvedValue({
      id: 'admission-1',
      applicant_name: 'Aarav Sharma',
      status: 'APPLIED',
      remarks: null,
      processed_by: null,
      decided_by: null,
      decided_at: null,
    })

    const request = new NextRequest('http://localhost/api/admissions/admission-1/status', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'SHORTLISTED' }),
    })

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'admission-1' }),
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.data).toMatchObject({
      id: 'admission-1',
      status: 'SHORTLISTED',
      processed_by: 'user-1',
    })
    expect(mocks.createAuditLog).toHaveBeenCalledTimes(1)
    expect(mocks.notificationCreateMany).toHaveBeenCalledTimes(1)
  })

  it('blocks STUDENT_ADMIN from TESTING -> ADMITTED with 403', async () => {
    mocks.admissionFindFirst.mockResolvedValue({
      id: 'admission-1',
      applicant_name: 'Aarav Sharma',
      status: 'TESTING',
      remarks: null,
      processed_by: 'user-1',
      decided_by: null,
      decided_at: null,
    })

    const request = new NextRequest('http://localhost/api/admissions/admission-1/status', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'ADMITTED' }),
    })

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'admission-1' }),
    })
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('FORBIDDEN')
  })

  it('allows PRINCIPAL to move TESTING -> ADMITTED', async () => {
    mocks.auth.mockResolvedValue({
      user: {
        id: 'principal-1',
        role: 'PRINCIPAL',
        schoolId: 'school-1',
      },
    })

    mocks.admissionFindFirst.mockResolvedValue({
      id: 'admission-1',
      applicant_name: 'Aarav Sharma',
      status: 'TESTING',
      remarks: null,
      processed_by: 'user-1',
      decided_by: null,
      decided_at: null,
    })

    mocks.admissionUpdate.mockResolvedValue({
      id: 'admission-1',
      status: 'ADMITTED',
      remarks: null,
      processed_by: 'user-1',
      decided_by: 'principal-1',
      decided_at: new Date('2026-04-10T10:00:00.000Z'),
      updated_at: new Date('2026-04-10T10:00:00.000Z'),
    })

    const request = new NextRequest('http://localhost/api/admissions/admission-1/status', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'ADMITTED' }),
    })

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'admission-1' }),
    })

    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.data).toMatchObject({
      status: 'ADMITTED',
      decided_by: 'principal-1',
    })
  })

  it('returns 400 for invalid transition APPLIED -> ADMITTED', async () => {
    mocks.auth.mockResolvedValue({
      user: {
        id: 'principal-1',
        role: 'PRINCIPAL',
        schoolId: 'school-1',
      },
    })

    mocks.admissionFindFirst.mockResolvedValue({
      id: 'admission-1',
      applicant_name: 'Aarav Sharma',
      status: 'APPLIED',
      remarks: null,
      processed_by: null,
      decided_by: null,
      decided_at: null,
    })

    const request = new NextRequest('http://localhost/api/admissions/admission-1/status', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'ADMITTED' }),
    })

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'admission-1' }),
    })
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('INVALID_STATUS_TRANSITION')
  })

  it('returns 401 for missing session', async () => {
    mocks.auth.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/admissions/admission-1/status', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'SHORTLISTED' }),
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
