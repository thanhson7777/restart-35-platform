import React from 'react';
import { cn } from '@/lib/utils';

const Badge = React.forwardRef(({ className, variant, children, ...props }, ref) => {
  const variantStyles = {
    default:   'bg-[hsl(var(--admin-accent))] text-[hsl(var(--admin-text-inverse))] border border-[hsl(var(--admin-accent))]/25',
    secondary: 'bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-secondary))] border border-[hsl(var(--admin-border))]',
    success:   'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25',
    warning:   'bg-amber-500/10 text-amber-400 border border-amber-500/25',
    destructive: 'bg-red-500/10 text-red-400 border border-red-500/25',
    outline:   'border border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] bg-transparent',
    muted:     'bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-muted))]',
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
