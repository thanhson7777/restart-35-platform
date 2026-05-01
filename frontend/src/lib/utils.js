import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { cva } from 'class-variance-authority';

/**
 * Combines clsx and tailwind-merge for optimal class handling
 */
export function cn(...inputs) {
  return clsx(inputs);
}

/**
 * Button Component with variants
 */
export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-sm',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        success: 'bg-success text-white hover:bg-success/90',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3 text-sm',
        lg: 'h-12 px-8 text-lg',
        xl: 'h-14 px-10 text-xl',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

/**
 * Badge Component with variants
 */
export const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary/10 text-primary',
        secondary: 'bg-secondary/10 text-secondary',
        success: 'bg-success/10 text-success',
        warning: 'bg-warning/10 text-warning',
        destructive: 'bg-destructive/10 text-destructive',
        outline: 'border border-input bg-transparent text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

/**
 * Card Component with variants
 */
export const cardVariants = cva(
  'rounded-xl border border-border bg-card text-card-foreground shadow-sm transition-all duration-200',
  {
    variants: {
      variant: {
        default: '',
        elevated: 'shadow-md hover:shadow-lg',
        interactive: 'hover:shadow-lg hover:border-primary/20 cursor-pointer',
        outline: 'border-2 border-primary/20',
      },
      padding: {
        default: 'p-6',
        sm: 'p-4',
        lg: 'p-8',
        none: 'p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'default',
    },
  }
);

/**
 * Input Component with variants
 */
export const inputVariants = cva(
  'flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'focus-visible:ring-ring',
        error: 'border-destructive focus-visible:ring-destructive',
        success: 'border-success focus-visible:ring-success',
      },
      inputSize: {
        default: 'h-10',
        sm: 'h-9',
        lg: 'h-12',
      },
    },
    defaultVariants: {
      variant: 'default',
      inputSize: 'default',
    },
  }
);
