import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function FeesLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-4 w-full" />
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="space-y-4 pt-4">
        <Skeleton className="h-6 w-32" />
        <Card>
          <div className="p-4 border-b">
            <Skeleton className="h-6 w-full" />
          </div>
          <div className="p-4 space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </Card>
      </div>
    </div>
  )
}
