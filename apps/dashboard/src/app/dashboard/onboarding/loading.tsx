import { Skeleton } from "@/components/ui/skeleton";

export default function OnboardingLoading() {
  return (
    <div className="flex min-h-[85vh] items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-white/5 bg-zinc-900/30 p-6 shadow-xl">
        <div className="space-y-2 text-center">
          <Skeleton className="mx-auto h-7 w-56" />
          <Skeleton className="mx-auto h-4 w-64" />
        </div>
        <div className="space-y-8 py-6">
          <div className="flex flex-col items-center gap-3">
            <Skeleton className="h-28 w-28 rounded-full" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="space-y-2">
            <Skeleton className="mx-auto h-3 w-36" />
            <Skeleton className="h-11 w-full rounded-lg" />
          </div>
        </div>
        <Skeleton className="h-11 w-full rounded-lg" />
      </div>
    </div>
  );
}
