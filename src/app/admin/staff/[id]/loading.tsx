import { Skeleton } from '@/components/ui/skeleton'

export default function AdminStaffDetailLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

