import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  studentParentFindFirst: vi.fn(),
  studentParentFindMany: vi.fn(),
}))

vi.mock('../prisma', () => ({
  prisma: {
    studentParent: {
      findFirst: mocks.studentParentFindFirst,
      findMany: mocks.studentParentFindMany,
    },
  },
}))

import { getParentChildren, validateParentChildAccess } from '../parent-utils'

describe('parent-utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('validateParentChildAccess returns true when link exists with school_id scoping', async () => {
    mocks.studentParentFindFirst.mockResolvedValue({
      id: 'link-1',
    })

    const allowed = await validateParentChildAccess('parent-user-1', 'student-1', 'school-1')

    expect(allowed).toBe(true)
    expect(mocks.studentParentFindFirst).toHaveBeenCalledWith({
      where: {
        school_id: 'school-1',
        student_id: 'student-1',
        parent: { user_id: 'parent-user-1' },
      },
    })
  })

  it('validateParentChildAccess returns false when no link exists', async () => {
    mocks.studentParentFindFirst.mockResolvedValue(null)

    const allowed = await validateParentChildAccess('parent-user-1', 'student-404', 'school-1')

    expect(allowed).toBe(false)
  })

  it('getParentChildren fetches children with class include and primary-first ordering', async () => {
    mocks.studentParentFindMany.mockResolvedValue([
      {
        student: {
          id: 'student-1',
          class: { id: 'class-1', name: 'Grade 6' },
        },
      },
    ])

    const result = await getParentChildren('parent-user-1', 'school-1')

    expect(result).toHaveLength(1)
    expect(mocks.studentParentFindMany).toHaveBeenCalledWith({
      where: {
        school_id: 'school-1',
        parent: { user_id: 'parent-user-1' },
      },
      include: {
        student: {
          include: {
            class: true,
          },
        },
      },
      orderBy: { is_primary: 'desc' },
    })
  })
})
