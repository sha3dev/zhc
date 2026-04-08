import { cn } from '@/lib/utils';
import type React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return <div className={cn('animate-skeleton', className)} {...props} />;
}

/** Full stat card skeleton */
export function StatCardSkeleton() {
  return (
    <div className="border border-border bg-card p-4 space-y-3">
      <Skeleton className="h-2.5 w-20" />
      <Skeleton className="h-9 w-12" />
      <Skeleton className="h-2 w-14" />
    </div>
  );
}

/** Model distribution row skeleton */
export function ModelRowSkeleton({ width }: { width: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Skeleton className={`h-2.5 ${width}`} />
        <Skeleton className="h-2.5 w-3" />
      </div>
      <Skeleton className="h-1.5 w-full" />
    </div>
  );
}

/** Table row skeleton */
export function TableRowSkeleton({ cols = 4 }: { cols?: number }) {
  const widths = ['w-32', 'w-40', 'w-16', 'w-24'];
  return (
    <tr className="border-b border-border">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-3 py-2.5">
          <Skeleton className={`h-2.5 ${widths[i] ?? 'w-20'}`} />
        </td>
      ))}
    </tr>
  );
}
