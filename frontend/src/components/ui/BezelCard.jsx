import React from 'react';
import { cn } from '@/lib/utils';

/**
 * BezelCard - A premium double-bezel card container (Doppelrand technique)
 * Outer enclosure provides a machined border frame while the inner core holds content.
 */
const BezelCard = React.forwardRef(
  ({ className, outerClassName, innerClassName, padding = 'default', children, ...props }, ref) => {
    const paddingStyles = {
      default: 'p-6',
      sm: 'p-4',
      lg: 'p-8',
      none: 'p-0',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'group relative overflow-hidden rounded-[2rem] p-1.5 bg-slate-900/40 border border-slate-800/80 backdrop-blur-md transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-slate-700/60 shadow-xl',
          outerClassName
        )}
        {...props}
      >
        <div
          className={cn(
            'w-full h-full rounded-[calc(2rem-0.375rem)] bg-slate-950/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]',
            paddingStyles[padding],
            innerClassName,
            className
          )}
        >
          {children}
        </div>
      </div>
    );
  }
);

BezelCard.displayName = 'BezelCard';

export { BezelCard };
