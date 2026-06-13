'use client'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface Slot {
  period_number: number
  start_time: string
  end_time: string
  subject_name: string
  subject_code: string
  teacher_name: string
}

interface TimetableGridProps {
  schedule: Record<string, Slot[]>
  workingDays: string[]
}

const getSubjectColor = (code: string) => {
    const colors = [
        "bg-blue-100 text-blue-800 border-blue-200",
        "bg-green-100 text-green-800 border-green-200",
        "bg-yellow-100 text-yellow-800 border-yellow-200",
        "bg-purple-100 text-purple-800 border-purple-200",
        "bg-pink-100 text-pink-800 border-pink-200",
        "bg-indigo-100 text-indigo-800 border-indigo-200",
    ]
    let hash = 0
    for (let i = 0; i < code.length; i++) {
        hash = code.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
}

export function TimetableGrid({ schedule, workingDays }: TimetableGridProps) {
  const periodsMap = new Map<number, { start_time: string, end_time: string }>()
  
  Object.values(schedule).flat().forEach((slot: Slot) => {
      if (!periodsMap.has(slot.period_number)) {
          periodsMap.set(slot.period_number, { start_time: slot.start_time, end_time: slot.end_time })
      }
  })

  const periodNumbers = Array.from(periodsMap.keys()).sort((a, b) => a - b)
  
  const todayMap = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  const currentDay = todayMap[new Date().getDay()]

  const now = new Date()
  const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

  return (
    <div className="rounded-md border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Period</TableHead>
            <TableHead className="w-[120px]">Time</TableHead>
            {workingDays.map((day) => (
              <TableHead 
                key={day} 
                className={`text-center font-semibold ${day === currentDay ? 'bg-primary/5 text-primary' : ''}`}
              >
                {day}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {periodNumbers.map(pNum => {
            const time = periodsMap.get(pNum)!
            
            const isCurrentPeriod = currentTimeStr >= time.start_time && currentTimeStr <= time.end_time

            return (
              <TableRow key={pNum} className={isCurrentPeriod ? 'bg-muted/50' : ''}>
                <TableCell className="font-medium text-center">{pNum}</TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {time.start_time} - {time.end_time}
                </TableCell>
                
                {workingDays.map(day => {
                   const slot = schedule[day]?.find(s => s.period_number === pNum)
                   const isToday = day === currentDay
                   
                   return (
                     <TableCell key={`${day}-${pNum}`} className={`p-2 min-w-[140px] text-center border-l border-r ${isToday ? 'bg-primary/5' : ''}`}>
                       {slot ? (
                           <div className={`p-2 rounded border flex flex-col items-center justify-center space-y-1 h-full shadow-sm ${getSubjectColor(slot.subject_code || slot.subject_name)}`}>
                             <span className="font-semibold text-sm">{slot.subject_name}</span>
                             <span className="text-xs opacity-80">{slot.teacher_name}</span>
                           </div>
                       ) : (
                           <div className="flex items-center justify-center h-full text-muted-foreground/50">
                               —
                           </div>
                       )}
                     </TableCell>
                   )
                })}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
