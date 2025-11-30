import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge Tailwind CSS classes
 *
 * This function combines clsx (for conditional class names) and tailwind-merge
 * (for deduplicating Tailwind classes) to create a powerful className utility.
 *
 * Benefits:
 * - Handles conditional class names elegantly
 * - Prevents Tailwind class conflicts (e.g., 'px-2 px-4' -> 'px-4')
 * - Makes component composition cleaner
 *
 * @param inputs - Class names to merge (strings, objects, arrays)
 * @returns Merged and deduplicated class string
 *
 * @example
 * cn('px-2 py-1', 'px-4') // Returns: 'py-1 px-4'
 * cn('text-red-500', condition && 'text-blue-500') // Conditional classes
 * cn({ 'bg-primary': isPrimary, 'bg-secondary': !isPrimary })
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
