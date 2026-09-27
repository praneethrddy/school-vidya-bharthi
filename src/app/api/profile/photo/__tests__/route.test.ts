import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  createAuditLog: vi.fn(),
  studentFindFirst: vi.fn(),
  studentUpdate: vi.fn(),
  parentFindFirst: vi.fn(),
  parentUpdate: vi.fn(),
  staffFindFirst: vi.fn(),
  staffUpdate: vi.fn(),
  s3Send: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: mocks.auth,
}))

vi.mock('@/lib/audit', () => ({
  createAuditLog: mocks.createAuditLog,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    student: {
      findFirst: mocks.studentFindFirst,
      update: mocks.studentUpdate,
    },
    parent: {
      findFirst: mocks.parentFindFirst,
      update: mocks.parentUpdate,
    },
    staff: {
      findFirst: mocks.staffFindFirst,
      update: mocks.staffUpdate,
    },
  },
}))

vi.mock('@aws-sdk/client-s3', () => {
  class S3Client {
    send = mocks.s3Send
  }
  class PutObjectCommand {
    constructor(public input: unknown) {}
  }
  class DeleteObjectCommand {
    constructor(public input: unknown) {}
  }
  return {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
  }
})

import { POST } from '../route'

describe('/api/profile/photo POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({
      user: {
        id: 'user-1',
        role: 'STUDENT',
        schoolId: 'school-1',
      },
    })
    mocks.studentFindFirst.mockResolvedValue({
      id: 'student-1',
      photo_url: null,
    })
    mocks.studentUpdate.mockResolvedValue({
      id: 'student-1',
      photo_url: 'https://cdn.example.com/profiles/new-file.png',
    })
    mocks.s3Send.mockResolvedValue({})
    mocks.createAuditLog.mockResolvedValue(undefined)
  })

  it('returns 401 when user is unauthenticated', async () => {
    mocks.auth.mockResolvedValue(null)

    const formData = new FormData()
    const request = new Request('http://localhost/api/profile/photo', {
      method: 'POST',
      body: formData,
    })
    const response = await POST(request, { params: Promise.resolve({}) })
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload).toEqual({ error: 'Unauthorized' })
  })

  it('returns 400 when file is missing', async () => {
    const formData = new FormData()
    const request = new Request('http://localhost/api/profile/photo', {
      method: 'POST',
      body: formData,
    })
    const response = await POST(request, { params: Promise.resolve({}) })
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload).toEqual({ error: 'No file provided' })
  })

  it.skip('returns 400 for invalid mime type', async () => {
    const formData = new FormData()
    formData.set('file', new File(['hello'], 'photo.gif', { type: 'image/gif' }))

    const request = new Request('http://localhost/api/profile/photo', {
      method: 'POST',
      body: formData,
    })
    const response = await POST(request, { params: Promise.resolve({}) })
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toContain('Invalid file type')
  })

  it.skip('uploads photo and writes audit log for valid image', async () => {
    const formData = new FormData()
    formData.set('file', new File(['image-bytes'], 'photo.png', { type: 'image/png' }))

    const request = new Request('http://localhost/api/profile/photo', {
      method: 'POST',
      body: formData,
    })
    const response = await POST(request, { params: Promise.resolve({}) })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual(
      expect.objectContaining({
        success: true,
        photo_url: expect.any(String),
      })
    )
    expect(mocks.studentUpdate).toHaveBeenCalledTimes(1)
    expect(mocks.createAuditLog).toHaveBeenCalledTimes(1)
  })
})
