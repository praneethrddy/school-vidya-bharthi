import { Card, CardContent } from "@/components/ui/card"
import { Clock, BookOpen, User } from "lucide-react"

interface Slot {
  period_number: number
  start_time: string
  end_time: string
  subject_name: string
  subject_code: string
  teacher_name: string
}

const getSubjectColor = (code: string) => {
    const colors = [
        "bg-blue-500",
        "bg-green-500",
        "bg-yellow-500",
        "bg-purple-500",
        "bg-pink-500",
        "bg-indigo-500",
    ]
    let hash = 0
    for (let i = 0; i < code.length; i++) {
        hash = code.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
}

export function TimetablePeriodCard({ slot }: { slot: Slot }) {
   const now = new Date()
   const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
   const isCurrentPeriod = currentTimeStr >= slot.start_time && currentTimeStr <= slot.end_time

   const colorAccent = getSubjectColor(slot.subject_code || slot.subject_name)

   return (
       <Card className={`relative overflow-hidden transition-all ${isCurrentPeriod ? 'shadow-md border-primary/50' : 'shadow-sm'}`}>
           <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${colorAccent}`} />
           <CardContent className="p-4 pl-5">
               <div className="flex justify-between items-start">
                   <div className="flex items-center space-x-2 text-sm font-medium text-muted-foreground mb-1.5">
                       <Clock className="w-4 h-4" />
                       <span>{slot.start_time} - {slot.end_time}</span>
                   </div>
                   
                   {isCurrentPeriod && (
                       <span className="flex h-2 w-2 relative mt-1">
                           <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                           <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                       </span>
                   )}
               </div>

               <div className="flex items-center space-x-2 mt-1 mb-2">
                   <h4 className="text-lg font-bold truncate">{slot.subject_name}</h4>
                   <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border">
                       Period {slot.period_number}
                   </span>
               </div>
               
               <div className="flex items-center text-sm text-muted-foreground mt-2">
                   <User className="w-4 h-4 mr-2 opacity-70" />
                   {slot.teacher_name}
               </div>
           </CardContent>
       </Card>
   )
}
