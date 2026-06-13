import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const mocks = vi.hoisted(() => ({
  requireSchoolPermission: vi.fn(),
  getRequestMetadata: vi.fn(),
  schoolFindFirst: vi.fn(),
  schoolUpdate: vi.fn(),
  schoolSettingUpsert: vi.fn(),
  transaction: vi.fn(),
  createAuditLog: vi.fn(),
  cacheDel: vi.fn(),
  uploadFile: vi.fn(),
}))

vi.mock('@/lib/settings-auth', () => ({
  requireSchoolPermission: mocks.requireSchoolPermission,
  getRequestMetadata: mocks.getRequestMetadata,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    school: {
      findFirst: mocks.schoolFindFirst,
      update: mocks.schoolUpdate,
    },
    schoolSetting: {
      upsert: mocks.schoolSettingUpsert,
    },
    $transaction: mocks.transaction,
  },
}))

vi.mock('@/lib/audit', () => ({
  createAuditLog: mocks.createAuditLog,
}))

vi.mock('@/lib/cache', () => ({
  cacheDel: mocks.cacheDel,
}))

vi.mock('@/lib/r2', () => ({
  uploadFile: mocks.uploadFile,
}))

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

import { GET, PATCH } from '../route'

const schoolId = 'school-1'

const existingSchoolRecord = {
  id: schoolId,
  name: 'Vidhya Bharathi',
  logo_url: 'https://cdn.example.com/old-logo.png',
  address: 'Old address',
  city: 'Hyderabad',
  state: 'TS',
  phone: '9999990000',
  email: 'office@vbhs.com',
  website: 'https://vbhs.com',
  board: 'CBSE',
  updated_at: new Date('2026-01-01T00:00:00.000Z'),
  settings: [
    { setting_key: 'brand_primary', setting_value: '#1d4ed8' },
    { setting_key: 'brand_accent', setting_value: '#f59e0b' },
  ],
}

describe('/api/settings/school-profile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    if (!Object.getOwnPropertyDescriptor(File.prototype, 'arrayBuffer')) {
      Object.defineProperty(File.prototype, 'arrayBuffer', {
        value: async function arrayBuffer() {
          return new Uint8Array([1, 2, 3]).buffer
        },
      })
    }

    mocks.requireSchoolPermission.mockResolvedValue({
      error: null,
      user: {
        id: 'user-1',
        role: 'PRINCIPAL',
        schoolId,
      },
    })
    mocks.getRequestMetadata.mockReturnValue({
      ip_address: '127.0.0.1',
      user_agent: 'vitest',
    })

    mocks.schoolFindFirst.mockResolvedValue(existingSchoolRecord)
    mocks.schoolUpdate.mockResolvedValue({
      id: schoolId,
      name: 'Vidhya Bharathi New',
      logo_url: 'https://cdn.example.com/new-logo.png',
      address: 'New address',
      city: 'Hyderabad',
      state: 'TS',
      phone: '9999991111',
      email: 'new@vbhs.com',
      website: 'https://new.vbhs.com',
      board: 'CBSE',
      updated_at: new Date('2026-02-01T00:00:00.000Z'),
    })
    mocks.schoolSettingUpsert.mockResolvedValue({})
    mocks.uploadFile.mockResolvedValue('https://cdn.example.com/uploaded-logo.png')
    mocks.transaction.mockImplementation(async (callback: any) =>
      callback({
        school: { update: mocks.schoolUpdate },
        schoolSetting: { upsert: mocks.schoolSettingUpsert },
      })
    )
  })

  it('TEST-SET-020: GET returns school info and branding colors', async () => {
    const response = await GET()
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.data.school).toEqual(
      expect.objectContaining({
        id: schoolId,
        brand_primary: '#1d4ed8',
        brand_accent: '#f59e0b',
      })
    )
  })

  it('TEST-SET-021, TEST-SET-026, TEST-SET-027, TEST-SET-028: PATCH JSON updates fields, branding, cache, and audit', async () => {
    const request = new NextRequest('http://localhost/api/settings/school-profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Vidhya Bharathi New',
        phone: '9999991111',
        brand_primary: '#123abc',
        brand_accent: '#abc123',
      }),
    })

    const response = await PATCH(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.data.school).toEqual(
      expect.objectContaining({
        id: schoolId,
        brand_primary: '#123abc',
        brand_accent: '#abc123',
      })
    )
    expect(mocks.schoolSettingUpsert).toHaveBeenCalledTimes(2)
    expect(mocks.createAuditLog).toHaveBeenCalledTimes(1)
    expect(mocks.cacheDel).toHaveBeenCalledWith(`tenant:branding:${schoolId}`)
  })

  it('TEST-SET-022 and TEST-SET-025: PATCH multipart uploads logo via R2/S3 helper', async () => {
    const formData = new FormData()
    formData.append('name', 'Vidhya Bharathi New')
    formData.append('logo', new File([new Uint8Array([1, 2, 3])], 'logo.png', { type: 'image/png' }))

    const request = {
      headers: new Headers({ 'content-type': 'multipart/form-data; boundary=test' }),
      formData: vi.fn().mockResolvedValue(formData),
      json: vi.fn(),
    } as unknown as NextRequest

    const response = await PATCH(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(mocks.uploadFile).toHaveBeenCalledTimes(1)
  })

  it('TEST-SET-023: rejects unsupported logo MIME types', async () => {
    const formData = new FormData()
    formData.append('name', 'Vidhya Bharathi New')
    formData.append('logo', new File([new Uint8Array([1, 2, 3])], 'logo.gif', { type: 'image/gif' }))

    const request = {
      headers: new Headers({ 'content-type': 'multipart/form-data; boundary=test' }),
      formData: vi.fn().mockResolvedValue(formData),
      json: vi.fn(),
    } as unknown as NextRequest

    const response = await PATCH(request)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.success).toBe(false)
    expect(payload.error.message).toContain('Logo file type')
    expect(mocks.uploadFile).not.toHaveBeenCalled()
  })

  it('TEST-SET-024: rejects logo larger than 5MB', async () => {
    const largeBytes = new Uint8Array(5 * 1024 * 1024 + 5)
    const formData = new FormData()
    formData.append('name', 'Vidhya Bharathi New')
    formData.append('logo', new File([largeBytes], 'logo.png', { type: 'image/png' }))

    const request = {
      headers: new Headers({ 'content-type': 'multipart/form-data; boundary=test' }),
      formData: vi.fn().mockResolvedValue(formData),
      json: vi.fn(),
    } as unknown as NextRequest

    const response = await PATCH(request)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.success).toBe(false)
    expect(payload.error.message).toContain('5MB or smaller')
    expect(mocks.uploadFile).not.toHaveBeenCalled()
  })

  it('TEST-SET-026 negative: invalid branding hex returns 400', async () => {
    const request = new NextRequest('http://localhost/api/settings/school-profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brand_primary: 'blue',
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
