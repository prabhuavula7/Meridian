import React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-all duration-200 ease-expo disabled:pointer-events-none disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background-base',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-white shadow-glow hover:brightness-105 hover:-translate-y-[1px] border border-border-accent',
        secondary: 'bg-surface text-foreground border border-border hover:bg-surface-hover hover:border-border-hover',
        ghost: 'bg-transparent text-foreground-muted hover:text-foreground hover:bg-surface/80 border border-transparent hover:border-border',
        danger: 'bg-danger text-white hover:brightness-105 border border-danger',
      },
      size: {
        sm: 'h-9 px-3.5',
        md: 'h-10 px-4',
        lg: 'h-11 px-5 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'md',
    },
  }
);

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      ref={ref}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
});

Button.displayName = 'Button';

export { Button, buttonVariants };
