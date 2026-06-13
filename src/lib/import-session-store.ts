import type { ImportType, ImportValidationSummary, ParsedCsvResult } from '@/lib/import-types'

export interface PreparedImportRow {
  row_number: number
  raw: Record<string, string>
  data: Record<string, unknown>
}

export interface StoredValidationResult {
  importType: ImportType
  columnMapping: Record<string, string | null>
  summary: ImportValidationSummary
  preparedRows: PreparedImportRow[]
}

export interface UploadSession {
  id: string
  createdAt: number
  fileName: string
  fileSize: number
  parsed: ParsedCsvResult
  validation?: StoredValidationResult
}

const ONE_HOUR = 60 * 60 * 1000

const globalForImports = globalThis as typeof globalThis & {
  __vbImportSessions?: Map<string, UploadSession>
}

function getStore(): Map<string, UploadSession> {
  if (!globalForImports.__vbImportSessions) {
    globalForImports.__vbImportSessions = new Map<string, UploadSession>()
  }

  pruneExpiredSessions(globalForImports.__vbImportSessions)
  return globalForImports.__vbImportSessions
}

function pruneExpiredSessions(store: Map<string, UploadSession>) {
  const cutoff = Date.now() - ONE_HOUR
  for (const [key, session] of store.entries()) {
    if (session.createdAt < cutoff) {
      store.delete(key)
    }
  }
}

export function createUploadSession(input: {
  fileName: string
  fileSize: number
  parsed: ParsedCsvResult
}): UploadSession {
  const id = `upload_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
  const session: UploadSession = {
    id,
    createdAt: Date.now(),
    fileName: input.fileName,
    fileSize: input.fileSize,
    parsed: input.parsed,
  }

  getStore().set(id, session)
  return session
}

export function getUploadSession(uploadId: string): UploadSession | null {
  return getStore().get(uploadId) ?? null
}

export function saveValidationResult(
  uploadId: string,
  validation: StoredValidationResult
): UploadSession | null {
  const store = getStore()
  const session = store.get(uploadId)
  if (!session) {
    return null
  }

  const nextSession: UploadSession = {
    ...session,
    validation,
  }
  store.set(uploadId, nextSession)
  return nextSession
}

export function deleteUploadSession(uploadId: string): void {
  getStore().delete(uploadId)
}
