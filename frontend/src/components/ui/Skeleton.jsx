import React from 'react';
import { cn } from '@/lib/utils';

const Skeleton = ({ className, ...props }) => {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  );
};

const SkeletonText = ({ className, lines = 3, ...props }) => {
  return (
    <div className={cn('space-y-2', className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            'h-4',
            i === lines - 1 && 'w-3/4'
          )}
        />
      ))}
    </div>
  );
};

const SkeletonCard = ({ className, ...props }) => {
  return (
    <div
      className={cn('rounded-xl border border-border bg-card p-6 shadow-sm', className)}
      {...props}
    >
      <Skeleton className="h-40 w-full mb-4 rounded-lg" />
      <Skeleton className="h-6 w-3/4 mb-2" />
      <Skeleton className="h-4 w-full mb-1" />
      <Skeleton className="h-4 w-2/3 mb-4" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>
    </div>
  );
};

const SkeletonAvatar = ({ className, size = 'default', ...props }) => {
  const sizeStyles = {
    sm: 'h-8 w-8',
    default: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  return (
    <Skeleton
      className={cn('rounded-full', sizeStyles[size])}
      {...props}
    />
  );
};

export { Skeleton, SkeletonText, SkeletonCard, SkeletonAvatar };
