import React from 'react';
import { cn } from '@/lib/utils';

/**
 * BezelCard - Premium card container (Doppelrand / Double-Bezel technique)
 * For light admin theme: white surface inside subtle border shell.
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
          'group relative overflow-hidden rounded-2xl',
          'bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))]',
          'shadow-[var(--admin-shadow-md)]',
          'transition-all duration-200',
          'hover:border-[hsl(var(--admin-border-strong))] hover:shadow-[var(--admin-shadow-lg)]',
          outerClassName
        )}
        {...props}
      >
        <div
          className={cn(
            'w-full h-full rounded-xl',
            paddingStyles[padding],
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
