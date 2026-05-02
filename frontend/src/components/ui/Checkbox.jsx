import React from 'react';
import { cn } from '@/lib/utils';

const Checkbox = React.forwardRef(
  ({ className, checked, onChange, disabled, label, description, icon: Icon, ...props }, ref) => {
    const isChecked = Boolean(checked);

    const handleKeyDown = (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (!disabled && onChange) {
          onChange(!isChecked);
        }
      }
    };

    return (
      <div
        ref={ref}
        className={cn(
          'group relative flex cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 select-none',
          'focus-within:ring-2 focus-within:ring-primary/30 focus-within:ring-offset-2',
          isChecked
            ? 'border-primary bg-primary/5 shadow-sm'
            : 'border-border bg-background hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm',
          disabled && 'cursor-not-allowed opacity-50 hover:border-border hover:bg-background hover:shadow-none',
          className
        )}
        onClick={() => {
          if (!disabled && onChange) {
            onChange(!isChecked);
          }
        }}
        role="checkbox"
        aria-checked={isChecked}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {/* Checkbox indicator */}
        <div
          className={cn(
            'mr-3 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-200',
            isChecked
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-muted-foreground/30 bg-background group-hover:border-primary/50'
          )}
        >
          {isChecked && (
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>

        {/* Icon */}
        {Icon && (
          <div
            className={cn(
              'mr-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors duration-200',
              isChecked ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary/70'
            )}
          >
            <Icon size={22} strokeWidth={1.75} />
          </div>
        )}

        {/* Label + Description */}
        <div className="flex flex-col min-w-0">
          <span
            className={cn(
              'text-sm font-medium transition-colors duration-200',
              isChecked ? 'text-primary' : 'text-foreground group-hover:text-primary/80'
            )}
          >
            {label}
          </span>
          {description && (
            <span className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
              {description}
            </span>
          )}
        </div>
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export { Checkbox };
