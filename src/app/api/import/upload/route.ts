import { NextRequest } from 'next/server'
import {
  errorResponse,
  forbiddenResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-helpers'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { parseRequestedImportType, uploadImportFile } from '@/lib/import-tools'

async function requireImportAccess(importType: string | null) {
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

  try {
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
        error: forbiddenResponse('You do not have access to upload this import type'),
        user: null,
        importType: null,
      }
    }

    return {
      error: null,
      user: { schoolId: user.schoolId, role: user.role },
      importType: parsedType,
    }
  } catch (error) {
    return {
      error: errorResponse(
        'VALIDATION_ERROR',
        error instanceof Error ? error.message : 'Invalid import type',
        400
      ),
      user: null,
      importType: null,
    }
  }
}

export async function POST(request: NextRequest) {
  const formData = await request.formData().catch(() => null)
  if (!formData) {
    return errorResponse('VALIDATION_ERROR', 'Expected multipart form data')
  }

  const access = await requireImportAccess(formData.get('import_type')?.toString() ?? null)
  if (access.error || !access.user || !access.importType) {
    return access.error as Response
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return errorResponse('VALIDATION_ERROR', 'CSV file is required')
  }

  try {
    const data = await uploadImportFile({
      file,
      importType: access.importType,
    })

    return successResponse(data)
  } catch (error) {
    return errorResponse(
      'UPLOAD_ERROR',
      error instanceof Error ? error.message : 'Failed to upload CSV'
    )
  }
}
