type UploadOptions = {
  baseUrl?: string
  bucket?: string
}

const defaultOptions: Required<UploadOptions> = {
  baseUrl: 'https://mock.r2.local',
  bucket: 'test-bucket',
}

let options: Required<UploadOptions> = { ...defaultOptions }

export async function uploadFile(key: string): Promise<string> {
  return `${options.baseUrl}/${options.bucket}/${key}`
}

export function configureR2Mock(nextOptions: UploadOptions): void {
  options = {
    ...options,
    ...nextOptions,
  }
}

export function resetR2Mock(): void {
  options = { ...defaultOptions }
}
