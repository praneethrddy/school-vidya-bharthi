import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

interface WelcomeCardProps {
  studentName: string
  className: string
  academicYear: string
  rollNumber?: string | null
  avatarUrl?: string | null
}

export function WelcomeCard({ studentName, className, academicYear, rollNumber, avatarUrl }: WelcomeCardProps) {
  const initials = studentName.substring(0, 2).toUpperCase()

  return (
    <Card className="overflow-hidden border-none shadow-sm bg-gradient-to-br from-primary/10 via-background to-background">
      <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
        <Avatar className="h-24 w-24 border-4 border-background shadow-sm">
          <AvatarImage src={avatarUrl || ''} alt={studentName} />
          <AvatarFallback className="text-3xl font-semibold bg-primary/20 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 text-center md:text-left space-y-2">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            Welcome back, {studentName}!
          </h2>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-muted-foreground">
            <span className="font-medium text-foreground">{className}</span>
            <span>•</span>
            <span>Academic Year {academicYear}</span>
            {rollNumber && (
              <>
                <span>•</span>
                <span>Roll No: {rollNumber}</span>
              </>
            )}
          </div>
        </div>
        
        <div className="hidden lg:block">
           <Badge variant="outline" className="px-4 py-1.5 text-sm font-medium bg-background">
              Student Portal
           </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
