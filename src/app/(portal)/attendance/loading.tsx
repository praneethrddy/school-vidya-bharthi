export default function AttendanceLoading() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="border-b pb-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded mb-2"></div>
        <div className="h-4 w-72 bg-muted animate-pulse rounded"></div>
      </div>
      
      <div className="w-48 h-10 bg-muted animate-pulse rounded mb-4"></div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded border"></div>
        ))}
      </div>

      <div className="h-24 bg-muted animate-pulse rounded border w-full"></div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-[500px] bg-muted animate-pulse rounded border"></div>
        <div className="lg:col-span-1 h-[350px] bg-muted animate-pulse rounded border"></div>
      </div>
    </div>
  )
}
