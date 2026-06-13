import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  hasPermission: vi.fn(),
  processImportUpload: vi.fn(),
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
    processImportUpload: mocks.processImportUpload,
  }
})

import { POST } from '../route'

describe('/api/import/process POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({
      user: {
        id: 'user-1',
        schoolId: 'school-1',
        role: 'PRINCIPAL',
      },
    })
    mocks.hasPermission.mockResolvedValue(true)
  })

  it('processes a validated upload and returns results (TEST-IMP-004)', async () => {
    mocks.processImportUpload.mockResolvedValue({
      status: 'COMPLETED',
      total_processed: 2,
      successful: 2,
      failed: 0,
      failed_rows: [],
      import_id: 'import-1',
      created_accounts: 1,
    })

    const response = await POST(
      new Request('http://localhost/api/import/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          upload_id: 'upload-1',
          import_type: 'students',
          skip_errors: true,
          create_user_accounts: true,
          default_password: 'StrongP@ss123',
        }),
      }) as any
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.data).toEqual({
      status: 'COMPLETED',
      total_processed: 2,
      successful: 2,
      failed: 0,
      failed_rows: [],
      import_id: 'import-1',
      created_accounts: 1,
    })
    expect(mocks.processImportUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        schoolId: 'school-1',
        userId: 'user-1',
        importType: 'students',
        uploadId: 'upload-1',
        skipErrors: true,
        createUserAccounts: true,
      })
    )
  })

  it('returns partial results with row-level errors (TEST-IMP-006, TEST-IMP-007)', async () => {
    mocks.processImportUpload.mockResolvedValue({
      status: 'PARTIAL',
      total_processed: 2,
      successful: 1,
      failed: 1,
      failed_rows: [{ row_number: 3, error: 'admission_number: Admission number already exists' }],
      import_id: 'import-2',
      created_accounts: 0,
    })

    const response = await POST(
      new Request('http://localhost/api/import/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          upload_id: 'upload-2',
          import_type: 'students',
          skip_errors: true,
        }),
      }) as any
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.data.status).toBe('PARTIAL')
    expect(payload.data.failed_rows).toHaveLength(1)
    expect(payload.data.successful).toBe(1)
  })

  it('returns 401 for missing session (TEST-IMP-005)', async () => {
    mocks.auth.mockResolvedValue(null)

    const response = await POST(
      new Request('http://localhost/api/import/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ upload_id: 'upload-1', import_type: 'students' }),
      }) as any
    )
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload.error.code).toBe('UNAUTHORIZED')
  })

  it('returns 403 when permission check fails', async () => {
    mocks.hasPermission.mockResolvedValue(false)

    const response = await POST(
      new Request('http://localhost/api/import/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          upload_id: 'upload-1',
          import_type: 'fee_payments',
          skip_errors: true,
        }),
      }) as any
    )
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload.error.code).toBe('FORBIDDEN')
    expect(mocks.hasPermission).toHaveBeenCalledWith('school-1', 'PRINCIPAL', 'FEES.record_payment')
  })

  it('returns 400 for invalid body', async () => {
    const response = await POST(
      new Request('http://localhost/api/import/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ import_type: 'students' }),
      }) as any
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error.code).toBe('VALIDATION_ERROR')
  })
})
