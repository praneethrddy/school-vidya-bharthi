import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Clock, User, ChevronRight } from "lucide-react"
import Link from "next/link"
import { cookies } from "next/headers"

interface Props {
    studentId?: string
}

export async function TodaySchedule({ studentId }: Props) {
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const host = process.env.VERCEL_URL || 'localhost:3000'
    const baseUrl = `${protocol}://${host}`
    
    const queryUrl = new URL(`${baseUrl}/api/timetable`)
    if (studentId) queryUrl.searchParams.set('student_id', studentId)

    const cookieStore = await cookies()
    const cookieHeader = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; ')

    let timetableData: any = null
    let errorMsg = null

    try {
        const res = await fetch(queryUrl.toString(), {
            headers: { 'Cookie': cookieHeader },
            cache: 'no-store'
        })
        if (!res.ok) {
           errorMsg = 'No schedule available today.'
        } else {
           timetableData = await res.json()
        }
    } catch(e) {
        errorMsg = 'Failed to load schedule.'
    }

    const todayMap = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
    const currentDay = todayMap[new Date().getDay()]

    let todaysSlots = []
    if (timetableData && timetableData.schedule && timetableData.schedule[currentDay]) {
        todaysSlots = timetableData.schedule[currentDay].sort((a: any, b: any) => a.period_number - b.period_number)
    }

    const now = new Date()
    const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

    return (
        <Card className="h-full shadow-sm flex flex-col">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Today's Schedule</CardTitle>
              <Link href="/timetable" className="text-sm font-medium text-primary hover:underline flex items-center">
                  Full View <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col">
              {errorMsg || todaysSlots.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm p-6 min-h-[250px]">
                      {errorMsg || "No classes scheduled for today."}
                  </div>
              ) : (
                  <div className="divide-y overflow-y-auto max-h-[400px]">
                      {todaysSlots.map((slot: any) => {
                          const isCurrentPeriod = currentTimeStr >= slot.start_time && currentTimeStr <= slot.end_time
                          return (
                              <div key={slot.period_number} className={`p-4 flex items-center justify-between transition-colors hover:bg-muted/50 ${isCurrentPeriod ? 'bg-primary/5' : ''}`}>
                                  <div className="flex flex-col space-y-1">
                                      <div className="font-semibold flex items-center space-x-2">
                                          <span>{slot.subject_name}</span>
                                          {isCurrentPeriod && (
                                              <span className="flex h-2 w-2 relative">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                                              </span>
                                          )}
                                      </div>
                                      <div className="text-sm text-muted-foreground flex items-center">
                                          <User className="h-3 w-3 mr-1 opacity-70" />
                                          {slot.teacher_name}
                                      </div>
                                  </div>
                                  <div className="flex flex-col items-end space-y-1 text-sm text-muted-foreground">
                                      <div className="flex items-center">
                                          <Clock className="h-3 w-3 mr-1" />
                                          {slot.start_time}-{slot.end_time}
                                      </div>
                                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted border">
                                          Period {slot.period_number}
                                      </span>
                                  </div>
                              </div>
                          )
                      })}
                  </div>
              )}
            </CardContent>
        </Card>
    )
}
