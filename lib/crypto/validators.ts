/**
 * Blockchain Address Validators
 *
 * Unified validation functions for all supported blockchain addresses.
 * Provides a single interface for validating addresses across different chains.
 *
 * Supported chains:
 * - Bitcoin (BTC): Legacy, SegWit, Native SegWit
 * - Ethereum (ETH): EIP-55 checksummed addresses
 * - USDC: Same as Ethereum (ERC-20 token)
 * - XRP: XRP Ledger addresses
 */

import { type Chain } from '@/config/chains';
import { validateBitcoinAddress } from './bitcoin';
import { validateEthereumAddress, validateUSDCAddress } from './ethereum';
import { validateXRPAddress } from './xrp';

/**
 * Validate blockchain address for any supported chain
 *
 * Single entry point for address validation across all chains.
 * Routes to chain-specific validators.
 *
 * @param address - Blockchain address to validate
 * @param chain - Blockchain network
 * @returns True if address is valid for the specified chain
 * @throws Error if chain is not supported
 *
 * @example
 * validateAddress("bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4", "BTC") // true
 * validateAddress("0x742d35Cc6634C0532925a3b844Bc454e4438f44e", "ETH") // true
 * validateAddress("rN7n7otQDd6FczFgLdlqtyMVrn3LNU8NsNi", "XRP") // true
 * validateAddress("invalid", "BTC") // false
 */
export function validateAddress(address: string, chain: Chain): boolean {
  switch (chain) {
    case 'BTC':
      return validateBitcoinAddress(address);

    case 'ETH':
      return validateEthereumAddress(address);

    case 'USDC':
      // USDC uses Ethereum addresses (ERC-20 token)
      return validateUSDCAddress(address);

    case 'XRP':
      return validateXRPAddress(address);

    default:
      throw new Error(`Unsupported chain: ${chain}`);
  }
}

/**
 * Validate multiple addresses for a single chain
 *
 * Useful for batch validation
 *
 * @param addresses - Array of addresses to validate
 * @param chain - Blockchain network
 * @returns Object with validation results for each address
 *
 * @example
 * const results = validateMultipleAddresses([
 *   "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4",
 *   "invalid"
 * ], "BTC");
 * // Returns: {
 * //   "bc1qw508...": true,
 * //   "invalid": false
 * // }
 */
export function validateMultipleAddresses(
  addresses: string[],
  chain: Chain
): Record<string, boolean> {
  const results: Record<string, boolean> = {};

  for (const address of addresses) {
    results[address] = validateAddress(address, chain);
  }

  return results;
}

/**
 * Get address format description for a chain
 *
 * Provides human-readable information about address formats
 *
 * @param chain - Blockchain network
 * @returns Description of address format
 */
export function getAddressFormatDescription(chain: Chain): string {
  const descriptions: Record<Chain, string> = {
    BTC: 'Bitcoin addresses can start with 1 (Legacy), 3 (SegWit), or bc1 (Native SegWit). We recommend bc1 for lower fees.',
    ETH: 'Ethereum addresses are 42 characters starting with 0x. They are case-sensitive (checksummed).',
    USDC: 'USDC uses Ethereum addresses (42 characters starting with 0x). Same format as ETH.',
    XRP: 'XRP addresses start with "r" and are 25-35 characters. Minimum 10 XRP balance required to activate.',
  };

  return descriptions[chain];
}

/**
 * Get example address for a chain
 *
 * Useful for UI placeholders and documentation
 *
 * @param chain - Blockchain network
 * @returns Example address
 */
export function getExampleAddress(chain: Chain): string {
  const examples: Record<Chain, string> = {
    BTC: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
    ETH: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    USDC: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    XRP: 'rN7n7otQDd6FczFgLdlqtyMVrn3LNU8NsNi',
  };

  return examples[chain];
}

/**
 * Normalize address format
 *
 * Standardizes address formatting (lowercase for Ethereum, etc.)
 *
 * @param address - Address to normalize
 * @param chain - Blockchain network
 * @returns Normalized address
 */
export function normalizeAddress(address: string, chain: Chain): string {
  switch (chain) {
    case 'BTC':
      // Bitcoin addresses are case-sensitive, return as-is
      return address;

    case 'ETH':
    case 'USDC':
      // Ethereum addresses should be checksummed
      // For now, return lowercase (production: use toChecksumAddress)
      return address.toLowerCase();

    case 'XRP':
      // XRP addresses are case-sensitive, return as-is
      return address;

    default:
      return address;
  }
}

/**
 * Check if two addresses are the same
 *
 * Handles case-insensitivity for applicable chains
 *
 * @param address1 - First address
 * @param address2 - Second address
 * @param chain - Blockchain network
 * @returns True if addresses match
 */
export function addressesMatch(address1: string, address2: string, chain: Chain): boolean {
  const norm1 = normalizeAddress(address1, chain);
  const norm2 = normalizeAddress(address2, chain);

  return norm1 === norm2;
}

/**
 * Validate address and return detailed error
 *
 * Provides specific error messages for invalid addresses
 *
 * @param address - Address to validate
 * @param chain - Blockchain network
 * @returns Object with valid flag and error message if invalid
 */
export function validateAddressWithError(
  address: string,
  chain: Chain
): { valid: boolean; error?: string } {
  // Check if address is empty
  if (!address || address.trim() === '') {
    return {
      valid: false,
      error: 'Address is required',
    };
  }

  // Validate based on chain
  const isValid = validateAddress(address, chain);

  if (!isValid) {
    const formatDesc = getAddressFormatDescription(chain);
    return {
      valid: false,
      error: `Invalid ${chain} address. ${formatDesc}`,
    };
  }

  return { valid: true };
}

/**
 * Extract chain from address format (best guess)
 *
 * Attempts to determine which blockchain an address belongs to
 * based on its format. Not 100% reliable for all cases.
 *
 * @param address - Blockchain address
 * @returns Likely chain or null if unknown
 */
export function guessChainFromAddress(address: string): Chain | null {
  // Bitcoin patterns
  if (/^(1|3|bc1)/.test(address)) {
    return 'BTC';
  }

  // Ethereum/USDC pattern
  if (/^0x[a-fA-F0-9]{40}$/.test(address)) {
    // Could be ETH or USDC, default to ETH
    return 'ETH';
  }

  // XRP pattern
  if (/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(address)) {
    return 'XRP';
  }

  return null;
}
