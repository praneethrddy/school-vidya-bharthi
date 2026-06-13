import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getDashboardData } from '@/lib/dashboard-service'
import { WelcomeCard } from '@/components/portal/welcome-card'
import { SummaryCard } from '@/components/portal/summary-card'
import { AnnouncementFeed } from '@/components/portal/announcement-feed'
import { TodaySchedule } from '@/components/portal/today-schedule'
import { ClipboardCheck, GraduationCap, IndianRupee, BookOpen } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ student_id?: string }>
}) {
  const session = await auth()

  if (!session?.user?.schoolId) {
    redirect('/login')
  }

  // Next.js 15: searchParams is a Promise
  const resolvedParams = await searchParams
  const studentId = resolvedParams.student_id

  let dashboardData
  try {
    dashboardData = await getDashboardData(
      session.user.id,
      session.user.schoolId,
      session.user.role,
      studentId
    )
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    // Could redirect or throw to error boundary
    throw new Error('Failed to load dashboard data. Please try again.')
  }

  const { student, attendance_summary, fee_summary, grade_summary, homework_summary, announcements } = dashboardData

  return (
    <div className="space-y-6">
      {/* 1. Welcome Card */}
      <WelcomeCard
        studentName={student.name}
        className={student.class}
        academicYear={student.academic_year}
        rollNumber={student.roll_number}
        avatarUrl={student.photo_url}
      />

      {/* 2. Summary Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Attendance"
          value={attendance_summary ? `${attendance_summary.percentage}%` : '—'}
          subtitle="This month"
          icon={ClipboardCheck}
          colorCode="green" // Mock positive logic until feature 05
          href="/attendance"
        />
        <SummaryCard
          title="Fee Dues"
          value={fee_summary && fee_summary.total_balance > 0 ? `₹${fee_summary.total_balance.toLocaleString('en-IN')}` : '₹0'}
          subtitle="Outstanding balance"
          icon={IndianRupee}
          colorCode={fee_summary?.total_balance > 0 ? 'red' : 'green'} // Red if dues
          href="/fees"
        />
        <SummaryCard
          title="Last Exam"
          value={grade_summary ? grade_summary.percentage : '—'}
          subtitle={grade_summary?.last_exam || "No recent exams"}
          icon={GraduationCap}
          colorCode="default"
          href="/grades"
        />
        <SummaryCard
          title="Pending Homework"
          value={homework_summary ? homework_summary.pending_count : '—'}
          subtitle="Due this week"
          icon={BookOpen}
          colorCode="default"
          href="/homework"
        />
      </div>

      {/* 3. Bottom Grid: Announcements & Timetable (Placeholder) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 flex flex-col h-full space-y-6">
          <AnnouncementFeed announcements={announcements} />
          
          {/* Upcoming Homework Placeholder */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg">Upcoming Homework</CardTitle>
            </CardHeader>
            <CardContent className="p-6 text-center text-muted-foreground text-sm">
              Homework assignments will appear here
            </CardContent>
          </Card>
        </div>

        <div className="xl:col-span-1 h-full">
          <TodaySchedule studentId={studentId} />
        </div>
      </div>
    </div>
  )
}
