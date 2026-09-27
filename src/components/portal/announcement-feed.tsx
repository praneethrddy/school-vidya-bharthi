import React from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Megaphone, BellRing, Calendar, AlertCircle } from 'lucide-react'
import { AnnouncementType } from '@prisma/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { EmptyState } from '@/components/shared/empty-state'
import { Skeleton } from '@/components/ui/skeleton'

interface Announcement {
  id: string
  title: string
  type: AnnouncementType
  published_at: Date | string | null
}

interface AnnouncementFeedProps {
  announcements: Announcement[]
  isLoading?: boolean
}

export function AnnouncementFeed({ announcements, isLoading }: AnnouncementFeedProps) {
  
  if (isLoading) {
    return (
      <Card className="col-span-full xl:col-span-2">
        <CardHeader>
          <CardTitle>Recent Announcements</CardTitle>
          <CardDescription>Stay updated with school notices</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-4 items-start">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="col-span-full h-full flex flex-col shadow-sm">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <BellRing className="h-5 w-5 text-primary" />
              Recent Announcements
            </CardTitle>
            <CardDescription>Latest notices and updates from the school</CardDescription>
          </div>
          <a href="/notifications" className="text-sm text-primary hover:underline font-medium">
            View All
          </a>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1">
        {announcements.length === 0 ? (
          <EmptyState 
            icon={Megaphone} 
            title="No announcements yet" 
            description="You will see school notices and important updates here."
          />
        ) : (
          <div className="divide-y">
            {announcements.map((announcement) => {
              
              let TypeIcon = Megaphone
              let badgeColor = 'bg-blue-100 text-blue-700 hover:bg-blue-100/80'

              switch (announcement.type) {
                case 'URGENT':
                  TypeIcon = AlertCircle
                  badgeColor = 'bg-red-100 text-red-700 hover:bg-red-100/80'
                  break
                case 'EVENT':
                  TypeIcon = Calendar
                  badgeColor = 'bg-amber-100 text-amber-700 hover:bg-amber-100/80'
                  break
                case 'EXAM':
                  TypeIcon = Calendar
                  badgeColor = 'bg-purple-100 text-purple-700 hover:bg-purple-100/80'
                  break
                case 'FEE':
                  TypeIcon = AlertCircle
                  badgeColor = 'bg-green-100 text-green-700 hover:bg-green-100/80'
                  break
                default: 
                  break
              }

              return (
                <div key={announcement.id} className="p-4 flex gap-4 hover:bg-muted/50 transition-colors cursor-pointer group">
                  <div className={`p-2 rounded-full h-fit flex-shrink-0 ${badgeColor.split(' ')[0]} ${badgeColor.split(' ')[1]}`}>
                    <TypeIcon className="h-4 w-4" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium text-sm leading-tight group-hover:text-primary transition-colors">
                        {announcement.title}
                      </h4>
                      <Badge variant="outline" className={`text-[10px] uppercase border-none ${badgeColor}`}>
                        {announcement.type}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center">
                      {announcement.published_at 
                        ? formatDistanceToNow(new Date(announcement.published_at), { addSuffix: true })
                        : 'Unknown Date'}
                    </div>
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
