import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>

      <div className="flex border-b">
        <Skeleton className="h-10 w-24 mr-2" />
        <Skeleton className="h-10 w-24 mr-2" />
        <Skeleton className="h-10 w-24" />
      </div>

      <div className="bg-white rounded-lg p-6 shadow-sm border mt-6">
        <div className="flex justify-between mb-6">
          <div className="flex gap-4">
            <Skeleton className="h-10 w-[200px]" />
            <Skeleton className="h-10 w-[150px]" />
          </div>
          <Skeleton className="h-10 w-[150px]" />
        </div>

        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  )
}
