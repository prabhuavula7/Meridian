import React from 'react';
import { cn } from '../../lib/cn';

const Textarea = React.forwardRef(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'min-h-[100px] w-full rounded-md border border-border bg-surface/75 px-3 py-2 text-sm text-foreground placeholder:text-foreground-subtle transition-colors duration-200 ease-expo hover:border-border-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background-base',
      className
    )}
    {...props}
  />
));

Textarea.displayName = 'Textarea';

export { Textarea };
