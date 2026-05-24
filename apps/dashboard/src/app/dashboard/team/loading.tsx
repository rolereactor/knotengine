import { Skeleton } from "@/components/ui/skeleton";

export default function TeamLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="hidden h-4 w-20 sm:block" />
          <Skeleton className="h-9 w-36" />
        </div>
      </div>

      <div className="rounded-xl border">
        <div className="p-6 pb-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="mt-1.5 h-4 w-64" />
        </div>
        <div className="space-y-3 px-6 pb-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <Skeleton className="size-8 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-48" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="hidden h-3.5 w-24 sm:block" />
              <Skeleton className="size-8" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
