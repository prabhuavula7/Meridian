import React, { useMemo, useState } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/cn';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

const cardVariants = cva(
  'group relative overflow-hidden rounded-lg border border-border bg-surface/90 text-foreground shadow-soft transition-all duration-200 ease-expo',
  {
    variants: {
      variant: {
        default: 'bg-surface/88',
        glass: 'bg-surface-glass/66 backdrop-blur-xl',
        gradient: 'bg-[linear-gradient(160deg,rgba(var(--surface),0.96),rgba(var(--accent-base),0.18))]',
      },
      interactive: {
        true: 'surface-interactive',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      interactive: false,
    },
  }
);

const Card = React.forwardRef(({
  className,
  variant,
  interactive,
  spotlight = false,
  spotlightDisabled = false,
  children,
  ...props
}, ref) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [spotlightPosition, setSpotlightPosition] = useState({ x: 50, y: 50 });

  const enableSpotlight = useMemo(
    () => spotlight && !spotlightDisabled && !prefersReducedMotion,
    [spotlight, spotlightDisabled, prefersReducedMotion]
  );

  const handlePointerMove = (event) => {
    if (!enableSpotlight) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    setSpotlightPosition({ x, y });
  };

  return (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, interactive, className }))}
      onPointerMove={handlePointerMove}
      {...props}
    >
      {enableSpotlight ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 ease-expo group-hover:opacity-100"
          style={{
            background: `radial-gradient(circle at ${spotlightPosition.x}% ${spotlightPosition.y}%, rgba(var(--accent-glow), 0.20), transparent 56%)`,
          }}
        />
      ) : null}
      {children}
    </div>
  );
});

Card.displayName = 'Card';

const CardHeader = ({ className, ...props }) => (
  <div className={cn('flex items-start justify-between gap-3 px-5 pt-5', className)} {...props} />
);

const CardTitle = ({ className, children, ...props }) => (
  <h3 className={cn('text-base font-semibold tracking-tight', className)} {...props}>
    {children}
  </h3>
);

const CardDescription = ({ className, ...props }) => (
  <p className={cn('text-sm text-foreground-muted', className)} {...props} />
);

const CardContent = ({ className, ...props }) => (
  <div className={cn('px-5 py-4', className)} {...props} />
);

const CardFooter = ({ className, ...props }) => (
  <div className={cn('flex items-center gap-3 px-5 pb-5 pt-1', className)} {...props} />
);

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, cardVariants };
