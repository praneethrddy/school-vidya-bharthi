'use client'

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TimetablePeriodCard } from "./timetable-period-card"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"

interface Slot {
  period_number: number
  start_time: string
  end_time: string
  subject_name: string
  subject_code: string
  teacher_name: string
}

interface TimetableDayViewProps {
  schedule: Record<string, Slot[]>
  workingDays: string[]
}

export function TimetableDayView({ schedule, workingDays }: TimetableDayViewProps) {
  const todayMap = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  const today = todayMap[new Date().getDay()]
  
  // Default to today if today is a working day, otherwise first working day
  const defaultTab = workingDays.includes(today) ? today : workingDays[0]
  
  const [activeTab, setActiveTab] = useState(defaultTab)

  return (
    <div className="flex flex-col space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <ScrollArea className="w-full rounded-md border bg-muted/50 p-1">
            <TabsList className="flex w-fit bg-transparent">
            {workingDays.map(day => (
                <TabsTrigger 
                key={day} 
                value={day}
                className="flex-shrink-0 min-w-[80px]"
                >
                {day}
                </TabsTrigger>
            ))}
            </TabsList>
            <ScrollBar orientation="horizontal" className="hidden" />
        </ScrollArea>

        {workingDays.map(day => (
            <TabsContent key={day} value={day} className="mt-4 space-y-3">
               {schedule[day]?.length > 0 ? (
                   schedule[day]
                     .sort((a,b) => a.period_number - b.period_number)
                     .map(slot => (
                       <TimetablePeriodCard key={slot.period_number} slot={slot} />
                   ))
               ) : (
                   <div className="p-8 text-center text-muted-foreground border rounded-lg bg-card border-dashed">
                       No classes scheduled for {day}
                   </div>
               )}
            </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
