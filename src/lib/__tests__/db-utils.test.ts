import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  schoolFindUnique: vi.fn(),
  academicYearFindFirst: vi.fn(),
  termFindMany: vi.fn(),
}))

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({
    school: {
      findUnique: mocks.schoolFindUnique,
    },
    academicYear: {
      findFirst: mocks.academicYearFindFirst,
    },
    term: {
      findMany: mocks.termFindMany,
    },
  })),
}))

import { getCurrentAcademicYear, getCurrentTerms, getSchoolById } from '../db-utils'

describe('db-utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getSchoolById queries by id and includes settings', async () => {
    mocks.schoolFindUnique.mockResolvedValue({ id: 'school-1', settings: [] })

    await getSchoolById('school-1')

    expect(mocks.schoolFindUnique).toHaveBeenCalledWith({
      where: { id: 'school-1' },
      include: { settings: true },
    })
  })

  it('getCurrentAcademicYear enforces school_id scoping and current-year filter', async () => {
    mocks.academicYearFindFirst.mockResolvedValue({ id: 'year-1' })

    const result = await getCurrentAcademicYear('school-1')

    expect(result).toEqual({ id: 'year-1' })
    expect(mocks.academicYearFindFirst).toHaveBeenCalledWith({
      where: {
        school_id: 'school-1',
        is_current: true,
      },
    })
  })

  it('getCurrentTerms returns empty array when no current academic year exists', async () => {
    mocks.academicYearFindFirst.mockResolvedValue(null)

    const terms = await getCurrentTerms('school-1')

    expect(terms).toEqual([])
    expect(mocks.termFindMany).not.toHaveBeenCalled()
  })

  it('getCurrentTerms queries terms scoped by school and current academic year', async () => {
    mocks.academicYearFindFirst.mockResolvedValue({ id: 'year-2026' })
    mocks.termFindMany.mockResolvedValue([{ id: 'term-1' }, { id: 'term-2' }])

    const result = await getCurrentTerms('school-1')

    expect(result).toEqual([{ id: 'term-1' }, { id: 'term-2' }])
    expect(mocks.termFindMany).toHaveBeenCalledWith({
      where: {
        school_id: 'school-1',
        academic_year_id: 'year-2026',
      },
      orderBy: {
        start_date: 'asc',
      },
    })
  })
})
