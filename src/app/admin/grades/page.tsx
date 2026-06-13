import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { GradesClient } from "./grades-client"
import { hasPermission } from "@/lib/permissions"

export const metadata = {
  title: "Grades Management | Admin Portal",
}

export default async function GradesPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const u = session.user as any
  const schoolId = u.schoolId

  const canViewAll = await hasPermission(schoolId, u.role, "GRADES.view_all")
  const canViewOwn = await hasPermission(schoolId, u.role, "GRADES.view_own_subject")

  if (!canViewAll && !canViewOwn) {
    redirect("/dashboard")
  }

  // Get current academic year
  const acYear = await prisma.academicYear.findFirst({
    where: { school_id: schoolId, is_current: true }
  })
  
  if (!acYear) {
    return <div className="p-8 text-center text-muted-foreground">Please configure an active Academic Year first.</div>
  }

  // Pre-fetch reference data
  const [classes, terms, dbSubjects] = await Promise.all([
    prisma.class.findMany({ 
      where: { school_id: schoolId, academic_year_id: acYear.id },
      select: { id: true, name: true, section: true },
      orderBy: { name: 'asc' }
    }),
    prisma.term.findMany({ 
      where: { school_id: schoolId, academic_year_id: acYear.id },
      select: { id: true, name: true },
      orderBy: { start_date: 'asc' }
    }),
    prisma.subject.findMany({
      where: { school_id: schoolId },
      select: { id: true, name: true, class_id: true }
    })
  ])

  const mappedClasses = classes.map(c => ({ id: c.id, name: `${c.name} ${c.section || ''}`.trim() }))

  const permissions = {
    canEdit: await hasPermission(schoolId, u.role, "GRADES.edit") || u.role === "PRINCIPAL" || u.role === "SUPER_ADMIN",
    canEnter: await hasPermission(schoolId, u.role, "GRADES.enter") || u.role === "PRINCIPAL" || u.role === "SUPER_ADMIN",
    canGenerateParams: await hasPermission(schoolId, u.role, "GRADES.generate_report_card") || u.role === "PRINCIPAL" || u.role === "SUPER_ADMIN"
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Grades & Exams</h1>
        <p className="text-muted-foreground mt-2">
          Manage exam schedules, enter student marks, and generate report cards.
        </p>
      </div>

      <GradesClient 
        classes={mappedClasses}
        terms={terms}
        subjects={dbSubjects}
        academicYearId={acYear.id}
        permissions={permissions}
      />
    </div>
  )
}
