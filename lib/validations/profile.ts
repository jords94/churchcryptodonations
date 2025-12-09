/**
 * Zod Validation Schemas for Profile Forms
 *
 * Validates user input for personal profile, church profile,
 * security settings, and notification preferences.
 */

import { z } from 'zod';

/**
 * Personal Profile Schema
 */
export const personalProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
  email: z.string().email('Invalid email address'),
  phone: z
    .string()
    .regex(/^[\d\s\+\-\(\)]+$/, 'Invalid phone number format')
    .min(10, 'Phone number must be at least 10 digits')
    .max(20, 'Phone number is too long')
    .optional()
    .or(z.literal('')),
});

export type PersonalProfileFormData = z.infer<typeof personalProfileSchema>;

/**
 * Church Profile Schema
 */
export const churchProfileSchema = z.object({
  // Basic Information
  name: z.string().min(2, 'Church name is required').max(200, 'Name is too long'),
  officialName: z.string().max(200, 'Official name is too long').optional().or(z.literal('')),
  contactEmail: z.string().email('Invalid email address'),
  contactPhone: z
    .string()
    .regex(/^[\d\s\+\-\(\)]+$/, 'Invalid phone number format')
    .min(10, 'Phone number must be at least 10 digits')
    .max(20, 'Phone number is too long')
    .optional()
    .or(z.literal('')),
  website: z
    .string()
    .url('Invalid URL format')
    .optional()
    .or(z.literal('')),

  // Address
  address: z.string().max(500, 'Address is too long').optional().or(z.literal('')),
  city: z.string().max(100, 'City name is too long').optional().or(z.literal('')),
  state: z.string().max(100, 'State/Province name is too long').optional().or(z.literal('')),
  postalCode: z.string().max(20, 'Postal code is too long').optional().or(z.literal('')),
  country: z.string().min(2, 'Please select a country').max(2, 'Invalid country code'),

  // Tax & Compliance
  taxId: z.string().max(50, 'Tax ID is too long').optional().or(z.literal('')),
  taxIdType: z.enum(['ABN', 'EIN', 'CRN', 'Other', '']).optional(),
  isDgrRegistered: z.boolean().default(false),

  // Additional Info
  denomination: z.enum([
    'Non-denominational',
    'Baptist',
    'Catholic',
    'Anglican',
    'Methodist',
    'Presbyterian',
    'Pentecostal',
    'Lutheran',
    'Orthodox',
    'Other',
    '',
  ]).optional(),
  congregationSize: z.enum(['Small (1-100)', 'Medium (101-500)', 'Large (501-2000)', 'Mega (2000+)', '']).optional(),

  // Branding
  brandColor: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, 'Invalid color format (must be hex color like #3B82F6)')
    .default('#3B82F6'),
  donationMessage: z.string().max(1000, 'Message is too long (max 1000 characters)').optional().or(z.literal('')),

  // Settings
  defaultCurrency: z.enum(['AUD', 'USD', 'EUR', 'GBP']).default('AUD'),
  timezone: z.string().min(1, 'Please select a timezone'),
});

export type ChurchProfileFormData = z.infer<typeof churchProfileSchema>;

/**
 * Tax ID Validation based on Country
 */
export const validateTaxId = (taxId: string, country: string, taxIdType?: string): boolean => {
  if (!taxId) return true; // Optional field

  switch (taxIdType) {
    case 'ABN':
      // Australian Business Number: 11 digits
      return /^\d{11}$/.test(taxId.replace(/\s/g, ''));
    case 'EIN':
      // US Employer Identification Number: XX-XXXXXXX
      return /^\d{2}-?\d{7}$/.test(taxId);
    case 'CRN':
      // Canadian Business Number: 9 digits
      return /^\d{9}$/.test(taxId.replace(/\s/g, ''));
    default:
      // Generic: allow alphanumeric with common separators
      return /^[\dA-Z\-\s]{5,50}$/i.test(taxId);
  }
};

/**
 * Change Password Schema
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(72, 'Password is too long (max 72 characters)')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

/**
 * Change Email Schema
 */
export const changeEmailSchema = z.object({
  newEmail: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required to change email'),
});

export type ChangeEmailFormData = z.infer<typeof changeEmailSchema>;

/**
 * Notification Preferences Schema
 */
export const notificationPreferencesSchema = z.object({
  donationReceived: z.boolean().default(true), // Instant notification
  dailySummary: z.boolean().default(false),
  weeklySummary: z.boolean().default(true),
  monthlyReport: z.boolean().default(true),
  lowBalanceAlerts: z.boolean().default(true),
  securityAlerts: z.boolean().default(true), // Cannot be disabled
  productUpdates: z.boolean().default(true),
});

export type NotificationPreferencesData = z.infer<typeof notificationPreferencesSchema>;

/**
 * Password Strength Calculator
 */
export const calculatePasswordStrength = (password: string): {
  score: number;
  label: string;
  color: string;
} => {
  let score = 0;

  // Length
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;

  // Character variety
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  // Determine label and color
  if (score <= 2) {
    return { score, label: 'Weak', color: 'red' };
  } else if (score <= 4) {
    return { score, label: 'Fair', color: 'orange' };
  } else if (score <= 6) {
    return { score, label: 'Good', color: 'yellow' };
  } else {
    return { score, label: 'Strong', color: 'green' };
  }
};

/**
 * Available timezones for church settings
 */
export const timezones = [
  { value: 'Australia/Sydney', label: 'Sydney (AEDT)' },
  { value: 'Australia/Melbourne', label: 'Melbourne (AEDT)' },
  { value: 'Australia/Brisbane', label: 'Brisbane (AEST)' },
  { value: 'Australia/Perth', label: 'Perth (AWST)' },
  { value: 'Australia/Adelaide', label: 'Adelaide (ACDT)' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZDT)' },
  { value: 'America/New_York', label: 'New York (EST)' },
  { value: 'America/Chicago', label: 'Chicago (CST)' },
  { value: 'America/Denver', label: 'Denver (MST)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'UTC', label: 'UTC' },
];
