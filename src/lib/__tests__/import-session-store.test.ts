import { beforeEach, describe, expect, it } from 'vitest'
import {
  createUploadSession,
  deleteUploadSession,
  getUploadSession,
  saveValidationResult,
} from '@/lib/import-session-store'

describe('import-session-store', () => {
  beforeEach(() => {
    ;(globalThis as any).__vbImportSessions = new Map()
  })

  it('supports create/get/update/delete lifecycle (TEST-ISS-001)', () => {
    const session = createUploadSession({
      fileName: 'students.csv',
      fileSize: 128,
      parsed: {
        headers: ['admission_number'],
        rows: [{ admission_number: 'ADM-1001' }],
        delimiter: ',',
        duplicateHeaders: [],
        warnings: [],
      },
    })

    const found = getUploadSession(session.id)
    expect(found?.fileName).toBe('students.csv')

    const updated = saveValidationResult(session.id, {
      importType: 'students',
      columnMapping: { admission_number: 'admission_number' },
      summary: {
        total_rows: 1,
        valid_rows: 1,
        error_rows: 0,
        errors: [],
        preview: [],
        warnings: [],
        missing_required_fields: [],
      },
      preparedRows: [
        {
          row_number: 2,
          raw: { admission_number: 'ADM-1001' },
          data: { admission_number: 'ADM-1001' },
        },
      ],
    })

    expect(updated?.validation?.summary.valid_rows).toBe(1)

    deleteUploadSession(session.id)
    expect(getUploadSession(session.id)).toBeNull()
  })
})
