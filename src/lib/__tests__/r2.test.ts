import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  s3ClientConfig: vi.fn(),
  s3Send: vi.fn(),
}))

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: class {
    send = mocks.s3Send

    constructor(config: unknown) {
      mocks.s3ClientConfig(config)
    }
  },
  PutObjectCommand: class {
    constructor(public input: unknown) {}
  },
  DeleteObjectCommand: class {
    constructor(public input: unknown) {}
  },
}))

describe('r2 helper', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    delete process.env.R2_ACCOUNT_ID
    delete process.env.R2_ENDPOINT
    delete process.env.R2_ACCESS_KEY_ID
    delete process.env.R2_SECRET_ACCESS_KEY
    delete process.env.R2_BUCKET_NAME
    delete process.env.R2_PUBLIC_URL
  })

  it('creates S3 client with environment-driven R2 configuration', async () => {
    process.env.R2_ENDPOINT = 'https://account-1.r2.cloudflarestorage.com'
    process.env.R2_ACCESS_KEY_ID = 'access-key-1'
    process.env.R2_SECRET_ACCESS_KEY = 'secret-key-1'

    await import('../r2')

    expect(mocks.s3ClientConfig).toHaveBeenCalledWith({
      region: 'auto',
      endpoint: 'https://account-1.r2.cloudflarestorage.com',
      credentials: {
        accessKeyId: 'access-key-1',
        secretAccessKey: 'secret-key-1',
      },
    })
  })

  it('exports bucket fallback when R2_BUCKET_NAME is missing', async () => {
    const mod = await import('../r2')

    expect(mod.bucket).toBe('vbhs-uploads')
  })

  it('uploadFile sends the object to R2 and returns the public URL', async () => {
    process.env.R2_ENDPOINT = 'https://account-1.r2.cloudflarestorage.com'
    process.env.R2_ACCESS_KEY_ID = 'access-key-1'
    process.env.R2_SECRET_ACCESS_KEY = 'secret-key-1'
    process.env.R2_BUCKET_NAME = 'school-assets'
    process.env.R2_PUBLIC_URL = 'https://cdn.example.com/'

    const { uploadFile } = await import('../r2')

    const url = await uploadFile('reports/grade-6.pdf', Buffer.from('abc'), 'application/pdf')

    expect(url).toBe('https://cdn.example.com/reports/grade-6.pdf')
    expect(mocks.s3Send).toHaveBeenCalledTimes(1)
    expect(mocks.s3Send.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        input: {
          Bucket: 'school-assets',
          Key: 'reports/grade-6.pdf',
          Body: Buffer.from('abc'),
          ContentType: 'application/pdf',
        },
      })
    )
  })

  it('getFileUrl builds a public URL without duplicating the bucket name', async () => {
    process.env.R2_PUBLIC_URL = 'https://cdn.example.com/'
    process.env.R2_BUCKET_NAME = 'school-assets'

    const { getFileUrl } = await import('../r2')

    const url = await getFileUrl('/profiles/student-1.png', 120)

    expect(url).toBe('https://cdn.example.com/profiles/student-1.png')
  })

  it('deleteFile removes the object from R2', async () => {
    process.env.R2_ENDPOINT = 'https://account-1.r2.cloudflarestorage.com'
    process.env.R2_ACCESS_KEY_ID = 'access-key-1'
    process.env.R2_SECRET_ACCESS_KEY = 'secret-key-1'
    process.env.R2_BUCKET_NAME = 'school-assets'

    const { deleteFile } = await import('../r2')

    await deleteFile('old/report.pdf')

    expect(mocks.s3Send).toHaveBeenCalledTimes(1)
    expect(mocks.s3Send.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        input: {
          Bucket: 'school-assets',
          Key: 'old/report.pdf',
        },
      })
    )
  })
})
