import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { errorResponse, successResponse, unauthorizedResponse, forbiddenResponse } from '@/lib/api-helpers'
import { computeClassRank, computePercentage, isPass, GradingScheme } from '@/lib/grading'
import { renderToStream } from '@react-pdf/renderer'
import { ReportCardDocument } from '@/components/admin/report-card-template'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return unauthorizedResponse('Not logged in')

  const u = session.user as any
  const schoolId = u.schoolId
  if (!schoolId) return errorResponse('SCHOOL_REQUIRED', 'No school context')

  // Auth check for both generation and viewing
  const canGenerate = await hasPermission(schoolId, u.role, 'GRADES.generate_report_card')
  const canViewOthers = await hasPermission(schoolId, u.role, 'GRADES.view_all')
  const isPrincipal = u.role === 'PRINCIPAL' || u.role === 'SUPER_ADMIN'

  if (!canGenerate && !canViewOthers && !isPrincipal) {
     return forbiddenResponse('Missing permissions')
  }

  const { searchParams } = new URL(request.url)
  const download = searchParams.get('download') === 'true'
  const studentId = searchParams.get('student_id')
  const termId = searchParams.get('term_id')
  const classId = searchParams.get('class_id')

  if (download && studentId && termId) {
    // Generate PDF Buffer
    try {
      const student = await prisma.student.findUnique({
        where: { id: studentId, school_id: schoolId },
        include: { class: true }
      })
      if (!student || !student.class) return new NextResponse('Student not found', { status: 404 })

      const term = await prisma.term.findUnique({ where: { id: termId } })
      const school = await prisma.school.findUnique({ where: { id: schoolId } })
      
      const grades = await prisma.grade.findMany({
        where: { school_id: schoolId, student_id: studentId, exam: { term_id: termId as string } },
        include: {
          exam: { include: { exam_subjects: true } },
          subject: true
        }
      })

      if (grades.length === 0) return new NextResponse('No grades found for this term', { status: 404 })

      // For ranking, gather all students' grades in this class for this term
      const classGrades = await prisma.grade.findMany({
        where: { school_id: schoolId, exam: { term_id: termId as string, class_id: student.class_id as string } },
        include: { exam: { include: { exam_subjects: true } } }
      })

      // Aggregate total marks per student to compute rank
      const studentTotals = new Map<string, number>()
      for (const g of classGrades) {
        if (g.marks_obtained !== null) {
          studentTotals.set(g.student_id, (studentTotals.get(g.student_id) || 0) + g.marks_obtained.toNumber())
        }
      }
      
      const rankMap = computeClassRank(Array.from(studentTotals.entries()).map(([id, marks]) => ({ studentId: id, totalMarks: marks })))
      const studentRank = rankMap.get(studentId) || 0

      // Map to template format
      let totalMarks = 0
      let totalMaxMarks = 0

      const mappedGrades = grades.map(g => {
        const examSubject = g.exam.exam_subjects.find(es => es.subject_id === g.subject_id)
        const maxMarks = examSubject?.max_marks || 100
        const obtained = g.marks_obtained ? g.marks_obtained.toNumber() : 0
        totalMarks += obtained
        totalMaxMarks += maxMarks

        return {
          subject: g.subject.name,
          maxMarks,
          obtained,
          grade: g.grade || '-',
          remarks: g.remarks || ''
        }
      })

      const percentage = computePercentage(totalMarks, totalMaxMarks).toFixed(1)

      const doc = ReportCardDocument({
        schoolName: school?.name || 'School Name',
        termName: term?.name || 'Term',
        student: {
          name: `${student.first_name} ${student.last_name}`,
          rollNumber: student.roll_number || '-',
          className: student.class.name + (student.class.section ? ` ${student.class.section}` : '')
        },
        grades: mappedGrades,
        summary: {
           totalMarks,
           totalMax: totalMaxMarks,
           percentage,
           attendance: '-', // Real implementation would fetch from Attendance
           rank: studentRank
        }
      })

      const stream = await renderToStream(doc)
      const chunks: Buffer[] = []
      
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk))
      }
      
      const pdfBuffer = Buffer.concat(chunks)

      return new NextResponse(pdfBuffer, {
         status: 200,
         headers: {
           'Content-Type': 'application/pdf',
           'Content-Disposition': `attachment; filename="report_card_${student.first_name}_${term?.name}.pdf"`
         }
      })
    } catch (e: any) {
      return new NextResponse(`Error generating PDF: ${e.message}`, { status: 500 })
    }
  }

  // --- LISTING MODE ---
  if (!classId || !termId) {
    return errorResponse('INVALID_PARAMS', 'class_id and term_id are required to list report cards')
  }

  // Find all students in class
  const students = await prisma.student.findMany({
    where: { school_id: schoolId, class_id: classId, is_active: true },
    select: { id: true, first_name: true, last_name: true, roll_number: true }
  })

  // Check who actually has grades in this term to consider them "generated" or "available"
  const classGrades = await prisma.grade.findMany({
     where: { school_id: schoolId, exam: { term_id: termId as string, class_id: classId as string } },
     select: { student_id: true },
     distinct: ['student_id']
  })

  const gradedStudentIds = new Set(classGrades.map(g => g.student_id))

  const reports = students.map(s => ({
    student_id: s.id,
    student_name: `${s.first_name} ${s.last_name}`,
    roll_number: s.roll_number || '',
    has_grades: gradedStudentIds.has(s.id),
    download_url: gradedStudentIds.has(s.id) ? `/api/admin/report-cards?download=true&student_id=${s.id}&term_id=${termId}` : null
  }))

  return successResponse(reports)
}
