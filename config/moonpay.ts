/**
 * MoonPay Configuration
 *
 * Configuration for MoonPay integration (fiat onramp, swap, offramp).
 * MoonPay allows users to buy, swap, and sell cryptocurrency.
 *
 * MVP: Dummy configuration - replace with real values when ready
 *
 * Features:
 * - Onramp: Buy crypto with fiat (credit card, bank transfer)
 * - Swap: Exchange between cryptocurrencies
 * - Offramp: Sell crypto for fiat currency
 *
 * Setup:
 * 1. Sign up at https://www.moonpay.com/
 * 2. Get API keys from MoonPay dashboard
 * 3. Add keys to environment variables
 * 4. Update this config file
 *
 * Environment variables needed:
 * - MOONPAY_PUBLISHABLE_KEY: Public API key (safe for client-side)
 * - MOONPAY_SECRET_KEY: Secret API key (server-side only)
 * - MOONPAY_WEBHOOK_SECRET: For webhook verification
 */

/**
 * MoonPay environment (sandbox vs production)
 */
export type MoonPayEnvironment = 'sandbox' | 'production';

/**
 * MoonPay configuration
 */
export const MOONPAY_CONFIG = {
  /**
   * Environment (sandbox for testing, production for live)
   */
  environment: (process.env.MOONPAY_ENVIRONMENT || 'sandbox') as MoonPayEnvironment,

  /**
   * Publishable API Key (safe to use client-side)
   * MVP: Using dummy key - replace with real key from MoonPay dashboard
   */
  publishableKey: process.env.NEXT_PUBLIC_MOONPAY_PUBLISHABLE_KEY || 'pk_test_DUMMY_KEY_REPLACE_ME',

  /**
   * Secret API Key (server-side only - NEVER expose to client)
   * MVP: Using dummy key - replace with real key from MoonPay dashboard
   */
  secretKey: process.env.MOONPAY_SECRET_KEY || 'sk_test_DUMMY_KEY_REPLACE_ME',

  /**
   * Webhook secret for signature verification
   * MVP: Using dummy secret - replace with real secret from MoonPay
   */
  webhookSecret: process.env.MOONPAY_WEBHOOK_SECRET || 'whsec_DUMMY_SECRET_REPLACE_ME',

  /**
   * MoonPay API base URLs
   */
  apiUrl: {
    sandbox: 'https://api.moonpay.com',
    production: 'https://api.moonpay.com',
  },

  /**
   * MoonPay widget URLs
   */
  widgetUrl: {
    sandbox: 'https://buy-sandbox.moonpay.com',
    production: 'https://buy.moonpay.com',
  },

  /**
   * Supported currencies for onramp (buying crypto with fiat)
   * These are the cryptocurrencies users can buy
   */
  onrampCurrencies: {
    BTC: {
      code: 'btc',
      name: 'Bitcoin',
      minAmount: 30, // Minimum purchase in USD
      maxAmount: 20000, // Maximum purchase in USD
      networkFee: 'variable', // Network fees vary
    },
    USDC: {
      code: 'usdc', // USDC on Ethereum mainnet
      name: 'USD Coin',
      minAmount: 30,
      maxAmount: 20000,
      networkFee: 'variable',
    },
  },

  /**
   * Supported fiat currencies
   * Users can pay with these currencies
   */
  fiatCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],

  /**
   * Default fiat currency
   */
  defaultFiatCurrency: 'USD',

  /**
   * Payment methods supported
   */
  paymentMethods: [
    'credit_debit_card',
    'apple_pay',
    'google_pay',
    'sepa_bank_transfer',
    'gbp_bank_transfer',
  ],

  /**
   * Widget theme configuration
   */
  theme: {
    primary: '#3B82F6', // Blue color for primary buttons
    secondary: '#6B7280', // Gray color for secondary elements
    background: '#FFFFFF',
    text: '#1F2937',
  },

  /**
   * Redirect URLs after transaction
   */
  redirectUrls: {
    success: '/dashboard/wallets?onramp=success',
    failure: '/dashboard/wallets?onramp=failed',
  },

  /**
   * Webhook endpoints
   */
  webhookEndpoints: {
    transactionUpdate: '/api/webhooks/moonpay/transaction',
  },

  /**
   * Feature flags
   */
  features: {
    onramp: true, // Buy crypto with fiat
    swap: true, // Exchange between cryptos
    offramp: true, // Sell crypto for fiat
    kyc: true, // Know Your Customer verification
    recurringBuys: false, // MVP: Disabled for now
  },

  /**
   * Transaction limits
   */
  limits: {
    // Daily limits
    daily: {
      min: 30,
      max: 2000,
    },
    // Monthly limits
    monthly: {
      min: 30,
      max: 10000,
    },
  },

  /**
   * Estimated fees (percentage)
   * Actual fees determined by MoonPay
   */
  estimatedFees: {
    onramp: {
      card: 4.5, // ~4.5% for credit/debit card
      bankTransfer: 1.0, // ~1% for bank transfer
    },
    swap: 1.0, // ~1% for crypto swaps
    offramp: 1.0, // ~1% for selling crypto
  },
} as const;

/**
 * Get MoonPay widget URL with parameters
 *
 * Generates the URL to open MoonPay widget with pre-filled parameters
 *
 * @param params - Widget parameters
 * @returns Complete widget URL
 *
 * @example
 * const url = getMoonPayWidgetUrl({
 *   walletAddress: 'bc1q...',
 *   currencyCode: 'btc',
 *   baseCurrencyAmount: 100,
 * });
 */
export function getMoonPayWidgetUrl(params: {
  walletAddress: string;
  currencyCode: string;
  baseCurrencyAmount?: number;
  baseCurrencyCode?: string;
  colorCode?: string;
  email?: string;
  externalCustomerId?: string;
}) {
  const env = MOONPAY_CONFIG.environment;
  const baseUrl = MOONPAY_CONFIG.widgetUrl[env];

  const queryParams = new URLSearchParams({
    apiKey: MOONPAY_CONFIG.publishableKey,
    walletAddress: params.walletAddress,
    currencyCode: params.currencyCode.toLowerCase(),
  });

  if (params.baseCurrencyAmount) {
    queryParams.append('baseCurrencyAmount', params.baseCurrencyAmount.toString());
  }

  if (params.baseCurrencyCode) {
    queryParams.append('baseCurrencyCode', params.baseCurrencyCode);
  }

  if (params.colorCode) {
    queryParams.append('colorCode', params.colorCode.replace('#', ''));
  }

  if (params.email) {
    queryParams.append('email', params.email);
  }

  if (params.externalCustomerId) {
    queryParams.append('externalCustomerId', params.externalCustomerId);
  }

  return `${baseUrl}?${queryParams.toString()}`;
}

/**
 * Get MoonPay swap widget URL
 *
 * @param params - Swap parameters
 * @returns Swap widget URL
 */
export function getMoonPaySwapUrl(params: {
  walletAddress: string;
  fromCurrency: string;
  toCurrency: string;
  amount?: number;
}) {
  const env = MOONPAY_CONFIG.environment;
  const baseUrl = `${MOONPAY_CONFIG.widgetUrl[env]}/swap`;

  const queryParams = new URLSearchParams({
    apiKey: MOONPAY_CONFIG.publishableKey,
    walletAddress: params.walletAddress,
    fromCurrency: params.fromCurrency.toLowerCase(),
    toCurrency: params.toCurrency.toLowerCase(),
  });

  if (params.amount) {
    queryParams.append('amount', params.amount.toString());
  }

  return `${baseUrl}?${queryParams.toString()}`;
}

/**
 * Get MoonPay sell (offramp) widget URL
 *
 * @param params - Sell parameters
 * @returns Sell widget URL
 */
export function getMoonPaySellUrl(params: {
  walletAddress: string;
  currencyCode: string;
  baseCurrencyAmount?: number;
  refundWalletAddress?: string;
}) {
  const env = MOONPAY_CONFIG.environment;
  const baseUrl = `${MOONPAY_CONFIG.widgetUrl[env]}/sell`;

  const queryParams = new URLSearchParams({
    apiKey: MOONPAY_CONFIG.publishableKey,
    walletAddress: params.walletAddress,
    currencyCode: params.currencyCode.toLowerCase(),
  });

  if (params.baseCurrencyAmount) {
    queryParams.append('baseCurrencyAmount', params.baseCurrencyAmount.toString());
  }

  if (params.refundWalletAddress) {
    queryParams.append('refundWalletAddress', params.refundWalletAddress);
  }

  return `${baseUrl}?${queryParams.toString()}`;
}

/**
 * Check if MoonPay is configured (has real API keys)
 *
 * @returns True if using real keys, false if using dummy keys
 */
export function isMoonPayConfigured(): boolean {
  return (
    !MOONPAY_CONFIG.publishableKey.includes('DUMMY') &&
    !MOONPAY_CONFIG.secretKey.includes('DUMMY')
  );
}

/**
 * Get supported currencies for a specific feature
 *
 * @param feature - Feature name
 * @returns Array of supported currency codes
 */
export function getSupportedCurrencies(feature: 'onramp' | 'swap' | 'offramp'): string[] {
  // MVP: Same currencies for all features
  return ['BTC', 'USDC'];
}

/**
 * Check if currency is supported for a feature
 *
 * @param currency - Currency code
 * @param feature - Feature name
 * @returns True if supported
 */
export function isCurrencySupported(
  currency: string,
  feature: 'onramp' | 'swap' | 'offramp'
): boolean {
  const supported = getSupportedCurrencies(feature);
  return supported.includes(currency.toUpperCase());
}

/**
 * MoonPay transaction status types
 */
export type MoonPayTransactionStatus =
  | 'pending'
  | 'waitingPayment'
  | 'waitingAuthorization'
  | 'failed'
  | 'completed';

/**
 * MoonPay transaction type
 */
export interface MoonPayTransaction {
  id: string;
  status: MoonPayTransactionStatus;
  currencyCode: string;
  baseCurrencyAmount: number;
  quoteCurrencyAmount: number;
  walletAddress: string;
  createdAt: string;
  updatedAt: string;
}
