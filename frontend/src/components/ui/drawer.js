import React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/cn';

const Drawer = DialogPrimitive.Root;
const DrawerTrigger = DialogPrimitive.Trigger;
const DrawerClose = DialogPrimitive.Close;

const drawerVariants = cva(
  'fixed z-50 border border-border bg-surface shadow-floating transition-transform duration-200 ease-expo',
  {
    variants: {
      side: {
        right: 'inset-y-0 right-0 h-full w-[min(92vw,460px)] border-l data-[state=open]:translate-x-0 data-[state=closed]:translate-x-full',
        left: 'inset-y-0 left-0 h-full w-[min(92vw,460px)] border-r data-[state=open]:translate-x-0 data-[state=closed]:-translate-x-full',
      },
    },
    defaultVariants: {
      side: 'right',
    },
  }
);

const DrawerContent = React.forwardRef(({ className, children, side = 'right', ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm transition-opacity duration-200 ease-expo data-[state=open]:opacity-100 data-[state=closed]:opacity-0" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(drawerVariants({ side }), className)}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm text-foreground-subtle transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
        <X size={16} />
        <span className="sr-only">Close drawer</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DrawerContent.displayName = 'DrawerContent';

const DrawerHeader = ({ className, ...props }) => (
  <div className={cn('border-b border-border px-5 py-4', className)} {...props} />
);

const DrawerBody = ({ className, ...props }) => (
  <div className={cn('px-5 py-4', className)} {...props} />
);

const DrawerFooter = ({ className, ...props }) => (
  <div className={cn('mt-auto border-t border-border px-5 py-4', className)} {...props} />
);

export {
  Drawer,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
};
