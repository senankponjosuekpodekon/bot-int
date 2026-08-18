import { PageSkeleton, StatsGridSkeleton, TableSkeleton } from '@/components/skeletons';

export default function Loading() {
  return (
    <PageSkeleton>
      <StatsGridSkeleton count={4} />
      <TableSkeleton rows={6} />
    </PageSkeleton>
  );
}
