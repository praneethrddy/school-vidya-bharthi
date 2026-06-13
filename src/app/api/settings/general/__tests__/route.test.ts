import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const mocks = vi.hoisted(() => ({
  requireSchoolPermission: vi.fn(),
  getRequestMetadata: vi.fn(),
  schoolSettingFindMany: vi.fn(),
  schoolSettingUpsert: vi.fn(),
  transaction: vi.fn(),
  createAuditLog: vi.fn(),
}))

vi.mock('@/lib/settings-auth', () => ({
  requireSchoolPermission: mocks.requireSchoolPermission,
  getRequestMetadata: mocks.getRequestMetadata,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    schoolSetting: {
      findMany: mocks.schoolSettingFindMany,
      upsert: mocks.schoolSettingUpsert,
    },
    $transaction: mocks.transaction,
  },
}))

vi.mock('@/lib/audit', () => ({
  createAuditLog: mocks.createAuditLog,
}))

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

import { GET, PATCH } from '../route'

describe('/api/settings/general', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.requireSchoolPermission.mockResolvedValue({
      error: null,
      user: {
        id: 'user-1',
        role: 'PRINCIPAL',
        schoolId: 'school-1',
      },
    })
    mocks.getRequestMetadata.mockReturnValue({
      ip_address: '127.0.0.1',
      user_agent: 'vitest',
    })

    mocks.schoolSettingFindMany.mockResolvedValue([
      {
        id: 'setting-1',
        school_id: 'school-1',
        setting_key: 'grading_scheme',
        setting_value: 'PERCENTAGE',
        updated_at: new Date('2026-01-01T00:00:00.000Z'),
      },
    ])

    mocks.schoolSettingUpsert.mockImplementation(async ({ create, update }: any) => ({
      id: `setting-${create.setting_key}`,
      school_id: create.school_id,
      setting_key: create.setting_key,
      setting_value: update.setting_value,
      category: 'general',
      updated_at: new Date('2026-01-01T00:00:00.000Z'),
    }))
    mocks.transaction.mockImplementation(async (operations: Promise<unknown>[]) =>
      Promise.all(operations)
    )
  })

  it('TEST-SET-011: GET returns school settings', async () => {
    const response = await GET()
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.data.settings_map.grading_scheme).toBe('PERCENTAGE')
  })

  it('TEST-SET-012 and TEST-SET-019: PATCH upserts settings and writes per-setting audit logs', async () => {
    const request = new NextRequest('http://localhost/api/settings/general', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        settings: [
          { setting_key: 'grading_scheme', setting_value: 'GRADE' },
          { setting_key: 'receipt_prefix', setting_value: 'VBHS' },
        ],
      }),
    })

    const response = await PATCH(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(mocks.schoolSettingUpsert).toHaveBeenCalledTimes(2)
    expect(mocks.createAuditLog).toHaveBeenCalledTimes(2)
  })

  it('TEST-SET-013: rejects invalid working_days format', async () => {
    const request = new NextRequest('http://localhost/api/settings/general', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        settings: [
          { setting_key: 'working_days', setting_value: 'MON,SUN' },
        ],
      }),
    })

    const response = await PATCH(request)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.success).toBe(false)
    expect(payload.error.message).toContain('Invalid working_days')
    expect(mocks.schoolSettingUpsert).not.toHaveBeenCalled()
  })

  it('TEST-SET-014: rejects invalid grading_scheme', async () => {
    const request = new NextRequest('http://localhost/api/settings/general', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        settings: [
          { setting_key: 'grading_scheme', setting_value: 'INVALID' },
        ],
      }),
    })

    const response = await PATCH(request)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.success).toBe(false)
    expect(payload.error.message).toContain('grading_scheme must be one of')
  })

  it('TEST-SET-015: rejects oversized receipt_prefix', async () => {
    const request = new NextRequest('http://localhost/api/settings/general', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        settings: [
          { setting_key: 'receipt_prefix', setting_value: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' },
        ],
      }),
    })

    const response = await PATCH(request)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.success).toBe(false)
    expect(payload.error.message).toContain('20 characters or less')
  })

  it('TEST-SET-016: rejects invalid academic_start_month', async () => {
    const request = new NextRequest('http://localhost/api/settings/general', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        settings: [
          { setting_key: 'academic_start_month', setting_value: '13' },
        ],
      }),
    })

    const response = await PATCH(request)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.success).toBe(false)
    expect(payload.error.message).toContain('between 1 and 12')
  })

  it('TEST-SET-017: rejects invalid attendance_type', async () => {
    const request = new NextRequest('http://localhost/api/settings/general', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        settings: [
          { setting_key: 'attendance_type', setting_value: 'WEEKLY' },
        ],
      }),
    })

    const response = await PATCH(request)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.success).toBe(false)
    expect(payload.error.message).toContain('must be DAILY')
  })

  it('TEST-SET-018: invalid payload returns 400', async () => {
    const request = new NextRequest('http://localhost/api/settings/general', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        settings: [],
      }),
    })

    const response = await PATCH(request)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('VALIDATION_ERROR')
  })

  it('includes missing session negative case', async () => {
    mocks.requireSchoolPermission.mockResolvedValueOnce({
      error: NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No valid session' } },
        { status: 401 }
      ),
      user: null,
    })

    const response = await GET()
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('UNAUTHORIZED')
  })
})
