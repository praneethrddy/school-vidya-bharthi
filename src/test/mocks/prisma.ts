import { vi } from 'vitest'

const MODEL_METHOD_NAMES = [
  'findMany',
  'findFirst',
  'findUnique',
  'create',
  'update',
  'delete',
  'count',
] as const

export const PRISMA_MODEL_NAMES = [
  'school',
  'schoolSetting',
  'user',
  'permission',
  'rolePermission',
  'academicYear',
  'term',
  'class',
  'staff',
  'student',
  'parent',
  'studentParent',
  'subject',
  'subjectAssignment',
  'attendance',
  'exam',
  'examSubject',
  'grade',
  'feeCategory',
  'feeStructure',
  'feeConcession',
  'feePayment',
  'timetableSlot',
  'homework',
  'homeworkSubmission',
  'announcement',
  'galleryAlbum',
  'gallery',
  'book',
  'bookIssue',
  'transportRoute',
  'transportStop',
  'studentTransport',
  'staffAttendance',
  'admission',
  'notification',
  'ptmSession',
  'ptmBooking',
  'auditLog',
] as const

export type PrismaModelMethodName = (typeof MODEL_METHOD_NAMES)[number]
export type PrismaModelName = (typeof PRISMA_MODEL_NAMES)[number]

export type PrismaModelMock = Record<PrismaModelMethodName, ReturnType<typeof vi.fn>>

type PrismaModelMap = Record<PrismaModelName, PrismaModelMock>

export type PrismaMock = PrismaModelMap & {
  $transaction: ReturnType<typeof vi.fn>
  $connect: ReturnType<typeof vi.fn>
  $disconnect: ReturnType<typeof vi.fn>
}

function createModelMock(): PrismaModelMock {
  return {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  }
}

function createModelMap(): PrismaModelMap {
  const modelMap = {} as PrismaModelMap
  for (const modelName of PRISMA_MODEL_NAMES) {
    modelMap[modelName] = createModelMock()
  }
  return modelMap
}

export function createPrismaMock(): PrismaMock {
  const modelMap = createModelMap()
  const mock = modelMap as PrismaMock

  mock.$connect = vi.fn(async () => undefined)
  mock.$disconnect = vi.fn(async () => undefined)
  mock.$transaction = vi.fn(async (input: unknown) => {
    if (typeof input === 'function') {
      return (input as (tx: PrismaMock) => unknown | Promise<unknown>)(mock)
    }
    if (Array.isArray(input)) {
      return Promise.all(input)
    }
    return input
  })

  return mock
}

export const prismaMock = createPrismaMock()

export function resetPrismaMock(mock: PrismaMock = prismaMock): void {
  mock.$connect.mockReset()
  mock.$disconnect.mockReset()
  mock.$transaction.mockReset()
  mock.$connect.mockResolvedValue(undefined)
  mock.$disconnect.mockResolvedValue(undefined)
  mock.$transaction.mockImplementation(async (input: unknown) => {
    if (typeof input === 'function') {
      return (input as (tx: PrismaMock) => unknown | Promise<unknown>)(mock)
    }
    if (Array.isArray(input)) {
      return Promise.all(input)
    }
    return input
  })

  for (const modelName of PRISMA_MODEL_NAMES) {
    const model = mock[modelName]
    for (const methodName of MODEL_METHOD_NAMES) {
      model[methodName].mockReset()
    }
  }
}
