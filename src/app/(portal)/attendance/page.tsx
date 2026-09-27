import { Metadata } from 'next'
import { AttendanceView } from './attendance-view'

export const metadata: Metadata = {
  title: 'My Attendance | Vidhya Bharthi',
  description: 'View your attendance records',
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ student_id?: string }>
}) {
  const resolvedParams = await searchParams
  const studentId = resolvedParams.student_id

  return (
    <div className="space-y-6 max-w-5xl mx-auto @container print:m-0 print:p-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center print:hidden border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance</h1>
          <p className="text-muted-foreground">View your daily and monthly attendance records.</p>
        </div>
      </div>
      
      {/* Client component stringing everything together */}
      <AttendanceView studentId={studentId} />
      
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            body { background: white; }
            .print\\:hidden { display: none !important; }
            nav, header, aside { display: none !important; }
            main { padding: 0 !important; }
            .bg-muted\\/20 { background-color: transparent !important; }
          }
        `
      }} />
    </div>
  )
}
