import { Skeleton } from "@/components/ui/skeleton";

export default function WhiteLabelLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-80" />
      </div>

      {/* Enable White Label Card */}
      <div className="space-y-4 rounded-xl border border-white/5 bg-zinc-900/30 p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-6 w-11 rounded-full" />
        </div>
      </div>

      {/* Custom CSS Card */}
      <div className="space-y-4 rounded-xl border border-white/5 bg-zinc-900/30 p-6">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-3 w-72" />
        </div>
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>

      {/* Custom Domain Card */}
      <div className="space-y-4 rounded-xl border border-white/5 bg-zinc-900/30 p-6">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-64" />
        </div>
        <Skeleton className="h-10 w-40 rounded-lg" />
      </div>

      {/* Checkout Layout Card */}
      <div className="space-y-4 rounded-xl border border-white/5 bg-zinc-900/30 p-6">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-3 w-64" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="space-y-1 rounded-lg border border-white/5 p-4"
            >
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-2 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
