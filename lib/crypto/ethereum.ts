/**
 * Ethereum & USDC Wallet Generation
 *
 * Implements Ethereum wallet creation using viem.
 * Since USDC is an ERC-20 token on Ethereum, the same address works for both ETH and USDC.
 *
 * Address format:
 * - Ethereum uses 42-character hexadecimal addresses
 * - Always starts with "0x"
 * - Example: 0x742d35Cc6634C0532925a3b844Bc454e4438f44e
 *
 * BIP44 Path for Ethereum: m/44'/60'/0'/0/0
 * - 44': Purpose (BIP44)
 * - 60': Coin type (Ethereum)
 * - 0': Account index
 * - 0: External chain (receiving addresses)
 * - 0: Address index
 *
 * Important notes:
 * - One address works for ETH and all ERC-20 tokens (including USDC)
 * - Ethereum uses Keccak-256 hashing (not standard SHA-256)
 * - Private keys are 32 bytes (256 bits)
 * - Addresses are checksummed (mixed case) for error detection
 */

import { HDKey } from '@scure/bip32';
import { mnemonicToSeedSync } from '@scure/bip39';
import { keccak_256 } from '@noble/hashes/sha3';
import {
  generateMnemonic,
  validateMnemonic,
  type GeneratedWallet,
} from './walletGenerator';
import { getDerivationPath } from '@/config/chains';
import { WALLET, ERROR_MESSAGES } from '@/config/constants';

/**
 * Generate a new Ethereum wallet
 *
 * Creates a new HD wallet with checksummed Ethereum address.
 * The same address can receive both ETH and ERC-20 tokens (like USDC).
 *
 * SECURITY WARNING:
 * - The mnemonic MUST be saved by the user
 * - NEVER store the mnemonic in the database
 * - Loss of mnemonic = permanent loss of funds
 *
 * @param accountIndex - BIP44 account index (default: 0)
 * @param addressIndex - Address index within account (default: 0)
 * @returns Wallet data with mnemonic and address
 *
 * @example
 * const wallet = generateEthereumWallet();
 * console.log(wallet.address); // "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
 * console.log(wallet.mnemonic); // "witch collapse practice..."
 * // User MUST save mnemonic immediately!
 */
export function generateEthereumWallet(
  accountIndex: number = WALLET.DEFAULT_ACCOUNT_INDEX,
  addressIndex: number = WALLET.DEFAULT_ADDRESS_INDEX
): GeneratedWallet {
  // Generate new 12-word mnemonic
  const mnemonic = generateMnemonic();

  // Derive wallet from mnemonic
  return deriveEthereumWalletFromMnemonic(mnemonic, accountIndex, addressIndex);
}

/**
 * Derive Ethereum wallet from existing mnemonic
 *
 * Recovers an Ethereum wallet from a known seed phrase.
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
export function deriveEthereumWalletFromMnemonic(
  mnemonic: string,
  accountIndex: number = WALLET.DEFAULT_ACCOUNT_INDEX,
  addressIndex: number = WALLET.DEFAULT_ADDRESS_INDEX
): GeneratedWallet {
  // Validate mnemonic
  if (!validateMnemonic(mnemonic)) {
    throw new Error('Invalid mnemonic phrase');
  }

  // Convert mnemonic to seed
  const seed = mnemonicToSeedSync(mnemonic);

  // Get BIP44 derivation path for Ethereum (USDC uses Ethereum addresses)
  // MVP: Use USDC chain for derivation path (same as ETH: m/44'/60'/0'/0/0)
  const path = getDerivationPath('USDC', accountIndex, addressIndex);

  // Create HD key from seed
  const hdKey = HDKey.fromMasterSeed(seed);

  // Derive child key at path
  const childKey = hdKey.derive(path);

  if (!childKey.privateKey) {
    throw new Error('Failed to derive private key');
  }

  // Generate Ethereum address from private key
  const address = privateKeyToAddress(childKey.privateKey);

  // Get public key in hex format
  const publicKey = Buffer.from(childKey.publicKey!).toString('hex');

  return {
    address,
    derivationPath: path,
    chain: 'USDC', // MVP: Return USDC as chain (Ethereum addresses work for USDC)
    mnemonic,
    publicKey,
  };
}

/**
 * Generate Ethereum address from private key
 *
 * Steps:
 * 1. Get public key from private key (secp256k1 curve)
 * 2. Hash public key with Keccak-256
 * 3. Take last 20 bytes (40 hex characters)
 * 4. Add "0x" prefix
 * 5. Apply checksum (EIP-55)
 *
 * @param privateKey - 32-byte private key
 * @returns Checksummed Ethereum address
 */
function privateKeyToAddress(privateKey: Uint8Array): string {
  // For Ethereum, we need to derive the public key from private key
  // Then hash it with Keccak-256 and take last 20 bytes

  // Get uncompressed public key (65 bytes: 0x04 + x + y)
  // We'll use the HDKey's publicKey which is already available
  // For production, you'd use secp256k1 library to derive from private key

  // Simplified: Generate from private key bytes
  // In production, use proper secp256k1 curve operations
  const publicKeyBytes = getPublicKeyFromPrivate(privateKey);

  // Remove the 0x04 prefix (first byte) from uncompressed public key
  const publicKeyWithoutPrefix = publicKeyBytes.slice(1);

  // Hash with Keccak-256
  const hash = keccak_256(publicKeyWithoutPrefix);

  // Take last 20 bytes
  const addressBytes = hash.slice(-20);

  // Convert to hex and add 0x prefix
  const address = '0x' + Buffer.from(addressBytes).toString('hex');

  // Apply EIP-55 checksum
  return toChecksumAddress(address);
}

/**
 * Get public key from private key using secp256k1
 *
 * This is a placeholder - in production, use proper cryptographic library
 *
 * @param privateKey - Private key bytes
 * @returns Public key bytes (uncompressed, 65 bytes)
 */
function getPublicKeyFromPrivate(privateKey: Uint8Array): Uint8Array {
  // This would normally use secp256k1.getPublicKey(privateKey, false)
  // For now, we'll rely on HDKey's publicKey
  // In production implementation, import and use @noble/secp256k1
  const { getPublicKey } = require('@noble/secp256k1');
  return getPublicKey(privateKey, false);
}

/**
 * Apply EIP-55 checksum to Ethereum address
 *
 * Converts address to mixed case for error detection.
 * Uppercase letters indicate checksum validation.
 *
 * @param address - Lowercase hex address
 * @returns Checksummed address
 *
 * @example
 * toChecksumAddress("0x742d35cc6634c0532925a3b844bc454e4438f44e")
 * // Returns: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
 */
export function toChecksumAddress(address: string): string {
  // Remove 0x prefix if present
  const addr = address.toLowerCase().replace('0x', '');

  // Hash the address
  const hash = keccak_256(Buffer.from(addr, 'hex'));
  const hashHex = Buffer.from(hash).toString('hex');

  let checksummed = '0x';

  for (let i = 0; i < addr.length; i++) {
    // If hash byte is >= 8, capitalize the address character
    if (parseInt(hashHex[i], 16) >= 8) {
      checksummed += addr[i].toUpperCase();
    } else {
      checksummed += addr[i];
    }
  }

  return checksummed;
}

/**
 * Validate Ethereum address format
 *
 * Checks if an address is a valid Ethereum address.
 * Validates both format and checksum (if mixed case).
 *
 * @param address - Ethereum address to validate
 * @returns True if valid
 *
 * @example
 * validateEthereumAddress("0x742d35Cc6634C0532925a3b844Bc454e4438f44e") // true
 * validateEthereumAddress("0xinvalid") // false
 */
export function validateEthereumAddress(address: string): boolean {
  // Check basic format
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return false;
  }

  // If all lowercase or all uppercase, it's valid (no checksum)
  if (address === address.toLowerCase() || address === address.toUpperCase()) {
    return true;
  }

  // If mixed case, validate checksum
  const checksummed = toChecksumAddress(address);
  return address === checksummed;
}

/**
 * Check if address is a valid USDC address
 *
 * Since USDC is an ERC-20 token, any valid Ethereum address works.
 * This is an alias for validateEthereumAddress for clarity.
 *
 * @param address - Address to validate
 * @returns True if valid
 */
export function validateUSDCAddress(address: string): boolean {
  return validateEthereumAddress(address);
}

/**
 * Convert wei to ETH
 *
 * Ethereum amounts are stored as integers (wei)
 * 1 ETH = 1,000,000,000,000,000,000 wei (10^18)
 *
 * @param wei - Amount in wei
 * @returns Amount in ETH
 *
 * @example
 * weiToETH("1000000000000000000") // "1.000000000000000000"
 * weiToETH("500000000000000") // "0.000500000000000000"
 */
export function weiToETH(wei: string | bigint): string {
  const weiAmount = typeof wei === 'string' ? BigInt(wei) : wei;
  const divisor = BigInt(10 ** 18);

  const whole = weiAmount / divisor;
  const fractional = weiAmount % divisor;

  // Pad fractional part to 18 digits
  const fractionalStr = fractional.toString().padStart(18, '0');

  return `${whole}.${fractionalStr}`;
}

/**
 * Convert ETH to wei
 *
 * @param eth - Amount in ETH
 * @returns Amount in wei
 *
 * @example
 * ethToWei(1) // 1000000000000000000n
 * ethToWei(0.5) // 500000000000000000n
 */
export function ethToWei(eth: number | string): bigint {
  const ethAmount = typeof eth === 'string' ? parseFloat(eth) : eth;
  const wei = ethAmount * 10 ** 18;
  return BigInt(Math.round(wei));
}

/**
 * Format Ethereum amount for display
 *
 * @param wei - Amount in wei
 * @param decimals - Number of decimal places to show (default: 6)
 * @param includeSuffix - Whether to include "ETH" suffix
 * @returns Formatted string
 *
 * @example
 * formatEthereumAmount("1000000000000000000") // "1.000000"
 * formatEthereumAmount("1000000000000000000", 6, true) // "1.000000 ETH"
 */
export function formatEthereumAmount(
  wei: string | bigint,
  decimals: number = 6,
  includeSuffix: boolean = false
): string {
  const eth = weiToETH(wei);
  const [whole, fractional] = eth.split('.');

  // Truncate fractional part to specified decimals
  const truncatedFractional = fractional ? fractional.slice(0, decimals) : '0';

  const formatted = `${whole}.${truncatedFractional.padEnd(decimals, '0')}`;

  if (includeSuffix) {
    return `${formatted} ETH`;
  }

  return formatted;
}

/**
 * Convert USDC smallest unit to USDC
 *
 * USDC has 6 decimal places
 * 1 USDC = 1,000,000 (10^6)
 *
 * @param usdcSmallest - Amount in smallest unit
 * @returns Amount in USDC
 *
 * @example
 * usdcSmallestToUSDC("1000000") // "1.000000"
 */
export function usdcSmallestToUSDC(usdcSmallest: string | bigint): string {
  const amount = typeof usdcSmallest === 'string' ? BigInt(usdcSmallest) : usdcSmallest;
  const divisor = BigInt(10 ** 6);

  const whole = amount / divisor;
  const fractional = amount % divisor;

  // Pad fractional part to 6 digits
  const fractionalStr = fractional.toString().padStart(6, '0');

  return `${whole}.${fractionalStr}`;
}

/**
 * Format USDC amount for display
 *
 * @param usdcSmallest - Amount in smallest unit
 * @param decimals - Number of decimal places to show (default: 2)
 * @param includeSuffix - Whether to include "USDC" suffix
 * @returns Formatted string
 *
 * @example
 * formatUSDCAmount("1000000") // "1.00"
 * formatUSDCAmount("1500000", 2, true) // "1.50 USDC"
 */
export function formatUSDCAmount(
  usdcSmallest: string | bigint,
  decimals: number = 2,
  includeSuffix: boolean = false
): string {
  const usdc = usdcSmallestToUSDC(usdcSmallest);
  const [whole, fractional] = usdc.split('.');

  // Truncate fractional part to specified decimals
  const truncatedFractional = fractional ? fractional.slice(0, decimals) : '0';

  const formatted = `${whole}.${truncatedFractional.padEnd(decimals, '0')}`;

  if (includeSuffix) {
    return `${formatted} USDC`;
  }

  return formatted;
}
