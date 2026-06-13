import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10 px-4 pt-4 md:px-6">
      <div className="flex flex-col md:flex-row items-center gap-6 p-6 bg-card rounded-xl border shadow-sm">
        <Skeleton className="h-24 w-24 sm:h-32 sm:w-32 rounded-full" />
        <div className="flex flex-col items-center md:items-start gap-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-20 mt-1" />
        </div>
      </div>

      <div className="bg-card rounded-xl border shadow-sm p-6">
        <Skeleton className="h-6 w-48 mb-6" />
        <div className="grid gap-6 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
