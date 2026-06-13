import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { errorResponse, successResponse, unauthorizedResponse, forbiddenResponse } from '@/lib/api-helpers'
import { createAuditLog } from '@/lib/audit'

const generateSchema = z.object({
  student_id: z.string().uuid().optional(),
  class_id: z.string().uuid().optional(),
  term_id: z.string().uuid(),
  academic_year_id: z.string().uuid().optional(),
}).refine(data => data.student_id || data.class_id, {
  message: "Either student_id or class_id must be provided"
})

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return unauthorizedResponse('Not logged in')

  const u = session.user as any
  const schoolId = u.schoolId
  if (!schoolId) return errorResponse('SCHOOL_REQUIRED', 'No school context')

  // Auth: GRADES.generate_report_card
  const canGenerate = await hasPermission(schoolId, u.role, 'GRADES.generate_report_card')
  const isPrincipal = u.role === 'PRINCIPAL' || u.role === 'SUPER_ADMIN'
  if (!canGenerate && !isPrincipal) return forbiddenResponse('Missing permission to generate report cards')

  try {
    const bodyText = await request.text()
    const parsed = generateSchema.safeParse(JSON.parse(bodyText))
    if (!parsed.success) return errorResponse('VALIDATION_ERROR', 'Invalid data', 400)

    const { student_id, class_id, term_id, academic_year_id } = parsed.data

    if (student_id) {
       // Check if student exists and has grades
       const grades = await prisma.grade.count({ 
         where: { school_id: schoolId, student_id, exam: { term_id } } 
       })
       if (grades === 0) return errorResponse('NO_DATA', 'No grades found for this student in this term')

       // Mock R2 upload - return download URL
       const url = `/api/admin/report-cards?download=true&student_id=${student_id}&term_id=${term_id}`

       await createAuditLog({
         school_id: schoolId,
         user_id: u.id || '',
         action: 'CREATE',
         entity_type: 'report_card',
         entity_id: student_id,
         new_value: { student_id, term_id },
       })

       return successResponse({ 
         success: true, 
         message: 'Report card generated successfully', 
         data: { url } 
       })
    } else if (class_id) {
       // Bulk mode
       const students = await prisma.student.findMany({
         where: { school_id: schoolId, class_id, is_active: true }
       })
       
       const urls = students.map(s => ({
         student_id: s.id,
         url: `/api/admin/report-cards?download=true&student_id=${s.id}&term_id=${term_id}`
       }))

       await createAuditLog({
         school_id: schoolId,
         user_id: u.id || '',
         action: 'CREATE',
         entity_type: 'report_card',
         entity_id: class_id,
         new_value: { class_id, term_id, student_count: students.length },
       })
       
       return successResponse({ 
         success: true, 
         message: `Generated ${urls.length} report cards successfully`, 
         data: { urls } 
       })
    }
    
    return errorResponse('INVALID_REQUEST', 'Invalid request')

  } catch (error: any) {
    return errorResponse('INTERNAL_ERROR', error?.message || 'Failed to generate report cards', 500)
  }
}
