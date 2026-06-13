import { Skeleton } from "@/components/ui/skeleton"

export default function TimetableLoading() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0">
        <div>
           <Skeleton className="h-9 w-64 mb-2" />
           <Skeleton className="h-5 w-48" />
        </div>
        
        <div className="flex items-center space-x-2">
           <Skeleton className="h-10 w-[180px]" />
           <Skeleton className="h-10 w-20" />
        </div>
      </div>

      <div className="hidden md:block">
        <div className="rounded-md border bg-card">
           <div className="border-b bg-muted/20 flex h-12">
               <Skeleton className="flex-1 border-r" />
               <Skeleton className="flex-[8] w-full" />
           </div>
           
           {[1, 2, 3, 4, 5, 6].map((i) => (
             <div key={i} className="border-b flex h-24">
                 <div className="w-[100px] border-r p-4 flex items-center justify-center">
                    <Skeleton className="h-8 w-8" />
                 </div>
                 <div className="w-[120px] border-r p-4 flex flex-col justify-center space-y-2">
                    <Skeleton className="h-4 w-16" />
                 </div>
                 {[1, 2, 3, 4, 5, 6].map(j => (
                    <div key={`${i}-${j}`} className="flex-1 p-2 border-r last:border-r-0">
                        <Skeleton className="w-full h-full rounded" />
                    </div>
                 ))}
             </div>
           ))}
        </div>
      </div>

      <div className="block md:hidden">
        <Skeleton className="h-10 w-full mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
             <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
