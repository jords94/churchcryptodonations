/**
 * Button Component
 *
 * A versatile button component with multiple variants and sizes.
 * Built with Radix UI primitives and styled with Tailwind CSS.
 *
 * Variants:
 * - default: Primary button style
 * - destructive: For dangerous actions (delete, etc.)
 * - outline: Secondary button with border
 * - ghost: Minimal styling
 * - link: Text link appearance
 *
 * Sizes:
 * - default: Standard button size
 * - sm: Small button
 * - lg: Large button
 * - icon: Square button for icons
 */

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Button variant styles using class-variance-authority
 * Provides type-safe variant props
 */
const buttonVariants = cva(
  // Base styles applied to all buttons
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
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
 * Button props interface
 */
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean; // Render as child element (useful for Next.js Link)
}

/**
 * Button component
 *
 * @example
 * <Button>Click me</Button>
 * <Button variant="outline" size="lg">Large Outline</Button>
 * <Button variant="destructive" disabled>Delete</Button>
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
