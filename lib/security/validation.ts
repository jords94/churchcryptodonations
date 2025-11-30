/**
 * Input Validation and Sanitization
 *
 * Protects against injection attacks (OWASP #3)
 * All user inputs should be validated and sanitized before use.
 *
 * Security principles:
 * - Validate on server-side (never trust client)
 * - Use allowlist validation when possible
 * - Sanitize for output context (HTML, SQL, etc.)
 * - Fail securely (reject invalid input)
 */

import validator from 'validator';
import { z } from 'zod';

/**
 * Email validation schema
 * Uses Zod for type-safe validation
 */
export const emailSchema = z.string().email('Invalid email address').toLowerCase();

/**
 * Password validation schema
 *
 * Requirements:
 * - Minimum 12 characters (OWASP recommendation)
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
export const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

/**
 * Church slug validation
 * Alphanumeric and hyphens only, 3-50 characters
 */
export const slugSchema = z
  .string()
  .min(3, 'Slug must be at least 3 characters')
  .max(50, 'Slug must not exceed 50 characters')
  .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
  .regex(/^[a-z]/, 'Slug must start with a letter')
  .regex(/[^-]$/, 'Slug must not end with a hyphen');

/**
 * Phone number validation
 * International format
 */
export const phoneSchema = z.string().refine(
  (val) => validator.isMobilePhone(val, 'any', { strictMode: false }),
  {
    message: 'Invalid phone number',
  }
);

/**
 * URL validation
 * HTTPS only for security
 */
export const urlSchema = z.string().url('Invalid URL').startsWith('https://', {
  message: 'URL must use HTTPS',
});

/**
 * Hex color validation
 */
export const colorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color (must be #RRGGBB)');

/**
 * CUID validation (Prisma default ID format)
 */
export const cuidSchema = z.string().cuid('Invalid ID format');

/**
 * Sanitize HTML to prevent XSS
 *
 * Removes all HTML tags and dangerous characters
 * Use for user-generated content that will be displayed as plain text
 *
 * @param input - User input string
 * @returns Sanitized string safe for display
 *
 * @example
 * const safe = sanitizeHtml('<script>alert("xss")</script>Hello');
 * // Returns: 'Hello'
 */
export function sanitizeHtml(input: string): string {
  return validator.stripLow(validator.escape(input));
}

/**
 * Validate and sanitize email address
 *
 * @param email - Email address to validate
 * @returns Sanitized email in lowercase
 * @throws Error if email is invalid
 */
export function validateEmail(email: string): string {
  const result = emailSchema.safeParse(email);

  if (!result.success) {
    throw new Error(result.error.errors[0].message);
  }

  return result.data;
}

/**
 * Validate password strength
 *
 * @param password - Password to validate
 * @throws Error if password doesn't meet requirements
 */
export function validatePassword(password: string): void {
  const result = passwordSchema.safeParse(password);

  if (!result.success) {
    throw new Error(result.error.errors[0].message);
  }
}

/**
 * Validate church slug
 *
 * Ensures slug is URL-safe and follows naming conventions
 *
 * @param slug - Slug to validate
 * @returns Validated slug
 * @throws Error if slug is invalid
 */
export function validateSlug(slug: string): string {
  const result = slugSchema.safeParse(slug);

  if (!result.success) {
    throw new Error(result.error.errors[0].message);
  }

  return result.data;
}

/**
 * Validate blockchain address format
 *
 * Basic validation - checks general format
 * For production, use chain-specific validation libraries
 *
 * @param address - Blockchain address
 * @param chain - Blockchain type
 * @returns True if format is valid
 */
export function validateBlockchainAddress(address: string, chain: string): boolean {
  const patterns: Record<string, RegExp> = {
    BTC: /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-zA-HJ-NP-Z0-9]{39,59}$/,
    ETH: /^0x[a-fA-F0-9]{40}$/,
    USDC: /^0x[a-fA-F0-9]{40}$/, // Same as ETH (ERC-20)
    XRP: /^r[1-9A-HJ-NP-Za-km-z]{25,34}$/,
  };

  const pattern = patterns[chain];

  if (!pattern) {
    throw new Error(`Unsupported chain: ${chain}`);
  }

  return pattern.test(address);
}

/**
 * Validate transaction hash format
 *
 * @param txHash - Transaction hash
 * @param chain - Blockchain type
 * @returns True if format is valid
 */
export function validateTransactionHash(txHash: string, chain: string): boolean {
  const patterns: Record<string, RegExp> = {
    BTC: /^[a-fA-F0-9]{64}$/,
    ETH: /^0x[a-fA-F0-9]{64}$/,
    USDC: /^0x[a-fA-F0-9]{64}$/, // Same as ETH
    XRP: /^[A-F0-9]{64}$/,
  };

  const pattern = patterns[chain];

  if (!pattern) {
    throw new Error(`Unsupported chain: ${chain}`);
  }

  return pattern.test(txHash);
}

/**
 * Sanitize filename for uploads
 *
 * Removes path traversal characters and dangerous extensions
 *
 * @param filename - Original filename
 * @returns Safe filename
 */
export function sanitizeFilename(filename: string): string {
  // Remove path components
  let safe = filename.replace(/^.*[\\\/]/, '');

  // Remove dangerous characters
  safe = safe.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Limit length
  if (safe.length > 255) {
    const ext = safe.slice(safe.lastIndexOf('.'));
    safe = safe.slice(0, 255 - ext.length) + ext;
  }

  return safe;
}

/**
 * Validate file upload
 *
 * Checks file size and MIME type
 *
 * @param file - File object
 * @param maxSizeMB - Maximum file size in MB
 * @param allowedTypes - Array of allowed MIME types
 * @throws Error if file is invalid
 */
export function validateFileUpload(
  file: File,
  maxSizeMB: number,
  allowedTypes: string[]
): void {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  if (file.size > maxSizeBytes) {
    throw new Error(`File size must not exceed ${maxSizeMB}MB`);
  }

  if (!allowedTypes.includes(file.type)) {
    throw new Error(
      `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
    );
  }
}

/**
 * Validate and parse pagination parameters
 *
 * @param page - Page number (1-indexed)
 * @param pageSize - Items per page
 * @param maxPageSize - Maximum allowed page size
 * @returns Validated pagination params with offset
 */
export function validatePagination(
  page: number | string = 1,
  pageSize: number | string = 20,
  maxPageSize: number = 100
) {
  const pageNum = typeof page === 'string' ? parseInt(page, 10) : page;
  const pageSizeNum = typeof pageSize === 'string' ? parseInt(pageSize, 10) : pageSize;

  if (isNaN(pageNum) || pageNum < 1) {
    throw new Error('Invalid page number');
  }

  if (isNaN(pageSizeNum) || pageSizeNum < 1) {
    throw new Error('Invalid page size');
  }

  if (pageSizeNum > maxPageSize) {
    throw new Error(`Page size must not exceed ${maxPageSize}`);
  }

  return {
    page: pageNum,
    pageSize: pageSizeNum,
    offset: (pageNum - 1) * pageSizeNum,
  };
}

/**
 * Validate IP address
 *
 * @param ip - IP address string
 * @returns True if valid IPv4 or IPv6
 */
export function validateIPAddress(ip: string): boolean {
  return validator.isIP(ip);
}

/**
 * Sanitize user agent string
 *
 * Limits length and removes control characters
 *
 * @param userAgent - User agent string
 * @returns Sanitized user agent
 */
export function sanitizeUserAgent(userAgent: string): string {
  let safe = validator.stripLow(userAgent);

  // Limit length to prevent DoS
  if (safe.length > 500) {
    safe = safe.slice(0, 500);
  }

  return safe;
}

/**
 * Validate date range
 *
 * Ensures start date is before end date and range is reasonable
 *
 * @param startDate - Start date
 * @param endDate - End date
 * @param maxDays - Maximum allowed days in range
 * @throws Error if range is invalid
 */
export function validateDateRange(
  startDate: Date,
  endDate: Date,
  maxDays: number = 365
): void {
  if (startDate >= endDate) {
    throw new Error('Start date must be before end date');
  }

  const daysDiff = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysDiff > maxDays) {
    throw new Error(`Date range must not exceed ${maxDays} days`);
  }
}
