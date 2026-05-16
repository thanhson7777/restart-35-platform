import { Skeleton } from '@/components/ui';

export const ScholarshipCardSkeleton = () => {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
      {/* Thumbnail */}
      <Skeleton className="aspect-[16/9] rounded-none" />

      {/* Content */}
      <div className="p-4 flex flex-col flex-1 space-y-3">
        {/* NGO */}
        <Skeleton className="h-3 w-24" />

        {/* Title */}
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />

        {/* Description */}
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />

        {/* Amount */}
        <Skeleton className="h-5 w-28" />

        {/* Deadline */}
        <Skeleton className="h-3 w-36" />

        {/* Progress */}
        <Skeleton className="h-1.5 w-full rounded-full" />
        <div className="flex justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-8" />
        </div>

        {/* Categories */}
        <div className="flex gap-1 pt-2 border-t border-border">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      </div>
    </div>
  );
};
