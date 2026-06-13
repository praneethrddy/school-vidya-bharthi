import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  hasPermission: vi.fn(),
  createAuditLog: vi.fn(),
  staffFindFirst: vi.fn(),
  userFindFirst: vi.fn(),
  userUpdate: vi.fn(),
  transaction: vi.fn(),
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
    staff: {
      findFirst: mocks.staffFindFirst,
    },
    user: {
      findFirst: mocks.userFindFirst,
      update: mocks.userUpdate,
    },
    $transaction: mocks.transaction,
  },
}))

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed-password'),
  },
}))

import { PATCH, POST } from '../route'

describe('/api/staff/[id]/account route', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.auth.mockResolvedValue({
      user: {
        id: 'staff-admin-1',
        role: 'STAFF_ADMIN',
        schoolId: 'school-1',
      },
    })
    mocks.hasPermission.mockResolvedValue(true)
  })

  it('POST creates account and links it to staff', async () => {
    mocks.staffFindFirst.mockResolvedValueOnce({
      id: 'staff-1',
      user_id: null,
      first_name: 'Anika',
      last_name: 'Rao',
    })
    mocks.userFindFirst.mockResolvedValueOnce(null)
    mocks.transaction.mockImplementationOnce(async (callback: any) =>
      callback({
        user: {
          create: vi.fn().mockResolvedValue({
            id: 'user-2',
            email: 'anika@school.com',
            role: 'TEACHER',
            is_active: true,
          }),
        },
        staff: {
          update: vi.fn().mockResolvedValue({ id: 'staff-1', user_id: 'user-2' }),
        },
      })
    )

    const request = new NextRequest('http://localhost/api/staff/staff-1/account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'anika@school.com',
        role: 'TEACHER',
        auto_generate_password: true,
      }),
    })
    const response = await POST(request, { params: Promise.resolve({ id: 'staff-1' }) })
    const payload = await response.json()

    expect(response.status).toBe(201)
    expect(payload.data).toEqual(
      expect.objectContaining({
        id: 'user-2',
        email: 'anika@school.com',
      })
    )
    expect(typeof payload.generatedPassword).toBe('string')
  })

  it('PATCH resets password for existing linked account', async () => {
    mocks.staffFindFirst.mockResolvedValueOnce({
      id: 'staff-1',
      user: {
        id: 'user-2',
        email: 'anika@school.com',
        role: 'TEACHER',
      },
    })
    mocks.userUpdate.mockResolvedValueOnce({
      id: 'user-2',
    })

    const request = new NextRequest('http://localhost/api/staff/staff-1/account', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auto_generate_password: true,
      }),
    })
    const response = await PATCH(request, { params: Promise.resolve({ id: 'staff-1' }) })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.data.password_reset).toBe(true)
    expect(typeof payload.generatedPassword).toBe('string')
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'UPDATE',
        entity_type: 'user',
      })
    )
  })
})

