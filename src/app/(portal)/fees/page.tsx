import { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getFeesData } from '@/lib/fee-service'
import { FeeSummaryCard } from '@/components/portal/fee-summary-card'
import { FeeBreakdownTable } from '@/components/portal/fee-breakdown-table'
import { PaymentHistoryTable } from '@/components/portal/payment-history-table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export const metadata: Metadata = {
  title: 'Fee Details | Vidhya Bharthi',
  description: 'View fee structures, dues, and payment history',
}

export default async function FeesPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const session = await auth()
  
  if (!session?.user) {
    redirect('/login')
  }

  const { role, schoolId, id: userId } = session.user
  const resolvedSearchParams = await searchParams

  const studentId = resolvedSearchParams.student_id as string || null
  const academicYearId = resolvedSearchParams.academic_year_id as string || null

  let data
  try {
    data = await getFeesData(userId, schoolId as string, role, studentId, academicYearId)
  } catch (err: any) {
    return (
      <div className="p-8 text-center text-red-500">
        <h2 className="text-xl font-bold">Error loading fees</h2>
        <p>{err.message || 'An unexpected error occurred.'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Fee Details</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          View your academic year fee structure, outstanding dues, and payment statements.
        </p>
      </div>

      <FeeSummaryCard summary={data.fee_summary} />

      <Tabs defaultValue="breakdown" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
          <TabsTrigger value="breakdown">Fee Breakdown</TabsTrigger>
          <TabsTrigger value="history">Payment History</TabsTrigger>
        </TabsList>
        <TabsContent value="breakdown" className="pt-4">
          <FeeBreakdownTable feeDetails={data.fee_details} />
        </TabsContent>
        <TabsContent value="history" className="pt-4">
          <PaymentHistoryTable payments={data.all_payments || []} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
