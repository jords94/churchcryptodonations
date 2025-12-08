/**
 * XRP Wallet Generation
 *
 * MVP-DEFERRED: XRP support will be re-enabled post-MVP
 * For MVP, we're focusing on BTC + USDC only
 *
 * This file contains fully functional XRP wallet generation code
 * that can be re-enabled by uncommenting the code below and adding
 * 'XRP' back to the Chain enum in prisma/schema.prisma
 */

// MVP-DEFERRED: Uncomment below to re-enable XRP support

/*
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

export function generateXRPWallet(
  accountIndex: number = WALLET.DEFAULT_ACCOUNT_INDEX,
  addressIndex: number = WALLET.DEFAULT_ADDRESS_INDEX
): GeneratedWallet {
  const mnemonic = generateMnemonic();
  return deriveXRPWalletFromMnemonic(mnemonic, accountIndex, addressIndex);
}

export function deriveXRPWalletFromMnemonic(
  mnemonic: string,
  accountIndex: number = WALLET.DEFAULT_ACCOUNT_INDEX,
  addressIndex: number = WALLET.DEFAULT_ADDRESS_INDEX
): GeneratedWallet {
  if (!validateMnemonic(mnemonic)) {
    throw new Error('Invalid mnemonic phrase');
  }

  const seed = mnemonicToSeed(mnemonic);
  const path = getDerivationPath('XRP', accountIndex, addressIndex);
  const node = deriveFromPath(seed, path);

  if (!node.privateKey) {
    throw new Error('Failed to derive private key');
  }

  const privateKeyHex = node.privateKey.toString('hex').toUpperCase();
  const keypair = deriveKeypair(privateKeyHex);
  const address = deriveAddress(keypair.publicKey);
  const publicKey = keypair.publicKey;

  return {
    address,
    derivationPath: path,
    chain: 'XRP',
    mnemonic,
    publicKey,
  };
}

export function validateXRPAddress(address: string): boolean {
  const xrpAddressRegex = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/;
  return xrpAddressRegex.test(address);
}

export function dropsToXRP(drops: string | bigint): string {
  const dropsAmount = typeof drops === 'string' ? BigInt(drops) : drops;
  const divisor = BigInt(1000000);
  const whole = dropsAmount / divisor;
  const fractional = dropsAmount % divisor;
  const fractionalStr = fractional.toString().padStart(6, '0');
  return `${whole}.${fractionalStr}`;
}

export function xrpToDrops(xrp: number | string): bigint {
  const xrpAmount = typeof xrp === 'string' ? parseFloat(xrp) : xrp;
  const drops = xrpAmount * 1000000;
  return BigInt(Math.round(drops));
}

export function formatXRPAmount(
  drops: string | bigint,
  decimals: number = 6,
  includeSuffix: boolean = false
): string {
  const xrp = dropsToXRP(drops);
  const [whole, fractional] = xrp.split('.');
  const truncatedFractional = fractional ? fractional.slice(0, decimals) : '0';
  const formatted = `${whole}.${truncatedFractional.padEnd(decimals, '0')}`;
  return includeSuffix ? `${formatted} XRP` : formatted;
}

export function meetsMinimumReserve(drops: string | bigint): boolean {
  const MIN_RESERVE_DROPS = BigInt(10 * 1000000);
  const amount = typeof drops === 'string' ? BigInt(drops) : drops;
  return amount >= MIN_RESERVE_DROPS;
}

export function getMinimumReserve(): string {
  return '10.000000';
}

export function calculateTotalReserve(
  baseReserve: number = 10,
  ownedObjectCount: number = 0,
  objectReserve: number = 2
): string {
  const total = baseReserve + ownedObjectCount * objectReserve;
  return total.toFixed(6);
}

export function validateDestinationTag(tag: number | string): boolean {
  const tagNum = typeof tag === 'string' ? parseInt(tag, 10) : tag;
  return Number.isInteger(tagNum) && tagNum >= 0 && tagNum <= 4294967295;
}
*/

// MVP: Export stub functions to prevent import errors
export function generateXRPWallet(): never {
  throw new Error('XRP support is deferred for MVP. Coming soon!');
}

export function validateXRPAddress(): never {
  throw new Error('XRP support is deferred for MVP. Coming soon!');
}

export function dropsToXRP(): never {
  throw new Error('XRP support is deferred for MVP. Coming soon!');
}
