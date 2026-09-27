import { Suspense } from 'react'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { TimetableGrid } from '@/components/portal/timetable-grid'
import { TimetableDayView } from '@/components/portal/timetable-day-view'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'
import Link from 'next/link'

// It's a server component, so we define the async page props
export default async function TimetablePage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const searchParams = await props.searchParams
  const session = await auth()
  
  if (!session?.user) {
    redirect('/login')
  }

  const { role, schoolId } = session.user
  let termId = typeof searchParams.term_id === 'string' ? searchParams.term_id : undefined

  // Fetch all terms for the school
  const terms = await prisma.term.findMany({
    where: { school_id: schoolId as string },
    orderBy: { start_date: 'desc' }
  })

  // We could fetch from our API or directly, calling our own API using full absolute URL is tricky in RSC.
  // Instead, let's just make a server action or use fetch if we have absolute URL.
  // We'll mimic the route's logic or use headers to call API. But it's easier to use a client component if we want dynamic fetch.
  // To stick strictly to the server-side with searchParams as instructed, we will fetch data via headers/URL.
  
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const host = process.env.VERCEL_URL || 'localhost:3000'
  const baseUrl = `${protocol}://${host}`
  
  const queryUrl = new URL(`${baseUrl}/api/timetable`)
  if (termId) queryUrl.searchParams.set('term_id', termId)
  
  // Forward the cookie for auth
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  const cookieHeader = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; ')

  const res = await fetch(queryUrl.toString(), {
    headers: { 'Cookie': cookieHeader },
    cache: 'no-store'
  })

  let data = null
  let errorMessage = null

  if (!res.ok) {
     const errData = await res.json().catch(() => null)
     errorMessage = errData?.message || errData?.error || 'Failed to load timetable'
  } else {
     data = await res.json()
  }

  // Handle between terms or no term edge cases
  if (errorMessage && !data) {
      return (
          <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
             <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Class Timetable</h2>
             </div>
             <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
                <div className="text-muted-foreground text-lg mb-4">{errorMessage}</div>
                <Link href="/dashboard">
                    <Button variant="outline">Return to Dashboard</Button>
                </Link>
             </Card>
          </div>
      )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0 print:hidden">
        <div>
           <h2 className="text-3xl font-bold tracking-tight mb-1">Class Timetable</h2>
           <p className="text-muted-foreground">
             {data?.class_name} • {data?.term_name}
           </p>
        </div>
        
        <div className="flex items-center space-x-2">
           <form method="GET" action="/timetable" className="flex items-center space-x-2">
              <Select name="term_id" defaultValue={data?.term_name ? terms.find(t => t.name === data.term_name)?.id : undefined}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select Term" />
                </SelectTrigger>
                <SelectContent>
                  {terms.map(term => (
                    <SelectItem key={term.id} value={term.id}>
                      {term.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="submit" variant="secondary">View</Button>
           </form>
        </div>
      </div>

      <div className="hidden md:block print:block">
        <TimetableGrid schedule={data?.schedule || {}} workingDays={data?.working_days || []} />
      </div>

      <div className="block md:hidden print:hidden">
        <TimetableDayView schedule={data?.schedule || {}} workingDays={data?.working_days || []} />
      </div>

    </div>
  )
}
