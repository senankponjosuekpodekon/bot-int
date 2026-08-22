export function CardSkeleton() {
  return (
    <div className="card p-4 lg:p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 w-24 bg-gray-200 rounded" />
        <div className="w-9 h-9 bg-gray-200 rounded-lg" />
      </div>
      <div className="h-8 w-16 bg-gray-200 rounded" />
    </div>
  );
}

export function RowSkeleton() {
  return (
    <div className="border-b border-gray-50 p-4 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-gray-200 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 bg-gray-200 rounded" />
          <div className="h-3 w-full sm:w-48 bg-gray-100 rounded" />
        </div>
        <div className="h-6 w-16 bg-gray-100 rounded-full" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="card">
      <div className="p-5 border-b border-gray-100 animate-pulse">
        <div className="h-5 w-full sm:w-40 bg-gray-200 rounded" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <RowSkeleton key={i} />
      ))}
    </div>
  );
}

export function StatsGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:p-6">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function PageSkeleton({ children }: { children?: React.ReactNode }) {
  return (
    <div className="p-4 lg:p-8 space-y-4 lg:space-y-8">
      <div className="animate-pulse">
        <div className="h-7 w-56 bg-gray-200 rounded mb-2" />
        <div className="h-4 w-full lg:w-72 bg-gray-100 rounded" />
      </div>
      {children}
    </div>
  );
}
