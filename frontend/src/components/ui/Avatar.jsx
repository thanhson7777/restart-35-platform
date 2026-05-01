import React from 'react';
import { cn } from '@/lib/utils';

const Avatar = React.forwardRef(
  ({ className, size, src, alt, fallback, ...props }, ref) => {
    const sizeStyles = {
      sm: 'h-8 w-8 text-xs',
      default: 'h-10 w-10 text-sm',
      lg: 'h-12 w-12 text-base',
      xl: 'h-16 w-16 text-lg',
    };

    const getFallbackText = () => {
      if (fallback) return fallback;
      if (alt) return alt.charAt(0).toUpperCase();
      return '?';
    };

    return (
      <div
        ref={ref}
        className={cn(
          'relative flex shrink-0 overflow-hidden rounded-full bg-muted',
          sizeStyles[size || 'default'],
          className
        )}
        {...props}
      >
        {src ? (
          <img
            src={src}
            alt={alt || 'Avatar'}
            className="aspect-square h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-primary/10 text-primary font-medium">
            {getFallbackText()}
          </span>
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';

export { Avatar };
