import {
  AttendanceStatus,
  Prisma,
  StaffAttendanceStatus,
} from '@prisma/client'
import { format } from 'date-fns'
import { prisma } from '@/lib/prisma'
import type {
  AcademicExamComparisonItem,
  AcademicGradeDistributionItem,
  AcademicReport,
  AcademicSubjectPerformanceItem,
  AcademicTopperItem,
  AttendanceDailySummaryItem,
  AttendanceReport,
  AttendanceStudentWiseItem,
  FinancialBreakdownItem,
  FinancialReport,
  ReportClassInfo,
  ReportMetaPayload,
  StaffAttendanceReport,
  StaffAttendanceWiseItem,
} from '@/lib/report-types'

function toNumber(value: Prisma.Decimal | number | null | undefined): number {
  if (value === null || value === undefined) {
    return 0
  }

  return typeof value === 'number' ? value : value.toNumber()
}

function round(value: number): number {
  return Number(value.toFixed(2))
}

function percentage(part: number, total: number): number {
  if (!total) return 0
  return round((part / total) * 100)
}

function formatClassName(name: string, section: string | null | undefined): string {
  return section ? `${name} ${section}` : name
}

function toDateKey(date: Date): string {
  return date.toISOString().split('T')[0]
}

function getAttendanceWeight(status: AttendanceStatus): number {
  switch (status) {
    case 'PRESENT':
    case 'LATE':
      return 1
    case 'HALF_DAY':
      return 0.5
    default:
      return 0
  }
}

function getStaffAttendanceWeight(status: StaffAttendanceStatus): number {
  switch (status) {
    case 'PRESENT':
    case 'LATE':
      return 1
    case 'HALF_DAY':
      return 0.5
    default:
      return 0
  }
}

function deriveGradeBand(score: number): string {
  if (score >= 90) return 'A+'
  if (score >= 80) return 'A'
  if (score >= 70) return 'B'
  if (score >= 60) return 'C'
  if (score >= 50) return 'D'
  return 'F'
}

function sortBreakdown(items: FinancialBreakdownItem[]): FinancialBreakdownItem[] {
  return [...items].sort((left, right) => right.outstanding - left.outstanding || left.name.localeCompare(right.name))
}

export async function getReportsMeta(schoolId: string): Promise<ReportMetaPayload> {
  const school = await prisma.school.findFirst({
    where: { id: schoolId },
    select: {
      id: true,
      name: true,
      academic_years: {
        where: { is_current: true },
        select: { id: true },
        take: 1,
      },
    },
  })

  if (!school) {
    throw new Error('School not found')
  }

  const currentAcademicYearId = school.academic_years[0]?.id || null

  const [classes, terms, exams, feeCategories] = await Promise.all([
    prisma.class.findMany({
      where: {
        school_id: schoolId,
        ...(currentAcademicYearId ? { academic_year_id: currentAcademicYearId } : {}),
      },
      select: {
        id: true,
        name: true,
        section: true,
        academic_year_id: true,
      },
      orderBy: [{ name: 'asc' }, { section: 'asc' }],
    }),
    prisma.term.findMany({
      where: {
        school_id: schoolId,
        ...(currentAcademicYearId ? { academic_year_id: currentAcademicYearId } : {}),
      },
      select: {
        id: true,
        name: true,
        academic_year_id: true,
      },
      orderBy: { start_date: 'asc' },
    }),
    prisma.exam.findMany({
      where: {
        school_id: schoolId,
        ...(currentAcademicYearId ? { academic_year_id: currentAcademicYearId } : {}),
      },
      select: {
        id: true,
        name: true,
        class_id: true,
        term_id: true,
      },
      orderBy: [{ start_date: 'asc' }, { name: 'asc' }],
    }),
    prisma.feeCategory.findMany({
      where: { school_id: schoolId },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    }),
  ])

  return {
    school: {
      id: school.id,
      name: school.name,
    },
    current_academic_year_id: currentAcademicYearId,
    classes,
    terms,
    exams,
    fee_categories: feeCategories,
  }
}

export async function getSchoolReportContext(schoolId: string): Promise<{ id: string; name: string; slug: string }> {
  const school = await prisma.school.findFirst({
    where: { id: schoolId },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  })

  if (!school) {
    throw new Error('School not found')
  }

  return school
}

export async function buildAttendanceReport(params: {
  schoolId: string
  classId: string
  dateFrom: string
  dateTo: string
}): Promise<AttendanceReport> {
  const [schoolClass, students, records] = await Promise.all([
    prisma.class.findFirst({
      where: {
        id: params.classId,
        school_id: params.schoolId,
      },
      select: {
        id: true,
        name: true,
        section: true,
      },
    }),
    prisma.student.findMany({
      where: {
        school_id: params.schoolId,
        class_id: params.classId,
        is_active: true,
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        roll_number: true,
      },
      orderBy: [{ roll_number: 'asc' }, { first_name: 'asc' }],
    }),
    prisma.attendance.findMany({
      where: {
        school_id: params.schoolId,
        class_id: params.classId,
        date: {
          gte: new Date(`${params.dateFrom}T00:00:00.000Z`),
          lte: new Date(`${params.dateTo}T23:59:59.999Z`),
        },
      },
      select: {
        student_id: true,
        date: true,
        status: true,
      },
      orderBy: { date: 'asc' },
    }),
  ])

  if (!schoolClass) {
    throw new Error('Class not found')
  }

  const reportClass: ReportClassInfo = {
    id: schoolClass.id,
    name: schoolClass.name,
    section: schoolClass.section,
  }

  const instructionalDates = Array.from(
    new Set(
      records
        .filter((record) => record.status !== 'HOLIDAY')
        .map((record) => toDateKey(record.date))
    )
  )

  const recordMap = new Map<string, AttendanceStatus>()
  for (const record of records) {
    recordMap.set(`${record.student_id}:${toDateKey(record.date)}`, record.status)
  }

  const studentWise: AttendanceStudentWiseItem[] = students.map((student) => {
    let present = 0
    let absent = 0
    let late = 0
    let halfDay = 0
    let attendedValue = 0

    for (const date of instructionalDates) {
      const status = recordMap.get(`${student.id}:${date}`)
      if (!status) continue

      if (status === 'PRESENT') present += 1
      if (status === 'ABSENT') absent += 1
      if (status === 'LATE') late += 1
      if (status === 'HALF_DAY') halfDay += 1

      attendedValue += getAttendanceWeight(status)
    }

    return {
      student_id: student.id,
      student_name: `${student.first_name} ${student.last_name}`.trim(),
      roll_number: student.roll_number || '',
      total_days: instructionalDates.length,
      present,
      absent,
      late,
      half_day: halfDay,
      percentage: percentage(attendedValue, instructionalDates.length),
    }
  })

  const dailySummary: AttendanceDailySummaryItem[] = instructionalDates.map((date) => {
    let present = 0
    let absent = 0
    let attendedValue = 0

    for (const student of students) {
      const status = recordMap.get(`${student.id}:${date}`)
      if (!status) continue

      if (status === 'PRESENT' || status === 'LATE') present += 1
      if (status === 'ABSENT') absent += 1
      attendedValue += getAttendanceWeight(status)
    }

    return {
      date,
      present,
      absent,
      percentage: percentage(attendedValue, students.length),
    }
  })

  const bestStudent = [...studentWise].sort(
    (left, right) => right.percentage - left.percentage || left.student_name.localeCompare(right.student_name)
  )[0]
  const worstStudent = [...studentWise].sort(
    (left, right) => left.percentage - right.percentage || left.student_name.localeCompare(right.student_name)
  )[0]

  return {
    report_type: 'attendance',
    period: {
      from: params.dateFrom,
      to: params.dateTo,
    },
    class: reportClass,
    data: {
      student_wise: studentWise,
      daily_summary: dailySummary,
      overall: {
        average_attendance: round(
          studentWise.reduce((sum, student) => sum + student.percentage, 0) / (studentWise.length || 1)
        ),
        best_attendance_student: bestStudent?.student_name || 'N/A',
        worst_attendance_student: worstStudent?.student_name || 'N/A',
      },
    },
  }
}

export async function buildStaffAttendanceReport(params: {
  schoolId: string
  dateFrom: string
  dateTo: string
  department?: string | null
}): Promise<StaffAttendanceReport> {
  const [staffMembers, records] = await Promise.all([
    prisma.staff.findMany({
      where: {
        school_id: params.schoolId,
        is_active: true,
        ...(params.department ? { department: params.department } : {}),
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        employee_code: true,
      },
      orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }],
    }),
    prisma.staffAttendance.findMany({
      where: {
        school_id: params.schoolId,
        date: {
          gte: new Date(`${params.dateFrom}T00:00:00.000Z`),
          lte: new Date(`${params.dateTo}T23:59:59.999Z`),
        },
        ...(params.department
          ? {
              staff: {
                department: params.department,
              },
            }
          : {}),
      },
      select: {
        staff_id: true,
        date: true,
        status: true,
      },
      orderBy: { date: 'asc' },
    }),
  ])

  const instructionalDates = Array.from(new Set(records.map((record) => toDateKey(record.date))))
  const recordMap = new Map<string, StaffAttendanceStatus>()

  for (const record of records) {
    recordMap.set(`${record.staff_id}:${toDateKey(record.date)}`, record.status)
  }

  const staffWise: StaffAttendanceWiseItem[] = staffMembers.map((staffMember) => {
    let present = 0
    let absent = 0
    let late = 0
    let halfDay = 0
    let leave = 0
    let attendanceValue = 0

    for (const date of instructionalDates) {
      const status = recordMap.get(`${staffMember.id}:${date}`)
      if (!status) continue

      if (status === 'PRESENT') present += 1
      if (status === 'ABSENT') absent += 1
      if (status === 'LATE') late += 1
      if (status === 'HALF_DAY') halfDay += 1
      if (status === 'LEAVE') leave += 1

      attendanceValue += getStaffAttendanceWeight(status)
    }

    return {
      staff_id: staffMember.id,
      staff_name: `${staffMember.first_name} ${staffMember.last_name}`.trim(),
      employee_code: staffMember.employee_code || '',
      total_days: instructionalDates.length,
      present,
      absent,
      late,
      half_day: halfDay,
      leave,
      percentage: percentage(attendanceValue, instructionalDates.length),
    }
  })

  const dailySummary: AttendanceDailySummaryItem[] = instructionalDates.map((date) => {
    let present = 0
    let absent = 0
    let attendanceValue = 0

    for (const staffMember of staffMembers) {
      const status = recordMap.get(`${staffMember.id}:${date}`)
      if (!status) continue

      if (status === 'PRESENT' || status === 'LATE') present += 1
      if (status === 'ABSENT') absent += 1
      attendanceValue += getStaffAttendanceWeight(status)
    }

    return {
      date,
      present,
      absent,
      percentage: percentage(attendanceValue, staffMembers.length),
    }
  })

  const bestStaff = [...staffWise].sort(
    (left, right) => right.percentage - left.percentage || left.staff_name.localeCompare(right.staff_name)
  )[0]
  const worstStaff = [...staffWise].sort(
    (left, right) => left.percentage - right.percentage || left.staff_name.localeCompare(right.staff_name)
  )[0]

  return {
    report_type: 'staff_attendance',
    period: {
      from: params.dateFrom,
      to: params.dateTo,
    },
    department: params.department || null,
    data: {
      staff_wise: staffWise,
      daily_summary: dailySummary,
      overall: {
        average_attendance: round(
          staffWise.reduce((sum, staffMember) => sum + staffMember.percentage, 0) /
            (staffWise.length || 1)
        ),
        best_attendance_staff: bestStaff?.staff_name || 'N/A',
        worst_attendance_staff: worstStaff?.staff_name || 'N/A',
      },
    },
  }
}

export async function buildAcademicReport(params: {
  schoolId: string
  classId: string
  termId?: string | null
  examId?: string | null
}): Promise<AcademicReport> {
  const schoolClass = await prisma.class.findFirst({
    where: {
      id: params.classId,
      school_id: params.schoolId,
    },
    select: {
      id: true,
      name: true,
      section: true,
    },
  })

  if (!schoolClass) {
    throw new Error('Class not found')
  }

  const selectedExam = params.examId
    ? await prisma.exam.findFirst({
        where: {
          id: params.examId,
          class_id: params.classId,
          school_id: params.schoolId,
        },
        select: {
          id: true,
          name: true,
          term_id: true,
        },
      })
    : null

  const effectiveTermId = params.termId || selectedExam?.term_id || null
  const comparisonExams = await prisma.exam.findMany({
    where: {
      school_id: params.schoolId,
      class_id: params.classId,
      ...(effectiveTermId ? { term_id: effectiveTermId } : {}),
    },
    select: {
      id: true,
      name: true,
      term_id: true,
    },
    orderBy: [{ start_date: 'asc' }, { name: 'asc' }],
  })

  const scopedExamIds = params.examId
    ? [params.examId]
    : comparisonExams.map((exam) => exam.id)

  if (scopedExamIds.length === 0) {
    return {
      report_type: 'academic',
      class: {
        id: schoolClass.id,
        name: schoolClass.name,
        section: schoolClass.section,
      },
      term: { id: effectiveTermId, name: null },
      exam: { id: params.examId || null, name: selectedExam?.name || null },
      data: {
        subject_performance: [],
        toppers: [],
        grade_distribution: [],
        exam_comparison: [],
        summary: {
          overall_average: 0,
          overall_pass_percentage: 0,
          students_evaluated: 0,
        },
      },
    }
  }

  const [term, students, grades] = await Promise.all([
    effectiveTermId
      ? prisma.term.findFirst({
          where: {
            id: effectiveTermId,
            school_id: params.schoolId,
          },
          select: {
            id: true,
            name: true,
          },
        })
      : Promise.resolve(null),
    prisma.student.findMany({
      where: {
        school_id: params.schoolId,
        class_id: params.classId,
        is_active: true,
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        roll_number: true,
      },
      orderBy: [{ roll_number: 'asc' }, { first_name: 'asc' }],
    }),
    prisma.grade.findMany({
      where: {
        school_id: params.schoolId,
        exam_id: {
          in: scopedExamIds,
        },
      },
      select: {
        student_id: true,
        exam_id: true,
        subject_id: true,
        marks_obtained: true,
        grade: true,
        exam: {
          select: {
            id: true,
            name: true,
            exam_subjects: {
              select: {
                subject_id: true,
                max_marks: true,
                passing_marks: true,
                subject: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [{ exam_id: 'asc' }, { subject_id: 'asc' }],
    }),
  ])

  const studentMap = new Map(
    students.map((student) => [
      student.id,
      {
        id: student.id,
        name: `${student.first_name} ${student.last_name}`.trim(),
        rollNumber: student.roll_number || '',
      },
    ])
  )

  const examMetaMap = new Map<string, Map<string, { subjectName: string; maxMarks: number; passingMarks: number }>>()
  for (const grade of grades) {
    if (!examMetaMap.has(grade.exam_id)) {
      const subjectMap = new Map<string, { subjectName: string; maxMarks: number; passingMarks: number }>()
      for (const examSubject of grade.exam.exam_subjects) {
        subjectMap.set(examSubject.subject_id, {
          subjectName: examSubject.subject.name,
          maxMarks: examSubject.max_marks,
          passingMarks: examSubject.passing_marks,
        })
      }
      examMetaMap.set(grade.exam_id, subjectMap)
    }
  }

  const subjectBuckets = new Map<
    string,
    {
      item: AcademicSubjectPerformanceItem
      passCount: number
      failCount: number
      totalMarks: number
    }
  >()

  const studentTotals = new Map<string, { obtained: number; max: number }>()
  const gradeBands = new Map<string, number>()
  let evaluatedCount = 0
  let passedCount = 0

  for (const grade of grades) {
    const marks = grade.marks_obtained ? toNumber(grade.marks_obtained) : null
    const meta = examMetaMap.get(grade.exam_id)?.get(grade.subject_id)
    if (!meta || marks === null) continue

    evaluatedCount += 1
    if (marks >= meta.passingMarks) {
      passedCount += 1
    }

    if (!subjectBuckets.has(grade.subject_id)) {
      subjectBuckets.set(grade.subject_id, {
        item: {
          subject_id: grade.subject_id,
          subject_name: meta.subjectName,
          pass_percentage: 0,
          fail_percentage: 0,
          highest_marks: marks,
          lowest_marks: marks,
          average_marks: 0,
          max_marks: meta.maxMarks,
          passing_marks: meta.passingMarks,
          students_evaluated: 0,
        },
        passCount: 0,
        failCount: 0,
        totalMarks: 0,
      })
    }

    const bucket = subjectBuckets.get(grade.subject_id)!
    bucket.item.students_evaluated += 1
    bucket.item.highest_marks = Math.max(bucket.item.highest_marks, marks)
    bucket.item.lowest_marks = Math.min(bucket.item.lowest_marks, marks)
    bucket.item.max_marks = Math.max(bucket.item.max_marks, meta.maxMarks)
    bucket.item.passing_marks = Math.max(bucket.item.passing_marks, meta.passingMarks)
    bucket.totalMarks += marks

    if (marks >= meta.passingMarks) {
      bucket.passCount += 1
    } else {
      bucket.failCount += 1
    }

    const studentTotal = studentTotals.get(grade.student_id) || { obtained: 0, max: 0 }
    studentTotal.obtained += marks
    studentTotal.max += meta.maxMarks
    studentTotals.set(grade.student_id, studentTotal)

    const gradeBand = grade.grade || deriveGradeBand(percentage(marks, meta.maxMarks))
    gradeBands.set(gradeBand, (gradeBands.get(gradeBand) || 0) + 1)
  }

  const subjectPerformance = Array.from(subjectBuckets.values())
    .map((bucket) => ({
      ...bucket.item,
      average_marks: round(bucket.totalMarks / (bucket.item.students_evaluated || 1)),
      pass_percentage: percentage(bucket.passCount, bucket.item.students_evaluated),
      fail_percentage: percentage(bucket.failCount, bucket.item.students_evaluated),
    }))
    .sort((left, right) => left.subject_name.localeCompare(right.subject_name))

  const toppers: AcademicTopperItem[] = Array.from(studentTotals.entries())
    .map(([studentId, totals]) => ({
      rank: 0,
      student_id: studentId,
      student_name: studentMap.get(studentId)?.name || 'Unknown Student',
      roll_number: studentMap.get(studentId)?.rollNumber || '',
      total_marks: round(totals.obtained),
      total_max_marks: round(totals.max),
      percentage: percentage(totals.obtained, totals.max),
    }))
    .sort((left, right) => right.percentage - left.percentage || left.student_name.localeCompare(right.student_name))
    .slice(0, 10)
    .map((student, index) => ({
      ...student,
      rank: index + 1,
    }))

  const gradeDistribution: AcademicGradeDistributionItem[] = Array.from(gradeBands.entries())
    .map(([grade, count]) => ({
      grade,
      count,
      percentage: percentage(count, evaluatedCount),
    }))
    .sort((left, right) => right.count - left.count || left.grade.localeCompare(right.grade))

  const examComparison: AcademicExamComparisonItem[] = comparisonExams.map((exam) => {
    const examGrades = grades.filter((grade) => grade.exam_id === exam.id && grade.marks_obtained !== null)
    if (examGrades.length === 0) {
      return {
        exam_id: exam.id,
        exam_name: exam.name,
        average_percentage: 0,
        pass_percentage: 0,
      }
    }

    let totalPercentage = 0
    let passCounter = 0

    for (const grade of examGrades) {
      const marks = toNumber(grade.marks_obtained)
      const meta = examMetaMap.get(grade.exam_id)?.get(grade.subject_id)
      if (!meta) continue

      totalPercentage += percentage(marks, meta.maxMarks)
      if (marks >= meta.passingMarks) {
        passCounter += 1
      }
    }

    return {
      exam_id: exam.id,
      exam_name: exam.name,
      average_percentage: round(totalPercentage / (examGrades.length || 1)),
      pass_percentage: percentage(passCounter, examGrades.length),
    }
  })

  return {
    report_type: 'academic',
    class: {
      id: schoolClass.id,
      name: schoolClass.name,
      section: schoolClass.section,
    },
    term: {
      id: term?.id || effectiveTermId,
      name: term?.name || null,
    },
    exam: {
      id: selectedExam?.id || params.examId || null,
      name: selectedExam?.name || null,
    },
    data: {
      subject_performance: subjectPerformance,
      toppers,
      grade_distribution: gradeDistribution,
      exam_comparison: examComparison,
      summary: {
        overall_average: round(
          examComparison.reduce((sum, exam) => sum + exam.average_percentage, 0) /
            (examComparison.length || 1)
        ),
        overall_pass_percentage: percentage(passedCount, evaluatedCount),
        students_evaluated: new Set(grades.map((grade) => grade.student_id)).size,
      },
    },
  }
}

export async function buildFinancialReport(params: {
  schoolId: string
  dateFrom: string
  dateTo: string
  classId?: string | null
  feeCategoryId?: string | null
}): Promise<FinancialReport> {
  const studentWhere: Prisma.StudentWhereInput = {
    school_id: params.schoolId,
    is_active: true,
    ...(params.classId ? { class_id: params.classId } : {}),
  }

  const structureWhere: Prisma.FeeStructureWhereInput = {
    school_id: params.schoolId,
    ...(params.classId ? { class_id: params.classId } : {}),
    ...(params.feeCategoryId ? { fee_category_id: params.feeCategoryId } : {}),
    due_date: {
      gte: new Date(`${params.dateFrom}T00:00:00.000Z`),
      lte: new Date(`${params.dateTo}T23:59:59.999Z`),
    },
  }

  const [students, structures] = await Promise.all([
    prisma.student.findMany({
      where: studentWhere,
      select: {
        id: true,
        class_id: true,
        class: {
          select: {
            id: true,
            name: true,
            section: true,
          },
        },
      },
    }),
    prisma.feeStructure.findMany({
      where: structureWhere,
      select: {
        id: true,
        class_id: true,
        fee_category_id: true,
        amount: true,
        due_date: true,
        class: {
          select: {
            id: true,
            name: true,
            section: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
  ])

  if (structures.length === 0 || students.length === 0) {
    return {
      report_type: 'financial',
      period: {
        from: params.dateFrom,
        to: params.dateTo,
      },
      filters: {
        class_id: params.classId || null,
        fee_category_id: params.feeCategoryId || null,
      },
      data: {
        total_expected: 0,
        total_collected: 0,
        total_outstanding: 0,
        collection_percentage: 0,
        class_wise_collection: [],
        category_wise_collection: [],
        month_wise_trend: [],
        defaulter_count: 0,
        total_defaulter_outstanding: 0,
      },
    }
  }

  const structureIds = structures.map((structure) => structure.id)
  const studentIds = students.map((student) => student.id)

  const [payments, concessions] = await Promise.all([
    prisma.feePayment.findMany({
      where: {
        school_id: params.schoolId,
        fee_structure_id: {
          in: structureIds,
        },
        student_id: {
          in: studentIds,
        },
        payment_date: {
          gte: new Date(`${params.dateFrom}T00:00:00.000Z`),
          lte: new Date(`${params.dateTo}T23:59:59.999Z`),
        },
      },
      select: {
        student_id: true,
        fee_structure_id: true,
        amount_paid: true,
        payment_date: true,
      },
    }),
    prisma.feeConcession.findMany({
      where: {
        school_id: params.schoolId,
        fee_structure_id: {
          in: structureIds,
        },
        student_id: {
          in: studentIds,
        },
        status: 'APPROVED',
      },
      select: {
        student_id: true,
        fee_structure_id: true,
        concession_type: true,
        concession_value: true,
      },
    }),
  ])

  const studentsByClass = new Map<string, Array<{ id: string }>>()
  for (const student of students) {
    if (!student.class_id) continue
    const bucket = studentsByClass.get(student.class_id) || []
    bucket.push({ id: student.id })
    studentsByClass.set(student.class_id, bucket)
  }

  const paymentMap = new Map<string, number>()
  for (const payment of payments) {
    const key = `${payment.student_id}:${payment.fee_structure_id}`
    paymentMap.set(key, (paymentMap.get(key) || 0) + toNumber(payment.amount_paid))
  }

  const concessionMap = new Map<string, number>()
  for (const concession of concessions) {
    const key = `${concession.student_id}:${concession.fee_structure_id}`
    const rawValue = toNumber(concession.concession_value)
    const structure = structures.find((item) => item.id === concession.fee_structure_id)
    const amount = structure ? toNumber(structure.amount) : 0
    const concessionAmount =
      concession.concession_type === 'PERCENTAGE' ? (amount * rawValue) / 100 : rawValue
    concessionMap.set(key, (concessionMap.get(key) || 0) + concessionAmount)
  }

  const classBreakdownMap = new Map<string, FinancialBreakdownItem>()
  const categoryBreakdownMap = new Map<string, FinancialBreakdownItem>()
  const defaulterOutstandingByStudent = new Map<string, number>()

  let totalExpected = 0
  let totalCollected = 0
  let totalOutstanding = 0

  for (const structure of structures) {
    const matchingStudents = studentsByClass.get(structure.class_id) || []
    const className = formatClassName(structure.class.name, structure.class.section)
    const classItem =
      classBreakdownMap.get(structure.class.id) ||
      {
        id: structure.class.id,
        name: className,
        expected: 0,
        collected: 0,
        outstanding: 0,
        collection_percentage: 0,
      }
    const categoryItem =
      categoryBreakdownMap.get(structure.category.id) ||
      {
        id: structure.category.id,
        name: structure.category.name,
        expected: 0,
        collected: 0,
        outstanding: 0,
        collection_percentage: 0,
      }

    for (const student of matchingStudents) {
      const key = `${student.id}:${structure.id}`
      const expected = toNumber(structure.amount)
      const concession = Math.min(expected, concessionMap.get(key) || 0)
      const collected = paymentMap.get(key) || 0
      const outstanding = Math.max(0, expected - concession - collected)
      const netExpected = Math.max(0, expected - concession)

      totalExpected += netExpected
      totalCollected += collected
      totalOutstanding += outstanding

      classItem.expected += netExpected
      classItem.collected += collected
      classItem.outstanding += outstanding

      categoryItem.expected += netExpected
      categoryItem.collected += collected
      categoryItem.outstanding += outstanding

      if (outstanding > 0) {
        defaulterOutstandingByStudent.set(
          student.id,
          (defaulterOutstandingByStudent.get(student.id) || 0) + outstanding
        )
      }
    }

    classBreakdownMap.set(structure.class.id, classItem)
    categoryBreakdownMap.set(structure.category.id, categoryItem)
  }

  const classWiseCollection = sortBreakdown(
    Array.from(classBreakdownMap.values()).map((item) => ({
      ...item,
      expected: round(item.expected),
      collected: round(item.collected),
      outstanding: round(item.outstanding),
      collection_percentage: percentage(item.collected, item.expected),
    }))
  )

  const categoryWiseCollection = sortBreakdown(
    Array.from(categoryBreakdownMap.values()).map((item) => ({
      ...item,
      expected: round(item.expected),
      collected: round(item.collected),
      outstanding: round(item.outstanding),
      collection_percentage: percentage(item.collected, item.expected),
    }))
  )

  const monthTrendMap = new Map<string, { sortKey: string; total: number }>()
  for (const payment of payments) {
    const sortKey = format(payment.payment_date, 'yyyy-MM')
    const monthLabel = format(payment.payment_date, 'MMM yyyy')
    const existing = monthTrendMap.get(monthLabel) || { sortKey, total: 0 }
    existing.total += toNumber(payment.amount_paid)
    monthTrendMap.set(monthLabel, existing)
  }

  const monthWiseTrend = Array.from(monthTrendMap.entries())
    .sort((left, right) => left[1].sortKey.localeCompare(right[1].sortKey))
    .map(([month, value]) => ({
      month,
      collected: round(value.total),
    }))

  return {
    report_type: 'financial',
    period: {
      from: params.dateFrom,
      to: params.dateTo,
    },
    filters: {
      class_id: params.classId || null,
      fee_category_id: params.feeCategoryId || null,
    },
    data: {
      total_expected: round(totalExpected),
      total_collected: round(totalCollected),
      total_outstanding: round(totalOutstanding),
      collection_percentage: percentage(totalCollected, totalExpected),
      class_wise_collection: classWiseCollection,
      category_wise_collection: categoryWiseCollection,
      month_wise_trend: monthWiseTrend,
      defaulter_count: defaulterOutstandingByStudent.size,
      total_defaulter_outstanding: round(
        Array.from(defaulterOutstandingByStudent.values()).reduce((sum, amount) => sum + amount, 0)
      ),
    },
  }
}
