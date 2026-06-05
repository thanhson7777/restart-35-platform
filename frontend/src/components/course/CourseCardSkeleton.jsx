import React from 'react';
import { Skeleton } from '@/components/ui';

export const CourseCardSkeleton = ({ variant = 'vertical' }) => {
  const isHorizontal = variant === 'horizontal';

  return (
    <div 
      className={`bg-white dark:bg-zinc-950 rounded-xl border border-zinc-250/60 dark:border-zinc-900 overflow-hidden flex ${
        isHorizontal ? 'flex-col sm:flex-row' : 'flex-col'
      }`}
    >
      <Skeleton 
        className={`${
          isHorizontal 
            ? 'w-full sm:w-56 md:w-64 aspect-video sm:aspect-[4/3] md:aspect-video shrink-0' 
            : 'w-full aspect-video'
        }`} 
      />
      <div className="p-5 space-y-3 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex items-center gap-4 pt-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16 ml-auto" />
        </div>
      </div>
    </div>
  );
};
