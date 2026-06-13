import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  createAuditLog: vi.fn(),
  userFindUnique: vi.fn(),
  studentFindFirst: vi.fn(),
  studentUpdate: vi.fn(),
  parentFindFirst: vi.fn(),
  parentUpdate: vi.fn(),
  staffFindFirst: vi.fn(),
  staffUpdate: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: mocks.auth,
}))

vi.mock('@/lib/audit', () => ({
  createAuditLog: mocks.createAuditLog,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique },
    student: {
      findFirst: mocks.studentFindFirst,
      update: mocks.studentUpdate,
    },
    parent: {
      findFirst: mocks.parentFindFirst,
      update: mocks.parentUpdate,
    },
    staff: {
      findFirst: mocks.staffFindFirst,
      update: mocks.staffUpdate,
    },
  },
}))

import { GET, PATCH } from '../route'

describe('/api/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({
      user: {
        id: 'user-1',
        role: 'STUDENT',
        schoolId: 'school-1',
      },
    })
    mocks.userFindUnique.mockResolvedValue({ email: 'student@vbhs.com' })
    mocks.studentFindFirst.mockResolvedValue({
      id: 'student-1',
      first_name: 'Asha',
      last_name: 'Rao',
      gender: 'FEMALE',
      date_of_birth: new Date('2010-01-01'),
      blood_group: 'O+',
      phone: '9999999999',
      address: 'Main Street',
      emergency_contact_name: 'Parent',
      emergency_contact_phone: '8888888888',
      photo_url: null,
      admission_number: 'ADM-10',
      class: { name: '10', section: 'A' },
      roll_number: '15',
    })
    mocks.studentUpdate.mockResolvedValue({
      id: 'student-1',
      phone: '7777777777',
      address: 'Updated',
    })
    mocks.createAuditLog.mockResolvedValue(undefined)
  })

  it('GET returns 401 without session', async () => {
    mocks.auth.mockResolvedValue(null)

    const response = await GET(new Request('http://localhost/api/profile'), {
      params: Promise.resolve({}),
    })
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload).toEqual({ error: 'Unauthorized' })
  })

  it('GET returns current student profile structure', async () => {
    const response = await GET(new Request('http://localhost/api/profile'), {
      params: Promise.resolve({}),
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual(
      expect.objectContaining({
        user: expect.objectContaining({ email: 'student@vbhs.com' }),
        profile: expect.objectContaining({
          first_name: 'Asha',
          last_name: 'Rao',
          phone: expect.any(String),
          address: expect.any(String),
          class_name: '10 A',
        }),
      })
    )
  })

  it('PATCH updates student profile and writes an audit log', async () => {
    const response = await PATCH(
      new Request('http://localhost/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: '7777777777',
          address: 'Updated',
        }),
      }),
      { params: Promise.resolve({}) }
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual(
      expect.objectContaining({
        success: true,
        profile: expect.objectContaining({
          id: 'student-1',
        }),
      })
    )
    expect(mocks.createAuditLog).toHaveBeenCalledTimes(1)
  })

  it('PATCH rejects invalid payload with 400', async () => {
    const response = await PATCH(
      new Request('http://localhost/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: 123456,
        }),
      }),
      { params: Promise.resolve({}) }
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload).toEqual(
      expect.objectContaining({
        error: 'Invalid data',
        details: expect.any(Array),
      })
    )
  })
})

