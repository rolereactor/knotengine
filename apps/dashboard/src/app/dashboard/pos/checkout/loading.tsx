import { Skeleton } from "@/components/ui/skeleton";

export default function PosCheckoutLoading() {
  return (
    <div className="flex h-[calc(100vh-var(--header-height)-2rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-5 w-24" />
        </div>
        <Skeleton className="h-11 w-28 rounded-lg" />
      </div>

      {/* Search and Filter */}
      <div className="mb-4 flex gap-3">
        <Skeleton className="h-11 flex-1 rounded-lg" />
        <Skeleton className="h-11 w-48 rounded-lg" />
      </div>

      {/* Product Grid */}
      <div className="min-h-0 flex-1">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="space-y-3 rounded-xl border border-white/5 bg-zinc-900/30 p-4"
            >
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
