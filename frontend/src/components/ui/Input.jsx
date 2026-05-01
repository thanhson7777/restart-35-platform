import React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef(
  ({ className, variant, inputSize, error, type, ...props }, ref) => {
    const baseStyles =
      'flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

    const variantStyles = {
      default: 'focus-visible:ring-ring',
      error: 'border-destructive focus-visible:ring-destructive',
      success: 'border-success focus-visible:ring-success',
    };

    const sizeStyles = {
      default: 'h-10',
      sm: 'h-9',
      lg: 'h-12',
    };

    return (
      <div className="w-full">
        <input
          type={type}
          className={cn(
            baseStyles,
            variantStyles[variant || 'default'],
            sizeStyles[inputSize || 'default'],
            error && 'border-destructive focus-visible:ring-destructive',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

const Label = React.forwardRef(({ className, required, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
      className
    )}
    {...props}
  >
    {props.children}
    {required && <span className="ml-1 text-destructive">*</span>}
  </label>
));

Label.displayName = 'Label';

const Textarea = React.forwardRef(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <textarea
          className={cn(
            'flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-destructive focus-visible:ring-destructive',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export { Input, Label, Textarea };
