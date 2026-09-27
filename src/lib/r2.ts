import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

const DEFAULT_BUCKET = 'vbhs-uploads'
const DEFAULT_ENDPOINT = 'https://mock.r2.cloudflarestorage.com'

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

function normalizeKey(key: string): string {
  return key.replace(/^\/+/, '')
}

function resolveEndpoint(): string {
  if (process.env.R2_ENDPOINT) {
    return trimTrailingSlash(process.env.R2_ENDPOINT)
  }

  if (process.env.R2_ACCOUNT_ID) {
    return `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
  }

  return DEFAULT_ENDPOINT
}

function hasRequiredR2Config(): boolean {
  return Boolean(
    process.env.R2_BUCKET_NAME &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      (process.env.R2_ENDPOINT || process.env.R2_ACCOUNT_ID)
  )
}

function assertR2Configured(): void {
  if (hasRequiredR2Config()) {
    return
  }

  throw new Error(
    'Cloudflare R2 is not fully configured. Set R2_BUCKET_NAME, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and either R2_ENDPOINT or R2_ACCOUNT_ID.'
  )
}

export const bucket = process.env.R2_BUCKET_NAME || DEFAULT_BUCKET

export function buildPublicFileUrl(key: string): string {
  const publicBaseUrl = process.env.R2_PUBLIC_URL
    ? trimTrailingSlash(process.env.R2_PUBLIC_URL)
    : `https://${bucket}.r2.cloudflarestorage.com`

  return `${publicBaseUrl}/${normalizeKey(key)}`
}

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: resolveEndpoint(),
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || 'mock',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || 'mock',
  },
})

export async function uploadFile(key: string, body: Buffer, contentType: string): Promise<string> {
  assertR2Configured()

  await r2Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: normalizeKey(key),
      Body: body,
      ContentType: contentType,
    })
  )

  return buildPublicFileUrl(key)
}

export async function getFileUrl(key: string, _expiresIn = 3600): Promise<string> {
  return buildPublicFileUrl(key)
}

export async function deleteFile(key: string): Promise<void> {
  assertR2Configured()

  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: normalizeKey(key),
    })
  )
}
