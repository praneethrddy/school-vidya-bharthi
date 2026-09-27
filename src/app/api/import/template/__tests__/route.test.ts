import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  hasPermission: vi.fn(),
  getImportTemplate: vi.fn(),
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
    getImportTemplate: mocks.getImportTemplate,
  }
})

import { GET } from '../route'

describe('/api/import/template GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({
      user: {
        schoolId: 'school-1',
        role: 'PRINCIPAL',
      },
    })
    mocks.hasPermission.mockResolvedValue(true)
    mocks.getImportTemplate.mockReturnValue({
      fileName: 'students-import-template.csv',
      contents: 'admission_number,first_name\nADM-1001,Asha\n',
    })
  })

  it('downloads a CSV template when access is allowed (TEST-IMP-001)', async () => {
    const response = await GET(
      new NextRequest('http://localhost/api/import/template?type=students')
    )
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/csv')
    expect(response.headers.get('content-disposition')).toContain('students-import-template.csv')
    expect(body).toContain('admission_number')
    expect(mocks.hasPermission).toHaveBeenCalledWith('school-1', 'PRINCIPAL', 'STUDENTS.create')
  })

  it('returns 401 for missing session', async () => {
    mocks.auth.mockResolvedValue(null)

    const response = await GET(new NextRequest('http://localhost/api/import/template?type=students'))
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload).toEqual({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'No valid session',
      },
    })
  })

  it('returns 400 when school context is missing', async () => {
    mocks.auth.mockResolvedValue({
      user: {
        schoolId: null,
        role: 'PRINCIPAL',
      },
    })

    const response = await GET(new NextRequest('http://localhost/api/import/template?type=students'))
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload).toEqual({
      success: false,
      error: {
        code: 'SCHOOL_REQUIRED',
        message: 'School context is missing for this account',
      },
    })
  })

  it('returns 403 when permission check fails', async () => {
    mocks.hasPermission.mockResolvedValue(false)

    const response = await GET(new NextRequest('http://localhost/api/import/template?type=staff'))
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload.error.code).toBe('FORBIDDEN')
    expect(mocks.hasPermission).toHaveBeenCalledWith('school-1', 'PRINCIPAL', 'STAFF.create')
  })

  it('returns 400 for invalid import type', async () => {
    const response = await GET(new NextRequest('http://localhost/api/import/template?type=unknown'))
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload).toEqual({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid import type',
      },
    })
  })
})
