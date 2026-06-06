import React from 'react';
import { cn } from '@/lib/utils';

const Badge = React.forwardRef(({ className, variant, children, ...props }, ref) => {
  const variantStyles = {
    default:   'bg-indigo-500/10 text-indigo-400 border border-indigo-500/25',
    secondary: 'bg-[#111318] text-[#8093ad] border border-[#1e2028]',
    success:   'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25',
    warning:   'bg-amber-500/10 text-amber-400 border border-amber-500/25',
    destructive: 'bg-red-500/10 text-red-400 border border-red-500/25',
    outline:   'border border-[#1e2028] text-[#8093ad] bg-transparent',
    muted:     'bg-[#111318] text-[#4a5468]',
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
