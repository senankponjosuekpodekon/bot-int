import { PageSkeleton, StatsGridSkeleton } from '@/components/skeletons';

export default function Loading() {
  return (
    <PageSkeleton>
      <StatsGridSkeleton count={4} />
    </PageSkeleton>
  );
}
