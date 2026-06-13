import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getPermissionsForRole: vi.fn(),
  resolveAdminDashboardSchoolId: vi.fn(),
  getAdminDashboardData: vi.fn(),
  loggerError: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: mocks.auth,
}))

vi.mock('@/lib/permissions', () => ({
  getPermissionsForRole: mocks.getPermissionsForRole,
}))

vi.mock('@/lib/admin-dashboard', () => ({
  isAdminDashboardRole: (role: string) =>
    ['SUPER_ADMIN', 'PRINCIPAL', 'STAFF_ADMIN', 'STUDENT_ADMIN', 'ACCOUNTANT', 'TEACHER'].includes(role),
  resolveAdminDashboardSchoolId: mocks.resolveAdminDashboardSchoolId,
  getAdminDashboardData: mocks.getAdminDashboardData,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: mocks.loggerError,
  },
}))

import { GET } from '../route'

function buildRequest() {
  return new NextRequest('http://localhost/api/dashboard/admin')
}

function expectErrorShape(payload: any, code: string, message?: string) {
  expect(payload).toEqual(
    expect.objectContaining({
      success: false,
      error: expect.objectContaining({
        code,
        message: expect.any(String),
      }),
    })
  )

  if (message) {
    expect(payload.error.message).toBe(message)
  }
}

function expectSuccessShape(payload: any) {
  expect(payload).toEqual(
    expect.objectContaining({
      success: true,
      data: expect.any(Object),
    })
  )
}

describe('/api/dashboard/admin GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.resolveAdminDashboardSchoolId.mockResolvedValue('school-1')
    mocks.getPermissionsForRole.mockResolvedValue(['ATTENDANCE.view_all', 'FEES.view_reports'])
  })

  it('returns 401 with structured body when session is missing', async () => {
    mocks.auth.mockResolvedValue(null)

    const response = await GET(buildRequest())
    const payload = await response.json()

    expect(response.status).toBe(401)
    expectErrorShape(payload, 'UNAUTHORIZED', 'No valid session')
  })

  it('returns 403 for non-admin role', async () => {
    mocks.auth.mockResolvedValue({
      user: {
        id: 'student-user',
        role: 'STUDENT',
        schoolId: 'school-1',
      },
    })

    const response = await GET(buildRequest())
    const payload = await response.json()

    expect(response.status).toBe(403)
    expectErrorShape(payload, 'FORBIDDEN', 'Only admin roles can access the admin dashboard')
  })

  it('returns 400 when school cannot be resolved', async () => {
    mocks.auth.mockResolvedValue({
      user: {
        id: 'principal-user',
        role: 'PRINCIPAL',
        schoolId: null,
      },
    })
    mocks.resolveAdminDashboardSchoolId.mockResolvedValue(null)

    const response = await GET(buildRequest())
    const payload = await response.json()

    expect(response.status).toBe(400)
    expectErrorShape(payload, 'SCHOOL_REQUIRED', 'No school identified for dashboard access')
  })

  it('returns full principal dashboard payload with metrics', async () => {
    mocks.auth.mockResolvedValue({
      user: {
        id: 'principal-user',
        role: 'PRINCIPAL',
        schoolId: 'school-1',
      },
    })

    mocks.getAdminDashboardData.mockResolvedValue({
      school: { id: 'school-1', name: 'VBHS', academic_year: '2026-2027', term: 'Term 1' },
      generated_at: '2026-04-26T10:00:00.000Z',
      visible_sections: {
        enrollment: true,
        attendance: true,
        fee_collection: true,
        recent_payments: true,
        pending_actions: true,
        recent_activity: true,
        teacher_summary: false,
      },
      quick_actions: [{ key: 'record-payment', label: 'Record Payment' }],
      enrollment: {
        total_students: 510,
        total_staff: 32,
        total_classes: 18,
        class_wise: [{ class_id: 'class-1', class_name: 'Grade 6 A', student_count: 28 }],
      },
      today_attendance: {
        total_students: 510,
        present: 480,
        absent: 20,
        late: 10,
        percentage: 96.1,
        not_marked: 0,
      },
      fee_collection: {
        total_expected: 1000000,
        total_collected: 760000,
        total_outstanding: 240000,
        collection_percentage: 76,
        this_month_collected: 120000,
      },
      recent_payments: [
        {
          id: 'pay-1',
          student_name: 'Asha Rao',
          amount: 5000,
          receipt_number: 'VBHS-2026-001001',
          date: '2026-04-26T08:00:00.000Z',
        },
      ],
      pending_actions: {
        pending_admissions: 4,
        pending_concessions: 2,
        overdue_books: 3,
      },
      recent_activity: [
        {
          id: 'audit-1',
          action: 'UPDATE',
          entity_type: 'student',
          user_name: 'admin',
          timestamp: '2026-04-26T08:30:00.000Z',
        },
      ],
      teacher_summary: null,
    })

    const response = await GET(buildRequest())
    const payload = await response.json()

    expect(response.status).toBe(200)
    expectSuccessShape(payload)
    expect(payload.data).toEqual(
      expect.objectContaining({
        school: expect.objectContaining({
          id: 'school-1',
          name: 'VBHS',
        }),
        enrollment: expect.objectContaining({
          total_students: 510,
          class_wise: expect.any(Array),
        }),
        today_attendance: expect.objectContaining({
          percentage: 96.1,
        }),
        fee_collection: expect.objectContaining({
          total_collected: 760000,
          total_outstanding: 240000,
        }),
        recent_payments: expect.any(Array),
        pending_actions: expect.any(Object),
        recent_activity: expect.any(Array),
      })
    )
    expect(mocks.getPermissionsForRole).toHaveBeenCalledWith('school-1', 'PRINCIPAL')
    expect(mocks.getAdminDashboardData).toHaveBeenCalledWith(
      expect.objectContaining({
        schoolId: 'school-1',
        userId: 'principal-user',
        role: 'PRINCIPAL',
      })
    )
  })

  it('scopes super admin dashboard to resolved school_id', async () => {
    mocks.auth.mockResolvedValue({
      user: {
        id: 'super-admin-user',
        role: 'SUPER_ADMIN',
        schoolId: null,
      },
    })
    mocks.resolveAdminDashboardSchoolId.mockResolvedValue('school-42')
    mocks.getAdminDashboardData.mockResolvedValue({
      school: { id: 'school-42', name: 'Scoped School', academic_year: '2026-2027', term: 'Term 1' },
      generated_at: '2026-04-26T10:00:00.000Z',
      visible_sections: {
        enrollment: true,
        attendance: true,
        fee_collection: true,
        recent_payments: true,
        pending_actions: true,
        recent_activity: true,
        teacher_summary: false,
      },
      quick_actions: [],
      enrollment: null,
      today_attendance: null,
      fee_collection: null,
      recent_payments: [],
      pending_actions: null,
      recent_activity: [],
      teacher_summary: null,
    })

    const response = await GET(buildRequest())
    const payload = await response.json()

    expect(response.status).toBe(200)
    expectSuccessShape(payload)
    expect(mocks.getPermissionsForRole).toHaveBeenCalledWith('school-42', 'SUPER_ADMIN')
    expect(mocks.getAdminDashboardData).toHaveBeenCalledWith(
      expect.objectContaining({
        schoolId: 'school-42',
        role: 'SUPER_ADMIN',
      })
    )
  })

  it('returns 500 with structured body when downstream call fails', async () => {
    mocks.auth.mockResolvedValue({
      user: {
        id: 'principal-user',
        role: 'PRINCIPAL',
        schoolId: 'school-1',
      },
    })
    mocks.getPermissionsForRole.mockRejectedValue(new Error('db unavailable'))

    const response = await GET(buildRequest())
    const payload = await response.json()

    expect(response.status).toBe(500)
    expectErrorShape(payload, 'INTERNAL_SERVER_ERROR', 'Failed to fetch dashboard data')
    expect(mocks.loggerError).toHaveBeenCalled()
  })
})
