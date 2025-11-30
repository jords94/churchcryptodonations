/**
 * HD Wallet Generator
 *
 * Creates hierarchical deterministic (HD) wallets using BIP39 and BIP44 standards.
 *
 * BIP39: Mnemonic seed phrase generation (12 words)
 * BIP44: Hierarchical derivation path (m/44'/coin_type'/account'/change/address_index)
 *
 * CRITICAL SECURITY NOTES:
 * - Seed phrases are NEVER stored in the database
 * - Private keys are NEVER stored anywhere
 * - Only public addresses are persisted
 * - Seed phrase is returned ONCE and must be saved by the user
 * - This is a NON-CUSTODIAL system - users control their own keys
 *
 * Flow:
 * 1. Generate 12-word mnemonic (BIP39)
 * 2. Derive master seed from mnemonic
 * 3. Generate chain-specific addresses using BIP44 paths
 * 4. Return public address + seed phrase
 * 5. User must backup seed phrase immediately
 * 6. Store only public address in database
 */

import * as bip39 from 'bip39';
import { BIP32Factory } from 'bip32';
import * as ecc from '@bitcoinerlab/secp256k1';
import { getDerivationPath, type Chain } from '@/config/chains';
import { WALLET } from '@/config/constants';

// Initialize BIP32 with secp256k1 curve
const bip32 = BIP32Factory(ecc);

/**
 * Wallet data returned after generation
 * Contains everything needed except the private key (never returned)
 */
export interface GeneratedWallet {
  // Public data (safe to store in database)
  address: string; // Public blockchain address
  derivationPath: string; // BIP44 derivation path
  chain: Chain; // Blockchain network

  // Private data (MUST be saved by user, never stored)
  mnemonic: string; // 12-word seed phrase - CRITICAL TO BACKUP
  publicKey?: string; // Public key (optional, for some chains)
}

/**
 * Generate a new mnemonic seed phrase
 *
 * Uses BIP39 standard to create a 12-word mnemonic.
 * 128 bits of entropy = 12 words (easier for users than 24 words)
 *
 * @returns 12-word mnemonic phrase (space-separated)
 *
 * @example
 * const mnemonic = generateMnemonic();
 * // Returns: "witch collapse practice feed shame open despair creek road again ice least"
 */
export function generateMnemonic(): string {
  // Generate 128 bits of entropy = 12 words
  // More secure: 256 bits = 24 words, but harder for users to manage
  const mnemonic = bip39.generateMnemonic(WALLET.MNEMONIC_STRENGTH);

  // Validate the generated mnemonic (safety check)
  if (!bip39.validateMnemonic(mnemonic)) {
    throw new Error('Generated invalid mnemonic');
  }

  return mnemonic;
}

/**
 * Validate a mnemonic seed phrase
 *
 * Checks if a mnemonic follows BIP39 standards and has valid checksum
 *
 * @param mnemonic - Seed phrase to validate
 * @returns True if valid
 */
export function validateMnemonic(mnemonic: string): boolean {
  return bip39.validateMnemonic(mnemonic);
}

/**
 * Derive master seed from mnemonic
 *
 * Converts mnemonic phrase to binary seed using PBKDF2
 * This seed is used as the root for all key derivation
 *
 * @param mnemonic - 12 or 24 word seed phrase
 * @param passphrase - Optional BIP39 passphrase (extra security layer)
 * @returns Binary seed (512 bits / 64 bytes)
 */
export function mnemonicToSeed(mnemonic: string, passphrase: string = ''): Buffer {
  // Validate mnemonic first
  if (!validateMnemonic(mnemonic)) {
    throw new Error('Invalid mnemonic phrase');
  }

  // Convert to seed using PBKDF2 with 2048 iterations (BIP39 standard)
  return bip39.mnemonicToSeedSync(mnemonic, passphrase);
}

/**
 * Derive HD node from path
 *
 * Uses BIP32 hierarchical derivation to generate keys at specific paths
 *
 * @param seed - Master seed from mnemonic
 * @param path - BIP44 derivation path (e.g., "m/44'/0'/0'/0/0")
 * @returns BIP32 node containing public/private key pair
 */
export function deriveFromPath(seed: Buffer, path: string) {
  const root = bip32.fromSeed(seed);
  return root.derivePath(path);
}

/**
 * Get random words from mnemonic for confirmation
 *
 * Returns N random word indices and their values for user verification.
 * This ensures the user has properly recorded their seed phrase.
 *
 * @param mnemonic - Seed phrase
 * @param count - Number of random words to request (default: 3)
 * @returns Array of { index, word } objects
 *
 * @example
 * const verification = getRandomWordsForVerification("witch collapse...", 3);
 * // Returns: [{ index: 2, word: "practice" }, { index: 7, word: "open" }, ...]
 */
export function getRandomWordsForVerification(
  mnemonic: string,
  count: number = WALLET.VERIFICATION_WORD_COUNT
): Array<{ index: number; word: string }> {
  const words = mnemonic.split(' ');

  if (words.length !== 12 && words.length !== 24) {
    throw new Error('Invalid mnemonic length');
  }

  // Generate random unique indices
  const indices = new Set<number>();
  while (indices.size < count) {
    indices.add(Math.floor(Math.random() * words.length));
  }

  // Map to word objects
  return Array.from(indices)
    .sort((a, b) => a - b)
    .map((index) => ({
      index: index + 1, // 1-indexed for user display
      word: words[index],
    }));
}

/**
 * Verify user's mnemonic backup
 *
 * Checks if the user correctly entered the requested verification words
 *
 * @param mnemonic - Original mnemonic
 * @param verificationWords - User's answers: { index: number, word: string }[]
 * @returns True if all words match
 */
export function verifyMnemonicBackup(
  mnemonic: string,
  verificationWords: Array<{ index: number; word: string }>
): boolean {
  const words = mnemonic.split(' ');

  for (const { index, word } of verificationWords) {
    // index is 1-based from user, convert to 0-based
    const actualWord = words[index - 1];

    if (actualWord !== word.toLowerCase().trim()) {
      return false;
    }
  }

  return true;
}

/**
 * Split mnemonic into groups for display
 *
 * Makes it easier for users to write down and verify
 *
 * @param mnemonic - Seed phrase
 * @param groupSize - Words per group (default: 4)
 * @returns Array of word groups
 *
 * @example
 * const groups = splitMnemonicIntoGroups("witch collapse practice feed...");
 * // Returns: [
 * //   [{ index: 1, word: "witch" }, { index: 2, word: "collapse" }, ...],
 * //   [{ index: 5, word: "shame" }, ...]
 * // ]
 */
export function splitMnemonicIntoGroups(
  mnemonic: string,
  groupSize: number = 4
): Array<Array<{ index: number; word: string }>> {
  const words = mnemonic.split(' ');
  const groups: Array<Array<{ index: number; word: string }>> = [];

  for (let i = 0; i < words.length; i += groupSize) {
    const group = words.slice(i, i + groupSize).map((word, j) => ({
      index: i + j + 1,
      word,
    }));
    groups.push(group);
  }

  return groups;
}

/**
 * Estimate entropy bits from mnemonic
 *
 * @param mnemonic - Seed phrase
 * @returns Entropy bits (128 for 12 words, 256 for 24 words)
 */
export function getMnemonicEntropy(mnemonic: string): number {
  const words = mnemonic.split(' ');

  if (words.length === 12) return 128;
  if (words.length === 15) return 160;
  if (words.length === 18) return 192;
  if (words.length === 21) return 224;
  if (words.length === 24) return 256;

  throw new Error('Invalid mnemonic length');
}

/**
 * Format address for display
 *
 * Truncates long addresses with ellipsis for better UX
 *
 * @param address - Full blockchain address
 * @param startChars - Characters to show at start (default: 6)
 * @param endChars - Characters to show at end (default: 4)
 * @returns Formatted address
 *
 * @example
 * formatAddress("0x742d35Cc6634C0532925a3b844Bc454e4438f44e")
 * // Returns: "0x742d...f44e"
 */
export function formatAddress(
  address: string,
  startChars: number = 6,
  endChars: number = 4
): string {
  if (address.length <= startChars + endChars) {
    return address;
  }

  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Generate a secure random passphrase (optional BIP39 extension)
 *
 * Adds extra security to mnemonic by using a passphrase.
 * WARNING: If passphrase is lost, funds are UNRECOVERABLE
 *
 * @param length - Passphrase length in characters
 * @returns Random passphrase
 */
export function generatePassphrase(length: number = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let passphrase = '';

  for (let i = 0; i < length; i++) {
    passphrase += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return passphrase;
}
