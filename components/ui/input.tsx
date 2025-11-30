/**
 * Input Component
 *
 * A styled text input component with proper accessibility support.
 * Supports all standard HTML input types and props.
 *
 * Features:
 * - Consistent styling across the application
 * - Focus ring for accessibility
 * - Disabled state styling
 * - File input styling
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Input props interface
 * Extends standard HTML input attributes
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

/**
 * Input component
 *
 * @example
 * <Input type="email" placeholder="Email address" />
 * <Input type="password" placeholder="Password" />
 * <Input type="text" disabled placeholder="Disabled input" />
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base styles
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
          // Typography
          'ring-offset-background',
          // File input specific styles
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          // Placeholder styles
          'placeholder:text-muted-foreground',
          // Focus styles (accessibility)
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          // Disabled styles
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
