import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function NotificationsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-8 w-24 rounded-full" />
        ))}
      </div>

      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="flex items-start gap-3 p-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
