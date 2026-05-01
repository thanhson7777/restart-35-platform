import React from 'react';
import { cn } from '@/lib/utils';

const Badge = React.forwardRef(({ className, variant, children, ...props }, ref) => {
  const variantStyles = {
    default: 'bg-primary/10 text-primary',
    secondary: 'bg-secondary/10 text-secondary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
    outline: 'border border-input bg-transparent text-foreground',
    muted: 'bg-muted text-muted-foreground',
  };

  return (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
        variantStyles[variant || 'default'],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
});

Badge.displayName = 'Badge';

export { Badge };
