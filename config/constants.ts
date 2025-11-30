/**
 * Application Constants
 *
 * Central location for all application-wide constants including:
 * - Subscription tiers and pricing
 * - Rate limiting thresholds
 * - Transaction confirmation requirements
 * - Feature flags
 * - UI constants
 *
 * Benefits of centralizing constants:
 * - Single source of truth
 * - Easy to update values
 * - Type-safe access
 * - Better code maintainability
 */

/**
 * Subscription tier limits and features
 */
export const SUBSCRIPTION_TIERS = {
  BASIC: {
    name: 'Basic',
    price: 29, // USD per month
    maxChains: 1, // Can enable 1 blockchain
    maxUsers: 1, // Only 1 admin user
    maxWalletsPerChain: 3,
    features: [
      'Single blockchain support',
      '1 admin user',
      'Basic analytics',
      'Email support',
      'QR code generation',
      'Transaction monitoring',
    ],
  },
  PRO: {
    name: 'Pro',
    price: 99, // USD per month
    maxChains: 4, // All blockchains (BTC, ETH, USDC, XRP)
    maxUsers: 10, // Up to 10 users with different roles
    maxWalletsPerChain: 10,
    features: [
      'All blockchain support',
      'Up to 10 users (RBAC)',
      'Advanced analytics & reports',
      'Priority email support',
      'Custom QR branding',
      'MoonPay swap integration',
      'Export transactions (CSV/PDF)',
    ],
  },
  ENTERPRISE: {
    name: 'Enterprise',
    price: 299, // USD per month (or custom pricing)
    maxChains: 4,
    maxUsers: -1, // Unlimited users
    maxWalletsPerChain: -1, // Unlimited wallets
    features: [
      'All Pro features',
      'Unlimited users',
      'Unlimited wallets',
      'White-label branding',
      'API access',
      'Dedicated support',
      'Custom integrations',
      'SLA guarantee',
    ],
  },
} as const;

/**
 * Trial period configuration
 */
export const TRIAL = {
  DURATION_DAYS: 14, // Free trial length
  GRACE_PERIOD_DAYS: 7, // Grace period after trial expires before account is disabled
} as const;

/**
 * Rate limiting thresholds
 * Protects against abuse and DoS attacks (OWASP #9)
 */
export const RATE_LIMITS = {
  // Authentication endpoints
  AUTH_LOGIN: {
    points: 5, // Number of attempts
    duration: 15 * 60, // 15 minutes (in seconds)
    blockDuration: 60 * 60, // 1 hour block after exceeding limit
  },
  AUTH_SIGNUP: {
    points: 3,
    duration: 60 * 60, // 1 hour
    blockDuration: 24 * 60 * 60, // 24 hour block
  },
  AUTH_PASSWORD_RESET: {
    points: 3,
    duration: 60 * 60, // 1 hour
    blockDuration: 24 * 60 * 60,
  },

  // API endpoints
  API_DEFAULT: {
    points: 100, // 100 requests
    duration: 60, // per minute
  },
  API_WALLET_CREATE: {
    points: 5, // Max 5 wallet creations
    duration: 60 * 60, // per hour
  },
  API_MOONPAY: {
    points: 10, // Max 10 MoonPay operations
    duration: 60 * 60, // per hour
  },

  // Public endpoints (donation pages)
  PUBLIC_DONATION_PAGE: {
    points: 60, // 60 views
    duration: 60, // per minute
  },
} as const;

/**
 * Transaction confirmation requirements
 * Matches chain configuration
 */
export const CONFIRMATIONS = {
  BTC: 3, // ~30 minutes
  ETH: 12, // ~3 minutes
  USDC: 12, // ~3 minutes (same as ETH)
  XRP: 1, // ~4 seconds
} as const;

/**
 * Wallet generation configuration
 */
export const WALLET = {
  // BIP39 mnemonic strength (128 bits = 12 words, 256 bits = 24 words)
  MNEMONIC_STRENGTH: 128, // 12 words (easier for users to manage)

  // Number of random words to verify during seed phrase confirmation
  VERIFICATION_WORD_COUNT: 3,

  // Derivation path account index (usually 0)
  DEFAULT_ACCOUNT_INDEX: 0,

  // Default address index (usually 0)
  DEFAULT_ADDRESS_INDEX: 0,
} as const;

/**
 * Price feed configuration
 */
export const PRICE_FEEDS = {
  // Cache duration for price data
  CACHE_TTL_SECONDS: 60, // 1 minute

  // How often to refresh balances in UI
  UI_REFRESH_INTERVAL_MS: 30000, // 30 seconds

  // Supported fiat currencies for conversion
  FIAT_CURRENCIES: ['USD', 'EUR', 'GBP'] as const,

  // Default fiat currency
  DEFAULT_CURRENCY: 'USD' as const,
} as const;

/**
 * QR code configuration
 */
export const QR_CODE = {
  // QR code size in pixels
  SIZE: 512,

  // Error correction level (L, M, Q, H)
  // Higher = more redundancy but larger QR code
  ERROR_CORRECTION_LEVEL: 'M' as const,

  // Margin around QR code (in modules)
  MARGIN: 4,

  // Default suggested donation amounts (USD)
  DEFAULT_SUGGESTED_AMOUNTS: ['10', '25', '50', '100', '250'] as const,
} as const;

/**
 * Email configuration
 */
export const EMAIL = {
  // Email templates
  TEMPLATES: {
    WELCOME: 'welcome',
    DONATION_RECEIPT: 'donation-receipt',
    USER_INVITATION: 'user-invitation',
    WALLET_CREATED: 'wallet-created',
    LARGE_DONATION_ALERT: 'large-donation-alert',
  },

  // Large donation threshold for alerts (USD)
  LARGE_DONATION_THRESHOLD: 1000,
} as const;

/**
 * Audit log configuration
 */
export const AUDIT = {
  // How long to retain audit logs (days)
  RETENTION_DAYS: 90, // 90 days minimum for compliance

  // Actions that trigger audit logs
  ACTIONS: {
    // Authentication
    LOGIN_SUCCESS: 'LOGIN_SUCCESS',
    LOGIN_FAILED: 'LOGIN_FAILED',
    LOGOUT: 'LOGOUT',
    PASSWORD_RESET: 'PASSWORD_RESET',

    // Wallet operations
    WALLET_CREATED: 'WALLET_CREATED',
    WALLET_DELETED: 'WALLET_DELETED',
    WALLET_EXPORTED: 'WALLET_EXPORTED',

    // Transaction operations
    TRANSACTION_CREATED: 'TRANSACTION_CREATED',
    TRANSACTION_EXPORTED: 'TRANSACTION_EXPORTED',

    // MoonPay operations
    FUNDS_WITHDRAWN: 'FUNDS_WITHDRAWN',
    CRYPTO_SWAPPED: 'CRYPTO_SWAPPED',

    // User management
    USER_INVITED: 'USER_INVITED',
    USER_ROLE_CHANGED: 'USER_ROLE_CHANGED',
    USER_REMOVED: 'USER_REMOVED',

    // Settings
    CHURCH_SETTINGS_UPDATED: 'CHURCH_SETTINGS_UPDATED',
    SUBSCRIPTION_CHANGED: 'SUBSCRIPTION_CHANGED',
  },
} as const;

/**
 * File upload limits
 */
export const UPLOADS = {
  // Church logo
  LOGO: {
    MAX_SIZE_MB: 5,
    ALLOWED_TYPES: ['image/png', 'image/jpeg', 'image/svg+xml'],
    MAX_WIDTH: 2000,
    MAX_HEIGHT: 2000,
  },

  // Transaction exports
  EXPORT: {
    MAX_ROWS: 10000, // Max transactions per export
  },
} as const;

/**
 * Pagination defaults
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

/**
 * Session configuration
 */
export const SESSION = {
  // Session cookie expiration
  EXPIRATION_DAYS: 7,

  // Remember me option extends to 30 days
  REMEMBER_ME_DAYS: 30,
} as const;

/**
 * Feature flags
 * Can be overridden by environment variables
 */
export const FEATURES = {
  MOONPAY_ENABLED: process.env.FEATURE_MOONPAY_ENABLED !== 'false',
  STRIPE_ENABLED: process.env.FEATURE_STRIPE_ENABLED !== 'false',
  MFA_ENABLED: process.env.FEATURE_MFA_ENABLED !== 'false',
  AUDIT_LOGS_ENABLED: process.env.FEATURE_AUDIT_LOGS_ENABLED !== 'false',
  DARK_MODE_ENABLED: false, // Future feature
  RECURRING_DONATIONS_ENABLED: false, // Future feature
} as const;

/**
 * API error messages
 * Centralized for consistency and i18n support in future
 */
export const ERROR_MESSAGES = {
  // Authentication errors
  INVALID_CREDENTIALS: 'Invalid email or password',
  EMAIL_NOT_VERIFIED: 'Please verify your email address',
  ACCOUNT_LOCKED: 'Account locked due to too many failed login attempts',

  // Authorization errors
  INSUFFICIENT_PERMISSIONS: 'You do not have permission to perform this action',
  INVALID_ROLE: 'Invalid user role',

  // Wallet errors
  WALLET_LIMIT_REACHED: 'You have reached the maximum number of wallets for your subscription tier',
  INVALID_CHAIN: 'Invalid blockchain network',
  CHAIN_NOT_ENABLED: 'This blockchain is not enabled for your church',

  // Transaction errors
  TRANSACTION_NOT_FOUND: 'Transaction not found',
  INSUFFICIENT_CONFIRMATIONS: 'Transaction does not have enough confirmations yet',

  // MoonPay errors
  MOONPAY_ERROR: 'An error occurred processing your MoonPay transaction',
  KYC_REQUIRED: 'KYC verification required to withdraw funds',

  // Subscription errors
  SUBSCRIPTION_EXPIRED: 'Your subscription has expired',
  PAYMENT_FAILED: 'Payment failed. Please update your payment method',

  // General errors
  INTERNAL_ERROR: 'An internal error occurred. Please try again later',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please try again later',
  VALIDATION_ERROR: 'Invalid input data',
} as const;

/**
 * Success messages
 */
export const SUCCESS_MESSAGES = {
  WALLET_CREATED: 'Wallet created successfully',
  USER_INVITED: 'User invitation sent',
  SETTINGS_UPDATED: 'Settings updated successfully',
  TRANSACTION_EXPORTED: 'Transactions exported successfully',
  SUBSCRIPTION_UPDATED: 'Subscription updated successfully',
} as const;

/**
 * Application metadata
 */
export const APP_META = {
  NAME: 'Church Crypto Donations',
  DESCRIPTION: 'Accept crypto donations for your church with ease and security',
  URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  SUPPORT_EMAIL: 'support@churchcryptodonations.com',
  VERSION: '0.1.0',
} as const;
