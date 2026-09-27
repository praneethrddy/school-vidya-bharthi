import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  hasPermission: vi.fn(),
  validateImportUpload: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: mocks.auth,
}))

vi.mock('@/lib/permissions', () => ({
  hasPermission: mocks.hasPermission,
}))

vi.mock('@/lib/import-tools', async () => {
  const actual = await vi.importActual<typeof import('@/lib/import-tools')>('@/lib/import-tools')
  return {
    ...actual,
    validateImportUpload: mocks.validateImportUpload,
  }
})

import { POST } from '../route'

describe('/api/import/validate POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({
      user: {
        schoolId: 'school-1',
        role: 'PRINCIPAL',
      },
    })
    mocks.hasPermission.mockResolvedValue(true)
  })

  it('validates uploaded rows and returns summary (TEST-IMP-003)', async () => {
    mocks.validateImportUpload.mockResolvedValue({
      total_rows: 2,
      valid_rows: 1,
      error_rows: 1,
      errors: [{ row_number: 3, field: 'admission_number', value: '', error: 'Required' }],
      preview: [{ row_number: 2, data: { admission_number: 'ADM-1001' } }],
      warnings: [],
      missing_required_fields: [],
    })

    const response = await POST(
      new Request('http://localhost/api/import/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          upload_id: 'upload-1',
          import_type: 'students',
          column_mapping: { admission_number: 'Admission Number' },
        }),
      }) as any
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.data.total_rows).toBe(2)
    expect(payload.data.error_rows).toBe(1)
    expect(payload.data.errors).toHaveLength(1)
    expect(mocks.validateImportUpload).toHaveBeenCalledWith({
      schoolId: 'school-1',
      uploadId: 'upload-1',
      importType: 'students',
      columnMapping: { admission_number: 'Admission Number' },
    })
  })

  it('returns 401 for missing session', async () => {
    mocks.auth.mockResolvedValue(null)

    const response = await POST(
      new Request('http://localhost/api/import/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ upload_id: 'upload-1', import_type: 'students' }),
      }) as any
    )
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload.error.code).toBe('UNAUTHORIZED')
  })

  it('returns 400 for invalid body', async () => {
    const response = await POST(
      new Request('http://localhost/api/import/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ import_type: 'students' }),
      }) as any
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error.code).toBe('VALIDATION_ERROR')
  })

  it('returns 403 when permission check fails', async () => {
    mocks.hasPermission.mockResolvedValue(false)

    const response = await POST(
      new Request('http://localhost/api/import/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          upload_id: 'upload-1',
          import_type: 'staff',
          column_mapping: {},
        }),
      }) as any
    )
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload.error.code).toBe('FORBIDDEN')
    expect(mocks.hasPermission).toHaveBeenCalledWith('school-1', 'PRINCIPAL', 'STAFF.create')
  })

  it('returns 400 for invalid import type', async () => {
    const response = await POST(
      new Request('http://localhost/api/import/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          upload_id: 'upload-1',
          import_type: 'bad',
          column_mapping: {},
        }),
      }) as any
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error.code).toBe('VALIDATION_ERROR')
    expect(payload.error.message).toBe('Invalid import type')
  })
})
