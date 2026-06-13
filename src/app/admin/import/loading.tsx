import { Skeleton } from '@/components/ui/skeleton'

export default function ImportLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-96" />
      </div>

      <div className="grid gap-2 md:grid-cols-7">
        {Array.from({ length: 7 }).map((_, index) => (
          <Skeleton key={index} className="h-14 w-full" />
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-40 w-full" />
        ))}
      </div>

      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-72 w-full" />
    </div>
  )
}
