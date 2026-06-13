import { afterEach, describe, expect, it, vi } from 'vitest'
vi.unmock('../prisma')
import { readFileSync } from 'fs'
import path from 'path'
import { createTenantPrisma, prisma } from '../prisma'

type QueryHook = (input: {
  model: string
  operation: string
  args: Record<string, unknown>
  query: (args: Record<string, unknown>) => Promise<unknown>
}) => Promise<unknown>

function captureTenantHook(): QueryHook {
  let capturedHook: QueryHook | null = null

  vi.spyOn(prisma as any, '$extends').mockImplementation((extension: any) => {
    capturedHook = extension.query.$allModels.$allOperations as QueryHook
    return extension as any
  })

  createTenantPrisma({ schoolId: 'school-1' })
  if (!capturedHook) {
    throw new Error('Failed to capture tenant Prisma query hook')
  }

  return capturedHook
}

describe('createTenantPrisma', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('TEST-TP-001 findMany auto-adds school_id to where', async () => {
    const hook = captureTenantHook()
    const query = vi.fn(async (args) => args)

    await hook({
      model: 'Student',
      operation: 'findMany',
      args: { where: { is_active: true } },
      query,
    })

    expect(query).toHaveBeenCalledWith({
      where: {
        AND: [{ is_active: true }, { school_id: 'school-1' }],
      },
    })
  })

  it('TEST-TP-002 create auto-injects school_id into data', async () => {
    const hook = captureTenantHook()
    const query = vi.fn(async (args) => args)

    await hook({
      model: 'Student',
      operation: 'create',
      args: {
        data: {
          first_name: 'Aarav',
          last_name: 'Sharma',
        },
      },
      query,
    })

    expect(query).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          first_name: 'Aarav',
          last_name: 'Sharma',
          school_id: 'school-1',
        }),
      })
    )
  })

  it('TEST-TP-003 update rejects when where is missing school_id', async () => {
    const hook = captureTenantHook()

    await expect(
      hook({
        model: 'Student',
        operation: 'update',
        args: { where: { id: 'student-1' }, data: { first_name: 'Updated' } },
        query: async (args) => args,
      })
    ).rejects.toThrow('requires a school_id-aware where clause')
  })

  it('TEST-TP-004 delete rejects when where is missing school_id', async () => {
    const hook = captureTenantHook()

    await expect(
      hook({
        model: 'Student',
        operation: 'delete',
        args: { where: { id: 'student-1' } },
        query: async (args) => args,
      })
    ).rejects.toThrow('requires a school_id-aware where clause')
  })

  it('TEST-TP-005 upsert requires school_id in where', async () => {
    const hook = captureTenantHook()

    await expect(
      hook({
        model: 'Student',
        operation: 'upsert',
        args: {
          where: { id: 'student-1' },
          update: { first_name: 'Updated' },
          create: { first_name: 'Aarav' },
        },
        query: async (args) => args,
      })
    ).rejects.toThrow('requires a school_id-aware where clause')
  })

  it('TEST-TP-006 non-tenant models bypass the extension logic', async () => {
    const hook = captureTenantHook()
    const query = vi.fn(async (args) => args)

    const inputArgs = { where: { id: 'school-1' } }
    await hook({
      model: 'School',
      operation: 'findMany',
      args: inputArgs,
      query,
    })

    expect(query).toHaveBeenCalledWith(inputArgs)
  })

  it('TEST-TP-007 bypassSchoolCheck=true returns raw prisma client', () => {
    expect(createTenantPrisma({ schoolId: 'school-1', bypassSchoolCheck: true })).toBe(prisma)
    expect(createTenantPrisma({ schoolId: null })).toBe(prisma)
  })

  it('TEST-TP-008 cross-tenant writes throw when data.school_id mismatches active tenant', async () => {
    const hook = captureTenantHook()

    await expect(
      hook({
        model: 'Student',
        operation: 'create',
        args: {
          data: {
            school_id: 'school-2',
            first_name: 'Aarav',
          },
        },
        query: async (args) => args,
      })
    ).rejects.toThrow('Tenant write rejected because school_id does not match school-1')
  })

  it('TEST-TP-009 TENANT_SCOPED_MODEL_SET contains all required tenant models', () => {
    const prismaSourcePath = path.resolve(process.cwd(), 'src', 'lib', 'prisma.ts')
    const source = readFileSync(prismaSourcePath, 'utf8')
    const match = source.match(/const TENANT_SCOPED_MODEL_SET = new Set\(\[([\s\S]*?)\]\)/)

    if (!match) {
      throw new Error('TENANT_SCOPED_MODEL_SET declaration not found in src/lib/prisma.ts')
    }

    const modelsInSource = Array.from(match[1].matchAll(/'([^']+)'/g)).map((entry) => entry[1])
    const expectedModels = [
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
    ]

    expect(new Set(modelsInSource)).toEqual(new Set(expectedModels))
  })
})
