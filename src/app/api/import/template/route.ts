import { NextRequest, NextResponse } from 'next/server'
import { errorResponse, forbiddenResponse, unauthorizedResponse } from '@/lib/api-helpers'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { getImportTemplate, parseRequestedImportType } from '@/lib/import-tools'

async function requireImportAccess(type: string | null) {
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

  const parsedType = parseRequestedImportType(type)
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
      error: forbiddenResponse('You do not have access to download this template'),
      user: null,
      importType: null,
    }
  }

  return {
    error: null,
    user,
    importType: parsedType,
  }
}

export async function GET(request: NextRequest) {
  const importType = request.nextUrl.searchParams.get('type')

  let access
  try {
    access = await requireImportAccess(importType)
  } catch (error) {
    return errorResponse(
      'VALIDATION_ERROR',
      error instanceof Error ? error.message : 'Invalid import type'
    )
  }

  if (access.error || !access.importType) {
    return access.error as Response
  }

  const template = getImportTemplate(access.importType)

  return new NextResponse(template.contents, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${template.fileName}"`,
      'Cache-Control': 'no-store',
    },
  })
}
