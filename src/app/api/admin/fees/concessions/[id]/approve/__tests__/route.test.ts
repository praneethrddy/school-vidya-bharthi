import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  hasPermission: vi.fn(),
  createAuditLog: vi.fn(),
  cacheDel: vi.fn(),
  createNotification: vi.fn(),

  concessionFindFirst: vi.fn(),
  concessionUpdate: vi.fn(),
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

vi.mock('@/lib/cache', () => ({
  cacheDel: mocks.cacheDel,
}))

vi.mock('@/lib/notification-service', () => ({
  createNotification: mocks.createNotification,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    feeConcession: {
      findFirst: mocks.concessionFindFirst,
      update: mocks.concessionUpdate,
    },
  },
}))

import { POST } from '../route'

describe('/api/admin/fees/concessions/[id]/approve POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.hasPermission.mockResolvedValue(true)

    mocks.concessionFindFirst.mockResolvedValue({
      id: 'concession-1',
      school_id: 'school-1',
      student_id: 'student-1',
      requested_by: 'request-user',
      status: 'PENDING',
      reason: 'Need support',
      requester: { id: 'request-user' },
    })

    mocks.concessionUpdate.mockResolvedValue({
      id: 'concession-1',
      status: 'APPROVED',
      approved_at: new Date('2025-06-10'),
    })
  })

  it('approves concession for PRINCIPAL', async () => {
    mocks.auth.mockResolvedValue({
      user: {
        id: 'principal-user',
        role: 'PRINCIPAL',
        schoolId: 'school-1',
      },
    })

    const request = new NextRequest('http://localhost/api/admin/fees/concessions/concession-1/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'APPROVED' }),
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'concession-1' }) })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.data.status).toBe('APPROVED')
    expect(mocks.cacheDel).toHaveBeenCalled()
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'UPDATE',
        entity_type: 'fee_concession',
        entity_id: 'concession-1',
      })
    )
    expect(mocks.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'request-user',
        type: 'FEE',
      })
    )
  })

  it('returns 403 for non-principal user', async () => {
    mocks.auth.mockResolvedValue({
      user: {
        id: 'accountant-user',
        role: 'ACCOUNTANT',
        schoolId: 'school-1',
      },
    })

    const request = new NextRequest('http://localhost/api/admin/fees/concessions/concession-1/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'APPROVED' }),
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'concession-1' }) })
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload.success).toBe(false)
  })

  it('returns 409 when request has already been reviewed', async () => {
    mocks.auth.mockResolvedValue({
      user: {
        id: 'principal-user',
        role: 'PRINCIPAL',
        schoolId: 'school-1',
      },
    })
    mocks.concessionFindFirst.mockResolvedValueOnce({
      id: 'concession-1',
      school_id: 'school-1',
      student_id: 'student-1',
      requested_by: 'request-user',
      status: 'APPROVED',
      reason: 'Need support',
      requester: { id: 'request-user' },
    })

    const request = new NextRequest('http://localhost/api/admin/fees/concessions/concession-1/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'REJECTED' }),
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'concession-1' }) })
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload).toMatchObject({
      success: false,
      error: { code: 'INVALID_STATE' },
    })
  })
})
