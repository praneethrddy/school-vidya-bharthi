import { Skeleton } from '@/components/ui/skeleton'

export default function GradesLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight">My Grades</h1>
        <Skeleton className="h-10 w-48" />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Skeleton className="h-[350px] md:col-span-1 rounded-xl" />
        <Skeleton className="h-[350px] md:col-span-2 rounded-xl" />
      </div>

      <Skeleton className="h-[400px] rounded-xl" />
    </div>
  )
}
