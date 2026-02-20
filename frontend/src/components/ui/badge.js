import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/cn';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium tracking-wide transition-colors',
  {
    variants: {
      variant: {
        default: 'border-border bg-surface-hover text-foreground',
        accent: 'border-border-accent bg-accent/15 text-accent-glow',
        gold: 'border-gold/45 bg-gold/15 text-gold',
        success: 'border-success/50 bg-success/15 text-success',
        warning: 'border-warning/50 bg-warning/15 text-warning',
        danger: 'border-danger/50 bg-danger/15 text-danger',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
