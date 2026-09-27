import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

const TENANT_SCOPED_MODEL_SET = new Set([
  'SchoolSetting',
  'User',
  'RolePermission',
  'AcademicYear',
  'Term',
  'Class',
  'Staff',
  'Student',
  'Parent',
  'StudentParent',
  'Subject',
  'SubjectAssignment',
  'Attendance',
  'Exam',
  'ExamSubject',
  'Grade',
  'FeeCategory',
  'FeeStructure',
  'FeeConcession',
  'FeePayment',
  'TimetableSlot',
  'Homework',
  'HomeworkSubmission',
  'Announcement',
  'GalleryAlbum',
  'Gallery',
  'Book',
  'BookIssue',
  'TransportRoute',
  'TransportStop',
  'StudentTransport',
  'StaffAttendance',
  'Admission',
  'Notification',
  'PtmSession',
  'PtmBooking',
  'AuditLog',
])

function hasMatchingSchoolId(value: unknown, schoolId: string): boolean {
  if (!value || typeof value !== 'object') {
    return false
  }

  if ('school_id' in value && (value as { school_id?: unknown }).school_id === schoolId) {
    return true
  }

  return Object.values(value as Record<string, unknown>).some((entry) =>
    hasMatchingSchoolId(entry, schoolId)
  )
}

function injectSchoolIdIntoData(data: unknown, schoolId: string): unknown {
  if (Array.isArray(data)) {
    return data.map((entry) => injectSchoolIdIntoData(entry, schoolId))
  }

  if (!data || typeof data !== 'object') {
    return data
  }

  const record = { ...(data as Record<string, unknown>) }
  if ('school_id' in record && record.school_id && record.school_id !== schoolId) {
    throw new Error(`Tenant write rejected because school_id does not match ${schoolId}`)
  }

  if ('school_id' in record || !('school' in record)) {
    record.school_id = schoolId
  }

  return record
}

function mergeTenantWhere(
  where: Record<string, unknown> | undefined,
  schoolId: string
): Record<string, unknown> {
  if (!where) {
    return { school_id: schoolId }
  }

  if (hasMatchingSchoolId(where, schoolId)) {
    return where
  }

  return {
    AND: [where, { school_id: schoolId }],
  }
}

export function createTenantPrisma(options: {
  schoolId?: string | null
  bypassSchoolCheck?: boolean
}): typeof prisma {
  const { schoolId, bypassSchoolCheck = false } = options

  if (bypassSchoolCheck || !schoolId) {
    return prisma
  }

  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }: any) {
          if (!model || !TENANT_SCOPED_MODEL_SET.has(model)) {
            return query(args)
          }

          if (
            operation === 'findMany' ||
            operation === 'findFirst' ||
            operation === 'findFirstOrThrow' ||
            operation === 'count' ||
            operation === 'aggregate' ||
            operation === 'groupBy' ||
            operation === 'updateMany' ||
            operation === 'deleteMany'
          ) {
            return query({
              ...args,
              where: mergeTenantWhere(
                args?.where as Record<string, unknown> | undefined,
                schoolId
              ),
            })
          }

          if (operation === 'create' || operation === 'createMany') {
            return query({
              ...args,
              data: injectSchoolIdIntoData(args?.data, schoolId),
            })
          }

          if (operation === 'findUnique' || operation === 'findUniqueOrThrow') {
            if (!hasMatchingSchoolId(args?.where, schoolId)) {
              throw new Error(
                `Tenant-safe ${operation} on ${model} requires a school_id-aware where clause`
              )
            }
            return query(args)
          }

          if (operation === 'update' || operation === 'delete' || operation === 'upsert') {
            if (!hasMatchingSchoolId(args?.where, schoolId)) {
              throw new Error(
                `Tenant-safe ${operation} on ${model} requires a school_id-aware where clause`
              )
            }

            return query({
              ...args,
              ...(args && 'data' in args && args.data
                ? { data: injectSchoolIdIntoData(args.data, schoolId) }
                : {}),
            })
          }

          return query(args)
        },
      },
    },
  }) as typeof prisma
}
