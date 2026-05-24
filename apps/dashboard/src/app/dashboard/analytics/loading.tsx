import { Skeleton } from "@/components/ui/skeleton";

export default function AnalyticsLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-14 rounded-md" />
          ))}
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-xl border p-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>

      {/* Volume chart + Status distribution */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-3 rounded-xl border p-6 xl:col-span-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-52 w-full rounded-lg" />
        </div>
        <div className="space-y-3 rounded-xl border p-6">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-52 w-full rounded-lg" />
        </div>
      </div>

      {/* Currency breakdown + Hourly pattern */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-xl border p-6">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-40 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
