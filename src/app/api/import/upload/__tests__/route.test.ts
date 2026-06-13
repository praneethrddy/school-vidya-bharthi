import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  hasPermission: vi.fn(),
  uploadImportFile: vi.fn(),
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
    uploadImportFile: mocks.uploadImportFile,
  }
})

import { POST } from '../route'

describe('/api/import/upload POST', () => {
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

  it('uploads CSV and returns structured metadata (TEST-IMP-002)', async () => {
    mocks.uploadImportFile.mockResolvedValue({
      upload_id: 'upload-1',
      detected_columns: ['admission_number'],
      preview: [{ admission_number: 'ADM-1001' }],
      warnings: [],
      suggested_mapping: { admission_number: 'admission_number' },
    })

    const formData = new FormData()
    formData.set('import_type', 'students')
    formData.set(
      'file',
      new File(['admission_number\nADM-1001'], 'students.csv', { type: 'text/csv' })
    )

    const response = await POST({ formData: async () => formData } as any)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({
      success: true,
      data: {
        upload_id: 'upload-1',
        detected_columns: ['admission_number'],
        preview: [{ admission_number: 'ADM-1001' }],
        warnings: [],
        suggested_mapping: { admission_number: 'admission_number' },
      },
    })
    expect(mocks.uploadImportFile).toHaveBeenCalledWith(
      expect.objectContaining({ importType: 'students' })
    )
  })

  it('returns 401 when session is missing', async () => {
    mocks.auth.mockResolvedValue(null)
    const formData = new FormData()
    formData.set('import_type', 'students')

    const response = await POST({ formData: async () => formData } as any)
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload.error.code).toBe('UNAUTHORIZED')
  })

  it('returns 400 when multipart body is invalid', async () => {
    const response = await POST({ formData: async () => { throw new Error('bad form data') } } as any)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload).toEqual({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Expected multipart form data',
      },
    })
  })

  it('returns 400 when file is missing', async () => {
    const formData = new FormData()
    formData.set('import_type', 'students')

    const response = await POST({ formData: async () => formData } as any)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error.code).toBe('VALIDATION_ERROR')
    expect(payload.error.message).toBe('CSV file is required')
  })

  it('returns 403 when permission check fails', async () => {
    mocks.hasPermission.mockResolvedValue(false)
    const formData = new FormData()
    formData.set('import_type', 'fee_payments')
    formData.set('file', new File(['a\n1'], 'fees.csv', { type: 'text/csv' }))

    const response = await POST({ formData: async () => formData } as any)
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload.error.code).toBe('FORBIDDEN')
    expect(mocks.hasPermission).toHaveBeenCalledWith('school-1', 'PRINCIPAL', 'FEES.record_payment')
  })

  it('returns 400 for invalid import type', async () => {
    const formData = new FormData()
    formData.set('import_type', 'invalid_type')
    formData.set('file', new File(['a\n1'], 'x.csv', { type: 'text/csv' }))

    const response = await POST({ formData: async () => formData } as any)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error.code).toBe('VALIDATION_ERROR')
    expect(payload.error.message).toBe('Invalid import type')
  })
})
