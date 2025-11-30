/**
 * Bitcoin Wallet Generation
 *
 * Implements Bitcoin wallet creation using bitcoinjs-lib.
 * Supports both Legacy (P2PKH) and SegWit (P2WPKH) address formats.
 *
 * Address formats:
 * - Legacy (P2PKH): Starts with "1" (e.g., 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa)
 * - SegWit (P2WPKH): Starts with "bc1" (e.g., bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4)
 *
 * We use Native SegWit (bc1) for:
 * - Lower transaction fees
 * - Better scalability
 * - Modern standard (recommended by Bitcoin Core)
 *
 * BIP44 Path for Bitcoin: m/44'/0'/0'/0/0
 * - 44': Purpose (BIP44)
 * - 0': Coin type (Bitcoin)
 * - 0': Account index
 * - 0: External chain (receiving addresses)
 * - 0: Address index
 */

import * as bitcoin from 'bitcoinjs-lib';
import { BIP32Factory, BIP32Interface } from 'bip32';
import * as ecc from '@bitcoinerlab/secp256k1';
import {
  generateMnemonic,
  mnemonicToSeed,
  deriveFromPath,
  type GeneratedWallet,
} from './walletGenerator';
import { getDerivationPath } from '@/config/chains';
import { WALLET } from '@/config/constants';

// Initialize BIP32 with secp256k1 elliptic curve
const bip32 = BIP32Factory(ecc);

/**
 * Bitcoin address type
 */
export type BitcoinAddressType = 'legacy' | 'segwit' | 'native-segwit';

/**
 * Bitcoin network configuration
 * Default: Bitcoin mainnet
 */
const BITCOIN_NETWORK = bitcoin.networks.bitcoin;

/**
 * Generate a new Bitcoin wallet
 *
 * Creates a new HD wallet with Native SegWit (bech32) address.
 * Returns mnemonic seed phrase and public address.
 *
 * SECURITY WARNING:
 * - The mnemonic MUST be saved by the user
 * - NEVER store the mnemonic in the database
 * - Loss of mnemonic = permanent loss of funds
 *
 * @param accountIndex - BIP44 account index (default: 0)
 * @param addressIndex - Address index within account (default: 0)
 * @param addressType - Address format (default: 'native-segwit')
 * @returns Wallet data with mnemonic and address
 *
 * @example
 * const wallet = generateBitcoinWallet();
 * console.log(wallet.address); // "bc1q..."
 * console.log(wallet.mnemonic); // "witch collapse practice..."
 * // User MUST save mnemonic immediately!
 */
export function generateBitcoinWallet(
  accountIndex: number = WALLET.DEFAULT_ACCOUNT_INDEX,
  addressIndex: number = WALLET.DEFAULT_ADDRESS_INDEX,
  addressType: BitcoinAddressType = 'native-segwit'
): GeneratedWallet {
  // Generate new 12-word mnemonic
  const mnemonic = generateMnemonic();

  // Derive wallet from mnemonic
  return deriveBitcoinWalletFromMnemonic(mnemonic, accountIndex, addressIndex, addressType);
}

/**
 * Derive Bitcoin wallet from existing mnemonic
 *
 * Recovers a Bitcoin wallet from a known seed phrase.
 * Useful for:
 * - Wallet recovery
 * - Importing existing wallets
 * - Multi-device access
 *
 * @param mnemonic - 12 or 24 word seed phrase
 * @param accountIndex - BIP44 account index
 * @param addressIndex - Address index
 * @param addressType - Address format
 * @returns Wallet data
 */
export function deriveBitcoinWalletFromMnemonic(
  mnemonic: string,
  accountIndex: number = WALLET.DEFAULT_ACCOUNT_INDEX,
  addressIndex: number = WALLET.DEFAULT_ADDRESS_INDEX,
  addressType: BitcoinAddressType = 'native-segwit'
): GeneratedWallet {
  // Convert mnemonic to seed
  const seed = mnemonicToSeed(mnemonic);

  // Get BIP44 derivation path for Bitcoin
  // For Native SegWit, we use BIP84 path (m/84'/0'/0'/0/0)
  // But storing as BIP44 for consistency
  const path = getDerivationPath('BTC', accountIndex, addressIndex);

  // Derive key pair at path
  const node = deriveFromPath(seed, path);

  // Generate address based on type
  const address = generateBitcoinAddress(node, addressType);

  // Get public key in hex format
  const publicKey = node.publicKey.toString('hex');

  return {
    address,
    derivationPath: path,
    chain: 'BTC',
    mnemonic,
    publicKey,
  };
}

/**
 * Generate Bitcoin address from BIP32 node
 *
 * @param node - BIP32 key pair
 * @param addressType - Desired address format
 * @returns Bitcoin address string
 */
function generateBitcoinAddress(node: BIP32Interface, addressType: BitcoinAddressType): string {
  const publicKey = node.publicKey;

  switch (addressType) {
    case 'legacy':
      // P2PKH (Pay to Public Key Hash)
      // Starts with "1"
      const p2pkh = bitcoin.payments.p2pkh({
        pubkey: publicKey,
        network: BITCOIN_NETWORK,
      });

      if (!p2pkh.address) {
        throw new Error('Failed to generate legacy Bitcoin address');
      }

      return p2pkh.address;

    case 'segwit':
      // P2SH-P2WPKH (Wrapped SegWit)
      // Starts with "3"
      const p2wpkh = bitcoin.payments.p2wpkh({
        pubkey: publicKey,
        network: BITCOIN_NETWORK,
      });

      const p2sh = bitcoin.payments.p2sh({
        redeem: p2wpkh,
        network: BITCOIN_NETWORK,
      });

      if (!p2sh.address) {
        throw new Error('Failed to generate SegWit Bitcoin address');
      }

      return p2sh.address;

    case 'native-segwit':
    default:
      // P2WPKH (Native SegWit / Bech32)
      // Starts with "bc1"
      // RECOMMENDED: Lower fees, better efficiency
      const p2wpkhNative = bitcoin.payments.p2wpkh({
        pubkey: publicKey,
        network: BITCOIN_NETWORK,
      });

      if (!p2wpkhNative.address) {
        throw new Error('Failed to generate Native SegWit Bitcoin address');
      }

      return p2wpkhNative.address;
  }
}

/**
 * Validate Bitcoin address format
 *
 * Checks if an address is a valid Bitcoin address.
 * Supports Legacy, SegWit, and Native SegWit formats.
 *
 * @param address - Bitcoin address to validate
 * @returns True if valid
 *
 * @example
 * validateBitcoinAddress("bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4") // true
 * validateBitcoinAddress("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa") // true
 * validateBitcoinAddress("invalid") // false
 */
export function validateBitcoinAddress(address: string): boolean {
  try {
    // Try to decode as bech32 (native segwit)
    if (address.startsWith('bc1') || address.startsWith('tb1')) {
      bitcoin.address.fromBech32(address);
      return true;
    }

    // Try to decode as base58 (legacy or wrapped segwit)
    bitcoin.address.fromBase58Check(address);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get Bitcoin address type
 *
 * Determines the address format from the address string
 *
 * @param address - Bitcoin address
 * @returns Address type or null if invalid
 */
export function getBitcoinAddressType(address: string): BitcoinAddressType | null {
  if (!validateBitcoinAddress(address)) {
    return null;
  }

  if (address.startsWith('bc1') || address.startsWith('tb1')) {
    return 'native-segwit';
  }

  if (address.startsWith('3')) {
    return 'segwit';
  }

  if (address.startsWith('1')) {
    return 'legacy';
  }

  return null;
}

/**
 * Convert satoshis to BTC
 *
 * Bitcoin amounts are stored as integers (satoshis)
 * 1 BTC = 100,000,000 satoshis
 *
 * @param satoshis - Amount in satoshis
 * @returns Amount in BTC
 *
 * @example
 * satoshisToBTC(100000000) // 1.00000000
 * satoshisToBTC(50000) // 0.00050000
 */
export function satoshisToBTC(satoshis: number | string): string {
  const sats = typeof satoshis === 'string' ? parseInt(satoshis, 10) : satoshis;
  const btc = sats / 100000000;
  return btc.toFixed(8); // Bitcoin has 8 decimal places
}

/**
 * Convert BTC to satoshis
 *
 * @param btc - Amount in BTC
 * @returns Amount in satoshis
 *
 * @example
 * btcToSatoshis(1) // 100000000
 * btcToSatoshis(0.0005) // 50000
 */
export function btcToSatoshis(btc: number | string): number {
  const btcAmount = typeof btc === 'string' ? parseFloat(btc) : btc;
  return Math.round(btcAmount * 100000000);
}

/**
 * Format Bitcoin amount for display
 *
 * @param satoshis - Amount in satoshis
 * @param includeSuffix - Whether to include "BTC" suffix
 * @returns Formatted string
 *
 * @example
 * formatBitcoinAmount(100000000) // "1.00000000"
 * formatBitcoinAmount(100000000, true) // "1.00000000 BTC"
 */
export function formatBitcoinAmount(
  satoshis: number | string,
  includeSuffix: boolean = false
): string {
  const btc = satoshisToBTC(satoshis);

  if (includeSuffix) {
    return `${btc} BTC`;
  }

  return btc;
}
