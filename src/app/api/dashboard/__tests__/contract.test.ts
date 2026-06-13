import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import {
  DashboardStudentResponseSchema,
  DashboardAdminResponseSchema,
  ErrorResponseSchema,
} from '@/test/contracts/schemas'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getDashboardData: vi.fn(),
  getAdminDashboardData: vi.fn(),
  isAdminDashboardRole: vi.fn(),
  resolveAdminDashboardSchoolId: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: mocks.auth,
}))

vi.mock('@/lib/dashboard-service', () => ({
  getDashboardData: mocks.getDashboardData,
}))

vi.mock('@/lib/admin-dashboard', () => ({
  getAdminDashboardData: mocks.getAdminDashboardData,
  isAdminDashboardRole: mocks.isAdminDashboardRole,
  resolveAdminDashboardSchoolId: mocks.resolveAdminDashboardSchoolId,
}))

import { GET as GETStudent } from '../student/route'
import { GET as GETAdmin } from '../admin/route'

describe('Dashboard API Contract Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({
      user: { id: '00000000-0000-0000-0000-000000000000', role: 'STUDENT', schoolId: '00000000-0000-0000-0000-000000000001' },
    })
    mocks.isAdminDashboardRole.mockReturnValue(true)
    mocks.resolveAdminDashboardSchoolId.mockResolvedValue('00000000-0000-0000-0000-000000000001')
  })

  it('[TEST-CONTRACT-018] GET /api/dashboard/student returns valid DashboardStudentResponse shape', async () => {
    mocks.getDashboardData.mockResolvedValue({
      student: {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'John Doe',
        class: 'Grade 6 A',
        roll_number: '12',
        photo_url: null,
        academic_year: '2025-2026',
      },
      attendance_summary: {
        percentage: 95.5,
        present: 19,
        absent: 1,
        late: 0,
        half_day: 0,
        total_days: 20,
      },
      fee_summary: {
        total: 5000,
        paid: 3000,
        concession: 500,
        balance: 1500,
      },
      grade_summary: {
        last_exam: 'Mid Term',
        percentage: 88.5,
        overall_grade: 'A',
        grading_scheme: 'PERCENTAGE',
      },
      announcements: [],
    })

    const request = new NextRequest('http://localhost/api/dashboard/student')
    const response = await GETStudent(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    const result = DashboardStudentResponseSchema.safeParse(payload)
    expect(result.success).toBe(true)
  })

  it('[TEST-CONTRACT-018] GET /api/dashboard/admin returns valid DashboardAdminResponse shape', async () => {
    mocks.auth.mockResolvedValue({
      user: { id: '00000000-0000-0000-0000-000000000000', role: 'PRINCIPAL', schoolId: '00000000-0000-0000-0000-000000000001' },
    })

    mocks.getAdminDashboardData.mockResolvedValue({
      school: {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Vidhya Bharthi',
        academic_year: '2025-2026',
        term: 'Term 1',
      },
      generated_at: new Date().toISOString(),
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
      enrollment: {
        total_students: 500,
        total_staff: 40,
        total_classes: 15,
        class_wise: [],
      },
      today_attendance: {
        total_students: 500,
        present: 480,
        absent: 15,
        late: 5,
        percentage: 97.0,
        not_marked: 0,
      },
      fee_collection: {
        total_expected: 100000,
        total_collected: 80000,
        total_outstanding: 20000,
        collection_percentage: 80.0,
        this_month_collected: 10000,
      },
      recent_payments: [],
      pending_actions: {
        pending_admissions: 5,
        pending_concessions: 2,
        overdue_books: 10,
      },
      recent_activity: [],
      teacher_summary: null,
    })

    const request = new NextRequest('http://localhost/api/dashboard/admin')
    const response = await GETAdmin(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    const result = DashboardAdminResponseSchema.safeParse(payload)
    expect(result.success).toBe(true)
  })

  it('[TEST-CONTRACT-020] GET /api/dashboard/admin fails with unauthorized error response shape', async () => {
    mocks.auth.mockResolvedValue(null)
    const request = new NextRequest('http://localhost/api/dashboard/admin')
    const response = await GETAdmin(request)
    const payload = await response.json()

    expect(response.status).toBe(401)
    const result = ErrorResponseSchema.safeParse(payload)
    expect(result.success).toBe(true)
  })
})
