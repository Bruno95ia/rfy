import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        default:
          'border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]',
        success:
          'border-[var(--color-success-soft)] bg-[var(--color-success-soft)] text-[var(--color-success)]',
        warning:
          'border-[var(--color-warning-soft)] bg-[var(--color-warning-soft)] text-[var(--color-warning)]',
        danger:
          'border-[var(--color-danger-soft)] bg-[var(--color-danger-soft)] text-[var(--color-danger)]',
        processing:
          'border-[var(--color-primary-soft)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]',
        primary:
          'border-[var(--color-primary-soft)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]',
        outline:
          'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
