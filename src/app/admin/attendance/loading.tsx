import { Skeleton } from "@/components/ui/skeleton"

export default function AttendanceLoading() {
  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto flex-1 h-[calc(100vh-4rem)] overflow-y-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
      </div>

      <Skeleton className="h-10 w-[300px]" /> {/* Tabs */}

      <div className="flex flex-col sm:flex-row gap-4 mt-6">
        <Skeleton className="h-10 w-[240px]" /> {/* Date picker */}
        <Skeleton className="h-10 w-[200px]" /> {/* Class selector */}
      </div>

      <div className="mt-8 border rounded-md p-4 space-y-4">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-6 w-32 rounded-full" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>

        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex justify-between items-center py-2">
            <div className="flex gap-4 items-center">
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-40" />
            </div>
            <Skeleton className="h-8 w-40" />
          </div>
        ))}
      </div>
    </div>
  )
}
