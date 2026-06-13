import { NextRequest } from 'next/server'
import {
  errorResponse,
  forbiddenResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-helpers'
import { getRequestMetadata } from '@/lib/admissions'
import { auth } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { uploadFile } from '@/lib/r2'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

interface SessionUser {
  id: string
  role: string
  schoolId: string | null
}

interface SchoolSessionUser extends SessionUser {
  schoolId: string
}

function isAllowedMimeType(type: string): boolean {
  return type.startsWith('image/') || type === 'application/pdf'
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function collectFiles(formData: FormData): File[] {
  const fromFiles = formData.getAll('files')
  const fromDocuments = formData.getAll('documents')
  const singleFile = formData.get('file')

  return [...fromFiles, ...fromDocuments, ...(singleFile ? [singleFile] : [])].filter(
    (item): item is File => item instanceof File
  )
}

async function requireSchoolUser() {
  const session = await auth()
  if (!session?.user) {
    return {
      error: unauthorizedResponse('No valid session'),
      user: null,
    }
  }

  const user = session.user as SessionUser
  if (!user.schoolId) {
    return {
      error: errorResponse('SCHOOL_REQUIRED', 'School context is missing for this account', 400),
      user: null,
    }
  }

  return {
    error: null,
    user: { ...user, schoolId: user.schoolId } as SchoolSessionUser,
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionCheck = await requireSchoolUser()
  if (sessionCheck.error) {
    return sessionCheck.error
  }

  const user = sessionCheck.user
  const canProcess = await hasPermission(user.schoolId, user.role, 'ADMISSIONS.process')
  if (!canProcess) {
    return forbiddenResponse('Missing permission: ADMISSIONS.process')
  }

  const { id } = await params
  const admission = await prisma.admission.findFirst({
    where: {
      id,
      school_id: user.schoolId,
    },
    select: {
      id: true,
      documents_url: true,
    },
  })

  if (!admission) {
    return errorResponse('NOT_FOUND', 'Admission application not found', 404)
  }

  const formData = await request.formData().catch(() => null)
  if (!formData) {
    return errorResponse('INVALID_FORM_DATA', 'Invalid multipart form data', 400)
  }

  const files = collectFiles(formData)
  if (files.length === 0) {
    return errorResponse('NO_FILES', 'No files provided', 400)
  }

  const uploadedUrls: string[] = []

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      return errorResponse('FILE_TOO_LARGE', `File \"${file.name}\" exceeds 10MB limit`, 400)
    }

    if (!isAllowedMimeType(file.type)) {
      return errorResponse(
        'INVALID_FILE_TYPE',
        `Unsupported file type for \"${file.name}\". Allowed: image/*, application/pdf`,
        400
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const randomPart = crypto.randomUUID()
    const key = `admissions/${user.schoolId}/${admission.id}/${randomPart}-${sanitizeFileName(file.name)}`
    const url = await uploadFile(key, buffer, file.type)
    uploadedUrls.push(url)
  }

  const mergedDocuments = [...(admission.documents_url || []), ...uploadedUrls]

  const updated = await prisma.admission.update({
    where: {
      id: admission.id,
    },
    data: {
      documents_url: mergedDocuments,
      updated_at: new Date(),
      processed_by: user.id,
    },
    select: {
      id: true,
      documents_url: true,
      updated_at: true,
    },
  })

  await createAuditLog({
    school_id: user.schoolId,
    user_id: user.id,
    action: 'UPDATE',
    entity_type: 'admission',
    entity_id: admission.id,
    old_value: {
      documents_url: admission.documents_url,
    },
    new_value: {
      documents_url: mergedDocuments,
      uploaded_urls: uploadedUrls,
    },
    ...getRequestMetadata(request),
  })

  return successResponse({
    id: updated.id,
    uploaded: uploadedUrls,
    documents_url: updated.documents_url,
    updated_at: updated.updated_at.toISOString(),
  })
}
