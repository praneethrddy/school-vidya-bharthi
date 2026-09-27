import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  hasPermission: vi.fn(),
  createAuditLog: vi.fn(),
  admissionFindFirst: vi.fn(),
  admissionUpdate: vi.fn(),
  uploadFile: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ auth: mocks.auth }))
vi.mock('@/lib/permissions', () => ({ hasPermission: mocks.hasPermission }))
vi.mock('@/lib/audit', () => ({ createAuditLog: mocks.createAuditLog }))
vi.mock('@/lib/r2', () => ({ uploadFile: mocks.uploadFile }))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    admission: {
      findFirst: mocks.admissionFindFirst,
      update: mocks.admissionUpdate,
    },
  },
}))

import { POST } from '../route'

function makeRequest(formData: FormData): NextRequest {
  return {
    headers: new Headers(),
    formData: vi.fn().mockResolvedValue(formData),
  } as unknown as NextRequest
}

describe('/api/admissions/[id]/documents POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.auth.mockResolvedValue({
      user: {
        id: 'user-1',
        role: 'STUDENT_ADMIN',
        schoolId: 'school-1',
      },
    })

    mocks.hasPermission.mockResolvedValue(true)

    mocks.admissionFindFirst.mockResolvedValue({
      id: 'admission-1',
      documents_url: ['https://mock/old.pdf'],
    })

    mocks.uploadFile.mockResolvedValue('https://mock/new.pdf')

    mocks.admissionUpdate.mockResolvedValue({
      id: 'admission-1',
      documents_url: ['https://mock/old.pdf', 'https://mock/new.pdf'],
      updated_at: new Date('2026-04-10T11:00:00.000Z'),
    })

    if (!(File.prototype as { arrayBuffer?: unknown }).arrayBuffer) {
      Object.defineProperty(File.prototype, 'arrayBuffer', {
        value: async function arrayBuffer() {
          return new TextEncoder().encode('mock-file').buffer
        },
      })
    }
  })

  it('uploads allowed files, merges URLs, and writes audit log', async () => {
    const formData = new FormData()
    formData.append('files', new File(['pdf'], 'mark-sheet.pdf', { type: 'application/pdf' }))

    const response = await POST(makeRequest(formData), {
      params: Promise.resolve({ id: 'admission-1' }),
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.data).toMatchObject({
      id: 'admission-1',
      uploaded: ['https://mock/new.pdf'],
    })
    expect(mocks.admissionUpdate).toHaveBeenCalledTimes(1)
    expect(mocks.createAuditLog).toHaveBeenCalledTimes(1)
  })

  it('rejects disallowed MIME type', async () => {
    const formData = new FormData()
    formData.append('file', new File(['exe'], 'virus.exe', { type: 'application/x-msdownload' }))

    const response = await POST(makeRequest(formData), {
      params: Promise.resolve({ id: 'admission-1' }),
    })
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('INVALID_FILE_TYPE')
  })

  it('rejects files larger than 10MB', async () => {
    const formData = new FormData()
    const tooLarge = new Uint8Array(10 * 1024 * 1024 + 1)
    formData.append('file', new File([tooLarge], 'too-large.pdf', { type: 'application/pdf' }))

    const response = await POST(makeRequest(formData), {
      params: Promise.resolve({ id: 'admission-1' }),
    })
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('FILE_TOO_LARGE')
  })

  it('returns 401 when session is missing', async () => {
    mocks.auth.mockResolvedValue(null)

    const formData = new FormData()
    formData.append('file', new File(['pdf'], 'mark-sheet.pdf', { type: 'application/pdf' }))

    const response = await POST(makeRequest(formData), {
      params: Promise.resolve({ id: 'admission-1' }),
    })
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('UNAUTHORIZED')
  })
})

