import { NextRequest } from 'next/server'
import { z } from 'zod'
import {
  errorResponse,
  forbiddenResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-helpers'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { parseRequestedImportType, validateImportUpload } from '@/lib/import-tools'

const validateSchema = z.object({
  upload_id: z.string().min(1),
  import_type: z.string().min(1),
  column_mapping: z.record(z.string(), z.string().nullable()).default({}),
})

async function requireImportAccess(importType: string) {
  const session = await auth()
  if (!session?.user) {
    return { error: unauthorizedResponse('No valid session'), user: null, importType: null }
  }

  const user = session.user as { schoolId: string | null; role: string }
  if (!user.schoolId) {
    return {
      error: errorResponse('SCHOOL_REQUIRED', 'School context is missing for this account', 400),
      user: null,
      importType: null,
    }
  }

  const parsedType = parseRequestedImportType(importType)
  const permissions =
    parsedType === 'staff'
      ? ['STAFF.create']
      : parsedType === 'fee_payments'
        ? ['FEES.record_payment']
        : ['STUDENTS.create']

  const allowed = await Promise.all(
    permissions.map((permission) => hasPermission(user.schoolId as string, user.role, permission))
  )

  if (!allowed.some(Boolean)) {
    return {
      error: forbiddenResponse('You do not have access to validate this import type'),
      user: null,
      importType: null,
    }
  }

  return {
    error: null,
    user: { schoolId: user.schoolId, role: user.role },
    importType: parsedType,
  }
}

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null)
  const parsed = validateSchema.safeParse(payload)
  if (!parsed.success) {
    return errorResponse(
      'VALIDATION_ERROR',
      parsed.error.issues[0]?.message || 'Invalid validation request'
    )
  }

  let access
  try {
    access = await requireImportAccess(parsed.data.import_type)
  } catch (error) {
    return errorResponse(
      'VALIDATION_ERROR',
      error instanceof Error ? error.message : 'Invalid import type'
    )
  }

  if (access.error || !access.user || !access.importType) {
    return access.error as Response
  }

  try {
    const data = await validateImportUpload({
      schoolId: access.user.schoolId,
      uploadId: parsed.data.upload_id,
      importType: access.importType,
      columnMapping: parsed.data.column_mapping,
    })

    return successResponse(data)
  } catch (error) {
    return errorResponse(
      'VALIDATION_ERROR',
      error instanceof Error ? error.message : 'Validation failed'
    )
  }
}
