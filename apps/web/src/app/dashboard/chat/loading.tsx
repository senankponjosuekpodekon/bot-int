import { PageSkeleton } from '@/components/skeletons';

export default function Loading() {
  return (
    <PageSkeleton>
      <div className="card p-6 animate-pulse space-y-4">
        <div className="h-5 w-32 bg-gray-200 rounded" />
        <div className="h-32 bg-gray-100 rounded" />
        <div className="h-10 w-32 bg-gray-200 rounded" />
      </div>
    </PageSkeleton>
  );
}
