import { cn } from '@/lib/utils';
import { Slot } from '@radix-ui/react-slot';
import { type VariantProps, cva } from 'class-variance-authority';
import * as React from 'react';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-1.5',
    'font-mono text-xs tracking-widest',
    'border transition-all duration-200',
    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
    'disabled:pointer-events-none disabled:opacity-40',
    'active:scale-[0.96] active:opacity-80',
    'cursor-pointer select-none',
  ],
  {
    variants: {
      variant: {
        /* [ PRIMARY ] — green glow */
        default: [
          'border-primary text-primary px-4 py-1.5',
          'shadow-glow-sm hover:bg-primary/10 hover:shadow-glow',
        ],
        /* [ DANGER ] */
        destructive: [
          'border-destructive/60 text-destructive px-3 py-1.5',
          'hover:bg-destructive/10',
        ],
        /* subtle border */
        outline: [
          'border-border text-muted-foreground px-3 py-1.5',
          'hover:border-foreground/40 hover:text-foreground',
        ],
        /* no border */
        ghost: [
          'border-transparent text-muted-foreground px-3 py-1.5',
          'hover:border-border hover:text-foreground',
        ],
        secondary: [
          'border-border bg-secondary text-secondary-foreground px-3 py-1.5',
          'hover:bg-secondary/60',
        ],
      },
      size: {
        default: 'h-7',
        sm: 'h-6 text-2xs px-2 py-0.5',
        lg: 'h-8 px-5',
        icon: 'h-7 w-7 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
