/**
 * Label Component
 *
 * An accessible form label component built with Radix UI.
 * Automatically associates with form inputs for proper accessibility.
 *
 * Features:
 * - Proper ARIA attributes
 * - Cursor pointer on hover
 * - Disabled state styling
 * - Peer state styling (invalid inputs)
 */

import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Label variant styles
 */
const labelVariants = cva(
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
);

/**
 * Label component
 *
 * @example
 * <Label htmlFor="email">Email</Label>
 * <Input id="email" type="email" />
 */
const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn(labelVariants(), className)} {...props} />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
