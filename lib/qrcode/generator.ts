/**
 * QR Code Generation Utilities
 *
 * Generates QR codes for cryptocurrency wallet addresses with customization options.
 *
 * Features:
 * - Multiple format support (URI schemes for wallets)
 * - Customizable appearance (colors, logo, size)
 * - Error correction levels
 * - Data URI generation for embedding
 *
 * Supported URI schemes:
 * - Bitcoin: bitcoin:address?amount=X&label=Y
 * - Ethereum: ethereum:address@chainId
 * - XRP: https://xrpl.org/send?to=address&amount=X
 *
 * Security notes:
 * - Always validate addresses before generating QR codes
 * - Sanitize label/message parameters
 * - Use appropriate error correction for logo overlays
 */

import type { Chain } from '@/config/chains';

/**
 * QR code generation options
 */
export interface QRCodeOptions {
  address: string;
  chain: Chain;
  amount?: string; // Optional preset amount
  label?: string; // Church/campaign name
  message?: string; // Optional message to donor
  size?: number; // QR code size in pixels (default: 256)
  backgroundColor?: string; // Background color (default: white)
  foregroundColor?: string; // QR code color (default: black)
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'; // L=7%, M=15%, Q=25%, H=30% (default: M, use H for logos)
  includeMargin?: boolean; // Add white margin around QR code (default: true)
}

/**
 * QR code data with metadata
 */
export interface QRCodeData {
  uri: string; // The URI/data encoded in the QR code
  address: string; // Raw address
  chain: Chain;
  amount?: string;
  label?: string;
  message?: string;
}

/**
 * Generate URI for cryptocurrency payment based on chain
 *
 * Different blockchains have different URI schemes:
 * - Bitcoin (BIP 21): bitcoin:address?amount=X&label=Y&message=Z
 * - Ethereum (EIP 681): ethereum:address@chainId/transfer?value=X
 * - XRP: Use XRPL send URL or raw address (no standard URI scheme)
 *
 * @param options - QR code generation options
 * @returns Payment URI string
 *
 * Security: All parameters are URL-encoded to prevent injection
 */
export function generatePaymentURI(options: QRCodeOptions): string {
  const { address, chain, amount, label, message } = options;

  switch (chain) {
    case 'BTC': {
      // BIP 21: bitcoin:address?param=value
      let uri = `bitcoin:${address}`;
      const params = new URLSearchParams();

      if (amount) {
        // Amount in BTC (not satoshis)
        params.append('amount', amount);
      }

      if (label) {
        // Display name for recipient (church name)
        params.append('label', label);
      }

      if (message) {
        // Message/note for transaction
        params.append('message', message);
      }

      const queryString = params.toString();
      return queryString ? `${uri}?${queryString}` : uri;
    }

    case 'ETH':
    case 'USDC': {
      // EIP 681: ethereum:address@chainId/function?params
      // For simple transfers: ethereum:address@1
      // Chain ID: 1 = Ethereum Mainnet
      let uri = `ethereum:${address}@1`;

      if (amount || message) {
        // For transfers with value, use transfer function
        const params = new URLSearchParams();

        if (amount) {
          // Amount in ETH/USDC (will be converted to wei by wallet)
          params.append('value', amount);
        }

        // Note: 'message' is not standard in EIP-681, but some wallets support it
        // Most wallets will ignore unknown parameters
        if (message) {
          params.append('message', message);
        }

        const queryString = params.toString();
        uri = queryString ? `${uri}/transfer?${queryString}` : uri;
      }

      return uri;
    }

    case 'XRP': {
      // XRP does not have a widely-adopted URI scheme like Bitcoin
      // Options:
      // 1. Use XRPL.org send URL (web-based)
      // 2. Use raw address (most wallet apps can scan and parse)
      // 3. Use xrpl:address format (not widely supported)
      //
      // We'll use the XRPL.org send URL for better UX

      const baseUrl = 'https://xrpl.org/send';
      const params = new URLSearchParams();

      params.append('to', address);

      if (amount) {
        // Amount in XRP
        params.append('amount', amount);
      }

      if (label) {
        params.append('label', label);
      }

      return `${baseUrl}?${params.toString()}`;

      // Alternative: Just return the raw address
      // return address;
    }

    default:
      // Fallback: Return raw address
      return address;
  }
}

/**
 * Create QR code data object
 *
 * This prepares the data structure for QR code generation.
 * The actual QR code image is generated client-side using qrcode.react.
 *
 * @param options - QR code generation options
 * @returns QR code data with URI
 */
export function createQRCodeData(options: QRCodeOptions): QRCodeData {
  const uri = generatePaymentURI(options);

  return {
    uri,
    address: options.address,
    chain: options.chain,
    amount: options.amount,
    label: options.label,
    message: options.message,
  };
}

/**
 * Validate QR code options
 *
 * Ensures all parameters are valid before generating QR code.
 *
 * @param options - QR code options to validate
 * @throws Error if validation fails
 */
export function validateQRCodeOptions(options: QRCodeOptions): void {
  // Validate address (basic check - full validation should be done earlier)
  if (!options.address || options.address.length < 10) {
    throw new Error('Invalid cryptocurrency address');
  }

  // Validate chain
  if (!['BTC', 'ETH', 'USDC', 'XRP'].includes(options.chain)) {
    throw new Error('Invalid blockchain chain');
  }

  // Validate amount (if provided)
  if (options.amount !== undefined) {
    const amountNum = parseFloat(options.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      throw new Error('Invalid amount: must be a positive number');
    }
  }

  // Validate label length (if provided)
  if (options.label && options.label.length > 100) {
    throw new Error('Label too long (max 100 characters)');
  }

  // Validate message length (if provided)
  if (options.message && options.message.length > 200) {
    throw new Error('Message too long (max 200 characters)');
  }

  // Validate size (if provided)
  if (options.size !== undefined && (options.size < 64 || options.size > 1024)) {
    throw new Error('Size must be between 64 and 1024 pixels');
  }

  // Validate error correction level (if provided)
  if (
    options.errorCorrectionLevel &&
    !['L', 'M', 'Q', 'H'].includes(options.errorCorrectionLevel)
  ) {
    throw new Error('Invalid error correction level (must be L, M, Q, or H)');
  }

  // Validate colors (if provided) - basic hex color check
  if (options.backgroundColor && !isValidHexColor(options.backgroundColor)) {
    throw new Error('Invalid background color (must be hex format #RRGGBB)');
  }

  if (options.foregroundColor && !isValidHexColor(options.foregroundColor)) {
    throw new Error('Invalid foreground color (must be hex format #RRGGBB)');
  }
}

/**
 * Validate hex color format
 *
 * @param color - Color string to validate
 * @returns True if valid hex color
 */
function isValidHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * Get suggested QR code settings based on use case
 *
 * Different use cases may need different QR code settings:
 * - Print: High resolution, high error correction (for logos)
 * - Display: Medium resolution, medium error correction
 * - Share: Small size, low error correction
 *
 * @param useCase - The intended use case
 * @returns Suggested QR code options
 */
export function getSuggestedQRSettings(
  useCase: 'print' | 'display' | 'share'
): Partial<QRCodeOptions> {
  switch (useCase) {
    case 'print':
      return {
        size: 512,
        errorCorrectionLevel: 'H', // High correction for logos
        includeMargin: true,
        backgroundColor: '#FFFFFF',
        foregroundColor: '#000000',
      };

    case 'display':
      return {
        size: 256,
        errorCorrectionLevel: 'M', // Medium correction
        includeMargin: true,
        backgroundColor: '#FFFFFF',
        foregroundColor: '#000000',
      };

    case 'share':
      return {
        size: 256,
        errorCorrectionLevel: 'L', // Low correction for smaller size
        includeMargin: false,
        backgroundColor: '#FFFFFF',
        foregroundColor: '#000000',
      };

    default:
      return {
        size: 256,
        errorCorrectionLevel: 'M',
        includeMargin: true,
      };
  }
}

/**
 * Format amount for display in QR code
 *
 * Converts amounts to appropriate decimal places for each chain.
 *
 * @param amount - Amount string
 * @param chain - Blockchain
 * @returns Formatted amount string
 */
export function formatAmountForQR(amount: string, chain: Chain): string {
  const amountNum = parseFloat(amount);

  if (isNaN(amountNum)) {
    return '0';
  }

  switch (chain) {
    case 'BTC':
      // Bitcoin: Up to 8 decimal places (satoshi precision)
      return amountNum.toFixed(8).replace(/\.?0+$/, '');

    case 'ETH':
    case 'USDC':
      // Ethereum/USDC: Up to 18 decimal places (wei precision)
      // But typically displayed with 6-8 decimals
      return amountNum.toFixed(6).replace(/\.?0+$/, '');

    case 'XRP':
      // XRP: Up to 6 decimal places (drop precision)
      return amountNum.toFixed(6).replace(/\.?0+$/, '');

    default:
      return amountNum.toString();
  }
}
