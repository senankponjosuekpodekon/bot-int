import { PageSkeleton, StatsGridSkeleton } from '@/components/skeletons';

export default function Loading() {
  return (
    <PageSkeleton>
      <StatsGridSkeleton />
      <div className="card p-6 animate-pulse">
        <div className="h-5 w-32 bg-gray-200 rounded mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <div className="w-8 h-8 bg-gray-200 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 bg-gray-200 rounded" />
                <div className="h-3 w-64 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageSkeleton>
  );
}
