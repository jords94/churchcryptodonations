/**
 * XRP Wallet Generation
 *
 * Implements XRP Ledger wallet creation using xrpl library.
 *
 * Address format:
 * - XRP addresses use base58 encoding
 * - Always start with "r"
 * - 25-35 characters long
 * - Example: rN7n7otQDd6FczFgLdlqtyMVrn3LNU8NsNi
 *
 * BIP44 Path for XRP: m/44'/144'/0'/0/0
 * - 44': Purpose (BIP44)
 * - 144': Coin type (XRP)
 * - 0': Account index
 * - 0: External chain
 * - 0: Address index
 *
 * Important notes:
 * - XRP Ledger requires a minimum balance of 10 XRP to activate an account
 * - This "reserve" prevents spam and must remain in the account
 * - Destination tags can be used for identifying payments
 * - XRP has 6 decimal places (called "drops": 1 XRP = 1,000,000 drops)
 */

import { Wallet as XRPLWallet } from 'xrpl';
import { deriveAddress, deriveKeypair } from 'ripple-keypairs';
import {
  generateMnemonic,
  mnemonicToSeed,
  deriveFromPath,
  validateMnemonic,
  type GeneratedWallet,
} from './walletGenerator';
import { getDerivationPath } from '@/config/chains';
import { WALLET } from '@/config/constants';

/**
 * Generate a new XRP wallet
 *
 * Creates a new HD wallet with XRP Ledger address.
 *
 * SECURITY WARNING:
 * - The mnemonic MUST be saved by the user
 * - NEVER store the mnemonic in the database
 * - Loss of mnemonic = permanent loss of funds
 *
 * IMPORTANT: XRP accounts require 10 XRP minimum balance to activate
 *
 * @param accountIndex - BIP44 account index (default: 0)
 * @param addressIndex - Address index within account (default: 0)
 * @returns Wallet data with mnemonic and address
 *
 * @example
 * const wallet = generateXRPWallet();
 * console.log(wallet.address); // "rN7n7otQDd6FczFgLdlqtyMVrn3LNU8NsNi"
 * console.log(wallet.mnemonic); // "witch collapse practice..."
 * // User MUST save mnemonic immediately!
 */
export function generateXRPWallet(
  accountIndex: number = WALLET.DEFAULT_ACCOUNT_INDEX,
  addressIndex: number = WALLET.DEFAULT_ADDRESS_INDEX
): GeneratedWallet {
  // Generate new 12-word mnemonic
  const mnemonic = generateMnemonic();

  // Derive wallet from mnemonic
  return deriveXRPWalletFromMnemonic(mnemonic, accountIndex, addressIndex);
}

/**
 * Derive XRP wallet from existing mnemonic
 *
 * Recovers an XRP wallet from a known seed phrase.
 * Useful for:
 * - Wallet recovery
 * - Importing existing wallets
 * - Multi-device access
 *
 * @param mnemonic - 12 or 24 word seed phrase
 * @param accountIndex - BIP44 account index
 * @param addressIndex - Address index
 * @returns Wallet data
 */
export function deriveXRPWalletFromMnemonic(
  mnemonic: string,
  accountIndex: number = WALLET.DEFAULT_ACCOUNT_INDEX,
  addressIndex: number = WALLET.DEFAULT_ADDRESS_INDEX
): GeneratedWallet {
  // Validate mnemonic
  if (!validateMnemonic(mnemonic)) {
    throw new Error('Invalid mnemonic phrase');
  }

  // Convert mnemonic to seed
  const seed = mnemonicToSeed(mnemonic);

  // Get BIP44 derivation path for XRP
  const path = getDerivationPath('XRP', accountIndex, addressIndex);

  // Derive key pair at path
  const node = deriveFromPath(seed, path);

  if (!node.privateKey) {
    throw new Error('Failed to derive private key');
  }

  // Convert private key to XRP format (hex string)
  const privateKeyHex = node.privateKey.toString('hex').toUpperCase();

  // Derive keypair using ripple-keypairs
  const keypair = deriveKeypair(privateKeyHex);

  // Generate address from public key
  const address = deriveAddress(keypair.publicKey);

  // Get public key
  const publicKey = keypair.publicKey;

  return {
    address,
    derivationPath: path,
    chain: 'XRP',
    mnemonic,
    publicKey,
  };
}

/**
 * Validate XRP address format
 *
 * Checks if an address is a valid XRP Ledger address.
 * XRP addresses start with "r" and use base58 encoding.
 *
 * @param address - XRP address to validate
 * @returns True if valid
 *
 * @example
 * validateXRPAddress("rN7n7otQDd6FczFgLdlqtyMVrn3LNU8NsNi") // true
 * validateXRPAddress("invalid") // false
 */
export function validateXRPAddress(address: string): boolean {
  // XRP addresses:
  // - Start with 'r'
  // - 25-35 characters
  // - Base58 encoded
  const xrpAddressRegex = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/;

  if (!xrpAddressRegex.test(address)) {
    return false;
  }

  // Additional validation could check the base58 checksum
  // For production, use ripple-address-codec library
  try {
    // Basic validation passed
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Convert drops to XRP
 *
 * XRP amounts are stored as integers (drops)
 * 1 XRP = 1,000,000 drops (10^6)
 *
 * @param drops - Amount in drops
 * @returns Amount in XRP
 *
 * @example
 * dropsToXRP("1000000") // "1.000000"
 * dropsToXRP("500000") // "0.500000"
 */
export function dropsToXRP(drops: string | bigint): string {
  const dropsAmount = typeof drops === 'string' ? BigInt(drops) : drops;
  const divisor = BigInt(1000000);

  const whole = dropsAmount / divisor;
  const fractional = dropsAmount % divisor;

  // Pad fractional part to 6 digits
  const fractionalStr = fractional.toString().padStart(6, '0');

  return `${whole}.${fractionalStr}`;
}

/**
 * Convert XRP to drops
 *
 * @param xrp - Amount in XRP
 * @returns Amount in drops
 *
 * @example
 * xrpToDrops(1) // 1000000n
 * xrpToDrops(0.5) // 500000n
 */
export function xrpToDrops(xrp: number | string): bigint {
  const xrpAmount = typeof xrp === 'string' ? parseFloat(xrp) : xrp;
  const drops = xrpAmount * 1000000;
  return BigInt(Math.round(drops));
}

/**
 * Format XRP amount for display
 *
 * @param drops - Amount in drops
 * @param decimals - Number of decimal places to show (default: 6)
 * @param includeSuffix - Whether to include "XRP" suffix
 * @returns Formatted string
 *
 * @example
 * formatXRPAmount("1000000") // "1.000000"
 * formatXRPAmount("1500000", 2, true) // "1.50 XRP"
 */
export function formatXRPAmount(
  drops: string | bigint,
  decimals: number = 6,
  includeSuffix: boolean = false
): string {
  const xrp = dropsToXRP(drops);
  const [whole, fractional] = xrp.split('.');

  // Truncate fractional part to specified decimals
  const truncatedFractional = fractional ? fractional.slice(0, decimals) : '0';

  const formatted = `${whole}.${truncatedFractional.padEnd(decimals, '0')}`;

  if (includeSuffix) {
    return `${formatted} XRP`;
  }

  return formatted;
}

/**
 * Check if XRP amount meets minimum account reserve
 *
 * XRP Ledger requires a minimum balance to activate an account.
 * As of 2024, the base reserve is 10 XRP.
 *
 * @param drops - Amount in drops
 * @returns True if meets minimum reserve
 */
export function meetsMinimumReserve(drops: string | bigint): boolean {
  const MIN_RESERVE_DROPS = BigInt(10 * 1000000); // 10 XRP
  const amount = typeof drops === 'string' ? BigInt(drops) : drops;

  return amount >= MIN_RESERVE_DROPS;
}

/**
 * Get minimum XRP reserve requirement
 *
 * @returns Minimum reserve in XRP (currently 10 XRP)
 */
export function getMinimumReserve(): string {
  return '10.000000'; // 10 XRP
}

/**
 * Calculate total reserve for account
 *
 * Base reserve (10 XRP) + incremental reserves for owned objects
 * Each object (trustline, offer, etc.) requires 2 XRP additional reserve
 *
 * @param baseReserve - Base reserve in XRP (default: 10)
 * @param ownedObjectCount - Number of owned objects (default: 0)
 * @param objectReserve - Reserve per object in XRP (default: 2)
 * @returns Total required reserve in XRP
 */
export function calculateTotalReserve(
  baseReserve: number = 10,
  ownedObjectCount: number = 0,
  objectReserve: number = 2
): string {
  const total = baseReserve + ownedObjectCount * objectReserve;
  return total.toFixed(6);
}

/**
 * Validate destination tag
 *
 * Destination tags are optional 32-bit unsigned integers
 * used to identify the recipient of a payment
 *
 * @param tag - Destination tag to validate
 * @returns True if valid
 */
export function validateDestinationTag(tag: number | string): boolean {
  const tagNum = typeof tag === 'string' ? parseInt(tag, 10) : tag;

  // Must be positive integer within 32-bit range
  return Number.isInteger(tagNum) && tagNum >= 0 && tagNum <= 4294967295;
}
