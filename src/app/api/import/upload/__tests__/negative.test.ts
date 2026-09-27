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

vi.mock('@/lib/import-tools', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/import-tools')>()
  return {
    ...actual,
    uploadImportFile: mocks.uploadImportFile,
    parseRequestedImportType: actual.parseRequestedImportType,
  }
})

import { POST } from '../route'

const schoolId = 'school-1'

function requestWith(formData: FormData) {
  return {
    formData: async () => formData,
  } as any
}

describe('/api/import/upload Negative & Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.auth.mockResolvedValue({
      user: {
        id: 'admin-1',
        role: 'STUDENT_ADMIN',
        schoolId,
      },
    })
    mocks.hasPermission.mockResolvedValue(true)
  })

  describe('23D - File Upload Edge Cases', () => {
    it('TEST-NEG-022: Upload with no file field returns 400', async () => {
      const formData = new FormData()
      formData.append('import_type', 'students')

      const response = await POST(requestWith(formData))
      const payload = await response.json()

      expect(response.status).toBe(400)
      expect(payload).toEqual(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: 'CSV file is required',
          }),
        })
      )
    })

    it('TEST-NEG-019: Upload file exceeding size limit returns 400', async () => {
      mocks.uploadImportFile.mockRejectedValue(new Error('Maximum file size is 10MB'))

      const formData = new FormData()
      formData.append('import_type', 'students')
      formData.append('file', new File(['dummy'], 'students.csv', { type: 'text/csv' }))

      const response = await POST(requestWith(formData))
      const payload = await response.json()

      expect(response.status).toBe(400)
      expect(payload).toEqual(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'UPLOAD_ERROR',
            message: 'Maximum file size is 10MB',
          }),
        })
      )
    })

    it('TEST-NEG-020: Upload disallowed MIME type returns 400', async () => {
      mocks.uploadImportFile.mockRejectedValue(new Error('Please upload a CSV file'))

      const formData = new FormData()
      formData.append('import_type', 'students')
      formData.append('file', new File(['dummy'], 'image.png', { type: 'image/png' }))

      const response = await POST(requestWith(formData))
      const payload = await response.json()

      expect(response.status).toBe(400)
      expect(payload).toEqual(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'UPLOAD_ERROR',
            message: 'Please upload a CSV file',
          }),
        })
      )
    })

    it('TEST-NEG-021: Upload empty file returns 400', async () => {
      mocks.uploadImportFile.mockRejectedValue(new Error('The uploaded file contains no data rows'))

      const formData = new FormData()
      formData.append('import_type', 'students')
      formData.append('file', new File([''], 'empty.csv', { type: 'text/csv' }))

      const response = await POST(requestWith(formData))
      const payload = await response.json()

      expect(response.status).toBe(400)
      expect(payload).toEqual(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'UPLOAD_ERROR',
            message: 'The uploaded file contains no data rows',
          }),
        })
      )
    })
  })
})
