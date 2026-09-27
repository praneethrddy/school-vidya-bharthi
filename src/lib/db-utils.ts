import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Fetches a school and its associated settings.
 * @param schoolId - The UUID of the school.
 */
export async function getSchoolById(schoolId: string) {
  return prisma.school.findUnique({
    where: { id: schoolId },
    include: {
      settings: true,
    },
  })
}

/**
 * Fetches the currently active academic year for a specific school.
 * @param schoolId - The UUID of the school.
 */
export async function getCurrentAcademicYear(schoolId: string) {
  return prisma.academicYear.findFirst({
    where: {
      school_id: schoolId,
      is_current: true,
    },
  })
}

/**
 * Fetches all terms associated with the currently active academic year for a school.
 * @param schoolId - The UUID of the school.
 */
export async function getCurrentTerms(schoolId: string) {
  const currentAcademicYear = await getCurrentAcademicYear(schoolId)

  if (!currentAcademicYear) {
    return []
  }

  return prisma.term.findMany({
    where: {
      school_id: schoolId,
      academic_year_id: currentAcademicYear.id,
    },
    orderBy: {
      start_date: 'asc',
    },
  })
}
